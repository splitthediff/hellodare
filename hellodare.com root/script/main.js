// TITLE OVERLAP

  // Get the intro title element
  const introTitle = document.querySelector('.intro-title');

  // Get the video item element (iframe)
  const videoItem = document.querySelector('.video-item iframe');

  // Function to handle the scroll and resize events
  const checkTitlePosition = () => {
    // Get the position of the video item relative to the viewport
    const videoPosition = videoItem.getBoundingClientRect();

    // Get the height of the intro title
    const titleHeight = introTitle.offsetHeight;

    // Check if the top of the video has crossed under the title
    if (videoPosition.top <= titleHeight && videoPosition.bottom > titleHeight) {
      introTitle.classList.add('overlapped');  // Change color when the video is under the title
    } else {
      introTitle.classList.remove('overlapped');  // Revert color when the video is not under the title
    }
  };

    // Ensure the initial check is performed once content is loaded
    window.addEventListener('load', () => {
      checkTitlePosition(); // Run the function on page load

      // Add scroll event listener to check the position as the user scrolls
      window.addEventListener('scroll', checkTitlePosition);

      // Add resize event listener to handle window resizing
      window.addEventListener('resize', checkTitlePosition);
    });

  // Ensure the check is performed when the page is resized as well
  window.addEventListener('resize', checkTitlePosition);


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

window.addEventListener("load", () => {
  const videoContainer = document.querySelector(".video-portfolio");
  const firstVideo = document.querySelector(".video-item");

  if (!videoContainer || !firstVideo) return;

  setTimeout(() => {
    const scrollPosition = firstVideo.offsetLeft - (videoContainer.clientWidth / 2) + (firstVideo.clientWidth / 2);
    videoContainer.scrollLeft = scrollPosition;
  }, 100);
});