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

/** Controls play/pause/volume for videos based on scroll index activation. */
export async function controlVideoPlayback(currentIdx, previousIdx, onScrollCompleteCallback = null) {
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
                        video.player.pause().catch(e => {/* ignore non-critical errors */});
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
}

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
            duration: 2,
            ease: "power1.out",
            stagger: {
                each: .3,
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
        // console.log("[VideoController] Resetting Info Section Animation");
        gsap.set(infoBlocks, {
            opacity: 0,
            y: 20 // Reset to initial translateY offset (must match CSS)
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