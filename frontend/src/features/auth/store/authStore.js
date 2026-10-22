import { create } from 'zustand';
import { authService } from '@/features/auth/services/authService';

export const useAuthStore = create((set, get) => ({
  user: null,
  status: 'idle', // idle | loading | authenticated | guest
  async init() {
    if (get().status !== 'idle') return;
    set({ status: 'loading' });
    try { set({ user: await authService.me(), status: 'authenticated' }); }
    catch { set({ user: null, status: 'guest' }); }
  },
  async login(credentials) { // throws ApiError (422 -> err.field('email')). Returns { twoFactor: true } when a code is required.
    const data = await authService.login(credentials);
    if (data.two_factor) return { twoFactor: true };
    set({ user: data.user, status: 'authenticated' });
    return { twoFactor: false };
  },
  async register(payload) { const user = await authService.register(payload); set({ user, status: 'authenticated' }); },
  setUser: (user) => set({ user, status: 'authenticated' }),
  async refresh() { set({ user: await authService.me() }); },
  async logout() {
    try { await authService.logout(); } finally { set({ user: null, status: 'guest' }); }
  },
  expire: () => set({ user: null, status: 'guest' }),
  patchUser: (patch) => set((s) => ({ user: s.user && { ...s.user, ...patch } })),
}));
