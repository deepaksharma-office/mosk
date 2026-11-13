import { LazyLoader } from "@NextSkyTheme/lazy-load";

class QuizSection extends HTMLElement {
  connectedCallback() {
    this.currentIndex = 0;
    this.answers = new Map();
    this.initializeStepMetadata();
    this.buildStepper();
    this.bindEvents();

    if (this.hasIntro) {
      this.showIntro();
    } else {
      this.showPanel(0);
    }
  }

  get hasIntro() {
    return this.dataset.enableIntro === "true";
  }

  get showBackButton() {
    return this.dataset.showBackButton === "true";
  }

  get stepper() {
    return this.querySelector("[data-quiz-stepper]");
  }

  buildStepper() {
    const stepper = this.stepper;
    const list = stepper?.querySelector(".quiz__stepper-list");
    if (!stepper || !list || !this.stepPanels.length) {
      if (stepper) stepper.hidden = true;
      return;
    }

    list.replaceChildren();

    this.stepPanels.forEach((panel, index) => {
      const label =
        panel.dataset.stepperLabel?.trim() ||
        panel.querySelector(".quiz__subheading")?.textContent?.trim() ||
        `Step ${index + 1}`;

      const item = document.createElement("li");
      item.className =
        "quiz__stepper-item quiz__stepper-step flex column align-center relative";
      item.dataset.quizStepperStep = String(index + 1);

      const dot = document.createElement("span");
      dot.className = "quiz__stepper-dot rounded-50 border transition";
      dot.setAttribute("aria-hidden", "true");

      const text = document.createElement("span");
      text.className = "quiz__stepper-label fs-small absolute whitespace-nowrap";
      text.textContent = label;

      item.append(dot, text);
      list.append(item);
    });

    stepper.hidden = this.hasIntro;
  }

  setStepperVisible(visible) {
    if (this.stepper) {
      this.stepper.hidden = !visible;
    }
  }

  get panels() {
    return [...this.querySelectorAll("[data-quiz-panel]")];
  }

  get introPanel() {
    return this.querySelector('[data-quiz-panel="intro"]');
  }

  get stepPanels() {
    return this.panels.filter((panel) => panel.dataset.quizPanel === "step");
  }

  get emailPanel() {
    return this.querySelector('[data-quiz-panel="email"]');
  }

  get resultsPanel() {
    return this.querySelector('[data-quiz-panel="results"]');
  }

  initializeStepMetadata() {
    const sectionId = this.dataset.sectionId;

    this.stepPanels.forEach((panel, index) => {
      const stepNumber = index + 1;
      panel.dataset.stepNumber = String(stepNumber);
      panel.dataset.stepKey = panel.dataset.stepKey || `step-${stepNumber}`;
      if (!panel.dataset.questionId) {
        panel.dataset.questionId = `q${stepNumber}`;
      }

      panel.querySelectorAll("[data-quiz-option]").forEach((input) => {
        input.name = `quiz_${sectionId}_step_${stepNumber}`;
      });

      this.updateBackButtonVisibility(panel, stepNumber);
    });
  }

  updateBackButtonVisibility(panel, stepNumber) {
    const backWrap = panel.querySelector("[data-quiz-back-wrap]");
    if (!backWrap) return;
    backWrap.hidden = false;
  }

  bindEvents() {
    this.querySelectorAll("[data-quiz-start]").forEach((button) => {
      button.addEventListener("click", () => {
        this.classList.remove("quiz--intro");
        this.showPanel(0);
      });
    });

    this.querySelectorAll("[data-quiz-retake]").forEach((button) => {
      button.addEventListener("click", () => this.retakeQuiz());
    });

    this.addEventListener("change", (event) => {
      const input = event.target.closest("[data-quiz-option]");
      if (!input || input.type !== "radio") return;

      const panel = input.closest("[data-quiz-panel]");
      if (!panel) return;

      const stepNumber = Number.parseInt(panel.dataset.stepNumber, 10);
      this.clearAnswersFromStep(stepNumber + 1);

      this.answers.set(panel.dataset.stepKey, {
        optionKey: input.value,
        stepNumber: panel.dataset.stepNumber,
        questionId: panel.dataset.questionId?.trim() || "",
        stepperLabel: panel.dataset.stepperLabel?.trim() || "",
        heading:
          panel.querySelector(".quiz__heading")?.textContent?.trim() || "",
        optionLabel:
          input
            .closest("[data-quiz-option-item]")
            ?.querySelector(".quiz__option-label")
            ?.textContent?.trim() || input.value,
        strongIds: this.parseCsv(input.dataset.strongMatch),
        partialIds: this.parseCsv(input.dataset.partialMatch),
        excludeIds: this.parseCsv(input.dataset.excludeProducts),
        skipQuestions: this.parseCsv(input.dataset.skipQuestions),
      });

      this.updateProgress();
      this.updateStepperState();
      this.syncQuizNoteFields();

      window.setTimeout(() => {
        this.goNext();
      }, 280);
    });

    this.querySelectorAll("[data-quiz-back]").forEach((button) => {
      button.addEventListener("click", () => this.goBack());
    });

    this.querySelectorAll("[data-quiz-skip]").forEach((button) => {
      button.addEventListener("click", () => this.showResults());
    });

    const emailInput = this.emailPanel?.querySelector("[data-quiz-email]");
    emailInput?.addEventListener("input", () => {
      this.setEmailFieldError(emailInput, false);
    });

    this.querySelectorAll("[data-quiz-continue]").forEach((button) => {
      button.addEventListener("click", () => {
        void this.handleEmailContinue();
      });
    });
  }

  async handleEmailContinue() {
    const input = this.emailPanel?.querySelector("[data-quiz-email]");
    if (!input) {
      this.showResults();
      return;
    }

    const validation = this.validateQuizEmail(input.value);
    if (!validation.isValid) {
      this.setEmailFieldError(input, true, validation.message);
      input.focus();
      return;
    }

    this.setEmailFieldError(input, false);
    await this.submitQuizEmail(input.value.trim());
    this.showResults();
  }

  getStepNoteKey(answer) {
    if (answer.stepperLabel) return answer.stepperLabel;
    if (answer.heading) return answer.heading;
    if (answer.questionId) return answer.questionId;
    return `Step ${answer.stepNumber}`;
  }

  syncQuizNoteFields() {
    const container = this.emailPanel?.querySelector("[data-quiz-note-fields]");
    if (!container) return;

    container.replaceChildren();

    const sortedAnswers = [...this.answers.values()].sort(
      (left, right) =>
        Number.parseInt(left.stepNumber, 10) -
        Number.parseInt(right.stepNumber, 10),
    );

    sortedAnswers.forEach((answer) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = `contact[note][${this.getStepNoteKey(answer)}]`;
      input.value = answer.optionLabel || answer.optionKey;
      container.append(input);
    });
  }

  async submitQuizEmail(email) {
    this.syncQuizNoteFields();

    const form = this.emailPanel?.querySelector("[data-quiz-email-form]");
    if (!form) return;

    const formData = new FormData(form);
    formData.set("contact[email]", email);

    try {
      await fetch("/contact", {
        method: "POST",
        body: formData,
        headers: {
          Accept: "text/html",
        },
      });
    } catch (error) {
      console.error("Quiz email submit failed", error);
    }
  }

  validateQuizEmail(value) {
    const email = (value || "").trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

    if (!email) {
      return {
        isValid: false,
        message:
          this.dataset.emailRequired || "Please enter your email address.",
      };
    }

    if (!emailPattern.test(email)) {
      return {
        isValid: false,
        message:
          this.dataset.emailInvalid || "Please enter a valid email address.",
      };
    }

    return { isValid: true };
  }

  setEmailFieldError(input, hasError, message = "") {
    if (!input) return;

    const field = input.closest(".field");
    const error = this.emailPanel?.querySelector("[data-quiz-email-error]");
    const errorText = this.emailPanel?.querySelector(
      "[data-quiz-email-error-text]",
    );

    input.classList.toggle("error-input", hasError);
    input.setAttribute("aria-invalid", hasError ? "true" : "false");

    if (field) {
      field.classList.toggle("field--with-error", hasError);
    }

    if (error) {
      error.hidden = !hasError;
    }

    if (errorText) {
      errorText.textContent = hasError ? message : "";
    }
  }

  updateOptionsEmptyState(panel) {
    if (!panel) return;

    const optionCount = panel.querySelectorAll("[data-quiz-option-item]").length;
    const empty = panel.querySelector("[data-quiz-options-empty]");
    if (empty) {
      empty.hidden = optionCount > 0;
    }
  }

  parseCsv(value) {
    return (value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  getSkippedQuestionIds() {
    const skipped = new Set();
    this.answers.forEach((answer) => {
      (answer.skipQuestions || []).forEach((questionId) => {
        skipped.add(questionId.toLowerCase());
      });
    });
    return skipped;
  }

  isPanelSkipped(panel) {
    if (!panel) return false;
    const questionId = (panel.dataset.questionId || "").trim().toLowerCase();
    if (!questionId) return false;
    return this.getSkippedQuestionIds().has(questionId);
  }

  getPreviousStepIndex(fromIndex) {
    let previousIndex = fromIndex - 1;
    while (
      previousIndex >= 0 &&
      this.isPanelSkipped(this.stepPanels[previousIndex])
    ) {
      previousIndex -= 1;
    }
    return previousIndex;
  }

  getNextStepIndex(fromIndex) {
    let nextIndex = fromIndex + 1;
    while (
      nextIndex < this.stepPanels.length &&
      this.isPanelSkipped(this.stepPanels[nextIndex])
    ) {
      nextIndex += 1;
    }
    return nextIndex;
  }

  getFallbackProductIds() {
    const source = this.querySelector("[data-quiz-fallback-ids]");
    if (!source) return [];

    try {
      return JSON.parse(source.textContent).map(String);
    } catch {
      return [];
    }
  }

  collectResultProductIds() {
    const excludeIds = new Set();
    const strongIds = [];
    const partialIds = [];

    this.answers.forEach((answer) => {
      (answer.excludeIds || []).forEach((id) => excludeIds.add(String(id)));
    });

    this.answers.forEach((answer) => {
      (answer.strongIds || []).forEach((id) => {
        const productId = String(id);
        if (!excludeIds.has(productId) && !strongIds.includes(productId)) {
          strongIds.push(productId);
        }
      });
      (answer.partialIds || []).forEach((id) => {
        const productId = String(id);
        if (
          !excludeIds.has(productId) &&
          !strongIds.includes(productId) &&
          !partialIds.includes(productId)
        ) {
          partialIds.push(productId);
        }
      });
    });

    if (strongIds.length || partialIds.length) {
      return [...strongIds, ...partialIds];
    }

    return this.getFallbackProductIds().filter((id) => !excludeIds.has(id));
  }

  async fetchProductCards(productIds) {
    if (!productIds.length) return [];

    const searchUrl = this.dataset.resultsProductsUrl;
    const sectionId = this.dataset.resultsSectionId;
    if (!searchUrl || !sectionId) return [];

    const query = productIds.map((id) => `id:${id}`).join(" OR ");
    const params = new URLSearchParams({
      section_id: sectionId,
      q: query,
      items_per_row: this.dataset.itemsPerRow || "4",
      items_per_row_mobile: this.dataset.itemsPerRowMobile || "2",
      section_width: this.dataset.sectionWidth || "container",
      quiz_section_id: this.dataset.sectionId || "",
    });

    const response = await fetch(`${searchUrl}?${params.toString()}`);
    if (!response.ok) return [];

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const cards = [...doc.querySelectorAll("[data-quiz-product-card]")];
    const cardMap = new Map(
      cards.map((card) => [String(card.dataset.productId), card]),
    );

    return productIds
      .map((id) => cardMap.get(String(id)))
      .filter(Boolean)
      .map((card) => card.cloneNode(true));
  }

  clearAnswersFromStep(fromStepNumber) {
    for (const [key, answer] of [...this.answers.entries()]) {
      if (Number.parseInt(answer.stepNumber, 10) >= fromStepNumber) {
        this.answers.delete(key);
      }
    }

    this.stepPanels.forEach((panel) => {
      if (Number.parseInt(panel.dataset.stepNumber, 10) >= fromStepNumber) {
        panel.querySelectorAll("[data-quiz-option]:checked").forEach((input) => {
          input.checked = false;
        });
      }
    });

    this.syncQuizNoteFields();
  }

  showIntro() {
    this.panels.forEach((panel) => {
      panel.hidden = true;
    });
    if (this.introPanel) {
      this.introPanel.hidden = false;
    }
    this.classList.add("quiz--intro");
    this.classList.remove("quiz--post-quiz");
    this.setStepperVisible(false);
    this.updateProgress();
    this.updateStepperState();
  }

  retakeQuiz() {
    this.answers.clear();
    this.currentIndex = 0;

    this.stepPanels.forEach((panel) => {
      panel.querySelectorAll("[data-quiz-option]:checked").forEach((input) => {
        input.checked = false;
      });
      this.updateOptionsEmptyState(panel);
    });

    this.syncQuizNoteFields();

    if (this.hasIntro) {
      this.showIntro();
      return;
    }

    this.showPanel(0);
  }

  goNext() {
    const totalSteps = this.stepPanels.length;
    const nextIndex = this.getNextStepIndex(this.currentIndex);

    if (nextIndex < totalSteps) {
      this.showPanel(nextIndex);
      return;
    }

    if (this.emailPanel) {
      this.showEmail();
      return;
    }

    this.showResults();
  }

  goBack() {
    if (this.resultsPanel && !this.resultsPanel.hidden) {
      if (this.emailPanel) {
        this.showEmail();
      } else {
        const lastStepIndex = this.getPreviousStepIndex(this.stepPanels.length);
        if (lastStepIndex >= 0) {
          this.showPanel(lastStepIndex);
        }
      }
      return;
    }

    if (this.emailPanel && !this.emailPanel.hidden) {
      const lastStepIndex = this.getPreviousStepIndex(this.stepPanels.length);
      if (lastStepIndex >= 0) {
        this.showPanel(lastStepIndex);
      }
      return;
    }

    if (this.currentIndex > 0) {
      const previousIndex = this.getPreviousStepIndex(this.currentIndex);
      if (previousIndex >= 0) {
        this.showPanel(previousIndex);
      } else if (this.hasIntro) {
        this.showIntro();
      }
      return;
    }

    if (this.hasIntro) {
      this.showIntro();
      return;
    }

    this.classList.remove("quiz--post-quiz");
  }

  showPanel(index) {
    this.currentIndex = index;
    this.panels.forEach((panel) => {
      panel.hidden = true;
    });

    const panel = this.stepPanels[index];
    if (panel) {
      panel.hidden = false;
      this.updateOptionsEmptyState(panel);
    }

    this.classList.remove("quiz--intro", "quiz--post-quiz");
    this.setStepperVisible(true);
    this.updateProgress();
    this.updateStepperState();
  }

  showEmail() {
    this.panels.forEach((panel) => {
      panel.hidden = true;
    });
    if (this.emailPanel) {
      this.emailPanel.hidden = false;
    }
    this.classList.remove("quiz--intro");
    this.classList.add("quiz--post-quiz");
    this.setStepperVisible(false);
    this.updateProgress();
    this.updateStepperState();
  }

  showResults() {
    this.panels.forEach((panel) => {
      panel.hidden = true;
    });
    if (this.resultsPanel) {
      this.resultsPanel.hidden = false;
      this.renderResults();
    }
    this.classList.remove("quiz--intro");
    this.classList.add("quiz--post-quiz");
    this.setStepperVisible(false);
    this.updateProgress();
    this.updateStepperState();
  }

  updateProgress() {
    const progress = this.querySelector("[data-quiz-stepper-progress]");
    if (!progress) return;

    const total = this.stepPanels.length;
    if (!total) return;

    let completed = this.currentIndex;
    if (this.introPanel && !this.introPanel.hidden) {
      completed = -1;
    }
    if (this.emailPanel && !this.emailPanel.hidden) {
      completed = total;
    }
    if (this.resultsPanel && !this.resultsPanel.hidden) {
      completed = total;
    }

    const percent = Math.min(100, (completed / Math.max(total - 1, 1)) * 100);
    progress.style.setProperty("--quiz-progress", `${percent}`);
  }

  updateStepperState() {
    const items = this.querySelectorAll("[data-quiz-stepper-step]");
    items.forEach((item, index) => {
      const isActive = index === this.currentIndex && !this.isPostQuizVisible();
      const isCompleted =
        index < this.currentIndex ||
        (this.isPostQuizVisible() && index < items.length);

      item.classList.toggle("is-active", isActive);
      item.classList.toggle("is-completed", isCompleted && !isActive);
    });
  }

  isPostQuizVisible() {
    return (
      (this.emailPanel && !this.emailPanel.hidden) ||
      (this.resultsPanel && !this.resultsPanel.hidden)
    );
  }

  initResultsLazyImages(grid) {
    if (!grid) return;
    new LazyLoader("[data-quiz-results-grid] .image-lazy-load");
  }

  renderResults() {
    const grid = this.resultsPanel?.querySelector("[data-quiz-results-grid]");
    const loading = this.resultsPanel?.querySelector("[data-quiz-results-loading]");
    const empty = this.resultsPanel?.querySelector("[data-quiz-results-empty]");
    if (!grid) return;

    const limit = Number.parseInt(this.dataset.resultsLimit, 10) || 8;
    const productIds = this.collectResultProductIds().slice(0, limit);

    grid
      .querySelectorAll("[data-quiz-product-card]")
      .forEach((card) => card.remove());

    if (loading) loading.hidden = false;
    if (empty) empty.hidden = true;
    grid.classList.add("is-loading");

    this.fetchProductCards(productIds)
      .then((cards) => {
        cards.forEach((card) => grid.appendChild(card));

        if (empty) {
          empty.hidden = cards.length > 0;
        }

        this.initResultsLazyImages(grid);
      })
      .catch((error) => {
        console.error(error);
        if (empty) empty.hidden = false;
      })
      .finally(() => {
        grid.classList.remove("is-loading");
        if (loading) loading.hidden = true;
      });
  }
}

customElements.define("quiz-section", QuizSection);
