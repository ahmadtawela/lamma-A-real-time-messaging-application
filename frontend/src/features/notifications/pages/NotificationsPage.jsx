import { useEffect } from 'react';
import { MessageCircle, AtSign, Users, Phone, Heart, UserPlus, Info, Trash2, CheckCheck, Bell } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';
import { useNotificationsStore } from '@/features/notifications/store/notificationsStore';
import Page from '@/shared/ui/Page';
import Button from '@/shared/ui/Button';
import { EmptyState, ErrorState, ListSkeleton } from '@/shared/ui/States';

const ICONS = { message: MessageCircle, mention: AtSign, group_invitation: Users, missed_call: Phone, reaction: Heart, contact_request: UserPlus, system: Info };

export default function NotificationsPage() {
  const { t, formatDayTime } = useLanguage();
  const { items, status, error, load, markRead, markAllRead, remove } = useNotificationsStore();
  useEffect(() => { if (status === 'idle') load(); }, [status, load]);
  return (
    <Page title={t('notifications.title')} narrow actions={<Button variant="secondary" size="sm" onClick={markAllRead} disabled={!items.some((n) => !n.read_at)}><CheckCheck className="h-4 w-4" />{t('notifications.markAll')}</Button>}>
      {status === 'loading' && <ListSkeleton />}
      {status === 'error' && <ErrorState error={error} onRetry={load} />}
      {status === 'ready' && items.length === 0 && <EmptyState icon={Bell} title={t('notifications.empty')} />}
      <ul className="space-y-1">{items.map((n) => { const Icon = ICONS[n.type] ?? Info; return (
        <li key={n.id} className={`flex items-start gap-3 rounded-xl border border-border p-3 ${n.read_at ? 'bg-surface' : 'bg-accent/5'}`}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2"><Icon className="h-4 w-4" /></span>
          <button onClick={() => markRead(n.id)} className="min-w-0 flex-1 text-start">
            <span className="flex items-center gap-2 text-xs font-semibold text-accent">{t(`notifications.type_${n.type}`)}{!n.read_at && <span className="h-2 w-2 rounded-full bg-accent" aria-label={t('notifications.unread')} />}</span>
            <bdi className="block text-sm">{n.body}</bdi><bdi className="text-xs text-text-2">{formatDayTime(n.created_at)}</bdi>
          </button>
          <button onClick={() => remove(n.id)} aria-label={t('chat.delete')} className="rounded p-1.5 text-text-2 hover:bg-surface-2"><Trash2 className="h-4 w-4" /></button>
        </li>); })}</ul>
    </Page>
  );
}
