class StoreLocation extends HTMLElement {
  constructor() {
    super();

    this.autocompleteService = null;
    this.placesService = null;
    this.stores = [];
    this.allowedCountries = null;
    this.debounceTimer = null;
    this.map = null;
    this.markers = [];
    this.userMarker = null;
    this.infoWindow = null;
    this.visibleLimit = 5;
    this.loadStep = 5;
    this.filteredStores = [];
    this.loadMoreBtn = null;
    this.mapId = null;
    this.ripples = [];
    this.markerMap = new Map();
    this.fallbackCenter = { lat: 21.0285, lng: 105.8542 };
    this.radiusKm = Number(this.dataset.radius) || 100;
    this.activeMarker = null;
    this.activeShadow = null;
    this.markerCluster = null;
    this.pinLayerMap = new Map();
  }

  connectedCallback() {
    this.cacheElements();
    this.parseCountries();
    this.parseStoreData();
    this.initGoogleService();
    this.bindEvents();
    this.initMap();
    this.loadAllStores();
  }

  cacheElements() {
    this.input = this.querySelector("#location-input");
    this.suggestionBox = this.querySelector(".location-suggestions");
    this.storeList = this.querySelector(".location-store-list");
    this.template = this.querySelector(".location-template");
    this.detectBtn = this.querySelector(".location-detect-btn");
    this.mapEl = this.querySelector(".location-map");
    this.template = this.querySelector(".location-template");
    this.storeCardTemplate =
      this.template?.content.querySelector(".store-card");
    this.loadMoreTemplate =
      this.template?.content.querySelector(".store-load-more");
    this.loadMoreBtn = null;
  }

  parseCountries() {
    const raw = this.dataset.countries;

    if (!raw) {
      this.allowedCountries = null;
      return;
    }

    const parsed = raw
      .split(",")
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean);

    this.allowedCountries = parsed.length ? parsed : null;
  }

  parseStoreData() {
    const jsonEl = this.querySelector(".dataStoreLocation");
    if (!jsonEl) return;

    try {
      this.stores = JSON.parse(jsonEl.textContent);
      const center = this.getCenterFromStores(this.stores);
      if (center) {
        this.fallbackCenter = center;
      }
    } catch (e) {
      console.error("Invalid store JSON", e);
      this.stores = [];
    }
  }

  initGoogleService() {
    if (!window.google) return;

    this.autocompleteService = new google.maps.places.AutocompleteService();

    this.placesService = new google.maps.places.PlacesService(
      document.createElement("div"),
    );
  }

  getCenterFromStores(stores) {
    if (!stores || !stores.length) return null;

    let latSum = 0;
    let lngSum = 0;

    stores.forEach((store) => {
      latSum += Number(store.lat);
      lngSum += Number(store.lng);
    });

    return {
      lat: latSum / stores.length,
      lng: lngSum / stores.length,
    };
  }

  bindEvents() {
    this.input.addEventListener("input", () => {
      clearTimeout(this.debounceTimer);

      this.debounceTimer = setTimeout(() => {
        this.handleSearch();
      }, 300);
    });

    document.addEventListener("click", (e) => {
      if (!this.contains(e.target)) {
        this.hideSuggestions();
      }
    });

    if (this.detectBtn) {
      this.detectBtn.addEventListener("click", () => {
        this.detectUserLocation();
      });
    }
    this.storeList.addEventListener("click", (e) => {
      if (
        e.target.closest(".store-direction-btn") ||
        e.target.closest(".store-hours") ||
        e.target.closest("button") ||
        e.target.closest("a") ||
        e.target.closest("summary")
      ) {
        return;
      }
      const card = e.target.closest(".store-card");
      if (!card) return;

      const storeIndex = Number(card.dataset.storeIndex);
      if (!storeIndex) return;

      this.focusStoreByIndex(storeIndex);
    });
  }

  initMap() {
    if (!this.mapEl || !window.google) return;

    this.map = new google.maps.Map(this.mapEl, {
      center: this.fallbackCenter,
      zoom: 12,
      zoomControl: true,
      scrollwheel: false,
    });
    this.infoWindow = new google.maps.InfoWindow();

    this.infoWindow.addListener("closeclick", () => {
      if (this.activeMarker && this.activeShadow) {
        this.setPinOpacity(this.activeMarker, 0.7);
        this.setShadowOpacity(this.activeShadow, 0.7);

        this.activeMarker = null;
        this.activeShadow = null;
      }
    });

    this.map.addListener("click", () => {
      if (this.activeMarker && this.activeShadow) {
        this.setPinOpacity(this.activeMarker, 0.7);
        this.setShadowOpacity(this.activeShadow, 0.7);

        this.activeMarker = null;
        this.activeShadow = null;
      }

      this.infoWindow.close();
    });

    this.map.addListener("idle", () => {
      setTimeout(() => {
        this.syncDetailLayers();
      }, 30);
    });
  }

  loadAllStores() {
    if (!this.stores || this.stores.length === 0) return;
    this.filteredStores = [...this.stores];
    this.visibleLimit = this.stores.length;
    this.renderVisibleStores();
  }

  isStoreClosedToday(store) {
    const days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];

    const today = days[new Date().getDay()];
    return store[today]?.schedule === "closed";
  }

  buildInfoWindowContent(store) {
    const template = this.querySelector(".location-template-infowindow");
    if (!template) return null;
    const node = template.content.firstElementChild.cloneNode(true);
    const isClosedToday = this.isStoreClosedToday(store);
    const nameEl = node.querySelector(".store-name");
    if (nameEl) nameEl.textContent = store.name || "";
    const addressWrap = node
      .querySelector(".store-address")
      .closest(".store-info");
    if (store.address) {
      addressWrap.querySelector(".store-address").textContent = store.address;
    } else {
      addressWrap.remove();
    }
    const phoneWrap = node.querySelector(".store-phone").closest(".store-info");
    if (store.phone) {
      phoneWrap.querySelector(".store-phone").textContent = store.phone;
    } else {
      phoneWrap.remove();
    }
    const emailWrap = node.querySelector(".store-email").closest(".store-info");
    if (store.email) {
      emailWrap.querySelector(".store-email").textContent = store.email;
    } else {
      emailWrap.remove();
    }

    const days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const todayKey = days[new Date().getDay()];
    const todayData = store[todayKey];

    const statusEl = node.querySelector(".opening-hours");
    const store_status = node.querySelector(".store-status");

    if (!todayData || todayData.schedule === "closed") {
      statusEl.textContent = "Store Closed";
      store_status.classList.add("closed");
      store_status.classList.remove("open");
    } else {
      const timeRange = this.formatTimeRange(
        todayData.open_hour,
        todayData.open_minute,
        todayData.close_hour,
        todayData.close_minute,
      );
      statusEl.textContent = `${timeRange}`;
      store_status.classList.add("open");
      store_status.classList.remove("closed");
    }

    const direction = node.querySelector(".store-direction-btn");
    direction.href = `https://www.google.com/maps?q=${store.lat},${store.lng}`;
    return node;
  }

  detectUserLocation() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    this.detectBtn.classList.add("loading");
    this.suggestionBox.classList.add("hidden");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        this.filterStoresByDistance(lat, lng);
        this.reverseGeocode(lat, lng);
        this.renderUserMarker(lat, lng);
        this.detectBtn.classList.remove("loading");
      },
      (error) => {
        this.detectBtn.classList.remove("loading");

        switch (error.code) {
          case error.PERMISSION_DENIED:
            alert("Please allow location access.");
            break;
          case error.POSITION_UNAVAILABLE:
            alert("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            alert("Location request timed out.");
            break;
          default:
            alert("Unable to retrieve your location.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }

  renderUserMarker(lat, lng) {
    if (!this.map) return;

    if (this.userMarker) {
      this.userMarker.setMap(null);
    }

    this.map.setCenter({ lat, lng });
  }

  reverseGeocode(lat, lng) {
    if (!window.google) return;
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results && results.length) {
        const result =
          results.find(
            (r) =>
              r.types.includes("locality") ||
              r.types.includes("administrative_area_level_1"),
          ) || results[0];

        this.input.value = result.formatted_address;
      }
    });
  }

  handleSearch() {
    const value = this.input.value.trim();
    this.clearSuggestions();

    if (!value) {
      this.resetToInitialState();
      return;
    }

    if (!value || !this.autocompleteService) return;

    const results = [];
    let completed = 0;

    const handleResponse = (predictions, status) => {
      completed++;

      if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
        predictions.forEach((p) => {
          if (!results.find((r) => r.place_id === p.place_id)) {
            results.push(p);
          }
        });
      }

      if (completed === 2 && results.length) {
        this.renderSuggestions(results);
      }
    };

    const buildRequest = (type) => {
      const req = {
        input: value,
        types: [type],
      };

      if (this.allowedCountries) {
        req.componentRestrictions = {
          country: this.allowedCountries,
        };
      }

      return req;
    };

    this.autocompleteService.getPlacePredictions(
      buildRequest("(cities)"),
      handleResponse,
    );

    this.autocompleteService.getPlacePredictions(
      buildRequest("postal_code"),
      handleResponse,
    );
  }

  resetToInitialState() {
    this.filteredStores = [];
    this.visibleLimit = 5;
    this.currentLatLng = null;
    if (this.storeList) {
      this.storeList.innerHTML = "";
    }
    this.removeLoadMoreButton();
    this.markers.forEach((m) => m.setMap(null));
    this.markers = [];

    if (this.userMarker) {
      this.userMarker.setMap(null);
      this.userMarker = null;
    }
    if (this.map) {
      this.map.setCenter(this.fallbackCenter);
      this.map.setZoom(12);
    }
    if (this.infoWindow) {
      this.infoWindow.close();
    }
  }

  renderSuggestions(predictions) {
    this.suggestionBox.innerHTML = "";

    predictions.forEach((p) => {
      const li = document.createElement("li");
      li.className =
        "location-suggestion-item hover-bg_second rounded-10 transition px-sp-3 py-sp-2 pointer";
      li.textContent = p.description;

      li.addEventListener("click", () => {
        this.input.value = p.description;
        this.hideSuggestions();
        this.resolvePlace(p.place_id);
      });

      this.suggestionBox.appendChild(li);
    });

    this.suggestionBox.classList.remove("hidden");
  }

  clearSuggestions() {
    this.suggestionBox.innerHTML = "";
    this.hideSuggestions();
  }

  hideSuggestions() {
    this.suggestionBox.classList.add("hidden");
  }

  resolvePlace(placeId) {
    this.placesService.getDetails({ placeId }, (place, status) => {
      if (
        status === google.maps.places.PlacesServiceStatus.OK &&
        place.geometry
      ) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        this.renderUserMarker(lat, lng);
        this.filterStoresByDistance(lat, lng);
      }
    });
  }

  filterStoresByDistance(lat, lng) {
    this.filteredStores = this.stores
      .map((store) => {
        const distance = this.calcDistance(lat, lng, store.lat, store.lng);

        return {
          ...store,
          distance,
        };
      })
      .filter((store) => store.distance <= this.radiusKm)
      .sort((a, b) => a.distance - b.distance);
    this.visibleLimit = 5;
    this.renderVisibleStores();
  }

  handleLoadMore() {
    this.visibleLimit += this.loadStep;
    this.renderVisibleStores();
  }

  renderVisibleStores() {
    const visibleStores = this.filteredStores.slice(0, this.visibleLimit);

    this.renderStores(visibleStores);
    this.renderStoreMarkers(visibleStores);
    this.syncDetailLayers();
    this.toggleLoadMoreButton();
  }

  toggleLoadMoreButton() {
    if (!this.loadMoreBtn) return;
    const hasMore = this.visibleLimit < this.filteredStores.length;
    this.loadMoreBtn.style.display = hasMore ? "block" : "none";
  }

  createPinMarker(store, opacity = 0.75) {
    return new google.maps.Marker({
      position: { lat: store.lat, lng: store.lng },
      map: this.map,
      icon: {
        path: `
        M12 1
        C6.48 1 2 5.48 2 11
        C2 16.52 12 27 12 27
        C12 27 22 16.52 22 11
        C22 5.48 17.52 1 12 1
        Z
      `,
        fillColor: "#111111",
        fillOpacity: opacity,
        strokeColor: "#111111",
        strokeWeight: 0,
        scale: 1.5,
        anchor: new google.maps.Point(12, 27),
      },
      zIndex: 40,
    });
  }

  createInnerCircle(store) {
    return new google.maps.Marker({
      position: { lat: store.lat, lng: store.lng },
      map: this.map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#ffffff",
        fillOpacity: 1,
        strokeOpacity: 0,
        anchor: new google.maps.Point(0, 2.5),
      },
      zIndex: 45,
      clickable: false,
    });
  }

  createNumberLabel(store, order) {
    return new google.maps.Marker({
      position: { lat: store.lat, lng: store.lng },
      map: this.map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillOpacity: 0,
        strokeOpacity: 0,
        anchor: new google.maps.Point(0, 2.5),
      },
      label: {
        text: String(order),
        color: "#111111",
        fontSize: "14px",
        fontWeight: "500",
      },
      zIndex: 50,
      clickable: false,
    });
  }

  createExactPinShadow(store, opacity = 0.75) {
    return new google.maps.Marker({
      position: { lat: store.lat, lng: store.lng },
      map: this.map,
      icon: {
        path: "M -8 0 A 8 3 0 1 0 8 0 A 8 3 0 1 0 -8 0",
        fillColor: "#000000",
        fillOpacity: opacity,
        strokeOpacity: 0,
        scale: 1,
        anchor: new google.maps.Point(0, -5),
      },
      zIndex: 5,
      clickable: false,
    });
  }

  setPinOpacity(pin, opacity) {
    if (!pin) return;
    const icon = pin.getIcon();
    if (!icon) return;

    pin.setIcon({
      ...icon,
      fillOpacity: opacity,
    });
  }

  setShadowOpacity(shadow, opacity) {
    if (!shadow) return;
    const icon = shadow.getIcon();
    if (!icon) return;

    shadow.setIcon({
      ...icon,
      fillOpacity: opacity,
    });
  }

  renderStoreMarkers(stores) {
    if (!this.map) return;
    if (this.markerCluster) {
      this.markerCluster.clearMarkers();
      this.markerCluster = null;
    }
    this.markers.forEach(({ pin, circle, label, shadow }) => {
      pin.setMap(null);
      circle.setMap(null);
      label.setMap(null);
      shadow.setMap(null);
    });

    this.markers = [];
    this.markerMap.clear();

    const bounds = new google.maps.LatLngBounds();
    const clusterPins = [];

    if (this.userMarker) {
      bounds.extend(this.userMarker.getPosition());
    }

    stores.forEach((store, order) => {
      const index = order + 1;
      const shadow = this.createExactPinShadow(store, 0.7);
      const pin = this.createPinMarker(store, 0.7);
      const circle = this.createInnerCircle(store);
      const label = this.createNumberLabel(store, index);

      pin.addListener("click", () => {
        this.markers.forEach(({ pin: p, shadow: s }) => {
          this.setPinOpacity(p, 0.7);
          this.setShadowOpacity(s, 0.7);
        });
        this.setPinOpacity(pin, 1);
        this.setShadowOpacity(shadow, 1);

        this.activeMarker = pin;
        this.activeShadow = shadow;

        this.infoWindow.setContent(this.buildInfoWindowContent(store));
        this.infoWindow.open(this.map, pin);
      });

      this.markerMap.set(store.index, pin);
      this.markers.push({ pin, circle, label, shadow });
      this.pinLayerMap.set(pin, { circle, label, shadow });

      clusterPins.push(pin);
      bounds.extend(pin.getPosition());
    });

    this.markerCluster = new markerClusterer.MarkerClusterer({
      map: this.map,
      markers: clusterPins,
      renderer: {
        render: ({ count, position, markers }) => {
          if (markers.length > 1) {
            markers.forEach((pin) => {
              const layers = this.pinLayerMap.get(pin);
              if (layers) {
                layers.circle.setMap(null);
                layers.label.setMap(null);
                layers.shadow.setMap(null);
              }
            });
          } else {
            markers.forEach((pin) => {
              const layers = this.pinLayerMap.get(pin);
              if (layers) {
                layers.circle.setMap(this.map);
                layers.label.setMap(this.map);
                layers.shadow.setMap(this.map);
              }
            });
          }

          return new google.maps.Marker({
            position,
            label: {
              text: String(count),
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: "700",
            },
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 18,
              fillColor: "#111111",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            },
            zIndex: 1000,
          });
        },
      },
    });

    if (!bounds.isEmpty()) {
      this.map.fitBounds(bounds);
    }

    if (!this.filteredStores || this.filteredStores.length === 0) {
      this.map.setZoom(12);
    }
  }

  syncDetailLayers() {
    if (!this.markerCluster) return;

    this.pinLayerMap.forEach((layers, pin) => {
      const isVisible = pin.getMap() === this.map;

      layers.circle.setMap(isVisible ? this.map : null);
      layers.label.setMap(isVisible ? this.map : null);
      layers.shadow.setMap(isVisible ? this.map : null);
    });
  }

  calcDistance(lat1, lng1, lat2, lng2) {
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  renderVisibleStores() {
    const visible = this.filteredStores.slice(0, this.visibleLimit);
    this.renderStores(visible);
    this.renderStoreMarkers(visible);
    this.syncDetailLayers();
  }

  renderStores(stores) {
    if (!this.storeList) return;

    this.storeList.innerHTML = "";

    stores.forEach((store, index) => {
      const card = this.renderStore(store, index + 1);
      if (card) {
        this.storeList.appendChild(card);
      }
    });

    const shouldShowLoadMore = this.filteredStores.length > this.visibleLimit;
    if (shouldShowLoadMore) {
      this.appendLoadMoreButton();
    } else {
      this.removeLoadMoreButton();
    }
  }

  appendLoadMoreButton() {
    if (this.loadMoreBtn || !this.loadMoreTemplate) return;

    const btn = this.loadMoreTemplate.cloneNode(true);

    btn.addEventListener("click", () => {
      this.handleLoadMore();
    });

    this.loadMoreBtn = btn;
    this.storeList.after(btn);
  }

  removeLoadMoreButton() {
    if (!this.loadMoreBtn) return;

    this.loadMoreBtn.remove();
    this.loadMoreBtn = null;
  }

  renderStore(store, order) {
    const template = this.querySelector(".location-template");
    if (!template) return null;
    const node = template.content.firstElementChild.cloneNode(true);
    node.dataset.storeIndex = store.index;
    const nameEl = node.querySelector(".store-name");
    if (nameEl) nameEl.textContent = `${order}. ${store.name}` || "";
    const addressWrap = node
      .querySelector(".store-address")
      .closest(".store-info");
    if (store.address) {
      addressWrap.querySelector(".store-address").textContent = store.address;
    } else {
      addressWrap.remove();
    }
    const phoneWrap = node.querySelector(".store-phone").closest(".store-info");
    if (store.phone) {
      phoneWrap.querySelector(".store-phone").textContent = store.phone;
    } else {
      phoneWrap.remove();
    }
    const emailWrap = node.querySelector(".store-email").closest(".store-info");
    if (store.email) {
      emailWrap.querySelector(".store-email").textContent = store.email;
    } else {
      emailWrap.remove();
    }
    const days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];

    const todayKey = days[new Date().getDay()];
    const todayData = store[todayKey];
    const todayEl = node.querySelector(".store-hours-today");
    if (todayData.schedule === "closed") {
      todayEl.textContent = "Closed";
      todayEl.classList.add("closed");
    } else {
      todayEl.textContent = this.formatTimeRange(
        todayData.open_hour,
        todayData.open_minute,
        todayData.close_hour,
        todayData.close_minute,
      );
      todayEl.classList.add("open");
    }
    days.forEach((day) => {
      const row = node.querySelector(`li[data-day="${day}"]`);
      row.classList.add("flex", "space-between", "mb-sp-1");
      if (!row) return;
      const timeEl = row.querySelector(".time");
      if (store[day].schedule === "closed") {
        row.classList.add("closed");
        timeEl.textContent = "Closed";
      } else {
        row.classList.remove("closed");
        timeEl.textContent = this.formatTimeRange(
          store[day].open_hour,
          store[day].open_minute,
          store[day].close_hour,
          store[day].close_minute,
        );
      }
    });
    const direction = node.querySelector(".store-direction-btn");
    direction.href = `https://www.google.com/maps?q=${store.lat},${store.lng}`;
    return node;
  }

  formatHour(hour, minute) {
    const h = Number(hour);
    const m = Number(minute);
    const suffix = h >= 12 ? "pm" : "am";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    const minuteFormatted = m >= 10 ? m : "0" + m;
    return `${hour12}:${minuteFormatted} ${suffix}`;
  }

  formatTimeRange(open_hour, open_minute, close_hour, close_minute) {
    return `${this.formatHour(open_hour, open_minute)} – ${this.formatHour(close_hour, close_minute)}`;
  }

  focusStoreByIndex(storeIndex) {
    const marker = this.markerMap.get(storeIndex);
    const store = this.filteredStores.find((s) => s.index === storeIndex);

    if (!marker || !store) return;
    this.map.panTo(marker.getPosition());
    this.map.setZoom(17);
    this.infoWindow.setContent(this.buildInfoWindowContent(store));
    this.infoWindow.open(this.map, marker);
    this.highlightStoreCard(storeIndex);
  }

  highlightStoreCard(storeIndex) {
    this.storeList.querySelectorAll(".store-card").forEach((card) => {
      card.classList.toggle(
        "active",
        Number(card.dataset.storeIndex) === storeIndex,
      );
    });
  }
}
if (!customElements.get("store-location")) {
  customElements.define("store-location", StoreLocation);
}
