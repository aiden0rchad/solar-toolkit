import { describe, expect, it } from 'vitest';
import { computeEvStats, evLoanBalance, evLoanPayment } from './ev';

// Mirrors the component's defaults: 72-month loan on a 5-year ownership window.
const base = {
  ev: { eff: 3.5 },
  years: 5,
  annualMiles: 12000, gasPrice: 4.80, iceMPG: 25, elecRate: 0.35,
  iceMaintCost: 800, evMaintCost: 300,
  currentCarStatus: 'paidoff', currentCarPayment: 450, currentCarMonthsLeft: 36, currentInsurance: 150,
  evPurchaseMethod: 'finance', evPrice: 42000, evDownPayment: 5000, evLoanTerm: 72, evInterestRate: 6.5,
  evLeasePayment: 450, evLeaseTerm: 36, evLeaseDueAtSigning: 3000,
  evInsurance: 190, evRegFee: 118, tradeInValue: 0, resalePct: 45,
};

describe('evLoanPayment / evLoanBalance', () => {
  it('amortizes to exactly zero at the end of the term', () => {
    const principal = 37000, rate = 6.5, term = 72;
    const pmt = evLoanPayment(principal, rate, term);
    expect(pmt).toBeGreaterThan(621);
    expect(pmt).toBeLessThan(623);
    // The closed-form balance must track the month-by-month amortization
    // recurrence and land on zero after the final payment — i.e. the loan
    // really is finished at the end of the loan term.
    const r = rate / 100 / 12;
    let running = principal;
    for (let k = 1; k < term; k++) {
      running = running * (1 + r) - pmt;
      expect(evLoanBalance(principal, rate, term, k)).toBeCloseTo(running, 6);
    }
    expect(evLoanBalance(principal, rate, term, term)).toBe(0);
    expect(evLoanBalance(principal, rate, term, term + 12)).toBe(0);
  });

  it('handles zero-rate and degenerate inputs', () => {
    expect(evLoanPayment(36000, 0, 72)).toBe(500);
    expect(evLoanBalance(36000, 0, 72, 60)).toBeCloseTo(6000, 6);
    expect(evLoanPayment(0, 6.5, 72)).toBe(0);
    expect(evLoanBalance(-1, 6.5, 72, 12)).toBe(0);
    expect(evLoanBalance(36000, 6.5, 72, 0)).toBe(36000);
  });
});

describe('computeEvStats — financing', () => {
  it('counts the balance still owed when the ownership window ends mid-loan', () => {
    const s = computeEvStats(base); // 60-month window, 72-month loan
    const expectedPayoff = evLoanBalance(42000 - 5000, 6.5, 72, 60);
    expect(s.evLoanPayoff).toBeCloseTo(expectedPayoff, 6);
    expect(expectedPayoff).toBeGreaterThan(7000);
    expect(expectedPayoff).toBeLessThan(7400);
    expect(s.totalEvPayments).toBeCloseTo(s.evMonthlyFinance * 60 + 5000 + expectedPayoff, 6);
  });

  it('at 0% interest, financing costs exactly what cash costs, for any window', () => {
    // down + payments made + payoff must reconstruct the full price — the
    // conservation law the old code violated by dropping the payoff.
    const financed = computeEvStats({ ...base, evInterestRate: 0 });
    const cash = computeEvStats({ ...base, evInterestRate: 0, evPurchaseMethod: 'cash' });
    expect(financed.totalEvCost).toBeCloseTo(cash.totalEvCost, 6);
  });

  it('has no payoff once the window outlasts the loan, with payments capped at the term', () => {
    const s = computeEvStats({ ...base, years: 15 });
    expect(s.evLoanPayoff).toBe(0);
    expect(s.totalEvPayments).toBeCloseTo(s.evMonthlyFinance * 72 + 5000, 6);
    expect(s.cumulative.at(-1).month).toBe(180);
  });

  it('applies a trade-in to principal once, reducing both the loan and payment', () => {
    const withoutTrade = computeEvStats({ ...base, evInterestRate: 0 });
    const withTrade = computeEvStats({ ...base, evInterestRate: 0, tradeInValue: 10000 });

    expect(withTrade.tradeInAppliedToLoan).toBe(10000);
    expect(withTrade.financedPrincipal).toBe(withoutTrade.financedPrincipal - 10000);
    expect(withTrade.evMonthlyFinance).toBeCloseTo(withoutTrade.evMonthlyFinance - 10000 / 72, 6);
    expect(withTrade.totalEvPayments).toBeCloseTo(base.evPrice - 10000, 6);
    expect(withTrade.totalEvCost).toBeCloseTo(withoutTrade.totalEvCost - 10000, 6);
    expect(withTrade.cumulative[0]).toEqual({ month: 0, ice: 0, ev: base.evDownPayment });
  });

  it('uses the trade-adjusted principal for a payoff before the loan ends', () => {
    const s = computeEvStats({ ...base, tradeInValue: 9000 });
    expect(s.evLoanPayoff).toBeCloseTo(
      evLoanBalance(base.evPrice - base.evDownPayment - 9000, base.evInterestRate, base.evLoanTerm, 60),
      6,
    );
  });

  it('does not overfund the purchase when cash down plus trade-in exceeds price', () => {
    const s = computeEvStats({
      ...base,
      evInterestRate: 0,
      evPrice: 30000,
      evDownPayment: 10000,
      tradeInValue: 25000,
    });
    expect(s.tradeInAppliedToLoan).toBe(25000);
    expect(s.cashDownPayment).toBe(5000);
    expect(s.financedPrincipal).toBe(0);
    expect(s.evMonthlyFinance).toBe(0);
    expect(s.totalEvPayments).toBe(5000);
    expect(s.cumulative[0].ev).toBe(5000);
  });

  it('caps trade-in credit at the EV price when equity is higher', () => {
    const s = computeEvStats({ ...base, evPrice: 30000, evDownPayment: 5000, tradeInValue: 35000 });
    expect(s.tradeInCredit).toBe(30000);
    expect(s.tradeInAppliedToLoan).toBe(30000);
    expect(s.cashDownPayment).toBe(0);
    expect(s.financedPrincipal).toBe(0);
    expect(s.totalEvPayments).toBe(0);
  });

  it.each(['cash', 'lease'])('caps excess trade-in equity for a %s purchase', evPurchaseMethod => {
    const s = computeEvStats({ ...base, evPurchaseMethod, tradeInValue: 50000 });
    expect(s.tradeInCredit).toBe(base.evPrice);
    expect(s.upfrontEvCost).toBeLessThanOrEqual(0);
  });
});

describe('computeEvStats — lease and internal consistency', () => {
  it('charges due-at-signing once per lease term actually started, never fractionally', () => {
    const s = computeEvStats({ ...base, evPurchaseMethod: 'lease' }); // 60 mo across 36-mo terms → 2 signings
    expect(s.totalEvPayments).toBeCloseTo(450 * 60 + 3000 * 2, 6);
  });

  it('break-even series ends exactly on the ICE total (no hidden settlement on that side)', () => {
    const s = computeEvStats({ ...base, currentCarStatus: 'loan' });
    expect(Math.abs(s.cumulative.at(-1).ice - s.totalIceCost)).toBeLessThanOrEqual(1);
  });

  it('keeps resale and loan payoff out of the cash-flow break-even series', () => {
    const s = computeEvStats(base);
    const chartEnd = s.cumulative.at(-1).ev;
    expect(s.totalEvCost).toBeCloseTo(chartEnd + s.evLoanPayoff - s.resaleCredit, 0);
    expect(s.settlementNetCredit).toBeCloseTo(s.resaleCredit - s.evLoanPayoff, 6);
  });

  it('preserves a negative net vehicle cost as a credit instead of discarding it', () => {
    const s = computeEvStats({ ...base, tradeInValue: 40000 });
    const operatingCost = (s.elecCostYear + base.evMaintCost + base.evRegFee) * base.years
      + base.evInsurance * 12 * base.years;
    expect(s.vehicleNetCost).toBeLessThan(0);
    expect(s.totalEvCost).toBeCloseTo(operatingCost + s.vehicleNetCost, 6);
  });

  it('reports only a crossover that lasts through the selected horizon', () => {
    const s = computeEvStats({
      ...base,
      years: 10,
      currentCarStatus: 'loan',
      currentCarPayment: 1100,
      currentCarMonthsLeft: 24,
      tradeInValue: 12000,
    });
    const earlyTemporaryWin = s.cumulative.find(point => point.month < 60 && point.ev < point.ice);
    const laterLoss = s.cumulative.find(point => point.month > earlyTemporaryWin.month && point.ev >= point.ice);

    expect(earlyTemporaryWin).toBeDefined();
    expect(laterLoss).toBeDefined();
    expect(s.breakEvenMonth).toBe(106);
    expect(s.cumulative).toContainEqual(expect.objectContaining({ month: s.breakEvenMonth }));
  });

  it('returns no break even when the EV is still more expensive at the horizon', () => {
    const s = computeEvStats({ ...base, years: 20, evPrice: 120000, tradeInValue: 0 });
    expect(s.breakEvenMonth).toBeNull();
    expect(s.cumulative.at(-1).month).toBe(240);
  });

  it('uses a custom MPG value throughout fuel and ownership costs', () => {
    const lowMpg = computeEvStats({ ...base, iceMPG: 17.5 });
    const highMpg = computeEvStats({ ...base, iceMPG: 35 });
    expect(lowMpg.gasCostYear).toBeCloseTo(base.annualMiles / 17.5 * base.gasPrice, 6);
    expect(highMpg.gasCostYear).toBeCloseTo(lowMpg.gasCostYear / 2, 6);
    expect(lowMpg.totalIceCost).toBeGreaterThan(highMpg.totalIceCost);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('falls back to 25 MPG for invalid MPG input (%s)', iceMPG => {
    const s = computeEvStats({ ...base, iceMPG });
    expect(s.modeledIceMPG).toBe(25);
    expect(s.gasCostYear).toBe(base.annualMiles / 25 * base.gasPrice);
    expect(Number.isFinite(s.totalIceCost)).toBe(true);
    expect(Number.isFinite(s.totalSavings)).toBe(true);
  });

  it.each([
    [11.60, 12],
    [12, 12],
    [12.40, 13],
  ])('uses precise values and includes equality when cash price is $%s', (evPrice, expectedMonth) => {
    const s = computeEvStats({
      ...base,
      years: 2,
      annualMiles: 12,
      iceMPG: 1,
      gasPrice: 1,
      iceMaintCost: 0,
      currentInsurance: 0,
      evPurchaseMethod: 'cash',
      evPrice,
      elecRate: 0,
      evMaintCost: 0,
      evInsurance: 0,
      evRegFee: 0,
      tradeInValue: 0,
      resalePct: 0,
    });
    expect(s.breakEvenMonth).toBe(expectedMonth);
  });

  it('bounds resale percentage between zero and one hundred', () => {
    expect(computeEvStats({ ...base, resalePct: -20 }).retainedValuePct).toBe(0);
    expect(computeEvStats({ ...base, resalePct: 140 }).retainedValuePct).toBe(100);
  });
});
