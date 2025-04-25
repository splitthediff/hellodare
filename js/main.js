// js/main.js (Corrected for Config Keys and querySelector)

// Adjust import paths based on your final structure
import { renderPlaylist } from './core/playlistManager.js'; // Assuming playlistManager.js is in core/
//import { goToIndex } from './core/scroll.js';         // Assuming scroll.js is in core/
//import { config } from './config.js';             // Assuming config.js is in the same directory (js/)

// import { initializeTitleCheck } from './interface.js'; // If you have this file

window.addEventListener('load', async () => {
  console.log("Load event fired. Starting initializations...");
  await loadAndInjectSVGSprite();

  // initializeTitleCheck?.(); // Optional: Call if it exists

  console.log("Running and AWAITING renderPlaylist...");
  try {
        // Wait for HTML rendering and initial setup from playlistManager
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
      // Catch errors from renderPlaylist or listener attachment
      console.error("ERROR during renderPlaylist or attaching listeners:", error);
  }

   console.log("All initializations in load handler complete.");
});

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
            svgElement.style.display = 'none'; // Ensure it's hidden
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
