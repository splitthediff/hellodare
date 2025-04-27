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


// ================================================== s
// HELPER / STATE UPDATE FUNCTIONS
// ==================================================
function updateActiveClass() {
     if (!scrollItems || scrollItems.length === 0) return;
     scrollItems.forEach((item, i) => {
        item?.classList.toggle(config.selectors.activeScrollItemClass, i === currentIndex);
    });
    updateInfoButtonState();
}

function updateInfoButtonState() {

    if (!infoButtonElement || !scrollItems || scrollItems.length === 0) {
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

// ==================================================
// INPUT HANDLING SETUP (Moved listener logic here)
// ==================================================

/** Attaches button listeners managed by scroll module *//*
function attachButtonListeners() {
    console.log("SCROLL: attachButtonListeners RUNNING");
    let currentInfoButton = document.querySelector(config.selectors.infoButtonId); // Check if it exists before cloning
    let currentTitleElement = document.querySelector(config.selectors.titleElementId); // Check if it exists before cloning

    // Remove previous listeners by cloning and replacing if elements exist
    if (currentInfoButton) {
        const infoButtonClone = currentInfoButton.cloneNode(true);
        currentInfoButton.parentNode.replaceChild(infoButtonClone, currentInfoButton);
        infoButtonElement = infoButtonClone; // Store reference to the NEW cloned element
    } else {
        infoButtonElement = null; // Ensure it's null if not found initially
    }

    if (currentTitleElement) {
        const titleElementClone = currentTitleElement.cloneNode(true);
        currentTitleElement.parentNode.replaceChild(titleElementClone, currentTitleElement);
        // We select it again below for the listener attachment
    }

   // --- Info Button Listener ---
   if (infoButtonElement) { // Check the potentially updated reference
       infoButtonElement.style.cursor = 'pointer';
       infoButtonElement.addEventListener('click', (event) => {
           event.preventDefault();
           if (!scrollItems || scrollItems.length === 0) return;

           const infoSectionIndex = scrollItems.length - 1;
           if (currentIndex === infoSectionIndex) {
               console.log("Work button clicked! Scrolling to index 0.");
               goToIndex(0);
           } else {
               console.log(`Info button clicked! Scrolling to index ${infoSectionIndex}`);
               goToIndex(infoSectionIndex);
           }
       });
       console.log("Dynamic Info/Work button listener attached.");
   } else {
       // Use the CORRECT config key in the log message
       console.warn(`Info button ('${config.selectors.infoButtonId}') not found for dynamic listener.`);
   }

   // --- Title Listener ---
   // Re-select the potentially cloned title element
   const titleElementForListener = document.querySelector(config.selectors.titleElementId);
    if (titleElementForListener) {
        titleElementForListener.style.cursor = 'pointer';
        titleElementForListener.addEventListener('click', (event) => {
            event.preventDefault();
            console.log("Title clicked! Scrolling to index 0.");
            goToIndex(0);
        });
        console.log("Title click listener attached.");
   } else {
        // Use the CORRECT config key in the log message
        console.warn(`Main title ('${config.selectors.titleElementId}') not found for listener.`);
   }

   // --- Menu Toggle Button Listener ---
    // Use config for IDs
    const menuToggleButton = document.getElementById(config.selectors.menuToggleButtonId);
    const navMenu = document.getElementById(config.selectors.navigationContainerId);
    // Keep using class selectors for icon wrappers within the button
    const menuIconWrapper = menuToggleButton?.querySelector('.icon-menu-wrapper');
    const closeIconWrapper = menuToggleButton?.querySelector('.icon-close-wrapper');

    if (menuToggleButton && navMenu && menuIconWrapper && closeIconWrapper) {
        console.log("SCROLL: Menu toggle elements FOUND.");
        if (!menuToggleButton._listenerAttachedClick) {
            console.log("SCROLL: Attaching menu toggle listener NOW.");
            menuToggleButton.addEventListener('click', () => {
                // Use config for class names if you added them, otherwise use strings
                const isVisible = navMenu.classList.toggle('is-visible');
                menuIconWrapper.classList.toggle('is-hidden', isVisible);
                closeIconWrapper.classList.toggle('is-hidden', !isVisible);
                menuToggleButton.setAttribute('aria-expanded', isVisible);
                menuToggleButton.setAttribute('aria-label', isVisible ? 'Close Navigation Menu' : 'Open Navigation Menu');
            });
            menuToggleButton._listenerAttachedClick = true;
            console.log("SCROLL: Menu toggle listener attached & flag set.");
        } else {
            console.log("SCROLL: Menu toggle listener ALREADY attached (flag was true)."); // Log 15
        }
    } else {
        // Use config in warnings
        if (!menuToggleButton) console.warn(`Menu toggle button ('${config.selectors.menuToggleButtonId}') not found.`);
        if (!navMenu) console.warn(`Navigation menu ('${config.selectors.navigationContainerId}') not found.`);
        if (!menuIconWrapper) console.warn("Menu icon wrapper not found.");
        if (!closeIconWrapper) console.warn("Close icon wrapper not found.");
    }
    // --- END MENU TOGGLE LISTENER ---

}*/

function attachButtonListeners() {
    console.log("--- Running attachButtonListeners from scroll.js ---");
    console.log("kjfdhlaflfhdighadfi ohv;ohgihghdlgdfhl");

    // --- Info Button Listener ---
    console.log("ABL: Attempting getElementById for Info Button:", config.selectors.infoButtonId);
    const infoButton = document.getElementById(config.selectors.infoButtonId); // Use config ID (no #)
    if (infoButton) {
        // ... (Info button listener logic) ...
         console.log("ABL: Found Info Button.", infoButton);
         if (!infoButton._listenerAttachedClick) { /* ... add listener ... */ infoButton._listenerAttachedClick = true; console.log("Dynamic Info/Work button listener attached."); }
    } else {
        console.warn(`ABL: Info button ('${config.selectors.infoButtonId}') not found.`); // Use config ID
    }

    // --- Title Listener ---
    console.log("ABL: Attempting getElementById for Title:", config.selectors.titleElementId);
    const titleElement = document.getElementById(config.selectors.titleElementId); // Use config ID (no #)
    if (titleElement) {
        // ... (Title listener logic) ...
        console.log("ABL: Found Title Element.", titleElement);
         if (!titleElement._listenerAttachedClick) { /* ... add listener ... */ titleElement._listenerAttachedClick = true; console.log("Title click listener attached."); }
    } else {
        console.warn(`ABL: Main title ('${config.selectors.titleElementId}') not found.`); // Use config ID
    }


    // --- Menu Toggle Button Listener ---
    console.log("ABL: Attempting getElementById for Menu Button:", config.selectors.menuToggleButtonId);
    const menuToggleButton = document.getElementById(config.selectors.menuToggleButtonId); // Use config ID (no #)

    console.log("ABL: Attempting getElementById for Nav Menu:", config.selectors.navigationContainerId);
    const navMenu = document.getElementById(config.selectors.navigationContainerId); // Use config ID (no #)

    console.log("ABL: Attempting querySelector for Menu Icon Wrapper:", '.icon-menu-wrapper', 'relative to button:', !!menuToggleButton);
    const menuIconWrapper = menuToggleButton?.querySelector('.icon-menu-wrapper'); // Use class selectors

    console.log("ABL: Attempting querySelector for Close Icon Wrapper:", '.icon-close-wrapper', 'relative to button:', !!menuToggleButton);
    const closeIconWrapper = menuToggleButton?.querySelector('.icon-close-wrapper'); // Use class selectors


    // Check if all required elements exist
    if (menuToggleButton && navMenu && menuIconWrapper && closeIconWrapper) {
         console.log("ABL: Found ALL Menu Toggle/Nav Elements.", { menuToggleButton, navMenu, menuIconWrapper, closeIconWrapper });
         // Check flag before adding listener
         if (!menuToggleButton._listenerAttachedClick) {
            console.log("ABL: Attaching Menu Toggle listener NOW."); // <-- This log should appear if condition is met
            menuToggleButton.addEventListener('click', () => {
                // ... toggle classes ...
            });
            menuToggleButton._listenerAttachedClick = true; // Set flag
            console.log("ABL: Menu toggle button listener attached.");
        } else {
            console.log("ABL: Menu toggle listener ALREADY attached.");
        }
    } else {
        // --- Log specifics if something is missing ---
        console.log("ABL: Menu Toggle Condition Failed.");
        if (!menuToggleButton) console.warn(`ABL: Menu toggle button ('${config.selectors.menuToggleButtonId}') not found.`);
        if (!navMenu) console.warn(`ABL: Navigation menu ('#${config.selectors.navigationContainerId}') not found.`);
        if (!menuIconWrapper) console.warn("ABL: Menu icon wrapper not found inside toggle button.");
        if (!closeIconWrapper) console.warn("ABL: Close icon wrapper not found inside toggle button.");
        // --- END Log specifics ---
    }
    // --- END MENU TOGGLE LISTENER ---

    console.log("--- attachButtonListeners finished running ---");
}

// ==================================================
// INITIALIZATION FUNCTION (EXPORTED)
// ==================================================
export function initializeGsapScroll(videos) {
    console.log("SCROLL: initializeGsapScroll START");
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
        config.input.resizeDebounce,      // Pass config
        config.input.touchSensitivityY,  // Pass config
        config.input.touchSensitivityX   // Pass config
    );

    // Reset State & Set Initial Position
    currentIndex = 0; isAnimating = false; goToIndex(0, true);

    updateInfoButtonState();
    console.log("SCROLL: Calling attachButtonListeners");
    attachButtonListeners();

    console.log("GSAP Scroll Initialization complete.");
}

// --- Re-exports ---
export { toggleGlobalVolume };