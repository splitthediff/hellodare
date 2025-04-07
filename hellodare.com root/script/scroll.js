// scroll.js (REVISED VERSION)

/**
 * Throttles a function to ensure it's called at most once within a specified limit.
 */
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => {
                 inThrottle = false;
            }, limit);
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
// This will hold the array of Video objects passed from playlist.js
let controlledVideos = [];

// --- Global Volume State ---
let globalVolumeLevel = 0.0; // Start muted
const DEFAULT_UNMUTE_LEVEL = 0.6; // Volume when unmuting (0.0 to 1.0)

/**
 * Animates or sets the video track to a specific index AND controls video playback.
 * NOTE: This function itself doesn't need to be async, but it calls the async controlVideoPlayback.
 * @param {number} index - The target index.
 * @param {boolean} [immediate=false] - If true, set position instantly without animation.
 */
function goToIndex(index, immediate = false) {
    // Boundary checks
    if (!videoTrack || !controlledVideos || controlledVideos.length === 0) {
         console.error("goToIndex aborted: videoTrack or controlledVideos missing.");
         return;
    }
    if (index < 0 || index >= controlledVideos.length) {
         console.warn(`goToIndex aborted: Index ${index} out of bounds (0-${controlledVideos.length - 1}).`);
         return;
    }

    // Prevent stacking animations (if not immediate)
    if (isAnimating && !immediate) {
        console.log(`goToIndex aborted: Animation already in progress.`);
        return;
    }

    const previousIndex = currentIndex; // Store index we are scrolling FROM

    // Prevent redundant calls if index hasn't changed (allow if immediate)
    if (index === previousIndex && !immediate) {
        return;
    }

    isAnimating = true; // Set flag BEFORE animation/set starts
    currentIndex = index; // Update currentIndex
    console.log(`goToIndex: Updated currentIndex to ${currentIndex}. Previous was ${previousIndex}`);
    updateActiveClass(); // Update active class immediately

    const targetYPercent = -currentIndex * 100;

    // Perform Scroll Action
    if (immediate) {
        gsap.set(videoTrack, { yPercent: targetYPercent });
        isAnimating = false;
        updateActiveClass();
        // Call the async function but don't wait for it here. Handle errors.
        controlVideoPlayback(currentIndex, previousIndex).catch(err => {
             console.error("[goToIndex Immediate] Error controlling video playback:", err);
        });
    } else {
        gsap.to(videoTrack, {
            yPercent: targetYPercent,
            duration: animationDuration,
            ease: "back.out(.5)",
            overwrite: "auto",
            onComplete: () => {
                isAnimating = false;
                 // Call the async function but don't wait for it here. Handle errors.
                controlVideoPlayback(currentIndex, previousIndex).catch(err => {
                    console.error("[goToIndex Animation] Error controlling video playback onComplete:", err);
                });
            },
            onInterrupt: () => {
                 console.warn(`Animation interrupted targeting index ${currentIndex}.`);
                 isAnimating = false; // Reset flag on interrupt
                 // Consider pausing all videos on interrupt?
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

/**
 * Detects if the current device supports touch events.
 */
function detectTouchDevice() {
    let hasTouch = false;
    if ('maxTouchPoints' in navigator) hasTouch = navigator.maxTouchPoints > 0;
    else if ('ontouchstart' in window) hasTouch = true;
    else if ('msMaxTouchPoints' in navigator) hasTouch = navigator.msMaxTouchPoints > 0;
    return hasTouch;
}

// --- Throttled Scroll Handler (defined later) ---
let handleThrottledScroll = null;

/**
 * Initializes GSAP scroll functionality, sets up event listeners, and initial state.
 * @param {Array<Video>} videos - The array of Video objects from playlist.js.
 */
export function initializeGsapScroll(videos) {
    controlledVideos = videos; // Store the video objects
    console.log("GSAP Scroll Initializing with", controlledVideos.length, "videos.");

    globalVolumeLevel = 0.0; // Ensure starting muted

    const isTouchDevice = detectTouchDevice();

    // Conditional Timings
    const DESKTOP_ANIMATION_DURATION = 1.2;
    const MOBILE_ANIMATION_DURATION = 0.8;
    const DESKTOP_THROTTLE_INTERVAL = 100;
    const MOBILE_THROTTLE_INTERVAL = 200; // Faster throttle for touch swipes
    animationDuration = isTouchDevice ? MOBILE_ANIMATION_DURATION : DESKTOP_ANIMATION_DURATION;
    throttleInterval = isTouchDevice ? MOBILE_THROTTLE_INTERVAL : DESKTOP_THROTTLE_INTERVAL;

    // Define Throttled Scroll Handler (uses variables defined above)
    handleThrottledScroll = throttle((delta) => {
        // --- isAnimating check REMOVED from here ---
        let newIndex = currentIndex;
        // Use simple positive/negative check for delta, works for wheel and +/- 1 from keys
        if (delta > 0 && currentIndex < videoItems.length - 1) { // Delta is positive (Scroll Down/Next)
            newIndex++;
        } else if (delta < 0 && currentIndex > 0) { // Delta is negative (Scroll Up/Previous)
            newIndex--;
        } else {
             // console.log(`[Throttle Inner] No index change or boundary. Delta: ${delta}, Current: ${currentIndex}`);
             return; // No change if delta is 0 or boundary reached
        }

        // Call goToIndex only if the index actually changed
        if (newIndex !== currentIndex) {
            console.log(`[Throttle Inner] Calling goToIndex(${newIndex})`);
            goToIndex(newIndex); // Let goToIndex handle the isAnimating check internally
        } else {
            // This case shouldn't really be hit with the checks above, but good practice
             // console.log(`[Throttle Inner] Calculated index ${newIndex} is same as current ${currentIndex}. Not calling goToIndex.`);
        }
    }, throttleInterval);

    // Find DOM Elements
    videoTrack = document.querySelector(".js-video-track");
    if (!videoTrack) { console.error("Scroll Init Failed: '.js-video-track' not found."); return; }
    videoItems = gsap.utils.toArray(videoTrack.children).filter(el => el.classList.contains('video-item'));
    if (videoItems.length === 0) { console.error("Scroll Init Failed: No '.video-item' children found in track."); return; }

    // Reset State
    currentIndex = 0;
    isAnimating = false;

    // === DEFINE EVENT HANDLERS ===

    // --- Keyboard Handler (Made async) ---
    const handleKeyDown = async (event) => {
        const targetTagName = event.target.tagName;
        if (targetTagName === 'INPUT' || targetTagName === 'TEXTAREA' || event.target.isContentEditable) return;

        if (!controlledVideos || controlledVideos.length === 0 || currentIndex < 0 || currentIndex >= controlledVideos.length) return;
        const activeVideo = controlledVideos[currentIndex];
        if (!activeVideo) {
            console.warn(`Keydown: No active video object found for index ${currentIndex}`);
            return;
        }

        switch (event.key) {
            case ' ': case 'Spacebar':
                event.preventDefault();
                const playPauseButton = document.getElementById(`playPauseButton-${activeVideo.id}`);
                if (playPauseButton) {
                     console.log(`[Keydown Space] Calling togglePlayPause for ${activeVideo.id}`);
                    try {
                         await activeVideo.togglePlayPause(playPauseButton); // Wait for the toggle action
                    } catch (toggleError) {
                        console.error(`[Keydown Space] Error calling togglePlayPause:`, toggleError);
                    }
                } else {
                    console.warn("Spacebar: Could not find play/pause button");
                }
                break;
             // --- Scroll Up/Previous ---
            case 'ArrowLeft': case 'ArrowUp':
                event.preventDefault(); // Prevent default page scrolling
                console.log("[Keydown Left/Up] Triggering scroll previous (-1)");
                handleThrottledScroll(-1); // Negative delta scrolls up/previous
                break;

            // --- Scroll Down/Next ---
            case 'ArrowRight': case 'ArrowDown':
                event.preventDefault(); // Prevent default page scrolling
                console.log("[Keydown Right/Down] Triggering scroll next (+1)");
                handleThrottledScroll(1); // Positive delta scrolls down/next
                break;
            // --- Volume ---
            case 'AudioVolumeUp': case '+':
                event.preventDefault();
                console.log("[Keydown Up] Adjusting global volume up");
                await adjustGlobalVolume(0.1); // Wait for volume adjustment
                break;
            case 'AudioVolumeDown': case '-':
                event.preventDefault();
                console.log("[Keydown Down] Adjusting global volume down");
                await adjustGlobalVolume(-0.1); // Wait for volume adjustment
                break;
        }
    };

    // --- Wheel Handler ---
    const handleWheel = (event) => {
        event.preventDefault(); // Prevent page scroll
        handleThrottledScroll(event.deltaY);
    };

    // --- Touch Handlers ---
    let touchStartY = null, touchStartX = null;
    const minSwipeDistanceY = 30, maxSwipeDistanceX = 100; // Adjust sensitivity
    const handleTouchStart = (event) => {
        if (event.touches.length === 1) {
            touchStartY = event.touches[0].clientY;
            touchStartX = event.touches[0].clientX;
        } else {
            touchStartY = null; touchStartX = null;
        }
    };
    const handleTouchMove = (event) => {
        // Prevent scroll only if touch started correctly and is vertical-ish
        if (touchStartY !== null) {
            const touchCurrentX = event.touches[0].clientX;
             if (Math.abs(touchStartX - touchCurrentX) < maxSwipeDistanceX) {
                 event.preventDefault();
             }
        }
    };
    const handleTouchEnd = (event) => {
        if (touchStartY === null) return;
        const touchEndY = event.changedTouches[0].clientY;
        const touchEndX = event.changedTouches[0].clientX;
        const deltaY = touchStartY - touchEndY;
        const deltaX = Math.abs(touchStartX - touchEndX); // Use absolute for X check

        // Trigger scroll only if vertical swipe is significant and horizontal is limited
        if (Math.abs(deltaY) > minSwipeDistanceY && deltaX < maxSwipeDistanceX) {
            handleThrottledScroll(deltaY);
        }
        touchStartY = null; touchStartX = null; // Reset
    };

    // --- Resize Handler ---
    let resizeTimeout = null;
    const handleResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            console.log("Resize handler: Repositioning video track immediately.");
            // Use goToIndex with immediate=true to snap to the correct position
            goToIndex(currentIndex, true);
        }, 250);
    };

    // === END OF HANDLER DEFINITIONS ===

    // === Set Initial Position ===
    goToIndex(0, true); // Includes initial video control call

    // === ATTACH Event Listeners ===
    // Remove potential old listeners first
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('wheel', handleWheel);
    window.removeEventListener('touchstart', handleTouchStart);
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);
    window.removeEventListener('resize', handleResize);

    // Add the listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: false }); // Need false for preventDefault
    window.addEventListener('touchstart', handleTouchStart, { passive: true }); // Can be passive
    window.addEventListener('touchmove', handleTouchMove, { passive: false }); // Need false for preventDefault
    window.addEventListener('touchend', handleTouchEnd, { passive: true }); // Can be passive
    window.addEventListener('resize', handleResize);

    console.log("GSAP Scroll Initialization complete. Listeners active.");
} // === END of initializeGsapScroll ===


/**
 * Sets volume, plays the current video, pauses others asynchronously.
 * OPTIMIZED: Awaits full init only for the video being played.
 * @param {number} currentIdx - The index of the video to activate.
 * @param {number} previousIdx - The index of the video to deactivate (used only for logging here).
 */
async function controlVideoPlayback(currentIdx, previousIdx) { // Keep async
    if (!controlledVideos || controlledVideos.length === 0) return;

    console.log(`--- [Async OPTIMIZED] Controlling Playback: Activate=${currentIdx}, Deactivate Others, GlobalVol=${globalVolumeLevel.toFixed(2)} ---`);

    for (let index = 0; index < controlledVideos.length; index++) {
        const video = controlledVideos[index];
        if (!video) continue;

        const playPauseButton = document.getElementById(`playPauseButton-${video.id}`);
        const soundButton = document.getElementById(`soundButton-${video.id}`);

        // --- Action for the CURRENT video (NEEDS full await) ---
        if (index === currentIdx) {
            try {
                const player = await video.initializePlayer();
        
                // --- CHECK THE FLAG BEFORE PLAYING ---
                if (video.justFinishedLoopLimit) {
                    console.log(`[ControlVid ${video.id}] Activate Play SKIPPED: Video just finished loop limit.`);
                    video.justFinishedLoopLimit = false; // Reset flag now that scroll has acknowledged it
                    console.log(`[ControlVid ${video.id}] Reset justFinishedLoopLimit = false`);
                    if (playPauseButton) playPauseButton.innerText = 'Play'; // Ensure button shows Play
                    // Make sure volume is still set correctly even if not playing
                     await player.setVolume(globalVolumeLevel);
                     if (soundButton) soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';
                } else {
                    // Flag is false, proceed with normal activation
                    console.log(`[ControlVid ${video.id}] Activating (Index ${index}). Setting volume & playing...`);
                    await player.setVolume(globalVolumeLevel);
                    if (soundButton) soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';
        
                    await player.play();
                    console.log(`[ControlVid ${video.id}] Play command successful.`);
                    if (playPauseButton) playPauseButton.innerText = 'Pause';
                }
                 // --- END FLAG CHECK ---
        
            } catch (error) {
                console.warn(`[ControlVid ${video.id}] Error activating video (Index ${index}): ${error.message}`);
                // Update buttons on error
                if (playPauseButton) playPauseButton.innerText = 'Play';
                if (soundButton) soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';
            }
        }
        // --- Action for all OTHER videos (Try pausing if player exists, less strict await) ---
        else {
             // Always update sound button to reflect global state
             if (soundButton) soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';

            // OPTIMIZATION: Check if player object exists *without* awaiting the full init promise again.
            if (video.player) {
                try {
                    video.player.pause().catch(pauseError => {
                        // Non-critical error if pause fails on an inactive video
                        console.warn(`[ControlVid ${video.id}] Non-critical error pausing inactive video: ${pauseError.message}`);
                        if (playPauseButton) playPauseButton.innerText = 'Play'; // Ensure it shows Play
                    });
                     if (playPauseButton) playPauseButton.innerText = 'Play';
                } catch (pauseError) {
                    // Non-critical error if pause fails on an inactive video
                    // console.warn(`[ControlVid ${video.id}] Non-critical error pausing inactive video: ${pauseError.message}`);
                    if (playPauseButton) playPauseButton.innerText = 'Play'; // Ensure it shows Play
                }
            } else {
                // If player doesn't even exist yet, just ensure button shows 'Play'
                 // console.log(`[ControlVid ${video.id}] Deactivating: Player object doesn't exist yet. Ensuring button shows 'Play'.`);
                 if (playPauseButton) playPauseButton.innerText = 'Play';
            }
        }
    } // End for loop
    console.log(`--- [Async OPTIMIZED] Finished Controlling Playback & Volume ---`);
}

/**
 * Adjusts the global volume level and applies it asynchronously to all ready players.
 * @param {number} delta - Amount to change volume by (e.g., 0.1 or -0.1)
 */
async function adjustGlobalVolume(delta) {
    let newVolume = globalVolumeLevel + delta;
    newVolume = Math.max(0, Math.min(1, newVolume)); // Clamp between 0 and 1

    if (newVolume.toFixed(2) === globalVolumeLevel.toFixed(2)) return; // Avoid tiny floating point changes

    console.log(`[Async] Adjusting global volume: ${globalVolumeLevel.toFixed(2)} -> ${newVolume.toFixed(2)}`);
    globalVolumeLevel = newVolume; // Update global state

    // Use for...of loop to iterate and use await
    for (const video of controlledVideos) {
         const soundButton = document.getElementById(`soundButton-${video.id}`);
         try {
             // Ensure player is ready
             // console.log(`[AdjustVol ${video.id}] Awaiting player readiness...`);
             const player = await video.initializePlayer();
             // console.log(`[AdjustVol ${video.id}] Player ready. Setting volume.`);
             await player.setVolume(globalVolumeLevel); // Wait for volume set
             // Update button text on successful volume change
             if (soundButton) soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';
         } catch (error) {
             console.warn(`[AdjustVol ${video.id}] Failed to set global volume: ${error.message}`);
             // Still update button text to reflect the *intended* global state
             if (soundButton) soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';
         }
    }
}

/**
 * Toggles the global volume between muted (0) and a default level asynchronously.
 * Applies the change to all ready players and updates buttons.
 * This function is EXPORTED for the button click handler in playlist.js.
 */
export async function toggleGlobalVolume() {
    // Determine new volume: if currently any sound -> mute, else -> unmute to default
    const newVolume = (globalVolumeLevel > 0) ? 0.0 : DEFAULT_UNMUTE_LEVEL;
    console.log(`[Async] Toggling global volume -> ${newVolume.toFixed(2)}`);
    globalVolumeLevel = newVolume; // Update global state

    // Use for...of loop to iterate and use await
    for (const video of controlledVideos) {
        const soundButton = document.getElementById(`soundButton-${video.id}`);
        try {
            // Ensure player is ready
            // console.log(`[ToggleVol ${video.id}] Awaiting player readiness...`);
            const player = await video.initializePlayer();
            // console.log(`[ToggleVol ${video.id}] Player ready. Setting volume.`);
            await player.setVolume(globalVolumeLevel); // Wait for volume set
             // Update button text on successful volume change
            if (soundButton) soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';
        } catch (error) {
            console.warn(`[ToggleVol ${video.id}] Failed to set global volume toggle: ${error.message}`);
             // Still update button text to reflect the *intended* global state
            if (soundButton) soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';
        }
    }
     console.log(`[Async] Finished toggling global volume.`);
}