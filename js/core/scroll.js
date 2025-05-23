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
import { handleAllVideoAndOverlayResizes } from './playlistManager.js';
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
    const scrollCompleteCallback = (index === infoSectionIndex) ? animateInfoIn : null;
        controlVideoPlayback(currentIndex, previousIndex, scrollCompleteCallback).catch(err => {
        console.error("[goToIndex] Error controlling video playback:", err);
    });

    const targetYPercent = -currentIndex * 100;

    // Perform Scroll Animation / Set
    if (immediate) {
        gsap.set(videoTrack, { yPercent: targetYPercent });
        isAnimating = false;
        if (scrollCompleteCallback) {
            console.log("[goToIndex Immediate] Triggering info animation immediately.");
            scrollCompleteCallback(); 
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

    if (infoButtonElement) { // Check the variable reference
         console.log("ABL: Found Info Button.", infoButtonElement); // Check flag on the element
            infoButtonElement.style.cursor = 'pointer';
            infoButtonElement.addEventListener('click', (event) => {
                event.preventDefault();
                if (!scrollItems || scrollItems.length === 0) return;
                const infoSectionIndex = scrollItems.length - 1;
                const currentIdx = getCurrentIndex();
                goToIndex(currentIdx === infoSectionIndex ? 0 : infoSectionIndex);
            });
            console.log("Dynamic Info/Work button listener attached.");
    } else {
        console.warn(`ABL: Info button ('#${config.selectors.infoButtonId}') not found.`);
    }

    // --- Title Listener ---
    console.log("ABL: Attempting getElementById for Title:", config.selectors.titleElementId);
    const titleElementForListener = document.getElementById(config.selectors.titleElementId);

    if (titleElementForListener) { // Check the variable reference
        console.log("ABL: Found Title Element.", titleElementForListener);
            titleElementForListener.style.cursor = 'pointer';
            titleElementForListener.addEventListener('click', (event) => {
                event.preventDefault();
                goToIndex(0); // Call goToIndex directly
            });
            console.log("Title click listener attached.");
    } else {
        console.warn(`ABL: Main title ('#${config.selectors.titleElementId}') not found.`);
    }

    // --- Menu Toggle Button Listener ---
    const menuToggleButton = document.getElementById(config.selectors.menuToggleButtonId);
    const navMenu = document.getElementById(config.selectors.navigationContainerId);
    const menuIconWrapper = menuToggleButton?.querySelector('.icon-menu-wrapper');
    const closeIconWrapper = menuToggleButton?.querySelector('.icon-close-wrapper');

    // Check if all required elements exist for the Menu Toggle
    if (menuToggleButton && navMenu && menuIconWrapper && closeIconWrapper) {
           menuToggleButton.addEventListener('click', () => {
               const menuIsCurrentlyVisible = navMenu.classList.contains('is-visible');

                updateMenuToggleUI(menuIsCurrentlyVisible, menuIconWrapper, closeIconWrapper, menuToggleButton);
                const activeItemElement = document.querySelector('.scroll-item.active-scroll-item');
               // --- Trigger Open/Close Sequence ---
               if (!menuIsCurrentlyVisible) { // If menu is currently hidden (about to become visible)
                    console.log("SCROLL: Triggering Menu OPEN sequence from button.");
                    openNavMenu(navMenu);
                    if (activeItemElement){
                        console.log ('ACTIVE ITEM ELEMENT TRIGGERED');
                        console.log(activeItemElement);
                        blurActiveElement(activeItemElement);
                        updateTitleStyleBasedOnViewport();
                    }
                } else { // If menu is currently visible (about to become hidden)
                    console.log("SCROLL: Triggering Menu CLOSE sequence from button.");
                    closeNavMenu(); 
                    if (activeItemElement){
                        console.log ('ACTIVE ITEM ELEMENT TRIGGERED');
                        console.log(activeItemElement);
                        unblurActiveElement(activeItemElement);
                        updateTitleStyleBasedOnViewport();
                    }
                }

               //const activeItemElement = document.querySelector('.scroll-item.video-item.active-scroll-item');
               //const activeItemElement = document.querySelector('.scroll-item.active-scroll-item');
                
           });
           console.log("SCROLL: Menu toggle button listener attached.");
    } else {
        console.log("ABL: Menu Toggle Condition Failed.");
        if (!menuToggleButton) console.warn(`ABL: Menu toggle button ('#${config.selectors.menuToggleButtonId}') not found.`);
        if (!navMenu) console.warn(`ABL: Navigation menu ('#${config.selectors.navigationContainerId}') not found.`);
        if (!menuIconWrapper) console.warn("ABL: Menu icon wrapper not found inside toggle button.");
        if (!closeIconWrapper) console.warn("ABL: Close icon wrapper not found inside toggle button.");
    }
    console.log("--- attachButtonListeners finished running ---");
}

function openNavMenu(navMenu){
    navMenu.classList.remove('is-hidden'); // Remove hidden class
    navMenu.classList.add('is-visible');   // Add visible class

    const navLinks = navMenu.querySelectorAll('.nav-link');
    if (navLinks.length > 0) {
        navLinks.forEach(link => link.style.transition = 'none');
        gsap.set(navLinks, { opacity: 0, y: -5 }); // initial state
        gsap.to(navLinks, {
            opacity: config.navigation.navOpacity,
            y: 0,
            duration: 0.8,
            ease: "power1.out",
            stagger: 0.03,
            delay: 0.1,
            overwrite: true,
            onComplete: () => {
                // Clear only opacity after animation completes
                navLinks.forEach(link => link.style.removeProperty('opacity'));
                navLinks.forEach(link => link.style.removeProperty('transform'));
                navLinks.forEach(link => link.style.removeProperty('transition'));
            }
        });
    }
}

export function closeNavMenu() {
    console.log("SCROLL: --- Running closeNavMenu START ---");

    const navMenu = document.getElementById(config.selectors.navigationContainerId);
    const menuToggleButton = document.getElementById(config.selectors.menuToggleButtonId);
    const menuIconWrapper = menuToggleButton?.querySelector('.icon-menu-wrapper');
    const closeIconWrapper = menuToggleButton?.querySelector('.icon-close-wrapper');
    const navLinks = navMenu?.querySelectorAll('.nav-link'); // Find links here

    if (!navMenu || !menuToggleButton || !menuIconWrapper || !closeIconWrapper) {
        console.warn("SCROLL: Cannot close menu - elements not found in closeNavMenu.");
        return;
    }

    // Check if menu is currently visible before closing (Keep this check)
    if (!navMenu.classList.contains('is-visible')) {
        console.log("SCROLL: closeNavMenu called, but menu already hidden.");
        return;
    }

    // --- Hiding Logic (Based on your last known working closing logic) ---
    // Use class manipulation to trigger CSS transitions
    navMenu.classList.remove('is-visible'); // Trigger CSS transition to hide
    navMenu.classList.add('is-hidden');    // Add the hidden class back
    navMenu.style.overflowY = 'hidden'; // Ensure overflow hidden immediately

    // Hide Nav Links (instant reset) via GSAP (if they animate in)
    if (navLinks && navLinks.length > 0) {
       gsap.to(navLinks, { opacity: 0, y: -5, duration: 0.8, ease: "power2.out", stagger: 0.03, delay: 0.1, overwrite: true , 
            onComplete: () => {
                // Clear only opacity after animation completes
                // navLinks.forEach(link => link.style.removeProperty('opacity'));
                navLinks.forEach(link => link.style.removeProperty('transform'));
            }
        });
    }

    console.log("SCROLL: --- closeNavMenu FINISHED ---");
}

export function blurActiveElement(activeItemElement) {
    const blurTargets = getBlurTargets(activeItemElement);
    console.log("BLUR: Targets found:", blurTargets);

    if (blurTargets.length === 0) {
        console.warn("BLUR: No blur targets found for", activeItemElement);
        return;
    }

    gsap.to(blurTargets, {
        filter: config.animation.blurNavOpen,
        opacity: config.animation.opacityNavOpen,
        duration: 0.3,
        ease: "power1.out",
        overwrite: true,
    });
}

export function unblurActiveElement(activeItemElement) {
    const blurTargets = getBlurTargets(activeItemElement);
    if (blurTargets.length === 0) return;

    gsap.to(blurTargets, {
        filter: config.animation.blurReset,
        opacity: 1,
        duration: 0.3,
        ease: "power1.out",
        overwrite: true,
    });
}

// Shared helper function
function getBlurTargets(activeItemElement) {
    const blurTargets = [];

    // For video items
    const videoWrapper = activeItemElement.querySelector('.video-aspect-wrapper');
    const infoOverlay = activeItemElement.querySelector('.video-info-overlay');

    if (videoWrapper) blurTargets.push(videoWrapper);
    if (infoOverlay) blurTargets.push(infoOverlay);

    // Additional check for the info section
    const isInfoSection = activeItemElement.classList.contains('info-section');
    if (isInfoSection) {
        const infoBlocks = activeItemElement.querySelectorAll('.info-block, .info-content, .info-wrapper'); // Update to your actual class names
        if (infoBlocks.length > 0) {
            blurTargets.push(...infoBlocks);
        } else {
            // Fallback: blur the whole section
            blurTargets.push(activeItemElement);
        }
    }

    return blurTargets;
}

export function updateTitleStyleBasedOnViewport() {
    const title = document.getElementById('main-page-title');
    const navMenu = document.getElementById(config.selectors.navigationContainerId);
    const minHeight = config.breakpoints.minHeight; // Minimum height for viewport check

    if (!title || !navMenu) return;

    //const isMenuVisible = navMenu.classList.contains('is-visible');
    const isShortViewport = window.innerHeight < minHeight;

    if (isShortViewport) {
        title.classList.add('title-cornered');
    } else {
        title.classList.remove('title-cornered');
    }
}

export function updateMenuToggleUI(menuIsCurrentlyVisible, menuIconWrapper, closeIconWrapper, menuToggleButton) {
    menuIconWrapper.classList.toggle('is-hidden', !menuIsCurrentlyVisible);
    closeIconWrapper.classList.toggle('is-hidden', menuIsCurrentlyVisible);
    // ARIA labels should reflect the NEW state (after toggle)
    menuToggleButton.setAttribute('aria-expanded', !menuIsCurrentlyVisible);
    menuToggleButton.setAttribute('aria-label', !menuIsCurrentlyVisible ? 'Close Navigation Menu' : 'Open Navigation Menu');
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
    infoButtonElement = document.getElementById(config.selectors.infoButtonId);
    if (!infoButtonElement) {
        console.error(`[CRITICAL ERROR] Info button with ID '${config.selectors.infoButtonId}' was NOT found in the DOM during initializeGsapScroll.`);
        console.error(`This likely means the HTML element is missing, or its ID is incorrect, or it's being dynamically removed/re-added by another script.`);
    } else {
        console.log(`[SUCCESS] Info button found and assigned:`, infoButtonElement);
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
        handleAllVideoAndOverlayResizes,
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