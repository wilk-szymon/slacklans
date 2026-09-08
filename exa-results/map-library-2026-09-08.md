# Map library for Slacklans S-01 (Exa, 2026-09-08)

Recommendation: **Leaflet + react-leaflet v5** as a Next.js client island. **Tile host (locked 2026-09-08): MapTiler Cloud Free** raster XYZ (`streets-v4`). Not OSMF `tile.openstreetmap.org`, not CARTO, not Mapbox, not Google. Keep MapLibre as the vector/WebGL fallback if a later slice needs styled maps.

## Score vs Slacklans constraints

Must: click/tap → lat/lng; Next 16 App Router + React 19 client island; Gdynia OSM coverage; phone outdoor.
Strong: Vercel Hobby $0, no billing account; no WebGL requirement; small bundle.
Nice: agent-readable docs (`llms.txt`).

| Library | Click → lat/lng | Next 16 / React 19 | Outdoor phone | Hobby $0 | Agent docs | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| Leaflet + react-leaflet v5 | Yes (`useMapEvents`) | Yes; **must** `dynamic({ ssr: false })` | Raster/CSS; pinch-zoom | Library free; tiles = provider | No `llms.txt` | **Pick** |
| Vanilla Leaflet in `useEffect` | Yes (`map.on('click')`) | Same SSR split | Same | Same | Leaflet site, no llms | Backup if wrapper stays dormant |
| MapLibre + react-map-gl | Yes (`onClick`) | Next 16 starters exist | WebGL; no canvas fallback | Needs style URL / key | [maplibre.org/llms.txt](https://maplibre.org/llms.txt) | Later, not S-01 |
| Mapbox GL JS | Yes | Token + CSS + client island | WebGL + billing | Free ~50k loads then $ | [docs.mapbox.com/llms.txt](https://docs.mapbox.com/llms.txt) | Overkill |
| Google Maps JS | Yes | Billing account required | Fine, heavy ToS | 10k then $7/1k; $200 credit ended 2025-02-28 | Vendor docs | Avoid |

## Tiles (separate from the library)

Leaflet ships **no tiles**. OSM data is free; OSMF tile servers are not a CDN.

| Provider | API key | Hobby fit | Trap |
| --- | --- | --- | --- |
| OSMF `tile.openstreetmap.org` | No | Caution | No SLA; block without notice; must attribution, Referer, cache; do not hard-code URL ([policy](https://operations.osmfoundation.org/policies/tiles/)) |
| CARTO basemaps | Free key | Yes (5M tiles/mo, non-commercial) | Raster retiring → prefer vector later |
| MapTiler Cloud Free | Yes | Yes if non-commercial | Logo required; 5k sessions/100k req; **pauses** at quota |
| Mapbox | Yes | Volume-ok | Loads bill after ~50k; `mapbox-gl` ≥2 bills even with custom tiles |
| Google Dynamic Maps | Yes + billing | Caution | Per-SKU; Places field-mask can jump tiers |

## Next.js island (do this regardless of Leaflet vs MapLibre)

1. Keep `/nowe/page.tsx` a Server Component.
2. Map lives in `"use client"`.
3. Leaflet: wrap with `next/dynamic(..., { ssr: false })` **from another client component** — `ssr: false` is illegal in a Server Component. `'use client'` still prerenders; Leaflet touches `window` at import ([react-leaflet limitations](https://react-leaflet.js.org/docs/start-introduction/)).
4. Import `leaflet/dist/leaflet.css`; give the container a real height (`min-h-*`).
5. Fix default marker icon paths under webpack/Next.
6. Do not put the map on the public event page unless the plan says so (Hobby CPU).

Click-to-place in react-leaflet is `useMapEvents({ click(e) { e.latlng } })`. Official events example uses `click` → `locate()` (geolocation), which S-01 does **not** need — wire `click` to `e.latlng` instead ([events example](https://react-leaflet.js.org/docs/example-events/)).

## Risks if you pick Leaflet

- CSS missing / height 0 → grey or blank map (classic Next bug).
- `Map container is already initialized` on Strict Mode remount; v5 + React 19 is the intended fix.
- react-leaflet v5.0.0 is 2024-12-14; OpenSSF Maintained 0/10 as of 2026-06 — wrapper is quiet. Plugins (`markercluster`, `draw`) lag; S-01 should not add them.
- Leaflet 2.0 is still alpha (2025-08-16); stay on 1.x + react-leaflet v5.

## Sources (high-signal)

- [React Leaflet v5 intro / SSR limitation](https://react-leaflet.js.org/docs/start-introduction/)
- [OSMF tile usage policy](https://operations.osmfoundation.org/policies/tiles/)
- [Leaflet homepage (mobile-first, ~42KB)](https://leafletjs.com/)
- [MapLibre llms.txt](https://maplibre.org/llms.txt)
- [MapLibre GPU / no software renderer](https://github.com/maplibre/maplibre-gl-js/discussions/7889)
- [Google Maps March 2025 pricing](https://developers.google.com/maps/billing-and-pricing/march-2025)
- [MapTiler Cloud pricing](https://www.maptiler.com/cloud/pricing/)
- [CARTO basemaps](https://carto.com/basemaps/apikey/)

Exa: 4 subagents; 3 completed (70+66+78 search hits); landscape pass rate-limited; plus 5 official-page fetches.
