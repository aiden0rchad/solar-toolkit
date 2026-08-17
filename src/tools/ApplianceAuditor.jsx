import { useState } from 'react';
import {
  Box, Car, CookingPot, Droplets, FileText, Flame, Gamepad2, Lightbulb,
  Plus, Settings, Shirt, Snowflake, Trash2, Waves, Wind, Zap,
} from 'lucide-react';
import { Card } from '../components/ui';
import { presets } from '../data/appliancePresets';
import { annualSunHours } from '../engine/solar';

// src/data/appliancePresets.js still stores emoji strings under `icon`; the UI renders
// lucide components instead. Keyed by preset name so the data file stays untouched.
const PRESET_ICONS = {
  'Tesla Model 3 (Daily Commute)': Car,
  'Pool Pump (Variable Speed)': Waves,
  'Hot Tub': Droplets,
  'Gaming PC (Heavy Usage)': Gamepad2,
  'Central AC (Summer Day)': Snowflake,
  'Electric Dryer (per load)': Shirt,
  'EV Level 2 Charger': Zap,
  'Electric Oven': CookingPot,
  'Space Heater (8hrs)': Flame,
  'Mini-Split AC': Wind,
};

const iconFor = (item) => PRESET_ICONS[item.name] || (item.custom ? Settings : Box);

// --- TOOL: APPLIANCE AUDITOR (Enhanced) ---
const ApplianceAuditor = ({ onExport }) => {
  const [items, setItems] = useState([]);
  const [customName, setCustomName] = useState('');
  const [customKwh, setCustomKwh] = useState('');
  const utilityRate = 0.40;
  const addItem = (preset) => setItems([...items, { ...preset, id: Date.now() + Math.random() }]);
  // `icon` stays on the object: it goes out through onExport into the persisted
  // `solartoolkit-proposal` payload, which the Pro proposal renderer reads. The UI
  // never renders it — iconFor maps to a lucide component via the `custom` flag.
  const addCustomItem = () => { if (customName && customKwh > 0) { setItems([...items, { name: customName, kwh: parseFloat(customKwh), icon: '⚙️', custom: true, id: Date.now() }]); setCustomName(''); setCustomKwh(''); } };
  const removeItem = (id) => setItems(items.filter(i => i.id !== id));
  const totalAddedKwh = items.reduce((acc, curr) => acc + curr.kwh, 0);
  const monthlyCost = totalAddedKwh * 30 * utilityRate;
  const annualCost = monthlyCost * 12;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h2 className="flex items-center gap-2 text-[22px] font-semibold text-ink">
          <Lightbulb size={18} strokeWidth={1.5} className="text-ink-2" /> Appliance Consumption Auditor
        </h2>
        <p className="mt-1 text-sm text-ink-2">Add up future loads (EVs, Pools, HVAC) to prevent under-sizing the system.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-3 text-sm font-semibold text-ink">Common Additions</h3>
          <div className="max-h-[400px] divide-y divide-line overflow-y-auto border-t border-line">
            {presets.map((preset, idx) => {
              const Icon = iconFor(preset);
              return (
                <button
                  key={idx}
                  onClick={() => addItem(preset)}
                  className="group flex w-full items-center justify-between gap-3 px-2 py-2.5 text-left hover:bg-field"
                >
                  <span className="flex items-center gap-2.5">
                    <Icon size={16} strokeWidth={1.5} className="shrink-0 text-ink-3" />
                    <span className="text-[13px] text-ink-2">{preset.name}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-ink-3">
                    <span className="tnum text-xs">+{preset.kwh} kWh/day</span>
                    <Plus size={14} className="group-hover:text-ink-2" />
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-5 border-t border-line pt-4">
            <h4 className="mb-2 text-xs font-medium text-ink-2">Custom Appliance</h4>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Name"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                className="h-9 flex-1 rounded-md border border-line bg-field px-3 text-sm text-ink placeholder:text-ink-3 hover:border-baseline"
              />
              <input
                type="number"
                placeholder="kWh"
                value={customKwh}
                onChange={e => setCustomKwh(e.target.value)}
                className="tnum h-9 w-24 rounded-md border border-line bg-field px-3 text-sm text-ink placeholder:text-ink-3 hover:border-baseline [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button
                onClick={addCustomItem}
                aria-label="Add"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-ink-2 hover:border-baseline hover:bg-field"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="flex flex-col p-6">
            <h3 className="mb-3 text-sm font-semibold text-ink">Your Load Profile</h3>
            <div className="mb-4 max-h-[260px] flex-1 overflow-y-auto">
              {items.length === 0 && (
                <div className="py-10 text-center text-ink-3">
                  <Lightbulb size={24} strokeWidth={1.5} className="mx-auto mb-2" />
                  <p className="text-sm">No extra loads added yet.</p>
                </div>
              )}
              {items.length > 0 && (
                <div className="divide-y divide-line border-t border-line">
                  {items.map((item) => {
                    const Icon = iconFor(item);
                    return (
                      <div key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                        <span className="flex min-w-0 items-center gap-2.5">
                          <Icon size={16} strokeWidth={1.5} className="shrink-0 text-ink-3" />
                          <span className="truncate text-[13px] text-ink-2">{item.name}</span>
                        </span>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="tnum text-[11px] text-ink-3">${(item.kwh * utilityRate * 30).toFixed(0)}/mo</span>
                          <span className="tnum text-[13px] font-medium text-ink">{item.kwh} kWh</span>
                          <button onClick={() => removeItem(item.id)} aria-label="Remove" className="text-ink-3 hover:text-bad">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="border-t border-line pt-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-ink-2">Added Daily Consumption</span>
                <span className="text-2xl font-semibold text-ink">{totalAddedKwh} kWh</span>
              </div>
              <div className="mt-3 space-y-2 text-[13px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-ink-2">Est. Monthly Cost Impact</span>
                  <span className="tnum font-medium text-ink">${monthlyCost.toFixed(0)}/mo</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-ink-2">Est. Annual Cost Impact</span>
                  <span className="tnum font-medium text-ink">${annualCost.toFixed(0)}/yr</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-ink-2">Required System Increase</span>
                  <span className="tnum font-medium text-ink">~{(totalAddedKwh / annualSunHours('CA Central Valley')).toFixed(1)} kW</span>
                </div>
              </div>
            </div>
          </Card>
          <button
            onClick={() => onExport({ items, totalAddedKwh, monthlyCost, annualCost, systemIncrease: (totalAddedKwh / annualSunHours('CA Central Valley')).toFixed(1) })}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface px-6 py-2.5 text-sm font-medium text-ink hover:border-baseline"
          >
            <FileText size={16} /> Export to Proposal
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApplianceAuditor;
