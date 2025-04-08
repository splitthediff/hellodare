// playlist.js (FINAL VERSION - Play Once Logic)

import { initializeGsapScroll, toggleGlobalVolume, goToIndex } from './scroll.js'; // Added goToIndex import if needed for button
import { playlist } from './video_playlist.js';

let currentVideos = [];

export async function renderPlaylist() {
    currentVideos = await initializeVideos();
    renderVideos(currentVideos);
   // initializeAllPlayers(currentVideos);
    initializeGsapScroll(currentVideos); // Pass only actual videos

    // Resize listener remains the same
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            updateDOMVideoSizes(currentVideos);
        }, 150);
    });
}

function initializeAllPlayers(videos) {
    console.log("--- Starting initialization of all video players ---");
    videos.forEach(video => {
        video.initializePlayer().catch(e => console.warn(`Initial player init failed for ${video.id}: ${e.message}`));
    });
     console.log("--- Finished initiating player initializations ---");
}

async function initializeVideos() {
    const videos = await Promise.all(
        playlist.map(async (videoData) => {
            const video = new Video(videoData);
            await video.initialize(); // Fetch metadata
            return video;
        })
    );
    updateVideoObjectSizes(videos);
    return videos;
}

function updateVideoObjectSizes(videos) {
    const currentContainerWidth = getDynamicWidth();
    videos.forEach((video) => {
        video.updateVideoSizes(currentContainerWidth);
    });
    console.log("Updated internal video object sizes based on container width:", currentContainerWidth);
}

function updateDOMVideoSizes(videos) {
    updateVideoObjectSizes(videos);
    console.log("Internal video sizes updated on resize. DOM untouched.");
}

function renderVideos(videos) {
    console.log("--- Running renderVideos (including Info Section & Video Info Overlay) ---");
    let playlistHTML = '';
    if (!videos) { videos = []; } // Ensure it's an array
    const scrollItemClass = "scroll-item";

    // 1. Build Video HTML
    videos.forEach((video) => {
        const src = video.iframeSrc || `https://player.vimeo.com/video/${video.id}?muted=1&controls=0`;
        const thumbnailHTML = video.thumbnailUrl
            ? `<img src="${video.thumbnailUrl}" class="video-thumbnail" id="thumbnail-${video.id}" alt="${video.title || 'Video thumbnail'}">`
            : '';

        playlistHTML += `
            <div class="${scrollItemClass} video-item" data-video-id="${video.id}">
                <div class="video-aspect-wrapper"> {/* Hover target */}
                    ${thumbnailHTML}
                    <iframe src="${src}" id="iframe-${video.id}" loading="lazy" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
                    <div class="video-info-overlay" id="video-info-${video.id}">
                        <h3 class="video-info-title">${video.title || 'Untitled'}</h3>
                        <p class="video-info-year">${video.year || ''}</p>
                    </div>
                    <div class="video-controls">
                        <button class="controls-button play-pause-button" id="playPauseButton-${video.id}">Play</button>
                        <button class="controls-button sound-button" id="soundButton-${video.id}">Sound Off</button>
                    </div>
                </div>
            </div>
        `;
    });

    // 2. Add Info Section HTML
    playlistHTML += `
        <div class="${scrollItemClass} info-section" id="info-section">
            <div class="info-content">
                <h2> Studio Dare is the creative studio of Leanne Dare. <h2>
                <p>We work in a multitude of disciplines including graphics, animation, live action direction, photography & creative direction. Our work spans across film, television, branding, social media, and marketing platforms, delivering thought provoking and smile producing content.</p>
            </div>
        </div>
    `;

    // 3. Render to DOM
    const trackElement = document.querySelector('.js-video-track');
    if (!trackElement) { console.error("renderVideos: '.js-video-track' element not found."); return; }
    trackElement.innerHTML = playlistHTML;
    console.log("renderVideos: Set innerHTML on trackElement.");

    // 4. Attach Listeners & Styles for VIDEOS ONLY
    console.log("renderVideos: Starting loop for VIDEO elements...");
    videos.forEach((video) => { // This loop only runs for actual video objects
        const videoId = video.id;
        const videoItemElement = trackElement.querySelector(`.video-item[data-video-id="${videoId}"]`);
        if (!videoItemElement) { console.error(`renderVideos: FAILED to find video item for ID ${videoId}`); return; }

        const wrapperElement = videoItemElement.querySelector('.video-aspect-wrapper');
        if (!wrapperElement) { console.warn(`renderVideos: Could not find .video-aspect-wrapper for video ${videoId}`); return; }

        // Apply aspect ratio style to video wrapper
        if (video.nativeWidth > 0 && video.nativeHeight > 0) {
            // console.log(`Applying ratio for Video ID ${video.id}: ${video.nativeWidth}/${video.nativeHeight}`);
            wrapperElement.style.aspectRatio = `${video.nativeWidth} / ${video.nativeHeight}`;
        } else { console.warn(`renderVideos: Invalid dimensions for video ${videoId}.`); }

        // Attach video-specific event listeners
        const playPauseButton = videoItemElement.querySelector(`#playPauseButton-${videoId}`);
        const soundButton = videoItemElement.querySelector(`#soundButton-${videoId}`);
        const thumbnailElement = videoItemElement.querySelector(`#thumbnail-${videoId}`);

        if (playPauseButton) {
            playPauseButton.addEventListener('click', async () => {
                console.log(`Play/Pause button clicked for ${videoId}`);
                await video.togglePlayPause(playPauseButton);
            });
        } else { console.warn(`renderVideos: Play/Pause button not found for ${videoId}`); }

        if (soundButton) {
            soundButton.addEventListener('click', async () => {
                console.log(`Sound button clicked for ${videoId}`);
                await video.toggleSound();
            });
        } else { console.warn(`renderVideos: Sound button not found for ${videoId}`); }

        if (thumbnailElement) {
            video.thumbnailElement = thumbnailElement;
        }
    }); // End of videos.forEach loop for listeners

    console.log("--- Finished renderVideos ---");
}

class Video {
    constructor(videoData) {
        this.id = videoData.vimeoid;
        this.title = videoData.title;
        this.year = videoData.year;
        this.client = videoData.client;
        this.thumbnailUrl = '';
        this.iframeSrc = '';
        this.player = null;
        this.nativeWidth = 16;
        this.nativeHeight = 9;
        this.aspectRatio = 16 / 9;

        this.hasPlayedOnce = false; // Flag for "play once" logic

        this.playerInitializationPromise = null;
        this.thumbnailElement = null;
    }

    async initialize() {
        // console.log(`[Video ${this.id}] Starting initialize...`);
        try {
            const data = await this.fetchVimeoData(this.id);
            if (data && data.width > 0 && data.height > 0 && data.thumbnail_url) {
                // console.log(`[Video ${this.id}] Using oEmbed data. W=${data.width}, H=${data.height}`);
                this.nativeWidth = data.width;
                this.nativeHeight = data.height;
                this.thumbnailUrl = data.thumbnail_url;
                this.aspectRatio = this.getAspectRatio(this.nativeWidth, this.nativeHeight);
                this.iframeSrc = `https://player.vimeo.com/video/${this.id}?muted=1&controls=0&quality=1080p`; // No autoplay
            } else {
                console.warn(`[Video ${this.id}] Using default 16:9 / no thumbnail due to invalid oEmbed data.`);
                this.nativeWidth = 16; this.nativeHeight = 9; this.aspectRatio = 16 / 9; this.thumbnailUrl = '';
                this.iframeSrc = `https://player.vimeo.com/video/${this.id}?muted=1&controls=0&quality=1080p`;
            }
        } catch (error) {
            console.error(`[Video ${this.id}] Error during initialize logic:`, error);
            this.nativeWidth = 16; this.nativeHeight = 9; this.aspectRatio = 16 / 9; this.thumbnailUrl = '';
            this.iframeSrc = `https://player.vimeo.com/video/${this.id}?muted=1&controls=0&quality=1080p`;
        }
        // console.log(`[Video ${this.id}] Finished initialize.`);
    }

    initializePlayer() {
        if (this.playerInitializationPromise) return this.playerInitializationPromise;
        if (this.player) return Promise.resolve(this.player);

        // console.log(`[Player Init ${this.id}] Starting new initialization process...`);
        this.playerInitializationPromise = new Promise((resolve, reject) => {
            const iframe = document.getElementById(`iframe-${this.id}`);
            if (!iframe) {
                console.error(`[Player Init ${this.id}] Iframe element NOT FOUND.`);
                this.playerInitializationPromise = null;
                return reject(new Error(`Iframe not found for video ${this.id}`));
            }
            try {
                const playerInstance = new Vimeo.Player(iframe);
                playerInstance.ready().then(() => {
                    // console.log(`[Player Init ${this.id}] Player is READY via .ready().`);
                    this.player = playerInstance;

                    // --- Attach Event Listeners ---
                    this.player.on('play', () => {
                        console.log(`[Player Event ${this.id}] Status: played`);
                        if (this.thumbnailElement) this.thumbnailElement.classList.add('thumbnail-hidden');
                        // DO NOT set hasPlayedOnce here
                    });

                    this.player.on('pause', () => {
                        console.log(`[Player Event ${this.id}] Status: paused`);
                        if (this.thumbnailElement) this.thumbnailElement.classList.remove('thumbnail-hidden');
                    });

                    this.player.on('ended', () => {
                        // SET hasPlayedOnce when video naturally ends
                        this.hasPlayedOnce = true;
                        console.error(`%c[Player Event ${this.id}] Status: ended (Play Once). Set hasPlayedOnce=true. Setting Paused State & Updating UI.`, "background: #ddffdd; color: black; font-weight: bold;");

                        if (this.player) {
                           this.player.pause().catch(e => console.error(`[Player Event ${this.id}] Error pausing on ended event:`, e.name));
                        }
                        const playPauseButton = document.getElementById(`playPauseButton-${this.id}`);
                        if (playPauseButton) playPauseButton.innerText = 'Play';
                        // Thumbnail shown via 'pause' listener
                    });
                    // --- End Event Listeners ---
                    resolve(this.player);
                }).catch((error) => { console.error(`[Player Init ${this.id}] Player 'ready()' promise REJECTED:`, error); this.player = null; this.playerInitializationPromise = null; reject(error); });
            } catch (error) { console.error(`[Player Init ${this.id}] FAILED during 'new Vimeo.Player()' constructor:`, error); this.player = null; this.playerInitializationPromise = null; reject(error); }
        });
        return this.playerInitializationPromise;
    }

    // updateVideoSizes - no changes needed
    updateVideoSizes(containerWidth) { if (this.aspectRatio > 0 && containerWidth > 0) { /* calc */ } else { /* defaults */ } }

    // togglePlayPause - reset hasPlayedOnce on manual play
    async togglePlayPause(playPauseButton) {
        let player;
        try { player = await this.initializePlayer(); }
        catch (error) { console.error(`[Toggle Play ${this.id}] Player init failed: ${error.message}`); if (playPauseButton) playPauseButton.innerText = 'Error'; return; }

        const scrollItemElement = document.getElementById(`iframe-${this.id}`)?.closest('.scroll-item');
        const isActive = scrollItemElement?.classList.contains('active-scroll-item');
        if (!isActive) { console.warn(`[Toggle Play ${this.id}] Ignoring click: Not active item.`); return; }

        // console.log(`[Toggle Play ${this.id}] User clicked toggle for ACTIVE video.`);
        try {
            const paused = await player.getPaused();
            if (paused) {
                // RESET hasPlayedOnce on manual play
                this.hasPlayedOnce = false;
                console.log(`[Toggle Play ${this.id}] Reset hasPlayedOnce = false on manual play`);
                await player.play();
                if (playPauseButton) playPauseButton.innerText = 'Pause';
            } else {
                 await player.pause();
                 if (playPauseButton) playPauseButton.innerText = 'Play';
            }
        } catch (error) { console.error(`[Toggle Play ${this.id}] API error:`, error.name, error.message); /* ... error UI update ... */ }
    }

    // toggleSound - no changes needed
    async toggleSound() { try { await this.initializePlayer(); toggleGlobalVolume(); } catch (error) { console.warn(`[Toggle Sound ${this.id}] Player not ready: ${error.message}`); } }

    // fetchVimeoData - uses oEmbed
    async fetchVimeoData(id) {
        const videoUrl = `https://vimeo.com/${id}`;
        const oEmbedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(videoUrl)}`;
        // console.log(`[Fetch Data ${id}] Calling oEmbed: ${oEmbedUrl}`);
        try {
            const response = await fetch(oEmbedUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) throw new Error(`Expected JSON response, got ${contentType}`);
            const data = await response.json();
            // console.log(`[Fetch Data ${id}] oEmbed response:`, data);
            return data;
        } catch (error) { console.error(`[Fetch Data ${id}] Error fetching Vimeo oEmbed data for ${videoUrl}:`, error); return null; }
    }

    // getAspectRatio - no changes needed
    getAspectRatio(videoWidth, videoHeight) { return videoWidth && videoHeight ? videoWidth / videoHeight : 16 / 9; }
}

// getDynamicWidth - no changes needed
function getDynamicWidth() { const el = document.querySelector('.middle-column'); return el ? el.clientWidth : window.innerWidth; }

// --- Attach Button Listeners Moved to main.js ---
// (DOMContentLoaded listener for info/title buttons removed from here)