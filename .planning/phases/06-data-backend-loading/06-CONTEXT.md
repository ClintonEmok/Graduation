# Phase 6: Data Backend & Loading - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the backend infrastructure to serve the real Chicago crime dataset to the visualization. This involves efficient data storage, API endpoints in Next.js, and a loading strategy that handles the full historical dataset (millions of points) without freezing the browser.

</domain>

<decisions>
## Implementation Decisions

### Backend Tech Stack
- **Next.js API Routes (Node.js)**: Keep the stack unified (TypeScript) rather than introducing Python/FastAPI.
- Processing happens within the Next.js server environment.

### Data Storage & Access
- **DuckDB (Embedded in Node)**: Use DuckDB to query the large "Full Historical" dataset (likely CSV or Parquet) efficiently in-process.
- *Reasoning:* DuckDB is optimized for analytical queries on large local files and fits perfectly in a Node/Next.js environment without managing a separate database server.

### Handling Scale (Full Historical)
- **Dataset Scope**: The system must support the full historical record (millions of points).
- **Hybrid Processing**: The server will handle the heavy lifting (reading/filtering millions of rows via DuckDB) and send manageable chunks to the client.

### Loading UX
- **Progressive Streaming**: Data should "pop in" in chunks as it arrives.
- The interface should remain responsive; don't block interaction while waiting for the entire dataset.

### OpenCode's Discretion
- **API Response Format**: Binary (buffers) vs Compact JSON. (Likely compact arrays `[x,y,z,t]` or buffers for performance).
- **Visualization Strategy**: How to handle the rendering limit (LOD, binning, or hard caps) when "Full Historical" is requested.
- **Aggregation Logic**: Whether to aggregate on server vs client for the specific adaptive algorithm.

</decisions>

<specifics>
## Specific Ideas

- "Progressive stream" preferred for loading—users see data appearing immediately rather than staring at a spinner for 30 seconds.

</specifics>

<deferred>
## Deferred Ideas

- Live data feed (Real-time API integration) — this phase focuses on the static historical dataset.
- Database write operations (User editing crimes) — Read-only for now.
- Advanced filtering (Phase 7) — This phase is just about *loading* the data; complex slicing comes next.

</deferred>

---

*Phase: 06-data-backend-loading*
*Context gathered: 2026-01-31*
