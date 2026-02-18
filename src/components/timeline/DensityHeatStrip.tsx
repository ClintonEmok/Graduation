"use client";

import { useEffect, useMemo, useRef } from 'react';
import { useAdaptiveStore } from '@/store/useAdaptiveStore';

export type DensityDomain = [number, number];

export interface DensityHeatStripProps {
  densityMap: Float32Array | null;
  width: number;
  height?: number;
  isLoading?: boolean;
  colorLow?: [number, number, number];
  colorHigh?: [number, number, number];
  densityDomain?: DensityDomain;
  legendLabels?: { low: string; high: string };
  showLegend?: boolean;
}

const DEFAULT_COLOR_LOW: [number, number, number] = [59, 130, 246];
const DEFAULT_COLOR_HIGH: [number, number, number] = [239, 68, 68];
export const DEFAULT_DENSITY_DOMAIN: DensityDomain = [0, 1];
export const DEFAULT_DENSITY_LEGEND = { low: 'Low density', high: 'High density' } as const;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function DensityHeatStrip({
  densityMap,
  width,
  height = 12,
  isLoading = false,
  colorLow = DEFAULT_COLOR_LOW,
  colorHigh = DEFAULT_COLOR_HIGH,
  densityDomain,
  legendLabels = DEFAULT_DENSITY_LEGEND,
  showLegend = false
}: DensityHeatStripProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const storeDensityMap = useAdaptiveStore((state) => state.densityMap);
  const activeDensityMap = densityMap ?? storeDensityMap;

  const logicalWidth = Math.max(1, Math.floor(width));
  const logicalHeight = Math.max(1, Math.floor(height));

  const resolvedDomain = useMemo<DensityDomain>(() => {
    if (!densityDomain) return DEFAULT_DENSITY_DOMAIN;
    const [rawMin, rawMax] = densityDomain;
    if (!Number.isFinite(rawMin) || !Number.isFinite(rawMax)) return DEFAULT_DENSITY_DOMAIN;
    if (rawMin === rawMax) return DEFAULT_DENSITY_DOMAIN;
    return rawMin < rawMax ? [rawMin, rawMax] : [rawMax, rawMin];
  }, [densityDomain]);

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

      const rawValue = activeDensityMap[sourceIndex] ?? resolvedDomain[0];
      const range = resolvedDomain[1] - resolvedDomain[0] || 1;
      const normalized = clamp01((rawValue - resolvedDomain[0]) / range);

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
  }, [activeDensityMap, colorHigh, colorLow, logicalHeight, logicalWidth, resolvedDomain]);

  return (
    <div className="flex items-center gap-3">
      <canvas
        ref={canvasRef}
        className={`block rounded-sm transition-opacity duration-200 ${isLoading ? 'opacity-55' : 'opacity-80'}`}
        aria-label="Density heat strip"
        aria-busy={isLoading}
      />
      {showLegend && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{legendLabels.low}</span>
          <span aria-hidden="true">→</span>
          <span>{legendLabels.high}</span>
        </div>
      )}
    </div>
  );
}
