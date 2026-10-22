import { Check, X } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';
import { useUsersStore } from '@/features/users/store/usersStore';
import { adminService } from '@/features/admin/services/adminService';
import { useAsync } from '@/shared/hooks/useAsync';
import Button from '@/shared/ui/Button';
import { EmptyState, ErrorState, ListSkeleton } from '@/shared/ui/States';

export default function AdminReports() {
  const { t, formatDayTime } = useLanguage();
  const users = useUsersStore((s) => s.byId);
  const { status, data, error, reload, setData } = useAsync(() => adminService.reports());
  const act = async (r, st) => { const { data: nr } = await adminService.resolveReport(r.id, st); setData((l) => l.map((x) => (x.id === r.id ? nr : x))); };
  return (
    <div className="mx-auto max-w-5xl"><h1 className="mb-4 text-xl font-bold">{t('admin.reports')}</h1>
      {status === 'loading' && <ListSkeleton />}{status === 'error' && <ErrorState error={error} onRetry={reload} />}{data && !data.length && <EmptyState title={t('admin.noReports')} />}
      <ul className="space-y-2">{data?.map((r) => <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-3">
        <span className="min-w-0 flex-1"><bdi className="block font-medium">{users[r.reported_user_id]?.name ?? `#${r.reported_user_id}`}</bdi><span className="text-xs text-text-2">{t(`chat.reason_${r.reason}`)} · {t('admin.reportedBy')} <bdi>{users[r.reporter_id]?.name}</bdi> · <bdi>{formatDayTime(r.created_at)}</bdi></span></span>
        <span className={`rounded px-1.5 text-xs ${r.status === 'open' ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success'}`}>{t(`admin.report_${r.status}`)}</span>
        {r.status === 'open' && <><Button size="sm" onClick={() => act(r, 'resolved')}><Check className="h-4 w-4" />{t('admin.resolve')}</Button><Button size="sm" variant="secondary" onClick={() => act(r, 'dismissed')}><X className="h-4 w-4" />{t('admin.dismiss')}</Button></>}</li>)}</ul>
    </div>
  );
}
