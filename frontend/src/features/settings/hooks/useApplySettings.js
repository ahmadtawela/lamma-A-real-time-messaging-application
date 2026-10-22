import { useEffect } from 'react';
import { useSettingsStore } from '@/features/settings/store/settingsStore';

const SIZES = { sm: '15px', md: '16px', lg: '18px', xl: '20px' };
/** Applies persisted UI settings to <html> so every screen reflects them immediately. */
export function useApplySettings() {
  const { fontSize, wallpaper, reduceMotion, highContrast } = useSettingsStore();
  useEffect(() => {
    const el = document.documentElement;
    el.style.fontSize = SIZES[fontSize] ?? SIZES.md;
    el.dataset.wp = wallpaper;
    el.dataset.motion = reduceMotion ? 'reduce' : 'full';
    el.dataset.contrast = highContrast ? 'high' : 'normal';
  }, [fontSize, wallpaper, reduceMotion, highContrast]);
}
