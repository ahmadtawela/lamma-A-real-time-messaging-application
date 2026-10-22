import { create } from 'zustand';
import { notificationService } from '@/features/notifications/services/notificationService';

export const useNotificationsStore = create((set) => ({
  items: [], status: 'idle', error: null,
  async load() {
    set({ status: 'loading', error: null });
    try { set({ items: (await notificationService.list()).data, status: 'ready' }); } catch (error) { set({ status: 'error', error }); }
  },
  add: (n) => set((s) => ({ items: [n, ...s.items] })),
  markRead: (id) => set((s) => ({ items: s.items.map((n) => (n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n)) })),
  async markAllRead() { set((s) => ({ items: s.items.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })) })); try { await notificationService.markAllRead(); } catch { /* reload restores */ } },
  async remove(id) { set((s) => ({ items: s.items.filter((n) => n.id !== id) })); try { await notificationService.remove(id); } catch { /* ignore */ } },
}));
