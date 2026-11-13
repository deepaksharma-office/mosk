const NOTIFICATION_TYPES = {
  SUCCESS: "success",
  ERROR: "error",
  WARNING: "warning",
};

const NOTIFICATION_CONFIG = {
  SHOW_DELAY: 10,
  HIDE_DELAY: 300,
  DEFAULT_DURATION: 3000,
};

const ICON_TEMPLATES = {
  [NOTIFICATION_TYPES.SUCCESS]:
    '<svg width="18" height="18" fill="none" class="flex-auto w-18"><use href="#icon-success"></use></svg>',
  [NOTIFICATION_TYPES.ERROR]:
    '<svg width="18" height="18" fill="none" class="flex-auto w-18"><use href="#icon-error"></use></svg>',
  [NOTIFICATION_TYPES.WARNING]:
    '<svg width="18" height="18" fill="none" class="flex-auto w-18"><use href="#icon-warning"></use></svg>',
};

class BaseNotification {
  constructor(containerId, containerClass) {
    this.container = this.getOrCreateContainer(containerId, containerClass);
    this.activeTimeouts = new Map();
  }

  getOrCreateContainer(id, className) {
    let container = id
      ? document.getElementById(id)
      : document.querySelector(`.${className}`);

    if (!container) {
      container = document.createElement("div");
      if (id) container.id = id;
      if (className) container.className = className;
      document.body.appendChild(container);
    }

    return container;
  }

  createIcon(type) {
    const iconContainer = document.createElement("span");
    const iconTemplate =
      ICON_TEMPLATES[type] || ICON_TEMPLATES[NOTIFICATION_TYPES.SUCCESS];
    iconContainer.innerHTML = iconTemplate;
    return iconContainer.firstElementChild;
  }

  createTextElement(message, className) {
    const textElement = document.createElement("span");
    textElement.className = className;
    textElement.innerHTML = message;
    return textElement;
  }

  removeExistingNotification(container, selector) {
    const existing = container.querySelector(selector);
    if (existing) {
      this.clearNotificationTimeouts(existing);
      existing.remove();
    }
  }

  clearNotificationTimeouts(notification) {
    const timeoutIds = this.activeTimeouts.get(notification);
    if (timeoutIds) {
      timeoutIds.forEach(clearTimeout);
      this.activeTimeouts.delete(notification);
    }
  }

  scheduleNotificationLifecycle(notification, container, duration) {
    const showTimeout = setTimeout(() => {
      notification.classList.add("show");
    }, NOTIFICATION_CONFIG.SHOW_DELAY);

    const hideTimeout = setTimeout(() => {
      this.hide(notification, container);
    }, duration);

    this.activeTimeouts.set(notification, [showTimeout, hideTimeout]);
  }

  hide(notification, container = null) {
    if (!notification.parentNode) return;

    this.clearNotificationTimeouts(notification);
    notification.classList.remove("show");
    notification.classList.add("remove");
    setTimeout(() => {
      try {
        const parent = container || this.container;
        if (parent && parent.contains(notification)) {
          parent.removeChild(notification);
        }
      } catch (error) {
        console.warn("Error removing notification:", error);
      }
    }, NOTIFICATION_CONFIG.HIDE_DELAY);
  }

  destroy() {
    this.activeTimeouts.forEach((timeoutIds) => {
      timeoutIds.forEach(clearTimeout);
    });
    this.activeTimeouts.clear();
  }
}

class AlertNotify extends BaseNotification {
  constructor() {
    super("notification-container", null);
  }

  show(
    message,
    type = NOTIFICATION_TYPES.WARNING,
    duration = NOTIFICATION_CONFIG.DEFAULT_DURATION
  ) {
    const notification = this.createNotification(message, type, [
      "notification",
      type,
    ]);
    this.container.appendChild(notification);
    this.scheduleNotificationLifecycle(notification, this.container, duration);
  }

  showElement(
    message,
    element = this.container,
    type = NOTIFICATION_TYPES.WARNING,
    duration = NOTIFICATION_CONFIG.DEFAULT_DURATION
  ) {
    const container =
      element || document.getElementById("notification-container");
    this.removeExistingNotification(container, ".notification");

    const notification = this.createNotificationWithMessage(message, type, [
      "notification",
      "notification-add-cart",
      type,
    ]);
    container.appendChild(notification);
    this.scheduleNotificationLifecycle(notification, container, duration);
  }

  createNotification(message, type, classes) {
    const notification = document.createElement("div");
    notification.classList.add(...classes);

    const icon = this.createIcon(type);
    const text = this.createTextElement(message);

    notification.appendChild(icon);
    notification.appendChild(text);

    return notification;
  }

  createNotificationWithMessage(message, type, classes) {
    const notification = document.createElement("div");
    notification.classList.add(...classes);

    const messageContainer = document.createElement("div");
    messageContainer.className = "notification-message";
    const text = this.createTextElement(message);
    messageContainer.appendChild(text);
    notification.appendChild(messageContainer);

    return notification;
  }
}

class AlertNotifyInline extends BaseNotification {
  constructor() {
    super(null, "notification-wrapper");
  }

  show(
    message,
    type = NOTIFICATION_TYPES.WARNING,
    container = this.container,
    duration = NOTIFICATION_CONFIG.DEFAULT_DURATION
  ) {
    this.removeExistingNotification(container, ".notification_inline");

    const notification = this.createInlineNotification(message, type);
    container.appendChild(notification);
    this.scheduleNotificationLifecycle(notification, container, duration);
  }

  showElement(
    message,
    element = this.container,
    type = NOTIFICATION_TYPES.WARNING,
    duration = NOTIFICATION_CONFIG.DEFAULT_DURATION
  ) {
    this.removeExistingNotification(element, ".notification_inline");

    const notification = this.createInlineNotification(message, type);
    element.appendChild(notification);
    this.scheduleNotificationLifecycle(notification, element, duration);
  }

  createInlineNotification(message, type) {
    const notification = document.createElement("div");
    notification.classList.add("notification_inline", type);

    const icon = this.createIcon(type);
    const text = this.createTextElement(message);

    notification.appendChild(icon);
    notification.appendChild(text);

    return notification;
  }

  hide(notification, element = null) {
    super.hide(notification, element || this.container);
  }
}

export const notifier = new AlertNotify();
export const notifierInline = new AlertNotifyInline();

export { NOTIFICATION_TYPES };
