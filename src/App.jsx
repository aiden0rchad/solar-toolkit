import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
// as horizontal ruled strips. Every entry is an `.eyebrow`; the active one
// carries the 2px `--rule-strong` underline and full ink. Nothing else changes —
// no fill, no icon, no lift. Inactive entries hold a transparent rule of the
// same weight so selection never shifts the baseline.
//
// REACHABILITY. Thirteen entries at the micro-label measure run past 1440px, so
// the index is set as TWO ruled lines — the tools, then the NEM education
// subsection — and each line scrolls on its own axis when its own contents
// exceed the measure. Shrinking the type to fit was never an option: 10px is
// already the floor of this system.
//
// The overflow affordance is a pair of ruled scroll controls, not a fade. A
// fade is a gradient laid on chrome, and gradients in this system are the
// irradiance ramp along a data axis and nothing else — so the affordance is
// drawn the way every other control here is drawn: achromatic, flat, a 1.5px
// chevron in `--ink-3` that goes to `--rule` when the strip has reached its
// end. It appears only when a strip actually overflows, so a wide viewport
// carries no control at all.
//
// Three routes reach a clipped entry, and none of them is the mouse wheel
// alone: the controls, a native swipe/trackpad scroll, and TAB — the entries
// are real buttons, so focus scrolls them into view for free. On navigation the
// active entry is pulled into view directly, which is what the old single strip
// never did: landing on `#/bill` at 900px used to paint an index whose current
// entry sat off-screen with nothing to say so.
// =============================================================================
const indexEntryClass = (isActive) =>
  `eyebrow flex-none whitespace-nowrap border-b-2 bg-transparent pb-2 pt-2.5 ${isActive ? 'border-rule-strong text-ink' : 'border-transparent text-ink-3 hover:text-ink-2'
  }`;

/** Vertical metrics shared by everything sitting on an index line, so the label,
 *  the controls and the entries all rest on the same rule. */
const INDEX_LINE = 'flex-none border-b-2 border-transparent pb-2 pt-2.5';

/**
 * One end of a scrolling index line. Inline SVG — there is no icon set in this
 * build and no new dependency; the chevron is two strokes of `currentColor`, so
 * it is achromatic like the rest of the chrome and inherits the disabled state.
 */
const ScrollControl = ({ direction, disabled, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={direction < 0 ? 'Scroll index left' : 'Scroll index right'}
    className={`${INDEX_LINE} flex w-6 items-center justify-center bg-transparent ${disabled ? 'text-rule' : 'text-ink-3 hover:text-ink'}`}
  >
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none" aria-hidden="true" focusable="false">
      <polyline
        points={direction < 0 ? '5.5,1 1,6 5.5,11' : '1.5,1 6,6 1.5,11'}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  </button>
);

/**
 * One ruled line of the index.
 *
 * `activeKey` is the current view: when it changes, the entry marked
 * `data-index-active` is scrolled into view (instantly — nothing in this
 * interface animates). The line whose strip does not hold the active entry
 * finds nothing and leaves its scroll position alone.
 *
 * Overflow is measured off the scroller itself and re-measured on resize AND on
 * the inner strip's own resize, because the entries are set in a webfont and
 * their measure changes the moment Spline Sans Mono swaps in. Adding the two
 * controls narrows the scroller by 48px, which can only ever keep an
 * overflowing strip overflowing — the feedback is monotone, so it settles in
 * one pass and cannot oscillate.
 */
const IndexLine = ({ ariaLabel, label, activeKey, children }) => {
  const scrollerRef = useRef(null);
  // `width` is carried alongside the reach flags for one reason: it is the
  // dependency that makes the scroll-into-view effect below observe LAYOUT and
  // not merely overflow state. Without it, a strip that overflows at 1440px and
  // still overflows at 760px never re-runs, and the active entry ends up parked
  // off-screen with the scroller stuck where the wide viewport left it.
  const [reach, setReach] = useState({ overflowing: false, atStart: true, atEnd: true, width: 0 });

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;

    const measure = () => {
      const max = el.scrollWidth - el.clientWidth;
      const next = {
        overflowing: max > 1,
        atStart: el.scrollLeft <= 1,
        atEnd: el.scrollLeft >= max - 1,
        width: el.clientWidth,
      };
      setReach(prev => (
        prev.overflowing === next.overflowing && prev.atStart === next.atStart
          && prev.atEnd === next.atEnd && prev.width === next.width
          ? prev
          : next
      ));
    };

    measure();
    el.addEventListener('scroll', measure, { passive: true });
    if (typeof ResizeObserver === 'undefined') {
      return () => el.removeEventListener('scroll', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => {
      el.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, []);

  // Pull the active entry into view. Measured off bounding rects rather than
  // `offsetLeft`, which is relative to whichever ancestor happens to be
  // positioned; the delta form also clamps itself against the scroll range.
  //
  // `overflowing` is a dependency because mounting the two controls takes 48px
  // off the scroller: on first paint the strip is measured, the controls
  // appear, and the entry that was just inside the measure can fall outside it.
  // Re-running against the settled layout is what makes a deep-linked view —
  // `#/bill` at 900px — open with its own index entry on screen.
  //
  // `width` is a dependency for the same reason one step further out: a
  // viewport that narrows from 1440px to 760px changes neither `overflowing`
  // nor `activeKey`, so on those two deps alone the effect never fires and the
  // index repaints with no current entry visible — the exact failure the
  // paragraph above claims to have fixed, arriving by resize instead of by
  // navigation.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const active = scroller?.querySelector('[data-index-active="true"]');
    if (scroller && active) {
      const margin = 24;
      const strip = scroller.getBoundingClientRect();
      const entry = active.getBoundingClientRect();
      if (entry.left < strip.left + margin) scroller.scrollLeft += entry.left - strip.left - margin;
      else if (entry.right > strip.right - margin) scroller.scrollLeft += entry.right - strip.right + margin;
    }
  }, [activeKey, reach.overflowing, reach.width]);

  const nudge = (direction) => {
    const scroller = scrollerRef.current;
    if (scroller) scroller.scrollLeft += direction * Math.max(160, Math.round(scroller.clientWidth * 0.6));
  };

  return (
    <nav aria-label={ariaLabel} className="mx-auto w-full max-w-[96rem] px-4 lg:px-8">
      {/* The hairline runs the full measure, under the label and the controls
          too, so the line closes edge to edge however far the strip is scrolled. */}
      <div className="flex items-stretch border-b-[0.5px] border-rule">
        {/* The subsection label sits in the margin of its own line, not in the
            scroller, so it cannot scroll away from the entries it names. Below
            640px it costs more measure than the three entries can spare and the
            nav's accessible name carries it instead — the entries are
            self-describing ("NEM 1.0 (Legacy)"), so nothing is lost. */}
        {label && (
          <span className={`eyebrow ${INDEX_LINE} hidden self-stretch whitespace-nowrap pr-4 sm:block`}>
            {label}
          </span>
        )}
        {reach.overflowing && (
          <ScrollControl direction={-1} disabled={reach.atStart} onClick={() => nudge(-1)} />
        )}
        <div
          ref={scrollerRef}
          className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain"
          style={{ scrollbarWidth: 'none' }}
        >
          <div className="flex min-w-max items-stretch gap-x-4">{children}</div>
        </div>
        {reach.overflowing && (
          <ScrollControl direction={1} disabled={reach.atEnd} onClick={() => nudge(1)} />
        )}
      </div>
    </nav>
  );
};

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

  // One entry in the ruled index. `data-index-active` is the hook IndexLine
  // scrolls to — set on the current view only, and absent (not `false`)
  // everywhere else, so the selector matches exactly one entry per line.
  const indexEntry = (tool) => (
    <button
      key={tool.id}
      type="button"
      onClick={() => setView(tool.id)}
      aria-current={view === tool.id ? 'page' : undefined}
      data-index-active={view === tool.id ? 'true' : undefined}
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
      <div className="min-h-screen bg-field font-sans text-ink-2">
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
          <hr className="rule-strong" />
          {/* THE INDEX, on two ruled lines. The subsection that used to sit
              behind two vertical dividers on the same overlong strip is now its
              own line, labelled in the margin the way a document indexes its
              sections. Each line scrolls independently and only when it has to;
              no view is folded into a <select> and none is unreachable. */}
          <IndexLine ariaLabel="Tools" activeKey={view}>
            {mainTools.map(indexEntry)}
          </IndexLine>
          <IndexLine ariaLabel="NEM education" label="NEM Education" activeKey={view}>
            {educationTools.map(indexEntry)}
          </IndexLine>
        </header>

        {/* CONTEXT BAR — 44px, sticky, so a figure is never orphaned from its premises. */}
        <div className="sticky top-0 z-30 bg-field print:hidden">
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
              reserved either way so the measure of the main column never jumps.

              IT PRINTS. Every footnote marker on every sheet is answered here,
              and `StruckRow` drops its visible reason to `sr-only` the moment a
              marker is passed — so hiding the rail from the printed sheet was
              printing `Federal tax credit (IRC 25D) · $̶0̶ *` with the asterisk
              pointing at nothing, and taking the assumptions off the one
              artefact the `@media print` block exists to serve. The grid falls
              to `print:block`, so the rail stacks under the main column on
              paper exactly as it does below 1100px on screen. */}
          <aside ref={setRailNode} aria-label="Assumptions and notes" className="min-w-0" />
        </div>

        {showProUpsell && <ProUpsellModal onClose={() => setShowProUpsell(false)} />}
      </div>
    </ShellContext.Provider>
  );
};

export default App;
