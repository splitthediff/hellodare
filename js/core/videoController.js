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

/** Get the element to animate based on item type. */

function _getContentElement(scrollItemElement, isVideoIndex) {
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
function _getAnimationParameters(isVideoIndex) {
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
            x: 0,
            y: initialYOffset,
            scale: setScale,
            filter: setBlur,
            opacity: setOpacity,
            xPercent: key === 'video' && isVideoIndex ? -50 : 0,
            yPercent: key === 'video' && isVideoIndex ? -50 : 0
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
        x: 0,
        duration: 0.7,
        ease: "power1.in",
        overwrite: true,
    });
}

/** Activate video playback and update icons. */
async function _activateVideoPlayback(video) {
    if (!video) return;
    try {
        const player = await video.initializePlayer();
        const playPauseButton = document.getElementById(`playPauseButton-${video.id}`);
        const soundButton = document.getElementById(`soundButton-${video.id}`);
        const playWrapper = playPauseButton?.querySelector('.icon-play-wrapper');
        const pauseWrapper = playPauseButton?.querySelector('.icon-pause-wrapper');
        const volumeOnWrapper = soundButton?.querySelector('.icon-volume-on-wrapper');
        const volumeOffWrapper = soundButton?.querySelector('.icon-volume-off-wrapper');

        if (video.hasPlayedOnce) { // Check flag (from timeupdate end simulation)
            console.log(`%c[VideoController ${video.id}] Activate SKIPPED (hasPlayedOnce). Ensuring pause.`, "color: blue;");
            if(playPauseButton && playWrapper && pauseWrapper) { playWrapper.classList.remove('is-hidden'); pauseWrapper.classList.add('is-hidden'); playPauseButton.setAttribute('aria-label', 'Play'); }
            if (soundButton && volumeOnWrapper && volumeOffWrapper) { const isMuted = globalVolumeLevel === 0; volumeOffWrapper.classList.toggle('is-hidden', !isMuted); volumeOnWrapper.classList.toggle('is-hidden', isMuted); soundButton.setAttribute('aria-label', isMuted ? 'Unmute' : 'Mute'); }
             await player.pause().catch(e => {/* ignore non-critical errors */}); // Ensure paused
             await player.setVolume(globalVolumeLevel); // Still set volume

        } else { // Activate normally
            // console.log(`[VideoController ${video.id}] Activating Video ${video.id}.`);
            await player.setVolume(globalVolumeLevel);
            if (soundButton && volumeOnWrapper && volumeOffWrapper) { const isMuted = globalVolumeLevel === 0; volumeOffWrapper.classList.toggle('is-hidden', !isMuted); volumeOnWrapper.classList.toggle('is-hidden', isMuted); soundButton.setAttribute('aria-label', isMuted ? 'Unmute' : 'Mute'); }
            await player.play();
            if(playPauseButton && playWrapper && pauseWrapper) { playWrapper.classList.add('is-hidden'); pauseWrapper.classList.remove('is-hidden'); playPauseButton.setAttribute('aria-label', 'Pause'); }
        }
    } catch (error) {
        console.warn(`[VideoController ${video?.id}] Error activating video: ${error.message}`);
        const playPauseButton = document.getElementById(`playPauseButton-${video?.id}`); // Find button
        const soundButton = document.getElementById(`soundButton-${video?.id}`);
        const playWrapper = playPauseButton?.querySelector('.icon-play-wrapper');
        const pauseWrapper = playPauseButton?.querySelector('.icon-pause-wrapper');
        const volumeOnWrapper = soundButton?.querySelector('.icon-volume-on-wrapper');
        const volumeOffWrapper = soundButton?.querySelector('.icon-volume-off-wrapper');
        if(playPauseButton && playWrapper && pauseWrapper){ playWrapper.classList.remove('is-hidden'); pauseWrapper.classList.add('is-hidden'); playPauseButton.setAttribute('aria-label', 'Play'); }
        if (soundButton && volumeOnWrapper && volumeOffWrapper){ const isMuted = globalVolumeLevel === 0; volumeOffWrapper.classList.toggle('is-hidden', !isMuted); volumeOnWrapper.classList.toggle('is-hidden', isMuted); soundButton.setAttribute('aria-label', isMuted ? 'Unmute' : 'Mute');}
    }
}

/** Deactivate video playback and update icons. */
function _deactivateVideoPlayback(video) {
    if (!video || !video.player) return; // Only pause if player instance exists

    // console.log(`[VideoController ${video.id}] Deactivating Video.`);
    try {
        video.player.pause().catch(e => {/* ignore non-critical errors */}); // Non-awaited pause

        const playPauseButton = document.getElementById(`playPauseButton-${video.id}`);
        const soundButton = document.getElementById(`soundButton-${video.id}`);
        const playWrapper = playPauseButton?.querySelector('.icon-play-wrapper');
        const pauseWrapper = playPauseButton?.querySelector('.icon-pause-wrapper');
        const volumeOnWrapper = soundButton?.querySelector('.icon-volume-on-wrapper');
        const volumeOffWrapper = soundButton?.querySelector('.icon-volume-off-wrapper');
         // Update Icons for Paused State
        if (soundButton && volumeOnWrapper && volumeOffWrapper) { const isMuted = globalVolumeLevel === 0; volumeOffWrapper.classList.toggle('is-hidden', !isMuted); volumeOnWrapper.classList.toggle('is-hidden', isMuted); soundButton.setAttribute('aria-label', isMuted ? 'Unmute' : 'Mute'); }
        if(playPauseButton && playWrapper && pauseWrapper){ playWrapper.classList.remove('is-hidden'); pauseWrapper.classList.add('is-hidden'); playPauseButton.setAttribute('aria-label', 'Play'); }

    } catch (e) { console.warn(`[VideoController ${video.id}] Error during deactivation: ${e.message}`); }

}