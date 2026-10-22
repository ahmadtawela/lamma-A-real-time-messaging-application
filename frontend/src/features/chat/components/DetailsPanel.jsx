import { useMemo, useState } from 'react';
import { X, BellOff, Bell, Ban, Flag, Trash2, Eraser, ShieldCheck, Star, Image as ImageIcon, FileText, Link2, Users, Lock } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';
import { useChatStore } from '@/features/chat/store/chatStore';
import { useUiStore } from '@/shared/store/uiStore';
import { useStarredStore } from '@/features/chat/store/starredStore';
import { useUsersStore } from '@/features/users/store/usersStore';
import { contactService } from '@/features/contacts/services/contactService';
import { useConversationMeta } from '@/features/chat/hooks/useChatMeta';
import { domainOf, findUrls, previewOf } from '@/features/chat/lib/text';
import Avatar from '@/shared/ui/Avatar';
import Button from '@/shared/ui/Button';
import Tabs from '@/shared/ui/Tabs';
import Toggle from '@/shared/ui/Toggle';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import GroupAdminPanel from '@/features/groups/components/GroupAdminPanel';

export default function DetailsPanel({ conversation, items, onClose }) {
  const { t, formatBytes, formatRelative, formatTime } = useLanguage();
  const { title, other, isGroup } = useConversationMeta(conversation);
  const starredIds = useStarredStore((s) => s.ids); const setViewer = useUiStore((s) => s.setViewer); const setReport = useUiStore((s) => s.setReport);
  const { updateConversation, clearConversation, deleteConversation } = useChatStore();
  const patchUser = useUsersStore((s) => s.patch);
  const conversations = useChatStore((s) => s.conversations);
  const [tab, setTab] = useState('media'); const [confirm, setConfirm] = useState(null); const [busy, setBusy] = useState(false);

  const media = useMemo(() => items.filter((m) => !m.deleted_at).flatMap((m) => m.attachments.filter((a) => a.mime?.startsWith('image/'))), [items]);
  const files = useMemo(() => items.filter((m) => !m.deleted_at).flatMap((m) => m.attachments.filter((a) => !a.mime?.startsWith('image/') && !a.mime?.startsWith('audio/'))), [items]);
  const links = useMemo(() => items.filter((m) => !m.deleted_at).flatMap((m) => findUrls(m.body ?? '').map((u) => ({ url: u, at: m.created_at }))), [items]);
  const starred = items.filter((m) => starredIds.includes(m.id));
  const sharedGroups = other ? conversations.filter((c) => c.type === 'group' && c.participant_ids.includes(other.id)) : [];

  const run = async (fn) => { setBusy(true); try { await fn(); setConfirm(null); } catch { /* global toast */ } finally { setBusy(false); } };

  return (
    <aside className="flex h-full w-full flex-col overflow-y-auto border-border bg-surface lg:w-80 lg:border-s" aria-label={t('chat.details')}>
      <div className="flex items-center justify-between border-b border-border p-3"><h2 className="font-semibold">{t('chat.details')}</h2><button onClick={onClose} aria-label={t('common.close')} className="rounded p-1.5 hover:bg-surface-2"><X className="h-5 w-5" /></button></div>
      <div className="space-y-4 p-4">
        {isGroup ? <GroupAdminPanel conversation={conversation} onDeleted={onClose} /> : (
          <div className="text-center">
            <Avatar name={title} size="lg" online={!!other?.is_online} label={t(other?.is_online ? 'chat.online' : 'chat.offline')} />
            <bdi className="mt-2 block text-lg font-semibold">{title}</bdi>
            {other && <><bdi className="block text-sm text-text-2" dir="ltr">@{other.username}</bdi>
              <p className="text-xs text-text-2">{other.is_online ? t('chat.online') : t('chat.lastSeen', { when: formatRelative(other.last_seen_at) })}</p>
              {other.about && <bdi className="mt-2 block text-sm">{other.about}</bdi>}
              {other.email && <bdi className="block text-xs text-text-2" dir="ltr">{other.email}</bdi>}</>}
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
          <span className="flex items-center gap-2">{conversation.is_muted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}{t('chat.muteNotifications')}</span>
          <Toggle label={t('chat.muteNotifications')} checked={conversation.is_muted} onChange={(v) => updateConversation(conversation.id, { is_muted: v })} />
        </div>
        <p className="flex items-start gap-2 rounded-lg bg-surface-2 p-3 text-xs text-text-2"><Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{t('chat.encryptionInfo')}</p>

        <Tabs value={tab} onChange={setTab} tabs={[{ value: 'media', label: t('chat.media') }, { value: 'files', label: t('chat.files') }, { value: 'links', label: t('chat.links') }, { value: 'starred', label: t('chat.starredTab') }]} />
        {tab === 'media' && (media.length ? <div className="grid grid-cols-3 gap-1">{media.map((a, i) => <button key={a.id} onClick={() => setViewer({ items: media, index: i })} aria-label={a.name}><img src={a.url} alt="" loading="lazy" className="aspect-square w-full rounded object-cover" /></button>)}</div> : <p className="text-center text-sm text-text-2"><ImageIcon className="mx-auto mb-1 h-6 w-6" />{t('chat.noMedia')}</p>)}
        {tab === 'files' && (files.length ? <ul className="space-y-1">{files.map((a) => <li key={a.id} className="flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-surface-2"><FileText className="h-4 w-4 shrink-0" /><bdi className="min-w-0 flex-1 truncate">{a.name}</bdi><span className="text-xs text-text-2">{formatBytes(a.size)}</span></li>)}</ul> : <p className="text-center text-sm text-text-2">{t('chat.noFiles')}</p>)}
        {tab === 'links' && (links.length ? <ul className="space-y-1">{links.map((l, i) => <li key={i}><a href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-surface-2"><Link2 className="h-4 w-4 shrink-0" /><span dir="ltr" className="truncate">{domainOf(l.url)}</span></a></li>)}</ul> : <p className="text-center text-sm text-text-2">{t('chat.noLinks')}</p>)}
        {tab === 'starred' && (starred.length ? <ul className="space-y-1">{starred.map((m) => <li key={m.id} className="rounded-lg p-2 text-sm hover:bg-surface-2"><Star className="me-1 inline h-3 w-3 fill-current" /><bdi>{previewOf(m, t)}</bdi><span className="ms-2 text-xs text-text-2">{formatTime(m.created_at)}</span></li>)}</ul> : <p className="text-center text-sm text-text-2">{t('chat.noStarred')}</p>)}

        {!isGroup && sharedGroups.length > 0 && <section><h3 className="mb-1 flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4" />{t('chat.sharedGroups')}</h3><ul>{sharedGroups.map((g) => <li key={g.id} className="flex items-center gap-2 p-1 text-sm"><Avatar name={g.name} size="sm" /><bdi>{g.name}</bdi></li>)}</ul></section>}

        <div className="space-y-2 border-t border-border pt-4">
          {other && <Button variant="secondary" className="w-full" onClick={() => setConfirm(other.is_blocked ? 'unblock' : 'block')}>{other.is_blocked ? <ShieldCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}{t(other.is_blocked ? 'chat.unblockUser' : 'chat.blockUser')}</Button>}
          {other && <Button variant="secondary" className="w-full" onClick={() => setReport({ user: other })}><Flag className="h-4 w-4" />{t('chat.reportUser')}</Button>}
          <Button variant="secondary" className="w-full" onClick={() => setConfirm('clear')}><Eraser className="h-4 w-4" />{t('chat.clearChat')}</Button>
          {!isGroup && <Button variant="danger" className="w-full" onClick={() => setConfirm('delete')}><Trash2 className="h-4 w-4" />{t('chat.deleteConversation')}</Button>}
        </div>
      </div>
      <ConfirmModal open={confirm === 'clear'} busy={busy} title={t('chat.clearChat')} message={t('chat.clearConfirm')} onClose={() => setConfirm(null)} onConfirm={() => run(() => clearConversation(conversation.id))} />
      <ConfirmModal open={confirm === 'delete'} busy={busy} title={t('chat.deleteConversation')} message={t('chat.deleteConvConfirm')} onClose={() => setConfirm(null)} onConfirm={() => run(async () => { await deleteConversation(conversation.id); onClose(); })} />
      <ConfirmModal open={confirm === 'block' || confirm === 'unblock'} busy={busy} danger={confirm === 'block'} title={t(confirm === 'block' ? 'chat.blockUser' : 'chat.unblockUser')} message={t(confirm === 'block' ? 'chat.blockConfirm' : 'chat.unblockConfirm', { name: title })} onClose={() => setConfirm(null)}
        onConfirm={() => run(async () => { const { data } = await contactService.block(other.id, confirm === 'block'); patchUser(other.id, data); })} />
    </aside>
  );
}
