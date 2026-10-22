import { Component } from 'react';
import { useLanguage } from '@/shared/context/LanguageProvider';
import Button from '@/shared/ui/Button';

function Fallback({ error, onReset }) {
  const { t } = useLanguage();
  return (
    <div role="alert" className="grid min-h-[50vh] place-items-center p-6 text-center">
      <div className="max-w-md space-y-3">
        <h2 className="text-lg font-bold">{t('errors.generic')}</h2>
        <p className="break-words text-sm text-text-2" dir="ltr">{String(error?.message ?? error).slice(0, 300)}</p>
        <Button onClick={onReset}>{t('common.retry')}</Button>
      </div>
    </div>
  );
}

/** Catches render errors in a subtree and shows a retry screen instead of a blank page. */
export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('[Lamma] render error', error, info?.componentStack); }
  componentDidUpdate(prev) { if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null }); }
  render() { return this.state.error ? <Fallback error={this.state.error} onReset={() => this.setState({ error: null })} /> : this.props.children; }
}
