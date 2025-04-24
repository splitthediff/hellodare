// js/playlistManager.js

// --- Imports ---
// Adjust paths as needed
import { initializeGsapScroll, toggleGlobalVolume, goToIndex, getCurrentIndex } from './scroll.js';
import { playlist } from '../data/playlistData.js';
import { Video } from '../modules/Video.js';
import { config } from '../config.js';

// --- Global Variable ---
let currentVideos = [];
const VIDEO_WRAPPER_SELECTOR = '.video-aspect-wrapper';
const INFO_OVERLAY_SELECTOR = '.video-info-overlay';

// --- Main Exported Function ---
export async function renderPlaylist() {
    currentVideos = await initializeVideos();
    renderVideos(currentVideos);
    renderNavigationMenu(playlist, "Info");

    // Initialize Players (calls positionSingleInfoOverlay internally via Video.js)
    console.log("--- Starting player init trigger ---");
    if (currentVideos && currentVideos.length > 0) {
        currentVideos.forEach(video => {
            video.initializePlayer().catch(err => console.warn(`Init ${video.id} fail: ${err.message}`));
        });
        console.log("--- Finished player init trigger ---");
    }

    // --- NO Initial positioning call needed here ---
    console.log("Initial overlay positioning skipped - will position on player ready.");

    initializeGsapScroll(currentVideos);

    // --- Resize Listener ---
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            console.log("Resize Trigger - Repositioning All Overlays");
            updateDOMVideoSizes(currentVideos); // Update sizes first

            // --- Call positioning for ALL items on resize ---
            // Loop through videos and call positioning for each
            if (currentVideos && currentVideos.length > 0) {
                 currentVideos.forEach(video => {
                    // Check if player is initialized before repositioning maybe? Or just call it.
                    positionSingleInfoOverlay(video.id);
                 });
            }
            // --- End resize positioning ---

        }, config.input.resizeDebounce);
    });
}

// --- Helper Functions ---
async function initializeVideos() {
    const videos = await Promise.all(
        playlist.map(async (videoData) => {
            const video = new Video(videoData);
            await video.initialize();
            return video;
        })
    );
    updateVideoObjectSizes(videos);
    return videos;
}

function updateVideoObjectSizes(videos) {
    const currentContainerWidth = getDynamicWidth();
    videos.forEach((video) => { video.updateVideoSizes(currentContainerWidth); });
}

function updateDOMVideoSizes(videos) {
    updateVideoObjectSizes(videos);
}

function renderVideos(videos) {
    console.log("--- Running renderVideos ---");
    let playlistHTML = '';
    if (!videos) { videos = []; }
    const scrollItemClass = config.selectors.scrollItem.substring(1);

    videos.forEach((video) => {
        const src = video.iframeSrc;
        const thumbnailHTML = video.thumbnailUrl ? `<img src="${video.thumbnailUrl}" class="video-thumbnail" id="thumbnail-${video.id}" alt="${video.title || 'Video thumbnail'}">` : '';
        
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
                            <button ... id="playPauseButton-${video.id}">Play</button>
                            ${progressBarHTML}
                            <button ... id="soundButton-${video.id}">Sound Off</button>
                        </div>
                    </div>
                    <div class="video-info-overlay" id="video-info-${video.id}">
                        <h3 class="video-info-title">${video.title || 'Untitled'}</h3>
                        <p class="video-info-year">${video.year || ''}</p>
                    </div>
            </div>
        `;
    });

    playlistHTML += `
        <div class="${scrollItemClass} info-section" id="info-section">
            <div class="info-content">
                <div class="info-column info-column-left">
                    <div class="info-block">
                        <h2>About</h2>
                        <p>Studio Dare is the creative studio of Leanne Dare.<br>
                        <p>We work in a multitude of disciplines including graphics, animation, live action direction, photography & creative direction.</p>
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

    videos.forEach((video) => {
        const videoId = video.id;
        const videoItemElement = trackElement.querySelector(`.video-item[data-video-id="${videoId}"]`);
        if (!videoItemElement) { console.error(`Failed to find video item ${videoId}`); return; }
        const wrapperElement = videoItemElement.querySelector('.video-aspect-wrapper');
        if (wrapperElement && video.nativeWidth > 0 && video.nativeHeight > 0) { wrapperElement.style.aspectRatio = `${video.nativeWidth}/${video.nativeHeight}`; }
        const playPauseButton = videoItemElement.querySelector(`#playPauseButton-${video.id}`);
        const soundButton = videoItemElement.querySelector(`#soundButton-${videoId}`);
        const thumbnailElement = videoItemElement.querySelector(`#thumbnail-${videoId}`);
        if (playPauseButton) { playPauseButton.addEventListener('click', async () => { await video.togglePlayPause(playPauseButton); }); }
        if (soundButton) {
            // The 'toggleGlobalVolume' used here is the one imported at the top of THIS file
            soundButton.addEventListener('click', async () => {
                // console.log(`Sound button clicked for ${video.id}`);
                // Pass the imported function AS AN ARGUMENT to the video's method
                await video.toggleSound(toggleGlobalVolume); // <<< ENSURE THIS PASSES THE ARGUMENT
            });
        } else {
            console.warn(`renderVideos: Sound button not found for ${video.id}`);
        }
        if (thumbnailElement) { video.thumbnailElement = thumbnailElement; }
    });

    console.log("--- Finished renderVideos ---");
}

function getDynamicWidth() {
    const containerElement = document.querySelector(config.selectors.middleColumn);
    return containerElement ? containerElement.clientWidth : window.innerWidth;
}

export function positionSingleInfoOverlay(videoId) {
    // console.log(`Positioning single overlay for ${videoId} using GBCR logic...`);
    const item = document.querySelector(`${config.selectors.scrollItem}.video-item[data-video-id="${videoId}"]`);
    if (!item) { /* console.warn(`Item not found for positioning overlay ${videoId}`); */ return; }

    const wrapper = item.querySelector('.video-aspect-wrapper');
    const overlay = item.querySelector('.video-info-overlay'); // Overlay is sibling
    const scrollItem = item;

    if (!wrapper || !overlay || !scrollItem) {
        // console.warn(`[PositionOverlay ${videoId}] Missing elements.`);
        return;
    }
     // Add check for item visibility/height before using getBoundingClientRect
     if (item.offsetHeight === 0) {
         // console.warn(`[PositionOverlay ${videoId}] Item height is 0. Cannot calculate reliably.`);
         // Optional: Retry?
         // setTimeout(() => positionSingleInfoOverlay(videoId), 50);
         return;
     }

    const isMobile = window.innerWidth <= config.breakpoints.mobileMaxWidth;

    const scrollItemRect = scrollItem.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();

    // --- Calculate Bottom Position ---
    const wrapperBottomRelativeToParent = wrapperRect.bottom - scrollItemRect.top;
    const spaceBelowWrapper = scrollItemRect.height - wrapperBottomRelativeToParent;
    // Ensure bottom isn't negative, maybe add a minimum gap
    const overlayBottomPosition = Math.max(5, spaceBelowWrapper - config.layout.overlayOffsetBottom); // Using Math.max(5, ...) as safety
    // --- SET 'bottom' STYLE ---
    overlay.style.bottom = `${overlayBottomPosition}px`;

    if (isMobile) {
        overlay.style.left = '50%'; // CSS handles transform
        overlay.style.maxWidth = `${wrapperRect.width * 0.9}px`; // Example width
        overlay.style.width = 'auto';
    } else {
        const overlayLeftPosition = wrapperRect.left - scrollItemRect.left;
        overlay.style.left = `${overlayLeftPosition}px`; // Align left
        overlay.style.maxWidth = '60%'; // Example desktop width
        overlay.style.width = 'auto';
        // Ensure mobile centering transform is removed/overridden by CSS if needed
    }
    // --- End Left Position ---

    // console.log(`[PositionOverlay GBCR ${videoId}] Set: bottom=${overlay.style.bottom}, left=${overlay.style.left}`);
}

function renderNavigationMenu(videoData, infoSectionName = "Info") {
    console.log("--- Rendering Navigation Menu ---");
    const navContainer = document.getElementById('main-navigation'); // Use ID from HTML
    if (!navContainer) {
        console.error("Navigation container #main-navigation not found.");
        return;
    }

    let navHTML = '<ul class="nav-link-list">'; // Start list

    // Add link for each video
    videoData.forEach((video, index) => {
        // Use data-index attribute to store the target scroll index
        navHTML += `<li><a href="#" class="nav-link" data-index="${index}">${index}<span class="nav-space">${video.title || `Video ${index + 1}`}</a></li>`;
    });

    // Add link for the Info section
    const infoIndex = videoData.length; // Index after the last video
    navHTML += `<li><a href="#" class="nav-link" data-index="${infoIndex}">${infoSectionName}</a></li>`;

    navHTML += '</ul>'; // End list

    // Add Prev/Next Buttons
    navHTML += `
        <div class="nav-controls">
            <button class="nav-button nav-button-prev" id="nav-prev-btn" aria-label="Previous Section"><</button>
            <button class="nav-button nav-button-next" id="nav-next-btn" aria-label="Next Section">></button>
        </div>
    `;

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
            event.preventDefault();
            const targetLink = event.target.closest('.nav-link'); // Find clicked link
            if (targetLink && targetLink.dataset.index !== undefined) {
                const targetIndex = parseInt(targetLink.dataset.index, 10);
                if (!isNaN(targetIndex) && typeof goToIndex === 'function') {
                    console.log(`Nav link clicked: Scrolling to index ${targetIndex}`);
                    goToIndex(targetIndex);
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