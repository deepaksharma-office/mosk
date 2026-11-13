import * as NextSkyTheme from "@NextSkyTheme/global";
import { eventModal } from "@NextSkyTheme/modal";

const DESKTOP_MEDIA_QUERY = "(min-width: 1025px)";

class ExpandableCard extends HTMLElement {
  constructor() {
    super();
    this.openDrawer = this.openDrawer.bind(this);
    this.openHoverState = this.openHoverState.bind(this);
    this.closeHoverState = this.closeHoverState.bind(this);
    this.closeDrawerState = this.closeDrawerState.bind(this);
    this.toggleClickState = this.toggleClickState.bind(this);
    this.onInteractionModeChange = this.onInteractionModeChange.bind(this);
  }

  connectedCallback() {
    this.trigger = this.querySelector(".expandable-card__toggle");
    if (!this.trigger) return;

    if (this.dataset.behavior === "drawer") {
      this.trigger.addEventListener("click", this.openDrawer);
      document.addEventListener("modal:closed", this.closeDrawerState);
      return;
    }

    this.desktopMediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
    this.desktopMediaQuery.addEventListener("change", this.onInteractionModeChange);
    this.onInteractionModeChange();
  }

  disconnectedCallback() {
    if (this.trigger) {
      this.trigger.removeEventListener("click", this.openDrawer);
      this.trigger.removeEventListener("click", this.toggleClickState);
    }
    document.removeEventListener("modal:closed", this.closeDrawerState);
    this.desktopMediaQuery?.removeEventListener("change", this.onInteractionModeChange);
    this.disableHoverInteraction();
  }

  onInteractionModeChange() {
    if (this.desktopMediaQuery.matches) {
      this.enableHoverInteraction();
      this.disableClickInteraction();
    } else {
      this.disableHoverInteraction();
      this.enableClickInteraction();
    }
  }

  enableHoverInteraction() {
    if (this.hoverEnabled) return;
    this.hoverEnabled = true;
    this.addEventListener("pointerenter", this.openHoverState);
    this.addEventListener("pointerleave", this.closeHoverState);
    this.addEventListener("focusin", this.openHoverState);
    this.addEventListener("focusout", this.closeHoverState);
  }

  disableHoverInteraction() {
    if (!this.hoverEnabled) return;
    this.hoverEnabled = false;
    this.removeEventListener("pointerenter", this.openHoverState);
    this.removeEventListener("pointerleave", this.closeHoverState);
    this.removeEventListener("focusin", this.openHoverState);
    this.removeEventListener("focusout", this.closeHoverState);
    this.classList.remove("detail-open");
    this.trigger?.setAttribute("aria-expanded", "false");
  }

  enableClickInteraction() {
    if (this.clickEnabled) return;
    this.clickEnabled = true;
    this.trigger.addEventListener("click", this.toggleClickState);
  }

  disableClickInteraction() {
    if (!this.clickEnabled) return;
    this.clickEnabled = false;
    this.trigger.removeEventListener("click", this.toggleClickState);
    this.classList.remove("detail-open");
    this.trigger.setAttribute("aria-expanded", "false");
  }

  openHoverState() {
    this.classList.add("detail-open");
  }

  closeHoverState(event) {
    if (event.type === "focusout" && this.contains(event.relatedTarget)) return;
    this.classList.remove("detail-open");
  }

  toggleClickState(event) {
    event.preventDefault();
    event.stopPropagation();
    const isOpen = this.classList.toggle("detail-open");
    this.trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }

  closeDrawerState(event) {
    if (event.detail?.modal !== this.drawer) return;

    this.classList.remove("detail-open");
    this.trigger?.setAttribute("aria-expanded", "false");
    this.drawer = null;
  }

  openDrawer(event) {
    event.preventDefault();
    const template = document.getElementById(this.dataset.drawerTemplate);
    if (!template) return;

    const drawer = template.content.firstElementChild.cloneNode(true);
    this.drawer = drawer;
    this.classList.add("detail-open");
    this.trigger.setAttribute("aria-expanded", "true");
    NextSkyTheme.getBody().appendChild(drawer);
    drawer.offsetHeight;

    requestAnimationFrame(() => {
      eventModal(drawer, "open", true, null, true);
      NextSkyTheme.global.rootToFocus = this.trigger;
    });
  }
}

if (!customElements.get("expandable-card")) {
  customElements.define("expandable-card", ExpandableCard);
}
