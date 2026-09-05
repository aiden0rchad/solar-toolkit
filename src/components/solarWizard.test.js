import { describe, expect, it } from 'vitest';
import { getRegionalProfile } from '../data/regionalProfiles';
import { buildMonthlySolarFactors, LOAD_SHAPES } from '../engine/solar';
import { calculateSolarSizing } from '../engine/solarSizing';
import { solarFinanceErrors } from './solarFinance';
import { isSolarExperience, isSolarWizardStep, solarWizardErrors } from './solarWizard';

function scenario({ regionalProfileId = 'ca-sacramento-planning', monthlyBill = 250, values = {}, ...overrides } = {}) {
  const { profile } = getRegionalProfile(regionalProfileId);
  const inputs = {
    ...profile.assumptions, resourceId: profile.resourceId, peakUsagePercent: 35,
    mode: 'bill', panelCount: 20, panelWatts: 400, targetOffsetPct: 100,
    ...values,
  };
  const production = buildMonthlySolarFactors(inputs);
  const blendedRate = inputs.ratePeak * inputs.peakUsagePercent / 100 + inputs.rateOffPeak * (1 - inputs.peakUsagePercent / 100);
  const sizing = calculateSolarSizing({ ...inputs, monthlyBill, ratePerKwh: blendedRate, monthlySolarFactors: production.monthlySolarFactors });
  return {
    monthlyBill, loadShape: 'Flat', locationConfirmed: true,
    solar: { values: inputs, profile, blendedRate, sizing, errors: [...production.errors, ...sizing.errors] },
    ...overrides,
  };
}

describe('solar wizard state validation', () => {
  it('accepts only the four named experiences', () => {
    for (const value of ['choose', 'guided', 'summary', 'full']) expect(isSolarExperience(value)).toBe(true);
    for (const value of ['', 'guide', 'FULL', null, undefined, 0, {}, []]) expect(isSolarExperience(value)).toBe(false);
  });

  it('accepts only integer steps from zero through three', () => {
    for (const value of [0, 1, 2, 3]) expect(isSolarWizardStep(value)).toBe(true);
    for (const value of [-1, 4, 0.5, '1', NaN, Infinity, null, undefined]) expect(isSolarWizardStep(value)).toBe(false);
  });
});

describe('solar wizard input validation', () => {
  it('allows a valid scenario through every step', () => {
    for (const step of [0, 1, 2, 3]) expect(solarWizardErrors(step, scenario())).toEqual([]);
  });

  it.each(['', -1, NaN, Infinity, 100001])('rejects an invalid monthly bill: %s', monthlyBill => {
    expect(solarWizardErrors(0, scenario({ monthlyBill }))).toContain('Enter an average monthly bill between $0 and $100,000.');
  });

  it('accepts the monthly bill boundaries', () => {
    for (const monthlyBill of [0, 100000]) expect(solarWizardErrors(0, scenario({ monthlyBill }))).toEqual([]);
  });

  it('accepts existing load shapes and rejects unknown or inherited names', () => {
    for (const loadShape of Object.keys(LOAD_SHAPES)) expect(solarWizardErrors(0, scenario({ loadShape }))).toEqual([]);
    for (const loadShape of ['', 'unknown', 'toString', '__proto__', null]) {
      expect(solarWizardErrors(0, scenario({ loadShape }))).toContain('Choose how your electricity use changes through the year.');
    }
  });

  it('does not block the first step on incomplete later inputs', () => {
    const input = scenario({ regionalProfileId: 'manual', locationConfirmed: false, financeErrors: ['Missing quote.'] });
    expect(input.solar.errors.length).toBeGreaterThan(0);
    expect(solarWizardErrors(0, input)).toEqual([]);
  });

  it('requires explicit location confirmation even when default values are valid', () => {
    expect(solarWizardErrors(1, scenario({ locationConfirmed: false }))).toEqual(['Choose a regional starting point, or select Other location.']);
    const input = scenario();
    input.solar.profile = null;
    expect(solarWizardErrors(1, input)).toContain('Choose a regional starting point, or select Other location.');
  });

  it('rejects a manual region with missing rates and resource instead of using California', () => {
    const input = scenario({ regionalProfileId: 'manual' });
    const errors = solarWizardErrors(1, input);
    expect(input.solar.values.resourceId).toBeNull();
    expect(errors).toContain('Enter your electricity price, greater than $0 and no more than $10 per kWh.');
    expect(errors).toContain('Choose a representative sunlight location, or enter your monthly sunlight data in the full calculator.');
    expect(errors.length).toBeGreaterThan(1);
  });

  it('accepts an explicitly supplied manual tariff and twelve AC resource values', () => {
    const input = scenario({ regionalProfileId: 'manual', values: { ratePeak: 0.2, rateOffPeak: 0.2, manualInputType: 'ac', manualMonthlyValues: Array(12).fill(4) } });
    expect(input.solar.values.resourceId).toBeNull();
    for (const step of [1, 2, 3]) expect(solarWizardErrors(step, input)).toEqual([]);
  });

  it('rejects a zero electricity tariff despite a valid resource', () => {
    expect(solarWizardErrors(1, scenario({ values: { ratePeak: 0, rateOffPeak: 0 } }))).toContain('Enter your electricity price, greater than $0 and no more than $10 per kWh.');
  });

  it.each([-1, '', 251])('rejects a fixed charge outside the household bill: %s', monthlyFixedCharge => {
    expect(solarWizardErrors(1, scenario({ values: { monthlyFixedCharge } }))).toContain('Your monthly fixed charge must be between $0 and your monthly bill.');
  });

  it.each([0, -1, 1.5, '', 2501])('retains the sizing engine error for invalid panel count: %s', panelCount => {
    const input = scenario({ values: { mode: 'panels', panelCount } });
    expect(solarWizardErrors(2, input)).toEqual(input.solar.sizing.errors);
    expect(solarWizardErrors(2, input)).toContain('Panel count must be a whole number from 1 to 2,500.');
  });

  it('retains and deduplicates all engine and finance errors before showing results', () => {
    const input = scenario({ values: { mode: 'panels', panelCount: -1, resourceId: null } });
    const financeErrors = solarFinanceErrors({ systemCost: -1, incentives: -1, purchaseMethod: 'loan', loanInterest: -1, loanTerm: 0 });
    input.financeErrors = [...financeErrors, input.solar.errors[0], financeErrors[0]];
    const expected = [...new Set([...input.solar.errors, ...financeErrors])];
    expect(expected.length).toBeGreaterThan(financeErrors.length);
    expect(solarWizardErrors(3, input)).toEqual(expected);
  });
});
