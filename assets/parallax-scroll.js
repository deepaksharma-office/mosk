class ParallaxScroll extends HTMLElement {
  connectedCallback() {
    this.cards = Array.from(this.querySelectorAll("[data-parallax-scroll-card]"));
    this.cardVideos = this.cards.map((card) => card.querySelector("video"));
    this.header = this.querySelector("[data-parallax-scroll-header]");
    this.headerContent = this.querySelector("[data-parallax-scroll-header-content]");
    this.videos = this.cardVideos.filter(Boolean);
    this.animationFrame = null;
    this.isIntersecting = false;
    this.mobileQuery = window.matchMedia("(max-width: 767.98px)");
    this.reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.modeQueries = [this.mobileQuery, this.reduceMotionQuery];

    this.handleScroll = this.handleScroll.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleModeChange = this.handleModeChange.bind(this);
    this.render = this.render.bind(this);

    this.modeQueries.forEach((query) => query.addEventListener("change", this.handleModeChange));
    window.addEventListener("resize", this.handleResize, { passive: true });
    window.addEventListener("scroll", this.handleScroll, { passive: true });

    this.observer = new IntersectionObserver(
      ([entry]) => {
        this.isIntersecting = entry.isIntersecting;
        this.classList.toggle("is-intersecting", this.isIntersecting);

        if (this.isIntersecting) {
          this.scheduleRender();
        } else {
          this.pauseVideos();
        }
      },
      { rootMargin: "20% 0px" },
    );
    this.observer.observe(this);

    this.updateMode();
  }

  disconnectedCallback() {
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("scroll", this.handleScroll);
    this.modeQueries?.forEach((query) =>
      query.removeEventListener("change", this.handleModeChange),
    );
    this.observer?.disconnect();

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    this.pauseVideos();
  }

  clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
  }

  handleScroll() {
    if (this.isIntersecting) this.scheduleRender();
  }

  handleResize() {
    this.updateMode();
  }

  handleModeChange() {
    this.updateMode();
  }

  shouldAnimate() {
    return this.cards.length > 0 && !this.reduceMotionQuery.matches;
  }

  updateMode() {
    const shouldAnimate = this.shouldAnimate();
    this.classList.toggle("is-animated", shouldAnimate);

    if (shouldAnimate) {
      this.scheduleRender();
      return;
    }

    this.resetStyles();
    this.pauseVideos();
  }

  scheduleRender() {
    if (!this.classList.contains("is-animated") || this.animationFrame) {
      return;
    }

    this.animationFrame = requestAnimationFrame(this.render);
  }

  cardProgress(cardTop, viewportHeight) {
    const animationDistance = Math.max(viewportHeight * 0.4, 1);
    return this.clamp((viewportHeight - cardTop) / animationDistance);
  }

  setProgress(element, property, value) {
    const nextValue = value.toFixed(3);
    if (element.style.getPropertyValue(property) !== nextValue) {
      element.style.setProperty(property, nextValue);
    }
  }

  render() {
    this.animationFrame = null;

    if (!this.classList.contains("is-animated")) return;

    const viewportHeight = window.innerHeight;
    const cardRects = this.mobileQuery.matches
      ? [this.cards[0].getBoundingClientRect()]
      : this.cards.map((card) => card.getBoundingClientRect());
    const firstCardRect = cardRects[0];
    const headerTop = this.header?.getBoundingClientRect().top || 0;
    const headerBottom = this.headerContent
      ? headerTop + this.headerContent.offsetTop + this.headerContent.offsetHeight
      : viewportHeight * 0.6;
    const headerProgress = this.clamp((headerBottom + 70 - firstCardRect.top) / 460);
    const firstCardProgress = this.cardProgress(firstCardRect.top, viewportHeight);
    const hintProgress = 1 - this.clamp(firstCardProgress / 0.35);

    this.setProgress(this, "--scroll-progress", headerProgress);
    this.setProgress(this, "--hint-progress", hintProgress);

    if (this.mobileQuery.matches) return;

    this.cards.forEach((card, index) => {
      const cardRect = cardRects[index];
      const progress = this.cardProgress(cardRect.top, viewportHeight);
      this.setProgress(card, "--card-progress", progress);

      const video = this.cardVideos[index];
      if (video) {
        const isVisible = cardRect.bottom > 0 && cardRect.top < viewportHeight;
        this.updateVideo(video, isVisible && this.isIntersecting);
      }
    });
  }

  updateVideo(video, shouldPlay) {
    if (shouldPlay && video.dataset.parallaxScrollPlaying !== "true") {
      video.dataset.parallaxScrollPlaying = "true";
      video.play().catch(() => {
        video.dataset.parallaxScrollPlaying = "false";
      });
    } else if (!shouldPlay && video.dataset.parallaxScrollPlaying === "true") {
      video.pause();
      video.dataset.parallaxScrollPlaying = "false";
    }
  }

  pauseVideos() {
    this.videos.forEach((video) => {
      video.pause();
      video.dataset.parallaxScrollPlaying = "false";
    });
  }

  resetStyles() {
    this.style.removeProperty("--scroll-progress");
    this.style.removeProperty("--hint-progress");

    this.cards.forEach((card) => {
      card.style.removeProperty("--card-progress");
    });
  }
}

if (!customElements.get("parallax-scroll")) {
  customElements.define("parallax-scroll", ParallaxScroll);
}
