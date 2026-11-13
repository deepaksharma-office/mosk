if (!customElements.get("countdown-timer")) {
  customElements.define(
    "countdown-timer",
    class CountdownTimer extends HTMLElement {
      constructor() {
        super();
        this.countdownBtn = this.closest("div")?.querySelector(
          "div.countdown-btn a"
        );
        this.countdownAppend = this.querySelector(".countdown-inner");
        this.init();
      }

      init() {
        const cddl = this.dataset?.deadline;
        const minutesLeft = this.dataset?.deadlineMins;
        const customTimeOutMessage = this.dataset?.message;
        const customHidden = this.dataset?.hidden;
        const customshape = this.dataset?.shape;
        const customborder = this.dataset?.border;
        

        let timeLeft = {};
        if (cddl) {
          let isoDate = "";
          if (this.isISODate(cddl)) {
            isoDate = cddl;
            this.mainFunction(isoDate, false, customTimeOutMessage, customHidden, customshape, customborder);
          } else {
            if (this.isValidDate(cddl)) {
              const dateParts = cddl.split("-");
              isoDate =
                dateParts[2] +
                "-" +
                dateParts[0].padStart(2, "0") +
                "-" +
                dateParts[1].padStart(2, "0") +
                "T00:00:00Z";
              this.mainFunction(isoDate, false, customTimeOutMessage, customHidden, customshape, customborder);
            } else {
              if (customTimeOutMessage) {
                this.innerHTML =
                  this.appendChildHtmlTimeOut(customTimeOutMessage).innerHTML;
              } else {
                this.innerHTML = this.appendChildHtml(minutesLeft, customHidden, customshape, customborder).innerHTML;
                timeLeft = {
                  days_timer: 0,
                  hours_timer: 0,
                  minutes_timer: 0,
                  seconds_timer: 0,
                };
                Object.entries(timeLeft).forEach(([key, value]) => {
                  this.querySelector("." + key).innerHTML = value
                    .toString()
                    .padStart(2, "0");
                });
              }
              this.countdownBtn?.setAttribute("aria-disabled", true);
            }
          }
        } else if (minutesLeft) {
          let isoDate = "";
          this.mainFunction(isoDate, minutesLeft, customTimeOutMessage, customHidden, customshape, customborder);
        } else {
          if (customTimeOutMessage) {
            this.innerHTML =
              this.appendChildHtmlTimeOut(customTimeOutMessage).innerHTML;
          } else {
            this.innerHTML = this.appendChildHtml(minutesLeft, customHidden, customshape, customborder).innerHTML;
            timeLeft = {
              days_timer: 0,
              hours_timer: 0,
              minutes_timer: 0,
              seconds_timer: 0,
            };
            Object.entries(timeLeft).forEach(([key, value]) => {
              this.querySelector("." + key).innerHTML = value
                .toString()
                .padStart(2, "0");
            });
          }
          this.countdownBtn?.setAttribute("aria-disabled", true);
        }
      }

      mainFunction(isoDate, minutesLeft, customTimeOutMessage, customHidden, customshape, customborder) {
        let timeLeft = {};
        if (Date.parse(isoDate) || minutesLeft) {
          let deadline = new Date(isoDate);
          if (minutesLeft) {
            deadline = new Date(Date.now() + parseInt(minutesLeft) * 60000);
          }

          const calculateTimeLeft = () => {
            let difference = +deadline - +new Date();
            if (difference > 0) {
              if (minutesLeft) {
                this.countdownAppend.innerHTML =
                  this.appendChildHtml(minutesLeft, customHidden, customshape, customborder).innerHTML;
              } else {
                this.innerHTML = this.appendChildHtml(minutesLeft, customHidden, customshape, customborder).innerHTML;
              }
              timeLeft = {
                days_timer: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours_timer: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes_timer: Math.floor((difference / 1000 / 60) % 60),
                seconds_timer: Math.floor((difference / 1000) % 60),
              };
            } else {
              if (customTimeOutMessage) {
                this.innerHTML =
                  this.appendChildHtmlTimeOut(customTimeOutMessage).innerHTML;
              } else {
                this.innerHTML = this.appendChildHtml(minutesLeft, customHidden, customshape, customborder).innerHTML;
                difference = 0;
                timeLeft = {
                  days_timer: 0,
                  hours_timer: 0,
                  minutes_timer: 0,
                  seconds_timer: 0,
                };
              }
              this.countdownBtn?.setAttribute("aria-disabled", true);
            }
            return timeLeft;
          };

          const updateCountdown = () => {
            const t = calculateTimeLeft();
            Object.entries(t).forEach(([key, value]) => {
              if (this.querySelector("." + key)) {
                this.querySelector("." + key).innerHTML = value
                  .toString()
                  .padStart(2, "0");
              }
            });
          };
          setInterval(updateCountdown, 1000);
        } else {
          if (customTimeOutMessage) {
            this.innerHTML =
              this.appendChildHtmlTimeOut(customTimeOutMessage).innerHTML;
          } else {
            this.innerHTML = this.appendChildHtml(minutesLeft, customHidden, customshape, customborder).innerHTML;
            timeLeft = {
              days_timer: 0,
              hours_timer: 0,
              minutes_timer: 0,
              seconds_timer: 0,
            };
            Object.entries(timeLeft).forEach(([key, value]) => {
              this.querySelector("." + key).innerHTML = value
                .toString()
                .padStart(2, "0");
            });
          }
          this.countdownBtn?.setAttribute("aria-disabled", true);
        }
      }

      appendChildHtml(minutesLeft, customHidden, customshape, customborder) {
        const days = this.dataset?.days;
        const hours = this.dataset?.hours;
        const mins = this.dataset?.mins;
        const secs = this.dataset?.secs;

        const getShapeClass = (shape) => {
          if (shape === "rounded") return "rounded-5";
          if (shape === "circle") return "rounded-50";
          return "";
        };
        const shapeClass = getShapeClass(customshape);

        const getBorderClass = (border) => {
          if (border === "solid") return " border-style";
          if (border === "none") return "";
        };
        const borderClass = getBorderClass(customborder);

        const container = document.createElement("div");
        container.innerHTML = `
          <div class="countdown-container lh-normal${ customHidden != "false" ? "" : " text-color bg-custom"} min-w-custom p-custom${
            (minutesLeft && customHidden != "false") ? " hidden" : ""
          } flex column ${shapeClass}${borderClass} relative content-center">
            <span class="days_timer countdown-item heading_weight fs-custom"></span>
            <span class="fs-13 days timer-announcementbar-text${ customHidden != "false" ? "" : ""}">${days || "days"}</span>
          </div>
          <div class="countdown-container lh-normal${ customHidden != "false" ? "" : " text-color bg-custom"} min-w-custom p-custom${
            (minutesLeft && customHidden != "false") ? " hidden" : ""
          } flex column ${shapeClass}${borderClass} relative content-center">
            <span class="hours_timer countdown-item heading_weight fs-custom"></span>
            <span class="fs-13 hours timer-announcementbar-text${ customHidden != "false" ? " " : ""}">${hours || "hours"}</span>
          </div>
          <div class="countdown-container lh-normal${ customHidden != "false" ? "" : " text-color bg-custom"} min-w-custom p-custom flex column ${shapeClass}${borderClass} relative content-center">
            <span class="minutes_timer countdown-item heading_weight fs-custom"></span>
            <span class="fs-13 minute timer-announcementbar-text${ customHidden != "false" ? " " : ""}">${mins || "mins"}</span>
          </div>
          <div class="countdown-container lh-normal${ customHidden != "false" ? "" : " text-color bg-custom"} min-w-custom p-custom flex column ${shapeClass}${borderClass} relative content-center">
            <span class="seconds_timer countdown-item heading_weight fs-custom"></span>
            <span class="fs-13 second timer-announcementbar-text${ customHidden != "false" ? "" : ""}">${secs || "secs"}</span>
          </div>`;
        return container;
      }

      appendChildHtmlTimeOut(customTimeOutMessage) {
        const container = document.createElement("div");
        container.innerHTML = `<span class="timeout">${customTimeOutMessage}</span>`;
        return container;
      }

      isISODate(dateString) {
        const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
        return isoRegex.test(dateString);
      }

      isValidDate(dateString) {
        return /^\d{2}-\d{2}-\d{4}$/.test(dateString);
      }
    }
  );
}
 