import { http } from '@/shared/api/http';

export const notificationService = {
  list: async () => (await http.get('/api/notifications')).data,
  remove: (id) => http.delete(`/api/notifications/${id}`),
  markAllRead: () => http.post('/api/notifications/read-all'),
};
