import { describe, it, expect } from 'vitest';
import { computeAdaptiveY } from './adaptive-scale';

describe('computeAdaptiveY', () => {
  const timeStart = new Date('2023-01-01T00:00:00Z');
  const timeEnd = new Date('2023-01-02T00:00:00Z'); // 24 hours later
  const yMin = 0;
  const yMax = 100;

  it('should return correct length and monotonic values', () => {
    const points = [
      { timestamp: new Date(timeStart.getTime() + 3600000) }, // 1h
      { timestamp: new Date(timeStart.getTime() + 7200000) }, // 2h
    ];
    
    const result = computeAdaptiveY(points, [timeStart, timeEnd], [yMin, yMax]);
    
    expect(result).toHaveLength(points.length);
    expect(result[1]).toBeGreaterThanOrEqual(result[0]);
  });

  it('should produce approximate linear distribution for uniform input', () => {
     // Create uniform points every hour
     const points = Array.from({ length: 24 }, (_, i) => ({
       timestamp: new Date(timeStart.getTime() + i * 3600000 + 1000) // slight offset
     }));
     
     const result = computeAdaptiveY(points, [timeStart, timeEnd], [yMin, yMax]);
     
     // In linear, 12th point (12h) should be roughly at 50 (midpoint)
     const midIndex = 12;
     // Allow tolerance due to binning artifacts
     expect(result[midIndex]).toBeGreaterThan(40);
     expect(result[midIndex]).toBeLessThan(60);
  });

  it('should expand high density areas', () => {
     // Create a burst at the beginning (0-1h) and sparse later
     // 50 points in first hour
     const densePoints = Array.from({ length: 50 }, (_, i) => ({
       timestamp: new Date(timeStart.getTime() + i * 60000) 
     }));
     // 1 point at 20h
     const sparsePoint = { timestamp: new Date(timeStart.getTime() + 20 * 3600000) }; 
     
     const points = [...densePoints, sparsePoint];
     
     // Linear: 1 hour is ~4.1% of 24h. Y range 0-100. So linear Y would be ~4.1.
     // Adaptive: High density should expand this region significantly.
     
     const result = computeAdaptiveY(points, [timeStart, timeEnd], [yMin, yMax]);
     
     const lastDenseY = result[49];
     
     // It should be significantly higher than linear projection (4.1)
     // With adaptive scaling, this 50/51 points are in 1/24th of time.
     // Density is massive. It should take up a huge chunk of space.
     expect(lastDenseY).toBeGreaterThan(10); 
  });
});
