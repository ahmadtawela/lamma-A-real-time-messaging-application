const URL_RE = /https?:\/\/[^\s]+/g;
export const findUrls = (text = '') => text.match(URL_RE) ?? [];
export const isEmojiOnly = (text = '') => /^(\p{Extended_Pictographic}|\p{Emoji_Component}|\s){1,8}$/u.test(text.trim()) && text.trim().length > 0;
export const domainOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } };

/** Splits text into [{text, match}] segments for search highlighting (case-insensitive, regex-safe). */
export function highlight(text = '', query = '') {
  if (!query.trim()) return [{ text, match: false }];
  const re = new RegExp(`(${query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.split(re).filter(Boolean).map((part, i) => ({ text: part, match: i % 2 === 1 }));
}
export const previewOf = (m, t) => m.deleted_at ? t('chat.deleted') : m.body || ({ image: t('chat.typeImage'), video: t('chat.typeVideo'), voice: t('chat.typeVoice'), audio: t('chat.typeAudio'), file: t('chat.typeFile'), location: t('chat.typeLocation'), contact: t('chat.typeContact'), poll: t('chat.typePoll'), sticker: t('chat.typeSticker') }[m.type] ?? '');
