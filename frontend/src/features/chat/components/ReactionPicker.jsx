import { useCallback, useRef, useState } from 'react';
import { SmilePlus } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';
import { REACTIONS } from '@/shared/models';
import Popover from '@/shared/ui/Popover';

/** Horizontal quick-reaction bar in a portal popover. */
export default function ReactionPicker({ onPick, align = 'end' }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false); const anchor = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button ref={anchor} type="button" aria-label={t('chat.react')} aria-expanded={open} onClick={() => setOpen((o) => !o)} className="rounded-lg p-2 text-text-2 hover:bg-surface-2 hover:text-text-1"><SmilePlus className="h-4 w-4" /></button>
      <Popover open={open} onClose={close} anchorRef={anchor} align={align} label={t('chat.react')} className="rounded-full p-1">
        <div className="flex gap-0.5">{REACTIONS.map((e) => <button key={e} type="button" onClick={() => { close(); onPick(e); }} aria-label={e} className="grid h-10 w-10 place-items-center rounded-full text-2xl transition hover:scale-110 hover:bg-surface-2">{e}</button>)}</div>
      </Popover>
    </>
  );
}
