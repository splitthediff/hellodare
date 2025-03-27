export function renderPlaylist(){
    let playlistHTML = '';

    playlist.forEach((video) => {
        playlistHTML += `
            <div class="video-item">
                <iframe src="https://player.vimeo.com/video/${video.vimeoid}?autoplay=1&muted=1&background=1" loading="lazy" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>
            </div>
        `;

    });

    document.querySelector('.js-video-track').innerHTML = playlistHTML;
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
}
];

