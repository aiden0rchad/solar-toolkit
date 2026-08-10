import { ChevronDown } from 'lucide-react';

const AssumptionsPanel = ({
  rateEscalation,
  panelDegradation = 0.5,
  batteryRoundTrip,
  batteryDegradation,
  exportRate,
  peakRate,
  offPeakRate,
  blendedRate,
}) => (
  <details className="glass-card rounded-2xl p-5">
    <summary className="flex cursor-pointer list-none items-center justify-between font-bold text-slate-200">
      Assumptions behind these numbers
      <ChevronDown size={18} className="text-slate-400" />
    </summary>
    <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
      <div><dt className="text-slate-400">Utility rate escalation</dt><dd className="font-bold text-slate-200">{rateEscalation}% / year</dd></div>
      <div><dt className="text-slate-400">Panel degradation</dt><dd className="font-bold text-slate-200">{panelDegradation}% / year</dd></div>
      {peakRate !== undefined && <div><dt className="text-slate-400">Peak electricity rate</dt><dd className="font-bold text-slate-200">${Number(peakRate).toFixed(3)} / kWh</dd></div>}
      {offPeakRate !== undefined && <div><dt className="text-slate-400">Off-peak electricity rate</dt><dd className="font-bold text-slate-200">${Number(offPeakRate).toFixed(3)} / kWh</dd></div>}
      {blendedRate !== undefined && <div><dt className="text-slate-400">Blended rate used</dt><dd className="font-bold text-slate-200">${Number(blendedRate).toFixed(3)} / kWh</dd></div>}
      {batteryRoundTrip !== undefined && <div><dt className="text-slate-400">Battery round-trip efficiency</dt><dd className="font-bold text-slate-200">{batteryRoundTrip}%</dd></div>}
      {batteryDegradation !== undefined && <div><dt className="text-slate-400">Battery degradation</dt><dd className="font-bold text-slate-200">{batteryDegradation}% / year</dd></div>}
      <div><dt className="text-slate-400">Export credit</dt><dd className="font-bold text-slate-200">${Number(exportRate).toFixed(2)} / kWh</dd></div>
    </dl>
    <p className="mt-4 border-t border-slate-700/50 pt-4 text-xs leading-relaxed text-slate-400">
      This is an estimate, not a quote or guarantee. Actual utility rates, production, usage, financing, and incentives can change your results.
    </p>
  </details>
);

export default AssumptionsPanel;
