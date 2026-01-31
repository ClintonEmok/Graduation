import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { tableFromJSON, tableToIPC } from 'apache-arrow';

// Force Node.js runtime for DuckDB compatibility
export const runtime = 'nodejs';
// Prevent static optimization as we stream data
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();
    const connection = db.connect();

    // Query the Parquet file directly
    const query = "SELECT * FROM 'data/crime.parquet'";

    // Fallback: Manually fetch data and serialize to Arrow
    // This is necessary because duckdb-node v1.4.4 on some platforms 
    // has issues with the 'arrow' extension and to_arrow_ipc function.
    const rows = await new Promise<any[]>((resolve, reject) => {
      connection.all(query, (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });

    // Convert to Arrow Table
    const table = tableFromJSON(rows);

    // Serialize to Arrow IPC Stream format
    // tableToIPC returns a Uint8Array containing the full stream
    const ipcBuffer = tableToIPC(table, 'stream');
    
    return new NextResponse(ipcBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apache.arrow.stream',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
