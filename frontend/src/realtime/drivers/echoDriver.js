import { env } from '@/config/env';
import { http } from '@/shared/api/http';
import { channels } from '@/realtime/channels';
import { EVENT_NAMES, EVENTS } from '@/realtime/events';

/** Production driver: Laravel Echo + Reverb. Loaded lazily so mock builds don't pay for it. */
export function createEchoDriver(dispatch) {
  let echo = null;
  const joined = new Map();

  return {
    async connect(userId) {
      const [{ default: Echo }, { default: Pusher }] = await Promise.all([import('laravel-echo'), import('pusher-js')]);
      window.Pusher = Pusher;
      echo = new Echo({
        broadcaster: 'reverb',
        key: env.reverb.key,
        wsHost: env.reverb.host, wsPort: env.reverb.port, wssPort: env.reverb.port,
        forceTLS: env.reverb.scheme === 'https',
        enabledTransports: ['ws', 'wss'],
        // Private/presence auth goes through the same Sanctum cookie session (CSRF handled by http.js).
        authorizer: (channel) => ({
          authorize: (socketId, callback) => {
            http.post('/broadcasting/auth', { socket_id: socketId, channel_name: channel.name })
              .then((res) => callback(null, res.data)).catch((err) => callback(err));
          },
        }),
      });
      const userChannel = echo.private(channels.user(userId));
      EVENT_NAMES.forEach((name) => userChannel.listen(`.${name}`, (payload) => dispatch(name, payload)));
    },
    disconnect() { echo?.disconnect(); echo = null; joined.clear(); },
    joinConversation(id) {
      if (!echo || joined.has(id)) return () => {};
      const presence = echo.join(channels.conversationPresence(id))
        .here((members) => members.forEach((m) => dispatch(EVENTS.UserOnline, { user_id: m.id })))
        .joining((m) => dispatch(EVENTS.UserOnline, { user_id: m.id }))
        .leaving((m) => dispatch(EVENTS.UserOffline, { user_id: m.id, last_seen_at: new Date().toISOString() }))
        .listenForWhisper('typing', (e) => dispatch(EVENTS.UserTyping, { conversation_id: id, user_id: e.user_id }));
      EVENT_NAMES.forEach((name) => echo.private(channels.conversation(id)).listen(`.${name}`, (p) => dispatch(name, p)));
      joined.set(id, presence);
      return () => { echo?.leave(channels.conversation(id)); joined.delete(id); };
    },
    sendTyping(id, userId) { joined.get(id)?.whisper('typing', { user_id: userId }); },
  };
}
