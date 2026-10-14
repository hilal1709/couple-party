// Rilis versi baru yang bisa diunduh dari dalam aplikasi.
// Pakai: npm run release -- <patch|minor|major|x.y.z> "catatan rilis"
//   - menaikkan versi di package.json
//   - build APK rilis (scripts/apk.mjs)
//   - unggah ke GitHub Releases di GitHub Releases repo utama (hilal1709/couple-party)
import { execSync } from 'node:child_process'
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'

const REPO = 'hilal1709/couple-party'
const [bump = 'patch', ...noteParts] = process.argv.slice(2)
const notes = noteParts.join(' ').trim() || 'Pembaruan Couple Party.'

const sh = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts })
const out = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim()

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const [ma, mi, pa] = pkg.version.split('.').map(Number)
const next =
  bump === 'major' ? `${ma + 1}.0.0` : bump === 'minor' ? `${ma}.${mi + 1}.0` : bump === 'patch' ? `${ma}.${mi}.${pa + 1}` : bump
if (!/^\d+\.\d+\.\d+$/.test(next)) throw new Error(`Versi tidak valid: ${next}`)

pkg.version = next
writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
console.log(`\n== Rilis v${next} ==`)

sh('node scripts/apk.mjs')
const asset = `CoupleParty-${next}.apk`
copyFileSync('CoupleParty.apk', asset)

writeFileSync('release-notes.md', notes + '\n')
sh(`gh release create v${next} "${asset}" --repo ${REPO} --title "Couple Party ${next}" --notes-file release-notes.md`)
console.log(`\nTerbit: https://github.com/${REPO}/releases/tag/v${next}`)
console.log('HP yang sudah terpasang Couple Party akan melihat tawaran update saat app dibuka.')
