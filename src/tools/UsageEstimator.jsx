import { useId, useMemo, useState } from 'react';
import { Calculator, Droplets, FileText } from 'lucide-react';
import { Card, InputField } from '../components/ui';
import { SUN_PROFILES, annualSunHours } from '../engine/solar';

// The caption names a group of buttons, not one control, so it is a labelled
// role="group" rather than a <label> pointing at nothing.
const SegmentedField = ({ label, options, value, onChange }) => {
  const labelId = useId();
  return (
    <div className="mb-4">
      <span id={labelId} className="mb-1 block text-xs font-medium text-ink-2">{label}</span>
      <div role="group" aria-labelledby={labelId} className="flex gap-2">
        {options.map(option => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium ${value === option
              ? 'border-baseline bg-accent-wash text-ink'
              : 'border-line bg-surface text-ink-2 hover:border-baseline'
              }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
};

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
    <div className="mx-auto max-w-5xl">
      <header className="mb-8">
        <h2 className="flex items-center gap-2 text-[22px] font-semibold text-ink">
          <Calculator size={18} className="text-ink-2" /> Usage Estimator
        </h2>
        <p className="mt-1 text-sm text-ink-2">Estimate your home's electricity use when you don't have a bill handy.</p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-4 text-sm font-semibold text-ink">Home Details</h3>
          <InputField label="Square Footage" value={sqFt} onChange={setSqFt} unit="sqft" step="100" />
          <InputField label="Occupants" value={occupants} onChange={setOccupants} unit="ppl" step="1" />
          <SegmentedField label="Home Age" options={Object.keys(ageMultiplier)} value={homeAge} onChange={setHomeAge} />
          <SegmentedField label="Climate Zone" options={Object.keys(climateMultiplier)} value={climateZone} onChange={setClimateZone} />
          <SegmentedField label="Water Heater" options={Object.keys(waterHeaterKwh)} value={waterHeater} onChange={setWaterHeater} />
          <label className="mb-4 flex cursor-pointer items-center justify-between rounded-md border border-line px-3 py-2.5">
            <span className="flex items-center gap-2 text-[13px] font-medium text-ink">
              <Droplets size={16} className="text-ink-2" /> Pool Pump?
            </span>
            <input
              type="checkbox"
              checked={hasPool}
              onChange={(e) => setHasPool(e.target.checked)}
              className="h-4 w-4 rounded"
            />
          </label>
          <InputField label="Daily EV Driving" value={evMiles} onChange={setEvMiles} unit="mi/day" step="5" />
          <InputField label="Number of EVs" value={numEVs} onChange={setNumEVs} unit="EVs" step="1" />
          <InputField label="AC Usage (Summer)" value={acUsage} onChange={setAcUsage} unit="hrs/day" step="1" />
          <InputField label="Utility Rate" value={utilityRate} onChange={setUtilityRate} unit="$/kWh" step="0.01" />
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="eyebrow mb-3">Estimated Usage</h3>
            <div className="mb-1 flex items-end justify-between">
              <span className="text-[32px] font-semibold leading-none text-ink">{estimation.dailyTotal.toFixed(1)}</span>
              <span className="text-sm text-ink-2">kWh / Day</span>
            </div>
            <div className="mb-4 text-[13px] text-ink-3">{estimation.monthlyKwh.toFixed(0)} kWh / Month</div>
            <div className="grid grid-cols-2 gap-3 border-t border-line pt-4">
              <div className="p-3">
                <p className="text-xs text-ink-2">Est. Monthly Bill</p>
                <p className="mt-1 text-xl font-semibold text-ink">${estimation.monthlyBillEst.toFixed(0)}</p>
              </div>
              <div className="rounded-md bg-accent-wash p-3">
                <p className="text-xs text-ink-2">Recommended System</p>
                <p className="mt-1 text-xl font-semibold text-ink">{estimation.recommendedSystem} kW</p>
                <p className="mt-0.5 text-[11px] text-ink-3">winter-independent: {estimation.winterSystem} kW</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-2 text-sm font-semibold text-ink">Consumption Breakdown</h3>
            <dl>
              {estimation.breakdown.filter(i => i.value > 0).map(item => (
                <div key={item.name} className="flex items-baseline justify-between gap-4 border-b border-line py-2 last:border-b-0 last:pb-0">
                  <dt className="text-[13px] text-ink-2">{item.name}</dt>
                  <dd className="tnum text-[13px] text-ink">{item.value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <button
            onClick={() => onExport({ dailyKwh: estimation.dailyTotal.toFixed(1), monthlyBill: estimation.monthlyBillEst.toFixed(0), sqFt, occupants, recommendedSystem: estimation.recommendedSystem, breakdown: estimation.breakdown })}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface px-6 py-2.5 text-sm font-medium text-ink hover:border-baseline"
          >
            <FileText size={16} /> Export to Proposal
          </button>
        </div>
      </div>
    </div>
  );
};

export default UsageEstimator;
