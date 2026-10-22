import { http } from '@/shared/api/http';
/** GET /api/search?q=&type=all|messages|users|groups|files|media|links -> { data: [{ type, id, title, snippet, created_at, conversation_id, conversation_title }] } */
export const searchService = { search: async (params, signal) => (await http.get('/api/search', { params, signal })).data };
