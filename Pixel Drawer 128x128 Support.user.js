// ==UserScript==
// @name         Pixel Drawer 128x128 Support
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Adds 128x128 grid size option to the Pixel drawing extension
// @author       You
// @match        *://rekindle.ink/*
// @match        *://*.rekindle.ink/*
// @match        file://*pixel.html*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function addSupport128x128() {
        // Add 128x128 and 256x256 buttons to the new drawing modal
        const new64Btn = document.getElementById('new-64-btn');
        if (new64Btn && !document.getElementById('new-128-btn')) {
            const new128Btn = document.createElement('button');
            new128Btn.className = 'sys-btn';
            new128Btn.id = 'new-128-btn';
            new128Btn.style.marginLeft = '10px';
            new128Btn.textContent = '128x128';
            new128Btn.onclick = () => window.createNew(128);
            new64Btn.parentElement.appendChild(new128Btn);

            const new256Btn = document.createElement('button');
            new256Btn.className = 'sys-btn';
            new256Btn.id = 'new-256-btn';
            new256Btn.style.marginLeft = '10px';
            new256Btn.textContent = '256x256';
            new256Btn.onclick = () => window.createNew(256);
            new64Btn.parentElement.appendChild(new256Btn);
        }

        // Hide the post button for 128x128 and 256x256 (similar to 64x64 behavior)
        // This happens in the openDrawing function when gridSize is 128 or 256
        const postBtn = document.getElementById('post-to-chat-btn');
        if (postBtn && typeof window.gridSize !== 'undefined' && (window.gridSize === 128 || window.gridSize === 256)) {
            postBtn.style.display = 'none';
        }
    }

    // Run on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addSupport128x128);
    } else {
        addSupport128x128();
    }

    // Also run after a small delay to catch dynamic content
    setTimeout(addSupport128x128, 500);

    // Monitor for modal open/close to re-add button if needed
    const observer = new MutationObserver(() => {
        const modalDiv = document.getElementById('new-drawing-modal');
        if (modalDiv && modalDiv.style.display === 'flex') {
            addSupport128x128();
        }
    });

    observer.observe(document.body, {
        attributes: true,
        subtree: true,
        attributeFilter: ['style']
    });

})();
