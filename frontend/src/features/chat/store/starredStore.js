import { create } from 'zustand';
import { messageService } from '@/features/chat/services/messageService';

/** Ids of MY starred messages. The server is the source of truth (hydrated at startup via GET /api/messages/starred). */
export const useStarredStore = create((set) => ({
  ids: [],
  setIds: (ids) => set({ ids }),
  toggle: async (id) => {
    const flip = (s) => ({ ids: s.ids.includes(id) ? s.ids.filter((x) => x !== id) : [...s.ids, id] });
    set(flip);                                   // optimistic
    try { await messageService.star(id); } catch { set(flip); }
  },
}));
