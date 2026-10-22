import { env } from '@/config/env';
import { PeerSession } from './PeerSession';
import { LoopbackSession } from './LoopbackSession';

export const webrtcSupported = () => env.useMocks || (typeof RTCPeerConnection !== 'undefined' && !!navigator.mediaDevices?.getUserMedia);
export const createSession = (opts) => (env.useMocks ? new LoopbackSession(opts) : new PeerSession(opts));
