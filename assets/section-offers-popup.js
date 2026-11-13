import * as NextSkyTheme from "@NextSkyTheme/global";
import { LazyLoader } from "@NextSkyTheme/lazy-load";
import { eventModal } from "@NextSkyTheme/modal";

class ScrollOffer extends HTMLElement {
  constructor() {
    super();
    this.isVisible = false;
    this.observer = null;
    this.scrollThreshold = 300;
    this.initialized = false;
    this.isPopupOpen = false;
    this.initMobile();
  }

  connectedCallback() {
    this.addEventListener("click", this.initPopup.bind(this), false);
    this.addEventListener("keydown", this.handleKeydown.bind(this), false);
    const offerWrapper = document.querySelector("offer-popup");
    this.sectionId = offerWrapper?.dataset.sectionId;
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.initialize());
    } else {
      this.initialize();
    }

    if (window.Shopify && window.Shopify.designMode) {
      const _self = this;
      document.addEventListener("shopify:section:select", (event) => {
        _self.actionDesignMode(event);
      });
      document.addEventListener("shopify:section:deselect", () => {
        _self.closePopup();
      });
    }
  }

  actionDesignMode(event) {
    const _self = this;
    const currentTarget = event.target;
    if (
      JSON.parse(currentTarget.dataset.shopifyEditorSection).id ===
      this.sectionId
    ) {
      _self.initPopup();
    } else {
      _self.closePopup();
    }
  }

  initPopup() {
    const offerWrapper = document.querySelector("offer-popup");
    if (window.Shopify && window.Shopify.designMode) {
      eventModal(offerWrapper, "close", false);
    }
    eventModal(offerWrapper, "open", false);
    NextSkyTheme.global.rootToFocus = this;
  }

  closePopup() {
    const offerWrapper = document.querySelector("offer-popup");
    eventModal(offerWrapper, "close", false);
    this.isPopupOpen = false;
  }

  initMobile() {
    const mediaQuery = window.matchMedia("(max-width: 767.98px)");
    const _self = this;

    let timeoutId = null;

    const handleMediaQueryChange = () => {
      if (mediaQuery.matches) {
        const mobileNavigationBar = document.querySelector(
          "mobile-navigation-bar"
        );
        if (
          mobileNavigationBar &&
          mobileNavigationBar.classList.contains("show_offer")
        ) {
          _self.mobileAppend();
        }
      }
    };

    const debouncedCheck = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleMediaQueryChange, 300);
    };

    handleMediaQueryChange();
    mediaQuery.addEventListener("change", handleMediaQueryChange);

    const observer = new MutationObserver((mutations) => {
      let shouldCheck = false;

      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          shouldCheck = true;
        }
        if (mutation.type === "childList") {
          shouldCheck = true;
        }
      });

      if (shouldCheck) {
        debouncedCheck();
      }
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
      childList: true,
      subtree: true,
    });

    if (typeof Shopify !== "undefined" && Shopify.designMode) {
      [
        "shopify:section:load",
        "shopify:section:reorder",
        "shopify:section:unload",
      ].forEach((event) => {
        document.addEventListener(event, debouncedCheck);
      });
    }
  }

  mobileAppend() {
    const mobileNavigationBar = document.querySelector("mobile-navigation-bar");

    if (!mobileNavigationBar) {
      return;
    }
    const mobileNavigationBarContent = mobileNavigationBar.querySelector(
      ".mobile-navigation-bar__content"
    );
    const existingOfferMobile =
      mobileNavigationBarContent.querySelector(".offer-mobile");
    if (existingOfferMobile) {
      return;
    }
    const contentAppend = document.createElement("li");
    contentAppend.classList.add("flex-1", "offer-mobile");
    contentAppend.innerHTML = `
      <div class="mobile_icon pointer inline-flex column content-center heading-color gap-3">
<svg width="20" height="20" fill="none"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.326 12.217 2.059 10.95a1.338 1.338 0 0 1 0-1.883L3.326 7.8c.217-.216.392-.641.392-.941V5.067c0-.733.6-1.333 1.333-1.333h1.792c.3 0 .725-.175.941-.392l1.267-1.267a1.338 1.338 0 0 1 1.883 0l1.267 1.267c.217.217.642.392.942.392h1.791c.734 0 1.334.6 1.334 1.333V6.86c0 .3.175.725.391.941l1.267 1.267a1.338 1.338 0 0 1 0 1.883l-1.267 1.267c-.216.217-.391.642-.391.942v1.791c0 .734-.6 1.334-1.334 1.334h-1.791c-.3 0-.725.175-.942.392l-1.267 1.266a1.338 1.338 0 0 1-1.883 0l-1.267-1.267a1.537 1.537 0 0 0-.941-.391H5.05c-.733 0-1.333-.6-1.333-1.334V13.16c0-.309-.175-.734-.392-.942ZM7.5 12.5l5-5"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12.08 12.083h.008M7.912 7.917h.008"/></svg>
        ${window.content.offer.title}
      </div>
    `;
    const lastChild = mobileNavigationBarContent.lastElementChild;
    if (lastChild) {
      mobileNavigationBarContent.insertBefore(contentAppend, lastChild);
    } else {
      mobileNavigationBarContent.appendChild(contentAppend);
    }
    contentAppend.addEventListener("click", this.initPopup.bind(this), false);
  }

  handleKeydown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      this.initPopup();
    }
  }

  initialize() {
    if (this.initialized) return;
    this.initialized = true;
    document.addEventListener(
      "modal:opened",
      this.handleModalOpened.bind(this)
    );
  }

  handleModalOpened() {
    if (this.tagName === "SCROLL-OFFER") {
      new LazyLoader(".image-lazy-load");
    }
  }
}

customElements.define("scroll-offer", ScrollOffer);
