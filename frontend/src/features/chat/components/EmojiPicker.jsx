import { useLanguage } from '@/shared/context/LanguageProvider';

export const STICKERS = ['🦄', '🐱', '🐶', '🦊', '🐼', '🦁', '🐸', '🐧', '🌈', '🍕', '🎈', '🥰', '😜', '🤩', '🥳', '😴', '🔥', '💯', '🎉', '❤️', '👏', '🙌', '🤝', '✨'];

export default function StickerPicker({ onPick }) {
  const { t } = useLanguage();
  return (
    <div role="listbox" aria-label={t('chat.sticker')} className="grid w-72 max-w-[calc(100vw-1rem)] grid-cols-4 gap-1 p-2">
      {STICKERS.map((e) => <button key={e} type="button" role="option" aria-selected={false} onClick={() => onPick(e)} className="rounded-lg p-2 text-4xl hover:bg-surface-2">{e}</button>)}
    </div>
  );
}
