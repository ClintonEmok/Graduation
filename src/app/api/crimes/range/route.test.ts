import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lonLatToNormalized } from '@/lib/coordinate-normalization';

const {
  queryCrimesInRangePagedMock,
  isMockDataEnabledMock,
} = vi.hoisted(() => ({
  queryCrimesInRangePagedMock: vi.fn(),
  isMockDataEnabledMock: vi.fn(),
}));

vi.mock('@/lib/queries', () => ({
  queryCrimesInRangePaged: queryCrimesInRangePagedMock,
  encodeRangeCursor: (cursor: { ts: number; rowId: number }) =>
    `v1.${Buffer.from(JSON.stringify({ ts: cursor.ts, rid: cursor.rowId })).toString('base64')}`,
  decodeRangeCursor: (raw: string | null) => {
    if (!raw?.startsWith('v1.')) return null;
    try {
      const json = Buffer.from(raw.slice(3), 'base64').toString('utf-8');
      const parsed = JSON.parse(json) as { ts?: number; rid?: number };
      if (typeof parsed.ts !== 'number' || typeof parsed.rid !== 'number') return null;
      return { ts: parsed.ts, rowId: parsed.rid };
    } catch {
      return null;
    }
  },
}));

vi.mock('@/lib/db', () => ({
  isMockDataEnabled: isMockDataEnabledMock,
}));

import { GET, buildBufferedRange, parseCsvFilterParam } from '@/app/api/crimes/range/route';

const makeRequest = (query: string) => new Request(`http://localhost/api/crimes/range?${query}`);

const makePagedRow = (overrides: Partial<{
  timestamp: number;
  type: string;
  lat: number;
  lon: number;
  x: number;
  z: number;
  iucr: string;
  district: string;
  year: number;
  rowId: number;
}> = {}) => ({
  timestamp: 1500,
  type: 'THEFT',
  lat: 41.88,
  lon: -87.63,
  x: 25,
  z: -10,
  iucr: '0820',
  district: '1',
  year: 2001,
  rowId: 42,
  ...overrides,
});

describe('/api/crimes/range GET (Phase 81 Wave 3 paged contract)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    queryCrimesInRangePagedMock.mockReset();
    isMockDataEnabledMock.mockReset();
    isMockDataEnabledMock.mockReturnValue(false);
  });

  it('validates required parameters', async () => {
    const response = await GET(makeRequest('startEpoch=1000'));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining('startEpoch and endEpoch'),
    });
  });

  it('validates integer epoch parameters', async () => {
    const response = await GET(makeRequest('startEpoch=abc&endEpoch=2000'));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining('must be valid integers'),
    });
  });

  it('validates start before end', async () => {
    const response = await GET(makeRequest('startEpoch=2000&endEpoch=1000'));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining('startEpoch must be less than endEpoch'),
    });
  });

  it('returns requiresNarrowing for pageSize above policy max', async () => {
    const response = await GET(makeRequest('startEpoch=1000&endEpoch=2000&pageSize=999999'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual([]);
    expect(body.meta.requiresNarrowing).toMatchObject({
      reason: 'page-size-too-large',
      maxPageSize: 50000,
      requestedPageSize: 999999,
    });
    expect(queryCrimesInRangePagedMock).not.toHaveBeenCalled();
  });

  it('returns requiresNarrowing for ranges above policy max', async () => {
    const start = 1000;
    const end = start + 91 * 86400; // 91 days, > 90 day max
    const response = await GET(makeRequest(`startEpoch=${start}&endEpoch=${end}&pageSize=5000`));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual([]);
    expect(body.meta.requiresNarrowing).toMatchObject({
      reason: 'range-too-broad',
      maxRangeSec: 90 * 86400,
    });
    expect(queryCrimesInRangePagedMock).not.toHaveBeenCalled();
  });

  it('forwards exact range, filters, and pageSize to the paged facade', async () => {
    queryCrimesInRangePagedMock.mockResolvedValue({
      rows: [makePagedRow()],
      hasMore: false,
      nextCursor: null,
    });

    const response = await GET(
      makeRequest(
        'startEpoch=1000&endEpoch=2000&pageSize=2500&crimeTypes=THEFT,%20BATTERY,,&districts=1,%202&target=slice-1'
      )
    );

    expect(response.status).toBe(200);
    expect(queryCrimesInRangePagedMock).toHaveBeenCalledTimes(1);
    expect(queryCrimesInRangePagedMock).toHaveBeenCalledWith({
      startEpoch: 1000,
      endEpoch: 2000,
      pageSize: 2500,
      cursor: null,
      crimeTypes: ['THEFT', 'BATTERY'],
      districts: ['1', '2'],
      target: 'slice-1',
    });
  });

  it('returns the exact paged payload with hasMore=false and no nextCursor', async () => {
    queryCrimesInRangePagedMock.mockResolvedValue({
      rows: [makePagedRow()],
      hasMore: false,
      nextCursor: null,
    });

    const response = await GET(makeRequest('startEpoch=1000&endEpoch=2000&pageSize=10'));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].timestamp).toBe(1500);
    expect(body.meta).toMatchObject({
      viewport: { start: 1000, end: 2000 },
      returned: 1,
      limit: 10,
      pageSize: 10,
      hasMore: false,
      nextCursor: null,
    });
    // Phase 81 Wave 3: no sample/truncation fields in the exact contract.
    expect(body.meta.sampled).toBeUndefined();
    expect(body.meta.sampleStride).toBeUndefined();
  });

  it('encodes nextCursor when hasMore is true and decodes it on the next call', async () => {
    queryCrimesInRangePagedMock.mockImplementation(async (req) => {
      // First call: returns a page and a nextCursor.
      if (!req.cursor) {
        return {
          rows: [makePagedRow({ timestamp: 1000, rowId: 5 })],
          hasMore: true,
          nextCursor: { ts: 1000, rowId: 5 },
        };
      }
      // Subsequent call: receives the decoded cursor back.
      return {
        rows: [makePagedRow({ timestamp: 1200, rowId: 9 })],
        hasMore: false,
        nextCursor: null,
      };
    });

    const firstResponse = await GET(makeRequest('startEpoch=1000&endEpoch=2000&pageSize=1'));
    const firstBody = await firstResponse.json();
    expect(firstBody.meta.hasMore).toBe(true);
    expect(typeof firstBody.meta.nextCursor).toBe('string');
    expect(firstBody.meta.nextCursor.startsWith('v1.')).toBe(true);

    const secondResponse = await GET(
      makeRequest(`startEpoch=1000&endEpoch=2000&pageSize=1&cursor=${encodeURIComponent(firstBody.meta.nextCursor)}`)
    );
    const secondBody = await secondResponse.json();
    expect(secondBody.meta.hasMore).toBe(false);
    expect(secondBody.meta.nextCursor).toBeNull();

    // The second call should have received the decoded cursor object.
    const secondCallArg = queryCrimesInRangePagedMock.mock.calls[1]?.[0];
    expect(secondCallArg?.cursor).toEqual({ ts: 1000, rowId: 5 });
  });

  it('uses default pageSize 5000 when no pageSize is supplied', async () => {
    queryCrimesInRangePagedMock.mockResolvedValue({
      rows: [],
      hasMore: false,
      nextCursor: null,
    });

    await GET(makeRequest('startEpoch=1000&endEpoch=2000'));

    expect(queryCrimesInRangePagedMock).toHaveBeenCalledWith(
      expect.objectContaining({ pageSize: 5000 })
    );
  });

  it('returns mock response with mock metadata and no requiresNarrowing', async () => {
    isMockDataEnabledMock.mockReturnValue(true);

    const response = await GET(makeRequest('startEpoch=1000&endEpoch=2000&pageSize=8&bufferDays=1'));
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Data-Warning')).toContain('demo data');

    const body = await response.json();
    expect(body.meta.isMock).toBe(true);
    expect(body.meta.hasMore).toBe(false);
    expect(body.meta.requiresNarrowing).toBeUndefined();
    expect(body.data.length).toBeLessThanOrEqual(8);
    for (const record of body.data) {
      const expected = lonLatToNormalized(record.lon, record.lat);
      expect(record.x).toBeCloseTo(expected.x, 6);
      expect(record.z).toBeCloseTo(expected.z, 6);
    }
    // Mock fallback does not call the exact paged facade.
    expect(queryCrimesInRangePagedMock).not.toHaveBeenCalled();
  });

  it('exposes pure helpers for deterministic parsing and buffering', () => {
    expect(parseCsvFilterParam(null)).toBeUndefined();
    expect(parseCsvFilterParam('THEFT, BATTERY,,')).toEqual(['THEFT', 'BATTERY']);
    expect(buildBufferedRange(1000, 2000, 3)).toEqual({
      bufferSeconds: 259200,
      bufferedStart: -258200,
      bufferedEnd: 261200,
    });
  });
});
