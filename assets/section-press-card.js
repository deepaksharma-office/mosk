function getPressCardCreativeEffect(isRTL = false) {
  return {
    perspective: true,
    limitProgress: 2,
    shadowPerProgress: true,
    prev: {
      shadow: true,
      translate: [isRTL ? "120%" : "-120%", 0, 100],
      opacity: 0,
    },
    next: {
      translate: [0, 24, -12],
      scale: 0.92,
    },
  };
}

class SlideWithMedia extends HTMLElement {
  constructor() {
    super();
    this.initSwiper();
  }

  initSwiper() {
    const _this = this;
    const isRTL = document.documentElement.dir === "rtl";
    this.swiper = new Swiper(_this, {
      slidesPerView: 1,
      effect: "creative",
      creativeEffect: getPressCardCreativeEffect(isRTL),
      grabCursor: true,
      speed: 500,
      allowTouchMove: true,
      touchRatio: 1,
      threshold: 5,
      followFinger: true,
      resistance: true,
      resistanceRatio: 0.85,
      on: {
        init: function () {
          setTimeout(() => {
            this.el.classList.add("swiper-ready");
          }, 50);
        },
        slideChange: function () {
          const pressCardSection = _this.closest(".section-press-card");
          if (pressCardSection) {
            const slideContent = pressCardSection.querySelector(
              ".slide-press-content"
            );

            if (slideContent && slideContent.swiper) {
              slideContent.swiper.slideTo(this.activeIndex);
            }
          }
        },
      },
    });
  }
}

customElements.define("slide-with-media", SlideWithMedia);
