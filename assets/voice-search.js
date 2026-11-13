class VoiceSearch extends HTMLElement {
  constructor() {
    super();
    this.recognition = null;
    this.active = false;
    this.onToggle = this.onToggle.bind(this);
    this.onModalClosed = this.onModalClosed.bind(this);
    this.syncFilled = this.syncFilled.bind(this);
  }

  connectedCallback() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    this.button = this.querySelector("button");
    this.form = this.closest("form");
    this.input = this.form?.querySelector('input[type="search"]');
    if (!SpeechRecognition || !this.button || !this.input) return;

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = document.documentElement.lang || "en";
    this.bindRecognitionEvents();

    this.button.addEventListener("click", this.onToggle);
    this.input.addEventListener("input", this.syncFilled);
    this.input.addEventListener("focus", this.syncFilled);
    document.addEventListener("modal:closed", this.onModalClosed);
    this.syncFilled();
    this.classList.replace("hidden", "inline-flex");
  }

  disconnectedCallback() {
    this.button?.removeEventListener("click", this.onToggle);
    this.input?.removeEventListener("input", this.syncFilled);
    this.input?.removeEventListener("focus", this.syncFilled);
    document.removeEventListener("modal:closed", this.onModalClosed);
    this.recognition?.abort();
    this.recognition = null;
  }

  bindRecognitionEvents() {
    this.recognition.addEventListener("start", () => {
      this.active = true;
    });
    this.recognition.addEventListener("audiostart", () => {
      this.setListening(true);
    });
    this.recognition.addEventListener("audioend", () => {
      this.setListening(false);
    });
    this.recognition.addEventListener("end", () => {
      this.active = false;
      this.setListening(false);
    });
    this.recognition.addEventListener("error", () => {
      this.setListening(false);
    });
    this.recognition.addEventListener("result", (event) => {
      this.onResult(event);
    });
  }

  onToggle(event) {
    event.preventDefault();
    if (this.active) {
      this.recognition.stop();
      return;
    }
    if (this.hasAttribute("data-focus-input")) {
      this.input.focus();
    }
    try {
      this.recognition.start();
    } catch (error) {
      console.log(error)
    }
  }

  onResult(event) {
    const result = event.results?.[0];
    if (!result) return;
    this.input.value = result[0].transcript;
    this.input.dispatchEvent(new Event("input", { bubbles: true }));
    if (result.isFinal && this.form.hasAttribute("data-voice-submit")) {
      this.form.requestSubmit();
    }
  }

  onModalClosed() {
    if (this.active) {
      this.recognition.abort();
    }
  }

  syncFilled() {
    const filledClass = this.dataset.filledClass;
    if (!filledClass) return;
    this.classList.toggle(filledClass, this.input.value.length > 0);
  }

  setListening(isListening) {
    this.button.classList.toggle("heading-color", !isListening);
    this.button.classList.toggle("grey-color", isListening);
    this.button.setAttribute("aria-pressed", String(isListening));
    this.button.setAttribute(
      "aria-label",
      isListening ? this.dataset.labelStop : this.dataset.labelStart,
    );
  }
}
customElements.define("voice-search", VoiceSearch);
