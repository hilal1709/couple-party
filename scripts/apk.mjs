// Build web → sync ke Android → gradle assembleDebug → salin APK ke root proyek.
import { execSync } from 'node:child_process'
import { copyFileSync } from 'node:fs'

const run = (cmd, cwd = '.') => execSync(cmd, { cwd, stdio: 'inherit' })
run('npm run build')
run('npx cap sync android')
run(process.platform === 'win32' ? '.\\gradlew.bat assembleDebug -q' : './gradlew assembleDebug -q', 'android')
copyFileSync('android/app/build/outputs/apk/debug/app-debug.apk', 'CoupleParty.apk')
console.log('\nAPK siap: CoupleParty.apk')
