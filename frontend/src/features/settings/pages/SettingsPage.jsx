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
import Page from '@/shared/ui/Page';
import Toggle from '@/shared/ui/Toggle';
import Select from '@/shared/ui/Select';
import Button from '@/shared/ui/Button';
import Avatar from '@/shared/ui/Avatar';
import ConfirmModal from '@/shared/ui/ConfirmModal';
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
  const [blocked, setBlocked] = useState(null); const [devices, setDevices] = useState([{ id: 1, name: 'Chrome · Windows', current: true, at: 'now' }, { id: 2, name: 'Lamma · iPhone', at: '2d' }, { id: 3, name: 'Firefox · Linux', at: '9d' }]);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { if (section === 'blocked' && !blocked) contactService.list().then(({ data }) => setBlocked(data.filter((u) => u.is_blocked))).catch(() => setBlocked([])); }, [section, blocked]);
  const T = (k) => <Toggle checked={s[k]} onChange={(x) => ((k === 'readReceipts' || k === 'phoneDiscoverable') ? s.setPrivacy({ [k]: x }) : s.set({ [k]: x }))} label={t(`settings.${k}`)} />;
  const vis = ['everyone', 'contacts', 'nobody'].map((v) => ({ value: v, label: t(`settings.vis_${v}`) }));
  const pane = {
    account: <><Row label={t('auth.email')}><bdi dir="ltr" className="text-sm text-text-2">{user.email}</bdi></Row><Row label={t('profile.phone')}><bdi dir="ltr" className="text-sm text-text-2">{user.phone}</bdi></Row>
      <Row label={t('auth.logout')}><Button size="sm" variant="secondary" onClick={async () => { await logout(); reset(); navigate('/login'); }}><LogOut className="h-4 w-4 rtl:-scale-x-100" />{t('auth.logout')}</Button></Row>
      <Row label={t('settings.deleteAccount')} hint={t('settings.deleteAccountHint')}><Button size="sm" variant="danger" onClick={() => setConfirm(true)}>{t('chat.delete')}</Button></Row></>,
    privacy: <><Row label={t('settings.lastSeenVisibility')}><Select value={s.lastSeenVisibility} onChange={(v) => s.setPrivacy({ lastSeenVisibility: v })} options={vis} /></Row>
      <Row label={t('settings.profilePhotoVisibility')}><Select value={s.profilePhotoVisibility} onChange={(v) => s.setPrivacy({ profilePhotoVisibility: v })} options={vis} /></Row>
      <Row label={t('settings.aboutVisibility')}><Select value={s.aboutVisibility} onChange={(v) => s.setPrivacy({ aboutVisibility: v })} options={vis} /></Row>
      <Row label={t('settings.statusPrivacy')}><Select value={s.statusPrivacy} onChange={(v) => s.set({ statusPrivacy: v })} options={vis.slice(0, 2)} /></Row>
      <Row label={t('settings.readReceipts')} hint={t('settings.readReceiptsHint')}>{T('readReceipts')}</Row>
      <Row label={t('settings.phoneDiscoverable')} hint={t('settings.phoneDiscoverableHint')}>{T('phoneDiscoverable')}</Row></>,
    security: <><Row label={t('settings.twoFactor')} hint={t('settings.twoFactorHint')}>{T('twoFactor')}</Row><Row label={t('profile.changePassword')}><Button size="sm" variant="secondary" onClick={() => navigate('/app/profile')}>{t('profile.changePassword')}</Button></Row>
      <p className="mt-3 rounded-lg bg-surface-2 p-3 text-xs text-text-2">{t('chat.encryptionInfo')}</p></>,
    notifications: <>{['notifMessages', 'notifGroups', 'notifCalls', 'notifPreview', 'notifSound'].map((k) => <Row key={k} label={t(`settings.${k}`)}>{T(k)}</Row>)}</>,
    appearance: <><Row label={t('common.theme')}><ThemeSwitcher /></Row><Row label={t('common.language')}><LanguageSwitcher /></Row>
      <Row label={t('settings.wallpaper')}><Select value={s.wallpaper} onChange={(v) => s.set({ wallpaper: v })} options={['plain', 'dots', 'gradient'].map((v) => ({ value: v, label: t(`settings.wp_${v}`) }))} /></Row>
      <Row label={t('settings.fontSize')}><Select value={s.fontSize} onChange={(v) => s.set({ fontSize: v })} options={['sm', 'md', 'lg', 'xl'].map((v) => ({ value: v, label: t(`settings.fs_${v}`) }))} /></Row></>,
    chats: <><Row label={t('settings.enterToSend')} hint={t('settings.enterToSendHint')}>{T('enterToSend')}</Row>
      <Row label={t('settings.autoDownload')}><Select value={s.autoDownload} onChange={(v) => s.set({ autoDownload: v })} options={['always', 'wifi', 'never'].map((v) => ({ value: v, label: t(`settings.ad_${v}`) }))} /></Row>
      <Row label={t('settings.wallpaper')}><Select value={s.wallpaper} onChange={(v) => s.set({ wallpaper: v })} options={['plain', 'dots', 'gradient'].map((v) => ({ value: v, label: t(`settings.wp_${v}`) }))} /></Row>
      <Row label={t('settings.fontSize')}><Select value={s.fontSize} onChange={(v) => s.set({ fontSize: v })} options={['sm', 'md', 'lg', 'xl'].map((v) => ({ value: v, label: t(`settings.fs_${v}`) }))} /></Row></>,
    storage: <div className="space-y-3 py-2">{[['settings.stMedia', 412e6], ['settings.stFiles', 128e6], ['settings.stVoice', 34e6]].map(([k, b]) => (
      <div key={k}><div className="mb-1 flex justify-between text-sm"><span>{t(k)}</span><bdi>{formatBytes(b)}</bdi></div><div className="h-2 overflow-hidden rounded bg-border"><div className="h-full bg-accent" style={{ width: `${Math.min(100, b / 5e6)}%` }} /></div></div>))}
      <Button variant="secondary" onClick={() => toast(t('settings.cacheCleared'), 'success')}>{t('settings.clearCache')}</Button></div>,
    dataUsage: <><Row label={t('settings.dataSaver')} hint={t('settings.dataSaverHint')}>{T('dataSaver')}</Row><Row label={t('settings.autoDownload')}><Select value={s.autoDownload} onChange={(v) => s.set({ autoDownload: v })} options={['always', 'wifi', 'never'].map((v) => ({ value: v, label: t(`settings.ad_${v}`) }))} /></Row></>,
    language: <div className="py-4"><LanguageSwitcher /><p className="mt-3 text-xs text-text-2">{t('settings.languageHint')}</p></div>,
    accessibility: <><Row label={t('settings.reduceMotion')} hint={t('settings.reduceMotionHint')}>{T('reduceMotion')}</Row><Row label={t('settings.highContrast')}>{T('highContrast')}</Row>
      <Row label={t('settings.fontSize')}><Select value={s.fontSize} onChange={(v) => s.set({ fontSize: v })} options={['sm', 'md', 'lg', 'xl'].map((v) => ({ value: v, label: t(`settings.fs_${v}`) }))} /></Row></>,
    devices: <ul>{devices.map((d) => <li key={d.id} className="flex items-center gap-3 border-b border-border py-3 last:border-0"><Monitor className="h-5 w-5 text-text-2" /><span className="flex-1 text-sm"><bdi>{d.name}</bdi>{d.current && <span className="ms-2 rounded bg-success/15 px-1.5 text-xs text-success">{t('settings.thisDevice')}</span>}</span>
      {!d.current && <Button size="sm" variant="secondary" onClick={() => { setDevices((l) => l.filter((x) => x.id !== d.id)); toast(t('settings.deviceRemoved'), 'success'); }}>{t('settings.logoutDevice')}</Button>}</li>)}</ul>,
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
      <ConfirmModal open={confirm} title={t('settings.deleteAccount')} message={t('settings.deleteAccountConfirm')} onClose={() => setConfirm(false)} onConfirm={async () => { await logout(); reset(); navigate('/register'); }} />
    </Page>
  );
}
