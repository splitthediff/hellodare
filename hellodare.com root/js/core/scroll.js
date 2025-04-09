// js/core/scroll.js (Main Module - REORGANIZED, NO CONFIG)

// --- Imports ---
// Assuming utils, videoController, inputManager are in correct relative paths
import { throttle, detectTouchDevice } from '../utils/utils.js';
import * as VideoController from './videoController.js';
import * as InputManager from '../modules/inputManager.js';

// --- Module State ---
let currentIndex = 0;
let scrollItems = [];
let videoTrack = null;
let isAnimating = false;
let animationDuration = 1.0; // Default

// ==================================================
// CORE SCROLL & ANIMATION LOGIC
// ==================================================
function updateActiveClass() {
     if (!scrollItems || scrollItems.length === 0) return;
     scrollItems.forEach((item, i) => {
        item?.classList.toggle('active-scroll-item', i === currentIndex); // Use hardcoded class
    });
}

export function goToIndex(index, immediate = false) {
    if (!videoTrack || !scrollItems || scrollItems.length === 0) return;
    if (index < 0 || index >= scrollItems.length) return;
    if (isAnimating && !immediate) return;
    const previousIndex = currentIndex;
    if (index === previousIndex && !immediate) return;

    isAnimating = !immediate;
    currentIndex = index;
    console.log(`goToIndex: Updated currentIndex to ${currentIndex}.`);
    updateActiveClass();

    VideoController.controlVideoPlayback(currentIndex).catch(err => {
        console.error("[goToIndex Direct Call] Error controlling video playback:", err);
    });

    const targetYPercent = -currentIndex * 100;

    if (immediate) {
        gsap.set(videoTrack, { yPercent: targetYPercent });
    } else {
        gsap.to(videoTrack, {
            yPercent: targetYPercent,
            duration: animationDuration, // Uses variable set in init
            ease: "back.out(.5)",      // Hardcoded ease
            overwrite: "auto",
            onComplete: () => { isAnimating = false; },
            onInterrupt: () => { isAnimating = false; }
        });
    }
}

// ==================================================
// INITIALIZATION FUNCTION (EXPORTED)
// ==================================================
export function initializeGsapScroll(videos) {
    VideoController.setVideos(videos);

    // Find DOM Elements (Hardcoded selectors)
    videoTrack = document.querySelector(".js-video-track");
    if (!videoTrack) { console.error("Scroll Init Failed: '.js-video-track' not found."); return; }
    scrollItems = gsap.utils.toArray(videoTrack.children).filter(el => el.classList.contains('scroll-item')); // Hardcoded class
    if (scrollItems.length === 0) { console.error("Scroll Init Failed: No '.scroll-item' children found."); return; }
    console.log(`Scroll Initializing with ${videos.length} videos and ${scrollItems.length} total items.`);

    // Determine Config (Hardcoded values)
    const isTouchDevice = detectTouchDevice();
    const DESKTOP_ANIMATION_DURATION = 1.0;
    const MOBILE_ANIMATION_DURATION = 0.7;
    const DESKTOP_THROTTLE_INTERVAL = 200;
    const MOBILE_THROTTLE_INTERVAL = 200;
    animationDuration = isTouchDevice ? MOBILE_ANIMATION_DURATION : DESKTOP_ANIMATION_DURATION;
    const throttleInterval = isTouchDevice ? MOBILE_THROTTLE_INTERVAL : DESKTOP_THROTTLE_INTERVAL;
    const resizeDebounce = 250; // Hardcoded
    const touchSensitivityY = 30; // Hardcoded
    const touchSensitivityX = 100; // Hardcoded

    // Define Input -> Scroll Logic
    const processScrollInput = (delta) => {
        let newIndex = currentIndex;
        if (delta > 0 && currentIndex < scrollItems.length - 1) { newIndex++; }
        else if (delta < 0 && currentIndex > 0) { newIndex--; }
        else { return; }
        if (newIndex !== currentIndex) { goToIndex(newIndex); }
    };
    const throttledScrollProcessor = throttle(processScrollInput, throttleInterval);

    // Define Callbacks for Input Manager
    const resizeCallback = () => goToIndex(currentIndex, true);
    const getActiveVideoFn = () => (currentIndex < videos.length) ? videos[currentIndex] : null;
    // Define togglePlayPauseFn wrapper here or ensure Video class method is robust
    const togglePlayPauseFn = (video, button) => {
        if (video && typeof video.togglePlayPause === 'function') {
            video.togglePlayPause(button).catch(e => console.error("Error in toggle callback:", e));
        }
    };


    // Initialize Input Manager - Pass hardcoded values for now
    InputManager.initializeInput(
        throttledScrollProcessor,
        resizeCallback,
        VideoController.adjustGlobalVolume,
        getActiveVideoFn,
        togglePlayPauseFn
        // NOTE: Not passing debounce/sensitivity here as inputManager uses defaults
    );

    // Reset State & Set Initial Position
    currentIndex = 0; isAnimating = false; goToIndex(0, true);

    console.log("GSAP Scroll Initialization complete.");
}

// --- Re-exports ---
export const toggleGlobalVolume = VideoController.toggleGlobalVolume;