import { DAYS_IN_MONTH, LOAD_SHAPES, MONTH_NAMES, SUN_PROFILES } from './solar.js';

// --- SHARED ROI SIMULATION ENGINE ---
export const calculatePMT = (principal, annualRate, years) => {
  if (principal <= 0 || years <= 0) return 0;
  const monthlyRate = annualRate / 100 / 12;
  const numberOfPayments = years * 12;
  if (monthlyRate === 0) return principal / numberOfPayments;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
};

// Simulates one day of a given month: solar production, battery cycling with
// round-trip losses, TOU billing. The battery can only discharge what excess
// solar actually put into it — no free energy.
// strategy: 'self' = charge from solar surplus only; 'arbitrage' = also top up
// from cheap off-peak grid so the expensive peak window is always battery-covered
export const simulateDay = (dailySolar, load, peakPct, usableCapacity, rte, rates, strategy = 'self') => {
  const loadPeak = load * peakPct;
  const loadOffPeak = load - loadPeak;
  const SOLAR_PEAK_RATIO = 0.15; // share of production falling in the 4–9pm window
  const solarPeak = dailySolar * SOLAR_PEAK_RATIO;
  const solarOffPeak = dailySolar - solarPeak;

  // Midday surplus is the only energy available to charge the battery, and it
  // only banks what tonight's peak window will actually consume
  const surplus = Math.max(0, solarOffPeak - loadOffPeak);
  const peakDeficit = Math.max(0, loadPeak - solarPeak);
  const chargeIn = Math.min(surplus, usableCapacity / rte, peakDeficit / rte);
  let discharge = chargeIn * rte; // retrievable energy after round-trip losses
  let offPeakImport = Math.max(0, loadOffPeak - solarOffPeak);

  // Arbitrage: buy cheap off-peak power to fill whatever the peak window still
  // needs — only when it actually beats paying peak rates after losses
  if (strategy === 'arbitrage' && rates.peak * rte > rates.offPeak) {
    const extraStored = Math.min(usableCapacity - discharge, peakDeficit - discharge);
    if (extraStored > 0) {
      offPeakImport += extraStored / rte;
      discharge += extraStored;
    }
  }

  const peakImport = peakDeficit - discharge;
  const exported = Math.max(0, surplus - chargeIn + Math.max(0, solarPeak - loadPeak));

  return {
    bill: peakImport * rates.peak + offPeakImport * rates.offPeak - exported * rates.export,
    imported: peakImport + offPeakImport,
    peakImported: peakImport,
    exported,
  };
};

export const runRoiSimulation = ({
  loanAmount, incentives = 0, loanInterest, loanTerm, proposalMode, existingSolarType,
  existingSolarBalance, existingSolarPayment, ppaEscalator,
  batteryCapacity, depthOfDischarge, minSoC, roundTripEfficiency, degradationRate,
  dailyUsage, peakUsagePercent, ratePeak, rateOffPeak, inflationRate,
  solarSize, sunProfile, monthlyFixedCharge, solarExportRate, loadShape = 'Flat',
  strategy = 'self',
}) => {
  const safe = (val) => isNaN(val) ? 0 : val;
  const netSystemCost = Math.max(0, safe(loanAmount) - Math.max(0, safe(incentives)));
  const monthlyPaymentNew = calculatePMT(netSystemCost, safe(loanInterest), safe(loanTerm));
    const data = [];
    let balanceNew = netSystemCost;
    let balanceExistingLoan = existingSolarType === 'loan' ? safe(existingSolarBalance) : 0;
    let currentMonthlyPPA = safe(existingSolarPayment);
    const ppaEsc = safe(ppaEscalator) / 100;
    let cumulativeStatusQuo = existingSolarType === 'loan' ? balanceExistingLoan : 0;
    let cumulativeProposed = netSystemCost + (existingSolarType === 'loan' ? balanceExistingLoan : 0);
    let cumulativeGridOnly = 0;
    let cumulativeProposedSpend = 0;
    let cumulativeGridSpend = 0;

    const usableCapacityNew = safe(batteryCapacity) * (safe(depthOfDischarge) / 100) * ((100 - safe(minSoC)) / 100);
    const usage = safe(dailyUsage);
    const peakPct = safe(peakUsagePercent) / 100;
    const rte = Math.min(1, Math.max(0.5, safe(roundTripEfficiency) / 100));
    const sun = SUN_PROFILES[sunProfile];
    const SOLAR_DEGRADATION = 0.005; // panels fade ~0.5%/yr

    const rPeak = safe(ratePeak);
    const rOffPeak = safe(rateOffPeak);
    const rExport = safe(solarExportRate); // avoided-cost exports do NOT inflate with retail rates
    const rInflation = safe(inflationRate);
    const rDegradation = safe(degradationRate);
    const fixedAnnual = safe(monthlyFixedCharge) * 12;
    const shapeRaw = LOAD_SHAPES[loadShape] || LOAD_SHAPES['Flat'];
    const shapeSum = shapeRaw.reduce((a, b) => a + b, 0);
    const shape = shapeRaw.map(v => (v * 12) / shapeSum); // normalize: avg multiplier = 1

    const monthlyPmtNew = safe(monthlyPaymentNew);
    const monthlyPmtExisting = safe(existingSolarPayment);
    const rateNew = safe(loanInterest) / 100;
    const rateExisting = 0.05;

    let monthlyProfileY1 = null;
    let selfSufficiencyY1 = 0;
    let peakCoverageY1 = 0;

    for (let year = 0; year <= 25; year++) {
      const esc = Math.pow(1 + rInflation / 100, year);
      const rates = { peak: rPeak * esc, offPeak: rOffPeak * esc, export: rExport };
      const usableCapacity = usableCapacityNew * Math.pow(1 - rDegradation / 100, year);
      const solarDerate = Math.pow(1 - SOLAR_DEGRADATION, year);

      // --- annual bills built month by month ---
      let annualUtilityBillProposed = fixedAnnual;
      let annualBillStatusQuo = fixedAnnual;
      let annualBillGridOnly = fixedAnnual;
      let annualImports = 0;
      let annualLoad = 0;
      let annualPeakLoad = 0;
      let annualPeakImports = 0;
      const monthRows = [];

      for (let m = 0; m < 12; m++) {
        const monthUsage = usage * shape[m]; // seasonal daily usage for this month
        const days = DAYS_IN_MONTH[m];
        annualLoad += monthUsage * days;
        annualPeakLoad += monthUsage * peakPct * days;
        annualBillGridOnly += (monthUsage * peakPct * rates.peak + monthUsage * (1 - peakPct) * rates.offPeak) * days;

        const dailySolar = safe(solarSize) * sun[m] * solarDerate;
        const withBattery = simulateDay(dailySolar, monthUsage, peakPct, usableCapacity, rte, rates, strategy);
        annualUtilityBillProposed += withBattery.bill * days;
        annualImports += withBattery.imported * days;
        annualPeakImports += withBattery.peakImported * days;

        if (proposalMode === 'retrofit') {
          // status quo = same solar, no battery
          const noBattery = simulateDay(dailySolar, monthUsage, peakPct, 0, rte, rates);
          annualBillStatusQuo += noBattery.bill * days;
        }
        if (year === 1) monthRows.push({
          month: MONTH_NAMES[m],
          production: Math.round(dailySolar * days),
          usage: Math.round(monthUsage * days),
        });
      }

      if (proposalMode !== 'retrofit') annualBillStatusQuo = annualBillGridOnly;
      if (year === 1) {
        monthlyProfileY1 = monthRows;
        selfSufficiencyY1 = annualLoad > 0 ? Math.max(0, Math.min(100, (1 - annualImports / annualLoad) * 100)) : 0;
        peakCoverageY1 = annualPeakLoad > 0 ? Math.max(0, Math.min(100, (1 - annualPeakImports / annualPeakLoad) * 100)) : 0;
      }

      let annualNewPmtReal = 0;
      let annualNewInterest = 0;
      if (balanceNew > 0 && year > 0) {
        const annualPmt = monthlyPmtNew * 12;
        const interest = balanceNew * rateNew;
        const principal = annualPmt - interest;
        if (balanceNew <= annualPmt) {
          annualNewPmtReal = balanceNew + (balanceNew * rateNew);
          annualNewInterest = balanceNew * rateNew;
          balanceNew = 0;
        } else {
          annualNewPmtReal = annualPmt;
          annualNewInterest = interest;
          balanceNew -= principal;
        }
      }

      let annualExistingSolarCost = 0;
      let annualExistingInterest = 0;
      if (proposalMode === 'retrofit' && year > 0) {
        if (existingSolarType === 'loan' && balanceExistingLoan > 0) {
          const annualPmt = monthlyPmtExisting * 12;
          const interest = balanceExistingLoan * rateExisting;
          const principal = annualPmt - interest;
          if (balanceExistingLoan <= annualPmt) {
            annualExistingSolarCost = balanceExistingLoan + (balanceExistingLoan * rateExisting);
            annualExistingInterest = balanceExistingLoan * rateExisting;
            balanceExistingLoan = 0;
          } else {
            annualExistingSolarCost = annualPmt;
            annualExistingInterest = interest;
            balanceExistingLoan -= principal;
          }
        } else if (existingSolarType === 'ppa') {
          annualExistingSolarCost = currentMonthlyPPA * 12;
          currentMonthlyPPA = currentMonthlyPPA * (1 + ppaEsc);
          annualExistingInterest = annualExistingSolarCost;
        }
      }

      if (year > 0) {
        cumulativeGridSpend += annualBillGridOnly;
        cumulativeProposedSpend += (annualUtilityBillProposed + annualNewPmtReal + annualExistingSolarCost);
        cumulativeGridOnly += annualBillGridOnly;
        cumulativeStatusQuo += (annualBillStatusQuo + annualExistingSolarCost);
        cumulativeProposed += (annualUtilityBillProposed + annualNewInterest + annualExistingInterest);
      }

      const totalOutstandingDebt = balanceNew + (existingSolarType === 'loan' ? balanceExistingLoan : 0);
      const netLiability = (totalOutstandingDebt + cumulativeProposedSpend) - cumulativeGridSpend;
      const displayPPA = existingSolarType === 'ppa' ? currentMonthlyPPA : 0;

      data.push({
        year,
        netLiability: Math.round(netLiability),
        gridOnly: Math.round(cumulativeGridOnly),
        statusQuo: Math.round(cumulativeStatusQuo),
        proposed: Math.round(cumulativeProposed),
        monthlyBillNow: Math.round((annualBillStatusQuo / 12) + (proposalMode === 'retrofit' && year === 0 ? existingSolarPayment : displayPPA / (1 + ppaEsc))),
        monthlyBillFuture: Math.round((annualUtilityBillProposed / 12) + monthlyPmtNew + (proposalMode === 'retrofit' ? (existingSolarType === 'ppa' ? displayPPA / (1 + ppaEsc) : existingSolarPayment) : 0)),
        monthlyProfileY1,
        selfSufficiencyY1,
        peakCoverageY1,
      });
    }
    return data;
};

export const findBreakEven = (simulationData) => {
  for (let i = 1; i < simulationData.length; i++) {
    if (simulationData[i].netLiability < 0 && simulationData[i - 1].netLiability >= 0) {
      const prev = simulationData[i - 1].netLiability;
      const curr = simulationData[i].netLiability;
      const fraction = prev / (prev - curr);
      return (i - 1 + fraction).toFixed(1);
    }
  }
  return null;
};
