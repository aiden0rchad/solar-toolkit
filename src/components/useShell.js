import { createContext, useContext, useEffect } from 'react';

// =============================================================================
// INSTRUMENT — the shell contract.
//
// The page is a document: masthead, ruled index, a sticky context bar carrying
// the premises, a main column and a 22rem marginalia rail. App owns the layout;
// this file is the seam a tool uses to reach the two shell-owned regions it
// cannot render itself.
//
//   usePremises({ assumptionSet, fields })  -> the 44px context bar
//   <Rail>…</Rail>  (components/Rail.jsx)   -> the marginalia rail
//
// Both are optional. A tool that publishes nothing gets the bar with the
// assumption-set label alone and an empty rail — the shell never invents a
// figure to fill a slot.
//
// Context and hook live apart from the component that consumes them, the same
// split as theme/useTheme.js, so a fast-refresh edit to either does not remount
// the tree.
// =============================================================================

/**
 * Provided by App: `{ railNode, publishPremises }`. Consumers must tolerate
 * `null` — a tool rendered outside the shell (a test, a fixture) publishes
 * nowhere rather than throwing.
 */
export const ShellContext = createContext(null);

/** Internal: the shell handle, or null outside the shell. */
export const useShell = () => useContext(ShellContext);

/**
 * Publish this view's premises to the context bar.
 *
 * `premises` is `{ assumptionSet?: string, fields?: [{ label, value, unit? }] }`.
 * Values must be JSON-serialisable and already formatted for display — the bar
 * sets them tabular and appends `unit` in Roboto Mono at 0.74×, so a tool
 * passes `{ label: 'System', value: '8.4', unit: 'kW' }`, never a raw float with
 * the unit glued onto it.
 *
 * The effect depends on the *serialised* premises, so a caller may build the
 * object inline on every render without re-publishing; that is also why the
 * values have to be plain data. Publication is cleared on unmount, and the
 * shell stamps each publication with the view that made it, so a lazy chunk
 * that resolves late can never paint its premises onto the page that replaced
 * the one it was loading for.
 */
export const usePremises = (premises) => {
  const publish = useShell()?.publishPremises;
  const serialised = JSON.stringify(premises ?? null);

  useEffect(() => {
    if (!publish) return undefined;
    publish(JSON.parse(serialised));
    return () => publish(null);
  }, [publish, serialised]);
};
