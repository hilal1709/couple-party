// Build web → sync ke Android → gradle assembleRelease (ditandatangani kunci rilis) → salin APK ke root proyek.
import { execSync } from 'node:child_process'
import { copyFileSync, readFileSync } from 'node:fs'

const run = (cmd, cwd = '.') => execSync(cmd, { cwd, stdio: 'inherit' })
const { version } = JSON.parse(readFileSync('package.json', 'utf8'))

run('npm run build')
run('npx cap sync android')
run(process.platform === 'win32' ? '.\\gradlew.bat assembleRelease -q' : './gradlew assembleRelease -q', 'android')
copyFileSync('android/app/build/outputs/apk/release/app-release.apk', 'CoupleParty.apk')
console.log(`\nAPK siap: CoupleParty.apk (versi ${version})`)
