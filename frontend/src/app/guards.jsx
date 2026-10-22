import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import Logo from '@/shared/ui/Logo';

export const Splash = () => <div className="grid min-h-dvh place-items-center"><Logo className="h-16 w-16 animate-pulse" /></div>;

export function RequireAuth({ admin = false }) {
  const { status, user } = useAuthStore();
  const location = useLocation();
  if (status === 'idle' || status === 'loading') return <Splash />;
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location }} />;
  if (!user.email_verified_at) return <Navigate to="/verify-email" replace />;
  if (admin && !user.is_admin) return <Navigate to="/app" replace />; // 403 equivalent for the admin area
  return <Outlet />;
}

export function GuestOnly() {
  const { status, user } = useAuthStore();
  if (status === 'idle' || status === 'loading') return <Splash />;
  if (status === 'authenticated') return <Navigate to={user.email_verified_at ? '/app' : '/verify-email'} replace />;
  return <Outlet />;
}
