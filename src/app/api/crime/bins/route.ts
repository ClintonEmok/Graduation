import { NextRequest, NextResponse } from 'next/server';
import { getAggregatedBins } from '@/lib/duckdb-aggregator';

// Force Node.js runtime for DuckDB compatibility
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const resX = parseInt(searchParams.get('resX') || '32', 10);
    const resY = parseInt(searchParams.get('resY') || '16', 10);
    const resZ = parseInt(searchParams.get('resZ') || '32', 10);

    const types = searchParams.get('types')?.split(',').filter(Boolean);
    const districts = searchParams.get('districts')?.split(',').filter(Boolean);
    const startTime = searchParams.get('startTime') ? parseFloat(searchParams.get('startTime')!) : undefined;
    const endTime = searchParams.get('endTime') ? parseFloat(searchParams.get('endTime')!) : undefined;

    const bins = await getAggregatedBins({
      resX,
      resY,
      resZ,
      types,
      districts,
      startTime,
      endTime
    });

    return NextResponse.json(bins, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
      }
    });

  } catch (error) {
    console.error('Bins API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
