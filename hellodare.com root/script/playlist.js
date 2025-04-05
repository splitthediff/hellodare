import { initializeGsapScroll, toggleGlobalVolume } from './scroll.js';
let currentVideos = []; 

export async function renderPlaylist() {
    currentVideos = await initializeVideos();
    renderVideos(currentVideos);

    initializeAllPlayers(currentVideos);

    initializeGsapScroll(currentVideos);

    //currentVideos.forEach(video => video.initializePlayer()); 


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
        // Don't await here, let them initialize concurrently
        video.initializePlayer();
    });
     console.log("--- Finished initiating player initializations ---");
}

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
    const currentContainerWidth = getDynamicWidth(); // Get the width to calculate against

    videos.forEach((video) => {
        // Call the method on the video object to update its internal state
        video.updateVideoSizes(currentContainerWidth);
    });
    console.log("Updated internal video object sizes based on container width:", currentContainerWidth);
}

function updateDOMVideoSizes(videos) {
    updateVideoObjectSizes(videos); // Keep this if it updates internal data

    /*
    videos.forEach((video) => {
        //const videoItem = document.querySelector(`#iframe-${video.id}`)?.closest('.video-item');
        //const controls = document.querySelector(`#playPauseButton-${video.id}`)?.closest('.video-controls');

        // --- REMOVE OR COMMENT OUT THESE LINES ---
        // if (videoItem) {
        //     // videoItem.style.width = `${video.videoWidth}px`; // Conflicts with CSS width: 100%
        //     // videoItem.style.height = `${video.videoHeight}px`; // Conflicts with CSS height: 100%
        // }
        // if (controls) {
        //     // controls.style.width = `${video.videoWidth}px`; // Conflicts with centering CSS
        // }
        // ----------------------------------------
    });*/
    console.log("Internal video sizes updated on resize. DOM untouched.");
}

function renderVideos(videos) {
    console.log("--- Running renderVideos ---");
    let playlistHTML = '';

    if (!videos || videos.length === 0) {
        console.error("renderVideos: No videos array provided or array is empty.");
        return;
    }

    /* ----------------------------------------
    // --- PREVIOUS HTML, when height and width are set dynamically ---
        <div class="video-item" style="width: ${video.videoWidth}px; height: ${video.videoHeight}px;">
            <iframe src="${video.iframeSrc}" 
                id="iframe-${video.id}"
                style="width: 100%; height: 100%; border-radius: 10px;"
                loading="lazy" 
                frameborder="0" 
                allow="autoplay; fullscreen" 
                allowfullscreen>
            </iframe>
            <div class="video-controls" style="width: ${video.videoWidth}px;">
                <button class="controls-button play-pause-button" id="playPauseButton-${video.id}">Play</button>
                <button class="controls-button sound-button" id="soundButton-${video.id}">Sound Off</button>
            </div>
        </div>
   ---------------------------------------- */ 

    // HTML STRING BUILD
    videos.forEach((video) => {
        const src = video.iframeSrc || `https://player.vimeo.com/video/${video.id}?autoplay=0&muted=1&controls=0`; // Basic fallback src

        const thumbnailHTML = video.thumbnailUrl
            ? `<img src="${video.thumbnailUrl}" class="video-thumbnail" id="thumbnail-${video.id}" alt="${video.title || 'Video thumbnail'}">`
            : ''; 
        
        playlistHTML += `
            <div class="video-item" data-video-id="${video.id}">
                <div class="video-aspect-wrapper"> 
                    {/* --- ADDED THUMBNAIL conditionally --- */}
                    ${thumbnailHTML}
                    {/* iframe and controls follow */}
                    <iframe src="${src}" id="iframe-${video.id}" loading="lazy" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
                    <div class="video-controls">
                        <button class="controls-button play-pause-button" id="playPauseButton-${video.id}">Play</button>
                        <button class="controls-button sound-button" id="soundButton-${video.id}">Sound Off</button>
                    </div>
                </div>
            </div>
        `;
    });

    const trackElement = document.querySelector('.js-video-track');
    if (!trackElement) {
        console.error("renderVideos: '.js-video-track' element not found.");
        return;
    }
    trackElement.innerHTML = playlistHTML;
    console.log("renderVideos: Set innerHTML on trackElement.");

    console.log("renderVideos: Starting loop to find elements and apply styles...");
    videos.forEach((video) => {
        const videoId = video.id;
        const selector = `.video-item[data-video-id="${videoId}"]`;

        const videoItemElement = trackElement.querySelector(selector);

        // --- 3b. Check if the element was found (CRUCIAL DEBUG STEP) ---
        if (!videoItemElement) {
            // *** If you see this error, the query failed! ***
            console.error(`renderVideos: FAILED to find element for ID ${videoId} using selector "${selector}"`);
            return; // Skip the rest for this video
        }

        // --- 3c. Find the wrapper inside the found item ---
        const wrapperElement = videoItemElement.querySelector('.video-aspect-wrapper');
        if (!wrapperElement) {
            console.warn(`renderVideos: Could not find .video-aspect-wrapper inside item for video ${videoId}`);
            return; // Skip if wrapper missing
        }

        // --- 3d. Apply the aspect ratio style ---
        if (video.nativeWidth > 0 && video.nativeHeight > 0) {
            console.log("Applying ratio for Video ID " + video.id + ": Native W=" + video.nativeWidth + ", Native H=" + video.nativeHeight + ". CSS: '" + video.nativeWidth + " / " + video.nativeHeight + "'");
            wrapperElement.style.aspectRatio = `${video.nativeWidth} / ${video.nativeHeight}`;
        } else {
            console.warn(`renderVideos: Invalid dimensions for video ${videoId}. Not setting aspect-ratio.`);
        }

        // --- 3e. Attach event listeners ---
        const playPauseButton = videoItemElement.querySelector(`#playPauseButton-${videoId}`);
        const soundButton = videoItemElement.querySelector(`#soundButton-${videoId}`);

        if (playPauseButton) {
            playPauseButton.addEventListener('click', () => {
                if (!video.player) video.initializePlayer();
                if (video.player) video.togglePlayPause(playPauseButton);
                else console.error(`Play/Pause Error: Player not ready for ${videoId}`);
            });
        }
        if (soundButton) {
            soundButton.addEventListener('click', () => {
                if (!video.player) video.initializePlayer();
                if (video.player) video.toggleSound(soundButton);
                else console.error(`Sound Error: Player not ready for ${videoId}`);
            });
        }

    }); // End of videos.forEach loop

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

        this._isInitializingPlayer = false;

        this.hasPlayedOnce = false; 

        // --- Currently not using, restore if need to calculate dynamic video height and width ---
        this.videoHeight = 0; 
        this.videoWidth = 0;
    }

    async initialize() {
        try {
            const data = await this.fetchVimeoData(this.id);

            if (data && data.width > 0 && data.height > 0) {

                this.nativeWidth = data.width;
                this.nativeHeight = data.height;

                this.aspectRatio = this.getAspectRatio(this.nativeWidth, this.nativeHeight);

                this.thumbnailUrl = data.thumbnail_large;
                this.iframeSrc = `https://player.vimeo.com/video/${this.id}?autoplay=1&muted=1&controls=0&quality=1080p`;

            } else {
                console.warn(`[Video ${this.id}] Using default 16:9 due to invalid/missing data. Data was:`, data);
                 this.iframeSrc = `https://player.vimeo.com/video/${this.id}?autoplay=1&muted=1&controls=0&quality=1080p`;
            }
        } catch (error) {
            //console.error(`[Video ${this.id}] Error during initialize:`, error);
             this.iframeSrc = `https://player.vimeo.com/video/${this.id}?autoplay=1&muted=1&controls=0&quality=1080p`;
        }
         console.log(`[Video ${this.id}] Finished initialize.`);
    }

    initializePlayer() {
        // Only initialize if not already done
        if (this.player || this._isInitializingPlayer) return;
        this._isInitializingPlayer = true;
    
        const iframe = document.getElementById(`iframe-${this.id}`);
        if (!iframe) {
            console.warn(`[Player Init ${this.id}] Iframe element NOT FOUND.`);
            this._isInitializingPlayer = false; // Reset flag
            return;
        }
    
        console.log(`[Player Init ${this.id}] Attempting to create Vimeo Player...`);
        try {
            // Create the player instance
            const playerInstance = new Vimeo.Player(iframe);
    
            // Wait for the player to be ready
            playerInstance.ready().then(() => {
                console.log(`[Player Init ${this.id}] Player is READY.`);
                this.player = playerInstance; // Assign the player
    
                // --- NEW LISTENER BLOCK STARTS HERE ---
                // Attach Thumbnail Control Listeners & Basic Logs
                const thumbnailElement = document.getElementById(`thumbnail-${this.id}`);
    
                if (thumbnailElement) { // Only add listeners if thumbnail exists
                    // On the FIRST Play event: Hide thumbnail permanently and set flag
                    this.player.on('play', () => {
                        if (!this.hasPlayedOnce) { // Check the flag
                            console.log(`[Player Event ${this.id}] First play - Hiding thumbnail permanently.`);
                            thumbnailElement.classList.add('thumbnail-hidden');
                            this.hasPlayedOnce = true; // Set the flag
                        } else {
                            console.log(`[Player Event ${this.id}] Status: played (subsequent)`);
                        }
                    });
    
                    // Keep basic logs for pause/ended, but don't touch thumbnail
                    this.player.on('pause', () => console.log(`[Player Event ${this.id}] Status: paused`));
                    this.player.on('ended', () => {
                        console.log(`[Player Event ${this.id}] Status: ended`);
                        const btn = document.getElementById(`playPauseButton-${this.id}`);
                        if (btn) btn.innerText = 'Play'; // Still reset button text
                    });
    
                } else {
                    // If no thumbnail, just add basic logs
                     this.player.on('play', () => console.log(`[Player Event ${this.id}] Status: played`));
                     this.player.on('pause', () => console.log(`[Player Event ${this.id}] Status: paused`));
                     this.player.on('ended', () => {
                         console.log(`[Player Event ${this.id}] Status: ended`);
                         const btn = document.getElementById(`playPauseButton-${this.id}`);
                         if (btn) btn.innerText = 'Play';
                     });
                }
                // --- NEW LISTENER BLOCK ENDS HERE ---
    
                this._isInitializingPlayer = false; // Reset flag on success
    
            }).catch((error) => {
                console.error(`[Player Init ${this.id}] Player 'ready()' promise REJECTED:`, error);
                this.player = null;
                this._isInitializingPlayer = false;
            });
    
        } catch (error) {
             console.error(`[Player Init ${this.id}] FAILED during 'new Vimeo.Player()':`, error);
             this.player = null;
             this._isInitializingPlayer = false;
        }
    } // End of initializePlayer

    updateVideoSizes(containerWidth) {
        if (this.aspectRatio > 0 && containerWidth > 0) {
            this.videoWidth = containerWidth;
            this.videoHeight = containerWidth / this.aspectRatio;
             // console.log(`Video ${this.id} calculated size: ${this.videoWidth.toFixed(1)} x ${this.videoHeight.toFixed(1)} (for container width ${containerWidth})`);
        } else {
            // Handle cases where aspect ratio or container width is invalid
            this.videoWidth = 0;
            this.videoHeight = 0;
        }
    }

    /**
     * Toggles play/pause state ONLY for the currently active video item.
     * Prevents interference with scroll-based playback control.
     * @param {HTMLButtonElement} playPauseButton - The button element that was clicked.
     */
    togglePlayPause(playPauseButton) {
        // Check 1: Player Readiness
        // Make sure the Vimeo Player instance is created and ready.
        if (!this.player) {
            console.error(`[Toggle Play ${this.id}] Cannot toggle: Player not initialized or ready.`);
            // Avoid trying to re-initialize here as it can cause complications.
            return;
        }

        // Check 2: Is this video the CURRENTLY ACTIVE one in the scroller?
        // We determine this by looking for the '.active-video' class on its parent '.video-item'.
        // This class should be added/removed by the 'updateActiveClass' function in scroll.js.
        const videoItemElement = document.getElementById(`iframe-${this.id}`)?.closest('.video-item');
        const isActive = videoItemElement?.classList.contains('active-video');

        // If the video being clicked is NOT the one currently marked as active...
        if (!isActive) {
            console.warn(`[Toggle Play ${this.id}] Ignoring click: This video (${this.id}) is not the active scrolled item.`);
            // *** IMPORTANT: DO NOTHING ***.
            // Let the scroll logic (controlVideoPlayback) manage playback state for inactive videos.
            return;
        }

        // --- If we reach here, the player IS ready AND it IS the active video ---
        // Proceed with the user's intended play/pause action.
        console.log(`[Toggle Play ${this.id}] User clicked toggle for ACTIVE video.`);
        this.player.getPaused().then((paused) => {
            if (paused) {
                // If it's paused, the user wants to play it.
                console.log(`[Toggle Play ${this.id}] Player was paused, attempting play...`);
                this.player.play().then(() => {
                    // Play succeeded: Update button text.
                    playPauseButton.innerText = 'Pause';
                    console.log(`[Toggle Play ${this.id}] Play successful via click.`);
                }).catch(e => {
                    // Play failed (e.g., browser restriction): Log error and ensure button reflects paused state.
                    console.error(`[Toggle Play ${this.id}] Error during player.play() via click: ${e.name}`);
                    playPauseButton.innerText = 'Play';
                });
            } else {
                // If it's playing, the user wants to pause it.
                console.log(`[Toggle Play ${this.id}] Player was playing, attempting pause...`);
                this.player.pause().then(() => {
                    // Pause succeeded: Update button text.
                    playPauseButton.innerText = 'Play';
                    console.log(`[Toggle Play ${this.id}] Pause successful via click.`);
                }).catch(e => {
                    // Pause failed (less common): Log error and potentially reset button text.
                    console.error(`[Toggle Play ${this.id}] Error during player.pause() via click: ${e.name}`);
                    // If pause fails, it might still be playing. For safety, reset to 'Play'
                    // as the desired state wasn't achieved. Or leave as 'Pause' - debatable UX.
                    playPauseButton.innerText = 'Play';
                });
            }
        }).catch(e => {
            // Error fetching the paused state: Log error. Button state is unknown.
            console.error(`[Toggle Play ${this.id}] Error during player.getPaused() via click: ${e.name}`);
            // Consider setting a default button text like 'Play' in case of error.
            playPauseButton.innerText = 'Play';
        });
    }
        /**
         * Handles the click on the sound button for ANY video.
         * Calls the exported global toggle function from scroll.js.
         * Does NOT need the button element passed anymore.
         */
        toggleSound(/* soundButton - Argument no longer needed */) {
            console.log(`Sound button clicked for video ${this.id}, calling global toggle.`);

            // Optional but recommended: Check if player is ready before allowing toggle
            // This prevents errors if the button is somehow clicked before init completes
            if (!this.player) {
                console.warn(`[Toggle Sound ${this.id}] Player not ready, cannot toggle global volume yet.`);
                return;
            }

            // Call the imported function to handle global state and update all players/buttons
            toggleGlobalVolume();
        }

    async fetchVimeoData(id) {
        try {
            const response = await fetch(`https://vimeo.com/api/v2/video/${id}.json`);
            const data = await response.json();
            return data[0];
        } catch (error) {
            console.error("Error fetching Vimeo data:", error);
            return null; 
        }
    }

    getAspectRatio(videoWidth, videoHeight) {
        return videoWidth && videoHeight ? videoWidth / videoHeight : 16 / 9;
    }
}

function getDynamicWidth() {
    // Adjust selector if needed (e.g., '.middle-column' might be more accurate than '.js-video-track' if track width is 100% of middle)
    const containerElement = document.querySelector('.middle-column'); // Or '.js-video-track' parent?
    // Fallback to window width if container not found or has no width
    return containerElement ? containerElement.clientWidth : window.innerWidth;
}

const playlist = [{
    vimeoid: "834195660",
    title: `White Men Can't Jump / Main on End`,
    client: 'Hulu',
    year: '2023'
}, {
    vimeoid: "367537828",
    title: `Inside Bill's Brain / Main Title Sequence`,
    client: 'Netflix',
    year: '2019',
},  {
    vimeoid: "535355395",
    title: `Icarus / Main on End`,
    client: 'Netflix',
    year: '2018'
}, {
    vimeoid: "535413159",
    title: `Icarus / Main on End`,
    client: 'Netflix',
    year: '2018'
}, {
    vimeoid: "432305926",
    title: `Icarus / Main on End`,
    client: 'Netflix',
    year: '2018'
}];

