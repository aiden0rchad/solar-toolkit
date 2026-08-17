import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Battery, BatteryLow, FileText, Plus, Sun, Zap } from 'lucide-react';
import { Card, InputField } from '../components/ui';
import { SERIES, areaProps, chartTooltip, gridProps, xAxisProps, yAxisProps } from '../components/chartTheme';
import { batteryPresets } from '../data/batteryPresets';

const StatRow = ({ label, children }) => (
  <div className="flex items-baseline justify-between gap-4">
    <dt className="text-[13px] text-ink-2">{label}</dt>
    <dd className="tnum text-[13px] font-medium text-ink">{children}</dd>
  </div>
);

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

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h2 className="flex items-center gap-2 text-[22px] font-semibold text-ink"><Battery size={20} className="text-ink-2" /> Blackout Simulator</h2>
        <p className="mt-1 text-sm text-ink-2">Choose what you want to keep running and see how long your battery lasts.</p>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <Card className="p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><Battery size={16} className="text-ink-2" /> Battery System</h3>
            <div className="mb-4 flex flex-wrap gap-2">
              {batteryPresets.map(p => (
                <button
                  key={p.label}
                  onClick={() => setBatterySize(p.kwh)}
                  className={`rounded-md border px-3 py-1.5 text-[13px] font-medium ${batterySize === p.kwh
                    ? 'border-baseline bg-accent-wash text-ink'
                    : 'border-line bg-surface text-ink-2 hover:border-baseline'
                    }`}
                >
                  {p.label} (<span className="tnum">{p.kwh}</span>)
                </button>
              ))}
            </div>
            <InputField label="Battery Capacity" value={batterySize} onChange={setBatterySize} unit="kWh" step="0.5" />
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-line bg-field px-3 py-2.5">
              <span className="flex items-center gap-2 text-[13px] font-medium text-ink-2"><Sun size={16} className="text-ink-2" /> Solar During Outage?</span>
              <input type="checkbox" checked={solarRecharge} onChange={(e) => setSolarRecharge(e.target.checked)} className="h-4 w-4" />
            </label>
            {solarRecharge && <div className="mt-4 -mb-4"><InputField label="Solar System Size" value={solarOutput} onChange={setSolarOutput} unit="kW" step="0.5" /></div>}
          </Card>
          <Card className="p-5">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink"><Zap size={16} className="text-ink-2" /> Active Appliances</h3>
            <ul className="max-h-[320px] divide-y divide-line overflow-y-auto">
              {activeLoads.map(load => (
                <li key={load.id}>
                  <label className="flex cursor-pointer items-center justify-between gap-3 py-2.5">
                    <span className="flex items-center gap-3">
                      <input type="checkbox" checked={load.active} onChange={() => toggleLoad(load.id)} className="h-4 w-4 shrink-0" />
                      <span>
                        <span className={`block text-[13px] ${load.active ? 'text-ink' : 'text-ink-2'}`}>{load.name}</span>
                        <span className="block text-[11px] text-ink-3"><span className="tnum">{load.watts}</span>W · {load.category}</span>
                      </span>
                    </span>
                    {load.active && <span className="text-[11px] text-ink-3">ON</span>}
                  </label>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2 border-t border-line pt-3">
              <input type="text" placeholder="Name" value={customName} onChange={e => setCustomName(e.target.value)} className="h-9 flex-1 rounded-md border border-line bg-field px-3 text-sm text-ink placeholder:text-ink-3 hover:border-baseline" />
              <input type="number" placeholder="Watts" value={customWatts} onChange={e => setCustomWatts(e.target.value)} className="tnum h-9 w-24 rounded-md border border-line bg-field px-3 text-sm text-ink placeholder:text-ink-3 hover:border-baseline [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
              <button onClick={addCustom} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-ink-2 hover:border-baseline hover:text-ink"><Plus size={16} /></button>
            </div>
          </Card>
        </div>
        <div className="space-y-4 lg:col-span-5">
          <Card className="p-5">
            <p className="eyebrow">Estimated Runtime</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-[32px] font-semibold leading-none text-ink">{estimatedHours}</span>
              <span className="text-sm text-ink-2">Hours</span>
            </div>
            <dl className="mt-5 space-y-2 border-t border-line pt-4">
              <StatRow label="Total Load">{totalWatts} W</StatRow>
              <StatRow label="Battery">{batterySize} kWh</StatRow>
              {solarRecharge && <StatRow label="Solar Offset (24h avg)">~{Math.round(sim.avgSolarW)} W</StatRow>}
              <StatRow label="Net Draw">{Math.round(netDraw)} W</StatRow>
            </dl>
          </Card>
          {depletionData.length > 0 && (
            <Card className="p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><BatteryLow size={16} className="text-ink-2" /> Battery Depletion</h3>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={depletionData} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="hour" {...xAxisProps} tickFormatter={v => `${v}h`} />
                    <YAxis {...yAxisProps} width={40} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                    <Tooltip {...chartTooltip} formatter={v => `${v}%`} labelFormatter={v => `Hour ${v}`} />
                    <Area type="monotone" dataKey="remaining" {...areaProps} stroke={SERIES.solar} fill={SERIES.solar} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
          <button onClick={() => onExport({ batterySize, totalWatts, estimatedHours: parseFloat(estimatedHours) || 0, activeLoads: activeLoads.filter(l => l.active), solarRecharge, netDraw })} className="flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface px-6 py-2.5 text-sm font-medium text-ink hover:border-baseline"><FileText size={16} /> Export to Proposal</button>
        </div>
      </div>
    </div>
  );
};

export default BlackoutSimulator;
