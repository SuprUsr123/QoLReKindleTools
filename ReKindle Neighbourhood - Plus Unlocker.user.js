// ==UserScript==
// @name         ReKindle Neighbourhood - Plus Unlocker
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Automatically bypasses the ReKindle+ paywall for gradient pixel art avatars.
// @author       You
// @match        *://*/neighbourhood.html*
// @match        *://*.rekindle.ink/neighbourhood*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log("Injecting ReKindle+ Bypass...");

    // Method 1: The Local Storage Toggle
    // Permanently tricks the page into thinking you have ReKindle+ on load
    localStorage.setItem('rekindle_is_pro', 'true');
    console.log("ReKindle+ status forced to true via local storage.");

    // Method 2: Function Overrides
    // Injecting into the document body ensures we override the page's native window variables
    const bypassScript = document.createElement('script');
    bypassScript.innerHTML = `
        // 1. Prevent the UI from greying out gradient thumbnails
        window.lockPixelPickerItem = function(el) {
            console.log("Bypass: Prevented thumbnail from locking.");
        };

        // 2. Remove the paywall check from the actual selection function
        window.selectPixelArtAsAvatar = async function(id) {
            const grid = await loadPixelDrawingData(id);
            if (!grid) {
                showAlertModal('Could not load that drawing.');
                return;
            }

            // --- THE isPlus PAYWALL CHECK HAS BEEN REMOVED HERE ---

            const avatar = gridToAvatar(grid);
            if (!avatar) {
                showAlertModal('Only 16x16 drawings can be used as avatars.');
                return;
            }

            // Apply the avatar to your profile
            myProfile.customAvatar = avatar;
            myProfile.avatarSeed = null;
            drawAvatar('my-avatar', myProfile.customAvatar);
            closePixelArtPicker();

            console.log("Gradient avatar selected! Remember to click 'Save Changes'.");
        };

        console.log("Avatar selection functions successfully overridden.");
    `;

    // Append the script to the page to execute it
    document.body.appendChild(bypassScript);
})();