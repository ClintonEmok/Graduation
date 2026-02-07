'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface Position {
  x: number;
  y: number;
}

interface UseDraggableOptions {
  storageKey?: string;
  initialPosition?: Position;
}

export function useDraggable(options: UseDraggableOptions = {}) {
  const { storageKey, initialPosition = { x: 16, y: 16 } } = options;
  
  const [position, setPosition] = useState<Position>(() => {
    if (typeof window === 'undefined') return initialPosition;
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // Invalid JSON, use default
        }
      }
    }
    return initialPosition;
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;
    // Only start drag if clicking the drag handle (not buttons)
    if ((e.target as HTMLElement).closest('button')) return;
    
    e.preventDefault();
    const rect = dragRef.current.getBoundingClientRect();
    offsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - offsetRef.current.x;
      const newY = e.clientY - offsetRef.current.y;
      
      // Clamp to viewport bounds
      const maxX = window.innerWidth - (dragRef.current?.offsetWidth ?? 100);
      const maxY = window.innerHeight - (dragRef.current?.offsetHeight ?? 50);
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Persist position on change (debounced via effect cleanup)
  useEffect(() => {
    if (!storageKey || isDragging) return;
    localStorage.setItem(storageKey, JSON.stringify(position));
  }, [position, storageKey, isDragging]);

  return {
    position,
    setPosition,
    isDragging,
    dragRef,
    handleMouseDown,
  };
}
