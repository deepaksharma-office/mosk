import { initSlide, SlideSection } from "@NextSkyTheme/slide";

class TestimonialsSlide extends SlideSection {
  thumbActiveClass = "swiper-slide-thumb-active";

  init() {
    this.swiper = initSlide(this);
    requestAnimationFrame(() => this.initThumb());
  }

  initThumb() {
    if (this.thumbsSwiper) return;

    const sectionId = this.dataset.sectionId;
    const thumbsContainer = document.querySelector(
      `#testimonials-thumb-swiper-${sectionId}`
    );
    const itemDesktop = thumbsContainer?.dataset.desktop
      ? thumbsContainer.dataset.desktop
      : 4;
    const itemTablet = thumbsContainer?.dataset.tablet
      ? thumbsContainer.dataset.tablet
      : "";

    if (!thumbsContainer || !this.swiper) return;

    this.thumbsSwiper = new Swiper(thumbsContainer, {
      slidesPerView: 1,
      spaceBetween: 60,
      watchSlidesProgress: true,
      grabCursor: true,
      loop: false,
      allowTouchMove: false,
      breakpoints: {
        768: {
          slidesPerView: itemTablet,
        },
        1025: {
          slidesPerView: itemDesktop,
        },
      },
      on: {
        init: (swiper) => {
          swiper.slides.forEach((slide) => {
            slide.setAttribute("tabindex", "0");
          });
          this.updateThumbActiveState(this.swiper.activeIndex);
        },
      },
    });

    this.bindThumbClicks(thumbsContainer);
    this.syncThumbsFromMain();
    this.setupNavigation();
    this.addKeyboardNavigationToSlides();
  }

  getThumbIndex(slide) {
    if (!slide || !this.thumbsSwiper) return -1;

    if (slide.dataset.swiperSlideIndex != null) {
      return parseInt(slide.dataset.swiperSlideIndex, 10);
    }

    return this.thumbsSwiper.slides.indexOf(slide);
  }

  goToSlide(index) {
    if (index < 0 || !this.swiper || !this.thumbsSwiper) return;

    this.swiper.slideTo(index);
    this.thumbsSwiper.slideTo(index);
    this.updateThumbActiveState(index);
  }

  updateThumbActiveState(index) {
    if (!this.thumbsSwiper) return;

    const activeIndex =
      index ?? this.swiper?.realIndex ?? this.swiper?.activeIndex ?? 0;

    this.thumbsSwiper.slides.forEach((slide, i) => {
      slide.classList.toggle(this.thumbActiveClass, i === activeIndex);
    });
  }

  bindThumbClicks(thumbsContainer) {
    thumbsContainer.addEventListener("click", (event) => {
      const slide = event.target.closest(".swiper-slide");
      if (!slide || !thumbsContainer.contains(slide)) return;

      const index = this.getThumbIndex(slide);
      if (index < 0) return;

      event.preventDefault();
      this.goToSlide(index);
    });
  }

  syncThumbsFromMain() {
    this.swiper.on("slideChange", () => {
      const index = this.swiper.realIndex;
      this.thumbsSwiper.slideTo(index);
      this.updateThumbActiveState(index);
    });
    this.updateThumbActiveState(this.swiper.activeIndex);
  }

  setupNavigation() {
    const section = this.closest(".section-testimonials");
    if (!section) return;

    const nextEl = section.querySelector(
      ".testimonial-swiper-action .swiper-button-next"
    );
    const prevEl = section.querySelector(
      ".testimonial-swiper-action .swiper-button-prev"
    );

    if (nextEl) {
      nextEl.setAttribute("tabindex", "0");
      this.swiper.navigation.nextEl = nextEl;
      nextEl.addEventListener("click", (e) => {
        e.preventDefault();
        this.swiper.slideNext();
      });
      nextEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.swiper.slideNext();
        }
      });
    }

    if (prevEl) {
      prevEl.setAttribute("tabindex", "0");
      this.swiper.navigation.prevEl = prevEl;
      prevEl.addEventListener("click", (e) => {
        e.preventDefault();
        this.swiper.slidePrev();
      });
      prevEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.swiper.slidePrev();
        }
      });
    }
  }

  addKeyboardNavigationToSlides() {
    if (!this.thumbsSwiper) return;

    this.thumbsSwiper.slides.forEach((slide) => {
      slide.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const index = this.getThumbIndex(slide);
          if (index >= 0) this.goToSlide(index);
        }
      });
    });
  }
}

customElements.define("testimonial-slide", TestimonialsSlide);
