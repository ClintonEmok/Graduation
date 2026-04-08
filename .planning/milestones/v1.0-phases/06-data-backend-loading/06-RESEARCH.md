# Phase 6: Data Backend & Loading - Research

**Researched:** 2026-01-31
**Domain:** Backend Data Engineering & Visualization Performance
**Confidence:** HIGH

## Summary

This phase focuses on building a high-performance data pipeline to serve the full Chicago crime dataset (millions of records). The research confirms that the optimal architecture combines **Next.js API Routes** with **DuckDB** (running in-process) to stream data in **Apache Arrow IPC** format directly to the client.

This "Zero-Copy" approach avoids the heavy CPU cost of JSON serialization/parsing. By streaming Arrow batches, the frontend can render data progressively (chunks appearing as they arrive) without freezing the main thread, solving the loading UX requirement.

**Primary recommendation:** Use DuckDB's `arrowStream` in a Node.js API route to pipe binary data directly to a frontend `RecordBatchReader`, rendering with Deck.gl's binary mode.

## Standard Stack

The established libraries for high-performance data streaming in Next.js:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `duckdb` | ^1.0.0 | Embedded OLAP Database | Native support for Parquet & Arrow; runs in-process (no separate DB server). |
| `apache-arrow` | ^18.0.0 | Data Interchange Format | Standard for zero-copy binary transfer; avoids JSON overhead. |
| `@loaders.gl/arrow` | ^4.0.0 | Deck.gl Integration | Efficiently loads Arrow tables into Deck.gl layers. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `aws-sdk/client-s3` | v3 | Data Storage | If storing the Parquet file on S3/R2 (recommended for large files). |
| `swr` | ^2.0.0 | Data Fetching | Handling the request lifecycle (though custom streaming fetch logic is likely needed). |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `duckdb` (Node) | `duckdb-wasm` | Wasm is slower for massive datasets and has memory limits, but runs on Edge/Browser. Node.js runtime is preferred for the "Backend" requirement. |
| Arrow IPC | JSON | JSON is 5-10x larger and requires expensive CPU parsing (blocking the UI). |
| Streaming | Pagination | Pagination introduces "pop-in" stutter; Streaming is smoother but requires careful connection handling. |

**Installation:**
```bash
npm install duckdb apache-arrow @loaders.gl/arrow @loaders.gl/core
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   └── api/
│       └── crime/
│           └── stream/
│               └── route.ts   # Streaming API Endpoint
├── lib/
│   └── db.ts                  # Singleton DuckDB connection
└── components/
    └── map/
        └── layers/
            └── CrimeLayer.tsx # Consumes stream
```

### Pattern 1: Streaming Arrow from Next.js
**What:** Piping a DuckDB query directly to the HTTP response as an Arrow stream.
**When to use:** Serving >10k rows of data where JSON serialization becomes a bottleneck.
**Example:**
```typescript
// app/api/crime/stream/route.ts
import { Database } from 'duckdb';
import { NextRequest } from 'next/server';

// Constraint: Must use Node.js runtime (Native DuckDB doesn't work on Edge)
export const runtime = 'nodejs'; 

const db = new Database(':memory:'); // Or persistent path

export async function GET(req: NextRequest) {
  // 1. Initialize & Query
  const connection = db.connect();
  
  // arrowStream returns an async iterator of IPC buffers
  const arrowStream = connection.arrowStream('SELECT * FROM "data.parquet"');
  
  // 2. Wrap in Web Standard ReadableStream
  const stream = new ReadableStream({
    async start(controller) {
      for await (const batch of arrowStream) {
        controller.enqueue(batch); // 'batch' is Uint8Array
      }
      controller.close();
    },
    cancel() {
      // Cleanup
    }
  });

  // 3. Return Response with correct headers
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/vnd.apache.arrow.stream',
      'Transfer-Encoding': 'chunked' // Hints progressive loading
    }
  });
}
```

### Pattern 2: Progressive Client-Side Consumption
**What:** Reading the stream chunk-by-chunk and updating the map.
**When to use:** To show data immediately instead of waiting 10s for the full download.
**Example:**
```typescript
import { RecordBatchReader } from 'apache-arrow';

async function loadData() {
  const response = await fetch('/api/crime/stream');
  
  // Create reader from the response stream
  const reader = await RecordBatchReader.from(response.body);
  
  // Loop through batches as they arrive from the network
  for await (const batch of reader) {
    // 'batch' is a RecordBatch (subset of rows)
    // Update state to trigger re-render
    addDataBatchToMap(batch); 
  }
}
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Binary Protocol | Custom Byte Format | Apache Arrow | Arrow is industry standard, widely supported, and zero-copy compatible with Deck.gl. |
| Parquet Parsing | `parquetjs` | `duckdb` SQL | DuckDB's C++ Parquet reader is orders of magnitude faster than JS implementations. |
| CSV Parsing | `papaparse` (on server) | `duckdb` SQL | `read_csv_auto` in DuckDB is multi-threaded and incredibly fast. |

## Common Pitfalls

### Pitfall 1: Vercel/Next.js Bundling
**What goes wrong:** Build fails with `Module not found: Can't resolve ... duckdb.node`.
**Why it happens:** Next.js Webpack bundler tries to bundle the C++ binary, which fails.
**How to avoid:** Add `duckdb` to `serverComponentsExternalPackages` in `next.config.mjs`.
```javascript
// next.config.mjs
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['duckdb'],
  },
};
export default nextConfig;
```

### Pitfall 2: Serverless Timeouts
**What goes wrong:** Loading 8M rows takes >10s, triggering Vercel's default timeout.
**Why it happens:** Serverless functions are ephemeral and have strict execution limits.
**How to avoid:**
1. Use `read_parquet` (fastest read).
2. Host the `.parquet` file on S3/R2 (avoid git LFS download time in lambda).
3. If necessary, paginate requests by year (`?year=2020`) instead of one giant stream.

### Pitfall 3: Browser Memory Exhaustion
**What goes wrong:** Storing 8M raw JS objects (`[{x:1, y:2}, ...]`) crashes the tab.
**Why it happens:** JS objects have massive overhead (properties, prototypes).
**How to avoid:** Keep data in **Arrow Tables** or **TypedArrays** (binary) throughout the pipeline. Never convert to `JSON.parse` style objects for the full dataset.

## Data Storage Strategy

For the "Full Historical" dataset:

1.  **Format:** Convert CSV to **Parquet** (zstd compressed). It is 10x smaller and faster to query.
2.  **Location:**
    *   **Dev:** Local file in `public/` or `data/`.
    *   **Prod:** Remote URL (S3/R2/CloudFront).
3.  **Access:** Use DuckDB's `httpfs` extension to read directly from URL.
    ```sql
    INSTALL httpfs;
    LOAD httpfs;
    SELECT * FROM read_parquet('https://bucket.com/crime.parquet');
    ```

## Open Questions

1.  **Rendering Limits:**
    *   **Status:** Deck.gl can handle ~2-5M points. 8M might be sluggish on low-end devices.
    *   **Recommendation:** Implement the streaming loader first. If performance is poor, Phase 7 (Filtering) will naturally solve it by allowing users to slice the data.
    *   **Fallback:** If needed, add a `SAMPLE 50%` clause in DuckDB for mobile users.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - DuckDB+Arrow is the gold standard.
- Architecture: HIGH - Next.js Streams are stable.
- Pitfalls: HIGH - Vercel native module issues are well documented.

**Research date:** 2026-01-31
