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
    <>
      <div
        ref={dragRef}
        onMouseDown={handleMouseDown}
        className={cn(
          'fixed z-20 flex items-center gap-2 rounded-full border border-border bg-background/90 px-3 py-2 shadow-sm backdrop-blur',
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        )}
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        {/* Drag handle indicator */}
        <GripVertical className="h-4 w-4 text-muted-foreground/50" />
        
        <button
          type="button"
          className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Home"
        >
          <Home className="h-4 w-4" />
        </button>
        
        <button
          type="button"
          className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Context Visibility"
          onClick={toggleContext}
          title={showContext ? 'Hide Context' : 'Show Context'}
        >
          {showContext ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
        
        <button
          type="button"
          className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Layers"
        >
          <Layers className="h-4 w-4" />
        </button>
        
        <button
          type="button"
          className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Settings"
          onClick={() => setIsSettingsOpen(true)}
        >
          <Settings className="h-4 w-4" />
        </button>
        
        <div className="h-5 w-px bg-border" />
        
        <button
          type="button"
          className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Filters"
          onClick={() => setIsFilterOpen((open) => !open)}
        >
          <Filter className="h-4 w-4" />
        </button>
      </div>

      <FilterOverlay isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} />
      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <URLConflictDialog
        isOpen={showConflictDialog}
        urlFlags={urlFlags}
        onConfirm={confirmURLFlags}
        onCancel={rejectURLFlags}
      />
    </>
  );
}
