class CustomElementPatcher {
  constructor() {}

  patchCustomElement(tagElement, defineElement, classElement) {
    const selector = `${tagElement}[is="${defineElement}"]`;
    document.querySelectorAll(selector).forEach((el) => {
      if (!(el instanceof classElement)) {
        Object.setPrototypeOf(el, classElement.prototype);
        if (typeof el.init === "function") {
          el.init();
        }
      }
    });
  }
  patchAllCustomElements(elements = {}) {
    Object.entries(elements).forEach(
      ([defineElement, { tagElement, classElement }]) => {
        this.patchCustomElement(tagElement, defineElement, classElement);
      }
    );
  }
  observeAndPatchCustomElements(elements = {}) {
    const config = { attributes: true, childList: true, subtree: true };
    const patchIfNeeded = () => {
      this.patchAllCustomElements(elements);
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", patchIfNeeded);
    } else {
      patchIfNeeded();
    }
    const observer = new MutationObserver(patchIfNeeded);
    observer.observe(document.body, config);
    if (window.Shopify && Shopify.designMode) {
      document.addEventListener("shopify:section:load", patchIfNeeded);
      document.addEventListener("shopify:section:select", patchIfNeeded);
      document.addEventListener("shopify:section:deselect", patchIfNeeded);
      document.addEventListener("shopify:block:select", patchIfNeeded);
      document.addEventListener("shopify:block:deselect", patchIfNeeded);
    }
  }
}
export const CustomElement = new CustomElementPatcher();
