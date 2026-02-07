"use client";

import React, { useCallback } from 'react';
import { useTimeStore } from '@/store/useTimeStore';
import { 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight, 
  FastForward,
  Settings2
} from 'lucide-react';

import { Slider } from '@/components/ui/slider';
import { DualTimeline } from './DualTimeline';
import { useLogger } from '@/hooks/useLogger';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';
import { useDataStore } from '@/store/useDataStore';
import { normalizedToEpochSeconds, resolutionToNormalizedStep } from '@/lib/time-domain';

export function TimelinePanel() {
  const {
    currentTime,
    isPlaying,
    timeWindow,
    speed,
    timeResolution,
    timeScaleMode,
    togglePlay,
    setTime,
    stepTime,
    setTimeWindow,
    setTimeResolution,
    setSpeed,
    setTimeScaleMode
  } = useTimeStore();
  const minTimestampSec = useDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useDataStore((state) => state.maxTimestampSec);
  const warpFactor = useAdaptiveStore((state) => state.warpFactor);
  const setWarpFactor = useAdaptiveStore((state) => state.setWarpFactor);
  
  const { log } = useLogger();

  const handleResolutionChange = useCallback(
    (value: number[]) => {
      const options: typeof timeResolution[] = ['seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years'];
      const next = options[Math.round(value[0])] ?? 'days';
      if (next === timeResolution) return;
      setTimeResolution(next);
      log('time_resolution_changed', { resolution: next });
    },
    [setTimeResolution, timeResolution, log]
  );

  const handleSpeedChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSpeed = Number(e.target.value);
    setSpeed(newSpeed);
    log('playback_speed_changed', { speed: newSpeed });
  }, [setSpeed, log]);

  const handleTogglePlay = () => {
    togglePlay();
    log(isPlaying ? 'playback_paused' : 'playback_started', { time: currentTime });
  };

  const handleStep = (direction: number) => {
    const stepSize = resolutionToNormalizedStep(timeResolution, minTimestampSec, maxTimestampSec);
    const next = currentTime + direction * stepSize;
    setTime(next);
    log(direction > 0 ? 'time_step_forward' : 'time_step_backward', { time: next });
  };

  const handleScaleModeToggle = () => {
    const nextMode = timeScaleMode === 'linear' ? 'adaptive' : 'linear';
    setTimeScaleMode(nextMode);
    if (nextMode === 'adaptive' && warpFactor === 0) {
      setWarpFactor(1);
    }
    log('time_scale_mode_changed', { mode: nextMode });
  };

  const formatTime = (t: number) => {
    if (minTimestampSec !== null && maxTimestampSec !== null) {
      const epochSec = normalizedToEpochSeconds(t, minTimestampSec, maxTimestampSec);
      return new Date(epochSec * 1000).toLocaleString();
    }
    return t.toFixed(2);
  };

  return (
    <div className="w-full h-full bg-background border-t p-4 flex flex-col justify-center">
      <div className="w-full flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleStep(-1)}
                className="p-2 hover:bg-accent rounded-full transition-colors"
                title="Step Backward"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <button
                onClick={handleTogglePlay}
                className="p-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors shadow-sm"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 fill-current" />
                ) : (
                  <Play className="w-6 h-6 fill-current ml-1" />
                )}
              </button>
              
              <button
                onClick={() => handleStep(1)}
                className="p-2 hover:bg-accent rounded-full transition-colors"
                title="Step Forward"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col leading-none">
              <span className="text-[10px] text-muted-foreground">Current Time</span>
              <span className="font-mono text-xl font-medium">{formatTime(currentTime)}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Time Scale</span>
              <button
                onClick={handleScaleModeToggle}
                className="px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded text-xs font-medium transition-colors"
              >
                {timeScaleMode === 'linear' ? 'Linear' : 'Adaptive'}
              </button>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FastForward className="w-4 h-4" />
              <select 
                value={speed}
                onChange={handleSpeedChange}
                className="bg-transparent border-none focus:ring-0 cursor-pointer font-medium text-foreground"
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1.0x</option>
                <option value={2}>2.0x</option>
                <option value={5}>5.0x</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-md border bg-muted/10 px-3 py-2">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground pb-2">
            <span>Timeline Overview + Detail</span>
            <span>Drag overview to zoom • Click detail to select</span>
          </div>
          <DualTimeline />
        </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 min-w-[120px]">
              <Settings2 className="w-4 h-4" />
            <span>Time Resolution</span>
            </div>
            <div className="flex-1 max-w-lg">
              <Slider
              min={0}
              max={6}
              step={1}
              value={[['seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years'].indexOf(timeResolution)]}
              onValueChange={handleResolutionChange}
              />
            </div>
            <div className="w-12 text-right font-mono">
            {timeResolution}
            </div>
          </div>
      </div>
    </div>
  );
}
