export default function Tabs({ tabs, value, onChange, className = '' }) {
  return (
    <div role="tablist" className={`flex gap-1 overflow-x-auto ${className}`}>
      {tabs.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}
          className={`shrink-0 rounded-full px-3 py-1 text-sm ${value === t.value ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-text-2 hover:text-text-1'}`}>{t.label}</button>
      ))}
    </div>
  );
}
