import { http } from '@/shared/api/http';

export const groupService = {
  list: async () => (await http.get('/api/groups')).data,
  create: async (payload) => (await http.post('/api/groups', payload)).data,
  get: async (id) => (await http.get(`/api/groups/${id}`)).data,
  update: async (id, patch) => (await http.put(`/api/groups/${id}`, patch)).data,
  remove: (id) => http.delete(`/api/groups/${id}`),
  removeMember: async (id, userId) => (await http.delete(`/api/groups/${id}/members/${userId}`)).data,
  setAdmin: async (id, userId, isAdmin) => (await (isAdmin ? http.post(`/api/groups/${id}/admins`, { user_id: userId }) : http.delete(`/api/groups/${id}/admins/${userId}`))).data,
  uploadAvatar: async (id, file) => { const f = new FormData(); f.append('avatar', file); return (await http.post(`/api/groups/${id}/avatar`, f)).data; },
  addMembers: async (id, userIds) => (await http.post(`/api/groups/${id}/members`, { user_ids: userIds })).data,
};
