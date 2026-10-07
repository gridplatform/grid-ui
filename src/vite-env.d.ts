/// <reference types="vite/client" />

declare const __GRID_UI_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_GRID_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
