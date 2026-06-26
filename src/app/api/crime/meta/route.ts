import { NextResponse } from 'next/server';
import { getDataPath, isMockDataEnabled, readDatasetMetadata } from '@/lib/db';
import { existsSync } from 'fs';

export const dynamic = 'force-dynamic';

// Mock metadata for fallback
const MOCK_METADATA = {
  minTime: 1704067200,    // 2024-01-01
  maxTime: 1735689600,    // 2025-01-01
  minLat: 41.6,
  maxLat: 42.1,
  minLon: -87.9,
  maxLon: -87.5,
  count: 100000,
  crimeTypes: ['THEFT', 'BATTERY', 'CRIMINAL DAMAGE', 'ASSAULT', 'BURGLARY', 'ROBBERY', 'MOTOR VEHICLE THEFT', 'DECEPTIVE PRACTICE'],
  yearRange: { min: 2024, max: 2024 }
};

export async function GET() {
  try {
    if (isMockDataEnabled()) {
      return NextResponse.json({
        ...MOCK_METADATA,
        isMock: true,
      }, {
        status: 200,
        headers: {
          'X-Data-Warning': 'Using demo data - database disabled'
        }
      });
    }

    const dataPath = getDataPath();
    if (!existsSync(dataPath)) {
      // Return mock data with warning instead of error
      return NextResponse.json({
        ...MOCK_METADATA,
        isMock: true,
      }, {
        status: 200,
        headers: {
          'X-Data-Warning': 'Using demo data - dataset file not found'
        }
      });
    }

    const metadata = await readDatasetMetadata();

    return NextResponse.json({
      ...metadata,
    });
    
  } catch (error) {
    console.error('Error fetching metadata:', error);
    
    // Return mock metadata with warning
    return NextResponse.json({
      ...MOCK_METADATA,
      isMock: true,
    }, {
      status: 200,
      headers: {
        'X-Data-Warning': 'Using demo data - database unavailable'
      }
    });
  }
}
