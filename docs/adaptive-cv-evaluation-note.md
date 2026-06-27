# Adaptive CV Evaluation Note

## Question

When adaptive scaling uses `CV` as a factor, should it be computed inside the same bin being evaluated?

## Answer

Yes.

`CV` should stay inside the bin it is describing:

- daily bin -> compute CV from the daily series inside that window
- weekly bin -> compute CV from the weekly series inside that window
- hourly detail -> compute CV from the hourly series inside that day

Do not mix resolutions. A CV computed over a larger or different aggregation is not describing the same adaptive unit.

## Why This Matters

Adaptive scaling is trying to measure local unevenness.

If the scaling factor is based on a daily bin, then the factor should reflect the spread of the values inside that day-scale view, not the spread of a broader window.

That keeps the metric aligned with what the user is actually seeing.

## Experiment Takeaway

Using the repo's crime-data scripts and sampled windows, the same window can look stable or spiky depending on the binning level.

Examples from the sampled windows:

- `2020-05-25 -> 2020-06-21`: burstier, with higher day-to-day unevenness
- `2020-05-04 -> 2020-05-31`: flatter, with lower day-to-day unevenness
- `2012-08-06 -> 2013-05-09`: similar burst score central tendency, but much smoother at weekly granularity

That supports the rule that CV is only meaningful when it is tied to the same binning level as the adaptive decision.

CSV check on adjacent May 2020 weeks:

- `2020-05-18 -> 2020-05-24`: daily CV `0.060543`, mean within-day hourly CV `0.419190`
- `2020-05-25 -> 2020-05-31`: daily CV `0.555217`, mean within-day hourly CV `0.449374`

The week-level daily CV separates the two windows much more clearly than the within-day hourly CV average, which is exactly why CV should be computed at the same resolution as the bin being evaluated.

## Recommendation For Eval

Use CV as a companion metric, not the only signal.

- burst score: captures timing regularity
- CV: captures count unevenness inside the chosen bin
- Gini or top-share: optional tie-break / concentration check

If the eval is about a day, use within-day CV.
If the eval is about a week, use within-week CV.

## Burstiness + CV

For the burstiness-vs-density experiment, the clean upgrade is:

- density: raw event volume
- burstiness: inter-arrival clustering
- CV: within-bin unevenness of the count series

That gives you one metric for volume, one for temporal clustering, and one for spread inside the same bin.

In practice, this is most useful as a three-way readout, not as three competing replacements for each other.
