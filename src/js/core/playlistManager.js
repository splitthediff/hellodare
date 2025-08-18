// ./js/playlistManager.js

import {
  initializeGsapScroll,
  goToIndex,
  closeNavMenu,
  blurActiveElement,
} from "./scroll.js";
import { playlist } from "../data/playlistData.js";
import { Video } from "../modules/Video.js";
import { config } from "../config.js";
import { paddedNumber } from "../utils/utils.js";
import { checkForMobile } from "../modules/inputManager.js";
import { setInitialVideoContentState } from "./videoController.js";

// --- Global Variable ---
let currentVideos = [];
const VIDEO_WRAPPER_SELECTOR = ".video-aspect-wrapper";
const INFO_OVERLAY_SELECTOR = ".video-info-overlay";

// --- Main Exported Function ---
export async function renderScrollTrack() {
  currentVideos = initializeVideos();
  renderTrackContent(currentVideos);
  renderNavigationMenu(playlist); 

  if (currentVideos && currentVideos.length > 0) {
    currentVideos.forEach((video) => {
      video
        .initializePlayer()
        .catch((err) => console.warn(`Init ${video.id} fail: ${err.message}`));
    });
  }
  initializeGsapScroll(currentVideos);
}

// --- Helper Functions ---
function initializeVideos() {
  const videos = playlist.map((videoData) => {
    const video = new Video(videoData);
    return video;
  });
  updateVideoObjectSizes(videos);
  return videos;
}

function updateVideoObjectSizes(videos) {
  const currentContainerWidth = getDynamicWidth();
  videos.forEach((video) => {
    video.updateVideoSizes(currentContainerWidth);
  });
}

function renderTrackContent(videos) {
  let playlistHTML = "";
  if (!videos) {
    videos = [];
  }
  const scrollItemClass = config.selectors.scrollItem.substring(1);

  // INTRO SECTION
  playlistHTML += `
        <div class="${scrollItemClass} intro-section text-section" id="intro-section">
            <div class="intro-content">
                <div class="intro-column">
                    <div class="info-block">
                        <h2 class="intro-line">STUDIO DARE</h2>
                        <h2 class="intro-line">SELECTED WORK</h2>
                        <h2 id="current-date-display" class="date-display intro-line"></h2>
                        <div class="intro-line intro-arrow-container">
                            <h3>SCROLL TO VIEW</h3>
                            <svg class="icon intro-arrow-icon" id="intro-scroll-arrow" aria-hidden="true">
                                <use xlink:href="#icon-arrow-down"></use>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

  // --- Render each video item ---
  videos.forEach((video) => {
    const src = video.iframeSrc;
    const thumbnailHTML = video.thumbnailUrl
      ? `<img src="${
          video.thumbnailUrl
        }" class="video-thumbnail" id="thumbnail-${video.id}" alt="${
          video.title || "Video thumbnail"
        }">`
      : "";

    const playIconRef = `<svg class="icon icon-play"><use xlink:href="#icon-play"></use></svg>`;
    const pauseIconRef = `<svg class="icon icon-pause"><use xlink:href="#icon-pause"></use></svg>`;
    const volumeOffIconRef = `<svg class="icon icon-volume-off"><use xlink:href="#icon-volume-off"></use></svg>`;
    const volumeOnIconRef = `<svg class="icon icon-volume-on"><use xlink:href="#icon-volume-on"></use></svg>`;

    const progressBarHTML = `
            <div class="progress-bar-container" id="progress-container-${video.id}">
                <div class="progress-bar-fill" id="progress-fill-${video.id}"></div>
            </div>
            <div class="video-time-display" id="current-time-display-${video.id}">0:00</div>
        `;

    playlistHTML += `
            <div class="${scrollItemClass} video-item" data-video-id="${
      video.id
    }">
                    <div class="video-aspect-wrapper" id="video-wrapper-${
                      video.id
                    }">
                        ${thumbnailHTML}
                        <iframe src="${src}" id="iframe-${
      video.id
    }" ...></iframe>
                        <div class="video-controls">
                            <button class="controls-button play-pause-button" id="playPauseButton-${
                              video.id
                            }" aria-label="Play">
                                <span class="button-icon-wrapper icon-play-wrapper">${playIconRef}</span>
                                <span class="button-icon-wrapper icon-pause-wrapper is-hidden">${pauseIconRef}</span>
                            </button>
                            ${progressBarHTML}
                            <button class="controls-button sound-button" id="soundButton-${
                              video.id
                            }" aria-label="Unmute">
                                <span class="button-icon-wrapper icon-volume-off-wrapper">${volumeOffIconRef}</span>
                                <span class="button-icon-wrapper icon-volume-on-wrapper is-hidden">${volumeOnIconRef}</span>
                            </button>
                        </div>
                    </div>
                    <div class="video-info-overlay" id="video-info-${video.id}">
                        <h3 class="video-info-title">${
                          video.title || "Untitled"
                        }</h3>
                        <p class="video-info-year">${video.year || ""}</p>
                    </div>
            </div>
        `;
  });

  // OUTRO SECTION
  playlistHTML += `
        <div class="${scrollItemClass} outro-section text-section" id="outro-section">
            <div class="outro-content">
                <h2 class="outro-line">AT STUDIO DARE<br>WE MAKE FUN AND THOUGHTFUL THINGS<br>AND WE LIKE HAIKUS</h2>
                <h3 class="outro-line">Our expertise spans design, animation, live-action direction, photography, and creative direction for film, television, commercials, branding, and media content. We believe thoughtful design and storytelling can make the world a better place—and we bring our best every time we get the chance to prove it.</h3>
                <h3 class="outro-line"><a href="mailto:studio@hellodare.com" class="email-link" target="_blank" rel="noopener noreferrer">studio@hellodare.com</a></h3>
            </div>
        </div>
    `;

  const trackElement = document.querySelector(config.selectors.track);
  if (!trackElement) {
    console.error(`renderVideos: '${config.selectors.track}' not found.`);
    return;
  }
  trackElement.innerHTML = playlistHTML;

  const introSectionElement = document.getElementById(
    config.selectors.introSectionId.substring(1)
  );
  if (introSectionElement) {
    // setInitialVideoContentState(introSectionElement, false);
  }

  videos.forEach((video) => {
    const videoId = video.id;
    const videoItemElement = trackElement.querySelector(
      `.video-item[data-video-id="${videoId}"]`
    );
    if (!videoItemElement) {
      console.error(`Failed to find video item ${videoId}`);
      return;
    }
    videoItemElement.style.position = "relative";
    const wrapperElement = videoItemElement.querySelector(
      ".video-aspect-wrapper"
    );
    if (wrapperElement && video.nativeWidth > 0 && video.nativeHeight > 0) {
      wrapperElement.style.aspectRatio = `${video.nativeWidth}/${video.nativeHeight}`;
    }
    setInitialVideoContentState(videoItemElement, true, video);
  });

  const infoSectionElement = document.getElementById(
    config.selectors.infoSectionId.substring(1)
  ); // Get the info section element by ID
  if (infoSectionElement) {
    setInitialVideoContentState(infoSectionElement, false);
  }
}

function getDynamicWidth() {
  const containerElement = document.querySelector(
    config.selectors.middleColumn
  );
  return containerElement ? containerElement.clientWidth : window.innerWidth;
}

export function positionSingleInfoOverlay(videoId) {
  const item = document.querySelector(
    `${config.selectors.scrollItem}.video-item[data-video-id="${videoId}"]`
  );
  if (!item) return;

  const wrapper = item.querySelector(".video-aspect-wrapper");
  const overlay = item.querySelector(".video-info-overlay");
  if (!wrapper || !overlay || item.offsetHeight === 0) return;

  // Ensure scrollItem is relatively positioned for absolute overlay
  overlay.style.position = "absolute";

  // --- Calculate top position below the video ---
  const offsetBelow = config.layout.overlayOffsetBottom || 10; // adjust this value as needed
  const overlayTop = wrapper.offsetTop + wrapper.offsetHeight / 2 + offsetBelow;
  overlay.style.top = `${overlayTop}px`;

  // --- Align overlay left edge with video left edge ---
  const overlayLeft = wrapper.offsetLeft - wrapper.offsetWidth / 2;
  overlay.style.left = `${overlayLeft}px`;

  // Optional sizing tweaks
  overlay.style.width = `${wrapper.offsetWidth}px`;
  overlay.style.maxWidth = "100%"; // prevent overflow
}

function renderNavigationMenu(videoData) {
  const navContainer = document.getElementById("main-navigation");
  if (!navContainer) {
    console.error("Navigation container #main-navigation not found.");
    return;
  }

  let navHTML = '<ul class="nav-link-list">';

  videoData.forEach((video, index) => {
    const navIndex = index + 1;
    navHTML += `<li><a href="#" class="nav-link" data-index="${navIndex}">${paddedNumber(
      navIndex
    )}<span class="nav-space"></span>${
      video.titleShortName || `Video ${navIndex}`
    }</a></li>`;
  });

  const infoIndex = videoData.length + 1;

  navHTML += "</ul>";

  navContainer.innerHTML = navHTML;
  attachNavigationListeners(navContainer, infoIndex);
}

function attachNavigationListeners(navContainer, lastItemIndex) {
  const linkList = navContainer.querySelector(".nav-link-list");

  // Listener for Links (using event delegation)
  if (linkList) {
    linkList.addEventListener("click", (event) => {
      // --- ONLY target clicks on the actual .nav-link element ---
      const targetLink = event.target.closest(".nav-link");
      if (targetLink) {
        // Ensure a nav-link was clicked or is an ancestor
        event.preventDefault();

        const targetIndex = parseInt(targetLink.dataset.index, 10);

        if (!isNaN(targetIndex) && typeof goToIndex === "function") {
          goToIndex(targetIndex);

          if (checkForMobile()) {
            const navMenu = document.getElementById(
              config.selectors.navigationContainerId
            );

            if (typeof closeNavMenu === "function") {
              closeNavMenu(); 
              const activeItemElement = document.querySelector(
                ".scroll-item.active-scroll-item"
              );
              if (activeItemElement) {
                blurActiveElement(activeItemElement);
              }
            }
          }
        }
      }
    });
  }
}

export function handleAllVideoAndOverlayResizes() {
  updateVideoObjectSizes(currentVideos); // Update internal video object sizes
  if (currentVideos && currentVideos.length > 0) {
    currentVideos.forEach((video) => {
      positionSingleInfoOverlay(video.id);
    });
  }
}
