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
    const s = computeEvStats({ ...base, years: 8 }); // 96-month window, 72-month loan
    expect(s.evLoanPayoff).toBe(0);
    expect(s.totalEvPayments).toBeCloseTo(s.evMonthlyFinance * 72 + 5000, 6);
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
});
