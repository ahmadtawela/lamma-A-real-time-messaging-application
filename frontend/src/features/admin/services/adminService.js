import { http } from '@/shared/api/http';
export const adminService = {
  stats: async () => (await http.get('/api/admin/stats')).data,
  users: async (params) => (await http.get('/api/admin/users', { params })).data,
  userActivity: async (id) => (await http.get(`/api/admin/users/${id}/activity`)).data,
  setBlocked: async (id, blocked) => (await http.put(`/api/admin/users/${id}`, { is_blocked: blocked })).data,
  removeUser: (id) => http.delete(`/api/admin/users/${id}`),
  groups: async () => (await http.get('/api/admin/groups')).data,
  removeGroup: (id) => http.delete(`/api/admin/groups/${id}`),
  reports: async () => (await http.get('/api/admin/reports')).data,
  resolveReport: async (id, status) => (await http.put(`/api/admin/reports/${id}`, { status })).data,
  logs: async () => (await http.get('/api/admin/logs')).data,
  settings: async () => (await http.get('/api/admin/settings')).data,
  saveSettings: async (patch) => (await http.put('/api/admin/settings', patch)).data,
};
