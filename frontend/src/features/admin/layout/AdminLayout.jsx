import { NavLink, Outlet, Link } from 'react-router-dom';
import { LayoutDashboard, Users, MessagesSquare, Flag, Settings, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';
import { useApplySettings } from '@/features/settings/hooks/useApplySettings';
import Logo from '@/shared/ui/Logo';
import LanguageSwitcher from '@/shared/components/LanguageSwitcher';
import ThemeSwitcher from '@/shared/components/ThemeSwitcher';
import DirIcon from '@/shared/ui/DirIcon';

const NAV = [['/admin', LayoutDashboard, 'admin.dashboard', true], ['/admin/users', Users, 'admin.users'], ['/admin/groups', MessagesSquare, 'admin.groups'], ['/admin/reports', Flag, 'admin.reports'], ['/admin/settings', Settings, 'admin.settings']];

export default function AdminLayout() {
  const { t } = useLanguage();
  useApplySettings();
  return (
    <div className="flex h-dvh flex-col bg-bg md:flex-row">
      <aside className="flex shrink-0 flex-col border-border bg-surface md:w-60 md:border-e">
        <div className="flex items-center justify-between gap-2 p-3 md:block"><Logo variant="inline" className="h-8 w-8" /><p className="hidden text-xs text-text-2 md:mt-1 md:block">{t('admin.console')}</p>
          <Link to="/app" className="flex items-center gap-1 text-sm text-accent md:mt-3"><DirIcon icon={ArrowLeft} className="h-4 w-4" />{t('admin.backToApp')}</Link></div>
        <nav aria-label={t('admin.console')} className="flex gap-1 overflow-x-auto p-2 md:flex-col">{NAV.map(([to, Icon, key, end]) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-accent/10 font-semibold text-accent' : 'hover:bg-surface-2'}`}><Icon className="h-4 w-4" />{t(key)}</NavLink>))}</nav>
        <div className="mt-auto hidden flex-col gap-2 p-3 md:flex"><LanguageSwitcher /><ThemeSwitcher /></div>
      </aside>
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 md:p-6"><Outlet /></main>
    </div>
  );
}
