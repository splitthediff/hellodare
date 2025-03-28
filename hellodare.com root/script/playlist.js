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

    console.log(setHeight);

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
            <div class="video-item" style="width: ${videoWidth}px; height: ${setHeight}px;">
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

    // Resize listener to adjust video size dynamically
    window.addEventListener('resize', () => {
        const newHeight = getDynamicHeight();
        document.querySelectorAll('.video-item').forEach((container, index) => {
            container.style.height = `${newHeight}px`;
            container.style.width = `${videos[index].aspectRatio * newHeight}px`;
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

