"""Olah audio CC0 (sumber di D:/dev/audio-src) menjadi aset app di public/audio/.

Jalankan:  python -I scripts/audio/build.py          (semua)
           python -I scripts/audio/build.py draw     (hanya musik & SFX Tebak Gambar)
           python -I scripts/audio/build.py remi     (hanya musik & SFX Kartu Remi)
           python -I scripts/audio/build.py domino   (hanya musik & SFX Domino)
           python -I scripts/audio/build.py monopoly (hanya musik & SFX Monopoli)
           python -I scripts/audio/build.py ludo     (hanya musik & SFX Ludo)
           python -I scripts/audio/build.py spy      (hanya musik & SFX Siapa Mata-mata)
           python -I scripts/audio/build.py bom      (hanya musik & SFX Bom Waktu)
           python -I scripts/audio/build.py sport    (hanya musik & SFX Sport Kacau)
           python -I scripts/audio/build.py kart     (hanya musik & SFX Kart Kacau)
           python -I scripts/audio/build.py petak    (hanya musik & SFX Petak Cat)
           python -I scripts/audio/build.py tali     (hanya musik & SFX Tali Jodoh, disintesis tanpa sumber)
Semua sumber CC0 — lihat public/audio/CREDITS.md.
"""
import subprocess
import sys
from pathlib import Path

import numpy as np

SRC = Path('D:/dev/audio-src')
OUT = Path(__file__).resolve().parents[2] / 'public' / 'audio'
SR = 44100


def ff(*args):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *args], check=True)


def load(path: Path) -> np.ndarray:
    raw = subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def write_ogg(x: np.ndarray, dest: Path, kbps: int, mono=False, lufs=-18.0):
    """Normalisasi loudness lalu simpan OGG Vorbis."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix('.tmp.f32')
    tmp.write_bytes(x.astype(np.float32).tobytes())
    ff('-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', str(tmp),
       '-af', f'loudnorm=I={lufs}:TP=-1.5:LRA=11',
       '-ar', str(SR), '-ac', '1' if mono else '2', '-c:a', 'libvorbis', '-b:a', f'{kbps}k', str(dest))
    tmp.unlink()


def seamless_loop(x: np.ndarray, xfade_s=2.0) -> np.ndarray:
    """Loop mulus: ekor lagu di-crossfade ke kepalanya, lalu tubuh lagu disambung setelahnya."""
    n = int(xfade_s * SR)
    head, body, tail = x[:n], x[n:-n], x[-n:]
    t = np.linspace(0, 1, n, dtype=np.float32)[:, None]
    blend = tail * np.cos(t * np.pi / 2) + head * np.sin(t * np.pi / 2)  # equal-power
    return np.concatenate([body, blend])


def music():
    m = SRC / 'music'
    # menu: "Funked Up" oleh Joth
    write_ogg(seamless_loop(load(m / 'funked-up.mp3')), OUT / 'music' / 'menu.ogg', 96, lufs=-19)
    # main UNO: "Funky Menu Loop" (versi panjang) oleh iamoneabe — sudah loop dari sumbernya
    # (ekor sumbernya meluruh, jadi tetap di-crossfade supaya tidak ada "klik" di sambungan)
    uno = seamless_loop(load(m / 'funkymenuloop-longer.wav'), 1.0)
    write_ogg(uno, OUT / 'music' / 'uno.ogg', 96, lufs=-19)
    # versi tegang: loop yang sama, ±6% lebih cepat & sedikit lebih tinggi
    tense = OUT / 'music' / 'uno-tense.ogg'
    loop_raw = OUT / 'music' / 'uno-loop.tmp.f32'
    loop_raw.write_bytes(uno.astype(np.float32).tobytes())
    ff('-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', str(loop_raw),
       '-af', f'asetrate={int(SR * 1.06)},aresample={SR},atempo=1.06,loudnorm=I=-18:TP=-1.5:LRA=11',
       '-ar', str(SR), '-c:a', 'libvorbis', '-b:a', '96k', str(tense))
    loop_raw.unlink()

    # Ular Tangga: "Happy Clappy Loop" oleh OwlishMedia — piano ceria, beda nuansa dari funk UNO.
    # Sumbernya sudah loop pas ketukan; crossfade justru menggeser ritme, jadi dipakai utuh.
    snakes = load(m / 'happyclappy.wav')
    write_ogg(snakes, OUT / 'music' / 'snakes.ogg', 96, lufs=-19)
    tense_raw = OUT / 'music' / 'snakes-loop.tmp.f32'
    tense_raw.write_bytes(snakes.astype(np.float32).tobytes())
    ff('-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', str(tense_raw),
       '-af', f'asetrate={int(SR * 1.06)},aresample={SR},atempo=1.06,loudnorm=I=-18:TP=-1.5:LRA=11',
       '-ar', str(SR), '-c:a', 'libvorbis', '-b:a', '96k', str(OUT / 'music' / 'snakes-tense.ogg'))
    tense_raw.unlink()


def draw_music():
    # Tebak Gambar: "Cozy Puzzle In-Game 1" oleh MintoDog — bossa nova saksofon & mallet, santai buat menggambar.
    m = SRC / 'music'
    loop = seamless_loop(load(m / 'cozy-puzzle-1.mp3'), 1.5)
    write_ogg(loop, OUT / 'music' / 'draw.ogg', 64, lufs=-20)
    # 15 detik terakhir: loop yang sama, ±10% lebih cepat supaya terasa diburu waktu
    raw = OUT / 'music' / 'draw-loop.tmp.f32'
    raw.write_bytes(loop.astype(np.float32).tobytes())
    ff('-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', str(raw),
       '-af', f'asetrate={int(SR * 1.05)},aresample={SR},atempo=1.05,loudnorm=I=-19:TP=-1.5:LRA=11',
       '-ar', str(SR), '-c:a', 'libvorbis', '-b:a', '64k', str(OUT / 'music' / 'draw-tense.ogg'))
    raw.unlink()


def remi_music():
    # Kartu Remi: "Mocha Frapp" oleh Pro Sensory (Alex McCulloch) — jazz santai ala lounge kasino.
    # Ekor sumbernya fade-out ±6 detik; dipotong dulu lalu disambung mulus ke kepalanya.
    m = SRC / 'music'
    x = load(m / 'mocha-frapp.mp3')
    loop = seamless_loop(x[: -int(5.5 * SR)], 2.0)
    write_ogg(loop, OUT / 'music' / 'remi.ogg', 80, lufs=-20)
    # momen genting (all-in, kartu terakhir): loop yang sama ±6% lebih cepat
    raw = OUT / 'music' / 'remi-loop.tmp.f32'
    raw.write_bytes(loop.astype(np.float32).tobytes())
    ff('-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', str(raw),
       '-af', f'asetrate={int(SR * 1.06)},aresample={SR},atempo=1.06,loudnorm=I=-19:TP=-1.5:LRA=11',
       '-ar', str(SR), '-c:a', 'libvorbis', '-b:a', '80k', str(OUT / 'music' / 'remi-tense.ogg'))
    raw.unlink()


def domino_music():
    # Domino: "Reggae" oleh Pro Sensory — reggae santai ala nongkrong di warung, beda dari jazz/bossa/funk game lain.
    # Sumbernya berhenti mendadak lalu hening ±3 detik; heningnya dipotong lalu ekornya disambung ke kepala.
    m = SRC / 'music'
    x = load(m / 'regea.mp3')
    loud = np.flatnonzero(np.abs(x).max(axis=1) > 0.02)
    x = x[: loud[-1] - int(0.4 * SR)]
    loop = seamless_loop(x, 1.2)
    write_ogg(loop, OUT / 'music' / 'domino.ogg', 80, lufs=-20)
    # momen genting (kartu terakhir, all-in): loop yang sama ±6% lebih cepat
    raw = OUT / 'music' / 'domino-loop.tmp.f32'
    raw.write_bytes(loop.astype(np.float32).tobytes())
    ff('-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', str(raw),
       '-af', f'asetrate={int(SR * 1.06)},aresample={SR},atempo=1.06,loudnorm=I=-19:TP=-1.5:LRA=11',
       '-ar', str(SR), '-c:a', 'libvorbis', '-b:a', '80k', str(OUT / 'music' / 'domino-tense.ogg'))
    raw.unlink()


def monopoly_music():
    # Monopoli: "Catchy Swing" oleh Doge — swing jazz (sax, walking bass, drum brush) ala taipan kota besar,
    # beda dari funk, piano, bossa, lounge & reggae game lain. Sumbernya sudah loop pas 60 detik, jadi dipakai utuh.
    m = SRC / 'music'
    loop = load(m / 'catchyswing.ogg')
    write_ogg(loop, OUT / 'music' / 'monopoly.ogg', 80, lufs=-20)
    # momen genting (ada yang hampir bangkrut / putaran terakhir): loop yang sama ±6% lebih cepat
    raw = OUT / 'music' / 'monopoly-loop.tmp.f32'
    raw.write_bytes(loop.astype(np.float32).tobytes())
    ff('-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', str(raw),
       '-af', f'asetrate={int(SR * 1.06)},aresample={SR},atempo=1.06,loudnorm=I=-19:TP=-1.5:LRA=11',
       '-ar', str(SR), '-c:a', 'libvorbis', '-b:a', '80k', str(OUT / 'music' / 'monopoly-tense.ogg'))
    raw.unlink()

def ludo_music():
    # Ludo: "Oldskool" oleh Of Far Different Nature — chiptune/retro riang ala game jadul,
    # beda dari funk, piano, bossa, lounge, reggae & swing game lain. Loop 32 detik, disambung mulus.
    m = SRC / 'music'
    loop = seamless_loop(load(m / 'oldskool.mp3'), 0.8)
    write_ogg(loop, OUT / 'music' / 'ludo.ogg', 80, lufs=-20)
    # momen genting (ada yang tinggal satu bidak lagi finis): loop yang sama ±6% lebih cepat
    raw = OUT / 'music' / 'ludo-loop.tmp.f32'
    raw.write_bytes(loop.astype(np.float32).tobytes())
    ff('-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', str(raw),
       '-af', f'asetrate={int(SR * 1.06)},aresample={SR},atempo=1.06,loudnorm=I=-19:TP=-1.5:LRA=11',
       '-ar', str(SR), '-c:a', 'libvorbis', '-b:a', '80k', str(OUT / 'music' / 'ludo-tense.ogg'))
    raw.unlink()


def spy_music():
    # Siapa Mata-mata: "Sneaking Around" oleh Umplix — bass & brass mengendap-endap ala film spy,
    # beda dari funk, piano, bossa, lounge, reggae, swing & chiptune game lain. 88 detik, disambung mulus.
    m = SRC / 'music'
    loop = seamless_loop(load(m / 'sneaking-around.wav'), 1.5)
    write_ogg(loop, OUT / 'music' / 'spy.ogg', 80, lufs=-20)
    # voting / tebakan terakhir: loop yang sama ±6% lebih cepat
    raw = OUT / 'music' / 'spy-loop.tmp.f32'
    raw.write_bytes(loop.astype(np.float32).tobytes())
    ff('-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', str(raw),
       '-af', f'asetrate={int(SR * 1.06)},aresample={SR},atempo=1.06,loudnorm=I=-19:TP=-1.5:LRA=11',
       '-ar', str(SR), '-c:a', 'libvorbis', '-b:a', '80k', str(OUT / 'music' / 'spy-tense.ogg'))
    raw.unlink()


def bom_music():
    # Bom Waktu: "Catch me if you can!" oleh poinl — loop kejar-kejaran quirky 158 BPM,
    # beda dari funk, piano, bossa, lounge, reggae, swing & chiptune game lain. 152 detik, disambung mulus.
    m = SRC / 'music'
    loop = seamless_loop(load(m / 'catchme.mp3'), 1.0)
    write_ogg(loop, OUT / 'music' / 'bom.ogg', 80, lufs=-20)
    # sumbu sudah lama menyala: loop yang sama ±8% lebih cepat biar makin panik
    raw = OUT / 'music' / 'bom-loop.tmp.f32'
    raw.write_bytes(loop.astype(np.float32).tobytes())
    ff('-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', str(raw),
       '-af', f'asetrate={int(SR * 1.08)},aresample={SR},atempo=1.0,loudnorm=I=-19:TP=-1.5:LRA=11',
       '-ar', str(SR), '-c:a', 'libvorbis', '-b:a', '80k', str(OUT / 'music' / 'bom-tense.ogg'))
    raw.unlink()


def kart_music():
    # Kart Kacau: "TechnoByte" oleh Yueki (CC0, itch.io) — loop techno/dance 8-bit,
    # beda dari funk, piano, bossa, lounge, reggae, swing, chiptune, spy & quirky game lain.
    # Loop 1 (paling ringan) untuk balapan, loop 5 (paling padat) untuk putaran terakhir.
    m = SRC / 'music' / 'technobyte' / 'x' / 'Deliverables'
    write_ogg(load(m / 'TechnoByte_1.wav'), OUT / 'music' / 'kart.ogg', 80, lufs=-20)
    write_ogg(load(m / 'TechnoByte_5.wav'), OUT / 'music' / 'kart-tense.ogg', 80, lufs=-19)


def sport_music():
    # "Beach Sports Theme (Loop)" (trex0n, CC0): ceria seperti acara olahraga, genre yang belum dipakai game lain.
    # Versi tegang untuk frame terakhir: dipercepat sedikit lewat atempo.
    m = SRC / 'music' / 'sport'
    x = load(m / 'ogg_beachtheme_3.ogg')
    write_ogg(x, OUT / 'music' / 'sport.ogg', 80, lufs=-20)
    raw = OUT / 'music' / 'sport-loop.tmp.f32'
    raw.write_bytes(x.astype('<f4').tobytes())
    ff('-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', str(raw), '-af', 'atempo=1.12,loudnorm=I=-19:TP=-1.5:LRA=11',
       '-ar', str(SR), '-c:a', 'libvorbis', '-b:a', '80k', str(OUT / 'music' / 'sport-tense.ogg'))
    raw.unlink()


def sport_synth():
    """SFX bowling yang disintesis sendiri: gelinding bola dan benturan pin kayu."""
    rng = np.random.default_rng(11)
    out = OUT / 'sfx'
    # gelinding: dengung rendah + desis lantai kayu, memudar di ujung
    n = int(SR * 3.6)
    t = np.arange(n) / SR
    noise = np.convolve(rng.standard_normal(n), np.ones(40) / 40, 'same') * 6
    wobble = 0.8 + 0.2 * np.sin(2 * np.pi * 7 * t)
    roll = (np.sin(2 * np.pi * 62 * t) * 0.6 + np.sin(2 * np.pi * 95 * t) * 0.3 + noise * 0.5) * wobble
    fade = np.minimum(1, t / 0.15) * np.minimum(1, (t[-1] - t) / 0.6)
    write_ogg(_st(roll * fade), out / 'sport-roll.ogg', 64, mono=True, lufs=-20)

    def clack(buf, at, freq, gain):
        """satu pin kena: dua nada kayu pendek + letupan noise"""
        n = int(SR * 0.12)
        t = np.arange(n) / SR
        tone = np.sin(2 * np.pi * freq * t) + 0.6 * np.sin(2 * np.pi * freq * 2.76 * t) + rng.standard_normal(n) * 0.5
        s = int(at * SR)
        buf[s:s + n] += (tone * np.exp(-t / 0.02) * gain)[: len(buf) - s]

    for name, hits, spread in (('sport-pins', 26, 0.55), ('sport-pins-few', 5, 0.3)):
        buf = np.zeros(int(SR * 1.3))
        for i in range(hits):
            at = spread * (i / hits) ** 1.5 + rng.random() * 0.03
            clack(buf, at, 480 + rng.random() * 900, 0.5 + rng.random() * 0.5)
        write_ogg(_st(buf), out / f'{name}.ogg', 64, mono=True, lufs=-15)

    def body(n, freq, decay, noise=0.5):
        """dentum pendek: nada turun + noise"""
        t = np.arange(n) / SR
        tone = np.sin(2 * np.pi * (freq * t - freq * 2.2 * t ** 2))
        return (tone + rng.standard_normal(n) * noise) * np.exp(-t / decay)

    # bel ring: beberapa harmonik tak bulat yang berdering lama
    n = int(SR * 1.6)
    t = np.arange(n) / SR
    bell = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / d) for f, a, d in ((830, 1, 0.5), (1907, 0.6, 0.3), (2960, 0.35, 0.2), (4210, 0.2, 0.12)))
    write_ogg(_st(bell), out / 'sport-bell.ogg', 64, mono=True, lufs=-15)
    # ayunan: desis naik-turun
    n = int(SR * 0.18)
    noise = np.convolve(rng.standard_normal(n), np.ones(8) / 8, 'same')
    write_ogg(_st(noise * np.sin(np.pi * np.arange(n) / n) ** 2), out / 'sport-swing.ogg', 64, mono=True, lufs=-20)
    write_ogg(_st(body(int(SR * 0.22), 150, 0.05)), out / 'sport-hit.ogg', 64, mono=True, lufs=-14)
    write_ogg(_st(body(int(SR * 0.4), 95, 0.11, 0.7)), out / 'sport-hit-big.ogg', 64, mono=True, lufs=-13)
    write_ogg(_st(body(int(SR * 0.14), 320, 0.025, 0.9)), out / 'sport-block.ogg', 64, mono=True, lufs=-17)
    # hindar: siul turun
    n = int(SR * 0.22)
    t = np.arange(n) / SR
    write_ogg(_st(np.sin(2 * np.pi * (1100 * t - 1500 * t ** 2)) * _env(n, 0.01, 0.1)), out / 'sport-dodge.ogg', 64, mono=True, lufs=-20)
    # KO: tiga dentum bel cepat
    n = int(SR * 1.5)
    t = np.arange(n) / SR
    ding = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / 0.3) for f, a in ((830, 1), (1907, 0.6)))
    buf = np.zeros(n)
    for at in (0.0, 0.22, 0.44):
        s = int(at * SR)
        buf[s:] += ding[: n - s]
    write_ogg(_st(buf), out / 'sport-ko.ogg', 64, mono=True, lufs=-14)
    # tali busur: nada bergetar pendek
    n = int(SR * 0.3)
    t = np.arange(n) / SR
    write_ogg(_st(np.sin(2 * np.pi * (240 + 40 * np.sin(2 * np.pi * 34 * t)) * t) * np.exp(-t / 0.07)), out / 'sport-bowstring.ogg', 64, mono=True, lufs=-17)
    write_ogg(_st(body(int(SR * 0.16), 210, 0.03, 0.8)), out / 'sport-thunk.ogg', 64, mono=True, lufs=-15)
    write_ogg(_st(body(int(SR * 0.18), 180, 0.035, 0.6)), out / 'sport-kick.ogg', 64, mono=True, lufs=-15)
    write_ogg(_st(body(int(SR * 0.12), 520, 0.02, 0.7)), out / 'sport-racket.ogg', 64, mono=True, lufs=-15)
    write_ogg(_st(body(int(SR * 0.09), 1400, 0.012, 0.9)), out / 'sport-shuttle.ogg', 64, mono=True, lufs=-17)


def petak_music():
    """Petak Cat: "Music loop variations" (obscure music, CC0). Tiga tahap dirangkai; versi evil saat berburu."""
    m = SRC / 'music' / 'petak' / 'x'
    calm = np.concatenate([load(m / f'level1-step{i}.wav') for i in (1, 1, 2, 3)])
    tense = np.concatenate([load(m / f'level1-step{i}-evil.wav') for i in (1, 2, 3)])
    write_ogg(calm, OUT / 'music' / 'petak.ogg', 80, lufs=-21)
    write_ogg(tense, OUT / 'music' / 'petak-tense.ogg', 80, lufs=-20)


def petak_synth():
    """SFX Petak Cat disintesis sendiri: langkah, kuas, pipet, merpati, kucing, dan suara sore di gang."""
    rng = np.random.default_rng(11)
    out = OUT / 'sfx'

    def tone(n, f0, f1=None):
        f = np.linspace(f0, f0 if f1 is None else f1, n)
        return np.sin(2 * np.pi * np.cumsum(f) / SR).astype(np.float32)

    def noise(n):
        return rng.normal(0, 1, n).astype(np.float32)

    def lowpass(x, k):
        return np.convolve(x, np.ones(k) / k, mode='same').astype(np.float32)

    # langkah: hentakan rendah + gesekan sandal
    n = int(SR * 0.16)
    write_ogg(_st(lowpass(noise(n), 60) * 6 * _env(n, 0.002, 0.04) + tone(n, 95, 60) * 0.5 * _env(n, 0.002, 0.05)), out / 'petak-langkah.ogg', 64, mono=True, lufs=-18)
    # kuas: desis lembut
    n = int(SR * 0.22)
    write_ogg(_st(lowpass(noise(n), 6) * _env(n, 0.03, 0.07)), out / 'petak-cat.ogg', 64, mono=True, lufs=-24)
    # pipet: bunyi "plup" naik
    n = int(SR * 0.16)
    write_ogg(_st(tone(n, 340, 1100) * _env(n, 0.004, 0.05)), out / 'petak-pipet.ogg', 64, mono=True, lufs=-18)
    # merpati: rentetan kepakan
    n = int(SR * 1.1)
    flap = lowpass(noise(n), 14) * (0.55 + 0.45 * np.sign(np.sin(2 * np.pi * 13 * np.arange(n) / SR))) * _env(n, 0.02, 0.4)
    write_ogg(_st(flap), out / 'petak-merpati.ogg', 64, mono=True, lufs=-19)
    # meong: nada naik-turun dengan harmonik
    n = int(SR * 0.62)
    t = np.arange(n) / n
    f = 560 + 420 * np.sin(np.pi * t) ** 2 - 170 * t
    ph = 2 * np.pi * np.cumsum(f) / SR
    meow = (np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.3 * np.sin(3 * ph)) * np.sin(np.pi * t) ** 0.6
    write_ogg(_st(meow.astype(np.float32)), out / 'petak-meong.ogg', 64, mono=True, lufs=-20)
    # sore di gang: angin, burung jauh, dan motor lewat di kejauhan; loop 20 detik
    n = int(SR * 20)
    wind = lowpass(noise(n), 400) * 14
    t = np.arange(n) / SR
    wind *= 0.6 + 0.4 * np.sin(2 * np.pi * t / 20) ** 2
    birds = np.zeros(n, dtype=np.float32)
    for _ in range(26):
        at = rng.integers(0, n - SR)
        m = int(SR * (0.07 + rng.random() * 0.1))
        chirp = tone(m, 2400 + rng.random() * 1800, 3400 + rng.random() * 1600) * _env(m, 0.01, 0.04)
        birds[at:at + m] += chirp * (0.05 + rng.random() * 0.1)
    moto = tone(n, 74) * 0.5 + tone(n, 111) * 0.25
    moto *= np.exp(-((t - 12) / 2.6) ** 2) * 0.1
    write_ogg(_st(wind + birds + moto), out / 'petak-amb-gang.ogg', 56, mono=True, lufs=-24)
    # pasar malam: dengung orang ramai dan kendang dangdut jauh
    crowd = lowpass(noise(n), 90) * 8 * (0.7 + 0.3 * np.sin(2 * np.pi * t / 7) ** 2)
    beat = np.zeros(n, dtype=np.float32)
    step_n = int(SR * 0.42)
    for i, at in enumerate(range(0, n - SR, step_n)):
        m = int(SR * 0.16)
        beat[at:at + m] += tone(m, 130 if i % 4 else 85, 70) * _env(m, 0.002, 0.05) * (0.3 if i % 2 else 0.18)
    write_ogg(_st(crowd + beat), out / 'petak-amb-pasar.ogg', 56, mono=True, lufs=-24)
    # museum: dengung ruangan dan langkah jauh yang bergema
    hum = lowpass(noise(n), 700) * 12 + tone(n, 58) * 0.02
    echo = np.zeros(n, dtype=np.float32)
    for _ in range(9):
        at = rng.integers(0, n - 2 * SR)
        m = int(SR * 0.9)
        echo[at:at + m] += lowpass(noise(m), 40) * _env(m, 0.002, 0.2) * (0.3 + rng.random() * 0.4)
    write_ogg(_st(hum + echo), out / 'petak-amb-museum.ogg', 56, mono=True, lufs=-28)
    # stasiun: hujan rapat dan guruh jauh
    rain = noise(n) - lowpass(noise(n), 8) * 0.5
    thunder = lowpass(noise(n), 900) * 40 * np.exp(-(((t - 13) / 1.6) ** 2))
    write_ogg(_st(rain * 0.35 + thunder), out / 'petak-amb-stasiun.ogg', 56, mono=True, lufs=-23)
    # pabrik: dengung mesin dan hentakan berirama
    hum2 = tone(n, 55) * 0.08 + tone(n, 110) * 0.04 + lowpass(noise(n), 300) * 5
    clank = np.zeros(n, dtype=np.float32)
    for at in range(0, n - SR, int(SR * 0.9)):
        m = int(SR * 0.12)
        clank[at:at + m] += lowpass(noise(m), 12) * _env(m, 0.001, 0.03) * 0.5
    write_ogg(_st(hum2 + clank), out / 'petak-amb-pabrik.ogg', 56, mono=True, lufs=-24)
    # dapur: desis kompor, kulkas, dan tetes air
    fridge = tone(n, 60) * 0.03 + noise(n) * 0.02
    drip = np.zeros(n, dtype=np.float32)
    for _ in range(12):
        at = rng.integers(0, n - SR)
        m = int(SR * 0.09)
        drip[at:at + m] += tone(m, 900, 1700) * _env(m, 0.002, 0.03) * 0.25
    write_ogg(_st(fridge + drip), out / 'petak-amb-dapur.ogg', 56, mono=True, lufs=-26)
    # kota terbalik: angin tinggi dan burung
    gust = lowpass(noise(n), 250) * 10 * (0.5 + 0.5 * np.sin(2 * np.pi * t / 10) ** 2)
    write_ogg(_st(gust + birds), out / 'petak-amb-kota.ogg', 56, mono=True, lufs=-25)
    # kapal: deburan ombak, hujan, dan derit kayu
    surf = lowpass(noise(n), 500) * 26 * (0.45 + 0.55 * np.sin(2 * np.pi * t / 5) ** 2)
    creak = np.zeros(n, dtype=np.float32)
    for _ in range(5):
        at = rng.integers(0, n - 2 * SR)
        m = int(SR * 0.8)
        creak[at:at + m] += tone(m, 120, 190) * _env(m, 0.1, 0.25) * 0.06
    write_ogg(_st(surf + noise(n) * 0.09 + creak), out / 'petak-amb-kapal.ogg', 56, mono=True, lufs=-23)
    # kereta melintas: gemuruh naik-turun dengan ketukan roda
    n = int(SR * 8)
    t = np.arange(n) / SR
    rumble = lowpass(noise(n), 200) * 18
    clack = (np.mod(t, 0.31) < 0.03) * lowpass(noise(n), 30) * 3
    horn = (tone(n, 311) + tone(n, 392)) * 0.2 * np.exp(-(((t - 1.2) / 0.5) ** 4))
    write_ogg(_st((rumble + clack) * np.sin(np.pi * t / 8) ** 1.2 + horn), out / 'petak-kereta.ogg', 64, mono=True, lufs=-17)


def masak_music():
    """Dapur Kacau: "Coffee House Bump" (OatCog, CC0) — loop jazzy kafe; versi tegang ±10% lebih cepat
    saat waktu tinggal sedikit. Ditambah loop rebusan "boiling water loops" (TinyWorlds, CC0) untuk kompor."""
    loop = seamless_loop(load(SRC / 'music' / 'masak' / 'little_cafe.wav'), 1.5)
    write_ogg(loop, OUT / 'music' / 'masak.ogg', 80, lufs=-20)
    raw = OUT / 'music' / 'masak-loop.tmp.f32'
    raw.write_bytes(loop.astype(np.float32).tobytes())
    ff('-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', str(raw),
       '-af', f'asetrate={int(SR * 1.1)},aresample={SR},atempo=1.0,loudnorm=I=-19:TP=-1.5:LRA=11',
       '-ar', str(SR), '-c:a', 'libvorbis', '-b:a', '80k', str(OUT / 'music' / 'masak-tense.ogg'))
    raw.unlink()
    write_ogg(seamless_loop(load(SRC / 'masak-sfx' / 'cooking_without_cover_01.ogg'), 0.4), OUT / 'sfx' / 'masak-rebus.ogg', 56, mono=True, lufs=-24)


def masak_synth():
    """SFX Dapur Kacau disintesis: ketuk pisau, desis wajan, api menyala, semprot pemadam, cipratan cuci, dash"""
    rng = np.random.default_rng(23)
    out = OUT / 'sfx'

    def noise(n):
        return rng.standard_normal(n).astype(np.float32)

    def tone(n, f0, f1=None):
        f = np.linspace(f0, f1 or f0, n)
        return np.sin(2 * np.pi * np.cumsum(f) / SR).astype(np.float32)

    def env(n, a, r):
        t = np.arange(n) / SR
        return (np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / r)).astype(np.float32)

    def lowpass(x, k):
        return np.convolve(x, np.ones(k) / k, mode='same').astype(np.float32)

    def hp(x, k=0.95):
        y = np.empty_like(x)
        prev = 0.0
        last = 0.0
        for i, v in enumerate(x):
            last = k * (last + v - prev)
            prev = v
            y[i] = last
        return y

    n = int(SR * 0.09)
    knock = tone(n, 1800, 900) * env(n, 0.001, 0.012) * 0.6 + hp(noise(n)) * env(n, 0.001, 0.008) * 0.5 + tone(n, 220, 160) * env(n, 0.002, 0.03) * 0.4
    write_ogg(_st(knock), out / 'masak-potong.ogg', 64, mono=True, lufs=-17)
    n = int(SR * 1.2)
    sizzle = hp(noise(n), 0.985) * (0.6 + 0.4 * np.abs(noise(n)) ** 3).clip(0, 3) * env(n, 0.05, 0.6)
    write_ogg(_st(sizzle * 0.5), out / 'masak-desis.ogg', 64, mono=True, lufs=-21)
    n = int(SR * 0.9)
    whoosh = lowpass(noise(n), 30) * 6 * env(n, 0.06, 0.35) + tone(n, 90, 55) * env(n, 0.02, 0.3) * 0.5
    write_ogg(_st(whoosh), out / 'masak-api.ogg', 64, mono=True, lufs=-16)
    n = int(SR * 0.6)
    spray = hp(noise(n), 0.99) * env(n, 0.03, 0.4)
    write_ogg(_st(spray * 0.6), out / 'masak-semprot.ogg', 64, mono=True, lufs=-20)
    n = int(SR * 0.5)
    drip = np.zeros(n, dtype=np.float32)
    for i in range(6):
        at = int(rng.uniform(0, 0.35) * SR)
        k = int(SR * 0.08)
        drip[at:at + k] += tone(k, rng.uniform(700, 1300), rng.uniform(1500, 2400)) * env(k, 0.002, 0.02)
    write_ogg(_st(drip + lowpass(noise(n), 18) * env(n, 0.02, 0.2) * 1.5), out / 'masak-cuci.ogg', 64, mono=True, lufs=-20)
    n = int(SR * 0.3)
    write_ogg(_st(lowpass(noise(n), 12) * 4 * env(n, 0.01, 0.1) * np.linspace(0.6, 1, n)), out / 'masak-dash.ogg', 64, mono=True, lufs=-20)
    # terpeleset: siulan turun-naik konyol + bunyi gedebuk
    n = int(SR * 0.7)
    t = np.arange(n) / SR
    f = 900 - 600 * t / 0.7 + 120 * np.sin(t * 40)
    zip_ = np.sin(2 * np.pi * np.cumsum(f) / SR).astype(np.float32) * env(n, 0.01, 0.4) * 0.5
    k = int(SR * 0.15)
    thud = np.zeros(n, dtype=np.float32)
    thud[n - k:] = tone(k, 110, 50) * env(k, 0.002, 0.06)
    write_ogg(_st(zip_ + thud), out / 'masak-slip.ogg', 64, mono=True, lufs=-17)
    # matang: denting lonceng kecil (dua harmonik, peluruhan panjang)
    n = int(SR * 0.9)
    ding = (tone(n, 1568) + tone(n, 3136) * 0.35 + tone(n, 2350) * 0.15) * env(n, 0.002, 0.25)
    write_ogg(_st(ding * 0.5), out / 'masak-ding.ogg', 64, mono=True, lufs=-19)
    # mau gosong: bip pendek bernada tinggi
    n = int(SR * 0.09)
    bip = np.sign(tone(n, 1760)) * env(n, 0.002, 0.04) * 0.25
    write_ogg(_st(lowpass(bip, 3)), out / 'masak-bip.ogg', 64, mono=True, lufs=-20)
    # hitung mundur 3-2-1 dan "Mulai!"
    n = int(SR * 0.25)
    write_ogg(_st(tone(n, 880) * env(n, 0.003, 0.08) * 0.6), out / 'masak-hitung.ogg', 64, mono=True, lufs=-18)
    n = int(SR * 0.8)
    go = (tone(n, 1046, 1568) + tone(n, 1318, 1975) * 0.6) * env(n, 0.005, 0.3)
    write_ogg(_st(go * 0.5), out / 'masak-mulai.ogg', 64, mono=True, lufs=-17)


def puncak_synth():
    """SFX Puncak Berdua, semua disintesis: langkah, lompat, pegang, napas, jatuh, cebur, angin, api unggun, jingle"""
    rng = np.random.default_rng(31)
    out = OUT / 'sfx'

    def noise(n):
        return rng.standard_normal(n).astype(np.float32)

    def tone(n, f0, f1=None, shape='sin'):
        f = np.linspace(f0, f1 or f0, n)
        ph = 2 * np.pi * np.cumsum(f) / SR
        if shape == 'tri':
            return (2 / np.pi * np.arcsin(np.sin(ph))).astype(np.float32)
        return np.sin(ph).astype(np.float32)

    def env(n, a, r):
        t = np.arange(n) / SR
        return (np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / r)).astype(np.float32)

    def lowpass(x, k):
        return np.convolve(x, np.ones(k) / k, mode='same').astype(np.float32)

    def hp(x):
        return (x - lowpass(x, 24)).astype(np.float32)

    def save(x, name, lufs=-18):
        write_ogg(_st(x), out / f'puncak-{name}.ogg', 64, mono=True, lufs=lufs)

    n = int(SR * 0.12)
    save(lowpass(noise(n), 40) * 5 * env(n, 0.003, 0.03) + hp(noise(n)) * env(n, 0.001, 0.01) * 0.3, 'langkah', -22)
    n = int(SR * 0.35)
    save(lowpass(noise(n), 10) * 3 * env(n, 0.03, 0.12) + tone(n, 260, 520) * env(n, 0.01, 0.1) * 0.25, 'lompat', -20)
    n = int(SR * 0.16)
    save(lowpass(noise(n), 6) * 3 * env(n, 0.002, 0.04) + tone(n, 180, 120) * env(n, 0.002, 0.05) * 0.5, 'pegang', -19)
    n = int(SR * 1.1)
    t = np.arange(n) / SR
    breath = lowpass(noise(n), 18) * 4 * (np.sin(np.pi * np.clip(t / 0.45, 0, 1)) ** 2 + 0.7 * np.sin(np.pi * np.clip((t - 0.55) / 0.5, 0, 1)) ** 2)
    save(breath.astype(np.float32), 'napas', -22)
    n = int(SR * 0.5)
    save(tone(n, 120, 45) * env(n, 0.002, 0.12) + lowpass(noise(n), 30) * 6 * env(n, 0.002, 0.08), 'jatuh', -16)
    n = int(SR * 0.9)
    splash = hp(noise(n)) * env(n, 0.005, 0.25) * 0.8 + lowpass(noise(n), 50) * 5 * env(n, 0.01, 0.3)
    for i in range(10):
        at = int(rng.uniform(0.05, 0.6) * SR)
        k = int(SR * 0.05)
        splash[at:at + k] += tone(k, rng.uniform(900, 1500), rng.uniform(1600, 2600)) * env(k, 0.002, 0.015) * 0.4
    save(splash, 'cebur', -17)
    n = int(SR * 0.7)
    creak = tone(n, 140, 90, 'tri') * env(n, 0.05, 0.3) * (0.6 + 0.4 * np.sin(np.arange(n) / SR * 60)) * 0.5
    save(creak + tone(n, 880, 880) * env(n, 0.25, 0.2) * 0.25 + tone(n, 1320) * env(n, 0.3, 0.2) * 0.2, 'peti', -18)
    n = int(SR * 0.4)
    save(tone(n, 1046) * env(n, 0.004, 0.12) * 0.5 + tone(n, 1568) * env(n, 0.05, 0.15) * 0.4, 'ambil', -18)
    n = int(SR * 0.45)
    crunch = np.zeros(n, dtype=np.float32)
    for i in range(5):
        at = int(i * 0.08 * SR)
        k = int(SR * 0.05)
        crunch[at:at + k] += hp(noise(k)) * env(k, 0.001, 0.02)
    save(crunch, 'makan', -19)
    n = int(SR * 0.6)
    swish = lowpass(noise(n), 8) * 3 * env(n, 0.08, 0.2) * np.linspace(0.4, 1, n)
    k = int(SR * 0.1)
    swish[n - k:] += tone(k, 2400, 1800) * env(k, 0.001, 0.03) * 0.5
    save(swish.astype(np.float32), 'tali', -18)
    n = int(SR * 1.4)
    fire = lowpass(noise(n), 40) * 5 * env(n, 0.1, 0.6)
    for i in range(14):
        at = int(rng.uniform(0, 1.2) * SR)
        k = int(SR * 0.02)
        fire[at:at + k] += hp(noise(k)) * 0.8
    chime = sum(tone(n, f) * env(n, 0.01 + j * 0.08, 0.5) * 0.18 for j, f in enumerate([523, 659, 784, 1046]))
    save((fire + chime).astype(np.float32), 'api', -16)
    n = int(SR * 0.9)
    save(tone(n, 660, 180, 'tri') * env(n, 0.01, 0.5) * 0.5 + tone(n, 330, 90) * env(n, 0.01, 0.4) * 0.4, 'pingsan', -17)
    n = int(SR * 0.7)
    up = sum(tone(int(SR * 0.18), f) * env(int(SR * 0.18), 0.005, 0.08) for f in [523])
    rise = np.zeros(n, dtype=np.float32)
    for j, f in enumerate([523, 659, 784, 1046]):
        at = int(j * 0.11 * SR)
        k = int(SR * 0.25)
        rise[at:at + k] += tone(k, f) * env(k, 0.005, 0.1) * 0.5
    save(rise + 0 * up.sum(), 'bangun', -17)
    n = int(SR * 0.6)
    t = np.arange(n) / SR
    f = 2600 + 180 * np.sin(t * 2 * np.pi * 28)
    whistle = np.sin(2 * np.pi * np.cumsum(f) / SR).astype(np.float32) * env(n, 0.01, 0.4) + hp(noise(n)) * env(n, 0.01, 0.3) * 0.1
    save(whistle, 'peluit', -18)
    n = int(SR * 1.2)
    save(lowpass(noise(n), 90) * 9 * env(n, 0.05, 0.5) + tone(n, 60, 40) * env(n, 0.02, 0.5) * 0.6, 'batu', -15)
    n = int(SR * 1.5)
    save(hp(noise(n)) * env(n, 0.05, 0.8) * 0.9 + lowpass(noise(n), 20) * 3 * env(n, 0.05, 0.6), 'uap', -17)
    n = int(SR * 0.5)
    t = np.arange(n) / SR
    buzz = tone(n, 220) * (0.5 + 0.5 * np.sign(np.sin(t * 2 * np.pi * 220))) * env(n, 0.01, 0.2) * 0.3
    save(buzz.astype(np.float32), 'sengat', -20)
    n = int(SR * 0.3)
    save(tone(n, 784, 1046) * env(n, 0.005, 0.1) * 0.5 + lowpass(noise(n), 10) * env(n, 0.005, 0.05), 'pakai', -19)
    # jingle menang / kalah: arpeggio plucky
    def jingle(notes, step, length):
        n = int(SR * length)
        x = np.zeros(n, dtype=np.float32)
        for j, f in enumerate(notes):
            at = int(j * step * SR)
            k = min(n - at, int(SR * 0.8))
            x[at:at + k] += (tone(k, f, shape='tri') * 0.6 + tone(k, f * 2) * 0.25) * env(k, 0.004, 0.25)
        return x
    save(jingle([523, 659, 784, 1046, 784, 1046, 1318], 0.12, 1.8), 'menang', -15)
    save(jingle([523, 466, 392, 311, 262], 0.18, 1.6), 'kalah', -16)
    # angin: loop 8 detik, hembusan naik-turun, ujung disambung mulus
    n = int(SR * 8)
    t = np.arange(n) / SR
    w = lowpass(noise(n), 60) * 6 + hp(noise(n)) * 0.08
    gust = 0.55 + 0.45 * np.sin(2 * np.pi * t / 8) ** 2 * (0.7 + 0.3 * np.sin(2 * np.pi * t * 3 / 8))
    wind = (w * gust).astype(np.float32)
    k = int(SR * 1)
    fade = np.linspace(0, 1, k, dtype=np.float32)
    wind[:k] = wind[:k] * fade + wind[-k:] * (1 - fade)
    write_ogg(_st(wind[:-k]), out / 'puncak-angin.ogg', 48, mono=True, lufs=-24)


def puncak_music():
    """Musik & suara alam Puncak Berdua v3: lihat scripts/audio/puncak_songs.py"""
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import puncak_songs as ps
    write_ogg(seamless_loop(ps.song_low(), 1.5), OUT / 'music' / 'puncak.ogg', 80, lufs=-21)
    write_ogg(seamless_loop(ps.song_high(), 2.0), OUT / 'music' / 'puncak-tinggi.ogg', 80, lufs=-21)
    rng = np.random.default_rng(717)
    for name, x in ps.ambience(rng).items():
        write_ogg(_st(x), OUT / 'sfx' / f'puncak-{name}.ogg', 48, mono=True, lufs=-26)
    for name, x in ps.coop_sfx(rng).items():
        write_ogg(_st(x), OUT / 'sfx' / f'puncak-{name}.ogg', 64, mono=True, lufs=-19)


def tali_synth():
    """SFX Tali Jodoh yang disintesis sendiri: lompat, mendarat, kait, permen, bendera, jatuh, tombol, tuas, finis, gulung."""
    out = OUT / 'sfx'
    rng = np.random.default_rng(31)

    def t(n):
        return np.arange(n) / SR

    def tone(n, f0, f1=None, kind='sin'):
        f = np.linspace(f0, f1 or f0, n)
        ph = 2 * np.pi * np.cumsum(f) / SR
        return np.sin(ph) if kind == 'sin' else np.sign(np.sin(ph)) * 0.3 + np.sin(ph) * 0.7

    def bell(n, f, decay=0.6):
        x = t(n)
        return (np.sin(2 * np.pi * f * x) + 0.45 * np.sin(2 * np.pi * f * 2.76 * x) + 0.2 * np.sin(2 * np.pi * f * 5.4 * x)) * np.exp(-x / decay)

    def noise(n, k=1):
        x = rng.standard_normal(n)
        if k > 1:
            x = np.convolve(x, np.ones(k) / k, mode='same')
        return x

    def w(x, name, lufs=-18):
        write_ogg(_st(x.astype(np.float32)), out / f'tali-{name}.ogg', 64, mono=True, lufs=lufs)

    n = int(0.22 * SR)
    w(tone(n, 260, 620) * _env(n, 0.004, 0.08) + noise(n, 30) * 0.15 * _env(n, 0.002, 0.03), 'jump')
    n = int(0.16 * SR)
    w(noise(n, 40) * _env(n, 0.002, 0.04) * 3 + tone(n, 110, 70) * 0.6 * _env(n, 0.002, 0.05), 'land', -20)
    n = int(0.25 * SR)
    w(bell(n, 820, 0.06) * 0.6 + noise(n, 6) * 0.2 * _env(n, 0.001, 0.02), 'hook')
    n = int(0.2 * SR)
    w(noise(n, 80) * 2.5 * _env(n, 0.01, 0.06) + tone(n, 150, 120) * 0.4 * _env(n, 0.005, 0.08), 'brace', -21)
    n = int(0.45 * SR)
    w(bell(n, 1318, 0.18) + bell(n, 1760, 0.14) * np.r_[np.zeros(int(0.07 * SR)), np.ones(n - int(0.07 * SR))], 'candy', -17)
    n = int(0.9 * SR)
    seq = np.zeros(n)
    for i, f in enumerate([523, 659, 784, 1046]):
        a = int(i * 0.11 * SR)
        seq[a:] += bell(n - a, f, 0.25)[: n - a]
    w(seq, 'checkpoint', -16)
    n = int(0.6 * SR)
    w(noise(n, 12) * _env(n, 0.005, 0.25) * 1.2 + tone(n, 520, 140) * 0.5 * _env(n, 0.005, 0.3), 'fall', -17)
    n = int(0.12 * SR)
    w(tone(n, 900, 600) * _env(n, 0.001, 0.025) + noise(n, 4) * 0.3 * _env(n, 0.001, 0.01), 'press', -19)
    n = int(0.3 * SR)
    w(noise(n, 20) * _env(n, 0.002, 0.05) * 2 + tone(n, 200, 90) * _env(n, 0.002, 0.12), 'lever', -18)
    n = int(1.6 * SR)
    seq = np.zeros(n)
    for i, f in enumerate([523, 587, 659, 784, 880, 1046, 1318]):
        a = int(i * 0.09 * SR)
        seq[a:] += bell(n - a, f, 0.4 if i == 6 else 0.18)[: n - a] * (1.3 if i == 6 else 1)
    w(seq, 'goal', -15)
    n = int(0.12 * SR)
    w(noise(n, 3) * _env(n, 0.002, 0.03) * 0.6 + tone(n, 1400, 1100) * 0.2 * _env(n, 0.001, 0.02), 'reel', -22)


def tali_music():
    """Lagu Tali Jodoh: satu lagu berbeda per level (scripts/audio/tali_songs.py), sudah melingkar mulus."""
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from tali_songs import SONGS
    old = OUT / 'music' / 'tali.ogg'
    if old.exists():
        old.unlink()
    for name, make in SONGS.items():
        x = make()
        write_ogg(x, OUT / 'music' / f'tali-{name}.ogg', 72, lufs=-20)
        print('lagu', name, f'{len(x) / SR:.1f} dtk', flush=True)


def _env(n, a=0.005, r=0.2):
    """Amplop attack/release sederhana untuk n sampel."""
    t = np.arange(n) / SR
    e = np.minimum(1, t / a) * np.exp(-np.maximum(0, t - a) / max(1e-3, r))
    return e.astype(np.float32)


def _st(x):
    return np.stack([x, x], axis=1).astype(np.float32)


def kart_synth():
    """SFX Kart Kacau yang disintesis sendiri (bukan sampel): mesin, turbo, lompat, hujan, hitung mundur."""
    rng = np.random.default_rng(7)
    out = OUT / 'sfx'
    # mesin: dengung gergaji 70 Hz + harmonik, dibuat tepat 2 detik supaya loop mulus (frekuensi bulat)
    n = SR * 2
    t = np.arange(n) / SR
    f = 70.0
    saw = sum(((-1) ** (k + 1)) * np.sin(2 * np.pi * f * k * t) / k for k in range(1, 9))
    rumble = 0.6 * saw * (0.85 + 0.15 * np.sin(2 * np.pi * 15 * t)) + 0.15 * np.sin(2 * np.pi * 35 * t)
    write_ogg(_st(rumble * 0.4), out / 'kart-engine.ogg', 64, mono=True, lufs=-20)
    # turbo: desis naik (noise disaring kasar + sweep)
    n = int(SR * 0.9)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    noise = np.convolve(noise, np.ones(6) / 6, 'same')
    sweep = np.sin(2 * np.pi * (200 * t + 900 * t ** 2))
    write_ogg(_st((noise * 0.6 + sweep * 0.4) * _env(n, 0.04, 0.35)), out / 'kart-boost.ogg', 64, mono=True, lufs=-16)
    # drift: decit ban (sinus bergetar 1.4 kHz + noise)
    n = int(SR * 0.5)
    t = np.arange(n) / SR
    sq = np.sin(2 * np.pi * (1400 + 120 * np.sin(2 * np.pi * 30 * t)) * t) * 0.5 + rng.standard_normal(n) * 0.15
    write_ogg(_st(sq * _env(n, 0.02, 0.25)), out / 'kart-drift.ogg', 64, mono=True, lufs=-20)
    # lompat: siulan naik
    n = int(SR * 0.35)
    t = np.arange(n) / SR
    write_ogg(_st(np.sin(2 * np.pi * (300 * t + 1400 * t ** 2)) * _env(n, 0.01, 0.2)), out / 'kart-jump.ogg', 64, mono=True, lufs=-18)
    # hitung mundur: bip 660 Hz, GO 990 Hz lebih panjang (sinus + oktaf)
    for name, freq, dur in (('kart-count', 660, 0.22), ('kart-go', 990, 0.6)):
        n = int(SR * dur)
        t = np.arange(n) / SR
        tone = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(2 * np.pi * freq * 2 * t)
        write_ogg(_st(tone * _env(n, 0.005, dur * 0.6)), out / f'{name}.ogg', 64, mono=True, lufs=-16)
    # hujan: noise lembut berbintik
    n = int(SR * 1.6)
    drops = (rng.random(n) > 0.997).astype(np.float32) * rng.random(n)
    drops = np.convolve(drops, np.exp(-np.arange(300) / 40), 'same')
    rain = np.convolve(rng.standard_normal(n), np.ones(20) / 20, 'same') * 0.5 + drops
    write_ogg(_st(rain * _env(n, 0.2, 0.8)), out / 'kart-rain.ogg', 64, mono=True, lufs=-20)


SFX = {
    # kartu — Kenney "Casino Audio"
    'card-place-1': 'casino/x/Audio/card-place-1.ogg',
    'card-place-2': 'casino/x/Audio/card-place-2.ogg',
    'card-place-3': 'casino/x/Audio/card-place-3.ogg',
    'card-slide-1': 'casino/x/Audio/card-slide-1.ogg',
    'card-slide-2': 'casino/x/Audio/card-slide-2.ogg',
    'card-slide-3': 'casino/x/Audio/card-slide-3.ogg',
    'card-shuffle': 'casino/x/Audio/card-shuffle.ogg',
    'card-fan': 'casino/x/Audio/card-fan-1.ogg',
    'card-shove': 'casino/x/Audio/card-shove-1.ogg',
    'pack-open': 'casino/x/Audio/cards-pack-open-1.ogg',
    'pack-take': 'casino/x/Audio/cards-pack-take-out-1.ogg',
    'chips-stack': 'casino/x/Audio/chips-stack-1.ogg',
    'dice-shake': 'casino/x/Audio/dice-shake-1.ogg',
    # UI — Kenney "Interface Sounds"
    'ui-click': 'interface/x/Audio/click_002.ogg',
    'ui-open': 'interface/x/Audio/open_001.ogg',
    'ui-close': 'interface/x/Audio/close_001.ogg',
    'ui-toggle': 'interface/x/Audio/toggle_001.ogg',
    'ui-select': 'interface/x/Audio/select_002.ogg',
    'turn-ding': 'interface/x/Audio/glass_002.ogg',
    'switch': 'interface/x/Audio/switch_002.ogg',
    # jingle — Kenney "Music Jingles" (saksofon)
    'jingle-uno': 'jingles/x/OGG/jingles_SAX/jingles_SAX04.ogg',
    'jingle-round-win': 'jingles/x/OGG/jingles_SAX/jingles_SAX10.ogg',
    'jingle-champion': 'jingles/x/OGG/jingles_SAX/jingles_SAX02.ogg',
    'jingle-round-lose': 'jingles/x/OGG/jingles_SAX/jingles_SAX01.ogg',
    'jingle-caught': 'jingles/x/OGG/jingles_SAX/jingles_SAX05.ogg',
    'jingle-challenge-win': 'jingles/x/OGG/jingles_SAX/jingles_SAX16.ogg',
    'jingle-challenge-lose': 'jingles/x/OGG/jingles_SAX/jingles_SAX09.ogg',
    'jingle-out': 'jingles/x/OGG/jingles_SAX/jingles_SAX14.ogg',
    # Tebak Gambar — Kenney "Music Jingles" versi steel drum & pizzicato + "Interface Sounds"
    'draw-correct': 'jingles/x/OGG/jingles_STEEL/jingles_STEEL16.ogg',
    'draw-champion': 'jingles/x/OGG/jingles_STEEL/jingles_STEEL02.ogg',
    'draw-lose': 'jingles/x/OGG/jingles_STEEL/jingles_STEEL01.ogg',
    'draw-timeup': 'jingles/x/OGG/jingles_STEEL/jingles_STEEL09.ogg',
    'draw-reveal': 'jingles/x/OGG/jingles_PIZZA/jingles_PIZZA10.ogg',
    'draw-turn': 'jingles/x/OGG/jingles_PIZZA/jingles_PIZZA04.ogg',
    'draw-close': 'interface/x/Audio/question_002.ogg',
    'draw-guess': 'interface/x/Audio/pluck_001.ogg',
    'draw-scratch': 'interface/x/Audio/scratch_002.ogg',
    'draw-tick': 'interface/x/Audio/tick_002.ogg',
    # Kartu Remi — sisa Kenney "Casino Audio", jingle versi HIT & NES, dan "Interface Sounds"
    'remi-place-1': 'casino/x/Audio/card-place-4.ogg',
    'remi-place-2': 'casino/x/Audio/card-shove-2.ogg',
    'remi-place-3': 'casino/x/Audio/card-shove-3.ogg',
    'remi-slide-1': 'casino/x/Audio/card-slide-4.ogg',
    'remi-slide-2': 'casino/x/Audio/card-slide-6.ogg',
    'remi-fan': 'casino/x/Audio/card-fan-2.ogg',
    'remi-deal': 'casino/x/Audio/cards-pack-open-2.ogg',
    'remi-fold': 'casino/x/Audio/card-shove-4.ogg',
    'remi-chip': 'casino/x/Audio/chip-lay-2.ogg',
    'remi-chips': 'casino/x/Audio/chips-collide-3.ogg',
    'remi-pot': 'casino/x/Audio/chips-handle-4.ogg',
    'remi-check': 'interface/x/Audio/drop_002.ogg',
    'remi-pass': 'interface/x/Audio/back_002.ogg',
    'remi-turn': 'interface/x/Audio/glass_004.ogg',
    'remi-call': 'interface/x/Audio/error_004.ogg',
    'remi-win': 'jingles/x/OGG/jingles_HIT/jingles_HIT10.ogg',
    'remi-champion': 'jingles/x/OGG/jingles_HIT/jingles_HIT02.ogg',
    'remi-lose': 'jingles/x/OGG/jingles_HIT/jingles_HIT01.ogg',
    'remi-liar': 'jingles/x/OGG/jingles_HIT/jingles_HIT05.ogg',
    'remi-honest': 'jingles/x/OGG/jingles_HIT/jingles_HIT16.ogg',
    'remi-bust': 'jingles/x/OGG/jingles_HIT/jingles_HIT09.ogg',
    'remi-joker': 'jingles/x/OGG/jingles_HIT/jingles_HIT14.ogg',
    'remi-bomb': 'jingles/x/OGG/jingles_HIT/jingles_HIT04.ogg',
    'remi-blackjack': 'jingles/x/OGG/jingles_NES/jingles_NES04.ogg',
    # Domino — bunyi "klak" chip & dadu dari Kenney "Casino Audio" (mirip kartu domino plastik), jingle NES & "Interface Sounds"
    'domino-place-1': 'casino/x/Audio/chip-lay-1.ogg',
    'domino-place-2': 'casino/x/Audio/chip-lay-3.ogg',
    'domino-place-3': 'casino/x/Audio/chips-collide-1.ogg',
    'domino-draw-1': 'casino/x/Audio/dice-grab-1.ogg',
    'domino-draw-2': 'casino/x/Audio/dice-grab-2.ogg',
    'domino-shuffle': 'casino/x/Audio/chips-handle-1.ogg',
    'domino-deal': 'casino/x/Audio/chips-stack-2.ogg',
    'domino-chip': 'casino/x/Audio/chips-collide-2.ogg',
    'domino-chips': 'casino/x/Audio/chips-handle-3.ogg',
    'domino-pot': 'casino/x/Audio/chips-stack-3.ogg',
    'domino-check': 'interface/x/Audio/drop_003.ogg',
    'domino-pass': 'interface/x/Audio/back_003.ogg',
    'domino-turn': 'interface/x/Audio/glass_006.ogg',
    'domino-fold': 'interface/x/Audio/minimize_004.ogg',
    'domino-score': 'jingles/x/OGG/jingles_NES/jingles_NES06.ogg',
    'domino-win': 'jingles/x/OGG/jingles_NES/jingles_NES10.ogg',
    'domino-champion': 'jingles/x/OGG/jingles_NES/jingles_NES02.ogg',
    'domino-lose': 'jingles/x/OGG/jingles_NES/jingles_NES01.ogg',
    'domino-blocked': 'jingles/x/OGG/jingles_NES/jingles_NES09.ogg',
    'domino-special': 'jingles/x/OGG/jingles_NES/jingles_NES05.ogg',
    # Monopoli — dadu & tumpukan uang dari sisa Kenney "Casino Audio", "Interface Sounds", jingle pizzicato yang belum dipakai
    'monopoly-dice-1': 'casino/x/Audio/dice-throw-1.ogg',
    'monopoly-dice-2': 'casino/x/Audio/dice-throw-2.ogg',
    'monopoly-shake': 'casino/x/Audio/dice-shake-2.ogg',
    'monopoly-step': 'interface/x/Audio/tick_004.ogg',
    'monopoly-buy': 'interface/x/Audio/confirmation_001.ogg',
    'monopoly-cash': 'casino/x/Audio/chips-stack-4.ogg',
    'monopoly-rent': 'casino/x/Audio/chips-handle-5.ogg',
    'monopoly-bid': 'casino/x/Audio/chips-collide-4.ogg',
    'monopoly-build': 'interface/x/Audio/drop_004.ogg',
    'monopoly-card': 'casino/x/Audio/card-slide-7.ogg',
    'monopoly-turn': 'interface/x/Audio/glass_005.ogg',
    'monopoly-pass': 'interface/x/Audio/back_004.ogg',
    'monopoly-mortgage': 'interface/x/Audio/switch_005.ogg',
    'monopoly-trade': 'interface/x/Audio/maximize_005.ogg',
    'monopoly-go': 'jingles/x/OGG/jingles_PIZZA/jingles_PIZZA06.ogg',
    'monopoly-doubles': 'jingles/x/OGG/jingles_PIZZA/jingles_PIZZA03.ogg',
    'monopoly-sold': 'jingles/x/OGG/jingles_PIZZA/jingles_PIZZA14.ogg',
    'monopoly-jail': 'jingles/x/OGG/jingles_PIZZA/jingles_PIZZA09.ogg',
    'monopoly-jackpot': 'jingles/x/OGG/jingles_PIZZA/jingles_PIZZA16.ogg',
    'monopoly-bankrupt': 'jingles/x/OGG/jingles_PIZZA/jingles_PIZZA05.ogg',
    'monopoly-champion': 'jingles/x/OGG/jingles_PIZZA/jingles_PIZZA02.ogg',
    'monopoly-lose': 'jingles/x/OGG/jingles_PIZZA/jingles_PIZZA01.ogg',
    # Ludo — dadu tunggal Kenney, tombol Interface Sounds, jingle steel drum & hit
    'ludo-shake': 'casino/x/Audio/dice-shake-3.ogg',
    'ludo-throw-1': 'casino/x/Audio/die-throw-1.ogg',
    'ludo-throw-2': 'casino/x/Audio/die-throw-3.ogg',
    'ludo-step': 'interface/x/Audio/pluck_002.ogg',
    'ludo-out': 'interface/x/Audio/maximize_002.ogg',
    'ludo-safe': 'interface/x/Audio/select_005.ogg',
    'ludo-turn': 'interface/x/Audio/glass_003.ogg',
    'ludo-nomove': 'interface/x/Audio/back_001.ogg',
    'ludo-boost': 'interface/x/Audio/maximize_008.ogg',
    'ludo-portal': 'interface/x/Audio/glitch_002.ogg',
    'ludo-slip': 'interface/x/Audio/error_006.ogg',
    'ludo-bomb': 'jingles/x/OGG/jingles_HIT/jingles_HIT08.ogg',
    'ludo-capture': 'jingles/x/OGG/jingles_STEEL/jingles_STEEL05.ogg',
    'ludo-six': 'jingles/x/OGG/jingles_STEEL/jingles_STEEL03.ogg',
    'ludo-home': 'jingles/x/OGG/jingles_STEEL/jingles_STEEL12.ogg',
    'ludo-champion': 'jingles/x/OGG/jingles_STEEL/jingles_STEEL13.ogg',
    'ludo-lose': 'jingles/x/OGG/jingles_STEEL/jingles_STEEL07.ogg',
    # Siapa Mata-mata — tombol Interface Sounds, hantaman HIT & jingle saksofon
    'spy-reveal': 'interface/x/Audio/maximize_006.ogg',
    'spy-ready': 'interface/x/Audio/confirmation_002.ogg',
    'spy-turn': 'interface/x/Audio/question_001.ogg',
    'spy-clue': 'interface/x/Audio/drop_001.ogg',
    'spy-vote': 'interface/x/Audio/click_004.ogg',
    'spy-tick': 'interface/x/Audio/tick_001.ogg',
    'spy-innocent': 'interface/x/Audio/error_005.ogg',
    'spy-guess-wrong': 'interface/x/Audio/error_007.ogg',
    'spy-stamp': 'jingles/x/OGG/jingles_HIT/jingles_HIT11.ogg',
    'spy-caught': 'jingles/x/OGG/jingles_SAX/jingles_SAX03.ogg',
    'spy-escape': 'jingles/x/OGG/jingles_SAX/jingles_SAX12.ogg',
    'spy-guess-right': 'jingles/x/OGG/jingles_SAX/jingles_SAX13.ogg',
    'spy-champion': 'jingles/x/OGG/jingles_SAX/jingles_SAX07.ogg',
    'spy-lose': 'jingles/x/OGG/jingles_SAX/jingles_SAX15.ogg',
    # Bom Waktu — tombol Interface Sounds, hantaman HIT & jingle pizzicato
    'bom-light': 'interface/x/Audio/maximize_003.ogg',
    'bom-tick': 'interface/x/Audio/tick_002.ogg',
    'bom-turn': 'interface/x/Audio/question_002.ogg',
    'bom-pass': 'interface/x/Audio/minimize_005.ogg',
    'bom-accept': 'interface/x/Audio/confirmation_001.ogg',
    'bom-reject': 'interface/x/Audio/error_004.ogg',
    'bom-protest': 'interface/x/Audio/bong_001.ogg',
    'bom-cancel': 'interface/x/Audio/glitch_002.ogg',
    'bom-power': 'interface/x/Audio/pluck_002.ogg',
    'bom-cut': 'interface/x/Audio/scratch_003.ogg',
    'bom-boom': 'jingles/x/OGG/jingles_HIT/jingles_HIT03.ogg',
    'bom-out': 'jingles/x/OGG/jingles_PIZZA/jingles_PIZZA07.ogg',
    'bom-champion': 'jingles/x/OGG/jingles_PIZZA/jingles_PIZZA12.ogg',
    'bom-lose': 'jingles/x/OGG/jingles_PIZZA/jingles_PIZZA15.ogg',
    # Dapur Kacau — Kenney; potong, desis, api, semprot, cuci, ding, bip, hitung & mulai disintesis di masak_synth
    'masak-served': 'interface/x/Audio/confirmation_004.ogg',
    'masak-order': 'interface/x/Audio/maximize_003.ogg',
    'masak-wrong': 'interface/x/Audio/error_006.ogg',
    'masak-missed': 'interface/x/Audio/error_007.ogg',
    'masak-grab': 'interface/x/Audio/drop_002.ogg',
    'masak-burnt': 'interface/x/Audio/bong_001.ogg',
    'masak-win': 'jingles/x/OGG/jingles_STEEL/jingles_STEEL06.ogg',
    'masak-lose': 'jingles/x/OGG/jingles_STEEL/jingles_STEEL11.ogg',
    # Petak Cat — Kenney; sisanya disintesis di petak_synth
    'petak-hunt': 'jingles/x/OGG/jingles_HIT/jingles_HIT03.ogg',
    'petak-catch': 'jingles/x/OGG/jingles_PIZZA/jingles_PIZZA03.ogg',
    'petak-miss': 'interface/x/Audio/error_004.ogg',
    'petak-reveal': 'jingles/x/OGG/jingles_HIT/jingles_HIT08.ogg',
    # Kart Kacau — Kenney "Interface Sounds" & "Music Jingles" (sisanya disintesis di kart_synth)
    'kart-lap': 'interface/x/Audio/maximize_006.ogg',
    'kart-final': 'jingles/x/OGG/jingles_NES/jingles_NES12.ogg',
    'kart-hit': 'interface/x/Audio/glitch_003.ogg',
    'kart-bump': 'interface/x/Audio/drop_002.ogg',
    'kart-box': 'interface/x/Audio/pluck_001.ogg',
    'kart-item': 'interface/x/Audio/confirmation_003.ogg',
    'kart-land': 'interface/x/Audio/drop_003.ogg',
    'kart-finish': 'jingles/x/OGG/jingles_NES/jingles_NES08.ogg',
    'kart-fall': 'interface/x/Audio/error_006.ogg',
    'kart-shield': 'interface/x/Audio/glass_003.ogg',
    'kart-blast': 'jingles/x/OGG/jingles_HIT/jingles_HIT07.ogg',
    'kart-throw': 'interface/x/Audio/minimize_003.ogg',
    'kart-champion': 'jingles/x/OGG/jingles_NES/jingles_NES13.ogg',
    'kart-lose': 'jingles/x/OGG/jingles_PIZZA/jingles_PIZZA08.ogg',
    'sport-turn': 'interface/x/Audio/question_003.ogg',
    'sport-throw': 'interface/x/Audio/drop_001.ogg',
    'sport-strike': 'jingles/x/OGG/jingles_NES/jingles_NES06.ogg',
    'sport-spare': 'jingles/x/OGG/jingles_NES/jingles_NES03.ogg',
    'sport-gutter': 'jingles/x/OGG/jingles_PIZZA/jingles_PIZZA03.ogg',
    'sport-champion': 'jingles/x/OGG/jingles_NES/jingles_NES15.ogg',
    'sport-lose': 'jingles/x/OGG/jingles_PIZZA/jingles_PIZZA05.ogg',
}

LOUD = {'draw-correct', 'draw-champion', 'draw-lose', 'draw-timeup', 'draw-reveal', 'draw-turn',
        'remi-win', 'remi-champion', 'remi-lose', 'remi-liar', 'remi-honest', 'remi-bust', 'remi-joker', 'remi-bomb', 'remi-blackjack',
        'domino-score', 'domino-win', 'domino-champion', 'domino-lose', 'domino-blocked', 'domino-special',
        'monopoly-go', 'monopoly-doubles', 'monopoly-sold', 'monopoly-jail', 'monopoly-jackpot', 'monopoly-bankrupt',
        'monopoly-champion', 'monopoly-lose',
        'ludo-bomb', 'ludo-capture', 'ludo-six', 'ludo-home', 'ludo-champion', 'ludo-lose',
        'spy-stamp', 'spy-caught', 'spy-escape', 'spy-guess-right', 'spy-champion', 'spy-lose',
        'bom-boom', 'bom-out', 'bom-champion', 'bom-lose',
        'kart-final', 'kart-finish', 'kart-blast', 'kart-champion', 'kart-lose',
        'sport-strike', 'sport-spare', 'sport-gutter', 'sport-champion', 'sport-lose'}


def sfx(prefix=''):
    todo = {k: v for k, v in SFX.items() if k.startswith(prefix)}
    missing = [k for k, v in todo.items() if not (SRC / v).exists()]
    if missing:
        sys.exit('File SFX tidak ditemukan: ' + ', '.join(f'{k} ({SFX[k]})' for k in missing))
    for name, rel in todo.items():
        x = load(SRC / rel)
        # potong hening di awal supaya responsif
        level = np.abs(x).max(axis=1)
        start = int(np.argmax(level > 0.01))
        write_ogg(x[start:], OUT / 'sfx' / f'{name}.ogg', 64, mono=True, lufs=-16 if name.startswith('jingle') or name in LOUD else -18)


if __name__ == '__main__':
    if sys.argv[1:] == ['draw']:
        draw_music()
        sfx('draw-')
    elif sys.argv[1:] == ['remi']:
        remi_music()
        sfx('remi-')
    elif sys.argv[1:] == ['domino']:
        domino_music()
        sfx('domino-')
    elif sys.argv[1:] == ['monopoly']:
        monopoly_music()
        sfx('monopoly-')
    elif sys.argv[1:] == ['ludo']:
        ludo_music()
        sfx('ludo-')
    elif sys.argv[1:] == ['spy']:
        spy_music()
        sfx('spy-')
    elif sys.argv[1:] == ['bom']:
        bom_music()
        sfx('bom-')
    elif sys.argv[1:] == ['kart']:
        kart_music()
        kart_synth()
    elif sys.argv[1:] == ['tali']:
        tali_music()
        tali_synth()
        sfx('kart-')
    elif sys.argv[1:] == ['sport']:
        sport_music()
        sport_synth()
        sfx('sport-')
    elif sys.argv[1:] == ['petak']:
        petak_music()
        petak_synth()
        sfx('petak-')
    elif sys.argv[1:] == ['masak']:
        masak_music()
        masak_synth()
        sfx('masak-')
    elif sys.argv[1:] == ['puncak']:
        puncak_synth()
        puncak_music()
    else:
        music()
        draw_music()
        remi_music()
        domino_music()
        monopoly_music()
        ludo_music()
        spy_music()
        bom_music()
        kart_music()
        kart_synth()
        sport_music()
        sport_synth()
        petak_music()
        petak_synth()
        masak_music()
        masak_synth()
        puncak_synth()
        puncak_music()
        sfx()
    total = sum(p.stat().st_size for p in OUT.rglob('*.ogg'))
    print(f'Selesai: {len(list(OUT.rglob("*.ogg")))} file, {total / 1024 / 1024:.2f} MB di {OUT}')
