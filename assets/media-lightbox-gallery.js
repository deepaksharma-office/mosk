import * as NextSkyTheme from "@NextSkyTheme/global";
import { createVideoProgressBar } from "@NextSkyTheme/progress-video";

class VideoLocalLightbox extends HTMLElement {
  constructor() {
    super();
    this.init();
  }

  init() {
    this.loadContent();
    this.addEventListener("click", this.onButtonClick);
    this.addEventListener(
      "keypress",
      function (event) {
        if (event.key === "Enter") {
          this.onButtonClick.bind(this)(event);
        }
      }.bind(this),
      false,
    );
    this.addEventListener("mouseenter", () => {
      const videoEl = this.querySelector("video");
      if (!videoEl) return;
      const slide = this.closest(".media-lightbox-slide");
      if (!slide) return;
      slide.querySelectorAll("video-local-lightbox").forEach((el) => {
        const v = el.querySelector("video");
        if (v && v !== videoEl) v.pause();
        el.classList.toggle("is-play", el === this);
      });
      videoEl.play().catch(() => {});
    });
  }

  async loadContentVideo(_this) {
    if (!_this.getAttribute("loaded") && _this.querySelector("template")) {
      _this.setAttribute("loaded", true);
      const div = document.createElement("div");
      div.innerHTML = _this
        .querySelector("template")
        .content.firstElementChild.cloneNode(true).outerHTML;
      const videoElement = div.querySelector("video");
      if (!_this.hasAttribute("autoplay")) {
        videoElement.autoplay = false;
      }
      _this.appendChild(videoElement);
      _this.thumb = _this.querySelector(".video-thumbnail");
      if (_this.thumb) {
        _this.thumb.remove();
      }
      videoElement.addEventListener("ended", (event) =>
        this.changeVideo(event),
      );
    }
  }

  changeVideo(event) {
    const currentTarget = event.currentTarget;
    const index = parseInt(
      this.closest("video-local-lightbox").getAttribute("data-video-index"),
    );
    const lightboxItems = currentTarget.closest(".media-lightbox-slide");
    const videoIndex = lightboxItems.querySelector(
      `video-local-lightbox[data-video-index="${index + 1}"]`,
    );
    lightboxItems.querySelectorAll('video-local-lightbox').forEach((element) => {
      element.classList.remove('is-play');
    });
    if (!videoIndex) {
      lightboxItems
        .querySelector(`video-local-lightbox[data-video-index="1"]`)
        .querySelector("video")
        .play();
        lightboxItems.querySelector(`video-local-lightbox[data-video-index="1"]`).classList.add('is-play');
    } else {
      if (videoIndex.querySelector("video")) {
        videoIndex.querySelector("video").play();
        videoIndex.classList.add('is-play');
      } else {
        lightboxItems.querySelector(`video-local-lightbox[data-video-index="1"]`).classList.add('is-play');
        lightboxItems
          .querySelector(`video-local-lightbox[data-video-index="1"]`)
          .querySelector("video")
          .play();
      }
    }
  }

  loadContent() {
    const _this = this;
    const handleIntersection = (entries, observer) => {
      if (!entries[0].isIntersecting) return;
      observer.unobserve(_this);
      this.loadContentVideo(_this);
    };
    new IntersectionObserver(handleIntersection.bind(_this), {
      rootMargin: "0px 0px 200px 0px",
    }).observe(_this);
  }

  get gallery() {
    return this.closest(".media-lightbox-slide");
  }

  onButtonClick(event) {
    event.preventDefault();
    const position = this.getAttribute("data-position");
    const lightbox = event.currentTarget
      .closest(".block-product__media-lightbox")
      .querySelector("template.media-lightbox-popup");
    if (!document.querySelector("media-lightbox-popup") && lightbox) {
      const content = document.createElement("div");
      content.appendChild(lightbox.content.firstElementChild.cloneNode(true));
      NextSkyTheme.getBody().appendChild(
        content.querySelector("media-lightbox-popup"),
      );
      document.querySelector("media-lightbox-popup")?.open();
      const swiperContainer = document
        .querySelector("media-lightbox-popup")
        .querySelector("slide-section");
      const slideIndex = parseInt(position);
      swiperContainer.swiper.slideTo(slideIndex, 0, false);
      NextSkyTheme.global.rootToFocus = this;
    } else {
      const swiperContainer = document
        .querySelector("media-lightbox-popup")
        .querySelector("slide-section");
      const slideIndex = parseInt(position);
      swiperContainer.swiper.slideTo(slideIndex, 0, false);
    }
  }
}
if (!customElements.get("video-local-lightbox")) {
  customElements.define("video-local-lightbox", VideoLocalLightbox);
}

class MediaLightboxPopup extends HTMLElement {
  constructor() {
    super();
    this.init();
  }

  init() {
    if (this.querySelector(".modal__close")) {
      this.querySelector(".modal__close").addEventListener(
        "click",
        this.close.bind(this),
        false,
      );
    }
    this.addEventListener(
      "keyup",
      (event) => event.code.toUpperCase() === "ESCAPE" && this.close(),
    );
  }

  open() {
    this.classList.add("active");
    const elementFocus = this.querySelector(".modal-focus");
    NextSkyTheme.trapFocus(elementFocus);
  }

  close() {
    this.classList.remove("active");
    setTimeout(() => {
      this.remove();
    }, 350);
  }
}
if (!customElements.get("media-lightbox-popup")) {
  customElements.define("media-lightbox-popup", MediaLightboxPopup);
}

class VideoLightboxItem extends HTMLElement {
  constructor() {
    super();
    this.init();
  }

  init() {
    if (this.querySelector(".mute-button")) {
      this.querySelector(".mute-button").addEventListener(
        "click",
        this.clickMuteVideo.bind(this),
        false,
      );
    }
    if (this.querySelector(".play-button")) {
      this.querySelector(".play-button").addEventListener(
        "click",
        this.clickPlayVideo.bind(this),
        false,
      );
    }

    const video = this.querySelector("video");
    if (video) {
      video.addEventListener("play", () => {
        this._createProgressBarForVideo(video);
      });

      video.addEventListener("pause", () => {
        if (video._progressBar) {
          if (typeof video._progressBar.destroy === "function") {
            video._progressBar.destroy();
          } else {
            video._progressBar.hide();
            const progressContainer = video.parentElement.querySelector(
              ".video-progress-bar",
            );
            if (progressContainer) {
              progressContainer.remove();
            }
          }
          video._progressBar = null;
        }
      });
    }
  }

  _createProgressBarForVideo(video) {
    if (!video) return;

    const lightboxPopup = this.closest("media-lightbox-popup");
    if (lightboxPopup) {
      const allVideos = lightboxPopup.querySelectorAll("video");
      allVideos.forEach((v) => {
        if (v !== video && v._progressBar) {
          if (typeof v._progressBar.destroy === "function") {
            v._progressBar.destroy();
          } else {
            v._progressBar.hide();
            const progressContainer = v.parentElement.querySelector(
              ".video-progress-bar",
            );
            if (progressContainer) {
              progressContainer.remove();
            }
          }
          v._progressBar = null;
        }
      });
    }

    if (video._progressBar) {
      if (typeof video._progressBar.destroy === "function") {
        video._progressBar.destroy();
      } else {
        video._progressBar.hide();
        const progressContainer = video.parentElement.querySelector(
          ".video-progress-bar",
        );
        if (progressContainer) {
          progressContainer.remove();
        }
      }
      video._progressBar = null;
    }

    const videoContainer = video.closest(".video_inner") || video.parentElement;
    video._progressBar = createVideoProgressBar(video, {
      container: videoContainer,
      allowHide: true,
    });

    if (video._progressBar) {
      video._progressBar.show();
    }
  }

  clickMuteVideo(event) {
    event.preventDefault();
    event.stopPropagation();
    if (this.querySelector("video").muted == false) {
      this.querySelector("video").muted = true;
      this.querySelector(".mute-button").classList.remove("active");
    } else {
      this.querySelector("video").muted = false;
      this.querySelector(".mute-button").classList.add("active");
    }
  }

  clickPlayVideo(event) {
    event.preventDefault();
    event.stopPropagation();

    const video = this.querySelector("video");
    const playButton = this.querySelector(".play-button");

    if (!video) return;

    if (video.paused) {
      video
        .play()
        .then(() => {
          if (playButton) playButton.classList.add("active");
        })
        .catch(() => {});
    } else {
      video.pause();
      if (playButton) playButton.classList.remove("active");
    }
  }
}
if (!customElements.get("video-lightbox-item")) {
  customElements.define("video-lightbox-item", VideoLightboxItem);
}

class VideoLocalLightboxSticky extends HTMLElement {
  constructor() {
    super();
    this.btn = this.querySelector(".sticky__close");
    this.video = this.querySelector(".video-local");
    this.hasScrolled = window.scrollY > 50;
  }

  connectedCallback() {
    const body = NextSkyTheme.getBody();
    if (this.parentElement !== body) {
      body
        .querySelectorAll(":scope > video-local-lightbox-sticky")
        .forEach((el) => el.remove());
      body.appendChild(this);
      return;
    }
    if (this.initialized) return;
    this.initialized = true;
    this.bindEvents();
    this.initObserver();
  }

  disconnectedCallback() {
    if (this.parentElement) return;
    this.observer?.disconnect();
  }

  bindEvents() {
    this.btn?.addEventListener("click", (e) => {
      e.preventDefault();
      this.disable();
    });

    this.video?.addEventListener("click", (e) => this.onClick(e));
    this.video?.addEventListener("keyup", (e) => {
      if (e.key === "Enter") this.onClick(e);
    });

    window.addEventListener("scroll", () => (this.hasScrolled = true), {
      once: true,
    });
  }

  initObserver() {
    const el = document.querySelector(".block-product__media-lightbox");
    if (!el) return;

    this.observer = new IntersectionObserver(([entry]) => {
      if (!this.hasScrolled || this.classList.contains("disable-sticky"))
        return;

      this.classList.toggle("active", !entry.isIntersecting);
    });

    this.observer.observe(el);
  }

  onClick(e) {
    e.preventDefault();

    const index = this.video?.dataset.videoIndex;
    if (!index) return;

    const target = document.querySelector(
      `video-local-lightbox[data-video-index="${index}"]`,
    );

    target?.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );

    this.disable();
  }

  disable() {
    this.classList.remove("active");
    this.classList.add("disable-sticky");
  }
}

customElements.define("video-local-lightbox-sticky", VideoLocalLightboxSticky);
