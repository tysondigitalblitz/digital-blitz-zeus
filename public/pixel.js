(function () {
    function getParam(name) {
        return new URLSearchParams(window.location.search).get(name);
    }

    const clickData = {
        client_id: document.currentScript.getAttribute("data-client"),
        gclid: getParam("gclid"),
        wbraid: getParam("wbraid"),
        gbraid: getParam("gbraid"),
        utm_source: getParam("utm_source"),
        utm_medium: getParam("utm_medium"),
        utm_campaign: getParam("utm_campaign"),
        page_url: window.location.href,
    };

    fetch("/api/track", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(clickData),
    }).catch(() => {
        // Handle errors silently
    });
})();
