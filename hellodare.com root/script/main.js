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

      // --- INFO EVENT LISTENER
      const infoButton = document.getElementById('info-button-id');
      
      if (infoButton) {
          infoButton.style.cursor = 'pointer';

          infoButton.addEventListener('click', (event) => {
              event.preventDefault();

              const currentScrollItems = document.querySelectorAll('.js-video-track .scroll-item');

              if (currentScrollItems && currentScrollItems.length > 0) {
                  const infoSectionIndex = currentScrollItems.length - 1; // Index of the last item
                  console.log(`Attempting to scroll to info section index: ${infoSectionIndex}`);
                  goToIndex(infoSectionIndex);
              } else {
                  console.warn("Could not find any '.scroll-item' elements when info button clicked.");
              }
          });
          console.log("Info button event listener attached.");
      } else {
          console.warn("Info button element ('#info-button-id') not found. Cannot attach listener.");
      }
      
      // --- TITLE EVENT LISTENER
      const titleElement = document.getElementById('main-page-title');

      if (titleElement) {
          titleElement.style.cursor = 'pointer';

          titleElement.addEventListener('click', (event) => {
              event.preventDefault();

              goToIndex(0);
          });
          console.log("Main title click listener attached.");
        }

  } catch (error) {
      console.error("ERROR during renderPlaylist:", error);
  }

   console.log("All initializations in load handler complete.");
});