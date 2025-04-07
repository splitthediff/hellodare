import { initializeGsapScroll, toggleGlobalVolume } from './scroll.js';
let currentVideos = []; 

export async function renderPlaylist() {
    currentVideos = await initializeVideos();
    renderVideos(currentVideos);

    initializeAllPlayers(currentVideos);

    initializeGsapScroll(currentVideos);

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

    // HTML PLAYLIST BUILD
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

        if (!videoItemElement) {
            console.error(`renderVideos: FAILED to find element for ID ${videoId} using selector "${selector}"`);
            return;
        }

        const wrapperElement = videoItemElement.querySelector('.video-aspect-wrapper');
        if (!wrapperElement) {
            console.warn(`renderVideos: Could not find .video-aspect-wrapper inside item for video ${videoId}`);
            return;
        }

        // --- Apply the aspect ratio style to wrapper---
        if (video.nativeWidth > 0 && video.nativeHeight > 0) {
            console.log("Applying ratio for Video ID " + video.id + ": Native W=" + video.nativeWidth + ", Native H=" + video.nativeHeight + ". CSS: '" + video.nativeWidth + " / " + video.nativeHeight + "'");
            wrapperElement.style.aspectRatio = `${video.nativeWidth} / ${video.nativeHeight}`;
        } else {
            console.warn(`renderVideos: Invalid dimensions for video ${videoId}. Not setting aspect-ratio.`);
        }

        // --- Event listeners ---
        const playPauseButton = videoItemElement.querySelector(`#playPauseButton-${videoId}`);
        const soundButton = videoItemElement.querySelector(`#soundButton-${videoId}`);
        const thumbnailElement = videoItemElement.querySelector(`#thumbnail-${videoId}`); // Get thumbnail if needed elsewhere

        if (playPauseButton) {
            // Make the listener async
            playPauseButton.addEventListener('click', async () => { // <-- Added async
                console.log(`Play/Pause button clicked for ${videoId}`);
                // Await the method which now handles player readiness internally
                await video.togglePlayPause(playPauseButton); // <-- Added await
            });
        } else {
             console.warn(`renderVideos: Play/Pause button not found for ${videoId}`);
        }

        if (soundButton) {
            // Make the listener async
            soundButton.addEventListener('click', async () => { // <-- Added async
                console.log(`Sound button clicked for ${videoId}`);
                 // Await the method which now handles player readiness internally
                await video.toggleSound(); // <-- Added await (toggleSound now calls global func)
            });
        } else {
            console.warn(`renderVideos: Sound button not found for ${videoId}`);
        }

        // Pass thumbnail element to video object if needed for hiding on play
        if (thumbnailElement) {
            video.thumbnailElement = thumbnailElement;
        }

    }); // End of videos.forEach loop

    console.log("--- Finished renderVideos (Listeners Attached) ---");
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

        this.hasPlayedOnce = false; 
        this.loopCount = 0;
        this.justFinishedLoopLimit = false;

        this.playerInitializationPromise = null;

        this.thumbnailElement = null; 

        // --- Currently not using, restore if need to calculate dynamic video height and width ---
        this.videoHeight = 0; 
        this.videoWidth = 0;
    }

    async initialize() {
        console.log(`[Video ${this.id}] Starting initialize...`);
        try {
            // Fetch data using the NEW oEmbed fetchVimeoData function
            const data = await this.fetchVimeoData(this.id);
    
            // Check if data was successfully fetched and has necessary properties
            if (data && data.width > 0 && data.height > 0 && data.thumbnail_url) {
                console.log(`[Video ${this.id}] Using oEmbed data. W=${data.width}, H=${data.height}, Thumb=${data.thumbnail_url}`);
    
                // --- Use oEmbed properties ---
                this.nativeWidth = data.width;       // oEmbed provides video dimensions
                this.nativeHeight = data.height;     // oEmbed provides video dimensions
                this.thumbnailUrl = data.thumbnail_url; // Use the higher-quality thumbnail URL
    
                // Calculate aspect ratio from fetched dimensions
                this.aspectRatio = this.getAspectRatio(this.nativeWidth, this.nativeHeight);
    
                // Construct iframe src (keep this part the same)
                this.iframeSrc = `https://player.vimeo.com/video/${this.id}?muted=1&controls=0&quality=1080p`;
    
            } else {
                // Fallback if oEmbed data is invalid or missing required fields
                console.warn(`[Video ${this.id}] Using default 16:9 aspect ratio and no thumbnail due to invalid/missing oEmbed data. Data received:`, data);
                this.nativeWidth = 16; // Default
                this.nativeHeight = 9;  // Default
                this.aspectRatio = 16 / 9;
                this.thumbnailUrl = ''; // No reliable thumbnail
                this.iframeSrc = `https://player.vimeo.com/video/${this.id}?muted=1&controls=0&quality=1080p`;
            }
        } catch (error) {
            // Catch errors specifically from the initialize logic (fetch errors handled in fetchVimeoData)
            console.error(`[Video ${this.id}] Error during initialize logic:`, error);
            // Set safe defaults on error
            this.nativeWidth = 16;
            this.nativeHeight = 9;
            this.aspectRatio = 16 / 9;
            this.thumbnailUrl = '';
            this.iframeSrc = `https://player.vimeo.com/video/${this.id}?muted=1&controls=0&quality=1080p`;
        }
        console.log(`[Video ${this.id}] Finished initialize.`);
    }

    initializePlayer() {
        if (this.playerInitializationPromise) {
            return this.playerInitializationPromise;
        }
        // 2. If player is already created and ready, return a resolved promise
        if (this.player) {
             console.log(`[Player Init ${this.id}] Player already initialized and ready.`);
             return Promise.resolve(this.player);
        }

        // 3. Start the actual initialization and store the promise
        console.log(`[Player Init ${this.id}] Starting new initialization process...`);
        this.playerInitializationPromise = new Promise((resolve, reject) => {
            const iframe = document.getElementById(`iframe-${this.id}`);
            if (!iframe) {
                console.error(`[Player Init ${this.id}] Iframe element NOT FOUND.`);
                this.playerInitializationPromise = null; // Reset promise to allow retry
                return reject(new Error(`Iframe not found for video ${this.id}`));
            }

            console.log(`[Player Init ${this.id}] Found iframe, attempting 'new Vimeo.Player()'...`);
            try {
                // Create the player instance
                const playerInstance = new Vimeo.Player(iframe);

                // Use the player's ready() method (returns a promise)
                playerInstance.ready().then(() => {
                    console.log(`[Player Init ${this.id}] Player is READY via .ready().`);
                    this.player = playerInstance; // Assign the ready player instance

                    // --- Attach Event Listeners ---
                    this.player.on('play', () => {
                        // Use the stored thumbnailElement reference
                        if (this.thumbnailElement && !this.hasPlayedOnce) {
                            console.log(`[Player Event ${this.id}] First play - Hiding thumbnail.`);
                            if (this.thumbnailElement) {
                                // console.log(`[Player Event ${this.id}] Hiding thumbnail.`);
                                this.thumbnailElement.classList.add('thumbnail-hidden');
                            }
                        } else if (this.thumbnailElement && this.hasPlayedOnce) {
                            // Ensure thumbnail stays hidden on subsequent plays
                            this.thumbnailElement.classList.add('thumbnail-hidden');
                            console.log(`[Player Event ${this.id}] Status: played (thumbnail already hidden)`);
                        } else {
                             console.log(`[Player Event ${this.id}] Status: played (no thumbnail element)`);
                        }
                        console.log(`[Player Event ${this.id}] Status: played`);
                    });

                    this.player.on('pause', () => {
                        console.log(`[Player Event ${this.id}] Status: paused`);
                        if (this.thumbnailElement) {
                            // console.log(`[Player Event ${this.id}] Showing thumbnail on pause.`);
                            this.thumbnailElement.classList.remove('thumbnail-hidden');
                        }
                    });

                    this.player.on('ended', () => {
                        console.log(`[Player Event ${this.id}] Status: ended`);
                        this.loopCount++; // Increment *after* a playthrough finishes
                        console.log(`[Player Event ${this.id}] Playthrough ${this.loopCount} finished.`);

                        const TOTAL_PLAYS_ALLOWED = 2; // 1 initial play + 1 loop

                        if (this.loopCount < TOTAL_PLAYS_ALLOWED) {
                            // Allow looping
                            console.log(`[Player Event ${this.id}] Looping: Starting playthrough ${this.loopCount + 1}/${TOTAL_PLAYS_ALLOWED}.`);
                            // Ensure flag is false before looping play
                            this.justFinishedLoopLimit = false;
                            this.player.play().catch(e => console.error(`[Player Event ${this.id}] Error restarting loop:`, e.name, e.message));
                        } else {
                            console.log(`[Player Event ${this.id}] Loop limit (${TOTAL_PLAYS_ALLOWED} plays) reached. Stopping.`);
                            const playPauseButton = document.getElementById(`playPauseButton-${this.id}`);
                            if (playPauseButton) playPauseButton.innerText = 'Play';

                            this.justFinishedLoopLimit = true; // Set flag
                            console.log(`[Player Event ${this.id}] Setting justFinishedLoopLimit = true`);

                            // Pause the player first
                            this.player.pause().then(() => {
                                // --- EDIT: Show thumbnail AFTER successful pause on loop end ---
                                // The 'pause' event listener above should already handle this,
                                // but doing it explicitly here is safer in case of event timing issues.
                                console.log(`[Player Event ${this.id}] Loop limit reached, ensuring thumbnail is shown.`);
                                if (this.thumbnailElement) {
                                    this.thumbnailElement.classList.remove('thumbnail-hidden');
                                }
                                // Reset count after successful pause
                                this.loopCount = 0;
                                console.log(`[Player Event ${this.id}] Loop count reset to 0 after stopping.`);

                            }).catch(e => {
                                console.error(`[Player Event ${this.id}] Error pausing after loop limit:`, e.name, e.message);
                                // Still attempt to show thumbnail and reset count even if pause failed
                                if (this.thumbnailElement) {
                                     this.thumbnailElement.classList.remove('thumbnail-hidden');
                                }
                                this.loopCount = 0;
                            });
}
                    });
                    // --- End Event Listeners ---

                    resolve(this.player); // Resolve the main promise with the ready player

                }).catch((error) => {
                    // Handle error from playerInstance.ready()
                    console.error(`[Player Init ${this.id}] Player 'ready()' promise REJECTED:`, error);
                    this.player = null; // Ensure player is null on failure
                    this.playerInitializationPromise = null; // Allow retry later
                    reject(error); // Reject the main promise
                });

            } catch (error) {
                // Handle error from `new Vimeo.Player(iframe)` constructor itself
                console.error(`[Player Init ${this.id}] FAILED during 'new Vimeo.Player()' constructor:`, error);
                this.player = null;
                this.playerInitializationPromise = null; // Allow retry later
                reject(error); // Reject the main promise
            }
        }); // End of new Promise

        // Return the promise (which might be pending)
        return this.playerInitializationPromise;
    } // --- End of initializePlayer ---

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
    async togglePlayPause(playPauseButton) {
        // 1. Get the player instance, waiting for initialization if needed
        let player;
        try {
            console.log(`[Toggle Play ${this.id}] Checking/Awaiting player initialization...`);
            player = await this.initializePlayer(); // Will wait here if not ready
            console.log(`[Toggle Play ${this.id}] Player is ready.`);
        } catch (error) {
            console.error(`[Toggle Play ${this.id}] Cannot toggle: Player failed to initialize. Error: ${error.message}`);
            // Optionally update button to show error state
            if (playPauseButton) playPauseButton.innerText = 'Error';
            return; // Stop if player isn't available
        }

        // 2. Check if this video is the active one (Keep this logic)
        const videoItemElement = document.getElementById(`iframe-${this.id}`)?.closest('.video-item');
        const isActive = videoItemElement?.classList.contains('active-video');

        if (!isActive) {
            console.warn(`[Toggle Play ${this.id}] Ignoring click: This video is not the active scrolled item.`);
            // Don't change button text here, as scroll might change it back
            return;
        }

        // 3. Perform the toggle using the now-guaranteed ready 'player'
        console.log(`[Toggle Play ${this.id}] User clicked toggle for ACTIVE video.`);
        try {
            const paused = await player.getPaused();
            if (paused) {
                this.justFinishedLoopLimit = false;
                console.log(`[Toggle Play ${this.id}] Reset justFinishedLoopLimit = false`);

                console.log(`[Toggle Play ${this.id}] Player was paused, attempting play...`);
                 // --- EDIT: Reset loop count before manual play ---
                 this.loopCount = 0;
                 console.log(`[Toggle Play ${this.id}] Loop count reset to 0 on manual play.`);
                 await player.play();
                 if (playPauseButton) playPauseButton.innerText = 'Pause';
            } else {
                console.log(`[Toggle Play ${this.id}] Player was playing, attempting pause...`);
                 await player.pause();
                 if (playPauseButton) playPauseButton.innerText = 'Play';
                 // Optionally reset loop count on manual pause too? Maybe not needed.
                 // this.loopCount = 0;
            }
             // --- EDIT: Move reset from here if only resetting on manual play start ---
             // this.loopCount = 0;

        } catch (error) {
            // Handle errors during play/pause API calls
            console.error(`[Toggle Play ${this.id}] Error during API call (play/pause/getPaused):`, error.name, error.message);
            // Try to set button text to a sensible state after an error
            try {
                if(playPauseButton) playPauseButton.innerText = await player.getPaused() ? 'Play' : 'Pause';
            } catch (getError) {
                if(playPauseButton) playPauseButton.innerText = 'Error'; // Fallback if getPaused fails too
            }
        }
    }

    /**
     * Handles the click on the sound button for ANY video.
     * Calls the exported global toggle function from scroll.js.
     */
    async toggleSound() {
        console.log(`[Toggle Sound ${this.id}] Clicked. Checking player readiness before calling global toggle...`);

        // Ensure player is ready before allowing global toggle
        try {
            await this.initializePlayer();
            console.log(`[Toggle Sound ${this.id}] Player ready. Calling global toggleGlobalVolume().`);
            // Now call the imported global function
            toggleGlobalVolume();
        } catch (error) {
            console.warn(`[Toggle Sound ${this.id}] Player not ready, cannot trigger global toggle yet. Error: ${error.message}`);
            // Decide if you still want to call toggleGlobalVolume() even if THIS player failed.
            // Probably best not to, to avoid inconsistent states.
        }
    }

    async fetchVimeoData(id) {
        // Construct the full Vimeo video URL needed for oEmbed
        const videoUrl = `https://vimeo.com/${id}`;
        // Construct the oEmbed API endpoint URL
        const oEmbedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(videoUrl)}`;

        console.log(`[Fetch Data ${id}] Calling oEmbed: ${oEmbedUrl}`); // Log the URL

        try {
            const response = await fetch(oEmbedUrl);

            // Check if the request was successful
            if (!response.ok) {
                // Throw an error with status text if available
                throw new Error(`HTTP error! status: ${response.status} ${response.statusText || ''}`);
            }

            // Check content type before parsing (optional but good practice)
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                 throw new Error(`Expected JSON response, but got ${contentType}`);
            }

            const data = await response.json();
            console.log(`[Fetch Data ${id}] oEmbed response:`, data); // Log the response object

            // IMPORTANT: oEmbed returns a single object, NOT an array like V2.
            // It contains video details directly.
            return data;

        } catch (error) {
            console.error(`[Fetch Data ${id}] Error fetching Vimeo oEmbed data for ${videoUrl}:`, error);
            return null; // Return null on error
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

