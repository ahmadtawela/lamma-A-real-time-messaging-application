import { useEffect, useMemo, useRef, useState } from 'react';
import { Clock, Smile, Hand, PawPrint, Utensils, Plane, Trophy, Lightbulb, Hash, Flag, Search, Loader2 } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';
import { useEmojiData } from './useEmojiData';
import { normalize } from './search';
import { getRecent, getTone, pushRecent, setTone as saveTone } from './storage';

// Unicode groups present in the dataset, in display order (index in data.groups → i18n key `emoji.group_<n>`).
const GROUP_ICONS = [Smile, Hand, PawPrint, Utensils, Plane, Trophy, Lightbulb, Hash, Flag];
const TONE_COLORS = ['#F7C948', '#F7DECE', '#F3D2A2', '#D5AB88', '#AF7E57', '#7C533E'];

/** Full emoji picker: 9 categories, recents, search in Arabic & English (diacritic/hamza-insensitive), skin tones. Lazy-loads its data. */
export default function EmojiPicker({ onPick, autoFocus = true }) {
  const { t, language } = useLanguage();
  const data = useEmojiData();
  const [query, setQuery] = useState(''); const [tone, setToneState] = useState(getTone); const [recent, setRecent] = useState(getRecent);
  const [active, setActive] = useState('recent');
  const scroller = useRef(null); const sections = useRef({});

  const glyph = (e) => (tone > 0 && e.s?.[tone - 1]) || e.e;
  const label = (e) => (language === 'ar' ? e.a ?? e.n : e.n);
  const pick = (e) => { const g = glyph(e); pushRecent(g); setRecent(getRecent()); onPick(g); };

  const results = useMemo(() => {
    const q = normalize(query.trim()); if (!q || !data) return null;
    const words = q.split(/\s+/);
    return data.groups.flat().filter((e) => words.every((w) => e.k.includes(w))).slice(0, 160);
  }, [query, data]);

  const recentEntries = useMemo(() => (data ? recent.map((g) => data.groups.flat().find((e) => e.e === g || e.s?.includes(g)) ?? { e: g, n: g, k: '' }).map((e) => ({ ...e, e: recent[recent.indexOf(e.e)] ?? e.e, s: undefined })) : []), [recent, data]);

  // highlight the category that is currently scrolled into view
  useEffect(() => {
    const root = scroller.current; if (!root || results) return undefined;
    const io = new IntersectionObserver((entries) => { const v = entries.filter((x) => x.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (v) setActive(v.target.dataset.group); }, { root, threshold: 0, rootMargin: '0px 0px -75% 0px' });
    Object.values(sections.current).forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [data, results, recent.length]);

  const go = (id) => { setActive(id); const el = sections.current[id]; if (el && scroller.current) scroller.current.scrollTo({ top: el.offsetTop - scroller.current.offsetTop, behavior: 'smooth' }); };
  const grid = (list) => (
    <div className="grid grid-cols-8 gap-0.5 px-2 pb-2">
      {list.map((e, i) => (
        <button key={`${e.e}-${i}`} type="button" onClick={() => pick(e)} title={label(e)} aria-label={label(e)} className="grid h-9 w-9 place-items-center rounded-lg text-[1.35rem] leading-none hover:bg-surface-2 focus-visible:bg-surface-2">{glyph(e)}</button>
      ))}
    </div>
  );

  return (
    <div className="flex h-[22rem] w-[22rem] max-w-[calc(100vw-1rem)] flex-col" role="group" aria-label={t('chat.emoji')}>
      <div className="p-2 pb-1">
        <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-2.5">
          <Search className="h-4 w-4 shrink-0 text-text-2" aria-hidden />
          <input autoFocus={autoFocus} value={query} onChange={(e) => setQuery(e.target.value)} dir="auto" placeholder={t('emoji.search')} aria-label={t('emoji.search')} className="h-9 w-full bg-transparent text-start text-sm outline-none placeholder:text-text-2" />
        </div>
      </div>
      {!results && (
        <div className="flex gap-0.5 overflow-x-auto border-b border-border px-2 pb-1" role="tablist" aria-label={t('emoji.categories')}>
          {[['recent', Clock, t('emoji.recent')], ...(data?.groups ?? []).map((_, i) => [`g${i}`, GROUP_ICONS[i], t(`emoji.group_${i}`)])].map(([id, Icon, name]) => (
            <button key={id} role="tab" type="button" aria-selected={active === id} title={name} aria-label={name} onClick={() => go(id)} className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${active === id ? 'bg-accent/15 text-accent' : 'text-text-2 hover:bg-surface-2'}`}><Icon className="h-4 w-4" /></button>
          ))}
        </div>
      )}
      <div ref={scroller} className="relative min-h-0 flex-1 overflow-y-auto">
        {!data && <div className="grid h-full place-items-center text-text-2"><Loader2 className="h-5 w-5 animate-spin" aria-label={t('common.loading')} /></div>}
        {data && results && (results.length ? <div className="pt-1">{grid(results)}</div> : <p className="p-8 text-center text-sm text-text-2">{t('emoji.noResults')}</p>)}
        {data && !results && (
          <>
            <section data-group="recent" ref={(el) => (sections.current.recent = el)}>
              <h3 className="sticky top-0 z-10 bg-surface px-3 py-1.5 text-xs font-semibold text-text-2">{t('emoji.recent')}</h3>
              {recentEntries.length ? grid(recentEntries) : <p className="px-3 pb-3 text-xs text-text-2">{t('emoji.noRecent')}</p>}
            </section>
            {data.groups.map((g, i) => (
              <section key={i} data-group={`g${i}`} ref={(el) => (sections.current[`g${i}`] = el)} style={{ contentVisibility: 'auto', containIntrinsicSize: `auto ${Math.ceil(g.length / 8) * 38 + 32}px` }}>
                <h3 className="sticky top-0 z-10 bg-surface px-3 py-1.5 text-xs font-semibold text-text-2">{t(`emoji.group_${i}`)}</h3>
                {grid(g)}
              </section>
            ))}
          </>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-1.5" role="radiogroup" aria-label={t('emoji.skinTone')}>
        <span className="text-xs text-text-2">{t('emoji.skinTone')}</span>
        <div className="flex gap-1.5">
          {TONE_COLORS.map((c, i) => (
            <button key={i} type="button" role="radio" aria-checked={tone === i} aria-label={t(`emoji.tone_${i}`)} title={t(`emoji.tone_${i}`)} onClick={() => { setToneState(i); saveTone(i); }}
              className={`h-5 w-5 rounded-full ${tone === i ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''}`} style={{ background: c }} />
          ))}
        </div>
      </div>
    </div>
  );
}
