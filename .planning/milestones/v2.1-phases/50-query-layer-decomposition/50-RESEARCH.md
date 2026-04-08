# Phase 50: Query Layer Decomposition - Research

**Researched:** 2026-03-09
**Domain:** DuckDB query-construction refactor for modularity and SQL safety
**Confidence:** HIGH

## Summary

Phase 50 should decompose `src/lib/queries.ts` into focused modules while preserving the current public API surface consumed by routes (`queryCrimesInRange`, `queryCrimeCount`, `queryDensityBins`, `getOrCreateGlobalAdaptiveMaps`). The existing file mixes query assembly, value sanitization, and execution callbacks; this is the main maintainability and safety risk.

DuckDB official docs confirm the current Node client (`duckdb`) supports parameterized execution via `db.all(sql, ...params, callback)` and prepared statements; DuckDB SQL docs also explicitly position prepared statements as a mitigation for SQL injection. OWASP guidance aligns: parameterized queries first, allow-list validation only where binding is impossible (identifiers/order keywords).

Primary plan direction: keep external behavior stable, introduce internal query modules (`filters`, `aggregations`, `sanitization`, `builders`), and move hot-path interpolated values to bound parameters. For unavoidable dynamic SQL fragments (table names, generated placeholder lists, resolution constants), enforce allow-list/clamp sanitization and strict helper boundaries.

**Primary recommendation:** Implement a typed query-fragment builder (`{ sql, params }`) and migrate hot paths to bound parameters first, while leaving `src/lib/queries.ts` as a compatibility facade that re-exports unchanged function signatures.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `duckdb` npm client | `^1.4.4` | Execute SQL in Node runtime | Already used by app; official API supports parameter binding and prepared statements |
| DuckDB SQL prepared statements | Stable docs (2025 docs set) | Parameterize dynamic values (`?`, `$1`, `$name`) | Officially recommended by DuckDB for SQL-injection prevention |
| TypeScript 5.9 | `^5.9.3` | Typed query fragment composition | Existing repo standard; enables safer builder contracts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Existing Vitest test suite | `^4.0.18` | Backward-compatibility and SQL-construction regression coverage | For parity tests on API shape and builder behavior |
| OWASP SQL Injection Prevention guidance | Current cheat sheet | Security control baseline | For defining “parameterize first, allow-list where unavoidable” rules |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Keep `duckdb` Node legacy client in-place only | Migrate to `@duckdb/node-api` (Node Neo) now | Node Neo is the forward path, but migration is a larger API/runtime change than this refactor phase |
| Internal fragment builder utilities | Third-party SQL builder package | Additional dependency and migration surface with little benefit for this scoped decomposition |
| Full interpolation + manual escaping | Parameter binding + allow-list for non-bindable parts | Binding is safer and easier to audit; escaping-only is explicitly discouraged by OWASP |

**Installation:**
```bash
# No new packages required for Phase 50 baseline
```

## Architecture Patterns

### Recommended Project Structure
```
src/lib/
├── queries.ts                 # Backward-compatible facade exports
└── queries/
    ├── index.ts              # Internal re-exports
    ├── types.ts              # QueryFragment and shared query types
    ├── sanitization.ts       # Clamp/allow-list/value normalization
    ├── filters.ts            # WHERE fragments and IN-list helpers
    ├── aggregations.ts       # COUNT/bin/cache query assembly
    └── builders.ts           # Final SQL + params composition per use-case
```

### Pattern 1: Query Fragment Composition
**What:** Build SQL as composable fragments with ordered parameters.
**When to use:** Any query with optional filters or repeated predicate blocks.
**Example:**
```typescript
// Source: DuckDB Node.js API + Prepared Statements docs
// https://duckdb.org/docs/stable/clients/nodejs/overview
// https://duckdb.org/docs/stable/sql/query_syntax/prepared_statements
export type QueryFragment = { sql: string; params: unknown[] };

export const andFragments = (fragments: QueryFragment[]): QueryFragment => ({
  sql: fragments.map((f) => f.sql).join(" AND "),
  params: fragments.flatMap((f) => f.params),
});

export const timeRangeFilter = (startEpoch: number, endEpoch: number): QueryFragment => ({
  sql: 'EXTRACT(EPOCH FROM "Date") >= ? AND EXTRACT(EPOCH FROM "Date") <= ?',
  params: [startEpoch, endEpoch],
});
```

### Pattern 2: Dynamic `IN (...)` via Placeholder Expansion
**What:** Generate placeholders for list filters; bind all values, never interpolate list values.
**When to use:** `crimeTypes`, `districts`, and similar optional arrays.
**Example:**
```typescript
// Source: OWASP SQL Injection Prevention + DuckDB parameterized execution
// https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
// https://duckdb.org/docs/stable/clients/nodejs/overview
const inListFilter = (columnSql: string, values?: string[]): QueryFragment | null => {
  if (!values?.length) return null;
  const placeholders = values.map(() => "?").join(", ");
  return {
    sql: `${columnSql} IN (${placeholders})`,
    params: values,
  };
};
```

### Pattern 3: Sanitization Boundary for Non-bindable SQL Parts
**What:** Use allow-list/clamp helpers for identifier-like or structural SQL parts.
**When to use:** Table names, sort direction, bin resolution constants in generated expressions.
**Example:**
```typescript
// Source: OWASP allow-list guidance for non-bindable query parts
// https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
const TABLE_ALLOWLIST = new Set(["crimes_sorted", "adaptive_global_cache"]);

export const sanitizeTableName = (tableName: string): string => {
  if (!TABLE_ALLOWLIST.has(tableName)) {
    throw new Error(`Unexpected table name: ${tableName}`);
  }
  return tableName;
};

export const clampPositiveInt = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
};
```

### Anti-Patterns to Avoid
- **Monolithic `queries.ts` growth:** makes SQL safety audits and targeted tests hard; split by responsibility.
- **Escaping user strings then interpolating:** fragile and discouraged; use bound parameters.
- **Mixed sanitization locations:** causes inconsistent behavior; centralize in `sanitization.ts`.
- **Changing exported signatures during decomposition:** breaks API routes and tests; keep facade stable.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SQL value escaping | Custom quote-replacement strategy | Parameterized queries (`?`, prepared statements) | Officially safer; avoids edge-case escaping failures |
| Identifier safety | Regex-only ad hoc checks in multiple files | Central allow-list sanitizer helper | Non-bindable parts require strict, auditable validation |
| Optional filter string assembly | Manual `whereClause += ...` chains | Fragment composer + `params` accumulation | Eliminates param-order bugs and duplicated logic |
| Compatibility layer | Wide import rewrites across routes | Keep `src/lib/queries.ts` facade re-exporting modules | Preserves external behavior while internalizing refactor |

**Key insight:** Security and maintainability improve most by standardizing *construction mechanics* (fragments + params + sanitization boundary), not by introducing a new query framework.

## Common Pitfalls

### Pitfall 1: Binding Values but Interpolating Identifiers
**What goes wrong:** Value parameters are safe, but dynamic table/column/order fragments remain injection vectors.
**Why it happens:** SQL identifiers and keywords cannot generally be bound like scalar values.
**How to avoid:** Keep a hard allow-list for identifiers and enum-map for sort/order tokens.
**Warning signs:** Template literals still contain untrusted input in `FROM`, `ORDER BY`, or function/column names.

### Pitfall 2: Placeholder/Parameter Order Drift
**What goes wrong:** Query executes with wrong semantics (e.g., `districts` bound to `crimeTypes` placeholders).
**Why it happens:** Manual concat of SQL and param arrays from multiple branches.
**How to avoid:** Use `QueryFragment` composition utilities that append SQL and params together atomically.
**Warning signs:** Tests pass for single filter but fail when combining optional filters.

### Pitfall 3: Backward-Compatibility Regressions in API Metadata
**What goes wrong:** Route meta fields (`sampleStride`, `sampled`, buffer info) drift despite same rows.
**Why it happens:** Refactor changes default/clamping behavior in options sanitization.
**How to avoid:** Preserve defaulting and clamping contracts in dedicated sanitization helpers and regression tests.
**Warning signs:** `src/app/api/crimes/range/route.test.ts` contract snapshots fail.

### Pitfall 4: Missing Hot-Path Migration Coverage
**What goes wrong:** Some high-traffic queries remain interpolated while low-risk paths were refactored first.
**Why it happens:** Work split by file sections, not by risk/usage.
**How to avoid:** Migrate `queryCrimesInRange` and `queryCrimeCount` first; then cache/density queries.
**Warning signs:** Grep still shows interpolation of `startEpoch/endEpoch/crimeTypes/districts` in hot paths.

## Code Examples

Verified patterns from official sources:

### Parameterized `db.all` Call
```typescript
// Source: https://duckdb.org/docs/stable/clients/nodejs/overview
db.all(
  'SELECT ?::INTEGER AS n, ?::VARCHAR AS label',
  42,
  'safe',
  (err, rows) => {
    if (err) throw err;
    console.log(rows[0]);
  }
);
```

### Prepared Statement Workflow
```typescript
// Source: https://duckdb.org/docs/stable/clients/nodejs/overview
const con = db.connect();
const stmt = con.prepare('SELECT ?::INTEGER AS fortytwo');
stmt.all(42, (err, rows) => {
  if (err) throw err;
  console.log(rows[0].fortytwo);
});
stmt.finalize();
```

### Safe Dynamic Query Rule
```typescript
// Source: OWASP SQL Injection Prevention Cheat Sheet
// https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
// Rule: bind data values; allow-list any SQL structure that cannot be bound.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Interpolated value-heavy SQL assembly | Parameterized query execution with bound values | Established best practice; reaffirmed in current DuckDB + OWASP docs | Reduced injection risk and easier review |
| Monolithic query utility files | Domain-split query modules with typed builders | Current TypeScript backend practice | Better maintainability and targeted testability |
| DuckDB legacy Node client assumed long-term | DuckDB docs flag legacy client deprecated and direct users to Node Neo | DuckDB docs current (2025) | Signals future migration work, but not required for this phase |

**Deprecated/outdated:**
- `duckdb` Node legacy client is marked deprecated by DuckDB docs; continue for this phase but avoid deeper coupling.
- Escaping-only SQL safety strategy is discouraged by OWASP and should not be expanded.

## Open Questions

1. **Should this phase include Node Neo migration?**
   - What we know: DuckDB marks old Node client deprecated and points to `@duckdb/node-api`.
   - What's unclear: Whether roadmap scope permits API migration risk in same phase.
   - Recommendation: Keep migration out-of-scope for Phase 50; create a separate follow-up phase.

2. **Array-vs-variadic parameter passing convention in current binding wrappers**
   - What we know: DuckDB Node docs show variadic `...params`; current codebase uses both no-param and array-param call styles.
   - What's unclear: Team-preferred canonical wrapper style for consistency.
   - Recommendation: Standardize on internal executor helpers that always expose `params: unknown[]` and handle call adaptation in one place.

## Sources

### Primary (HIGH confidence)
- Repository code analysis:
  - `src/lib/queries.ts`
  - `src/lib/db.ts`
  - `src/app/api/crimes/range/route.ts`
  - `src/app/api/crimes/range/route.test.ts`
- DuckDB Node.js API (deprecated) docs: https://duckdb.org/docs/stable/clients/nodejs/overview
- DuckDB Node.js API reference: https://duckdb.org/docs/stable/clients/nodejs/reference
- DuckDB SQL prepared statements docs: https://duckdb.org/docs/stable/sql/query_syntax/prepared_statements

### Secondary (MEDIUM confidence)
- DuckDB Node Neo overview (future-state guidance): https://duckdb.org/docs/stable/clients/node_neo/overview

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Confirmed by repo dependencies and official DuckDB docs
- Architecture: HIGH - Derived from locked phase scope plus current call graph/tests
- Pitfalls: HIGH - Grounded in current code hotspots and OWASP + DuckDB guidance

**Research date:** 2026-03-09
**Valid until:** 30 days (stable backend/query patterns; revisit sooner if DuckDB client migration is started)
