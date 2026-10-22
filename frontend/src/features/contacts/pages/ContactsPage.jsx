import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, Link as LinkIcon, MessageCircle, Phone, Video, Ban, ShieldCheck, Trash2, User as UserIcon, Contact } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';
import { useToast } from '@/shared/context/ToastProvider';
import { useChatStore } from '@/features/chat/store/chatStore';
import { useUsersStore } from '@/features/users/store/usersStore';
import { useCallStore } from '@/features/calls/store/callStore';
import { contactService } from '@/features/contacts/services/contactService';
import { conversationService } from '@/features/chat/services/conversationService';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useApiForm } from '@/shared/hooks/useApiForm';
import Page from '@/shared/ui/Page';
import Tabs from '@/shared/ui/Tabs';
import PhoneInput from '@/shared/ui/PhoneInput';
import Button from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import Avatar from '@/shared/ui/Avatar';
import Menu from '@/shared/ui/Menu';
import Modal from '@/shared/ui/Modal';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import { EmptyState, ErrorState, ListSkeleton } from '@/shared/ui/States';

export default function ContactsPage() {
  const { t, formatRelative } = useLanguage();
  const toast = useToast(); const navigate = useNavigate();
  const upsertConv = useChatStore((s) => s.upsertConversation); const patchUser = useUsersStore((s) => s.patch);
  const startCall = useCallStore((s) => s.startCall);
  const [q, setQ] = useState(''); const dq = useDebouncedValue(q, 250);
  const [state, setState] = useState({ status: 'loading', data: [], error: null });
  const [modal, setModal] = useState(null); const [profile, setProfile] = useState(null); const [del, setDel] = useState(null);
  const load = () => { setState((s) => ({ ...s, status: 'loading' })); contactService.list({ q: dq || undefined }).then(({ data }) => setState({ status: 'ready', data, error: null })).catch((error) => setState({ status: 'error', data: [], error })); };
  useEffect(load, [dq]); // eslint-disable-line
  const [method, setMethod] = useState('phone'); const [phone, setPhone] = useState({ e164: null, valid: false });
  const form = useApiForm({ email: '' }, async (v) => {
    const { data } = await contactService.add(method === 'phone' ? { phone: phone.e164 } : { email: v.email });
    toast(data?.invited ? t('contacts.inviteSent') : t('contacts.added'), 'success'); setModal(null); load();
  });
  const message = async (u) => { const { data } = await conversationService.startWith(u.id); upsertConv(data); navigate(`/app/chat/${data.id}`); };
  const block = async (u) => { const { data } = await contactService.block(u.id, !u.is_blocked); patchUser(u.id, data); setState((s) => ({ ...s, data: s.data.map((x) => (x.id === u.id ? { ...x, ...data } : x)) })); };
  return (
    <Page title={t('contacts.title')} narrow actions={<>
      <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard?.writeText('https://lamma.test/invite/ahmad'); toast(t('groups.linkCopied'), 'success'); }}><LinkIcon className="h-4 w-4" />{t('contacts.invite')}</Button>
      <Button size="sm" onClick={() => setModal('add')}><UserPlus className="h-4 w-4" />{t('contacts.add')}</Button></>}>
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-surface px-3"><Search className="h-4 w-4 text-text-2" aria-hidden /><input value={q} onChange={(e) => setQ(e.target.value)} dir="auto" placeholder={t('contacts.search')} aria-label={t('contacts.search')} className="h-10 w-full bg-transparent text-start outline-none" /></div>
      {state.status === 'loading' && <ListSkeleton />}
      {state.status === 'error' && <ErrorState error={state.error} onRetry={load} />}
      {state.status === 'ready' && !state.data.length && <EmptyState icon={Contact} title={t('common.noResults')} />}
      <ul className="space-y-1">{state.data.map((u) => (
        <li key={u.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
          <Avatar name={u.name} online={u.is_online} label={t(u.is_online ? 'chat.online' : 'chat.offline')} />
          <button onClick={() => setProfile(u)} className="min-w-0 flex-1 text-start"><bdi className="block truncate font-medium">{u.name}{u.is_blocked ? ` · ${t('contacts.blocked')}` : ''}</bdi><bdi className="text-xs text-text-2" dir="ltr">@{u.username}</bdi></button>
          <button onClick={() => message(u)} disabled={u.is_blocked} aria-label={t('contacts.startChat')} className="rounded-lg p-2 hover:bg-surface-2 disabled:opacity-40"><MessageCircle className="h-5 w-5" /></button>
          <Menu label={t('chat.more')} trigger={<span className="text-lg leading-none">⋯</span>} items={[
            { label: t('contacts.profile'), icon: UserIcon, onClick: () => setProfile(u) },
            { label: t('calls.voiceCall'), icon: Phone, onClick: () => startCall(u, 'voice'), hidden: u.is_blocked },
            { label: t('calls.videoCall'), icon: Video, onClick: () => startCall(u, 'video'), hidden: u.is_blocked },
            { label: t(u.is_blocked ? 'chat.unblockUser' : 'chat.blockUser'), icon: u.is_blocked ? ShieldCheck : Ban, onClick: () => block(u) },
            { label: t('contacts.delete'), icon: Trash2, danger: true, onClick: () => setDel(u) },
          ]} />
        </li>))}</ul>

      <Modal open={modal === 'add'} onClose={() => setModal(null)} title={t('contacts.add')}>
        <form onSubmit={form.submit} className="space-y-3" noValidate>
          <Tabs value={method} onChange={setMethod} tabs={[{ value: 'phone', label: t('contacts.byPhone') }, { value: 'email', label: t('contacts.byEmail') }]} />
          {method === 'phone'
            ? <PhoneInput label={t('phone.label')} onChange={setPhone} error={form.field('phone') && t('contacts.phoneInvalid')} />
            : <Input label={t('auth.email')} type="email" dir="ltr" value={form.values.email} onChange={form.set('email')} error={form.field('email') && t('auth.emailInvalid')} />}
          <p className="text-xs text-text-2">{t(method === 'phone' ? 'contacts.addHintPhone' : 'contacts.addHint')}</p>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setModal(null)}>{t('common.cancel')}</Button><Button type="submit" loading={form.busy} disabled={method === 'phone' && !phone.valid}>{t('contacts.add')}</Button></div>
        </form>
      </Modal>
      <Modal open={!!profile} onClose={() => setProfile(null)} title={t('contacts.profile')}>
        {profile && <div className="space-y-3 text-center"><Avatar name={profile.name} size="lg" online={profile.is_online} label={t(profile.is_online ? 'chat.online' : 'chat.offline')} />
          <bdi className="block text-lg font-semibold">{profile.name}</bdi><bdi className="block text-sm text-text-2" dir="ltr">@{profile.username}</bdi>
          <p className="text-xs text-text-2">{profile.is_online ? t('chat.online') : t('chat.lastSeen', { when: formatRelative(profile.last_seen_at) })}</p>
          {profile.about && <bdi className="block text-sm">{profile.about}</bdi>}
          <dl className="space-y-1 text-sm" dir="ltr"><div><dt className="sr-only">{t('auth.email')}</dt><dd>{profile.email}</dd></div><div><dt className="sr-only">{t('profile.phone')}</dt><dd>{profile.phone}</dd></div></dl>
          <div className="flex justify-center gap-2"><Button onClick={() => { setProfile(null); message(profile); }}><MessageCircle className="h-4 w-4" />{t('contacts.startChat')}</Button><Button variant="secondary" onClick={() => block(profile).then(() => setProfile(null))}>{t(profile.is_blocked ? 'chat.unblockUser' : 'chat.blockUser')}</Button></div></div>}
      </Modal>
      <ConfirmModal open={!!del} title={t('contacts.delete')} message={t('contacts.deleteConfirm', { name: del?.name ?? '' })} onClose={() => setDel(null)} onConfirm={async () => { await contactService.remove(del.id); setDel(null); load(); }} />
    </Page>
  );
}
