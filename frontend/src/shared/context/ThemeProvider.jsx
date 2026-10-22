import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);
const KEY = 'lamma.theme';

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem(KEY) || 'system'; } catch { return 'system'; } });

  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    setTheme: (t) => { setTheme(t); try { localStorage.setItem(KEY, t); } catch { /* ignore */ } },
  }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
