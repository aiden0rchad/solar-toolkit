export function solarFinanceErrors({ systemCost, incentives = 0, purchaseMethod = 'loan', loanInterest, loanTerm }) {
  const errors = [];
  if (!Number.isFinite(systemCost) || systemCost < 0 || systemCost > 100000000) errors.push('System cost must be a number between $0 and $100,000,000.');
  if (!Number.isFinite(incentives) || incentives < 0 || incentives > 100000000) errors.push('Incentives must be a number between $0 and $100,000,000.');
  if (!['cash', 'loan'].includes(purchaseMethod)) errors.push('Choose cash or loan financing.');
  if (purchaseMethod === 'loan') {
    if (!Number.isFinite(loanInterest) || loanInterest < 0 || loanInterest > 100) errors.push('Loan APR must be a number between 0% and 100%.');
    if (!Number.isFinite(loanTerm) || loanTerm < 1 / 12 || loanTerm > 50) errors.push('Loan term must be between one month and 50 years.');
  }
  return errors;
}
