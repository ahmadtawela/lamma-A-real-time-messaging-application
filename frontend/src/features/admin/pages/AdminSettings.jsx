import { useLanguage } from '@/shared/context/LanguageProvider';
import { useToast } from '@/shared/context/ToastProvider';
import { adminService } from '@/features/admin/services/adminService';
import { useAsync } from '@/shared/hooks/useAsync';
import Toggle from '@/shared/ui/Toggle';
import { ErrorState, ListSkeleton } from '@/shared/ui/States';

export default function AdminSettings() {
  const { t, formatDayTime } = useLanguage();
  const toast = useToast();
  const { status, data, error, reload, setData } = useAsync(() => adminService.settings());
  const logs = useAsync(() => adminService.logs());
  const save = async (patch) => { setData((d) => ({ ...d, ...patch })); try { await adminService.saveSettings(patch); toast(t('common.saved'), 'success'); } catch { reload(); } };
  return (
    <div className="mx-auto max-w-3xl"><h1 className="mb-4 text-xl font-bold">{t('admin.settings')}</h1>
      {status === 'loading' && <ListSkeleton rows={3} />}{status === 'error' && <ErrorState error={error} onRetry={reload} />}
      {data && <section className="rounded-xl border border-border bg-surface px-4">{['registration_open', 'require_email_verification', 'maintenance_mode'].map((k) => (
        <div key={k} className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-0"><span className="text-sm font-medium">{t(`admin.set_${k}`)}</span><Toggle checked={data[k]} onChange={(v) => save({ [k]: v })} label={t(`admin.set_${k}`)} /></div>))}</section>}
      <h2 className="mb-2 mt-6 font-semibold">{t('admin.logs')}</h2>
      <ul className="divide-y divide-border rounded-xl border border-border bg-surface text-sm">{(logs.data ?? []).map((l) => <li key={l.id} className="flex items-center gap-3 px-3 py-2"><span className={`rounded px-1.5 text-xs ${l.level === 'error' ? 'bg-danger/15 text-danger' : l.level === 'warning' ? 'bg-warning/15 text-warning' : 'bg-surface-2 text-text-2'}`}>{l.level}</span><bdi className="flex-1" dir="ltr">{l.message}</bdi><bdi className="text-xs text-text-2">{formatDayTime(l.created_at)}</bdi></li>)}</ul>
    </div>
  );
}
