// --- SOLAR PRODUCTION MODEL ---
// Monthly AC production factors in kWh per kW(DC) per day for a fixed south-facing
// roof array, PVWatts-style with ~14% system losses baked in. Seasonality is the
// difference between an honest quote and a summer-only fantasy: Central Valley
// December produces less than 1/3 of July.
export const SUN_PROFILES = {
  'CA Central Valley': [2.1, 3.0, 4.2, 5.4, 6.2, 6.7, 6.6, 6.2, 5.2, 4.0, 2.7, 2.0],
  'CA Coastal': [2.5, 3.2, 4.3, 5.3, 5.6, 5.9, 6.0, 5.9, 5.2, 4.1, 3.0, 2.4],
  'Desert SW': [3.4, 4.3, 5.5, 6.6, 7.2, 7.3, 6.8, 6.5, 5.8, 4.8, 3.7, 3.1],
  'US Average': [2.0, 2.8, 3.7, 4.6, 5.2, 5.6, 5.6, 5.3, 4.5, 3.4, 2.4, 1.8],
};
export const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// Monthly household load multipliers (normalized to 1.0 average at use time).
// Real homes aren't flat: AC homes peak in July, electric-heat homes in December,
// Central Valley all-electric homes peak in BOTH.
export const LOAD_SHAPES = {
  'Flat': [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  'Summer Peak (AC)': [0.85, 0.80, 0.80, 0.85, 0.95, 1.15, 1.35, 1.30, 1.10, 0.90, 0.85, 0.90],
  'Winter Peak (Heat)': [1.30, 1.15, 1.00, 0.85, 0.75, 0.70, 0.75, 0.75, 0.80, 0.90, 1.10, 1.35],
  'Dual Peak (AC + Heat)': [1.20, 1.00, 0.85, 0.80, 0.85, 1.05, 1.25, 1.20, 1.00, 0.85, 0.95, 1.25],
};
export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const annualSunHours = (profile) =>
  SUN_PROFILES[profile].reduce((a, f, i) => a + f * DAYS_IN_MONTH[i], 0) / 365;
