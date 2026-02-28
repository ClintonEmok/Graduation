"use client";

import { useMemo } from 'react';
import type { FilterContext } from '@/hooks/useContextExtractor';

export interface SmartProfile {
  id: string;
  name: string;
  description: string;
  crimeTypes: string[];
  intervals: Array<{
    startPercent: number;
    endPercent: number;
    strength: number;
  }>;
}

const VIOLENT_CRIME_TYPES = ['assault', 'robbery', 'homicide'] as const;

const SMART_PROFILES: Record<'burglary' | 'violent-crime' | 'all-crimes', SmartProfile> = {
  burglary: {
    id: 'burglary',
    name: 'Burglary Focus',
    description: 'Analyzed burglary patterns only',
    crimeTypes: ['Burglary'],
    intervals: [{ startPercent: 0, endPercent: 100, strength: 1 }],
  },
  'violent-crime': {
    id: 'violent-crime',
    name: 'Violent Crime',
    description: 'Analyzed violent crime patterns',
    crimeTypes: ['Assault', 'Robbery', 'Homicide'],
    intervals: [{ startPercent: 0, endPercent: 100, strength: 1.2 }],
  },
  'all-crimes': {
    id: 'all-crimes',
    name: 'All Crimes',
    description: 'Analyzed full selected dataset',
    crimeTypes: [],
    intervals: [{ startPercent: 0, endPercent: 100, strength: 1 }],
  },
};

function normalizeCrimeType(type: string): string {
  return type.trim().toLowerCase();
}

export function detectSmartProfile(context: FilterContext): SmartProfile | null {
  const normalizedCrimeTypes = context.crimeTypes.map(normalizeCrimeType).filter(Boolean);

  if (normalizedCrimeTypes.length === 0) {
    return SMART_PROFILES['all-crimes'];
  }

  if (normalizedCrimeTypes.length === 1 && normalizedCrimeTypes[0] === 'burglary') {
    return SMART_PROFILES.burglary;
  }

  const uniqueCrimeTypes = Array.from(new Set(normalizedCrimeTypes));
  const violentCount = uniqueCrimeTypes.filter((type) =>
    VIOLENT_CRIME_TYPES.includes(type as (typeof VIOLENT_CRIME_TYPES)[number])
  ).length;
  const hasOnlyViolentTypes = uniqueCrimeTypes.every((type) =>
    VIOLENT_CRIME_TYPES.includes(type as (typeof VIOLENT_CRIME_TYPES)[number])
  );

  if (hasOnlyViolentTypes && violentCount >= 2) {
    return SMART_PROFILES['violent-crime'];
  }

  return null;
}

export function useSmartProfiles(context: FilterContext): SmartProfile | null {
  return useMemo(() => detectSmartProfile(context), [context]);
}
