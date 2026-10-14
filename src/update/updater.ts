import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'

/** Repo publik tempat APK dirilis lewat GitHub Releases. */
export const RELEASE_REPO = 'hilal1709/couple-party'

/** Versi web bundle ini, disuntik Vite dari package.json. */
export const APP_VERSION: string = __APP_VERSION__

type ApkUpdaterPlugin = {
  currentVersion(): Promise<{ versionName: string; versionCode: number }>
  canInstall(): Promise<{ allowed: boolean }>
  openInstallSettings(): Promise<void>
  downloadAndInstall(o: { url: string }): Promise<{ bytes: number }>
  addListener(event: 'progress', cb: (e: { progress: number }) => void): Promise<PluginListenerHandle>
}

export const ApkUpdater = registerPlugin<ApkUpdaterPlugin>('ApkUpdater')

export type Release = { version: string; notes: string; apkUrl: string; sizeMb: number }

/** Bandingkan versi semver sederhana "1.2.3". Positif kalau a > b. */
export function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map(Number)
  const pb = b.replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d) return d
  }
  return 0
}

/** Rilis terbaru di GitHub, atau null kalau gagal / tidak ada APK. */
export async function fetchLatest(): Promise<Release | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${RELEASE_REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      tag_name: string
      body?: string
      assets: { name: string; browser_download_url: string; size: number }[]
    }
    const apk = data.assets.find((a) => a.name.endsWith('.apk'))
    if (!apk) return null
    return {
      version: data.tag_name.replace(/^v/, ''),
      notes: data.body ?? '',
      apkUrl: apk.browser_download_url,
      sizeMb: Math.round((apk.size / 1024 / 1024) * 10) / 10,
    }
  } catch {
    return null
  }
}

export async function installedVersion(): Promise<string> {
  if (!Capacitor.isNativePlatform()) return APP_VERSION
  try {
    return (await ApkUpdater.currentVersion()).versionName
  } catch {
    return APP_VERSION
  }
}
