import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useApiForm } from '@/shared/hooks/useApiForm';
import Input from '@/shared/ui/Input';
import Button from '@/shared/ui/Button';
import Avatar from '@/shared/ui/Avatar';
import AuthLayout, { FormError } from '@/features/auth/pages/AuthLayout';

export default function RegisterPage() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const [preview, setPreview] = useState(null);
  const form = useApiForm({ name: '', email: '', password: '', password_confirmation: '', terms: false }, async (v) => {
    await register({ ...v, locale: language });
    navigate('/verify-email', { replace: true });
  });
  return (
    <AuthLayout title={t('auth.createAccountTitle')} subtitle={t('auth.registerSubtitle')}
      footer={<>{t('auth.haveAccount')} <Link to="/login" className="font-medium text-accent hover:underline">{t('auth.login')}</Link></>}>
      <form onSubmit={form.submit} className="space-y-4" noValidate>
        <FormError error={form.formError} />
        <label className="mx-auto flex w-fit cursor-pointer flex-col items-center gap-1 text-sm text-text-2">
          <span className="relative"><Avatar name={form.values.name || '?'} src={preview} size="lg" /><span className="absolute -bottom-1 -end-1 grid h-6 w-6 place-items-center rounded-full bg-accent text-accent-fg"><Camera className="h-3.5 w-3.5" /></span></span>
          {t('auth.profilePicture')}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files[0] && setPreview(URL.createObjectURL(e.target.files[0]))} />
        </label>
        <Input label={t('auth.fullName')} autoComplete="name" value={form.values.name} onChange={form.set('name')} error={form.field('name')} />
        <Input label={t('auth.email')} type="email" dir="ltr" autoComplete="email" value={form.values.email} onChange={form.set('email')} error={form.field('email')} />
        <Input label={t('auth.password')} type="password" autoComplete="new-password" value={form.values.password} onChange={form.set('password')} error={form.field('password')} />
        <Input label={t('auth.confirmPassword')} type="password" autoComplete="new-password" value={form.values.password_confirmation} onChange={form.set('password_confirmation')} />
        <div>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={form.values.terms} onChange={form.set('terms')} className="mt-1 accent-[var(--accent)]" />{t('auth.acceptTerms')}</label>
          {form.field('terms') && <p className="mt-1 text-sm text-danger">{t('auth.termsRequired')}</p>}
        </div>
        <Button type="submit" loading={form.busy} className="w-full">{t('auth.register')}</Button>
      </form>
    </AuthLayout>
  );
}
