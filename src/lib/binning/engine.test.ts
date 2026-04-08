import { describe, expect, it } from 'vitest';

import { generateBins } from './engine';

describe('generateBins interval strategies', () => {
  it('uses fixed hourly boundaries instead of event-span boundaries', () => {
    const domainStart = Date.UTC(2001, 0, 1, 1, 0, 0);
    const domainEnd = Date.UTC(2001, 0, 1, 3, 0, 0);

    const result = generateBins(
      [
        { timestamp: Date.UTC(2001, 0, 1, 1, 5, 0), type: 'THEFT', district: '1' },
        { timestamp: Date.UTC(2001, 0, 1, 1, 45, 0), type: 'BATTERY', district: '1' },
        { timestamp: Date.UTC(2001, 0, 1, 2, 10, 0), type: 'ASSAULT', district: '2' },
      ],
      {
        strategy: 'hourly',
        constraints: {},
        domain: [domainStart, domainEnd],
      }
    );

    expect(result.bins).toHaveLength(2);
    expect(result.bins[0]?.startTime).toBe(domainStart);
    expect(result.bins[0]?.endTime).toBe(Date.UTC(2001, 0, 1, 2, 0, 0));
    expect(result.bins[0]?.count).toBe(2);

    expect(result.bins[1]?.startTime).toBe(Date.UTC(2001, 0, 1, 2, 0, 0));
    expect(result.bins[1]?.endTime).toBe(domainEnd);
    expect(result.bins[1]?.count).toBe(1);
  });
});
