export function initializeScrollControl() {
    const videoTrack = document.querySelector(".js-video-track");
    let scrollPosition = 0;
  
    window.addEventListener("wheel", (event) => {
      event.preventDefault(); // Prevent default vertical scrolling
  
      scrollPosition += event.deltaY * 0.5; // Adjust scroll speed
      scrollPosition = Math.max(0, Math.min(scrollPosition, videoTrack.scrollWidth - window.innerWidth));
  
      videoTrack.style.transform = `translateX(-${scrollPosition}px)`;
    }, { passive: false });
  
    const iframes = document.querySelectorAll('.video-item iframe');
  
    iframes.forEach((iframe) => {
      iframe.addEventListener('mouseenter', () => {
        iframe.style.pointerEvents = 'auto'; // Allow clicks when hovered
      });
      iframe.addEventListener('mouseleave', () => {
        iframe.style.pointerEvents = 'none'; // Re-enable scrolling when not hovering
      });
    });
}
