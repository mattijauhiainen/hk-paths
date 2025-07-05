/**
 * Viewer class
 *
 * An abstraction built on top of cesium.js library. It provides an interface for
 * drawing flight paths on the globe view, and for manipulating the camera position
 * and orientation in respect to the globe.
 */
import { feetToMeters } from "./conversionUtils.js";
import { waitForGlobe } from "./globeUtils.js";
import { config } from "./config.js";

export class Viewer {
  /**
   * Creates a new Viewer instance
   * @param {HTMLElement} container - The HTML element to render the viewer in
   */
  constructor(container) {
    // Set Cesium Ion access token from config
    Cesium.Ion.defaultAccessToken = config.cesiumAccessToken;

    // Initialize the Cesium Viewer with base configuration
    this.cesiumViewer = new Cesium.Viewer(container, {
      timeline: false,
      animation: false,
      shouldAnimate: true,
      homeButton: false,
      sceneModePicker: false,
      baseLayerPicker: false,
      geocoder: false,
      fullscreenButton: false,
      navigationHelpButton: false,
    });

    // Apply terrain provider asynchronously
    Cesium.createWorldTerrainAsync().then((terrainProvider) => {
      this.cesiumViewer.terrainProvider = terrainProvider;
    });

    // Initialize clock for animation
    this.cesiumViewer.clock.shouldAnimate = false;
    this.cesiumViewer.clock.currentTime = Cesium.JulianDate.now();
  }

  /**
   * Flies the camera to a specified destination
   * @param {Object} location - The location to fly to
   * @param {number} location.longitude - Longitude in degrees
   * @param {number} location.latitude - Latitude in degrees
   * @param {number} location.altitude - Altitude in meters
   * @param {Object} location.orientation - Camera orientation
   * @param {number} duration - The duration of the flight in seconds
   */
  flyToDestination(location, duration = 1.5) {
    this.cesiumViewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        location.longitude,
        location.latitude,
        location.altitude,
      ),
      orientation: location.orientation,
      duration: duration,
    });
  }

  /**
   * Waits for the globe to be ready
   * @returns {Promise<void>} A promise that resolves when the globe is ready
   */
  async waitForGlobeReady() {
    return waitForGlobe(this.cesiumViewer);
  }

  /**
   * Draws a flight path on the globe with smooth animation using path entity
   * @param {Object} flightData - The flight data object containing track information
   * @param {string} flightId - Optional identifier for the flight (for logging/naming)
   * @param {Object} timelineParams - Timeline parameters for synchronized animations
   * @param {Date} timelineParams.earliestStart - The earliest flight start time across all flights
   * @param {Date} timelineParams.latestEnd - The latest flight end time across all flights
   * @param {Cesium.JulianDate} timelineParams.animationStart - When the global animation starts
   * @param {number} timelineParams.animationDuration - Total duration of the global animation in seconds
   * @returns {Cesium.Entity|null} The created entity or null if an error occurred
   */
  drawFlightPath(flightData, flightId = "unknown", timelineParams) {
    try {
      // Extract track data
      const tracks = flightData[0].tracks;

      if (!tracks || tracks.length === 0) {
        console.warn(`No tracks found for flight ${flightId}`);
        return null;
      }

      if (tracks.length < 2) {
        console.warn(`Not enough valid positions in ${flightId}`);
        return null;
      }

      // Create animation timeline based on global timeline and actual flight timestamps
      const realStartTime = new Date(tracks[0].timestamp);
      const realEndTime = new Date(tracks[tracks.length - 1].timestamp);
      console.log(
        `Flight running from ${realStartTime.toLocaleString()} to ${realEndTime.toLocaleString()} in calendar time`,
      );

      // Map this flight's real time to the global animation timeline
      const globalRealDuration =
        timelineParams.latestEnd - timelineParams.earliestStart; // milliseconds
      const flightStartOffset =
        (realStartTime - timelineParams.earliestStart) / globalRealDuration;
      const flightEndOffset =
        (realEndTime - timelineParams.earliestStart) / globalRealDuration;

      const startTime = Cesium.JulianDate.addSeconds(
        timelineParams.animationStart,
        flightStartOffset * timelineParams.animationDuration,
        new Cesium.JulianDate(),
      );
      const endTime = Cesium.JulianDate.addSeconds(
        timelineParams.animationStart,
        flightEndOffset * timelineParams.animationDuration,
        new Cesium.JulianDate(),
      );

      const flightAnimationDuration = Cesium.JulianDate.secondsDifference(
        endTime,
        startTime,
      );

      // Create SampledPositionProperty with actual timestamps mapped to animation timeline
      const sampledPosition = new Cesium.SampledPositionProperty();
      sampledPosition.setInterpolationOptions({
        interpolationDegree: 1,
        interpolationAlgorithm: Cesium.LinearApproximation,
      });

      // Add samples based on actual flight timestamps
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        const trackTime = new Date(track.timestamp);
        const timeProgress =
          (trackTime - realStartTime) / (realEndTime - realStartTime);
        const animationTime = Cesium.JulianDate.addSeconds(
          startTime,
          timeProgress * flightAnimationDuration,
          new Cesium.JulianDate(),
        );

        const position = Cesium.Cartesian3.fromDegrees(
          track.lon,
          track.lat,
          feetToMeters(track.alt),
        );

        sampledPosition.addSample(animationTime, position);
      }

      // Calculate global animation end time to keep entity visible after flight completion
      const globalAnimationEnd = Cesium.JulianDate.addSeconds(
        timelineParams.animationStart,
        timelineParams.animationDuration,
        new Cesium.JulianDate(),
      );

      // Create animated entity with path that grows over time
      const entity = this.cesiumViewer.entities.add({
        name: `Flight ${flightData[0].fr24_id || flightId}`,
        availability: new Cesium.TimeIntervalCollection([
          new Cesium.TimeInterval({
            start: startTime,
            stop: globalAnimationEnd, // Keep visible until global animation ends
          }),
        ]),
        position: sampledPosition,
        path: {
          resolution: 1,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.2,
            color: Cesium.Color.CYAN,
          }),
          width: 3,
          leadTime: 0,
          trailTime: Number.MAX_VALUE,
          show: true,
        },
      });

      return entity;
    } catch (error) {
      console.error(`Error processing flight ${flightId}:`, error);
      return null;
    }
  }

  /**
   * Enables constant pixel speed control
   * @param {Function} updateSpeedFunction - The function to call for speed updates
   */
  enableAltitudeBasedSpeed(updateSpeedFunction) {
    // Capture initial altitude as the baseline for 1x speed
    const initialAltitude = this.getCameraAltitude();
    this.baseAltitude = initialAltitude;

    // Set up camera change listener
    this.cesiumViewer.camera.changed.addEventListener(() => {
      const currentAltitude = this.getCameraAltitude();
      updateSpeedFunction(currentAltitude, this.baseAltitude);
    });
  }

  /**
   * Gets the current camera altitude above the ground
   * @returns {number} Camera altitude in meters
   */
  getCameraAltitude() {
    const cameraPosition = this.cesiumViewer.camera.position;
    const cartographic = Cesium.Cartographic.fromCartesian(cameraPosition);
    return cartographic.height;
  }
}
