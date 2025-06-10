// js/config.js - Central configuration settings

export const config = {
    // Animation & Timing Settings
    animation: {
        desktopDuration: 1.3,   // Duration of scroll animation on desktop (seconds)
        mobileDuration: 0.7,    // Duration of scroll animation on mobile (seconds)
        ease: "sine.inOut",    // GSAP easing function for scroll animation
        blurMax: 'blur(1px)', // Maximum blur effect
        blurReset: 'blur(0px)',  // Reset blur effect
        opacityNavOpen: .4,
        blurNavOpen: 'blur(3px)',
    },

    // Input Handling Settings
    input: {
        desktopThrottle: 200,   // Throttle interval for wheel/keyboard on desktop (ms)
        mobileThrottle: 200,    // Throttle interval for wheel/touch on mobile (ms)
        touchSensitivityY: 30,  // Minimum vertical distance for touch swipe (pixels)
        touchSensitivityX: 100, // Maximum horizontal distance allowed during vertical swipe (pixels)
        resizeDebounce: 250     // Debounce time for window resize handler (ms)
    },

    // Video Specific Settings
    video: {
        defaultUnmuteLevel: 0.5, // Volume level when unmuting (0.0 to 1.0)
        loopLimit: 1,           // Total number of plays allowed (initial + loops)
        vimeoQuality: "1080p",  // Preferred Vimeo quality
        vimeoParams: "muted=1&controls=0&loop=0", // Default Vimeo iframe params (excluding quality)
        timeupdateEndThreshold: 0.1,
        localThumbnailBasePath: "assets/images/thumbnails/"
    },

    navigation: {
        navOpacity: 0.3, // used in openNavMenu in playlsitManager.js
    },

    // DOM Selectors & Class Names
    selectors: {
        // Query Selectors (usually start with . or #)
        track: ".js-video-track",
        scrollItem: ".scroll-item",
        middleColumn: ".middle-column", // Used by getDynamicWidth
        // IDs (use # for querySelector, or just name for getElementById)
        infoButtonId: "scroll-to-info-btn", // ID for the button itself
        titleElementId: "main-page-title",  // ID for the clickable title
        infoSectionId: "#info-section",      // ID for the info section scroll item
        menuToggleButtonId: "menu-toggle-btn",      // <<< ADDED
        navigationContainerId: "main-navigation", // <<< ADDED
     
        // Class Names (just the name, no dot)
        activeScrollItemClass: "active-scroll-item" // Class added to the active item
    },

    // Breakpoints
    breakpoints: {
        mobileMaxWidth: 1100, // max-width for mobile styles/logic (pixels)
        minHeight: 900
    },

    layout: {
        overlayOffsetBottom: 20// Desired offset below video in pixels
    }
};