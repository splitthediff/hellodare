// playlist.js (TIME UPDATE WORKAROUND VERSION)

import { initializeGsapScroll, toggleGlobalVolume, goToIndex } from './scroll.js';
import { playlist } from './video_playlist.js';

let currentVideos = [];

export async function renderPlaylist() {
    currentVideos = await initializeVideos();
    renderVideos(currentVideos);
    // NOTE: No initializeAllPlayers here - using lazy init within Video class
    initializeGsapScroll(currentVideos); // Pass only actual videos

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => { updateDOMVideoSizes(currentVideos); }, 150);
    });
}

// initializeAllPlayers function removed (using lazy init)

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
    videos.forEach((video) => { video.updateVideoSizes(currentContainerWidth); });
    // console.log("Updated internal video object sizes based on container width:", currentContainerWidth);
}

function updateDOMVideoSizes(videos) {
    updateVideoObjectSizes(videos);
    // console.log("Internal video sizes updated on resize. DOM untouched.");
}

function renderVideos(videos) {
    console.log("--- Running renderVideos (including Info Section & Video Info Overlay) ---");
    let playlistHTML = '';
    if (!videos) { videos = []; }
    const scrollItemClass = "scroll-item";

    // 1. Build Video HTML
    videos.forEach((video) => {
        const src = video.iframeSrc || `https://player.vimeo.com/video/${video.id}?muted=1&controls=0`;
        const thumbnailHTML = video.thumbnailUrl ? `<img src="${video.thumbnailUrl}" class="video-thumbnail" id="thumbnail-${video.id}" alt="${video.title || 'Video thumbnail'}">` : '';

        playlistHTML += `
            <div class="${scrollItemClass} video-item" data-video-id="${video.id}">
                <div class="video-aspect-wrapper">
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

    // Info Section HTML
       playlistHTML += `
        <div class="${scrollItemClass} info-section" id="info-section">
            <div class="info-content">
                <div class="info-column info-column-left">
                    <h2>Studio Dare</h2>
                    <p>Studio Dare is the creative studio of Leanne Dare.</p>
                    <p>We work in a multitude of disciplines including graphics, animation, live action direction, photography & creative direction.</p>
                </div>
                <div class="info-column info-column-right">
                    <h3>Contact & Details</h3>
                    <p>Our work spans across film, television, branding, social media, and marketing platforms, delivering thought provoking and smile producing content.</p>
                    <p>Get in touch: <a href="mailto:example@studiodare.com">example@studiodare.com</a></p>
                </div>
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
    videos.forEach((video) => {
        const videoId = video.id;
        const videoItemElement = trackElement.querySelector(`.video-item[data-video-id="${videoId}"]`);
        if (!videoItemElement) { console.error(`renderVideos: FAILED to find video item for ID ${videoId}`); return; }
        const wrapperElement = videoItemElement.querySelector('.video-aspect-wrapper');
        if (!wrapperElement) { console.warn(`renderVideos: Could not find .video-aspect-wrapper for video ${videoId}`); return; }
        if (video.nativeWidth > 0 && video.nativeHeight > 0) { wrapperElement.style.aspectRatio = `${video.nativeWidth} / ${video.nativeHeight}`; }
        else { console.warn(`renderVideos: Invalid dimensions for video ${videoId}.`); }
        const playPauseButton = videoItemElement.querySelector(`#playPauseButton-${videoId}`);
        const soundButton = videoItemElement.querySelector(`#soundButton-${videoId}`);
        const thumbnailElement = videoItemElement.querySelector(`#thumbnail-${videoId}`);
        if (playPauseButton) { playPauseButton.addEventListener('click', async () => { console.log(`Play/Pause button clicked for ${videoId}`); await video.togglePlayPause(playPauseButton); }); }
        else { console.warn(`renderVideos: Play/Pause button not found for ${videoId}`); }
        if (soundButton) { soundButton.addEventListener('click', async () => { console.log(`Sound button clicked for ${videoId}`); await video.toggleSound(); }); }
        else { console.warn(`renderVideos: Sound button not found for ${videoId}`); }
        if (thumbnailElement) { video.thumbnailElement = thumbnailElement; }
    });

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

        // --- State for Play Once & Time Update Workaround ---
        this.hasPlayedOnce = false; // True if video reached its end (naturally or via timeupdate)
        this.duration = 0; // Video duration in seconds
        this.timeupdateThreshold = 0.75; // How close to end (in seconds) counts as "ended"
        this.isEnding = false; // Internal flag to prevent multiple triggers via timeupdate
        // ----------------------------------------------------

        this.playerInitializationPromise = null;
        this.thumbnailElement = null;
    }

    async initialize() {
        // console.log(`[Video ${this.id}] Starting initialize...`);
        try {
            const data = await this.fetchVimeoData(this.id);
            if (data && data.width > 0 && data.height > 0 && data.thumbnail_url) {
                this.nativeWidth = data.width; this.nativeHeight = data.height;
                this.thumbnailUrl = data.thumbnail_url;
                this.aspectRatio = this.getAspectRatio(this.nativeWidth, this.nativeHeight);
            } else {
                console.warn(`[Video ${this.id}] Using default 16:9 / no thumbnail due to invalid oEmbed data.`);
                this.nativeWidth = 16; this.nativeHeight = 9; this.aspectRatio = 16 / 9; this.thumbnailUrl = '';
            }
        } catch (error) {
            console.error(`[Video ${this.id}] Error during initialize logic:`, error);
            this.nativeWidth = 16; this.nativeHeight = 9; this.aspectRatio = 16 / 9; this.thumbnailUrl = '';
        } finally {
            // Always set iframe src, even on error
            this.iframeSrc = `https://player.vimeo.com/video/${this.id}?muted=1&controls=0&quality=1080p`;
        }
        // console.log(`[Video ${this.id}] Finished initialize.`);
    }

    initializePlayer() {
        // --- Guard Clauses ---
        if (this.playerInitializationPromise) return this.playerInitializationPromise;
        if (this.player) { console.log(`[Player Init ${this.id}] Returning existing ready player.`); return Promise.resolve(this.player); }
    
        console.log(`%c[Player Init ${this.id}] Starting new initialization process...`, "color: green;");
        this.playerInitializationPromise = new Promise((resolve, reject) => {
            const iframe = document.getElementById(`iframe-${this.id}`);
            if (!iframe) { /* ... error handling ... */ }
    
            try {
                const playerInstance = new Vimeo.Player(iframe);
    
                // --- Define the TimeUpdate Handler ---
                const handleTimeUpdate = (data) => {
                    const currentTime = data.seconds;
                    if (this.duration > 0 && currentTime >= (this.duration - this.timeupdateThreshold)) {
                        if (!this.isEnding) {
                            this.isEnding = true;
                            this.hasPlayedOnce = true;
                            console.error(`%c[Player Event ${this.id}] TIMEUPDATE near end... Simulating 'ended'. Pausing & DETACHING Listener.`, "...");

                            if (this.player) {
                                console.log(`[Player Event ${this.id}] Detaching timeupdate listener.`);
                                this.player.off('timeupdate', handleTimeUpdate);
                                this.player.pause().catch(e => console.error(`Error pausing on timeupdate:`, e.name));
                            }

                            const playPauseButton = document.getElementById(`playPauseButton-${this.id}`);
                            if (playPauseButton) playPauseButton.innerText = 'Play';
                        }
                        // --- ADDED: Don't immediately reset isEnding if still near end ---
                        // } else {
                        //      if(this.isEnding) { this.isEnding = false; } // Remove this immediate reset
                        // ---
                    } else if (this.isEnding && this.duration > 0 && currentTime < (this.duration - this.timeupdateThreshold - 0.1)) {
                            // --- ADDED: Only reset isEnding if time has moved FURTHER away ---
                            // Add a small buffer (e.g., 0.1s) to prevent rapid flip-flopping
                            console.log(`[Player Event ${this.id}] Timeupdate moved away from end. Resetting isEnding flag.`);
                            this.isEnding = false;
                            // ---
                    }
                };
                // --- End TimeUpdate Handler Definition ---
    
    
                playerInstance.ready().then(async () => {
                    console.log(`%c[Player Init ${this.id}] Player READY. Attaching listeners & getting duration...`, "color: green; font-weight: bold;");
                    this.player = playerInstance;
                    this.isEnding = false; // Reset flag
    
                    // --- Get Duration ---
                    try {
                        const duration = await this.player.getDuration();
                        this.duration = duration || 0;
                        console.log(`[Player Init ${this.id}] Duration set to: ${this.duration.toFixed(2)}s`);
                    } catch (durationError) { /* ... error handling ... */ }
    
                    // --- Attach Static Event Listeners ---
                    this.player.on('pause', () => {
                        console.log(`[Player Event ${this.id}] Status: paused`);
                        if (this.thumbnailElement) this.thumbnailElement.classList.remove('thumbnail-hidden');
                        // Don't detach timeupdate on regular pause, only on simulated end
                    });
    
                     this.player.on('error', (error) => { /* ... error logging ... */ });
    
                    // --- Attach/Reattach 'play' and initial 'timeupdate' ---
                    // Define play separately to easily manage listener attachment
                    const handlePlay = () => {
                        console.log(`[Player Event ${this.id}] Status: played`);
                        if (this.thumbnailElement) this.thumbnailElement.classList.add('thumbnail-hidden');
                        this.isEnding = false; // Reset ending flag on play
    
                        // --- RE-ATTACH TIMEUPDATE LISTENER ON PLAY ---
                        if (this.player) {
                             console.log(`[Player Event ${this.id}] Attaching/Re-attaching timeupdate listener.`);
                             // Remove first to prevent potential duplicates if 'play' fires unexpectedly multiple times
                             this.player.off('timeupdate', handleTimeUpdate);
                             this.player.on('timeupdate', handleTimeUpdate);
                        }
                        // -----------------------------------------
                    };
    
                    this.player.on('play', handlePlay);
                    // Initial attach of timeupdate
                    this.player.on('timeupdate', handleTimeUpdate);
    
    
                    resolve(this.player);
                }).catch(/* ... handle ready error ... */);
            } catch (error) { /* ... handle constructor error ... */ }
        });
        return this.playerInitializationPromise;
    }


    // updateVideoSizes - no changes needed
    updateVideoSizes(containerWidth) { if (this.aspectRatio > 0 && containerWidth > 0) { /* calc */ } else { /* defaults */ } }


    async togglePlayPause(playPauseButton) {
        let player;
        try { player = await this.initializePlayer(); }
        catch (error) { console.error(`[Toggle Play ${this.id}] Player init failed: ${error.message}`); if (playPauseButton) playPauseButton.innerText = 'Error'; return; }

        const scrollItemElement = document.getElementById(`iframe-${this.id}`)?.closest('.scroll-item');
        const isActive = scrollItemElement?.classList.contains('active-scroll-item');
        if (!isActive) { console.warn(`[Toggle Play ${this.id}] Ignoring click: Not active item.`); return; }

        try {
            const paused = await player.getPaused();

            // --- FIX: Declare wasAtSimulatedEnd HERE ---
            const wasAtSimulatedEnd = this.isEnding || this.hasPlayedOnce;
            // ------------------------------------------

            if (paused) {
                // Reset state FIRST
                this.hasPlayedOnce = false;
                this.isEnding = false;
                console.log(`[Toggle Play ${this.id}] Reset flags. Attempting play...`);

                // --- Conditional Seek Logic (Uses the declared variable) ---
                if (wasAtSimulatedEnd && this.duration > 0) { // Check if it was ended and has a valid duration
                    try {
                        console.log(`[Toggle Play ${this.id}] Detected play after simulated end. Seeking to 0...`);
                        await player.setCurrentTime(0); // Force back to beginning
                        console.log(`[Toggle Play ${this.id}] Seek to 0 complete.`);
                    } catch (seekError) {
                        console.warn(`[Toggle Play ${this.id}] Non-critical error seeking to 0: ${seekError.name}`);
                    }
                }
                // --- END SEEK LOGIC ---

                // Now call play
                await player.play();
                if (playPauseButton) playPauseButton.innerText = 'Pause';

            } else {
                // Pause logic remains the same
                console.log(`[Toggle Play ${this.id}] Attempting pause...`);
                await player.pause();
                if (playPauseButton) playPauseButton.innerText = 'Play';
            }
        } catch (error) {
            console.error(`[Toggle Play ${this.id}] API error:`, error.name, error.message);
            // Try setting button state after error
            try { if(playPauseButton) playPauseButton.innerText = await player.getPaused() ? 'Play' : 'Pause'; } catch (e) { if(playPauseButton) playPauseButton.innerText = 'Error';}
        }
    } // --- End togglePlayPause ---

    // toggleSound - no changes needed
    async toggleSound() { try { await this.initializePlayer(); toggleGlobalVolume(); } catch (error) { console.warn(`[Toggle Sound ${this.id}] Player not ready: ${error.message}`); } }

    // fetchVimeoData - uses oEmbed (no changes needed)
    async fetchVimeoData(id) {
        const videoUrl = `https://vimeo.com/${id}`; const oEmbedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(videoUrl)}`;
        try { const response = await fetch(oEmbedUrl); if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); const contentType = response.headers.get("content-type"); if (!contentType || !contentType.includes("application/json")) throw new Error(`Expected JSON response, got ${contentType}`); const data = await response.json(); return data;
        } catch (error) { console.error(`[Fetch Data ${id}] Error fetching Vimeo oEmbed data for ${videoUrl}:`, error); return null; }
    }

    // getAspectRatio - no changes needed
    getAspectRatio(videoWidth, videoHeight) { return videoWidth && videoHeight ? videoWidth / videoHeight : 16 / 9; }
} // End Video Class

// getDynamicWidth - no changes needed
function getDynamicWidth() { const el = document.querySelector('.middle-column'); return el ? el.clientWidth : window.innerWidth; }