class ShowPassWord extends HTMLElement {
  constructor() {
    super();
    this.input = null;
    this.iconHide = null;
    this.iconView = null;
    this.onClick = this.onClick.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
  }

  connectedCallback() {
    this.input = this.closest('.field')?.querySelector('input');
    this.iconHide = this.querySelector('.icon-hide');
    this.iconView = this.querySelector('.icon-view');

    this.setAttribute('role', 'button');
    this.setAttribute('tabindex', '0');
    this.setAttribute('aria-pressed', 'false');

    this.addEventListener('click', this.onClick);
    this.addEventListener('keydown', this.onKeyDown);
  }

  onClick() {
    if (!this.input) return;
    const isVisible = this.input.type === 'text';
    this.input.type = isVisible ? 'password' : 'text';
    this.classList.toggle('text', !isVisible);
    this.setAttribute('aria-pressed', String(!isVisible));
    if (this.iconHide && this.iconView) {
      this.iconHide.classList.toggle('hidden', !isVisible);
      this.iconView.classList.toggle('hidden', isVisible);
    }
  }

  onKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.onClick();
    }
  }
}

customElements.define('show-pass-word', ShowPassWord);