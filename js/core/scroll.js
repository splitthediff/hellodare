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
    infoButtonElement = document.getElementById(config.selectors.infoButtonId);

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
        console.warn(`ABL: Info button ('#${config.selectors.infoButtonId}') not found.`);
    }

    // --- Title Listener ---
    console.log("ABL: Attempting getElementById for Title:", config.selectors.titleElementId);
    const titleElementForListener = document.getElementById(config.selectors.titleElementId);

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
        console.warn(`ABL: Main title ('#${config.selectors.titleElementId}') not found.`);
    }

    // --- Menu Toggle Button Listener ---
    const menuToggleButton = document.getElementById(config.selectors.menuToggleButtonId);
    const navMenu = document.getElementById(config.selectors.navigationContainerId);
    const menuIconWrapper = menuToggleButton?.querySelector('.icon-menu-wrapper');
    const closeIconWrapper = menuToggleButton?.querySelector('.icon-close-wrapper');

    // Check if all required elements exist for the Menu Toggle
    if (menuToggleButton && navMenu && menuIconWrapper && closeIconWrapper) {
        if (!menuToggleButton._listenerAttachedClick) {
           menuToggleButton.addEventListener('click', () => {
               const menuIsCurrentlyVisible = navMenu.classList.contains('is-visible');
/*
               updateMenuToggleUI(menuIsCurrentlyVisible, menuIconWrapper, closeIconWrapper, menuToggleButton);
*/
               
               menuIconWrapper.classList.toggle('is-hidden', !menuIsCurrentlyVisible); 
               closeIconWrapper.classList.toggle('is-hidden', menuIsCurrentlyVisible);
               // ARIA labels should reflect the state AFTER click (the NEW state)
               menuToggleButton.setAttribute('aria-expanded', !menuIsCurrentlyVisible); 
               menuToggleButton.setAttribute('aria-label', !menuIsCurrentlyVisible ? 'Close Navigation Menu' : 'Open Navigation Menu');

               // --- Trigger Open/Close Sequence ---
               if (!menuIsCurrentlyVisible) { // If menu is currently hidden (about to become visible)
                    console.log("SCROLL: Triggering Menu OPEN sequence from button.");
                    openNavMenu(navMenu);
                } else { // If menu is currently visible (about to become hidden)
                    console.log("SCROLL: Triggering Menu CLOSE sequence from button.");
                    closeNavMenu(); 
                }

                const activeItemElement = document.querySelector('.scroll-item.video-item.active-scroll-item');
                if (activeItemElement){
                    console.log ('ACTIVE ITEM ELEMENT TRIGGERED');
                    blurActiveElement(activeItemElement);
                }
           });

           menuToggleButton._listenerAttachedClick = true;
           console.log("SCROLL: Menu toggle button listener attached.");
        } else {
            console.log("ABL: Menu toggle listener ALREADY attached.");
        }
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
        gsap.set(navLinks, { opacity: 0, y: 10 }); // initial state
        gsap.to(navLinks, { opacity: .8, y: 0, duration: 0.4, ease: "power1.out", stagger: 0.08, delay: 0.1, overwrite: true, clearProps: "opacity,transform" });
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
       //gsap.set(navLinks, { opacity: 0, y: 10, clearProps: "opacity,transform" });
       gsap.to(navLinks, { opacity: 0, y: -20, duration: 0.4, ease: "power2.out", stagger: 0.1, delay: 0.1, overwrite: true , clearProps: "opacity,transform"});
    }
    console.log("SCROLL: --- closeNavMenu FINISHED ---");
}

export function blurActiveElement(activeItemElement){
    const activeVideoContent = activeItemElement.querySelector('.video-aspect-wrapper');
    const activeInfoOverlay = activeItemElement.querySelector('.video-info-overlay');
    const blurTargets = [];
    if (activeVideoContent) blurTargets.push(activeVideoContent);
    if (activeInfoOverlay) blurTargets.push(activeInfoOverlay);

    if (blurTargets.length > 0 && typeof gsap !== 'undefined') {
        if (InputManager.NavMenuOpen() && InputManager.checkForMobile()) { // If menu is currently hidden (about to become open)
            console.log("SCROLL: Applying blur/opacity to active video content.");
            gsap.to(blurTargets, {
                filter: config.animation.blurNavOpen,
                opacity: config.animation.opacityNavOpen, 
                duration: 0.3,
                ease: "power1.out",
                overwrite: true, // Crucial: Overwrite any ongoing ScrollTrigger animation
            });
        } else { // If menu is currently visible (about to become hidden)
            console.log("SCROLL: Removing blur/opacity from active video content.");
            gsap.to(blurTargets, {
                filter: config.animation.blurReset, // Target blur (normal)
                opacity: 1, // Target opacity (normal)
                duration: 0.3, 
                ease: "power1.out",
                overwrite: true, // Crucial
            });
        }
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