"""Sintesis musik & SFX horor Sunyi dari nol (numpy + ffmpeg), tanpa sampel luar.

Jalankan:  python -I scripts/sunyi/audio.py
Hasil: public/audio/music/sunyi*.ogg dan public/audio/sfx/sunyi-*.ogg
"""
import subprocess
from pathlib import Path

import numpy as np

OUT = Path(__file__).resolve().parents[2] / 'public' / 'audio'
SR = 44100
rng = np.random.default_rng(1945)


def t_(secs):
    return np.arange(int(secs * SR)) / SR


def env(n, a, r, curve=2.0):
    """envelope attack-release (detik)"""
    e = np.ones(n)
    na = max(1, int(a * SR))
    nr = max(1, int(r * SR))
    e[:na] = np.linspace(0, 1, na) ** curve
    e[-nr:] *= np.linspace(1, 0, nr) ** curve
    return e


def onepole(x, cutoff):
    """low-pass satu kutub (bisa cutoff berubah per sampel)"""
    c = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape)
    a = np.exp(-2 * np.pi * c / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y


def bandpass(x, f, q=8.0):
    """biquad band-pass (RBJ)"""
    w = 2 * np.pi * f / SR
    al = np.sin(w) / (2 * q)
    b0, b1, b2 = al, 0, -al
    a0, a1, a2 = 1 + al, -2 * np.cos(w), 1 - al
    y = np.zeros_like(x)
    x1 = x2 = y1 = y2 = 0.0
    for i in range(len(x)):
        v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0
        x2, x1 = x1, x[i]
        y2, y1 = y1, v
        y[i] = v
    return y


def fast_lp(x, cutoff):
    """low-pass statis cepat lewat FFT"""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / (1 + (f / cutoff) ** 4)
    return np.fft.irfft(X, len(x))


def fast_bp(x, lo, hi):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= (1 / (1 + (lo / np.maximum(f, 1)) ** 4)) * (1 / (1 + (f / hi) ** 4))
    return np.fft.irfft(X, len(x))


def reverb(x, secs=2.2, wet=0.35, damp=4000):
    n = int(secs * SR)
    ir = rng.standard_normal(n) * np.exp(-np.linspace(0, 7, n))
    ir = fast_lp(ir, damp)
    y = np.convolve(x, ir)[: len(x) + n // 2]
    y = y / (np.max(np.abs(y)) + 1e-9) * np.max(np.abs(x))
    out = np.zeros(len(y))
    out[: len(x)] += x * (1 - wet)
    return out + y * wet


def bell(f, secs, decay=3.0, inharm=(1, 2.76, 5.4, 8.93), amps=(1, 0.5, 0.25, 0.12)):
    """bilah gamelan/lonceng: parsial tak harmonis yang meluruh"""
    t = t_(secs)
    y = sum(a * np.sin(2 * np.pi * f * h * t) * np.exp(-t * decay * (1 + h * 0.4)) for h, a in zip(inharm, amps))
    return y * env(len(t), 0.002, 0.05)


def stereo(x, width=0.0):
    if width <= 0:
        return np.stack([x, x], 1)
    d = int(0.012 * SR * width)
    r = np.concatenate([np.zeros(d), x[:-d]]) if d else x
    return np.stack([x, r], 1)


def loop_xfade(x, secs=2.0):
    n = int(secs * SR)
    head, body, tail = x[:n], x[n:-n], x[-n:]
    k = np.linspace(0, 1, n)[:, None] if x.ndim == 2 else np.linspace(0, 1, n)
    return np.concatenate([body, tail * np.cos(k * np.pi / 2) + head * np.sin(k * np.pi / 2)])


def write(x, dest: Path, kbps=96, lufs=-18.0, mono=False):
    if callable(x):
        x = x()
    dest.parent.mkdir(parents=True, exist_ok=True)
    if x.ndim == 1:
        x = stereo(x)
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.9
    tmp = dest.with_suffix('.tmp.f32')
    tmp.write_bytes(x.astype(np.float32).tobytes())
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', str(tmp),
                    '-af', f'loudnorm=I={lufs}:TP=-1.5:LRA=11', '-ar', str(SR), '-ac', '1' if mono else '2',
                    '-c:a', 'libvorbis', '-b:a', f'{kbps}k', str(dest)], check=True)
    tmp.unlink()
    print(dest.name)


# ---------- musik ----------

def drone(secs, root=55.0, tense=False):
    t = t_(secs)
    lfo = 0.5 + 0.5 * np.sin(2 * np.pi * t / 23)
    y = np.zeros(len(t))
    ratios = [1, 1.5, 2, 2.996] if not tense else [1, 1.059, 1.5, 2.12]
    for i, r in enumerate(ratios):
        det = 1 + 0.002 * np.sin(2 * np.pi * t / (7 + i * 3))
        y += np.sin(2 * np.pi * root * r * det * t) * (0.6 / (i + 1))
    # gesekan rendah: derau yang disaring pelan-pelan
    noise = fast_bp(rng.standard_normal(len(t)), 80, 400) * (0.3 + 0.3 * lfo)
    y = y * (0.5 + 0.5 * lfo) + noise * 0.6
    # dentang gamelan jauh sesekali (pelog-ish)
    scale = [1, 1.122, 1.26, 1.5, 1.587, 1.782, 2]
    step = 4.5 if not tense else 2.2
    for k, at in enumerate(np.arange(1.5, secs - 4, step)):
        f = root * 8 * scale[int(rng.integers(len(scale)))] * (0.5 if rng.random() < 0.4 else 1)
        b = bell(f, 4, decay=1.2) * (0.25 if not tense else 0.18)
        i = int(at * SR)
        y[i:i + len(b)] += b[: len(y) - i]
    if tense:
        # detak berat seperti jantung, berulang
        for at in np.arange(0.5, secs - 1, 0.85):
            i = int(at * SR)
            for off, a in ((0, 1.0), (0.22, 0.7)):
                tt = t_(0.25)
                kick = np.sin(2 * np.pi * (48 + 30 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 14) * a
                j = i + int(off * SR)
                y[j:j + len(kick)] += kick[: len(y) - j] * 0.9
        # senar sumbang naik turun
        y += np.sin(2 * np.pi * 440 * 1.414 * t + 3 * np.sin(2 * np.pi * 0.2 * t)) * 0.04 * lfo
    return reverb(y, 3.5, 0.45, 2500)


# ---------- suasana ----------

def ambience(secs):
    t = t_(secs)
    n = len(t)
    wind = fast_bp(rng.standard_normal(n), 150, 900)
    gust = 0.35 + 0.65 * (0.5 + 0.5 * np.sin(2 * np.pi * t / 11 + np.sin(2 * np.pi * t / 4.3)))
    y = wind * gust * 0.5
    # jangkrik: dengung 4,5 kHz yang dipotong-potong
    for f0, rate, amp in ((4300, 21, 0.06), (5100, 17, 0.045), (3800, 25, 0.035)):
        carrier = np.sin(2 * np.pi * f0 * t)
        gate = (np.sin(2 * np.pi * rate * t) > 0.3).astype(float)
        phrase = (np.sin(2 * np.pi * t / (2.3 + f0 / 3000)) > -0.2).astype(float)
        y += carrier * onepole(gate * phrase, 300) * amp
    # tokek / burung hantu sesekali
    for at in (7.3, 19.8):
        tt = t_(0.9)
        hoot = np.sin(2 * np.pi * (380 - 40 * tt) * tt) * env(len(tt), 0.08, 0.5)
        i = int(at * SR)
        y[i:i + len(hoot)] += hoot * 0.08
    return y


# ---------- sfx ----------

def heartbeat():
    y = np.zeros(int(0.7 * SR))
    for off, a in ((0, 1.0), (0.24, 0.65)):
        tt = t_(0.2)
        k = np.sin(2 * np.pi * (52 + 40 * np.exp(-tt * 35)) * tt) * np.exp(-tt * 18) * a
        i = int(off * SR)
        y[i:i + len(k)] += k
    return fast_lp(y, 180)


def pickup():
    y = bell(880, 2.4, 1.6)
    b = np.pad(bell(1320, 2.0, 2.0), (int(0.12 * SR), 0))
    y[: len(b)] += 0.6 * b[: len(y)]
    return reverb(y, 2.5, 0.4)


def scream():
    """sergapan: hantaman rendah + jeritan serak yang naik"""
    secs = 1.8
    t = t_(secs)
    n = len(t)
    hit = rng.standard_normal(n) * np.exp(-t * 9)
    boom = np.sin(2 * np.pi * (60 + 80 * np.exp(-t * 8)) * t) * np.exp(-t * 3)
    f = 700 + 900 * np.minimum(t / 0.5, 1) + 60 * np.sin(2 * np.pi * 9 * t)
    phase = 2 * np.pi * np.cumsum(f) / SR
    voice = (np.sin(phase) + 0.5 * np.sin(2 * phase + 0.3) + 0.3 * np.sign(np.sin(3 * phase))) * env(n, 0.05, 0.9)
    rasp = fast_bp(rng.standard_normal(n), 1500, 5000) * env(n, 0.05, 0.9)
    y = hit * 0.6 + boom * 1.2 + voice * 0.35 + rasp * 0.4
    return reverb(y, 2.0, 0.3)


def whisper(secs=6.0):
    """bisikan Penunggu: derau berformant yang berganti-ganti seperti suku kata"""
    t = t_(secs)
    n = len(t)
    src = rng.standard_normal(n)
    y = np.zeros(n)
    syl = np.cumsum(rng.uniform(0.12, 0.35, 60))
    vowels = [(700, 1200), (400, 2200), (300, 900), (550, 1800), (350, 2600)]
    for i in range(len(syl) - 1):
        a, b = int(syl[i] * SR), int(syl[i + 1] * SR)
        if a >= n:
            break
        b = min(b, n)
        f1, f2 = vowels[int(rng.integers(len(vowels)))]
        seg = src[a:b]
        part = bandpass(seg, f1, 6) + bandpass(seg, f2, 8) * 0.8 + fast_bp(seg, 3000, 7000) * 0.4
        y[a:b] += part * env(b - a, 0.03, 0.06) * (0.4 if rng.random() < 0.25 else 1)
    gate = 0.5 + 0.5 * np.sin(2 * np.pi * t / 3.1)
    return reverb(y * gate, 1.6, 0.5, 3000)


def heard():
    """sengatan saat kamu terdengar: kluster senar sumbang membengkak"""
    secs = 1.6
    t = t_(secs)
    y = sum(np.sin(2 * np.pi * f * t + 2 * np.sin(2 * np.pi * 5 * t)) for f in (311, 330, 466, 622))
    y = y * env(len(t), 0.25, 0.9, 1.5) + fast_bp(rng.standard_normal(len(t)), 2000, 6000) * env(len(t), 0.3, 0.8) * 0.5
    return reverb(y, 2.0, 0.4)


def revive():
    """tarikan napas kaget"""
    t = t_(0.8)
    n = len(t)
    breath = fast_bp(rng.standard_normal(n), 400, 3000) * env(n, 0.25, 0.4, 1.2)
    return breath + 0.3 * bell(660, 0.8, 3)


def footstep():
    t = t_(0.18)
    n = len(t)
    crunch = fast_bp(rng.standard_normal(n), 200, 2500) * np.exp(-t * 30)
    thud = np.sin(2 * np.pi * 90 * t) * np.exp(-t * 40)
    return crunch * 0.7 + thud


def gate_creak():
    secs = 2.6
    t = t_(secs)
    f = 180 + 60 * np.sin(2 * np.pi * 0.7 * t) + 30 * np.sin(2 * np.pi * 3.3 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    saw = 2 * ((ph / (2 * np.pi)) % 1) - 1
    stick = (np.sin(2 * np.pi * 23 * t) > 0.6).astype(float)
    y = fast_bp(saw, 150, 2500) * onepole(stick, 80) * env(len(t), 0.1, 0.6)
    return reverb(y, 1.8, 0.35)


def win():
    y = np.zeros(int(4 * SR))
    for k, f in enumerate((392, 466, 587, 784)):
        b = bell(f, 3.5, 1.0)
        i = int(k * 0.18 * SR)
        y[i:i + len(b)] += b[: len(y) - i]
    return reverb(y, 3, 0.45)


def lose():
    t = t_(4)
    y = np.sin(2 * np.pi * (70 - 25 * t / 4) * t) * env(len(t), 0.02, 2.5) + fast_bp(rng.standard_normal(len(t)), 60, 500) * env(len(t), 0.01, 3) * 0.6
    return reverb(y, 3.5, 0.5, 1500)


if __name__ == '__main__':
    m = OUT / 'music'
    s = OUT / 'sfx'
    write(loop_xfade(stereo(drone(64), 0.6)), m / 'sunyi.ogg', 96, -22)
    write(loop_xfade(stereo(drone(48, 49, True), 0.6)), m / 'sunyi-tense.ogg', 96, -20)
    write(loop_xfade(stereo(ambience(40), 0.8)), s / 'sunyi-amb.ogg', 80, -24)
    write(loop_xfade(whisper(8), 1.0), s / 'sunyi-bisik.ogg', 64, -20, mono=True)
    write(heartbeat(), s / 'sunyi-jantung.ogg', 64, -16, mono=True)
    write(pickup(), s / 'sunyi-ambil.ogg', 80, -18)
    write(scream(), s / 'sunyi-sergap.ogg', 96, -12)
    write(heard(), s / 'sunyi-dengar.ogg', 80, -18)
    write(revive(), s / 'sunyi-bangun.ogg', 64, -18, mono=True)
    write(footstep(), s / 'sunyi-langkah.ogg', 64, -22, mono=True)
    write(gate_creak(), s / 'sunyi-gerbang.ogg', 80, -18)
    write(win(), s / 'sunyi-kabur.ogg', 80, -18)
    write(lose(), s / 'sunyi-kalah.ogg', 80, -16)
