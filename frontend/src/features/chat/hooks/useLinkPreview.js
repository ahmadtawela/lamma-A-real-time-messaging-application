import { useEffect, useState } from 'react';
import { linkPreviewService } from '@/features/chat/services/linkPreviewService';

const cache = new Map();   // url -> preview | null (shared across messages, lives for the session)
const inflight = new Map();

/** @returns {{ status: 'loading'|'ready'|'none', preview: object|null }} */
export function useLinkPreview(url) {
  const [state, setState] = useState(() => (cache.has(url) ? { status: cache.get(url) ? 'ready' : 'none', preview: cache.get(url) } : { status: 'loading', preview: null }));
  useEffect(() => {
    if (cache.has(url)) { setState({ status: cache.get(url) ? 'ready' : 'none', preview: cache.get(url) }); return undefined; }
    let alive = true;
    if (!inflight.has(url)) inflight.set(url, linkPreviewService.get(url).catch(() => null).then((p) => { cache.set(url, p); inflight.delete(url); return p; }));
    inflight.get(url).then((p) => alive && setState({ status: p ? 'ready' : 'none', preview: p }));
    return () => { alive = false; };
  }, [url]);
  return state;
}
