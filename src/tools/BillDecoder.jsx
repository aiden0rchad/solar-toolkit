import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertTriangle, Check, CheckCircle2, FileText, Search, Zap } from 'lucide-react';
import { Card } from '../components/ui';
import { SERIES, chartTooltip } from '../components/chartTheme';

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

  // Slice color is entity-stable: blue is what solar takes over, orange is what the
  // utility keeps charging. Within each group the shade steps down so neighbouring
  // slices stay distinguishable — the legend below labels every one directly.
  const elimItems = lineItems.filter(i => i.solarElim);
  const remainItems = lineItems.filter(i => !i.solarElim);
  const pieData = lineItems.map(i => ({
    name: i.label,
    value: i.amount,
    color: i.solarElim ? SERIES.solar : SERIES.grid,
    opacity: 1 - (i.solarElim ? elimItems : remainItems).indexOf(i) * 0.28,
  }));

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h2 className="flex items-center gap-2 text-[22px] font-semibold text-ink"><Search size={20} className="text-ink-2" /> Smart Bill Decoder</h2>
        <p className="text-sm text-ink-2">Enter your bill amounts. See what solar can reduce and what stays.</p>
      </div>
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
        <Card>
          <div className="h-0.5 bg-ink" />
          <div className="p-6">
            <div className="flex items-center justify-between gap-4 pb-4">
              <div className="flex items-center gap-2"><Zap size={16} className="text-ink-2" /><span className="text-sm font-semibold text-ink">Utility Bill</span></div>
              <p className="text-xs text-ink-3">Edit amounts below</p>
            </div>
            <div className="border-t border-line">
              {lineItems.map((item) => (
                <div
                  key={item.id}
                  className={`-mx-6 cursor-help border-b border-line px-6 py-2.5 ${hoveredTerm === item.id ? 'bg-field' : ''}`}
                  onMouseEnter={() => setHoveredTerm(item.id)}
                  onMouseLeave={() => setHoveredTerm(null)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
                      <span className="flex w-3.5 shrink-0 justify-center">
                        {item.solarElim && <Check size={14} className="text-good" aria-hidden="true" />}
                      </span>
                      <span className="truncate">{item.label}</span>
                      {item.solarElim && <span className="eyebrow shrink-0 text-good">SOLAR SAVES</span>}
                    </span>
                    <span className={`flex shrink-0 items-center gap-0.5 text-sm ${item.solarElim ? 'text-good' : 'text-ink'}`}>
                      $
                      <input
                        type="number"
                        value={item.amount}
                        onChange={e => updateAmount(item.id, e.target.value)}
                        className="tnum w-20 border-b border-line bg-transparent py-0.5 text-right text-sm text-inherit hover:border-baseline [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        step="0.01"
                      />
                    </span>
                  </div>
                  {hoveredTerm === item.id && <p className="ml-[22px] mt-1.5 max-w-prose text-[13px] leading-relaxed text-ink-2">{item.description}</p>}
                </div>
              ))}
              <div className="flex items-center justify-between gap-4 pt-4 text-sm font-semibold text-ink">
                <span>Total Amount Due</span>
                <span className="tnum">${totalBill.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </Card>
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-ink">Bill Breakdown</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {pieData.map((slice, i) => <Cell key={i} fill={slice.color} fillOpacity={slice.opacity} />)}
                  </Pie>
                  <Tooltip {...chartTooltip} formatter={v => `$${v.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
              {pieData.map((slice, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-ink-2">
                  <span className="h-2 w-2 shrink-0" style={{ background: slice.color, opacity: slice.opacity }}></span>
                  <span className="truncate">{slice.name}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <div className="grid grid-cols-2 divide-x divide-line">
              <div className="p-4">
                <p className="text-xs font-medium text-ink-2">Solar Eliminates</p>
                <p className="mt-1 text-2xl font-semibold text-ink">${solarSaves.toFixed(0)}</p>
                <p className="mt-0.5 text-[11px] text-ink-3">{((solarSaves / totalBill) * 100).toFixed(0)}% of bill</p>
              </div>
              <div className="p-4">
                <p className="text-xs font-medium text-ink-2">Remaining w/ Solar</p>
                <p className="mt-1 text-2xl font-semibold text-ink">${remaining.toFixed(0)}</p>
                <p className="mt-0.5 text-[11px] text-ink-3">NBCs + fees</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="mb-3 text-sm font-semibold text-ink">What this means for you</h3>
            <ul className="space-y-2.5">
              <li className="flex gap-2.5">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-good" />
                <p className="text-[13px] leading-relaxed text-ink-2"><strong className="font-medium text-ink">Eliminates <span className="tnum">{((solarSaves / totalBill) * 100).toFixed(0)}%</span>:</strong> Generation + Transmission wiped out.</p>
              </li>
              <li className="flex gap-2.5">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-ink-2" />
                <p className="text-[13px] leading-relaxed text-ink-2"><strong className="font-medium text-ink">Residual ~<span className="tnum">${remaining.toFixed(0)}</span>/mo:</strong> NBCs and connection fees remain.</p>
              </li>
            </ul>
          </Card>
          <button onClick={() => onExport({ lineItems, totalBill, solarSaves, remaining })} className="flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface px-6 py-2.5 text-sm font-medium text-ink hover:border-baseline"><FileText size={16} /> Export to Proposal</button>
        </div>
      </div>
    </div>
  );
};

export default BillDecoder;
