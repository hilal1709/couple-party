/// <reference types="vite/client" />

declare const __APP_VERSION__: string

interface ImportMetaEnv {
  /** server TURN untuk voice chat Sunyi saat dua HP beda jaringan (opsional, dipisah koma) */
  readonly VITE_TURN_URL?: string
  readonly VITE_TURN_USER?: string
  readonly VITE_TURN_PASS?: string
}
