import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, Battery, Calculator, Car, CheckCircle2, DollarSign, FileText, Home, Scale, Search, Wallet, Zap } from 'lucide-react';
import { Card, InputField } from '../components/ui';
import { axisStroke, darkTooltip, gridStroke } from '../components/chartTheme';
import { evDatabase } from '../data/evDatabase';

// --- TOOL: EV CALCULATOR (Expanded) ---
const EVCalculator = ({ onExport }) => {
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

  const calcMonthlyPayment = (principal, annualRate, months) => {
    if (principal <= 0 || months <= 0) return 0;
    const r = annualRate / 100 / 12;
    if (r === 0) return principal / months;
    return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  };
  const evMonthlyFinance = calcMonthlyPayment(evPrice - evDownPayment, evInterestRate, evLoanTerm);

  const toggleCompare = (ev) => {
    setCompareList(prev => {
      const exists = prev.find(e => e.id === ev.id);
      if (exists) return prev.filter(e => e.id !== ev.id);
      if (prev.length >= 3) return prev;
      return [...prev, ev];
    });
  };

  const getStats = (ev, yrs = ownYears) => {
    const months = yrs * 12;
    const gallonsPerYear = annualMiles / iceMPG;
    const gasCostYear = gallonsPerYear * gasPrice;
    // Efficiency values are EPA wall-to-wheels (MPGe ÷ 33.7), so charging losses
    // are already included — do NOT add another loss factor.
    const kwhPerYear = annualMiles / ev.eff;
    const elecCostYear = kwhPerYear * elecRate;

    const currentMonthlyLoan = currentCarStatus === 'loan' ? currentCarPayment : 0;
    const currentMonthlyTotal = currentMonthlyLoan + (gasCostYear / 12) + (iceMaintCost / 12) + currentInsurance;

    let evMonthlyPayment = 0;
    if (evPurchaseMethod === 'finance') evMonthlyPayment = evMonthlyFinance;
    else if (evPurchaseMethod === 'lease') evMonthlyPayment = evLeasePayment;
    const evMonthlyTotal = evMonthlyPayment + (elecCostYear / 12) + (evMaintCost / 12) + evInsurance + (evRegFee / 12);

    const currentCarLoanMonths = currentCarStatus === 'loan' ? Math.min(currentCarMonthsLeft, months) : 0;
    const totalCurrentLoan = currentMonthlyLoan * currentCarLoanMonths;
    const totalIceCost = (gasCostYear + iceMaintCost) * yrs + totalCurrentLoan + (currentInsurance * 12 * yrs);

    let totalEvPayments = 0;
    let resaleCredit = 0;
    if (evPurchaseMethod === 'finance') {
      totalEvPayments = evMonthlyFinance * Math.min(evLoanTerm, months) + evDownPayment;
      resaleCredit = evPrice * (resalePct / 100);
    } else if (evPurchaseMethod === 'lease') {
      // A lease doesn't stop costing money when the term ends — assume renewal
      totalEvPayments = evLeasePayment * months + evLeaseDueAtSigning * Math.max(1, months / Math.max(1, evLeaseTerm));
    } else {
      totalEvPayments = evPrice;
      resaleCredit = evPrice * (resalePct / 100);
    }
    const totalEvCost = (elecCostYear + evMaintCost + evRegFee) * yrs + totalEvPayments + (evInsurance * 12 * yrs) - tradeInValue - resaleCredit;

    const totalSavings = totalIceCost - totalEvCost;

    // Per-mile + emissions
    const gasCPM = (gasPrice / iceMPG) * 100;
    const evCPM = (elecRate / ev.eff) * 100;
    const co2TonsYear = (gallonsPerYear * 8.887) / 1000; // kg CO2 per gallon burned
    // CA grid ≈ 0.24 kg/kWh; at-home solar charging ≈ 0
    const evCo2TonsYear = (kwhPerYear * (elecRate <= 0.10 ? 0 : 0.24)) / 1000;
    const co2Avoided = Math.max(0, co2TonsYear - evCo2TonsYear);

    // Monthly cumulative series for the break-even chart
    const cumulative = [];
    let ice = 0, evc = evPurchaseMethod === 'finance' ? evDownPayment : evPurchaseMethod === 'lease' ? evLeaseDueAtSigning : evPrice;
    evc -= tradeInValue;
    let breakEvenMonth = null;
    for (let m = 1; m <= months; m++) {
      ice += gasCostYear / 12 + iceMaintCost / 12 + currentInsurance + (currentCarStatus === 'loan' && m <= currentCarMonthsLeft ? currentCarPayment : 0);
      evc += elecCostYear / 12 + evMaintCost / 12 + evInsurance + evRegFee / 12;
      if (evPurchaseMethod === 'finance' && m <= evLoanTerm) evc += evMonthlyFinance;
      if (evPurchaseMethod === 'lease') { evc += evLeasePayment; if (m > evLeaseTerm && m % evLeaseTerm === 1) evc += evLeaseDueAtSigning; }
      if (m % 3 === 0 || m === months) cumulative.push({ month: m, ice: Math.round(ice), ev: Math.round(evc) });
      if (breakEvenMonth === null && evc < ice) breakEvenMonth = m;
    }

    return { totalIceCost, totalEvCost, totalSavings, gasCostYear, elecCostYear, currentMonthlyTotal, evMonthlyTotal, evMonthlyPayment, gasCPM, evCPM, co2Avoided, cumulative, breakEvenMonth, resaleCredit };
  };

  const stats = useMemo(() => {
    const s = getStats(selectedEV);
    const mo = ownYears * 12;
    const currentLoanTot = currentCarStatus === 'loan' ? currentCarPayment * Math.min(currentCarMonthsLeft, mo) : 0;
    let evPaymentsTot = 0;
    if (evPurchaseMethod === 'finance') evPaymentsTot = evMonthlyFinance * Math.min(evLoanTerm, mo) + evDownPayment;
    else if (evPurchaseMethod === 'lease') evPaymentsTot = evLeasePayment * mo + evLeaseDueAtSigning * Math.max(1, mo / Math.max(1, evLeaseTerm));
    else evPaymentsTot = evPrice;
    return {
      ...s, chartData: [
        { name: 'Current Car', fuel: s.gasCostYear * ownYears, maintenance: iceMaintCost * ownYears, payment: currentLoanTot, insurance: currentInsurance * mo },
        { name: selectedEV.name, fuel: s.elecCostYear * ownYears, maintenance: (evMaintCost + evRegFee) * ownYears, payment: Math.max(0, evPaymentsTot - tradeInValue - s.resaleCredit), insurance: evInsurance * mo },
      ]
    };
  }, [selectedEV, annualMiles, gasPrice, iceMPG, elecRate, iceMaintCost, evMaintCost, currentCarStatus, currentCarPayment, currentCarMonthsLeft, currentInsurance, evPurchaseMethod, evPrice, evDownPayment, evLoanTerm, evInterestRate, evLeasePayment, evLeaseTerm, evLeaseDueAtSigning, evInsurance, evMonthlyFinance, ownYears, evRegFee, tradeInValue, resalePct]);
  const isSaving = stats.totalSavings >= 0;

  const categoryColors = { Sedan: 'text-sky-400 bg-sky-500/15', SUV: 'text-emerald-400 bg-emerald-500/15', Truck: 'text-amber-400 bg-amber-500/15', Compact: 'text-violet-400 bg-violet-500/15', PHEV: 'text-orange-400 bg-orange-500/15' };

  return (
    <div className="max-w-7xl mx-auto animate-fadeIn">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2"><Car className="text-sky-400" /> EV vs. Gas Calculator</h2>
        <p className="text-slate-400">See whether an EV would cost you less each month and over five years. Compare {evDatabase.length} models from {makes.length} manufacturers.</p>
      </div>

      {/* Filters */}
      <Card className="p-5 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Search</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input type="text" placeholder="Search vehicles..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm font-medium" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Make</label>
            <select value={filterMake} onChange={(e) => setFilterMake(e.target.value)} className="px-3 py-2.5 rounded-xl text-sm font-medium min-w-[140px]">
              <option value="All">All Makes</option>
              {makes.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Year</label>
            <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="px-3 py-2.5 rounded-xl text-sm font-medium min-w-[110px]">
              <option value="All">All Years</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Type</label>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-3 py-2.5 rounded-xl text-sm font-medium min-w-[120px]">
              <option value="All">All Types</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button onClick={() => { setCompareMode(!compareMode); if (compareMode) setCompareList([]); }}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${compareMode ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'bg-slate-700/40 text-slate-400 hover:bg-slate-700/60'}`}>
            <Scale size={16} className="inline mr-1.5" />{compareMode ? `Compare (${compareList.length}/3)` : 'Compare'}
          </button>
        </div>
      </Card>

      {/* Compare View */}
      {compareMode && compareList.length >= 2 && (
        <div className="mb-6 animate-slideUp">
          <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2"><Scale className="text-violet-400" size={20} /> Side-by-Side Comparison</h3>
          <div className={`grid gap-4 ${compareList.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
            {compareList.map(ev => {
              const s = getStats(ev);
              const saving = s.totalSavings >= 0;
              return (
                <Card key={ev.id} className="p-5 border border-violet-500/20">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-slate-100">{ev.name}</h4>
                      <p className="text-xs text-slate-400">{ev.year} {ev.trim}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${categoryColors[ev.category] || 'text-slate-400 bg-slate-700/40'}`}>{ev.category}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-800/50 p-3 rounded-xl"><p className="text-xs text-slate-500 mb-1">Range</p><p className="font-bold text-slate-200">{ev.range} mi</p></div>
                    <div className="bg-slate-800/50 p-3 rounded-xl"><p className="text-xs text-slate-500 mb-1">Battery</p><p className="font-bold text-slate-200">{ev.battery} kWh</p></div>
                    <div className="bg-slate-800/50 p-3 rounded-xl"><p className="text-xs text-slate-500 mb-1">Efficiency</p><p className="font-bold text-slate-200">{ev.eff} mi/kWh</p></div>
                    <div className="bg-slate-800/50 p-3 rounded-xl"><p className="text-xs text-slate-500 mb-1">Annual Fuel</p><p className="font-bold text-sky-400">${Math.round(s.elecCostYear).toLocaleString()}</p></div>
                  </div>
                  <div className={`p-3 rounded-xl text-center ${saving ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                    <p className={`text-xs font-bold uppercase mb-1 ${saving ? 'text-emerald-400' : 'text-red-400'}`}>{ownYears}-Year {saving ? 'Savings' : 'Cost'}</p>
                    <p className={`text-2xl font-black ${saving ? 'text-emerald-400' : 'text-red-400'}`}>${Math.round(Math.abs(s.totalSavings)).toLocaleString()}</p>
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
            <h3 className="font-bold text-lg mb-3 text-slate-200 flex justify-between items-center">
              <span>Vehicles <span className="text-sm text-slate-400 font-medium">({filteredEVs.length})</span></span>
            </h3>
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {filteredEVs.map(ev => {
                const isSelected = selectedEV.id === ev.id;
                const inCompare = compareList.find(e => e.id === ev.id);
                return (
                  <div key={ev.id}
                    onClick={() => { if (compareMode) toggleCompare(ev); else setSelectedEV(ev); }}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${isSelected && !compareMode ? 'border-sky-500/40 bg-sky-500/10' :
                      inCompare ? 'border-violet-500/40 bg-violet-500/10' :
                        'border-slate-700/30 hover:border-slate-600 hover:bg-slate-800/50'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold text-sm truncate ${isSelected && !compareMode ? 'text-sky-300' : inCompare ? 'text-violet-300' : 'text-slate-200'}`}>{ev.name}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${categoryColors[ev.category] || 'text-slate-400 bg-slate-700/40'}`}>{ev.category}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{ev.year} · {ev.trim} · {ev.range} mi · {ev.eff} mi/kWh</p>
                    </div>
                    {compareMode && (
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ml-2 ${inCompare ? 'border-violet-400 bg-violet-500' : 'border-slate-600'}`}>
                        {inCompare && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredEVs.length === 0 && <p className="text-center text-slate-500 py-6">No vehicles match your filters.</p>}
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="font-bold text-lg mb-4 text-slate-200">Driving & Costs</h3>
            <div className="mb-4"><label className="text-sm font-medium text-slate-300 block mb-2">Current Car MPG</label>
              <div className="flex gap-2 mb-2">{gasCarPresets.map(preset => (
                <button key={preset.label} onClick={() => setIceMPG(preset.mpg)} className={`flex-1 px-2 py-1.5 text-xs font-bold rounded-lg border transition-all ${iceMPG === preset.mpg ? 'bg-sky-500/15 text-sky-400 border-sky-500/30' : 'text-slate-400 border-slate-700/50 hover:bg-slate-700/50'}`}>{preset.label} ({preset.mpg})</button>
              ))}</div>
            </div>
            <InputField label="Annual Mileage" value={annualMiles} onChange={setAnnualMiles} unit="mi/yr" step="500" />
            <InputField label="Gas Price" value={gasPrice} onChange={setGasPrice} unit="$/gal" />
            <div className="mb-2"><label className="text-sm font-medium text-slate-300 block mb-2">Where does the charge come from?</label>
              <div className="flex gap-2 mb-2">{[{ l: '☀️ Home Solar', r: 0.07 }, { l: 'Off-Peak Grid', r: 0.31 }, { l: 'Standard Grid', r: 0.40 }].map(o => (
                <button key={o.l} onClick={() => setElecRate(o.r)} className={`flex-1 px-2 py-1.5 text-xs font-bold rounded-lg border transition-all ${Math.abs(elecRate - o.r) < 0.001 ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'text-slate-400 border-slate-700/50 hover:bg-slate-700/50'}`}>{o.l}</button>
              ))}</div></div>
            <InputField label="EV Charging Rate" value={elecRate} onChange={setElecRate} unit="$/kWh" step="0.01" tooltip="Home Solar ≈ your levelized cost of self-generated power (~7¢). Vehicle efficiencies are EPA wall-to-wheels, so charging losses are already counted." />
          </Card>
          <Card className="p-5">
            <h3 className="font-bold text-lg mb-4 text-slate-200 flex items-center gap-2"><Wallet className="text-violet-400" /> Financing & Insurance</h3>
            {/* Current car status */}
            <div className="mb-4">
              <label className="text-sm font-medium text-slate-300 block mb-2">Current Vehicle</label>
              <div className="flex gap-2 mb-3">{[{ v: 'paidoff', l: 'Paid Off' }, { v: 'loan', l: 'Has Loan' }].map(o => (
                <button key={o.v} onClick={() => setCurrentCarStatus(o.v)} className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg border transition-all ${currentCarStatus === o.v ? 'bg-sky-500/15 text-sky-400 border-sky-500/30' : 'text-slate-400 border-slate-700/50 hover:bg-slate-700/50'}`}>{o.l}</button>
              ))}</div>
              {currentCarStatus === 'loan' && (<><InputField label="Monthly Car Payment" value={currentCarPayment} onChange={setCurrentCarPayment} unit="$/mo" step="10" /><InputField label="Months Remaining" value={currentCarMonthsLeft} onChange={setCurrentCarMonthsLeft} unit="mo" step="1" /></>)}
              <InputField label="Current Insurance" value={currentInsurance} onChange={setCurrentInsurance} unit="$/mo" step="5" />
            </div>
            <div className="h-px bg-slate-700/40 my-4"></div>
            {/* EV purchase method */}
            <div className="mb-3">
              <label className="text-sm font-medium text-slate-300 block mb-2">EV Purchase Method</label>
              <div className="flex gap-2 mb-3">{[{ v: 'finance', l: 'Finance' }, { v: 'lease', l: 'Lease' }, { v: 'cash', l: 'Cash' }].map(o => (
                <button key={o.v} onClick={() => setEvPurchaseMethod(o.v)} className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg border transition-all ${evPurchaseMethod === o.v ? 'bg-violet-500/15 text-violet-400 border-violet-500/30' : 'text-slate-400 border-slate-700/50 hover:bg-slate-700/50'}`}>{o.l}</button>
              ))}</div>
            </div>
            {evPurchaseMethod === 'finance' && (<>
              <InputField label="EV Price" value={evPrice} onChange={setEvPrice} unit="$" step="500" />
              <InputField label="Down Payment" value={evDownPayment} onChange={setEvDownPayment} unit="$" step="500" />
              <div className="grid grid-cols-2 gap-3"><InputField label="Loan Term" value={evLoanTerm} onChange={setEvLoanTerm} unit="mo" step="12" /><InputField label="Interest Rate" value={evInterestRate} onChange={setEvInterestRate} unit="%" step="0.25" /></div>
              <div className="mt-2 p-3 bg-violet-500/10 rounded-lg border border-violet-500/20"><div className="flex justify-between text-sm"><span className="text-violet-300">Monthly Payment</span><span className="font-bold text-violet-400">${Math.round(evMonthlyFinance)}/mo</span></div></div>
            </>)}
            {evPurchaseMethod === 'lease' && (<>
              <InputField label="Monthly Lease" value={evLeasePayment} onChange={setEvLeasePayment} unit="$/mo" step="10" />
              <InputField label="Lease Term" value={evLeaseTerm} onChange={setEvLeaseTerm} unit="mo" step="12" />
              <InputField label="Due at Signing" value={evLeaseDueAtSigning} onChange={setEvLeaseDueAtSigning} unit="$" step="500" />
            </>)}
            {evPurchaseMethod === 'cash' && (<InputField label="Purchase Price" value={evPrice} onChange={setEvPrice} unit="$" step="500" />)}
            <InputField label="EV Insurance" value={evInsurance} onChange={setEvInsurance} unit="$/mo" step="5" />
            <div className="h-px bg-slate-700/40 my-4"></div>
            <InputField label="Trade-In Value (current car)" value={tradeInValue} onChange={setTradeInValue} unit="$" step="500" tooltip="What you'd get selling or trading your current car — credited against the EV." />
            {evPurchaseMethod !== 'lease' && <InputField label="EV Resale Value After Ownership" value={resalePct} onChange={setResalePct} unit="%" step="5" tooltip="The EV is still worth something when you're done — credited at the end. 40–50% at 5 years is typical." />}
            <InputField label="Annual EV Registration Fee" value={evRegFee} onChange={setEvRegFee} unit="$/yr" step="10" tooltip="Many states charge EVs a road fee since they skip gas taxes — CA's is ~$118/yr." />
          </Card>
        </div>

        {/* Results */}
        <div className="lg:col-span-7 space-y-6">
          {/* Selected EV Spec Card */}
          <Card className="p-6 border border-sky-500/15">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-5">
              <div>
                <p className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-1">Selected Vehicle</p>
                <h3 className="text-xl font-bold text-slate-100">{selectedEV.name}</h3>
                <p className="text-sm text-slate-400">{selectedEV.year} · {selectedEV.trim}</p>
              </div>
              <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${categoryColors[selectedEV.category]}`}>{selectedEV.category}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-800/60 p-3 rounded-xl text-center"><Zap size={16} className="text-amber-400 mx-auto mb-1" /><p className="text-lg font-bold text-slate-100">{selectedEV.range}</p><p className="text-xs text-slate-500">Miles Range</p></div>
              <div className="bg-slate-800/60 p-3 rounded-xl text-center"><Battery size={16} className="text-emerald-400 mx-auto mb-1" /><p className="text-lg font-bold text-slate-100">{selectedEV.battery}</p><p className="text-xs text-slate-500">kWh Battery</p></div>
              <div className="bg-slate-800/60 p-3 rounded-xl text-center"><ArrowRight size={16} className="text-sky-400 mx-auto mb-1" /><p className="text-lg font-bold text-slate-100">{selectedEV.eff}</p><p className="text-xs text-slate-500">mi/kWh</p></div>
              <div className="bg-slate-800/60 p-3 rounded-xl text-center"><DollarSign size={16} className="text-violet-400 mx-auto mb-1" /><p className="text-lg font-bold text-slate-100">${Math.round(stats.elecCostYear)}</p><p className="text-xs text-slate-500">Annual Fuel</p></div>
            </div>
          </Card>

          {/* Ownership period */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ownership period</span>
            {[3, 5, 8, 10].map(y => (<button key={y} onClick={() => setOwnYears(y)} className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${ownYears === y ? 'bg-sky-500/15 text-sky-400 border-sky-500/30' : 'text-slate-400 border-slate-700/50 hover:bg-slate-700/50'}`}>{y} yrs</button>))}
          </div>

          {/* Savings Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className={`p-4 border text-center ${isSaving ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${isSaving ? 'text-emerald-400' : 'text-red-400'}`}>{isSaving ? `${ownYears}-Year Savings` : `${ownYears}-Year Cost Increase`}</div>
              <div className={`text-3xl font-black ${isSaving ? 'text-emerald-400' : 'text-red-400'}`}>${Math.round(Math.abs(stats.totalSavings)).toLocaleString()}</div>
            </Card>
            <Card className="p-4 text-center"><div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Gas Annual Fuel</div><div className="text-2xl font-bold text-slate-300">${Math.round(stats.gasCostYear).toLocaleString()}</div></Card>
            <Card className="p-4 text-center"><div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">EV Annual Fuel</div><div className="text-2xl font-bold text-sky-400">${Math.round(stats.elecCostYear).toLocaleString()}</div></Card>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 text-center"><div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Cost Per Mile</div><div className="text-xl font-bold"><span className="text-slate-300">{stats.gasCPM.toFixed(0)}¢</span><span className="text-slate-500 text-sm mx-1.5">gas →</span><span className="text-sky-400">{stats.evCPM.toFixed(1)}¢</span><span className="text-slate-500 text-sm ml-1">EV</span></div></Card>
            <Card className="p-4 text-center bg-emerald-500/5"><div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">CO₂ Avoided</div><div className="text-xl font-bold text-emerald-400">{stats.co2Avoided.toFixed(1)} tons/yr</div><div className="text-[11px] text-slate-500">≈ {Math.round(stats.co2Avoided * 1000 / 21)} trees planted</div></Card>
            <Card className="p-4 text-center"><div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Cash-Flow Break Even</div><div className="text-xl font-bold text-amber-400">{stats.breakEvenMonth ? `${Math.floor(stats.breakEvenMonth / 12)}y ${stats.breakEvenMonth % 12}m` : 'Beyond ' + ownYears + ' yrs'}</div><div className="text-[11px] text-slate-500">before resale credit</div></Card>
          </div>

          {/* Monthly Cost Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Current Car Monthly</p>
              <div className="space-y-2">
                {currentCarStatus === 'loan' && <div className="flex justify-between text-sm"><span className="text-slate-400">Car Payment</span><span className="font-bold text-slate-200">${currentCarPayment}</span></div>}
                <div className="flex justify-between text-sm"><span className="text-slate-400">Gas</span><span className="font-bold text-slate-200">${Math.round(stats.gasCostYear / 12)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-400">Maintenance</span><span className="font-bold text-slate-200">${Math.round(iceMaintCost / 12)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-400">Insurance</span><span className="font-bold text-slate-200">${currentInsurance}</span></div>
                <div className="pt-2 mt-2 border-t border-slate-700/50 flex justify-between"><span className="font-bold text-slate-200">Total</span><span className="text-xl font-black text-slate-100">${Math.round(stats.currentMonthlyTotal)}/mo</span></div>
              </div>
            </Card>
            <Card className="p-5 border border-sky-500/15">
              <p className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-3">EV Monthly</p>
              <div className="space-y-2">
                {evPurchaseMethod !== 'cash' && <div className="flex justify-between text-sm"><span className="text-slate-400">{evPurchaseMethod === 'finance' ? 'Loan' : 'Lease'}</span><span className="font-bold text-slate-200">${Math.round(stats.evMonthlyPayment)}</span></div>}
                <div className="flex justify-between text-sm"><span className="text-slate-400">Electricity</span><span className="font-bold text-sky-400">${Math.round(stats.elecCostYear / 12)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-400">Maintenance</span><span className="font-bold text-slate-200">${Math.round(evMaintCost / 12)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-400">Insurance</span><span className="font-bold text-slate-200">${evInsurance}</span></div>
                <div className="pt-2 mt-2 border-t border-slate-700/50 flex justify-between"><span className="font-bold text-slate-200">Total</span><span className="text-xl font-black text-sky-400">${Math.round(stats.evMonthlyTotal)}/mo</span></div>
              </div>
            </Card>
          </div>

          {/* Chart */}
          <Card className="p-6 h-[350px]">
            <h3 className="font-bold text-lg mb-4 text-slate-200">{ownYears}-Year Total Cost of Ownership</h3>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={stats.chartData} layout="vertical" margin={{ left: 40 }} barSize={50}>
                <XAxis type="number" tickFormatter={(val) => `$${val / 1000}k`} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, fontWeight: 'bold' }} />
                <Tooltip cursor={{ fill: 'transparent' }} formatter={(val) => `$${val.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="payment" name="Loan / Lease" stackId="a" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="fuel" name="Fuel / Energy" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
                <Bar dataKey="insurance" name="Insurance" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="maintenance" name="Maintenance" stackId="a" fill="#f59e0b" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card className="p-6 h-[320px]">
            <h3 className="font-bold text-lg mb-1 text-slate-200">When Does the EV Pull Ahead?</h3>
            <p className="text-xs text-slate-400 mb-3">Cumulative money spent — the EV wins where blue drops below red.</p>
            <ResponsiveContainer width="100%" height="78%">
              <AreaChart data={stats.cumulative} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                <XAxis dataKey="month" stroke={axisStroke} tickFormatter={m => `${Math.round(m / 12)}y`} interval={3} />
                <YAxis tickFormatter={v => `$${Math.round(v / 1000)}k`} stroke={axisStroke} />
                <Tooltip {...darkTooltip} formatter={v => `$${v.toLocaleString()}`} labelFormatter={m => `Month ${m}`} />
                <Legend />
                <Area type="monotone" dataKey="ice" name="Keep the gas car" stroke="#ef4444" fill="none" strokeWidth={2.5} strokeDasharray="6 4" />
                <Area type="monotone" dataKey="ev" name={selectedEV.name} stroke="#38bdf8" fill="none" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
          <button onClick={() => onExport({ selectedEV: selectedEV.name, year: selectedEV.year, trim: selectedEV.trim, savings: Math.round(Math.abs(stats.totalSavings)), gasCostYear: Math.round(stats.gasCostYear), evCostYear: Math.round(stats.elecCostYear), currentMonthly: Math.round(stats.currentMonthlyTotal), evMonthly: Math.round(stats.evMonthlyTotal), purchaseMethod: evPurchaseMethod, years: ownYears })} className="w-full mt-4 flex items-center justify-center gap-2 bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 px-6 py-3 rounded-xl font-bold transition-all border border-violet-500/20"><FileText size={18} /> Export to Proposal</button>
        </div>
      </div>
    </div>
  );
};

export default EVCalculator;
