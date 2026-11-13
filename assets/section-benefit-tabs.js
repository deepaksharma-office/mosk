class ImageComparisonBenefits extends HTMLElement {
  constructor() {
    super();
    this.onScroll = this.onScroll.bind(this);
    this.onResize = this.onResize.bind(this);
    this.onFrame = this.onFrame.bind(this);
    this.frame = 0;
    this.current = 100;
    this.target = 100;
    this.ready = false;
    this.last = 0;
    this.viewport = window.innerHeight || 1;
    this.reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }

  connectedCallback() {
    if (this.reducedMotion) {
      this.style.setProperty("--reveal", "50%");
      return;
    }

    this.viewport = window.innerHeight || 1;
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            window.addEventListener("scroll", this.onScroll, { passive: true });
            window.addEventListener("resize", this.onResize);
            this.onScroll();
          } else {
            this.stop();
          }
        });
      },
      { rootMargin: "15% 0px", threshold: 0 },
    );
    this.observer.observe(this);
  }

  disconnectedCallback() {
    this.stop();
    this.observer?.disconnect();
  }

  stop() {
    window.removeEventListener("scroll", this.onScroll);
    window.removeEventListener("resize", this.onResize);
    if (this.frame) {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
    }
    this.ready = false;
  }

  onResize() {
    this.viewport = window.innerHeight || 1;
    this.onScroll();
  }

  onScroll() {
    if (this.frame) return;
    this.frame = requestAnimationFrame(this.onFrame);
  }

  onFrame(now) {
    this.frame = 0;
    const range = this.viewport * 0.65 || 1;
    const top = this.getBoundingClientRect().top;
    const progress = Math.min(1, Math.max(0, 1 - top / range));
    this.target = (1 - progress) * 100;

    if (!this.ready) {
      this.current = this.target;
      this.ready = true;
      this.last = now;
    } else {
      const dt = Math.min(48, Math.max(0, now - this.last));
      this.last = now;
      const alpha = 1 - Math.exp(-dt / 48);
      this.current += (this.target - this.current) * alpha;
      if (Math.abs(this.target - this.current) < 0.04) {
        this.current = this.target;
      }
    }

    this.style.setProperty("--reveal", `${this.current.toFixed(2)}%`);

    if (this.current !== this.target) {
      this.frame = requestAnimationFrame(this.onFrame);
    }
  }
}
if (!customElements.get("image-comparison-benefits")) {
  customElements.define("image-comparison-benefits", ImageComparisonBenefits);
}
