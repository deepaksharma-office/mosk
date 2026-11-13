if (!window.DeferredMedia) {
  class DeferredMedia extends HTMLElement {
    constructor() {
      super();
      const poster = this.querySelector('[id^="Deferred-Poster-"]');
      if (!poster) return;
      poster.addEventListener("click", this.loadContent.bind(this));
    }

    loadContent(focus = true) {
      this.pauseAllMedia(this.closest('media-gallery'));
      if (!this.getAttribute("loaded")) {
        const content = document.createElement("div");
        content.appendChild(
          this.querySelector("template").content.firstElementChild.cloneNode(
            true
          )
        );

        this.setAttribute("loaded", true);
        const deferredElement = this.appendChild(
          content.querySelector("video, model-viewer, iframe")
        );
        if (focus) deferredElement.focus();
        if (
          deferredElement.nodeName == "VIDEO" &&
          deferredElement.getAttribute("autoplay")
        ) {
          // force autoplay for safari
          deferredElement.play();
        }
      }
    }

    pauseAllMedia(element) {
      element.querySelectorAll('.js-youtube').forEach((video) => {
        video.contentWindow.postMessage('{"event":"command","func":"' + 'pauseVideo' + '","args":""}', '*');
      });
      element.querySelectorAll('.js-vimeo').forEach((video) => {
        video.contentWindow.postMessage('{"method":"pause"}', '*');
      });
      element.querySelectorAll('video').forEach((video) => video.pause());
      element.querySelectorAll('product-model').forEach((model) => {
        if (model.modelViewerUI) model.modelViewerUI.pause();
      });
    }
  }
  window.DeferredMedia = DeferredMedia;
}

if (!customElements.get("product-model")) {
  customElements.define(
    "product-model",
    class ProductModel extends DeferredMedia {
      constructor() {
        super();
      }

      loadContent() {
        super.loadContent();

        Shopify.loadFeatures([
          {
            name: "model-viewer-ui",
            version: "1.0",
            onLoad: this.setupModelViewerUI.bind(this),
          },
        ]);
      }

      setupModelViewerUI(errors) {
        if (errors) return;

        this.modelViewerUI = new Shopify.ModelViewerUI(
          this.querySelector("model-viewer")
        );
      }
    }
  );
}

window.ProductModel = {
  loadShopifyXR() {
    Shopify.loadFeatures([
      {
        name: "shopify-xr",
        version: "1.0",
        onLoad: this.setupShopifyXR.bind(this),
      },
    ]);
  },

  setupShopifyXR(errors) {
    if (errors) return;

    if (!window.ShopifyXR) {
      document.addEventListener("shopify_xr_initialized", () =>
        this.setupShopifyXR()
      );
      return;
    }

    document.querySelectorAll('[id^="ProductJSON-"]').forEach((modelJSON) => {
      window.ShopifyXR.addModels(JSON.parse(modelJSON.textContent));
      modelJSON.remove();
    });
    window.ShopifyXR.setupXRElements();
  },
};

window.addEventListener("DOMContentLoaded", () => {
  if (window.ProductModel) window.ProductModel.loadShopifyXR();
});
