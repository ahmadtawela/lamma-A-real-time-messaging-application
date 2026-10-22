import { useEffect, useMemo, useState } from 'react';
import { Plus, Type, Image as ImageIcon, Trash2, Eye, X, Send } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';
import { useToast } from '@/shared/context/ToastProvider';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useUsersStore } from '@/features/users/store/usersStore';
import { useSettingsStore } from '@/features/settings/store/settingsStore';
import { statusService } from '@/features/status/services/statusService';
import { useApiForm } from '@/shared/hooks/useApiForm';
import Page from '@/shared/ui/Page';
import Button from '@/shared/ui/Button';
import Avatar from '@/shared/ui/Avatar';
import Modal from '@/shared/ui/Modal';
import Select from '@/shared/ui/Select';
import { EmptyState, ErrorState, ListSkeleton } from '@/shared/ui/States';

const COLORS = ['#3D4BF2', '#8A2BFF', '#0A8CFF', '#13A38A', '#E2603C', '#C2347A'];
const QUICK = ['❤️', '😂', '👍', '🔥', '😮'];

function Viewer({ group, onClose, mine, onDelete, onSeen }) {
  const { t, formatDayTime } = useLanguage();
  const users = useUsersStore((s) => s.byId);
  const [i, setI] = useState(0); const [reacted, setReacted] = useState({}); const [showViewers, setShowViewers] = useState(false);
  const st = group.items[i]; const user = users[group.user_id];
  useEffect(() => { if (!st) return undefined; if (!mine) statusService.view(st.id).catch(() => {}); onSeen(st.id); const id = setTimeout(() => (i + 1 < group.items.length ? setI(i + 1) : onClose()), 5000); return () => clearTimeout(id); /* eslint-disable-next-line */ }, [i]);
  if (!st) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col text-white" style={{ background: st.color }} role="dialog" aria-modal="true" aria-label={user?.name}>
      <div className="flex gap-1 p-3" aria-hidden>{group.items.map((_, k) => <span key={k} className="h-1 flex-1 overflow-hidden rounded bg-white/30"><span className="block h-full bg-white" style={{ width: k < i ? '100%' : k === i ? '100%' : 0, transition: k === i ? 'width 5s linear' : 'none' }} /></span>)}</div>
      <div className="flex items-center gap-3 px-3"><Avatar name={user?.name ?? t('status.mine')} size="sm" /><div className="flex-1"><bdi className="block text-sm font-semibold">{mine ? t('status.mine') : user?.name}</bdi><bdi className="text-xs opacity-80">{formatDayTime(st.created_at)} · {t('status.expires')}</bdi></div>
        {mine && <button onClick={() => { onDelete(st.id); onClose(); }} aria-label={t('chat.delete')} className="rounded p-2 hover:bg-white/20"><Trash2 className="h-5 w-5" /></button>}<button onClick={onClose} aria-label={t('common.close')} className="rounded p-2 hover:bg-white/20"><X className="h-5 w-5" /></button></div>
      <div className="grid flex-1 place-items-center p-8 text-center">{st.media_url ? <img src={st.media_url} alt="" className="max-h-full max-w-full rounded-xl object-contain" /> : <p dir="auto" className="text-3xl font-bold leading-snug">{st.text}</p>}</div>
      <div className="p-4">
        {mine ? <button onClick={() => setShowViewers(true)} className="mx-auto flex items-center gap-2 rounded-full bg-black/30 px-4 py-2 text-sm"><Eye className="h-4 w-4" />{t('status.viewers', { count: st.viewers.length })}</button>
          : <div className="flex items-center justify-center gap-2">{QUICK.map((e) => <button key={e} onClick={() => { statusService.react(st.id, e).catch(() => {}); setReacted({ ...reacted, [st.id]: e }); }} aria-pressed={reacted[st.id] === e} className={`rounded-full p-2 text-2xl ${reacted[st.id] === e ? 'bg-white/30' : 'hover:bg-white/20'}`}>{e}</button>)}</div>}
      </div>
      <Modal open={showViewers} onClose={() => setShowViewers(false)} title={t('status.viewers', { count: st.viewers.length })}>
        <ul className="text-text-1">{st.viewers.length === 0 && <li className="p-3 text-sm text-text-2">{t('status.noViewers')}</li>}{st.viewers.map((v) => <li key={v.user_id} className="flex items-center gap-3 p-2"><Avatar name={users[v.user_id]?.name ?? '?'} size="sm" /><bdi className="flex-1 text-sm">{users[v.user_id]?.name}</bdi><span>{st.reactions.find((r) => r.user_id === v.user_id)?.emoji}</span></li>)}</ul>
      </Modal>
    </div>
  );
}

export default function StatusPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const me = useAuthStore((s) => s.user.id);
  const users = useUsersStore((s) => s.byId);
  const privacy = useSettingsStore((s) => s.statusPrivacy); const setSetting = useSettingsStore((s) => s.set);
  const [state, setState] = useState({ status: 'loading', data: [], error: null });
  const [composer, setComposer] = useState(false); const [viewing, setViewing] = useState(null); const [color, setColor] = useState(COLORS[0]); const [image, setImage] = useState(null); const [imageFile, setImageFile] = useState(null);
  const load = () => { setState((s) => ({ ...s, status: 'loading' })); statusService.list().then(({ data }) => setState({ status: 'ready', data, error: null })).catch((error) => setState({ status: 'error', data: [], error })); };
  useEffect(load, []); // eslint-disable-line
  const form = useApiForm({ text: '' }, async (v) => {
    const { data } = await statusService.create(imageFile ? { kind: imageFile.type.startsWith('video/') ? 'video' : 'image', media: imageFile, text: v.text || null, privacy } : { kind: 'text', text: v.text, color, privacy });
    setState((s) => ({ ...s, data: [...s.data, data] })); setComposer(false); setImage(null); setImageFile(null); form.setValues({ text: '' }); toast(t('status.posted'), 'success');
  });
  const groups = useMemo(() => { const by = {}; state.data.forEach((s) => { (by[s.user_id] ??= []).push(s); }); return Object.entries(by).map(([uid, items]) => ({ user_id: +uid, items, unseen: items.some((x) => !x.seen) })); }, [state.data]);
  const mineGroup = groups.find((g) => g.user_id === me); const others = groups.filter((g) => g.user_id !== me);
  const markSeen = (id) => setState((s) => ({ ...s, data: s.data.map((x) => (x.id === id ? { ...x, seen: true } : x)) }));
  const ring = (g) => (g.unseen ? 'ring-accent' : 'ring-border');
  return (
    <Page title={t('status.title')} actions={<Button size="sm" onClick={() => setComposer(true)}><Plus className="h-4 w-4" />{t('status.add')}</Button>}>
      <h2 className="mb-2 text-sm font-semibold text-text-2">{t('status.mine')}</h2>
      <div className="mb-6 flex gap-3 overflow-x-auto pb-2">
        <button onClick={() => (mineGroup ? setViewing(mineGroup) : setComposer(true))} className="flex w-20 shrink-0 flex-col items-center gap-1 text-xs"><span className={`rounded-full p-0.5 ring-2 ${mineGroup ? 'ring-accent' : 'ring-border'}`}><Avatar name="+" size="lg" /></span>{mineGroup ? t('status.viewMine') : t('status.add')}</button>
      </div>
      <h2 className="mb-2 text-sm font-semibold text-text-2">{t('status.recent')}</h2>
      {state.status === 'loading' && <ListSkeleton rows={3} />}
      {state.status === 'error' && <ErrorState error={state.error} onRetry={load} />}
      {state.status === 'ready' && !others.length && <EmptyState title={t('status.empty')} />}
      <div className="flex gap-3 overflow-x-auto pb-2">{others.map((g) => (
        <button key={g.user_id} onClick={() => setViewing(g)} className="w-24 shrink-0 text-center"><span className="block h-36 overflow-hidden rounded-xl p-3 text-white ring-2 ring-offset-2 ring-offset-bg" style={{ background: g.items.at(-1).color }}><bdi className="line-clamp-4 text-xs font-medium">{g.items.at(-1).text}</bdi></span>
          <span className={`mt-1 block truncate text-xs font-medium ${g.unseen ? '' : 'text-text-2'}`}><bdi>{users[g.user_id]?.name}</bdi></span><span className={`mx-auto mt-0.5 block h-1 w-8 rounded ${g.unseen ? 'bg-accent' : 'bg-border'}`} /><span className="sr-only">{ring(g)}</span></button>))}</div>

      <Modal open={composer} onClose={() => setComposer(false)} title={t('status.add')}>
        <form onSubmit={form.submit} className="space-y-3" noValidate>
          <div className="grid h-40 place-items-center overflow-hidden rounded-xl p-4 text-center text-white" style={{ background: color }}>{image ? <img src={image} alt="" className="max-h-full" /> : <textarea dir="auto" value={form.values.text} onChange={form.set('text')} placeholder={t('status.placeholder')} aria-label={t('status.placeholder')} className="h-full w-full resize-none bg-transparent text-center text-xl font-bold outline-none placeholder:text-white/70" />}</div>
          {form.field('text') && <p className="text-sm text-danger">{t('status.textRequired')}</p>}
          <div className="flex items-center gap-2">{COLORS.map((c) => <button type="button" key={c} onClick={() => { setColor(c); setImage(null); setImageFile(null); }} aria-label={c} aria-pressed={color === c && !image} className={`h-7 w-7 rounded-full ${color === c && !image ? 'ring-2 ring-text-1 ring-offset-2 ring-offset-surface' : ''}`} style={{ background: c }} />)}
            <label className="ms-auto cursor-pointer rounded-lg p-2 hover:bg-surface-2"><ImageIcon className="h-5 w-5" /><input type="file" accept="image/*,video/*" className="sr-only" aria-label={t('chat.photoVideo')} onChange={(e) => { const f = e.target.files[0]; if (f) { setImage(URL.createObjectURL(f)); setImageFile(f); } }} /></label><span className="hidden"><Type /></span></div>
          <Select label={t('settings.statusPrivacy')} value={privacy} onChange={(v) => setSetting({ statusPrivacy: v })} options={['everyone', 'contacts'].map((v) => ({ value: v, label: t(`settings.vis_${v}`) }))} />
          <p className="text-xs text-text-2">{t('status.expiresHint')}</p>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setComposer(false)}>{t('common.cancel')}</Button><Button type="submit" loading={form.busy}><Send className="h-4 w-4 rtl:-scale-x-100" />{t('status.post')}</Button></div>
        </form>
      </Modal>
      {viewing && <Viewer group={viewing} mine={viewing.user_id === me} onClose={() => setViewing(null)} onSeen={markSeen} onDelete={async (id) => { await statusService.remove(id); load(); }} />}
    </Page>
  );
}
