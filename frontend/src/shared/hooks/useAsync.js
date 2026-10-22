import { useCallback, useEffect, useState } from 'react';
/** Loads data from a service on mount / when deps change. Returns { status: loading|ready|error, data, error, reload, setData }. */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const run = useCallback(() => { setState((s) => ({ ...s, status: 'loading' })); return fn().then((res) => setState({ status: 'ready', data: res.data ?? res, error: null })).catch((error) => setState({ status: 'error', data: null, error })); }, deps); // eslint-disable-line
  useEffect(() => { run(); }, [run]);
  return { ...state, reload: run, setData: (updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })) };
}
