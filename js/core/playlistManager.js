// js/playlistManager.js

// --- Imports ---
// Adjust paths as needed
import { initializeGsapScroll, toggleGlobalVolume, goToIndex, getCurrentIndex, closeNavMenu, blurActiveElement, updateMenuToggleUI, updateTitleStyleBasedOnViewport } from './scroll.js';
import { playlist } from '../data/playlistData.js';
import { Video } from '../modules/Video.js';
import { config } from '../config.js';
import { paddedNumber } from '../utils/utils.js';
import { checkForMobile } from '../modules/inputManager.js';
import { setInitialVideoContentState } from './videoController.js';

// --- Global Variable ---
let currentVideos = [];
const VIDEO_WRAPPER_SELECTOR = '.video-aspect-wrapper';
const INFO_OVERLAY_SELECTOR = '.video-info-overlay';

// --- Main Exported Function ---
export async function renderScrollTrack() {
    currentVideos = initializeVideos();
    renderTrackContent(currentVideos);
    renderNavigationMenu(playlist, "Intro", "Info");

    console.log("--- Starting player init trigger ---");
    if (currentVideos && currentVideos.length > 0) {
        currentVideos.forEach(video => {
            console.log(`[PlaylistManager] Calling initializePlayer for video ${video.id}`);
            video.initializePlayer().catch(err => console.warn(`Init ${video.id} fail: ${err.message}`));
        });
        console.log("--- Finished player init trigger ---");
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
    videos.forEach((video) => { video.updateVideoSizes(currentContainerWidth); });
}

function renderTrackContent(videos) {
    console.log("--- Running renderVideos ---");
    let playlistHTML = '';
    if (!videos) { videos = []; }
    const scrollItemClass = config.selectors.scrollItem.substring(1);

    // INTRO SECTION
    playlistHTML += `
        <div class="${scrollItemClass} info-section" id="intro-section">
            <div class="info-content">
                <div class="info-column info-column-left">
                    <div class="info-block">
                        <h2>STUDIO DARE</h2>
                        <h2>SELECTED WORK</h2>
                        <h2>SCROLL TO VIEW</h2>
                    </div>
                    <div id="current-date-display" class="date-display"></div>
                </div>
            </div>
        </div>
    `;

    // --- Render each video item ---
    videos.forEach((video) => {
        const src = video.iframeSrc;
        const thumbnailHTML = video.thumbnailUrl ? `<img src="${video.thumbnailUrl}" class="video-thumbnail" id="thumbnail-${video.id}" alt="${video.title || 'Video thumbnail'}">` : '';
        
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
            <div class="${scrollItemClass} video-item" data-video-id="${video.id}">
                    <div class="video-aspect-wrapper" id="video-wrapper-${video.id}">
                        ${thumbnailHTML}
                        <iframe src="${src}" id="iframe-${video.id}" ...></iframe>
                        <div class="video-controls">
                            <button class="controls-button play-pause-button" id="playPauseButton-${video.id}" aria-label="Play">
                                <span class="button-icon-wrapper icon-play-wrapper">${playIconRef}</span>
                                <span class="button-icon-wrapper icon-pause-wrapper is-hidden">${pauseIconRef}</span>
                            </button>
                            ${progressBarHTML}
                            <button class="controls-button sound-button" id="soundButton-${video.id}" aria-label="Unmute">
                                <span class="button-icon-wrapper icon-volume-off-wrapper">${volumeOffIconRef}</span>
                                <span class="button-icon-wrapper icon-volume-on-wrapper is-hidden">${volumeOnIconRef}</span>
                            </button>
                        </div>
                    </div>
                    <div class="video-info-overlay" id="video-info-${video.id}">
                        <h3 class="video-info-title">${video.title || 'Untitled'}</h3>
                        <p class="video-info-year">${video.year || ''}</p>
                    </div>
            </div>
        `;
    });

    // INFO SECTION
    playlistHTML += `
        <div class="${scrollItemClass} info-section" id="info-section">
            <div class="info-content">
                <div class="info-column info-column-left">
                    <div class="info-block">
                        <div class="info-header">
                            <h2>AT STUDIO DARE<br>WE MAKE FUN AND THOUGHTFUL THINGS<br>AND WE LIKE HAIKUS</h2>
                        </div>
                    </div>
                    <div class="info-block">
                        <h2>About</h2>
                        <p>Our expertise spans design, animation, live action direction, photography, and creative direction for film, television, commercials, branding, and social media. We believe design and storytelling can make the world a better place, and we will always give our absolute best shot whenever we have the chance to prove it.</p>
                    </div>     
                    <div class="info-block">             
                        <div class="recognition-list">
                            <h3>Recognition</h3>

                            <div class="recognition-item">
                                <p class="recognition-award-name">Emmy Award - Outstanding Motion Design</p>
                                <p class="recognition-details">Inside Bill's Brain: Decoding Bill Gates - Netflix - 2020</p>
                            </div>

                            <div class="recognition-item">
                                <p class="recognition-award-name">Emmy Award - Outstanding Motion Design</p>
                                <p class="recognition-details">13th - Netflix - 2017</p>
                            </div>

                            <div class="recognition-item">
                                <p class="recognition-award-name">Emmy Nomination - Outstanding Main Title Design </p>
                                <p class="recognition-details">Masters of Sex - Showtime - 2012</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="info-column info-column-right">
                    <div class="info-block">
                        <h3>Contact</h3>
                        <p><a href="mailto:studio@hellodare.com" class="email-link" target="_blank" rel="noopener noreferrer">studio@hellodare.com</a></p>
                    </div>
                    <div class="info-block">
                        <h3>Links</h3>
                        <p><a href="https://vimeo.com/hellodare" class="internal-link" target="_blank" rel="noopener noreferrer">Vimeo</a></p>
                    </div>
                </div>
            </div>
        </div>
    `;

    const trackElement = document.querySelector(config.selectors.track);
    if (!trackElement) { console.error(`renderVideos: '${config.selectors.track}' not found.`); return; }
    trackElement.innerHTML = playlistHTML;

    const introSectionElement = document.getElementById(config.selectors.introSectionId.substring(1));
    if (introSectionElement) {
        setInitialVideoContentState(introSectionElement, false);
    }

    videos.forEach((video) => {
        const videoId = video.id;
        const videoItemElement = trackElement.querySelector(`.video-item[data-video-id="${videoId}"]`);
        if (!videoItemElement) { console.error(`Failed to find video item ${videoId}`); return; }
        videoItemElement.style.position = 'relative';
        const wrapperElement = videoItemElement.querySelector('.video-aspect-wrapper');
        if (wrapperElement && video.nativeWidth > 0 && video.nativeHeight > 0) { wrapperElement.style.aspectRatio = `${video.nativeWidth}/${video.nativeHeight}`; }
        setInitialVideoContentState(videoItemElement, true, video);
    });

    const infoSectionElement = document.getElementById(config.selectors.infoSectionId.substring(1)); // Get the info section element by ID
    if (infoSectionElement) {
        setInitialVideoContentState(infoSectionElement, false); 
    }

    console.log("--- Finished renderVideos ---");
}

function getDynamicWidth() {
    const containerElement = document.querySelector(config.selectors.middleColumn);
    return containerElement ? containerElement.clientWidth : window.innerWidth;
}

export function positionSingleInfoOverlay(videoId) {
    const item = document.querySelector(`${config.selectors.scrollItem}.video-item[data-video-id="${videoId}"]`);
    if (!item) return;

    const wrapper = item.querySelector('.video-aspect-wrapper');
    const overlay = item.querySelector('.video-info-overlay');
    if (!wrapper || !overlay || item.offsetHeight === 0) return;

    // Ensure scrollItem is relatively positioned for absolute overlay
    overlay.style.position = 'absolute';

    // --- Calculate top position below the video ---
    const offsetBelow = config.layout.overlayOffsetBottom || 10; // adjust this value as needed
    const overlayTop = wrapper.offsetTop + (wrapper.offsetHeight/2) + offsetBelow;
    overlay.style.top = `${overlayTop}px`;

    // --- Align overlay left edge with video left edge ---
    const overlayLeft = wrapper.offsetLeft - (wrapper.offsetWidth / 2);
    overlay.style.left = `${overlayLeft}px`;

    // Optional sizing tweaks
    overlay.style.width = `${wrapper.offsetWidth}px`;
    overlay.style.maxWidth = '100%'; // prevent overflow
}

function renderNavigationMenu(videoData, introSectionName = "Intro",infoSectionName = "Info") {
    console.log("--- Rendering Navigation Menu ---");
    const navContainer = document.getElementById('main-navigation');
    if (!navContainer) {
        console.error("Navigation container #main-navigation not found.");
        return;
    }

    let navHTML = '<ul class="nav-link-list">';

    // Intro section at index 0
    navHTML += `<li><a href="#" class="nav-link" data-index="0">${introSectionName}</a></li>`;

    // Add link for each video
    videoData.forEach((video, index) => {
        const navIndex = index + 1; // start at inex 1 for videos
        navHTML += `<li><a href="#" class="nav-link" data-index="${navIndex}">${paddedNumber(navIndex)}<span class="nav-space"></span>${video.titleShortName || `Video ${navIndex}`}</a></li>`;
    });

    // Add link for the Info section
    const infoIndex = videoData.length + 1; 
    navHTML += `<li><a href="#" class="nav-link" data-index="${infoIndex}">${infoSectionName}</a></li>`;

    navHTML += '</ul>'; // End list

    navContainer.innerHTML = navHTML;
    console.log("Navigation menu HTML rendered.");

    // --- Attach Event Listeners AFTER rendering ---
    attachNavigationListeners(navContainer, infoIndex); // Pass infoIndex for boundary checks
}

function attachNavigationListeners(navContainer, lastItemIndex) {
    const linkList = navContainer.querySelector('.nav-link-list');
    const prevButton = navContainer.querySelector('#nav-prev-btn');
    const nextButton = navContainer.querySelector('#nav-next-btn');

    // Listener for Links (using event delegation)
    if (linkList) {
        linkList.addEventListener('click', (event) => {
            // --- ONLY target clicks on the actual .nav-link element ---
            const targetLink = event.target.closest('.nav-link');
            if (targetLink) { // Ensure a nav-link was clicked or is an ancestor
                 event.preventDefault(); // Prevent default link behavior
                 
                const targetIndex = parseInt(targetLink.dataset.index, 10);
                
                if (!isNaN(targetIndex) && typeof goToIndex === 'function') {
                    console.log(`Nav link clicked: Scrolling to index ${targetIndex}`);
                    // --- Step 1: Scroll to the target index ---
                    goToIndex(targetIndex);

                    // --- Step 2: Close the menu after scrolling ---
                    // Check if closeNavMenu is imported and callable
                    if (checkForMobile()){

                        const navMenu = document.getElementById(config.selectors.navigationContainerId);

                        if (typeof closeNavMenu === 'function') {
                            console.log("Nav link clicked, calling closeNavMenu.");
                                          
                            closeNavMenu(); // <<< Call the function to close the menu
                            const activeItemElement = document.querySelector('.scroll-item.active-scroll-item'); // Changed from '.scroll-item.video-item.active-scroll-item'
                            if (activeItemElement){
                                console.log ('%cACTIVE ITEM ELEMENT TRIGGERED FROM PLAYLIST MANAGER.JS', 'color: cyan; font-weight: bold;');
                                blurActiveElement(activeItemElement);
                            }
                     
                        } else {
                            console.error("closeNavMenu function not available in playlistManager.js scope.");
                        }
                    }
                }
            } 
        }); 
        console.log("Navigation link listener attached.");
    }

    // Listener for Prev Button
    if (prevButton) {
        prevButton.addEventListener('click', (event) => {
            event.preventDefault();
            if (typeof getCurrentIndex === 'function' && typeof goToIndex === 'function') {
                const currentIdx = getCurrentIndex();
                if (currentIdx > 0) {
                    console.log("Nav Prev clicked: Scrolling to index", currentIdx - 1);
                    goToIndex(currentIdx - 1);
                } else {
                     console.log("Nav Prev clicked: Already at first item.");
                }
            }
        });
         console.log("Navigation Prev button listener attached.");
    }

    // Listener for Next Button
    if (nextButton) {
        nextButton.addEventListener('click', (event) => {
            event.preventDefault();
             if (typeof getCurrentIndex === 'function' && typeof goToIndex === 'function') {
                const currentIdx = getCurrentIndex();
                // Use lastItemIndex passed in (which includes the info section)
                if (currentIdx < lastItemIndex) {
                    console.log("Nav Next clicked: Scrolling to index", currentIdx + 1);
                    goToIndex(currentIdx + 1);
                } else {
                     console.log("Nav Next clicked: Already at last item.");
                }
            }
        });
         console.log("Navigation Next button listener attached.");
    }
}

export function handleAllVideoAndOverlayResizes() {
    console.log("PlaylistManager: Handling all video and overlay resizes.");
    updateVideoObjectSizes(currentVideos); // Update internal video object sizes
    if (currentVideos && currentVideos.length > 0) {
        currentVideos.forEach(video => {
            positionSingleInfoOverlay(video.id); 
        });
    }
}