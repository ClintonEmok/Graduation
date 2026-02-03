# Architecture

**Analysis Date:** 2026-01-30

## Pattern Overview

**Overall:** ETL Data Pipeline with Interactive Analysis

**Key Characteristics:**
- Chunked CSV processing for large dataset handling (~8.5M rows)
- Dual interface: CLI script + Jupyter notebooks for exploratory work
- Single-stage transformation pipeline (extract, clean, derive, output)
- No database layer - operates directly on CSV files
- Visualization-heavy EDA workflow

## Layers

**Data Ingestion Layer:**
- Purpose: Read large CSV files in memory-efficient chunks
- Location: `datapreprocessing/pipeline.py` (lines 105-116)
- Contains: `iter_clean_chunks()` generator function
- Depends on: pandas read_csv with chunking
- Used by: CLI main function, notebook cells

**Transformation Layer:**
- Purpose: Clean, validate, and derive features from raw crime data
- Location: `datapreprocessing/pipeline.py` (lines 73-102)
- Contains: `preprocess_chunk()` function
- Depends on: Raw DataFrame from ingestion
- Used by: Ingestion layer generator
- Operations:
  - Duplicate removal (by ID)
  - Date parsing and validation
  - Missing value imputation (categorical fills, lat/lon extraction)
  - Geographic boundary validation (Chicago bounds)
  - Feature derivation (month, day, hour, weekday, is_weekend)

**Output Layer:**
- Purpose: Write cleaned data to CSV or hold in memory
- Location: `datapreprocessing/pipeline.py` (lines 118-122)
- Contains: `write_csv()` function
- Depends on: Transformed chunk iterator
- Used by: CLI main function

**Analysis Layer (Notebooks):**
- Purpose: Exploratory data analysis and visualization
- Location: `datapreprocessing/crime_pipeline.ipynb`, `datapreprocessing/cube comparison.ipynb`
- Contains: EDA cells, visualization code, statistical analysis
- Depends on: Raw CSV or processed data
- Used by: Data scientists/researchers interactively

## Data Flow

**CLI Pipeline Flow:**

1. User invokes `python pipeline.py <input.csv> --out <output.csv>`
2. Optionally run quick EDA on sample (`--eda` flag)
3. `iter_clean_chunks()` reads CSV in 200K row chunks
4. Each chunk passes through `preprocess_chunk()` for transformation
5. `write_csv()` appends cleaned chunks to output file

**Notebook Analysis Flow:**

1. Load full or partial dataset with pandas
2. Run preprocessing functions (duplicated from pipeline.py)
3. Generate 20+ visualization PNGs (temporal, spatial, statistical)
4. Iterate on analysis interactively

**State Management:**
- Stateless processing - no persistent state between runs
- Each chunk processed independently
- No checkpoint/resume capability
- Notebook state held in Jupyter kernel memory

## Key Abstractions

**Chunk Iterator:**
- Purpose: Memory-efficient processing of large CSV
- Examples: `datapreprocessing/pipeline.py:iter_clean_chunks()`
- Pattern: Generator yielding transformed DataFrames

**Schema Constants:**
- Purpose: Define expected columns, dtypes, and date columns
- Examples: `datapreprocessing/pipeline.py` lines 12-62
- Pattern: Module-level tuples and dicts (RAW_COLUMNS, DTYPES, DATE_COLUMNS)

**City Bounds:**
- Purpose: Geographic validation boundaries for Chicago
- Examples: `datapreprocessing/crime_pipeline.ipynb` (CITY_BOUNDS dict)
- Pattern: Constant dict with lat/lon min/max

## Entry Points

**CLI Entry Point:**
- Location: `datapreprocessing/pipeline.py:main()`
- Triggers: Command line invocation with argparse
- Responsibilities:
  - Parse input path, output path, chunk size
  - Optionally run EDA
  - Execute full pipeline and write output

**Notebook Entry Points:**
- Location: `datapreprocessing/crime_pipeline.ipynb` (cells 1-5)
- Triggers: Interactive cell execution
- Responsibilities:
  - Load data into memory
  - Run transformations
  - Generate visualizations

## Error Handling

**Strategy:** Fail-fast with pandas defaults, coerce on dates

**Patterns:**
- Date parsing uses `errors='coerce'` to convert unparseable dates to NaT
- No explicit try/except blocks in transformation code
- Invalid coordinates filtered out rather than raising
- Missing categorical values filled with 'UNKNOWN' string

## Cross-Cutting Concerns

**Logging:** Print statements only (no structured logging framework)
**Validation:** Implicit via pandas dtypes and boundary filtering
**Authentication:** Not applicable (local file processing)
**Configuration:** Hardcoded constants + CLI argparse

---

*Architecture analysis: 2026-01-30*
