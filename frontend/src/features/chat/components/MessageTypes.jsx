import { File as FileIcon, FileText, Download, ExternalLink, MapPin, User as UserIcon, BarChart3, Link2, MessageSquarePlus } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';
import { useUiStore } from '@/shared/store/uiStore';
import { domainOf, findUrls, highlight, isEmojiOnly } from '@/features/chat/lib/text';
import { useLinkPreview } from '@/features/chat/hooks/useLinkPreview';
import AudioPlayer from '@/features/chat/components/AudioPlayer';

export function TextMessage({ message, query }) {
  const body = message.body ?? '';
  if (isEmojiOnly(body)) return <p className="text-4xl leading-tight">{body}</p>;
  return (
    <>
      <p dir="auto" className="whitespace-pre-wrap break-words text-start">
        {highlight(body, query).map((s, i) => s.match ? <mark key={i} className="rounded bg-warning/40 px-0.5 text-inherit">{s.text}</mark> : <span key={i}>{s.text}</span>)}
      </p>
      {findUrls(body).slice(0, 1).map((u) => <LinkPreview key={u} url={u} />)}
    </>
  );
}

/** Link preview card. The preview comes from GET /api/link-preview (the server fetches the page, never the browser). Falls back to a domain chip. */
export function LinkPreview({ url }) {
  const { status, preview } = useLinkPreview(url);
  if (status === 'ready' && preview) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 block overflow-hidden rounded-lg bg-black/10 text-sm hover:bg-black/15">
        {preview.image && <img src={preview.image} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-32 w-full object-cover" />}
        <span className="block p-2">
          <bdi className="block text-xs opacity-70" dir="ltr">{preview.site_name ?? preview.domain}</bdi>
          {preview.title && <bdi className="block font-semibold leading-snug">{preview.title}</bdi>}
          {preview.description && <bdi className="line-clamp-2 text-xs opacity-80">{preview.description}</bdi>}
        </span>
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={`mt-2 flex items-center gap-2 rounded-lg bg-black/10 p-2 text-sm hover:bg-black/15 ${status === 'loading' ? 'animate-pulse' : ''}`}>
      <Link2 className="h-4 w-4 shrink-0" aria-hidden /><span className="min-w-0 truncate" dir="ltr">{domainOf(url)}</span><ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
    </a>
  );
}

export function ImageMessage({ message }) {
  const setViewer = useUiStore((s) => s.setViewer);
  const images = message.attachments.filter((a) => a.mime?.startsWith('image/'));
  return (
    <div className={`grid gap-1 ${images.length > 1 ? 'grid-cols-2' : ''}`}>
      {images.map((a, i) => (
        <button key={a.id} onClick={() => setViewer({ items: images, index: i })} className="block overflow-hidden rounded-lg" aria-label={a.name}>
          <img src={a.url} alt={a.name} loading="lazy" decoding="async" className="max-h-60 w-full object-cover" />
        </button>
      ))}
      {message.body && <p dir="auto" className="col-span-full mt-1 whitespace-pre-wrap break-words text-start">{message.body}</p>}
    </div>
  );
}

export function VideoMessage({ message }) {
  const a = message.attachments[0];
  return <div><video src={a?.url} controls preload="none" className="max-h-60 w-full rounded-lg bg-black" />{message.body && <p dir="auto" className="mt-1 text-start">{message.body}</p>}</div>;
}

export function VoiceMessage({ message, mine }) {
  const a = message.attachments[0];
  return <AudioPlayer src={a?.url} duration={a?.duration ?? 10} waveform={a?.waveform} tone={mine ? 'out' : 'in'} />;
}

export function FileMessage({ message }) {
  const { t, formatBytes } = useLanguage();
  const a = message.attachments[0];
  if (!a) return null;
  const real = a.url && a.url !== '#';
  return (
    <div className="flex w-60 items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-black/10">{/pdf/.test(a.mime) ? <FileText className="h-5 w-5" /> : <FileIcon className="h-5 w-5" />}</span>
      <span className="min-w-0 flex-1"><bdi className="block truncate text-sm font-medium">{a.name}</bdi><span className="text-xs opacity-75">{formatBytes(a.size)}</span></span>
      {real
        ? <a href={a.url} download={a.name} aria-label={t('chat.download')} className="rounded-full p-2 hover:bg-black/10"><Download className="h-4 w-4" /></a>
        : <button disabled aria-label={t('chat.download')} className="rounded-full p-2 opacity-50"><Download className="h-4 w-4" /></button>}
    </div>
  );
}

export function LocationMessage({ message }) {
  const { t } = useLanguage();
  const { lat, lng, label } = message.meta ?? {};
  return (
    <a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`} target="_blank" rel="noopener noreferrer" className="block w-56">
      <span className="grid h-24 place-items-center rounded-lg bg-black/10"><MapPin className="h-8 w-8" aria-hidden /></span>
      <span className="mt-1 block text-sm font-medium" dir="auto">{label}</span><span className="text-xs opacity-75">{t('chat.openMap')}</span>
    </a>
  );
}

export function ContactMessage({ message }) {
  const { t } = useLanguage();
  const { name, phone } = message.meta ?? {};
  return (
    <div className="flex w-56 items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-black/10"><UserIcon className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1"><bdi className="block truncate text-sm font-medium">{name}</bdi><bdi className="text-xs opacity-75" dir="ltr">{phone}</bdi></span>
      <MessageSquarePlus className="h-4 w-4 opacity-70" aria-label={t('chat.typeContact')} />
    </div>
  );
}

export function PollMessage({ message, onVote, meId }) {
  const { t, formatNumber } = useLanguage();
  const { question, options = [] } = message.meta ?? {};
  const total = options.reduce((n, o) => n + o.votes.length, 0);
  return (
    <div className="w-64">
      <p className="mb-2 flex items-center gap-2 font-medium" dir="auto"><BarChart3 className="h-4 w-4 shrink-0" aria-hidden />{question}</p>
      <div className="space-y-1.5">
        {options.map((o) => {
          const mine = o.votes.includes(meId);
          const pct = total ? Math.round((o.votes.length / total) * 100) : 0;
          return (
            <button key={o.id} onClick={() => onVote?.(o.id)} aria-pressed={mine} className="relative block w-full overflow-hidden rounded-lg border border-current/20 px-3 py-1.5 text-start text-sm">
              <span className="absolute inset-y-0 start-0 bg-current opacity-15" style={{ width: `${pct}%` }} />
              <span className="relative flex justify-between gap-2"><bdi>{mine ? '✓ ' : ''}{o.text}</bdi><span>{formatNumber(o.votes.length)}</span></span>
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-xs opacity-75">{t('chat.pollVotes', { count: total })}</p>
    </div>
  );
}

export function SystemMessage({ message, senderName }) {
  const { t } = useLanguage();
  const text = { group_created: t('chat.sysCreated', { name: senderName }), joined: t('chat.sysJoined', { name: senderName }), left: t('chat.sysLeft', { name: senderName }) }[message.body] ?? message.body;
  return <div className="my-1 text-center"><span className="rounded-full bg-surface-2 px-3 py-1 text-xs text-text-2">{text}</span></div>;
}

export function ReplyPreview({ original, senderName, onJump, tone }) {
  const { t } = useLanguage();
  return (
    <button type="button" onClick={onJump} className={`mb-1 block w-full rounded-lg border-s-4 bg-black/10 px-2 py-1 text-start text-xs ${tone === 'out' ? 'border-white/70' : 'border-accent'}`}>
      <bdi className="block font-semibold">{senderName}</bdi>
      <bdi className="block truncate opacity-80">{original ? (original.deleted_at ? t('chat.deleted') : original.body || t(`chat.type${original.type[0].toUpperCase()}${original.type.slice(1)}`)) : t('chat.originalUnavailable')}</bdi>
    </button>
  );
}
