// js/modules/Video.js - Defines the Video class
// NOTE: Assumes Vimeo.Player is global

import { config } from '../config.js';
import { formatTime, getAspectRatio } from '../utils/utils.js';

export class Video {
    constructor(videoData) {
        this.id = videoData.vimeoid;
        this.title = videoData.title;
        this.titleShortName = videoData.titleShortName || videoData.title || ''; // Fallback to title if short name is not provided
        this.year = videoData.year;
        this.client = videoData.client;

        this.thumbnailFilename = videoData.thumbnailFilename || null;
        if (this.thumbnailFilename) {
            this.thumbnailUrl = `${config.video.localThumbnailBasePath}${this.thumbnailFilename}`;
        } else {
            this.thumbnailUrl = '';
            console.warn(`[Video ${this.id}] No thumbnail filename provided.`);
        }
        this.iframeSrc = `https://player.vimeo.com/video/${this.id}?${config.video.vimeoParams}&quality=${config.video.vimeoQuality}`;
        this.thumbnailWidth = videoData.thumbnailWidth || 0; 
        this.thumbnailHeight = videoData.thumbnailHeight || 0;

        this.player = null;
        // --- Initialize native dimensions from thumbnail data ---
        this.nativeWidth = this.thumbnailWidth > 0 ? this.thumbnailWidth : 16;
        this.nativeHeight = this.thumbnailHeight > 0 ? this.thumbnailHeight : 9;
        this.aspectRatio = getAspectRatio(this.nativeWidth, this.nativeHeight); 

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

        this.videoWrapperElement = null;       
        this.playPauseButtonElement = null;    
        this.soundButtonElement = null;        
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
    //DELETE THIS LATER
      /*  _findPlayerUIElements() {
            // console.log(`[Player UI ${this.id}] Finding elements...`);
            this.progressBarContainer = document.getElementById(`progress-container-${this.id}`);
            this.progressBarFill = document.getElementById(`progress-fill-${this.id}`);
            this.currentTimeDisplayElement = document.getElementById(`current-time-display-${this.id}`);
            // Note: thumbnailElement is assigned externally for now, but could be found here too if preferred
            // this.thumbnailElement = document.getElementById(`thumbnail-${this.id}`);
        }*/

        _findPlayerUIElements() {
            // console.log(`[Player UI ${this.id}] Finding elements...`);
            const videoItemElement = document.querySelector(`${config.selectors.scrollItem}.video-item[data-video-id="${this.id}"]`);
            if (!videoItemElement) {
                console.warn(`[Player UI ${this.id}] Video item element not found for ID: ${this.id}.`);
                return;
            }

            this.videoWrapperElement = videoItemElement.querySelector('.video-aspect-wrapper');
            this.playPauseButtonElement = videoItemElement.querySelector(`#playPauseButton-${this.id}`);
            this.soundButtonElement = videoItemElement.querySelector(`#soundButton-${this.id}`);
            this.thumbnailElement = videoItemElement.querySelector(`#thumbnail-${this.id}`); // Assign thumbnail here
            this.progressBarContainer = videoItemElement.querySelector(`#progress-container-${this.id}`);
            this.progressBarFill = videoItemElement.querySelector(`#progress-fill-${this.id}`);
            this.currentTimeDisplayElement = videoItemElement.querySelector(`#current-time-display-${this.id}`);

            // console.log(`[Player UI ${this.id}] Elements found and assigned.`);
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
                    const btn = this.playPauseButtonElement;
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

        _updatePlayPauseButtonUI = (isPaused) => {
            const playPauseButton = this.playPauseButtonElement;
            const playWrapper = playPauseButton?.querySelector('.icon-play-wrapper');
            const pauseWrapper = playPauseButton?.querySelector('.icon-pause-wrapper');

            if (playPauseButton && playWrapper && pauseWrapper) {
                playWrapper.classList.toggle('is-hidden', !isPaused);    // Hide play if not paused
                pauseWrapper.classList.toggle('is-hidden', isPaused);   // Hide pause if paused
                playPauseButton.setAttribute('aria-label', isPaused ? 'Play' : 'Pause');
            } else {
                console.warn(`[Video ${this.id}] Play/Pause button elements not found for UI update.`);
            }
        };

        // Helper to update the sound button's icons and aria-label
        _updateSoundButtonUI = (isMuted) => {
            const soundButton = this.soundButtonElement;
            const volumeOnWrapper = soundButton?.querySelector('.icon-volume-on-wrapper');
            const volumeOffWrapper = soundButton?.querySelector('.icon-volume-off-wrapper');

            if (soundButton && volumeOnWrapper && volumeOffWrapper) {
                volumeOffWrapper.classList.toggle('is-hidden', !isMuted); // Show if muted
                volumeOnWrapper.classList.toggle('is-hidden', isMuted);  // Hide if muted
                soundButton.setAttribute('aria-label', isMuted ? 'Unmute' : 'Mute'); // Update label
            } else {
                console.warn(`[Video ${this.id}] Sound button elements not found for UI update.`);
            }
        };

    updateVideoSizes(containerWidth) { if (this.aspectRatio > 0 && containerWidth > 0) { this.videoWidth = containerWidth; this.videoHeight = containerWidth / this.aspectRatio; } else { this.videoWidth = 0; this.videoHeight = 0; } }

    /**
     * Toggles play/pause state for this video IF it's the active scroll item.
     * Resets end-simulation flags and seeks to start if re-playing after simulated end.
     * @param {HTMLButtonElement} playPauseButton - The button element to update text on.
     */
    async togglePlayPause() {
        let player;
        try { player = await this.initializePlayer(); }
        catch (error) { console.error(`[Toggle Play ${this.id}] Player init failed: ${error.message}`); return; }

        // Check active state
        const scrollItemElement = document.getElementById(`iframe-${this.id}`)?.closest(config.selectors.scrollItem);
        const isActive = scrollItemElement?.classList.contains(config.selectors.activeScrollItemClass);
        if (!isActive) { console.warn(`[Toggle Play ${this.id}] Ignoring click: Not active item.`); return; }

        // Find icon wrappers using this.id
        const playPauseButton = this.playPauseButtonElement; // Get button for aria-label
        const playWrapper = playPauseButton?.querySelector('.icon-play-wrapper');
        const pauseWrapper = playPauseButton?.querySelector('.icon-pause-wrapper');

        if (!playPauseButton || !playWrapper || !pauseWrapper) {
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
                this._updatePlayPauseButtonUI(false); // Pass 'false' because it's now playing (not paused)
            } else {
                await player.pause();
                // Show Play icon, hide Pause icon
                this._updatePlayPauseButtonUI(true); // Pass 'true' because it's now paused
            }
        } catch (error) {
             console.error(`[Toggle Play ${this.id}] API error:`, error.name);
             this._updatePlayPauseButtonUI(true); // Assume paused state on error
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

    // No longer needed, but Keep if need to fetch oEmbed data
    async fetchVimeoData(id) {
        const videoUrl = `https://vimeo.com/${id}`; const oEmbedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(videoUrl)}`;
        try { const response = await fetch(oEmbedUrl); if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); const contentType = response.headers.get("content-type"); if (!contentType || !contentType.includes("application/json")) throw new Error(`Expected JSON response, got ${contentType}`); const data = await response.json(); return data;
        } catch (error) { console.error(`[Fetch Data ${id}] Error fetching Vimeo oEmbed data for ${videoUrl}:`, error); return null; }
    }

}