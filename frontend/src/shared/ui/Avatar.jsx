const SIZES = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg' };
const HUES = [262, 200, 160, 24, 330, 48];

export default function Avatar({ name = '', src, size = 'md', online, label }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => [...w][0]).join('');
  const hue = HUES[[...name].reduce((a, c) => a + c.codePointAt(0), 0) % HUES.length];
  return (
    <span className={`relative inline-flex shrink-0 ${SIZES[size]}`}>
      {src ? (
        <img src={src} alt={name} loading="lazy" className="h-full w-full rounded-full object-cover" />
      ) : (
        <span className="grid h-full w-full place-items-center rounded-full font-semibold text-white" style={{ background: `hsl(${hue} 45% 45%)` }} aria-hidden>{initials}</span>
      )}
      {online !== undefined && (
        <span role="img" aria-label={label}
          className={`absolute bottom-0 end-0 h-3 w-3 rounded-full border-2 border-surface ${online ? 'bg-success lm-online' : 'bg-text-2'}`} />
      )}
    </span>
  );
}
