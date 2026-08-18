import { useState } from 'react';
import {
  Box, Car, CookingPot, Droplets, Flame, Gamepad2,
  Settings, Shirt, Snowflake, Waves, Wind, Zap,
} from 'lucide-react';
import Rail from '../components/Rail';
import { Card, Marker, Perforation } from '../components/ui';
import { usePremises } from '../components/useShell';
import { presets } from '../data/appliancePresets';
import { annualSunHours } from '../engine/solar';

// =============================================================================
// COUNTERFOIL — Appliance Auditor.
//
// A load schedule, set the way a bill sets one: a ruled catalogue on the left,
// the line items you picked on the right, each figure right-aligned in its own
// column with the unit stated once at the head of that column, and a solid
// TOTAL row closing the schedule. No boxes, no radius, no accent — rank is
// carried by rule weight and type size alone. The assumptions behind the money
// (the rate, the 30-day month, the sun hours) are printed in the marginalia
// rail, keyed by footnote marker, never buried in a tooltip.
// =============================================================================

// src/data/appliancePresets.js still stores emoji strings under `icon`; the UI renders
// lucide components instead. Keyed by preset name so the data file stays untouched.
const PRESET_ICONS = {
  'Tesla Model 3 (Daily Commute)': Car,
  'Pool Pump (Variable Speed)': Waves,
  'Hot Tub': Droplets,
  'Gaming PC (Heavy Usage)': Gamepad2,
  'Central AC (Summer Day)': Snowflake,
  'Electric Dryer (per load)': Shirt,
  'EV Level 2 Charger': Zap,
  'Electric Oven': CookingPot,
  'Space Heater (8hrs)': Flame,
  'Mini-Split AC': Wind,
};

const iconFor = (item) => PRESET_ICONS[item.name] || (item.custom ? Settings : Box);

/** The production factor behind "Required System Increase" — kWh per kW per day. */
const CV_SUN_HOURS = annualSunHours('CA Central Valley');

// --- type ------------------------------------------------------------------
// The functional band, spelled out once so a row and its head cannot drift.

const T13 = { fontSize: 'var(--size-13)', lineHeight: 'var(--lh-13)', letterSpacing: 'var(--track-13)' };
const T11 = { fontSize: 'var(--size-11)', lineHeight: 'var(--lh-11)', letterSpacing: 'var(--track-11)' };
const T15 = { fontSize: 'var(--size-15)', lineHeight: 'var(--lh-15)', letterSpacing: 'var(--track-15)' };
/** Units sit at 0.74× the figure they qualify. */
const UNIT_13 = { fontSize: 'calc(var(--size-13) * 0.74)', lineHeight: 1 };

/**
 * A figure column head: the unit, stated once, in Spline Sans Mono in --ink-3.
 * Rows below it carry bare numerals, so the column reads as one figure stack.
 */
const UnitHead = ({ children, mark }) => (
  <span className="justify-self-end font-mono text-ink-3" style={UNIT_13}>
    {children}
    <Marker symbol={mark} />
  </span>
);

/** A 14px decorative icon standing in for the emoji the data file still stores. */
const ItemIcon = ({ item }) => {
  const Icon = iconFor(item);
  return <Icon size={14} strokeWidth={1.5} aria-hidden="true" className="shrink-0 translate-y-px text-ink-3" />;
};

/**
 * A summary figure that carries its own unit, because this block mixes $/mo,
 * $/yr and kW — a column head can only state a unit once when the column is
 * homogeneous. Currency symbols and units are mono; the numeral is tabular.
 */
const Amount = ({ prefix, value, unit }) => (
  <span className="tnum whitespace-nowrap font-medium text-ink" style={T13}>
    {prefix && <span className="font-mono font-normal text-ink-3" style={UNIT_13}>{prefix}</span>}
    {value}
    {unit && <span className="font-mono font-normal text-ink-3" style={UNIT_13}>{unit}</span>}
  </span>
);

/** A text control: no box, no fill. The rule under it arrives on hover. */
const textButton =
  'border-b border-transparent bg-transparent pb-0.5 text-ink hover:border-rule-heavy';

// --- TOOL: APPLIANCE AUDITOR (Enhanced) ---
const ApplianceAuditor = ({ onExport }) => {
  const [items, setItems] = useState([]);
  const [customName, setCustomName] = useState('');
  const [customKwh, setCustomKwh] = useState('');
  const utilityRate = 0.40;
  const addItem = (preset) => setItems([...items, { ...preset, id: Date.now() + Math.random() }]);
  // `icon` stays on the object: it goes out through onExport into the persisted
  // `solartoolkit-proposal` payload, which the Pro proposal renderer reads. The UI
  // never renders it — iconFor maps to a lucide component via the `custom` flag.
  const addCustomItem = () => { if (customName && customKwh > 0) { setItems([...items, { name: customName, kwh: parseFloat(customKwh), icon: '⚙️', custom: true, id: Date.now() }]); setCustomName(''); setCustomKwh(''); } };
  const removeItem = (id) => setItems(items.filter(i => i.id !== id));
  const totalAddedKwh = items.reduce((acc, curr) => acc + curr.kwh, 0);
  const monthlyCost = totalAddedKwh * 30 * utilityRate;
  const annualCost = monthlyCost * 12;
  const systemIncrease = (totalAddedKwh / CV_SUN_HOURS).toFixed(1);

  // The premises this page's figures stand on, carried in the sticky bar so no
  // figure below is ever read without them.
  usePremises({
    fields: [
      { label: 'Blended rate', value: utilityRate.toFixed(2), unit: '$/kWh' },
      { label: 'Added load', value: String(totalAddedKwh), unit: 'kWh/day' },
      { label: 'System increase', value: systemIncrease, unit: 'kW' },
    ],
  });

  return (
    <div className="max-w-4xl">
      <header>
        <h2
          className="font-semibold text-ink"
          style={{ fontSize: 'var(--size-28)', lineHeight: 'var(--lh-28)', letterSpacing: 'var(--track-28)' }}
        >
          Appliance Consumption Auditor
        </h2>
        <p className="mt-3 max-w-[46em] text-ink-2" style={T15}>
          Add up future loads (EVs, Pools, HVAC) to prevent under-sizing the system.
        </p>
      </header>

      <div className="mt-9 grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-2">
        {/* 01 — the catalogue. Inputs left and sticky, as every calculator here is. */}
        <Card className="px-6 pb-7 pt-5 lg:sticky lg:top-14 lg:self-start">
          <p className="eyebrow">
            <span className="tnum">01</span> Common Additions
          </p>
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_4rem] items-baseline gap-x-4 pb-1">
            <span className="eyebrow">Load</span>
            <UnitHead>kWh/day</UnitHead>
          </div>
          <hr className="rule" />
          {presets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => addItem(preset)}
              className="group grid w-full grid-cols-[minmax(0,1fr)_4rem] items-baseline gap-x-4 border-b-[0.5px] border-hair py-2 text-left"
            >
              <span className="flex min-w-0 items-baseline gap-2.5">
                <ItemIcon item={preset} />
                <span className="truncate text-ink-2 group-hover:underline group-hover:underline-offset-2" style={T13}>
                  {preset.name}
                </span>
              </span>
              <span className="tnum justify-self-end text-ink" style={T13}>+{preset.kwh}</span>
            </button>
          ))}

          <p className="eyebrow mt-7">Custom Appliance</p>
          <hr className="rule mt-1.5" />
          <div className="mt-4 flex items-end gap-5">
            <input
              type="text"
              placeholder="Name"
              aria-label="Name"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              style={T15}
              className="h-8 min-w-0 flex-1 border-0 border-b border-rule bg-transparent pb-1 pl-0 pt-1 text-ink placeholder:text-ink-3 focus:bg-field"
            />
            <input
              type="number"
              placeholder="kWh"
              aria-label="kWh"
              value={customKwh}
              onChange={e => setCustomKwh(e.target.value)}
              style={T15}
              className="tnum h-8 w-20 border-0 border-b border-rule bg-transparent pb-1 pl-0 pt-1 text-right text-ink placeholder:text-ink-3 focus:bg-field [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button type="button" onClick={addCustomItem} aria-label="Add" className={`${textButton} shrink-0`} style={T13}>
              Add
            </button>
          </div>
        </Card>

        {/* 02 — the schedule, live. */}
        <div>
          <Card className="px-6 pb-7 pt-5">
            <p className="eyebrow">
              <span className="tnum">02</span> Your Load Profile
            </p>
            <div className="mt-4 grid grid-cols-[minmax(0,1fr)_3.5rem_3.5rem_4.5rem] items-baseline gap-x-4 pb-1">
              <span className="eyebrow">Load</span>
              <UnitHead mark="*">$/mo</UnitHead>
              <UnitHead>kWh</UnitHead>
              <span aria-hidden="true" />
            </div>
            <hr className="rule" />

            {items.length === 0 && (
              <p className="border-b-[0.5px] border-hair py-4 text-ink-3" style={T13}>
                No extra loads added yet.
              </p>
            )}

            {items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[minmax(0,1fr)_3.5rem_3.5rem_4.5rem] items-baseline gap-x-4 border-b-[0.5px] border-hair py-2"
              >
                <span className="flex min-w-0 items-baseline gap-2.5">
                  <ItemIcon item={item} />
                  <span className="truncate text-ink-2" style={T13}>{item.name}</span>
                </span>
                <span className="tnum justify-self-end text-ink-2" style={T13}>
                  {(item.kwh * utilityRate * 30).toFixed(0)}
                </span>
                <span className="tnum justify-self-end text-ink" style={T13}>{item.kwh}</span>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  aria-label="Remove"
                  className="justify-self-end border-b border-transparent text-ink-3 hover:border-rule hover:text-ink-2"
                  style={T11}
                >
                  Remove
                </button>
              </div>
            ))}

            {/* The TOTAL row: solid fill, inverted text, bleeding the full measure
                of the sheet — the line a bill closes its schedule with. */}
            <div className="-mx-6 mt-0 grid grid-cols-[minmax(0,1fr)_3.5rem_3.5rem_4.5rem] items-baseline gap-x-4 bg-ink px-6 py-2.5 text-paper">
              <span className="eyebrow text-paper">Added Daily Consumption</span>
              <span className="tnum justify-self-end" style={T13}>{monthlyCost.toFixed(0)}</span>
              <span className="tnum justify-self-end font-semibold" style={{ fontSize: 'var(--size-17)', lineHeight: 1.1, letterSpacing: 'var(--track-17)' }}>
                {totalAddedKwh}
              </span>
              <span aria-hidden="true" />
            </div>

            <dl className="mt-7">
              <div className="flex items-baseline justify-between gap-4 border-b-[0.5px] border-hair py-2">
                <dt className="text-ink-2" style={T13}>Est. Monthly Cost Impact<Marker symbol="*" /></dt>
                <dd><Amount prefix="$" value={monthlyCost.toFixed(0)} unit="/mo" /></dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-b-[0.5px] border-hair py-2">
                <dt className="text-ink-2" style={T13}>Est. Annual Cost Impact<Marker symbol="*" /></dt>
                <dd><Amount prefix="$" value={annualCost.toFixed(0)} unit="/yr" /></dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-b-[0.5px] border-hair py-2">
                <dt className="text-ink-2" style={T13}>Required System Increase<Marker symbol="†" /></dt>
                <dd><Amount prefix="~" value={systemIncrease} unit=" kW" /></dd>
              </div>
            </dl>
          </Card>

          <button
            type="button"
            onClick={() => onExport({ items, totalAddedKwh, monthlyCost, annualCost, systemIncrease })}
            className={`${textButton} mt-5 print:hidden`}
            style={T13}
          >
            Export to Proposal
          </button>
        </div>
      </div>

      {/* The assumptions, printed on the page and keyed to the figures above.
          Below 1100px the rail falls beneath the main column, which is exactly
          where the tear reads best: your numbers, then ours. */}
      <Rail>
        <Perforation className="mb-5" />
        <p className="eyebrow">Assumptions</p>
        <hr className="rule mt-1.5" />
        <dl>
          <div className="flex gap-3 border-b-[0.5px] border-hair py-2">
            <dt className="font-mono text-ink-3" style={T11}>*</dt>
            <dd className="pnum text-ink-2" style={T11}>
              Utility rate of $0.40 per kWh, flat, on a 30-day month. The annual figure is twelve of those.
            </dd>
          </div>
          <div className="flex gap-3 border-b-[0.5px] border-hair py-2">
            <dt className="font-mono text-ink-3" style={T11}>†</dt>
            <dd className="pnum text-ink-2" style={T11}>
              Added daily kWh divided by {CV_SUN_HOURS.toFixed(1)} kWh per kW per day, the CA Central Valley annual average.
            </dd>
          </div>
        </dl>
      </Rail>
    </div>
  );
};

export default ApplianceAuditor;
