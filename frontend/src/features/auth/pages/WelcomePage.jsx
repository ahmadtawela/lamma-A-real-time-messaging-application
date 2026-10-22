import { Link } from 'react-router-dom';
import { useLanguage } from '@/shared/context/LanguageProvider';
import Logo from '@/shared/ui/Logo';
import Button from '@/shared/ui/Button';
import LanguageSwitcher from '@/shared/components/LanguageSwitcher';

export default function WelcomePage() {
  const { t } = useLanguage();
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div className="max-w-sm space-y-6">
        <div className="flex justify-center"><Logo variant="lockup" className="h-56 w-auto" /></div>
        <p className="text-lg text-text-2">{t('common.tagline')}</p>
        <div className="flex flex-col gap-2"><Link to="/login"><Button size="lg" className="w-full">{t('auth.login')}</Button></Link><Link to="/register"><Button size="lg" variant="secondary" className="w-full">{t('auth.register')}</Button></Link></div>
        <div className="flex justify-center"><LanguageSwitcher /></div>
      </div>
    </main>
  );
}
