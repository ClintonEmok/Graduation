"use client";

import { useState } from 'react';
import { ChevronDown, ChevronUp, GripVertical, PanelRightOpen } from 'lucide-react';
import { AdaptiveControls } from '@/components/timeline/AdaptiveControls';
import { FloatingToolbar } from '@/components/viz/FloatingToolbar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDraggable } from '@/hooks/useDraggable';
import { useCoordinationStore } from '@/store/useCoordinationStore';
import { useDataStore } from '@/store/useDataStore';

export function TopBar() {
  const [adaptiveDocked, setAdaptiveDocked] = useState(true);
  const [toolbarDocked, setToolbarDocked] = useState(true);
  const [adaptiveOpen, setAdaptiveOpen] = useState(false);
  const setDetailsOpen = useCoordinationStore((state) => state.setDetailsOpen);
  const { columns, data, generateMockData } = useDataStore();

  const { position, dragRef, handleMouseDown, isDragging } = useDraggable({
    storageKey: 'adaptive-controls-floating',
    initialPosition: { x: 24, y: 72 }
  });

  return (
    <div className="flex h-14 w-full items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur">
      <div className="flex items-center gap-3">
        {toolbarDocked ? (
          <FloatingToolbar variant="docked" onDetach={() => setToolbarDocked(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setToolbarDocked(true)}
            className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
          >
            Dock toolbar
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {!columns && (
          <button
            type="button"
            onClick={() => generateMockData(data.length > 0 ? data.length : 2000)}
            className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
            title="Regenerate mock data"
          >
            Regen mock
          </button>
        )}
        <Popover open={adaptiveOpen} onOpenChange={setAdaptiveOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              Adaptive Controls
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[260px]">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-semibold">Adaptive Controls</span>
              <button
                type="button"
                onClick={() => {
                  setAdaptiveDocked(false);
                  setAdaptiveOpen(false);
                }}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
                title="Detach"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
            </div>
            <AdaptiveControls />
          </PopoverContent>
        </Popover>
        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          className="rounded-full border p-2 text-muted-foreground hover:bg-muted"
          title="Open details"
        >
          <PanelRightOpen className="h-4 w-4" />
        </button>
      </div>

      {!adaptiveDocked && (
        <div
          ref={dragRef}
          onMouseDown={handleMouseDown}
          className="fixed z-30 w-[260px] rounded-md border bg-background/95 shadow-sm"
          style={{ left: position.x, top: position.y }}
        >
          <div className="flex items-center justify-between border-b px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <GripVertical className={`h-3.5 w-3.5 ${isDragging ? 'opacity-80' : 'opacity-50'}`} />
              <span>Adaptive Controls</span>
            </div>
            <button
              type="button"
              onClick={() => setAdaptiveDocked(true)}
              className="rounded p-1 text-muted-foreground hover:bg-muted"
              title="Dock"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="p-3">
            <AdaptiveControls />
          </div>
        </div>
      )}

      {!toolbarDocked && (
        <FloatingToolbar variant="floating" onDock={() => setToolbarDocked(true)} />
      )}
    </div>
  );
}
