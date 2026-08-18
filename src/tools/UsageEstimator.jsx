import { useId, useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import Rail from '../components/Rail';
import { MARKERS } from '../components/markers';
import { Card, Figure, InputField, Marker, Perforation, RampLegend, StruckRow, toneForValue } from '../components/ui';
import { usePremises } from '../components/useShell';
import { SUN_PROFILES, annualSunHours } from '../engine/solar';

// =============================================================================
// INSTRUMENT — Usage Estimator.
//
// A split pane read as a faceplate: the premises are left and pinned, the
// figures are right and live, so a reader changing an input watches the column
// move. The numbers are READOUT BLOCKS — a mono micro-label silkscreened above,
// the figure in Archivo condensed heavy, its unit in mono at 0.4× in `--ink-3`.
// Grouped in ruled clusters, never in cards.
//
// THE ONE RULE holds: the only chroma on this sheet is measured. There is no
// plot here and no monthly shape to plot — the engine returns one steady daily
// load, and inventing a seasonal curve for it would be a drawing, not a
// reading — so the irradiance ramp is used exactly once, and on numbers: each
// line of the consumption breakdown takes its hue from its own share of the
// day, stepped across the five loads. The ramp reports which loads CARRY the
// day; the tabular column beside it reports how much, so the encoding is
// redundant and the table survives greyscale, a photocopier and colour-vision
// deficiency. Every label, rule, head, selection and icon here is achromatic.
//
// The headline figures carry no tone on purpose: a daily total sits in no
// domain this sheet can state honestly, and a readout with no domain is
// `--ink`. Chroma is not available for emphasis.
//
// A load that is zero because of a real-world fact (no pool, a gas water
// heater) is PRINTED and struck, never filtered out of the table — the reader
// can see what was considered and why it contributed nothing.
//
// The multipliers behind every figure sit in the marginalia rail; none of them
// hide in a tooltip. `src/engine/` is untouched.
// =============================================================================

const AGE_MULTIPLIER = { 'Pre-1980': 1.3, '1980-2000': 1.1, '2000+': 1.0 };
const CLIMATE_MULTIPLIER = { 'Mild': 0.7, 'Hot': 1.0, 'Very Hot': 1.4 };
const WATER_HEATER_KWH = { 'Gas': 0, 'Electric': 12, 'Heat Pump': 4 };

// The sizing basis. Pure reads of the engine's tables — hoisted only so the
// rail can print the same numbers the estimate is built from.
const SUN_PROFILE = 'CA Central Valley';
const SUN_HOURS = annualSunHours(SUN_PROFILE);
const WINTER_SUN_HOURS = SUN_PROFILES[SUN_PROFILE][11];

/** The two sidenotes this sheet keys, in house order. */
const SIZING_MARKER = MARKERS[0];
const LOAD_MARKER = MARKERS[1];

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

/** 11px footnote — the voice everything secondary speaks in on this sheet. */
const footnote = typeAt(11);

/** 12px, the rail's line-item body. */
const railItem = typeAt(12);

/** 13px line-item body. */
const lineItem = typeAt(13);

/**
 * A figure, or an em rule when the field it came from is empty. Never "NaN".
 * Grouped at the thousand, because a five-digit kWh figure read as a solid run
 * of digits is a figure nobody checks.
 */
const fig = (value, digits = 0) =>
  Number.isFinite(Number(value))
    ? Number(value).toLocaleString(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
    : '—';

/**
 * A numbered section head. The numeral is set in mono so it reads as an index
 * key rather than a quantity, and never enters the tabular figure column.
 */
const SectionHead = ({ number, children, className = '', as: Tag = 'h3' }) => (
  <div className={`flex items-baseline gap-2 ${className}`}>
    <span className="font-mono text-ink-3" style={footnote}>{number}</span>
    <Tag className="eyebrow">{children}</Tag>
  </div>
);

/**
 * A READOUT BLOCK — the unit this instrument reports in.
 *
 * Micro-label above in mono; the figure in Archivo condensed heavy, tabular, in
 * `--ink`; the currency mark and the unit in mono at 0.4× in `--ink-3`, so the
 * quantity is the only thing carrying weight. `step` picks the run: 56 for the
 * one figure the reader came for, 40 for the sizing answer, 28 for the
 * supporting pair.
 *
 * There is deliberately no `tone` prop. On this sheet the only stated domain is
 * the breakdown's own five loads, and a readout tinted against a domain nobody
 * declared would be decoration wearing a measurement's clothes.
 */
const Readout = ({ label, marker, prefix, value, unit, step = 28, stretch = '68%', weight = 700, note }) => (
  <div className="min-w-0">
    <div className="eyebrow">
      {label}
      <Marker symbol={marker} />
    </div>
    <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5">
      {prefix && <span className="font-mono text-ink-3" style={unitAt(step)}>{prefix}</span>}
      <span
        className="tnum text-ink"
        style={{ ...typeAt(step), fontStretch: stretch, fontWeight: weight }}
      >
        {value}
      </span>
      {unit && <span className="font-mono text-ink-3" style={unitAt(step)}>{unit}</span>}
    </div>
    {note && <p className="mt-1 text-ink-3" style={footnote}>{note}</p>}
  </div>
);

/**
 * Named alternatives set as a ruled index, not a segmented pill. Selection is
 * CHROME, so it is achromatic — the chosen option carries the 2px
 * `--rule-strong` underline and full ink, the others carry neither. The
 * encoding is redundant on purpose: rule weight, ink and figure weight all
 * change together, so the choice survives greyscale.
 *
 * The caption names a group of controls, so it is a labelled role="group", not
 * a <label>.
 */
const SegmentedField = ({ label, options, value, onChange }) => {
  const labelId = useId();
  return (
    <div className="mb-4">
      <span id={labelId} className="eyebrow mb-1 block">{label}</span>
      <div role="group" aria-labelledby={labelId} className="flex gap-4 border-b border-rule">
        {options.map(option => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            style={{ ...lineItem, fontWeight: value === option ? 600 : 400 }}
            className={`-mb-px whitespace-nowrap bg-transparent px-0 pt-1 ${value === option
              ? 'border-b-2 border-rule-strong pb-1.5 text-ink'
              : 'border-b-2 border-transparent pb-1.5 text-ink-3 hover:text-ink-2'
              }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * One ruled line item of the breakdown: term left, figure right in the tabular
 * column, inked by `tone` — its own share of the day on the irradiance ramp.
 *
 * The 0.5px weight matches `StruckRow`, which sets its own rule and prints in
 * this same table: a struck zero and a live figure are peers, and giving them
 * different rules would rank them.
 */
const LineItem = ({ label, value, tone }) => (
  <div className="flex items-baseline justify-between gap-4 border-b-[0.5px] border-rule py-1.5">
    <dt className="text-ink-2" style={lineItem}>{label}</dt>
    <dd className={`tnum ${tone ?? 'text-ink'}`} style={lineItem}>{value}</dd>
  </div>
);

/** One row of the marginalia rail: what a figure was built from. */
const BasisRow = ({ term, children }) => (
  <div className="flex items-baseline justify-between gap-4 border-b-[0.5px] border-rule py-1">
    <dt className="text-ink-2" style={railItem}>{term}</dt>
    <dd className="tnum text-ink" style={railItem}>{children}</dd>
  </div>
);

const UsageEstimator = ({ onExport }) => {
  const [sqFt, setSqFt] = useState(2000);
  const [occupants, setOccupants] = useState(4);
  const [hasPool, setHasPool] = useState(false);
  const [evMiles, setEvMiles] = useState(30);
  const [numEVs, setNumEVs] = useState(1);
  const [acUsage, setAcUsage] = useState(5);
  const [homeAge, setHomeAge] = useState('2000+');
  const [climateZone, setClimateZone] = useState('Hot');
  const [waterHeater, setWaterHeater] = useState('Gas');
  const [utilityRate, setUtilityRate] = useState(0.40);

  const estimation = useMemo(() => {
    const baseLoad = (sqFt * 0.005 * AGE_MULTIPLIER[homeAge]) + (occupants * 2.5);
    const poolLoad = hasPool ? 8 : 0;
    const evLoad = evMiles * 0.3 * numEVs;
    const acLoad = acUsage * 1.5 * CLIMATE_MULTIPLIER[climateZone];
    const waterLoad = WATER_HEATER_KWH[waterHeater];
    const dailyTotal = baseLoad + poolLoad + evLoad + acLoad + waterLoad;
    const monthlyKwh = dailyTotal * 30;
    const monthlyBillEst = monthlyKwh * utilityRate;
    const recommendedSystem = (dailyTotal / SUN_HOURS).toFixed(1);
    const winterSystem = (dailyTotal / WINTER_SUN_HOURS).toFixed(1);
    return {
      dailyTotal, monthlyKwh, monthlyBillEst, recommendedSystem, winterSystem,
      // Raw, never pre-rounded: `fig()` rounds at the point of printing. A
      // column rounded in the model cannot add up to a headline that is not,
      // and this sheet's whole claim is that its arithmetic is auditable.
      breakdown: [
        { name: 'Base Home', value: baseLoad },
        { name: 'Pool', value: poolLoad },
        { name: 'EV Charging', value: evLoad },
        { name: 'HVAC', value: acLoad },
        { name: 'Water Heater', value: waterLoad },
      ]
    };
  }, [sqFt, occupants, hasPool, evMiles, numEVs, acUsage, homeAge, climateZone, waterHeater, utilityRate]);

  // The printed column has to add up: the lines and the headline come off the
  // same unrounded figures, so this equals `estimation.dailyTotal` exactly.
  const breakdownTotal = estimation.breakdown.reduce((sum, item) => sum + item.value, 0);

  // THE ONE DOMAIN this sheet states: the loads are stepped across their own
  // range, so the ramp reports SHAPE — which loads carry the day — rather than
  // an absolute the reader has no scale for. Same argument the month strip
  // makes elsewhere, and the reason the heaviest load is always at the top stop.
  const loadValues = estimation.breakdown
    .map(item => Number(item.value))
    .filter(Number.isFinite);
  const loadPeak = loadValues.length ? Math.max(...loadValues) : 0;

  // Why a line item came out at zero. Only a real-world fact earns a struck row;
  // a load with no reason simply prints its zero.
  const zeroReason = (name) => {
    if (name === 'Pool') return 'no pool pump on this home';
    if (name === 'EV Charging') return numEVs > 0 ? 'no daily EV miles entered' : 'no EV on this home';
    if (name === 'HVAC') return 'no summer AC hours entered';
    if (name === 'Water Heater') return `${waterHeater.toLowerCase()} water heater, not on the electric meter`;
    return null;
  };

  // The premises the figures depend on, published to the sticky context bar so
  // a number on this page is never orphaned from the rate that produced it.
  usePremises({
    fields: [
      { label: 'System', value: fig(estimation.recommendedSystem, 1), unit: 'kW' },
      { label: 'Daily usage', value: fig(estimation.dailyTotal, 1), unit: 'kWh' },
      { label: 'Utility rate', value: fig(utilityRate, 2), unit: '$/kWh' },
    ],
  });

  return (
    <div>
      <header className="mb-7">
        <p className="eyebrow">Usage · without a bill</p>
        {/* The masthead carries the page <h1>; every view heads at h2. */}
        <h2
          className="mt-1 font-semibold text-ink"
          style={{ ...typeAt(28), fontStretch: '75%' }}
        >
          Usage Estimator
        </h2>
        <p className="mt-1.5 max-w-[52ch] text-ink-2" style={typeAt(15)}>
          Estimate your home&apos;s electricity use when you don&apos;t have a bill handy.
        </p>
      </header>

      {/* SPLIT PANE. Premises left and pinned, readouts right and live — the
          reader never loses the inputs while reading the numbers they made. */}
      <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-[19rem_minmax(0,1fr)]">
        {/* The form sticks below the context bar, and takes its own scroll when
            it is taller than the viewport — a sticky pane that cannot reach its
            last field is worse than one that does not stick. */}
        <section
          aria-label="Your inputs"
          className="lg:sticky lg:top-14 lg:max-h-[calc(100vh_-_4.5rem)] lg:self-start lg:overflow-y-auto"
        >
          <Card className="px-5 pb-6 pt-4">
            <form onSubmit={(e) => e.preventDefault()}>
              <SectionHead number="01" className="mb-4">Home Details</SectionHead>

              <InputField label="Square Footage" value={sqFt} onChange={setSqFt} unit="sqft" step="100" />
              <InputField label="Occupants" value={occupants} onChange={setOccupants} unit="ppl" step="1" />
              <SegmentedField label="Home Age" options={Object.keys(AGE_MULTIPLIER)} value={homeAge} onChange={setHomeAge} />
              <SegmentedField label="Climate Zone" options={Object.keys(CLIMATE_MULTIPLIER)} value={climateZone} onChange={setClimateZone} />
              <SegmentedField label="Water Heater" options={Object.keys(WATER_HEATER_KWH)} value={waterHeater} onChange={setWaterHeater} />
              <label className="mb-4 flex cursor-pointer items-center justify-between gap-4 border-b border-rule py-2">
                <span className="eyebrow">Pool Pump?</span>
                <input
                  type="checkbox"
                  checked={hasPool}
                  onChange={(e) => setHasPool(e.target.checked)}
                  className="h-3.5 w-3.5 flex-none"
                />
              </label>
              <InputField label="Daily EV Driving" value={evMiles} onChange={setEvMiles} unit="mi/day" step="5" />
              <InputField label="Number of EVs" value={numEVs} onChange={setNumEVs} unit="EVs" step="1" />
              <InputField label="AC Usage (Summer)" value={acUsage} onChange={setAcUsage} unit="hrs/day" step="1" />
              <InputField label="Utility Rate" value={utilityRate} onChange={setUtilityRate} unit="$/kWh" step="0.01" />
            </form>
          </Card>
        </section>

        <section aria-label="Your estimate" className="min-w-0">
          <Card className="px-5 pb-6 pt-4">
            <SectionHead number="02">Estimated Usage</SectionHead>

            {/* THE PRIMARY READOUT. Archivo condensed heavy on the display run,
                its unit in mono at 0.4× — the one figure the reader came for. */}
            <div className="mt-2.5 border-b-2 border-rule-strong pb-1.5">
              <Readout
                label="Daily usage"
                value={fig(estimation.dailyTotal, 1)}
                unit="kWh / day"
                step={56}
                stretch="62%"
                weight={800}
              />
            </div>

            {/* THE READOUT CLUSTER — ruled, not carded. One 1px rule between
                blocks and one under the group; no boxes, no padding wells. */}
            <div className="grid grid-cols-1 divide-y divide-rule border-b border-rule sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <div className="py-3 sm:pr-4">
                <Readout label="Monthly usage" value={fig(estimation.monthlyKwh, 0)} unit="kWh / mo" />
              </div>
              <div className="py-3 sm:px-4">
                <Readout label="Est. Monthly Bill" prefix="$" value={fig(estimation.monthlyBillEst, 0)} unit="/ mo" />
              </div>
            </div>

            {/* THE RECOMMENDATION — a ruled block opened by a 2px `--rule-strong`
                rule, with its figure as a readout. Not a callout, not a box, and
                not tinted: a recommended size is a measurement, and the only
                thing a measurement gets here is the display run. */}
            <hr className="rule-strong mt-8" />
            <SectionHead number="03" className="mt-2.5">
              Recommended System
            </SectionHead>
            <div className="mt-2.5">
              <Readout
                label="System size"
                marker={SIZING_MARKER}
                value={fig(estimation.recommendedSystem, 1)}
                unit="kW"
                step={40}
                stretch="62%"
                weight={800}
                note={(
                  <>
                    Winter-independent: <span className="tnum">{fig(estimation.winterSystem, 1)}</span> kW,
                    sized on December sun hours rather than the annual average.
                  </>
                )}
              />
            </div>

            {/* THE BREAKDOWN — ruled line items, the unit once at the head of the
                figure column, an inverted TOTAL at the foot. Each figure takes
                its hue from its own share of the day; the key states the domain,
                and the tabular column beside it states the figure, so the hue is
                never the only encoding. Zero loads are printed and struck, never
                filtered away. */}
            <hr className="rule-strong mt-8" />
            <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <SectionHead number="04">
                Consumption Breakdown
              </SectionHead>
              <RampLegend low="0 kWh" high={`${fig(loadPeak, 1)} kWh`} />
            </div>

            <div className="mt-3 flex items-baseline justify-between gap-4 border-b-[0.5px] border-rule pb-1 pt-2">
              <span className="eyebrow">
                Load
                <Marker symbol={LOAD_MARKER} />
              </span>
              {/* The unit, stated once at the head of the column it governs. */}
              <span className="font-mono text-ink-3" style={footnote}>kWh / day</span>
            </div>
            <dl>
              {estimation.breakdown.map(item => (
                item.value === 0 && zeroReason(item.name)
                  ? <StruckRow key={item.name} label={item.name} value="0" reason={zeroReason(item.name)} />
                  : (
                    <LineItem
                      key={item.name}
                      label={item.name}
                      value={fig(item.value, 1)}
                      tone={toneForValue(item.value, 0, loadPeak)}
                    />
                  )
              ))}
              <div className="-mx-2 flex items-baseline justify-between gap-4 bg-ink px-2 py-1.5">
                <dt className="eyebrow text-field">Total</dt>
                <dd className="tnum font-medium text-field" style={lineItem}>{fig(breakdownTotal, 1)}</dd>
              </div>
            </dl>
            <Figure number={1} className="mt-2">
              Every load considered, in kWh per day, stepped across the irradiance ramp between
              nothing and the heaviest single load — so the ramp reads which loads carry the day
              rather than absolute consumption. A load that is zero because of a fact about the
              home is printed and struck, not dropped.
            </Figure>

            <hr className="rule mt-7" />
            <button
              type="button"
              /* The breakdown goes out UNROUNDED. Rounding each load to one
                 decimal here made the export display-precision: a consumer
                 re-summing the twelve lines could then disagree with the
                 separately-exported `dailyKwh` by a few hundredths, which is a
                 proposal that does not add up. Rounding belongs at the point of
                 display — `fig()` above — not in the payload. */
              onClick={() => onExport({ dailyKwh: estimation.dailyTotal.toFixed(1), monthlyBill: estimation.monthlyBillEst.toFixed(0), sqFt, occupants, recommendedSystem: estimation.recommendedSystem, breakdown: estimation.breakdown })}
              className="eyebrow flex w-full items-center justify-between gap-2 bg-transparent px-0 py-3 text-ink-2 hover:text-ink print:hidden"
            >
              Export to Proposal
              <FileText size={14} aria-hidden="true" />
            </button>
          </Card>
        </section>
      </div>

      {/* THE MARGINALIA — every multiplier the figures were built from, keyed to
          the figure it produced. Assumptions live on the page, never in a
          tooltip and never behind a click. */}
      <Rail>
        <aside className="pt-1">
          <Perforation className="mb-4" label="Assumptions follow" />

          <h3 className="eyebrow mb-2">
            Sizing basis
            <Marker symbol={SIZING_MARKER} />
          </h3>
          <dl>
            <BasisRow term={`Sun hours, ${SUN_PROFILE}`}>{SUN_HOURS.toFixed(1)} hrs / day</BasisRow>
            <BasisRow term="Sun hours, December">{WINTER_SUN_HOURS.toFixed(1)} hrs / day</BasisRow>
          </dl>

          <h3 className="eyebrow mb-2 mt-6">
            Load basis
            <Marker symbol={LOAD_MARKER} />
          </h3>
          <dl>
            <BasisRow term="Base load">0.005 kWh / sq ft / day</BasisRow>
            <BasisRow term="Per occupant">2.5 kWh / day</BasisRow>
            <BasisRow term={`Home age, ${homeAge}`}>&times;{AGE_MULTIPLIER[homeAge].toFixed(1)}</BasisRow>
            <BasisRow term="Air conditioning">1.5 kWh / hour</BasisRow>
            <BasisRow term={`Climate, ${climateZone}`}>&times;{CLIMATE_MULTIPLIER[climateZone].toFixed(1)}</BasisRow>
            <BasisRow term="Pool pump">8 kWh / day</BasisRow>
            <BasisRow term="EV charging">0.3 kWh / mile</BasisRow>
            <BasisRow term={`Water heater, ${waterHeater}`}>{WATER_HEATER_KWH[waterHeater]} kWh / day</BasisRow>
          </dl>

          <p className="mt-4 text-ink-3" style={footnote}>
            This is an estimate, not a quote or guarantee. Actual utility rates, production, usage, financing, and incentives can change your results.
          </p>
        </aside>
      </Rail>
    </div>
  );
};

export default UsageEstimator;
