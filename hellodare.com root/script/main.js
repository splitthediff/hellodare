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

  // Debugging - log the values to ensure the calculations are correct
  console.log('Video position top:', videoPosition.top); // Debugging line
  console.log('Video position bottom:', videoPosition.bottom); // Debugging line
  console.log('Title height:', titleHeight); // Debugging line

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