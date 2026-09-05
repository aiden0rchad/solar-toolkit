import { Card, InputField } from './ui';
import { useToolState } from '../state/useToolState';
import { INSTALLATION_COST_FIELDS, installationDefaults, runInstallationScenario, validInstallationOverrides } from '../engine/installation';
import './installation.css';

const labels = { equipment: 'Equipment', labor: 'Labor', permitting: 'Permitting', interconnection: 'Interconnection', tax: 'Tax', contingency: 'Contingency' };
const dollars = value => value === undefined ? 'Unavailable' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

export default function InstallationScenarios({ simulationParams, systemSize }) {
  const [diyOverrides, setDiy] = useToolState('installation.diy', {}, validInstallationOverrides);
  const [turnkeyOverrides, setTurnkey] = useToolState('installation.turnkey', {}, validInstallationOverrides);
  const configurations = [
    { id: 'diy', name: 'DIY', overrides: diyOverrides, set: setDiy },
    { id: 'turnkey', name: 'Installer', overrides: turnkeyOverrides, set: setTurnkey },
  ].map(item => {
    const values = { ...installationDefaults(Number.isFinite(systemSize) ? systemSize : 0, item.id), ...item.overrides };
    let result = null;
    let error = null;
    if (simulationParams) {
      try { result = runInstallationScenario(simulationParams, values); }
      catch (cause) { error = cause.message; }
    }
    return { ...item, values, result, error, change: (key, value) => item.set(previous => ({ ...previous, [key]: value })) };
  });

  return (
    <Card className="installation-comparison p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Compare DIY and installer costs</h2>
      <p className="mt-2 text-sm">Both scenarios use the solar production, battery, and utility assumptions above. These editable planning allowances are not quotes: equipment starts at $1.20/W, installer labor at $1.30/W, permitting at $500, and interconnection at $200. DIY labor starts at $0; add paid help and your own time if you want to price it.</p>
      <p className="mt-2 text-sm">Tax, contingency, upkeep, and replacements start at $0 because they depend on your project. Unedited equipment and labor allowances follow system size; edited amounts stay fixed.</p>
      {!simulationParams && <p role="status" className="mt-3">Complete the solar inputs above to calculate this comparison.</p>}
      <div className="installation-inputs mt-5">
        {configurations.map(item => (
          <section key={item.id} aria-label={`${item.name} installation assumptions`}>
            <h3 className="mb-4 font-semibold">{item.name}</h3>
            {INSTALLATION_COST_FIELDS.map(key => <InputField key={key} label={`${item.name} ${labels[key].toLowerCase()}`} value={item.values[key]} onChange={value => item.change(key, value)} unit="$" step="100" />)}
            <InputField label={`${item.name} confirmed incentives`} value={item.values.incentives} onChange={value => item.change('incentives', value)} unit="$" step="100" />
            <label className="installation-select-label">
              {item.name} payment method
              <select aria-label={`${item.name} payment method`} value={item.values.paymentMethod} onChange={event => item.change('paymentMethod', event.target.value)}>
                <option value="cash">Cash</option>
                <option value="loan">Loan</option>
              </select>
            </label>
            {item.values.paymentMethod === 'loan' && <div className="mt-4">
              <InputField label={`${item.name} amount financed`} value={item.values.financedAmount ?? item.result?.netCost ?? 0} onChange={value => item.change('financedAmount', value)} unit="$" step="100" />
              <p className="mb-3 text-xs">Defaults to the full cost after incentives. Any unfinanced amount is paid upfront.</p>
              <InputField label={`${item.name} loan APR`} value={item.values.interestRate} onChange={value => item.change('interestRate', value)} unit="%" step="0.1" />
              <InputField label={`${item.name} loan term`} value={item.values.loanYears} onChange={value => item.change('loanYears', value)} unit="years" min={1} step="1" />
            </div>}
            <section className="installation-upkeep mt-4" aria-label={`${item.name} maintenance and replacement assumptions`}>
              <h4 className="text-sm font-semibold">Maintenance and replacement assumptions</h4>
              <div className="pt-4">
                <InputField label={`${item.name} annual maintenance`} value={item.values.annualMaintenance} onChange={value => item.change('annualMaintenance', value)} unit="$ / yr" step="50" />
                <InputField label={`${item.name} maintenance escalation`} value={item.values.maintenanceEscalation} onChange={value => item.change('maintenanceEscalation', value)} unit="% / yr" step="0.1" />
                <InputField label={`${item.name} replacement budget`} value={item.values.replacementCost} onChange={value => item.change('replacementCost', value)} unit="$" step="100" />
                <InputField label={`${item.name} replacement year`} value={item.values.replacementYear} onChange={value => item.change('replacementYear', value)} unit="year" min={1} step="1" />
                <p className="text-xs">One replacement event in the selected year, entered in that year's dollars. Set its budget to $0 to omit it.</p>
              </div>
            </section>
            <button type="button" className="installation-reset mt-4" onClick={() => item.set({})}>Reset {item.name} allowances</button>
            {item.error && <p role="alert" className="mt-3">{item.name}: {item.error}</p>}
          </section>
        ))}
      </div>
      <div className="installation-table mt-6" role="region" aria-label="Installation cost comparison" tabIndex={0}>
        <table>
          <caption>Same system, different installation and payment costs</caption>
          <thead><tr><th scope="col">25-year comparison</th>{configurations.map(item => <th key={item.id} scope="col">{item.name}</th>)}</tr></thead>
          <tbody>
            {[
              ['Itemized installation total', result => dollars(result.grossCost)],
              ['Incentives applied', result => dollars(result.incentives)],
              ['Net installation cost', result => dollars(result.netCost)],
              ['Paid upfront', result => dollars(result.upfront)],
              ['Amount financed', result => dollars(result.financedAmount)],
              ['Monthly loan payment', result => dollars(result.monthlyPayment)],
              ['Total loan interest', result => dollars(result.totalInterest)],
              ['Maintenance over 25 years', result => dollars(result.totalMaintenance)],
              ['Replacement budget', result => dollars(result.replacementCost)],
              ['Total cost including utility', result => dollars(result.rows[25].economicCost)],
              ['Savings versus utility only', result => dollars(result.savings25)],
              ['Sustained break-even', result => result.breakEvenYear === null ? 'Not within 25 years' : `${result.breakEvenYear} years`],
            ].map(([label, render]) => <tr key={label}><th scope="row">{label}</th>{configurations.map(item => <td key={item.id}>{item.result ? render(item.result) : 'Unavailable'}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs">Cash is paid at installation. Loans amortize monthly and charge interest only on the financed amount. Break-even compares total spending plus remaining loan debt with utility-only spending and must stay favorable through year 25. Values are nominal dollars, with no assumed resale value. Incentives cannot exceed installation cost. Lease and PPA contracts require different ownership terms and are outside this ownership comparison.</p>
    </Card>
  );
}
