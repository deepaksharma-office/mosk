import { SlideSection } from "@NextSkyTheme/slide";
import * as NextSkyTheme from "@NextSkyTheme/global";
import { LazyLoader, waitForVideoPosters } from "@NextSkyTheme/lazy-load";
import { createVideoProgressBar } from "@NextSkyTheme/progress-video";
import { eventModal } from "@NextSkyTheme/modal";

function getShopableModalDirection() {
  const root = document.documentElement;
  if (!root) return "ltr";

  const direction =
    typeof root.getAttribute === "function" ? root.getAttribute("dir") : root.dir;

  return direction === "rtl" ? "rtl" : "ltr";
}

function prepareShopableModalClone(modalPopup, direction = getShopableModalDirection()) {
  if (!modalPopup || typeof modalPopup.setAttribute !== "function") return null;

  modalPopup.setAttribute("dir", direction);

  const swiperContainer = modalPopup.querySelector("slide-section");
  if (swiperContainer && typeof swiperContainer.setAttribute === "function") {
    swiperContainer.setAttribute("dir", direction);
  }

  return modalPopup;
}

function syncShopableModalDirection(
  modalPopup,
  direction = getShopableModalDirection(),
  swiperContainerOverride = null
) {
  const preparedModal = prepareShopableModalClone(modalPopup, direction);
  const swiperContainer =
    swiperContainerOverride || preparedModal?.querySelector("slide-section");
  const swiper = swiperContainer?.swiper;

  if (swiperContainer && typeof swiperContainer.setAttribute === "function") {
    swiperContainer.setAttribute("dir", direction);
  }

  if (!swiper) return swiperContainer || null;

  if (typeof swiper.changeLanguageDirection === "function") {
    swiper.changeLanguageDirection(direction);
  }

  if (swiper.el) {
    swiper.el.dir = direction;
    if (swiper.params?.containerModifierClass && swiper.el.classList) {
      const rtlClass = `${swiper.params.containerModifierClass}rtl`;
      if (direction === "rtl") {
        swiper.el.classList.add(rtlClass);
      } else {
        swiper.el.classList.remove(rtlClass);
      }
    }
  }

  if (swiper.wrapperEl && typeof swiper.wrapperEl.setAttribute === "function") {
    swiper.wrapperEl.setAttribute("dir", direction);
  }

  swiper.rtl = direction === "rtl";
  swiper.rtlTranslate =
    (swiper.params?.direction || "horizontal") === "horizontal" && swiper.rtl;

  if (typeof swiper.update === "function") {
    swiper.update();
  }

  return swiperContainer;
}

function getShopableModalNavigationBinding({
  direction = getShopableModalDirection(),
  nextButton = null,
  prevButton = null,
} = {}) {
  const isRTL = direction === "rtl";

  return {
    nextEl: isRTL ? prevButton : nextButton,
    prevEl: isRTL ? nextButton : prevButton,
    nextMethod: isRTL ? "slidePrev" : "slideNext",
    prevMethod: isRTL ? "slideNext" : "slidePrev",
  };
}

function canTriggerShopableModalNavigation(button) {
  if (!button) return false;
  if (button.classList?.contains?.("swiper-button-disabled")) return false;

  return button.getAttribute?.("aria-disabled") !== "true";
}

function triggerShopableModalNavigation(swiper, button, methodName) {
  if (!swiper || typeof swiper[methodName] !== "function") return false;
  if (!canTriggerShopableModalNavigation(button)) return false;

  swiper[methodName]();
  return true;
}

function bindShopableModalNavigationButton(
  button,
  swiper,
  methodName,
  onNavigate
) {
  if (!button) return;

  if (button._shopableNavClickHandler) {
    button.removeEventListener("click", button._shopableNavClickHandler);
  }
  if (button._shopableNavKeyHandler) {
    button.removeEventListener("keydown", button._shopableNavKeyHandler);
  }

  button._shopableNavClickHandler = (event) => {
    event.preventDefault();
    if (!triggerShopableModalNavigation(swiper, button, methodName)) return;

    onNavigate();
  };

  button._shopableNavKeyHandler = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    if (!triggerShopableModalNavigation(swiper, button, methodName)) return;

    onNavigate();
  };

  button.addEventListener("click", button._shopableNavClickHandler);
  button.addEventListener("keydown", button._shopableNavKeyHandler);
}

function getVideoProgressContainer(video) {
  return video?.closest?.(".video_inner") || video?.parentElement || null;
}

function hydrateVideoSource(video) {
  if (!video || typeof video.getAttribute !== "function") return false;

  const videoSrc = video.getAttribute("data-src");
  if (!videoSrc) return false;
  if (video.src && video.src.indexOf(videoSrc) !== -1) return false;

  video.src = videoSrc;
  if (typeof video.load === "function") {
    video.load();
  }

  return true;
}

function clearVideoProgressBar(video) {
  if (!video || !video._progressBar) return false;

  if (typeof video._progressBar.destroy === "function") {
    video._progressBar.destroy();
  } else {
    if (typeof video._progressBar.hide === "function") {
      video._progressBar.hide();
    }
    const progressContainer =
      video.parentElement?.querySelector?.(".video-progress-bar");
    if (progressContainer) {
      progressContainer.remove();
    }
  }

  video._progressBar = null;
  return true;
}

function clearQueuedVideoProgressBar(video) {
  if (!video?._playListenerForProgress) return;

  video.removeEventListener("play", video._playListenerForProgress);
  video._playListenerForProgress = null;
}

function createManagedVideoProgressBar(video) {
  if (!video) return null;

  clearVideoProgressBar(video);
  const videoContainer = getVideoProgressContainer(video);
  video._progressBar = createVideoProgressBar(video, {
    container: videoContainer,
    allowHide: true,
  });

  if (video._progressBar && typeof video._progressBar.show === "function") {
    video._progressBar.show();
  }

  return video._progressBar || null;
}

function syncManagedVideoProgressBar(video, context) {
  if (!video) return null;

  if (typeof context?._createProgressBarForVideo === "function") {
    context._createProgressBarForVideo(video);
    return video._progressBar || null;
  }

  return createManagedVideoProgressBar(video);
}

function queueVideoProgressBarOnPlay(video, context) {
  if (!video) return;

  clearQueuedVideoProgressBar(video);
  video._playListenerForProgress = function () {
    syncManagedVideoProgressBar(video, context);
    video.removeEventListener("play", video._playListenerForProgress);
    video._playListenerForProgress = null;
  };

  video.addEventListener("play", video._playListenerForProgress, {
    once: true,
  });
}

function autoplayShopableModalVideo(
  video,
  muteButtons = [],
  { muted = false } = {}
) {
  if (!video) return null;

  video.muted = muted;
  muteButtons.forEach((button) => {
    if (!button?.classList) return;

    if (muted) {
      button.classList.remove("active");
    } else {
      button.classList.add("active");
    }
  });

  const playPromise = video.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch((err) => {
      if (err?.name !== "AbortError") {
        console.warn("play failed:", err);
      }
    });
  }

  return playPromise;
}

function activateShopableModalVideo(
  video,
  muteButtons = [],
  context,
  options = {}
) {
  if (!video) return null;

  hydrateVideoSource(video);
  const playPromise = autoplayShopableModalVideo(video, muteButtons, options);

  if (!video.paused) {
    syncManagedVideoProgressBar(video, context);
  } else {
    queueVideoProgressBarOnPlay(video, context);
  }

  return playPromise;
}

function syncExternalVideoMuteButtons(video, muted) {
  const videoItem = video?.closest?.("shopable-item");
  if (!videoItem) return;

  videoItem
    .querySelectorAll(".mute-button, .mute-button-mobile")
    .forEach((button) => {
      if (!button?.classList) return;

      if (muted) {
        button.classList.remove("active");
      } else {
        button.classList.add("active");
      }
    });
}

function muteNonModalPlayingVideos(modalPopup, doc = document) {
  if (!modalPopup || typeof doc?.querySelectorAll !== "function") {
    return [];
  }

  const mutedVideos = [];
  doc.querySelectorAll("video").forEach((video) => {
    if (!video || video.paused || video.muted) return;
    if (typeof modalPopup.contains === "function" && modalPopup.contains(video)) {
      return;
    }

    video.muted = true;
    syncExternalVideoMuteButtons(video, true);
    mutedVideos.push(video);
  });

  return mutedVideos;
}

function restoreTemporarilyMutedVideos(videos = []) {
  videos.forEach((video) => {
    if (!video || video.isConnected === false) return;

    video.muted = false;
    syncExternalVideoMuteButtons(video, false);
  });

  return [];
}

function bindShopableModalMutedVideoRestore(modalPopup, doc = document) {
  if (!modalPopup || typeof doc?.addEventListener !== "function") return;

  if (modalPopup._shopableMutedExternalVideosRestoreHandler) {
    doc.removeEventListener(
      "modal:closed",
      modalPopup._shopableMutedExternalVideosRestoreHandler
    );
  }

  modalPopup._shopableMutedExternalVideosRestoreHandler = (event) => {
    if (event?.detail?.modal !== modalPopup) return;

    modalPopup._shopableMutedExternalVideos = restoreTemporarilyMutedVideos(
      modalPopup._shopableMutedExternalVideos || []
    );
    doc.removeEventListener(
      "modal:closed",
      modalPopup._shopableMutedExternalVideosRestoreHandler
    );
    modalPopup._shopableMutedExternalVideosRestoreHandler = null;
  };

  doc.addEventListener(
    "modal:closed",
    modalPopup._shopableMutedExternalVideosRestoreHandler
  );
}

function muteOtherPlayingVideosForOwner(currentVideo, owner, doc = document) {
  if (!currentVideo || !owner || typeof doc?.querySelectorAll !== "function") {
    return [];
  }

  owner._temporarilyMutedVideos = restoreTemporarilyMutedVideos(
    owner._temporarilyMutedVideos || []
  );

  const mutedVideos = [];
  doc.querySelectorAll("video").forEach((video) => {
    if (!video || video === currentVideo || video.paused || video.muted) return;
    if (typeof owner.contains === "function" && owner.contains(video)) return;

    video.muted = true;
    syncExternalVideoMuteButtons(video, true);
    mutedVideos.push(video);
  });

  owner._temporarilyMutedVideos = mutedVideos;
  return mutedVideos;
}

function restoreInlineTemporarilyMutedVideos(owner) {
  if (!owner) return [];

  owner._temporarilyMutedVideos = restoreTemporarilyMutedVideos(
    owner._temporarilyMutedVideos || []
  );
  return owner._temporarilyMutedVideos;
}

function bindPopupMuteButton(slide, selector) {
  const muteButton = slide.querySelector(selector);
  if (!muteButton) return;

  const nextMuteButton = muteButton.cloneNode(true);
  muteButton.parentNode.replaceChild(nextMuteButton, muteButton);
  nextMuteButton.addEventListener("click", (event) => {
    const currentTarget = event.currentTarget;
    const videoLocal = currentTarget.closest(".modal-shopable_content");
    const video = videoLocal?.querySelector("video");
    if (!video) return;

    if (video.muted == false) {
      video.muted = true;
      currentTarget.classList.remove("active");
    } else {
      video.muted = false;
      currentTarget.classList.add("active");
    }
  });
}

function applySwiperInteraction(swiper, allowTouchMove) {
  if (!swiper) return;

  swiper.allowTouchMove = allowTouchMove;
  if (allowTouchMove) {
    swiper.setGrabCursor();
  } else {
    swiper.unsetGrabCursor();
  }
}

function shouldAllowModalSwipe({
  isMobile,
  hasPopupInfo,
  hasActivePopupInfo,
}) {
  if (isMobile) {
    return !hasActivePopupInfo;
  }

  return !hasPopupInfo;
}

function haveSectionsPassedTop(sections) {
  return sections.every((section) => {
    return section.getBoundingClientRect().bottom <= 0;
  });
}

function shouldShowStickyForScroll({
  sectionsPassedTop,
  shopableVideoRect,
  viewportHeight,
}) {
  if (!sectionsPassedTop || !shopableVideoRect) return false;
  if (shopableVideoRect.top > viewportHeight) return true;
  if (shopableVideoRect.bottom < 0) return true;

  return false;
}

function applyStickyScreenClass(element) {
  const screens = element.getAttribute("data-screens");
  if (screens == "desktop_only") {
    element.classList.add("block-md");
  } else {
    element.classList.add("block");
    element.classList.remove("hidden");
  }
}

function clearStickyActivationTimer(element) {
  if (!element?._stickyActivationTimer) return;

  clearTimeout(element._stickyActivationTimer);
  element._stickyActivationTimer = null;
}

function syncStickyVisibilityState(
  element,
  {
    shouldRenderSticky,
    shouldActivateSticky,
  }
) {
  if (!element) return false;
  clearStickyActivationTimer(element);

  if (!shouldRenderSticky) {
    element.classList.remove("active");
    return false;
  }

  applyStickyScreenClass(element);
  if (shouldActivateSticky) {
    element._stickyActivationTimer = setTimeout(() => {
      element._stickyActivationTimer = null;
      if (!element.isConnected) return;
      if (element.getStickyHiddenCookie?.() || element.isModalOpen) return;

      element.classList.add("active");
    }, 100);
  } else {
    element.classList.remove("active");
  }

  return shouldActivateSticky;
}

class ShopableVideo extends SlideSection {
  constructor() {
    super();
    this.innerWidth = window.innerWidth;
    this.autoplayVideo = this.dataset.autoplayVideo === "true";
    this.autoplay = this.dataset.autoplay === "true";
    this.initShopableVideo();
    this.modalOpen = false;
  }

  connectedCallback() {
    if (this.classList.contains("swiper-slide-center")) {
      this.handleCenterSlides();
    }
    window.addEventListener("resize", this.handleResize.bind(this));
    const mediaQuery = window.matchMedia("(max-width: 1024.98px)");
    const handleMediaQueryChange = (mediaQuery) => {
      if (mediaQuery.matches) {
        this.playActiveSlideVideo(this.swiper.activeIndex);
      } else {
        if (!this.autoplayVideo) {
          this.pauseAllVideos();
        }
        if (this.classList.contains("swiper-slide-center")) {
          this.updateCenterSlideClass();
        }
      }
    };
    handleMediaQueryChange(mediaQuery);
    mediaQuery.addEventListener("change", handleMediaQueryChange);
    document.addEventListener(
      "modal:opened",
      this.handleModalOpened.bind(this)
    );
    document.addEventListener(
      "modal:closed",
      this.handleModalClosed.bind(this)
    );
  }

  handleModalOpened() {
    this.modalOpen = true;
    if (this.swiper && this.swiper.autoplay && this.autoplay) {
      this.swiper.autoplay.stop();
    }
  }

  handleModalClosed() {
    this.modalOpen = false;
    if (this.swiper && this.swiper.autoplay && this.autoplay) {
      setTimeout(() => {
        this.swiper.autoplay.start();
      }, 100);
    }
  }

  handleCenterSlides() {
    if (!this) return;
    if (this.innerWidth < 1025) return;

    const checkSwiper = setInterval(() => {
      if (this.swiper) {
        clearInterval(checkSwiper);
        this.updateCenterSlideClass();
        this.swiper.on("slideChange", () => {
          if (this.innerWidth >= 1025) {
            this.updateCenterSlideClass(true);
          }
        });
        this.swiper.on("breakpoint", () => {
          if (this.innerWidth >= 1025) {
            this.updateCenterSlideClass();
          }
        });
      }
    }, 100);
  }

  handleResize() {
    const useCenterSlideMode = this.classList.contains("swiper-slide-center");
    this.innerWidth = window.innerWidth;
    if (this.innerWidth >= 1025) {
      if (this.swiper && useCenterSlideMode) {
        this.updateCenterSlideClass();
      }
    } else {
      this.resetCenterSlideEffects();
    }
    if (!this.autoplayVideo || !this.swiper) return;
    if (useCenterSlideMode) {
      if (this.innerWidth >= 1025) {
        this.playCenterSlideVideo();
      } else {
        this.playActiveSlideVideo(this.swiper.activeIndex);
      }
    }
  }

  resetCenterSlideEffects() {
    if (!this || !this.swiper) return;

    const allSlides = Array.from(this.querySelectorAll(".swiper-slide"));

    allSlides.forEach((slide) => {
      slide.classList.remove("center-slide");
      const videoInner = slide.querySelector(".video-item--ratio");
      if (videoInner) {
        videoInner.style.height = "";
        videoInner.style.marginTop = "";
        videoInner._hasSetupTransition = false;
      }
    });
  }

  updateCenterSlideClass(immediate = false) {
    if (!this || !this.swiper) return;

    if (!this._animations) {
      this._animations = new Map();
    }

    this._animations.forEach((animation) => {
      if (animation && typeof animation.cancel === "function") {
        animation.cancel();
      }
    });
    this._animations.clear();

    let videoHeight;
    const allSlides = Array.from(this.querySelectorAll(".swiper-slide"));
    const previousCenterSlide = this.querySelector(
      ".swiper-slide.center-slide"
    );

    if (!this._maxSlideHeight) {
      let maxHeight = 0;
      allSlides.forEach((slide) => {
        const slideHeight = slide.scrollHeight;
        if (slideHeight > maxHeight) {
          maxHeight = slideHeight;
        }
      });

      this._maxSlideHeight = maxHeight > 0 ? maxHeight : 500;
    }

    allSlides.forEach((slide) => {
      slide.classList.remove("center-slide");
    });

    const slidesPerView = parseInt(this.swiper.params.slidesPerView);
    if (typeof slidesPerView === "number" && slidesPerView % 2 !== 0) {
      const centerIndex =
        Math.floor(slidesPerView / 2) + this.swiper.activeIndex;
      if (centerIndex >= 0 && centerIndex < allSlides.length) {
        allSlides[centerIndex].classList.add("center-slide");
        const newCenterSlide = allSlides[centerIndex];
        const buttonPlay = newCenterSlide.querySelector(".play-button");
        if (buttonPlay && this.autoplayVideo) {
          buttonPlay.classList.add("active");
        }
        const video = newCenterSlide.querySelector("video-local-shopable");

        if (video) {
          if (!this._originalVideoHeight) {
            this._originalVideoHeight = video.offsetHeight || 300;
          }
          videoHeight = this._originalVideoHeight;

          if (!this._lastSlideChangeTime) {
            this._lastSlideChangeTime = Date.now();
            this._isRapidSwiping = false;
          } else {
            const timeSinceLastChange = Date.now() - this._lastSlideChangeTime;
            this._lastSlideChangeTime = Date.now();
            this._isRapidSwiping = timeSinceLastChange < 300;
          }

          if (!this._containerInitialized) {
            const swiperWrapper = this.querySelector(".swiper-wrapper");
            if (swiperWrapper) {
              swiperWrapper.style.minHeight = this._maxSlideHeight + 10 + "px";
              this._containerInitialized = true;
            }
          }

          const centerVideoInner =
            newCenterSlide.querySelector(".video-item--ratio");
          if (centerVideoInner) {
            this._setVideoEffectWithMargin(centerVideoInner, videoHeight, 0);
          }

          allSlides.forEach((slide) => {
            if (!slide.classList.contains("center-slide")) {
              const nonCenterVideoInner =
                slide.querySelector(".video-item--ratio");
              const buttonPlay = slide.querySelector(".play-button");
              if (buttonPlay && this.autoplayVideo) {
                buttonPlay.classList.remove("active");
              }
              if (nonCenterVideoInner && videoHeight) {
                const targetHeight = videoHeight - 100;
                const marginTop = Math.max(0, (videoHeight - targetHeight) / 2);
                this._setVideoEffectWithMargin(
                  nonCenterVideoInner,
                  targetHeight,
                  marginTop
                );
              }
            }
          });
        }

        if (newCenterSlide !== previousCenterSlide) {
          this.dispatchEvent(
            new CustomEvent("center-slide-updated", {
              detail: {
                centerSlide: newCenterSlide,
                immediate: immediate === true,
              },
            })
          );
        }
      }
    }
  }

  _setVideoEffectWithMargin(element, targetHeight, marginTop) {
    if (!element._hasSetupTransition) {
      element.style.transition = this._isRapidSwiping
        ? "height 0.15s cubic-bezier(0.4, 0, 0.2, 1), margin-top 0.15s cubic-bezier(0.4, 0, 0.2, 1)"
        : "height 0.3s cubic-bezier(0.4, 0, 0.2, 1), margin-top 0.3s cubic-bezier(0.4, 0, 0.2, 1)";

      element._hasSetupTransition = true;

      requestAnimationFrame(() => {
        element.style.height = `${targetHeight}px`;
        element.style.marginTop = `${marginTop}px`;
      });
    } else {
      element.style.height = `${targetHeight}px`;
      element.style.marginTop = `${marginTop}px`;
    }
  }

  initShopableVideo() {
    this.setupVideoAutoplay();
  }

  setupVideoAutoplay() {
    if (!this.swiper) return;
    const useCenterSlideMode = this.classList.contains("swiper-slide-center");
    if (useCenterSlideMode) {
      if (this.innerWidth >= 1025) {
        this.playCenterSlideVideo();
      } else {
        this.playActiveSlideVideo(this.swiper.activeIndex);
      }
    } else {
      this.playActiveSlideVideo(this.swiper.activeIndex);
    }
    this.swiper.on("slideChangeTransitionEnd", () => {
      if (useCenterSlideMode) {
        if (this.innerWidth >= 1025) {
          this.playCenterSlideVideo({ immediate: true });
        } else {
          this.playActiveSlideVideo(this.swiper.activeIndex, {
            immediate: true,
          });
        }
      } else {
        if (this.innerWidth >= 1025) {
          if (this.autoplayVideo) {
            this.playActiveSlideVideo(this.swiper.activeIndex, {
              immediate: true,
            });
          }
        } else {
          this.playActiveSlideVideo(this.swiper.activeIndex, {
            immediate: true,
          });
        }
      }
    });
    this.addEventListener("center-slide-updated", (event) => {
      if (useCenterSlideMode) {
        const immediate = event.detail?.immediate === true;
        this.playCenterSlideVideo({ immediate: immediate });
      }
    });
  }

  playCenterSlideVideo(options = {}) {
    this.pauseAllVideos();
    if (!this.autoplayVideo) return;

    const centerSlide = this.querySelector(".swiper-slide.center-slide");
    if (!centerSlide) return;

    this._playSlideVideo(centerSlide, options);
  }

  playActiveSlideVideo(activeIndex, options = {}) {
    this.pauseAllVideos();
    const activeSlide = this.swiper?.slides[activeIndex];
    if (!activeSlide) return;

    this._playSlideVideo(activeSlide, options);
  }

  _isIntersectingVideo(video) {
    const playButton = video
      .closest("shopable-item")
      .querySelector(".play-button");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ target, isIntersecting, intersectionRatio }) => {
          if (isIntersecting && intersectionRatio > 0.2) {
            if (
              video.closest(".center-slide") ||
              (video.closest(".swiper-slide-active") &&
                window.innerWidth <= 1024)
            ) {
              const p = video.play();
              if (playButton) {
                playButton.classList.add("active");
              }
              if (p && typeof p.catch === "function") {
                p.catch((err) => {
                  if (err?.name !== "AbortError")
                    console.warn("play failed:", err);
                });
              }
            }
          } else {
            target.pause();
            if (playButton) {
              playButton.classList.remove("active");
            }
          }
        });
      },
      { threshold: [0, 0.2, 1] }
    );
    io.observe(video);
  }

  async _playSlideVideo(slide, options = {}) {
    const videoLocalElement = slide.querySelector("video-local-shopable");
    if (!videoLocalElement) return;
    let videoElement = videoLocalElement.querySelector("video");

    if (options.immediate) {
      if (videoElement) {
        this._playVideo(videoElement, slide);
      } else {
        const newVideo = await loadContentVideo(videoLocalElement);
        if (newVideo && newVideo.nodeName === "VIDEO") {
          setTimeout(() => this._playVideo(newVideo, slide), 100);
        }
        const video = videoLocalElement.querySelector("video");
        this._isIntersectingVideo(video);
      }
      return;
    }

    const handleIntersection = async (entries, observer) => {
      if (!entries[0].isIntersecting) return;
      observer.unobserve(this);
      const newVideo = await loadContentVideo(videoLocalElement);
      if (newVideo && newVideo.nodeName === "VIDEO") {
        setTimeout(() => this._playVideo(newVideo, slide), 100);
      }
      const video = videoLocalElement.querySelector("video");
      this._isIntersectingVideo(video);
    };
    new IntersectionObserver(handleIntersection.bind(this), {
      rootMargin: "0px 0px 200px 0px",
    }).observe(this);
  }

  _playVideo(video, slide) {
    if (!this.autoplayVideo) return;
    const playButton = slide.querySelector(".play-button");
    if (playButton) playButton.classList.add("active");

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        video.play();
      });
    }
  }

  pauseAllVideos() {
    const videos = this.querySelectorAll("video-local-shopable video");
    videos.forEach((video) => {
      if (!video.paused) {
        video.pause();
      }
    });
    this.querySelectorAll("shopable-item").forEach((item) => {
      restoreInlineTemporarilyMutedVideos(item);
    });
    const playButtons = this.querySelectorAll(".play-button");
    playButtons.forEach((button) => {
      button.classList.remove("active");
    });
  }
}
customElements.define("shopable-video", ShopableVideo);

class ShopableItem extends HTMLElement {
  constructor() {
    super();
    this.isModalOpen = false;
    this._stickyClosed = false;
    this._stickyActivationTimer = null;
    if (this.querySelector(".mute-button")) {
      this.querySelector(".mute-button").addEventListener(
        "click",
        this.clickMuteVideo.bind(this),
        false
      );
    }
    if (this.querySelector(".play-button")) {
      this.querySelector(".play-button").addEventListener(
        "click",
        this.clickPlayVideo.bind(this),
        false
      );
    }
    if (this.classList.contains("sticky-video")) {
      this.classList.remove("active");
    }
  }

  connectedCallback() {
    this.addEventListener("click", this.onShowPopupModal.bind(this), false);
    if (this.classList.contains("sticky-video")) {
      const allStickyVideos = document.querySelectorAll(".sticky-video");
      const isFirstStickyVideo = this === allStickyVideos[0];
      if (isFirstStickyVideo) {
        this.initScroll();
        if (this.getStickyHiddenCookie()) {
          this.classList.remove("active");
        }
        this.setupCloseButton();
      } else {
        this.classList.remove("active");
      }
    }
    this.addEventListener("keydown", this.handleKeyDown.bind(this), false);
  }

  disconnectedCallback() {
    this.cleanupStickyTracking();
    if (this._modalObserver) {
      this._modalObserver.disconnect();
      this._modalObserver = null;
    }
  }

  cleanupStickyTracking() {
    clearStickyActivationTimer(this);
    if (this._scrollHandler) {
      window.removeEventListener("scroll", this._scrollHandler);
      this._scrollHandler = null;
    }
    if (this._shopableVideoObserver) {
      this._shopableVideoObserver.disconnect();
      this._shopableVideoObserver = null;
    }
    if (this._firstSectionsObserver) {
      this._firstSectionsObserver.disconnect();
      this._firstSectionsObserver = null;
    }
  }

  handleKeyDown(event) {
    const isPlayButton = event.target.closest(".play-button");
    const isMuteButton = event.target.closest(".mute-button");
    if (event.key === "Enter" && !isPlayButton && !isMuteButton) {
      event.preventDefault();
      this.onShowPopupModal(event);
    }
  }

  setupMobileActionButton(modalPopup) {
    if (!modalPopup) return;

    modalPopup.addEventListener("click", (event) => {
      const actionButton = event.target.closest(".popup-information__mobile");
      if (actionButton) {
        event.preventDefault();
        event.stopPropagation();

        const currentId = modalPopup.getAttribute("data-current");
        if (!currentId) return;

        const currentItem = modalPopup.querySelector(`#${currentId}`);
        if (!currentItem) return;

        const popupInfo = currentItem.querySelector(".popup-information");
        if (!popupInfo) return;

        const buttonCloseModal = modalPopup.querySelector(".modal__close");
        const buttonCloseInformation = currentItem.querySelector(
          ".modal__close-information"
        );

        actionButton.classList.toggle("active");

        this.toggleElements(buttonCloseInformation, buttonCloseModal);

        popupInfo.classList.toggle("active");

        this.updateSwiperState(modalPopup);
      }

      const closeInfoButton = event.target.closest(".modal__close-information");
      if (closeInfoButton) {
        event.preventDefault();
        event.stopPropagation();

        const actionButton = event.target
          .closest(".drawer__body")
          .querySelector(".popup-information__mobile");

        if (actionButton) {
          actionButton.classList.remove("active");
        }

        const currentId = modalPopup.getAttribute("data-current");
        if (!currentId) return;

        const currentItem = modalPopup.querySelector(`#${currentId}`);
        if (!currentItem) return;

        const popupInfo = currentItem.querySelector(".popup-information");
        if (popupInfo) {
          this.hidePopupInformation(popupInfo);
        }

        const buttonCloseModal = modalPopup.querySelector(".modal__close");

        closeInfoButton.classList.add("hidden-important");
        closeInfoButton.classList.remove("active");
        buttonCloseModal.classList.remove("hidden-important");

        this.updateSwiperState(modalPopup);
      }
    });
  }

  toggleElements(elementToShow, elementToHide) {
    if (elementToShow.classList.contains("hidden-important")) {
      elementToShow.classList.remove("hidden-important");
      elementToShow.classList.add("active");
      elementToHide.classList.add("hidden-important");
    } else {
      elementToShow.classList.remove("active");
      elementToShow.classList.add("hidden-important");
      elementToHide.classList.remove("hidden-important");
    }
  }

  updateSwiperState(modalPopup) {
    const swiperContainer = modalPopup.querySelector("slide-section");
    if (swiperContainer && swiperContainer.swiper) {
      this.handleSwipeability(modalPopup, swiperContainer);
    }
  }

  hidePopupInformation(popupInfo) {
    popupInfo.classList.remove("active");
    popupInfo.dispatchEvent(
      new CustomEvent("popup-information:closed", {
        bubbles: true,
        detail: { popupInfo },
      })
    );
    const modalPopup = popupInfo.closest("modal-popup");
    if (modalPopup) {
      const swiperContainer = modalPopup.querySelector("slide-section");
      if (swiperContainer && swiperContainer.swiper) {
        this.handleSwipeability(modalPopup, swiperContainer);
      }
    }
    popupInfo.style.transform = "";
  }

  setupCloseButton() {
    const closeButton = this.querySelector(".shopable-sticky__close");
    if (closeButton) {
      closeButton.classList.remove("pointer-none");
      closeButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.closeStickyPopup();
      });
    }
  }

  initScroll() {
    if (this.getStickyHiddenCookie()) {
      return;
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () =>
        this.setupScrollObserver()
      );
    } else {
      this.setupScrollObserver();
    }
  }

  closeStickyPopup() {
    this._stickyClosed = true;
    this.cleanupStickyTracking();
    this.classList.remove("active");
    NextSkyTheme.setCookie("shopable_sticky_closed", "true", 1);
  }

  getStickyHiddenCookie() {
    const getCookieValue = NextSkyTheme.getCookie("shopable_sticky_closed");
    return this._stickyClosed || getCookieValue === "true";
  }

  setupScrollObserver() {
    const mainElement = document.querySelector("main");
    if (!mainElement) return;

    this.cleanupStickyTracking();

    const firstSections = Array.from(
      mainElement.querySelectorAll("section")
    ).slice(0, 1);
    const allStickyVideos = document.querySelectorAll(".sticky-video");
    if (allStickyVideos.length === 0) return;
    const firstStickyVideo = allStickyVideos[0];
    const isFirstStickyVideo = this === firstStickyVideo;
    if (!isFirstStickyVideo) {
      this.classList.remove("active");
      return;
    }
    const shopableVideoSection = firstStickyVideo.closest(
      ".section-shopable-video"
    );
    if (!shopableVideoSection) return;
    const hideSticky = () => {
      this.classList.remove("active");
    };
    const shouldSkipStickySync = () => {
      return this.getStickyHiddenCookie() || this.isModalOpen;
    };
    const getSectionsPassedTop = () => {
      return haveSectionsPassedTop(firstSections);
    };
    const syncStickyState = ({
      shouldRenderSticky = getSectionsPassedTop(),
      shouldActivateSticky,
    } = {}) => {
      if (typeof shouldActivateSticky !== "boolean") {
        shouldActivateSticky = shouldShowStickyForScroll({
          sectionsPassedTop: shouldRenderSticky,
          shopableVideoRect: shopableVideoSection.getBoundingClientRect(),
          viewportHeight: window.innerHeight,
        });
      }

      return syncStickyVisibilityState(this, {
        shouldRenderSticky,
        shouldActivateSticky,
      });
    };

    const options = {
      root: null,
      rootMargin: "0px",
      threshold: 0,
    };

    const shopableVideoObserver = new IntersectionObserver((entries) => {
      if (shouldSkipStickySync()) return;

      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          hideSticky();
        } else {
          syncStickyState();
        }
      });
    }, options);

    const firstSectionsObserver = new IntersectionObserver(() => {
      if (shouldSkipStickySync()) return;

      if (window.scrollY > 100) {
        const sectionsPassedTop = getSectionsPassedTop();
        const shouldActivateSticky =
          sectionsPassedTop &&
          shopableVideoSection.getBoundingClientRect().top > 0;

        syncStickyState({
          shouldRenderSticky: shouldActivateSticky,
          shouldActivateSticky,
        });
      } else {
        hideSticky();
      }
    }, options);
    firstSections.forEach((section) => {
      firstSectionsObserver.observe(section);
    });
    shopableVideoObserver.observe(shopableVideoSection);
    let ticking = false;
    const scrollHandler = () => {
      if (!ticking && !this.getStickyHiddenCookie()) {
        window.requestAnimationFrame(() => {
          if (window.scrollY > 0) {
            this.handleScroll(firstSections, shopableVideoSection);
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    this._scrollHandler = scrollHandler;
    window.addEventListener("scroll", this._scrollHandler, { passive: true });
    hideSticky();
    this._shopableVideoObserver = shopableVideoObserver;
    this._firstSectionsObserver = firstSectionsObserver;
  }

  handleScroll(firstSections, shopableVideoSection) {
    if (this.getStickyHiddenCookie() || this.isModalOpen) return;
    if (window.scrollY <= 0) {
      this.classList.remove("active");
      return;
    }
    const sectionsPassedTop = haveSectionsPassedTop(firstSections);
    const shopableVideoRect = shopableVideoSection.getBoundingClientRect();

    syncStickyVisibilityState(this, {
      shouldRenderSticky: sectionsPassedTop,
      shouldActivateSticky: shouldShowStickyForScroll({
        sectionsPassedTop,
        shopableVideoRect,
        viewportHeight: window.innerHeight,
      }),
    });
  }

  openVideo(event) {
    const currentTarget = event.currentTarget;
    currentTarget
      .closest(".section-shopable-video")
      .querySelectorAll("video-local-shopable")
      .forEach((el) => {
        void loadContentVideo(el);
      });
    if (currentTarget.classList.contains("sticky-video")) {
      return;
    }
    if (this.querySelector("video")) {
      const currentItem = this;

      this.closest(".section-shopable-video")
        .querySelectorAll("shopable-item")
        .forEach((el) => {
          restoreInlineTemporarilyMutedVideos(el);
          el.classList.remove("active-video");
          if (el.querySelector(".mute-button")?.classList.contains("active")) {
            el.querySelector(".mute-button").classList.remove("active");
          }
          const video = el.querySelector("video");
          if (video) {
            if (!video.paused) {
              video.pause();
            }
            if (
              el.querySelector(".play-button")?.classList.contains("active")
            ) {
              el.querySelector(".play-button").classList.remove("active");
            }
          }
        });
      const currentVideo = this.querySelector("video");
      currentVideo.muted = true;
      currentVideo.play();
      this.querySelector(".play-button").classList.add("active");
    }
  }

  _isIntersectingVideo(video) {
    const playButton = video
      .closest("shopable-item")
      .querySelector(".play-button");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ target, isIntersecting, intersectionRatio }) => {
          if (isIntersecting && intersectionRatio > 0.2) {
            if (
              video.closest(".center-slide") ||
              (video.closest(".swiper-slide-active") &&
                window.innerWidth <= 1024)
            ) {
              const p = video.play();
              if (playButton) {
                playButton.classList.add("active");
              }
              if (p && typeof p.catch === "function") {
                p.catch((err) => {
                  if (err?.name !== "AbortError")
                    console.warn("play failed:", err);
                });
              }
            }
          } else {
            target.pause();
            if (playButton) {
              playButton.classList.remove("active");
            }
          }
        });
      },
      { threshold: [0, 0.2, 1] }
    );
    io.observe(video);
  }

  async clickMuteVideo(event) {
    event.preventDefault();
    event.stopPropagation();
    const videoLocalElement = this.querySelector("video-local-shopable");
    if (!videoLocalElement) return;
    let video = videoLocalElement.querySelector("video");
    if (!video) {
      video = await loadContentVideo(videoLocalElement);
      if (!video || video.nodeName !== "VIDEO") return;
      const isVideo = videoLocalElement.querySelector("video");
      this._isIntersectingVideo(isVideo);
    }
    video.muted = !video.muted;
    const muteButton = this.querySelector(".mute-button");
    if (muteButton) {
      muteButton.classList.toggle("active", !video.muted);
    }
    if (!video.paused && !video.muted) {
      muteOtherPlayingVideosForOwner(video, this);
    } else if (video.muted) {
      restoreInlineTemporarilyMutedVideos(this);
    }
  }

  async clickPlayVideo(event) {
    event.preventDefault();
    event.stopPropagation();
    const videoLocalElement = this.querySelector("video-local-shopable");
    if (!videoLocalElement) return;
    let video = videoLocalElement.querySelector("video");
    if (!video) {
      video = await loadContentVideo(videoLocalElement);
      if (!video || video.nodeName !== "VIDEO") return;
      const isVideo = videoLocalElement.querySelector("video");
      this._isIntersectingVideo(isVideo);
    }
    const playButton = this.querySelector(".play-button");
    const muteButton = this.querySelector(".mute-button");

    const allShopableItems =
      this.closest("shopable-video").querySelectorAll("shopable-item");

    allShopableItems.forEach((item) => {
      if (item !== this) {
        restoreInlineTemporarilyMutedVideos(item);
        const otherVideoElement = item.querySelector(
          "video-local-shopable video"
        );
        const otherPlayButton = item.querySelector(".play-button");
        const otherMuteButton = item.querySelector(".mute-button");

        if (otherVideoElement) {
          if (!otherVideoElement.paused) {
            otherVideoElement.pause();
          }
          if (otherPlayButton) otherPlayButton.classList.remove("active");
          if (otherMuteButton) otherMuteButton.classList.remove("active");
        }
      }
    });

    if (video.paused) {
      video.muted = false;
      muteOtherPlayingVideosForOwner(video, this);
      video
        .play()
        .then(() => {
          if (playButton) playButton.classList.add("active");
          if (muteButton) muteButton.classList.add("active");
        })
        .catch(() => {
          restoreInlineTemporarilyMutedVideos(this);
        });
    } else {
      video.muted = true;
      video.pause();
      restoreInlineTemporarilyMutedVideos(this);
      if (playButton) playButton.classList.remove("active");
      if (muteButton) muteButton.classList.remove("active");
    }
  }

  clickMuteVideoPopup(slide) {
    bindPopupMuteButton(slide, ".mute-button");
  }

  clickMuteVideoPopupMobile(slide) {
    bindPopupMuteButton(slide, ".mute-button-mobile");
  }

  clickPlayVideoPopup(slide) {
    const videoElement = slide.querySelector("video");
    if (videoElement) {
      const videoLocal = videoElement.closest("video-local");
      const playButton = videoLocal?.querySelector(".play-button-popup");

      if (videoElement._clickHandler) {
        videoElement.removeEventListener("click", videoElement._clickHandler);
        playButton.removeEventListener("click", videoElement._clickHandler);
      }

      const self = this;

      videoElement._clickHandler = function (event) {
        event.preventDefault();
        event.stopPropagation();

        if (videoElement.paused) {
          videoElement.play();
          if (playButton) playButton.classList.add("active");
          if (videoLocal) videoLocal.classList.remove("active");
          syncManagedVideoProgressBar(videoElement, self);
        } else {
          videoElement.pause();
          if (playButton) playButton.classList.remove("active");
          if (videoLocal) videoLocal.classList.add("active");
          clearVideoProgressBar(videoElement);
        }
      };
      videoElement.addEventListener("click", videoElement._clickHandler);
      playButton.addEventListener("click", videoElement._clickHandler);
    }
  }

  findAndActivateSlide(modalPopup, productId) {
    const direction = getShopableModalDirection();
    const swiperContainer =
      syncShopableModalDirection(modalPopup, direction) ||
      modalPopup.querySelector("slide-section");
    if (!swiperContainer || !swiperContainer.swiper) {
      modalPopup.removeAttribute("data-loading");
      return;
    }

    const clickedItem = document.querySelector(`[data-product="${productId}"]`);
    if (!clickedItem) {
      modalPopup.removeAttribute("data-loading");
      return;
    }

    const position = clickedItem.getAttribute("data-position");
    if (position !== null && !isNaN(parseInt(position))) {
      const slideIndex = parseInt(position);
      swiperContainer.swiper.slideTo(slideIndex, 0, false);
    } else {
      swiperContainer.swiper.slideTo(0, 0, false);
    }

    const nextButton = modalPopup.querySelector(
      ".modal-nav .swiper-button-next"
    );
    const prevButton = modalPopup.querySelector(
      ".modal-nav .swiper-button-prev"
    );

    const swiperPagination = modalPopup.querySelector(
      ".modal-pagination .swiper-pagination"
    );
    if (swiperPagination) {
      swiperContainer.swiper.params.pagination = {
        ...swiperContainer.swiper.params.pagination,
        el: swiperPagination,
        clickable: true,
        type: "custom",
        renderCustom: function (swiper, current, total) {
          return current + "/" + total;
        },
      };

      swiperContainer.swiper.pagination.destroy();
      swiperContainer.swiper.pagination.init();
      swiperContainer.swiper.pagination.render();
      swiperContainer.swiper.pagination.update();
    }

    if (nextButton && prevButton && swiperContainer.swiper.navigation) {
      const _self = this;
      const navigationBinding = getShopableModalNavigationBinding({
        direction,
        nextButton,
        prevButton,
      });
      _self.updateCurrentSlideId(modalPopup, swiperContainer);
      nextButton.setAttribute("tabindex", "0");
      prevButton.setAttribute("tabindex", "0");
      swiperContainer.swiper.navigation.nextEl = navigationBinding.nextEl;
      swiperContainer.swiper.navigation.prevEl = navigationBinding.prevEl;
      if (typeof swiperContainer.swiper.navigation.update === "function") {
        swiperContainer.swiper.navigation.update();
      }
      bindShopableModalNavigationButton(
        nextButton,
        swiperContainer.swiper,
        navigationBinding.nextMethod,
        () => _self.updateCurrentSlideId(modalPopup, swiperContainer)
      );
      bindShopableModalNavigationButton(
        prevButton,
        swiperContainer.swiper,
        navigationBinding.prevMethod,
        () => _self.updateCurrentSlideId(modalPopup, swiperContainer)
      );
      if (!swiperContainer._hasSlideChangeHandler) {
        swiperContainer.swiper.on("slideChange", () => {
          _self.updateCurrentSlideId(modalPopup, swiperContainer);
        });
        swiperContainer._hasSlideChangeHandler = true;
      }
    }
    this.updateSwiperState(modalPopup);

    const activeSlide =
      swiperContainer.swiper.slides[swiperContainer.swiper.activeIndex];
    if (activeSlide) {
      const activeVideo = activeSlide.querySelector("video");
      hydrateVideoSource(activeVideo);
      if (activeVideo) {
        if (!activeVideo.paused) {
          syncManagedVideoProgressBar(activeVideo, this);
        } else {
          queueVideoProgressBarOnPlay(activeVideo, this);
        }
      }
    }

    modalPopup.removeAttribute("data-loading");
  }

  handleSwipeability(modalPopup, swiperContainer) {
    if (!modalPopup || !swiperContainer || !swiperContainer.swiper) return;

    const hasPopupInfo =
      modalPopup.querySelector(".popup-information") !== null;

    const hasActivePopupInfo =
      modalPopup.querySelector(".popup-information.active") !== null;
    const mediaQuery = window.matchMedia("(max-width: 1024.98px)");
    const handleMediaQueryChange = (mediaQuery) => {
      const allowTouchMove = shouldAllowModalSwipe({
        isMobile: mediaQuery.matches,
        hasPopupInfo,
        hasActivePopupInfo,
      });
      applySwiperInteraction(swiperContainer.swiper, allowTouchMove);
    };
    handleMediaQueryChange(mediaQuery);
    mediaQuery.addEventListener("change", handleMediaQueryChange);
  }

  onShowPopupModal(event) {
    event.preventDefault();
    const clickedItem = this;
    const productId = clickedItem.getAttribute("data-product");
    const currentTarget = event.currentTarget;
    const direction = getShopableModalDirection();
    if (!productId) return;
    let modalPopup = document.querySelector("modal-popup");
    if (!modalPopup) {
      const shopable_video = this.closest(
        ".section-shopable-video"
      ).querySelector(".template");
      if (shopable_video) {
        const modalClone = shopable_video.content.firstElementChild?.cloneNode(true);
        if (!modalClone) return;

        prepareShopableModalClone(modalClone, direction);
        NextSkyTheme.getBody().appendChild(modalClone);
        NextSkyTheme.global.rootToFocus = this;
        modalPopup = document.querySelector("modal-popup");
        this.setupMobileActionButton(modalPopup);
        if (currentTarget.classList.contains("sticky-video")) {
          const rootElement = document.documentElement;
          rootElement.classList.add("open-modal-shopable-video");
          this._modalObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.attributeName === "class") {
                const isModalOpen = rootElement.classList.contains(
                  "open-modal-shopable-video"
                );
                this.isModalOpen = isModalOpen;

                if (isModalOpen) {
                  this.classList.remove("active");
                  if (this._scrollHandler) {
                    window.removeEventListener("scroll", this._scrollHandler);
                  }
                } else {
                  if (this._scrollHandler) {
                    window.addEventListener("scroll", this._scrollHandler, {
                      passive: true,
                    });
                  }
                  if (!this.getStickyHiddenCookie()) {
                    this.classList.add("active");
                  }
                  if (this._modalObserver) {
                    this._modalObserver.disconnect();
                    this._modalObserver = null;
                  }
                }
              }
            });
          });
          this._modalObserver.observe(rootElement, {
            attributes: true,
            attributeFilter: ["class"],
          });
        }
      }
    }

    if (modalPopup) {
      this.isModalOpen = true;
      modalPopup.setAttribute("data-loading", "true");
      modalPopup.setAttribute("data-current", productId);
      bindShopableModalMutedVideoRestore(modalPopup);
      modalPopup._shopableMutedExternalVideos = restoreTemporarilyMutedVideos(
        modalPopup._shopableMutedExternalVideos || []
      );
      modalPopup._shopableMutedExternalVideos =
        muteNonModalPlayingVideos(modalPopup);
      const currentModalSlide = modalPopup.querySelector(
        `[data-product-id="${productId}"]`
      );
      const currentModalVideo = currentModalSlide?.querySelector("video");
      const currentVideoLocal = currentModalSlide?.querySelector("video-local");
      const currentMuteButton =
        currentVideoLocal?.querySelector(".mute-button");
      const currentMuteButtonMobile = currentModalSlide?.querySelector(
        ".mute-button-mobile"
      );
      activateShopableModalVideo(
        currentModalVideo,
        [currentMuteButton, currentMuteButtonMobile],
        this,
        { muted: false }
      );
      this.openVideo(event);
      eventModal(modalPopup, "open", true);
      const swiperContainer = modalPopup.querySelector("slide-section");
      if (swiperContainer) {
        if (!swiperContainer.swiper) {
          setTimeout(() => {
            this.findAndActivateSlide(modalPopup, productId);
          }, 100);
        } else {
          this.findAndActivateSlide(modalPopup, productId);
        }
      } else {
        modalPopup.removeAttribute("data-loading");
      }
      new LazyLoader(".image-lazy-load");
    }
  }

  closeAllPopupInformation(modalPopup) {
    const popupInfo = modalPopup.querySelectorAll(".popup-information");
    popupInfo.forEach((info) => {
      if (info.classList.contains("active")) {
        info.classList.remove("active");
      }
    });
  }

  updateCurrentSlideId(modalPopup, swiperContainer) {
    if (!modalPopup || !swiperContainer || !swiperContainer.swiper) return;

    const direction = getShopableModalDirection();
    const _self = this;
    syncShopableModalDirection(modalPopup, direction, swiperContainer);
    if (
      direction === "rtl" &&
      typeof swiperContainer.swiper.slideTo === "function"
    ) {
      swiperContainer.swiper.slideTo(swiperContainer.swiper.activeIndex, 0, false);
    }
    const activeIndex = swiperContainer.swiper.activeIndex;
    const activeSlide = swiperContainer.swiper.slides[activeIndex];

    if (activeSlide) {
      const productId =
        activeSlide.getAttribute("data-product-id") ||
        activeSlide
          .querySelector("[data-product-id]")
          ?.getAttribute("data-product-id");

      if (productId) {
        const buttonCloseModal = modalPopup.querySelector(".modal__close");
        if (buttonCloseModal.classList.contains("hidden-important")) {
          buttonCloseModal.classList.remove("hidden-important");
        }
        modalPopup.setAttribute("data-current", productId);
        _self.closeAllPopupInformation(modalPopup);
        const allSlides = swiperContainer.swiper.slides;
        allSlides.forEach((slide, index) => {
          const video = slide.querySelector("video");
          const videoLocal = slide.querySelector("video-local");
          const btnMute = videoLocal?.querySelector(".mute-button");
          const btnMuteMobile = slide.querySelector(".mute-button-mobile");
          const buttonCloseInformation = slide.querySelector(
            ".modal__close-information"
          );
          if (buttonCloseInformation) {
            buttonCloseInformation.classList.add("hidden-important");
          }
          if (video) {
            if (index === activeIndex) {
              activateShopableModalVideo(
                video,
                [btnMute, btnMuteMobile],
                _self,
                { muted: false }
              );
            } else {
              video.muted = true;
              btnMute?.classList.remove("active");
              btnMuteMobile?.classList.remove("active");
              clearQueuedVideoProgressBar(video);
              clearVideoProgressBar(video);
            }
          }
        });
        _self.clickPlayVideoPopup(activeSlide);
        _self.clickMuteVideoPopup(activeSlide);
        _self.clickMuteVideoPopupMobile(activeSlide);
        _self.handleSwipeability(modalPopup, swiperContainer);
      }
    }
  }

  _createProgressBarForVideo(video) {
    if (!video) return;
    const videoContext =
      video.closest("modal-popup") || video.closest(".section-shopable-video");
    const contextVideos = videoContext
      ? videoContext.querySelectorAll("video")
      : [];

    contextVideos.forEach((v) => {
      if (v !== video) {
        clearVideoProgressBar(v);
      }
    });

    createManagedVideoProgressBar(video);
  }
}
customElements.define("shopable-item", ShopableItem);

class PopupInformationHeader extends ShopableItem {
  constructor() {
    super();
    this.isDragging = false;
    this.startY = 0;
    this.currentY = 0;
    this.threshold = 100;

    this.startDrag = this.startDrag.bind(this);
    this.onDrag = this.onDrag.bind(this);
    this.endDrag = this.endDrag.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    this.headerElement = this;
    if (this.headerElement) {
      this.headerElement.addEventListener("touchstart", this.startDrag, {
        passive: true,
      });
      this.headerElement.addEventListener("touchmove", this.onDrag, {
        passive: false,
      });
      this.headerElement.addEventListener("touchend", this.endDrag);
      this.headerElement.addEventListener("mousedown", this.startDrag);
      document.addEventListener("mousemove", this.onDrag);
      document.addEventListener("mouseup", this.endDrag);
    }
  }

  disconnectedCallback() {
    if (this.headerElement) {
      this.headerElement.removeEventListener("touchstart", this.startDrag);
      this.headerElement.removeEventListener("touchmove", this.onDrag);
      this.headerElement.removeEventListener("touchend", this.endDrag);

      this.headerElement.removeEventListener("mousedown", this.startDrag);
      document.removeEventListener("mousemove", this.onDrag);
      document.removeEventListener("mouseup", this.endDrag);
    }
  }

  startDrag(e) {
    this.container = this.closest(".popup-information.active");
    if (!this.container) return;
    this.isDragging = true;
    this.startY = e.type.includes("mouse") ? e.clientY : e.touches[0].clientY;
    this.currentY = this.startY;
  }

  onDrag(e) {
    if (!this.isDragging || !this.container) return;

    e.preventDefault();
    this.currentY = e.type.includes("mouse") ? e.clientY : e.touches[0].clientY;
    const dragDistance = this.currentY - this.startY;

    if (dragDistance > 0) {
      this.container.style.transform = `translateY(${dragDistance}px)`;
    }
  }

  endDrag() {
    if (!this.isDragging || !this.container) return;
    const dragDistance = this.currentY - this.startY;

    if (dragDistance > this.threshold) {
      const modalPopup = this.container.closest("modal-popup");
      if (modalPopup) {
        const currentId = modalPopup.getAttribute("data-current");
        if (currentId) {
          const currentItem = modalPopup.querySelector(`#${currentId}`);
          if (currentItem) {
            const buttonCloseModal = modalPopup.querySelector(".modal__close");
            const buttonCloseInformation = currentItem.querySelector(
              ".modal__close-information"
            );
            const actionButton = modalPopup.querySelector(
              ".popup-information__mobile"
            );
            this.hidePopupInformation(this.container);
            if (actionButton) {
              actionButton.classList.remove("active");
            }
            if (buttonCloseInformation && buttonCloseModal) {
              buttonCloseInformation.classList.add("hidden-important");
              buttonCloseInformation.classList.remove("active");
              buttonCloseModal.classList.remove("hidden-important");
            }
            this.updateSwiperState(modalPopup);
          }
        }
      }
    } else {
      this.container.style.transform = "";
    }
    this.isDragging = false;
  }
}
customElements.define("popup-information-header", PopupInformationHeader);

function loadContentVideo(videoLocalElement) {
  if (!videoLocalElement) return Promise.resolve(null);
  if (videoLocalElement.getAttribute("loaded")) {
    return Promise.resolve(
      videoLocalElement.querySelector("video") ||
        videoLocalElement.querySelector("iframe"),
    );
  }
  if (!videoLocalElement.querySelector("template")) {
    return Promise.resolve(null);
  }

  return waitForVideoPosters(videoLocalElement).then(() => {
    if (videoLocalElement.getAttribute("loaded")) {
      return (
        videoLocalElement.querySelector("video") ||
        videoLocalElement.querySelector("iframe")
      );
    }
    const content = document.createElement("div");
    content.appendChild(
      videoLocalElement
        .querySelector("template")
        .content.firstElementChild.cloneNode(true),
    );
    videoLocalElement.setAttribute("loaded", true);
    const video = content.querySelector("video")
      ? content.querySelector("video")
      : content.querySelector("iframe");
    const deferredElement = videoLocalElement.appendChild(video);
    const alt = deferredElement.getAttribute("alt");
    const img = deferredElement.querySelector("img");
    const videoElement = videoLocalElement.querySelector("video");
    if (videoElement) {
      // After posters are ready (or on fast networks), allow metadata fetch.
      videoElement.preload = "metadata";
    }

    if (alt && img) {
      img.setAttribute("alt", alt);
    }

    return deferredElement;
  });
}
