import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { userService } from '@/features/users/services/userService';

// camelCase (UI) <-> snake_case (Laravel users.settings)
const SERVER_KEYS = { lastSeenVisibility: 'last_seen_visibility', profilePhotoVisibility: 'profile_photo_visibility', aboutVisibility: 'about_visibility', readReceipts: 'read_receipts', phoneDiscoverable: 'phone_discoverable' };

/** Local UI settings. In production the server-relevant ones (privacy, notifications) also sync via PUT /api/user/preferences. */
export const useSettingsStore = create(persist((set) => ({
  enterToSend: true, autoDownload: 'wifi', wallpaper: 'plain', fontSize: 'md', reduceMotion: false, highContrast: false,
  readReceipts: true, phoneDiscoverable: true, lastSeenVisibility: 'everyone', profilePhotoVisibility: 'everyone', statusPrivacy: 'contacts', aboutVisibility: 'everyone',
  notifMessages: true, notifGroups: true, notifCalls: true, notifPreview: true, notifSound: true, twoFactor: false, dataSaver: false,
  set: (patch) => set(patch),
  /** Privacy options: update the UI immediately, then persist on the server (reverted if the request fails). */
  setPrivacy: async (patch) => {
    const before = Object.fromEntries(Object.keys(patch).map((k) => [k, useSettingsStore.getState()[k]]));
    set(patch);
    try { await userService.updatePreferences({ settings: Object.fromEntries(Object.entries(patch).map(([k, v]) => [SERVER_KEYS[k], v])) }); } catch { set(before); }
  },
  /** Called after login with user.settings from GET /api/user. */
  hydrate: (serverSettings = {}) => set(Object.fromEntries(Object.entries(SERVER_KEYS).filter(([, sk]) => serverSettings[sk] !== undefined).map(([k, sk]) => [k, serverSettings[sk]]))),
}), { name: 'lamma.settings' }));
