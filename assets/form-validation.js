function debounce(fn, wait) {
  let timeoutId;

  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), wait);
  };
}

function normalizeValue(value) {
  return typeof value === "string" ? value.trim() : value;
}

function validateFieldState(field) {
  const value = normalizeValue(field.value ?? "");
  const tagName = (field.tagName || "").toLowerCase();
  const type = field.type || "";
  const minlength = Number(field.minlength || 0);

  if (field.required) {
    if (type === "checkbox") {
      return { isValid: Boolean(field.checked) };
    }

    if (tagName === "select") {
      return { isValid: value !== "" && value !== "0" };
    }

    if (type === "email") {
      return { isValid: value !== "" && isValidEmail(value) };
    }

    if (type === "tel") {
      return { isValid: value !== "" && isValidPhone(value) };
    }

    if (value === "") {
      return { isValid: false };
    }

    if (minlength > 0) {
      return { isValid: value.length >= minlength };
    }

    return { isValid: true };
  }

  if (value === "") {
    return { isValid: true };
  }

  if (type === "email") {
    return { isValid: isValidEmail(value) };
  }

  if (type === "tel") {
    return { isValid: isValidPhone(value) };
  }

  return { isValid: true };
}

function validateRadioGroupState(radios) {
  const required = radios.some((radio) => radio.required);

  if (!required) {
    return { isValid: true };
  }

  return { isValid: radios.some((radio) => radio.checked) };
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

function isValidPhone(phone) {
  const phoneRegex = /^\+?[0-9\-]*$/;

  if (!phoneRegex.test(phone)) {
    return false;
  }

  const digitCount = phone.replace(/[\+\-]/g, "").length;
  return digitCount >= 8;
}

function isSupportedControl(element) {
  return Boolean(
    element && typeof element.matches === "function" && element.matches("input, textarea, select")
  );
}

function getManagedForm(element) {
  return element?.closest?.("form.form-validation") || null;
}

function getAllFormControls(form) {
  return [...form.querySelectorAll("input, textarea, select")];
}

function getFieldWrapper(field) {
  return field?.closest?.(".field") || field?.closest?.(".form-group") || null;
}

function refreshWrapperState(wrapper) {
  if (!wrapper) {
    return;
  }

  wrapper.classList.toggle("field--with-error", Boolean(wrapper.querySelector(".error-input")));
}

function setControlValidityState(field, isValid) {
  if (!field) {
    return;
  }

  field.classList.toggle("error-input", !isValid);
  field.setAttribute("aria-invalid", isValid ? "false" : "true");
}

function setFieldValidityState(field, isValid) {
  setControlValidityState(field, isValid);
  refreshWrapperState(getFieldWrapper(field));
}

function clearFieldValidityState(field) {
  setFieldValidityState(field, true);
}

function describeField(field) {
  return {
    tagName: field.tagName,
    type: field.type,
    required: field.required,
    checked: field.checked,
    value: field.value,
    minlength: field.getAttribute("minlength") || 0,
  };
}

function isEligibleControl(field) {
  if (!isSupportedControl(field)) {
    return false;
  }

  if (!getManagedForm(field)) {
    return false;
  }

  if (field.disabled || field.classList.contains("no-js-validation")) {
    return false;
  }

  if (field.type === "hidden" || field.closest("[hidden]")) {
    return false;
  }

  if (field.required) {
    return true;
  }

  return field.type === "email" || field.type === "tel";
}

function getEligibleControls(form) {
  return getAllFormControls(form).filter(isEligibleControl);
}

function getRadioGroupFields(field) {
  const form = getManagedForm(field);

  if (!form || field.type !== "radio") {
    return [];
  }

  if (!field.name) {
    return isEligibleControl(field) ? [field] : [];
  }

  return getAllFormControls(form).filter((candidate) => {
    return candidate.type === "radio" && candidate.name === field.name && isEligibleControl(candidate);
  });
}

function validateSingleField(field) {
  const result = validateFieldState(describeField(field));
  setFieldValidityState(field, result.isValid);
  return result;
}

function shouldDeferEmptyRequiredFocusOut(field) {
  if (!field?.required || field.type === "radio" || field.type === "checkbox") {
    return false;
  }

  if (field.classList.contains("error-input")) {
    return false;
  }

  return normalizeValue(field.value ?? "") === "";
}

function validateRadioGroup(field) {
  const radios = getRadioGroupFields(field);

  if (!radios.length) {
    return { isValid: true, field };
  }

  const result = validateRadioGroupState(
    radios.map((radio) => ({ required: radio.required, checked: radio.checked }))
  );

  radios.forEach((radio) => {
    setControlValidityState(radio, result.isValid);
  });

  refreshWrapperState(getFieldWrapper(radios[0]));

  return {
    isValid: result.isValid,
    field: radios[0],
  };
}

function clearInactiveFieldStates(form) {
  getAllFormControls(form).forEach((field) => {
    if (isEligibleControl(field) || field.classList.contains("no-js-validation")) {
      return;
    }

    if (!field.classList.contains("error-input")) {
      return;
    }

    setControlValidityState(field, true);
    refreshWrapperState(getFieldWrapper(field));
  });
}

function validateForm(form) {
  clearInactiveFieldStates(form);

  const controls = getEligibleControls(form);
  const processedRadioNames = new Set();
  let firstInvalidField = null;

  controls.forEach((field, index) => {
    if (field.type === "radio") {
      const radioKey = field.name || `radio-${index}`;

      if (processedRadioNames.has(radioKey)) {
        return;
      }

      processedRadioNames.add(radioKey);

      const result = validateRadioGroup(field);
      if (!result.isValid && !firstInvalidField) {
        firstInvalidField = result.field;
      }

      return;
    }

    const result = validateSingleField(field);
    if (!result.isValid && !firstInvalidField) {
      firstInvalidField = field;
    }
  });

  return {
    isValid: !firstInvalidField,
    firstInvalidField,
  };
}

function validateRequiredInputs(container = document) {
  if (!container) {
    return true;
  }

  if (container.matches?.("form.form-validation")) {
    return validateForm(container).isValid;
  }

  const forms = container.querySelectorAll?.("form.form-validation") || [];
  let isValid = true;

  forms.forEach((form) => {
    if (!validateForm(form).isValid) {
      isValid = false;
    }
  });

  return isValid;
}

function setSubmitButtonLoadingState(form, submitter) {
  const submitButton = submitter || form.querySelector('button[type="submit"]');
  const spinner = submitButton?.querySelector('.icon-load');
  const text = submitButton?.querySelector('.hidden-on-load, .hidden-on-load.transition-short');

  submitButton?.classList.add('loading');
  spinner?.classList.remove('opacity-0', 'pointer-none');
  text?.classList.add('opacity-0');
}

function focusFirstInvalidControl(field) {
  if (!field || typeof field.focus !== "function") {
    return;
  }

  field.focus();

  if (field.type !== "radio" && typeof field.reportValidity === "function") {
    field.reportValidity();
  }
}

function handleFieldInput(event) {
  const field = event.target;

  if (!isSupportedControl(field)) {
    return;
  }

  const form = getManagedForm(field);
  if (!form) {
    return;
  }

  clearInactiveFieldStates(form);

  if (field.type === "radio" || field.type === "checkbox" || field.tagName.toLowerCase() === "select") {
    return;
  }

  if (!isEligibleControl(field)) {
    clearFieldValidityState(field);
    return;
  }

  validateSingleField(field);
}

function handleFieldChange(event) {
  const field = event.target;

  if (!isSupportedControl(field)) {
    return;
  }

  const form = getManagedForm(field);
  if (!form) {
    return;
  }

  clearInactiveFieldStates(form);

  if (field.type === "radio") {
    validateRadioGroup(field);
    return;
  }

  if (!isEligibleControl(field)) {
    clearFieldValidityState(field);
    return;
  }

  validateSingleField(field);
}

function handleFieldFocusIn(event) {
  const field = event.target;

  if (!isSupportedControl(field) || !field.classList.contains("error-input")) {
    return;
  }

  const form = getManagedForm(field);
  if (!form) {
    return;
  }

  clearInactiveFieldStates(form);

  if (field.type === "radio") {
    validateRadioGroup(field);
    return;
  }

  if (!isEligibleControl(field)) {
    clearFieldValidityState(field);
    return;
  }

  validateSingleField(field);
}

function handleFieldFocusOut(event) {
  const field = event.target;

  if (!isSupportedControl(field)) {
    return;
  }

  const form = getManagedForm(field);
  if (!form) {
    return;
  }

  clearInactiveFieldStates(form);

  if (field.type === "radio") {
    validateRadioGroup(field);
    return;
  }

  if (!isEligibleControl(field)) {
    clearFieldValidityState(field);
    return;
  }

  if (shouldDeferEmptyRequiredFocusOut(field)) {
    clearFieldValidityState(field);
    return;
  }

  validateSingleField(field);
}

function syncInvalidStateFromNative(event) {
  const field = event.target;

  if (!isSupportedControl(field)) {
    return;
  }

  const form = getManagedForm(field);
  if (!form) {
    return;
  }

  clearInactiveFieldStates(form);

  if (field.type === "radio") {
    validateRadioGroup(field);
    return;
  }

  if (!isEligibleControl(field)) {
    return;
  }

  validateSingleField(field);
}

function handleFormSubmit(event) {
  const form = event.target;

  if (!form.matches?.("form.form-validation, form.form-password-page")) {
    return;
  }

  const result = form.matches?.("form.form-validation")
    ? validateForm(form)
    : { isValid: true, firstInvalidField: null };

  if (!result.isValid) {
    event.preventDefault();
    event.stopPropagation();
    focusFirstInvalidControl(result.firstInvalidField);
    return;
  }

  // product-form manages its own loading/finally lifecycle
  if (form.matches?.('[data-type="add-to-cart-form"]')) {
    return;
  }

  setSubmitButtonLoadingState(form, event.submitter);
}

function initFormValidation() {
  document.addEventListener("invalid", syncInvalidStateFromNative, true);
  document.addEventListener("submit", handleFormSubmit, true);
  document.addEventListener("input", debounce(handleFieldInput, 300));
  document.addEventListener("change", handleFieldChange);
  document.addEventListener("focusin", handleFieldFocusIn);
  document.addEventListener("focusout", handleFieldFocusOut);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFormValidation);
  } else {
    initFormValidation();
  }
}
