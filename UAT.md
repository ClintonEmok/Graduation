
## Gaps
- **Temporal Distance Logic:** The "small temporal distance" for slice highlighting is hardcoded to `1.0` (approx 1% of vertical range) in `src/components/viz/shaders/ghosting.ts`. It is not currently configurable or exposed to the user, leading to confusion about how it is calculated.
