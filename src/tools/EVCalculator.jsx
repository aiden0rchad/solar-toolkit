import { useId, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Check } from 'lucide-react';
import { ChartTab, Figure, InputField, StruckRow } from '../components/ui';
import { usePremises } from '../components/useShell';
import {
  barChartProps, barPropsOf, barTooltipPropsOf, baselineLineOf,
  currencyTick, currencyValue, gridPropsOf, legendPropsOf, proposedLineOf,
  tooltipPropsOf, useChartTokens, xAxisPropsOf, yAxisPropsOf,
} from '../components/chartTheme';
import { evDatabase } from '../data/evDatabase';
import { computeEvStats, evLoanPayment } from '../engine/ev';

// =============================================================================
// COUNTERFOIL — EV vs. gas.
//
// The largest sheet in the toolkit, and the one that most wanted to be a wall
// of cards. It is a document instead: a ruled filter row, a real table of
// vehicles, then your numbers on the left and the figures on the right. No
// boxes, no radius, no fills except the one that marks the selected row, and no
// colour anywhere — rank is carried by rule weight, size, and Archivo's width
// axis, exactly as it is on a bill.
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
const T22 = type(22);
const T28 = type(28);

/**
 * A hero figure. Archivo's `wdth` axis is the second voice, and this is where
 * it speaks: condensed to 62% and set heavy, so a total reads as a total
 * without borrowing a colour to say so.
 */
const figureType = (size) => ({ ...type(size), fontStretch: '62%', fontWeight: 800 });

/** Ordinal in the margin of a section head — condensed, tabular. */
const sectionNumber = { ...T12, fontStretch: '75%' };

/**
 * A unit. Spline Sans Mono at 0.74× in `--ink-3`, and it appears once — at the
 * head of a column of like figures, or once beside a lone figure. Never
 * repeated down a column.
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
 * A numbered section. The 2px `--rule-heavy` under the head is the only edge a
 * section has; there is no border around anything on this page.
 */
const Section = ({ n, title, aside, className = '', children }) => (
  <section className={className}>
    <div className="flex items-baseline gap-2.5">
      <span className="tnum flex-none text-ink-3" style={sectionNumber}>{n}</span>
      <h3 className="font-semibold text-ink" style={{ ...T15, fontStretch: '75%' }}>{title}</h3>
      {aside && <span className="eyebrow ml-auto flex-none">{aside}</span>}
    </div>
    <hr className="rule-heavy mt-1.5" />
    {children}
  </section>
);

/** A sub-head inside a section: 15px ink over a 1px rule. */
const BlockHead = ({ title, className = '' }) => (
  <div className={className}>
    <h4 className="font-medium text-ink" style={T15}>{title}</h4>
    <hr className="rule mt-1.5" />
  </div>
);

/**
 * One ruled line item: label left, figure right in a tabular column. `total`
 * promotes it to the summed row — 1px rule above, figure up a step in the
 * scale — the way the bottom of a bill column is set.
 */
const LineRow = ({ label, value, total = false }) => (
  <div
    className={`flex items-baseline justify-between gap-4 ${total ? 'mt-1 border-t border-rule pt-2' : 'border-b-[0.5px] border-hair py-1.5'
      }`}
  >
    <span className={total ? 'font-medium text-ink' : 'text-ink-2'} style={T13}>{label}</span>
    <span className={`tnum text-ink ${total ? 'font-semibold' : 'font-medium'}`} style={total ? T22 : T13}>
      {value}
    </span>
  </div>
);

/** A figure with its column head above it. The head is an `.eyebrow`, always. */
const Stat = ({ label, value, size = 22, tone = 'text-ink', note, className = '' }) => (
  <div className={className}>
    <p className="eyebrow">{label}</p>
    <p className={`tnum mt-0.5 ${tone}`} style={figureType(size)}>{value}</p>
    {note && <p className="mt-1 text-ink-3" style={T11}>{note}</p>}
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
const BODY_CELL = `${CELL} whitespace-nowrap border-b-[0.3px] border-hair align-middle`;

/** Borderless control: one 1px rule under it, `--field` only under focus. */
const CONTROL = 'h-8 w-full border-0 border-b border-rule bg-transparent px-0 text-ink focus:bg-field';

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
    <div role="group" aria-labelledby={id} className="flex flex-wrap gap-x-5 border-b-[0.5px] border-hair">
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
  const t = useChartTokens();
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

  const specTiles = [
    { value: selectedEV.range, label: 'Miles Range' },
    { value: selectedEV.battery, label: 'kWh Battery' },
    { value: selectedEV.eff, label: 'mi/kWh' },
    { value: `$${Math.round(stats.elecCostYear)}`, label: 'Annual Fuel' },
  ];

  // --- chart props, resolved for the theme on screen -------------------------
  const gridProps = gridPropsOf(t);
  const xAxis = xAxisPropsOf(t);
  const yAxis = yAxisPropsOf(t);
  const legend = legendPropsOf(t);

  // The four TCO buckets are cost CATEGORIES, not entities, so they get no
  // series hue: one ink diluted toward the sheet in four even steps, which is a
  // grey ramp in both themes and survives a photocopier by construction. The
  // legend stays, because its swatches name buckets rather than entities — it
  // is the only thing telling the reader which step is which.
  //
  // Four *different* neutral tokens cannot do this job: --ink-2 and --ink-3 sit
  // a hair apart, and --hair and --rule vanish against the paper. Diluting one
  // ink gives genuinely even steps and a real fill per bucket, which the legend
  // needs — it paints its swatch from `fill` and ignores `fillOpacity`.
  const tcoFills = {
    payment: dilute(t.ink, t.surface, 0.34),
    fuel: dilute(t.ink, t.surface, 0.56),
    insurance: dilute(t.ink, t.surface, 0.78),
    maintenance: t.ink,
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

  const tableColumns = compareMode ? 7 : 6;

  return (
    <div className="min-w-0">
      <header>
        <h2 className="font-semibold text-ink" style={{ ...T28, fontStretch: '75%' }}>EV vs. Gas Calculator</h2>
        <p className="mt-2 max-w-[52em] text-ink-2" style={T15}>
          See whether an EV would cost you less each month and over five years. Compare {evDatabase.length} models from {makes.length} manufacturers.
        </p>
      </header>

      {/* 01 — THE INDEX OF VEHICLES ------------------------------------------
          Filters as one ruled row of borderless fields, then the table itself.
          Nothing here is a control panel; it is the head of a list. */}
      <Section n="01" title="Vehicles" aside={`${filteredEVs.length} shown`} className="mt-10">
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
          <div className="border-b-[0.5px] border-hair">
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
                {compareMode && <th scope="col" className={HEAD_CELL}><span className="sr-only">Compare</span></th>}
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
                    className={`h-7 cursor-pointer ${highlighted ? 'bg-sunken' : 'hover:bg-field'}`}
                  >
                    {compareMode && (
                      <td className={`${BODY_CELL} w-4`}>
                        <span
                          aria-hidden="true"
                          className={`flex h-3 w-3 items-center justify-center border ${inCompare ? 'border-ink bg-ink text-paper' : 'border-rule'
                            }`}
                        >
                          {inCompare && <Check size={9} strokeWidth={3.5} />}
                        </span>
                      </td>
                    )}
                    <th scope="row" className={`${BODY_CELL} font-medium text-ink`} style={T13}>{ev.name}</th>
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
                      head keeps its sign in front of the figure. */}
                  <tr className="h-7">
                    <th scope="row" className={`${BODY_CELL} font-medium text-ink`} style={T13}>
                      {ownYears}-Year {compareAllCost ? 'Cost' : 'Savings'}<Unit of={13}>$</Unit>
                    </th>
                    {compareColumns.map(({ ev, stats: s }) => (
                      <td
                        key={ev.id}
                        className={`${BODY_CELL} tnum text-right font-semibold ${s.totalSavings >= 0 ? 'text-ink' : 'text-bad'}`}
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

      {/* THE SPLIT PANE — your numbers left, the figures right. */}
      <div className="mt-12 grid grid-cols-1 gap-x-12 gap-y-12 lg:grid-cols-12">

        {/* --- inputs ------------------------------------------------------- */}
        <div className="lg:col-span-5">
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

          <Section n="03" title="Financing & Insurance" className="mt-12">
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
        </div>

        {/* --- results ------------------------------------------------------ */}
        <div className="lg:col-span-7">
          <Section n="04" title="Selected Vehicle" aside={selectedEV.category}>
            <div className="mt-3">
              <h4 className="font-semibold text-ink" style={{ ...T22, fontStretch: '75%' }}>{selectedEV.name}</h4>
              <p className="text-ink-2" style={T13}>{selectedEV.year} · {selectedEV.trim}</p>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-x-8 gap-y-4 border-t border-rule pt-3 sm:grid-cols-4">
              {specTiles.map(tile => (
                <div key={tile.label}>
                  <dt className="eyebrow">{tile.label}</dt>
                  <dd className="tnum mt-0.5 text-ink" style={figureType(22)}>{tile.value}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <ChoiceGroup id={`${uid}-own-years`} label="Ownership period" className="mt-10">
            {[3, 5, 8, 10].map(y => (
              <ChartTab key={y} active={ownYears === y} onClick={() => setOwnYears(y)} label={`${y} yrs`} />
            ))}
          </ChoiceGroup>

          {/* The headline. Condensed and heavy, in ink — the size is the
              emphasis. Only the sign of the delta is allowed a colour. */}
          <div className="mt-8">
            <p className="eyebrow">{isSaving ? `${ownYears}-Year Savings` : `${ownYears}-Year Cost Increase`}</p>
            <p className={`tnum mt-1 ${isSaving ? 'text-ink' : 'text-bad'}`} style={figureType(40)}>
              ${Math.round(Math.abs(stats.totalSavings)).toLocaleString()}
            </p>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-rule pt-4 sm:grid-cols-3">
            <Stat label="Gas Annual Fuel" value={money(stats.gasCostYear)} />
            <Stat label="EV Annual Fuel" value={money(stats.elecCostYear)} />
            <Stat
              label="Cost Per Mile"
              value={
                <>
                  <span>{stats.gasCPM.toFixed(0)}¢</span>
                  <span className="mx-1.5 font-normal text-ink-3" style={{ ...T13, fontStretch: '100%' }}>gas →</span>
                  <span>{stats.evCPM.toFixed(1)}¢</span>
                  <span className="ml-1 font-normal text-ink-3" style={{ ...T13, fontStretch: '100%' }}>EV</span>
                </>
              }
            />
            <Stat
              label="CO₂ Avoided"
              value={<>{stats.co2Avoided.toFixed(1)}<Unit of={22}>tons/yr</Unit></>}
              note={`≈ ${Math.round(stats.co2Avoided * 1000 / 21)} trees planted`}
            />
            <Stat
              label="Cash-Flow Break Even"
              value={stats.breakEvenMonth ? `${Math.floor(stats.breakEvenMonth / 12)}y ${stats.breakEvenMonth % 12}m` : 'Beyond ' + ownYears + ' yrs'}
              note="before end-of-ownership settlement"
            />
          </div>

          {/* Monthly, side by side, as two ruled columns of line items. A row
              that is zero because of a real-world fact is printed and struck,
              never dropped — that is the whole claim of this product. */}
          <div className="mt-12 grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2">
            <div>
              <p className="eyebrow">Current Car Monthly</p>
              <hr className="rule mb-1 mt-1.5" />
              {currentCarStatus === 'loan'
                ? <LineRow label="Car Payment" value={money2(currentCarPayment)} />
                : <StruckRow label="Car Payment" value="$0" reason="current vehicle is paid off" />}
              <LineRow label="Gas" value={money(stats.gasCostYear / 12)} />
              <LineRow label="Maintenance" value={money(iceMaintCost / 12)} />
              <LineRow label="Insurance" value={money2(currentInsurance)} />
              <LineRow total label="Total" value={<>{money(stats.currentMonthlyTotal)}<Unit of={22}>/mo</Unit></>} />
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
              <LineRow total label="Total" value={<>{money(stats.evMonthlyTotal)}<Unit of={22}>/mo</Unit></>} />
            </div>
          </div>

          {/* FIG. 1 — the stacked buckets. Neutral ink steps, legend kept: the
              swatches name cost buckets, not entities, so hue is not carrying
              the argument here and the legend is doing real work. */}
          <div className="mt-12">
            <BlockHead title={`${ownYears}-Year Total Cost of Ownership`} />
            <div className="mt-3 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chartData} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }} {...barChartProps}>
                  <XAxis {...xAxis} type="number" tickFormatter={currencyTick} />
                  {/* Category axis stays on the LEFT here: the bars grow from
                      x=0, and a label parked on the far side of its own bar is
                      a label orphaned from its figure. */}
                  <YAxis {...yAxis} orientation="left" type="category" dataKey="name" width={130} />
                  <Tooltip {...barTooltipPropsOf(t)} formatter={currencyValue} />
                  <Legend {...legend} />
                  <Bar {...barPropsOf(t)} dataKey="payment" name="Loan / Lease" stackId="a" fill={tcoFills.payment} />
                  <Bar {...barPropsOf(t)} dataKey="fuel" name="Fuel / Energy" stackId="a" fill={tcoFills.fuel} />
                  <Bar {...barPropsOf(t)} dataKey="insurance" name="Insurance" stackId="a" fill={tcoFills.insurance} />
                  <Bar {...barPropsOf(t)} dataKey="maintenance" name="Maintenance" stackId="a" fill={tcoFills.maintenance} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Figure number={1} className="mt-2" caption={`Everything the two cars cost over ${ownYears} years, split by bucket.`} />
          </div>

          {/* FIG. 2 — the crossing. EV is the proposed system (2px solid, wash);
              the gas car is the do-nothing baseline (1.5px dashed, no fill), so
              the chart survives greyscale and a photocopier. */}
          <div className="mt-12">
            <BlockHead title="When Does the EV Pull Ahead?" />
            <div className="mt-3 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.cumulative} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis {...xAxis} dataKey="month" tickFormatter={m => `${Math.round(m / 12)}y`} interval={3} />
                  <YAxis {...yAxis} tickFormatter={currencyTick} />
                  <Tooltip {...tooltipPropsOf(t)} formatter={currencyValue} labelFormatter={m => `Month ${m}`} />
                  <Legend {...legend} />
                  <Area {...baselineLineOf(t)} type="monotone" dataKey="ice" name="Keep the gas car" />
                  <Area {...proposedLineOf(t)} type="monotone" dataKey="ev" name={selectedEV.name} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <Figure number={2} className="mt-2" caption="Cumulative money spent — the EV wins where its solid line drops below the dashed gas car." />
          </div>

          <button
            type="button"
            onClick={() => onExport({ selectedEV: selectedEV.name, year: selectedEV.year, trim: selectedEV.trim, savings: Math.round(Math.abs(stats.totalSavings)), gasCostYear: Math.round(stats.gasCostYear), evCostYear: Math.round(stats.elecCostYear), currentMonthly: Math.round(stats.currentMonthlyTotal), evMonthly: Math.round(stats.evMonthlyTotal), purchaseMethod: evPurchaseMethod, years: ownYears })}
            className="eyebrow mt-12 w-full bg-ink px-5 py-3 text-center text-surface hover:bg-ink-2 print:hidden"
          >
            Export to Proposal
          </button>
        </div>
      </div>
    </div>
  );
};

export default EVCalculator;
