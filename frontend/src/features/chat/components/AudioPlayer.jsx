import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';

const BARS = 32;
/** Real <audio> when the source is playable (blob:/http); otherwise a timed simulation so mock data still demos. */
export default function AudioPlayer({ src, duration = 10, waveform, tone = 'in' }) {
  const { t, formatDuration } = useLanguage();
  const audio = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [real, setReal] = useState(/^(blob:|https?:)/.test(src ?? ''));
  const bars = waveform?.length ? waveform : Array.from({ length: BARS }, (_, i) => 30 + ((i * 37) % 60));

  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(() => {
      if (real && audio.current) { setPos(audio.current.currentTime); }
      else setPos((p) => (p + 0.2 >= duration ? (setPlaying(false), 0) : p + 0.2));
    }, 200);
    return () => clearInterval(id);
  }, [playing, real, duration]);

  const toggle = () => {
    if (real && audio.current) {
      if (playing) audio.current.pause(); else audio.current.play().catch(() => setReal(false));
    }
    setPlaying((p) => !p);
  };
  const seek = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    let ratio = (e.clientX - r.left) / r.width;
    if (document.dir === 'rtl') ratio = 1 - ratio;
    const to = Math.max(0, Math.min(1, ratio)) * duration;
    setPos(to); if (real && audio.current) audio.current.currentTime = to;
  };
  const active = tone === 'out' ? 'bg-white' : 'bg-accent';
  const idle = tone === 'out' ? 'bg-white/40' : 'bg-border';
  return (
    <div className="flex w-56 items-center gap-2">
      {real && <audio ref={audio} src={src} preload="metadata" onEnded={() => { setPlaying(false); setPos(0); }} onError={() => setReal(false)} />}
      <button onClick={toggle} aria-label={t(playing ? 'chat.pause' : 'chat.play')} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/10 hover:bg-black/20">
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 rtl:-scale-x-100" />}
      </button>
      <div className="min-w-0 flex-1">
        <div role="slider" tabIndex={0} aria-label={t('chat.progress')} aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(pos)} onClick={seek}
          onKeyDown={(e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') setPos((p) => Math.max(0, Math.min(duration, p + (e.key === 'ArrowRight' ? 1 : -1)))); }}
          className="flex h-8 cursor-pointer items-center gap-px" dir="ltr">
          {bars.map((h, i) => <span key={i} style={{ height: `${Math.max(12, h)}%` }} className={`w-1 flex-1 rounded-full ${i / bars.length <= pos / duration ? active : idle}`} />)}
        </div>
        <bdi className="text-[11px] opacity-75">{formatDuration(playing || pos ? pos : duration)}</bdi>
      </div>
    </div>
  );
}
