import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal. Focus is handled ONLY when it opens/closes (not on every render): moves focus to the first field (or the dialog),
 * keeps Tab inside, closes on Escape and gives the focus back to the element that opened it.
 */
export default function Modal({ open, onClose, title, children }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;                      // always the latest handler, without re-running the effect below
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const el = ref.current;
    (el?.querySelector('input:not([type=hidden]),textarea,select') ?? el)?.focus();       // once, on open
    const onKey = (e) => {
      if (e.key === 'Escape') { closeRef.current(); return; }
      if (e.key !== 'Tab' || !el) return;
      const items = [...el.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null || n === document.activeElement);
      if (!items.length) return;
      const first = items[0]; const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === el)) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus?.(); };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 grid place-items-end bg-black/50 p-0 sm:place-items-center sm:p-4" onMouseDown={() => closeRef.current()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}
        className="lm-pop max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-xl bg-surface p-5 shadow-xl outline-none sm:rounded-xl">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={() => closeRef.current()} aria-label={t('common.close')} className="rounded p-1 text-text-2 hover:bg-surface-2"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
