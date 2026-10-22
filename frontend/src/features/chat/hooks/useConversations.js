import { useEffect, useState } from 'react';
import { useChatStore } from '@/features/chat/store/chatStore';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';

export function useConversations({ filter = 'all', query = '' } = {}) {
  const debounced = useDebouncedValue(query, 250);
  const load = useChatStore((s) => s.loadConversations);
  const items = useChatStore((s) => s.conversations);
  const status = useChatStore((s) => s.listStatus);
  const error = useChatStore((s) => s.listError);
  const [, force] = useState(0);
  useEffect(() => { load({ filter, q: debounced }); }, [filter, debounced, load]);
  return { items, status, error, reload: () => { load({ filter, q: debounced }); force((n) => n + 1); } };
}
