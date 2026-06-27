# Evaluation Notes

## Question

Can burstiness be evaluated together with CV as a third metric?

## Short Answer

Yes.

Use burstiness, CV, and density together, but keep CV inside the same bin being evaluated.

## What The Experiment Showed

The combined burstiness + CV experiment ranked 15 showcase windows from `scripts/output/showcase_windows.csv`.

Top signals from the Python sweep:

- Density-only winner: `90d #1`
- Burstiness-only winner: `30d #4`
- Burstiness + CV winner: `14d #1`

That means the combined metric is not just a restatement of burstiness or density. It can pick a different window.

## How To Read CV

CV is resolution-dependent.

- daily bin -> CV over the daily series inside that window
- weekly bin -> CV over the weekly series inside that window
- hourly detail -> CV over the hourly series inside that day

Do not mix resolutions. If the adaptive decision is about a day, use within-day CV. If it is about a week, use within-week CV.

## Practical Eval Story

For the thesis or evaluation section, use 2-3 windows:

- high burst / high CV
- high burst / low CV
- flat control

Pair those with the burstiness + CV ranking figure and the density/burstiness comparison figure.

## Takeaway

Burstiness is useful, but not enough on its own in this dataset.
CV helps explain how uneven the chosen bin is, as long as it is computed at the same scale as the decision being evaluated.
