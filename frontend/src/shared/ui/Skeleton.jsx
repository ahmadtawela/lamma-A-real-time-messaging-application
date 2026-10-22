export default function Skeleton({ className = 'h-4 w-full' }) {
  return <div className={`lm-skeleton rounded-md ${className}`} aria-hidden />;
}
