// Development-only stand-in for Laravel Reverb. It emits the SAME event names/payloads the Laravel
// broadcasts will use. It is only loaded when VITE_USE_MOCKS is on and is never part of the final design.
const listeners = new Set();
export const mockBus = {
  on: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
  emit: (event, payload) => listeners.forEach((fn) => fn(event, payload)),
};
