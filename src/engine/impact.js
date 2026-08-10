const CO2_KG_PER_KWH = 0.4; // Approximate US grid average avoided emissions.
const CO2_KG_PER_TREE_YEAR = 21;
const CO2_KG_PER_CAR_YEAR = 4600;

export const calculateImpact = ({ roi, usage } = {}) => {
  const roiProduction = Number(roi?.annualProductionKwh);
  const dailyUsage = Number(usage?.dailyKwh);
  const annualProductionKwh = roiProduction > 0
    ? roiProduction
    : dailyUsage > 0 ? dailyUsage * 365 : null;

  if (!annualProductionKwh) return null;

  const co2Kg = annualProductionKwh * CO2_KG_PER_KWH;
  return {
    annualProductionKwh,
    co2Kg,
    trees: co2Kg / CO2_KG_PER_TREE_YEAR,
    cars: co2Kg / CO2_KG_PER_CAR_YEAR,
  };
};
