// js/main.js (REVERTED - NO CONFIG)

// Adjust paths based on your structure
import { renderPlaylist } from './core/playlistManager.js'; // Assuming renamed file
import { goToIndex } from './core/scroll.js';

// import { initializeTitleCheck } from './interface.js'; // If needed

window.addEventListener('load', async () => {
  console.log("Load event fired. Starting initializations...");

  // initializeTitleCheck?.();

  console.log("Running and AWAITING renderPlaylist...");
  try {
      await renderPlaylist();
      console.log("Finished AWAITING renderPlaylist.");

      // --- Attach listener for Info Button ---
      // Use hardcoded ID
      const infoButton = document.getElementById('scroll-to-info-btn'); // Use your actual ID
      if (infoButton) {
          infoButton.style.cursor = 'pointer';
          infoButton.addEventListener('click', (event) => {
              event.preventDefault();
              // Use hardcoded selectors
              const currentScrollItems = document.querySelectorAll('.js-video-track .scroll-item');
              if (currentScrollItems && currentScrollItems.length > 0) {
                  const infoSectionIndex = currentScrollItems.length - 1;
                  goToIndex(infoSectionIndex); // Calls imported function
              } else { console.warn("Could not find scroll items for info button."); }
          });
          // console.log("Info button listener attached.");
      } else { console.warn("Info button ('#scroll-to-info-btn') not found."); }

      // --- Attach listener for Title ---
       // Use hardcoded ID
      const titleElement = document.getElementById('main-page-title'); // Use your actual ID
      if (titleElement) {
           titleElement.style.cursor = 'pointer';
           titleElement.addEventListener('click', (event) => {
               event.preventDefault();
               goToIndex(0); // Calls imported function
           });
           // console.log("Main title click listener attached.");
      } else { console.warn("Main title ('#main-page-title') not found."); }

  } catch (error) {
      console.error("ERROR during renderPlaylist or attaching listeners:", error);
  }

   console.log("All initializations in load handler complete.");
});