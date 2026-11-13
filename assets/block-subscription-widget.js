class SubscriptionWidget extends HTMLElement {
  connectedCallback() {
    this.bindPurchaseOptions();
  }

  getSection() {
    return document.getElementById(`shopify-section-${this.dataset.sectionId}`);
  }

  bindPurchaseOptions() {
    const section = this.getSection();
    if (!section) return;

    if (section._purchaseOptionsAbort) {
      section._purchaseOptionsAbort.abort();
    }
    section._purchaseOptionsAbort = new AbortController();
    const { signal } = section._purchaseOptionsAbort;

    this.sellingPlanInput = section.querySelector(
      ".subscription-widget__selling-plan-input",
    );
    section.querySelectorAll("[data-purchase-type]").forEach((radio) => {
      radio.addEventListener(
        "change",
        () => {
          if (radio.dataset.purchaseType === "subscription") {
            this.updatePlanDisplayForCard(
              radio.closest("[data-subscription-card]"),
              section,
            );
          }
          this.updateSellingPlan(section);
        },
        { signal },
      );
    });

    section.querySelectorAll("[data-subscription-card]").forEach((card) => {
      card.addEventListener(
        "click",
        (event) => {
          if (event.target.closest("select")) return;

          const radio = card.querySelector(".subscription-widget__radio");
          if (!radio || radio.disabled || radio.checked) return;

          radio.checked = true;
          radio.dispatchEvent(new Event("change", { bubbles: true }));
        },
        { signal },
      );
    });

    section.querySelectorAll("[data-subscription-plan-select]").forEach((planSelect) => {
      planSelect.addEventListener(
        "change",
        () => {
          const card = planSelect.closest("[data-subscription-card]");
          this.updatePlanDisplayForCard(card, section);
          this.updateSellingPlan(section);
        },
        { signal },
      );
    });

    section
      .querySelectorAll("[data-subscription-group]")
      .forEach((card) => {
        this.updatePlanDisplayForCard(card, section);
      });
    this.updateSellingPlan(section);
  }

  getPurchaseWidget(section = this.getSection()) {
    return section?.querySelector("subscription-widget");
  }

  updatePlanDisplayForCard(card, section = this.getSection()) {
    if (!card || !section) return;

    const planSelect = card.querySelector("[data-subscription-plan-select]");
    if (!planSelect) return;

    const selectedOption = planSelect.selectedOptions[0];
    if (!selectedOption) return;

    const widget = this.getPurchaseWidget(section);
    const showPrice = widget?.dataset.showPrice === "true";
    const salePrice = card.querySelector("[data-subscription-sale-price]");
    const comparePrice = card.querySelector("[data-subscription-compare-price]");

    if (showPrice) {
      if (salePrice && selectedOption.dataset.price) {
        salePrice.textContent = selectedOption.dataset.price;
      }

      if (comparePrice) {
        if (selectedOption.dataset.comparePrice) {
          comparePrice.textContent = selectedOption.dataset.comparePrice;
          comparePrice.hidden = false;
        } else {
          comparePrice.hidden = true;
        }
      }
    }
  }

  updateSellingPlan(section = this.getSection()) {
    const selected = section?.querySelector('[name^="purchase_option_"]:checked');
    if (!selected || !this.sellingPlanInput) return;

    if (selected.dataset.purchaseType === "one-time") {
      this.sellingPlanInput.value = "";
      return;
    }

    const planSelect = selected
      .closest("[data-subscription-card]")
      ?.querySelector("[data-subscription-plan-select]");
    if (planSelect) {
      this.sellingPlanInput.value = planSelect.value;
    }
  }
}

customElements.define("subscription-widget", SubscriptionWidget);
