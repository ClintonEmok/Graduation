import { useMemo } from 'react';
import * as THREE from 'three';
import { timeDay, timeHour, timeMonth, timeWeek, timeYear } from 'd3-time';
import { useTimeStore } from '@/store/useTimeStore';
import { useDataStore } from '@/store/useDataStore';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { epochSecondsToNormalized } from '@/lib/time-domain';

const GRID_SIZE = 100;
const HALF = GRID_SIZE / 2;
const MAX_LINES = 40;

export function TimeGrid() {
  const timeResolution = useTimeStore((state) => state.timeResolution);
  const minTimestampSec = useDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useDataStore((state) => state.maxTimestampSec);
  const densityMap = useAdaptiveStore((state) => state.densityMap);
  const burstinessMap = useAdaptiveStore((state) => state.burstinessMap);
  const burstMetric = useAdaptiveStore((state) => state.burstMetric);
  const burstCutoff = useAdaptiveStore((state) => state.burstCutoff);
  const mapDomain = useAdaptiveStore((state) => state.mapDomain);

  const lineYs = useMemo(() => {
    if (minTimestampSec !== null && maxTimestampSec !== null) {
      const start = new Date(minTimestampSec * 1000);
      const end = new Date(maxTimestampSec * 1000);
      let interval = timeDay.every(1);

      switch (timeResolution) {
        case 'seconds':
        case 'minutes':
        case 'hours':
          interval = timeHour.every(6) ?? timeHour;
          break;
        case 'days':
          interval = timeDay.every(1) ?? timeDay;
          break;
        case 'weeks':
          interval = timeWeek.every(1) ?? timeWeek;
          break;
        case 'months':
          interval = timeMonth.every(1) ?? timeMonth;
          break;
        case 'years':
          interval = timeYear.every(1) ?? timeYear;
          break;
        default:
          interval = timeDay.every(1) ?? timeDay;
      }

      const ticks = interval.range(start, end);
      const pruned = ticks.length > MAX_LINES ? ticks.filter((_, index) => index % Math.ceil(ticks.length / MAX_LINES) === 0) : ticks;
      return pruned.map((date) => epochSecondsToNormalized(date.getTime() / 1000, minTimestampSec, maxTimestampSec));
    }

    const step = GRID_SIZE / 10;
    return Array.from({ length: 11 }).map((_, idx) => idx * step);
  }, [minTimestampSec, maxTimestampSec, timeResolution]);

  const geometry = useMemo(() => {
    const segments = lineYs.length * 8;
    const positions = new Float32Array(segments * 3);
    let offset = 0;

    for (const y of lineYs) {
      const points = [
        -HALF, y, -HALF,
        HALF, y, -HALF,
        HALF, y, -HALF,
        HALF, y, HALF,
        HALF, y, HALF,
        -HALF, y, HALF,
        -HALF, y, HALF,
        -HALF, y, -HALF
      ];
      positions.set(points, offset);
      offset += points.length;
    }

    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return buffer;
  }, [lineYs]);

  const burstBands = useMemo(() => {
    const selectedMap = burstMetric === 'burstiness' ? burstinessMap : densityMap;
    if (!selectedMap || selectedMap.length === 0) return [] as number[];
    const span = Math.max(0.0001, mapDomain[1] - mapDomain[0]);
    const hits: number[] = [];
    for (let i = 0; i < selectedMap.length; i += 1) {
      if (selectedMap[i] >= burstCutoff) {
        const y = mapDomain[0] + (i / (selectedMap.length - 1)) * span;
        hits.push(y);
      }
    }
    if (hits.length === 0) return [] as number[];
    const compressed: number[] = [hits[0]];
    const tolerance = span * 0.01;
    for (let i = 1; i < hits.length; i += 1) {
      if (Math.abs(hits[i] - compressed[compressed.length - 1]) > tolerance) {
        compressed.push(hits[i]);
      }
    }
    return compressed;
  }, [burstCutoff, burstMetric, burstinessMap, densityMap, mapDomain]);

  const burstGeometry = useMemo(() => {
    if (burstBands.length === 0) return null;
    const segments = burstBands.length * 8;
    const positions = new Float32Array(segments * 3);
    let offset = 0;

    for (const y of burstBands) {
      const points = [
        -HALF, y, -HALF,
        HALF, y, -HALF,
        HALF, y, -HALF,
        HALF, y, HALF,
        HALF, y, HALF,
        -HALF, y, HALF,
        -HALF, y, HALF,
        -HALF, y, -HALF
      ];
      positions.set(points, offset);
      offset += points.length;
    }

    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return buffer;
  }, [burstBands]);

  return (
    <group>
      <lineSegments geometry={geometry}>
        <lineBasicMaterial color="#94a3b8" transparent opacity={0.2} depthWrite={false} />
      </lineSegments>
      {burstGeometry && (
        <lineSegments geometry={burstGeometry}>
          <lineBasicMaterial color="#f97316" transparent opacity={0.6} depthWrite={false} />
        </lineSegments>
      )}
    </group>
  );
}
