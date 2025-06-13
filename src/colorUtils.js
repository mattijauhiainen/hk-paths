/**
 * Convert feet to meters
 * @param {number} feet - Altitude in feet
 * @returns {number} - Altitude in meters
 */
export function feetToMeters(feet) {
  // 1 foot = 0.3048 meters
  return feet * 0.3048;
}

/**
 * Get a Cesium.Color from CSS variables for a specific altitude level
 * @param {number} colorIndex - Index of the altitude color (0-4)
 * @returns {Cesium.Color} - Cesium color object for the specified altitude level
 */
export function getCssVariableColor(colorIndex) {
  // Get the RGB values directly from CSS variables
  const r =
    parseInt(
      getComputedStyle(document.documentElement)
        .getPropertyValue(`--altitude-color-${colorIndex}-r`)
        .trim(),
    ) / 255;
  const g =
    parseInt(
      getComputedStyle(document.documentElement)
        .getPropertyValue(`--altitude-color-${colorIndex}-g`)
        .trim(),
    ) / 255;
  const b =
    parseInt(
      getComputedStyle(document.documentElement)
        .getPropertyValue(`--altitude-color-${colorIndex}-b`)
        .trim(),
    ) / 255;

  return new Cesium.Color(r, g, b, 1.0);
}

/**
 * Determine color based on altitude using a scale for different altitude ranges in meters
 * @param {number} altitude - Altitude in feet
 * @returns {Cesium.Color} - Color corresponding to the altitude
 */
export function getColorByAltitude(altitude) {
  // Convert from feet to meters
  const altitudeInMeters = feetToMeters(altitude);

  // Normalize altitude between 0 and 1 (using altitude ranges in meters)
  const normalizedAlt = Math.min(Math.max(altitudeInMeters / 15000, 0), 1);

  if (normalizedAlt < 0.2) {
    return getCssVariableColor(0); // (0-3,000m)
  } else if (normalizedAlt < 0.4) {
    return getCssVariableColor(1); // (3,000-6,000m)
  } else if (normalizedAlt < 0.6) {
    return getCssVariableColor(2); // (6,000-9,000m)
  } else if (normalizedAlt < 0.8) {
    return getCssVariableColor(3); // (9,000-12,000m)
  } else {
    return getCssVariableColor(4); // (12,000m+)
  }
}
