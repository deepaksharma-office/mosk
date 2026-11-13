/**
 * VideoProgressBar - Class for managing video progress bar
 * Displays video playback progress, buffer and time information
 * Display only, no control functionality
 */
class VideoProgressBar {
  constructor(videoElement, options = {}) {
    this.video = videoElement;
    this.container = options.container || videoElement.parentElement;
    this.options = {
      showTime: options.showTime || false, // Show current time
      showDuration: options.showDuration || false, // Show total duration
      className: options.className || 'video-progress-bar',
      allowHide: options.allowHide === true, // Default does NOT allow hiding, set true to allow hiding
      ...options
    };
    
    this.isVisible = false;
    
    this.init();
  }

  init() {
    this.createProgressBar();
    this.bindEvents();
    this.updateProgress();
    
    // Show immediately if hiding is not allowed
    if (!this.options.allowHide) {
      this.show();
    }
  }

  createProgressBar() {
    // Create container for progress bar
    this.progressContainer = document.createElement('div');
    this.progressContainer.className = `${this.options.className}-container`;

    // Create progress bar
    this.progressBar = document.createElement('div');
    this.progressBar.className = `${this.options.className}`;

    // Create progress fill
    this.progressFill = document.createElement('div');
    this.progressFill.className = `${this.options.className}-fill`;

    // Create buffer bar (for video buffering)
    this.bufferBar = document.createElement('div');
    this.bufferBar.className = `${this.options.className}-buffer`;

    // Create time display
    if (this.options.showTime || this.options.showDuration) {
      this.timeDisplay = document.createElement('div');
      this.timeDisplay.className = `${this.options.className}-time`;

      this.currentTime = document.createElement('span');
      this.currentTime.textContent = '0:00';

      this.duration = document.createElement('span');
      this.duration.textContent = '0:00';

      this.timeDisplay.appendChild(this.currentTime);
      this.timeDisplay.appendChild(this.duration);
    }

    // Assemble elements
    this.progressBar.appendChild(this.bufferBar);
    this.progressBar.appendChild(this.progressFill);
    
    this.progressContainer.appendChild(this.progressBar);
    if (this.timeDisplay) {
      this.progressContainer.appendChild(this.timeDisplay);
    }

    this.container.appendChild(this.progressContainer);
  }

  bindEvents() {
    // Video events
    this.video.addEventListener('loadedmetadata', () => this.updateDuration());
    this.video.addEventListener('timeupdate', () => this.updateProgress());
    this.video.addEventListener('progress', () => this.updateBuffer());
    this.video.addEventListener('play', () => this.show());
    this.video.addEventListener('pause', () => this.show());
    this.video.addEventListener('ended', () => this.hide());
  }

  updateProgress() {
    if (!this.video.duration) return;

    const progress = (this.video.currentTime / this.video.duration) * 100;
    this.progressFill.style.width = `${progress}%`;

    if (this.currentTime) {
      this.currentTime.textContent = this.formatTime(this.video.currentTime);
    }
  }

  updateBuffer() {
    if (!this.video.duration || !this.video.buffered.length) return;

    const buffered = this.video.buffered.end(this.video.buffered.length - 1);
    const bufferProgress = (buffered / this.video.duration) * 100;
    this.bufferBar.style.width = `${bufferProgress}%`;
  }

  updateDuration() {
    if (this.duration && this.video.duration) {
      this.duration.textContent = this.formatTime(this.video.duration);
    }
  }

  show() {
    this.isVisible = true;
    this.progressContainer.style.display = 'block';
  }

  hide() {
    // Only hide progress bar if allowHide = true
    if (!this.options.allowHide) return;
    
    this.isVisible = false;
    this.progressContainer.style.display = 'none';
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Method to customize styles
  setStyles(styles) {
    Object.assign(this.progressContainer.style, styles.container || {});
    Object.assign(this.progressBar.style, styles.progressBar || {});
    Object.assign(this.progressFill.style, styles.progressFill || {});
    Object.assign(this.bufferBar.style, styles.bufferBar || {});
    if (this.timeDisplay && styles.timeDisplay) {
      Object.assign(this.timeDisplay.style, styles.timeDisplay);
    }
  }

  // Method to destroy progress bar
  destroy() {
    if (this.progressContainer && this.progressContainer.parentNode) {
      this.progressContainer.parentNode.removeChild(this.progressContainer);
    }
  }
}

/**
 * Utility function to create progress bar for video
 * @param {HTMLVideoElement} videoElement - Video element
 * @param {Object} options - Configuration options
 * @param {boolean} options.showTime - Show current time (default: false)
 * @param {boolean} options.showDuration - Show total duration (default: false)
 * @param {string} options.className - CSS class name (default: 'video-progress-bar')
 * @param {boolean} options.allowHide - Allow hiding progress bar (default: false - always visible)
 * @returns {VideoProgressBar} Instance of VideoProgressBar
 */
export function createVideoProgressBar(videoElement, options = {}) {
  return new VideoProgressBar(videoElement, options);
}