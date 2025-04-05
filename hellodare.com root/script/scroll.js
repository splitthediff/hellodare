// Helper Throttle Function (with logging) -UNCHANGED
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        console.log(`--- Throttle check. In throttle: ${!!inThrottle}, Limit: ${limit}ms`); // LOG T1
        if (!inThrottle) {
            console.log("--- Throttle executing func ---"); // LOG T2
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => {
                 console.log("--- Throttle released ---"); // LOG T3
                 inThrottle = false;
            }, limit);
        } else {
            console.log("--- Throttle blocked func (still within timeout) ---"); // LOG T4
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

/**
 * Animates or sets the video track to a specific index.
 * @param {number} index - The target index.
 * @param {boolean} [immediate=false] - If true, set position instantly without animation.
 */
function goToIndex(index, immediate = false) {
    console.log(`>>> goToIndex called: index=${index}, immediate=${immediate}, currentIdx=${currentIndex}, isAnimating=${isAnimating}`); // LOG A

    // --- Boundary Checks ---
    if (!videoTrack || !videoItems || videoItems.length === 0) { /* ... */ return; }
    if (index < 0 || index >= videoItems.length) { /* ... */ return; }

    // --- Prevent Stacking Animations (if not immediate) ---
    if (isAnimating && !immediate) {
        console.log(`goToIndex aborted: Animation already in progress (targeting index ${currentIndex}).`); // LOG B
        return;
    }

    // --- Prevent redundant calls ---
    if (index === currentIndex && !immediate) {
        console.log(`goToIndex aborted: Already at index ${index}.`); // LOG C
        return;
    }

    isAnimating = true; // Set flag BEFORE animation/set
    console.log(`goToIndex: Setting isAnimating = true.`); // LOG D

    // --- CRITICAL: Update currentIndex immediately ---
    const previousIndex = currentIndex;
    currentIndex = index;
    console.log(`goToIndex: Updated currentIndex from ${previousIndex} to ${currentIndex}`); // LOG C.5

    const targetYPercent = -currentIndex * 100;
    console.log(`goToIndex: Calculated targetYPercent: ${targetYPercent}% for index ${currentIndex}`); // LOG E

    // --- Perform Action ---
    if (immediate) {
        console.log(`goToIndex: Setting immediate position for index ${currentIndex}...`); // LOG F
        gsap.set(videoTrack, { yPercent: targetYPercent });
        isAnimating = false; // Reset flag immediately after set
        console.log(`Immediate position set for index ${currentIndex}. isAnimating=${isAnimating}`); // LOG G
        updateActiveClass();
    } else {
        console.log(`goToIndex: Starting GSAP animation to index ${currentIndex} (Duration: ${animationDuration}s)...`); // LOG H (Added duration)
        gsap.to(videoTrack, {
            yPercent: targetYPercent,
            duration: animationDuration, // Use the updated duration
            ease: "power2.inOut", // Standard smooth ease
            // ease: "power3.inOut", // Slightly more pronounced ease
            overwrite: "auto",
            onComplete: () => {
                isAnimating = false; // Reset flag when animation finishes
                console.log(`Animation complete. Target index: ${currentIndex}. isAnimating=${isAnimating}`); // LOG I
                updateActiveClass();
            },
            onInterrupt: () => {
                 console.warn(`Animation interrupted targeting index ${currentIndex}. isAnimating is still ${isAnimating}.`); // LOG J
                 // If interruptions cause visual issues, might need:
                 // gsap.set(videoTrack, { yPercent: targetYPercent }); // Force to end position? (Careful)
                 // isAnimating = false;
            }
        });
    }
}

/**
 * Updates the 'active-video' class on video items based on currentIndex. - UNCHANGED
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


/**
 * Initializes the GSAP scrolling functionality.
 */
export function initializeGsapScroll() {
    console.log("Initializing GSAP Scroll (Conditional Timings)...");

    // --- 1. Detect Device Type ---
    const isTouchDevice = detectTouchDevice();
    console.log(`Device detected as touch capable: ${isTouchDevice}`);

    // --- 2. Set Conditional Timings ---
    const DESKTOP_ANIMATION_DURATION = 2.0; 
    const MOBILE_ANIMATION_DURATION = 0.8; 

    const DESKTOP_THROTTLE_INTERVAL = DESKTOP_ANIMATION_DURATION * 1000 + 100;;
    const MOBILE_THROTTLE_INTERVAL = 200; 

    // Assign the correct values based on detection
    animationDuration = isTouchDevice ? MOBILE_ANIMATION_DURATION : DESKTOP_ANIMATION_DURATION;
    throttleInterval = isTouchDevice ? MOBILE_THROTTLE_INTERVAL : DESKTOP_THROTTLE_INTERVAL;

    console.log(`Using animation duration: ${animationDuration}s`);
    console.log(`Using throttle interval: ${throttleInterval}ms`);


    // --- 3. Create Throttled Handler *using the determined interval* ---
    handleThrottledScroll = throttle((delta) => {
        // Ensure isAnimating check is prominent
        console.log(`>>> handleThrottledScroll EXECUTION: delta=${delta}, isAnimating=${isAnimating}`);
        if (isAnimating) {
            console.log("handleThrottledScroll: Ignored, animation in progress.");
            return; // Rely on this check
        }

        // --- Determine New Index ---
        let newIndex = currentIndex;
        const sensitivity = 0; // Trigger on any non-zero delta for now

        if (delta > sensitivity && currentIndex < videoItems.length - 1) {
            newIndex++;
            console.log(`handleThrottledScroll: Scroll Down/Swipe Up detected. Proposed newIndex: ${newIndex}`);
        } else if (delta < -sensitivity && currentIndex > 0) {
            newIndex--;
            console.log(`handleThrottledScroll: Scroll Up/Swipe Down detected. Proposed newIndex: ${newIndex}`);
        } else {
            console.log(`handleThrottledScroll: No index change (delta=${delta}, at bounds, or sensitivity not met).`);
            return; 
        }

        // --- Trigger Animation ---
        goToIndex(newIndex); // Pass the determined animationDuration implicitly

    }, throttleInterval); // <<< Pass the correct interval here


    // --- 4. Find DOM Elements ---
    videoTrack = document.querySelector(".js-video-track");
    const tempItems = videoTrack ? gsap.utils.toArray(videoTrack.children).filter(el => el.classList.contains('video-item')) : [];

    if (!videoTrack || tempItems.length === 0) {
        console.error("GSAP Scroll init failed: Track or video items not found.");
        return;
    }
    videoItems = tempItems;
    currentIndex = 0;
    isAnimating = false;
    console.log(`Found ${videoItems.length} video items.`);

    // --- 5. Set Initial Position ---
    console.log("Setting initial position...");
    goToIndex(0, true); // Uses animationDuration implicitly if not immediate

    // --- 6. Attach Event Listeners ---
    // Clear previous listeners if necessary (using named functions)
    // ...

    // Wheel Listener (uses handleThrottledScroll)
    const handleWheel = (event) => {
        console.log(`--- Wheel event detected: deltaY=${event.deltaY} ---`);
        event.preventDefault();
        handleThrottledScroll(event.deltaY); // Call shared throttled function
    };
    window.addEventListener("wheel", handleWheel, { passive: false });

    // Touch Listeners (uses handleThrottledScroll)
    let touchStartY = null;
    let touchStartX = null;
    const minSwipeDistanceY = 2; // Keep tuned values
    const maxSwipeDistanceX = 2000; // Keep tuned values

    const handleTouchStart = (event) => {
        if (event.touches.length === 1) { // Only track single touches
            touchStartY = event.touches[0].clientY;
            touchStartX = event.touches[0].clientX;
            // console.log(`Touch Start: Y=${touchStartY}, X=${touchStartX}`); // Optional debug
        } else {
            // Reset if multi-touch occurs during start
            touchStartY = null;
            touchStartX = null;
        }
    };

    const handleTouchMove = (event) => {
        // Prevent default browser scroll only if we are actively tracking a swipe
        if (touchStartY !== null) {
            // console.log("Touch Move - Preventing Default"); // Optional debug
            event.preventDefault();
        }
    };

    const handleTouchEnd = (event) => {
        const touchEndY = event.changedTouches[0].clientY;
        const touchEndX = event.changedTouches[0].clientX;
        
        const deltaY = touchStartY - touchEndY; // Calculate vertical difference
        const deltaX = touchStartX - touchEndX; // Calculate horizontal difference

        console.log(`TouchEnd: DeltaY=${deltaY.toFixed(1)}, DeltaX=${deltaX.toFixed(1)}. Thresholds: Y > ${minSwipeDistanceY}, X < ${maxSwipeDistanceX}`);

        if (Math.abs(deltaY) > minSwipeDistanceY && Math.abs(deltaX) < maxSwipeDistanceX) {
            console.log(`>>> Touch Swipe ACCEPTED: deltaY=${deltaY.toFixed(1)} <<<`);
            handleThrottledScroll(deltaY); // Call shared throttled function
        } else {
            console.log(`--- Touch Swipe REJECTED ---`);
        }
        touchStartY = null; touchStartX = null; // Reset
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    // Resize Listener
    let resizeTimeout = null;

    const handleResize = () => {
        clearTimeout(resizeTimeout); // Debounce
        resizeTimeout = setTimeout(() => {
            console.log("--- Resize event triggered ---");
            // Optional: Recalculate internal sizes if needed elsewhere
            // updateDOMVideoSizes(currentVideos);

            console.log("Resize handler: Repositioning video track immediately.");
            if (typeof goToIndex === 'function' && typeof currentIndex !== 'undefined') {
                goToIndex(currentIndex, true); // Reposition GSAP immediately
            } else {
                 console.warn("goToIndex or currentIndex not available for resize repositioning.");
            }
        }, 250); // Debounce delay
    };

    window.addEventListener('resize', handleResize);

    console.log("GSAP Scroll Initialization complete (Conditional Wheel & Touch active).");

    // --- CSS CHECKS ---
    console.warn("CSS CHECK: Ensure the container holding '.js-video-track' has height: 100vh (or desired viewport height) and overflow: hidden.");
    console.warn("CSS CHECK: Ensure '.js-video-track' has height: 100%.");
    console.warn("CSS CHECK: Ensure '.video-item' elements have height: 100%.");
    console.warn("CSS CHECK: Ensure no unexpected margin/padding is affecting layout.");
    console.warn("CSS CHECK: Recommend using 'box-sizing: border-box;' globally.");
}