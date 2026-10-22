import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));

/**
 * Floating panel rendered in a PORTAL on <body> (so it is never clipped by a scrolling/overflow:hidden parent),
 * positioned against `anchorRef` with flip-to-top when there's no room below, clamped inside the viewport,
 * direction-aware (RTL) and repositioned on scroll/resize. Closes on outside click / Escape.
 */
export default function Popover({ open, onClose, anchorRef, align = 'end', children, className = '', label, role = 'dialog' }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);

  const place = useCallback(() => {
    const anchor = anchorRef.current?.getBoundingClientRect(); const el = ref.current;
    if (!anchor || !el) return;
    const rtl = document.documentElement.dir === 'rtl';
    const gap = 6; const pad = 8; const w = el.offsetWidth; const h = el.scrollHeight;
    const alignEnd = align === 'end' ? !rtl : rtl;                       // "end" = the side where text ends in the current direction
    const left = clamp(alignEnd ? anchor.right - w : anchor.left, pad, window.innerWidth - w - pad);
    const below = window.innerHeight - anchor.bottom - gap - pad; const above = anchor.top - gap - pad;
    if (below >= h || below >= above) setPos({ left, top: anchor.bottom + gap, maxHeight: Math.max(120, below) });
    else { const height = Math.min(h, above); setPos({ left, top: anchor.top - gap - height, maxHeight: Math.max(120, above) }); }
  }, [anchorRef, align]);

  useLayoutEffect(() => { if (open) place(); }, [open, place, children]);

  useEffect(() => {
    if (!open) return undefined;
    const outside = (e) => { if (!ref.current?.contains(e.target) && !anchorRef.current?.contains(e.target)) onClose(); };
    const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); anchorRef.current?.focus?.(); } };
    const reflow = (e) => { if (!ref.current?.contains(e.target)) place(); };   // scrolling the page moves the anchor; scrolling inside the panel must not
    document.addEventListener('mousedown', outside); document.addEventListener('touchstart', outside); document.addEventListener('keydown', key);
    window.addEventListener('resize', place); window.addEventListener('scroll', reflow, true);
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('touchstart', outside); document.removeEventListener('keydown', key); window.removeEventListener('resize', place); window.removeEventListener('scroll', reflow, true); };
  }, [open, onClose, place, anchorRef]);

  if (!open) return null;
  return createPortal(
    <div ref={ref} role={role} aria-label={label} style={{ position: 'fixed', top: pos?.top ?? 0, left: pos?.left ?? 0, maxHeight: pos?.maxHeight, visibility: pos ? 'visible' : 'hidden' }}
      className={`lm-pop z-[70] overflow-y-auto overscroll-contain rounded-xl border border-border bg-surface text-text-1 shadow-xl ${className}`}>
      {children}
    </div>,
    document.body
  );
}
