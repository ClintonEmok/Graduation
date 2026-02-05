'use client';

import { useSliceStore } from '@/store/useSliceStore';
import { useCoordinationStore } from '@/store/useCoordinationStore';
import { SliceStats } from './SliceStats';
import { PointInspector } from './PointInspector';
import { X } from 'lucide-react';

export function ContextualSlicePanel() {
  const { activeSliceId, setActiveSlice } = useSliceStore();
  const { selectedIndex, clearSelection } = useCoordinationStore();

  const isOpen = activeSliceId !== null || selectedIndex !== null;

  if (!isOpen) return null;

  const handleClose = () => {
    setActiveSlice(null);
    clearSelection();
  };

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-background border-l shadow-xl z-50 overflow-y-auto transition-transform duration-300 ease-in-out transform translate-x-0">
      <div className="flex items-center justify-between p-4 border-b bg-muted/20">
        <h2 className="font-semibold text-lg">
          {activeSliceId ? 'Slice Analysis' : 'Point Details'}
        </h2>
        <button 
          onClick={handleClose}
          className="p-2 hover:bg-muted rounded-full transition-colors"
          title="Close Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {selectedIndex !== null && (
        <PointInspector pointId={String(selectedIndex)} />
      )}

      {activeSliceId && <SliceStats sliceId={activeSliceId} />}
    </div>
  );
}
