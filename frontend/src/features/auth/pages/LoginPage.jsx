import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/shared/context/LanguageProvider';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useApiForm } from '@/shared/hooks/useApiForm';
import Input from '@/shared/ui/Input';
import Button from '@/shared/ui/Button';
import AuthLayout, { FormError } from '@/features/auth/pages/AuthLayout';

export default function LoginPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const form = useApiForm({ email: '', password: '', remember: true }, async (v) => {
    const res = await login(v);
    navigate(res.twoFactor ? '/two-factor' : location.state?.from?.pathname ?? '/app', { replace: true, state: { email: v.email } });
  });
  return (
    <AuthLayout title={t('auth.welcomeBack')} subtitle={t('auth.loginSubtitle')}
      footer={<>{t('auth.noAccount')} <Link to="/register" className="font-medium text-accent hover:underline">{t('auth.register')}</Link></>}>
      <form onSubmit={form.submit} className="space-y-4" noValidate>
        <FormError error={form.formError} />
        <Input label={t('auth.email')} type="email" dir="ltr" autoComplete="email" value={form.values.email} onChange={form.set('email')} error={form.field('email')} />
        <Input label={t('auth.password')} type="password" autoComplete="current-password" value={form.values.password} onChange={form.set('password')} error={form.field('password')} />
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.values.remember} onChange={form.set('remember')} className="accent-[var(--accent)]" />{t('auth.rememberMe')}</label>
          <Link to="/forgot-password" className="text-accent hover:underline">{t('auth.forgotPassword')}</Link>
        </div>
        <Button type="submit" loading={form.busy} className="w-full">{t('auth.login')}</Button>
        <p className="text-center text-xs text-text-2">{t('auth.demoHint')}</p>
      </form>
    </AuthLayout>
  );
}
