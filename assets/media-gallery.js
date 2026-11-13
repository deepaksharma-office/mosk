import { SlideSection } from "@NextSkyTheme/slide";
import { LazyLoader } from "@NextSkyTheme/lazy-load";
import { eventModal } from "@NextSkyTheme/modal";
import PhotoSwipeLightbox from "@NextSkyTheme/photo-swipe-lightbox";
import { CustomElement } from "@NextSkyTheme/safari-element-patch";
import * as NextSkyTheme from "@NextSkyTheme/global";

class MediaGallery extends SlideSection {
  constructor() {
    super();
    this.init();
    this.mobile = this.dataset.mobile;
  }

  get dataImageZoom() {
    return this.hasAttribute("data-image-zoom")
      ? this.getAttribute("data-image-zoom")
      : "none";
  }

  get mediaPosition() {
    return this.hasAttribute("data-media-position")
      ? this.getAttribute("data-media-position")
      : "left";
  }

  get zoomPaneSide() {
    const isRTL = document.documentElement.dir === "rtl";
    return isRTL || this.mediaPosition === "right" ? "left" : "right";
  }

  getZoomImageSource(image) {
    if (!image) return "";

    const srcset = image.currentSrc || image.dataset.srcset || image.srcset;
    if (srcset) {
      const candidates = srcset
        .split(",")
        .map((candidate) => candidate.trim().split(/\s+/)[0])
        .filter(Boolean);

      if (candidates.length) {
        return candidates[candidates.length - 1];
      }
    }

    return image.currentSrc || image.src || "";
  }

  init() {
    if (
      this.querySelector(".product__media-gallery").classList.contains(
        "product-thumbnail",
      )
    ) {
      let thumbnail = this.initSlideMediaGallery("thumbnail");
      this.initSlideMediaGallery("main", thumbnail);
    }

    let inlinePane = 767;
    if (this.dataImageZoom == "zoom_inner") {
      inlinePane = 4800;
    }

    setTimeout(() => {
      if (window.innerWidth > 767) {
        this.querySelectorAll(".gallery_zoom_image").forEach(
          (element, index) => {
            const img = element.querySelector("img");
            let zoomImageSource = this.getZoomImageSource(img);

            try {
              const url = new URL(zoomImageSource);
              url.searchParams.delete("width");
              zoomImageSource = url.toString();
              if (!img || !zoomImageSource) {
                return;
              }

              element.setAttribute("data-zoom", zoomImageSource);

              if (element.dataset.driftBound === "true") {
                return;
              }

              element.dataset.driftBound = "true";

              new Drift(element, {
                paneContainer: document.body,
                inlinePane: inlinePane,
                containInline: true,
                zoomFactor: 2.5,
                zoomMode: this.dataImageZoom,
                zoomPaneSide: this.zoomPaneSide,
                sourceAttribute: "data-zoom",
                triggerImage: img,
              });
            } catch (e) {
              return;
            }
          },
        );
      }
    }, 500);
  }
}
if (!customElements.get("media-gallery")) {
  customElements.define("media-gallery", MediaGallery);
}

class GridGalleryThumbnail extends HTMLElement {
  constructor() {
    super();
    this.actionScroll = this.querySelectorAll(".action-grid-item");
    this.MediaGalleryThumbnailHtml = this.innerHTML;
  }

  connectedCallback() {
    this.actionScroll.forEach((action) => {
      action?.addEventListener("click", () => {
        this.setActive(action);
        this.scrollGallery(action);
      });

      action?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.setActive(action);
          this.scrollGallery(action);
        }
      });
    });
  }

  setActive(activeItem) {
    this.querySelectorAll(".action-grid-item").forEach((item) =>
      item.classList.remove("active"),
    );
    activeItem.classList.add("active");
  }

  scrollGallery(action) {
    if (window.innerWidth <= 767) return;

    const index = action.dataset.position;

    const gallery = this.closest("media-gallery");
    if (!gallery) return;

    const targetImage = gallery.querySelector(
      `grid-gallery .grid-item[data-position="${index}"]`,
    );

    targetImage?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  bindDesktopActions() {
    this.innerHTML = this.MediaGalleryThumbnailHtml;
    new LazyLoader(".image-lazy-load");
    this.querySelectorAll(".action-grid-item").forEach((action) => {
      action?.addEventListener("click", () => {
        this.setActive(action);
        this.scrollGallery(action);
      });

      action?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.setActive(action);
          this.scrollGallery(action);
        }
      });
    });
  }
}

if (!customElements.get("grid-gallery-thumbnail")) {
  customElements.define("grid-gallery-thumbnail", GridGalleryThumbnail);
}

class GridGallery extends MediaGallery {
  constructor() {
    super();
    this.MediaGalleryHtml = this.innerHTML;
    this.init();
  }

  init() {
    if (this.classList.contains("two-columns-carousel")) {
      if (this.MediaGalleryHtml) {
        this.initSlideColumnsGallery("gird");
      }
    } else {
      if (this.MediaGalleryHtml) {
        let width = window.innerWidth;
        window.addEventListener("resize", () => {
          const newWidth = window.innerWidth;
          if (newWidth <= 767 && width > 767) {
            this.actionOnMobile();
          }
          if (newWidth > 767 && width <= 767) {
            this.actionOutMobile();
          }
          width = newWidth;
        });
        if (width <= 767) {
          this.actionOnMobile();
        } else {
          this.actionOutMobile();
        }
      }
    }
  }

  initSlideColumnsGallery() {
    this.classList.add("swiper", "swiper-wrapper-main");
    const actions = this.querySelector(".swiper-actions").outerHTML;
    const pagination = this.querySelector(".swiper-pagination").outerHTML;
    const html = this.MediaGalleryHtml.replaceAll("grid-item", "swiper-slide")
      .replaceAll(actions, "")
      .replaceAll(pagination, "");
    const wrapper = `${actions}<div class='swiper-wrapper'>${html}</div>${pagination}`;
    this.innerHTML = wrapper;
    this.initSlideMediaGallery("columns");
    new LazyLoader(".image-lazy-load");
  }

  actionOnMobile() {
    this.classList.add("swiper", "swiper-wrapper-main");
    this.classList.remove("grid", "grid-cols", "stacked");
    const actions = this.querySelector(".swiper-actions").outerHTML;
    const pagination = this.querySelector(".swiper-pagination").outerHTML;
    const html = this.MediaGalleryHtml.replaceAll("grid-item", "swiper-slide")
      .replaceAll(actions, "")
      .replaceAll(pagination, "");
    const wrapper = `${actions}<div class='swiper-wrapper'>${html}</div>${pagination}`;
    this.innerHTML = wrapper;

    if (this.closest("media-gallery").querySelector("grid-gallery-thumbnail")) {
      let thumbnail = this.initSlideMediaGallery("thumbnail");
      this.initSlideMediaGallery("main", thumbnail);
    } else {
      this.initSlideMediaGallery("gird");
    }
    new LazyLoader(".image-lazy-load");
  }

  actionOutMobile() {
    this.classList.remove("swiper", "swiper-wrapper-main");
    if (this.classList.contains("grid-swiper-mobile")) {
      this.classList.add("grid", "grid-cols");
    } else {
      this.classList.add("stacked", "grid");
    }
    this.innerHTML = this.MediaGalleryHtml;
    const galleryThumbnail = this.closest("media-gallery").querySelector(
      "grid-gallery-thumbnail",
    );
    if (galleryThumbnail) {
      galleryThumbnail?.bindDesktopActions();
    }
    new LazyLoader(".image-lazy-load");
  }
}

if (!customElements.get("grid-gallery")) {
  customElements.define("grid-gallery", GridGallery);
}

class QuickViewGallery extends GridGallery {
  constructor() {
    super();
    this.MediaGalleryHtml = this.innerHTML;
    this.quickView = document.querySelector("quickview-drawer");
    this.slide = null;
    this.initQuickView();
  }

  initQuickView() {
    if (this.MediaGalleryHtml) {
      let width = window.innerWidth;
      window.addEventListener("resize", () => {
        const newWidth = window.innerWidth;
        if (newWidth <= 767 && width > 767) {
          eventModal(this.quickView, "close", false);
        }
        if (newWidth > 767 && width <= 767) {
          eventModal(this.quickView, "close", false);
        }
        width = newWidth;
      });
      if (width <= 767) {
        this.actionOnMobile();
      } else {
        this.actionOutMobile();
      }
    }
  }

  async actionOnMobile() {
    this.slide = this.initSlideMediaGallery("QuickView");
    this.style.maxHeight = "auto";
    this.style.minHeight = "auto";
  }

  async actionOutMobile() {
    this.slide = this.initSlideMediaGallery("QuickView");
    this.style.maxHeight =
      this.closest(".drawer__body").offsetHeight - 40 + "px";
    this.style.minHeight = "calc(100vh - 40px)";
  }
}

if (!customElements.get("quick-view-gallery")) {
  customElements.define("quick-view-gallery", QuickViewGallery);
}

class MediaZoomButton extends HTMLButtonElement {
  constructor() {
    super();
    this.init();
  }

  init() {
    this.addEventListener("click", this.onButtonClick);
  }

  get gallery() {
    return this.closest("media-gallery");
  }

  onButtonClick() {
    if (this.closest(".pswp__item")) {
      return;
    }
    let width = window.innerWidth;
    let returnFocus = true;
    if (width <= 767) {
      returnFocus = false;
    }

    const lightbox = new PhotoSwipeLightbox({
      bgOpacity: 1,
      pswpModule: () => import(importJs.pswpModule),
      allowPanToNext: false,
      allowMouseDrag: true,
      wheelToZoom: false,
      returnFocus: returnFocus,
      zoom: false,
      arrowPrev: false,
      arrowNext: false,
      close: false,
      loop: false,
    });
    lightbox.on("contentLoad", (event) => {
      const { content } = event;

      if (
        content.type === "video" ||
        content.type === "external_video" ||
        content.type === "model"
      ) {
        event.preventDefault();
        content.element = document.createElement("div");
        content.element.className = "pswp__video-container";
        content.element.appendChild(content.data.domElement.cloneNode(true));
      }
    });
    lightbox.on("uiRegister", () => {
      const { pswp } = lightbox;
      pswp?.ui.registerElement({
        name: "close-zoom",
        isButton: true,
        order: 2,
        tagName: "button",
        html: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" class="transition-short will-change heading-color"><use href="#icon-close"></use></svg>',
        onClick: () => {
          pswp.close();
        },
      });
      pswp?.ui.registerElement({
        name: "next",
        ariaLabel: "Next slide",
        order: 3,
        isButton: true,
        html: '<svg width="6" height="11" fill="none"><use href="#icon-next"></use></svg>',
        onClick: (event, el) => {
          if (
            pswp &&
            pswp.getNumItems() > 0 &&
            pswp.currIndex < pswp.getNumItems() - 1
          ) {
            pswp.next();
          }
        },
      });
      pswp?.ui.registerElement({
        name: "prev",
        ariaLabel: "Previous slide",
        order: 1,
        isButton: true,
        html: '<svg width="6" height="11" fill="none"><use href="#icon-back"></use></svg>',
        onClick: (event, el) => {
          if (pswp && pswp.getNumItems() > 0 && pswp.currIndex > 0) {
            pswp.prev();
          }
        },
      });
    });
    lightbox.on("afterInit", () => {
      const { pswp } = lightbox;
      if (!pswp) return;

      const updateButtons = () => {
        const nextBtn = pswp.element.querySelector('[data-element="next"]');
        const prevBtn = pswp.element.querySelector('[data-element="prev"]');
        if (nextBtn && prevBtn) {
          nextBtn.disabled = pswp.currIndex >= pswp.getNumItems() - 1;
          prevBtn.disabled = pswp.currIndex <= 0;
        }
      };
      pswp.on("change", updateButtons);
      updateButtons();
    });
    lightbox.init();

    const indexElements =
      this.closest(".media-gallery__image") ||
      this.closest(".media-gallery__local-video") ||
      this.closest(".media-gallery__external-video");
    const index = indexElements.getAttribute("data-position");
    const items = this.gallery.querySelectorAll("[media-gallery]");
    const itemsToShow = Array.from(items).filter(
      (element) => element.clientWidth > 0,
    );

    let dataSource = itemsToShow.map((media) => {
      const image = media.querySelector("img");
      if (media.getAttribute("media-gallery") === "image") {
        return {
          thumbnailElement: image,
          src: image.currentSrc || image.src,
          srcset: image.dataset.srcset ? image.dataset.srcset : image.srcset,
          width: parseInt(image.getAttribute("width")),
          height: parseInt(image.getAttribute("height")),
          alt: image.alt,
          mediaType: "image",
          thumbCropped: true,
        };
      }

      if (
        media.getAttribute("media-gallery") === "video" ||
        media.getAttribute("media-gallery") === "external_video" ||
        media.getAttribute("media-gallery") === "model"
      ) {
        const video =
          media.querySelector("video-product-gallery") ||
          media.querySelector("[media-model]") ||
          media;
        return {
          thumbnailElement: image,
          domElement: video,
          type: media.getAttribute("media-gallery"),
          src: image ? image.src : "",
          srcset: image ? image.srcset : "",
          msrc: image ? image.src : "",
          width: video ? parseInt(video.getAttribute("width")) : 800,
          height: video ? parseInt(video.getAttribute("height")) : 800,
          alt: image ? image.alt : "",
          mediaType: "external",
          thumbCropped: true,
        };
      }
    });
    lightbox.loadAndOpen(index - 1, dataSource);
    lightbox.on("pointerDown", (e) => {
      lightbox.pswp.currSlide.data.type == "model" && e.preventDefault();
    });
    lightbox.on("change", () => {
      NextSkyTheme.pauseAllMedia(lightbox.pswp.element);
    });
    NextSkyTheme.pauseAllMedia(this.closest("media-gallery"));
    new LazyLoader(".image-lazy-load");
  }
}
customElements.define("media-zoom-button", MediaZoomButton, {
  extends: "button",
});
CustomElement.observeAndPatchCustomElements({
  "media-zoom-button": {
    tagElement: "button",
    classElement: MediaZoomButton,
  },
});
