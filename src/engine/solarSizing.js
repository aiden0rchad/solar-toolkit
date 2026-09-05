import { annualProductionPerKw, validMonthlyFactors } from './solar.js';

export function calculateSolarSizing({ mode = 'bill', systemSizeKw: enteredSystemKw, panelCount, panelWatts, monthlyBill, ratePerKwh, monthlyFixedCharge = 0, annualUsageKwh, targetOffsetPct = 100, monthlySolarFactors } = {}) {
  const errors = [];
  const warnings = [];
  const inRange = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
  if (!['bill', 'panels', 'kw'].includes(mode)) errors.push('Choose bill sizing, panel sizing, or direct system kW.');
  if (!inRange(targetOffsetPct, 0, 200)) errors.push('Target annual-energy offset must be between 0% and 200%.');
  if (!validMonthlyFactors(monthlySolarFactors)) errors.push('Enter 12 valid monthly AC production factors.');
  const yieldPerKw = validMonthlyFactors(monthlySolarFactors) ? annualProductionPerKw(monthlySolarFactors) : 0;
  if (yieldPerKw === 0) errors.push('Annual production must be greater than zero to estimate system size and offset.');

  let annualUsage = annualUsageKwh;
  if (annualUsage == null) {
    if (!inRange(monthlyBill, 0, 100000)) errors.push('Monthly bill must be between $0 and $100,000.');
    if (!inRange(monthlyFixedCharge, 0, 100000)) errors.push('Monthly fixed charge must be between $0 and $100,000.');
    if (!inRange(ratePerKwh, 0.0001, 10)) errors.push('Import energy rate must be greater than $0 and no more than $10/kWh.');
    if (monthlyBill < monthlyFixedCharge) errors.push('Monthly bill cannot be lower than the fixed charge.');
    annualUsage = ((monthlyBill - monthlyFixedCharge) / ratePerKwh) * 12;
    warnings.push('Bill sizing assumes an average monthly bill and one blended energy rate. Annual billed kWh is more accurate for tiered or time-of-use tariffs.');
  }
  if (!inRange(annualUsage, 0, 10000000)) errors.push('Annual usage must be between 0 and 10,000,000 kWh.');
  if (mode === 'panels') {
    if (!Number.isInteger(panelCount) || !inRange(panelCount, 1, 2500)) errors.push('Panel count must be a whole number from 1 to 2,500.');
    if (!inRange(panelWatts, 1, 1000)) errors.push('Panel wattage must be between 1 and 1,000 W.');
  }
  if (mode === 'kw' && !inRange(enteredSystemKw, 0, 2500)) errors.push('DC system size must be between 0 and 2,500 kW.');
  if (errors.length) return { systemSizeKw: 0, annualProductionKwh: 0, annualUsageKwh: 0, targetOffsetPct, achievedOffsetPct: 0, errors, warnings };
  const systemSizeKw = mode === 'kw' ? enteredSystemKw : mode === 'panels' ? panelCount * panelWatts / 1000 : annualUsage * targetOffsetPct / 100 / yieldPerKw;
  const annualProductionKwh = systemSizeKw * yieldPerKw;
  const achievedOffsetPct = annualUsage > 0 ? annualProductionKwh / annualUsage * 100 : 0;
  if (systemSizeKw > 50) warnings.push('This is larger than a typical home system. Confirm roof area, interconnection limits, and commercial tariff eligibility.');
  if (achievedOffsetPct > 100) warnings.push('Annual production exceeds usage. Surplus export compensation and utility approval can limit its value.');
  if (annualUsage === 0) warnings.push('No annual usage was entered, so achieved energy offset is shown as 0%.');
  warnings.push('Energy offset compares annual generation with annual usage; it is not the percentage reduction in the bill or grid imports. Fixed charges and export prices still apply.');
  return { systemSizeKw, annualProductionKwh, annualUsageKwh: annualUsage, targetOffsetPct, achievedOffsetPct, errors, warnings };
}
