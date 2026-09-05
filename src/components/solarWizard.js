import { buildMonthlySolarFactors, LOAD_SHAPES, SOLAR_RESOURCE_PROFILES } from '../engine/solar';

export const isSolarExperience = value => ['choose', 'guided', 'summary', 'full'].includes(value);
export const isSolarWizardStep = value => Number.isInteger(value) && value >= 0 && value < 4;

export function solarWizardErrors(step, { monthlyBill, loadShape, solar, locationConfirmed, financeErrors = [] }) {
  const v = solar.values;
  if (step === 0) return [
    ...(!Number.isFinite(monthlyBill) || monthlyBill < 0 || monthlyBill > 100000 ? ['Enter an average monthly bill between $0 and $100,000.'] : []),
    ...(!Object.hasOwn(LOAD_SHAPES, loadShape) ? ['Choose how your electricity use changes through the year.'] : []),
  ];
  if (step === 1) return [
    ...(!locationConfirmed || !solar.profile ? ['Choose a regional starting point, or select Other location.'] : []),
    ...(!Number.isFinite(solar.blendedRate) || solar.blendedRate <= 0 || solar.blendedRate > 10 ? ['Enter your electricity price, greater than $0 and no more than $10 per kWh.'] : []),
    ...(!Number.isFinite(v.monthlyFixedCharge) || v.monthlyFixedCharge < 0 || v.monthlyFixedCharge > monthlyBill ? ['Your monthly fixed charge must be between $0 and your monthly bill.'] : []),
    ...(v.manualMonthlyValues == null && !SOLAR_RESOURCE_PROFILES.some(profile => profile.id === v.resourceId)
      ? ['Choose a representative sunlight location, or enter your monthly sunlight data in the full calculator.']
      : buildMonthlySolarFactors(v).errors),
  ];
  if (step === 2) return solar.sizing.errors;
  return [...new Set([...solar.errors, ...financeErrors])];
}
