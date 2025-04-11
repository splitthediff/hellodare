// js/playlistManager.js (REVERTED - NO CONFIG)

// --- Imports ---
// Adjust paths as needed
import { initializeGsapScroll, toggleGlobalVolume, goToIndex } from './scroll.js';
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
    positionVideoOverlays(); // JS sets initial bottom/left/maxWidth based on screen size
    initializeGsapScroll(currentVideos);

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            updateDOMVideoSizes(currentVideos);
            positionVideoOverlays(); // Re-call on resize
        }, config.input.resizeDebounce); // <<< Use config
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
        playlistHTML += `
            <div class="${scrollItemClass} video-item" data-video-id="${video.id}">
                <div class="video-aspect-wrapper">
                    ${thumbnailHTML}
                    <iframe src="${src}" id="iframe-${video.id}" loading="lazy" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
                    <div class="video-controls">
                        <button class="controls-button play-pause-button" id="playPauseButton-${video.id}">Play</button>
                        <button class="controls-button sound-button" id="soundButton-${video.id}">Sound Off</button>
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
                    <h2>About</h2>
                    <p>Studio Dare is the creative studio of Leanne Dare.<br>
                    <p>We work in a multitude of disciplines including graphics, animation, live action direction, photography & creative direction.</p>
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
                <div class="info-column info-column-right">
                    <h3>Contact</h3>
                    <p><a href="mailto:studio@hellodare.com" class="email-link" target="_blank" rel="noopener noreferrer">studio@hellodare.com</a></p>
                    <h3>Links</h3>
                    <p><a href="https://vimeo.com/hellodare" class="internal-link" target="_blank" rel="noopener noreferrer">Vimeo</a></p>
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

function positionVideoOverlays() {
    // console.log("Repositioning video overlays...");
    const videoItems = document.querySelectorAll(`${config.selectors.scrollItem}.video-item`);
    const isMobile = window.innerWidth <= config.breakpoints.mobileMaxWidth; // Check if mobile

    videoItems.forEach(item => {
        const wrapper = item.querySelector(VIDEO_WRAPPER_SELECTOR);
        const overlay = item.querySelector(INFO_OVERLAY_SELECTOR);
        const scrollItem = item;

        if (!wrapper || !overlay || !scrollItem) { return; }

        const scrollItemRect = scrollItem.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();

        // --- Calculate Bottom Position (Same as before) ---
        const wrapperBottomRelativeToParent = wrapperRect.bottom - scrollItemRect.top;
        const spaceBelowWrapper = scrollItemRect.height - wrapperBottomRelativeToParent;
        const overlayBottomPosition = spaceBelowWrapper - config.layout.overlayOffsetBottom;
        overlay.style.bottom = `${overlayBottomPosition}px`;

        // --- Calculate and Apply Left Position CONDITIONALLY ---
        if (isMobile) {
            // MOBILE: Center the overlay (left: 50%, transform needed)
            overlay.style.left = '50%';
            // We also need the translateX transform for centering applied via CSS now
            // Let's ensure the CSS handles the transform

            // Set max width based on wrapper
            overlay.style.maxWidth = `${wrapperRect.width}px`;
            overlay.style.width = 'auto'; // Ensure width doesn't conflict
             // Ensure text-align if needed (or let CSS handle)
            // overlay.style.textAlign = 'center';

        } else {
            // DESKTOP: Align flush left with wrapper
            const overlayLeftPosition = wrapperRect.left - scrollItemRect.left;
            overlay.style.left = `${overlayLeftPosition}px`;
             // Reset transform if it was applied for mobile centering (better done in CSS)
            // overlay.style.transform = 'translateY(10px)'; // Reset to initial vertical only

            // Set desktop max width from config or keep auto
             overlay.style.maxWidth = '60%'; // Example from CSS
             overlay.style.width = 'auto';
             // Ensure text-align if needed (or let CSS handle)
             // overlay.style.textAlign = 'left';
        }
        // --- END CONDITIONAL LEFT POSITION ---
    });
}

// Button listeners are expected to be in main.js now