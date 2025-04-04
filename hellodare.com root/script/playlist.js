let currentVideos = []; 

export async function renderPlaylist() {
    currentVideos = await initializeVideos();
    renderVideos(currentVideos);

    initializeGsapScroll();

    currentVideos.forEach(video => video.initializePlayer()); 

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            updateDOMVideoSizes(currentVideos);
        }, 150);
    });
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
    let playlistHTML = '';

    if (!videos || videos.length === 0) {
        console.error("No videos to render.");
        return;
    }

  /* <div class="video-item" style="width: ${video.videoWidth}px; height: ${video.videoHeight}px;">
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
            </div>*/
    videos.forEach((video) => {
        // Ensure iframeSrc is set, even if initialization failed partially
        const src = video.iframeSrc || `https://player.vimeo.com/video/${video.id}?autoplay=0&muted=1&controls=0&quality=1080p&background=1`;
        
        playlistHTML += `

            <div class="video-item">
                <div class="video-aspect-wrapper">
                    <iframe src="${video.iframeSrc}" 
                            id="iframe-${video.id}"
                            loading="lazy" 
                            frameborder="0" 
                            allow="autoplay; fullscreen" 
                            allowfullscreen>
                    </iframe>
                
                    <div class="video-controls">
                        <button class="controls-button play-pause-button" id="playPauseButton-${video.id}">Play</button>
                        <button class="controls-button sound-button" id="soundButton-${video.id}">Sound Off</button>
                    </div>
                </div>
            </div>
        `;
    });

    const trackElement = document.querySelector('.js-video-track');
    if (trackElement) {
        trackElement.innerHTML = playlistHTML;
    } else {
         console.error("'.js-video-track' element not found for rendering.");
         return;
    }

    // Attach event listeners (needs player initialized)
    videos.forEach((video) => {
        // Find the newly created elements for this specific video
        const videoItemElement = trackElement.querySelector(`.video-item[data-video-id="${video.id}"]`);
        if (!videoItemElement) {
             console.warn(`Could not find video item element for ID ${video.id} after render.`);
             return; // Skip if element wasn't found
        }

        const wrapperElement = videoItemElement.querySelector('.video-aspect-wrapper');
        const playPauseButton = videoItemElement.querySelector(`#playPauseButton-${video.id}`);
        const soundButton = videoItemElement.querySelector(`#soundButton-${video.id}`);

        // Apply the aspect ratio to the wrapper
        if (wrapperElement) {
            // Use the stored native dimensions
            wrapperElement.style.aspectRatio = `${video.nativeWidth} / ${video.nativeHeight}`;
             console.log(`Applied aspect ratio ${video.nativeWidth}/${video.nativeHeight} to wrapper for video ${video.id}`);
        } else {
             console.warn(`Could not find aspect wrapper for video ${video.id}`);
        }

        // Attach event listeners (player initialization is now handled lazily inside handlers)
        if (playPauseButton) {
            playPauseButton.addEventListener('click', () => {
                // Initialize player on first interaction if not already done
                if (!video.player) video.initializePlayer();
                // Check player exists before calling toggle (initializePlayer might fail)
                if (video.player) video.togglePlayPause(playPauseButton);
                else console.error(`Cannot toggle play/pause: Player not initialized for ${video.id}`);
            });
        }

        if (soundButton) {
            soundButton.addEventListener('click', () => {
                if (!video.player) video.initializePlayer();
                if (video.player) video.toggleSound(soundButton);
                 else console.error(`Cannot toggle sound: Player not initialized for ${video.id}`);
            });
        }
    });
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

        // --- Currently not using, restore if need to calculate dynamic video height and width ---
        this.videoHeight = 0; 
        this.videoWidth = 0;
    }

    async initialize() {
        try {
            const data = await this.fetchVimeoData(this.id);
            if (data) {
                this.aspectRatio = this.getAspectRatio(data.width, data.height);
                this.thumbnailUrl = data.thumbnail_large;
                this.iframeSrc = `https://player.vimeo.com/video/${this.id}?autoplay=0&muted=1&controls=0&quality=1080p`;
            }
        } catch (error) {
            console.error("Error fetching Vimeo data:", error);
        }
    }

    initializePlayer() {
        // Only initialize if not already done
        if (this.player) return; 
        
        const iframe = document.getElementById(`iframe-${this.id}`);
        if (iframe) {
            try {
                this.player = new Vimeo.Player(iframe);
                console.log(`Vimeo Player initialized for ${this.id}`);

                this.player.on('play', () => { console.log(`Video ${this.id} played`); });
                this.player.on('pause', () => { console.log(`Video ${this.id} paused`); });
                this.player.on('ended', () => { console.log(`Video ${this.id} ended`); });
                
            } catch (error) {
                 console.error(`Error initializing Vimeo Player for ${this.id}:`, error);
            }

        } else {
            // This might happen if called too early or if render failed
            console.warn(`Iframe not found for video ID: ${this.id} during player initialization.`);
        }
    }

    // This method dynamically calculates video size based on viewport size
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

    togglePlayPause(playPauseButton) {
        if (!this.player) return;

        this.player.getPaused().then((paused) => {
            if (paused) {
                this.player.play();
                playPauseButton.innerText = 'Pause';
            } else {
                this.player.pause();
                playPauseButton.innerText = 'Play';
            }
        });
    }

    toggleSound(soundButton) {
        if (!this.player) return;

        this.player.getVolume().then((volume) => {
            if (volume === 0) {
                this.player.setVolume(0.5); // Turn sound on
                soundButton.innerText = 'Sound On';
            } else {
                this.player.setVolume(0); // Mute
                soundButton.innerText = 'Sound Off';
            }
        });
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

