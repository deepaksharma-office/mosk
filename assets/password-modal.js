import * as NextSkyTheme from "@NextSkyTheme/global";
import { eventModal } from "@NextSkyTheme/modal";

class PopupPassword extends HTMLElement {
  constructor() {
    super();
    this.init();
  }
  init() {
    this.addEventListener("click", this.onClick.bind(this), false);
    this.addEventListener("keydown", this.onKeyDown.bind(this), false);
  }
  onKeyDown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      this.onClick(e);
    }
  }
  onClick(e) {
    const passwordModal = e.target
      .closest("popup-password")
      .querySelector("template");
    console.log(passwordModal);
    
    if (passwordModal) {
      const content = document.createElement("div");
      content.appendChild(
        passwordModal.content.firstElementChild.cloneNode(true)
      );
      NextSkyTheme.getBody().appendChild(
        content.querySelector("password-modal-popup")
      );
    }
    setTimeout(
      () =>
        eventModal(document.querySelector("password-modal-popup"), "open", true),
      100
    );
    NextSkyTheme.global.rootToFocus = this;
  }
}

customElements.define("popup-password", PopupPassword);
