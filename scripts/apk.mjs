// Build web → sync ke Android → gradle assembleRelease (ditandatangani kunci rilis) → salin APK ke root proyek.
import { execSync } from 'node:child_process'
import { copyFileSync, existsSync, readFileSync } from 'node:fs'

const run = (cmd, cwd = '.') => execSync(cmd, { cwd, stdio: 'inherit' })
const { version } = JSON.parse(readFileSync('package.json', 'utf8'))

// Export Unity lama (±5 menit), jadi hanya saat belum ada atau diminta UNITY_EXPORT=1.
const unity = 'D:/Unity/Editor/6000.3.27f1/Editor/Unity.exe'
if (process.env.UNITY_EXPORT || !existsSync('android/unity-export/unityLibrary')) {
  run(`"${unity}" -batchmode -nographics -quit -buildTarget Android -projectPath kart-unity -executeMethod KartBuild.ExportAndroid -logFile -`)
}

run('npm run build')
run('npx cap sync android')
run(process.platform === 'win32' ? '.\\gradlew.bat assembleRelease -q' : './gradlew assembleRelease -q', 'android')
copyFileSync('android/app/build/outputs/apk/release/app-release.apk', 'CoupleParty.apk')
console.log(`\nAPK siap: CoupleParty.apk (versi ${version})`)
