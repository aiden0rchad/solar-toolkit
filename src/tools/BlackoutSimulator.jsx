import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Plus } from 'lucide-react';
import { MARKERS } from '../components/markers';
import { Card, Figure, InputField, Marker, Perforation, toneForValue } from '../components/ui';
import { useChartTheme } from '../components/chartTheme';
import Rail from '../components/Rail';
import { usePremises } from '../components/useShell';
import { batteryPresets } from '../data/batteryPresets';

// =============================================================================
// INSTRUMENT — Blackout Simulator.
//
// A split pane read as a faceplate: what you switch on is a ruled schedule of
// line items on the left, pinned; what it costs you in runtime is the live
// figure column on the right. There are no boxes — a sheet is introduced by its
// 2px rule, rows are separated by 1px rules, and every wattage sits in a
// right-aligned tabular column with its unit named once at the head.
//
// THE ONE RULE holds. The only chroma on this sheet is measured: the runtime
// readout, which takes its hue from its own magnitude on the irradiance ramp,
// and the single plotted depletion series in `--d-solar`, which is the battery.
// Everything else — the section numbers, the column heads, the preset index,
// the appliance rows, the checkboxes, the gridlines, the depletion annotation —
// is achromatic. SELECTION IS CHROME: a chosen preset is a 2px `--rule-strong`
// underline and `--ink`, never a tint, and the toggles are native boxes with
// `accent-color: var(--ink)`.
//
// The premises the runtime figure rests on go to the sticky context bar; the
// model's own assumptions go to the marginalia rail, keyed to the figures by
// footnote marker. Neither lives in a tooltip.
// =============================================================================

/** The simulation horizon, and therefore the domain the runtime is inked in. */
const HORIZON_HOURS = 96;

/**
 * One step of the bi-modal scale — size, leading and tracking together. They
 * are a set; taking a size without its leading is how a readout ends up
 * wearing body line-height.
 */
const typeAt = (step) => ({
  fontSize: `var(--size-${step})`,
  lineHeight: `var(--lh-${step})`,
  letterSpacing: `var(--track-${step})`,
});

/**
 * The unit beside a readout: 0.4× the figure it qualifies, in mono, `--ink-3`.
 * `line-height: 1` so it sits on the figure's baseline instead of dragging the
 * display leading down with it.
 */
const unitAt = (step) => ({
  fontSize: `calc(var(--size-${step}) * 0.4)`,
  lineHeight: 1,
});

/** 11px footnote — the voice everything secondary speaks in on this sheet. */
const footnote = typeAt(11);

/** 13px line-item body. */
const lineItem = typeAt(13);

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
 * Micro-label above in mono; the figure in Archivo condensed heavy, tabular;
 * the unit in mono at 0.4× in `--ink-3`, so the quantity is the only thing
 * carrying weight. `step` picks the run: 56 for the one figure the reader came
 * for, 28 for the supporting cluster.
 *
 * `tone` takes the figure's hue from the figure's OWN magnitude — a ramp token
 * class from `toneForValue`, applied to the figure alone. The micro-label, the
 * marker and the unit stay achromatic, because they are chrome; only the number
 * is a measurement. Without a `tone` the figure is `--ink`.
 */
const Readout = ({ label, marker, value, unit, step = 28, stretch = '68%', weight = 700, tone }) => (
  <div className="min-w-0">
    <div className="eyebrow">
      {label}
      <Marker symbol={marker} />
    </div>
    <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5">
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

/** One sidenote in the rail: `term · value`, ruled, keyed by marker. */
const Note = ({ term, symbol, children }) => (
  <div className="flex items-baseline justify-between gap-4 border-b border-rule py-1">
    <dt className="text-ink-2" style={typeAt(12)}>
      {term}
      <Marker symbol={symbol} />
    </dt>
    <dd className="tnum flex-none text-ink" style={typeAt(12)}>
      {children}
    </dd>
  </div>
);

/** The schedule's column grid — head and rows share it so the figures line up. */
const LOAD_GRID = 'grid grid-cols-[0.9rem_minmax(0,1fr)_4rem_3.25rem_1.4rem] items-center gap-x-2.5';

/** A borderless field: one rule underneath, `--field` only under focus. */
const inlineField = 'h-9 border-0 border-b border-control-edge bg-transparent pb-1 pl-0 pt-1 font-sans text-ink placeholder:text-ink-3 focus:bg-field';

/** Selection is chrome, so the box is inked in `--ink` and never in a hue. */
const checkbox = { accentColor: 'var(--ink)' };

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
    for (let h = 1; h <= HORIZON_HOURS; h++) {
      const clock = (18 + h) % 24; // outage starts at 6 PM
      const solarW = solarRecharge && clock >= 7 && clock <= 19
        ? solarOutput * 1000 * 0.75 * Math.sin(Math.PI * (clock - 7) / 12)
        : 0;
      solarWhTotal += solarW;
      soc = Math.min(usableWh, soc + solarW - totalWatts);
      trace.push({ hour: h, remaining: Math.max(0, Math.round((soc / usableWh) * 100)) });
      if (soc <= 0) return { hours: h, trace, avgSolarW: solarWhTotal / h };
    }
    return { hours: null, trace, avgSolarW: solarWhTotal / HORIZON_HOURS };
  }, [batterySize, totalWatts, solarRecharge, solarOutput]);

  const estimatedHours = totalWatts <= 0 ? '∞' : sim.hours === null ? '96+' : String(sim.hours);
  const netDraw = Math.max(0, totalWatts - sim.avgSolarW);
  const depletionData = sim.trace;

  // Series and chrome for the theme actually on screen — resolved at runtime,
  // never a hex in this file.
  const chart = useChartTheme();

  // The runtime is the measured quantity on this sheet, so the hero figure is
  // inked by its own magnitude across the horizon the model actually ran: an
  // outage the battery rides out entirely sits at the warm end, and a load that
  // flattens it in an hour sits at the cool one. A configuration that draws
  // nothing never runs down, so it reads as the whole horizon.
  const runtimeTone = toneForValue(
    totalWatts <= 0 ? HORIZON_HOURS : sim.hours ?? HORIZON_HOURS,
    0,
    HORIZON_HOURS,
  );

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

  // The supporting run, each its own readout block with its own unit — never a
  // row of stat cells. Figures here carry no tone: they are the inputs the
  // runtime is made of, not the reading, and only the reading is inked.
  const readouts = [
    { label: 'Total Load', value: integer(totalWatts), unit: 'W' },
    { label: 'Battery', marker: markerFor('usable'), value: decimal(batterySize), unit: 'kWh' },
    ...(solarRecharge
      ? [{
        label: 'Solar Offset · 24h avg',
        marker: markerFor('window'),
        value: `~${integer(sim.avgSolarW)}`,
        unit: 'W',
      }]
      : []),
    { label: 'Net Draw', value: integer(netDraw), unit: 'W' },
  ];

  return (
    <div>
      <header className="mb-7">
        <p className="eyebrow">Backup · hour by hour</p>
        {/* The masthead carries the page <h1>; every view heads at h2. */}
        <h2 className="mt-1 font-semibold text-ink" style={{ ...typeAt(28), fontStretch: '75%' }}>
          Blackout Simulator
        </h2>
        <p className="mt-1.5 max-w-[52ch] text-ink-2" style={typeAt(15)}>
          Choose what you want to keep running and see how long your battery lasts.
        </p>
      </header>

      {/* SPLIT PANE — what you switch on, left and pinned; what it costs you in
          runtime, right and live. The reader never loses the schedule while
          reading the figure it produced. */}
      <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-[26rem_minmax(0,1fr)]">
        <section
          aria-label="Your inputs"
          className="space-y-8 lg:sticky lg:top-14 lg:max-h-[calc(100vh_-_4.5rem)] lg:self-start lg:overflow-y-auto"
        >
          <Card className="px-5 pb-6 pt-4">
            <SectionHead number="01" className="mb-4">Battery System</SectionHead>

            {/* Presets as a ruled index. The chosen one carries the 2px rule;
                the others carry none — nothing fills, nothing rounds, and
                nothing takes a hue, because selection is chrome. */}
            <div className="mb-5 overflow-x-auto">
              <div className="flex min-w-max items-stretch gap-x-6 border-b border-rule">
                {batteryPresets.map(p => {
                  const selected = preset === p.label;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => { setPreset(p.label); setBatterySize(p.kwh); }}
                      className={`-mb-px flex flex-none items-baseline gap-1.5 border-b-2 bg-transparent px-0 pb-2 pt-1 ${selected ? 'border-rule-strong' : 'border-transparent'}`}
                    >
                      <span className={`eyebrow ${selected ? 'text-ink' : 'text-ink-3'}`}>{p.label}</span>
                      <span className={`tnum ${selected ? 'text-ink' : 'text-ink-3'}`} style={typeAt(11)}>
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

            <label className="flex cursor-pointer items-center justify-between gap-3 border-b border-rule py-2.5">
              <span className="text-ink-2" style={lineItem}>Solar During Outage?</span>
              <input
                type="checkbox"
                checked={solarRecharge}
                onChange={(e) => setSolarRecharge(e.target.checked)}
                style={checkbox}
                className="h-3.5 w-3.5 shrink-0"
              />
            </label>

            {solarRecharge && (
              <div className="mt-4 -mb-4">
                <InputField label="Solar System Size" value={solarOutput} onChange={setSolarOutput} unit="kW" step="0.5" />
              </div>
            )}
          </Card>

          <Card className="px-5 pb-6 pt-4">
            <SectionHead number="02" className="mb-4">Active Appliances</SectionHead>

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
                  <label className={`${LOAD_GRID} cursor-pointer border-b border-rule py-2`}>
                    <input
                      type="checkbox"
                      checked={load.active}
                      onChange={() => toggleLoad(load.id)}
                      style={checkbox}
                      className="h-3.5 w-3.5 shrink-0"
                    />
                    <span className={`truncate ${load.active ? 'text-ink' : 'text-ink-3'}`} style={lineItem}>
                      {load.name}
                    </span>
                    <span className="truncate text-ink-3" style={typeAt(11)}>
                      {load.category}
                    </span>
                    <span
                      className={`tnum text-right ${load.active ? 'text-ink' : 'text-ink-3'}`}
                      style={lineItem}
                    >
                      {load.watts.toLocaleString()}
                    </span>
                    {/* The state is spelled, not tinted: a live row survives
                        greyscale on the word and the ink weight alone. */}
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
                style={lineItem}
                className={`flex-1 ${inlineField}`}
              />
              <input
                type="number"
                placeholder="Watts"
                aria-label="Watts"
                value={customWatts}
                onChange={e => setCustomWatts(e.target.value)}
                style={lineItem}
                className={`tnum w-24 text-right ${inlineField} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
              />
              <button
                type="button"
                onClick={addCustom}
                aria-label="Add appliance"
                className="flex h-9 w-9 shrink-0 items-center justify-center border-b-2 border-rule-strong bg-transparent text-ink-2 hover:text-ink"
              >
                <Plus size={15} aria-hidden="true" />
              </button>
            </div>
          </Card>
        </section>

        <section aria-label="Your estimate" className="min-w-0">
          <Card className="px-5 pb-6 pt-4">
            <SectionHead number="03">Estimated Runtime</SectionHead>

            {/* THE PRIMARY READOUT. Archivo condensed heavy at the top of the
                display run, its unit in mono at 0.4× — the one figure the
                reader came for, and the only figure on the sheet entitled to a
                hue, because the runtime IS the measurement. */}
            <div className="mt-2.5 border-b-2 border-rule-strong pb-1.5">
              <Readout
                label="Runtime"
                value={estimatedHours}
                unit="hrs"
                step={56}
                stretch="62%"
                weight={800}
                tone={runtimeTone}
              />
            </div>

            {/* THE READOUT CLUSTER — ruled, not carded. One 1px rule between
                blocks and one under the group; no boxes, no padding wells. */}
            <div
              className={`grid grid-cols-1 divide-y divide-rule border-b border-rule sm:divide-x sm:divide-y-0 ${
                readouts.length === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'
              }`}
            >
              {readouts.map((readout, i) => (
                <div key={readout.label} className={`py-3 ${i === 0 ? 'sm:pr-4' : 'sm:px-4'}`}>
                  <Readout {...readout} />
                </div>
              ))}
            </div>

            {depletionData.length > 0 && (
              <>
                <hr className="rule-strong mt-8" />
                <SectionHead number="04" className="mt-2.5">Battery Depletion</SectionHead>

                <div className="mt-3.5 h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={depletionData} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
                      {/* Gridlines: horizontal only, solid hairline. A dashed
                          rule in this system means annotation. */}
                      <CartesianGrid {...chart.gridProps} />
                      <XAxis
                        {...chart.xAxisProps}
                        dataKey="hour"
                        type="number"
                        domain={[0, 'dataMax']}
                        allowDecimals={false}
                        tickFormatter={v => `${v}h`}
                      />
                      <YAxis {...chart.yAxisProps} width={44} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                      <Tooltip {...chart.tooltipProps} formatter={v => `${v}%`} labelFormatter={v => `Hour ${v}`} />
                      {/* ONE series, so no legend: the numbered caption below
                          names it. `--d-solar` is the battery, app-wide, and
                          the 2px solid stroke over its wash is the redundant
                          encoding that keeps the plot readable in greyscale. */}
                      <Area {...chart.proposedLine} type="monotone" dataKey="remaining" name="Usable capacity remaining" />
                      {/* The hour the battery empties — a measured threshold,
                          but drawn as ANNOTATION: dashed hairline in --ink-3,
                          achromatic, because the marker is chrome pointing at
                          the reading rather than the reading itself. */}
                      {sim.hours !== null && (
                        <ReferenceLine
                          {...chart.annotationLine}
                          x={sim.hours}
                          label={{ ...chart.annotationLabel, value: `Empty · ${sim.hours} h`, position: 'top' }}
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <Figure number={1} className="mt-2 max-w-[60ch]">
                  Usable capacity remaining on the battery<Marker symbol={markerFor('usable')} />, hour by hour from
                  the start of the outage<Marker symbol={markerFor('start')} /> to the end of the simulation
                  horizon<Marker symbol={markerFor('horizon')} />.
                </Figure>
              </>
            )}

            <hr className="rule mt-7" />
            <button
              type="button"
              onClick={() => onExport({ batterySize, totalWatts, estimatedHours: parseFloat(estimatedHours) || 0, activeLoads: activeLoads.filter(l => l.active), solarRecharge, netDraw })}
              className="eyebrow mt-6 w-full bg-ink px-5 py-3 text-center text-surface hover:bg-ink-2 print:hidden"
            >
              Export to Proposal
            </button>
          </Card>
        </section>
      </div>

      {/* The assumptions are marginalia, in the margin where assumptions live —
          never in a tooltip. Every note is keyed to the figure it governs by
          the marker beside it, so a reader following a symbol up from the sheet
          lands on the premise that produced the number. */}
      <Rail>
        <aside className="rule pt-4">
          <Perforation className="mb-4" label="Assumptions follow" />
          <h3 className="eyebrow mb-2">Assumptions behind these numbers</h3>
          <dl>
            {notes.map((note, i) => (
              <Note key={note.key} term={note.term} symbol={MARKERS[i] ?? MARKERS[MARKERS.length - 1]}>
                {note.value}
              </Note>
            ))}
          </dl>
          <p className="mt-4 text-ink-3" style={footnote}>
            This is an estimate, not a quote or guarantee. Actual utility rates, production, usage, financing, and incentives can change your results.
          </p>
        </aside>
      </Rail>
    </div>
  );
};

export default BlackoutSimulator;
