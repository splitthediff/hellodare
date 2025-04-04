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

// --- Configuration ---
// ADJUST THIS: Increase duration for slower, potentially smoother animation
const animationDuration = 2.5; // <<< TRY 2.0, 2.5, 3.0 or back to 5.0?

// ADJUST THROTTLE STRATEGY: Try a shorter interval
// This relies more on 'isAnimating' to prevent overlap during the animation,
// but allows the next scroll input to be processed sooner after animation completes.
const throttleInterval = 300; // <<< TRY 200-500ms. Independent of animationDuration.
// const throttleInterval = animationDuration * 1000 + 100; // <<< OLD Strategy (commented out)


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

/**
 * Throttled scroll event handler. Determines direction and calls goToIndex. - UNCHANGED LOGIC, uses new interval
 */
const handleThrottledScroll = throttle((delta) => {
    console.log(`>>> handleThrottledScroll EXECUTION: delta=${delta}, currentIdx=${currentIndex}, isAnimating=${isAnimating}`); // LOG K

    if (isAnimating) {
        console.log("handleThrottledScroll: Ignored, animation currently in progress."); // LOG L
        return;
    }

    let newIndex = currentIndex;
    const sensitivity = 0; // Trigger on any non-zero delta

    if (delta > sensitivity && currentIndex < videoItems.length - 1) {
        newIndex++;
        console.log(`handleThrottledScroll: Scroll Down detected. Proposed newIndex: ${newIndex}`); // LOG M.1
    } else if (delta < -sensitivity && currentIndex > 0) {
        newIndex--;
        console.log(`handleThrottledScroll: Scroll Up detected. Proposed newIndex: ${newIndex}`); // LOG M.2
    } else {
        console.log(`handleThrottledScroll: No index change (delta=${delta}, at bounds, or sensitivity not met).`); // LOG N
        return;
    }

    goToIndex(newIndex);

}, throttleInterval); // Uses the updated throttleInterval


/**
 * Initializes the GSAP scrolling functionality. - UNCHANGED
 */
export function initializeGsapScroll() {
    console.log("Initializing GSAP Scroll..."); // INIT LOG 1

    videoTrack = document.querySelector(".js-video-track");
    const tempItems = videoTrack ? gsap.utils.toArray(videoTrack.children).filter(el => el.classList.contains('video-item')) : [];

    if (!videoTrack || tempItems.length === 0) {
        console.error("GSAP Scroll init failed: Track '.js-video-track' or children '.video-item' not found."); // INIT LOG 2
        return;
    }

    videoItems = tempItems;
    currentIndex = 0;
    isAnimating = false;

    console.log(`Found ${videoItems.length} video items.`); // INIT LOG 3

    // --- Set Initial State ---
    console.log("Setting initial position (index 0)..."); // INIT LOG 4
    goToIndex(0, true);

    // --- Wheel Event Listener ---
    window.addEventListener("wheel", (event) => {
        console.log(`--- Wheel event detected: deltaY=${event.deltaY} ---`); // LOG P
        event.preventDefault();
        handleThrottledScroll(event.deltaY);
    }, { passive: false });

    // --- Resize Listener ---
    let resizeTimeout = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            console.log("--- Resize event triggered ---"); // LOG Q.1
            // No need to check isAnimating here, goToIndex(immediate=true) handles it
            console.log("Resize handler: Repositioning video track immediately."); // LOG Q.2
            goToIndex(currentIndex, true);
        }, 250);
    });

    console.log("GSAP Scroll Initialization complete."); // INIT LOG 5

    // --- CSS CHECKS ---
    console.warn("CSS CHECK: Ensure the container holding '.js-video-track' has height: 100vh (or desired viewport height) and overflow: hidden.");
    console.warn("CSS CHECK: Ensure '.js-video-track' has height: 100%.");
    console.warn("CSS CHECK: Ensure '.video-item' elements have height: 100%.");
    console.warn("CSS CHECK: Ensure no unexpected margin/padding is affecting layout.");
    console.warn("CSS CHECK: Recommend using 'box-sizing: border-box;' globally.");
}