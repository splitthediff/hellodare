/*export async function renderPlaylist() {
    const setHeight = 600; // set the fixed height in px
    let playlistHTML = '';

    const videos = await Promise.all(
        playlist.map(async (videoData) => {
            const video = new Video(videoData);  
            await video.initialize(); 
            return video;
        })
    );

    videos.forEach((video) => {
        playlistHTML += `
            <div class="video-item" style="width: ${video.aspectRatio * setHeight}px; height: ${setHeight}px;">
                <iframe src="${video.iframeSrc}" 
                        style="width: 100%; height: 100%;" 
                        loading="lazy" 
                        frameborder="0" 
                        allow="autoplay; fullscreen" 
                        allowfullscreen
                        poster="${video.thumbnailUrl}">
                </iframe>
            </div>
        `;
    });

    document.querySelector('.js-video-track').innerHTML = playlistHTML;
}*/

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
                        style="width: 100%; height: 100%; border-radius: 10px;"
                        loading="lazy" 
                        frameborder="0" 
                        allow="autoplay; fullscreen" 
                        allowfullscreen
                        poster="${video.thumbnailUrl}">
                </iframe>
            </div>

            <div class="video-controls">
                <button class="controls-button play-pause-button" id="playPauseButton-${video.id}">Play</button>
                <button class="controls-button sound-button" id="soundButton-${video.id}">Sound Off</button>
            </div>
           
        </div>
        `;
    });

    document.querySelector('.js-video-track').innerHTML = playlistHTML;

    // Resize listener to adjust video size dynamically
    window.addEventListener('resize', () => {
        const newHeight = getDynamicHeight();
        document.querySelectorAll('.video-item').forEach((container, index) => {
            container.style.height = `${newHeight}px`;
            container.style.width = `${videos[index].aspectRatio * newHeight}px`;
        });
    });

    videos.forEach((video, index) => {
        const playPauseButton = document.getElementById(`playPauseButton-${video.id}`);
        const soundButton = document.getElementById(`soundButton-${video.id}`);

        playPauseButton.addEventListener('click', () => {
            video.togglePlayPause(playPauseButton);
        });

        soundButton.addEventListener('click', () => {
            video.toggleSound(soundButton);
        });
    });
}

class Video {
    constructor(videoData) {
        this.id = videoData.vimeoid; 
        this.title = videoData.title;
        this.year = videoData.year;
        this.client = videoData.client;
        this.thumbnailURL = '';
        this.iframeSrc = ''; 
        this.aspectRatio = 16/9; //default aspect ratio
    }

    async initialize() {
        try {
            const data = await this.fetchVimeoData(this.id);
            if (data) {
                this.vimeoData = data;
                this.aspectRatio = this.getAspectRatio(data.width, data.height);
                this.thumbnailUrl = data.thumbnail_large;
                this.iframeSrc = `https://player.vimeo.com/video/${this.id}?autoplay=1&muted=1&background=1`;
            }
        } catch (error) {
            console.error("Error fetching Vimeo data:", error);
        }
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
        if (!videoWidth || !videoHeight) return 0;
        return videoWidth / videoHeight;
    }

    togglePlayPause(playPauseButton) {
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
        this.player.getVolume().then((volume) => {
            if (volume === 0) {
                this.player.setVolume(1); // Set volume to max
                soundButton.innerText = 'Sound On';
            } else {
                this.player.setVolume(0); // Mute the sound
                soundButton.innerText = 'Sound Off';
            }
        });
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

