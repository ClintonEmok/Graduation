# Phase 12: Feature Flags Infrastructure - Research

**Researched:** 2026-02-04
**Domain:** Feature flag system with localStorage persistence, URL sharing, and settings UI
**Confidence:** HIGH

## Summary

This phase requires building a feature flag infrastructure that allows users to toggle experimental visualization features on/off via a settings panel. The system must persist toggles in localStorage, support URL-based configuration sharing, and provide a draggable floating toolbar with a gear icon for accessing settings.

The project already uses Zustand for state management (v5.0.10) with the `persist` middleware established in `useLayoutStore.ts`. This pattern extends naturally to a feature flags store. The existing `Controls.tsx` floating toolbar will be converted to support dragging and settings panel access. shadcn/ui components (Dialog, Tabs, Switch, Badge) provide the UI primitives for the settings panel.

The key complexity is URL parameter synchronization with conflict resolution (URL wins, but prompt user first). Next.js's `useSearchParams` and `useRouter` hooks handle URL reading/updating, while the feature flags store manages the canonical state with localStorage persistence.

**Primary recommendation:** Extend the established Zustand persist pattern with a dedicated `useFeatureFlagsStore`, use shadcn Sheet for settings panel (slides in from right, unobtrusive), and implement a custom `useDraggable` hook for toolbar positioning (no external dependency needed for this simple use case).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `zustand` | 5.0.10 | State management + persistence | Already in use, has `persist` middleware |
| `zustand/middleware` (persist) | 5.0.10 | localStorage persistence | Built-in, already used for layout storage |
| `next/navigation` | 16.1.6 | URL parameter handling | `useSearchParams`, `useRouter`, `usePathname` |
| `@radix-ui/react-dialog` | 1.1.15 | Sheet/Dialog primitives | Already installed, powers shadcn Sheet |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn Sheet | (via radix-dialog) | Side panel for settings | Settings panel presentation |
| shadcn Tabs | (needs install) | Organize features by category | Tabbed settings UI |
| shadcn Switch | (needs install) | Toggle switches | Feature flag toggles |
| shadcn Badge | (needs install) | Status indicators | Experimental/Stable/Beta labels |
| shadcn Alert Dialog | (needs install) | Confirmation dialogs | Destructive disable confirmations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom draggable | `react-draggable` or `@dnd-kit/core` | External dep not needed for simple toolbar drag; add if requirements grow |
| Sheet | Dialog | Dialog is more intrusive, blocks interaction; Sheet slides in from edge |
| Custom toggle | Checkbox | Switch has better UX for on/off states |

**Installation:**
```bash
# Install missing shadcn components
pnpm dlx shadcn@latest add sheet tabs switch badge alert-dialog
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── store/
│   └── useFeatureFlagsStore.ts    # Feature flags state + localStorage persist
├── components/
│   ├── viz/
│   │   ├── FloatingToolbar.tsx    # Draggable toolbar (replaces Controls.tsx)
│   │   └── Controls.tsx           # Deprecated, functionality moved
│   └── settings/
│       ├── SettingsPanel.tsx      # Main settings sheet
│       ├── FeatureFlagList.tsx    # List of toggleable features
│       ├── FeatureFlagItem.tsx    # Single flag with switch + badge
│       └── URLConflictDialog.tsx  # "Apply URL settings?" prompt
├── hooks/
│   ├── useDraggable.ts            # Custom hook for toolbar dragging
│   └── useURLFeatureFlags.ts      # Sync URL params <-> store
├── lib/
│   └── feature-flags.ts           # Flag definitions, defaults, categories
```

### Pattern 1: Feature Flags Store with Zustand Persist
**What:** Centralized store for all feature flag state with localStorage persistence
**When to use:** All feature flag operations
**Example:**
```typescript
// Source: Zustand persist middleware documentation
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface FeatureFlag {
  id: string;
  enabled: boolean;
  category: 'visualization' | 'experimental' | 'performance';
  status: 'experimental' | 'beta' | 'stable';
  name: string;
  description: string;
}

interface FeatureFlagsState {
  flags: Record<string, boolean>;
  pendingFlags: Record<string, boolean> | null; // For batch editing
  setFlag: (id: string, enabled: boolean) => void;
  setPendingFlags: (flags: Record<string, boolean>) => void;
  applyPendingFlags: () => void;
  discardPendingFlags: () => void;
  resetToDefaults: () => void;
  _hasHydrated: boolean;
}

export const useFeatureFlagsStore = create<FeatureFlagsState>()(
  persist(
    (set, get) => ({
      flags: {}, // Empty = all defaults
      pendingFlags: null,
      _hasHydrated: false,
      setFlag: (id, enabled) => set((state) => ({
        flags: { ...state.flags, [id]: enabled }
      })),
      setPendingFlags: (flags) => set({ pendingFlags: flags }),
      applyPendingFlags: () => set((state) => ({
        flags: { ...state.flags, ...state.pendingFlags },
        pendingFlags: null
      })),
      discardPendingFlags: () => set({ pendingFlags: null }),
      resetToDefaults: () => set({ flags: {} }),
    }),
    {
      name: 'feature-flags-v1', // Unique storage key
      partialize: (state) => ({ flags: state.flags }), // Only persist flags, not pending
      onRehydrateStorage: () => (state) => {
        state?._hasHydrated && (state._hasHydrated = true);
      },
    }
  )
);
```

### Pattern 2: URL Parameter Sync Hook
**What:** Bidirectional sync between URL params and feature flags store
**When to use:** Initial page load and when sharing configurations
**Example:**
```typescript
// Source: Next.js useSearchParams documentation
'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useFeatureFlagsStore } from '@/store/useFeatureFlagsStore';

export function useURLFeatureFlags() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [urlFlags, setUrlFlags] = useState<Record<string, boolean> | null>(null);

  // Parse flags from URL on mount
  useEffect(() => {
    const flagsParam = searchParams.get('flags');
    if (flagsParam) {
      try {
        const parsed = JSON.parse(atob(flagsParam));
        setUrlFlags(parsed);
        setShowConflictDialog(true);
      } catch {
        // Invalid format, ignore
      }
    }
  }, [searchParams]);

  // Generate shareable URL
  const generateShareURL = useCallback(() => {
    const flags = useFeatureFlagsStore.getState().flags;
    const encoded = btoa(JSON.stringify(flags));
    const params = new URLSearchParams(searchParams.toString());
    params.set('flags', encoded);
    return `${window.location.origin}${pathname}?${params.toString()}`;
  }, [pathname, searchParams]);

  return { showConflictDialog, urlFlags, setShowConflictDialog, generateShareURL };
}
```

### Pattern 3: Draggable Toolbar Hook
**What:** Custom hook for making toolbar draggable with position persistence
**When to use:** FloatingToolbar component
**Example:**
```typescript
// Custom implementation - no external dependency needed
import { useState, useCallback, useRef, useEffect } from 'react';

interface Position { x: number; y: number }

export function useDraggable(initialPosition: Position, storageKey?: string) {
  const [position, setPosition] = useState<Position>(() => {
    if (storageKey && typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    }
    return initialPosition;
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const rect = dragRef.current.getBoundingClientRect();
    offsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - offsetRef.current.x,
        y: e.clientY - offsetRef.current.y,
      });
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify(position));
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, position, storageKey]);

  return { position, isDragging, dragRef, handleMouseDown };
}
```

### Pattern 4: Batch Edit with Save Pattern
**What:** Stage changes in pendingFlags, apply on Save
**When to use:** Settings panel with deferred apply
**Example:**
```typescript
// In SettingsPanel component
const flags = useFeatureFlagsStore((state) => state.flags);
const pendingFlags = useFeatureFlagsStore((state) => state.pendingFlags);
const setPendingFlags = useFeatureFlagsStore((state) => state.setPendingFlags);
const applyPendingFlags = useFeatureFlagsStore((state) => state.applyPendingFlags);
const discardPendingFlags = useFeatureFlagsStore((state) => state.discardPendingFlags);

// Initialize pending on panel open
useEffect(() => {
  if (isOpen && !pendingFlags) {
    setPendingFlags({ ...flags });
  }
}, [isOpen, flags, pendingFlags, setPendingFlags]);

// Get effective value for display
const getEffectiveValue = (flagId: string, defaultValue: boolean) => {
  return pendingFlags?.[flagId] ?? flags[flagId] ?? defaultValue;
};

// Toggle in pending (not applied yet)
const handleToggle = (flagId: string, enabled: boolean) => {
  setPendingFlags({ ...pendingFlags, [flagId]: enabled });
};

// Save button applies changes
const handleSave = () => {
  applyPendingFlags();
  onClose();
};

// Close without saving discards
const handleClose = () => {
  discardPendingFlags();
  onClose();
};
```

### Anti-Patterns to Avoid
- **Immediate apply on toggle:** User expects batch behavior; immediate apply is confusing when there's a Save button
- **Global store subscription without selectors:** Causes unnecessary re-renders; use specific selectors
- **Storing flag definitions in state:** Only store boolean enabled/disabled; definitions are static config
- **SSR hydration mismatch:** Feature flags read from localStorage cause hydration errors; use `_hasHydrated` pattern
- **URL encoding with special chars:** Use base64 encoding for flag params to avoid URL encoding issues

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| localStorage persistence | Custom save/load | `zustand/middleware` persist | Handles hydration, versioning, migrations |
| URL parameter reading | `window.location.search` parsing | `next/navigation` `useSearchParams` | SSR-safe, suspense-compatible |
| Toggle switch UI | Custom checkbox styling | shadcn Switch | Accessible, styled, state management |
| Side panel | Custom animated div | shadcn Sheet | Proper focus trap, animations, accessibility |
| Confirmation dialog | Custom modal | shadcn AlertDialog | Interrupts correctly, accessible |
| Tab navigation | Custom state + buttons | shadcn Tabs | Keyboard nav, ARIA, controlled state |

**Key insight:** The UI primitives (Switch, Tabs, Sheet, AlertDialog) handle accessibility, keyboard navigation, and focus management correctly. Custom implementations consistently miss edge cases.

## Common Pitfalls

### Pitfall 1: SSR Hydration Mismatch with localStorage
**What goes wrong:** Server renders with defaults, client hydrates with localStorage values = mismatch error
**Why it happens:** `persist` middleware hydrates asynchronously after initial render
**How to avoid:** 
- Use `skipHydration: true` and manual `rehydrate()` in useEffect, OR
- Use `_hasHydrated` pattern to show loading state until hydrated
- Wrap feature-dependent components in Suspense
**Warning signs:** Console errors about hydration mismatch, flash of default content

### Pitfall 2: URL Params Override Without Consent
**What goes wrong:** Clicking shared link silently overwrites user's carefully configured settings
**Why it happens:** Auto-applying URL params without user confirmation
**How to avoid:** 
- Detect URL flags on mount
- Show confirmation dialog: "This link wants to enable X, Y. Apply these settings?"
- Only apply if user confirms
**Warning signs:** User complaints about lost settings after clicking shared links

### Pitfall 3: Stale Closures in Event Handlers
**What goes wrong:** Drag handlers capture old position, toggles capture old flag state
**Why it happens:** Event handlers defined in effects without proper deps
**How to avoid:** Use refs for mutable values in event handlers, or refresh handlers on dependency change
**Warning signs:** Toolbar "jumps", toggles revert unexpectedly

### Pitfall 4: Missing Unsaved Changes Indicator
**What goes wrong:** User makes changes, closes panel, wonders why nothing happened
**Why it happens:** Batch mode requires explicit save, but no visual feedback
**How to avoid:**
- Compare `pendingFlags` to `flags` to detect changes
- Highlight Save button when changes exist
- Show "Unsaved changes" label prominently
**Warning signs:** User closes and reopens panel expecting changes to persist

### Pitfall 5: Feature Flag Conflicts on Disable
**What goes wrong:** User disables feature that has active state (e.g., positioned time slices), state becomes orphaned
**Why it happens:** Feature flag only controls visibility, not cleanup of feature state
**How to avoid:**
- For destructive disables, show AlertDialog confirmation
- Reset feature state before disabling
- Store which flags need destructive confirmation
**Warning signs:** UI shows partial state, errors after re-enabling

## Code Examples

Verified patterns from official sources:

### shadcn Sheet Usage (Settings Panel)
```typescript
// Source: shadcn/ui Sheet documentation
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>
            Configure visualization features and experimental options.
          </SheetDescription>
        </SheetHeader>
        
        {/* Content with Tabs */}
        
        <SheetFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
```

### shadcn Tabs for Categories
```typescript
// Source: shadcn/ui Tabs documentation
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

<Tabs defaultValue="visualization" className="w-full">
  <TabsList>
    <TabsTrigger value="visualization">Visualization</TabsTrigger>
    <TabsTrigger value="experimental">Experimental</TabsTrigger>
    <TabsTrigger value="performance">Performance</TabsTrigger>
  </TabsList>
  <TabsContent value="visualization">
    {/* Feature flags for visualization category */}
  </TabsContent>
  <TabsContent value="experimental">
    {/* Feature flags for experimental category */}
  </TabsContent>
</Tabs>
```

### shadcn Switch with Label
```typescript
// Source: shadcn/ui Switch documentation
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

<div className="flex items-center justify-between">
  <div className="space-y-0.5">
    <Label htmlFor="time-slicing">{flag.name}</Label>
    <p className="text-sm text-muted-foreground">{flag.description}</p>
  </div>
  <Switch
    id="time-slicing"
    checked={isEnabled}
    onCheckedChange={(checked) => handleToggle(flag.id, checked)}
  />
</div>
```

### Next.js URL Param Update
```typescript
// Source: Next.js useSearchParams documentation
'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export function useFlagURL() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateURL = useCallback((flags: Record<string, boolean>) => {
    const params = new URLSearchParams(searchParams.toString());
    const encoded = btoa(JSON.stringify(flags));
    params.set('flags', encoded);
    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  const clearFlagsFromURL = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('flags');
    router.replace(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  return { updateURL, clearFlagsFromURL };
}
```

### Badge for Status Indicator
```typescript
// Source: shadcn/ui Badge documentation
import { Badge } from '@/components/ui/badge';

const statusVariants = {
  experimental: 'destructive',
  beta: 'secondary',
  stable: 'default',
} as const;

<Badge variant={statusVariants[flag.status]}>
  {flag.status}
</Badge>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `localStorage.getItem/setItem` | Zustand persist middleware | Zustand 4.0+ (2022) | Automatic hydration, type safety |
| `window.location.search` parsing | Next.js `useSearchParams` | Next.js 13+ (2022) | SSR-safe, Suspense-compatible |
| Redux for feature flags | Zustand with persist | 2023-2024 | Less boilerplate, smaller bundle |
| CSS-based modals | Radix Dialog primitives | 2022+ | Better accessibility, focus management |

**Deprecated/outdated:**
- `getInitialProps` for URL params: Use App Router `useSearchParams` or page `searchParams` prop
- Direct localStorage access in components: Use Zustand persist to avoid hydration issues
- `componentDidMount` for hydration: Use `useEffect` with proper hydration detection

## Open Questions

Things that couldn't be fully resolved:

1. **Exact flag IDs for Phases 13-19**
   - What we know: Phases 13-19 will each add features that need flags
   - What's unclear: Specific feature names/IDs until those phases are researched
   - Recommendation: Define a flexible flag registration pattern; use placeholder flags for now

2. **Conflict resolution UI exact behavior**
   - What we know: URL wins but user should be prompted
   - What's unclear: What if URL enables a flag that's been deprecated?
   - Recommendation: Silently ignore unknown flags, only prompt for valid ones

3. **Position persistence for draggable toolbar**
   - What we know: Should persist toolbar position
   - What's unclear: Same localStorage key as feature flags, or separate?
   - Recommendation: Separate key (`toolbar-position-v1`) for cleaner partitioning

## Sources

### Primary (HIGH confidence)
- Zustand GitHub README and docs - persist middleware patterns
- Next.js official docs - `useSearchParams` hook (v16.1.6)
- shadcn/ui official docs - Sheet, Tabs, Switch, Badge, AlertDialog components
- Existing codebase: `useLayoutStore.ts` - established persist pattern
- Existing codebase: `Controls.tsx` - current toolbar implementation
- Existing codebase: `FilterOverlay.tsx` - existing overlay/tabs pattern

### Secondary (MEDIUM confidence)
- Zustand persist middleware raw documentation (GitHub markdown)
- Radix UI primitives documentation (via shadcn)

### Tertiary (LOW confidence)
- None - all patterns verified with official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use or have official shadcn installation
- Architecture: HIGH - Patterns verified with official documentation and existing codebase conventions
- Pitfalls: HIGH - Well-documented SSR hydration and Zustand persist issues

**Research date:** 2026-02-04
**Valid until:** 60 days (stable patterns, no fast-moving dependencies)
