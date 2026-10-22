// Regenerates src/shared/emoji/emoji-data.json from Unicode data. Run:  npm i --no-save emojibase-data cldr-annotations-full && node scripts/build-emoji-data.mjs
// English names/tags: emojibase-data. Arabic names/keywords: Unicode CLDR annotations. Output is committed, so the app needs neither package at runtime.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const en = require('emojibase-data/en/compact.json');
const ar = require('cldr-annotations-full/annotations/ar/annotations.json').annotations.annotations;

// Same normalisation as src/shared/emoji/search.js (diacritics, tatweel, alef/ya/ta-marbuta variants).
const norm = (s) => s.toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F\u0670\u0640\u0300-\u036f]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
const strip = (s) => s.replace(/\uFE0F/g, '');
const groups = Array.from({ length: 10 }, () => []);
let withAr = 0;
for (const e of en) {
  if (e.group === undefined || e.group === 2) continue;                  // 2 = skin-tone components
  const a = ar[e.unicode] ?? ar[strip(e.unicode)];
  if (a) withAr++;
  const entry = { e: e.unicode, n: e.label, a: a?.tts?.[0] ?? null, k: norm([e.label, ...(e.tags ?? []), ...(a?.default ?? [])].join(' ')) };
  if (e.skins?.length) entry.s = e.skins.map((s) => s.unicode);
  groups[e.group].push(entry);
}
const out = { groups: groups.filter((g) => g.length) };
writeFileSync(new URL('../src/shared/emoji/emoji-data.json', import.meta.url), JSON.stringify(out));
console.log('groups', out.groups.map((g) => g.length).join(','), '| with Arabic name:', withAr);
