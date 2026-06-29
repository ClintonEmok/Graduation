"use client";

import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCoordinationStore } from '@/store/useCoordinationStore';
import { useTimeStore } from '@/store/useTimeStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import {
  DEMO_PRESETS,
  DEMO_PRESET_ORDER,
  type DemoPreset,
  type DemoPresetId,
  presetToNormalizedRange,
} from '@/lib/demo/preset-windows';

const TOOLTIP_NO_DATA = 'Load data first';
const SELECT_PLACEHOLDER = 'Demo presets';
const NONE_VALUE = '__demo_preset_none__';

interface PresetGroup {
  label: string;
  ids: readonly DemoPresetId[];
}

const PRESET_GROUPS: ReadonlyArray<PresetGroup> = [
  { label: 'Reset', ids: ['reset'] },
  { label: 'Study tasks', ids: ['T4', 'T1u', 'T1a', 'T2u', 'T2a', 'T3a', 'T3b', 'T8u', 'T8a'] },
];

/**
 * Demo Presets — Demo-only dropdown for fast switching between study-protocol
 * time windows + scale mode. Mounted in the dashboard TopBar.
 *
 * - Brush range is written to `useCoordinationStore` (the store that
 *   `/dashboard` components — Map, Cube, DualTimeline — actually subscribe
 *   to). The dashboard-demo coordination store is a separate store used by
 *   `/dashboard-demo` and `/evaluation` and is intentionally NOT written.
 * - Scale mode is written to `useTimeStore.setTimeScaleMode` (the store
 *   `CubeVisualization` and the timeline read from on `/dashboard`).
 * - Range is normalised to percent [0, 100] to match
 *   `useCoordinationStore.brushRange` and `epochSecondsToNormalized`.
 */
export function DemoPresetSelect() {
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const isLoading = useTimelineDataStore((state) => state.isLoading);
  const dataCount = useTimelineDataStore((state) => state.dataCount);

  const setBrushRange = useCoordinationStore((state) => state.setBrushRange);
  const setTimeScaleMode = useTimeStore((state) => state.setTimeScaleMode);

  const [activePresetId, setActivePresetId] = useState<DemoPresetId | null>(null);

  const hasData = !isLoading && (dataCount ?? 0) > 0;
  const disabled = !hasData;

  // The chip is purely cosmetic — only show it while data is loaded. We
  // derive this from the loaded data state instead of syncing it through
  // an effect (the React Compiler disallows setState-in-effect without
  // a subscription). If the data is cleared, the chip disappears; the
  // underlying brushRange may briefly persist in the store until the user
  // picks a new preset.
  const visiblePresetId = hasData ? activePresetId : null;

  const groupedPresets = useMemo(
    () =>
      PRESET_GROUPS.map((group) => ({
        label: group.label,
        presets: group.ids
          .map((id) => DEMO_PRESETS[id])
          .filter((preset): preset is DemoPreset => preset !== undefined),
      })),
    [],
  );

  const handleSelect = useCallback(
    (presetId: string) => {
      if (presetId === NONE_VALUE) {
        setActivePresetId(null);
        return;
      }
      const preset = DEMO_PRESETS[presetId as DemoPresetId];
      if (!preset) return;

      if (preset.timeRange === null) {
        // Reset: full data range, no brush, drop the chip.
        setBrushRange(null);
        setTimeScaleMode(preset.mode);
        setActivePresetId(null);
        toast.success(`Loaded ${preset.id}: ${preset.chip}`, {
          description: 'Full data range · linear scale',
        });
        return;
      }

      const range = presetToNormalizedRange(preset, minTimestampSec, maxTimestampSec);
      if (range === null) {
        toast.error(`Cannot load ${preset.id}`, {
          description: 'Timeline bounds unavailable. Wait for data to finish loading.',
        });
        return;
      }

      setBrushRange(range);
      setTimeScaleMode(preset.mode);
      setActivePresetId(preset.id);
      toast.success(`Loaded ${preset.id}: ${preset.chip}`, {
        description: `${preset.timeRange[0]} → ${preset.timeRange[1]} · ${preset.mode}`,
      });
    },
    [minTimestampSec, maxTimestampSec, setBrushRange, setTimeScaleMode],
  );

  const trigger = (
    <Select
      onValueChange={handleSelect}
      value={activePresetId ?? NONE_VALUE}
      disabled={disabled}
    >
      <SelectTrigger
        size="sm"
        data-testid="demo-preset-select-trigger"
        className="h-8 min-w-[160px] rounded-full border bg-background/70 px-3 text-xs text-muted-foreground hover:bg-muted"
        aria-label="Demo presets"
      >
        <SelectValue placeholder={SELECT_PLACEHOLDER} />
      </SelectTrigger>
      <SelectContent align="end" className="min-w-[280px]">
        {groupedPresets.map((group) => (
          <SelectGroup key={group.label}>
            <SelectLabel>{group.label}</SelectLabel>
            {group.presets.map((preset) => (
              <SelectItem
                key={preset.id}
                value={preset.id}
                data-testid={`demo-preset-option-${preset.id}`}
              >
                <span className="flex items-center gap-2">
                  <span>{preset.label}</span>
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                    {preset.chip}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex items-center gap-2" data-testid="demo-preset-select">
        {disabled ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} className="inline-flex">
                {trigger}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">{TOOLTIP_NO_DATA}</TooltipContent>
          </Tooltip>
        ) : (
          trigger
        )}
        {visiblePresetId !== null ? (
          <Badge
            variant="secondary"
            data-testid="demo-preset-chip"
            className="font-mono text-[10px]"
          >
            {DEMO_PRESETS[visiblePresetId]?.chip ?? visiblePresetId}
          </Badge>
        ) : null}
      </div>
    </TooltipProvider>
  );
}

/**
 * Re-export the preset order so tests / devtools can assert that the
 * dropdown renders the locked T4 -> T1 -> T2 -> T3 sequence.
 */
export { DEMO_PRESET_ORDER, DEMO_PRESETS };
export type { DemoPreset, DemoPresetId };

