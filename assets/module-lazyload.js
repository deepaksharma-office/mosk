import { initSlide } from "@NextSkyTheme/slide";
import * as NextSkyTheme from "@NextSkyTheme/global";

export function isSlowConnection() {
  try {
    const conn =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;
    if (!conn) return false;
    if (conn.saveData) return true;

    const type = conn.effectiveType;
    // Wi-Fi often still reports effectiveType "4g"; use throughput/latency too.
    if (type === "slow-2g" || type === "2g" || type === "3g") return true;
    if (typeof conn.downlink === "number" && conn.downlink > 0 && conn.downlink < 1.5) {
      return true;
    }
    if (typeof conn.rtt === "number" && conn.rtt >= 300) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function getVideoPosterImages(host) {
  if (!host) return [];
  return Array.from(host.querySelectorAll(".video-thumbnail img"));
}

function ensureImageRequestStarted(img) {
  if (!img) return;
  const picture = img.closest("picture");
  if (picture) {
    const source = picture.querySelector("source");
    const sourceSrcset = source?.dataset?.srcset;
    if (source && sourceSrcset) {
      source.setAttribute("srcset", sourceSrcset);
      source.removeAttribute("data-srcset");
    }
  }
  const imgSrcset = img.dataset?.srcset;
  if (imgSrcset && !img.getAttribute("srcset")) {
    img.setAttribute("srcset", imgSrcset);
    img.removeAttribute("data-srcset");
    img.classList.remove("image-lazy-load");
    img.classList.add("lazy-loaded");
    const motionEffect = img.closest("motion-effect");
    if (motionEffect) {
      motionEffect.classList.remove("loading");
      motionEffect.classList.add("loaded");
    }
  }
  if (img.loading === "lazy" && !img.offsetParent) img.loading = "eager";
}

export function whenImagesReady(images, timeout = 10000) {
  const list = Array.from(images || []).filter(Boolean);
  if (!list.length) return Promise.resolve();
  return Promise.all(
    list.map((img) => {
      ensureImageRequestStarted(img);
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise((resolve) => {
        const done = () => resolve();
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
        setTimeout(done, timeout);
      });
    }),
  );
}

/** Finish poster images before video bytes are requested (helps slow Wi-Fi too). */
export async function waitForVideoPosters(host) {
  await whenImagesReady(getVideoPosterImages(host));
}

// Avoid competing with LCP: only boost image priority after the first screen.
let allowHighFetchPriority = false;
let firstScreenScrollBound = false;

function bindFirstScreenScrollWatcher() {
  if (firstScreenScrollBound || allowHighFetchPriority) return;
  firstScreenScrollBound = true;
  const onScroll = () => {
    if (window.scrollY >= window.innerHeight) {
      allowHighFetchPriority = true;
      window.removeEventListener("scroll", onScroll);
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

export class LazyLoadEventHover {
  constructor(e) {
    (this.triggerEventsJs = e),
      (this.eventOptionsJs = { passive: !0 }),
      (this.userEventListenerJs = this.triggerListenerJs.bind(this)),
      (this.delayedScriptsJs = { normal: [], async: [], defer: [] });
  }
  triggerListenerJs() {
    const scrollTop =
      document.documentElement.scrollTop || document.body.scrollTop;
    const isTouch = matchMedia("(any-pointer:coarse)").matches;
    if (isTouch) {
      if (scrollTop > 10) {
        this._removeUserInteractionListenerJs(this),
          "loading" === document.readyState
            ? document.addEventListener(
                "DOMContentLoaded",
                this._loadEverythingReadyNow.bind(this)
              )
            : this._loadEverythingReadyNow();
      } else {
        this._removeUserInteractionListenerJs(this);
        const e = new LazyLoadEventHover(["scroll", "pageshow"]);
        e._addUserInteractionListenerJs(e);
      }
    } else {
      this._removeUserInteractionListenerJs(this),
        "loading" === document.readyState
          ? document.addEventListener(
              "DOMContentLoaded",
              this._loadEverythingReadyNow.bind(this)
            )
          : this._loadEverythingReadyNow();
    }
  }
  _removeUserInteractionListenerJs(e) {
    this.triggerEventsJs.forEach((t) =>
      window.removeEventListener(t, e.userEventListenerJs, e.eventOptionsJs)
    );
  }
  _addUserInteractionListenerJs(e) {
    const isTouch = matchMedia("(any-pointer:coarse)").matches;
    const scrollTop =
      document.documentElement.scrollTop || document.body.scrollTop;
    this.triggerEventsJs.forEach((t) => {
      if (!isTouch) {
        if (t === "scroll" || t === "pageshow") {
          if (scrollTop <= 10) {
            return;
          }
        }
      }
      window.addEventListener(t, e.userEventListenerJs, e.eventOptionsJs);
    });
  }
  async _preloadAllScriptsJs() {
    await this.initLazyDomHtml();
    await this.initLazyLoadJs();
    await this.initLazyLoadImage();
    await this.initLazySlideSection();
    await this.initLazyTemplateModal();
  }

  initLazyDomHtml() {
    const elements = document.querySelectorAll(".element-tabs__content");
    elements.forEach((entry) => {
      const element = entry;
      const templates = element.querySelectorAll("template.tabs__content");
      templates.forEach((template) => {
        const content = document.createElement("div");
        content.appendChild(template.content.firstElementChild.cloneNode(true));
        element.appendChild(
          content.querySelector(".product-tabs__content-item")
        );
        template.remove();
      });
    });
  }

  initLazyLoadJs() {
    import(importJs.newsletterPopup);
    import(importJs.featuredProductBanner);
    import(importJs.productTabs);
    import(importJs.suitableProductsFinder);
    import(importJs.shopableVideo);
    import(importJs.compactProductBundle);
    import(importJs.testimonials);
  }

  initLazyLoadImage() {
    import(importJs.newsletterPopup);
    // On slow networks, keep viewport-based LazyLoader only so images
    // are not queued behind streaming videos in DOM order.
    if (isSlowConnection()) return;
    const lazyImage = document.querySelectorAll(".image-lazy-load");
    lazyImage.forEach((entry) => {
      const imgElement = entry;
      const pictureElement = imgElement.closest("picture");
      if (pictureElement) {
        const sourceElement = pictureElement.querySelector("source");
        const imgSourceSrcset = sourceElement.dataset.srcset;
        if (imgSourceSrcset) {
          sourceElement.setAttribute("srcset", imgSourceSrcset);
          sourceElement.removeAttribute("data-srcset");
        }
      }
      const imgSrcset = imgElement.dataset.srcset;
      const motionEffect = imgElement.closest("motion-effect");
      if (imgSrcset) {
        imgElement.setAttribute("srcset", imgSrcset);
        imgElement.removeAttribute("data-srcset");
        imgElement.classList.add("lazy-loaded");
        if (motionEffect) {
          motionEffect.classList.remove("loading");
          motionEffect.classList.add("loaded");
        }
      }
    });
  }

  initLazySlideSection() {
    const loadingSwiper = document.querySelectorAll(
      ".lazy-loading-swiper-after"
    );
    loadingSwiper.forEach((el) => {
      el.classList.remove("lazy-loading-swiper-after");
      initSlide(el);
    });
  }

  initLazyTemplateModal() {
    const templateModal = document.querySelectorAll(".lazy-template-modal");
    templateModal.forEach((el) => {
      const content = document.createElement("div");
      content.appendChild(el.content.firstElementChild.cloneNode(true));
      el.closest(".shopify-section").appendChild(
        content.querySelector(".content-element")
      );
      el.remove();
    });
  }

  async _loadEverythingReadyNow() {
    this._preloadAllScriptsJs(),
      await this._loadScriptsFromListJs(this.delayedScriptsJs.normal),
      await this._loadScriptsFromListJs(this.delayedScriptsJs.defer),
      await this._loadScriptsFromListJs(this.delayedScriptsJs.async),
      await this._triggerDOMContentLoadedJs(),
      await this._triggerWindowLoadJs(),
      window.dispatchEvent(new Event("nextskyspeed-allScriptsLoaded"));
  }
  async _loadScriptsFromListJs(e) {
    const t = e.shift();
    return t
      ? (await this._transformScript(t), this._loadScriptsFromListJs(e))
      : Promise.resolve();
  }
  async _transformScript(e) {
    return (
      await this._requestAnimFrame(),
      new Promise((t) => {
        const s = document.createElement("script");
        let n;
        [...e.attributes].forEach((e) => {
          let t = e.nodeName;
          "type" !== t &&
            ("data-nextskylazy-type" === t && ((t = "type"), (n = e.nodeValue)),
            s.setAttribute(t, e.nodeValue));
        }),
          e.hasAttribute("src")
            ? (s.addEventListener("load", t), s.addEventListener("error", t))
            : ((s.text = e.text), t()),
          e.parentNode.replaceChild(s, e);
      })
    );
  }
  async _triggerDOMContentLoadedJs() {
    (this.domReadyFired = !0),
      await this._requestAnimFrame(),
      document.dispatchEvent(new Event("nextskyspeed-DOMContentLoaded")),
      await this._requestAnimFrame(),
      window.dispatchEvent(new Event("nextskyspeed-DOMContentLoaded")),
      await this._requestAnimFrame(),
      document.dispatchEvent(new Event("nextskyspeed-readystatechange")),
      await this._requestAnimFrame(),
      document.nextskyonreadystatechange &&
        document.nextskyonreadystatechange();
  }
  async _triggerWindowLoadJs() {
    await this._requestAnimFrame(),
      window.dispatchEvent(new Event("nextskyspeed-load")),
      await this._requestAnimFrame(),
      window.nextskyonload && window.nextskyonload(),
      await this._requestAnimFrame(),
      window.dispatchEvent(new Event("nextskyspeed-pageshow")),
      await this._requestAnimFrame(),
      window.nextskyonpageshow && window.nextskyonpageshow();
  }
  async _requestAnimFrame() {
    return new Promise((e) => requestAnimationFrame(e));
  }
  static run() {
    const isTouch = matchMedia("(any-pointer:coarse)").matches;
    const events = isTouch
      ? ["scroll", "pageshow"]
      : [
          "pageshow",
          "scroll",
          "keydown",
          "mousemove",
          "touchmove",
          "touchstart",
          "touchend",
          "wheel",
        ];
    const e = new LazyLoadEventHover(events);
    if (window.Shopify?.designMode) {
      e._loadEverythingReadyNow();
      return;
    }
    e._addUserInteractionListenerJs(e);
  }
}
export class LazyLoader {
  constructor(selector, rootMargin = "200px") {
    this.lazyImages = document.querySelectorAll(selector);
    this.rootMargin = rootMargin;
    this.observer = null;
    bindFirstScreenScrollWatcher();
    this.init();
  }

  init() {
    this.createObserver();
    this.observeImages();
  }

  createObserver() {
    const isTouch = matchMedia("(any-pointer:coarse)").matches;
    if (isTouch) {
      this.rootMargin = "50px";
    }
    this.observer = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const imgElement = entry.target;
            const pictureElement = imgElement.closest("picture");
            if (pictureElement) {
              const sourceElement = pictureElement.querySelector("source");
              const imgSourceSrcset = sourceElement.dataset.srcset;
              if (imgSourceSrcset) {
                sourceElement.setAttribute("srcset", imgSourceSrcset);
                sourceElement.removeAttribute("data-srcset");
              }
            }
            const imgSrcset = imgElement.dataset.srcset;
            const parentElement = imgElement.closest("motion-effect");
            if (imgSrcset) {
              imgElement.setAttribute("srcset", imgSrcset);
              imgElement.removeAttribute("data-srcset");
              if (
                allowHighFetchPriority &&
                !imgElement.hasAttribute("fetchpriority")
              ) {
                imgElement.setAttribute("fetchpriority", "high");
              }
              imgElement.classList.remove("image-lazy-load");
              imgElement.classList.add("lazy-loaded");
              if (parentElement) {
                parentElement.classList.remove("loading");
                parentElement.classList.add("loaded");
              }
            }
            observer.unobserve(imgElement);
          }
        });
      },
      {
        rootMargin: this.rootMargin,
      }
    );
  }

  observeImages() {
    this.lazyImages.forEach((imgElement) => {
      this.observer.observe(imgElement);
    });
  }
}

export function loadImages(imageOrArray) {
  if (!imageOrArray) {
    return Promise.resolve();
  }
  const images =
    imageOrArray instanceof Element ? [imageOrArray] : Array.from(imageOrArray);
  if (images.length > 1) {
    return Promise.resolve();
  }
  return Promise.all(
    images.map((image) => {
      return new Promise((resolve) => {
        if (
          (image.tagName === "IMG" && image.complete) ||
          !image.offsetParent
        ) {
          resolve();
        } else {
          image.onload = () => {
            resolve();
          };
        }
      });
    })
  );
}
