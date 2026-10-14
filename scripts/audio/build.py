"""Olah audio CC0 (sumber di D:/dev/audio-src) menjadi aset app di public/audio/.

Jalankan:  python -I scripts/audio/build.py
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
}


def sfx():
    missing = [k for k, v in SFX.items() if not (SRC / v).exists()]
    if missing:
        sys.exit('File SFX tidak ditemukan: ' + ', '.join(f'{k} ({SFX[k]})' for k in missing))
    for name, rel in SFX.items():
        x = load(SRC / rel)
        # potong hening di awal supaya responsif
        level = np.abs(x).max(axis=1)
        start = int(np.argmax(level > 0.01))
        write_ogg(x[start:], OUT / 'sfx' / f'{name}.ogg', 64, mono=True, lufs=-16 if name.startswith('jingle') else -18)


if __name__ == '__main__':
    music()
    sfx()
    total = sum(p.stat().st_size for p in OUT.rglob('*.ogg'))
    print(f'Selesai: {len(list(OUT.rglob("*.ogg")))} file, {total / 1024 / 1024:.2f} MB di {OUT}')
