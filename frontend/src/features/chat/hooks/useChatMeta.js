import { useMemo } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useUsersStore } from '@/features/users/store/usersStore';

/** Helpers to resolve names/avatars for a conversation (private -> the other person, group -> group name). */
export function useConversationMeta(c) {
  const users = useUsersStore((s) => s.byId);
  const me = useAuthStore((s) => s.user);
  return useMemo(() => {
    if (!c) return { title: '', other: null, members: [], isGroup: false, isAdmin: false };
    const otherId = c.participant_ids.find((p) => p !== me?.id);
    const other = c.type === 'private' ? users[otherId] ?? null : null;
    return {
      title: c.name ?? other?.name ?? '', other, isGroup: c.type === 'group',
      members: c.participant_ids.map((id) => users[id] ?? (id === me?.id ? me : null)).filter(Boolean),
      isAdmin: c.type === 'group' && (c.admin_ids ?? []).includes(me?.id),
    };
  }, [c, users, me]);
}
export const useUser = (id) => useUsersStore((s) => s.byId[id]);
