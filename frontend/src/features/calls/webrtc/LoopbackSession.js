/**
 * Development stand-in used with the mock backend (no second browser to talk to). Same interface as PeerSession;
 * it opens the real camera/microphone when available and plays your own video back as the "remote" stream.
 */
export class LoopbackSession {
  constructor({ onRemoteStream, onConnectionState }) { this.onRemoteStream = onRemoteStream; this.onConnectionState = onConnectionState; this.local = null; this.kind = 'voice'; }

  async openMedia(kind) {
    this.kind = kind;
    try { this.local = await navigator.mediaDevices.getUserMedia({ audio: true, video: kind === 'video' }); } catch { this.local = null; }
    this.cameraTrack = this.local?.getVideoTracks()[0] ?? null;
    return this.local;
  }

  #connect() { setTimeout(() => { if (this.kind === 'video' && this.local) this.onRemoteStream(this.local); this.onConnectionState('connected'); }, 400); }
  async createOffer() { return 'mock-offer'; }
  async acceptOffer() { this.#connect(); return 'mock-answer'; }
  async setAnswer() { this.#connect(); }
  async addIce() {}
  setMuted(muted) { this.local?.getAudioTracks().forEach((t) => { t.enabled = !muted; }); }
  setCameraOn(on) { if (this.cameraTrack) this.cameraTrack.enabled = on; }
  async switchCamera() {}
  async startScreenShare() { return this.kind === 'video'; }
  async stopScreenShare() {}
  close() { this.local?.getTracks().forEach((t) => t.stop()); }
}
