/**
 * FlightDataLoader class
 *
 * Responsible for loading the flight data that the visualisation needs.
 * It is initialised with a list of file paths that resolve to files which are part of the visualisation.
 * In its initialisation it will load all the files and get chronologically sorted list of flight data,
 * which is then used to draw the flight paths on the globe.
 */
export class FlightDataLoader {
  /**
   * Creates a new FlightDataLoader instance
   * @param {string[]} filePaths - Array of file paths to load flight data from
   */
  constructor(filePaths) {
    this.filePaths = filePaths;
    this.flightData = [];
    this.isLoaded = false;
  }

  /**
   * Loads all flight data files and sorts them chronologically
   * @returns {Promise<void>} A promise that resolves when all data is loaded and sorted
   */
  async loadData() {
    console.log(`Loading ${this.filePaths.length} flight data files...`);

    try {
      const loadPromises = this.filePaths.map(async (filePath) => {
        try {
          const response = await fetch(`./data/${filePath}`);
          if (!response.ok) {
            throw new Error(`Failed to load ${filePath}: ${response.status}`);
          }
          const data = await response.json();
          return { filePath, data };
        } catch (error) {
          console.error(`Error loading ${filePath}:`, error);
          return { filePath, data: null };
        }
      });

      const results = await Promise.all(loadPromises);

      // Filter out failed loads and extract flight data
      this.flightData = results
        .filter((result) => result.data !== null)
        .map((result) => ({
          filePath: result.filePath,
          flightData: result.data,
          // Get the earliest timestamp from the flight for chronological sorting
          earliestTimestamp: this.getEarliestTimestamp(result.data),
        }))
        .sort(
          (a, b) =>
            new Date(a.earliestTimestamp) - new Date(b.earliestTimestamp),
        );

      this.isLoaded = true;
      console.log(
        `Successfully loaded ${this.flightData.length} flight data files`,
      );
    } catch (error) {
      console.error("Error loading flight data:", error);
      throw error;
    }
  }

  /**
   * Gets the earliest timestamp from a flight data object
   * @param {Object} flightData - The flight data object
   * @returns {string} The earliest timestamp found in the flight data
   */
  getEarliestTimestamp(flightData) {
    if (!flightData || !Array.isArray(flightData) || flightData.length === 0) {
      throw new Error("Flight data is missing or invalid");
    }

    const flight = flightData[0];
    if (!flight.tracks || flight.tracks.length === 0) {
      throw new Error("Flight tracks are missing or empty");
    }

    // Return the timestamp of the first track point
    return flight.tracks[0].timestamp;
  }

  /**
   * Gets the total number of loaded flights
   * @returns {number} The number of successfully loaded flights
   */
  getFlightCount() {
    return this.flightData.length;
  }

  /**
   * Gets a specific number of flights starting from the beginning (chronologically first)
   * @param {number} count - Number of flights to return
   * @returns {Object[]} Array of flight data objects
   */
  getFlights(count) {
    if (!this.isLoaded) {
      throw new Error("Data not loaded yet. Call loadData() first.");
    }

    return this.flightData.slice(0, count).map((item) => ({
      data: item.flightData,
      filePath: item.filePath,
    }));
  }
}
