import { LazyLoader } from "@NextSkyTheme/lazy-load";
import * as NextSkyTheme from "@NextSkyTheme/global";
import { CustomElement } from "@NextSkyTheme/safari-element-patch";
import { eventModal } from "@NextSkyTheme/modal";

let cachedPriceInputFormatConfig = null;
let cachedPriceInputFormatString = null;

function extractFormattedNumericValue(value) {
  return String(value || "")
    .replace(/[^\d,.' ]/g, "")
    .trim()
    .replace(/\s{2,}/g, " ");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getPriceInputFormatConfig() {
  const moneyFormat = String(window.cartStrings?.money_format || "{{ amount }}");

  if (
    cachedPriceInputFormatConfig &&
    cachedPriceInputFormatString === moneyFormat
  ) {
    return cachedPriceInputFormatConfig;
  }

  const baseSample = extractFormattedNumericValue(
    NextSkyTheme.formatMoney(100, moneyFormat)
  );
  const largeSample = extractFormattedNumericValue(
    NextSkyTheme.formatMoney(123456789, moneyFormat)
  );

  let precision = 0;
  let decimal = ".";
  let thousands = ",";

  const decimalMatch = baseSample.match(/([,.' ])(\d+)$/);
  if (decimalMatch) {
    decimal = decimalMatch[1];
    precision = decimalMatch[2].length;
  }

  let integerSample = largeSample;
  if (precision > 0) {
    integerSample = largeSample.replace(
      new RegExp(`${escapeRegExp(decimal)}\\d{${precision}}$`),
      ""
    );
  }

  const thousandsMatch = integerSample.match(/[,.' ]/);
  if (thousandsMatch) {
    thousands = thousandsMatch[0];
  }

  cachedPriceInputFormatString = moneyFormat;
  cachedPriceInputFormatConfig = {
    precision,
    thousands,
    decimal,
  };

  return cachedPriceInputFormatConfig;
}

function parsePriceInputValue(value) {
  const { precision, thousands, decimal } = getPriceInputFormatConfig();
  const sanitizedValue = String(value || "")
    .trim()
    .replace(/[\s']/g, "")
    .replace(/[^\d,.]/g, "");

  if (!sanitizedValue) {
    return {
      displayValue: "",
      normalizedValue: "",
    };
  }

  let decimalSeparator = "";
  if (sanitizedValue.includes(",") && sanitizedValue.includes(".")) {
    decimalSeparator =
      sanitizedValue.lastIndexOf(",") > sanitizedValue.lastIndexOf(".")
        ? ","
        : ".";
  } else if (precision > 0 && sanitizedValue.includes(decimal)) {
    decimalSeparator = decimal;
  }

  let integerPart = sanitizedValue;
  let fractionPart = "";
  let hasTrailingDecimal = false;

  if (decimalSeparator) {
    const separatorIndex = sanitizedValue.lastIndexOf(decimalSeparator);
    integerPart = sanitizedValue.slice(0, separatorIndex);
    fractionPart = sanitizedValue.slice(separatorIndex + 1).replace(/\D/g, "");
    hasTrailingDecimal = sanitizedValue.endsWith(decimalSeparator);
  }

  integerPart = integerPart.replace(/\D/g, "").replace(/^0+(?=\d)/, "");

  if (integerPart === "") {
    integerPart = "0";
  }

  if (precision === 0) {
    fractionPart = "";
    hasTrailingDecimal = false;
  } else if (fractionPart.length > precision) {
    fractionPart = fractionPart.slice(0, precision);
  }

  const groupedIntegerPart = integerPart.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    thousands
  );

  let displayValue = groupedIntegerPart;
  if (hasTrailingDecimal) {
    displayValue = `${groupedIntegerPart}${decimal}`;
  } else if (fractionPart !== "") {
    displayValue = `${groupedIntegerPart}${decimal}${fractionPart}`;
  }

  let normalizedValue = integerPart;
  if (fractionPart !== "") {
    normalizedValue = `${integerPart}.${fractionPart}`;
  }

  return {
    displayValue,
    normalizedValue,
  };
}

function formatNormalizedPriceInputValue(value) {
  if (value == null || value === "") return "";

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "";

  return extractFormattedNumericValue(
    NextSkyTheme.formatMoney(
      Math.round(numericValue * 100),
      window.cartStrings?.money_format
    )
  );
}

function normalizePriceInputValue(value) {
  return parsePriceInputValue(value).normalizedValue;
}

function getPriceRangeInputs(root) {
  if (!root) return {};

  return {
    minDisplayInput: root.querySelector('[data-price-input="min-display"]'),
    maxDisplayInput: root.querySelector('[data-price-input="max-display"]'),
    minValueInput: root.querySelector('[data-price-input="min-value"]'),
    maxValueInput: root.querySelector('[data-price-input="max-value"]'),
  };
}

function setPriceInputValue(displayInput, hiddenInput, value, formatValue = false) {
  if (!displayInput || !hiddenInput) return;

  const normalizedValue = normalizePriceInputValue(value);
  hiddenInput.value = normalizedValue;
  displayInput.value =
    formatValue && normalizedValue !== ""
      ? formatNormalizedPriceInputValue(normalizedValue)
      : normalizedValue;
}

class FacetFiltersForm extends HTMLElement {
  constructor() {
    super();
    this.onActiveFilterClick = this.onActiveFilterClick.bind(this);
    this.debouncedOnSubmit = NextSkyTheme.debounce((event) => {
      this.onSubmitHandler(event);
    }, 500);

    const facetForm = this.querySelector("form");
    if (facetForm) {
      facetForm.addEventListener("input", this.debouncedOnSubmit.bind(this));
    }
  }

  static setListeners() {
    const onHistoryChange = (event) => {
      const searchParams = event.state
        ? event.state.searchParams
        : FacetFiltersForm.searchParamsInitial;
      if (searchParams === FacetFiltersForm.searchParamsPrev) return;
      FacetFiltersForm.renderPage(searchParams, null, false);
    };
    window.addEventListener("popstate", onHistoryChange);
  }

  static toggleActiveFacets(disable = true) {
    document.querySelectorAll(".js-facet-remove").forEach((element) => {
      element.classList.toggle("disabled", disable);
    });
  }

  static renderPage(searchParams, event, updateURLHash = true) {
    FacetFiltersForm.searchParamsPrev = searchParams;
    const sections = FacetFiltersForm.getSections();
    sections.forEach((section) => {
      const url = `${window.location.pathname}?section_id=${section.section}&${searchParams}`;
      const filterDataUrl = (element) => element.url === url;
      FacetFiltersForm.filterData.some(filterDataUrl)
        ? FacetFiltersForm.renderSectionFromCache(filterDataUrl, event)
        : FacetFiltersForm.renderSectionFromFetch(url, event);
    });

    if (updateURLHash) FacetFiltersForm.updateURLHash(searchParams);
  }

  static clearLoading() {
    document
      .getElementById("ProductsGridContainer")
      ?.classList.remove("loading");
    NextSkyTheme.getBody().classList.remove("loading");
  }

  static renderSectionFromFetch(url, event) {
    document.getElementById("ProductsGridContainer").classList.add("loading");
    NextSkyTheme.getBody().classList.add("loading");
    const scrollIntoView = document.querySelector("#ProductsGridContainer");
    let offsetHeight = 0;
    if (scrollIntoView.querySelector(".collection-steps")) {
      offsetHeight =
        scrollIntoView.querySelector(".collection-steps").offsetHeight + 150;
    }
    window.scrollTo({
      top:
        scrollIntoView.getBoundingClientRect().top +
        window.scrollY -
        110 +
        offsetHeight,
      behavior: "smooth",
    });
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Facets request failed: ${response.status}`);
        }
        return response.text();
      })
      .then((responseText) => {
        const html = responseText;
        FacetFiltersForm.filterData = [
          ...FacetFiltersForm.filterData,
          { html, url },
        ];
        const htmlRender = new DOMParser().parseFromString(html, "text/html");
        FacetFiltersForm.renderFilters(htmlRender, event);
        FacetFiltersForm.renderProductContainer(htmlRender);
        FacetFiltersForm.renderProductCount(htmlRender);
        new LazyLoader(".image-lazy-load");
      })
      .catch((error) => {
        console.error("Facets fetch error:", error);
      })
      .finally(() => {
        FacetFiltersForm.clearLoading();
      });
  }

  static renderSectionFromCache(filterDataUrl, event) {
    document.getElementById("ProductsGridContainer").classList.add("loading");
    NextSkyTheme.getBody().classList.remove("loading");
    const scrollIntoView = document.querySelector("#ProductsGridContainer");
    let offsetHeight = 0;
    if (scrollIntoView.querySelector(".collection-steps")) {
      offsetHeight =
        scrollIntoView.querySelector(".collection-steps").offsetHeight + 150;
    }
    window.scrollTo({
      top:
        scrollIntoView.getBoundingClientRect().top +
        window.scrollY -
        110 +
        offsetHeight,
      behavior: "smooth",
    });
    const html = FacetFiltersForm.filterData.find(filterDataUrl).html;
    const htmlRender = new DOMParser().parseFromString(html, "text/html");
    FacetFiltersForm.renderFilters(htmlRender, event);
    FacetFiltersForm.renderProductContainer(htmlRender);
    FacetFiltersForm.renderProductCount(htmlRender);
    new LazyLoader(".image-lazy-load");
  }

  static renderProductContainer(htmlRender) {
    const collectionEmpty = htmlRender.querySelector(
      ".collection__gird .collection--empty"
    );
    if (collectionEmpty) {
      document.getElementById("CollectionGird").innerHTML =
        htmlRender.getElementById("CollectionGird").innerHTML;
    } else {
      document.getElementById("CollectionGird").innerHTML =
        htmlRender.getElementById("CollectionGird").innerHTML;
    }
  }

  static renderProductCount(htmlRender) {
    const updateContent = (blockClass) => {
      if (blockClass == "facet-drawer") {
        if (
          window.innerWidth < 1025 ||
          !document.querySelector("#FacetFiltersForm")
        ) {
          return;
        }
      }
      const source = htmlRender.querySelector(`.${blockClass}`);
      const destination = document.querySelector(`.${blockClass}`);
      if (source && destination) {
        destination.innerHTML = source.innerHTML;
      }
    };

    const blocksToUpdate = [
      "collection-count",
      "facets-filters-active",
      "facets-filters-drawer-active",
      "select-sort.facet-filters",
      "drawer-sort.facet-filters",
      "pagination-load-more",
      "facet-drawer",
    ];
    blocksToUpdate.forEach(updateContent);
  }

  static renderFilters(htmlRender, event) {
    const facetDetailsElements = htmlRender.querySelectorAll(
      "#FacetFiltersForm .js-filter, #FacetFiltersFormDrawer .js-filter"
    );
    const matchesIndex = (element) => {
      const jsFilter = event ? event.target.closest(".js-filter") : undefined;
      return jsFilter
        ? element.dataset.index === jsFilter.dataset.index
        : false;
    };
    const facetsToRender = Array.from(facetDetailsElements).filter(
      (element) => !matchesIndex(element)
    );

    const countsToRender = Array.from(facetDetailsElements).find(matchesIndex);
    facetsToRender.forEach((element) => {
      if (
        document.querySelector(
          `.js-filter[data-index="${element.dataset.index}"]`
        )
      ) {
        document.querySelector(
          `.js-filter[data-index="${element.dataset.index}"]`
        ).innerHTML = element.innerHTML;
      }
    });

    if (
      htmlRender.querySelector(".js-filter-apply") &&
      document.querySelector(".js-filter-apply")
    ) {
      document.querySelector(".js-filter-apply").innerHTML =
        htmlRender.querySelector(".js-filter-apply").innerHTML;
    }

    if (
      htmlRender.querySelector(".js-filter-facet") &&
      document.querySelector(".js-filter-facet")
    ) {
      document.querySelector(".js-filter-facet").innerHTML =
        htmlRender.querySelector(".js-filter-facet").innerHTML;
    }

    FacetFiltersForm.renderActiveFacets(htmlRender);

    if (countsToRender)
      FacetFiltersForm.renderCounts(
        countsToRender,
        event.target.closest(".js-filter")
      );
    FacetFiltersForm.clearLoading();
  }

  static renderActiveFacets(html) {
    FacetFiltersForm.toggleActiveFacets(false);
  }

  static renderCounts(source, target) {
    const targetElement = target.querySelector(".facets__selected");
    const sourceElement = source.querySelector(".facets__selected");

    const targetElementAccessibility = target.querySelector(".facets__summary");
    const sourceElementAccessibility = source.querySelector(".facets__summary");

    if (sourceElement && targetElement) {
      target.querySelector(".facets__selected").outerHTML =
        source.querySelector(".facets__selected").outerHTML;
    }

    if (targetElementAccessibility && sourceElementAccessibility) {
      target.querySelector(".facets__summary").outerHTML =
        source.querySelector(".facets__summary").outerHTML;
    }
  }

  static updateURLHash(searchParams) {
    history.pushState(
      { searchParams },
      "",
      `${window.location.pathname}${searchParams && "?".concat(searchParams)}`
    );
  }

  static getSections() {
    return [
      {
        section: document.getElementById("product-grid").dataset.id,
      },
    ];
  }

  createSearchParams(form) {
    const formData = new FormData(form);
    const filteredFormData = new FormData();
    for (let [key, value] of formData.entries()) {
      filteredFormData.append(key, value);
    }
    return new URLSearchParams(filteredFormData).toString();
  }

  onSubmitForm(searchParams, event) {
    FacetFiltersForm.renderPage(searchParams, event);
  }

  onSubmitHandler(event) {
    event.preventDefault();
    if (event.target.matches('[data-price-input$="-display"]')) {
      return;
    }
    if (event.target.classList.contains("max-price")) {
      const priceRangeElement = event.target.closest("price-range");
      const { minValueInput, maxValueInput } = getPriceRangeInputs(
        priceRangeElement
      );
      const minValue = Number(minValueInput?.value || 0);
      const maxValue = Number(maxValueInput?.value || 0);
      const rangeMaxValue = Number(
        event.target.dataset.maxValue || priceRangeElement?.dataset.rangeMax || 0
      );
      if (maxValue <= minValue || maxValue > rangeMaxValue) {
        return;
      }
    }
    const sortFilterForms = document.querySelectorAll(
      "facet-filters-form form"
    );
    const targetForm = event.target.closest("form");
    const forms = [];
    const isFiltersForm = targetForm.id === "FacetFiltersForm";
    sortFilterForms.forEach((form) => {
      if (isFiltersForm) {
        if (form.id === "FacetSortForm" || form.id === "FacetFiltersForm") {
          forms.push(this.createSearchParams(form));
        }
      } else {
        if (
          form.id === "FacetSortForm" ||
          form.id === "FacetFiltersFormDrawer"
        ) {
          forms.push(this.createSearchParams(form));
        }
      }
    });
    this.onSubmitForm(forms.join("&"), event);
  }

  facetApplyFilter(event) {
    event.preventDefault();
    const drawer = document.querySelector("facet-drawer");
    const forms = [];
    const sortFilterForms = document.querySelectorAll(
      "facet-filters-form form"
    );
    sortFilterForms.forEach((form) => {
      if (form.id === "FacetSortForm" || form.id === "FacetFiltersFormDrawer") {
        forms.push(this.createSearchParams(form));
      }
    });
    this.onSubmitForm(forms.join("&"), event);
    eventModal(drawer, "close");
  }

  onActiveFilterClick(event) {
    event.preventDefault();
    FacetFiltersForm.toggleActiveFacets();
    const url =
      event.currentTarget.href.indexOf("?") == -1
        ? ""
        : event.currentTarget.href.slice(
            event.currentTarget.href.indexOf("?") + 1
          );
    FacetFiltersForm.renderPage(url);
  }
}

FacetFiltersForm.filterData = [];
FacetFiltersForm.searchParamsInitial = window.location.search.slice(1);
FacetFiltersForm.searchParamsPrev = window.location.search.slice(1);
customElements.define("facet-filters-form", FacetFiltersForm);
FacetFiltersForm.setListeners();

class PriceRangeDrag extends HTMLElement {
  constructor() {
    super();
    this.adjustToValidValues();
  }
  countPercentMin(value) {
    const rangemax = this.dataset?.rangeMax;
    if (!rangemax || rangemax === 0) return;
    let from = 0;
    if (value || rangemax !== 0) {
      from = (value / rangemax) * 100;
    }
    this.style.setProperty("--range-from", from + "%");
    if (Number(from) > Number(this.getValue("--range-to", this))) {
      this.style.setProperty("--range-to", from + "%");
    }
  }
  countPercentMax(value) {
    const rangemax = this.dataset?.rangeMax;
    if (!rangemax || rangemax === 0) return;
    let to = 0;
    if (value || rangemax !== 0) {
      to = (value / rangemax) * 100;
    }
    this.style.setProperty("--range-to", to + "%");
    if (Number(this.getValue("--range-from", this)) > Number(to)) {
      this.style.setProperty("--range-from", to + "%");
    }
  }
  getValue(value, priceDrag) {
    var computedStyle = getComputedStyle(priceDrag);
    var fromValue = computedStyle.getPropertyValue(value);
    return fromValue.replace("%", "");
  }

  adjustToValidValues() {
    const _this = this;
    var inputRange = this.querySelectorAll("input");
    const priceRange = this.closest("action-filter")?.querySelector("price-range");
    const { minDisplayInput, maxDisplayInput, minValueInput, maxValueInput } =
      getPriceRangeInputs(priceRange);
    var rangeInput = inputRange[0];
    var rangeInput2 = inputRange[1];
    if (
      !rangeInput ||
      !rangeInput2 ||
      !minDisplayInput ||
      !maxDisplayInput ||
      !minValueInput ||
      !maxValueInput
    ) {
      return;
    }

    rangeInput.addEventListener("input", function () {
      let nextMinValue = rangeInput.value;
      let nextMaxValue = rangeInput2.value;

      if (Number(nextMinValue) > Number(nextMaxValue)) {
        nextMaxValue = nextMinValue;
        rangeInput2.value = nextMinValue;
      }

      setPriceInputValue(minDisplayInput, minValueInput, nextMinValue, true);
      setPriceInputValue(maxDisplayInput, maxValueInput, nextMaxValue, true);
      _this.countPercentMin(Number(nextMinValue));
    });

    rangeInput2.addEventListener("input", function () {
      let nextMinValue = rangeInput.value;
      let nextMaxValue = rangeInput2.value;

      if (Number(nextMaxValue) < Number(nextMinValue)) {
        nextMinValue = nextMaxValue;
        rangeInput.value = nextMaxValue;
      }

      setPriceInputValue(minDisplayInput, minValueInput, nextMinValue, true);
      setPriceInputValue(maxDisplayInput, maxValueInput, nextMaxValue, true);
      _this.countPercentMax(Number(nextMaxValue));
    });
  }
}
customElements.define("price-range-drag", PriceRangeDrag);

class PriceRange extends PriceRangeDrag {
  constructor() {
    super();
    this.priceDrag =
      this.closest("action-filter").querySelector("price-range-drag");
  }
  countPercentMin(value) {
    if (!this.priceDrag) return;
    const rangemax = this.priceDrag.dataset?.rangeMax;
    if (!rangemax || rangemax === 0) return;
    let from = 0;
    if (value || rangemax !== 0) {
      from = (value / rangemax) * 100;
    }
    this.priceDrag.style.setProperty("--range-from", from + "%");
    if (Number(from) > Number(this.getValue("--range-to", this.priceDrag))) {
      this.priceDrag.style.setProperty("--range-to", from + "%");
    }
  }
  countPercentMax(value) {
    if (!this.priceDrag) return;
    const rangemax = this.priceDrag.dataset?.rangeMax;
    if (!rangemax || rangemax === 0) return;
    let to = 0;
    if (value || rangemax !== 0) {
      to = (value / rangemax) * 100;
    }
    this.priceDrag.style.setProperty("--range-to", to + "%");
    if (Number(this.getValue("--range-from", this.priceDrag)) > Number(to)) {
      this.priceDrag.style.setProperty("--range-from", to + "%");
    }
  }
  adjustToValidValues() {
    const _this = this;
    const {
      minDisplayInput,
      maxDisplayInput,
      minValueInput,
      maxValueInput,
    } = getPriceRangeInputs(this);
    var inputRange = this.closest("action-filter")?.querySelectorAll(
      "price-range-drag input"
    );
    var rangeInput = inputRange[0];
    var rangeInput2 = inputRange[1];
    if (
      !rangeInput ||
      !rangeInput2 ||
      !minDisplayInput ||
      !maxDisplayInput ||
      !minValueInput ||
      !maxValueInput
    ) {
      return;
    }

    minDisplayInput.addEventListener("keydown", function (event) {
      if (event.key === "e" || event.key === "+" || event.key === "-")
        event.preventDefault();
    });
    minDisplayInput.addEventListener("input", function () {
      const parsedMinValue = parsePriceInputValue(minDisplayInput.value);

      minDisplayInput.value = parsedMinValue.displayValue;
      minValueInput.value = parsedMinValue.normalizedValue;

      if (parsedMinValue.normalizedValue !== "") {
        const nextMinValue = Math.min(
          Number(parsedMinValue.normalizedValue),
          Number(rangeInput.max)
        );
        rangeInput.value = nextMinValue;
        _this.countPercentMin(nextMinValue);
      }
    });
    maxDisplayInput.addEventListener("keydown", function (event) {
      if (event.key === "e" || event.key === "+" || event.key === "-")
        event.preventDefault();
    });
    maxDisplayInput.addEventListener("input", function () {
      const parsedMaxValue = parsePriceInputValue(maxDisplayInput.value);

      maxDisplayInput.value = parsedMaxValue.displayValue;
      maxValueInput.value = parsedMaxValue.normalizedValue;

      if (parsedMaxValue.normalizedValue !== "") {
        const nextMaxValue = Math.min(
          Number(parsedMaxValue.normalizedValue),
          Number(rangeInput2.max)
        );
        rangeInput2.value = nextMaxValue;
        _this.countPercentMax(nextMaxValue);
      }
    });

    const commitPriceInputs = () => {
      const minAllowed = Number(minDisplayInput.dataset.minValue || 0);
      const maxAllowed = Number(maxDisplayInput.dataset.maxValue || 0);

      let committedMinValue = normalizePriceInputValue(minDisplayInput.value);
      if (committedMinValue === "" || Number(committedMinValue) < minAllowed) {
        committedMinValue = String(minAllowed);
      }
      if (Number(committedMinValue) > maxAllowed) {
        committedMinValue = String(maxAllowed);
      }

      let committedMaxValue = normalizePriceInputValue(maxDisplayInput.value);
      if (committedMaxValue === "" || Number(committedMaxValue) > maxAllowed) {
        committedMaxValue = String(maxAllowed);
      }
      if (Number(committedMaxValue) <= Number(committedMinValue)) {
        committedMaxValue = String(Number(committedMinValue) + 1);
      }
      if (Number(committedMaxValue) > maxAllowed) {
        committedMaxValue = String(maxAllowed);
      }

      setPriceInputValue(
        minDisplayInput,
        minValueInput,
        committedMinValue,
        true
      );
      setPriceInputValue(
        maxDisplayInput,
        maxValueInput,
        committedMaxValue,
        true
      );

      if (minValueInput.value !== "") {
        rangeInput.value = Number(minValueInput.value);
        _this.countPercentMin(Number(minValueInput.value));
      }
      if (maxValueInput.value !== "") {
        rangeInput2.value = Number(maxValueInput.value);
        _this.countPercentMax(Number(maxValueInput.value));
      }
    };

    this.addEventListener("focusout", () => {
      requestAnimationFrame(() => {
        const activeElement = document.activeElement;
        const priceRangeDrag = this.closest("action-filter")?.querySelector(
          "price-range-drag"
        );

        if (
          this.contains(activeElement) ||
          priceRangeDrag?.contains(activeElement)
        ) {
          return;
        }

        commitPriceInputs();
        maxValueInput.dispatchEvent(new Event("input", { bubbles: true }));
      });
    });
  }
}
customElements.define("price-range", PriceRange);

class FacetRemove extends HTMLElement {
  constructor() {
    super();
    const facetLink = this.querySelector("a");
    facetLink.setAttribute("role", "button");
    facetLink.addEventListener("click", this.closeFilter.bind(this));
    facetLink.addEventListener("keyup", (event) => {
      event.preventDefault();
      if (event.code.toUpperCase() === "SPACE") this.closeFilter(event);
    });
  }

  closeFilter(event) {
    event.preventDefault();
    const form =
      this.closest("facet-filters-form") ||
      document.querySelector("facet-filters-form");
    form.onActiveFilterClick(event);
  }
}
customElements.define("facet-remove", FacetRemove);

class FacetApplyDrawer extends HTMLElement {
  constructor() {
    super();
    const _this = this;
    this.addEventListener("click", this.closeFilter.bind(this));
    this.addEventListener(
      "keypress",
      function (event) {
        if (event.key === "Enter") {
          _this.closeFilter.bind(_this)(event);
        }
      }.bind(_this),
      false
    );
  }

  closeFilter(event) {
    event.preventDefault();
    const drawer = this.closest("facet-drawer");
    if (drawer) {
      eventModal(drawer, "close");
    }
  }
}
customElements.define("facet-apply-drawer", FacetApplyDrawer);

class SelectSorter extends HTMLElement {
  constructor() {
    super();
    this.addEventListener("click", this.activeFilterSort.bind(this), false);
    document.addEventListener(
      "click",
      this.handleClickOutside.bind(this),
      false
    );
    this.addEventListener("keydown", this.handleKeydown.bind(this), false);
  }

  handleKeydown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      this.activeFilterSort();
    } else if (event.key === "Escape") {
      event.preventDefault();
      this.closeDropdown();
    }
  }

  closeDropdown() {
    const selectCustom = this.closest(".select-custom");
    if (selectCustom && selectCustom.classList.contains("active")) {
      selectCustom.classList.remove("active");
      this.updateFilterSortTabindex(false);
    }
  }

  activeFilterSort() {
    const selectCustom = this.closest(".select-custom");
    const isActive = selectCustom.classList.contains("active");
    selectCustom.classList.toggle("active");
    this.updateFilterSortTabindex(!isActive);
  }

  handleClickOutside(event) {
    if (!event.target.closest(".facets-vertical-form")) {
      document.querySelectorAll(".facets-vertical-form").forEach((element) => {
        element.querySelector(".select-custom").classList.remove("active");
        const selectCustom = element.querySelector(".select-custom");
        if (!selectCustom.classList.contains("active")) {
          this.updateFilterSortTabindex(false);
        }
      });
    }
  }

  updateFilterSortTabindex(isActive) {
    const filterSortElements = document.querySelectorAll("filter-sort");
    filterSortElements.forEach((element) => {
      if (isActive) {
        element.setAttribute("tabindex", "0");
      } else {
        element.removeAttribute("tabindex");
      }
    });
  }
}
customElements.define("select-sorter", SelectSorter);

class FilterSort extends FacetFiltersForm {
  constructor() {
    super();
    this.addEventListener("click", this.filterSort.bind(this), false);
    this.addEventListener("keydown", this.handleKeydown.bind(this), false);
  }

  handleKeydown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      this.filterSort(event);
    } else if (event.key === "Escape") {
      event.preventDefault();
      this.closeDropdownAndUpdateTabindex();
    }
  }

  filterSort(event) {
    event?.preventDefault();
    const select = document.querySelector("select.facet-filters__select");
    const value = this.getAttribute("value");
    if (select && value) {
      select.value = value;
      select.dispatchEvent(new Event("input", { bubbles: true }));
    }
    this.closeDropdownAndUpdateTabindex();
  }

  closeDropdownAndUpdateTabindex() {
    const facetFilters = this.closest(".facet-filters");
    if (facetFilters) {
      facetFilters.classList.remove("active");
    }

    this.updateFilterSortTabindex();
    this.focusSelectSorter();
  }

  updateFilterSortTabindex() {
    const filterSortElements = document.querySelectorAll("filter-sort");
    filterSortElements.forEach((element) => {
      element.removeAttribute("tabindex");
    });
  }

  focusSelectSorter() {
    setTimeout(() => {
      const selectSorter =
        this.closest(".facet-filters")?.querySelector("select-sorter");
      if (selectSorter) {
        selectSorter.focus();
      }
    }, 100);
  }
}
customElements.define("filter-sort", FilterSort);

class FacetDrawer extends HTMLElement {
  constructor() {
    super();
    this.FacetsDrawer = document.getElementById("FacetsDrawer");
    this.FacetsDrawer.addEventListener(
      "click",
      this.openDrawer.bind(this),
      false
    );
    this.init();
  }

  init() {
    const drawer = document.querySelector("facet-drawer");
    const layout = this.dataset.layout;
    if (layout == "vertical") {
      let width = window.innerWidth;
      window.addEventListener("resize", () => {
        const newWidth = window.innerWidth;
        if (newWidth > 1024 && width <= 1024) {
          eventModal(drawer, "close");
        }
        width = newWidth;
      });
    }
  }

  openDrawer() {
    NextSkyTheme.getBody().appendChild(this);
    setTimeout(() => {
      this.FacetsDrawer.classList.add("active");
      const drawer = document.querySelector("facet-drawer");
      eventModal(drawer, "open", true, null, false, false);
      NextSkyTheme.global.rootToFocus = this.FacetsDrawer;
    }, 100);
  }
}
customElements.define("facet-drawer", FacetDrawer);

class FacetApplyCanvas extends FacetFiltersForm {
  constructor() {
    super();
    this.addEventListener("click", this.facetApplyFilter.bind(this), false);
  }
}
customElements.define("facet-apply-canvas", FacetApplyCanvas);

class ShowMoreButton extends HTMLButtonElement {
  constructor() {
    super();
    this.init();
  }

  init() {
    this.addEventListener("click", this.ShowMoreFilter.bind(this));
  }

  ShowMoreFilter() {
    const button = this;
    const filterItemElements =
      this.closest(".filter-attribute").querySelectorAll(".hidden-load-more");
    if (button.classList.contains("show-more")) {
      button.classList.remove("show-more");
      button.classList.add("show-less");
      filterItemElements.forEach((element) => {
        element.classList.remove("hidden");
      });
    } else {
      button.classList.add("show-more");
      button.classList.remove("show-less");
      filterItemElements.forEach((element) => {
        element.classList.add("hidden");
      });
    }
  }
}
customElements.define("show-more-button", ShowMoreButton, {
  extends: "button",
});
CustomElement.observeAndPatchCustomElements({
  "show-more-button": {
    tagElement: "button",
    classElement: ShowMoreButton,
  },
});

class LoadMoreProduct extends HTMLElement {
  constructor() {
    super();
    this.addEventListener("click", this.fetchData.bind(this), false);
    this.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        this.fetchData(event);
      }
    });
  }

  connectedCallback() {
    if (this.dataset.pagination == "infinity") {
      Motion.inView(this, this.fetchData.bind(this), {
        margin: "100px 0px -10px 0px",
      });
    }
  }

  fetchData() {
    const currentUrl = window.location.href;
    const param = window.location.search;
    let url = this.dataset.url;
    if (!url) return;
    if (param.length > 0) {
      url = currentUrl + url.replaceAll("?", "&");
    }
    this.classList.add("loading");
    fetch(url)
      .then((response) => response.text())
      .then((html) => {
        const htmlRender = new DOMParser().parseFromString(html, "text/html");
        const resultNodesHtml = htmlRender.querySelectorAll(
          "#product-grid .product-item"
        );
        resultNodesHtml.forEach((prodNode) =>
          document.querySelector("#product-grid").appendChild(prodNode)
        );
        document.querySelector(".pagination-load-more").innerHTML =
          htmlRender.querySelector(".pagination-load-more").innerHTML;
        new LazyLoader(".image-lazy-load");
        document
          .querySelector("#CollectionGird")
          .querySelector("motion-items-effect")
          ?.reloadAnimationEffect();
      })
      .finally(() => {
        this.classList.remove("loading");
      })
      .catch((e) => {
        console.error(e);
      });
  }
}
if (!customElements.get("loadmore-button")) {
  customElements.define("loadmore-button", LoadMoreProduct);
}

class StickyToolbar extends HTMLElement {
  constructor() {
    super();
    this.isSticky = false;
    this.toolbarHeight = 0;
    this.triggerPosition = 0;

    this.init();
    this.bindEvents();
  }

  init() {
    if (window.innerWidth >= 1024.98) {
      return;
    }

    requestAnimationFrame(() => {
      this.toolbarHeight = this.offsetHeight;

      this.calculateTriggerPosition();

      NextSkyTheme.getBody().style.setProperty(
        "--sticky-toolbar-height",
        this.toolbarHeight + "px"
      );

      this.checkInitialStickyState();
    });
  }

  checkInitialStickyState() {
    const attemptCheck = (delay = 0, maxAttempts = 5, currentAttempt = 1) => {
      setTimeout(() => {
        this.calculateTriggerPosition();

        const currentScrollY = window.scrollY;
        if (currentScrollY > this.triggerPosition && !this.isSticky) {
          this.activateSticky();
        } else if (currentAttempt < maxAttempts) {
          attemptCheck(delay * 2 || 50, maxAttempts, currentAttempt + 1);
        }
      }, delay);
    };

    attemptCheck();
  }

  calculateTriggerPosition() {
    const allSections = document.querySelectorAll(".shopify-section");
    let totalHeight = 0;

    let toolbarSection = null;
    for (const section of allSections) {
      if (section.contains(this)) {
        toolbarSection = section;
        break;
      }
    }

    for (const section of allSections) {
      if (section === toolbarSection) {
        if (section.classList.contains("shopify-section-search")) {
          const titleWrapper = section.querySelector(
            ".title-wrapper-with-link"
          );
          if (titleWrapper) {
            totalHeight += titleWrapper.offsetHeight;
          }
        }
        const collectionSteps = section.querySelector(".collection-steps");
        if (collectionSteps) {
          totalHeight += collectionSteps.offsetHeight;
        }
        break;
      }

      const position = section.compareDocumentPosition(this);

      if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
        if (section.classList.contains("shopify-section-search")) {
          const titleWrapper = section.querySelector(
            ".title-wrapper-with-link"
          );
          if (titleWrapper) {
            totalHeight += titleWrapper.offsetHeight;
          }
        } else {
          totalHeight += section.offsetHeight;
        }
        const collectionSteps = section.querySelector(".collection-steps");
        if (collectionSteps) {
          totalHeight += collectionSteps.offsetHeight;
        }
      }
    }

    this.triggerPosition = totalHeight;
  }

  bindEvents() {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          this.onScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", () => {
      this.init();
    });
  }

  onScroll() {
    if (window.innerWidth >= 1024.98) {
      if (this.isSticky) {
        this.deactivateSticky();
      }
      return;
    }

    const currentScrollY = window.scrollY;
    const shouldBeSticky = currentScrollY > this.triggerPosition;

    if (shouldBeSticky && !this.isSticky) {
      this.activateSticky();
    } else if (!shouldBeSticky && this.isSticky) {
      this.deactivateSticky();
    }
  }

  activateSticky() {
    this.isSticky = true;
    NextSkyTheme.getBody().classList.add("has-sticky-toolbar");
    NextSkyTheme.getBody().style.setProperty(
      "--sticky-toolbar-height",
      this.toolbarHeight + "px"
    );
  }

  deactivateSticky() {
    this.isSticky = false;
    NextSkyTheme.getBody().classList.remove("has-sticky-toolbar");
  }
}

customElements.define("sticky-toolbar", StickyToolbar);

class CollapsibleHorizontalRow extends HTMLDetailsElement {
  constructor() {
    super();

    this.summaryElement = null;
    this.contentElement = null;
    this._open = false;

    this.detectClickOutsideListener = this.detectClickOutside.bind(this);
    this.detectEscKeyboardListener = this.detectEscKeyboard.bind(this);
  }

  connectedCallback() {
    this.addEventListener("toggle", (e) => {
      e.stopImmediatePropagation();
    });

    this.init();
  }

  set open(value) {
    const newValue = Boolean(value);
    if (newValue === this._open) return;

    this._open = newValue;

    if (!this.isConnected) {
      newValue ? this.setAttribute("open", "") : this.removeAttribute("open");
      return;
    }

    this.transition(newValue);
  }

  get open() {
    return this._open;
  }

  init() {
    this.summaryElement = this.querySelector("summary");
    this.contentElement = this.querySelector(".collapsible-row__content");
    this.removeAttribute('open');
    if (!this.summaryElement || !this.contentElement) return;

    this._open = this.hasAttribute("open");
    this.summaryElement.addEventListener("click", (event) => {
      event.preventDefault();
      this.open = !this.open;
    });
  }

  async transition(isOpen) {
    if (isOpen) {
      this.setAttribute("open", "");
      this.summaryElement.setAttribute("open", "");
      this.classList.add("detail-open");

      document.addEventListener("click", this.detectClickOutsideListener);
      document.addEventListener("keydown", this.detectEscKeyboardListener);

      await this.fadeInDown();
      this.contentElement.setAttribute("open", "");
    } else {
      this.summaryElement.removeAttribute("open");
      this.contentElement.removeAttribute("open");
      this.classList.remove("detail-open");

      document.removeEventListener("click", this.detectClickOutsideListener);
      document.removeEventListener("keydown", this.detectEscKeyboardListener);

      await this.fadeInUp();
      if (!this._open) this.removeAttribute("open");
    }
  }

  detectClickOutside(event) {
    if (!this.open) return;
    if (this.contains(event.target)) return;

    this.open = false;
  }

  detectEscKeyboard(event) {
    if (event.key === "Escape") {
      this.open = false;
      this.summaryElement.focus({ focusVisible: true });
    }
  }

  fadeInDown() {
    return Motion.animate(
      this.contentElement,
      { opacity: [0, 1] },
      {
        duration: 0.2,
        easing: [0.22, 0.61, 0.36, 1],
      }
    ).finished;
  }

  fadeInUp() {
    return Motion.animate(
      this.contentElement,
      { opacity: [1, 0] },
      { duration: 0.2 }
    ).finished;
  }
}

customElements.define("collapsible-horizontal-row", CollapsibleHorizontalRow, {
  extends: "details",
});

CustomElement.observeAndPatchCustomElements({
  "collapsible-horizontal-row": {
    tagElement: "details",
    classElement: CollapsibleHorizontalRow,
  },
});
