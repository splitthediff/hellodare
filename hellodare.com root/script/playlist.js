export async function renderPlaylist() {
    function getDynamicHeight() {
        return window.innerHeight * 0.5; 
    }

    let playlistHTML = '';
    const setHeight = getDynamicHeight(); 

    const videos = await Promise.all(
        playlist.map(async (videoData) => {
            const video = new Video(videoData);  
            await video.initialize(); 
            return video;
        })
    );

    videos.forEach((video) => {
        const videoWidth = video.aspectRatio * setHeight; // Maintain aspect ratio

        playlistHTML += `
        <div class="video-container">
            <div class="video-item" style="width: ${videoWidth}px; height: ${setHeight}px;">
                <iframe src="${video.iframeSrc}" 
                        id="iframe-${video.id}"
                        style="width: 100%; height: 100%; border-radius: 10px;"
                        loading="lazy" 
                        frameborder="0" 
                        allow="autoplay; fullscreen" 
                        allowfullscreen>
                </iframe>
            </div>

            <div class="video-controls" style="width: ${videoWidth}px;">
                <button class="controls-button play-pause-button" id="playPauseButton-${video.id}">Play</button>
                <button class="controls-button sound-button" id="soundButton-${video.id}">Sound Off</button>
            </div>
        </div>
        `;
    });

    document.querySelector('.js-video-track').innerHTML = playlistHTML;

    // Attach event listeners for play/pause and sound buttons
    videos.forEach((video) => {
        video.initializePlayer(); // Initialize the Vimeo player for each video

        const playPauseButton = document.getElementById(`playPauseButton-${video.id}`);
        const soundButton = document.getElementById(`soundButton-${video.id}`);

        if (playPauseButton) {
            playPauseButton.addEventListener('click', () => {
                video.togglePlayPause(playPauseButton);
            });
        }

        if (soundButton) {
            soundButton.addEventListener('click', () => {
                video.toggleSound(soundButton);
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
        this.aspectRatio = 16 / 9; // Default aspect ratio
        this.player = null;
    }

    async initialize() {
        try {
            const data = await this.fetchVimeoData(this.id);
            if (data) {
                this.aspectRatio = this.getAspectRatio(data.width, data.height);
                this.thumbnailUrl = data.thumbnail_large;
                this.iframeSrc = `https://player.vimeo.com/video/${this.id}?autoplay=0&muted=1&controls=0`;
            }
        } catch (error) {
            console.error("Error fetching Vimeo data:", error);
        }
    }

    initializePlayer() {
        const iframe = document.getElementById(`iframe-${this.id}`);
        if (iframe) {
            this.player = new Vimeo.Player(iframe);
        } else {
            console.error(`Iframe not found for video ID: ${this.id}`);
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
                this.player.setVolume(1); // Turn sound on
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

