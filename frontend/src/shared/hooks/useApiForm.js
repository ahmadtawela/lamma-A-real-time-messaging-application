import { useState } from 'react';
import { ApiError } from '@/shared/lib/apiError';

/** Laravel-friendly form state. 422 -> field errors (errors.email), 429/others -> formError. */
export function useApiForm(initial, submitFn) {
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (name) => (e) => setValues((v) => ({ ...v, [name]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }));
  const submit = async (e) => {
    e?.preventDefault();
    setBusy(true); setError(null);
    try { return await submitFn(values); }
    catch (err) { setError(err instanceof ApiError ? err : new ApiError({ message: err.message })); return undefined; }
    finally { setBusy(false); }
  };
  return { values, setValues, set, busy, error, field: (n) => error?.field(n), submit, formError: error && !error.isValidation ? error : null };
}
