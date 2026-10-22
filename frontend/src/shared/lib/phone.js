import { getCountries, getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js/min';

export const flagOf = (cc) => String.fromCodePoint(...[...cc].map((c) => 127397 + c.charCodeAt(0)));

/** All countries with localized names (Intl.DisplayNames → Arabic or English), flag and calling code, sorted by name. */
export function countryOptions(language) {
  const names = new Intl.DisplayNames([language], { type: 'region' });
  return getCountries().map((code) => ({ code, name: names.of(code) ?? code, dial: getCountryCallingCode(code), flag: flagOf(code) }))
    .sort((a, b) => a.name.localeCompare(b.name, language));
}

/** Best-effort default country from the browser locale (e.g. "ar-SY" → SY), otherwise the fallback. */
export function guessCountry(fallback = 'TR') {
  const region = (navigator.language || '').split('-')[1]?.toUpperCase();
  return region && getCountries().includes(region) ? region : fallback;
}

/** Parses what the user typed (national or international format) → { valid, e164, international, country }. */
export function parsePhone(raw, country) {
  const p = raw?.trim() ? parsePhoneNumberFromString(raw, country) : undefined;
  return { valid: !!p?.isValid(), e164: p?.isValid() ? p.number : null, international: p?.isValid() ? p.formatInternational() : null, country: p?.country ?? null };
}
