import { annualProductionPerKw, DAYS_IN_MONTH, LOAD_SHAPES, MONTH_NAMES, SUN_PROFILES, validMonthlyFactors } from './solar.js';

// --- SHARED ROI SIMULATION ENGINE ---
export const calculatePMT = (principal, annualRate, years) => {
  if (![principal, annualRate, years].every(Number.isFinite) || principal <= 0 || years <= 0 || annualRate < 0) return 0;
  const monthlyRate = annualRate / 100 / 12;
  const numberOfPayments = years * 12;
  if (monthlyRate === 0) return principal / numberOfPayments;
  return principal * monthlyRate / -Math.expm1(-numberOfPayments * Math.log1p(monthlyRate));
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
  monthlySolarFactors, panelDegradationPct = 0.5,
  annualGenerationCapKwh = null, annualExportCapKwh = null,
  exportCompensation = 'net-billing', monthlySolarChargePerKw = 0,
  purchaseMethod = 'loan', financedAmount, existingSolarInterest = 5,
}) => {
  const safe = val => Number.isFinite(Number(val)) ? Number(val) : 0;
  const warnings = [];
  const suppliedSun = monthlySolarFactors ?? SUN_PROFILES[sunProfile];
  const sun = validMonthlyFactors(suppliedSun) ? suppliedSun : Array(12).fill(0);
  if (!validMonthlyFactors(suppliedSun)) warnings.push('Missing or invalid monthly solar resource: production is zero until 12 valid values or a supported resource are selected.');
  if (monthlySolarFactors == null && SUN_PROFILES[sunProfile]) warnings.push('Legacy climate factors are illustrative and not a verified dataset. Select a sourced resource or enter monthly production.');
  const cap = (value, label) => {
    if (value == null || value === '') return Infinity;
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
    warnings.push(`Invalid ${label} ignored; use a nonnegative annual kWh value or leave it blank.`);
    return Infinity;
  };
  const generationCap = cap(annualGenerationCapKwh, 'generation cap');
  const exportCap = cap(annualExportCapKwh, 'export cap');
  const panelFade = Number.isFinite(panelDegradationPct) && panelDegradationPct >= 0 && panelDegradationPct <= 100 ? panelDegradationPct / 100 : 0.005;
  if (panelFade * 100 !== panelDegradationPct) warnings.push('Invalid panel degradation replaced with 0.5%/year.');
  const systemKw = Math.max(0, safe(solarSize));
  const netMetering = exportCompensation === 'annual-net-metering';
  if (netMetering) warnings.push('Energy credits roll forward within a January–December year, cannot pay fixed charges, and expire without payout at year end. The monthly bill shown is an annual average.');
  if (Number.isFinite(generationCap)) warnings.push(`Annual generation is limited to ${generationCap} kWh by scaling every month proportionally; this is an energy-limit approximation, not an instantaneous inverter limit.`);
  if (Number.isFinite(exportCap)) warnings.push(`Annual exports are limited to ${exportCap} kWh in calendar order. Additional surplus is curtailed without compensation; this does not model an instantaneous kW export limit.`);
  const netSystemCost = Math.max(0, safe(loanAmount) - Math.max(0, safe(incentives)));
  let principalNew = purchaseMethod === 'cash' ? 0 : Math.min(netSystemCost, Math.max(0, financedAmount == null ? netSystemCost : safe(financedAmount)));
  if (principalNew > 0 && safe(loanTerm) <= 0) {
    warnings.push('A positive loan term is required for financing. This estimate treats the purchase as cash until a valid term is entered.');
    principalNew = 0;
  }
  const upfrontCost = netSystemCost - principalNew;
  const monthlyPaymentNew = calculatePMT(principalNew, Math.max(0, safe(loanInterest)), safe(loanTerm));
  const hasExistingLoan = proposalMode === 'retrofit' && existingSolarType === 'loan';
  const hasExistingPpa = proposalMode === 'retrofit' && existingSolarType === 'ppa';
  if (hasExistingLoan && existingSolarBalance > 0) warnings.push(`Existing solar loan uses ${existingSolarInterest}% APR. Verify it against the current loan statement.`);
    const data = [];
    let balanceNew = principalNew;
    let balanceExistingLoan = hasExistingLoan ? Math.max(0, safe(existingSolarBalance)) : 0;
    let currentMonthlyPPA = Math.max(0, safe(existingSolarPayment));
    const ppaEsc = safe(ppaEscalator) / 100;
    let cumulativeStatusQuo = balanceExistingLoan;
    let cumulativeProposed = netSystemCost + balanceExistingLoan;
    let cumulativeGridOnly = 0;
    let cumulativeProposedSpend = upfrontCost;
    let cumulativeGridSpend = 0;

    const usableCapacityNew = safe(batteryCapacity) * (safe(depthOfDischarge) / 100) * ((100 - safe(minSoC)) / 100);
    const usage = Math.max(0, safe(dailyUsage));
    const peakPct = Math.min(1, Math.max(0, safe(peakUsagePercent) / 100));
    const rte = Math.min(1, Math.max(0.5, safe(roundTripEfficiency) / 100));

    const rPeak = safe(ratePeak);
    const rOffPeak = safe(rateOffPeak);
    const rExport = safe(solarExportRate); // avoided-cost exports do NOT inflate with retail rates
    const rInflation = safe(inflationRate);
    const rDegradation = safe(degradationRate);
    const fixedAnnual = safe(monthlyFixedCharge) * 12;
    const shapeRaw = LOAD_SHAPES[loadShape] || LOAD_SHAPES['Flat'];
    const shapeSum = shapeRaw.reduce((sum, value, month) => sum + value * DAYS_IN_MONTH[month], 0);
    const shape = shapeRaw.map(v => (v * 365) / shapeSum); // preserve dailyUsage × 365 annual kWh

    const monthlyPmtNew = safe(monthlyPaymentNew);
    const monthlyPmtExisting = Math.max(0, safe(existingSolarPayment));
    const rateNew = Math.max(0, safe(loanInterest)) / 100 / 12;
    const rateExisting = Math.max(0, safe(existingSolarInterest)) / 100 / 12;

    let monthlyProfileY1 = null;
    let selfSufficiencyY1 = 0;
    let peakCoverageY1 = 0;

    for (let year = 0; year <= 25; year++) {
      // Year 0 is the investment point; year 1 is the first operating year.
      const elapsedYears = Math.max(0, year - 1);
      const esc = Math.pow(1 + rInflation / 100, elapsedYears);
      const rates = { peak: rPeak * esc, offPeak: rOffPeak * esc, export: rExport * (netMetering ? esc : 1) };
      const usableCapacity = usableCapacityNew * Math.pow(1 - rDegradation / 100, elapsedYears);
      const solarDerate = Math.pow(1 - panelFade, elapsedYears);
      const uncappedProduction = systemKw * annualProductionPerKw(sun) * solarDerate;
      const generationScale = uncappedProduction > 0 ? Math.min(1, generationCap / uncappedProduction) : 1;
      const annualProductionKwh = uncappedProduction * generationScale;
      const yearWarnings = [...warnings];
      if (generationScale < 1) yearWarnings.push(`Generation cap curtails ${Math.round(uncappedProduction - annualProductionKwh)} kWh this year.`);

      // --- annual bills built month by month ---
      const solarCapacityCharge = systemKw * Math.max(0, safe(monthlySolarChargePerKw)) * 12;
      let annualUtilityBillProposed = fixedAnnual + solarCapacityCharge;
      let annualBillStatusQuo = fixedAnnual + (proposalMode === 'retrofit' ? solarCapacityCharge : 0);
      let annualBillGridOnly = fixedAnnual;
      let annualImports = 0;
      let annualLoad = 0;
      let annualPeakLoad = 0;
      let annualPeakImports = 0;
      let annualExportsKwh = 0;
      let annualCurtailedExportsKwh = 0;
      let statusQuoExports = 0;
      let proposedCredit = 0;
      let statusQuoCredit = 0;
      const monthRows = [];

      const applyCredit = (bill, credit) => netMetering
        ? { bill: Math.max(0, bill - credit), credit: Math.max(0, credit - bill) }
        : { bill, credit: 0 };

      for (let m = 0; m < 12; m++) {
        const monthUsage = usage * shape[m]; // seasonal daily usage for this month
        const days = DAYS_IN_MONTH[m];
        annualLoad += monthUsage * days;
        annualPeakLoad += monthUsage * peakPct * days;
        annualBillGridOnly += (monthUsage * peakPct * rates.peak + monthUsage * (1 - peakPct) * rates.offPeak) * days;

        const dailySolar = systemKw * sun[m] * solarDerate * generationScale;
        const withBattery = simulateDay(dailySolar, monthUsage, peakPct, usableCapacity, rte, rates, strategy);
        const exports = withBattery.exported * days;
        const allowedExports = Math.min(exports, Math.max(0, exportCap - annualExportsKwh));
        annualExportsKwh += allowedExports;
        annualCurtailedExportsKwh += exports - allowedExports;
        const proposedBilling = applyCredit(withBattery.bill * days + (exports - allowedExports) * rates.export, proposedCredit);
        proposedCredit = proposedBilling.credit;
        annualUtilityBillProposed += proposedBilling.bill;
        annualImports += withBattery.imported * days;
        annualPeakImports += withBattery.peakImported * days;

        if (proposalMode === 'retrofit') {
          // status quo = same solar, no battery
          const noBattery = simulateDay(dailySolar, monthUsage, peakPct, 0, rte, rates);
          const noBatteryExports = noBattery.exported * days;
          const allowedStatusQuoExports = Math.min(noBatteryExports, Math.max(0, exportCap - statusQuoExports));
          statusQuoExports += allowedStatusQuoExports;
          const statusQuoBilling = applyCredit(noBattery.bill * days + (noBatteryExports - allowedStatusQuoExports) * rates.export, statusQuoCredit);
          statusQuoCredit = statusQuoBilling.credit;
          annualBillStatusQuo += statusQuoBilling.bill;
        }
        if (year === 1) monthRows.push({
          month: MONTH_NAMES[m],
          production: Math.round(dailySolar * days),
          usage: Math.round(monthUsage * days),
        });
      }

      if (annualCurtailedExportsKwh > 0.00001) yearWarnings.push(`Export cap curtails ${Math.round(annualCurtailedExportsKwh)} kWh this year without credit.`);
      if (proposedCredit > 0.005) yearWarnings.push(`Unused energy credit of $${proposedCredit.toFixed(2)} expires at year end and is not counted as savings.`);

      if (proposalMode !== 'retrofit') annualBillStatusQuo = annualBillGridOnly;
      if (year === 1) {
        monthlyProfileY1 = monthRows;
        selfSufficiencyY1 = annualLoad > 0 ? Math.max(0, Math.min(100, (1 - annualImports / annualLoad) * 100)) : 0;
        peakCoverageY1 = annualPeakLoad > 0 ? Math.max(0, Math.min(100, (1 - annualPeakImports / annualPeakLoad) * 100)) : 0;
      }

      let annualNewPmtReal = 0;
      let annualNewInterest = 0;
      if (balanceNew > 0 && year > 0) {
        for (let month = 0; month < 12 && balanceNew > 0; month++) {
          const interest = balanceNew * rateNew;
          const payment = Math.min(balanceNew + interest, monthlyPmtNew);
          annualNewPmtReal += payment;
          annualNewInterest += interest;
          balanceNew = Math.max(0, balanceNew + interest - payment);
          if (balanceNew < 1e-7) balanceNew = 0;
        }
      }

      let annualExistingSolarCost = 0;
      let annualExistingInterest = 0;
      if (proposalMode === 'retrofit' && year > 0) {
        if (hasExistingLoan && balanceExistingLoan > 0) {
          for (let month = 0; month < 12 && balanceExistingLoan > 0; month++) {
            const interest = balanceExistingLoan * rateExisting;
            const payment = Math.min(balanceExistingLoan + interest, monthlyPmtExisting);
            annualExistingSolarCost += payment;
            annualExistingInterest += interest;
            balanceExistingLoan = Math.max(0, balanceExistingLoan + interest - payment);
            if (balanceExistingLoan < 1e-7) balanceExistingLoan = 0;
          }
          if (annualExistingSolarCost <= annualExistingInterest) yearWarnings.push('Existing solar payments do not reduce the loan principal. Check payment and APR inputs.');
        } else if (hasExistingPpa) {
          annualExistingSolarCost = currentMonthlyPPA * 12;
          currentMonthlyPPA = currentMonthlyPPA * (1 + ppaEsc);
          annualExistingInterest = annualExistingSolarCost;
        }
      }

      if (year > 0) {
        cumulativeGridSpend += annualBillGridOnly;
        cumulativeProposedSpend += (annualUtilityBillProposed + annualNewPmtReal + annualExistingSolarCost);
        cumulativeGridOnly += annualBillGridOnly;
        cumulativeStatusQuo += (annualBillStatusQuo + annualExistingInterest);
        cumulativeProposed += (annualUtilityBillProposed + annualNewInterest + annualExistingInterest);
      }

      const totalOutstandingDebt = balanceNew + balanceExistingLoan;
      // A retrofit must earn its cost against keeping the existing solar, not
      // against buying every kWh from the grid with no solar at all.
      const netLiability = proposalMode === 'retrofit'
        ? cumulativeProposed - cumulativeStatusQuo
        : (totalOutstandingDebt + cumulativeProposedSpend) - cumulativeGridSpend;
      const monthlyExistingCost = year === 0 ? (hasExistingPpa || balanceExistingLoan > 0 ? monthlyPmtExisting : 0) : annualExistingSolarCost / 12;
      const monthlyNewCost = year === 0 ? monthlyPmtNew : annualNewPmtReal / 12;

      data.push({
        year,
        netLiability: Math.round(netLiability),
        gridOnly: Math.round(cumulativeGridOnly),
        statusQuo: Math.round(cumulativeStatusQuo),
        proposed: Math.round(cumulativeProposed),
        monthlyBillNow: Math.round(annualBillStatusQuo / 12 + monthlyExistingCost),
        monthlyBillFuture: Math.round(annualUtilityBillProposed / 12 + monthlyNewCost + monthlyExistingCost),
        monthlyProfileY1,
        selfSufficiencyY1,
        peakCoverageY1,
        annualUtilityBillProposed,
        annualBillGridOnly,
        annualProductionKwh,
        annualUsageKwh: annualLoad,
        annualExportsKwh,
        annualCurtailedGenerationKwh: uncappedProduction - annualProductionKwh,
        annualCurtailedExportsKwh,
        annualCreditExpired: proposedCredit,
        upfrontCost,
        annualLoanPayment: annualNewPmtReal,
        annualLoanInterest: annualNewInterest,
        remainingLoanBalance: balanceNew,
        warnings: yearWarnings,
      });
    }
    return data;
};

export const findBreakEven = (simulationData) => {
  if (!Array.isArray(simulationData) || simulationData.length === 0
    || simulationData.some(row => !Number.isFinite(row.netLiability))) return null;
  // The final positive balance determines the start of sustained savings.
  // An earlier crossing can reverse as production degrades or fees continue.
  let crossingIndex = 0;
  simulationData.forEach((row, index) => { if (row.netLiability > 0) crossingIndex = index + 1; });
  if (crossingIndex === simulationData.length) return null;
  if (crossingIndex === 0) return '0.0';
  const previous = simulationData[crossingIndex - 1];
  const current = simulationData[crossingIndex];
  const fraction = previous.netLiability / (previous.netLiability - current.netLiability);
  const previousYear = previous.year ?? crossingIndex - 1;
  const currentYear = current.year ?? crossingIndex;
  return (previousYear + (currentYear - previousYear) * fraction).toFixed(1);
};
