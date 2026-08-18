import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { DARK_QUERY, THEME_STORAGE_KEY, ThemeContext } from './useTheme';

const canUseDom = typeof window !== 'undefined' && typeof document !== 'undefined';

const systemTheme = () =>
  canUseDom && window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';

/** Read the persisted override. Absent (or junk) means 'system'. */
const storedTheme = () => {
  if (!canUseDom) return 'system';
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system'; // private mode / storage blocked
  }
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(storedTheme);
  // Mirrors the OS preference. This is display state only: it keeps `resolved`
  // truthful while the reader is following the system, and is deliberately NOT
  // consulted when deciding what to persist.
  const [systemIsDark, setSystemIsDark] = useState(() => systemTheme() === 'dark');

  const resolved = theme === 'system' ? (systemIsDark ? 'dark' : 'light') : theme;

  // The boot script in index.html already stamped the attribute before first
  // paint; this keeps it in step afterwards. Layout effect so a toggle never
  // paints a frame of the old theme.
  useLayoutEffect(() => {
    if (!canUseDom) return;
    const root = document.documentElement;
    if (theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = theme;

    // The two `theme-color` metas in index.html are gated on
    // `prefers-color-scheme`, so they follow the OS and cannot see an explicit
    // override: a reader on a light OS who toggles to dark would get the dark
    // page under light browser chrome. A media-less meta always matches, and a
    // browser uses the FIRST matching one, so the override is prepended to
    // <head> and removed again when the reader returns to 'system'.
    //
    // The colour is read back off the resolved page ground rather than written
    // as a literal — CSS owns colour here, and a hex in a component is exactly
    // the second source of truth the token system exists to prevent.
    const existing = document.head.querySelector('meta[name="theme-color"][data-theme-override]');
    if (theme === 'system') {
      existing?.remove();
      return;
    }
    const meta = existing ?? document.createElement('meta');
    meta.name = 'theme-color';
    meta.dataset.themeOverride = '';
    meta.content = window.getComputedStyle(root).backgroundColor;
    if (!existing) document.head.prepend(meta);
  }, [theme]);

  useEffect(() => {
    if (!canUseDom) return undefined;
    const mql = window.matchMedia(DARK_QUERY);
    const onChange = (event) => setSystemIsDark(event.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  /**
   * Flip to the opposite of what is CURRENTLY ON SCREEN — not the opposite of
   * the stored intent, which would be a no-op the first time a system-following
   * reader clicks.
   *
   * If the value we are about to write is what the system already says, we store
   * nothing and delete the key instead: toggling twice puts the reader silently
   * back under their OS setting rather than pinning them to a value that merely
   * happens to match today. The comparison happens HERE, on interaction, and
   * nowhere else — re-running it when the OS preference changes underneath the
   * reader would revoke a choice they made on purpose.
   */
  const toggle = useCallback(() => {
    // Read the OS at the moment of the click, not from render state.
    const system = systemTheme();
    const onScreen = theme === 'system' ? system : theme;
    const next = onScreen === 'dark' ? 'light' : 'dark';
    const matchesSystem = next === system;
    try {
      if (matchesSystem) window.localStorage.removeItem(THEME_STORAGE_KEY);
      else window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* storage blocked — the choice still applies for this session */
    }
    setTheme(matchesSystem ? 'system' : next);
  }, [theme]);

  const value = useMemo(() => ({ theme, resolved, toggle }), [theme, resolved, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
