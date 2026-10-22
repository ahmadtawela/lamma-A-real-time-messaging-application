/** Search normalisation shared by the picker and scripts/build-emoji-data.mjs: case, diacritics, tatweel, alef/ya/ta-marbuta variants. */
export const normalize = (s) => s.toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F\u0670\u0640\u0300-\u036f]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
