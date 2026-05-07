"use client";

import { useEffect } from 'react';
import { SkipBack, SkipForward, Pause, Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDemoEvolutionSequence } from '@/components/dashboard-demo/lib/useDemoEvolutionSequence';

export function DemoEvolutionPanel() {
  const {
    frames,
    activeIndex,
    playbackLabel,
    isEmpty,
    isPlaying,
    speed,
    canStepBackward,
    canStepForward,
    previousSliceId,
    nextSliceId,
    stepBackward,
    stepForward,
    jumpToSliceId,
    togglePlayback,
  } = useDemoEvolutionSequence();

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const delayMs = Math.max(250, Math.round(1000 / Math.max(speed, 0.5)));
    const timer = window.setInterval(() => {
      stepForward();
    }, delayMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [isPlaying, speed, stepForward]);

  if (isEmpty) {
    return (
      <Card className="border-border/70 bg-card/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Evolution</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">No slices available for evolution playback.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Add slices to step through the temporal sequence.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 bg-card/80 shadow-sm">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium">Evolution</CardTitle>
          <Badge variant="outline" className="rounded-full">{playbackLabel}</Badge>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          Step through the slice sequence or play it back as a temporal progression.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={stepBackward} disabled={!canStepBackward} className="gap-1">
            <SkipBack className="size-3.5" />
            Previous
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={togglePlayback} className="gap-1">
            {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            play/pause
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={stepForward} disabled={!canStepForward} className="gap-1">
            <SkipForward className="size-3.5" />
            Next
          </Button>
        </div>

        <div className="rounded-md border border-border/60 bg-muted/10 p-3">
          <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Current step</div>
          <div className="text-sm font-medium text-foreground">
            {frames[activeIndex]?.label ?? '—'}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {previousSliceId ? `Previous: ${previousSliceId}` : 'Previous: —'} · {nextSliceId ? `Next: ${nextSliceId}` : 'Next: —'}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Slice filmstrip</div>
          <div className="grid grid-cols-3 gap-2">
            {frames.map((frame) => (
              <button
                key={frame.id}
                type="button"
                onClick={() => jumpToSliceId(frame.id)}
                className={`rounded-md border px-2 py-2 text-left text-xs transition ${frame.isActive ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'}`}
              >
                <div className="font-medium">{frame.label}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.18em]">{frame.isActive ? 'Active' : 'Queued'}</div>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
