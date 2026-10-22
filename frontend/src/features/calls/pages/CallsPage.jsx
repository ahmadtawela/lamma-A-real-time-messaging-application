import { useEffect } from 'react';
import { PhoneIncoming, PhoneOutgoing, PhoneMissed, Phone, Video, Phone as PhoneIcon } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';
import { useCallStore } from '@/features/calls/store/callStore';
import { useUsersStore } from '@/features/users/store/usersStore';
import { realtime } from '@/realtime/realtimeService';
import Page from '@/shared/ui/Page';
import Button from '@/shared/ui/Button';
import Avatar from '@/shared/ui/Avatar';
import { EmptyState, ErrorState, ListSkeleton } from '@/shared/ui/States';

export default function CallsPage() {
  const { t, formatDayTime, formatDuration } = useLanguage();
  const { history, historyStatus, loadHistory, startCall } = useCallStore();
  const users = useUsersStore((s) => s.byId);
  useEffect(() => { loadHistory(); }, [loadHistory]);
  return (
    <Page title={t('calls.title')} narrow actions={realtime.simulate && <>
      <Button size="sm" variant="secondary" onClick={() => realtime.simulate('CallIncoming', { peerId: 2, kind: 'voice' })}>{t('calls.simulateIncoming')}</Button>
      <Button size="sm" variant="secondary" onClick={() => realtime.simulate('CallIncoming', { peerId: 3, kind: 'video' })} aria-label={t('calls.incomingVideo')}><Video className="h-4 w-4" /></Button></>}>
      {historyStatus === 'loading' && <ListSkeleton />}
      {historyStatus === 'error' && <ErrorState onRetry={loadHistory} />}
      {historyStatus === 'ready' && !history.length && <EmptyState icon={PhoneIcon} title={t('calls.empty')} />}
      <ul className="space-y-1">{history.map((c) => { const peer = users[c.peer_id]; const Icon = c.status === 'missed' ? PhoneMissed : c.direction === 'incoming' ? PhoneIncoming : PhoneOutgoing; return (
        <li key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
          <Avatar name={peer?.name ?? '?'} />
          <span className="min-w-0 flex-1"><bdi className={`block truncate font-medium ${c.status === 'missed' ? 'text-danger' : ''}`}>{peer?.name}</bdi>
            <span className="flex items-center gap-1 text-xs text-text-2"><Icon className={`h-3.5 w-3.5 rtl:-scale-x-100 ${c.status === 'missed' ? 'text-danger' : ''}`} />{t(`calls.status_${c.status}`)} · <bdi>{formatDayTime(c.created_at)}</bdi>{c.duration > 0 && <> · <bdi>{formatDuration(c.duration)}</bdi></>}</span></span>
          {peer && <><button onClick={() => startCall(peer, 'voice')} aria-label={t('calls.voiceCall')} className="rounded-lg p-2 hover:bg-surface-2"><Phone className="h-5 w-5" /></button><button onClick={() => startCall(peer, 'video')} aria-label={t('calls.videoCall')} className="rounded-lg p-2 hover:bg-surface-2"><Video className="h-5 w-5" /></button></>}
        </li>); })}</ul>
    </Page>
  );
}
