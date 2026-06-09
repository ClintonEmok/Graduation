# Adaptive Space-Time Cube Prototype

A Next.js prototype for exploring crime patterns through an adaptive space-time cube. Connects a 3D cube, a 2D map, and a dual timeline so analysts can brush time, inspect points, and see bursty intervals expand or compress as time resolution changes.

## Core Value

Help users understand dense vs sparse spatiotemporal crime patterns by keeping the cube, map, and timeline synchronized around adaptive time scaling.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1.6, React 19.2.3 |
| Language | TypeScript 5.9 (strict mode) |
| Package Manager | pnpm 9.x |
| 3D Rendering | Three.js 0.182, React Three Fiber 9.5 |
| Maps | MapLibre GL 5.17, react-map-gl 8.1 |
| State | Zustand 5, TanStack Query 5 |
| Data | DuckDB 1.4, Apache Arrow 21 |
| Visualization | Visx 3.12, deck.gl 9.3, GSAP 3.15 |
| UI | Radix UI, shadcn/ui, Tailwind CSS 4 |
| Testing | Vitest 4, jsdom, React Test Renderer |

## Getting Started

```bash
pnpm install
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The `.env` file sets `USE_MOCK_DATA=false` (DuckDB enabled). To force mock data, set `USE_MOCK_DATA=true` or `DISABLE_DUCKDB=true`.

## Key Features

- **3D Space-Time Cube** — Renders crime density across x (space), z (space), and y (time) axes
- **2D Map** — MapLibre-based geographic view with density heatmaps
- **Dual Timeline** — Overview + detail brushing with adaptive time scaling
- **Adaptive Warp** — Dense time periods expand, sparse periods compress
- **Slice System** — Create, detect, and manage time slices with burst analysis
- **STKDE** — Spatiotemporal KDE for hotspot detection

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — System design, data flow, key abstractions
- [Getting Started](docs/GETTING-STARTED.md) — Setup, prerequisites, development workflow
- [Development](docs/DEVELOPMENT.md) — Code conventions, patterns, contributing
- [Testing](docs/TESTING.md) — Test patterns, running tests
- [Configuration](docs/CONFIGURATION.md) — Environment variables, config files
- [API](docs/API.md) — API route reference

## License

Private — thesis project.
