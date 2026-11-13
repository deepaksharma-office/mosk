if (!customElements.get("section-selected")) {
  customElements.define(
    "section-selected",
    class SectionSelected extends HTMLElement {
      constructor() {
        super();
        this.titleSelect = this.querySelector(".title-select");
        this.titleSelectText = this.querySelector(".title-select__text");
        this.titleList = this.querySelector(".title-list");
        this.titleItems = this.querySelectorAll(".title-item");
        this.collectionSelect = this.querySelector(".collection-select");
        this.collectionSelectText = this.querySelector(
          ".collection-select__text",
        );
        this.titleGroups = this.querySelectorAll(".title-group");
        this.collectionList = this.querySelector(".collection-list");
        this.collectionItems = this.querySelectorAll(".collection-item");
        this.collectionGroups = this.querySelectorAll(".collection-group");

        this.firstButton = this.querySelector(".btn-change-url");

        this.init();
      }

      init() {
        this.setupAccessibility();

        if (this.titleGroups.length > 0) {
          const firstTitleGroup = this.titleGroups[0];
          const firstTitleItem = firstTitleGroup.querySelector(".title-item");
          if (firstTitleItem) {
            firstTitleGroup.classList.add("active");
            this.selectTitle(firstTitleItem, false);
          }
        }

        if (this.collectionItems.length > 0) {
          const firstCollectionItem = this.collectionItems[0];
          firstCollectionItem.classList.add("active");
          this.selectCollection(firstCollectionItem, false);
        }

        if (this.titleSelectText) {
          this.titleSelectText.addEventListener("click", () =>
            this.handleTitleToggle(),
          );
          this.titleSelectText.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              this.handleTitleToggle();
            }
          });
        }

        if (this.collectionSelectText) {
          this.collectionSelectText.addEventListener("click", () =>
            this.handleCollectionToggle(),
          );
          this.collectionSelectText.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              this.handleCollectionToggle();
            }
          });
        }

        this.titleItems.forEach((item, index) => {
          item.setAttribute("tabindex", "0");
          item.setAttribute("id", `title-item-${index}`);

          item.addEventListener("click", () => this.selectTitle(item));
          item.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              this.selectTitle(item);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              const nextItem = this.titleItems[index + 1] || this.titleItems[0];
              nextItem.focus();
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              const prevItem =
                this.titleItems[index - 1] ||
                this.titleItems[this.titleItems.length - 1];
              prevItem.focus();
            } else if (e.key === "Escape") {
              e.preventDefault();
              this.closeDropdown(this.titleList);
              this.titleSelectText.focus();
            }
          });
        });

        this.collectionItems.forEach((item, index) => {
          item.setAttribute("tabindex", "0");
          item.setAttribute("id", `collection-item-${index}`);

          item.addEventListener("click", () => this.selectCollection(item));
          item.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              this.selectCollection(item);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              const visibleItems = Array.from(this.collectionItems).filter(
                (i) => i.closest(".collection-group").style.display !== "none",
              );
              const currentIndex = visibleItems.indexOf(item);
              const nextItem =
                visibleItems[currentIndex + 1] || visibleItems[0];
              nextItem.focus();
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              const visibleItems = Array.from(this.collectionItems).filter(
                (i) => i.closest(".collection-group").style.display !== "none",
              );
              const currentIndex = visibleItems.indexOf(item);
              const prevItem =
                visibleItems[currentIndex - 1] ||
                visibleItems[visibleItems.length - 1];
              prevItem.focus();
            } else if (e.key === "Escape") {
              e.preventDefault();
              this.closeDropdown(this.collectionList);
              this.collectionSelectText.focus();
            }
          });
        });

        document.addEventListener("click", (event) => {
          if (!event.target.closest("select-options")) {
            this.closeAllDropdowns();
          }
        });
        document.addEventListener("keydown", (event) => {
          if (event.key === "Escape") {
            this.closeAllDropdowns();
          }
        });
        window.addEventListener("resize", () => {
          this.checkAllDropdownPositions();
        });
        const viewportWidth = window.innerWidth;
        if (viewportWidth <= 767) {
          this.checkAllDropdownPositions();
        }

        if (this.dataset.layout === "form") {
          this.initForm();
        }
      }

      connectedCallback() {
        if (this.fields) this.bindForm();
      }

      disconnectedCallback() {
        if (!this.formBound) return;
        this.formBound = false;
        this.observer?.disconnect();
        document.removeEventListener("click", this.onDocumentClick);
        document.removeEventListener("shopify:block:select", this.onBlockSelect);
        document.removeEventListener(
          "shopify:block:deselect",
          this.onBlockDeselect,
        );
      }

      bindForm() {
        if (this.formBound) return;
        this.formBound = true;
        document.addEventListener("click", this.onDocumentClick);
        if (window.Shopify?.designMode) {
          document.addEventListener("shopify:block:select", this.onBlockSelect);
          document.addEventListener(
            "shopify:block:deselect",
            this.onBlockDeselect,
          );
        }
        if (this.filtersLoaded || !this.needsFilters) return;
        if ("IntersectionObserver" in window) {
          this.observer = new IntersectionObserver(
            (entries) => {
              if (entries.some((entry) => entry.isIntersecting)) {
                this.observer.disconnect();
                this.loadFilters();
              }
            },
            { rootMargin: "100% 0px" },
          );
          this.observer.observe(this);
        } else {
          this.loadFilters();
        }
      }

      initForm() {
        this.fields = Array.from(this.querySelectorAll(".recommend-form__field"));
        this.baseUrl = this.dataset.baseUrl;
        this.filterFields = this.fields.filter(
          (field) => field.dataset.type === "filter",
        );
        this.requestId = 0;
        this.needsFilters = this.filterFields.length > 0;

        this.fields.forEach((field) => {
          const trigger = field.querySelector(".recommend-form__trigger");
          const list = field.querySelector(".recommend-form__list");
          trigger.addEventListener("click", () => this.toggleField(field));
          trigger.addEventListener("keydown", (e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              this.openField(field, true);
            } else if (e.key === "Escape") {
              this.closeField(field, false);
            }
          });
          list.addEventListener("click", (e) => {
            const option = e.target.closest('[role="option"]');
            if (this.loading) return;
            if (option && option.getAttribute("aria-disabled") !== "true") {
              this.selectOption(field, option);
            }
          });
          list.addEventListener("keydown", (e) =>
            this.handleOptionKeydown(field, e),
          );
        });

        this.onDocumentClick = (e) => {
          if (!this.contains(e.target)) this.closeFields();
        };
        this.onBlockSelect = (e) => {
          const field = this.fields.find(
            (item) => item.dataset.blockId === e.detail.blockId,
          );
          if (field) this.openField(field, false);
        };
        this.onBlockDeselect = (e) => {
          const field = this.fields.find(
            (item) => item.dataset.blockId === e.detail.blockId,
          );
          if (field) this.closeField(field, false);
        };
        this.bindForm();
        this.updateUrl();
      }

      getTrigger(field) {
        return field.querySelector(".recommend-form__trigger");
      }

      getList(field) {
        return field.querySelector(".recommend-form__list");
      }

      getListbox(field) {
        return field.querySelector('[role="listbox"]');
      }

      setSelected(option, selected) {
        option.setAttribute("aria-selected", selected ? "true" : "false");
        option.classList.toggle("active", selected);
      }

      getSelected(field) {
        return field.querySelector('[role="option"][aria-selected="true"]');
      }

      getOptions(field) {
        return Array.from(
          this.getList(field).querySelectorAll('[role="option"]'),
        ).filter((option) => option.getAttribute("aria-disabled") !== "true");
      }

      toggleField(field) {
        if (this.getTrigger(field).getAttribute("aria-expanded") === "true") {
          this.closeField(field, false);
        } else {
          this.openField(field, true);
        }
      }

      openField(field, focusOption) {
        this.closeFields(field);
        this.getTrigger(field).setAttribute("aria-expanded", "true");
        this.getList(field).classList.add("active");
        if (focusOption) {
          setTimeout(() => {
            const option = this.getSelected(field) || this.getOptions(field)[0];
            option?.focus();
          }, 100);
        }
      }

      closeField(field, focusTrigger) {
        const trigger = this.getTrigger(field);
        trigger.setAttribute("aria-expanded", "false");
        this.getList(field).classList.remove("active");
        if (focusTrigger) trigger.focus();
      }

      closeFields(except) {
        this.fields.forEach((field) => {
          if (field !== except) this.closeField(field, false);
        });
      }

      handleOptionKeydown(field, e) {
        const options = this.getOptions(field);
        const index = options.indexOf(document.activeElement);
        let next = null;
        if (e.key === "ArrowDown") {
          next = options[index + 1] || options[0];
        } else if (e.key === "ArrowUp") {
          next = options[index - 1] || options[options.length - 1];
        } else if (e.key === "Home") {
          next = options[0];
        } else if (e.key === "End") {
          next = options[options.length - 1];
        } else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (options[index] && !this.loading) {
            this.selectOption(field, options[index]);
          }
          return;
        } else if (e.key === "Escape") {
          e.preventDefault();
          this.closeField(field, true);
          return;
        } else if (e.key === "Tab") {
          this.closeField(field, false);
          return;
        }
        if (next) {
          e.preventDefault();
          next.focus();
        }
      }

      selectOption(field, option) {
        const wasSelected = option.getAttribute("aria-selected") === "true";
        this.getList(field)
          .querySelectorAll('[role="option"]')
          .forEach((item) => this.setSelected(item, false));
        if (wasSelected) {
          this.resetField(field);
        } else {
          this.setSelected(option, true);
          field.classList.add("is-selected");
          field.querySelector(".recommend-form__value").textContent =
            option.textContent.trim();
        }
        this.closeField(field, true);
        if (this.needsFilters) {
          this.loadFilters();
        } else {
          this.updateUrl();
        }
      }

      resetField(field) {
        const value = field.querySelector(".recommend-form__value");
        field.classList.remove("is-selected");
        value.textContent = value.dataset.placeholder;
      }

      getBaseUrl() {
        return this.baseUrl;
      }

      getParams() {
        const params = new URLSearchParams();
        this.filterFields.forEach((field) => {
          const option = this.getSelected(field);
          if (option && !field.hidden) {
            params.append(option.dataset.param, option.dataset.value);
          }
        });
        return params;
      }

      updateUrl() {
        if (!this.firstButton) return;
        const params = this.getParams().toString();
        this.firstButton.href = this.getBaseUrl() + (params ? `?${params}` : "");
      }

      async loadFilters() {
        const requestId = ++this.requestId;
        const params = this.getParams();
        params.set("section_id", "recommended-collection-filters");
        this.setBusy(true);
        this.updateUrl();
        try {
          const response = await fetch(`${this.getBaseUrl()}?${params}`);
          if (!response.ok) throw new Error(response.status);
          const html = await response.text();
          if (requestId !== this.requestId) return;
          const root = new DOMParser()
            .parseFromString(html, "text/html")
            .querySelector("[data-recommend-filters]");
          if (!root) throw new Error("Missing recommended collection filters");
          const filters = Array.from(
            root.querySelectorAll("[data-filter-label]"),
          );
          this.filtersLoaded = true;
          const reset = this.filterFields
            .map((field) => this.renderFilter(field, filters))
            .some(Boolean);
          if (reset) {
            this.loadFilters();
            return;
          }
        } catch (error) {
          if (requestId !== this.requestId) return;
          this.filterFields.forEach((field) => {
            const status = this.getList(field).querySelector("[data-status]");
            status.textContent = this.dataset.loadError;
            status.hidden = false;
          });
        }
        this.setBusy(false);
        this.updateUrl();
      }

      setBusy(busy) {
        this.loading = busy;
        this.filterFields.forEach((field) => {
          this.getListbox(field).setAttribute("aria-busy", busy ? "true" : "false");
          if (busy && !this.getListbox(field).querySelector('[role="option"]')) {
            const status = this.getList(field).querySelector("[data-status]");
            status.textContent = this.dataset.loading;
            status.hidden = false;
          }
        });
      }

      renderFilter(field, filters) {
        const names = field.dataset.filterName
          .split(";")
          .map((name) => name.trim().toLowerCase())
          .filter(Boolean);
        const filter = filters.find((item) =>
          names.includes(item.dataset.filterLabel.trim().toLowerCase()),
        );
        const list = this.getList(field);
        const listbox = this.getListbox(field);
        const status = list.querySelector("[data-status]");
        const template = list.querySelector("template[data-option-template]");
        const selectedValue = this.getSelected(field)?.dataset.value;
        const focusedValue = listbox.contains(document.activeElement)
          ? document.activeElement.dataset.value
          : null;
        listbox
          .querySelectorAll('[role="option"]')
          .forEach((item) => item.remove());

        if (!filter || !filter.children.length) {
          this.resetField(field);
          if (this.dataset.designMode) {
            status.textContent = filter?.dataset.unsupported
              ? this.dataset.unsupported
              : this.dataset.notFound;
            status.hidden = false;
            field.hidden = false;
          } else {
            field.hidden = true;
          }
          if (focusedValue !== null) this.closeField(field, true);
          return Boolean(selectedValue);
        }

        field.hidden = false;
        status.hidden = true;
        let keepSelected = false;
        Array.from(filter.children).forEach((value) => {
          const option = template.content.firstElementChild.cloneNode(true);
          const isSelected = value.dataset.value === selectedValue;
          option.textContent = value.textContent.trim();
          option.dataset.value = value.dataset.value;
          option.dataset.param = filter.dataset.param;
          if (isSelected) {
            this.setSelected(option, true);
            keepSelected = true;
          } else if (value.dataset.count === "0") {
            option.setAttribute("aria-disabled", "true");
          }
          listbox.appendChild(option);
          if (value.dataset.value === focusedValue) option.focus();
        });
        if (focusedValue !== null && !listbox.contains(document.activeElement)) {
          this.getTrigger(field).focus();
        }
        if (selectedValue && !keepSelected) {
          this.resetField(field);
          return true;
        }
        return false;
      }

      checkAllDropdownPositions() {
        document.querySelectorAll(".collection-group").forEach((group) => {
          if (group.style.display !== "none") {
            this.checkDropdownPosition(group);
          }
        });
        this.checkDropdownPosition(this.titleList);
      }

      setupAccessibility() {
        if (this.titleSelect) {
          this.titleSelectText.setAttribute("tabindex", "0");
        }

        if (this.collectionSelect) {
          this.collectionSelectText.setAttribute("tabindex", "0");
        }
      }

      handleTitleToggle() {
        this.toggleDropdown(this.titleList);
        if (this.collectionList?.classList.contains("active")) {
          this.closeDropdown(this.collectionList);
        }
      }

      handleCollectionToggle() {
        this.toggleDropdown(this.collectionList);
        if (this.titleList?.classList.contains("active")) {
          this.closeDropdown(this.titleList);
        }
      }

      selectTitle(item, shouldFocus = true) {
        const blockId = item.getAttribute("data-block-id");
        const title = item.textContent.trim();

        this.titleGroups.forEach((group) => {
          const groupItem = group.querySelector(".title-item");
          if (
            groupItem &&
            groupItem.getAttribute("data-block-id") === blockId
          ) {
            group.classList.add("active");
          } else {
            group.classList.remove("active");
          }
        });

        this.titleSelectText.textContent = title;
        this.titleSelectText.appendChild(this.createSvgIcon());
        this.collectionGroups.forEach((group) => {
          if (group.id === blockId) {
            group.style.display = "flex";
            const firstCollectionItem = group.querySelector(".collection-item");
            if (firstCollectionItem) {
              const collectionTitle = firstCollectionItem.textContent.trim();
              const collectionUrl =
                firstCollectionItem.getAttribute("data-url");

              this.collectionSelectText.textContent = collectionTitle;
              this.collectionSelectText.appendChild(this.createSvgIcon());
              this.collectionSelectText.setAttribute("data-url", collectionUrl);
              if (this.firstButton && collectionUrl) {
                this.firstButton.href = collectionUrl;
              }
              this.collectionItems.forEach((item) =>
                item.classList.remove("active"),
              );
              firstCollectionItem.classList.add("active");
            }
          } else {
            group.style.display = "none";
          }
        });

        this.closeDropdown(this.titleList);
        if (shouldFocus) {
          this.titleSelectText.focus();
        }
      }

      createSvgIcon() {
        const svg = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg",
        );
        svg.setAttribute("width", "13");
        svg.setAttribute("height", "7");
        svg.setAttribute("viewBox", "0 0 13 7");
        svg.style.setProperty("--width", "1.3rem");
        svg.classList.add(
          "icon",
          "icon-down",
          "icon-rotate",
          "transition-drawer",
          "w-custom",
          "flex-auto",
        );
        const use = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "use",
        );
        use.setAttribute("href", "#icon-arrow-down-mb");
        svg.appendChild(use);
        return svg;
      }

      selectCollection(item, shouldFocus = true) {
        const title = item.textContent.trim();
        const url = item.getAttribute("data-url");

        this.collectionItems.forEach((i) => i.classList.remove("active"));
        item.classList.add("active");

        this.collectionSelectText.textContent = title;
        this.collectionSelectText.appendChild(this.createSvgIcon());
        this.collectionSelectText.setAttribute("data-url", url);

        if (this.firstButton && url) {
          this.firstButton.href = url;
        }

        this.closeDropdown(this.collectionList);
        if (shouldFocus) {
          this.collectionSelectText.focus();
        }
      }

      toggleDropdown(dropdown) {
        const isExpanded = dropdown?.classList.toggle("active");
        if (dropdown === this.titleList) {
          if (isExpanded) {
            this.titleSelect?.classList.add("active");
            this.checkDropdownPosition(dropdown);
            setTimeout(() => {
              const firstItem = dropdown.querySelector(".title-item");
              if (firstItem) firstItem.focus();
            }, 100);
          } else {
            this.titleSelect?.classList.remove("active");
          }
        } else if (dropdown === this.collectionList) {
          if (isExpanded) {
            this.collectionSelect?.classList.add("active");
            this.checkDropdownPosition(dropdown);
            setTimeout(() => {
              const visibleGroup = Array.from(this.collectionGroups).find(
                (g) => g.style.display !== "none",
              );
              if (visibleGroup) {
                const firstItem =
                  visibleGroup.querySelector(".collection-item");
                if (firstItem) firstItem.focus();
              }
            }, 100);
          } else {
            this.collectionSelect?.classList.remove("active");
          }
        }
      }

      checkDropdownPosition(dropdown) {
        if (!dropdown) return;

        const viewportWidth = screen.width;
        const parentDropdown = dropdown.closest(".collection-list");
        
        dropdown.classList.remove(
          "dropdown-right",
          "dropdown-left",
          "dropdown-mobile",
        );

        if (viewportWidth <= 767) {
          dropdown.classList.add("dropdown-mobile");
          const dropdownRect = dropdown.getBoundingClientRect();

          if (dropdownRect.right > viewportWidth) {
            dropdown.classList.add("dropdown-right");
            if (parentDropdown != null) {
              parentDropdown.classList.add("dropdown-right");
            }
          }

          if (dropdownRect.left < 0) {
            dropdown.classList.add("dropdown-left");
            if (parentDropdown != null) {
              parentDropdown.classList.add("dropdown-left");
            }
          }
        } else {
          this.removeClassPosition(dropdown);
          if (parentDropdown != null) {
            this.removeClassPosition(parentDropdown);
          }
        }
      }

      closeDropdown(dropdown) {
        if (!dropdown) return;
        dropdown.classList.remove("active");
        if (dropdown === this.titleList) {
          this.titleSelect?.classList.remove("active");
        } else if (dropdown === this.collectionList) {
          this.collectionSelect?.classList.remove("active");
        }
      }

      removeClassPosition(dropdown) {
        if (!dropdown) return;

        dropdown.classList.remove(
          "dropdown-right",
          "dropdown-left",
          "dropdown-mobile",
        );
      }

      closeAllDropdowns() {
        this.closeDropdown(this.titleList);
        this.closeDropdown(this.collectionList);
      }
    },
  );
}
