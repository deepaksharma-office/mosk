class StickyImageWithText extends HTMLElement {
  static get observedAttributes() {
    return ['data-change-image-on-scroll'];
  }

  attributeChangedCallback() {
    if (!this.isConnected || !this.media) return;
    cancelAnimationFrame(this.refreshFrame);
    this.refreshFrame = requestAnimationFrame(() => this.refreshScrollImages());
  }

  connectedCallback() {
    this.media = this.querySelector('.sticky-image-with-text__media');
    this.mediaCol = this.querySelector('.sticky-image-with-text__media-col');
    if (!this.media || !this.mediaCol) return;

    this.updateStickyPosition = this.updateStickyPosition.bind(this);
    this.updateStickyPosition();

    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(this.updateStickyPosition);
      this.resizeObserver.observe(this.media);
    }

    window.addEventListener('resize', this.updateStickyPosition, { passive: true });
    window.addEventListener('load', this.updateStickyPosition, { once: true });

    this.setupScrollImages();
    this.observeDom();
  }

  observeDom() {
    if (!('MutationObserver' in window)) return;

    this.domObserver?.disconnect();
    this.domObserver = new MutationObserver((records) => {
      if (records.some((record) => record.type === 'childList')) this.pendingStructuralChange = true;
      cancelAnimationFrame(this.syncFrame);
      this.syncFrame = requestAnimationFrame(() => {
        const structural = this.pendingStructuralChange;
        this.pendingStructuralChange = false;
        this.syncDom(structural);
      });
    });
    this.domObserver.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style'],
    });
  }

  syncDom(structural) {
    const media = this.querySelector('.sticky-image-with-text__media');
    const mediaCol = this.querySelector('.sticky-image-with-text__media-col');
    if (!media || !mediaCol) return;

    if (media !== this.media) {
      this.media = media;
      this.mediaCol = mediaCol;
      this.resizeObserver?.disconnect();
      this.resizeObserver?.observe(media);
      this.updateStickyPosition();
      structural = true;
    }

    if (!this.hasAttribute('data-change-image-on-scroll')) return;

    if (!this.scrollImagesActive) {
      this.refreshScrollImages();
      return;
    }

    this.syncAdaptRatio();

    if (structural && this.needsSlideRebuild()) {
      const activeId = this.activeSlide?.dataset.slideId;
      this.defaultRatio = undefined;
      this.buildSlides();
      this.applyScrollImages(activeId);
    }
  }

  needsSlideRebuild() {
    const templates = this.getSlideTemplates();
    const allSlides = Array.from(this.media.querySelectorAll('[data-slide-id]'));
    const generated = allSlides.filter((slide) => slide.dataset.slideId !== 'default');

    if (generated.length !== templates.length) return true;
    if (this.getSlideSignature() !== this.slideSignature) return true;
    if (allSlides.length !== this.allSlides.length) return true;
    if (allSlides.some((slide, index) => slide !== this.allSlides[index])) return true;

    const triggers = this.querySelectorAll('[data-scroll-image-id]');
    if (triggers.length !== this.triggers.length) return true;
    return this.triggers.some((trigger) => !trigger.isConnected);
  }

  refreshScrollImages() {
    this.teardownScrollImages();
    this.media = this.querySelector('.sticky-image-with-text__media') || this.media;
    this.setupScrollImages();
  }

  teardownScrollImages() {
    this.scrollImagesActive = false;
    this.scrollImageObserver?.disconnect();
    this.scrollImageObserver = null;
    this.detachSwiper();
    this.removeEventListener('shopify:block:select', this.handleBlockSelect);
    this.media
      ?.querySelectorAll('[data-slide-id]:not([data-slide-id="default"])')
      .forEach((slide) => slide.remove());
    this.allSlides = [];
    this.slides = [];
    this.triggers = [];
    this.activeSlide = null;
    this.defaultRatio = undefined;
  }

  setupScrollImages() {
    if (!this.hasAttribute('data-change-image-on-scroll') || !('IntersectionObserver' in window)) return;

    if (!this.scrollImageBound) {
      this.scrollImageBound = true;
      this.handleBlockSelect = this.handleBlockSelect.bind(this);
      this.handleSwiperSlideChange = this.handleSwiperSlideChange.bind(this);
    }
    this.scrollImagesActive = true;
    this.addEventListener('shopify:block:select', this.handleBlockSelect);

    this.buildSlides();
    this.applyScrollImages(this.slides[0]?.dataset.slideId);
  }

  getSlideTemplates() {
    return Array.from(this.querySelectorAll('template[data-scroll-slide-template]'));
  }

  getSlideSignature() {
    return this.getSlideTemplates()
      .map((template) => template.innerHTML)
      .join('');
  }

  buildSlides() {
    this.media
      .querySelectorAll('[data-slide-id]:not([data-slide-id="default"])')
      .forEach((slide) => slide.remove());
    this.getSlideTemplates().forEach((template) => {
      const fragment = template.content.cloneNode(true);
      this.loadSlideImages(fragment);
      this.media.appendChild(fragment);
    });
    this.slideSignature = this.getSlideSignature();
    this.syncAdaptRatio();
    this.allSlides = Array.from(this.media.querySelectorAll('[data-slide-id]'));
    const blockSlides = this.allSlides.filter((slide) => slide.dataset.slideId !== 'default');
    this.slides = blockSlides.length ? blockSlides : this.allSlides;
    this.triggers = Array.from(this.querySelectorAll('[data-scroll-image-id]'));
    this.activeSlide = null;
  }

  loadSlideImages(root) {
    root.querySelectorAll('source[data-srcset]').forEach((source) => {
      source.setAttribute('srcset', source.dataset.srcset);
      source.removeAttribute('data-srcset');
    });
    root.querySelectorAll('img[data-srcset]').forEach((img) => {
      img.setAttribute('srcset', img.dataset.srcset);
      img.removeAttribute('data-srcset');
      img.classList.remove('image-lazy-load');
      img.classList.add('lazy-loaded');
    });
  }

  syncAdaptRatio() {
    if (!this.hasAttribute('data-ratio-adapt')) return;
    if (this.defaultRatio === undefined) {
      this.defaultRatio = this.media.style.getPropertyValue('--aspect-ratio');
    }
    const firstBlockSlide = this.media.querySelector('[data-slide-id]:not([data-slide-id="default"])');
    const ratio = String(firstBlockSlide?.dataset.aspectRatio || this.defaultRatio).trim();
    if (this.media.style.getPropertyValue('--aspect-ratio').trim() !== ratio) {
      this.media.style.setProperty('--aspect-ratio', ratio);
    }
  }

  getMobileSwiper() {
    const swiper = this.querySelector('carousel-mobile.swiper')?.swiper;
    return swiper && !swiper.destroyed ? swiper : null;
  }

  detachSwiper() {
    this.mobileSwiper?.off('slideChange', this.handleSwiperSlideChange);
    this.mobileSwiper = null;
  }

  handleSwiperSlideChange() {
    const slide = this.mobileSwiper?.slides[this.mobileSwiper.activeIndex];
    const trigger = slide?.querySelector('[data-scroll-image-id]');
    if (trigger) this.showSlide(trigger.dataset.scrollImageId);
  }

  applyScrollImages(initialId) {
    this.scrollImageObserver?.disconnect();
    this.scrollImageObserver = null;
    this.detachSwiper();
    this.showSlide(initialId);
    if (this.slides.length < 2) return;

    const swiper = this.getMobileSwiper();
    if (swiper) {
      this.mobileSwiper = swiper;
      swiper.on('slideChange', this.handleSwiperSlideChange);
      this.handleSwiperSlideChange();
      return;
    }

    const callback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) this.showSlide(entry.target.dataset.scrollImageId);
      });
    };
    const options = { rootMargin: '-50% 0px -50% 0px', threshold: 0 };

    try {
      this.scrollImageObserver = new IntersectionObserver(callback, { ...options, root: document });
    } catch (error) {
      this.scrollImageObserver = new IntersectionObserver(callback, options);
    }
    this.triggers.forEach((trigger) => this.scrollImageObserver.observe(trigger));
  }

  handleBlockSelect(event) {
    const trigger = event.target.querySelector('[data-scroll-image-id]');
    if (trigger) this.showSlide(trigger.dataset.scrollImageId);
  }

  showSlide(id) {
    const target = this.slides.find((slide) => slide.dataset.slideId === id) || this.activeSlide || this.slides[0];
    if (!target || target === this.activeSlide) return;
    this.activeSlide = target;

    this.allSlides.forEach((slide) => {
      const isActive = slide === target;
      slide.classList.toggle('opacity-1', isActive);
      slide.classList.toggle('opacity-0', !isActive);
      if (isActive) {
        slide.removeAttribute('aria-hidden');
      } else {
        slide.setAttribute('aria-hidden', 'true');
      }
    });
  }

  updateStickyPosition() {
    const mediaHeight = this.media?.getBoundingClientRect().height || 0;
    if (mediaHeight <= 0) return;

    this.style.setProperty('--sticky-media-height', `${mediaHeight}px`);

    const topOffset = Math.max(0, (window.innerHeight - mediaHeight) / 2);
    this.mediaCol.style.setProperty('--top-custom', `${Math.round(topOffset)}px`);
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    this.scrollImageObserver?.disconnect();
    this.domObserver?.disconnect();
    cancelAnimationFrame(this.syncFrame);
    cancelAnimationFrame(this.refreshFrame);
    this.detachSwiper();
    this.removeEventListener('shopify:block:select', this.handleBlockSelect);
    window.removeEventListener('resize', this.updateStickyPosition);
  }
}

if (!customElements.get('sticky-image-with-text')) {
  customElements.define('sticky-image-with-text', StickyImageWithText);
}
