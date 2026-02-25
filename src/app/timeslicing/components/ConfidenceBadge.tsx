"use client";

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfidenceBadgeProps {
  confidence: number; // 0-100
}

const LOW_CONFIDENCE_THRESHOLD = 50;

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  // Clamp confidence to 0-100 range
  const clampedConfidence = Math.max(0, Math.min(100, confidence));
  const isLowConfidence = clampedConfidence < LOW_CONFIDENCE_THRESHOLD;
  
  return (
    <span className={`text-sm inline-flex items-center gap-1 ${isLowConfidence ? 'text-amber-400' : 'text-slate-300'}`}>
      {isLowConfidence && <AlertTriangle className="size-3" />}
      <span className="font-medium">{clampedConfidence}%</span>
      <span className="text-muted-foreground ml-1">confidence</span>
      {isLowConfidence && (
        <span className="text-amber-500/70 text-xs ml-1">(low)</span>
      )}
    </span>
  );
}
