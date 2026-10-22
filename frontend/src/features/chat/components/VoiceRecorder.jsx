import { useEffect, useRef, useState } from 'react';
import { Mic, Send, Trash2, Square, Loader2, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';
import Button from '@/shared/ui/Button';
import AudioPlayer from '@/features/chat/components/AudioPlayer';

const BARS = 36;
/**
 * Voice recording. Uses MediaRecorder + AnalyserNode when the microphone is available; otherwise it falls back to a
 * simulated recording so the prototype works anywhere. States: recording -> preview -> processing/sending -> sent.
 * onSend({ file, duration, waveform }) must resolve once the message is sent.
 */
export default function VoiceRecorder({ onSend, onCancel }) {
  const { t, formatDuration } = useLanguage();
  const [phase, setPhase] = useState('recording');
  const [seconds, setSeconds] = useState(0);
  const [levels, setLevels] = useState(() => Array(BARS).fill(8));
  const [result, setResult] = useState(null);
  const refs = useRef({ chunks: [], levels: [], stream: null, rec: null, raf: 0, ctx: null });

  useEffect(() => {
    const r = refs.current; let alive = true; let tick; let sim;
    (async () => {
      try {
        r.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        r.rec = new MediaRecorder(r.stream);
        r.rec.ondataavailable = (e) => e.data.size && r.chunks.push(e.data);
        r.ctx = new AudioContext(); const an = r.ctx.createAnalyser(); an.fftSize = 64;
        r.ctx.createMediaStreamSource(r.stream).connect(an);
        const buf = new Uint8Array(an.frequencyBinCount);
        const loop = () => { an.getByteFrequencyData(buf); const v = Math.max(8, (buf.reduce((a, b) => a + b, 0) / buf.length / 255) * 160); r.levels.push(v); setLevels((l) => [...l.slice(1), v]); r.raf = requestAnimationFrame(loop); };
        r.rec.start(); loop();
      } catch { // no microphone / permission denied -> simulate
        r.simulated = true;
        sim = setInterval(() => { const v = 10 + Math.random() * 80; r.levels.push(v); setLevels((l) => [...l.slice(1), v]); }, 120);
      }
      if (alive) tick = setInterval(() => setSeconds((s) => s + 1), 1000);
    })();
    return () => { alive = false; clearInterval(tick); clearInterval(sim); cancelAnimationFrame(r.raf); r.stream?.getTracks().forEach((x) => x.stop()); r.ctx?.close?.().catch(() => {}); };
  }, []);

  const finish = async () => {
    const r = refs.current; clearInterval(0); cancelAnimationFrame(r.raf);
    setPhase('processing');
    const blob = await new Promise((resolve) => {
      if (!r.rec || r.rec.state === 'inactive') return resolve(new Blob(r.chunks, { type: 'audio/webm' }));
      r.rec.onstop = () => resolve(new Blob(r.chunks, { type: 'audio/webm' }));
      r.rec.stop();
    });
    r.stream?.getTracks().forEach((x) => x.stop());
    const step = Math.max(1, Math.floor(r.levels.length / 32));
    const waveform = Array.from({ length: 32 }, (_, i) => Math.round(Math.min(100, r.levels[i * step] ?? 10)));
    const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
    setResult({ file, duration: Math.max(1, seconds), waveform, url: blob.size ? URL.createObjectURL(blob) : '#' });
    setPhase('preview');
  };
  const send = async () => { setPhase('sending'); try { await onSend(result); setPhase('sent'); } catch { setPhase('preview'); } };

  if (phase === 'recording') return (
    <div className="flex items-center gap-3 p-3" role="status" aria-live="polite">
      <button onClick={onCancel} aria-label={t('common.cancel')} className="rounded-full p-2 text-danger hover:bg-surface-2"><Trash2 className="h-5 w-5" /></button>
      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-danger" aria-hidden />
      <span className="w-12 tabular-nums"><bdi>{formatDuration(seconds)}</bdi></span>
      <div className="flex h-8 flex-1 items-center gap-px" dir="ltr" aria-hidden>{levels.map((h, i) => <span key={i} style={{ height: `${h}%` }} className="w-1 flex-1 rounded-full bg-accent" />)}</div>
      <span className="hidden text-sm text-text-2 sm:inline">{t('chat.recordingState')}</span>
      <Button onClick={finish} aria-label={t('chat.stopRecording')}><Square className="h-4 w-4 fill-current" /></Button>
    </div>
  );
  return (
    <div className="flex items-center gap-3 p-3" role="status" aria-live="polite">
      <button onClick={onCancel} disabled={phase !== 'preview'} aria-label={t('common.cancel')} className="rounded-full p-2 text-danger hover:bg-surface-2 disabled:opacity-40"><Trash2 className="h-5 w-5" /></button>
      <div className="flex-1">{phase === 'preview' && result ? <AudioPlayer src={result.url} duration={result.duration} waveform={result.waveform} /> : (
        <span className="flex items-center gap-2 text-sm text-text-2">
          {phase === 'sent' ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Loader2 className="h-4 w-4 animate-spin" />}{t(`chat.voice_${phase}`)}</span>)}</div>
      <Button onClick={send} disabled={phase !== 'preview'} aria-label={t('chat.send')}><Send className="h-4 w-4 rtl:-scale-x-100" /></Button>
    </div>
  );
}
export const MicIcon = Mic;
