"use client";

import React, { useCallback } from 'react';
import { useTimeStore } from '@/store/useTimeStore';
import { Slider } from '@/components/ui/slider';
import { 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight, 
  FastForward,
  Settings2
} from 'lucide-react';

export function TimeControls() {
  const {
    currentTime,
    isPlaying,
    timeRange,
    timeWindow,
    speed,
    togglePlay,
    setTime,
    stepTime,
    setTimeWindow,
    setSpeed
  } = useTimeStore();

  const handleTimeChange = useCallback((value: number[]) => {
    setTime(value[0]);
  }, [setTime]);

  const handleWindowChange = useCallback((value: number[]) => {
    setTimeWindow(value[0]);
  }, [setTimeWindow]);

  const handleSpeedChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSpeed(Number(e.target.value));
  }, [setSpeed]);

  const formatTime = (t: number) => t.toFixed(1);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur border-t p-4 z-50 shadow-lg">
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

          {/* Main Time Slider */}
          <div className="flex-1 px-4">
            <Slider
              value={[currentTime]}
              min={timeRange[0]}
              max={timeRange[1]}
              step={0.1}
              onValueChange={handleTimeChange}
              className="cursor-pointer"
            />
          </div>

          {/* Settings Trigger (could be a popover, but inline for now) */}
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
        </div>

      </div>
    </div>
  );
}
