(function () {
    // Configuration
    const config = {
        endpoint: "https://zeus-orpin-chi.vercel.app/api/track",
        debug: false, // Set to true for console logging
        retryAttempts: 3,
        retryDelay: 1000
    };

    // Get client ID from various sources
    function getClientId() {
        // 1. Try data attribute on current script
        if (document.currentScript?.getAttribute("data-client")) {
            return document.currentScript.getAttribute("data-client");
        }

        // 2. Try finding script by src
        const scripts = document.querySelectorAll('script[src*="pixel.js"]');
        for (const script of scripts) {
            const clientId = script.getAttribute("data-client");
            if (clientId) return clientId;
        }

        // 3. Try global variable (for platforms that don't support script attributes)
        if (window.PIXEL_CLIENT_ID) {
            return window.PIXEL_CLIENT_ID;
        }

        // 4. Try meta tag
        const metaTag = document.querySelector('meta[name="pixel-client-id"]');
        if (metaTag?.content) {
            return metaTag.content;
        }

        return null;
    }

    const clientId = getClientId();

    if (!clientId) {
        console.error("Pixel: No client ID found");
        return;
    }

    // Platform detection
    const platform = {
        isWix: Boolean(window.wixBiSession || document.querySelector('[data-wix-roles]')),
        isShopify: Boolean(window.Shopify),
        isWordPress: Boolean(document.querySelector('meta[name="generator"][content*="WordPress"]')),
        isSquarespace: Boolean(window.Static?.SQUARESPACE_CONTEXT),
        isWebflow: Boolean(window.Webflow || document.querySelector('html[data-wf-page]'))
    };

    // Get current platform name
    const getPlatform = () => {
        for (const [key, value] of Object.entries(platform)) {
            if (value) return key.replace('is', '').toLowerCase();
        }
        return 'unknown';
    };

    // Log helper
    const log = (...args) => {
        if (config.debug) console.log("Pixel:", ...args);
    };

    log("Initialized on platform:", getPlatform());

    // Extract URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const trackingParams = {
        gclid: urlParams.get("gclid"),
        wbraid: urlParams.get("wbraid"),
        gbraid: urlParams.get("gbraid"),
        utm_source: urlParams.get("utm_source"),
        utm_medium: urlParams.get("utm_medium"),
        utm_campaign: urlParams.get("utm_campaign"),
        utm_term: urlParams.get("utm_term"),
        utm_content: urlParams.get("utm_content")
    };

    // Enhanced email/phone extraction with platform-specific selectors
    function extractEmailAndPhone() {
        // Check for manually set values first
        if (window.pixelEmail || window.pixelPhone) {
            return {
                email: window.pixelEmail || null,
                phone: window.pixelPhone || null
            };
        }

        const commonEmailSelectors = [
            'input[type="email"]',
            'input[name*="email" i]',
            'input[id*="email" i]',
            'input[placeholder*="email" i]',
            '[data-email] input',
            'input.email-input'
        ];

        const commonPhoneSelectors = [
            'input[type="tel"]',
            'input[name*="phone" i]',
            'input[name*="tel" i]',
            'input[id*="phone" i]',
            'input[id*="tel" i]',
            'input[placeholder*="phone" i]',
            '[data-phone] input',
            'input.phone-input'
        ];

        // Platform-specific selectors
        const platformSelectors = {
            wix: {
                email: [
                    '[data-wix-type="Email"] input',
                    '.wixui-text-input input[type="email"]',
                    '[data-testid="emailInput"] input'
                ],
                phone: [
                    '[data-wix-type="Phone"] input',
                    '.wixui-text-input input[type="tel"]',
                    '[data-testid="phoneInput"] input'
                ]
            },
            shopify: {
                email: [
                    '#customer_email',
                    'input[name="customer[email]"]',
                    '#email'
                ],
                phone: [
                    '#customer_phone',
                    'input[name="customer[phone]"]',
                    '#phone'
                ]
            },
            wordpress: {
                email: [
                    '.wpcf7 input[type="email"]',
                    '.gform_wrapper input[type="email"]',
                    '#email'
                ],
                phone: [
                    '.wpcf7 input[type="tel"]',
                    '.gform_wrapper input[type="tel"]',
                    '#phone'
                ]
            }
        };

        const currentPlatform = getPlatform();
        const emailSelectors = [
            ...commonEmailSelectors,
            ...(platformSelectors[currentPlatform]?.email || [])
        ];
        const phoneSelectors = [
            ...commonPhoneSelectors,
            ...(platformSelectors[currentPlatform]?.phone || [])
        ];

        let email = null;
        let phone = null;

        // Try each selector
        for (const selector of emailSelectors) {
            try {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    if (element.value && element.value.includes('@')) {
                        email = element.value;
                        log("Found email:", email);
                        break;
                    }
                }
                if (email) break;
            } catch (e) {
                log("Selector error:", selector, e);
            }
        }

        for (const selector of phoneSelectors) {
            try {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    if (element.value && element.value.length > 5) {
                        phone = element.value;
                        log("Found phone:", phone);
                        break;
                    }
                }
                if (phone) break;
            } catch (e) {
                log("Selector error:", selector, e);
            }
        }

        return { email, phone };
    }

    // Send tracking data with retry logic
    async function sendTrackingData(attemptNumber = 1) {
        const { email, phone } = extractEmailAndPhone();

        const payload = {
            client_id: clientId,
            ...trackingParams,
            page_url: window.location.href,
            page_title: document.title,
            referrer: document.referrer,
            platform: getPlatform(),
            email,
            phone,
            timestamp: new Date().toISOString()
        };

        log("Sending data (attempt " + attemptNumber + "):", payload);

        try {
            const response = await fetch(config.endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            log("Success:", data);
            return data;
        } catch (err) {
            log("Failed:", err);

            if (attemptNumber < config.retryAttempts) {
                log("Retrying in " + config.retryDelay + "ms...");
                setTimeout(() => {
                    sendTrackingData(attemptNumber + 1);
                }, config.retryDelay);
            }
        }
    }

    // Initialize tracking based on platform
    function initializeTracking() {
        // Send initial page view
        sendTrackingData();

        // Platform-specific initialization
        if (platform.isWix) {
            // Wix-specific: wait for dynamic content
            let wixReadyCheck = 0;
            const wixInterval = setInterval(() => {
                if (document.querySelector('[data-wix-roles="main"]') || wixReadyCheck > 10) {
                    clearInterval(wixInterval);
                    setTimeout(sendTrackingData, 1000);
                }
                wixReadyCheck++;
            }, 500);
        }

        // Listen for form interactions
        document.addEventListener('submit', (e) => {
            if (e.target.tagName === 'FORM') {
                log("Form submitted");
                sendTrackingData();
            }
        });

        // Listen for input changes (debounced)
        let inputTimer;
        document.addEventListener('input', (e) => {
            if (e.target.matches('input[type="email"], input[type="tel"]')) {
                clearTimeout(inputTimer);
                inputTimer = setTimeout(() => {
                    log("Input changed, tracking...");
                    sendTrackingData();
                }, 2000);
            }
        });

        // Track on page visibility change (user leaving)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                sendTrackingData();
            }
        });
    }

    // Multiple initialization strategies
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeTracking);
    } else {
        initializeTracking();
    }

    // Also initialize on window load for safety
    window.addEventListener('load', () => {
        setTimeout(initializeTracking, 1000);
    });

    // Expose API for manual tracking
    window.pixelTrack = {
        track: sendTrackingData,
        setEmail: (email) => {
            window.pixelEmail = email;
            sendTrackingData();
        },
        setPhone: (phone) => {
            window.pixelPhone = phone;
            sendTrackingData();
        },
        debug: (enabled) => {
            config.debug = enabled;
        }
    };

})();