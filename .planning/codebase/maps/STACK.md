# Map Technology Stack

**Analysis Date:** 2026-03-30

## Core Mapping Libraries

**Map Rendering:**
- `maplibre-gl` v5.17.0 - Open-source fork of Mapbox GL JS, provides WebGL-powered map rendering
- `react-map-gl` v8.1.0 - React wrapper for maplibre-gl, provides React component interface
- `@math.gl/web-mercator` v4.1.0 - Web Mercator projection utilities for coordinate transformations

**Visualization Layers:**
- `@react-three/fiber` v9.5.0 - React renderer for Three.js, used for WebGL heatmap overlay
- `@react-three/drei` v10.7.7 - Useful helpers for react-three-fiber
- `three` v0.182.0 - Three.js for WebGL rendering of custom visualizations

**Data Handling:**
- `@types/geojson` v7946.0.16 - TypeScript types for GeoJSON data structures
- `@loaders.gl/core` v4.3.4 - Framework for loaders (including Arrow)
- `@loaders.gl/arrow` v4.3.4 - Arrow data loader for efficient data transfer

## Coordinate System

**Projection:**
- Web Mercator projection (EPSG:3857)
- Custom origin at Chicago downtown: `{ longitude: -87.6298, latitude: 41.8781 }`
- Implementation in `src/lib/projection.ts`

**Zoom Levels:**
- Base zoom: 12 (used for projection unit calculations)
- Scene units: 1 unit ≈ 1 pixel at zoom 12
- Scale factor: `2^(zoom - 12)` for other zoom levels

## State Management

**Zustand Stores:**
- `useMapLayerStore` - Layer visibility and opacity controls
- `useHeatmapStore` - Heatmap feature toggle
- `useClusterStore` - Cluster visualization state
- `useTrajectoryStore` - Trajectory/path visualization state

## Styling

**Map Styles:**
- Theme-aware map styles via `PALETTES` in `src/lib/palettes.ts`
- Dark/light mode support through `useThemeStore`
- MapLibre GL CSS: `maplibre-gl/dist/maplibre-gl.css`

---

*Map stack analysis: 2026-03-30*
