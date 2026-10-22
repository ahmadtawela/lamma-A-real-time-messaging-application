import { INTL_LOCALE } from '@/shared/i18n/config';

// Every locales/<lang>/<namespace>.json file is loaded and keyed by lang + namespace.
// Adding a new language later = adding a folder and one entry in config.js.
const files = import.meta.glob('/src/locales/*/*.json', { eager: true });
const resources = {};
for (const [path, mod] of Object.entries(files)) {
  const [, lang, ns] = path.match(/locales\/([^/]+)\/([^/]+)\.json$/);
  (resources[lang] ||= {})[ns] = mod.default ?? mod;
}

function interpolate(str, vars) {
  return str.replace(/{{\s*(\w+)\s*}}/g, (_, k) => (vars[k] ?? ''));
}

/** t('chat.send') -> namespace "chat", key "send". Supports {{vars}} and plurals via `count`. */
export function translate(lang, key, vars = {}) {
  const [ns, ...rest] = key.split('.');
  const k = rest.join('.');
  const table = resources[lang]?.[ns] ?? {};
  let value = table[k];
  if (typeof vars.count === 'number') {
    const form = new Intl.PluralRules(INTL_LOCALE[lang]).select(vars.count);
    value = table[`${k}_${form}`] ?? table[`${k}_other`] ?? value;
    vars = { ...vars, count: new Intl.NumberFormat(INTL_LOCALE[lang]).format(vars.count) };
  }
  if (value == null) value = resources.en?.[ns]?.[k] ?? key; // fall back to English, then the key
  return interpolate(value, vars);
}
