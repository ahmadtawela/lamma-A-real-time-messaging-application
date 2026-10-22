// Mock data layer. Isolated on purpose: nothing outside src/mocks imports this file.
// Shapes match src/models, so replacing the mock adapter with Laravel changes no UI code.
let seed = 42;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (a) => a[Math.floor(rand() * a.length)];
const MIN = 60e3, HOUR = 36e5, DAY = 864e5;
const NOW = Date.now();
const iso = (t) => new Date(t).toISOString();

export const ME_ID = 1;

const PEOPLE = [
  ['Ahmad Tawela', 'ar'], ['سارة الخليل', 'ar'], ['Omar Haddad', 'en'], ['ليلى منصور', 'ar'], ['Yusuf Demir', 'en'],
  ['نور العلي', 'ar'], ['Daniel Brooks', 'en'], ['هدى القاسم', 'ar'], ['Mehmet Kaya', 'en'], ['كريم سليمان', 'ar'],
  ['Amira Saleh', 'en'], ['زياد النجار', 'ar'], ['Elif Yıldız', 'en'], ['ريم حداد', 'ar'], ['Tariq Aziz', 'en'],
  ['منى الشامي', 'ar'], ['Lucas Meyer', 'en'], ['دانة خوري', 'ar'], ['Hassan Ali', 'en'], ['جود البكري', 'ar'],
  ['Maya Torres', 'en'], ['باسل عيسى', 'ar'],
];
const slug = (s, i) => (/^[\x00-\x7F]+$/.test(s) ? s.toLowerCase().replace(/[^a-z]+/g, '.') : `user${i + 1}`);

export const users = PEOPLE.map(([name, locale], i) => ({
  id: i + 1, name, username: slug(name, i), email: `${slug(name, i)}@lamma.test`, avatar_url: null,
  about: i % 3 === 0 ? 'Available' : i % 3 === 1 ? 'في العمل' : null, locale,
  is_online: i === 0 || rand() > 0.55, phone: i === 0 ? null : `+90555${String(100 + i * 7).padStart(3, '0')}00${String(10 + i).padStart(2, '0')}`, phone_verified: i !== 0, phone_discoverable: true, is_admin: i === 0, is_blocked: false, email_verified_at: iso(NOW - 30 * DAY), status_text: null,
  last_seen_at: iso(NOW - Math.floor(rand() * 20) * HOUR - 5 * MIN),
}));

const TEXTS = [
  'مرحبا، كيف حالك؟', 'Hello, how are you?', 'مرحبا Ahmed, how are you?', 'Laravel + React + MySQL',
  'تم إرسال الرسالة successfully', 'هل راجعت الـ pull request؟', 'Can you send me the design files?',
  'اجتماع الفريق الساعة 3 مساءً', 'Sounds good, see you tomorrow!', 'شكراً جزيلاً، ممتاز 👌',
  'The API returns 422 for invalid data', 'خلصت الـ migration على MySQL', 'Let me check and get back to you',
  'تمام، سأرسلها الآن', 'Did you deploy to staging?', 'أرسل لي الرابط من فضلك', 'On my way 🚗', 'ما رأيك بالتصميم الجديد؟',
];

const svg = (a, b, label) =>
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="640" height="420" fill="url(#g)"/><text x="320" y="225" font-size="34" fill="#fff" text-anchor="middle" font-family="sans-serif">${label}</text></svg>`);

let attId = 1;
const imageAtt = () => ({ id: attId++, name: `photo-${attId}.jpg`, mime: 'image/jpeg', size: 240000 + Math.floor(rand() * 900000), url: svg(pick(['#0A8CFF', '#2B3BFF', '#13A38A']), pick(['#8A2BFF', '#5B4BDB', '#0A8CFF']), 'Lamma'), width: 640, height: 420 });
const fileAtt = () => ({ id: attId++, name: pick(['Design-spec.pdf', 'Report-Q3.pdf', 'schema.sql', 'عرض-المشروع.pdf']), mime: 'application/pdf', size: 120000 + Math.floor(rand() * 3000000), url: '#' });
const voiceAtt = () => ({ id: attId++, name: 'voice.webm', mime: 'audio/webm', size: 30000, url: '#', duration: 4 + Math.floor(rand() * 40), waveform: Array.from({ length: 32 }, () => Math.round(rand() * 100)) });

// Conversations: 10 private chats (with users 2..11) + 5 groups.
const GROUPS = [['فريق التصميم', [1, 2, 4, 6, 8]], ['Laravel Devs', [1, 3, 5, 7, 9, 11]], ['عائلة طويلة', [1, 2, 10, 12, 14]], ['Project Lamma', [1, 3, 4, 5, 13, 15, 16]], ['نادي القراءة', [1, 6, 8, 17, 18, 19]]];

const metaFor = (type, c) => type === 'location' ? { lat: 33.5138, lng: 36.2765, label: pick(['Damascus', 'Istanbul', 'Café Lamma']) }
  : type === 'contact' ? { name: pick(['Sara Khalil', 'Omar Haddad', 'نور العلي']), phone: '+90 555 010 20 30' }
  : type === 'poll' ? { question: pick(['متى نجتمع؟', 'Where should we meet?']), options: [{ id: 'a', text: 'Friday', votes: [2, 3] }, { id: 'b', text: 'Saturday', votes: [4] }, { id: 'c', text: 'الأحد', votes: [] }] } : null;

export const conversations = [];
export const messages = [];
let msgId = 1;

function makeConversation(id, base) {
  const count = 14 + Math.floor(rand() * 12);
  const sender = (c) => (c.type === 'private' ? (rand() > 0.5 ? ME_ID : c.participant_ids.find((p) => p !== ME_ID)) : pick(c.participant_ids));
  const c = { id, is_pinned: false, is_muted: false, is_archived: false, draft: null, unread_count: 0, avatar_url: null, name: null, ...base };
  let t = NOW - (2 + Math.floor(rand() * 40)) * DAY * (id <= 3 ? 0.02 : 0.1);
  const thread = [];
  for (let i = 0; i < count; i++) {
    t += (5 + Math.floor(rand() * 90)) * MIN;
    const r = rand();
    const type = r > 0.92 ? 'image' : r > 0.86 ? 'file' : r > 0.8 ? 'voice' : r > 0.77 ? 'location' : r > 0.74 ? 'contact' : (r > 0.71 && base.type === 'group') ? 'poll' : 'text';
    const from = sender(c);
    const m = {
      id: msgId++, conversation_id: id, sender_id: from, body: type === 'text' ? pick(TEXTS) : type === 'image' ? 'Look at this' : null, type, meta: metaFor(type, c),
      reply_to_id: type === 'text' && thread.length > 3 && rand() > 0.88 ? thread[thread.length - 2].id : null,
      created_at: iso(t), updated_at: null, delivered_at: iso(t + 1000), read_at: null, deleted_at: null,
      attachments: type === 'image' ? [imageAtt()] : type === 'file' ? [fileAtt()] : type === 'voice' ? [voiceAtt()] : [],
      reactions: rand() > 0.9 ? [{ emoji: pick(['❤️', '👍', '😂', '🔥']), user_ids: [pick(c.participant_ids)] }] : [],
    };
    thread.push(m);
  }
  if (c.type === 'group') thread.unshift({ id: msgId++, conversation_id: id, sender_id: c.participant_ids[0], body: 'group_created', type: 'system', meta: null, reply_to_id: null, created_at: iso(t - HOUR), updated_at: null, delivered_at: null, read_at: iso(t), deleted_at: null, attachments: [], reactions: [] });
  const unread = id % 3 === 0 ? 1 + Math.floor(rand() * 6) : 0;
  thread.forEach((m, i) => { m.read_at = i >= thread.length - unread && m.sender_id !== ME_ID ? null : iso(Date.parse(m.created_at) + 2 * MIN); });
  // Ensure the unread tail really comes from other people.
  for (let i = thread.length - unread; i < thread.length; i++) if (thread[i].sender_id === ME_ID) thread[i].sender_id = c.participant_ids.find((p) => p !== ME_ID);
  c.unread_count = thread.filter((m) => m.sender_id !== ME_ID && !m.read_at).length;
  c.is_pinned = id === 1 || id === 11;
  c.is_muted = id === 5;
  c.is_archived = id === 10;
  c.draft = id === 4 ? 'سأرسل لك الملف خلال' : null;
  messages.push(...thread);
  conversations.push(c);
}

for (let i = 0; i < 10; i++) makeConversation(i + 1, { type: 'private', participant_ids: [ME_ID, i + 2] });
GROUPS.forEach(([name, ids], i) => makeConversation(11 + i, { type: 'group', name, participant_ids: ids, description: i % 2 ? 'Team space for updates and files' : 'مساحة للفريق للتحديثات والملفات', admin_ids: [1, ids[1]], restrict_messaging: false, invite_link: `https://lamma.test/join/${(i + 11).toString(36)}x9k2` }));

export const notifications = [
  { id: 1, type: 'message', body: 'سارة الخليل: مرحبا، كيف حالك؟', read_at: null, created_at: iso(NOW - 10 * MIN) },
  { id: 2, type: 'mention', body: 'Omar mentioned you in Laravel Devs', read_at: null, created_at: iso(NOW - 3 * HOUR) },
  { id: 3, type: 'group_invitation', body: 'You were added to Project Lamma', read_at: iso(NOW - DAY), created_at: iso(NOW - DAY) },
  { id: 4, type: 'missed_call', body: 'Missed call from Yusuf Demir', read_at: null, created_at: iso(NOW - 2 * DAY) },
];

export const RANDOM_REPLIES = TEXTS;
export const nextIds = { get message() { return msgId++; }, get attachment() { return attId++; } };
