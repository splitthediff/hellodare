// js/core/videoController.js - Manages video playback and volume

import { config } from '../config.js';

// --- Module State ---
let controlledVideos = []; // Stores the Video class instances
let globalVolumeLevel = 0.0;
const DEFAULT_UNMUTE_LEVEL = config.video.defaultUnmuteLevel;

// ==================================================
// EXPORTED FUNCTIONS
// ==================================================

/** Stores the array of video objects. */
export function setVideos(videosArray) {
    controlledVideos = videosArray || [];
    globalVolumeLevel = 0.0;
    resetInfoAnimation();
}

export async function controlVideoPlayback(currentIdx, previousIdx, onScrollCompleteCallback = null) {
    if (!controlledVideos) controlledVideos = [];
    const videoCount = controlledVideos.length;
    const infoSectionIndex = videoCount;

    // We need access to the scrollItems elements here to find content
    // Let's assume scrollItems is accessible or passed, otherwise this needs adjustment
    // For now, let's query them directly (less ideal but works for demonstration)
    const scrollItems = document.querySelectorAll(config.selectors.scrollItem); // Query within function

    if (!scrollItems || scrollItems.length === 0) {
        console.error("[VideoController] Cannot control playback/fade: scrollItems not found.");
        return;
    }

    // console.log(`--- [VideoController w/ Fade] Playback: Prev=${previousIdx}, Current=${currentIdx}, InfoIdx=${infoSectionIndex} ---`);

    // --- Handle Info Section (Keep this logic) ---
    if (currentIdx === infoSectionIndex) {
        if (typeof onScrollCompleteCallback === 'function') { onScrollCompleteCallback(); }
        else { animateInfoIn(); }
    } else if (previousIdx === infoSectionIndex && currentIdx !== previousIdx) {
        resetInfoAnimation();
    }

    // --- Loop through ALL scroll items to handle fade/reset ---
    for (let index = 0; index < scrollItems.length; index++) {
        const scrollItemElement = scrollItems[index];
        if (!scrollItemElement) continue;

        const isVideoIndex = index < videoCount;
        const video = isVideoIndex ? controlledVideos[index] : null;

        // --- Find the primary content element within this scrollItem ---
        let contentElement = null;
        if (isVideoIndex) {
            contentElement = scrollItemElement.querySelector('.video-aspect-wrapper');
        } else if (index === infoSectionIndex) { // Check if it's the info section index
            contentElement = scrollItemElement.querySelector('.info-content');
        }
        // --- End Find Content ---

        const initialYOffset = 20;

        // --- Action for the CURRENT item being scrolled TO ---
        if (index === currentIdx) {
            // --- Animate Content In ---
            if (contentElement && typeof gsap !== 'undefined') {
                 // Check if we are animating info section blocks individually
                 const isInfoBlocks = Array.isArray(contentElement);

                gsap.to(contentElement, {
                    opacity: 1,
                    xPercent: isVideoIndex ? -50 : 0, // Apply -50% only to video wrapper
                    yPercent: isVideoIndex ? -50 : 0, // Apply -50% only to video wrapper
                    y: 0, // Animate back to original vertical position
                    duration: 0.5, // Adjust duration
                    delay: 0.1, // Slight delay after scroll stops/starts
                    ease: "power1.out",
                    overwrite: true,
                    stagger: isInfoBlocks ? 0.1 : 0 // No stagger for single elements
                });
            }
            // --------------------------

            // --- Handle Video Playback (Only if it IS a video) ---
            if (isVideoIndex && video) {
                try {
                    const player = await video.initializePlayer();
                    const playPauseButton = document.getElementById(`playPauseButton-${video.id}`);
                    const soundButton = document.getElementById(`soundButton-${video.id}`);

                    if (video.justFinishedLoopLimit) { // Use correct loop flag
                         console.log(`%c[VideoController ${video.id}] Activate Play SKIPPED: Loop limit. Ensuring pause.`, "color: orange;");
                         try { await player.pause(); } catch(e){ /* handle */ }
                         video.justFinishedLoopLimit = false;
                         if (playPauseButton) playPauseButton.innerText = 'Play';
                         await player.setVolume(globalVolumeLevel);
                         if (soundButton) soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';
                    } else {
                        // console.log(`[VideoController ${video.id}] Activating Video ${index}...`);
                        await player.setVolume(globalVolumeLevel);
                        if (soundButton) soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';
                        await player.play();
                        if (playPauseButton) playPauseButton.innerText = 'Pause';
                    }
                } catch (error) {
                    console.warn(`[VideoController ${video?.id || index}] Error activating video: ${error.message}`);
                     // Reset buttons on error
                     const playPauseButton = document.getElementById(`playPauseButton-${video?.id}`);
                     const soundButton = document.getElementById(`soundButton-${video?.id}`);
                     if (playPauseButton) playPauseButton.innerText = 'Play';
                     if (soundButton) soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';
                }
            } else if (!isVideoIndex) { // It's the info section being activated
                 console.log(`[VideoController] Info Section Activated (Index ${index}). Content faded in.`);
                 // NOTE: The separate animateInfoIn might be redundant now,
                 // unless it does more complex animations than the simple fade/slide here.
            }
        }
        // --- Action for all OTHER items being scrolled AWAY FROM ---
        else {
            // --- Reset Content Out ---
            if (contentElement && typeof gsap !== 'undefined') {
                gsap.to(contentElement, {
                    opacity: 0,
                    y: initialYOffset, // Animate back to the offset position
                    // Keep xPercent/yPercent for consistency if needed, though less critical when opacity is 0
                    //xPercent: isVideoIndex ? -50 : 0,
                    //yPercent: isVideoIndex ? -50 : 0,
                    duration: 1.5, // Shorter duration for fade out (adjust as needed)
                    ease: "power1.in", // Ease 'in' often feels good for disappearing elements
                    overwrite: true, // Stop any incoming animation if user scrolls back quickly
                });
            }
            // ------------------------

            // --- Pause Inactive Videos ---
            if (isVideoIndex && video) {
                const playPauseButton = document.getElementById(`playPauseButton-${video.id}`);
                const soundButton = document.getElementById(`soundButton-${video.id}`);
                if (soundButton) soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';
                if (video.player) { // Only pause if player exists
                    try { video.player.pause().catch(e => {}); } catch (e) {}
                }
                if (playPauseButton) playPauseButton.innerText = 'Play';
            }
        }
    } // End for loop iterating scrollItems
    // console.log(`--- [VideoController w/ Fade] Finished Controlling ---`);
}

/** Controls play/pause/volume for videos based on scroll index activation. */
/*export async function controlVideoPlayback(currentIdx, previousIdx, onScrollCompleteCallback = null) {
    // Calculate counts and indices
    if (!controlledVideos) controlledVideos = []; // Ensure array exists
    const videoCount = controlledVideos.length;
    const infoSectionIndex = videoCount; // Index is 0-based, so count is the index after last video

    console.log(`--- [VideoController] Playback: Prev=${previousIdx}, Current=${currentIdx}, InfoIdx=${infoSectionIndex} ---`);

    // Handle Info Section Activation/Deactivation FIRST
    if (currentIdx === infoSectionIndex) {
        // Info Section is NOW active
        console.log(`[VideoController] Info Section Activated. Animating IN.`);
        if (typeof onScrollCompleteCallback === 'function') {
            console.log("[VideoController] Will trigger info animation via onScrollComplete callback.");
            onScrollCompleteCallback(); // Execute the callback passed from scroll.js
       } else {
            // Fallback if no callback provided (e.g., immediate scroll in goToIndex)
             console.log("[VideoController] No onScrollComplete callback provided, animating info IN immediately.");
             animateInfoIn(); // Animate directly
       }
    } else if (previousIdx === infoSectionIndex && currentIdx !== previousIdx) {
        // Info Section was active, NOW DEACTIVATED
        console.log(`[VideoController] Info Section Deactivated. Resetting animation.`);
        resetInfoAnimation();
    }

    // Handle Video Activation/Deactivation
    for (let index = 0; index < videoCount; index++) { // Loop only through known video indices
        const video = controlledVideos[index];
        if (!video) continue; // Skip if video object is missing

        const playPauseButton = document.getElementById(`playPauseButton-${video.id}`);
        const soundButton = document.getElementById(`soundButton-${video.id}`);

        try {
            if (index === currentIdx) { // --- Activate this video ---
                const player = await video.initializePlayer();
                // Check flag (using hasPlayedOnce from your Video.js)
                if (video.hasPlayedOnce) {
                    console.log(`%c[VideoController ${video.id}] Activate SKIPPED (hasPlayedOnce). Pausing.`, "color: blue;");
                    if (playPauseButton) playPauseButton.innerText = 'Play';
                    if (video.thumbnailElement) video.thumbnailElement.classList.remove('thumbnail-hidden');
                    await player.pause().catch(e => {});
                } else {
                    // Activate normally
                    console.log(`[VideoController ${video.id}] Activating Video ${index}.`);
                    await player.setVolume(globalVolumeLevel);
                    await player.play();
                    if (playPauseButton) playPauseButton.innerText = 'Pause';
                }
                if (soundButton) soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';

            } else { // --- Deactivate this video (or ensure paused if info active) ---
                if (soundButton) soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';
                if (video.player) { // Only try to pause if player instance exists
                    try {
                        video.player.pause().catch(e => { ignore non-critical errors });
                        if (playPauseButton) playPauseButton.innerText = 'Play';
                    } catch (e) {
                        if (playPauseButton) playPauseButton.innerText = 'Play'; // Fallback
                    }
                } else {
                    // Player doesn't exist yet, ensure button shows Play
                    if (playPauseButton) playPauseButton.innerText = 'Play';
                }
            }
        } catch (error) {
            console.warn(`[VideoController ${video?.id || index}] Error: ${error.message}`);
            // Reset buttons on error
            if (playPauseButton) playPauseButton.innerText = 'Play';
            if (soundButton) soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';
        }
    } // End video loop
     console.log(`--- [VideoController] Finished Controlling Playback ---`);
}*/

// ==================================================
// ANIMATION HELPERS (Internal to this module)
// ==================================================

/** Animates the info section content into view */
export function animateInfoIn() {
    // Ensure GSAP is available (if not using modules for GSAP)
    if (typeof gsap === 'undefined') { console.error("GSAP not available for info animation."); return; }

    const infoBlocks = gsap.utils.toArray(`${config.selectors.infoSectionId} .info-block`);

    if (infoBlocks.length > 0) {
         console.log("[VideoController] Animating Info Section IN");
         gsap.to(infoBlocks, {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: "power1.out",
            stagger: {
                each: .5,
                from: "start"
            },
            overwrite: true,
            delay: 0.1 // Delay after scroll stops
        });
    } else { console.warn("[VideoController] No info blocks found to animate."); }
}

/** Resets the info section content animation state */
export function resetInfoAnimation() {
    if (typeof gsap === 'undefined') { return; } // Need GSAP check

    const infoBlocks = gsap.utils.toArray(`${config.selectors.infoSectionId} .info-block`);
    if (infoBlocks.length > 0) {
        //console.log("[VideoController] Resetting Info Section Animation");
        gsap.to(infoBlocks, {
            opacity: 0,
            y: 20, // Animate back to the offset position
            // Keep xPercent/yPercent for consistency if needed, though less critical when opacity is 0
            //xPercent: isVideoIndex ? -50 : 0,
            //yPercent: isVideoIndex ? -50 : 0,
            duration: 2, // Shorter duration for fade out (adjust as needed)
            ease: "power1.in",
            overwrite: true, // Stop any incoming animation if user scrolls back quickly
        });
    }
}

/** Helper function to apply volume */
async function applyGlobalVolume() {
     for (const video of controlledVideos) {
         const soundButton = document.getElementById(`soundButton-${video.id}`);
         try {
             const player = await video.initializePlayer(); await player.setVolume(globalVolumeLevel);
             if (soundButton) soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';
         } catch (error) { if (soundButton) soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off'; }
    }
}

/** Adjusts global volume */
export async function adjustGlobalVolume(delta) {
    let newVolume = globalVolumeLevel + delta; newVolume = Math.max(0, Math.min(1, newVolume));
    if (newVolume.toFixed(2) === globalVolumeLevel.toFixed(2)) return;
    globalVolumeLevel = newVolume; await applyGlobalVolume();
}

/** Toggles global volume */
export async function toggleGlobalVolume() {
    const newVolume = (globalVolumeLevel > 0) ? 0.0 : DEFAULT_UNMUTE_LEVEL;
    globalVolumeLevel = newVolume; await applyGlobalVolume();
}