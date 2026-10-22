import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUiStore = create(persist((set) => ({
  detailsOpen: false,
  setDetailsOpen: (v) => set({ detailsOpen: v }),
  // transient (not persisted)
  searchOpen: false, setSearchOpen: (v) => set({ searchOpen: v }),
  forward: null, setForward: (messages) => set({ forward: messages }),       // messages being forwarded
  report: null, setReport: (target) => set({ report: target }),              // { message?, user? }
  viewer: null, setViewer: (v) => set({ viewer: v }),                         // { items:[attachments], index }
  newChatOpen: false, setNewChatOpen: (v) => set({ newChatOpen: v }),
  newGroupOpen: false, setNewGroupOpen: (v) => set({ newGroupOpen: v }),
}), { name: 'lamma.ui', version: 2, migrate: (state) => ({ ...state, detailsOpen: false }), partialize: (s) => ({ detailsOpen: s.detailsOpen }) }));
