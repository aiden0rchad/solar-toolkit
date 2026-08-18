import { useEffect, useRef, useState } from 'react';
import ThemeToggle from './ThemeToggle';
import { TOOLS } from '../tools/registry';

// =============================================================================
// THE NAV RAIL
//
// Thirteen views do not fit a horizontal bar; that pattern tops out around
// seven. The previous shell proved it — two ruled strips, scroll controls and a
// ResizeObserver measuring overflow, all in service of a line of thirteen
// uppercase mono labels that read as texture rather than as a list. None of
// that machinery survives here: a vertical rail does not overflow horizontally,
// so there is nothing to measure and nothing to scroll into view.
//
// What replaces it is the index of a document set down the left margin: a
// 232px column on `--field`, closed by a 1px `--rule` right edge, with the
// entries GROUPED under mono section labels and set in SENTENCE-CASE Public
// Sans at 13px. The mono micro-label is still the signature of this system, but
// it labels a group, a readout or a column — never a navigation item.
//
// Rows are 33px. An earlier attempt packed them to 24px at 186px wide and the
// rail read as a wall of text; the group labels get 20px of air above them for
// the same reason. Density is a feature of the DATA, not of the chrome that
// points at it.
//
// The active row is marked THREE ways — `--ink` at weight 600, a 2px
// `--d-solar` left edge, and a `--raised` ground — so selection never rests on
// a background wash alone. Inactive rows hold a transparent edge of the same
// weight, so selection cannot shift the text by 2px.
//
// Below 1000px the rail collapses to a top bar carrying a disclosure, and the
// disclosure opens THE SAME grouped list as an overlay panel. Nothing is folded
// into a <select> and no view is dropped: every one of the thirteen is
// reachable at 375px.
// =============================================================================

/**
 * The grouping. Ids only — titles, labels and order of render come off the
 * registry, which stays the single source of truth for what a view is called.
 *
 * `Home` sits above the groups on its own: it is the root of the document, not
 * a member of one of its sections.
 */
const GROUPS = [
  { key: 'start', label: 'Start here', ids: ['simple-roi', 'blackout', 'ev'] },
  { key: 'tools', label: 'Tools', ids: ['estimator', 'audit', 'bill'] },
  { key: 'pro', label: 'Pro', ids: ['consult', 'calculator', 'proposal'] },
  { key: 'nem', label: 'Net metering', ids: ['nem1', 'nem2', 'nem3'] },
];

const HOME_ID = 'home';

/**
 * Resolve the groups against the registry once, at module scope.
 *
 * The `ungrouped` spill is not decoration: if a tool is ever added to the
 * registry and not to a group above, it would otherwise be silently
 * unreachable from the nav — the one failure this rail exists to prevent. It
 * renders under `More` and is empty (and so renders nothing) in the normal
 * case.
 */
const byId = new Map(TOOLS.map(tool => [tool.id, tool]));
const homeTool = byId.get(HOME_ID);
const claimed = new Set([HOME_ID, ...GROUPS.flatMap(group => group.ids)]);
const resolvedGroups = [
  ...GROUPS.map(group => ({ ...group, tools: group.ids.map(id => byId.get(id)).filter(Boolean) })),
  { key: 'more', label: 'More', tools: TOOLS.filter(tool => !claimed.has(tool.id)) },
].filter(group => group.tools.length > 0);

/** 13px sentence case, from the functional band. Never the mono micro-label. */
const ROW_TYPE = {
  fontSize: 'var(--size-13)',
  lineHeight: 'var(--lh-13)',
  letterSpacing: 'var(--track-13)',
};

/**
 * One entry. 33px tall — `min-h` rather than a fixed height, so a label that
 * wraps at a narrow overlay width grows its row instead of clipping.
 *
 * Hover moves colour and nothing else: no fill, no lift, no rule. The active
 * ground is reserved for the active row, so a hover wash cannot be mistaken
 * for selection.
 */
const NavRow = ({ tool, isActive, showProMarker, onSelect }) => {
  /* Each view carries its own silhouette. A thirteen-item list read as one
     block of text without them: the icon is what lets the eye find a row by
     shape before it reads a word, which is the whole reason a rail beats a bar.
     Achromatic and 1.5px — it is chrome pointing AT the data, never data, so it
     never takes a hue. It tracks the row's own colour so the active row's icon
     comes up to `--ink` with its label instead of staying behind. */
  const Icon = tool.icon;
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={isActive ? 'page' : undefined}
        style={ROW_TYPE}
        /* 2px edge + 10px = the same 12px left margin the group labels and the
           wordmark sit on, so selection reads as an edge in the margin rather
           than as an indent. */
        className={`group flex min-h-[33px] w-full items-center gap-2.5 border-l-2 py-1 pl-[10px] pr-3 text-left ${isActive
          ? 'border-d-solar bg-raised font-semibold text-ink'
          : 'border-transparent bg-transparent font-normal text-ink-2 hover:text-ink'
          }`}
      >
        {Icon && (
          <Icon
            size={16}
            strokeWidth={1.5}
            aria-hidden="true"
            className={`flex-none ${isActive ? 'text-ink' : 'text-ink-3 group-hover:text-ink-2'}`}
          />
        )}
        <span className="min-w-0 flex-1 truncate">{tool.navLabel}</span>
        {showProMarker && <span className="eyebrow flex-none">Pro</span>}
      </button>
    </li>
  );
};

/**
 * The grouped list, rendered identically in the rail and in the small-screen
 * overlay. `idPrefix` keeps the two copies' heading ids distinct — both are in
 * the document at once whenever the overlay is open.
 *
 * Group labels are real headings, and each list is tied to its own heading by
 * `aria-labelledby`, so the structure a sighted reader gets from the mono
 * labels and the space above them is the structure a screen reader gets too.
 */
const NavList = ({ idPrefix, view, isPro, onSelect }) => {
  const rowFor = (tool) => (
    <NavRow
      key={tool.id}
      tool={tool}
      isActive={view === tool.id}
      /* ROI Calculator's navLabel used to end in "(Pro)" — the guard stays so a
         label carrying the suffix can never stutter a second marker onto it. */
      showProMarker={tool.tier === 'pro' && !isPro && !tool.navLabel.includes('(Pro)')}
      onSelect={() => onSelect(tool.id)}
    />
  );

  return (
    <>
      {homeTool && <ul className="pt-2">{rowFor(homeTool)}</ul>}
      {resolvedGroups.map(group => (
        <div key={group.key} className="pt-5">
          <h2 id={`${idPrefix}-${group.key}`} className="eyebrow px-3 pb-1.5">
            {group.label}
          </h2>
          <ul aria-labelledby={`${idPrefix}-${group.key}`}>{group.tools.map(rowFor)}</ul>
        </div>
      ))}
    </>
  );
};

/**
 * The disclosure glyph. Inline SVG — there is no icon set in this build and no
 * new dependency; three strokes of `currentColor`, achromatic like the rest of
 * the chrome, closing to a cross when the panel is open.
 */
const DisclosureGlyph = ({ open }) => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true" focusable="false">
    {open ? (
      <>
        <line x1="1.5" y1="1.5" x2="11.5" y2="11.5" stroke="currentColor" strokeWidth="1.5" />
        <line x1="11.5" y1="1.5" x2="1.5" y2="11.5" stroke="currentColor" strokeWidth="1.5" />
      </>
    ) : (
      <>
        <line x1="0.5" y1="2" x2="12.5" y2="2" stroke="currentColor" strokeWidth="1.5" />
        <line x1="0.5" y1="6.5" x2="12.5" y2="6.5" stroke="currentColor" strokeWidth="1.5" />
        <line x1="0.5" y1="11" x2="12.5" y2="11" stroke="currentColor" strokeWidth="1.5" />
      </>
    )}
  </svg>
);

const WORDMARK_TYPE = {
  fontSize: 'var(--size-17)',
  lineHeight: 'var(--lh-17)',
  letterSpacing: 'var(--track-17)',
};

/**
 * The nav in both of its forms. The rail is the ≥1000px expression; the top bar
 * and its overlay are the same list under a disclosure below that. Only one is
 * ever visible, but both are in the DOM, so every id here is prefixed.
 */
export const NavRail = ({ view, isPro, onNavigate }) => {
  const [open, setOpen] = useState(false);
  const disclosureRef = useRef(null);
  const panelRef = useRef(null);

  const close = (returnFocus) => {
    setOpen(false);
    if (returnFocus) disclosureRef.current?.focus();
  };

  // Escape closes and hands focus back to the control that opened the panel.
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        disclosureRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // Move focus into the panel when it opens, so the next TAB walks the list
  // rather than the page behind it.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  const navigate = (id) => {
    onNavigate(id);
    setOpen(false);
  };

  return (
    <>
      {/* THE RAIL — ≥1000px. Its own column, sticky for the height of the
          viewport, closed by a 1px rule on the right. The wordmark sits at its
          head and the theme toggle in its footer: the rail carries the chrome
          that used to live in a masthead, so the main column starts at the
          context bar. */}
      <div className="hidden flex-none [@media(min-width:1000px)]:block print:hidden">
        <div className="sticky top-0 flex h-screen w-[232px] flex-col border-r border-rule bg-field">
          <div className="flex-none px-3 pb-3 pt-4">
            <h1 className="font-semibold text-ink" style={WORDMARK_TYPE}>SolarPro Toolkit</h1>
          </div>
          <hr className="rule" />
          <nav aria-label="Toolkit sections" className="min-h-0 flex-1 overflow-y-auto pb-6">
            <NavList idPrefix="rail" view={view} isPro={isPro} onSelect={navigate} />
          </nav>
          <hr className="rule" />
          <div className="flex flex-none items-center px-3 py-2">
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* THE TOP BAR — below 1000px. The rail's column is more measure than a
          375px screen can spare, so it folds to a bar and a disclosure. It does
          not stick: the context bar below it is the sticky element, and two
          stacked sticky bars would eat a quarter of a phone screen. */}
      <div className="[@media(min-width:1000px)]:hidden print:hidden">
        <div className="flex items-center justify-between gap-4 px-4 pb-2 pt-4">
          <h1 className="font-semibold text-ink" style={WORDMARK_TYPE}>SolarPro Toolkit</h1>
          <div className="flex items-center gap-5">
            <ThemeToggle />
            <button
              ref={disclosureRef}
              type="button"
              onClick={() => setOpen(value => !value)}
              aria-expanded={open}
              aria-controls="nav-menu-panel"
              className="eyebrow -mb-px flex items-center gap-2 border-b border-transparent bg-transparent pb-1 pt-1 text-ink-3 hover:border-rule hover:text-ink"
            >
              <DisclosureGlyph open={open} />
              Menu
            </button>
          </div>
        </div>
        <hr className="rule-strong" />
      </div>

      {/* THE OVERLAY — the same grouped list, nothing rearranged and nothing
          dropped. The scrim is the token, never a blur. */}
      {open && (
        <div className="fixed inset-0 z-50 [@media(min-width:1000px)]:hidden print:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => close(true)}
            className="absolute inset-0 h-full w-full bg-scrim"
          />
          <div
            id="nav-menu-panel"
            ref={panelRef}
            tabIndex={-1}
            className="absolute inset-y-0 left-0 flex w-[280px] max-w-[86vw] flex-col border-r border-rule bg-field"
          >
            {/* Not an <h1>: the top bar behind the scrim still holds the
                document's one heading, and two of them in the a11y tree is a
                worse outline than none here. */}
            <div className="flex flex-none items-center justify-between gap-4 px-3 pb-2 pt-4">
              <p className="font-semibold text-ink" style={WORDMARK_TYPE}>SolarPro Toolkit</p>
              <button
                type="button"
                onClick={() => close(true)}
                aria-label="Close menu"
                className="eyebrow flex items-center bg-transparent p-1 text-ink-3 hover:text-ink"
              >
                <DisclosureGlyph open />
              </button>
            </div>
            <hr className="rule" />
            <nav aria-label="Toolkit sections" className="min-h-0 flex-1 overflow-y-auto pb-6">
              <NavList idPrefix="menu" view={view} isPro={isPro} onSelect={navigate} />
            </nav>
          </div>
        </div>
      )}
    </>
  );
};

export default NavRail;
