import { useCallback, useState } from 'react';
import { uploadService } from '@/features/chat/services/uploadService';

/** Upload queue. States: uploading -> processing -> completed | failed. Supports cancel + retry. */
export function useUploads() {
  const [items, setItems] = useState([]);
  const patch = (id, p) => setItems((l) => l.map((i) => (i.id === id ? { ...i, ...p } : i)));

  const run = useCallback(async (item) => {
    const controller = new AbortController();
    patch(item.id, { status: 'uploading', progress: 0, error: null, controller });
    try {
      const attachment = await uploadService.upload(item.file, {
        signal: controller.signal,
        onProgress: (p) => patch(item.id, { progress: p, status: p >= 100 ? 'processing' : 'uploading' }),
      });
      patch(item.id, { status: 'completed', progress: 100, attachment: { ...attachment, ...item.extra } });
    } catch (error) {
      if (error?.code === 'ERR_CANCELED' || controller.signal.aborted) return;
      patch(item.id, { status: 'failed', error });
    }
  }, []);

  const add = useCallback((files, extra) => {
    [...files].forEach((file) => {
      const item = { id: crypto.randomUUID(), file, extra, previewUrl: /^(image|video)\//.test(file.type) ? URL.createObjectURL(file) : null, status: 'uploading', progress: 0 };
      setItems((l) => [...l, item]);
      run(item);
    });
  }, [run]);
  const cancel = (id) => setItems((l) => { l.find((i) => i.id === id)?.controller?.abort(); return l.filter((i) => i.id !== id); });
  const retry = (id) => setItems((l) => { const it = l.find((i) => i.id === id); if (it) queueMicrotask(() => run(it)); return l; });
  const clear = () => setItems([]);
  return {
    items, add, cancel, retry, clear,
    ready: items.length > 0 && items.every((i) => i.status === 'completed'),
    busy: items.some((i) => i.status === 'uploading' || i.status === 'processing'),
  };
}
