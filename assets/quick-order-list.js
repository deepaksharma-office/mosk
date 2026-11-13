import * as NextSkyTheme from "@NextSkyTheme/global";
import { LazyLoader } from "@NextSkyTheme/lazy-load";
import { notifier } from "@NextSkyTheme/notification";

class QuickOrderList extends HTMLElement {
  constructor() {
    super();
    this.cart = document.querySelector("cart-drawer");
    this.viewCart = this.querySelector(".view-cart");
  }

  get sectionId() {
    return this.getAttribute("data-section");
  }

  connectedCallback() {
    this.initAction();
    this.initLoadMore();
    this.initQuantityChange();
    this.initClearAll();
    this.initStickyObserver();
  }

  initAction() {
    this.viewCart = this.querySelector(".view-cart");
    const handleClick = () => {
      this.viewCart.classList.add("loading");
    };
    this.viewCart.addEventListener("click", handleClick);
    this.viewCart.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      }
    });
  }

  initLoadMore() {
    const container = this;
    const hiddenItems = container.querySelectorAll(".variant-item-wrapper.hidden");
    if (!hiddenItems.length) return;
    const btn = container.querySelector("#load-more-variants");
    if (!btn) return;
    btn.classList.add("loading");
    const handleClick = () => {
      const hiddenItems = Array.from(
        container.querySelectorAll(".variant-item-wrapper.hidden"),
      );
      hiddenItems.forEach((el) => {
        el.classList.remove("hidden");
      });
      btn.remove();
    };
    btn.addEventListener("click", handleClick);
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      }
    });
  }

  initClearAll() {
    const container = this;
    const btn = container.querySelector(".clear-all");

    if (!btn) return;

    const handleClearAllClick = async () => {
      const rows = container.querySelectorAll(".variant-item");
      if (!rows.length) return;
      container.classList.add("loading");
      btn.classList.add("loading");

      const updates = {};

      rows.forEach((row) => {
        const variantId = row.dataset.variantId;
        if (variantId) {
          updates[variantId] = 0;
        }
      });

      try {
        const body = JSON.stringify({
          updates,
          sections: container.getSectionsToRender().map((s) => s.section),
          sections_url: window.location.pathname,
        });

        const response = await fetch(routes.cart_update_url, {
          ...NextSkyTheme.fetchConfig(),
          body,
        });

        const parsedState = await response.json();

        if (parsedState.errors) {
          notifier.show(parsedState.errors, "error", 3000);
          return;
        }
        container.updateVariantCart(parsedState, false, true);
      } catch (err) {
        console.error("Clear all error:", err);
      } finally {
        container.classList.remove("loading");
        btn.classList.remove("loading");
        new LazyLoader(".image-lazy-load");
        this.initAction();
      }
    };

    btn.addEventListener("click", handleClearAllClick);
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClearAllClick();
      }
    });
  }

  initStickyObserver() {
    const isMobile = () => window.innerWidth < 1025;
    if (!isMobile()) return;

    const infoElement = this.querySelector(".quick-order-list_info");
    if (!infoElement) return;
    const sentinel = document.createElement("div");
    sentinel.style.height = "1px";
    this.appendChild(sentinel);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target === this) {
            if (entry.isIntersecting) {
              infoElement.classList.add("sticky-active");
            } else {
              infoElement.classList.remove("sticky-active");
            }
          }
          if (entry.target === sentinel) {
            if (entry.isIntersecting) {
              infoElement.classList.remove("sticky-active");
            } else {
              if (this.getBoundingClientRect().top < window.innerHeight) {
                infoElement.classList.add("sticky-active");
              }
            }
          }
        });
      },
      {
        root: null,
        threshold: 0,
        rootMargin: "0px 0px -80px 0px"
      },
    );

    observer.observe(this);
    observer.observe(sentinel);

    // Resize handler
    const handleResize = () => {
      if (!isMobile()) {
        infoElement.classList.remove("sticky-active");
        observer.disconnect();
        window.removeEventListener("resize", handleResize);
      }
    };

    window.addEventListener("resize", handleResize);
  }
  initQuantityChange() {
    const container = this;

    container.addEventListener("change", (e) => {
      const input = e.target;

      if (!input.classList.contains("quantity__input")) return;

      const variantId = input.dataset.quantityVariantId;
      const quantity = parseInt(input.value) || 0;

      if (!variantId) return;

      const row = container.querySelector(`#Variant-${variantId}`);
      clearTimeout(input._timer);

      input._timer = setTimeout(async () => {
        const cartQty = parseInt(row?.dataset.cartQty) || 0;
        if (quantity === cartQty) return;

        container?.classList.add("loading");

        try {
          let response;

          if (cartQty === 0 && quantity > 0) {
            response = await fetch(routes.cart_add_url, {
              ...NextSkyTheme.fetchConfig(),
              body: JSON.stringify({
                id: variantId,
                quantity,
                sections: this.getSectionsToRender().map((s) => s.section),
                sections_url: window.location.pathname,
              }),
            });
          } else {
            response = await fetch(routes.cart_change_url, {
              ...NextSkyTheme.fetchConfig(),
              body: JSON.stringify({
                id: variantId,
                quantity,
                sections: this.getSectionsToRender().map((s) => s.section),
                sections_url: window.location.pathname,
              }),
            });
          }

          const parsedState = await response.json();

          if (parsedState.errors) {
            const qtyInput = row?.querySelector(".quantity__input");

            if (qtyInput) {
              qtyInput.value = qtyInput.getAttribute("data-cart-quantity");
            }

            notifier.show(parsedState.errors, "error", 3000);
            return;
          }

          input.dataset.cartQty = quantity;

          this.updateVariantCart(parsedState, variantId);
        } catch (err) {
          console.error("Cart update error:", err);
        } finally {
          new NextSkyTheme.FSProgressBar("free-ship-progress-bar");
          container?.classList.remove("loading");
          new LazyLoader(".image-lazy-load");
          this.initAction();
          this.initClearAll();
        }
        input.dispatchEvent(new Event("change"));
      }, 400);
    });
  }

  updateVariantCart(parsedState, variantId, removeAll = false) {
    this.getSectionsToRender().forEach((section, index) => {
      const sectionElement = section.selector
        ? document.querySelector(section.selector)
        : document.getElementById(section.id);
      if (!sectionElement) {
        return;
      }
      if (index === 0) {
        if (removeAll) {
          sectionElement.innerHTML = this.getSectionInnerHTML(
            parsedState.sections[section.id],
            section.selector,
          );
        } else {
          const variantItem = sectionElement.querySelector(
            `#Variant-${variantId}`,
          );
          if (!variantItem) return;
          const parsedDoc = new DOMParser().parseFromString(
            parsedState.sections[section.id],
            "text/html",
          );
          const parsedStateVariant = parsedDoc.querySelector(
            `#Variant-${variantId}`,
          );
          if (!parsedStateVariant) return;
          variantItem.setAttribute(
            "data-cart-qty",
            parsedStateVariant.getAttribute("data-cart-qty"),
          );
          variantItem.querySelector(".variant-item_totals").innerHTML =
            parsedStateVariant.querySelector(".variant-item_totals").innerHTML;
          variantItem.querySelector(".variant-item_quantity").innerHTML =
            parsedStateVariant.querySelector(
              ".variant-item_quantity",
            ).innerHTML;
        }
      } else {
        sectionElement.innerHTML = this.getSectionInnerHTML(
          parsedState.sections[section.id],
          section.selector,
        );
      }
    });
  }

  getSectionInnerHTML(html, selector = ".shopify-section") {
    return new DOMParser()
      .parseFromString(html, "text/html")
      .querySelector(selector).innerHTML;
  }

  getSectionsToRender() {
    return [
      {
        id: this.sectionId,
        section: this.sectionId,
        selector: ".quick-order-list_table",
      },
      {
        id: "cart-icon-bubble",
        section: "cart-icon-bubble",
      },
      {
        id: this.sectionId,
        section: this.sectionId,
        selector: ".quick-order-list_info",
      },
      {
        id: this.cart.sectionId,
        section: this.cart.sectionId,
        selector: ".cart-drawer .drawer__body",
      },
    ];
  }
}
customElements.define("quick-order-list", QuickOrderList);

class QuickOrderListRemoveItem extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.initRemove();
  }

  initRemove() {
    this.addEventListener("click", (e) => {
      e.preventDefault();
      this.handleRemove();
    });

    this.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.handleRemove();
      }
    });
  }

  async handleRemove() {
    const variantId = this.dataset.index;
    if (!variantId) return;
    const container = this.closest("quick-order-list");
    const row = container?.querySelector(`#Variant-${variantId}`);
    if (!row) return;
    const input = row.querySelector(".quantity__input");
    if (!input) return;
    try {
      container.classList.add("loading");
      const body = JSON.stringify({
        id: variantId,
        quantity: 0,
        sections: container.getSectionsToRender().map((s) => s.section),
        sections_url: window.location.pathname,
      });

      const response = await fetch(routes.cart_change_url, {
        ...NextSkyTheme.fetchConfig(),
        body,
      });

      const parsedState = await response.json();

      if (parsedState.errors) {
        notifier.show(parsedState.errors, "error", 3000);
        return;
      }
      input.value = 0;
      input.dataset.cartQty = 0;
      container.updateVariantCart(parsedState, variantId);
    } catch (err) {
      console.error("Remove error:", err);
    } finally {
      new NextSkyTheme.FSProgressBar("free-ship-progress-bar");
      this.remove();
      container.classList.remove("loading");
      new LazyLoader(".image-lazy-load");
      container.initAction();
      container.initClearAll();
    }
  }
}

customElements.define(
  "quick-order-list-remove-button",
  QuickOrderListRemoveItem,
);
