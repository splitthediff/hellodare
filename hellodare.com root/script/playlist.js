export async function renderPlaylist() {
    let playlistHTML = '';

    // Wait for all videos to fetch their data
    const videos = await Promise.all(playlist.map(async (videoData) => {
        const video = new Video(videoData); // Instantiate Video
        const vimeoData = await video.fetchVimeoData(video.id); // Wait for data fetch
        const aspectRatio = video.getAspectRatio(vimeoData.width, vimeoData.height); // Calculate aspect ratio

        return {
            id: video.id,
            aspectRatio: aspectRatio,  // You can use the aspectRatio dynamically for sizing
            iframeSrc: `https://player.vimeo.com/video/${video.id}?autoplay=1&muted=1&background=1`
        };
    }));

    // Build the HTML string using the fetched data
    videos.forEach((video) => {
        playlistHTML += `
            <div class="video-item">
                <iframe src="${video.iframeSrc}" loading="lazy" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>
            </div>
        `;
    });

    document.querySelector('.js-video-track').innerHTML = playlistHTML;
}

class Video {
    id; 
    title;
    year;
    client;
    vimeoData;
    aspectRatio;
  
    constructor(videoDetails) {
        this.id = videoDetails.vimeoid;
        this.title = videoDetails.title;
        this.year = videoDetails.year;
        this.client = videoDetails.client;
        this.vimeoData = null;
        this.aspectRatio = 16 / 9; 
    }

    async fetchVimeoData(id) {
        try {
            const response = await fetch(`https://vimeo.com/api/v2/video/${id}.json`);
            const data = await response.json();
            this.vimeoData = data[0]; // Store the vimeo data
            return this.vimeoData; // Return it for further use
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

