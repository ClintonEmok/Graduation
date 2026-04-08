# Phase 38: Context-Aware Timeslicing Based on Crime Type - Research

**Researched:** 2026-02-28
**Domain:** Context extraction, smart profile detection, custom profile persistence, timeslicing analysis modes
**Confidence:** HIGH

## Summary

Phase 38 adds context-aware timeslicing that analyzes the user's current filter context (crime types, time ranges, parameters) to produce relevant warp profiles and interval boundaries. This phase builds directly on the existing Phase 35-37 infrastructure.

**Key findings:**
- Filter state already exists in `useFilterStore` (numeric IDs) and `useViewportStore` (string names + dates)
- Context extraction is straightforward: combine crime types, districts, and time range from both stores
- "Analyze visible" vs "analyze all" mode requires passing different date ranges to the algorithm
- Smart profiles can use pattern matching against predefined common filter combinations
- Custom profile storage follows the existing preset storage pattern in useSuggestionStore
- Debouncing on filter changes already exists (500ms in useSuggestionGenerator)

**Primary recommendation:** Build context extraction hook that combines filter state, add mode toggle for visible/all, implement profile detection using pattern matching, extend suggestion store for context metadata persistence.

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Context includes:** all user-selected filters (crime type, categories) + all user-selected parameters
- **Time range mode:** both "analyze visible" (current viewport) AND "analyze all" (entire dataset)
- **Spatial context:** NOT in scope — deferred to v2.0
- **Auto-regenerate:** Yes — when filters change, suggestions auto-regenerate (debounced)
- **Manual trigger:** Yes — "Analyze Context" button for immediate results
- **Both:** auto debounced + manual button available
- **Smart profiles:** Yes — system auto-detects common filter combinations
- **Custom profiles:** Yes — user can save current filter combination as named profile
- **Persist context metadata on accept:** YES — store which context was used

### Claude's Discretion
- Number of smart profile suggestions (system determines optimal)
- Exact context badge design and placement
- Visual styling differences between context-aware and regular suggestions
- History item presentation details

### Deferred Ideas (OUT OF SCOPE)
- Spatial context (map viewport bounds) — Phase 40+ or v2.0

</user_constraints>

---

## Standard Stack

The standard approach uses existing libraries and patterns already in the codebase:

### Core Technologies
| Pattern | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zustand | ^5.0.0 | State management | Already used for stores |
| LocalStorage | Native | Profile persistence | Already used for presets |
| React hooks | 18.x | Composition | Already in use |

### Supporting Patterns
| Pattern | Purpose | When to Use |
|---------|---------|-------------|
| Debounce 500ms | Filter change debouncing | Already implemented in useSuggestionGenerator |
| Custom events | Accept workflow | Already used for time scale/boundary accept |
| Fine-grained selectors | Viewport store | Already implemented to prevent re-renders |

### Existing Stores to Leverage
| Store | What's Available |
|-------|-----------------|
| `useFilterStore` | selectedTypes (number[]), selectedDistricts (number[]), selectedTimeRange, presets |
| `useViewportStore` | crimeFilters (crimeTypes, districts), startDate, endDate, zoom |
| `useSuggestionStore` | suggestions, acceptedHistory, generation params, presets pattern |

**Installation:**
```bash
# No new packages needed - all patterns already in codebase
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── hooks/
│   ├── useContextExtractor.ts      # NEW: Extract current filter context
│   ├── useContextAwareGenerator.ts  # NEW: Context-aware suggestion generation
│   └── useSmartProfiles.ts         # NEW: Smart profile detection
├── store/
│   └── useContextProfileStore.ts   # NEW: Context profiles (smart + custom)
├── components/
│   └── SuggestionPanel/
│       ├── ContextBadge.tsx        # NEW: Badge showing context
│       ├── ContextSelector.tsx     # NEW: Mode toggle (visible/all)
│       └── ProfileManager.tsx      # NEW: Save/load custom profiles
```

### Pattern 1: Context Extraction Hook

**What:** Extracts current filter state as a serializable context object

**When to use:** When generating context-aware suggestions or displaying context badges

**Example:**
```typescript
// src/hooks/useContextExtractor.ts
import { useFilterStore } from '@/store/useFilterStore';
import { useViewportStore, useCrimeFilters, useViewportStart, useViewportEnd } from '@/lib/stores/viewportStore';

export interface FilterContext {
  crimeTypes: string[];
  districts: string[];
  timeRange: { start: number; end: number };
  isFullDataset: boolean;
}

export function useContextExtractor() {
  const viewportFilters = useCrimeFilters();
  const startDate = useViewportStart();
  const endDate = useViewportEnd();
  const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);
  const selectedTypes = useFilterStore((state) => state.selectedTypes);
  const selectedDistricts = useFilterStore((state) => state.selectedDistricts);

  const getCurrentContext = (mode: 'visible' | 'all' = 'visible'): FilterContext => {
    const timeRange = mode === 'visible' 
      ? { start: startDate, end: endDate }
      : selectedTimeRange || { start: startDate, end: endDate };

    return {
      crimeTypes: viewportFilters.crimeTypes,
      districts: viewportFilters.districts,
      timeRange,
      isFullDataset: mode === 'all',
    };
  };

  const getContextSignature = (context: FilterContext): string => {
    return [
      context.crimeTypes.sort().join(','),
      context.districts.sort().join(','),
      context.timeRange.start,
      context.timeRange.end,
      context.isFullDataset,
    ].join('|');
  };

  return { getCurrentContext, getContextSignature };
}
```

### Pattern 2: Smart Profile Detection

**What:** Automatically detects common filter combinations and suggests relevant profiles

**When to use:** When showing context-aware suggestions

**Example:**
```typescript
// src/hooks/useSmartProfiles.ts
import { useMemo } from 'react';
import type { FilterContext } from './useContextExtractor';

// Predefined smart profiles for common crime analysis scenarios
export interface SmartProfile {
  id: string;
  name: string;
  description: string;
  crimeTypes: string[];
  intervals: { startPercent: number; endPercent: number; strength: number }[];
}

const SMART_PROFILES: SmartProfile[] = [
  {
    id: 'burglary',
    name: 'Burglary Focus',
    description: 'Analyzed burglary patterns only',
    crimeTypes: ['Burglary'],
    intervals: [{ startPercent: 0, endPercent: 100, strength: 1.0 }],
  },
  {
    id: 'violent-crime',
    name: 'Violent Crime',
    description: 'Analyzed violent crime patterns',
    crimeTypes: ['Assault', 'Robbery', 'Homicide'],
    intervals: [{ startPercent: 0, endPercent: 100, strength: 1.2 }],
  },
  {
    id: 'all-crimes',
    name: 'All Crimes',
    description: 'Full dataset analysis',
    crimeTypes: [],
    intervals: [{ startPercent: 0, endPercent: 100, strength: 1.0 }],
  },
];

export function useSmartProfiles(context: FilterContext): SmartProfile | null {
  return useMemo(() => {
    const { crimeTypes } = context;
    
    // Match against smart profiles
    if (crimeTypes.length === 0) {
      return SMART_PROFILES.find(p => p.id === 'all-crimes') || null;
    }
    
    const sortedTypes = [...crimeTypes].sort().join(',');
    
    if (sortedTypes.includes('Burglary') && crimeTypes.length === 1) {
      return SMART_PROFILES.find(p => p.id === 'burglary') || null;
    }
    
    const violentTypes = ['Assault', 'Robbery', 'Homicide'];
    const hasViolent = violentTypes.some(v => crimeTypes.includes(v));
    const onlyViolent = crimeTypes.every(v => violentTypes.includes(v));
    
    if (hasViolent && onlyViolent && crimeTypes.length >= 2) {
      return SMART_PROFILES.find(p => p.id === 'violent-crime') || null;
    }
    
    return null;
  }, [context]);
}
```

### Pattern 3: Context Profile Store

**What:** Zustand store for managing both smart profiles (auto-detected) and custom profiles (user-saved)

**When to use:** Persisting user-created context profiles

**Example:**
```typescript
// src/store/useContextProfileStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FilterContext } from '@/hooks/useContextExtractor';

export interface ContextProfile {
  id: string;
  name: string;
  context: FilterContext;
  createdAt: number;
  isSmart: boolean;
}

interface ContextProfileStore {
  smartProfiles: ContextProfile[];
  customProfiles: ContextProfile[];
  activeProfileId: string | null;
  
  addCustomProfile: (name: string, context: FilterContext) => void;
  deleteProfile: (id: string) => void;
  setActiveProfile: (id: string | null) => void;
  getActiveProfile: () => ContextProfile | null;
}

const PROFILE_STORAGE_KEY = 'timeslicing-context-profiles-v1';

export const useContextProfileStore = create<ContextProfileStore>()(
  persist(
    (set, get) => ({
      smartProfiles: [], // Populated dynamically based on context
      customProfiles: [],
      activeProfileId: null,

      addCustomProfile: (name, context) => {
        const profile: ContextProfile = {
          id: crypto.randomUUID(),
          name,
          context,
          createdAt: Date.now(),
          isSmart: false,
        };
        set((state) => ({
          customProfiles: [...state.customProfiles, profile],
          activeProfileId: profile.id,
        }));
      },

      deleteProfile: (id) => {
        set((state) => ({
          customProfiles: state.customProfiles.filter(p => p.id !== id),
          activeProfileId: state.activeProfileId === id ? null : state.activeProfileId,
        }));
      },

      setActiveProfile: (id) => set({ activeProfileId: id }),

      getActiveProfile: () => {
        const state = get();
        const allProfiles = [...state.smartProfiles, ...state.customProfiles];
        return allProfiles.find(p => p.id === state.activeProfileId) || null;
      },
    }),
    {
      name: PROFILE_STORAGE_KEY,
      partialize: (state) => ({ 
        customProfiles: state.customProfiles,
        activeProfileId: state.activeProfileId,
      }),
    }
  )
);
```

---

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Profile persistence | Custom localStorage handling | Zustand persist middleware | Already handles serialization, hydration, and versioning |
| Debouncing | Custom debounce hook | Existing useDebounce in useSuggestionGenerator | Already working at 500ms |
| Filter state access | Duplicate filter logic | Use existing fine-grained selectors | Prevents unnecessary re-renders |
| Context serialization | Custom JSON handling | Existing pattern from useFilterStore | Already handles edge cases |

**Key insight:** The codebase already has robust patterns for state management, persistence, and filter handling. Phase 38 should extend these patterns rather than create new ones.

---

## Common Pitfalls

### Pitfall 1: Mismatched Crime Type Representations

**What goes wrong:** Crime types exist as both string[] (viewportStore) and number[] (useFilterStore), causing mismatches when comparing contexts.

**Why it happens:** Two stores store the same data in different formats for different purposes (UI display vs GPU filtering).

**How to avoid:** Always use string[] from viewportStore for context signature generation. Store both representations in FilterContext if needed.

**Warning signs:** Smart profile detection fails to match despite correct filters, context signatures don't match on re-apply.

### Pitfall 2: Mode Confusion - Visible vs All

**What goes wrong:** User expects "analyze all" to analyze full dataset but it only analyzes current selectedTimeRange.

**Why it happens:** "All" mode uses selectedTimeRange from filterStore, not the absolute full dataset bounds.

**How to avoid:** Clearly label "All" as "Analyzed Range" or provide explicit "Full Dataset" option with absolute date bounds (2001-01-01 to 2026-12-31).

**Warning signs:** User confusion about what's being analyzed, unexpected suggestion results.

### Pitfall 3: Profile Naming Conflicts

**What goes wrong:** User creates custom profile with same name as existing profile.

**Why it happens:** No validation for duplicate names on save.

**How to avoid:** Check for existing names before saving, append number suffix or prompt for rename.

**Warning signs:** Multiple profiles with identical names in list.

### Pitfall 4: Auto-Regenerate Feedback Loop

**What goes wrong:** Suggestions regenerate continuously if filter changes trigger during generation.

**Why it happens:** No guard to prevent re-trigger while generation is in progress.

**How to avoid:** Track `isGenerating` state and skip debounced triggers during active generation.

---

## Code Examples

### Context-Aware Suggestion Generation with Mode

```typescript
// Extending useSuggestionGenerator for context-aware mode
import { useContextExtractor, type FilterContext } from './useContextExtractor';
import { useSmartProfiles } from './useSmartProfiles';

interface ContextAwareParams extends GenerationParams {
  contextMode: 'visible' | 'all';
}

export function useContextAwareGenerator() {
  const { getCurrentContext, getContextSignature } = useContextExtractor();
  const [params, setParams] = useState<ContextAwareParams | null>(null);
  
  // Get smart profile based on current context
  const currentContext = getCurrentContext(params?.contextMode || 'visible');
  const smartProfile = useSmartProfiles(currentContext);
  
  const trigger = useCallback((newParams: ContextAwareParams) => {
    const context = getCurrentContext(newParams.contextMode);
    const signature = getContextSignature(context);
    
    // Include context in generation params
    setParams({ ...newParams, context });
    
    // Trigger generation with context-aware algorithms
    generateSuggestions({ ...newParams, context });
  }, [getCurrentContext, getContextSignature, generateSuggestions]);
  
  return { 
    trigger, 
    currentContext, 
    smartProfile,
    contextSignature: getContextSignature(currentContext),
  };
}
```

### Context Badge Component

```typescript
// src/app/timeslicing/components/ContextBadge.tsx
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Lightbulb } from 'lucide-react';

interface ContextBadgeProps {
  crimeTypes: string[];
  isFullDataset: boolean;
  smartProfileName?: string;
}

export function ContextBadge({ 
  crimeTypes, 
  isFullDataset,
  smartProfileName 
}: ContextBadgeProps) {
  if (smartProfileName) {
    return (
      <Badge variant="outline" className="bg-amber-900/30 text-amber-300 border-amber-700">
        <Lightbulb className="mr-1 h-3 w-3" />
        {smartProfileName}
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="bg-slate-700 text-slate-300">
      {crimeTypes.length > 0 ? crimeTypes.join(', ') : 'All crimes'}
      {isFullDataset && ' (full range)'}
    </Badge>
  );
}
```

### History with Context Metadata

```typescript
// Extended HistoryEntry interface for context
export interface HistoryEntry {
  id: string;
  suggestion: Suggestion;
  acceptedAt: number;
  contextMetadata?: {
    crimeTypes: string[];
    timeRange: { start: number; end: number };
    isFullDataset: boolean;
    profileName?: string;
  };
}

// When accepting, persist context
acceptSuggestion: (id) => set((state) => {
  const context = getCurrentContext(currentMode); // Get current context
  return {
    // ... existing logic
    acceptedHistory: [{
      id: crypto.randomUUID(),
      suggestion,
      acceptedAt: Date.now(),
      contextMetadata: {
        crimeTypes: context.crimeTypes,
        timeRange: context.timeRange,
        isFullDataset: context.isFullDataset,
      }
    }, ...state.acceptedHistory].slice(0, 50),
  };
}),
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual suggestion generation only | Context-aware auto-generation | Phase 38 | System analyzes user context automatically |
| Single analysis mode | Dual mode (visible/all) | Phase 38 | User can analyze viewport or full dataset |
| No context tracking | Context metadata on accepted suggestions | Phase 38 | History shows what context generated each suggestion |
| No profiles | Smart + custom profiles | Phase 38 | Quick access to common configurations |

**What's new in Phase 38:**
- Context extraction from filter state
- Mode toggle for visible vs all data
- Smart profile auto-detection
- Custom profile creation and persistence
- Context metadata on history items

**Deprecated/outdated:**
- None - Phase 38 adds new capabilities without replacing existing functionality

---

## Open Questions

1. **Smart Profile Threshold**
   - What we know: Common patterns like "burglary only" and "violent crimes" are identified
   - What's unclear: How many crime types should trigger "mixed" vs "all crimes" profile
   - Recommendation: Use threshold of 3+ distinct crime types as "mixed", fewer shows specific focus

2. **Context Debounce Duration**
   - What we know: 500ms is used for filter changes currently
   - What's unclear: Should context-aware generation use longer debounce (e.g., 1000ms) to avoid excessive regeneration
   - Recommendation: Use 750ms for context generation - balance between responsiveness and performance

3. **Full Dataset Bounds**
   - What we know: Dataset range is 2001-01-01 to ~2026-01-01
   - What's unclear: Should "analyze all" use hardcoded bounds or query the dataset for actual min/max dates?
   - Recommendation: Use hardcoded bounds (978307200 to 1767225600) for simplicity; can make dynamic later if needed

---

## Sources

### Primary (HIGH confidence)
- Existing codebase: useFilterStore.ts - filter state management patterns
- Existing codebase: useViewportStore.ts - fine-grained selector patterns
- Existing codebase: useSuggestionStore.ts - preset/profile persistence pattern
- Existing codebase: useSuggestionGenerator.ts - debouncing and generation patterns

### Secondary (MEDIUM confidence)
- Zustand documentation for state management patterns
- Context7: Zustand middleware (persist) for storage patterns

### Tertiary (LOW confidence)
- WebSearch: "react context-aware filtering patterns" - general patterns only

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Uses only existing patterns already in codebase
- Architecture: HIGH - Follows established patterns from phases 35-37
- Pitfalls: HIGH - Based on actual code analysis of type mismatches and existing issues
- Code examples: HIGH - Derived from existing code structure

**Research date:** 2026-02-28
**Valid until:** 30 days (stable patterns, no fast-moving tech)
