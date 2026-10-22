import { useLanguage } from '@/shared/context/LanguageProvider';
import Modal from '@/shared/ui/Modal';
import Button from '@/shared/ui/Button';

export default function ConfirmModal({ open, title, message, confirmLabel, danger = true, onConfirm, onClose, busy }) {
  const { t } = useLanguage();
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="mb-4 text-sm text-text-2">{message}</p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant={danger ? 'danger' : 'primary'} loading={busy} onClick={onConfirm}>{confirmLabel ?? t('common.confirm')}</Button>
      </div>
    </Modal>
  );
}
