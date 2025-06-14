/**
 * Viewer class
 *
 * An abstraction built on top of cesium.js library. It provides an interface for
 * drawing flight paths on the globe view, and for manipulating the camera position
 * and orientation in respect to the globe.
 */
import { feetToMeters } from "./conversionUtils.js";
import { waitForGlobe } from "./globeUtils.js";

export class Viewer {
  /**
   * Creates a new Viewer instance
   * @param {HTMLElement} container - The HTML element to render the viewer in
   */
  constructor(container) {
    // Set Cesium Ion access token
    Cesium.Ion.defaultAccessToken =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIzMzQ1ZDBjMi0yMmZhLTRhYmItYjFmNC05ODVkMGNjNGNlNjQiLCJpZCI6MzA4MTg2LCJpYXQiOjE3NDg3NzgwMzB9.o-M5-iKk1e_omJhzGdLeygfCt1t-rhH92wNNzBlNIS4";

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
   * @returns {Promise<Cesium.Entity|null>} A promise that resolves to the created entity or null if an error occurred
   */
  async drawFlightPath(flightData, flightId = "unknown") {
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

      // Create animation timeline based on actual flight timestamps
      const realStartTime = new Date(tracks[0].timestamp);
      const realEndTime = new Date(tracks[tracks.length - 1].timestamp);
      const realDuration = realEndTime - realStartTime; // milliseconds
      console.log(
        `Animation running from ${realStartTime.toLocaleString()} to ${realEndTime.toLocaleString()} in calendar time`,
      );

      // Use current viewer time for animation scheduling
      const now = this.cesiumViewer.clock.currentTime;
      const animationDuration = Math.max(realDuration / 1000000, 5); // Scale down but minimum 5 seconds
      console.log(
        `Animation duration: ${animationDuration.toFixed(2)} seconds`,
      );
      const startTime = Cesium.JulianDate.addSeconds(
        now,
        1,
        new Cesium.JulianDate(),
      );
      const endTime = Cesium.JulianDate.addSeconds(
        startTime,
        animationDuration,
        new Cesium.JulianDate(),
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
          timeProgress * animationDuration,
          new Cesium.JulianDate(),
        );

        const position = Cesium.Cartesian3.fromDegrees(
          track.lon,
          track.lat,
          feetToMeters(track.alt),
        );

        sampledPosition.addSample(animationTime, position);
      }

      // Create animated entity with path that grows over time
      const entity = this.cesiumViewer.entities.add({
        name: `Flight ${flightData[0].fr24_id || flightId}`,
        availability: new Cesium.TimeIntervalCollection([
          new Cesium.TimeInterval({
            start: startTime,
            stop: endTime,
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
          trailTime: animationDuration,
          show: true,
        },
      });

      // Update viewer clock to encompass this flight
      if (
        !this.cesiumViewer.clock.startTime ||
        Cesium.JulianDate.compare(
          startTime,
          this.cesiumViewer.clock.startTime,
        ) < 0
      ) {
        this.cesiumViewer.clock.startTime = startTime.clone();
      }
      if (
        !this.cesiumViewer.clock.stopTime ||
        Cesium.JulianDate.compare(endTime, this.cesiumViewer.clock.stopTime) > 0
      ) {
        this.cesiumViewer.clock.stopTime = endTime.clone();
      }

      // Set clock to start of this animation if needed
      if (
        Cesium.JulianDate.compare(
          this.cesiumViewer.clock.currentTime,
          startTime,
        ) < 0
      ) {
        this.cesiumViewer.clock.currentTime = startTime.clone();
      }

      this.cesiumViewer.clock.clockRange = Cesium.ClockRange.CLAMPED;
      this.cesiumViewer.clock.multiplier = 1.0;
      this.cesiumViewer.clock.shouldAnimate = true;

      // Wait for this flight's animation to complete
      return new Promise((resolve) => {
        const checkComplete = () => {
          if (
            Cesium.JulianDate.compare(
              this.cesiumViewer.clock.currentTime,
              endTime,
            ) >= 0
          ) {
            // Move clock forward for next flight
            this.cesiumViewer.clock.currentTime = Cesium.JulianDate.addSeconds(
              endTime,
              1,
              new Cesium.JulianDate(),
            );
            resolve(entity);
          } else {
            setTimeout(checkComplete, 100);
          }
        };
        checkComplete();
      });
    } catch (error) {
      console.error(`Error processing flight ${flightId}:`, error);
      return null;
    }
  }

  /**
   * Clears all entities from the viewer and resets animation timeline
   */
  clearEntities() {
    this.cesiumViewer.entities.removeAll();
    // Reset animation timeline
    this.cesiumViewer.clock.currentTime = Cesium.JulianDate.now();
    this.cesiumViewer.clock.shouldAnimate = false;
    this.cesiumViewer.clock.startTime = undefined;
    this.cesiumViewer.clock.stopTime = undefined;
  }

  /**
   * Disables camera controls during loading
   */
  disableCameraControls() {
    const controller = this.cesiumViewer.scene.screenSpaceCameraController;
    controller.enableRotate = false;
    controller.enableTranslate = false;
    controller.enableZoom = false;
    controller.enableTilt = false;
    controller.enableLook = false;
  }

  /**
   * Enables camera controls after loading
   */
  enableCameraControls() {
    const controller = this.cesiumViewer.scene.screenSpaceCameraController;
    controller.enableRotate = true;
    controller.enableTranslate = true;
    controller.enableZoom = true;
    controller.enableTilt = true;
    controller.enableLook = true;
  }
}
