/* A protocol-accurate stand-in for a self-hosted Pelias, for local development
   and for the end-to-end check in deploy/pelias/README.md.

   It is NOT a geocoder. It serves a handful of real Florida addresses in the
   exact GeoJSON shape `/v1/autocomplete` returns, so the half of the system we
   own — the suggest route, the parser, the coordinate handling, the resolve
   route, the block lookup — can be exercised without a 20GB Elasticsearch
   import. The coordinates are real: 444 SW 2nd Ave resolves through the live
   Census geocoder to block 120860036061055, which is FL-27.

   Run: node scripts/pelias-stub.mjs [port]
   Then: PELIAS_BASE_URL=http://127.0.0.1:4000 npm run start */

import { createServer } from "node:http";

const PORT = Number(process.argv[2] ?? 4000);

const ADDRESSES = [
  {
    name: "444 SW 2nd Ave",
    locality: "Miami",
    postalcode: "33130",
    county: "Miami-Dade",
    lon: -80.197602442738,
    lat: 25.769463071522,
  },
  {
    name: "1 SE 3rd Ave",
    locality: "Miami",
    postalcode: "33131",
    county: "Miami-Dade",
    lon: -80.19,
    lat: 25.7717,
  },
  {
    name: "100 N Andrews Ave",
    locality: "Fort Lauderdale",
    postalcode: "33301",
    county: "Broward",
    lon: -80.1436,
    lat: 26.1224,
  },
  {
    name: "601 E Kennedy Blvd",
    locality: "Tampa",
    postalcode: "33602",
    county: "Hillsborough",
    lon: -82.4572,
    lat: 27.9506,
  },
  {
    name: "400 S Orange Ave",
    locality: "Orlando",
    postalcode: "32801",
    county: "Orange",
    lon: -81.3792,
    lat: 28.5383,
  },
];

const feature = (a, i) => ({
  type: "Feature",
  geometry: { type: "Point", coordinates: [a.lon, a.lat] },
  properties: {
    gid: `openaddresses:address:us/fl/stub:${i}`,
    layer: "address",
    source: "openaddresses",
    name: a.name,
    postalcode: a.postalcode,
    locality: a.locality,
    region: "Florida",
    region_a: "FL",
    county: a.county,
    label: `${a.name}, ${a.locality}, FL, USA`,
    confidence: 1,
  },
});

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (!url.pathname.startsWith("/v1/autocomplete")) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
    return;
  }
  const text = (url.searchParams.get("text") ?? "").toLowerCase().trim();
  const hits = text
    ? ADDRESSES.filter(
        (a) =>
          `${a.name} ${a.locality} ${a.postalcode}`.toLowerCase().includes(text) ||
          a.name.toLowerCase().startsWith(text)
      )
    : [];
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      geocoding: { version: "0.2", query: { text } },
      type: "FeatureCollection",
      features: hits.map(feature),
    })
  );
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`pelias-stub listening on http://127.0.0.1:${PORT}`);
});
