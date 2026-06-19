import { NextResponse } from 'next/server';
import {
  ensureDatasetMetaTable,
  getDataPath,
  isMockDataEnabled,
  readDatasetMetadata,
} from '@/lib/db';
import { existsSync } from 'fs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
  yearRange: { min: 2024, max: 2024 },
  fingerprint: 'mock',
  builtAt: '',
};

const mockResponse = (warning: string) =>
  NextResponse.json(
    {
      ...MOCK_METADATA,
      isMock: true,
    },
    {
      status: 200,
      headers: { 'X-Data-Warning': warning },
    }
  );

export async function GET() {
  try {
    if (isMockDataEnabled()) {
      return mockResponse('Using demo data - database disabled');
    }

    const dataPath = getDataPath();
    if (!existsSync(dataPath)) {
      return mockResponse('Using demo data - dataset file not found');
    }

    // Phase 81: read from the persisted single-row metadata table. The
    // bootstrap builds crime_dataset_meta on first request and any subsequent
    // request hits a simple, indexed read instead of repeated CSV scans.
    await ensureDatasetMetaTable();
    const meta = await readDatasetMetadata();

    if (!meta) {
      return mockResponse('Using demo data - metadata unavailable');
    }

    return NextResponse.json({
      minTime: meta.minTime,
      maxTime: meta.maxTime,
      minLat: meta.minLat,
      maxLat: meta.maxLat,
      minLon: meta.minLon,
      maxLon: meta.maxLon,
      count: meta.count,
      crimeTypes: meta.crimeTypes,
      yearRange: { min: meta.yearMin, max: meta.yearMax },
      fingerprint: meta.fingerprint,
      builtAt: meta.builtAt,
    });
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return mockResponse('Using demo data - database unavailable');
  }
}
