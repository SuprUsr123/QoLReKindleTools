// ==UserScript==
// @name        reKindle chat revamp
// @description Add a lot of features to KindleChat, such as sending images, gifs, videos, and anything else.
// @match       *://rekindle.ink/kindlechat
// @grant       none
// @run-at      document-idle
// ==/UserScript==

(function() {
    'use strict';

    // We must inject the script into the page's context so it can interact
    // with the site's functions and variables.
    const pageScript = `
    var inputEl = document.getElementById("msg-input");
    var base64Mode = false;
    var base64Style = '';

    // Unicode-safe Base64 encoding
    function enbase(str) {
        console.log('Encoding "'+str+'" into Base64');
        try {
            return btoa(unescape(encodeURIComponent(str)));
        } catch (e) {
            console.error('Encoding failed', e);
            try { return btoa(str); } catch(e2) { return str; }
        }
    }

    // Unicode-safe Base64 decoding
    function debase(str) {
        console.log('Decoding "'+str+'" from Base64');
        try {
            return decodeURIComponent(escape(atob(str)));
        } catch (e) {
            console.error('Decoding failed', e);
            try { return atob(str); } catch(e2) { return str; }
        }
    }

    function flipMode() {
        console.log('Toggling base64 mode to ' + !base64Mode);
        base64Mode = !base64Mode;
        if (base64Style == '') {
            base64Style = 'background-color: black; color: white;';
        } else {
            base64Style = '';
        }
        var btn = document.querySelector('#base64-btn');
        if (btn) {
            btn.style.cssText = 'padding: 0 5px;' + base64Style;
        }
    }
    window.flipMode = flipMode;

    // Save original functions so we can fall back to them if anything fails
    const originalSendMessage = window.sendMessage;
    const originalCensorText = window.censorText;

    // Override sendMessage safely
    window.sendMessage = function() {
        try {
            if (typeof window.isSendingMessage !== 'undefined' && window.isSendingMessage) return;

            var text = "";
            // Safely get composer text
            if (typeof window.getComposerText === 'function') {
                text = window.getComposerText().trim();
            } else if (inputEl) {
                text = (inputEl.innerText || inputEl.value || "").trim();
            }

            if (text) {
                // Note: \\n is used so the injected parser reads it as \n regex
                text = text.replace(/(\\n\\s*){3,}/g, "\\n\\n").trim();
            }

            if (typeof window.replyTarget !== 'undefined' && window.replyTarget) {
                var prefix = "@" + window.replyTarget.username + " ";
                if (text.indexOf(prefix) !== 0) {
                    text = prefix + text;
                    if (inputEl) inputEl.insertBefore(document.createTextNode(prefix), inputEl.firstChild);
                }
            }

            if (!text) return;

            if (base64Mode || (typeof window.containsUrl === 'function' && window.containsUrl(text))) {
                text = '==CHAMP_ENCODING==' + enbase(text);
            }

            if (text.toLowerCase().includes('rekindle')) {
                if (typeof window.showModal === 'function') window.showModal("Saying reKindle is not allowed.");
                return;
            }

            // Attempt to use the original page's flow if possible
            if (typeof window.checkRules === 'function' && typeof window.rtdb !== 'undefined' && window.currentUser) {
                window.checkRules(function() {
                    window.rtdb.ref("timeouts/" + window.currentUser.uid).once("value").then(function(snap) {
                        var t = snap.val();
                        if (t && t.until > Date.now()) {
                            var remaining = Math.ceil((t.until - Date.now()) / 60000);
                            if (typeof window.showModal === 'function') window.showModal("You are timed out. Please wait " + remaining + " minute(s) before posting.");
                            if (typeof window.resetSendState === 'function') window.resetSendState();
                            return;
                        }
                        if (typeof window.doSendMessage === 'function') window.doSendMessage(inputEl, text);
                    }).catch(function(err) {
                        console.error("[Timeout check] Error:", err);
                        if (typeof window.doSendMessage === 'function') window.doSendMessage(inputEl, text);
                    });
                });
            } else if (typeof window.doSendMessage === 'function') {
                // Fallback if checkRules/rtdb are missing
                window.doSendMessage(inputEl, text);
            } else if (typeof originalSendMessage === 'function') {
                // Ultimate fallback
                originalSendMessage.apply(this, arguments);
            }
        } catch (e) {
            console.error('[reKindle] Error in custom sendMessage, falling back to original:', e);
            if (typeof originalSendMessage === 'function') return originalSendMessage.apply(this, arguments);
        }
    };

    // Override censorText safely
    window.censorText = function(text) {
        try {
            // Check if text contains the marker anywhere (accounts for @prefixes)
            if (text.includes('==CHAMP_ENCODING==')) {
                var idx = text.indexOf('==CHAMP_ENCODING==');
                var prefix = text.substring(0, idx);
                var encoded = text.substring(idx + '==CHAMP_ENCODING=='.length);
                text = prefix + debase(encoded);
            }
            if (typeof window.filterBadWords === 'function') {
                return window.filterBadWords(text);
            }
            return text;
        } catch (e) {
            console.error('[reKindle] Error in custom censorText, falling back:', e);
            if (typeof originalCensorText === 'function') return originalCensorText(text);
            return text;
        }
    };

    document.addEventListener('keydown', e => {
        if (e.key === 'B' && e.shiftKey && e.ctrlKey) {
            flipMode();
        }
    });

    // Wait for the dynamic UI to load, then inject the button
    var uiInterval = setInterval(function() {
        var emojiButton = document.querySelector('#flipbook-btn + button');
        if (emojiButton && !document.querySelector('#base64-btn')) {
            var base64ModeButton = document.createElement('button');
            base64ModeButton.id = 'base64-btn';
            base64ModeButton.className = 'sys-btn';
            base64ModeButton.style.cssText = 'padding: 0 5px;' + base64Style;
            base64ModeButton.title = 'Base64 Mode';
            base64ModeButton.setAttribute('data-i18n-title', 'kindlechat.btn.base64');
            base64ModeButton.textContent = '64';

            base64ModeButton.addEventListener('click', flipMode);

            emojiButton.after(base64ModeButton);
            clearInterval(uiInterval); // Stop checking once injected
        }
    }, 1000);
    `;

    const script = document.createElement('script');
    script.textContent = pageScript;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
})();