import * as NextSkyTheme from "@NextSkyTheme/global";
import { ProductForm } from "@NextSkyTheme/add-to-cart";
import { LazyLoadEventHover, LazyLoader } from "@NextSkyTheme/lazy-load";
import { notifier } from "@NextSkyTheme/notification";
import { eventModal } from "@NextSkyTheme/modal";

LazyLoadEventHover.run();
class MainCartEdit extends HTMLElement {
  constructor() {
    super();
    this.init();
    this.key = this.getAttribute("data-key");
    this.quantity = this.getAttribute("data-quantity");
    this.index = this.getAttribute("data-index");
    const href = this.getAttribute("data-href");
    const urlLocal = window.shopUrl;
    const variant =
      href.indexOf("?") > -1 ||
      href.indexOf("?variant=") > -1 ||
      href.indexOf("&variant=") > -1
        ? "&"
        : "/?";
    this.url = urlLocal + href + variant + "section_id=main-cart-edit";
  }

  init() {
    this.addEventListener("click", (e) => this.onClick(e));
    this.addEventListener("keyup", (e) => {
      if (e.key === "Enter") {
        this.onClick(e);
      }
    });
  }

  onClick(e) {
    this.addLoading(true);
    e.preventDefault();
    fetch(this.url)
      .then((response) => {
        if (!response.ok) {
          var error = new Error(response.status);
          throw error;
        }
        return response.text();
      })
      .then((response) => {
        const resultsHtml = NextSkyTheme.parser
          .parseFromString(response, "text/html")
          .getElementById("shopify-section-main-cart-edit");
        const modal = resultsHtml.querySelector("main-cart-edit-popup");
        NextSkyTheme.getBody().appendChild(modal);
        new LazyLoader(".image-lazy-load");
        setTimeout(
          () =>
            eventModal(
              document.querySelector("main-cart-edit-popup"),
              "open",
              true
            ),
          100
        );
        NextSkyTheme.global.rootToFocus = this;
      })
      .catch((error) => {
        throw error;
      })
      .finally(() => {
        this.addLoading(false);
        const modal = document.querySelector("main-cart-edit-popup");
        if (!modal) return;
        const quantity = modal.querySelector(
          'quantity-input [name="quantity"]'
        );
        quantity.value = this.quantity;
        const elementTotalPrice = modal.querySelector(".total-price__detail");
        const dataTotalPrice =
          elementTotalPrice.getAttribute("data-total-price");
        const totalPrice = NextSkyTheme.formatMoney(
          dataTotalPrice * this.quantity,
          cartStrings.money_format
        );
        elementTotalPrice.textContent = totalPrice;
        modal.setAttribute("data-key", this.key);
        modal.setAttribute("data-index", this.index);
      });
  }

  addLoading(action = false) {
    if (action) {
      this.classList.add("loading");
    } else {
      this.classList.remove("loading");
    }
  }
}
customElements.define("main-cart-edit", MainCartEdit);

if (!customElements.get("product-form-edit-cart")) {
  customElements.define(
    "product-form-edit-cart",
    class ProductFormCartEdit extends ProductForm {
      constructor() {
        super();
        this.form = this.querySelector("form");
        this.cart = document.querySelector("main-cart");
        if (this.form) {
          if (this.form.querySelector("[name=id]")) {
            this.form.querySelector("[name=id]").disabled = false;
          }
          this.form.addEventListener("submit", this.onSubmitHandler.bind(this));

          this.submitButton = this.querySelector('[type="submit"]');
          if (this.cart && this.submitButton)
            this.submitButton.setAttribute("aria-haspopup", "dialog");
          this.hideErrors = this.dataset.hideErrors === "true";
        }
        this.modal = document.querySelector("main-cart-edit-popup");
      }

      get cartKey() {
        return this.modal.getAttribute("data-key");
      }

      get cartIndex() {
        return this.modal.getAttribute("data-index");
      }

      get sectionId() {
        return this.cart.getAttribute("data-section-id");
      }

      onSubmitHandler(event) {
        event.preventDefault();
        if (this.submitButton.getAttribute("aria-disabled") === "true") return;
        this.submitButton.setAttribute("aria-disabled", true);
        this.submitButton.classList.add("loading");
        fetch(`${routes.cart_url}.js`)
          .then((response) => response.json())
          .then((cart) => {
            const line = cart.items.find((item) => item.key === this.cartKey);
            const variantId = this.form.querySelector('[name="id"]')?.value;
            if (line && String(line.variant_id) === String(variantId)) {
              this.changeCartLine(line);
            } else {
              this.addNewCart(line, cart);
            }
          })
          .catch(() => {
            this.addNewCart(null);
          });
      }

      changeCartLine(line) {
        this.addLoading(this.cartIndex, true);
        const formData = new FormData(this.form);
        const quantity = parseInt(formData.get("quantity"), 10) || line.quantity;
        const config = NextSkyTheme.fetchConfig();
        config.body = JSON.stringify({
          id: this.cartKey,
          quantity,
          sections: this.getSectionsToRender().map((section) => section.id),
          sections_url: window.location.pathname,
        });
        NextSkyTheme.global.rootToFocus = this.submitButton;
        fetch(`${routes.cart_change_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status || response.errors) {
              this.handleUpdateError(
                response.description || response.errors || response.message
              )
              return this.refreshCartAfterEditError(response)
            }
            this.onUpdateSuccess(response);
          })
          .catch((e) => {
            console.error(e);
            this.handleUpdateError();
          })
          .finally(() => {
            this.onRequestComplete();
          });
      }

      refreshCartAfterEditError(response) {
        return Promise.resolve(this.refreshCartAfterError(response)).then(() =>
          this.syncProductVariant()
        );
      }

      syncProductVariant(variantId = null) {
        if (!this.modal) return
        const key = this.cartKey
        const hasVariant = (element, id) =>
          element.dataset.key.split(":")[0] === String(id)

        const editButtons = Array.from(
          document.querySelectorAll("main-cart-edit[data-key]")
        )

        const lineIndex = document
          .getElementById(`CartItem-${this.cartIndex}`)
          ?.querySelector("main-cart-edit[data-key]")
        const editButton = variantId
          ? editButtons.find((element) => hasVariant(element, variantId))
          : editButtons.find((element) => element.dataset.key === key) ||
            (lineIndex && hasVariant(lineIndex, String(key).split(":")[0])
              ? lineIndex
              : null)
        if (!editButton) return
        this.modal.setAttribute("data-key", editButton.dataset.key)
        this.modal.setAttribute("data-index", editButton.dataset.index)
      }

      addNewCart(line, cartBefore = null) {
        this.addLoading(this.cartIndex, true);
        const config = NextSkyTheme.fetchConfig("javascript");
        config.headers["X-Requested-With"] = "XMLHttpRequest";
        delete config.headers["Content-Type"];
        const formData = new FormData(this.form);
        if (line && line.properties) {
          Object.entries(line.properties).forEach(([name, value]) => {
            if (value === null || value === undefined) return;
            if (formData.has(`properties[${name}]`)) return;
            if (Array.isArray(value)) {
              value.forEach((v) => formData.append(`properties[${name}][]`, v));
            } else {
              formData.append(`properties[${name}]`, value);
            }
          });
        }
        const sellingPlanId = line?.selling_plan_allocation?.selling_plan?.id;
        if (sellingPlanId && !formData.get("selling_plan")) {
          formData.append("selling_plan", sellingPlanId);
        }
        if (!line && this.cart) {
          formData.append(
            "sections",
            this.getSectionsToRender().map((section) => section.id)
          );
          formData.append("sections_url", window.location.pathname);
        }
        NextSkyTheme.global.rootToFocus = this.submitButton;
        config.body = formData;
        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              NextSkyTheme.publish(NextSkyTheme.PUB_SUB_EVENTS.cartError, {
                source: "product-form",
                productVariantId: formData.get("id"),
                errors: response.errors || response.description,
                message: response.message,
              });
              return this.handleAddError(response, line, cartBefore)
            }
            if (line) {
              this.removeOldCartLine();
            } else {
              this.onUpdateSuccess(response);
              this.onRequestComplete();
            }
          })
          .catch((e) => {
            console.error(e);
            this.handleUpdateError();
            this.onRequestComplete();
          });
      }

      handleAddError(response, line, cartBefore) {
        const showError = () => {
          this.handleUpdateError(response.description)
          this.onRequestComplete();
          return this.refreshCartAfterEditError(response)
        };
        if (!line || !cartBefore) return showError()
        const variantId = this.form.querySelector('[name="id"]')?.value
        const variantQuantity = (cart) =>
          cart.items
            .filter((item) => String(item.variant_id) === String(variantId))
            .reduce((total, item) => total + item.quantity, 0)
        
        return fetch(`${routes.cart_url}.js`)
          .then((cartResponse) => cartResponse.json())
          .then((cartAfter) => {
            if (variantQuantity(cartAfter) <= variantQuantity(cartBefore)) {
              return showError()
            }
            this.removeOldCartLine(response.description, variantId)
          })
          .catch(showError)
      }

      removeOldCartLine(errorMessage = "", variantId = null) {
        const config = NextSkyTheme.fetchConfig();
        config.body = JSON.stringify({
          id: this.cartKey,
          quantity: 0,
          sections: this.getSectionsToRender().map((section) => section.id),
          sections_url: window.location.pathname,
        });
        fetch(`${routes.cart_change_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              this.handleUpdateError(response.description || response.message);
              return;
            }
            if (errorMessage) {
              this.updateMainCart(response)
              this.syncProductVariant(variantId)
              this.handleUpdateError(errorMessage)
              return
            }
            this.onUpdateSuccess(response);
          })
          .catch((e) => {
            console.error(e);
            this.handleUpdateError();
          })
          .finally(() => {
            this.onRequestComplete();
          });
      }

      onUpdateSuccess(response) {
        this.updateMainCart(response);
        if (this.modal) {
          eventModal(
            document.querySelector("main-cart-edit-popup"),
            "close",
            true
          );
        }
        notifier.showElement(
          window.cartStrings.updateCartSuccess,
          null,
          "success",
          2500
        );
      }

      handleUpdateError(description) {
        const errorMessage =
          description ||
          window.cartStrings?.error ||
          "There was an error while updating your cart. Please try again.";
        if (this.querySelector(".product-form__error-message-wrapper")) {
          this.handleErrorMessage(errorMessage);
        } else {
          notifier.show(errorMessage, "error", 4000);
        }
      }

      onRequestComplete() {
        this.addLoading(this.cartIndex, false);
        new NextSkyTheme.FSProgressBar("free-ship-progress-bar");
        this.submitButton.classList.remove("loading");
        this.submitButton.removeAttribute("aria-disabled");
      }

      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;
        this.errorMessageWrapper =
          this.errorMessageWrapper ||
          this.querySelector(".product-form__error-message-wrapper");
        if (!this.errorMessageWrapper) return;
        this.errorMessage =
          this.errorMessage ||
          this.errorMessageWrapper.querySelector(
            ".product-form__error-message"
          );
        this.errorMessageWrapper.toggleAttribute("hidden", !errorMessage);
        if (errorMessage) {
          this.errorMessage.textContent = errorMessage;
        }
      }

      getSectionsToRender() {
        return [
          {
            id: this.sectionId,
            section: this.sectionId,
            selector: ".main-cart-items",
          },
          {
            id: "cart-icon-bubble",
            section: "cart-icon-bubble",
          },
          {
            id: this.sectionId,
            section: this.sectionId,
            selector: ".free-shipping-bar",
          },
          {
            id: this.sectionId,
            section: this.sectionId,
            selector: ".cart-info .totals",
          },
          {
            id: this.sectionId,
            section: this.sectionId,
            selector: ".cart-recommendations",
          },
        ];
      }
    }
  );
}
