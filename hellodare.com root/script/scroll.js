function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        //console.log(`--- Throttle check. In throttle: ${!!inThrottle}, Limit: ${limit}ms`); // LOG T1
        if (!inThrottle) {
            //console.log("--- Throttle executing func ---"); // LOG T2
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => {
                 //console.log("--- Throttle released ---"); // LOG T3
                 inThrottle = false;
            }, limit);
        } else {
            //console.log("--- Throttle blocked func (still within timeout) ---"); // LOG T4
        }
    }
}

// --- State Variables ---
let currentIndex = 0;
let videoItems = [];
let videoTrack = null;
let isAnimating = false;

// --- Configuration Variables ---
let animationDuration;
let throttleInterval;

// --- Video Control Variables ---
let controlledVideos = [];

// --- Global Volume State ---
let globalVolumeLevel = 0.0; // Start muted
const DEFAULT_UNMUTE_LEVEL = 0.6; // Volume when unmuting (0.0 to 1.0)

/**
 * Animates or sets the video track to a specific index AND controls video playback.
 * @param {number} index - The target index.
 * @param {boolean} [immediate=false] - If true, set position instantly without animation.
 */
function goToIndex(index, immediate = false) {
    // console.log(`>>> goToIndex called: index=${index}, immediate=${immediate}, currentIdx=${currentIndex}, isAnimating=${isAnimating}`);

    // --- Boundary Checks ---
    if (!videoTrack || !controlledVideos || controlledVideos.length === 0) {
         console.error("goToIndex aborted: videoTrack or controlledVideos missing.");
         return;
    }
    if (index < 0 || index >= controlledVideos.length) {
         console.warn(`goToIndex aborted: Index ${index} out of bounds (0-${controlledVideos.length - 1}).`);
         return;
    }

    // --- Prevent Stacking Animations (if not immediate) ---
    if (isAnimating && !immediate) {
        console.log(`goToIndex aborted: Animation already in progress.`);
        return;
    }

    // --- Store previous index BEFORE updating currentIndex ---
    const previousIndex = currentIndex; // Get the index we are scrolling FROM

    // --- Prevent redundant calls if index hasn't changed ---
    // Allow if immediate=true for repositioning purposes (like resize)
    if (index === previousIndex && !immediate) {
        // console.log(`goToIndex aborted: Already at index ${index}.`); // Optional log
        return;
    }


    isAnimating = true; // Set flag BEFORE animation/set starts

    // --- CRITICAL: Update currentIndex ---
    currentIndex = index; // Set the NEW current index
    console.log(`goToIndex: Updated currentIndex to ${currentIndex}. Previous was ${previousIndex}`);

    const targetYPercent = -currentIndex * 100;
    // console.log(`goToIndex: Calculated targetYPercent: ${targetYPercent}% for index ${currentIndex}`);

    // --- Perform Scroll Action ---
    if (immediate) {
        // --- IMMEDIATE SCROLL ---
        // console.log(`goToIndex: Setting immediate position for index ${currentIndex}...`);
        gsap.set(videoTrack, { yPercent: targetYPercent });
        isAnimating = false; // Reset flag immediately after set
        updateActiveClass(); // Update the CSS class immediately
        // *** ADD THIS CALL ***
        controlVideoPlayback(currentIndex, previousIndex); // Play current, pause previous
        // ********************
        // console.log(`Immediate position set for index ${currentIndex}. isAnimating=${isAnimating}`); // Optional log
    } else {
        // --- ANIMATED SCROLL ---
        // console.log(`goToIndex: Starting GSAP animation to index ${currentIndex} (Duration: ${animationDuration}s)...`);
        gsap.to(videoTrack, {
            yPercent: targetYPercent,
            duration: animationDuration,
            //ease: "elastic.out(.25, .5)",
            ease: "back.out(.5)",
            overwrite: "auto",
            onComplete: () => {
                isAnimating = false; // Reset flag when animation finishes
                updateActiveClass(); // Update the CSS class on complete
                // *** ADD THIS CALL ***
                controlVideoPlayback(currentIndex, previousIndex); // Play current, pause previous
                // ********************
                // console.log(`Animation complete. Target index: ${currentIndex}. isAnimating=${isAnimating}`); // Optional log
            },
            onInterrupt: () => {
                 console.warn(`Animation interrupted targeting index ${currentIndex}. isAnimating is still ${isAnimating}.`);
                 // Optional: Decide if pausing others is needed on interrupt
                 isAnimating = false; // Consider resetting flag on interrupt too
            }
        });
    }
}

/**
 * Updates the 'active-video' class on video items based on currentIndex.
 */
function updateActiveClass() {
     if (!videoItems || videoItems.length === 0) return;
     videoItems.forEach((item, i) => {
        item?.classList.toggle('active-video', i === currentIndex);
    });
}

// --- Throttled Handler (defined AFTER throttleInterval is set) ---
let handleThrottledScroll = null;

function detectTouchDevice() {
    let hasTouch = false;
    // Check modern navigator property first
    if ('maxTouchPoints' in navigator) {
        hasTouch = navigator.maxTouchPoints > 0;
    }
    // Fallback for older browsers/devices
    else if ('ontouchstart' in window) {
        hasTouch = true;
    }
    // Basic check for older IE
    else if ('msMaxTouchPoints' in navigator) {
        hasTouch = navigator.msMaxTouchPoints > 0;
    }
    // Could add more checks (e.g., matchMedia pointer:coarse) if needed
    return hasTouch;
}

export function initializeGsapScroll(videos) {
    controlledVideos = videos;
    console.log("GSAP Scroll Initialized with knowledge of", controlledVideos.length, "videos.");

    globalVolumeLevel = 0.0; // Reset global volume

    const isTouchDevice = detectTouchDevice();

    // --- Conditional Timings ---
    const DESKTOP_ANIMATION_DURATION = 1.2;
    const MOBILE_ANIMATION_DURATION = 0.8;
    const DESKTOP_THROTTLE_INTERVAL = DESKTOP_ANIMATION_DURATION * 1000 + 100;
    const MOBILE_THROTTLE_INTERVAL = 200;
    animationDuration = isTouchDevice ? MOBILE_ANIMATION_DURATION : DESKTOP_ANIMATION_DURATION;
    throttleInterval = isTouchDevice ? MOBILE_THROTTLE_INTERVAL : DESKTOP_THROTTLE_INTERVAL;

    // --- Define Throttled Scroll Handler ---
    // (Ensure handleThrottledScroll is declared at module scope: let handleThrottledScroll = null;)
    handleThrottledScroll = throttle((delta) => {
        if (isAnimating) return;
        let newIndex = currentIndex;
        const sensitivity = 0;
        if (delta > sensitivity && currentIndex < videoItems.length - 1) newIndex++;
        else if (delta < -sensitivity && currentIndex > 0) newIndex--;
        else return;
        goToIndex(newIndex);
    }, throttleInterval);

    // --- Find DOM Elements ---
    videoTrack = document.querySelector(".js-video-track");
    if (!videoTrack) { /* ... error handling ... */ return; }
    videoItems = gsap.utils.toArray(videoTrack.children).filter(el => el.classList.contains('video-item'));
    if (videoItems.length === 0) { /* ... error handling ... */ return; }

    // --- Reset State ---
    currentIndex = 0;
    isAnimating = false;

    // === DEFINE ALL EVENT HANDLERS ===

    // Define Keyboard Handler
    const handleKeyDown = (event) => {
        const targetTagName = event.target.tagName;
        if (targetTagName === 'INPUT' || targetTagName === 'TEXTAREA' || event.target.isContentEditable) {
            return; // Ignore input focus
        }
        if (!controlledVideos || controlledVideos.length === 0 || currentIndex < 0 || currentIndex >= controlledVideos.length) return;
        const activeVideo = controlledVideos[currentIndex];
        if (!activeVideo || !activeVideo.player) {
            console.warn(`Keydown: Player not ready for active video ${activeVideo?.id}`);
            return;
        }

        switch (event.key) {
            case ' ': case 'Spacebar':
                event.preventDefault();
                const playPauseButton = document.getElementById(`playPauseButton-${activeVideo.id}`);
                if (playPauseButton) activeVideo.togglePlayPause(playPauseButton);
                else console.warn("Spacebar: Could not find play/pause button");
                break;
            case 'AudioVolumeUp': case 'ArrowUp':
                event.preventDefault();
                console.log("Volume Up key pressed");
                adjustGlobalVolume(0.1);
                break;
            case 'AudioVolumeDown': case 'ArrowDown':
                event.preventDefault();
                console.log("Volume Down key pressed");
                adjustGlobalVolume(-0.1);
                break;
        }
    };

    // Define Wheel Handler
    const handleWheel = (event) => {
        event.preventDefault();
        handleThrottledScroll(event.deltaY);
    };

    // Define Touch Handlers
    let touchStartY = null, touchStartX = null;
    const minSwipeDistanceY = 2, maxSwipeDistanceX = 2000;
    const handleTouchStart = (event) => {
        if (event.touches.length === 1) {
            touchStartY = event.touches[0].clientY;
            touchStartX = event.touches[0].clientX;
        } else {
            touchStartY = null; touchStartX = null;
        }
    };
    const handleTouchMove = (event) => {
        if (touchStartY !== null) event.preventDefault();
    };
    const handleTouchEnd = (event) => {
        if (touchStartY === null) return; // Exit if touch didn't start properly
        const touchEndY = event.changedTouches[0].clientY;
        const touchEndX = event.changedTouches[0].clientX;
        const deltaY = touchStartY - touchEndY;
        const deltaX = touchStartX - touchEndX;
        if (Math.abs(deltaY) > minSwipeDistanceY && Math.abs(deltaX) < maxSwipeDistanceX) {
            handleThrottledScroll(deltaY);
        }
        touchStartY = null; touchStartX = null; // Reset
    };

    // Define Resize Handler
    let resizeTimeout = null;
    const handleResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            console.log("Resize handler: Repositioning video track immediately.");
            if (typeof goToIndex === 'function' && typeof currentIndex !== 'undefined') {
                goToIndex(currentIndex, true);
            } else {
                 console.warn("goToIndex or currentIndex not available for resize repositioning.");
            }
        }, 250);
    };

    // === END OF HANDLER DEFINITIONS ===


    // === Set Initial Position ===
    goToIndex(0, true);


    // === ATTACH Event Listeners ===
    // Remove potential old listeners first for safety
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('wheel', handleWheel);
    window.removeEventListener('touchstart', handleTouchStart);
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);
    window.removeEventListener('resize', handleResize);

    // Add the listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('resize', handleResize);


    // === Final Logs ===
    console.log("GSAP Scroll Initialization complete. Listeners active.");

} // === END of initializeGsapScroll ===

/**
 * Sets the volume for the current video based on global state,
 * pauses the previous video, and attempts to play the current video.
 * @param {number} currentIdx - The index of the video to activate.
 * @param {number} previousIdx - The index of the video to deactivate.
 */
function controlVideoPlayback(currentIdx, previousIdx) {
    if (!controlledVideos || controlledVideos.length === 0) return;

    console.log(`--- Controlling Playback & Volume: Play/SetVol=${currentIdx}, Pause=${previousIdx}, GlobalVol=${globalVolumeLevel.toFixed(2)} ---`);

    controlledVideos.forEach((video, index) => {
        const playPauseButton = document.getElementById(`playPauseButton-${video.id}`);
        const soundButton = document.getElementById(`soundButton-${video.id}`); // Get sound button too

        // --- Action for the CURRENT video ---
        if (index === currentIdx) {
            if (!video.player) {
                console.warn(`Video ${index}: Player not ready.`);
                if (playPauseButton) playPauseButton.innerText = 'Play';
                if (soundButton) soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off'; // Reflect global state even if player not ready
                return; // Skip
            }

            // 1. Set Volume to Global Level
            video.player.setVolume(globalVolumeLevel).then(() => {
                // console.log(`Video ${index}: Volume set to global ${globalVolumeLevel.toFixed(2)}`);
                if (soundButton) { // Update button after volume set
                    soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';
                }
                // 2. Attempt to Play
                return video.player.play();
            }).then(() => {
                console.log(`Video ${index}: Play command successful.`);
                if (playPauseButton) playPauseButton.innerText = 'Pause';
            }).catch(error => {
                // Catch errors from setVolume OR play
                console.warn(`Video ${index}: SetVolume/Play command failed/rejected. Error: ${error.name}`);
                if (error.name !== 'AbortError') { // Avoid log spam if play interrupted quickly
                    if (playPauseButton) playPauseButton.innerText = 'Play';
                }
                // Ensure sound button still reflects global state on error
                if (soundButton) {
                    soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';
                }
            });
        }
        // --- Action for all OTHER videos ---
        else {
            // Ensure button text reflects global state even if paused
            if (soundButton) {
                 soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';
            }
            if (!video.player) {
                 if (playPauseButton) playPauseButton.innerText = 'Play'; // Ensure inactive videos show 'Play'
                 return; // Skip
            }
            // Pause non-active videos
            video.player.pause().then(() => {
                 if (playPauseButton) playPauseButton.innerText = 'Play';
            }).catch(error => {
                console.warn(`Video ${index}: Pause command failed (non-current). Error: ${error.name}`);
                if (playPauseButton) playPauseButton.innerText = 'Play';
            });
        }
    });
}

/**
 * Adjusts the global volume level and applies it to all players.
 * Updates the active video's sound button text.
 * @param {number} delta - Amount to change volume by (e.g., 0.1 or -0.1)
 */
function adjustGlobalVolume(delta) {
    let newVolume = globalVolumeLevel + delta;
    newVolume = Math.max(0, Math.min(1, newVolume)); // Clamp [0, 1]

    if (newVolume === globalVolumeLevel) return; // No change needed

    console.log(`Adjusting global volume: ${globalVolumeLevel.toFixed(2)} -> ${newVolume.toFixed(2)}`);
    globalVolumeLevel = newVolume; // Update global state

    // Apply to all players
    controlledVideos.forEach(video => {
        if (video.player) {
            video.player.setVolume(globalVolumeLevel).catch(error => {
                 console.warn(`Failed to set global volume for ${video.id}: ${error.name}`);
            });
        }
         // Also update ALL sound buttons immediately to reflect global state
         const soundButton = document.getElementById(`soundButton-${video.id}`);
         if(soundButton) {
            soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';
         }
    });
}

/**
 * Toggles the global volume between muted (0) and a default level.
 * Applies the change to all players and updates buttons.
 * This function is EXPORTED for the button click handler.
 */
export function toggleGlobalVolume() {
    const newVolume = (globalVolumeLevel > 0) ? 0.0 : DEFAULT_UNMUTE_LEVEL;
    console.log(`Toggling global volume -> ${newVolume.toFixed(2)}`);
    globalVolumeLevel = newVolume; // Update global state

    // Apply to all players and update all buttons
    controlledVideos.forEach(video => {
        if (video.player) {
            video.player.setVolume(globalVolumeLevel).catch(error => {
                 console.warn(`Failed to set global volume toggle for ${video.id}: ${error.name}`);
            });
        }
        const soundButton = document.getElementById(`soundButton-${video.id}`);
        if (soundButton) {
            soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';
        }
    });
}

