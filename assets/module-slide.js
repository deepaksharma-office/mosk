function initSlide(_this) {
  let autoplay = _this?.dataset.autoplay === "true";
  const loop = _this?.dataset.loop === "true";
  const itemDesktop = _this?.dataset.desktop ? _this?.dataset.desktop : 4;
  const freeMode = _this?.dataset.freeMode === "true";
  const mousewheel = _this?.dataset.mousewheel === "true";
  let itemTablet = _this?.dataset.tablet ? _this?.dataset.tablet : "";
  const itemMobile = _this?.dataset.mobile ? _this?.dataset.mobile : 1;
  const direction = _this?.dataset.direction
    ? _this?.dataset.direction
    : "horizontal";
  const heightAuto = _this?.dataset.heightAuto === "true";
  const directionVerticalMobile =
    _this?.dataset.directionVerticalMobile === "true";
  let autoPlaySpeed = _this?.dataset.autoPlaySpeed
    ? _this?.dataset.autoPlaySpeed
    : 3000;
  let speed = _this?.dataset.speed ? _this?.dataset.speed : 500;
  const effect = _this?.dataset.effect ? _this?.dataset.effect : "slide";
  const row = _this?.dataset.row ? _this?.dataset.row : 1;
  let spacing = _this?.dataset.spacing ? _this?.dataset.spacing : 30;
  let spacingMobile = spacing;
  const pagination = _this?.dataset.pagination
    ? _this?.dataset.pagination
    : "bullets";
  const autoItem = _this?.dataset.itemMobile === "true";
  let arrowCenterImage = _this?.dataset.arrowCenterImage === "true";
  const mutedVideo = _this?.dataset.mutedVideo === "true";
  const pauseOnMouseEnter = _this?.dataset.pauseOnMouseEnter === "true";
  const sectionShopable = _this?.dataset.sectionShopable === "true";
  const sectionScrollingImage = _this?.dataset.sectionScrollingImage === "true";
  let itemScrollingImage = false;
  if (sectionScrollingImage && !window.Shopify.designMode && itemDesktop >= 5) {
    itemScrollingImage = true;
  }
  let itemShopableDesktop = false;
  if (sectionShopable && !window.Shopify.designMode && itemDesktop >= 5) {
    itemShopableDesktop = true;
  }
  spacing = Number(spacing);
  spacingMobile = Number(spacingMobile);
  autoPlaySpeed = Number(autoPlaySpeed);
  speed = Number(speed);
  if (autoplay) {
    autoplay = { delay: autoPlaySpeed, pauseOnMouseEnter: pauseOnMouseEnter };
  }
  if (!itemTablet) {
    if (itemDesktop < 2) {
      itemTablet = 1;
    } else if (itemDesktop < 3) {
      itemTablet = 2;
    } else {
      itemTablet = 3;
    }
  }
  if (_this.dataset.flexibleSection != "true") {
    if (spacingMobile >= 32) {
      spacingMobile = 24;
    } else if (spacingMobile >= 24) {
      spacingMobile = 12;
    } else if (spacingMobile >= 16) {
      spacingMobile = 8;
    } else {
      spacingMobile = spacingMobile;
    }
  }
  if (direction == "vertical" || heightAuto) {
    _this.style.maxHeight = _this.offsetHeight + "px";
  }
  if (directionVerticalMobile) {
    const mediaQuery = window.matchMedia("(max-width: 767.98px)");
    const handleMediaQueryChange = (mediaQuery) => {
      if (mediaQuery.matches) {
        _this.style.maxHeight = _this.offsetHeight + "px";
      } else {
        _this.style.maxHeight = "";
      }
    };
    handleMediaQueryChange(mediaQuery);
    mediaQuery.addEventListener("change", () =>
      handleMediaQueryChange(mediaQuery),
    );
  }
  const customPrev = _this.dataset.customPrev;
  const customNext = _this.dataset.customNext;
  let nextEl = customNext
    ? document.querySelector(`.${customNext}`)
    : _this.querySelector(".swiper-button-next");
  let prevEl = customPrev
    ? document.querySelector(`.${customPrev}`)
    : _this.querySelector(".swiper-button-prev");
  let paginationSwiper = _this.querySelector(".swiper-pagination");
  const swiperControls = _this.closest(".swiper__controls-group");
  if (swiperControls) {
    nextEl = swiperControls.querySelector(".swiper-button-next");
    prevEl = swiperControls.querySelector(".swiper-button-prev");
    paginationSwiper = swiperControls.querySelector(".swiper-pagination");
  }
  const swiper = new Swiper(_this, {
    slidesPerView: freeMode ? "auto" : autoItem ? "auto" : itemMobile,
    spaceBetween: spacingMobile,
    mousewheel: mousewheel,
    autoplay: false,
    direction: directionVerticalMobile ? "vertical" : direction,
    loop: loop,
    effect: effect,
    speed: speed,
    watchSlidesProgress: true,
    watchSlidesVisibility: true,
    grabCursor: true,
    allowTouchMove: true,
    freeMode: freeMode,
    grid: {
      rows: row,
      fill: "row",
    },
    navigation: {
      nextEl: nextEl,
      prevEl: prevEl,
    },
    pagination: {
      clickable: true,
      el: paginationSwiper,
      type: pagination ? pagination : "bullets",
      renderCustom: function (swiper, current, total) {
        return current + "/" + total;
      },
    },
    breakpoints: {
      768: {
        slidesPerView: itemTablet,
        spaceBetween: spacing,
        grid: {
          rows: row,
        },
        direction: directionVerticalMobile ? "horizontal" : direction,
      },
      1025: {
        slidesPerView: itemScrollingImage
          ? 5
          : itemShopableDesktop
            ? 4
            : itemDesktop,
        spaceBetween: spacing,
        grid: {
          rows: row,
        },
        direction: directionVerticalMobile ? "horizontal" : direction,
      },
      1280: {
        slidesPerView: itemDesktop,
        spaceBetween: spacing,
        grid: {
          rows: row,
        },
        direction: directionVerticalMobile ? "horizontal" : direction,
      },
    },
    on: {
      init: function () {
        if (arrowCenterImage) {
          const items_slide = _this.querySelectorAll(".center_swiper-arrow");
          if (items_slide.length != 0) {
            const oH = [];
            items_slide.forEach((e) => {
              oH.push(e.offsetHeight / 2);
            });
            const max = Math.max(...oH);
            const arrowsOffset = "--arrows-offset-top: " + max + "px";
            if (_this.querySelectorAll(".swiper-arrow")) {
              _this.querySelectorAll(".swiper-arrow").forEach((arrow) => {
                arrow.setAttribute("style", arrowsOffset);
              });
            }
          }
        }
        _this.querySelectorAll(".slide-video-1").forEach((video) => {
          loadSlideVideo(video, false);
        });
      },
      slideChange: function () {
        const currentSlide = this.slides[this.activeIndex];
        if (mutedVideo && currentSlide) {
          this.slides.forEach((slide, index) => {
            if (index != this.activeIndex) {
              const video = slide.querySelector("video");
              if (video) {
                video.muted = true;
                video.pause();
                slide.querySelector(".mute-button").classList.remove("active");
                slide.querySelector(".play-button").classList.remove("active");
              }
            }
          });
          const video = currentSlide.querySelector("video");
          if (video) {
            video.muted = false;
            currentSlide.querySelector(".mute-button").classList.add("active");
            if (video.paused) {
              video.play();
              currentSlide
                .querySelector(".play-button")
                .classList.add("active");
            }
          }
        }
        const pressCardSection = _this.closest(".section-press-card");
        if (pressCardSection) {
          const slideMedia = pressCardSection.querySelector("slide-with-media");

          if (slideMedia && slideMedia.swiper) {
            slideMedia.swiper.slideTo(this.activeIndex);
          }
        }
      },
      slideChangeTransitionEnd: function () {
        _this.querySelectorAll("video-local-slide").forEach((video) => {
          loadSlideVideo(video, false);
        });
      },
      resize: function () {
        if (heightAuto) {
          const items = _this.querySelectorAll(
            ".announcement-bar__content-inner",
          );
          if (items.length === 0) return;
          let maxHeight = items[0].offsetHeight;
          for (let i = 1; i < items.length; i++) {
            const itemHeight = items[i].offsetHeight;
            if (itemHeight > maxHeight) {
              maxHeight = itemHeight;
            }
          }
          _this.style.maxHeight = maxHeight + "px";
        }
      },
    },
  });

  if (autoplay) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!swiper.autoplay.running) {
              swiper.params.autoplay = autoplay;
              swiper.autoplay.start();
            }
          } else {
            if (swiper.autoplay.running) {
              swiper.autoplay.stop();
            }
          }
        });
      },
      {
        threshold: 0.2,
        rootMargin: "0px",
      },
    );
    observer.observe(_this);
  }

  return swiper;
}

function loadSlideVideo(_this, lazy = false) {
  if (window.innerWidth > 767) {
    if (!lazy && _this.classList.contains("video-mobile")) {
      return;
    }
  } else {
    if (!lazy && _this.classList.contains("video-desktop")) {
      return;
    }
  }
  if (!_this.getAttribute("loaded") && _this.querySelector("template")) {
    const content = document.createElement("div");
    content.appendChild(
      _this.querySelector("template").content.firstElementChild.cloneNode(true),
    );
    _this.setAttribute("loaded", true);
    const deferredElement = _this.appendChild(content.querySelector("video"));
    const alt = deferredElement.getAttribute("alt");
    const img = deferredElement.querySelector("img");
    const video = _this.querySelector("video");
    video.preload = "metadata";
    if (alt && img) {
      img.setAttribute("alt", alt);
    }
    if (
      deferredElement.nodeName == "VIDEO" &&
      deferredElement.getAttribute("autoplay")
    ) {
      deferredElement.play();
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
}

function initSlideMedia(_this, gallery, thumbnail) {
  let swiperElement = _this.querySelector(".swiper-wrapper-main");
  if (_this.classList.contains("stacked-swiper-mobile")) {
    swiperElement = _this;
  }
  let watchSlidesProgress = true;
  let watchSlidesVisibility = true;
  let watchOverflow = true;
  let loop = true;
  if (
    gallery === "gird" ||
    gallery === "columns" ||
    gallery === "thumbnail" ||
    gallery === "OfferSlide" ||
    gallery === "CartUpSell"
  ) {
    loop = false;
  }
  let speed = 300;
  let spaceBetween = _this?.dataset.spacing ? _this?.dataset.spacing : 10;
  let spacingMobile = spaceBetween;
  let mousewheel = false;
  let slidesPerView = gallery == "thumbnail" ? 5 : 1;
  let itemMobile = slidesPerView;
  let direction = _this.dataset.thumbDirection
    ? _this.dataset.thumbDirection
    : "horizontal";
  if (direction == "thumbnail_left_stack" && window.innerWidth >= 768) {
    return;
  }
  if (gallery == "thumbnail" && direction == "vertical") {
    direction = "vertical";
    if (window.innerWidth >= 768) {
      slidesPerView = "auto";
    } else {
      itemMobile = 5;
    }
  } else if (gallery == "main" || gallery == "gird") {
    direction = "horizontal";
  }
  if (gallery == "thumbnail") {
    loop = false;
  }
  const items = _this.querySelectorAll(".swiper-slide");
  const itemsToShow = Array.from(items);
  const autoplayVideo = _this?.dataset.autoPlayVideo === "true";
  if (gallery == "thumbnail") {
    if (_this.classList.contains("stacked-swiper-mobile")) {
      swiperElement = _this
        .closest("media-gallery")
        .querySelector(".swiper-wrapper-thumbnail");
    } else {
      swiperElement = _this.querySelector(".swiper-wrapper-thumbnail");
    }

    watchSlidesVisibility = false;
    watchOverflow = false;
  } else if (gallery == "gird" || gallery == "columns") {
    slidesPerView = _this?.dataset.desktop
      ? _this?.dataset.desktop
      : slidesPerView;
    swiperElement = _this;
    if (_this.mobile == "2") {
      if (itemsToShow.length > 1) {
        itemMobile = 2;
      } else {
        itemMobile = 1;
      }
    } else {
      if (itemsToShow.length > 1) {
        itemMobile = 1.5;
      } else {
        itemMobile = 1;
      }
    }
  } else if (gallery == "QuickView" || gallery == "CartUpSell") {
    swiperElement = _this;
    spaceBetween = 10;
    if (gallery == "QuickView") {
      if (itemsToShow.length > 1) {
        slidesPerView = 2;
      }
    }
    direction = "horizontal";
    if (gallery == "QuickView") {
      if (window.innerWidth >= 768) {
        slidesPerView = "auto";
        direction = "vertical";
        mousewheel = {
          enabled: true,
          forceToAxis: true,
          releaseOnEdges: true,
          sensitivity: 1,
          thresholdDelta: 10,
          thresholdTime: 100,
        };
        loop = false;
        speed = 300;
      } else {
        itemMobile = 2;
      }
    }
    if (gallery == "CartUpSell" && window.innerWidth > 1024) {
      slidesPerView = "auto";
      direction = "vertical";
      mousewheel = true;
      loop = false;
      speed = 150;
    }
  } else if (gallery == "OfferSlide") {
    swiperElement = _this;
    slidesPerView = "auto";
    direction = "vertical";
    mousewheel = true;
    loop = false;
    speed = 150;
  }
  if (spacingMobile >= 32) {
    spacingMobile = 24;
  } else if (spacingMobile >= 24) {
    spacingMobile = 12;
  } else {
    spacingMobile = 8;
  }
  const swiperSlide = new Swiper(swiperElement, {
    slidesPerView: itemMobile,
    spaceBetween: spacingMobile,
    autoplay: false,
    mousewheel: mousewheel,
    speed: speed,
    direction: gallery == "OfferSlide" ? direction : "horizontal",
    loop: loop,
    watchSlidesProgress: watchSlidesProgress,
    watchSlidesVisibility: watchSlidesVisibility,
    watchOverflow: watchOverflow,
    navigation: {
      nextEl: swiperElement.querySelector(".swiper-button-next"),
      prevEl: swiperElement.querySelector(".swiper-button-prev"),
    },
    breakpoints: {
      768: {
        slidesPerView: slidesPerView,
        direction: direction,
        spaceBetween: spaceBetween,
      },
    },
    pagination: {
      clickable: true,
      el: swiperElement.querySelector(".swiper-pagination"),
      type: gallery !== "CartUpSell" ? "custom" : "bullets",
      renderCustom: function (swiper, current, total) {
        return current + "/" + total;
      },
    },
    thumbs: {
      swiper: thumbnail ? thumbnail : null,
    },
    on: {
      slideChange: function () {
        const currentSlide = this.slides[this.activeIndex];
        if (currentSlide) {
          if (gallery !== "thumbnail" && gallery !== "columns") {
            const gallery =
              currentSlide.closest("grid-gallery") ||
              (window.innerWidth < 768 &&
                currentSlide.closest("quick-view-gallery"));
            const actions = gallery
              ? gallery.querySelector(".swiper-actions")
              : false;
            if (currentSlide.classList.contains("media-gallery__model")) {
              this.allowTouchMove = false;
              if (actions) {
                actions.classList.remove("hidden");
              }
            } else {
              this.allowTouchMove = true;
              if (actions) {
                actions.classList.add("hidden");
              }
            }
          }
        }
      },
      slideChangeTransitionEnd: function () {
        if (autoplayVideo && !thumbnail) {
          const vimeoTag = document.createElement("script");
          vimeoTag.src = "https://player.vimeo.com/api/player.js";
          document.head.appendChild(vimeoTag);
          const activeSlide = this.slides[this.activeIndex];
          const video = activeSlide.querySelector(".media-video");
          if (video) {
            if (video.tagName === "VIDEO") {
              video.play();
            } else if (video.tagName === "IFRAME") {
              if (video.src.includes("vimeo")) {
                const vimeoPlayer = new Vimeo.Player(video);
                vimeoPlayer.play();
              }
              if (video.src.includes("youtube")) {
                video.contentWindow.postMessage(
                  '{"event":"command","func":"playVideo","args":""}',
                  "*",
                );
              }
            }
          }
        }
      },
    },
  });
  return swiperSlide;
}

class SlideSection extends HTMLElement {
  constructor() {
    super();
    this.init();
  }

  init() {
    initSlide(this);
  }

  initSlideMediaGallery(gallery, thumbnail = null) {
    return initSlideMedia(this, gallery, thumbnail);
  }
}
if (!customElements.get("slide-section")) {
  customElements.define("slide-section", SlideSection);
}

export { initSlide, initSlideMedia, SlideSection, loadSlideVideo };
