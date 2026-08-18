import { createContext, useContext } from 'react';

/**
 * The storage key is shared with the render-blocking boot script in index.html.
 * If it changes here it must change there, or the theme flashes on first paint.
 */
export const THEME_STORAGE_KEY = 'theme';

/** Media query the whole app agrees to read the OS preference through. */
export const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Three internal states, two controls.
 *
 *   'system' — no localStorage key at all. The reader follows their OS.
 *   'light' / 'dark' — an explicit override, persisted.
 *
 * `theme` is the stored intent, `resolved` is what is actually on screen.
 * Components that need a colour should read CSS tokens, not this — `resolved`
 * exists for labelling the control and for the chart resolver.
 */
export const ThemeContext = createContext(null);

export const useTheme = () => {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used within ThemeProvider');
  return theme;
};
