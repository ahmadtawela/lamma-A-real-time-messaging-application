import { useRef } from 'react';
import { realtime } from '@/realtime/realtimeService';
import { useAuthStore } from '@/features/auth/store/authStore';

/** Call onInput() on every keystroke; the "typing" whisper is sent at most once every 2.5 s. */
export function useTypingEmitter(conversationId) {
  const last = useRef(0);
  const userId = useAuthStore((s) => s.user?.id);
  return () => {
    const t = Date.now();
    if (conversationId == null || t - last.current < 2500) return;
    last.current = t;
    realtime.sendTyping(conversationId, userId);
  };
}
