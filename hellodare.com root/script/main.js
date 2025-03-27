import { initializeScrollControl } from './scroll.js';
import { initializeTitleCheck } from './interface.js';
import { renderPlaylist } from './playlist.js';



window.addEventListener('load', () => {
  initializeTitleCheck(); // Run the function on page load
  renderPlaylist();
  initializeScrollControl(); // Initialize the scrolling and pointer events logic
});