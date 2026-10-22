import { useCallback, useEffect, useRef, useState } from 'react';
import Popover from './Popover';

/** items: [{ label, icon: Icon, onClick, danger, hidden }]. Rendered in a portal (never clipped); arrow keys / Home / End navigate. */
export default function Menu({ trigger, items, align = 'end', label, triggerClassName = '' }) {
  const [open, setOpen] = useState(false);
  const anchor = useRef(null); const list = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  const visible = items.filter((i) => !i.hidden);

  useEffect(() => { if (open) requestAnimationFrame(() => document.querySelector('[data-menu-open] [role=menuitem]')?.focus()); }, [open]);
  const onKey = (e) => {
    const els = [...e.currentTarget.querySelectorAll('[role=menuitem]')]; const i = els.indexOf(document.activeElement);
    const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: els.length - 1 }[e.key];
    if (to !== undefined) { els[(to + els.length) % els.length]?.focus(); e.preventDefault(); }
  };

  return (
    <>
      <button ref={anchor} type="button" aria-haspopup="menu" aria-expanded={open} aria-label={label} onClick={() => setOpen((o) => !o)}
        className={`rounded-lg p-2 text-text-2 hover:bg-surface-2 hover:text-text-1 ${triggerClassName}`}>{trigger}</button>
      <Popover open={open} onClose={close} anchorRef={anchor} align={align} role="menu" label={label} className="min-w-52 p-1">
        <div ref={list} data-menu-open onKeyDown={onKey}>
          {visible.map(({ label: l, icon: Icon, onClick, danger }) => (
            <button key={l} role="menuitem" type="button" onClick={() => { close(); onClick?.(); }}
              className={`flex min-h-10 w-full items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-start text-sm outline-none hover:bg-surface-2 focus-visible:bg-surface-2 ${danger ? 'text-danger' : ''}`}>
              {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden />}<span>{l}</span>
            </button>
          ))}
        </div>
      </Popover>
    </>
  );
}
