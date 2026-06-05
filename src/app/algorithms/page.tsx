import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = {
  title: "Algorithms | Quiet Tiger",
  description: "Time and space complexity analysis for all algorithms in the adaptive space-time cube prototype.",
};

interface AlgorithmEntry {
  name: string;
  file: string;
  complexity: string;
  space: string;
  improvement: string;
  priority: "high" | "medium" | "low";
}

interface AlgorithmCategory {
  id: string;
  title: string;
  description: string;
  algorithms: AlgorithmEntry[];
}

const categories: AlgorithmCategory[] = [
  {
    id: "stkde",
    title: "STKDE (Space-Time Kernel Density Estimation)",
    description: "Hotspot detection and heatmap surface computation. The core spatial analytics pipeline.",
    algorithms: [
      {
        name: "computeStkdeFromCrimes",
        file: "src/lib/stkde/compute.ts",
        complexity: "O(N + R·C·k² + R·C·Nₜₛ log Nₜₛ)",
        space: "O(R·C + Nₜₛ)", // grid + cell timestamps
        improvement: "Gaussian kernel is iterating all neighbors per cell (R·C·k²). Use separable Gaussian (2×O(R·C·k)) or FFT convolution. Peak window is recomputed per cell; precompute once per unique timestamp set.",
        priority: "high",
      },
      {
        name: "computeStkdeFromAggregates",
        file: "src/lib/stkde/compute.ts",
        complexity: "O(R·C·k² + C·B log B)",
        space: "O(R·C + B·C)",
        improvement: "Same kernel optimization applies. Bucket-based peak window sorts per cell; use prefix-sum sliding window to avoid per-cell sort.",
        priority: "high",
      },
      {
        name: "buildIntensityFromSupport",
        file: "src/lib/stkde/compute.ts",
        complexity: "O(R·C·k²)",
        space: "O(R·C)",
        improvement: "Gaussian blurs are separable. Decompose into row pass O(R·C·k) + column pass O(R·C·k). For large grids, use WebGL or WASM convolution.",
        priority: "high",
      },
      {
        name: "computePeakWindow",
        file: "src/lib/stkde/compute.ts",
        complexity: "O(N log N)",
        space: "O(N)",
        improvement: "Sort dominates. If timestamps arrive pre-sorted from DuckDB, skip the sort. Inline sort with TypedArray for speed.",
        priority: "medium",
      },
      {
        name: "computePeakWindowFromBuckets",
        file: "src/lib/stkde/compute.ts",
        complexity: "O(B log B)",
        space: "O(B)",
        improvement: "Same sort-avoidance if DuckDB returns ordered buckets. Use two-pointer without sort when data is sequential.",
        priority: "low",
      },
      {
        name: "applyResponsePayloadGuard",
        file: "src/lib/stkde/compute.ts",
        complexity: "O(M log M + k·M)",
        space: "O(M)",
        improvement: "M = heatmap cells. Sorts full cell array then iteratively truncates. Use a heap/priority queue to track top-k by intensity without full sort.",
        priority: "low",
      },
      {
        name: "buildFullPopulationStkdeInputs",
        file: "src/lib/stkde/full-population-pipeline.ts",
        complexity: "O(S + C·chunks)",
        space: "O(R·C + B·C)",
        improvement: "S = scanned rows. Aggregation is pushed to DuckDB (efficient). Bottleneck is chunked fetching — tune chunkSize dynamically. Add LIMIT pushdown in SQL.",
        priority: "medium",
      },
    ],
  },
  {
    id: "kde",
    title: "2D KDE (Kernel Density Estimation)",
    description: "Slice-level 2D density estimation for the cube view.",
    algorithms: [
      {
        name: "computeSliceKde",
        file: "src/lib/kde/compute-slice-kde.ts",
        complexity: "O(N + G²·k²)",
        space: "O(G²)",
        improvement: "G = grid size (default ~40). Same optimization as STKDE: separable Gaussian reduces from G²·k² to 2·G²·k. Use the 3σ truncation already in place — good.",
        priority: "medium",
      },
    ],
  },
  {
    id: "binning",
    title: "Dynamic Binning Engine",
    description: "Time bin generation with multiple strategies for adaptive time scaling.",
    algorithms: [
      {
        name: "generateIntervalBins (hourly/daily/etc.)",
        file: "src/lib/binning/engine.ts",
        complexity: "O(N)",
        space: "O(U) where U = unique intervals",
        improvement: "Uses Map for grouping — already O(N). No improvement needed. To reduce memory, avoid sorting events within each bin unless required downstream.",
        priority: "low",
      },
      {
        name: "generateBurstinessBins",
        file: "src/lib/binning/engine.ts",
        complexity: "O(N log N)",
        space: "O(N)",
        improvement: "Sort dominates. If crimes arrive pre-sorted by timestamp, use the already-sorted order. Use early exit on gap threshold.",
        priority: "low",
      },
      {
        name: "generateUniformDistributionBins",
        file: "src/lib/binning/engine.ts",
        complexity: "O(N log N)",
        space: "O(N)",
        improvement: "Full sort then chunk. Avoid sort if data is already ordered. Slice-based chunking instead of spread + new array.",
        priority: "low",
      },
      {
        name: "generateAutoAdaptiveBins",
        file: "src/lib/binning/engine.ts",
        complexity: "O(N log N)",
        space: "O(N)",
        improvement: "Computes variance of inter-arrival gaps after sort. Combine sort and scan into single pass. CV calculation loops over gaps twice — merge into one loop.",
        priority: "medium",
      },
      {
        name: "generateCrimeTypeBins",
        file: "src/lib/binning/engine.ts",
        complexity: "O(N + T log T)",
        space: "O(T + N)",
        improvement: "T = unique crime types. Groups by type then sorts each group. Use Map + single pass to avoid per-type sort if order not needed.",
        priority: "low",
      },
      {
        name: "generateMonthlyBins",
        file: "src/lib/binning/engine.ts",
        complexity: "O(N + M log M)",
        space: "O(M + N)",
        improvement: "M = unique months. Sorts by month key string — use integer year*12+month for faster sorting. Pre-allocate Map size.",
        priority: "low",
      },
      {
        name: "mergeSmallBins",
        file: "src/lib/binning/rules.ts",
        complexity: "O(B log B)",
        space: "O(B)",
        improvement: "Sorts bins by count then iteratively merges. Use a min-heap for O(B log B) but with better merge ordering.",
        priority: "low",
      },
    ],
  },
  {
    id: "burst-detection",
    title: "Burst Detection",
    description: "Temporal and spatial burstiness scoring for adaptive slice allocation.",
    algorithms: [
      {
        name: "averageNearestNeighborDistance",
        file: "src/lib/burst-detection.ts",
        complexity: "O(P²)",
        space: "O(1)",
        improvement: "Brute-force O(P²) ANN. Use a spatial index (kd-tree, R-tree) for O(P log P). For 32×32 grid it's tolerable, but at scale this dominates.",
        priority: "high",
      },
      {
        name: "computeAnnScore",
        file: "src/lib/burst-detection.ts",
        complexity: "O(P²) via averageNearestNeighborDistance",
        space: "O(1)",
        improvement: "Same as above — spatial index would reduce complexity by orders of magnitude for large point sets.",
        priority: "high",
      },
      {
        name: "computeSpatialB",
        file: "src/lib/burst-detection.ts",
        complexity: "O(P + G²)",
        space: "O(G²)",
        improvement: "G = 32 (constant). Grid building is O(P + G²). JS divergence recomputes distribution — pass already-built distribution instead.",
        priority: "medium",
      },
      {
        name: "jensenShannonDivergence",
        file: "src/lib/burst-detection.ts",
        complexity: "O(G²)",
        space: "O(1)",
        improvement: "G = 32, constant — negligible. No improvement needed.",
        priority: "low",
      },
      {
        name: "normalizedEntropy",
        file: "src/lib/burst-detection.ts",
        complexity: "O(G²)",
        space: "O(1)",
        improvement: "G = 32, constant — negligible. No improvement needed.",
        priority: "low",
      },
      {
        name: "allocateSlices",
        file: "src/lib/burst-detection.ts",
        complexity: "O(B·K) where K = remaining allocations",
        space: "O(B)",
        improvement: "Greedy allocation re-scans for best candidate each iteration O(B·K). Use a priority queue for O(K log B).",
        priority: "medium",
      },
      {
        name: "compactBurstPartitions",
        file: "src/lib/burst-detection.ts",
        complexity: "O(P)",
        space: "O(P/groupSize)",
        improvement: "Simple grouping — already optimal. Preserves timestamps as-is.",
        priority: "low",
      },
    ],
  },
  {
    id: "adaptive-scaling",
    title: "Adaptive Time Scaling",
    description: "Density-driven time warping for the dual-timeline visualization.",
    algorithms: [
      {
        name: "getAdaptiveScaleConfig / computeAdaptiveY",
        file: "src/lib/adaptive-scale.ts",
        complexity: "O(N + BC)",
        space: "O(BC + N)",
        improvement: "BC = 100 (bin count). Three passes over data (binning, weights, range). Merge binning + weight computation into single pass. TypedArray (Float64Array) already used — good.",
        priority: "medium",
      },
      {
        name: "getAdaptiveScaleConfigColumnar / computeAdaptiveYColumnar",
        file: "src/lib/adaptive-scale.ts",
        complexity: "O(N + BC)",
        space: "O(BC + N)",
        improvement: "Accepts typed arrays directly (good for worker data). Same merge-passes optimization. For very large N, binning could be chunked/parallelized.",
        priority: "low",
      },
    ],
  },
  {
    id: "warp-scaling",
    title: "Warp Scaling (Comparable Warp Map)",
    description: "Normalizes heterogeneous time bins into a comparable warp-weighted domain map.",
    algorithms: [
      {
        name: "scoreComparableWarpBins",
        file: "src/lib/binning/warp-scaling.ts",
        complexity: "O(B)",
        space: "O(B)",
        improvement: "Single pass scoring — already optimal. Validates all bins before scoring; validation could short-circuit.",
        priority: "low",
      },
      {
        name: "buildComparableWarpMap",
        file: "src/lib/binning/warp-scaling.ts",
        complexity: "O(B)",
        space: "O(B)",
        improvement: "Linear pass building boundaries. Already optimal. Normalization step is O(B). Considers minimum width share constraint — good for preventing degenerate bins.",
        priority: "low",
      },
    ],
  },
  {
    id: "clustering",
    title: "Cluster Analysis (DBSCAN)",
    description: "Hotspot clustering in the spatiotemporal cube space.",
    algorithms: [
      {
        name: "analyzeClusters",
        file: "src/lib/clustering/cluster-analysis.ts",
        complexity: "O(P²) worst-case (DBSCAN)",
        space: "O(P)",
        improvement: "DBSCAN has O(P²) worst case with naive implementation. Use KD-tree indexed DBSCAN for O(P log P). The density-clustering library does not support indexes. Consider switching to a library with spatial index support (e.g., sklearn via WASM).",
        priority: "high",
      },
    ],
  },
  {
    id: "confidence",
    title: "Confidence Scoring",
    description: "Calculates confidence scores (0-100) for suggestions and boundary detection.",
    algorithms: [
      {
        name: "calculateDataClarity",
        file: "src/lib/confidence-scoring.ts",
        complexity: "O(N + BC)",
        space: "O(BC)",
        improvement: "BC = adaptive (10-100). Single pass bins then variance computation. Could compute running variance online instead of storing all bins.",
        priority: "low",
      },
      {
        name: "calculateCoverage",
        file: "src/lib/confidence-scoring.ts",
        complexity: "O(N + BC log BC)",
        space: "O(BC)",
        improvement: "Sorts bins for Gini coefficient. Gini can be computed without full sort using prefix-sum approach. Also iterates crimes twice (span + bins) — merge into one pass.",
        priority: "medium",
      },
      {
        name: "calculateStatisticalConfidence",
        file: "src/lib/confidence-scoring.ts",
        complexity: "O(BC)",
        space: "O(BC)",
        improvement: "Single-pass with minor extra arrays. Already efficient. No improvement needed.",
        priority: "low",
      },
      {
        name: "calculateConfidence",
        file: "src/lib/confidence-scoring.ts",
        complexity: "O(N + BC log BC)",
        space: "O(BC)",
        improvement: "Composite function re-bins if densityBins not provided. Downstream calls could pre-compute and pass bins to avoid redundant binning. Merge with interval-detection's binning step.",
        priority: "medium",
      },
    ],
  },
  {
    id: "interval-detection",
    title: "Interval Boundary Detection",
    description: "Natural breakpoint detection in crime density data using peak/change-point/rule-based methods.",
    algorithms: [
      {
        name: "detectBoundaries",
        file: "src/lib/interval-detection.ts",
        complexity: "O(N + BC·W + BC log BC)",
        space: "O(BC)",
        improvement: "W = window size. Binning pass + detection method + potential fallback merge. Merge crime binning with confidence scoring's binning. De-duplicate boundary merge could use Set instead of linear scan.",
        priority: "medium",
      },
      {
        name: "detectPeaks",
        file: "src/lib/interval-detection.ts",
        complexity: "O(BC)",
        space: "O(1)",
        improvement: "Single pass local maxima detection. Already optimal. Threshold logic is clear.",
        priority: "low",
      },
      {
        name: "detectChangePoints",
        file: "src/lib/interval-detection.ts",
        complexity: "O(BC·W)",
        space: "O(W)",
        improvement: "Sliding window slice O(W) per position. Use incremental mean update (add new, remove old) for O(BC) instead of O(BC·W). Currently re-slices and sums each window.",
        priority: "high",
      },
    ],
  },
  {
    id: "warp-generation",
    title: "Warp Profile Generation",
    description: "Generates warp profile suggestions with different emphasis levels (aggressive/balanced/conservative).",
    algorithms: [
      {
        name: "analyzeDensity",
        file: "src/lib/warp-generation.ts",
        complexity: "O(N + BC)",
        space: "O(BC)",
        improvement: "Two passes (min/max + binning). Merge into single pass. Top/bottom 10% selection via full sort — use quickselect (O(BC)) instead of sort (O(BC log BC)).",
        priority: "medium",
      },
      {
        name: "detectEvents",
        file: "src/lib/warp-generation.ts",
        complexity: "O(BC·W)",
        space: "O(W)",
        improvement: "Same incremental mean optimization as detectChangePoints. Currently O(BC·W) due to slice() in each iteration.",
        priority: "high",
      },
      {
        name: "generateIntervals",
        file: "src/lib/warp-generation.ts",
        complexity: "O(BC·I)",
        space: "O(I)",
        improvement: "I = interval count (small, 3-12). Inner loop sums density per interval. Compute prefix sums of density for O(1) interval sums instead of O(BC·I).",
        priority: "medium",
      },
      {
        name: "generateWarpProfiles",
        file: "src/lib/warp-generation.ts",
        complexity: "O(N + BC·W + BC log BC)",
        space: "O(BC)",
        improvement: "Composition of density analysis + event detection + interval generation. Overall dominated by detectEvents. Same incremental window optimization applies.",
        priority: "medium",
      },
    ],
  },
  {
    id: "orchestrator",
    title: "Full Auto Orchestrator",
    description: "Generates and ranks auto-proposal sets for adaptive time slicing.",
    algorithms: [
      {
        name: "generateRankedAutoProposalSets",
        file: "src/lib/full-auto-orchestrator.ts",
        complexity: "O(N + BC·W + BC log BC + W·log W)",
        space: "O(BC + W)",
        improvement: "Mostly delegates to warp generation and interval detection. Ranking is O(W log W) — small. Orchestration overhead is negligible.",
        priority: "low",
      },
      {
        name: "hasOverlappingIntervals / scoreOverlapMinimization",
        file: "src/lib/full-auto-orchestrator.ts",
        complexity: "O(I log I)",
        space: "O(I)",
        improvement: "I = intervals (3-12). Already efficient. Duplicated logic between the two functions — could share a single sorted pass.",
        priority: "low",
      },
    ],
  },
  {
    id: "context-diag",
    title: "Context Diagnostics",
    description: "Temporal summary and diagnostics for crime data context.",
    algorithms: [
      {
        name: "buildTemporalSummary",
        file: "src/lib/context-diagnostics/temporal.ts",
        complexity: "O(N log N)",
        space: "O(N)",
        improvement: "Full sort of timestamps. Use quickselect for median-like summaries if full order not needed. Sliding window for dominant interval is O(N) — good.",
        priority: "low",
      },
      {
        name: "findDominantWindow",
        file: "src/lib/context-diagnostics/temporal.ts",
        complexity: "O(N)",
        space: "O(1)",
        improvement: "Sliding window — already O(N). Handles tie-breaking correctly. No improvement needed.",
        priority: "low",
      },
    ],
  },
  {
    id: "aggregation",
    title: "Stats Aggregation & Downsample",
    description: "Statistical summaries and point cloud reduction utilities.",
    algorithms: [
      {
        name: "aggregateStats / aggregateBy*",
        file: "src/lib/stats/aggregation.ts",
        complexity: "O(N × K) where K = number of aggregations (4)",
        space: "O(N)",
        improvement: "Currently iterates crimes separately for each aggregation (hour, day, month, district, type). Merge into single pass computing all aggregations simultaneously (O(N)).",
        priority: "high",
      },
      {
        name: "downsampleArray / downsampleByStride",
        file: "src/lib/downsample.ts",
        complexity: "O(N)",
        space: "O(newLen)",
        improvement: "Stride-based — already O(N). No improvement needed. For better quality, consider reservoir sampling or LTTB (Largest Triangle Three Buckets) for visual fidelity.",
        priority: "low",
      },
    ],
  },
  {
    id: "slice-utils",
    title: "Slice Utilities & Evolution Model",
    description: "Range matching, tolerance comparison, burst evolution graph construction.",
    algorithms: [
      {
        name: "buildBurstEvolutionModel",
        file: "src/lib/stkde/burst-evolution.ts",
        complexity: "O(S·W + C·W·M)",
        space: "O(S + C)",
        improvement: "S = slices, W = windows, C = connectors. Overlap check is O(S·W). Use interval tree or sorted endpoints for O((S+W) log(S+W)) overlap queries.",
        priority: "medium",
      },
      {
        name: "compareAdjacentSlices",
        file: "src/lib/stkde/adjacent-slice-comparison.ts",
        complexity: "O(T + D)",
        space: "O(T + D)",
        improvement: "T = types, D = districts. Linear comparisons on small sets (tens of types/districts). Already efficient.",
        priority: "low",
      },
    ],
  },
];

function ComplexityBadge({ complexity }: { complexity: string }) {
  const isHigh = complexity.includes("P²") || complexity.includes("N²") || complexity.includes("k²");
  return (
    <Badge variant={isHigh ? "destructive" : "secondary"} className="font-mono text-xs shrink-0">
      {complexity}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { label: string; variant: "destructive" | "secondary" | "default" }> = {
    high: { label: "Improve first", variant: "destructive" },
    medium: { label: "Consider", variant: "default" },
    low: { label: "Minor", variant: "secondary" },
  };
  const { label, variant } = map[priority] ?? { label: "Minor", variant: "secondary" };
  return <Badge variant={variant}>{label}</Badge>;
}

export default function AlgorithmsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/docs">Docs</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Algorithms</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-3xl font-bold mt-2">Algorithm Reference</h1>
          <p className="text-muted-foreground mt-1">
            Time and space complexity analysis for every algorithm in the prototype.
            <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">{categories.reduce((s, c) => s + c.algorithms.length, 0)} algorithms</span>
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <Tabs defaultValue={categories[0]?.id} className="space-y-6">
          <div className="sticky top-0 bg-background z-10 pb-2 -mx-2 px-2 overflow-x-auto">
            <TabsList className="w-full justify-start">
              {categories.map((cat) => (
                <TabsTrigger key={cat.id} value={cat.id} className="whitespace-nowrap text-xs">
                  {cat.title.length > 24 ? cat.title.slice(0, 22) + "..." : cat.title}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {categories.map((cat) => {
            const highCount = cat.algorithms.filter((a) => a.priority === "high").length;
            return (
              <TabsContent key={cat.id} value={cat.id} className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold">{cat.title}</h2>
                  <p className="text-sm text-muted-foreground">{cat.description}</p>
                  {highCount > 0 && (
                    <p className="text-xs text-destructive mt-1">
                      {highCount} algorithm{highCount > 1 ? "s" : ""} flagged for immediate improvement.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  {cat.algorithms.map((algo, i) => (
                    <Card key={i} className={algo.priority === "high" ? "border-destructive/30" : ""}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <CardTitle className="text-base font-mono text-sm">{algo.name}</CardTitle>
                            <CardDescription className="font-mono text-xs mt-0.5">{algo.file}</CardDescription>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <ComplexityBadge complexity={algo.complexity} />
                            <PriorityBadge priority={algo.priority} />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid sm:grid-cols-3 gap-3 text-xs">
                          <div>
                            <span className="font-medium text-muted-foreground">Time:</span>
                            <span className="ml-1 font-mono">{algo.complexity}</span>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Space:</span>
                            <span className="ml-1 font-mono">{algo.space}</span>
                          </div>
                          <div className="sm:col-span-3">
                            <span className="font-medium text-muted-foreground">Improvement:</span>
                            <span className="ml-1">{algo.improvement}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>

        <Separator className="my-10" />

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Priority Summary</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="text-destructive text-base">High Priority</CardTitle>
                <CardDescription>Quadratic or improvable bottlenecks</CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                {categories
                  .flatMap((c) => c.algorithms.filter((a) => a.priority === "high"))
                  .map((a) => (
                    <p key={a.name} className="font-mono text-xs">{a.name}</p>
                  ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Medium Priority</CardTitle>
                <CardDescription>Worth optimizing when nearby</CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                {categories
                  .flatMap((c) => c.algorithms.filter((a) => a.priority === "medium"))
                  .map((a) => (
                    <p key={a.name} className="font-mono text-xs">{a.name}</p>
                  ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Low Priority</CardTitle>
                <CardDescription>Already efficient or constant-time</CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                {categories
                  .flatMap((c) => c.algorithms.filter((a) => a.priority === "low"))
                  .map((a) => (
                    <p key={a.name} className="font-mono text-xs">{a.name}</p>
                  ))}
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
