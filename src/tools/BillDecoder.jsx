import { useId, useState } from 'react';
import { Card, Figure, Marker, Perforation } from '../components/ui';
import Rail from '../components/Rail';
import { MARKERS } from '../components/markers';
import { usePremises } from '../components/useShell';

// =============================================================================
// INSTRUMENT — the Bill Decoder.
//
// This tool IS a bill, so it is the truest test of the ledger language: a ruled
// document, not an interface. Each sheet opens on a 2px `--rule-strong` rule,
// line items sit on 1px rules, the amounts run down one right-aligned tabular
// column with its `$` set once at the head, and the last line is solid `--ink`
// with inverted `--surface` type — the way the bottom of a statement has been
// printed for a century.
//
// THE ONE RULE holds. The only chroma on this sheet is measured:
//
//   · the amounts solar eliminates wear `--d-good`, because "this line goes to
//     zero" is a positive delta — a measured outcome, not an accent;
//   · the breakdown band wears the fixed entity mapping, `--d-solar` for the
//     share the proposed system takes over and `--d-grid` for the share the
//     utility keeps charging.
//
// Everything else — section heads, micro-labels, rules, footnote markers, the
// legend text, the descriptions — is achromatic. There are NO coloured row
// backgrounds: the row wash under the cursor is `--raised`, a chrome tone, so
// pointing at a row never restates its data with a second, weaker encoding.
//
// The band's encoding is redundant on purpose — solid against hatched-and-ruled,
// each segment named in the ruled legend beneath — so the argument survives
// greyscale, a photocopier and colour-vision deficiency without hue.
// =============================================================================

/**
 * One step of the bi-modal scale: size, leading and tracking together, because
 * they are a set and picking a size without its leading is how a readout ends
 * up wearing body line-height.
 */
const typeAt = (step) => ({
  fontSize: `var(--size-${step})`,
  lineHeight: `var(--lh-${step})`,
  letterSpacing: `var(--track-${step})`,
});

/**
 * The unit beside a readout: 0.4× the figure it qualifies, in mono, `--ink-3`.
 * `line-height: 1` so it sits on the figure's baseline instead of dragging the
 * display leading down with it.
 */
const unitAt = (step) => ({
  fontSize: `calc(var(--size-${step}) * 0.4)`,
  lineHeight: 1,
});

/** 13px line-item body — the size the whole document is set in. */
const LINE = typeAt(13);

/** 11px footnote — the voice everything secondary speaks in on this sheet. */
const FOOT = typeAt(11);

/** 12px, for the legend column under the band. */
const LEGEND = typeAt(12);

/**
 * A numbered section head. The numeral is mono, so it reads as an index key
 * rather than a quantity and never enters the tabular figure column.
 */
const SectionHead = ({ number, children, className = '', as: Tag = 'h3' }) => (
  <div className={`flex items-baseline gap-2 ${className}`}>
    <span className="font-mono text-ink-3" style={FOOT}>{number}</span>
    <Tag className="eyebrow">{children}</Tag>
  </div>
);

/**
 * A READOUT BLOCK — the unit this instrument reports in.
 *
 * Micro-label above in mono; the figure in Archivo condensed heavy and tabular;
 * the currency mark in mono at 0.4× in `--ink-3`, so the quantity is the only
 * thing carrying weight.
 *
 * `tone` inks the FIGURE alone. The micro-label, the currency mark and the note
 * are chrome and stay achromatic. Only one of the two readouts here takes a
 * tone: the eliminated total is the sum of the `--d-good` rows above it and
 * wears the same state, while the residual is the sum of the ink rows and stays
 * `--ink` — so the cluster and the ledger are one reading, not two.
 */
const Readout = ({ label, prefix, value, unit, step = 40, tone, note }) => (
  <div className="min-w-0">
    <div className="eyebrow">{label}</div>
    <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1">
      {prefix && (
        <span className="font-mono text-ink-3" style={unitAt(step)}>{prefix}</span>
      )}
      <span
        className={`tnum ${tone ?? 'text-ink'}`}
        style={{ ...typeAt(step), fontStretch: '62%', fontWeight: 700 }}
      >
        {value}
      </span>
      {unit && <span className="font-mono text-ink-3" style={unitAt(step)}>{unit}</span>}
    </div>
    {note && <p className="mt-1 text-ink-3" style={FOOT}>{note}</p>}
  </div>
);

/**
 * The hatch. Inline SVG, never a repeating gradient: the breakdown has to carry
 * its argument in greyscale, through a photocopier and to a reader with colour
 * vision deficiency, so the encoding is redundant — what the proposed system
 * takes over is SOLID, what the utility keeps is hatched AND ruled through.
 */
const Hatch = ({ id }) => (
  <defs>
    <pattern id={id} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="5" height="5" className="fill-d-grid" />
      <line x1="0" y1="0" x2="0" y2="5" strokeWidth="1.7" className="stroke-d-grid" />
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
      {...(elim ? { className: 'fill-d-solar' } : { fill: `url(#${patternId})` })}
    />
  </svg>
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

  // The two footnote keys this sheet prints, drawn from the house sequence so
  // no symbol is ever set twice on one page.
  const [ELIM_MARKER, RESIDUAL_MARKER] = MARKERS;

  // Series roles are entity-stable: `--d-solar` is always the proposed system,
  // `--d-grid` is always the utility. Within a group the shade steps down so
  // neighbouring segments stay distinguishable; the ruled legend below names
  // every one of them directly.
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

  // The premises the figures below hang on: the bill exactly as entered. The
  // bar sets them tabular and never lets a figure float free of what produced
  // it.
  usePremises({
    assumptionSet: 'Utility Bill',
    fields: [
      { label: 'Bill total', value: totalBill.toFixed(2), unit: '$ / mo' },
      { label: 'Solar eliminates', value: savedShare, unit: '%' },
      { label: 'Remaining', value: remaining.toFixed(2), unit: '$ / mo' },
    ],
  });

  return (
    <div>
      <header className="mb-7">
        <p className="eyebrow">Bill · line by line</p>
        {/* The masthead carries the page <h1>; every view heads at h2. */}
        <h2
          className="mt-1 font-semibold text-ink"
          style={{ ...typeAt(28), fontStretch: '75%' }}
        >
          Smart Bill Decoder
        </h2>
        <p className="mt-1.5 max-w-[52ch] text-ink-2" style={typeAt(15)}>
          Enter your bill amounts. See what solar can reduce and what stays.
        </p>
      </header>

      {/* SPLIT PANE. The bill left and pinned, what it becomes right and live —
          the reader never loses the line items while reading the totals they
          made. */}
      <div className="grid grid-cols-1 items-start gap-x-12 gap-y-10 [@media(min-width:920px)]:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        {/* 01 — THE BILL, set as a ruled document. */}
        <Card className="[@media(min-width:920px)]:sticky [@media(min-width:920px)]:top-14 px-6 pb-7 pt-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <SectionHead number="01">Utility bill</SectionHead>
            <span className="eyebrow">Edit amounts below</span>
          </div>

          {/* THE COLUMN HEADS. The unit is set ONCE, at the head of the figure
              column, the way a statement heads its money column — not repeated
              onto every row. */}
          <div className="mt-3.5 flex items-baseline justify-between gap-4 border-b border-rule pb-1">
            <span className="eyebrow">Line item</span>
            <span className="eyebrow w-24 shrink-0 text-right">Amount · $</span>
          </div>

          {/* THE LINE ITEMS. What each line of a bill actually is IS this tool,
              so the explanation is PRINTED under the row it explains, as an 11px
              footnote. It is never revealed on hover: that would hide the whole
              content of the page from a reader who is not pointing at it, and it
              would reflow the sheet under the cursor.

              What hover does instead is wash the row in `--raised` — a chrome
              tone, bled to the sheet edges, so the row under the pointer or the
              keyboard focus is marked without a second colour claiming to mean
              something about the money on it. */}
          {lineItems.map((item) => (
            <div
              key={item.id}
              className="-mx-6 border-b border-rule px-6 py-2 hover:bg-raised focus-within:bg-raised"
            >
              <div className="flex items-baseline justify-between gap-4">
                {/* The label, then the standing note that solar takes this line
                    over, then the marker keying it to the rail. The words are
                    the ones this tool has always printed. */}
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="min-w-0 truncate text-ink" style={LINE}>{item.label}</span>
                  {item.solarElim && (
                    <span className="eyebrow flex-none">
                      SOLAR SAVES
                      <Marker symbol={ELIM_MARKER} />
                    </span>
                  )}
                </span>
                {/* The amount. A line solar takes to zero is a positive delta,
                    so it wears `--d-good`; a line that survives the system stays
                    `--ink`. The state is never carried by hue alone — the row
                    also prints "SOLAR SAVES" and a footnote marker.

                    These are EDITABLE, and they say so at rest: a
                    `--control-edge` underline at 3:1, not the transparent
                    border they used to carry, which left the whole ledger
                    looking like printed figures until the pointer happened to
                    cross one. Hover and focus still step the edge up — to
                    `--ink-3`, then to `--ink` — so the ladder runs upward from
                    an affordance that was already visible. */}
                <input
                  type="number"
                  value={item.amount}
                  onChange={e => updateAmount(item.id, e.target.value)}
                  aria-label={item.label}
                  aria-describedby={`${uid}-${item.id}-note`}
                  step="0.01"
                  style={LINE}
                  className={`tnum w-24 shrink-0 border-0 border-b border-control-edge bg-transparent py-0.5 pl-0 text-right [appearance:textfield] hover:border-ink-3 focus:border-ink focus:bg-field [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${item.solarElim ? 'text-d-good' : 'text-ink'}`}
                />
              </div>
              <p id={`${uid}-${item.id}-note`} className="mt-0.5 max-w-prose text-ink-3" style={FOOT}>
                {item.description}
              </p>
            </div>
          ))}

          {/* THE TOTAL. Solid `--ink`, inverted `--surface` type, bled to the
              sheet edge — the last line of a statement. */}
          <div className="-mx-6 flex items-baseline justify-between gap-4 bg-ink px-6 py-2 text-surface">
            <span className="font-semibold" style={LINE}>Total Amount Due</span>
            <span className="tnum w-24 shrink-0 text-right font-semibold" style={LINE}>{totalBill.toFixed(2)}</span>
          </div>
        </Card>

        {/* 02 / 03 — WHAT THE BILL BECOMES. */}
        <div>
          <Card className="px-6 pb-7 pt-5">
            <SectionHead number="02">What solar changes</SectionHead>

            {/* THE READOUT CLUSTER — ruled, not carded. One rule between the
                blocks and one under the group; no boxes, no padding wells.
                Each figure is the sum of the ledger rows that wear its ink. */}
            <div className="mt-2.5 grid grid-cols-1 divide-y divide-rule border-b border-rule sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <div className="py-3 sm:pr-4">
                <Readout
                  label="Solar Eliminates"
                  prefix="$"
                  value={solarSaves.toFixed(0)}
                  tone="text-d-good"
                  note={<><span className="tnum">{savedShare}</span>% of bill</>}
                />
              </div>
              <div className="py-3 sm:pl-4">
                <Readout
                  label={<>Remaining w/ Solar<Marker symbol={RESIDUAL_MARKER} /></>}
                  prefix="$"
                  value={remaining.toFixed(0)}
                  note="NBCs + fees"
                />
              </div>
            </div>

            <hr className="rule-strong mt-8" />
            <SectionHead number="03" className="mt-2.5">Bill breakdown</SectionHead>

            <Figure number={1} className="mt-3 max-w-[60ch]">
              Every dollar of the bill, solid where solar takes over and hatched where the utility keeps charging
            </Figure>
            <svg
              width="100%"
              height="26"
              role="img"
              aria-label={`Every dollar of the $${totalBill.toFixed(2)} bill: solar takes over ${savedShare}%, the utility keeps charging for the rest.`}
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
                    ? { className: 'fill-d-solar' }
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

            {/* The ruled legend. Every segment is named here in full, so the
                band is readable without separating its hues. */}
            <div className="mt-5 flex items-baseline justify-between gap-3 border-b border-rule pb-1">
              <span className="eyebrow">Component</span>
              <span className="eyebrow w-12 shrink-0 text-right">Share · %</span>
            </div>
            {breakdown.map((segment, i) => (
              <div key={segment.id} className="flex items-baseline justify-between gap-3 border-b border-rule py-1.5">
                <span className="flex min-w-0 items-baseline gap-2">
                  <Swatch elim={segment.elim} opacity={segment.opacity} patternId={`hatch-${uid}-sw${i}`} />
                  <span className="min-w-0 truncate text-ink-2" style={LEGEND}>
                    {segment.name}
                  </span>
                </span>
                <span className="tnum w-12 shrink-0 text-right text-ink" style={LEGEND}>
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
          page — never in a tooltip, never behind a click. The perforation is
          the tear this tool is named for: above it, the reader's numbers; below
          it, what they mean. */}
      <Rail>
        <aside className="pt-4">
          <Perforation className="mb-4" label="Notes follow" />
          <h3 className="eyebrow mb-2">What this means for you</h3>
          <dl>
            <div className="border-b border-rule py-1.5">
              <dt className="text-ink" style={LINE}>
                <span className="mr-1 select-none font-mono text-ink-3" aria-hidden="true">{ELIM_MARKER}</span>
                <strong className="font-medium">Eliminates <span className="tnum">{savedShare}%</span>:</strong>
              </dt>
              <dd className="text-ink-2" style={LINE}>Generation + Transmission wiped out.</dd>
            </div>
            <div className="border-b border-rule py-1.5">
              <dt className="text-ink" style={LINE}>
                <span className="mr-1 select-none font-mono text-ink-3" aria-hidden="true">{RESIDUAL_MARKER}</span>
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
