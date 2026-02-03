# Testing Patterns

**Analysis Date:** 2026-01-30

## Test Framework

**Runner:**
- pytest 8.1.1 (installed in virtual environment)
- Config: No configuration file detected

**Assertion Library:**
- pytest built-in assertions (available but not currently used)

**Run Commands:**
```bash
pytest                 # Run all tests (none exist)
pytest -v              # Verbose mode
pytest --cov           # Coverage (not configured)
```

## Test File Organization

**Location:**
- No test files exist in the project
- No `tests/` directory
- No co-located test files

**Current State:**
- Testing infrastructure (pytest) is installed but unused
- No test patterns established

## Recommended Test Structure

Based on the project structure, implement tests as follows:

**Directory Layout:**
```
datapreprocessing/
├── pipeline.py
├── tests/
│   ├── __init__.py
│   ├── test_pipeline.py
│   └── fixtures/
│       └── sample_crimes.csv
```

**Naming Convention:**
- Test files: `test_{module}.py`
- Test functions: `test_{function_name}_{scenario}`

## Functions to Test

From `datapreprocessing/pipeline.py`:

**Unit Tests Needed:**

1. `extract_lat_lon()`:
   - Test valid location string parsing
   - Test handling of malformed strings
   - Test empty/null values

2. `preprocess_chunk()`:
   - Test duplicate removal
   - Test date parsing
   - Test null value filling
   - Test coordinate filtering
   - Test derived column creation (month, day, hour, weekday, is_weekend)

3. `iter_clean_chunks()`:
   - Test chunk iteration
   - Test proper dtype preservation

4. `write_csv()`:
   - Test file creation
   - Test append mode behavior
   - Test header handling

## Suggested Test Patterns

**Basic Unit Test:**
```python
import pytest
import pandas as pd
from pipeline import extract_lat_lon, preprocess_chunk

def test_extract_lat_lon_valid():
    """Test latitude/longitude extraction from valid location strings."""
    series = pd.Series(["(41.881832, -87.623177)"])
    lat, lon = extract_lat_lon(series)
    assert lat.iloc[0] == pytest.approx(41.881832, rel=1e-5)
    assert lon.iloc[0] == pytest.approx(-87.623177, rel=1e-5)

def test_extract_lat_lon_invalid():
    """Test handling of invalid location strings."""
    series = pd.Series(["invalid", "", None])
    lat, lon = extract_lat_lon(series)
    assert lat.isna().all()
    assert lon.isna().all()
```

**DataFrame Testing:**
```python
def test_preprocess_chunk_removes_duplicates():
    """Test that duplicate IDs are removed."""
    df = pd.DataFrame({
        "ID": [1, 1, 2],
        "Date": ["01/01/2024 12:00:00 AM"] * 3,
        # ... other required columns
    })
    result = preprocess_chunk(df)
    assert len(result) == 2
    assert result["ID"].nunique() == 2
```

**Fixture Pattern:**
```python
@pytest.fixture
def sample_crime_df():
    """Create a minimal valid crime DataFrame for testing."""
    return pd.DataFrame({
        "ID": [1, 2, 3],
        "Case Number": ["HZ123456", "HZ123457", "HZ123458"],
        "Date": ["01/01/2024 12:00:00 AM"] * 3,
        "Block": ["001XX N STATE ST"] * 3,
        "IUCR": ["0110"] * 3,
        "Primary Type": ["THEFT", "BATTERY", "THEFT"],
        "Description": ["OVER $500"] * 3,
        "Location Description": ["STREET"] * 3,
        "Arrest": [True, False, True],
        "Domestic": [False, False, False],
        "Beat": [1, 2, 3],
        "District": [1, 1, 2],
        "Ward": [42, 42, 43],
        "Community Area": [32, 32, 33],
        "FBI Code": ["06"] * 3,
        "X Coordinate": [1176000.0] * 3,
        "Y Coordinate": [1901000.0] * 3,
        "Year": [2024, 2024, 2024],
        "Updated On": ["01/01/2024 12:00:00 AM"] * 3,
        "Latitude": [41.8818, 41.8819, 41.8820],
        "Longitude": [-87.6232, -87.6233, -87.6234],
        "Location": ["(41.8818, -87.6232)"] * 3,
    })
```

## Mocking

**Framework:** pytest-mock or unittest.mock (not currently installed)

**Patterns (Recommended):**
```python
from unittest.mock import patch, MagicMock

def test_basic_eda_prints_output(capsys):
    """Test that EDA prints expected output."""
    with patch("pandas.read_csv") as mock_read:
        mock_read.return_value = sample_df
        basic_eda(Path("fake.csv"), sample_rows=10)
    
    captured = capsys.readouterr()
    assert "Shape (sample):" in captured.out
```

**What to Mock:**
- File I/O operations for unit tests
- Large CSV reads
- External dependencies

**What NOT to Mock:**
- pandas DataFrame operations
- Core transformation logic

## Fixtures and Factories

**Test Data:**
- Create minimal DataFrames matching expected schema
- Use pytest fixtures for reusable test data

**Location:**
- Define fixtures in `conftest.py` for shared access
- Place sample CSV files in `tests/fixtures/`

## Coverage

**Requirements:** None enforced

**Recommended Setup:**
```bash
pip install pytest-cov
pytest --cov=datapreprocessing --cov-report=html
```

**Suggested Targets:**
- Critical functions: 80%+ coverage
- `preprocess_chunk()`: High priority
- `extract_lat_lon()`: High priority

## Test Types

**Unit Tests:**
- Test individual functions in isolation
- Focus on transformation logic
- Mock file I/O

**Integration Tests:**
- Test full pipeline with small sample CSV
- Verify end-to-end data flow
- Test CLI argument parsing

**E2E Tests:**
- Not applicable for this data processing pipeline
- Consider validation tests on output CSV format

## Common Patterns

**Async Testing:**
- Not applicable (no async code in project)

**Error Testing:**
```python
def test_preprocess_handles_missing_dates():
    """Test graceful handling of unparseable dates."""
    df = pd.DataFrame({
        "ID": [1],
        "Date": ["not-a-date"],
        # ... other columns
    })
    result = preprocess_chunk(df)
    assert result["Date"].isna().all()
```

**Parametrized Testing:**
```python
@pytest.mark.parametrize("lat,lon,expected", [
    (41.5, -87.5, True),   # Valid Chicago coords
    (40.0, -87.5, False),  # Outside lat bounds
    (41.5, -89.0, False),  # Outside lon bounds
])
def test_coordinate_filtering(lat, lon, expected, sample_crime_df):
    """Test geographic boundary filtering."""
    sample_crime_df["Latitude"] = lat
    sample_crime_df["Longitude"] = lon
    result = preprocess_chunk(sample_crime_df)
    assert (len(result) > 0) == expected
```

## Test Priority Recommendations

**High Priority (Implement First):**
1. `test_preprocess_chunk_*` - Core business logic
2. `test_extract_lat_lon_*` - Data extraction accuracy
3. `test_iter_clean_chunks_*` - Pipeline integrity

**Medium Priority:**
1. CLI argument parsing tests
2. File output format tests
3. Edge case handling

**Low Priority:**
1. EDA output formatting tests

---

*Testing analysis: 2026-01-30*
