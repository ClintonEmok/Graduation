# External Integrations

**Analysis Date:** 2026-01-30

## APIs & External Services

**None detected.**

This is a self-contained data science project with no external API dependencies.

## Data Storage

**Databases:**
- None (local CSV files only)

**File Storage:**
- Local filesystem only
- Raw data: `datapreprocessing/Crimes_-_2001_to_Present_20260114.csv` (2.3GB)
- Output: Local PNG files for visualizations

**Caching:**
- None (data loaded fresh each run)

## Authentication & Identity

**Auth Provider:**
- None required
- No user authentication in codebase

## Monitoring & Observability

**Error Tracking:**
- None

**Logs:**
- Standard print statements to stdout
- No logging framework configured

## CI/CD & Deployment

**Hosting:**
- Local development only
- No deployment configuration

**CI Pipeline:**
- None

## Environment Configuration

**Required env vars:**
- None

**Secrets location:**
- No secrets required

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Data Sources

**Chicago Crime Data:**
- Source: Chicago Data Portal (implied by filename)
- Format: CSV
- File: `Crimes_-_2001_to_Present_20260114.csv`
- Size: 2.3GB (~8 million records)
- Download: Manual (not automated)

**Data Pipeline:**
- Input: Raw CSV from Chicago Data Portal
- Processing: `pipeline.py` CLI or `crime_pipeline.ipynb`
- Output: Cleaned CSV and visualization PNGs

## Network Dependencies

**HTTP Libraries (Installed but Not Used):**
- httpx 0.28.1
- requests 2.32.5
- urllib3 2.6.3

These packages are present in the virtual environment (likely as transitive dependencies of JupyterLab) but no HTTP requests are made by the codebase.

## Integration Opportunities

**If expanding this project, consider:**
- Chicago Data Portal API for automated data refresh
- Database (PostgreSQL/PostGIS) for persistent storage
- Cloud storage (S3) for large CSV files
- Notebook hosting (JupyterHub, Google Colab)

---

*Integration audit: 2026-01-30*
