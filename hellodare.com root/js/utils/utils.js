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