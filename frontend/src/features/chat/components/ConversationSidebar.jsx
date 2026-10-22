import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, SquarePen, Users, Pin, BellOff, Archive, ArchiveRestore, MailOpen, Mail, Trash2, Ban, Pencil } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';
import { useChatStore } from '@/features/chat/store/chatStore';
import { useUiStore } from '@/shared/store/uiStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useConversations } from '@/features/chat/hooks/useConversations';
import { useConversationMeta } from '@/features/chat/hooks/useChatMeta';
import { previewOf } from '@/features/chat/lib/text';
import Avatar from '@/shared/ui/Avatar';
import Badge from '@/shared/ui/Badge';
import Tabs from '@/shared/ui/Tabs';
import Menu from '@/shared/ui/Menu';
import { EmptyState, ErrorState, ListSkeleton } from '@/shared/ui/States';
import Button from '@/shared/ui/Button';
import Logo from '@/shared/ui/Logo';

function ConversationItem({ c, active }) {
  const { t, formatTime } = useLanguage();
  const navigate = useNavigate();
  const { title, other, isGroup } = useConversationMeta(c);
  const typing = useChatStore((s) => Object.keys(s.typing[c.id] ?? {}).length > 0);
  const update = useChatStore((s) => s.updateConversation); const remove = useChatStore((s) => s.deleteConversation);
  const meId = useAuthStore((s) => s.user?.id);
  const last = c.last_message;
  const mine = last && last.sender_id === meId;
  return (
    <li className="group relative">
      <button onClick={() => navigate(`/app/chat/${c.id}`)} aria-current={active ? 'page' : undefined} className={`flex w-full items-center gap-3 rounded-lg p-2 text-start transition hover:bg-surface-2 ${active ? 'bg-surface-2' : ''}`}>
        <Avatar name={title} src={c.avatar_url} online={isGroup ? undefined : !!other?.is_online} label={t(other?.is_online ? 'chat.online' : 'chat.offline')} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1"><bdi className="truncate font-medium">{title}</bdi>{isGroup && <Users className="h-3.5 w-3.5 shrink-0 text-text-2" aria-label={t('chat.group')} />}{c.is_pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-text-2" aria-label={t('chat.pinned')} />}{c.is_muted && <BellOff className="h-3.5 w-3.5 shrink-0 text-text-2" aria-label={t('chat.muted')} />}</span>
          <span className={`flex items-center gap-1 truncate text-sm ${typing || c.draft ? 'text-accent' : 'text-text-2'}`}>
            {typing ? t('chat.typing') : c.draft ? <><Pencil className="h-3 w-3 shrink-0" /><bdi className="truncate">{t('chat.draft')}: {c.draft}</bdi></> : last ? <bdi className="truncate">{mine ? `${t('chat.you')}: ` : ''}{previewOf(last, t)}</bdi> : null}
          </span>
        </span>
        <span className="flex flex-col items-end gap-1 text-xs text-text-2">
          {last && <bdi>{formatTime(last.created_at)}</bdi>}
          {c.unread_count > 0 && <Badge tone={c.is_muted ? 'muted' : 'accent'}>{c.unread_count}</Badge>}
        </span>
      </button>
      <div className="absolute end-1 top-1 hidden group-focus-within:block group-hover:block">
        <Menu label={t('chat.more')} trigger={<span className="text-lg leading-none">⋯</span>} items={[
          { label: t(c.is_pinned ? 'chat.unpin' : 'chat.pin'), icon: Pin, onClick: () => update(c.id, { is_pinned: !c.is_pinned }) },
          { label: t(c.is_muted ? 'chat.unmute' : 'chat.mute'), icon: BellOff, onClick: () => update(c.id, { is_muted: !c.is_muted }) },
          { label: t(c.is_archived ? 'chat.unarchive' : 'chat.archive'), icon: c.is_archived ? ArchiveRestore : Archive, onClick: () => update(c.id, { is_archived: !c.is_archived }) },
          { label: t('chat.markRead'), icon: MailOpen, onClick: () => update(c.id, { unread_count: 0 }), hidden: !c.unread_count },
          { label: t('chat.markUnread'), icon: Mail, onClick: () => update(c.id, { unread_count: 1 }), hidden: c.unread_count > 0 },
          { label: t('chat.deleteConversation'), icon: Trash2, danger: true, onClick: () => remove(c.id), hidden: isGroup },
        ]} />
      </div>
    </li>
  );
}

export default function ConversationSidebar({ className = '' }) {
  const { t } = useLanguage();
  const { conversationId } = useParams();
  const [filter, setFilter] = useState('all'); const [query, setQuery] = useState('');
  const { items, status, error, reload } = useConversations({ filter, query });
  const { setNewChatOpen, setNewGroupOpen } = useUiStore();
  return (
    <aside className={`min-h-0 flex-col border-border bg-surface md:w-80 md:border-e lg:w-96 ${className}`} aria-label={t('chat.chats')}>
      <div className="flex items-center justify-between gap-2 p-3">
        <div className="flex items-center gap-2"><Logo className="h-8 w-8" /><h1 className="text-lg font-bold">{t('chat.chats')}</h1></div>
        <div className="flex gap-1">
          <button onClick={() => setNewChatOpen(true)} aria-label={t('chat.newChat')} className="rounded-lg p-2 hover:bg-surface-2"><SquarePen className="h-5 w-5" /></button>
          <button onClick={() => setNewGroupOpen(true)} aria-label={t('groups.create')} className="rounded-lg p-2 hover:bg-surface-2"><Users className="h-5 w-5" /></button>
        </div>
      </div>
      <div className="space-y-2 px-3 pb-2">
        <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-3"><Search className="h-4 w-4 text-text-2" aria-hidden /><input value={query} onChange={(e) => setQuery(e.target.value)} dir="auto" placeholder={t('chat.searchChats')} aria-label={t('chat.searchChats')} className="h-10 w-full bg-transparent text-start outline-none placeholder:text-text-2" /></div>
        <Tabs value={filter} onChange={setFilter} tabs={['all', 'unread', 'groups', 'contacts', 'archived'].map((f) => ({ value: f, label: t(`chat.${f}`) }))} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {status === 'loading' && items.length === 0 && <ListSkeleton />}
        {status === 'error' && <ErrorState error={error} onRetry={reload} />}
        {status === 'ready' && items.length === 0 && <EmptyState title={query ? t('common.noResults') : t('common.emptyTitle')} hint={!query && filter === 'all' ? t('common.emptyAction') : undefined} action={!query && filter === 'all' && <Button size="sm" onClick={() => setNewChatOpen(true)}>{t('chat.newChat')}</Button>} />}
        <ul>{items.map((c) => <ConversationItem key={c.id} c={c} active={String(c.id) === conversationId} />)}</ul>
      </div>
    </aside>
  );
}
