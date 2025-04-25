// js/modules/Video.js - Defines the Video class
// NOTE: Assumes Vimeo.Player is global

import { config } from '../config.js';
import { formatTime, getAspectRatio } from '../utils/utils.js';
import { positionSingleInfoOverlay } from '../core/playlistManager.js';

export class Video {
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
        this.hasPlayedOnce = false; // Flag indicating the video reached its simulated end via timeupdate
        this.duration = 0; // Video duration in seconds
        this.timeupdateThreshold = config.video.timeupdateEndThreshold; // How close to end (in seconds) counts as "ended"
        this.isEnding = false; // Flag to prevent multiple end simulations from timeupdate

        // ---Progress Bar Element References ---
        this.progressBarContainer = null;
        this.progressBarFill = null;
        this.currentTimeDisplayElement = null;
        // --------------------------------------

        this.playerInitializationPromise = null;
        this.thumbnailElement = null;
    }

    /**
     * Fetches video metadata (dimensions, thumbnail) from Vimeo oEmbed API.
     * Must be called before player can be initialized correctly.
     */
    async initialize() {
        // console.log(`[Video ${this.id}] Starting initialize...`);
        try {
            const data = await this.fetchVimeoData(this.id);
            if (data && data.width > 0 && data.height > 0 && data.thumbnail_url) {
                this.nativeWidth = data.width; this.nativeHeight = data.height;
                this.thumbnailUrl = data.thumbnail_url;
                this.aspectRatio = getAspectRatio(this.nativeWidth, this.nativeHeight);
            } else {
                console.warn(`[Video ${this.id}] Using default 16:9 / no thumbnail due to invalid oEmbed data.`);
                this.nativeWidth = 16; this.nativeHeight = 9; this.aspectRatio = 16 / 9; this.thumbnailUrl = '';
            }
        } catch (error) {
            console.error(`[Video ${this.id}] Error during initialize logic:`, error);
            this.nativeWidth = 16; this.nativeHeight = 9; this.aspectRatio = 16 / 9; this.thumbnailUrl = '';
        } finally {
            // Always set iframe src, even on error (using hardcoded params)
            this.iframeSrc = `https://player.vimeo.com/video/${this.id}?${config.video.vimeoParams}&quality=${config.video.vimeoQuality}`;
        }
        // console.log(`[Video ${this.id}] Finished initialize.`);
    }

    /**
     * Creates the Vimeo Player instance, finds UI elements, attaches listeners.
     * Returns a promise that resolves with the ready player instance.
     * Safe to call multiple times (returns existing promise/player).
     * @returns {Promise<Player>} A promise resolving with the Vimeo Player instance.
     */
    initializePlayer() {
            if (this.playerInitializationPromise) return this.playerInitializationPromise;
            if (this.player) return Promise.resolve(this.player);
    
            // console.log(`%c[Player Init ${this.id}] Starting new initialization...`, "color: green;");
            this.playerInitializationPromise = new Promise((resolve, reject) => {
                const iframe = document.getElementById(`iframe-${this.id}`);
                if (!iframe) {
                    console.error(`[Player Init ${this.id}] Iframe not found.`);
                    this.playerInitializationPromise = null;
                    return reject(new Error(`Iframe ${this.id} not found`));
                }
    
                try {
                    const playerInstance = new Vimeo.Player(iframe);
    
                    playerInstance.ready().then(async () => {
                        // console.log(`%c[Player Init ${this.id}] Ready.`, "color: green; font-weight: bold;");
                        this.player =  playerInstance; // Assign player
                        this.isEnding = false;      // Reset state
    
                        // Get Duration
                        try { this.duration = await this.player.getDuration() || 0; } catch (e) { this.duration = 0; }
    
                        // Setup UI elements & Reset them
                        this._findPlayerUIElements(); // Find DOM elements
                        this._resetPlayerUI();      // Set initial UI state
    
                        // Attach all event listeners
                        this._attachPlayerListeners();

                        // --- CALL POSITIONING FUNCTION FOR THIS VIDEO ---
                        console.log(`[Player Init ${this.id}] Player ready, calling positionSingleInfoOverlay.`);
                        try {
                            positionSingleInfoOverlay(this.id); // Call exported function
                        } catch (posError) {
                        console.error(`[Player Init ${this.id}] Error calling positionSingleInfoOverlay:`, posError);
                        }
                        // --- END POSITIONING CALL ---
    
                        resolve(this.player); // Resolve the main promise
                    }).catch((error) => {
                        console.error(`[Player Init ${this.id}] Ready rejected:`, error);
                        this.player = null; this.playerInitializationPromise = null; reject(error);
                    });
                } catch (error) {
                    console.error(`[Player Init ${this.id}] Constructor failed:`, error);
                    this.player = null; this.playerInitializationPromise = null; reject(error);
                }
            });
            return this.playerInitializationPromise;
        }
    
    
        // --- "Private" Helper Methods for Player Setup ---
    
        _findPlayerUIElements() {
            // console.log(`[Player UI ${this.id}] Finding elements...`);
            this.progressBarContainer = document.getElementById(`progress-container-${this.id}`);
            this.progressBarFill = document.getElementById(`progress-fill-${this.id}`);
            this.currentTimeDisplayElement = document.getElementById(`current-time-display-${this.id}`);
            // Note: thumbnailElement is assigned externally for now, but could be found here too if preferred
            // this.thumbnailElement = document.getElementById(`thumbnail-${this.id}`);
        }
    
        _resetPlayerUI() {
            // console.log(`[Player UI ${this.id}] Resetting elements...`);
            if (this.progressBarFill) this.progressBarFill.style.width = '0%';
            if (this.currentTimeDisplayElement) this.currentTimeDisplayElement.textContent = '0:00';
        }
    
        _attachPlayerListeners() {
            if (!this.player) return;
    
            // console.log(`[Player Listeners ${this.id}] Attaching listeners...`);
    
            // ... clear other listeners (play, pause, error) ...
            this.player.off('play'); this.player.on('play', this._handlePlay);
            this.player.off('pause'); this.player.on('pause', this._handlePause);
            this.player.off('error'); this.player.on('error', this._handleError);

            // Attach timeupdate listeners ONCE
            this.player.off('timeupdate'); // Clear all first
            this.player.on('timeupdate', this._handleProgressUpdate);
            this.player.on('timeupdate', this._handleSimulatedEnd);
    
            // Attach Seek Listener to Progress Bar Container
            if (this.progressBarContainer && !this.progressBarContainer._seekListenerAttached) {
                // Bind _handleSeekClick to ensure 'this' refers to the Video instance inside the handler
                this.progressBarContainer.addEventListener('click', this._handleSeekClick);
                this.progressBarContainer._seekListenerAttached = true;
            }
        }
    
        // --- "Private" Event Handler Methods ---
        // Using arrow functions to automatically bind 'this' to the Video instance
    
        _handlePlay = () => {
            // console.log(`[Player Event ${this.id}] _handlePlay`);
            if (this.thumbnailElement) this.thumbnailElement.classList.add('thumbnail-hidden');
            this.isEnding = false; // Reset ending flag
    
            // Re-attaching timeupdate within play might still be needed if events
            // get automatically detached on pause/end by the library, but let's test without first
            // If time stops updating after pause/resume, add the off/on logic back here:
            // this.player.off('timeupdate');
            // this.player.on('timeupdate', this._handleProgressUpdate);
            // this.player.on('timeupdate', this._handleSimulatedEnd);
        }
    
        _handlePause = () => {
            // console.log(`[Player Event ${this.id}] _handlePause`);
            // Show thumbnail only if video reached its simulated end
            if (this.thumbnailElement && this.hasPlayedOnce) {
                this.thumbnailElement.classList.remove('thumbnail-hidden');
            } else if (this.thumbnailElement) {
                this.thumbnailElement.classList.add('thumbnail-hidden'); // Keep hidden otherwise
            }
        }
    
        _handleError = (error) => {
            console.error(`[Player ${this.id}] Error Event:`, error.name, error.message);
        }
    
        _handleProgressUpdate = (data) => {
            // console.log(`[TimeUpdate ${this.id}] Progress Update. Percent: ${data?.percent}`);
            if (!data) return;
            // Update Progress Bar Fill
            if (this.progressBarFill && this.duration > 0) {
                const progressPercent = (data.percent * 100).toFixed(2);
                this.progressBarFill.style.width = `${progressPercent}%`;
            }
            // Update Current Time Display
            if (this.currentTimeDisplayElement) {
                if (typeof formatTime === 'function') {
                     this.currentTimeDisplayElement.textContent = formatTime(data.seconds);
                } else { console.error(`[TimeUpdate ${this.id}] formatTime function is not available!`); }
            }
        }

        _handleSimulatedEnd = (data) => {
            // console.log(`[TimeUpdate ${this.id}] End Simulation Check. Time: ${data?.seconds}`);
            if (!data || !this.duration) return; // Add duration check
            const currentTime = data.seconds;
            // Define endTimeTarget locally for clarity
            const endTimeTarget = this.duration - this.timeupdateThreshold;

            if (currentTime >= endTimeTarget && !this.isEnding) {
                    this.isEnding = true;
                    this.hasPlayedOnce = true;
                    console.log(`%c[Player ${this.id}] TIMEUPDATE near end. Pausing & Updating Button Icon.`, "color: purple;");

                    // Find button and icon wrappers
                    const btn = document.getElementById(`playPauseButton-${this.id}`);
                    const playWrapper = btn?.querySelector('.icon-play-wrapper');
                    const pauseWrapper = btn?.querySelector('.icon-pause-wrapper');

                    if (this.player) {
                        // --- CORRECTED: Detach itself ---
                        this.player.off('timeupdate', this._handleSimulatedEnd);
                        console.log(`[Player Event ${this.id}] Detached _handleSimulatedEnd listener.`);
                        // --- END CORRECTION ---

                        this.player.pause().catch(e => console.warn(`Pause error on timeupdate: ${e.name}`));
                    }

                    // Toggle Icons
                    if (btn && playWrapper && pauseWrapper) {
                        playWrapper.classList.remove('is-hidden');
                        pauseWrapper.classList.add('is-hidden');
                        btn.setAttribute('aria-label', 'Play');
                    } else {
                        console.warn(`[Player ${this.id}] Could not find button/icons on simulated end.`);
                    }

            } else if (this.isEnding && this.duration > 0 && currentTime < (endTimeTarget - 0.1)) {
                    // console.log(`[Player ${this.id}] Time moved away, resetting isEnding.`);
                    this.isEnding = false; // Reset if time moves away
            }
        }; // End _handleSimulatedEnd

 /*
        _handleSimulatedEnd = (data) => {
            if (!data || !this.duration) return;
            const currentTime = data.seconds;
            const endTimeTarget = this.duration - this.timeupdateThreshold;

            if (currentTime >= endTimeTarget && !this.isEnding) {
                    console.log(`%c[EndCheck ${this.id}] CONDITION MET! Setting flags & pausing. (Using innerText for button)`, "color: red; font-weight: bold;");
                    this.isEnding = true; this.hasPlayedOnce = true;

                    if (this.player) {
                        this.player.off('timeupdate', this._handleSimulatedEnd);
                        console.log(`[EndCheck ${this.id}] Calling pause...`);
                        this.player.pause().catch(e => console.warn(`Pause error on timeupdate: ${e.name}`));
                    }

                    // --- TEMPORARILY REVERT TO INNERTEXT ---
                    const btn = document.getElementById(`playPauseButton-${this.id}`);
                    if (btn) {
                        btn.innerText = 'Play'; // Use text instead of icons
                    } else {
                         console.warn(`[Player ${this.id}] Could not find button to update on simulated end.`);
                    }
                    // --- END REVERT ---

            } else if (this.isEnding && currentTime < (endTimeTarget - 0.1)) {
                    this.isEnding = false;
            }
        };
*/
     
        _handleSeekClick = (event) => {
            // console.log(`[Seek Click ${this.id}]`);
            if (!this.duration || !this.player || !this.progressBarContainer) return;
            const rect = this.progressBarContainer.getBoundingClientRect();
            const offsetX = event.clientX - rect.left;
            const barWidth = this.progressBarContainer.offsetWidth;
            if (barWidth > 0) {
                const seekFraction = Math.max(0, Math.min(offsetX / barWidth, 1)); // Clamp fraction 0-1
                const seekTime = this.duration * seekFraction;
                // console.log(`[Seek Click ${this.id}] Seeking to: ${seekTime.toFixed(2)}s`);
                this.isEnding = false; // Reset ending flag on seek
                this.hasPlayedOnce = false; // Reset play flag on seek
                this.player.setCurrentTime(seekTime)
                    .then(() => {
                        // Manually update UI immediately after successful seek
                        if (this.progressBarFill) this.progressBarFill.style.width = `${(seekFraction * 100).toFixed(2)}%`;
                        if (this.currentTimeDisplayElement) this.currentTimeDisplayElement.textContent = formatTime(seekTime);
                        // If paused, seeking might not trigger 'play', ensure thumb is hidden
                         if (this.thumbnailElement) this.thumbnailElement.classList.add('thumbnail-hidden');
                    })
                    .catch(error => console.warn(`[Player ${this.id}] Seek failed: ${error.name}`));
            }
        }

    updateVideoSizes(containerWidth) { if (this.aspectRatio > 0 && containerWidth > 0) { this.videoWidth = containerWidth; this.videoHeight = containerWidth / this.aspectRatio; } else { this.videoWidth = 0; this.videoHeight = 0; } }

    /**
     * Toggles play/pause state for this video IF it's the active scroll item.
     * Resets end-simulation flags and seeks to start if re-playing after simulated end.
     * @param {HTMLButtonElement} playPauseButton - The button element to update text on.
     */
    async togglePlayPause(playPauseButton) {
        let player;
        try { player = await this.initializePlayer(); }
        catch (error) { console.error(`[Toggle Play ${this.id}] Player init failed: ${error.message}`); return; }

        // Check active state
        const scrollItemElement = document.getElementById(`iframe-${this.id}`)?.closest(config.selectors.scrollItem);
        const isActive = scrollItemElement?.classList.contains(config.selectors.activeScrollItemClass);
        if (!isActive) { console.warn(`[Toggle Play ${this.id}] Ignoring click: Not active item.`); return; }

        // Find icon wrappers using this.id
        const buttonElement = document.getElementById(`playPauseButton-${this.id}`); // Get button for aria-label
        const playWrapper = buttonElement?.querySelector('.icon-play-wrapper');
        const pauseWrapper = buttonElement?.querySelector('.icon-pause-wrapper');

        if (!buttonElement || !playWrapper || !pauseWrapper) {
             console.error(`[Toggle Play ${this.id}] Button or Icon wrappers not found! Query: #playPauseButton-${this.id}`);
             return;
        }

        try {
            const paused = await player.getPaused();
            const wasAtSimulatedEnd = this.isEnding || this.hasPlayedOnce;

            if (paused) {
                this.hasPlayedOnce = false; this.isEnding = false; // Reset flags
                if (wasAtSimulatedEnd && this.duration > 0) {
                    try { await player.setCurrentTime(0); if(this.progressBarFill) this.progressBarFill.style.width = '0%'; } catch (e) { /* Warn */ }
                }
                await player.play();
                // Show Pause icon, hide Play icon
                playWrapper.classList.add('is-hidden');
                pauseWrapper.classList.remove('is-hidden');
                buttonElement.setAttribute('aria-label', 'Pause'); // Update accessibility
            } else {
                await player.pause();
                // Show Play icon, hide Pause icon
                playWrapper.classList.remove('is-hidden');
                pauseWrapper.classList.add('is-hidden');
                buttonElement.setAttribute('aria-label', 'Play'); // Update accessibility
            }
        } catch (error) {
             console.error(`[Toggle Play ${this.id}] API error:`, error.name);
             // Reset to Play icon on error?
             playWrapper.classList.remove('is-hidden');
             pauseWrapper.classList.add('is-hidden');
             buttonElement.setAttribute('aria-label', 'Play');
        }
    }

    /**
     * Calls the globally provided function to toggle volume for all videos.
     * Ensures this video's player is ready first.
     * @param {Function} toggleGlobalVolumeFunction - The function (likely from videoController) to call.
     */
    async toggleSound(toggleGlobalVolumeFunction) { // <<< Accept function as argument
        // console.log(`[Toggle Sound ${this.id}] Clicked.`);
        try {
            await this.initializePlayer();
            // console.log(`[Toggle Sound ${this.id}] Player ready. Calling provided toggle function.`);

            // --- Call the PASSED IN function ---
            if (typeof toggleGlobalVolumeFunction === 'function') {
                toggleGlobalVolumeFunction(); // <<< Call the argument
            } else {
                 console.error("toggleGlobalVolumeFunction was not provided to toggleSound");
            }
            // ---
        } catch (error) {
            console.warn(`[Toggle Sound ${this.id}] Player not ready: ${error.message}`);
        }
    }

    async fetchVimeoData(id) {
        const videoUrl = `https://vimeo.com/${id}`; const oEmbedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(videoUrl)}`;
        try { const response = await fetch(oEmbedUrl); if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); const contentType = response.headers.get("content-type"); if (!contentType || !contentType.includes("application/json")) throw new Error(`Expected JSON response, got ${contentType}`); const data = await response.json(); return data;
        } catch (error) { console.error(`[Fetch Data ${id}] Error fetching Vimeo oEmbed data for ${videoUrl}:`, error); return null; }
    }

}