import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { inputStore } from '../state/store';
import { ToolStateContext } from '../state/useToolState';
import { useSolarInputs } from './useSolarInputs';

const scope = 'solar-input-contract';
function readSolar(props = {}) {
  let result;
  function Probe() { result = useSolarInputs(props); return null; }
  renderToStaticMarkup(createElement(ToolStateContext.Provider, { value: scope }, createElement(Probe)));
  return result;
}

describe('persisted solar input integration', () => {
  beforeEach(() => inputStore.reset(scope));

  it('restores a manual location and all twelve values without substituting California', () => {
    const values = { ...readSolar().values, regionalProfileId: 'manual', resourceId: null, manualInputType: 'ac', manualMonthlyValues: Array(12).fill(4), ratePeak: 0.2, rateOffPeak: 0.2 };
    inputStore.write(scope, 'solarInputs', values);
    const result = readSolar();
    expect(result.profile.id).toBe('manual');
    expect(result.values.resourceId).toBeNull();
    expect(result.errors).toEqual([]);
    expect(result.params.monthlySolarFactors).toEqual(Array(12).fill(4));
    expect(result.sizing.achievedOffsetPct).toBeCloseTo(100);
  });

  it('does not mask an invalid household bill when future EV usage is present', () => {
    const result = readSolar({ monthlyBill: -10, extraDailyUsage: 12 });
    expect(result.errors.some(error => error.includes('Monthly bill'))).toBe(true);
  });

  it('retains the other manual settings when one numeric field is cleared', () => {
    const values = { ...readSolar().values, regionalProfileId: 'manual', resourceId: null, manualInputType: 'ac', manualMonthlyValues: ['', ...Array(11).fill(4)], ratePeak: 0.25, rateOffPeak: 0.15 };
    inputStore.write(scope, 'solarInputs', values);
    const result = readSolar();
    expect(result.profile.id).toBe('manual');
    expect(result.values.manualMonthlyValues[0]).toBe('');
    expect(result.values.ratePeak).toBe(0.25);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects huge finite rates before attempting a financial simulation', () => {
    inputStore.write(scope, 'solarInputs', { ...readSolar().values, ratePeak: 1e100, inflationRate: 1e100 });
    const result = readSolar({ annualUsageKwh: 10000 });
    expect(result.errors.some(error => error.includes('$10/kWh'))).toBe(true);
    expect(result.errors.some(error => error.includes('25%'))).toBe(true);
  });

  it('forwards direct kW, tariffs, credit mode and caps without silently changing them', () => {
    inputStore.write(scope, 'solarInputs', { ...readSolar().values, mode: 'kw', systemSizeKw: 7.5, exportCompensation: 'annual-net-metering', monthlySolarChargePerKw: 5.92, annualGenerationCapKwh: 9000, annualExportCapKwh: 1200 });
    const result = readSolar({ annualUsageKwh: 10000 });
    expect(result.errors).toEqual([]);
    expect(result.systemSize).toBe(7.5);
    expect(result.params).toMatchObject({ exportCompensation: 'annual-net-metering', monthlySolarChargePerKw: 5.92, annualGenerationCapKwh: 9000, annualExportCapKwh: 1200 });
  });
});
