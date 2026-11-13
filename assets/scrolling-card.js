if (!customElements.get("scrolling-card")) {
  customElements.define(
    "scrolling-card",
    class ScrollingCard extends HTMLElement {
      constructor() {
        super();
        this.blocks = [];
      }

      connectedCallback() {
        this.init();
      }

      init() {
        this.blocks = this.querySelectorAll(".scrolling-card-block");
        if (!this.blocks.length) return;
        this.blocks.forEach((block, index) => {
          block.style.setProperty("--item-index", index);
        });
        this.ticking = false;

        this.onScroll = () => {
          if (this.ticking) return;

          this.ticking = true;
          requestAnimationFrame(() => {
            this.handleScroll();
            this.ticking = false;
          });
        };

        window.addEventListener("scroll", this.onScroll, { passive: true });
        this.handleScroll();
      }

      handleScroll() {
        const lastBlock = this.blocks[this.blocks.length - 1];
        const lastRect = lastBlock.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const triggerPoint = viewportHeight * 0.9;
        const rect = this.getBoundingClientRect();
        const scrollTop = window.scrollY || window.pageYOffset;

        const sectionTop = scrollTop + rect.top;
        const sectionHeight = rect.height;

        const start = sectionTop - viewportHeight;
        const end = sectionTop + sectionHeight;

        let progress = (scrollTop - start) / (end - start);
        progress = Math.max(0, Math.min(1, progress));

        const total = this.blocks.length;
        const activeIndex = Math.floor(progress * total);
        this.blocks.forEach((block, index) => {
          const offset = index - progress * total;

          let y = offset * 10;
          const isTriggered = lastRect.top <= triggerPoint;
          if (!isTriggered) {
            y = 0;
          }
          const scale = 1 - Math.abs(offset) * 0.05;

          block.style.transform = `
            translateY(${y}px)
            scale(${scale})
          `;
          const rect = block.getBoundingClientRect();

          let opacity = 1;
          if (index < this.blocks.length - 1) {
            const nextBlock = this.blocks[index + 1];
            const nextRect = nextBlock.getBoundingClientRect();
            if (nextRect.top < rect.bottom) {
              const overlap = rect.bottom - nextRect.top;
              const height = rect.height;
              let overlapProgress = overlap / height;
              overlapProgress = Math.max(0, Math.min(1, overlapProgress));
              opacity = 1 - overlapProgress * 0.2;
            }
          }
          block.style.setProperty("--overlay-opacity", 1 - opacity);
        });
      }

      disconnectedCallback() {
        window.removeEventListener("scroll", this.onScroll);
      }
    },
  );
}
