/**
 * Thin wrapper around RTCPeerConnection. It knows nothing about HTTP, stores or React: the call store gives it
 * callbacks and moves SDP / ICE through the signalling service.
 *
 *   caller: openMedia → createOffer → (answer arrives) setAnswer
 *   callee: openMedia → acceptOffer(offer) → returns the answer
 *   both:   addIce(candidate) for every remote candidate, close() at the end
 */
export class PeerSession {
  constructor({ iceServers, onIceCandidate, onRemoteStream, onConnectionState }) {
    this.pc = new RTCPeerConnection({ iceServers, bundlePolicy: 'max-bundle' });
    this.local = null;
    this.remote = new MediaStream();
    this.cameraTrack = null;
    this.facing = 'user';
    this.queued = [];
    this.remoteReady = false;
    this.pc.onicecandidate = (e) => onIceCandidate(e.candidate ? e.candidate.toJSON() : { candidate: '' });   // '' = end of candidates
    this.pc.ontrack = (e) => { e.streams[0]?.getTracks().forEach((t) => this.remote.addTrack(t)); if (!e.streams[0]) this.remote.addTrack(e.track); onRemoteStream(this.remote); };
    this.pc.onconnectionstatechange = () => onConnectionState(this.pc.connectionState);
  }

  async openMedia(kind) {
    this.local = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: kind === 'video' ? { facingMode: this.facing, width: { ideal: 1280 }, height: { ideal: 720 } } : false,
    });
    this.cameraTrack = this.local.getVideoTracks()[0] ?? null;
    this.local.getTracks().forEach((t) => this.pc.addTrack(t, this.local));
    return this.local;
  }

  async createOffer() {
    await this.pc.setLocalDescription(await this.pc.createOffer());
    return this.pc.localDescription.sdp;
  }

  async acceptOffer(sdp) {
    await this.pc.setRemoteDescription({ type: 'offer', sdp });
    await this.#flush();
    await this.pc.setLocalDescription(await this.pc.createAnswer());
    return this.pc.localDescription.sdp;
  }

  async setAnswer(sdp) {
    await this.pc.setRemoteDescription({ type: 'answer', sdp });
    await this.#flush();
  }

  async addIce(candidate) {
    if (!this.remoteReady) { this.queued.push(candidate); return; }            // candidates can outrun the SDP
    try { await this.pc.addIceCandidate(candidate.candidate === '' ? null : candidate); } catch { /* stale candidate: ignore */ }
  }

  async #flush() {
    this.remoteReady = true;
    for (const c of this.queued.splice(0)) await this.addIce(c);
  }

  setMuted(muted) { this.local?.getAudioTracks().forEach((t) => { t.enabled = !muted; }); }
  setCameraOn(on) { if (this.cameraTrack) this.cameraTrack.enabled = on; }

  #videoSender() { return this.pc.getSenders().find((s) => s.track?.kind === 'video'); }

  async switchCamera() {
    if (!this.cameraTrack) return;
    this.facing = this.facing === 'user' ? 'environment' : 'user';
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: this.facing } });
    const track = stream.getVideoTracks()[0];
    await this.#videoSender()?.replaceTrack(track);
    this.cameraTrack.stop();
    this.local.removeTrack(this.cameraTrack); this.local.addTrack(track);
    this.cameraTrack = track;
  }

  /** Returns false when sharing is not possible (voice call / unsupported browser). onEnded fires when the user stops sharing from the browser UI. */
  async startScreenShare(onEnded) {
    const sender = this.#videoSender();
    if (!sender || !navigator.mediaDevices.getDisplayMedia) return false;
    this.screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const track = this.screen.getVideoTracks()[0];
    track.onended = () => { this.stopScreenShare(); onEnded?.(); };
    await sender.replaceTrack(track);
    return true;
  }

  async stopScreenShare() {
    this.screen?.getTracks().forEach((t) => t.stop());
    this.screen = null;
    if (this.cameraTrack) await this.#videoSender()?.replaceTrack(this.cameraTrack);
  }

  close() {
    this.local?.getTracks().forEach((t) => t.stop());
    this.screen?.getTracks().forEach((t) => t.stop());
    this.pc.onicecandidate = this.pc.ontrack = this.pc.onconnectionstatechange = null;
    this.pc.close();
  }
}
