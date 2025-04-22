// js/modules/Video.js - Defines the Video class (Refactored initializePlayer)

import { config } from '../config.js';
import { formatTime } from '../utils/utils.js'; // Assuming formatTime is exported from utils

export class Video {
    constructor(videoData) {
        // --- Properties (no changes) ---
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
        this.hasPlayedOnce = false;
        this.duration = 0;
        this.timeupdateThreshold = 0.75;
        this.isEnding = false;
        this.progressBarContainer = null;
        this.progressBarFill = null;
        this.currentTimeDisplayElement = null;
        this.playerInitializationPromise = null;
        this.thumbnailElement = null; // This is assigned externally in playlistManager
    }

    async initialize() {
        // --- Initialize logic remains the same ---
        // console.log(`[Video ${this.id}] Starting initialize...`);
        try {
            const data = await this.fetchVimeoData(this.id);
            if (data && data.width > 0 && data.height > 0 && data.thumbnail_url) {
                this.nativeWidth = data.width; this.nativeHeight = data.height;
                this.thumbnailUrl = data.thumbnail_url;
                this.aspectRatio = this.getAspectRatio(this.nativeWidth, this.nativeHeight);
            } else { /* Defaults */ }
        } catch (error) { /* Defaults */ }
        finally { this.iframeSrc = `https://player.vimeo.com/video/${this.id}?${config.video.vimeoParams}&quality=${config.video.vimeoQuality}`; }
        // console.log(`[Video ${this.id}] Finished initialize.`);
    }

    // --- Main Player Initialization (Simplified) ---
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
    } // --- End initializePlayer ---


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
        if (!this.player) return; // Safety check

        // console.log(`[Player Listeners ${this.id}] Attaching listeners...`);

        // Clear existing listeners first to prevent duplicates on potential re-init
        this.player.off('play');
        this.player.off('pause');
        this.player.off('error');
        this.player.off('timeupdate'); // Clear all timeupdate listeners

        // Attach New Listeners (referencing methods defined below)
        this.player.on('play', this._handlePlay);
        this.player.on('pause', this._handlePause);
        this.player.on('error', this._handleError);
        // Attach both timeupdate handlers
        this.player.on('timeupdate', this._handleProgressUpdate);
        this.player.on('timeupdate', this._handleSimulatedEnd); // Use the correct method name

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
         if (!data) return;
         const currentTime = data.seconds;
         // Check if near the end AND not already flagged as ending
         if (this.duration > 0 && currentTime >= (this.duration - this.timeupdateThreshold) && !this.isEnding) {
              this.isEnding = true; this.hasPlayedOnce = true; // Set flags
              console.log(`%c[Player ${this.id}] TIMEUPDATE near end. Simulating 'ended'. Pausing.`, "color: purple;");
              if (this.player) {
                  // NOTE: We might not need to detach here if pause stops timeupdate events, needs testing
                  // this.player.off('timeupdate', this._handleSimulatedEnd);
                  this.player.pause().catch(e => console.warn(`Pause error on simulated end: ${e.name}`));
              }
              const btn = document.getElementById(`playPauseButton-${this.id}`); if (btn) btn.innerText = 'Play';
         } else if (this.isEnding && this.duration > 0 && currentTime < (this.duration - this.timeupdateThreshold - 0.1)) {
              // Reset flag if user seeks back significantly
              this.isEnding = false;
         }
     }


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
