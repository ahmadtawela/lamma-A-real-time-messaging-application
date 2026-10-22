import { useId, useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';
import { countryOptions, guessCountry, parsePhone } from '@/shared/lib/phone';

/** Country selector + number field. Reports `{ e164, valid }` on every change (e164 is what you send to the API). Pasting "+90 555…" works too. */
export default function PhoneInput({ label, onChange, error, disabled, initialCountry }) {
  const { t, language } = useLanguage();
  const id = useId();
  const countries = useMemo(() => countryOptions(language), [language]);
  const [country, setCountry] = useState(() => initialCountry ?? guessCountry());
  const [raw, setRaw] = useState('');
  const parsed = parsePhone(raw, country);
  const update = (nextRaw, nextCountry) => { const p = parsePhone(nextRaw, nextCountry); onChange({ e164: p.e164, valid: p.valid, raw: nextRaw }); };
  const dial = countries.find((c) => c.code === country)?.dial;

  return (
    <div>
      {label && <label htmlFor={id} className="mb-1.5 block text-sm font-medium">{label}</label>}
      <div className={`flex items-stretch overflow-hidden rounded-lg border bg-surface transition focus-within:border-accent ${error ? 'border-danger' : 'border-border'} ${disabled ? 'opacity-50' : ''}`} dir="ltr">
        <select aria-label={t('phone.country')} value={country} disabled={disabled} onChange={(e) => { setCountry(e.target.value); update(raw, e.target.value); }}
          className="max-w-[9.5rem] shrink-0 border-e border-border bg-surface-2 px-2 text-sm outline-none">
          {countries.map((c) => <option key={c.code} value={c.code}>{`${c.flag} ${c.name} (+${c.dial})`}</option>)}
        </select>
        <span className="grid place-items-center ps-3 text-sm text-text-2" aria-hidden>+{dial}</span>
        <input id={id} type="tel" inputMode="tel" autoComplete="tel-national" dir="ltr" disabled={disabled} value={raw} placeholder={t('phone.placeholder')} aria-invalid={!!error}
          onChange={(e) => { setRaw(e.target.value); update(e.target.value, country); }} className="h-10 min-w-0 flex-1 bg-transparent px-2 outline-none placeholder:text-text-2" />
      </div>
      {error ? <p className="mt-1 text-sm text-danger">{error}</p>
        : raw && (parsed.valid ? <p className="mt-1 flex items-center gap-1 text-sm text-success" dir="ltr"><CheckCircle2 className="h-4 w-4" aria-hidden /><bdi>{parsed.international}</bdi></p> : <p className="mt-1 text-sm text-text-2">{t('phone.invalid')}</p>)}
    </div>
  );
}
