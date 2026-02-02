# Data Preparation Summary

**Phase:** 9 (Logging/Study)
**Plan:** 00 (Ad-hoc Data Preparation)
**Date:** 2026-02-03

## Overview
This task updated the Chicago crime dataset with the latest records (up to Jan 2026) and enriched it with District metadata to support better filtering and analysis in the application.

## Key Changes

### Data Pipeline
- **New Scripts:**
  - `datapreprocessing/pipeline.py`: Loads Crimes, Districts, and IUCR data; cleans/filters; merges District names.
  - `scripts/setup-data.js`: Updated to handle the new `district` and `district_name` columns in Parquet generation.

### Dataset Updates
- **Source:** `Crimes_-_2001_to_Present_20260114.csv` (2.2GB)
- **Metadata:** `Police_Stations_20260202.csv`, `Chicago_Police_Department_-_Illinois_Uniform_Crime_Reporting_(IUCR)_Codes_20260202.csv`
- **Filtering:** 
  - Date Range: Last 5 years (since 2021-02-03)
  - Lat/Lon: Valid coordinates only, within Chicago bounding box
- **Output:** `data/crime.parquet` (Updated) ~1.17M records

### Schema Changes
- Added `district` (ID) and `district_name` columns to the Parquet file.
- Ensured `id`, `type`, `lat`, `lon`, `timestamp` columns are preserved.

## Decisions Made
- **Ad-hoc Pipeline:** Used Python for heavy lifting (merging/cleaning) and DuckDB (Node.js) for efficient Parquet conversion, leveraging existing tools.
- **District Mapping:** Merged `District` ID from Crimes with `District Name` from Stations file to provide human-readable labels.
- **Filtering:** Limited to 5 years to keep the dataset size manageable for browser-based visualization while providing sufficient historical context.

## Next Steps
- Verify the application correctly loads and displays the new data.
- Update UI components to utilize `district_name` for tooltips or filters if needed (currently filtering uses ID).
