// js/main.js (Corrected for Config Keys and querySelector)

import { renderPlaylist } from './core/playlistManager.js'; 

window.addEventListener('load', async () => {
    document.body.classList.add('no-transition');
    console.log("Load event fired. Starting initializations...");
    registerGSAP();
    await loadAndInjectSVGSprite();

    console.log("Running and AWAITING renderPlaylist...");
    try {
            console.log("MAIN: Calling renderPlaylist");
            await renderPlaylist();
            console.log("Finished AWAITING renderPlaylist.");

            // --- GSAP INTRO ANIMATION ---
            console.log("Starting intro animation...");
            if (typeof gsap !== 'undefined') {

                const introTl = gsap.timeline({
                    defaults: { duration: 1.5, ease: "power2.out" }
                });

                const leftCol = ".left-column";
                const rightCol = ".right-column";
                const middleCol = ".middle-column";

                introTl
                    .to([leftCol, rightCol], { y: 0, opacity: 1 }, 0)
                    .to(middleCol, { y: 0, opacity: 1 }, 0.4);

            } else {
                console.error("GSAP not loaded! Cannot run intro animation.");
                document.querySelectorAll('.left-column, .right-column, .middle-column').forEach(el => {
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0px)';
                });
            }

    } catch (error) {
        console.error("ERROR during renderPlaylist or attaching listeners:", error);
    }

    // --- DARK MODE TOGGLE ---
    initializeDarkModeToggle();

    setTimeout(() => {
        document.body.classList.remove('no-transition');
        console.log("Transitions re-enabled after initial load.");
    }, 50);

   console.log("All initializations in load handler complete.");
});

function registerGSAP() {
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined' && typeof CSSPlugin !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger, CSSPlugin); 
        console.log("GSAP and plugins registered.");
    } else {
        console.error("GSAP or plugins not loaded!");
        return; 
    }
}

async function loadAndInjectSVGSprite() {
    try {
        const response = await fetch('assets/images/icons.svg');
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const svgText = await response.text();

        // Create a temporary div to parse the SVG text
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = svgText;
        const svgElement = tempDiv.querySelector('svg');

        if (svgElement) {
            svgElement.style.display = 'none';
            svgElement.setAttribute('aria-hidden', 'true'); // Hide from screen readers
            document.body.insertAdjacentElement('afterbegin', svgElement); // Inject at start of body
            console.log("SVG sprite injected into body.");
        } else {
             console.error("Could not find SVG element within fetched sprite file.");
        }
    } catch (error) {
        console.error("Error loading or injecting SVG sprite:", error);
    }
}

function initializeDarkModeToggle() {
    console.log("Initializing dark mode toggle...");
    const toggleButton = document.getElementById('darkModeToggle');

    if (!toggleButton) {
        console.warn("Dark mode toggle button not found.");
        return;
    }

    // Set initial state based on localStorage
    const prefersDark = localStorage.getItem('darkMode') === 'true';
    if (prefersDark) {
        document.body.classList.add('dark-mode');
    }

    toggleButton.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', isDark);
    });
}
