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
import { AdaptiveControls } from './AdaptiveControls';
import { useDraggable } from '@/hooks/useDraggable';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';

export function TimelinePanel() {
  const {
    currentTime,
    isPlaying,
    timeWindow,
    speed,
    timeScaleMode,
    togglePlay,
    stepTime,
    setTimeWindow,
    setSpeed,
    setTimeScaleMode
  } = useTimeStore();
  const warpFactor = useAdaptiveStore((state) => state.warpFactor);
  const setWarpFactor = useAdaptiveStore((state) => state.setWarpFactor);
  
  const { log } = useLogger();

  const handleWindowChange = useCallback(
    (value: number[]) => {
      if (value[0] === timeWindow) return;
      setTimeWindow(value[0]);
      log('time_window_changed', { window: value[0] });
    },
    [setTimeWindow, timeWindow, log]
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
    stepTime(direction);
    log(direction > 0 ? 'time_step_forward' : 'time_step_backward', { time: currentTime });
  };

  const handleScaleModeToggle = () => {
    const nextMode = timeScaleMode === 'linear' ? 'adaptive' : 'linear';
    setTimeScaleMode(nextMode);
    if (nextMode === 'adaptive' && warpFactor === 0) {
      setWarpFactor(1);
    }
    log('time_scale_mode_changed', { mode: nextMode });
  };

  const formatTime = (t: number) => t.toFixed(1);

  const { position, dragRef, handleMouseDown, isDragging } = useDraggable({
    storageKey: 'adaptive-controls-position',
    initialPosition: { x: 24, y: 24 }
  });

  return (
    <div className="w-full h-full bg-background border-t p-4 flex flex-col justify-center">
      <div className="w-full flex flex-col gap-4">
        
        {/* Main Controls Row */}
        <div className="flex items-center gap-4">
          
          {/* Playback Controls */}
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

          {/* Time Display */}
          <div className="font-mono text-xl font-medium w-20 text-center">
            {formatTime(currentTime)}
          </div>

          {/* Dual Timeline */}
          <div className="flex-1 min-w-0 flex flex-col">
            <DualTimeline />
          </div>

          {/* Settings Trigger */}
          <div className="flex items-center gap-4 border-l pl-4">
             {/* Speed Selector */}
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

        {/* Secondary Controls Row (Time Window) */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground px-2">
          <div className="flex items-center gap-2 min-w-[120px]">
            <Settings2 className="w-4 h-4" />
            <span>Time Window</span>
          </div>
          <div className="flex-1 max-w-xs" />
          <div className="w-12 text-right font-mono">
            {timeWindow}u
          </div>

          {/* Time Scale Mode Toggle */}
          <div className="flex items-center gap-2 border-l pl-4">
            <span>Time Scale:</span>
            <button
              onClick={handleScaleModeToggle}
              className="px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded text-xs font-medium transition-colors"
            >
              {timeScaleMode === 'linear' ? 'Linear' : 'Adaptive'}
            </button>
          </div>
        </div>


      </div>
      <div
        ref={dragRef}
        onMouseDown={handleMouseDown}
        style={{ left: position.x, top: position.y }}
        className="fixed z-[60] w-[220px] rounded-md border bg-background/90 backdrop-blur shadow-sm"
      >
        <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground border-b cursor-move select-none">
          <span>Adaptive Warp</span>
          <span>{isDragging ? 'Moving' : 'Drag'}</span>
        </div>
        <div className="p-3">
          <AdaptiveControls />
        </div>
      </div>
    </div>
  );
}
