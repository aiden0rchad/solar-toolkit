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

// Faint skeleton of the tool behind the card — hairlines on paper, no blur.
const ProMock = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden bg-paper" aria-hidden="true">
    <div className="grid h-full grid-cols-[9rem_1fr] gap-6 p-8 opacity-60">
      <div className="space-y-3">
        {[70, 90, 55, 80, 65].map(width => (
          <div key={width} className="h-2.5 rounded-sm bg-field" style={{ width: `${width}%` }} />
        ))}
      </div>
      <div className="space-y-4">
        <div className="h-10 rounded-md border border-line bg-surface" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-20 rounded-md border border-line bg-surface" />
          <div className="h-20 rounded-md border border-line bg-surface" />
          <div className="h-20 rounded-md border border-line bg-surface" />
        </div>
        <div className="h-32 rounded-md border border-line bg-surface" />
      </div>
    </div>
  </div>
);

const ProLockCard = ({ tool }) => {
  const details = proDetails[tool.id];

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center">
      <section className="relative w-full overflow-hidden rounded-lg border border-line p-6 sm:p-10">
        <ProMock />
        <div className="relative mx-auto max-w-xl rounded-xl border border-line bg-surface p-6 sm:p-8">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-wash text-accent">
              <Lock size={16} aria-hidden="true" />
            </span>
            <div>
              <div className="eyebrow text-accent">SolarPro Pro</div>
              <h1 className="mt-1 text-xl font-semibold text-ink">{details.title}</h1>
            </div>
          </div>
          <ul className="space-y-2.5">
            {details.bullets.map(bullet => (
              <li key={bullet} className="flex gap-2 text-[13px] leading-relaxed text-ink-2">
                <Check size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                {bullet}
              </li>
            ))}
          </ul>
          <a href={PRO_URL} className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-surface hover:bg-ink-2">
            Upgrade to Pro
          </a>
        </div>
      </section>
    </main>
  );
};

export default ProLockCard;
