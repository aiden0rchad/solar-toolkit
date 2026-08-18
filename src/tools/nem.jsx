import { usePremises } from '../components/useShell';
import { Card, Figure } from '../components/ui';

// =============================================================================
// INSTRUMENT — the NEM explainers.
//
// These pages argue in prose, but they are still sheets of this instrument and
// not a separate publication: a `Card` opened by the 2px `--rule-strong` rule,
// an `.eyebrow` silkscreened above the heading, the same 26px h2 every other
// view heads at, 15/1.5 body in `--ink-2` with oldstyle
// proportional figures, numbered sections, and the import/export comparison as
// a ruled table with the unit stated once at the head of each figure column.
//
// AND THEY LEAD WITH DATA. The two rates at the era's own peak hour are set as
// readout blocks above the table, because those two numbers ARE the argument —
// 0.58 in against 0.06 out is the whole of NEM 3.0, and it was previously set
// as two 13px table cells while the page opened on a paragraph. The same pair
// is published to the sticky context bar, so the bar states the tariff instead
// of falling back to "Toolkit defaults" on a page that has no defaults.
//
// All three eras get IDENTICAL treatment. There is no per-era colour coding, no
// icon that ranks one tariff above another and no coloured panel anywhere — the
// reader is told what changed, not how to feel about it. A three-point line
// chart was carrying less information than the table that replaced it.
//
// THE ONE RULE holds trivially here, by having nothing to spend: this view
// measures nothing of the reader's, so it plots nothing, so there is no chroma
// on it at all. A tariff era is a fact, not a quantity — inking NEM 3.0 red
// would be the page telling the reader how to feel, which is the one thing the
// treatment above exists to refuse.
// =============================================================================

const T13 = { fontSize: 'var(--size-13)', lineHeight: 'var(--lh-13)', letterSpacing: 'var(--track-13)' };
const T15 = { fontSize: 'var(--size-15)', lineHeight: 'var(--lh-15)', letterSpacing: 'var(--track-15)' };
const T26 = { fontSize: 'var(--size-26)', lineHeight: 'var(--lh-26)', letterSpacing: 'var(--track-26)' };
const T34 = { fontSize: 'var(--size-34)', lineHeight: 'var(--lh-34)', letterSpacing: 'var(--track-34)' };

/** The unit beside a readout: 0.4× the figure it qualifies, mono, `--ink-3`. */
const UNIT_34 = { fontSize: 'calc(var(--size-34) * 0.4)', lineHeight: 1 };

/**
 * A READOUT BLOCK — the same one every other view reports in. Micro-label above
 * in mono, the figure in Public Sans bold on the 34 step, the unit in mono at
 * 0.4× in `--ink-3`.
 *
 * 34 and 700, down from a condensed 40 at 800: Public Sans sets at full width
 * where Archivo was squeezed to 62%, so the old step would have overrun the
 * measure, and the extra weight a narrowed face needed to hold its colour
 * becomes a figure shouting over its own micro-label at full width.
 *
 * UNTONED, deliberately. `toneForValue` inks a figure from its own magnitude
 * inside a domain the reader's own numbers sit in; this page measures nothing
 * of the reader's, so there is no domain and no reading to take a hue from. A
 * tariff era is a fact, not a quantity — the figure stays `--ink`.
 */
const Readout = ({ label, prefix, value, unit }) => (
  <div className="min-w-0">
    <p className="eyebrow">{label}</p>
    <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5">
      {prefix && <span className="font-mono text-ink-3" style={UNIT_34}>{prefix}</span>}
      <span className="tnum text-ink" style={{ ...T34, fontWeight: 700 }}>
        {value}
      </span>
      {unit && <span className="font-mono text-ink-3" style={UNIT_34}>{unit}</span>}
    </p>
  </div>
);

// Row height is locked and the type is fitted inside it; the padding is
// asymmetric because optical centring is not geometric centring.
const CELL = { padding: '0.125em 0.5em 0.25em 0.5em', height: '28px' };
const CELL_FIRST = { ...CELL, paddingLeft: 0 };
const CELL_LAST = { ...CELL, paddingRight: 0 };

/** A figure column head: the name, and beneath it the unit, once. */
const FigureHead = ({ label, unit, style }) => (
  <th scope="col" style={style} className="align-bottom">
    <span className="eyebrow block text-right">{label}</span>
    <span className="block text-right font-mono text-ink-3" style={{ fontSize: 'calc(var(--size-13) * 0.74)' }}>
      {unit}
    </span>
  </th>
);

/**
 * One era, set as a document.
 *
 * `rates` is `[{ hour, i, e }]` in dollars per kWh — the same figures the page
 * has always carried, printed rather than plotted.
 */
const Explainer = ({ era, title, intro, rates, notes }) => {
  // The era's peak hour: the row carrying the highest import rate, and the one
  // the two readouts and the context bar both report. Ties resolve to the first
  // row, which is right for NEM 1.0 — a flat tariff has no peak, so the page
  // reports the rate it charges all day.
  const peak = rates.reduce((worst, rate) => (rate.i > worst.i ? rate : worst), rates[0]);

  usePremises({
    assumptionSet: title,
    fields: [
      { label: `Import · ${peak.hour}`, value: peak.i.toFixed(2), unit: '$/kWh' },
      { label: `Export · ${peak.hour}`, value: peak.e.toFixed(2), unit: '$/kWh' },
    ],
  });

  return (
    <Card className="max-w-prose">
      <header>
        <p className="eyebrow">{era}</p>
        {/* The masthead carries the page <h1>; every view heads at h2. */}
        <h2 className="mt-1 font-semibold text-ink" style={T26}>{title}</h2>
      </header>

      {/* THE DATA, before the prose. Two readouts on one ruled cluster: what a
          kilowatt-hour costs at the era's peak hour, and what the same
          kilowatt-hour is worth going the other way. The gap between them is the
          entire argument of all three of these pages. */}
      <div className="mt-5 grid grid-cols-1 gap-x-10 gap-y-5 border-y border-rule py-4 sm:grid-cols-2">
        <Readout label={`Import · ${peak.hour}`} prefix="$" value={peak.i.toFixed(2)} unit="/ kWh" />
        <Readout label={`Export · ${peak.hour}`} prefix="$" value={peak.e.toFixed(2)} unit="/ kWh" />
      </div>

      <p className="mt-4 pnum text-ink-2" style={T15}>{intro}</p>

      {/* The numbered caption is the table's own <caption>, not a heading parked
          above it: that is what gives the table an accessible name, and it keeps
          the figure number attached to the figure when a reader arrives by
          following it. Rules come off the ladder — 2px `--rule-strong` under the
          head, 0.5px `--rule` between rows — and never off `--ink`, which is
          readout ink and printed a hairline heavier than anything else on the
          page. */}
      <table className="mt-8 w-full" style={{ borderCollapse: 'collapse' }}>
        <caption className="caption-top text-left">
          <Figure number={1} caption="Import and export rates through the day" className="mb-1.5" />
        </caption>
        <thead>
          <tr className="border-b-2 border-rule-strong">
            <th scope="col" style={CELL_FIRST} className="eyebrow text-left align-bottom">Hour</th>
            <FigureHead label="Import" unit="$/kWh" style={CELL} />
            <FigureHead label="Export" unit="$/kWh" style={CELL_LAST} />
          </tr>
        </thead>
        <tbody>
          {rates.map(rate => (
            <tr key={rate.hour} className="border-b-[0.5px] border-rule">
              <th scope="row" style={{ ...CELL_FIRST, fontWeight: 400 }} className="text-left text-ink-2">
                <span style={T13}>{rate.hour}</span>
              </th>
              <td style={CELL} className="tnum text-right text-ink">
                <span style={T13}>{rate.i.toFixed(2)}</span>
              </td>
              <td style={CELL_LAST} className="tnum text-right text-ink">
                <span style={T13}>{rate.e.toFixed(2)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {notes.map((note, index) => (
        <section key={note.title} className="mt-8">
          <hr className="rule" />
          <h3 className="mt-3 flex items-baseline gap-3">
            <span className="eyebrow tnum flex-none">{String(index + 1).padStart(2, '0')}</span>
            <span className="font-semibold text-ink" style={T15}>{note.title}</span>
          </h3>
          <p className="mt-1.5 pnum text-ink-2" style={T15}>{note.body}</p>
        </section>
      ))}
    </Card>
  );
};

export const NEM1Explainer = () => (
  <Explainer
    era="NEM 1.0 · Legacy"
    title="NEM 1.0: The Golden Era"
    intro="Legacy systems installed before 2017. 100% efficient grid battery."
    rates={[
      { hour: 'Mid', i: 0.2, e: 0.2 },
      { hour: 'Noon', i: 0.2, e: 0.2 },
      { hour: 'Eve', i: 0.2, e: 0.2 },
    ]}
    notes={[
      { title: '1-for-1 Swap', body: 'Import and Export rates were identical.' },
    ]}
  />
);

export const NEM2Explainer = () => (
  <Explainer
    era="NEM 2.0 · Transition"
    title="NEM 2.0: The Transition"
    intro="2017-2023. Introduced Time-of-Use and NBCs."
    rates={[
      { hour: 'Mid', i: 0.35, e: 0.32 },
      { hour: '4PM', i: 0.50, e: 0.47 },
      { hour: '9PM', i: 0.35, e: 0.32 },
    ]}
    notes={[
      { title: 'TOU + NBCs', body: 'Small non-bypassable charges (~2¢) added to imports.' },
    ]}
  />
);

export const NEM3Explainer = () => (
  <Explainer
    era="NEM 3.0 · Current"
    title="NEM 3.0: The New Reality"
    intro={'Current policy. The "Buy High, Sell Low" problem.'}
    rates={[
      { hour: 'Mid', i: 0.35, e: 0.04 },
      { hour: 'Noon', i: 0.35, e: 0.03 },
      { hour: 'Eve', i: 0.58, e: 0.06 },
    ]}
    notes={[
      { title: '75% Value Drop', body: 'Exports are worth ~4¢. Imports cost ~58¢.' },
      { title: 'Battery Required', body: 'Store cheap solar, use it when rates are high.' },
    ]}
  />
);
