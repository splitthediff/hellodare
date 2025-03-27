import { initializeScrollControl } from './scroll.js';
import { initializeTitleCheck } from './interface.js';
import { createVideoItems } from './vimeo.js';



window.addEventListener('load', () => {
  initializeTitleCheck(); // Run the function on page load
  initializeScrollControl(); // Initialize the scrolling and pointer events logic
});


// Sample video data (replace with real video IDs or data)
const videos = [
  { id: '535355395'},
  { id: '535355395'},
  { id: '535355395'},
  { id: '535355395'}
];

// Create video items when the page loads
window.addEventListener('load', () => {
  createVideoItems(videos);
});