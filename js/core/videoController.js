// js/core/videoController.js - Manages video playback and volume

import { config } from '../config.js';
import { positionSingleInfoOverlay } from './playlistManager.js';
import * as InputManager from '../modules/inputManager.js';
import { logMissingElements } from '../utils/utils.js'
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
    const scrollItems = document.querySelectorAll(config.selectors.scrollItem); 

    if (!scrollItems || scrollItems.length === 0) {
        console.error("[VideoController] Cannot control playback/fade: scrollItems not found.");
        return;
    }

    // --- Handle Info Section ---
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
        const contentElement = _getContentElement(scrollItemElement, isVideoIndex, infoSectionIndex);
        const animationParameters = _getAnimationParameters(isVideoIndex);

        // --- Action for the CURRENT item being scrolled TO ---
        if (index === currentIdx) {
            if (contentElement && animationParameters) {
                _activateItemAnimation(contentElement, isVideoIndex, animationParameters, video);
            }

            if (isVideoIndex && video) {
                _activateVideoPlayback(video);
            } else if (!isVideoIndex) { // If INFO section
                console.log(`[VideoController] Info Section Activated (Index ${index}). Content faded in.`);
            }
        }
        else {
            // --- Reset Content Out ---
            if (contentElement) {
                _deactivateItemAnimation(contentElement, isVideoIndex, animationParameters);
            }

            // --- Pause Inactive Videos ---
            if (isVideoIndex && video) {
                _deactivateVideoPlayback(video); 
            }
        }
    }
}

// ==================================================
// ANIMATION HELPERS (Internal to this module)
// ==================================================

/** Animates the info section content into view */
export function animateInfoIn() {
    console.log("[VideoController] animateInfoIn called.");
    const infoBlocks = gsap.utils.toArray(`${config.selectors.infoSectionId} .info-block`);

    if (infoBlocks.length > 0) {
         console.log("[VideoController] Animating Info Section IN");
         gsap.to(infoBlocks, {
            opacity: 1,
            y: 0,
            filter: config.animation.blurReset,
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
         try {
            const player = await video.initializePlayer(); 
            await player.setVolume(globalVolumeLevel);
            video._updateSoundButtonUI(globalVolumeLevel === 0); // Update UI based on global volume
         } catch (error) {
            console.warn(`[ApplyVol ${video.id}] Error: ${error.message}`);
            video._updateSoundButtonUI(globalVolumeLevel === 0); // Update UI even if API fails
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

/** Get the element to animate based on item type. */

export function _getContentElement(scrollItemElement, isVideoIndex) {
    const contentElement = {};

    if (isVideoIndex) {
        const contentVideo = scrollItemElement.querySelector('.video-aspect-wrapper');
        const contentOverlay = scrollItemElement.querySelector('.video-info-overlay');

        if (contentVideo) contentElement.video = contentVideo;
        if (contentOverlay) contentElement.overlay = contentOverlay;
    } else if (scrollItemElement && scrollItemElement.id === 'info-section') {
        const infoContent = scrollItemElement.querySelector('.info-content');
        if (infoContent) contentElement.info = infoContent;
    }

    return contentElement;
}

/** Determine animation parameters based on mobile and nav state. */
export function _getAnimationParameters(isVideoIndex) {
    const initialYOffset = 20;
    let setScale = 1
    let setBlur = config.animation.blurMax;
    let resetBlur = config.animation.blurReset;
    let setOpacity = 0;
    let resetOpacity = 1;

    if (typeof InputManager.checkForMobile === 'function' && typeof InputManager.NavMenuOpen === 'function') {
        if (InputManager.checkForMobile() && InputManager.NavMenuOpen()){
            setBlur = resetBlur = config.animation.blurNavOpen;
            setOpacity = resetOpacity = 0.5; // no opacity change
        } else {
            setBlur = config.animation.blurMax;
            resetBlur = config.animation.blurReset;
            setOpacity = resetOpacity = 1; // no opacity change
        }
    }

    return { setBlur, resetBlur, setOpacity, resetOpacity, initialYOffset, setScale };
}

/** Animate content IN when item becomes current. */

/**
 * Applies initial GSAP set properties to a scroll item's content elements.
 * Used for setting the starting visual state (e.g., off-screen, blurred) for all items.
 * @param {HTMLElement} scrollItemElement The parent .scroll-item element.
 * @param {boolean} isVideoIndex True if the item is a video, false if it's the info section.
 * @param {object} [video=null] The Video instance, if isVideoIndex is true.
 */
export function setInitialVideoContentState(scrollItemElement, isVideoIndex, video = null) {
    const contentElement = _getContentElement(scrollItemElement, isVideoIndex);
    const animationParameters = _getAnimationParameters(isVideoIndex);

    if (!contentElement || !animationParameters) {
        console.warn(`[VideoController] setInitialVideoContentState: Missing content or animation params for ${scrollItemElement.id || scrollItemElement.className}.`);
        return;
    }

    const { setBlur, setOpacity, initialYOffset, setScale } = animationParameters;
    const entries = Object.entries(contentElement).filter(([_, el]) => !!el);

    if (entries.length === 0) return;

    gsap.set(entries.map(([_, el]) => el), {
        y: initialYOffset,
        scale: setScale,
        filter: setBlur,
        opacity: setOpacity,
        xPercent: isVideoIndex ? -50 : 0, // Only apply -50% for videos
        yPercent: isVideoIndex ? -50 : 0  // Only apply -50% for videos
    });

    // Also handle initial positioning for the info overlay specific to videos
    if (isVideoIndex && video && typeof positionSingleInfoOverlay === 'function') {
        positionSingleInfoOverlay(video.id); // This ensures the overlay is positioned even if content is hidden
    }
}

function _activateItemAnimation(contentElement, isVideoIndex, animationParameters, video) {
    logMissingElements(contentElement, '_activateItemAnimation');
    if (!contentElement) return;

    const { setBlur, resetBlur, setOpacity, resetOpacity, initialYOffset, setScale } = animationParameters;

    // Convert { key: element } to array of [key, element] pairs
    const entries = Object.entries(contentElement).filter(([_, el]) => !!el);

    if (entries.length === 0) return;

    // Step 1: Set initial styles per element
    entries.forEach(([key, el]) => {
        gsap.set(el, {
           // x: 0,
            y: initialYOffset,
            scale: setScale,
            filter: setBlur,
            opacity: setOpacity,
            xPercent: key === 'video' && isVideoIndex ? -50 : 0,
            yPercent: key === 'video' && isVideoIndex ? -50 : 0,
            transformOrigin: "center center"
        });
    });

    // Step 2: Animate in all elements
    gsap.to(entries.map(([_, el]) => el), {
        opacity: resetOpacity,
        scale: 1,
        filter: resetBlur,
        y: 0,
        duration: 0.6,
        delay: 0.1,
        ease: "power1.out",
        overwrite: true,
        stagger: entries.length > 1 ? 0.1 : 0,
        onComplete: () => {
            if (isVideoIndex && video && typeof positionSingleInfoOverlay === 'function') {
                positionSingleInfoOverlay(video.id);
            }
        }
    });
}

/** Reset/Animate content OUT when item is scrolled away. */
function _deactivateItemAnimation(contentElement, isVideoIndex, animationParameters) {
    logMissingElements(contentElement, '_deactivateItemAnimation');
    if (!contentElement) return;
    const { setBlur, resetBlur, setOpacity, resetOpacity, initialYOffset, setScale } = animationParameters;

    // --- Reset OUT Animation ---
    const entries = Object.entries(contentElement).filter(([_, el]) => !!el);
    if (entries.length === 0) return;

    gsap.to(entries.map(([_, el]) => el), {
        opacity: setOpacity,
        filter: setBlur,
        scale: setScale,
        y: initialYOffset,
      //  x: 0,
        duration: 0.7,
        ease: "power1.in",
        overwrite: true,
        transformOrigin: "center center"
    });
}

/** Activate video playback and update icons. */
async function _activateVideoPlayback(video) {
    if (!video) return;
    try {
        const player = await video.initializePlayer();

        if (video.hasPlayedOnce) { // Check flag (from timeupdate end simulation)
            console.log(`%c[VideoController ${video.id}] Activate SKIPPED (hasPlayedOnce). Ensuring pause.`, "color: blue;");
            video._updatePlayPauseButtonUI(true); // Force paused state if hasPlayedOnce
            video._updateSoundButtonUI(globalVolumeLevel === 0); // Update UI based on global volume
             await player.pause().catch(e => {/* ignore non-critical errors */}); // Ensure paused
             await player.setVolume(globalVolumeLevel); // Still set volume

        } else { // Activate normally
            // console.log(`[VideoController ${video.id}] Activating Video ${video.id}.`);
            await player.setVolume(globalVolumeLevel);
            video._updateSoundButtonUI(globalVolumeLevel === 0); // Update UI based on global volume
            await player.play();
            video._updatePlayPauseButtonUI(false); // Force playing state
        }
    } catch (error) {
        console.warn(`[VideoController ${video?.id}] Error activating video: ${error.message}`);
        video._updatePlayPauseButtonUI(true); // Assume paused on error
        video._updateSoundButtonUI(globalVolumeLevel === 0); // Update UI on error    
    }
}

/** Deactivate video playback and update icons. */
function _deactivateVideoPlayback(video) {
    if (!video || !video.player) return; // Only pause if player instance exists
    // console.log(`[VideoController ${video.id}] Deactivating Video.`);
    try {
        video.player.pause().catch(e => {/* ignore non-critical errors */}); // Non-awaited pause
         // Update Icons for Paused State
        video._updateSoundButtonUI(globalVolumeLevel === 0); // Update UI based on global volume
        video._updatePlayPauseButtonUI(true); // Video is being deactivated, so set to paused state
    } catch (e) { console.warn(`[VideoController ${video.id}] Error during deactivation: ${e.message}`); }
}