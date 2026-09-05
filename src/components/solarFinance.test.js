import { describe, expect, it } from 'vitest';
import { solarFinanceErrors } from './solarFinance';

const valid = { systemCost: 20000, incentives: 0, purchaseMethod: 'loan', loanInterest: 0, loanTerm: 25 };
describe('solar financing input validation', () => {
  it('allows zero-interest financing and cash without irrelevant loan terms', () => {
    expect(solarFinanceErrors(valid)).toEqual([]);
    expect(solarFinanceErrors({ ...valid, purchaseMethod: 'cash', loanInterest: NaN, loanTerm: NaN })).toEqual([]);
  });
  it.each(['systemCost', 'incentives', 'loanInterest', 'loanTerm'])('rejects cleared, negative and excessive %s', key => {
    for (const value of [NaN, -1, 1e100]) expect(solarFinanceErrors({ ...valid, [key]: value }).length).toBeGreaterThan(0);
  });
  it('rejects a zero or sub-month loan term', () => {
    expect(solarFinanceErrors({ ...valid, loanTerm: 0 }).length).toBeGreaterThan(0);
    expect(solarFinanceErrors({ ...valid, loanTerm: 0.01 }).length).toBeGreaterThan(0);
  });
});
