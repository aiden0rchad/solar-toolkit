import { useId, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, DollarSign, Sun, Wallet } from 'lucide-react';
import AssumptionsPanel from '../components/AssumptionsPanel';
import {
  SERIES,
  annotationLabel,
  annotationLine,
  areaProps,
  chartTooltip,
  currencyTick,
  currencyValue,
  gridProps,
  legendProps,
  xAxisProps,
  yAxisProps,
} from '../components/chartTheme';
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

// One selected style for every segmented button in this tool — the label
// differentiates the option, never the hue.
const segment = (selected) => `rounded-md border px-3 py-2 text-left text-[13px] font-medium ${selected
  ? 'border-baseline bg-accent-wash text-ink'
  : 'border-line bg-surface text-ink-2 hover:border-baseline'
  }`;

const SimpleSolarROI = ({ onNavigate }) => {
  // Ties each caption to the button group it names — a bare <label> above a row of
  // buttons labels nothing.
  const uid = useId();
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

  // netLiability — the crossing findBreakEven reports — is exactly
  // (proposed - gridOnly), so the annotation sits on the visual crossing.
  const breakEvenYear = payback === null ? null : Number(payback);

  const ledger = [
    { label: 'Payback', value: payback ? `${payback} yrs` : '25+ yrs' },
    { label: 'Bill before', value: `$${year1.monthlyBillNow}` },
    {
      label: 'Bill after solar',
      value: `$${year1.monthlyBillFuture}`,
      sub: payMethod === 'loan' ? `includes $${Math.round(monthlyPayment)}/mo loan` : null,
    },
    { label: '25-year savings', value: `$${Math.round(savings25).toLocaleString()}` },
  ];

  return (
    <main className="mx-auto max-w-6xl">
      <header className="mb-6">
        <p className="eyebrow">Simple Solar ROI</p>
        <h1 className="mt-2 flex items-center gap-2 text-[22px] font-semibold text-ink"><Sun size={20} className="text-accent" /> Is solar worth it for me?</h1>
        <p className="mt-2 text-sm text-ink-2">Use a recent monthly bill for a quick estimate. You can inspect every assumption below.</p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="space-y-6 lg:col-span-4" aria-label="Your inputs">
          <Card className="p-5 sm:p-6">
            <InputField label="Monthly electric bill now" value={monthlyBill} onChange={setMonthlyBill} unit="$ / mo" step="10" />
            <div className="mb-4">
              <span id={`${uid}-region`} className="mb-2 block text-xs font-medium text-ink-2">Region</span>
              <div role="group" aria-labelledby={`${uid}-region`} className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {Object.keys(SUN_PROFILES).map(region => <button key={region} onClick={() => setSunProfile(region)} className={segment(sunProfile === region)}>{region}</button>)}
              </div>
            </div>
            <div className="mb-4">
              <span id={`${uid}-load-shape`} className="mb-2 block text-xs font-medium text-ink-2">Roughly how you use power</span>
              <div role="group" aria-labelledby={`${uid}-load-shape`} className="space-y-2">
                {Object.keys(LOAD_SHAPES).map(shape => <button key={shape} onClick={() => setLoadShape(shape)} className={`w-full ${segment(loadShape === shape)}`}>{loadChoices[shape]}</button>)}
              </div>
            </div>
            <InputField label="Estimated system cost" value={systemCost} onChange={setSystemCostOverride} unit="$" step="100" tooltip={`Starts at $3.00/W for the estimated ${solarSize.toFixed(1)} kW system. Replace it with a real quote when you have one.`} />
            {systemCostOverride !== null && <button onClick={() => setSystemCostOverride(null)} className="-mt-2 mb-4 text-xs font-medium text-accent hover:text-ink">Reset to ${estimatedCost.toLocaleString()} estimate</button>}
            <InputField label="Incentives / rebates" value={incentives} onChange={setIncentives} unit="$" step="100" tooltip="The 30% federal credit for owned systems ended after Dec. 31, 2025. A lease/PPA provider may claim a federal credit through 2027 and reflect it in your rate. Enter only confirmed state, local, or utility rebates." />
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Payment method">
              {['cash', 'loan'].map(method => <button key={method} onClick={() => setPayMethod(method)} className={`text-center capitalize ${segment(payMethod === method)}`}>{method}</button>)}
            </div>
            <p className="mt-3 text-[11px] text-ink-3">Loan estimate: 7.99% for 25 years. Cash is modeled as paid in year one.</p>
          </Card>
        </section>

        <section className="space-y-6 lg:col-span-8" aria-label="Your estimate">
          <Card>
            <div className="grid grid-cols-2 sm:grid-cols-4">
              {ledger.map((cell, i) => (
                <div
                  key={cell.label}
                  className={`border-line p-4 sm:border-l sm:first:border-l-0 ${i % 2 === 1 ? 'border-l' : ''} ${i < 2 ? 'border-b sm:border-b-0' : ''}`}
                >
                  <p className="text-xs text-ink-2">{cell.label}</p>
                  <p className="mt-1 text-2xl font-semibold text-ink">{cell.value}</p>
                  {cell.sub && <p className="mt-1 text-[11px] text-ink-3">{cell.sub}</p>}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div><h2 className="text-sm font-semibold text-ink">Cumulative cost</h2><p className="text-[13px] text-ink-2">Doing nothing compared with solar, including financing.</p></div>
              <div className="text-[13px] text-ink-2"><strong className="font-semibold text-ink">{solarSize.toFixed(1)} kW</strong> system · {dailyUsage.toFixed(1)} kWh/day</div>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={simulation} margin={{ top: 16, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis {...xAxisProps} dataKey="year" type="number" domain={[0, 25]} ticks={[0, 5, 10, 15, 20, 25]} />
                  <YAxis {...yAxisProps} width={52} tickFormatter={currencyTick} />
                  <Tooltip {...chartTooltip} formatter={currencyValue} labelFormatter={year => `Year ${year}`} />
                  <Legend {...legendProps} />
                  <Area {...areaProps} type="monotone" dataKey="gridOnly" name="Keep buying from utility" stroke={SERIES.grid} fill={SERIES.grid} />
                  <Area {...areaProps} type="monotone" dataKey="proposed" name="Go solar" stroke={SERIES.solar} fill={SERIES.solar} />
                  {breakEvenYear !== null && (
                    <ReferenceLine
                      {...annotationLine}
                      x={breakEvenYear}
                      label={{ ...annotationLabel, value: `Breaks even · yr ${payback}`, position: 'top' }}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3"><Wallet size={18} className="text-ink-2" /><div><p className="text-sm font-semibold text-ink">{payMethod === 'loan' ? `$${Math.round(monthlyPayment)}/month estimated loan` : `$${Math.round(netSystemCost).toLocaleString()} paid in cash`}</p><p className="text-xs text-ink-3">After ${Math.round(Math.max(0, incentives || 0)).toLocaleString()} in confirmed incentives</p></div></div>
              <DollarSign size={18} className="hidden text-ink-3 sm:block" />
            </div>
          </Card>

          <AssumptionsPanel rateEscalation={RATE_ESCALATION} exportRate={EXPORT_RATE} peakRate={PEAK_RATE} offPeakRate={OFF_PEAK_RATE} blendedRate={BLENDED_RATE} />

          <button onClick={() => onNavigate('calculator')} className="flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface px-5 py-3 text-sm font-medium text-ink hover:border-baseline">Want every knob? Open the Pro calculator <ArrowRight size={16} /></button>
        </section>
      </div>
    </main>
  );
};

export default SimpleSolarROI;
