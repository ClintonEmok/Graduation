# Phase 14: Color Schemes & Accessibility

**Goal:** Users can choose color schemes including colorblind-safe and dark mode options.

**Context:**
The application currently has a default look. We need to introduce a rigorous theming system that spans:
1. **UI Components:** Handled via Tailwind/shadcn (CSS variables).
2. **3D Scene:** R3F Canvas, point colors, background colors (JS variables/uniforms).
3. **Map:** Mapbox/Leaflet tile layer styles.

**Requirements:**
- **COLOR-01:** System provides default, colorblind-safe, and dark mode palettes.
- **COLOR-02:** User can switch palettes via Settings.
- **COLOR-03:** Palette choice persists via feature flag/settings system (localStorage).

**Key Technical Challenges:**
- Synchronizing 3D scene colors (canvas background, fog, point colors) with CSS themes.
- Changing map tiles dynamically (e.g., Light vs Dark map styles).
- Ensuring the "Colorblind" mode effectively distinguishes categories in the 3D visualization (categorical colors).

**Existing Infrastructure:**
- Settings store (Phase 12) for persistence.
- Tailwind/shadcn for UI.
- React Three Fiber for 3D.

**Deliverables:**
- Updated Settings Panel with Theme Selector.
- ThemeContext or Store handling the active theme.
- Updates to `Controls.tsx`, `MapPanel.tsx`, and `Cube.tsx` to react to theme changes.
