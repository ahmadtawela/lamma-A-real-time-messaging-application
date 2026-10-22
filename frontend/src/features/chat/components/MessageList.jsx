import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLanguage } from '@/shared/context/LanguageProvider';
import { dayKey } from '@/shared/i18n/format';
import Button from '@/shared/ui/Button';
import { ErrorState } from '@/shared/ui/States';
import Message from '@/features/chat/components/Message';

/**
 * Infinite scroll upwards: an IntersectionObserver sentinel at the top loads the previous page and the scroll
 * position is restored so the view doesn't jump. Rows use content-visibility:auto, so thousands of rows stay cheap.
 */
export default function MessageList({ items, status, error, hasMore, onLoadOlder, onReload, meId, users, byId, isGroup, selectMode, selected, starred, query, onAction, onSelect }) {
  const { t, formatDay } = useLanguage();
  const box = useRef(null); const top = useRef(null); const bottom = useRef(null);
  const prev = useRef({ height: 0, lastId: null, count: 0 });
  const lastId = items.at(-1)?.id;

  useLayoutEffect(() => {
    const el = box.current; if (!el) return;
    const p = prev.current;
    if (items.length > p.count && p.count && items[0]?.id !== p.firstId && p.lastId === lastId) el.scrollTop += el.scrollHeight - p.height; // older page prepended
    else if (lastId !== p.lastId) bottom.current?.scrollIntoView({ block: 'end' });                                                         // new message
    prev.current = { height: el.scrollHeight, lastId, count: items.length, firstId: items[0]?.id };
  }, [items, lastId]);

  useEffect(() => {
    if (!hasMore || status === 'loading' || !top.current) return undefined;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && onLoadOlder(), { root: box.current, rootMargin: '120px' });
    io.observe(top.current); return () => io.disconnect();
  }, [hasMore, status, onLoadOlder, items.length]);

  const jump = (id) => { const el = document.getElementById(`msg-${id}`); el?.scrollIntoView({ block: 'center', behavior: 'smooth' }); el?.classList.add('ring-2', 'ring-accent'); setTimeout(() => el?.classList.remove('ring-2', 'ring-accent'), 1400); };
  let lastDay = null;

  return (
    <div ref={box} className="min-h-0 flex-1 space-y-1.5 overflow-y-auto bg-bg p-3" data-wallpaper aria-live="polite" aria-busy={status === 'loading'}>
      <div ref={top} />
      {hasMore && items.length > 0 && <div className="py-1 text-center"><Button size="sm" variant="ghost" loading={status === 'loading'} onClick={onLoadOlder}>{t('chat.loadOlder')}</Button></div>}
      {status === 'loading' && items.length === 0 && [0, 1, 2, 3].map((i) => <div key={i} className={`lm-skeleton h-12 w-2/3 rounded-xl sm:w-1/2 ${i % 2 ? 'ms-auto' : ''}`} />)}
      {status === 'error' && items.length === 0 && <ErrorState error={error} onRetry={onReload} />}
      {status === 'ready' && items.length === 0 && <p className="p-8 text-center text-sm text-text-2">{t('chat.noMessages')}</p>}
      {items.map((m) => {
        const k = dayKey(m.created_at); const sep = k !== lastDay; lastDay = k;
        const original = m.reply_to_id ? byId[m.reply_to_id] : null;
        return (
          <div key={m.client_id ?? m.id}>
            {sep && <div className="my-3 text-center"><span className="rounded-full bg-surface px-3 py-1 text-xs text-text-2 shadow-sm">{formatDay(m.created_at)}</span></div>}
            <Message message={m} mine={m.sender_id === meId} meId={meId} sender={users[m.sender_id]} isGroup={isGroup} original={original} originalSender={original && users[original.sender_id]}
              selectMode={selectMode} selected={selected.has(m.id)} starred={starred.includes(m.id)} query={query} onAction={onAction} onSelect={onSelect} onJump={jump} />
          </div>
        );
      })}
      <div ref={bottom} />
    </div>
  );
}
