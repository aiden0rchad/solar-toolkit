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

// The tool that is not there, drawn as the ghost of a ruled sheet: hairlines on
// paper and nothing else. No blur, no boxes, no radius — a page with the type
// lifted off it, which is exactly what the reader is being shown.
const ProMock = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden bg-field" aria-hidden="true">
    <div className="grid h-full grid-cols-[9rem_1fr] gap-8 p-8">
      <div className="space-y-5">
        {[70, 90, 55, 80, 65].map(width => (
          <div key={width} className="hair" style={{ width: `${width}%` }} />
        ))}
      </div>
      <div className="space-y-8">
        <div className="hair" />
        <div className="grid grid-cols-3 gap-5">
          <div className="hair" />
          <div className="hair" />
          <div className="hair" />
        </div>
        <div className="space-y-5">
          {[100, 88, 94, 72, 84, 66].map((width, i) => (
            <div key={`${width}-${i}`} className="hair" style={{ width: `${width}%` }} />
          ))}
        </div>
      </div>
    </div>
  </div>
);

const ProLockCard = ({ tool }) => {
  const details = proDetails[tool.id];

  // The shell owns <main>; this is a section inside it, never a second one.
  //
  // The sheet starts at the TOP of the column, at the same measure as every
  // other view. It used to be centred inside `min-h-[70vh]`, which opened the
  // three locked views on a third of a screen of empty field — the one screen
  // in the app that read as padded out rather than dense, on a system whose
  // stated position is that density is a feature. The ghost hairlines fill the
  // column beneath the sheet instead, which is what they are for: the page
  // with the type lifted off it, not a frame around a floating card.
  return (
    <div className="max-w-5xl">
      {/* The min-height belongs to the GHOST, not to the sheet: it is how far
          the ruled page runs on under what has been withheld. The sheet itself
          is top-aligned in it. */}
      <section className="relative min-h-[34rem]">
        <ProMock />
        {/* A sheet laid over the ghost: 2px rule, then the masthead of the
            thing being withheld, then its contents as ruled line items. */}
        <div className="relative max-w-xl border-t-2 border-rule-strong bg-surface px-6 pb-7 pt-5">
          <div className="eyebrow">SolarPro Pro</div>
          {/* The masthead carries the page <h1>; every view heads at h2. */}
          <h2
            className="mt-1 font-semibold text-ink"
            style={{ fontSize: 'var(--size-20)', lineHeight: 'var(--lh-20)', letterSpacing: 'var(--track-20)' }}
          >
            {details.title}
          </h2>
          <ul className="mt-5">
            {details.bullets.map(bullet => (
              <li
                key={bullet}
                className="border-b-[0.5px] border-rule py-2 text-ink-2"
                style={{ fontSize: 'var(--size-13)', lineHeight: 'var(--lh-13)', letterSpacing: 'var(--track-13)' }}
              >
                {bullet}
              </li>
            ))}
          </ul>
          <a
            href={PRO_URL}
            className="eyebrow mt-6 inline-flex w-full items-center justify-center bg-ink px-5 py-3 text-surface hover:bg-ink-2"
          >
            Upgrade to Pro
          </a>
        </div>
      </section>
    </div>
  );
};

export default ProLockCard;
