import { LazyLoader } from "@NextSkyTheme/lazy-load";
import * as NextSkyTheme from "@NextSkyTheme/global";
import { eventModal, checkUrlParameters } from "@NextSkyTheme/modal";

const LEGACY_COOKIE = "newsletter_popup";
const SUCCESS_COOKIE = "newsletter_popup_success";
const POPUP_HIDDEN_COOKIE = "newsletter_popup_hidden";
const STICKY_HIDDEN_COOKIE = "newsletter_discount_sticky_hidden";
const STICKY_ELIGIBLE_COOKIE = "newsletter_discount_sticky_visible";
const STICKY_ANIMATION_OFFSET = "translateY(10px)";
const STICKY_ANIMATION_DURATION = 0.2;
const STICKY_ANIMATION_EASING = [0, 0, 0.3, 1];

class NewsletterPopup extends HTMLElement {
  constructor() {
    super();
    this.enable = this.dataset.enable;
    this.stickyEnabled = this.dataset.stickyEnabled === "true";
    this.stickyHeading = this.dataset.stickyHeading || "";
    this.initialized = false;
    this.sectionId = this.dataset.sectionId;
    this.scrollTriggered = false;
    this.spaceScroll = 70;
    this.stickyScrollTriggered = false;
    this.stickySpaceScroll = 40;
    this.designModeEventsBound = false;
    this.modalEventsBound = false;
    this.handleSectionSelect = this.handleSectionSelect.bind(this);
    this.handleSectionLoad = this.handleSectionLoad.bind(this);
    this.handleSectionDeselect = this.handleSectionDeselect.bind(this);
    this.handleModalOpened = this.handleModalOpened.bind(this);
    this.handleModalClosed = this.handleModalClosed.bind(this);
    this.handleStickyOpen = this.handleStickyOpen.bind(this);
    this.handleStickyClose = this.handleStickyClose.bind(this);
  }

  connectedCallback() {
    if (this.isDesignMode()) {
      this.bindDesignModeEvents();
      this.init();
      return;
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.init());
    } else {
      if ("requestIdleCallback" in window) {
        requestIdleCallback(() => this.init());
      } else {
        setTimeout(() => this.init(), 100);
      }
    }
  }

  disconnectedCallback() {
    this.unbindDesignModeEvents();
    this.unbindModalEvents();
  }

  init() {
    if (this.isDesignMode()) {
      this.bindDesignModeEvents();
    }

    if (this.initialized) {
      this.bindModalEvents();
      return;
    }
    this.initialized = true;
    this.initElements();
    this.hideSticky();
    this.initNotShow(this.modal);
    this.evenSubmitForm();

    if (!this.stickyEnabled) {
      this.clearStickyEligible();
    }

    if (this.stickyEnabled) {
      this.bindStickyEvents();
    }

    if (this.isDesignMode()) {
      if (this.stickyEnabled && this.stickyHeading.trim()) {
        this.showSticky();
      }
      this.bindModalEvents();
      return;
    }

    const urlChecked = checkUrlParameters();
    if (urlChecked) {
      this.clearStickyEligible();
      this.hideSticky();
      return;
    }

    this.initPersistedStickyTrigger();

    if (this.isPopupPageEligible() && !this.shouldBlockPopupAutoTrigger()) {
      this.initScrollTrigger();
    }

    this.bindModalEvents();
  }

  initElements() {
    this.modal = this.querySelector("newsletter-modal-popup");
    this.contactForm = this.querySelector("form") || null;
    this.notShowCheckbox = this.modal?.querySelector(".newsletter-action") || null;
    this.sticky = this.querySelector(".newsletter-discount-sticky") || null;
    this.stickyOpenButton =
      this.sticky?.querySelector(".newsletter-discount-sticky__open") || null;
    this.stickyCloseButton =
      this.sticky?.querySelector(".newsletter-discount-sticky__close") || null;
    this.popupCloseButton = this.modal?.querySelector(".modal-button-close") || null;
    this.popupOverlay = this.modal?.querySelector("modal-overlay") || null;

    if (this.stickyOpenButton && this.stickyHeading) {
      this.stickyOpenButton.setAttribute("aria-label", this.stickyHeading);
    }
  }

  isDesignMode() {
    return this.dataset.designMode === "true" || Boolean(window.Shopify?.designMode);
  }

  bindDesignModeEvents() {
    if (this.designModeEventsBound) return;
    this.designModeEventsBound = true;
    document.addEventListener("shopify:section:select", this.handleSectionSelect);
    document.addEventListener("shopify:section:load", this.handleSectionLoad);
    document.addEventListener("shopify:section:deselect", this.handleSectionDeselect);
  }

  unbindDesignModeEvents() {
    if (!this.designModeEventsBound) return;
    this.designModeEventsBound = false;
    document.removeEventListener("shopify:section:select", this.handleSectionSelect);
    document.removeEventListener("shopify:section:load", this.handleSectionLoad);
    document.removeEventListener("shopify:section:deselect", this.handleSectionDeselect);
  }

  bindModalEvents() {
    if (this.modalEventsBound) return;
    this.modalEventsBound = true;
    document.addEventListener("modal:opened", this.handleModalOpened);
    document.addEventListener("modal:closed", this.handleModalClosed);
  }

  unbindModalEvents() {
    if (!this.modalEventsBound) return;
    this.modalEventsBound = false;
    document.removeEventListener("modal:opened", this.handleModalOpened);
    document.removeEventListener("modal:closed", this.handleModalClosed);
  }

  getEditorSectionId(event) {
    if (event?.detail?.sectionId) return event.detail.sectionId;

    const editorSection = event?.target?.dataset?.shopifyEditorSection;
    if (!editorSection) return null;

    try {
      return JSON.parse(editorSection).id || null;
    } catch {
      return null;
    }
  }

  isCurrentSectionEvent(event) {
    return this.getEditorSectionId(event) === this.sectionId;
  }

  handleSectionSelect(event) {
    this.actionDesignMode(event);
  }

  handleSectionLoad(event) {
    if (!this.isCurrentSectionEvent(event)) return;

    const template = event.target?.querySelector("newsletter-modal-popup");
    this.createPopup(template);
  }

  handleSectionDeselect() {
    this.closePopup();
  }

  isPopupPageEligible() {
    return this.enable === "show-on-homepage" || this.enable === "show-all-page";
  }

  shouldBlockPopupAutoTrigger() {
    return this.hasLegacyCookie() || this.hasSuccessCookie() || this.hasPopupHiddenCookie();
  }

  shouldShowSticky() {
    if (!this.stickyEnabled || !this.sticky) return false;
    if (!this.stickyHeading.trim()) return false;
    if (!this.isPopupPageEligible()) return false;
    if (this.hasLegacyCookie() || this.hasSuccessCookie()) return false;
    if (this.hasStickyHiddenCookie()) return false;
    if (!this.hasStickyEligibleCookie()) return false;
    return !this.modal?.classList.contains("active");
  }

  hasLegacyCookie() {
    return NextSkyTheme.getCookie(LEGACY_COOKIE) !== null;
  }

  hasSuccessCookie() {
    return NextSkyTheme.getCookie(SUCCESS_COOKIE) !== null;
  }

  hasPopupHiddenCookie() {
    return NextSkyTheme.getCookie(POPUP_HIDDEN_COOKIE) !== null;
  }

  hasStickyHiddenCookie() {
    return NextSkyTheme.getCookie(STICKY_HIDDEN_COOKIE) !== null;
  }

  hasStickyEligibleCookie() {
    return NextSkyTheme.getCookie(STICKY_ELIGIBLE_COOKIE) !== null;
  }

  showSticky() {
    if (!this.sticky) return;
    if (!this.sticky.classList.contains("hidden-important")) return;

    this.stopStickyAnimation();
    this.sticky.style.opacity = "0";
    this.sticky.style.transform = STICKY_ANIMATION_OFFSET;
    this.sticky.classList.remove("hidden-important");
    this.sticky.setAttribute("aria-hidden", "false");

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (typeof Motion === "undefined" || prefersReducedMotion) {
      this.resetStickyAnimationStyles();
      return;
    }

    this.stickyAnimation = Motion.animate(
      this.sticky,
      {
        transform: [STICKY_ANIMATION_OFFSET, "translateY(0)"],
        opacity: [0, 1],
      },
      {
        duration: STICKY_ANIMATION_DURATION,
        easing: STICKY_ANIMATION_EASING,
      }
    );

    this.stickyAnimation.finished.finally(() => {
      this.resetStickyAnimationStyles();
      this.stickyAnimation = null;
    });
  }

  hideSticky() {
    if (!this.sticky) return;
    this.stopStickyAnimation();
    this.resetStickyAnimationStyles();
    this.sticky.classList.add("hidden-important");
    this.sticky.setAttribute("aria-hidden", "true");
  }

  showStickyIfEligible() {
    if (this.shouldShowSticky()) {
      this.showSticky();
    } else {
      this.hideSticky();
    }
  }

  initPersistedStickyTrigger() {
    if (!this.shouldShowSticky()) return;
    if (this.stickyScrollTriggered) return;

    const scrollHandler = () => {
      if (this.stickyScrollTriggered) return;

      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const documentHeight =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      const scrollPercentage = documentHeight > 0 ? (scrollTop / documentHeight) * 100 : 0;

      if (scrollPercentage >= this.stickySpaceScroll) {
        this.stickyScrollTriggered = true;
        this.showStickyIfEligible();
        window.removeEventListener("scroll", scrollHandler);
      }
    };

    window.addEventListener("scroll", scrollHandler, { passive: true });
  }

  stopStickyAnimation() {
    if (!this.stickyAnimation) return;
    this.stickyAnimation.cancel();
    this.stickyAnimation = null;
  }

  resetStickyAnimationStyles() {
    if (!this.sticky) return;
    this.sticky.style.opacity = "";
    this.sticky.style.transform = "";
  }

  markStickyEligible() {
    if (!this.stickyEnabled || this.isDesignMode()) return;
    NextSkyTheme.setCookie(STICKY_ELIGIBLE_COOKIE, "true", 365);
  }

  clearStickyEligible() {
    NextSkyTheme.deleteCookie(STICKY_ELIGIBLE_COOKIE);
  }

  bindStickyEvents() {
    if (this._stickyEventsBound) return;
    this._stickyEventsBound = true;
    this.stickyOpenButton?.addEventListener("click", this.handleStickyOpen, false);
    this.stickyCloseButton?.addEventListener("click", this.handleStickyClose, false);
  }

  handleModalClosed(event) {
    const closedModal = event.detail?.modal;
    if (!this.modal || !this.stickyEnabled) return;
    if (closedModal !== this.modal) return;

    if (this.isDesignMode()) {
      this.showSticky();
      return;
    }

    this.stickyScrollTriggered = true;
    this.markStickyEligible();
    this.showStickyIfEligible();
  }

  handleStickyOpen(event) {
    event.preventDefault();

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (typeof Motion === "undefined" || prefersReducedMotion || this.isDesignMode()) {
      this.hideSticky();
      this.createPopup();
      return;
    }

    this.stopStickyAnimation();
    this.stickyAnimation = Motion.animate(
      this.sticky,
      {
        transform: ["translateY(0)", STICKY_ANIMATION_OFFSET],
        opacity: [1, 0],
      },
      {
        duration: STICKY_ANIMATION_DURATION,
        easing: STICKY_ANIMATION_EASING,
      }
    );

    this.stickyAnimation.finished.finally(() => {
      this.stickyAnimation = null;
      this.hideSticky();
      this.createPopup();
    });
  }

  handleStickyClose(event) {
    event.preventDefault();
    event.stopPropagation();
    NextSkyTheme.setCookie(STICKY_HIDDEN_COOKIE, "true", 1);
    this.hideSticky();
  }

  initInactivityTrigger() {
    if (this._inactivityInitialized) return;
    this._inactivityInitialized = true;
    this._inactivityTimer = null;
    this._inactivityTriggered = false;
    const events = ["scroll", "click", "mousemove", "keydown"];
    const _self = this;
    function resetTimer() {
      if (_self._inactivityTimer) clearTimeout(_self._inactivityTimer);
      if (_self._inactivityTriggered) return;
      _self._inactivityTimer = setTimeout(() => {
        if (!_self._inactivityTriggered) {
          _self._inactivityTriggered = true;
          if (_self._inactivityTimer) {
            clearTimeout(_self._inactivityTimer);
            _self._inactivityTimer = null;
          }
          const activeModal =
            NextSkyTheme.getRoot().classList.contains("open-modal");
          if (!activeModal) {
            _self.createPopup();
          }
          events.forEach((event) => {
            window.removeEventListener(event, resetTimer);
          });
        }
      }, 4000);
    }
    events.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });
    resetTimer();
  }

  initScrollTrigger() {
    const _self = this;
    const scrollHandler = () => {
      if (_self.scrollTriggered) return;

      const featuredBanners = document.querySelectorAll(
        ".section-featured-product-banner"
      );
      if (featuredBanners.length > 0) {
        const currentScroll =
          window.pageYOffset || document.documentElement.scrollTop;
        let hasPassedAllBanners = true;

        featuredBanners.forEach((banner) => {
          const bannerRect = banner.getBoundingClientRect();
          const bannerBottom = bannerRect.bottom + window.pageYOffset;
          if (currentScroll < bannerBottom) {
            hasPassedAllBanners = false;
          }
        });

        if (!hasPassedAllBanners) {
          return;
        }
      }

      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const documentHeight =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      const scrollPercentage = (scrollTop / documentHeight) * 100;
      if (scrollPercentage >= _self.spaceScroll) {
        _self.scrollTriggered = true;
        _self.initInactivityTrigger();
        window.removeEventListener("scroll", scrollHandler);
      }
    };

    window.addEventListener("scroll", scrollHandler, { passive: true });
  }

  actionDesignMode(event) {
    const _self = this;
    const currentTarget = event.target;
    const wrapper = this.modal;
    const template = currentTarget?.querySelector("newsletter-modal-popup");
    if (this.isCurrentSectionEvent(event)) {
      if (wrapper && !wrapper.classList.contains("active")) {
        _self.createPopup(template);
      }
    } else {
      if (wrapper?.classList.contains("active")) {
        _self.closePopup();
      }
    }
  }

  createPopup(templateDesignMode) {
    let template;
    this.hideSticky();
    if (window.Shopify && window.Shopify.designMode) {
      const existingPopup = document.querySelector("newsletter-modal-popup");
      if (existingPopup?.classList.contains("active")) {
        eventModal(existingPopup, "close", true);
      }
    }
    if (window.Shopify && window.Shopify.designMode) {
      template = templateDesignMode || this.modal;
    } else {
      template = this.modal;
    }
    if (!template) return;
    eventModal(template, "open", true, null, true);
    NextSkyTheme.global.rootToFocus = template;
    this.initNotShow(template);
  }

  handleModalOpened() {
    if (this.tagName === "NEWSLETTER-POPUP") {
      this.hideSticky();
      new LazyLoader(".image-lazy-load");
    }
  }

  closePopup() {
    if (this.modal?.classList.contains("active")) {
      eventModal(this.modal, "close", true);
    }
  }

  initNotShow(modal) {
    const notShowCheckbox = modal?.querySelector(".newsletter-action");
    if (!notShowCheckbox || notShowCheckbox.type !== "checkbox") return;
    if (notShowCheckbox.dataset.bound === "true") return;
    notShowCheckbox.dataset.bound = "true";
    const _self = this;

    notShowCheckbox.addEventListener("change", () => {
      _self.eventNotShow(notShowCheckbox);
    });
  }

  eventNotShow(checkbox) {
    if (checkbox.checked) {
      NextSkyTheme.setCookie(POPUP_HIDDEN_COOKIE, "true", 1);
    } else {
      NextSkyTheme.deleteCookie(POPUP_HIDDEN_COOKIE);
    }
  }

  evenSubmitForm() {
    if (!this.contactForm || this.contactForm.dataset.bound === "true") return;
    this.contactForm.dataset.bound = "true";
    this.contactForm.addEventListener("submit", (e) => {
      const submitButton =
        e.submitter ||
        this.contactForm.querySelector('button[type="submit"]');
      const spinner = submitButton?.querySelector(".icon-load");
      const text = submitButton?.querySelector(".hidden-on-load");

      submitButton?.classList.add("loading");
      spinner?.classList.remove("opacity-0", "pointer-none");
      text?.classList.add("opacity-0");
    });
  }
}
customElements.define("newsletter-popup", NewsletterPopup);

class CollectionsSelector extends HTMLElement {
  constructor() {
    super();
    this.buttons = this.querySelectorAll("button");
    this.input = this.querySelector(".collection-input");
    this.field =
      this.closest(".newsletter_inner")?.querySelector(".field-contact");
    this.selector_collection_header = this.closest(
      ".newsletter_inner"
    )?.querySelector(".collection-selector-header");
    this.newsletter_header =
      this.closest(".newsletter_inner")?.querySelector(".newsletter-header");
  }

  connectedCallback() {
    this.buttons.forEach((btn) =>
      btn.addEventListener("click", (e) => this.pick(e))
    );
  }

  pick(e) {
    e.preventDefault();
    const val = e.currentTarget.textContent.trim();
    if (!val) return;

    this.input.value = val;
    this.classList.add("hidden-important");
    this.field?.classList.remove("hidden-important");

    this.newsletter_header?.classList.remove("hidden");
    this.selector_collection_header?.classList.add("hidden");
  }
}

customElements.define("collections-selector", CollectionsSelector);
