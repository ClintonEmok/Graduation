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

  const handleWindowChange = useCallback((value: number[]) => {
    setTimeWindow(value[0]);
  }, [setTimeWindow]);

  const handleSpeedChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSpeed(Number(e.target.value));
  }, [setSpeed]);

  const formatTime = (t: number) => t.toFixed(1);

  return (
    <div className="w-full h-full bg-background border-t p-4 flex flex-col justify-center">
      <div className="container mx-auto max-w-4xl flex flex-col gap-4">
        
        {/* Main Controls Row */}
        <div className="flex items-center gap-4">
          
          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => stepTime(-1)}
              className="p-2 hover:bg-accent rounded-full transition-colors"
              title="Step Backward"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <button
              onClick={togglePlay}
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
              onClick={() => stepTime(1)}
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
          <div className="flex-1 px-4 flex flex-col">
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
          <div className="flex-1 max-w-xs">
            <Slider
              value={[timeWindow]}
              min={1}
              max={20}
              step={1}
              onValueChange={handleWindowChange}
            />
          </div>
          <div className="w-12 text-right font-mono">
            {timeWindow}u
          </div>

          {/* Time Scale Mode Toggle */}
          <div className="flex items-center gap-2 border-l pl-4">
            <span>Time Scale:</span>
            <button
              onClick={() => setTimeScaleMode(timeScaleMode === 'linear' ? 'adaptive' : 'linear')}
              className="px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded text-xs font-medium transition-colors"
            >
              {timeScaleMode === 'linear' ? 'Linear' : 'Adaptive'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
