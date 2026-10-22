import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react';
import { DEFAULT_LANGUAGE, DIRECTION, STORAGE_KEY, SUPPORTED } from '@/shared/i18n/config';
import { translate } from '@/shared/i18n/translate';
import * as fmt from '@/shared/i18n/format';

const LanguageContext = createContext(null);

/** Order: authenticated user's locale -> localStorage -> browser language -> English. */
function detectInitial(userLocale) {
  if (SUPPORTED.includes(userLocale)) return userLocale;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (SUPPORTED.includes(saved)) return saved;
  } catch { /* storage unavailable */ }
  const browser = (navigator.language || '').slice(0, 2).toLowerCase();
  return SUPPORTED.includes(browser) ? browser : DEFAULT_LANGUAGE;
}

/**
 * userLocale:      value of `locale` from GET /api/user (when logged in).
 * onLocaleChange:  async (locale) => PUT /api/user/preferences { locale } — wired by the auth layer.
 */
export function LanguageProvider({ children, userLocale, onLocaleChange }) {
  const [language, setLang] = useState(() => detectInitial(userLocale));
  const direction = DIRECTION[language];

  // Keep <html> in sync. No reload, so route, selected chat and scroll are preserved.
  useLayoutEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
  }, [language, direction]);

  const setLanguage = useCallback((next) => {
    if (!SUPPORTED.includes(next)) return;
    setLang(next); // update immediately...
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
    onLocaleChange?.(next)?.catch?.(() => {}); // ...then sync with Laravel in the background
  }, [onLocaleChange]);

  const value = useMemo(() => ({
    language, direction, isRtl: direction === 'rtl', setLanguage,
    t: (key, vars) => translate(language, key, vars),
    formatNumber: (n) => fmt.formatNumber(language, n),
    formatTime: (d) => fmt.formatTime(language, d),
    formatDayTime: (d) => fmt.formatDayTime(language, d),
    formatRelative: (d) => fmt.formatRelative(language, d),
    formatDay: (d) => fmt.formatDay(language, d),
    formatDuration: (n) => fmt.formatDuration(language, n),
    formatBytes: (n) => fmt.formatBytes(language, n),
  }), [language, direction, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
}
