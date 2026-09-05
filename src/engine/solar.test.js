import { describe, expect, it } from 'vitest';
import { annualProductionPerKw, buildMonthlySolarFactors, getSolarResource, SOLAR_RESOURCE_PROFILES } from './solar.js';
import { calculateSolarSizing } from './solarSizing.js';
import { getRegionalProfile, REGIONAL_PROFILES } from '../data/regionalProfiles.js';
import { runRoiSimulation } from './roi.js';

const factors = Array(12).fill(4);
const baseline = {
  loanAmount: 0, loanInterest: 0, loanTerm: 0, existingSolarType: 'none',
  existingSolarPayment: 0, ppaEscalator: 0, proposalMode: 'new',
  batteryCapacity: 0, depthOfDischarge: 100, minSoC: 0,
  roundTripEfficiency: 90, degradationRate: 0, dailyUsage: 10,
  peakUsagePercent: 35, solarSize: 0, monthlySolarFactors: factors,
  panelDegradationPct: 0, ratePeak: 0.2, rateOffPeak: 0.2,
  solarExportRate: 0.05, inflationRate: 0, monthlyFixedCharge: 10,
};

describe('bundled monthly resource', () => {
  it.each(SOLAR_RESOURCE_PROFILES)('$id has reproducible long-term provenance and valid monthly data', profile => {
    expect(profile.monthlyGhi).toHaveLength(12);
    expect(profile.period).toBe('2001–2020');
    expect(profile.sourceUrl).toContain('power.larc.nasa.gov/api/temporal/climatology/point');
    expect(profile.reviewedAt).toBe('2026-09-04');
    const built = buildMonthlySolarFactors({ resourceId: profile.id });
    expect(built.errors).toEqual([]);
    const annual = annualProductionPerKw(built.monthlySolarFactors);
    expect(annual).toBeGreaterThan(1000);
    expect(annual).toBeLessThan(2000);
    const simulation = runRoiSimulation({ ...baseline, solarSize: 1, monthlySolarFactors: built.monthlySolarFactors });
    expect(simulation[1].annualProductionKwh).toBeCloseTo(annual, 9);
  });

  it('weights daily monthly factors by actual month length', () => {
    expect(annualProductionPerKw(factors)).toBe(1460);
    expect(annualProductionPerKw([1, 2, ...Array(10).fill(0)])).toBe(87);
  });

  it('distinguishes resources and exposes missing-location fallback', () => {
    const phoenix = buildMonthlySolarFactors({ resourceId: 'phoenix' });
    const boston = buildMonthlySolarFactors({ resourceId: 'boston' });
    expect(annualProductionPerKw(phoenix.monthlySolarFactors)).toBeGreaterThan(annualProductionPerKw(boston.monthlySolarFactors));
    expect(getSolarResource('unknown')).toMatchObject({ profile: null });
    expect(getSolarResource('unknown').warnings[0]).toContain('no California fallback');
    const missing = buildMonthlySolarFactors({ resourceId: 'unknown' });
    expect(missing.errors.length).toBeGreaterThan(0);
    expect(missing.monthlySolarFactors).toEqual(Array(12).fill(0));
  });

  it('does not apply physical derates a second time to manual AC output', () => {
    expect(buildMonthlySolarFactors({ manualMonthlyValues: factors, manualInputType: 'ac', systemLossPct: 50, orientationFactor: 0.5, clippingLossPct: 20 }).monthlySolarFactors).toEqual(factors);
    const sunHours = buildMonthlySolarFactors({ manualMonthlyValues: factors, manualInputType: 'sun-hours', systemLossPct: 10, orientationFactor: 0.8, clippingLossPct: 5 });
    expect(sunHours.monthlySolarFactors[0]).toBeCloseTo(2.736);
  });

  it.each([[], Array(11).fill(4), Array(12), Array(12).fill(NaN), Array(12).fill(Infinity), [-1, ...Array(11).fill(4)]])('rejects invalid or incomplete manual data: %j', values => {
    expect(buildMonthlySolarFactors({ manualMonthlyValues: values }).errors.length).toBeGreaterThan(0);
    expect(() => annualProductionPerKw(values)).toThrow(RangeError);
  });
});

describe('system sizing', () => {
  it('computes exact DC size and distinguishes generation offset from consumption', () => {
    const result = calculateSolarSizing({ mode: 'panels', panelCount: 20, panelWatts: 400, annualUsageKwh: 10000, monthlySolarFactors: factors });
    expect(result.errors).toEqual([]);
    expect(result.systemSizeKw).toBe(8);
    expect(result.annualProductionKwh).toBe(11680);
    expect(result.achievedOffsetPct).toBeCloseTo(116.8);
    expect(result.targetOffsetPct).toBe(100);
    expect(result.warnings.join(' ')).toContain('not the percentage reduction in the bill');
  });

  it('reverse-sizes from the energy portion of the bill and target offset', () => {
    const result = calculateSolarSizing({ monthlyBill: 200, monthlyFixedCharge: 20, ratePerKwh: 0.3, targetOffsetPct: 80, monthlySolarFactors: factors });
    expect(result.errors).toEqual([]);
    expect(result.annualUsageKwh).toBe(7200);
    expect(result.annualProductionKwh).toBeCloseTo(5760);
    expect(result.achievedOffsetPct).toBeCloseTo(80);
    expect(result.systemSizeKw).toBeCloseTo(3.94520547945);
  });

  it('preserves direct kW input and accepts zero-load scenarios', () => {
    expect(calculateSolarSizing({ mode: 'kw', systemSizeKw: 8, annualUsageKwh: 10000, monthlySolarFactors: factors }).annualProductionKwh).toBe(11680);
    const zero = calculateSolarSizing({ mode: 'panels', panelCount: 20, panelWatts: 400, annualUsageKwh: 0, monthlySolarFactors: factors });
    expect(zero.achievedOffsetPct).toBe(0);
    expect(zero.warnings.join(' ')).toContain('No annual usage');
  });

  it.each([
    { panelCount: 1.5 }, { panelCount: 0 }, { panelCount: 2501 },
    { panelWatts: 0 }, { panelWatts: Infinity }, { panelWatts: 1001 },
    { targetOffsetPct: -1 }, { targetOffsetPct: 201 }, { annualUsageKwh: NaN },
    { monthlySolarFactors: Array(12).fill(0) },
  ])('validates sizing boundaries %j', overrides => {
    const result = calculateSolarSizing({ mode: 'panels', panelCount: 20, panelWatts: 400, annualUsageKwh: 10000, monthlySolarFactors: factors, ...overrides });
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.systemSizeKw).toBe(0);
  });
});

describe('regional assumptions and settlement', () => {
  it.each(REGIONAL_PROFILES)('$id supplies isolated complete inputs with a source and review date', profile => {
    expect(profile.version).toBe(1);
    expect(profile.sources.length).toBeGreaterThan(0);
    expect(profile.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const selected = getRegionalProfile(profile.id).profile;
    const result = runRoiSimulation({ ...baseline, ...selected.assumptions });
    expect(result[1].annualBillGridOnly).toBeCloseTo(selected.assumptions.monthlyFixedCharge * 12 + 3650 * selected.assumptions.ratePeak, 8);
    selected.assumptions.ratePeak = 99;
    expect(getRegionalProfile(profile.id).profile.assumptions.ratePeak).not.toBe(99);
  });

  it('clears solar standby fees, credit mode, and caps when switching profiles', () => {
    const boone = getRegionalProfile('nc-boone-nrlp').profile;
    const phoenix = getRegionalProfile('az-phoenix-planning').profile;
    const switched = { ...boone.assumptions, ...phoenix.assumptions };
    expect(switched).toEqual(phoenix.assumptions);
    expect(switched.monthlySolarChargePerKw).toBe(0);
    expect(switched.exportCompensation).toBe('net-billing');
    expect(switched.annualExportCapKwh).toBe(null);
    const missing = getRegionalProfile('old-profile-id');
    expect(missing.profile.id).toBe('manual');
    expect(missing.warnings[0]).toContain('California defaults were not substituted');
  });

  it('counts first-year production before applying degradation or rate escalation', () => {
    const result = runRoiSimulation({ ...baseline, solarSize: 1, panelDegradationPct: 1, inflationRate: 10, loadShape: 'Dual Peak (AC + Heat)' });
    expect(result[1].annualProductionKwh).toBe(1460);
    expect(result[2].annualProductionKwh).toBeCloseTo(1445.4);
    expect(result[1].annualUsageKwh).toBeCloseTo(3650);
    expect(result[2].annualBillGridOnly - 120).toBeCloseTo((result[1].annualBillGridOnly - 120) * 1.1);
  });

  it('limits annual generation and exports independently, with explained curtailment', () => {
    const result = runRoiSimulation({ ...baseline, dailyUsage: 0, solarSize: 10, annualGenerationCapKwh: 1000, annualExportCapKwh: 200 });
    expect(result[1].annualProductionKwh).toBeCloseTo(1000);
    expect(result[1].annualExportsKwh).toBeCloseTo(200);
    expect(result[1].annualCurtailedGenerationKwh).toBeCloseTo(13600);
    expect(result[1].annualCurtailedExportsKwh).toBeCloseTo(800);
    expect(result[1].annualUtilityBillProposed).toBeCloseTo(110);
    expect(result[1].warnings.join(' ')).toContain('curtails');
    const blocked = runRoiSimulation({ ...baseline, solarSize: 10, annualGenerationCapKwh: 0 });
    expect(blocked[1].annualProductionKwh).toBe(0);
    expect(blocked[1].annualUtilityBillProposed).toBeCloseTo(blocked[1].annualBillGridOnly);
  });

  it('uses no cap for null, and makes invalid caps/resource fallback visible', () => {
    const result = runRoiSimulation({ ...baseline, solarSize: 1, annualGenerationCapKwh: -1, annualExportCapKwh: Infinity });
    expect(result[1].annualProductionKwh).toBe(1460);
    expect(result[1].warnings.join(' ')).toContain('Invalid generation cap');
    expect(result[1].warnings.join(' ')).toContain('Invalid export cap');
    const missing = runRoiSimulation({ ...baseline, solarSize: 1, monthlySolarFactors: null, sunProfile: 'unknown' });
    expect(missing[1].annualProductionKwh).toBe(0);
    expect(missing[1].warnings.join(' ')).toContain('production is zero');
  });

  it('carries net-metering credits forward only and never pays expired credits as cash', () => {
    const common = { ...baseline, dailyUsage: 1, solarSize: 1, solarExportRate: 0.2, exportCompensation: 'annual-net-metering' };
    const early = runRoiSimulation({ ...common, monthlySolarFactors: [10, ...Array(11).fill(0)] })[1];
    const late = runRoiSimulation({ ...common, monthlySolarFactors: [...Array(11).fill(0), 10] })[1];
    expect(early.annualUtilityBillProposed).toBeCloseTo(120 + 55 * 0.2);
    expect(late.annualUtilityBillProposed).toBeCloseTo(120 + 334 * 0.2);
    expect(late.annualCreditExpired).toBeCloseTo(279 * 0.2);
    expect(late.warnings.join(' ')).toContain('expires');
    const standby = runRoiSimulation({ ...common, monthlySolarFactors: factors, monthlySolarChargePerKw: 5.92 })[1];
    expect(standby.annualUtilityBillProposed).toBeCloseTo(120 + 5.92 * 12);
  });
});
