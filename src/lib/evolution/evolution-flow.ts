export interface EvolutionFlowSliceInput {
  id: string;
  label?: string;
  type: 'point' | 'range';
  time: number;
  range?: [number, number];
  isVisible: boolean;
}

export interface EvolutionFlowSegment {
  id: string;
  fromId: string;
  toId: string;
  label: string;
  direction: 'forward' | 'backward';
  strength: number;
  fromCenter: number;
  toCenter: number;
  isActive: boolean;
}

export interface EvolutionFlowModel {
  orderedSliceIds: string[];
  flowSegments: EvolutionFlowSegment[];
  activeIndex: number;
  activeSliceId: string | null;
  isNeutral: boolean;
}

const resolveCenter = (slice: EvolutionFlowSliceInput) => {
  if (slice.type === 'range' && slice.range) {
    const start = Math.min(slice.range[0], slice.range[1]);
    const end = Math.max(slice.range[0], slice.range[1]);
    return (start + end) / 2;
  }

  return slice.time;
};

export function buildEvolutionFlowModel({
  slices,
  activeSliceId,
}: {
  slices: EvolutionFlowSliceInput[];
  activeSliceId: string | null;
}): EvolutionFlowModel {
  const orderedSlices = slices
    .filter((slice) => slice.isVisible)
    .map((slice) => ({ ...slice, center: resolveCenter(slice) }))
    .sort((left, right) => left.center - right.center || left.id.localeCompare(right.id));

  if (orderedSlices.length === 0) {
    return {
      orderedSliceIds: [],
      flowSegments: [],
      activeIndex: -1,
      activeSliceId: null,
      isNeutral: true,
    };
  }

  const orderedSliceIds = orderedSlices.map((slice) => slice.id);
  const activeIndex = Math.max(0, orderedSliceIds.indexOf(activeSliceId ?? ''));

  const flowSegments = orderedSlices.slice(0, -1).map((slice, index) => {
    const next = orderedSlices[index + 1];
    const isActive = activeSliceId === slice.id || activeSliceId === next.id;

    return {
      id: `${slice.id}->${next.id}`,
      fromId: slice.id,
      toId: next.id,
      label: `${slice.label?.trim() || slice.id} → ${next.label?.trim() || next.id}`,
      direction: next.center >= slice.center ? 'forward' : 'backward',
      strength: Math.max(0.15, 1 - Math.min(0.85, Math.abs(next.center - slice.center) / 100)),
      fromCenter: slice.center,
      toCenter: next.center,
      isActive,
    } satisfies EvolutionFlowSegment;
  });

  return {
    orderedSliceIds,
    flowSegments,
    activeIndex,
    activeSliceId: activeSliceId ?? orderedSliceIds[0] ?? null,
    isNeutral: false,
  };
}
