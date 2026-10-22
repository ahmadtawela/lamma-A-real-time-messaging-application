import { useState } from 'react';
import { Camera, ShieldCheck, Lock, KeyRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/shared/context/LanguageProvider';
import { useToast } from '@/shared/context/ToastProvider';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useUsersStore } from '@/features/users/store/usersStore';
import { userService } from '@/features/users/services/userService';
import { useApiForm } from '@/shared/hooks/useApiForm';
import Page from '@/shared/ui/Page';
import PhoneVerification from '@/features/profile/components/PhoneVerification';
import Button from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import Avatar from '@/shared/ui/Avatar';
import Select from '@/shared/ui/Select';
import LanguageSwitcher from '@/shared/components/LanguageSwitcher';
import { useSettingsStore } from '@/features/settings/store/settingsStore';

export default function ProfilePage() {
  const { t } = useLanguage();
  const toast = useToast();
  const user = useAuthStore((s) => s.user); const patchUser = useAuthStore((s) => s.patchUser); const upsert = useUsersStore((s) => s.upsert);
  const { lastSeenVisibility, profilePhotoVisibility, setPrivacy } = useSettingsStore();
  const [editing, setEditing] = useState(false);
  const form = useApiForm({ name: user.name, username: user.username, about: user.about ?? '' }, async (v) => {
    const { data } = await userService.updateProfile(v); patchUser(data); upsert(data); setEditing(false); toast(t('common.saved'), 'success');
  });
  const pw = useApiForm({ current_password: '', password: '', password_confirmation: '' }, async (v) => { await userService.changePassword(v); toast(t('profile.passwordChanged'), 'success'); pw.setValues({ current_password: '', password: '', password_confirmation: '' }); });
  const changeAvatar = async (file) => { if (!file) return; const { data } = await userService.uploadAvatar(file); patchUser(data); upsert(data); toast(t('common.saved'), 'success'); };
  const vis = ['everyone', 'contacts', 'nobody'].map((v) => ({ value: v, label: t(`settings.vis_${v}`) }));
  return (
    <Page title={t('profile.title')} narrow actions={!editing && <Button size="sm" onClick={() => setEditing(true)}>{t('profile.edit')}</Button>}>
      <section className="mb-4 rounded-xl border border-border bg-surface p-5 text-center">
        <label className="cursor-pointer"><span className="relative inline-block"><Avatar name={user.name} src={user.avatar_url} size="lg" /><span className="absolute -bottom-1 -end-1 grid h-7 w-7 place-items-center rounded-full bg-accent text-accent-fg"><Camera className="h-4 w-4" /></span></span>
          <input type="file" accept="image/*" className="sr-only" aria-label={t('profile.changeAvatar')} onChange={(e) => changeAvatar(e.target.files[0])} /></label>
        <bdi className="mt-3 block text-xl font-bold">{user.name}</bdi><bdi className="block text-sm text-text-2" dir="ltr">@{user.username}</bdi>
        <p className="mt-1 text-sm text-success">{t('chat.online')}</p>
      </section>

      <section className="mb-4 rounded-xl border border-border bg-surface p-5">
        {editing ? (
          <form onSubmit={form.submit} className="space-y-3" noValidate>
            <Input label={t('auth.fullName')} value={form.values.name} onChange={form.set('name')} error={form.field('name')} />
            <Input label={t('profile.username')} dir="ltr" value={form.values.username} onChange={form.set('username')} error={form.field('username')} />
            <Input label={t('profile.about')} value={form.values.about} onChange={form.set('about')} />
            <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setEditing(false)}>{t('common.cancel')}</Button><Button type="submit" loading={form.busy}>{t('common.save')}</Button></div>
          </form>
        ) : (
          <dl className="space-y-3 text-sm">{[['auth.email', user.email, 'ltr'], ['profile.phone', user.phone ? `${user.phone}${user.phone_verified ? ' ✓' : ''}` : null, 'ltr'], ['profile.about', user.about], ['profile.status', t('chat.online')]].map(([k, v, d]) => (
            <div key={k} className="flex justify-between gap-4"><dt className="text-text-2">{t(k)}</dt><dd className="font-medium" dir={d}><bdi>{v ?? '—'}</bdi></dd></div>))}</dl>
        )}
      </section>

      <PhoneVerification />

      <section className="mb-4 space-y-3 rounded-xl border border-border bg-surface p-5">
        <h2 className="flex items-center gap-2 font-semibold"><Lock className="h-4 w-4" />{t('settings.privacy')}</h2>
        <Select label={t('settings.lastSeenVisibility')} value={lastSeenVisibility} onChange={(v) => setPrivacy({ lastSeenVisibility: v })} options={vis} />
        <Select label={t('settings.profilePhotoVisibility')} value={profilePhotoVisibility} onChange={(v) => setPrivacy({ profilePhotoVisibility: v })} options={vis} />
        <p className="flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4 text-success" /><Link to="/app/settings" className="text-accent hover:underline">{t('profile.moreSecurity')}</Link></p>
      </section>

      <section className="mb-4 rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><KeyRound className="h-4 w-4" />{t('profile.changePassword')}</h2>
        <form onSubmit={pw.submit} className="space-y-3" noValidate>
          <Input label={t('profile.currentPassword')} type="password" autoComplete="current-password" value={pw.values.current_password} onChange={pw.set('current_password')} error={pw.field('current_password')} />
          <Input label={t('auth.newPassword')} type="password" autoComplete="new-password" value={pw.values.password} onChange={pw.set('password')} error={pw.field('password')} />
          <Input label={t('auth.confirmPassword')} type="password" autoComplete="new-password" value={pw.values.password_confirmation} onChange={pw.set('password_confirmation')} />
          <Button type="submit" loading={pw.busy}>{t('profile.changePassword')}</Button>
        </form>
      </section>
      <div className="mb-8 flex justify-center"><LanguageSwitcher /></div>
    </Page>
  );
}
