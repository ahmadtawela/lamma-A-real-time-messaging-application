// Mock endpoints for everything beyond auth/messages. Same JSON shapes the Laravel API Resources will return.
import { users, conversations, messages, notifications, ME_ID } from '@/mocks/data';
import { mockBus } from '@/realtime/mock/mockServer';

const MIN = 60e3, HOUR = 36e5, DAY = 864e5;
const T = Date.now();
const iso = (t) => new Date(t).toISOString();
const COLORS = ['#3D4BF2', '#8A2BFF', '#0A8CFF', '#13A38A', '#E2603C', '#C2347A'];

export const statuses = [
  { id: 1, user_id: 2, kind: 'text', text: 'يوم جميل ☀️', color: COLORS[1], created_at: iso(T - 2 * HOUR), expires_at: iso(T + 22 * HOUR), viewers: [], reactions: [], seen: false },
  { id: 2, user_id: 2, kind: 'text', text: 'Coffee first, code later ☕', color: COLORS[3], created_at: iso(T - 1 * HOUR), expires_at: iso(T + 23 * HOUR), viewers: [], reactions: [], seen: false },
  { id: 3, user_id: 3, kind: 'text', text: 'Shipping Lamma v1 🚀', color: COLORS[0], created_at: iso(T - 5 * HOUR), expires_at: iso(T + 19 * HOUR), viewers: [], reactions: [], seen: false },
  { id: 4, user_id: 5, kind: 'text', text: 'مبروك التخرج 🎓', color: COLORS[4], created_at: iso(T - 8 * HOUR), expires_at: iso(T + 16 * HOUR), viewers: [], reactions: [], seen: true },
  { id: 5, user_id: ME_ID, kind: 'text', text: 'Working on Lamma 💙', color: COLORS[2], created_at: iso(T - 3 * HOUR), expires_at: iso(T + 21 * HOUR), viewers: [{ user_id: 2, at: iso(T - 2 * HOUR) }, { user_id: 3, at: iso(T - HOUR) }], reactions: [{ user_id: 2, emoji: '🔥' }], seen: true },
];
let statusId = 6;

export const calls = [
  { id: 1, peer_id: 2, kind: 'voice', direction: 'incoming', status: 'missed', duration: 0, created_at: iso(T - 3 * HOUR) },
  { id: 2, peer_id: 3, kind: 'video', direction: 'outgoing', status: 'completed', duration: 754, created_at: iso(T - DAY) },
  { id: 3, peer_id: 4, kind: 'voice', direction: 'incoming', status: 'completed', duration: 96, created_at: iso(T - 2 * DAY) },
  { id: 4, peer_id: 5, kind: 'voice', direction: 'outgoing', status: 'cancelled', duration: 0, created_at: iso(T - 3 * DAY) },
];
let callId = 5;
const live = new Map();           // id -> { peer_id, kind, direction, status, answeredAt }
const starred = new Set();

/** Dev helper (also used by the realtime mock driver): pretend someone is calling me. */
export function simulateIncomingCall(peerId, kind = 'voice') {
  const peer = users.find((u) => u.id === peerId) ?? users[1];
  const id = callId++;
  live.set(id, { peer_id: peer.id, kind, direction: 'incoming', status: 'ringing' });
  mockBus.emit('CallIncoming', { call: { id, kind, offer: 'mock-offer', caller: { id: peer.id, name: peer.name, avatar_url: null } } });
  setTimeout(() => live.get(id)?.status === 'ringing' && closeCall(id, 'missed', 'missed'), 60000);
}
function closeCall(id, status, reason) {
  const c = live.get(id); if (!c) return null;
  c.status = status; live.delete(id);
  const duration = c.answeredAt ? Math.round((Date.now() - c.answeredAt) / 1000) : 0;
  const row = { id, peer_id: c.peer_id, kind: c.kind, direction: c.direction, status, duration, created_at: new Date().toISOString() };
  calls.unshift(row);
  if (reason) mockBus.emit('CallEnded', { call_id: id, reason });
  return row;
}

const reports = [
  { id: 1, reporter_id: 2, reported_user_id: 9, message_id: null, reason: 'spam', status: 'open', created_at: iso(T - 4 * HOUR) },
  { id: 2, reporter_id: 4, reported_user_id: 12, message_id: 40, reason: 'harassment', status: 'open', created_at: iso(T - DAY) },
  { id: 3, reporter_id: 6, reported_user_id: 15, message_id: null, reason: 'abuse', status: 'resolved', created_at: iso(T - 3 * DAY) },
];
let reportId = 4;
const logs = Array.from({ length: 14 }, (_, i) => ({ id: i + 1, level: ['info', 'info', 'warning', 'error'][i % 4], message: ['User logged in', 'Message batch broadcast', 'Rate limit hit on /api/messages', 'Upload failed: disk quota'][i % 4], created_at: iso(T - i * 17 * MIN) }));
const adminSettings = { registration_open: true, require_email_verification: true, max_upload_mb: 20, maintenance_mode: false };
const contactsAdded = new Set();
let pendingPhone = null;
const deletedContacts = new Set();

export const appRoutes = ({ fail, requireAuth, me, now, view, HttpFail }) => {
  const admin = () => { requireAuth(); if (!me().is_admin) fail(403, 'This action is unauthorized.'); };
  const userById = (id) => users.find((u) => u.id === +id);
  const conv = (id) => { const c = conversations.find((x) => x.id === +id); if (!c) fail(404, 'Conversation not found.'); return c; };
  const textOf = (m) => m.body ?? m.attachments?.[0]?.name ?? '';

  return [
    ['GET', /^\/api\/search$/, async ({ params }) => {
      requireAuth();
      const q = (params.q ?? '').trim().toLowerCase(); const type = params.type ?? 'all';
      if (!q) return [200, { data: [] }];
      const titleOf = (c) => c.name ?? userById(c.participant_ids.find((p) => p !== ME_ID))?.name ?? '';
      const out = [];
      const want = (t) => type === 'all' || type === t;
      if (want('users')) users.filter((u) => u.id !== ME_ID && (u.name.toLowerCase().includes(q) || u.username.includes(q))).forEach((u) => out.push({ type: 'users', id: u.id, title: u.name, snippet: `@${u.username}`, user_id: u.id }));
      if (want('groups')) conversations.filter((c) => c.type === 'group' && c.name.toLowerCase().includes(q)).forEach((c) => out.push({ type: 'groups', id: c.id, title: c.name, snippet: c.description, conversation_id: c.id }));
      messages.filter((m) => !m.deleted_at && m.type !== 'system').forEach((m) => {
        const c = conversations.find((x) => x.id === m.conversation_id); const txt = textOf(m);
        const row = { id: m.id, title: txt, snippet: txt, created_at: m.created_at, conversation_id: m.conversation_id, conversation_title: titleOf(c) };
        if (want('messages') && m.body?.toLowerCase().includes(q)) out.push({ ...row, type: 'messages' });
        if (want('files') && m.type === 'file' && txt.toLowerCase().includes(q)) out.push({ ...row, type: 'files' });
        if (want('media') && m.type === 'image' && ('image photo'.includes(q) || txt.toLowerCase().includes(q))) out.push({ ...row, type: 'media', thumb: m.attachments[0]?.url });
        if (want('links') && /https?:\/\//.test(m.body ?? '') && m.body.toLowerCase().includes(q)) out.push({ ...row, type: 'links' });
      });
      return [200, { data: out.slice(0, 60) }];
    }],

    ['GET', /^\/api\/contacts$/, async ({ params }) => { requireAuth(); const q = (params.q ?? '').toLowerCase(); return [200, { data: users.filter((u) => u.id !== ME_ID && !deletedContacts.has(u.id) && (!q || u.name.toLowerCase().includes(q) || u.username.includes(q))) }]; }],

    // ----- conversations / messages extras
    ['POST', /^\/api\/conversations$/, async ({ body }) => {
      requireAuth();
      const u = userById(body.user_id); if (!u) fail(404, 'User not found.');
      let c = conversations.find((x) => x.type === 'private' && x.participant_ids.includes(u.id));
      if (!c) { c = { id: Math.max(...conversations.map((x) => x.id)) + 1, type: 'private', participant_ids: [ME_ID, u.id], unread_count: 0, is_pinned: false, is_muted: false, is_archived: false, draft: null, avatar_url: null, name: null }; conversations.push(c); }
      c.is_archived = false;
      return [200, { data: view(c) }];
    }],
    ['DELETE', /^\/api\/conversations\/(\d+)\/messages$/, async ({ match }) => { requireAuth(); const id = +match[1]; for (let i = messages.length - 1; i >= 0; i--) if (messages[i].conversation_id === id) messages.splice(i, 1); conv(id).unread_count = 0; return [204, null]; }],
    ['DELETE', /^\/api\/conversations\/(\d+)$/, async ({ match }) => { requireAuth(); const c = conv(match[1]); conversations.splice(conversations.indexOf(c), 1); return [204, null]; }],
    ['POST', /^\/api\/messages\/(\d+)\/vote$/, async ({ match, body }) => {
      requireAuth(); const m = messages.find((x) => x.id === +match[1]); if (!m?.meta?.options) fail(404, 'Poll not found.');
      m.meta.options.forEach((o) => { o.votes = o.id === body.option_id ? (o.votes.includes(ME_ID) ? o.votes.filter((v) => v !== ME_ID) : [...o.votes, ME_ID]) : o.votes.filter((v) => v !== ME_ID); });
      return [200, { data: m }];
    }],
    ['POST', /^\/api\/reports$/, async ({ body }) => { requireAuth(); const r = { id: reportId++, reporter_id: ME_ID, reported_user_id: body.user_id, message_id: body.message_id, reason: body.reason, status: 'open', created_at: now() }; reports.unshift(r); return [201, { data: r }]; }],
    ['PUT', /^\/api\/user\/password$/, async ({ body }) => {
      requireAuth(); const e = {};
      if (body.current_password !== 'password') e.current_password = ['The current password is incorrect.'];
      if ((body.password ?? '').length < 8) e.password = ['The password field must be at least 8 characters.']; else if (body.password !== body.password_confirmation) e.password = ['The password field confirmation does not match.'];
      if (Object.keys(e).length) fail(422, 'The given data was invalid.', e);
      return [204, null];
    }],

    // ----- groups
    ['PUT', /^\/api\/groups\/(\d+)$/, async ({ match, body }) => { requireAuth(); const c = conv(match[1]); if (!(c.admin_ids ?? []).includes(ME_ID)) fail(403, 'Only admins can edit this group.'); if ('name' in body && !body.name.trim()) fail(422, 'The given data was invalid.', { name: ['The name field is required.'] }); Object.assign(c, body); return [200, { data: view(c) }]; }],
    ['DELETE', /^\/api\/groups\/(\d+)$/, async ({ match }) => { requireAuth(); const c = conv(match[1]); if (!(c.admin_ids ?? []).includes(ME_ID)) fail(403, 'Only admins can delete this group.'); conversations.splice(conversations.indexOf(c), 1); return [204, null]; }],
    ['DELETE', /^\/api\/groups\/(\d+)\/members\/(\d+)$/, async ({ match }) => {
      requireAuth(); const c = conv(match[1]); const uid = +match[2];
      if (uid !== ME_ID && !(c.admin_ids ?? []).includes(ME_ID)) fail(403, 'Only admins can remove members.');
      c.participant_ids = c.participant_ids.filter((p) => p !== uid); c.admin_ids = (c.admin_ids ?? []).filter((p) => p !== uid);
      return [200, { data: view(c) }];
    }],
    ['POST', /^\/api\/groups\/(\d+)\/admins$/, async ({ match, body }) => { requireAuth(); const c = conv(match[1]); c.admin_ids = [...new Set([...(c.admin_ids ?? []), body.user_id])]; return [200, { data: view(c) }]; }],
    ['DELETE', /^\/api\/groups\/(\d+)\/admins\/(\d+)$/, async ({ match }) => { requireAuth(); const c = conv(match[1]); c.admin_ids = (c.admin_ids ?? []).filter((p) => p !== +match[2]); return [200, { data: view(c) }]; }],

    // ----- contacts
    ['POST', /^\/api\/contacts$/, async ({ body }) => {
      requireAuth();
      if (body.phone !== undefined && !/^\+[1-9]\d{7,14}$/.test(body.phone)) fail(422, 'The given data was invalid.', { phone: ['The phone number is not valid.'] });
      if (body.phone === undefined && !body.user_id && !/^\S+@\S+\.\S+$/.test(body.email ?? '')) fail(422, 'The given data was invalid.', { email: ['The email field must be a valid email address.'] });
      const u = body.user_id ? userById(body.user_id) : body.phone ? users.find((x) => x.id !== ME_ID && x.phone === body.phone && x.phone_verified && x.phone_discoverable !== false) : users.find((x) => x.email === (body.email ?? '').toLowerCase());
      if (!u) return [202, { invited: true }];
      deletedContacts.delete(u.id); contactsAdded.add(u.id);
      return [201, { data: u }];
    }],
    ['DELETE', /^\/api\/contacts\/(\d+)$/, async ({ match }) => { requireAuth(); deletedContacts.add(+match[1]); return [204, null]; }],
    ['POST', /^\/api\/contacts\/(\d+)\/block$/, async ({ match }) => { requireAuth(); const u = userById(match[1]); u.is_blocked = true; return [200, { data: { is_blocked: true } }]; }],
    ['DELETE', /^\/api\/contacts\/(\d+)\/block$/, async ({ match }) => { requireAuth(); const u = userById(match[1]); u.is_blocked = false; return [200, { data: { is_blocked: false } }]; }],

    // ----- calls (history + WebRTC signalling)
    ['GET', /^\/api\/calls$/, async () => { requireAuth(); return [200, { data: calls }]; }],
    ['GET', /^\/api\/calls\/ice-servers$/, async () => { requireAuth(); return [200, { data: { ice_servers: [{ urls: ['stun:stun.l.google.com:19302'] }], ttl: 3600 } }]; }],
    ['GET', /^\/api\/calls\/pending$/, async () => { requireAuth(); return [200, { data: null }]; }],
    ['POST', /^\/api\/calls\/start$/, async ({ body }) => {
      requireAuth();
      if (body.callee_id === 9) throw new HttpFail(409, { message: 'The user is busy.', reason: 'busy' });
      const id = callId++;
      live.set(id, { peer_id: body.callee_id, kind: body.kind, direction: 'outgoing', status: 'ringing' });
      setTimeout(() => { const c = live.get(id); if (c?.status === 'ringing') { c.status = 'active'; c.answeredAt = Date.now(); mockBus.emit('CallAnswered', { call_id: id, sdp: 'mock-answer' }); } }, 2200);
      return [201, { data: { id, status: 'ringing', peer_id: body.callee_id } }];
    }],
    ['POST', /^\/api\/calls\/(\d+)\/answer$/, async ({ match }) => { requireAuth(); const c = live.get(+match[1]); if (c) { c.status = 'active'; c.answeredAt = Date.now(); } return [200, { data: { id: +match[1], status: 'active' } }]; }],
    ['POST', /^\/api\/calls\/(\d+)\/ice$/, async () => { requireAuth(); return [204, null]; }],
    ['POST', /^\/api\/calls\/(\d+)\/decline$/, async ({ match }) => { requireAuth(); closeCall(+match[1], 'declined', null); return [200, { data: { status: 'declined' } }]; }],
    ['POST', /^\/api\/calls\/(\d+)\/end$/, async ({ match }) => {
      requireAuth(); const c = live.get(+match[1]);
      const row = closeCall(+match[1], c?.status === 'active' ? 'completed' : (c?.direction === 'incoming' ? 'declined' : 'cancelled'), null);
      return [200, { data: row ?? { status: 'ended' } }];
    }],

    // ----- link preview (the real server fetches the page; the mock fabricates a card from the domain)
    ['GET', /^\/api\/link-preview$/, async ({ params }) => {
      requireAuth();
      let host; try { const u = new URL(params.url); if (!/^https?:$/.test(u.protocol) || /^(localhost|127\.|10\.|192\.168\.)/.test(u.hostname)) throw new Error('blocked'); host = u.hostname.replace(/^www\./, ''); }
      catch { fail(422, 'The given data was invalid.', { url: ['The link is not allowed.'] }); }
      const title = host.split('.')[0].replace(/^./, (c) => c.toUpperCase());
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="210"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0A8CFF"/><stop offset="1" stop-color="#8A2BFF"/></linearGradient></defs><rect width="400" height="210" fill="url(#g)"/><text x="200" y="115" font-size="30" fill="#fff" text-anchor="middle" font-family="sans-serif">${host}</text></svg>`;
      return [200, { data: { url: params.url, domain: host, title: `${title} — preview (mock)`, description: 'A server-side preview of this page would appear here.', image: 'data:image/svg+xml;utf8,' + encodeURIComponent(svg), site_name: title } }];
    }],

    // ----- phone verification (demo SMS code: 123456) + contacts by phone
    ['POST', /^\/api\/user\/phone$/, async ({ body }) => {
      requireAuth();
      if (!/^\+[1-9]\d{7,14}$/.test(body.phone ?? '')) fail(422, 'The given data was invalid.', { phone: ['The phone number is not valid.'] });
      if (users.some((u) => u.id !== ME_ID && u.phone === body.phone && u.phone_verified)) fail(422, 'The given data was invalid.', { phone: ['This number cannot be used.'] });
      pendingPhone = body.phone;
      return [200, { data: { expires_in: 600, resend_in: 30 } }];
    }],
    ['POST', /^\/api\/user\/phone\/verify$/, async ({ body }) => {
      requireAuth();
      if (!pendingPhone) fail(422, 'The given data was invalid.', { code: ['The code has expired. Request a new one.'] });
      if (body.code !== '123456') fail(422, 'The given data was invalid.', { code: ['The provided code was invalid.'] });
      Object.assign(me(), { phone: pendingPhone, phone_verified: true }); pendingPhone = null;
      return [200, { data: me() }];
    }],
    ['DELETE', /^\/api\/user\/phone$/, async () => { requireAuth(); Object.assign(me(), { phone: null, phone_verified: false }); return [200, { data: me() }]; }],

    // ----- avatars (multipart)
    ['POST', /^\/api\/user\/avatar$/, async ({ config }) => {
      requireAuth(); const f = config.data?.get?.('avatar'); if (!f) fail(422, 'The given data was invalid.', { avatar: ['The avatar field is required.'] });
      me().avatar_url = URL.createObjectURL(f); return [200, { data: me() }];
    }],
    ['POST', /^\/api\/groups\/(\d+)\/avatar$/, async ({ match, config }) => {
      requireAuth(); const c = conv(match[1]); const f = config.data?.get?.('avatar'); if (!f) fail(422, 'The given data was invalid.', { avatar: ['The avatar field is required.'] });
      c.avatar_url = URL.createObjectURL(f); return [200, { data: view(c) }];
    }],

    // ----- stars
    ['GET', /^\/api\/messages\/starred$/, async () => { requireAuth(); return [200, { data: messages.filter((m) => starred.has(m.id)) }]; }],
    ['POST', /^\/api\/messages\/(\d+)\/star$/, async ({ match }) => { requireAuth(); const id = +match[1]; if (starred.has(id)) starred.delete(id); else starred.add(id); return [200, { starred: starred.has(id) }]; }],

    // ----- statuses / notifications
    ['GET', /^\/api\/statuses$/, async () => { requireAuth(); return [200, { data: statuses.filter((s) => Date.parse(s.expires_at) > Date.now()) }]; }],
    ['POST', /^\/api\/statuses$/, async ({ body, config }) => {
      requireAuth();
      if (config.data instanceof FormData) { const f = config.data; body = { kind: f.get('kind'), text: f.get('text'), color: f.get('color'), privacy: f.get('privacy'), media_url: f.get('media') ? URL.createObjectURL(f.get('media')) : null }; }
      if (body.kind === 'text' && !body.text?.trim()) fail(422, 'The given data was invalid.', { text: ['The text field is required.'] });
      const s = { id: statusId++, user_id: ME_ID, kind: body.kind, text: body.text ?? null, color: body.color ?? COLORS[0], media_url: body.media_url ?? null, privacy: body.privacy ?? 'contacts', created_at: now(), expires_at: iso(Date.now() + DAY), viewers: [], reactions: [], seen: true };
      statuses.push(s); return [201, { data: s }];
    }],
    ['DELETE', /^\/api\/statuses\/(\d+)$/, async ({ match }) => { requireAuth(); const i = statuses.findIndex((s) => s.id === +match[1] && s.user_id === ME_ID); if (i < 0) fail(404, 'Status not found.'); statuses.splice(i, 1); return [204, null]; }],
    ['POST', /^\/api\/statuses\/(\d+)\/view$/, async ({ match }) => { requireAuth(); const s = statuses.find((x) => x.id === +match[1]); if (s) s.seen = true; return [204, null]; }],
    ['POST', /^\/api\/statuses\/(\d+)\/reaction$/, async ({ match, body }) => { requireAuth(); const s = statuses.find((x) => x.id === +match[1]); if (!s) fail(404, 'Status not found.'); s.reactions = [...s.reactions.filter((r) => r.user_id !== ME_ID), { user_id: ME_ID, emoji: body.emoji }]; return [200, { data: s }]; }],
    ['DELETE', /^\/api\/notifications\/(\d+)$/, async ({ match }) => { requireAuth(); const i = notifications.findIndex((n) => n.id === +match[1]); if (i >= 0) notifications.splice(i, 1); return [204, null]; }],

    // ----- admin (403 for non-admins)
    ['GET', /^\/api\/admin\/stats$/, async () => {
      admin();
      return [200, { data: { total_users: users.length * 57 + 12, active_users: users.filter((u) => u.is_online).length * 43, messages: messages.length * 912, groups: conversations.filter((c) => c.type === 'group').length * 31, reports_open: reports.filter((r) => r.status === 'open').length, storage_used_gb: 184.6, storage_total_gb: 500,
        messages_per_day: [3200, 4100, 3800, 5200, 6100, 5800, 6900] } }];
    }],
    ['GET', /^\/api\/admin\/users$/, async ({ params }) => { admin(); const q = (params.q ?? '').toLowerCase(); return [200, { data: users.filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.includes(q)).map((u) => ({ ...u, messages_count: messages.filter((m) => m.sender_id === u.id).length })) }]; }],
    ['GET', /^\/api\/admin\/users\/(\d+)\/activity$/, async ({ match }) => { admin(); const id = +match[1]; return [200, { data: messages.filter((m) => m.sender_id === id).slice(-8).reverse().map((m) => ({ id: m.id, at: m.created_at, action: `message:${m.type}` })) }]; }],
    ['PUT', /^\/api\/admin\/users\/(\d+)$/, async ({ match, body }) => { admin(); const u = userById(match[1]); if (u.id === ME_ID) fail(403, 'You cannot block yourself.'); u.is_blocked = !!body.is_blocked; return [200, { data: u }]; }],
    ['DELETE', /^\/api\/admin\/users\/(\d+)$/, async ({ match }) => { admin(); if (+match[1] === ME_ID) fail(403, 'You cannot delete yourself.'); const i = users.findIndex((u) => u.id === +match[1]); if (i >= 0) users.splice(i, 1); return [204, null]; }],
    ['GET', /^\/api\/admin\/groups$/, async () => { admin(); return [200, { data: conversations.filter((c) => c.type === 'group').map((c) => ({ id: c.id, name: c.name, members: c.participant_ids.length, messages_count: messages.filter((m) => m.conversation_id === c.id).length })) }]; }],
    ['DELETE', /^\/api\/admin\/groups\/(\d+)$/, async ({ match }) => { admin(); const i = conversations.findIndex((c) => c.id === +match[1]); if (i >= 0) conversations.splice(i, 1); return [204, null]; }],
    ['GET', /^\/api\/admin\/reports$/, async () => { admin(); return [200, { data: reports }]; }],
    ['PUT', /^\/api\/admin\/reports\/(\d+)$/, async ({ match, body }) => { admin(); const r = reports.find((x) => x.id === +match[1]); if (!r) fail(404, 'Report not found.'); r.status = body.status; return [200, { data: r }]; }],
    ['GET', /^\/api\/admin\/logs$/, async () => { admin(); return [200, { data: logs }]; }],
    ['GET', /^\/api\/admin\/settings$/, async () => { admin(); return [200, { data: adminSettings }]; }],
    ['PUT', /^\/api\/admin\/settings$/, async ({ body }) => { admin(); Object.assign(adminSettings, body); return [200, { data: adminSettings }]; }],
  ];
};
