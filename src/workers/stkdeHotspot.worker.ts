export interface StkdeWorkerHotspot {
  id: string;
  centroidLng: number;
  centroidLat: number;
  intensityScore: number;
  supportCount: number;
  peakStartEpochSec: number;
  peakEndEpochSec: number;
  radiusMeters: number;
}

export interface StkdeWorkerInput {
  requestId: number;
  hotspots: StkdeWorkerHotspot[];
  filters: {
    minIntensity?: number;
    minSupport?: number;
    temporalWindow?: [number, number] | null;
    spatialBbox?: [number, number, number, number] | null;
  };
}

export interface StkdeWorkerOutput {
  requestId: number;
  rows: StkdeWorkerHotspot[];
}

export function projectHotspots(input: StkdeWorkerInput): StkdeWorkerOutput {
  const minIntensity = input.filters.minIntensity ?? 0;
  const minSupport = input.filters.minSupport ?? 0;
  const temporal = input.filters.temporalWindow;
  const bbox = input.filters.spatialBbox;

  const rows = input.hotspots
    .filter((hotspot) => hotspot.intensityScore >= minIntensity)
    .filter((hotspot) => hotspot.supportCount >= minSupport)
    .filter((hotspot) => {
      if (!temporal) return true;
      return hotspot.peakEndEpochSec >= temporal[0] && hotspot.peakStartEpochSec <= temporal[1];
    })
    .filter((hotspot) => {
      if (!bbox) return true;
      return (
        hotspot.centroidLng >= bbox[0] &&
        hotspot.centroidLat >= bbox[1] &&
        hotspot.centroidLng <= bbox[2] &&
        hotspot.centroidLat <= bbox[3]
      );
    })
    .sort((a, b) => {
      if (b.intensityScore !== a.intensityScore) return b.intensityScore - a.intensityScore;
      if (b.supportCount !== a.supportCount) return b.supportCount - a.supportCount;
      return a.id < b.id ? -1 : 1;
    });

  return {
    requestId: input.requestId,
    rows,
  };
}

if (typeof self !== 'undefined') {
  self.onmessage = (event: MessageEvent<StkdeWorkerInput>) => {
    const output = projectHotspots(event.data);
    self.postMessage(output);
  };
}
