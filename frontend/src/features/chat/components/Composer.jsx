import { useCallback, useEffect, useRef, useState } from 'react';
import { Smile, Paperclip, Image as ImageIcon, FileText, Camera, Sticker, Mic, Send, X, CornerUpLeft, Pencil, Film } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';
import { useSettingsStore } from '@/features/settings/store/settingsStore';
import { useChatStore } from '@/features/chat/store/chatStore';
import { useTypingEmitter } from '@/features/chat/hooks/useTypingEmitter';
import { useUploads } from '@/features/chat/hooks/useUploads';
import { uploadService } from '@/features/chat/services/uploadService';
import Menu from '@/shared/ui/Menu';
import EmojiPicker from '@/shared/emoji/EmojiPicker';
import StickerPicker from '@/features/chat/components/StickerPicker';
import Popover from '@/shared/ui/Popover';
import AttachmentTray from '@/features/chat/components/AttachmentTray';
import VoiceRecorder from '@/features/chat/components/VoiceRecorder';
import { previewOf } from '@/features/chat/lib/text';

/** Modes: text | voice | edit | reply. `dropped` = files dropped on the chat pane (handled by the parent). */
export default function Composer({ conversationId, replyTo, replyToSender, editing, onCancelContext, dropped, onDroppedHandled, disabled, disabledReason }) {
  const { t } = useLanguage();
  const enterToSend = useSettingsStore((s) => s.enterToSend);
  const { sendMessage, editMessage, saveDraft } = useChatStore();
  const draft = useChatStore((s) => s.conversations.find((c) => c.id === conversationId)?.draft ?? '');
  const emitTyping = useTypingEmitter(conversationId);
  const uploads = useUploads();
  const [text, setText] = useState(draft);
  const [panel, setPanel] = useState(null); // 'emoji' | 'sticker'
  const [voice, setVoice] = useState(false);
  const inputRef = useRef(null); const emojiBtn = useRef(null);
  const closePanel = useCallback(() => setPanel(null), []);
  const fileRef = useRef({ media: null, doc: null, camera: null });

  useEffect(() => { if (editing) { setText(editing.body ?? ''); inputRef.current?.focus(); } }, [editing]);
  useEffect(() => { if (replyTo) inputRef.current?.focus(); }, [replyTo]);
  useEffect(() => { if (dropped?.length) { uploads.add(dropped); onDroppedHandled?.(); } /* eslint-disable-next-line */ }, [dropped]);
  useEffect(() => {
    const el = inputRef.current; if (!el) return;
    el.style.height = 'auto';
    const h = Math.min(Math.max(el.scrollHeight, 40), 144);
    el.style.height = `${h}px`;
    el.style.overflowY = el.scrollHeight > 144 ? 'auto' : 'hidden';          // no scrollbar (and no spin arrows) until it is really needed
  }, [text]);

  const mode = voice ? 'voice' : editing ? 'edit' : replyTo ? 'reply' : 'text';
  const canSend = !uploads.busy && (text.trim() || uploads.ready);

  const typeOf = (atts) => (atts.every((a) => a.mime?.startsWith('image/')) ? 'image' : atts.every((a) => a.mime?.startsWith('video/')) ? 'video' : 'file');
  const submit = async () => {
    if (!canSend) return;
    if (editing) { try { await editMessage(conversationId, editing.id, text.trim()); } catch { /* toast via api events */ } setText(''); onCancelContext(); return; }
    const attachments = uploads.items.filter((i) => i.status === 'completed').map((i) => i.attachment);
    sendMessage({ conversationId, body: text.trim() || null, type: attachments.length ? typeOf(attachments) : 'text', replyToId: replyTo?.id ?? null, attachments });
    setText(''); uploads.clear(); onCancelContext(); setPanel(null);
    saveDraft(conversationId, '');
  };
  const onKeyDown = (e) => {
    if (e.key === 'Escape') { if (mode === 'edit' || mode === 'reply') { setText(''); onCancelContext(); } setPanel(null); }
    const wantsSend = enterToSend ? e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing : e.key === 'Enter' && (e.ctrlKey || e.metaKey);
    if (wantsSend) { e.preventDefault(); submit(); }
  };
  const sendVoice = async ({ file, duration, waveform, url }) => {
    const att = await uploadService.upload(file);
    await sendMessage({ conversationId, type: 'voice', replyToId: replyTo?.id ?? null, attachments: [{ ...att, url: att.url ?? url, duration, waveform }] });
    setVoice(false); onCancelContext();
  };
  const onPaste = (e) => { const files = [...(e.clipboardData?.files ?? [])]; if (files.length) { e.preventDefault(); uploads.add(files); } };       // paste screenshots / files
  const sendSticker = (emoji) => { sendMessage({ conversationId, body: emoji, type: 'sticker', replyToId: replyTo?.id ?? null }); setPanel(null); onCancelContext(); };

  if (disabled) return <div className="border-t border-border bg-surface p-4 text-center text-sm text-text-2">{disabledReason}</div>;
  if (voice) return <div className="border-t border-border bg-surface"><VoiceRecorder onSend={sendVoice} onCancel={() => setVoice(false)} /></div>;

  return (
    <div className="relative border-t border-border bg-surface">
      {(mode === 'reply' || mode === 'edit') && (
        <div className="flex items-center gap-2 border-b border-border bg-surface-2 px-3 py-2 text-sm">
          {mode === 'reply' ? <CornerUpLeft className="h-4 w-4 text-accent rtl:-scale-x-100" /> : <Pencil className="h-4 w-4 text-accent" />}
          <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-accent">{mode === 'reply' ? t('chat.replyingTo', { name: replyToSender?.name ?? '' }) : t('chat.editing')}</p>
            <bdi className="block truncate text-text-2">{previewOf(mode === 'reply' ? replyTo : editing, t)}</bdi></div>
          <button onClick={() => { setText(''); onCancelContext(); }} aria-label={t('common.cancel')} className="rounded p-1 hover:bg-surface"><X className="h-4 w-4" /></button>
        </div>
      )}
      <AttachmentTray items={uploads.items} onCancel={uploads.cancel} onRetry={uploads.retry} />
      <div className="flex items-end gap-1 p-2">
        <button ref={emojiBtn} type="button" onClick={() => setPanel((p) => (p === 'emoji' ? null : 'emoji'))} aria-label={t('chat.emoji')} aria-expanded={panel === 'emoji'} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-text-2 hover:bg-surface-2"><Smile className="h-5 w-5" /></button>
        <Popover open={!!panel} onClose={closePanel} anchorRef={emojiBtn} align="start" label={t(panel === 'sticker' ? 'chat.sticker' : 'chat.emoji')}>
          {panel === 'sticker' ? <StickerPicker onPick={sendSticker} /> : <EmojiPicker onPick={(e) => { const el = inputRef.current; const at = el?.selectionStart ?? text.length; setText((v) => v.slice(0, at) + e + v.slice(at)); requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(at + e.length, at + e.length); }); }} />}
        </Popover>
        <Menu label={t('chat.attach')} align="start" triggerClassName="grid h-10 w-10 shrink-0 place-items-center rounded-full" trigger={<Paperclip className="h-5 w-5" />} items={[
          { label: t('chat.photoVideo'), icon: ImageIcon, onClick: () => fileRef.current.media.click() },
          { label: t('chat.document'), icon: FileText, onClick: () => fileRef.current.doc.click() },
          { label: t('chat.camera'), icon: Camera, onClick: () => fileRef.current.camera.click() },
          { label: t('chat.gif'), icon: Film, onClick: () => setPanel('sticker') },
          { label: t('chat.sticker'), icon: Sticker, onClick: () => setPanel('sticker') },
        ]} />
        <button type="button" onClick={() => fileRef.current.media.click()} aria-label={t('chat.photoVideo')} title={t('chat.photoVideo')} className="hidden h-10 w-10 shrink-0 place-items-center rounded-full text-text-2 hover:bg-surface-2 sm:grid"><ImageIcon className="h-5 w-5" /></button>
        <input ref={(el) => (fileRef.current.media = el)} type="file" multiple accept="image/*,video/*" className="sr-only" tabIndex={-1} onChange={(e) => { uploads.add(e.target.files); e.target.value = ''; }} />
        <input ref={(el) => (fileRef.current.doc = el)} type="file" multiple className="sr-only" tabIndex={-1} onChange={(e) => { uploads.add(e.target.files); e.target.value = ''; }} />
        <input ref={(el) => (fileRef.current.camera = el)} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} onChange={(e) => { uploads.add(e.target.files); e.target.value = ''; }} />
        <textarea ref={inputRef} rows={1} dir="auto" value={text} onPaste={onPaste} placeholder={t('chat.placeholder')} aria-label={t('chat.placeholder')} onKeyDown={onKeyDown}
          onChange={(e) => { setText(e.target.value); emitTyping(); if (!editing) saveDraft(conversationId, e.target.value); }}
          className="block min-h-10 max-h-36 min-w-0 flex-1 resize-none overflow-y-hidden rounded-2xl border border-border bg-surface px-4 py-2 text-start leading-6 outline-none [scrollbar-width:thin] focus:border-accent" />
        {text.trim() || uploads.items.length || editing
          ? <button onClick={submit} disabled={!canSend} aria-label={t(editing ? 'common.save' : 'chat.send')} className="grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-fg transition active:scale-95 disabled:opacity-50"><Send className="h-5 w-5 rtl:-scale-x-100" /></button>
          : <button onClick={() => setVoice(true)} aria-label={t('chat.recordVoice')} className="grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-fg transition active:scale-95"><Mic className="h-5 w-5" /></button>}
      </div>
    </div>
  );
}
