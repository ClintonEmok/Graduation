# Codebase Concerns

**Analysis Date:** 2026-01-30

## Tech Debt

**Deprecated Pandas API Usage:**
- Issue: Using deprecated `infer_datetime_format=True` parameter in pandas read_csv calls
- Files: `datapreprocessing/pipeline.py` (lines 110, 126)
- Impact: FutureWarning raised during execution; will break in future pandas versions
- Fix approach: Remove the `infer_datetime_format` parameter entirely as strict parsing is now the default behavior

**Code Duplication Between Script and Notebook:**
- Issue: Preprocessing logic duplicated between `pipeline.py` and `crime_pipeline.ipynb`
- Files: `datapreprocessing/pipeline.py`, `datapreprocessing/crime_pipeline.ipynb`
- Impact: Changes to preprocessing logic must be made in two places; drift between implementations likely
- Fix approach: Refactor common functions into a shared module and import in both script and notebook

**Inconsistent Datetime Parsing:**
- Issue: Notebooks show UserWarning about datetime format inference falling back to `dateutil`
- Files: `datapreprocessing/crime_pipeline.ipynb` (cell outputs around line 233)
- Impact: Slow parsing due to per-element processing; potential inconsistent behavior
- Fix approach: Explicitly specify datetime format string (e.g., `%m/%d/%Y %I:%M:%S %p`)

## Known Bugs

**None identified at code level.**

Notebook outputs show successful execution with expected data transformations.

## Security Considerations

**Large Data File in Repository:**
- Risk: 2.2GB CSV file (`Crimes_-_2001_to_Present_20260114.csv`) appears to be present in the repository
- Files: `datapreprocessing/Crimes_-_2001_to_Present_20260114.csv`
- Current mitigation: None visible
- Recommendations: Add `.gitignore` file excluding `*.csv` and large data files; use Git LFS or external data storage

**Missing .gitignore:**
- Risk: Sensitive files, large data files, and virtual environment could be committed
- Files: Project root and `datapreprocessing/` directory
- Current mitigation: None - no `.gitignore` file found
- Recommendations: Create `.gitignore` with entries for `.venv/`, `*.csv`, `.DS_Store`, `.idea/`, `*.png`, `__pycache__/`

**Virtual Environment Committed:**
- Risk: `.venv/` directory appears to be in the repository (observed via file exploration)
- Files: `datapreprocessing/.venv/`
- Current mitigation: None
- Recommendations: Remove `.venv/` from tracking; add to `.gitignore`; provide `requirements.txt` instead

## Performance Bottlenecks

**Row-by-Row Geometry Creation:**
- Problem: Geometry column created using `df.apply()` with lambda function
- Files: `datapreprocessing/crime_pipeline.ipynb` (Step 8, around line 1128-1132)
- Cause: `apply(axis=1)` iterates row-by-row, bypassing pandas vectorization
- Improvement path: Use `gpd.points_from_xy(df['Longitude'], df['Latitude'])` for vectorized Point creation

**Full Dataset Loading:**
- Problem: Notebook loads entire 8.4M+ row dataset into memory
- Files: `datapreprocessing/crime_pipeline.ipynb`
- Cause: Single `pd.read_csv()` call without chunking for analysis
- Improvement path: For large analyses, use the chunked approach from `pipeline.py` or Dask/Polars

**Distance Calculation Via Apply:**
- Problem: Distance to downtown calculated using row-wise `.apply()` on geometry column
- Files: `datapreprocessing/crime_pipeline.ipynb` (Step 8, lines 1138-1140)
- Cause: Shapely distance called per-row in Python loop
- Improvement path: Use vectorized shapely operations or numpy-based haversine formula

## Fragile Areas

**Hardcoded File Paths:**
- Files: `datapreprocessing/crime_pipeline.ipynb` (line 26: `DATA_PATH = Path('Crimes_-_2001_to_Present_20260114.csv')`)
- Why fragile: Path assumes execution from specific directory; filename includes date, will need updating for new data
- Safe modification: Use environment variables or config file for data paths
- Test coverage: None

**Hardcoded Geographic Bounds:**
- Files: `datapreprocessing/crime_pipeline.ipynb` (lines 71-76), `datapreprocessing/pipeline.py` (line 94)
- Why fragile: City boundary values hardcoded; inconsistent between file and variable definitions
- Safe modification: Move constants to a shared configuration module
- Test coverage: None

**Notebook Filename with Space:**
- Files: `datapreprocessing/cube comparison.ipynb`
- Why fragile: Filename contains space which can cause issues with command-line tools and imports
- Safe modification: Rename to `cube_comparison.ipynb`
- Test coverage: Not applicable

## Scaling Limits

**Memory Constraints:**
- Current capacity: Loading 2.7M rows uses ~458MB (after filtering to 2015-2025)
- Limit: Full dataset (8.4M rows) may exceed available memory on smaller machines
- Scaling path: Use chunked processing (already implemented in `pipeline.py`), or migrate to Dask/Polars

**Single-Threaded Processing:**
- Current capacity: Sequential row processing
- Limit: Processing time scales linearly with data size
- Scaling path: Parallelize chunk processing; use multiprocessing for independent operations

## Dependencies at Risk

**No Explicit Dependency Management:**
- Risk: No `requirements.txt` or `pyproject.toml` found at project root
- Impact: Reproducibility issues; version conflicts likely
- Migration plan: Generate `pip freeze > requirements.txt` from `.venv`; consider `pyproject.toml` for modern packaging

**Pandas Version Sensitivity:**
- Risk: Deprecated API usage tied to specific pandas versions
- Impact: Code will break on pandas 3.x
- Migration plan: Update to non-deprecated API; pin pandas version range in requirements

## Missing Critical Features

**No Automated Tests:**
- Problem: No test files found (`test_*.py`, `*_test.py`)
- Blocks: Cannot verify preprocessing correctness after changes; regression risk
- Recommendation: Add unit tests for `preprocess_chunk()`, `extract_lat_lon()`, and data validation logic

**No Input Validation:**
- Problem: No checks for input file existence before processing
- Blocks: Unclear error messages when file missing
- Recommendation: Add explicit file existence checks with helpful error messages

**No Data Validation Pipeline:**
- Problem: No schema validation for input CSV; assumes column names match expectations
- Blocks: Silent failures if CSV format changes
- Recommendation: Add column presence/type validation at start of pipeline

## Test Coverage Gaps

**Preprocessing Functions:**
- What's not tested: `preprocess_chunk()`, `extract_lat_lon()`, `iter_clean_chunks()`
- Files: `datapreprocessing/pipeline.py`
- Risk: Subtle bugs in data transformation go unnoticed
- Priority: High

**Boundary Filtering Logic:**
- What's not tested: Latitude/longitude bounds filtering
- Files: `datapreprocessing/pipeline.py` (line 94), `datapreprocessing/crime_pipeline.ipynb`
- Risk: Records incorrectly included or excluded
- Priority: Medium

**Temporal Feature Extraction:**
- What's not tested: Month, day, hour, weekday extraction from dates
- Files: `datapreprocessing/pipeline.py` (lines 96-100)
- Risk: Timezone or DST issues undetected
- Priority: Medium

---

*Concerns audit: 2026-01-30*
