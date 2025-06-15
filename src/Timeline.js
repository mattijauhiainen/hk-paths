/**
 * Timeline class
 *
 * Handles global timeline creation and animation scheduling for synchronized flight animations.
 * Calculates timing based on actual flight timestamps and manages Cesium clock coordination.
 */
export class Timeline {
  /**
   * Creates a new Timeline instance
   * @param {Cesium.Clock} cesiumClock - The Cesium clock instance to coordinate with
   */
  constructor(cesiumClock) {
    this.cesiumClock = cesiumClock;
    this.globalTimeline = null;
    this.isAnimating = false;
  }

  /**
   * Calculates the global timeline based on all flight data
   * @param {Array} flights - Array of flight data objects
   * @param {number} animationScaleFactor - Factor to scale real time to animation time (default: 100000)
   * @param {number} minDuration - Minimum animation duration in seconds (default: 30)
   * @returns {Object} Global timeline object or null if calculation fails
   */
  calculateGlobalTimeline(
    flights,
    animationScaleFactor = 30_000,
    minDuration = 30,
  ) {
    if (!flights || flights.length === 0) {
      throw new Error("No flights provided for timeline calculation");
    }

    let earliestStart = null;
    let latestEnd = null;

    // Find the earliest start and latest end times across all flights
    flights.forEach((flight) => {
      const tracks = flight.data[0].tracks;
      if (tracks && tracks.length > 0) {
        const flightStart = new Date(tracks[0].timestamp);
        const flightEnd = new Date(tracks[tracks.length - 1].timestamp);

        if (!earliestStart || flightStart < earliestStart) {
          earliestStart = flightStart;
        }
        if (!latestEnd || flightEnd > latestEnd) {
          latestEnd = flightEnd;
        }
      }
    });

    if (!earliestStart || !latestEnd) {
      throw new Error(
        "Could not determine valid global timeline from flight data",
      );
    }

    // Calculate durations
    const globalRealDuration = latestEnd - earliestStart; // milliseconds
    const globalAnimationDuration = Math.max(
      globalRealDuration / animationScaleFactor,
      minDuration,
    );

    // Create the global timeline object
    this.globalTimeline = {
      earliestStart,
      latestEnd,
      animationStart: Cesium.JulianDate.addSeconds(
        Cesium.JulianDate.now(),
        2, // Start 2 seconds from now
        new Cesium.JulianDate(),
      ),
      animationDuration: globalAnimationDuration,
      realDurationHours: globalRealDuration / (1000 * 60 * 60),
    };

    console.log(
      `Global timeline calculated: ${this.globalTimeline.realDurationHours.toFixed(1)} hours ` +
        `(${earliestStart.toLocaleString()} to ${latestEnd.toLocaleString()}) ` +
        `will animate over ${globalAnimationDuration.toFixed(1)} seconds for ${flights.length} flights`,
    );

    return this.globalTimeline;
  }

  /**
   * Starts the global animation using the calculated timeline
   * @returns {boolean} True if animation started successfully, false otherwise
   */
  startAnimation() {
    if (!this.globalTimeline) {
      throw new Error(
        "No global timeline available. Calculate timeline first.",
      );
    }

    if (this.isAnimating) {
      throw new Error("Animation is already running");
    }

    // Set up the global animation end time
    const globalAnimationEnd = Cesium.JulianDate.addSeconds(
      this.globalTimeline.animationStart,
      this.globalTimeline.animationDuration,
      new Cesium.JulianDate(),
    );

    // Configure the Cesium clock for the global timeline
    this.cesiumClock.startTime = this.globalTimeline.animationStart.clone();
    this.cesiumClock.stopTime = globalAnimationEnd.clone();
    this.cesiumClock.currentTime = this.globalTimeline.animationStart.clone();
    this.cesiumClock.clockRange = Cesium.ClockRange.CLAMPED;
    this.cesiumClock.multiplier = 1.0;
    this.cesiumClock.shouldAnimate = true;

    this.isAnimating = true;

    console.log(
      `Global animation started: ${this.globalTimeline.animationDuration.toFixed(2)} seconds ` +
        `covering ${this.globalTimeline.earliestStart.toLocaleString()} to ${this.globalTimeline.latestEnd.toLocaleString()}`,
    );

    return true;
  }

  /**
   * Stops the global animation
   */
  stopAnimation() {
    if (this.cesiumClock) {
      this.cesiumClock.shouldAnimate = false;
    }
    this.isAnimating = false;
    console.log("Global animation stopped");
  }

  /**
   * Resets the timeline state
   */
  reset() {
    this.stopAnimation();
    this.globalTimeline = null;

    if (this.cesiumClock) {
      this.cesiumClock.currentTime = Cesium.JulianDate.now();
      this.cesiumClock.startTime = undefined;
      this.cesiumClock.stopTime = undefined;
    }

    console.log("Timeline reset");
  }

  /**
   * Gets the current global timeline
   * @returns {Object|null} The global timeline object or null if not calculated
   */
  getGlobalTimeline() {
    return this.globalTimeline;
  }

  /**
   * Checks if animation is currently running
   * @returns {boolean} True if animation is running
   */
  isAnimationRunning() {
    return this.isAnimating;
  }

  /**
   * Gets animation progress as a percentage (0-100)
   * @returns {number} Animation progress percentage, or 0 if not animating
   */
  getAnimationProgress() {
    if (!this.isAnimating || !this.globalTimeline) {
      return 0;
    }

    const currentTime = this.cesiumClock.currentTime;
    const elapsed = Cesium.JulianDate.secondsDifference(
      currentTime,
      this.globalTimeline.animationStart,
    );
    const progress = (elapsed / this.globalTimeline.animationDuration) * 100;
    return Math.max(0, Math.min(100, progress));
  }

  /**
   * Updates the animation speed multiplier to maintain constant pixel speed
   * @param {number} currentAltitude - Current camera altitude in meters
   * @param {number} baseAltitude - Base altitude for normal speed
   * @param {number} minSpeed - Minimum speed multiplier (default: 0.01)
   * @param {number} maxSpeed - Maximum speed multiplier (default: 100)
   */
  updateSpeedForConstantPixelRate(
    currentAltitude,
    baseAltitude,
    minSpeed = 0.01,
    maxSpeed = 100,
  ) {
    if (!this.cesiumClock || !this.isAnimating) {
      return;
    }

    // Calculate speed multiplier to maintain constant pixel speed
    // Higher altitude = smaller apparent size = need faster animation
    // Speed is proportional to altitude ratio
    const speedMultiplier = currentAltitude / baseAltitude;

    // Clamp to min/max values to prevent extreme speeds
    const clampedMultiplier = Math.max(
      minSpeed,
      Math.min(maxSpeed, speedMultiplier),
    );

    // Apply the speed multiplier to the clock
    this.cesiumClock.multiplier = clampedMultiplier;
  }
}
