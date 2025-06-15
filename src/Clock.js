/**
 * Clock class
 *
 * Displays the current simulation time synchronized with the flight path animations.
 * Shows the real-world time that corresponds to the current animation progress.
 */
export class Clock {
  /**
   * Creates a new Clock instance
   * @param {Timeline} timeline - The Timeline instance to sync with
   * @param {HTMLElement} clockElement - The HTML element to use for the clock display
   * @param {string} timezone - The timezone to display (e.g., "Asia/Hong_Kong")
   */
  constructor(timeline, clockElement, timezone = "UTC") {
    this.timeline = timeline;
    this.clockElement = clockElement;
    this.timezone = timezone;
    this.updateInterval = null;

    // Set timezone label dynamically
    this.setTimezoneLabel();

    // Start clock automatically
    this.updateInterval = setInterval(() => {
      this.updateClock();
    }, 100);

    console.log("Clock started with update frequency:", 100, "ms");
  }

  /**
   * Updates the clock display with the current simulation time
   */
  updateClock() {
    const globalTimeline = this.timeline.getGlobalTimeline();
    if (!globalTimeline) {
      this.displayTime("--:--:--", "---- -- --");
      return;
    }

    // Get current animation progress
    const currentTime = this.timeline.cesiumClock.currentTime;

    // Calculate elapsed time in the animation
    const elapsedAnimationSeconds = Cesium.JulianDate.secondsDifference(
      currentTime,
      globalTimeline.animationStart,
    );

    // Map animation time to real-world time
    const realWorldTime = this.calculateRealWorldTime(
      elapsedAnimationSeconds,
      globalTimeline,
    );

    // Format and display the time
    if (realWorldTime) {
      const timeString = this.formatTime(realWorldTime);
      const dateString = this.formatDate(realWorldTime);
      this.displayTime(timeString, dateString);
    } else {
      this.displayTime("--:--:--", "---- -- --");
    }
  }

  /**
   * Calculates the real-world time based on animation progress
   * @param {number} elapsedAnimationSeconds - Elapsed seconds in the animation
   * @param {Object} globalTimeline - The global timeline object
   * @returns {Date|null} The corresponding real-world time or null if invalid
   */
  calculateRealWorldTime(elapsedAnimationSeconds, globalTimeline) {
    // Handle edge cases
    if (elapsedAnimationSeconds < 0) {
      return globalTimeline.earliestStart;
    }

    if (elapsedAnimationSeconds >= globalTimeline.animationDuration) {
      return globalTimeline.latestEnd;
    }

    // Calculate progress as a percentage of the total animation
    const animationProgress =
      elapsedAnimationSeconds / globalTimeline.animationDuration;

    // Map to real-world time range
    const totalRealWorldDuration =
      globalTimeline.latestEnd - globalTimeline.earliestStart;
    const elapsedRealWorldTime = totalRealWorldDuration * animationProgress;

    return new Date(
      globalTimeline.earliestStart.getTime() + elapsedRealWorldTime,
    );
  }

  /**
   * Formats a Date object as HH:MM:SS in the specified timezone
   * @param {Date} date - The date to format
   * @returns {string} Formatted time string
   */
  formatTime(date) {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: this.timezone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    return formatter.format(date);
  }

  /**
   * Formats a Date object as "16th of May 2024" in the specified timezone
   * @param {Date} date - The date to format
   * @returns {string} Formatted date string
   */
  formatDate(date) {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: this.timezone,
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const parts = formatter.formatToParts(date);
    const day = parts.find((part) => part.type === "day").value;
    const month = parts.find((part) => part.type === "month").value;
    const year = parts.find((part) => part.type === "year").value;

    // Add ordinal suffix to day
    const dayWithSuffix = this.addOrdinalSuffix(parseInt(day));

    return `${dayWithSuffix} of ${month} ${year}`;
  }

  /**
   * Updates the clock display elements
   * @param {string} timeString - The time string to display
   * @param {string} dateString - The date string to display
   */
  displayTime(timeString, dateString) {
    const timeElement = this.clockElement.querySelector(".clock-time");
    const dateElement = this.clockElement.querySelector(".clock-date");

    timeElement.textContent = timeString;
    dateElement.textContent = dateString;
  }

  /**
   * Adds ordinal suffix to a number (1st, 2nd, 3rd, 4th, etc.)
   * @param {number} num - The number to add suffix to
   * @returns {string} Number with ordinal suffix
   */
  /**
   * Sets the timezone label in the clock display
   */
  setTimezoneLabel() {
    const labelElement = this.clockElement.querySelector(".clock-label");
    const timezoneAbbr = this.getTimezoneAbbreviation();
    labelElement.textContent = `Simulation Time (${timezoneAbbr})`;
  }

  /**
   * Gets the timezone abbreviation for display
   * @returns {string} Timezone abbreviation
   */
  getTimezoneAbbreviation() {
    const formatter = new Intl.DateTimeFormat("en", {
      timeZone: this.timezone,
      timeZoneName: "short",
    });

    const parts = formatter.formatToParts(new Date());
    const timeZonePart = parts.find((part) => part.type === "timeZoneName");

    return timeZonePart ? timeZonePart.value : this.timezone;
  }

  /**
   * Adds ordinal suffix to a number (1st, 2nd, 3rd, 4th, etc.)
   * @param {number} num - The number to add suffix to
   * @returns {string} Number with ordinal suffix
   */
  addOrdinalSuffix(num) {
    const remainder10 = num % 10;
    const remainder100 = num % 100;

    if (remainder100 >= 11 && remainder100 <= 13) {
      return num + "th";
    }

    switch (remainder10) {
      case 1:
        return num + "st";
      case 2:
        return num + "nd";
      case 3:
        return num + "rd";
      default:
        return num + "th";
    }
  }
}
