// Constants for locations
export const LOCATION_HONG_KONG = {
  longitude: 114.1095,
  latitude: 22.3964,
  altitude: 150_000,
  orientation: {
    heading: 0.0,
    pitch: -Cesium.Math.PI_OVER_TWO,
    roll: 0.0,
  },
};

export async function waitForGlobe(viewer) {
  // Ensure camera is set first
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(
      LOCATION_HONG_KONG.longitude,
      LOCATION_HONG_KONG.latitude,
      LOCATION_HONG_KONG.altitude,
    ),
    orientation: LOCATION_HONG_KONG.orientation,
  });
  console.log("Starting globe readiness check...");

  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject("Timed out while waiting for the globe to load.");
      }, 10_000);
    });
    const cameraMovePromise = new Promise((resolve) => {
      const removeListener = viewer.camera.moveEnd.addEventListener(() => {
        console.log("Camera move completed");
        removeListener();
        resolve();
      });
    });
    // Wait for camera to finish moving first
    await Promise.race([cameraMovePromise, timeoutPromise]);

    const tilesLoadedPromise = new Promise((resolve) => {
      function checkTiles() {
        if (viewer.scene.globe.tilesLoaded) {
          console.log("Globe tiles loaded");
          resolve();
        } else {
          setTimeout(checkTiles, 100);
        }
      }
      checkTiles();
    });
    // Now wait for tiles to load (or timeout)
    await Promise.race([tilesLoadedPromise, timeoutPromise]);

    console.log("Globe is ready");
  } catch (error) {
    console.log("Error during readiness check, proceeding anyway:", error);
  }
}
