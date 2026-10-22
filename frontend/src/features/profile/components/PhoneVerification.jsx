import { useEffect, useState } from 'react';
import { BadgeCheck, Phone as PhoneIcon, Trash2 } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageProvider';
import { useToast } from '@/shared/context/ToastProvider';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useUsersStore } from '@/features/users/store/usersStore';
import { useSettingsStore } from '@/features/settings/store/settingsStore';
import { userService } from '@/features/users/services/userService';
import PhoneInput from '@/shared/ui/PhoneInput';
import Input from '@/shared/ui/Input';
import Button from '@/shared/ui/Button';
import Toggle from '@/shared/ui/Toggle';
import ConfirmModal from '@/shared/ui/ConfirmModal';

/** Add / verify / remove the phone number. Flow: enter number → SMS code (6 digits, 10 min, 5 tries) → verified. Only verified numbers can be found by contacts. */
export default function PhoneVerification() {
  const { t, formatNumber } = useLanguage();
  const toast = useToast();
  const user = useAuthStore((s) => s.user); const patchUser = useAuthStore((s) => s.patchUser); const upsert = useUsersStore((s) => s.upsert);
  const { phoneDiscoverable, setPrivacy } = useSettingsStore();
  const [step, setStep] = useState(user.phone_verified ? 'verified' : 'enter');          // enter | code | verified
  const [phone, setPhone] = useState({ e164: null, valid: false }); const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(null); const [wait, setWait] = useState(0); const [confirm, setConfirm] = useState(false);

  useEffect(() => { if (wait <= 0) return undefined; const id = setTimeout(() => setWait((w) => w - 1), 1000); return () => clearTimeout(id); }, [wait]);
  const fail = (e) => setError(e.status === 429 ? t('errors.tooMany') : e.field?.('phone') ? t('phone.cannotUse') : e.field?.('code') ? t('auth.codeInvalid') : t('errors.generic'));

  const send = async () => {
    setBusy(true); setError(null);
    try { const r = await userService.requestPhoneCode(phone.e164); setStep('code'); setWait(r.resend_in ?? 60); setCode(''); } catch (e) { fail(e); } finally { setBusy(false); }
  };
  const verify = async (e) => {
    e.preventDefault(); setBusy(true); setError(null);
    try { const { data } = { data: await userService.verifyPhone(code) }; const u = data.data ?? data; patchUser(u); upsert(u); setStep('verified'); toast(t('phone.verified'), 'success'); } catch (er) { fail(er); } finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true);
    try { const u = await userService.removePhone(); patchUser(u.data ?? u); setStep('enter'); setConfirm(false); } catch (e) { fail(e); } finally { setBusy(false); }
  };

  return (
    <section className="mb-4 rounded-xl border border-border bg-surface p-5" aria-label={t('phone.title')}>
      <h2 className="mb-1 flex items-center gap-2 font-semibold"><PhoneIcon className="h-4 w-4" />{t('phone.title')}</h2>
      <p className="mb-3 text-sm text-text-2">{t('phone.hint')}</p>

      {step === 'verified' && (
        <div className="space-y-3">
          <p className="flex items-center gap-2"><bdi dir="ltr" className="font-medium">{user.phone}</bdi><span className="inline-flex items-center gap-1 rounded bg-success/15 px-1.5 text-xs text-success"><BadgeCheck className="h-3.5 w-3.5" />{t('phone.verifiedBadge')}</span></p>
          <div className="flex items-center justify-between gap-4 text-sm"><span>{t('settings.phoneDiscoverable')}<span className="block text-xs text-text-2">{t('settings.phoneDiscoverableHint')}</span></span><Toggle label={t('settings.phoneDiscoverable')} checked={phoneDiscoverable} onChange={(v) => setPrivacy({ phoneDiscoverable: v })} /></div>
          <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => setStep('enter')}>{t('phone.change')}</Button><Button size="sm" variant="ghost" onClick={() => setConfirm(true)}><Trash2 className="h-4 w-4" />{t('phone.remove')}</Button></div>
        </div>
      )}

      {step === 'enter' && (
        <div className="space-y-3">
          <PhoneInput label={t('phone.label')} onChange={setPhone} error={error} />
          <Button onClick={send} loading={busy} disabled={!phone.valid}>{t('phone.sendCode')}</Button>
        </div>
      )}

      {step === 'code' && (
        <form onSubmit={verify} className="space-y-3" noValidate>
          <p className="text-sm">{t('phone.codeSentTo')} <bdi dir="ltr" className="font-medium">{phone.e164}</bdi></p>
          <Input label={t('auth.code')} dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} error={error} />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" loading={busy} disabled={code.length !== 6}>{t('auth.verify')}</Button>
            <Button type="button" variant="ghost" disabled={wait > 0 || busy} onClick={send}>{wait > 0 ? t('phone.resendIn', { seconds: formatNumber(wait) }) : t('phone.resend')}</Button>
            <Button type="button" variant="ghost" onClick={() => { setStep('enter'); setError(null); }}>{t('phone.change')}</Button>
          </div>
          <p className="text-xs text-text-2">{t('phone.demoCode')}</p>
        </form>
      )}
      <ConfirmModal open={confirm} busy={busy} title={t('phone.remove')} message={t('phone.removeConfirm')} onClose={() => setConfirm(false)} onConfirm={remove} />
    </section>
  );
}
