import { useCallback } from 'react';
import { useChatStore } from '@/features/chat/store/chatStore';

const EMPTY = { items: [], hasMore: false, status: 'idle', error: null };

export function useMessages(conversationId) {
  const thread = useChatStore((s) => s.messages[conversationId]) ?? EMPTY;
  const loadMessages = useChatStore((s) => s.loadMessages);
  const loadOlder = useCallback(() => loadMessages(conversationId, { older: true }), [loadMessages, conversationId]);
  const reload = useCallback(() => loadMessages(conversationId), [loadMessages, conversationId]);
  return { ...thread, loadOlder, reload };
}
