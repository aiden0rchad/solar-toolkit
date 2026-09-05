import { SOLAR_RESOURCE_PROFILES } from '../data/solarResources.js';
export { SOLAR_RESOURCE_PROFILES } from '../data/solarResources.js';

// Legacy illustrative AC factors, retained for old scenarios. These arrays were
// not backed by a traceable PVWatts run. New estimates use sourced resources below.
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
export const validMonthlyFactors = values => Array.isArray(values) && values.length === 12
  && Array.from(values).every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 24);

export function annualProductionPerKw(monthlySolarFactors) {
  if (!validMonthlyFactors(monthlySolarFactors)) throw new RangeError('Enter 12 monthly values between 0 and 24.');
  return monthlySolarFactors.reduce((total, factor, month) => total + factor * DAYS_IN_MONTH[month], 0);
}

export const annualSunHours = profile => annualProductionPerKw(SUN_PROFILES[profile]) / 365;

export function getSolarResource(id) {
  const profile = SOLAR_RESOURCE_PROFILES.find(resource => resource.id === id);
  return profile
    ? { profile: { ...profile, monthlyGhi: [...profile.monthlyGhi] }, warnings: [] }
    : { profile: null, warnings: ['No bundled solar resource matches this location. Choose a representative city or enter all 12 monthly values; no California fallback was used.'] };
}

export function buildMonthlySolarFactors({ resourceId, manualMonthlyValues = null, manualInputType = 'ac', systemLossPct = 14, orientationFactor = 1, clippingLossPct = 0 } = {}) {
  const warnings = [];
  const errors = [];
  let values = manualMonthlyValues;
  const manual = values !== null;
  if (!manual) {
    const result = getSolarResource(resourceId);
    values = result.profile?.monthlyGhi;
    warnings.push(...result.warnings);
  }
  if (!validMonthlyFactors(values)) errors.push('Enter 12 finite monthly values from 0 to 24, in daily units. Missing months cannot be estimated.');
  if (manual && !['ac', 'sun-hours'].includes(manualInputType)) errors.push('Choose AC production or sun-hours for manual inputs.');
  const alreadyAc = manual && manualInputType === 'ac';
  if (!alreadyAc) {
    if (!Number.isFinite(systemLossPct) || systemLossPct < 0 || systemLossPct > 100) errors.push('System losses must be between 0% and 100%.');
    if (!Number.isFinite(orientationFactor) || orientationFactor < 0 || orientationFactor > 2) errors.push('Orientation adjustment must be between 0 and 2.');
    if (!Number.isFinite(clippingLossPct) || clippingLossPct < 0 || clippingLossPct > 100) errors.push('Clipping loss must be between 0% and 100%.');
  }
  if (errors.length) return { monthlySolarFactors: Array(12).fill(0), warnings, errors };
  if (alreadyAc) {
    warnings.push('Manual AC kWh/kW/day already includes system, orientation, and clipping losses. Those adjustments are not applied again.');
  } else {
    warnings.push('Production is a screening estimate: daily resource × DC kW × orientation adjustment × remaining system efficiency × remaining clipping efficiency. No hourly shading, temperature, snow, tilt/azimuth geometry, or inverter model is included.');
    if (!manual) warnings.push('Bundled resource is 2001–2020 horizontal irradiation at a 1° city grid cell, not roof-specific production or current weather. Orientation 1 means no adjustment from horizontal.');
  }
  const multiplier = alreadyAc ? 1 : orientationFactor * (1 - systemLossPct / 100) * (1 - clippingLossPct / 100);
  const monthlySolarFactors = values.map(value => value * multiplier);
  if (!validMonthlyFactors(monthlySolarFactors)) errors.push('Adjusted daily production exceeds 24 kWh/kW; review monthly values and orientation.');
  return { monthlySolarFactors: errors.length ? Array(12).fill(0) : monthlySolarFactors, warnings, errors };
}
