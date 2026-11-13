import { LazyLoader } from "@NextSkyTheme/lazy-load";
import * as NextSkyTheme from "@NextSkyTheme/global";
import { eventModal } from "@NextSkyTheme/modal";
import { ProductForm } from "@NextSkyTheme/add-to-cart";
import { notifier, notifierInline } from "@NextSkyTheme/notification";
import { ProductSelectEvent } from "@shopify/standard-events";

const delegate = new NextSkyTheme.eventDelegate();
class VariantInput extends HTMLElement {

  static _preloadedVariantKeys = new Set();

  constructor() {
    (super(),
      (this.showMore = this.querySelector(".number-showmore")),
      (this.sizeChart = this.querySelector(".open-size-chart")),
      (this.eventTarget = null),
      (this._variantFetchController = null),
      (this._variantFetchId = 0),
      (this._cardFetchController = null),
      (this._cardFetchId = 0),
      (this.swatch = this.querySelector(
        ".product-card-swatch-js .variant-input",
      )),
      delegate.on(
        "click",
        '.product-card-swatch-js .variant-input [type="radio"]',
        this.onSwatchClick.bind(this),
      ),
      delegate.on(
        "keydown",
        '.product-card-swatch-js .variant-input [type="radio"]',
        function (event) {
          if (event.key === "Enter") {
            this.onSwatchClick(event);
          }
        }.bind(this),
      ));
      
  }

  get viewMargin() {
    return "0px 0px -10px 0px";
  }

  get sectionId() {
    return this.hasAttribute("data-section-id")
      ? this.getAttribute("data-section-id")
      : this.getAttribute("data-section-id");
  }

  get blockId() {
    return this.hasAttribute("data-block-id")
      ? this.getAttribute("data-block-id")
      : this.getAttribute("data-block-id");
  }

  get productUrl() {
    return this.hasAttribute("data-product-url")
      ? this.getAttribute("data-product-url")
      : this.getAttribute("data-product-url");
  }

  get productContext() {
    const productId = this.getAttribute("data-product-id");
    if (!productId) return null;
    return {
      id: `gid://shopify/Product/${productId}`,
      title: this.getAttribute("data-product-title") || "",
      handle: this.getAttribute("handle") || "",
    };
  }

  get optionNames() {
    const raw = this.getAttribute("data-option-names");
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  buildSelectedOptions(selectedValues) {
    const names = this.optionNames;
    if (!names.length) return [];
    return selectedValues
      .map((value, index) =>
        names[index] ? { name: names[index], value } : null,
      )
      .filter(Boolean);
  }

  buildResolvedVariant(variant) {
    if (!variant) return null;
    const names = this.optionNames;
    const selectedOptions = [1, 2, 3]
      .map((position, index) => {
        const value = variant[`option${position}`];
        if (value == null) return null;
        return { name: names[index] || `Option ${position}`, value };
      })
      .filter(Boolean);
    const priceAmount =
      typeof variant.price === "number"
        ? (variant.price / 100).toFixed(2)
        : String(variant.price ?? "");
    return {
      id: `gid://shopify/ProductVariant/${variant.id}`,
      title: variant.title || "",
      availableForSale: !!variant.available,
      price: {
        amount: priceAmount,
        currencyCode: window.Shopify?.currency?.active || "USD",
      },
      selectedOptions,
    };
  }

  connectedCallback() {
    if (this.showMore) {
      this.showMore.addEventListener(
        "click",
        this.onShowMoreClicked.bind(this),
      );
    }
    if (this.sizeChart) {
      this.sizeChart.addEventListener(
        "click",
        this.onShowSizeChartClicked.bind(this),
      );
    }
    this.querySelectorAll('.product-card-swatch-js [type="radio"]').forEach(
      (input) => {
        input.addEventListener("change", this.onSwatchChanged.bind(this));
      },
    );

    this.querySelectorAll('.product-card-variant-js [type="radio"]').forEach(
      (input) => {
        input.addEventListener("change", this.onVariantChange.bind(this));
      },
    );

    this.querySelectorAll('.product-bundle-swatch-js [type="radio"]').forEach(
      (input) => {
        input.addEventListener("change", this.onBundleVariantChange.bind(this));
      },
    );
  }

  async onBundleVariantChange(event) {
    const currentTarget = event.currentTarget;
    const position = currentTarget.getAttribute("data-option-position");
    const currentProduct = this.closest(".product__item-js");
    const selectedValues = Array.from(
      this.querySelectorAll('input[type="radio"]:checked'),
    ).map((radio) => radio.value);

    const queryParams = [];
    if (selectedValues.length > 0) {
      queryParams.push(`option_values=${selectedValues.join(",")}`);
    }
    const requestUrl = `${this.productUrl}?${queryParams.join("&")}`;
    this.createResponsiveProduct(requestUrl, currentProduct, position);
  }

  async preloadVariantImage(li) {
    if (!li) return;
    const hiddenImg = li.querySelector(".variant-image .featured-image");
    if (!hiddenImg) return;
    const src = hiddenImg.getAttribute("src");
    const srcset = hiddenImg.getAttribute("srcset");
    const key = srcset || src;
    if (!key) return;
    if (VariantInput._preloadedVariantKeys.has(key)) return;
    VariantInput._preloadedVariantKeys.add(key);
    const img = new Image();
    if (srcset) img.srcset = srcset;
    if (src) img.src = src;
    img.decode?.().catch(() => {});
  }

  async onSwatchChanged(event) {
    event.preventDefault();
    const target = event.target;
    if (target.hasAttribute("value")) {
      this.querySelectorAll("li.variant-input").forEach((variant) => {
        variant.classList.remove("active");
      });
      target.closest(".variant-input").classList.add("active");
      this.querySelectorAll(".product-variants-option").forEach((v) => {
        v.classList.remove("active");
      });
      if (target.hasAttribute("data-href")) {
        const currentProduct = this.closest(".product__item-js");
        if (target.hasAttribute("value")) {
          currentProduct
            .querySelectorAll(
              `a[href^="/products/${this.getAttribute("handle")}"`,
            )
            .forEach((link) => {
              const url = new URL(link.href);
              url.searchParams.set("variant", target.getAttribute("value"));
              link.href = `${url.pathname}${url.search}${url.hash}`;
            });
        }
        const productUrl = target.getAttribute("data-href");

        this.createResponsiveProduct(productUrl, currentProduct, null, target);
      }
    }
  }

  async onVariantChange(event) {
    event.preventDefault();
    this.eventTarget = event.target;
    const option_dropdown = this.eventTarget.closest(
      ".product-variants-option",
    );
    if (option_dropdown) {
      option_dropdown.classList.remove("active");
    }
    const selectedValues = Array.from(
      this.querySelectorAll('input[type="radio"]:checked'),
    ).map((radio) => radio.value);

    if (this._pendingProductSelect) {
      this._pendingProductSelect.resolve({ variant: null });
      this._pendingProductSelect = null;
    }
    const product = this.productContext;
    if (product) {
      const selectedOptions = this.buildSelectedOptions(selectedValues);
      if (selectedOptions.length) {
        const deferred = ProductSelectEvent.createPromise();
        deferred.promise.catch(() => {});
        this._pendingProductSelect = deferred;
        this.dispatchEvent(
          new ProductSelectEvent({
            product,
            selectedOptions,
            promise: deferred.promise,
          }),
        );
      }
    }

    const requestUrl = this.createRequestUrl(this.productUrl, selectedValues);
    this.fetchProductInfo({
      requestUrl,
      onSuccess: this.updateProductInfo,
    });
  }

  createRequestUrl(baseUrl, optionValues) {
    const queryParams = [`section_id=${this.sectionId}`];
    if (optionValues.length > 0) {
      queryParams.push(`option_values=${optionValues.join(",")}`);
    }
    return `${baseUrl}?${queryParams.join("&")}`;
  }

  fetchProductInfo({ requestUrl, onSuccess }) {
    const _this = this;
    const sectionId = this.sectionId;
    const blockId = this.blockId;
    const eventTarget = this.eventTarget;

    if (this._variantFetchController) {
      this._variantFetchController.abort();
    }
    this._variantFetchController = new AbortController();
    const { signal } = this._variantFetchController;
    const requestId = ++this._variantFetchId;

    fetch(requestUrl, { signal })
      .then((response) => response.text())
      .then((responseText) => {
        if (requestId !== this._variantFetchId) return;
        const parsedHTML = new DOMParser().parseFromString(
          responseText,
          "text/html",
        );
        onSuccess(
          parsedHTML,
          sectionId,
          eventTarget,
          blockId,
          _this,
          requestId,
        );
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        console.error("Error:", error);
        if (this._pendingProductSelect) {
          this._pendingProductSelect.reject(error);
          this._pendingProductSelect = null;
        }
      });
  }

  updateProductInfo(
    parsedHTML,
    sectionId,
    eventTarget,
    blockId,
    _this,
    requestId,
  ) {
    if (
      requestId != null &&
      requestId !== _this._variantFetchId
    ) {
      return;
    }
    const pendingProductSelect = _this._pendingProductSelect;
    _this._pendingProductSelect = null;
    const template = parsedHTML.querySelector(".template");
    const customOptionsModal = document.querySelector("custom-options-modal");
    let queryParsed, queryDocument;
    if (template && blockId) {
      const content = document.createElement("div");
      content.appendChild(template.content.firstElementChild.cloneNode(true));
      queryParsed = content.querySelector(`#Product-${blockId}`);
      queryDocument = document.querySelector(`#Product-${blockId}`);
      if (pendingProductSelect) {
        const shopableVariantScript = queryParsed?.querySelector(
          ".productVariantSelected",
        );
        const shopableVariant = shopableVariantScript?.textContent
          ? JSON.parse(shopableVariantScript.textContent)
          : null;
        pendingProductSelect.resolve({
          variant: _this.buildResolvedVariant(shopableVariant),
        });
      }
    } else {
      queryParsed = parsedHTML.getElementById(`Product-${sectionId}`);
      queryDocument = document.getElementById(`Product-${sectionId}`);
      const selectedVariant = queryParsed.querySelector(
        ".productVariantSelected",
      )?.textContent;
      if (selectedVariant) {
        const variant = JSON.parse(selectedVariant);
        if (pendingProductSelect) {
          pendingProductSelect.resolve({
            variant: _this.buildResolvedVariant(variant),
          });
        }
        const variantId = variant && variant.id ? variant.id : "";
        const newUrl = new URL(window.location.href);
        if (customOptionsModal) {
          customOptionsModal.setAttribute(
            "data-product-url",
            newUrl.toString(),
          );
        }
        if (variantId) {
          newUrl.searchParams.set("variant", variantId);
        } else {
          newUrl.searchParams.delete("variant");
        }
        if (_this.closest(".sec__main-product")) {
          window.history.replaceState(
            { path: newUrl.toString() },
            "",
            newUrl.toString(),
          );
        }
        const stickyAddCart = queryDocument.querySelector("sticky-add-cart");
        if (stickyAddCart) {
          _this.updateStickyAddCart(stickyAddCart, queryParsed, variantId);
        }

        const bought_together = document.querySelector(
          `.bought-together-products-list`,
        );

        if (bought_together && variantId) {
          const current_product =
            bought_together.querySelector(`.current-product`);
          current_product.querySelector(`input[name="items[][id]"]`).value =
            variantId;
        }

        const modalEdit = document.querySelector("main-cart-edit-popup");
        if (modalEdit) {
          const variantInput = modalEdit.querySelector("variant-input");
          const productUrl = variantInput.getAttribute("data-product-url");
          const requestUrl = productUrl + "?variant=" + variantId;
          _this.createResponsiveProduct(requestUrl, modalEdit);
        }
      } else if (pendingProductSelect) {
        pendingProductSelect.resolve({ variant: null });
      }
    }
    const isStale = () =>
      requestId != null && requestId !== _this._variantFetchId;
    const updateContent = async (blockClass) => {
      if (isStale()) return;
      const source = queryParsed.querySelector(`.${blockClass}`);
      const destination = queryDocument.querySelector(`.${blockClass}`);
      if (source && destination) {
        if (blockClass == "block__media-gallery") {
          destination.classList.add("insert");

          const fadeOut = destination.animate(
            { opacity: [1, 0] },
            { duration: 200, easing: "ease-in", fill: "forwards" },
          );
          await fadeOut.finished;

          destination.style.opacity = "0";
          fadeOut.cancel();

          if (isStale()) return;
          destination.innerHTML = source.innerHTML;

          destination.animate(
            { opacity: [0, 1] },
            { duration: 400, easing: "ease-in" },
          );
          destination.style.opacity = "";
          new LazyLoader(".image-lazy-load");
        } else if (blockClass == "block-product__buttons") {
          [".button_buy-now"].forEach((selector) => {
            const sourceButton = source.querySelector(selector);
            const targetButton = destination.querySelector(selector);
            if (sourceButton && targetButton)
              targetButton.innerHTML = sourceButton.innerHTML;
          });

          const sourceVariantId = source.querySelector('input[name="id"]');
          const targetVariantId = destination.querySelector('input[name="id"]');
          if (sourceVariantId && targetVariantId)
            targetVariantId.value = sourceVariantId.value;

          // Keep product-form.submitButton in sync after buy button HTML swap
          destination.querySelectorAll("product-form").forEach((productForm) => {
            const submitButton = productForm.querySelector('[type="submit"]');
            if (!submitButton) return;
            productForm.submitButton = submitButton;
            if (productForm.cart) {
              submitButton.setAttribute("aria-haspopup", "dialog");
            }
          });
        } else if (blockClass == "block-product__stock-countdown") {
          const countdownData = queryParsed
            .querySelector(`.${blockClass}`)
            .querySelector("stock-countdown");
          const countdown = queryDocument
            .querySelector(`.${blockClass}`)
            .querySelector("stock-countdown");
          if (countdown && countdownData) {
            const itemsLeft = parseInt(countdownData.dataset.itemsLeft);
            const message = countdownData.dataset.message;
            const qty = parseInt(countdownData.dataset.quantity);
            if (itemsLeft >= qty && message && qty >= 1) {
              countdown.classList.add("block");
              countdown.classList.remove("hidden");
              const qt = countdown.querySelector("span.count");
              const progressbar = countdown.querySelector(".progressbar-stock");
              let widthProgress;
              if ((qty / itemsLeft) * 100 > 100) {
                widthProgress = 100;
              } else {
                widthProgress = (qty / itemsLeft) * 100;
              }
              progressbar.style.setProperty("--percent", `100%`);

              setTimeout(() => {
                progressbar.style.setProperty("--percent", `${widthProgress}%`);
              }, 850);
              if (qt) {
                qt.innerHTML = qty;
              }
            } else {
              countdown.classList.remove("block");
              countdown.classList.add("hidden");
            }
          }
        } else {
          await (destination.innerHTML = source.innerHTML);
          if (isStale()) return;
          if (blockClass == "block-product__variant-picker") {
            if (
              eventTarget &&
              destination.querySelector(
                `input[value="${eventTarget.value}"]:checked`,
              )
            ) {
              destination
                .querySelector(`input[value="${eventTarget.value}"]:checked`)
                .focus({ focusVisible: true });
            }
          }
        }
      }
    };

    const blocksToUpdate = [
      "block__media-gallery",
      "block-product__stock-countdown",
      "block-product__variant-picker",
      "block-product__badges",
      "block-product__price",
      "block-product__inventory",
      "block-product__buttons",
      "block-product__subscription-widget",
      "block-product__pickup",
      "sticky-sticky__buy-buttons",
    ];
    blocksToUpdate.forEach(updateContent);
    new LazyLoader(".image-lazy-load");
  }

  async createResponsiveProduct(
    productUrl,
    currentProduct,
    position = null,
    target = null,
  ) {
    const currentImage = currentProduct.querySelector(".featured-image");
    let variantImage = null;

    if (target) {
      variantImage = target
        .closest("li")
        ?.querySelector(".variant-image .featured-image");
    }
    if (variantImage && currentImage) {
      const currentSrcset = currentImage.getAttribute("srcset");
      const newSrc = variantImage.getAttribute("src");
      const newSrcset = variantImage.getAttribute("srcset");
      if (newSrcset && currentSrcset !== newSrcset) {
        await Motion.animate(
          currentImage,
          { opacity: [1, 0] },
          { duration: 0.1, easing: "ease-in", fill: "forwards" },
        ).finished;
        const media = currentImage.closest(".product__media, .image__media");
        async function waitForImage(src, srcset) {
          const img = new Image();
          if (srcset) img.srcset = srcset;
          if (src) img.src = src;
          if (img.complete) {
            await img.decode?.().catch(() => {});
            return;
          }
          media?.classList.add("loading_img");
          await new Promise((resolve) => {
            img.onload = img.onerror = resolve;
          });
          media?.classList.remove("loading_img");
          await img.decode?.().catch(() => {});
        }
        await waitForImage(newSrc, newSrcset);
        if (newSrc) currentImage.setAttribute("src", newSrc);
        if (newSrcset) currentImage.setAttribute("srcset", newSrcset);
        await currentImage.decode?.().catch(() => {});
        Motion.animate(
          currentImage,
          { opacity: [0, 1] },
          { duration: 0.1, easing: "ease-in" },
        );
      }
    }

    const url = `${productUrl}&section_id=card-product`;
    if (this._cardFetchController) {
      this._cardFetchController.abort();
    }
    this._cardFetchController = new AbortController();
    const { signal } = this._cardFetchController;
    const requestId = ++this._cardFetchId;

    fetch(url, { signal })
      .then((response) => response.text())
      .then(async (responseText) => {
        if (requestId !== this._cardFetchId) return;
        const html = new DOMParser().parseFromString(responseText, "text/html");
        const newImage = html.querySelector(".featured-image");
        const secondaryImage = currentProduct.querySelector(
          ".product__hover-img",
        );
        if (secondaryImage) {
          secondaryImage.classList.remove("hidden");
        }
        const currentPrice = currentProduct.querySelector(".product__price");
        const newPrice = html.querySelector(".product__price");
        if (currentPrice && newPrice) {
          currentPrice.replaceWith(newPrice);
        }

        const currentBadges = currentProduct.querySelector(".product__badges");
        const newBadges = html.querySelector(".product__badges");
        if (currentBadges && newBadges) {
          currentBadges.replaceWith(newBadges);
        }

        const currentQuickAdd = currentProduct.querySelector(
          ".variant-quick-add-js",
        );
        const newQuickAdd = html.querySelector(".variant-quick-add-js");
        if (currentQuickAdd && newQuickAdd) {
          currentQuickAdd.replaceWith(newQuickAdd);
          currentProduct.querySelector("quick-add").classList.remove("active");
        }

        const currentVariantBundle =
          currentProduct.querySelector(".variant-bundle-js");
        const newVariantBundle = html.querySelector(".variant-bundle-js");
        if (currentVariantBundle && newVariantBundle) {
          currentProduct
            .querySelectorAll(".product-bundle-swatch-js")
            .forEach((fieldset) => {
              const positionOption = fieldset.getAttribute(
                "data-position-option",
              );
              if (positionOption !== position) {
                currentProduct.querySelector(
                  ".variants-bundle-" + positionOption + "",
                ).innerHTML = html.querySelector(
                  ".variants-bundle-" + positionOption + "",
                ).innerHTML;
                currentProduct
                  .querySelectorAll(
                    ".variants-bundle-" + positionOption + ' [type="radio"]',
                  )
                  .forEach((input) => {
                    input.addEventListener(
                      "change",
                      this.onBundleVariantChange.bind(this),
                    );
                  });
              }
            });
          const jsonScript = html.querySelector(
            '[class^="productVariantSelected"]',
          );
          const productData = JSON.parse(jsonScript.textContent);
          currentProduct.querySelector(
            '[class^="product-variant-bundle-id"]',
          ).value = productData.id;
          const productId = currentProduct.getAttribute("data-product-id");
          const variant = currentProduct
            .closest("outfit-popup")
            .querySelector(`.variant-select[product-id="${productId}"]`);
          if (variant) {
            variant.querySelector(`input[name="items[][id]"]`).value =
              productData.id;
            variant
              .querySelector(`input[name="items[][id]"]`)
              .setAttribute("data-price", productData.price);
          }
          let total_price = 0;
          currentProduct
            .closest("outfit-popup")
            .querySelectorAll(".variant-select")
            .forEach((item) => {
              if (item.querySelector(`input[name="items[][id]"]`)) {
                const price = Number(
                  item
                    .querySelector(`input[name="items[][id]"]`)
                    .getAttribute("data-price"),
                );
                total_price = total_price + price;
              }
            });
          currentProduct
            .closest("outfit-popup")
            .querySelectorAll(".total-price .price")
            .forEach((element) => {
              element.innerHTML = NextSkyTheme.formatMoney(
                total_price,
                cartStrings.money_format,
              );
            });
        }

        if (
          !variantImage &&
          currentImage &&
          newImage &&
          currentImage.src !== newImage.src
        ) {
          await Motion.animate(
            currentImage,
            { opacity: [1, 0] },
            { duration: 0.1, easing: "ease-in", fill: "forwards" },
          ).finished;
          if (requestId !== this._cardFetchId) return;
          await new Promise((resolve) =>
            newImage.complete ? resolve() : (newImage.onload = resolve),
          );
          if (requestId !== this._cardFetchId) return;
          currentImage.replaceWith(newImage);
          Motion.animate(
            newImage,
            { opacity: [0, 1] },
            { duration: 0.1, easing: "ease-in" },
          );
        }
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        console.error("Error updating price:", e);
      });
  }

  async updateStickyAddCart(stickyAddCart, queryParsed, variantId = null) {
    if (stickyAddCart.querySelector("select") && variantId) {
      stickyAddCart.querySelector("select").value = variantId;
    }
    const newStickyAddCart = queryParsed.querySelector("sticky-add-cart");
    const currentPrice = stickyAddCart.querySelector(".product__price");
    const newPrice = newStickyAddCart.querySelector(".product__price");
    if (currentPrice && newPrice) {
      currentPrice.replaceWith(newPrice);
    }

    const currentBadges = stickyAddCart.querySelector(".product__badges");
    const newBadges = newStickyAddCart.querySelector(".product__badges");
    if (currentBadges && newBadges) {
      currentBadges.replaceWith(newBadges);
    }

    const currentImage = stickyAddCart.querySelector(".featured-image");
    const newImage = newStickyAddCart.querySelector(".featured-image");
    if (currentImage && newImage && currentImage.src !== newImage.src) {
      await Motion.animate(
        currentImage,
        { opacity: [1, 0] },
        { duration: 0.1, easing: "ease-in", fill: "forwards" },
      ).finished;
      await new Promise((resolve) =>
        newImage.complete ? resolve() : (newImage.onload = resolve),
      );
      currentImage.replaceWith(newImage);
      Motion.animate(
        newImage,
        { opacity: [0, 1] },
        { duration: 0.1, easing: "ease-in" },
      );
    }
  }

  updateBoughtTogether(currentSection) {
    let total_price = 0,
      total_price_compare = 0,
      checked_items_count = 0;
    const count = currentSection.querySelectorAll(".count-product");
    const btnCount = currentSection.querySelectorAll(".btn-count-js");
    currentSection
      .querySelectorAll(".bought-together-checkbox[type='checkbox']")
      .forEach((item) => {
        const product = item.closest(".product__item-js");
        const variant_select = product.querySelector(
          "variant-swatch-select select",
        );
        const valueNoVariant = Number(
          product.getAttribute("data-compare-price"),
        );
        const productId = item.value;
        let value_option = "";
        if (variant_select) {
          value_option = variant_select.value;
        }
        let price = Number(item.getAttribute("data-price"));
        let compare_at_price = Number(item.getAttribute("data-price-compare"));
        if (valueNoVariant) {
          compare_at_price = Number(valueNoVariant);
        }
        if (variant_select) {
          price = Number(
            variant_select.options[variant_select.selectedIndex].getAttribute(
              "data-price",
            ),
          );
          compare_at_price = Number(
            variant_select.options[variant_select.selectedIndex].getAttribute(
              "data-price-compare",
            ),
          );
          if (compare_at_price === 0) {
            compare_at_price = price;
          }
        }
        const variant = currentSection.querySelector(
          `[product-id="${productId}"]`,
        );
        if (item.checked) {
          checked_items_count++;
          total_price = total_price + price;
          total_price_compare = total_price_compare + compare_at_price;
          if (value_option) {
            variant.querySelector(`input[name="items[][id]"]`).value =
              value_option;
          }
          variant.querySelectorAll("input").forEach((input) => {
            input.disabled = false;
          });
        } else {
          variant.querySelectorAll("input").forEach((input) => {
            input.disabled = true;
          });
        }
      });

    const countProductMobile = document.querySelector(
      "button-bought-together-mobile .count-product",
    );
    count.forEach((element) => {
      if (checked_items_count > 0) {
        element.innerHTML = checked_items_count;
      } else {
        element.innerHTML = 0;
      }
    });

    if (checked_items_count > 0) {
      countProductMobile.innerHTML = checked_items_count;
      btnCount.forEach((btn) => {
        btn.removeAttribute("disabled");
      });
    } else {
      countProductMobile.innerHTML = 0;
      btnCount.forEach((btn) => {
        btn.setAttribute("disabled", true);
      });
    }

    currentSection
      .querySelectorAll(".bought-together-products-form .total-price .price")
      .forEach((element) => {
        element.innerHTML = NextSkyTheme.formatMoney(
          total_price,
          cartStrings.money_format,
        );
      });

    const comparePriceElement = currentSection.querySelector(
      ".bought-together-products-form .total-price .compare-price",
    );
    const savingPrice = currentSection.querySelector(
      ".bought-together-products-form .total-price .saving-price-js",
    );
    if (comparePriceElement) {
      comparePriceElement.innerHTML = NextSkyTheme.formatMoney(
        total_price_compare,
        cartStrings.money_format,
      );
      if (total_price_compare > 0 && total_price_compare !== total_price) {
        comparePriceElement.classList.remove("hidden");
        savingPrice.classList.remove("hidden");
        comparePriceElement
          .closest(".total-price")
          .querySelector(".price")
          .classList.add("sale-color");
      } else {
        comparePriceElement.classList.add("hidden");
        savingPrice.classList.add("hidden");
        comparePriceElement
          .closest(".total-price")
          .querySelector(".price")
          .classList.remove("sale-color");
      }
      this.updateSavingPrice(currentSection, total_price, total_price_compare);
    }

    const totalElementMobile = document.querySelector(
      "button-bought-together-mobile .total-price .price",
    );
    if (totalElementMobile) {
      totalElementMobile.innerHTML = NextSkyTheme.formatMoney(
        total_price,
        cartStrings.money_format,
      );
    }
  }

  updateSavingPrice(currentSection, totalPrice, totalPriceCompare) {
    const savingPriceElement = currentSection.querySelector(
      ".bought-together-products-form .total-price .saving-price-js .price-saving",
    );
    if (savingPriceElement) {
      const savingPrice = totalPriceCompare - totalPrice;
      const savingPercent = Math.round((savingPrice / totalPriceCompare) * 100);
      const savingPercentCompare = savingPercent * 100;
      if (savingPercentCompare > savingPrice) {
        savingPriceElement.innerHTML =
          window.cartStrings?.save_price + savingPercent + "%";
      } else {
        savingPriceElement.innerHTML =
          window.cartStrings?.save_price +
          NextSkyTheme.formatMoney(savingPrice, cartStrings.money_format);
      }
    }
  }

  onSwatchClick(event) {
    const variant = event.target.closest(".variant-input");
    if (
      variant.querySelector('[type="radio"]').checked &&
      variant.classList.contains("active")
    ) {
      window.location.href = variant
        .querySelector('[type="radio"]')
        .getAttribute("data-href");
    }
  }

  onShowMoreClicked(event) {
    const swatch_hidden = event.target
      .closest(".swatch-color")
      .querySelectorAll("li.hidden");
    swatch_hidden.forEach((swatch) => {
      swatch.classList.remove("hidden");
    });
    this.showMore.closest("li").remove();
  }

  onShowSizeChartClicked(event) {
    event.preventDefault();
    const sizeChart = event.target
      .closest(".product-variants-info")
      .querySelector("template");
    if (sizeChart) {
      const content = document.createElement("div");
      content.appendChild(sizeChart.content.firstElementChild.cloneNode(true));
      NextSkyTheme.getBody().appendChild(
        content.querySelector("size-chart-popup"),
      );
    }
    setTimeout(
      () =>
        eventModal(
          document.querySelector("size-chart-popup"),
          "open",
          true,
          null,
          false,
        ),
      100,
    );
    NextSkyTheme.global.rootToFocus = this.sizeChart;
  }
}
customElements.define("variant-input", VariantInput);

class VariantsDropdown extends HTMLElement {
  constructor() {
    (super(),
      (this.variants = this.closest(".product-variants-option")),
      this.init());
  }

  init() {
    if (this.variants) {
      this.variants
        .querySelector(".variants__option-dropdown")
        .addEventListener("click", this.onShowDropdownClicked.bind(this));
    }
    document.addEventListener("click", this.handleClickOutside.bind(this));
  }

  onShowDropdownClicked(event) {
    if (this.closest(".product-variants-option").classList.contains("active")) {
      this.closest(".product-variants-option").classList.remove("active");
    } else {
      this.closest(".product-variants-js")
        .querySelectorAll(".product-variants-option.active")
        .forEach((element) => {
          element.classList.remove("active");
        });
      this.closest(".product-variants-option").classList.add("active");
    }
  }

  handleClickOutside(event) {
    if (!event.target.closest(".product-variants-option")) {
      document
        .querySelectorAll(".product-variants-option.active")
        .forEach((element) => {
          element.classList.remove("active");
        });
    }
  }
}
customElements.define("variants-dropdown", VariantsDropdown);

class VariantQuickAdd extends ProductForm {
  constructor() {
    super();
    this.productUrl = this.getAttribute("data-product-url");
    this.productForm = this.querySelector(".id-variant-quick-add");
    this.formQuickAdd = this.querySelector(".product-quick-addtocart-btn");
    this.quickAdd = this.closest("quick-add");
    this._onVariantChangeQuickAdd = this.onVariantChangeQuickAdd.bind(this);
    this._onCartAdded = null;
    this.bindVariantChangeListeners();
  }

  disconnectedCallback() {
    this.removeCartAddedListener();
  }

  bindVariantChangeListeners(root = this) {
    root
      .querySelectorAll('.product-card-variant-js [type="radio"]')
      .forEach((input) => {
        input.removeEventListener("change", this._onVariantChangeQuickAdd);
        input.addEventListener("change", this._onVariantChangeQuickAdd);
      });
  }

  removeCartAddedListener() {
    if (this._onCartAdded) {
      document.removeEventListener("nextsky:cart:added", this._onCartAdded);
      this._onCartAdded = null;
    }
  }

  getQuickAddContainer() {
    // Check if in popup (mobile) or desktop
    const isPopup = this.closest("quick-add-popup");
    const containerClass = isPopup
      ? ".quick-add-variant-popup"
      : ".quick-add-variant-container";
    return this.closest(containerClass);
  }

  setQuickAddLoading(currentTarget, isLoading) {
    currentTarget?.closest("li")?.classList.toggle("loading", isLoading);
    this.getQuickAddContainer()?.classList.toggle("loading", isLoading);
  }

  resetQuickAddUI(currentTarget) {
    this.querySelectorAll('input[type="radio"]').forEach((r) => {
      if (!r.classList.contains("options-color")) {
        r.checked = false;
      }
    });
    this.querySelectorAll(".product-variants-info .option_value").forEach(
      (r) => {
        r.innerHTML = "";
      },
    );
    if (this.quickAdd) {
      this.quickAdd.classList.remove("active");
    }
    const popup = this.closest("quick-add-popup");
    if (popup) {
      eventModal(popup, "close", false);
    }
    this.setQuickAddLoading(currentTarget, false);
  }

  async onVariantChangeQuickAdd(event) {
    event.preventDefault();
    const currentTarget = event.currentTarget;
    const optionValue = currentTarget.getAttribute("data-option-value");
    currentTarget.closest("fieldset").querySelector(".option_value").innerHTML =
      optionValue;
    const selectedValues = Array.from(
      this.querySelectorAll('input[type="radio"]:checked'),
    ).map((radio) => radio.value);
    const requestUrl = this.createRequestUrl(this.productUrl, selectedValues);
    const optionCountSize = this.getAttribute("data-options-size");
    const isReadyToAdd = optionCountSize == selectedValues.length;
    if (isReadyToAdd) {
      this.setQuickAddLoading(currentTarget, true);
    }
    fetch(requestUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Quick-add request failed: ${response.status}`);
        }
        return response.text();
      })
      .then(async (responseText) => {
        let html = new DOMParser().parseFromString(responseText, "text/html");
        if (isReadyToAdd) {
          const jsonScript = html.querySelector(
            '[class^="productVariantSelected"]',
          );
          if (!jsonScript?.textContent) {
            throw new Error("Quick-add variant data missing");
          }
          const productData = JSON.parse(jsonScript.textContent);
          this.productForm.value = productData.id;
          if (
            !this.formQuickAdd ||
            this.formQuickAdd.getAttribute("aria-disabled") === "true"
          ) {
            this.setQuickAddLoading(currentTarget, false);
            return;
          }
          this.removeCartAddedListener();
          this._onCartAdded = (event) => {
            this._onCartAdded = null;
            if (event?.detail?.success === false) {
              this.setQuickAddLoading(currentTarget, false);
              return;
            }
            this.resetQuickAddUI(currentTarget);
          };
          document.addEventListener("nextsky:cart:added", this._onCartAdded, {
            once: true,
          });
          this.formQuickAdd.click();
        } else {
          if (this.closest("quick-add-popup")) {
            const tpl = html.querySelector("template.quick-add-popup");
            html = tpl?.content?.querySelector("variant-quick-add") || html;
          }
          this.querySelectorAll(".product-card-variant-js").forEach(
            (fieldset) => {
              const radioValues = Array.from(
                fieldset.querySelectorAll('input[type="radio"]:checked'),
              ).map((radio) => radio.value);
              if (radioValues.length === 0) {
                const position = fieldset.getAttribute("data-position-option");
                const targetFieldset = this.querySelector(
                  ".variants-fieldset-" + position + "",
                );
                const sourceFieldset = html.querySelector(
                  ".variants-fieldset-" + position + "",
                );
                if (!targetFieldset || !sourceFieldset) return;
                targetFieldset.innerHTML = sourceFieldset.innerHTML;
                this.bindVariantChangeListeners(targetFieldset);
              }
            },
          );
        }
      })
      .catch((error) => {
        console.error("Quick-add error:", error);
        if (isReadyToAdd) {
          this.setQuickAddLoading(currentTarget, false);
        }
      });
  }

  createRequestUrl(baseUrl, optionValues) {
    const queryParams = [`section_id=card-product`];
    if (optionValues.length > 0) {
      queryParams.push(`option_values=${optionValues.join(",")}`);
    }
    return `${baseUrl}?${queryParams.join("&")}`;
  }
}
customElements.define("variant-quick-add", VariantQuickAdd);

class VariantSwatchSelect extends VariantInput {
  constructor() {
    super();
  }

  get sectionId() {
    return this.hasAttribute("section-id")
      ? this.getAttribute("section-id")
      : this.getAttribute("section-id");
  }

  connectedCallback() {
    this.querySelector("select").addEventListener(
      "change",
      this.onSwatchChanged.bind(this),
    );
  }

  onSwatchChanged(e) {
    e.preventDefault();
    const currentTarget = e.currentTarget;
    if (currentTarget.value) {
      const productUrl =
        currentTarget.options[currentTarget.selectedIndex].getAttribute(
          "data-product-url",
        );
      let currentProduct = this.closest(".product__item-js");
      if (this.closest("sticky-add-cart")) {
        this.onVariantChange(productUrl);
        return;
      }
      currentProduct
        .querySelectorAll(`a[href^="/products/${this.getAttribute("handle")}"`)
        .forEach((link) => {
          const url = new URL(link.href);
          url.searchParams.set("variant", currentTarget.value);
          link.href = `${url.pathname}${url.search}${url.hash}`;
        });
      this.createResponsiveProduct(productUrl, currentProduct);
      if (currentProduct.closest(".bought-together-products__wrapper")) {
        this.boughtTogetherProducts(
          currentProduct,
          currentProduct.closest(".bought-together-products__wrapper"),
        );
      }
      this.updateProductFormBundleRoutine(currentProduct, currentTarget.value);
      this.updateProductFormBundleSection(currentProduct, currentTarget.value);
      this.updateTotalPriceCompactProductBundle(e);
    }
  }

  createRequestUrl(baseUrl) {
    const queryParams = [`section_id=${this.sectionId}`];
    return `${baseUrl}&${queryParams.join("&")}`;
  }

  onVariantChange(productUrl) {
    const requestUrl = this.createRequestUrl(productUrl);
    this.fetchProductInfo({
      requestUrl,
      onSuccess: this.updateProductInfo,
    });
  }

  boughtTogetherProducts(currentProduct, currentSection) {
    const checkbox = currentProduct.querySelector(".bought-together-checkbox");
    if (!checkbox.checked) {
      return;
    }
    this.updateBoughtTogether(currentSection);
  }

  updateProductFormBundleRoutine(currentProduct, value) {
    const productFormBundle = currentProduct.querySelector(
      "product-form-bundle",
    );
    if (productFormBundle) {
      const id = productFormBundle.querySelector("input[name=id]");
      if (id) {
        id.value = value;
      }
    }
  }

  updateProductFormBundleSection(currentProduct, value) {
    const productFormBundle = currentProduct.querySelector("product-form");
    const currentSection = currentProduct.closest("bundle-products");
    if (productFormBundle) {
      const id = productFormBundle.querySelector("input[name=id]");
      if (id) {
        id.value = value;
      }
    }
    if (currentSection) {
      const productId = currentProduct.getAttribute("data-product-id");
      const variant = currentSection.querySelector(
        `[product-id="${productId}"]`,
      );
      if (variant) {
        variant.querySelector(`input[name="items[][id]"]`).value = value;
      }
    }
  }

  updateTotalPriceCompactProductBundle(event) {
    const currentTarget = event.currentTarget;
    const currentSection = currentTarget.closest("section");

    const bundleProducts = currentSection?.querySelector("bundle-products");
    if (!bundleProducts) return;

    const productForm = bundleProducts.querySelector(".bundle-products-form");
    if (!productForm) return;

    let totalPrice = 0;

    const bundleItems = bundleProducts.querySelectorAll("bundle-item");
    bundleItems.forEach((item) => {
      const select = item.querySelector("select");
      if (select && select.value) {
        const selectedOption = select.options[select.selectedIndex];
        const price = selectedOption.getAttribute("data-price");
        if (price) {
          totalPrice += parseFloat(price);
        }
      }
    });

    const totalPriceElement = productForm.querySelector(".total-price");
    if (totalPriceElement && totalPrice > 0) {
      const formattedPrice = NextSkyTheme.formatMoney(
        totalPrice,
        cartStrings.money_format,
      );
      totalPriceElement.textContent = formattedPrice;
    }
  }
}
customElements.define("variant-swatch-select", VariantSwatchSelect);

class CardBoughtTogether extends VariantSwatchSelect {
  constructor() {
    super();
  }

  connectedCallback() {
    this.querySelectorAll('[type="checkbox"]').forEach((input) => {
      input.addEventListener("change", this.onSelectBoughtTogether.bind(this));
    });
  }

  onSelectBoughtTogether(e) {
    const currentTarget = e.currentTarget;
    if (currentTarget.value) {
      const currentProduct = this.closest(".product__item-js");
      if (currentProduct.closest(".bought-together-products__wrapper")) {
        this.updateBoughtTogether(
          currentProduct.closest(".bought-together-products__wrapper"),
        );
      }
    }
  }
}
customElements.define("card-bought-together", CardBoughtTogether);

const parseSavedRecommendationSize = (savedDataRaw) => {
  if (!savedDataRaw) return "";

  try {
    const parsed = JSON.parse(savedDataRaw);
    if (parsed && parsed.size) {
      return parsed.size;
    }
  } catch (e) {
    return savedDataRaw;
  }

  return "";
};

const decodeHtmlEntities = (value) => {
  if (typeof value !== "string") return "";
  if (!value.includes("&")) return value;

  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
};

const SIZE_TRIGGER_PLACEHOLDER_REGEX = /(\[size\]|\{\{\s*size\s*\}\})/gi;
const SIZE_TRIGGER_PLACEHOLDER_TEST_REGEX = /(\[size\]|\{\{\s*size\s*\}\})/i;
const SIZE_TRIGGER_PLACEHOLDER_TOKEN =
  "__SIZE_RECOMMENDATION_TRIGGER_PLACEHOLDER__";

const createRecommendedSizeTriggerSpan = (sizeValue) => {
  const sizeSpan = document.createElement("span");
  sizeSpan.className = "recommended-size-trigger-size";
  sizeSpan.textContent = sizeValue;
  return sizeSpan;
};

const injectRecommendedSizeIntoTemplate = (root, sizeValue) => {
  const textNodes = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  let currentNode = walker.nextNode();
  while (currentNode) {
    textNodes.push(currentNode);
    currentNode = walker.nextNode();
  }

  textNodes.forEach((textNode) => {
    if (!textNode.nodeValue?.includes(SIZE_TRIGGER_PLACEHOLDER_TOKEN)) return;

    const fragment = document.createDocumentFragment();
    const parts = textNode.nodeValue.split(SIZE_TRIGGER_PLACEHOLDER_TOKEN);

    parts.forEach((part, index) => {
      if (part) {
        fragment.appendChild(document.createTextNode(part));
      }

      if (index < parts.length - 1) {
        fragment.appendChild(createRecommendedSizeTriggerSpan(sizeValue));
      }
    });

    textNode.parentNode?.replaceChild(fragment, textNode);
  });
};

const renderRecommendationTriggerLabel = (element, template, sizeValue) => {
  if (!element) return;

  const hasPlaceholder = SIZE_TRIGGER_PLACEHOLDER_TEST_REGEX.test(template);
  const templateWithPlaceholderToken = hasPlaceholder
    ? template.replace(
        SIZE_TRIGGER_PLACEHOLDER_REGEX,
        SIZE_TRIGGER_PLACEHOLDER_TOKEN,
      )
    : `${template} ${SIZE_TRIGGER_PLACEHOLDER_TOKEN}`;

  const templateNode = document.createElement("template");
  templateNode.innerHTML = templateWithPlaceholderToken;

  injectRecommendedSizeIntoTemplate(templateNode.content, sizeValue);

  element.textContent = "";
  element.appendChild(templateNode.content);
};

const syncSizeRecommendationTriggerValue = (productId, explicitSize) => {
  if (!productId) return;

  const savedSize =
    explicitSize !== undefined
      ? explicitSize
      : parseSavedRecommendationSize(
          localStorage.getItem(`size_recommendation_${productId}`),
        );

  let normalizedSize = "";
  if (typeof savedSize === "string") {
    normalizedSize = savedSize.trim();
  } else if (savedSize != null) {
    normalizedSize = String(savedSize).trim();
  }

  document
    .querySelectorAll(
      `size-recommendation[data-product-id="${productId}"] [data-recommended-size-trigger-value]`,
    )
    .forEach((element) => {
      const sizeRecommendationRoot = element.closest("size-recommendation");
      const buttonTitle = sizeRecommendationRoot?.querySelector(
        ".size-recommendation-button-title",
      );

      if (normalizedSize) {
        const recommendationLabelTemplateRaw =
          window.cartStrings?.size_recommendation_trigger_label ||
          "<span>Size: [size]</span> a's Recommendation";
        const recommendationLabelTemplate = decodeHtmlEntities(
          recommendationLabelTemplateRaw,
        );
        const sizeValue = normalizedSize.toUpperCase();
        renderRecommendationTriggerLabel(
          element,
          recommendationLabelTemplate,
          sizeValue,
        );
        element.classList.remove("hidden");
        buttonTitle?.classList.add("hidden");
      } else {
        element.textContent = "";
        element.classList.add("hidden");
        buttonTitle?.classList.remove("hidden");
      }
    });
};

class SizeRecommendation extends HTMLElement {
  constructor() {
    super();
    this.openButton = this.querySelector(".open-size-recommendation");
    this.popupWrapper = this.querySelector(".popup-size-recommendation");
  }

  get productId() {
    return this.dataset.productId || "";
  }

  connectedCallback() {
    syncSizeRecommendationTriggerValue(this.productId);

    if (this.openButton) {
      this.openButton.addEventListener(
        "click",
        this.onShowSizeRecommendationClicked.bind(this),
      );
    }
  }

  onShowSizeRecommendationClicked(event) {
    event.preventDefault();

    if (!this.popupWrapper) return;

    const template = this.popupWrapper.querySelector("template");
    if (!template) return;

    let popup = document.querySelector("size-recommendation-popup");

    if (!popup) {
      const content = template.content.firstElementChild.cloneNode(true);
      NextSkyTheme.getBody().appendChild(content);
      popup = content;
    }

    requestAnimationFrame(() => {
      eventModal(popup, "open", true, null, false);
    });

    NextSkyTheme.global.rootToFocus = this.openButton;
  }
}

if (!customElements.get("size-recommendation")) {
  customElements.define("size-recommendation", SizeRecommendation);
}

class SizeRecommendationForm extends HTMLElement {
  static CONSTANTS = {
    CM_TO_IN: 0.393701,
    IN_TO_CM: 2.54,
    KG_TO_LBS: 2.20462,
    LBS_TO_KG: 0.453592,
    TAB_ORDER: [
      "basics",
      "tummy_shapes",
      "hips_shapes",
      "measurements",
      "result",
    ],
    HEIGHT_RANGES: { cm: { min: 100, max: 250 }, in: { min: 39, max: 98 } },
    WEIGHT_RANGES: { kg: { min: 30, max: 300 }, lbs: { min: 66, max: 661 } },
  };

  constructor() {
    super();
    this.sizeAdjustments = {
      letterSize: {
        bodyShape: { slim: -0.5, curvy: 0.5, athletic: 0.5 },
        fitPreference: { fitted: -0.5, oversized: 1.5 },
        height: {
          female: {
            tall: { threshold: 180, adjustment: 0.5 },
            short: { threshold: 155, adjustment: -0.5 },
          },
          male: {
            tall: { threshold: 190, adjustment: 0.5 },
            short: { threshold: 165, adjustment: -0.5 },
          },
        },
      },
      numericSize: {
        bodyShape: { slim: -1, curvy: 1, athletic: 0.5 },
        fitPreference: { fitted: -1, oversized: 2 },
        height: {
          female: {
            short: { threshold: 160, adjustment: -2 },
            tall: { threshold: 175, adjustment: 2 },
          },
          male: {
            short: { threshold: 170, adjustment: -2 },
            tall: { threshold: 185, adjustment: 2 },
          },
        },
      },
      bmiThresholds: {
        female: [18.5, 21.9, 24.9, 29.9],
        male: [18.5, 21.9, 24.9, 29.9],
        other: [18.5, 21.9, 24.9, 29.9],
      },
      numericSizeBase: {
        female: { baseSize: 58, bmiMultiplier: 2.5 },
        male: { baseSize: 68, bmiMultiplier: 3 },
        other: { baseSize: 63, bmiMultiplier: 2.8 },
      },
    };
  }

  connectedCallback() {
    const tabContainer = this;
    const tabContents = tabContainer.querySelectorAll(".size-tab__content");
    const size_tabs_nav = tabContainer.querySelector(".size-tabs__nav");
    const size_tabs_content =
      tabContainer.querySelectorAll(".size-tab__content");

    // Function to update tab heights
    const updateTabHeights = () => {
      if (size_tabs_nav) {
        const navHeight = size_tabs_nav.offsetHeight;
        tabContainer.style.setProperty("--size-tab-height", `${navHeight}px`);
      }
    };

    // Initial calculation
    updateTabHeights();

    // Recalculate on window resize
    const resizeHandler = () => updateTabHeights();
    window.addEventListener("resize", resizeHandler);

    // Cleanup on disconnect
    this.addEventListener("disconnectedCallback", () => {
      window.removeEventListener("resize", resizeHandler);
    });

    if (!tabContainer) return;

    const productId = this.dataset.productId;
    syncSizeRecommendationTriggerValue(productId);

    if (productId) {
      const savedDataRaw = localStorage.getItem(
        `size_recommendation_${productId}`,
      );

      if (savedDataRaw) {
        let savedSize = null;
        let savedInputs = null;

        try {
          const parsed = JSON.parse(savedDataRaw);
          savedSize = parsed.size;
          savedInputs = parsed.inputs;
        } catch (e) {
          savedSize = savedDataRaw;
        }
        if (savedInputs) {
          const heightUnit = tabContainer.querySelector("#unit-toggle-height");
          if (heightUnit && savedInputs.heightUnit) {
            if (savedInputs.heightUnit === "in") {
              heightUnit.checked = true;
            }
          }
          const heightInput = tabContainer.querySelector(
            '[data-unit-input="height"]',
          );
          if (heightInput && savedInputs.height) {
            heightInput.dataset.valueCm = savedInputs.height;

            if (savedInputs.heightUnit === "in") {
              // Setup ft/in inputs if saved in imperial
              const heightFtInContainer =
                heightInput.parentElement.querySelector(".height-ft-in-inputs");
              const heightFtInput = heightInput.parentElement.querySelector(
                '[data-unit-input="height-ft"]',
              );
              const heightInInput = heightInput.parentElement.querySelector(
                '[data-unit-input="height-in"]',
              );

              if (
                heightFtInput &&
                heightInInput &&
                savedInputs.heightFt &&
                savedInputs.heightIn
              ) {
                heightFtInput.value = savedInputs.heightFt;
                heightInInput.value = savedInputs.heightIn;
                const parentDiv =
                  heightInput.closest(".size-form__group") ||
                  heightInput.parentElement.parentElement;
                const heightCmContainer =
                  parentDiv?.querySelector(".height-cm-input");
                const heightFtInContainer = parentDiv?.querySelector(
                  ".height-ft-in-inputs",
                );
                heightCmContainer?.classList.add("hidden");
                heightFtInContainer?.classList.remove("hidden");
                heightFtInContainer?.classList.add("flex");
              }
              heightInput.min =
                SizeRecommendationForm.CONSTANTS.HEIGHT_RANGES.in.min;
              heightInput.max =
                SizeRecommendationForm.CONSTANTS.HEIGHT_RANGES.in.max;
            } else {
              heightInput.value =
                savedInputs.heightDisplay || savedInputs.height;
              heightInput.min =
                SizeRecommendationForm.CONSTANTS.HEIGHT_RANGES.cm.min;
              heightInput.max =
                SizeRecommendationForm.CONSTANTS.HEIGHT_RANGES.cm.max;
            }
          }
          const weightUnit = tabContainer.querySelector("#unit-toggle-weight");
          if (weightUnit && savedInputs.weightUnit) {
            if (savedInputs.weightUnit === "lbs") {
              weightUnit.checked = true;
            }
          }
          const weightInput = tabContainer.querySelector(
            '[data-unit-input="weight"]',
          );
          if (weightInput && savedInputs.weight) {
            weightInput.dataset.valueKg = savedInputs.weight;
            weightInput.value = savedInputs.weightDisplay || savedInputs.weight;

            // Restore weight unit label visibility
            const parentDiv =
              weightInput.closest(".size-form__group") ||
              weightInput.parentElement.parentElement;
            const weightLabels = parentDiv?.querySelectorAll(".unit-weight-kg");
            const weightKgLabel = weightLabels?.[0];
            const weightLbsLabel = weightLabels?.[1];

            if (savedInputs.weightUnit === "lbs") {
              weightInput.min = "66";
              weightInput.max = "661";
              weightKgLabel?.classList.add("hidden");
              weightKgLabel?.classList.remove("flex");
              weightLbsLabel?.classList.remove("hidden");
              weightLbsLabel?.classList.add("hidden");
            } else {
              weightInput.min = "30";
              weightInput.max = "300";
              weightKgLabel?.classList.remove("hidden");
              weightKgLabel?.classList.add("flex");
              weightLbsLabel?.classList.add("hidden");
              weightLbsLabel?.classList.remove("flex");
            }
          }

          const genderSelect = tabContainer.querySelector("#size-gender");
          if (genderSelect) genderSelect.value = savedInputs.gender || "";

          if (savedInputs.bodyShape) {
            const radio = tabContainer.querySelector(
              `input[name="body_shape"][value="${savedInputs.bodyShape}"]`,
            );
            if (radio) radio.checked = true;
          }

          if (savedInputs.fitPreference) {
            const radio = tabContainer.querySelector(
              `input[name="fit_preference"][value="${savedInputs.fitPreference}"]`,
            );
            if (radio) radio.checked = true;
          }

          const systemSizingSelect = tabContainer.querySelector(
            "[data-system-sizing]",
          );
          if (systemSizingSelect && savedInputs.systemSizingIndex) {
            systemSizingSelect.value = savedInputs.systemSizingIndex;
            systemSizingSelect.dispatchEvent(new Event("change"));

            if (savedInputs.bustSize) {
              const radio = tabContainer.querySelector(
                `input[name="bust_size_${savedInputs.systemSizingIndex}"][value="${savedInputs.bustSize}"]`,
              );
              if (radio) radio.checked = true;
            }
            if (savedInputs.cupSize) {
              const radio = tabContainer.querySelector(
                `input[name="cup_size_${savedInputs.systemSizingIndex}"][value="${savedInputs.cupSize}"]`,
              );
              if (radio) radio.checked = true;
            }
          }

          const result_details = tabContainer.querySelector(
            ".size-recommendation-details",
          );
          this.renderContentResult(result_details, savedInputs);
        }

        if (savedSize) {
          const resultTab = tabContainer.querySelector(
            '[data-tab-content="result"]',
          );
          if (resultTab) {
            const sizeElement = resultTab.querySelector(
              ".recommended-size-value",
            );
            if (sizeElement) {
              sizeElement.textContent = savedSize.toUpperCase();
            }

            const submitBtn = tabContainer.querySelector("[data-submit-size]");
            if (submitBtn) {
              const mainProductSection = document.querySelector(
                ".product-detail__information",
              );
              if (mainProductSection) {
                const selectedOptions = [];
                const variantInputs = mainProductSection.querySelectorAll(
                  ".variant-options:checked",
                );

                const sortedInputs = Array.from(variantInputs).sort((a, b) => {
                  const posA = parseInt(
                    a.getAttribute("data-option-position") || 0,
                  );
                  const posB = parseInt(
                    b.getAttribute("data-option-position") || 0,
                  );
                  return posA - posB;
                });

                sortedInputs.forEach((input) => {
                  selectedOptions.push(input.value);
                });

                let sizeOptionPosition = null;
                const allVariantInputs =
                  mainProductSection.querySelectorAll(".variant-options");

                for (const input of allVariantInputs) {
                  const optionValue = input.getAttribute("data-option-value");
                  if (
                    optionValue &&
                    optionValue.toLowerCase().trim() ===
                      savedSize.toLowerCase().trim()
                  ) {
                    sizeOptionPosition =
                      parseInt(
                        input.getAttribute("data-option-position") || 1,
                      ) - 1;
                    selectedOptions[sizeOptionPosition] = input.value;
                    break;
                  }
                }

                if (selectedOptions.length > 0) {
                  submitBtn.dataset.variantIdSize = selectedOptions.join(",");
                }
              }
            }

            this.updateAddToCartButton(tabContainer, savedSize);
          }
        }
      }
    }

    const tabBtns = Array.from(tabContainer.querySelectorAll(".size-tab__btn"));
    const tabOrder = tabBtns.map((button) => button.dataset.tab);

    const focusFirstFocusableInPanel = (targetTab) => {
      const targetPanel = tabContainer.querySelector(
        `[data-tab-content="${targetTab}"]`,
      );
      if (!targetPanel) return;

      const firstFocusableElement = targetPanel.querySelector(
        '[data-size-radio-card]:not([tabindex="-1"]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );

      requestAnimationFrame(() => {
        if (firstFocusableElement) {
          firstFocusableElement.focus();
          return;
        }

        targetPanel.focus();
      });
    };

    const switchToTab = (targetTab, options = {}) => {
      const { focusPanel = false } = options;
      const targetIndex = tabOrder.indexOf(targetTab);
      if (targetIndex === -1) return;

      tabBtns.forEach((button) => {
        const buttonTab = button.dataset.tab;
        const buttonIndex = tabOrder.indexOf(buttonTab);
        const isCurrent = buttonIndex === targetIndex;

        if (buttonIndex <= targetIndex) {
          button.classList.add("active");
        } else {
          button.classList.remove("active");
        }

        button.setAttribute("aria-selected", isCurrent ? "true" : "false");
        button.setAttribute("tabindex", isCurrent ? "0" : "-1");

        if (isCurrent) {
          button.querySelector("span")?.classList.remove("hidden");
        } else {
          button.querySelector("span")?.classList.add("hidden");
        }
      });

      tabContents.forEach((panel) => {
        const panelTab = panel.getAttribute("data-tab-content");
        const isCurrent = panelTab === targetTab;

        panel.classList.toggle("active", isCurrent);
        panel.setAttribute("aria-hidden", isCurrent ? "false" : "true");
        if (isCurrent) {
          panel.removeAttribute("hidden");
        } else {
          panel.setAttribute("hidden", "");
        }
      });

      if (focusPanel) {
        focusFirstFocusableInPanel(targetTab);
      }
    };

    const moveTabFocus = (targetIndex) => {
      if (!tabBtns.length) return;
      const normalizedIndex =
        ((targetIndex % tabBtns.length) + tabBtns.length) % tabBtns.length;
      tabBtns[normalizedIndex].focus();
    };

    const hasSavedData =
      productId && localStorage.getItem(`size_recommendation_${productId}`);

    if (hasSavedData) {
      setTimeout(() => {
        switchToTab("result");
      }, 0);
    } else {
      switchToTab("basics");
    }

    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        switchToTab(btn.dataset.tab);
      });

      btn.addEventListener("keydown", (event) => {
        const currentIndex = tabBtns.indexOf(btn);
        if (currentIndex === -1) return;

        switch (event.key) {
          case "ArrowRight":
          case "ArrowDown":
            event.preventDefault();
            moveTabFocus(currentIndex + 1);
            break;
          case "ArrowLeft":
          case "ArrowUp":
            event.preventDefault();
            moveTabFocus(currentIndex - 1);
            break;
          case "Home":
            event.preventDefault();
            moveTabFocus(0);
            break;
          case "End":
            event.preventDefault();
            moveTabFocus(tabBtns.length - 1);
            break;
          case "Enter":
          case " ":
            event.preventDefault();
            switchToTab(btn.dataset.tab, { focusPanel: true });
            break;
        }
      });
    });

    tabContainer.querySelectorAll("[data-next-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const nextTab = btn.dataset.nextTab;
        const isBasicsNextAction =
          nextTab === "tummy_shapes" &&
          btn.closest('[data-tab-content="basics"]');

        if (isBasicsNextAction && !this.validateBasicsFields(tabContainer)) {
          return;
        }

        if (nextTab && tabOrder.includes(nextTab)) {
          switchToTab(nextTab, { focusPanel: true });
        }
      });
    });

    const radioGroupsByName = new Map();
    tabContainer
      .querySelectorAll('input[type="radio"][name]')
      .forEach((radio) => {
        if (!radioGroupsByName.has(radio.name)) {
          radioGroupsByName.set(radio.name, []);
        }
        radioGroupsByName.get(radio.name).push(radio);
      });

    radioGroupsByName.forEach((groupRadios) => {
      groupRadios.forEach((radio) => {
        radio.addEventListener("keydown", (event) => {
          this.handleRecommendationRadioKeydown(event, groupRadios);
        });
      });
    });

    this.bindRecommendationRadioCards(tabContainer);

    const genderSelect = tabContainer.querySelector("#size-gender");

    if (genderSelect) {
      genderSelect.addEventListener("change", () => {
        if (genderSelect.value) {
          const placeholder = genderSelect.querySelector('option[value=""]');
          if (placeholder) placeholder.disabled = true;
        }
      });
    }

    const submitBtn = tabContainer.querySelector("[data-submit-size]");
    if (submitBtn) {
      submitBtn.addEventListener("click", () => {
        if (!this.validateBasicsFields(tabContainer, { report: false })) {
          switchToTab("basics");
          requestAnimationFrame(() => {
            this.validateBasicsFields(tabContainer, {
              report: true,
              focusFirstInvalid: true,
            });
          });
          return;
        }

        const heightInput = tabContainer.querySelector(
          '[data-unit-input="height"]',
        );
        const weightInput = tabContainer.querySelector(
          '[data-unit-input="weight"]',
        );
        const genderSelect = tabContainer.querySelector("#size-gender");
        const bodyShape = tabContainer.querySelector(
          'input[name="body_shape"]:checked',
        );
        const fitPreference = tabContainer.querySelector(
          'input[name="fit_preference"]:checked',
        );
        const systemSizingSelect = tabContainer.querySelector(
          "[data-system-sizing]",
        );

        const selectedIndex = systemSizingSelect
          ? systemSizingSelect.value
          : "0";
        const bustSize = tabContainer.querySelector(
          `input[name="bust_size_${selectedIndex}"]:checked`,
        );
        const cupSize = tabContainer.querySelector(
          `input[name="cup_size_${selectedIndex}"]:checked`,
        );

        const formData = {
          height: heightInput?.dataset.valueCm || heightInput?.value || "",
          weight: weightInput?.dataset.valueKg || weightInput?.value || "",
          gender: genderSelect?.value || "",
          bodyShape: bodyShape?.value || "",
          fitPreference: fitPreference?.value || "",
          systemSizing:
            systemSizingSelect?.options[systemSizingSelect.selectedIndex]
              ?.dataset.system || "",
          bustSize: bustSize?.value || "",
          cupSize: cupSize?.value || "",
        };

        const sizeDataElement = tabContainer.querySelector(
          ".size-recommendation-data",
        );
        const productSizeData = sizeDataElement
          ? JSON.parse(sizeDataElement.textContent)
          : {};
        const availableSizes = productSizeData.product_size
          ? productSizeData.product_size
              .split(",")
              .map((s) => s.trim().toLowerCase())
          : [];

        const sizeChartData = JSON.parse(
          tabContainer.querySelector(".size-chart-data")?.textContent || "{}",
        );

        const recommendedSize = this.calculateRecommendation(
          formData,
          sizeChartData,
          availableSizes,
        );
        const productId = tabContainer.dataset.productId;
        if (productId && recommendedSize) {
          const height_check = tabContainer.querySelector(
            '[data-unit-toggle="height"] #unit-toggle-height',
          );
          const weight_check = tabContainer.querySelector(
            '[data-unit-toggle="weight"] #unit-toggle-weight',
          );

          const heightUnit = height_check && height_check.checked ? "in" : "cm";
          const weightUnit =
            weight_check && weight_check.checked ? "lbs" : "kg";

          // Get height display - handle both cm and ft/in formats
          let heightDisplay = heightInput?.value || "";
          let heightFt = "";
          let heightIn = "";

          if (heightUnit === "in") {
            const heightFtInput = heightInput.parentElement.querySelector(
              '[data-unit-input="height-ft"]',
            );
            const heightInInput = heightInput.parentElement.querySelector(
              '[data-unit-input="height-in"]',
            );
            heightFt = heightFtInput?.value || "";
            heightIn = heightInInput?.value || "";
            heightDisplay =
              heightFt || heightIn ? `${heightFt} ft ${heightIn} in` : "";
          }

          const dataToSave = {
            size: recommendedSize,
            inputs: {
              ...formData,
              heightUnit: heightUnit,
              weightUnit: weightUnit,
              heightDisplay: heightDisplay,
              heightFt: heightFt,
              heightIn: heightIn,
              weightDisplay: weightInput?.value || "",
              systemSizingIndex: systemSizingSelect
                ? systemSizingSelect.value
                : null,
            },
          };
          this.renderContentResult(
            tabContainer.querySelector(".size-recommendation-details"),
            dataToSave.inputs,
          );
          localStorage.setItem(
            `size_recommendation_${productId}`,
            JSON.stringify(dataToSave),
          );
          syncSizeRecommendationTriggerValue(productId, recommendedSize);
        }

        const resultTab = tabContainer.querySelector(
          '[data-tab-content="result"]',
        );
        if (resultTab) {
          const sizeElement = resultTab.querySelector(
            ".recommended-size-value",
          );
          if (sizeElement && recommendedSize) {
            sizeElement.textContent = recommendedSize.toUpperCase();
            tabContainer
              .querySelector(".recommend-size-available")
              .classList.remove("hidden");
            tabContainer
              .querySelector(".recommend-size-info_html")
              .classList.remove("hidden");
            tabContainer
              .querySelector(".recommend-size-not-available")
              .classList.add("hidden");
          } else {
            tabContainer
              .querySelector(".recommend-size-available")
              .classList.add("hidden");
            tabContainer
              .querySelector(".recommend-size-info_html")
              .classList.add("hidden");
            tabContainer
              .querySelector(".recommend-size-not-available")
              .classList.remove("hidden");
          }

          const submitBtn = tabContainer.querySelector("[data-submit-size]");
          if (submitBtn && recommendedSize) {
            const mainProductSection = document.querySelector(
              ".product-detail__information",
            );
            if (!mainProductSection) return;

            const selectedOptions = [];
            const variantInputs = mainProductSection.querySelectorAll(
              ".variant-options:checked",
            );

            const sortedInputs = Array.from(variantInputs).sort((a, b) => {
              const posA = parseInt(
                a.getAttribute("data-option-position") || 0,
              );
              const posB = parseInt(
                b.getAttribute("data-option-position") || 0,
              );
              return posA - posB;
            });

            sortedInputs.forEach((input) => {
              selectedOptions.push(input.value);
            });

            let sizeOptionPosition = null;
            const allVariantInputs =
              mainProductSection.querySelectorAll(".variant-options");

            for (const input of allVariantInputs) {
              const optionValue = input.getAttribute("data-option-value");
              if (
                optionValue &&
                optionValue.toLowerCase().trim() ===
                  recommendedSize.toLowerCase().trim()
              ) {
                sizeOptionPosition =
                  parseInt(input.getAttribute("data-option-position") || 1) - 1;
                selectedOptions[sizeOptionPosition] = input.value;
                break;
              }
            }

            if (selectedOptions.length > 0) {
              submitBtn.dataset.variantIdSize = selectedOptions.join(",");
            }
          }
          this.updateAddToCartButton(tabContainer, recommendedSize);

          switchToTab("result", { focusPanel: true });
        }
      });
    }

    const systemSizingSelect = tabContainer.querySelector(
      "[data-system-sizing]",
    );
    if (systemSizingSelect) {
      systemSizingSelect.addEventListener("change", () => {
        const selectedIndex = systemSizingSelect.value;

        const bustGroup = tabContainer.querySelector("[data-bust-group]");
        if (bustGroup) {
          bustGroup
            .querySelectorAll("[data-bust-options]")
            .forEach((options) => {
              options.classList.add("hidden");
              options.classList.remove("flex");
              options
                .querySelectorAll("input")
                .forEach((input) => (input.checked = false));
            });
          bustGroup
            .querySelector(`[data-bust-options="${selectedIndex}"]`)
            ?.classList.remove("hidden");
          bustGroup
            .querySelector(`[data-bust-options="${selectedIndex}"]`)
            ?.classList.add("flex");
        }

        const cupGroup = tabContainer.querySelector("[data-cup-group]");
        if (cupGroup) {
          cupGroup.querySelectorAll("[data-cup-options]").forEach((options) => {
            options.classList.add("hidden");
            options.classList.remove("flex");
            options
              .querySelectorAll("input")
              .forEach((input) => (input.checked = false));
          });
          cupGroup
            .querySelector(`[data-cup-options="${selectedIndex}"]`)
            ?.classList.remove("hidden");
          cupGroup
            .querySelector(`[data-cup-options="${selectedIndex}"]`)
            ?.classList.add("flex");
        }

        this.refreshRecommendationRadioCards(tabContainer);
      });
    }

    const CM_TO_IN = SizeRecommendationForm.CONSTANTS.CM_TO_IN;
    const IN_TO_CM = SizeRecommendationForm.CONSTANTS.IN_TO_CM;
    const KG_TO_LBS = SizeRecommendationForm.CONSTANTS.KG_TO_LBS;
    const LBS_TO_KG = SizeRecommendationForm.CONSTANTS.LBS_TO_KG;

    const heightToggle = tabContainer.querySelector(
      '[data-unit-toggle="height"]',
    );
    const heightInput = tabContainer.querySelector(
      '[data-unit-input="height"]',
    );

    if (heightToggle && heightInput) {
      let height_check = heightToggle.querySelector("#unit-toggle-height");
      let heightUnit = height_check && height_check.checked ? "in" : "cm";

      if (height_check) {
        height_check.addEventListener("keydown", (event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          height_check.checked = !height_check.checked;
          height_check.dispatchEvent(new Event("change", { bubbles: true }));
        });
      }

      // Get parent container for all height-related inputs
      const parentDiv =
        heightInput.closest(".size-form__group") ||
        heightInput.parentElement.parentElement;
      const heightFtInContainer = parentDiv?.querySelector(
        ".height-ft-in-inputs",
      );
      const heightFtInput = parentDiv?.querySelector(
        '[data-unit-input="height-ft"]',
      );
      const heightInInput = parentDiv?.querySelector(
        '[data-unit-input="height-in"]',
      );
      const heightCmContainer = parentDiv?.querySelector(".height-cm-input");

      // Initialize unit label styling
      const heightToggleContainer = heightToggle.closest(
        '[data-unit-toggle="height"]',
      );
      if (heightToggleContainer) {
        const leftLabel =
          heightToggleContainer.querySelector(".unit-label.left");
        const rightLabel =
          heightToggleContainer.querySelector(".unit-label.right");

        if (heightUnit === "in") {
          leftLabel?.classList.remove("heading-color");
          rightLabel?.classList.add("heading-color");
        } else {
          leftLabel?.classList.add("heading-color");
          rightLabel?.classList.remove("heading-color");
        }
      }

      // Initialize display
      if (heightUnit === "in") {
        heightCmContainer?.classList.add("hidden");
        heightFtInContainer?.classList.remove("hidden");
        heightFtInContainer?.classList.add("flex");
      } else {
        heightCmContainer?.classList.remove("hidden");
        heightFtInContainer?.classList.add("hidden");
        heightFtInContainer?.classList.remove("flex");
      }

      this.syncHeightInputMode(
        heightInput,
        heightFtInput,
        heightInInput,
        heightUnit,
      );

      heightInput.addEventListener("input", () => {
        this.clearRecommendationFieldError(heightInput);
        const val = parseFloat(heightInput.value);
        if (!isNaN(val)) {
          heightInput.dataset.valueCm =
            heightUnit === "cm" ? val : val * IN_TO_CM;
        } else {
          delete heightInput.dataset.valueCm;
        }
      });

      // Handle ft/in inputs
      if (heightFtInput && heightInInput) {
        heightFtInput.addEventListener("input", () => {
          this.clearRecommendationFieldError(heightFtInput);
          const hasFtValue = heightFtInput.value !== "";
          const hasInValue = heightInInput.value !== "";
          if (!hasFtValue || !hasInValue) {
            delete heightInput.dataset.valueCm;
            return;
          }

          const ft = parseFloat(heightFtInput.value) || 0;
          const inches = parseFloat(heightInInput.value) || 0;
          const totalInches = ft * 12 + inches;
          const cm = Math.round(totalInches * IN_TO_CM);
          heightInput.dataset.valueCm = cm;
        });

        heightInInput.addEventListener("input", () => {
          this.clearRecommendationFieldError(heightInInput);
          const hasFtValue = heightFtInput.value !== "";
          const hasInValue = heightInInput.value !== "";
          if (!hasFtValue || !hasInValue) {
            delete heightInput.dataset.valueCm;
            return;
          }

          const ft = parseFloat(heightFtInput.value) || 0;
          const inches = parseFloat(heightInInput.value) || 0;
          const totalInches = ft * 12 + inches;
          const cm = Math.round(totalInches * IN_TO_CM);
          heightInput.dataset.valueCm = cm;
        });
      }

      height_check.addEventListener("change", () => {
        let newUnit = height_check.checked ? "in" : "cm";
        let currentVal = parseFloat(heightInput.value);

        // Update unit labels styling
        const heightToggleContainer = heightToggle.closest(
          '[data-unit-toggle="height"]',
        );
        if (heightToggleContainer) {
          const leftLabel =
            heightToggleContainer.querySelector(".unit-label.left");
          const rightLabel =
            heightToggleContainer.querySelector(".unit-label.right");

          if (newUnit === "in") {
            leftLabel?.classList.remove("heading-color");
            rightLabel?.classList.add("heading-color");
          } else {
            leftLabel?.classList.add("heading-color");
            rightLabel?.classList.remove("heading-color");
          }
        }

        if (newUnit === "in") {
          // Convert cm to ft/in
          const cmValue = parseFloat(heightInput.dataset.valueCm || currentVal);
          const totalInches = Math.round(cmValue / IN_TO_CM);
          const ft = Math.floor(totalInches / 12);
          const inches = totalInches % 12;

          if (heightFtInput && heightInInput) {
            heightFtInput.value = ft;
            heightInInput.value = inches;
            heightCmContainer?.classList.add("hidden");
            heightFtInContainer?.classList.remove("hidden");
            heightFtInContainer?.classList.add("flex");
          }
        } else {
          // Convert from ft/in to cm
          const ft = parseFloat(heightFtInput?.value) || 0;
          const inches = parseFloat(heightInInput?.value) || 0;
          const totalInches = ft * 12 + inches;
          const cmValue = Math.round(totalInches * IN_TO_CM);

          heightInput.value = cmValue;
          heightInput.dataset.valueCm = cmValue;
          heightCmContainer?.classList.remove("hidden");
          heightFtInContainer?.classList.add("hidden");
          heightFtInContainer?.classList.remove("flex");
          heightInput.min =
            SizeRecommendationForm.CONSTANTS.HEIGHT_RANGES.cm.min;
          heightInput.max =
            SizeRecommendationForm.CONSTANTS.HEIGHT_RANGES.cm.max;
        }

        this.syncHeightInputMode(
          heightInput,
          heightFtInput,
          heightInInput,
          newUnit,
        );

        heightUnit = newUnit;
      });
    }

    const weightToggle = tabContainer.querySelector(
      '[data-unit-toggle="weight"]',
    );
    const weightInput = tabContainer.querySelector(
      '[data-unit-input="weight"]',
    );

    if (weightToggle && weightInput) {
      let weight_check = weightToggle.querySelector("#unit-toggle-weight");
      let weightUnit = weight_check && weight_check.checked ? "lbs" : "kg";

      if (weight_check) {
        weight_check.addEventListener("keydown", (event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          weight_check.checked = !weight_check.checked;
          weight_check.dispatchEvent(new Event("change", { bubbles: true }));
        });
      }

      // Get weight unit label spans
      const parentDiv =
        weightInput.closest(".size-form__group") ||
        weightInput.parentElement.parentElement;
      const weightLabels = parentDiv?.querySelectorAll(".unit-weight-kg");
      const weightKgLabel = weightLabels?.[0];
      const weightLbsLabel = weightLabels?.[1];

      // Initialize unit label styling and visibility
      const weightToggleContainer = weightToggle.closest(
        '[data-unit-toggle="weight"]',
      );
      if (weightToggleContainer) {
        const leftLabel =
          weightToggleContainer.querySelector(".unit-label.left");
        const rightLabel =
          weightToggleContainer.querySelector(".unit-label.right");

        if (weightUnit === "lbs") {
          leftLabel?.classList.remove("heading-color");
          rightLabel?.classList.add("heading-color");
          weightKgLabel?.classList.add("hidden");
          weightKgLabel?.classList.remove("flex");
          weightLbsLabel?.classList.remove("hidden");
          weightLbsLabel?.classList.add("flex");
        } else {
          leftLabel?.classList.add("heading-color");
          rightLabel?.classList.remove("heading-color");
          weightKgLabel?.classList.remove("hidden");
          weightKgLabel?.classList.add("flex");
          weightLbsLabel?.classList.add("hidden");
          weightLbsLabel?.classList.remove("flex");
        }
      }

      weightInput.addEventListener("input", () => {
        this.clearRecommendationFieldError(weightInput);
        const val = parseFloat(weightInput.value);
        if (!isNaN(val)) {
          weightInput.dataset.valueKg =
            weightUnit === "kg" ? val : val * LBS_TO_KG;
        } else {
          delete weightInput.dataset.valueKg;
        }
      });

      weight_check.addEventListener("change", () => {
        let newUnit = weight_check.checked ? "lbs" : "kg";
        let currentVal = parseFloat(weightInput.value);

        // Update unit labels styling and visibility
        const weightToggleContainer = weightToggle.closest(
          '[data-unit-toggle="weight"]',
        );
        if (weightToggleContainer) {
          const leftLabel =
            weightToggleContainer.querySelector(".unit-label.left");
          const rightLabel =
            weightToggleContainer.querySelector(".unit-label.right");

          if (newUnit === "lbs") {
            leftLabel?.classList.remove("heading-color");
            rightLabel?.classList.add("heading-color");
            weightKgLabel?.classList.add("hidden");
            weightKgLabel?.classList.remove("flex");
            weightLbsLabel?.classList.remove("hidden");
            weightLbsLabel?.classList.add("flex");
          } else {
            leftLabel?.classList.add("heading-color");
            rightLabel?.classList.remove("heading-color");
            weightKgLabel?.classList.remove("hidden");
            weightKgLabel?.classList.add("flex");
            weightLbsLabel?.classList.add("hidden");
            weightLbsLabel?.classList.remove("flex");
          }
        }

        if (!isNaN(currentVal) && currentVal > 0) {
          if (newUnit === "lbs") {
            weightInput.value = (currentVal * KG_TO_LBS).toFixed(1);
            weightInput.dataset.valueKg = currentVal;
            weightInput.min = "66";
            weightInput.max = "661";
          } else {
            weightInput.value = (currentVal * LBS_TO_KG).toFixed(1);
            weightInput.dataset.valueKg = (currentVal * LBS_TO_KG).toFixed(1);
            weightInput.min = "30";
            weightInput.max = "300";
          }
        } else {
          weightInput.placeholder = newUnit === "lbs" ? "143" : "65";
          weightInput.min = newUnit === "lbs" ? "66" : "30";
          weightInput.max = newUnit === "lbs" ? "661" : "300";
        }
        this.clearRecommendationFieldError(weightInput);
        weightUnit = newUnit;
      });
    }

    this.bindRadioImageGroup({
      radioName: "body_shape",
      imageClass: "image_shape_preference",
      imagePrefix: "image_shape_preference--",
    });

    this.bindRadioImageGroup({
      radioName: "fit_preference",
      imageClass: "image_fit_preference",
      imagePrefix: "image_fit_preference--",
    });

    const resetBtn = tabContainer.querySelector("[data-reset-form]");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        const productId = tabContainer.dataset.productId;
        if (productId) {
          localStorage.removeItem(`size_recommendation_${productId}`);
          syncSizeRecommendationTriggerValue(productId, "");
        }

        tabContainer.querySelectorAll("input").forEach((input) => {
          if (input.type === "radio" || input.type === "checkbox") {
            input.checked = false;
          } else {
            input.value = "";
          }
        });
        tabContainer.querySelectorAll("select").forEach((select) => {
          select.selectedIndex = 0;
        });

        const heightInput = tabContainer.querySelector(
          '[data-unit-input="height"]',
        );
        if (heightInput) delete heightInput.dataset.valueCm;

        const weightInput = tabContainer.querySelector(
          '[data-unit-input="weight"]',
        );
        if (weightInput) delete weightInput.dataset.valueKg;

        // Reset weight unit labels to default (show kg, hide lbs)
        const weightLabels = tabContainer.querySelectorAll(".unit-weight-kg");
        const weightKgLabel = weightLabels?.[0];
        const weightLbsLabel = weightLabels?.[1];
        weightKgLabel?.classList.remove("hidden");
        weightKgLabel?.classList.add("flex");
        weightLbsLabel?.classList.add("hidden");
        weightLbsLabel?.classList.remove("flex");

        localStorage.removeItem(`size_recommendation_${productId}`);
        const result_details = tabContainer.querySelector(
          ".size-recommendation-details",
        );
        this.resetContentResult(result_details);
        this.refreshRecommendationRadioCards(tabContainer);
        this.refreshSizeRecommendationTrapFocus(tabContainer, tabContainer);
        switchToTab("basics", { focusPanel: true });
      });
    }

    const addToCartBtn = tabContainer.querySelector("[data-add-to-cart-size]");
    if (addToCartBtn) {
      addToCartBtn.addEventListener("click", () => {
        this.handleAddToCart(tabContainer);
      });
      addToCartBtn.addEventListener("keydown", (event) => {
        this.handleAddToCartKeydown(event, tabContainer);
      });
    }
  }

  renderContentResult(tabContainer, data, isAvailable = true) {
    if (!tabContainer || !data) return;
    if (tabContainer) {
      const resultHeight = tabContainer.querySelector(
        ".detail-height .detail-value",
      );
      if (resultHeight && data.heightDisplay) {
        // Display height in ft/in format if available, otherwise use heightDisplay
        if (data.heightUnit === "in" && (data.heightFt || data.heightIn)) {
          resultHeight.textContent = `${data.heightFt || 0} ft ${
            data.heightIn || 0
          } in`;
        } else {
          resultHeight.textContent = data.heightDisplay;
        }
      }
      const resultHeightUnit = tabContainer.querySelector(
        ".detail-height .detail-unit",
      );
      if (resultHeightUnit && data.heightUnit) {
        // Only show unit if not displaying ft/in format
        if (data.heightUnit === "in" && (data.heightFt || data.heightIn)) {
          resultHeightUnit.textContent = "";
        } else {
          resultHeightUnit.textContent = data.heightUnit === "cm" ? "cm" : "in";
        }
      }
      const resultWeight = tabContainer.querySelector(
        ".detail-weight .detail-value",
      );
      if (resultWeight && data.weightDisplay) {
        resultWeight.textContent = data.weightDisplay;
      }
      const resultWeightUnit = tabContainer.querySelector(
        ".detail-weight .detail-unit",
      );
      if (resultWeightUnit && data.weightUnit) {
        resultWeightUnit.textContent = data.weightUnit === "kg" ? "kg" : "lbs";
      }
      const resultGender = tabContainer.querySelector(
        ".detail-gender .detail-value",
      );
      if (resultGender && data.gender) {
        resultGender.textContent = data.gender;
      }
      const resultBodyShape = tabContainer.querySelector(
        ".detail-body-shape .detail-value",
      );
      if (resultBodyShape && data.bodyShape) {
        resultBodyShape.textContent = data.bodyShape;
      }
      const resultFitPreference = tabContainer.querySelector(
        ".detail-fit-preference .detail-value",
      );
      if (resultFitPreference && data.fitPreference) {
        resultFitPreference.textContent = data.fitPreference;
      }
      const resultBustSize = tabContainer.querySelector(
        ".detail-bust-size .detail-value",
      );
      if (resultBustSize && data.bustSize) {
        resultBustSize.textContent = data.bustSize;
      }
      const resultCupSize = tabContainer.querySelector(
        ".detail-cup-size .detail-value",
      );
      if (resultCupSize && data.cupSize) {
        resultCupSize.textContent = data.cupSize;
      }

      // Update stock status
      const resultTab = tabContainer.closest('[data-tab-content="result"]');
      if (resultTab) {
        const inStockStatus = resultTab.querySelector(
          ".recommended-size-in-stock-status",
        );
        const outStockStatus = resultTab.querySelector(
          ".recommended-size-out-stock-status",
        );

        if (inStockStatus && outStockStatus) {
          if (isAvailable) {
            inStockStatus.classList.remove("hidden");
            outStockStatus.classList.add("hidden");
          } else {
            inStockStatus.classList.add("hidden");
            outStockStatus.classList.remove("hidden");
          }
        }
      }
    }
  }

  resetContentResult(tabContainer) {
    if (!tabContainer) return;

    // Helper reset text
    const resetText = (selector) => {
      const el = tabContainer.querySelector(selector);
      if (el) el.textContent = "";
    };

    // Reset field
    resetText(".detail-height .detail-value");
    resetText(".detail-height .detail-unit");

    resetText(".detail-weight .detail-value");
    resetText(".detail-weight .detail-unit");

    resetText(".detail-gender .detail-value");
    resetText(".detail-body-shape .detail-value");
    resetText(".detail-fit-preference .detail-value");

    resetText(".detail-bust-size .detail-value");
    resetText(".detail-cup-size .detail-value");

    const sizeValue = tabContainer.querySelector(".recommended-size-value");
    if (sizeValue) sizeValue.textContent = "";
  }

  bindRadioImageGroup({ radioName, imageClass, imagePrefix }) {
    const radios = this.querySelectorAll(`input[name="${radioName}"]`);
    const images = this.querySelectorAll(`.${imageClass}`);

    if (!radios.length || !imageClass.length) return;

    //Update image state
    function updateImages(value) {
      images.forEach((img) => {
        img.classList.toggle(
          "is-active",
          img.classList.contains(`${imagePrefix}${value}`),
        );
      });
    }

    //Radio -> Image
    radios.forEach((radio) => {
      radio.addEventListener("change", () => {
        updateImages(radio.value);
      });
    });

    //Image -> Radio
    images.forEach((img) => {
      img.addEventListener("click", () => {
        const match = img.className.match(new RegExp(`${imagePrefix}(\\w+)`));
        if (!match) return;

        const value = match[1];
        const radio = this.querySelector(
          `input[name="${radioName}"][value="${value}"]`,
        );

        if (radio && !radio.disabled) {
          radio.checked = true;
          radio.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
    });

    //Init state
    const checked = this.querySelector(`input[name="${radioName}"]:checked`);
    if (checked) {
      updateImages(checked.value);
    }
  }

  calculateRecommendation(formData, sizeChartData, availableSizes) {
    let height = parseFloat(formData.height);
    let weight = parseFloat(formData.weight);

    if (!height || !weight || availableSizes.length === 0) return null;

    const bmi = weight / Math.pow(height / 100, 2);
    const gender = formData.gender;

    const isNumericSize = this.isNumericSizeSystem(availableSizes);

    let baseSizeIndex = 1;
    let foundExactMatch = false;

    if (Array.isArray(sizeChartData) && sizeChartData.length > 0) {
      const systemSizing =
        formData.systemSizing || sizeChartData[0]?.system_sizing;
      const matchingSystem =
        sizeChartData.find((entry) => entry.system_sizing === systemSizing) ||
        sizeChartData[0];

      if (
        matchingSystem &&
        gender === "female" &&
        formData.bustSize &&
        formData.cupSize
      ) {
        const sizeMappingKey =
          `size_${formData.bustSize}_${formData.cupSize}`.toLowerCase();

        if (matchingSystem[sizeMappingKey]) {
          const recommendedSize = matchingSystem[sizeMappingKey].toLowerCase();
          const sizeIndex = availableSizes.indexOf(recommendedSize);

          if (sizeIndex !== -1) {
            baseSizeIndex = sizeIndex;
            foundExactMatch = true;
          }
        }
      }
    }

    if (!foundExactMatch) {
      if (isNumericSize) {
        baseSizeIndex = this.calculateNumericSize(
          height,
          weight,
          bmi,
          gender,
          availableSizes,
        );
      } else {
        baseSizeIndex = this.calculateBMIBasedSize(bmi, gender);
      }
    }

    // Apply adjustments based on body shape, fit preference, and height
    const adjustments = isNumericSize
      ? this.sizeAdjustments.numericSize
      : this.sizeAdjustments.letterSize;

    // Body shape adjustments
    if (formData.bodyShape && adjustments.bodyShape[formData.bodyShape]) {
      baseSizeIndex += adjustments.bodyShape[formData.bodyShape];
    }

    // Fit preference adjustments
    if (
      formData.fitPreference &&
      adjustments.fitPreference[formData.fitPreference]
    ) {
      baseSizeIndex += adjustments.fitPreference[formData.fitPreference];
    }

    // Height adjustments
    if (gender && adjustments.height[gender]) {
      const heightConfig = adjustments.height[gender];

      if (isNumericSize) {
        if (height < heightConfig.short.threshold) {
          baseSizeIndex += heightConfig.short.adjustment;
        } else if (height > heightConfig.tall.threshold) {
          baseSizeIndex += heightConfig.tall.adjustment;
        }
      } else {
        if (heightConfig.short && height < heightConfig.short.threshold) {
          baseSizeIndex += heightConfig.short.adjustment;
        }
        if (heightConfig.tall && height > heightConfig.tall.threshold) {
          baseSizeIndex += heightConfig.tall.adjustment;
        }
      }
    }

    let finalIndex = Math.round(baseSizeIndex);

    if (finalIndex < 0) finalIndex = 0;
    if (finalIndex >= availableSizes.length)
      finalIndex = availableSizes.length - 1;

    return availableSizes[finalIndex];
  }

  isNumericSizeSystem(availableSizes) {
    if (availableSizes.length === 0) return false;
    const firstSize = availableSizes[0];
    return !isNaN(parseInt(firstSize)) && parseInt(firstSize) > 10;
  }

  calculateNumericSize(height, weight, bmi, gender, availableSizes) {
    const numericSizes = availableSizes
      .map((s) => parseInt(s))
      .filter((n) => !isNaN(n));
    if (numericSizes.length === 0) return 0;

    const minSize = Math.min(...numericSizes);
    const maxSize = Math.max(...numericSizes);

    let waistSize = 0;
    const config =
      this.sizeAdjustments.numericSizeBase[gender] ||
      this.sizeAdjustments.numericSizeBase.other;

    // Calculate base waist size using configurable values
    waistSize = config.baseSize + (bmi - 18.5) * config.bmiMultiplier;

    waistSize = Math.max(minSize, Math.min(maxSize, Math.round(waistSize)));

    const sizeIndex = availableSizes.indexOf(waistSize.toString());
    if (sizeIndex !== -1) return sizeIndex;

    let closestIndex = 0;
    let closestDiff = Math.abs(parseInt(availableSizes[0]) - waistSize);

    for (let i = 1; i < availableSizes.length; i++) {
      const diff = Math.abs(parseInt(availableSizes[i]) - waistSize);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = i;
      }
    }

    return closestIndex;
  }

  calculateBMIBasedSize(bmi, gender) {
    let sizeIndex = 1;
    const thresholds =
      this.sizeAdjustments.bmiThresholds[gender] ||
      this.sizeAdjustments.bmiThresholds.other;

    for (let i = 0; i < thresholds.length; i++) {
      if (bmi < thresholds[i]) {
        sizeIndex = i;
        break;
      }
      sizeIndex = i + 1;
    }

    return sizeIndex;
  }

  findVariantBySize(tabContainer, recommendedSize) {
    if (!recommendedSize) return Promise.resolve(null);

    const sizeDataElement = tabContainer.querySelector(
      ".size-recommendation-data",
    );
    const submitBtn = tabContainer.querySelector("[data-submit-size]");

    if (!sizeDataElement || !submitBtn) return Promise.resolve(null);

    const sizeData = JSON.parse(sizeDataElement.textContent);
    const productHandle = sizeData.product_handle;
    const variantIdSize = submitBtn.dataset.variantIdSize;

    if (!productHandle || !variantIdSize) return Promise.resolve(null);

    const selectedValues = variantIdSize.split(",").map((id) => id.trim());

    const mainProductSection = document.querySelector(
      ".product-detail__information",
    );
    const variantInput = mainProductSection?.querySelector("variant-input");
    const sectionId = variantInput?.getAttribute("data-section-id");

    if (!sectionId) return Promise.resolve(null);

    const productUrl = `/products/${productHandle}`;
    const queryParams = [`section_id=${sectionId}`];

    if (selectedValues.length > 0) {
      queryParams.push(`option_values=${selectedValues.join(",")}`);
    }

    const requestUrl = `${productUrl}?${queryParams.join("&")}`;

    return fetch(requestUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Size recommendation request failed: ${response.status}`,
          );
        }
        return response.text();
      })
      .then((responseText) => {
        const parsedHTML = new DOMParser().parseFromString(
          responseText,
          "text/html",
        );

        const variantScript = parsedHTML.querySelector(
          ".productVariantSelected",
        );
        if (!variantScript) return null;

        try {
          const variant = JSON.parse(variantScript.textContent);
          return variant;
        } catch (e) {
          console.error("Size recommendation variant parse failed:", e);
          return null;
        }
      })
      .catch((error) => {
        console.error("Size recommendation variant lookup failed:", error);
        throw error;
      });
  }

  refreshSizeRecommendationTrapFocus(tabContainer, fallbackElement = null) {
    const modalFocus = tabContainer.closest(".modal-focus");
    if (!modalFocus || typeof NextSkyTheme?.trapFocus !== "function") {
      return;
    }

    const fallback =
      fallbackElement && modalFocus.contains(fallbackElement)
        ? fallbackElement
        : modalFocus;

    NextSkyTheme.trapFocus(modalFocus, fallback);
  }

  updateAddToCartButton(tabContainer, recommendedSize) {
    const addToCartBtn = tabContainer.querySelector("[data-add-to-cart-size]");
    const btnLabel = tabContainer.querySelector(".btn-label-size");
    if (!addToCartBtn) return;

    addToCartBtn.setAttribute("disabled", "disabled");
    addToCartBtn.setAttribute("aria-disabled", "true");
    addToCartBtn.setAttribute("tabindex", "-1");
    addToCartBtn.classList.add("loading");

    this.findVariantBySize(tabContainer, recommendedSize)
      .then((variant) => {
      const priceElement = `
        <span class="dot-total mx-sp-1"> - </span>
        <span class="total-price__size">${NextSkyTheme.formatMoney(
          variant ? variant.price : 0,
          cartStrings.money_format,
        )}</span>
      `;
      if (!variant) {
        addToCartBtn.setAttribute("disabled", "disabled");
        addToCartBtn.setAttribute("aria-disabled", "true");
        addToCartBtn.classList.add("disabled");
        addToCartBtn.classList.remove("loading");
        addToCartBtn.setAttribute("tabindex", "-1");
        delete addToCartBtn.dataset.variantId;
        if (btnLabel)
          btnLabel.innerHTML = `${window.cartStrings?.not_available}${priceElement}`;
        this.refreshSizeRecommendationTrapFocus(
          tabContainer,
          document.activeElement,
        );
        return;
      }

      if (!variant.available) {
        addToCartBtn.setAttribute("disabled", "disabled");
        addToCartBtn.setAttribute("aria-disabled", "true");
        addToCartBtn.classList.add("disabled");
        addToCartBtn.classList.remove("loading");
        addToCartBtn.setAttribute("tabindex", "-1");
        delete addToCartBtn.dataset.variantId;
        if (btnLabel)
          btnLabel.innerHTML = `${window.cartStrings?.sold_out}${priceElement}`;
      } else {
        addToCartBtn.removeAttribute("disabled");
        addToCartBtn.setAttribute("aria-disabled", "false");
        addToCartBtn.classList.remove("disabled");
        addToCartBtn.classList.remove("loading");
        addToCartBtn.setAttribute("tabindex", "0");
        addToCartBtn.dataset.variantId = variant.id;
        if (btnLabel)
          btnLabel.innerHTML = `${window.cartStrings?.add_to_cart}${priceElement}`;
      }

      this.refreshSizeRecommendationTrapFocus(
        tabContainer,
        document.activeElement,
      );
    })
      .catch((error) => {
        console.error(error);
        addToCartBtn.setAttribute("disabled", "disabled");
        addToCartBtn.setAttribute("aria-disabled", "true");
        addToCartBtn.classList.add("disabled");
        addToCartBtn.classList.remove("loading");
        addToCartBtn.setAttribute("tabindex", "-1");
        delete addToCartBtn.dataset.variantId;
        if (btnLabel) {
          btnLabel.innerHTML = `${window.cartStrings?.not_available || ""}`;
        }
        if (notifier) {
          notifier.show(
            window.cartStrings?.error ||
              "There was an error while updating your cart. Please try again.",
            "error",
            4000,
          );
        }
        this.refreshSizeRecommendationTrapFocus(
          tabContainer,
          document.activeElement,
        );
      });
  }

  refreshRecommendationRadioCards(tabContainer) {
    const cardGroupsByName = new Map();

    tabContainer.querySelectorAll("[data-size-radio-card]").forEach((card) => {
      const input = card.querySelector('input[type="radio"][name]');
      if (!input) return;

      if (!cardGroupsByName.has(input.name)) {
        cardGroupsByName.set(input.name, []);
      }

      cardGroupsByName.get(input.name).push({ card, input });
    });

    cardGroupsByName.forEach((groupCards) => {
      this.syncRecommendationRadioCards(groupCards);
    });
  }

  bindRecommendationRadioCards(tabContainer) {
    const radioCards = Array.from(
      tabContainer.querySelectorAll("[data-size-radio-card]"),
    );
    if (!radioCards.length) return;

    const cardGroupsByName = new Map();

    radioCards.forEach((card) => {
      const input = card.querySelector('input[type="radio"][name]');
      if (!input) return;

      if (!cardGroupsByName.has(input.name)) {
        cardGroupsByName.set(input.name, []);
      }

      const groupCards = cardGroupsByName.get(input.name);
      groupCards.push({ card, input });

      input.setAttribute("tabindex", "-1");

      card.addEventListener("click", () => {
        this.selectRecommendationRadioCard(input, groupCards, {
          focusCard: true,
        });
      });

      card.addEventListener("keydown", (event) => {
        this.handleRecommendationRadioCardKeydown(event, input, groupCards);
      });

      input.addEventListener("change", () => {
        this.syncRecommendationRadioCards(groupCards);
      });
    });

    cardGroupsByName.forEach((groupCards) => {
      this.syncRecommendationRadioCards(groupCards);
    });
  }

  syncRecommendationRadioCards(groupCards) {
    groupCards.forEach(({ card, input }) => {
      card.setAttribute("aria-checked", input.checked ? "true" : "false");
      card.setAttribute("aria-disabled", input.disabled ? "true" : "false");
      card.setAttribute("tabindex", input.disabled ? "-1" : "0");
    });
  }

  selectRecommendationRadioCard(input, groupCards, options = {}) {
    const { focusCard = false } = options;
    if (!input || input.disabled) return;

    if (!input.checked) {
      input.checked = true;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      this.syncRecommendationRadioCards(groupCards);
    }

    if (focusCard) {
      input.closest("[data-size-radio-card]")?.focus();
    }
  }

  handleRecommendationRadioCardKeydown(event, input, groupCards) {
    const currentCard = input.closest("[data-size-radio-card]");
    if (!currentCard) return;

    const availableGroupCards = groupCards.filter(
      ({ card, input: groupInput }) =>
        !groupInput.disabled &&
        !groupInput.closest("[hidden]") &&
        card.getClientRects().length > 0,
    );

    const currentIndex = availableGroupCards.findIndex(
      ({ card }) => card === currentCard,
    );
    if (currentIndex === -1) return;

    const activateAt = (index) => {
      const normalizedIndex =
        ((index % availableGroupCards.length) + availableGroupCards.length) %
        availableGroupCards.length;
      const nextItem = availableGroupCards[normalizedIndex];
      this.selectRecommendationRadioCard(nextItem.input, groupCards, {
        focusCard: true,
      });
    };

    switch (event.key) {
      case "Enter":
      case " ":
        event.preventDefault();
        this.selectRecommendationRadioCard(input, groupCards, {
          focusCard: true,
        });
        break;
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        activateAt(currentIndex + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        activateAt(currentIndex - 1);
        break;
    }
  }

  clearRecommendationFieldError(field) {
    if (!field) return;
    field.setCustomValidity("");
    field.classList.remove("error-input");
    field.setAttribute("aria-invalid", "false");
  }

  setRecommendationFieldInvalid(field) {
    if (!field) return;
    field.classList.add("error-input");
    field.setAttribute("aria-invalid", "true");
  }

  syncHeightInputMode(heightInput, heightFtInput, heightInInput, unit) {
    const useImperialInput = unit === "in";

    if (heightInput) {
      heightInput.disabled = useImperialInput;
      heightInput.required = !useImperialInput;
      if (useImperialInput) {
        this.clearRecommendationFieldError(heightInput);
      }
    }

    if (heightFtInput) {
      heightFtInput.disabled = !useImperialInput;
      heightFtInput.required = useImperialInput;
      if (!useImperialInput) {
        this.clearRecommendationFieldError(heightFtInput);
      }
    }

    if (heightInInput) {
      heightInInput.disabled = !useImperialInput;
      heightInInput.required = useImperialInput;
      if (!useImperialInput) {
        this.clearRecommendationFieldError(heightInInput);
      }
    }
  }

  validateBasicsFields(tabContainer, options = {}) {
    const { report = true, focusFirstInvalid = true } = options;

    const heightInput = tabContainer.querySelector(
      '[data-unit-input="height"]',
    );
    const heightFtInput = tabContainer.querySelector(
      '[data-unit-input="height-ft"]',
    );
    const heightInInput = tabContainer.querySelector(
      '[data-unit-input="height-in"]',
    );
    const weightInput = tabContainer.querySelector(
      '[data-unit-input="weight"]',
    );
    const heightToggleInput = tabContainer.querySelector(
      '[data-unit-toggle="height"] #unit-toggle-height',
    );

    const isHeightImperial = Boolean(heightToggleInput?.checked);
    this.syncHeightInputMode(
      heightInput,
      heightFtInput,
      heightInInput,
      isHeightImperial ? "in" : "cm",
    );

    const invalidFields = [];
    const validateField = (field) => {
      if (!field || field.disabled) return true;
      this.clearRecommendationFieldError(field);

      if (field.checkValidity()) {
        return true;
      }

      this.setRecommendationFieldInvalid(field);
      invalidFields.push(field);
      return false;
    };

    if (isHeightImperial) {
      const hasValidFeet = validateField(heightFtInput);
      const hasValidInches = validateField(heightInInput);

      if (hasValidFeet && hasValidInches && heightInput) {
        const ft = parseFloat(heightFtInput.value) || 0;
        const inches = parseFloat(heightInInput.value) || 0;
        const cm = Math.round(
          (ft * 12 + inches) * SizeRecommendationForm.CONSTANTS.IN_TO_CM,
        );
        heightInput.dataset.valueCm = cm;
      } else if (heightInput) {
        delete heightInput.dataset.valueCm;
      }
    } else {
      if (validateField(heightInput) && heightInput) {
        const cm = parseFloat(heightInput.value);
        if (!isNaN(cm)) {
          heightInput.dataset.valueCm = cm;
        }
      } else if (heightInput) {
        delete heightInput.dataset.valueCm;
      }
    }

    if (validateField(weightInput) && weightInput) {
      const weightValue = parseFloat(weightInput.value);
      if (!isNaN(weightValue)) {
        const weightToggleInput = tabContainer.querySelector(
          '[data-unit-toggle="weight"] #unit-toggle-weight',
        );
        const weightUnit = weightToggleInput?.checked ? "lbs" : "kg";
        weightInput.dataset.valueKg =
          weightUnit === "kg"
            ? weightValue
            : weightValue * SizeRecommendationForm.CONSTANTS.LBS_TO_KG;
      }
    } else if (weightInput) {
      delete weightInput.dataset.valueKg;
    }

    if (!invalidFields.length) {
      return true;
    }

    const firstInvalidField = invalidFields[0];
    if (focusFirstInvalid) {
      firstInvalidField.focus();
    }

    if (report) {
      firstInvalidField.reportValidity();
    }

    return false;
  }

  handleRecommendationRadioKeydown(event, radioGroup) {
    const currentRadio = event.currentTarget;
    const visibleRadios = radioGroup.filter(
      (radio) =>
        !radio.disabled &&
        !radio.closest("[hidden]") &&
        radio.getClientRects().length > 0,
    );
    const currentIndex = visibleRadios.indexOf(currentRadio);

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
      case "ArrowRight":
      case "ArrowDown": {
        event.preventDefault();
        const nextIndex = (currentIndex + 1) % visibleRadios.length;
        selectRadio(visibleRadios[nextIndex]);
        break;
      }
      case "ArrowLeft":
      case "ArrowUp": {
        event.preventDefault();
        const previousIndex =
          (currentIndex - 1 + visibleRadios.length) % visibleRadios.length;
        selectRadio(visibleRadios[previousIndex]);
        break;
      }
    }
  }

  handleAddToCartKeydown(event, tabContainer) {
    if (event.key !== "Enter" && event.key !== " " && event.key !== "Spacebar")
      return;
    event.preventDefault();
    this.handleAddToCart(tabContainer);
  }

  handleAddToCart(tabContainer) {
    const addToCartBtn = tabContainer.querySelector("[data-add-to-cart-size]");
    const isDisabled =
      !addToCartBtn ||
      addToCartBtn.hasAttribute("disabled") ||
      addToCartBtn.getAttribute("aria-disabled") === "true";
    if (isDisabled) return;

    const variantId = addToCartBtn.dataset.variantId;
    if (!variantId) return;

    addToCartBtn.setAttribute("disabled", "disabled");
    addToCartBtn.setAttribute("aria-disabled", "true");
    addToCartBtn.setAttribute("tabindex", "-1");
    addToCartBtn.classList.add("loading");

    const formData = new FormData();
    formData.append("id", variantId);
    formData.append("quantity", 1);

    const cart =
      document.querySelector("cart-drawer") ||
      document.querySelector("main-cart");
    if (cart) {
      formData.append(
        "sections",
        cart.getSectionsToRender().map((section) => section.id),
      );
      formData.append("sections_url", window.location.pathname);
    }

    const config = NextSkyTheme.fetchConfig("javascript");
    config.headers["X-Requested-With"] = "XMLHttpRequest";
    delete config.headers["Content-Type"];
    config.body = formData;

    fetch(`${routes.cart_add_url}`, config)
      .then((response) => response.json())
      .then((response) => {
        if (response.status) {
          if (notifier) {
            notifier.show(response.description, "error", 4000);
          }
          return;
        }

        NextSkyTheme.publish(NextSkyTheme.PUB_SUB_EVENTS.cartUpdate, {
          source: "size-recommendation",
          productVariantId: variantId,
          cartData: response,
        });

        if (cart) {
          cart.renderContents(response);

          const actionMobile =
            themeGlobalVariables?.settings?.actionAddCartMobile;
          let showCartDrawer = true;

          if (window.innerWidth <= 767 && actionMobile === "cart_message") {
            const getCookieCartMessage = NextSkyTheme.getCookie("cart_message");
            if (getCookieCartMessage) {
              showCartDrawer = false;
              if (notifier) {
                notifier.showElement(
                  window.cartStrings?.addSuccessMobile,
                  null,
                  "success",
                  2500,
                );
              }
            } else {
              NextSkyTheme.setCookie("cart_message", "true", 1);
            }
          }

          if (showCartDrawer) {
            eventModal(cart, "open", false, "delay");
          }

          const popup = tabContainer.closest("size-recommendation-popup");
          if (popup) {
            eventModal(popup, "close", false);
          }
        }
      })
      .catch((error) => {
        console.error(error);
        if (notifier) {
          notifier.show(
            window.cartStrings?.error ||
              "There was an error while updating your cart. Please try again.",
            "error",
            4000,
          );
        }
      })
      .finally(() => {
        new NextSkyTheme.FSProgressBar("free-ship-progress-bar");
        addToCartBtn.classList.remove("loading");
        if (addToCartBtn.dataset.variantId) {
          addToCartBtn.removeAttribute("disabled");
          addToCartBtn.setAttribute("aria-disabled", "false");
          addToCartBtn.setAttribute("tabindex", "0");
          addToCartBtn.classList.remove("disabled");
        }

        this.refreshSizeRecommendationTrapFocus(
          tabContainer,
          document.activeElement,
        );
      });
  }
}

if (!customElements.get("size-recommendation-form")) {
  customElements.define("size-recommendation-form", SizeRecommendationForm);
}
