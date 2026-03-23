"use client";

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useSliceDomainStore } from '@/store/useSliceDomainStore';
import { useTimeslicingModeStore } from '@/store/useTimeslicingModeStore';

interface ManualTimesliceEditorProps {
  /** Timeline container element for calculating positions */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Domain start (normalized 0-100) */
  domainStart?: number;
  /** Domain end (normalized 0-100) */
  domainEnd?: number;
  className?: string;
}

interface DragState {
  isDragging: boolean;
  sliceId: string | null;
  handle: 'start' | 'end' | 'move' | null;
  startX: number;
  startValue: number;
}

export function ManualTimesliceEditor({
  containerRef,
  domainStart = 0,
  domainEnd = 100,
  className = '',
}: ManualTimesliceEditorProps) {
  const slices = useSliceDomainStore((state) => state.slices);
  const updateSlice = useSliceDomainStore((state) => state.updateSlice);
  const isCreating = useSliceDomainStore((state) => state.isCreating);
  const previewStart = useSliceDomainStore((state) => state.previewStart);
  const previewEnd = useSliceDomainStore((state) => state.previewEnd);
  const commitCreation = useSliceDomainStore((state) => state.commitCreation);
  const startCreation = useSliceDomainStore((state) => state.startCreation);
  const mode = useTimeslicingModeStore((state) => state.mode);

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    sliceId: null,
    handle: null,
    startX: 0,
    startValue: 0,
  });

  const xToNormalized = useCallback((clientX: number): number => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const ratio = x / rect.width;
    return domainStart + ratio * (domainEnd - domainStart);
  }, [containerRef, domainStart, domainEnd]);

  const normalizedToX = useCallback((normalized: number): number => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const ratio = (normalized - domainStart) / (domainEnd - domainStart);
    return ratio * rect.width;
  }, [containerRef, domainStart, domainEnd]);

  const handleMouseDown = useCallback((e: React.MouseEvent, sliceId: string, handle: 'start' | 'end' | 'move') => {
    e.preventDefault();
    e.stopPropagation();
    
    const slice = slices.find(s => s.id === sliceId);
    if (!slice || slice.isLocked) return;

    const value = handle === 'start' 
      ? slice.range?.[0] ?? slice.time
      : handle === 'end'
      ? slice.range?.[1] ?? slice.time
      : slice.range?.[0] ?? slice.time;

    setDragState({
      isDragging: true,
      sliceId,
      handle,
      startX: e.clientX,
      startValue: value,
    });
  }, [slices]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging || !dragState.sliceId) return;

    const deltaX = e.clientX - dragState.startX;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const deltaNormalized = (deltaX / rect.width) * (domainEnd - domainStart);
    const newValue = Math.max(domainStart, Math.min(domainEnd, dragState.startValue + deltaNormalized));

    const slice = slices.find(s => s.id === dragState.sliceId);
    if (!slice) return;

    if (dragState.handle === 'move' && slice.range) {
      const rangeSpan = slice.range[1] - slice.range[0];
      updateSlice(dragState.sliceId, {
        range: [newValue, newValue + rangeSpan],
      });
    } else if (dragState.handle === 'start') {
      const newRange: [number, number] = [newValue, slice.range?.[1] ?? slice.time];
      if (newRange[1] > newRange[0]) {
        updateSlice(dragState.sliceId, { range: newRange });
      }
    } else if (dragState.handle === 'end') {
      const newRange: [number, number] = [slice.range?.[0] ?? slice.time, newValue];
      if (newRange[1] > newRange[0]) {
        updateSlice(dragState.sliceId, { range: newRange });
      }
    }
  }, [dragState, containerRef, domainStart, domainEnd, slices, updateSlice]);

  const handleMouseUp = useCallback(() => {
    setDragState({
      isDragging: false,
      sliceId: null,
      handle: null,
      startX: 0,
      startValue: 0,
    });
  }, []);

  useEffect(() => {
    if (dragState.isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState.isDragging, handleMouseMove, handleMouseUp]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    // Start creation on double click
    if (mode === 'manual') {
      const normalized = xToNormalized(e.clientX);
      startCreation('click');
      // Position the creation at click point
      useSliceDomainStore.getState().updatePreview(normalized, normalized);
    }
  }, [mode, xToNormalized, startCreation]);

  const handleCommitCreation = useCallback(() => {
    commitCreation();
  }, [commitCreation]);

  if (mode !== 'manual') return null;

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      {/* Existing Slices as Draggable Handles */}
      {slices.map((slice) => {
        if (slice.type !== 'range' || !slice.range) return null;
        
        const [start, end] = slice.range;
        const left = normalizedToX(start);
        const width = normalizedToX(end) - left;

        return (
          <div
            key={slice.id}
            className="absolute top-0 h-full pointer-events-auto"
            style={{ left, width: Math.max(width, 4) }}
          >
            {/* Slice body */}
            <div
              className={`absolute inset-0 rounded transition-opacity ${
                slice.isLocked ? 'opacity-50' : 'cursor-move'
              }`}
              style={{ 
                backgroundColor: slice.color ? `${slice.color}40` : 'rgba(59, 130, 246, 0.2)',
                borderLeft: `2px solid ${slice.color || '#3b82f6'}`,
                borderRight: `2px solid ${slice.color || '#3b82f6'}`,
              }}
              onMouseDown={(e) => handleMouseDown(e, slice.id, 'move')}
            >
              {/* Start handle */}
              <div
                className="absolute left-0 top-0 h-full w-2 cursor-ew-resize hover:bg-primary/50 transition-colors"
                onMouseDown={(e) => handleMouseDown(e, slice.id, 'start')}
              />
              {/* End handle */}
              <div
                className="absolute right-0 top-0 h-full w-2 cursor-ew-resize hover:bg-primary/50 transition-colors"
                onMouseDown={(e) => handleMouseDown(e, slice.id, 'end')}
              />
            </div>
            
            {/* Slice label */}
            <div
              className="absolute top-1 left-1 right-1 text-[10px] text-white truncate pointer-events-none"
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
            >
              {slice.name}
            </div>
          </div>
        );
      })}

      {/* Creation Preview */}
      {isCreating && previewStart !== null && previewEnd !== null && (
        <div
          className="absolute top-0 h-full bg-primary/30 border border-primary border-dashed pointer-events-auto"
          style={{
            left: normalizedToX(previewStart),
            width: Math.abs(normalizedToX(previewEnd) - normalizedToX(previewStart)),
          }}
          onMouseUp={handleCommitCreation}
        >
          <div className="absolute top-1 left-1 text-[10px] text-primary">
            Release to create
          </div>
        </div>
      )}

      {/* Click to create overlay */}
      <div
        className="absolute inset-0 cursor-crosshair"
        onDoubleClick={handleDoubleClick}
      />
    </div>
  );
}