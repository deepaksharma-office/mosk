import * as NextSkyTheme from "@NextSkyTheme/global";
import { eventModal } from "@NextSkyTheme/modal";
import { notifier, notifierInline } from "@NextSkyTheme/notification";
import { LazyLoader } from "@NextSkyTheme/lazy-load";

if (!customElements.get("outfit-finder")) {
  customElements.define(
    "outfit-finder",
    class OutfitFinder extends HTMLElement {
      constructor() {
        super();
        this.sectionId = this.getAttribute("data-section-id");
        this.btn = this.querySelector(".outfit-drawer-mobile__button button");
        this.btnClearAll = this.querySelector(".product_clear_button");
        this.outfitPreview = this.querySelectorAll("outfit-preview");
        this.btnCollections = this.querySelectorAll("button.load-collection");
        this.initOverlayObserver();
        this.restoreAllOutfitPreviews();
        this.restoreProductFormState();
      }

      connectedCallback() {
        this.btn?.addEventListener("click", () => this.toggle());
        this.btn?.addEventListener("keypress", (e) => {
          if (e.key === "Enter") this.toggle();
        });
        this.btnClearAll?.addEventListener("click", () => this.clearAll());
        this.btnClearAll?.addEventListener("keypress", (e) => {
          if (e.key === "Enter") this.clearAll();
        });
        this.outfitPreview.forEach((preview) => {
          const container = preview.closest(
            ".outfit-finder-selections-preview",
          );
          const finder = preview.closest("outfit-finder");
          if (!container || !finder) return;
          const hasX = preview.style.getPropertyValue("--translate-x");
          const hasY = preview.style.getPropertyValue("--translate-y");
          if (hasX || hasY) return;
          if (!preview.style.getPropertyValue("--rendering-scale")) {
            preview.style.setProperty("--rendering-scale", "1");
          }
          preview.style.setProperty("--z-index", "1");
          setTimeout(() => {
            preview.classList.contains("not-rendered") &&
              preview.classList.remove("not-rendered");
          }, 300);

          requestAnimationFrame(() => {
            this.sortOutfitPreviewsVertical(container, 20);
          });
        });
        this.btnCollections.forEach((btn) => {
          btn?.addEventListener("click", () => this.loadCollection(btn));
          btn?.addEventListener("keypress", (e) => {
            if (e.key === "Enter") this.loadCollection(btn);
          });
        });
        this.initCollectionInfiniteScroll();
        this.initCollectionInfiniteScrollMobile();
        requestAnimationFrame(() => this.setMobileDimensions());
        this._onResize = () =>
          requestAnimationFrame(() => this.setMobileDimensions());
        window.addEventListener("resize", this._onResize);
      }

      initOverlayObserver() {
        this.overlayObserver = new IntersectionObserver(
          (entries) => {
            const overlay = this.querySelector(".bg-linear-outfit");
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                overlay?.classList.add("opacity-0");
              } else {
                overlay?.classList.remove("opacity-0");
              }
            });
          },
          {
            root: this.querySelector(".outfit-finder-list-mobile"),
            threshold: 0.1,
          },
        );
      }

      refreshOverlayObserve() {
        const anchor = this.querySelector(".end-anchor");
        if (anchor) {
          this.overlayObserver.disconnect();
          this.overlayObserver.observe(anchor);
        }
      }

      clearAll() {
        const items = this.querySelectorAll("outfit-preview");
        items.forEach((preview) => {
          preview.querySelector("button.remove").click();
        });
      }

      toggle() {
        const d = this.querySelector(".outfit-drawer-mobile");
        const overlay = this.querySelector(".bg-linear-outfit");
        const outfit_finder_mobile = this.querySelector(
          ".outfit-finder-mobile",
        );

        if (!d || !outfit_finder_mobile) return;

        const isNowOpen = d.classList.toggle("open");

        if (isNowOpen) {
          outfit_finder_mobile.style.display = "block";
          const endHeight = outfit_finder_mobile.scrollHeight;

          outfit_finder_mobile.animate(
            [
              { height: "0px", opacity: 0 },
              { height: endHeight + "px", opacity: 1 },
            ],
            { duration: 300, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
          ).onfinish = () => {
            outfit_finder_mobile.style.height = "auto";
            this.refreshOverlayObserve();
          };
        } else {
          const startHeight = outfit_finder_mobile.offsetHeight;
          if (this.overlayObserver) {
            this.overlayObserver.disconnect();
          }
          overlay?.classList.add("opacity-0");
          outfit_finder_mobile.animate(
            [
              { height: startHeight + "px", opacity: 1 },
              { height: "0px", opacity: 0 },
            ],
            { duration: 300, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
          ).onfinish = () => {
            outfit_finder_mobile.style.display = "none";
            outfit_finder_mobile.style.height = "0px";
          };
        }
      }

      initInfiniteScroll(list) {
        if (!list) return;

        const sentinel = list.querySelector(".load-more-sentinel");
        if (!sentinel) return;

        list._observer?.disconnect();
        list._loading = false;
        list._scrolled = false;
        if (!list._onScroll) {
          list._onScroll = () => {
            list._scrolled = true;
          };
        }

        list.removeEventListener("scroll", list._onScroll);
        list.addEventListener("scroll", list._onScroll, { passive: true });

        const observer = new IntersectionObserver(
          ([e]) => {
            if (
              e.isIntersecting &&
              e.intersectionRatio === 1 &&
              list._scrolled &&
              !list._loading
            ) {
              this.loadMore(list);
            }
          },
          { root: list, threshold: 1 },
        );

        list._observer = observer;
        list._sentinel = sentinel;

        requestAnimationFrame(() => observer.observe(sentinel));
      }

      initCollectionInfiniteScroll() {
        this.initInfiniteScroll(this.querySelector(".outfit-finder-list"));
      }

      initCollectionInfiniteScrollMobile() {
        this.initInfiniteScroll(
          this.querySelector(".outfit-finder-list-mobile"),
        );
      }

      async loadMore(list) {
        if (list._loading) return;

        const s = list._sentinel;
        if (!s?.dataset.url) return;

        list._loading = true;

        try {
          const res = await fetch(
            `${s.dataset.url}&section_id=${this.sectionId}`,
          );
          const html = await res.text();
          const doc = new DOMParser().parseFromString(html, "text/html");

          const src = doc.querySelector(
            list.classList.contains("outfit-finder-list-mobile")
              ? ".outfit-finder-list-mobile"
              : ".outfit-finder-list",
          );

          const items = src?.querySelectorAll(".product__item-js") || [];
          if (!items.length) {
            list._observer.disconnect();
            s.remove();
            return;
          }

          items.forEach((i) => s.before(i));

          const next = src.querySelector(".load-more-sentinel");
          next
            ? (s.dataset.url = next.dataset.url)
            : (list._observer.disconnect(), s.remove());

          list._observer.unobserve(s);
          requestAnimationFrame(() => list._observer.observe(s));
        } finally {
          list._loading = false;
          list.querySelector("motion-items-effect")?.animateItems();
          new LazyLoader(".image-lazy-load");
        }
      }

      async loadCollection(btn) {
        const url = btn.dataset.url;
        const li = btn.closest("li");
        if (!url || !li || li.classList.contains("active")) return;

        this.querySelectorAll("li.active").forEach((el) =>
          el.classList.remove("active"),
        );
        this.querySelectorAll(
          `button.load-collection[data-url="${url}"]`,
        ).forEach((b) => b.closest("li")?.classList.add("active"));

        const res = await fetch(`${url}?section_id=${this.sectionId}`);
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");

        const list = this.querySelector(".outfit-finder-list");
        const listMb = this.querySelector(".outfit-finder-list-mobile");

        list &&
          (list.innerHTML =
            doc.querySelector(".outfit-finder-list")?.innerHTML || "");
        listMb &&
          (listMb.innerHTML =
            doc.querySelector(".outfit-finder-list-mobile")?.innerHTML || "");

        new LazyLoader(".image-lazy-load");

        requestAnimationFrame(() => {
          this.initInfiniteScroll(list);
          this.initInfiniteScroll(listMb);
          this.refreshOverlayObserve();
        });
      }

      sortOutfitPreviewsVertical(box, gap = 20) {
        const els = [...box.querySelectorAll("outfit-preview")];
        const n = els.length;
        if (!n) return;

        const r = box.getBoundingClientRect();
        const cx = r.width / 2;
        const cy = r.height / 2;

        const items = els.map((el) => {
          const b = el.getBoundingClientRect();
          return { el, w: b.width, h: b.height };
        });

        if (n === 1) {
          const i = items[0];
          i.el.style.setProperty("--translate-x", `${cx - i.w / 2}px`);
          i.el.style.setProperty("--translate-y", `${cy - i.h / 2}px`);
          return;
        }

        if (n === 2) {
          let y = cy - (items[0].h + items[1].h + gap) / 2;
          if (y < 0) y = 0;

          items.forEach((i) => {
            i.el.style.setProperty("--translate-x", `${cx - i.w / 2}px`);
            i.el.style.setProperty("--translate-y", `${y}px`);
            y += i.h + gap;
          });
          return;
        }

        if (n === 3) {
          const [a, b, c] = items;
          const yb = cy - b.h / 2;

          b.el.style.setProperty("--translate-x", `${cx - b.w / 2}px`);
          b.el.style.setProperty("--translate-y", `${yb}px`);

          a.el.style.setProperty("--translate-x", `${cx - a.w / 2}px`);
          a.el.style.setProperty(
            "--translate-y",
            `${Math.max(0, yb - gap - a.h)}px`,
          );

          c.el.style.setProperty("--translate-x", `${cx - c.w / 2}px`);
          c.el.style.setProperty("--translate-y", `${yb + b.h + gap}px`);
          return;
        }

        const used = [];

        items.forEach((i) => {
          let ok = false;
          let t = 0;

          while (!ok && t < 50) {
            const x = Math.random() * (r.width - i.w);
            const y = Math.random() * (r.height - i.h);
            const rect = { l: x, t: y, r: x + i.w, b: y + i.h };

            if (
              !used.some(
                (p) =>
                  !(
                    rect.r <= p.l ||
                    rect.l >= p.r ||
                    rect.b <= p.t ||
                    rect.t >= p.b
                  ),
              )
            ) {
              i.el.style.setProperty("--translate-x", `${x}px`);
              i.el.style.setProperty("--translate-y", `${y}px`);
              used.push(rect);
              ok = true;
            }
            t++;
          }

          if (!ok) {
            i.el.style.setProperty("--translate-x", `${cx - i.w / 2}px`);
            i.el.style.setProperty("--translate-y", `${cy - i.h / 2}px`);
          }
        });
      }

      setMobileDimensions() {
        const section_header = this.previousElementSibling;
        if (section_header) {
          const h = section_header.offsetHeight;
          this.style.setProperty("--section-header-height", `${h}px`);
          this.style.removeProperty("--header-spacing-bottom");
        } else {
          this.style.setProperty("--header-spacing-bottom", "0px");
        }

        if (window.innerWidth > 1025) return;

        const summary = this.querySelector(".summary.btn-sumary");
        const collection = this.querySelector(
          ".outfit-finder-collection-mobile",
        );
        if (summary) {
          const h = summary.offsetHeight;
          this.style.setProperty("--summary-height", `${h}px`);
        }

        if (collection) {
          const h = collection.offsetHeight;
          this.style.setProperty("--collection-height", `${h}px`);
        }
      }

      saveAllOutfitPreviews() {
        const container = this.querySelector(
          ".outfit-finder-selections-preview",
        );
        let index = 1;
        const previews = [...container.querySelectorAll("outfit-preview")];

        const data = previews.map((preview) => {
          const style = getComputedStyle(preview);

          return {
            id: preview.dataset.id,
            html: preview.querySelector(".preview-image")?.innerHTML || "",
            x: parseFloat(style.getPropertyValue("--translate-x")) || 0,
            y: parseFloat(style.getPropertyValue("--translate-y")) || 0,
            scale: parseFloat(style.getPropertyValue("--rendering-scale")) || 1,
            z: index++,
          };
        });

        localStorage.setItem("outfit_previews", JSON.stringify(data));
      }

      saveProductFormState() {
        const productForm = this.querySelector("product-form form");
        if (!productForm) return;

        const items = [];
        let totalPrice = 0;

        productForm.querySelectorAll(".variant-select").forEach((select) => {
          const productId = select.getAttribute("product-id");
          const idInput = select.querySelector('input[name="items[][id]"]');
          const qtyInput = select.querySelector(
            'input[name="items[][quantity]"]',
          );

          if (!idInput || !qtyInput) return;

          const variantId = idInput.value;
          const quantity = Number(qtyInput.value) || 1;
          const price = Number(qtyInput.dataset.price) || 0;

          totalPrice += price * quantity;

          items.push({
            productId,
            variantId,
            quantity,
            price,
          });
        });

        localStorage.setItem(
          "outfit_product_form",
          JSON.stringify({
            items,
            totalPrice,
          }),
        );
      }

      restoreProductFormState() {
        const data = JSON.parse(localStorage.getItem("outfit_product_form"));
        if (!data || !Array.isArray(data.items) || !data.items.length) return;

        const productForm = this.querySelector("product-form form");
        const list = productForm.querySelector(".outfit-finder-list");

        list.innerHTML = "";

        data.items.forEach((item) => {
          const wrapper = document.createElement("div");
          wrapper.className = "variant-select";
          wrapper.setAttribute("product-id", item.productId);

          const inputId = document.createElement("input");
          inputId.type = "hidden";
          inputId.name = "items[][id]";
          inputId.value = item.variantId;

          const inputQty = document.createElement("input");
          inputQty.type = "hidden";
          inputQty.name = "items[][quantity]";
          inputQty.className = "quantity";
          inputQty.value = item.quantity;
          inputQty.dataset.price = item.price;

          wrapper.appendChild(inputId);
          wrapper.appendChild(inputQty);

          list.appendChild(wrapper);
        });

        const totalEl = productForm
          .closest(".summary")
          .querySelector(".total-price");

        if (totalEl) {
          totalEl.textContent = NextSkyTheme.formatMoney(
            data.totalPrice,
            cartStrings.money_format,
          );
        }

        const submitBtn = productForm.querySelector(
          "button.product-form__submit",
        );
        if (submitBtn && data.items.length) {
          submitBtn.removeAttribute("disabled");
        }

        const clearButton = productForm.querySelector(
          "button.product_clear_button",
        );
        if (clearButton && data.items.length) {
          clearButton.classList.remove("hidden");
        }

        if (list.closest("outfit-finder").querySelector(".notify-preview")) {
          list
            .closest("outfit-finder")
            .querySelector(".notify-preview")
            .remove();
        }
      }

      restoreAllOutfitPreviews() {
        const container = this.querySelector(
          ".outfit-finder-selections-preview",
        );
        if (!container) return;

        const template = container.querySelector("template.preview");
        if (!template) return;

        const stored =
          JSON.parse(localStorage.getItem("outfit_previews")) || [];
        if (!Array.isArray(stored) || !stored.length) return;
        container
          .querySelectorAll("outfit-preview")
          .forEach((el) => el.remove());
        stored.forEach((item) => {
          const clone = template.content.cloneNode(true);
          const preview = clone.querySelector("outfit-preview");

          preview.dataset.id = item.id;

          preview.querySelector(".preview-image").innerHTML = item.html;

          preview.style.setProperty("--translate-x", `${item.x}px`);
          preview.style.setProperty("--translate-y", `${item.y}px`);
          preview.style.setProperty("--rendering-scale", item.scale);
          preview.style.setProperty("--z-index", item.z);

          container.appendChild(preview);
        });
      }

      disconnectedCallback() {
        window.removeEventListener("resize", this._onResize);
      }
    },
  );
}

if (!customElements.get("outfit-add")) {
  customElements.define(
    "outfit-add",
    class OutfitAdd extends HTMLElement {
      constructor() {
        super();
        this.btn = this.querySelector(".btn__quick-outfit-add");
        this.pid = this.getAttribute("data-product-id");
      }

      connectedCallback() {
        setTimeout(() => {
          this.sync();
        }, 100);
        this.btn?.addEventListener("click", () => this.open());
        this.btn?.addEventListener("keypress", (e) => {
          if (e.key === "Enter") this.open();
        });
      }

      sync() {
        const f = this.closest("outfit-finder")?.querySelector("product-form");
        if (!f) return;

        f.querySelectorAll(".variant-select").forEach((s) => {
          if (this.pid == s.getAttribute("product-id")) {
            this.classList.add("active");
          }
        });
      }

      open() {
        const t = this.querySelector("template.quick-outfit-popup");
        if (!t) return;

        const w = document.createElement("div");
        w.appendChild(t.content.firstElementChild.cloneNode(true));

        NextSkyTheme.getBody().appendChild(
          w.querySelector("quick-outfit-popup"),
        );

        setTimeout(
          () =>
            eventModal(
              document.querySelector("quick-outfit-popup"),
              "open",
              true,
            ),
          100,
        );
        NextSkyTheme.global.rootToFocus = this.btn;
      }
    },
  );
}

if (!customElements.get("variant-outfit-add")) {
  customElements.define(
    "variant-outfit-add",
    class VariantOutfitAdd extends HTMLElement {
      constructor() {
        super();
        this.buttonAdd = this.querySelector(".button__add");
      }

      connectedCallback() {
        this.productUrl = this.getAttribute("data-product-url");
        if (this.buttonAdd) {
          this.buttonAdd.addEventListener(
            "click",
            this.initSelect.bind(this),
            false,
          );
          this.buttonAdd.addEventListener(
            "keypress",
            function (event) {
              if (event.key === "Enter") {
                this.initSelect.bind(this)(event);
              }
            }.bind(this),
            false,
          );
        }
        this.querySelectorAll(
          '.product-card-variant-js [type="radio"]',
        ).forEach((input) => {
          input.addEventListener(
            "change",
            this.onVariantChangeQuickAdd.bind(this),
          );
        });
      }

      async onVariantChangeQuickAdd(event) {
        event.preventDefault();
        let currentTarget = event.currentTarget;
        const optionValue = currentTarget.getAttribute("data-option-value");
        const option_value = currentTarget
          .closest("fieldset")
          .querySelector(".option_value");
        option_value.classList.remove("warning-inline");
        option_value.innerHTML = optionValue;
        const _this = this;
        const selectedValues = Array.from(
          this.querySelectorAll('input[type="radio"]:checked'),
        ).map((radio) => radio.value);
        const requestUrl = this.createRequestUrl(
          this.productUrl,
          selectedValues,
        );
        const optionCountSize = this.getAttribute("data-options-size");
        const productId = this.getAttribute("data-product-id");
        let outfitPopup = false;
        if (currentTarget.closest("quick-outfit-popup")) {
          currentTarget = NextSkyTheme.global.rootToFocus;
          outfitPopup = true;
        }
        const maxSelect = currentTarget
          .closest("outfit-finder")
          .getAttribute("data-max-items");
        fetch(requestUrl)
          .then((response) => response.text())
          .then(async (responseText) => {
            let html = new DOMParser().parseFromString(
              responseText,
              "text/html",
            );
            if (optionCountSize == selectedValues.length) {
              const jsonScript = html.querySelector(
                '[class^="productVariantSelected"]',
              );
              const productData = JSON.parse(jsonScript.textContent);
              const productVariantId = productData.id;
              const available = productData.available;
              const price = productData.price;
              currentTarget.closest("variant-outfit-add");
              if (available) {
                const els = [
                  ...currentTarget
                    .closest("outfit-finder")
                    .querySelectorAll("outfit-preview"),
                ];
                const n = els.length;
                if (n >= maxSelect) {
                  notifier.show(
                    window.message.product.maximum_outfit,
                    "error",
                    4000,
                  );
                  return;
                }
                const wrapper = document.createElement("div");
                wrapper.className = "variant-select";
                wrapper.setAttribute("product-id", productId);
                const inputId = document.createElement("input");
                inputId.type = "hidden";
                inputId.name = "items[][id]";
                inputId.dataset.index = "1";
                inputId.value = productVariantId;
                const inputQty = document.createElement("input");
                inputQty.type = "hidden";
                inputQty.name = "items[][quantity]";
                inputQty.className = "quantity";
                inputQty.value = "1";
                inputQty.dataset.price = price;
                wrapper.appendChild(inputId);
                wrapper.appendChild(inputQty);
                const productForm = currentTarget
                  .closest("outfit-finder")
                  .querySelector("product-form");
                productForm
                  .querySelector(".outfit-finder-list")
                  .appendChild(wrapper);
                const button = productForm.querySelector(
                  ".product-form__submit:disabled",
                );
                if (button) {
                  button.removeAttribute("disabled");
                }
                const clear_button = productForm.querySelector(
                  ".product_clear_button.hidden",
                );
                if (clear_button) {
                  clear_button.classList.remove("hidden");
                }
                currentTarget.closest("outfit-add").classList.add("active");
                this.updateTotalPrice();
                if (document.querySelector("quick-outfit-popup")) {
                  eventModal(
                    document.querySelector("quick-outfit-popup"),
                    "close",
                    false,
                  );
                }
                this.appendOutfitPreview(html, productId, n);
              } else {
                notifier.show(
                  window.message.product.out_of_stock,
                  "error",
                  4000,
                );
              }
            } else {
              this.querySelectorAll(".product-card-variant-js").forEach(
                (fieldset) => {
                  const radioValues = Array.from(
                    fieldset.querySelectorAll('input[type="radio"]:checked'),
                  ).map((radio) => radio.value);
                  if (radioValues.length === 0) {
                    const variantsSelector = outfitPopup
                      ? ".outfit-mobile-content"
                      : ".outfit-desktop-content";

                    const variants = html.querySelector(variantsSelector);
                    const position = fieldset.getAttribute(
                      "data-position-option",
                    );

                    if (variants && position) {
                      const fieldsetSelector = `.variants-fieldset-${position}`;

                      const sourceFieldset =
                        variants.querySelector(fieldsetSelector);
                      const targetFieldset =
                        _this.querySelector(fieldsetSelector);

                      if (sourceFieldset && targetFieldset) {
                        const optionValue =
                          sourceFieldset.querySelector(".option_value");

                        if (optionValue) {
                          optionValue.classList.add("warning-inline");
                          optionValue.textContent =
                            optionValue.getAttribute("data-option") || "";
                        }

                        targetFieldset.innerHTML = sourceFieldset.innerHTML;
                      }
                    }
                    _this
                      .querySelectorAll(
                        ".variants-fieldset-" + position + ' [type="radio"]',
                      )
                      .forEach((input) => {
                        input.addEventListener(
                          "change",
                          _this.onVariantChangeQuickAdd.bind(_this),
                        );
                      });
                  }
                },
              );
            }
          });
      }

      initSelect(event) {
        event.preventDefault();
        const maxSelect =
          this.closest("outfit-finder").getAttribute("data-max-items");
        const els = [
          ...this.closest("outfit-finder").querySelectorAll("outfit-preview"),
        ];
        const n = els.length;
        if (n >= maxSelect) {
          notifier.show(window.message.product.maximum_outfit, "error", 4000);
          return;
        }
        const currentTarget = event.currentTarget;
        const product = currentTarget.closest(".product__item-js");
        const productVariantId = this.getAttribute("data-product-variant-id");
        const productId = this.getAttribute("data-product-id");
        const price = this.getAttribute("data-price");
        const wrapper = document.createElement("div");
        wrapper.className = "variant-select";
        wrapper.setAttribute("product-id", productId);
        const inputId = document.createElement("input");
        inputId.type = "hidden";
        inputId.name = "items[][id]";
        inputId.dataset.index = "1";
        inputId.value = productVariantId;
        const inputQty = document.createElement("input");
        inputQty.type = "hidden";
        inputQty.name = "items[][quantity]";
        inputQty.className = "quantity";
        inputQty.value = "1";
        inputQty.dataset.price = price;
        wrapper.appendChild(inputId);
        wrapper.appendChild(inputQty);
        const productForm = currentTarget
          .closest("outfit-finder")
          .querySelector("product-form");
        productForm.querySelector(".outfit-finder-list").appendChild(wrapper);
        const button = productForm.querySelector(
          ".product-form__submit:disabled",
        );
        if (button) {
          button.removeAttribute("disabled");
        }
        const clear_button = productForm.querySelector(
          ".product_clear_button.hidden",
        );
        if (clear_button) {
          clear_button.classList.remove("hidden");
        }
        currentTarget.closest("outfit-add").classList.add("active");
        this.updateTotalPrice();
        this.appendOutfitPreview(product, productId);
      }

      createRequestUrl(baseUrl, optionValues) {
        const queryParams = [`section_id=card-product`];
        if (optionValues.length > 0) {
          queryParams.push(`option_values=${optionValues.join(",")}`);
        }
        return `${baseUrl}?${queryParams.join("&")}`;
      }

      updateTotalPrice() {
        let totalPrice = 0;
        let _this = this;
        if (this.closest("quick-outfit-popup")) {
          _this = NextSkyTheme.global.rootToFocus;
        }
        const productForm = _this
          .closest("outfit-finder")
          .querySelector("product-form");
        productForm.querySelectorAll(".variant-select").forEach((select) => {
          const qtyInput = select.querySelector(".quantity");
          if (!qtyInput) return;
          const price = Number(qtyInput.dataset.price) || 0;
          totalPrice += price;
        });

        const totalPriceElement = productForm
          .closest(".summary")
          .querySelector(".total-price");
        if (totalPriceElement && totalPrice > 0) {
          const formattedPrice = NextSkyTheme.formatMoney(
            totalPrice,
            cartStrings.money_format,
          );
          totalPriceElement.textContent = formattedPrice;
        }
        if (totalPrice == 0) {
          const button = productForm.querySelector(
            "button.product-form__submit",
          );
          const clear_button = productForm.querySelector(
            "button.product_clear_button",
          );
          if (button) {
            button.setAttribute("disabled", "disabled");
          }
          if (clear_button) {
            clear_button.classList.add("hidden");
          }
        }
      }

      appendOutfitPreview(product, id, n = false) {
        let _this = this;
        let rendering_scale = 0.8;
        if (window.innerWidth > 1800) {
          rendering_scale = 1;
        }
        if (this.closest("quick-outfit-popup")) {
          _this = NextSkyTheme.global.rootToFocus;
        }
        if (_this.closest("outfit-finder").querySelector(".notify-preview")) {
          _this
            .closest("outfit-finder")
            .querySelector(".notify-preview")
            .remove();
        }
        const container = _this
          .closest("outfit-finder")
          .querySelector(".outfit-finder-selections-preview");
        if (container.querySelector(`outfit-preview[data-id="${id}"]`)) {
          return;
        }

        const template = container.querySelector("template.preview");
        const clone = template.content.cloneNode(true);
        const previewImage = clone.querySelector(".preview-image");
        const outfitPreview = clone.querySelector("outfit-preview");
        outfitPreview.dataset.id = id;
        let sourceMedia = product.querySelector(".image__media");
        if (!sourceMedia) {
          sourceMedia = _this
            .closest(".product__item-js")
            .querySelector(".image__media");
        }
        if (sourceMedia) {
          const aspectRatio =
            sourceMedia.style.getPropertyValue("--aspect-ratio");
          const featuredImg = sourceMedia.querySelector(
            "img.product__img.featured-image",
          );
          if (featuredImg) {
            const newMedia = document.createElement("div");
            newMedia.className = "image__media";
            if (aspectRatio) {
              newMedia.style.setProperty("--aspect-ratio", aspectRatio);
            }
            const imgClone = featuredImg.cloneNode(true);
            imgClone.classList.remove(
              "absolute",
              "inset-0",
              "product__hover-img",
            );
            newMedia.appendChild(imgClone);
            previewImage.appendChild(newMedia);
          }
        }
        const { width, height } = this.measureItemSize(
          container,
          outfitPreview,
        );

        const { x, y } = this.findEmptyPositionCenterFirst(
          container,
          width,
          height,
          12,
          40,
        );
        outfitPreview.style.setProperty("--translate-x", `${x}px`);
        outfitPreview.style.setProperty("--translate-y", `${y}px`);
        outfitPreview.style.setProperty(
          "--rendering-scale",
          `${rendering_scale}`,
        );
        const zIndex = this.getNextZIndex(container);
        outfitPreview.style.setProperty("--z-index", zIndex);
        outfitPreview.classList.add("is-entering");
        container.appendChild(outfitPreview);
        container.closest("outfit-finder")?.saveAllOutfitPreviews();
        container.closest("outfit-finder")?.saveProductFormState();
        if (window.innerWidth < 1025) {
          container.closest("outfit-finder")?.toggle();
        }
        requestAnimationFrame(() => {
          setTimeout(() => {
            outfitPreview.classList.remove("is-entering");
          }, 500);
        });
        if (n < 1) {
          setTimeout(() => {
            notifierInline.show(
              window.message.product.alert_outfit,
              "success",
              outfitPreview,
            );
          }, 800);
        }
      }

      getNextZIndex(container) {
        const items = container.querySelectorAll("outfit-preview");

        let maxZ = 0;

        items.forEach((el) => {
          const z =
            parseInt(getComputedStyle(el).getPropertyValue("--z-index")) || 0;

          if (z > maxZ) maxZ = z;
        });

        return maxZ + 1;
      }

      measureItemSize(container, itemEl) {
        itemEl.style.visibility = "hidden";
        itemEl.style.pointerEvents = "none";

        container.appendChild(itemEl);

        const rect = itemEl.getBoundingClientRect();

        container.removeChild(itemEl);

        itemEl.style.visibility = "";
        itemEl.style.pointerEvents = "";

        return {
          width: rect.width,
          height: rect.height,
        };
      }

      findEmptyPositionCenterFirst(
        container,
        itemWidth,
        itemHeight,
        gap = 12,
        step = 40,
      ) {
        const containerRect = container.getBoundingClientRect();

        const items = [...container.querySelectorAll("outfit-preview")].map(
          (el) => el.getBoundingClientRect(),
        );

        const centerX = (containerRect.width - itemWidth) / 2;
        const centerY = (containerRect.height - itemHeight) / 2;
        const centerRect = {
          left: containerRect.left + centerX,
          top: containerRect.top + centerY,
          right: containerRect.left + centerX + itemWidth,
          bottom: containerRect.top + centerY + itemHeight,
        };

        if (!this.isOverlapping(centerRect, items)) {
          return { x: centerX, y: centerY };
        }
        const centerItem = this.getCenterMostItem(items, containerRect);

        if (centerItem) {
          const edgeStep = Math.max(12, Math.floor(itemHeight / 4));

          const baseScans = [
            {
              axis: "y",
              baseX: centerItem.right - containerRect.left + gap,
              rangeStart: centerItem.top - containerRect.top,
              rangeEnd: centerItem.bottom - containerRect.top - itemHeight,
            },
            {
              axis: "y",
              baseX: centerItem.left - containerRect.left - itemWidth - gap,
              rangeStart: centerItem.top - containerRect.top,
              rangeEnd: centerItem.bottom - containerRect.top - itemHeight,
            },
            {
              axis: "x",
              baseY: centerItem.bottom - containerRect.top + gap,
              rangeStart: centerItem.left - containerRect.left,
              rangeEnd: centerItem.right - containerRect.left - itemWidth,
            },
            {
              axis: "x",
              baseY: centerItem.top - containerRect.top - itemHeight - gap,
              rangeStart: centerItem.left - containerRect.left,
              rangeEnd: centerItem.right - containerRect.left - itemWidth,
            },
          ];
          const scans = this.shuffleArray(baseScans);

          for (const scan of scans) {
            const pos = this.scanAlongEdge({
              ...scan,
              step: edgeStep,
              itemWidth,
              itemHeight,
              containerRect,
              items,
            });

            if (pos) return pos;
          }
        }
        const maxRadius = Math.max(containerRect.width, containerRect.height);

        for (let r = step; r <= maxRadius; r += step) {
          for (let angle = 0; angle < 360; angle += 45) {
            const rad = (angle * Math.PI) / 180;

            const x = centerX + Math.cos(rad) * r;
            const y = centerY + Math.sin(rad) * r;

            if (
              x < 0 ||
              y < 0 ||
              x + itemWidth > containerRect.width ||
              y + itemHeight > containerRect.height
            ) {
              continue;
            }

            const testRect = {
              left: containerRect.left + x,
              top: containerRect.top + y,
              right: containerRect.left + x + itemWidth,
              bottom: containerRect.top + y + itemHeight,
            };

            if (!this.isOverlapping(testRect, items)) {
              return { x, y };
            }
          }
        }
        return { x: centerX, y: centerY };
      }

      isOverlapping(testRect, items, threshold = 0.3) {
        return items.some((rect) => {
          const overlapX = Math.max(
            0,
            Math.min(testRect.right, rect.right) -
              Math.max(testRect.left, rect.left),
          );
          const overlapY = Math.max(
            0,
            Math.min(testRect.bottom, rect.bottom) -
              Math.max(testRect.top, rect.top),
          );
          const overlapArea = overlapX * overlapY;
          const itemArea = (rect.right - rect.left) * (rect.bottom - rect.top);
          const overlapRatio = overlapArea / itemArea;

          return overlapRatio > threshold;
        });
      }

      getCenterMostItem(items, containerRect) {
        const cx = containerRect.left + containerRect.width / 2;
        const cy = containerRect.top + containerRect.height / 2;

        let minDist = Infinity;
        let centerItem = null;

        items.forEach((rect) => {
          const rx = (rect.left + rect.right) / 2;
          const ry = (rect.top + rect.bottom) / 2;
          const dist = Math.hypot(rx - cx, ry - cy);

          if (dist < minDist) {
            minDist = dist;
            centerItem = rect;
          }
        });

        return centerItem;
      }

      scanAlongEdge({
        axis,
        baseX,
        baseY,
        rangeStart,
        rangeEnd,
        step,
        itemWidth,
        itemHeight,
        containerRect,
        items,
      }) {
        for (let p = rangeStart; p <= rangeEnd; p += step) {
          const x = axis === "y" ? baseX : p;
          const y = axis === "y" ? p : baseY;

          if (
            x < 0 ||
            y < 0 ||
            x + itemWidth > containerRect.width ||
            y + itemHeight > containerRect.height
          ) {
            continue;
          }

          const testRect = {
            left: containerRect.left + x,
            top: containerRect.top + y,
            right: containerRect.left + x + itemWidth,
            bottom: containerRect.top + y + itemHeight,
          };

          if (!this.isOverlapping(testRect, items)) {
            return { x, y };
          }
        }

        return null;
      }

      shuffleArray(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      }
    },
  );
}

if (!customElements.get("variant-outfit-remove")) {
  customElements.define(
    "variant-outfit-remove",
    class VariantOutfitRemove extends HTMLElement {
      constructor() {
        super();
        this.buttonRemove = this.querySelector(".button__remove");
        this.productId = this.getAttribute("data-product-id");
      }

      connectedCallback() {
        if (this.buttonRemove) {
          this.buttonRemove.addEventListener(
            "click",
            this.initRemove.bind(this),
            false,
          );
          this.buttonRemove.addEventListener(
            "keypress",
            function (event) {
              if (event.key === "Enter") {
                this.initRemove.bind(this)(event);
              }
            }.bind(this),
            false,
          );
        }
      }

      initRemove() {
        const productForm =
          this.closest("outfit-finder").querySelector("product-form");
        const el = productForm.querySelector(
          `.variant-select[product-id="${this.productId}"]`,
        );
        if (el) {
          el.remove();
          this.closest("outfit-add").classList.remove("active");
          this.updateTotalPrice();
          const radios = this.closest("outfit-add").querySelectorAll(
            'input[type="radio"]',
          );
          radios.forEach((r) => {
            r.checked = false;
          });
          const optionValues = this.closest("outfit-add").querySelectorAll(
            ".product-variants-info .option_value",
          );
          optionValues.forEach((r) => {
            r.classList.remove("warning-inline");
            r.innerHTML = "";
          });
        }
        this.animateRemove(this.productId);
      }

      animateRemove(productId) {
        const preview = this.closest("outfit-finder").querySelector(
          `outfit-preview[data-id="${productId}"]`,
        );
        preview.classList.add("is-leaving");
        const duration = 300;
        setTimeout(() => {
          preview.remove();
          this.closest("outfit-finder")?.saveAllOutfitPreviews();
          this.closest("outfit-finder")?.saveProductFormState();
        }, duration);
      }

      updateTotalPrice() {
        let totalPrice = 0;
        const productForm =
          this.closest("outfit-finder").querySelector("product-form");
        productForm.querySelectorAll(".variant-select").forEach((select) => {
          const qtyInput = select.querySelector(".quantity");
          if (!qtyInput) return;
          const price = Number(qtyInput.dataset.price) || 0;
          totalPrice += price;
        });

        const totalPriceElement = productForm
          .closest(".summary")
          .querySelector(".total-price");
        if (totalPriceElement) {
          const formattedPrice = NextSkyTheme.formatMoney(
            totalPrice,
            cartStrings.money_format,
          );
          totalPriceElement.textContent = formattedPrice;
        }
        if (totalPrice == 0) {
          const button = productForm.querySelector(
            "button.product-form__submit",
          );
          const clear_button = productForm.querySelector(
            "button.product_clear_button",
          );
          if (button) {
            button.setAttribute("disabled", "disabled");
          }
          if (clear_button) {
            clear_button.classList.add("hidden");
          }
        }
      }
    },
  );
}

if (!customElements.get("outfit-preview")) {
  customElements.define(
    "outfit-preview",
    class OutfitPreview extends HTMLElement {
      constructor() {
        super();
        this.buttonRemove = this.querySelector("button.remove");
        this.buttonScaleZoom = this.querySelector("button.scale-zoom");
      }

      connectedCallback() {
        this.enableDrag();
        if (this.buttonRemove) {
          this.buttonRemove.addEventListener(
            "click",
            this.initRemove.bind(this),
            false,
          );
          this.buttonRemove.addEventListener(
            "keypress",
            function (event) {
              if (event.key === "Enter") {
                this.initRemove.bind(this)(event);
              }
            }.bind(this),
            false,
          );
        }

        if (this.buttonScaleZoom) {
          this.initScaleZoom();
        }
      }

      initScaleZoom() {
        let isScaling = false;
        let startY = 0;
        let currentScale = 1;

        this.buttonScaleZoom.addEventListener("pointerdown", (e) => {
          e.stopPropagation();
          isScaling = true;
          this.setPointerCapture(e.pointerId);
          startY = e.clientY;
          const cs = getComputedStyle(this);
          currentScale =
            parseFloat(cs.getPropertyValue("--rendering-scale")) || 1;
          document.body.classList.add("scaling-outfit");
        });

        this.addEventListener("pointermove", (e) => {
          if (!isScaling) return;
          const deltaY = e.clientY - startY;
          let newScale = currentScale + deltaY * 0.005;
          newScale = Math.min(Math.max(0.5, newScale), 2);
          this.style.setProperty("--rendering-scale", newScale);
          startY = e.clientY;
          currentScale = newScale;
        });

        const endScale = () => {
          isScaling = false;
          document.body.classList.remove("scaling-outfit");
          this.closest("outfit-finder")?.saveAllOutfitPreviews();
          this.closest("outfit-finder")?.saveProductFormState();
        };

        this.addEventListener("pointerup", endScale);
        this.addEventListener("pointercancel", endScale);
      }

      initRemove() {
        const productId = this.getAttribute("data-id");
        const productForm =
          this.closest("outfit-finder").querySelector("product-form");
        const el = productForm.querySelector(
          `.variant-select[product-id="${productId}"]`,
        );
        if (el) {
          el.remove();
          this.closest("outfit-finder")
            .querySelectorAll(`outfit-add[data-product-id="${productId}"]`)
            .forEach((outfit) => {
              outfit.classList.remove("active");
              const radios = outfit.querySelectorAll('input[type="radio"]');
              radios.forEach((r) => {
                r.checked = false;
              });
              const optionValues = outfit.querySelectorAll(
                ".product-variants-info .option_value",
              );
              optionValues.forEach((r) => {
                r.classList.remove("warning-inline");
                r.innerHTML = "";
              });
            });
          this.updateTotalPrice();
          this.animateRemove();
        }
      }

      animateRemove() {
        this.classList.add("is-leaving");
        const duration = 300;
        const outfit = this.closest("outfit-finder");
        setTimeout(() => {
          this.remove();
          outfit.saveAllOutfitPreviews();
          outfit.saveProductFormState();
        }, duration);
      }

      enableDrag() {
        let sx = 0,
          sy = 0;
        let ox = 0,
          oy = 0;
        let dx = 0,
          dy = 0;
        let dragging = false;
        let rafId = null;

        const applyMove = () => {
          this.style.setProperty("--translate-x", `${ox + dx}px`);
          this.style.setProperty("--translate-y", `${oy + dy}px`);
          rafId = null;
        };

        this.addEventListener(
          "pointerdown",
          (e) => {
            if (e.target.closest("button")) return;

            dragging = true;
            this.setPointerCapture(e.pointerId);

            sx = e.clientX;
            sy = e.clientY;

            const cs = getComputedStyle(this);
            ox = parseFloat(cs.getPropertyValue("--translate-x")) || 0;
            oy = parseFloat(cs.getPropertyValue("--translate-y")) || 0;

            dx = 0;
            dy = 0;

            const box = this.closest(".outfit-finder-selections-preview");
            if (box) {
              const z = this.getNextZIndex(box);
              this.style.setProperty("--z-index", z);
            }
            document.body.classList.add("drag-outfit");
          },
          { passive: true },
        );

        this.addEventListener(
          "pointermove",
          (e) => {
            if (!dragging) return;

            dx = e.clientX - sx;
            dy = e.clientY - sy;

            if (!rafId) {
              rafId = requestAnimationFrame(applyMove);
            }
          },
          { passive: true },
        );

        const endDrag = () => {
          dragging = false;
          this.closest("outfit-finder")?.saveAllOutfitPreviews();
          this.closest("outfit-finder")?.saveProductFormState();
          document.body.classList.remove("drag-outfit");
          if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
          }
        };

        this.addEventListener("pointerup", endDrag);
        this.addEventListener("pointercancel", endDrag);
      }

      updateTotalPrice() {
        let totalPrice = 0;
        const productForm =
          this.closest("outfit-finder").querySelector("product-form");
        productForm.querySelectorAll(".variant-select").forEach((select) => {
          const qtyInput = select.querySelector(".quantity");
          if (!qtyInput) return;
          const price = Number(qtyInput.dataset.price) || 0;
          totalPrice += price;
        });

        const totalPriceElement = productForm
          .closest(".summary")
          .querySelector(".total-price");
        if (totalPriceElement) {
          const formattedPrice = NextSkyTheme.formatMoney(
            totalPrice,
            cartStrings.money_format,
          );
          totalPriceElement.textContent = formattedPrice;
        }
        if (totalPrice == 0) {
          const button = productForm.querySelector(
            "button.product-form__submit",
          );
          const clear_button = productForm.querySelector(
            "button.product_clear_button",
          );
          if (button) {
            button.setAttribute("disabled", "disabled");
          }
          if (clear_button) {
            clear_button.classList.add("hidden");
          }
        }
      }

      getNextZIndex(container) {
        const items = container.querySelectorAll("outfit-preview");

        let maxZ = 0;

        items.forEach((el) => {
          const z =
            parseInt(getComputedStyle(el).getPropertyValue("--z-index")) || 0;

          if (z > maxZ) maxZ = z;
        });

        return maxZ + 1;
      }
    },
  );
}
