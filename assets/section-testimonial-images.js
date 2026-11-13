import { initSlide, SlideSection } from "@NextSkyTheme/slide";

function isPairedTestimonialImagesSection(section) {
  if (!section) return false;
  const mediaCount = section.querySelectorAll("[data-testimonial-images-media]").length;
  const contentCount = section.querySelectorAll("[data-testimonial-images-content]").length;
  return mediaCount === 1 && contentCount === 1;
}

function getSlideCount(swiper) {
  if (!swiper || swiper.destroyed) return 0;
  if (swiper.params?.loop) {
    return swiper.slides?.length
      ? swiper.slides.filter((slide) => !slide.classList.contains("swiper-slide-duplicate"))
          .length
      : 0;
  }
  return swiper.slides?.length || 0;
}

function clampSlideIndex(swiper, index) {
  const count = getSlideCount(swiper);
  if (!count) return 0;
  return Math.min(Math.max(Number(index) || 0, 0), count - 1);
}

class TestimonialImagesMedia extends HTMLElement {
  connectedCallback() {
    this.initFrame = requestAnimationFrame(() => {
      this.initFrame = null;
      if (!this.shouldSelfInit()) return;
      if (!this.swiper || this.swiper.destroyed) {
        initSlide(this);
        this.selfInited = true;
      }
    });
  }

  disconnectedCallback() {
    if (this.initFrame != null) {
      cancelAnimationFrame(this.initFrame);
      this.initFrame = null;
    }

    if (this.selfInited && this.swiper && !this.swiper.destroyed) {
      this.swiper.destroy(true, true);
    }

    this.swiper = null;
    this.selfInited = false;
  }

  shouldSelfInit() {
    return !isPairedTestimonialImagesSection(this.closest("[data-testimonial-images-section]"));
  }
}

class TestimonialImagesSlide extends SlideSection {
  connectedCallback() {
    this.initFrame = requestAnimationFrame(() => {
      this.initFrame = null;
      if (!this.swiper || this.swiper.destroyed) {
        super.init();
      }

      this.initMedia();
      this.initCounter();
      this.initEditorSelect();
    });
  }

  initCounter() {
    this.counter = this.querySelector("[data-slide-counter]");
    if (!this.counter || !this.swiper) return;

    this.onCounterChange = () => {
      this.counter.textContent = `${this.swiper.realIndex + 1}/${getSlideCount(this.swiper)}`;
    };
    this.swiper.on("slideChange", this.onCounterChange);
    this.onCounterChange();
  }

  initEditorSelect() {
    if (!window.Shopify?.designMode || this.onBlockSelect) return;

    this.onBlockSelect = (event) => {
      const slide = event.target.closest(".swiper-slide");
      if (!slide || !this.swiper || !this.contains(slide)) return;
      const index = slide.dataset.swiperSlideIndex ?? this.swiper.slides.indexOf(slide);
      this.swiper.autoplay?.stop();
      this.goToSlide(this.swiper, index);
      this.goToSlide(this.mediaSwiper, index);
    };
    this.onBlockDeselect = () => {
      if (this.dataset.autoplay === "true") this.swiper?.autoplay?.start();
    };
    this.addEventListener("shopify:block:select", this.onBlockSelect);
    this.addEventListener("shopify:block:deselect", this.onBlockDeselect);
  }

  disconnectedCallback() {
    if (this.initFrame != null) {
      cancelAnimationFrame(this.initFrame);
      this.initFrame = null;
    }

    this.clearSyncLock();
    this.unbindSync();
    this.destroyMediaVideos();

    if (this.swiper && !this.swiper.destroyed && this.onCounterChange) {
      this.swiper.off("slideChange", this.onCounterChange);
    }
    this.onCounterChange = null;

    if (this.onBlockSelect) {
      this.removeEventListener("shopify:block:select", this.onBlockSelect);
      this.removeEventListener("shopify:block:deselect", this.onBlockDeselect);
      this.onBlockSelect = null;
      this.onBlockDeselect = null;
    }

    if (this.ownsMediaSwiper && this.mediaSwiper && !this.mediaSwiper.destroyed) {
      this.mediaSwiper.destroy(true, true);
    }

    if (this.swiper && !this.swiper.destroyed) {
      this.swiper.destroy(true, true);
    }

    this.swiper = null;
    this.mediaSwiper = null;
    this.ownsMediaSwiper = false;
  }

  initMedia() {
    if (this.mediaSwiper || !this.swiper) return;

    const section = this.closest("[data-testimonial-images-section]");
    if (!isPairedTestimonialImagesSection(section)) return;

    const media = section.querySelector("[data-testimonial-images-media]");
    if (!media) return;

    const alreadyReady = media.swiper && !media.swiper.destroyed;
    this.mediaSwiper = alreadyReady ? media.swiper : initSlide(media);
    this.ownsMediaSwiper = !alreadyReady;
    this.syncSlides();
    this.initMediaVideos(media);
  }

  initMediaVideos(media) {
    if (!this.mediaSwiper || !media.querySelector("video")) return;

    this.mediaElement = media;
    this.mediaInView = false;
    const isActiveVideo = (video) =>
      video.closest(".swiper-slide")?.classList.contains("swiper-slide-active");

    this.onMediaVideoPlay = (event) => {
      if (event.target.tagName === "VIDEO" && !isActiveVideo(event.target)) {
        event.target.pause();
      }
    };
    this.onMediaVideoChange = () => {
      media.querySelectorAll("video").forEach((video) => {
        if (!isActiveVideo(video)) {
          video.pause();
        } else if (this.mediaInView && video.currentSrc && video.paused) {
          video.play().catch(() => {});
        }
      });
    };
    this.mediaObserver = new IntersectionObserver(([entry]) => {
      this.mediaInView = entry.isIntersecting;
    });

    media.addEventListener("play", this.onMediaVideoPlay, true);
    this.mediaSwiper.on("slideChangeTransitionEnd", this.onMediaVideoChange);
    this.mediaObserver.observe(media);
    this.onMediaVideoChange();
  }

  destroyMediaVideos() {
    this.mediaObserver?.disconnect();
    this.mediaElement?.removeEventListener("play", this.onMediaVideoPlay, true);
    if (this.mediaSwiper && !this.mediaSwiper.destroyed && this.onMediaVideoChange) {
      this.mediaSwiper.off("slideChangeTransitionEnd", this.onMediaVideoChange);
    }
    this.mediaObserver = null;
    this.mediaElement = null;
    this.onMediaVideoPlay = null;
    this.onMediaVideoChange = null;
  }

  unbindSync() {
    if (this.swiper && !this.swiper.destroyed && this.onContentSlideChange) {
      this.swiper.off("slideChange", this.onContentSlideChange);
    }

    if (this.mediaSwiper && !this.mediaSwiper.destroyed && this.onMediaSlideChange) {
      this.mediaSwiper.off("slideChange", this.onMediaSlideChange);
    }

    if (this.swiper && !this.swiper.destroyed && this.onSyncLockEnd) {
      this.swiper.off("slideChangeTransitionEnd", this.onSyncLockEnd);
    }

    if (this.mediaSwiper && !this.mediaSwiper.destroyed && this.onSyncLockEnd) {
      this.mediaSwiper.off("slideChangeTransitionEnd", this.onSyncLockEnd);
    }

    this.onContentSlideChange = null;
    this.onMediaSlideChange = null;
    this.onSyncLockEnd = null;
  }

  clearSyncLock() {
    if (this.syncLockTimer != null) {
      clearTimeout(this.syncLockTimer);
      this.syncLockTimer = null;
    }
    this.isSyncing = false;
  }

  lockSync(swiper) {
    this.isSyncing = true;

    if (this.syncLockTimer != null) {
      clearTimeout(this.syncLockTimer);
    }

    const speed = Number(swiper?.params?.speed) || 300;
    this.syncLockTimer = setTimeout(() => {
      this.syncLockTimer = null;
      this.isSyncing = false;
    }, speed + 50);
  }

  syncSlides() {
    this.unbindSync();

    this.onSyncLockEnd = () => {
      this.clearSyncLock();
    };

    this.onContentSlideChange = () => {
      if (this.isSyncing) return;
      this.goToSlide(this.mediaSwiper, this.swiper.realIndex);
    };

    this.onMediaSlideChange = () => {
      if (this.isSyncing) return;
      this.goToSlide(this.swiper, this.mediaSwiper.realIndex);
    };

    this.swiper.on("slideChange", this.onContentSlideChange);
    this.mediaSwiper.on("slideChange", this.onMediaSlideChange);
    this.swiper.on("slideChangeTransitionEnd", this.onSyncLockEnd);
    this.mediaSwiper.on("slideChangeTransitionEnd", this.onSyncLockEnd);

    this.goToSlide(this.mediaSwiper, this.swiper.realIndex);
  }

  goToSlide(swiper, index) {
    if (!swiper || swiper.destroyed) return;

    const nextIndex = clampSlideIndex(swiper, index);
    if (swiper.realIndex === nextIndex) return;

    this.lockSync(swiper);

    try {
      if (swiper.params.loop) {
        swiper.slideToLoop(nextIndex);
      } else {
        swiper.slideTo(nextIndex);
      }
    } catch (_) {
      this.clearSyncLock();
    }
  }
}

if (!customElements.get("testimonial-images-media")) {
  customElements.define("testimonial-images-media", TestimonialImagesMedia);
}

if (!customElements.get("testimonial-images-slide")) {
  customElements.define("testimonial-images-slide", TestimonialImagesSlide);
}
