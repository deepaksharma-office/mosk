import { eventModal } from "@NextSkyTheme/modal";
import * as NextSkyTheme from "@NextSkyTheme/global";

class PopupLink extends HTMLElement {
  constructor() {
    super();
    this.sectionId = this.dataset.sectionId;
    this.isDraggable = this.dataset.drag === "true";

    this.boundHandleClick = this.handleClick.bind(this);
    this.boundHandleKeydown = this.handleKeydown.bind(this);
  }

  connectedCallback() {
    this.addEventListener("click", this.boundHandleClick, false);
    this.addEventListener("keydown", this.boundHandleKeydown, false);
  }

  handleClick(event) {
    event.preventDefault();
    this.openPopup(event);
  }

  handleKeydown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.openPopup(event);
    }
  }

  openPopup(event) {
    const linkPopupTemplate = event.target.closest(".popup-links")?.querySelector("template");

    if (!linkPopupTemplate) return;

    const clone = linkPopupTemplate.content.cloneNode(true);
    const popupElement = clone.querySelector("link-popup");

    if (popupElement) {
      NextSkyTheme.getBody().appendChild(popupElement);

      setTimeout(() => {
        eventModal(popupElement, "open", true, null, false);
      }, 100);

      NextSkyTheme.global.rootToFocus = this.sizeChart || this;
    }
  }

  disconnectedCallback() {
    this.removeEventListener("click", this.boundHandleClick, false);
    this.removeEventListener("keydown", this.boundHandleKeydown, false);
  }
}

customElements.define("popup-link", PopupLink);