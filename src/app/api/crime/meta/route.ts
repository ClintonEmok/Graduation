import { NextResponse } from 'next/server';
import { getDb, getDataPath } from '@/lib/db';
import { existsSync } from 'fs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const dataPath = getDataPath();
    if (!existsSync(dataPath)) {
      return NextResponse.json(
        {
          error: 'Dataset not found',
          path: dataPath,
          hint: 'Place crime CSV under data/sources/ or use mock-data flows.'
        },
        { status: 404 }
      );
    }

    const db = await getDb();
    
    // DuckDB query to get metadata from CSV with date parsing
    // Date column is already TIMESTAMP from read_csv_auto, extract epoch directly
    const result: {
      min_time: string;
      max_time: string;
      min_lat: number;
      max_lat: number;
      min_lon: number;
      max_lon: number;
      count: number | string;
    }[] = await new Promise((resolve, reject) => {
        db.all(`
            SELECT 
                MIN(EXTRACT(EPOCH FROM "Date")) as min_time,
                MAX(EXTRACT(EPOCH FROM "Date")) as max_time,
                MIN("Latitude") as min_lat,
                MAX("Latitude") as max_lat,
                MIN("Longitude") as min_lon,
                MAX("Longitude") as max_lon,
                COUNT(*) as count
            FROM read_csv_auto('${dataPath}')
            WHERE "Date" IS NOT NULL AND "Latitude" IS NOT NULL AND "Longitude" IS NOT NULL
        `, (err: Error | null, res: any[]) => {
            if (err) reject(err);
            else resolve(res);
        });
    });

    if (!result || result.length === 0) {
      throw new Error('No metadata found');
    }

    const row = result[0];
    
    // Convert BigInt values to regular numbers for JSON serialization
    const minTime = Number(row.min_time);
    const maxTime = Number(row.max_time);

    // Get distinct crime types
    const crimeTypesResult: { types: string }[] = await new Promise((resolve, reject) => {
      db.all(`
        SELECT GROUP_CONCAT(DISTINCT "Primary Type", ',') as types
        FROM read_csv_auto('${dataPath}')
        WHERE "Primary Type" IS NOT NULL
      `, (err: Error | null, res: any[]) => {
        if (err) reject(err);
        else resolve(res);
      });
    });

    const crimeTypes = crimeTypesResult[0]?.types?.split(',').sort() || [];

    // Get year range
    const yearResult: { min_year: number; max_year: number }[] = await new Promise((resolve, reject) => {
      db.all(`
        SELECT MIN("Year") as min_year, MAX("Year") as max_year
        FROM read_csv_auto('${dataPath}')
        WHERE "Year" IS NOT NULL
      `, (err: Error | null, res: any[]) => {
        if (err) reject(err);
        else resolve(res);
      });
    });

    // Convert BigInt values to regular numbers
    const min_lat = Number(row.min_lat);
    const max_lat = Number(row.max_lat);
    const min_lon = Number(row.min_lon);
    const max_lon = Number(row.max_lon);
    const count = Number(row.count);

    return NextResponse.json({
      minTime,
      maxTime,
      minLat: min_lat,
      maxLat: max_lat,
      minLon: min_lon,
      maxLon: max_lon,
      count,
      crimeTypes,
      yearRange: {
        min: Number(yearResult[0]?.min_year),
        max: Number(yearResult[0]?.max_year)
      }
    });
    
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return NextResponse.json({ error: 'Failed to fetch metadata', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
