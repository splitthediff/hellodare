import { initializeScrollControl } from './scroll.js';
import { initializeTitleCheck } from './interface.js';



window.addEventListener('load', () => {
  initializeTitleCheck(); // Run the function on page load
  initializeScrollControl(); // Initialize the scrolling and pointer events logic
});