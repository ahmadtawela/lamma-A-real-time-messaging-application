/** Wraps a lucide icon that conveys direction (back, forward, send) and mirrors it in RTL.
 *  Universal icons (search, camera, mic, settings) should NOT use this wrapper. */
export default function DirIcon({ icon: Icon, className = '', ...props }) {
  return <Icon className={`rtl:-scale-x-100 ${className}`} aria-hidden="true" {...props} />;
}
