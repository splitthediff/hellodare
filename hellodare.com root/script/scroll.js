export function initializeScrollControl() {
    const videoTrack = document.querySelector(".video-track");
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
  
  /*
  window.addEventListener("load", () => {
    const videoContainer = document.querySelector(".video-portfolio");
    const firstVideo = document.querySelector(".video-item");
  
    if (!videoContainer || !firstVideo) return;
  
    setTimeout(() => {
      const scrollPosition = firstVideo.offsetLeft - (videoContainer.clientWidth / 2) + (firstVideo.clientWidth / 2);
      videoContainer.scrollLeft = scrollPosition;
    }, 100);
  });*/

  /*
  
  const videoContainer = document.querySelector(".video-portfolio");
  const videos = document.querySelectorAll(".video-item");
  
  function updateBlurEffect() {
    const containerCenter = videoContainer.scrollLeft + videoContainer.clientWidth / 2;
  
    let closestVideo = null;
    let minDistance = Infinity;
  
    videos.forEach((video) => {
      const videoCenter = video.offsetLeft + video.clientWidth / 2;
      const distance = Math.abs(containerCenter - videoCenter);
  
      if (distance < minDistance) {
        minDistance = distance;
        closestVideo = video;
      }
    });
  
    videos.forEach((video) => {
      if (video === closestVideo) {
        video.classList.remove("blur");
      } else {
        video.classList.add("blur");
      }
    });
  }
  
  // Update blur effect on scroll
  videoContainer.addEventListener("scroll", updateBlurEffect);
  
  // Run once after page load to set initial state
  window.addEventListener("load", () => {
    setTimeout(updateBlurEffect, 300);
  });*/