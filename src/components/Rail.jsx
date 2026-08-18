import { createPortal } from 'react-dom';
import { useShell } from './useShell';

/**
 * INSTRUMENT — the marginalia rail.
 *
 * Render sidenotes into the shell's 22rem outer column: assumption blocks,
 * footnote keys, disclosure reasons. Anything a figure on the sheet points at
 * with a footnote marker belongs here — assumptions live on the page, never in
 * a tooltip.
 *
 * A portal, not a prop, so a tool keeps its sidenotes next to the numbers that
 * produced them in its own source. The rail node arrives by callback ref, so a
 * tool's first paint puts nothing here and its second paints the rail; that is
 * one frame and not a shift, because the grid reserves the column whether or
 * not anything is in it. Below 1100px the same node sits beneath the main
 * column instead — never hidden.
 */
export const Rail = ({ children }) => {
  const railNode = useShell()?.railNode;
  return railNode ? createPortal(children, railNode) : null;
};

export default Rail;
