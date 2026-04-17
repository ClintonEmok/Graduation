import { describe, expect, test } from 'vitest';
import {
  buildSelectionRangeFromDateHourInputs,
  formatSelectionDateInput,
  formatSelectionHourInput,
} from './selection';

describe('selection helpers', () => {
  test('formats date and hour inputs from epoch milliseconds', () => {
    const value = new Date('2025-02-14T09:30:00').getTime();

    expect(formatSelectionDateInput(value)).toBe('2025-02-14');
    expect(formatSelectionHourInput(value)).toBe('09');
  });

  test('builds a valid date/hour selection range', () => {
    const range = buildSelectionRangeFromDateHourInputs('2025-02-14', '09', '2025-02-14', '17');

    expect(range).toEqual([
      new Date('2025-02-14T09:00:00').getTime(),
      new Date('2025-02-14T17:00:00').getTime(),
    ]);
  });

  test('rejects empty or reversed ranges', () => {
    expect(buildSelectionRangeFromDateHourInputs('', '09', '2025-02-14', '17')).toBeNull();
    expect(buildSelectionRangeFromDateHourInputs('2025-02-14', '17', '2025-02-14', '09')).toBeNull();
  });
});
