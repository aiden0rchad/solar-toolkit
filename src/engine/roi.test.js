import { describe, expect, it } from 'vitest';
import { calculatePMT, findBreakEven, runRoiSimulation, simulateDay } from './roi';

const rates = { peak: 0.45, offPeak: 0.32, export: 0.04 };
const fixture = {
  loanAmount: 30000,
  loanInterest: 6,
  loanTerm: 20,
  proposalMode: 'new',
  existingSolarType: 'loan',
  existingSolarBalance: 0,
  existingSolarPayment: 0,
  ppaEscalator: 0,
  batteryCapacity: 13.5,
  depthOfDischarge: 100,
  minSoC: 10,
  roundTripEfficiency: 90,
  degradationRate: 1,
  dailyUsage: 35,
  peakUsagePercent: 35,
  ratePeak: 0.45,
  rateOffPeak: 0.32,
  inflationRate: 3,
  solarSize: 8,
  sunProfile: 'CA Central Valley',
  monthlyFixedCharge: 15,
  solarExportRate: 0.04,
  loadShape: 'Dual Peak (AC + Heat)',
  strategy: 'self',
};

describe('calculatePMT', () => {
  it('calculates financed, zero-rate, and non-positive-principal payments', () => {
    expect(calculatePMT(30000, 6, 20)).toBeCloseTo(214.93, 2);
    expect(calculatePMT(30000, 0, 20)).toBe(30000 / (20 * 12));
    expect(calculatePMT(0, 6, 20)).toBe(0);
    expect(calculatePMT(-1, 6, 20)).toBe(0);
    expect(calculatePMT(30000, 1e-12, 20)).toBeCloseTo(125, 8);
  });
});

describe('simulateDay', () => {
  it('conserves energy with no solar, excess solar, and battery losses', () => {
    const noSolar = simulateDay(0, 35, 0.35, 13.5, 0.9, rates);
    expect(noSolar.bill).toBeCloseTo(35 * 0.35 * rates.peak + 35 * 0.65 * rates.offPeak);
    expect(noSolar.exported).toBe(0);

    const excessSolar = simulateDay(100, 35, 0.35, 13.5, 0.9, rates);
    expect(excessSolar.imported).toBe(0);
    expect(excessSolar.exported).toBeGreaterThan(0);

    const dailySolar = 30;
    const load = 35;
    const peakPct = 0.35;
    const rte = 0.9;
    const result = simulateDay(dailySolar, load, peakPct, 13.5, rte, rates);
    const peakDeficit = Math.max(0, load * peakPct - dailySolar * 0.15);
    const chargeIn = Math.max(0, dailySolar * 0.85 - load * (1 - peakPct));
    expect(peakDeficit - result.peakImported).toBeLessThanOrEqual(chargeIn * rte);
  });

  it('uses arbitrage only when it lowers the bill', () => {
    const self = simulateDay(0, 35, 0.35, 13.5, 0.9, rates, 'self');
    const arbitrage = simulateDay(0, 35, 0.35, 13.5, 0.9, rates, 'arbitrage');
    expect(arbitrage.bill).toBeLessThanOrEqual(self.bill);

    const guardedRates = { peak: 0.35, offPeak: 0.32, export: 0.04 };
    expect(simulateDay(0, 35, 0.35, 13.5, 0.9, guardedRates, 'arbitrage'))
      .toEqual(simulateDay(0, 35, 0.35, 13.5, 0.9, guardedRates, 'self'));
  });
});

describe('runRoiSimulation', () => {
  const simulation = runRoiSimulation(fixture);

  it('produces a realistic 25-year result', () => {
    expect(simulation).toHaveLength(26);
    expect(simulation[1].monthlyProfileY1).toHaveLength(12);
    expect(simulation[1].selfSufficiencyY1).toBeGreaterThanOrEqual(0);
    expect(simulation[1].selfSufficiencyY1).toBeLessThanOrEqual(100);
    expect(Number(findBreakEven(simulation))).toBeGreaterThanOrEqual(3);
    expect(Number(findBreakEven(simulation))).toBeLessThanOrEqual(20);
    expect(simulation[25].gridOnly).toBeGreaterThan(simulation[25].proposed);
  });

  it('locks the year-25 result', () => {
    expect(simulation[25]).toMatchInlineSnapshot(`
      {
        "annualBillGridOnly": 9671.649291516573,
        "annualCreditExpired": 0,
        "annualCurtailedExportsKwh": 0,
        "annualCurtailedGenerationKwh": 0,
        "annualExportsKwh": 1308.4697606833315,
        "annualLoanInterest": 0,
        "annualLoanPayment": 0,
        "annualProductionKwh": 11734.327219378509,
        "annualUsageKwh": 12775.000000000004,
        "annualUtilityBillProposed": 2104.419038852013,
        "gridOnly": 174738,
        "monthlyBillFuture": 175,
        "monthlyBillNow": 806,
        "monthlyProfileY1": [
          {
            "month": "Jan",
            "production": 521,
            "usage": 1274,
          },
          {
            "month": "Feb",
            "production": 672,
            "usage": 959,
          },
          {
            "month": "Mar",
            "production": 1042,
            "usage": 903,
          },
          {
            "month": "Apr",
            "production": 1296,
            "usage": 822,
          },
          {
            "month": "May",
            "production": 1538,
            "usage": 903,
          },
          {
            "month": "Jun",
            "production": 1608,
            "usage": 1079,
          },
          {
            "month": "Jul",
            "production": 1637,
            "usage": 1327,
          },
          {
            "month": "Aug",
            "production": 1538,
            "usage": 1274,
          },
          {
            "month": "Sep",
            "production": 1248,
            "usage": 1028,
          },
          {
            "month": "Oct",
            "production": 992,
            "usage": 903,
          },
          {
            "month": "Nov",
            "production": 648,
            "usage": 976,
          },
          {
            "month": "Dec",
            "production": 496,
            "usage": 1327,
          },
        ],
        "netLiability": -86958,
        "peakCoverageY1": 72.32527451999923,
        "proposed": 87780,
        "remainingLoanBalance": 0,
        "selfSufficiencyY1": 82.77783252950441,
        "statusQuo": 174738,
        "upfrontCost": 0,
        "warnings": [
          "Legacy climate factors are illustrative and not a verified dataset. Select a sourced resource or enter monthly production.",
        ],
        "year": 25,
      }
    `);
  });

  it('reaches break-even sooner when incentives reduce the year-0 cost', () => {
    const withIncentives = runRoiSimulation({ ...fixture, incentives: 5000 });
    expect(Number(findBreakEven(withIncentives))).toBeLessThan(Number(findBreakEven(simulation)));
  });

  it('does not improve the 25-year outcome when depth of discharge reduces usable capacity', () => {
    const reducedCapacity = runRoiSimulation({ ...fixture, depthOfDischarge: 50 });
    expect(reducedCapacity[25].proposed).toBeGreaterThanOrEqual(simulation[25].proposed);
  });

  it('applies guarded arbitrage across the 25-year simulation', () => {
    const arbitrage = runRoiSimulation({ ...fixture, strategy: 'arbitrage' });
    expect(arbitrage[25].proposed).toBeLessThanOrEqual(simulation[25].proposed);

    const guardedFixture = { ...fixture, ratePeak: 0.35, rateOffPeak: 0.32 };
    expect(runRoiSimulation({ ...guardedFixture, strategy: 'arbitrage' }))
      .toEqual(runRoiSimulation({ ...guardedFixture, strategy: 'self' }));
  });

  it('amortizes monthly and stops payments at the loan term', () => {
    const loan = runRoiSimulation({ ...fixture, loanTerm: 5 });
    expect(loan[4].remainingLoanBalance).toBeGreaterThan(0);
    expect(loan[5].remainingLoanBalance).toBe(0);
    expect(loan[6].annualLoanPayment).toBe(0);
    const totalPaid = loan.reduce((sum, row) => sum + row.annualLoanPayment, 0);
    expect(totalPaid).toBeCloseTo(calculatePMT(30000, 6, 5) * 60, 7);
    expect(loan[25].monthlyBillFuture).toBe(Math.round(loan[25].annualUtilityBillProposed / 12));
  });

  it('counts a cash purchase once upfront and never adds loan payments', () => {
    const cash = runRoiSimulation({ ...fixture, purchaseMethod: 'cash', incentives: 5000 });
    expect(cash[0].upfrontCost).toBe(25000);
    expect(cash[0].netLiability).toBe(25000);
    expect(cash.every(row => row.annualLoanPayment === 0 && row.remainingLoanBalance === 0)).toBe(true);
    expect(cash[1].proposed).toBe(Math.round(25000 + cash[1].annualUtilityBillProposed));
    expect(cash[1].monthlyBillFuture).toBe(Math.round(cash[1].annualUtilityBillProposed / 12));
  });

  it('finances only the requested portion of net cost', () => {
    const partial = runRoiSimulation({ ...fixture, incentives: 5000, financedAmount: 20000 });
    expect(partial[0].upfrontCost).toBe(5000);
    expect(partial[0].remainingLoanBalance).toBe(20000);
    expect(partial[0].netLiability).toBe(25000);
    expect(partial[1].annualLoanPayment).toBeCloseTo(calculatePMT(20000, 6, 20) * 12);
  });

  it.each(['cash', 'loan', 'ppa'])('compares a retrofit against keeping existing solar (%s)', existingSolarType => {
    const retrofit = runRoiSimulation({ ...fixture, proposalMode: 'retrofit', existingSolarType, existingSolarBalance: 15000, existingSolarPayment: 140, ppaEscalator: 2.9, batteryCapacity: 0 });
    expect(retrofit[0].netLiability).toBe(30000);
    expect(findBreakEven(retrofit)).toBe(null);
    expect(retrofit[25].netLiability).toBeGreaterThan(30000);
    expect(retrofit[25].proposed - retrofit[25].statusQuo).toBeCloseTo(retrofit[25].netLiability, 0);
    expect(retrofit[25].netLiability).toBeCloseTo(30000 + retrofit.reduce((total, row) => total + row.annualLoanInterest, 0), 0);
  });

  it('does not report payback when an early saving reverses before year 25', () => {
    const reversing = runRoiSimulation({ ...fixture, loanAmount: 1000, purchaseMethod: 'cash', batteryCapacity: 0, monthlySolarFactors: Array(12).fill(4), solarSize: 10, dailyUsage: 35, ratePeak: 0.2, rateOffPeak: 0.2, solarExportRate: 0.05, inflationRate: 0, loadShape: 'Flat', monthlyFixedCharge: 10, panelDegradationPct: 50, monthlySolarChargePerKw: 2 });
    expect(reversing[1].netLiability).toBeLessThan(0);
    expect(reversing[25].netLiability).toBeGreaterThan(0);
    expect(findBreakEven(reversing)).toBe(null);
  });

  it('includes equality and finds the final sustained crossover', () => {
    const rows = balances => balances.map((netLiability, year) => ({ year, netLiability }));
    expect(findBreakEven(rows([0, 0, 0]))).toBe('0.0');
    expect(findBreakEven(rows([20, 10, 0, -5]))).toBe('2.0');
    expect(findBreakEven(rows([20, -20, 10, -10]))).toBe('2.5');
    expect(findBreakEven(rows([0, 1, -1]))).toBe('1.5');
    expect(findBreakEven(rows([0, 1, 0]))).toBe('2.0');
    expect(findBreakEven([])).toBe(null);
    expect(findBreakEven(rows([10, NaN, -1]))).toBe(null);
  });
});
