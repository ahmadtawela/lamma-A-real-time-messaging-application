import { http } from '@/shared/api/http';

export const conversationService = {
  list: async (params) => (await http.get('/api/conversations', { params })).data,          // { data: Conversation[] }
  get: async (id) => (await http.get(`/api/conversations/${id}`)).data,
  update: async (id, patch) => (await http.put(`/api/conversations/${id}`, patch)).data,    // pin / mute / archive
  startWith: async (userId) => (await http.post('/api/conversations', { user_id: userId })).data,
  clear: (id) => http.delete(`/api/conversations/${id}/messages`),
  remove: (id) => http.delete(`/api/conversations/${id}`),
  markRead: (id) => http.post(`/api/conversations/${id}/read`),
};
