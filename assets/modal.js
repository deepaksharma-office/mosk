import * as NextSkyTheme from "@NextSkyTheme/global";
import { notifier } from "@NextSkyTheme/notification";

function updateModalRootState(modal, isOpen) {
  if (!modal) return;

  const root = NextSkyTheme.getRoot();

  if (modal.matches("cart-drawer")) {
    root.classList.toggle("open-modal-cart-drawer", isOpen);
  }
  if (modal.matches("action-search")) {
    const isSearchPopup = modal.matches(
      "action-search.search-type-popup, action-search.search-type-inline"
    );
    const isSearchInline = modal.matches(
      "action-search.search-inline-with-header-input"
    );
    root.classList.toggle("open-modal-search-popup", isOpen && isSearchPopup);
    root.classList.toggle("open-modal-search-inline", isOpen && isSearchInline);
  }
  if (modal.matches("offer-popup, .modal-offer-wrapper")) {
    root.classList.toggle("open-modal-offer-popup", isOpen);
  }
  if (modal.matches(".modal-shopable-video")) {
    root.classList.toggle("open-modal-shopable-video", isOpen);
  }
}

export async function eventModal(
  element,
  event,
  removeElementAfter = false,
  actionModal = null,
  actionMobile = false,
  removeModal = true
) {
  if (event == "open") {
    updateModalRootState(element, true);
    document.dispatchEvent(new CustomEvent("modal:opened"));
    NextSkyTheme.getRoot().classList.add("open-modal");
    element.classList.remove("content-hidden");
    element.classList.add("active");
    if (removeElementAfter) {
      element.classList.add("remove-after");
    }
    if (actionModal == "delay" && element.querySelector(".model_media")) {
      element.classList.add("delay");
      setTimeout(() => {
        element.querySelector(".model_media").classList.add("open");
      }, 350);
    }
    if (actionMobile) {
      const modalBody = element.querySelector(".modal-body");
      if (modalBody && !modalBody.querySelector("draggable-modal")) {
        const draggableModal = document.createElement("draggable-modal");
        draggableModal.classList.add(
          "block",
          "hidden-1025",
          "relative",
          "pointer"
        );
        modalBody.prepend(draggableModal);
      }
    }
    if (removeModal) {
      element.classList.add("remove");
    }

    const elementFocus =
      element.querySelector(".modal-inner") ||
      element.querySelector(".modal-focus");
    NextSkyTheme.trapFocus(elementFocus);
  } else {
    const active_modal = document.querySelectorAll(".active-modal-js.active");
    const modal_element = element.classList.contains("active-modal-js")
      ? element
      : element.closest(".active-modal-js");
    updateModalRootState(modal_element, false);
    const focus_item = modal_element.hasAttribute("data-focus-item")
      ? modal_element.getAttribute("data-focus-item")
      : "";
    const modalDrawer = modal_element.hasAttribute("drawer");
    if (modal_element.classList.contains("delay")) {
      if (modal_element.querySelector(".model_media")) {
        await setTimeout(() => {
          modal_element.classList.remove("active", "delay");
          if (active_modal.length <= 1) {
            removeModalAction(modal_element);
          }
        }, 350);
        modal_element.querySelector(".model_media").classList.remove("open");
      } else {
        modal_element.classList.remove("active", "delay");
        removeModalAction(modal_element);
      }
    } else {
      modal_element.classList.remove("active");
    }
    document.dispatchEvent(
      new CustomEvent("modal:closed", {
        detail: {
          modal: modal_element,
        },
      })
    );
    if (modal_element.classList.contains("remove-after")) {
      const modalNoRemove = modal_element.dataset.removeAfter === "true";
      await setTimeout(() => {
        if (focus_item && focus_item == "FacetsDrawer") {
          document
            .getElementById(focus_item)
            .parentNode.insertBefore(
              modal_element,
              modal_element.parentNode.nextElementSibling
            );
          modal_element.classList.remove("remove-after");
        } else {
          if (modalNoRemove) {
            modal_element.classList.remove("remove-after");
          } else {
            if (modal_element.classList.contains("remove")) {
              modal_element.remove();
            }
          }
        }
      }, 600);
    }
    if (modalDrawer) {
      setTimeout(() => {
        if (!modal_element.classList.contains("active")) {
          modal_element.classList.add("content-hidden");
        }
      }, 1000);
    }
    if (!modal_element.classList.contains("delay")) {
      if (active_modal.length <= 1) {
        removeModalAction(modal_element);
      }
    }
    NextSkyTheme.removeTrapFocus(NextSkyTheme.global.rootToFocus);
    NextSkyTheme.global.rootToFocus = null;
  }
}

function removeModalAction(modal_element) {
  const elements = modal_element.querySelectorAll("button, .drawer-bottom");
  elements.forEach((element) => {
    if (element.tagName === "BUTTON") {
      element.classList.remove("active");
    } else {
      element.classList.remove("open");
    }
  });

  requestAnimationFrame(() => {
    setTimeout(() => {
      NextSkyTheme.getRoot().classList.remove("open-modal");
    }, 300);
    NextSkyTheme.getRoot().classList.remove(
      "open-modal-shopable-video",
      "open-modal-offer-popup",
      "open-modal-search-popup",
      "open-modal-search-inline",
      "open-modal-cart-drawer"
    );
  });

  const videos = [...modal_element.querySelectorAll("video")];
  videos.forEach((video) => {
    video.muted = true;
  });
}

const NEWSLETTER_SUCCESS_COOKIE = "newsletter_popup_success";
const NEWSLETTER_STICKY_VISIBLE_COOKIE = "newsletter_discount_sticky_visible";

export function checkUrlParameters() {
  const urlInfo = window.location.href;
  const newURL = location.href.split("?")[0];
  if (urlInfo.indexOf("customer_posted=true") >= 1) {
    createAfterSubmit();
    NextSkyTheme.setCookie(NEWSLETTER_SUCCESS_COOKIE, "true", 365);
    NextSkyTheme.deleteCookie(NEWSLETTER_STICKY_VISIBLE_COOKIE);
    window.history.pushState("object", document.title, newURL);
    return true;
  }
  if (urlInfo.indexOf("contact%5Btags%5D=newsletter&form_type=customer") >= 1) {
    notifier.show(message.newsletter.error, "error", 4000);
    window.history.pushState("object", document.title, newURL);
    return false;
  }

  return false;
}

function createAfterSubmit() {
  const template = document.querySelector("discount-modal-popup");
  if (template) {
    eventModal(template, "open", false, null, true);
    NextSkyTheme.global.rootToFocus = template;
  } else {
    notifier.show(message.newsletter.success, "success", 4000);
  }
}

checkUrlParameters();
class DraggableModal extends HTMLElement {
  constructor() {
    super();
    this.isDragging = false;
    this.startY = 0;
    this.currentY = 0;
    this.threshold = 100;

    this.startDrag = this.startDrag.bind(this);
    this.onDrag = this.onDrag.bind(this);
    this.endDrag = this.endDrag.bind(this);
    this.init();
  }

  init() {
    let width = window.innerWidth;
    window.addEventListener("resize", () => {
      const newWidth = window.innerWidth;
      if (newWidth <= 1024 && width > 1024) {
        this.onMobile();
      }
      width = newWidth;
    });
    if (width <= 1024) {
      this.onMobile();
    }
  }

  onMobile() {
    this.modalElement = this.closest(".active-modal-js");
    if (!this.modalElement) return;
    this.addEventListener("touchstart", this.startDrag, { passive: true });
    this.addEventListener("mousedown", this.startDrag);
    document.addEventListener("touchmove", this.onDrag, { passive: false });
    document.addEventListener("mousemove", this.onDrag);
    document.addEventListener("touchend", this.endDrag);
    document.addEventListener("mouseup", this.endDrag);
  }

  connectedCallback() {
    this.modalElement = this.closest(".active-modal-js");
    if (!this.modalElement) return;
    if (window.innerWidth >= 1025) {
      return;
    }
    this.addEventListener("touchstart", this.startDrag, { passive: true });
    this.addEventListener("mousedown", this.startDrag);
    document.addEventListener("touchmove", this.onDrag, { passive: false });
    document.addEventListener("mousemove", this.onDrag);
    document.addEventListener("touchend", this.endDrag);
    document.addEventListener("mouseup", this.endDrag);
  }

  disconnectedCallback() {
    this.removeEventListener("touchstart", this.startDrag);
    this.removeEventListener("mousedown", this.startDrag);
    document.removeEventListener("touchmove", this.onDrag);
    document.removeEventListener("mousemove", this.onDrag);
    document.removeEventListener("touchend", this.endDrag);
    document.removeEventListener("mouseup", this.endDrag);
  }

  startDrag(e) {
    if (!this.modalElement) return;

    this.isDragging = true;
    this.startY = e.type.includes("mouse") ? e.clientY : e.touches[0].clientY;
    this.currentY = this.startY;

    this.modalElement.classList.add("is-dragging");
    this.style.cursor = "grabbing";

    const modalBody = this.modalElement.querySelector(".modal-draggable");
    if (modalBody) {
      modalBody.style.transition = "none";
    }
  }

  onDrag(e) {
    if (!this.isDragging || !this.modalElement) return;

    e.preventDefault();

    this.currentY = e.type.includes("mouse") ? e.clientY : e.touches[0].clientY;
    const dragDistance = this.currentY - this.startY;

    if (dragDistance > 0) {
      const resistance = 0.4;
      const modalBody = this.modalElement.querySelector(".modal-draggable");

      if (modalBody) {
        modalBody.style.transform = `translateY(${
          dragDistance * resistance
        }px)`;
      }
    }
  }

  endDrag() {
    if (!this.isDragging || !this.modalElement) return;

    const dragDistance = this.currentY - this.startY;
    this.isDragging = false;
    this.style.cursor = "grab";
    this.modalElement.classList.remove("is-dragging");

    const modalBody = this.modalElement.querySelector(".modal-draggable");
    if (!modalBody) return;

    modalBody.style.transition = "transform 0.1s ease-in-out";

    if (dragDistance > this.threshold) {
      modalBody.style.transform = `translateY(100%)`;

      setTimeout(() => {
        eventModal(this.modalElement, "close");

        modalBody.style.transform = "";
        modalBody.style.transition = "";
      }, 300);
    } else {
      modalBody.style.transform = "";
      setTimeout(() => {
        modalBody.style.transition = "";
      }, 300);
    }
  }
}
customElements.define("draggable-modal", DraggableModal);
