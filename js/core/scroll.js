// js/core/scroll.js

// --- Imports ---
// Assuming utils, videoController, inputManager are in correct relative paths
import { throttle, detectTouchDevice } from '../utils/utils.js';
import {
    setVideos,
    controlVideoPlayback,
    adjustGlobalVolume,
    toggleGlobalVolume,
    animateInfoIn,  
    resetInfoAnimation
} from './videoController.js';
import * as InputManager from '../modules/inputManager.js';
import { config } from '../config.js';

// --- Module State ---
let currentIndex = 0;
let scrollItems = [];
let videoTrack = null;
let isAnimating = false;
let infoButtonElement = null; 

// --- Config Variables ---
let animationDuration = config.animation.desktopDuration;


// ==================================================
// HELPER / STATE UPDATE FUNCTIONS
// ==================================================
function updateActiveClass() {
    if (!scrollItems || scrollItems.length === 0) return;
    scrollItems.forEach((item, i) => {
        item?.classList.toggle(config.selectors.activeScrollItemClass, i === currentIndex);
    });

    const navLinks = document.querySelectorAll('#main-navigation .nav-link'); // Select all nav links
    if (navLinks.length > 0) {
        navLinks.forEach(link => {
            const linkIndex = parseInt(link.dataset.index, 10);
            // Remove active class from all first (safer)
            link.classList.remove('active');
            // Add active class if index matches current scroll index
            if (!isNaN(linkIndex) && linkIndex === currentIndex) {
                link.classList.add('active');
            }
        });
    }

    updateInfoButtonState();
}

function updateInfoButtonState() {
    
    if (!infoButtonElement || !scrollItems || scrollItems.length === 0) {
        console.log('Info Button Element: '.info);
        return;
    }

    const infoSectionIndex = scrollItems.length - 1;
    const isOnInfoPage = currentIndex === infoSectionIndex;

    infoButtonElement.innerText = isOnInfoPage ? "Work" : "Info";
    

    // --- ADD/REMOVE MOBILE HIDE CLASS ---
    infoButtonElement.classList.toggle('is-hidden-on-mobile', isOnInfoPage);

}

// ==================================================
// CORE SCROLL & ANIMATION LOGIC
// ==================================================
export function goToIndex(index, immediate = false) {
    // Boundary checks
    if (!videoTrack || !scrollItems || scrollItems.length === 0) { return; }
    if (index < 0 || index >= scrollItems.length) { return; }
    if (isAnimating && !immediate) { return; }
    const previousIndex = currentIndex;
    if (index === previousIndex && !immediate) { return; }

    // Update state
    isAnimating = !immediate;
    currentIndex = index;
    console.log(`goToIndex: Updated currentIndex to ${currentIndex}. Previous=${previousIndex}`);
    updateActiveClass();

    const infoSectionIndex = scrollItems.length - 1;
    // Set callback ONLY if target is the info section
    const scrollCompleteCallback = (index === infoSectionIndex) ? animateInfoIn : null; // Use imported function

        controlVideoPlayback(currentIndex, previousIndex, scrollCompleteCallback).catch(err => {
        console.error("[goToIndex] Error controlling video playback:", err);
    });

    const targetYPercent = -currentIndex * 100;

    // Perform Scroll Animation / Set
    if (immediate) {
        gsap.set(videoTrack, { yPercent: targetYPercent });
        isAnimating = false; // Ensure flag is false
        // --- (2e) Manually trigger callback if immediate AND target is info ---
        if (scrollCompleteCallback) {
            console.log("[goToIndex Immediate] Triggering info animation immediately.");
            scrollCompleteCallback(); // Call the callback directly
        }
        console.log(`[goToIndex Immediate Set] Target index: ${currentIndex}.`);
    } else {
        gsap.to(videoTrack, {
            yPercent: targetYPercent,
            duration: animationDuration,
            ease: config.animation.ease,
            overwrite: "auto",
            onComplete: () => {
                // console.log(`[goToIndex Animation COMPLETE] Target index: ${currentIndex}.`);
                isAnimating = false;
            },
            onInterrupt: () => {
                // console.warn(`[goToIndex Animation INTERRUPTED] Target index: ${currentIndex}.`);
                isAnimating = false;
            }
        });
    }
}

export function getCurrentIndex() {
    return currentIndex;
}

// ==================================================
// INPUT HANDLING SETUP (Moved listener logic here)
// ==================================================

/** Attaches button listeners managed by scroll module */
function attachButtonListeners() {
    console.log("--- Running attachButtonListeners from scroll.js ---");

    // --- Info Button Listener ---
    console.log("ABL: Attempting getElementById for Info Button:", config.selectors.infoButtonId);
    // --- RESTORE ORIGINAL VARIABLE NAME ---
    infoButtonElement = document.getElementById(config.selectors.infoButtonId); // Use config ID (no #)
    // --- END RESTORE ---

    if (infoButtonElement) { // Check the variable reference
         console.log("ABL: Found Info Button.", infoButtonElement);
        if (!infoButtonElement._listenerAttachedClick) { // Check flag on the element
            infoButtonElement.style.cursor = 'pointer';
            infoButtonElement.addEventListener('click', (event) => {
                event.preventDefault();
                if (!scrollItems || scrollItems.length === 0) return;
                const infoSectionIndex = scrollItems.length - 1;
                const currentIdx = getCurrentIndex();
                goToIndex(currentIdx === infoSectionIndex ? 0 : infoSectionIndex);
            });
            infoButtonElement._listenerAttachedClick = true; // Set flag on the element
            console.log("Dynamic Info/Work button listener attached.");
        }
    } else {
        console.warn(`ABL: Info button ('#${config.selectors.infoButtonId}') not found.`); // Use config ID
    }

    // --- Title Listener ---
    console.log("ABL: Attempting getElementById for Title:", config.selectors.titleElementId);
    // --- RESTORE ORIGINAL VARIABLE NAME ---
    const titleElementForListener = document.getElementById(config.selectors.titleElementId); // Use config ID (no #)
    // --- END RESTORE ---

    if (titleElementForListener) { // Check the variable reference
        console.log("ABL: Found Title Element.", titleElementForListener);
         if (!titleElementForListener._listenerAttachedClick) { // Check flag on the element
            titleElementForListener.style.cursor = 'pointer';
            titleElementForListener.addEventListener('click', (event) => {
                event.preventDefault();
                goToIndex(0); // Call goToIndex directly
            });
            titleElementForListener._listenerAttachedClick = true; // Set flag on the element
            console.log("Title click listener attached.");
        }
    } else {
        console.warn(`ABL: Main title ('#${config.selectors.titleElementId}') not found.`); // Use config ID
    }


    // --- Menu Toggle Button Listener ---
    const menuToggleButton = document.getElementById(config.selectors.menuToggleButtonId); // Use config ID (no #)
    const navMenu = document.getElementById(config.selectors.navigationContainerId); // Use config ID (no #)
    const menuIconWrapper = menuToggleButton?.querySelector('.icon-menu-wrapper'); // Use class selectors
    const closeIconWrapper = menuToggleButton?.querySelector('.icon-close-wrapper'); // Use class selectors

    // Check if all required elements exist for the Menu Toggle
    if (menuToggleButton && navMenu && menuIconWrapper && closeIconWrapper) {
         console.log("ABL: Found ALL Menu Toggle/Nav Elements.", { menuToggleButton, navMenu, menuIconWrapper, closeIconWrapper });
         // Check flag before adding listener
         if (!menuToggleButton._listenerAttachedClick) {
            console.log("ABL: Attaching Menu Toggle listener NOW."); // <-- This log should appear if condition is met
            menuToggleButton.addEventListener('click', () => {
                // 1. Toggle menu visibility class
                const isVisible = navMenu.classList.toggle('is-visible'); // Use string class name

                // 2. Toggle icon visibility classes
                menuIconWrapper.classList.toggle('is-hidden', isVisible);    // Use string class name
                closeIconWrapper.classList.toggle('is-hidden', !isVisible); // Use string class name

                // 3. Update accessibility state
                menuToggleButton.setAttribute('aria-expanded', isVisible);
                menuToggleButton.setAttribute('aria-label', isVisible ? 'Close Navigation Menu' : 'Open Navigation Menu');

                // --- ADD GSAP Stagger Animation Logic ---
                const navLinks = navMenu.querySelectorAll('.nav-link'); // Find links *inside* the menu

                if (navLinks.length > 0) {
                    if (isVisible) { // If menu just became visible
                         console.log("SCROLL: Animating nav links IN (staggered)");
                         // Ensure links are set to their *starting* animation state instantly first
                         // This handles cases where they might be visible or in wrong position
                         gsap.set(navLinks, { opacity: 0, y: 20 }); // <<< Force starting state

                         // Now animate them in
                         gsap.to(navLinks, {
                            opacity: .7,              // Fade in
                            y: 0,                    // Slide up to original position
                            duration: 0.4,           // Duration for *each* link's animation
                            ease: "power1.out",
                            stagger: 0.08,           // <<< Stagger delay between links (adjust this value!)
                            delay: 0.1,              // <<< Delay before the *first* link starts (adjust this value!)
                            overwrite: true          // Stop any conflicting animations
                        });

                    } else { // If menu just became hidden
                         console.log("SCROLL: Resetting nav links state (instant)");
                         // Instantly reset links back to initial hidden state
                         gsap.set(navLinks, {
                             opacity: 0,
                             y: 20, // Reset to initial offset
                         });
                         // The container hiding transition (opacity, height, etc. in CSS) handles the rest
                    }
                } else {
                    console.warn("SCROLL: No nav links found inside menu for animation.");
                }
                // --- End Handle Animations ---
            });
            menuToggleButton._listenerAttachedClick = true; // Set flag
            console.log("ABL: Menu toggle button listener attached.");
        } else {
             console.log("ABL: Menu toggle listener ALREADY attached."); // <-- This log should appear if flag was true
        }
    } else {
        // Log specifics if something is missing
        console.log("ABL: Menu Toggle Condition Failed.");
        if (!menuToggleButton) console.warn(`ABL: Menu toggle button ('#${config.selectors.menuToggleButtonId}') not found.`);
        if (!navMenu) console.warn(`ABL: Navigation menu ('#${config.selectors.navigationContainerId}') not found.`);
        if (!menuIconWrapper) console.warn("ABL: Menu icon wrapper not found inside toggle button.");
        if (!closeIconWrapper) console.warn("ABL: Close icon wrapper not found inside toggle button.");
        // --- END Log specifics ---
    }
    // --- ADD LOG ---
    console.log("--- attachButtonListeners finished running ---");
    // --- END LOG ---

}

// ==================================================
// INITIALIZATION FUNCTION (EXPORTED)
// ==================================================
export function initializeGsapScroll(videos) {
    setVideos(videos);


    // Find DOM Elements (Hardcoded selectors)
    videoTrack = document.querySelector(config.selectors.track);
    if (!videoTrack) { 
        console.error(`Scroll Init Failed: '${config.selectors.track}' not found.`); return; 
    }
    scrollItems = gsap.utils.toArray(videoTrack.children).filter(el => el.classList.contains(config.selectors.scrollItem.substring(1))); // Remove leading '.' for classList check
    infoButtonElement = document.querySelector(config.selectors.infoButtonId);
    if (scrollItems.length === 0) { 
        console.error(`Scroll Init Failed: No '${config.selectors.scrollItem}' children found.`); return; 
    }
    console.log(`Scroll Initializing...`);

    // Determine Config (Hardcoded values)
    const isTouchDevice = detectTouchDevice();
    animationDuration = isTouchDevice ? config.animation.mobileDuration : config.animation.desktopDuration;
    const throttleInterval = isTouchDevice ? config.input.mobileThrottle : config.input.desktopThrottle;

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
        adjustGlobalVolume,
        getActiveVideoFn,
        togglePlayPauseFn,
        config.input.resizeDebounce,     // Pass config
        config.input.touchSensitivityY,  // Pass config
        config.input.touchSensitivityX   // Pass config
    );

    // Reset State & Set Initial Position
    currentIndex = 0; isAnimating = false; goToIndex(0, true);

    updateInfoButtonState();
    attachButtonListeners();

    console.log("GSAP Scroll Initialization complete.");
}

// --- Re-exports ---
export { toggleGlobalVolume };