import { useState } from 'react';
import { Search, Eye, Ban, ShieldCheck, Trash2 } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';
import { adminService } from '@/features/admin/services/adminService';
import { useAsync } from '@/shared/hooks/useAsync';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import Avatar from '@/shared/ui/Avatar';
import Button from '@/shared/ui/Button';
import Modal from '@/shared/ui/Modal';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import { EmptyState, ErrorState, ListSkeleton } from '@/shared/ui/States';

export default function AdminUsers() {
  const { t, formatNumber, formatDayTime } = useLanguage();
  const [q, setQ] = useState(''); const dq = useDebouncedValue(q, 250);
  const { status, data, error, reload, setData } = useAsync(() => adminService.users({ q: dq || undefined }), [dq]);
  const [view, setView] = useState(null); const [activity, setActivity] = useState(null); const [del, setDel] = useState(null);
  const open = async (u) => { setView(u); setActivity(null); setActivity((await adminService.userActivity(u.id)).data); };
  const toggle = async (u) => { try { const { data: nu } = await adminService.setBlocked(u.id, !u.is_blocked); setData((l) => l.map((x) => (x.id === u.id ? { ...x, ...nu } : x))); } catch { /* 403 toast */ } };
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-4 text-xl font-bold">{t('admin.users')}</h1>
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-surface px-3"><Search className="h-4 w-4 text-text-2" aria-hidden /><input value={q} onChange={(e) => setQ(e.target.value)} dir="auto" placeholder={t('contacts.search')} aria-label={t('contacts.search')} className="h-10 w-full bg-transparent text-start outline-none" /></div>
      {status === 'loading' && !data && <ListSkeleton />}
      {status === 'error' && <ErrorState error={error} onRetry={reload} />}
      {data && !data.length && <EmptyState title={t('common.noResults')} />}
      {data?.length > 0 && <div className="overflow-x-auto rounded-xl border border-border bg-surface"><table className="w-full text-sm">
        <thead className="bg-surface-2 text-start text-xs text-text-2"><tr>{['admin.user', 'auth.email', 'admin.messages', 'admin.status', ''].map((h, i) => <th key={i} className="px-3 py-2 text-start font-medium">{h && t(h)}</th>)}</tr></thead>
        <tbody>{data.map((u) => (
          <tr key={u.id} className="border-t border-border"><td className="px-3 py-2"><span className="flex items-center gap-2"><Avatar name={u.name} size="sm" /><bdi>{u.name}</bdi></span></td><td className="px-3 py-2"><bdi dir="ltr">{u.email}</bdi></td><td className="px-3 py-2">{formatNumber(u.messages_count)}</td>
            <td className="px-3 py-2"><span className={`rounded px-1.5 text-xs ${u.is_blocked ? 'bg-danger/15 text-danger' : 'bg-success/15 text-success'}`}>{t(u.is_blocked ? 'admin.blocked' : 'admin.active')}</span></td>
            <td className="whitespace-nowrap px-3 py-2 text-end"><button onClick={() => open(u)} aria-label={t('admin.viewActivity')} className="rounded p-1.5 hover:bg-surface-2"><Eye className="h-4 w-4" /></button>
              <button onClick={() => toggle(u)} aria-label={t(u.is_blocked ? 'chat.unblockUser' : 'chat.blockUser')} className="rounded p-1.5 hover:bg-surface-2">{u.is_blocked ? <ShieldCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}</button>
              <button onClick={() => setDel(u)} aria-label={t('chat.delete')} className="rounded p-1.5 text-danger hover:bg-surface-2"><Trash2 className="h-4 w-4" /></button></td></tr>))}</tbody></table></div>}
      <Modal open={!!view} onClose={() => setView(null)} title={view?.name ?? ''}>
        <p className="mb-2 text-sm font-medium">{t('admin.viewActivity')}</p>
        {!activity ? <p className="text-sm text-text-2">{t('common.loading')}</p> : <ul className="max-h-64 divide-y divide-border overflow-y-auto text-sm">{activity.map((a) => <li key={a.id} className="flex justify-between gap-3 py-2"><bdi dir="ltr">{a.action}</bdi><bdi className="text-text-2">{formatDayTime(a.at)}</bdi></li>)}</ul>}
        <div className="mt-3 flex justify-end"><Button variant="ghost" onClick={() => setView(null)}>{t('common.close')}</Button></div>
      </Modal>
      <ConfirmModal open={!!del} title={t('chat.delete')} message={t('admin.deleteUserConfirm', { name: del?.name ?? '' })} onClose={() => setDel(null)} onConfirm={async () => { try { await adminService.removeUser(del.id); setData((l) => l.filter((x) => x.id !== del.id)); } catch { /* toast */ } setDel(null); }} />
    </div>
  );
}
