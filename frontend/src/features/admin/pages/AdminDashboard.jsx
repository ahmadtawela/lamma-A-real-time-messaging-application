import { Users, Activity, MessageSquare, MessagesSquare, Flag, HardDrive } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';
import { adminService } from '@/features/admin/services/adminService';
import { useAsync } from '@/shared/hooks/useAsync';
import { ErrorState } from '@/shared/ui/States';

export default function AdminDashboard() {
  const { t, formatNumber } = useLanguage();
  const { status, data, error, reload } = useAsync(() => adminService.stats());
  const logs = useAsync(() => adminService.logs());
  if (status === 'error') return <ErrorState error={error} onRetry={reload} />;
  const cards = data && [['admin.totalUsers', data.total_users, Users], ['admin.activeUsers', data.active_users, Activity], ['admin.messages', data.messages, MessageSquare], ['admin.groups', data.groups, MessagesSquare], ['admin.reports', data.reports_open, Flag]];
  const max = data ? Math.max(...data.messages_per_day) : 1;
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-4 text-xl font-bold">{t('admin.dashboard')}</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{status === 'loading' ? Array.from({ length: 5 }, (_, i) => <div key={i} className="lm-skeleton h-24 rounded-xl" />) : cards.map(([k, v, Icon]) => (
        <div key={k} className="rounded-xl border border-border bg-surface p-4"><Icon className="mb-2 h-5 w-5 text-accent" /><p className="text-2xl font-bold">{formatNumber(v)}</p><p className="text-xs text-text-2">{t(k)}</p></div>))}</div>
      {data && <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-4"><h2 className="mb-3 font-semibold">{t('admin.messagesPerDay')}</h2>
          <div className="flex h-36 items-end gap-2" dir="ltr" role="img" aria-label={t('admin.messagesPerDay')}>{data.messages_per_day.map((v, i) => <div key={i} className="flex flex-1 flex-col items-center gap-1"><div className="w-full rounded-t bg-accent" style={{ height: `${(v / max) * 100}%` }} title={formatNumber(v)} /><span className="text-[10px] text-text-2">{formatNumber(i + 1)}</span></div>)}</div></section>
        <section className="rounded-xl border border-border bg-surface p-4"><h2 className="mb-3 flex items-center gap-2 font-semibold"><HardDrive className="h-4 w-4" />{t('admin.storage')}</h2>
          <div className="h-3 overflow-hidden rounded bg-border"><div className="h-full bg-accent" style={{ width: `${(data.storage_used_gb / data.storage_total_gb) * 100}%` }} /></div>
          <p className="mt-2 text-sm text-text-2"><bdi>{formatNumber(data.storage_used_gb)} / {formatNumber(data.storage_total_gb)} GB</bdi></p></section></div>}
      <section className="mt-4 rounded-xl border border-border bg-surface p-4"><h2 className="mb-2 font-semibold">{t('admin.logs')}</h2>
        <ul className="divide-y divide-border text-sm">{(logs.data ?? []).slice(0, 6).map((l) => <li key={l.id} className="flex items-center gap-3 py-2"><span className={`rounded px-1.5 text-xs ${l.level === 'error' ? 'bg-danger/15 text-danger' : l.level === 'warning' ? 'bg-warning/15 text-warning' : 'bg-surface-2 text-text-2'}`}>{l.level}</span><bdi className="flex-1" dir="ltr">{l.message}</bdi></li>)}</ul></section>
    </div>
  );
}
