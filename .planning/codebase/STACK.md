# Technology Stack

**Analysis Date:** 2026-01-30

## Languages

**Primary:**
- Python 3.13.3 - All data processing, analysis, and visualization code

**Secondary:**
- None

## Runtime

**Environment:**
- CPython 3.13.3.final.0
- virtualenv 20.31.2

**Package Manager:**
- pip 24.3.1
- Lockfile: missing (no requirements.txt, pyproject.toml, or setup.py detected)

## Frameworks

**Core:**
- pandas 2.3.3 - Data manipulation and CSV processing
- numpy 2.4.1 - Numerical computing
- geopandas 1.1.2 - Geospatial data handling

**Visualization:**
- matplotlib 3.10.8 - Plotting and charts
- seaborn 0.13.2 - Statistical visualization

**Geospatial:**
- shapely 2.1.2 - Geometric objects and operations
- pyproj 3.7.2 - Coordinate transformations
- pyogrio 0.12.1 - Geospatial I/O

**Development:**
- jupyterlab 4.5.2 - Interactive notebook environment
- ipython 9.9.0 - Enhanced Python shell

**Testing:**
- None detected

**Build/Dev:**
- None (no build system configured)

## Key Dependencies

**Critical:**
- pandas 2.3.3 - Core data processing for crime CSV (2.3GB file)
- numpy 2.4.1 - Numerical operations for statistical analysis
- geopandas 1.1.2 - Spatial data handling for geographic crime analysis

**Infrastructure:**
- jupyterlab 4.5.2 - Primary development interface
- matplotlib 3.10.8 - All visualization output (20+ generated PNG files)

**Data Science Stack (Full List):**
- contourpy 1.3.3 - Contour calculations
- cycler 0.12.1 - Composable style cycles
- kiwisolver 1.4.9 - Constraint solving for layouts
- pillow 12.1.0 - Image processing
- fonttools 4.61.1 - Font handling

**HTTP/Network (installed but not actively used):**
- httpx 0.28.1
- requests 2.32.5
- urllib3 2.6.3

## Configuration

**Environment:**
- No environment variables required
- No .env files detected
- No secrets or API keys needed

**Virtual Environment:**
- Location: `datapreprocessing/.venv/`
- Python path: `/opt/homebrew/Cellar/python@3.13/3.13.3_1/bin`
- Include system site-packages: false

**IDE Configuration:**
- PyCharm/IntelliJ project files in `datapreprocessing/.idea/`
- Python SDK: "Python 3.13 (datapreprocessing)"
- Black formatter configured

**Build:**
- No build configuration (pure Python scripts and notebooks)

## Platform Requirements

**Development:**
- macOS (darwin platform detected)
- Homebrew Python 3.13 installation
- ~4GB RAM recommended for processing 2.3GB CSV file

**Production:**
- Not applicable (local data science project)
- No deployment configuration

## Project Structure

**Source Files:**
- `datapreprocessing/pipeline.py` - CLI preprocessing script (160 lines)
- `datapreprocessing/crime_pipeline.ipynb` - Main analysis notebook
- `datapreprocessing/cube comparison.ipynb` - 3D visualization comparison notebook

**Data Files:**
- `datapreprocessing/Crimes_-_2001_to_Present_20260114.csv` - Raw data (2.3GB)
- 20 generated visualization PNGs (`viz_*.png`)

**Generated Artifacts:**
- `crime_preprocessing_visualizations.png`
- `crime_statistical_distributions.png`

---

*Stack analysis: 2026-01-30*
