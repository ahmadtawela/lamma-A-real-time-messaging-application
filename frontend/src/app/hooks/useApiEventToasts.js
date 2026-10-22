import { useEffect } from 'react';
import { apiEvents } from '@/shared/lib/apiEvents';
import { useToast } from '@/shared/context/ToastProvider';
import { useLanguage } from '@/shared/context/LanguageProvider';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useChatStore } from '@/features/chat/store/chatStore';

/** Turns global HTTP problems (401/403/429/5xx/network) into localized toasts. */
export function useApiEventToasts() {
  const toast = useToast();
  const { t, formatNumber } = useLanguage();
  useEffect(() => apiEvents.on((e) => {
    switch (e.type) {
      case 'unauthenticated':
        if (useAuthStore.getState().status === 'authenticated') { // ignore the silent probe on first load
          useAuthStore.getState().expire(); useChatStore.getState().reset();
          toast(t('errors.sessionExpired'), 'error');
        }
        break;
      case 'rate_limited': toast(e.retryAfter ? `${t('errors.tooMany')} (${formatNumber(e.retryAfter)}s)` : t('errors.tooMany'), 'error'); break;
      case 'forbidden': toast(t('errors.forbidden'), 'error'); break;
      case 'network_error': toast(t('errors.network'), 'error'); break;
      case 'server_error': toast(t('errors.generic'), 'error'); break;
      default: break;
    }
  }), [toast, t, formatNumber]);
}
