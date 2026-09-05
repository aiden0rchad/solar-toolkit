import { useId, useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight } from 'lucide-react';
import AssumptionsPanel from '../components/AssumptionsPanel';
import SolarInputs from '../components/SolarInputs';
import { solarFinanceErrors } from '../components/solarFinance';
import SolarResultNotes from '../components/SolarResultNotes';
import InstallationScenarios from '../components/InstallationScenarios';
import { useSolarInputs } from '../components/useSolarInputs';
import { useToolState } from '../state/useToolState';
import Rail from '../components/Rail';
import { usePremises } from '../components/useShell';
import { currencyTick, currencyValue, rampIndexFor, useChartTheme } from '../components/chartTheme';
import { MARKERS } from '../components/markers';
import { Card, ChartTab, Figure, InputField, MonthStrip, RampLegend, StruckRow, toneForValue } from '../components/ui';
import { calculatePMT, findBreakEven, runRoiSimulation } from '../engine/roi';
import { LOAD_SHAPES } from '../engine/solar';

// =============================================================================
// INSTRUMENT — Simple Solar ROI.
//
// The flagship free tool, read as a faceplate rather than a page. Premises on
// the left and pinned; the readouts on the right and live, so a figure is never
// read without the assumption that produced it.
//
// The numbers are READOUT BLOCKS — a mono micro-label silkscreened above the
// figure, the figure itself in Public Sans at the top of the weight band, its
// unit in mono at 0.4× in `--ink-3`. Grouped in a ruled cluster, never in
// cards, never four stat cells in a row.
//
// THE ONE RULE holds here: the only chroma on this sheet is measured. The
// month-on-month delta (`--d-good` / `--d-bad`), the plotted baseline
// (`--d-grid`) and the struck credit's void state (`--d-bad`) are quantities
// and states. Every label, rule, tick and selection is achromatic — including
// the option groups, because selection is chrome, not data.
//
// The IRRADIANCE RAMP is the rule's second sanctioned use, and it is used three
// times on this sheet, each time on a number: the twelve month cells, the
// readout figures, and the proposed line — which steps up a stop each time
// cumulative savings against the utility baseline cross another sixth of their
// run, so the gradient IS the encoding rather than a wash behind one. Stepped,
// never interpolated: the stops were measured, the colours between them were
// not. Nothing here tints a panel, a rule, a head or an icon.
//
// The signature lives here: the federal residential credit is printed and
// visibly struck rather than silently absent, because a zero caused by a fact
// about the world is information, and omitting it is the thing every other
// calculator does.
// =============================================================================

/**
 * THE DISCLOSURE the struck row points at, written once and printed twice: on
 * the sheet as a struck line item, in the rail as the sidenote that says why.
 * It takes the first house marker, so AssumptionsPanel starts at the second.
 */
const DISCLOSURE = {
  marker: MARKERS[0],
  label: 'Federal tax credit (IRC 25D)',
  reason: 'expired for installs after 2025-12-31',
};

const loadChoices = {
  Flat: 'Steady all year',
  'Summer Peak (AC)': 'More AC in summer',
  'Winter Peak (Heat)': 'More electric heat in winter',
  'Dual Peak (AC + Heat)': 'AC in summer + heat in winter',
};

/**
 * One step of the bi-modal scale, size / leading / tracking together — they are
 * a set, and picking a size without its leading is how a readout ends up with
 * body line-height.
 */
const typeAt = (step) => ({
  fontSize: `var(--size-${step})`,
  lineHeight: `var(--lh-${step})`,
  letterSpacing: `var(--track-${step})`,
});

/**
 * The unit beside a readout: 0.4× the figure it qualifies, worn with
 * `font-mono` and `--ink-3`. `line-height: 1` so it sits on the figure's
 * baseline rather than dragging the display leading down with it.
 */
const unitAt = (step) => ({
  fontSize: `calc(var(--size-${step}) * 0.4)`,
  lineHeight: 1,
});

/**
 * The proposed line's ramp bands, left to right.
 *
 * A gradient is only allowed here because it IS the scale: each band is one
 * ramp stop, and the boundary between two bands is the year cumulative savings
 * against the utility baseline crossed into the next sixth of their run. Both
 * stops of a band carry the same colour and neighbouring bands share an offset,
 * so the transitions are HARD — the same stepped scale the month cells use,
 * because a colour mixed between two measured stops was verified against
 * nothing and would read as a wash rather than a reading.
 *
 * Returns stop indices, never colours: the caller resolves them against the
 * theme on screen, so a flip repaints without recomputing the bands.
 */
const rampBandsOf = (rows) => {
  const last = rows.length - 1;
  if (last < 1) return [];

  const savings = rows.map(row => Number(row.gridOnly) - Number(row.proposed));
  const lo = Math.min(...savings);
  const hi = Math.max(...savings);

  const bands = [];
  savings.forEach((value, i) => {
    const index = rampIndexFor(value, lo, hi);
    const offset = i / last;
    const open = bands[bands.length - 1];
    if (!open) bands.push({ index, from: 0, to: 0 });
    else if (open.index === index) open.to = offset;
    else {
      open.to = offset; //          the two bands meet exactly, so the step is hard
      bands.push({ index, from: offset, to: offset });
    }
  });
  bands[bands.length - 1].to = 1;
  return bands;
};

/** 11px footnote — the voice everything secondary speaks in on this sheet. */
const footnote = typeAt(11);

/** 13px line-item body. */
const lineItem = typeAt(13);

/**
 * A numbered section head. The numeral is set in mono so it reads as an index
 * key rather than a quantity, and never enters the tabular figure column.
 */
const SectionHead = ({ number, children, className = '', as: Tag = 'h2' }) => (
  <div className={`flex items-baseline gap-2 ${className}`}>
    <span className="font-mono text-ink-3" style={footnote}>{number}</span>
    <Tag
      className="font-semibold text-ink"
      style={{ fontSize: 'var(--size-15)', lineHeight: 'var(--lh-15)', letterSpacing: 'var(--track-15)' }}
    >
      {children}
    </Tag>
  </div>
);

/**
 * A READOUT BLOCK — the unit this instrument reports in.
 *
 * Micro-label above in mono; the figure in Public Sans, tabular, in `--ink`;
 * the currency mark and the unit in mono at 0.4× in `--ink-3`, so the quantity
 * is the only thing carrying weight. `step` picks the run: 46 for the one
 * figure the reader came for, 26 for the supporting three.
 *
 * WEIGHT CARRIES THE RANK THE WIDTH AXIS USED TO. The hero used to be 56 at
 * 62% width and 800, the supporting three 28 at 68% and 700 — three separate
 * signals of rank, two of which the face swap deleted outright, because Public
 * Sans has no `wdth` axis to condense and 800 sits outside the 600–700 band a
 * readout is set in. Leaving both at 700 would have left size as the only
 * remaining signal. So the hero takes 700 and the supporting run 600: one step
 * on the axis the face actually has, under a 46/26 size step, and the reader
 * still reads the two tiers apart at a glance. Nothing is squeezed to get
 * there, and 600 is not thin — at 26px in `--ink` it is a solid semibold, and
 * three full-width figures in a row at 700 laid down a heavier band of colour
 * than the condensed setting ever did.
 *
 * `tone` takes the figure's hue from the figure's own magnitude — a ramp token
 * class from `toneForValue`, applied to the FIGURE alone. The micro-label above
 * it, the currency mark, the unit and the note stay achromatic, because they
 * are chrome; only the number is a measurement. Without a `tone` the figure is
 * `--ink`, which is what a readout with no domain to sit in should be.
 *
 * `delta` carries its own chroma for a different reason — a signed change is a
 * direction, not a magnitude, so it keeps `--d-good` / `--d-bad` and prints its
 * sign, and therefore survives greyscale and colour-vision deficiency.
 */
const Readout = ({ label, prefix, value, unit, step = 26, weight = 600, tone, delta, note }) => (
  <div className="min-w-0">
    <div className="eyebrow">{label}</div>
    <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5">
      {prefix && (
        <span className="font-mono text-ink-3" style={unitAt(step)}>{prefix}</span>
      )}
      <span
        className={`tnum ${tone ?? 'text-ink'}`}
        style={{ ...typeAt(step), fontWeight: weight }}
      >
        {value}
      </span>
      {unit && <span className="font-mono text-ink-3" style={unitAt(step)}>{unit}</span>}
      {delta && (
        <span
          className={`tnum font-mono ${delta.negative ? 'text-d-good' : 'text-d-bad'}`}
          style={unitAt(step)}
        >
          <span className="sr-only">change from today: </span>
          {delta.text}
        </span>
      )}
    </div>
    {note && <p className="mt-1 text-ink-3" style={footnote}>{note}</p>}
  </div>
);

/**
 * The tick in a ruled choice list. Always rendered, only sometimes inked, so
 * selecting an option never shifts the row it sits in. Inline SVG — there is no
 * icon dependency and there are certainly no emoji.
 */
const Tick = ({ shown }) => (
  <svg
    width="9"
    height="9"
    viewBox="0 0 9 9"
    aria-hidden="true"
    focusable="false"
    className="flex-none translate-y-px"
    style={{ opacity: shown ? 1 : 0 }}
  >
    <path d="M0.7 4.7 L3.3 7.3 L8.3 1.3" fill="none" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

/**
 * One option in a ruled group. Not a chip and not a segmented pill: a line item
 * that is either ticked or not. Selection is CHROME, so it is achromatic — the
 * active state is the 2px `--rule-strong` underline and `--ink` text, nothing
 * more. The encoding is redundant on purpose: rule weight, ink, figure weight
 * and the tick all change together, so the chosen option survives greyscale and
 * a photocopier. The extra pixel of padding on the inactive row keeps the two
 * states exactly the same height, so selecting never shifts the stack.
 */
const Choice = ({ selected, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    className={`flex w-full items-baseline justify-between gap-3 bg-transparent px-0 pt-1.5 text-left ${selected
      ? 'border-b-2 border-rule-strong pb-1.5 text-ink'
      : 'border-b border-rule pb-[7px] text-ink-2 hover:text-ink'
      }`}
    style={{ ...lineItem, fontWeight: selected ? 600 : 400 }}
  >
    <span>{children}</span>
    <Tick shown={selected} />
  </button>
);

const SimpleSolarROI = ({ onNavigate }) => {
  // Ties each caption to the button group it names — a bare label above a row of
  // buttons labels nothing.
  const uid = useId();
  const [monthlyBill, setMonthlyBill] = useToolState('monthlyBill', 250);
  const [loadShape, setLoadShape] = useToolState('loadShape', 'Dual Peak (AC + Heat)');
  const [systemCostOverride, setSystemCostOverride] = useToolState('systemCostOverride', null, value => value === null || Number.isFinite(value));
  const [payMethod, setPayMethod] = useToolState('payMethod', 'loan');
  // IRC 25D ended for post-2025 installs under the law signed 2025-07-04; IRC 48E applies to qualifying third-party owners.
  const [incentives, setIncentives] = useToolState('incentives', 0);
  const solar = useSolarInputs({ monthlyBill });

  // Series and chrome for the theme actually on screen — resolved at runtime,
  // never a hex in this file.
  const chart = useChartTheme();

  const dailyUsage = solar.dailyUsage;
  const solarSize = solar.systemSize;
  const estimatedCost = Math.round(solarSize * 3000 / 100) * 100;
  const systemCost = systemCostOverride ?? estimatedCost;
  const netSystemCost = Math.max(0, systemCost - Math.max(0, incentives || 0));
  const loanInterest = payMethod === 'loan' ? 7.99 : 0;
  const loanTerm = payMethod === 'loan' ? 25 : 1;
  const monthlyPayment = payMethod === 'loan' ? calculatePMT(netSystemCost, loanInterest, loanTerm) : 0;
  const financeErrors = solarFinanceErrors({ systemCost, incentives, purchaseMethod: payMethod, loanInterest, loanTerm });
  const validCosts = financeErrors.length === 0;
  const valid = solar.errors.length === 0 && validCosts;

  const simParams = {
    loanAmount: systemCost,
    incentives,
    loanInterest,
    loanTerm,
    purchaseMethod: payMethod,
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
    solarSize,
    loadShape,
    strategy: 'self',
    ...solar.params,
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const simulation = useMemo(() => valid ? runRoiSimulation(simParams) : [], [JSON.stringify(simParams), valid]);
  const payback = findBreakEven(simulation);
  const year1 = simulation[1] ?? { monthlyBillNow: 0, monthlyBillFuture: 0 };
  const year25 = simulation[25] ?? { statusQuo: 0, proposed: 0, gridOnly: 0 };
  const savings25 = year25.statusQuo - year25.proposed;

  // netLiability — the crossing findBreakEven reports — is exactly
  // (proposed - gridOnly), so the annotation sits on the visual crossing.
  const breakEvenYear = payback === null ? null : Number(payback);

  // The one measured delta on the sheet: what the monthly bill actually does.
  // Signed as well as coloured — hue is never the only encoding.
  const monthlyDelta = Math.round(year1.monthlyBillFuture) - Math.round(year1.monthlyBillNow);

  // Year one month by month, straight off the live simulation, so the strip
  // moves with the inputs rather than illustrating a fixed house.
  const monthlyProfile = year1.monthlyProfileY1 ?? [];
  const monthlyProduction = monthlyProfile.map(row => row.production);
  const monthLabels = monthlyProfile.map(row => String(row.month).toUpperCase());
  const annualProduction = monthlyProduction.reduce((sum, kwh) => sum + (Number(kwh) || 0), 0);

  // The proposed line's bands, and an id that cannot collide with another
  // chart's gradient on the same document — every screen defines its own.
  const rampBands = rampBandsOf(simulation);
  const rampGradientId = `roi-cumulative-ramp-${uid.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  // The two bills share ONE domain, so the drop between them is readable as a
  // step down the ramp rather than as two figures scaled independently.
  const billScale = Math.max(year1.monthlyBillNow, year1.monthlyBillFuture, 1);

  // The premises the sticky context bar carries, so the figures below are never
  // orphaned from the system they describe.
  usePremises({
    fields: [
      { label: 'System', value: valid ? solarSize.toFixed(1) : 'Unavailable', unit: 'kW' },
      { label: 'Daily usage', value: valid ? dailyUsage.toFixed(1) : 'Unavailable', unit: 'kWh' },
      { label: 'Blended rate', value: valid ? solar.blendedRate.toFixed(3) : 'Unavailable', unit: '$/kWh' },
    ],
  });

  // The supporting run. Each is its own readout block with its own unit — the
  // ledger's single currency column is gone, because a readout carries its
  // silkscreen with it. Each figure takes its hue from its own magnitude in a
  // domain stated here: the bills against the larger of the two, the savings
  // against what doing nothing costs over the same 25 years.
  const readouts = [
    {
      label: 'Bill before',
      prefix: '$',
      value: year1.monthlyBillNow.toLocaleString(),
      unit: '/mo',
      tone: toneForValue(year1.monthlyBillNow, 0, billScale),
    },
    {
      label: 'Bill after solar',
      prefix: '$',
      value: year1.monthlyBillFuture.toLocaleString(),
      unit: '/mo',
      tone: toneForValue(year1.monthlyBillFuture, 0, billScale),
      delta: {
        negative: monthlyDelta <= 0,
        text: `${monthlyDelta <= 0 ? '−' : '+'}$${Math.abs(monthlyDelta).toLocaleString()}`,
      },
      note: payMethod === 'loan' ? `includes $${Math.round(monthlyPayment)}/mo loan` : null,
    },
    {
      label: savings25 < 0 ? '25-year additional cost' : '25-year savings',
      prefix: '$',
      value: Math.round(Math.abs(savings25)).toLocaleString(),
      tone: toneForValue(savings25, 0, Math.max(year25.gridOnly, 1)),
    },
  ];

  return (
    <div>
      <header className="mb-7">
        <p className="eyebrow">Simple Solar ROI</p>
        {/* The masthead carries the page <h1>; every view heads at h2. */}
        <h2
          className="mt-1 font-semibold text-ink"
          style={typeAt(26)}
        >
          Is solar worth it for me?
        </h2>
        <p className="mt-1.5 max-w-[52ch] text-ink-2" style={typeAt(15)}>
          Use a recent monthly bill for a quick estimate. You can inspect every assumption below.
        </p>
      </header>

      {/* SPLIT PANE. Premises left and pinned, readouts right and live — the
          reader never loses the inputs while reading the numbers they made. */}
      <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <section
          aria-label="Your inputs"
          className="lg:sticky lg:top-14 lg:max-h-[calc(100vh_-_4.5rem)] lg:self-start lg:overflow-y-auto"
        >
          <Card className="px-5 pb-6 pt-4">
            <SectionHead number="01" className="mb-4">Your inputs</SectionHead>

            <InputField label="Monthly electric bill now" value={monthlyBill} onChange={setMonthlyBill} unit="$ / mo" step="10" />

            <SolarInputs solar={solar} />

            <div className="mb-4">
              <span id={`${uid}-load-shape`} className="eyebrow mb-1 block">Roughly how you use power</span>
              <div role="group" aria-labelledby={`${uid}-load-shape`}>
                {Object.keys(LOAD_SHAPES).map(shape => (
                  <Choice key={shape} selected={loadShape === shape} onClick={() => setLoadShape(shape)}>
                    {loadChoices[shape]}
                  </Choice>
                ))}
              </div>
            </div>

            <InputField label="Estimated system cost" value={systemCost} onChange={setSystemCostOverride} unit="$" step="100" />
            {/* An assumption belongs on the page, never in a tooltip. */}
            <p className="-mt-3 mb-3 text-ink-3" style={footnote}>
              Starts at $3.00/W for the estimated {solarSize.toFixed(1)} kW system. Replace it with a real quote when you have one.
            </p>
            {systemCostOverride !== null && (
              <button
                type="button"
                onClick={() => setSystemCostOverride(null)}
                className="-mt-2 mb-3 bg-transparent px-0 text-ink-2 underline underline-offset-2 hover:text-ink"
                style={footnote}
              >
                Reset to ${estimatedCost.toLocaleString()} estimate
              </button>
            )}

            <InputField label="Incentives / rebates" value={incentives} onChange={setIncentives} unit="$" step="100" />
            <p className="-mt-3 mb-4 text-ink-3" style={footnote}>
              The 30% federal credit for owned systems ended after Dec. 31, 2025. A lease/PPA provider may claim a federal credit through 2027 and reflect it in your rate. Enter only confirmed state, local, or utility rebates.
            </p>

            {/* Payment method: the same achromatic active state as every other
                selection in the app — 2px `--rule-strong` under `--ink`. */}
            <div role="group" aria-label="Payment method" className="flex gap-7 border-b border-rule">
              {['cash', 'loan'].map(method => (
                <ChartTab
                  key={method}
                  active={payMethod === method}
                  onClick={() => setPayMethod(method)}
                  label={method}
                />
              ))}
            </div>
            <p className="mt-2.5 text-ink-3" style={footnote}>
              Loan estimate: 7.99% for 25 years. Cash is paid upfront.
            </p>
            {financeErrors.map(error => <p key={error} role="alert" className="mt-3 text-sm text-ink-2">{error}</p>)}
          </Card>
        </section>

        <section aria-label="Your estimate" className="min-w-0">
          {!valid ? <Card className="p-5"><p role="status">Your estimate is unavailable until the highlighted inputs are corrected.</p></Card> : <>
          <Card className="px-5 pb-6 pt-4">
            <SectionHead number="02">Your estimate</SectionHead>

            {/* THE PRIMARY READOUT. Public Sans at 700 on the display run, its
                unit in mono at 0.4× — the one figure the reader came for. It
                keeps the top of the run at 46 because it is three or four
                glyphs wide and sits alone across the full pane: the payback is
                the one place on this sheet where a full-width face has the room
                the condensed one used to save.

                Its hue is the payback measured against the 25-year horizon, and
                the domain is inverted on purpose: the ramp climbs as the years
                fall, so the high end always means more of the horizon spent in
                profit. A system that never pays back sits at the low stop,
                which is what the low stop is for. */}
            <div className="mt-2.5 border-b-2 border-rule-strong pb-1.5">
              <Readout
                label="Sustained payback"
                value={payback ? payback : '25+'}
                unit="yrs"
                step={46}
                weight={700}
                tone={toneForValue(payback === null ? 25 : Number(payback), 25, 0)}
              />
            </div>

            {/* THE READOUT CLUSTER — ruled, not carded. One 1px rule between
                blocks and one under the group; no boxes, no padding wells. */}
            <div className="grid grid-cols-1 divide-y divide-rule border-b border-rule sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {readouts.map((readout, i) => (
                <div key={readout.label} className={`py-3 ${i === 0 ? 'sm:pr-4' : 'sm:px-4'}`}>
                  <Readout {...readout} />
                </div>
              ))}
            </div>

            <div className="border-b border-rule py-1.5">
              <p className="text-ink" style={{ ...lineItem, fontWeight: 600 }}>
                {payMethod === 'loan'
                  ? `$${Math.round(monthlyPayment)}/month estimated loan`
                  : `$${Math.round(netSystemCost).toLocaleString()} paid in cash`}
              </p>
              <p className="mt-0.5 text-ink-3" style={footnote}>
                After ${Math.round(Math.max(0, incentives || 0)).toLocaleString()} in confirmed incentives
              </p>
            </div>

            {/* THE STRUCK ROW. A line item that is zero because of a fact about
                the world is printed and visibly zeroed, not quietly dropped —
                struck with `--d-bad`, because a void state is a measured fact.
                The reason for the zero is a sidenote in the margin rail, keyed
                to the figure by the marker beside it. */}
            <StruckRow
              label={DISCLOSURE.label}
              value="$0"
              reason={DISCLOSURE.reason}
              marker={DISCLOSURE.marker}
            />

            {/* PRODUCTION BY MONTH. Twelve cells of the live year-one profile —
                a year of seasonal shape in one 40px band, directly above the
                money it explains. The strip is stepped across its own twelve,
                so it reports SHAPE; the caption carries the units and the
                annual total, which is where an absolute figure belongs. The key
                is here because this is where the ramp is the primary encoding.

                The strip is not the only encoding: each cell carries its month
                and figure, a visually-hidden table carries all twelve, and the
                mono row beneath names the low and the peak. */}
            <hr className="rule-strong mt-8" />
            <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <SectionHead number="03">Production by month</SectionHead>
              <RampLegend low="LOW" high="PEAK" />
            </div>
            <MonthStrip
              className="mt-3"
              values={monthlyProduction}
              labels={monthLabels.length === 12 ? monthLabels : undefined}
              caption={(
                <Figure number={1}>
                  Estimated production for each month of year one, in kWh, stepped across the
                  irradiance ramp — {Math.round(annualProduction).toLocaleString()} kWh over the year
                  from the {solarSize.toFixed(1)} kW system.
                </Figure>
              )}
            />

            <p className="mt-3 text-xs text-ink-2">Sustained payback is the point after which cumulative solar costs remain no higher than the utility baseline through year 25. It is interpolated between annual estimates, not a guarantee beyond this horizon.</p>
            <SolarResultNotes year={year1} targetOffsetPct={solar.values.targetOffsetPct} />
            <hr className="rule-strong mt-8" />
            <SectionHead number="04" className="mt-2.5">Cumulative cost</SectionHead>
            <div className="mt-1 flex flex-col justify-between gap-1 sm:flex-row sm:items-baseline">
              <p className="text-ink-2" style={lineItem}>
                Doing nothing compared with solar, including financing.
              </p>
              <p className="text-ink-2" style={lineItem}>
                <strong className="tnum font-semibold text-ink">{solarSize.toFixed(1)} kW</strong> system · {dailyUsage.toFixed(1)} kWh/day
              </p>
            </div>

            <div className="mt-3.5 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={simulation} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
                  {/* THE RAMP AS A GRADIENT — legal only because it is the
                      scale itself: hard-stepped stops, one per band, laid along
                      the year axis. Recharts passes SVG children through, so
                      this needs no dependency; the colours are read from the
                      resolved tokens, never written here. */}
                  <defs>
                    <linearGradient id={rampGradientId} x1="0" y1="0" x2="1" y2="0">
                      {rampBands.flatMap((band, i) => [
                        <stop key={`${i}-from`} offset={band.from} stopColor={chart.ramp[band.index]} />,
                        <stop key={`${i}-to`} offset={band.to} stopColor={chart.ramp[band.index]} />,
                      ])}
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...chart.gridProps} />
                  <XAxis {...chart.xAxisProps} dataKey="year" type="number" domain={[0, 25]} ticks={[0, 5, 10, 15, 20, 25]} />
                  <YAxis {...chart.yAxisProps} width={52} tickFormatter={currencyTick} />
                  <Tooltip {...chart.tooltipProps} formatter={currencyValue} labelFormatter={year => `Year ${year}`} />
                  {/* The legend is written out rather than inferred, because a
                      series painted with a paint server would hand its swatch a
                      `url(...)` that resolves in the chart's SVG and nowhere
                      else. The solar swatch takes the band the line ends in. */}
                  <Legend
                    {...chart.legendProps}
                    payload={[
                      { id: 'gridOnly', value: 'Keep buying from utility', type: 'square', color: chart.tokens.baselineStroke },
                      { id: 'proposed', value: 'Go solar', type: 'square', color: chart.ramp[rampBands.length ? rampBands[rampBands.length - 1].index : 0] },
                    ]}
                  />
                  {/* Baseline first so the proposed wash reads over it. The
                      encoding is redundant: `--d-grid` at 1.5px dashed and
                      unfilled against the proposed line at 2px solid and
                      washed — the ramp is a second reading on top of that, and
                      the chart still separates in greyscale without it. */}
                  <Area {...chart.baselineLine} type="monotone" dataKey="gridOnly" name="Keep buying from utility" />
                  <Area
                    {...chart.proposedLine}
                    type="monotone"
                    dataKey="proposed"
                    name="Go solar"
                    stroke={`url(#${rampGradientId})`}
                    fill={`url(#${rampGradientId})`}
                  />
                  {breakEvenYear !== null && (
                    <ReferenceLine
                      {...chart.annotationLine}
                      x={breakEvenYear}
                      label={{ ...chart.annotationLabel, value: `Sustained payback · yr ${payback}`, position: 'top' }}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <Figure number={2} className="mt-2">
              Cumulative outlay to year 25 — the utility baseline against the proposed system, crossing at
              payback. The solar line steps up the ramp as cumulative savings against the baseline climb.
            </Figure>

            <hr className="rule mt-7" />
            <button
              type="button"
              onClick={() => onNavigate('calculator')}
              className="eyebrow flex w-full items-center justify-between gap-2 bg-transparent px-0 py-3 text-ink-2 hover:text-ink print:hidden"
            >
              Want every knob? Open the Pro calculator
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </Card>
          <InstallationScenarios simulationParams={simParams} systemSize={solarSize} />
          </>}
        </section>
      </div>

      {/* The assumptions are marginalia, not a disclosure widget. AssumptionsPanel
          opens with the perforation, so the tear separates "your numbers" from
          "our assumptions" exactly once — printing a second tear in the main
          column would only double the separator. */}
      <Rail>
        {/* The disclosure the struck row points at. It sits above the tear
            because it is a fact about the reader's numbers, not one of our
            assumptions — and it takes the first marker, so the assumptions
            below run from the second and no symbol is printed twice.

            Only the void state itself is inked: the marker and the label are
            chrome and stay achromatic, and `--d-bad` carries the one thing it
            is entitled to carry — the fact that the credit is dead. */}
        <aside className="rule pt-4">
          <p className="font-mono" style={footnote}>
            <span className="text-ink-3" aria-hidden="true">{DISCLOSURE.marker}</span>{' '}
            <span className="text-ink-2">{DISCLOSURE.label}</span>
            <span className="text-ink-3" aria-hidden="true"> — </span>
            <span className="text-d-bad">{DISCLOSURE.reason}</span>
          </p>
        </aside>
        {valid && <AssumptionsPanel
          rateEscalation={solar.values.inflationRate}
          exportRate={solar.values.solarExportRate}
          peakRate={solar.values.ratePeak}
          offPeakRate={solar.values.rateOffPeak}
          blendedRate={solar.blendedRate}
          panelDegradation={solar.values.panelDegradationPct}
          markerOffset={1}
        />}
      </Rail>
    </div>
  );
};

export default SimpleSolarROI;
