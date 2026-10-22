import { env } from '@/config/env';
import { createEchoDriver } from '@/realtime/drivers/echoDriver';
import { createMockDriver } from '@/realtime/drivers/mockDriver';

/**
 * The ONLY thing React code talks to for realtime. Components never touch WebSockets or Echo directly.
 *   realtime.connect(userId) / disconnect()
 *   realtime.on(handler)              -> unsubscribe; handler(eventName, payload)
 *   realtime.joinConversation(id)     -> leave()
 *   realtime.sendTyping(id, userId)
 */
const handlers = new Set();
const dispatch = (event, payload) => handlers.forEach((h) => h(event, payload));
const driver = env.useMocks ? createMockDriver(dispatch) : createEchoDriver(dispatch);

export const realtime = {
  connect: (userId) => driver.connect(userId),
  disconnect: () => driver.disconnect(),
  on: (handler) => { handlers.add(handler); return () => handlers.delete(handler); },
  joinConversation: (id) => driver.joinConversation(id),
  sendTyping: (id, userId) => driver.sendTyping(id, userId),
  /** Development only (mock driver): inject a server event, e.g. an incoming call. Undefined with the real Echo driver. */
  simulate: driver.simulate,
};
