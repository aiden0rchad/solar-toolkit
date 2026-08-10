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
        "gridOnly": 180008,
        "monthlyBillFuture": 397,
        "monthlyBillNow": 830,
        "monthlyProfileY1": [
          {
            "month": "Jan",
            "production": 518,
            "usage": 1275,
          },
          {
            "month": "Feb",
            "production": 669,
            "usage": 960,
          },
          {
            "month": "Mar",
            "production": 1036,
            "usage": 903,
          },
          {
            "month": "Apr",
            "production": 1290,
            "usage": 823,
          },
          {
            "month": "May",
            "production": 1530,
            "usage": 903,
          },
          {
            "month": "Jun",
            "production": 1600,
            "usage": 1080,
          },
          {
            "month": "Jul",
            "production": 1629,
            "usage": 1329,
          },
          {
            "month": "Aug",
            "production": 1530,
            "usage": 1275,
          },
          {
            "month": "Sep",
            "production": 1242,
            "usage": 1029,
          },
          {
            "month": "Oct",
            "production": 987,
            "usage": 903,
          },
          {
            "month": "Nov",
            "production": 645,
            "usage": 977,
          },
          {
            "month": "Dec",
            "production": 494,
            "usage": 1329,
          },
        ],
        "netLiability": -89501,
        "peakCoverageY1": 72.27884434910845,
        "proposed": 90507,
        "selfSufficiencyY1": 82.66949546409259,
        "statusQuo": 180008,
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
});
