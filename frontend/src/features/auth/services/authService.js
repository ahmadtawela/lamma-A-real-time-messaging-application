import { http, ensureCsrfCookie } from '@/shared/api/http';

export const authService = {
  async login({ email, password, remember }) {
    await ensureCsrfCookie();
    const { data } = await http.post('/api/login', { email, password, remember });
    return data; // { user } or { two_factor: true }
  },
  async register(payload) {
    await ensureCsrfCookie();
    const { data } = await http.post('/api/register', payload);
    return data.user ?? data;
  },
  twoFactor: async (payload) => (await http.post('/api/two-factor-challenge', payload)).data.user,
  verifyDevice: async (code) => (await http.post('/api/device/verify', { code })).data.user,
  resendVerification: () => http.post('/api/email/verification-notification'),
  confirmEmail: () => http.post('/api/email/verify'),
  logout: () => http.post('/api/logout'),
  async me() { const { data } = await http.get('/api/user'); return data.data ?? data; },
  forgotPassword: (email) => http.post('/api/forgot-password', { email }),
  resetPassword: (payload) => http.post('/api/reset-password', payload),
};
