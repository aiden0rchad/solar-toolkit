import { useMemo, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Calculator, Droplets, FileText, Home } from 'lucide-react';
import { Card, InputField } from '../components/ui';
import { darkTooltip } from '../components/chartTheme';
import { SUN_PROFILES, annualSunHours } from '../engine/solar';

// --- TOOL: USAGE ESTIMATOR (Enhanced) ---
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

  const ageMultiplier = { 'Pre-1980': 1.3, '1980-2000': 1.1, '2000+': 1.0 };
  const climateMultiplier = { 'Mild': 0.7, 'Hot': 1.0, 'Very Hot': 1.4 };
  const waterHeaterKwh = { 'Gas': 0, 'Electric': 12, 'Heat Pump': 4 };

  const estimation = useMemo(() => {
    const baseLoad = (sqFt * 0.005 * ageMultiplier[homeAge]) + (occupants * 2.5);
    const poolLoad = hasPool ? 8 : 0;
    const evLoad = evMiles * 0.3 * numEVs;
    const acLoad = acUsage * 1.5 * climateMultiplier[climateZone];
    const waterLoad = waterHeaterKwh[waterHeater];
    const dailyTotal = baseLoad + poolLoad + evLoad + acLoad + waterLoad;
    const monthlyKwh = dailyTotal * 30;
    const monthlyBillEst = monthlyKwh * utilityRate;
    const recommendedSystem = (dailyTotal / annualSunHours('CA Central Valley')).toFixed(1);
    const winterSystem = (dailyTotal / SUN_PROFILES['CA Central Valley'][11]).toFixed(1);
    return {
      dailyTotal, monthlyKwh, monthlyBillEst, recommendedSystem, winterSystem,
      breakdown: [
        { name: 'Base Home', value: parseFloat(baseLoad.toFixed(1)) },
        { name: 'Pool', value: poolLoad },
        { name: 'EV Charging', value: parseFloat(evLoad.toFixed(1)) },
        { name: 'HVAC', value: parseFloat(acLoad.toFixed(1)) },
        { name: 'Water Heater', value: waterLoad },
      ]
    };
  }, [sqFt, occupants, hasPool, evMiles, numEVs, acUsage, homeAge, climateZone, waterHeater, utilityRate]);

  return (
    <div className="max-w-5xl mx-auto animate-fadeIn">
      <div className="mb-8"><h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2"><Calculator className="text-sky-400" /> Usage Estimator</h2><p className="text-slate-400">Estimate your home's electricity use when you don't have a bill handy.</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4 text-slate-200">Home Details</h3>
          <InputField label="Square Footage" value={sqFt} onChange={setSqFt} unit="sqft" step="100" />
          <InputField label="Occupants" value={occupants} onChange={setOccupants} unit="ppl" step="1" />
          <div className="mb-3"><label className="text-sm font-medium text-slate-300 block mb-1.5">Home Age</label><div className="flex gap-2">{Object.keys(ageMultiplier).map(a => (<button key={a} onClick={() => setHomeAge(a)} className={`flex-1 px-2 py-1.5 text-xs font-bold rounded-lg border transition-all ${homeAge === a ? 'bg-sky-500/15 text-sky-400 border-sky-500/30' : 'text-slate-400 border-slate-700/50 hover:bg-slate-700/50'}`}>{a}</button>))}</div></div>
          <div className="mb-3"><label className="text-sm font-medium text-slate-300 block mb-1.5">Climate Zone</label><div className="flex gap-2">{Object.keys(climateMultiplier).map(c => (<button key={c} onClick={() => setClimateZone(c)} className={`flex-1 px-2 py-1.5 text-xs font-bold rounded-lg border transition-all ${climateZone === c ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'text-slate-400 border-slate-700/50 hover:bg-slate-700/50'}`}>{c}</button>))}</div></div>
          <div className="mb-3"><label className="text-sm font-medium text-slate-300 block mb-1.5">Water Heater</label><div className="flex gap-2">{Object.keys(waterHeaterKwh).map(w => (<button key={w} onClick={() => setWaterHeater(w)} className={`flex-1 px-2 py-1.5 text-xs font-bold rounded-lg border transition-all ${waterHeater === w ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'text-slate-400 border-slate-700/50 hover:bg-slate-700/50'}`}>{w}</button>))}</div></div>
          <div className="flex items-center justify-between mb-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50"><span className="text-sm font-bold text-slate-300 flex items-center gap-2"><Droplets size={16} /> Pool Pump?</span><input type="checkbox" checked={hasPool} onChange={(e) => setHasPool(e.target.checked)} className="w-5 h-5 rounded" /></div>
          <InputField label="Daily EV Driving" value={evMiles} onChange={setEvMiles} unit="mi/day" step="5" />
          <InputField label="Number of EVs" value={numEVs} onChange={setNumEVs} unit="EVs" step="1" />
          <InputField label="AC Usage (Summer)" value={acUsage} onChange={setAcUsage} unit="hrs/day" step="1" />
          <InputField label="Utility Rate" value={utilityRate} onChange={setUtilityRate} unit="$/kWh" step="0.01" />
        </Card>
        <div className="space-y-6">
          <Card className="p-6 bg-emerald-500/10 border-emerald-500/20">
            <h3 className="text-sm font-bold text-emerald-300 uppercase tracking-wider mb-3">Estimated Usage</h3>
            <div className="flex justify-between items-end mb-1"><span className="text-4xl font-black text-emerald-400">{estimation.dailyTotal.toFixed(1)}</span><span className="text-emerald-400 font-medium mb-1">kWh / Day</span></div>
            <div className="text-sm text-emerald-400/60 mb-4">{estimation.monthlyKwh.toFixed(0)} kWh / Month</div>
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-emerald-500/20">
              <div><p className="text-xs text-emerald-400/60">Est. Monthly Bill</p><p className="text-xl font-bold text-emerald-400">${estimation.monthlyBillEst.toFixed(0)}</p></div>
              <div><p className="text-xs text-emerald-400/60">Recommended System</p><p className="text-xl font-bold text-sky-400">{estimation.recommendedSystem} kW</p><p className="text-[11px] text-slate-500 mt-0.5">winter-independent: {estimation.winterSystem} kW</p></div>
            </div>
          </Card>
          <Card className="p-6 h-64">
            <h3 className="font-bold text-sm text-slate-400 mb-4">Consumption Breakdown</h3>
            <ResponsiveContainer width="100%" height="100%"><BarChart data={estimation.breakdown.filter(i => i.value > 0)} layout="vertical" margin={{ left: 40 }}><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} /><Tooltip {...darkTooltip} cursor={{ fill: 'transparent' }} /><Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} /></BarChart></ResponsiveContainer>
          </Card>
          <button onClick={() => onExport({ dailyKwh: estimation.dailyTotal.toFixed(1), monthlyBill: estimation.monthlyBillEst.toFixed(0), sqFt, occupants, recommendedSystem: estimation.recommendedSystem, breakdown: estimation.breakdown })} className="w-full flex items-center justify-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-6 py-3 rounded-xl font-bold transition-all border border-emerald-500/20"><FileText size={18} /> Export to Proposal</button>
        </div>
      </div>
    </div>
  );
};

export default UsageEstimator;
