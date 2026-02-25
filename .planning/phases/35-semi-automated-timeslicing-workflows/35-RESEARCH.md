# Phase 35: Semi-Automated Timeslicing - Research

**Researched:** 2026-02-25
**Domain:** React UI workflow patterns, suggestion/review systems, confidence visualization
**Confidence:** HIGH

## Summary

Phase 35 focuses on establishing the UI workflow for semi-automated timeslicing - the "review and confirm" pattern where the system proposes warp profiles and interval boundaries, and the user can Accept/Modify/Reject these suggestions.

**Key findings:**
- The codebase already has all necessary UI infrastructure (Zustand, shadcn/ui, Sheet component)
- Side panel is the correct pattern per CONTEXT.md - use existing `fixed right-0` panel style from `ContextualSlicePanel.tsx`
- Confidence display should be numerical percentage (e.g., "87% confidence") - no color coding
- Need new Zustand store for suggestion state management
- Route should be dedicated (new route, not `/timeline-test`)

**Primary recommendation:** Create new route `/timeslicing` with dedicated suggestion panel using Zustand store for state management. Leverage existing panel pattern from ContextualSlicePanel and extend with Accept/Modify/Reject button groups.

## Standard Stack

The established libraries and patterns for this phase:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zustand | 5.0.10 | Suggestion state management | Already used throughout codebase, minimal boilerplate |
| @radix-ui/react-dialog | 1.1.15 | Modal overlays if needed | shadcn/ui foundation |
| lucide-react | 0.563.0 | Icons for actions | Already in use |
| sonner | 2.0.7 | Toast notifications | Already configured in layout.tsx |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-tabs | 1.1.13 | Organizing suggestion types | If multiple suggestion categories |
| @radix-ui/react-scroll-area | 1.2.10 | Scrollable suggestion lists | For long suggestion lists |
| tailwindcss | 4 | Styling | Already configured |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New Zustand store | Extend useCoordinationStore | Keeping suggestion state separate is cleaner for phase lifecycle |

### Recommended Project Structure
```
src/
## Architecture Patterns

├── app/
│   └── timeslicing/           # New dedicated route
│       ├── page.tsx           # Main page
│       └── components/        # Route-specific components
│           ├── SuggestionPanel.tsx
│           ├── SuggestionCard.tsx
│           ├── ConfidenceBadge.tsx
│           └── ActionButtons.tsx
├── store/
│   └── useSuggestionStore.ts  # New Zustand store for suggestions
└── hooks/
    └── useSuggestionTrigger.ts # Trigger mechanism hook
```

### Pattern 1: Suggestion Panel (Side Panel)
**What:** Fixed right-side panel displaying list of suggestions with details
**When to use:** Always - this is the core UI pattern per CONTEXT.md
**Example:**
```typescript
// Based on ContextualSlicePanel.tsx pattern
<div className="fixed right-0 top-0 h-full w-80 bg-background border-l shadow-xl z-50">
  <div className="flex items-center justify-between p-4 border-b">
    <h2 className="font-semibold">Suggestions</h2>
    <button onClick={onClose}><X className="w-4 h-4" /></button>
  </div>
  <div className="overflow-y-auto">
    {suggestions.map(s => <SuggestionCard suggestion={s} />)}
  </div>
</div>
```

### Pattern 2: Confidence Display (Numerical)
**What:** Show confidence as percentage with clear labeling
**When to use:** Every suggestion card
**Example:**
```typescript
// Per CONTEXT.md: "87% confidence" - numerical only, no color coding
<div className="flex items-center gap-2 text-sm">
  <span className="font-medium">87%</span>
  <span className="text-muted-foreground">confidence</span>
</div>
```

### Pattern 3: Accept/Modify/Reject Actions
**What:** Three-button group for user decisions
**When to use:** Each suggestion card
**Example:**
```typescript
// Button hierarchy: Accept (primary), Modify (secondary), Reject (ghost/danger)
<div className="flex gap-2">
  <Button variant="default" onClick={() => accept(suggestion.id)}>
    Accept
  </Button>
  <Button variant="secondary" onClick={() => modify(suggestion.id)}>
    Modify
  </Button>
  <Button variant="ghost" onClick={() => reject(suggestion.id)}>
    Reject
  </Button>
</div>
```

### Pattern 4: Suggestion State Management
**What:** Zustand store for managing suggestion lifecycle
**When to use:** Always - central state for suggestions
**Example:**
```typescript
interface SuggestionState {
  suggestions: Suggestion[];
  activeSuggestionId: string | null;
  isPanelOpen: boolean;
  addSuggestion: (suggestion: Suggestion) => void;
  acceptSuggestion: (id: string) => void;
  rejectSuggestion: (id: string) => void;
  modifySuggestion: (id: string, updates: Partial<Suggestion>) => void;
  setPanelOpen: (open: boolean) => void;
}

export const useSuggestionStore = create<SuggestionState>((set) => ({
  suggestions: [],
  activeSuggestionId: null,
  isPanelOpen: false,
  // ... implementations
}));
```

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Side panel positioning | Custom CSS positioning | ContextualSlicePanel.tsx fixed panel | Already tested, accessible, has animations |
| Toast notifications | Custom toast component | Sonner (already in layout) | Already configured, accessible, dismissible |
| Button styling | Custom button styles | @/components/ui/button | Consistent with codebase, accessible |
| Scrollable areas | Custom overflow: auto | @radix-ui/react-scroll-area | Better cross-browser, accessible |

**Key insight:** The codebase has a mature UI component library (shadcn/ui pattern). Always check `src/components/ui/` before building custom components.

## Common Pitfalls

### Pitfall 1: Mixing Suggestion State with Slice State
**What goes wrong:** Adding suggestion acceptance directly mutates slice stores
**Why it happens:** Wanting to simplify by reusing existing store actions
**How to avoid:** Keep suggestion state in separate store, only sync to slice stores on explicit accept action
**Warning signs:** Suggestion actions directly call `useSliceStore.updateSlice()` - should go through suggestion store first

### Pitfall 2: Panel Blocking Timeline Interaction
**What goes wrong:** Fixed panel prevents clicking on timeline underneath
**Why it happens:** Missing `pointer-events` consideration or overlay behavior
**How to avoid:** Panel is side-by-side with timeline (not overlay), OR uses Sheet component with proper backdrop
**Warning signs:** Timeline click events not firing when panel is open

### Pitfall 3: Confidence Score Without Context
**What goes wrong:** Showing percentage without explaining what it means
**Why it happens:** Treating confidence as a simple number
**How to avoid:** Add brief context: "Based on X data points" or "Peak detection confidence"
**Warning signs:** Users asking "what does 87% mean?"

### Pitfall 4: Not Handling Empty Suggestion State
**What goes wrong:** Panel shows nothing when no suggestions exist
**Why it happens:** No empty state UI
**How to avoid:** Add helpful empty state with "Generate Suggestions" button or explanation
**Warning signs:** Users unsure how to get suggestions

## Code Examples

### Suggestion Store (useSuggestionStore.ts)
```typescript
// Source: Based on useCoordinationStore.ts and useWarpSliceStore.ts patterns
import { create } from 'zustand';

export interface Suggestion {
  id: string;
  type: 'warp-profile' | 'interval-boundary';
  confidence: number; // 0-100
  data: WarpProfileData | IntervalBoundaryData;
  createdAt: number;
  status: 'pending' | 'accepted' | 'rejected' | 'modified';
}

interface SuggestionStore {
  suggestions: Suggestion[];
  isPanelOpen: boolean;
  activeSuggestionId: string | null;
  
  // Actions
  addSuggestion: (suggestion: Omit<Suggestion, 'id' | 'createdAt' | 'status'>) => void;
  acceptSuggestion: (id: string) => void;
  rejectSuggestion: (id: string) => void;
  modifySuggestion: (id: string, updates: Partial<Suggestion['data']>) => void;
  setPanelOpen: (open: boolean) => void;
  setActiveSuggestion: (id: string | null) => void;
  clearSuggestions: () => void;
}

export const useSuggestionStore = create<SuggestionStore>((set) => ({
  suggestions: [],
  isPanelOpen: false,
  activeSuggestionId: null,

  addSuggestion: (suggestion) => set((state) => ({
    suggestions: [...state.suggestions, {
      ...suggestion,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      status: 'pending'
    }],
    isPanelOpen: true
  })),

  acceptSuggestion: (id) => set((state) => ({
    suggestions: state.suggestions.map(s => 
      s.id === id ? { ...s, status: 'accepted' } : s
    )
  })),

  rejectSuggestion: (id) => set((state) => ({
    suggestions: state.suggestions.map(s => 
      s.id === id ? { ...s, status: 'rejected' } : s
    )
  })),

  modifySuggestion: (id, updates) => set((state) => ({
    suggestions: state.suggestions.map(s => 
      s.id === id ? { ...s, data: { ...s.data, ...updates }, status: 'modified' } : s
    )
  })),

  setPanelOpen: (open) => set({ isPanelOpen: open }),
  setActiveSuggestion: (id) => set({ activeSuggestionId: id }),
  clearSuggestions: () => set({ suggestions: [], activeSuggestionId: null })
}));
```

### Suggestion Card Component
```typescript
// Based on TimelinePanel.tsx button patterns and ContextualSlicePanel.tsx
import { Button } from '@/components/ui/button';
import { Check, Pencil, X } from 'lucide-react';
import { useSuggestionStore, type Suggestion } from '@/store/useSuggestionStore';

interface SuggestionCardProps {
  suggestion: Suggestion;
}

export function SuggestionCard({ suggestion }: SuggestionCardProps) {
  const { acceptSuggestion, rejectSuggestion, modifySuggestion, setActiveSuggestion } = useSuggestionStore();
  
  const isPending = suggestion.status === 'pending';
  
  return (
    <div 
      className={`p-4 border rounded-lg ${!isPending ? 'opacity-50' : ''}`}
      onClick={() => setActiveSuggestion(suggestion.id)}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium capitalize">{suggestion.type.replace('-', ' ')}</span>
        <span className="text-sm text-muted-foreground">
          {suggestion.confidence}% confidence
        </span>
      </div>
      
      {/* Suggestion details would go here */}
      <div className="text-sm text-muted-foreground mb-4">
        {JSON.stringify(suggestion.data)}
      </div>
      
      {isPending && (
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="default"
            onClick={(e) => { e.stopPropagation(); acceptSuggestion(suggestion.id); }}
          >
            <Check className="w-4 h-4 mr-1" /> Accept
          </Button>
          <Button 
            size="sm" 
            variant="secondary"
            onClick={(e) => { e.stopPropagation(); modifySuggestion(suggestion.id, {}); }}
          >
            <Pencil className="w-4 h-4 mr-1" /> Modify
          </Button>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); rejectSuggestion(suggestion.id); }}
          >
            <X className="w-4 h-4 mr-1" /> Reject
          </Button>
        </div>
      )}
    </div>
  );
}
```

### Suggestion Trigger Hook (useSuggestionTrigger.ts)
```typescript
// Claude's discretion per CONTEXT.md: trigger mechanism
import { useCallback } from 'react';
import { useSuggestionStore, type Suggestion } from '@/store/useSuggestionStore';

type TriggerMode = 'automatic' | 'manual' | 'on-demand';

interface UseSuggestionTriggerOptions {
  mode: TriggerMode;
  onGenerate?: () => Promise<Suggestion[]>;
}

export function useSuggestionTrigger({ mode, onGenerate }: UseSuggestionTriggerOptions) {
  const { addSuggestion, suggestions } = useSuggestionStore();
  
  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');
  
  const trigger = useCallback(async () => {
    if (!onGenerate) return;
    
    const newSuggestions = await onGenerate();
    newSuggestions.forEach(s => addSuggestion(s));
  }, [onGenerate, addSuggestion]);
  
  const hasSuggestions = pendingSuggestions.length > 0;
  
  // For 'automatic' mode, could set up interval or event listener
  // For 'manual' mode, expose trigger button
  // For 'on-demand' mode, expose trigger on user action
  
  return {
    trigger,
    hasSuggestions,
    suggestionCount: pendingSuggestions.length,
    mode
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Modal dialogs for reviews | Side panel (fixed right) | ContextualSlicePanel (Phase 22+) | Allows comparison while reviewing |
| Color-coded confidence | Numerical percentage | CONTEXT.md decision | More precise and actionable |
| Inline suggestion editing | Modify via panel + modal | New pattern this phase | Keeps timeline clean |

**Deprecated/outdated:**
- Modal-based review workflows: Replaced by side panel for better comparison capability
- Inline suggestion editing on timeline: Per CONTEXT.md - "NOT inline on timeline (side panel keeps timeline clean)"

## Open Questions

1. **Trigger mechanism details**
   - What we know: Three options identified (automatic, manual, on-demand)
   - What's unclear: Which triggers suggestion generation - data changes? time-based? explicit button?
   - Recommendation: Start with manual button, then add automatic if user feedback supports it

2. **Suggestion data source**
   - What we know: useCrimeData hook exists for data access
   - What's unclear: How density/peak detection will feed into suggestions (phases 36-37)
   - Recommendation: Create stub/interface for suggestion data that later phases will populate

3. **Modification flow specifics**
   - What we know: Three options identified (direct manipulation, parameter adjustment, reject-and-recreate)
   - What's unclear: Which modification UI pattern works best for warp profiles vs interval boundaries
   - Recommendation: Start with parameter adjustment in side panel, evolve based on UX feedback

## Sources

### Primary (HIGH confidence)
- `src/components/viz/ContextualSlicePanel.tsx` - Existing side panel pattern
- `src/store/useCoordinationStore.ts` - Panel state management
- `src/store/useWarpSliceStore.ts` - Zustand store pattern
- `src/hooks/useCrimeData.ts` - Data access hook pattern
- `src/components/ui/sheet.tsx` - Radix UI sheet component

### Secondary (MEDIUM confidence)
- Web search: "React side panel design patterns 2025 review workflow UI" - Confirmed side panel is preferred pattern
- Web search: "confidence score visualization UI patterns" - Confirmed numerical display is valid approach
- Web search: "accept modify reject UI pattern workflow buttons UX" - Confirmed button hierarchy pattern

### Tertiary (LOW confidence)
- General UX patterns for AI suggestion systems (needs validation with actual users)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use in codebase
- Architecture: HIGH - Based on existing proven patterns from codebase
- Pitfalls: MEDIUM - Based on general React patterns, may need adjustment

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (stable phase - UI patterns don't change rapidly)
