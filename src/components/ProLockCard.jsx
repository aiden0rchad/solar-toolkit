import { Check, Lock } from 'lucide-react';
import { PRO_URL } from '../entitlement/config';

const proDetails = {
  consult: {
    title: 'Client Consult Wizard',
    bullets: [
      'Guided six-step flow you run in front of a client',
      'Live payback, savings and system sizing as you enter their details',
      'Hands the result straight to the proposal',
    ],
  },
  calculator: {
    title: 'ROI Calculator (Pro)',
    bullets: [
      'Model a retrofit over an existing solar loan or PPA, escalator included',
      'Full rate control: peak, off-peak, export, fixed charges and annual escalation',
      '25-year projection with seasonal load shapes, regional sun profiles and modelled degradation',
      'Compare self-consumption with guarded grid-arbitrage battery dispatch',
      'Control battery depth of discharge, reserve, round-trip efficiency and annual degradation',
    ],
  },
  proposal: {
    title: 'Proposal Generator',
    bullets: [
      'Branded, printable client proposal assembled from every tool',
      'Environmental impact derived from the modelled system, not boilerplate',
      'One-click print or save to PDF',
    ],
  },
};

const ProMock = () => (
  <div className="absolute inset-0 overflow-hidden rounded-3xl" aria-hidden="true">
    <div className="absolute inset-[-2rem] grid grid-cols-[12rem_1fr] gap-5 bg-slate-950/70 p-10 blur-[7px] opacity-55">
      <div className="space-y-3 rounded-2xl bg-slate-800/80 p-4">
        {[70, 90, 55, 80, 65].map(width => <div key={width} className="h-3 rounded bg-slate-600" style={{ width: `${width}%` }} />)}
      </div>
      <div className="space-y-5">
        <div className="h-20 rounded-2xl bg-sky-500/30" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-28 rounded-2xl bg-emerald-500/25" />
          <div className="h-28 rounded-2xl bg-amber-500/25" />
          <div className="h-28 rounded-2xl bg-violet-500/25" />
        </div>
        <div className="h-32 rounded-2xl bg-slate-700/80" />
      </div>
    </div>
    <div className="absolute inset-0 bg-slate-950/55" />
  </div>
);

const ProLockCard = ({ tool }) => {
  const Icon = tool.icon;
  const details = proDetails[tool.id];

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center animate-fadeIn">
      <section className="relative w-full overflow-hidden rounded-3xl border border-sky-400/20 p-6 shadow-2xl shadow-sky-950/30 sm:p-10">
        <ProMock />
        <div className="relative mx-auto max-w-2xl rounded-2xl border border-slate-600/40 bg-slate-950/85 p-6 shadow-2xl backdrop-blur-xl sm:p-9">
          <div className="mb-6 flex items-center gap-4">
            <span className="rounded-2xl bg-sky-500/15 p-3 text-sky-400"><Icon size={30} aria-hidden="true" /></span>
            <div>
              <div className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-amber-400"><Lock size={13} aria-hidden="true" /> SolarPro Pro</div>
              <h1 className="text-2xl font-black text-slate-100 sm:text-3xl">{details.title}</h1>
            </div>
          </div>
          <ul className="space-y-4 text-sm leading-relaxed text-slate-300 sm:text-base">
            {details.bullets.map(bullet => <li key={bullet} className="flex gap-3"><Check className="mt-0.5 shrink-0 text-emerald-400" size={19} aria-hidden="true" />{bullet}</li>)}
          </ul>
          <a href={PRO_URL} className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-400 px-6 py-3 font-black text-slate-950 transition-colors hover:bg-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 focus:ring-offset-slate-950">
            <Lock size={17} aria-hidden="true" /> Upgrade to Pro
          </a>
        </div>
      </section>
    </main>
  );
};

export default ProLockCard;
