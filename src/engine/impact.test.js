import { describe, expect, it } from 'vitest';
import { calculateImpact } from './impact';

describe('calculateImpact', () => {
  it('uses ROI production before annualized usage', () => {
    expect(calculateImpact({
      roi: { annualProductionKwh: 10500 },
      usage: { dailyKwh: 40 },
    })).toEqual({
      annualProductionKwh: 10500,
      co2Kg: 4200,
      trees: 200,
      cars: 4200 / 4600,
    });
  });

  it('falls back to annualized usage and returns null without supporting data', () => {
    expect(calculateImpact({ usage: { dailyKwh: '10' } })?.annualProductionKwh).toBe(3650);
    expect(calculateImpact({})).toBeNull();
  });
});
