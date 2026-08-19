import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Rail from '../components/Rail';
import { usePremises } from '../components/useShell';
import { useChartTheme } from '../components/chartTheme';
import { Card, Figure, RampLegend } from '../components/ui';
import { NEM1_DAY, NEM2_DAY, NEM2_NBC, NEM3_DAY, NOON_EXPORT_BY_ERA, hourLabel } from '../data/nemRates';
import { glossaryFor } from '../data/nemGlossary';

// =============================================================================
// INSTRUMENT — the NEM explainers.
//
// These pages argue in prose, but they are still sheets of this instrument and
// not a separate publication: a `Card` opened by the 2px `--rule-strong` rule,
// an `.eyebrow` silkscreened above the heading, the same 26px h2 every other
// view heads at, 15/1.5 body in `--ink-2`, numbered sections, and every figure
// captioned and numbered.
//
// THEY NOW PLOT, and the earlier note in this file arguing that they should not
// was right about its own evidence and wrong about the conclusion. What it
// rejected was a three-point line chart, and a three-point line chart genuinely
// did carry less than the table beside it. But three points was a property of
// the DATA, not of charts: the pages held three rates per era, so three was all
// there was to draw. The rate data is hourly now, and at twenty-four points the
// chart carries something no table of this size can — the SHAPE.
//
// The shape is the argument. NEM 3.0's export credit is not uniformly small; it
// is near zero at noon and roughly ten times that at 7pm, and those two facts
// together are the entire case for a battery. A reader can see that in one
// glance at the curve and cannot assemble it from prose at all. The table stays,
// reduced to six key hours and carrying a column the chart cannot show — export
// as a percentage of import — so the two are not saying the same thing twice.
//
// THE ONE RULE still holds. A rate is a measured quantity, so the two series may
// carry chroma, and they carry the entity colours every other chart in the app
// uses for the same things: `--d-grid` is grid import here exactly as it is
// everywhere else, and `--d-third` is the export credit. Neither is an era. All
// three pages get IDENTICAL treatment — no per-era colour coding, no icon
// ranking one tariff above another, no coloured panel. Inking NEM 3.0 red would
// be the page telling the reader how to feel, and the reader is being told what
// changed instead.
// =============================================================================

const T13 = { fontSize: 'var(--size-13)', lineHeight: 'var(--lh-13)', letterSpacing: 'var(--track-13)' };
const T15 = { fontSize: 'var(--size-15)', lineHeight: 'var(--lh-15)', letterSpacing: 'var(--track-15)' };
const T26 = { fontSize: 'var(--size-26)', lineHeight: 'var(--lh-26)', letterSpacing: 'var(--track-26)' };
const T34 = { fontSize: 'var(--size-34)', lineHeight: 'var(--lh-34)', letterSpacing: 'var(--track-34)' };
const FOOT = { fontSize: 'var(--size-11)', lineHeight: 'var(--lh-11)', letterSpacing: 'var(--track-11)' };

/** The unit beside a readout: 0.4× the figure it qualifies, mono, `--ink-3`. */
const UNIT_34 = { fontSize: 'calc(var(--size-34) * 0.4)', lineHeight: 1 };

/** The peak window both time-of-use eras charge on, as an x-axis band. */
const PEAK_FROM = 16;
const PEAK_TO = 21;

/** Rates print to the cent-and-a-bit, because ACC credits live below one cent. */
const money = (value) => `$${Number(value).toFixed(3).replace(/0$/, '')}`;

/** Axis ticks stay short — `$0.35`, not `$0.350`. */
const moneyTick = (value) => `$${Number(value).toFixed(2)}`;

/**
 * A READOUT BLOCK — the same one every other view reports in. Micro-label above
 * in mono, the figure in Public Sans bold on the 34 step, the unit in mono at
 * 0.4× in `--ink-3`.
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
      <span className="tnum text-ink" style={{ ...T34, fontWeight: 700 }}>{value}</span>
      {unit && <span className="font-mono text-ink-3" style={UNIT_34}>{unit}</span>}
    </p>
  </div>
);

/** A numbered section head — the ordinal in mono, the title in Public Sans. */
const SectionHead = ({ number, children, className = '' }) => (
  <div className={`flex items-baseline gap-2 ${className}`}>
    <span className="font-mono text-ink-3" style={FOOT}>{number}</span>
    <h3 className="font-semibold text-ink" style={T15}>{children}</h3>
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
 * THE RATE CURVE — import against export, hour by hour.
 *
 * `stepAfter`, not `monotone`: a time-of-use rate genuinely is a step function,
 * flat across the hour and then discontinuous, and drawing it as a smooth curve
 * would invent a 4:30pm price that no tariff contains. The export series is
 * stepped for the same reason — the ACC figures are hourly averages, and the
 * curve between two of them was measured by nobody.
 *
 * Encoding is redundant, as everywhere else in the app: import is a 2px solid
 * line in `--d-grid`, export a 1.5px dashed line in `--d-third`, so the chart
 * survives greyscale and colour-vision deficiency on weight and dash alone.
 */
const RateCurve = ({ day, showPeakBand, summary }) => {
  const chart = useChartTheme();
  const peak = day.reduce((worst, row) => (row.importRate > worst.importRate ? row : worst), day[0]);

  return (
    <div className="mt-3.5 h-64 w-full" role="img" aria-label={summary}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={day} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid {...chart.gridProps} />
          {/* The peak window, marked as an annotation rather than a series: it
              is a fact about the tariff's clock, not a quantity, so it takes
              `--rule` and no chroma at all. */}
          {showPeakBand && (
            <ReferenceArea
              x1={PEAK_FROM}
              x2={PEAK_TO}
              fill={chart.tokens.rule}
              fillOpacity={0.55}
              stroke="none"
              label={{ ...chart.annotationLabel, value: 'Peak · 4-9PM', position: 'insideTop' }}
            />
          )}
          <XAxis
            {...chart.xAxisProps}
            dataKey="hour"
            type="number"
            domain={[0, 23]}
            ticks={[0, 6, 12, 18, 23]}
            tickFormatter={hourLabel}
          />
          <YAxis {...chart.yAxisProps} width={52} tickFormatter={moneyTick} domain={[0, 'auto']} />
          <Tooltip
            {...chart.tooltipProps}
            formatter={value => `${money(value)} / kWh`}
            labelFormatter={hour => hourLabel(hour)}
          />
          <Legend {...chart.legendProps} />
          <Line
            {...chart.lineProps}
            type="stepAfter"
            dataKey="importRate"
            name="You pay (import)"
            stroke={chart.tokens.baselineStroke}
            strokeWidth={2}
          />
          <Line
            {...chart.lineProps}
            type="stepAfter"
            dataKey="exportRate"
            name="You are paid (export)"
            stroke={chart.tokens.third}
            strokeWidth={1.5}
            strokeDasharray="5 3"
          />
        </LineChart>
      </ResponsiveContainer>
      <span className="sr-only">
        Peak import is {money(peak.importRate)} per kWh at {hourLabel(peak.hour)}.
      </span>
    </div>
  );
};

/**
 * THE CROSS-ERA BAR — what one kilowatt-hour exported at noon is credited at,
 * under each of the three sets of rules.
 *
 * One series, so no legend; the bars are stepped across the irradiance ramp,
 * which is sanctioned here because the thing being encoded IS the measured
 * quantity the bar already draws. It is printed on all three pages, so a reader
 * who lands on any single era still sees where that era sits.
 */
const NoonComparison = ({ highlightEra }) => {
  const chart = useChartTheme();
  const values = NOON_EXPORT_BY_ERA.map(row => row.exportRate);
  const lo = Math.min(...values);
  const hi = Math.max(...values);

  return (
    <div
      className="mt-3.5 h-52 w-full"
      role="img"
      aria-label={NOON_EXPORT_BY_ERA.map(row => `${row.era}: ${money(row.exportRate)} per kWh`).join('. ')}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={NOON_EXPORT_BY_ERA} margin={{ top: 12, right: 8, left: 0, bottom: 0 }} barCategoryGap="34%">
          <CartesianGrid {...chart.gridProps} />
          <XAxis {...chart.xAxisProps} dataKey="era" />
          <YAxis {...chart.yAxisProps} width={52} tickFormatter={moneyTick} />
          <Tooltip {...chart.barTooltipProps} formatter={value => `${money(value)} / kWh`} />
          <Bar {...chart.barProps} dataKey="exportRate" name="Credit for one exported kWh" maxBarSize={72}>
            {NOON_EXPORT_BY_ERA.map(row => (
              <Cell
                key={row.era}
                fill={chart.rampFor(row.exportRate, lo, hi)}
                // The era the reader is actually on is drawn at full strength;
                // the other two recede. Opacity, not a second hue — the ramp
                // stop still states the quantity.
                fillOpacity={row.era === highlightEra ? 1 : 0.45}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

/** The defined terms for one era, as a description list. */
const Glossary = ({ era }) => {
  const entries = glossaryFor(era);
  return (
    <dl className="mt-3">
      {entries.map(entry => (
        <div key={entry.term} className="border-b-[0.5px] border-rule py-2.5">
          <dt className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-mono font-medium text-ink" style={T13}>{entry.term}</span>
            {entry.expands && <span className="text-ink-3" style={FOOT}>{entry.expands}</span>}
          </dt>
          <dd className="mt-1 pnum text-ink-2" style={T13}>{entry.body}</dd>
        </div>
      ))}
    </dl>
  );
};

/**
 * One era, set as a document.
 *
 * `day` is the 24-hour rate profile from `src/data/nemRates.js`.
 */
const Explainer = ({ eraKey, era, title, intro, day, showPeakBand, notes }) => {
  // The era's peak hour: the row carrying the highest import rate. Ties resolve
  // to the first row, which is right for NEM 1.0 — a flat tariff has no peak, so
  // the page reports the rate it charges all day.
  const peak = day.reduce((worst, row) => (row.importRate > worst.importRate ? row : worst), day[0]);
  const noon = day[12];
  // What a kWh sent out at noon is credited, against what the SAME HOUR charges
  // to buy one back. Same hour on both sides, deliberately: comparing the noon
  // export against the evening peak import mixes two different questions and
  // printed 65% on the NEM 2.0 page while that page's own note said 93%. Like
  // for like, NEM 1.0 is 100%, NEM 2.0 is 93% — the non-bypassable charges and
  // nothing else — and NEM 3.0 is 8%, which is the whole story in one figure.
  const noonRatio = noon.exportRate / noon.importRate;

  // Six key hours rather than all twenty-four: the curve above already carries
  // the shape, so the table's job is the column the curve cannot show.
  const keyHours = [0, 9, 12, 15, 18, 21].map(hour => day[hour]);

  usePremises({
    assumptionSet: title,
    fields: [
      { label: `Import · ${hourLabel(peak.hour)}`, value: peak.importRate.toFixed(2), unit: '$/kWh' },
      { label: 'Export · noon', value: noon.exportRate.toFixed(3), unit: '$/kWh' },
    ],
  });

  return (
    <>
      <Card className="max-w-prose">
        <header>
          <p className="eyebrow">{era}</p>
          {/* The masthead carries the page <h1>; every view heads at h2. */}
          <h2 className="mt-1 font-semibold text-ink" style={T26}>{title}</h2>
        </header>

        {/* THE DATA, before the prose. What a kilowatt-hour costs at the era's
            peak hour, what the same kilowatt-hour is worth going the other way
            at noon, and the ratio between them. The gap between those two
            numbers is the entire argument of all three of these pages. */}
        <div className="mt-5 grid grid-cols-1 gap-x-10 gap-y-5 border-y border-rule py-4 sm:grid-cols-3">
          <Readout label={`Import · ${hourLabel(peak.hour)}`} prefix="$" value={peak.importRate.toFixed(2)} unit="/ kWh" />
          <Readout label="Export · noon" prefix="$" value={noon.exportRate.toFixed(2)} unit="/ kWh" />
          <Readout
            label="Export vs import · noon"
            value={noonRatio >= 0.995 ? '100' : (noonRatio * 100).toFixed(0)}
            unit="%"
          />
        </div>

        <p className="mt-4 pnum text-ink-2" style={T15}>{intro}</p>

        <hr className="rule-strong mt-8" />
        <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <SectionHead number="01">Rates through the day</SectionHead>
        </div>
        <p className="mt-1 text-ink-2" style={T13}>
          What one kilowatt-hour costs to buy, and what the same kilowatt-hour earns going the other
          way, at every hour of a representative day.
        </p>
        <RateCurve
          day={day}
          showPeakBand={showPeakBand}
          summary={`Import and export rates by hour under ${title}. Peak import reaches ${money(peak.importRate)} per kWh; the noon export credit is ${money(noon.exportRate)} per kWh.`}
        />
        <Figure number={1} className="mt-2">
          Import and export rates by hour, in dollars per kWh. Import is drawn solid, the export credit
          dashed; where the two lines separate is the value a battery can recover.
        </Figure>

        <hr className="rule-strong mt-8" />
        <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <SectionHead number="02">Key hours</SectionHead>
        </div>
        <table className="mt-3 w-full" style={{ borderCollapse: 'collapse' }}>
          <caption className="caption-top text-left">
            <Figure number={2} caption="Six hours across the day, with the export credit as a share of what the same kilowatt-hour costs to buy back" className="mb-1.5" />
          </caption>
          <thead>
            <tr className="border-b-2 border-rule-strong">
              <th scope="col" style={CELL_FIRST} className="eyebrow text-left align-bottom">Hour</th>
              <FigureHead label="Import" unit="$/kWh" style={CELL} />
              <FigureHead label="Export" unit="$/kWh" style={CELL} />
              <FigureHead label="Export / import" unit="%" style={CELL_LAST} />
            </tr>
          </thead>
          <tbody>
            {keyHours.map(row => (
              <tr key={row.hour} className="border-b-[0.5px] border-rule">
                <th scope="row" style={{ ...CELL_FIRST, fontWeight: 400 }} className="text-left text-ink-2">
                  <span style={T13}>{hourLabel(row.hour)}</span>
                </th>
                <td style={CELL} className="tnum text-right text-ink"><span style={T13}>{row.importRate.toFixed(2)}</span></td>
                <td style={CELL} className="tnum text-right text-ink"><span style={T13}>{row.exportRate.toFixed(3)}</span></td>
                <td style={CELL_LAST} className="tnum text-right text-ink">
                  <span style={T13}>{Math.round((row.exportRate / row.importRate) * 100)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr className="rule-strong mt-8" />
        <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <SectionHead number="03">One exported kilowatt-hour at noon</SectionHead>
          <RampLegend low="LOW" high="HIGH" />
        </div>
        <p className="mt-1 text-ink-2" style={T13}>
          The same midday kilowatt-hour, credited under each set of rules. This era is drawn at full
          strength; the other two are shown for context.
        </p>
        <NoonComparison highlightEra={era.split(' · ')[0]} />
        <Figure number={3} className="mt-2">
          Export credit for one kilowatt-hour sent to the grid at noon, in dollars per kWh, under all
          three net-metering eras.
        </Figure>

        {notes.map((note, index) => (
          <section key={note.title} className="mt-8">
            <hr className="rule" />
            <SectionHead number={String(index + 4).padStart(2, '0')} className="mt-3">
              {note.title}
            </SectionHead>
            <p className="mt-1.5 pnum text-ink-2" style={T15}>{note.body}</p>
          </section>
        ))}

        <hr className="rule-strong mt-8" />
        <SectionHead number={String(notes.length + 4).padStart(2, '0')} className="mt-2.5">
          What the words mean
        </SectionHead>
        <p className="mt-1 text-ink-2" style={T13}>
          Every term this page uses that a salesman would assume you already knew.
        </p>
        <Glossary era={eraKey} />
      </Card>

      {/* The marginalia rail carries the caveat, because it is an assumption
          about the figures on the sheet and assumptions live on the page. */}
      <Rail>
        <div className="border-t-2 border-rule-strong pt-3">
          <p className="eyebrow">About these rates</p>
          <p className="mt-2 pnum text-ink-2" style={T13}>
            The prices plotted here are representative California residential shapes, not a tariff
            sheet. Real rates vary by utility, by rate schedule and by season, and NEM 3.0 export
            credits vary by the hour of the specific day — the curve here is an annual average, and a
            September evening pays a great deal more than it shows.
          </p>
          <p className="mt-2 pnum text-ink-3" style={FOOT}>
            Check your own tariff before making a decision on these numbers. Your utility publishes it,
            and the rate schedule name is printed on your bill.
          </p>
        </div>
      </Rail>
    </>
  );
};

export const NEM1Explainer = () => (
  <Explainer
    eraKey="nem1"
    era="NEM 1.0 · Legacy"
    title="NEM 1.0: The Golden Era"
    intro="Systems interconnected before roughly 2016. The grid acted as a perfect battery: a kilowatt-hour you sent out in June came back in December at exactly the same price, with no losses, no clock and no fee. Nothing since has been this simple, and if you are on it, this is the single strongest reason not to disturb your system."
    day={NEM1_DAY}
    showPeakBand={false}
    notes={[
      {
        title: 'The 1-for-1 swap',
        body: 'Import and export were credited at the identical rate, so the two lines above sit exactly on top of each other. Sizing a system was arithmetic: match your annual kilowatt-hours and your energy charges went to roughly zero. Batteries made almost no financial sense, because the grid already was one and it was free.',
      },
      {
        title: 'Why the flat line matters',
        body: 'With no time-of-use pricing, it made no difference when you generated or when you used power. That is why NEM 1.0 systems were built to face south for maximum total output, while systems built today are often pointed west to catch the expensive evening hours instead.',
      },
      {
        title: 'What can cost you it',
        body: 'Grandfathering runs 20 years from interconnection, and it is attached to the system as permitted. Significantly enlarging the array can push you onto current rules for the whole thing, not just the new panels. Get the consequences in writing from your utility before adding capacity.',
      },
    ]}
  />
);

export const NEM2Explainer = () => (
  <Explainer
    eraKey="nem2"
    era="NEM 2.0 · Transition"
    title="NEM 2.0: The Transition"
    intro="Systems interconnected from roughly 2016 to April 2023. Time-of-use pricing arrived, but it arrived on both sides at once: a kilowatt-hour exported at 5pm was credited near the 5pm price. The swap survived mostly intact. What broke it was a few cents that ride on every import and cannot be exported away."
    day={NEM2_DAY}
    showPeakBand
    notes={[
      {
        title: 'Time-of-use, symmetrically',
        body: 'Both lines above step up together at 4pm and back down at 9pm. Because export followed import, the clock did not really change the economics — it only meant that a west-facing array generating into the peak window earned more than a south-facing one generating at noon.',
      },
      {
        title: `Non-bypassable charges, about ${(NEM2_NBC * 100).toFixed(1)}c`,
        body: 'The gap between the two lines is constant and small, and that gap is the NBCs: public-purpose programs, the wildfire fund, nuclear decommissioning. They attach to every kilowatt-hour you import and no amount of exporting removes them. It is why a NEM 2.0 house that generated everything it used still had a bill at true-up.',
      },
      {
        title: 'Batteries were optional here',
        body: 'With export worth roughly 93% of import, storing energy to use later recovered only that last few cents, which rarely justified the hardware. Under NEM 3.0 the same battery recovers something like twenty times as much, which is the whole reason storage went from an upsell to a default.',
      },
    ]}
  />
);

export const NEM3Explainer = () => (
  <Explainer
    eraKey="nem3"
    era="NEM 3.0 · Current"
    title="NEM 3.0: The New Reality"
    intro='Everything interconnected since April 2023. The two sides of the meter were cut apart: you still buy at retail time-of-use prices, but you are now paid what the grid saves by not generating that kilowatt-hour itself. At noon, in a state already swimming in solar, that saving is close to nothing. This is the "buy high, sell low" problem, and it is a problem with a specific solution.'
    day={NEM3_DAY}
    showPeakBand
    notes={[
      {
        title: 'The lines come apart',
        body: 'Compare the shape above with NEM 2.0, where the two lines tracked each other. Here they are unrelated: import steps on the tariff clock, while export follows the avoided-cost curve, which collapses through the middle of the day and spikes hard after sunset. That divergence is not an accident of the rate design, it is the rate design.',
      },
      {
        title: 'Exporting at noon is the worst thing you can do',
        body: 'A kilowatt-hour sent to the grid at noon earns under three cents. The same kilowatt-hour used in your own house instead saves you the full 35 cents you would otherwise have paid, and at 6pm it saves 58 cents. Self-consumption is worth roughly ten to twenty times an export, so under these rules the goal stops being to generate the most and starts being to export the least.',
      },
      {
        title: 'Which is what a battery is for',
        body: 'A battery moves a kilowatt-hour along the curve above: charge from the midday trough where solar is worth almost nothing, discharge into the 4pm-to-9pm peak where the same kilowatt-hour is worth 58 cents. That arbitrage is the entire NEM 3.0 business case, and it is why a quote without storage on it deserves a hard question.',
      },
      {
        title: 'The evening spike is real, and it cuts both ways',
        body: 'The export credit does climb steeply after 6pm — a battery discharging into that window is credited well, not just saving you imports. But those figures are annual averages. Actual credits are set hour by hour against real grid conditions, so a hot September evening pays far more than the curve shows and a mild spring one far less. Nobody should be modelling a payback on the peaks alone.',
      },
    ]}
  />
);
