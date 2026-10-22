import { create } from 'zustand';
import { conversationService } from '@/features/chat/services/conversationService';
import { messageService } from '@/features/chat/services/messageService';
import { EVENTS } from '@/realtime/events';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useUsersStore } from '@/features/users/store/usersStore';

const emptyThread = { items: [], hasMore: true, cursor: null, status: 'idle', error: null };
const myId = () => useAuthStore.getState().user?.id;
const lastActivity = (c) => Date.parse(c.last_message?.created_at ?? c.updated_at ?? 0);
/** Pinned first, then latest activity. */
const sortConversations = (list) => [...list].sort((a, b) => (b.is_pinned - a.is_pinned) || (lastActivity(b) - lastActivity(a)));
const typingTimers = {};

export const useChatStore = create((set, get) => {
  const patchThread = (cid, fn) => set((s) => ({ messages: { ...s.messages, [cid]: fn(s.messages[cid] ?? emptyThread) } }));
  const patchMessage = (cid, id, patch) =>
    patchThread(cid, (t) => ({ ...t, items: t.items.map((m) => (m.id === id || m.client_id === id ? { ...m, ...(typeof patch === 'function' ? patch(m) : patch) } : m)) }));
  const patchConversation = (cid, patch) =>
    set((s) => ({ conversations: sortConversations(s.conversations.map((c) => (c.id === cid ? { ...c, ...(typeof patch === 'function' ? patch(c) : patch) } : c))) }));
  const mergeUnique = (items) => { const seen = new Set(); return items.filter((m) => { const k = m.client_id ?? m.id; if (seen.has(m.id) || seen.has(k)) return false; seen.add(m.id); seen.add(k); return true; }); };

  return {
    conversations: [], listStatus: 'idle', listError: null, activeId: null,
    messages: {},   // conversationId -> { items (oldest first), hasMore, cursor, status, error }
    typing: {},     // conversationId -> { [userId]: true }

    async loadConversations({ filter = 'all', q = '' } = {}) {
      set({ listStatus: 'loading', listError: null });
      try {
        const { data } = await conversationService.list({ filter, q: q || undefined });
        data.forEach((c) => useUsersStore.getState().upsertMany(c.participants));
        set({ conversations: sortConversations(data), listStatus: 'ready' });
      } catch (e) { set({ listStatus: 'error', listError: e }); }
    },

    async selectConversation(id) {
      set({ activeId: id });
      if (id == null) return;
      if (!get().messages[id]) await get().loadMessages(id);
      get().markRead(id);
    },

    async loadMessages(cid, { older = false } = {}) {
      const thread = get().messages[cid] ?? emptyThread;
      if (thread.status === 'loading' || (older && !thread.hasMore)) return;
      patchThread(cid, (t) => ({ ...t, status: 'loading', error: null }));
      try {
        const { data, meta } = await messageService.list(cid, { before: older ? thread.cursor : undefined });
        patchThread(cid, (t) => ({ items: mergeUnique(older ? [...data, ...t.items] : data), hasMore: meta.has_more, cursor: meta.next_cursor, status: 'ready', error: null }));
      } catch (error) { patchThread(cid, (t) => ({ ...t, status: 'error', error })); }
    },

    /** Optimistic send: shows immediately with a client_id, then reconciles with the server message. */
    async sendMessage({ conversationId, body, type = 'text', replyToId = null, attachments = [], meta = null }) {
      const client_id = crypto.randomUUID();
      const optimistic = { id: client_id, client_id, conversation_id: conversationId, sender_id: myId(), body, type, reply_to_id: replyToId, created_at: new Date().toISOString(), updated_at: null, delivered_at: null, read_at: null, deleted_at: null, attachments, reactions: [], meta, pending: true };
      patchThread(conversationId, (t) => ({ ...t, items: [...t.items, optimistic] }));
      patchConversation(conversationId, { last_message: optimistic, draft: null });
      try {
        const { data } = await messageService.send({ conversation_id: conversationId, client_id, body, type, reply_to_id: replyToId, attachments, meta });
        patchThread(conversationId, (t) => ({ ...t, items: mergeUnique(t.items.map((m) => (m.client_id === client_id ? data : m))) }));
        patchConversation(conversationId, { last_message: data });
      } catch (error) { patchMessage(conversationId, client_id, { pending: false, failed: true, error }); }
    },
    retryMessage(cid, clientId) {
      const m = get().messages[cid]?.items.find((x) => x.client_id === clientId);
      if (!m) return;
      patchThread(cid, (t) => ({ ...t, items: t.items.filter((x) => x.client_id !== clientId) }));
      return get().sendMessage({ conversationId: cid, body: m.body, type: m.type, replyToId: m.reply_to_id, attachments: m.attachments, meta: m.meta });
    },

    async editMessage(cid, id, body) {
      const before = get().messages[cid]?.items.find((m) => m.id === id);
      patchMessage(cid, id, { body, updated_at: new Date().toISOString() });
      try { patchMessage(cid, id, (await messageService.edit(id, body)).data); }
      catch (e) { patchMessage(cid, id, before); throw e; }
    },
    async deleteMessage(cid, id) {
      const before = get().messages[cid]?.items.find((m) => m.id === id);
      patchMessage(cid, id, { deleted_at: new Date().toISOString() });
      try { await messageService.remove(id); } catch (e) { patchMessage(cid, id, before); throw e; }
    },
    async toggleReaction(cid, id, emoji) {
      const me = myId();
      const before = get().messages[cid]?.items.find((m) => m.id === id);
      patchMessage(cid, id, (m) => {
        const has = m.reactions.find((r) => r.emoji === emoji);
        const next = !has ? [...m.reactions, { emoji, user_ids: [me] }]
          : has.user_ids.includes(me) ? m.reactions.map((r) => (r === has ? { ...r, user_ids: r.user_ids.filter((u) => u !== me) } : r)).filter((r) => r.user_ids.length)
          : m.reactions.map((r) => (r === has ? { ...r, user_ids: [...r.user_ids, me] } : r));
        return { reactions: next };
      });
      try { patchMessage(cid, id, (await messageService.react(id, emoji)).data); } catch (e) { patchMessage(cid, id, before); throw e; }
    },

    async pinMessage(cid, id, pinned) {
      patchMessage(cid, id, { pinned_at: pinned ? new Date().toISOString() : null });
      try { await messageService.pin(id, pinned); } catch (e) { patchMessage(cid, id, { pinned_at: pinned ? null : new Date().toISOString() }); throw e; }
    },
    async votePoll(cid, id, optionId) {
      const me = myId();
      patchMessage(cid, id, (m) => ({ meta: { ...m.meta, options: m.meta.options.map((o) => ({ ...o, votes: o.id === optionId ? (o.votes.includes(me) ? o.votes.filter((v) => v !== me) : [...o.votes, me]) : o.votes.filter((v) => v !== me) })) } }));
      messageService.vote(id, optionId).catch(() => {});
    },
    async clearConversation(cid) {
      await conversationService.clear(cid);
      patchThread(cid, () => ({ ...emptyThread, hasMore: false, status: 'ready' }));
      patchConversation(cid, { last_message: null, unread_count: 0 });
    },
    async deleteConversation(cid) {
      await conversationService.remove(cid);
      set((s) => ({ conversations: s.conversations.filter((c) => c.id !== cid), activeId: s.activeId === cid ? null : s.activeId }));
    },
    upsertConversation: (c) => { useUsersStore.getState().upsertMany(c.participants); set((s) => ({ conversations: sortConversations([c, ...s.conversations.filter((x) => x.id !== c.id)]) })); },
    async markRead(cid) {
      if (!get().conversations.find((c) => c.id === cid)?.unread_count) return;
      patchConversation(cid, { unread_count: 0 });
      try { await conversationService.markRead(cid); } catch { /* next list load restores the truth */ }
    },
    async updateConversation(cid, patch) { // pin / mute / archive
      const before = get().conversations.find((c) => c.id === cid);
      patchConversation(cid, patch);
      try { await conversationService.update(cid, patch); } catch (e) { patchConversation(cid, before); throw e; }
    },
    saveDraft: (cid, draft) => patchConversation(cid, { draft: draft || null }),

    /** Single entry point for realtime events (Reverb in production, mock server in development). */
    applyEvent(event, p) {
      const me = myId();
      switch (event) {
        case EVENTS.MessageSent: {
          const m = p.message;
          if (m.sender_id === me && get().messages[m.conversation_id]?.items.some((x) => x.client_id && x.client_id === m.client_id)) return;
          patchThread(m.conversation_id, (t) => (t.status === 'idle' ? t : { ...t, items: mergeUnique([...t.items, m]) }));
          const active = get().activeId === m.conversation_id && !document.hidden;
          if (!get().conversations.some((c) => c.id === m.conversation_id)) { get().loadConversations(); return; }
          patchConversation(m.conversation_id, (c) => ({ last_message: m, unread_count: m.sender_id !== me && !active ? c.unread_count + 1 : c.unread_count }));
          if (active && m.sender_id !== me) conversationService.markRead(m.conversation_id).catch(() => {});
          break;
        }
        case EVENTS.MessageDelivered: patchMessage(p.conversation_id, p.message_id, { delivered_at: p.delivered_at }); break;
        case EVENTS.MessageRead: patchMessage(p.conversation_id, p.message_id, { read_at: p.read_at }); break;
        case EVENTS.MessageEdited: patchMessage(p.message.conversation_id, p.message.id, p.message); break;
        case EVENTS.MessageDeleted: patchMessage(p.message.conversation_id, p.message.id, { deleted_at: p.message.deleted_at }); break;
        case EVENTS.MessageReactionAdded: patchMessage(p.message.conversation_id, p.message.id, { reactions: p.message.reactions }); break;
        case EVENTS.UserTyping: {
          const key = `${p.conversation_id}:${p.user_id}`;
          set((s) => ({ typing: { ...s.typing, [p.conversation_id]: { ...s.typing[p.conversation_id], [p.user_id]: true } } }));
          clearTimeout(typingTimers[key]);
          typingTimers[key] = setTimeout(() => get().applyEvent(EVENTS.UserStoppedTyping, p), 6000); // safety net if "stopped" never arrives
          break;
        }
        case EVENTS.UserStoppedTyping:
          set((s) => { const { [p.user_id]: _gone, ...rest } = s.typing[p.conversation_id] ?? {}; return { typing: { ...s.typing, [p.conversation_id]: rest } }; });
          break;
        default: break;
      }
    },
    reset: () => set({ conversations: [], listStatus: 'idle', activeId: null, messages: {}, typing: {} }),
  };
});
