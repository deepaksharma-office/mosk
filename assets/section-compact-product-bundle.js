import * as NextSkyTheme from "@NextSkyTheme/global";
import { LazyLoader } from "@NextSkyTheme/lazy-load";
import { eventModal } from "@NextSkyTheme/modal";

if (!customElements.get("bundle-products")) {
  customElements.define(
    "bundle-products",
    class BundleProducts extends HTMLElement {
      constructor() {
        super();
        this.isActive = false;
        this.isAnimating = false;
        this.openedByKeyboard = false;
        this.dot = this.querySelectorAll(".bundle-products-hotspot");
        this.item = this.querySelectorAll("bundle-item");
        this.carouselMobile = this.querySelector("carousel-mobile")
          ? this.querySelector("carousel-mobile")
          : this.querySelector("slide-section");
        this.hoverTimeout = null;
        this.currentAnimation = null;
        this.activeTooltip = null;

        if (this.dot.length < 1) return;
        this.initEventListeners();

        const _this = this;
        window.addEventListener("resize", function () {
          _this.handleResponsiveState();
          setTimeout(() => {
            _this.refreshEventListeners();
          }, 100);
        });
        this.initializeMobileDefault();
      }

      initializeMobileDefault() {
        if (window.innerWidth <= 1024.98 && this.dot.length > 0) {
          const firstDot = this.dot[0];
          const firstPosition = firstDot.closest(".bundle-products-link")
            .dataset.productPosition;
          this.removeActive();
          const firstItem = this.querySelector(
            `bundle-item[data-product-position="${firstPosition}"]`,
          );
          if (firstItem) {
            firstDot.closest(".bundle-products-link").classList.add("active");
            firstItem.classList.add("active");
            this.classList.add("is-hover");

            if (this.carouselMobile.swiper && firstPosition) {
              const allItems = this.querySelectorAll("bundle-item");
              const itemIndex = Array.from(allItems).indexOf(firstItem);
              this.slideToItem(itemIndex);
            }
          }
        }
      }

      handleResponsiveState() {
        if (window.innerWidth <= 1024) {
          this.initializeMobileDefault();
        } else {
          this.removeActive();
        }
      }

      onMouseoverPopup(e) {
        const _this = this;
        if (window.innerWidth > 1024) {
          if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
          }

          this.hoverTimeout = setTimeout(() => {
            const target = e.currentTarget || e.target;

            const link = target.closest(".bundle-products-link");

            if (!link) return;

            const position = link.dataset.productPosition;

            if (!position) return;

            this.removeActive();
            const bundleItem = this.querySelector(
              `bundle-item[data-product-position="${position}"]`,
            );

            if (bundleItem) {
              if (this.carouselMobile && this.carouselMobile.swiper) {
                const allItems = this.querySelectorAll("bundle-item");
                const itemIndex = Array.from(allItems).indexOf(bundleItem);
                this.slideToItem(itemIndex);
              }
              bundleItem.classList.add("active");
              this.classList.add("is-hover");
              link.classList.add("active");
              _this.showProductInfo(link);
            }
          }, 50);
        }
      }

      onMouseoverItem(e) {
        const _this = this;
        if (window.innerWidth > 1024) {
          if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
          }

          this.hoverTimeout = setTimeout(() => {
            const target = e.currentTarget || e.target;
            const bundleItem = target.closest("bundle-item");

            if (!bundleItem) return;

            const position = bundleItem.dataset.productPosition;

            if (!position) return;

            this.removeActive();
            const link = this.querySelector(
              `.bundle-products-link[data-product-position="${position}"]`,
            );

            if (link) {
              link.classList.add("active");
              this.classList.add("is-hover");
              bundleItem.classList.add("active");
              _this.showProductInfo(link);
            }
          }, 50);
        }
      }

      onMouseout() {
        if (window.innerWidth > 1024) {
          if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
            this.hoverTimeout = null;
          }
          this.removeActive();
        }
      }

      removeActive() {
        if (this.dot.length < 1) return;
        this.dot.forEach((e) => {
          if (!e.closest(".bundle-products-link")) return;
          e.closest(".bundle-products-link").classList.remove("active");
        });
        this.item.forEach((e) => {
          e.classList.remove("active");
        });
        this.classList.remove("is-hover");
        this.hideProductInfo();
      }

      onClickDot(e) {
        if (window.innerWidth <= 1024) {
          const target = e.currentTarget;
          const link = target.closest(".bundle-products-link");
          if (!link) return;

          const position = link.dataset.productPosition;
          if (!position) return;

          this.removeActive();
          const bundleItem = this.querySelector(
            `bundle-item[data-product-position="${position}"]`,
          );

          if (bundleItem) {
            bundleItem.classList.add("active");
            this.classList.add("is-hover");
            link.classList.add("active");

            if (this.carouselMobile) {
              const allItems = this.querySelectorAll("bundle-item");
              const itemIndex = Array.from(allItems).indexOf(bundleItem);
              this.slideToItem(itemIndex);
            }
          }
        } else {
          this.showQuickView(e);
        }
      }

      slideToItem(index) {
        if (this.carouselMobile) {
          if (typeof this.carouselMobile.swiper.slideTo === "function") {
            this.carouselMobile.swiper.slideTo(index);
          } else {
            const slideEvent = new CustomEvent("slideTo", {
              detail: { index: index },
            });
            this.carouselMobile.dispatchEvent(slideEvent);
          }
        }
      }

      onSlideChange() {
        if (window.innerWidth <= 1024) {
          const currentIndex = this.carouselMobile.swiper.activeIndex;
          const allItems = this.querySelectorAll("bundle-item");

          if (allItems[currentIndex]) {
            const position = allItems[currentIndex].dataset.productPosition;
            this.removeActive();

            const correspondingDot = this.querySelector(
              `.bundle-products-link[data-product-position="${position}"]`,
            );
            const correspondingItem = this.querySelector(
              `bundle-item[data-product-position="${position}"]`,
            );

            if (correspondingDot && correspondingItem) {
              correspondingDot.classList.add("active");
              correspondingItem.classList.add("active");
              this.classList.add("is-hover");
            }
          }
        }
      }

      initEventListeners() {
        const _this = this;

        this.removeEventListeners();

        this.dot.forEach((dot, index) => {
          dot.addEventListener(
            "mouseenter",
            function (e) {
              _this.onMouseoverPopup(e);
            },
            false,
          );
          dot.addEventListener(
            "mouseleave",
            function (e) {
              _this.onMouseout(e);
            },
            false,
          );
          dot.addEventListener(
            "focus",
            function (e) {
              _this.onMouseoverPopup(e);
            },
            false,
          );
          dot.addEventListener(
            "blur",
            function (e) {
              _this.onMouseout(e);
            },
            false,
          );
          dot.addEventListener(
            "click",
            function (e) {
              _this.onClickDot(e);
            },
            false,
          );
        });

        this.item.forEach((item, index) => {
          item.addEventListener(
            "mouseenter",
            function (e) {
              _this.onMouseoverItem(e);
            },
            false,
          );
          item.addEventListener(
            "mouseleave",
            function (e) {
              _this.onMouseout(e);
            },
            false,
          );
          item.addEventListener(
            "focus",
            function (e) {
              _this.onMouseoverItem(e);
            },
            false,
          );
          item.addEventListener(
            "blur",
            function (e) {
              _this.onMouseout(e);
            },
            false,
          );
        });

        if (this.carouselMobile && this.carouselMobile.swiper) {
          this.carouselMobile.swiper.on("slideChange", function () {
            _this.onSlideChange();
          });
        }
      }

      showProductInfo(container) {
        const position = container.dataset.productPosition;
        const existingTooltip = document.querySelector(".product-tooltip");
        if (existingTooltip && this.activeTooltip && position) {
          const activePosition = this.querySelector(
            ".bundle-products-link.active",
          )?.dataset.productPosition;
          if (activePosition === position) {
            return;
          }
        }

        if (this.isAnimating) {
          this.forceCleanupTooltips();
        }
        const template = container.querySelector("template");
        const content = document.createElement("div");
        content.className = "product-tooltip";
        content.appendChild(template.content.firstElementChild.cloneNode(true));

        content.style.opacity = "0";
        content.style.transform = "translateY(20px)";

        const tooltip = NextSkyTheme.getBody().appendChild(content);
        this.activeTooltip = tooltip;

        const triggerRect = container.getBoundingClientRect();

        const isRTL = document.documentElement.dir === "rtl";

        if (isRTL) {
          const distanceFromRight = window.innerWidth - triggerRect.right;
          if (window.Shopify.designMode) {
            tooltip.style.right =
              distanceFromRight + triggerRect.width / 2 - 33 + "px";
          } else {
            tooltip.style.right =
              distanceFromRight + triggerRect.width / 2 - 48 + "px";
          }
        } else {
          tooltip.style.left =
            triggerRect.left + triggerRect.width / 2 - 33 + "px";
        }
        tooltip.style.top = triggerRect.bottom + window.scrollY + "px";

        tooltip.setAttribute("tabindex", "-1");
        const wasOpenedByKeyboard = this.openedByKeyboard || false;

        setTimeout(() => {
          if (this.activeTooltip === tooltip) {
            this.isAnimating = true;
            this.currentAnimation = Motion.animate(
              tooltip,
              {
                opacity: 1,
                y: 0,
              },
              {
                duration: 0.4,
                easing: "ease-out",
                onComplete: () => {
                  if (this.activeTooltip === tooltip) {
                    tooltip
                      .querySelector(".group-lookbook__item-product")
                      .classList.add("active");
                    if (wasOpenedByKeyboard) {
                      const focusableElements = tooltip.querySelectorAll(
                        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
                      );
                      if (focusableElements.length > 0) {
                        focusableElements[0].focus();
                      } else {
                        tooltip.focus();
                      }
                    }
                    this.openedByKeyboard = false;
                    new LazyLoader(".image-lazy-load");
                  }
                  this.isAnimating = false;
                  this.currentAnimation = null;
                },
              },
            );
          }
        }, 10);
      }

      hideProductInfo() {
        if (this.currentAnimation) {
          this.currentAnimation.cancel();
          this.currentAnimation = null;
        }

        const tooltip = document.querySelector(".product-tooltip");
        if (tooltip) {
          if (this.isAnimating) {
            if (tooltip.parentNode) {
              tooltip.parentNode.removeChild(tooltip);
            }
            this.isAnimating = false;
            this.activeTooltip = null;
            return;
          }

          this.isAnimating = true;
          this.currentAnimation = Motion.animate(
            tooltip,
            {
              opacity: 0,
              y: 20,
            },
            {
              duration: 0.3,
              easing: "ease-in",
              onComplete: () => {
                if (tooltip.parentNode) {
                  tooltip.parentNode.removeChild(tooltip);
                }
                this.isAnimating = false;
                this.currentAnimation = null;
                this.activeTooltip = null;
              },
            },
          );
        }
      }

      forceCleanupTooltips() {
        const tooltips = document.querySelectorAll(".product-tooltip");
        tooltips.forEach((tooltip) => {
          if (tooltip.parentNode) {
            Motion.animate(
              tooltip,
              {
                opacity: 0,
                y: 20,
              },
              {
                duration: 0.3,
                easing: "ease-in",
                onComplete: () => {
                  if (tooltip.parentNode) {
                    tooltip.parentNode.removeChild(tooltip);
                  }
                },
              },
            );
          }
        });

        if (this.currentAnimation) {
          this.currentAnimation.cancel();
          this.currentAnimation = null;
        }
        this.isAnimating = false;
        this.activeTooltip = null;
      }

      removeEventListeners() {
        this.dot.forEach((dot) => {
          const newDot = dot.cloneNode(true);
          dot.parentNode.replaceChild(newDot, dot);
        });

        this.item.forEach((item) => {
          const newItem = item.cloneNode(true);
          item.parentNode.replaceChild(newItem, item);
        });

        this.dot = this.querySelectorAll(".bundle-products-hotspot");
        this.item = this.querySelectorAll("bundle-item");
      }

      refreshEventListeners() {
        this.dot = this.querySelectorAll(".bundle-products-hotspot");
        this.item = this.querySelectorAll("bundle-item");
      }

      async showQuickView(e) {
        e.preventDefault();
        const currentTarget = e.currentTarget;
        currentTarget.classList.add("loading");
        const productUrl = currentTarget.dataset.url;
        if (productUrl) {
          this.setAttribute("aria-disabled", true);
          this.classList.add("loading");
          if (!this.sectionId) {
            window.location.href = productUrl;
            return;
          }
          await (import(importJs.mediaGallery), import(importJs.productModel));
          this.fetchUrl(productUrl, currentTarget);
        }
      }

      fetchUrl(productUrl, currentTarget) {
        fetch(`${productUrl}?section_id=${this.sectionId}`)
          .then((response) => response.text())
          .then((text) => {
            const html = NextSkyTheme.parser.parseFromString(text, "text/html");
            document.querySelector(".quickview-product").innerHTML =
              html.querySelector(".quickview-product").innerHTML;
          })
          .finally(async () => {
            currentTarget.classList.remove("loading");
            const drawer = document.querySelector("quickview-drawer");
            eventModal(drawer, "open", false, "delay", true);
            NextSkyTheme.global.rootToFocus = this;
            new LazyLoader(".image-lazy-load");
            await (import(importJs.mediaLightboxGallery),
            import(importJs.countdownTimer),
            import(importJs.recipientForm));
            drawer.querySelector(".modal-inner").scrollTop = 0;
          })
          .catch((e) => {
            console.error(e);
          });
      }

      get sectionId() {
        return document.querySelector("quickview-drawer")
          ? document
              .querySelector("quickview-drawer")
              .getAttribute("data-section-id")
          : null;
      }
    },
  );
}
