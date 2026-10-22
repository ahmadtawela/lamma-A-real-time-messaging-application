import { create } from 'zustand';
import { userService } from '@/features/users/services/userService';

export const useUsersStore = create((set) => ({
  byId: {},
  async load() {
    const { data } = await userService.list();
    set((s) => ({ byId: { ...s.byId, ...Object.fromEntries(data.map((u) => [u.id, u])) } }));
  },
  patch: (id, data) => set((s) => ({ byId: { ...s.byId, [id]: { ...s.byId[id], ...data } } })),
  /** Public profiles embedded in conversation payloads (`participants`) – keeps names/avatars/call buttons working without a global user list. */
  upsertMany: (list = []) => set((s) => ({ byId: { ...s.byId, ...Object.fromEntries(list.map((u) => [u.id, { ...s.byId[u.id], ...u }])) } })),
  upsert: (u) => set((s) => ({ byId: { ...s.byId, [u.id]: { ...s.byId[u.id], ...u } } })),
  setPresence: (userId, isOnline, lastSeen) =>
    set((s) => s.byId[userId]
      ? { byId: { ...s.byId, [userId]: { ...s.byId[userId], is_online: isOnline, last_seen_at: lastSeen ?? s.byId[userId].last_seen_at } } }
      : s),
}));
