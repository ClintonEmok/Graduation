import { describe, expect, test } from 'vitest';
import { parseDate, epochSeconds, getDataPath } from './db';

describe('parseDate', () => {
  test('parses standard AM date', () => {
    const result = parseDate('01/05/2026 12:00:00 AM');
    expect(result.getMonth()).toBe(0); // January
    expect(result.getDate()).toBe(5);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getHours()).toBe(0);
  });

  test('parses standard PM date', () => {
    const result = parseDate('06/15/2024 03:30:00 PM');
    expect(result.getMonth()).toBe(5); // June
    expect(result.getDate()).toBe(15);
    expect(result.getFullYear()).toBe(2024);
    expect(result.getHours()).toBe(15);
  });

  test('parses midnight correctly (12:00:00 AM)', () => {
    const result = parseDate('01/01/2001 12:00:00 AM');
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });

  test('parses noon correctly (12:00:00 PM)', () => {
    const result = parseDate('01/01/2001 12:00:00 PM');
    expect(result.getHours()).toBe(12);
    expect(result.getMinutes()).toBe(0);
  });

  test('throws on invalid date', () => {
    expect(() => parseDate('not-a-date')).toThrow();
  });

  test('throws on malformed date', () => {
    expect(() => parseDate('32/13/2001 12:00:00 PM')).toThrow();
  });
});

describe('epochSeconds', () => {
  test('converts date to epoch seconds', () => {
    // The parseDate function uses JS Date() which parses in local timezone
    // Test that the conversion is consistent (within 1 hour for timezone offset)
    const result = epochSeconds('01/01/2001 12:00:00 AM');
    // Should be around 978307200 (UTC) but local timezone may shift it
    // Just verify it's a valid epoch in the expected ballpark
    expect(result).toBeGreaterThan(978000000);
    expect(result).toBeLessThan(979000000);
  });

  test('handles PM times correctly', () => {
    const result = epochSeconds('06/15/2024 03:30:00 PM');
    // Should be around 1718469000 but local timezone may shift
    expect(result).toBeGreaterThan(1718450000);
    expect(result).toBeLessThan(1718480000);
  });

  test('floor rounds down', () => {
    // Any time component should floor to integer seconds
    const result = epochSeconds('01/01/2024 12:00:01 PM');
    expect(Number.isInteger(result)).toBe(true);
  });
});

describe('getDataPath', () => {
  test('returns path to CSV file', () => {
    const path = getDataPath();
    expect(path).toContain('Crimes_-_2001_to_Present_20260114.csv');
    expect(path).toContain('data');
    expect(path).toContain('sources');
  });
});
