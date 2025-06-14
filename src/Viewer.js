/**
 * Viewer class
 *
 * An abstraction built on top of cesium.js library. It provides an interface for
 * drawing flight paths on the globe view, and for manipulating the camera position
 * and orientation in respect to the globe.
 */
import { getColorByAltitude, feetToMeters } from "./colorUtils.js";
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
   * Draws a flight path on the globe
   * @param {Object} flightData - The flight data object containing track information
   * @param {string} flightId - Optional identifier for the flight (for logging/naming)
   * @returns {Cesium.Entity|null} The created entity or null if an error occurred
   */
  drawFlightPath(flightData, flightId = 'unknown') {
    try {
      // Extract track data
      const tracks = flightData[0].tracks;

      if (!tracks || tracks.length === 0) {
        console.warn(`No tracks found for flight ${flightId}`);
        return null;
      }

      // Create points array for Cesium polyline
      const positions = [];

      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        // Add position with altitude (convert from feet to meters for Cesium)
        // Cesium uses meters for altitude
        positions.push(
          Cesium.Cartesian3.fromDegrees(
            track.lon,
            track.lat,
            feetToMeters(track.alt),
          ),
        );
      }

      if (positions.length < 2) {
        console.warn(`Not enough valid positions in ${jsonFilename}`);
        return null;
      }

      let entity;

      // Variable coloring based on altitude - create segment for each point pair
      // Get altitudes in feet from the data
      const altitudes = tracks.map((track) => track.alt);
      const minAlt = Math.min(...altitudes);
      const maxAlt = Math.max(...altitudes);

      // Convert min/max to meters for display
      const minAltMeters = feetToMeters(minAlt);
      const maxAltMeters = feetToMeters(maxAlt);

      // Create segments with individual colors based on altitude at each point
      const segmentEntities = [];
      for (let i = 0; i < positions.length - 1; i++) {
        const color = getColorByAltitude(tracks[i].alt);
        const segmentEntity = this.cesiumViewer.entities.add({
          polyline: {
            positions: [positions[i], positions[i + 1]],
            width: 3,
            material: color,
            clampToGround: false,
          },
        });
        segmentEntities.push(segmentEntity);
      }

      // Add a reference entity for the full path (for name and tracking purposes)
      entity = this.cesiumViewer.entities.add({
        name: `Flight ${flightData[0].fr24_id || flightId}`,
        polyline: {
          positions: positions,
          width: 1,
          material: new Cesium.PolylineOutlineMaterialProperty({
            color: Cesium.Color.WHITE.withAlpha(0.2),
            outlineWidth: 0,
            outlineColor: Cesium.Color.BLACK,
          }),
          clampToGround: false,
        },
        properties: {
          minAltitude: minAltMeters,
          maxAltitude: maxAltMeters,
          segmentEntities: segmentEntities,
        },
      });

      console.log(
        "Altitude range:",
        minAltMeters.toFixed(0),
        "to",
        maxAltMeters.toFixed(0),
        "meters",
      );

      // Add a point entity at the start of the path
      const startColor = getColorByAltitude(tracks[0].alt);
      this.cesiumViewer.entities.add({
        position: positions[0],
        point: {
          pixelSize: 8,
          color: startColor,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
        },
        description: `Starting altitude: ${feetToMeters(tracks[0].alt).toFixed(0)} meters`,
      });

      return entity;
    } catch (error) {
      console.error(`Error processing flight ${flightId}:`, error);
      return null;
    }
  }

  /**
   * Clears all entities from the viewer
   */
  clearEntities() {
    this.cesiumViewer.entities.removeAll();
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
