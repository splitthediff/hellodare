import { initializeTitleCheck } from './interface.js';
import { renderPlaylist } from './playlist.js';
import { goToIndex } from './scroll.js';


window.addEventListener('load', async () => {
  console.log("Load event fired. Starting initializations...");

  console.log("Running initializeTitleCheck...");
  initializeTitleCheck();
  console.log("Finished initializeTitleCheck.");

  console.log("Running and AWAITING renderPlaylist...");
  try {
      await renderPlaylist(); // Renders the videos
      console.log("Finished AWAITING renderPlaylist.");

      // --- EVENT LISTENER
      const infoButton = document.getElementById('info-button');
      
      if (infoButton) {
          infoButton.addEventListener('click', (event) => {
              event.preventDefault(); // Prevent default if it's a link
              console.log("Info button clicked!");

              // Find scroll items at the time of click
              const currentScrollItems = document.querySelectorAll('.js-video-track .scroll-item');

              if (currentScrollItems && currentScrollItems.length > 0) {
                  const infoSectionIndex = currentScrollItems.length - 1; // Index of the last item
                  console.log(`Attempting to scroll to info section index: ${infoSectionIndex}`);
                  goToIndex(infoSectionIndex); // Call the imported function
              } else {
                  console.warn("Could not find any '.scroll-item' elements when info button clicked.");
              }
          });
          console.log("Info button event listener attached.");
      } else {
          console.warn("Info button element ('#info-button-id') not found. Cannot attach listener.");
      }
      // --- END OF EVENT LISTENER CODE ---

  } catch (error) {
      console.error("ERROR during renderPlaylist:", error);
  }

   console.log("All initializations in load handler complete.");
});