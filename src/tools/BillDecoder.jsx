import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertTriangle, CheckCircle2, FileText, Search, Zap } from 'lucide-react';
import { Card } from '../components/ui';
import { darkTooltip } from '../components/chartTheme';

// --- TOOL: BILL DECODER (Enhanced) ---
const BillDecoder = ({ onExport }) => {
  const [lineItems, setLineItems] = useState([
    { id: 'generation', label: 'Generation Charges', amount: 142.50, description: 'The actual cost of creating the electricity. This is the main part Solar replaces.', solarElim: true },
    { id: 'transmission', label: 'Transmission', amount: 45.20, description: 'The cost to move electricity from power plants over high-voltage lines to your neighborhood substation.', solarElim: true },
    { id: 'distribution', label: 'Distribution', amount: 62.15, description: 'The cost to deliver power from the substation to your house (poles and wires).', solarElim: false },
    { id: 'nbc', label: 'Public Purpose Programs (NBCs)', amount: 12.33, description: 'Non-Bypassable Charges. Small fees mandated by the state that solar cannot offset (~$10-15/mo).', solarElim: false },
    { id: 'connection', label: 'Minimum Connection Fee', amount: 10.00, description: 'Monthly grid connection fee charged by the utility regardless of usage.', solarElim: false },
  ]);
  const [hoveredTerm, setHoveredTerm] = useState(null);
  const updateAmount = (id, val) => setLineItems(lineItems.map(i => i.id === id ? { ...i, amount: parseFloat(val) || 0 } : i));
  const totalBill = lineItems.reduce((a, c) => a + c.amount, 0);
  const solarSaves = lineItems.filter(i => i.solarElim).reduce((a, c) => a + c.amount, 0);
  const remaining = totalBill - solarSaves;
  const pieData = lineItems.map(i => ({ name: i.label, value: i.amount }));
  const COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#64748b'];

  return (
    <div className="max-w-7xl mx-auto animate-fadeIn">
      <div className="mb-8"><h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2"><Search className="text-blue-500" /> Smart Bill Decoder</h2><p className="text-slate-400">Enter your bill amounts. See what solar can reduce and what stays.</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="bg-slate-800/50 p-8 rounded-xl shadow-lg border border-slate-700/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
          <div className="flex justify-between items-center mb-6 pb-6 border-b border-slate-700/30">
            <div className="flex items-center gap-2"><Zap className="w-8 h-8 text-sky-400" /><span className="font-bold text-xl text-slate-200">Utility Bill</span></div>
            <div className="text-right"><p className="text-sm text-slate-400">Edit amounts below</p></div>
          </div>
          <div className="space-y-3">
            {lineItems.map((item, idx) => (
              <div key={item.id} className={`group relative p-3 -mx-3 rounded-lg transition-colors cursor-help ${hoveredTerm === item.id ? 'bg-amber-500/10' : 'hover:bg-slate-700/20'}`} onMouseEnter={() => setHoveredTerm(item.id)} onMouseLeave={() => setHoveredTerm(null)}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${item.solarElim ? 'text-slate-200' : 'text-slate-400'}`}>{item.label}</span>
                    {item.solarElim && <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded">SOLAR SAVES</span>}
                  </div>
                  <div className="flex items-center gap-1"><span className="text-slate-500 text-sm">$</span><input type="number" value={item.amount} onChange={e => updateAmount(item.id, e.target.value)} className="w-20 text-right font-bold text-sm bg-transparent border-b border-slate-600 focus:border-sky-400 outline-none py-1" step="0.01" /></div>
                </div>
                {hoveredTerm === item.id && <div className="mt-2 text-xs text-slate-400 bg-slate-800 p-2 rounded">{item.description}</div>}
              </div>
            ))}
            <div className="pt-4 border-t border-slate-600 mt-4 flex justify-between text-lg font-bold"><span className="text-slate-200">Total Amount Due</span><span className="text-slate-100">${totalBill.toFixed(2)}</span></div>
          </div>
        </div>
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-bold text-lg text-slate-200 mb-4">Bill Breakdown</h3>
            <div className="h-52"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">{pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip {...darkTooltip} formatter={v => `$${v.toFixed(2)}`} /></PieChart></ResponsiveContainer></div>
            <div className="grid grid-cols-2 gap-2 mt-2">{pieData.map((item, i) => (<div key={i} className="flex items-center gap-2 text-xs"><div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }}></div><span className="text-slate-400 truncate">{item.name}</span></div>))}</div>
          </Card>
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 bg-emerald-500/10 border-emerald-500/20 text-center"><p className="text-xs font-bold text-emerald-400 uppercase mb-1">Solar Eliminates</p><p className="text-2xl font-black text-emerald-400">${solarSaves.toFixed(0)}</p><p className="text-xs text-emerald-400/60">{((solarSaves / totalBill) * 100).toFixed(0)}% of bill</p></Card>
            <Card className="p-4 text-center"><p className="text-xs font-bold text-slate-400 uppercase mb-1">Remaining w/ Solar</p><p className="text-2xl font-black text-slate-300">${remaining.toFixed(0)}</p><p className="text-xs text-slate-500">NBCs + fees</p></Card>
          </div>
          <div className="bg-slate-800/30 p-5 rounded-2xl border border-slate-700/50">
            <h3 className="font-bold text-slate-200 mb-3">What this means for you</h3>
            <ul className="space-y-3">
              <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /><p className="text-sm text-slate-400"><strong className="text-slate-100">Eliminates {((solarSaves / totalBill) * 100).toFixed(0)}%:</strong> Generation + Transmission wiped out.</p></li>
              <li className="flex gap-3"><AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" /><p className="text-sm text-slate-400"><strong className="text-slate-100">Residual ~${remaining.toFixed(0)}/mo:</strong> NBCs and connection fees remain.</p></li>
            </ul>
          </div>
          <button onClick={() => onExport({ lineItems, totalBill, solarSaves, remaining })} className="w-full flex items-center justify-center gap-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 px-6 py-3 rounded-xl font-bold transition-all border border-sky-500/20"><FileText size={18} /> Export to Proposal</button>
        </div>
      </div>
    </div>
  );
};

export default BillDecoder;
