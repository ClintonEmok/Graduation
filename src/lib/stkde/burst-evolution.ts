export interface BurstEvolutionSliceInput {
  id: string;
  name?: string;
  type: 'point' | 'range';
  time: number;
  range?: [number, number];
  isVisible: boolean;
  isBurst?: boolean;
  burstScore?: number;
  burstClass?: 'prolonged-peak' | 'isolated-spike' | 'valley' | 'neutral';
}

export interface BurstEvolutionWindowInput {
  id: string;
  start: number;
  end: number;
  burstScore: number;
  burstClass?: 'prolonged-peak' | 'isolated-spike' | 'valley' | 'neutral';
}

export interface BurstEvolutionSliceNode {
  id: string;
  label: string;
  score: number;
  normalizedScore: number;
  isActive: boolean;
  isBurst: boolean;
  burstClass: BurstEvolutionSliceInput['burstClass'];
  center: number;
  windowIds: string[];
}

export interface BurstEvolutionConnectorSegment {
  id: string;
  fromId: string;
  toId: string;
  score: number;
  windowId: string;
  burstClass: BurstEvolutionWindowInput['burstClass'];
}

export interface BurstEvolutionModel {
  sliceNodes: BurstEvolutionSliceNode[];
  connectorSegments: BurstEvolutionConnectorSegment[];
  strongestScore: number;
  activeWindowIds: string[];
  isNeutral: boolean;
}

function getSliceCenter(slice: BurstEvolutionSliceInput): number {
  if (slice.type === 'range' && slice.range) {
    const start = Math.min(slice.range[0], slice.range[1]);
    const end = Math.max(slice.range[0], slice.range[1]);
    return (start + end) / 2;
  }

  return slice.time;
}

function overlaps(slice: BurstEvolutionSliceInput, window: BurstEvolutionWindowInput): boolean {
  if (slice.type === 'range' && slice.range) {
    const [start, end] = [Math.min(slice.range[0], slice.range[1]), Math.max(slice.range[0], slice.range[1])];
    const windowStart = Math.min(window.start, window.end);
    const windowEnd = Math.max(window.start, window.end);
    return end >= windowStart && start <= windowEnd;
  }

  const time = slice.time;
  const windowStart = Math.min(window.start, window.end);
  const windowEnd = Math.max(window.start, window.end);
  return time >= windowStart && time <= windowEnd;
}

function buildNeutralModel(): BurstEvolutionModel {
  return {
    sliceNodes: [],
    connectorSegments: [],
    strongestScore: 0,
    activeWindowIds: [],
    isNeutral: true,
  };
}

export function buildBurstEvolutionModel({
  slices,
  burstWindows,
}: {
  slices: BurstEvolutionSliceInput[];
  burstWindows: BurstEvolutionWindowInput[];
}): BurstEvolutionModel {
  const visibleSlices = slices
    .filter((slice) => slice.isVisible)
    .map((slice) => ({ ...slice, center: getSliceCenter(slice) }))
    .sort((left, right) => left.center - right.center || left.id.localeCompare(right.id));

  if (visibleSlices.length === 0 || burstWindows.length === 0) {
    return buildNeutralModel();
  }

  const strongestScore = Math.max(
    0,
    ...visibleSlices.map((slice) => Math.max(0, slice.burstScore ?? 0)),
    ...burstWindows.map((window) => Math.max(0, window.burstScore ?? 0))
  );
  const scoreBase = Math.max(1, strongestScore);

  const sliceNodes: BurstEvolutionSliceNode[] = visibleSlices.map((slice) => {
    const score = Math.max(0, slice.burstScore ?? 0);
    const windowIds = burstWindows.filter((window) => overlaps(slice, window)).map((window) => window.id);

    return {
      id: slice.id,
      label: slice.name?.trim() || slice.id,
      score,
      normalizedScore: score / scoreBase,
      isActive: (slice.isBurst ?? false) || score > 0,
      isBurst: slice.isBurst ?? score > 0,
      burstClass: slice.burstClass,
      center: slice.center,
      windowIds,
    };
  });

  const connectorSegments: BurstEvolutionConnectorSegment[] = [];
  const seenSegmentKeys = new Set<string>();
  const activeWindowIds: string[] = [];

  for (const window of burstWindows) {
    const matchedNodes = sliceNodes.filter((node) => {
      const sourceSlice = visibleSlices.find((slice) => slice.id === node.id);
      return sourceSlice ? overlaps(sourceSlice, window) : false;
    });

    if (matchedNodes.length === 0) {
      continue;
    }

    activeWindowIds.push(window.id);

    for (let index = 0; index < matchedNodes.length - 1; index += 1) {
      const from = matchedNodes[index];
      const to = matchedNodes[index + 1];
      const key = `${window.id}:${from.id}->${to.id}`;
      if (seenSegmentKeys.has(key)) {
        continue;
      }

      seenSegmentKeys.add(key);
      connectorSegments.push({
        id: key,
        fromId: from.id,
        toId: to.id,
        score: (from.score + to.score + window.burstScore) / 3,
        windowId: window.id,
        burstClass: window.burstClass,
      });
    }
  }

  return {
    sliceNodes,
    connectorSegments,
    strongestScore,
    activeWindowIds: Array.from(new Set(activeWindowIds)),
    isNeutral: connectorSegments.length === 0,
  };
}
