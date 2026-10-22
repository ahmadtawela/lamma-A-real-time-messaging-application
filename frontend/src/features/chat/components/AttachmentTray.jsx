import { File as FileIcon, X, RotateCw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';

export default function AttachmentTray({ items, onCancel, onRetry }) {
  const { t, formatBytes, formatNumber } = useLanguage();
  if (!items.length) return null;
  return (
    <ul className="flex gap-2 overflow-x-auto border-t border-border bg-surface p-2" aria-label={t('chat.attachments')}>
      {items.map((i) => (
        <li key={i.id} className="relative flex w-44 shrink-0 items-center gap-2 rounded-lg border border-border bg-surface-2 p-2">
          {i.previewUrl && i.file.type.startsWith('image/') ? <img src={i.previewUrl} alt="" className="h-10 w-10 rounded object-cover" />
            : i.previewUrl ? <video src={i.previewUrl} className="h-10 w-10 rounded object-cover" muted /> : <span className="grid h-10 w-10 place-items-center rounded bg-surface"><FileIcon className="h-5 w-5" /></span>}
          <span className="min-w-0 flex-1">
            <bdi className="block truncate text-xs font-medium">{i.file.name}</bdi>
            <span className="flex items-center gap-1 text-[11px] text-text-2">
              {i.status === 'uploading' && <>{formatNumber(i.progress)}%</>}
              {i.status === 'processing' && <><Loader2 className="h-3 w-3 animate-spin" />{t('chat.processing')}</>}
              {i.status === 'completed' && <><CheckCircle2 className="h-3 w-3 text-success" />{formatBytes(i.file.size)}</>}
              {i.status === 'failed' && <><AlertCircle className="h-3 w-3 text-danger" />{t('chat.uploadFailed')}</>}
            </span>
            {i.status === 'uploading' && <span className="mt-1 block h-1 overflow-hidden rounded bg-border"><span className="block h-full bg-accent transition-all" style={{ width: `${i.progress}%` }} /></span>}
          </span>
          {i.status === 'failed' && <button onClick={() => onRetry(i.id)} aria-label={t('common.retry')} className="rounded p-1 hover:bg-surface"><RotateCw className="h-4 w-4" /></button>}
          <button onClick={() => onCancel(i.id)} aria-label={t('chat.cancelUpload')} className="absolute -top-1.5 -end-1.5 rounded-full bg-surface p-0.5 shadow ring-1 ring-border"><X className="h-3 w-3" /></button>
        </li>
      ))}
    </ul>
  );
}
