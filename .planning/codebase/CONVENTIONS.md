# Coding Conventions

**Analysis Date:** 2026-01-30

## Naming Patterns

**Files:**
- Python modules: `snake_case.py` (e.g., `pipeline.py`)
- Jupyter notebooks: `descriptive_name.ipynb` with spaces allowed (e.g., `crime_pipeline.ipynb`, `cube comparison.ipynb`)

**Functions:**
- Use `snake_case` for all function names
- Examples from `datapreprocessing/pipeline.py`:
  - `extract_lat_lon()`
  - `preprocess_chunk()`
  - `iter_clean_chunks()`
  - `write_csv()`
  - `basic_eda()`

**Variables:**
- Local variables: `snake_case` (e.g., `missing_latlon`, `has_location_str`, `need_fill`)
- Loop variables: short descriptive names (e.g., `df`, `col`, `chunk`)

**Constants:**
- Use `UPPER_SNAKE_CASE` for module-level constants
- Examples from `datapreprocessing/pipeline.py`:
  - `RAW_COLUMNS`
  - `DTYPES`
  - `DATE_COLUMNS`
  - `CHUNKSIZE`
  - `SAMPLE_ROWS`

**Types:**
- Use standard Python typing module types: `Tuple`, `Iterable`, `Optional`

## Code Style

**Formatting:**
- Black formatter configured (detected in PyCharm/IntelliJ IDE settings)
- No standalone `.prettierrc` or `pyproject.toml` with formatting config

**Linting:**
- No explicit linting configuration detected
- IDE-based linting via PyCharm

**Line Length:**
- Not strictly enforced
- Long lines observed (e.g., line 94 in `pipeline.py` is ~130 characters)

## Import Organization

**Order:**
1. Future imports: `from __future__ import annotations`
2. Standard library: `argparse`, `re`, `pathlib`, `typing`
3. Third-party packages: `pandas`, `numpy`, `matplotlib`

**Style:**
```python
#!/usr/bin/env python3
"""Module docstring."""
from __future__ import annotations

import argparse
import re
from pathlib import Path
from typing import Iterable, Tuple

import pandas as pd
```

**Path Aliases:**
- None configured

## Error Handling

**Patterns:**
- Use `errors="coerce"` for graceful date parsing failures
- Filter out invalid data rather than raising exceptions
- Example from `datapreprocessing/pipeline.py`:
```python
df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
df = df.loc[~(df["Latitude"].isna() & df["Longitude"].isna())]
```

**Validation:**
- Bounds checking for geographic coordinates
- Data filtering rather than error raising

## Logging

**Framework:** `print()` statements (no logging framework)

**Patterns:**
- Simple print for status messages: `print(f"Wrote cleaned data to {args.out}")`
- Print for EDA output: `print("Shape (sample):", df.shape)`

## Comments

**When to Comment:**
- Module-level docstrings required
- Function docstrings for non-trivial functions
- Inline comments are minimal

**Docstring Style:**
```python
"""Short one-line description."""
```

- Uses imperative mood ("Extract", "Preprocess", "Load")
- Example from `datapreprocessing/pipeline.py`:
```python
def extract_lat_lon(location_series: pd.Series) -> Tuple[pd.Series, pd.Series]:
    """Extract latitude/longitude floats from the Location string column."""
```

## Function Design

**Size:**
- Functions are kept reasonably short (10-30 lines typical)
- Single responsibility per function

**Parameters:**
- Use type hints for all parameters
- Use default values where appropriate
- Example:
```python
def iter_clean_chunks(path: Path, chunksize: int) -> Iterable[pd.DataFrame]:
```

**Return Values:**
- Explicit return type annotations
- Use tuples for multiple return values
- Generators preferred for streaming data

## Module Design

**Exports:**
- No `__all__` declarations
- All public functions at module level

**Barrel Files:**
- Not used

**Entry Points:**
- Use `if __name__ == "__main__":` guard
- Separate `main()` function for CLI entry

## DataFrame Conventions

**Mutation:**
- Always copy DataFrames before in-place operations: `df = df.copy()`
- Use `inplace=True` sparingly, prefer reassignment

**Column Access:**
- String column names with bracket notation: `df["Column Name"]`
- Columns with spaces preserved from source data

**Method Chaining:**
- Limited chaining, prefer explicit intermediate steps

## CLI Pattern

**Framework:** `argparse`

**Structure:**
```python
def main() -> None:
    parser = argparse.ArgumentParser(description="...")
    parser.add_argument("input", type=Path, help="...")
    parser.add_argument("--out", type=Path, default=Path("output.csv"))
    parser.add_argument("--flag", action="store_true")
    args = parser.parse_args()
    # ... logic using args
```

## Notebook Conventions

**Cell Organization:**
1. Imports and configuration constants at top
2. Function definitions
3. Execution/analysis cells

**Configuration:**
- Define constants in early cells: `CHUNKSIZE`, `SAMPLE_ROWS`, `DATA_PATH`
- Use dictionaries for grouped settings: `DTYPES`, `CITY_BOUNDS`

---

*Convention analysis: 2026-01-30*
