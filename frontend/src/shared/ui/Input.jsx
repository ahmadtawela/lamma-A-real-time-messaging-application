import { forwardRef, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';

/** `error` takes the first message of a Laravel 422 `errors[field]` array. */
const Input = forwardRef(function Input({ label, error, success, type = 'text', className = '', ...props }, ref) {
  const id = useId();
  const { t } = useLanguage();
  const [shown, setShown] = useState(false);
  const isPassword = type === 'password';
  const tone = error ? 'border-danger' : success ? 'border-success' : 'border-border focus-within:border-accent';

  return (
    <div className={className}>
      {label && <label htmlFor={id} className="mb-1.5 block text-sm font-medium">{label}</label>}
      <div className={`flex items-center rounded-lg border bg-surface transition ${tone} ${props.disabled ? 'opacity-50' : ''}`}>
        <input
          ref={ref} id={id} type={isPassword && shown ? 'text' : type}
          aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined}
          className="h-10 w-full bg-transparent px-3 text-start outline-none placeholder:text-text-2"
          {...props}
        />
        {isPassword && (
          <button type="button" onClick={() => setShown((s) => !s)} className="px-3 text-text-2 hover:text-text-1"
            aria-label={t(shown ? 'auth.hidePassword' : 'auth.showPassword')}>
            {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error && <p id={`${id}-err`} className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
});
export default Input;
