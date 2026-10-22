import { http } from '@/shared/api/http';
export const statusService = {
  list: async () => (await http.get('/api/statuses')).data,
  /** Text statuses go as JSON; image/video statuses as multipart (`media` = File). */
  create: async ({ media, ...fields }) => {
    if (!media) return (await http.post('/api/statuses', fields)).data;
    const f = new FormData();
    Object.entries(fields).forEach(([k, v]) => v != null && f.append(k, v));
    f.append('media', media);
    return (await http.post('/api/statuses', f)).data;
  },
  remove: (id) => http.delete(`/api/statuses/${id}`),
  view: (id) => http.post(`/api/statuses/${id}/view`),
  react: async (id, emoji) => (await http.post(`/api/statuses/${id}/reaction`, { emoji })).data,
};
