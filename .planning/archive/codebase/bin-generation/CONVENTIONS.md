# Bin Generation Conventions

**Analysis Date:** 2026-03-30

## Naming Patterns

### Files

- **Binning modules:** `kebab-case.ts` - e.g., `route-binning-mode.ts`, `engine.ts`
- **Test files:** `filename.test.ts` - e.g., `engine.test.ts`, `route-binning-mode.test.ts`
- **Type files:** `types.ts` - Shared type definitions

### Functions

- **Generators:** `generate*` prefix - e.g., `generateBins()`, `generateAutoAdaptiveBins()`
- **Helpers:** `create*` prefix - e.g., `createBinFromEvents()`
- **Validators:** `validate*` prefix - e.g., `validateConstraints()`
- **Resolvers:** `resolve*` prefix - e.g., `resolveRouteBinningMode()`

### Types

- **Interfaces:** PascalCase with descriptive suffixes
  - `BinningStrategy` - Strategy type
  - `BinningConstraint` - Constraint configuration
  - `TimeBin` - Single bin output
  - `CrimeEventData` - Input data type

- **Type Aliases:** Union types use hyphenated lowercase
  - `BinningStrategy = 'daytime-heavy' | 'nighttime-heavy' | ...`

### Variables

- **Collections:** Plural nouns - `bins`, `events`, `constraints`
- **Singletons:** Singular nouns - `bin`, `event`, `constraint`
- **Maps/Sets:** Descriptive names - `typeGroups`, `binsByTime`

## Code Style

### Formatting

- Uses ESLint with Next.js TypeScript configuration (`eslint.config.mjs`)
- Prettier integrated via ESLint
- 2-space indentation

### Import Organization

1. External libraries (d3-array, zustand)
2. Internal types (`@/lib/binning/types`)
3. Relative imports from same package

```typescript
import { bin, max } from 'd3-array';
import { create } from 'zustand';
import { TimeBin } from './types';
import { BinningStrategy, BinningConfig } from './rules';
```

### Function Design

**Parameters:**
- Configuration objects last
- Typed interfaces for complex parameters

**Return:**
- Always typed with explicit return types for public functions

### Error Handling

- Return validation objects instead of throwing: `{ valid: boolean; errors: string[] }`
- Guard clauses for early returns on invalid input

## Binning Strategy Conventions

### Strategy Naming

Strategies use hyphenated lowercase:
- `daytime-heavy`
- `nighttime-heavy`
- `crime-type-specific`
- `burstiness`
- `uniform-distribution`
- `uniform-time`
- `weekday-weekend`
- `quarter-hourly`
- `hourly`
- `daily`
- `weekly`
- `auto-adaptive`

### Constraint Properties

- `minEvents?: number` - Minimum events per bin
- `maxEvents?: number` - Maximum events per bin
- `minTimeSpan?: number` - Minimum time span in ms
- `maxTimeSpan?: number` - Maximum time span in ms
- `contiguous?: boolean` - Require contiguous coverage
- `maxBins?: number` - Maximum bin count

### TimeBin Structure

```typescript
interface TimeBin {
  id: string;
  startTime: number;      // epoch ms
  endTime: number;        // epoch ms
  count: number;
  crimeTypes: string[];
  districts?: string[];
  avgTimestamp: number;
  isModified?: boolean;
  mergedFrom?: string[];
}
```

## Testing Conventions

### Test Structure

- Use `describe` blocks for test suites
- Use `test` or `it` for individual tests
- Descriptive test names following "should" pattern

```typescript
describe('generateBins interval strategies', () => {
  it('uses fixed hourly boundaries instead of event-span boundaries', () => {
    // test implementation
  });
});
```

### Test Data

- Use real-world time values with `Date.UTC()`
- Include both edge cases and typical scenarios

## Documentation

### JSDoc Usage

- Document public API functions with JSDoc
- Include parameter descriptions and return types

```typescript
/**
 * Generate bins using dynamic strategy
 */
export function generateBins(
  data: CrimeEventData[],
  config: BinningConfig
): BinningResult { ... }
```

---

*Convention analysis: 2026-03-30*
