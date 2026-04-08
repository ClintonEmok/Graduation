# Research: UI Polish (Phase 13)

**Status:** Ready for Development
**Date:** 2026-02-04
**Focus:** Loading states, error handling, visual consistency, tooltips, onboarding

## Executive Summary

Phase 13 focuses on the "fit and finish" of the application. The goal is to reduce user friction through clear feedback (loading/error states) and guidance (tooltips/onboarding), while ensuring the interface looks professional and cohesive.

We will leverage the existing **shadcn/ui + Radix UI** foundation. We will introduce **Sonner** for toast notifications and **Driver.js** for the onboarding tour due to its lightweight nature and "highlight" capability which works well with our complex 3D/Map overlays.

## 1. Loading Indicators (POLISH-01)

Users need to know when the system is working, especially for data-heavy operations like fetching crime data or aggregating buckets.

### Recommended Pattern
Use a two-tier approach:
1.  **Skeleton Loading**: For initial page load or major view transitions where the layout is known but data is missing.
2.  **Spinner/Overlay**: For async actions (filtering, re-aggregating) where the view is already present but updating.

### Implementation
*   **Skeleton Component**: standard shadcn/ui implementation.
    ```tsx
    // src/components/ui/skeleton.tsx
    function Skeleton({ className, ...props }) {
      return <div className={cn("animate-pulse rounded-md bg-primary/10", className)} {...props} />
    }
    ```
*   **Spinner Component**: Use `lucide-react`.
    ```tsx
    import { Loader2 } from "lucide-react"
    export const Spinner = ({ className }) => <Loader2 className={cn("animate-spin", className)} />
    ```
*   **Locations**:
    *   **Map/Cube**: Show an absolute positioned overlay with a spinner when `isLoading` is true in the data store.
    *   **Timeline**: Show a skeleton or opacity pulse when buckets are re-aggregating.

## 2. Error Handling (POLISH-02)

Current error handling is likely `console.error` or native alerts. We need a non-intrusive but visible system.

### Recommendation: Sonner
We will use `sonner` as the toast provider. It is the modern standard for shadcn/ui, highly customizable, and handles stacking better than older libraries.

### Implementation
1.  **Install**: `pnpm add sonner`
2.  **Component**: Create `src/components/ui/sonner.tsx`.
3.  **Provider**: Add `<Toaster />` to `src/app/layout.tsx` (or root provider).
4.  **Usage**:
    ```tsx
    import { toast } from "sonner"
    // ...
    toast.error("Failed to load data", { description: "Please check your connection." })
    ```

## 3. Visual Consistency (POLISH-03)

The UI currently has some "rough edges" typical of rapid development (inconsistent spacing, mismatched font sizes).

### Audit Checklist
- [ ] **Spacing**: Replace arbitrary pixels (e.g., `w-[300px]`, `gap-[15px]`) with Tailwind scale (`w-72`, `gap-4`).
- [ ] **Colors**: Ensure all borders and backgrounds use CSS variables (`bg-background`, `border-border`) rather than hardcoded hex values, supporting future dark mode properly.
- [ ] **Typography**: Standardize section headers (`text-lg font-semibold`) and labels (`text-sm font-medium text-muted-foreground`).
- [ ] **Z-Index**: Centralize z-index values in a config or strict convention to prevent "tooltip behind map" issues.

## 4. Tooltips (POLISH-04)

Complex controls (sliders, toggle buttons) need explanations.

### Recommendation: Radix UI Tooltip
Since we already use Radix, sticking to `@radix-ui/react-tooltip` ensures accessibility and bundle efficiency.

### Implementation
*   Create `src/components/ui/tooltip.tsx` wrapping Radix primitives.
*   **Guideline**: Every icon-only button (like in the Floating Toolbar) MUST have a tooltip.
*   **Delay**: Set a `delayDuration` (e.g., 300ms) to prevent UI flashing as users move the mouse.

## 5. Onboarding (POLISH-05)

The application has a novel interface (3D Cube + Map + Timeline). Users need a guided tour.

### Recommendation: Driver.js
*   **Why**: It is framework-agnostic, lightweight, and specializes in "highlighting" DOM elements (like our specific panels) with a popover.
*   **Alternatives considered**: `react-joyride` (heavier, more React-centric but harder to style efficiently for this specific "highlight" look).

### Tour Steps
1.  **Welcome**: Modal explaining the tool's purpose.
2.  **Map (Left)**: "Here is the spatial view..."
3.  **Cube (Top Right)**: "Here is the space-time cube..."
4.  **Timeline (Bottom Right)**: "Filter and explore time here..."
5.  **Controls**: Highlight the floating toolbar.

### Implementation
*   **State**: Store `hasSeenOnboarding` in `localStorage` (similar to feature flags).
*   **Trigger**: `useEffect` in `DashboardLayout` checks the flag.
*   **Skip**: Allow users to exit via "Skip" or clicking outside.

## Dependency Changes

```bash
pnpm add sonner driver.js.js @radix-ui/react-tooltip class-variance-authority clsx tailwind-merge lucide-react
```
*(Note: standard utils already installed, just listing key UI deps)*

## Risks & Mitigations
*   **Z-Index Wars**: The Map and Canvas often fight for z-index.
    *   *Mitigation*: Ensure `Toaster` and `Driver.js` overlays have the highest z-index (often 9999+).
*   **Performance**: Tooltips on hundreds of elements.
    *   *Mitigation*: Only put tooltips on interactive controls, not data points.
