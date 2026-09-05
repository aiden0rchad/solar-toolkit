import { useId } from 'react';
import { REGIONAL_PROFILES } from '../data/regionalProfiles';
import { MONTH_NAMES, SOLAR_RESOURCE_PROFILES } from '../engine/solar';
import { InputField } from './ui';

export default function SolarInputs({ solar, theme = 'instrument', section = 'all', allowKw = false }) {
  const uid = useId();
  const { values: v, set, profile, resource, sizing, errors, warnings } = solar;
  const pro = theme === 'pro';
  const body = pro ? 'text-slate-300' : 'text-ink-2';
  const muted = pro ? 'text-slate-400' : 'text-ink-3';
  const selectClass = pro ? 'w-full border border-slate-600 rounded-lg bg-slate-800 text-slate-100 p-2' : 'w-full border-0 border-b border-control-edge bg-surface text-ink py-2';
  const selection = (label, key, options) => <label className={`mb-4 block text-sm ${body}`}>
    <span className="mb-1 block">{label}</span>
    <select aria-label={label} value={v[key] ?? ''} onChange={event => key === 'regionalProfileId' ? solar.selectProfile(event.target.value) : set(key, event.target.value)} className={selectClass}>
      {options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
    </select>
  </label>;
  const number = (label, key, unit, step = '0.1') => <InputField label={label} value={v[key]} onChange={value => set(key, value)} unit={unit} step={step} />;
  return <div className={`space-y-4 ${body}`}>
    {section !== 'sizing' && <>
      {selection('Regional utility example', 'regionalProfileId', REGIONAL_PROFILES)}
      <div className={`text-xs leading-relaxed ${muted}`}>
        <p>{profile?.label} · loaded version {v.profileVersion} · reviewed {v.profileReviewedAt}</p>
        <p>Your saved, editable scenario rates may differ from these source starting terms.</p>
        {(v.profileVersion !== profile?.version || v.profileReviewedAt !== profile?.reviewedAt) && <p>Newer starting terms are bundled. Your saved inputs have been retained. <button type="button" className="underline" onClick={() => solar.selectProfile(profile.id)}>Replace them with the current profile and resource</button>.</p>}
        <p>{profile?.kind === 'utility' ? 'Published utility starting terms. Confirm current rates and eligibility with the utility.' : 'Planning assumptions, not a utility tariff.'} Enter the rates and limits from your own bill and interconnection agreement.</p>
        {profile?.state === 'CA' && <p role="status" className="mt-2 font-semibold">California example active. Its rates and export credits may not apply to your home, including other California utilities.</p>}
        {profile?.sources?.filter(source => source.url).map(source => <a key={source.url} className="mr-3 underline" href={source.url} target="_blank" rel="noreferrer">{source.label}</a>)}
      </div>
      <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
        {number('Peak electricity rate', 'ratePeak', '$/kWh', '0.01')}
        {number('Off-peak electricity rate', 'rateOffPeak', '$/kWh', '0.01')}
        {number('Peak usage share', 'peakUsagePercent', '%', '1')}
        {number('Monthly fixed charge', 'monthlyFixedCharge', '$/mo', '1')}
        {number('Export credit rate', 'solarExportRate', '$/kWh', '0.01')}
        {number('Utility rate escalation', 'inflationRate', '%/yr')}
        {number('Monthly solar capacity charge', 'monthlySolarChargePerKw', '$/kW/mo', '0.01')}
      </div>
      {selection('Export compensation', 'exportCompensation', [{ id: 'net-billing', label: 'Net billing: pay for exported kWh' }, { id: 'annual-net-metering', label: 'Net metering: bank export credits within the year' }])}
      {v.exportCompensation === 'annual-net-metering' && <p className={`text-xs ${muted}`}>The model banks dollar credits at your export rate, applies them to later energy charges, and expires unused credit at year end. This approximates kWh banking for flat retail rates; time-of-use credit rules may differ.</p>}
      {['annualGenerationCapKwh', 'annualExportCapKwh'].map((key, index) => <label key={key} className={`block text-sm ${body}`}>
        <span className="block mb-1">{index === 0 ? 'Annual generation cap' : 'Annual credited-export cap'} (kWh, blank = no cap)</span>
        <input type="number" min="0" step="100" value={v[key] === null || !Number.isFinite(v[key]) ? '' : v[key]} onChange={event => set(key, event.target.value === '' ? null : Number(event.target.value))} className={selectClass} />
      </label>)}
      <p className={`text-xs ${muted}`}>Caps are explicit modeling limits, not a check of utility eligibility. Generation above the generation cap is curtailed; exports above the credited-export cap earn no credit.</p>
      {selection('Solar-resource location', 'resourceId', [{ id: '', label: 'Select a location or enter monthly values' }, ...SOLAR_RESOURCE_PROFILES])}
      {resource.profile ? <p className={`text-xs leading-relaxed ${muted}`}>
        {resource.profile?.label} · {resource.profile?.period} · {resource.profile?.resolution}. Reviewed {resource.profile?.reviewedAt}.{' '}
        {resource.profile?.sourceUrl && <a className="underline" href={resource.profile.sourceUrl} target="_blank" rel="noreferrer">Dataset and method</a>}
        {' '}Monthly climate estimates, not a weather forecast or a roof survey. Location and roof details can change production.
      </p> : <p className={`text-xs ${muted}`}>No representative location selected. Enter 12 monthly values or choose a city with a suitable climate. No California resource is substituted.</p>}
      <label className={`flex items-start gap-2 text-sm ${body}`}>
        <input className="mt-1" type="checkbox" checked={v.manualMonthlyValues !== null} onChange={event => { if (event.target.checked) set('manualInputType', 'sun-hours'); set('manualMonthlyValues', event.target.checked ? [...(resource.profile?.monthlyGhi ?? Array(12).fill(0))] : null); }} />
        Enter my own 12 monthly solar-resource values
      </label>
      {v.manualMonthlyValues !== null && <>
        {selection('Manual resource units', 'manualInputType', [{ id: 'sun-hours', label: 'Irradiation: kWh/m²/day (peak sun hours)' }, { id: 'ac', label: 'AC yield: kWh/kW/day, losses already included' }])}
        <p className={`text-xs ${muted}`}>Enter monthly daily averages, not monthly totals. AC yield already includes all losses, orientation and clipping, so those adjustments are not applied a second time.</p>
        <div className="grid grid-cols-2 gap-x-3">
          {MONTH_NAMES.map((month, index) => <InputField key={month} label={`${month} resource`} value={v.manualMonthlyValues[index]} onChange={value => set('manualMonthlyValues', v.manualMonthlyValues.map((previous, i) => i === index ? value : previous))} unit={v.manualInputType === 'ac' ? 'kWh/kW/d' : 'kWh/m²/d'} />)}
        </div>
      </>}
      {(v.manualMonthlyValues === null || v.manualInputType !== 'ac') && <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
        {number('System loss', 'systemLossPct', '%')}
        {number('Orientation multiplier', 'orientationFactor', '×', '0.01')}
        {number('Clipping loss', 'clippingLossPct', '%')}
      </div>}
      {number('Annual panel degradation', 'panelDegradationPct', '%/yr')}
      <p className={`text-xs ${muted}`}>Orientation is an explicit multiplier relative to the source irradiation, not a tilt or azimuth simulation. Use a site-specific production estimate when available. System loss covers wiring, soiling and conversion; clipping is additional.</p>
    </>}
    {section !== 'profile' && <>
      <div role="group" aria-labelledby={`${uid}-mode`}>
        <p id={`${uid}-mode`} className="mb-2 text-sm font-semibold">How should we size your system?</p>
        <div className="flex gap-2">
          {[['bill', 'Bill-first estimate'], ['panels', 'Enter a system'], ...(allowKw ? [['kw', 'Enter kW']] : [])].map(([mode, label]) => <button key={mode} type="button" aria-pressed={v.mode === mode} onClick={() => set('mode', mode)} className={`flex-1 px-2 py-2 text-sm border-b-2 ${v.mode === mode ? (pro ? 'border-slate-100 font-bold' : 'border-ink font-semibold') : (pro ? 'border-slate-600' : 'border-control-edge')}`}>{label}</button>)}
        </div>
      </div>
      {v.mode === 'panels' && <div className="grid grid-cols-2 gap-x-3">
        {number('Number of panels', 'panelCount', 'panels', '1')}
        {number('Panel wattage', 'panelWatts', 'W', '5')}
      </div>}
      {v.mode === 'kw' && number('DC system size', 'systemSizeKw', 'kW')}
      {number('Target annual energy offset', 'targetOffsetPct', '%', '5')}
      <p className={`text-xs ${muted}`}>Energy offset compares annual solar generation with annual electricity use. It does not mean the same percentage of your bill is removed: timing, fixed charges and export credits still matter.</p>
      {errors.length === 0 && <p className="text-sm" aria-live="polite"><strong>{sizing.systemSizeKw.toFixed(2)} kW</strong> · {Math.round(sizing.annualProductionKwh).toLocaleString()} kWh/year · <strong>{sizing.achievedOffsetPct.toFixed(1)}% achieved</strong> vs {v.targetOffsetPct}% target before any generation cap.</p>}
    </>}
    {(errors.length > 0 || warnings.length > 0) && <div className="space-y-2 text-xs leading-relaxed">
      {errors.length > 0 && <div role="alert"><p className="font-semibold">Correct these inputs to see an estimate:</p><ul className="list-disc pl-4">{errors.map(error => <li key={error}>{error}</li>)}</ul></div>}
      {warnings.map(warning => <p key={warning}>{warning}</p>)}
    </div>}
  </div>;
}
