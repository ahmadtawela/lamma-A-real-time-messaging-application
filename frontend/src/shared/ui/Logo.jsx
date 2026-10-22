import { useLanguage } from '@/shared/context/LanguageProvider';

/**
 * variant="mark"    -> the bubble symbol only (sidebar, headers, avatars)
 * variant="inline"  -> symbol + live text wordmark (translatable: Lamma / لمّة)
 * variant="lockup"  -> official stacked logo image (welcome / auth screens); theme-aware
 */
export default function Logo({ variant = 'mark', className = 'h-8 w-8' }) {
  const { t } = useLanguage();
  const name = t('common.appName');
  if (variant === 'lockup') {
    return (
      <>
        <img src="/brand/lamma-lockup-light.png" alt={name} className={`lm-logo-light ${className}`} />
        <img src="/brand/lamma-lockup-dark.png" alt={name} className={`lm-logo-dark ${className}`} />
      </>
    );
  }
  if (variant === 'inline') {
    return (
      <span className="inline-flex items-center gap-2">
        <img src="/brand/lamma-mark.png" alt="" aria-hidden className={className} />
        <span className="text-xl font-bold tracking-tight">{name}</span>
      </span>
    );
  }
  return <img src="/brand/lamma-mark.png" alt={name} className={className} />;
}
