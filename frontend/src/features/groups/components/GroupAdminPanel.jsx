import { useState } from 'react';
import { Camera, Crown, LinkIcon, LogOut, Pencil, ShieldOff, Trash2, UserMinus, UserPlus, Copy, ShieldPlus } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';
import { useToast } from '@/shared/context/ToastProvider';
import { useChatStore } from '@/features/chat/store/chatStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { groupService } from '@/features/groups/services/groupService';
import { useConversationMeta } from '@/features/chat/hooks/useChatMeta';
import Avatar from '@/shared/ui/Avatar';
import Badge from '@/shared/ui/Badge';
import Button from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import Modal from '@/shared/ui/Modal';
import Toggle from '@/shared/ui/Toggle';
import Menu from '@/shared/ui/Menu';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import UserPicker from '@/features/users/components/UserPicker';

/** Group info + administration. Same component is used in the chat details panel and on the Groups page. */
export default function GroupAdminPanel({ conversation, onDeleted }) {
  const { t } = useLanguage();
  const toast = useToast();
  const me = useAuthStore((s) => s.user.id);
  const upsert = useChatStore((s) => s.upsertConversation);
  const { members, isAdmin } = useConversationMeta(conversation);
  const [modal, setModal] = useState(null); // 'add' | 'edit' | 'delete' | 'leave'
  const [picked, setPicked] = useState([]);
  const [edit, setEdit] = useState({ name: conversation.name, description: conversation.description ?? '' });
  const [busy, setBusy] = useState(false);
  const admins = conversation.admin_ids ?? [];

  const run = async (fn, ok) => { setBusy(true); try { const res = await fn(); if (res?.data) upsert(res.data); if (ok) toast(ok, 'success'); setModal(null); return res; } catch { /* global toast */ } finally { setBusy(false); } };
  const changeImage = (file) => file && run(() => groupService.uploadAvatar(conversation.id, file));

  return (
    <div className="space-y-4">
      <div className="text-center">
        <label className={isAdmin ? 'cursor-pointer' : ''}><span className="relative inline-block"><Avatar name={conversation.name} src={conversation.avatar_url} size="lg" />{isAdmin && <span className="absolute -bottom-1 -end-1 grid h-6 w-6 place-items-center rounded-full bg-accent text-accent-fg"><Camera className="h-3.5 w-3.5" /></span>}</span>
          {isAdmin && <input type="file" accept="image/*" className="sr-only" aria-label={t('groups.changeImage')} onChange={(e) => changeImage(e.target.files[0])} />}</label>
        <bdi className="mt-2 block text-lg font-semibold">{conversation.name}</bdi>
        {conversation.description && <bdi className="block text-sm text-text-2">{conversation.description}</bdi>}
        <p className="text-xs text-text-2">{t('groups.memberCount', { count: members.length })}</p>
      </div>

      {isAdmin && (
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="secondary" onClick={() => { setPicked([]); setModal('add'); }}><UserPlus className="h-4 w-4" />{t('groups.addMember')}</Button>
          <Button size="sm" variant="secondary" onClick={() => { setEdit({ name: conversation.name, description: conversation.description ?? '' }); setModal('edit'); }}><Pencil className="h-4 w-4" />{t('groups.edit')}</Button>
        </div>
      )}

      <section aria-label={t('groups.permissions')} className="space-y-2 rounded-lg border border-border p-3">
        <h3 className="text-sm font-semibold">{t('groups.permissions')}</h3>
        <div className="flex items-center justify-between gap-3 text-sm"><span>{t('groups.restrictMessaging')}<span className="block text-xs text-text-2">{t('groups.restrictHint')}</span></span>
          <Toggle label={t('groups.restrictMessaging')} checked={!!conversation.restrict_messaging} disabled={!isAdmin} onChange={(v) => run(() => groupService.update(conversation.id, { restrict_messaging: v }))} /></div>
        <div className="flex items-center gap-2 text-sm"><LinkIcon className="h-4 w-4 shrink-0 text-text-2" /><bdi dir="ltr" className="min-w-0 flex-1 truncate text-text-2">{conversation.invite_link}</bdi>
          <button onClick={() => { navigator.clipboard?.writeText(conversation.invite_link); toast(t('groups.linkCopied'), 'success'); }} aria-label={t('groups.copyLink')} className="rounded p-1 hover:bg-surface-2"><Copy className="h-4 w-4" /></button></div>
      </section>

      <section aria-label={t('groups.members')}>
        <h3 className="mb-1 text-sm font-semibold">{t('groups.members')}</h3>
        <ul>
          {members.map((u) => (
            <li key={u.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-surface-2">
              <Avatar name={u.name} online={u.is_online} label={t(u.is_online ? 'chat.online' : 'chat.offline')} size="sm" />
              <bdi className="min-w-0 flex-1 truncate text-sm">{u.name}{u.id === me ? ` (${t('chat.you')})` : ''}</bdi>
              {admins.includes(u.id) && <Badge tone="muted"><Crown className="me-1 h-3 w-3" />{t('groups.admin')}</Badge>}
              {isAdmin && u.id !== me && (
                <Menu label={t('chat.more')} trigger={<span className="text-lg leading-none">⋯</span>} items={[
                  { label: t('groups.promote'), icon: ShieldPlus, onClick: () => run(() => groupService.setAdmin(conversation.id, u.id, true)), hidden: admins.includes(u.id) },
                  { label: t('groups.demote'), icon: ShieldOff, onClick: () => run(() => groupService.setAdmin(conversation.id, u.id, false)), hidden: !admins.includes(u.id) },
                  { label: t('groups.removeMember'), icon: UserMinus, danger: true, onClick: () => run(() => groupService.removeMember(conversation.id, u.id)) },
                ]} />
              )}
            </li>
          ))}
        </ul>
      </section>

      <div className="space-y-2">
        <Button variant="secondary" className="w-full" onClick={() => setModal('leave')}><LogOut className="h-4 w-4 rtl:-scale-x-100" />{t('groups.leave')}</Button>
        {isAdmin && <Button variant="danger" className="w-full" onClick={() => setModal('delete')}><Trash2 className="h-4 w-4" />{t('groups.delete')}</Button>}
      </div>

      <Modal open={modal === 'add'} onClose={() => setModal(null)} title={t('groups.addMember')}>
        <UserPicker selected={picked} onChange={setPicked} exclude={conversation.participant_ids} />
        <div className="mt-3 flex justify-end gap-2"><Button variant="ghost" onClick={() => setModal(null)}>{t('common.cancel')}</Button><Button loading={busy} disabled={!picked.length} onClick={() => run(() => groupService.addMembers(conversation.id, picked), t('groups.membersAdded'))}>{t('groups.addMember')}</Button></div>
      </Modal>
      <Modal open={modal === 'edit'} onClose={() => setModal(null)} title={t('groups.edit')}>
        <div className="space-y-3"><Input label={t('groups.name')} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /><Input label={t('groups.description')} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setModal(null)}>{t('common.cancel')}</Button><Button loading={busy} onClick={() => run(() => groupService.update(conversation.id, edit), t('common.saved'))}>{t('common.save')}</Button></div></div>
      </Modal>
      <ConfirmModal open={modal === 'delete'} busy={busy} title={t('groups.delete')} message={t('groups.deleteConfirm')} onClose={() => setModal(null)}
        onConfirm={() => run(async () => { await groupService.remove(conversation.id); useChatStore.setState((s) => ({ conversations: s.conversations.filter((c) => c.id !== conversation.id), activeId: null })); onDeleted?.(); })} />
      <ConfirmModal open={modal === 'leave'} busy={busy} title={t('groups.leave')} message={t('groups.leaveConfirm')} onClose={() => setModal(null)}
        onConfirm={() => run(async () => { await groupService.removeMember(conversation.id, me); useChatStore.setState((s) => ({ conversations: s.conversations.filter((c) => c.id !== conversation.id), activeId: null })); onDeleted?.(); })} />
    </div>
  );
}
