import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/shared/context/LanguageProvider';
import { authService } from '@/features/auth/services/authService';
import { useToast } from '@/shared/context/ToastProvider';
import { useApiForm } from '@/shared/hooks/useApiForm';
import Input from '@/shared/ui/Input';
import Button from '@/shared/ui/Button';
import AuthLayout, { FormError } from '@/features/auth/pages/AuthLayout';

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const form = useApiForm({ password: '', password_confirmation: '' }, async (v) => {
    await authService.resetPassword({ ...v, token: params.get('token'), email: params.get('email') });
    toast(t('auth.resetDone'), 'success'); navigate('/login', { replace: true });
  });
  return (
    <AuthLayout title={t('auth.resetTitle')} footer={<Link to="/login" className="text-accent hover:underline">{t('auth.backToLogin')}</Link>}>
      <form onSubmit={form.submit} className="space-y-4" noValidate>
        <FormError error={form.formError} />
        {form.field('email') && <p role="alert" className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{t('auth.invalidToken')}</p>}
        <Input label={t('auth.newPassword')} type="password" autoComplete="new-password" value={form.values.password} onChange={form.set('password')} error={form.field('password')} />
        <Input label={t('auth.confirmPassword')} type="password" autoComplete="new-password" value={form.values.password_confirmation} onChange={form.set('password_confirmation')} />
        <Button type="submit" loading={form.busy} className="w-full">{t('auth.resetPassword')}</Button>
      </form>
    </AuthLayout>
  );
}
