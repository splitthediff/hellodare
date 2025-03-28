import { initializeScrollControl } from './scroll.js';
import { initializeTitleCheck } from './interface.js';
import { renderPlaylist } from './playlist.js';

document.addEventListener("DOMContentLoaded", () => {
  gsap.fromTo(".title", 
      { opacity: 0, y: 50 }, // Start hidden & slightly below
      { opacity: 1, y: 0, duration: 1, ease: "power2.out" } // Animate up with fade-in
  );
});

gsap.fromTo(".title", 
  { opacity: 0, y: 10 }, 
  { opacity: 1, y: 0, duration: 1, ease: "power2.out", 
    scrollTrigger: {
      trigger: ".title-container",
      start: "top 50%", // Triggers when it reaches the middle
      toggleActions: "play none none none"
    }
  }
);


window.addEventListener('load', () => {
  initializeTitleCheck();
  renderPlaylist();
  initializeScrollControl();
});