export default function Badge({ children, tone = 'accent' }) {
  const tones = { accent: 'bg-accent text-accent-fg', danger: 'bg-danger text-white', muted: 'bg-surface-2 text-text-2' };
  return <span className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}
