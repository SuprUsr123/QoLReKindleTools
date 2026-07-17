// ==UserScript==
// @name         Pixel Menu Button
// @namespace    https://tampermonkey.net/
// @version      1.0
// @match        https://rekindle.ink/pixel*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    function inject() {
        const menuBar = document.querySelector(".menu-bar");
        if (!menuBar) return false;

        if (document.getElementById("tm-import-btn"))
            return true;

        const button = document.createElement("button");
        button.id = "tm-import-btn";
        button.className = "menu-btn";
        button.textContent = "Enable/Disable Grid";
        let gridVisible = true;

        button.addEventListener("click", () => {
            const grid = document.getElementById("grid-canvas");
            if (!grid) return;

            gridVisible = !gridVisible;
            grid.style.display = gridVisible ? "" : "none";

            button.textContent = gridVisible
                ? "Disable Grid"
                : "Enable Grid";
});

        // Put it after "Post To KindleChat"
        const postBtn = document.getElementById("post-to-chat-btn");
        if (postBtn) {
            postBtn.insertAdjacentElement("afterend", button);
        } else {
            menuBar.appendChild(button);
        }

        return true;
    }

    if (inject()) return;

    const observer = new MutationObserver(() => {
        if (inject()) observer.disconnect();
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
})();