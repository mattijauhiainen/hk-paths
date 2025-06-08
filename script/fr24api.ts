import { config } from "https://deno.land/x/dotenv/mod.ts";

const env = config();

export type FlightPosition = {
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

export type FlightData = {
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

export async function fetchActiveFlights(timestamp: number, airport = "HKG") {
  const airports = `outbound:${airport}`;
  const limit = 10000;

  const url = `https://fr24api.flightradar24.com/api/historic/flight-positions/light?timestamp=${timestamp}&airports=${encodeURIComponent(
    airports
  )}&limit=${limit}`;
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
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  try {
    return (await response.json()) as {
      data: FlightData[];
    };
  } catch {
    throw new Error("Failed to parse response JSON");
  }
}

export async function fetchFlightTrack(flightId: string) {
  const response = await fetch(
    `https://fr24api.flightradar24.com/api/flight-tracks?flight_id=${flightId}`,
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

  try {
    return (await response.json()) as [
      { fr24_id: string; tracks: FlightPosition[] }
    ];
  } catch {
    throw new Error("Failed to parse response JSON");
  }
}
