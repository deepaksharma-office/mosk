import { ProductTabs } from "@NextSkyTheme/vertical-product-tabs";
if (!customElements.get("suitable-finder")) {
  customElements.define(
    "suitable-finder",
    class SuitableFinder extends ProductTabs {
      constructor() {
        super();
        this._rangeSlider = this.querySelector("range-slider");
        this._sizeDot = this.dataset.sizeDot;
        this._spacingHeader = parseInt(this.dataset.spacing);
        this._tabRange = this.querySelector("input[type=range]");
        this._tabButtons = this.querySelectorAll(
          ".product-tabs__header-item-js",
        );
        this._isRTL = document.documentElement.dir === 'rtl' || document.documentElement.getAttribute('data-rtl') === 'true';
      }

      connectedCallback() {
        super.connectedCallback();
        if (!this._tabRange) return;
        this._tabHeaderContent = this.querySelector(
          ".product-tabs__header-content",
        );
        if (this._rangeSlider) {
          const offsetWidth = this._tabHeaderContent.offsetWidth;
          this._rangeSlider.style.setProperty(
            "--width-range-slider",
            offsetWidth + "px",
          );
        }

        window.addEventListener("resize", this.handleResize, { passive: true });

        this._tabRange.addEventListener("input", (e) => {
          const sliderValue = parseInt(e.target.value);
          const maxValue = parseInt(e.target.max);
          const numTabs = this._tabButtons.length;

          const rangeSize = maxValue / numTabs;
          let tabNumber = Math.ceil(sliderValue / rangeSize);

          if (sliderValue === 0) tabNumber = 1;
          tabNumber = Math.max(1, Math.min(tabNumber, numTabs));

          e.target.setAttribute("value", sliderValue);
          const tabId = this.querySelector(`[data-tab-id=tab-${tabNumber}]`);
          const blockId = tabId.dataset.blockId;

          this.selectedTab = blockId;
          this.updateTabDisplay(blockId, true);
        });
        this._tabRange.addEventListener(
          "input",
          this.positionThumbExactly.bind(this),
        );
        this._tabRange.addEventListener(
          "change",
          this.positionThumbExactly.bind(this),
        );
        this.fineTuneSliderPositions();
        this.enableTrackClickNavigation();
        this.setDefaultSliderValue();
      }

      setDefaultSliderValue() {
        if (window.tabCenters && window.tabCenters[0]) {
          const sliderWidth = this._tabRange.offsetWidth;
          const maxValue = parseInt(this._tabRange.max);
          const centerPosition = window.tabCenters[0];
          const percentage = centerPosition / sliderWidth;
          const defaultValue = Math.round(1 + percentage * (maxValue - 1));

          this._tabRange.value = defaultValue;
          this._tabRange.setAttribute("value", defaultValue);
          this.positionThumbExactly();

          const firstTabId = this.querySelector(`[data-tab-id=tab-1]`);
          if (firstTabId) {
            this.selectedTab = firstTabId.dataset.blockId;
          }
        }
      }

      fineTuneSliderPositions() {
        const isMobile = window.innerWidth < 767.98;
        const marginRight = this._spacingHeader;
        const numTabs = this._tabButtons.length;
        const tabHeaderWidth = this._tabHeaderContent.offsetWidth;
        let tabCenters = [];
        if (isMobile) {
          const tabInputWidth = this._tabRange.offsetWidth;
          const tabWidth = tabInputWidth / numTabs;

          let currentPosition = tabWidth / 2;
          for (let i = 0; i < numTabs; i++) {
            tabCenters.push(currentPosition);
            currentPosition += tabWidth;
          }
        } else {
          const totalMarginSpace = marginRight * (numTabs - 1);
          const tabWidth = (tabHeaderWidth - totalMarginSpace) / numTabs;
          let currentPosition = tabWidth / 2;
          for (let i = 0; i < numTabs; i++) {
            tabCenters.push(currentPosition);
            currentPosition += tabWidth;
            if (i < numTabs - 1) {
              currentPosition += marginRight;
            }
          }
        }
        window.tabCenters = tabCenters;
        this.setDefaultSliderValue();
      }

      positionThumbExactly() {
        const sliderValue = parseInt(this._tabRange.value);
        const maxValue = parseInt(this._tabRange.max);
        const sliderWidth = this._tabRange.offsetWidth;

        const percentage = (sliderValue - 1) / (maxValue - 1);
        const progressPosition = percentage * sliderWidth;

        this._rangeSlider.style.setProperty(
          "--progress-width",
          `${progressPosition}px`,
        );
      }

      handleResize() {
        super.handleResize();
        if (this._rangeSlider) {
          const _this = this;
          setTimeout(function () {
            const offsetWidth = _this._tabHeaderContent.offsetWidth;
            _this._rangeSlider.style.setProperty(
              "--width-range-slider",
              offsetWidth + "px",
            );
            _this.fineTuneSliderPositions();
            _this.positionThumbExactly();
            _this.setDefaultSliderValue();
            window.addEventListener("resize", _this.handleResize, {
              passive: true,
            });
          }, 500);
        }
      }

      updateTabDisplay(blockId, animate = true) {
        this.selectedTab = blockId;
        super.updateTabDisplay(blockId, animate);
        if (!this._tabRange) return;
        const activeTab = this.querySelector(
          `.product-tabs__header-item-js[data-block-id=${blockId}]`,
        );
        const tabNumber = parseInt(activeTab.dataset.position);
        const maxValue = parseInt(this._tabRange.max);
        const numTabs = this._tabButtons.length;

        const rangeSize = maxValue / numTabs;
        const currentValue = parseInt(this._tabRange.value);
        const expectedMinValue = Math.ceil((tabNumber - 1) * rangeSize) || 1;
        const expectedMaxValue = Math.ceil(tabNumber * rangeSize);

        if (
          currentValue < expectedMinValue ||
          currentValue > expectedMaxValue
        ) {
          const tabIndex = tabNumber - 1;
          if (window.tabCenters && window.tabCenters[tabIndex]) {
            const sliderWidth = this._tabRange.offsetWidth;
            const centerPosition = window.tabCenters[tabIndex];
            const percentage = centerPosition / sliderWidth;
            const centerValue = Math.round(1 + percentage * (maxValue - 1));
            this._tabRange.value = centerValue;
            this._tabRange.setAttribute("value", centerValue);
          }
        }
        this.positionThumbExactly();
      }

      enableTrackClickNavigation() {
        this._rangeSlider.addEventListener("click", (e) => {
          if (e.target === this._tabRange) {
            const sliderRect = this._tabRange.getBoundingClientRect();
            const clickX = e.clientX;

            let relativePos = (clickX - sliderRect.left) / sliderRect.width;
            if (this._isRTL) {
              relativePos = (sliderRect.right - clickX) / sliderRect.width;
            }
            relativePos = Math.max(0, Math.min(relativePos, 1));

            const tabCenters = window.tabCenters || [];
            if (tabCenters.length === 0) return;

            const relativeCenters = tabCenters.map(
              (center) => center / sliderRect.width,
            );

            let closestTabIndex = 0;
            let minDistance = Math.abs(relativeCenters[0] - relativePos);

            for (let i = 1; i < relativeCenters.length; i++) {
              const distance = Math.abs(relativeCenters[i] - relativePos);
              if (distance < minDistance) {
                minDistance = distance;
                closestTabIndex = i;
              }
            }

            const newTabValue = closestTabIndex + 1;
            const maxValue = parseInt(this._tabRange.max);
            const numTabs = this._tabButtons.length;

            const tabIndex = newTabValue - 1;
            if (window.tabCenters && window.tabCenters[tabIndex]) {
              const sliderWidth = this._tabRange.offsetWidth;
              const centerPosition = window.tabCenters[tabIndex];
              const percentage = centerPosition / sliderWidth;
              const newSliderValue = Math.round(
                1 + percentage * (maxValue - 1),
              );

              this._tabRange.value = newSliderValue;
              this._tabRange.setAttribute("value", newSliderValue);
            }
            const tabId = this.querySelector(
              `[data-tab-id=tab-${newTabValue}]`,
            );
            const blockId = tabId.dataset.blockId;

            this.selectedTab = blockId;
            this.updateTabDisplay(blockId, true);
            this.positionThumbExactly();
          }
        });
      }
    },
  );
}
