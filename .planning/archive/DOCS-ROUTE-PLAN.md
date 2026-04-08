# Plan: `/docs` Route - Codebase Implementation Guide

**Created:** 2026-03-09  
**Status:** Draft  
**Purpose:** Document the Neon Tiger codebase with high-level architecture explanations and interactive React components

---

## Overview

Create a React-based documentation route at `/docs` that explains the entire Neon Tiger codebase with high-level architecture diagrams and interactive components.

---

## Proposed Structure

```
/docs
├── page.tsx                    # Main docs landing
├── layout.tsx                  # Docs-specific layout (sidebar + content)
├── components/
│   ├── Sidebar.tsx             # Navigation sidebar
│   ├── SectionCard.tsx         # Reusable section cards
│   ├── ArchitectureDiagram.tsx # Interactive architecture viz
│   ├── FlowDiagram.tsx         # Data/system flow diagrams
│   └── CodeBlock.tsx           # Syntax highlighted snippets
└── sections/
    ├── overview.mdx            # Project overview
    ├── architecture.mdx        # High-level architecture
    ├── routes.mdx              # Route structure
    ├── stores.mdx              # State management
    ├── visualization.mdx       # 3D + 2D viz components
    ├── suggestion-system.mdx   # Full-auto system deep dive
    ├── api.mdx                 # API routes
    └── data-pipeline.mdx       # DuckDB pipeline
```

---

## Content Sections

### 1. Overview
- What is Neon Tiger
- Tech stack (Next.js, Three.js, MapLibre, D3, Zustand, DuckDB)
- Key features summary

### 2. Architecture
- System diagram showing: Data → API → Stores → Components → 3D/2D Viz
- Data flow explanation

### 3. Routes
| Route | Purpose | Key Components |
|-------|---------|----------------|
| `/dashboard` | Main production route | DualTimeline, CubeVisualization, MapVisualization |
| `/timeline-test` | Sandbox - density testing | Mock data, slice creation |
| `/timeline-test-3d` | Sandbox - 3D testing | 3D scene, suggestion acceptance |
| `/timeslicing` | Sandbox - semi-auto workflow | Selection timeline, hover preview |
| `/docs` | This documentation | N/A |

### 4. State Management (Stores)
- **useSliceStore** - Slice CRUD + overlap tracking
- **useSuggestionStore** - Suggestions + full-auto packages (725 lines)
- **useFilterStore** - Crime filters (types, districts)
- **useAdaptiveStore** - Warp map + density computation
- **useWarpSliceStore** - Warp slice management
- **useSliceCreationStore** - Slice creation UI state

### 5. Visualization Components

#### 3D (Three.js)
| Component | Purpose |
|-----------|---------|
| `CubeVisualization` | Main 3D space-time cube |
| `TimeSlices` | Slice planes in 3D |
| `TimePlane` | Time axis visualization |
| `Trajectory` | Crime trajectories |
| `SlicePlane` | Individual slice rendering |
| `MainScene` | Scene setup + lighting |

#### 2D (MapLibre)
| Component | Purpose |
|-----------|---------|
| `MapVisualization` | 2D map wrapper |
| `MapEventLayer` | Crime points on map |
| `MapHeatmapOverlay` | Density heatmap |
| `MapTrajectoryLayer` | Trajectories on map |

#### Timeline (D3)
| Component | Purpose |
|-----------|---------|
| `DualTimeline` | Overview + detail timeline (1452 lines) |
| `DensityTrack` | Density visualization |
| `AdaptiveAxis` | Warped time axis |
| `DensityHistogram` | Crime histogram |

### 6. Suggestion System (Full-Auto)

#### Pipeline
```
useSuggestionGenerator (470 lines)
        ↓
useContextExtractor → FilterContext
        ↓
detectSmartProfile → 3 hardcoded profiles
        ↓
generateWarpProfiles() → warp candidates
        ↓
full-auto-orchestrator (320 lines) → score & rank
        ↓
SuggestionPanel (643 lines) → UI
```

#### Scoring Weights
| Metric | Weight |
|--------|--------|
| Relevance | 40% |
| Continuity | 30% |
| Overlap | 20% |
| Coverage | 10% |

#### Confidence Calculation
| Component | Weight |
|-----------|--------|
| Clarity (variance in density) | 40% |
| Coverage (temporal span) | 30% |
| Statistical (SNR, prominence) | 30% |

### 7. API Routes
| Endpoint | Purpose |
|----------|---------|
| `/api/crimes/range` | Get crimes in time range |
| `/api/crime/bins` | Density bin aggregation |
| `/api/crime/facets` | Crime type/district facets |
| `/api/crime/meta` | Dataset metadata |
| `/api/crime/stream` | Streaming crime data |
| `/api/adaptive/global` | Global density map |

### 8. Data Pipeline
- DuckDB for crime data (~8.5M Chicago crime records)
- Coordinate normalization
- Binning strategies for density computation

---

## Component Specs

### Sidebar.tsx
- Collapsible sections matching content structure
- Active state highlighting
- Responsive (collapses on mobile)

### ArchitectureDiagram.tsx
- SVG-based interactive diagram
- Clickable nodes → scroll to section
- Hover for tooltips with component info

### FlowDiagram.tsx
- Reusable flow visualization
- Support for: data flow, state flow, API calls

### SectionCard.tsx
- Title, description, icon
- Expandable for more detail
- Links to related sections

---

## Navigation Layout

```
┌─────────────────────────────────────────────────────────────┐
│  NEON TIGER / DOCS                                         │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│  OVERVIEW    │  ┌─────────────────────────────────────┐   │
│              │  │  Architecture                        │   │
│  ARCHITECTURE│  │                                      │   │
│              │  │  [Interactive Diagram]              │   │
│  ROUTES      │  │                                      │   │
│              │  └─────────────────────────────────────┘   │
│  STORES      │                                              │
│              │  ┌─────────────────────────────────────┐   │
│  VISUALIZATION│ │  Routes                             │   │
│              │  │  • /dashboard (main)               │   │
│  SUGGESTIONS │  │  • /timeline-test (sandbox)       │   │
│              │  │  • /timeline-test-3d (sandbox)     │   │
│  API         │  │  • /timeslicing (sandbox)          │   │
│              │  └─────────────────────────────────────┘   │
│  DATA        │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

---

## Implementation Phases

| Phase | Task | Files |
|-------|------|-------|
| DOC-01 | Create `/docs` route structure | `src/app/docs/page.tsx`, `layout.tsx` |
| DOC-02 | Build sidebar + navigation | `components/Sidebar.tsx` |
| DOC-03 | Architecture diagram component | `components/ArchitectureDiagram.tsx` |
| DOC-04 | Overview + Routes sections | `sections/overview.mdx`, `routes.mdx` |
| DOC-05 | Stores section | `sections/stores.mdx` |
| DOC-06 | Visualization section | `sections/visualization.mdx` |
| DOC-07 | Suggestion system deep-dive | `sections/suggestion-system.mdx` |
| DOC-08 | API + Data pipeline | `sections/api.mdx`, `data-pipeline.mdx` |

---

## Estimated Effort

- **Phase 1-3**: ~2 hours (infrastructure + nav)
- **Phase 4-5**: ~1 hour (stores + routes)
- **Phase 6-8**: ~2 hours (technical sections)

**Total**: ~5 hours

---

## Dependencies

- Reuse existing UI components from `src/components/ui/`
- Use existing shadcn/ui components (button, scroll-area, etc.)
- No external diagram libraries needed - custom SVG

---

## Success Criteria

- [ ] `/docs` route loads and displays content
- [ ] Sidebar navigation works and highlights active section
- [ ] Architecture diagram renders and is interactive
- [ ] All major sections (stores, visualization, suggestions, API) are documented
- [ ] Code is understandable by someone unfamiliar with the codebase

---

*Plan owner: To be assigned*
