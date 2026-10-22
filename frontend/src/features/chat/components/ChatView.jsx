import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Phone, Video, Info, Pin, X, ChevronUp, ChevronDown, Forward, Star, Copy, Trash2, BellOff, UploadCloud } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';
import { useToast } from '@/shared/context/ToastProvider';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useChatStore } from '@/features/chat/store/chatStore';
import { useUiStore } from '@/shared/store/uiStore';
import { useStarredStore } from '@/features/chat/store/starredStore';
import { useUsersStore } from '@/features/users/store/usersStore';
import { useCallStore } from '@/features/calls/store/callStore';
import { useMessages } from '@/features/chat/hooks/useMessages';
import { useConversationMeta } from '@/features/chat/hooks/useChatMeta';
import { conversationService } from '@/features/chat/services/conversationService';
import { previewOf } from '@/features/chat/lib/text';
import Avatar from '@/shared/ui/Avatar';
import Menu from '@/shared/ui/Menu';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import { EmptyState } from '@/shared/ui/States';
import DirIcon from '@/shared/ui/DirIcon';
import MessageList from '@/features/chat/components/MessageList';
import Composer from '@/features/chat/components/Composer';
import DetailsPanel from '@/features/chat/components/DetailsPanel';

export default function ChatView({ conversationId }) {
  const { t, formatRelative } = useLanguage();
  const toast = useToast();
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const conversation = useChatStore((s) => s.conversations.find((c) => c.id === conversationId));
  const listStatus = useChatStore((s) => s.listStatus);
  const typingMap = useChatStore((s) => s.typing[conversationId]);      // select the raw (stable) object; derive the array below
  const typing = Object.keys(typingMap ?? {});
  const { selectConversation, deleteMessage, toggleReaction, retryMessage, votePoll, pinMessage, updateConversation, upsertConversation } = useChatStore();
  const users = useUsersStore((s) => s.byId);
  const { setForward, setReport, detailsOpen, setDetailsOpen } = useUiStore();
  const starred = useStarredStore((s) => s.ids); const toggleStar = useStarredStore((s) => s.toggle);
  const startCall = useCallStore((s) => s.startCall);
  const { items, status, error, hasMore, loadOlder, reload } = useMessages(conversationId);
  const { title, other, isGroup, isAdmin } = useConversationMeta(conversation);

  const [replyTo, setReplyTo] = useState(null); const [editing, setEditing] = useState(null);
  const [selectMode, setSelectMode] = useState(false); const [selected, setSelected] = useState(new Set());
  const [searching, setSearching] = useState(false); const [query, setQuery] = useState(''); const [matchIdx, setMatchIdx] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(null); const [dragging, setDragging] = useState(false); const [dropped, setDropped] = useState(null);
  const [missing, setMissing] = useState(false); const dragDepth = useRef(0);

  useEffect(() => { selectConversation(conversationId); setReplyTo(null); setEditing(null); setSelectMode(false); setSelected(new Set()); setSearching(false); setQuery(''); /* eslint-disable-next-line */ }, [conversationId]);
  // Deep link to a chat that the current list filter hides: fetch it directly (404 -> not found state).
  useEffect(() => {
    if (conversation || listStatus !== 'ready') return;
    conversationService.get(conversationId).then(({ data }) => upsertConversation(data)).catch(() => setMissing(true));
  }, [conversation, listStatus, conversationId, upsertConversation]);

  const byId = useMemo(() => Object.fromEntries(items.map((m) => [m.id, m])), [items]);
  const matches = useMemo(() => (query.trim() ? items.filter((m) => !m.deleted_at && m.body?.toLowerCase().includes(query.toLowerCase())) : []), [items, query]);
  const pinned = useMemo(() => [...items].reverse().find((m) => m.pinned_at && !m.deleted_at), [items]);
  const jumpTo = (id) => document.getElementById(`msg-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  const step = (d) => { if (!matches.length) return; const n = (matchIdx + d + matches.length) % matches.length; setMatchIdx(n); jumpTo(matches[n].id); };

  const onAction = (action, m, arg) => {
    switch (action) {
      case 'reply': setEditing(null); setReplyTo(m); break;
      case 'edit': setReplyTo(null); setEditing(m); break;
      case 'copy': navigator.clipboard?.writeText(m.body ?? '').then(() => toast(t('chat.copied'), 'success')); break;
      case 'star': toggleStar(m.id); break;
      case 'pin': pinMessage(conversationId, m.id, !m.pinned_at).catch(() => {}); break;
      case 'forward': setForward([m]); break;
      case 'select': setSelectMode(true); setSelected(new Set([m.id])); break;
      case 'report': setReport({ message: m }); break;
      case 'delete': setConfirmDelete([m.id]); break;
      case 'react': toggleReaction(conversationId, m.id, arg).catch(() => {}); break;
      case 'vote': votePoll(conversationId, m.id, arg); break;
      case 'retry': retryMessage(conversationId, m.client_id); break;
      default: break;
    }
  };
  const toggleSelect = (id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); if (!n.size) setSelectMode(false); return n; });
  const chosen = items.filter((m) => selected.has(m.id));
  const exitSelect = () => { setSelectMode(false); setSelected(new Set()); };

  const dragProps = {
    onDragEnter: (e) => { e.preventDefault(); dragDepth.current++; setDragging(true); },
    onDragOver: (e) => e.preventDefault(),
    onDragLeave: () => { if (--dragDepth.current <= 0) { dragDepth.current = 0; setDragging(false); } },
    onDrop: (e) => { e.preventDefault(); dragDepth.current = 0; setDragging(false); if (e.dataTransfer.files.length) setDropped([...e.dataTransfer.files]); },
  };

  if (!conversation) return missing ? <EmptyState title={t('chat.notFound')} action={<button className="text-accent hover:underline" onClick={() => navigate('/app')}>{t('chat.backToChats')}</button>} /> : <div className="flex-1 p-4"><div className="lm-skeleton h-12 w-full rounded-lg" /></div>;

  const presence = typing.length ? t('chat.typing') : isGroup ? t('groups.memberCount', { count: conversation.participant_ids.length }) : other?.is_online ? t('chat.online') : other ? t('chat.lastSeen', { when: formatRelative(other.last_seen_at) }) : '';
  const blocked = !!other?.is_blocked;
  const cannotPost = isGroup && conversation.restrict_messaging && !isAdmin;
  const peerForCall = other;

  return (
    <div className="flex min-h-0 flex-1">
      <section className="relative flex min-h-0 min-w-0 flex-1 flex-col" {...dragProps}>
        {selectMode ? (
          <header className="flex items-center gap-2 border-b border-border bg-surface px-3 py-2">
            <button onClick={exitSelect} aria-label={t('common.cancel')} className="rounded-lg p-2 hover:bg-surface-2"><X className="h-5 w-5" /></button>
            <p className="flex-1 font-semibold">{t('chat.selectedCount', { count: selected.size })}</p>
            <button onClick={() => { setForward(chosen); exitSelect(); }} aria-label={t('chat.forward')} className="rounded-lg p-2 hover:bg-surface-2"><Forward className="h-5 w-5 rtl:-scale-x-100" /></button>
            <button onClick={() => chosen.forEach((m) => toggleStar(m.id))} aria-label={t('chat.star')} className="rounded-lg p-2 hover:bg-surface-2"><Star className="h-5 w-5" /></button>
            <button onClick={() => { navigator.clipboard?.writeText(chosen.map((m) => m.body).filter(Boolean).join('\n')); toast(t('chat.copied'), 'success'); exitSelect(); }} aria-label={t('chat.copy')} className="rounded-lg p-2 hover:bg-surface-2"><Copy className="h-5 w-5" /></button>
            <button onClick={() => setConfirmDelete(chosen.filter((m) => m.sender_id === me.id).map((m) => m.id))} disabled={!chosen.some((m) => m.sender_id === me.id)} aria-label={t('chat.delete')} className="rounded-lg p-2 text-danger hover:bg-surface-2 disabled:opacity-40"><Trash2 className="h-5 w-5" /></button>
          </header>
        ) : (
          <header className="flex items-center gap-2 border-b border-border bg-surface px-2 py-2 md:px-3">
            <button onClick={() => navigate('/app')} aria-label={t('chat.backToChats')} className="rounded-lg p-2 hover:bg-surface-2 md:hidden"><DirIcon icon={ArrowLeft} className="h-5 w-5" /></button>
            <button onClick={() => setDetailsOpen(true)} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 text-start hover:bg-surface-2" aria-label={t('chat.details')}>
              <Avatar name={title} src={conversation.avatar_url} online={isGroup ? undefined : !!other?.is_online} label={t(other?.is_online ? 'chat.online' : 'chat.offline')} />
              <span className="min-w-0"><bdi className="block truncate font-semibold">{title}</bdi>
                <span className={`flex items-center gap-1 text-xs ${typing.length ? 'text-accent' : 'text-text-2'}`}>{typing.length > 0 && <span className="lm-typing" aria-hidden><span /><span /><span /></span>}{presence}</span></span>
              {conversation.is_muted && <BellOff className="h-4 w-4 text-text-2" aria-label={t('chat.muted')} />}
            </button>
            <button onClick={() => setSearching((s) => !s)} aria-label={t('chat.searchInChat')} aria-pressed={searching} className="rounded-lg p-2 text-text-2 hover:bg-surface-2"><Search className="h-5 w-5" /></button>
            {peerForCall && <button onClick={() => startCall(peerForCall, 'voice')} aria-label={t('calls.voiceCall')} className="rounded-lg p-2 text-text-2 hover:bg-surface-2"><Phone className="h-5 w-5" /></button>}
            {peerForCall && <button onClick={() => startCall(peerForCall, 'video')} aria-label={t('calls.videoCall')} className="rounded-lg p-2 text-text-2 hover:bg-surface-2"><Video className="h-5 w-5" /></button>}
            <Menu label={t('chat.more')} trigger={<span className="text-lg leading-none">⋯</span>} items={[
              { label: t('chat.details'), icon: Info, onClick: () => setDetailsOpen(!detailsOpen) },
              { label: t(conversation.is_muted ? 'chat.unmute' : 'chat.mute'), icon: BellOff, onClick: () => updateConversation(conversationId, { is_muted: !conversation.is_muted }) },
              { label: t('chat.selectMessages'), icon: Star, onClick: () => { setSelectMode(true); } },
            ]} />
          </header>
        )}

        {searching && (
          <div className="flex items-center gap-2 border-b border-border bg-surface px-3 py-2">
            <input autoFocus value={query} onChange={(e) => { setQuery(e.target.value); setMatchIdx(0); }} onKeyDown={(e) => e.key === 'Enter' && step(e.shiftKey ? -1 : 1)} dir="auto" placeholder={t('chat.searchInChat')} aria-label={t('chat.searchInChat')} className="h-9 flex-1 rounded-lg bg-surface-2 px-3 text-start outline-none" />
            <span className="text-xs text-text-2">{query ? t('chat.matches', { current: matches.length ? matchIdx + 1 : 0, total: matches.length }) : ''}</span>
            <button onClick={() => step(-1)} aria-label={t('chat.prev')} className="rounded p-1 hover:bg-surface-2"><ChevronUp className="h-4 w-4" /></button>
            <button onClick={() => step(1)} aria-label={t('chat.next')} className="rounded p-1 hover:bg-surface-2"><ChevronDown className="h-4 w-4" /></button>
            <button onClick={() => { setSearching(false); setQuery(''); }} aria-label={t('common.close')} className="rounded p-1 hover:bg-surface-2"><X className="h-4 w-4" /></button>
          </div>
        )}
        {pinned && (
          <div className="flex items-center gap-2 border-b border-border bg-surface px-3 py-1.5 text-sm">
            <Pin className="h-4 w-4 shrink-0 text-accent" aria-hidden /><button onClick={() => jumpTo(pinned.id)} className="min-w-0 flex-1 truncate text-start"><span className="text-xs font-semibold text-accent">{t('chat.pinnedMessage')}</span> <bdi className="text-text-2">{previewOf(pinned, t)}</bdi></button>
            <button onClick={() => pinMessage(conversationId, pinned.id, false)} aria-label={t('chat.unpin')} className="rounded p-1 hover:bg-surface-2"><X className="h-4 w-4" /></button>
          </div>
        )}

        <MessageList items={items} status={status} error={error} hasMore={hasMore} onLoadOlder={loadOlder} onReload={reload} meId={me.id} users={users} byId={byId} isGroup={isGroup}
          selectMode={selectMode} selected={selected} starred={starred} query={query} onAction={onAction} onSelect={toggleSelect} />

        <Composer key={conversationId} conversationId={conversationId} replyTo={replyTo} replyToSender={replyTo && users[replyTo.sender_id]} editing={editing}
          onCancelContext={() => { setReplyTo(null); setEditing(null); }} dropped={dropped} onDroppedHandled={() => setDropped(null)}
          disabled={blocked || cannotPost} disabledReason={blocked ? t('chat.youBlocked') : t('groups.onlyAdminsCanPost')} />

        {dragging && <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center border-2 border-dashed border-accent bg-accent/10"><p className="flex items-center gap-2 rounded-lg bg-surface px-4 py-2 font-medium"><UploadCloud className="h-5 w-5 text-accent" />{t('chat.dropFiles')}</p></div>}
      </section>

      {detailsOpen && <div className="fixed inset-0 z-30 lg:static lg:inset-auto"><DetailsPanel conversation={conversation} items={items} onClose={() => setDetailsOpen(false)} /></div>}

      <ConfirmModal open={!!confirmDelete} title={t('chat.deleteMessage')} message={t('chat.deleteMessageConfirm')} onClose={() => setConfirmDelete(null)}
        onConfirm={async () => { for (const id of confirmDelete) await deleteMessage(conversationId, id).catch(() => {}); setConfirmDelete(null); exitSelect(); }} />
    </div>
  );
}
