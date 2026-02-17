"use client";

import { useEffect, useMemo, useRef } from 'react';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';

export interface DensityHeatStripProps {
  densityMap: Float32Array | null;
  width: number;
  height?: number;
  colorLow?: [number, number, number];
  colorHigh?: [number, number, number];
}

const DEFAULT_COLOR_LOW: [number, number, number] = [59, 130, 246];
const DEFAULT_COLOR_HIGH: [number, number, number] = [239, 68, 68];

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function DensityHeatStrip({
  densityMap,
  width,
  height = 12,
  colorLow = DEFAULT_COLOR_LOW,
  colorHigh = DEFAULT_COLOR_HIGH
}: DensityHeatStripProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const storeDensityMap = useAdaptiveStore((state) => state.densityMap);
  const activeDensityMap = densityMap ?? storeDensityMap;

  const logicalWidth = Math.max(1, Math.floor(width));
  const logicalHeight = Math.max(1, Math.floor(height));

  const densityRange = useMemo(() => {
    if (!activeDensityMap || activeDensityMap.length === 0) {
      return { min: 0, max: 1, range: 1 };
    }

    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < activeDensityMap.length; i += 1) {
      const value = activeDensityMap[i];
      if (!Number.isFinite(value)) continue;
      if (value < min) min = value;
      if (value > max) max = value;
    }

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return { min: 0, max: 1, range: 1 };
    }

    const range = max - min || 1;
    return { min, max, range };
  }, [activeDensityMap]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(logicalWidth * dpr));
    canvas.height = Math.max(1, Math.floor(logicalHeight * dpr));
    canvas.style.width = `${logicalWidth}px`;
    canvas.style.height = `${logicalHeight}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, logicalWidth, logicalHeight);

    if (!activeDensityMap || activeDensityMap.length === 0) {
      const [r, g, b] = colorLow;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.18)`;
      ctx.fillRect(0, Math.max(0, logicalHeight - 1), logicalWidth, 1);
      return;
    }

    const rowImage = ctx.createImageData(logicalWidth, 1);
    const pixels = rowImage.data;

    for (let x = 0; x < logicalWidth; x += 1) {
      const ratio = logicalWidth === 1 ? 0 : x / (logicalWidth - 1);
      const sourceIndex = Math.min(
        activeDensityMap.length - 1,
        Math.floor(ratio * (activeDensityMap.length - 1))
      );

      const rawValue = activeDensityMap[sourceIndex] ?? densityRange.min;
      const normalized = clamp01((rawValue - densityRange.min) / densityRange.range);

      const red = Math.round(colorLow[0] + normalized * (colorHigh[0] - colorLow[0]));
      const green = Math.round(colorLow[1] + normalized * (colorHigh[1] - colorLow[1]));
      const blue = Math.round(colorLow[2] + normalized * (colorHigh[2] - colorLow[2]));

      const offset = x * 4;
      pixels[offset] = red;
      pixels[offset + 1] = green;
      pixels[offset + 2] = blue;
      pixels[offset + 3] = normalized <= 0.001 ? 70 : 220;
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = logicalWidth;
    tempCanvas.height = 1;
    const tempContext = tempCanvas.getContext('2d');
    if (!tempContext) return;

    tempContext.putImageData(rowImage, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tempCanvas, 0, 0, logicalWidth, 1, 0, 0, logicalWidth, logicalHeight);
  }, [activeDensityMap, colorHigh, colorLow, densityRange.max, densityRange.min, densityRange.range, logicalHeight, logicalWidth]);

  return <canvas ref={canvasRef} className="block rounded-sm opacity-80" aria-label="Density heat strip" />;
}
