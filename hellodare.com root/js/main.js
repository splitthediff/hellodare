// js/main.js (Corrected for Config Keys and querySelector)

// Adjust import paths based on your final structure
import { renderPlaylist } from './core/playlistManager.js'; // Assuming playlistManager.js is in core/
import { goToIndex } from './core/scroll.js';         // Assuming scroll.js is in core/
import { config } from './config.js';             // Assuming config.js is in the same directory (js/)

// import { initializeTitleCheck } from './interface.js'; // If you have this file

window.addEventListener('load', async () => {
  console.log("Load event fired. Starting initializations...");

  // initializeTitleCheck?.(); // Optional: Call if it exists

  console.log("Running and AWAITING renderPlaylist...");
  try {
      // Wait for HTML rendering and initial setup from playlistManager
      await renderPlaylist();
      console.log("Finished AWAITING renderPlaylist.");

      // --- Attach listener for Info Button ---
      // Get the selector string from config
      const infoButtonSelector = config?.selectors?.infoButtonId; // Use the correct key 'infoButtonId'

      // Find the element using the selector (expects '#id' format from config)
      const infoButton = infoButtonSelector ? document.querySelector(infoButtonSelector) : null;

      if (infoButton) {
          infoButton.style.cursor = 'pointer'; // Make it look clickable
          infoButton.addEventListener('click', (event) => {
              event.preventDefault(); // Prevent default link/button behavior
              console.log("Info button clicked!");

              // Find scroll items using config selectors
              const currentScrollItems = document.querySelectorAll(`${config.selectors.track} ${config.selectors.scrollItem}`);

              if (currentScrollItems && currentScrollItems.length > 0) {
                  // Calculate index of the last item (info section)
                  const infoSectionIndex = currentScrollItems.length - 1;
                  console.log(`Attempting to scroll to info section index: ${infoSectionIndex}`);
                  goToIndex(infoSectionIndex); // Call the imported scroll function
              } else {
                  console.warn("Could not find any scroll items when info button clicked.");
              }
          });
          console.log("Info button event listener attached.");
      } else {
           // Log the selector that failed if it was defined
           console.warn(`Info button ('${infoButtonSelector || 'SELECTOR UNDEFINED'}') not found. Cannot attach listener.`);
      }

      // --- Attach listener for Title ---
       // Get the selector string from config
      const titleElementSelector = config?.selectors?.titleElementId; // Use the correct key 'titleElementId'

       // Find the element using the selector (expects '#id' format from config)
      const titleElement = titleElementSelector ? document.querySelector(titleElementSelector) : null;

      if (titleElement) {
           titleElement.style.cursor = 'pointer'; // Make it look clickable
           titleElement.addEventListener('click', (event) => {
               event.preventDefault(); // Prevent default link/button behavior
               console.log("Main title clicked! Scrolling to top (index 0).");
               goToIndex(0); // Call the imported scroll function to go to the start
           });
           console.log("Main title click listener attached.");
      } else {
           // Log the selector that failed if it was defined
           console.warn(`Main title ('${titleElementSelector || 'SELECTOR UNDEFINED'}') not found. Cannot attach listener.`);
      }

  } catch (error) {
      // Catch errors from renderPlaylist or listener attachment
      console.error("ERROR during renderPlaylist or attaching listeners:", error);
  }

   console.log("All initializations in load handler complete.");
});