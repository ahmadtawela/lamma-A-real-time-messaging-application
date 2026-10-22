import { Languages } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface p-0.5" role="group" aria-label={t('common.language')}>
      <Languages className="mx-1.5 h-4 w-4 text-text-2" aria-hidden />
      {[['ar', 'العربية'], ['en', 'English']].map(([code, label]) => (
        <button key={code} lang={code} onClick={() => setLanguage(code)} aria-pressed={language === code}
          className={`rounded-md px-2.5 py-1 text-sm transition ${language === code ? 'bg-accent text-accent-fg' : 'text-text-1 hover:bg-surface-2'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}
