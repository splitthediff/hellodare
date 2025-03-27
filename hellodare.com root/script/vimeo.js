// vimeo.js (as a module)
/*
export function createVideoItem(videoId) {
    // Define the fixed height
    const fixedHeight = 500; // You can change this to any height you like
    
    // Fetch the video metadata to get the width and height
    fetch(`https://vimeo.com/api/v2/video/${videoId}.json`)
      .then(response => response.json())
      .then(data => {
        const video = data[0];
        const aspectRatio = video.width / video.height;
        
        // Calculate dynamic width based on the fixed height
        const dynamicWidth = fixedHeight * aspectRatio;
  
        // Create the iframe dynamically
        const iframe = document.createElement('iframe');
        iframe.src = `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=1`;
        iframe.width = dynamicWidth;
        iframe.height = fixedHeight;
        iframe.frameborder = '0';
        iframe.allow = 'autoplay; fullscreen';
        iframe.allowFullscreen = true;
  
        // Insert the iframe into the container
        const container = document.getElementById('video-container');
        container.appendChild(iframe);
      })
      .catch(error => {
        console.error('Error fetching Vimeo video data:', error);
      });
  }*/
/*
export function createVideoItems(videos) {
    const videoTrack = document.querySelector('.video-track');
    
    videos.forEach(video => {
        const videoItem = document.createElement('div');
        videoItem.classList.add('video-item');
    
        // Create iframe for each video
        const iframe = document.createElement('iframe');
        iframe.src = `https://player.vimeo.com/video/${video.id}?autoplay=1&muted=1`;
        iframe.frameBorder = '0';
        iframe.allow = 'autoplay; fullscreen';
        iframe.allowFullscreen = true;
    
        // Append the iframe to the video item
        videoItem.appendChild(iframe);
        
        // Set the height of the video item
        const videoHeight = 500; // Example constant height for all videos
        const aspectRatio = video.aspectRatio || 16 / 9; // Default aspect ratio is 16:9
        videoItem.style.width = `${videoHeight * aspectRatio}px`; // Adjust width based on height and aspect ratio
        
        // Append the video item to the video track
        videoTrack.appendChild(videoItem);
    });
    }
    */

    /*

    export function createVideoItems(videos) {
        const videoTrack = document.querySelector('.video-track');
    
        // Loop through each video
        videos.forEach(video => {
            const videoItem = document.createElement('div');
            videoItem.classList.add('video-item');
    
            // Create iframe for each video
            const iframe = document.createElement('iframe');
            iframe.src = `https://player.vimeo.com/video/${video.id}?autoplay=1&muted=1`;
            iframe.frameBorder = '0';
            iframe.allow = 'autoplay; fullscreen';
            iframe.allowFullscreen = true;
    
            // Append the iframe to the video item
            videoItem.appendChild(iframe);
    
            // Dynamically calculate the aspect ratio using the Vimeo Player API
            const player = new Vimeo.Player(iframe);
            
            player.on('loaded', () => {
                player.getVideoWidth().then(width => {
                    player.getVideoHeight().then(height => {
                        const aspectRatio = width / height; // Calculate aspect ratio dynamically
    
                        // Set the width based on the calculated aspect ratio
                        const videoHeight = 1000; // Example constant height for all videos
                        videoItem.style.width = `${videoHeight * aspectRatio}px`; // Adjust width based on height and aspect ratio
                    });
                });
            });
    
            // Append the video item to the video track
            videoTrack.appendChild(videoItem);
        });
    }

    */

    export function createVideoItems(videos) {
        const videoTrack = document.querySelector('.video-track');
        const html = '';

        videos.forEach(video => {

            html= `<div class="video-item">
                 <iframe src="https://player.vimeo.com/video/535355395?autoplay=1&muted=1&background=1" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>
            </div>`

            const videoItem = document.createElement('div');
            videoItem.classList.add('video-item');
    
            // Create iframe for each video
            const iframe = document.createElement('iframe');
            iframe.src = `https://player.vimeo.com/video/${video.id}?autoplay=1&muted=1`;
            iframe.frameBorder = '0';
            iframe.allow = 'autoplay; fullscreen';
            iframe.allowFullscreen = true;
    
            // Append the iframe to the video item
            videoItem.appendChild(iframe);
    
            // Dynamically calculate the aspect ratio using the Vimeo Player API
            const player = new Vimeo.Player(iframe);
            
            player.on('loaded', () => {
                player.getVideoWidth().then(width => {
                    player.getVideoHeight().then(height => {
                        const aspectRatio = width / height; // Calculate aspect ratio dynamically
    
                        // Set the width based on the calculated aspect ratio
                        const videoHeight = 1000; // Example constant height for all videos
                        videoItem.style.width = `${videoHeight * aspectRatio}px`; // Adjust width based on height and aspect ratio
                    });
                });
            });
    }