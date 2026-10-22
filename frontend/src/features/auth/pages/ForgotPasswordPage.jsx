import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';
import { authService } from '@/features/auth/services/authService';
import { useApiForm } from '@/shared/hooks/useApiForm';
import Input from '@/shared/ui/Input';
import Button from '@/shared/ui/Button';
import AuthLayout, { FormError } from '@/features/auth/pages/AuthLayout';

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [sent, setSent] = useState(false);
  const form = useApiForm({ email: '' }, async (v) => { await authService.forgotPassword(v.email); setSent(true); });
  return (
    <AuthLayout title={t('auth.forgotTitle')} subtitle={t('auth.forgotSubtitle')} footer={<Link to="/login" className="text-accent hover:underline">{t('auth.backToLogin')}</Link>}>
      {sent ? (
        <div className="space-y-3 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-success" /><p className="text-sm">{t('auth.resetSent')}</p>
          <Link to="/reset-password?token=demo-token" className="text-sm text-accent hover:underline">{t('auth.openResetDemo')}</Link></div>
      ) : (
        <form onSubmit={form.submit} className="space-y-4" noValidate>
          <FormError error={form.formError} />
          <Input label={t('auth.email')} type="email" dir="ltr" value={form.values.email} onChange={form.set('email')} error={form.field('email')} />
          <Button type="submit" loading={form.busy} className="w-full">{t('auth.sendResetLink')}</Button>
        </form>
      )}
    </AuthLayout>
  );
}
