export const DEMO_PRESET_BIAS_KEYS = [
  'hourly',
  'daily',
  'weekly',
  'monthly',
  'weekday-weekend',
  'morning-afternoon-evening-night',
  'business-hours',
  'custom',
] as const;

export type DemoPresetBiasKey = (typeof DEMO_PRESET_BIAS_KEYS)[number];

export type DemoPresetGenerationProfile = {
  minBins: number;
  maxBins: number;
};

export const PRESET_BIAS_RANGE = {
  min: 0,
  max: 100,
  step: 5,
} as const;

type PresetBiasHelper = {
  label: string;
  helperText: string;
  recommendedBias: number;
};

export const PRESET_BIAS_HELPERS: Record<DemoPresetBiasKey, PresetBiasHelper> = {
  hourly: {
    label: 'Hour-by-hour',
    helperText: 'Keeps small hourly shifts visible.',
    recommendedBias: 55,
  },
  daily: {
    label: 'Day parts',
    helperText: 'Balances morning, afternoon, and night activity.',
    recommendedBias: 60,
  },
  weekly: {
    label: 'Week rhythm',
    helperText: 'Highlights weekly momentum without overfitting weekends.',
    recommendedBias: 65,
  },
  monthly: {
    label: 'Month blocks',
    helperText: 'Keeps longer windows broad and stable.',
    recommendedBias: 50,
  },
  'weekday-weekend': {
    label: 'Weekday vs weekend',
    helperText: 'Emphasizes demand differences across workdays and weekends.',
    recommendedBias: 70,
  },
  'morning-afternoon-evening-night': {
    label: 'Four-day phases',
    helperText: 'Tracks handoffs across morning, afternoon, evening, and night.',
    recommendedBias: 60,
  },
  'business-hours': {
    label: 'Business-hour focus',
    helperText: 'Weights commuting and business-hour concentration.',
    recommendedBias: 75,
  },
  custom: {
    label: 'Custom intervals',
    helperText: 'Use your own boundaries and tune selectivity as needed.',
    recommendedBias: 50,
  },
};

export const DEFAULT_PRESET_BIASES: Record<DemoPresetBiasKey, number> = {
  hourly: PRESET_BIAS_HELPERS.hourly.recommendedBias,
  daily: PRESET_BIAS_HELPERS.daily.recommendedBias,
  weekly: PRESET_BIAS_HELPERS.weekly.recommendedBias,
  monthly: PRESET_BIAS_HELPERS.monthly.recommendedBias,
  'weekday-weekend': PRESET_BIAS_HELPERS['weekday-weekend'].recommendedBias,
  'morning-afternoon-evening-night': PRESET_BIAS_HELPERS['morning-afternoon-evening-night'].recommendedBias,
  'business-hours': PRESET_BIAS_HELPERS['business-hours'].recommendedBias,
  custom: PRESET_BIAS_HELPERS.custom.recommendedBias,
};

export const PRESET_GENERATION_PROFILES: Record<DemoPresetBiasKey, DemoPresetGenerationProfile> = {
  hourly: { minBins: 12, maxBins: 24 },
  daily: { minBins: 3, maxBins: 8 },
  weekly: { minBins: 3, maxBins: 7 },
  monthly: { minBins: 4, maxBins: 8 },
  'weekday-weekend': { minBins: 2, maxBins: 5 },
  'morning-afternoon-evening-night': { minBins: 4, maxBins: 8 },
  'business-hours': { minBins: 3, maxBins: 6 },
  custom: { minBins: 2, maxBins: 8 },
};

export const clampPresetBias = (value: number) => {
  const rounded = Math.round(value / PRESET_BIAS_RANGE.step) * PRESET_BIAS_RANGE.step;
  return Math.min(PRESET_BIAS_RANGE.max, Math.max(PRESET_BIAS_RANGE.min, rounded));
};

export const resolvePresetBiasBinTarget = (preset: DemoPresetBiasKey, bias: number) => {
  const clampedBias = clampPresetBias(bias);
  const profile = PRESET_GENERATION_PROFILES[preset];
  const ratio = clampedBias / PRESET_BIAS_RANGE.max;
  const target = profile.minBins + (profile.maxBins - profile.minBins) * ratio;
  return Math.max(1, Math.round(target));
};

const describeBiasTone = (value: number) => {
  if (value <= 20) return 'Very broad';
  if (value <= 40) return 'Broad';
  if (value <= 60) return 'Balanced';
  if (value <= 80) return 'Focused';
  return 'Very focused';
};

export const buildPresetBiasSummary = (value: number) => `${describeBiasTone(value)} • ${value}% Bias`;
