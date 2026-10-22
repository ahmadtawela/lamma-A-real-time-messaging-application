import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Search } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';
import { useToast } from '@/shared/context/ToastProvider';
import { useUiStore } from '@/shared/store/uiStore';
import { useChatStore } from '@/features/chat/store/chatStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { conversationService } from '@/features/chat/services/conversationService';
import { groupService } from '@/features/groups/services/groupService';
import { messageService } from '@/features/chat/services/messageService';
import { useApiForm } from '@/shared/hooks/useApiForm';
import { useConversationMeta } from '@/features/chat/hooks/useChatMeta';
import Modal from '@/shared/ui/Modal';
import Button from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import Select from '@/shared/ui/Select';
import Avatar from '@/shared/ui/Avatar';
import UserPicker from '@/features/users/components/UserPicker';

export function NewChatModal() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const open = useUiStore((s) => s.newChatOpen); const close = () => useUiStore.getState().setNewChatOpen(false);
  const upsert = useChatStore((s) => s.upsertConversation);
  const start = async (u) => { const { data } = await conversationService.startWith(u.id); upsert(data); close(); navigate(`/app/chat/${data.id}`); };
  return <Modal open={open} onClose={close} title={t('chat.newChat')}><UserPicker multiple={false} onPick={start} /></Modal>;
}

export function NewGroupModal() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const open = useUiStore((s) => s.newGroupOpen); const close = () => useUiStore.getState().setNewGroupOpen(false);
  const upsert = useChatStore((s) => s.upsertConversation);
  const [members, setMembers] = useState([]); const [image, setImage] = useState(null); const [imageFile, setImageFile] = useState(null);
  const form = useApiForm({ name: '', description: '' }, async (v) => {
    let { data } = await groupService.create({ ...v, user_ids: members });
    if (imageFile) { try { data = (await groupService.uploadAvatar(data.id, imageFile)).data; } catch { /* the group exists; avatar can be set later */ } }
    upsert(data); close(); setMembers([]); setImage(null); setImageFile(null); navigate(`/app/chat/${data.id}`);
  });
  return (
    <Modal open={open} onClose={close} title={t('groups.create')}>
      <form onSubmit={form.submit} className="space-y-3" noValidate>
        <label className="mx-auto flex w-fit cursor-pointer flex-col items-center text-sm text-text-2"><span className="relative"><Avatar name={form.values.name || '+'} src={image} size="lg" /><span className="absolute -bottom-1 -end-1 grid h-6 w-6 place-items-center rounded-full bg-accent text-accent-fg"><Camera className="h-3.5 w-3.5" /></span></span>{t('groups.image')}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files[0]; if (f) { setImage(URL.createObjectURL(f)); setImageFile(f); } }} /></label>
        <Input label={t('groups.name')} value={form.values.name} onChange={form.set('name')} error={form.field('name') && t('groups.nameRequired')} />
        <Input label={t('groups.description')} value={form.values.description} onChange={form.set('description')} />
        <p className="text-sm font-medium">{t('groups.addMembers')} ({members.length})</p>
        <UserPicker selected={members} onChange={setMembers} />
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={close}>{t('common.cancel')}</Button><Button type="submit" loading={form.busy}>{t('groups.create')}</Button></div>
      </form>
    </Modal>
  );
}

export function ForwardModal() {
  const { t } = useLanguage();
  const toast = useToast();
  const messages = useUiStore((s) => s.forward); const close = () => useUiStore.getState().setForward(null);
  const conversations = useChatStore((s) => s.conversations);
  const send = useChatStore((s) => s.sendMessage);
  const [picked, setPicked] = useState([]); const [q, setQ] = useState('');
  const list = conversations.filter((c) => !c.is_archived);
  const confirm = async () => {
    for (const cid of picked) for (const m of messages) await send({ conversationId: cid, body: m.body, type: m.type, attachments: m.attachments, meta: { ...(m.meta ?? {}), forwarded: true } });
    toast(t('chat.forwardedTo', { count: picked.length }), 'success'); setPicked([]); close();
  };
  return (
    <Modal open={!!messages} onClose={close} title={t('chat.forwardTitle')}>
      <div className="mb-2 flex items-center gap-2 rounded-lg bg-surface-2 px-3"><Search className="h-4 w-4 text-text-2" aria-hidden /><input value={q} onChange={(e) => setQ(e.target.value)} dir="auto" placeholder={t('common.search')} aria-label={t('common.search')} className="h-10 w-full bg-transparent text-start outline-none" /></div>
      <ul className="max-h-64 overflow-y-auto">{list.map((c) => <ForwardRow key={c.id} c={c} q={q} on={picked.includes(c.id)} toggle={() => setPicked((p) => (p.includes(c.id) ? p.filter((x) => x !== c.id) : [...p, c.id]))} />)}</ul>
      <div className="mt-3 flex justify-end gap-2"><Button variant="ghost" onClick={close}>{t('common.cancel')}</Button><Button disabled={!picked.length} onClick={confirm}>{t('chat.forwardConfirm', { count: picked.length })}</Button></div>
    </Modal>
  );
}
function ForwardRow({ c, q, on, toggle }) {
  const { title } = useConversationMeta(c);
  if (q && !title.toLowerCase().includes(q.toLowerCase())) return null;
  return <li><button onClick={toggle} className="flex w-full items-center gap-3 rounded-lg p-2 text-start hover:bg-surface-2"><Avatar name={title} /><bdi className="flex-1 truncate font-medium">{title}</bdi><input type="checkbox" readOnly checked={on} tabIndex={-1} aria-hidden className="accent-[var(--accent)]" /></button></li>;
}

export function ReportModal() {
  const { t } = useLanguage();
  const toast = useToast();
  const target = useUiStore((s) => s.report); const close = () => useUiStore.getState().setReport(null);
  const [reason, setReason] = useState('spam'); const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try { await messageService.report(target.message?.id ?? null, { user_id: target.user?.id ?? target.message?.sender_id, reason }); toast(t('chat.reportSent'), 'success'); close(); } catch { /* global toast */ } finally { setBusy(false); }
  };
  return (
    <Modal open={!!target} onClose={close} title={target?.user ? t('chat.reportUser') : t('chat.reportMessage')}>
      <Select label={t('chat.reportReason')} value={reason} onChange={setReason} options={['spam', 'abuse', 'harassment', 'inappropriate', 'other'].map((r) => ({ value: r, label: t(`chat.reason_${r}`) }))} />
      <div className="mt-4 flex justify-end gap-2"><Button variant="ghost" onClick={close}>{t('common.cancel')}</Button><Button variant="danger" loading={busy} onClick={submit}>{t('chat.report')}</Button></div>
    </Modal>
  );
}

export function MediaViewer() {
  const { t } = useLanguage();
  const viewer = useUiStore((s) => s.viewer); const close = () => useUiStore.getState().setViewer(null);
  const setForward = useUiStore((s) => s.setForward);
  const toast = useToast();
  const [i, setI] = useState(0); const [zoom, setZoom] = useState(1);
  useEffect(() => { setI(0); setZoom(1); }, [viewer]);
  const items = viewer?.items ?? []; const idx = viewer ? (viewer.index + i + items.length * 10) % Math.max(items.length, 1) : 0; const cur = items[idx];
  if (!viewer || !cur) return null;
  const go = (d) => { setI((n) => n + d); setZoom(1); };
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 text-white" role="dialog" aria-modal="true" aria-label={cur.name} onKeyDown={(e) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') go(document.dir === 'rtl' ? -1 : 1); if (e.key === 'ArrowLeft') go(document.dir === 'rtl' ? 1 : -1); }} tabIndex={-1} ref={(el) => el?.focus()}>
      <div className="flex items-center justify-between gap-2 p-3">
        <bdi className="truncate text-sm">{cur.name}</bdi>
        <div className="flex gap-1">
          {[['−', () => setZoom((z) => Math.max(0.5, z - 0.25)), t('chat.zoomOut')], ['+', () => setZoom((z) => Math.min(4, z + 0.25)), t('chat.zoomIn')]].map(([l, f, a]) => <button key={a} onClick={f} aria-label={a} className="h-9 w-9 rounded-lg bg-white/10 text-lg hover:bg-white/20">{l}</button>)}
          <a href={cur.url} download={cur.name} className="grid h-9 place-items-center rounded-lg bg-white/10 px-3 text-sm hover:bg-white/20">{t('chat.download')}</a>
          <button onClick={() => { navigator.share?.({ title: cur.name, url: cur.url }).catch(() => {}) ?? toast(t('chat.copied'), 'info'); }} className="rounded-lg bg-white/10 px-3 text-sm hover:bg-white/20">{t('chat.share')}</button>
          <button onClick={() => { setForward([{ body: null, type: 'image', attachments: [cur], meta: null }]); close(); }} className="rounded-lg bg-white/10 px-3 text-sm hover:bg-white/20">{t('chat.forward')}</button>
          <button onClick={close} aria-label={t('common.close')} className="h-9 w-9 rounded-lg bg-white/10 hover:bg-white/20">✕</button>
        </div>
      </div>
      <div className="grid min-h-0 flex-1 place-items-center overflow-auto p-4" onClick={close}>
        <img src={cur.url} alt={cur.name} onClick={(e) => e.stopPropagation()} style={{ transform: `scale(${zoom})`, transition: 'transform .15s' }} className="max-h-full max-w-full object-contain" />
      </div>
      {items.length > 1 && <div className="flex justify-center gap-4 p-3"><button onClick={() => go(-1)} className="rounded-lg bg-white/10 px-4 py-2">‹</button><span className="py-2 text-sm">{idx + 1} / {items.length}</span><button onClick={() => go(1)} className="rounded-lg bg-white/10 px-4 py-2">›</button></div>}
    </div>
  );
}
