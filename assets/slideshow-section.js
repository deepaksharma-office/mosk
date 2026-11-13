const MOBILE_MEDIA_QUERY = "(max-width: 767.98px)";

class SlideshowSection extends HTMLElement {
  constructor() {
    super();
    this.mainSlide = this.querySelector(".swiper-slideshow-main");
    this.mobileMedia = window.matchMedia(MOBILE_MEDIA_QUERY);

    this.onMediaChange = () => {
      this.loadActiveSlideVideos();
    };
    
    this.init();
  }

  init() {
    this.swiper = this.initSlideShow();
    this.mobileMedia.addEventListener("change", this.onMediaChange);
  }

  initSlideShow() {
    let autoplay = this.mainSlide?.dataset.autoplay === "true";
    const loop = this.mainSlide?.dataset.loop === "true";
    let autoPlaySpeed = this.mainSlide?.dataset.autoPlaySpeed
      ? this.mainSlide?.dataset.autoPlaySpeed
      : 3000;
    const effect = this.mainSlide?.dataset.effect
      ? this.mainSlide?.dataset.effect
      : "slide";
    const animation = this.mainSlide?.dataset.effect
      ? this.mainSlide?.dataset.animation
      : "default";
    const pauseOnMouseEnter =
      this.mainSlide?.dataset.pauseOnMouseEnter === "true";
    if (autoplay) {
      autoplay = { delay: autoPlaySpeed, pauseOnMouseEnter: pauseOnMouseEnter };
    }
    const _this = this;
    const base = {
      autoplay: autoplay,
      effect: effect,
      loop: loop,
      navigation: {
        nextEl: this.querySelector(".swiper-button-next"),
        prevEl: this.querySelector(".swiper-button-prev"),
      },
      pagination: {
        clickable: true,
        el: this.querySelector(".swiper-pagination"),
      },
      on: {
        init: function () {
          _this.querySelectorAll(".slide-video-1").forEach((video) => {
            if (video.closest(".swiper-slide-duplicate")) return;
            _this.loadSlideVideo(video, false);
          });
        },
        slideChangeTransitionStart: function (sw) {
          _this.loadActiveSlideVideos(this);
          const currentSlide = this.slides[this.activeIndex];
          currentSlide
            .querySelectorAll("motion-effect")
            .forEach(async (motion) => {
              await motion.initAnimate();
            });
        },
        slideChangeTransitionEnd: function () {
          _this.loadActiveSlideVideos(this);
          const currentSlide = this.slides[this.activeIndex];
          currentSlide
            .querySelectorAll("motion-effect")
            .forEach(async (motion) => {
              (motion.classList.remove("animate-delay"),
                await motion.initAnimateEffect());
            });
        },
      },
    };
    base.effect = effect;
    base.speed = 400;
    const swiper = new Swiper(this.mainSlide, base);
    return swiper;
  }

  loadActiveSlideVideos(swiper = this.swiper) {
    const activeSlide = swiper?.slides[swiper.activeIndex];
    if (!activeSlide) return;
    activeSlide.querySelectorAll("video-local-slide").forEach((video) => {
      this.loadSlideVideo(video, false);
    });
  }

  async loadSlideVideo(_this, lazy = false) {
    if (this.mobileMedia.matches) {
      if (!lazy && _this.classList.contains("video-desktop")) {
        return;
      }
    } else {
      if (!lazy && _this.classList.contains("video-mobile")) {
        return;
      }
    }
    let video = _this.querySelector("video");

    if (
      !video &&
      !_this.getAttribute("loaded") &&
      _this.querySelector("template")
    ) {
      const content = document.createElement("div");
      content.appendChild(
        _this
          .querySelector("template")
          .content.firstElementChild.cloneNode(true),
      );
      _this.setAttribute("loaded", true);
      video = _this.appendChild(content.querySelector("video"));
    }

    if (!video || _this.dataset.videoInitialized === "true") {
      return;
    }

    _this.dataset.videoInitialized = "true";
    const media = _this.closest(".banner__media");

    if (video.dataset.src) {
      video.preload = "metadata";
      video.src = video.dataset.src;
      video.removeAttribute("data-src");
    }

    if (!video.getAttribute("preload")) {
      video.preload = "metadata";
    }

    if (video.getAttribute("autoplay")) {
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch((err) => {
          if (err?.name !== "AbortError") console.warn("play failed:", err);
        });
      }
    }

    await this.waitForFirstFrame(video);
    _this.classList.add("is-ready");
    if (_this.dataset.firstSlideVideo === "true" && media) {
      media.classList.add("is-video-ready");
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ target, isIntersecting, intersectionRatio }) => {
          if (isIntersecting && intersectionRatio > 0.2) {
            const p = video.play();
            if (p && typeof p.catch === "function") {
              p.catch((err) => {
                if (err?.name !== "AbortError")
                  console.warn("play failed:", err);
              });
            }
          } else {
            target.pause();
          }
        });
      },
      { threshold: [0, 0.2, 1] },
    );

    io.observe(video);
  }

  waitForFirstFrame(video) {
    return new Promise((resolve) => {
      const done = () => {
        cleanup();
        resolve();
      };
      const cleanup = () => {
        video.removeEventListener("loadeddata", done);
        video.removeEventListener("playing", done);
        video.removeEventListener("timeupdate", onTime);
      };
      const onTime = () => {
        if (video.currentTime > 0) done();
      };

      if (
        (video.readyState >= 2 && video.videoWidth) ||
        video.currentTime > 0
      ) {
        return resolve();
      }
      video.addEventListener("loadeddata", done, { once: true });
      video.addEventListener("playing", done, { once: true });
      video.addEventListener("timeupdate", onTime, { once: true });

      if ("requestVideoFrameCallback" in video) {
        video.requestVideoFrameCallback(() => {
          done();
        });
      }
    });
  }

  disconnectedCallback() {
    this.mobileMedia.removeEventListener("change", this.onMediaChange);
  }
}
if (!customElements.get("slideshow-section")) {
  customElements.define("slideshow-section", SlideshowSection);
}
