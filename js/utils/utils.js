// utils.js - General utility functions

/**
 * Throttles a function to ensure it's called at most once within a specified limit.
 */
export function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => {
                 inThrottle = false;
            }, limit);
        }
    }
}

/**
 * Detects if the current device supports touch events.
 */
export function detectTouchDevice() {
    let hasTouch = false;
    if ('maxTouchPoints' in navigator) hasTouch = navigator.maxTouchPoints > 0;
    else if ('ontouchstart' in window) hasTouch = true;
    else if ('msMaxTouchPoints' in navigator) hasTouch = navigator.msMaxTouchPoints > 0;
    return hasTouch;
}

export function formatTime(totalSeconds) {
    if (isNaN(totalSeconds) || totalSeconds < 0) {
        return "0:00";
    }
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    // Pad seconds with a leading zero if needed
    const paddedSeconds = seconds < 10 ? `0${seconds}` : seconds;
    return `${minutes}:${paddedSeconds}`;
}

export function paddedNumber(number) {
    if (isNaN(number)) {
        return number;
    }
    return number < 10 ? `0${number}` : number;
}

/**
 * Calculates the aspect ratio (width / height).
 * Returns 16/9 as a fallback if width or height are invalid.
 * @param {number} videoWidth - The width of the video.
 * @param {number} videoHeight - The height of the video.
 * @returns {number} The aspect ratio.
 */
export function getAspectRatio(videoWidth, videoHeight) {
    // Check for positive numbers to avoid division by zero or NaN
    if (videoWidth > 0 && videoHeight > 0) {
        return videoWidth / videoHeight;
    } else {
        console.warn(`Invalid dimensions for getAspectRatio (${videoWidth}x${videoHeight}), defaulting to 16/9.`);
        return 16 / 9; // Default fallback aspect ratio
    }
}

export function _logMissingElements(contentElement, context = '') {
    if (!contentElement || typeof contentElement !== 'object') {
        console.warn(`[${context}] contentElement is missing or invalid:`, contentElement);
        return;
    }

    Object.entries(contentElement).forEach(([key, el]) => {
        if (!el) {
            console.warn(`[${context}] Missing element for key: '${key}'`);
        } else if (!(el instanceof Element)) {
            console.warn(`[${context}] Value for '${key}' is not a DOM element:`, el);
        }
    });
}