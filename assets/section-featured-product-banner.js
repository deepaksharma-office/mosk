import * as NextSkyTheme from "@NextSkyTheme/global";

if (!customElements.get("content-effect")) {
  customElements.define(
    "content-effect",
    class ContentEffect extends HTMLElement {
      constructor() {
        super();
        this.infoElements = this.querySelectorAll(".block__information_text");
        this.initialized = false;
        this.isVisible = false;
      }

      connectedCallback() {
        const mediaQuery = window.matchMedia("(max-width: 1024.98px)");
        const handleMediaQueryChange = NextSkyTheme.throttle((mediaQuery) => {
          if (mediaQuery.matches) {
            this.initializeMobile();
          } else {
            if (document.readyState === "loading") {
              document.addEventListener("DOMContentLoaded", () =>
                this.initialize(),
              );
            } else {
              this.initialize();
            }
          }
        }, 100);

        handleMediaQueryChange(mediaQuery);
        mediaQuery.addEventListener("change", () =>
          handleMediaQueryChange(mediaQuery),
        );
      }

      initialize() {
        if (this.initialized) return;
        if (this.infoElements.length === 0) return;

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          this.initializeMobile();
          this.initialized = true;
          return;
        }

        this.setupInitialStates();
        this.setupScrollObserver();
        this.initialized = true;
      }

      initializeMobile() {
        if (this.infoElements.length === 0) return;
        this.infoElements.forEach((element) => {
          element.style.opacity = "1";
          element.style.transform = "unset";
        });
      }

      setupInitialStates() {
        this.infoElements.forEach((element) => {
          element.style.opacity = "0";
          if (typeof Motion === "undefined") {
            element.style.transition =
              "opacity 0.8s ease-out, transform 0.8s cubic-bezier(0.17, 0.67, 0.3, 1.33)";
          }
        });
      }

      setupScrollObserver() {
        const options = {
          root: null,
          rootMargin: "0px",
          threshold: 0.2,
        };

        const observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !this.isVisible) {
              this.isVisible = true;
              this.playEntranceAnimation();
            }
          });
        }, options);
        this.observer = observer;
        observer.observe(this);
      }

      playEntranceAnimation() {
        this.infoElements.forEach((element, index) => {
          const pairIndex = Math.floor(index / 2);
          const delay = pairIndex * 0.1;

          const isRTL = document.documentElement.dir === "rtl";
          const isEven = index % 2 === 0;
          const startX = isEven ? (isRTL ? 40 : -40) : isRTL ? -40 : 40;

          Motion.animate(
            element,
            {
              opacity: [0, 1],
              x: [0, startX],
            },
            {
              delay: delay,
              duration: 0.5,
              easing: [0, 0, 0.3, 1],
              onComplete: () => {
                element.style.opacity = "1";
                element.style.transform = "translateX(0)";
              },
            },
          );
        });
      }

      disconnectedCallback() {
        if (this.observer) {
          this.observer.disconnect();
          this.observer = null;
        }
      }
    },
  );
}