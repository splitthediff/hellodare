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
    positionVideoOverlays(); // Initial call
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
                            <p class="recognition-award-name">Emmy Award - Outstanding Main Title Design</p>
                            <p class="recognition-details">Inside Bill's Brain: Decoding Bill Gates - Netflix - 2020</p>
                        </div>

                        <div class="recognition-item">
                            <p class="recognition-award-name">SXSW Film Design Award - Excellence in Title Design</p>
                            <p class="recognition-details">Special Jury Recognition - White Men Can't Jump - Hulu - 2023</p>
                        </div>

                        <div class="recognition-item">
                            <p class="recognition-award-name">Clio Entertainment - Silver Winner</p>
                            <p class="recognition-details">Television/Series: Title Sequence - Inside Bill's Brain - Netflix - 2020</p>
                        </div>

                    </div>
                </div>
                <div class="info-column info-column-right">
                    <h3>Contact</h3>
                    <p><a href="mailto:studio@hellodare.com">studio@hellodare.com</a></p>
                    <h3>Links</h3>
                    <p><a href="https://vimeo.com/hellodare">Vimeo</a></p>
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

    videoItems.forEach(item => {
        const wrapper = item.querySelector(VIDEO_WRAPPER_SELECTOR);
        const overlay = item.querySelector(INFO_OVERLAY_SELECTOR);
        const scrollItem = item; // Parent for relative positioning

        if (!wrapper || !overlay || !scrollItem) { return; }

        // --- Get Rects ---
        const scrollItemRect = scrollItem.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();

        // --- Calculate Bottom Position (relative to scrollItem bottom) ---
        const wrapperBottomRelativeToParent = wrapperRect.bottom - scrollItemRect.top;
        const spaceBelowWrapper = scrollItemRect.height - wrapperBottomRelativeToParent;
        const overlayBottomPosition = spaceBelowWrapper - config.layout.overlayOffsetBottom; // Use config
        overlay.style.bottom = `${overlayBottomPosition}px`;

        // --- Calculate Left Position (relative to scrollItem left) ---
        // This is simply the wrapper's left edge distance from the scroll item's left edge
        const overlayLeftPosition = wrapperRect.left - scrollItemRect.left;
        overlay.style.left = `${overlayLeftPosition}px`; // <<< SET LEFT STYLE

        // --- Adjust Max Width Dynamically (Optional but good) ---
        // Set max width to match the actual rendered width of the wrapper
        overlay.style.maxWidth = `${wrapperRect.width}px`;
        overlay.style.width = 'auto'; // Let content determine width up to max

         // --- Debugging Logs ---
         // console.log(`Video ${item.dataset.videoId}: Wrapper L: ${wrapperRect.left.toFixed(1)}, Item L: ${scrollItemRect.left.toFixed(1)}, Overlay Left Set: ${overlayLeftPosition.toFixed(1)}px`);
         // console.log(`Video ${item.dataset.videoId}: Wrapper B: ${wrapperRect.bottom.toFixed(1)}, Item T: ${scrollItemRect.top.toFixed(1)}, Item H: ${scrollItemRect.height.toFixed(1)}, Space Below: ${spaceBelowWrapper.toFixed(1)}px, Offset: ${config.layout.overlayOffsetBottom}, Overlay Bottom Set: ${overlayBottomPosition.toFixed(1)}px`);
         // console.log(`Video ${item.dataset.videoId}: Wrapper W: ${wrapperRect.width.toFixed(1)}px, Overlay MaxWidth Set: ${wrapperRect.width.toFixed(1)}px`);


    });
}

// Button listeners are expected to be in main.js now