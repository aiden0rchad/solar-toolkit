import { ArrowRight, Battery, Car, Lock, Sun } from 'lucide-react';

const journeys = [
  { id: 'simple-roi', title: 'Is solar worth it for me?', copy: 'Start with your bill and get a plain-language savings estimate.', icon: Sun, color: 'amber' },
  { id: 'blackout', title: 'Will a battery keep my lights on?', copy: 'Pick the things you need during an outage and see how long they run.', icon: Battery, color: 'emerald' },
  { id: 'ev', title: 'Should I switch to an EV?', copy: 'Compare the real monthly and long-term cost with your current car.', icon: Car, color: 'sky' },
];

const featuredToolIds = new Set(['home', ...journeys.map(tool => tool.id)]);

const colors = {
  amber: 'border-amber-500/20 hover:border-amber-400/50 bg-amber-500/5 text-amber-400',
  emerald: 'border-emerald-500/20 hover:border-emerald-400/50 bg-emerald-500/5 text-emerald-400',
  sky: 'border-sky-500/20 hover:border-sky-400/50 bg-sky-500/5 text-sky-400',
};

const HomeLanding = ({ onNavigate, tools }) => {
  const moreTools = tools.filter(tool => !featuredToolIds.has(tool.id));

  return <main className="mx-auto max-w-6xl animate-fadeIn py-4 sm:py-10">
    <header className="mx-auto mb-8 max-w-3xl text-center sm:mb-12">
      <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-sky-400">SolarPro Toolkit</p>
      <h1 className="text-3xl font-black leading-tight text-slate-100 sm:text-5xl">What are you trying to figure out?</h1>
      <p className="mt-4 text-base leading-relaxed text-slate-400 sm:text-lg">Start with one question. You’ll get honest numbers first, with the details available when you want them.</p>
    </header>

    <section className="grid grid-cols-1 gap-4 md:grid-cols-3 sm:gap-6" aria-label="Start here">
      {journeys.map(({ id, title, copy, icon: Icon, color }) => (
        <button key={id} onClick={() => onNavigate(id)} className={`group min-h-56 rounded-2xl border p-6 text-left transition-all hover:-translate-y-1 hover:shadow-2xl ${colors[color]}`}>
          <Icon size={34} aria-hidden="true" />
          <h2 className="mt-8 text-xl font-black text-slate-100">{title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">{copy}</p>
          <span className="mt-5 flex items-center gap-2 text-sm font-bold">Start here <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></span>
        </button>
      ))}
    </section>

    <section className="mt-10 border-t border-slate-700/40 pt-6" aria-label="More tools">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">More calculators and consultant tools</p>
      <div className="flex flex-wrap gap-2">
        {moreTools.map(({ id, navLabel, icon: Icon, tier }) => (
          <button key={id} onClick={() => onNavigate(id)} className="flex items-center gap-2 rounded-lg border border-slate-700/50 px-3 py-2 text-xs font-bold text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-200">
            <Icon size={14} aria-hidden="true" /> {navLabel} {tier === 'pro' && <Lock size={12} className="text-amber-400" aria-label="Pro tool" />}
          </button>
        ))}
      </div>
    </section>
  </main>;
};

export default HomeLanding;
