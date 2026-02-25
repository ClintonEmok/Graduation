"use client";

import React from 'react';

interface ConfidenceBadgeProps {
  confidence: number; // 0-100
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  // Clamp confidence to 0-100 range
  const clampedConfidence = Math.max(0, Math.min(100, confidence));
  
  return (
    <span className="text-sm">
      <span className="font-medium">{clampedConfidence}%</span>
      <span className="text-muted-foreground ml-1">confidence</span>
    </span>
  );
}
