import { useMemo } from 'react';
import { useCoordinationStore } from '@/store/useCoordinationStore';
import { useDataStore } from '@/store/useDataStore';
import { normalizedToEpochSeconds } from '@/lib/time-domain';
import { getCrimeTypeId, getCrimeTypeName } from '@/lib/category-maps';

type StatRow = { label: string; value: string };
type GapBin = { label: string; count: number; percent: number };

const formatInterval = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'n/a';
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${(seconds / 86400).toFixed(1)}d`;
};

export function BurstDetails() {
  const selectedBurstWindow = useCoordinationStore((state) => state.selectedBurstWindow);
  const data = useDataStore((state) => state.data);
  const columns = useDataStore((state) => state.columns);
  const minTimestampSec = useDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useDataStore((state) => state.maxTimestampSec);

  const stats = useMemo(() => {
    if (!selectedBurstWindow) return null;
    const { start, end } = selectedBurstWindow;
    const startNorm = Math.min(start, end);
    const endNorm = Math.max(start, end);

    const times: number[] = [];
    const typeCounts = new Map<string, number>();

    if (columns) {
      for (let i = 0; i < columns.length; i += 1) {
        const t = columns.timestamp[i];
        if (t < startNorm || t > endNorm) continue;
        const epoch = minTimestampSec !== null && maxTimestampSec !== null
          ? normalizedToEpochSeconds(t, minTimestampSec, maxTimestampSec)
          : t;
        times.push(epoch);
        const typeName = getCrimeTypeName(columns.type[i]);
        typeCounts.set(typeName, (typeCounts.get(typeName) ?? 0) + 1);
      }
    } else {
      for (const point of data) {
        const t = typeof point.timestamp === 'number' ? point.timestamp : NaN;
        if (!Number.isFinite(t)) continue;
        if (t < startNorm || t > endNorm) continue;
        times.push(t);
        const typeId = getCrimeTypeId(point.type);
        const typeName = getCrimeTypeName(typeId);
        typeCounts.set(typeName, (typeCounts.get(typeName) ?? 0) + 1);
      }
    }

    times.sort((a, b) => a - b);
    const deltas: number[] = [];
    for (let i = 1; i < times.length; i += 1) {
      deltas.push(times[i] - times[i - 1]);
    }
    const meanDelta = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
    const sortedDeltas = [...deltas].sort((a, b) => a - b);
    const medianDelta = sortedDeltas.length
      ? sortedDeltas[Math.floor(sortedDeltas.length / 2)]
      : 0;

    const gapBins: GapBin[] = [
      { label: '<1m', count: 0, percent: 0 },
      { label: '1-5m', count: 0, percent: 0 },
      { label: '5-15m', count: 0, percent: 0 },
      { label: '15-60m', count: 0, percent: 0 },
      { label: '1-6h', count: 0, percent: 0 },
      { label: '>6h', count: 0, percent: 0 }
    ];

    for (const delta of deltas) {
      if (delta < 60) gapBins[0].count += 1;
      else if (delta < 300) gapBins[1].count += 1;
      else if (delta < 900) gapBins[2].count += 1;
      else if (delta < 3600) gapBins[3].count += 1;
      else if (delta < 21600) gapBins[4].count += 1;
      else gapBins[5].count += 1;
    }

    const totalGaps = Math.max(1, deltas.length);
    for (const bin of gapBins) {
      bin.percent = (bin.count / totalGaps) * 100;
    }

    const topTypes = Array.from(typeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({
        name,
        count,
        percent: times.length ? (count / times.length) * 100 : 0
      }));

    const rows: StatRow[] = [
      { label: 'Events', value: `${times.length}` },
      { label: 'Mean gap', value: formatInterval(meanDelta) },
      { label: 'Median gap', value: formatInterval(medianDelta) }
    ];

    return { rows, topTypes, gapBins, total: times.length };
  }, [columns, data, maxTimestampSec, minTimestampSec, selectedBurstWindow]);

  if (!selectedBurstWindow || !stats) return null;

  return (
    <div className="p-4 border-t">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Burst Composition</h3>
        <span className="text-[10px] text-muted-foreground">
          {selectedBurstWindow.metric === 'burstiness' ? 'Inter-arrival' : 'Density'}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        {stats.rows.map((row) => (
          <div key={row.label} className="rounded-md border px-2 py-1">
            <div className="text-[10px] text-muted-foreground">{row.label}</div>
            <div className="font-medium text-foreground">{row.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <div className="text-[10px] uppercase text-muted-foreground">Top Crime Types</div>
        <div className="mt-2 space-y-2">
          {stats.topTypes.length === 0 && (
            <div className="text-xs text-muted-foreground">No events in this window.</div>
          )}
          {stats.topTypes.map((entry) => (
            <div key={entry.name} className="flex items-center justify-between text-xs">
              <span>{entry.name}</span>
              <span className="text-muted-foreground">
                {entry.count} ({entry.percent.toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <div className="text-[10px] uppercase text-muted-foreground">Inter-event Gaps</div>
        <div className="mt-2 space-y-2">
          {stats.gapBins.map((bin) => (
            <div key={bin.label} className="flex items-center gap-2 text-xs">
              <div className="w-12 text-muted-foreground">{bin.label}</div>
              <div className="flex-1 h-2 rounded bg-muted/40 overflow-hidden">
                <div
                  className="h-full bg-primary/60"
                  style={{ width: `${Math.min(100, bin.percent)}%` }}
                />
              </div>
              <div className="w-12 text-right text-muted-foreground">
                {bin.percent.toFixed(0)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
