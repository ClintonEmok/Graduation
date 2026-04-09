# Technology Stack

**Domain:** Hotspot policing / crime analysis visual analytics
**Researched:** 2026-04-09

## Recommended Stack

### Core analytics app

| Technology | Purpose | Why |
|------------|---------|-----|
| Web app dashboard | Analyst workflow, command view, sharing | Fastest way to connect maps, timelines, and briefings |
| React / Next.js or similar | UI composition | Good for linked views and rapid iteration |
| TypeScript | Shared data contracts | Crime-analysis systems need strong schema discipline |
| MapLibre / deck.gl / similar map layer | Spatial hotspot display | Analysts need place-based filtering and map-centric exploration |
| D3 / visx / ECharts / similar | Timelines and rank charts | Hotspot analysis needs compact temporal summaries |
| Web Workers | Heavy clustering / scoring | Keeps large incident sets responsive |

### Data layer

| Technology | Purpose | Why |
|------------|---------|-----|
| PostGIS / spatial DB | Geospatial querying | Best fit when the workflow needs joins, buffers, polygons, and districts |
| DuckDB / Arrow | Local, fast analytics | Strong for offline or prototype analysis over exported incidents |
| Python notebooks / batch jobs | Validation and model checks | Useful for analysts and researchers testing parameters |

### Supporting libraries

| Library | Purpose | When to use |
|---------|---------|-------------|
| zod / schema validation | Validate filters and time windows | Always, to avoid bad queries |
| Comlink or typed worker messaging | Worker contracts | When scaling to large incident datasets |
| date-fns / temporal utilities | Time windows and rollups | Daily/weekly/monthly views |
| geospatial helpers | Buffering, bounds, tiling | For hotspots, patrol zones, and districts |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Map rendering | MapLibre | Heavy proprietary GIS | Less flexible and harder to customize for analyst workflows |
| Analytics engine | PostGIS + DuckDB | Postgres-only | Postgres is fine, but DuckDB helps with local/offline exploration |
| State model | Typed shared store | Ad hoc events | Hotspot workflows need traceable selections and filters |

## Sources

- NIJ: https://nij.ojp.gov/topics/articles/hot-spots-policing
- CrimeSolutions: https://crimesolutions.ojp.gov/
- Campbell review: https://onlinelibrary.wiley.com/doi/10.4073/csr.2010.1
