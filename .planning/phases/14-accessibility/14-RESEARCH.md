# Phase 14 Research: Color Schemes & Accessibility

## Current State

### 1. UI Styling (Tailwind/Shadcn)
- **File:** `src/app/globals.css`
- **Mechanism:** CSS variables (`--background`, `--foreground`) defined in `:root` and `.dark`.
- **Finding:** Currently binary (Light/Dark). Need to extend this system to support a "Colorblind" mode (likely a high-contrast light or dark variant).
- **Recommendation:** Use `data-theme="colorblind"` attribute on `<body>` alongside class="dark".

### 2. 3D Scene Styling (R3F)
- **File:** `src/components/viz/Scene.tsx`
- **Mechanism:** Hardcoded `<color attach="background" args={['#000000']} />`.
- **Finding:** Background is static.
- **Recommendation:** Connect to a `useThemeStore` to inject the correct hex color for the canvas background.

### 3. Data Point Colors (Visualization)
- **File:** `src/components/viz/DataPoints.tsx`
- **Mechanism:** `COLOR_MAP` constant with hardcoded hex values (Theft=#FFD700, etc.).
- **Finding:** Colors are baked into the component.
- **Recommendation:** Move `COLOR_MAP` to `useThemeStore` or a `palettes.ts` configuration. `DataPoints` should read this map dynamically and rebuild the color attributes when it changes.

### 4. Map Styling (MapLibre)
- **File:** `src/components/map/MapBase.tsx`
- **Mechanism:** Hardcoded `MAP_STYLE` URL ("dark-matter").
- **Finding:** Static map style.
- **Recommendation:** Switch map style URL based on theme (Dark Matter for Dark, Positron for Light/Colorblind).

## Implementation Strategy

### Store Structure
Create `src/store/useThemeStore.ts`:
```typescript
type Theme = 'light' | 'dark' | 'colorblind';
type Palette = {
  background: string;
  foreground: string;
  categoryColors: Record<string, string>;
  mapStyle: string;
}
```

### Palettes
- **Default (Dark):** Existing colors.
- **Light:** White background, dark points, Positron map.
- **Colorblind:** High contrast (Okabe-Ito or similar safe palette), distinct shapes if possible (out of scope for now, just colors).

### Synchronization
- **SettingsPanel:** Dropdown to set `theme` in store.
- **Effect:** Update `document.documentElement.classList` or attributes.
- **Components:** Subscribe to store for specific values.
