import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Users, MessageSquare, FileText, Image as ImageIcon, Link2 } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';
import { useUiStore } from '@/shared/store/uiStore';
import { useChatStore } from '@/features/chat/store/chatStore';
import { searchService } from '@/features/search/services/searchService';
import { conversationService } from '@/features/chat/services/conversationService';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import Modal from '@/shared/ui/Modal';
import Tabs from '@/shared/ui/Tabs';
import Avatar from '@/shared/ui/Avatar';
import { EmptyState, ErrorState, ListSkeleton } from '@/shared/ui/States';

const ICONS = { messages: MessageSquare, users: User, groups: Users, files: FileText, media: ImageIcon, links: Link2 };
const TYPES = ['all', 'messages', 'users', 'groups', 'files', 'media', 'links'];

/** Global search (Ctrl/Cmd+K). Debounced; cancels the in-flight request when the query changes. */
export default function SearchModal() {
  const { t, formatDayTime } = useLanguage();
  const navigate = useNavigate();
  const open = useUiStore((s) => s.searchOpen); const close = () => useUiStore.getState().setSearchOpen(false);
  const upsert = useChatStore((s) => s.upsertConversation);
  const [q, setQ] = useState(''); const [type, setType] = useState('all');
  const [state, setState] = useState({ status: 'idle', data: [], error: null });
  const dq = useDebouncedValue(q, 300);

  useEffect(() => {
    if (!open || !dq.trim()) { setState({ status: 'idle', data: [], error: null }); return undefined; }
    const ctl = new AbortController();
    setState((s) => ({ ...s, status: 'loading' }));
    searchService.search({ q: dq, type }, ctl.signal).then(({ data }) => setState({ status: 'ready', data, error: null })).catch((error) => { if (!ctl.signal.aborted) setState({ status: 'error', data: [], error }); });
    return () => ctl.abort();
  }, [dq, type, open]);

  const go = async (r) => {
    close();
    if (r.type === 'users') { const { data } = await conversationService.startWith(r.user_id); upsert(data); navigate(`/app/chat/${data.id}`); }
    else navigate(`/app/chat/${r.conversation_id}`);
  };
  return (
    <Modal open={open} onClose={close} title={t('search.title')}>
      <div className="mb-2 flex items-center gap-2 rounded-lg bg-surface-2 px-3"><Search className="h-4 w-4 text-text-2" aria-hidden /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} dir="auto" placeholder={t('search.placeholder')} aria-label={t('search.placeholder')} className="h-10 w-full bg-transparent text-start outline-none" /></div>
      <Tabs value={type} onChange={setType} tabs={TYPES.map((x) => ({ value: x, label: t(`search.${x}`) }))} className="mb-2" />
      <div className="max-h-80 overflow-y-auto" aria-live="polite">
        {state.status === 'idle' && <p className="p-6 text-center text-sm text-text-2">{t('search.hint')}</p>}
        {state.status === 'loading' && <ListSkeleton rows={3} />}
        {state.status === 'error' && <ErrorState error={state.error} />}
        {state.status === 'ready' && state.data.length === 0 && <EmptyState title={t('common.noResults')} />}
        <ul>{state.data.map((r) => { const Icon = ICONS[r.type]; return (
          <li key={`${r.type}-${r.id}`}><button onClick={() => go(r)} className="flex w-full items-center gap-3 rounded-lg p-2 text-start hover:bg-surface-2">
            {r.type === 'users' ? <Avatar name={r.title} /> : r.thumb ? <img src={r.thumb} alt="" className="h-10 w-10 rounded object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-full bg-surface-2"><Icon className="h-5 w-5" /></span>}
            <span className="min-w-0 flex-1"><bdi className="block truncate font-medium">{r.title}</bdi><span className="flex gap-2 text-xs text-text-2"><span className="rounded bg-surface-2 px-1">{t(`search.${r.type}`)}</span>{r.conversation_title && <bdi className="truncate">{r.conversation_title}</bdi>}{r.created_at && <bdi>{formatDayTime(r.created_at)}</bdi>}</span></span>
          </button></li>); })}</ul>
      </div>
    </Modal>
  );
}
