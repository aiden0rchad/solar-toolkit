// --- EV vs GAS TOTAL-COST ENGINE ---
// Pure functions, no React. Dollars throughout; loan terms in months.

export const evLoanPayment = (principal, annualRate, months) => {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
};

// Remaining balance after k monthly payments on an amortized loan.
export const evLoanBalance = (principal, annualRate, months, k) => {
  if (principal <= 0 || months <= 0 || k >= months) return 0;
  if (k <= 0) return principal;
  const r = annualRate / 100 / 12;
  if (r === 0) return principal * (1 - k / months);
  const pmt = evLoanPayment(principal, annualRate, months);
  const g = Math.pow(1 + r, k);
  return principal * g - pmt * ((g - 1) / r);
};

export const computeEvStats = ({
  ev, years, annualMiles, gasPrice, iceMPG, elecRate, iceMaintCost, evMaintCost,
  currentCarStatus, currentCarPayment, currentCarMonthsLeft, currentInsurance,
  evPurchaseMethod, evPrice, evDownPayment, evLoanTerm, evInterestRate,
  evLeasePayment, evLeaseTerm, evLeaseDueAtSigning, evInsurance, evRegFee,
  tradeInValue, resalePct,
}) => {
  const months = years * 12;
  const evMonthlyFinance = evLoanPayment(evPrice - evDownPayment, evInterestRate, evLoanTerm);
  const gallonsPerYear = annualMiles / iceMPG;
  const gasCostYear = gallonsPerYear * gasPrice;
  // Efficiency values are EPA wall-to-wheels (MPGe ÷ 33.7), so charging losses
  // are already included — do NOT add another loss factor.
  const kwhPerYear = annualMiles / ev.eff;
  const elecCostYear = kwhPerYear * elecRate;

  const currentMonthlyLoan = currentCarStatus === 'loan' ? currentCarPayment : 0;
  const currentMonthlyTotal = currentMonthlyLoan + gasCostYear / 12 + iceMaintCost / 12 + currentInsurance;

  let evMonthlyPayment = 0;
  if (evPurchaseMethod === 'finance') evMonthlyPayment = evMonthlyFinance;
  else if (evPurchaseMethod === 'lease') evMonthlyPayment = evLeasePayment;
  const evMonthlyTotal = evMonthlyPayment + elecCostYear / 12 + evMaintCost / 12 + evInsurance + evRegFee / 12;

  const currentCarLoanMonths = currentCarStatus === 'loan' ? Math.min(currentCarMonthsLeft, months) : 0;
  const totalCurrentLoan = currentMonthlyLoan * currentCarLoanMonths;
  const totalIceCost = (gasCostYear + iceMaintCost) * years + totalCurrentLoan + currentInsurance * 12 * years;

  let totalEvPayments = 0;
  let resaleCredit = 0;
  let evLoanPayoff = 0;
  if (evPurchaseMethod === 'finance') {
    // If the ownership window ends before the loan does, the remaining balance
    // gets paid off out of the sale — real money out, so it counts.
    evLoanPayoff = evLoanBalance(evPrice - evDownPayment, evInterestRate, evLoanTerm, months);
    totalEvPayments = evMonthlyFinance * Math.min(evLoanTerm, months) + evDownPayment + evLoanPayoff;
    resaleCredit = evPrice * (resalePct / 100);
  } else if (evPurchaseMethod === 'lease') {
    // A lease doesn't stop costing money when the term ends — assume renewal,
    // with due-at-signing paid once per term actually started (whole signings;
    // nobody pays two-thirds of a signing fee).
    totalEvPayments = evLeasePayment * months + evLeaseDueAtSigning * Math.max(1, Math.ceil(months / Math.max(1, evLeaseTerm)));
  } else {
    totalEvPayments = evPrice;
    resaleCredit = evPrice * (resalePct / 100);
  }
  const totalEvCost = (elecCostYear + evMaintCost + evRegFee) * years + totalEvPayments + evInsurance * 12 * years - tradeInValue - resaleCredit;

  const totalSavings = totalIceCost - totalEvCost;

  const gasCPM = (gasPrice / iceMPG) * 100;
  const evCPM = (elecRate / ev.eff) * 100;
  const co2TonsYear = (gallonsPerYear * 8.887) / 1000; // kg CO2 per gallon burned
  // CA grid ≈ 0.24 kg/kWh; at-home solar charging ≈ 0
  const evCo2TonsYear = (kwhPerYear * (elecRate <= 0.10 ? 0 : 0.24)) / 1000;
  const co2Avoided = Math.max(0, co2TonsYear - evCo2TonsYear);

  // Monthly cumulative cash out for the break-even chart. The end-of-ownership
  // settlement (resale credit minus loan payoff) is deliberately excluded —
  // this series is money spent, and the UI footnote says so.
  const cumulative = [];
  let ice = 0;
  let evc = evPurchaseMethod === 'finance' ? evDownPayment : evPurchaseMethod === 'lease' ? evLeaseDueAtSigning : evPrice;
  evc -= tradeInValue;
  let breakEvenMonth = null;
  for (let m = 1; m <= months; m++) {
    ice += gasCostYear / 12 + iceMaintCost / 12 + currentInsurance + (currentCarStatus === 'loan' && m <= currentCarMonthsLeft ? currentCarPayment : 0);
    evc += elecCostYear / 12 + evMaintCost / 12 + evInsurance + evRegFee / 12;
    if (evPurchaseMethod === 'finance' && m <= evLoanTerm) evc += evMonthlyFinance;
    if (evPurchaseMethod === 'lease') { evc += evLeasePayment; if (m > evLeaseTerm && m % evLeaseTerm === 1) evc += evLeaseDueAtSigning; }
    if (m % 3 === 0 || m === months) cumulative.push({ month: m, ice: Math.round(ice), ev: Math.round(evc) });
    if (breakEvenMonth === null && evc < ice) breakEvenMonth = m;
  }

  return {
    totalIceCost, totalEvCost, totalSavings, gasCostYear, elecCostYear,
    currentMonthlyTotal, evMonthlyTotal, evMonthlyPayment, evMonthlyFinance,
    gasCPM, evCPM, co2Avoided, cumulative, breakEvenMonth,
    resaleCredit, totalEvPayments, totalCurrentLoan, evLoanPayoff,
  };
};
