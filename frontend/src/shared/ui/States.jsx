import { AlertTriangle, Inbox, WifiOff } from 'lucide-react';
import Button from '@/shared/ui/Button';
import { useLanguage } from '@/shared/context/LanguageProvider';

export function EmptyState({ icon: Icon = Inbox, title, hint, action }) {
  return (
    <div className="grid place-items-center p-8 text-center">
      <div><Icon className="mx-auto mb-3 h-10 w-10 text-text-2" aria-hidden /><p className="font-medium">{title}</p>{hint && <p className="mt-1 text-sm text-text-2">{hint}</p>}{action && <div className="mt-4">{action}</div>}</div>
    </div>
  );
}
export function ErrorState({ error, onRetry }) {
  const { t } = useLanguage();
  const Icon = error?.isNetwork ? WifiOff : AlertTriangle;
  return (
    <div className="grid place-items-center p-8 text-center">
      <div><Icon className="mx-auto mb-3 h-10 w-10 text-danger" aria-hidden />
        <p className="mb-3 text-sm">{error?.status === 403 ? t('errors.forbidden') : error?.isNetwork ? t('errors.network') : t('errors.generic')}</p>
        {onRetry && <Button size="sm" onClick={onRetry}>{t('common.retry')}</Button>}</div>
    </div>
  );
}
export function ListSkeleton({ rows = 5 }) {
  return Array.from({ length: rows }, (_, i) => (
    <div key={i} className="flex items-center gap-3 p-2"><div className="lm-skeleton h-10 w-10 rounded-full" /><div className="flex-1 space-y-2"><div className="lm-skeleton h-3 w-1/2 rounded" /><div className="lm-skeleton h-3 w-3/4 rounded" /></div></div>
  ));
}
