import { Link } from 'react-router-dom';
import { useLanguage } from '@/shared/context/LanguageProvider';
import Logo from '@/shared/ui/Logo';
import Button from '@/shared/ui/Button';

export default function NotFound() {
  const { t } = useLanguage();
  return <main className="grid min-h-dvh place-items-center p-6 text-center"><div><Logo className="mx-auto mb-4 h-16 w-16" /><h1 className="text-2xl font-bold">404</h1><p className="mb-4 text-text-2">{t('errors.notFound')}</p><Link to="/app"><Button>{t('chat.backToChats')}</Button></Link></div></main>;
}
