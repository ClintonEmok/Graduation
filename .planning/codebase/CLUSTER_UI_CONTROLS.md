# Clustering UI Controls

**Analysis Date:** 2026-05-07

## Overview

Clustering is controlled through a **two-layer system**:

1. **Feature Flag** (`'clustering'`) — gates whether the clustering UI section appears at all
2. **Runtime Toggle** (`useClusterStore.enabled`) — the actual on/off switch
3. **Map Layer Toggle** — controls whether cluster highlights are visible on the map

These are independent: the feature flag must be `true` for the section to show, but the runtime `enabled` state still needs to be `true` for clustering to actually run.

---

## 1. Feature Flag Definition

**File:** `src/lib/feature-flags.ts`

```typescript
// Phase 17: Cluster Highlighting
{
  id: 'clustering',
  name: 'Cluster Highlighting',
  description: 'Auto-detect and label dense regions',
  category: 'visualization',
  status: 'experimental',
  default: false,   // <-- Defaults to OFF
},
```

Key defaults from `getDefaultFlags()`:
```typescript
export function getDefaultFlags(): Record<string, boolean> {
  return FLAG_DEFINITIONS.reduce((acc, flag) => {
    acc[flag.id] = flag.default;
    return acc;
  }, {} as Record<string, boolean>);
}
```

---

## 2. Feature Flags Store

**File:** `src/store/useFeatureFlagsStore.ts`

```typescript
isEnabled: (flagId) => {
  const { flags, pendingFlags } = get();
  // During editing, show pending value if exists
  if (pendingFlags !== null && flagId in pendingFlags) {
    return pendingFlags[flagId];
  }
  return flags[flagId] ?? false;
},
```

**Persistence:** `persist` middleware with `name: 'feature-flags-v1'`. Only `flags` is persisted — `pendingFlags` (the draft state during Settings editing) is not.

**Note:** In `SliceManagerUI.tsx` line 33, `isEnabled` is destructured and renamed to `isHeatmapFeatureEnabled`, which is confusing. It is the same function.

---

## 3. Cluster Store — Default Values

**File:** `src/store/useClusterStore.ts`

```typescript
export const useClusterStore = create<ClusterState>((set) => ({
  clusters: [],
  sliceClustersById: {},
  enabled: true,      // <-- Runtime toggle, defaults ON
  sensitivity: 0.5,   // <-- 0 to 1 scale
  selectedClusterId: null,
  hoveredClusterId: null,
  // ...
}));
```

**Important:** `enabled` and `sensitivity` are **NOT persisted** — they reset to `true` and `0.5` on page reload.

---

## 4. SliceManagerUI — Cluster Section

**File:** `src/components/viz/SliceManagerUI.tsx`

### Section Visibility (line 47)
```typescript
const showClusterSection = isHeatmapFeatureEnabled('clustering');
```
The entire cluster section is only rendered if the feature flag is enabled.

### Store Connection (lines 49-54)
```typescript
const {
  enabled: isClusteringActive,
  setEnabled: setClusteringActive,
  sensitivity: clusterSensitivity,
  setSensitivity: setClusterSensitivity
} = useClusterStore();
```

### Toggle + Sensitivity Slider (lines 179-212)
```typescript
{showClusterSection && (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <h3 className="text-sm font-medium">Clustering</h3>
            </div>
            <Switch
                checked={isClusteringActive}
                onCheckedChange={setClusteringActive}
            />
        </div>

        {isClusteringActive && (
            <div className="space-y-4 pt-2 border-l-2 border-accent pl-4 ml-2">
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <Label className="text-xs">Sensitivity</Label>
                        <span className="text-[10px] text-muted-foreground">{(clusterSensitivity * 100).toFixed(0)}%</span>
                    </div>
                    <Slider
                        value={[clusterSensitivity * 100]}
                        onValueChange={([val]: number[]) => setClusterSensitivity(val / 100)}
                        min={0}
                        max={100}
                        step={1}
                    />
                </div>
            </div>
        )}
    </div>
)}
```

**Behavior:**
- The section only appears if feature flag `'clustering'` is enabled
- The Switch sets `useClusterStore.enabled`
- The Sensitivity slider only shows when `isClusteringActive` is `true`
- Sensitivity range: 0–100% (stored as 0–1 internally)

---

## 5. Settings Panel — Feature Flag Toggle

**File:** `src/components/settings/SettingsPanel.tsx`

The Settings panel lists all feature flags including `'clustering'` under the **Visualization** tab.

```typescript
const getEffectiveValue = (flagId: string) => {
  if (pendingFlags !== null && flagId in pendingFlags) {
    return pendingFlags[flagId];
  }
  return flags[flagId] ?? false;
};

// ...
<FeatureFlagItem
  flag={flag}
  isEnabled={getEffectiveValue(flag.id)}
  onToggle={(enabled) => setPendingFlag(flag.id, enabled)}
/>
```

**File:** `src/components/settings/FeatureFlagItem.tsx`

```typescript
<Switch
  id={flag.id}
  checked={isEnabled}
  onCheckedChange={onToggle}
/>
```

This toggles the `pendingFlags` draft state. Changes are only committed when "Save Changes" is clicked via `applyPendingFlags()`.

---

## 6. TimeSlices — Dual Check for Clustering

**File:** `src/components/viz/TimeSlices.tsx`

```typescript
const clusteringEnabled = useFeatureFlagsStore((state) => state.isEnabled('clustering'));
const clusterStoreEnabled = useClusterStore((state) => state.enabled);

// ...
if (!clusteringEnabled || !clusterStoreEnabled || slices.length === 0 || filteredPoints.length === 0) {
  return {};
}
```

**Both must be true** for clustering to run in the 3D scene. The feature flag alone is not enough.

---

## 7. Map Layer Toggle — Cluster Visibility on Map

**File:** `src/components/map/MapLayerManager.tsx`

```typescript
const layers = [
  // ...
  { id: 'clusters' as const, label: 'Clusters', visible: visibility.clusters, color: '#8b5cf6' },
  // ...
];
```

**Default in `useMapLayerStore`:** `clusters: false` (not visible by default)

```typescript
visibility: {
  // ...
  clusters: false,
  // ...
},
```

**File:** `src/components/map/MapVisualization.tsx` (line 193)

```typescript
{visibility.clusters ? <MapClusterHighlights /> : null}
```

This is **independent** of the feature flag and runtime toggle — it only controls whether cluster highlights render on the map.

---

## 8. MapClusterHighlights

**File:** `src/components/map/MapClusterHighlights.tsx`

```typescript
const { clusters, enabled, selectedClusterId } = useClusterStore();

// ...
if (!enabled || !clusters || clusters.length === 0) return null;
```

The component reads `useClusterStore.enabled` directly (not the feature flag). It only renders if clusters exist and store is enabled.

---

## Summary: User Controls for Clustering

| Control Location | Control Type | Sets | Default |
|-----------------|--------------|------|---------|
| **Settings Panel** → Visualization tab | Feature flag toggle for `'clustering'` | `useFeatureFlagsStore.flags['clustering']` | `false` |
| **SliceManagerUI** (when flag enabled) | Switch | `useClusterStore.enabled` | `true` |
| **SliceManagerUI** (when flag enabled + switch on) | Sensitivity slider (0–100) | `useClusterStore.sensitivity` | `0.5` |
| **MapLayerManager** | Layer visibility checkbox | `useMapLayerStore.visibility.clusters` | `false` |

### Execution Requirements (for clustering to actually run)

1. Feature flag `'clustering'` = `true` (Settings panel)
2. `useClusterStore.enabled` = `true` (SliceManagerUI switch)
3. `useMapLayerStore.visibility.clusters` = `true` (for map highlight visibility)
4. `clusterSensitivity` affects cluster detection thresholds in `analyzeClusters`

### Key Files
- `src/components/viz/SliceManagerUI.tsx` — Primary clustering UI (toggle + sensitivity)
- `src/lib/feature-flags.ts` — Flag definition and defaults
- `src/store/useFeatureFlagsStore.ts` — Flag state management
- `src/store/useClusterStore.ts` — Runtime enabled/sensitivity state (NOT persisted)
- `src/components/settings/SettingsPanel.tsx` — Feature flag toggle UI
- `src/components/map/MapLayerManager.tsx` — Map layer visibility toggle

---

*Cluster UI controls analysis: 2026-05-07*