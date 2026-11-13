import * as NextSkyTheme from "@NextSkyTheme/global";
import { notifier } from "@NextSkyTheme/notification";
import { eventModal } from "@NextSkyTheme/modal";

if (!customElements.get("custom-options-modal")) {
  class CustomOptionsModal extends HTMLElement {
    constructor() {
      super();
      this.productUrl = this.getAttribute("data-product-url") || "";
      this.button = this.querySelector("button");
    }

    connectedCallback() {
      this.addEventListener("click", () => this.fetchProductInfo());
    }

    fetchProductInfo() {
      if (this.button) {
        this.button.classList.add("loading");
        this.button.setAttribute("aria-busy", "true");
        this.button.setAttribute("aria-disabled", "true");
      }
      fetch(this.productUrl)
        .then((response) => response.text())
        .then((responseText) => {
          const parsedHTML = new DOMParser().parseFromString(
            responseText,
            "text/html"
          );
          const customOptionsElement = parsedHTML.querySelector(
            ".block-custom-options template"
          );
          const content = document.createElement("div");
          content.appendChild(
            customOptionsElement.content.firstElementChild.cloneNode(true)
          );
          NextSkyTheme.getBody().appendChild(
            content.querySelector("custom-options")
          );
          setTimeout(
            () =>
              eventModal(
                document.querySelector("custom-options"),
                "open",
                true
              ),
            100
          );
        })
        .catch((error) => console.error("Error:", error))
        .finally(() => {
          if (this.button) {
            this.button.classList.remove("loading");
            this.button.setAttribute("aria-busy", "false");
            this.button.removeAttribute("aria-disabled");
          }
        });
    }
  }
  customElements.define("custom-options-modal", CustomOptionsModal);
}

if (!customElements.get("custom-options")) {
  class CustomOptions extends HTMLElement {
    constructor() {
      super();
      this.tabButtons = this.querySelectorAll(".tab-btn");
      this.tabPanels = this.querySelectorAll(".tab-panel");
      this.nextButtons = this.querySelectorAll(".btn-next");
      this.backButtons = this.querySelectorAll(".btn-back");
      this.addToCartButton = this.querySelector(".btn-add-to-cart");
      this.textInputs = this.querySelectorAll(".custom-text-input");
      this.placementRadios = this.querySelectorAll(
        'input[name="placement_product"]'
      );
      this.colorRadios = this.querySelectorAll('input[name="custom_color"]');

      this.productId = this.getAttribute("data-product-id");
      this.variantId = this.getAttribute("data-variant-id");
      const labelsString = this.getAttribute("data-text-label");
      this.labels = labelsString ? JSON.parse(labelsString) : null;
      this.init();
    }

    init() {
      this.tabButtons.forEach((button) => {
        button.addEventListener("click", (e) => this.handleTabClick(e));
      });

      this.nextButtons.forEach((button) => {
        button.addEventListener("click", (e) => this.handleNextClick(e));
      });

      this.backButtons.forEach((button) => {
        button.addEventListener("click", (e) => this.handleBackClick(e));
      });

      if (this.addToCartButton) {
        this.addToCartButton.addEventListener("click", (e) =>
          this.handleAddToCart(e)
        );
        this.addToCartButton.addEventListener("keydown", (e) =>
          this.handleAddToCartKeydown(e)
        );
      }

      this.textInputs.forEach((input) => {
        this.initTextInput(input);
      });

      this.placementRadios.forEach((radio) => {
        radio.addEventListener("change", () => {
          this.validateAddToCart();
          this.updateHiddenInputs();
        });
        radio.addEventListener("keydown", (event) => {
          this.handleOptionRadioKeydown(event, this.placementRadios);
        });
      });

      this.textInputs.forEach((input) => {
        input.addEventListener("input", () => {
          this.validateAddToCart();
          this.updateHiddenInputs();
        });
      });

      this.colorRadios.forEach((radio) => {
        radio.addEventListener("change", () => {
          this.validateAddToCart();
          this.updateHiddenInputs();
        });
        radio.addEventListener("keydown", (event) => {
          this.handleOptionRadioKeydown(event, this.colorRadios);
        });
      });

      const tabNavigation = this.querySelector(".tabs-navigation");
      if (tabNavigation && !tabNavigation.getAttribute("aria-label")) {
        tabNavigation.setAttribute("aria-label", "Custom options steps");
      }

      this.setupTabsAccessibility();
      this.validateAddToCart();

      this.addEventListener("keydown", (e) => this.handleKeydown(e));
    }

    setupTabsAccessibility() {
      this.tabButtons.forEach((button) => {
        const tabName = button.getAttribute("data-tab");
        const panel = this.querySelector(`[data-tab-content="${tabName}"]`);

        if (!tabName || !panel) return;

        const safeTabName = tabName.replace(/[^a-zA-Z0-9_-]/g, "_");
        const tabId = `custom-option-tab-${safeTabName}`;
        const panelId = `custom-option-panel-${safeTabName}`;

        button.setAttribute("id", tabId);
        button.setAttribute("aria-controls", panelId);
        panel.setAttribute("id", panelId);
        panel.setAttribute("aria-labelledby", tabId);
      });

      this.syncTabAccessibilityState();
    }

    syncTabAccessibilityState() {
      this.tabButtons.forEach((button) => {
        const isActive = button.classList.contains("active");
        button.setAttribute("aria-selected", isActive ? "true" : "false");
        button.setAttribute("tabindex", "0");
      });

      this.tabPanels.forEach((panel) => {
        const isActive = panel.classList.contains("active");
        panel.setAttribute("aria-hidden", isActive ? "false" : "true");
      });
    }

    handleOptionRadioKeydown(event, radioNodeList) {
      const radios = Array.from(radioNodeList);
      const currentRadio = event.currentTarget;
      const currentIndex = radios.indexOf(currentRadio);

      if (currentIndex === -1) return;

      const selectRadio = (radio) => {
        if (!radio) return;

        radio.focus();
        if (!radio.checked) {
          radio.checked = true;
          radio.dispatchEvent(new Event("change", { bubbles: true }));
        }
      };

      switch (event.key) {
        case "Enter":
        case " ":
          event.preventDefault();
          selectRadio(currentRadio);
          break;

        case "Tab": {
          const tabPanel = currentRadio.closest(".tab-panel");

          if (!event.shiftKey) {
            if (currentIndex < radios.length - 1) {
              event.preventDefault();
              radios[currentIndex + 1].focus();
              break;
            }

            const addToCartButton = tabPanel?.querySelector(
              ".btn-add-to-cart:not([disabled])"
            );
            const nextActionButton =
              addToCartButton ||
              tabPanel?.querySelector(
                ".tab-actions .btn-next:not([disabled]), .tab-actions .btn-back:not([disabled])"
              );

            if (nextActionButton) {
              event.preventDefault();
              nextActionButton.focus();
            }
            break;
          }

          if (currentIndex > 0) {
            event.preventDefault();
            radios[currentIndex - 1].focus();
          }
          break;
        }

        case "ArrowRight":
        case "ArrowDown": {
          event.preventDefault();
          const nextIndex = (currentIndex + 1) % radios.length;
          selectRadio(radios[nextIndex]);
          break;
        }

        case "ArrowLeft":
        case "ArrowUp": {
          event.preventDefault();
          const previousIndex = (currentIndex - 1 + radios.length) % radios.length;
          selectRadio(radios[previousIndex]);
          break;
        }
      }
    }

    initTextInput(input) {
      const container = input.closest(".custom-text-input-container");
      const counter = container.querySelector(".counter-current");
      const limit = parseInt(input.getAttribute("data-text-limit"));

      input.addEventListener("input", () => {
        const length = input.value.length;
        counter.textContent = length;

        if (length >= limit) {
          input.classList.add("at-limit");
          container
            .querySelector(".custom-text-counter")
            .classList.add("at-limit");
        } else {
          input.classList.remove("at-limit");
          container
            .querySelector(".custom-text-counter")
            .classList.remove("at-limit");
        }

        this.validateAddToCart();
      });
    }

    validateAddToCart() {
      if (!this.addToCartButton) return;

      const placementSelected = Array.from(this.placementRadios).some(
        (radio) => radio.checked
      );

      const selectedPlacement = Array.from(this.placementRadios).find(
        (radio) => radio.checked
      );

      const labelText = this.addToCartButton.getAttribute("data-label") || "";

      const hiddenOnLoad = this.addToCartButton.querySelector(".hidden-on-load");

      const placementMoney = selectedPlacement
        ? selectedPlacement.getAttribute("data-money-price")
        : "";

      const priceElement = `
        <span class="dot-total mx-sp-1"> - </span>
        <span class="total-price__detail">${NextSkyTheme.formatMoney(
          placementMoney ? placementMoney : 0,
          cartStrings.money_format
        )}</span>`

      const textInput = this.querySelector(".custom-text-input");
      const textEntered = textInput && textInput.value.trim().length > 0;

      const colorSelected = Array.from(this.colorRadios).some(
        (radio) => radio.checked
      );

      const isValid = placementSelected && textEntered && colorSelected;

      if (selectedPlacement) {
        hiddenOnLoad.innerHTML = labelText + priceElement;
      }

      if (isValid) {
        this.addToCartButton.removeAttribute("disabled");
        this.addToCartButton.setAttribute("aria-disabled", "false");
        this.addToCartButton.classList.remove("disabled");
      } else {
        this.addToCartButton.setAttribute("disabled", "disabled");
        this.addToCartButton.setAttribute("aria-disabled", "true");
        this.addToCartButton.classList.add("disabled");
      }
    }

    updateHiddenInputs() {
      const selectedPlacement = Array.from(this.placementRadios).find(
        (radio) => radio.checked
      );
      const placementId = selectedPlacement ? selectedPlacement.value : "";
      const placementText = selectedPlacement
        ? selectedPlacement.getAttribute("data-placement-text")
        : "";

      const textInput = this.querySelector(".custom-text-input");
      const customText = textInput ? textInput.value.trim() : "";

      const selectedColor = Array.from(this.colorRadios).find(
        (radio) => radio.checked
      );
      const colorValue = selectedColor ? selectedColor.value : "";

      const randomNum = Math.floor(10000 + Math.random() * 90000);
      const uniqId = `embroidery_${this.variantId}_${placementId}_${randomNum}`;

      const checkedInputs = {
        Placement: placementText,
        Text: customText,
        Color: colorValue,
      };

      const hiddenPlacementId = this.querySelector(".hidden-placement-id");
      const hiddenUniqId0 = this.querySelector(".hidden-uniq-id-0");
      const hiddenUniqId1 = this.querySelector(".hidden-uniq-id-1");
      const hiddenCheckedInputs = this.querySelector(".hidden-checked-inputs");

      if (hiddenPlacementId) hiddenPlacementId.value = placementId;
      if (hiddenUniqId0) hiddenUniqId0.value = uniqId;
      if (hiddenUniqId1) hiddenUniqId1.value = uniqId;
      if (hiddenCheckedInputs)
        hiddenCheckedInputs.value = JSON.stringify(checkedInputs);
    }

    handleTabClick(event) {
      const clickedButton = event.currentTarget;
      const targetTab = clickedButton.getAttribute("data-tab");
      const index = clickedButton.getAttribute("data-index");

      this.switchTab(targetTab, index);
    }

    handleNextClick(event) {
      const nextButton = event.currentTarget;
      const nextTab = nextButton.getAttribute("data-next-tab");
      const index = nextButton.getAttribute("data-index");
      if (nextTab) {
        this.switchTab(nextTab, index, { focusPanel: true });
      }
    }

    handleBackClick(event) {
      const backButton = event.currentTarget;
      const backTab = backButton.getAttribute("data-back-tab");
      const index = backButton.getAttribute("data-index");
      if (backTab) {
        this.switchTab(backTab, index, { focusPanel: true });
      }
    }

    handleAddToCartKeydown(event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      this.handleAddToCart(event);
    }

    handleAddToCart(event) {
      const isDisabled =
        this.addToCartButton.hasAttribute("disabled") ||
        this.addToCartButton.getAttribute("aria-disabled") === "true";
      if (isDisabled) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      this.addToCartButton.classList.add("loading");

      const formData = this.buildCartData();

      this.addToCartAPI(formData);
    }

    buildCartData() {
      const selectedPlacement = Array.from(this.placementRadios).find(
        (radio) => radio.checked
      );
      const placementId = selectedPlacement ? selectedPlacement.value : "";
      const placementText = selectedPlacement
        ? selectedPlacement.getAttribute("data-placement-text")
        : "";

      const textInput = this.querySelector(".custom-text-input");
      const customText = textInput ? textInput.value.trim() : "";

      const selectedColor = Array.from(this.colorRadios).find(
        (radio) => radio.checked
      );
      const colorValue = selectedColor ? selectedColor.value : "";

      const randomNum = Math.floor(10000 + Math.random() * 90000);
      const uniqId = `embroidery_${this.variantId}_${placementId}_${randomNum}`;

      const mainImage = this.querySelector(".hidden-main-image")?.value || "";
      const mainSku = this.querySelector(".hidden-main-sku")?.value || "";
      const mainUrl = this.querySelector(".hidden-main-url")?.value || "";

      const checkedInputs = JSON.stringify({
        [`items[1][properties][${this.labels.placement}]`]:
          placementText,
        [`items[1][properties][${this.labels.text}]`]:
          customText,
        [`items[1][properties][${this.labels.color}]`]:
          colorValue,
      });

      const formData = new FormData();

      formData.append("items[0][id]", this.variantId);
      formData.append("items[0][quantity]", "1");
      formData.append("items[0][properties][_uniq_id]", uniqId);

      formData.append("items[1][id]", placementId);
      formData.append("items[1][quantity]", "1");
      formData.append("items[1][properties][_main_product_image]", mainImage);
      formData.append("items[1][properties][_uniq_id]", uniqId);
      formData.append("items[1][properties][_embroidery]", "true");
      if (mainSku) {
        formData.append("items[1][properties][_main_product_sku]", mainSku);
      }
      formData.append("items[1][properties][_main_product_url]", mainUrl);
      formData.append("items[1][properties][_checked_inputs]", checkedInputs);
      formData.append(
        `items[1][properties][${this.labels.placement}]`,
        placementText
      );
      formData.append(
        `items[1][properties][${this.labels.text}]`,
        customText
      );
      formData.append(
        `items[1][properties][${this.labels.color}]`,
        colorValue
      );

      const cart =
        document.querySelector("cart-drawer") ||
        document.querySelector("main-cart");
      if (cart) {
        const sections = this.getSectionsToRender(cart).map(
          (section) => section.id
        );
        formData.append("sections", sections);
        formData.append("sections_url", window.location.pathname);
      }

      return formData;
    }

    getSectionsToRender(cart) {
      const sectionId = cart.sectionId || cart.getAttribute("data-section-id");
      return [
        {
          id: sectionId,
          section: sectionId,
          selector: ".drawer__header-cart",
        },
        {
          id: "cart-icon-bubble",
          section: "cart-icon-bubble",
        },
        {
          id: sectionId,
          section: sectionId,
          selector: ".free-shipping-bar",
        },
        {
          id: sectionId,
          section: sectionId,
          selector: ".cart-drawer__form",
        },
        {
          id: sectionId,
          section: sectionId,
          selector: ".drawer__footer-bottom-total",
        },
      ];
    }

    async addToCartAPI(formData) {
      this.addToCartButton.setAttribute("disabled", "disabled");
      this.addToCartButton.setAttribute("aria-disabled", "true");
      this.addToCartButton.classList.add("disabled");
      const cart =
        document.querySelector("cart-drawer") ||
        document.querySelector("main-cart");
      const config = NextSkyTheme.fetchConfig("javascript");
      config.headers["X-Requested-With"] = "XMLHttpRequest";
      delete config.headers["Content-Type"];
      if (cart) {
        formData.append(
          "sections",
          cart.getSectionsToRender().map((section) => section.id)
        );
        formData.append("sections_url", window.location.pathname);
      }
      config.body = formData;
      fetch(`${routes?.cart_add_url}`, config)
        .then((response) => response.json())
        .then((response) => {
          if (response.status) {
            notifier.show(response.description, "error", 4000);
            this.error = true;
            return;
          } else if (!cart) {
            window.location = window.routes.cart_url;
            return;
          }

          if (!this.error) this.error = false;
          const is_cart_page =
            document.body.classList.contains("template-cart");
          if (!is_cart_page) {
            cart.renderContents(response);
            eventModal(cart, "open", false, "delay");
          }
          if (document.querySelector("custom-options")) {
            eventModal(
              document.querySelector("custom-options"),
              "close",
              false
            );
          }
        })
        .catch((e) => {
          console.error(e);
          notifier.show(
            window.cartStrings?.error ||
              "There was an error while updating your cart. Please try again.",
            "error",
            4000
          );
        })
        .finally(() => {
          this.addToCartButton.classList.remove("loading");
          this.validateAddToCart();
          try {
            new NextSkyTheme.FSProgressBar("free-ship-progress-bar");
          } catch (error) {
            console.error(error);
          }
        });
    }

    getSectionInnerHTML(html, selector = ".shopify-section") {
      return (
        new DOMParser()
          .parseFromString(html, "text/html")
          .querySelector(selector)?.innerHTML || ""
      );
    }

    getSelectedOptions() {
      const options = {};

      this.tabPanels.forEach((panel) => {
        const inputs = panel.querySelectorAll("input:checked, select");
        inputs.forEach((input) => {
          if (input.name) {
            options[input.name] = input.value;
          }
        });
      });

      return options;
    }

    focusFirstFocusableInPanel(tabName) {
      const panel = this.querySelector(`[data-tab-content="${tabName}"]`);
      if (!panel) return;

      const firstFocusableElement = panel.querySelector(
        'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );

      requestAnimationFrame(() => {
        if (firstFocusableElement) {
          firstFocusableElement.focus();
          return;
        }

        panel.setAttribute("tabindex", "-1");
        panel.focus();
      });
    }

    switchTab(tabName, index, options = {}) {
      const { focusPanel = false } = options;

      this.tabButtons.forEach((btn) => {
        const buttonIndex = Number(btn.getAttribute("data-index"));
        if (buttonIndex <= Number(index)) {
          btn.classList.add("is-completed");
        } else {
          btn.classList.remove("is-completed");
        }
        btn.classList.remove("active");
        btn.setAttribute("aria-selected", "false");
        btn.setAttribute("tabindex", "0");
      });

      this.tabPanels.forEach((panel) => {
        panel.classList.remove("active");
        panel.setAttribute("hidden", "");
        panel.setAttribute("aria-hidden", "true");
      });

      const activeButton = this.querySelector(`[data-tab="${tabName}"]`);
      const activePanel = this.querySelector(`[data-tab-content="${tabName}"]`);

      if (activeButton && activePanel) {
        activeButton.classList.add("active");
        activeButton.setAttribute("aria-selected", "true");
        activeButton.setAttribute("tabindex", "0");

        activePanel.classList.add("active");
        activePanel.removeAttribute("hidden");
        activePanel.setAttribute("aria-hidden", "false");

        this.scrollIntoView({ behavior: "smooth", block: "nearest" });

        this.dispatchEvent(
          new CustomEvent("tab-changed", {
            detail: { tabName },
            bubbles: true,
          })
        );

        if (focusPanel) {
          this.focusFirstFocusableInPanel(tabName);
        }
      }
    }

    handleKeydown(event) {
      const currentButton = event.target;

      if (!currentButton.classList.contains("tab-btn")) return;

      const tabButtons = Array.from(this.tabButtons);
      const currentIndex = tabButtons.indexOf(currentButton);
      let targetButton = null;

      switch (event.key) {
        case "ArrowLeft":
        case "ArrowUp": {
          event.preventDefault();
          let nextIndex = currentIndex - 1;
          if (nextIndex < 0) nextIndex = tabButtons.length - 1;
          targetButton = tabButtons[nextIndex];
          targetButton.focus();
          this.switchTab(
            targetButton.getAttribute("data-tab"),
            targetButton.getAttribute("data-index")
          );
          break;
        }

        case "ArrowRight":
        case "ArrowDown": {
          event.preventDefault();
          let nextIndex = currentIndex + 1;
          if (nextIndex >= tabButtons.length) nextIndex = 0;
          targetButton = tabButtons[nextIndex];
          targetButton.focus();
          this.switchTab(
            targetButton.getAttribute("data-tab"),
            targetButton.getAttribute("data-index")
          );
          break;
        }

        case "Home":
          event.preventDefault();
          targetButton = tabButtons[0];
          targetButton.focus();
          this.switchTab(
            targetButton.getAttribute("data-tab"),
            targetButton.getAttribute("data-index")
          );
          break;

        case "End":
          event.preventDefault();
          targetButton = tabButtons[tabButtons.length - 1];
          targetButton.focus();
          this.switchTab(
            targetButton.getAttribute("data-tab"),
            targetButton.getAttribute("data-index")
          );
          break;

        case "Enter":
        case " ":
          event.preventDefault();
          this.switchTab(
            currentButton.getAttribute("data-tab"),
            currentButton.getAttribute("data-index"),
            { focusPanel: true }
          );
          break;
      }
    }
  }

  customElements.define("custom-options", CustomOptions);
}
