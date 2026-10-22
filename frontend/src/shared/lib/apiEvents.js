// Tiny event bus so the HTTP layer can report global problems (expired session, 429, 500)
// without importing any React code. A top-level hook turns them into localized toasts.
const listeners = new Set();
export const apiEvents = {
  on: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
  emit: (event) => listeners.forEach((fn) => fn(event)),
};
