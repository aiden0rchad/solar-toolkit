import { useId, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Check } from 'lucide-react';
import { Card, ChartTab, Figure, InputField, StruckRow, toneForValue } from '../components/ui';
import Rail from '../components/Rail';
import { usePremises } from '../components/useShell';
import { barChartProps, currencyTick, currencyValue, useChartTheme } from '../components/chartTheme';
import { evDatabase } from '../data/evDatabase';
import { computeEvStats, evLoanPayment } from '../engine/ev';

// =============================================================================
// INSTRUMENT — EV vs. gas.
//
// The largest sheet in the toolkit, and the one that most wanted to be a wall
// of cards. It is a document instead: a ruled filter row, a real table of
// vehicles, then your numbers on the left — sticky — and the figures on the
// right. No boxes, no radius, no fills except the one that marks the selected
// row; rank is carried by rule weight, size and weight alone — Public Sans has
// no width axis, so nothing here is condensed — exactly as it is on a bill.
//
// THE ONE RULE holds: the only chroma on this sheet is measured. The plotted
// series (`--d-solar` for the EV, `--d-grid` for the gas car), the savings
// delta (`--d-good` / `--d-bad`), the live-state word in the masthead, and the
// readout figures that step the irradiance ramp against a stated domain. A
// vehicle's CATEGORY is not a series and carries no hue — it is a micro-label,
// which is why the per-category colour map is gone. The four TCO buckets are
// cost categories, not entities, so they are neutral ink steps and keep their
// legend, which is the only thing naming them.
//
// The math is untouched: every figure on this page comes out of engine/ev.js.
// =============================================================================

/** The bi-modal scale, as inline style objects. Never an even step. */
const type = (size) => ({
  fontSize: `var(--size-${size})`,
  lineHeight: `var(--lh-${size})`,
  letterSpacing: `var(--track-${size})`,
});
const T11 = type(11);
const T12 = type(12);
const T13 = type(13);
const T15 = type(15);
const T20 = type(20);
const T26 = type(26);

/**
 * The unit beside a readout figure: 0.4× the figure it qualifies, in Roboto Mono
 * and `--ink-3`. `line-height: 1` so it sits on the figure's baseline
 * rather than dragging the display leading down with it.
 *
 * FLOORED AT 10px. This sheet is the only one whose supporting cluster reports
 * at 20 rather than 26, and 0.4× of 20 is 8px — below the 10–11px the mono
 * micro-labels are set at everywhere else in the system, and small enough that
 * `mi/kWh` closes up. The ratio still governs the display end (34 -> 13.6,
 * 46 -> 18.4); the floor only catches the bottom of the run, which the scale
 * stepping down a notch pushed under it.
 */
const unitAt = (size) => ({
  fontSize: `max(10px, calc(var(--size-${size}) * 0.4))`,
  lineHeight: 1,
});

/**
 * An INLINE unit — at the head of a column of like figures, or once beside a
 * lone figure in running text. Never repeated down a column. Distinct from the
 * readout unit above: this one rides at 0.74× because it sits inside a line of
 * type rather than beside a display figure.
 */
const Unit = ({ children, of = 13 }) => (
  <span
    className="ml-1 font-mono font-normal normal-case text-ink-3"
    style={{ fontSize: `calc(var(--size-${of}) * 0.74)`, letterSpacing: 'normal' }}
  >
    {children}
  </span>
);

/**
 * A numbered section. The ordinal is set in MONO so it reads as an index key
 * rather than a quantity, and never enters the tabular figure column. The 1px
 * rule under the head is the section's only edge — the 2px above it is the
 * sheet's own top rule, and there is no border around anything on this page.
 */
const Section = ({ n, title, aside, className = '', children }) => (
  <section className={className}>
    <div className="flex items-baseline gap-2.5">
      <span className="font-mono text-ink-3" style={T11}>{n}</span>
      <h3 className="font-semibold text-ink" style={T15}>{title}</h3>
      {aside && <span className="eyebrow ml-auto flex-none">{aside}</span>}
    </div>
    <hr className="rule mt-1.5" />
    {children}
  </section>
);

/**
 * A sub-head inside a section: a micro-label over a 0.5px hairline. The rule
 * ladder on a sheet is 2px (its edge) / 1px (a section) / 0.5px (a block), and
 * nothing else separates anything.
 */
const BlockHead = ({ title, className = '' }) => (
  <div className={className}>
    <h4 className="eyebrow">{title}</h4>
    <hr className="hair mt-1.5" />
  </div>
);

/**
 * One ruled line item: label left, figure right in a tabular column. `total`
 * promotes it to the summed row — 1px rule above, the figure up a step in the
 * scale and a weight heavier — the way the bottom of a bill column is set.
 * Nothing narrows: the step and the weight are the whole promotion now.
 *
 * `tone` inks the TOTAL alone, from a domain the caller states; the label and
 * the unit stay achromatic, because they are chrome.
 */
const LineRow = ({ label, value, unit, total = false, tone = 'text-ink' }) => (
  <div
    className={`flex items-baseline justify-between gap-4 ${total ? 'mt-1 border-t border-rule pt-2' : 'border-b-[0.5px] border-rule py-1.5'
      }`}
  >
    <span className={total ? 'font-medium text-ink' : 'text-ink-2'} style={T13}>{label}</span>
    <span
      className={`tnum flex items-baseline gap-1 ${total ? `font-semibold ${tone}` : 'font-medium text-ink'}`}
      style={total ? T20 : T13}
    >
      {value}
      {unit && (
        <span className="font-mono font-normal text-ink-3" style={unitAt(total ? 20 : 13)}>
          {unit}
        </span>
      )}
    </span>
  </div>
);

/**
 * A READOUT BLOCK — the unit this instrument reports in, and the same block
 * Simple Solar ROI and the front page report in.
 *
 * Micro-label above in mono; the figure in Public Sans bold, tabular;
 * the currency mark and the unit in mono at 0.4× in `--ink-3`, so the quantity
 * is the only thing carrying weight. `size` picks the run: 34 for the one
 * figure the reader came for, 20 for the supporting cluster — both a notch
 * below what they were, because Public Sans sets at full width where Archivo
 * was squeezed to 62–68% and the old sizes would now overrun the split pane.
 *
 * The figure sits at 700, not the 800 it wore condensed: a narrowed face needs
 * more weight to hold the same colour on the page, and asking Public Sans for
 * that at full width gives a figure that shouts over its own micro-label.
 *
 * `tone` takes the figure's hue from the figure's own magnitude — a ramp token
 * class from `toneForValue`, applied to the FIGURE alone. Without a `tone` the
 * figure is `--ink`, which is what a readout with no domain to sit in should
 * be: several figures on this sheet (a compound cost-per-mile, a break-even
 * date) have no domain that was measured, so they stay achromatic.
 */
const Readout = ({ label, prefix, value, unit, size = 20, weight = 700, tone, note, className = '' }) => (
  <div className={`min-w-0 ${className}`}>
    <p className="eyebrow">{label}</p>
    <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5">
      {prefix && <span className="font-mono text-ink-3" style={unitAt(size)}>{prefix}</span>}
      <span
        className={`tnum ${tone ?? 'text-ink'}`}
        style={{ ...type(size), fontWeight: weight }}
      >
        {value}
      </span>
      {unit && <span className="font-mono text-ink-3" style={unitAt(size)}>{unit}</span>}
    </p>
    {note && <p className="mt-1 text-ink-3" style={T11}>{note}</p>}
  </div>
);

/** A ruled premise in the margin: micro-label left, figure right. */
const Premise = ({ label, value, unit }) => (
  <div className="flex items-baseline justify-between gap-3 border-b-[0.5px] border-rule py-1.5">
    <span className="eyebrow">{label}</span>
    <span className="tnum flex-none text-ink" style={T13}>
      {value}
      {unit && <Unit of={13}>{unit}</Unit>}
    </span>
  </div>
);

// --- the vehicle table -------------------------------------------------------
// A real table: `border-collapse: collapse`, a 0.5px header rule at full ink,
// 0.3px row rules, asymmetric cell padding (optical centring is not geometric
// centring) and a row height locked to 28px with the type fitted inside it.
// The outer cells lose their side padding so the table's edges line up with the
// text column around it.

const CELL = 'px-[0.5em] pt-[0.125em] pb-[0.25em] first:pl-0 last:pr-0';
const HEAD_CELL = `${CELL} eyebrow whitespace-nowrap border-b-[0.5px] border-ink align-bottom`;
const BODY_CELL = `${CELL} whitespace-nowrap border-b-[0.3px] border-rule align-middle`;

/** Borderless control: one 1px rule under it, `--field` only under focus. */
const CONTROL = 'h-8 w-full border-0 border-b border-control-edge bg-transparent px-0 text-ink focus:bg-field';

// A filter select and its column head. Native chrome, no box, no radius.
const FilterSelect = ({ id, label, value, onChange, children }) => (
  <div className="min-w-0">
    <label htmlFor={id} className="eyebrow mb-1 block">{label}</label>
    <select id={id} value={value} onChange={onChange} className={CONTROL} style={T13}>
      {children}
    </select>
  </div>
);

/** A named group of mutually exclusive choices, set as a ruled index. */
const ChoiceGroup = ({ id, label, className = '', children }) => (
  <div className={className}>
    <span id={id} className="eyebrow mb-1 block">{label}</span>
    <div role="group" aria-labelledby={id} className="flex flex-wrap gap-x-5 border-b-[0.5px] border-rule">
      {children}
    </div>
  </div>
);

const gasCarPresets = [{ label: 'Truck/SUV', mpg: 18 }, { label: 'Sedan', mpg: 28 }, { label: 'Hybrid', mpg: 50 }];

const chargeSources = [
  { l: 'Home Solar', r: 0.07 },
  { l: 'Off-Peak Grid', r: 0.31 },
  { l: 'Standard Grid', r: 0.40 },
];

/**
 * The fleet's own range for a spec, so a selected vehicle's readout is inked
 * against every other vehicle in the database rather than against nothing. The
 * database is static, so these are constants and are computed once at module
 * scope rather than per render.
 */
const fleetDomain = (key) => {
  const values = evDatabase.map(ev => Number(ev[key])).filter(Number.isFinite);
  return [Math.min(...values), Math.max(...values)];
};
const RANGE_DOMAIN = fleetDomain('range');
const BATTERY_DOMAIN = fleetDomain('battery');
const EFF_DOMAIN = fleetDomain('eff');

const money = (n) => (Number.isFinite(n) ? `$${Math.round(n).toLocaleString()}` : '—');
/**
 * A figure the reader typed, printed back at the precision the field accepts.
 * `money()` rounds, which is right for a derived total and wrong for a line item
 * that has to reconcile with the box it came from: 62.5 in, "$63" out.
 */
const money2 = (n) => (
  Number.isFinite(n) ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'
);
const count = (n) => (Number.isFinite(n) ? Math.round(n).toLocaleString() : '—');

/** `rgb(13, 37, 39)` — the shape `getComputedStyle` hands back for a colour. */
const parseRgb = (value) => {
  const match = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(value || '');
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
};

/**
 * One ink, thinned toward the ground it sits on. Both arguments arrive already
 * resolved by the runtime token reader, so this never sees — and never
 * invents — a literal colour: it only mixes two the stylesheet chose.
 */
const dilute = (ink, ground, amount) => {
  const a = parseRgb(ink);
  const b = parseRgb(ground);
  if (!a || !b) return ink;
  const [r, g, bl] = a.map((channel, i) => Math.round(channel * amount + b[i] * (1 - amount)));
  return `rgb(${r}, ${g}, ${bl})`;
};

// --- TOOL: EV CALCULATOR (Expanded) ---
const EVCalculator = ({ onExport }) => {
  // Ids so each caption is programmatically tied to the control (or button group)
  // it names, rather than floating above it as an orphan <label>.
  const uid = useId();
  // Series and chrome for the theme actually on screen — resolved at runtime,
  // never a hex in this file.
  const chart = useChartTheme();
  const makes = [...new Set(evDatabase.map(ev => ev.make))].sort();
  const years = [...new Set(evDatabase.map(ev => ev.year))].sort((a, b) => b - a);
  const categories = [...new Set(evDatabase.map(ev => ev.category))].sort();

  const [filterMake, setFilterMake] = useState('All');
  const [filterYear, setFilterYear] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [compareList, setCompareList] = useState([]);

  const filteredEVs = useMemo(() => {
    return evDatabase.filter(ev => {
      if (filterMake !== 'All' && ev.make !== filterMake) return false;
      if (filterYear !== 'All' && ev.year !== parseInt(filterYear)) return false;
      if (filterCategory !== 'All' && ev.category !== filterCategory) return false;
      if (searchQuery && !(`${ev.name} ${ev.trim} ${ev.year}`).toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [filterMake, filterYear, filterCategory, searchQuery]);

  const [selectedEV, setSelectedEV] = useState(evDatabase[0]);
  const [annualMiles, setAnnualMiles] = useState(12000);
  const [gasPrice, setGasPrice] = useState(4.80);
  const [iceMPG, setIceMPG] = useState(25);
  const [elecRate, setElecRate] = useState(0.35);
  const iceMaintCost = 800;
  const evMaintCost = 300;

  // Financing & Insurance
  const [currentCarStatus, setCurrentCarStatus] = useState('paidoff'); // paidoff | loan
  const [currentCarPayment, setCurrentCarPayment] = useState(450);
  const [currentCarMonthsLeft, setCurrentCarMonthsLeft] = useState(36);
  const [currentInsurance, setCurrentInsurance] = useState(150);

  const [evPurchaseMethod, setEvPurchaseMethod] = useState('finance'); // finance | lease | cash
  const [evPrice, setEvPrice] = useState(42000);
  const [evDownPayment, setEvDownPayment] = useState(5000);
  const [evLoanTerm, setEvLoanTerm] = useState(72);
  const [evInterestRate, setEvInterestRate] = useState(6.5);
  const [evLeasePayment, setEvLeasePayment] = useState(450);
  const [evLeaseTerm, setEvLeaseTerm] = useState(36);
  const [evLeaseDueAtSigning, setEvLeaseDueAtSigning] = useState(3000);
  const [evInsurance, setEvInsurance] = useState(190);
  const [ownYears, setOwnYears] = useState(5);
  const [evRegFee, setEvRegFee] = useState(118); // CA Road Improvement Fee for ZEVs
  const [tradeInValue, setTradeInValue] = useState(0);
  const [resalePct, setResalePct] = useState(45); // % of purchase price retained at end

  const evMonthlyFinance = evLoanPayment(evPrice - evDownPayment, evInterestRate, evLoanTerm);

  const toggleCompare = (ev) => {
    setCompareList(prev => {
      const exists = prev.find(e => e.id === ev.id);
      if (exists) return prev.filter(e => e.id !== ev.id);
      if (prev.length >= 3) return prev;
      return [...prev, ev];
    });
  };

  // All math lives in engine/ev.js — one source of truth for totals, the
  // break-even series, and the stacked-bar buckets alike.
  const getStats = (ev, yrs = ownYears) => computeEvStats({
    ev, years: yrs, annualMiles, gasPrice, iceMPG, elecRate, iceMaintCost, evMaintCost,
    currentCarStatus, currentCarPayment, currentCarMonthsLeft, currentInsurance,
    evPurchaseMethod, evPrice, evDownPayment, evLoanTerm, evInterestRate,
    evLeasePayment, evLeaseTerm, evLeaseDueAtSigning, evInsurance, evRegFee,
    tradeInValue, resalePct,
  });

  const stats = useMemo(() => {
    const s = getStats(selectedEV);
    const mo = ownYears * 12;
    return {
      ...s, chartData: [
        { name: 'Current Car', fuel: s.gasCostYear * ownYears, maintenance: iceMaintCost * ownYears, payment: s.totalCurrentLoan, insurance: currentInsurance * mo },
        { name: selectedEV.name, fuel: s.elecCostYear * ownYears, maintenance: (evMaintCost + evRegFee) * ownYears, payment: Math.max(0, s.totalEvPayments - tradeInValue - s.resaleCredit), insurance: evInsurance * mo },
      ]
    };
  }, [selectedEV, annualMiles, gasPrice, iceMPG, elecRate, iceMaintCost, evMaintCost, currentCarStatus, currentCarPayment, currentCarMonthsLeft, currentInsurance, evPurchaseMethod, evPrice, evDownPayment, evLoanTerm, evInterestRate, evLeasePayment, evLeaseTerm, evLeaseDueAtSigning, evInsurance, evMonthlyFinance, ownYears, evRegFee, tradeInValue, resalePct]);
  const isSaving = stats.totalSavings >= 0;

  // The premises the figures below stand on, published to the sticky context
  // bar so no total on this sheet is ever orphaned from what produced it.
  usePremises({
    fields: [
      { label: 'Selected Vehicle', value: selectedEV.name },
      { label: 'Annual Mileage', value: count(annualMiles), unit: 'mi/yr' },
      { label: 'EV Charging Rate', value: Number.isFinite(elecRate) ? elecRate.toFixed(2) : '—', unit: '$/kWh' },
      { label: 'Ownership period', value: String(ownYears), unit: 'yrs' },
    ],
  });

  // THE DOMAINS THE READOUTS ARE INKED AGAINST, stated once here rather than
  // improvised at each figure — so the same number is never two colours in two
  // places on the same sheet.
  //
  // Both pairs share ONE domain running 0 -> the larger of the two, which is
  // the convention Simple Solar ROI's bill pair uses: a warm figure means MORE
  // of the quantity, so the expensive side of each pair is the bright one and
  // the drop between them reads as a step down the ramp. The spec figures run
  // against the whole fleet, so "long range" means long for an EV rather than
  // long for this one.
  const fuelScale = Math.max(stats.gasCostYear, stats.elecCostYear, 1);
  const monthlyScale = Math.max(stats.currentMonthlyTotal, stats.evMonthlyTotal, 1);

  const specTiles = [
    { label: 'Range', value: count(selectedEV.range), unit: 'mi', tone: toneForValue(selectedEV.range, ...RANGE_DOMAIN) },
    { label: 'Battery', value: count(selectedEV.battery), unit: 'kWh', tone: toneForValue(selectedEV.battery, ...BATTERY_DOMAIN) },
    { label: 'Efficiency', value: selectedEV.eff, unit: 'mi/kWh', tone: toneForValue(selectedEV.eff, ...EFF_DOMAIN) },
    { label: 'Annual fuel', prefix: '$', value: count(stats.elecCostYear), tone: toneForValue(stats.elecCostYear, 0, fuelScale) },
  ];

  // The four TCO buckets are cost CATEGORIES, not entities, so they get no
  // series hue: one ink diluted toward the sheet in four even steps, which is a
  // grey ramp in both themes and survives a photocopier by construction. The
  // legend stays, because its swatches name buckets rather than entities — it
  // is the only thing telling the reader which step is which.
  //
  // Four *different* neutral tokens cannot do this job: --ink-2 and --ink-3 sit
  // a hair apart, and --rule vanishes against the sheet. Diluting one ink gives
  // genuinely even steps and a real fill per bucket, which the legend needs —
  // it paints its swatch from `fill` and ignores `fillOpacity`.
  const tcoFills = {
    payment: dilute(chart.tokens.ink, chart.tokens.surface, 0.34),
    fuel: dilute(chart.tokens.ink, chart.tokens.surface, 0.56),
    insurance: dilute(chart.tokens.ink, chart.tokens.surface, 0.78),
    maintenance: chart.tokens.ink,
  };

  const compareColumns = compareList.map(ev => ({ ev, stats: getStats(ev) }));
  const compareRows = [
    { label: 'Range', unit: 'mi', cell: ({ ev }) => ev.range },
    { label: 'Battery', unit: 'kWh', cell: ({ ev }) => ev.battery },
    { label: 'Efficiency', unit: 'mi/kWh', cell: ({ ev }) => ev.eff },
    { label: 'Annual Fuel', unit: '$/yr', cell: ({ stats: s }) => count(s.elecCostYear) },
  ];

  // Every compared vehicle costs more than keeping the gas car — the summary
  // row is then a cost row, and says so, rather than printing negative savings.
  const compareAllCost = compareColumns.length > 0 && compareColumns.every(c => c.stats.totalSavings < 0);

  const tableColumns = 7;

  return (
    <div className="min-w-0">
      {/* MASTHEAD LINE — the instrument's live state and what it is pointed at.
          Only the state word is chromatic: `--d-good` means live/OK, so it is a
          live-state indicator and earns its hue. The vehicle beside it is a
          premise label, chrome, and stays in `--ink-3`. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="eyebrow">
          <span className="text-d-good">Modelling</span>{` · ${selectedEV.name} · ${selectedEV.year}`}
        </p>
        <p className="eyebrow">{`${evDatabase.length} models · ${makes.length} makes`}</p>
      </div>

      <header className="mt-2">
        <h2 className="font-semibold text-ink" style={T26}>EV vs. Gas Calculator</h2>
        <p className="mt-2 max-w-[52em] text-ink-2" style={T15}>
          See whether an EV would cost you less each month and over five years. Compare {evDatabase.length} models from {makes.length} manufacturers.
        </p>
      </header>

      {/* 01 — THE INDEX OF VEHICLES ------------------------------------------
          Filters as one ruled row of borderless fields, then the table itself.
          Nothing here is a control panel; it is the head of a list. */}
      <Card className="mt-7 px-5 pb-6 pt-4">
        <Section n="01" title="Vehicles" aside={`${filteredEVs.length} shown`}>
          <div className="mt-4 grid grid-cols-2 items-end gap-x-6 gap-y-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
            <div className="col-span-2 min-w-0 lg:col-span-1">
              <label htmlFor={`${uid}-search`} className="eyebrow mb-1 block">Search</label>
              <input
                id={`${uid}-search`}
                type="text"
                placeholder="Search vehicles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${CONTROL} placeholder:text-ink-3`}
                style={T13}
              />
            </div>
            <FilterSelect id={`${uid}-make`} label="Make" value={filterMake} onChange={(e) => setFilterMake(e.target.value)}>
              <option value="All">All Makes</option>
              {makes.map(m => <option key={m} value={m}>{m}</option>)}
            </FilterSelect>
            <FilterSelect id={`${uid}-year`} label="Year" value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
              <option value="All">All Years</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </FilterSelect>
            <FilterSelect id={`${uid}-type`} label="Type" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="All">All Types</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </FilterSelect>
            <div className="border-b-[0.5px] border-rule">
              <ChartTab
                active={compareMode}
                onClick={() => { setCompareMode(!compareMode); if (compareMode) setCompareList([]); }}
                label={compareMode ? `Compare (${compareList.length}/3)` : 'Compare'}
              />
            </div>
          </div>

          <div className="mt-5 max-h-[26rem] overflow-auto">
            <table
              role="grid"
              aria-label="Vehicles"
              aria-multiselectable={compareMode || undefined}
              className="w-full border-collapse text-left"
            >
              <thead>
                <tr>
                  {/* The mark column is always there, in both modes: it is the
                      column the selected row is identified IN. */}
                  <th scope="col" className={HEAD_CELL}>
                    <span className="sr-only">{compareMode ? 'Compare' : 'Selected'}</span>
                  </th>
                  <th scope="col" className={HEAD_CELL}>Vehicle</th>
                  <th scope="col" className={HEAD_CELL}>Trim</th>
                  <th scope="col" className={HEAD_CELL}>Type</th>
                  <th scope="col" className={`${HEAD_CELL} text-right`}>Year</th>
                  {/* The unit sits once, at the head of the column it governs —
                      never repeated down 227 rows. */}
                  <th scope="col" className={`${HEAD_CELL} text-right`}>Range<Unit of={13}>mi</Unit></th>
                  <th scope="col" className={`${HEAD_CELL} text-right`}>Efficiency<Unit of={13}>mi/kWh</Unit></th>
                </tr>
              </thead>
              <tbody>
                {filteredEVs.map(ev => {
                  const isSelected = selectedEV.id === ev.id;
                  const inCompare = !!compareList.find(e => e.id === ev.id);
                  const highlighted = compareMode ? inCompare : isSelected;
                  const choose = () => { if (compareMode) toggleCompare(ev); else setSelectedEV(ev); };
                  return (
                    <tr
                      key={ev.id}
                      tabIndex={0}
                      aria-selected={highlighted}
                      onClick={choose}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); }
                      }}
                      /* Selection is CHROME, so it is achromatic — but it is
                         still a component state, and `--raised` on `--surface`
                         measures 1.28:1 light and 1.11:1 dark. That wash was
                         the ONLY signal in single-select mode, i.e. effectively
                         no signal at all in dark, on the same sheet where every
                         other selection in the app (Choice, ChartTab,
                         SegmentedField) moves rule weight and ink together.
                         So the wash is kept as the soft half and the reading is
                         carried by the mark column and the row's own weight:
                         the tick is `--ink` at 18.5:1 light / 11.9:1 dark, and
                         the vehicle name steps from medium to semibold. Three
                         channels, none of them hue, one of them well past 3:1. */
                      className={`h-7 cursor-pointer ${highlighted ? 'bg-raised' : 'hover:bg-field'}`}
                    >
                      <td className={`${BODY_CELL} w-4`}>
                        {compareMode
                          ? (
                            <span
                              aria-hidden="true"
                              className={`flex h-3 w-3 items-center justify-center border ${inCompare ? 'border-ink bg-ink text-surface' : 'border-control-edge'
                                }`}
                            >
                              {inCompare && <Check size={9} strokeWidth={3.5} />}
                            </span>
                          )
                          : (
                            // Opacity-driven, never conditionally rendered, so
                            // moving the selection cannot shift the column.
                            <Check
                              size={11}
                              strokeWidth={3}
                              aria-hidden="true"
                              className="text-ink"
                              style={{ opacity: isSelected ? 1 : 0 }}
                            />
                          )}
                      </td>
                      <th
                        scope="row"
                        className={`${BODY_CELL} text-ink ${highlighted ? 'font-semibold' : 'font-medium'}`}
                        style={T13}
                      >
                        {ev.name}
                      </th>
                      <td className={`${BODY_CELL} text-ink-2`} style={T12}>{ev.trim}</td>
                      {/* Category was a colour chip. It is a label now — the
                          category of a car is not a series and never earned a hue. */}
                      <td className={`${BODY_CELL} eyebrow`}>{ev.category}</td>
                      <td className={`${BODY_CELL} tnum text-right text-ink-2`} style={T12}>{ev.year}</td>
                      <td className={`${BODY_CELL} tnum text-right text-ink`} style={T13}>{ev.range}</td>
                      <td className={`${BODY_CELL} tnum text-right text-ink`} style={T13}>{ev.eff}</td>
                    </tr>
                  );
                })}
                {filteredEVs.length === 0 && (
                  <tr>
                    <td colSpan={tableColumns} className="py-6 text-center text-ink-3" style={T13}>
                      No vehicles match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Side-by-side: transposed, so like figures run across one ruled row
              and the reader compares along a line rather than between boxes. */}
          {compareMode && compareColumns.length >= 2 && (
            <div className="mt-8">
              <BlockHead title="Side-by-Side Comparison" />
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr>
                      <th scope="col" className={HEAD_CELL}>Specification</th>
                      {compareColumns.map(({ ev }) => (
                        <th key={ev.id} scope="col" className={`${HEAD_CELL} text-right`}>
                          {ev.name}
                          <span className="mt-0.5 block font-normal normal-case tracking-normal text-ink-3" style={T11}>
                            {ev.year} {ev.trim}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {compareRows.map(row => (
                      <tr key={row.label} className="h-7">
                        <th scope="row" className={`${BODY_CELL} font-normal text-ink-2`} style={T13}>
                          {row.label}<Unit of={13}>{row.unit}</Unit>
                        </th>
                        {compareColumns.map(column => (
                          <td key={column.ev.id} className={`${BODY_CELL} tnum text-right text-ink`} style={T13}>
                            {row.cell(column)}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {/* The row head switches word with the sign, the way the
                        per-vehicle figure did before the table was transposed:
                        one head now serves every column, so it reads "Cost" only
                        when every column is one. A column that disagrees with the
                        head keeps its sign in front of the figure.

                        A saving is a signed DELTA, so it carries `--d-good` /
                        `--d-bad` — and it prints its sign as well, because hue
                        is never the only encoding. */}
                    <tr className="h-7">
                      <th scope="row" className={`${BODY_CELL} font-medium text-ink`} style={T13}>
                        {ownYears}-Year {compareAllCost ? 'Cost' : 'Savings'}<Unit of={13}>$</Unit>
                      </th>
                      {compareColumns.map(({ ev, stats: s }) => (
                        <td
                          key={ev.id}
                          className={`${BODY_CELL} tnum text-right font-semibold ${s.totalSavings >= 0 ? 'text-d-good' : 'text-d-bad'}`}
                          style={T13}
                        >
                          {compareAllCost || s.totalSavings >= 0 ? '' : '-'}{count(Math.abs(s.totalSavings))}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Section>
      </Card>

      {/* THE SPLIT PANE — your numbers left and pinned, the figures right and
          live, so a total is never read without the premises that produced it. */}
      <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-12">

        {/* --- inputs ------------------------------------------------------- */}
        <div className="lg:sticky lg:top-14 lg:col-span-5 lg:max-h-[calc(100vh_-_4.5rem)] lg:self-start lg:overflow-y-auto">
          <Card className="px-5 pb-6 pt-4">
            <Section n="02" title="Driving & Costs">
              <ChoiceGroup id={`${uid}-mpg`} label="Current Car MPG" className="mt-4 mb-5">
                {gasCarPresets.map(preset => (
                  <ChartTab
                    key={preset.label}
                    active={iceMPG === preset.mpg}
                    onClick={() => setIceMPG(preset.mpg)}
                    label={`${preset.label} (${preset.mpg})`}
                  />
                ))}
              </ChoiceGroup>
              <InputField label="Annual Mileage" value={annualMiles} onChange={setAnnualMiles} unit="mi/yr" step="500" />
              <InputField label="Gas Price" value={gasPrice} onChange={setGasPrice} unit="$/gal" />
              <ChoiceGroup id={`${uid}-charge`} label="Where does the charge come from?" className="mb-5">
                {chargeSources.map(o => (
                  <ChartTab
                    key={o.l}
                    active={Math.abs(elecRate - o.r) < 0.001}
                    onClick={() => setElecRate(o.r)}
                    label={o.l}
                  />
                ))}
              </ChoiceGroup>
              <InputField label="EV Charging Rate" value={elecRate} onChange={setElecRate} unit="$/kWh" step="0.01" tooltip="Home Solar ≈ your levelized cost of self-generated power (~7¢). Vehicle efficiencies are EPA wall-to-wheels, so charging losses are already counted." />
            </Section>

            <Section n="03" title="Financing & Insurance" className="mt-10">
              <ChoiceGroup id={`${uid}-current-vehicle`} label="Current Vehicle" className="mt-4 mb-5">
                {[{ v: 'paidoff', l: 'Paid Off' }, { v: 'loan', l: 'Has Loan' }].map(o => (
                  <ChartTab key={o.v} active={currentCarStatus === o.v} onClick={() => setCurrentCarStatus(o.v)} label={o.l} />
                ))}
              </ChoiceGroup>
              {currentCarStatus === 'loan' && (<>
                <InputField label="Monthly Car Payment" value={currentCarPayment} onChange={setCurrentCarPayment} unit="$/mo" step="10" />
                <InputField label="Months Remaining" value={currentCarMonthsLeft} onChange={setCurrentCarMonthsLeft} unit="mo" step="1" />
              </>)}
              <InputField label="Current Insurance" value={currentInsurance} onChange={setCurrentInsurance} unit="$/mo" step="5" />

              <hr className="hair my-6" />

              <ChoiceGroup id={`${uid}-purchase-method`} label="EV Purchase Method" className="mb-5">
                {[{ v: 'finance', l: 'Finance' }, { v: 'lease', l: 'Lease' }, { v: 'cash', l: 'Cash' }].map(o => (
                  <ChartTab key={o.v} active={evPurchaseMethod === o.v} onClick={() => setEvPurchaseMethod(o.v)} label={o.l} />
                ))}
              </ChoiceGroup>
              {evPurchaseMethod === 'finance' && (<>
                <InputField label="EV Price" value={evPrice} onChange={setEvPrice} unit="$" step="500" />
                <InputField label="Down Payment" value={evDownPayment} onChange={setEvDownPayment} unit="$" step="500" />
                <div className="grid grid-cols-2 gap-x-6">
                  <InputField label="Loan Term" value={evLoanTerm} onChange={setEvLoanTerm} unit="mo" step="12" />
                  <InputField label="Interest Rate" value={evInterestRate} onChange={setEvInterestRate} unit="%" step="0.25" />
                </div>
                <div className="mb-4 flex items-baseline justify-between gap-4 border-t border-rule pt-2">
                  <span className="text-ink-2" style={T13}>Monthly Payment</span>
                  <span className="tnum font-semibold text-ink" style={T15}>
                    {money(evMonthlyFinance)}<Unit of={15}>/mo</Unit>
                  </span>
                </div>
                {stats.evLoanPayoff > 0 && (
                  <p className="mb-4 text-ink-3" style={T11}>
                    Loan balance at year {ownYears}: <span className="tnum font-medium text-ink">{money(stats.evLoanPayoff)}</span> — the term outlasts your ownership window, so this gets paid off from the sale and is counted in the totals.
                  </p>
                )}
              </>)}
              {evPurchaseMethod === 'lease' && (<>
                <InputField label="Monthly Lease" value={evLeasePayment} onChange={setEvLeasePayment} unit="$/mo" step="10" />
                <InputField label="Lease Term" value={evLeaseTerm} onChange={setEvLeaseTerm} unit="mo" step="12" />
                <InputField label="Due at Signing" value={evLeaseDueAtSigning} onChange={setEvLeaseDueAtSigning} unit="$" step="500" />
              </>)}
              {evPurchaseMethod === 'cash' && (<InputField label="Purchase Price" value={evPrice} onChange={setEvPrice} unit="$" step="500" />)}
              <InputField label="EV Insurance" value={evInsurance} onChange={setEvInsurance} unit="$/mo" step="5" />

              <hr className="hair my-6" />

              <InputField label="Trade-In Value (current car)" value={tradeInValue} onChange={setTradeInValue} unit="$" step="500" tooltip="What you'd get selling or trading your current car — credited against the EV." />
              {evPurchaseMethod === 'lease'
                ? (
                  // Printed, not omitted: a leased car is not yours to sell, so the
                  // credit is a real zero rather than a missing row.
                  <StruckRow
                    label="EV Resale Value After Ownership"
                    value="$0"
                    reason="leased — the car goes back, so there is nothing to sell"
                    className="mb-4"
                  />
                )
                : <InputField label="EV Resale Value After Ownership" value={resalePct} onChange={setResalePct} unit="%" step="5" tooltip="The EV is still worth something when you're done — credited at the end. 40–50% at 5 years is typical." />}
              <InputField label="Annual EV Registration Fee" value={evRegFee} onChange={setEvRegFee} unit="$/yr" step="10" tooltip="Many states charge EVs a road fee since they skip gas taxes — CA's is ~$118/yr." />
            </Section>
          </Card>
        </div>

        {/* --- results ------------------------------------------------------ */}
        <div className="min-w-0 lg:col-span-7">
          <Card className="px-5 pb-6 pt-4">
            <Section n="04" title="Selected Vehicle" aside={selectedEV.category}>
              <div className="mt-3">
                <h4 className="font-semibold text-ink" style={T20}>{selectedEV.name}</h4>
                <p className="text-ink-2" style={T13}>{selectedEV.year} · {selectedEV.trim}</p>
              </div>
              {/* THE SPEC CLUSTER — ruled, not carded, and each figure inked by
                  its own magnitude against a stated domain: the three specs
                  against the whole fleet, the annual fuel against the pair it
                  belongs to below. The micro-labels and units stay achromatic. */}
              <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-5 border-t border-rule pt-3 sm:grid-cols-4">
                {specTiles.map(tile => <Readout key={tile.label} {...tile} />)}
              </div>
            </Section>

            <ChoiceGroup id={`${uid}-own-years`} label="Ownership period" className="mt-9">
              {[3, 5, 8, 10].map(y => (
                <ChartTab key={y} active={ownYears === y} onClick={() => setOwnYears(y)} label={`${y} yrs`} />
              ))}
            </ChoiceGroup>

            {/* THE PRIMARY READOUT. Public Sans bold on the readout run at 34,
                its currency mark in mono at 0.4× — the one figure the reader
                came for.

                It is a signed DELTA (what keeping the gas car costs, minus what
                the EV costs), so it carries `--d-good` / `--d-bad` rather than a
                ramp stop: a direction is not a magnitude. The encoding is
                redundant — the micro-label above says "Savings" or "Cost
                Increase" in words — so it survives greyscale and colour-vision
                deficiency. */}
            <div className="mt-7 border-b-2 border-rule-strong pb-2">
              <Readout
                label={isSaving ? `${ownYears}-Year Savings` : `${ownYears}-Year Cost Increase`}
                prefix="$"
                value={Math.round(Math.abs(stats.totalSavings)).toLocaleString()}
                size={34}
                tone={isSaving ? 'text-d-good' : 'text-d-bad'}
              />
            </div>

            {/* THE SUPPORTING CLUSTER. Only the fuel pair is inked, and against
                one shared domain, because that pair is the comparison this tool
                exists to make. A compound cost-per-mile, a tonnage and a date
                have no measured domain to sit in, so they stay in `--ink`. */}
            <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3">
              <Readout
                label="Gas Annual Fuel"
                prefix="$"
                value={count(stats.gasCostYear)}
                tone={toneForValue(stats.gasCostYear, 0, fuelScale)}
              />
              <Readout
                label="EV Annual Fuel"
                prefix="$"
                value={count(stats.elecCostYear)}
                tone={toneForValue(stats.elecCostYear, 0, fuelScale)}
              />
              <Readout
                label="Cost Per Mile"
                value={
                  <>
                    <span>{stats.gasCPM.toFixed(0)}¢</span>
                    <span className="mx-1.5 font-normal text-ink-3" style={T13}>gas →</span>
                    <span>{stats.evCPM.toFixed(1)}¢</span>
                    <span className="ml-1 font-normal text-ink-3" style={T13}>EV</span>
                  </>
                }
              />
              <Readout
                label="CO₂ Avoided"
                value={stats.co2Avoided.toFixed(1)}
                unit="tons/yr"
                note={`≈ ${Math.round(stats.co2Avoided * 1000 / 21)} trees planted`}
              />
              <Readout
                label="Cash-Flow Break Even"
                value={stats.breakEvenMonth ? `${Math.floor(stats.breakEvenMonth / 12)}y ${stats.breakEvenMonth % 12}m` : 'Beyond ' + ownYears + ' yrs'}
                note="before end-of-ownership settlement"
              />
            </div>

            {/* Monthly, side by side, as two ruled columns of line items. A row
                that is zero because of a real-world fact is printed and struck,
                never dropped — that is the whole claim of this product. The two
                totals share one domain, so the cheaper column is visibly the
                darker step on the ramp. */}
            <div className="mt-10 grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2">
              <div>
                <p className="eyebrow">Current Car Monthly</p>
                <hr className="rule mb-1 mt-1.5" />
                {currentCarStatus === 'loan'
                  ? <LineRow label="Car Payment" value={money2(currentCarPayment)} />
                  : <StruckRow label="Car Payment" value="$0" reason="current vehicle is paid off" />}
                <LineRow label="Gas" value={money(stats.gasCostYear / 12)} />
                <LineRow label="Maintenance" value={money(iceMaintCost / 12)} />
                <LineRow label="Insurance" value={money2(currentInsurance)} />
                <LineRow
                  total
                  label="Total"
                  value={money(stats.currentMonthlyTotal)}
                  unit="/mo"
                  tone={toneForValue(stats.currentMonthlyTotal, 0, monthlyScale)}
                />
              </div>
              <div>
                <p className="eyebrow">EV Monthly</p>
                <hr className="rule mb-1 mt-1.5" />
                {evPurchaseMethod !== 'cash'
                  ? <LineRow label={evPurchaseMethod === 'finance' ? 'Loan' : 'Lease'} value={money(stats.evMonthlyPayment)} />
                  : <StruckRow label="Loan" value="$0" reason="bought with cash — nothing is financed" />}
                <LineRow label="Electricity" value={money(stats.elecCostYear / 12)} />
                <LineRow label="Maintenance" value={money(evMaintCost / 12)} />
                <LineRow label="Insurance" value={money2(evInsurance)} />
                <LineRow
                  total
                  label="Total"
                  value={money(stats.evMonthlyTotal)}
                  unit="/mo"
                  tone={toneForValue(stats.evMonthlyTotal, 0, monthlyScale)}
                />
              </div>
            </div>

            {/* FIG. 1 — the stacked buckets. Neutral ink steps, legend kept: the
                swatches name cost buckets, not entities, so hue is not carrying
                the argument here and the legend is doing real work. */}
            <hr className="rule-strong mt-10" />
            <BlockHead title={`${ownYears}-Year Total Cost of Ownership`} className="mt-2.5" />
            <div className="mt-3 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chartData} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }} {...barChartProps}>
                  <XAxis {...chart.xAxisProps} type="number" tickFormatter={currencyTick} />
                  {/* Category axis stays on the LEFT here: the bars grow from
                      x=0, and a label parked on the far side of its own bar is
                      a label orphaned from its figure. */}
                  <YAxis {...chart.yAxisProps} orientation="left" type="category" dataKey="name" width={130} />
                  <Tooltip {...chart.barTooltipProps} formatter={currencyValue} />
                  <Legend {...chart.legendProps} />
                  <Bar {...chart.barProps} dataKey="payment" name="Loan / Lease" stackId="a" fill={tcoFills.payment} />
                  <Bar {...chart.barProps} dataKey="fuel" name="Fuel / Energy" stackId="a" fill={tcoFills.fuel} />
                  <Bar {...chart.barProps} dataKey="insurance" name="Insurance" stackId="a" fill={tcoFills.insurance} />
                  <Bar {...chart.barProps} dataKey="maintenance" name="Maintenance" stackId="a" fill={tcoFills.maintenance} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Figure number={1} className="mt-2" caption={`Everything the two cars cost over ${ownYears} years, split by bucket — the four steps are one ink thinned toward the sheet, because a cost bucket is not an entity and carries no series hue.`} />

            {/* FIG. 2 — the crossing. The EV is the proposed system (`--d-solar`,
                2px solid over a wash); the gas car is the do-nothing baseline
                (`--d-grid`, 1.5px dashed, no fill), so weight, dash and fill all
                differ and the chart survives greyscale and a photocopier. */}
            <hr className="rule-strong mt-10" />
            <BlockHead title="When Does the EV Pull Ahead?" className="mt-2.5" />
            <div className="mt-3 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.cumulative} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid {...chart.gridProps} />
                  <XAxis {...chart.xAxisProps} dataKey="month" tickFormatter={m => `${Math.round(m / 12)}y`} interval={3} />
                  <YAxis {...chart.yAxisProps} tickFormatter={currencyTick} />
                  <Tooltip {...chart.tooltipProps} formatter={currencyValue} labelFormatter={m => `Month ${m}`} />
                  <Legend {...chart.legendProps} />
                  <Area {...chart.baselineLine} type="monotone" dataKey="ice" name="Keep the gas car" />
                  <Area {...chart.proposedLine} type="monotone" dataKey="ev" name={selectedEV.name} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <Figure number={2} className="mt-2" caption="Cumulative money spent — the EV wins where its solid line drops below the dashed gas car." />

            <hr className="rule mt-8" />
            <button
              type="button"
              onClick={() => onExport({ selectedEV: selectedEV.name, year: selectedEV.year, trim: selectedEV.trim, savings: Math.round(Math.abs(stats.totalSavings)), gasCostYear: Math.round(stats.gasCostYear), evCostYear: Math.round(stats.elecCostYear), currentMonthly: Math.round(stats.currentMonthlyTotal), evMonthly: Math.round(stats.evMonthlyTotal), purchaseMethod: evPurchaseMethod, years: ownYears })}
              className="eyebrow mt-5 w-full bg-ink px-5 py-3 text-center text-surface hover:bg-ink-2 print:hidden"
            >
              Export to Proposal
            </button>
          </Card>
        </div>
      </div>

      {/* The premises every total on this sheet stands on, in the margin where
          assumptions live — never in a tooltip. Two of them appear nowhere else
          in the interface: the maintenance figures are fixed by this tool, and
          a reader is entitled to see them rather than have them folded silently
          into a monthly total. */}
      <Rail>
        <aside>
          <p className="eyebrow">Fig. 1–2 — premises</p>
          <hr className="rule-strong mt-1.5" />
          <Premise label="Annual mileage" value={count(annualMiles)} unit="mi / yr" />
          <Premise label="Gas price" value={Number.isFinite(gasPrice) ? gasPrice.toFixed(2) : '—'} unit="$ / gal" />
          <Premise label="Current car" value={count(iceMPG)} unit="mpg" />
          <Premise label="Charging rate" value={Number.isFinite(elecRate) ? elecRate.toFixed(2) : '—'} unit="$ / kWh" />
          <Premise label="Ownership" value={ownYears} unit="yrs" />
          <Premise label="Gas maintenance" value={count(iceMaintCost)} unit="$ / yr" />
          <Premise label="EV maintenance" value={count(evMaintCost)} unit="$ / yr" />
          <Premise label="EV registration" value={count(evRegFee)} unit="$ / yr" />
          <Premise label="Gas insurance" value={count(currentInsurance)} unit="$ / mo" />
          <Premise label="EV insurance" value={count(evInsurance)} unit="$ / mo" />
        </aside>
      </Rail>
    </div>
  );
};

export default EVCalculator;
