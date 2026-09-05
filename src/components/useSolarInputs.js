import { useToolState } from '../state/useToolState';
import { REGIONAL_PROFILES } from '../data/regionalProfiles';
import { buildMonthlySolarFactors, getSolarResource } from '../engine/solar';
import { calculateSolarSizing } from '../engine/solarSizing';

const initialProfile = REGIONAL_PROFILES.find(profile => profile.state === 'CA') ?? REGIONAL_PROFILES[0];
const initialValues = {
  regionalProfileId: initialProfile.id,
  profileVersion: initialProfile.version,
  profileReviewedAt: initialProfile.reviewedAt,
  resourceId: initialProfile.resourceId,
  ...initialProfile.assumptions,
  peakUsagePercent: 35,
  mode: 'bill', panelCount: 20, panelWatts: 400, systemSizeKw: 8, targetOffsetPct: 100,
  manualInputType: 'sun-hours', manualMonthlyValues: null,
  systemLossPct: 14, orientationFactor: 1, clippingLossPct: 0, panelDegradationPct: 0.5,
};

const validStoredValues = value => value && typeof value === 'object'
  && Object.entries(initialValues).every(([key, sample]) => key === 'resourceId' && value[key] === null ? true : sample === null
    ? value[key] === null || (key === 'manualMonthlyValues'
      ? Array.isArray(value[key]) && value[key].length === 12 && value[key].every(item => item === '' || Number.isFinite(item))
      : Number.isFinite(value[key]))
    : typeof sample === 'number' ? value[key] === '' || Number.isFinite(value[key]) : typeof value[key] === typeof sample);

export function useSolarInputs({ monthlyBill = 250, annualUsageKwh, extraDailyUsage = 0, defaultMode = 'bill' } = {}) {
  const [values, setValues] = useToolState('solarInputs', { ...initialValues, mode: defaultMode }, validStoredValues);
  const set = (key, value) => {
    const numericDraft = item => typeof item === 'number' && !Number.isFinite(item) ? '' : item;
    setValues(previous => ({ ...previous, [key]: Array.isArray(value) ? value.map(numericDraft) : numericDraft(value) }));
  };
  const profile = REGIONAL_PROFILES.find(item => item.id === values.regionalProfileId);
  const selectProfile = id => {
    const selected = REGIONAL_PROFILES.find(item => item.id === id);
    if (selected) setValues(previous => ({ ...previous, regionalProfileId: id, profileVersion: selected.version, profileReviewedAt: selected.reviewedAt, resourceId: selected.resourceId, ...selected.assumptions, manualMonthlyValues: null }));
  };
  const resource = getSolarResource(values.resourceId);
  const production = buildMonthlySolarFactors(values);
  const blendedRate = values.ratePeak * values.peakUsagePercent / 100 + values.rateOffPeak * (1 - values.peakUsagePercent / 100);
  const sizingParams = { ...values, monthlyBill, ratePerKwh: blendedRate, monthlySolarFactors: production.monthlySolarFactors };
  const baseSizing = calculateSolarSizing({ ...sizingParams, annualUsageKwh });
  const sizing = extraDailyUsage ? calculateSolarSizing({ ...sizingParams, annualUsageKwh: baseSizing.annualUsageKwh + extraDailyUsage * 365 }) : baseSizing;
  const errors = [...production.errors, ...baseSizing.errors, ...sizing.errors];
  if (!Number.isFinite(extraDailyUsage) || extraDailyUsage < 0) errors.push('Additional daily use must be a finite, nonnegative number.');
  for (const key of ['ratePeak', 'rateOffPeak', 'solarExportRate', 'monthlyFixedCharge', 'monthlySolarChargePerKw', 'inflationRate', 'panelDegradationPct']) {
    if (!Number.isFinite(values[key]) || values[key] < 0) errors.push(`${key}: enter a finite, nonnegative value.`);
  }
  if (['ratePeak', 'rateOffPeak', 'solarExportRate'].some(key => values[key] > 10)) errors.push('Electricity rates must be no more than $10/kWh.');
  if (values.monthlyFixedCharge > 100000 || values.monthlySolarChargePerKw > 10000) errors.push('Monthly fixed charge must be at most $100,000 and solar capacity charge at most $10,000/kW.');
  if (values.inflationRate > 25) errors.push('Annual utility escalation must be between 0 and 25%.');
  if (!Number.isFinite(values.peakUsagePercent) || values.peakUsagePercent < 0 || values.peakUsagePercent > 100) errors.push('Peak usage share must be between 0 and 100%.');
  if (values.panelDegradationPct > 100) errors.push('Panel degradation cannot exceed 100% per year.');
  for (const key of ['annualGenerationCapKwh', 'annualExportCapKwh']) {
    if (values[key] !== null && (!Number.isFinite(values[key]) || values[key] < 0 || values[key] > 10000000)) errors.push('Annual caps must be blank or between 0 and 10,000,000 kWh.');
  }
  if (!profile) errors.push('Choose a supported regional example or the manual profile.');
  if (!['net-billing', 'annual-net-metering'].includes(values.exportCompensation)) errors.push('Choose net billing or banked annual export credits.');
  const params = {
    ratePeak: values.ratePeak, rateOffPeak: values.rateOffPeak, peakUsagePercent: values.peakUsagePercent,
    monthlyFixedCharge: values.monthlyFixedCharge, solarExportRate: values.solarExportRate, inflationRate: values.inflationRate,
    exportCompensation: values.exportCompensation, monthlySolarChargePerKw: values.monthlySolarChargePerKw,
    monthlySolarFactors: production.monthlySolarFactors, panelDegradationPct: values.panelDegradationPct,
    annualGenerationCapKwh: values.annualGenerationCapKwh, annualExportCapKwh: values.annualExportCapKwh,
  };
  return { values, set, profile, selectProfile, resource, sizing, blendedRate, params,
    errors: [...new Set(errors)], warnings: [...new Set([...(profile?.warnings ?? []), ...production.warnings, ...sizing.warnings])],
    dailyUsage: sizing.annualUsageKwh / 365, systemSize: sizing.systemSizeKw };
}
