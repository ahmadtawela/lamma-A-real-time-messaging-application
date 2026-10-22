import { AxiosError } from 'axios';
import { conversations, messages, users, notifications, ME_ID, RANDOM_REPLIES, nextIds } from '@/mocks/data';
import { mockBus } from '@/realtime/mock/mockServer';
import { authRoutes } from '@/mocks/authRoutes';
import { appRoutes } from '@/mocks/appRoutes';

const AUTH_KEY = 'lamma.mock.auth';
const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms + Math.random() * 200));
const now = () => new Date().toISOString();
let failedLogins = 0;

const me = () => users.find((u) => u.id === ME_ID);
const lastMessage = (cid) => messages.filter((m) => m.conversation_id === cid && !m.deleted_at).at(-1) ?? null;
const pub = (u) => ({ id: u.id, name: u.name, username: u.username, avatar_url: u.avatar_url, about: u.about, is_online: u.is_online, last_seen_at: u.last_seen_at, is_blocked: u.is_blocked });
const view = (c) => ({ ...c, participants: c.participant_ids.map((id) => users.find((u) => u.id === id)).filter(Boolean).map(pub), last_message: lastMessage(c.id), updated_at: lastMessage(c.id)?.created_at ?? now() });

class HttpFail extends Error { constructor(status, body, headers = {}) { super(body?.message); this.status = status; this.body = body; this.headers = headers; } }
const fail = (status, message, errors) => { throw new HttpFail(status, { message, ...(errors && { errors }) }); };
const requireAuth = () => { if (localStorage.getItem(AUTH_KEY) !== '1') fail(401, 'Unauthenticated.'); };

function simulateReply(conversation, myMessage) {
  if (conversation.type !== 'private') return;
  const other = conversation.participant_ids.find((p) => p !== ME_ID);
  setTimeout(() => { myMessage.delivered_at = now(); mockBus.emit('MessageDelivered', { conversation_id: conversation.id, message_id: myMessage.id, delivered_at: myMessage.delivered_at }); }, 700);
  setTimeout(() => { myMessage.read_at = now(); mockBus.emit('MessageRead', { conversation_id: conversation.id, message_id: myMessage.id, read_at: myMessage.read_at, user_id: other }); }, 1600);
  setTimeout(() => mockBus.emit('UserTyping', { conversation_id: conversation.id, user_id: other }), 2200);
  setTimeout(() => {
    mockBus.emit('UserStoppedTyping', { conversation_id: conversation.id, user_id: other });
    const reply = { id: nextIds.message, conversation_id: conversation.id, sender_id: other, body: RANDOM_REPLIES[Math.floor(Math.random() * RANDOM_REPLIES.length)], type: 'text', reply_to_id: null, created_at: now(), updated_at: null, delivered_at: now(), read_at: null, deleted_at: null, attachments: [], reactions: [] };
    messages.push(reply);
    mockBus.emit('MessageSent', { message: reply });
  }, 4800);
}

const routes = [
  ['POST', /^\/api\/login$/, async ({ body }) => {
    const errors = {};
    if (!body.email) errors.email = ['The email field is required.'];
    else if (!/^\S+@\S+\.\S+$/.test(body.email)) errors.email = ['The email field must be a valid email address.'];
    if (!body.password) errors.password = ['The password field is required.'];
    if (Object.keys(errors).length) fail(422, 'The given data was invalid.', errors);
    if (failedLogins >= 5) throw new HttpFail(429, { message: 'Too many attempts.' }, { 'retry-after': '30' });
    if (body.password !== 'password') { failedLogins++; fail(422, 'These credentials do not match our records.', { email: ['These credentials do not match our records.'] }); }
    failedLogins = 0;
    if (/2fa/.test(body.email)) return [200, { two_factor: true }];
    localStorage.setItem(AUTH_KEY, '1');
    return [200, { user: me() }];
  }],
  ['POST', /^\/api\/logout$/, async () => { localStorage.removeItem(AUTH_KEY); return [204, null]; }],
  ['GET', /^\/sanctum\/csrf-cookie$/, async () => [204, null]],
  ['GET', /^\/api\/user$/, async () => { requireAuth(); return [200, { data: me() }]; }],
  ['PUT', /^\/api\/user\/preferences$/, async ({ body }) => { requireAuth(); Object.assign(me(), body); return [200, { data: me() }]; }],
  ['PUT', /^\/api\/user$/, async ({ body }) => { requireAuth(); Object.assign(me(), body); return [200, { data: me() }]; }],
  ['GET', /^\/api\/(users|contacts)$/, async ({ params }) => {
    requireAuth();
    const q = (params.q ?? '').toLowerCase();
    return [200, { data: users.filter((u) => u.id !== ME_ID && (!q || u.name.toLowerCase().includes(q) || u.username.includes(q))) }];
  }],
  ['GET', /^\/api\/conversations$/, async ({ params }) => {
    requireAuth();
    const q = (params.q ?? '').toLowerCase();
    const list = conversations.map(view).filter((c) => {
      const title = c.name ?? users.find((u) => u.id === c.participant_ids.find((p) => p !== ME_ID))?.name ?? '';
      if (q && !title.toLowerCase().includes(q) && !(c.last_message?.body ?? '').toLowerCase().includes(q)) return false;
      const f = params.filter ?? 'all';
      if (f === 'archived') return c.is_archived;
      if (c.is_archived) return false;
      return f === 'unread' ? c.unread_count > 0 : f === 'groups' ? c.type === 'group' : f === 'contacts' ? c.type === 'private' : true;
    });
    return [200, { data: list, meta: { total: list.length } }];
  }],
  ['GET', /^\/api\/conversations\/(\d+)\/messages$/, async ({ match, params }) => {
    requireAuth();
    const all = messages.filter((m) => m.conversation_id === +match[1]);
    const limit = +(params.limit ?? 25);
    const pool = params.before ? all.filter((m) => m.id < +params.before) : all;
    const page = pool.slice(-limit);
    return [200, { data: page, meta: { has_more: pool.length > page.length, next_cursor: page[0]?.id ?? null } }];
  }],
  ['POST', /^\/api\/conversations\/(\d+)\/read$/, async ({ match }) => {
    requireAuth();
    const c = conversations.find((x) => x.id === +match[1]);
    messages.filter((m) => m.conversation_id === c.id && m.sender_id !== ME_ID && !m.read_at).forEach((m) => { m.read_at = now(); });
    c.unread_count = 0;
    return [200, { data: view(c) }];
  }],
  ['GET', /^\/api\/conversations\/(\d+)$/, async ({ match }) => {
    requireAuth();
    const c = conversations.find((x) => x.id === +match[1]);
    if (!c) fail(404, 'Conversation not found.');
    return [200, { data: view(c) }];
  }],
  ['PUT', /^\/api\/conversations\/(\d+)$/, async ({ match, body }) => {
    requireAuth();
    const c = conversations.find((x) => x.id === +match[1]);
    if (!c) fail(404, 'Conversation not found.');
    Object.assign(c, body);
    return [200, { data: view(c) }];
  }],
  ['POST', /^\/api\/messages$/, async ({ body }) => {
    requireAuth();
    const c = conversations.find((x) => x.id === body.conversation_id);
    if (!c) fail(404, 'Conversation not found.');
    if (!body.body?.trim() && !body.attachments?.length) fail(422, 'The given data was invalid.', { body: ['The body field is required.'] });
    const m = { id: nextIds.message, client_id: body.client_id, conversation_id: c.id, sender_id: ME_ID, body: body.body ?? null, type: body.type ?? 'text', reply_to_id: body.reply_to_id ?? null, created_at: now(), updated_at: null, delivered_at: null, read_at: null, deleted_at: null, attachments: body.attachments ?? [], reactions: [], meta: body.meta ?? null };
    messages.push(m);
    c.draft = null;
    simulateReply(c, m);
    return [201, { data: m }];
  }],
  ['PUT', /^\/api\/messages\/(\d+)$/, async ({ match, body }) => {
    requireAuth();
    const m = messages.find((x) => x.id === +match[1]);
    if (!m) fail(404, 'Message not found.');
    if (m.sender_id !== ME_ID && !('pinned' in body)) fail(403, 'You can only edit your own messages.');
    if ('pinned' in body) { m.pinned_at = body.pinned ? now() : null; return [200, { data: m }]; }
    Object.assign(m, { body: body.body, updated_at: now() });
    return [200, { data: m }];
  }],
  ['DELETE', /^\/api\/messages\/(\d+)$/, async ({ match }) => {
    requireAuth();
    const m = messages.find((x) => x.id === +match[1]);
    if (!m) fail(404, 'Message not found.');
    if (m.sender_id !== ME_ID) fail(403, 'You can only delete your own messages.');
    m.deleted_at = now();
    return [200, { data: m }];
  }],
  ['POST', /^\/api\/messages\/(\d+)\/read$/, async ({ match }) => { requireAuth(); const m = messages.find((x) => x.id === +match[1]); if (m) m.read_at = now(); return [204, null]; }],
  ['POST', /^\/api\/messages\/(\d+)\/reaction$/, async ({ match, body }) => {
    requireAuth();
    const m = messages.find((x) => x.id === +match[1]);
    if (!m) fail(404, 'Message not found.');
    // Toggle: one user reacting twice with the same emoji removes it.
    const r = m.reactions.find((x) => x.emoji === body.emoji);
    if (!r) m.reactions.push({ emoji: body.emoji, user_ids: [ME_ID] });
    else if (r.user_ids.includes(ME_ID)) { r.user_ids = r.user_ids.filter((id) => id !== ME_ID); if (!r.user_ids.length) m.reactions = m.reactions.filter((x) => x !== r); }
    else r.user_ids.push(ME_ID);
    return [200, { data: m }];
  }],
  ['GET', /^\/api\/groups$/, async () => { requireAuth(); return [200, { data: conversations.filter((c) => c.type === 'group').map(view) }]; }],
  ['POST', /^\/api\/groups$/, async ({ body }) => {
    requireAuth();
    if (!body.name?.trim()) fail(422, 'The given data was invalid.', { name: ['The name field is required.'] });
    const c = { id: conversations.length + 1, type: 'group', name: body.name, avatar_url: null, participant_ids: [ME_ID, ...(body.user_ids ?? [])], unread_count: 0, is_pinned: false, is_muted: false, is_archived: false, draft: null };
    conversations.push(c);
    return [201, { data: view(c) }];
  }],
  ['GET', /^\/api\/groups\/(\d+)$/, async ({ match }) => { requireAuth(); const c = conversations.find((x) => x.id === +match[1] && x.type === 'group'); if (!c) fail(404, 'Group not found.'); return [200, { data: view(c) }]; }],
  ['POST', /^\/api\/groups\/(\d+)\/members$/, async ({ match, body }) => {
    requireAuth();
    const c = conversations.find((x) => x.id === +match[1]);
    if (!c) fail(404, 'Group not found.');
    c.participant_ids = [...new Set([...c.participant_ids, ...(body.user_ids ?? [])])];
    return [200, { data: view(c) }];
  }],
  ['POST', /^\/api\/upload$/, async ({ config }) => {
    requireAuth();
    const file = config.data?.get?.('file');
    if (!file) fail(422, 'The given data was invalid.', { file: ['The file field is required.'] });
    if (file.size > 20 * 1024 * 1024) fail(422, 'The given data was invalid.', { file: ['The file must not be greater than 20 MB.'] });
    if (/fail/i.test(file.name)) { await delay(300); fail(500, 'Upload failed.'); }
    for (let p = 20; p <= 100; p += 20) { await delay(120); config.onUploadProgress?.({ loaded: p, total: 100 }); }
    return [201, { data: { id: nextIds.attachment, name: file.name, mime: file.type || 'application/octet-stream', size: file.size, url: URL.createObjectURL(file) } }];
  }],
  ['GET', /^\/api\/notifications$/, async () => { requireAuth(); return [200, { data: notifications }]; }],
  ['POST', /^\/api\/notifications\/read-all$/, async () => { requireAuth(); notifications.forEach((n) => { n.read_at ??= now(); }); return [204, null]; }],
];

routes.unshift(...authRoutes({ fail, requireAuth, me, now, AUTH_KEY }), ...appRoutes({ fail, requireAuth, me, now, view, HttpFail }));

/** axios adapter: lets the real services/ code run unchanged against in-memory data. */
export async function mockAdapter(config) {
  await delay();
  const url = new URL(config.url, 'http://mock');
  const path = url.pathname;
  const method = (config.method ?? 'get').toUpperCase();
  const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : config.data instanceof FormData ? {} : config.data ?? {};
  const response = (status, data, headers = {}) => ({ data, status, statusText: String(status), headers, config, request: {} });

  try {
    for (const [m, re, handler] of routes) {
      const match = path.match(re);
      if (m === method && match) {
        const [status, data] = await handler({ match, body, params: { ...Object.fromEntries(url.searchParams), ...(config.params ?? {}) }, config });
        return response(status, data);
      }
    }
    fail(404, 'Not found.');
  } catch (e) {
    if (!(e instanceof HttpFail)) throw e;
    const res = response(e.status, e.body, e.headers);
    throw new AxiosError(e.message, String(e.status), config, res.request, res);
  }
}
