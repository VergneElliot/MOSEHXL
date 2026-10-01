/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_REPORT_DEV_ERRORS?: string;
  readonly VITE_CLIENT_ERROR_REPORT_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
