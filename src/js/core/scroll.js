// ./js/core/scroll.js

// --- Imports ---
// Assuming utils, videoController, inputManager are in correct relative paths
import { throttle, detectTouchDevice } from "../utils/utils.js";
import {
  setVideos,
  controlVideoPlayback,
  adjustGlobalVolume,
  toggleGlobalVolume,
} from "./videoController.js";
import { handleAllVideoAndOverlayResizes } from "./playlistManager.js";
import * as InputManager from "../modules/inputManager.js";
import { config } from "../config.js";

// --- Module State ---
let currentIndex = 0;
let scrollItems = [];
let videoTrack = null;
let isAnimating = false;
let infoButtonElement = null;
let introArrowTween = null;

// --- Module-scoped menu elements ---
let menuToggleButton = null;
let navMenu = null;

// --- Config Variables ---
let animationDuration = config.animation.desktopDuration;

// ==================================================
// HELPER / STATE UPDATE FUNCTIONS
// ==================================================
function updateActiveClass() {
  if (!scrollItems || scrollItems.length === 0) return;
  scrollItems.forEach((item, i) => {
    item?.classList.toggle(
      config.selectors.activeScrollItemClass,
      i === currentIndex
    );
  });

  const navLinks = document.querySelectorAll("#main-navigation .nav-link"); // Select all nav links
  if (navLinks.length > 0) {
    navLinks.forEach((link) => {
      const linkIndex = parseInt(link.dataset.index, 10);
      link.classList.remove("active");
      if (!isNaN(linkIndex) && linkIndex === currentIndex) {
        link.classList.add("active");
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

  infoButtonElement.innerText = "Info";

  // --- ADD/REMOVE MOBILE HIDE CLASS ---
  infoButtonElement.classList.toggle("is-hidden-on-mobile", isOnInfoPage);
}

// ==================================================
// CORE SCROLL & ANIMATION LOGIC
// ==================================================

export function goToIndex(index, immediate = false) {
  if (!videoTrack || !scrollItems || scrollItems.length === 0) {
    return;
  }
  if (index < 0 || index >= scrollItems.length) {
    return;
  }
  const previousIndex = currentIndex;
  const outroIndex = scrollItems.length - 1;

  if (index === previousIndex && !immediate) {
    return;
  }

  isAnimating = !immediate;
  currentIndex = index;
  updateActiveClass();

  // The intro animation now plays every time, as requested.
  if (index === 0) {
    setTimeout(() => animateIntroIn(scrollItems[0]), 50);
  } else if (index === outroIndex) {
    setTimeout(() => animateOutroIn(scrollItems[outroIndex]), 50);
  }

  // Handle OUT animations (when scrolling AWAY from a slide)
  if (previousIndex === 0 && index !== 0) {
    resetIntroAnimation(scrollItems[0]);
  } else if (previousIndex === outroIndex && index !== outroIndex) {
    resetOutroAnimation(scrollItems[outroIndex]);
  }

  controlVideoPlayback(currentIndex, previousIndex, null).catch((err) => {
    console.error("[goToIndex] Error controlling video playback:", err);
  });

  const targetYPercent = -currentIndex * 100;

  if (immediate) {
    gsap.set(videoTrack, { yPercent: targetYPercent });
    isAnimating = false;
  } else {
    gsap.to(videoTrack, {
      yPercent: targetYPercent,
      duration: animationDuration,
      ease: config.animation.ease,
      overwrite: "auto",
      onComplete: () => {
        isAnimating = false;
      },
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
  // --- Info Button Listener ---
  infoButtonElement = document.getElementById(config.selectors.infoButtonId);

  if (infoButtonElement) {
    infoButtonElement.style.cursor = "pointer";
    infoButtonElement.addEventListener("click", (event) => {
      event.preventDefault();
      if (!scrollItems || scrollItems.length === 0) return;
      const infoSectionIndex = scrollItems.length - 1;
      const currentIdx = getCurrentIndex();
      goToIndex(infoSectionIndex); 
      closeNavMenu();
    });
  } 

  // --- Title Listener ---
  const titleElementForListener = document.getElementById(
    config.selectors.titleElementId
  );

  if (titleElementForListener) {
    titleElementForListener.style.cursor = "pointer";
    titleElementForListener.addEventListener("click", (event) => {
      event.preventDefault();
      goToIndex(0); 
      closeNavMenu();
    });
  }

  // --- Menu Toggle Button Listener ---
  if (menuToggleButton && navMenu) {
    menuToggleButton.addEventListener("click", () => {
      const menuIsCurrentlyVisible = navMenu.classList.contains("is-visible");
      if (!menuIsCurrentlyVisible) {
        goToIndex(0);
        openNavMenu();
      } else {
        closeNavMenu();
      }
    });
  } 
}

function openNavMenu() {
  if (!menuToggleButton || !navMenu) {
    return;
  }

  updateMenuToggleUI(true);

  const activeItemElement = document.querySelector(
    ".scroll-item.active-scroll-item"
  );
  if (activeItemElement) {
    blurActiveElement(activeItemElement);
  }

  const navLinks = navMenu.querySelectorAll(".nav-link");
  if (navLinks.length > 0) {
    navLinks.forEach((link) => (link.style.transition = "none"));
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
        navLinks.forEach((link) => link.style.removeProperty("opacity"));
        navLinks.forEach((link) => link.style.removeProperty("transform"));
        navLinks.forEach((link) => link.style.removeProperty("transition"));
      },
    });
  }
}

export function closeNavMenu() {
  if (!navMenu || !menuToggleButton) {
    return;
  }
  if (!navMenu.classList.contains("is-visible")) {
    return;
  }

  updateMenuToggleUI(false);

  // Un-blur the current slide when the menu is closed.
  const activeItemElement = document.querySelector(
    ".scroll-item.active-scroll-item"
  );
  if (activeItemElement) {
    blurActiveElement(activeItemElement);
  }
}

export function blurActiveElement(activeItemElement) {
  // --- This function now ignores the Intro and Outro sections ---
  const isTextSection =
    activeItemElement.id === config.selectors.introSectionId.substring(1) ||
    activeItemElement.id === config.selectors.outroSectionId.substring(1);

  if (isTextSection) {
    return; // Exit early
  }

  const blurTargets = [];
  const activeVideoContent = activeItemElement.querySelector(
    ".video-aspect-wrapper"
  );
  const activeVideoInfoOverlay = activeItemElement.querySelector(
    ".video-info-overlay"
  );
  if (activeVideoContent) blurTargets.push(activeVideoContent);
  if (activeVideoInfoOverlay) blurTargets.push(activeVideoInfoOverlay);

  if (blurTargets.length > 0) {
    if (InputManager.NavMenuOpen() && InputManager.checkForMobile()) {
      // Apply blur and opacity when the menu is open
      gsap.to(blurTargets, {
        filter: config.animation.blurNavOpen,
        opacity: config.animation.opacityNavOpen,
        duration: 0.3,
        ease: "power1.out",
        overwrite: true,
      });
    } else {
      // Remove blur
      gsap.to(blurTargets, {
        filter: config.animation.blurReset,
        opacity: 1,
        duration: animationDuration,
        ease: "power1.out",
        overwrite: true,
      });
    }
  }
}

export function updateTitleStyleBasedOnViewport() {
  const title = document.getElementById("main-page-title");
  const navMenu = document.getElementById(
    config.selectors.navigationContainerId
  );
  const minHeight = config.breakpoints.minHeight; // Minimum height for viewport check

  if (!title || !navMenu) return;

  const isShortViewport = window.innerHeight < minHeight;

  if (isShortViewport) {
    title.classList.add("title-cornered");
  } else {
    title.classList.remove("title-cornered");
  }
}

export function updateMenuToggleUI(menuIsCurrentlyVisible) {
  if (!menuToggleButton || !navMenu) {
    // Safety check
    console.warn(
      "SCROLL: Cannot update menu UI; one or more global menu elements not found."
    );
    return;
  }

  if (menuIsCurrentlyVisible) {
    navMenu.classList.remove("is-hidden");
    navMenu.classList.add("is-visible");
    navMenu.style.overflowY = "hidden";
  } else {
    navMenu.classList.remove("is-visible");
    navMenu.classList.add("is-hidden");
    navMenu.style.overflowY = "hidden";
  }

  menuToggleButton.setAttribute("aria-expanded", menuIsCurrentlyVisible);
  menuToggleButton.setAttribute(
    "aria-label",
    menuIsCurrentlyVisible ? "Close Navigation Menu" : "Open Navigation Menu"
  );
}

// ==================================================
// INTRO ANIMATION FUNCTIONS
// ==================================================

// --- NEW: Function to animate the intro arrow ---
function startArrowBounce() {
  const arrow = document.getElementById("intro-scroll-arrow");
  if (!arrow) return;

  // Kill any existing animation to prevent conflicts
  if (introArrowTween) {
    introArrowTween.kill();
  }

  // Create the repeating bounce animation
  introArrowTween = gsap.to(arrow, {
    y: 5, 
    duration: 2,
    ease: "power1.inOut", 
    repeat: -1, 
    yoyo: true, 
  });
}

function stopArrowBounce() {
  if (introArrowTween) {
    gsap.to(introArrowTween, {
      timeScale: 3, // Speed up the animation to finish quickly
      onComplete: () => {
        introArrowTween.kill();
        introArrowTween = null;
        const arrow = document.getElementById("intro-scroll-arrow");
        if (arrow) gsap.set(arrow, { y: 0 });
      },
    });
  }
}

function animateIntroIn(introElement) {
  if (!introElement) return;
  const introLines = introElement.querySelectorAll(".intro-line");
  if (introLines.length === 0) return;

  gsap.fromTo(
    introLines,
    {
      // FROM state
      opacity: 0,
      y: 25,
      filter: "blur(15px)",
    },
    {
      // TO state
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      duration: 3,
      ease: "power2.out",
      stagger: 0.6,
      overwrite: "auto",
    }
  );
}

function resetIntroAnimation(introElement) {
  if (!introElement) return;
  const introLines = introElement.querySelectorAll(".intro-line");
  if (introLines.length === 0) return;

  gsap.to(introLines, {
    opacity: 0,
    y: -20, 
    filter: "blur(8px)",
    duration: 0.5, 
    ease: "power2.in", 
    stagger: 0.07,
    overwrite: "auto",
  });
}

function animateOutroIn(outroElement) {
  if (!outroElement) return;
  const outroLines = outroElement.querySelectorAll(".outro-line");
  if (outroLines.length === 0) return;

  gsap.fromTo(
    outroLines,
    { opacity: 0, y: 25, filter: "blur(15px)" },
    {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      duration: 3,
      ease: "power2.out",
      stagger: 0.6,
      overwrite: "auto",
    }
  );
}

function resetOutroAnimation(outroElement) {
  if (!outroElement) return;
  const outroLines = outroElement.querySelectorAll(".outro-line");
  if (outroLines.length === 0) return;

  gsap.to(outroLines, {
    opacity: 0,
    y: -20,
    filter: "blur(8px)",
    duration: 0.5,
    ease: "power2.in",
    stagger: 0.07,
    overwrite: "auto",
  });
}

// ==================================================
// INITIALIZATION FUNCTION (EXPORTED)
// ==================================================
export function initializeGsapScroll(videos) {
  setVideos(videos);

  videoTrack = document.querySelector(config.selectors.track);
  if (!videoTrack) {
    return;
  }
  scrollItems = gsap.utils
    .toArray(videoTrack.children)
    .filter((el) =>
      el.classList.contains(config.selectors.scrollItem.substring(1))
    ); 
  infoButtonElement = document.querySelector(config.selectors.infoButtonId);

  // --- Initialize module-scoped menu elements
  menuToggleButton = document.getElementById(
    config.selectors.menuToggleButtonId
  );
  navMenu = document.getElementById(config.selectors.navigationContainerId);

  if (scrollItems.length === 0) {
    console.error(
      `Scroll Init Failed: No '${config.selectors.scrollItem}' children found.`
    );
    return;
  }

  // Determine Config (Hardcoded values)
  const isTouchDevice = detectTouchDevice();
  animationDuration = isTouchDevice
    ? config.animation.mobileDuration
    : config.animation.desktopDuration;
  const throttleInterval = isTouchDevice
    ? config.input.mobileThrottle
    : config.input.desktopThrottle;
  // Define Input -> Scroll Logic
  const processScrollInput = (delta) => {
    let newIndex = currentIndex;
    if (delta > 0 && currentIndex < scrollItems.length - 1) {
      newIndex++;
    } else if (delta < 0 && currentIndex > 0) {
      newIndex--;
    } else {
      return;
    }
    if (newIndex !== currentIndex) {
      goToIndex(newIndex);
    }
  };
  const throttledScrollProcessor = throttle(
    processScrollInput,
    throttleInterval
  );

  const resizeCallback = () => {
    goToIndex(currentIndex, true);

    if (menuToggleButton && navMenu) {
      updateMenuToggleUI(false);
    } 

    updateTitleStyleBasedOnViewport();
  };
  const getActiveVideoFn = () =>
    currentIndex < videos.length ? videos[currentIndex] : null;
  const togglePlayPauseFn = (video, button) => {
    if (video && typeof video.togglePlayPause === "function") {
      video
        .togglePlayPause(button)
        .catch((e) => console.error("Error in toggle callback:", e));
    }
  };

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
  currentIndex = 0;
  isAnimating = false;
  goToIndex(0, true);

  updateInfoButtonState();
  attachButtonListeners();

  if (menuToggleButton && navMenu) {
    updateMenuToggleUI(false);
  } else {
    console.error(
      `%c[SCROLL] Menu Toggle Initial State FAILED: One or more menu elements not found!`,
      "color: red; font-weight: bold;"
    );
  }

  updateTitleStyleBasedOnViewport();
}

// --- Re-exports ---
export { toggleGlobalVolume };
