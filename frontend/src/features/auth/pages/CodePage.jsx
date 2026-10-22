import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';
import { useAuthStore } from '@/features/auth/store/authStore';
import { authService } from '@/features/auth/services/authService';
import { useApiForm } from '@/shared/hooks/useApiForm';
import Input from '@/shared/ui/Input';
import Button from '@/shared/ui/Button';
import AuthLayout, { FormError } from '@/features/auth/pages/AuthLayout';

/** Shared screen for the 6-digit challenges: two-factor, account recovery (recovery code) and new-device verification. */
export default function CodePage({ mode = 'two-factor' }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [recovery, setRecovery] = useState(mode === 'recovery');
  const form = useApiForm({ code: '' }, async (v) => {
    const user = mode === 'device' ? await authService.verifyDevice(v.code) : await authService.twoFactor({ code: v.code, recovery });
    setUser(user); navigate('/app', { replace: true });
  });
  const key = mode === 'device' ? 'device' : recovery ? 'recovery' : 'twoFactor';
  return (
    <AuthLayout title={t(`auth.${key}Title`)} subtitle={t(`auth.${key}Hint`)} footer={<Link to="/login" className="text-accent hover:underline">{t('auth.backToLogin')}</Link>}>
      <form onSubmit={form.submit} className="space-y-4" noValidate>
        <ShieldCheck className="mx-auto h-12 w-12 text-accent" aria-hidden />
        <FormError error={form.formError} />
        <Input label={t('auth.code')} dir="ltr" inputMode={recovery ? 'text' : 'numeric'} autoComplete="one-time-code" maxLength={recovery ? 32 : 6}
          value={form.values.code} onChange={form.set('code')} error={form.field('code') && t('auth.codeInvalid')} />
        <Button type="submit" loading={form.busy} className="w-full">{t('auth.verify')}</Button>
        {mode !== 'device' && <button type="button" onClick={() => setRecovery((r) => !r)} className="block w-full text-center text-sm text-accent hover:underline">{t(recovery ? 'auth.useAppCode' : 'auth.useRecoveryCode')}</button>}
        <p className="text-center text-xs text-text-2">{t(`auth.${key}Demo`)}</p>
      </form>
    </AuthLayout>
  );
}
