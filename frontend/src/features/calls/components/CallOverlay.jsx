import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Video, VideoOff, ScreenShare, PhoneOff, Phone, SwitchCamera } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';
import { useCallStore, getStreams } from '@/features/calls/store/callStore';
import Avatar from '@/shared/ui/Avatar';

function Ctl({ on, onClick, label, icon: Icon, danger, accept, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label} aria-pressed={on} title={label}
      className={`grid h-14 w-14 place-items-center rounded-full transition active:scale-95 disabled:opacity-40 ${danger ? 'bg-danger' : accept ? 'bg-success' : on ? 'bg-white text-black' : 'bg-white/15 hover:bg-white/25'}`}>
      <Icon className="h-6 w-6" />
    </button>
  );
}

/** Attaches a MediaStream to a <video>/<audio> element (srcObject can't be set through props). */
function useStream(ref, kind, version) {
  useEffect(() => { if (ref.current) ref.current.srcObject = getStreams()[kind]; }, [ref, kind, version]);
}

/** Full-screen call UI. The store owns the state machine and the WebRTC session; this component only renders it. */
export default function CallOverlay() {
  const { t, formatDuration } = useLanguage();
  const { call, streamVersion, accept, decline, hangUp, toggleMute, toggleSpeaker, toggleCamera, switchCamera, toggleScreen } = useCallStore();
  const [now, setNow] = useState(Date.now());
  const remoteVideo = useRef(null); const remoteAudio = useRef(null); const localVideo = useRef(null);
  useStream(remoteVideo, 'remote', streamVersion); useStream(remoteAudio, 'remote', streamVersion); useStream(localVideo, 'local', streamVersion);
  useEffect(() => { if (call?.phase !== 'active') return undefined; const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, [call?.phase]);
  if (!call) return null;

  const { phase, peer, kind } = call;
  const video = kind === 'video';
  const live = ['outgoing', 'connecting', 'active'].includes(phase);
  const ended = { busy: t('calls.busy'), declined: t('calls.declined'), declined_by_me: t('calls.ended'), no_answer: t('calls.noAnswer'), permission: t('calls.permissionDenied'), no_device: t('calls.noDevice'), unsupported: t('calls.unsupported'), failed: t('calls.failed') }[call.reason] ?? t('calls.ended');
  const label = { incoming: t(video ? 'calls.incomingVideo' : 'calls.incomingVoice'), outgoing: t('calls.calling'), connecting: t('calls.connecting'), active: formatDuration((now - call.startedAt) / 1000), ended, missed: t('calls.missedCall') }[phase];

  return (
    <div role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-[60] flex flex-col items-center justify-between overflow-hidden bg-gradient-to-b from-[#0d1020] via-[#1b1f55] to-[#2b1458] p-8 text-white">
      <audio ref={remoteAudio} autoPlay muted={!call.speaker} />
      {video && <video ref={remoteVideo} autoPlay playsInline muted className={`absolute inset-0 h-full w-full object-cover ${phase === 'active' ? '' : 'hidden'}`} />}
      {video && <video ref={localVideo} autoPlay playsInline muted className={`absolute end-4 top-4 z-10 h-36 w-24 rounded-xl bg-black/50 object-cover shadow-lg ${call.camera && phase !== 'incoming' ? '' : 'hidden'} ${call.screen ? '' : '-scale-x-100'}`} />}

      <div className="relative z-10 mt-12 text-center">
        {!(video && phase === 'active') && <div className="relative mx-auto w-fit"><Avatar name={peer.name} src={peer.avatar_url} size="lg" /><span className={`absolute -inset-3 rounded-full border-2 border-white/30 ${phase === 'incoming' || phase === 'outgoing' ? 'animate-ping' : ''}`} aria-hidden /></div>}
        <h2 dir="auto" className="mt-6 text-2xl font-bold drop-shadow">{peer.name}</h2>
        <p className="mt-1 text-white/80 drop-shadow" role="status" aria-live="polite"><bdi>{label}</bdi></p>
        {phase === 'ended' && call.duration > 0 && <p className="text-sm text-white/60"><bdi>{formatDuration(call.duration)}</bdi></p>}
      </div>

      <div className="relative z-10 mb-8">
        {phase === 'incoming' ? (
          <div className="flex gap-10"><Ctl danger icon={PhoneOff} label={t('calls.decline')} onClick={decline} /><Ctl accept icon={Phone} label={t('calls.accept')} onClick={accept} /></div>
        ) : live ? (
          <div className="flex flex-wrap justify-center gap-4">
            <Ctl on={call.muted} icon={call.muted ? MicOff : Mic} label={t('calls.mute')} onClick={toggleMute} />
            <Ctl on={!call.speaker} icon={call.speaker ? Volume2 : VolumeX} label={t('calls.speaker')} onClick={toggleSpeaker} />
            {video && <Ctl on={!call.camera} icon={call.camera ? Video : VideoOff} label={t('calls.camera')} onClick={toggleCamera} />}
            {video && <Ctl icon={SwitchCamera} label={t('calls.switchCamera')} onClick={switchCamera} />}
            {video && <Ctl on={call.screen} icon={ScreenShare} label={t('calls.screenShare')} onClick={toggleScreen} disabled={phase !== 'active'} />}
            <Ctl danger icon={PhoneOff} label={t('calls.end')} onClick={() => hangUp('ended')} />
          </div>
        ) : <div className="h-14" />}
      </div>
    </div>
  );
}
