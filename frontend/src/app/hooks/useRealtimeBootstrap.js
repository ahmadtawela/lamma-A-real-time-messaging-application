import { useEffect } from 'react';
import { realtime } from '@/realtime/realtimeService';
import { EVENTS } from '@/realtime/events';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useChatStore } from '@/features/chat/store/chatStore';
import { useUsersStore } from '@/features/users/store/usersStore';
import { useCallStore } from '@/features/calls/store/callStore';

/** Connects realtime once the user is authenticated and routes events into the stores. */
export function useRealtimeBootstrap() {
  const userId = useAuthStore((s) => s.user?.id);
  const activeId = useChatStore((s) => s.activeId);

  useEffect(() => {
    if (!userId) return undefined;
    const off = realtime.on((event, payload) => {
      if (event === EVENTS.UserOnline) useUsersStore.getState().setPresence(payload.user_id, true);
      else if (event === EVENTS.UserOffline) useUsersStore.getState().setPresence(payload.user_id, false, payload.last_seen_at);
      else if (event.startsWith('Call')) useCallStore.getState().applyEvent(event, payload);
      else useChatStore.getState().applyEvent(event, payload);
    });
    realtime.connect(userId).then(() => useCallStore.getState().checkPending());
    return () => { off(); realtime.disconnect(); };
  }, [userId]);

  useEffect(() => (activeId != null ? realtime.joinConversation(activeId) : undefined), [activeId]);
}
