import { Capacitor, registerPlugin } from '@capacitor/core'

type KartUnityPlugin = {
  isAvailable(): Promise<{ available: boolean }>
  start(): Promise<{ finished: boolean; result: string | null }>
}

export const KartUnity = registerPlugin<KartUnityPlugin>('KartUnity')

export const hasKartUnity = () => Capacitor.isNativePlatform()
