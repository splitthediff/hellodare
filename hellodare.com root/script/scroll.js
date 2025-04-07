// scroll.js

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
let scrollItems = []; // MODIFIED: Holds all items (videos + info)
let videoTrack = null;
let isAnimating = false;

// --- Configuration Variables ---
let animationDuration;
let throttleInterval;

// --- Video Control Variables ---
// This still holds ONLY the actual Video class instances passed from playlist.js
let controlledVideos = [];

// --- Global Volume State ---
let globalVolumeLevel = 0.0; // Start muted
const DEFAULT_UNMUTE_LEVEL = 0.6; // Volume when unmuting (0.0 to 1.0)

/**
 * Animates or sets the video track to a specific index AND controls video playback/state.
 * @param {number} index - The target index (0 to scrollItems.length - 1).
 * @param {boolean} [immediate=false] - If true, set position instantly without animation.
 */
export function goToIndex(index, immediate = false) {
    // --- MODIFIED: Use scrollItems for boundary checks ---
    if (!videoTrack || !scrollItems || scrollItems.length === 0) {
         console.error("goToIndex aborted: videoTrack or scrollItems missing.");
         return;
    }
    if (index < 0 || index >= scrollItems.length) { // Use scrollItems.length
         console.warn(`goToIndex aborted: Index ${index} out of bounds (0-${scrollItems.length - 1}).`);
         return;
    }
    // --- END MODIFICATION ---

    // Prevent stacking animations (if not immediate)
    if (isAnimating && !immediate) {
        console.log(`goToIndex aborted: Animation already in progress.`);
        return;
    }

    const previousIndex = currentIndex; // Store index we are scrolling FROM

    // Prevent redundant calls if index hasn't changed (allow if immediate)
    if (index === previousIndex && !immediate) {
        // console.log(`[goToIndex] Already at index ${index}.`); // Optional log
        return;
    }

    isAnimating = true; // Set flag BEFORE animation/set starts
    currentIndex = index; // Update currentIndex
    console.log(`goToIndex: Updated currentIndex to ${currentIndex}. Previous was ${previousIndex}`);
    updateActiveClass(); // Update active class for the new item

    const targetYPercent = -currentIndex * 100;

    // Perform Scroll Action
    if (immediate) {
        gsap.set(videoTrack, { yPercent: targetYPercent });
        isAnimating = false;
        // updateActiveClass(); // Already called above
        // Call the async function but don't wait for it here. Handle errors.
        controlVideoPlayback(currentIndex, previousIndex).catch(err => {
             console.error("[goToIndex Immediate] Error controlling video playback:", err);
        });
    } else {
        gsap.to(videoTrack, {
            yPercent: targetYPercent,
            duration: animationDuration,
            ease: "back.out(.5)", // Or your preferred ease
            overwrite: "auto",
            onComplete: () => {
                console.log(`[goToIndex Animation COMPLETE] Target index: ${currentIndex}. Setting isAnimating = false.`);
                 // --- SET FLAG TO FALSE *BEFORE* potentially long async call ---
                isAnimating = false;
                // updateActiveClass(); // Already called above
                 // Call the async function but don't wait for it here. Handle errors.
                controlVideoPlayback(currentIndex, previousIndex).catch(err => {
                    console.error("[goToIndex Animation] Error controlling video playback onComplete:", err);
                });
            },
            onInterrupt: () => {
                 console.warn(`[goToIndex Animation INTERRUPTED] Targeting index ${currentIndex}. Setting isAnimating = false.`);
                 // --- Ensure flag is reset on interrupt ---
                 isAnimating = false;
            }
        });
    }
}

/**
 * Updates the 'active-scroll-item' class on scrollable items based on currentIndex.
 */
function updateActiveClass() {
     // --- MODIFIED: Use scrollItems and new class name ---
     if (!scrollItems || scrollItems.length === 0) return;
     scrollItems.forEach((item, i) => {
        item?.classList.toggle('active-scroll-item', i === currentIndex); // Use new class name
    });
     // --- END MODIFICATION ---
}

/**
 * Detects if the current device supports touch events.
 */
function detectTouchDevice() {
    // ... (no changes needed here) ...
    let hasTouch = false; if ('maxTouchPoints' in navigator) hasTouch = navigator.maxTouchPoints > 0; else if ('ontouchstart' in window) hasTouch = true; else if ('msMaxTouchPoints' in navigator) hasTouch = navigator.msMaxTouchPoints > 0; return hasTouch;
}

// --- Throttled Scroll Handler (defined later) ---
let handleThrottledScroll = null;

/**
 * Initializes GSAP scroll functionality, sets up event listeners, and initial state.
 * @param {Array<Video>} videos - The array of Video objects from playlist.js.
 */
export function initializeGsapScroll(videos) {
    controlledVideos = videos; // Store the actual video objects separately
    // Log message updated later after finding scrollItems

    globalVolumeLevel = 0.0; // Ensure starting muted
    const isTouchDevice = detectTouchDevice();

    // Conditional Timings (adjust as needed)
    const DESKTOP_ANIMATION_DURATION = 1.0; // Example
    const MOBILE_ANIMATION_DURATION = 0.7;  // Example
    const DESKTOP_THROTTLE_INTERVAL = 200;  // Example - adjust responsiveness
    const MOBILE_THROTTLE_INTERVAL = 200;
    animationDuration = isTouchDevice ? MOBILE_ANIMATION_DURATION : DESKTOP_ANIMATION_DURATION;
    throttleInterval = isTouchDevice ? MOBILE_THROTTLE_INTERVAL : DESKTOP_THROTTLE_INTERVAL;

    // Find DOM Elements
    videoTrack = document.querySelector(".js-video-track");
    if (!videoTrack) { console.error("Scroll Init Failed: '.js-video-track' not found."); return; }

    // --- MODIFIED: Select ALL items with the common class ---
    scrollItems = gsap.utils.toArray(videoTrack.children).filter(el => el.classList.contains('scroll-item'));
    if (scrollItems.length === 0) {
        console.error("Scroll Init Failed: No '.scroll-item' children found in track.");
        return;
    }
    console.log(`Found ${scrollItems.length} total scroll items (videos + info).`);
    // --- END MODIFICATION ---

    // --- MODIFIED: Update log message ---
    console.log("GSAP Scroll Initializing with", controlledVideos.length, "videos and", scrollItems.length, "total scroll items.");
    // --- END MODIFICATION ---


    // Define Throttled Scroll Handler (using scrollItems.length)
    handleThrottledScroll = throttle((delta) => {
        // isAnimating check was REMOVED from here in previous step
        let newIndex = currentIndex;
        // Use simple positive/negative check, check boundaries with scrollItems.length
        if (delta > 0 && currentIndex < scrollItems.length - 1) { // Scroll Down/Next
            newIndex++;
        } else if (delta < 0 && currentIndex > 0) { // Scroll Up/Previous
            newIndex--;
        } else {
             return; // No change or boundary
        }

        if (newIndex !== currentIndex) {
            // console.log(`[Throttle Inner] Calling goToIndex(${newIndex})`);
            goToIndex(newIndex); // Let goToIndex handle isAnimating check
        }
    }, throttleInterval);


    // Reset State
    currentIndex = 0;
    isAnimating = false;

    // === DEFINE EVENT HANDLERS (Continuing from Part 1) ===

    // --- MODIFIED: Keyboard Handler - Check if current index is video ---
    const handleKeyDown = async (event) => {
        const targetTagName = event.target.tagName;
        if (targetTagName === 'INPUT' || targetTagName === 'TEXTAREA' || event.target.isContentEditable) return;

        // Check against scrollItems for general boundary
        if (!scrollItems || scrollItems.length === 0) return;

        // Get active video object *only if* currentIndex points to a video
        const activeVideo = (currentIndex < controlledVideos.length) ? controlledVideos[currentIndex] : null;

        switch (event.key) {
            case ' ': case 'Spacebar':
                event.preventDefault();
                // Only toggle play/pause if the current item IS a video
                if (activeVideo) {
                    const playPauseButton = document.getElementById(`playPauseButton-${activeVideo.id}`);
                    if (playPauseButton) {
                         console.log(`[Keydown Space] Calling togglePlayPause for ${activeVideo.id}`);
                        try {
                             await activeVideo.togglePlayPause(playPauseButton);
                        } catch (toggleError) {
                            console.error(`[Keydown Space] Error calling togglePlayPause:`, toggleError);
                        }
                    } else {
                        console.warn("Spacebar: Could not find play/pause button for active video.");
                    }
                } else {
                    console.log("Spacebar ignored: Info section is active.");
                }
                break;

            // Scroll keys operate on the whole sequence
            case 'ArrowLeft': case 'ArrowUp':
                event.preventDefault();
                // console.log("[Keydown Left/Up] Triggering scroll previous (-1)");
                handleThrottledScroll(-1);
                break;
            case 'ArrowRight': case 'ArrowDown':
                event.preventDefault();
                // console.log("[Keydown Right/Down] Triggering scroll next (+1)");
                handleThrottledScroll(1);
                break;

            // Volume keys affect global state (handled by adjustGlobalVolume which loops controlledVideos)
            case 'AudioVolumeUp': case '+': // Example mapping
                event.preventDefault();
                console.log("[Keydown Volume Up]");
                await adjustGlobalVolume(0.1);
                break;
            case 'AudioVolumeDown': case '-': // Example mapping
                event.preventDefault();
                console.log("[Keydown Volume Down]");
                await adjustGlobalVolume(-0.1);
                break;
        }
    };
    // --- END MODIFICATION ---

    // --- Wheel Handler (No changes needed) ---
    const handleWheel = (event) => {
        event.preventDefault();
        handleThrottledScroll(event.deltaY);
    };

    // --- Touch Handlers (No changes needed) ---
    let touchStartY = null, touchStartX = null;
    const minSwipeDistanceY = 30, maxSwipeDistanceX = 100; // Adjust sensitivity
    const handleTouchStart = (event) => { /* ... */ if (event.touches.length === 1){ touchStartY = event.touches[0].clientY; touchStartX = event.touches[0].clientX; } else { touchStartY = null; touchStartX = null; } };
    const handleTouchMove = (event) => { /* ... */ if (touchStartY !== null) { const touchCurrentX = event.touches[0].clientX; if (Math.abs(touchStartX - touchCurrentX) < maxSwipeDistanceX) { event.preventDefault(); } } };
    const handleTouchEnd = (event) => { /* ... */ if (touchStartY === null) return; const touchEndY = event.changedTouches[0].clientY; const touchEndX = event.changedTouches[0].clientX; const deltaY = touchStartY - touchEndY; const deltaX = Math.abs(touchStartX - touchEndX); if (Math.abs(deltaY) > minSwipeDistanceY && deltaX < maxSwipeDistanceX) { handleThrottledScroll(deltaY); } touchStartY = null; touchStartX = null; };

    // --- Resize Handler (No changes needed) ---
    let resizeTimeout = null;
    const handleResize = () => { clearTimeout(resizeTimeout); resizeTimeout = setTimeout(() => { console.log("Resize handler: Repositioning video track immediately."); goToIndex(currentIndex, true); }, 250); };

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
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('resize', handleResize);

    console.log("GSAP Scroll Initialization complete. Listeners active.");
} // === END of initializeGsapScroll ===


/**
 * Sets volume, plays/pauses videos depending on whether the target index is a video or info.
 * @param {number} currentIdx - The index of the scroll item to activate.
 * @param {number} previousIdx - The index of the item being scrolled away from.
 */
// --- MODIFIED: Make controlVideoPlayback aware of info section ---
async function controlVideoPlayback(currentIdx, previousIdx) {
    // Use scrollItems length for boundary checks/iteration planning if needed,
    // but primarily operate based on whether an index maps to controlledVideos
    if (!scrollItems || scrollItems.length === 0) return; // Check scrollItems exist

    console.log(`--- [Async Info Aware] Controlling Playback: Activate=${currentIdx}, Deactivate Others, GlobalVol=${globalVolumeLevel.toFixed(2)} ---`);

    // Iterate through all possible video indices based on controlledVideos length
    // This is safer than iterating scrollItems length for video operations
    for (let index = 0; index < controlledVideos.length; index++) {
        const video = controlledVideos[index]; // Get the video object
        if (!video) continue; // Skip if somehow a video object is missing

        const playPauseButton = document.getElementById(`playPauseButton-${video.id}`);
        const soundButton = document.getElementById(`soundButton-${video.id}`);

        // --- Action for the VIDEO AT INDEX 'index' ---

        // If this video index is the one being activated:
        if (index === currentIdx) {
            try {
                const player = await video.initializePlayer();
                // Check the flag for recently finished loops
                if (video.justFinishedLoopLimit) {
                    console.log(`[ControlVid ${video.id}] Activate Play SKIPPED: Video just finished loop limit.`);
                    video.justFinishedLoopLimit = false; // Reset flag
                    if (playPauseButton) playPauseButton.innerText = 'Play';
                    await player.setVolume(globalVolumeLevel); // Still set volume
                    if (soundButton) soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';
                } else {
                    // Activate the video normally
                    // console.log(`[ControlVid ${video.id}] Activating Video (Index ${index}). Setting volume & playing...`);
                    await player.setVolume(globalVolumeLevel);
                    if (soundButton) soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';
                    await player.play();
                    // console.log(`[ControlVid ${video.id}] Play command successful.`);
                    if (playPauseButton) playPauseButton.innerText = 'Pause';
                }
            } catch (error) {
                // Handle errors activating this video
                console.warn(`[ControlVid ${video?.id || 'N/A'}] Error activating video (Index ${index}): ${error.message}`);
                if (playPauseButton) playPauseButton.innerText = 'Play';
                if (soundButton) soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';
            }
        }
        // If this video index is NOT the one being activated:
        else {
             // Always update sound button to reflect global state
             if (soundButton) soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';
             // Pause this inactive video if player exists (using non-awaited version)
             if (video.player) {
                 try {
                     video.player.pause().catch(e => console.warn(`[ControlVid ${video.id}] Non-critical pause error: ${e.message}`));
                     if (playPauseButton) playPauseButton.innerText = 'Play'; // Set button text immediately
                 } catch (syncError) { // Catch rare sync errors accessing player
                      console.warn(`[ControlVid ${video.id}] Sync error on pause: ${syncError.message}`);
                      if (playPauseButton) playPauseButton.innerText = 'Play';
                 }
             } else {
                 // If player doesn't exist yet, ensure button is 'Play'
                 if (playPauseButton) playPauseButton.innerText = 'Play';
             }
        }
    }

    // --- Additional check: If the activated index is BEYOND the videos (it's the info section) ---
    if (currentIdx >= controlledVideos.length) {
         console.log(`[ControlVid] Info Section Activated (Index ${currentIdx}). No video playback actions needed for it.`);
    }

    console.log(`--- [Async Info Aware] Finished Controlling Playback & Volume ---`);
}
// --- END MODIFICATION ---


/**
 * Adjusts the global volume level and applies it asynchronously to all ready players.
 */
async function adjustGlobalVolume(delta) {
    let newVolume = globalVolumeLevel + delta;
    newVolume = Math.max(0, Math.min(1, newVolume));
    if (newVolume.toFixed(2) === globalVolumeLevel.toFixed(2)) return;
    console.log(`[Async] Adjusting global volume: ${globalVolumeLevel.toFixed(2)} -> ${newVolume.toFixed(2)}`);
    globalVolumeLevel = newVolume;
    for (const video of controlledVideos) {
         const soundButton = document.getElementById(`soundButton-${video.id}`);
         try {
             const player = await video.initializePlayer();
             await player.setVolume(globalVolumeLevel);
             if (soundButton) soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';
         } catch (error) {
             console.warn(`[AdjustVol ${video.id}] Failed to set global volume: ${error.message}`);
             if (soundButton) soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';
         }
    }
}


/**
 * Toggles the global volume between muted (0) and a default level asynchronously.
 */
export async function toggleGlobalVolume() {
    const newVolume = (globalVolumeLevel > 0) ? 0.0 : DEFAULT_UNMUTE_LEVEL;
    console.log(`[Async] Toggling global volume -> ${newVolume.toFixed(2)}`);
    globalVolumeLevel = newVolume;
    for (const video of controlledVideos) {
        const soundButton = document.getElementById(`soundButton-${video.id}`);
        try {
            const player = await video.initializePlayer();
            await player.setVolume(globalVolumeLevel);
            if (soundButton) soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';
        } catch (error) {
            console.warn(`[ToggleVol ${video.id}] Failed to set global volume toggle: ${error.message}`);
            if (soundButton) soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';
        }
    }
     console.log(`[Async] Finished toggling global volume.`);
} 