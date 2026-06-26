# Spatial Formula Experiment

Compare burst-detection outputs across spatial formulas (`ann`, `entropy`, `js-divergence`, `balanced`).

## Inputs

The Python script expects one JSON file per formula, exported from the adaptive burst endpoint or a saved experiment run.

Expected shape:

```json
{
  "targetSliceCount": 24,
  "bins": [
    {
      "startEpoch": 0,
      "endEpoch": 10,
      "temporalB": 0.42,
      "spatialB": 0.31,
      "combinedB": 0.365
    }
  ]
}
```

## Run

```bash
python scripts/spatial-formula-experiment/compare_spatial_formulas.py \
  --input balanced=./outputs/balanced.json \
  --input entropy=./outputs/entropy.json \
  --input js=./outputs/js-divergence.json \
  --input ann=./outputs/ann.json
```

## Output

The script reports:

- per-formula summary stats
- pairwise mean absolute delta in `combinedB`
- rank agreement between formulas
- slice-allocation differences using the same proportional allocator as the app
