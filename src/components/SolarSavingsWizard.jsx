import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ListChecks, SlidersHorizontal } from 'lucide-react';
import { REGIONAL_PROFILES } from '../data/regionalProfiles';
import { SOLAR_RESOURCE_PROFILES } from '../engine/solar';
import { useToolState } from '../state/useToolState';
import { isSolarWizardStep, solarWizardErrors } from './solarWizard';
import './solar-wizard.css';

const steps = ['Your bill', 'Your location', 'Your solar plan', 'Your budget'];
const titles = ['What does your electricity usually cost?', 'Where will you use solar?', 'Do you have a system in mind?', 'Do you have a price in mind?'];
const loadChoices = { Flat: 'About the same all year', 'Summer Peak (AC)': 'More in summer, with air conditioning', 'Winter Peak (Heat)': 'More in winter, with electric heating', 'Dual Peak (AC + Heat)': 'More in both summer and winter' };
const money = value => Number.isFinite(value) ? `$${Math.round(value).toLocaleString()}` : 'Unavailable';

export default function SolarSavingsWizard({ theme = 'instrument', experience, onExperienceChange, solar, inputs, financeErrors, result }) {
  const [step, setStep] = useToolState('solarWizardStep', 0, isSolarWizardStep);
  const [locationConfirmed, setLocationConfirmed] = useToolState('solarLocationConfirmed', false, value => typeof value === 'boolean');
  const [errors, setErrors] = useState([]);
  const heading = useRef(null);
  const errorBox = useRef(null);
  const { monthlyBill, setMonthlyBill, loadShape, setLoadShape, systemCost, estimatedCost, systemCostOverride, setSystemCostOverride, incentives, setIncentives, payMethod, setPayMethod } = inputs;
  const v = solar.values;
  const Heading = theme === 'pro' ? 'h1' : 'h2';
  const summary = experience === 'summary';

  useEffect(() => { heading.current?.focus(); }, [experience, step]);
  useEffect(() => { if (errors.length) errorBox.current?.focus(); }, [errors]);

  const full = () => onExperienceChange('full');
  const move = next => { setErrors([]); setStep(next); };
  const check = index => solarWizardErrors(index, { monthlyBill, loadShape, solar, locationConfirmed, financeErrors });
  const advance = event => {
    event.preventDefault();
    for (const index of step === 3 ? [0, 1, 2, 3] : [step]) {
      const issues = check(index);
      if (issues.length) { setStep(index); setErrors(issues); return; }
    }
    setErrors([]);
    if (step === 3) onExperienceChange('summary');
    else setStep(step + 1);
  };
  const number = (label, value, onChange, unit, increment = '1') => <label className="solar-wizard-field">
    <span>{label}</span><span className="solar-wizard-number"><input type="number" min="0" step={increment} value={Number.isFinite(value) ? value : ''} onChange={event => onChange(event.target.value === '' ? NaN : Number(event.target.value))} aria-label={label} /><span>{unit}</span></span>
  </label>;
  const select = (label, value, onChange, options) => <label className="solar-wizard-field"><span>{label}</span><select aria-label={label} value={value ?? ''} onChange={event => onChange(event.target.value)}>{options.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>;
  const option = (selected, action, label, note) => <button type="button" className="solar-wizard-option" aria-pressed={selected} onClick={action}><span className="solar-wizard-option-mark" aria-hidden="true">{selected && <Check size={15} />}</span><span><strong>{label}</strong>{note && <small>{note}</small>}</span></button>;

  return <section className={`solar-wizard solar-wizard--${theme}`} aria-label="Solar savings">
    <header className="solar-wizard-header">
      <p className="solar-wizard-kicker">Solar savings</p>
      <Heading ref={heading} tabIndex={-1}>{summary ? 'Your first look at solar savings' : experience === 'guided' ? titles[step] : 'Is solar worth it for me?'}</Heading>
      {experience === 'choose' && <p>You don’t need to know every number to get started. How would you like to explore?</p>}
      {experience === 'guided' && <p>One step at a time. You can change your answers or open all the details whenever you like.</p>}
    </header>

    {experience === 'choose' ? <>
      <div className="solar-wizard-paths">
        <button type="button" className="solar-wizard-path" aria-label="Guide me through" onClick={() => { setErrors([]); onExperienceChange('guided'); }}>
          <ListChecks size={25} aria-hidden="true" /><span className="solar-wizard-kicker">A good place to start</span><strong>Guide me through</strong><span>A few everyday questions, with estimates explained along the way. No solar expertise needed.</span><span className="solar-wizard-path-action">{step === 0 ? 'Start with my bill' : 'Continue my estimate'} <ArrowRight size={17} aria-hidden="true" /></span>
        </button>
        <button type="button" className="solar-wizard-path" aria-label="Let me plug in all my numbers" onClick={full}>
          <SlidersHorizontal size={25} aria-hidden="true" /><span className="solar-wizard-kicker">For the detail-minded</span><strong>Let me plug in all my numbers</strong><span>Open the full calculator for your utility rates, panel details, financing, and installation comparisons.</span><span className="solar-wizard-path-action">Open all inputs <ArrowRight size={17} aria-hidden="true" /></span>
        </button>
      </div>
      <p className="solar-wizard-note">No signup or downloads. Calculations run in your browser. Switching paths keeps the numbers you’ve entered.</p>
    </> : experience === 'guided' ? <>
      <nav className="solar-wizard-progress" aria-label="Estimate progress"><ol>{steps.map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined}><span>{index + 1}</span><span>{label}</span></li>)}</ol></nav>
      <p className="solar-wizard-kicker" role="status">Step {step + 1} of 4 · {steps[step]}</p>
      <form className="solar-wizard-sheet" onSubmit={advance} noValidate>
        {step === 0 && <>
          <p>A rough average is fine for a first look. If you have a year of bills, divide the total by 12.</p>
          {number('Monthly electric bill now', monthlyBill, setMonthlyBill, '$ / month', '10')}
          {select('When do you use the most electricity?', loadShape, setLoadShape, Object.entries(loadChoices))}
          <p className="solar-wizard-note">No bill handy? You can explore with the $250/month starting example, then replace it later.</p>
        </>}
        {step === 1 && <>
          <p>Rates and sunlight vary by location. Choose a starting point, not a promise of what your utility will charge.</p>
          {select('Regional utility example', locationConfirmed ? v.regionalProfileId : '', id => { if (!id) { setLocationConfirmed(false); return; } if (id !== v.regionalProfileId) solar.selectProfile(id); setLocationConfirmed(true); }, [['', 'Choose your region or Other location'], ...REGIONAL_PROFILES.map(profile => [profile.id, profile.label])])}
          {locationConfirmed && <>
            <p className="solar-wizard-note">{solar.profile?.kind === 'utility' ? 'Published utility starting terms. Confirm current rates and eligibility with your utility.' : solar.profile?.kind === 'manual' ? 'Enter your local electricity price and choose representative sunlight below. No California values are substituted.' : 'This is a state-average price, not your utility tariff. Fixed charges and export credits start at $0; check them before relying on savings.'}</p>
            {solar.profile?.kind !== 'manual' && <p className="solar-wizard-location">Starting with <strong>${Number.isFinite(solar.blendedRate) ? solar.blendedRate.toFixed(3) : '—'}/kWh</strong> and {v.manualMonthlyValues !== null ? 'your own monthly sunlight values' : solar.resource.profile?.label ?? 'no selected sunlight profile'}.</p>}
            <details className="solar-wizard-location-details" open={solar.profile?.kind === 'manual' || errors.length > 0 ? true : undefined}>
            <summary>{solar.profile?.kind === 'manual' ? 'Your local rate and sunlight' : 'Check rates and sunlight (optional)'}</summary>
            {number('Electricity price per kWh', v.ratePeak === v.rateOffPeak ? v.ratePeak : solar.blendedRate, value => { solar.set('ratePeak', value); solar.set('rateOffPeak', value); }, '$ / kWh', '0.01')}
            <p className="solar-wizard-note">{v.ratePeak !== v.rateOffPeak ? 'Your saved time-of-use rates are retained. Editing this average sets both periods to this price.' : 'Use the energy price from your bill if you know it. Time-of-use and tiered rates need a closer look in the full calculator.'}</p>
            {number('Monthly fixed charge', v.monthlyFixedCharge, value => solar.set('monthlyFixedCharge', value), '$ / month')}
            {v.manualMonthlyValues === null ? select('Solar-resource location', v.resourceId, id => solar.set('resourceId', id || null), [['', 'Choose representative sunlight'], ...SOLAR_RESOURCE_PROFILES.map(profile => [profile.id, profile.label])]) : <p className="solar-wizard-note">Using the 12 monthly resource values you already entered. They are not replaced by this guide.</p>}
            <p className="solar-wizard-note">{v.manualMonthlyValues === null ? 'Choose a city with similar sunlight for a rough estimate. These are long-term climate averages, not a roof survey. If none fits, enter your own monthly data in the full calculator.' : 'Custom resource data and roof assumptions can be changed in the full calculator.'}</p>
            <button type="button" className="solar-wizard-link" onClick={full}>Review detailed utility and roof assumptions</button>
            </details>
          </>}
        </>}
        {step === 2 && <>
          <p>If you’re just exploring, we can estimate the system size from your bill. You don’t need to count panels.</p>
          <div className="solar-wizard-options" role="group" aria-label="Solar sizing method">
            {option(v.mode === 'bill', () => solar.set('mode', 'bill'), 'Help me estimate a system', 'Use my electricity bill as a starting point.')}
            {option(v.mode === 'panels', () => solar.set('mode', 'panels'), 'I know the panel details', 'Use the panel count and wattage from my quote.')}
          </div>
          {v.mode === 'panels' && <div className="solar-wizard-pair">{number('Number of panels', v.panelCount, value => solar.set('panelCount', value), 'panels')}{number('Panel wattage', v.panelWatts, value => solar.set('panelWatts', value), 'W', '5')}</div>}
          {v.mode === 'kw' && <p className="solar-wizard-note">Your saved {v.systemSizeKw} kW system is retained. Choose a sizing method above or edit kW in the full calculator.</p>}
          {v.mode === 'bill' && number('Target annual energy offset', v.targetOffsetPct, value => solar.set('targetOffsetPct', value), '%', '5')}
          <p className="solar-wizard-note">A 100% energy target means producing as much electricity as you use over a year. It does not mean a $0 bill: timing, fixed charges, and export credits still matter.</p>
          {solar.sizing.errors.length === 0 && <p className="solar-wizard-sizing">Estimated system: <strong>{solar.systemSize.toFixed(1)} kW</strong><span>Roof space and utility approval still need to be checked.</span></p>}
        </>}
        {step === 3 && <>
          <p>No quote yet? Use a clearly labeled planning price and replace it when you hear from an installer.</p>
          <div className="solar-wizard-options" role="group" aria-label="Solar pricing">
            {option(systemCostOverride === null, () => setSystemCostOverride(null), 'Use a planning estimate', `${money(estimatedCost)} at $3.00 per watt. This is not a quote.`)}
            {option(systemCostOverride !== null, () => setSystemCostOverride(systemCost), 'I have a quote', 'Use my total installed price before rebates.')}
          </div>
          {systemCostOverride !== null && number('Estimated system cost', systemCost, setSystemCostOverride, '$', '100')}
          {select('How would you pay?', payMethod, setPayMethod, [['loan', 'Finance with a loan'], ['cash', 'Pay upfront']])}
          <p className="solar-wizard-note">{payMethod === 'loan' ? 'This first look assumes 7.99% APR for 25 years. The loan payment is included in the monthly cost. Use the full calculator’s installation comparisons for your own loan terms.' : 'The system cost is paid upfront. It is included in the payback and 25-year comparison, not your ongoing electric bill.'}</p>
          {number('Confirmed incentives / rebates', incentives, setIncentives, '$', '100')}
          <p className="solar-wizard-note">Leave this at $0 if you’re unsure. No federal homeowner credit is assumed. Include only rebates you’ve confirmed.</p>
        </>}
        {errors.length > 0 && <div className="solar-wizard-errors" role="alert" tabIndex={-1} ref={errorBox}><strong>Let’s check a couple of details.</strong><ul>{errors.map(error => <li key={error}>{error}</li>)}</ul><button type="button" className="solar-wizard-link" onClick={full}>Open all numbers to review advanced settings</button></div>}
        <div className="solar-wizard-actions"><button type="button" className="solar-wizard-secondary" onClick={() => step === 0 ? onExperienceChange('choose') : move(step - 1)}><ArrowLeft size={16} aria-hidden="true" /> Back</button><button type="submit" className="solar-wizard-primary">{step === 3 ? 'Show my estimate' : 'Continue'}<ArrowRight size={16} aria-hidden="true" /></button></div>
      </form>
      <button type="button" className="solar-wizard-link solar-wizard-switch" onClick={full}>Let me plug in all my numbers</button>
    </> : <>
      {!result.valid ? <div className="solar-wizard-sheet"><p role="alert">Your saved estimate needs a few inputs corrected before it can be shown.</p><ul>{[...new Set([...solar.errors, ...financeErrors])].map(error => <li key={error}>{error}</li>)}</ul><button type="button" className="solar-wizard-primary" onClick={full}>Review my numbers</button></div> : <>
        <div className="solar-wizard-verdict"><p className="solar-wizard-kicker">A planning estimate, not a recommendation</p><h3>{result.savings25 > 0 ? 'Solar could lower your long-term costs.' : result.savings25 < 0 ? 'Solar costs more in this scenario.' : 'The modeled long-term costs are about the same.'}</h3><p>These results use your answers and the assumptions below. A real quote, your roof, and your utility’s rules can change the outcome.</p></div>
        <dl className="solar-wizard-results">
          <div><dt>Average monthly cost with solar</dt><dd>{money(result.year1.monthlyBillFuture)}<small>/ month</small></dd><p>Compared with {money(result.year1.monthlyBillNow)} now.{payMethod === 'loan' ? ` Includes a ${money(result.monthlyPayment)}/month loan.` : ' Upfront purchase shown below.'}</p></div>
          <div><dt>{result.savings25 < 0 ? 'Additional cost over 25 years' : 'Estimated savings over 25 years'}</dt><dd>{money(Math.abs(result.savings25))}</dd><p>Includes system cost and modeled utility spending.</p></div>
          <div><dt>Estimated payback</dt><dd>{result.payback === null ? 'Not within 25 years' : `${result.payback} years`}</dd><p>When solar catches up and stays ahead through the modeled 25 years.</p></div>
        </dl>
        <section className="solar-wizard-summary" aria-label="What this estimate uses"><h3>What this estimate uses</h3><dl>
          <div><dt>Electricity bill you entered</dt><dd>{money(monthlyBill)}/month</dd></div>
          <div><dt>Regional starting point</dt><dd>{solar.profile?.label}</dd></div>
          <div><dt>Sunlight</dt><dd>{v.manualMonthlyValues !== null ? 'Your 12 monthly values' : solar.resource.profile?.label}</dd></div>
          <div><dt>System and year-one generation</dt><dd>{solar.systemSize.toFixed(1)} kW · {Math.round(result.year1.annualProductionKwh).toLocaleString()} kWh</dd></div>
          <div><dt>Installed price before rebates</dt><dd>{money(systemCost)}{systemCostOverride === null ? ' · $3/W planning estimate' : ' · your entered price'}</dd></div>
          <div><dt>Payment</dt><dd>{payMethod === 'loan' ? 'Loan · 7.99% APR · 25 years' : `${money(result.netSystemCost)} upfront after rebates`}</dd></div>
          <div><dt>Fixed utility charge / export credit</dt><dd>${v.monthlyFixedCharge.toFixed(2)}/month · ${v.solarExportRate}/kWh</dd></div>
          <div><dt>Rate escalation / panel degradation</dt><dd>{v.inflationRate}% / {v.panelDegradationPct}% per year</dd></div>
        </dl><p className="solar-wizard-note">{solar.profile?.kind === 'planning' ? 'Uses a state-average rate, not your utility tariff. ' : ''}Roof conditions, utility limits, maintenance, and replacement costs can materially change savings. Maintenance and replacements are not included in this first-look total; explore them in the full calculator’s DIY/installer comparisons. This is a solar-only estimate with no battery.</p>
          <details className="solar-wizard-disclosure"><summary>Assumptions, sources, and limitations</summary><div>
            {[...new Set([...solar.warnings, ...(result.year1.warnings ?? [])])].map(warning => <p key={warning}>{warning}</p>)}
            <p>Electricity rates: ${v.ratePeak}/kWh peak, ${v.rateOffPeak}/kWh off-peak; {v.peakUsagePercent}% peak usage. Export compensation: {v.exportCompensation}.</p>
            <p>Usage pattern: {loadChoices[loadShape]}. Sizing: {v.mode}; {v.targetOffsetPct}% annual energy target.{v.mode === 'panels' ? ` ${v.panelCount} panels at ${v.panelWatts} W.` : ''}</p>
            <p>System loss {v.systemLossPct}%; orientation multiplier {v.orientationFactor}; clipping {v.clippingLossPct}%. {v.manualInputType === 'ac' && v.manualMonthlyValues !== null ? 'Your AC yields already include these losses, so they are not applied again.' : ''}</p>
            {v.manualMonthlyValues !== null && <p>Monthly daily resource values, January through December: {v.manualMonthlyValues.join(', ')} ({v.manualInputType === 'ac' ? 'AC kWh/kW/day' : 'kWh/m²/day'}).</p>}
            <p>Generation cap: {v.annualGenerationCapKwh ?? 'none'} kWh/year. Credited-export cap: {v.annualExportCapKwh ?? 'none'} kWh/year. Solar capacity charge: ${v.monthlySolarChargePerKw}/kW/month.</p>
            <p>Confirmed rebates: {money(incentives)}. No federal homeowner credit is assumed.</p><p>Utility source snapshot: version {v.profileVersion}, reviewed {v.profileReviewedAt}.</p>
            {solar.profile?.sources?.filter(source => source.url).map(source => <p key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></p>)}
            {v.manualMonthlyValues === null && solar.resource.profile && <p><a href={solar.resource.profile.sourceUrl} target="_blank" rel="noreferrer">Solar-resource source</a> · {solar.resource.profile.period} · {solar.resource.profile.resolution}</p>}
          </div></details>
        </section>
      </>}
      <div className="solar-wizard-actions solar-wizard-summary-actions"><button type="button" className="solar-wizard-secondary" onClick={() => { move(0); onExperienceChange('guided'); }}>Edit my answers</button><button type="button" className="solar-wizard-primary" onClick={full}>Explore the full calculator <ArrowRight size={16} aria-hidden="true" /></button></div>
      <button type="button" className="solar-wizard-link solar-wizard-switch" onClick={() => onExperienceChange('choose')}>Change input mode</button>
    </>}
  </section>;
}
