import { ArrowRight, Lock } from 'lucide-react';
import { usePremises } from './useShell';
import { PRO_URL } from '../entitlement/config';
import { findBreakEven, runRoiSimulation } from '../engine/roi';
import { annualSunHours } from '../engine/solar';

// =============================================================================
// THE PRO PREVIEW.
//
// This card used to draw the withheld tool as a ghost: hairlines on paper, the
// page with the type lifted off it. It was honest and it was pretty, and it
// told a reader precisely nothing about whether Pro was worth paying for. A
// blank sheet is not a preview.
//
// So it shows the thing instead. Every figure below is REAL OUTPUT from the
// same engine in `src/engine/` that the free tools run on, computed at module
// load from a worked case that is stated on the page — not a screenshot, not a
// mockup, and not a number somebody typed in to look impressive. What Pro adds
// is control over the inputs and the surfaces that assemble the output; it is
// not a second, better engine, and the preview should not imply that there is
// one.
//
// It stays honest about what it is NOT. Each specimen is labelled read-only,
// and each card names the free tool that answers the nearest question, because
// a reader who does not need Pro should be able to find that out here rather
// than after paying. A locked view is still a page of this document and owes
// the reader the same standard as every other one.
//
// NO CHART LIBRARY. App imports this eagerly, so anything it pulls in lands in
// the main bundle; Recharts is a 370kB lazy chunk and it stays lazy. The one
// plot here is hand-set SVG, the same decision HomeLanding's projection makes.
// =============================================================================

const T11 = { fontSize: 'var(--size-11)', lineHeight: 'var(--lh-11)', letterSpacing: 'var(--track-11)' };
const T13 = { fontSize: 'var(--size-13)', lineHeight: 'var(--lh-13)', letterSpacing: 'var(--track-13)' };
const T15 = { fontSize: 'var(--size-15)', lineHeight: 'var(--lh-15)', letterSpacing: 'var(--track-15)' };
const T20 = { fontSize: 'var(--size-20)', lineHeight: 'var(--lh-20)', letterSpacing: 'var(--track-20)' };
const T26 = { fontSize: 'var(--size-26)', lineHeight: 'var(--lh-26)', letterSpacing: 'var(--track-26)' };

// --- the worked case ---------------------------------------------------------
// Stated in full on the page, and deliberately a HARDER case than the free
// tools open on: a bigger bill, a battery, and a time-of-use spread wide enough
// that when the battery discharges actually matters. That is the ground Pro is
// bought for, and modelling it is the claim being made.

const CASE = {
  monthlyBill: 340,
  region: 'CA Central Valley',
  peakRate: 0.58,
  offPeakRate: 0.42,
  peakShare: 35,
  exportRate: 0.04,
  fixedCharge: 14,
  escalation: 5,
  costPerWatt: 3.1,
  batteryKwh: 13.5,
  batteryCost: 12_000,
  loanRate: 6.99,
  loanTerm: 20,
};

const BLENDED = CASE.peakRate * (CASE.peakShare / 100) + CASE.offPeakRate * (1 - CASE.peakShare / 100);

/**
 * One run of the shared engine. `batteryCapacity` is the only thing that varies
 * between the two runs below, so the difference between them is attributable to
 * storage and to nothing else — which is the point the readouts make.
 */
const runCase = ({ batteryCapacity, systemCost }) => runRoiSimulation({
  loanAmount: systemCost,
  incentives: 0,
  loanInterest: CASE.loanRate,
  loanTerm: CASE.loanTerm,
  proposalMode: 'new',
  existingSolarType: 'loan',
  existingSolarBalance: 0,
  existingSolarPayment: 0,
  ppaEscalator: 0,
  batteryCapacity,
  depthOfDischarge: 90,
  minSoC: 15,
  roundTripEfficiency: 90,
  degradationRate: 2,
  dailyUsage: DAILY_USAGE,
  peakUsagePercent: CASE.peakShare,
  ratePeak: CASE.peakRate,
  rateOffPeak: CASE.offPeakRate,
  inflationRate: CASE.escalation,
  solarSize: SOLAR_SIZE,
  sunProfile: CASE.region,
  monthlyFixedCharge: CASE.fixedCharge,
  solarExportRate: CASE.exportRate,
  loadShape: 'Dual Peak (AC + Heat)',
  strategy: 'self',
});

const DAILY_USAGE = CASE.monthlyBill / 30 / BLENDED;
const SOLAR_SIZE = Math.round((DAILY_USAGE / annualSunHours(CASE.region)) * 10) / 10;
const PANELS_ONLY_COST = Math.round((SOLAR_SIZE * CASE.costPerWatt * 1000) / 100) * 100;

/**
 * The two runs, and what separates them. Deterministic and pure, so it is
 * computed once at module load rather than in a hook — memoising a constant is
 * ceremony around a value that cannot change.
 */
const WORKED = (() => {
  const withBattery = runCase({ batteryCapacity: CASE.batteryKwh, systemCost: PANELS_ONLY_COST + CASE.batteryCost });
  const panelsOnly = runCase({ batteryCapacity: 0, systemCost: PANELS_ONLY_COST });

  const payback = findBreakEven(withBattery);
  const y25 = withBattery[25];
  const y25Panels = panelsOnly[25];

  return {
    payback,
    horizon: withBattery.length - 1,
    billAfter: withBattery[1].monthlyBillFuture,
    billNow: withBattery[1].monthlyBillNow,
    net25: Math.max(0, y25.statusQuo - y25.proposed),
    // What the battery is worth over the term. NET OF ITS OWN COST: the two
    // runs differ by both the capacity and the price of it, and `proposed`
    // carries the installed cost, so the difference is already the return on the
    // battery rather than the gross saving it produces. Signed on purpose — on
    // plenty of inputs storage does not pay, and a preview that could only ever
    // print a positive number would be an advertisement.
    batteryDelta: (y25.statusQuo - y25.proposed) - (y25Panels.statusQuo - y25Panels.proposed),
    curve: withBattery,
  };
})();

const money = (value) => `$${Math.round(Math.abs(value)).toLocaleString()}`;
const signedMoney = (value) => `${value < 0 ? '-' : '+'}${money(value)}`;

// --- shared furniture --------------------------------------------------------

/** A readout block: mono micro-label, the figure, the unit in mono at 0.4×. */
const Readout = ({ label, value, unit, tone = 'text-ink' }) => (
  <div className="min-w-0">
    <p className="eyebrow">{label}</p>
    <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5">
      <span className={`tnum ${tone}`} style={{ ...T26, fontWeight: 700 }}>{value}</span>
      {unit && (
        <span className="font-mono text-ink-3" style={{ fontSize: 'calc(var(--size-26) * 0.42)', lineHeight: 1 }}>
          {unit}
        </span>
      )}
    </p>
  </div>
);

/**
 * The frame every specimen sits in. It is labelled, because a preview that
 * could be mistaken for the live tool is a preview that lies — the reader is
 * told in the same breath what they are looking at and that they cannot touch
 * it.
 */
const Specimen = ({ label, note, children }) => (
  <figure className="mt-4">
    <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-b-2 border-rule-strong pb-1">
      <span className="eyebrow">{label}</span>
      <span className="font-mono text-ink-3" style={T11}>Read-only preview</span>
    </figcaption>
    <div className="pt-3.5">{children}</div>
    {note && <p className="mt-2.5 text-ink-3" style={T11}>{note}</p>}
  </figure>
);

/** A ruled line item: name on the left, value hard right in tabular figures. */
const Row = ({ name, value, muted = false }) => (
  <div className="flex items-baseline justify-between gap-4 border-b-[0.5px] border-rule py-1.5">
    <span className={muted ? 'text-ink-3' : 'text-ink-2'} style={T13}>{name}</span>
    <span className="tnum flex-none text-ink" style={T13}>{value}</span>
  </div>
);

/**
 * The readouts every specimen closes on, off the worked case above.
 *
 * BOTH SIDES OF THE BILL are engine year-one figures, and that is not a
 * stylistic choice. The input premise is a $340 bill; the engine's own year one,
 * after escalation and fixed charges, is $376. Printing the $340 input against a
 * $298 modelled result would book the difference as a saving solar did not make
 * — the exact overstatement this project exists to refuse, and one that was
 * already caught and fixed once in Simple Solar ROI. The after figure includes
 * the loan payment, which is said out loud rather than left to be discovered.
 */
const CaseReadouts = () => (
  <>
    <div className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
      <Readout label="Payback" value={WORKED.payback ?? `${WORKED.horizon}+`} unit="yrs" />
      <Readout label="Bill · year 1" value={WORKED.billNow.toLocaleString()} unit="$/mo" />
      <Readout label="Bill after" value={WORKED.billAfter.toLocaleString()} unit="$/mo" />
      <Readout label="25-year net" value={money(WORKED.net25)} unit="" />
    </div>
    <p className="mt-2 text-ink-3" style={T11}>
      The bill after solar includes the loan payment. It is what the household actually writes cheques
      for, not the utility line with the financing quietly left off.
    </p>
    <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-rule pt-3">
      <span className="text-ink-2" style={T13}>
        What the {CASE.batteryKwh} kWh battery is worth over the term, net of the {money(CASE.batteryCost)} it
        costs, with everything else held fixed
      </span>
      <span
        className={`tnum flex-none font-semibold ${WORKED.batteryDelta >= 0 ? 'text-d-good' : 'text-d-bad'}`}
        style={T15}
      >
        {signedMoney(WORKED.batteryDelta)}
      </span>
    </div>
  </>
);

// --- the specimens -----------------------------------------------------------

/** The consult wizard: what it asks, in the order it asks it. */
const CONSULT_STEPS = [
  { step: 'Client', captures: 'Name, address, sun region' },
  { step: 'Bill', captures: `$${CASE.monthlyBill}/mo · ${CASE.region}` },
  { step: 'Usage', captures: `${DAILY_USAGE.toFixed(1)} kWh/day · dual peak` },
  { step: 'System', captures: `${SOLAR_SIZE.toFixed(1)} kW · ${CASE.batteryKwh} kWh storage` },
  { step: 'Financing', captures: `${CASE.loanRate}% · ${CASE.loanTerm} yr · $0 down` },
  { step: 'Result', captures: `Payback ${WORKED.payback ?? `${WORKED.horizon}+`} yrs` },
];

const ConsultSpecimen = () => (
  <Specimen
    label="A consult, start to finish"
    note="Six steps, each one recomputing the whole model. The figures at the bottom are what the client would be looking at by the last screen."
  >
    <ol>
      {CONSULT_STEPS.map((entry, index) => (
        <li key={entry.step} className="flex items-baseline gap-3 border-b-[0.5px] border-rule py-1.5">
          <span className="eyebrow tnum flex-none">{String(index + 1).padStart(2, '0')}</span>
          <span className="flex-none font-medium text-ink" style={T13}>{entry.step}</span>
          <span className="min-w-0 flex-1 truncate text-right text-ink-3" style={T13}>{entry.captures}</span>
        </li>
      ))}
    </ol>
    <div className="mt-6"><CaseReadouts /></div>
  </Specimen>
);

/**
 * The calculator: the control surface, which is the entire product. Free
 * Simple Solar ROI exposes six inputs; this is what the other twenty-odd are.
 */
const CONTROL_GROUPS = [
  {
    group: 'Tariff',
    controls: [
      ['Peak rate', `$${CASE.peakRate.toFixed(2)}/kWh`],
      ['Off-peak rate', `$${CASE.offPeakRate.toFixed(2)}/kWh`],
      ['Peak share of usage', `${CASE.peakShare}%`],
      ['Export credit', `$${CASE.exportRate.toFixed(2)}/kWh`],
      ['Fixed charges', `$${CASE.fixedCharge}/mo`],
      ['Annual escalation', `${CASE.escalation}%`],
    ],
  },
  {
    group: 'Storage',
    controls: [
      ['Capacity', `${CASE.batteryKwh} kWh`],
      ['Depth of discharge', '90%'],
      ['Reserve (min SoC)', '15%'],
      ['Round-trip efficiency', '90%'],
      ['Annual degradation', '2%'],
      ['Dispatch strategy', 'Self-consumption'],
    ],
  },
  {
    group: 'System & load',
    controls: [
      ['Array size', `${SOLAR_SIZE.toFixed(1)} kW`],
      ['Sun profile', CASE.region],
      ['Seasonal load shape', 'Dual peak (AC + heat)'],
      ['Daily usage', `${DAILY_USAGE.toFixed(1)} kWh`],
    ],
  },
  {
    group: 'Financing & retrofit',
    controls: [
      ['Loan rate / term', `${CASE.loanRate}% · ${CASE.loanTerm} yr`],
      ['Existing solar loan', 'Balance + payment'],
      ['Existing PPA', 'Payment + escalator'],
      ['Incentives', 'Entered, never assumed'],
    ],
  },
];

const CalculatorSpecimen = () => (
  <Specimen
    label="Every control, and the case they are set to here"
    note="Free Simple Solar ROI runs the same engine on six inputs and sensible defaults for the rest. This is the rest."
  >
    <div className="grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2">
      {CONTROL_GROUPS.map(({ group, controls }) => (
        <div key={group}>
          <p className="eyebrow border-b-2 border-rule-strong pb-1">{group}</p>
          <div className="mt-1.5">
            {controls.map(([name, value]) => <Row key={name} name={name} value={value} />)}
          </div>
        </div>
      ))}
    </div>
    <div className="mt-7"><CaseReadouts /></div>
  </Specimen>
);

/**
 * The 25-year curve, hand-set. Twenty-six points, two polylines, no library.
 * Utility baseline dashed and unfilled; the proposed system solid — the same
 * redundant encoding every chart in the app uses, so it survives greyscale.
 */
const MiniPlot = () => {
  const data = WORKED.curve;
  const width = 320;
  const height = 96;
  const peak = Math.max(...data.map(row => Math.max(row.statusQuo, row.proposed)));
  const px = (year) => (year / (data.length - 1)) * width;
  const py = (value) => height - (value / peak) * height;
  const line = (key) => data.map((row, year) => `${px(year).toFixed(1)},${py(row[key]).toFixed(1)}`).join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-24 w-full"
      preserveAspectRatio="none"
      role="img"
      aria-label={`Cumulative cost to year 25: staying on the utility reaches ${money(data[25].statusQuo)}, the proposed system ${money(data[25].proposed)}.`}
    >
      <polyline points={line('statusQuo')} fill="none" className="stroke-d-grid" strokeWidth="1.5" strokeDasharray="5 3" vectorEffect="non-scaling-stroke" />
      <polyline points={line('proposed')} fill="none" className="stroke-d-solar" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

const PROPOSAL_SECTIONS = [
  ['Cover', 'Client name, system summary, date'],
  ['The numbers', 'Payback, 25-year net, bill before and after'],
  ['Production', 'Month by month, first year'],
  ['The bill', 'What solar removes, and what it cannot'],
  ['Storage', 'Backup duration by load'],
  ['Assumptions', 'Every premise the model ran on'],
];

const ProposalSpecimen = () => (
  <Specimen
    label="What comes out the other end"
    note="Assembled from whichever tools you have filled in, printed on your letterhead. The assumptions page is not optional and does not come off."
  >
    <div className="border-t-2 border-rule-strong bg-raised px-4 pb-4 pt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <span className="eyebrow">Prepared for</span>
        <span className="font-mono text-ink-3" style={T11}>Your company · your logo</span>
      </div>
      <p className="mt-0.5 font-semibold text-ink" style={T20}>The Alvarez residence</p>
      <div className="mt-3"><MiniPlot /></div>
      <div className="mt-3 grid grid-cols-3 gap-x-6">
        <Readout label="Payback" value={WORKED.payback ?? `${WORKED.horizon}+`} unit="yrs" />
        <Readout label="25-year net" value={money(WORKED.net25)} unit="" />
        <Readout
          label="Bill · before → after"
          value={`${WORKED.billNow} → ${WORKED.billAfter}`}
          unit="$/mo"
        />
      </div>
    </div>
    <div className="mt-5">
      {PROPOSAL_SECTIONS.map(([name, contents], index) => (
        <div key={name} className="flex items-baseline gap-3 border-b-[0.5px] border-rule py-1.5">
          <span className="eyebrow tnum flex-none">{String(index + 1).padStart(2, '0')}</span>
          <span className="flex-none font-medium text-ink" style={T13}>{name}</span>
          <span className="min-w-0 flex-1 text-right text-ink-3" style={T13}>{contents}</span>
        </div>
      ))}
    </div>
  </Specimen>
);

// --- the cards ---------------------------------------------------------------

const PRO_TOOLS = {
  consult: {
    lead: 'A six-step interview you run at the kitchen table. You ask, you type, and the payback recomputes between questions — so the client watches the number move when they tell you their real bill instead of waiting a week for a PDF.',
    bullets: [
      ['Six guided steps', 'client, bill, usage, system, financing, result — in the order a conversation actually goes'],
      ['Live the whole way', 'every answer re-runs the full 25-year model, not a summary of one'],
      ['Nothing to walk back', 'the same engine as the free tools, so the number you show is the number that holds up'],
      ['Hands off to the proposal', 'finish the consult and the proposal is already populated'],
    ],
    free: { id: 'simple-roi', label: 'Solar Savings', why: 'answers the same question for one house, without the interview.' },
    Specimen: ConsultSpecimen,
  },
  calculator: {
    lead: 'The engine with every knob exposed. Model a retrofit over an existing loan or a PPA with its escalator, drive the tariff hour by hour, and control what the battery is actually allowed to do.',
    bullets: [
      ['Full tariff control', 'peak, off-peak, export credit, fixed charges and annual escalation, all editable'],
      ['Real battery physics', 'depth of discharge, reserve floor, round-trip efficiency and annual degradation'],
      ['Retrofit cases', 'model new solar over an existing loan or PPA, escalator included'],
      ['25 years, month by month', 'seasonal load shapes and regional sun profiles, with panel degradation applied'],
      ['Dispatch strategy', 'self-consumption, or guarded grid arbitrage where the tariff spread justifies it'],
    ],
    free: { id: 'simple-roi', label: 'Solar Savings', why: 'runs this engine on six inputs and defaults for the rest.' },
    Specimen: CalculatorSpecimen,
  },
  proposal: {
    lead: 'Everything you worked out, assembled into one document you can hand over. It carries the assumptions page with it, which is the part that wins arguments six months later.',
    bullets: [
      ['Pulls from every tool', 'ROI, usage, appliances, EV, backup and bill analysis, whichever you filled in'],
      ['Your letterhead', 'company name and logo, not this toolkit’s'],
      ['Impact that is derived', 'environmental figures computed from the modelled system, not boilerplate'],
      ['Prints properly', 'one keystroke to paper or PDF, with the layout built for it'],
    ],
    free: { id: 'bill', label: 'Bill Decoder', why: 'gives you the bill breakdown to read off a screen instead.' },
    Specimen: ProposalSpecimen,
  },
};

const ProLockCard = ({ tool, onNavigate }) => {
  const details = PRO_TOOLS[tool.id];
  const Icon = tool.icon;

  // A locked view carries figures, so it carries their premises into the sticky
  // bar like every other page. It used to report "Toolkit defaults" over a sheet
  // full of numbers from a case that was nothing of the sort.
  usePremises({
    assumptionSet: 'Pro preview · worked case',
    fields: [
      { label: 'System', value: SOLAR_SIZE.toFixed(1), unit: 'kW' },
      { label: 'Storage', value: String(CASE.batteryKwh), unit: 'kWh' },
      { label: 'Payback', value: String(WORKED.payback ?? `${WORKED.horizon}+`), unit: 'yrs' },
    ],
  });

  // The shell owns <main>; this is a section inside it, never a second one.
  return (
    <div className="max-w-3xl">
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <p className="eyebrow flex items-center gap-1.5">
            <Lock size={11} strokeWidth={2} aria-hidden="true" />
            SolarPro Pro · preview
          </p>
          <p className="eyebrow">Not included in the free toolkit</p>
        </div>
        <hr className="rule-strong mt-1.5" />

        <header className="mt-4 flex items-start gap-3">
          {Icon && <Icon size={22} strokeWidth={1.5} aria-hidden="true" className="mt-1 flex-none text-ink-3" />}
          <div className="min-w-0">
            {/* The masthead carries the page <h1>; every view heads at h2. */}
            <h2 className="font-semibold text-ink" style={T26}>{tool.title}</h2>
            <p className="mt-2 max-w-[58ch] pnum text-ink-2" style={T15}>{details.lead}</p>
          </div>
        </header>

        <div className="mt-7">
          <p className="eyebrow border-b-2 border-rule-strong pb-1">What it does</p>
          <ul className="mt-1.5">
            {details.bullets.map(([head, body]) => (
              <li key={head} className="border-b-[0.5px] border-rule py-2" style={T13}>
                <span className="font-medium text-ink">{head}</span>
                <span className="text-ink-3"> — </span>
                <span className="text-ink-2">{body}</span>
              </li>
            ))}
          </ul>
        </div>

        <details.Specimen />

        {/* THE PREMISES the specimen stands on. A preview that quotes figures
            and hides the case behind them is doing the thing this whole project
            exists to refuse. */}
        <div className="mt-8">
          <p className="eyebrow border-b border-rule pb-1">The case above, in full</p>
          <div className="mt-1.5 grid grid-cols-1 gap-x-10 sm:grid-cols-2">
            <Row name="Monthly bill" value={`$${CASE.monthlyBill}`} />
            <Row name="Region" value={CASE.region} />
            <Row name="System" value={`${SOLAR_SIZE.toFixed(1)} kW · ${CASE.batteryKwh} kWh`} />
            <Row name="Installed cost" value={money(PANELS_ONLY_COST + CASE.batteryCost)} />
            <Row name="Financing" value={`${CASE.loanRate}% · ${CASE.loanTerm} yr`} />
            <Row name="Federal tax credit" value="$0 — expired" muted />
          </div>
          <p className="mt-2.5 text-ink-3" style={T11}>
            Every figure in the specimen is computed by the engine in this repository from exactly these
            inputs. Nothing above is a screenshot and nothing is typed in by hand.
          </p>
        </div>

        {/* THE FREE ROUTE, offered before the paid one. */}
        <div className="mt-8">
          <hr className="rule" />
          <button
            type="button"
            onClick={() => onNavigate?.(details.free.id)}
            className="flex w-full items-baseline justify-between gap-3 bg-transparent px-0 py-3 text-left hover:text-ink"
          >
            <span style={T13}>
              <span className="font-medium text-ink">{details.free.label}</span>
              <span className="text-ink-2"> is free, and {details.free.why}</span>
            </span>
            <ArrowRight size={14} aria-hidden="true" className="mt-1 flex-none text-ink-3" />
          </button>
          <hr className="rule" />
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            href={PRO_URL}
            className="eyebrow inline-flex items-center justify-center bg-ink px-6 py-3 text-surface hover:bg-ink-2"
          >
            What Pro costs
          </a>
          <p className="text-ink-3" style={T11}>
            Pro is not finished and there is nothing to buy yet. The link explains where it has got to.
          </p>
        </div>
      </section>
    </div>
  );
};

export default ProLockCard;
