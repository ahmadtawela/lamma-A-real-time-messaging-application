import { http } from '@/shared/api/http';

export const contactService = {
  list: async (params) => (await http.get('/api/contacts', { params })).data,
  add: async (payload) => (await http.post('/api/contacts', payload)).data,   // { email } | { phone: '+905551112233' } | { user_id }
  remove: (id) => http.delete(`/api/contacts/${id}`),
  block: async (id, blocked) => (await (blocked ? http.post(`/api/contacts/${id}/block`) : http.delete(`/api/contacts/${id}/block`))).data,
};
