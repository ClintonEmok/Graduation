# Temporal Interpolation Decision

## What the current code does

Interpolation is a per-cell linear blend between two consecutive slice KDEs, wrapped in easing and only shown while playback is running.

Core math:

```ts
out = from + (to - from) * t
```

`t` is not raw time. It is:

```ts
progress = (nowMs - transition.startedAt) / TRANSITION_DURATION_MS
eased = easeInOutCubic(progress)
```

The blend is applied to the flattened KDE cell fields:
- `x`
- `z`
- `intensity`
- `support`

If the source and target KDE buffers do not match shape, the code falls back to the target slice rather than forcing a broken blend.

## Code path

- `src/components/dashboard-demo/DemoInspectPanel.tsx`
  - starts/stops playback
  - gates interpolation behind the `Interpolated` toggle
- `src/components/dashboard-demo/Demo3dSpatialView.tsx`
  - drives `activeSliceIndex`
  - passes ordered slices and KDE data into the 3D scene
- `src/app/stkde-3d/components/StkdeSliceStack.tsx`
  - computes transition progress
  - builds the interpolated KDE texture
  - overlays the interpolated slice during playback
- `src/lib/motion/easing.ts`
  - `easeInOutCubic()`
  - `interpolateKdeCells()`

## Why this interpolation style was chosen

The goal is not to invent a new visual encoding. The goal is to make slice changes feel continuous while preserving the analytical meaning of the active slice.

This approach was chosen because it:
- stays inside the demo 3D widget boundary
- keeps the active slice as the anchor
- uses existing KDE cell data instead of recomputing a new animation surface
- is easy to reason about in review because the math is plain lerp + easing
- remains opt-in, so analysts can keep the jump-cut mental model when they want it

## Interpolation options

### 1. Linear interpolation (chosen)

What it is:
- blend the current slice and the next slice with a straight lerp

Math:
- `out = from + (to - from) * t`

Pros:
- simplest to explain and defend
- predictable and stable
- easy to keep opt-in and bounded to playback
- keeps the active slice readable

Cons:
- can feel subtle when adjacent slices are already similar
- only gives a straight path between two states

Tradeoff:
- best if you want a clean, conservative motion language
- weakest if you want the transition itself to carry analytical meaning beyond “between A and B”

### 2. Neighbor-based interpolation

What it is:
- use neighboring slices as a local context window, then blend toward the target slice from both sides instead of only from the previous slice

Pros:
- can smooth out jumpy changes when the target slice is noisy
- can feel more context-aware than a pure two-slice blend

Cons:
- harder to explain in review because it depends on extra neighbors
- easier to over-smooth or blur local change
- can hide real discontinuities that matter analytically

Tradeoff:
- best if you want a smoother path through uneven slice sequences
- weakest if the user needs to see exactly where a change starts or stops

### 3. Polynomial interpolation

What it is:
- fit a curve through multiple slice states or sample points and evaluate the curve between them

Pros:
- can produce a smoother-looking transition than a straight lerp
- useful if you want motion to feel more continuous across several steps

Cons:
- harder to reason about and defend
- can overshoot or create shapes that were never present in the source data
- more fragile than linear interpolation for an analytical widget

Tradeoff:
- best if you want a more fluid, stylized temporal motion language
- weakest if you want the safest, most literal representation of the data

### 4. Opacity-only crossfade

What it is:
- keep each slice unchanged and fade one out while fading the next in

Pros:
- easy to implement
- low risk

Cons:
- still looks like two separate plates
- does not actually morph the KDE content
- less helpful when users want to track a hotspot across adjacent slices

Tradeoff if chosen later:
- best if you want the least risky visual change
- weakest if you need the user to feel a real temporal bridge between slices

### 5. Geometry morph / resampled surface interpolation

What it is:
- interpolate the KDE cell values directly and render the blended result on the active slice

Pros:
- keeps the active slice as the anchor
- preserves the KDE shape while showing change
- reads as a real transition rather than a simple transparency trick

Cons:
- only works cleanly when consecutive KDE buffers are compatible enough to blend
- can be subtle if two slices are already very similar

Tradeoff if reused later:
- strongest fit when the goal is continuity without changing the data model
- less ideal if you want a more dramatic or physically expressive motion language

### 6. Temporal accumulation / trail-based interpolation

What it is:
- keep prior frames or prior slices visible and let the blend accumulate over time

Pros:
- good for motion continuity
- pairs well with aging trails

Cons:
- can look like a persistence effect instead of interpolation
- risks muddying the current slice unless carefully bounded

Tradeoff if chosen later:
- good for motion memory and emotional continuity
- bad if the goal is crisp analytical comparison

### 7. Kernel re-evaluation every frame

What it is:
- recompute the KDE continuously during playback instead of blending precomputed slices

Pros:
- mathematically direct
- can capture non-linear intermediate states

Cons:
- expensive
- unnecessary for the current demo path
- would make playback heavier without a clear analytical gain

Tradeoff if chosen later:
- best if you want mathematically exact in-between states
- worst for performance and implementation complexity

## Quick selection guide

Use this if you need to defend or revisit the choice later:

| Option | Best when | Main downside |
|---|---|---|
| Linear interpolation | You want the simplest defensible motion | Can be subtle |
| Neighbor-based interpolation | You want extra local smoothing | Can blur real changes |
| Polynomial interpolation | You want a more fluid stylized curve | Can overshoot or distort |
| Opacity-only crossfade | You want the safest visual change | Still reads as two plates |
| Geometry morph | You want a more physical transition | More fragile and complex |
| Temporal accumulation | You want motion memory / persistence | Can muddy the reading |
| Kernel re-evaluation every frame | You want exact intermediate states | Expensive and heavy |

## Review-friendly summary

If asked why this version was chosen, the short answer is:

> We chose eased linear cell-wise lerp + crossfade because it gives a continuous transition without changing the data model, keeps the active slice readable, and stays opt-in so the default interpretation remains a normal slice-by-slice analysis view.

## Current recommendation

The current recommendation is still **linear interpolation**. Keep the full alternatives discussion above for future defense, but treat linear as the default because it is the most literal, lowest-risk choice and the easiest to explain in review. If you revisit this later, use the decision question: do you want maximum fidelity to the observed slices, or a more stylized curve that may smooth away real change?
