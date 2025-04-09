// js/core/videoController.js - Manages video playback and volume

import { config } from '../config.js';

// --- Module State ---
let controlledVideos = []; // Stores the Video class instances
let globalVolumeLevel = 0.0;
const DEFAULT_UNMUTE_LEVEL = config.video.defaultUnmuteLevel;

/** Stores the array of video objects. */
export function setVideos(videosArray) {
    controlledVideos = videosArray || [];
    globalVolumeLevel = 0.0;
}

/** Controls play/pause/volume for videos based on scroll index activation. */
export async function controlVideoPlayback(currentIdx) {
    if (!controlledVideos || controlledVideos.length === 0) return;
    // console.log(`--- [VideoController] Playback: Activate=${currentIdx} ---`);

    for (let index = 0; index < controlledVideos.length; index++) {
        const video = controlledVideos[index];
        if (!video) continue;
        const playPauseButton = document.getElementById(`playPauseButton-${video.id}`);
        const soundButton = document.getElementById(`soundButton-${video.id}`);

        try {
            if (index === currentIdx) { // Activate this video
                const player = await video.initializePlayer();
                 // Use flag from Video.js logic
                 if (video.hasPlayedOnce) { // Check timeupdate flag
                    console.log(`%c[VideoController ${video.id}] Activate SKIPPED: hasPlayedOnce=TRUE. Pausing.`, "color: blue;");
                    if (playPauseButton) playPauseButton.innerText = 'Play';
                    if (video.thumbnailElement) video.thumbnailElement.classList.remove('thumbnail-hidden');
                    await player.pause().catch(e => {});
                } else {
                    // Activate normally
                    await player.setVolume(globalVolumeLevel);
                    await player.play();
                    if (playPauseButton) playPauseButton.innerText = 'Pause';
                }
                 if (soundButton) soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';
            } else { // Deactivate this video
                if (soundButton) soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';
                if (video.player) {
                    try { video.player.pause().catch(e => {}); } catch (e) {}
                    if (playPauseButton) playPauseButton.innerText = 'Play';
                } else {
                    if (playPauseButton) playPauseButton.innerText = 'Play';
                }
            }
        } catch (error) {
             console.warn(`[VideoController ${video?.id || index}] Error: ${error.message}`);
             if (playPauseButton) playPauseButton.innerText = 'Play';
             if (soundButton) soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';
        }
    } // End video loop
    if (currentIdx >= controlledVideos.length) { /* Info section active */ }
    // console.log(`--- [VideoController] Finished Playback Control ---`);
}

/** Helper function to apply volume */
async function applyGlobalVolume() {
     for (const video of controlledVideos) {
         const soundButton = document.getElementById(`soundButton-${video.id}`);
         try {
             const player = await video.initializePlayer(); await player.setVolume(globalVolumeLevel);
             if (soundButton) soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off';
         } catch (error) { if (soundButton) soundButton.innerText = globalVolumeLevel > 0 ? 'Sound On' : 'Sound Off'; }
    }
}

/** Adjusts global volume */
export async function adjustGlobalVolume(delta) {
    let newVolume = globalVolumeLevel + delta; newVolume = Math.max(0, Math.min(1, newVolume));
    if (newVolume.toFixed(2) === globalVolumeLevel.toFixed(2)) return;
    globalVolumeLevel = newVolume; await applyGlobalVolume();
}

/** Toggles global volume */
export async function toggleGlobalVolume() {
    const newVolume = (globalVolumeLevel > 0) ? 0.0 : DEFAULT_UNMUTE_LEVEL;
    globalVolumeLevel = newVolume; await applyGlobalVolume();
}