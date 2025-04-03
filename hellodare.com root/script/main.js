import { initializeScrollControl } from './scroll.js';
import { initializeTitleCheck } from './interface.js';
import { renderPlaylist } from './playlist.js';

gsap.registerPlugin(ScrollTrigger);

document.addEventListener("DOMContentLoaded", () => {
  gsap.fromTo(".title", 
      { opacity: 0, y: 50 }, // Start hidden & slightly below
      { opacity: 1, y: 0, duration: 1, ease: "power2.out" } // Animate up with fade-in
  );
});

window.addEventListener('load', () => {
  initializeTitleCheck();
  renderPlaylist();
  initializeScrollControl();
});