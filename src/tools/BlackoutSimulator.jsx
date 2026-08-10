import { useMemo, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Battery, CheckCircle2, FileText, Plus, Sun, Zap } from 'lucide-react';
import { Card, InputField } from '../components/ui';
import { darkTooltip } from '../components/chartTheme';
import { batteryPresets } from '../data/batteryPresets';

// --- TOOL: BLACKOUT SIMULATOR (Enhanced) ---
const BlackoutSimulator = ({ onExport }) => {
  const [batterySize, setBatterySize] = useState(13.5);
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
  const catColors = { Essential: 'text-emerald-400', Comfort: 'text-sky-400', Heavy: 'text-amber-400', Custom: 'text-violet-400' };

  return (
    <div className="max-w-7xl mx-auto animate-fadeIn">
      <div className="mb-8"><h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2"><Battery className="text-emerald-400" /> Blackout Simulator</h2><p className="text-slate-400">Choose what you want to keep running and see how long your battery lasts.</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <Card className="p-5">
            <h3 className="font-bold text-slate-200 mb-3">Battery System</h3>
            <div className="flex flex-wrap gap-2 mb-3">{batteryPresets.map(p => (<button key={p.label} onClick={() => setBatterySize(p.kwh)} className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${batterySize === p.kwh ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'text-slate-400 border-slate-700/50 hover:bg-slate-700/50'}`}>{p.label} ({p.kwh})</button>))}</div>
            <InputField label="Battery Capacity" value={batterySize} onChange={setBatterySize} unit="kWh" step="0.5" />
            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50 mt-2"><span className="text-sm font-bold text-slate-300 flex items-center gap-2"><Sun size={16} className="text-amber-400" /> Solar During Outage?</span><input type="checkbox" checked={solarRecharge} onChange={(e) => setSolarRecharge(e.target.checked)} className="w-5 h-5 rounded" /></div>
            {solarRecharge && <InputField label="Solar System Size" value={solarOutput} onChange={setSolarOutput} unit="kW" step="0.5" />}
          </Card>
          <Card className="p-5">
            <h3 className="font-bold text-slate-200 mb-3 flex items-center gap-2"><Zap className="w-5 h-5 text-amber-400" /> Active Appliances</h3>
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">{activeLoads.map(load => (
              <div key={load.id} onClick={() => toggleLoad(load.id)} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${load.active ? 'border-sky-500/40 bg-sky-500/10' : 'border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/50'}`}>
                <div className="flex items-center gap-3"><div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${load.active ? 'border-sky-400 bg-sky-500' : 'border-slate-600'}`}>{load.active && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}</div><div><p className={`font-semibold text-sm ${load.active ? 'text-sky-300' : 'text-slate-300'}`}>{load.name}</p><p className="text-xs text-slate-500">{load.watts}W · <span className={catColors[load.category]}>{load.category}</span></p></div></div>
                {load.active && <span className="text-sky-400 font-bold text-xs">ON</span>}
              </div>
            ))}</div>
            <div className="mt-3 pt-3 border-t border-slate-700/50 flex gap-2"><input type="text" placeholder="Name" value={customName} onChange={e => setCustomName(e.target.value)} className="flex-1 px-3 py-2 rounded-lg text-sm" /><input type="number" placeholder="Watts" value={customWatts} onChange={e => setCustomWatts(e.target.value)} className="w-24 px-3 py-2 rounded-lg text-sm" /><button onClick={addCustom} className="px-3 py-2 bg-sky-500/20 text-sky-400 rounded-lg text-sm font-bold hover:bg-sky-500/30"><Plus size={16} /></button></div>
          </Card>
        </div>
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-card p-8 rounded-2xl border border-sky-500/20 animate-pulseGlow">
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Estimated Runtime</p>
            <div className="flex items-baseline gap-2"><span className="text-6xl font-black text-amber-400">{estimatedHours}</span><span className="text-2xl font-medium text-slate-400">Hours</span></div>
            <div className="mt-6 pt-6 border-t border-slate-700/50 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-slate-400">Total Load</span><span className="font-bold text-slate-200">{totalWatts} W</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">Battery</span><span className="font-bold text-slate-200">{batterySize} kWh</span></div>
              {solarRecharge && <div className="flex justify-between text-sm"><span className="text-slate-400">Solar Offset (24h avg)</span><span className="font-bold text-emerald-400">~{Math.round(sim.avgSolarW)} W</span></div>}
              <div className="flex justify-between text-sm"><span className="text-slate-400">Net Draw</span><span className="font-bold text-sky-400">{Math.round(netDraw)} W</span></div>
            </div>
          </div>
          {depletionData.length > 0 && (<Card className="p-5 h-[220px]"><h3 className="font-bold text-sm text-slate-400 mb-2">Battery Depletion</h3><ResponsiveContainer width="100%" height="85%"><AreaChart data={depletionData} margin={{ left: 0, right: 10 }}><XAxis dataKey="hour" tickFormatter={v => `${v}h`} /><YAxis tickFormatter={v => `${v}%`} domain={[0, 100]} /><Tooltip {...darkTooltip} formatter={v => `${v}%`} labelFormatter={v => `Hour ${v}`} /><Area type="monotone" dataKey="remaining" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} strokeWidth={2} /></AreaChart></ResponsiveContainer></Card>)}
          <button onClick={() => onExport({ batterySize, totalWatts, estimatedHours: parseFloat(estimatedHours) || 0, activeLoads: activeLoads.filter(l => l.active), solarRecharge, netDraw })} className="w-full flex items-center justify-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-6 py-3 rounded-xl font-bold transition-all border border-emerald-500/20"><FileText size={18} /> Export to Proposal</button>
        </div>
      </div>
    </div>
  );
};

export default BlackoutSimulator;
