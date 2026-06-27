# Burst Metrics Methodology

## Scope
This project uses standard statistical primitives and then composes them into app-specific burst windows, draft bins, and API payloads. The burstiness signal is the primary input to adaptive temporal scaling (see `TEMPORAL_SCALING_CHARACTERIZATION.md`), and density is used only for visualisation (density strip, count summary).

## Metric Sources

### Temporal burstiness
- Goh, K.-I., & Barabasi, A.-L. (2008). *Burstiness and memory in complex systems*. *EPL (Europhysics Letters)*, 81(4), 48002. https://doi.org/10.1209/0295-5075/81/48002
- Source of the inter-event coefficient `B = (sigma - mu) / (sigma + mu)` used in the detect flow.

### Entropy and spatial entropy
- Shannon, C. E. (1948). *A Mathematical Theory of Communication*. *Bell System Technical Journal*, 27(3), 379-423. https://doi.org/10.1002/j.1538-7305.1948.tb01338.x
- Batty, M. (1974). *Spatial Entropy*. *Geographical Analysis*, 6(1), 1-31. https://doi.org/10.1111/j.1538-4632.1974.tb01014.x
- Kalantari, M., Ghavagh, A. R., Toomanian, A., & Dero, Q. Y. (2016). *A New Methodological Framework for Crime Spatial Analysis Using Local Entropy Map*. *Modern Applied Science*, 10(9), 179. https://doi.org/10.5539/mas.v10n9p179

### Jensen-Shannon divergence
- Lin, J. (1991). *Divergence measures based on the Shannon entropy*. *IEEE Transactions on Information Theory*, 37(1), 145-151. https://doi.org/10.1109/18.61115

## What Is Custom
- `computeSpatialBBinned()` supports selectable spatial formulas: ANN, entropy, JS divergence, and the balanced composite.
- The balanced default combines entropy-based concentration with Jensen-Shannon divergence as `clamp01(concentration * (0.25 + 0.75 * surprise))` so low-divergence bins still retain a stable floor.
- `combinedB` in the API is a project-specific weighting of temporal and spatial scores.
- Burst ranking, thresholds, and slice allocation are app logic, not borrowed directly from a single paper.

## Code Map
- `src/components/dashboard-demo/lib/demo-burst-generation.ts` - local draft-bin burst scoring.
- `src/lib/burst-detection.ts` - shared burst scoring helpers and spatial metric.
- `src/app/api/adaptive/bursts/route.ts` - API composition of temporal and spatial burst scores.

## Summary
The temporal coefficient is literature-backed, the spatial ingredients are literature-backed, and the final burst pipeline is a project-specific composition of those pieces.
