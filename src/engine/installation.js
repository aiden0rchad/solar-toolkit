import { calculatePMT, runRoiSimulation } from './roi.js';

export const INSTALLATION_COST_FIELDS = ['equipment', 'labor', 'permitting', 'interconnection', 'tax', 'contingency'];

const overrideFields = [...INSTALLATION_COST_FIELDS, 'incentives', 'financedAmount', 'interestRate', 'loanYears', 'annualMaintenance', 'maintenanceEscalation', 'replacementCost', 'replacementYear'];
export const validInstallationOverrides = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && Object.entries(value).every(([key, field]) => key === 'paymentMethod'
    ? ['cash', 'loan'].includes(field)
    : overrideFields.includes(key) && (key === 'financedAmount' && field === null || Number.isFinite(field)));

// Editable planning allowances, not market quotes. Dollar amounts scale with DC size.
export const installationDefaults = (systemSize, kind) => ({
  equipment: Math.round(Math.max(0, systemSize) * 1200),
  labor: kind === 'diy' ? 0 : Math.round(Math.max(0, systemSize) * 1300),
  permitting: 500,
  interconnection: 200,
  tax: 0,
  contingency: 0,
  incentives: 0,
  paymentMethod: 'cash',
  financedAmount: null,
  interestRate: 7.99,
  loanYears: 15,
  annualMaintenance: 0,
  maintenanceEscalation: 0,
  replacementCost: 0,
  replacementYear: 15,
});

const number = (value, label, max = 10000000) => {
  if (!Number.isFinite(value) || value < 0 || value > max) throw new RangeError(`${label} must be between 0 and ${max.toLocaleString()}.`);
  return value;
};

export function runInstallationScenario(simulationParams, scenario) {
  const grossCost = INSTALLATION_COST_FIELDS.reduce((sum, key) => sum + number(scenario[key], key), 0);
  const incentives = Math.min(grossCost, number(scenario.incentives, 'Incentives'));
  const netCost = grossCost - incentives;
  if (!['cash', 'loan'].includes(scenario.paymentMethod)) throw new RangeError('Select cash or loan.');
  const financedAmount = scenario.paymentMethod === 'cash' ? 0 : number(scenario.financedAmount ?? netCost, 'Amount financed', netCost);
  const interestRate = number(scenario.interestRate, 'Interest rate', 100);
  const loanYears = number(scenario.loanYears, 'Loan term', 25);
  if (scenario.paymentMethod === 'loan' && (!Number.isInteger(loanYears) || loanYears < 1)) throw new RangeError('Loan term must be a whole number from 1 to 25 years.');
  const annualMaintenance = number(scenario.annualMaintenance, 'Annual maintenance');
  const maintenanceEscalation = number(scenario.maintenanceEscalation, 'Maintenance escalation', 20);
  const replacementCost = number(scenario.replacementCost, 'Replacement cost');
  const replacementYear = number(scenario.replacementYear, 'Replacement year', 25);
  if (replacementCost > 0 && (!Number.isInteger(replacementYear) || replacementYear < 1)) throw new RangeError('Replacement year must be a whole number from 1 to 25.');

  // Reuse identical production and tariff assumptions for both installation scenarios.
  const utility = runRoiSimulation({ ...simulationParams, proposalMode: 'new', loanAmount: 0, incentives: 0, loanInterest: 0, loanTerm: 1, existingSolarBalance: 0, existingSolarPayment: 0 });
  const upfront = netCost - financedAmount;
  const monthlyPayment = calculatePMT(financedAmount, interestRate, loanYears);
  let balance = financedAmount;
  let spent = upfront;
  let totalInterest = 0;
  let totalMaintenance = 0;
  let gridCost = 0;
  let totalLoanPayments = 0;
  const rows = [{ year: 0, spent, balance, economicCost: spent + balance, gridCost: 0, maintenance: 0, replacement: 0, loanPayments: 0 }];
  for (let year = 1; year <= 25; year++) {
    let loanPayments = 0;
    for (let month = 0; month < 12 && balance > 0; month++) {
      const interest = balance * interestRate / 1200;
      const payment = Math.min(balance + interest, monthlyPayment);
      balance = Math.max(0, balance + interest - payment);
      if (balance < 0.000001) balance = 0;
      totalInterest += interest;
      loanPayments += payment;
    }
    const maintenance = annualMaintenance * (1 + maintenanceEscalation / 100) ** (year - 1);
    const replacement = year === replacementYear ? replacementCost : 0;
    totalMaintenance += maintenance;
    totalLoanPayments += loanPayments;
    spent += utility[year].annualUtilityBillProposed + loanPayments + maintenance + replacement;
    gridCost += utility[year].annualBillGridOnly;
    rows.push({ year, spent, balance, economicCost: spent + balance, gridCost, maintenance, replacement, loanPayments });
  }
  const sustained = rows.findIndex((row, index) => row.economicCost <= row.gridCost && rows.slice(index).every(next => next.economicCost <= next.gridCost));
  return { grossCost, incentives, netCost, financedAmount, upfront, monthlyPayment, totalInterest, totalLoanPayments, totalMaintenance, replacementCost, rows, breakEvenYear: sustained < 0 ? null : rows[sustained].year, savings25: gridCost - rows[25].economicCost };
}
