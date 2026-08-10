import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, DollarSign, Sun, Wallet } from 'lucide-react';
import AssumptionsPanel from '../components/AssumptionsPanel';
import { axisStroke, darkTooltip, gridStroke } from '../components/chartTheme';
import { Card, InputField } from '../components/ui';
import { calculatePMT, findBreakEven, runRoiSimulation } from '../engine/roi';
import { LOAD_SHAPES, SUN_PROFILES, annualSunHours } from '../engine/solar';

const PEAK_SHARE = 35;
const PEAK_RATE = 0.58;
const OFF_PEAK_RATE = 0.42;
const RATE_ESCALATION = 5;
const EXPORT_RATE = 0.04;
const BLENDED_RATE = PEAK_RATE * PEAK_SHARE / 100 + OFF_PEAK_RATE * (1 - PEAK_SHARE / 100);

const loadChoices = {
  Flat: 'Steady all year',
  'Summer Peak (AC)': 'More AC in summer',
  'Winter Peak (Heat)': 'More electric heat in winter',
  'Dual Peak (AC + Heat)': 'AC in summer + heat in winter',
};

const SimpleSolarROI = ({ onNavigate }) => {
  const [monthlyBill, setMonthlyBill] = useState(250);
  const [sunProfile, setSunProfile] = useState('CA Central Valley');
  const [loadShape, setLoadShape] = useState('Dual Peak (AC + Heat)');
  const [systemCostOverride, setSystemCostOverride] = useState(null);
  const [payMethod, setPayMethod] = useState('loan');
  // IRC 25D ended for post-2025 installs under the law signed 2025-07-04; IRC 48E applies to qualifying third-party owners.
  const [incentives, setIncentives] = useState(0);

  const safeBill = Number.isFinite(monthlyBill) ? Math.max(0, monthlyBill) : 0;
  const dailyUsage = safeBill / 30 / BLENDED_RATE;
  const solarSize = Math.round((dailyUsage / annualSunHours(sunProfile)) * 10) / 10;
  const estimatedCost = Math.round(solarSize * 3000 / 100) * 100;
  const systemCost = systemCostOverride ?? estimatedCost;
  const netSystemCost = Math.max(0, systemCost - Math.max(0, incentives || 0));
  const loanInterest = payMethod === 'loan' ? 7.99 : 0;
  const loanTerm = payMethod === 'loan' ? 25 : 1;
  const monthlyPayment = calculatePMT(netSystemCost, loanInterest, loanTerm);

  const simParams = {
    loanAmount: systemCost,
    incentives,
    loanInterest,
    loanTerm,
    proposalMode: 'new',
    existingSolarType: 'loan',
    existingSolarBalance: 0,
    existingSolarPayment: 0,
    ppaEscalator: 0,
    batteryCapacity: 0,
    depthOfDischarge: 100,
    minSoC: 10,
    roundTripEfficiency: 90,
    degradationRate: 1,
    dailyUsage,
    peakUsagePercent: PEAK_SHARE,
    ratePeak: PEAK_RATE,
    rateOffPeak: OFF_PEAK_RATE,
    inflationRate: RATE_ESCALATION,
    solarSize,
    sunProfile,
    monthlyFixedCharge: 15,
    solarExportRate: EXPORT_RATE,
    loadShape,
    strategy: 'self',
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const simulation = useMemo(() => runRoiSimulation(simParams), [JSON.stringify(simParams)]);
  const payback = findBreakEven(simulation);
  const year1 = simulation[1];
  const year25 = simulation[25];
  const savings25 = Math.max(0, year25.statusQuo - year25.proposed);

  return (
    <main className="mx-auto max-w-6xl animate-fadeIn">
      <header className="mb-6">
        <p className="text-sm font-bold uppercase tracking-wider text-amber-400">Simple Solar ROI</p>
        <h1 className="mt-2 flex items-center gap-3 text-3xl font-black text-slate-100"><Sun className="text-amber-400" /> Is solar worth it for me?</h1>
        <p className="mt-2 text-slate-400">Use a recent monthly bill for a quick estimate. You can inspect every assumption below.</p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="space-y-6 lg:col-span-4" aria-label="Your inputs">
          <Card className="p-5 sm:p-6">
            <InputField label="Monthly electric bill now" value={monthlyBill} onChange={setMonthlyBill} unit="$ / mo" step="10" />
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-slate-300">Region</label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {Object.keys(SUN_PROFILES).map(region => <button key={region} onClick={() => setSunProfile(region)} className={`rounded-lg border px-3 py-2 text-left text-xs font-bold ${sunProfile === region ? 'border-amber-500/40 bg-amber-500/15 text-amber-300' : 'border-slate-700/50 text-slate-400 hover:bg-slate-700/30'}`}>{region}</button>)}
              </div>
            </div>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-slate-300">Roughly how you use power</label>
              <div className="space-y-2">
                {Object.keys(LOAD_SHAPES).map(shape => <button key={shape} onClick={() => setLoadShape(shape)} className={`w-full rounded-lg border px-3 py-2 text-left text-xs font-bold ${loadShape === shape ? 'border-sky-500/40 bg-sky-500/15 text-sky-300' : 'border-slate-700/50 text-slate-400 hover:bg-slate-700/30'}`}>{loadChoices[shape]}</button>)}
              </div>
            </div>
            <InputField label="Estimated system cost" value={systemCost} onChange={setSystemCostOverride} unit="$" step="100" tooltip={`Starts at $3.00/W for the estimated ${solarSize.toFixed(1)} kW system. Replace it with a real quote when you have one.`} />
            {systemCostOverride !== null && <button onClick={() => setSystemCostOverride(null)} className="-mt-2 mb-4 text-xs font-bold text-sky-400 hover:text-sky-300">Reset to ${estimatedCost.toLocaleString()} estimate</button>}
            <InputField label="Incentives / rebates" value={incentives} onChange={setIncentives} unit="$" step="100" tooltip="The 30% federal credit for owned systems ended after Dec. 31, 2025. A lease/PPA provider may claim a federal credit through 2027 and reflect it in your rate. Enter only confirmed state, local, or utility rebates." />
            <div className="grid grid-cols-2 gap-2" aria-label="Payment method">
              {['cash', 'loan'].map(method => <button key={method} onClick={() => setPayMethod(method)} className={`rounded-xl border px-3 py-3 text-sm font-bold capitalize ${payMethod === method ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300' : 'border-slate-700/50 text-slate-400'}`}>{method}</button>)}
            </div>
            <p className="mt-3 text-xs text-slate-500">Loan estimate: 7.99% for 25 years. Cash is modeled as paid in year one.</p>
          </Card>
        </section>

        <section className="space-y-6 lg:col-span-8" aria-label="Your estimate">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="p-4"><p className="text-xs text-slate-400">Payback</p><p className="mt-1 text-2xl font-black text-amber-400">{payback ? `${payback} yrs` : '25+ yrs'}</p></Card>
            <Card className="p-4"><p className="text-xs text-slate-400">Bill before</p><p className="mt-1 text-2xl font-black text-slate-200">${year1.monthlyBillNow}</p></Card>
            <Card className="p-4"><p className="text-xs text-slate-400">Bill after solar</p><p className="mt-1 text-2xl font-black text-emerald-400">${year1.monthlyBillFuture}</p>{payMethod === 'loan' && <p className="mt-1 text-[11px] text-slate-500">includes ${Math.round(monthlyPayment)}/mo loan</p>}</Card>
            <Card className="p-4"><p className="text-xs text-slate-400">25-year savings</p><p className="mt-1 text-2xl font-black text-emerald-400">${Math.round(savings25).toLocaleString()}</p></Card>
          </div>

          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div><h2 className="font-bold text-slate-200">Cumulative cost</h2><p className="text-sm text-slate-400">Doing nothing compared with solar, including financing.</p></div>
              <div className="text-sm text-slate-400"><strong className="text-slate-200">{solarSize.toFixed(1)} kW</strong> system · {dailyUsage.toFixed(1)} kWh/day</div>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%"><AreaChart data={simulation} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} /><XAxis dataKey="year" stroke={axisStroke} /><YAxis stroke={axisStroke} width={52} tickFormatter={value => `$${Math.round(value / 1000)}k`} /><Tooltip {...darkTooltip} formatter={value => `$${Math.round(value).toLocaleString()}`} labelFormatter={year => `Year ${year}`} /><Legend /><Area type="monotone" dataKey="gridOnly" name="Keep buying from utility" stroke="#ef4444" fill="#ef4444" fillOpacity={0.08} /><Area type="monotone" dataKey="proposed" name="Go solar" stroke="#10b981" fill="#10b981" fillOpacity={0.12} /></AreaChart></ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3"><Wallet className="text-sky-400" /><div><p className="font-bold text-slate-200">{payMethod === 'loan' ? `$${Math.round(monthlyPayment)}/month estimated loan` : `$${Math.round(netSystemCost).toLocaleString()} paid in cash`}</p><p className="text-xs text-slate-400">After ${Math.round(Math.max(0, incentives || 0)).toLocaleString()} in confirmed incentives</p></div></div>
              <DollarSign className="hidden text-emerald-400 sm:block" />
            </div>
          </Card>

          <AssumptionsPanel rateEscalation={RATE_ESCALATION} exportRate={EXPORT_RATE} peakRate={PEAK_RATE} offPeakRate={OFF_PEAK_RATE} blendedRate={BLENDED_RATE} />

          <button onClick={() => onNavigate('calculator')} className="flex w-full items-center justify-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/15 px-5 py-3 font-bold text-sky-300 transition-colors hover:bg-sky-500/25">Want every knob? Open the Pro calculator <ArrowRight size={17} /></button>
        </section>
      </div>
    </main>
  );
};

export default SimpleSolarROI;
