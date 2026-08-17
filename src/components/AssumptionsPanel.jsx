import { ChevronDown } from 'lucide-react';

const Row = ({ term, children }) => (
  <div className="flex items-baseline justify-between gap-4 border-b border-line py-1.5">
    <dt className="text-xs text-ink-2">{term}</dt>
    <dd className="tnum text-xs text-ink">{children}</dd>
  </div>
);

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
  <details className="group border-t border-line pt-4">
    <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-ink">
      Assumptions behind these numbers
      <ChevronDown size={16} className="text-ink-3 group-open:rotate-180" />
    </summary>
    <dl className="mt-3 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
      <Row term="Utility rate escalation">{rateEscalation}% / year</Row>
      <Row term="Panel degradation">{panelDegradation}% / year</Row>
      {peakRate !== undefined && <Row term="Peak electricity rate">${Number(peakRate).toFixed(3)} / kWh</Row>}
      {offPeakRate !== undefined && <Row term="Off-peak electricity rate">${Number(offPeakRate).toFixed(3)} / kWh</Row>}
      {blendedRate !== undefined && <Row term="Blended rate used">${Number(blendedRate).toFixed(3)} / kWh</Row>}
      {batteryRoundTrip !== undefined && <Row term="Battery round-trip efficiency">{batteryRoundTrip}%</Row>}
      {batteryDegradation !== undefined && <Row term="Battery degradation">{batteryDegradation}% / year</Row>}
      <Row term="Export credit">${Number(exportRate).toFixed(2)} / kWh</Row>
    </dl>
    <p className="mt-4 text-[11px] leading-relaxed text-ink-3">
      This is an estimate, not a quote or guarantee. Actual utility rates, production, usage, financing, and incentives can change your results.
    </p>
  </details>
);

export default AssumptionsPanel;
