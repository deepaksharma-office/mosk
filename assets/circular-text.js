// Regrex match symbol " - ", " • "," | ".
const SEPARATOR = /(\s+[^\p{L}\p{N}\s]+\s+)/u;

export class CircularText {
  constructor(sectionId, text, uppercase) {
    this.sectionId = sectionId;
    this.uppercase = uppercase;
    this.text = this.normalizeSeamText(uppercase ? text.toUpperCase() : text);
    this.fontSize = 15;
    this.svg = document.getElementById(`circleSvg-${sectionId}`);
    this.separatorGap = parseFloat(this.svg?.dataset.separatorGap) || 0;
    this.textEl = this.svg?.querySelector("text");
    this.textPath = document.getElementById(`textPath-${sectionId}`);
    this.path = document.getElementById(`circle-${sectionId}`);
  }

  // SVG textPath drops regular trailing spaces, so the loop seam has no gap.
  // Only preserve spacing — do not append extra separator characters.
  normalizeSeamText(text) {
    const nbsp = "\u00A0";
    const value = String(text ?? "").replace(/\u00A0/g, " ").replace(/^\s+/, "").replace(/\s+$/, "");

    return `${value}${nbsp}`;
  }

  getFontSize() {
    if (!this.textEl) return this.fontSize;
    const size = parseFloat(getComputedStyle(this.textEl).fontSize);
    return Number.isFinite(size) && size > 0 ? size : this.fontSize;
  }

  measureTextWidth() {
    if (!this.textPath || !this.path) return 0;

    this.textPath.removeAttribute("textLength");
    this.textPath.removeAttribute("lengthAdjust");
    this.textPath.textContent = this.text;

    // Measure on a long straight path so length is not clipped by a small circle.
    const measureLength = Math.max(this.text.length * this.fontSize * 2, 2000);
    this.path.setAttribute("d", `M 0,0 H ${measureLength}`);

    const svgLength = this.textPath.getComputedTextLength?.() || 0;
    if (svgLength > 0) return svgLength;

    if (!this.textEl) return this.text.length * this.fontSize * 0.55;

    const style = getComputedStyle(this.textEl);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    context.font = `${style.fontWeight || "400"} ${this.fontSize}px ${style.fontFamily || "sans-serif"}`;

    let width = context.measureText(this.text).width;
    const letterSpacing = parseFloat(style.letterSpacing);
    if (Number.isFinite(letterSpacing) && this.text.length > 1) {
      width += letterSpacing * (this.text.length - 1);
    }

    return width;
  }

  layout(textWidth, reserved = 0) {
    const circumference = Math.max(textWidth, this.fontSize);
    const minRadius = parseFloat(this.svg.dataset.minRadius) || 0;
    const radius = Math.max(circumference / (2 * Math.PI), minRadius);
    const padding = this.fontSize * 2;
    const svgSize = radius * 2 + padding;
    const center = svgSize / 2;

    this.svg.setAttribute("width", svgSize);
    this.svg.setAttribute("height", svgSize);
    this.svg.setAttribute("viewBox", `0 0 ${svgSize} ${svgSize}`);

    // Continuous full-circle path so spacing stays even across the seam.
    const pathD = [
      `M ${center} ${center - radius}`,
      `a ${radius} ${radius} 0 1 1 0 ${radius * 2}`,
      `a ${radius} ${radius} 0 1 1 0 ${-radius * 2}`,
    ].join(" ");
    this.path.setAttribute("d", pathD);

    const pathLength = this.path.getTotalLength?.() || circumference;
    this.textPath.setAttribute("startOffset", "0");
    if (reserved > 0) {
      this.textPath.removeAttribute("textLength");
      this.textPath.removeAttribute("lengthAdjust");
      const spare = Math.max(pathLength - textWidth, 0);
      this.textEl.style.letterSpacing = `${spare / this.text.length}px`;
      return;
    }
    this.textPath.setAttribute("textLength", pathLength);
    this.textPath.setAttribute("lengthAdjust", "spacing");
  }

  renderSeparators() {
    const parts = this.text.split(SEPARATOR);
    if (!this.separatorGap || parts.length < 2) return 0;

    const endsWithSeparator = parts[parts.length - 1] === "";
    let gapBefore = endsWithSeparator;
    let gaps = 0;
    this.textPath.textContent = "";
    parts.forEach((part, index) => {
      if (!part) return;
      const isSeparator = index % 2 === 1;
      const span = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
      span.textContent = part;
      if (isSeparator || gapBefore) {
        span.setAttribute("dx", this.separatorGap);
        gaps += 1;
      }
      gapBefore = isSeparator;
      this.textPath.appendChild(span);
    });

    return gaps * this.separatorGap;
  }

  updateSvg() {
    if (!this.svg || !this.path || !this.textPath) return;

    this.fontSize = this.getFontSize();
    if (this.separatorGap && this.textEl) this.textEl.style.letterSpacing = "";
    const textWidth = this.measureTextWidth();
    const separatorSpace = this.renderSeparators();
    this.layout(textWidth + separatorSpace, separatorSpace);
  }

  init() {
    const run = () => this.updateSvg();

    if (document.fonts?.ready) {
      document.fonts.ready.then(run).catch(run);
    } else {
      run();
    }
  }
}
