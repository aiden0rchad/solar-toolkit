import { Figure } from '../components/ui';

// =============================================================================
// COUNTERFOIL — the NEM explainers.
//
// These pages argue in prose, so they are set as a document and not as a
// dashboard: one measure at max-w-prose, a 22px heading, 15/1.5 body in
// `--ink-2` with oldstyle proportional figures, numbered sections, and the
// import/export comparison as a ruled table with the unit stated once at the
// head of each figure column.
//
// All three eras get IDENTICAL treatment. There is no per-era colour coding, no
// icon that ranks one tariff above another and no coloured panel anywhere — the
// reader is told what changed, not how to feel about it. A three-point line
// chart was carrying less information than the table that replaced it.
// =============================================================================

const T13 = { fontSize: 'var(--size-13)', lineHeight: 'var(--lh-13)', letterSpacing: 'var(--track-13)' };
const T15 = { fontSize: 'var(--size-15)', lineHeight: 'var(--lh-15)', letterSpacing: 'var(--track-15)' };
const T22 = { fontSize: 'var(--size-22)', lineHeight: 'var(--lh-22)', letterSpacing: 'var(--track-22)' };

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
const Explainer = ({ title, intro, rates, notes }) => (
  <article className="max-w-prose">
    <header>
      {/* The masthead carries the page <h1>; every view heads at h2. */}
      <h2 className="font-semibold text-ink" style={T22}>{title}</h2>
      <p className="mt-2 pnum text-ink-2" style={T15}>{intro}</p>
    </header>

    <figure className="mt-8">
      <Figure number={1} caption="Import and export rates through the day" className="mb-1.5" />
      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr className="border-b-[0.5px] border-ink">
            <th scope="col" style={CELL_FIRST} className="eyebrow text-left align-bottom">Hour</th>
            <FigureHead label="Import" unit="$/kWh" style={CELL} />
            <FigureHead label="Export" unit="$/kWh" style={CELL_LAST} />
          </tr>
        </thead>
        <tbody>
          {rates.map(rate => (
            <tr key={rate.hour} className="border-b-[0.3px] border-hair">
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
    </figure>

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
  </article>
);

export const NEM1Explainer = () => (
  <Explainer
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
