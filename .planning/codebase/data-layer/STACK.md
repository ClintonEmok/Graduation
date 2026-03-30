# Data Layer Technology Stack

**Analysis Date:** 2026-03-30

## Core Data Fetching

**Primary:**
- `@tanstack/react-query` v5.90.21 - Main data fetching and caching library
- React 19.2.3 - UI framework

**State Management (complements React Query):**
- `zustand` v5.0.10 - Client-side state management for UI state

## Database

**Primary:**
- DuckDB v1.4.4 - In-process analytical database
- Location: `data/cache/crime.duckdb` (configurable via `DUCKDB_PATH` env var)

**Data Source:**
- Chicago Crime CSV: `data/sources/Crimes_-_2001_to_Present_20260114.csv`
- ~8.5M rows from 2001-2026

## API Layer

**Framework:**
- Next.js 16.1.6 - API routes for backend data access
- Runtime: Node.js (forced for DuckDB compatibility)

**API Routes:**
- `/api/crimes/range` - Viewport-based crime data
- `/api/stkde/hotspots` - Space-time kernel density estimation
- `/api/crime/stream` - Streaming crime data (Apache Arrow)
- `/api/crime/facets` - Crime type/district aggregations
- `/api/crime/meta` - Dataset metadata
- `/api/crime/bins` - Density bins
- `/api/neighbourhood/poi` - Points of interest
- `/api/adaptive/global` - Global adaptive scale data

## Data Formats

**Client-Server:**
- JSON - Primary response format
- Apache Arrow - Streaming format for large datasets (`src/hooks/useCrimeStream.ts`)

**Client-Side Types:**
- `CrimeRecord` - Primary data type (`src/types/crime.ts`)
- `ColumnarData` - Optimized columnar format for visualization (`src/lib/data/types.ts`)

## Query Building

**SQL Query Builders:**
- Custom query builders in `src/lib/queries/builders.ts`
- Filters: `src/lib/queries/filters.ts`
- Aggregations: `src/lib/queries/aggregations.ts`
- Sanitization: `src/lib/queries/sanitization.ts`

## Environment Configuration

**Environment Variables:**
- `USE_MOCK_DATA` - Enable/disable DuckDB (default: true for mock)
- `DUCKDB_PATH` - Custom path to DuckDB file
- `DISABLE_DUCKDB` - Alternative to USE_MOCK_DATA

## Build & Development

**Package Manager:**
- npm (v16.1.6 in package.json)
- Lockfile: `package-lock.json`

**Testing:**
- Vitest v4.0.18
- React Test Renderer v19.2.0

---

*Data layer stack analysis: 2026-03-30*
