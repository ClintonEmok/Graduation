import { getDb, getDataPath, isMockDataEnabled } from '@/lib/db';
import { lonLatToNormalized } from '@/lib/coordinate-normalization';
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
    const { x, z } = lonLatToNormalized(lon, lat);
    
    mockData.push({
      timestamp,
      type: crimeTypes[Math.floor(Math.random() * crimeTypes.length)],
      lat,
      lon,
      x,
      z,
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
  const maxRowsParam = searchParams.get('maxRows');
  const maxRows = maxRowsParam ? Number.parseInt(maxRowsParam, 10) : null;

  try {
    if (isMockDataEnabled()) {
      const mockData = generateMockData();
      const table = tableFromJSON(mockData);
      const ipcBuffer = tableToIPC(table, 'stream');

      return new Response(ipcBuffer as unknown as BodyInit, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.apache.arrow.stream',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'X-Content-Type-Options': 'nosniff',
          'X-Data-Warning': 'Using demo data - database disabled',
        },
      });
    }

    const db = await getDb();
    const dataPath = getDataPath();

    // Build parameterized query filters
    const conditions: string[] = ['"Date" IS NOT NULL', '"Latitude" IS NOT NULL', '"Longitude" IS NOT NULL'];
    const params: unknown[] = [];

    if (startDate && endDate) {
      const startTs = parseInt(startDate, 10);
      const endTs = parseInt(endDate, 10);
      if (Number.isFinite(startTs) && Number.isFinite(endTs)) {
        conditions.push('EXTRACT(EPOCH FROM "Date") >= ? AND EXTRACT(EPOCH FROM "Date") <= ?');
        params.push(startTs, endTs);
      }
    }

    if (crimeTypes) {
      const types = crimeTypes.split(',').map(t => t.trim()).filter(Boolean);
      if (types.length > 0) {
        conditions.push(`"Primary Type" IN (${types.map(() => '?').join(', ')})`);
        params.push(...types);
      }
    }

    const whereClause = conditions.join(' AND ');
    const limitClause = Number.isFinite(maxRows) && maxRows !== null && maxRows > 0
      ? 'LIMIT ?'
      : -1;

    if (limitClause === 'LIMIT ?') {
      params.push(Math.floor(maxRows!));
    }

    // Query the CSV file directly with date parsing and coordinate filtering.
    // Using read_csv_auto for automatic type inference
    // Date column is already parsed as TIMESTAMP, extract epoch directly
    const query = `
      SELECT 
        EXTRACT(EPOCH FROM "Date") as timestamp,
        "Primary Type" as type,
        "Latitude" as lat,
        "Longitude" as lon,
        "IUCR" as iucr,
        "District" as district,
        "Year" as year
      FROM read_csv_auto('${dataPath}')
      WHERE ${whereClause}
      ${limitClause}
    `;

    // Manually fetch data and serialize to Arrow
    // DuckDB node driver accepts (sql, ...params, callback) but TS types only declare (sql, callback)
    const rows = await new Promise<Record<string, unknown>[]>((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DuckDB param overloads not in TS types
      (db.all as any)(query, ...params, (err: Error | null, res: unknown[]) => {
        if (err) reject(err);
        else resolve(res as Record<string, unknown>[]);
      });
    });

    const normalizedRows = rows.map((row) => {
      const lon = Number(row.lon);
      const lat = Number(row.lat);
      const { x, z } = lonLatToNormalized(lon, lat);

      return {
        ...row,
        lon,
        lat,
        x,
        z,
      };
    });

    const table = tableFromJSON(normalizedRows);

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
