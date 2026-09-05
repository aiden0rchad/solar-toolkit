import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import NavRail from './components/NavRail';
import ProLockCard from './components/ProLockCard';
import ProUpsellModal from './components/ProUpsellModal';
import { ShellContext } from './components/useShell';
import { useEntitlement } from './entitlement/useEntitlement';
import { TOOLS } from './tools/registry';
import InputStorageControls from './components/InputStorageControls';
import { ToolStateContext, useToolState } from './state/useToolState';
import { inputStore } from './state/store';
import { EMPTY_PROPOSAL, isProposal } from './state/inputStore';

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
  const [proposalData, setProposalData] = useToolState('proposalData', EMPTY_PROPOSAL, isProposal);
  const [resetVersion, setResetVersion] = useState(0);

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
  const resetActiveTool = () => {
    inputStore.reset(view);
    if (view === 'proposal') {
      inputStore.reset('app');
      setProposalData({ ...EMPTY_PROPOSAL });
    }
    setResetVersion(version => version + 1);
  };
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

  return (
    <ShellContext.Provider value={shell}>
      {/* THE SHELL — two columns above 1000px: the nav rail, then everything
          else. Below that the rail becomes a top bar and this falls back to a
          single block, which is also what prints. */}
      <div className="min-h-screen bg-field font-sans text-ink-2 [@media(min-width:1000px)]:flex print:block">
        {/* The NAVIGATION rail — 232px, grouped, sentence case. NOT the
            marginalia rail below, which is a different thing entirely: this one
            carries the index of the document, that one carries the assumptions
            of the sheet. The wordmark and the theme toggle live in it now,
            which is why there is no masthead here any more. */}
        <NavRail view={view} isPro={isPro} onNavigate={setView} />

        {/* THE MAIN COLUMN — the context bar sits at its head, not above the
            rail, so the premises stay attached to the figures they qualify. */}
        <div className="min-w-0 flex-1">
          {/* CONTEXT BAR — 44px, sticky, so a figure is never orphaned from its premises. */}
          <div className="sticky top-0 z-30 bg-field print:hidden">
            <div className="mx-auto flex h-11 w-full max-w-[96rem] items-center gap-x-7 overflow-x-auto px-4 lg:px-8">
              {contextFields.map((field, i) => <Premise key={`${field.label}-${i}`} {...field} />)}
            </div>
            <hr className="rule" />
          </div>

          {/* PAGE GRID — main column and the 22rem marginalia rail. The
              breakpoint is 1340px rather than 1100px because the nav rail now
              takes 232px off the top of the measure before this grid gets to
              divide it: splitting at 1100px left the main column under 520px,
              which is narrower than the split pane every calculator sets in.
              Below it the marginalia rail falls beneath the main column; it is
              never hidden, because the assumptions have to stay reachable on
              every screen. */}
          <div className="tool-page-grid mx-auto grid w-full max-w-[96rem] grid-cols-[minmax(0,1fr)] gap-x-10 gap-y-12 px-4 pb-20 pt-7 lg:px-8 print:m-0 print:block print:p-0 [@media(min-width:1340px)]:grid-cols-[minmax(0,1fr)_22rem]">
            {/* The fallback is a static 1px rule, not a spinner or a pulse.
                Nothing in this interface moves, so a loading state is a ruled
                placeholder holding the measure until the chunk arrives. */}
            <main className="min-w-0">
              {(activeTool.tier === 'pro' && !isPro) || !activeTool.component
                ? <ProLockCard tool={activeTool} onNavigate={setView} />
                : <Suspense fallback={<div className="h-px w-full bg-rule" role="status" aria-label="Loading" />}>
                    <ToolStateContext.Provider key={`${view}-${resetVersion}`} value={view}>
                      {!['home', 'nem1', 'nem2', 'nem3'].includes(view) && <InputStorageControls onReset={resetActiveTool} toolTitle={activeTool.title} />}
                      <ActiveComponent {...activeProps} />
                    </ToolStateContext.Provider>
                  </Suspense>}
            </main>
            {/* The MARGINALIA rail. Tools portal sidenotes in through <Rail>;
                the column is reserved either way so the measure of the main
                column never jumps.

                IT PRINTS. Every footnote marker on every sheet is answered here,
                and `StruckRow` drops its visible reason to `sr-only` the moment a
                marker is passed — so hiding the rail from the printed sheet was
                printing `Federal tax credit (IRC 25D) · $̶0̶ *` with the asterisk
                pointing at nothing, and taking the assumptions off the one
                artefact the `@media print` block exists to serve. The grid falls
                to `print:block`, so the rail stacks under the main column on
                paper exactly as it does below 1340px on screen. */}
            <aside ref={setRailNode} aria-label="Assumptions and notes" className="min-w-0" />
          </div>
        </div>

        {showProUpsell && <ProUpsellModal onClose={() => setShowProUpsell(false)} />}
      </div>
    </ShellContext.Provider>
  );
};

export default App;
