// APK uji (QA) Puncak: build rilis biasa + VITE_QA=1 (rute ?demo= & window.__puncak aktif, WebView bisa di-debug).
// Ditandatangani kunci rilis yang sama, jadi bisa dipasang menimpa app di HP tanpa menghapus data (adb install -r).
// Jangan diunggah sebagai rilis: `npm run release` membangun ulang tanpa VITE_QA.
// Pakai: node scripts/qa-apk.mjs  →  CoupleParty-QA.apk
import { execSync } from 'node:child_process'
import { copyFileSync } from 'node:fs'

const env = { ...process.env, VITE_QA: '1' }
const run = (cmd, cwd = '.') => execSync(cmd, { cwd, stdio: 'inherit', env })
run('npx vite build')
run('npx cap sync android')
run(process.platform === 'win32' ? '.\\gradlew.bat assembleRelease -q' : './gradlew assembleRelease -q', 'android')
copyFileSync('android/app/build/outputs/apk/release/app-release.apk', 'CoupleParty-QA.apk')
console.log('\nAPK uji siap: CoupleParty-QA.apk (QA, bukan untuk rilis)')
