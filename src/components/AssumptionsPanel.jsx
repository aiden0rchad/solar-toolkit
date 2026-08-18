import { MARKERS } from './markers';
import { Marker, Perforation } from './ui';

// =============================================================================
// INSTRUMENT — assumption sidenotes.
//
// Not a panel and not a disclosure widget: marginalia. The premises behind the
// figures are set as ruled `label · value` rows below a counterfoil tear, each
// carrying a footnote marker in the Economist's symbol order so a figure on the
// sheet can point at the assumption that produced it. Assumptions live on the
// page — never in a tooltip, and never behind a click.
//
// The Shell places this block in the marginalia rail.
// =============================================================================

const Row = ({ term, symbol, children }) => (
  <div className="flex items-baseline justify-between gap-4 border-b-[0.5px] border-rule py-1">
    <dt
      className="text-ink-2"
      style={{ fontSize: 'var(--size-12)', lineHeight: 'var(--lh-12)', letterSpacing: 'var(--track-12)' }}
    >
      {term}
      <Marker symbol={symbol} />
    </dt>
    <dd
      className="tnum text-ink"
      style={{ fontSize: 'var(--size-12)', lineHeight: 'var(--lh-12)', letterSpacing: 'var(--track-12)' }}
    >
      {children}
    </dd>
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
  // Where this block's markers start. A sheet that keys a disclosure into the
  // rail takes `*` for it and pushes the assumptions along, so two blocks in
  // one rail never print the same symbol.
  markerOffset = 0,
}) => {
  // Rows are collected first so the markers run *, †, ‡ … over the rows that
  // actually render. An optional row that is absent must not leave a hole in
  // the sequence, or the keys stop matching the sheet.
  const rows = [
    { term: 'Utility rate escalation', value: `${rateEscalation}% / year` },
    { term: 'Panel degradation', value: `${panelDegradation}% / year` },
    peakRate !== undefined && { term: 'Peak electricity rate', value: `$${Number(peakRate).toFixed(3)} / kWh` },
    offPeakRate !== undefined && { term: 'Off-peak electricity rate', value: `$${Number(offPeakRate).toFixed(3)} / kWh` },
    blendedRate !== undefined && { term: 'Blended rate used', value: `$${Number(blendedRate).toFixed(3)} / kWh` },
    batteryRoundTrip !== undefined && { term: 'Battery round-trip efficiency', value: `${batteryRoundTrip}%` },
    batteryDegradation !== undefined && { term: 'Battery degradation', value: `${batteryDegradation}% / year` },
    { term: 'Export credit', value: `$${Number(exportRate).toFixed(2)} / kWh` },
  ].filter(Boolean);

  return (
    <aside className="hair pt-4">
      <Perforation className="mb-4" label="Assumptions follow" />
      <h3 className="mb-2 font-semibold text-ink" style={{ fontSize: 'var(--size-15)', lineHeight: 'var(--lh-15)', letterSpacing: 'var(--track-15)' }}>Assumptions behind these numbers</h3>
      <dl>
        {rows.map((row, i) => (
          <Row key={row.term} term={row.term} symbol={MARKERS[i + markerOffset] ?? MARKERS[MARKERS.length - 1]}>
            {row.value}
          </Row>
        ))}
      </dl>
      <p
        className="mt-4 text-ink-3"
        style={{ fontSize: 'var(--size-11)', lineHeight: 'var(--lh-11)', letterSpacing: 'var(--track-11)' }}
      >
        This is an estimate, not a quote or guarantee. Actual utility rates, production, usage, financing, and incentives can change your results.
      </p>
    </aside>
  );
};

export default AssumptionsPanel;
