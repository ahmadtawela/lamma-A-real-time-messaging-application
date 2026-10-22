import { INTL_LOCALE } from '@/shared/i18n/config';

// Date/number helpers built on Intl, so no manual string formatting.
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dayDiff = (a, b) => Math.round((startOfDay(a) - startOfDay(b)) / 864e5);

export const formatNumber = (lang, n) => new Intl.NumberFormat(INTL_LOCALE[lang]).format(n);

export const formatTime = (lang, date) =>
  new Intl.DateTimeFormat(INTL_LOCALE[lang], { hour: 'numeric', minute: '2-digit' }).format(new Date(date));

/** "Today, 10:35 AM" / "اليوم، 10:35 ص" — full date after a day either side. */
export function formatDayTime(lang, date, now = new Date()) {
  const d = new Date(date);
  const diff = dayDiff(d, now);
  const time = formatTime(lang, d);
  if (Math.abs(diff) <= 1) {
    const rel = new Intl.RelativeTimeFormat(INTL_LOCALE[lang], { numeric: 'auto' }).format(diff, 'day');
    return `${rel.charAt(0).toLocaleUpperCase(INTL_LOCALE[lang]) + rel.slice(1)}${lang === 'ar' ? '،' : ','} ${time}`;
  }
  return new Intl.DateTimeFormat(INTL_LOCALE[lang], { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}

export function formatRelative(lang, date, now = new Date()) {
  const sec = Math.round((new Date(date) - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat(INTL_LOCALE[lang], { numeric: 'auto' });
  const abs = Math.abs(sec);
  if (abs < 60) return rtf.format(0, 'second');
  if (abs < 3600) return rtf.format(Math.round(sec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(sec / 3600), 'hour');
  return rtf.format(Math.round(sec / 86400), 'day');
}

/** Calendar label for date separators: Today / Yesterday / full date. */
export function formatDay(lang, date, now = new Date()) {
  const d = new Date(date); const diff = dayDiff(d, now);
  if (diff >= -1 && diff <= 1) { const r = new Intl.RelativeTimeFormat(INTL_LOCALE[lang], { numeric: 'auto' }).format(diff, 'day'); return r.charAt(0).toLocaleUpperCase(INTL_LOCALE[lang]) + r.slice(1); }
  return new Intl.DateTimeFormat(INTL_LOCALE[lang], { dateStyle: 'long' }).format(d);
}
export const dayKey = (date) => { const d = new Date(date); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
export function formatDuration(lang, seconds) {
  const n = new Intl.NumberFormat(INTL_LOCALE[lang], { minimumIntegerDigits: 2, useGrouping: false });
  return `${new Intl.NumberFormat(INTL_LOCALE[lang]).format(Math.floor(seconds / 60))}:${n.format(Math.floor(seconds % 60))}`;
}
export function formatBytes(lang, bytes) {
  const units = ['B', 'KB', 'MB', 'GB']; let i = 0; let v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${new Intl.NumberFormat(INTL_LOCALE[lang], { maximumFractionDigits: i ? 1 : 0 }).format(v)} ${units[i]}`;
}
