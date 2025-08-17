// ./js/modules/inputManager.js

// Assuming utils.js is in ../utils/ relative to this modules/ folder
import { throttle } from "../utils/utils.js";
import { config } from "../config.js";
import { updateTitleStyleBasedOnViewport } from "../core/scroll.js"; // Assuming this function is defined in scroll.js

// --- Module State ---
let scrollInputProcessor = null; // Function to call when scroll input occurs (throttled)
let adjustVolumeCallback = null; // Function to call for volume keys
let togglePlayPauseCallback = null; // Function to call for spacebar (needs active video)
let getActiveVideoCallback = null; // Function to get the current video object

// --- 2. Use config for DEFAULTS ---
let resizeDebounceTime = config.input.resizeDebounce;
let touchMinY = config.input.touchSensitivityY;
let touchMaxX = config.input.touchSensitivityX;

// --- Event Handler Functions ---
async function handleKeyDown(event) {
  const targetTagName = event.target.tagName;
  if (
    targetTagName === "INPUT" ||
    targetTagName === "TEXTAREA" ||
    event.target.isContentEditable
  )
    return;

  switch (event.key) {
    case " ":
    case "Spacebar":
      event.preventDefault();
      if (getActiveVideoCallback && togglePlayPauseCallback) {
        const activeVideo = getActiveVideoCallback();
        if (activeVideo) {
          togglePlayPauseCallback(activeVideo); // Call the wrapper
        } else {
        }
      } else {
        console.warn("[InputMgr] Spacebar ignored: Callbacks not initialized.");
      }
      break;
    case "ArrowLeft":
    case "ArrowUp":
      event.preventDefault();
      if (scrollInputProcessor) scrollInputProcessor(-1); // Negative delta
      break;
    case "ArrowRight":
    case "ArrowDown":
      event.preventDefault();
      if (scrollInputProcessor) scrollInputProcessor(1); // Positive delta
      break;
    case "AudioVolumeUp":
    case "+":
      event.preventDefault();
      if (adjustVolumeCallback) await adjustVolumeCallback(0.1);
      break;
    case "AudioVolumeDown":
    case "-":
      event.preventDefault();
      if (adjustVolumeCallback) await adjustVolumeCallback(-0.1);
      break;
  }
}

function handleWheel(event) {
  event.preventDefault();
  if (scrollInputProcessor) scrollInputProcessor(event.deltaY);
}

function createTouchHandlers() {
  // Uses hardcoded minY/maxX
  let touchStartY = null,
    touchStartX = null;
  // const minSwipeDistanceY = 30, maxSwipeDistanceX = 100; // Use constants defined above

  function onTouchStart(event) {
    if (event.touches.length === 1) {
      touchStartY = event.touches[0].clientY;
      touchStartX = event.touches[0].clientX;
    } else {
      touchStartY = null;
      touchStartX = null;
    }
  }
  function onTouchMove(event) {
    if (touchStartY !== null) {
      const tX = event.touches[0].clientX;
      if (Math.abs(touchStartX - tX) < touchMaxX) {
        event.preventDefault();
      }
    }
  } // Use touchMaxX
  function onTouchEnd(event) {
    if (touchStartY === null) return;
    const tY = event.changedTouches[0].clientY;
    const tX = event.changedTouches[0].clientX;
    const dY = touchStartY - tY;
    const dX = Math.abs(touchStartX - tX);
    if (Math.abs(dY) > touchMinY && dX < touchMaxX) {
      // Use touchMinY and touchMaxX
      if (scrollInputProcessor) scrollInputProcessor(dY);
    }
    touchStartY = null;
    touchStartX = null;
  }
  return { onTouchStart, onTouchMove, onTouchEnd };
}

function createResizeHandler(scrollPositionResizeCb, globalResizeHandler) {
  let resizeTimeoutId;
  return function onResize() {
    // Clear any existing timeout to debounce the resize event
    clearTimeout(resizeTimeoutId);
    resizeTimeoutId = setTimeout(() => {
      // Call the specific scroll position update (from scroll.js)
      scrollPositionResizeCb();
      // Call the comprehensive resize handler (from playlistManager.js)
      globalResizeHandler(); // **NEW CALL**
      updateTitleStyleBasedOnViewport();
    }, config.input.resizeDebounce); // Use the debounce time from config
  };
}

/** Attaches all necessary global event listeners. togglePlayPauseCallback*/
function attachEventListeners(touchHandlers, resizeHandler) {
  // Remove previous listeners
  window.removeEventListener("keydown", handleKeyDown);
  window.removeEventListener("wheel", handleWheel);
  window.removeEventListener("touchstart", touchHandlers.onTouchStart);
  window.removeEventListener("touchmove", touchHandlers.onTouchMove);
  window.removeEventListener("touchend", touchHandlers.onTouchEnd);
  window.removeEventListener("resize", resizeHandler);

  // Add new listeners
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("wheel", handleWheel, { passive: false });
  window.addEventListener("touchstart", touchHandlers.onTouchStart, {
    passive: true,
  });
  window.addEventListener("touchmove", touchHandlers.onTouchMove, {
    passive: false,
  });
  window.addEventListener("touchend", touchHandlers.onTouchEnd, {
    passive: true,
  });
  window.addEventListener("resize", resizeHandler);
}

/** Initializes the input manager. */
export function initializeInput(
  scrollProcessor,
  scrollPositionResizeCb, // Renamed from resizeCb
  globalResizeHandler, // NEW PARAMETER
  adjustVolumeFn,
  getActiveVideoFn,
  togglePlayPauseFn,
  resizeDebounce = config.input.resizeDebounce,
  touchY = config.input.touchSensitivityY,
  touchX = config.input.touchSensitivityX
) {
  scrollInputProcessor = scrollProcessor;
  adjustVolumeCallback = adjustVolumeFn;
  getActiveVideoCallback = getActiveVideoFn;
  togglePlayPauseCallback = (video) => {
    // This is the WRAPPER called by handleKeyDown
    if (video && typeof togglePlayPauseFn === "function") {
      try {
        togglePlayPauseFn(video); // Call original fn without the button
      } catch (e) {
        console.error("Error calling togglePlayPauseFn from wrapper:", e);
      }
    } else {
      console.warn(
        `[InputMgr] Cannot toggle: video or togglePlayPauseFn missing. Video: ${!!video}, Fn: ${typeof togglePlayPauseFn}`
      );
    }
  };

  // Store values (either defaults from config or passed-in overrides)
  resizeDebounceTime = resizeDebounce;
  touchMinY = touchY;
  touchMaxX = touchX;

  const touchHandlers = createTouchHandlers();
  // Pass both resize callbacks to createResizeHandler
  const resizeHandler = createResizeHandler(
    scrollPositionResizeCb,
    globalResizeHandler
  ); // **UPDATED**
  attachEventListeners(touchHandlers, resizeHandler);
}

export function checkForMobile() {
  return window.innerWidth <= config.breakpoints.mobileMaxWidth;
}

export function NavMenuOpen() {
  const navMenuElement = document.getElementById(
    config.selectors.navigationContainerId
  );
  const isVisible = navMenuElement
    ? navMenuElement.classList.contains("is-visible")
    : false;
    return isVisible;
}
