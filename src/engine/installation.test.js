import { describe, expect, it } from 'vitest';
import { installationDefaults, runInstallationScenario, validInstallationOverrides } from './installation';

const solar = {
  dailyUsage: 25, peakUsagePercent: 35, ratePeak: 0.3, rateOffPeak: 0.2,
  inflationRate: 0, solarSize: 6, sunProfile: 'CA Central Valley',
  monthlyFixedCharge: 10, solarExportRate: 0.04, loadShape: 'Flat',
  batteryCapacity: 0, depthOfDischarge: 100, minSoC: 0,
  roundTripEfficiency: 90, degradationRate: 0,
};
const costs = { ...installationDefaults(6, 'diy'), equipment: 10000, labor: 1000, permitting: 200, interconnection: 100, tax: 500, contingency: 700, incentives: 1000 };

describe('installation ownership comparison', () => {
  it('restores partial cost overrides but rejects malformed saved fields', () => {
    expect(validInstallationOverrides({})).toBe(true);
    expect(validInstallationOverrides({ equipment: 12000, financedAmount: null, paymentMethod: 'loan' })).toBe(true);
    for (const value of [null, [], { equipment: null }, { labor: '1000' }, { unknownCost: 500 }, { interestRate: Infinity }, { paymentMethod: 'lease' }]) {
      expect(validInstallationOverrides(value)).toBe(false);
    }
  });

  it('composes all cost lines and pays cash at installation without a phantom loan', () => {
    const result = runInstallationScenario(solar, costs);
    expect(result.grossCost).toBe(12500);
    expect(result.netCost).toBe(11500);
    expect(result.upfront).toBe(11500);
    expect(result.rows[0]).toMatchObject({ spent: 11500, balance: 0, economicCost: 11500 });
    expect(result.monthlyPayment).toBe(0);
    expect(result.totalInterest).toBe(0);
    expect(result.totalLoanPayments).toBe(0);
  });

  it('finances only the requested amount and counts principal exactly once', () => {
    const cash = runInstallationScenario(solar, costs);
    const loan = runInstallationScenario(solar, { ...costs, paymentMethod: 'loan', financedAmount: 8000, interestRate: 6, loanYears: 5 });
    expect(loan.upfront).toBe(3500);
    expect(loan.rows[0].economicCost).toBe(cash.rows[0].economicCost);
    expect(loan.totalLoanPayments).toBeCloseTo(8000 + loan.totalInterest, 6);
    expect(loan.rows[5].balance).toBe(0);
    expect(loan.rows[6].loanPayments).toBe(0);
    expect(loan.rows[25].spent - cash.rows[25].spent).toBeCloseTo(loan.totalInterest, 6);
    expect(loan.rows.map(row => row.gridCost)).toEqual(cash.rows.map(row => row.gridCost));
  });

  it('handles a zero-interest loan and full incentives without negative cost', () => {
    const free = runInstallationScenario(solar, { ...costs, incentives: 100000, paymentMethod: 'loan' });
    expect(free.incentives).toBe(12500);
    expect(free.netCost).toBe(0);
    expect(free.monthlyPayment).toBe(0);
    const loan = runInstallationScenario(solar, { ...costs, paymentMethod: 'loan', interestRate: 0, loanYears: 10 });
    expect(loan.monthlyPayment).toBeCloseTo(11500 / 120);
    expect(loan.totalInterest).toBe(0);
    expect(loan.rows[10].balance).toBe(0);
  });

  it('adds upkeep every year and one replacement in the selected year', () => {
    const base = runInstallationScenario(solar, costs);
    const upkeep = runInstallationScenario(solar, { ...costs, annualMaintenance: 100, maintenanceEscalation: 2, replacementCost: 2500, replacementYear: 12 });
    expect(upkeep.rows[1].maintenance).toBe(100);
    expect(upkeep.rows[2].maintenance).toBe(102);
    expect(upkeep.rows.filter(row => row.replacement > 0).map(row => row.year)).toEqual([12]);
    expect(upkeep.rows[25].spent - base.rows[25].spent).toBeCloseTo(upkeep.totalMaintenance + 2500, 6);
    if (upkeep.breakEvenYear !== null) expect(upkeep.rows.slice(upkeep.breakEvenYear).every(row => row.economicCost <= row.gridCost)).toBe(true);
  });

  it('rejects invalid costs, borrowing above cost, and invalid terms', () => {
    for (const equipment of [-1, NaN, Infinity]) expect(() => runInstallationScenario(solar, { ...costs, equipment })).toThrow();
    expect(() => runInstallationScenario(solar, { ...costs, paymentMethod: 'loan', financedAmount: 999999 })).toThrow(/Amount financed/);
    expect(() => runInstallationScenario(solar, { ...costs, paymentMethod: 'loan', loanYears: 0 })).toThrow(/Loan term/);
    expect(() => runInstallationScenario(solar, { ...costs, replacementCost: 100, replacementYear: 1.5 })).toThrow(/Replacement year/);
  });

  it('reports no break-even when costs outweigh a zero-output system', () => {
    const result = runInstallationScenario({ ...solar, solarSize: 0 }, costs);
    expect(result.breakEvenYear).toBeNull();
    expect(result.savings25).toBeCloseTo(-result.netCost, 6);
  });
});
