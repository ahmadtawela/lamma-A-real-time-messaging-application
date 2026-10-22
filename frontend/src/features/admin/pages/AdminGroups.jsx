import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';
import { adminService } from '@/features/admin/services/adminService';
import { useAsync } from '@/shared/hooks/useAsync';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import { EmptyState, ErrorState, ListSkeleton } from '@/shared/ui/States';

export default function AdminGroups() {
  const { t, formatNumber } = useLanguage();
  const { status, data, error, reload, setData } = useAsync(() => adminService.groups());
  const [del, setDel] = useState(null);
  return (
    <div className="mx-auto max-w-5xl"><h1 className="mb-4 text-xl font-bold">{t('admin.groups')}</h1>
      {status === 'loading' && <ListSkeleton />}{status === 'error' && <ErrorState error={error} onRetry={reload} />}{data && !data.length && <EmptyState title={t('groups.empty')} />}
      <ul className="space-y-2">{data?.map((g) => <li key={g.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"><bdi className="flex-1 font-medium">{g.name}</bdi><span className="text-sm text-text-2">{t('groups.memberCount', { count: g.members })}</span><span className="text-sm text-text-2">{formatNumber(g.messages_count)} {t('chat.messages')}</span>
        <button onClick={() => setDel(g)} aria-label={t('chat.delete')} className="rounded p-1.5 text-danger hover:bg-surface-2"><Trash2 className="h-4 w-4" /></button></li>)}</ul>
      <ConfirmModal open={!!del} title={t('groups.delete')} message={t('groups.deleteConfirm')} onClose={() => setDel(null)} onConfirm={async () => { await adminService.removeGroup(del.id); setData((l) => l.filter((x) => x.id !== del.id)); setDel(null); }} />
    </div>
  );
}
