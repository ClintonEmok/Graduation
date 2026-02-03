import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { join } from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getDb();
    const dataPath = join(process.cwd(), 'data', 'crime.parquet');
    
    // DuckDB query to get metadata instantly from Parquet footer/stats
    const result: any[] = await new Promise((resolve, reject) => {
        db.all(`
            SELECT 
                CAST(MIN(timestamp) AS VARCHAR) as min_time,
                CAST(MAX(timestamp) AS VARCHAR) as max_time,
                COUNT(*) as count
            FROM '${dataPath}'
        `, (err, res) => {
            if (err) reject(err);
            else resolve(res);
        });
    });

    if (!result || result.length === 0) {
      throw new Error('No metadata found');
    }

    const row = result[0];
    
    const minTime = new Date(row.min_time).getTime() / 1000;
    const maxTime = new Date(row.max_time).getTime() / 1000;

    return NextResponse.json({
      minTime,
      maxTime,
      count: Number(row.count)
    });
    
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return NextResponse.json({ error: 'Failed to fetch metadata' }, { status: 500 });
  }
}
