import { useId, useState } from 'react';
import { Card, Figure, Marker, Perforation } from '../components/ui';
import Rail from '../components/Rail';
import { usePremises } from '../components/useShell';

// =============================================================================
// COUNTERFOIL — the Bill Decoder.
//
// This tool IS a bill, so it is the truest expression of the system: a ruled
// document, not an interface. A 2px sheet rule at the top, line items on 0.5px
// hairlines, one right-aligned tabular figure column with its `$` set once at
// the head, and a TOTAL row solid-filled in `--ink` with inverted type — the
// way the last line of a statement has been printed for a century.
//
// There is no accent colour and there are no boxes. The rows solar removes are
// not given a coloured background: they carry a footnote marker and a `--good`
// figure, and the marker is answered in the marginalia rail. Red does not
// appear anywhere in this tool, because nothing here is a disclosure.
// =============================================================================

/**
 * The hatch. Inline SVG, never a repeating gradient: the breakdown has to carry
 * its argument in greyscale, through a photocopier and to a reader with colour
 * vision deficiency, so the encoding is redundant — what solar takes over is
 * solid and chromatic, what the utility keeps is muddy AND ruled through.
 */
const Hatch = ({ id }) => (
  <defs>
    <pattern id={id} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="5" height="5" className="fill-s-baseline" />
      <line x1="0" y1="0" x2="0" y2="5" strokeWidth="1.7" className="stroke-s-baseline-stroke" />
    </pattern>
  </defs>
);

/** A legend key: the same paint as the band segment it names, at 10px. */
const Swatch = ({ elim, opacity, patternId }) => (
  <svg width="10" height="10" aria-hidden="true" focusable="false" className="mt-1 block shrink-0">
    {!elim && <Hatch id={patternId} />}
    <rect
      width="10"
      height="10"
      fillOpacity={opacity}
      {...(elim ? { className: 'fill-s-proposed' } : { fill: `url(#${patternId})` })}
    />
  </svg>
);

/** Type for a 13px line-item row — the body size of the whole document. */
const LINE = {
  fontSize: 'var(--size-13)',
  lineHeight: 'var(--lh-13)',
  letterSpacing: 'var(--track-13)',
};

/** Type for a footnote or a sub-figure caption. */
const FOOT = {
  fontSize: 'var(--size-11)',
  lineHeight: 'var(--lh-11)',
  letterSpacing: 'var(--track-11)',
};

/**
 * A figure in the display band: condensed (`wdth` 62) tabular numerals with the
 * currency symbol set once, in Spline Sans Mono at 0.74× in `--ink-3`.
 */
const DisplayFigure = ({ children }) => (
  <div
    className="tnum mt-1 font-semibold text-ink"
    style={{
      fontSize: 'var(--size-40)',
      lineHeight: 'var(--lh-40)',
      letterSpacing: 'var(--track-40)',
      fontStretch: '62%',
    }}
  >
    <span
      className="mr-0.5 font-mono font-normal text-ink-3"
      style={{ fontSize: 'calc(var(--size-40) * 0.74)' }}
    >
      $
    </span>
    {children}
  </div>
);

const BillDecoder = ({ onExport }) => {
  const [lineItems, setLineItems] = useState([
    { id: 'generation', label: 'Generation Charges', amount: 142.50, description: 'The actual cost of creating the electricity. This is the main part Solar replaces.', solarElim: true },
    { id: 'transmission', label: 'Transmission', amount: 45.20, description: 'The cost to move electricity from power plants over high-voltage lines to your neighborhood substation.', solarElim: true },
    { id: 'distribution', label: 'Distribution', amount: 62.15, description: 'The cost to deliver power from the substation to your house (poles and wires).', solarElim: false },
    { id: 'nbc', label: 'Public Purpose Programs (NBCs)', amount: 12.33, description: 'Non-Bypassable Charges. Small fees mandated by the state that solar cannot offset (~$10-15/mo).', solarElim: false },
    { id: 'connection', label: 'Minimum Connection Fee', amount: 10.00, description: 'Monthly grid connection fee charged by the utility regardless of usage.', solarElim: false },
  ]);
  const updateAmount = (id, val) => setLineItems(lineItems.map(i => i.id === id ? { ...i, amount: parseFloat(val) || 0 } : i));
  const totalBill = lineItems.reduce((a, c) => a + c.amount, 0);
  const solarSaves = lineItems.filter(i => i.solarElim).reduce((a, c) => a + c.amount, 0);
  const remaining = totalBill - solarSaves;

  // An empty bill is a real state (every box cleared), not an error — it must
  // print `0%`, never `NaN%`.
  const share = (value) => (totalBill > 0 ? (value / totalBill) * 100 : 0);
  const savedShare = share(solarSaves).toFixed(0);

  // `useId` is namespaced with colons in React 18; a fragment identifier in
  // `url(#…)` has to survive being parsed as one, so strip everything else out.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

  // Series roles are entity-stable: `--s-proposed` is always the proposed
  // system, `--s-baseline` is always the utility. Within a group the shade
  // steps down so neighbouring segments stay distinguishable; the ruled legend
  // below names every one of them directly.
  const elimItems = lineItems.filter(i => i.solarElim);
  const remainItems = lineItems.filter(i => !i.solarElim);
  let cursor = 0;
  const breakdown = [...elimItems, ...remainItems].map((item) => {
    const group = item.solarElim ? elimItems : remainItems;
    const pct = share(item.amount);
    const segment = {
      id: item.id,
      name: item.label,
      elim: item.solarElim,
      pct,
      x: cursor,
      opacity: 1 - group.indexOf(item) * 0.28,
    };
    cursor += pct;
    return segment;
  });

  // The premises the figures below hang on: the bill as entered. The bar sets
  // them tabular and never lets a figure float free of what produced it.
  usePremises({
    assumptionSet: 'Utility Bill',
    fields: [{ label: 'Total Amount Due', value: `$${totalBill.toFixed(2)}` }],
  });

  return (
    <div>
      <header>
        <h2
          className="font-semibold text-ink"
          style={{ fontSize: 'var(--size-28)', lineHeight: 'var(--lh-28)', letterSpacing: 'var(--track-28)' }}
        >
          Smart Bill Decoder
        </h2>
        <p
          className="mt-2 max-w-[46em] text-ink-2"
          style={{ fontSize: 'var(--size-15)', lineHeight: 'var(--lh-15)', letterSpacing: 'var(--track-15)' }}
        >
          Enter your bill amounts. See what solar can reduce and what stays.
        </p>
      </header>

      <div className="mt-8 grid grid-cols-1 items-start gap-x-12 gap-y-10 [@media(min-width:920px)]:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        {/* 01 — THE BILL. Inputs left and sticky, as every calculator here is. */}
        <Card className="[@media(min-width:920px)]:sticky [@media(min-width:920px)]:top-14 px-6 pb-7 pt-5">
          <div className="flex items-baseline justify-between gap-4">
            <div className="flex items-baseline gap-2">
              <span className="eyebrow">01</span>
              <h3
                className="font-semibold text-ink"
                style={{ fontSize: 'var(--size-15)', lineHeight: 'var(--lh-15)', letterSpacing: 'var(--track-15)' }}
              >
                Utility Bill
              </h3>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-ink-3" style={FOOT}>Edit amounts below</span>
              {/* The unit, set ONCE at the head of the figure column. */}
              <span
                className="w-24 text-right font-mono text-ink-3"
                style={{ fontSize: 'calc(var(--size-13) * 0.74)' }}
              >
                $
              </span>
            </div>
          </div>
          <hr className="rule mt-1.5" />

          {/* What each line of a bill actually is IS this tool. It is printed
              under the row it explains, as an 11px footnote — never revealed on
              hover, which would hide the whole content of the page from a
              reader who is not pointing at it and shift the sheet as it moved. */}
          {lineItems.map((item) => (
            <div key={item.id} className="-mx-6 border-b-[0.5px] border-hair px-6 py-2">
              <div className="flex items-baseline justify-between gap-4">
                {/* The label, then the standing note that solar takes this
                    line over, then the marker keying it to the rail. The
                    words are the ones this tool has always printed. */}
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="min-w-0 truncate text-ink" style={LINE}>{item.label}</span>
                  {item.solarElim && (
                    <span className="eyebrow flex-none">
                      SOLAR SAVES
                      <Marker symbol="*" />
                    </span>
                  )}
                </span>
                <input
                  type="number"
                  value={item.amount}
                  onChange={e => updateAmount(item.id, e.target.value)}
                  aria-label={item.label}
                  step="0.01"
                  style={LINE}
                  className="tnum w-24 shrink-0 border-0 border-b border-transparent bg-transparent py-0.5 pl-0 text-right text-ink [appearance:textfield] hover:border-rule focus:border-rule focus:bg-field [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
              <p className="mt-0.5 max-w-prose text-ink-3" style={FOOT}>
                {item.description}
              </p>
            </div>
          ))}

          {/* THE TOTAL. Solid-filled ink, inverted type, bled to the sheet edge. */}
          <div className="-mx-6 flex items-baseline justify-between gap-4 bg-ink px-6 py-2 text-surface">
            <span className="font-semibold" style={LINE}>Total Amount Due</span>
            <span className="tnum w-24 shrink-0 text-right font-semibold" style={LINE}>{totalBill.toFixed(2)}</span>
          </div>

          {/* What the bill becomes. Two display figures, no tiles, no divider. */}
          <div className="mt-7 grid grid-cols-2 gap-x-8">
            <div>
              <div className="eyebrow">Solar Eliminates</div>
              <DisplayFigure>{solarSaves.toFixed(0)}</DisplayFigure>
              <div className="mt-1 text-ink-3" style={FOOT}>
                <span className="tnum">{savedShare}</span>% of bill
              </div>
            </div>
            <div>
              <div className="eyebrow">
                Remaining w/ Solar
                <Marker symbol="†" />
              </div>
              <DisplayFigure>{remaining.toFixed(0)}</DisplayFigure>
              <div className="mt-1 text-ink-3" style={FOOT}>NBCs + fees</div>
            </div>
          </div>
        </Card>

        {/* 02 — THE BREAKDOWN. */}
        <div>
          <Card className="px-6 pb-7 pt-5">
            <div className="flex items-baseline gap-2">
              <span className="eyebrow">02</span>
              <h3
                className="font-semibold text-ink"
                style={{ fontSize: 'var(--size-15)', lineHeight: 'var(--lh-15)', letterSpacing: 'var(--track-15)' }}
              >
                Bill Breakdown
              </h3>
            </div>
            <hr className="rule mt-1.5" />

            <Figure number={1} className="mt-4">
              Every dollar of the bill, solid where solar takes over and hatched where the utility keeps charging
            </Figure>
            <svg
              width="100%"
              height="26"
              role="img"
              aria-label="Bill Breakdown"
              className="mt-2 block"
            >
              <Hatch id={`hatch-${uid}-band`} />
              {breakdown.map(segment => (
                <rect
                  key={segment.id}
                  x={`${segment.x}%`}
                  y="0"
                  width={`${segment.pct}%`}
                  height="26"
                  fillOpacity={segment.opacity}
                  {...(segment.elim
                    ? { className: 'fill-s-proposed' }
                    : { fill: `url(#hatch-${uid}-band)` })}
                />
              ))}
              {/* A hairline of the sheet between touching segments — the same
                  gap of paper a bill leaves between two ruled amounts. */}
              {breakdown.slice(1).map(segment => (
                <rect
                  key={`gap-${segment.id}`}
                  x={`${segment.x}%`}
                  y="0"
                  width="2"
                  height="26"
                  transform="translate(-1, 0)"
                  className="fill-surface"
                />
              ))}
            </svg>

            <div className="mt-4 flex items-baseline justify-end">
              <span
                className="w-12 text-right font-mono text-ink-3"
                style={{ fontSize: 'calc(var(--size-12) * 0.74)' }}
              >
                %
              </span>
            </div>
            <hr className="hair" />
            {breakdown.map((segment, i) => (
              <div key={segment.id} className="flex items-baseline justify-between gap-3 border-b-[0.5px] border-hair py-1.5">
                <span className="flex min-w-0 items-baseline gap-2">
                  <Swatch elim={segment.elim} opacity={segment.opacity} patternId={`hatch-${uid}-sw${i}`} />
                  <span className="min-w-0 truncate text-ink-2" style={{ fontSize: 'var(--size-12)', lineHeight: 'var(--lh-12)', letterSpacing: 'var(--track-12)' }}>
                    {segment.name}
                  </span>
                </span>
                <span className="tnum w-12 shrink-0 text-right text-ink" style={{ fontSize: 'var(--size-12)', lineHeight: 'var(--lh-12)', letterSpacing: 'var(--track-12)' }}>
                  {segment.pct.toFixed(0)}
                </span>
              </div>
            ))}
          </Card>

          <button
            type="button"
            onClick={() => onExport({ lineItems, totalBill, solarSaves, remaining })}
            className="eyebrow mt-6 w-full bg-ink px-5 py-3 text-center text-surface hover:bg-ink-2 print:hidden"
          >
            Export to Proposal
          </button>
        </div>
      </div>

      {/* THE MARGINALIA. The markers on the sheet are answered here, on the
          page — never in a tooltip, never behind a click. */}
      <Rail>
        <aside className="hair pt-4">
          <Perforation className="mb-4" />
          <h3 className="eyebrow mb-2">What this means for you</h3>
          <dl>
            <div className="border-b-[0.5px] border-hair py-1.5">
              <dt className="text-ink" style={LINE}>
                <span className="mr-1 select-none font-mono text-ink-3" aria-hidden="true">*</span>
                <strong className="font-medium">Eliminates <span className="tnum">{savedShare}%</span>:</strong>
              </dt>
              <dd className="text-ink-2" style={LINE}>Generation + Transmission wiped out.</dd>
            </div>
            <div className="border-b-[0.5px] border-hair py-1.5">
              <dt className="text-ink" style={LINE}>
                <span className="mr-1 select-none font-mono text-ink-3" aria-hidden="true">†</span>
                <strong className="font-medium">Residual ~<span className="tnum">${remaining.toFixed(0)}</span>/mo:</strong>
              </dt>
              <dd className="text-ink-2" style={LINE}>NBCs and connection fees remain.</dd>
            </div>
          </dl>
        </aside>
      </Rail>
    </div>
  );
};

export default BillDecoder;
