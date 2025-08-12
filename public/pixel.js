(function () {
    // Configuration
    const config = {
        endpoint: "https://zeus-orpin-chi.vercel.app/api/track",
        debug: false, // Set to true for console logging
        retryAttempts: 3,
        retryDelay: 1000,
        sessionDuration: 30 * 60 * 1000, // 30 minutes
        gclid_cookie_days: 90 // Google's maximum attribution window
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

    // ========================================
    // ENHANCED: Data Normalization Functions
    // ========================================

    function normalizeEmail(email) {
        if (!email) return null;

        // Convert to lowercase and trim
        email = email.toLowerCase().trim();

        // Remove dots before @ for Gmail and Googlemail
        if (email.includes('@gmail.com') || email.includes('@googlemail.com')) {
            const [localPart, domain] = email.split('@');
            email = localPart.replace(/\./g, '') + '@' + domain;
        }

        return email;
    }

    function normalizePhone(phone) {
        if (!phone) return null;

        // Remove all non-digits
        phone = phone.replace(/\D/g, '');

        // Handle common phone formats
        if (phone.length === 10) {
            // US phone without country code
            phone = '1' + phone;
        } else if (phone.length === 11 && phone[0] === '1') {
            // US phone with country code
            // Already correct
        } else if (phone.length < 10) {
            // Too short to be valid
            log("Phone number too short:", phone);
            return null;
        }

        // Format as E.164
        phone = '+' + phone;

        return phone;
    }

    // ========================================
    // ENHANCED: GCLID Storage with Expiry
    // ========================================

    function storeGCLID(gclid) {
        if (!gclid) return;

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + config.gclid_cookie_days);

        // Store in cookie with proper domain setting
        const domain = window.location.hostname.split('.').slice(-2).join('.');
        document.cookie = `gclid=${gclid};expires=${expiryDate.toUTCString()};path=/;domain=.${domain}`;

        // Also store with metadata in localStorage
        const gclid_data = {
            value: gclid,
            timestamp: Date.now(),
            expires: expiryDate.getTime(),
            source_url: window.location.href,
            client_id: clientId
        };

        try {
            localStorage.setItem(`gclid_${clientId}`, JSON.stringify(gclid_data));
            log("GCLID stored:", gclid, "expires:", expiryDate.toISOString());
        } catch (e) {
            log("Error storing GCLID:", e);
        }
    }

    function getStoredGCLID() {
        try {
            const stored = localStorage.getItem(`gclid_${clientId}`);
            if (stored) {
                const data = JSON.parse(stored);
                // Check if not expired
                if (data.expires > Date.now()) {
                    return data.value;
                } else {
                    log("Stored GCLID expired");
                    localStorage.removeItem(`gclid_${clientId}`);
                }
            }
        } catch (e) {
            log("Error retrieving GCLID:", e);
        }

        // Fallback to cookie
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'gclid') {
                return value;
            }
        }

        return null;
    }

    // ========================================
    // ENHANCED: Persistent Session Management
    // ========================================

    const STORAGE_KEY = `pixel_tracking_${clientId}`;

    // Get or create session data
    function getSessionData() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                // Check if session is still valid (30 minutes)
                if (Date.now() - data.updated < config.sessionDuration) {
                    return data;
                }
            }
        } catch (e) {
            log("Error loading session:", e);
        }
        return null;
    }

    // Save session data
    function saveSessionData(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                ...data,
                updated: Date.now()
            }));
        } catch (e) {
            log("Error saving session:", e);
        }
    }

    // Generate a unique session ID
    function generateSessionId() {
        return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    // Extract URL parameters (only on landing page)
    const urlParams = new URLSearchParams(window.location.search);
    const currentPageParams = {
        gclid: urlParams.get("gclid"),
        wbraid: urlParams.get("wbraid"),
        gbraid: urlParams.get("gbraid"),
        utm_source: urlParams.get("utm_source"),
        utm_medium: urlParams.get("utm_medium"),
        utm_campaign: urlParams.get("utm_campaign"),
        utm_term: urlParams.get("utm_term"),
        utm_content: urlParams.get("utm_content")
    };

    // Store GCLID if present
    if (currentPageParams.gclid) {
        storeGCLID(currentPageParams.gclid);
    }

    // Initialize or retrieve session
    let sessionData = getSessionData();

    // If we have tracking params on current page, create/update session
    if (currentPageParams.gclid || currentPageParams.wbraid || currentPageParams.gbraid) {
        log("Found tracking params on current page, saving to session");

        // Calculate GCLID expiry
        const gclidExpiry = currentPageParams.gclid ?
            new Date(Date.now() + (config.gclid_cookie_days * 24 * 60 * 60 * 1000)).toISOString() :
            null;

        sessionData = {
            sessionId: generateSessionId(),
            trackingParams: currentPageParams,
            gclidExpiry: gclidExpiry,
            landingPage: window.location.href,
            created: Date.now(),
            pageViews: [window.location.pathname]
        };
        saveSessionData(sessionData);
    } else if (!sessionData) {
        // Check for stored GCLID from previous session
        const storedGCLID = getStoredGCLID();

        // No existing session and no tracking params - create basic session
        sessionData = {
            sessionId: generateSessionId(),
            trackingParams: storedGCLID ? { gclid: storedGCLID } : {},
            landingPage: window.location.href,
            created: Date.now(),
            pageViews: [window.location.pathname]
        };
        saveSessionData(sessionData);
    } else {
        // Existing session - add current page to views
        if (!sessionData.pageViews.includes(window.location.pathname)) {
            sessionData.pageViews.push(window.location.pathname);
            saveSessionData(sessionData);
        }
    }

    // Use session tracking params if available
    const trackingParams = sessionData.trackingParams || {};

    log("Session data:", sessionData);
    log("Tracking params:", trackingParams);

    // Enhanced email/phone extraction with platform-specific selectors
    function extractEmailAndPhone() {
        // Check for manually set values first
        if (window.pixelEmail || window.pixelPhone) {
            return {
                email: normalizeEmail(window.pixelEmail),
                phone: normalizePhone(window.pixelPhone)
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
            'input[name*="mobile" i]',
            'input[name*="number" i]',
            'input[id*="phone" i]',
            'input[id*="tel" i]',
            'input[id*="mobile" i]',
            'input[placeholder*="phone" i]',
            'input[placeholder*="mobile" i]',
            'input[placeholder*="number" i]',
            '[data-phone] input',
            '[data-tel] input',
            'input.phone-input',
            'input.tel-input',
            // Common pattern for phone inputs that aren't type="tel"
            'input[type="text"][name*="phone" i]',
            'input[type="text"][placeholder*="phone" i]'
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
                    '[data-wix-type="Tel"] input',
                    '.wixui-text-input input[type="tel"]',
                    '.wixui-text-input input[name*="phone"]',
                    '[data-testid="phoneInput"] input',
                    '[data-testid="telInput"] input',
                    // Wix often uses text inputs for phone
                    '.wixui-text-input input[type="text"][placeholder*="phone" i]',
                    '.wixui-text-input input[type="text"][placeholder*="mobile" i]',
                    '.wixui-text-input input[type="text"][placeholder*="number" i]',
                    // Wix form builder specific
                    '[data-input-type="phone"] input',
                    '[data-input-type="tel"] input',
                    'input[aria-label*="phone" i]',
                    'input[aria-label*="mobile" i]'
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
                    '.wpforms-field-email input',
                    '.elementor-field-type-email input',
                    '#email'
                ],
                phone: [
                    '.wpcf7 input[type="tel"]',
                    '.gform_wrapper input[type="tel"]',
                    '.wpforms-field-phone input',
                    '.elementor-field-type-tel input',
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
                        email = normalizeEmail(element.value);
                        log("Found email (normalized):", email);
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
                    const value = element.value.trim();
                    // More flexible phone validation
                    if (value && value.length >= 7 && /[\d\s\-\(\)\+]+/.test(value)) {
                        phone = normalizePhone(value);
                        if (phone) {
                            log("Found phone (normalized):", phone);
                            break;
                        }
                    }
                }
                if (phone) break;
            } catch (e) {
                log("Selector error:", selector, e);
            }
        }

        return { email, phone };
    }

    // Page-specific tracking prevention
    const pageTrackingKey = `pixel_page_${clientId}_${window.location.pathname}`;
    const pageData = {
        tracked: false,
        lastEmail: null,
        lastPhone: null,
        lastSent: 0
    };

    // Load page data
    try {
        const saved = sessionStorage.getItem(pageTrackingKey);
        if (saved) Object.assign(pageData, JSON.parse(saved));
    } catch (e) {
        log("Error loading page data:", e);
    }

    // Save page data
    function savePageData() {
        try {
            sessionStorage.setItem(pageTrackingKey, JSON.stringify(pageData));
        } catch (e) {
            log("Error saving page data:", e);
        }
    }

    // Send tracking data with retry logic
    async function sendTrackingData(attemptNumber = 1, forceTrack = false) {
        const { email, phone } = extractEmailAndPhone();

        // Check if we should skip this tracking
        if (!forceTrack) {
            const now = Date.now();
            const timeSinceLastSent = now - pageData.lastSent;

            // Skip if already tracked on this page with same data
            if (pageData.tracked &&
                pageData.lastEmail === email &&
                pageData.lastPhone === phone &&
                timeSinceLastSent < 5000) {
                log("Skipping duplicate tracking");
                return;
            }
        }

        const payload = {
            client_id: clientId,
            ...trackingParams, // This now includes persisted params
            gclid_expires_at: sessionData.gclidExpiry, // Add GCLID expiry
            page_url: window.location.href,
            page_title: document.title,
            referrer: document.referrer,
            platform: getPlatform(),
            email: email, // Already normalized
            phone: phone, // Already normalized
            normalized_email: email, // Send both for backward compatibility
            normalized_phone: phone,
            timestamp: new Date().toISOString(),
            // Additional tracking data
            session_id: sessionData.sessionId,
            landing_page: sessionData.landingPage,
            pages_viewed: sessionData.pageViews.length,
            time_on_site: Math.floor((Date.now() - sessionData.created) / 1000),
            user_agent: navigator.userAgent
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

            // Update page data
            pageData.tracked = true;
            pageData.lastEmail = email;
            pageData.lastPhone = phone;
            pageData.lastSent = Date.now();
            savePageData();

            // Update session if we captured email/phone
            if (email || phone) {
                sessionData.hasFormData = true;
                if (email) sessionData.lastEmail = email;
                if (phone) sessionData.lastPhone = phone;
                saveSessionData(sessionData);
            }

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
        // Always send page view if we have tracking params from session
        if (trackingParams.gclid || trackingParams.wbraid || trackingParams.gbraid) {
            log("Have tracking params from session, sending page view");
            sendTrackingData();
        }

        // Platform-specific initialization
        if (platform.isWix) {
            // Wix-specific: wait for dynamic content
            let wixReadyCheck = 0;
            const wixInterval = setInterval(() => {
                if (document.querySelector('[data-wix-roles="main"]') || wixReadyCheck > 10) {
                    clearInterval(wixInterval);
                    setTimeout(() => sendTrackingData(), 1000);
                }
                wixReadyCheck++;
            }, 500);
        }

        // Listen for form interactions
        document.addEventListener('submit', (e) => {
            if (e.target.tagName === 'FORM') {
                log("Form submitted");
                sendTrackingData(1, true); // Force track on form submit
            }
        });

        // Enhanced input monitoring
        let inputTimer;
        document.addEventListener('input', (e) => {
            if (e.target.matches('input[type="email"], input[type="tel"], input[type="text"]')) {
                clearTimeout(inputTimer);
                inputTimer = setTimeout(() => {
                    const { email, phone } = extractEmailAndPhone();
                    // Track if we have new data AND we have session tracking params
                    if ((email || phone) && (trackingParams.gclid || trackingParams.wbraid || trackingParams.gbraid)) {
                        if ((email && email !== pageData.lastEmail) ||
                            (phone && phone !== pageData.lastPhone)) {
                            log("New input detected with tracking params, sending...");
                            sendTrackingData();
                        }
                    }
                }, 2000);
            }
        });

        // Track on page visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                const { email, phone } = extractEmailAndPhone();
                if ((email || phone) && (trackingParams.gclid || trackingParams.wbraid || trackingParams.gbraid)) {
                    sendTrackingData(1, true);
                }
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

    // Expose enhanced API
    window.pixelTrack = {
        track: () => sendTrackingData(1, true),
        setEmail: (email) => {
            window.pixelEmail = normalizeEmail(email);
            sendTrackingData(1, true);
        },
        setPhone: (phone) => {
            window.pixelPhone = normalizePhone(phone);
            sendTrackingData(1, true);
        },
        debug: (enabled) => {
            config.debug = enabled;
        },
        reset: () => {
            // Reset page tracking
            pageData.tracked = false;
            pageData.lastEmail = null;
            pageData.lastPhone = null;
            pageData.lastSent = 0;
            savePageData();
        },
        getSession: () => sessionData,
        getGCLID: () => getStoredGCLID(),
        clearSession: () => {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(`gclid_${clientId}`);
            sessionStorage.clear();
        }
    };

})();