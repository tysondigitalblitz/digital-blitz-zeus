(function () {
    const clientId = document.currentScript.getAttribute("data-client");

    if (!clientId) return;

    const urlParams = new URLSearchParams(window.location.search);
    const gclid = urlParams.get("gclid");
    const wbraid = urlParams.get("wbraid");
    const gbraid = urlParams.get("gbraid");
    const utm_source = urlParams.get("utm_source");
    const utm_medium = urlParams.get("utm_medium");
    const utm_campaign = urlParams.get("utm_campaign");

    const pageUrl = window.location.href;

    function extractEmailAndPhone() {
        const emailInput =
            document.querySelector("input[type=email]") ||
            document.querySelector("[data-email]");
        const phoneInput =
            document.querySelector("input[type=tel]") ||
            document.querySelector("[data-phone]");

        return {
            email: emailInput?.value || null,
            phone: phoneInput?.value || null,
        };
    }

    document.addEventListener("DOMContentLoaded", () => {
        const { email, phone } = extractEmailAndPhone();

        fetch("/api/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                client_id: clientId,
                gclid,
                wbraid,
                gbraid,
                utm_source,
                utm_medium,
                utm_campaign,
                page_url: pageUrl,
                email,
                phone,
            }),
        }).catch((err) => console.warn("Pixel failed:", err));
    });
})();
