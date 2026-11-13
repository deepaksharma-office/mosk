class ScrollScatter extends HTMLElement {
  connectedCallback() {
    this.init();
  }

  init() {
    this.items = Array.from(this.querySelectorAll("[data-parallax-cards-item]"));
    this.lead = this.querySelector("[data-parallax-cards-lead]");
    this.cta = this.querySelector("[data-parallax-cards-cta]");
    this.glow = this.querySelector("[data-parallax-cards-glow]");
    this.reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.animationFrame = null;

    if (!this.items.length) return;

    if (this.reduceMotion) {
      this.renderReducedMotion();
      return;
    }

    this.render = this.render.bind(this);
    this.render(0);
  }

  disconnectedCallback() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  lerp(start, end, progress) {
    return start + (end - start) * progress;
  }

  ease(progress) {
    if (progress < 0.5) {
      return 4 * progress * progress * progress;
    }

    return 1 - Math.pow(-2 * progress + 2, 3) / 2;
  }

  progress() {
    const total = this.offsetHeight - window.innerHeight;

    if (total <= 0) return 1;

    return this.clamp(-this.getBoundingClientRect().top / total, 0, 1);
  }

  render(time = 0) {
    const progress = this.progress();
    const easedProgress = this.ease(progress);
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const isMobile = viewportWidth <= 767.98;
    const endOverflow = isMobile ? 1.20 : 1;

    this.items.forEach((item) => {
      const data = item.dataset;
      const startX = Number(data.sx) * Math.min(viewportWidth, item.offsetWidth * 4.2);
      const endX = Number(data.fx) * viewportWidth * endOverflow;
      const x = this.lerp(startX, endX, easedProgress);
      const y = this.lerp(Number(data.sy), Number(data.fy) * endOverflow, easedProgress) * viewportHeight;
      const rotation = this.lerp(Number(data.sr), Number(data.fr), easedProgress);
      const endScale = Number(data.fs) * (viewportWidth < 576 ? 0.78 : 1);
      const scale = this.lerp(Number(data.ss), endScale, easedProgress);

      item.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${rotation.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
    });

    this.renderContent(progress, viewportWidth);
    this.animationFrame = requestAnimationFrame(this.render);
  }

  renderContent(progress, viewportWidth) {
    const head = this.querySelector(".parallax-cards__head");
    const veil = this.querySelector(".parallax-cards__veil");

    if (head) {
      const headProgress = this.clamp(progress / 0.22, 0, 1);
      const headOffset = this.clamp(viewportWidth * 0.08, 32, 100);
      head.style.transform = `translateY(${this.lerp(-headOffset, 0, headProgress).toFixed(1)}px)`;
    }

    if (veil) {
      const veilProgress = this.clamp((progress - 0.08) / 0.24, 0, 1);
      veil.style.opacity = veilProgress;
      veil.style.transform = `scale(${this.lerp(0.96, 1, veilProgress).toFixed(3)})`;
    }

    if (this.lead) {
      const leadProgress = this.clamp((progress - 0.42) / 0.22, 0, 1);
      this.lead.style.opacity = leadProgress;
      this.lead.style.transform = `translateY(${this.lerp(14, 0, leadProgress).toFixed(1)}px)`;
    }

    if (this.cta) {
      const ctaProgress = this.clamp((progress - 0.56) / 0.22, 0, 1);
      this.cta.style.opacity = ctaProgress;
      this.cta.style.transform = `translateY(${this.lerp(14, 0, ctaProgress).toFixed(1)}px)`;
    }

    if (this.glow) {
      this.glow.style.opacity = (0.4 + this.ease(progress) * 0.4).toFixed(2);
      this.glow.style.transform = `translate(-50%, -50%) scale(${(1 + this.ease(progress) * 0.5).toFixed(3)})`;
    }
  }

  renderReducedMotion() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const isMobile = viewportWidth <= 767.98;
    const endOverflow = isMobile ? 1.20 : 1;

    this.items.forEach((item) => {
      const data = item.dataset;
      const scale = Number(data.fs);
      item.style.transform = `translate(-50%, -50%) translate(${Number(data.fx) * viewportWidth * endOverflow}px, ${Number(data.fy) * viewportHeight * endOverflow}px) scale(${scale})`;
    });

    if (this.lead) this.lead.style.opacity = 1;
    if (this.cta) this.cta.style.opacity = 1;
  }
}

if (!customElements.get("scroll-scatter")) {
  customElements.define("scroll-scatter", ScrollScatter);
}