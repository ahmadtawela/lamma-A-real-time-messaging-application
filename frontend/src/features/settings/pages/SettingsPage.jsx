import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ShieldCheck, Bell, Palette, MessageSquare, HardDrive, Wifi, Languages, Accessibility, Smartphone, Ban, HelpCircle, LogOut, Monitor } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';
import { useToast } from '@/shared/context/ToastProvider';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useChatStore } from '@/features/chat/store/chatStore';
import { useSettingsStore } from '@/features/settings/store/settingsStore';
import { useTheme } from '@/shared/context/ThemeProvider';
import { contactService } from '@/features/contacts/services/contactService';
import { userService } from '@/features/users/services/userService';
import { env } from '@/config/env';
import Page from '@/shared/ui/Page';
import Toggle from '@/shared/ui/Toggle';
import Select from '@/shared/ui/Select';
import Button from '@/shared/ui/Button';
import Avatar from '@/shared/ui/Avatar';
import Modal from '@/shared/ui/Modal';
import Input from '@/shared/ui/Input';
import LanguageSwitcher from '@/shared/components/LanguageSwitcher';
import ThemeSwitcher from '@/shared/components/ThemeSwitcher';
import { EmptyState } from '@/shared/ui/States';

const SECTIONS = [['account', User], ['privacy', Lock], ['security', ShieldCheck], ['notifications', Bell], ['appearance', Palette], ['chats', MessageSquare], ['storage', HardDrive], ['dataUsage', Wifi], ['language', Languages], ['accessibility', Accessibility], ['devices', Smartphone], ['blocked', Ban], ['help', HelpCircle]];

function Row({ label, hint, children }) {
  return <div className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-0"><div className="min-w-0"><p className="text-sm font-medium">{label}</p>{hint && <p className="text-xs text-text-2">{hint}</p>}</div><div className="shrink-0">{children}</div></div>;
}

export default function SettingsPage() {
  const { t, formatBytes } = useLanguage();
  const toast = useToast(); const navigate = useNavigate();
  const [section, setSection] = useState('account');
  const s = useSettingsStore(); const { theme, setTheme } = useTheme();
  const user = useAuthStore((st) => st.user); const logout = useAuthStore((st) => st.logout); const reset = useChatStore((st) => st.reset);
  const [blocked, setBlocked] = useState(null); const [devices, setDevices] = useState(null); const [devicesError, setDevicesError] = useState(null);
  const [sessionsReload, setSessionsReload] = useState(0);
  const [confirm, setConfirm] = useState(false); const [deletePassword, setDeletePassword] = useState(''); const [deleteError, setDeleteError] = useState(null); const [deleting, setDeleting] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState(null); const [twoFactorSecret, setTwoFactorSecret] = useState(''); const [twoFactorUrl, setTwoFactorUrl] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState(''); const [twoFactorPassword, setTwoFactorPassword] = useState('');
  const [twoFactorError, setTwoFactorError] = useState(null); const [recoveryCodes, setRecoveryCodes] = useState([]); const [twoFactorBusy, setTwoFactorBusy] = useState(false);
  const [storageUsage, setStorageUsage] = useState(null);
  useEffect(() => { if (section === 'blocked' && !blocked) contactService.list().then(({ data }) => setBlocked(data.filter((u) => u.is_blocked))).catch(() => setBlocked([])); }, [section, blocked]);
  useEffect(() => {
    if (section !== 'devices' || devices !== null) return;
    userService.sessions().then(({ data }) => setDevices(data)).catch((error) => setDevicesError(error.message || t('errors.generic')));
  }, [section, devices, sessionsReload, t]);
  useEffect(() => {
    if (section !== 'storage') return;
    let active = true;
    if (!navigator.storage?.estimate) {
      setStorageUsage({ unavailable: true });
      return () => { active = false; };
    }
    navigator.storage.estimate().then(({ usage = 0, quota = 0 }) => {
      if (active) setStorageUsage({ usage, quota, unavailable: false });
    }).catch(() => {
      if (active) setStorageUsage({ unavailable: true });
    });
    return () => { active = false; };
  }, [section]);
  const setServerPreference = async (patch) => {
    try { await s.setPrivacy(patch); }
    catch (error) { toast(error.message || t('errors.generic'), 'error'); }
  };
  const T = (k) => <Toggle checked={s[k]} onChange={(x) => (Object.hasOwn(s, k) && ['readReceipts', 'phoneDiscoverable', 'notifMessages', 'notifGroups', 'notifCalls', 'notifPreview', 'notifSound'].includes(k) ? setServerPreference({ [k]: x }) : s.set({ [k]: x }))} label={t(`settings.${k}`)} />;
  const deleteAccount = async (event) => {
    event.preventDefault();
    setDeleting(true); setDeleteError(null);
    try {
      await userService.deleteAccount(deletePassword);
      useAuthStore.getState().expire();
      reset();
      navigate('/register');
    } catch (error) {
      setDeleteError(error.field?.('password') || error.message || t('errors.generic'));
    } finally { setDeleting(false); }
  };
  const closeTwoFactor = (force = false) => {
    if (twoFactorBusy && !force) return;
    setTwoFactorStep(null); setTwoFactorSecret(''); setTwoFactorUrl(''); setTwoFactorCode('');
    setTwoFactorPassword(''); setTwoFactorError(null); setRecoveryCodes([]);
  };
  const beginTwoFactorChange = async () => {
    setTwoFactorError(null);
    if (user.two_factor) { setTwoFactorStep('disable'); return; }
    setTwoFactorBusy(true);
    try {
      const setup = await userService.setupTwoFactor();
      setTwoFactorSecret(setup.secret); setTwoFactorUrl(setup.otpauth_url); setTwoFactorStep('setup');
    } catch (error) { toast(error.message || t('errors.generic'), 'error'); }
    finally { setTwoFactorBusy(false); }
  };
  const confirmTwoFactor = async (event) => {
    event.preventDefault(); setTwoFactorBusy(true); setTwoFactorError(null);
    try {
      const result = await userService.confirmTwoFactor(twoFactorCode);
      useAuthStore.getState().patchUser({ two_factor: true });
      setRecoveryCodes(result.recovery_codes ?? []); setTwoFactorStep('recovery');
    } catch (error) { setTwoFactorError(error.field?.('code') || error.message || t('errors.generic')); }
    finally { setTwoFactorBusy(false); }
  };
  const disableTwoFactor = async (event) => {
    event.preventDefault(); setTwoFactorBusy(true); setTwoFactorError(null);
    try {
      await userService.disableTwoFactor(twoFactorPassword);
      useAuthStore.getState().patchUser({ two_factor: false });
      closeTwoFactor(true);
    } catch (error) { setTwoFactorError(error.field?.('password') || error.message || t('errors.generic')); }
    finally { setTwoFactorBusy(false); }
  };
  const revokeSession = async (id) => {
    try {
      await userService.revokeSession(id);
      setDevices((items) => items.filter((session) => session.id !== id));
      toast(t('settings.deviceRemoved'), 'success');
    } catch (error) { toast(error.message || t('errors.generic'), 'error'); }
  };
  const vis = ['everyone', 'contacts', 'nobody'].map((v) => ({ value: v, label: t(`settings.vis_${v}`) }));
  const pane = {
    account: <><Row label={t('auth.email')}><bdi dir="ltr" className="text-sm text-text-2">{user.email}</bdi></Row><Row label={t('profile.phone')}><bdi dir="ltr" className="text-sm text-text-2">{user.phone}</bdi></Row>
      <Row label={t('auth.logout')}><Button size="sm" variant="secondary" onClick={async () => { await logout(); reset(); navigate('/login'); }}><LogOut className="h-4 w-4 rtl:-scale-x-100" />{t('auth.logout')}</Button></Row>
      <Row label={t('settings.deleteAccount')} hint={t('settings.deleteAccountHint')}><Button size="sm" variant="danger" onClick={() => setConfirm(true)}>{t('chat.delete')}</Button></Row></>,
    privacy: <><Row label={t('settings.lastSeenVisibility')}><Select value={s.lastSeenVisibility} onChange={(v) => setServerPreference({ lastSeenVisibility: v })} options={vis} /></Row>
      <Row label={t('settings.profilePhotoVisibility')}><Select value={s.profilePhotoVisibility} onChange={(v) => setServerPreference({ profilePhotoVisibility: v })} options={vis} /></Row>
      <Row label={t('settings.aboutVisibility')}><Select value={s.aboutVisibility} onChange={(v) => setServerPreference({ aboutVisibility: v })} options={vis} /></Row>
      <Row label={t('settings.statusPrivacy')}><Select value={s.statusPrivacy} onChange={(v) => setServerPreference({ statusPrivacy: v })} options={vis.slice(0, 2)} /></Row>
      <Row label={t('settings.readReceipts')} hint={t('settings.readReceiptsHint')}>{T('readReceipts')}</Row>
      <Row label={t('settings.phoneDiscoverable')} hint={t('settings.phoneDiscoverableHint')}>{T('phoneDiscoverable')}</Row></>,
    security: <><Row label={t('settings.twoFactor')} hint={t('settings.twoFactorHint')}><Button size="sm" variant={user.two_factor ? 'secondary' : 'primary'} loading={twoFactorBusy} onClick={beginTwoFactorChange}>{t(user.two_factor ? 'settings.twoFactorDisable' : 'settings.twoFactorEnable')}</Button></Row><Row label={t('profile.changePassword')}><Button size="sm" variant="secondary" onClick={() => navigate('/app/profile')}>{t('profile.changePassword')}</Button></Row>
      <p className="mt-3 rounded-lg bg-surface-2 p-3 text-xs text-text-2">{t('chat.encryptionInfo')}</p></>,
    notifications: <>{['notifMessages', 'notifGroups', 'notifCalls', 'notifPreview', 'notifSound'].map((k) => <Row key={k} label={t(`settings.${k}`)}>{T(k)}</Row>)}</>,
    appearance: <><Row label={t('common.theme')}><ThemeSwitcher /></Row><Row label={t('common.language')}><LanguageSwitcher /></Row>
      <Row label={t('settings.wallpaper')}><Select value={s.wallpaper} onChange={(v) => s.set({ wallpaper: v })} options={['plain', 'dots', 'gradient'].map((v) => ({ value: v, label: t(`settings.wp_${v}`) }))} /></Row>
      <Row label={t('settings.fontSize')}><Select value={s.fontSize} onChange={(v) => s.set({ fontSize: v })} options={['sm', 'md', 'lg', 'xl'].map((v) => ({ value: v, label: t(`settings.fs_${v}`) }))} /></Row></>,
    chats: <><Row label={t('settings.enterToSend')} hint={t('settings.enterToSendHint')}>{T('enterToSend')}</Row>
      <Row label={t('settings.autoDownload')}><Select value={s.autoDownload} onChange={(v) => s.set({ autoDownload: v })} options={['always', 'wifi', 'never'].map((v) => ({ value: v, label: t(`settings.ad_${v}`) }))} /></Row>
      <Row label={t('settings.wallpaper')}><Select value={s.wallpaper} onChange={(v) => s.set({ wallpaper: v })} options={['plain', 'dots', 'gradient'].map((v) => ({ value: v, label: t(`settings.wp_${v}`) }))} /></Row>
      <Row label={t('settings.fontSize')}><Select value={s.fontSize} onChange={(v) => s.set({ fontSize: v })} options={['sm', 'md', 'lg', 'xl'].map((v) => ({ value: v, label: t(`settings.fs_${v}`) }))} /></Row></>,
    storage: storageUsage === null ? <p className="py-3 text-sm text-text-2">{t('common.loading')}</p> : storageUsage.unavailable ? <p className="py-3 text-sm text-text-2">{t('settings.storageUnavailable')}</p> :
      <div className="space-y-2 py-3"><div className="flex justify-between text-sm"><span>{t('settings.storageUsed')}</span><bdi>{formatBytes(storageUsage.usage)} / {formatBytes(storageUsage.quota)}</bdi></div>
        <div className="h-2 overflow-hidden rounded bg-border"><div className="h-full bg-accent" style={{ width: `${storageUsage.quota ? Math.min(100, (storageUsage.usage / storageUsage.quota) * 100) : 0}%` }} /></div></div>,
    dataUsage: <><Row label={t('settings.dataSaver')} hint={t('settings.dataSaverHint')}>{T('dataSaver')}</Row><Row label={t('settings.autoDownload')}><Select value={s.autoDownload} onChange={(v) => s.set({ autoDownload: v })} options={['always', 'wifi', 'never'].map((v) => ({ value: v, label: t(`settings.ad_${v}`) }))} /></Row></>,
    language: <div className="py-4"><LanguageSwitcher /><p className="mt-3 text-xs text-text-2">{t('settings.languageHint')}</p></div>,
    accessibility: <><Row label={t('settings.reduceMotion')} hint={t('settings.reduceMotionHint')}>{T('reduceMotion')}</Row><Row label={t('settings.highContrast')}>{T('highContrast')}</Row>
      <Row label={t('settings.fontSize')}><Select value={s.fontSize} onChange={(v) => s.set({ fontSize: v })} options={['sm', 'md', 'lg', 'xl'].map((v) => ({ value: v, label: t(`settings.fs_${v}`) }))} /></Row></>,
    devices: devices === null ? devicesError ? <div role="alert" className="p-3 text-sm text-danger">{devicesError}<Button size="sm" variant="ghost" onClick={() => { setDevicesError(null); setSessionsReload((n) => n + 1); }}>{t('common.retry')}</Button></div> : <p className="p-3 text-sm text-text-2">{t('common.loading')}</p> : !devices.length ? <EmptyState icon={Monitor} title={t('settings.noOtherDevices')} /> :
      <ul>{devices.map((d) => <li key={d.id} className="flex items-center gap-3 border-b border-border py-3 last:border-0"><Monitor className="h-5 w-5 text-text-2" /><span className="min-w-0 flex-1 text-sm"><bdi className="block truncate">{d.user_agent || t('settings.unknownDevice')}</bdi><span className="text-xs text-text-2">{d.ip_address} · {new Date(d.last_activity).toLocaleString()}</span>{d.is_current && <span className="ms-2 rounded bg-success/15 px-1.5 text-xs text-success">{t('settings.thisDevice')}</span>}</span>
      {!d.is_current && <Button size="sm" variant="secondary" onClick={() => revokeSession(d.id)}>{t('settings.logoutDevice')}</Button>}</li>)}</ul>,
    blocked: blocked === null ? <p className="p-4 text-sm text-text-2">{t('common.loading')}</p> : !blocked.length ? <EmptyState icon={Ban} title={t('settings.noBlocked')} /> :
      <ul>{blocked.map((u) => <li key={u.id} className="flex items-center gap-3 py-2"><Avatar name={u.name} /><bdi className="flex-1 text-sm">{u.name}</bdi><Button size="sm" variant="secondary" onClick={async () => { await contactService.block(u.id, false); setBlocked((l) => l.filter((x) => x.id !== u.id)); }}>{t('chat.unblockUser')}</Button></li>)}</ul>,
    help: <ul className="space-y-3 py-2 text-sm">{['q1', 'q2', 'q3'].map((q) => <li key={q}><details className="rounded-lg border border-border p-3"><summary className="cursor-pointer font-medium">{t(`settings.help_${q}`)}</summary><p className="mt-2 text-text-2">{t(`settings.help_${q}_a`)}</p></details></li>)}</ul>,
  }[section];
  void theme; void setTheme;
  return (
    <Page title={t('settings.title')}>
      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <nav aria-label={t('settings.title')} className="flex gap-1 overflow-x-auto md:flex-col">{SECTIONS.map(([id, Icon]) => (
          <button key={id} onClick={() => setSection(id)} aria-current={section === id} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-start text-sm ${section === id ? 'bg-accent/10 font-semibold text-accent' : 'hover:bg-surface-2'}`}><Icon className="h-4 w-4" />{t(`settings.sec_${id}`)}</button>))}</nav>
        <section className="rounded-xl border border-border bg-surface p-4" aria-label={t(`settings.sec_${section}`)}><h2 className="mb-2 font-semibold">{t(`settings.sec_${section}`)}</h2>{pane}</section>
      </div>
      <Modal open={confirm} title={t('settings.deleteAccount')} onClose={() => { if (!deleting) { setConfirm(false); setDeletePassword(''); setDeleteError(null); } }}>
        <form onSubmit={deleteAccount} className="space-y-4">
          <p className="text-sm text-text-2">{t('settings.deleteAccountConfirm')}</p>
          <Input label={t('auth.password')} type="password" autoComplete="current-password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} error={deleteError} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" disabled={deleting} onClick={() => { setConfirm(false); setDeletePassword(''); setDeleteError(null); }}>{t('common.cancel')}</Button>
            <Button type="submit" variant="danger" loading={deleting}>{t('settings.deleteAccount')}</Button>
          </div>
        </form>
      </Modal>
      <Modal open={!!twoFactorStep} title={t('settings.twoFactor')} onClose={closeTwoFactor}>
        {twoFactorStep === 'setup' && <form onSubmit={confirmTwoFactor} className="space-y-4">
          <p className="text-sm text-text-2">{t('settings.twoFactorSetupHint')}</p>
          {env.useMocks && <p className="text-xs text-text-2">{t('settings.twoFactorDemoCode')}</p>}
          <p className="break-all rounded-lg bg-surface-2 p-3 font-mono text-sm" dir="ltr">{twoFactorSecret}</p>
          <a className="break-all text-sm text-accent underline" href={twoFactorUrl}>{t('settings.twoFactorOpenApp')}</a>
          <Input label={t('auth.code')} dir="ltr" inputMode="numeric" autoComplete="one-time-code" value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))} error={twoFactorError} />
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" disabled={twoFactorBusy} onClick={() => closeTwoFactor()}>{t('common.cancel')}</Button><Button type="submit" loading={twoFactorBusy}>{t('auth.verify')}</Button></div>
        </form>}
        {twoFactorStep === 'disable' && <form onSubmit={disableTwoFactor} className="space-y-4">
          <p className="text-sm text-text-2">{t('settings.twoFactorDisableHint')}</p>
          <Input label={t('auth.password')} type="password" autoComplete="current-password" value={twoFactorPassword} onChange={(e) => setTwoFactorPassword(e.target.value)} error={twoFactorError} />
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" disabled={twoFactorBusy} onClick={() => closeTwoFactor()}>{t('common.cancel')}</Button><Button type="submit" variant="danger" loading={twoFactorBusy}>{t('settings.twoFactorDisable')}</Button></div>
        </form>}
        {twoFactorStep === 'recovery' && <div className="space-y-4">
          <p className="text-sm text-text-2">{t('settings.twoFactorRecoveryHint')}</p>
          <ul className="grid grid-cols-2 gap-2 rounded-lg bg-surface-2 p-3 font-mono text-sm" dir="ltr">{recoveryCodes.map((code) => <li key={code}>{code}</li>)}</ul>
          <div className="flex justify-end"><Button onClick={closeTwoFactor}>{t('common.close')}</Button></div>
        </div>}
      </Modal>
    </Page>
  );
}
