export const global = {
  rootToFocus: null,
};

let cachedRoot = null;
let cachedBody = null;
let cachedScrollbarWidth = null;

export function getBody() {
  if (!cachedBody) {
    cachedBody = document.body;
  }
  return cachedBody;
}

export function getRoot() {
  if (!cachedRoot) {
    cachedRoot = document.documentElement;
  }
  return cachedRoot;
}

export function getScrollbarWidth() {
  if (cachedScrollbarWidth !== null) {
    return cachedScrollbarWidth;
  }

  const scrollDiv = document.createElement("div");
  Object.assign(scrollDiv.style, {
    width: "100px",
    height: "100px",
    overflow: "scroll",
    position: "absolute",
    top: "-9999px",
    visibility: "hidden",
  });

  getBody().appendChild(scrollDiv);
  cachedScrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
  getBody().removeChild(scrollDiv);

  return cachedScrollbarWidth;
}

export function formatMoney(cents, format) {
  if (typeof cents === "string") {
    cents = cents.replace(/[^\d\-]/g, "");
    cents = cents === "" ? 0 : Number(cents);
  }
  cents = cents == null ? 0 : Number(cents);
  var formatString = format || this.money_format;

  var format = String(formatString || "{{ amount }}");

  var match = format.match(/\{\{\s*(amount(?:_[a-z_]+)?)\s*\}\}/);
  var placeholder = match ? match[1] : "amount";

  var precision = 2;
  var thousands = ",";
  var decimal = ".";

  switch (placeholder) {
    case "amount":
      precision = 2;
      thousands = ",";
      decimal = ".";
      break;
    case "amount_no_decimals":
      precision = 0;
      thousands = ",";
      decimal = ".";
      break;
    case "amount_with_comma_separator":
      precision = 2;
      thousands = ".";
      decimal = ",";
      break;
    case "amount_no_decimals_with_comma_separator":
      precision = 0;
      thousands = ".";
      decimal = ",";
      break;
    case "amount_with_apostrophe_separator":
      precision = 2;
      thousands = "'";
      decimal = ".";
      break;
    case "amount_no_decimals_with_space_separator":
      precision = 0;
      thousands = " ";
      decimal = ".";
      break;
    case "amount_with_space_separator":
      precision = 2;
      thousands = " ";
      decimal = ",";
      break;
    case "amount_with_period_and_space_separator":
      precision = 2;
      thousands = " ";
      decimal = ".";
      break;
    default:
      precision = 2;
      thousands = ",";
      decimal = ".";
  }

  function formatWithDelimiters(number, precision, thousands, decimal) {
    if (isNaN(number) || number == null) return "";

    var negative = number < 0;
    number = Math.abs(number);

    var base = (number / 100.0).toFixed(precision);

    var parts = base.split(".");
    var integerPart = parts[0];
    var fractionPart = parts[1] || "";

    var withThousands = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousands);

    var result = withThousands;
    if (precision > 0) {
      result += decimal + fractionPart;
    }

    return (negative ? "-" : "") + result;
  }

  var formattedNumber = formatWithDelimiters(
    cents,
    precision,
    thousands,
    decimal
  );

  var output = format.replace(
    /\{\{\s*(amount(?:_[a-z_]+)?)\s*\}\}/,
    formattedNumber
  );

  return output;
}

let subscribers = {};

export function subscribe(eventName, callback) {
  if (subscribers[eventName] === undefined) {
    subscribers[eventName] = [];
  }

  subscribers[eventName] = [...subscribers[eventName], callback];

  return function unsubscribe() {
    subscribers[eventName] = subscribers[eventName].filter((cb) => {
      return cb !== callback;
    });
  };
}

export function publish(eventName, data) {
  if (subscribers[eventName]) {
    subscribers[eventName].forEach((callback) => {
      callback(data);
    });
  }
}

export function debounce(fn, wait) {
  /** @type {number | undefined} */
  let timeout;

  /** @param {...any} args */
  function debounced(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  }

  // Add the .cancel method:
  debounced.cancel = () => {
    clearTimeout(timeout);
  };

  return /** @type {T & { cancel(): void }} */ (debounced);
}

export function throttle(fn, delay) {
  let lastCall = 0;

  /** @param {...any} args */
  function throttled(...args) {
    const now = performance.now();
    // If the time since the last call exceeds the delay, execute the callback
    if (now - lastCall >= delay) {
      lastCall = now;
      fn.apply(this, args);
    }
  }

  throttled.cancel = () => {
    lastCall = performance.now();
  };

  return /** @type {T & { cancel(): void }} */ (throttled);
}

export var parser = new DOMParser();

export var ON_CHANGE_DEBOUNCE_TIMER = 300;

export var PUB_SUB_EVENTS = {
  cartUpdate: "cart-update",
  quantityUpdate: "quantity-update",
  variantChange: "variant-change",
};

export function pauseAllMedia(element) {
  if (!element) return;

  const allMedia = element.querySelectorAll(
    ".js-youtube, .js-vimeo, video, product-model"
  );

  allMedia.forEach((media) => {
    if (media.classList.contains("js-youtube")) {
      media.contentWindow?.postMessage(
        '{"event":"command","func":"pauseVideo","args":""}',
        "*"
      );
    } else if (media.classList.contains("js-vimeo")) {
      media.contentWindow?.postMessage('{"method":"pause"}', "*");
    } else if (media.tagName === "VIDEO") {
      media.pause();
      const videoGallery = media.closest("video-product-gallery");
      if (videoGallery) {
        const playButton = videoGallery.querySelector("button.play-button");
        if (playButton) {
          playButton.classList.remove("active");
        }
      }
    } else if (media.tagName === "PRODUCT-MODEL" && media.modelViewerUI) {
      media.modelViewerUI.pause();
    }
  });
}

function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe"
    )
  );
}

const trapFocusHandlers = {};
export function trapFocus(container, elementToFocus = container) {
  var elements = getFocusableElements(container);
  var first = elements[0];
  var last = elements[elements.length - 1];

  removeTrapFocus();

  trapFocusHandlers.focusin = (event) => {
    if (
      event.target !== container &&
      event.target !== last &&
      event.target !== first
    )
      return;

    document.addEventListener("keydown", trapFocusHandlers.keydown);
  };

  trapFocusHandlers.focusout = function () {
    document.removeEventListener("keydown", trapFocusHandlers.keydown);
  };

  trapFocusHandlers.keydown = function (event) {
    if (event.code.toUpperCase() !== "TAB") return;
    if (event.target === last && !event.shiftKey) {
      event.preventDefault();
      first?.focus();
    }
    if (
      (event.target === container || event.target === first) &&
      event.shiftKey
    ) {
      event.preventDefault();
      last?.focus();
    }
  };

  document.addEventListener("focusout", trapFocusHandlers.focusout);
  document.addEventListener("focusin", trapFocusHandlers.focusin);

  elementToFocus.focus();

  if (
    elementToFocus.tagName === "INPUT" &&
    ["search", "text", "email", "url"].includes(elementToFocus.type) &&
    elementToFocus.value
  ) {
    elementToFocus.setSelectionRange(0, elementToFocus.value.length);
  }
}

export function removeTrapFocus(elementToFocus = null) {
  document.removeEventListener("focusin", trapFocusHandlers.focusin);
  document.removeEventListener("focusout", trapFocusHandlers.focusout);
  document.removeEventListener("keydown", trapFocusHandlers.keydown);
  if (elementToFocus) elementToFocus.focus();
}
export class eventDelegate {
  constructor() {
    this.events = [];
  }

  on(eventType, selector, handler) {
    this.events.push({ eventType, selector, handler });
    document.addEventListener(eventType, (event) => {
      this.handleEvent(event, selector, handler);
    });
  }

  handleEvent(event, selector, handler) {
    if (event.target.matches(selector)) {
      handler.call(this, event);
    }
  }
}

export function fetchConfig(type = "json") {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: `application/${type}`,
    },
  };
}

export function getCookie(name) {
  const nameString = name + "=";
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookieArray = decodedCookie.split(";");

  for (let i = 0; i < cookieArray.length; i++) {
    let cookie = cookieArray[i].trim();
    if (cookie.indexOf(nameString) === 0) {
      return cookie.substring(nameString.length, cookie.length);
    }
  }

  return null;
}

export function setCookie(name, value, days = 30, path = "/") {
  const expirationDate = new Date();
  expirationDate.setTime(expirationDate.getTime() + days * 24 * 60 * 60 * 1000);

  const cookieValue =
    encodeURIComponent(value) +
    "; expires=" +
    expirationDate.toUTCString() +
    "; path=" +
    path;

  document.cookie = name + "=" + cookieValue;
}

export function deleteCookie(name, path = "/") {
  document.cookie =
    name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=" + path + ";";
}

export const currency_rate = Shopify.currency.rate;
export class FSProgressBar {
  constructor(selector) {
    document
      .querySelectorAll(selector)
      .forEach((selector) => this.init(selector));
  }

  init(_this) {
    let progress = _this.querySelector(".progress");
    if (!progress) {
      progress = _this;
    }
    const rate = Number(Shopify.currency.rate);
    if (!Number.isFinite(rate) || rate <= 0) return;
    const orderTotal = Number(progress?.dataset.totalOrder) || 0;
    if (_this.dataset.progressMode === "milestones") {
      this.setMilestoneProgress(_this, orderTotal, rate);
      return;
    }
    const min = Number(progress?.dataset.feAmount) || 0;
    if (!min) return;
    const min_by_currency = min * rate * 100;
    if (orderTotal == 0) {
      this.setProgressBarTitle(_this, 0, min_by_currency);
    } else {
      if ((orderTotal / min_by_currency) * 100 > 100) {
        this.setProgressBar(_this, 100);
      } else {
        this.setProgressBar(_this, (orderTotal / min_by_currency) * 100);
      }
      this.setProgressBarTitle(_this, orderTotal, min_by_currency);
    }
  }

  setMilestoneProgress(_this, orderTotal, rate) {
    const milestoneList = _this.querySelector(".discount-progress-bar__milestones");
    const milestones = Array.from(
      _this.querySelectorAll("[data-milestone-amount]"),
    )
      .map((milestone) => ({
        element: milestone,
        label: milestone.dataset.milestoneLabel || "",
        amount: Math.round(
          Number(milestone.dataset.milestoneAmount) * rate * 100,
        ),
      }))
      .filter((milestone) => milestone.amount > 0)
      .sort((a, b) => a.amount - b.amount);

    if (!milestones.length) return;

    if (
      milestoneList &&
      milestones.some((milestone, index) => milestoneList.children[index] !== milestone.element)
    ) {
      milestones.forEach((milestone) => milestoneList.append(milestone.element));
    }

    milestones.forEach((milestone) => {
      const achieved = orderTotal >= milestone.amount;
      milestone.element.classList.toggle("is-achieved", achieved);
      milestone.element.toggleAttribute("data-achieved", achieved);
    });

    const nextIndex = milestones.findIndex(
      (milestone) => orderTotal < milestone.amount,
    );
    const nextMilestone = milestones[nextIndex];
    let progress = 100;
    if (nextMilestone) {
      const previousMilestone = milestones[nextIndex - 1];
      const previousAmount = previousMilestone?.amount || 0;
      // The icons sit at the centers of equal-width cells in the existing grid.
      const previousPosition =
        nextIndex === 0 ? 0 : ((nextIndex - 0.5) / milestones.length) * 100;
      const targetPosition = ((nextIndex + 0.5) / milestones.length) * 100;
      progress =
        previousPosition +
        ((orderTotal - previousAmount) /
          (nextMilestone.amount - previousAmount)) *
          (targetPosition - previousPosition);
    }
    // Reaching the final reward also fills the rail after its icon.
    this.setProgressBar(_this, Math.min(Math.max(progress, 0), 100));

    const message = _this.querySelector(".progress-bar-message");
    if (!message) return;

    if (!nextMilestone) {
      message.textContent = _this.dataset.progressSuccess || "";
    } else {
      const remaining = formatMoney(
        nextMilestone.amount - orderTotal,
        themeGlobalVariables.settings.money_format,
      );
      this.setMilestoneMessage(
        message,
        _this.dataset.progressMessage || "",
        remaining,
        nextMilestone.label,
      );
    }
    message.classList.remove("visibility-hidden");
  }

  setMilestoneMessage(message, template, amount, label) {
    const content = document.createDocumentFragment();
    template.split(/(\[amount\]|\[label\])/g).forEach((part) => {
      if (part === "[amount]") {
        const amountElement = document.createElement("span");
        amountElement.classList.add("heading-weight", "heading-color");
        amountElement.textContent = amount;
        content.append(amountElement);
      } else {
        content.append(part === "[label]" ? label : part);
      }
    });
    message.replaceChildren(content);
  }

  setProgressBar(_this, progress) {
    const bar = _this.querySelector(".progress");
    if (!bar) return;
    bar.style.setProperty("--width", progress + "%");
  }

  setProgressBarTitle(_this, orderTotal = 0, min_by_currency = 0) {
    let emptyUnavailable = _this.dataset.emptyUnavailable;
    let feUnAvailable = _this.dataset.feUnavailable;
    const feAvailable = _this.dataset.feAvailable;
    if (orderTotal == 0) {
      if (emptyUnavailable) {
        _this.innerHTML = emptyUnavailable.replace(
          "[amount]",
          formatMoney(
            min_by_currency,
            themeGlobalVariables.settings.money_format
          )
        );
      }
    } else {
      const message = _this.querySelector(".progress-bar-message");
      if (!message) return;
      if (orderTotal >= min_by_currency) {
        message.innerHTML = feAvailable;
        _this.classList.add("free-shipping");
      } else {
        _this.classList.remove("free-shipping");
        if (!feUnAvailable) return;
        feUnAvailable = feUnAvailable.replace(
          "[amount]",
          '<span class="price heading-color">[amount]</span>'
        );
        message.innerHTML =
          feUnAvailable.replace(
            "[amount]",
            formatMoney(
              min_by_currency - orderTotal,
              themeGlobalVariables.settings.money_format
            )
          );
      }
    }
  }
}

export function importCss(href) {
  if (!href || document.querySelector(`link[href="${href}"]`)) {
    return;
  }

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}
