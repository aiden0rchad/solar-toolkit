import { ArrowRight, Battery, Car, Coffee, Lock, Sun } from 'lucide-react';
import { useEntitlement } from '../entitlement/useEntitlement';

const journeys = [
  { id: 'simple-roi', title: 'Is solar worth it for me?', copy: 'Start with your bill and get a plain-language savings estimate.', icon: Sun },
  { id: 'blackout', title: 'Will a battery keep my lights on?', copy: 'Pick the things you need during an outage and see how long they run.', icon: Battery },
  { id: 'ev', title: 'Should I switch to an EV?', copy: 'Compare the real monthly and long-term cost with your current car.', icon: Car },
];

const featuredToolIds = new Set(['home', ...journeys.map(tool => tool.id)]);

const HomeLanding = ({ onNavigate, tools }) => {
  const { isPro } = useEntitlement();
  const moreTools = tools.filter(tool => !featuredToolIds.has(tool.id));

  return <main className="mx-auto max-w-6xl py-4 sm:py-10">
    <header className="mb-8 sm:mb-12">
      <p className="eyebrow mb-2">SolarPro Toolkit</p>
      <h1 className="text-[26px] font-semibold leading-tight text-ink sm:text-[28px]">What are you trying to figure out?</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2">Start with one question. You’ll get honest numbers first, with the details available when you want them.</p>
    </header>

    <section className="grid grid-cols-1 gap-4 md:grid-cols-3" aria-label="Start here">
      {journeys.map(({ id, title, copy, icon: Icon }, index) => (
        <button key={id} onClick={() => onNavigate(id)} className="group flex h-full flex-col rounded-lg border border-line bg-surface p-6 text-left hover:border-baseline">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-accent">{String(index + 1).padStart(2, '0')}</span>
            <Icon size={18} className="text-ink-2" aria-hidden="true" />
          </div>
          <h2 className="mt-6 text-base font-semibold text-ink">{title}</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{copy}</p>
          <span className="mt-auto flex items-center gap-2 pt-5 text-[13px] font-medium text-accent">
            Start here <ArrowRight size={14} className="transition-transform duration-[120ms] ease-out group-hover:translate-x-0.5" />
          </span>
        </button>
      ))}
    </section>

    <section className="mt-12" aria-label="More tools">
      <p className="eyebrow mb-3">More calculators and consultant tools</p>
      <div className="grid grid-cols-1 border-t border-line sm:grid-cols-2 sm:gap-x-8">
        {moreTools.map(({ id, navLabel, icon: Icon, tier }) => (
          <button key={id} onClick={() => onNavigate(id)} className="flex items-center gap-2.5 border-b border-line px-2 py-2.5 text-left text-[13px] text-ink-2 hover:bg-field">
            <Icon size={14} className="flex-shrink-0 text-ink-3" aria-hidden="true" />
            <span className="flex-1">{navLabel}</span>
            {tier === 'pro' && !isPro && <Lock size={12} className="flex-shrink-0 text-ink-3" aria-label="Pro tool" />}
          </button>
        ))}
      </div>
    </section>

    <footer className="mt-12 border-t border-line pt-6" aria-label="Support this project">
      <p className="max-w-2xl text-[13px] leading-relaxed text-ink-2">
        This toolkit is free and stays that way. If it helped you decide, consider{' '}
        <a href="https://www.buymeacoffee.com/aiden0rchad" target="_blank" rel="noopener noreferrer" className="font-medium text-accent underline-offset-2 hover:underline">
          buying me a coffee <Coffee size={14} className="inline -mt-0.5" aria-hidden="true" />
        </a>
        {' '}&#8212; I&#8217;m a university student building this between classes.
      </p>
    </footer>
  </main>;
};

export default HomeLanding;
