// js/core/scroll.js

// --- Imports ---
// Assuming utils, videoController, inputManager are in correct relative paths
import { throttle, detectTouchDevice } from '../utils/utils.js';
import {
    setVideos,
    controlVideoPlayback,
    adjustGlobalVolume,
    toggleGlobalVolume, 
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

// --- Module-scoped menu elements ---
let menuToggleButton = null;
let navMenu = null;
let menuIconWrapper = null;
let closeIconWrapper = null;

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

    //infoButtonElement.innerText = isOnInfoPage ? "Work" : "Info";  // Toggle text based on current index - currently not used (to change - also need to adjust scroll index in attachButtonListeners)
    infoButtonElement.innerText = isOnInfoPage ? "Info" : "Info";  // Always shows "Info"
    
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

    controlVideoPlayback(currentIndex, previousIndex, null).catch(err => {
        console.error("[goToIndex] Error controlling video playback:", err);
    });

    const targetYPercent = -currentIndex * 100;

    // Perform Scroll Animation / Set
    if (immediate) {
        gsap.set(videoTrack, { yPercent: targetYPercent });
        isAnimating = false;
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
    infoButtonElement = document.getElementById(config.selectors.infoButtonId);

    if (infoButtonElement) { // Check the variable reference
         console.log("ABL: Found Info Button.", infoButtonElement); // Check flag on the element
            infoButtonElement.style.cursor = 'pointer';
            infoButtonElement.addEventListener('click', (event) => {
                event.preventDefault();
                if (!scrollItems || scrollItems.length === 0) return;
                const infoSectionIndex = scrollItems.length - 1;
                const currentIdx = getCurrentIndex();
                goToIndex(currentIdx === infoSectionIndex ? infoSectionIndex : infoSectionIndex);
                closeNavMenu();
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
                closeNavMenu();
            });
            console.log("Title click listener attached.");
    } else {
        console.warn(`ABL: Main title ('#${config.selectors.titleElementId}') not found.`);
    }

    // --- Menu Toggle Button Listener ---
    if (menuToggleButton && navMenu && menuIconWrapper && closeIconWrapper) {
           menuToggleButton.addEventListener('click', () => {
                const menuIsCurrentlyVisible = navMenu.classList.contains('is-visible');
                console.log(`SCROLL: Menu toggle clicked. menuIsCurrentlyVisible (before action): ${menuIsCurrentlyVisible}`); // ADD/UPDATE THIS LOG

                // --- Trigger Open/Close Sequence ---
                if (!menuIsCurrentlyVisible) { 
                    console.log("SCROLL: Triggering Menu OPEN sequence from button.");
                    openNavMenu();
                } else { 
                    console.log("SCROLL: Triggering Menu CLOSE sequence from button.");
                    closeNavMenu();
                }
                console.log(`SCROLL: Nav menu state after toggle call: navMenu.classList.contains('is-visible') = ${navMenu.classList.contains('is-visible')}`);

            });
           console.log("SCROLL: Menu toggle button listener attached.");
    } else {
        console.log("ABL: Menu Toggle Condition Failed.");
    }
    console.log("--- attachButtonListeners finished running ---");
}

function openNavMenu(){ 
    console.log("SCROLL: Entering openNavMenu.");

    if (!menuToggleButton || !navMenu || !menuIconWrapper || !closeIconWrapper) { 
        console.warn("SCROLL: Menu toggle elements not found in openNavMenu. Cannot proceed.");
        return;
    }

    updateMenuToggleUI(true);

    const activeItemElement = document.querySelector('.scroll-item.active-scroll-item');
    if (activeItemElement) {
        console.log('SCROLL: Calling blurActiveElement from openNavMenu.');
        blurActiveElement(activeItemElement);
    }

    const navLinks = navMenu.querySelectorAll('.nav-link');
    if (navLinks.length > 0) {
        navLinks.forEach(link => link.style.transition = 'none');
        gsap.set(navLinks, { opacity: 0, y: -5 });
        gsap.to(navLinks, {
            opacity: config.navigation.navOpacity,
            y: 0,
            duration: 0.8,
            ease: "power1.out",
            stagger: 0.03,
            delay: 0.1,
            overwrite: true,
            onComplete: () => {
                navLinks.forEach(link => link.style.removeProperty('opacity'));
                navLinks.forEach(link => link.style.removeProperty('transform'));
                navLinks.forEach(link => link.style.removeProperty('transition'));
            }
        });
    }
}

export function closeNavMenu() {
    console.log("SCROLL: Entering closeNavMenu.");

    const navLinks = navMenu?.querySelectorAll('.nav-link');

    if (!navMenu || !menuToggleButton || !menuIconWrapper || !closeIconWrapper) {
        console.warn("SCROLL: Cannot close menu - elements not found in closeNavMenu.");
        return;
    }

    if (!navMenu.classList.contains('is-visible')) {
        console.log("SCROLL: closeNavMenu called, but menu already hidden.");
        return;
    }

    updateMenuToggleUI(false); 
    console.log(`SCROLL: Inside closeNavMenu. navMenu.classList.contains('is-visible') = ${navMenu.classList.contains('is-visible')}`); 

    const activeItemElement = document.querySelector('.scroll-item.active-scroll-item');
    if (activeItemElement) {
        console.log('SCROLL: Calling blurActiveElement from closeNavMenu.');
        blurActiveElement(activeItemElement); // This call will now result in unblur
    }

    // Hide Nav Links (instant reset) via GSAP (if they animate in)
    if (navLinks && navLinks.length > 0) {
       gsap.to(navLinks, { opacity: 0, y: -5, duration: 0.8, ease: "power2.out", stagger: 0.03, delay: 0.1, overwrite: true , 
            onComplete: () => {
                navLinks.forEach(link => link.style.removeProperty('transform'));
            }
        });
    }

    console.log("SCROLL: --- closeNavMenu FINISHED ---");
}

export function blurActiveElement(activeItemElement){
    const blurTargets = [];

    // Video item targets
    const activeVideoContent = activeItemElement.querySelector('.video-aspect-wrapper');
    const activeVideoInfoOverlay = activeItemElement.querySelector('.video-info-overlay');
    if (activeVideoContent) blurTargets.push(activeVideoContent);
    if (activeVideoInfoOverlay) blurTargets.push(activeVideoInfoOverlay);

    // --- UPDATED LOGIC FOR INTRO SECTION ---
    if (activeItemElement.id === config.selectors.introSectionId.substring(1)) {
        // Target the main info content container directly
        const infoContentContainer = activeItemElement.querySelector('.info-content');
        if (infoContentContainer) {
            blurTargets.push(infoContentContainer); // Add the info-content div itself
        }
    }

    // --- UPDATED LOGIC FOR INFO SECTION ---
    if (activeItemElement.id === config.selectors.infoSectionId.substring(1)) {
        // Target the main info content container directly
        const infoContentContainer = activeItemElement.querySelector('.info-content');
        if (infoContentContainer) {
            blurTargets.push(infoContentContainer); // Add the info-content div itself
        }
    }
    // --- END UPDATED LOGIC --

    if (blurTargets.length > 0) {
        if (InputManager.NavMenuOpen() && InputManager.checkForMobile()) {
            console.log("SCROLL: Applying blur/opacity to active content (nav open).");
            gsap.to(blurTargets, {
                filter: config.animation.blurNavOpen,
                opacity: config.animation.opacityNavOpen,
                duration: 0.3,
                ease: "power1.out",
                overwrite: true,
            });
        } else {
            console.log("SCROLL: Removing blur/opacity from active content (nav closed).");
            gsap.to(blurTargets, {
                filter: config.animation.blurReset,
                opacity: 1,
                duration: 0.3,
                ease: "power1.out",
                overwrite: true,
            });
        }
    }
}

export function updateTitleStyleBasedOnViewport() {
    const title = document.getElementById('main-page-title');
    const navMenu = document.getElementById(config.selectors.navigationContainerId);
    const minHeight = config.breakpoints.minHeight; // Minimum height for viewport check

    if (!title || !navMenu) return;

    const isShortViewport = window.innerHeight < minHeight;

    if (isShortViewport) {
        title.classList.add('title-cornered');
    } else {
        title.classList.remove('title-cornered');
    }
}

export function updateMenuToggleUI(menuIsCurrentlyVisible) { 

    if (!menuToggleButton || !navMenu || !menuIconWrapper || !closeIconWrapper) { // Safety check
        console.warn("SCROLL: Cannot update menu UI; one or more global menu elements not found.");
        return;
    }

    if (menuIsCurrentlyVisible) {
        navMenu.classList.remove('is-hidden');
        navMenu.classList.add('is-visible');
        navMenu.style.overflowY = 'hidden'; 
    } else {
        navMenu.classList.remove('is-visible');
        navMenu.classList.add('is-hidden');
        navMenu.style.overflowY = 'hidden';
    }

    menuIconWrapper.classList.toggle('is-hidden', menuIsCurrentlyVisible);
    closeIconWrapper.classList.toggle('is-hidden', !menuIsCurrentlyVisible);

    menuToggleButton.setAttribute('aria-expanded', menuIsCurrentlyVisible);
    menuToggleButton.setAttribute('aria-label', menuIsCurrentlyVisible ? 'Close Navigation Menu' : 'Open Navigation Menu');
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

    // --- Initialize module-scoped menu elements
    menuToggleButton = document.getElementById(config.selectors.menuToggleButtonId);
    navMenu = document.getElementById(config.selectors.navigationContainerId);
    menuIconWrapper = menuToggleButton?.querySelector('.icon-menu-wrapper');
    closeIconWrapper = menuToggleButton?.querySelector('.icon-close-wrapper');

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

    const resizeCallback = () => {
        goToIndex(currentIndex, true);

        if (menuToggleButton && navMenu && menuIconWrapper && closeIconWrapper) {
            console.log("SCROLL: Resizing. Forcing menu state to CLOSED.");
            updateMenuToggleUI(false); 
        } else {
            console.error(`%c[SCROLL] Menu Toggle Resize Sync FAILED: One or more menu elements not found!`, "color: red; font-weight: bold;");
        }

    updateTitleStyleBasedOnViewport();
    };
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
        config.input.resizeDebounce,     
        config.input.touchSensitivityY,  
        config.input.touchSensitivityX   
    );

    // Reset State & Set Initial Position
    currentIndex = 0; isAnimating = false; goToIndex(0, true);

    updateInfoButtonState();
    attachButtonListeners();

    if (menuToggleButton && navMenu && menuIconWrapper && closeIconWrapper) {
        updateMenuToggleUI(false); 
    } else {
        console.error(`%c[SCROLL] Menu Toggle Initial State FAILED: One or more menu elements not found!`, "color: red; font-weight: bold;");
    }

    updateTitleStyleBasedOnViewport();

    console.log("GSAP Scroll Initialization complete.");
}

// --- Re-exports ---
export { toggleGlobalVolume };