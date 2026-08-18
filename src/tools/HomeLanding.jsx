import { useId, useLayoutEffect, useRef, useState } from 'react';
import Rail from '../components/Rail';
import { usePremises } from '../components/useShell';
import { RAMP_STOPS, currencyTick, useChartTheme } from '../components/chartTheme';
import { Card, Figure, MonthStrip, RampLegend, StruckRow, toneForValue } from '../components/ui';
import { batteryPresets } from '../data/batteryPresets';
import { findBreakEven, runRoiSimulation } from '../engine/roi';
import { annualSunHours } from '../engine/solar';
import { useEntitlement } from '../entitlement/useEntitlement';

// =============================================================================
// INSTRUMENT — the front page.
//
// The screen leads with DATA, never with prose: the default 25-year case is run
// through the real engine on load and plotted at full width, with the three
// figures a homeowner came for set beside it in the display run. Nothing here
// is a feature card, and nothing here is decorated — the only chroma on the
// page is the two plotted series, the twelve month cells beneath them, the
// three readouts they produce, and the live-state line, because chroma belongs
// to data and nothing else.
//
// The proposed series, the month strip and the readouts all speak the same
// sequential scale — the irradiance ramp — so a warm cell, a warm figure and
// the warm end of the curve all mean the same thing: MORE of the quantity being
// shown. The ramp is stepped to six measured stops and never interpolated, and
// it never touches chrome: no panel, rule, heading or icon on this page carries
// a hue.
//
// Under the instrument sits the funnel: three questions as substantial ruled
// entries, then the nine secondary tools as a quiet two-column index. Rank is
// carried by size, weight and rule weight.
//
// The shell owns <main>; this renders sections into it.
// =============================================================================

// --- THE DEFAULT CASE --------------------------------------------------------
// The same fixture Simple Solar ROI opens on — $250/mo, Central Valley, dual
// peak, financed — so the plot on the front page and the plot one click later
// are the same instrument reading the same premises. These constants mirror
// the ones in SimpleSolarROI.jsx rather than importing them, because that tool
// is a lazy chunk and the landing is eager: importing it here would pull the
// whole calculator into the first paint.
const MONTHLY_BILL = 250;
const REGION = 'CA Central Valley';
const LOAD_SHAPE = 'Dual Peak (AC + Heat)';
const PEAK_SHARE = 35;
const PEAK_RATE = 0.58;
const OFF_PEAK_RATE = 0.42;
const RATE_ESCALATION = 5;
const EXPORT_RATE = 0.04;
const FIXED_CHARGE = 15;
const LOAN_RATE = 7.99;
const LOAN_TERM = 25;
const COST_PER_WATT = 3.0;
const BLENDED_RATE = PEAK_RATE * PEAK_SHARE / 100 + OFF_PEAK_RATE * (1 - PEAK_SHARE / 100);

/**
 * Run the fixture once, at module scope. It is a constant: no input on this
 * page changes it, so recomputing it per render (or memoising it per mount)
 * would only be ceremony around a deterministic value.
 */
const DEFAULT_CASE = (() => {
  const dailyUsage = MONTHLY_BILL / 30 / BLENDED_RATE;
  const solarSize = Math.round((dailyUsage / annualSunHours(REGION)) * 10) / 10;
  const systemCost = Math.round(solarSize * COST_PER_WATT * 1000 / 100) * 100;

  const simulation = runRoiSimulation({
    loanAmount: systemCost,
    incentives: 0,
    loanInterest: LOAN_RATE,
    loanTerm: LOAN_TERM,
    proposalMode: 'new',
    existingSolarType: 'loan',
    existingSolarBalance: 0,
    existingSolarPayment: 0,
    ppaEscalator: 0,
    batteryCapacity: 0,
    depthOfDischarge: 100,
    minSoC: 10,
    roundTripEfficiency: 90,
    degradationRate: 1,
    dailyUsage,
    peakUsagePercent: PEAK_SHARE,
    ratePeak: PEAK_RATE,
    rateOffPeak: OFF_PEAK_RATE,
    inflationRate: RATE_ESCALATION,
    solarSize,
    sunProfile: REGION,
    monthlyFixedCharge: FIXED_CHARGE,
    solarExportRate: EXPORT_RATE,
    loadShape: LOAD_SHAPE,
    strategy: 'self',
  });

  const payback = findBreakEven(simulation);
  const year25 = simulation[25];

  // Twelve real production figures, straight off the year-1 row the engine
  // already builds. This is the winter-honesty claim as data: nothing here is
  // smoothed, and the strip below is stepped to this array's own range.
  const monthlyProduction = simulation[1].monthlyProfileY1.map(row => row.production);

  return {
    simulation,
    dailyUsage,
    solarSize,
    systemCost,
    payback,
    breakEven: payback === null ? null : Number(payback),
    billAfter: simulation[1].monthlyBillFuture,
    // The bill the same month would have been without the system — the domain
    // the "bill after solar" readout is dark or bright against.
    billNow: simulation[1].monthlyBillNow,
    netSavings25: Math.max(0, year25.statusQuo - year25.proposed),
    // The ceiling on a 25-year saving: never paying the utility another cent.
    statusQuo25: year25.statusQuo,
    monthlyProduction,
    annualProduction: monthlyProduction.reduce((sum, kwh) => sum + kwh, 0),
    lowMonth: Math.min(...monthlyProduction),
    peakMonth: Math.max(...monthlyProduction),
  };
})();

const HOME_BATTERY_KWH = batteryPresets[0].kwh;

// --- the funnel --------------------------------------------------------------
// Titles and body copy are frozen. `datum` is a micro-label on a readout: a
// measured fact from the fixture above, not a claim written for the page.
const journeys = [
  {
    id: 'simple-roi',
    title: 'Is solar worth it for me?',
    copy: 'Start with your bill and get a plain-language savings estimate.',
    datum: `${DEFAULT_CASE.payback ?? '25+'} yr payback · default case`,
  },
  {
    id: 'blackout',
    title: 'Will a battery keep my lights on?',
    copy: 'Pick the things you need during an outage and see how long they run.',
    datum: `${HOME_BATTERY_KWH} kWh · typical home battery`,
  },
  {
    id: 'ev',
    title: 'Should I switch to an EV?',
    copy: 'Compare the real monthly and long-term cost with your current car.',
    datum: `$${BLENDED_RATE.toFixed(3)}/kWh · default blended rate`,
  },
];

const featuredToolIds = new Set(['home', ...journeys.map(tool => tool.id)]);

/** 11px footnote — the voice everything secondary speaks in. */
const footnote = {
  fontSize: 'var(--size-11)',
  lineHeight: 'var(--lh-11)',
  letterSpacing: 'var(--track-11)',
};

/** 13px line-item body. */
const lineItem = {
  fontSize: 'var(--size-13)',
  lineHeight: 'var(--lh-13)',
  letterSpacing: 'var(--track-13)',
};

// =============================================================================
// THE READOUT
//
// The DESIGN.md pattern, and the brightest thing on the page: a mono
// micro-label above, the figure in Archivo condensed heavy on the display run,
// the unit in mono at 0.4× in --ink-3.
//
// The figure takes its hue from ITS OWN VALUE, through `toneForValue` on the
// irradiance ramp — a good result is warm, a poor one is cool, and the reader
// can tell which before reading the digits. Only the figure: the micro-label
// above it and the unit beside it are chrome and stay achromatic. Two of the
// three domains are inverted, because for a payback and for a bill, SMALLER is
// the better reading and belongs at the warm end. No glow: the figure reads
// luminous because everything around it is silent.
// =============================================================================
const Readout = ({ label, figure, unit, tone }) => (
  <div className="border-t border-rule pt-2.5">
    <p className="eyebrow">{label}</p>
    <p className="mt-1.5 flex items-baseline gap-1.5">
      <span
        className={`tnum ${tone}`}
        style={{
          fontSize: 'var(--size-56)',
          lineHeight: 'var(--lh-56)',
          letterSpacing: 'var(--track-56)',
          fontStretch: '62%',
          fontWeight: 700,
        }}
      >
        {figure}
      </span>
      <span className="font-mono text-ink-3" style={{ fontSize: 'calc(var(--size-56) * 0.4)', lineHeight: 1 }}>
        {unit}
      </span>
    </p>
  </div>
);

// =============================================================================
// THE RAMP, AS A GRADIENT
//
// The one gradient this system permits: it does not decorate anything, it IS
// the sequential scale laid along an axis, so a position on the curve carries
// the same encoding a month cell does.
//
// The stops are HARD-EDGED, six flat bands rather than a continuous blend, for
// the reason chartTheme gives: the six stops were measured against the page and
// against each other, and a colour mixed between two of them was verified
// against nothing. The band edges are placed to match `rampIndexAt` exactly —
// stop `i` owns the span that rounds to `i`, which makes the end bands half
// width — so the colour under any point on the curve is the colour `rampAt`
// returns for it, and the crossover dot cannot disagree with the band it sits
// on.
// =============================================================================
const rampBands = (ramp) =>
  ramp.flatMap((color, i) => [
    { key: `${i}a`, color, offset: i === 0 ? 0 : (i - 0.5) / (RAMP_STOPS - 1) },
    { key: `${i}b`, color, offset: i === RAMP_STOPS - 1 ? 1 : (i + 0.5) / (RAMP_STOPS - 1) },
  ]);

/** The six bands as `<stop>`s, left to right, for a caller's `<linearGradient>`. */
const RampStops = ({ ramp }) =>
  rampBands(ramp).map(({ key, color, offset }) => (
    <stop key={key} offset={offset} stopColor={color} />
  ));

/**
 * A legend key. Redundant encoding is mandatory, so the swatch draws the actual
 * stroke each series wears — 2px solid over a wash, against 1.5px dashed and
 * unfilled — rather than two squares that differ only in hue. The proposed
 * swatch therefore carries the ramp, at the same left-to-right reading as the
 * plot: this key is what tells a reader the curve's colour is a measurement and
 * not a paint job.
 *
 * `userSpaceOnUse` even at 22px wide: the stroke it paints is a horizontal
 * line, whose bounding box has zero height, and an object-bounding-box gradient
 * on a degenerate box is not required to render at all.
 */
const LegendKey = ({ name, proposed }) => {
  const { ramp } = useChartTheme();
  // `useId` returns a value wrapped in colons; they are legal in an id but
  // hostile in every selector and URL that touches one, so they come off.
  const gradientId = `ramp-key-${useId().replace(/:/g, '')}`;

  return (
    <span className="flex flex-none items-center gap-2">
      <svg width="22" height="9" viewBox="0 0 22 9" aria-hidden="true" focusable="false" className="flex-none">
        {proposed && (
          <defs>
            <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="22" y2="0">
              <RampStops ramp={ramp} />
            </linearGradient>
          </defs>
        )}
        {proposed && (
          <rect
            x="0"
            y="4"
            width="22"
            height="5"
            fill={`url(#${gradientId})`}
            style={{ fillOpacity: 'var(--wash-opacity)' }}
          />
        )}
        <line
          x1="0"
          y1="4.5"
          x2="22"
          y2="4.5"
          stroke={proposed ? `url(#${gradientId})` : undefined}
          className={proposed ? undefined : 'stroke-d-grid'}
          strokeWidth={proposed ? 2 : 1.5}
          strokeDasharray={proposed ? undefined : '5 3'}
        />
      </svg>
      <span className="eyebrow">{name}</span>
    </span>
  );
};

// =============================================================================
// THE HERO PLOT
//
// Hand-rolled inline SVG over real engine output — there is no chart library on
// this page and no new dependency. The SVG is measured and drawn at 1:1 device
// units rather than scaled from a fixed viewBox, so a 2px stroke is 2px and an
// 11px tick label is 11px at every column width.
//
// The proposed curve is banded with the irradiance ramp along the x-axis, so it
// cools at the start of the term and warms as cumulative benefit climbs — the
// gradient is the encoding, not the decoration. The do-nothing baseline stays
// `--d-grid`, 1.5px dashed and unfilled: it is not sunlight, it is off the
// ramp, and that contrast is the whole argument the plot is making.
//
// Colour arrives only through Tailwind token classes (`stroke-d-grid`,
// `fill-ink-3`) and through values the chart resolver read back off those same
// tokens for the theme on screen. There is no hex in this file, and no filter,
// blur or shadow anywhere near the data.
// =============================================================================
const ProjectionPlot = ({ data, breakEven }) => {
  const hostRef = useRef(null);
  const [width, setWidth] = useState(880);
  // Resolved for the theme currently on screen, and re-resolved when it flips —
  // an SVG gradient stop takes a literal colour and cannot read a custom
  // property, exactly as Recharts cannot.
  const { ramp, rampAt } = useChartTheme();
  const gradientId = `ramp-plot-${useId().replace(/:/g, '')}`;

  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return undefined;
    const measure = () => setWidth(Math.max(280, Math.round(el.getBoundingClientRect().width)));
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const narrow = width < 560;
  const height = narrow ? 216 : 304;
  const pad = { top: 26, right: narrow ? 48 : 60, bottom: 26, left: 2 };
  const innerW = Math.max(1, width - pad.left - pad.right);
  const innerH = Math.max(1, height - pad.top - pad.bottom);

  const peak = data[data.length - 1].gridOnly;
  const yMax = Math.max(40000, Math.ceil(peak / 40000) * 40000);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(f * yMax));
  const xTicks = [0, 5, 10, 15, 20, 25];

  const px = (year) => pad.left + (year / 25) * innerW;
  const py = (value) => pad.top + innerH - (value / yMax) * innerH;

  const points = (key) => data.map(d => `${px(d.year).toFixed(1)},${py(d[key]).toFixed(1)}`).join(' ');
  const wash = `M ${px(0).toFixed(1)},${py(0).toFixed(1)} L ${points('proposed').split(' ').join(' L ')} L ${px(25).toFixed(1)},${py(0).toFixed(1)} Z`;

  // The crossing, taken from the engine's own break-even rather than eyeballed
  // off the path: the marked point and the payback readout are the same number.
  let crossing = null;
  if (breakEven !== null) {
    const lower = Math.min(24, Math.floor(breakEven));
    const fraction = breakEven - lower;
    const value = data[lower].proposed + (data[lower + 1].proposed - data[lower].proposed) * fraction;
    crossing = { x: px(breakEven), y: py(value) };
  }

  const labelAnchor = crossing && crossing.x > pad.left + innerW * 0.72 ? 'end' : 'start';
  const summary = `Cumulative cost to year 25 for the default case. Staying on the utility reaches ${currencyTick(peak)}; going solar reaches ${currencyTick(data[data.length - 1].proposed)}${breakEven === null ? '' : `, and the two cross in year ${breakEven}`}.`;

  return (
    <div ref={hostRef} className="w-full">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={summary}
        className="block"
      >
        {/* The ramp, laid across the plot width in user space so a band edge
            falls on a year and not on a fraction of a viewBox. */}
        <defs>
          <linearGradient
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            x1={pad.left}
            y1="0"
            x2={pad.left + innerW}
            y2="0"
          >
            <RampStops ramp={ramp} />
          </linearGradient>
        </defs>

        {/* Gridlines: horizontal only, solid hairline. Dashed means annotation. */}
        {yTicks.map(tick => (
          <line
            key={tick}
            x1={pad.left}
            x2={pad.left + innerW}
            y1={py(tick)}
            y2={py(tick)}
            className={tick === 0 ? 'stroke-rule-strong' : 'stroke-rule'}
            strokeWidth="1"
          />
        ))}

        {/* THE BASELINE — doing nothing. 1.5px dashed, no fill, drawn first so
            the proposed wash reads over it. */}
        <polyline
          points={points('gridOnly')}
          fill="none"
          className="stroke-d-grid"
          strokeWidth="1.5"
          strokeDasharray="5 3"
          strokeLinecap="butt"
        />

        {/* THE PROPOSED SYSTEM — 2px solid over a wash, both banded with the
            ramp. Weight, dash and fill still separate it from the baseline, so
            the encoding stays redundant and the plot survives greyscale. */}
        <path d={wash} fill={`url(#${gradientId})`} style={{ fillOpacity: 'var(--wash-opacity)' }} stroke="none" />
        <polyline
          points={points('proposed')}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* End-of-line dots, ringed in the sheet they sit on. The proposed dot
            sits at the far right of the plot, so it wears the ramp's top stop —
            the band it is standing in. */}
        <circle cx={px(25)} cy={py(data[data.length - 1].gridOnly)} r="3" className="fill-d-grid stroke-surface" strokeWidth="2" />
        <circle cx={px(25)} cy={py(data[data.length - 1].proposed)} r="3" fill={rampAt(1)} className="stroke-surface" strokeWidth="2" />

        {/* THE CROSSOVER. The dashed drop is annotation and therefore
            achromatic; the point itself sits on the proposed series and wears
            the ramp band it stands in, because it is a measured threshold.
            `rampAt` steps to the same stop the gradient paints at this x, so
            the dot and the curve under it are the same colour. */}
        {crossing && (
          <g>
            <line
              x1={crossing.x}
              x2={crossing.x}
              y1={crossing.y}
              y2={py(0)}
              className="stroke-ink-3"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle cx={crossing.x} cy={crossing.y} r="3.5" fill={rampAt(breakEven / 25)} className="stroke-surface" strokeWidth="2" />
            {/* The label is knocked out of whatever it lands on. Both series
                climb to the right of the crossing, so at intermediate widths
                the dashed `--d-grid` line runs straight through this text —
                `paint-order: stroke fill` draws a 3px `--surface` stroke first
                and the ink over it, so the glyphs sit in a clean hole in the
                plot. This is the same trick the end dots already use ("ringed
                in the sheet they sit on"): an opaque knockout at the panel's
                own colour, with no blur, no filter and no shadow — nothing the
                forbidden list names. */}
            <text
              x={labelAnchor === 'end' ? crossing.x - 7 : crossing.x + 7}
              y={crossing.y - 9}
              textAnchor={labelAnchor}
              className="tnum fill-ink-3 stroke-surface font-mono"
              strokeWidth="3"
              style={{
                fontSize: 11,
                letterSpacing: '0.06em',
                paintOrder: 'stroke fill',
                strokeLinejoin: 'round',
              }}
            >
              CROSSOVER · YR {breakEven.toFixed(1)}
            </text>
          </g>
        )}

        {/* Figures sit in a right-hand column, as on a bill. */}
        {yTicks.map(tick => (
          <text
            key={tick}
            x={pad.left + innerW + 8}
            y={py(tick) + 4}
            className="tnum fill-ink-3 font-mono"
            style={{ fontSize: 11 }}
          >
            {currencyTick(tick)}
          </text>
        ))}

        {xTicks.map(year => (
          <text
            key={year}
            x={px(year)}
            y={height - 8}
            textAnchor={year === 0 ? 'start' : year === 25 ? 'end' : 'middle'}
            className="tnum fill-ink-3 font-mono"
            style={{ fontSize: 11 }}
          >
            {year}
          </text>
        ))}
      </svg>
    </div>
  );
};

/** `04` — mono, tabular, in the margin of the row it numbers. */
const Ordinal = ({ n }) => (
  <span
    className="tnum w-7 flex-none font-mono text-ink-3"
    style={{ fontSize: 'var(--size-12)', lineHeight: 1.7, letterSpacing: 'var(--track-12)' }}
  >
    {String(n).padStart(2, '0')}
  </span>
);

/**
 * One of the three questions. The funnel has to outweigh the nine tools below
 * it, so these carry the display measure, a 1px rule and real vertical room,
 * with a factual micro-label in the margin. Only the question moves under the
 * cursor, and only by underlining.
 */
const JourneyRow = ({ n, title, copy, datum, onSelect }) => (
  <button
    type="button"
    onClick={onSelect}
    className="group flex w-full items-baseline gap-4 border-b border-rule py-5 text-left"
  >
    <Ordinal n={n} />
    <span className="min-w-0 flex-1">
      <span
        className="block font-medium text-ink group-hover:underline"
        style={{ fontSize: 'var(--size-22)', lineHeight: 'var(--lh-22)', letterSpacing: 'var(--track-22)' }}
      >
        {title}
      </span>
      <span className="mt-1.5 block text-ink-2" style={lineItem}>
        {copy}
      </span>
    </span>
    <span className="eyebrow flex-none self-center text-right">{datum}</span>
  </button>
);

/** One entry in the quiet secondary index: a 13px line item on a hairline. */
const IndexRow = ({ n, name, marker, onSelect }) => (
  <button
    type="button"
    onClick={onSelect}
    className="group flex w-full items-baseline gap-4 border-b-[0.5px] border-hair py-2.5 text-left"
  >
    <Ordinal n={n} />
    <span className="min-w-0 flex-1 font-medium text-ink group-hover:underline" style={lineItem}>
      {name}
    </span>
    {marker && <span className="eyebrow flex-none self-center">{marker}</span>}
  </button>
);

/** A ruled premise in the margin: micro-label left, figure right. */
const Premise = ({ label, value, unit }) => (
  <div className="flex items-baseline justify-between gap-3 border-b-[0.5px] border-hair py-1.5">
    <span className="eyebrow">{label}</span>
    <span className="tnum flex-none text-ink" style={lineItem}>
      {value}
      {unit && <span className="ml-1 font-mono text-ink-3" style={{ fontSize: 'calc(var(--size-13) * 0.74)' }}>{unit}</span>}
    </span>
  </div>
);

const HomeLanding = ({ onNavigate, tools }) => {
  const { isPro } = useEntitlement();
  const moreTools = tools.filter(tool => !featuredToolIds.has(tool.id));
  const {
    simulation, breakEven, payback, solarSize, dailyUsage, systemCost, billAfter, billNow,
    netSavings25, statusQuo25, monthlyProduction, annualProduction, lowMonth, peakMonth,
  } = DEFAULT_CASE;
  // The horizon the projection actually ran to, so the payback ramp is scaled
  // against the term rather than against a number retyped here.
  const horizon = simulation.length - 1;

  // The page carries figures, so it carries their premises into the sticky bar.
  usePremises({
    fields: [
      { label: 'System', value: solarSize.toFixed(1), unit: 'kW' },
      { label: 'Daily usage', value: dailyUsage.toFixed(1), unit: 'kWh' },
      { label: 'Payback', value: payback ?? '25+', unit: 'yrs' },
    ],
  });

  return (
    <div>
      {/* MASTHEAD LINE — the wordmark, and the instrument's live state.
          Only the state word is chromatic: `--d-good` means live/OK, so it is a
          live-state indicator and earns its hue. The region and the latitude
          beside it are premise LABELS — chrome — and stay in `--ink-3`. Painting
          the whole string green put chroma on chrome, which is the one thing the
          system forbids. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="eyebrow">SolarPro Toolkit</p>
        <p className="eyebrow">
          <span className="text-d-good">Modelling</span>{' · CA Central Valley · 37.3°N'}
        </p>
      </div>

      {/* THE INSTRUMENT. Data first, before a single line of prose. */}
      <Card className="mt-2 px-5 pb-6 pt-4 sm:px-7">
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
          <h2 className="eyebrow">Twenty-five year projection · default case</h2>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <LegendKey name="Go solar" proposed />
            <LegendKey name="Keep buying from utility" />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-x-10 gap-y-7 lg:grid-cols-[minmax(0,1fr)_15rem]">
          <div className="min-w-0">
            <ProjectionPlot data={simulation} breakEven={breakEven} />
            <Figure number={1} className="mt-3 max-w-[60ch]">
              Cumulative outlay to year 25 on a ${MONTHLY_BILL}/month bill in the {REGION}, staying on
              the utility against buying a {solarSize.toFixed(1)} kW system for ${systemCost.toLocaleString()}.
              The solar curve is banded on the irradiance ramp and warms as the benefit accumulates.
            </Figure>

            {/* THE YEAR, MONTH BY MONTH. Twelve real figures off the same run,
                stepped to their own range: the seasonal shape a flat annual
                average hides. The heading and the key are chrome and stay
                achromatic — only the cells carry hue. */}
            <div className="mt-7 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
              <h3 className="eyebrow">First-year production · by month</h3>
              <RampLegend low={`${lowMonth.toLocaleString()} kWh`} high={`${peakMonth.toLocaleString()} kWh`} />
            </div>
            <MonthStrip
              className="mt-2"
              values={monthlyProduction}
              caption={(
                <Figure number={2} className="max-w-[60ch]">
                  First-year output from the same {solarSize.toFixed(1)} kW system, month by month:{' '}
                  {annualProduction.toLocaleString()} kWh over the year, {lowMonth.toLocaleString()} kWh in the
                  darkest month against {peakMonth.toLocaleString()} kWh at the peak. Cells step to that range,
                  so the strip reads seasonal shape rather than absolute output.
                </Figure>
              )}
            />
          </div>

          {/* THE READOUTS. Grouped in a ruled cluster, never in cards: a row of
              three beside a narrow plot, a column of three beside a wide one. */}
          <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-3 lg:grid-cols-1 lg:gap-y-6">
            {/* Each figure is inked by its own value. Payback and the residual
                bill run INVERTED domains — a short payback and a small bill are
                the good readings, so they sit at the warm end — while the
                25-year net runs 0 up to its own ceiling: the whole of what the
                utility would have taken over the term. A payback the projection
                never reaches falls to the term itself, the coolest stop, which
                is the honest reading of "25+". */}
            <Readout
              label="Payback"
              figure={payback ?? `${horizon}+`}
              unit="yrs"
              tone={toneForValue(breakEven ?? horizon, horizon, 0)}
            />
            <Readout
              label="25-year net"
              figure={Math.round(netSavings25).toLocaleString()}
              unit="$"
              tone={toneForValue(netSavings25, 0, statusQuo25)}
            />
            <Readout
              label="Bill after solar"
              figure={billAfter.toLocaleString()}
              unit="$/mo"
              tone={toneForValue(billAfter, billNow, 0)}
            />
          </div>
        </div>
      </Card>

      {/* THE FUNNEL. Three questions, weighted to dominate everything below. */}
      <section className="mt-14" aria-label="Start here">
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1">
          <h2
            className="font-semibold text-ink"
            style={{
              fontSize: 'var(--size-28)',
              lineHeight: 'var(--lh-28)',
              letterSpacing: 'var(--track-28)',
              fontStretch: '75%',
            }}
          >
            What are you trying to figure out?
          </h2>
          <p className="eyebrow">Start here</p>
        </div>
        <p
          className="mt-2 max-w-[56ch] text-ink-2"
          style={{ fontSize: 'var(--size-15)', lineHeight: 'var(--lh-15)', letterSpacing: 'var(--track-15)' }}
        >
          Start with one question. You’ll get honest numbers first, with the details available when you want them.
        </p>
        <hr className="rule-heavy mt-4" />
        {journeys.map((journey, index) => (
          <JourneyRow key={journey.id} n={index + 1} {...journey} onSelect={() => onNavigate(journey.id)} />
        ))}
      </section>

      {/* THE SECONDARY INDEX. Quiet, two columns, 13px. */}
      <section className="mt-12" aria-label="More tools">
        <p className="eyebrow">More calculators and consultant tools</p>
        <hr className="rule-heavy mt-1.5" />
        <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-10">
          {moreTools.map(({ id, navLabel, tier }, index) => (
            <IndexRow
              key={id}
              n={journeys.length + index + 1}
              name={navLabel}
              /* ROI Calculator's navLabel already ends in "(Pro)" — don't stutter the suffix onto it. */
              marker={tier === 'pro' && !isPro && !navLabel.includes('(Pro)') ? 'Pro' : null}
              onSelect={() => onNavigate(id)}
            />
          ))}
        </div>
      </section>

      <footer className="mt-14" aria-label="Support this project">
        <hr className="rule" />
        <p className="mt-3 max-w-[52em] text-ink-3" style={footnote}>
          This toolkit is free and stays that way. If it helped you decide, consider{' '}
          <a href="https://www.buymeacoffee.com/aiden0rchad" target="_blank" rel="noopener noreferrer" className="text-ink underline underline-offset-2">
            buying me a coffee
          </a>
          {' '}&#8212; I&#8217;m a university student building this between classes.
        </p>
      </footer>

      {/* The premises the plot is standing on, in the margin where assumptions
          live — never in a tooltip. The dead federal credit is printed and
          struck here too: a zero caused by a fact about the world is
          information, and the front page is where it matters most. */}
      <Rail>
        <aside>
          <p className="eyebrow">Fig. 1 — premises</p>
          <hr className="rule-heavy mt-1.5" />
          <Premise label="Monthly bill" value={MONTHLY_BILL} unit="$ / mo" />
          <Premise label="Region" value={REGION} />
          <Premise label="System" value={solarSize.toFixed(1)} unit="kW" />
          <Premise label="System cost" value={systemCost.toLocaleString()} unit="$" />
          <Premise label="Daily usage" value={dailyUsage.toFixed(1)} unit="kWh" />
          <Premise label="Blended rate" value={BLENDED_RATE.toFixed(3)} unit="$ / kWh" />
          <Premise label="Rate escalation" value={RATE_ESCALATION} unit="% / yr" />
          <Premise label="Financing" value={LOAN_RATE.toFixed(2)} unit={`% · ${LOAN_TERM} yr`} />
          {/* `reason` takes a node, not a string, so this row can ink the one
              part of itself that is data. `--d-bad` means "expired / void
              state" in the token table, and this clause IS that state stated in
              words — the same treatment Simple Solar ROI gives the identical
              sentence in its own rail. StruckRow's own default stays achromatic,
              because reasons like "bought with cash" are neutral facts about the
              configuration and have no business wearing the alarm colour. */}
          <StruckRow
            label="Federal tax credit (IRC 25D)"
            value="$0"
            reason={<span className="text-d-bad">expired for installs after 2025-12-31</span>}
          />
          <p className="mt-3 text-ink-3" style={footnote}>
            Every figure above is an opening default. Change any of them in Simple Solar ROI and the
            same engine re-runs on your numbers.
          </p>
        </aside>
      </Rail>
    </div>
  );
};

export default HomeLanding;
