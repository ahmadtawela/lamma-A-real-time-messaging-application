import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';

const ToastContext = createContext(null);
const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info };
const TONES = { success: 'text-success', error: 'text-danger', info: 'text-accent' };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const { t } = useLanguage();
  const dismiss = useCallback((id) => setToasts((l) => l.filter((x) => x.id !== id)), []);
  const toast = useCallback((message, type = 'info') => {
    const id = crypto.randomUUID();
    setToasts((l) => [...l, { id, message, type }]);
    setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:end-4 z-50 flex flex-col gap-2 sm:w-96" aria-live="polite">
        {toasts.map(({ id, message, type }) => {
          const Icon = ICONS[type];
          return (
            <div key={id} role="status" className="lm-pop flex items-start gap-3 rounded-lg border border-border bg-surface p-3 shadow-lg">
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${TONES[type]}`} aria-hidden />
              <p className="flex-1 text-sm">{message}</p>
              <button onClick={() => dismiss(id)} aria-label={t('common.close')} className="text-text-2 hover:text-text-1"><X className="h-4 w-4" /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
