"""Musik & suara alam Puncak Berdua v3 (Punggung Hijau), disintesis dari nol tanpa sampel.

Dipanggil dari build.py:  python -I scripts/audio/build.py puncak

Lagu (loop mulus):
  music/puncak.ogg         "Kemah Pagi": kecapi petik, okarina, bas lembut, rebana tipis. 96 bpm, D pentatonik mayor.
                           Dipakai di kemah awal, hutan bawah, dan formasi batu.
  music/puncak-tinggi.ogg  "Punggung Angin": pad paduan suara, petikan jarang, dentum rendah. 72 bpm, A aeolian.
                           Dipakai mulai tebing besar sampai puncak, dan saat badai.
Suasana (loop):  sfx/puncak-hutan (burung & daun), puncak-airterjun, puncak-unggun (api berderak)
SFX baru:        sfx/puncak-lempar, puncak-tangkap, puncak-gendong
Instrumen & motif sengaja berbeda dari lagu Tali Jodoh (suling & angklung) dan game lain.
"""
import numpy as np

SR = 44100


def _env(k, a, r):
    t = np.arange(k) / SR
    return (np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / r)).astype(np.float32)


def _lp(x, k):
    return np.convolve(x, np.ones(k) / k, mode='same').astype(np.float32)


def _hp(x, k=24):
    return (x - _lp(x, k)).astype(np.float32)


def _pluck(rng, f, k, damp=0.996, bright=0.5):
    """Karplus-Strong: senar kecapi dipetik"""
    p = max(2, int(SR / f))
    buf = rng.uniform(-1, 1, p).astype(np.float32)
    buf = buf * bright + np.roll(buf, 1) * (1 - bright)
    out = np.zeros(k, dtype=np.float32)
    for i in range(k):
        j = i % p
        out[i] = buf[j]
        buf[j] = 0.5 * (buf[j] + buf[(j + 1) % p]) * damp
    return out


def _ocarina(rng, f, k):
    """okarina: sinus bundar + sedikit harmonik ke-3, napas di awal, vibrato pelan"""
    t = np.arange(k) / SR
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.2 * t) * np.minimum(1, t / 0.25)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR
    tone = np.sin(ph) + 0.12 * np.sin(3 * ph)
    breath = _hp(rng.standard_normal(k).astype(np.float32), 12) * 0.08 * np.exp(-t / 0.08)
    e = np.minimum(1, t / 0.05) * np.minimum(1, (k / SR - t) / 0.12)
    return ((tone + breath) * e).astype(np.float32)


def _drum(rng, k, f0, f1, decay, noise=0.3):
    t = np.arange(k) / SR
    f = f1 + (f0 - f1) * np.exp(-t / 0.03)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / decay)
    hit = _lp(rng.standard_normal(k).astype(np.float32), 6) * noise * np.exp(-t / 0.02)
    return (body + hit).astype(np.float32)


def _place(x, at, v, pan=0.5):
    k = min(len(v), len(x) - at)
    if k <= 0:
        return
    x[at:at + k, 0] += v[:k] * (1 - pan)
    x[at:at + k, 1] += v[:k] * pan


def _echo(x, d, g):
    x[d:] += x[:-d] * g
    return x


def _hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def song_low():
    """Kemah Pagi: 96 bpm, 24 birama, D pentatonik mayor (D E F# A B)"""
    rng = np.random.default_rng(961)
    bpm = 96
    beat = 60 / bpm
    bars = 24
    bar = int(SR * beat * 4)
    n = bar * bars
    x = np.zeros((n, 2), dtype=np.float32)
    # progresi: D – Bm – G – A (diulang), akar MIDI
    prog = [(50, [62, 66, 69]), (47, [59, 62, 66]), (43, [59, 62, 67]), (45, [61, 64, 69])]
    pent = [62, 64, 66, 69, 71, 74, 76, 78, 81]
    eighth = bar // 8
    for b in range(bars):
        root, chord = prog[b % 4]
        at = b * bar
        # bas: ketuk 1 & 3, petikan bulat
        for q in (0, 4):
            v = _pluck(rng, _hz(root - 12), int(SR * 1.2), damp=0.998, bright=0.2) * 0.32
            _place(x, at + q * eighth, v, 0.5)
        # kecapi: arpeggio 8-an bergantian naik-turun
        pat = [0, 1, 2, 1, 0, 2, 1, 2] if b % 2 == 0 else [2, 1, 0, 1, 2, 0, 1, 0]
        for i, c in enumerate(pat):
            f = _hz(chord[c] + (12 if (i % 4 == 3 and b % 4 == 3) else 0))
            v = _pluck(rng, f, int(SR * 0.9), bright=0.7) * (0.16 if i % 2 else 0.2)
            _place(x, at + i * eighth, v, 0.35 + 0.3 * (c / 2))
        # rebana tipis: tak di 2 & 4, tik di 8-an genap
        for q in range(8):
            k = int(SR * 0.12)
            if q in (2, 6):
                v = _hp(rng.standard_normal(k).astype(np.float32), 10) * _env(k, 0.001, 0.04) * 0.12
                v += _drum(rng, k, 420, 300, 0.05, 0.1) * 0.08
            else:
                v = _hp(rng.standard_normal(k).astype(np.float32), 5) * _env(k, 0.001, 0.012) * 0.04
            _place(x, at + q * eighth, v, 0.6)
    # okarina: melodi bertanya-jawab, mulai birama 4, istirahat tiap 8 birama
    phrase_a = [(0, 4, 2), (2, 2, 1), (3, 3, 2), (4, 5, 2), (6, 3, 2)]  # (8-an ke-, indeks pentatonik, panjang 8-an)
    phrase_b = [(0, 5, 2), (2, 4, 1), (3, 3, 1), (4, 1, 2), (6, 2, 2)]
    for b in range(4, bars):
        if b % 8 in (6, 7):
            continue
        ph = phrase_a if b % 2 == 0 else phrase_b
        shift = 1 if (b // 8) % 2 else 0
        for s, idx, ln in ph:
            if rng.random() < 0.12:
                continue
            f = _hz(pent[min(len(pent) - 1, idx + shift)] + 12)
            v = _ocarina(rng, f, int(eighth * ln * 0.95)) * 0.13
            _place(x, b * bar + s * eighth, v, 0.55)
    _echo(x, int(SR * beat * 0.75), 0.22)
    return x


def song_high():
    """Punggung Angin: 72 bpm, 16 birama, A aeolian; luas & sedikit tegang"""
    rng = np.random.default_rng(722)
    bpm = 72
    beat = 60 / bpm
    bars = 16
    bar = int(SR * beat * 4)
    n = bar * bars
    x = np.zeros((n, 2), dtype=np.float32)
    # Am – F – C – G, lalu Am – F – G – E
    prog = [(45, [57, 60, 64]), (41, [57, 60, 65]), (48, [55, 60, 64]), (43, [55, 59, 62]),
            (45, [57, 60, 64]), (41, [57, 60, 65]), (43, [55, 59, 62]), (40, [56, 59, 64])]
    tt = np.arange(bar) / SR
    for b in range(bars):
        root, chord = prog[b % 8]
        at = b * bar
        # pad paduan suara: beberapa sinus sedikit sumbang + formant "aa" kasar lewat harmonik
        pad = np.zeros(bar, dtype=np.float32)
        for m in chord:
            f = _hz(m)
            for det in (-0.004, 0.0, 0.005):
                ph = 2 * np.pi * f * (1 + det) * tt + 0.4 * np.sin(2 * np.pi * 0.3 * tt + m)
                pad += (np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.18 * np.sin(3 * ph)).astype(np.float32)
        e = np.minimum(1, tt / 1.2) * np.minimum(1, (bar / SR - tt) / 1.0)
        pv = pad * e * 0.03
        x[at:at + bar, 0] += pv
        x[at:at + bar, 1] += np.roll(pv, 300)
        # dentum rendah di ketuk 1 (dan 3 di birama genap)
        for q in (0, 2) if b % 2 else (0,):
            v = _drum(rng, int(SR * 1.4), 90, 48, 0.45, 0.25) * 0.5
            _place(x, at + int(q * beat * SR), v, 0.5)
        # petikan jarang tinggi, seperti gema di tebing
        for q in range(8):
            if rng.random() < 0.3:
                f = _hz(chord[int(rng.integers(0, 3))] + 24)
                v = _pluck(rng, f, int(SR * 1.6), damp=0.9975, bright=0.8) * 0.1
                _place(x, at + int(q * beat * SR / 2), v, rng.uniform(0.2, 0.8))
    # angin di latar: derau rendah berayun
    t = np.arange(n) / SR
    wind = _lp(rng.standard_normal(n).astype(np.float32), 90) * 3 * (0.5 + 0.5 * np.sin(2 * np.pi * t / (bar * 4 / SR)) ** 2)
    x[:, 0] += wind * 0.06
    x[:, 1] += np.roll(wind, 2000) * 0.06
    _echo(x, int(SR * beat), 0.3)
    return x


def ambience(rng):
    """loop suasana: hutan, air terjun, api unggun (mono)"""
    out = {}
    # hutan 12 dtk: daun berdesir + kicau burung acak (chirp naik-turun)
    n = int(SR * 12)
    t = np.arange(n) / SR
    leaves = _hp(rng.standard_normal(n).astype(np.float32), 40) * 0.05 * (0.6 + 0.4 * np.sin(2 * np.pi * t / 6) ** 2)
    birds = np.zeros(n, dtype=np.float32)
    for _ in range(26):
        at = int(rng.uniform(0, 11) * SR)
        f0 = rng.uniform(2200, 4200)
        for r in range(int(rng.integers(1, 4))):
            k = int(SR * rng.uniform(0.06, 0.14))
            tt = np.arange(k) / SR
            f = f0 * (1 + 0.35 * np.sin(np.pi * tt / (k / SR)) * rng.choice([-1, 1]))
            v = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / (k / SR)) ** 2 * 0.25
            s = at + r * int(SR * 0.16)
            birds[s:s + k] += v[: max(0, min(k, n - s))]
    out['hutan'] = leaves + birds
    # air terjun 6 dtk: derau lebar + gemuruh rendah
    n = int(SR * 6)
    w = rng.standard_normal(n).astype(np.float32)
    out['airterjun'] = _lp(w, 3) * 0.5 + _lp(w, 60) * 4
    # api unggun 6 dtk: dengung rendah + derak acak
    n = int(SR * 6)
    fire = _lp(rng.standard_normal(n).astype(np.float32), 50) * 3
    for _ in range(70):
        at = int(rng.uniform(0, 5.9) * SR)
        k = int(SR * rng.uniform(0.004, 0.02))
        fire[at:at + k] += _hp(rng.standard_normal(k).astype(np.float32), 4) * rng.uniform(0.3, 1.0)
    out['unggun'] = fire
    # sambung ujung loop
    for key, v in out.items():
        k = int(SR * 0.8)
        fade = np.linspace(0, 1, k, dtype=np.float32)
        v[:k] = v[:k] * fade + v[-k:] * (1 - fade)
        out[key] = v[:-k]
    return out


def coop_sfx(rng):
    out = {}
    # lempar: desis naik
    n = int(SR * 0.35)
    t = np.arange(n) / SR
    w = _lp(rng.standard_normal(n).astype(np.float32), 6) * 3 * np.sin(np.pi * t / (n / SR)) ** 2
    out['lempar'] = w * np.linspace(0.5, 1, n)
    # tangkap: tepuk lembut + nada pendek naik
    n = int(SR * 0.3)
    f = np.linspace(700, 1100, n)
    out['tangkap'] = _lp(rng.standard_normal(n).astype(np.float32), 8) * 2 * _env(n, 0.001, 0.03) + np.sin(2 * np.pi * np.cumsum(f) / SR).astype(np.float32) * _env(n, 0.005, 0.08) * 0.35
    # gendong: dentum berat + embusan napas
    n = int(SR * 0.7)
    t = np.arange(n) / SR
    breath = _lp(rng.standard_normal(n).astype(np.float32), 16) * 3 * np.sin(np.pi * np.clip((t - 0.1) / 0.5, 0, 1)) ** 2
    out['gendong'] = _drum(rng, n, 140, 70, 0.12, 0.4) * 0.6 + breath
    return out
