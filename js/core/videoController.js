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

                // --- Force Set Initial GSAP State ---
                // Explicitly set X and Y pixel offsets and percentages to known start points
                // This ensures GSAP starts from a clean slate relative to the CSS positioning
                gsap.set(contentElement, {
                    x: 0,
                    y: initialYOffset,
                    xPercent: isVideoIndex ? -50 : 0, 
                    yPercent: isVideoIndex ? -50 : 0, 
                    opacity: 0,
                });
                // --- END Force Set ---

                // --- Animate IN: Animate ONLY opacity, transform (y), and max-height ---
                gsap.to(contentElement, {
                    opacity: 1,
                    y: 0,
                    duration: 0.6, // Adjust duration
                    delay: 0.1, // Adjust delay
                    ease: "power1.out",
                    overwrite: true,
                    stagger: isInfoBlocks ? 0.1 : 0
                });
                // --- END GSAP TO ---
            }
            // --------------------------

            // --- Handle Video Playback (Only if it IS a video) ---
            if (isVideoIndex && video) {
                try {
                    const player = await video.initializePlayer();
                    const playPauseButton = document.getElementById(`playPauseButton-${video.id}`); // Find button
                    const soundButton = document.getElementById(`soundButton-${video.id}`);
                    const playWrapper = playPauseButton?.querySelector('.icon-play-wrapper'); // Find icons
                    const pauseWrapper = playPauseButton?.querySelector('.icon-pause-wrapper');
                    const volumeOnWrapper = soundButton?.querySelector('.icon-volume-on-wrapper');
                    const volumeOffWrapper = soundButton?.querySelector('.icon-volume-off-wrapper');

                    if (video.justFinishedLoopLimit) { // Use correct loop flag
                         console.log(`%c[VideoController ${video.id}] Activate Play SKIPPED: Loop limit. Ensuring pause.`, "color: orange;");
                         try { await player.pause(); } catch(e){ /* handle */ }
                         video.justFinishedLoopLimit = false;
                         if(playPauseButton && playWrapper && pauseWrapper) {
                            playWrapper.classList.remove('is-hidden');
                            pauseWrapper.classList.add('is-hidden');
                            playPauseButton.setAttribute('aria-label', 'Play');
                        }
                        await player.setVolume(globalVolumeLevel);
                         if (soundButton && volumeOnWrapper && volumeOffWrapper) {
                            const isMuted = globalVolumeLevel === 0;
                            volumeOffWrapper.classList.toggle('is-hidden', !isMuted);
                            volumeOnWrapper.classList.toggle('is-hidden', isMuted);
                            soundButton.setAttribute('aria-label', isMuted ? 'Unmute' : 'Mute');
                        }
                    } else {
                        // console.log(`[VideoController ${video.id}] Activating Video ${index}...`);
                        // ... (Activate normally: set volume, play) ...
                        await player.setVolume(globalVolumeLevel);
                        await player.play();
                         // --- Update Icons for Playing State ---
                        if(playPauseButton && playWrapper && pauseWrapper) {
                            playWrapper.classList.add('is-hidden');
                            pauseWrapper.classList.remove('is-hidden');
                            playPauseButton.setAttribute('aria-label', 'Pause');
                        }
                        if (soundButton && volumeOnWrapper && volumeOffWrapper) {
                            const isMuted = globalVolumeLevel === 0;
                            volumeOffWrapper.classList.toggle('is-hidden', !isMuted);
                            volumeOnWrapper.classList.toggle('is-hidden', isMuted);
                            soundButton.setAttribute('aria-label', isMuted ? 'Unmute' : 'Mute');
                        }
                    }
                } catch (error) {
                    console.warn(`[VideoController ${video?.id || index}] Error activating video: ${error.message}`);
                     // Reset buttons on error
                    const playPauseButton = document.getElementById(`playPauseButton-${video?.id}`);
                    const soundButton = document.getElementById(`soundButton-${video?.id}`);
                    const playWrapper = playPauseButton?.querySelector('.icon-play-wrapper');
                    const pauseWrapper = playPauseButton?.querySelector('.icon-pause-wrapper');
                    const volumeOnWrapper = soundButton?.querySelector('.icon-volume-on-wrapper');
                    const volumeOffWrapper = soundButton?.querySelector('.icon-volume-off-wrapper');

                    if(playPauseButton && playWrapper && pauseWrapper){ 
                        playWrapper.classList.remove('is-hidden'); pauseWrapper.classList.add('is-hidden'); playPauseButton.setAttribute('aria-label', 'Play'); 
                    }
                    if (soundButton && volumeOnWrapper && volumeOffWrapper){ 
                        const isMuted = globalVolumeLevel === 0; volumeOffWrapper.classList.toggle('is-hidden', !isMuted); 
                        volumeOnWrapper.classList.toggle('is-hidden', isMuted); soundButton.setAttribute('aria-label', isMuted ? 'Unmute' : 'Mute');
                    } 
                }
            } else if (!isVideoIndex) { // If INFO section
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
                    y: initialYOffset, 
                    x: 0,
                    duration: 0.7, 
                    ease: "power1.in", 
                    overwrite: true,
                });
            }

            // --- Pause Inactive Videos ---
            if (isVideoIndex && video) {
                const playPauseButton = document.getElementById(`playPauseButton-${video.id}`);
                const soundButton = document.getElementById(`soundButton-${video.id}`);
                const playWrapper = playPauseButton?.querySelector('.icon-play-wrapper');
                const pauseWrapper = playPauseButton?.querySelector('.icon-pause-wrapper');
                const volumeOnWrapper = soundButton?.querySelector('.icon-volume-on-wrapper');
                const volumeOffWrapper = soundButton?.querySelector('.icon-volume-off-wrapper');

               // --- Update Icons for Paused State ---
                if (soundButton && volumeOnWrapper && volumeOffWrapper) { const isMuted = globalVolumeLevel === 0; volumeOffWrapper.classList.toggle('is-hidden', !isMuted); volumeOnWrapper.classList.toggle('is-hidden', isMuted); soundButton.setAttribute('aria-label', isMuted ? 'Unmute' : 'Mute');
                if (video.player) { try { video.player.pause().catch(e => {}); } catch (e) {} }
                    if(playPauseButton && playWrapper && pauseWrapper){ playWrapper.classList.remove('is-hidden'); pauseWrapper.classList.add('is-hidden'); playPauseButton.setAttribute('aria-label', 'Play'); }
                }
            }
        }
    }
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
    if (typeof gsap === 'undefined') { return; }

    const infoBlocks = gsap.utils.toArray(`${config.selectors.infoSectionId} .info-block`);
    if (infoBlocks.length > 0) {
        //console.log("[VideoController] Resetting Info Section Animation");
        gsap.to(infoBlocks, {
            opacity: 0,
            y: 20, // Animate back to the offset position
            // Keep xPercent/yPercent for consistency if needed, though less critical when opacity is 0
            //xPercent: isVideoIndex ? -50 : 0,
            //yPercent: isVideoIndex ? -50 : 0,
            duration: 2,
            ease: "power1.in",
            overwrite: true, 
        });
    }
}

/** Helper function to apply volume */
async function applyGlobalVolume() {
     for (const video of controlledVideos) {
        const soundButton = document.getElementById(`soundButton-${video.id}`);
        let volumeOnWrapper = null;
        let volumeOffWrapper = null;

        if (soundButton) {
            volumeOnWrapper = soundButton.querySelector('.icon-volume-on-wrapper');
            volumeOffWrapper = soundButton.querySelector('.icon-volume-off-wrapper');
        }

         try {
            const player = await video.initializePlayer(); await player.setVolume(globalVolumeLevel);
            if (soundButton && volumeOnWrapper && volumeOffWrapper) { // Check elements exist
                const isMuted = globalVolumeLevel === 0;
                volumeOffWrapper.classList.toggle('is-hidden', !isMuted); // Show if muted
                volumeOnWrapper.classList.toggle('is-hidden', isMuted);  // Hide if muted
                soundButton.setAttribute('aria-label', isMuted ? 'Unmute' : 'Mute'); // Update label
            }
         } catch (error) {
            console.warn(`[ApplyVol ${video.id}] Error: ${error.message}`);
            // Update icons based on INTENDED state even if API fails
            if (soundButton && volumeOnWrapper && volumeOffWrapper) {
                const isMuted = globalVolumeLevel === 0;
                volumeOffWrapper.classList.toggle('is-hidden', !isMuted);
                volumeOnWrapper.classList.toggle('is-hidden', isMuted);
                soundButton.setAttribute('aria-label', isMuted ? 'Unmute' : 'Mute');
            }
        }
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