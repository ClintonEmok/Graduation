import { NextResponse } from 'next/server';
import { queryCrimeCount, queryCrimesInRange } from '@/lib/queries';

/**
 * Viewport-based crime data API endpoint.
 * 
 * Accepts viewport bounds and returns only the data needed for the current view
 * plus buffer zones for smooth scrolling/loading.
 * 
 * Query Parameters:
 * - startEpoch: number (required) - start of visible range (Unix epoch seconds)
 * - endEpoch: number (required) - end of visible range (Unix epoch seconds)
 * - bufferDays: number (optional, default: 30) - buffer before/after visible range
 * - limit: number (optional, default: 50000) - max records to return
 * - crimeTypes: string (optional) - comma-separated crime types
 * - districts: string (optional) - comma-separated districts
 */

// Force Node.js runtime for DuckDB compatibility
export const runtime = 'nodejs';
// Prevent static optimization as we serve dynamic viewport data
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Required viewport bounds
    const startEpoch = searchParams.get('startEpoch');
    const endEpoch = searchParams.get('endEpoch');
    
    // Validate required parameters
    if (!startEpoch || !endEpoch) {
      return NextResponse.json(
        { error: 'Missing required parameters: startEpoch and endEpoch are required' },
        { status: 400 }
      );
    }
    
    const start = parseInt(startEpoch, 10);
    const end = parseInt(endEpoch, 10);
    
    if (isNaN(start) || isNaN(end)) {
      return NextResponse.json(
        { error: 'Invalid epoch parameters: must be valid integers' },
        { status: 400 }
      );
    }
    
    if (start >= end) {
      return NextResponse.json(
        { error: 'Invalid range: startEpoch must be less than endEpoch' },
        { status: 400 }
      );
    }
    
    // Optional parameters with defaults
    const bufferDays = parseInt(searchParams.get('bufferDays') || '30', 10);
    const limit = parseInt(searchParams.get('limit') || '50000', 10);
    const crimeTypesParam = searchParams.get('crimeTypes');
    const districtsParam = searchParams.get('districts');
    
    // Apply buffer zone (convert days to seconds)
    const bufferSeconds = bufferDays * 86400;
    const bufferedStart = start - bufferSeconds;
    const bufferedEnd = end + bufferSeconds;
    
    // Parse optional filters
    const crimeTypes = crimeTypesParam 
      ? crimeTypesParam.split(',').map(t => t.trim()).filter(Boolean)
      : undefined;
    
    const districts = districtsParam
      ? districtsParam.split(',').map(d => d.trim()).filter(Boolean)
      : undefined;
    
    const totalMatches = await queryCrimeCount(bufferedStart, bufferedEnd, {
      crimeTypes,
      districts,
    });
    const sampleStride = totalMatches > limit ? Math.ceil(totalMatches / limit) : 1;
    const sampled = sampleStride > 1;

    // Query the database with buffered range
    const crimes = await queryCrimesInRange(
      bufferedStart,
      bufferedEnd,
      {
        limit,
        sampleStride,
        crimeTypes,
        districts
      }
    );
    
    // Return response with appropriate caching headers
    // Viewport data should never be cached long-term as user navigates
    return NextResponse.json(
      {
        data: crimes,
        meta: {
          viewport: { start, end },
          buffer: { days: bufferDays, applied: { start: bufferedStart, end: bufferedEnd } },
          returned: crimes.length,
          limit,
          totalMatches,
          sampled,
          sampleStride,
        }
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'X-Content-Type-Options': 'nosniff'
        }
      }
    );
    
  } catch (error) {
    console.error('API Error (/api/crimes/range):', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch crime data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
