(function (__wpcc) {
  __wpcc.d = __wpcc.d || {};
  __wpcc.d.scope = {};
  __wpcc.d.createTemplateTagFirstArg = function (a) {
    return (a.raw = a);
  };
  __wpcc.d.createTemplateTagFirstArgWithRaw = function (a, b) {
    a.raw = b;
    return a;
  };
  __wpcc.d.getGlobal = function (a) {
    a = [
      "object" == typeof globalThis && globalThis,
      a,
      "object" == typeof window && window,
      "object" == typeof self && self,
      "object" == typeof global && global,
    ];
    for (var b = 0; b < a.length; ++b) {
      var c = a[b];
      if (c && c.Math == Math) return c;
    }
    throw Error("Cannot find global object");
  };
  __wpcc.d.global = __wpcc.d.getGlobal(this);
  var g;
  "undefined" === typeof g && (g = function () {});
  g.p = "";
}).call(this || window, (window.__wpcc = window.__wpcc || {}));

(function (__wpcc) {
  var r = function (a) {
      return h
        ? a instanceof HTMLElement
        : a &&
            "object" === typeof a &&
            null !== a &&
            1 === a.nodeType &&
            "string" === typeof a.nodeName;
    },
    t = function (a, b) {
      b.forEach(function (c) {
        a.classList.add(c);
      });
    },
    u = function (a, b) {
      b.forEach(function (c) {
        a.classList.remove(c);
      });
    },
    x = function () {
      throw Error("Missing parameter");
    },
    y = function (a) {
      this.isShowing = !1;
      var b = void 0 === a.namespace ? null : a.namespace,
        c = void 0 === a.zoomFactor ? x() : a.zoomFactor;
      a = void 0 === a.containerEl ? x() : a.containerEl;
      this.settings = { namespace: b, zoomFactor: c, containerEl: a };
      this.openClasses = this._buildClasses("open");
      this._buildElement();
    },
    z = function (a) {
      a = void 0 === a ? {} : a;
      this._show = this._show.bind(this);
      this._hide = this._hide.bind(this);
      this._handleEntry = this._handleEntry.bind(this);
      this._handleMovement = this._handleMovement.bind(this);
      var b = void 0 === a.el ? x() : a.el,
        c = void 0 === a.zoomPane ? x() : a.zoomPane,
        e = void 0 === a.sourceAttribute ? x() : a.sourceAttribute,
        f = void 0 === a.handleTouch ? x() : a.handleTouch,
        q = void 0 === a.onShow ? null : a.onShow,
        k = void 0 === a.onHide ? null : a.onHide,
        v = void 0 === a.hoverDelay ? 0 : a.hoverDelay,
        w = void 0 === a.touchDelay ? 0 : a.touchDelay,
        l = void 0 === a.hoverBoundingBox ? x() : a.hoverBoundingBox,
        m = void 0 === a.touchBoundingBox ? x() : a.touchBoundingBox,
        n = void 0 === a.namespace ? null : a.namespace,
        p = void 0 === a.zoomFactor ? x() : a.zoomFactor,
        B = void 0 === a.boundingBoxContainer ? x() : a.boundingBoxContainer,
        D = void 0 === a.triggerImage ? null : a.triggerImage;
      this.settings = {
        el: b,
        zoomPane: c,
        sourceAttribute: e,
        handleTouch: f,
        onShow: q,
        onHide: k,
        hoverDelay: v,
        touchDelay: w,
        hoverBoundingBox: l,
        touchBoundingBox: m,
        namespace: n,
        zoomFactor: p,
        boundingBoxContainer: B,
        triggerImage: D,
        passive: void 0 === a.passive ? !1 : a.passive,
      };
      if (this.settings.hoverBoundingBox || this.settings.touchBoundingBox)
        this.boundingBox = new y({
          namespace: this.settings.namespace,
          zoomFactor: this.settings.zoomFactor,
          containerEl: this.settings.boundingBoxContainer,
        });
      this.enabled = !0;
      this._bindEvents();
    },
    A = function (a) {
      a = void 0 === a ? {} : a;
      this.HAS_ANIMATION = !1;
      if ("undefined" !== typeof document) {
        var b = document.createElement("div").style;
        this.HAS_ANIMATION = "animation" in b || "webkitAnimation" in b;
      }
      this._completeShow = this._completeShow.bind(this);
      this._completeHide = this._completeHide.bind(this);
      this._completeZoomOutShow = this._completeZoomOutShow.bind(this);
      this._completeZoomOutHide = this._completeZoomOutHide.bind(this);
      this._handleLoad = this._handleLoad.bind(this);
      this.isShowing = !1;
      this._onHideComplete = null;
      b = void 0 === a.container ? null : a.container;
      var c = void 0 === a.zoomFactor ? x() : a.zoomFactor,
        e = void 0 === a.inline ? x() : a.inline,
        f = void 0 === a.namespace ? null : a.namespace,
        q = void 0 === a.showWhitespaceAtEdges ? x() : a.showWhitespaceAtEdges,
        k = void 0 === a.containInline ? x() : a.containInline,
        l = void 0 === a.zoomMode ? "zoom_inner" : a.zoomMode,
        m = void 0 === a.paneSide ? "right" : a.paneSide;
      this.settings = {
        container: b,
        zoomFactor: c,
        inline: e,
        namespace: f,
        showWhitespaceAtEdges: q,
        containInline: k,
        zoomMode: l,
        paneSide: m,
        inlineOffsetX: void 0 === a.inlineOffsetX ? 0 : a.inlineOffsetX,
        inlineOffsetY: void 0 === a.inlineOffsetY ? 0 : a.inlineOffsetY,
        inlineContainer:
          void 0 === a.inlineContainer ? document.body : a.inlineContainer,
      };
      this.openClasses = this._buildClasses("open");
      this.openingClasses = this._buildClasses("opening");
      this.closingClasses = this._buildClasses("closing");
      this.inlineClasses = this._buildClasses("inline");
      this.loadingClasses = this._buildClasses("loading");
      this.zoomOutOpeningClasses = this._buildClasses("zoom-out-opening");
      this.zoomOutClosingClasses = this._buildClasses("zoom-out-closing");
      this._buildElement();
    },
    C = function (a, b) {
      b = void 0 === b ? {} : b;
      this.VERSION = "1.5.1";
      this.triggerEl = a;
      this.destroy = this.destroy.bind(this);
      if (!r(this.triggerEl))
        throw new TypeError(
          "`new Drift` requires a DOM element as its first argument."
        );
      a = b.namespace || null;
      var c = b.showWhitespaceAtEdges || !1,
        e = b.containInline || !1,
        f = b.inlineOffsetX || 0,
        q = b.inlineOffsetY || 0,
        k = b.inlineContainer || document.body,
        v = b.sourceAttribute || "srcset",
        w = b.zoomFactor || 3,
        l = void 0 === b.paneContainer ? document.body : b.paneContainer,
        m = b.inlinePane || 375,
        n = "handleTouch" in b ? !!b.handleTouch : !0,
        p = b.onShow || null,
        B = b.onHide || null,
        D = "injectBaseStyles" in b ? !!b.injectBaseStyles : !0,
        E = b.hoverDelay || 0,
        F = b.touchDelay || 0,
        G = b.hoverBoundingBox || !1,
        H = b.touchBoundingBox || !1,
        I = b.boundingBoxContainer || document.body,
        J = void 0 === b.zoomMode ? "zoom_inner" : b.zoomMode,
        K = void 0 === b.zoomPaneSide ? "right" : b.zoomPaneSide,
        L = void 0 === b.triggerImage ? null : b.triggerImage;
      b = b.passive || !1;
      if (!0 !== m && !r(l))
        throw new TypeError(
          "`paneContainer` must be a DOM element when `inlinePane !== true`"
        );
      if (!r(k)) throw new TypeError("`inlineContainer` must be a DOM element");
      this.settings = {
        namespace: a,
        showWhitespaceAtEdges: c,
        containInline: e,
        inlineOffsetX: f,
        inlineOffsetY: q,
        inlineContainer: k,
        sourceAttribute: v,
        zoomFactor: w,
        paneContainer: l,
        inlinePane: m,
        handleTouch: n,
        onShow: p,
        onHide: B,
        injectBaseStyles: D,
        hoverDelay: E,
        touchDelay: F,
        hoverBoundingBox: G,
        touchBoundingBox: H,
        boundingBoxContainer: I,
        zoomMode: J,
        zoomPaneSide: K,
        triggerImage: L,
        passive: b,
      };
      this.settings.injectBaseStyles &&
        !document.querySelector(".drift-base-styles") &&
        ((b = document.createElement("style")),
        (b.type = "text/css"),
        b.classList.add("drift-base-styles"),
        b.appendChild(
          document.createTextNode(
            ".drift-bounding-box,.drift-zoom-pane{position:absolute;pointer-events:none}@keyframes noop{0%{zoom:1}}@-webkit-keyframes noop{0%{zoom:1}}.drift-zoom-pane.drift-open{display:block}.drift-zoom-pane.drift-closing,.drift-zoom-pane.drift-opening{animation:noop 1ms;-webkit-animation:noop 1ms}.drift-zoom-pane{overflow:hidden;width:100%;height:100%;top:0;left:0}.drift-zoom-pane-loader{display:none}.drift-zoom-pane img{position:absolute;display:block;top:0;left:0;max-width:none;max-height:none;object-fit: cover;}"
          )
        ),
        (a = document.head),
        a.insertBefore(b, a.firstChild));
      this._buildZoomPane();
      this._buildTrigger();
    },
    h = "object" === typeof HTMLElement;
  y.prototype._buildClasses = function (a) {
    var b = ["drift-" + a],
      c = this.settings.namespace;
    c && b.push(c + "-" + a);
    return b;
  };
  y.prototype._buildElement = function () {
    this.el = document.createElement("div");
    t(this.el, this._buildClasses("bounding-box"));
  };
  y.prototype.show = function (a, b) {
    this.isShowing = !0;
    this.settings.containerEl.appendChild(this.el);
    var c = this.el.style;
    c.width = Math.round(a / this.settings.zoomFactor) + "px";
    c.height = Math.round(b / this.settings.zoomFactor) + "px";
    t(this.el, this.openClasses);
  };
  y.prototype.hide = function () {
    this.isShowing && this.settings.containerEl.removeChild(this.el);
    this.isShowing = !1;
    u(this.el, this.openClasses);
  };
  y.prototype.setPosition = function (a, b, c) {
    var e = window.pageXOffset,
      f = window.pageYOffset;
    a = c.left + a * c.width - this.el.clientWidth / 2 + e;
    b = c.top + b * c.height - this.el.clientHeight / 2 + f;
    a < c.left + e
      ? (a = c.left + e)
      : a + this.el.clientWidth > c.left + c.width + e &&
        (a = c.left + c.width - this.el.clientWidth + e);
    b < c.top + f
      ? (b = c.top + f)
      : b + this.el.clientHeight > c.top + c.height + f &&
        (b = c.top + c.height - this.el.clientHeight + f);
    this.el.style.left = a + "px";
    this.el.style.top = b + "px";
  };
  z.prototype._preventDefault = function (a) {
    a.preventDefault();
  };
  z.prototype._preventDefaultAllowTouchScroll = function (a) {
    (this.settings.touchDelay && this._isTouchEvent(a) && !this.isShowing) ||
      a.preventDefault();
  };
  z.prototype._isTouchEvent = function (a) {
    return !!a.touches;
  };
  z.prototype._bindEvents = function () {
    this.settings.el.addEventListener("mouseenter", this._handleEntry);
    this.settings.el.addEventListener("mouseleave", this._hide);
    this.settings.el.addEventListener("mousemove", this._handleMovement);
    var a = { passive: this.settings.passive };
    this.settings.handleTouch
      ? (this.settings.el.addEventListener("touchstart", this._handleEntry, a),
        this.settings.el.addEventListener("touchend", this._hide),
        this.settings.el.addEventListener("touchmove", this._handleMovement, a))
      : (this.settings.el.addEventListener(
          "touchstart",
          this._preventDefault,
          a
        ),
        this.settings.el.addEventListener("touchend", this._preventDefault),
        this.settings.el.addEventListener(
          "touchmove",
          this._preventDefault,
          a
        ));
  };
  z.prototype._unbindEvents = function () {
    this.settings.el.removeEventListener("mouseenter", this._handleEntry);
    this.settings.el.removeEventListener("mouseleave", this._hide);
    this.settings.el.removeEventListener("mousemove", this._handleMovement);
    this.settings.handleTouch
      ? (this.settings.el.removeEventListener("touchstart", this._handleEntry),
        this.settings.el.removeEventListener("touchend", this._hide),
        this.settings.el.removeEventListener("touchmove", this._handleMovement))
      : (this.settings.el.removeEventListener(
          "touchstart",
          this._preventDefault
        ),
        this.settings.el.removeEventListener("touchend", this._preventDefault),
        this.settings.el.removeEventListener(
          "touchmove",
          this._preventDefault
        ));
  };
  z.prototype._handleEntry = function (a) {
    this._preventDefaultAllowTouchScroll(a);
    this._lastMovement = a;
    "mouseenter" == a.type && this.settings.hoverDelay
      ? (this.entryTimeout = setTimeout(this._show, this.settings.hoverDelay))
      : this.settings.touchDelay
      ? (this.entryTimeout = setTimeout(this._show, this.settings.touchDelay))
      : this._show();
  };
  z.prototype._show = function () {
    if (this.enabled) {
      var a = __wpcc.d.global,
        b = a.__purityActiveDriftTrigger;
      b && b !== this && b._hide();
      a.__purityActiveDriftTrigger = this;
      a = this.settings.onShow;
      a && "function" === typeof a && a();
      this.settings.zoomPane.show(
        this.settings.el.getAttribute(this.settings.sourceAttribute),
        this.settings.el.clientWidth,
        this.settings.el.clientHeight
      );
      this._lastMovement &&
        (((a = this._lastMovement.touches) && this.settings.touchBoundingBox) ||
          (!a && this.settings.hoverBoundingBox)) &&
        this.boundingBox.show(
          this.settings.zoomPane.el.clientWidth,
          this.settings.zoomPane.el.clientHeight
        );
      this._handleMovement();
    }
  };
  z.prototype._hide = function (a) {
    var b = this,
      c = __wpcc.d.global,
      e =
        a &&
        "mouseleave" === a.type &&
        "zoom_out" === this.settings.zoomPane.settings.zoomMode,
      f = function () {
        c.__purityActiveDriftTrigger === b && (c.__purityActiveDriftTrigger = null);
      };
    a && this._preventDefaultAllowTouchScroll(a);
    this._lastMovement = null;
    this.entryTimeout && clearTimeout(this.entryTimeout);
    this.boundingBox && this.boundingBox.hide();
    (a = this.settings.onHide) && "function" === typeof a && a();
    e ? this.settings.zoomPane.hide("pointer-leave", f) : (f(), this.settings.zoomPane.hide());
  };
  z.prototype._getTriggerImage = function () {
    if (r(this.settings.triggerImage)) {
      return this.settings.triggerImage;
    }
    return "IMG" === this.settings.el.tagName
      ? this.settings.el
      : this.settings.el.querySelector("img");
  };
  z.prototype._getPointerBoundsRect = function () {
    var a = this._getTriggerImage();
    if (r(a) && "function" === typeof a.getBoundingClientRect) {
      a = a.getBoundingClientRect();
      if (a && 0 < a.width && 0 < a.height) return a;
    }
    return "function" === typeof this.settings.el.getBoundingClientRect
      ? this.settings.el.getBoundingClientRect()
      : null;
  };
  z.prototype._isPointerOutsideRect = function (a, b, c) {
    return !c || a < c.left || a > c.right || b < c.top || b > c.bottom;
  };
  z.prototype._resolveObjectPosition = function (a, b) {
    if ("string" !== typeof a) return 0.5;
    a = a.toLowerCase();
    if ("left" === a || "top" === a) return 0;
    if ("center" === a) return 0.5;
    if ("right" === a || "bottom" === a) return 1;
    if (-1 !== a.indexOf("%")) return parseFloat(a) / 100;
    if (-1 !== a.indexOf("px") && 0 !== b) return parseFloat(a) / b;
    return 0.5;
  };
  z.prototype._getAdjustedPosition = function (a, b, c) {
    var e = this._getTriggerImage();
    if (!r(e)) return { x: a, y: b };
    var f = window.getComputedStyle(e),
      q = e.naturalWidth || parseFloat(e.getAttribute("width")) || 0,
      k = e.naturalHeight || parseFloat(e.getAttribute("height")) || 0;
    if (!q || !k || "cover" !== f.objectFit) return { x: a, y: b };
    var v = Math.max(c.width / q, c.height / k);
    if (!v) return { x: a, y: b };
    var w = q * v,
      l = k * v,
      m = c.width - w,
      n = c.height - l,
      p = f.objectPosition ? f.objectPosition.trim().split(/\s+/) : ["50%", "50%"];
    1 === p.length && p.push("50%");
    var B = this._resolveObjectPosition(p[0], m),
      D = this._resolveObjectPosition(p[1], n),
      E = (a * c.width - m * B) / w,
      F = (b * c.height - n * D) / l;
    return {
      x: Math.max(0, Math.min(1, E)),
      y: Math.max(0, Math.min(1, F)),
    };
  };
  z.prototype._handleMovement = function (a) {
    if (a) this._preventDefaultAllowTouchScroll(a), (this._lastMovement = a);
    else if (this._lastMovement) a = this._lastMovement;
    else return;
    if (a.touches) {
      a = a.touches[0];
      var b = a.clientX;
      var c = a.clientY;
    } else (b = a.clientX), (c = a.clientY);
    var e = b,
      f = c,
      q = this._getPointerBoundsRect();
    if (q && this._isPointerOutsideRect(e, f, q)) {
      this._hide();
      return;
    }
    if (!this.isShowing && !a.touches) {
      this._show();
      return;
    }
    q = this.settings.el.getBoundingClientRect();
    var v = q.width || this.settings.el.clientWidth,
      w = q.height || this.settings.el.clientHeight;
    b = (b - q.left) / v;
    c = (c - q.top) / w;
    var l = this._getAdjustedPosition(b, c, q);
    this.boundingBox && this.boundingBox.setPosition(l.x, l.y, q);
    this.settings.zoomPane.setPosition(l.x, l.y, q);
  };
  __wpcc.d.global.Object.defineProperties(z.prototype, {
    isShowing: {
      configurable: !0,
      enumerable: !0,
      get: function () {
        return this.settings.zoomPane.isShowing;
      },
    },
  });
  A.prototype._buildClasses = function (a) {
    var b = ["drift-" + a],
      c = this.settings.namespace;
    c && b.push(c + "-" + a);
    return b;
  };
  A.prototype._buildElement = function () {
    this.el = document.createElement("div");
    t(this.el, this._buildClasses("zoom-pane"));
    var a = document.createElement("div");
    t(a, this._buildClasses("zoom-pane-loader"));
    this.el.appendChild(a);
    this.imgEl = document.createElement("img");
    this.el.appendChild(this.imgEl);
  };
  A.prototype._setImageURL = function (a) {
    this.imgEl.setAttribute("src", a);
  };
  A.prototype._setImageSize = function (a, b) {
    this.imgEl.style.width = a * this.settings.zoomFactor + "px";
    this.imgEl.style.height = b * this.settings.zoomFactor + "px";
  };
  A.prototype.setPosition = function (a, b, c) {
    var e = this.imgEl.offsetWidth,
      f = this.imgEl.offsetHeight,
      q = this.el.offsetWidth,
      k = this.el.offsetHeight,
      B = this.settings.zoomMode === "zoom_out",
      D = window.pageXOffset,
      E = window.pageYOffset,
      G =
        (document.documentElement && document.documentElement.clientWidth) ||
        window.innerWidth,
      H = this._defaultPaneWidth || q || 500;
    B &&
      ((this._defaultPaneWidth = H),
      (q = Math.max(
        0,
        Math.min(
          H,
          "left" === this.settings.paneSide
            ? c.left - 10
            : G - c.right - 10
        )
      )),
      (k = c.height),
      c.height > (c.height / c.width) * H && (k = (c.height / c.width) * H),
      0 < q && q < H && (k *= q / H));
    var l = q - e,
      m = k - f,
      n = 0 < l,
      p = 0 < m,
      v = q / 2 - e * a,
      w = k / 2 - f * b;
    f = n ? l / 2 : 0;
    e = p ? m / 2 : 0;
    l = n ? l / 2 : l;
    m = p ? m / 2 : m;
    this.el.parentElement === this.settings.inlineContainer &&
      ((p = D),
      (n = E),
      (a = c.left + a * c.width - q / 2 + this.settings.inlineOffsetX + p),
      (b = c.top + b * c.height - k / 2 + this.settings.inlineOffsetY + n),
      this.settings.containInline &&
        (a < c.left + p
          ? (a = c.left + p)
          : a + q > c.left + c.width + p &&
            (B
              ? (a = c.left + p)
              : (a = c.left + c.width - q + p)),
        b < c.top + n ||
        B
          ? (b = c.top + n)
          : b + k > c.top + c.height + n && (b = c.top + c.height - k + n)));
    if (B) {
      var height = c.height;
      var paneLeft,
        paneTop,
        paneStyleLeft,
        paneStyleTop,
        requestedPaneLeft,
        offsetParentRect,
        offsetParentPageLeft,
        offsetParentPageTop;
      height = k;
      requestedPaneLeft =
        this.settings.paneSide === "left"
          ? c.left + D - q - 10
          : c.left + c.width + D + 10;
      paneLeft = requestedPaneLeft;
      if (this.settings.paneSide === "left" && paneLeft < D) {
        paneLeft = D;
      }
      paneTop = b;
      offsetParentRect =
        this.el.offsetParent &&
        "function" === typeof this.el.offsetParent.getBoundingClientRect
          ? this.el.offsetParent.getBoundingClientRect()
          : null;
      offsetParentPageLeft = offsetParentRect ? offsetParentRect.left + D : 0;
      offsetParentPageTop = offsetParentRect ? offsetParentRect.top + E : 0;
      paneStyleLeft = paneLeft - offsetParentPageLeft;
      paneStyleTop = paneTop - offsetParentPageTop;
      (this.el.style.width = q + "px"),
        (this.el.style.left = paneStyleLeft + "px"),
        (this.el.style.top = paneStyleTop + "px"),
        (this.el.style.height = height + "px");
    } else {
      (this.el.style.left = a + "px"), (this.el.style.top = b + "px");
    }
    this.settings.showWhitespaceAtEdges ||
      (v > f ? (v = f) : v < l && (v = l), w > e ? (w = e) : w < m && (w = m));
    this.imgEl.style.transform = "translate(" + v + "px, " + w + "px)";
    this.imgEl.style.webkitTransform = "translate(" + v + "px, " + w + "px)";
  };
  A.prototype._removeListenersAndResetClasses = function () {
    this.el.removeEventListener("animationend", this._completeShow);
    this.el.removeEventListener("animationend", this._completeHide);
    this.el.removeEventListener("webkitAnimationEnd", this._completeShow);
    this.el.removeEventListener("webkitAnimationEnd", this._completeHide);
    this.imgEl.removeEventListener("animationend", this._completeZoomOutShow);
    this.imgEl.removeEventListener("animationend", this._completeZoomOutHide);
    this.imgEl.removeEventListener(
      "webkitAnimationEnd",
      this._completeZoomOutShow
    );
    this.imgEl.removeEventListener(
      "webkitAnimationEnd",
      this._completeZoomOutHide
    );
    u(this.el, this.openClasses);
    u(this.el, this.closingClasses);
    u(this.imgEl, this.zoomOutOpeningClasses);
    u(this.imgEl, this.zoomOutClosingClasses);
  };
  A.prototype.show = function (a, b, c) {
    this._removeListenersAndResetClasses();
    this.isShowing = !0;
    t(this.el, this.openClasses);
    this.imgEl.getAttribute("src") != a &&
      (t(this.el, this.loadingClasses),
      this.imgEl.addEventListener("load", this._handleLoad),
      this._setImageURL(a));
    this._setImageSize(b, c);
    this._isInline ? this._showInline() : this._showInContainer();
    this.HAS_ANIMATION &&
      ("zoom_out" === this.settings.zoomMode
        ? (this.imgEl.addEventListener("animationend", this._completeZoomOutShow),
          this.imgEl.addEventListener(
            "webkitAnimationEnd",
            this._completeZoomOutShow
          ),
          t(this.imgEl, this.zoomOutOpeningClasses))
        : (this.el.addEventListener("animationend", this._completeShow),
          this.el.addEventListener("webkitAnimationEnd", this._completeShow),
          t(this.el, this.openingClasses)));
  };
  A.prototype._showInline = function () {
    this.settings.inlineContainer.appendChild(this.el);
    t(this.el, this.inlineClasses);
  };
  A.prototype._showInContainer = function () {
    this.settings.container.appendChild(this.el);
  };
  A.prototype.hide = function (a, b) {
    this._onHideComplete = "function" === typeof b ? b : null;
    this._removeListenersAndResetClasses();
    this.isShowing = !1;
    if (
      this.HAS_ANIMATION &&
      "zoom_out" === this.settings.zoomMode &&
      "pointer-leave" === a
    ) {
      this.imgEl.addEventListener("animationend", this._completeZoomOutHide);
      this.imgEl.addEventListener(
        "webkitAnimationEnd",
        this._completeZoomOutHide
      );
      t(this.imgEl, this.zoomOutClosingClasses);
      return;
    }
    this.HAS_ANIMATION && "zoom_out" !== this.settings.zoomMode
      ? (this.el.addEventListener("animationend", this._completeHide),
        this.el.addEventListener("webkitAnimationEnd", this._completeHide),
        t(this.el, this.closingClasses))
      : this._completeHide();
  };
  A.prototype._completeShow = function () {
    this.el.removeEventListener("animationend", this._completeShow);
    this.el.removeEventListener("webkitAnimationEnd", this._completeShow);
    u(this.el, this.openingClasses);
  };
  A.prototype._completeZoomOutShow = function () {
    this.imgEl.removeEventListener("animationend", this._completeZoomOutShow);
    this.imgEl.removeEventListener(
      "webkitAnimationEnd",
      this._completeZoomOutShow
    );
    u(this.imgEl, this.zoomOutOpeningClasses);
  };
  A.prototype._completeZoomOutHide = function () {
    this.imgEl.removeEventListener("animationend", this._completeZoomOutHide);
    this.imgEl.removeEventListener(
      "webkitAnimationEnd",
      this._completeZoomOutHide
    );
    u(this.imgEl, this.zoomOutClosingClasses);
    this._completeHide();
  };
  A.prototype._completeHide = function () {
    var a = this._onHideComplete;
    this._onHideComplete = null;
    this.el.removeEventListener("animationend", this._completeHide);
    this.el.removeEventListener("webkitAnimationEnd", this._completeHide);
    u(this.el, this.openClasses);
    u(this.el, this.closingClasses);
    u(this.el, this.inlineClasses);
    u(this.imgEl, this.zoomOutClosingClasses);
    this.el.style.left = "";
    this.el.style.top = "";
    this.el.parentElement === this.settings.container
      ? this.settings.container.removeChild(this.el)
      : this.el.parentElement === this.settings.inlineContainer &&
        this.settings.inlineContainer.removeChild(this.el);
    a && a();
  };
  A.prototype._handleLoad = function () {
    this.imgEl.removeEventListener("load", this._handleLoad);
    u(this.el, this.loadingClasses);
  };
  __wpcc.d.global.Object.defineProperties(A.prototype, {
    _isInline: {
      configurable: !0,
      enumerable: !0,
      get: function () {
        var a = this.settings.inline;
        return !0 === a || ("number" === typeof a && window.innerWidth <= a);
      },
    },
  });
  C.prototype._buildZoomPane = function () {
    this.zoomPane = new A({
      container: this.settings.paneContainer,
      zoomFactor: this.settings.zoomFactor,
      showWhitespaceAtEdges: this.settings.showWhitespaceAtEdges,
      containInline: this.settings.containInline,
      inline: this.settings.inlinePane,
      namespace: this.settings.namespace,
      zoomMode: this.settings.zoomMode,
      paneSide: this.settings.zoomPaneSide,
      inlineOffsetX: this.settings.inlineOffsetX,
      inlineOffsetY: this.settings.inlineOffsetY,
      inlineContainer: this.settings.inlineContainer,
    });
  };
  C.prototype._buildTrigger = function () {
    this.trigger = new z({
      el: this.triggerEl,
      zoomPane: this.zoomPane,
      handleTouch: this.settings.handleTouch,
      onShow: this.settings.onShow,
      onHide: this.settings.onHide,
      sourceAttribute: this.settings.sourceAttribute,
      hoverDelay: this.settings.hoverDelay,
      touchDelay: this.settings.touchDelay,
      hoverBoundingBox: this.settings.hoverBoundingBox,
      touchBoundingBox: this.settings.touchBoundingBox,
      namespace: this.settings.namespace,
      zoomFactor: this.settings.zoomFactor,
      boundingBoxContainer: this.settings.boundingBoxContainer,
      triggerImage: this.settings.triggerImage,
      passive: this.settings.passive,
    });
  };
  C.prototype.setZoomImageURL = function (a) {
    this.zoomPane._setImageURL(a);
  };
  C.prototype.disable = function () {
    this.trigger.enabled = !1;
  };
  C.prototype.enable = function () {
    this.trigger.enabled = !0;
  };
  C.prototype.destroy = function () {
    this.trigger._hide();
    this.trigger._unbindEvents();
  };
  __wpcc.d.global.Object.defineProperties(C.prototype, {
    isShowing: {
      configurable: !0,
      enumerable: !0,
      get: function () {
        return this.zoomPane.isShowing;
      },
    },
    zoomFactor: {
      configurable: !0,
      enumerable: !0,
      get: function () {
        return this.settings.zoomFactor;
      },
      set: function (a) {
        this.settings.zoomFactor = a;
        this.zoomPane.settings.zoomFactor = a;
        this.trigger.settings.zoomFactor = a;
        this.boundingBox.settings.zoomFactor = a;
      },
    },
  });
  Object.defineProperty(C.prototype, "isShowing", {
    get: function () {
      return this.isShowing;
    },
  });
  Object.defineProperty(C.prototype, "zoomFactor", {
    get: function () {
      return this.zoomFactor;
    },
    set: function (a) {
      this.zoomFactor = a;
    },
  });
  C.prototype.setZoomImageURL = C.prototype.setZoomImageURL;
  C.prototype.disable = C.prototype.disable;
  C.prototype.enable = C.prototype.enable;
  C.prototype.destroy = C.prototype.destroy;
  window.Drift = C;
}).call(this || window, (window.__wpcc = window.__wpcc || {}));

//# sourceMappingURL=Drift.min.js.map
