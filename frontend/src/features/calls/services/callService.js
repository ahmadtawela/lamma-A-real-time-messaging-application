import { http } from '@/shared/api/http';

/** HTTP side of the WebRTC signalling (the other half arrives as realtime events: CallIncoming, CallAnswered, CallIce, CallEnded). */
export const callService = {
  history: async () => (await http.get('/api/calls')).data,
  iceServers: async () => (await http.get('/api/calls/ice-servers')).data.data,          // { ice_servers, ttl }
  pending: async () => (await http.get('/api/calls/pending')).data.data,                 // a call that is ringing for me right now, or null
  start: async ({ calleeId, kind, sdp }) => (await http.post('/api/calls/start', { callee_id: calleeId, kind, sdp })).data.data,
  answer: (id, sdp) => http.post(`/api/calls/${id}/answer`, { sdp }),
  sendIce: (id, candidate) => http.post(`/api/calls/${id}/ice`, { candidate }),
  decline: (id, reason) => http.post(`/api/calls/${id}/decline`, { reason }),
  end: async (id) => (await http.post(`/api/calls/${id}/end`)).data.data,
};
