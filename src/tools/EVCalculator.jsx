import { useId, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, Battery, Car, Check, DollarSign, FileText, Scale, Search, Sun, Wallet, Zap } from 'lucide-react';
import { Card, InputField } from '../components/ui';
import {
  BASELINE, INK, INK_2, INK_3, SERIES,
  areaProps, barChartProps, barProps, barTooltip, chartTooltip,
  currencyTick, currencyValue, gridProps, legendProps, xAxisProps, yAxisProps,
} from '../components/chartTheme';
import { evDatabase } from '../data/evDatabase';
import { computeEvStats, evLoanPayment } from '../engine/ev';

// Shared control styling — a select/input and a segmented button, system-styled.
const fieldClass = 'h-9 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink hover:border-baseline';
const segBase = 'rounded-md border px-3 py-1.5 text-xs font-medium';
const seg = (active) => `${segBase} ${active
  ? 'border-baseline bg-accent-wash text-ink'
  : 'border-line bg-surface text-ink-2 hover:border-baseline'}`;

// The four TCO buckets are cost categories, not entities — a neutral light-to-dark
// ramp, identified by the legend. Series hues stay reserved for EV vs. gas.
const TCO_FILLS = { payment: BASELINE, fuel: INK_3, insurance: INK_2, maintenance: INK };

const chargeSources = [
  { l: 'Home Solar', icon: Sun, r: 0.07 },
  { l: 'Off-Peak Grid', r: 0.31 },
  { l: 'Standard Grid', r: 0.40 },
];

// --- TOOL: EV CALCULATOR (Expanded) ---
const EVCalculator = ({ onExport }) => {
  // Ids so each caption is programmatically tied to the control (or button group)
  // it names, rather than floating above it as an orphan <label>.
  const uid = useId();
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
  const gasCarPresets = [{ label: 'Truck/SUV', mpg: 18 }, { label: 'Sedan', mpg: 28 }, { label: 'Hybrid', mpg: 50 }];
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

  const specTiles = [
    { icon: Zap, value: selectedEV.range, label: 'Miles Range' },
    { icon: Battery, value: selectedEV.battery, label: 'kWh Battery' },
    { icon: ArrowRight, value: selectedEV.eff, label: 'mi/kWh' },
    { icon: DollarSign, value: `$${Math.round(stats.elecCostYear)}`, label: 'Annual Fuel' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="flex items-center gap-2 text-[22px] font-semibold text-ink"><Car size={20} className="text-ink-2" /> EV vs. Gas Calculator</h2>
        <p className="mt-1 text-sm text-ink-2">See whether an EV would cost you less each month and over five years. Compare {evDatabase.length} models from {makes.length} manufacturers.</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label htmlFor={`${uid}-search`} className="mb-1 block text-xs font-medium text-ink-2">Search</label>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <input id={`${uid}-search`} type="text" placeholder="Search vehicles..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`${fieldClass} pl-9 placeholder:text-ink-3`} />
          </div>
        </div>
        <div>
          <label htmlFor={`${uid}-make`} className="mb-1 block text-xs font-medium text-ink-2">Make</label>
          <select id={`${uid}-make`} value={filterMake} onChange={(e) => setFilterMake(e.target.value)} className={`${fieldClass} min-w-[140px]`}>
            <option value="All">All Makes</option>
            {makes.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`${uid}-year`} className="mb-1 block text-xs font-medium text-ink-2">Year</label>
          <select id={`${uid}-year`} value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className={`${fieldClass} min-w-[110px]`}>
            <option value="All">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`${uid}-type`} className="mb-1 block text-xs font-medium text-ink-2">Type</label>
          <select id={`${uid}-type`} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={`${fieldClass} min-w-[120px]`}>
            <option value="All">All Types</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button type="button" onClick={() => { setCompareMode(!compareMode); if (compareMode) setCompareList([]); }}
          className={`h-9 rounded-md border px-3 text-[13px] font-medium ${compareMode
            ? 'border-baseline bg-accent-wash text-ink'
            : 'border-line bg-surface text-ink-2 hover:border-baseline'}`}>
          <Scale size={16} className="inline mr-1.5" />{compareMode ? `Compare (${compareList.length}/3)` : 'Compare'}
        </button>
      </div>

      {/* Compare View */}
      {compareMode && compareList.length >= 2 && (
        <div className="mb-6">
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-ink"><Scale className="text-ink-2" size={16} /> Side-by-Side Comparison</h3>
          <div className={`grid gap-4 ${compareList.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
            {compareList.map(ev => {
              const s = getStats(ev);
              const saving = s.totalSavings >= 0;
              const rows = [
                ['Range', `${ev.range} mi`],
                ['Battery', `${ev.battery} kWh`],
                ['Efficiency', `${ev.eff} mi/kWh`],
                ['Annual Fuel', `$${Math.round(s.elecCostYear).toLocaleString()}`],
              ];
              return (
                <Card key={ev.id} className="p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-semibold text-ink">{ev.name}</h4>
                      <p className="text-xs text-ink-3">{ev.year} {ev.trim}</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-ink-3">{ev.category}</span>
                  </div>
                  <dl className="mb-4 border-t border-line">
                    {rows.map(([label, value]) => (
                      <div key={label} className="flex items-baseline justify-between gap-3 border-b border-line py-2">
                        <dt className="text-xs text-ink-2">{label}</dt>
                        <dd className="tnum text-[13px] font-medium text-ink">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <div>
                    <p className="text-xs font-medium text-ink-2">{ownYears}-Year {saving ? 'Savings' : 'Cost'}</p>
                    <p className="mt-0.5 text-2xl font-semibold text-ink">${Math.round(Math.abs(s.totalSavings)).toLocaleString()}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Vehicle List + Settings */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-5">
            <h3 className="mb-2 text-sm font-semibold text-ink">Vehicles <span className="font-normal text-ink-3">({filteredEVs.length})</span></h3>
            <div className="max-h-[420px] overflow-y-auto border-t border-line">
              {filteredEVs.map(ev => {
                const isSelected = selectedEV.id === ev.id;
                const inCompare = compareList.find(e => e.id === ev.id);
                const highlighted = compareMode ? !!inCompare : isSelected;
                return (
                  <button key={ev.id} type="button"
                    onClick={() => { if (compareMode) toggleCompare(ev); else setSelectedEV(ev); }}
                    className={`flex w-full items-center justify-between gap-3 border-b px-2 py-2.5 text-left ${highlighted
                      ? 'border-baseline bg-accent-wash'
                      : 'border-line hover:bg-field'}`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[13px] font-medium text-ink">{ev.name}</p>
                        <span className="shrink-0 text-[11px] text-ink-3">{ev.category}</span>
                      </div>
                      <p className="tnum mt-0.5 truncate text-xs text-ink-3">{ev.year} · {ev.trim} · {ev.range} mi · {ev.eff} mi/kWh</p>
                    </div>
                    {compareMode && (
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${inCompare ? 'border-baseline' : 'border-line'}`}>
                        {inCompare && <Check size={12} className="text-accent" />}
                      </span>
                    )}
                  </button>
                );
              })}
              {filteredEVs.length === 0 && <p className="py-6 text-center text-sm text-ink-3">No vehicles match your filters.</p>}
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-ink">Driving & Costs</h3>
            <div className="mb-4"><span id={`${uid}-mpg`} className="mb-2 block text-xs font-medium text-ink-2">Current Car MPG</span>
              <div role="group" aria-labelledby={`${uid}-mpg`} className="flex gap-2">{gasCarPresets.map(preset => (
                <button key={preset.label} type="button" onClick={() => setIceMPG(preset.mpg)} className={`flex-1 ${seg(iceMPG === preset.mpg)}`}>{preset.label} ({preset.mpg})</button>
              ))}</div>
            </div>
            <InputField label="Annual Mileage" value={annualMiles} onChange={setAnnualMiles} unit="mi/yr" step="500" />
            <InputField label="Gas Price" value={gasPrice} onChange={setGasPrice} unit="$/gal" />
            <div className="mb-4"><span id={`${uid}-charge`} className="mb-2 block text-xs font-medium text-ink-2">Where does the charge come from?</span>
              <div role="group" aria-labelledby={`${uid}-charge`} className="flex gap-2">{chargeSources.map(o => {
                const Icon = o.icon;
                return (
                  <button key={o.l} type="button" onClick={() => setElecRate(o.r)} className={`flex flex-1 items-center justify-center gap-1 ${seg(Math.abs(elecRate - o.r) < 0.001)}`}>
                    {Icon && <Icon size={12} className="shrink-0" />}{o.l}
                  </button>
                );
              })}</div></div>
            <InputField label="EV Charging Rate" value={elecRate} onChange={setElecRate} unit="$/kWh" step="0.01" tooltip="Home Solar ≈ your levelized cost of self-generated power (~7¢). Vehicle efficiencies are EPA wall-to-wheels, so charging losses are already counted." />
          </Card>
          <Card className="p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink"><Wallet size={16} className="text-ink-2" /> Financing & Insurance</h3>
            {/* Current car status */}
            <div className="mb-4">
              <span id={`${uid}-current-vehicle`} className="mb-2 block text-xs font-medium text-ink-2">Current Vehicle</span>
              <div role="group" aria-labelledby={`${uid}-current-vehicle`} className="mb-3 flex gap-2">{[{ v: 'paidoff', l: 'Paid Off' }, { v: 'loan', l: 'Has Loan' }].map(o => (
                <button key={o.v} type="button" onClick={() => setCurrentCarStatus(o.v)} className={`flex-1 ${seg(currentCarStatus === o.v)}`}>{o.l}</button>
              ))}</div>
              {currentCarStatus === 'loan' && (<><InputField label="Monthly Car Payment" value={currentCarPayment} onChange={setCurrentCarPayment} unit="$/mo" step="10" /><InputField label="Months Remaining" value={currentCarMonthsLeft} onChange={setCurrentCarMonthsLeft} unit="mo" step="1" /></>)}
              <InputField label="Current Insurance" value={currentInsurance} onChange={setCurrentInsurance} unit="$/mo" step="5" />
            </div>
            <div className="my-4 h-px bg-line"></div>
            {/* EV purchase method */}
            <div className="mb-3">
              <span id={`${uid}-purchase-method`} className="mb-2 block text-xs font-medium text-ink-2">EV Purchase Method</span>
              <div role="group" aria-labelledby={`${uid}-purchase-method`} className="mb-3 flex gap-2">{[{ v: 'finance', l: 'Finance' }, { v: 'lease', l: 'Lease' }, { v: 'cash', l: 'Cash' }].map(o => (
                <button key={o.v} type="button" onClick={() => setEvPurchaseMethod(o.v)} className={`flex-1 ${seg(evPurchaseMethod === o.v)}`}>{o.l}</button>
              ))}</div>
            </div>
            {evPurchaseMethod === 'finance' && (<>
              <InputField label="EV Price" value={evPrice} onChange={setEvPrice} unit="$" step="500" />
              <InputField label="Down Payment" value={evDownPayment} onChange={setEvDownPayment} unit="$" step="500" />
              <div className="grid grid-cols-2 gap-3"><InputField label="Loan Term" value={evLoanTerm} onChange={setEvLoanTerm} unit="mo" step="12" /><InputField label="Interest Rate" value={evInterestRate} onChange={setEvInterestRate} unit="%" step="0.25" /></div>
              <div className="mt-2 rounded-md bg-accent-wash px-3 py-2.5"><div className="flex justify-between text-[13px]"><span className="text-ink-2">Monthly Payment</span><span className="tnum font-semibold text-ink">${Math.round(evMonthlyFinance)}/mo</span></div></div>
              {stats.evLoanPayoff > 0 && <div className="mt-2 rounded-md border border-line bg-field p-3 text-xs leading-relaxed text-ink-2">Loan balance at year {ownYears}: <span className="tnum font-medium text-ink">${Math.round(stats.evLoanPayoff).toLocaleString()}</span> — the term outlasts your ownership window, so this gets paid off from the sale and is counted in the totals.</div>}
            </>)}
            {evPurchaseMethod === 'lease' && (<>
              <InputField label="Monthly Lease" value={evLeasePayment} onChange={setEvLeasePayment} unit="$/mo" step="10" />
              <InputField label="Lease Term" value={evLeaseTerm} onChange={setEvLeaseTerm} unit="mo" step="12" />
              <InputField label="Due at Signing" value={evLeaseDueAtSigning} onChange={setEvLeaseDueAtSigning} unit="$" step="500" />
            </>)}
            {evPurchaseMethod === 'cash' && (<InputField label="Purchase Price" value={evPrice} onChange={setEvPrice} unit="$" step="500" />)}
            <InputField label="EV Insurance" value={evInsurance} onChange={setEvInsurance} unit="$/mo" step="5" />
            <div className="my-4 h-px bg-line"></div>
            <InputField label="Trade-In Value (current car)" value={tradeInValue} onChange={setTradeInValue} unit="$" step="500" tooltip="What you'd get selling or trading your current car — credited against the EV." />
            {evPurchaseMethod !== 'lease' && <InputField label="EV Resale Value After Ownership" value={resalePct} onChange={setResalePct} unit="%" step="5" tooltip="The EV is still worth something when you're done — credited at the end. 40–50% at 5 years is typical." />}
            <InputField label="Annual EV Registration Fee" value={evRegFee} onChange={setEvRegFee} unit="$/yr" step="10" tooltip="Many states charge EVs a road fee since they skip gas taxes — CA's is ~$118/yr." />
          </Card>
        </div>

        {/* Results */}
        <div className="lg:col-span-7 space-y-6">
          {/* Selected EV Spec Card */}
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <p className="eyebrow mb-1">Selected Vehicle</p>
                <h3 className="text-base font-semibold text-ink">{selectedEV.name}</h3>
                <p className="text-[13px] text-ink-2">{selectedEV.year} · {selectedEV.trim}</p>
              </div>
              <span className="text-[11px] text-ink-3">{selectedEV.category}</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-4">
              {specTiles.map(tile => {
                const Icon = tile.icon;
                return (
                  <div key={tile.label} className="bg-surface px-3 py-3 text-center">
                    <Icon size={14} className="mx-auto mb-1 text-ink-3" />
                    <p className="text-xl font-semibold text-ink">{tile.value}</p>
                    <p className="text-[11px] text-ink-3">{tile.label}</p>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Ownership period */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-ink-2">Ownership period</span>
            {[3, 5, 8, 10].map(y => (<button key={y} type="button" onClick={() => setOwnYears(y)} className={seg(ownYears === y)}>{y} yrs</button>))}
          </div>

          {/* Savings Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="text-xs font-medium text-ink-2">{isSaving ? `${ownYears}-Year Savings` : `${ownYears}-Year Cost Increase`}</div>
              <div className="mt-1 text-2xl font-semibold text-ink">${Math.round(Math.abs(stats.totalSavings)).toLocaleString()}</div>
            </Card>
            <Card className="p-4"><div className="text-xs font-medium text-ink-2">Gas Annual Fuel</div><div className="mt-1 text-2xl font-semibold text-ink">${Math.round(stats.gasCostYear).toLocaleString()}</div></Card>
            <Card className="p-4"><div className="text-xs font-medium text-ink-2">EV Annual Fuel</div><div className="mt-1 text-2xl font-semibold text-ink">${Math.round(stats.elecCostYear).toLocaleString()}</div></Card>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4"><div className="text-xs font-medium text-ink-2">Cost Per Mile</div><div className="mt-1 text-xl font-semibold text-ink"><span>{stats.gasCPM.toFixed(0)}¢</span><span className="mx-1.5 text-[13px] font-normal text-ink-3">gas →</span><span>{stats.evCPM.toFixed(1)}¢</span><span className="ml-1 text-[13px] font-normal text-ink-3">EV</span></div></Card>
            <Card className="p-4"><div className="text-xs font-medium text-ink-2">CO₂ Avoided</div><div className="mt-1 text-xl font-semibold text-ink">{stats.co2Avoided.toFixed(1)} tons/yr</div><div className="text-[11px] text-ink-3">≈ {Math.round(stats.co2Avoided * 1000 / 21)} trees planted</div></Card>
            <Card className="p-4"><div className="text-xs font-medium text-ink-2">Cash-Flow Break Even</div><div className="mt-1 text-xl font-semibold text-ink">{stats.breakEvenMonth ? `${Math.floor(stats.breakEvenMonth / 12)}y ${stats.breakEvenMonth % 12}m` : 'Beyond ' + ownYears + ' yrs'}</div><div className="text-[11px] text-ink-3">before end-of-ownership settlement</div></Card>
          </div>

          {/* Monthly Cost Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5">
              <p className="eyebrow mb-3">Current Car Monthly</p>
              <div className="space-y-2">
                {currentCarStatus === 'loan' && <div className="flex justify-between text-[13px]"><span className="text-ink-2">Car Payment</span><span className="tnum font-medium text-ink">${currentCarPayment}</span></div>}
                <div className="flex justify-between text-[13px]"><span className="text-ink-2">Gas</span><span className="tnum font-medium text-ink">${Math.round(stats.gasCostYear / 12)}</span></div>
                <div className="flex justify-between text-[13px]"><span className="text-ink-2">Maintenance</span><span className="tnum font-medium text-ink">${Math.round(iceMaintCost / 12)}</span></div>
                <div className="flex justify-between text-[13px]"><span className="text-ink-2">Insurance</span><span className="tnum font-medium text-ink">${currentInsurance}</span></div>
                <div className="mt-2 flex items-baseline justify-between border-t border-line pt-2"><span className="text-sm font-medium text-ink">Total</span><span className="tnum text-xl font-semibold text-ink">${Math.round(stats.currentMonthlyTotal)}/mo</span></div>
              </div>
            </Card>
            <Card className="p-5">
              <p className="eyebrow mb-3">EV Monthly</p>
              <div className="space-y-2">
                {evPurchaseMethod !== 'cash' && <div className="flex justify-between text-[13px]"><span className="text-ink-2">{evPurchaseMethod === 'finance' ? 'Loan' : 'Lease'}</span><span className="tnum font-medium text-ink">${Math.round(stats.evMonthlyPayment)}</span></div>}
                <div className="flex justify-between text-[13px]"><span className="text-ink-2">Electricity</span><span className="tnum font-medium text-ink">${Math.round(stats.elecCostYear / 12)}</span></div>
                <div className="flex justify-between text-[13px]"><span className="text-ink-2">Maintenance</span><span className="tnum font-medium text-ink">${Math.round(evMaintCost / 12)}</span></div>
                <div className="flex justify-between text-[13px]"><span className="text-ink-2">Insurance</span><span className="tnum font-medium text-ink">${evInsurance}</span></div>
                <div className="mt-2 flex items-baseline justify-between border-t border-line pt-2"><span className="text-sm font-medium text-ink">Total</span><span className="tnum text-xl font-semibold text-ink">${Math.round(stats.evMonthlyTotal)}/mo</span></div>
              </div>
            </Card>
          </div>

          {/* Chart */}
          <Card className="p-6 h-[350px]">
            <h3 className="mb-4 text-sm font-semibold text-ink">{ownYears}-Year Total Cost of Ownership</h3>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={stats.chartData} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }} {...barChartProps}>
                <XAxis {...xAxisProps} type="number" tickFormatter={currencyTick} />
                <YAxis {...yAxisProps} type="category" dataKey="name" width={130} />
                <Tooltip {...barTooltip} formatter={currencyValue} />
                <Legend {...legendProps} />
                <Bar {...barProps} dataKey="payment" name="Loan / Lease" stackId="a" fill={TCO_FILLS.payment} radius={[0, 0, 0, 0]} />
                <Bar {...barProps} dataKey="fuel" name="Fuel / Energy" stackId="a" fill={TCO_FILLS.fuel} radius={[0, 0, 0, 0]} />
                <Bar {...barProps} dataKey="insurance" name="Insurance" stackId="a" fill={TCO_FILLS.insurance} radius={[0, 0, 0, 0]} />
                <Bar {...barProps} dataKey="maintenance" name="Maintenance" stackId="a" fill={TCO_FILLS.maintenance} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card className="p-6 h-[320px]">
            <h3 className="mb-1 text-sm font-semibold text-ink">When Does the EV Pull Ahead?</h3>
            <p className="mb-3 text-xs text-ink-3">Cumulative money spent — the EV wins where blue drops below orange.</p>
            <ResponsiveContainer width="100%" height="78%">
              <AreaChart data={stats.cumulative} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis {...xAxisProps} dataKey="month" tickFormatter={m => `${Math.round(m / 12)}y`} interval={3} />
                <YAxis {...yAxisProps} tickFormatter={currencyTick} />
                <Tooltip {...chartTooltip} formatter={currencyValue} labelFormatter={m => `Month ${m}`} />
                <Legend {...legendProps} />
                <Area {...areaProps} type="monotone" dataKey="ice" name="Keep the gas car" stroke={SERIES.grid} fill={SERIES.grid} />
                <Area {...areaProps} type="monotone" dataKey="ev" name={selectedEV.name} stroke={SERIES.solar} fill={SERIES.solar} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
          <button type="button" onClick={() => onExport({ selectedEV: selectedEV.name, year: selectedEV.year, trim: selectedEV.trim, savings: Math.round(Math.abs(stats.totalSavings)), gasCostYear: Math.round(stats.gasCostYear), evCostYear: Math.round(stats.elecCostYear), currentMonthly: Math.round(stats.currentMonthlyTotal), evMonthly: Math.round(stats.evMonthlyTotal), purchaseMethod: evPurchaseMethod, years: ownYears })} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface px-6 py-2.5 text-sm font-medium text-ink hover:border-baseline"><FileText size={16} /> Export to Proposal</button>
        </div>
      </div>
    </div>
  );
};

export default EVCalculator;
