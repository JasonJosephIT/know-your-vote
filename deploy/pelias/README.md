# Self-hosted Pelias — Florida

The geocoder that completes a voter's address, running on infrastructure we
control. That is the whole point: with `PELIAS_BASE_URL` pointing here, **no
third party ever sees an address a voter types.** The privacy page reads this
host and says so on its own — nobody has to remember to update the prose.

Adapted from `pelias/docker` `projects/los-angeles-metro`, which is the
reference for a sub-national build.

## What is in this directory

| file | what it is |
|---|---|
| `pelias.json` | the Florida build: which data gets imported, and which services the API talks to |
| `docker-compose.yml` | the services, trimmed to what an address geocoder needs |
| `env.sample` | copy to `.env` before the first run — the repo ignores `.env*` so that no secret is ever committed by accident, which means the real one cannot be shipped here |
| `synonyms/`, `blacklist/` | empty, but the schema and placeholder images mount them |

## Bring it up

Pelias is driven by its own CLI, which consumes a project directory like this
one:

```bash
git clone https://github.com/pelias/docker.git ~/pelias-docker
cd ~/pelias-docker && ln -s "$(pwd)/pelias" /usr/local/bin/pelias   # once
cd /path/to/this/repo/deploy/pelias
cp env.sample .env        # .env* is gitignored, so it is not in the repo
pelias compose pull
pelias elastic start && pelias elastic wait
pelias elastic create
pelias download all       # the long one — see "What to expect"
pelias prepare all
pelias import all
pelias compose up
```

Then confirm it answers, and that what it answers is the shape the app parses:

```bash
curl -s 'http://127.0.0.1:4000/v1/autocomplete?text=444+SW+2nd&layers=address' | jq '.features[0].properties.label, .features[0].geometry.coordinates'
```

## Wire it to the app

```bash
PELIAS_BASE_URL=http://127.0.0.1:4000     # or https://geocoder.your-domain
# PELIAS_API_KEY is for hosted Pelias only; a self-hosted instance needs none
```

That is the entire integration. The app's code is identical for self-hosted and
hosted — only this variable differs, and the privacy page renders from it.

## What to expect

Florida is roughly 9.2M OpenAddresses records plus a ~400MB OSM extract.

- **Disk:** tens of GB under `DATA_DIR`, mostly the Elasticsearch index. Budget
  50GB and do not put it on a boot volume you care about.
- **RAM:** Elasticsearch is the constraint. 8GB for the container is a sane
  starting point; it will start with less and be miserable.
- **Time:** `download` and `import` are hours, not minutes, and `import` is the
  part that is CPU-bound.
- **Ports:** everything binds to `127.0.0.1` **including the API**, which is a
  deliberate change from the reference (it binds `0.0.0.0`). A geocoder
  listening on every interface is the one mistake that would undo the reason
  for hosting it at all. Put a TLS reverse proxy in front, and let that be the
  only public surface.

## Why interpolation is off

The reference project enables Pelias's interpolation service, which estimates a
house's position between two known addresses on the same street. We do not
import it, and that is a correctness choice rather than a saving.

An interpolated coordinate is a guess along a line. This app turns a coordinate
into a **census block**, and a census block is what decides a voter's
congressional district — so a guess that lands one block off can hand someone
the wrong district while looking exactly as confident as a real answer. That is
the failure this whole feature exists to remove: it is the same defect as a
split ZIP, arrived at by a different route.

OpenAddresses carries ~9.2M Florida addresses from government sources, so the
authoritative point usually exists. When it does not, the honest outcome is no
suggestion, and the voter falls back to ZIP or the district picker — both of
which the app already offers and neither of which pretends to more precision
than it has.

Turning it back on means adding the `interpolation` service to the compose file,
the `polyline` and `interpolation` blocks to `pelias.json`, and
`"interpolation": { "url": "http://interpolation:4300" }` to `api.services`.

## Verified, and not

**Verified on 2026-09-10:**

- `pelias.json` and `docker-compose.yml` both parse, and every service named in
  `api.services` exists in the compose file.
- The Florida Who's on First id is **85688651**. Worth stating because
  searching "Florida" also returns **85680325**, which is Florida, *Uruguay* —
  importing that would produce a geocoder that silently knows the wrong
  continent.
- The six OpenAddresses sources exist and are populated: `us/fl/statewide`
  (9,152,804 addresses), `us/fl/miami` (1,171,159), `us/fl/broward` (808,800),
  `us/fl/hillsborough` (699,097), `us/fl/orange_county` (560,339),
  `us/fl/city_of_fort_lauderdale` (229,366).
- **The application half works end to end against a self-hosted base URL.**
  With `PELIAS_BASE_URL` pointed at a local instance, `POST /api/address/suggest`
  returned a parsed suggestion carrying its coordinate, and
  `POST /api/address/resolve` took that coordinate through the **live** Census
  geocoder and the **live** `block_district` table to `FL-27, Miami-Dade`. The
  privacy page rendered the configured host and contained no reference to any
  previous vendor.

**Not verified:** the import itself. This machine has no container runtime —
no Docker, Podman, colima or Lima, and Homebrew here is the Intel build, so an
x86 Elasticsearch under Rosetta would be a poor test of an arm64 deployment.
The compose and config are adapted from the upstream reference and cross-checked
against each other, but **no one has run `pelias import all` with them yet.**
Treat the first run as the acceptance test, and expect to adjust.

## Developing without a 50GB import

`scripts/pelias-stub.mjs` serves a handful of real Florida addresses in the
exact `/v1/autocomplete` GeoJSON shape. It is not a geocoder and never will be
— it exists so the half of the system we own can be exercised without waiting
on Elasticsearch. It is what produced the end-to-end result above.

```bash
node scripts/pelias-stub.mjs 4000
PELIAS_BASE_URL=http://127.0.0.1:4000 npm run start
```

## Attribution

OpenAddresses sources carry differing licenses — many require attribution, some
are share-alike — and Pelias does not return per-result license information.
Before this is public, determine the obligations for the six Florida sources
above from OpenAddresses' `state.txt` and put the required attribution in the
UI. This is a licensing task, not an engineering one, and it is not done.
