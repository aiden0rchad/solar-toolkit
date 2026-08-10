import { useState } from 'react';
import { FileText, Lightbulb, Plus, Trash2 } from 'lucide-react';
import { Card } from '../components/ui';
import { presets } from '../data/appliancePresets';
import { annualSunHours } from '../engine/solar';

// --- TOOL: APPLIANCE AUDITOR (Enhanced) ---
const ApplianceAuditor = ({ onExport }) => {
  const [items, setItems] = useState([]);
  const [customName, setCustomName] = useState('');
  const [customKwh, setCustomKwh] = useState('');
  const utilityRate = 0.40;
  const addItem = (preset) => setItems([...items, { ...preset, id: Date.now() + Math.random() }]);
  const addCustomItem = () => { if (customName && customKwh > 0) { setItems([...items, { name: customName, kwh: parseFloat(customKwh), icon: '⚙️', id: Date.now() }]); setCustomName(''); setCustomKwh(''); } };
  const removeItem = (id) => setItems(items.filter(i => i.id !== id));
  const totalAddedKwh = items.reduce((acc, curr) => acc + curr.kwh, 0);
  const monthlyCost = totalAddedKwh * 30 * utilityRate;
  const annualCost = monthlyCost * 12;

  return (
    <div className="max-w-7xl mx-auto animate-fadeIn">
      <div className="mb-8"><h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2"><Lightbulb className="text-amber-400" /> Appliance Consumption Auditor</h2><p className="text-slate-400">Add up future loads (EVs, Pools, HVAC) to prevent under-sizing the system.</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6">
          <h3 className="font-bold text-slate-200 mb-4">Common Additions</h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {presets.map((preset, idx) => (
              <button key={idx} onClick={() => addItem(preset)} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-800/30 border border-transparent hover:border-slate-700/50 transition-all text-left group">
                <span className="flex items-center gap-2"><span className="text-lg">{preset.icon}</span><span className="font-medium text-slate-300">{preset.name}</span></span>
                <span className="flex items-center gap-2 text-slate-400 group-hover:text-sky-400"><span className="text-xs font-mono bg-slate-700/40 px-2 py-1 rounded">+{preset.kwh} kWh/day</span><Plus className="w-4 h-4" /></span>
              </button>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <h4 className="text-sm font-bold text-slate-400 mb-2">Custom Appliance</h4>
            <div className="flex gap-2"><input type="text" placeholder="Name" value={customName} onChange={e => setCustomName(e.target.value)} className="flex-1 px-3 py-2 rounded-lg text-sm" /><input type="number" placeholder="kWh" value={customKwh} onChange={e => setCustomKwh(e.target.value)} className="w-24 px-3 py-2 rounded-lg text-sm" /><button onClick={addCustomItem} className="px-3 py-2 bg-sky-500/20 text-sky-400 rounded-lg text-sm font-bold hover:bg-sky-500/30"><Plus size={16} /></button></div>
          </div>
        </Card>
        <div className="space-y-6">
          <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50 flex flex-col">
            <h3 className="font-bold text-slate-200 mb-4">Your Load Profile</h3>
            <div className="flex-1 space-y-2 mb-4 max-h-[260px] overflow-y-auto">
              {items.length === 0 && <div className="text-center py-10 text-slate-400"><Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-20" /><p>No extra loads added yet.</p></div>}
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg shadow-lg shadow-black/20">
                  <span className="flex items-center gap-2"><span>{item.icon}</span><span className="text-slate-200">{item.name}</span></span>
                  <div className="flex items-center gap-3"><span className="text-xs text-slate-500">${(item.kwh * utilityRate * 30).toFixed(0)}/mo</span><span className="font-bold text-slate-300">{item.kwh} kWh</span><button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></div>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-slate-700/50 space-y-2">
              <div className="flex justify-between items-center"><span className="text-slate-400">Added Daily Consumption</span><span className="text-xl font-bold text-slate-100">{totalAddedKwh} kWh</span></div>
              <div className="flex justify-between items-center text-sm"><span className="text-slate-400">Est. Monthly Cost Impact</span><span className="font-bold text-amber-400">${monthlyCost.toFixed(0)}/mo</span></div>
              <div className="flex justify-between items-center text-sm"><span className="text-slate-400">Est. Annual Cost Impact</span><span className="font-bold text-red-400">${annualCost.toFixed(0)}/yr</span></div>
              <div className="flex justify-between items-center text-sm"><span className="text-slate-400">Required System Increase</span><span className="font-bold text-sky-400">~{(totalAddedKwh / annualSunHours('CA Central Valley')).toFixed(1)} kW</span></div>
            </div>
          </div>
          <button onClick={() => onExport({ items, totalAddedKwh, monthlyCost, annualCost, systemIncrease: (totalAddedKwh / annualSunHours('CA Central Valley')).toFixed(1) })} className="w-full flex items-center justify-center gap-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 px-6 py-3 rounded-xl font-bold transition-all border border-amber-500/20"><FileText size={18} /> Export to Proposal</button>
        </div>
      </div>
    </div>
  );
};

export default ApplianceAuditor;
