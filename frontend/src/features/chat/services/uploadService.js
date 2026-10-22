import { http } from '@/shared/api/http';

export const uploadService = {
  /** onProgress(0..100). Pass an AbortController signal to support "cancel upload". */
  async upload(file, { onProgress, signal } = {}) {
    const form = new FormData();
    form.append('file', file);
    const { data } = await http.post('/api/upload', form, {
      signal,
      onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded / e.total) * 100)),
    });
    return data.data ?? data; // MessageAttachment
  },
};
