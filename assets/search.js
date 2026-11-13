import { SlideSection } from "@NextSkyTheme/slide";
import { LazyLoader } from "@NextSkyTheme/lazy-load";
import * as NextSkyTheme from "@NextSkyTheme/global";
import { eventModal } from "@NextSkyTheme/modal";

class ActionSearch extends HTMLElement {
  constructor() {
    super();
    this.sectionId = this.dataset.sectionId;
    this.modalInput = this.querySelector('input[type="search"]');
    this.input = this.modalInput;
    this.form = this.querySelector("form#search_mini_form");
    this.templateRecommendedDefault = this.querySelector(
      ".template-recommended-default",
    );
    this.templateRecommendedPopup = this.querySelector(
      ".template-recommended-popup",
    );
    this.predictiveSearchResults = this.querySelector(".predictive-search");
    this.searchKeyword = this.querySelector(".search-keyword");
    this.recommendSearch = this.querySelector(".recommend-search");
    this.headerInput = null;
    this.bindInputEvents(this.modalInput);
    document.addEventListener("mousedown", (e) => {
      if (!this.input) return;
      const isClickOutside = !this.input.contains(e.target);
      const hasValue = this.input.value.trim() !== "";
      const value = this.input.value.trim();
      const resultSearch = this.querySelector(".search-results__item");
      if (
        isClickOutside &&
        hasValue &&
        resultSearch &&
        !this.input.closest("form")?.classList.contains("loading")
      ) {
        this.saveSearch(value);
      }
    });
    this.showSearchHistory();
    window.Shopify.designMode &&
      (document.addEventListener("shopify:section:select", (event) => {
        const currentTarget = event.target;
        if (
          JSON.parse(currentTarget.dataset.shopifyEditorSection).id ===
          this.sectionId
        ) {
          eventModal(this, "open", false);

          if (
            this.querySelector(".search-animation") &&
            this.querySelector(".search-animation").classList.contains(
              "hidden-important",
            )
          ) {
            setTimeout(() => this.focusActiveInput(), 10);
          }
        }
      }),
      document.addEventListener("shopify:section:deselect", () => {
        const searchSection = document.querySelector("action-search");
        this.getHeaderOffset();
        if (searchSection) {
          eventModal(searchSection, "close", false);
        }
      }));
  }

  get actionSearch() {
    return document.querySelectorAll(
      "#search-icon-bubble, .search-inline-trigger",
    );
  }

  get type() {
    if (window.__purityForceSearchInline) {
      return "inline";
    }
    const headerSearchType = document
      .querySelector(".header__inner[data-search-type]")
      ?.getAttribute("data-search-type");
    if (headerSearchType === "inline") {
      return "inline";
    }
    return this.getAttribute("data-type");
  }

  get usesHeaderInput() {
    return this.classList.contains("search-inline-with-header-input");
  }

  bindInputEvents(input) {
    if (!input || input.dataset.searchBound === "true") return;
    input.dataset.searchBound = "true";
    input.addEventListener("input", () => {
      this.syncHeaderClearState(input);
    });
    input.addEventListener(
      "input",
      NextSkyTheme.debounce((event) => {
        this.onInput(event);
      }, 300).bind(this),
    );
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const value = input.value.trim();
        const resultSearch = this.querySelector(".search-results__item");
        if (
          value &&
          resultSearch &&
          !input.closest("form")?.classList.contains("loading")
        ) {
          this.saveSearch(value);
        }
      }
    });
    input.addEventListener("click", this.hideAnimationText.bind(this));
  }

  connectedCallback() {
    this.saveSearchFromUrl();
    this.setupHeaderInput();
    this.actionSearch.forEach((trigger) => {
      trigger.addEventListener("click", (event) => {
        event.preventDefault();
        this.openSearch(trigger);
      });
    });
    if (this.type == "popup" || this.type == "inline") {
      this.innerWidth();
    }
  }

  setupHeaderInput() {
    const headerInput = document.querySelector(".header-search-inline__input");
    if (!headerInput || this.type !== "inline") return;
    if (this.headerInput === headerInput) return;

    this.headerInput = headerInput;
    this.bindInputEvents(headerInput);
    this.bindInlineFocusFlow();
    this.syncHeaderClearState(headerInput);

    const clearButton = headerInput.form?.querySelector(
      "[data-header-search-clear]",
    );
    if (clearButton && clearButton.dataset.searchClearBound !== "true") {
      clearButton.dataset.searchClearBound = "true";
      clearButton.addEventListener("click", () => {
        headerInput.value = "";
        this.input = headerInput;
        this.onInput();
        headerInput.focus();
      });
    }

    headerInput.addEventListener("focus", () => {
      if (window.innerWidth <= 1024) return;
      if (this._ignoreHeaderFocus) return;
      if (!this.classList.contains("active")) {
        this.openSearch(headerInput, { fromHeaderInput: true });
      }
    });
  }

  syncHeaderClearState(input) {
    if (!input?.classList.contains("header-search-inline__input")) return;
    const clearButton = input.form?.querySelector("[data-header-search-clear]");
    const isEmpty = input.value.length === 0;
    clearButton?.classList.toggle("invisible", isEmpty);
    clearButton?.classList.toggle("visibility-hidden", isEmpty);
    clearButton?.classList.toggle(
      "hidden-important",
      isEmpty && Boolean(input.form?.querySelector("voice-search")),
    );
  }

  setSearchLoading(isLoading) {
    this.form?.classList.toggle("loading", isLoading);
    const headerForm = this.headerInput?.form;
    headerForm?.classList.toggle("loading", isLoading);
    const clearButton = headerForm?.querySelector(
      "[data-header-search-clear]",
    );
    if (clearButton) clearButton.disabled = isLoading;
  }

  bindInlineFocusFlow() {
    if (this._inlineFocusBound) return;
    this._inlineFocusBound = true;

    this._onInlineTabTrap = this.onInlineTabTrap.bind(this);
    document.addEventListener("keydown", this._onInlineTabTrap, true);

    document.addEventListener("modal:closed", (event) => {
      if (event.detail?.modal !== this) return;
      this.restoreInlineSubmitFocus();
    });
  }

  onInlineTabTrap(event) {
    if (event.key !== "Tab" && event.code !== "Tab") return;
    if (!this.isInlineHeaderSearchActive()) return;

    const elements = this.getInlineTrapElements();
    if (!elements.length) return;

    event.preventDefault();

    const active = document.activeElement;
    let index = elements.indexOf(active);
    if (index === -1) {
      index = elements.findIndex((el) => el.contains(active));
    }

    if (event.shiftKey) {
      const previous = index <= 0 ? elements.length - 1 : index - 1;
      this.focusInlineTrapElement(elements[previous]);
      return;
    }

    const next =
      index === -1 || index === elements.length - 1 ? 0 : index + 1;
    this.focusInlineTrapElement(elements[next]);
  }

  getInlineTrapElements() {
    const elements = [];
    if (this.isInlineTrapElementVisible(this.headerInput)) {
      elements.push(this.headerInput);
    }

    const headerVoiceButton = this.headerInput?.form?.querySelector(
      "voice-search button",
    );
    if (this.isInlineTrapElementVisible(headerVoiceButton)) {
      elements.push(headerVoiceButton);
    }

    const headerClearButton = this.headerInput?.form?.querySelector(
      "[data-header-search-clear]",
    );
    if (this.isInlineTrapElementVisible(headerClearButton)) {
      elements.push(headerClearButton);
    }

    const closeButton = this.getInlineCloseButton();
    if (this.isInlineTrapElementVisible(closeButton)) {
      elements.push(closeButton);
    }

    this.querySelectorAll(
      "a[href], button:enabled, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, [tabindex]:not([tabindex^='-'])",
    ).forEach((el) => {
      if (elements.includes(el)) return;
      if (!this.isInlineTrapElementVisible(el)) return;
      elements.push(el);
    });

    return elements;
  }

  isInlineTrapElementVisible(el) {
    if (!el || el.disabled) return false;
    if (el.getAttribute("tabindex") === "-1") return false;
    if (el.closest("template, [hidden], [aria-hidden='true']")) return false;
    if (el.closest(".search-inline-field")) return false;

    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") {
      return false;
    }

    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  focusInlineTrapElement(el) {
    el?.focus({ preventScroll: true, focusVisible: true });
  }

  isInlineHeaderSearchActive() {
    return (
      window.innerWidth > 1024 &&
      this.type === "inline" &&
      this.usesHeaderInput &&
      this.classList.contains("active")
    );
  }

  getInlineCloseButton() {
    return this.querySelector(".modal-button-close, .modal__close");
  }

  getHeaderSubmitButton() {
    const headerSearch =
      this.headerInput?.closest(".header__search-inline") ||
      document.querySelector(".header__search-inline");
    return headerSearch?.querySelector(
      ".header-search-inline__submit, button[type='submit']",
    );
  }

  restoreInlineSubmitFocus() {
    this._ignoreHeaderFocus = true;
    const submitButton =
      this.type === "inline" && window.innerWidth > 1024
        ? this.getHeaderSubmitButton()
        : null;

    if (submitButton) {
      NextSkyTheme.global.rootToFocus = submitButton;
      requestAnimationFrame(() => {
        submitButton.focus({ preventScroll: true, focusVisible: true });
        this._ignoreHeaderFocus = false;
      });
      return;
    }

    if (NextSkyTheme.global.rootToFocus === this.headerInput) {
      NextSkyTheme.global.rootToFocus = null;
    }
    requestAnimationFrame(() => {
      this._ignoreHeaderFocus = false;
    });
  }

  syncHeaderInputMode() {
    this.classList.toggle(
      "search-inline-from-popup",
      Boolean(
        document.querySelector(
          '.header__inner[data-search-inline-source="popup"]',
        ),
      ),
    );
    this.setupHeaderInput();
    if (
      this.type === "inline" &&
      this.headerInput &&
      window.innerWidth > 1024
    ) {
      this.classList.add("search-inline-with-header-input");
      this.input = this.headerInput;
      if (this.modalInput && this.headerInput.value !== this.modalInput.value) {
        this.modalInput.value = this.headerInput.value;
      }
      return;
    }

    this.classList.remove("search-inline-with-header-input");
    this.input = this.modalInput;
    if (this.headerInput && this.modalInput) {
      this.modalInput.value = this.headerInput.value;
    }
  }

  openSearch(trigger, { fromHeaderInput = false } = {}) {
    if (
      this.recommendSearch &&
      this.recommendSearch.querySelector("template") &&
      this.templateRecommendedDefault
    ) {
      this.updateProductRecommended();
    }
    this.syncHeaderInputMode();
    this.getHeaderOffset();
    eventModal(this, "open", false);
    if (this.type === "inline") {
      this.bindHeaderOffsetSync();
      requestAnimationFrame(() => this.getHeaderOffset());
    }
    if (fromHeaderInput || this.usesHeaderInput) {
      NextSkyTheme.removeTrapFocus();
      NextSkyTheme.global.rootToFocus = this.getHeaderSubmitButton();
      setTimeout(() => {
        if (this.classList.contains("active")) {
          this.headerInput?.focus();
        }
      }, 10);
    } else {
      setTimeout(() => this.focusActiveInput(), 10);
      NextSkyTheme.global.rootToFocus = trigger;
    }
  }

  focusActiveInput() {
    this.input?.focus();
  }

  trapSearchFocus() {
    if (this.usesHeaderInput) {
      NextSkyTheme.removeTrapFocus();
      return;
    }
    NextSkyTheme.trapFocus(this);
  }

  getHeaderOffset() {
    const header = document.querySelector(".header-site");
    if (!header) return;
    const rect = header.getBoundingClientRect();
    const offset = this.type === "inline" ? rect.bottom : rect.top;
    document.body.style.setProperty("--header-offset", `${offset}px`);
  }

  bindHeaderOffsetSync() {
    if (this._headerOffsetBound) return;
    this._onHeaderOffsetSync = () => {
      if (!this.classList.contains("active") || this.type !== "inline") return;
      this.getHeaderOffset();
    };
    window.addEventListener("resize", this._onHeaderOffsetSync);
    window.addEventListener("scroll", this._onHeaderOffsetSync, {
      passive: true,
    });
    document.addEventListener("modal:closed", this._onHeaderOffsetSync);
    this._headerOffsetBound = true;
  }

  saveSearchFromUrl() {
    const hasMainSearch = document.querySelector(".section-main-search");
    if (
      hasMainSearch &&
      !hasMainSearch.classList.contains("template-search--empty")
    ) {
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q");
      if (!q) return;
      const value = q.trim();
      if (!value) return;
      this.saveSearch(value);
    }
  }

  saveSearch(value) {
    let history = JSON.parse(localStorage.getItem("search_history")) || [];

    history = history.filter(
      (item) => item.toLowerCase() !== value.toLowerCase(),
    );
    history.unshift(value);
    history = history.slice(0, 10);

    localStorage.setItem("search_history", JSON.stringify(history));
  }

  showSearchHistory() {
    const history = JSON.parse(localStorage.getItem("search_history")) || [];
    const historyContainers = this.querySelectorAll("[data-search-history]");
    if (!historyContainers.length) return;

    historyContainers.forEach((historyContainer) => {
      const list = historyContainer.querySelector(".history-list");
      const template = historyContainer.querySelector(
        "[data-history-item-template]",
      );
      const clearTemplate = historyContainer.querySelector(
        "[data-history-clear-template]",
      );
      if (!list || !template || !clearTemplate) return;

      list.innerHTML = "";
      historyContainer.classList.toggle(
        "hidden-important",
        history.length === 0,
      );
      if (!history.length) return;

      history.forEach((item) => {
        const clone = template.content.cloneNode(true);
        const link = clone.querySelector("a");
        link.querySelector(".text").textContent = item;
        link.href = `${routes.search_url}?type=product&options%5Bprefix%5D=last&q=${encodeURIComponent(item)}`;
        list.appendChild(clone);
      });
      const clearClone = clearTemplate.content.cloneNode(true);
      clearClone
        .querySelector(".clear-history-btn")
        .addEventListener("click", () => {
          localStorage.removeItem("search_history");
          this.showSearchHistory();
        });
      list.appendChild(clearClone);
    });
  }

  innerWidth() {
    let width = window.innerWidth;
    window.addEventListener("resize", () => {
      const newWidth = window.innerWidth;
      if (newWidth <= 1024 && width > 1024) {
        this.actionSearchMobile();
      }
      if (newWidth > 1024 && width <= 1024) {
        this.actionSearchDesktop();
      }
      width = newWidth;
    });
    if (width <= 1024) {
      this.actionSearchMobile();
    } else {
      this.actionSearchDesktop();
    }
  }

  updateProductRecommended() {
    const searchHistory = this.recommendSearch.querySelector(
      "[data-search-history]",
    );
    if (
      (this.classList.contains("search-type-popup") ||
        this.classList.contains("search-type-inline")) &&
      this.templateRecommendedPopup
    ) {
      const content = document.createElement("div");
      content.appendChild(
        this.templateRecommendedPopup.content.firstElementChild.cloneNode(true),
      );
      this.recommendSearch.innerHTML = content.innerHTML;
    } else {
      const content = document.createElement("div");
      content.appendChild(
        this.templateRecommendedDefault.content.firstElementChild.cloneNode(
          true,
        ),
      );
      this.recommendSearch.innerHTML = content.innerHTML;
    }
    if (searchHistory) {
      this.recommendSearch.prepend(searchHistory);
    }
    this.recommendSearch.classList.add("update-recommended");
    new LazyLoader(".image-lazy-load");
  }

  actionSearchMobile() {
    this.classList.remove("search-type-popup", "search-type-inline");
    this.classList.add("search-type-drawer");
    this.syncSearchChrome("drawer");
    this.syncHeaderInputMode();
    this.onInput();
    if (
      this.templateRecommendedDefault &&
      this.recommendSearch.classList.contains("update-recommended")
    ) {
      this.updateProductRecommended();
    }
  }

  actionSearchDesktop() {
    this.classList.remove(
      "search-type-drawer",
      "search-type-popup",
      "search-type-inline",
    );
    if (this.type === "inline") {
      this.classList.add("search-type-inline");
      this.syncSearchChrome("inline");
      this.getHeaderOffset();
      if (this.classList.contains("active")) {
        this.bindHeaderOffsetSync();
      }
    } else {
      this.classList.add("search-type-popup");
      this.syncSearchChrome("popup");
    }
    this.syncHeaderInputMode();
    this.onInput();
    if (
      this.templateRecommendedDefault &&
      this.recommendSearch.classList.contains("update-recommended")
    ) {
      this.updateProductRecommended();
    }
  }

  syncSearchChrome(mode) {
    const inner = this.querySelector(".modal-inner");
    if (!inner) return;
    if (mode === "drawer") {
      inner.classList.add("drawer-right");
      inner.classList.remove("drawer-top", "inset-y-1025-none");
      return;
    }
    inner.classList.remove("drawer-right");
    inner.classList.add("drawer-top", "inset-y-1025-none");
  }

  onInput() {
    this.hideAnimationText();
    if (!this.input) return;
    this.syncHeaderClearState(this.input);
    if (this.modalInput && this.input === this.headerInput) {
      this.modalInput.value = this.input.value;
    }
    const searchTerm = this.input.value.trim();
    if (!searchTerm.length) {
      this.form.classList.remove("results", "on-input");
      this.setSearchLoading(false);
      this.trapSearchFocus();
      return;
    }
    let predictiveSearch = "predictive-search-drawer";
    if (
      this.classList.contains("search-type-popup") ||
      this.classList.contains("search-type-inline")
    ) {
      predictiveSearch = "predictive-search-popup";
    }
    this.form.classList.add("on-input");
    if (this.predictiveSearchResults) {
      this.setSearchLoading(true);
      this.getSearchResults(searchTerm, predictiveSearch);
      return;
    }
    this.setSearchLoading(false);
    this.trapSearchFocus();
  }

  getSearchResults(searchTerm, predictiveSearch) {
    const query = `${routes.predictive_search_url}?q=${encodeURIComponent(
      searchTerm,
    )}&section_id=${predictiveSearch}&resources[options][fields]=title,tag,vendor,product_type,variants.title,variants.sku&resources[limit]=10&resources[limit_scope]=each`;
    fetch(query)
      .then((response) => {
        if (!response.ok) {
          var error = new Error(response.status);
          this.form.classList.remove("results");
          this.setSearchLoading(false);
          throw error;
        }
        return response.text();
      })
      .then((text) => {
        const resultsMarkup = new DOMParser()
          .parseFromString(text, "text/html")
          .querySelector(`#shopify-section-${predictiveSearch}`)?.innerHTML;
        if (this.predictiveSearchResults) {
          this.predictiveSearchResults.innerHTML = resultsMarkup;
        }
        this.setSearchLoading(false);
        this.form.classList.add("results");
        if (this.querySelectorAll(".more-result-link").length > 0) {
          this.querySelectorAll(".more-result-link").forEach((e) => {
            e.href = `${routes.search_url}?q=${encodeURIComponent(
              searchTerm,
            )}&options%5Bprefix%5D=last`;
          });
        }
        this.trapSearchFocus();
      })
      .catch((error) => {
        this.form.classList.remove("results");
        this.setSearchLoading(false);
        throw error;
      });
  }

  hideAnimationText() {
    if (this.querySelector(".search-animation")) {
      this.querySelector(".search-animation").classList.add("hidden-important");
    }
  }
}
customElements.define("action-search", ActionSearch);

class SearchText extends HTMLElement {
  constructor() {
    super();
    Motion.inView(this, this.init.bind(this));
  }

  async init() {
    await this.animation(this.getAttribute("data-text"));
  }

  async animation(text) {
    ((this.innerHTML = text),
      await Motion.animate(
        this,
        {
          width: [0, `${this.scrollWidth + 1}px`],
        },
        {
          duration: 0.7,
          delay: 0.5,
        },
      ).finished,
      this.closest(".search-animation")
        .querySelector(".text-cursor")
        .classList.remove("hidden-important"));
  }
}
customElements.define("search-text", SearchText);
