# Flight path visualization

Goal of the project is to visualize the flight paths of airplanes. The data we have stored is for one day in Hong Kong, but it should be possible to run the visualization for any airport and any day if there is data for it.

## The data

The path data is stored in JSON files inside the `data` directory. These are big files, so they cannot be read by an LLM. Here is an example of the data format:

```JSON
[
  {
    "fr24_id": "39341600",
    "tracks": [
      {
        "timestamp": "2025-02-21T01:07:12Z",
        "lat": 22.3129,
        "lon": 113.92409,
        // Altitude in feet
        "alt": 0,
        "gspeed": 4,
        "vspeed": 0,
        "track": 298,
        "squawk": "0",
        "callsign": "",
        "source": "ADSB"
      },
      {
        "timestamp": "2025-02-21T01:07:44Z",
        "lat": 22.31339,
        "lon": 113.92298,
        // Altitude in feet
        "alt": 0,
        "gspeed": 0,
        "vspeed": 0,
        "track": 295,
        "squawk": "0",
        "callsign": "CPA139",
        "source": "ADSB"
      },
      ...
    ]
  }
]
```

Never try to read the files inside the `data` directory into your context, instead use the above example as a reference of a data file.

## The visualization

The visualization should render the flight paths on a globe. Globe is implemented by cesium.js library. The output of the visualization is the flight track or path, departing from Hong Kong, and arriving at its destination. Each path is rendered as an animated polyline on the globe.

## Controls and UI elements

There is a single button which centers the globe onto Hong Kong, and no other UI elements or controls.

## Technical stack

- The globe is implemented using cesium.js
- There is no build step, the visualization is rendered directly in the browser using the index.html file. The browser rendered code needs to only reference files that are actually locally available, or files which are loaded using a CDN. There are no npm packages used.

## Program structure

### Viewer class

Viewer class is an abstraction built on top of cesium.js library. It provides an interface for drawing flight paths and the globe view, and for manipulating the camera position and orientation in respect to the globe.

### FlightDataLoader class

FlightDataLoader is responsible for loading the flight data that the visualisation needs. It is initialised with a list of file paths that resolve to files which are part of the visualisation. In its initialisation it will load all the files and get chronologically sorted list of flight data, which is then used to draw the flight paths on the globe.

## Directory structure

- `src` contains javascript files that are used to render the web page.
- `data` contains the JSON data files that contain path data for the flights that the page renders.
- `script` contains scripts that are used to source the flight data. Files here are not used for rendering the web page.

## Other things to note

- For now to make development of the project easier and faster to verify, we will only render the flight paths of the first 5 flights in the data. Do not change this unless explicitly requested.
- There are few folders that you don't need to care about. Ignore these folders:
  - noisedocs
  - script
  - data
