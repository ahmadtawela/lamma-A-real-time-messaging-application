import { useId } from 'react';
export default function Select({ label, value, onChange, options, className = '' }) {
  const id = useId();
  return (
    <div className={className}>
      {label && <label htmlFor={id} className="mb-1.5 block text-sm font-medium">{label}</label>}
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-start outline-none focus:border-accent">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
