# Coding Conventions - Timeline & Visualization

**Analysis Date:** 2026-03-30

## Component Structure

### Props Interface Naming
```typescript
// Components export both Props interface and implementation
interface DualTimelineProps {
  adaptiveWarpMapOverride?: Float32Array | null;
  domainOverride?: [number, number];
  interactive?: boolean;
  // ...
}

export const DualTimeline: React.FC<DualTimelineProps> = ({ ... })
```

### Component Patterns

**1. Single-File Component with Collocated Types**
- Props interfaces defined in same file as component
- Default values in destructured props
- Early returns for empty/error states

**2. Custom Hooks for Complex Logic**
- Scale transforms: `useScaleTransforms`
- Density derivation: `useDensityStripDerivation`
- Brush/zoom sync: `useBrushZoomSync`
- Point selection: `usePointSelection`

### Scale Computation Pattern
```typescript
const { overviewScale, detailScale } = useScaleTransforms({
  domainStart,
  domainEnd,
  detailRangeSec,
  overviewInnerWidth,
  detailInnerWidth,
  timeScaleMode,
  warpFactor,
  warpMap,
  warpDomain,
});
```

## Data Processing Patterns

### Binning for Histograms
```typescript
const binner = bin<number, number>()
  .value((d) => d)
  .domain([domainStart, domainEnd])
  .thresholds(50);

const bins = binner(values);
const maxCount = max(bins, (d) => d.length) || 1;
```

### Density Map Computation
```typescript
const computeDensityMap = (
  timestamps: number[],
  domain: [number, number],
  binCount: number,
  kernelWidth: number
): Float32Array => {
  // ... kernel smoothing and normalization
  return normalized;
};
```

### Adaptive Scale Warping
```typescript
const toDisplaySeconds = (linearSec, warpFactor, warpMap, warpDomain) => {
  const warpedSec = sampleWarpSeconds(linearSec, warpMap, warpDomain);
  return linearSec * (1 - warpFactor) + warpedSec * warpFactor;
};
```

## SVG Rendering Conventions

### Dimensions via Hooks
```typescript
const [containerRef, bounds] = useMeasure<HTMLDivElement>();
const width = Math.max(0, bounds.width ?? 0);
const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
```

### Margin Convention
```typescript
const OVERVIEW_MARGIN = { top: 8, right: 12, bottom: 10, left: 12 };
const DETAIL_MARGIN = { top: 8, right: 12, bottom: 12, left: 12 };
```

### SVG Element Structure
```typescript
<svg width={width} height={height}>
  <defs>
    {/* Gradients, filters, patterns */}
  </defs>
  <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
    {/* Content */}
  </g>
</svg>
```

## Canvas Rendering Patterns

### DensityHeatStrip Canvas Usage
```typescript
const canvasRef = useRef<HTMLCanvasElement>(null);

useEffect(() => {
  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Draw to canvas
}, [width, height]);
```

## Defensive Coding

### Null/NaN Handling
```typescript
const clampToRange = (value: number, min: number, max: number): number => {
  if (Number.isNaN(value)) return min;
  if (value === Number.POSITIVE_INFINITY) return max;
  if (value === Number.NEGATIVE_INFINITY) return min;
  return Math.min(Math.max(value, min), max);
};
```

### Selection Position Guards
```typescript
const resolveSelectionX = (
  timestampSec: number | null | undefined,
  toX: (date: Date) => number,
  width: number
): number | null => {
  if (timestampSec === null || timestampSec === undefined || !Number.isFinite(timestampSec)) {
    return null;
  }
  const x = toX(new Date(timestampSec * 1000));
  if (!Number.isFinite(x) || x < 0 || x > width) {
    return null;
  }
  return x;
};
```

## Color/Theme Conventions

### Constant Color Palettes
```typescript
const SLICE_COLOR_PALETTE: Record<string, { fill: string; stroke: string }> = {
  amber: { fill: 'rgba(251, 191, 36, 0.28)', stroke: 'rgba(251, 191, 36, 0.9)' },
  blue: { fill: 'rgba(59, 130, 246, 0.24)', stroke: 'rgba(96, 165, 250, 0.9)' },
  // ...
};

const DENSITY_COLOR_LOW: [number, number, number] = [59, 130, 246];
const DENSITY_COLOR_HIGH: [number, number, number] = [239, 68, 68];
```

### CSS Variable Usage
- Uses Tailwind classes: `fill-primary/20`, `text-muted-foreground`
- Custom colors via inline styles for gradients

## Animation Patterns

### SVG SMIL Animations
```typescript
<animate attributeName="opacity" values="0.55;1;0.55" dur="1.8s" repeatCount="indefinite" />
```

### CSS Transitions
```typescript
className={`block rounded-sm transition-opacity duration-200 ${isLoading ? 'opacity-55' : 'opacity-80'}`}
```

---

*Convention analysis: 2026-03-30*
