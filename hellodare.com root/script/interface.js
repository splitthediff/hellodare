export function checkTitlePosition() {
    const introTitle = document.querySelector('.intro-title');
    const videoItem = document.querySelector('.video-item iframe');
  
    if (!introTitle || !videoItem) return;
  
    const videoPosition = videoItem.getBoundingClientRect();
    const titleHeight = introTitle.offsetHeight;
  
    if (videoPosition.top <= titleHeight && videoPosition.bottom > titleHeight) {
      introTitle.classList.add('overlapped');  
    } else {
      introTitle.classList.remove('overlapped');  
    }
  }
  
export function initializeTitleCheck() {
    checkTitlePosition(); // Run on load

    window.addEventListener('scroll', checkTitlePosition);
    window.addEventListener('resize', checkTitlePosition);
}