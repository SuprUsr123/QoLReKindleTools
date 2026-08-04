// ==UserScript==
// @name         Bypasses for RK.
// @namespace    http://tampermonkey.net
// @version      1.0
// @match        *://*.rekindle.ink/*
// @grant        GM_addStyle
// @run-at       @run-at document-start
// ==/UserScript==

(function() {
    'use strict';

    const originalGet = Object.getOwnPropertyDescriptor;
    Object.getOwnPropertyDescriptor = function(obj, prop) {
        const desc = originalGet(obj, prop);
        // If the anti-tamper script checks 'isPro', lie and say it is perfectly normal
        if (prop === 'isPro' && desc) {
            desc.configurable = true;
        }
        return desc;
    };

    GM_addStyle(`
#paywall-overlay, .pro-locked, .plus-label {
    opacity: 0 !important;
    pointer-events: none !important;
    position: fixed !important;
    top: -9999px !important;
}


    `);

    const sheet = new CSSStyleSheet();
    sheet.replaceSync('#paywall-overlay { display: none !important; }');
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];

    // 1. Define the exact mapping of App Names to their actual URLs
    const mappedUrls = {
        "Mail": "./mail.html",
        "Dropbox": "./dropbox.html",
        "AI Assistant": "./chat.html",
        "Files": "./files.html",
        "Docs": "./docs.html",
        "Quick ToDo": "./quicktodo.html",
        "AirType": "./airtype.html",
        "Bluesky": "./bluesky.html",
        "Mastodon": "./mastodon.html",
        "Pinterest": "./pintrest.html",
        "Substack": "./substack.html",
        "Flipbook": "./flipbook.html",
        "Photo Frame": "./photoframe.html"
    };

    // 2. The core unlocking function
    function unlockApps() {
        document.querySelectorAll('.pro-locked').forEach(button => {

            // Look through our map and check if the button's text contains the app name
            for (const [appName, actualUrl] of Object.entries(mappedUrls)) {
                if (button.textContent.includes(appName)) {

                    // Strip the original script blocking the click
                    button.removeAttribute('onclick');

                    // Wire up a brand new click event that bypasses the paywall
                    button.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation(); // Stops any other hidden listeners from firing
                        window.location.href = actualUrl;
                    };

                    // Restore the href property if it is an anchor tag
                    if (button.tagName === 'A') {
                        button.href = actualUrl;
                    }

                    // Clean up the UI to make it look unlocked
                    button.classList.remove('pro-locked');
                    const plusBadge = button.querySelector('.plus-label');
                    if (plusBadge) plusBadge.remove();

                    break;
                }
            }
        });
    }

    // 3. Run the unlocker immediately in case elements are already loaded
    unlockApps();

    // 4. Set up an observer to watch for elements loading dynamically
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                unlockApps();
            }
        }
    });

    // Start watching the body of the page for changes
    observer.observe(document.body, { childList: true, subtree: true });

})();
