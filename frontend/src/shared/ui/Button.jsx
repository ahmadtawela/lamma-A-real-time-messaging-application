const VARIANTS = {
  primary: 'bg-accent text-accent-fg hover:brightness-110',
  secondary: 'bg-surface-2 text-text-1 hover:brightness-95 border border-border',
  ghost: 'text-text-1 hover:bg-surface-2',
  danger: 'bg-danger text-white hover:brightness-110',
};
const SIZES = { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-base' };

export default function Button({ variant = 'primary', size = 'md', loading = false, disabled, children, className = '', ...props }) {
  return (
    <button
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  );
}
