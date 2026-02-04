'use client';

import { useState } from 'react';
import { Filter, Home, Layers, Settings, Eye, EyeOff, GripVertical } from 'lucide-react';
import { FilterOverlay } from './FilterOverlay';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { useUIStore } from '@/store/ui';
import { useDraggable } from '@/hooks/useDraggable';
import { useURLFeatureFlags } from '@/hooks/useURLFeatureFlags';
import { URLConflictDialog } from '@/components/settings/URLConflictDialog';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function FloatingToolbar() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const showContext = useUIStore((state) => state.showContext);
  const toggleContext = useUIStore((state) => state.toggleContext);
  
  const { position, isDragging, dragRef, handleMouseDown } = useDraggable({
    storageKey: 'toolbar-position-v1',
    initialPosition: { x: window?.innerWidth ? window.innerWidth - 250 : 16, y: 16 },
  });

  const {
    showConflictDialog,
    urlFlags,
    confirmURLFlags,
    rejectURLFlags,
  } = useURLFeatureFlags();

  return (
    <TooltipProvider>
      <div
        ref={dragRef}
        onMouseDown={handleMouseDown}
        className={cn(
          'fixed z-20 flex items-center gap-4 rounded-full border border-border bg-background/90 px-6 py-3 shadow-md backdrop-blur transition-shadow hover:shadow-lg',
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        )}
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        {/* Drag handle indicator */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-grab active:cursor-grabbing p-1">
              <GripVertical className="h-5 w-5 text-muted-foreground/50" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Drag to move</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="rounded-full p-3 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Home"
            >
              <Home className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Reset View</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="rounded-full p-3 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Context Visibility"
              onClick={toggleContext}
            >
              {showContext ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{showContext ? 'Hide Context' : 'Show Context'}</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="rounded-full p-3 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Layers"
            >
              <Layers className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Layers</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="rounded-full p-3 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Settings"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Settings</p>
          </TooltipContent>
        </Tooltip>
        
        <div className="h-6 w-px bg-border mx-1" />
        
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="rounded-full p-3 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Filters"
              onClick={() => setIsFilterOpen((open) => !open)}
            >
              <Filter className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Filters</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <FilterOverlay isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} />
      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <URLConflictDialog
        isOpen={showConflictDialog}
        urlFlags={urlFlags}
        onConfirm={confirmURLFlags}
        onCancel={rejectURLFlags}
      />
    </TooltipProvider>
  );
}
