import duckdb from 'duckdb';
import { join } from 'path';

let db: duckdb.Database | null = null;

/**
 * Get the path to the crime data CSV file.
 * The CSV contains ~8.5M rows from 2001-2026.
 */
export const getDataPath = (): string => {
  return join(process.cwd(), 'data', 'sources', 'Crimes_-_2001_to_Present_20260114.csv');
};

/**
 * Parse a date string in "MM/DD/YYYY HH:MM:SS A" format (US date format)
 * and return a Date object.
 * 
 * @param dateStr - Date string like "01/05/2026 12:00:00 AM"
 * @returns Parsed Date object
 */
export const parseDate = (dateStr: string): Date => {
  // DuckDB format: '%m/%d/%Y %I:%M:%S %p'
  // This parses "01/05/2026 12:00:00 AM" to a proper Date
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }
  return parsed;
};

/**
 * Parse a date string and return Unix epoch seconds.
 * Handles "MM/DD/YYYY HH:MM:SS A" format.
 * 
 * @param dateStr - Date string like "01/05/2026 12:00:00 AM"
 * @returns Unix epoch seconds
 */
export const epochSeconds = (dateStr: string): number => {
  return Math.floor(parseDate(dateStr).getTime() / 1000);
};

export const getDb = async (): Promise<duckdb.Database> => {
  if (!db) {
    db = new duckdb.Database(':memory:');
  }
  return db;
};
