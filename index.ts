import { config } from "https://deno.land/x/dotenv/mod.ts";

const env = config();

type FlightPosition = {
  timestamp: string;
  lat: number;
  lon: number;
  alt: number;
  gspeed: number;
  vspeed: number;
  track: number;
  squawk: string;
  callsign: string;
  source: string;
};

async function getTrack() {
  const response = await fetch(
    "https://fr24api.flightradar24.com/api/flight-tracks?flight_id=391ba9d3",
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Accept-Version": "v1",
        Authorization: `Bearer ${env.PROD_KEY}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = (await response.json()) as [
    { fr24_id: string; tracks: FlightPosition[] }
  ];
  return data;
}

// getTrack().then((data) => {
//   const track = data[0].tracks;
// });

type FlightData = {
  fr24_id: string;
  hex: string;
  callsign: string;
  lat: number;
  lon: number;
  track: number;
  alt: number;
  gspeed: number;
  vspeed: number;
  squawk: string;
  timestamp: string;
  source: string;
};

// https://fr24api.flightradar24.com/api/historic/flight-positions/light?timestamp=1739447446&airports=outbound:HKG&limit=10000

async function getHistoricFlightPositions({ _timestamp }) {
  const timestamp = _timestamp ?? "1739447446";
  const airports = "outbound:HKG";
  const limit = 10000;

  const url = `https://fr24api.flightradar24.com/api/historic/flight-positions/light?timestamp=${timestamp}&airports=${encodeURIComponent(
    airports
  )}&limit=${limit}`;
  // 1. How do I get FR24 IDs for all flights out of HKG on a given day?

  const response = await fetch(url, {
    cache: "default",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${env.PROD_KEY}`,
      Accept: "application/json",
      "accept-version": "v1",
    },
    method: "GET",
  });

  if (!response.ok) {
    try {
      console.log(await response.json());
    } catch {}
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = (await response.json()) as { data: FlightData[] };
  return data;
}

const set1 = await getHistoricFlightPositions({
  _timestamp: "1739447446",
}).then((response) => {
  const fr24Ids = new Set(response.data.map((flight) => flight.fr24_id));
  return fr24Ids;
});

const set2 = await getHistoricFlightPositions({
  _timestamp: "1739446446",
}).then((response) => {
  const fr24Ids = new Set(response.data.map((flight) => flight.fr24_id));
  return fr24Ids;
});

console.log(set1.intersection(set2));
