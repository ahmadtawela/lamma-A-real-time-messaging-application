import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import App from '@/app/App';
import { LanguageProvider } from '@/shared/context/LanguageProvider';
import { ThemeProvider } from '@/shared/context/ThemeProvider';
import { ToastProvider } from '@/shared/context/ToastProvider';
import { userService } from '@/features/users/services/userService';
import { useAuthStore } from '@/features/auth/store/authStore';

// Guests: localStorage only (handled by LanguageProvider). Logged-in users: also sync to Laravel.
const syncLocale = (locale) => (useAuthStore.getState().status === 'authenticated' ? userService.updatePreferences({ locale }) : undefined);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider onLocaleChange={syncLocale}>
      <ThemeProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ThemeProvider>
    </LanguageProvider>
  </StrictMode>
);
