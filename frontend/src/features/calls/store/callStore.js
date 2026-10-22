import { create } from 'zustand';
import { callService } from '@/features/calls/services/callService';
import { createSession, webrtcSupported } from '@/features/calls/webrtc';

/**
 * Call state machine. phase: outgoing → connecting → active → ended | incoming → connecting → active → ended | missed
 * Media objects (RTCPeerConnection, streams) live OUTSIDE the zustand state (they are not serialisable);
 * components read streams through getStreams() and re-render when `streamVersion` changes.
 */
const RING_MS = 60_000;
let session = null;
let timers = [];
let iceCache = null;
let pendingIce = [];                        // our candidates produced before the call id is known (caller side)
const streams = { local: null, remote: null };
export const getStreams = () => streams;

const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
const reasonOf = (e) => (e?.status === 409 && e?.code !== 'busy' ? 'busy' : e?.name === 'NotAllowedError' ? 'permission' : e?.name === 'NotFoundError' ? 'no_device' : 'failed');

export const useCallStore = create((set, get) => {
  const patch = (p) => set((s) => (s.call ? { call: { ...s.call, ...p } } : s));
  const bump = () => set((s) => ({ streamVersion: s.streamVersion + 1 }));

  async function iceServers() {
    if (iceCache && iceCache.expires > Date.now()) return iceCache.servers;
    try { const { ice_servers: servers, ttl } = await callService.iceServers(); iceCache = { servers, expires: Date.now() + ttl * 800 }; return servers; }
    catch { return [{ urls: ['stun:stun.l.google.com:19302'] }]; }
  }

  async function makeSession(kind) {
    session = createSession({
      iceServers: await iceServers(),
      onIceCandidate: (c) => { const id = get().call?.id; if (id) callService.sendIce(id, c).catch(() => {}); else pendingIce.push(c); },
      onRemoteStream: (s) => { streams.remote = s; bump(); },
      onConnectionState: (state) => {
        if (state === 'connected') { patch({ phase: 'active', startedAt: get().call?.startedAt ?? Date.now() }); clearTimers(); }
        else if (state === 'failed') get().hangUp('failed');
      },
    });
    streams.local = await session.openMedia(kind);
    bump();
  }

  function cleanup() {
    clearTimers(); pendingIce = [];
    session?.close(); session = null; streams.local = null; streams.remote = null; bump();
  }

  /** Shows the final state for a moment, then clears the overlay. */
  function finish(phase, extra = {}) {
    const c = get().call; if (!c) return;
    cleanup();
    const duration = c.startedAt ? Math.round((Date.now() - c.startedAt) / 1000) : 0;
    set({ call: { ...c, phase, duration, ...extra } });
    later(() => set({ call: null }), 2800);
    get().loadHistory();
  }

  return {
    call: null, streamVersion: 0, history: [], historyStatus: 'idle',

    async loadHistory() {
      set({ historyStatus: get().history.length ? 'ready' : 'loading' });
      try { set({ history: (await callService.history()).data, historyStatus: 'ready' }); } catch { set({ historyStatus: 'error' }); }
    },

    async startCall(peer, kind = 'voice') {
      if (get().call) return;
      if (!webrtcSupported()) { set({ call: { peer, kind, direction: 'outgoing', phase: 'ended', reason: 'unsupported' } }); later(() => set({ call: null }), 2800); return; }
      set({ call: { id: null, peer, kind, direction: 'outgoing', phase: 'outgoing', muted: false, speaker: true, camera: kind === 'video', screen: false, startedAt: null } });
      try {
        await makeSession(kind);
        const sdp = await session.createOffer();
        const { id } = await callService.start({ calleeId: peer.id, kind, sdp });
        patch({ id });
        pendingIce.splice(0).forEach((c) => callService.sendIce(id, c).catch(() => {}));
        later(() => get().call?.phase === 'outgoing' && get().hangUp('no_answer'), RING_MS);
      } catch (e) { finish('ended', { reason: e?.response?.data?.reason ?? e?.reason ?? reasonOf(e) }); }
    },

    /** Called for CallIncoming (realtime) and for a pending call fetched on reconnect. */
    receiveIncoming(payload) {
      const { id, kind, offer, caller } = payload;
      const cur = get().call;
      if (cur) { if (cur.id !== id) callService.decline(id, 'busy').catch(() => {}); return; }
      set({ call: { id, peer: caller, kind, direction: 'incoming', phase: 'incoming', offer, muted: false, speaker: true, camera: kind === 'video', screen: false, startedAt: null } });
      later(() => get().call?.phase === 'incoming' && finish('missed'), RING_MS);
    },
    async checkPending() { try { const p = await callService.pending(); if (p) get().receiveIncoming(p); } catch { /* offline */ } },

    async accept() {
      const c = get().call; if (c?.phase !== 'incoming') return;
      patch({ phase: 'connecting' }); clearTimers();
      try {
        await makeSession(c.kind);
        const answer = await session.acceptOffer(c.offer);
        await callService.answer(c.id, answer);
      } catch (e) { callService.decline(c.id).catch(() => {}); finish('ended', { reason: reasonOf(e) }); }
    },
    decline() { const c = get().call; if (!c) return; callService.decline(c.id).catch(() => {}); finish('ended', { reason: 'declined_by_me' }); },

    async hangUp(reason = 'ended') {
      const c = get().call; if (!c || ['ended', 'missed'].includes(c.phase)) return;
      if (c.id) callService.end(c.id).catch(() => {});
      finish('ended', { reason });
    },

    /** Realtime events from the server (Reverb) or the mock server. */
    async applyEvent(event, p) {
      const c = get().call;
      if (event === 'CallIncoming') return get().receiveIncoming(p.call);
      if (!c || c.id !== p.call_id) return undefined;
      if (event === 'CallAnswered') { patch({ phase: 'connecting' }); try { await session?.setAnswer(p.sdp); } catch { get().hangUp('failed'); } }
      else if (event === 'CallIce') await session?.addIce(p.candidate);
      else if (event === 'CallEnded') finish(p.reason === 'missed' ? 'missed' : 'ended', { reason: p.reason });
      return undefined;
    },

    toggleMute() { const m = !get().call.muted; session?.setMuted(m); patch({ muted: m }); },
    toggleSpeaker() { patch({ speaker: !get().call.speaker }); },
    toggleCamera() { const on = !get().call.camera; session?.setCameraOn(on); patch({ camera: on }); },
    async switchCamera() { try { await session?.switchCamera(); bump(); } catch { /* single camera */ } },
    async toggleScreen() {
      const c = get().call;
      if (c.screen) { await session?.stopScreenShare(); patch({ screen: false }); return; }
      try { if (await session?.startScreenShare(() => patch({ screen: false }))) patch({ screen: true }); } catch { /* user cancelled the picker */ }
    },
  };
});
