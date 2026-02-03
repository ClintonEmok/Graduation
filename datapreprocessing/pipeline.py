#!/usr/bin/env python3
"""Chunked preprocessing and merging for the Chicago crimes CSV."""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Iterable, Tuple, Dict, Any

import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Input files (adjust if paths change)
DISTRICTS_FILE = Path("datapreprocessing/data/Police_Stations_20260202.csv")
IUCR_FILE = Path(
    "datapreprocessing/data/Chicago_Police_Department_-_Illinois_Uniform_Crime_Reporting_(IUCR)_Codes_20260202.csv"
)

# Columns to read from the raw crimes file
RAW_COLUMNS = [
    "ID",
    "Date",
    "IUCR",
    "Primary Type",
    "District",
    "Latitude",
    "Longitude",
    "Location",
]

DTYPES = {
    "ID": "int64",
    "IUCR": "string",
    "Primary Type": "string",
    "District": "string",  # Read as string to handle '022' vs '22'
    "Latitude": "float64",
    "Longitude": "float64",
    "Location": "string",
}

DATE_COLUMNS = ["Date"]


def load_lookups() -> Tuple[Dict[str, str], pd.DataFrame]:
    """Load District and IUCR lookup tables."""
    # Load Districts
    if not DISTRICTS_FILE.exists():
        print(f"Warning: {DISTRICTS_FILE} not found. Skipping district merge.")
        district_map = {}
    else:
        dist_df = pd.read_csv(DISTRICTS_FILE, dtype=str)
        # Normalize district key: remove leading zeros if any, or just ensure consistency
        # The crimes table usually has districts like "001", "022". The Stations file has "1", "18".
        # Let's normalize both to integer strings without padding for matching.

        district_map = {}
        for _, row in dist_df.iterrows():
            d_id = row.get("DISTRICT")
            d_name = row.get("DISTRICT NAME")
            if pd.notna(d_id) and pd.notna(d_name) and d_id != "Headquarters":
                try:
                    # Normalize to int str
                    key = str(int(d_id))
                    district_map[key] = d_name
                except ValueError:
                    continue

    # Load IUCR
    # We mainly use this to validate or get descriptions, but Primary Type is usually present.
    # We'll just load it for potential future use or basic validation.
    if not IUCR_FILE.exists():
        print(f"Warning: {IUCR_FILE} not found.")
        iucr_df = pd.DataFrame()
    else:
        iucr_df = pd.read_csv(IUCR_FILE, dtype=str)

    return district_map, iucr_df


def extract_lat_lon(location_series: pd.Series) -> Tuple[pd.Series, pd.Series]:
    """Extract latitude/longitude floats from the Location string column."""
    match = location_series.str.extract(r"\(([-\d\.]+),\s*([-\d\.]+)\)")
    lat = match[0].astype(float)
    lon = match[1].astype(float)
    return lat, lon


def preprocess_chunk(
    df: pd.DataFrame, district_map: Dict[str, str], cutoff_date: pd.Timestamp
) -> pd.DataFrame:
    df = df.copy()

    # Drop duplicates
    df.drop_duplicates(subset="ID", inplace=True)

    # Clean Date
    df["Date"] = pd.to_datetime(
        df["Date"], format="%m/%d/%Y %I:%M:%S %p", errors="coerce"
    )

    # Filter by date
    df = df[df["Date"] >= cutoff_date]
    if df.empty:
        return df

    # Fill missing Lat/Lon from Location string if available
    missing_latlon = df["Latitude"].isna() | df["Longitude"].isna()
    has_location_str = df["Location"].notna()
    need_fill = missing_latlon & has_location_str
    if need_fill.any():
        lat, lon = extract_lat_lon(df.loc[need_fill, "Location"])
        df.loc[need_fill, "Latitude"] = lat
        df.loc[need_fill, "Longitude"] = lon

    # Drop rows without valid location
    df = df.dropna(subset=["Latitude", "Longitude"])

    # Filter Chicago approximate bounds
    df = df[
        (df["Latitude"].between(41.6, 42.1, inclusive="both"))
        & (df["Longitude"].between(-87.9, -87.5, inclusive="both"))
    ]

    # Map District Name
    # Normalize crime district column to match key format (int string)
    def normalize_dist(d):
        try:
            return str(int(d))
        except (ValueError, TypeError):
            return None

    df["dist_key"] = df["District"].apply(normalize_dist)
    df["district_name"] = df["dist_key"].map(district_map).fillna("Unknown")

    # Rename columns for output
    # Output: id, type, lat, lon, timestamp, district, district_name
    df["timestamp"] = df["Date"].dt.strftime("%Y-%m-%dT%H:%M:%SZ")

    result = df.rename(
        columns={
            "ID": "id",
            "Primary Type": "type",
            "Latitude": "lat",
            "Longitude": "lon",
            "dist_key": "district",
        }
    )

    return result[
        ["id", "type", "lat", "lon", "timestamp", "district", "district_name"]
    ]


def iter_clean_chunks(
    path: Path, chunksize: int, district_map: Dict[str, str]
) -> Iterable[pd.DataFrame]:
    # 5 years ago
    cutoff_date = pd.Timestamp.now() - pd.DateOffset(years=5)
    print(f"Filtering data since {cutoff_date.date()}")

    reader = pd.read_csv(
        path,
        usecols=RAW_COLUMNS,
        dtype=DTYPES,
        chunksize=chunksize,
        na_values={"": None},
    )

    for i, chunk in enumerate(reader):
        cleaned = preprocess_chunk(chunk, district_map, cutoff_date)
        if not cleaned.empty:
            yield cleaned


def write_csv(chunks: Iterable[pd.DataFrame], output_path: Path) -> None:
    first = True
    count = 0
    for chunk in chunks:
        chunk.to_csv(output_path, mode="w" if first else "a", header=first, index=False)
        count += len(chunk)
        first = False
        print(f"Processed {count} rows...", end="\r")
    print(f"\nTotal processed rows: {count}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Preprocess Chicago crimes CSV.")
    parser.add_argument("input", type=Path, help="Path to Crimes CSV")
    parser.add_argument(
        "--out", type=Path, default=Path("data/source.csv"), help="Output CSV path"
    )
    parser.add_argument("--chunksize", type=int, default=200_000, help="Rows per chunk")
    args = parser.parse_args()

    # Create output dir if needed
    args.out.parent.mkdir(parents=True, exist_ok=True)

    print("Loading lookups...")
    district_map, _ = load_lookups()

    print(f"Processing {args.input}...")
    chunks = iter_clean_chunks(args.input, args.chunksize, district_map)
    write_csv(chunks, args.out)
    print(f"Done. Saved to {args.out}")


if __name__ == "__main__":
    main()
