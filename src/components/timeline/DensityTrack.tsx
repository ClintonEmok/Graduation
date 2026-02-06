import React, { useRef, useEffect } from 'react';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';

interface DensityTrackProps {
  width: number;
  height: number;
}

export function DensityTrack({ width, height }: DensityTrackProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const densityMap = useAdaptiveStore((s) => s.densityMap);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    // For crispness on retina, we might want to scale, but this is a blur map anyway.
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, width, height);

    if (!densityMap || densityMap.length === 0) {
        // Draw nothing or placeholder
        return;
    }

    // Find min/max for normalization
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < densityMap.length; i++) {
        const v = densityMap[i];
        if (v < min) min = v;
        if (v > max) max = v;
    }
    const range = max - min || 1;

    // Create ImageData for 1 row of pixels matching width
    // We sample densityMap at each pixel x
    const imgData = ctx.createImageData(width, 1);
    const data = imgData.data;

    for (let x = 0; x < width; x++) {
        // Map x to densityMap index
        // densityMap covers 0-100% of time
        // width covers 0-100% of time (assuming track matches timeline width)
        const t = x / width;
        const idx = Math.min(Math.floor(t * (densityMap.length)), densityMap.length - 1);
        
        const val = densityMap[idx];
        const norm = (val - min) / range;
        
        // Color mapping:
        // Expanded (High Density) = Red
        // Compressed (Low Density) = Blue
        // norm 0 (low) -> Blue
        // norm 1 (high) -> Red
        
        // Simple interpolation
        const r = Math.floor(norm * 255);
        const b = Math.floor((1 - norm) * 255);
        
        const offset = x * 4;
        data[offset] = r;     // R
        data[offset + 1] = 0; // G
        data[offset + 2] = b; // B
        data[offset + 3] = 255; // Alpha
    }

    // Draw row to temp canvas then stretch
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = 1;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
        tempCtx.putImageData(imgData, 0, 0);
        
        // Draw stretched
        ctx.imageSmoothingEnabled = false; // Sharp pixels horizontally (we match width), vertical stretch
        ctx.drawImage(tempCanvas, 0, 0, width, 1, 0, 0, width, height);
    }
    
  }, [width, height, densityMap]);

  return (
    <canvas 
        ref={canvasRef} 
        style={{ width, height, display: 'block' }}
        className="rounded-t-sm opacity-80"
    />
  );
}
