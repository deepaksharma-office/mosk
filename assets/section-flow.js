class Flow extends HTMLElement {
  connectedCallback() {
    if (this._bound) return;
    this._bound = true;
    this.triggers = Array.from(this.querySelectorAll(".flow__trigger"));
    this.panels = Array.from(this.querySelectorAll(".flow__panel"));
    this.desktopQuery = window.matchMedia("(min-width: 1025px)");
    this.prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.onPointerOver = this.onPointerOver.bind(this);
    this.onClick = this.onClick.bind(this);
    this.onFocusIn = this.onFocusIn.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);

    this.addEventListener("pointerover", this.onPointerOver);
    this.addEventListener("click", this.onClick);
    this.addEventListener("focusin", this.onFocusIn);
    this.addEventListener("keydown", this.onKeyDown);

    const defaultStep = Number(this.dataset.defaultActiveStep) || 1;
    this.setActive(defaultStep, { animate: false });
  }

  disconnectedCallback() {
    this.removeEventListener("pointerover", this.onPointerOver);
    this.removeEventListener("click", this.onClick);
    this.removeEventListener("focusin", this.onFocusIn);
    this.removeEventListener("keydown", this.onKeyDown);
    this._bound = false;
  }

  getTrigger(target) {
    return target.closest(".flow__trigger");
  }

  onPointerOver(event) {
    if (!this.desktopQuery.matches) return;
    this.activateTrigger(this.getTrigger(event.target));
  }

  onClick(event) {
    this.activateTrigger(this.getTrigger(event.target));
  }

  onFocusIn(event) {
    this.activateTrigger(this.getTrigger(event.target));
  }

  activateTrigger(trigger) {
    if (!trigger) return;
    const step = Number(trigger.dataset.stepIndex);
    if (!Number.isFinite(step)) return;
    this.setActive(step);
  }

  onKeyDown(event) {
    const trigger = this.getTrigger(event.target);
    if (!trigger) return;

    const currentIndex = this.triggers.indexOf(trigger);
    let nextIndex;

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % this.triggers.length;
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + this.triggers.length) % this.triggers.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = this.triggers.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    this.triggers[nextIndex]?.focus();
  }

  animateDescription(content, open, { animate = true } = {}) {
    if (!content) return;

    const duration = animate && !this.prefersReducedMotion?.matches ? 0.3 : 0;

    if (typeof Motion === "undefined") {
      content.style.height = open ? "auto" : "0px";
      return;
    }

    Motion.animate(content, { height: open ? "auto" : 0 }, { duration });
  }

  setActive(stepIndex, { animate = true } = {}) {
    const max = this.triggers.length;
    if (!max) return;
    const next = Math.min(Math.max(stepIndex, 1), max);
    if (this.activeStep === next) return;
    this.activeStep = next;

    this.triggers.forEach((trigger) => {
      const active = Number(trigger.dataset.stepIndex) === next;
      trigger.classList.toggle("is-active", active);
      trigger.setAttribute("aria-selected", active ? "true" : "false");
      trigger.tabIndex = active ? 0 : -1;
      trigger.querySelector(".flow__badge")?.classList.toggle("active", active);
      this.animateDescription(
        trigger.querySelector(".flow__description"),
        active,
        { animate },
      );
    });

    this.panels.forEach((panel) => {
      const active = Number(panel.dataset.stepIndex) === next;
      if (!animate) {
        panel.classList.toggle("is-active", active);
        if (active) {
          panel.removeAttribute("hidden");
        } else {
          panel.setAttribute("hidden", "");
        }
        return;
      }

      if (active) {
        panel.removeAttribute("hidden");
        requestAnimationFrame(() => {
          panel.classList.add("is-active");
        });
      } else {
        panel.classList.remove("is-active");
        window.setTimeout(() => {
          if (!panel.classList.contains("is-active")) {
            panel.setAttribute("hidden", "");
          }
        }, 450);
      }
    });
  }
}

if (!customElements.get("flow-section")) {
  customElements.define("flow-section", Flow);
}
