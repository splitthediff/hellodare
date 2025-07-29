// js/core/scroll.js

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
      // Remove active class from all first (safer)
      link.classList.remove("active");
      // Add active class if index matches current scroll index
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

  //infoButtonElement.innerText = isOnInfoPage ? "Work" : "Info";  // Toggle text based on current index - currently not used (to change - also need to adjust scroll index in attachButtonListeners)
  infoButtonElement.innerText = isOnInfoPage ? "Info" : "Info"; // Always shows "Info"

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
  console.log("--- Running attachButtonListeners from scroll.js ---");

  // --- Info Button Listener ---
  console.log(
    "ABL: Attempting getElementById for Info Button:",
    config.selectors.infoButtonId
  );
  infoButtonElement = document.getElementById(config.selectors.infoButtonId);

  if (infoButtonElement) {
    // Check the variable reference
    console.log("ABL: Found Info Button.", infoButtonElement); // Check flag on the element
    infoButtonElement.style.cursor = "pointer";
    infoButtonElement.addEventListener("click", (event) => {
      event.preventDefault();
      if (!scrollItems || scrollItems.length === 0) return;
      const infoSectionIndex = scrollItems.length - 1;
      const currentIdx = getCurrentIndex();
      goToIndex(
        currentIdx === infoSectionIndex ? infoSectionIndex : infoSectionIndex
      );
      closeNavMenu();
    });
    console.log("Dynamic Info/Work button listener attached.");
  } else {
    console.warn(
      `ABL: Info button ('#${config.selectors.infoButtonId}') not found.`
    );
  }

  // --- Title Listener ---
  console.log(
    "ABL: Attempting getElementById for Title:",
    config.selectors.titleElementId
  );
  const titleElementForListener = document.getElementById(
    config.selectors.titleElementId
  );

  if (titleElementForListener) {
    // Check the variable reference
    console.log("ABL: Found Title Element.", titleElementForListener);
    titleElementForListener.style.cursor = "pointer";
    titleElementForListener.addEventListener("click", (event) => {
      event.preventDefault();
      goToIndex(0); // Call goToIndex directly
      closeNavMenu();
    });
    console.log("Title click listener attached.");
  } else {
    console.warn(
      `ABL: Main title ('#${config.selectors.titleElementId}') not found.`
    );
  }

  // --- Menu Toggle Button Listener ---
  if (menuToggleButton && navMenu) {
    menuToggleButton.addEventListener("click", () => {
      const menuIsCurrentlyVisible = navMenu.classList.contains("is-visible");
      console.log(
        `SCROLL: Menu toggle clicked. menuIsCurrentlyVisible (before action): ${menuIsCurrentlyVisible}`
      ); // ADD/UPDATE THIS LOG

      // --- Trigger Open/Close Sequence ---
      if (!menuIsCurrentlyVisible) {
        console.log("SCROLL: Triggering Menu OPEN sequence from button.");
        goToIndex(0);
        openNavMenu();
      } else {
        console.log("SCROLL: Triggering Menu CLOSE sequence from button.");
        closeNavMenu();
      }
      console.log(
        `SCROLL: Nav menu state after toggle call: navMenu.classList.contains('is-visible') = ${navMenu.classList.contains(
          "is-visible"
        )}`
      );
    });
    console.log("SCROLL: Menu toggle button listener attached.");
  } else {
    console.log("ABL: Menu Toggle Condition Failed.");
  }
  console.log("--- attachButtonListeners finished running ---");
}

function openNavMenu() {
  console.log("SCROLL: Entering openNavMenu.");

  if (!menuToggleButton || !navMenu) {
    console.warn(
      "SCROLL: Menu toggle elements not found in openNavMenu. Cannot proceed."
    );
    return;
  }

  updateMenuToggleUI(true);

  const activeItemElement = document.querySelector(
    ".scroll-item.active-scroll-item"
  );
  if (activeItemElement) {
    console.log("SCROLL: Calling blurActiveElement from openNavMenu.");
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
  console.log("SCROLL: Entering closeNavMenu.");
  if (!navMenu || !menuToggleButton) {
    return;
  }
  if (!navMenu.classList.contains("is-visible")) {
    console.log("SCROLL: closeNavMenu called, but menu already hidden.");
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
    console.log("blurActiveElement: Ignoring blur for a text section.");
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
      // Apply blur
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
        // FIX: The un-blur duration is now synced with the scroll duration
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
    y: 5, // How far down it moves
    duration: 2, // How long one bounce takes
    ease: "power1.inOut", // A smooth ease in and out
    repeat: -1, // Repeat forever
    yoyo: true, // Makes it go back and forth
  });
}

// --- NEW: Function to stop the arrow animation ---
function stopArrowBounce() {
  if (introArrowTween) {
    // Kill the animation smoothly and reset the arrow's position
    gsap.to(introArrowTween, {
      timeScale: 3, // Speed up the animation to finish quickly
      onComplete: () => {
        introArrowTween.kill();
        introArrowTween = null;
        const arrow = document.getElementById("intro-scroll-arrow");
        if (arrow) gsap.set(arrow, { y: 0 }); // Reset position
      },
    });
  }
}

function animateIntroIn(introElement) {
  if (!introElement) return;
  const introLines = introElement.querySelectorAll(".intro-line");
  if (introLines.length === 0) return;

  // Use .fromTo() to ensure the animation runs correctly every time
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
    y: -20, // Move them up slightly as they fade out
    filter: "blur(8px)",
    duration: 0.5, // Make the out-animation quick
    ease: "power2.in", // An "ease-in" accelerates into the animation
    stagger: 0.07, // A subtle stagger for the exit
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

  // Find DOM Elements (Hardcoded selectors)
  videoTrack = document.querySelector(config.selectors.track);
  if (!videoTrack) {
    console.error(`Scroll Init Failed: '${config.selectors.track}' not found.`);
    return;
  }
  scrollItems = gsap.utils
    .toArray(videoTrack.children)
    .filter((el) =>
      el.classList.contains(config.selectors.scrollItem.substring(1))
    ); // Remove leading '.' for classList check
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
  console.log(`Scroll Initializing...`);

  // Determine Config (Hardcoded values)
  const isTouchDevice = detectTouchDevice();
  animationDuration = isTouchDevice
    ? config.animation.mobileDuration
    : config.animation.desktopDuration;
  const throttleInterval = isTouchDevice
    ? config.input.mobileThrottle
    : config.input.desktopThrottle;

  console.log(
    "CRITICAL CHECK - Throttle Interval being used:",
    throttleInterval
  );
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
      console.log("SCROLL: Resizing. Forcing menu state to CLOSED.");
      updateMenuToggleUI(false);
    } else {
      console.error(
        `%c[SCROLL] Menu Toggle Resize Sync FAILED: One or more menu elements not found!`,
        "color: red; font-weight: bold;"
      );
    }

    updateTitleStyleBasedOnViewport();
  };
  const getActiveVideoFn = () =>
    currentIndex < videos.length ? videos[currentIndex] : null;
  // Define togglePlayPauseFn wrapper here or ensure Video class method is robust
  const togglePlayPauseFn = (video, button) => {
    if (video && typeof video.togglePlayPause === "function") {
      video
        .togglePlayPause(button)
        .catch((e) => console.error("Error in toggle callback:", e));
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

  console.log("GSAP Scroll Initialization complete.");
}

// --- Re-exports ---
export { toggleGlobalVolume };
