import { useId, useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import Rail from '../components/Rail';
import { Card, InputField, Marker, Perforation, StruckRow } from '../components/ui';
import { usePremises } from '../components/useShell';
import { SUN_PROFILES, annualSunHours } from '../engine/solar';

// =============================================================================
// COUNTERFOIL — Usage Estimator.
//
// A split pane: the form is left and sticky, the figures are right and live, so
// a reader changing an input watches the column move. There are no boxes here —
// the breakdown is a run of ruled line items with the kWh in a right-aligned
// tabular column, the unit stated once at the head of that column, and a
// solid-filled TOTAL at the foot, exactly as a bill sets it.
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

const T11 = { fontSize: 'var(--size-11)', lineHeight: 'var(--lh-11)', letterSpacing: 'var(--track-11)' };
const T12 = { fontSize: 'var(--size-12)', lineHeight: 'var(--lh-12)', letterSpacing: 'var(--track-12)' };
const T13 = { fontSize: 'var(--size-13)', lineHeight: 'var(--lh-13)', letterSpacing: 'var(--track-13)' };
const T15 = { fontSize: 'var(--size-15)', lineHeight: 'var(--lh-15)', letterSpacing: 'var(--track-15)' };
const T28 = { fontSize: 'var(--size-28)', lineHeight: 'var(--lh-28)', letterSpacing: 'var(--track-28)' };

/** A figure, or an em rule when the field it came from is empty. Never "NaN". */
const fig = (value, digits = 0) =>
  Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '—';

/**
 * Named alternatives set as a ruled index, not a segmented pill. The chosen one
 * carries the 2px rule and full ink; the others carry none. The caption names a
 * group of controls, so it is a labelled role="group", not a <label>.
 */
const SegmentedField = ({ label, options, value, onChange }) => {
  const labelId = useId();
  return (
    <div className="mb-4">
      <span id={labelId} className="eyebrow mb-1 block">{label}</span>
      <div role="group" aria-labelledby={labelId} className="flex gap-4 border-b-[0.5px] border-hair">
        {options.map(option => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            style={T13}
            className={`-mb-px whitespace-nowrap border-b-2 bg-transparent px-0 pb-1.5 pt-1 ${value === option
              ? 'border-rule-heavy font-medium text-ink'
              : 'border-transparent text-ink-3 hover:text-ink-2'
              }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
};

/** One ruled line item: term left, figure right in the tabular column. */
const LineItem = ({ label, value }) => (
  <div className="flex items-baseline justify-between gap-4 border-b-[0.5px] border-hair py-1.5">
    <dt className="text-ink-2" style={T13}>{label}</dt>
    <dd className="tnum text-ink" style={T13}>{value}</dd>
  </div>
);

/** One row of the marginalia rail: what a figure was built from. */
const BasisRow = ({ term, children }) => (
  <div className="flex items-baseline justify-between gap-4 border-b-[0.5px] border-hair py-1">
    <dt className="text-ink-2" style={T12}>{term}</dt>
    <dd className="tnum text-ink" style={T12}>{children}</dd>
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
    <div className="max-w-5xl">
      <header>
        <h2 className="font-semibold text-ink" style={T28}>Usage Estimator</h2>
        <p className="mt-1.5 max-w-[46em] pnum text-ink-2" style={T15}>
          Estimate your home&apos;s electricity use when you don&apos;t have a bill handy.
        </p>
      </header>

      {/* SPLIT PANE — the form left and sticky, the figures right and live. */}
      <div className="mt-9 grid grid-cols-1 gap-x-12 gap-y-12 md:grid-cols-[18rem_minmax(0,1fr)]">
        {/* The form sticks below the context bar, and takes its own scroll when
            it is taller than the viewport — a sticky pane that cannot reach its
            last field is worse than one that does not stick. */}
        <form
          className="md:sticky md:top-14 md:max-h-[calc(100vh-4.5rem)] md:self-start md:overflow-y-auto"
          onSubmit={(e) => e.preventDefault()}
        >
          <h3 className="eyebrow">Home Details</h3>
          <hr className="rule-heavy mb-4 mt-1.5" />
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

        <div className="min-w-0">
          {/* THE HEADLINE FIGURE — condensed, tabular, right-aligned into the
              same column every figure below it lands in. */}
          <section aria-label="Estimated Usage">
            <h3 className="eyebrow">Estimated Usage</h3>
            <hr className="rule-heavy mt-1.5" />
            <div className="flex items-baseline justify-end gap-2 pt-3">
              <span
                className="tnum font-semibold text-ink"
                style={{ fontSize: 'var(--size-40)', lineHeight: 'var(--lh-40)', letterSpacing: 'var(--track-40)', fontStretch: '62%' }}
              >
                {fig(estimation.dailyTotal, 1)}
              </span>
              <span className="font-mono text-ink-3" style={{ fontSize: 'calc(var(--size-40) * 0.74)', lineHeight: 1 }}>
                kWh / Day
              </span>
            </div>
            <div className="mt-1 flex items-baseline justify-end gap-2">
              <span className="tnum text-ink-2" style={T13}>{fig(estimation.monthlyKwh, 0)}</span>
              <span className="font-mono text-ink-3" style={{ fontSize: 'calc(var(--size-13) * 0.74)' }}>kWh / Month</span>
            </div>

            <hr className="rule mt-6" />
            <dl>
              <div className="flex items-baseline justify-between gap-4 border-b-[0.5px] border-hair py-1.5">
                <dt className="text-ink-2" style={T13}>Est. Monthly Bill</dt>
                <dd className="tnum text-ink" style={T13}>
                  <span className="mr-0.5 font-mono text-ink-3" style={{ fontSize: '0.74em' }}>$</span>
                  {fig(estimation.monthlyBillEst, 0)}
                </dd>
              </div>
            </dl>
          </section>

          {/* THE RECOMMENDATION — a ruled block on a 2px rule, not a callout box. */}
          <Card className="mt-8 px-5 pb-5 pt-4">
            <h3 className="eyebrow">
              Recommended System
              <Marker symbol="*" />
            </h3>
            <div className="mt-2 flex items-baseline justify-end gap-2">
              <span
                className="tnum font-semibold text-ink"
                style={{ fontSize: 'var(--size-28)', lineHeight: 'var(--lh-28)', letterSpacing: 'var(--track-28)', fontStretch: '75%' }}
              >
                {fig(estimation.recommendedSystem, 1)}
              </span>
              <span className="font-mono text-ink-3" style={{ fontSize: 'calc(var(--size-28) * 0.74)', lineHeight: 1 }}>kW</span>
            </div>
            <div className="mt-1.5 text-right text-ink-3" style={T11}>
              winter-independent: <span className="tnum">{fig(estimation.winterSystem, 1)}</span> kW
            </div>
          </Card>

          {/* THE BREAKDOWN — ruled line items, the unit once at the head of the
              figure column, a solid-filled TOTAL at the foot. Zero loads are
              printed and struck, never filtered away. */}
          <section className="mt-8" aria-label="Consumption Breakdown">
            <h3 className="eyebrow">
              Consumption Breakdown
              <Marker symbol="†" />
            </h3>
            <hr className="rule-heavy mt-1.5" />
            <dl>
              <div className="flex items-baseline justify-between gap-4 border-b-[0.5px] border-hair pb-1 pt-2">
                <dt className="eyebrow">Load</dt>
                {/* The unit, stated once at the head of the column it governs. */}
                <dd className="font-mono text-ink-3" style={T11}>kWh / day</dd>
              </div>
              {estimation.breakdown.map(item => (
                item.value === 0 && zeroReason(item.name)
                  ? <StruckRow key={item.name} label={item.name} value="0" reason={zeroReason(item.name)} />
                  : <LineItem key={item.name} label={item.name} value={fig(item.value, 1)} />
              ))}
              <div className="-mx-2 flex items-baseline justify-between gap-4 bg-ink px-2 py-1.5 text-paper">
                <dt className="eyebrow text-paper">Total</dt>
                <dd className="tnum font-medium" style={T13}>{fig(breakdownTotal, 1)}</dd>
              </div>
            </dl>
          </section>

          <button
            type="button"
            onClick={() => onExport({ dailyKwh: estimation.dailyTotal.toFixed(1), monthlyBill: estimation.monthlyBillEst.toFixed(0), sqFt, occupants, recommendedSystem: estimation.recommendedSystem, breakdown: estimation.breakdown.map(item => ({ ...item, value: parseFloat(item.value.toFixed(1)) })) })}
            className="mt-10 flex w-full items-center justify-between gap-3 border-b border-t border-rule bg-transparent py-2.5 hover:bg-field print:hidden"
          >
            <span className="eyebrow text-ink">Export to Proposal</span>
            <FileText size={13} className="flex-none text-ink-3" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* THE MARGINALIA — every multiplier the figures were built from, keyed to
          the figure it produced. Assumptions live on the page, never in a
          tooltip and never behind a click. */}
      <Rail>
        <aside className="hair pt-4">
          <Perforation className="mb-4" label="Assumptions follow" />

          <h3 className="eyebrow mb-2">
            Sizing basis
            <Marker symbol="*" />
          </h3>
          <dl>
            <BasisRow term={`Sun hours, ${SUN_PROFILE}`}>{SUN_HOURS.toFixed(1)} hrs / day</BasisRow>
            <BasisRow term="Sun hours, December">{WINTER_SUN_HOURS.toFixed(1)} hrs / day</BasisRow>
          </dl>

          <h3 className="eyebrow mb-2 mt-6">
            Load basis
            <Marker symbol="†" />
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

          <p className="mt-4 text-ink-3" style={T11}>
            This is an estimate, not a quote or guarantee. Actual utility rates, production, usage, financing, and incentives can change your results.
          </p>
        </aside>
      </Rail>
    </div>
  );
};

export default UsageEstimator;
