# Codebase Structure

**Analysis Date:** 2026-01-30

## Directory Layout

```
Project/
├── .planning/                    # GSD planning documents
│   └── codebase/                 # Codebase analysis docs
├── src/                          # Next.js Application Source
│   ├── app/                      # Next.js App Router
│   ├── components/               # React Components
│   │   ├── map/                  # MapLibre Components
│   │   └── viz/                  # 3D Visualization Components
│   └── lib/                      # Utility functions
├── datapreprocessing/            # Main project directory
│   ├── .git/                     # Git repository (no commits yet)
│   ├── .idea/                    # PyCharm/IntelliJ IDE config
│   ├── .venv/                    # Python virtual environment
│   ├── pipeline.py               # CLI preprocessing script
│   ├── crime_pipeline.ipynb      # Main EDA notebook
│   ├── cube comparison.ipynb     # Time visualization notebook
│   ├── Crimes_-_2001_to_Present_20260114.csv  # Raw dataset (~2.3GB)
│   └── viz_*.png                 # Generated visualization outputs
```

## Directory Purposes

**src/:**
- Purpose: Next.js application source code
- Contains: App router, React components, 3D visualization logic
- Key files: `src/components/map/MapBase.tsx`, `src/lib/projection.ts`

**datapreprocessing/:**
- Purpose: Primary project containing all source code and data
- Contains: Python scripts, Jupyter notebooks, CSV data, visualization outputs
- Key files: `pipeline.py`, `crime_pipeline.ipynb`

**.venv/:**
- Purpose: Python virtual environment with project dependencies
- Contains: Installed packages (pandas, matplotlib, numpy, etc.)
- Generated: Yes (via `python -m venv`)
- Committed: No

**.idea/:**
- Purpose: PyCharm/IntelliJ IDE configuration
- Contains: Project settings, code style, run configurations
- Generated: Yes (by IDE)
- Committed: Yes (in staging)

**.planning/codebase/:**
- Purpose: GSD workflow documentation
- Contains: Architecture and structure analysis documents
- Generated: No (manually created)
- Committed: Should be

## Key File Locations

**Entry Points:**
- `datapreprocessing/pipeline.py`: CLI data preprocessing tool
- `datapreprocessing/crime_pipeline.ipynb`: Interactive EDA notebook
- `datapreprocessing/cube comparison.ipynb`: Time visualization experiments

**Configuration:**
- `datapreprocessing/.venv/`: Virtual environment (Python 3.13)
- `datapreprocessing/.idea/`: IDE settings

**Core Logic:**
- `datapreprocessing/pipeline.py`: All transformation logic (160 lines)
  - Lines 12-60: Schema constants (RAW_COLUMNS, DTYPES)
  - Lines 65-70: `extract_lat_lon()` - coordinate parsing
  - Lines 73-102: `preprocess_chunk()` - main transformation
  - Lines 105-116: `iter_clean_chunks()` - chunked reading
  - Lines 118-122: `write_csv()` - output writing
  - Lines 125-139: `basic_eda()` - quick EDA
  - Lines 142-159: `main()` - CLI entry point

**Data:**
- `datapreprocessing/Crimes_-_2001_to_Present_20260114.csv`: Raw input (~8.5M rows, 2.3GB)

**Outputs:**
- `datapreprocessing/viz_*.png`: 20 visualization files (numbered 01-20)
- `datapreprocessing/crime_preprocessing_visualizations.png`: Combined viz
- `datapreprocessing/crime_statistical_distributions.png`: Stats viz

## Naming Conventions

**Files:**
- Python scripts: `snake_case.py` (e.g., `pipeline.py`)
- Notebooks: `snake_case.ipynb` or descriptive with spaces (e.g., `cube comparison.ipynb`)
- Data files: Source name preserved (e.g., `Crimes_-_2001_to_Present_*.csv`)
- Visualizations: `viz_##_description.png` (numbered, snake_case)

**Functions:**
- Use `snake_case` (e.g., `preprocess_chunk`, `extract_lat_lon`)

**Variables:**
- Use `snake_case` for variables (e.g., `missing_latlon`, `need_fill`)
- Use `UPPER_SNAKE_CASE` for constants (e.g., `RAW_COLUMNS`, `DTYPES`)

**Columns (DataFrame):**
- Original data: Title Case with spaces (e.g., `Primary Type`, `Case Number`)
- Derived features: lowercase (e.g., `month`, `day`, `hour`, `weekday`, `is_weekend`)

## Where to Add New Code

**New Transformation Logic:**
- Add to `datapreprocessing/pipeline.py` as new function
- Follow existing pattern: function takes DataFrame, returns DataFrame
- Import in notebook if needed for interactive use

**New Analysis/Visualization:**
- Add cells to `datapreprocessing/crime_pipeline.ipynb`
- Or create new notebook in `datapreprocessing/` directory
- Save output visualizations as `viz_##_description.png`

**New CLI Commands:**
- Extend argparse in `datapreprocessing/pipeline.py:main()`
- Add subparsers if multiple commands needed

**Utility Functions:**
- Currently no separate utils module
- Add to `pipeline.py` above the functions that use them
- Consider creating `utils.py` if pipeline.py grows beyond 300 lines

**Tests:**
- Currently no test infrastructure
- Would add as `datapreprocessing/test_pipeline.py`
- Use pytest (add to requirements when creating)

## Special Directories

**.venv/:**
- Purpose: Python virtual environment
- Generated: Yes
- Committed: No (should be in .gitignore)

**.idea/:**
- Purpose: IDE configuration (PyCharm)
- Generated: Yes (by IDE)
- Committed: Currently yes (unusual - typically gitignored)

**.git/:**
- Purpose: Git repository metadata
- Generated: Yes
- Committed: N/A (it IS the repo)
- Note: Repository has staged files but no commits yet

**Output Files (viz_*.png):**
- Purpose: Generated visualizations from notebook
- Generated: Yes (by running notebook cells)
- Committed: Currently staged (consider gitignoring large outputs)

## Git Status

**Repository:** `datapreprocessing/.git`
**Branch:** master (no commits)
**Staged files:**
- `.idea/` configuration files
- `Crimes_-_2001_to_Present_20260114.csv` (2.3GB - should not be committed)
- `crime_pipeline.ipynb`
- `cube comparison.ipynb`
- `pipeline.py`

**Recommendations:**
- Create `.gitignore` to exclude `.venv/`, `*.csv`, and large outputs
- Remove large CSV from staging before first commit

---

*Structure analysis: 2026-01-30*
