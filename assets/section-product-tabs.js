class ProductTabs extends HTMLElement {
  constructor() {
    super();
    this._selectedTab = null;
    this._tabs = null;
    this._tabContents = null;
    this._openAccordions = new Set();

    if (Shopify && Shopify.designMode) {
      this.addEventListener("shopify:block:select", (event) => {
        const targetBlock = event.target.closest("[data-block-id]");
        if (targetBlock) {
          this.setTab(targetBlock.dataset.blockId, true);
        }
      });
    }
    this.handleResize = this.handleResize.bind(this);
  }

  static get observedAttributes() {
    return ["selected-tab"];
  }

  get selectedTab() {
    return this.getAttribute("selected-tab") || "";
  }

  set selectedTab(blockId) {
    if (blockId && this.getAttribute("selected-tab") !== blockId) {
      this.setAttribute("selected-tab", blockId);
    }
  }

  get tabs() {
    return (
      this._tabs ||
      Array.from(this.querySelectorAll(".product-tabs__header-item"))
    );
  }

  get tabContents() {
    return (
      this._tabContents ||
      Array.from(this.querySelectorAll(".product-tabs__content-item"))
    );
  }

  connectedCallback() {
    setTimeout(() => {
      this.init();
    }, 10);

    window.addEventListener("resize", this.handleResize);
  }

  handleResize() {
    const activeTab = this.querySelector(".product-tabs__header-item.active");
  }

  init() {
    this._tabs = Array.from(
      this.querySelectorAll(".product-tabs__header-item"),
    );
    this._tabContents = Array.from(
      this.querySelectorAll(".product-tabs__content-item"),
    );
    this._mobileDescs = Array.from(
      this.querySelectorAll(".product-tabs__mobile-desc"),
    );
    if (!this._tabs.length || !this._tabContents.length) return;
    const initialTab = this._tabs[0];
    this.selectedTab = initialTab.dataset.blockId;
    this.setupEventListeners();
    this.updateTabDisplay(this.selectedTab, false);
    setTimeout(() => {
      this.initContentSwipers();
    }, 10);
    this.setupInitialTab();
  }

  setupEventListeners() {
    this._tabs.forEach((tab, index) => {
      const dataHref = tab.dataset.href;
      if (index === 0 && dataHref) {
        this.querySelectorAll(".view-all-btn").forEach((btn) => {
          btn.setAttribute("href", dataHref);
          btn.removeAttribute("aria-disabled");
          btn.removeAttribute("role");
        });
      }
      tab.addEventListener("click", (event) => {
        if (event.target.closest(".product-tabs__header-description")) {
          return;
        }
        const description = tab.querySelector(
          ".product-tabs__header-description",
        );
        if (
          tab.classList.contains("active") &&
          description &&
          description.textContent.trim().length > 0
        ) {
          this.toggleAccordion(tab);
        } else {
          const blockId = tab.dataset.blockId;
          if (blockId !== this.selectedTab) {
            this.selectedTab = blockId;
          }
        }
        const dataHref = tab.dataset.href;
        if (dataHref) {
          this.querySelectorAll(".view-all-btn").forEach((btn) => {
            btn.setAttribute("href", dataHref);
            btn.removeAttribute("aria-disabled");
            btn.removeAttribute("role");
          });
        } else {
          this.querySelectorAll(".view-all-btn").forEach((btn) => {
            btn.removeAttribute("href");
            btn.setAttribute("aria-disabled", true);
            btn.setAttribute("role", "link");
          });
        }
      });
      tab.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          if (event.target.tagName.toLowerCase() === "a") {
            return;
          }
          event.preventDefault();
          const description = tab.querySelector(
            ".product-tabs__header-description",
          );
          if (
            tab.classList.contains("active") &&
            description &&
            description.textContent.trim().length > 0
          ) {
            this.toggleAccordion(tab);
          } else {
            const blockId = tab.dataset.blockId;
            if (blockId !== this.selectedTab) {
              this.selectedTab = blockId;
            }
          }
          const dataHref = tab.dataset.href;
          if (dataHref) {
            this.querySelectorAll(".view-all-btn").forEach((btn) => {
              btn.setAttribute("href", dataHref);
              btn.removeAttribute("aria-disabled");
              btn.removeAttribute("role");
            });
          } else {
            this.querySelectorAll(".view-all-btn").forEach((btn) => {
              btn.removeAttribute("href");
              btn.setAttribute("aria-disabled", true);
              btn.setAttribute("role", "link");
            });
          }
        }
      });
    });
  }

  closeAllAccordions() {
    this._tabs.forEach((tab) => {
      const description = tab.querySelector(
        ".product-tabs__header-description",
      );
      const actionOnMobile = this.querySelector(".action-on-mobile");
      if (description && tab.classList.contains("accordion-open")) {
        tab.classList.remove("accordion-open");
        description.classList.remove("is-open");
        if (typeof Motion !== "undefined") {
          Motion.animate(
            description,
            {
              opacity: [1, 0],
              height: 0,
            },
            { duration: 0.2 },
          );

          if (actionOnMobile) {
            Motion.animate(
              actionOnMobile,
              {
                opacity: [1, 0],
              },
              {
                duration: 0.2,
              },
            );
          }
        } else {
          description.style.height = "0";
        }
      }
    });
    this._openAccordions.clear();
  }

  toggleAccordion(tab, forceOpen = false) {
    const description = tab.querySelector(".product-tabs__header-description");
    const buttonViewAll = tab.querySelector(".button-on-js");
    const href = buttonViewAll?.getAttribute("href");
    const actionOnMobile = this.querySelector(".action-on-mobile");

    const isOpen = tab.classList.contains("accordion-open");
    const mobileDescription = this.querySelector(
      ".product-tabs__header-description-mobile",
    );
    const buttonViewAllMobile = this.querySelector(".button-js-on-mobile");

    if (!isOpen || forceOpen) {
      tab.classList.add("accordion-open");
      description?.classList.add("is-open");
      if (mobileDescription) {
        mobileDescription.innerHTML = description.innerHTML;
      }
      if (buttonViewAllMobile && href) {
        buttonViewAllMobile.setAttribute("href", href);
      }
      if (typeof Motion !== "undefined") {
        Motion.animate(
          description,
          {
            opacity: [0, 1],
            height: "auto",
          },
          { duration: 0.2 },
        );
        if (actionOnMobile) {
          Motion.animate(
            actionOnMobile,
            {
              opacity: [0, 1],
            },
            {
              duration: 0.2,
            },
          );
        }
      } else {
        description.style.height = "auto";
      }
      this._openAccordions.add(tab.dataset.blockId);
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "selected-tab" && oldValue !== newValue && oldValue !== null) {
      this.updateTabDisplay(newValue, true);
    }
  }

  updateTabDisplay(blockId, animate = true) {
    if (this._isAnimating) return;
    this._isAnimating = true;
    if (animate) {
      this.closeAllAccordions();
    }
    let activeTab = null;
    const slideSectionHeader = this.querySelector(
      ".product-tabs__header-image-mobile",
    );

    // Update mobile description visibility
    if (this._mobileDescs && this._mobileDescs.length > 0) {
      this._mobileDescs.forEach((desc) => {
        const isSelected = desc.dataset.blockId === blockId;
        if (isSelected) {
          desc.classList.remove("hidden-important");
          desc.classList.add("active");
        } else {
          desc.classList.add("hidden-important");
          desc.classList.remove("active");
        }
      });
    }

    this.tabs.forEach((tab) => {
      const isSelected = tab.dataset.blockId === blockId;
      tab.classList.toggle("selected", isSelected);
      tab.classList.toggle("active", isSelected);
      if (isSelected) {
        activeTab = tab;
        const description = tab.querySelector(
          ".product-tabs__header-description",
        );
        if (description && description.textContent.trim().length > 0) {
          this.toggleAccordion(tab, true);
        }
        const position = tab.dataset.position;
        if (slideSectionHeader && slideSectionHeader.swiper) {
          slideSectionHeader.swiper.slideToLoop(position - 1, 170, true);
        }
      }
    });

    const oldContent = this.querySelector(".product-tabs__content-item.active");
    const newContent = this.querySelector(
      `.product-tabs__content-item[data-block-id="${blockId}"]`,
    );

    if (!newContent) {
      this._isAnimating = false;
      return;
    }

    const initContentSwiper = () => {
      if (newContent) {
        const contentSlideSection = newContent.querySelector("slide-section");
        if (contentSlideSection && contentSlideSection.swiper) {
          try {
            if (contentSlideSection.swiper.initialized) {
              contentSlideSection.swiper.destroy(true, false);
              contentSlideSection.init();
            }

            setTimeout(() => {
              if (
                contentSlideSection.swiper &&
                contentSlideSection.swiper.initialized
              ) {
                contentSlideSection.swiper.update();
              }
            }, 10);
          } catch (e) {}
        }
      }
    };

    if (animate && typeof Motion !== "undefined" && oldContent !== newContent) {
      this.transition(oldContent, newContent).finally(() => {
        this._isAnimating = false;
        initContentSwiper();
      });
    } else {
      this.tabContents.forEach((content) => {
        content.classList.remove("active");
        content.classList.add("hidden");
      });

      newContent.classList.add("active");
      newContent.classList.remove("hidden");
      this._isAnimating = false;
      initContentSwiper();
    }

    this.dispatchEvent(
      new CustomEvent("tabChanged", {
        detail: { blockId },
        bubbles: true,
      }),
    );
  }

  initContentSwipers() {
    this.tabContents.forEach((content) => {
      const slideSection = content.querySelector("slide-section");
      if (slideSection && slideSection.swiper) {
        if (slideSection.swiper.initialized) {
          slideSection.swiper.update();
        }
      }
    });
  }

  async transition(fromPanel, toPanel) {
    if (!fromPanel || !toPanel) return;
    if (fromPanel) {
      try {
        await Motion.animate(
          fromPanel,
          {
            opacity: [1, 0],
            y: [0, 15],
          },
          {
            duration: 0.2,
          },
        ).finished;
      } catch (e) {
        console.error("Animation error:", e);
      }
      fromPanel.classList.remove("active");
      fromPanel.classList.add("hidden");
    }
    toPanel.classList.add("active");
    toPanel.classList.remove("hidden");
    try {
      Motion.animate(
        toPanel,
        {
          opacity: [0, 1],
          y: [15, 0],
        },
        {
          duration: 0.2,
        },
      );
    } catch (e) {
      console.error("Animation error:", e);
    }
    toPanel.querySelector("motion-items-effect")?.animateItems();
  }

  setupInitialTab() {
    this.tabContents.forEach((tab) => {
      if (tab.classList.contains("active")) {
        Motion.animate(
          tab,
          {
            opacity: 1,
            y: 0,
          },
          {
            duration: 0,
          },
        );
      } else {
        Motion.animate(
          tab,
          {
            opacity: 0,
            y: 15,
          },
          {
            duration: 0,
          },
        );
      }
    });
  }

  disconnectedCallback() {
    if (this._tabs) {
      this._tabs.forEach((tab) => {
        tab.removeEventListener("click", null);
      });
    }

    window.removeEventListener("resize", this.handleResize);
  }
}
if (!customElements.get("product-tabs")) {
  customElements.define("product-tabs", ProductTabs);
}

export { ProductTabs };
