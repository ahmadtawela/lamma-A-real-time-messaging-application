import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/shared/context/ThemeProvider';
import { useLanguage } from '@/shared/context/LanguageProvider';

const OPTIONS = [['light', Sun, 'common.themeLight'], ['dark', Moon, 'common.themeDark'], ['system', Monitor, 'common.themeSystem']];

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();
  return (
    <div className="inline-flex rounded-lg border border-border bg-surface p-0.5" role="group" aria-label={t('common.theme')}>
      {OPTIONS.map(([id, Icon, key]) => (
        <button key={id} onClick={() => setTheme(id)} aria-pressed={theme === id} aria-label={t(key)} title={t(key)}
          className={`rounded-md p-1.5 transition ${theme === id ? 'bg-accent text-accent-fg' : 'text-text-2 hover:bg-surface-2'}`}>
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
