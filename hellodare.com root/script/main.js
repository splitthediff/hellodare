import { initializeTitleCheck } from './interface.js';
import { renderPlaylist } from './playlist.js';
import { initializeGsapScroll } from './scroll.js';


window.addEventListener('load', async () => {
  console.log("Load event fired. Starting initializations...");

  console.log("Running initializeTitleCheck...");
  initializeTitleCheck();
  console.log("Finished initializeTitleCheck.");

  console.log("Running and AWAITING renderPlaylist...");
  try {
      await renderPlaylist(); // Renders the videos
      console.log("Finished AWAITING renderPlaylist.");
  } catch (error) {
      console.error("ERROR during renderPlaylist:", error);
  }

  initializeGsapScroll();

   console.log("All initializations in load handler complete.");
});