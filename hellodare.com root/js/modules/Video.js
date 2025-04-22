// js/modules/Video.js - Defines the Video class
// NOTE: Assumes Vimeo.Player is global

import { config } from '../config.js';
import { formatTime } from '../utils/utils.js';

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
        this.hasPlayedOnce = false; // True if video reached its end (naturally or via timeupdate)
        this.duration = 0; // Video duration in seconds
        this.timeupdateThreshold = 0.75; // How close to end (in seconds) counts as "ended"
        this.isEnding = false; // Internal flag to prevent multiple triggers via timeupdate

        // ---Progress Bar Element References ---
        this.progressBarContainer = null;
        this.progressBarFill = null;
        this.currentTimeDisplayElement = null;
        // --------------------------------------

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
            // Always set iframe src, even on error (using hardcoded params)
            this.iframeSrc = `https://player.vimeo.com/video/${this.id}?${config.video.vimeoParams}&quality=${config.video.vimeoQuality}`;
        }
        // console.log(`[Video ${this.id}] Finished initialize.`);
    }

    initializePlayer() {
        // --- Guard Clauses ---
        if (this.playerInitializationPromise) return this.playerInitializationPromise;
        if (this.player) { /* console.log(`[Player Init ${this.id}] Existing ready player.`); */ return Promise.resolve(this.player); }

        // console.log(`%c[Player Init ${this.id}] Starting new initialization...`, "color: green;");
        this.playerInitializationPromise = new Promise((resolve, reject) => {
            const iframe = document.getElementById(`iframe-${this.id}`);
            if (!iframe) { console.error(`[Player Init ${this.id}] Iframe not found.`); this.playerInitializationPromise = null; return reject(new Error(`Iframe ${this.id} not found`)); }

            try {
                const playerInstance = new Vimeo.Player(iframe);

                const handleTimeUpdate = (data) => {
                    const currentTime = data.seconds;
                    if (this.duration > 0 && currentTime >= (this.duration - this.timeupdateThreshold) && !this.isEnding) {
                         this.isEnding = true; this.hasPlayedOnce = true;
                         console.log(`%c[Player ${this.id}] TIMEUPDATE near end. Simulating 'ended'. Pausing.`, "color: purple;");
                         if (this.player) {
                             // console.log(`[Player Event ${this.id}] Detaching timeupdate listener.`);
                             this.player.off('timeupdate', handleTimeUpdate); // Detach listener
                             this.player.pause().catch(e => console.warn(`Pause error on timeupdate: ${e.name}`));
                         }
                         const btn = document.getElementById(`playPauseButton-${this.id}`); if (btn) btn.innerText = 'Play';
                    } else if (this.isEnding && this.duration > 0 && currentTime < (this.duration - this.timeupdateThreshold - 0.1)) {
                         // console.log(`[Player ${this.id}] Time moved away, resetting isEnding.`);
                         this.isEnding = false; // Reset if time moves away
                    }
                };

                // --- TimeUpdate handler for PROGRESS BAR ---
                const handleProgressUpdate = (data) => {
                    console.log(`[TimeUpdate ${this.id}] Event Fired. Data:`, data); // Log the whole data object
                    if (!data) {
                        console.warn(`[TimeUpdate ${this.id}] No data received in event.`);
                        return;
                    }
                    if (this.progressBarFill && this.duration > 0) {
                        const progressPercent = (data.percent * 100).toFixed(2); // Use percent from event data
                        this.progressBarFill.style.width = `${progressPercent}%`;
                    }
                    /*
                    if (this.currentTimeDisplayElement) {
                        // Use the seconds value from the event data
                        this.currentTimeDisplayElement.textContent = formatTime(data.seconds);
                    }*/
                        if (this.currentTimeDisplayElement) {
                            const currentTimeSeconds = data.seconds; // Get seconds
                            // console.log(`[TimeUpdate ${this.id}] Current Time (s): ${currentTimeSeconds}`); // Log seconds
                            if (typeof formatTime === 'function') { // Check if function imported correctly
                                 const formattedTime = formatTime(currentTimeSeconds);
                                 // console.log(`[TimeUpdate ${this.id}] Formatted Time: ${formattedTime}`); // Log formatted time
                                 this.currentTimeDisplayElement.textContent = formattedTime; // Update text
                            } else {
                                 console.error(`[TimeUpdate ${this.id}] formatTime function is not available!`); // Log error if import failed
                            }
                        } else {
                             console.warn(`[TimeUpdate ${this.id}] currentTimeDisplayElement is null or undefined.`); // Log if element not found
                        }
                };

                playerInstance.ready().then(async () => {
                    // console.log(`%c[Player Init ${this.id}] Ready.`, "color: green; font-weight: bold;");
                    this.player = playerInstance; this.isEnding = false;
                    try { this.duration = await this.player.getDuration() || 0; /* console.log(`Duration: ${this.duration}`); */ } catch (e) { this.duration = 0; }
                    
                    // --- Get Progress Bar Elements ---
                    this.progressBarContainer = document.getElementById(`progress-container-${this.id}`);
                    this.progressBarFill = document.getElementById(`progress-fill-${this.id}`);  
                    this.currentTimeDisplayElement = document.getElementById(`current-time-display-${this.id}`);            
                    // ---------------------------------

                    // --- Reset Progress Bar and Current Time Display ---
                    if (this.progressBarFill) this.progressBarFill.style.width = '0%';
                    if (this.currentTimeDisplayElement) this.currentTimeDisplayElement.textContent = '0:00';

                    // --- Attach Listeners ---
                    this.player.off('pause'); // Clear previous listeners to be safe
                    this.player.on('pause', () => { 
                        // console.log(`[Player Event ${this.id}] Status: paused`);
                        if (this.thumbnailElement && this.hasPlayedOnce) {
                            // console.log(`[Player Event ${this.id}] Showing thumbnail because hasPlayedOnce is true.`);
                            this.thumbnailElement.classList.remove('thumbnail-hidden');
                        } else if (this.thumbnailElement) {
                            // console.log(`[Player Event ${this.id}] Pause occurred, but hasPlayedOnce is false. Keeping/Making thumbnail hidden.`);
                             this.thumbnailElement.classList.add('thumbnail-hidden'); // Ensure hidden on other pauses
                        }
                    });

                    this.player.off('error'); // Clear previous
                    this.player.on('error', (error) => { console.error(`[Player ${this.id}] Error:`, error.name, error.message); }); // Added message

                    // Modify handlePlay slightly to ensure correct listeners attached
                    const handlePlay = () => {
                        // console.log(`[Player ${this.id}] played`);
                        if (this.thumbnailElement) this.thumbnailElement.classList.add('thumbnail-hidden');
                        this.isEnding = false; // Reset ending flag
                        // Ensure BOTH timeupdate listeners are correctly managed on play
                        if (this.player) {
                            this.player.off('timeupdate', handleTimeUpdate); // Detach old end simulation
                            this.player.on('timeupdate', handleTimeUpdate);  // Re-attach end simulation
                            // Keep progress listener attached (or re-attach if needed)
                            this.player.off('timeupdate', handleProgressUpdate); // Detach old progress
                            this.player.on('timeupdate', handleProgressUpdate); // Re-attach progress
                            // console.log(`[Player Event ${this.id}] Re-attached timeupdate listeners.`);
                        }
                    };
                    this.player.off('play'); // Clear previous
                    this.player.on('play', handlePlay);

                    this.player.off('timeupdate'); // Clear any previous listeners comprehensively
                    this.player.on('timeupdate', handleProgressUpdate); // Attach progress handler
                    this.player.on('timeupdate', handleTimeUpdate);   // Attach end simulation 

                    if (this.progressBarContainer && this.player) {
                        // Simple way to handle potential re-initialization: store listener on element
                        if (!this.progressBarContainer._seekListenerAttached) {
                             const seekListener = (event) => {
                                if (!this.duration || !this.player) return;
                                const rect = this.progressBarContainer.getBoundingClientRect();
                                const offsetX = event.clientX - rect.left;
                                const barWidth = this.progressBarContainer.offsetWidth;
                                if (barWidth > 0) {
                                    const seekFraction = offsetX / barWidth;
                                    const seekTime = this.duration * seekFraction;
                                    const clampedTime = Math.max(0, Math.min(seekTime, this.duration));
                                    this.player.setCurrentTime(clampedTime)
                                        .then(() => { 
                                            if (this.progressBarFill) this.progressBarFill.style.width = `${(seekFraction * 100).toFixed(2)}%`;
                                            if (this.currentTimeDisplayElement) this.currentTimeDisplayElement.textContent = formatTime(clampedTime);
                                        })
                                        .catch(error => console.warn(`[Player ${this.id}] Seek failed: ${error.name}`));
                                }
                            };
                            this.progressBarContainer.addEventListener('click', seekListener);
                            this.progressBarContainer._seekListenerAttached = true; // Mark as attached
                            // console.log(`[Player Init ${this.id}] Seek listener attached.`);
                        }
                    }

                    resolve(this.player);
                }).catch((error) => { console.error(`[Player Init ${this.id}] Ready rejected:`, error); this.player = null; this.playerInitializationPromise = null; reject(error); });
            } catch (error) { console.error(`[Player Init ${this.id}] Constructor failed:`, error); this.player = null; this.playerInitializationPromise = null; reject(error); }
        });
        return this.playerInitializationPromise;
    }

    updateVideoSizes(containerWidth) { if (this.aspectRatio > 0 && containerWidth > 0) { this.videoWidth = containerWidth; this.videoHeight = containerWidth / this.aspectRatio; } else { this.videoWidth = 0; this.videoHeight = 0; } }

    async togglePlayPause(playPauseButton) {
        let player;
        try { player = await this.initializePlayer(); }
        catch (error) { console.error(`[Toggle Play ${this.id}] Player init failed: ${error.message}`); if (playPauseButton) playPauseButton.innerText = 'Error'; return; }

        const scrollItemElement = document.getElementById(`iframe-${this.id}`)?.closest(config.selectors.scrollItem);
        const isActive = scrollItemElement?.classList.contains(config.selectors.activeScrollItemClass);
        if (!isActive) { console.warn(`[Toggle Play ${this.id}] Ignoring click: Not active item.`); return; }

        try {
            const paused = await player.getPaused();
            const wasAtSimulatedEnd = this.isEnding || this.hasPlayedOnce; // Check state before reset

            if (paused) {
                this.hasPlayedOnce = false; this.isEnding = false; // Reset flags
                // console.log(`[Toggle Play ${this.id}] Reset flags. Attempting play...`);
                if (wasAtSimulatedEnd && this.duration > 0) {
                    // console.log(`[Toggle Play ${this.id}] Video was at end, seeking to 0.`);
                    try {
                        await player.setCurrentTime(0);
                        // Reset progress bar visually after seek
                        if(this.progressBarFill) this.progressBarFill.style.width = '0%';
                    } catch (e) { console.warn(`Seek error on manual play: ${e.name}`); }
                }
                await player.play();
                if (playPauseButton) playPauseButton.innerText = 'Pause';
            } else {
                await player.pause();
                if (playPauseButton) playPauseButton.innerText = 'Play';
            }
        } catch (error) {
             console.error(`[Toggle Play ${this.id}] API error:`, error.name);
             try { if(playPauseButton) playPauseButton.innerText = await player.getPaused() ? 'Play' : 'Pause'; } catch (e) { if(playPauseButton) playPauseButton.innerText = 'Error';}
        }
    } // --- End togglePlayPause ---

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

    getAspectRatio(videoWidth, videoHeight) { return videoWidth && videoHeight ? videoWidth / videoHeight : 16 / 9; }
}