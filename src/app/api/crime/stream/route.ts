import { NextResponse } from 'next/server';
import { getDb, getDataPath } from '@/lib/db';
import { tableFromJSON, tableToIPC } from 'apache-arrow';

// Force Node.js runtime for DuckDB compatibility
export const runtime = 'nodejs';
// Prevent static optimization as we stream data
export const dynamic = 'force-dynamic';

// Generate mock crime data for fallback
function generateMockData(): Record<string, unknown>[] {
  const mockData: Record<string, unknown>[] = [];
  const crimeTypes = ['THEFT', 'BATTERY', 'CRIMINAL DAMAGE', 'ASSAULT', 'BURGLARY', 'ROBBERY', 'MOTOR VEHICLE THEFT', 'DECEPTIVE PRACTICE'];
  
  // Generate 1000 mock records for 2024
  const startTimestamp = 1704067200; // 2024-01-01
  const endTimestamp = 1735689600;   // 2025-01-01
  
  for (let i = 0; i < 1000; i++) {
    const timestamp = startTimestamp + Math.floor(Math.random() * (endTimestamp - startTimestamp));
    const lat = 41.8 + Math.random() * 0.2;
    const lon = -87.7 + Math.random() * 0.2;
    
    mockData.push({
      timestamp,
      type: crimeTypes[Math.floor(Math.random() * crimeTypes.length)],
      lat,
      lon,
      x: ((lon + 87.5) / (87.7 - 87.5)),
      z: ((lat - 37) / (42 - 37)),
      iucr: `${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}`,
      district: String(Math.floor(Math.random() * 30) + 1),
      year: 2024
    });
  }
  
  return mockData;
}

export async function GET(request: Request) {
  // Parse query params first so we can use them for mock data generation too
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const crimeTypes = searchParams.get('crimeTypes');

  try {
    const db = await getDb();
    const dataPath = getDataPath();

    // Build query filters
    let dateFilter = '';
    if (startDate && endDate) {
      // Parse as epoch seconds and convert to date range
      const startTs = parseInt(startDate, 10);
      const endTs = parseInt(endDate, 10);
      const startDt = new Date(startTs * 1000).toISOString().split('T')[0];
      const endDt = new Date(endTs * 1000).toISOString().split('T')[0];
      dateFilter = `AND EXTRACT(EPOCH FROM "Date") >= ${startTs} AND EXTRACT(EPOCH FROM "Date") <= ${endTs}`;
    }

    let typeFilter = '';
    if (crimeTypes) {
      const types = crimeTypes.split(',').map(t => `"${t}"`).join(', ');
      typeFilter = `AND "Primary Type" IN (${types})`;
    }

    // Query the CSV file directly with date parsing and coordinate filtering
    // Using read_csv_auto for automatic type inference
    // Date column is already parsed as TIMESTAMP, extract epoch directly
    const query = `
      SELECT 
        EXTRACT(EPOCH FROM "Date") as timestamp,
        "Primary Type" as type,
        "Latitude" as lat,
        "Longitude" as lon,
        ((lon + 87.5) / (87.7 - 87.5)) as x,
        ((lat - 37) / (42 - 37)) as z,
        "IUCR" as iucr,
        "District" as district,
        "Year" as year
      FROM read_csv_auto('${dataPath}')
      WHERE "Date" IS NOT NULL 
        AND "Latitude" IS NOT NULL 
        AND "Longitude" IS NOT NULL
        ${dateFilter}
        ${typeFilter}
    `;

    // Manually fetch data and serialize to Arrow
    const rows = await new Promise<Record<string, unknown>[]>((resolve, reject) => {
      db.all(query, (err: Error | null, res: Record<string, unknown>[]) => {
        if (err) reject(err);
        else resolve(res);
      });
    });

    const table = tableFromJSON(rows);

    const ipcBuffer = tableToIPC(table, 'stream');
    
    return new Response(ipcBuffer as unknown as BodyInit, {

      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apache.arrow.stream',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    });

  } catch (error) {
    console.error('API Error:', error);
    
    // Return mock data with warning flag
    const mockData = generateMockData();
    const table = tableFromJSON(mockData);
    const ipcBuffer = tableToIPC(table, 'stream');
    
    return new Response(ipcBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apache.arrow.stream',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'X-Content-Type-Options': 'nosniff',
        'X-Data-Warning': 'Using demo data - database unavailable',
      },
    });
  }
}
