import * as NextSkyTheme from "@NextSkyTheme/global";
class LocalizationForm extends HTMLElement {
  constructor() {
    super();
    this.elements = {
      input: this.querySelector(
        'input[name="language_code"], input[name="country_code"]'
      ),
      button: this.querySelector("button"),
      buttonClose: this.querySelector("button.modal__close"),
      panel: this.querySelector("ul"),
      panelWrapper: this.querySelector(".disclosure__list-wrapper"),
    };
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    if (isSafari) {
      this.elements.button.addEventListener("blur", this.closeSelector.bind(this));
      this.elements.button.addEventListener("mousedown", this.openSelector.bind(this));
    } else {
      this.elements.button.addEventListener("click", this.openSelector.bind(this));
    }
    this.elements.buttonClose.addEventListener("click", this.closeSelector.bind(this));
    this.addEventListener("keyup", this.onContainerKeyUp.bind(this));
    this.querySelectorAll("a").forEach((item) =>
      item.addEventListener("click", this.onItemClick.bind(this))
    );
    this.onBodyClick = this.handleBodyClick.bind(this);
    this.currentMediaQuery = null;
    this.mediaQueryHandler = null;
  }

  handleBodyClick(evt) {
    const target = evt.target;
    if (target != this && !target.closest("localization-form")) {
      this.hidePanel();
    }
  }

  hidePanel() {
    document.body.removeEventListener("click", this.onBodyClick);
    this.elements.button.setAttribute('aria-expanded', 'false');
    this.elements.button.classList.remove("opened");
    this.elements.panelWrapper.setAttribute('hidden', true);
    
    if (this.currentMediaQuery && this.mediaQueryHandler) {
      this.currentMediaQuery.removeEventListener("change", this.mediaQueryHandler);
      this.currentMediaQuery = null;
      this.mediaQueryHandler = null;
    }
    if (NextSkyTheme.getRoot().classList.contains("open-modal")) {
      setTimeout(() => {
        NextSkyTheme.getRoot().classList.remove("open-modal", "open-modal-localization");
      }, 300);
    }
  }

  onContainerKeyUp(event) {
    if (event.code.toUpperCase() !== "ESCAPE") return;
    if(this.elements.button.getAttribute('aria-expanded') == 'false') return;

    this.hidePanel();
    event.stopPropagation();
    this.elements.button.focus();
  }

  onItemClick(event) {
    event.preventDefault();
    const form = this.querySelector("form");
    this.elements.input.value = event.currentTarget.dataset.value;
    if (form) form.submit();
  }

  openSelector() {
    if (this.elements.button.classList.contains("opened")) {
      this.hidePanel();
    } else {
      document.body.addEventListener("click", this.onBodyClick);
      this.elements.button.setAttribute(
        'aria-expanded',
        (this.elements.button.getAttribute('aria-expanded') === 'false').toString()
      );
      this.elements.button.focus();
      this.elements.panelWrapper.toggleAttribute('hidden');
      for (var item of document.querySelectorAll(".button-localization")) {
        item.classList.remove("opened");
      }
      requestAnimationFrame(() => {
        this.elements.button.classList.add("opened");
        const mediaQuery = window.matchMedia("(max-width: 1024.98px)");
        this.mediaQueryHandler = (mediaQuery) => {
          if (mediaQuery.matches) {
            NextSkyTheme.getRoot().classList.add("open-modal", "open-modal-localization");
          } else {
            if (NextSkyTheme.getRoot().classList.contains("open-modal")) {
              setTimeout(() => {
                NextSkyTheme.getRoot().classList.remove("open-modal", "open-modal-localization");
              }, 300);
            }
          }
        };
        this.mediaQueryHandler(mediaQuery);
        mediaQuery.addEventListener("change", this.mediaQueryHandler);
        this.currentMediaQuery = mediaQuery;
      });
    }
  }

  closeSelector(event) {
    const shouldClose =
      event.relatedTarget && event.relatedTarget.nodeName === "BUTTON";
    if (event.relatedTarget === null || shouldClose) {
      this.hidePanel();
    }
  }
}
customElements.define("localization-form", LocalizationForm);


class DraggableLocalization extends HTMLElement {
  constructor() {
    super();
    
    this.isDragging = false;
    this.startY = 0;
    this.currentY = 0;
    this.threshold = 50;
    
    this.startDrag = this.startDrag.bind(this);
    this.onDrag = this.onDrag.bind(this);
    this.endDrag = this.endDrag.bind(this);

    this.localizationForm = this.closest('localization-form');
    
    if (!this.localizationForm) return;
    
    this.buttonElement = this.localizationForm.querySelector("button");
    this.panelWrapper = this.localizationForm.querySelector(".disclosure__list-wrapper");
  }

  connectedCallback() {
    if (!this.localizationForm) return;
    this.addEventListener('touchstart', this.startDrag, { passive: true, capture: true });
    this.addEventListener('mousedown', this.startDrag);
    document.addEventListener('touchmove', this.onDrag, { passive: false });
    document.addEventListener('mousemove', this.onDrag);
    document.addEventListener('touchend', this.endDrag);
    document.addEventListener('mouseup', this.endDrag);
    
    this.classList.add('draggable');
    this.style.cursor = 'grab';
  }

  disconnectedCallback() {
    this.removeEventListener('touchstart', this.startDrag);
    this.removeEventListener('mousedown', this.startDrag);
    document.removeEventListener('touchmove', this.onDrag);
    document.removeEventListener('mousemove', this.onDrag);
    document.removeEventListener('touchend', this.endDrag);
    document.removeEventListener('mouseup', this.endDrag);
  }

  startDrag(e) {
    const shouldClose = e.target.closest(".modal__close");
    if (!this.panelWrapper || shouldClose) return;
    this.isDragging = true;
    this.startY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    this.currentY = this.startY;
    this.panelWrapper.style.transition = 'none';
  }

  onDrag(e) {
    const shouldClose = e.target.closest(".modal__close");
    if (!this.isDragging || !this.panelWrapper || shouldClose) return;
    e.preventDefault();
    this.currentY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    const dragDistance = this.currentY - this.startY;
    if (dragDistance > 0) {
      const resistance = 0.4;
      this.panelWrapper.style.transform = `translateY(${dragDistance * resistance}px)`;
    }
  }

  endDrag(e) {
    const shouldClose = e.target.closest(".modal__close");
    if (!this.isDragging || !this.panelWrapper || shouldClose) return;
    const dragDistance = this.currentY - this.startY;
    this.isDragging = false;
    this.panelWrapper.style.transition = 'transform 0.3s ease-out';
    if (dragDistance > this.threshold) {
      this.closePanel();
    } else {
      this.resetPanelPosition();
    }
  }
  
  closePanel() {
    this.panelWrapper.style.transform = 'translateY(100%)';
    setTimeout(() => {
      this.hidePanel();
      this.resetPanelPosition();
    }, 300);
  }
  
  resetPanelPosition() {
    this.panelWrapper.style.transform = '';
    setTimeout(() => {
      this.panelWrapper.style.transition = '';
    }, 300);
  }

  hidePanel() {
    if (this.buttonElement) {
      this.buttonElement.setAttribute('aria-expanded', 'false');
      this.buttonElement.classList.remove("opened");
    }
    if (this.panelWrapper) {
      this.panelWrapper.setAttribute('hidden', true);
    }
    if (NextSkyTheme.getRoot().classList.contains("open-modal")) {
      setTimeout(() => {
        NextSkyTheme.getRoot().classList.remove("open-modal", "open-modal-localization");
      }, 300);
    }
  }
}

customElements.define('draggable-localization', DraggableLocalization);