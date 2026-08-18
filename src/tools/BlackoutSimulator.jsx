import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Plus } from 'lucide-react';
import { MARKERS } from '../components/markers';
import { Card, Figure, InputField, Marker, Perforation } from '../components/ui';
import { useChartTheme } from '../components/chartTheme';
import { Rail } from '../components/Rail';
import { usePremises } from '../components/useShell';
import { batteryPresets } from '../data/batteryPresets';

// =============================================================================
// COUNTERFOIL — Blackout Simulator.
//
// A split pane: what you switch on is set as a ruled schedule of line items on
// the left, what it costs you in runtime is the figure column on the right.
// There are no boxes here — a sheet is introduced by its 2px rule, rows are
// separated by hairlines, and every wattage sits in a right-aligned tabular
// column with its unit named once at the head, the way a bill names it.
//
// The premises the hours figure rests on go to the context bar; the model's own
// assumptions go to the marginalia rail, keyed to the figures by footnote
// marker. Neither lives in a tooltip.
// =============================================================================

/** `01 BATTERY SYSTEM` — the ordinal sits condensed in the margin of its head. */
const SectionHead = ({ n, children }) => (
  <div className="mb-4 flex items-baseline gap-3">
    <span
      className="tnum flex-none text-ink-3"
      style={{ fontSize: 'var(--size-12)', lineHeight: 'var(--lh-12)', letterSpacing: 'var(--track-12)', fontStretch: '75%' }}
    >
      {String(n).padStart(2, '0')}
    </span>
    <h3 className="eyebrow text-ink">{children}</h3>
  </div>
);

/**
 * One ruled line item in the results column. The figure is tabular and
 * right-aligned; the unit follows in Spline Sans Mono at 0.74× in `--ink-3`,
 * set in a fixed-width cell so `W` and `kWh` do not knock the figures out of
 * their column.
 */
const StatRow = ({ label, marker, value, unit }) => (
  <div className="flex items-baseline justify-between gap-4 border-b-[0.5px] border-hair py-1.5">
    <dt
      className="text-ink-2"
      style={{ fontSize: 'var(--size-13)', lineHeight: 'var(--lh-13)', letterSpacing: 'var(--track-13)' }}
    >
      {label}
      <Marker symbol={marker} />
    </dt>
    <dd
      className="tnum flex-none text-ink"
      style={{ fontSize: 'var(--size-13)', lineHeight: 'var(--lh-13)', letterSpacing: 'var(--track-13)' }}
    >
      {value}
      <span
        className="ml-1.5 inline-block w-8 text-left font-mono text-ink-3"
        style={{ fontSize: 'calc(var(--size-13) * 0.74)' }}
      >
        {unit}
      </span>
    </dd>
  </div>
);

/** One sidenote in the rail: `term · value`, ruled, keyed by marker. */
const Note = ({ term, symbol, children }) => (
  <div className="flex items-baseline justify-between gap-4 border-b-[0.5px] border-hair py-1">
    <dt
      className="text-ink-2"
      style={{ fontSize: 'var(--size-12)', lineHeight: 'var(--lh-12)', letterSpacing: 'var(--track-12)' }}
    >
      {term}
      <Marker symbol={symbol} />
    </dt>
    <dd
      className="tnum flex-none text-ink"
      style={{ fontSize: 'var(--size-12)', lineHeight: 'var(--lh-12)', letterSpacing: 'var(--track-12)' }}
    >
      {children}
    </dd>
  </div>
);

/** The schedule's column grid — head and rows share it so the figures line up. */
const LOAD_GRID = 'grid grid-cols-[0.95rem_minmax(0,1fr)_4.5rem_3.5rem_1.5rem] items-center gap-x-3';

const bodyType = { fontSize: 'var(--size-13)', lineHeight: 'var(--lh-13)', letterSpacing: 'var(--track-13)' };

/** A borderless field: one rule underneath, `--field` only under focus. */
const inlineField = 'h-9 border-0 border-b border-rule bg-transparent pb-1 pl-0 pt-1 font-sans text-ink placeholder:text-ink-3 focus:bg-field';

const integer = (n) => (Number.isFinite(n) ? Math.round(n).toLocaleString() : '—');
const decimal = (n) => (Number.isFinite(n) ? String(n) : '—');

// --- TOOL: BLACKOUT SIMULATOR (Enhanced) ---
const BlackoutSimulator = ({ onExport }) => {
  const [batterySize, setBatterySize] = useState(13.5);
  // Read from the data file rather than repeating its first label here: two
  // presets share 13.5 kWh, so the selected one has to be tracked by name, and
  // a typo'd name would silently show the index with nothing selected.
  const [preset, setPreset] = useState(batteryPresets[0].label);
  const [solarRecharge, setSolarRecharge] = useState(false);
  const [solarOutput, setSolarOutput] = useState(5);
  const [activeLoads, setActiveLoads] = useState([
    { id: 1, name: 'Refrigerator', watts: 150, category: 'Essential', active: true },
    { id: 2, name: 'Wi-Fi Router', watts: 15, category: 'Essential', active: true },
    { id: 3, name: 'LED Lights (10)', watts: 100, category: 'Essential', active: true },
    { id: 4, name: 'Phone Charging', watts: 20, category: 'Essential', active: true },
    { id: 5, name: 'TV', watts: 120, category: 'Comfort', active: false },
    { id: 6, name: 'Microwave', watts: 1000, category: 'Comfort', active: false },
    { id: 7, name: 'Central AC', watts: 3500, category: 'Heavy', active: false },
    { id: 8, name: 'Space Heater', watts: 1500, category: 'Heavy', active: false },
    { id: 9, name: 'Sump Pump', watts: 800, category: 'Essential', active: false },
    { id: 10, name: 'Garage Door', watts: 600, category: 'Comfort', active: false },
  ]);
  const [customName, setCustomName] = useState('');
  const [customWatts, setCustomWatts] = useState('');
  const toggleLoad = (id) => setActiveLoads(activeLoads.map(l => l.id === id ? { ...l, active: !l.active } : l));
  const addCustom = () => { if (customName && customWatts > 0) { setActiveLoads([...activeLoads, { id: Date.now(), name: customName, watts: parseInt(customWatts), category: 'Custom', active: true }]); setCustomName(''); setCustomWatts(''); } };
  const totalWatts = activeLoads.filter(l => l.active).reduce((a, c) => a + c.watts, 0);

  // Hourly simulation over 96h starting at full charge (outage begins 6 PM).
  // Solar follows a day arc (7am–7pm, ~75% peak clearness) instead of the old
  // flat 50%-of-nameplate-even-at-midnight shortcut.
  const sim = useMemo(() => {
    const usableWh = batterySize * 1000 * 0.9;
    if (usableWh <= 0 || totalWatts <= 0) return { hours: null, trace: [], avgSolarW: 0 };
    let soc = usableWh;
    const trace = [{ hour: 0, remaining: 100 }];
    let solarWhTotal = 0;
    for (let h = 1; h <= 96; h++) {
      const clock = (18 + h) % 24; // outage starts at 6 PM
      const solarW = solarRecharge && clock >= 7 && clock <= 19
        ? solarOutput * 1000 * 0.75 * Math.sin(Math.PI * (clock - 7) / 12)
        : 0;
      solarWhTotal += solarW;
      soc = Math.min(usableWh, soc + solarW - totalWatts);
      trace.push({ hour: h, remaining: Math.max(0, Math.round((soc / usableWh) * 100)) });
      if (soc <= 0) return { hours: h, trace, avgSolarW: solarWhTotal / h };
    }
    return { hours: null, trace, avgSolarW: solarWhTotal / 96 };
  }, [batterySize, totalWatts, solarRecharge, solarOutput]);

  const estimatedHours = totalWatts <= 0 ? '∞' : sim.hours === null ? '96+' : String(sim.hours);
  const netDraw = Math.max(0, totalWatts - sim.avgSolarW);
  const depletionData = sim.trace;

  const { gridProps, xAxisProps, yAxisProps, tooltipProps, proposedLine } = useChartTheme();

  // --- marginalia ----------------------------------------------------------
  // The model's own premises, printed on the page. Markers run in house order
  // over the notes that actually render, so a note that is absent leaves no
  // hole in the sequence and the keys on the sheet keep matching the rail.
  const notes = [
    { key: 'usable', term: 'Usable capacity', value: '90% of nameplate' },
    { key: 'start', term: 'Outage begins', value: '6:00 PM' },
    { key: 'horizon', term: 'Simulation horizon', value: '96 hours' },
    ...(solarRecharge
      ? [
        { key: 'window', term: 'Solar recharge window', value: '7 AM – 7 PM' },
        { key: 'clearness', term: 'Clearness at solar noon', value: '75% of nameplate' },
      ]
      : []),
  ];
  const markerFor = (key) => MARKERS[notes.findIndex(note => note.key === key)] ?? '';

  usePremises({
    fields: [
      { label: 'Battery', value: decimal(batterySize), unit: 'kWh' },
      { label: 'Total Load', value: integer(totalWatts), unit: 'W' },
    ],
  });

  return (
    <div>
      <header className="mb-9">
        <h2
          className="font-semibold text-ink"
          style={{ fontSize: 'var(--size-28)', lineHeight: 'var(--lh-28)', letterSpacing: 'var(--track-28)' }}
        >
          Blackout Simulator
        </h2>
        <p
          className="mt-2 max-w-[46em] text-ink-2"
          style={{ fontSize: 'var(--size-15)', lineHeight: 'var(--lh-15)', letterSpacing: 'var(--track-15)' }}
        >
          Choose what you want to keep running and see how long your battery lasts.
        </p>
      </header>

      {/* SPLIT PANE — what you switch on, left and sticky; what it costs you in
          runtime, right and live. */}
      <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-7 lg:sticky lg:top-14 lg:self-start">
          <Card>
            <SectionHead n={1}>Battery System</SectionHead>

            {/* Presets as a ruled index. The chosen one carries the 2px rule;
                the others carry none — nothing fills, nothing rounds. */}
            <div className="mb-5 overflow-x-auto">
              <div className="flex min-w-max items-stretch gap-x-6 border-b-[0.5px] border-hair">
              {batteryPresets.map(p => {
                const selected = preset === p.label;
                return (
                  <button
                    key={p.label}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => { setPreset(p.label); setBatterySize(p.kwh); }}
                    className={`-mb-px flex flex-none items-baseline gap-1.5 border-b-2 bg-transparent px-0 pb-2 pt-1 ${selected ? 'border-rule-heavy' : 'border-transparent'}`}
                  >
                    <span className={`eyebrow ${selected ? 'text-ink' : 'text-ink-3'}`}>{p.label}</span>
                    <span
                      className={`tnum ${selected ? 'text-ink' : 'text-ink-3'}`}
                      style={{ fontSize: 'var(--size-11)', lineHeight: 'var(--lh-11)', letterSpacing: 'var(--track-11)' }}
                    >
                      {p.kwh}
                    </span>
                  </button>
                );
              })}
              </div>
            </div>

            <InputField
              label="Battery Capacity"
              value={batterySize}
              onChange={(value) => { setPreset(null); setBatterySize(value); }}
              unit="kWh"
              step="0.5"
            />

            <label className="flex cursor-pointer items-center justify-between gap-3 border-b-[0.5px] border-hair py-2.5">
              <span className="text-ink-2" style={bodyType}>Solar During Outage?</span>
              <input
                type="checkbox"
                checked={solarRecharge}
                onChange={(e) => setSolarRecharge(e.target.checked)}
                className="h-3.5 w-3.5 shrink-0"
              />
            </label>

            {solarRecharge && (
              <div className="mt-4 -mb-4">
                <InputField label="Solar System Size" value={solarOutput} onChange={setSolarOutput} unit="kW" step="0.5" />
              </div>
            )}
          </Card>

          <Card>
            <SectionHead n={2}>Active Appliances</SectionHead>

            {/* Column heads. The unit is named once, at the head of the figure
                column — never repeated down the rows. */}
            <div className={`${LOAD_GRID} border-b border-rule pb-1.5`}>
              <span aria-hidden="true" />
              <span className="eyebrow">Appliance</span>
              <span className="eyebrow">Category</span>
              <span className="eyebrow text-right">Watts</span>
              <span aria-hidden="true" />
            </div>

            <ul className="max-h-[320px] overflow-y-auto">
              {activeLoads.map(load => (
                <li key={load.id}>
                  <label className={`${LOAD_GRID} cursor-pointer border-b-[0.5px] border-hair py-2`}>
                    <input
                      type="checkbox"
                      checked={load.active}
                      onChange={() => toggleLoad(load.id)}
                      className="h-3.5 w-3.5 shrink-0"
                    />
                    <span className={`truncate ${load.active ? 'text-ink' : 'text-ink-3'}`} style={bodyType}>
                      {load.name}
                    </span>
                    <span
                      className="truncate text-ink-3"
                      style={{ fontSize: 'var(--size-11)', lineHeight: 'var(--lh-11)', letterSpacing: 'var(--track-11)' }}
                    >
                      {load.category}
                    </span>
                    <span
                      className={`tnum text-right ${load.active ? 'text-ink' : 'text-ink-3'}`}
                      style={bodyType}
                    >
                      {load.watts.toLocaleString()}
                    </span>
                    <span className="eyebrow text-right">{load.active ? 'ON' : ''}</span>
                  </label>
                </li>
              ))}
            </ul>

            {/* An extra line item, entered on the same ruled form. */}
            <div className="mt-4 flex items-end gap-4">
              <input
                type="text"
                placeholder="Name"
                aria-label="Name"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                style={bodyType}
                className={`flex-1 ${inlineField}`}
              />
              <input
                type="number"
                placeholder="Watts"
                aria-label="Watts"
                value={customWatts}
                onChange={e => setCustomWatts(e.target.value)}
                style={bodyType}
                className={`tnum w-24 text-right ${inlineField} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
              />
              <button
                type="button"
                onClick={addCustom}
                aria-label="Add appliance"
                className="flex h-9 w-9 shrink-0 items-center justify-center border-b-2 border-rule-heavy bg-transparent text-ink-2 hover:text-ink"
              >
                <Plus size={15} aria-hidden="true" />
              </button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-5">
          <Card>
            <SectionHead n={3}>Estimated Runtime</SectionHead>

            {/* THE HERO. Archivo condensed, heavy, at the top of the display
                run — the one figure the reader came for. */}
            <div className="flex items-baseline gap-2.5">
              <span
                className="tnum text-ink"
                style={{
                  fontSize: 'var(--size-56)',
                  lineHeight: 'var(--lh-56)',
                  letterSpacing: 'var(--track-56)',
                  fontWeight: 800,
                  fontStretch: '62%',
                }}
              >
                {estimatedHours}
              </span>
              <span className="font-mono text-ink-3" style={{ fontSize: 'calc(var(--size-56) * 0.74)', lineHeight: 1 }}>
                Hours
              </span>
            </div>

            <dl className="mt-6">
              <StatRow label="Total Load" value={integer(totalWatts)} unit="W" />
              <StatRow label="Battery" marker={markerFor('usable')} value={decimal(batterySize)} unit="kWh" />
              {solarRecharge && (
                <StatRow
                  label="Solar Offset (24h avg)"
                  marker={markerFor('window')}
                  value={`~${integer(sim.avgSolarW)}`}
                  unit="W"
                />
              )}
              <StatRow label="Net Draw" value={integer(netDraw)} unit="W" />
            </dl>

            {depletionData.length > 0 && (
              <div className="mt-8">
                <Figure
                  number={1}
                  caption={<>Battery Depletion<Marker symbol={markerFor('horizon')} /> — usable capacity remaining on the proposed battery, hour by hour</>}
                  className="mb-2"
                />
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={depletionData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="hour" {...xAxisProps} tickFormatter={v => `${v}h`} />
                      <YAxis {...yAxisProps} width={40} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                      <Tooltip {...tooltipProps} formatter={v => `${v}%`} labelFormatter={v => `Hour ${v}`} />
                      {/* One series, so no legend: the caption names it. */}
                      <Area type="monotone" dataKey="remaining" {...proposedLine} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => onExport({ batterySize, totalWatts, estimatedHours: parseFloat(estimatedHours) || 0, activeLoads: activeLoads.filter(l => l.active), solarRecharge, netDraw })}
              className="eyebrow mt-8 w-full bg-ink px-5 py-3 text-center text-surface hover:bg-ink-2 print:hidden"
            >
              Export to Proposal
            </button>
          </Card>
        </div>
      </div>

      <Rail>
        <aside className="hair pt-4">
          <Perforation className="mb-4" label="Assumptions follow" />
          <h3 className="eyebrow mb-2">Assumptions behind these numbers</h3>
          <dl>
            {notes.map((note, i) => (
              <Note key={note.key} term={note.term} symbol={MARKERS[i] ?? MARKERS[MARKERS.length - 1]}>
                {note.value}
              </Note>
            ))}
          </dl>
          <p
            className="mt-4 text-ink-3"
            style={{ fontSize: 'var(--size-11)', lineHeight: 'var(--lh-11)', letterSpacing: 'var(--track-11)' }}
          >
            This is an estimate, not a quote or guarantee. Actual utility rates, production, usage, financing, and incentives can change your results.
          </p>
        </aside>
      </Rail>
    </div>
  );
};

export default BlackoutSimulator;
