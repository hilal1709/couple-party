import { normalize } from '../draw/engine'

/**
 * Bahan petunjuk bot: "kata a/kata b=petunjuk cocok untuk dua-duanya=khas a=khas b".
 * Pasangan buatan host tidak ada di sini; bot memakai petunjuk umum.
 */
const RAW = `kucing/anjing=peliharaan,berbulu=mengeong,suka ikan=menggonggong,setia
singa/harimau=raja hutan,buas=berambut lebat,hidup berkelompok=belang,loreng
kuda/zebra=berkaki empat,bisa ditunggangi=pacuan,sering ditunggangi=belang,hitam putih
bebek/angsa=berenang,unggas=dimasak rica,kwek kwek=leher panjang,anggun
lebah/tawon=bersengat,terbang=penghasil madu,hidup di sarang=galak,sarangnya di atap
kupu-kupu/capung=bersayap,terbang pelan=dari kepompong,sayap warna warni=sayap bening,suka di sawah
katak/kodok=melompat,suka hujan=kulit licin,hijau=kulit kasar,bintil bintil
buaya/komodo=reptil,bersisik=di sungai,suka berjemur=di pulau,lidah bercabang
lumba-lumba/hiu=di laut,berenang cepat=pintar,suka atraksi=bergigi tajam,menyeramkan
pinguin/burung hantu=burung,lucu=di kutub,jalannya lucu=aktif malam,matanya besar
apel/pir=buah,manis segar=merah,dimakan bareng kulit=hijau,bentuk lonjong
jeruk/lemon=asam,kulitnya tebal=oranye,bisa dikupas=kuning,diiris buat minuman
semangka/melon=buah segar,berair=hijau belang,bijinya hitam=wangi,dagingnya hijau
stroberi/ceri=merah,buah kecil=berbintik,ada di puding=bertangkai,hiasan kue
kopi/teh=diseduh,minum panas=pahit,bikin melek=daun,dikasih gula
susu/yoghurt=putih,dari sapi=diminum pagi,buat bayi=kental,agak asam
pizza/burger=makanan barat,ada keju=bulat,diiris segitiga=ditumpuk,ada daging tengah
roti/donat=dari tepung,dipanggang=tawar,buat sarapan=bolong,ada toping
es krim/puding=dessert,manis=dingin,meleleh=kenyal,dari agar
cokelat/permen=manis,camilan=meleleh,dari kakao=keras,diemut
gitar/ukulele=senar,dipetik=besar,buat band=kecil,khas hawai
piano/keyboard=tuts,dimainkan jari=besar,ada di gereja=elektrik,pakai colokan
drum/rebana=dipukul,bikin ritme=stik,di band rock=rohani,dimainkan tangan
biola/cello=digesek,klasik=ditaruh di bahu,melengking=besar,dimainkan duduk
sepeda/motor=roda dua,di jalan raya=dikayuh,sehat=pakai bensin,berisik
mobil/truk=roda empat,ada sopir=keluarga,muat lima orang=angkut barang,besar
pesawat/helikopter=terbang,ada pilot=sayap,bandara=baling baling,mendarat di atap
kapal/perahu=di air,berlayar=besar,di pelabuhan=kecil,didayung
kereta/trem=di rel,angkutan umum=jarak jauh,gerbong panjang=dalam kota,eropa
bus/angkot=angkutan umum,ada kondektur=besar,antarkota=kecil,bisa berhenti di mana saja
dokter/perawat=rumah sakit,baju putih=resep obat,periksa pasien=menyuntik,merawat pasien
guru/dosen=mengajar,kasih nilai=sekolah,wali kelas=kampus,bimbing skripsi
polisi/satpam=keamanan,seragam=tilang,kantor resmi=jaga pintu,di kompleks
pilot/pramugari=pesawat,seragam=kokpit,kapten=sajikan makanan,senyum terus
koki/pelayan=restoran,bekerja malam=masak,topi putih=antar makanan,catat pesanan
penyanyi/rapper=panggung,pakai mik=suara merdu,nada tinggi=ngomong cepat,berima
pantai/kolam renang=basah,berenang=pasir,ombak=kaporit,ada ban renang
gunung/bukit=tinggi,pemandangan=didaki,puncak=hijau,pendek
hutan/kebun=banyak pohon,hijau=liar,banyak hewan=ditanam,dirawat petani
sungai/danau=air tawar,ada ikan=mengalir,berkelok=diam,tenang
matahari/bulan=di langit,bulat=siang,panas=malam,purnama
hujan/salju=dari langit,dingin=basah,payung=putih,negara empat musim
sendok/garpu=alat makan,logam=buat sup,cekung=bergigi,tusuk makanan
bantal/guling=empuk,di kasur=buat kepala,kotak=dipeluk,panjang
sikat gigi/sisir=dipakai pagi,ada di kamar mandi=mulut,pakai odol=rambut,ada giginya
kacamata/lensa kontak=buat mata,minus=bertengger di hidung,ada gagang=ditempel,kecil
jam tangan/gelang=di pergelangan,aksesori=tahu waktu,pakai baterai=perhiasan,manik manik
payung/jas hujan=saat hujan,melindungi=dipegang,bisa dilipat=dipakai badan,plastik
sepatu/sandal=alas kaki,sepasang=bertali,buat kerja=santai,ke warung
topi/helm=di kepala,pelindung=kain,panas panas=keras,wajib naik motor
facebook/instagram=media sosial,posting=generasi lama,grup jualan=foto,reels
whatsapp/telegram=kirim pesan,grup=hijau,centang dua=biru,banyak bot
youtube/tiktok=video,kreator=video panjang,langganan=joget,video pendek
netflix/bioskop=nonton film,tiket=rebahan di rumah,langganan bulanan=layar besar,popcorn
laptop/tablet=layar,buat kerja=ada keyboard,dilipat=sentuh,pakai stylus
charger/powerbank=isi baterai,pakai kabel=dicolok tembok,kepala casan=dibawa jalan,cadangan
kamera/webcam=merekam,lensa=buat foto,fotografer=di atas laptop,rapat online
sepak bola/futsal=gawang,tendang bola=sebelas orang,rumput=lima orang,indoor
basket/voli=tim,bola besar=ring,dribel=net,smash
badminton/tenis=raket,net=kok,bulu=bola kuning,lapangan keras
renang/selam=di air,kacamata=gaya bebas,lomba=pakai tabung,di bawah laut
catur/dam=papan kotak,permainan pikir=raja,skakmat=makan lawan,loncat
yoga/senam=gerak badan,sehat=matras,tenang=ramai ramai,musik
harry potter/hogwarts=sihir,inggris=berkacamata,luka petir=sekolah,kastil
spiderman/batman=superhero,topeng=jaring,digigit laba laba=kaya raya,gotham
doraemon/nobita=kartun jepang,sahabat=robot biru,kantong ajaib=malas,suka nangis
upin ipin/shiva=kartun malaysia,kampung durian=botak kembar,betul betul betul=polisi,paling kalem
santa/elf=natal,kutub utara=berjanggut putih,bawa hadiah=kecil,kuping lancip
vampir/zombi=monster,ngeri=gigi taring,takut bawang=berjalan lambat,makan otak
hantu/pocong=seram,malam jumat=melayang,tak terlihat=loncat loncat,kain putih
bakso/mie ayam=gerobak,kuah=bulat,kenyal=ada ayam kecap,pakai sawi
sate/gulai=daging kambing,bumbu kuat=ditusuk,dibakar=kuah santan,kuning
nasi goreng/mie goreng=digoreng,pakai kecap=dari beras,pakai telur=dari gandum,keriting
soto/rawon=berkuah,khas jawa=kuning,koya=hitam,kluwek
rendang/opor=santan,lebaran=hitam kering,khas padang=putih,ayam
gado-gado/pecel=bumbu kacang,sayuran=ada lontong,diulek=khas madiun,pakai peyek
martabak manis/martabak telur=dijual malam,tebal=keju cokelat,terang bulan=daun bawang,gurih
seblak/cilok=jajanan sunda,pedas=kuah kencur,kerupuk basah=bulat,tusuk bambu
tempe/tahu=kedelai,lauk murah=difermentasi,berjamur=putih,lembut
kerupuk/rempeyek=renyah,teman makan=mengembang,kaleng warung=ada kacang,tipis
bakwan/tahu isi=gorengan,pakai cabai rawit=sayuran,tepung=berisi,bentuk kotak
nasi uduk/nasi kuning=sarapan,nasi gurih=santan,khas betawi=kunyit,tumpeng
lontong/ketupat=dari beras,makan sama sayur=daun pisang,silinder=janur,lebaran
klepon/onde-onde=jajan pasar,bulat=hijau,gula merah=ada wijen,digoreng
cendol/es doger=es,manis=hijau,santan=pink,tape ketan
es teh/es jeruk=minuman warung,dingin=sepet,pakai gula=asam,kecut
kopi tubruk/kopi susu=hitam,bikin melek=ampas,tradisional=gula aren,kekinian
indomie/sarimi=mie instan,tanggal tua=seleraku,merek terkenal=isi dua,murah
teh botol/teh kotak=kemasan,dingin=beling,sosro=karton,sedotan
warteg/warung padang=warung nasi,lauk banyak=murah,pilih lauk sendiri=rendang,dibungkus lebih banyak
pecel lele/ayam penyet=warung tenda,sambal=ikan,kolam=digeprek,sambal ijo
bubur ayam/nasi tim=lembut,sarapan=diaduk,kerupuk=dikukus,mangkok kecil
ojol/opang=ojek,motor=aplikasi,jaket hijau=mangkal,tanpa aplikasi
angkot/bajaj=angkutan,bising=warna warni,trayek=roda tiga,jakarta
becak/delman=tradisional,lambat=dikayuh,roda tiga=kuda,kusir
kopaja/transjakarta=bus,jakarta=ugal ugalan,tua=halte,jalur khusus
krl/mrt=kereta jakarta,commuter=desak desakan,bekasi bogor=bawah tanah,lebih dingin
tol/jalan tikus=jalan,menghindari macet=bayar,kartu e money=sempit,lewat gang
mudik/arus balik=lebaran,jalan padat=pulang kampung,bawa oleh oleh=ke kota lagi,mata sembap
lebaran/natal=hari raya,kumpul keluarga=ketupat,sungkem=pohon cemara,gereja
thr/gaji ke-13=bonus,uang tambahan=sebelum hari raya,dari kantor=pns,pertengahan tahun
kondangan/arisan=kumpul,pakai baju rapi=amplop,prasmanan=kocokan,ibu ibu
tahlilan/pengajian=doa bersama,ada makanan=malam ketujuh,berkat=ceramah,majelis
ronda/siskamling=malam hari,jaga kampung=gardu,kentongan=sistem keamanan,orde baru
batik/kebaya=baju tradisional,kondangan=motif,cap=wanita,berenda
peci/blangkon=penutup kepala,tradisional=hitam,salat=jawa,ada mondolan
sarung/kain=tenun,dipakai bawah=tidur nyaman,salat=dililit,dijahit
wayang/ondel-ondel=seni budaya,boneka=dalang,bayangan=raksasa,betawi
angklung/gamelan=alat musik tradisional,ansambel=bambu,digoyang=logam,dipukul
jaipong/kecak=tarian,tradisional=sunda,selendang=bali,cak cak cak
reog/barongsai=tarian topeng,ramai=ponorogo,bulu merak=imlek,lompat
monas/tugu jogja=tugu,ikon kota=emas di pucuk,jakarta=malioboro,foto pinggir jalan
borobudur/prambanan=candi,jawa tengah=buddha,stupa=hindu,roro jonggrang
bali/lombok=pulau,pantai indah=pura,kuta=gili,rinjani
raja ampat/labuan bajo=wisata laut,indonesia timur=papua,karang indah=flores,pulau padar
danau toba/danau kelimutu=danau,wisata alam=batak,pulau samosir=tiga warna,ende
bromo/semeru=gunung,jawa timur=lautan pasir,matahari terbit=tertinggi di jawa,mahameru
pasar malam/sekaten=hiburan malam,ada komidi putar=keliling,lampu warna warni=jogja,kraton
panjat pinang/balap karung=lomba tujuh belasan,ramai=licin,hadiah di atas=melompat,sampai finis
tukang parkir/pak ogah=di jalan,dikasih seribu=peluit,rompi=bantu putar balik,di tikungan
satpam kompleks/hansip=jaga kampung,seragam=gerbang perumahan,pos jaga=pertahanan sipil,warna hijau
sinetron/ftv=tayangan tv,cerita drama=kejar tayang,azab=sekali tamat,kisah cinta
dangdut/koplo=musik kampung,joget=rhoma irama,suling=kendang cepat,via vallen
kpop/jpop=musik asia,fandom=korea,boyband=jepang,anime
mie instan/bihun=mie,cepat dimasak=bumbu sachet,tiga menit=tipis,dari beras
sambal/saus=pedas,pelengkap=diulek,terasi=botol,buat kentang
kecap/saus tiram=saus gelap,asin manis=hitam,kedelai=masakan cina,tiram
odong-odong/komidi putar=mainan anak,berputar=keliling kampung,musik riang=pasar malam,kuda kudaan
mantan/gebetan=asmara,orang spesial=masa lalu,sudah putus=belum jadian,lagi dikejar
pacar/selingkuhan=hubungan,rahasia kecil=resmi,dikenalin ortu=sembunyi,di belakang
pdkt/ldr=asmara,butuh sabar=masih awal,chat manis=jauh,beda kota
ghosting/ngilang=tiba tiba hilang,bikin sakit=tanpa kabar,setelah dekat=lagi sibuk,balik lagi
friendzone/kakak-adikan=tidak jadian,dekat=cuma teman,ditolak halus=panggilan sayang,sok keluarga
bucin/budak cinta=rela apa saja,cinta buta=istilah singkat,gen z=istilah panjang,lebih dramatis
kangen/rindu=ingin ketemu,jauh=sehari hari,bahasa santai=puitis,lagu galau
cemburu/curiga=perasaan,mikir macam macam=karena sayang,lihat dia sama lain=menyelidik,buka hp
ngambek/marah=emosi,diam=manja,minta dibujuk=meledak,nada tinggi
baper/sensi=perasaan,mudah tersentuh=terbawa suasana,salah paham=mudah tersinggung,pms
gombal/rayuan=kata manis,bikin senyum=receh,dilan=serius,memikat
kode/sindiran=tidak langsung,harus peka=minta perhatian,cewek banget=menyindir,status wa
tembak/lamaran=pernyataan,deg degan=minta pacaran,di sekolah=orang tua,bawa cincin
tunangan/nikahan=acara cinta,cincin=sebelum menikah,keluarga inti=pelaminan,ijab
bulan madu/staycation=liburan,hotel=setelah menikah,berdua=dekat rumah,sebentar
anniversary/ulang tahun=perayaan,kue=hari jadian,berdua=bertambah umur,tiup lilin
kencan/nongkrong=keluar rumah,malam minggu=berdua,dandan=ramai teman,santai
nonton/netflix and chill=film,berdua=bioskop,tiket=rebahan,sofa
candle light dinner/makan di warteg=makan bareng,romantis=lilin,mahal=murah,dua lauk
piknik/jalan sore=keluar santai,berdua=bawa tikar,keranjang=keliling komplek,kaki
video call/sleep call=telepon,sambil lihat=lihat wajah,pakai kamera=sampai ketiduran,dengar napas
chat/telepon=komunikasi,hp=ketik,emoji=suara,bicara
dibaca doang/centang satu=chat,bikin bete=centang biru,tanpa balasan=belum sampai,hp mati
terserah/bebas=jawaban bingung,mau apa aja=jebakan cewek,padahal ada maunya=tulus,ikut saja
sayang/beb=panggilan,mesra=umum,dipakai ortu=gaya alay,singkat
ayang/cinta=panggilan,mesra=gen z,manja=klasik,puisi
peluk/cium=mesra,kontak fisik=dua tangan,hangat=bibir,pipi
gandengan/rangkulan=mesra,jalan berdua=tangan,jari=bahu,leher
mertua/ipar=keluarga pasangan,rawan drama=orang tua,harus sopan=saudara,seumuran
kondangan mantan/reuni=canggung,ketemu orang lama=amplop,lihat pelaminan=sekolah,teman lama
kado/surprise=kejutan,buat pasangan=dibungkus,pita=tiba tiba,direncanakan diam diam
bunga/cokelat=hadiah,valentine=wangi,buket=manis,dimakan
cincin/kalung=perhiasan,emas=di jari,lamaran=di leher,liontin
boneka/bantal=empuk,di kamar=hadiah,beruang=buat tidur,kepala
antar jemput/nebeng=naik motor,bareng=setia,tiap hari=ikut numpang,gratis
bonceng/gandeng=berdua,jalan bareng=di motor,duduk belakang=tangan,sambil jalan
curhat/ngedumel=keluh kesah,cerita=ke orang terpercaya,minta saran=sendiri,menggerutu
minta maaf/ngalah=berbaikan,turunkan ego=kata sulit,salah sendiri=biar cepat selesai,meski benar
move on/balikan=setelah putus,keputusan=lupakan,hidup baru=mulai lagi,orang sama
putus/break=hubungan rehat,sedih=selesai,tamat=sementara,mikir dulu
jealous/posesif=tidak mau kalah,sayang berlebihan=perasaan sesaat,lihat dia ketawa=mengekang,cek hp
overthinking/insecure=isi kepala,gelisah=mikir terlalu jauh,tengah malam=merasa kurang,minder
red flag/green flag=tanda pasangan,bendera=bahaya,kabur=aman,lanjutkan
bestie/teman curhat=teman dekat,tempat cerita=sehati,ke mana mana bareng=pendengar,simpan rahasia
crush/idola=orang disukai,dikagumi=diam diam,teman kampus=terkenal,fanbase
stalking/kepoin=mengintip,media sosial=diam diam,buka profil=penasaran,tanya tanya
skincare/makeup=wajah,rutinitas=malam,toner=lipstik,dandan
parfum/deodoran=wangi,badan=disemprot,baju=ketiak,biar tidak bau
kaos couple/baju samaan=pakaian berdua,kembar=gambar nyambung,sablon=warna sama,kondangan keluarga
foto berdua/selfie=kamera,kenangan=butuh orang lain,pasangan=sendiri,angle atas
story/close friends=instagram,24 jam=semua lihat,bebas=lingkaran hijau,terpilih
nyanyi berdua/karaoke=lagu,suara=duet,sambil gitar=sewa ruangan,mik`

/** "Lokasi=petunjuk,petunjuk,..."; tidak menyebut nama lokasinya. */
const LOCATION_RAW = `Pasar tradisional=becek,tawar menawar,pagi pagi,ramai ibu ibu,bau amis
Warteg=lauk banyak,makan murah,kaca etalase,es teh manis,kursi panjang
Kondangan=amplop,prasmanan,pakai baju bagus,antre salaman,musik elekton
Sekolah=seragam,bel berbunyi,upacara senin,papan tulis,jam istirahat
Rumah sakit=bau obat,antre panjang,ranjang dorong,jam besuk,infus
Bandara=koper,boarding,check in,terminal,paspor
Stasiun KRL=peron,tap kartu,desak desakan,pengumuman,rel
Bioskop=gelap,layar besar,popcorn,kursi empuk,tiket
Pantai=pasir,ombak,angin kencang,sunset,tabir surya
Mal=eskalator,diskon,cuci mata,food court,tenant
Kafe estetik=wifi,foto makanan,latte art,tanaman gantung,nugas
Kantor=rapat,lembur,mesin fotokopi,kubikel,absen
Pos ronda=kentongan,begadang,kopi malam,sarung,gardu
Kebun binatang=kandang,jalan kaki,bau tak sedap,loket masuk,kasih makan
Konser dangdut=saweran,joget,panggung,kendang,biduan
Salon=keramas,gunting,gosip,cermin besar,creambath
Bengkel=oli,kunci pas,tangan kotor,ganti ban,dongkrak
Masjid saat Lebaran=takbir,baju baru,sajadah,zakat,khotbah
Kapal laut=mabuk,dek,ombak,pelampung,pelabuhan
Kampus=skripsi,sks,dosen,kantin,wisuda
Pernikahan adat Jawa=blangkon,kembar mayang,siraman,keris,sinden
Puncak (villa)=dingin,kebun teh,macet akhir pekan,bakar bakar,kabut
Studio TV=kamera,lampu sorot,tepuk tangan,sutradara,siaran
Supermarket=troli,kasir,rak,struk,promo`

export type WordClues = { word: string; partner: string; shared: string[]; own: string[]; other: string[] }

const list = (x: string) => x.split(',').map((c) => c.trim())

export const WORD_CLUES = new Map<string, WordClues>()

for (const row of RAW.split('\n')) {
  const [pair, shared, a, b] = row.split('=')
  const [wa, wb] = pair.split('/')
  WORD_CLUES.set(normalize(wa), { word: wa, partner: wb, shared: list(shared), own: list(a), other: list(b) })
  WORD_CLUES.set(normalize(wb), { word: wb, partner: wa, shared: list(shared), own: list(b), other: list(a) })
}

export const LOCATION_CLUES: Record<string, string[]> = Object.fromEntries(
  LOCATION_RAW.split('\n').map((row) => {
    const [name, clues] = row.split('=')
    return [name, list(clues)]
  }),
)

/** Petunjuk aman tanpa bahan: untuk Mr. White, mata-mata, dan pasangan buatan host. */
export const GENERIC_CLUES = ['sering kulihat', 'lumayan umum', 'pernah nyoba', 'bikin senang', 'gampang ditemui', 'susah dijelaskan', 'semua orang tahu', 'tergantung orangnya', 'dekat kita', 'sehari hari', 'kadang mahal', 'lumayan seru']
