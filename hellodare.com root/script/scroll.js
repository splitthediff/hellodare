export function initializeScrollControl() {
  const videoTrack = document.querySelector(".video-track");
  const iframes = document.querySelectorAll('.video-item iframe'); // Get iframes early

  if (!videoTrack) {
      console.error("Error: '.video-track' element not found.");
      return;
  }

  // --- IFrame Interaction Handling ---
  // This needs to run FIRST to set the initial state correctly.
  iframes.forEach((iframe) => {
      iframe.style.pointerEvents = 'none';

      iframe.addEventListener('mouseenter', () => {
          iframe.style.pointerEvents = 'auto';
      });

      iframe.addEventListener('mouseleave', () => {
          iframe.style.pointerEvents = 'none';
      });
  });

  // --- Global Wheel Listener for Vertical Scroll ---
  window.addEventListener("wheel", (event) => {
      let isOverInteractiveIframe = false;
      iframes.forEach(iframe => {
          // Check if the iframe is currently hovered AND has pointer-events enabled
          if (iframe.matches(':hover') && iframe.style.pointerEvents === 'auto') {
              isOverInteractiveIframe = true;
          }
      });

      // If the cursor is NOT over an interactive iframe,
      // then hijack the scroll event to control the video track.
      if (!isOverInteractiveIframe) {
          event.preventDefault();

          // Directly adjust the scrollTop property of the video track
          // Multiply by a factor to adjust sensitivity if needed (e.g., 0.8 or 1.2)
          videoTrack.scrollTop += event.deltaY * 1.0;
      }

  }, { passive: false }); // passive: false is required for preventDefault()
}
  
