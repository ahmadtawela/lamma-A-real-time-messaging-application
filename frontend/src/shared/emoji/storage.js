const RECENT = 'lamma.emoji.recent'; const TONE = 'lamma.emoji.tone';
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };
export const getRecent = () => read(RECENT, []);
export const pushRecent = (emoji) => write(RECENT, [emoji, ...getRecent().filter((e) => e !== emoji)].slice(0, 32));
export const getTone = () => read(TONE, 0);
export const setTone = (n) => write(TONE, n);
