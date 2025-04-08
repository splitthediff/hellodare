// scroll.js (SHOULD MATCH PREVIOUS WORKING VERSION - Play Once Logic, No Request Mgr)

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
let scrollItems = []; // Holds all scrollable DOM elements
let videoTrack = null;
let isAnimating = false;

// --- Configuration Variables ---
let animationDuration;
let throttleInterval;

// --- Video Control Variables ---
let controlledVideos = []; // Holds Video class instances

// --- Global Volume State ---
let globalVolumeLevel = 0.0;
const DEFAULT_UNMUTE_LEVEL = 0.6;

/**
 * Animates or sets the video track to a specific index AND triggers playback control.
 * @param {number} index - The target index (0 to scrollItems.length - 1).
 * @param {boolean} [immediate=false] - If true, set position instantly without animation.
 */
export function goToIndex(index, immediate = false) {
    // Boundary checks using scrollItems
    if (!videoTrack || !scrollItems || scrollItems.length === 0) { console.error("goToIndex aborted: videoTrack or scrollItems missing."); return; }
    if (index < 0 || index >= scrollItems.length) { console.warn(`goToIndex aborted: Index ${index} out of bounds (0-${scrollItems.length - 1}).`); return; }

    // Prevent stacking animations
    if (isAnimating && !immediate) { console.log(`goToIndex aborted: Animation already in progress.`); return; }

    const previousIndex = currentIndex;
    if (index === previousIndex && !immediate) { return; } // No change

    // Update state
    isAnimating = !immediate; // Only true if animating
    currentIndex = index;
    console.log(`goToIndex: Updated currentIndex to ${currentIndex}. Previous was ${previousIndex}`);
    updateActiveClass(); // Update visual indicator

    const targetYPercent = -currentIndex * 100;

    // Trigger playback control attempt IMMEDIATELY
    controlVideoPlayback(currentIndex, previousIndex).catch(err => {
        console.error("[goToIndex Direct Call] Error controlling video playback:", err);
    });

    // Perform Scroll Animation / Set
    if (immediate) {
        gsap.set(videoTrack, { yPercent: targetYPercent });
        // isAnimating remains false
    } else {
        gsap.to(videoTrack, {
            yPercent: targetYPercent,
            duration: animationDuration,
            ease: "back.out(.5)",
            overwrite: "auto",
            onComplete: () => {
                console.log(`[goToIndex Animation COMPLETE] Target index: ${currentIndex}.`);
                isAnimating = false; // Reset flag only on completion
            },
            onInterrupt: () => {
                 console.warn(`[goToIndex Animation INTERRUPTED] Targeting index ${currentIndex}.`);
                 isAnimating = false; // Ensure reset
            }
        });
    }
}

/**
 * Updates the 'active-scroll-item' class on scrollable items based on currentIndex.
 */
function updateActiveClass() {
     if (!scrollItems || scrollItems.length === 0) return;
     scrollItems.forEach((item, i) => {
        item?.classList.toggle('active-scroll-item', i === currentIndex);
    });
}

/**
 * Detects if the current device supports touch events.
 */
function detectTouchDevice() {
    let hasTouch = false; if ('maxTouchPoints' in navigator) hasTouch = navigator.maxTouchPoints > 0; else if ('ontouchstart' in window) hasTouch = true; else if ('msMaxTouchPoints' in navigator) hasTouch = navigator.msMaxTouchPoints > 0; return hasTouch;
}

// --- Throttled Scroll Handler (defined later) ---
let handleThrottledScroll = null;

/**
 * Initializes GSAP scroll functionality, sets up event listeners, and initial state.
 * @param {Array<Video>} videos - The array of Video objects from playlist.js.
 */
export function initializeGsapScroll(videos) {
    controlledVideos = videos; // Store video objects

    globalVolumeLevel = 0.0;
    const isTouchDevice = detectTouchDevice();

    // --- Timings --- (Adjust these values as needed for feel)
    const DESKTOP_ANIMATION_DURATION = 1.0;
    const MOBILE_ANIMATION_DURATION = 0.7;
    const DESKTOP_THROTTLE_INTERVAL = 200; // How often scroll input is processed
    const MOBILE_THROTTLE_INTERVAL = 200;
    animationDuration = isTouchDevice ? MOBILE_ANIMATION_DURATION : DESKTOP_ANIMATION_DURATION;
    throttleInterval = isTouchDevice ? MOBILE_THROTTLE_INTERVAL : DESKTOP_THROTTLE_INTERVAL;
    // --- End Timings ---

    // Find DOM Elements
    videoTrack = document.querySelector(".js-video-track");
    if (!videoTrack) { console.error("Scroll Init Failed: '.js-video-track' not found."); return; }
    scrollItems = gsap.utils.toArray(videoTrack.children).filter(el => el.classList.contains('scroll-item'));
    if (scrollItems.length === 0) { console.error("Scroll Init Failed: No '.scroll-item' children found."); return; }
    console.log("GSAP Scroll Initializing with", controlledVideos.length, "videos and", scrollItems.length, "total scroll items.");

    // Define Throttled Scroll Handler
    handleThrottledScroll = throttle((delta) => {
        let newIndex = currentIndex;
        if (delta > 0 && currentIndex < scrollItems.length - 1) newIndex++;
        else if (delta < 0 && currentIndex > 0) newIndex--;
        else return;
        if (newIndex !== currentIndex) goToIndex(newIndex);
    }, throttleInterval);

    // Reset State
    currentIndex = 0;
    isAnimating = false;

    // === DEFINE EVENT HANDLERS ===
    const handleKeyDown = async (event) => {
        const targetTagName = event.target.tagName;
        if (targetTagName === 'INPUT' || targetTagName === 'TEXTAREA' || event.target.isContentEditable) return;
        if (!scrollItems || scrollItems.length === 0) return;
        const activeVideo = (currentIndex < controlledVideos.length) ? controlledVideos[currentIndex] : null;

        switch (event.key) {
            case ' ': case 'Spacebar':
                event.preventDefault();
                if (activeVideo) {
                    const btn = document.getElementById(`playPauseButton-${activeVideo.id}`);
                    if (btn) try { await activeVideo.togglePlayPause(btn); } catch (e) { console.error(e); }
                    else console.warn("Spacebar: Btn not found");
                } else console.log("Spacebar ignored: Info section active.");
                break;
            case 'ArrowLeft': case 'ArrowUp': event.preventDefault(); handleThrottledScroll(-1); break;
            case 'ArrowRight': case 'ArrowDown': event.preventDefault(); handleThrottledScroll(1); break;
            case 'AudioVolumeUp': case '+': event.preventDefault(); await adjustGlobalVolume(0.1); break;
            case 'AudioVolumeDown': case '-': event.preventDefault(); await adjustGlobalVolume(-0.1); break;
        }
    };

    const handleWheel = (event) => { event.preventDefault(); handleThrottledScroll(event.deltaY); };
    let touchStartY = null, touchStartX = null; const minSwipeDistanceY = 30, maxSwipeDistanceX = 100;
    const handleTouchStart = (event) => { if (event.touches.length === 1){ touchStartY = event.touches[0].clientY; touchStartX = event.touches[0].clientX; } else { touchStartY = null; touchStartX = null; } };
    const handleTouchMove = (event) => { if (touchStartY !== null) { const tX = event.touches[0].clientX; if (Math.abs(touchStartX - tX) < maxSwipeDistanceX) { event.preventDefault(); } } };
    const handleTouchEnd = (event) => { if (touchStartY === null) return; const tY = event.changedTouches[0].clientY; const tX = event.changedTouches[0].clientX; const dY = touchStartY - tY; const dX = Math.abs(touchStartX - tX); if (Math.abs(dY) > minSwipeDistanceY && dX < maxSwipeDistanceX) { handleThrottledScroll(dY); } touchStartY = null; touchStartX = null; };
    let resizeTimeout = null; const handleResize = () => { clearTimeout(resizeTimeout); resizeTimeout = setTimeout(() => { console.log("Resize handler: Repositioning."); goToIndex(currentIndex, true); }, 250); };
    // === END HANDLER DEFINITIONS ===

    // === Set Initial Position ===
    goToIndex(0, true);

    // === ATTACH Event Listeners ===
    window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('wheel', handleWheel); window.removeEventListener('touchstart', handleTouchStart); window.removeEventListener('touchmove', handleTouchMove); window.removeEventListener('touchend', handleTouchEnd); window.removeEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown); window.addEventListener('wheel', handleWheel, { passive: false }); window.addEventListener('touchstart', handleTouchStart, { passive: true }); window.addEventListener('touchmove', handleTouchMove, { passive: false }); window.addEventListener('touchend', handleTouchEnd, { passive: true }); window.addEventListener('resize', handleResize);

    console.log("GSAP Scroll Initialization complete. Listeners active.");
} // === END of initializeGsapScroll ===


/**
 * Sets volume, plays the current video IF it hasn't played once, pauses others.
 * Aware of the Info Section.
 * @param {number} currentIdx - The index of the scroll item to activate.
 * @param {number} previousIdx - The index of the item being scrolled away from (Only used for logging now).
 */
async function controlVideoPlayback(currentIdx, previousIdx) { // previousIdx no longer strictly needed but kept for logs
    if (!scrollItems || scrollItems.length === 0) return;

    console.log(`--- [Async Play Once Logic - TIMEUPDATE] Controlling Playback: Activate=${currentIdx}, Deactivate Others, GlobalVol=${globalVolumeLevel.toFixed(2)} ---`);

    // Iterate through actual video indices
    for (let index = 0; index < controlledVideos.length; index++) {
        const video = controlledVideos[index];
        if (!video) continue;

        const playPauseButton = document.getElementById(`playPauseButton-${video.id}`);
        const soundButton = document.getElementById(`soundButton-${video.id}`);

        // If this video index is the one being activated:
        if (index === currentIdx) {
            try {
                const player = await video.initializePlayer();

                // CHECK hasPlayedOnce: Only play if it HASN'T played once already (set via timeupdate or manual reset)
                if (video.hasPlayedOnce) {
                     console.log(`%c[ControlVid ${video.id}] Activate Play SKIPPED: hasPlayedOnce is TRUE. Ensuring pause.`, "color: blue; font-weight: bold;");
                     if (playPauseButton) playPauseButton.innerText = 'Play';
                     if (video.thumbnailElement) video.thumbnailElement.classList.remove('thumbnail-hidden');
                     if (soundButton) soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';
                     await player.pause().catch(e=>console.warn(`[ControlVid ${video.id}] Pause check warning: ${e.message}`));
                } else {
                    // It hasn't played through yet, proceed with normal activation
                    // console.log(`[ControlVid ${video.id}] Activating Video (Index ${index}). hasPlayedOnce=false. Setting volume & playing...`);
                    await player.setVolume(globalVolumeLevel);
                    if (soundButton) soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';
                    await player.play();
                    if (playPauseButton) playPauseButton.innerText = 'Pause';
                }
            } catch (error) {
                console.warn(`[ControlVid ${video?.id || 'N/A'}] Error activating video (Index ${index}): ${error.message}`);
                if (playPauseButton) playPauseButton.innerText = 'Play';
                if (soundButton) soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';
            }
        }
        // If this video index is NOT the one being activated:
        else {
             // Pause inactive videos
             if (soundButton) soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';
             if (video.player) {
                try {
                    // Use non-awaited pause for potentially better performance when scrolling fast
                    video.player.pause().catch(e => console.warn(`[ControlVid ${video.id}] Non-critical pause error: ${e.message}`));
                    if (playPauseButton) playPauseButton.innerText = 'Play'; // Set button text immediately
                } catch (syncError) {
                     console.warn(`[ControlVid ${video.id}] Sync error on pause: ${syncError.message}`);
                     if (playPauseButton) playPauseButton.innerText = 'Play';
                }
             } else {
                 if (playPauseButton) playPauseButton.innerText = 'Play';
             }
        }
    } // End for loop iterating through actual videos

    // Handle Info Section Activation (Ensure other videos are paused)
    if (currentIdx >= controlledVideos.length) {
         console.log(`[ControlVid] Info Section Activated (Index ${currentIdx}). Ensuring all videos paused.`);
         for (const vidToPause of controlledVideos) {
             const btn = document.getElementById(`playPauseButton-${vidToPause?.id}`);
             if (vidToPause && vidToPause.player) {
                  vidToPause.player.pause().catch(e => {});
                  if(btn) btn.innerText = 'Play';
             } else if(btn) { btn.innerText = 'Play'; }
         }
    }

    console.log(`--- [Async Play Once Logic - TIMEUPDATE] Finished Controlling Playback & Volume ---`);
} // === END controlVideoPlayback ===


/**
 * Adjusts the global volume level and applies it asynchronously to all ready players.
 * (No changes needed)
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
 * (No changes needed)
 * This function is EXPORTED.
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