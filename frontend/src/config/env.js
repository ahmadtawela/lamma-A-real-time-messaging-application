// Public values only (VITE_*). Secrets such as APP_KEY or the Reverb secret never belong here.
export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? '',
  // The real API is the default; opt into the in-memory adapter explicitly for demos.
  useMocks: import.meta.env.VITE_USE_MOCKS === 'true',
  reverb: {
    key: import.meta.env.VITE_REVERB_APP_KEY,
    host: import.meta.env.VITE_REVERB_HOST ?? 'localhost',
    port: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
    scheme: import.meta.env.VITE_REVERB_SCHEME ?? 'http',
  },
};
