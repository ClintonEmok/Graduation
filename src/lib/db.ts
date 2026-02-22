import duckdb from 'duckdb';
import { join } from 'path';

let db: duckdb.Database | null = null;

/**
 * Get the path to the crime data CSV file.
 * The CSV contains ~8.5M rows from 2001-2026.
 */
export const getDataPath = (): string => {
  return join(process.cwd(), 'data', 'source.csv');
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

/**
 * Ensure the sorted crimes table exists for zone map optimization.
 * Creates a sorted copy of the crimes data ordered by Date column,
 * which enables DuckDB to skip irrelevant row groups when querying date ranges.
 * 
 * @returns The table name to use for queries ('crimes_sorted')
 */
export const ensureSortedCrimesTable = async (): Promise<string> => {
  const database = await getDb();
  const dataPath = getDataPath();

  return new Promise((resolve, reject) => {
    // First check if table already exists
    database.all("SELECT name FROM sqlite_master WHERE type='table' AND name='crimes_sorted'", (err: Error | null, rows: unknown[]) => {
      if (err) {
        console.error('Error checking for crimes_sorted table:', err);
        reject(err);
        return;
      }
      
      const tables = rows as { name: string }[];
      if (tables.length > 0) {
        // Table exists, use it
        console.log('crimes_sorted table already exists');
        resolve('crimes_sorted');
        return;
      }
      
      // Table doesn't exist, create it
      console.log('Creating crimes_sorted table (zone map optimized)...');
      
      const createQuery = `
        CREATE TABLE crimes_sorted AS 
        SELECT * FROM read_csv_auto('${dataPath}')
        WHERE "Date" IS NOT NULL
        ORDER BY "Date"
      `;

      database.run(createQuery, (runErr: Error | null) => {
        if (runErr) {
          console.error('Error creating crimes_sorted table:', runErr);
          reject(runErr);
          return;
        }

        console.log('crimes_sorted table ready with zone map optimization');
        resolve('crimes_sorted');
      });
    });
  });
};
