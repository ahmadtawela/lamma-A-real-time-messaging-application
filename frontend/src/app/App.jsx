import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from '@/app/AppRoutes';
import ErrorBoundary from '@/app/ErrorBoundary';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useApiEventToasts } from '@/app/hooks/useApiEventToasts';

export default function App() {
  const init = useAuthStore((s) => s.init);
  useApiEventToasts();
  useEffect(() => { init(); }, [init]);
  return <BrowserRouter><ErrorBoundary><AppRoutes /></ErrorBoundary></BrowserRouter>;
}
