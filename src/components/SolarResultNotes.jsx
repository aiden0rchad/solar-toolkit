export default function SolarResultNotes({ year, targetOffsetPct, theme = 'instrument' }) {
  const actualOffset = year.annualUsageKwh > 0 ? year.annualProductionKwh / year.annualUsageKwh * 100 : 0;
  return <aside aria-label="Production and modeling limits" className={`my-4 space-y-2 text-xs leading-relaxed ${theme === 'pro' ? 'text-slate-300' : 'text-ink-2'}`}>
    <p><strong>{Math.round(year.annualProductionKwh ?? 0).toLocaleString()} kWh</strong> in year one after any generation cap, covering <strong>{actualOffset.toFixed(1)}%</strong> of annual energy use against a {targetOffsetPct}% target. Energy offset is different from bill savings.</p>
    <p>Dispatch uses one representative day per month: 15% of solar production is assigned to the peak period and 85% off-peak. Your peak usage share is editable, but tariff hours, hourly weather and equipment power limits are not simulated. This can change battery and time-of-use estimates outside the modeled schedule.</p>
    {(year.warnings ?? []).map(warning => <p key={warning}>{warning}</p>)}
  </aside>;
}
