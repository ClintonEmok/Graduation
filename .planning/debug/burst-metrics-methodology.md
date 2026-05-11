# Burst Metrics Methodology

## Scope
This project uses a mixed burst-metrics stack: standard literature metrics provide the statistical primitives, while the app composes them into burst windows, draft bins, and API payloads for the adaptive slicing workflow.

## Literature-backed metrics
- **Temporal burstiness coefficient** — Goh & Barabási (2008)
- **Entropy / Shannon entropy** — Shannon (1948)
- **Spatial entropy** — Batty (1974)
- **Crime spatial-entropy example** — Kalantari et al. (2016)
- **Jensen-Shannon divergence** — Lin (1991)

## Current metric source map
| Metric | Source | Status |
| --- | --- | --- |
| Burstiness coefficient | Literature-backed primitive | Used as a reference statistic for burst timing/variability |
| Entropy / spatial entropy | Literature-backed primitive | Used for dispersion/concentration comparisons |
| Jensen-Shannon divergence | Literature-backed primitive | Used for distribution-shape comparison across windows |
| Burst windows, thresholds, rankings, draft bins | In-code composition | Project-specific logic built from the primitives above |

## Custom in-code composition
- `src/lib/burst-detection.ts` — core burst scoring, ranking, and window composition logic.
- `src/components/dashboard-demo/lib/demo-burst-generation.ts` — demo-specific burst-window-to-draft-bin assembly.
- `src/app/api/adaptive/bursts/route.ts` — API layer that exposes burst outputs to the UI.

## Notes
The implementation should be read as a composition layer: it borrows established statistical ideas, but the exact burst pipeline, parameterization, and selection handling are project-specific.

## References
- Goh, K.-I., & Barabási, A.-L. (2008). *Burstiness and memory in complex systems*.
- Shannon, C. E. (1948). *A Mathematical Theory of Communication*.
- Batty, M. (1974). *Spatial entropy*.
- Kalantari, M. et al. (2016). Crime spatial-analysis / spatial entropy example.
- Lin, J. (1991). *Divergence measures based on the Shannon entropy*.
