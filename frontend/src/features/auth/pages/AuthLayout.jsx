import Logo from '@/shared/ui/Logo';
import LanguageSwitcher from '@/shared/components/LanguageSwitcher';
import ThemeSwitcher from '@/shared/components/ThemeSwitcher';
import { useLanguage } from '@/shared/context/LanguageProvider';

export default function AuthLayout({ title, subtitle, children, footer }) {
  const { t } = useLanguage();
  return (
    <main className="grid min-h-dvh place-items-center bg-bg p-4">
      <div className="w-full max-w-md">
        <div className="mb-4 flex items-center justify-between"><LanguageSwitcher /><ThemeSwitcher /></div>
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div className="mb-4 flex justify-center"><Logo variant="lockup" className="h-28 w-auto" /></div>
          <h1 className="text-center text-xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1 mb-4 text-center text-sm text-text-2">{subtitle}</p>}
          <div className="mt-4 space-y-4">{children}</div>
        </div>
        <div className="mt-4 text-center text-sm text-text-2">{footer}</div>
        <p className="mt-6 text-center text-xs text-text-2">{t('common.tagline')}</p>
      </div>
    </main>
  );
}

export function FormError({ error }) {
  const { t } = useLanguage();
  if (!error) return null;
  const msg = error.status === 429 ? t('errors.tooMany') : error.isNetwork ? t('errors.network') : error.status === 403 ? t('errors.forbidden') : t('errors.generic');
  return <p role="alert" className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{msg}{error.retryAfter ? ` (${error.retryAfter}s)` : ''}</p>;
}
