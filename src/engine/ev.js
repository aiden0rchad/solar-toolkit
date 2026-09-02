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
  // A cleared or invalid custom MPG must not turn the cost model into
  // Infinity/NaN; use the calculator's original 25 MPG baseline until fixed.
  const modeledIceMPG = Number.isFinite(iceMPG) && iceMPG > 0 ? iceMPG : 25;
  const retainedValuePct = Number.isFinite(resalePct)
    ? Math.min(100, Math.max(0, resalePct))
    : 45;
  const purchasePrice = Number.isFinite(evPrice) ? Math.max(0, evPrice) : 0;
  const tradeInCredit = Math.min(
    Number.isFinite(tradeInValue) ? Math.max(0, tradeInValue) : 0,
    purchasePrice,
  );
  const tradeInAppliedToLoan = evPurchaseMethod === 'finance'
    ? tradeInCredit
    : 0;
  const cashDownPayment = evPurchaseMethod === 'finance'
    ? Math.min(Number.isFinite(evDownPayment) ? Math.max(0, evDownPayment) : 0, purchasePrice - tradeInAppliedToLoan)
    : 0;
  const financedPrincipal = purchasePrice - tradeInAppliedToLoan - cashDownPayment;
  const evMonthlyFinance = evLoanPayment(financedPrincipal, evInterestRate, evLoanTerm);
  const gallonsPerYear = annualMiles / modeledIceMPG;
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
  let upfrontEvCost = 0;
  if (evPurchaseMethod === 'finance') {
    // If the ownership window ends before the loan does, the remaining balance
    // gets paid off out of the sale — real money out, so it counts.
    evLoanPayoff = evLoanBalance(financedPrincipal, evInterestRate, evLoanTerm, months);
    upfrontEvCost = cashDownPayment;
    totalEvPayments = evMonthlyFinance * Math.min(evLoanTerm, months) + cashDownPayment + evLoanPayoff;
    resaleCredit = purchasePrice * (retainedValuePct / 100);
  } else if (evPurchaseMethod === 'lease') {
    // A lease doesn't stop costing money when the term ends — assume renewal,
    // with due-at-signing paid once per term actually started (whole signings;
    // nobody pays two-thirds of a signing fee).
    upfrontEvCost = evLeaseDueAtSigning - tradeInCredit;
    totalEvPayments = evLeasePayment * months + evLeaseDueAtSigning * Math.max(1, Math.ceil(months / Math.max(1, evLeaseTerm))) - tradeInCredit;
  } else {
    upfrontEvCost = purchasePrice - tradeInCredit;
    totalEvPayments = upfrontEvCost;
    resaleCredit = purchasePrice * (retainedValuePct / 100);
  }
  const vehicleNetCost = totalEvPayments - resaleCredit;
  const totalEvCost = (elecCostYear + evMaintCost + evRegFee) * years + vehicleNetCost + evInsurance * 12 * years;

  const totalSavings = totalIceCost - totalEvCost;

  const gasCPM = (gasPrice / modeledIceMPG) * 100;
  const evCPM = (elecRate / ev.eff) * 100;
  const co2TonsYear = (gallonsPerYear * 8.887) / 1000; // kg CO2 per gallon burned
  // CA grid ≈ 0.24 kg/kWh; at-home solar charging ≈ 0
  const evCo2TonsYear = (kwhPerYear * (elecRate <= 0.10 ? 0 : 0.24)) / 1000;
  const co2Avoided = Math.max(0, co2TonsYear - evCo2TonsYear);

  // Monthly cumulative cash out for the break-even chart. The end-of-ownership
  // settlement (resale credit minus loan payoff) is deliberately excluded —
  // this series is money spent, and the UI footnote says so.
  const monthlyCumulative = [{ month: 0, ice: 0, ev: upfrontEvCost }];
  let ice = 0;
  let evc = upfrontEvCost;
  for (let m = 1; m <= months; m++) {
    ice += gasCostYear / 12 + iceMaintCost / 12 + currentInsurance + (currentCarStatus === 'loan' && m <= currentCarMonthsLeft ? currentCarPayment : 0);
    evc += elecCostYear / 12 + evMaintCost / 12 + evInsurance + evRegFee / 12;
    if (evPurchaseMethod === 'finance' && m <= evLoanTerm) evc += evMonthlyFinance;
    if (evPurchaseMethod === 'lease') { evc += evLeasePayment; if (m > evLeaseTerm && m % evLeaseTerm === 1) evc += evLeaseDueAtSigning; }
    monthlyCumulative.push({ month: m, ice, ev: evc });
  }

  // Break even is the start of the final uninterrupted stretch where the EV
  // costs no more. A temporary early crossover is not reported as a win.
  let breakEvenMonth = null;
  for (let m = months; m >= 1; m--) {
    if (monthlyCumulative[m].ev > monthlyCumulative[m].ice + 0.005) break;
    breakEvenMonth = m;
  }
  const cumulative = monthlyCumulative
    .filter(({ month }) => month === 0 || month % 3 === 0 || month === months || month === breakEvenMonth)
    .map(({ month, ice: iceCost, ev: evCost }) => ({ month, ice: Math.round(iceCost), ev: Math.round(evCost) }));

  return {
    totalIceCost, totalEvCost, totalSavings, gasCostYear, elecCostYear,
    currentMonthlyTotal, evMonthlyTotal, evMonthlyPayment, evMonthlyFinance,
    gasCPM, evCPM, co2Avoided, cumulative, breakEvenMonth,
    resaleCredit, totalEvPayments, totalCurrentLoan, evLoanPayoff,
    financedPrincipal, tradeInAppliedToLoan, cashDownPayment, upfrontEvCost,
    vehicleNetCost, settlementNetCredit: resaleCredit - evLoanPayoff,
    modeledIceMPG, retainedValuePct, tradeInCredit,
  };
};
