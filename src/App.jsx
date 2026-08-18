import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ProLockCard from './components/ProLockCard';
import ProUpsellModal from './components/ProUpsellModal';
import ThemeToggle from './components/ThemeToggle';
import { ShellContext } from './components/useShell';
import { useEntitlement } from './entitlement/useEntitlement';
import { TOOLS } from './tools/registry';

const EXPORT_SECTIONS = {
  consult: 'roi',
  calculator: 'roi',
  estimator: 'usage',
  audit: 'audit',
  ev: 'ev',
  blackout: 'blackout',
  bill: 'bill',
};

/** The distinct sections a proposal can hold — `consult` and `calculator` both fill `roi`. */
const PROPOSAL_SECTIONS = [...new Set(Object.values(EXPORT_SECTIONS))];

/**
 * What the context bar says when the active view has not named an assumption
 * set. Not a placeholder for a missing figure — it is the true answer: the
 * numbers on screen are running on the toolkit's own defaults.
 */
const DEFAULT_ASSUMPTION_SET = 'Toolkit defaults';

// =============================================================================
// THE INDEX
//
// The nav is not a sidebar and not a menu: it is the index of a document, set
// as one horizontal ruled strip. Every entry is an `.eyebrow`; the active one
// carries the 2px `--rule-heavy` underline and full ink. Nothing else changes —
// no fill, no icon, no lift. Inactive entries hold a transparent rule of the
// same weight so selection never shifts the baseline.
// =============================================================================
const indexEntryClass = (isActive) =>
  `eyebrow -mb-px flex-none whitespace-nowrap border-b-2 bg-transparent pb-2 pt-2.5 ${isActive ? 'border-rule-heavy text-ink' : 'border-transparent text-ink-3 hover:text-ink-2'
  }`;

/** A 1px `--rule` vertical, used only where two groups would otherwise misread as one. */
const IndexDivider = () => <span aria-hidden="true" className="my-2 w-px flex-none bg-rule" />;

/** `LABEL  value unit` — the bar's only shape. The unit sits once, after the figure. */
const Premise = ({ label, value, unit }) => (
  <div className="flex flex-none items-baseline gap-2">
    <span className="eyebrow">{label}</span>
    <span
      className="tnum whitespace-nowrap text-ink"
      style={{ fontSize: 'var(--size-13)', lineHeight: 'var(--lh-13)', letterSpacing: 'var(--track-13)' }}
    >
      {value}
      {unit && (
        <span className="ml-1 font-mono text-ink-3" style={{ fontSize: 'calc(var(--size-13) * 0.74)' }}>
          {unit}
        </span>
      )}
    </span>
  </div>
);

const viewFromHash = () => {
  const id = window.location.hash.replace(/^#\/?/, '');
  return TOOLS.some(tool => tool.id === id) ? id : 'home';
};

const App = () => {
  const { isPro } = useEntitlement();
  const [view, setView] = useState(viewFromHash);
  const [showProUpsell, setShowProUpsell] = useState(false);
  const [proposalData, setProposalData] = useState(() => {
    try {
      const saved = localStorage.getItem('solartoolkit-proposal');
      if (saved) return JSON.parse(saved);
    } catch { /* corrupted or unavailable storage — start fresh */ }
    return { clientName: '', roi: null, usage: null, audit: null, ev: null, blackout: null, bill: null };
  });

  // --- shell slots ---------------------------------------------------------
  // The rail is a DOM node tools portal into; premises are stamped with the
  // view that published them, so a lazy chunk resolving after a navigation
  // cannot paint stale figures into the bar of the page that replaced it.
  const [railNode, setRailNode] = useState(null);
  const [published, setPublished] = useState(null);
  const viewRef = useRef(view);
  viewRef.current = view;

  const publishPremises = useCallback((premises) => {
    setPublished(premises ? { view: viewRef.current, premises } : null);
  }, []);

  const shell = useMemo(() => ({ railNode, publishPremises }), [railNode, publishPremises]);

  useEffect(() => {
    try { localStorage.setItem('solartoolkit-proposal', JSON.stringify(proposalData)); } catch { /* storage full/blocked */ }
  }, [proposalData]);

  useEffect(() => {
    const handleHashChange = () => setView(viewFromHash());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const expectedHash = `#/${view}`;
    const currentHash = window.location.hash;
    if (currentHash !== expectedHash) {
      const currentId = currentHash.replace(/^#\/?/, '');
      const isKnownView = TOOLS.some(tool => tool.id === currentId);
      if (!currentHash || !isKnownView) window.history.replaceState(window.history.state, '', expectedHash);
      else window.location.hash = expectedHash;
    }
    const tool = TOOLS.find(item => item.id === view) || TOOLS[0];
    document.title = `${tool.title} — SolarPro Toolkit`;
  }, [view]);

  const exportToProposal = (section, data) => {
    if (!isPro) {
      setShowProUpsell(true);
      return;
    }
    setProposalData(prev => ({ ...prev, [section]: data }));
    setView('proposal');
  };

  const activeTool = TOOLS.find(tool => tool.id === view) || TOOLS[0];
  const ActiveComponent = activeTool.component;
  const activeProps = activeTool.id === 'home'
    ? { onNavigate: setView, tools: TOOLS }
    : activeTool.id === 'simple-roi'
      ? { onNavigate: setView }
    : activeTool.id === 'consult'
    ? { onExport: data => exportToProposal('roi', data), goProMode: () => setView('calculator') }
    : activeTool.id === 'proposal'
      ? { proposalData, setProposalData }
      : activeTool.needsExport
        ? { onExport: data => exportToProposal(EXPORT_SECTIONS[activeTool.id], data) }
        : {};
  const mainTools = TOOLS.filter(tool => tool.section === 'main');
  const educationTools = TOOLS.filter(tool => tool.section === 'education');

  // --- the context bar -----------------------------------------------------
  // Premises the figures below depend on: whatever the active tool actually
  // knows, plus the app-level facts. Nothing here is decoration — a field that
  // has no value is not rendered, and a view with nothing to declare shows the
  // assumption set alone rather than a row of dashes.
  const premises = published && published.view === view ? published.premises : null;
  const capturedSections = PROPOSAL_SECTIONS.filter(section => proposalData[section]).length;
  const contextFields = [
    { label: 'Assumption set', value: premises?.assumptionSet || DEFAULT_ASSUMPTION_SET },
    ...(premises?.fields ?? []),
    proposalData.clientName ? { label: 'Client', value: proposalData.clientName } : null,
    capturedSections > 0
      ? { label: 'Saved to proposal', value: `${capturedSections}/${PROPOSAL_SECTIONS.length}`, unit: 'sections' }
      : null,
  ].filter(Boolean);

  const indexEntry = (tool) => (
    <button
      key={tool.id}
      type="button"
      onClick={() => setView(tool.id)}
      aria-current={view === tool.id ? 'page' : undefined}
      className={indexEntryClass(view === tool.id)}
    >
      {tool.navLabel}
      {/* ROI Calculator's navLabel already ends in "(Pro)" — don't stutter the suffix onto it. */}
      {tool.tier === 'pro' && !isPro && !tool.navLabel.includes('(Pro)') && (
        <span className="eyebrow ml-1.5 text-ink-3">Pro</span>
      )}
    </button>
  );

  return (
    <ShellContext.Provider value={shell}>
      <div className="min-h-screen bg-paper font-sans text-ink-2">
        {/* MASTHEAD — wordmark condensed, then the 2px rule across the full width. */}
        <header className="print:hidden">
          <div className="mx-auto flex w-full max-w-[96rem] items-baseline justify-between gap-6 px-4 pb-2 pt-4 lg:px-8">
            <h1
              className="font-semibold text-ink"
              style={{
                fontSize: 'var(--size-17)',
                lineHeight: 'var(--lh-17)',
                letterSpacing: 'var(--track-17)',
                fontStretch: '75%',
              }}
            >
              SolarPro Toolkit
            </h1>
            <ThemeToggle />
          </div>
          <hr className="rule-heavy" />
          {/* THE INDEX. On a narrow screen it scrolls sideways as a ruled strip —
              every view stays reachable, and no view is folded into a <select>. */}
          <nav aria-label="Tools" className="mx-auto w-full max-w-[96rem] overflow-x-auto px-4 lg:px-8">
            <div className="flex min-w-max items-stretch gap-x-5 border-b-[0.5px] border-hair">
              {mainTools.map(indexEntry)}
              <IndexDivider />
              <span className="eyebrow flex-none self-center whitespace-nowrap">NEM Education</span>
              <IndexDivider />
              {educationTools.map(indexEntry)}
            </div>
          </nav>
        </header>

        {/* CONTEXT BAR — 44px, sticky, so a figure is never orphaned from its premises. */}
        <div className="sticky top-0 z-30 bg-paper print:hidden">
          <div className="mx-auto flex h-11 w-full max-w-[96rem] items-center gap-x-7 overflow-x-auto px-4 lg:px-8">
            {contextFields.map((field, i) => <Premise key={`${field.label}-${i}`} {...field} />)}
          </div>
          <hr className="rule" />
        </div>

        {/* PAGE GRID — main column and the 22rem marginalia rail. Below 1100px the
            rail falls beneath the main column; it is never hidden, because the
            assumptions have to stay reachable on every screen. */}
        <div className="mx-auto grid w-full max-w-[96rem] grid-cols-[minmax(0,1fr)] gap-x-10 gap-y-12 px-4 pb-20 pt-7 lg:px-8 print:m-0 print:block print:p-0 [@media(min-width:1100px)]:grid-cols-[minmax(0,1fr)_22rem]">
          {/* The fallback is a static 1px rule, not a spinner or a pulse.
              Nothing in this interface moves, so a loading state is a ruled
              placeholder holding the measure until the chunk arrives. */}
          <main className="min-w-0">
            {(activeTool.tier === 'pro' && !isPro) || !activeTool.component
              ? <ProLockCard tool={activeTool} />
              : <Suspense fallback={<div className="h-px w-full bg-rule" role="status" aria-label="Loading" />}>
                  <ActiveComponent {...activeProps} />
                </Suspense>}
          </main>
          {/* The rail. Tools portal sidenotes in through <Rail>; the column is
              reserved either way so the measure of the main column never jumps. */}
          <aside ref={setRailNode} aria-label="Assumptions and notes" className="min-w-0 print:hidden" />
        </div>

        {showProUpsell && <ProUpsellModal onClose={() => setShowProUpsell(false)} />}
      </div>
    </ShellContext.Provider>
  );
};

export default App;
