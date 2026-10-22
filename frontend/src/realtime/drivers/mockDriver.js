import { mockBus } from '@/realtime/mock/mockServer';
import { EVENTS } from '@/realtime/events';
import { users, ME_ID } from '@/mocks/data';
import { simulateIncomingCall } from '@/mocks/appRoutes';

/** Development driver. Emits the same events Reverb will, so nothing downstream changes. */
export function createMockDriver(dispatch) {
  let off = null, timer = null;
  return {
    async connect() {
      off = mockBus.on((event, payload) => dispatch(event, payload));
      timer = setInterval(() => {
        const u = users[1 + Math.floor(Math.random() * (users.length - 1))];
        u.is_online = !u.is_online;
        dispatch(u.is_online ? EVENTS.UserOnline : EVENTS.UserOffline, { user_id: u.id, last_seen_at: new Date().toISOString() });
      }, 20000);
    },
    disconnect() { off?.(); clearInterval(timer); },
    joinConversation() { return () => {}; },
    simulate: (event, payload) => (event === 'CallIncoming' ? simulateIncomingCall(payload.peerId, payload.kind) : mockBus.emit(event, payload)),
    sendTyping() { /* nothing to whisper to in mock mode */ void ME_ID; },
  };
}
