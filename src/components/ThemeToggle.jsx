import { useTheme } from '../theme/useTheme';

/**
 * Two states, one control. The label names what is ON SCREEN, the way a switch
 * on a machine is labelled by its position rather than by what it will do next;
 * the action is carried in the accessible name so a screen reader still hears
 * the verb. There is no dropdown and no third "system" option to click: the
 * reader falls back under their OS setting silently, by toggling back.
 *
 * Ink on transparent, no radius, no fill, no lift. Hover puts a rule under it —
 * the same rule vocabulary as everything else on the sheet.
 */
export const ThemeToggle = () => {
  const { resolved, toggle } = useTheme();
  const next = resolved === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className="eyebrow -mb-px border-b border-transparent bg-transparent px-0 pb-1 pt-1 text-ink-3 hover:border-rule hover:text-ink"
    >
      {resolved === 'dark' ? 'Dark' : 'Light'}
    </button>
  );
};

export default ThemeToggle;
