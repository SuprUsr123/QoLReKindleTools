// ==UserScript==
// @name         Pixel Menu Button
// @namespace    https://tampermonkey.net/
// @version      2.0
// @match        *://rekindle.ink/*
// @match        *://*.rekindle.ink/*
// @match        file://*pixel.html*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    function injectButton() {
        const menuBar = document.querySelector('.menu-bar');
        if (!menuBar || document.getElementById('tm-grid-toggle-btn')) return;

        const button = document.createElement('button');
        button.id = 'tm-grid-toggle-btn';
        button.className = 'menu-btn';
        button.type = 'button';
        button.textContent = 'Hide Grid';

        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const grid = document.getElementById('grid-canvas');
            if (!grid) return;

            if (grid.style.visibility === 'hidden') {
                grid.style.visibility = 'visible';
                button.textContent = 'Hide Grid';
            } else {
                grid.style.visibility = 'hidden';
                button.textContent = 'Show Grid';
            }
        });

        menuBar.appendChild(button);
    }

    // Safely check for menu-bar existence without heavy observers
    const checkInterval = setInterval(() => {
        if (document.querySelector('.menu-bar')) {
            injectButton();
        }
    }, 500);

    // Clean up interval after page settles
    setTimeout(() => clearInterval(checkInterval), 10000);
})();