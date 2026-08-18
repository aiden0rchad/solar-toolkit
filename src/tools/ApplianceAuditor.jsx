import { useId, useState } from 'react';
import {
  Box, Car, CookingPot, Droplets, Flame, Gamepad2,
  Settings, Shirt, Snowflake, Waves, Wind, Zap,
} from 'lucide-react';
import Rail from '../components/Rail';
import { usePremises } from '../components/useShell';
import { MARKERS } from '../components/markers';
import { Card, InputField, Marker, Perforation, RampLegend, toneForValue } from '../components/ui';
import { presets } from '../data/appliancePresets';
import { annualSunHours } from '../engine/solar';

// =============================================================================
// INSTRUMENT — Appliance Auditor.
//
// A load schedule read as a faceplate. The catalogue is pinned left; the
// schedule it builds is live on the right, and it LEADS WITH DATA: the running
// total is a readout block — mono micro-label, Archivo condensed heavy figure,
// unit in mono at 0.4× — before a single line item is printed. The schedule
// itself is a ruled list of line items with right-aligned tabular figures,
// closed by a filled TOTAL row, the way a bill closes a schedule.
//
// THE ONE RULE holds: the only chroma on this sheet is the running total, which
// takes its hue from its own magnitude on the irradiance ramp against a stated
// domain — nothing added, up to every load in the catalogue at once. Every
// label, rule, icon, head and line item is achromatic. Nothing glows: the
// figure reads luminous because everything around it is silent.
//
// The premises the money stands on — the rate, the 30-day month, the production
// factor — are printed in the marginalia rail and keyed by footnote marker.
// Assumptions live on the page, never in a tooltip.
// =============================================================================

// --- ICONS -------------------------------------------------------------------
// src/data/appliancePresets.js is frozen and still stores an emoji string under
// `icon`. NO EMOJI RENDERS: the key is mapped to a lucide component here, by
// CODEPOINT rather than by literal, so this file carries no emoji of its own and
// a variation selector on the data side cannot break the lookup. Every name
// below was verified against node_modules/lucide-react before importing — an
// invalid icon import breaks the build for the whole app.
//
// The icons are decorative: 14px, `--ink-3`, aria-hidden. They give a row a
// silhouette to find it by; they carry no measurement and therefore no hue.
const ICONS_BY_CODEPOINT = {
  '1f697': Car, //         car
  '1f3ca': Waves, //       swimmer -> pool pump
  '2668': Droplets, //     hot springs -> hot tub
  '1f3ae': Gamepad2, //    game controller
  '2744': Snowflake, //    snowflake -> AC
  '1f455': Shirt, //       t-shirt -> dryer
  '26a1': Zap, //          high voltage -> EV charger
  '1f373': CookingPot, //  cooking -> oven
  '1f525': Flame, //       fire -> space heater
  '1f32c': Wind, //        wind face -> mini-split
  '2699': Settings, //     gear -> a custom line the reader added
};

/**
 * The emoji key reduced to its BASE codepoint. Three of the ten keys carry a
 * trailing U+FE0F presentation selector and the rest do not, so a lookup on the
 * literal string would silently miss those three and fall through to the
 * placeholder. `codePointAt(0)` reads the base and ignores whatever follows it.
 */
const codepointOf = (icon) =>
  (typeof icon === 'string' && icon.length ? icon.codePointAt(0).toString(16) : '');

const iconFor = (item) =>
  ICONS_BY_CODEPOINT[codepointOf(item.icon)] ?? (item.custom ? Settings : Box);

/**
 * The key a custom line carries, byte-for-byte what this tool has always
 * written: U+2699 GEAR + U+FE0F. It goes out through `onExport` into the
 * persisted proposal payload, so the shape of an exported line is unchanged.
 * Written as escapes rather than a literal so no emoji appears in this source,
 * and it never renders — `iconFor` maps it to the lucide gear above.
 */
const CUSTOM_ICON_KEY = '\u2699\uFE0F';

// --- PREMISES ----------------------------------------------------------------

/** The production factor behind "Required system increase" — kWh per kW per day. */
const CV_SUN_HOURS = annualSunHours('CA Central Valley');

/** Flat blended rate. Printed in the rail, published to the context bar. */
const UTILITY_RATE = 0.40;

/** Days in the month the monthly figures are billed over. */
const DAYS_PER_MONTH = 30;

/**
 * The domain the running total is inked against: every load in the catalogue
 * added at once. It is a real ceiling taken from the data file rather than a
 * number picked to make the ramp look busy, and the ramp legend beside the
 * readout states both of its ends.
 */
const CATALOGUE_CEILING = presets.reduce((sum, preset) => sum + preset.kwh, 0);

/** The marker order is the house order; the rail prints these in the same run. */
const [MARK_RATE, MARK_SUN] = MARKERS;

// --- TYPE --------------------------------------------------------------------

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

/** The unit beside a readout: 0.4× the figure it qualifies, mono, `--ink-3`. */
const unitAt = (step) => ({
  fontSize: `calc(var(--size-${step}) * 0.4)`,
  lineHeight: 1,
});

/** 11px footnote — the voice everything secondary speaks in on this sheet. */
const footnote = typeAt(11);

/** 13px line-item body. */
const lineItem = typeAt(13);

/** Figures on a line item carry their unit once, at the column head, at 0.74×. */
const columnUnit = { fontSize: 'calc(var(--size-13) * 0.74)', lineHeight: 1 };

/** Display formatting only — the engine's arithmetic is untouched. */
const fmt = (value, digits = 1) =>
  Number(value).toLocaleString(undefined, { maximumFractionDigits: digits });

// --- PRIMITIVES --------------------------------------------------------------

/**
 * A numbered section head. The numeral is mono so it reads as an index key
 * rather than a quantity, and never enters the tabular figure column.
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
 * Micro-label above in mono; the figure in Archivo condensed heavy, tabular; the
 * currency mark and the unit in mono at 0.4× in `--ink-3`, so the quantity is
 * the only thing carrying weight. `step` picks the run: 56 for the figure the
 * reader came for, 28 for the supporting three.
 *
 * `tone` inks the FIGURE from its own magnitude on the irradiance ramp. Only
 * the figure: the micro-label, the marker, the prefix and the unit are chrome
 * and stay achromatic. Without a `tone` the figure is `--ink`, which is what a
 * readout with no domain to sit in should be — and the three supporting figures
 * here are deliberately untoned, because all three are the same measurement in
 * different units and painting them the same hue three times would be
 * decoration rather than a reading.
 */
const Readout = ({ label, marker, prefix, value, unit, step = 28, stretch = '68%', weight = 700, tone }) => (
  <div className="min-w-0">
    <div className="eyebrow">
      {label}
      <Marker symbol={marker} />
    </div>
    <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5">
      {prefix && <span className="font-mono text-ink-3" style={unitAt(step)}>{prefix}</span>}
      <span
        className={`tnum ${tone ?? 'text-ink'}`}
        style={{ ...typeAt(step), fontStretch: stretch, fontWeight: weight }}
      >
        {value}
      </span>
      {unit && <span className="font-mono text-ink-3" style={unitAt(step)}>{unit}</span>}
    </div>
  </div>
);

/** A 14px decorative icon standing in for the emoji the data file still stores. */
const ItemIcon = ({ item }) => {
  const Icon = iconFor(item);
  return <Icon size={14} strokeWidth={1.5} aria-hidden="true" className="shrink-0 translate-y-px text-ink-3" />;
};

/**
 * A figure column head: the unit, stated once, in mono in `--ink-3`. The rows
 * below carry bare numerals, so the column reads as one figure stack.
 */
const UnitHead = ({ children, marker }) => (
  <span className="justify-self-end font-mono text-ink-3" style={columnUnit}>
    {children}
    <Marker symbol={marker} />
  </span>
);

/** A ruled sidenote in the margin: marker, premise, figure. */
const Sidenote = ({ marker, term, children }) => (
  <div className="flex items-baseline justify-between gap-4 border-b border-rule py-1">
    <dt className="text-ink-2" style={typeAt(12)}>
      {term}
      <Marker symbol={marker} />
    </dt>
    <dd className="tnum flex-none text-ink" style={typeAt(12)}>{children}</dd>
  </div>
);

/**
 * A text control. No box, no fill, no radius: the rule under it arrives on
 * hover, which is the only thing that moves.
 */
const textButton =
  'border-b border-transparent bg-transparent px-0 pb-0.5 text-ink-2 hover:border-rule-strong hover:text-ink';

/** The schedule's column geometry, written once so a head and a row cannot drift. */
const SCHEDULE_COLS = 'grid grid-cols-[minmax(0,1fr)_3.5rem_4rem_4.25rem] items-baseline gap-x-4';

// --- TOOL: APPLIANCE AUDITOR -------------------------------------------------

const ApplianceAuditor = ({ onExport }) => {
  // Ties each caption to the group it names — a bare label above a stack of
  // rows labels nothing.
  const uid = useId();
  const [items, setItems] = useState([]);
  const [customName, setCustomName] = useState('');
  // NaN is "cleared", which is how InputField distinguishes an empty box from a
  // typed zero. `NaN > 0` is false, so the add guard below needs no extra test.
  const [customKwh, setCustomKwh] = useState(NaN);

  const addItem = (preset) => setItems([...items, { ...preset, id: Date.now() + Math.random() }]);

  // `icon` stays on the object: it goes out through onExport into the persisted
  // `solartoolkit-proposal` payload, so the shape of an exported line is
  // unchanged. The UI never renders it — iconFor maps it to a lucide component.
  const addCustomItem = () => {
    if (customName && customKwh > 0) {
      setItems([...items, { name: customName, kwh: customKwh, icon: CUSTOM_ICON_KEY, custom: true, id: Date.now() }]);
      setCustomName('');
      setCustomKwh(NaN);
    }
  };

  const removeItem = (id) => setItems(items.filter(i => i.id !== id));

  const totalAddedKwh = items.reduce((acc, curr) => acc + curr.kwh, 0);
  const monthlyCost = totalAddedKwh * DAYS_PER_MONTH * UTILITY_RATE;
  const annualCost = monthlyCost * 12;
  const systemIncrease = (totalAddedKwh / CV_SUN_HOURS).toFixed(1);

  // The premises every figure below stands on, carried in the sticky context
  // bar so no number here is ever read without them.
  usePremises({
    fields: [
      { label: 'Blended rate', value: UTILITY_RATE.toFixed(2), unit: '$/kWh' },
      { label: 'Added load', value: fmt(totalAddedKwh), unit: 'kWh/day' },
      { label: 'System increase', value: systemIncrease, unit: 'kW' },
    ],
  });

  // The supporting run. Each is its own readout block carrying its own unit,
  // because this cluster mixes $/mo, $/yr and kW and a single column head can
  // only state a unit once when the column is homogeneous.
  const readouts = [
    {
      label: 'Est. monthly cost',
      marker: MARK_RATE,
      prefix: '$',
      value: Math.round(monthlyCost).toLocaleString(),
      unit: '/mo',
    },
    {
      label: 'Est. annual cost',
      marker: MARK_RATE,
      prefix: '$',
      value: Math.round(annualCost).toLocaleString(),
      unit: '/yr',
    },
    {
      label: 'Required system increase',
      marker: MARK_SUN,
      prefix: '~',
      value: systemIncrease,
      unit: 'kW',
    },
  ];

  return (
    <div>
      <header className="mb-7">
        <p className="eyebrow">Appliance Auditor</p>
        {/* The masthead carries the page <h1>; every view heads at h2. */}
        <h2 className="mt-1 font-semibold text-ink" style={{ ...typeAt(28), fontStretch: '75%' }}>
          Appliance Consumption Auditor
        </h2>
        <p className="mt-1.5 max-w-[52ch] text-ink-2" style={typeAt(15)}>
          Add up future loads (EVs, Pools, HVAC) to prevent under-sizing the system.
        </p>
      </header>

      {/* SPLIT PANE. Catalogue left and pinned, schedule right and live — the
          reader never loses the loads on offer while reading the ones they
          picked. */}
      <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <section
          aria-label="Loads you can add"
          className="lg:sticky lg:top-14 lg:max-h-[calc(100vh_-_4.5rem)] lg:self-start lg:overflow-y-auto"
        >
          <Card className="px-5 pb-6 pt-4">
            <SectionHead number="01">Common additions</SectionHead>

            {/* The catalogue is a ruled index of line items, not a grid of
                chips. Only the name moves under the cursor, and only by
                underlining. */}
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_4rem] items-baseline gap-x-4 pb-1">
              <span className="eyebrow">Load</span>
              <UnitHead>kWh/day</UnitHead>
            </div>
            <hr className="rule" />
            {presets.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => addItem(preset)}
                aria-label={`Add ${preset.name}`}
                className="group grid w-full grid-cols-[minmax(0,1fr)_4rem] items-baseline gap-x-4 border-b border-rule py-2 text-left"
              >
                <span className="flex min-w-0 items-baseline gap-2.5">
                  <ItemIcon item={preset} />
                  <span className="truncate text-ink-2 group-hover:text-ink group-hover:underline group-hover:underline-offset-2" style={lineItem}>
                    {preset.name}
                  </span>
                </span>
                <span className="tnum justify-self-end text-ink" style={lineItem}>+{preset.kwh}</span>
              </button>
            ))}

            <hr className="rule-strong mt-7" />
            <SectionHead number="02" className="mt-2.5">Custom appliance</SectionHead>

            <div className="mt-3">
              <label htmlFor={`${uid}-custom-name`} className="eyebrow mb-1 block">Name</label>
              <input
                id={`${uid}-custom-name`}
                type="text"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                style={typeAt(15)}
                className="mb-4 h-9 w-full border-0 border-b border-control-edge bg-transparent pb-1 pl-0 pt-1 font-sans text-ink placeholder:text-ink-3 focus:bg-field"
              />
            </div>
            <InputField
              label="Daily consumption"
              value={customKwh}
              onChange={setCustomKwh}
              unit="kWh / day"
              step="0.5"
            />
            <button type="button" onClick={addCustomItem} className={textButton} style={lineItem}>
              Add
            </button>
          </Card>
        </section>

        <section aria-label="Your load profile" className="min-w-0">
          <Card className="px-5 pb-6 pt-4">
            <SectionHead number="03">Your load profile</SectionHead>

            {/* THE PRIMARY READOUT, before a single line item is printed: the
                running total, in Archivo condensed heavy on the display run.
                Its hue is its own magnitude against the catalogue ceiling, and
                the ramp legend beside it states both ends of that domain, so
                the colour is legible as a reading rather than a paint job. */}
            <div className="mt-2.5 flex flex-wrap items-end justify-between gap-x-8 gap-y-2 border-b-2 border-rule-strong pb-2">
              <Readout
                label="Added daily consumption"
                value={fmt(totalAddedKwh)}
                unit="kWh / day"
                step={56}
                stretch="62%"
                weight={800}
                tone={toneForValue(totalAddedKwh, 0, CATALOGUE_CEILING)}
              />
              <RampLegend low="0" high={`${CATALOGUE_CEILING} kWh/day`} className="pb-1.5" />
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

            {/* THE SCHEDULE. Ruled line items, each figure right-aligned in its
                own tabular column with the unit stated once at the column head,
                closed by a filled TOTAL row — the line a bill ends a schedule
                with. Rank is carried by rule weight, fill and type size alone. */}
            <hr className="rule-strong mt-8" />
            <SectionHead number="04" className="mt-2.5">Load schedule</SectionHead>

            <div className={`${SCHEDULE_COLS} mt-3 pb-1`}>
              <span className="eyebrow">Load</span>
              <UnitHead marker={MARK_RATE}>$/mo</UnitHead>
              <UnitHead>kWh/day</UnitHead>
              <span aria-hidden="true" />
            </div>
            <hr className="rule" />

            {items.length === 0 && (
              <p className="border-b border-rule py-4 text-ink-3" style={lineItem}>
                No extra loads added yet.
              </p>
            )}

            {items.map((item) => (
              <div key={item.id} className={`${SCHEDULE_COLS} border-b border-rule py-2`}>
                <span className="flex min-w-0 items-baseline gap-2.5">
                  <ItemIcon item={item} />
                  <span className="truncate text-ink-2" style={lineItem}>{item.name}</span>
                </span>
                <span className="tnum justify-self-end text-ink-2" style={lineItem}>
                  {Math.round(item.kwh * UTILITY_RATE * DAYS_PER_MONTH).toLocaleString()}
                </span>
                <span className="tnum justify-self-end text-ink" style={lineItem}>{fmt(item.kwh)}</span>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  aria-label={`Remove ${item.name}`}
                  className="eyebrow justify-self-end border-b border-transparent bg-transparent px-0 hover:border-rule-strong hover:text-ink-2"
                >
                  Remove
                </button>
              </div>
            ))}

            {/* Inverted, and bleeding the full measure of the sheet. The fill is
                `--ink` on `--field` text: rank carried by contrast, not by
                colour — a TOTAL row is chrome and stays achromatic. */}
            <div className={`${SCHEDULE_COLS} -mx-5 bg-ink px-5 py-2.5 text-field`}>
              <span className="eyebrow text-field">Total added load</span>
              <span className="tnum justify-self-end" style={lineItem}>
                {Math.round(monthlyCost).toLocaleString()}
              </span>
              <span className="tnum justify-self-end font-semibold" style={{ ...typeAt(17), lineHeight: 1.1 }}>
                {fmt(totalAddedKwh)}
              </span>
              <span aria-hidden="true" />
            </div>

            <p className="mt-2 max-w-[62ch] text-ink-3" style={footnote}>
              {items.length} {items.length === 1 ? 'line' : 'lines'} on the schedule. Money is billed at the
              flat rate in the margin<Marker symbol={MARK_RATE} />, and the system increase is the added load
              divided by the production factor<Marker symbol={MARK_SUN} /> there.
            </p>

            <hr className="rule mt-7" />
            <button
              type="button"
              onClick={() => onExport({ items, totalAddedKwh, monthlyCost, annualCost, systemIncrease })}
              className={`${textButton} mt-3 print:hidden`}
              style={lineItem}
            >
              Export to Proposal
            </button>
          </Card>
        </section>
      </div>

      {/* The premises, printed on the page and keyed to the figures above by the
          house marker order. Below 1100px the rail falls beneath the main
          column, which is exactly where the tear reads best: your numbers, then
          our assumptions. */}
      <Rail>
        {/* The tear is the separator, so this block carries no rule of its own —
            a rule above a perforation is the same division printed twice. */}
        <aside className="pt-1">
          <Perforation className="mb-4" label="Assumptions follow" />
          <h3 className="eyebrow mb-2">Assumptions behind these numbers</h3>
          <dl>
            <Sidenote marker={MARK_RATE} term="Utility rate used">
              ${UTILITY_RATE.toFixed(2)} / kWh
            </Sidenote>
            <Sidenote marker={MARK_RATE} term="Billing month">
              {DAYS_PER_MONTH} days
            </Sidenote>
            <Sidenote marker={MARK_SUN} term="Production factor">
              {CV_SUN_HOURS.toFixed(1)} kWh / kW / day
            </Sidenote>
            <Sidenote term="Ramp domain">
              0 – {CATALOGUE_CEILING} kWh / day
            </Sidenote>
          </dl>
          <p className="mt-4 text-ink-3" style={footnote}>
            The rate is flat: no time-of-use split, no seasonal step, no escalation. The annual figure is
            twelve of the monthly one. The production factor is the CA Central Valley annual average, so a
            different region sizes differently. The running total is inked across a domain running from
            nothing added to every load in this catalogue at once.
          </p>
          <p className="mt-3 text-ink-3" style={footnote}>
            This is an estimate, not a quote or guarantee. Actual utility rates, usage and equipment can
            change your results.
          </p>
        </aside>
      </Rail>
    </div>
  );
};

export default ApplianceAuditor;
