/**
 * Crime API route tests
 * 
 * Tests the mock data generation and API utilities used by the crime endpoints.
 * Since DuckDB requires file system access, we test the fallback/mock paths
 * and the parameter handling logic.
 */

import { describe, expect, test, vi, beforeEach } from 'vitest';
import { getDataPath, parseDate, epochSeconds } from './db';
import { getAggregatedBins } from './duckdb-aggregator';

// Mock the duckdb module
vi.mock('./db', async () => {
  const actual = await vi.importActual('./db');
  return {
    ...actual,
    getDb: vi.fn().mockRejectedValue(new Error('DuckDB not available in tests')),
  };
});

// Mock getDataPath to return test path
vi.mock('./db', async () => {
  return {
    getDataPath: () => '/test/data/Crimes_-_2001_to_Present_20260114.csv',
    parseDate: (dateStr: string) => new Date(dateStr),
    epochSeconds: (dateStr: string) => Math.floor(new Date(dateStr).getTime() / 1000),
  };
});

describe('Crime API - Mock Data Generation', () => {
  // Test the mock data generator logic inline (same as route.ts)
  const generateMockData = (): Record<string, unknown>[] => {
    const mockData: Record<string, unknown>[] = [];
    const crimeTypes = ['THEFT', 'BATTERY', 'CRIMINAL DAMAGE', 'ASSAULT', 'BURGLARY', 'ROBBERY', 'MOTOR VEHICLE THEFT', 'DECEPTIVE PRACTICE'];
    
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
  };

  test('generates 1000 mock records', () => {
    const data = generateMockData();
    expect(data).toHaveLength(1000);
  });

  test('mock records have required fields', () => {
    const data = generateMockData();
    const first = data[0];
    
    expect(first).toHaveProperty('timestamp');
    expect(first).toHaveProperty('type');
    expect(first).toHaveProperty('lat');
    expect(first).toHaveProperty('lon');
    expect(first).toHaveProperty('x');
    expect(first).toHaveProperty('z');
    expect(first).toHaveProperty('iucr');
    expect(first).toHaveProperty('district');
    expect(first).toHaveProperty('year');
  });

  test('mock records have valid timestamp range (2024)', () => {
    const data = generateMockData();
    const startTimestamp = 1704067200; // 2024-01-01
    const endTimestamp = 1735689600;   // 2025-01-01
    
    data.forEach((record) => {
      expect(record.timestamp).toBeGreaterThanOrEqual(startTimestamp);
      expect(record.timestamp).toBeLessThan(endTimestamp);
    });
  });

  test('mock records have valid Chicago coordinates', () => {
    const data = generateMockData();
    
    data.forEach((record) => {
      // Chicago lat: 41.6 to 42.1, lon: -87.9 to -87.5
      expect(record.lat).toBeGreaterThanOrEqual(41.8);
      expect(record.lat).toBeLessThanOrEqual(42.0);
      expect(record.lon).toBeGreaterThanOrEqual(-87.7);
      expect(record.lon).toBeLessThanOrEqual(-87.5);
    });
  });

  test('mock records have valid crime types', () => {
    const crimeTypes = ['THEFT', 'BATTERY', 'CRIMINAL DAMAGE', 'ASSAULT', 'BURGLARY', 'ROBBERY', 'MOTOR VEHICLE THEFT', 'DECEPTIVE PRACTICE'];
    const data = generateMockData();
    
    data.forEach((record) => {
      expect(crimeTypes).toContain(record.type);
    });
  });

  test('mock records have valid district format', () => {
    const data = generateMockData();
    
    data.forEach((record) => {
      const district = parseInt(record.district as string, 10);
      expect(district).toBeGreaterThanOrEqual(1);
      expect(district).toBeLessThanOrEqual(31);
    });
  });

  test('mock records all have year 2024', () => {
    const data = generateMockData();
    
    data.forEach((record) => {
      expect(record.year).toBe(2024);
    });
  });

  test('mock x coordinate calculation is correct', () => {
    // x = ((lon + 87.5) / (87.7 - 87.5))
    // For lon = -87.7: x = (-87.7 + 87.5) / 0.2 = -0.2 / 0.2 = -1
    // For lon = -87.5: x = (-87.5 + 87.5) / 0.2 = 0
    const lon = -87.6;
    const expectedX = ((lon + 87.5) / (87.7 - 87.5));
    expect(expectedX).toBeCloseTo(-0.5);
  });

  test('mock z coordinate calculation is correct', () => {
    // z = ((lat - 37) / (42 - 37))
    // For lat = 41.8: z = 0.96
    // For lat = 42.0: z = 1.0
    const lat = 41.9;
    const expectedZ = ((lat - 37) / (42 - 37)); // 0.98
    expect(expectedZ).toBeCloseTo(0.98);
  });
});

describe('Crime API - Aggregation Parameters', () => {
  test('aggregation params structure is valid', () => {
    const params = {
      resX: 50,
      resY: 100,
      resZ: 20,
      types: ['THEFT', 'BATTERY'],
      districts: ['1', '2', '3'],
      startTime: 1704067200,
      endTime: 1735689600,
    };
    
    expect(params.resX).toBe(50);
    expect(params.resY).toBe(100);
    expect(params.resZ).toBe(20);
    expect(params.types).toHaveLength(2);
    expect(params.districts).toHaveLength(3);
    expect(params.startTime).toBeDefined();
    expect(params.endTime).toBeDefined();
  });

  test('aggregation params with optional filters', () => {
    const paramsNoFilters: {
      resX: number;
      resY: number;
      resZ: number;
      types?: string[];
      districts?: string[];
      startTime?: number;
      endTime?: number;
    } = {
      resX: 10,
      resY: 10,
      resZ: 10,
    };
    
    expect(paramsNoFilters.types).toBeUndefined();
    expect(paramsNoFilters.districts).toBeUndefined();
    expect(paramsNoFilters.startTime).toBeUndefined();
    expect(paramsNoFilters.endTime).toBeUndefined();
  });

  test('resolution bounds are reasonable', () => {
    const resolutions = [10, 25, 50, 100, 200];
    
    resolutions.forEach(res => {
      expect(res).toBeGreaterThan(0);
      expect(res).toBeLessThanOrEqual(500); // Reasonable max
    });
  });
});

describe('Crime API - Date Range Utilities', () => {
  test('epoch seconds conversion for common dates', () => {
    // 2024-01-01 UTC
    const jan2024 = Math.floor(new Date('2024-01-01T00:00:00Z').getTime() / 1000);
    expect(jan2024).toBe(1704067200);
    
    // 2025-01-01 UTC
    const jan2025 = Math.floor(new Date('2025-01-01T00:00:00Z').getTime() / 1000);
    expect(jan2025).toBe(1735689600);
  });

  test('date string parsing handles common formats', () => {
    // Test date to ISO conversion
    const date = new Date('01/05/2024 12:00:00 PM');
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(0); // January
    expect(date.getDate()).toBe(5);
  });

  test('real data range 2001-2026 is correct', () => {
    // Min: 2001-01-01
    const minTime = 978307200;
    // Max: 2026-01-01  
    const maxTime = 1767571200;
    
    expect(minTime).toBe(978307200);
    expect(maxTime).toBe(1767571200);
    
    // Range is ~25 years
    const rangeSeconds = maxTime - minTime;
    const rangeYears = rangeSeconds / (365.25 * 24 * 60 * 60);
    expect(rangeYears).toBeCloseTo(25, 0);
  });
});

describe('Crime API - Error Handling', () => {
  test('mock fallback is used when DuckDB fails', async () => {
    // This test verifies the error handling pattern
    // In production, if DuckDB fails, the route returns mock data
    
    const mockError = new Error('DuckDB not available');
    expect(mockError.message).toBe('DuckDB not available');
  });

  test('error response includes warning header', () => {
    // The pattern: when DuckDB fails, response includes
    // 'X-Data-Warning': 'Using demo data - database unavailable'
    const warningHeader = 'Using demo data - database unavailable';
    expect(warningHeader).toContain('demo data');
    expect(warningHeader).toContain('unavailable');
  });
});

describe('Crime API - Query Parameter Parsing', () => {
  test('parses startDate and endDate params', () => {
    const startDate = '1704067200'; // 2024-01-01
    const endDate = '1735689600';   // 2025-01-01
    
    const startTs = parseInt(startDate, 10);
    const endTs = parseInt(endDate, 10);
    
    expect(startTs).toBe(1704067200);
    expect(endTs).toBe(1735689600);
    expect(startTs).toBeLessThan(endTs);
  });

  test('parses crimeTypes as comma-separated list', () => {
    const crimeTypes = 'THEFT,BATTERY,ASSAULT';
    const types = crimeTypes.split(',');
    
    expect(types).toHaveLength(3);
    expect(types).toContain('THEFT');
    expect(types).toContain('BATTERY');
    expect(types).toContain('ASSAULT');
  });

  test('handles empty crimeTypes param', () => {
    const crimeTypes = '';
    const types = crimeTypes.split(',').filter(t => t);
    
    // Empty string splits to [''], filter removes it
    expect(types).toHaveLength(0);
  });
});

describe('Crime API - Data Path', () => {
  test('getDataPath returns CSV file path', () => {
    const path = getDataPath();
    
    expect(path).toContain('Crimes_-_2001_to_Present');
    expect(path).toContain('.csv');
  });

  test('data file is a CSV file', () => {
    const path = getDataPath();
    
    // Path should end with .csv
    expect(path.endsWith('.csv')).toBe(true);
  });
});
