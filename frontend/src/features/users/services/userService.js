import { http } from '@/shared/api/http';

export const userService = {
  list: async (params) => (await http.get('/api/users', { params })).data,
  updatePreferences: async (prefs) => (await http.put('/api/user/preferences', prefs)).data, // { locale }
  uploadAvatar: async (file) => { const f = new FormData(); f.append('avatar', file); return (await http.post('/api/user/avatar', f)).data; },
  /** Phone verification (SMS code): request → verify → (optional) remove. The number is sent in E.164 (+905551112233). */
  requestPhoneCode: async (phone) => (await http.post('/api/user/phone', { phone })).data.data,      // { expires_in, resend_in }
  verifyPhone: async (code) => (await http.post('/api/user/phone/verify', { code })).data.data,       // user
  removePhone: async () => (await http.delete('/api/user/phone')).data.data,
  updateProfile: async (payload) => (await http.put('/api/user', payload)).data,
  changePassword: (payload) => http.put('/api/user/password', payload),
};
