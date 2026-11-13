import * as NextSkyTheme from "@NextSkyTheme/global";
import { eventModal } from "@NextSkyTheme/modal";

if (!customElements.get("outfit-item")) {
  customElements.define(
    "outfit-item",
    class OutfitItem extends HTMLElement {
      constructor() {
        super();
        this.isAction = this.querySelector("outfit-action");
      }

      connectedCallback() {
        this.isAction.addEventListener(
          "click",
          this.initPopup.bind(this),
          false
        );
        this.isAction.addEventListener(
          "keypress",
          function (event) {
            if (event.key === "Enter") {
              this.initPopup.bind(this)(event);
            }
          }.bind(this),
          false
        );
      }

      initPopup() {
        const template = this.querySelector("template.outfit-popup");
        if (template) {
          const content = document.createElement("div");
          content.appendChild(
            template.content.firstElementChild.cloneNode(true)
          );
          NextSkyTheme.getBody().appendChild(
            content.querySelector("outfit-popup")
          );
          setTimeout(
            () =>
              eventModal(document.querySelector("outfit-popup"), "open", true),
            100
          );
        }
        NextSkyTheme.global.rootToFocus = this.isAction;
      }
    }
  );
}
