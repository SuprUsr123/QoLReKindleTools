// ==UserScript==
// @name         ReKindle User ID Backup (Enhanced Stability v5.4)
// @namespace    http://tampermonkey.net/
// @version      5.4
// @description  Optimized for ReKindle's placeholder patterns with draggable/hideable window
// @author       You
// @match        *://*.rekindle.ink/*
// @match        *://localhost/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    const STORAGE_KEY = 'rekindle_user_backup';
    const SYNCED_KEY = 'rekindle_synced_ids';
    const STABILITY_PASSES = 4; // 4 passes (8 seconds)
    const CHECK_INTERVAL = 2000;

    let pendingSync = [];
    let isSyncing = false;
    let stabilityTracker = {};
    let currentSnapshot = {};
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    // Window state persistence
    const WINDOW_STATE_KEY = 'rekindle_window_state';
    let windowState = JSON.parse(localStorage.getItem(WINDOW_STATE_KEY) || '{"x":20,"y":20,"hidden":false}');

    function isPlaceholderForUID(username, uid) {
        if (!username || !uid) return false;
        const cleanUID = uid.replace(/['"]/g, '');
        const uidPrefix = cleanUID.substring(0, 8);

        if (username === uidPrefix) return true;
        if (username.startsWith(uidPrefix) && username.length <= 12) return true;

        return false;
    }

    function looksLikeRandomString(username) {
        if (!username) return true;
        if (username.length < 7 || username.length > 12) return false;

        const hasUpper = /[A-Z]/.test(username);
        const hasLower = /[a-z]/.test(username);
        const hasDigit = /[0-9]/.test(username);
        const vowels = (username.match(/[aeiouAEIOU]/g) || []).length;

        if (hasUpper && hasLower && hasDigit && vowels <= 2) return true;

        return false;
    }

    function isReKindlePlaceholder(username, uid) {
        if (!username) return true;
        if (uid && isPlaceholderForUID(username, uid)) return true;
        if (looksLikeRandomString(username)) return true;
        return false;
    }

    function scrapeUsers() {
        let userMap = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        let syncedIds = JSON.parse(localStorage.getItem(SYNCED_KEY)) || [];
        let updatedStorage = false;
        currentSnapshot = {};

        let elements = document.querySelectorAll('[onclick*="openUserProfile"]');

        elements.forEach(el => {
            let onclickStr = el.getAttribute('onclick');
            let match = onclickStr.match(/openUserProfile\(['"]([^'"]+)['"]/);

            if (match && match[1]) {
                let uid = match[1];
                let username = el.innerText.trim();

                if (!username) return;

                currentSnapshot[uid] = username;

                if (!stabilityTracker[uid]) {
                    stabilityTracker[uid] = {
                        values: [],
                        stable: false,
                        consecutiveReal: 0,
                        lastSeenPlaceholder: false,
                        realUsername: null
                    };
                }

                const isPlaceholder = isReKindlePlaceholder(username, uid);
                const tracker = stabilityTracker[uid];

                if (isPlaceholder) {
                    tracker.lastSeenPlaceholder = true;
                    tracker.consecutiveReal = 0;
                    tracker.values = [];
                } else {
                    tracker.lastSeenPlaceholder = false;
                    tracker.consecutiveReal++;

                    if (!tracker.realUsername || tracker.realUsername === uid.substring(0, 8)) {
                        tracker.realUsername = username;
                    }

                    tracker.values.push(username);
                    if (tracker.values.length > STABILITY_PASSES) {
                        tracker.values.shift();
                    }
                }

                if (tracker.consecutiveReal >= STABILITY_PASSES && tracker.values.length === STABILITY_PASSES) {
                    const allSame = tracker.values.every(v => v === username);

                    if (allSame && !isPlaceholder && !tracker.stable) {
                        tracker.stable = true;
                        const finalUsername = tracker.realUsername || username;

                        if (userMap[uid] !== finalUsername) {
                            userMap[uid] = finalUsername;
                            updatedStorage = true;
                        }

                        if (!syncedIds.includes(uid)) {
                            let inQueue = pendingSync.find(u => u.id === uid);
                            if (!inQueue) {
                                pendingSync.push({ id: uid, username: finalUsername });
                            } else if (inQueue.username !== finalUsername) {
                                inQueue.username = finalUsername;
                            }
                        }
                    } else if (!allSame && tracker.realUsername) {
                        const realCount = tracker.values.filter(v => v === tracker.realUsername).length;
                        if (realCount >= 3 && !tracker.stable) {
                            tracker.stable = true;

                            if (userMap[uid] !== tracker.realUsername) {
                                userMap[uid] = tracker.realUsername;
                                updatedStorage = true;
                            }

                            if (!syncedIds.includes(uid)) {
                                let inQueue = pendingSync.find(u => u.id === uid);
                                if (!inQueue) {
                                    pendingSync.push({ id: uid, username: tracker.realUsername });
                                } else if (inQueue.username !== tracker.realUsername) {
                                    inQueue.username = tracker.realUsername;
                                }
                            }
                        }
                    }
                }
            }
        });

        for (let uid in stabilityTracker) {
            if (!currentSnapshot[uid]) {
                delete stabilityTracker[uid];
            }
        }

        if (updatedStorage) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(userMap));
        }
        updateUI();
    }

    setInterval(scrapeUsers, CHECK_INTERVAL);

    const observer = new MutationObserver(() => {
        if (!window._scrapeTimeout) {
            window._scrapeTimeout = setTimeout(() => {
                scrapeUsers();
                window._scrapeTimeout = null;
            }, 500);
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    function syncToServer() {
        if (isSyncing || pendingSync.length === 0) return;
        isSyncing = true;
        updateUI();

        let syncedIds = JSON.parse(localStorage.getItem(SYNCED_KEY)) || [];
        let toSync = pendingSync.filter(u => !syncedIds.includes(u.id));

        if (toSync.length === 0) {
            pendingSync = [];
            isSyncing = false;
            updateUI();
            return;
        }

        GM_xmlhttpRequest({
            method: "POST",
            url: "http://localhost:8765",
            headers: { "Content-Type": "application/json" },
            data: JSON.stringify(toSync),
            onload: function(response) {
                if (response.status === 200) {
                    let syncedIds = JSON.parse(localStorage.getItem(SYNCED_KEY)) || [];
                    toSync.forEach(user => {
                        if (!syncedIds.includes(user.id)) {
                            syncedIds.push(user.id);
                        }
                    });
                    localStorage.setItem(SYNCED_KEY, JSON.stringify(syncedIds));

                    let pendingIds = new Set(toSync.map(u => u.id));
                    pendingSync = pendingSync.filter(u => !pendingIds.has(u.id));
                } else {
                    console.error("Failed to append to CSV. Is the Python server running?");
                }
                isSyncing = false;
                updateUI();
            },
            onerror: function(err) {
                console.error("Connection error. Ensure rekindle_server.py is running.", err);
                isSyncing = false;
                updateUI();
            }
        });
    }

    setInterval(() => {
        if (pendingSync.length > 5) {
            syncToServer();
        }
    }, 10000);

    window.addEventListener('wheel', function(e) {
        if (e.deltaY < 0 && pendingSync.length > 0) {
            syncToServer();
        }
    });

    function toggleWindow() {
        windowState.hidden = !windowState.hidden;
        localStorage.setItem(WINDOW_STATE_KEY, JSON.stringify(windowState));
        const panel = document.getElementById('rekindle-sys7-panel');
        if (panel) {
            panel.style.display = windowState.hidden ? 'none' : 'block';
            const toggleBtn = document.getElementById('rekindle-toggle-btn');
            if (toggleBtn) {
                toggleBtn.textContent = windowState.hidden ? '📌' : '✕';
                toggleBtn.title = windowState.hidden ? 'Show Window' : 'Hide Window';
            }
        }
    }

    function startDrag(e) {
        const panel = document.getElementById('rekindle-sys7-panel');
        if (!panel) return;

        // Only allow drag from the header area
        const rect = panel.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Header is the top 30px
        if (clickY > 30) return;

        isDragging = true;
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        panel.style.cursor = 'grabbing';
        e.preventDefault();
    }

    function onDrag(e) {
        if (!isDragging) return;
        const panel = document.getElementById('rekindle-sys7-panel');
        if (!panel) return;

        let x = e.clientX - dragOffsetX;
        let y = e.clientY - dragOffsetY;

        // Keep window in viewport with some padding
        const maxX = window.innerWidth - panel.offsetWidth - 10;
        const maxY = window.innerHeight - panel.offsetHeight - 10;
        x = Math.max(10, Math.min(x, maxX));
        y = Math.max(10, Math.min(y, maxY));

        panel.style.left = x + 'px';
        panel.style.top = y + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';

        windowState.x = x;
        windowState.y = y;
        e.preventDefault();
    }

    function stopDrag() {
        if (isDragging) {
            isDragging = false;
            const panel = document.getElementById('rekindle-sys7-panel');
            if (panel) panel.style.cursor = 'default';
            localStorage.setItem(WINDOW_STATE_KEY, JSON.stringify(windowState));
        }
    }

    // Inject Floating Window with draggable header and hide button
    function injectFloatingWindow() {
        if (document.getElementById('rekindle-sys7-panel')) return;
        if (!document.body) return;

        let panel = document.createElement('div');
        panel.id = 'rekindle-sys7-panel';
        panel.style.cssText = `
            position: fixed;
            left: ${windowState.x}px;
            top: ${windowState.y}px;
            background: #ffffff;
            border: 2px solid #000000;
            box-shadow: 2px 2px 0px #000000;
            padding: 8px;
            z-index: 999999;
            font-family: 'Courier New', Courier, monospace;
            text-align: center;
            min-width: 140px;
            image-rendering: pixelated;
            display: ${windowState.hidden ? 'none' : 'block'};
            user-select: none;
            cursor: default;
        `;

        // Title bar (draggable area)
        let titleBar = document.createElement('div');
        titleBar.id = 'rekindle-title-bar';
        titleBar.style.cssText = `
            background: repeating-linear-gradient(0deg, #000, #000 1px, #fff 1px, #fff 2px);
            border: 1px solid #000;
            height: 20px;
            margin-bottom: 6px;
            cursor: grab;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 4px;
            position: relative;
        `;
        titleBar.title = 'Drag to move';

        // Drag indicator dots
        let dragHandle = document.createElement('div');
        dragHandle.style.cssText = `
            color: #000;
            font-size: 10px;
            letter-spacing: 2px;
            padding-left: 4px;
            opacity: 0.6;
        `;
        dragHandle.textContent = '⋯';
        dragHandle.title = 'Drag to move';

        // Title text in title bar
        let titleText = document.createElement('span');
        titleText.style.cssText = `
            color: #000;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            background: white;
            padding: 0 6px;
        `;
        titleText.textContent = 'REKINDLE';

        // Hide/Show toggle button
        let toggleBtn = document.createElement('button');
        toggleBtn.id = 'rekindle-toggle-btn';
        toggleBtn.textContent = '✕';
        toggleBtn.style.cssText = `
            background: white;
            border: 1px solid #000;
            color: #000;
            font-size: 10px;
            width: 16px;
            height: 16px;
            cursor: pointer;
            padding: 0;
            line-height: 14px;
            text-align: center;
            font-weight: bold;
        `;
        toggleBtn.title = 'Hide Window';
        toggleBtn.onclick = toggleWindow;

        titleBar.appendChild(dragHandle);
        titleBar.appendChild(titleText);
        titleBar.appendChild(toggleBtn);

        // Main content
        let content = document.createElement('div');
        content.style.cssText = 'padding: 2px 0;';

        let title = document.createElement('div');
        title.id = 'rekindle-sys7-count';
        title.style.cssText = 'font-size: 12px; color: #000; font-weight: bold; margin-bottom: 4px;';

        let status = document.createElement('div');
        status.id = 'rekindle-sys7-status';
        status.style.cssText = 'font-size: 10px; color: #000; margin-bottom: 8px;';

        let pushBtn = document.createElement('button');
        pushBtn.innerText = 'Force Push';
        pushBtn.style.cssText = `
            background: #ffffff;
            color: #000000;
            border: 2px solid #000000;
            box-shadow: 1px 1px 0px #000000;
            padding: 4px 8px;
            font-size: 11px;
            font-family: 'Courier New', Courier, monospace;
            cursor: pointer;
            width: 100%;
            font-weight: bold;
            margin-bottom: 6px;
        `;
        pushBtn.onmousedown = () => { pushBtn.style.boxShadow = 'none'; pushBtn.style.transform = 'translate(1px, 1px)'; };
        pushBtn.onmouseup = () => { pushBtn.style.boxShadow = '1px 1px 0px #000000'; pushBtn.style.transform = 'none'; };
        pushBtn.onclick = syncToServer;

        let resetBtn = document.createElement('button');
        resetBtn.innerText = 'Reset Counter';
        resetBtn.style.cssText = `
            background: #ffffff;
            color: #000000;
            border: 2px solid #000000;
            box-shadow: 1px 1px 0px #000000;
            padding: 4px 8px;
            font-size: 11px;
            font-family: 'Courier New', Courier, monospace;
            cursor: pointer;
            width: 100%;
            font-weight: bold;
        `;
        resetBtn.onmousedown = () => { resetBtn.style.boxShadow = 'none'; resetBtn.style.transform = 'translate(1px, 1px)'; };
        resetBtn.onmouseup = () => { resetBtn.style.boxShadow = '1px 1px 0px #000000'; resetBtn.style.transform = 'none'; };
        resetBtn.onclick = () => {
            if (confirm("Reset local counter to 0? (This does NOT delete your CSV file)")) {
                localStorage.removeItem(STORAGE_KEY);
                localStorage.removeItem(SYNCED_KEY);
                pendingSync = [];
                stabilityTracker = {};
                updateUI();
            }
        };

        content.appendChild(title);
        content.appendChild(status);
        content.appendChild(pushBtn);
        content.appendChild(resetBtn);

        panel.appendChild(titleBar);
        panel.appendChild(content);

        // Drag events
        titleBar.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDrag);

        document.body.appendChild(panel);
        updateUI();
    }

    function updateUI() {
        let titleEl = document.getElementById('rekindle-sys7-count');
        let statusEl = document.getElementById('rekindle-sys7-status');

        if (titleEl && statusEl) {
            let userMap = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
            let count = Object.keys(userMap).length;
            titleEl.innerText = `Total IDs: ${count}`;

            if (isSyncing) {
                statusEl.innerText = 'Syncing...';
                statusEl.style.fontWeight = 'bold';
            } else if (pendingSync.length > 0) {
                statusEl.innerText = `${pendingSync.length} Pending...`;
                statusEl.style.fontWeight = 'bold';
            } else {
                statusEl.innerText = 'Status: Synced';
                statusEl.style.fontWeight = 'normal';
            }
        }
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl+Shift+H to toggle window
        if (e.ctrlKey && e.shiftKey && (e.key === 'h' || e.key === 'H')) {
            e.preventDefault();
            toggleWindow();
        }
        // Ctrl+Shift+R to reset
        if (e.ctrlKey && e.shiftKey && (e.key === 'r' || e.key === 'R')) {
            e.preventDefault();
            if (confirm("Reset local counter to 0? (This does NOT delete your CSV file)")) {
                localStorage.removeItem(STORAGE_KEY);
                localStorage.removeItem(SYNCED_KEY);
                pendingSync = [];
                stabilityTracker = {};
                updateUI();
            }
        }
    });

    // Double-click on the panel to toggle (on the content, not buttons)
    document.addEventListener('dblclick', function(e) {
        const panel = document.getElementById('rekindle-sys7-panel');
        if (panel && panel.contains(e.target)) {
            const target = e.target;
            if (target.tagName !== 'BUTTON' && !target.closest('button')) {
                toggleWindow();
            }
        }
    });

    setInterval(injectFloatingWindow, 2000);
    setTimeout(scrapeUsers, 3000);

    console.log('ReKindle User Backup v5.4 loaded - Draggable & Hideable window');
    console.log('Shortcuts: Ctrl+Shift+H to toggle window, Ctrl+Shift+R to reset');
})();