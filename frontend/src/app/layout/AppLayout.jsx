import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, useMatch } from 'react-router-dom';
import ErrorBoundary from '@/app/ErrorBoundary';
import { MessageCircle, Users, Contact, CircleDot, Phone, Bell, Settings, UserCircle, Search, Shield, WifiOff, Languages } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useChatStore } from '@/features/chat/store/chatStore';
import { useUsersStore } from '@/features/users/store/usersStore';
import { useUiStore } from '@/shared/store/uiStore';
import { useNotificationsStore } from '@/features/notifications/store/notificationsStore';
import { useSettingsStore } from '@/features/settings/store/settingsStore';
import { messageService } from '@/features/chat/services/messageService';
import { useStarredStore } from '@/features/chat/store/starredStore';
import { useRealtimeBootstrap } from '@/app/hooks/useRealtimeBootstrap';
import { useApplySettings } from '@/features/settings/hooks/useApplySettings';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import Logo from '@/shared/ui/Logo';
import Avatar from '@/shared/ui/Avatar';
import { NewChatModal, NewGroupModal, ForwardModal, ReportModal, MediaViewer } from '@/features/chat/components/ChatModals';
import CallOverlay from '@/features/calls/components/CallOverlay';
import SearchModal from '@/features/search/components/SearchModal';

const NAV = [['/app', MessageCircle, 'nav.chats', true], ['/app/groups', Users, 'nav.groups'], ['/app/contacts', Contact, 'nav.contacts'], ['/app/status', CircleDot, 'nav.status'], ['/app/calls', Phone, 'nav.calls'], ['/app/notifications', Bell, 'nav.notifications'], ['/app/settings', Settings, 'nav.settings'], ['/app/profile', UserCircle, 'nav.profile']];

export default function AppLayout() {
  const { t, language, setLanguage } = useLanguage();
  const user = useAuthStore((s) => s.user);
  const unreadChats = useChatStore((s) => s.conversations.reduce((n, c) => n + (c.is_muted ? 0 : c.unread_count), 0));
  const unreadNotifs = useNotificationsStore((s) => s.items.filter((n) => !n.read_at).length);
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);
  const inChat = useMatch('/app/chat/:id');
  const online = useOnlineStatus();
  const location = useLocation();
  useRealtimeBootstrap(); useApplySettings();

  useEffect(() => {
    useUsersStore.getState().load(); useNotificationsStore.getState().load();
    useSettingsStore.getState().hydrate(user.settings);                       // privacy options live on the server
    messageService.starred().then(({ data }) => useStarredStore.getState().setIds(data.map((m) => m.id))).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (user.locale && user.locale !== language) setLanguage(user.locale); /* eslint-disable-next-line */ }, [user.id]);
  useEffect(() => { const k = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(true); } }; addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, [setSearchOpen]);

  const badge = (n) => (n > 0 ? <span className="absolute -top-1 -end-1 min-w-4 rounded-full bg-danger px-1 text-[10px] font-bold leading-4 text-white">{n > 99 ? '99+' : n}</span> : null);
  const item = 'relative grid h-11 w-11 shrink-0 place-items-center rounded-xl text-text-2 transition hover:bg-surface-2 hover:text-text-1';
  return (
    <div className="flex h-dvh flex-col bg-bg">
      {!online && <div role="alert" className="flex items-center justify-center gap-2 bg-warning px-3 py-1 text-sm font-medium text-black"><WifiOff className="h-4 w-4" />{t('common.offline')}</div>}
      <div className="flex min-h-0 flex-1 flex-col-reverse md:flex-row">
        <nav aria-label={t('nav.main')} className={`flex shrink-0 items-center gap-1 overflow-x-auto border-border bg-surface p-1 md:w-[68px] md:flex-col md:overflow-visible md:border-e md:py-3 ${inChat ? 'hidden md:flex' : 'border-t md:border-t-0'}`} style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}>
          <div className="hidden md:block"><Logo className="mb-3 h-9 w-9" /></div>
          {NAV.map(([to, Icon, key, end]) => (
            <NavLink key={to} to={to} end={end} title={t(key)} aria-label={t(key)} className={({ isActive }) => `${item} ${isActive ? '!bg-accent/10 !text-accent' : ''}`}>
              <Icon className="h-5 w-5" />{to === '/app' && badge(unreadChats)}{to === '/app/notifications' && badge(unreadNotifs)}
            </NavLink>
          ))}
          <button onClick={() => setSearchOpen(true)} title={t('search.title')} aria-label={t('search.title')} className={item}><Search className="h-5 w-5" /></button>
          <div className="mx-1 md:mt-auto md:mx-0" />
          <button onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')} title={t('common.language')} aria-label={`${t('common.language')}: ${language === 'ar' ? 'English' : 'العربية'}`} className={item}><Languages className="h-5 w-5" /></button>
          {user.is_admin && <NavLink to="/admin" title={t('nav.admin')} aria-label={t('nav.admin')} className={item}><Shield className="h-5 w-5" /></NavLink>}
          <NavLink to="/app/profile" className="hidden md:block" aria-label={t('nav.profile')}><Avatar name={user.name} src={user.avatar_url} size="sm" online label={t('chat.online')} /></NavLink>
        </nav>
        <main className="min-h-0 min-w-0 flex-1"><ErrorBoundary resetKey={location.pathname}><Outlet /></ErrorBoundary></main>
      </div>
      <NewChatModal /><NewGroupModal /><ForwardModal /><ReportModal /><MediaViewer /><SearchModal /><CallOverlay />
    </div>
  );
}
