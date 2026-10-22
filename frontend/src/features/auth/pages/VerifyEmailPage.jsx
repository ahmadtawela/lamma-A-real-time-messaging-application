import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';
import { useToast } from '@/shared/context/ToastProvider';
import { useAuthStore } from '@/features/auth/store/authStore';
import { authService } from '@/features/auth/services/authService';
import { env } from '@/config/env';
import Button from '@/shared/ui/Button';
import AuthLayout from '@/features/auth/pages/AuthLayout';

export default function VerifyEmailPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const [busy, setBusy] = useState(false);
  const act = async (fn) => { setBusy(true); try { await fn(); } catch { /* global toasts handle http errors */ } finally { setBusy(false); } };
  return (
    <AuthLayout title={t('auth.verifyTitle')} subtitle={t('auth.verifySubtitle', { email: user?.email ?? '' })}
      footer={<button onClick={async () => { await logout(); navigate('/login'); }} className="text-accent hover:underline">{t('auth.logout')}</button>}>
      <MailCheck className="mx-auto h-12 w-12 text-accent" aria-hidden />
      <Button className="w-full" loading={busy} onClick={() => act(async () => { if (env.useMocks) await authService.confirmEmail();          // mock only: with the real API the link in the e-mail does this
        const user = await authService.me(); setUser(user);
        if (user.email_verified_at) navigate('/app'); else toast(t('auth.notVerifiedYet'), 'info'); })}>{t(env.useMocks ? 'auth.verifyDemo' : 'auth.verifiedCheck')}</Button>
      <Button variant="secondary" className="w-full" disabled={busy} onClick={() => act(async () => { await authService.resendVerification(); toast(t('auth.verifySent'), 'success'); })}>{t('auth.resendVerification')}</Button>
    </AuthLayout>
  );
}
