// js/modules/Video.js - Defines the Video class
// NOTE: Assumes Vimeo.Player is global

import { config } from "../config.js";
import { formatTime, getAspectRatio } from "../utils/utils.js";
import { toggleGlobalVolume } from "../core/scroll.js";

export class Video {
  constructor(videoData) {
    this.id = videoData.vimeoid;
    this.title = videoData.title;
    this.titleShortName = videoData.titleShortName || videoData.title || ""; // Fallback to title if short name is not provided
    this.year = videoData.year;
    this.client = videoData.client;

    this.thumbnailFilename = videoData.thumbnailFilename || null;
    if (this.thumbnailFilename) {
      this.thumbnailUrl = `${config.video.localThumbnailBasePath}${this.thumbnailFilename}`;
    } else {
      this.thumbnailUrl = "";
      console.warn(`[Video ${this.id}] No thumbnail filename provided.`);
    }
    this.iframeSrc = `https://player.vimeo.com/video/${this.id}?${config.video.vimeoParams}&quality=${config.video.vimeoQuality}`;
    this.thumbnailWidth = videoData.thumbnailWidth || 0;
    this.thumbnailHeight = videoData.thumbnailHeight || 0;

    this.player = null;
    // --- Initialize native dimensions from thumbnail data ---
    this.nativeWidth = this.thumbnailWidth > 0 ? this.thumbnailWidth : 16;
    this.nativeHeight = this.thumbnailHeight > 0 ? this.thumbnailHeight : 9;
    this.aspectRatio = getAspectRatio(this.nativeWidth, this.nativeHeight);

    // --- State for Play Once & Time Update Workaround ---
    this.hasPlayedOnce = false; // Flag indicating the video reached its simulated end via timeupdate
    this.duration = 0; // Video duration in seconds
    this.timeupdateThreshold = config.video.timeupdateEndThreshold; // How close to end (in seconds) counts as "ended"
    this.isEnding = false; // Flag to prevent multiple end simulations from timeupdate

    // ---Progress Bar Element References ---
    this.progressBarContainer = null;
    this.progressBarFill = null;
    this.currentTimeDisplayElement = null;
    // --------------------------------------

    this.playerInitializationPromise = null;
    this.thumbnailElement = null;

    this.videoWrapperElement = null;
    this.playPauseButtonElement = null;
    this.soundButtonElement = null;
  }

  /**
   * Creates the Vimeo Player instance, finds UI elements, attaches listeners.
   * Returns a promise that resolves with the ready player instance.
   * Safe to call multiple times (returns existing promise/player).
   * @returns {Promise<Player>} A promise resolving with the Vimeo Player instance.
   */
  initializePlayer() {
    if (this.playerInitializationPromise)
      return this.playerInitializationPromise;
    if (this.player) return Promise.resolve(this.player);

    this.playerInitializationPromise = new Promise((resolve, reject) => {
      const iframe = document.getElementById(`iframe-${this.id}`);
      if (!iframe) {
        console.error(`[Player Init ${this.id}] Iframe not found.`);
        this.playerInitializationPromise = null;
        return reject(new Error(`Iframe ${this.id} not found`));
      }

      try {
        const playerInstance = new Vimeo.Player(iframe);

        playerInstance
          .ready()
          .then(async () => {
            this.player = playerInstance; // Assign player
            this.isEnding = false; // Reset state

            // Get Duration
            try {
              this.duration = (await this.player.getDuration()) || 0;
            } catch (e) {
              this.duration = 0;
            }

            // Setup UI elements & Reset them
            this._findPlayerUIElements(); // Find DOM elements
            this._resetPlayerUI(); // Set initial UI state

            // Attach all event listeners
            this._attachPlayerListeners();

            resolve(this.player); // Resolve the main promise
          })
          .catch((error) => {
            console.error(`[Player Init ${this.id}] Ready rejected:`, error);
            this.player = null;
            this.playerInitializationPromise = null;
            reject(error);
          });
      } catch (error) {
        console.error(`[Player Init ${this.id}] Constructor failed:`, error);
        this.player = null;
        this.playerInitializationPromise = null;
        reject(error);
      }
    });
    return this.playerInitializationPromise;
  }

  // --- "Private" Helper Methods for Player Setup ---
  _findPlayerUIElements() {
    const videoItemElement = document.querySelector(
      `${config.selectors.scrollItem}.video-item[data-video-id="${this.id}"]`
    );
    if (!videoItemElement) {
      console.warn(
        `[Player UI ${this.id}] Video item element not found for ID: ${this.id}.`
      );
      return;
    }

    this.videoWrapperElement = videoItemElement.querySelector(
      ".video-aspect-wrapper"
    );
    this.playPauseButtonElement = videoItemElement.querySelector(
      `#playPauseButton-${this.id}`
    );
    this.soundButtonElement = videoItemElement.querySelector(
      `#soundButton-${this.id}`
    );
    this.thumbnailElement = videoItemElement.querySelector(
      `#thumbnail-${this.id}`
    ); // Assign thumbnail here
    this.progressBarContainer = videoItemElement.querySelector(
      `#progress-container-${this.id}`
    );
    this.progressBarFill = videoItemElement.querySelector(
      `#progress-fill-${this.id}`
    );
    this.currentTimeDisplayElement = videoItemElement.querySelector(
      `#current-time-display-${this.id}`
    );
  }

  _resetPlayerUI() {
    if (this.progressBarFill) this.progressBarFill.style.width = "0%";
    if (this.currentTimeDisplayElement)
      this.currentTimeDisplayElement.textContent = "0:00";
  }

  _attachPlayerListeners() {
    if (!this.player) return;

    if (!this.player) {
      console.warn(
        `[Video ${this.id}] _attachPlayerListeners: Player not initialized, cannot attach listeners.`
      );
      return;
    }

    // ... clear other listeners (play, pause, error) ...
    this.player.off("play");
    this.player.on("play", this._handlePlay);
    this.player.off("pause");
    this.player.on("pause", this._handlePause);
    this.player.off("error");
    this.player.on("error", this._handleError);

    // Attach timeupdate listeners ONCE
    this.player.off("timeupdate"); // Clear all first
    this.player.on("timeupdate", this._handleProgressUpdate);
    this.player.on("timeupdate", this._handleSimulatedEnd);

    // --- Attach click listeners for UI buttons ---
    if (
      this.playPauseButtonElement &&
      !this.playPauseButtonElement._listenerAttachedClick
    ) {
      this.playPauseButtonElement.addEventListener("click", () => {
        this.togglePlayPause();
      });
      this.playPauseButtonElement._listenerAttachedClick = true;
    }

    if (
      this.soundButtonElement &&
      !this.soundButtonElement._listenerAttachedClick
    ) {
      this.soundButtonElement.addEventListener("click", () => {
        this.toggleSound();
      });
      this.soundButtonElement._listenerAttachedClick = true;
    }

    // Attach Seek Listener to Progress Bar Container
    if (
      this.progressBarContainer &&
      !this.progressBarContainer._seekListenerAttached
    ) {
      // Bind _handleSeekClick to ensure 'this' refers to the Video instance inside the handler
      this.progressBarContainer.addEventListener(
        "click",
        this._handleSeekClick
      );
      this.progressBarContainer._seekListenerAttached = true;
    }
  }

  // --- "Private" Event Handler Methods ---
  _handlePlay = () => {
    if (this.thumbnailElement)
      this.thumbnailElement.classList.add("thumbnail-hidden");
    this.isEnding = false; // Reset ending flag
  };

  _handlePause = () => {
    // Show thumbnail only if video reached its simulated end
    if (this.thumbnailElement && this.hasPlayedOnce) {
      this.thumbnailElement.classList.remove("thumbnail-hidden");
    } else if (this.thumbnailElement) {
      this.thumbnailElement.classList.add("thumbnail-hidden"); // Keep hidden otherwise
    }
  };

  _handleError = (error) => {
    console.error(
      `[Player ${this.id}] Error Event:`,
      error.name,
      error.message
    );
  };

  _handleProgressUpdate = (data) => {
    if (!data) return;

    if (this.progressBarFill && this.duration > 0) {
      const progressPercent = (data.percent * 100).toFixed(2);
      this.progressBarFill.style.width = `${progressPercent}%`;
    }

    if (this.currentTimeDisplayElement) {
      if (typeof formatTime === "function") {
        this.currentTimeDisplayElement.textContent = formatTime(data.seconds);
      } else {
        console.error(
          `[TimeUpdate ${this.id}] formatTime function is not available!`
        );
      }
    }
  };

  _handleSimulatedEnd = (data) => {
    if (!data || !this.duration) return; // Add duration check
    const currentTime = data.seconds;
    // Define endTimeTarget locally for clarity
    const endTimeTarget = this.duration - this.timeupdateThreshold;

    if (currentTime >= endTimeTarget && !this.isEnding) {
      this.isEnding = true;
      this.hasPlayedOnce = true;

      if (this.progressBarFill) {
        this.progressBarFill.style.width = "100%";
      }
      if (this.currentTimeDisplayElement && typeof formatTime === "function") {
        this.currentTimeDisplayElement.textContent = formatTime(this.duration);
      }

      // Find button and icon wrappers
      const btn = this.playPauseButtonElement;
      const playWrapper = btn?.querySelector(".icon-play-wrapper");
      const pauseWrapper = btn?.querySelector(".icon-pause-wrapper");

      if (this.player) {
        this.player
          .pause()
          .catch((e) => console.warn(`Pause error on timeupdate: ${e.name}`));
      }

      // Toggle Icons
      if (btn && playWrapper && pauseWrapper) {
        playWrapper.classList.remove("is-hidden");
        pauseWrapper.classList.add("is-hidden");
        btn.setAttribute("aria-label", "Play");
      } else {
        console.warn(
          `[Player ${this.id}] Could not find button/icons on simulated end.`
        );
      }
    } else if (
      this.isEnding &&
      this.duration > 0 &&
      currentTime < endTimeTarget - 0.05
    ) {
      this.isEnding = false; // Reset if time moves away
    }
  };

  _handleSeekClick = (event) => {
    if (!this.duration || !this.player || !this.progressBarContainer) return;
    const rect = this.progressBarContainer.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const barWidth = this.progressBarContainer.offsetWidth;
    if (barWidth > 0) {
      const seekFraction = Math.max(0, Math.min(offsetX / barWidth, 1)); // Clamp fraction 0-1
      const seekTime = this.duration * seekFraction;
      this.isEnding = false; // Reset ending flag on seek
      this.hasPlayedOnce = false; // Reset play flag on seek
      this.player
        .setCurrentTime(seekTime)
        .then(() => {
          // Manually update UI immediately after successful seek
          if (this.progressBarFill)
            this.progressBarFill.style.width = `${(seekFraction * 100).toFixed(
              2
            )}%`;
          if (this.currentTimeDisplayElement)
            this.currentTimeDisplayElement.textContent = formatTime(seekTime);
          // If paused, seeking might not trigger 'play', ensure thumb is hidden
          if (this.thumbnailElement)
            this.thumbnailElement.classList.add("thumbnail-hidden");
        })
        .catch((error) =>
          console.warn(`[Player ${this.id}] Seek failed: ${error.name}`)
        );
    }
  };

  _updatePlayPauseButtonUI = (isPaused) => {
    if (!this.playPauseButtonElement) return;

    const playWrapper = this.playPauseButtonElement.querySelector(".icon-play-wrapper");
    const pauseWrapper = this.playPauseButtonElement.querySelector(".icon-pause-wrapper");

    playWrapper.classList.toggle("is-hidden", !isPaused);
    pauseWrapper.classList.toggle("is-hidden", isPaused);
    this.playPauseButtonElement.setAttribute("aria-label", isPaused ? "Play" : "Pause");
  };

  _updateSoundButtonUI = (isMuted) => {
    if (!this.soundButtonElement) return;

    const volumeOnWrapper = this.soundButtonElement.querySelector(".icon-volume-on-wrapper");
    const volumeOffWrapper = this.soundButtonElement.querySelector(".icon-volume-off-wrapper");

    volumeOffWrapper.classList.toggle("is-hidden", !isMuted);
    volumeOnWrapper.classList.toggle("is-hidden", isMuted);
    this.soundButtonElement.setAttribute("aria-label", isMuted ? "Unmute" : "Mute");
};

  updateVideoSizes(containerWidth) {
    if (this.aspectRatio > 0 && containerWidth > 0) {
      this.videoWidth = containerWidth;
      this.videoHeight = containerWidth / this.aspectRatio;
    } else {
      this.videoWidth = 0;
      this.videoHeight = 0;
    }
  }

  /**
   * Toggles play/pause state for this video IF it's the active scroll item.
   * Resets end-simulation flags and seeks to start if re-playing after simulated end.
   */
  async togglePlayPause() {
    let player;
    try {
      player = await this.initializePlayer();
    } catch (error) {
      console.error(
        `[Toggle Play ${this.id}] Player init failed: ${error.message}`
      );
      return;
    }

    // Check active state
    const scrollItemElement = document
      .getElementById(`iframe-${this.id}`)
      ?.closest(config.selectors.scrollItem);
    const isActive = scrollItemElement?.classList.contains(
      config.selectors.activeScrollItemClass
    );
    if (!isActive) {
      console.warn(`[Toggle Play ${this.id}] Ignoring click: Not active item.`);
      return;
    }

    // Find icon wrappers using this.id
    const playPauseButton = this.playPauseButtonElement; // Get button for aria-label
    const playWrapper = playPauseButton?.querySelector(".icon-play-wrapper");
    const pauseWrapper = playPauseButton?.querySelector(".icon-pause-wrapper");

    if (!playPauseButton || !playWrapper || !pauseWrapper) {
      console.error(
        `[Toggle Play ${this.id}] Button or Icon wrappers not found! Query: #playPauseButton-${this.id}`
      );
      return;
    }

    try {
      const paused = await player.getPaused();
      const wasAtSimulatedEnd = this.isEnding || this.hasPlayedOnce;

      if (paused) {
        this.hasPlayedOnce = false;
        this.isEnding = false; // Reset flags
        if (wasAtSimulatedEnd && this.duration > 0) {
          try {
            await player.setCurrentTime(0);
            if (this.progressBarFill) this.progressBarFill.style.width = "0%";
          } catch (e) {
            /* Warn */
          }
        }
        await player.play();
        // Show Pause icon, hide Play icon
        this._updatePlayPauseButtonUI(false); // Pass 'false' because it's now playing (not paused)
      } else {
        await player.pause();
        // Show Play icon, hide Pause icon
        this._updatePlayPauseButtonUI(true); // Pass 'true' because it's now paused
      }
    } catch (error) {
      console.error(`[Toggle Play ${this.id}] API error:`, error.name);
      this._updatePlayPauseButtonUI(true); // Assume paused state on error
    }
  }

  /**
     * Calls the globally provided function to toggle volume for all videos.
     * Ensures this video's player is ready first.

     */
  async toggleSound() {
    try {
      await this.initializePlayer();

      toggleGlobalVolume();
    } catch (error) {
      console.warn(
        `[Toggle Sound ${this.id}] Player not ready: ${error.message}`
      );
    }
  }
}
