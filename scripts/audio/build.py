"""Olah audio CC0 (sumber di D:/dev/audio-src) menjadi aset app di public/audio/.

Jalankan:  python -I scripts/audio/build.py          (semua)
           python -I scripts/audio/build.py draw     (hanya musik & SFX Tebak Gambar)
           python -I scripts/audio/build.py remi     (hanya musik & SFX Kartu Remi)
           python -I scripts/audio/build.py domino   (hanya musik & SFX Domino)
           python -I scripts/audio/build.py monopoly (hanya musik & SFX Monopoli)
           python -I scripts/audio/build.py ludo     (hanya musik & SFX Ludo)
           python -I scripts/audio/build.py bom      (hanya musik & SFX Bom Waktu)
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
}

LOUD = {'draw-correct', 'draw-champion', 'draw-lose', 'draw-timeup', 'draw-reveal', 'draw-turn',
        'remi-win', 'remi-champion', 'remi-lose', 'remi-liar', 'remi-honest', 'remi-bust', 'remi-joker', 'remi-bomb', 'remi-blackjack',
        'domino-score', 'domino-win', 'domino-champion', 'domino-lose', 'domino-blocked', 'domino-special',
        'monopoly-go', 'monopoly-doubles', 'monopoly-sold', 'monopoly-jail', 'monopoly-jackpot', 'monopoly-bankrupt',
        'monopoly-champion', 'monopoly-lose',
        'ludo-bomb', 'ludo-capture', 'ludo-six', 'ludo-home', 'ludo-champion', 'ludo-lose',
        'bom-boom', 'bom-out', 'bom-champion', 'bom-lose'}


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
    elif sys.argv[1:] == ['bom']:
        bom_music()
        sfx('bom-')
    else:
        music()
        draw_music()
        remi_music()
        domino_music()
        monopoly_music()
        ludo_music()
        bom_music()
        sfx()
    total = sum(p.stat().st_size for p in OUT.rglob('*.ogg'))
    print(f'Selesai: {len(list(OUT.rglob("*.ogg")))} file, {total / 1024 / 1024:.2f} MB di {OUT}')
