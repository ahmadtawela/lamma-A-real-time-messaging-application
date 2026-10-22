import { useEffect, useState } from 'react';

let promise = null;
/** The full Unicode emoji set (~1,900 emojis, English + Arabic names, skin tones) is a separate chunk loaded the first time a picker opens. */
export function useEmojiData() {
  const [data, setData] = useState(null);
  useEffect(() => {
    let alive = true;
    promise ??= import('./emoji-data.json').then((m) => m.default ?? m);
    promise.then((d) => alive && setData(d));
    return () => { alive = false; };
  }, []);
  return data;
}
