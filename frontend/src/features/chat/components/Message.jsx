import { memo } from 'react';
import { Check, CheckCheck, Clock, AlertCircle, CornerUpLeft, CornerUpRight, Copy, Pencil, Pin, PinOff, Star, Trash2, Flag, MoreHorizontal, Forward } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';
import Menu from '@/shared/ui/Menu';
import ReactionPicker from '@/features/chat/components/ReactionPicker';
import Avatar from '@/shared/ui/Avatar';
import { TextMessage, ImageMessage, VideoMessage, VoiceMessage, FileMessage, LocationMessage, ContactMessage, PollMessage, SystemMessage, ReplyPreview } from '@/features/chat/components/MessageTypes';

function Body({ message, mine, query, onVote, meId }) {
  switch (message.type) {
    case 'image': return <ImageMessage message={message} />;
    case 'video': return <VideoMessage message={message} />;
    case 'voice': case 'audio': return <VoiceMessage message={message} mine={mine} />;
    case 'file': return <FileMessage message={message} />;
    case 'location': return <LocationMessage message={message} />;
    case 'contact': return <ContactMessage message={message} />;
    case 'poll': return <PollMessage message={message} onVote={onVote} meId={meId} />;
    case 'sticker': case 'gif': return <p className="text-6xl leading-none">{message.body}</p>;
    default: return <TextMessage message={message} query={query} />;
  }
}

/** One message row. Alignment uses start/end (not left/right) so RTL mirrors automatically. */
function Message({ message, mine, meId, sender, isGroup, original, originalSender, selectMode, selected, starred, query, onAction, onSelect, onJump }) {
  const { t, formatTime } = useLanguage();
  if (message.type === 'system') return <SystemMessage message={message} senderName={sender?.name} />;
  const deleted = !!message.deleted_at;
  const status = message.failed ? 'failed' : message.pending ? 'pending' : message.read_at ? 'read' : message.delivered_at ? 'delivered' : 'sent';
  const StatusIcon = { failed: AlertCircle, pending: Clock, read: CheckCheck, delivered: CheckCheck, sent: Check }[status];
  const act = (a) => () => onAction(a, message);
  const menu = [
    { label: t('chat.reply'), icon: CornerUpLeft, onClick: act('reply') },
    { label: t('chat.forward'), icon: CornerUpRight, onClick: act('forward') },
    { label: t('chat.copy'), icon: Copy, onClick: act('copy'), hidden: !message.body },
    { label: t(starred ? 'chat.unstar' : 'chat.star'), icon: Star, onClick: act('star') },
    { label: t(message.pinned_at ? 'chat.unpin' : 'chat.pin'), icon: message.pinned_at ? PinOff : Pin, onClick: act('pin') },
    { label: t('chat.edit'), icon: Pencil, onClick: act('edit'), hidden: !mine || message.type !== 'text' },
    { label: t('chat.select'), icon: Check, onClick: act('select') },
    { label: t('chat.report'), icon: Flag, onClick: act('report'), hidden: mine },
    { label: t('chat.delete'), icon: Trash2, onClick: act('delete'), danger: true, hidden: !mine },
  ];
  return (
    <div id={`msg-${message.id}`} data-msg className={`group flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''} ${selected ? 'bg-accent/10' : ''}`} style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 56px' }}
      onClick={selectMode ? () => onSelect(message.id) : undefined}>
      {selectMode && <input type="checkbox" readOnly checked={selected} aria-label={t('chat.select')} className="mx-2 accent-[var(--accent)]" />}
      {isGroup && !mine && <Avatar name={sender?.name ?? '?'} size="sm" />}
      <div className={`flex max-w-[80%] items-start gap-1 ${mine ? 'flex-row-reverse' : ''}`}>
        <div className={`lm-pop rounded-xl px-3 py-2 shadow-sm ${mine ? 'rounded-ee-sm bg-msg-out text-msg-out-fg' : 'rounded-es-sm border border-border bg-msg-in text-msg-in-fg'}`}>
          {isGroup && !mine && <bdi className="mb-0.5 block text-xs font-semibold text-accent">{sender?.name}</bdi>}
          {message.meta?.forwarded && <p className="mb-1 flex items-center gap-1 text-xs italic opacity-75"><Forward className="h-3 w-3 rtl:-scale-x-100" aria-hidden />{t('chat.forwarded')}</p>}
          {message.reply_to_id && <ReplyPreview original={original} senderName={originalSender?.name} tone={mine ? 'out' : 'in'} onJump={() => onJump(message.reply_to_id)} />}
          {deleted ? <p className="text-sm italic opacity-70">{t('chat.deleted')}</p> : (
            <>
              <Body message={message} mine={mine} query={query} meId={meId} onVote={(o) => onAction('vote', message, o)} />
              {message.reactions?.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">{message.reactions.map((r) => (
                  <button key={r.emoji} onClick={() => onAction('react', message, r.emoji)} aria-label={`${r.emoji} ${r.user_ids.length}`}
                    className={`rounded-full px-1.5 text-xs ${r.user_ids.includes(meId) ? 'bg-white/30 ring-1 ring-current' : 'bg-black/10'}`}>{r.emoji} {r.user_ids.length}</button>
                ))}</div>
              )}
            </>
          )}
          <div className="mt-1 flex items-center justify-end gap-1 text-[11px] opacity-75">
            {message.pinned_at && <Pin className="h-3 w-3" aria-label={t('chat.pin')} />}
            {starred && <Star className="h-3 w-3 fill-current" aria-label={t('chat.star')} />}
            {message.updated_at && !deleted && <span>{t('chat.edited')}</span>}
            <bdi>{formatTime(message.created_at)}</bdi>
            {mine && (
              <button type="button" disabled={status !== 'failed'} onClick={() => onAction('retry', message)} aria-label={status === 'failed' ? t('chat.failed') : t(`chat.${status}`)} className="inline-flex">
                <StatusIcon className={`h-3.5 w-3.5 ${status === 'failed' ? 'text-danger' : status === 'read' ? 'text-sky-300' : ''}`} />
              </button>
            )}
          </div>
        </div>
        {!selectMode && !deleted && !message.pending && (
          <div className="flex items-center opacity-100 md:opacity-0 md:transition md:group-focus-within:opacity-100 md:group-hover:opacity-100">
            <ReactionPicker align={mine ? 'start' : 'end'} onPick={(e) => onAction('react', message, e)} />
            <Menu label={t('chat.more')} trigger={<MoreHorizontal className="h-4 w-4" />} align={mine ? 'start' : 'end'} items={menu} />
          </div>
        )}
      </div>
    </div>
  );
}
export default memo(Message);
