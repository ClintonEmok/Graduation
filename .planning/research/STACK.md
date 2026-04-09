# Technology Stack

**Project:** Adaptive Space-Time Cube Prototype
**Researched:** 2026-04-09
**Overall confidence:** HIGH for the current brownfield stack; MEDIUM for add-on recommendations

## Recommended Stack

### Core App Platform

| Technology | Version / Family | Purpose | Recommendation | Confidence |
|------------|------------------|---------|----------------|------------|
| Next.js | 16.1.x | App framework, routing, API routes | **Keep** as the app shell; App Router fits the modular-monolith shape and API/visualization co-location | HIGH |
| React / React DOM | 19.2.x | UI runtime | **Keep**; aligns with Next.js 16 and supports the current component model | HIGH |
| TypeScript | 5.9.x | Type safety | **Keep**; essential for complex geo/time data and worker contracts | HIGH |
| Node.js | 20+ (prefer 22 LTS when available in infra) | Runtime | **Keep**; sufficient for Next.js + DuckDB native addon workflow | MEDIUM |
| pnpm | 9+ | Package manager | **Keep**; good fit for a large workspace and repeatable installs | HIGH |

### State / Data Fetching

| Technology | Version / Family | Purpose | Recommendation | Confidence |
|------------|------------------|---------|----------------|------------|
| Zustand | 5.x | Client coordination state | **Keep**; best fit for synchronized cube/map/timeline state without over-engineering | HIGH |
| TanStack Query | 5.x | Server state, caching, refetching | **Keep**; use for async data and API orchestration | HIGH |
| zod | 4.x | Runtime validation | **Add**; fill the current validation gap for filters, query params, and worker messages | HIGH |

### Visualization Stack

| Technology | Version / Family | Purpose | Recommendation | Confidence |
|------------|------------------|---------|----------------|------------|
| Three.js | 0.182.x | Custom 3D cube rendering | **Keep**; custom geometry/shaders are a core differentiator | HIGH |
| React Three Fiber | 9.5.x | Declarative Three.js integration | **Keep**; good for React-based visualization composition | HIGH |
| @react-three/drei | 10.7.x | R3F helpers | **Keep** selectively; use only the helpers that reduce boilerplate | HIGH |
| MapLibre GL JS | 5.17.x | 2D map base layer | **Keep**; strong open map stack for crime visualization | HIGH |
| react-map-gl | 8.1.x | React wrapper for MapLibre | **Keep** if it stays thin; avoid adding another map abstraction | MEDIUM |
| visx + d3 modules | 3.x / 4.x | Timeline axes, brushing, scales, selection | **Keep** for timeline primitives; avoid turning D3 into a second rendering framework | HIGH |

### Local Analytics / Data Pipeline

| Technology | Version / Family | Purpose | Recommendation | Confidence |
|------------|------------------|---------|----------------|------------|
| DuckDB | 1.4.x | Local OLAP / spatial-ish analytical queries | **Keep**; ideal for the current offline research prototype and large local datasets | HIGH |
| Apache Arrow | 21.1.x | Columnar transport/streaming | **Keep**; excellent fit for efficient API-to-client data flow | HIGH |
| @loaders.gl/arrow + @loaders.gl/core | 4.3.x | Arrow ingestion/stream helpers | **Keep** if the Arrow streaming path remains; otherwise simplify | MEDIUM |
| density-clustering | 1.3.x | Spatial clustering / hotspot support | **Keep** if hotspot/STKDE remains a supported analysis feature | MEDIUM |
| Web Workers | Native | Off-main-thread compute | **Keep** and expand; adaptive warp/STKDE should stay off the UI thread | HIGH |
| Comlink | 4.x | Typed worker bridge | **Add**; strong fit for worker API safety and ergonomics | MEDIUM |

### UI System

| Technology | Version / Family | Purpose | Recommendation | Confidence |
|------------|------------------|---------|----------------|------------|
| Radix UI | 1.x / 2.x | Accessible primitives | **Keep**; foundation-level primitives are appropriate for a dashboard app | HIGH |
| shadcn/ui | current registry-based | App component layer | **Keep**; good speed-to-quality tradeoff for an internal prototype | HIGH |
| Tailwind CSS | 4.x | Styling system | **Keep**; fast iteration and easy composition | HIGH |
| class-variance-authority + tailwind-merge + clsx | current | Variant composition | **Keep**; lightweight and predictable | HIGH |
| Sonner | 2.x | Toaster notifications | **Keep**; sufficient for internal UX feedback | HIGH |

### Testing / Quality

| Technology | Version / Family | Purpose | Recommendation | Confidence |
|------------|------------------|---------|----------------|------------|
| Vitest | 4.x | Unit/integration tests | **Keep**; already aligned with the stack | HIGH |
| jsdom | 28.x | DOM test env | **Keep** | HIGH |
| React Testing Library | current | UI behavior tests | **Add**; better for component/interaction coverage than renderer-only tests | MEDIUM |
| Playwright | current | E2E + visual regression | **Add**; needed for the synchronized cube/map/timeline flows | MEDIUM |

## Keep vs Avoid

### Keep

- **Next.js 16 + React 19 + TypeScript**: the current foundation is modern and already matches the app’s modular-monolith shape.
- **Zustand + TanStack Query**: good split between client coordination and server state.
- **Three.js + R3F + MapLibre**: the right combo for custom 3D cube rendering plus a 2D geographic context.
- **DuckDB + Arrow**: best current fit for local analytical workloads and streaming without introducing a heavy backend.
- **Web Workers**: non-negotiable for warp calculations, binning, and hotspot detection.
- **Radix/shadcn/Tailwind**: strong UI velocity without locking into a heavy design system.

### Avoid / Defer

| Avoid | Why | Prefer instead |
|------|-----|----------------|
| Redux / global event buses | Too much ceremony for a visualization prototype; increases coordination complexity | Zustand slices + typed store actions |
| Apollo / GraphQL as a default | Unnecessary overhead for the current internal prototype | TanStack Query + route handlers |
| Prisma-first relational backend | Adds ORM complexity without solving the current local analytics problem | DuckDB + Arrow now; Postgres/PostGIS only if the product becomes multi-user/shared |
| Main-thread data transforms | Causes UI freezes on large datasets | Web Workers + incremental/chunked processing |
| Untyped `CustomEvent` coordination | Hard to trace and easy to break | Typed worker messages or Comlink |
| Deck.gl / Cesium / extra 3D frameworks | They compete with, rather than complement, the custom adaptive cube | Keep Three.js/R3F as the 3D core |
| A second UI kit | Splits styles and component conventions | Stay with shadcn/Radix/Tailwind |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| 3D visualization | Three.js + R3F | deck.gl / Cesium | The product needs custom cube geometry and shader-driven warp behavior, not a generic globe or layer stack |
| Map layer | MapLibre | Google Maps / proprietary maps | Open stack, better fit for customization and research workflows |
| Analytics engine | DuckDB + Arrow | Postgres-only | Postgres is better for shared persistence, but weaker for the current local analytical workflow |
| Client state | Zustand | Redux Toolkit | Redux is stable, but heavier than needed for cross-panel visualization state |
| Server state | TanStack Query | SWR | TanStack Query is better for cache control and invalidation complexity here |

## Strong Opinionated Recommendation

For this product, the best current stack is:

**Next.js 16 + React 19 + TypeScript + Zustand + TanStack Query + Three.js/R3F + MapLibre + DuckDB + Arrow + Web Workers + Radix/shadcn/Tailwind**

That stack should remain the default unless the product crosses one of these thresholds:

1. **Shared multi-user data** → add Postgres/PostGIS and keep DuckDB for local/offline analytics.
2. **Browser-only/offline-first delivery** → evaluate DuckDB-Wasm.
3. **Heavier team scale / stricter validation** → add zod, Comlink, React Testing Library, and Playwright immediately.

## Sources

- Current codebase analysis in `.planning/codebase/STACK.md`
- Current architecture and concerns audit in `.planning/codebase/ARCHITECTURE.md` and `.planning/codebase/CONCERNS.md`
- Project requirements in `.planning/PROJECT.md`
- `package.json` dependency graph in the repository root
