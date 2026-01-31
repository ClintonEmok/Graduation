# Data

This directory contains the dataset for the Adaptive Space-Time Cube.

## crime.parquet

The main data file used by the application. It is an optimized Parquet file containing crime events.

**Schema:**
- `id` (VARCHAR): Unique event identifier
- `type` (VARCHAR): Crime type (Theft, Assault, etc.)
- `lat` (DOUBLE): Latitude
- `lon` (DOUBLE): Longitude
- `timestamp` (TIMESTAMP): Event time
- `x` (DOUBLE): WebMercator X projection (0-1)
- `z` (DOUBLE): WebMercator Z projection (0-1) (Note: Maps to Y in WebMercator, but Z in our 3D space)
- `y` (DOUBLE): Normalized Time (0-100)

## source.csv

Raw source data. If this file exists, `scripts/setup-data.js` will use it to generate `crime.parquet`. If it's missing, the script generates synthetic data.

**To use real data:**
1. Place your CSV file here as `source.csv`.
2. Ensure it has columns: `id`, `type`, `lat`, `lon`, `timestamp`.
3. Run `node scripts/setup-data.js`.
