import { NextRequest, NextResponse } from 'next/server';
import { getAggregatedBins } from '@/lib/duckdb-aggregator';
import { Bin } from '@/types';

// Force Node.js runtime for DuckDB compatibility
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Generate mock bins data for fallback
function generateMockBins(resX: number, resY: number, resZ: number): Bin[] {
  const bins: Bin[] = [];
  const binCount = Math.min(resX * resY * resZ, 100); // Limit to 100 bins for mock
  
  for (let i = 0; i < binCount; i++) {
    const ix = Math.floor(Math.random() * resX);
    const iy = Math.floor(Math.random() * resY);
    const iz = Math.floor(Math.random() * resZ);
    
    bins.push({
      x: ((ix + 0.5) / resX * 100.0) - 50.0,
      y: ((iy + 0.5) / resY * 100.0),
      z: ((iz + 0.5) / resZ * 100.0) - 50.0,
      count: Math.floor(Math.random() * 1000) + 100,
      dominantType: ['THEFT', 'BATTERY', 'CRIMINAL DAMAGE', 'ASSAULT'][Math.floor(Math.random() * 4)]
    });
  }
  
  return bins;
}

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
    
    // Return mock bins data with warning
    const { searchParams } = new URL(request.url);
    const resX = parseInt(searchParams.get('resX') || '32', 10);
    const resY = parseInt(searchParams.get('resY') || '16', 10);
    const resZ = parseInt(searchParams.get('resZ') || '32', 10);
    
    const mockBins = generateMockBins(resX, resY, resZ);
    
    return NextResponse.json({
      bins: mockBins,
      isMock: true,
    }, {
      status: 200,
      headers: {
        'X-Data-Warning': 'Using demo data - database unavailable',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
      }
    });
  }
}
