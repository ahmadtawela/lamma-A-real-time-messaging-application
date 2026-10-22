// Public values only (VITE_*). Secrets such as APP_KEY or the Reverb secret never belong here.
export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? '',
  // Mocks are ON by default for frontend development. Set VITE_USE_MOCKS=false to talk to Laravel.
  useMocks: import.meta.env.VITE_USE_MOCKS !== 'false',
  reverb: {
    key: import.meta.env.VITE_REVERB_APP_KEY,
    host: import.meta.env.VITE_REVERB_HOST ?? 'localhost',
    port: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
    scheme: import.meta.env.VITE_REVERB_SCHEME ?? 'http',
  },
};
