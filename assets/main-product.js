import { LazyLoader } from "@NextSkyTheme/lazy-load";

document.addEventListener("DOMContentLoaded", function () {
  function addProductEntry(productJson, storedProducts) {
    if (storedProducts === null) storedProducts = [];
    const currentProductID = productJson.toString();
    if (!storedProducts.includes(currentProductID)) {
      storedProducts.unshift(currentProductID);
      if (storedProducts.length > 25) {
        storedProducts.pop();
      }
      localStorage.setItem(
        "recently-viewed-products",
        JSON.stringify(storedProducts)
      );
    } else {
      const index = storedProducts.indexOf(currentProductID);
      if (index > -1) {
        storedProducts.splice(index, 1);
      }
      storedProducts.unshift(currentProductID);
      localStorage.setItem(
        "recently-viewed-products",
        JSON.stringify(storedProducts)
      );
    }
  }

  const prodData = document.querySelector("[data-product-json]");
  if (prodData != null) {
    const productJson = JSON.parse(prodData.innerHTML);
    const storedProducts = JSON.parse(
      localStorage.getItem("recently-viewed-products")
    );
    addProductEntry(productJson, storedProducts);
  }
});

class ProductRecommendations extends HTMLElement {
  constructor() {
    super();
  }
  init() {
    this.connectedCallback();
  }
  connectedCallback() {
    const handleIntersection = (entries, observer) => {
      if (!entries[0].isIntersecting) return;
      observer.unobserve(this);
      fetch(this.dataset.url)
        .then((response) => response.text())
        .then((text) => {
          const html = document.createElement("div");
          html.innerHTML = text;
          const recommendations = html.querySelector("product-recommendations");
          if (recommendations && recommendations.innerHTML.trim().length) {
            this.innerHTML = recommendations.innerHTML;
          }
          new LazyLoader(".image-lazy-load");
        })
        .finally(() => {})
        .catch((e) => {
          console.error(e);
        });
    };

    new IntersectionObserver(handleIntersection.bind(this), {
      rootMargin: "0px 0px 400px 0px",
    }).observe(this);
  }
}
customElements.define("product-recommendations", ProductRecommendations);

class StickyAddCart extends HTMLElement {
  constructor() {
    super();
    this.init();
  }
  init() {
    const _this = this;
    this.main = document.querySelector(".main-product-section");
    if (!this.main) return;
    const primaryBtn = this.main.querySelector(".block-product__buttons");
    const footer = document.querySelector("footer");
    if (!primaryBtn) return;
    var isVisible = true;
    window.addEventListener("scroll", function () {
      const buttonRect = primaryBtn.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      if (footer) {
        const footerRect = footer.getBoundingClientRect();
        if (footerRect.top < window.innerHeight - 100) {
          _this.classList.remove("show-sticky-cart");
          document.documentElement.classList.remove("show-sticky-cart-active");
          isVisible = true;
        } else {
          if (
            !isVisible &&
            buttonRect.top < viewportHeight &&
            buttonRect.bottom > 0
          ) {
            isVisible = true;
            _this.classList.remove("show-sticky-cart");
            document.documentElement.classList.remove(
              "show-sticky-cart-active"
            );
          } else if (isVisible && buttonRect.bottom <= 0) {
            isVisible = false;
            _this.classList.add("show-sticky-cart");
            document.documentElement.classList.add("show-sticky-cart-active");
          }
        }
      } else {
        if (
          !isVisible &&
          buttonRect.top < viewportHeight &&
          buttonRect.bottom > 0
        ) {
          isVisible = true;
          _this.classList.remove("show-sticky-cart");
          document.documentElement.classList.remove("show-sticky-cart-active");
        } else if (isVisible && buttonRect.bottom <= 0) {
          isVisible = false;
          _this.classList.add("show-sticky-cart");
          document.documentElement.classList.add("show-sticky-cart-active");
        }
      }
    });
  }
}
customElements.define("sticky-add-cart", StickyAddCart);

const infoGallerySlide = () => {
  const gallery = document.querySelectorAll(".info-gallery__card");
  gallery.forEach((e) => {
    e.addEventListener("mouseover", (event) => {
      const currentTarget = event.currentTarget;
      if (!currentTarget.classList.contains("active")) {
        gallery.forEach((el) => {
          el.classList.remove("active");
        });
        currentTarget.classList.add("active");
      }
    });
  });
};
document.addEventListener("shopify:section:load", function () {
  infoGallerySlide();
});
infoGallerySlide();
