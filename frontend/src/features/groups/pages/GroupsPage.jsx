import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MessageCircle, Users } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';
import { useChatStore } from '@/features/chat/store/chatStore';
import { useUiStore } from '@/shared/store/uiStore';
import { groupService } from '@/features/groups/services/groupService';
import Page from '@/shared/ui/Page';
import Button from '@/shared/ui/Button';
import Avatar from '@/shared/ui/Avatar';
import { EmptyState, ErrorState, ListSkeleton } from '@/shared/ui/States';
import GroupAdminPanel from '@/features/groups/components/GroupAdminPanel';

export default function GroupsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const upsert = useChatStore((s) => s.upsertConversation);
  const conversations = useChatStore((s) => s.conversations);               // raw (stable) state; derive below
  const groups = useMemo(() => conversations.filter((c) => c.type === 'group'), [conversations]);
  const setNewGroupOpen = useUiStore((s) => s.setNewGroupOpen);
  const [state, setState] = useState({ status: 'loading', error: null }); const [sel, setSel] = useState(null);
  const load = () => { setState({ status: 'loading' }); groupService.list().then(({ data }) => { data.forEach(upsert); setState({ status: 'ready' }); }).catch((error) => setState({ status: 'error', error })); };
  useEffect(load, []); // eslint-disable-line
  const current = groups.find((g) => g.id === sel);
  return (
    <Page title={t('groups.title')} actions={<Button size="sm" onClick={() => setNewGroupOpen(true)}><Plus className="h-4 w-4" />{t('groups.create')}</Button>}>
      {state.status === 'loading' && !groups.length && <ListSkeleton />}
      {state.status === 'error' && <ErrorState error={state.error} onRetry={load} />}
      {state.status === 'ready' && !groups.length && <EmptyState icon={Users} title={t('groups.empty')} action={<Button onClick={() => setNewGroupOpen(true)}>{t('groups.create')}</Button>} />}
      <div className="grid gap-4 md:grid-cols-2">
        <ul className="space-y-1">{groups.map((g) => (
          <li key={g.id}><button onClick={() => setSel(g.id)} aria-current={sel === g.id} className={`flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-3 text-start hover:bg-surface-2 ${sel === g.id ? 'ring-2 ring-accent' : ''}`}>
            <Avatar name={g.name} src={g.avatar_url} /><span className="min-w-0 flex-1"><bdi className="block truncate font-medium">{g.name}</bdi><span className="text-xs text-text-2">{t('groups.memberCount', { count: g.participant_ids.length })}</span></span>
            <span role="button" tabIndex={0} aria-label={t('groups.openChat')} onClick={(e) => { e.stopPropagation(); navigate(`/app/chat/${g.id}`); }} className="rounded p-2 hover:bg-surface"><MessageCircle className="h-4 w-4" /></span>
          </button></li>))}</ul>
        {current && <div className="rounded-xl border border-border bg-surface p-4"><GroupAdminPanel key={current.id} conversation={current} onDeleted={() => setSel(null)} /></div>}
      </div>
    </Page>
  );
}
