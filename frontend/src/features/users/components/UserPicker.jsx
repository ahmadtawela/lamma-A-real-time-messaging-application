import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';
import { useUsersStore } from '@/features/users/store/usersStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import Avatar from '@/shared/ui/Avatar';

/** Searchable list of users. `multiple` = checkbox mode, otherwise click-to-pick. `exclude` = ids to hide. */
export default function UserPicker({ selected = [], onChange, multiple = true, exclude = [], onPick }) {
  const { t } = useLanguage();
  const users = useUsersStore((s) => s.byId);
  const me = useAuthStore((s) => s.user?.id);
  const [q, setQ] = useState('');
  const list = useMemo(() => Object.values(users).filter((u) => u.id !== me && !exclude.includes(u.id) && (!q || u.name.toLowerCase().includes(q.toLowerCase()) || u.username.includes(q.toLowerCase()))), [users, q, me, exclude]);
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 rounded-lg bg-surface-2 px-3"><Search className="h-4 w-4 text-text-2" aria-hidden /><input value={q} onChange={(e) => setQ(e.target.value)} dir="auto" placeholder={t('contacts.search')} aria-label={t('contacts.search')} className="h-10 w-full bg-transparent text-start outline-none" /></div>
      <ul className="max-h-64 overflow-y-auto">
        {list.length === 0 && <li className="p-4 text-center text-sm text-text-2">{t('common.noResults')}</li>}
        {list.map((u) => {
          const on = selected.includes(u.id);
          return (
            <li key={u.id}><button type="button" onClick={() => (multiple ? onChange(on ? selected.filter((x) => x !== u.id) : [...selected, u.id]) : onPick(u))} className="flex w-full items-center gap-3 rounded-lg p-2 text-start hover:bg-surface-2">
              <Avatar name={u.name} online={u.is_online} label={t(u.is_online ? 'chat.online' : 'chat.offline')} />
              <span className="min-w-0 flex-1"><bdi className="block truncate font-medium">{u.name}</bdi><bdi className="text-xs text-text-2" dir="ltr">@{u.username}</bdi></span>
              {multiple && <input type="checkbox" readOnly checked={on} tabIndex={-1} aria-hidden className="accent-[var(--accent)]" />}
            </button></li>
          );
        })}
      </ul>
    </div>
  );
}
