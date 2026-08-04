// ==UserScript==
// @name         Perfect Circle Drawer (Fixed Radius)
// @namespace    example.com
// @version      1.3
// @description  Simulates a perfectly sized, high-radius circle that bypasses local scope limits
// @author       You
// @match        https://rekindle.ink/circle*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function drawPerfectBigCircle() {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();

        // 1. Target the exact center of the game's canvas coordinate space (160, 160)
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        // 2. Set radius to 100px (well above the 30px MIN_RADIUS requirement)
        const radius = 100;

        const simulatedPoints = [];
        const steps = 150; // Increased steps for flawless coverage density

        for (let i = 0; i <= steps; i++) {
            const angle = (i / steps) * 2 * Math.PI;

            // Calculate absolute coordinate positions within the canvas
            const canvasX = cx + radius * Math.cos(angle);
            const canvasY = cy + radius * Math.sin(angle);

            // Translate canvas space coordinates back into precise client viewport pixels
            const clientX = rect.left + (canvasX * (rect.width / canvas.width));
            const clientY = rect.top + (canvasY * (rect.height / canvas.height));

            simulatedPoints.push({ clientX, clientY });
        }

        // 3. Helper to dispatch native mouse actions
        function sendEvent(type, point) {
            const ev = new MouseEvent(type, {
                clientX: point.clientX,
                clientY: point.clientY,
                bubbles: true,
                cancelable: true,
                view: window
            });
            canvas.dispatchEvent(ev);
        }

        // 4. Run the emulation cycle
        sendEvent('mousedown', simulatedPoints[0]);

        simulatedPoints.forEach(point => {
            sendEvent('mousemove', point);
        });

        sendEvent('mouseup', simulatedPoints[simulatedPoints.length - 1]);
    }

    // --- Retro UI Button Injection ---
    const btn = document.createElement('button');
    btn.textContent = 'Draw 100% Big Circle';
    Object.assign(btn.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: '10000',
        padding: '8px 16px',
        background: '#fff',
        border: '2px solid #000',
        boxShadow: '4px 4px 0px #000',
        fontWeight: 'bold',
        fontFamily: 'monospace',
        cursor: 'pointer'
    });

    btn.addEventListener('click', drawPerfectBigCircle);
    document.body.appendChild(btn);
})();