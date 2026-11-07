import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.couple.party',
  appName: 'Couple Party',
  webDir: 'dist',
  // build QA (scripts/qa-apk.mjs): WebView bisa di-debug lewat adb untuk mengukur FPS/memori
  android: { backgroundColor: '#1a1433', webContentsDebuggingEnabled: process.env.VITE_QA === '1' },
}

export default config
