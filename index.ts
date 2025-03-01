import { fetchActiveFlights, fetchFlightTrack } from "./fr24api.ts";

async function getTrack(fr24_id: string) {
  const data = await fetchFlightTrack(fr24_id);
  Deno.writeTextFile(`${fr24_id}.json`, JSON.stringify(data));
}

const ids = (await Deno.readTextFile("ids.txt")).split("\n");
for (const id of ids.slice(180, 280)) {
  console.log("Getting fr id: ", id);
  await getTrack(id);
  await new Promise((resolve) => setTimeout(resolve, 30_000));
}

async function getFlightRadarIdsForTimestamp({
  timestamp,
  airport = "HKG",
}: {
  timestamp: number;
  airport?: string;
}) {
  const data = await fetchActiveFlights(timestamp, airport);
  return new Set(data.data.map((flight) => flight.fr24_id));
}

// let ids = new Set<string>();
// for (let i = 0; i < 24; i++) {
//   const timestamp = Math.floor(Date.now() / 1000) - i * 3600;
//   console.log(
//     `Getting ids for timestamp: ${timestamp}, current ids: ${ids.size}`
//   );
//   const newIds = await getFlightRadarIdsForTimestamp({ timestamp });
//   await new Promise((resolve) => setTimeout(resolve, 30_000));
//   ids = new Set([...ids, ...newIds]);
// }
// const idsString = Array.from(ids).join("\n");
// await Deno.writeTextFile("ids.txt", idsString);
