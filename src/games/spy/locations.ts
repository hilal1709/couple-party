/** Lokasi mode ala Spyfall: nama lokasi + peran-peran yang mungkin ada di sana. */
export type Location = { name: string; jobs: string[] }

const RAW =
  'Pasar tradisional: tukang sayur, tukang parkir, ibu-ibu nawar, kuli angkut, penjual ayam, pencopet, preman pasar|' +
  'Warteg: ibu warteg, mas-mas kuli, mahasiswa kere, tukang cuci piring, ojol mampir, pelanggan utang, kucing warteg|' +
  'Kondangan: pengantin, penghulu, tamu tak diundang, fotografer, biduan dangdut, among tamu, sepupu jauh|' +
  'Sekolah: kepala sekolah, guru BK, murid telat, satpam, ibu kantin, ketua kelas, penjaga perpus|' +
  'Rumah sakit: dokter jaga, perawat, pasien, keluarga pasien, satpam, petugas farmasi, OB|' +
  'Bandara: pilot, pramugari, petugas X-ray, penumpang delay, porter, petugas imigrasi, sopir taksi|' +
  'Stasiun KRL: masinis, petugas peron, penumpang desak-desakan, penjual kopi, pengamen, satpam, anak magang|' +
  'Bioskop: penjaga tiket, penjual popcorn, pasangan kencan, penonton berisik, petugas kebersihan, kritikus film, bocil nyelonong|' +
  'Pantai: penjaga pantai, peselancar, penjual kelapa, turis bule, fotografer prewed, nelayan, penyewa ban|' +
  'Mal: SPG parfum, satpam, pengunjung cuci mata, kasir, badut, tukang parkir, pasangan kencan|' +
  'Kafe estetik: barista, influencer, mahasiswa skripsian, pasangan kencan pertama, kasir, freelancer, pemilik kafe|' +
  'Kantor: bos, karyawan baru, HRD, OB, karyawan lembur, satpam, anak magang|' +
  'Pos ronda: hansip, bapak-bapak ronda, maling, pak RT, penjual nasi goreng, anjing kampung, warga begadang|' +
  'Kebun binatang: pawang gajah, penjaga loket, bocah piknik, guide, dokter hewan, penjual balon, monyet kabur|' +
  'Konser dangdut: biduan, pemain kendang, penonton joget, MC, satpam, penjual minuman, kru sound|' +
  'Salon: kapster, pelanggan creambath, tukang pijat, kasir, pelanggan gosip, model rambut, anak magang|' +
  'Bengkel: montir, pemilik motor mogok, kasir, penjual oli, montir magang, pelanggan sok tahu, bos bengkel|' +
  'Masjid saat Lebaran: imam, khatib, jamaah, marbot, panitia zakat, anak kecil lari-lari, penjual balon|' +
  'Kapal laut: nakhoda, ABK, penumpang mabuk laut, penjual pop mie, petugas tiket, turis, koki kapal|' +
  'Kampus: dosen killer, mahasiswa abadi, ketua BEM, satpam, ibu kantin, admin akademik, mahasiswa baru|' +
  'Pernikahan adat Jawa: pengantin, perias, sinden, among tamu, dalang, mertua, tamu kondangan|' +
  'Puncak (villa): pemilik villa, rombongan kantor, penjual jagung bakar, tukang kebun, sopir, pasangan honeymoon, satpam|' +
  'Studio TV: presenter, kameraman, sutradara, penonton bayaran, bintang tamu, penata rias, kru lighting|' +
  'Supermarket: kasir, SPG susu, satpam, pembeli bulanan, karyawan stok, anak hilang, ibu-ibu antre'

export const LOCATIONS: Location[] = RAW.split('|').map((x) => {
  const [name, jobs] = x.split(':')
  return { name: name.trim(), jobs: jobs.split(',').map((j) => j.trim()) }
})
