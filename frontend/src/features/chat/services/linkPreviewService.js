import { http } from '@/shared/api/http';

/** GET /api/link-preview?url= → { url, domain, title, description, image, site_name } | null. The SERVER fetches the page (SSRF-guarded). */
export const linkPreviewService = {
  get: async (url) => (await http.get('/api/link-preview', { params: { url } })).data.data,
};
