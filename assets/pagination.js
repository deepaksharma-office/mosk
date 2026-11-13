let parser = new DOMParser();
class PaginateLoadmore extends HTMLElement {
  constructor() {
    super();
    this.initLoadMore();
  }

  initLoadMore() {
    const count = document
      .getElementById("load-more-container")
      .getAttribute("data-count");
    this.querySelectorAll(".actions-load-more").forEach((loadMore) => {
      var _this = this;
      if (loadMore.classList.contains("infinit-scrolling")) {
        var observer = new IntersectionObserver(
          function (entries) {
            entries.forEach((entry) => {
              if (entry.intersectionRatio === 1) {
                _this.loadMorePosts(loadMore, count);
              }
            });
          },
          { threshold: 1.0 }
        );
        observer.observe(loadMore);
      } else {
        loadMore.addEventListener(
          "click",
          (event) => {
            event.preventDefault();
            const target = event.currentTarget;
            _this.loadMorePosts(target, count);
          },
          false
        );
      }
    });
  }

  loadMorePosts(target, count) {
    const loadMore_url = target.getAttribute("href");
    const _this = this;
    _this.toggleLoading(target, true);
    fetch(`${loadMore_url}`)
      .then((response) => {
        if (!response.ok) {
          var error = new Error(response.status);
          throw error;
        }
        return response.text();
      })
      .then((responseText) => {
        const resultNodes = parser.parseFromString(responseText, "text/html");
        const resultNodesHtml = resultNodes.querySelectorAll(
          "#main-items .item-load"
        );
        resultNodesHtml.forEach((prodNode) =>
          document
            .getElementById("section__content-items")
            .appendChild(prodNode)
        );

        const images = document.querySelectorAll("#section__content-items img");
        images.forEach((img) => {
          if (img.hasAttribute("data-srcset")) {
            img.setAttribute("srcset", img.getAttribute("data-srcset"));
            img.removeAttribute("data-srcset");
          }
        });

        const load_more = resultNodes.querySelector(".actions-load-more");
        document.querySelector(".load-more-amount").innerHTML =
          resultNodes.querySelector(".load-more-amount").textContent;
        if (load_more) {
          target.setAttribute("href", load_more.getAttribute("href"));
        } else {
          target.remove();
        }
        _this.updateProgressBar(count);
        _this.toggleLoading(target, false);
      })
      .catch((error) => {
        throw error;
      });
  }

  toggleLoading(event, loading) {
    if (event) {
      const method = loading ? "add" : "remove";
      event.classList[method]("loading");
    }
  }

  updateProgressBar(count) {
    var amount = document.querySelectorAll(
      "#section__content-items .item-load"
    ).length;
    var percent = (amount / count) * 100;
    var progressBar = document.querySelector(".load-more-progress-bar");
    progressBar.style.setProperty("--percent", percent + "%");
    progressBar.style.setProperty("--amount", amount);
  }
}

customElements.define("loadmore-button", PaginateLoadmore);

class LoadMoreButtonCollection extends HTMLElement {
  constructor() {
    super();
    this.loadMoreButton = this.querySelector("a");
    this.loadMoreElement = document.querySelector(".actions-load-more");
    this.init();
  }

  init() {
    if (!this.loadMoreButton) return;
    
    this.loadMoreButton.addEventListener("click", this.handleClick.bind(this));
    this.loadMoreButton.addEventListener("keydown", this.handleKeydown.bind(this));
  }

  handleClick(event) {
    event.preventDefault();
    this.executeLoadMore();
  }

  handleKeydown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      this.executeLoadMore();
    }
  }

  executeLoadMore() {
    this.toggleLoading(true);
    
    setTimeout(() => {
      this.showHiddenCollections();
      this.toggleLoading(false);
      this.cleanup();
    }, 500);
  }

  toggleLoading(isLoading) {
    if (this.loadMoreElement) {
      this.loadMoreElement.classList.toggle("loading", isLoading);
    }
    
    if (this.loadMoreButton) {
      this.loadMoreButton.classList.toggle("loading", isLoading);
    }
  }

  showHiddenCollections() {
    const hiddenItems = document.querySelectorAll(
      ".section__collections-list .collection-item.hidden"
    );
    
    hiddenItems.forEach((item) => {
      item.classList.remove("hidden");
    });
  }

  cleanup() {
    this.remove();
  }
}

customElements.define("loadmore-button-collection", LoadMoreButtonCollection);
