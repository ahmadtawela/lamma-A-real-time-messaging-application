import { http } from '@/shared/api/http';

export const messageService = {
  /** Cursor pagination: pass `before` (oldest loaded message id). Returns { data, meta:{ has_more, next_cursor } }. */
  list: async (conversationId, { before, limit = 25 } = {}) =>
    (await http.get(`/api/conversations/${conversationId}/messages`, { params: { before, limit } })).data,
  send: async (payload) => (await http.post('/api/messages', payload)).data,
  edit: async (id, body) => (await http.put(`/api/messages/${id}`, { body })).data,
  remove: async (id) => (await http.delete(`/api/messages/${id}`)).data,
  pin: async (id, pinned) => (await http.put(`/api/messages/${id}`, { pinned })).data,
  vote: async (id, optionId) => (await http.post(`/api/messages/${id}/vote`, { option_id: optionId })).data,
  report: (id, payload) => http.post('/api/reports', { message_id: id, ...payload }),
  star: async (id) => (await http.post(`/api/messages/${id}/star`)).data,   // toggles → { starred }
  starred: async () => (await http.get('/api/messages/starred')).data,
  markRead: (id) => http.post(`/api/messages/${id}/read`),
  react: async (id, emoji) => (await http.post(`/api/messages/${id}/reaction`, { emoji })).data,
};
