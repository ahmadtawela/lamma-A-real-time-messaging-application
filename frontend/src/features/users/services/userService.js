import { http } from '@/shared/api/http';

export const userService = {
  list: async (params) => (await http.get('/api/users', { params })).data,
  updatePreferences: async (prefs) => (await http.put('/api/user/preferences', prefs)).data, // { locale }
  uploadAvatar: async (file) => { const f = new FormData(); f.append('avatar', file); return (await http.post('/api/user/avatar', f)).data; },
  /** Phone verification (SMS code): request → verify → (optional) remove. The number is sent in E.164 (+905551112233). */
  requestPhoneCode: async (phone) => (await http.post('/api/user/phone', { phone })).data.data,      // { expires_in, resend_in }
  verifyPhone: async (code) => (await http.post('/api/user/phone/verify', { code })).data.data,       // user
  removePhone: async () => (await http.delete('/api/user/phone')).data.data,
  sessions: async () => (await http.get('/api/user/sessions')).data,
  revokeSession: (id) => http.delete(`/api/user/sessions/${encodeURIComponent(id)}`),
  setupTwoFactor: async () => (await http.post('/api/user/two-factor')).data,
  confirmTwoFactor: async (code) => (await http.post('/api/user/two-factor/confirm', { code })).data,
  disableTwoFactor: (password) => http.delete('/api/user/two-factor', { data: { password } }),
  updateProfile: async (payload) => (await http.put('/api/user', payload)).data,
  changePassword: (payload) => http.put('/api/user/password', payload),
  deleteAccount: (password) => http.delete('/api/user', { data: { password } }),
};
