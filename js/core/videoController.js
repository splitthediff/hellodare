// js/core/videoController.js - Manages video playback and volume

import { config } from "../config.js";
import { positionSingleInfoOverlay } from "./playlistManager.js";
import * as InputManager from "../modules/inputManager.js";
import { logMissingElements } from "../utils/utils.js";
// --- Module State ---
let controlledVideos = []; // Stores the Video class instances
let globalVolumeLevel = 0.0;
const DEFAULT_UNMUTE_LEVEL = config.video.defaultUnmuteLevel;

// ==================================================
// EXPORTED FUNCTIONS
// ==================================================

/** Stores the array of video objects. */
export function setVideos(videosArray) {
  controlledVideos = videosArray || [];
  globalVolumeLevel = 0.0;
  _resetTextSectionAnimation(config.selectors.introSectionId);
  _resetTextSectionAnimation(config.selectors.infoSectionId);
}

export async function controlVideoPlayback(
  currentIdx,
  previousIdx,
  onScrollCompleteCallback = null
) {
  if (!controlledVideos) controlledVideos = [];
  const videoCount = controlledVideos.length;
  const introSectionIndex = 0;
  const infoSectionIndex = videoCount + 1;

  const scrollItems = document.querySelectorAll(config.selectors.scrollItem);

  if (!scrollItems || scrollItems.length === 0) {
    return;
  }

  if (currentIdx === infoSectionIndex) {
    if (typeof onScrollCompleteCallback === "function") {
      onScrollCompleteCallback();
    } else {
      _animateTextSection(config.selectors.infoSectionId);
    }
  } else if (previousIdx === infoSectionIndex && currentIdx !== previousIdx) {
    _resetTextSectionAnimation(config.selectors.infoSectionId);
  }
  // --- Handle Intro Section ---
  if (currentIdx === introSectionIndex) {
    _animateTextSection(config.selectors.introSectionId);
  } else if (previousIdx === introSectionIndex && currentIdx !== previousIdx) {
    _resetTextSectionAnimation(config.selectors.introSectionId);
  }

  // --- Loop through ALL scroll items to handle fade/reset ---
  for (let index = 0; index < scrollItems.length; index++) {
    const scrollItemElement = scrollItems[index];
    if (!scrollItemElement) continue;

    const isVideoIndex = index > 0 && index <= videoCount;
    const video = isVideoIndex ? controlledVideos[index - 1] : null;

    // --- Find the primary content element within this scrollItem ---
    const contentElement = _getContentElement(scrollItemElement, isVideoIndex);
    const animationParameters = _getAnimationParameters(isVideoIndex);

    // --- Action for the CURRENT item being scrolled TO ---
    if (index === currentIdx) {
      if (contentElement && animationParameters) {
        _activateItemAnimation(
          contentElement,
          isVideoIndex,
          animationParameters,
          video
        );
      }

      if (isVideoIndex && video) {
        _activateVideoPlayback(video);
      } 
    } else {
      if (contentElement) {
        _deactivateItemAnimation(
          contentElement,
          isVideoIndex,
          animationParameters
        );
      }

      // --- Pause Inactive Videos ---
      if (isVideoIndex && video) {
        _deactivateVideoPlayback(video);
      }
    }
  }
}

// ==================================================
// ANIMATION HELPERS
// ==================================================

/**
 * Animates the .info-block elements within a given section into view.
 * @param {string} sectionSelector - The CSS selector for the parent section (e.g., '#intro-section').
 */
function _animateTextSection(sectionSelector) {
  const blocks = gsap.utils.toArray(`${sectionSelector} .info-block`);

  if (blocks.length > 0) {
    gsap.to(blocks, {
      opacity: 1,
      y: 0,
      filter: config.animation.blurReset,
      duration: 1,
      ease: "power1.out",
      stagger: {
        each: 0.5,
        from: "start",
      },
      overwrite: true,
      delay: 0.1,
    });
  }
}

/**
 * Resets the animation for .info-block elements within a given section.
 * @param {string} sectionSelector - The CSS selector for the parent section (e.g., '#intro-section').
 */
function _resetTextSectionAnimation(sectionSelector) {
  const blocks = gsap.utils.toArray(`${sectionSelector} .info-block`);
  if (blocks.length > 0) {
    gsap.to(blocks, {
      opacity: 0,
      y: 20,
      duration: 2,
      ease: "power1.in",
      overwrite: true,
    });
  }
}

/** Helper function to apply volume */
async function applyGlobalVolume() {
  for (const video of controlledVideos) {
    try {
      const player = await video.initializePlayer();
      await player.setVolume(globalVolumeLevel);
      video._updateSoundButtonUI(globalVolumeLevel === 0); // Update UI based on global volume
    } catch (error) {
      video._updateSoundButtonUI(globalVolumeLevel === 0); // Update UI even if API fails
    }
  }
}

/** Adjusts global volume */
export async function adjustGlobalVolume(delta) {
  let newVolume = globalVolumeLevel + delta;
  newVolume = Math.max(0, Math.min(1, newVolume));
  if (newVolume.toFixed(2) === globalVolumeLevel.toFixed(2)) return;
  globalVolumeLevel = newVolume;
  await applyGlobalVolume();
}

/** Toggles global volume */
export async function toggleGlobalVolume() {
  const newVolume = globalVolumeLevel > 0 ? 0.0 : DEFAULT_UNMUTE_LEVEL;
  globalVolumeLevel = newVolume;
  await applyGlobalVolume();
}

/** Get the element to animate based on item type. */

export function _getContentElement(scrollItemElement, isVideoIndex) {
  const contentElement = {};

  if (isVideoIndex) {
    const contentVideo = scrollItemElement.querySelector(
      ".video-aspect-wrapper"
    );
    const contentOverlay = scrollItemElement.querySelector(
      ".video-info-overlay"
    );

    if (contentVideo) contentElement.video = contentVideo;
    if (contentOverlay) contentElement.overlay = contentOverlay;
  } else if (
    scrollItemElement &&
    scrollItemElement.id === config.selectors.introSectionId
  ) {
    const introContent = scrollItemElement.querySelector(".info-content");
    if (introContent) contentElement.info = introContent;
  } else if (
    scrollItemElement &&
    scrollItemElement.id === config.selectors.infoSectionId
  ) {
    const infoContent = scrollItemElement.querySelector(".info-content");
    if (infoContent) contentElement.info = infoContent;
  }

  return contentElement;
}

/** Determine animation parameters based on mobile and nav state. */
export function _getAnimationParameters(isVideoIndex) {
  const initialYOffset = 20;
  let setScale = 1;
  let setBlur = config.animation.blurMax;
  let resetBlur = config.animation.blurReset;
  let setOpacity = 0;
  let resetOpacity = 1;

  if (
    typeof InputManager.checkForMobile === "function" &&
    typeof InputManager.NavMenuOpen === "function"
  ) {
    if (InputManager.checkForMobile() && InputManager.NavMenuOpen()) {
      setBlur = resetBlur = config.animation.blurNavOpen;
      setOpacity = resetOpacity = 0.5; // no opacity change
    } else {
      setBlur = config.animation.blurMax;
      resetBlur = config.animation.blurReset;
      setOpacity = resetOpacity = 1; // no opacity change
    }
  }

  return {
    setBlur,
    resetBlur,
    setOpacity,
    resetOpacity,
    initialYOffset,
    setScale,
  };
}

/** Animate content IN when item becomes current. */

/**
 * Applies initial GSAP set properties to a scroll item's content elements.
 * Used for setting the starting visual state (e.g., off-screen, blurred) for all items.
 * @param {HTMLElement} scrollItemElement The parent .scroll-item element.
 * @param {boolean} isVideoIndex True if the item is a video, false if it's the info section.
 * @param {object} [video=null] The Video instance, if isVideoIndex is true.
 */
export function setInitialVideoContentState(
  scrollItemElement,
  isVideoIndex,
  video = null
) {
  const contentElement = _getContentElement(scrollItemElement, isVideoIndex);
  const animationParameters = _getAnimationParameters(isVideoIndex);

  if (!contentElement || !animationParameters) {
    console.warn(
      `[VideoController] setInitialVideoContentState: Missing content or animation params for ${
        scrollItemElement.id || scrollItemElement.className
      }.`
    );
    return;
  }

  const { setBlur, setOpacity, initialYOffset, setScale } = animationParameters;
  const entries = Object.entries(contentElement).filter(([_, el]) => !!el);

  if (entries.length === 0) return;

  gsap.set(
    entries.map(([_, el]) => el),
    {
      y: initialYOffset,
      scale: setScale,
      filter: setBlur,
      opacity: setOpacity,
      xPercent: isVideoIndex ? -50 : 0, // Only apply -50% for videos
      yPercent: isVideoIndex ? -50 : 0, // Only apply -50% for videos
    }
  );

  // Also handle initial positioning for the info overlay specific to videos
  if (
    isVideoIndex &&
    video &&
    typeof positionSingleInfoOverlay === "function"
  ) {
    positionSingleInfoOverlay(video.id); // This ensures the overlay is positioned even if content is hidden
  }
}

function _activateItemAnimation(
  contentElement,
  isVideoIndex,
  animationParameters,
  video
) {
  logMissingElements(contentElement, "_activateItemAnimation");
  if (!contentElement) return;

  const {
    setBlur,
    resetBlur,
    setOpacity,
    resetOpacity,
    initialYOffset,
    setScale,
  } = animationParameters;

  // Convert { key: element } to array of [key, element] pairs
  const entries = Object.entries(contentElement).filter(([_, el]) => !!el);

  if (entries.length === 0) return;

  // Step 1: Set initial styles per element
  entries.forEach(([key, el]) => {
    gsap.set(el, {
      // x: 0,
      y: initialYOffset,
      scale: setScale,
      filter: setBlur,
      opacity: setOpacity,
      xPercent: key === "video" && isVideoIndex ? -50 : 0,
      yPercent: key === "video" && isVideoIndex ? -50 : 0,
      transformOrigin: "center center",
    });
  });

  // Step 2: Animate in all elements
  gsap.to(
    entries.map(([_, el]) => el),
    {
      opacity: resetOpacity,
      scale: 1,
      filter: resetBlur,
      y: 0,
      duration: 0.6,
      delay: 0.1,
      ease: "power1.out",
      overwrite: true,
      stagger: entries.length > 1 ? 0.1 : 0,
      onComplete: () => {
        if (
          isVideoIndex &&
          video &&
          typeof positionSingleInfoOverlay === "function"
        ) {
          positionSingleInfoOverlay(video.id);
        }
      },
    }
  );
}

/** Reset/Animate content OUT when item is scrolled away. */
function _deactivateItemAnimation(
  contentElement,
  isVideoIndex,
  animationParameters
) {
  logMissingElements(contentElement, "_deactivateItemAnimation");
  if (!contentElement) return;
  const {
    setBlur,
    resetBlur,
    setOpacity,
    resetOpacity,
    initialYOffset,
    setScale,
  } = animationParameters;

  // --- Reset OUT Animation ---
  const entries = Object.entries(contentElement).filter(([_, el]) => !!el);
  if (entries.length === 0) return;

  gsap.to(
    entries.map(([_, el]) => el),
    {
      opacity: setOpacity,
      filter: setBlur,
      scale: setScale,
      y: initialYOffset,
      //  x: 0,
      duration: 0.7,
      ease: "power1.in",
      overwrite: true,
      transformOrigin: "center center",
    }
  );
}

/** Activate video playback and update icons. */
async function _activateVideoPlayback(video) {
  if (!video) return;
  try {
    const player = await video.initializePlayer();

    if (video.hasPlayedOnce) {
      // Check flag (from timeupdate end simulation)
      video._updatePlayPauseButtonUI(true); // Force paused state if hasPlayedOnce
      video._updateSoundButtonUI(globalVolumeLevel === 0); // Update UI based on global volume
      await player.pause().catch((e) => {
        /* ignore non-critical errors */
      }); // Ensure paused
      await player.setVolume(globalVolumeLevel); // Still set volume
    } else {
      await player.setVolume(globalVolumeLevel);
      video._updateSoundButtonUI(globalVolumeLevel === 0); // Update UI based on global volume
      await player.play();
      video._updatePlayPauseButtonUI(false); // Force playing state
    }
  } catch (error) {
    console.warn(
      `[VideoController ${video?.id}] Error activating video: ${error.message}`
    );
    video._updatePlayPauseButtonUI(true); // Assume paused on error
    video._updateSoundButtonUI(globalVolumeLevel === 0); // Update UI on error
  }
}

/** Deactivate video playback and update icons. */
function _deactivateVideoPlayback(video) {
  if (!video || !video.player) return; // Only pause if player instance exists
  try {
    video.player.pause().catch((e) => {
      /* ignore non-critical errors */
    }); // Non-awaited pause
    // Update Icons for Paused State
    video._updateSoundButtonUI(globalVolumeLevel === 0); // Update UI based on global volume
    video._updatePlayPauseButtonUI(true); // Video is being deactivated, so set to paused state
  } catch (e) {
    console.warn(
      `[VideoController ${video.id}] Error during deactivation: ${e.message}`
    );
  }
}
