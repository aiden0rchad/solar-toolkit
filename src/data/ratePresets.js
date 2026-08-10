export const RATE_PRESETS = {
  'PG&E': { peak: 0.52, offPeak: 0.37, export: 0.04, fixed: 24, inflation: 6, label: 'PG&E (Time-of-Use)' },
  'SCE': { peak: 0.50, offPeak: 0.34, export: 0.04, fixed: 15, inflation: 6, label: 'SCE (Time-of-Use)' },
  'SDG&E': { peak: 0.62, offPeak: 0.40, export: 0.04, fixed: 15, inflation: 6, label: 'SDG&E (Time-of-Use)' },
  'Municipal': { peak: 0.21, offPeak: 0.21, export: 0.21, fixed: 10, inflation: 3, label: 'Municipal / Co-op (Flat, 1:1 NEM)' },
};
