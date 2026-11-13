import * as NextSkyTheme from "@NextSkyTheme/global";
import { eventModal } from "@NextSkyTheme/modal";

class ButtonBoughtTogetherMobile extends HTMLElement {
  constructor() {
    super();
    this.boughtTogetherList = null;
    this.boughtTogetherParent = null;
    this.scrollHandler = null; 
    this.init();
  }

  init() {
    this.addEventListener("click", this.handleClick.bind(this));
    this.handleResponsive();
    window.addEventListener("resize", this.handleResponsive.bind(this));

    const elementsRemove = document.querySelectorAll(".always-remove");
    if (elementsRemove.length > 0) {
      elementsRemove.forEach((el) => el.remove());
    }
  }

  setupScrollListener() {
    const scrollContainer = document.querySelector(
      "bought-together-popup .drawer__body"
    );
    const overlayContainer = document.querySelector(
      "bought-together-popup .overlay-bought-container"
    );

    if (!scrollContainer || !overlayContainer) return;

    let lastScrollTop = 0;
    let hasReachedBottom = false;

    this.scrollHandler = function () {
      let currentScrollTop = this.scrollTop;
      const isScrollingDown = currentScrollTop > lastScrollTop;
      const isAtBottom =
        this.scrollHeight - currentScrollTop <= this.clientHeight + 5;

      if (isScrollingDown && isAtBottom && !hasReachedBottom) {
        overlayContainer.classList.remove("overlay-bought");
        hasReachedBottom = true;
      } else if (!isAtBottom && hasReachedBottom) {
        overlayContainer.classList.add("overlay-bought");
        hasReachedBottom = false;
      }

      lastScrollTop = currentScrollTop;
    }.bind(scrollContainer);

    scrollContainer.addEventListener("scroll", this.scrollHandler);
  }

  removeScrollListener() {
    const scrollContainer = document.querySelector(
      "bought-together-popup .drawer__body"
    );
    if (scrollContainer && this.scrollHandler) {
      scrollContainer.removeEventListener("scroll", this.scrollHandler);
      this.scrollHandler = null;
    }
  }

  handleResponsive() {
    const isMobile = window.innerWidth <= 767;
    const boughtTogetherList = document.querySelector(".bought-together-list");

    if (isMobile) {
      if (boughtTogetherList && !this.boughtTogetherList) {
        this.boughtTogetherList = boughtTogetherList.cloneNode(true);
        this.boughtTogetherParent = boughtTogetherList.parentNode;
        boughtTogetherList.remove();
        const drawerBody =
          this.closest("section").querySelector(".drawer__body");
        if (drawerBody) {
          drawerBody.prepend(this.boughtTogetherList.cloneNode(true));
        }
      }
    } else {
      this.removeScrollListener();
      if (this.boughtTogetherList && this.boughtTogetherParent) {
        const drawerBody =
          this.closest("section").querySelector(".drawer__body");
        if (drawerBody) {
          const drawerBoughtList = drawerBody.querySelector(
            ".bought-together-list"
          );
          if (drawerBoughtList) drawerBoughtList.remove();
        }
        if (!document.querySelector(".bought-together-list")) {
          this.boughtTogetherParent.appendChild(this.boughtTogetherList);
          this.boughtTogetherList = null;
          this.boughtTogetherParent = null;
        }
      }

      if (document.querySelector("bought-together-popup.active")) {
        eventModal(
          this.closest("section").querySelector("bought-together-popup"),
          "close",
          false
        );
      }
    }
  }

  handleClick(event) {
    event.preventDefault();
    const section = this.closest("section").querySelector(
      "bought-together-popup"
    );

    setTimeout(() => {
      eventModal(section, "open", false);
      setTimeout(() => this.setupScrollListener(), 300);
    }, 100);

    NextSkyTheme.global.rootToFocus = this;
    const handlePopupClose = () => {
      this.removeScrollListener();
      section.removeEventListener("modal:close", handlePopupClose);
    };

    section.addEventListener("modal:close", handlePopupClose);
  }

  disconnectedCallback() {
    this.removeScrollListener();
    window.removeEventListener("resize", this.handleResponsive.bind(this));
  }
}

customElements.define(
  "button-bought-together-mobile",
  ButtonBoughtTogetherMobile
);
