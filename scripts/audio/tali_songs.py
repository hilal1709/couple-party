"""Lagu-lagu Tali Jodoh, satu per level, disintesis sendiri dengan numpy (tanpa sampel, tanpa AI).

Tiap lagu = aransemen 32 birama dari instrumen sintetis (suling, angklung, kecapi, bonang/saron, organ, piano
elektrik, pad, bas, kendang, drum) + gema konvolusi melingkar, jadi ujung lagu menyambung mulus ke awalnya.
Dipanggil dari build.py:  python -I scripts/audio/build.py tali
"""
import numpy as np

SR = 44100
TAU = 2 * np.pi


def t_of(n):
    return np.arange(n) / SR


def env(n, a=0.005, r=0.3, hold=0.0):
    """attack linear lalu meluruh eksponensial setelah `hold` detik"""
    t = t_of(n)
    e = np.minimum(1, t / max(a, 1e-4))
    return e * np.exp(-np.maximum(0, t - a - hold) / max(r, 1e-3))


def gate(n, a, rel):
    """naik pelan, tahan, turun di ujung (untuk nada panjang)"""
    e = np.ones(n)
    na, nr = int(a * SR), int(rel * SR)
    if na:
        e[:na] = np.linspace(0, 1, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


# ---------- instrumen ----------

def bell(f, dur, bright=1.0):
    n = int(dur * SR)
    t = t_of(n)
    parts = ((1, 1, 1), (2.76, 0.45 * bright, 0.5), (5.4, 0.22 * bright, 0.3), (8.93, 0.08 * bright, 0.18))
    x = sum(a * np.sin(TAU * f * k * t) * np.exp(-t / (dur * d * 0.45)) for k, a, d in parts)
    return x * np.minimum(1, t / 0.002)


def gong(f, dur):
    n = int(dur * SR)
    t = t_of(n)
    x = np.sin(TAU * f * t) + 0.6 * np.sin(TAU * f * 1.012 * t) + 0.3 * np.sin(TAU * f * 2.01 * t) * np.exp(-t / 1.2) + 0.15 * np.sin(TAU * f * 2.9 * t) * np.exp(-t / 0.6)
    return x * np.exp(-t / (dur * 0.5)) * np.minimum(1, t / 0.01)


def pluck(f, dur, bright=1.0):
    n = int(dur * SR)
    t = t_of(n)
    x = np.zeros(n)
    for k in range(1, 12):
        if f * k > 9000:
            break
        x += np.sin(TAU * f * k * t + k * 0.7) / k ** (1.4 - 0.3 * bright) * np.exp(-t * (1.5 + 1.1 * k) / max(0.3, dur))
    return x * np.minimum(1, t / 0.0015)


def flute(f, dur, vib=0.006):
    n = int(dur * SR)
    t = t_of(n)
    v = 1 + vib * np.sin(TAU * 5.2 * t) * np.minimum(1, np.maximum(0, t - 0.18) / 0.25)
    ph = TAU * f * np.cumsum(v) / SR
    x = np.sin(ph) + 0.18 * np.sin(2 * ph) + 0.05 * np.sin(3 * ph)
    noise = np.convolve(np.random.default_rng(int(f)).standard_normal(n), np.ones(9) / 9, mode='same')
    x += noise * 0.08 * np.exp(-t / 0.08)
    return x * gate(n, 0.06, min(0.15, dur * 0.4))


def angklung(f, dur):
    n = int(dur * SR)
    t = t_of(n)
    rattle = 0.55 + 0.45 * np.sign(np.sin(TAU * 11 * t)) * 0.5 + 0.2 * np.sin(TAU * 11 * t)
    x = (np.sin(TAU * f * t) + 0.55 * np.sin(TAU * 2 * f * t) + 0.12 * np.sin(TAU * 3.1 * f * t)) * rattle
    return x * gate(n, 0.01, 0.12) * np.exp(-t / (dur * 1.5))


def epiano(f, dur):
    n = int(dur * SR)
    t = t_of(n)
    x = np.sin(TAU * f * t + 0.6 * np.sin(TAU * f * t) * np.exp(-t / 0.4)) + 0.25 * np.sin(TAU * 7 * f * t) * np.exp(-t / 0.05)
    return x * np.exp(-t / (0.8 + dur * 0.3)) * gate(n, 0.003, 0.08)


def organ(f, dur):
    n = int(dur * SR)
    t = t_of(n)
    trem = 1 + 0.12 * np.sin(TAU * 6.2 * t)
    x = sum(a * (np.sin(TAU * f * k * t) + np.sin(TAU * f * k * 1.003 * t)) for k, a in ((1, 1), (2, 0.6), (3, 0.35), (4, 0.25), (6, 0.12), (8, 0.08)))
    return x * trem * gate(n, 0.01, 0.06) * 0.5


def pad(f, dur):
    n = int(dur * SR)
    t = t_of(n)
    x = np.zeros(n)
    for det in (0.996, 1.0, 1.004):
        for k in range(1, 9):
            x += np.sin(TAU * f * det * k * t + k * det) / k * (0.85 ** k)
    return x * gate(n, min(0.5, dur * 0.3), min(0.7, dur * 0.4)) * 0.35


def marimba(f, dur):
    n = int(dur * SR)
    t = t_of(n)
    x = np.sin(TAU * f * t) * np.exp(-t / 0.45) + 0.35 * np.sin(TAU * 4 * f * t) * np.exp(-t / 0.06) + 0.1 * np.sin(TAU * 10 * f * t) * np.exp(-t / 0.02)
    return x * np.minimum(1, t / 0.002)


def bass(f, dur, kind='round'):
    n = int(dur * SR)
    t = t_of(n)
    x = np.sin(TAU * f * t) + 0.3 * np.sin(TAU * 2 * f * t)
    if kind == 'pluck':
        x = np.tanh(2.2 * x) * np.exp(-t / 0.35)
    elif kind == 'drive':
        x = np.tanh(3.0 * (x + 0.4 * np.sin(TAU * 3 * f * t))) * np.exp(-t / 0.5)
    else:
        x = np.tanh(1.5 * x)
    return x * gate(n, 0.006, 0.05)


_noise = np.random.default_rng(77).standard_normal(SR * 2)


def noise(n, smooth=1):
    x = _noise[:n].copy() if n <= len(_noise) else np.random.default_rng(1).standard_normal(n)
    if smooth > 1:
        x = np.convolve(x, np.ones(smooth) / smooth, mode='same')
    return x


def hp_noise(n):
    x = noise(n)
    return x - np.convolve(x, np.ones(6) / 6, mode='same')


def drum(kind):
    if kind == 'k':  # kick
        n = int(0.35 * SR)
        t = t_of(n)
        f = 45 + 90 * np.exp(-t / 0.04)
        return np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / 0.16) * 1.2
    if kind == 's':  # snare
        n = int(0.22 * SR)
        t = t_of(n)
        return (noise(n, 2) * 0.7 * np.exp(-t / 0.07) + np.sin(TAU * 185 * t) * 0.5 * np.exp(-t / 0.05))
    if kind == 'h':  # hihat
        n = int(0.06 * SR)
        return hp_noise(n) * env(n, 0.001, 0.018) * 0.5
    if kind == 'o':  # open hat
        n = int(0.25 * SR)
        return hp_noise(n) * env(n, 0.001, 0.09) * 0.4
    if kind == 'x':  # shaker
        n = int(0.09 * SR)
        return hp_noise(n) * gate(n, 0.03, 0.05) * 0.3
    if kind == 'c':  # clap
        n = int(0.2 * SR)
        e = sum(env(n, 0.001, 0.012) * (t_of(n) >= d) for d in (0, 0.011, 0.022)) + env(n, 0.001, 0.08) * 0.6
        return noise(n, 3) * e * 0.6
    if kind == 'd':  # kendang 'dung'
        n = int(0.3 * SR)
        t = t_of(n)
        f = 95 + 40 * np.exp(-t / 0.03)
        return np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / 0.14) * 1.1
    if kind == 't':  # kendang 'tak'
        n = int(0.09 * SR)
        t = t_of(n)
        return (np.sin(TAU * 420 * t) * 0.6 + noise(n, 2) * 0.5) * np.exp(-t / 0.022)
    if kind == 'p':  # kendang 'tung' (tinggi)
        n = int(0.18 * SR)
        t = t_of(n)
        f = 230 + 60 * np.exp(-t / 0.02)
        return np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / 0.08) * 0.8
    if kind == 'T':  # taiko / tom besar
        n = int(0.6 * SR)
        t = t_of(n)
        f = 62 + 50 * np.exp(-t / 0.05)
        return (np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / 0.3) + noise(n, 4) * 0.25 * np.exp(-t / 0.05)) * 1.2
    if kind == 'm':  # dentang logam pabrik
        n = int(0.3 * SR)
        t = t_of(n)
        return sum(np.sin(TAU * f * t) * np.exp(-t / d) for f, d in ((523, 0.12), (1447, 0.06), (2960, 0.03), (4210, 0.02))) * 0.35
    if kind == 'w':  # tetes air
        n = int(0.25 * SR)
        t = t_of(n)
        f = 900 + 1200 * np.exp(-t / 0.015)
        return np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / 0.05) * 0.4
    raise ValueError(kind)


INSTR = {'bell': bell, 'pluck': pluck, 'flute': flute, 'angklung': angklung, 'epiano': epiano, 'organ': organ, 'pad': pad, 'marimba': marimba}


# ---------- tangga nada & komposisi ----------

def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def cents_hz(root_hz, cents):
    return root_hz * 2 ** (cents / 1200)


MAJOR = [0, 2, 4, 5, 7, 9, 11]
MINOR = [0, 2, 3, 5, 7, 8, 10]
MIXO = [0, 2, 4, 5, 7, 9, 10]
DORIAN = [0, 2, 3, 5, 7, 9, 10]
PENTA_MAJ = [0, 2, 4, 7, 9]
PENTA_MIN = [0, 3, 5, 7, 10]


class Song:
    def __init__(self, bpm, bars=32, seed=1):
        self.bpm = bpm
        self.beat = 60 / bpm
        self.bars = bars
        self.n = int(round(bars * 4 * self.beat * SR))
        self.dry = np.zeros((self.n, 2))
        self.wet = np.zeros((self.n, 2))
        self.rng = np.random.default_rng(seed)

    def at(self, bar, beat=0.0):
        return (bar * 4 + beat) * self.beat

    def put(self, x, time, gain=1.0, pan=0.0, rev=0.25):
        """taruh suara di waktu `time` (detik); melingkar supaya loop mulus"""
        a = int(time * SR) % self.n
        m = len(x)
        idx = (a + np.arange(m)) % self.n
        l = gain * np.cos((pan + 1) * np.pi / 4) * np.sqrt(2)
        r = gain * np.sin((pan + 1) * np.pi / 4) * np.sqrt(2)
        np.add.at(self.dry[:, 0], idx, x * l)
        np.add.at(self.dry[:, 1], idx, x * r)
        if rev:
            np.add.at(self.wet[:, 0], idx, x * l * rev)
            np.add.at(self.wet[:, 1], idx, x * r * rev)

    def note(self, instr, f, time, dur, gain=1.0, pan=0.0, rev=0.25, **kw):
        self.put(INSTR[instr](f, dur, **kw) if kw else INSTR[instr](f, dur), time, gain, pan, rev)

    def drums(self, pattern, bars, gain=1.0, rev=0.08, swing=0.0, pan=None):
        """pola 16 langkah per birama, satu huruf per langkah ('.' = diam); spasi diabaikan"""
        steps = pattern.replace(' ', '')
        per = len(steps)
        for b in bars:
            for i, ch in enumerate(steps):
                if ch == '.':
                    continue
                beat = i * 4 / per
                if swing and i % 2 == 1:
                    beat += swing * 4 / per
                p = pan if pan is not None else {'h': 0.3, 'x': -0.35, 'o': 0.3, 't': 0.2, 'p': -0.2, 'm': 0.4, 'w': self.rng.uniform(-0.7, 0.7)}.get(ch, 0)
                v = gain * (0.8 + 0.2 * self.rng.random()) if ch in 'hx' else gain
                self.put(drum(ch), self.at(b, beat), v, p, rev)

    def render(self, rev_secs=2.2, rev_damp=4000.0, lufs_hint=1.0):
        # gema: konvolusi melingkar dengan derau meluruh (ujung gema membungkus ke awal lagu)
        n = self.n
        ir_n = int(rev_secs * SR)
        rng = np.random.default_rng(5)
        t = t_of(ir_n)
        out = self.dry.copy()
        for ch in range(2):
            ir = rng.standard_normal(ir_n) * np.exp(-t / (rev_secs / 6.5))
            ir[: int(0.012 * SR)] = 0
            spec_ir = np.fft.rfft(ir, n)
            freqs = np.fft.rfftfreq(n, 1 / SR)
            spec_ir /= 1 + (freqs / rev_damp) ** 2
            wet = np.fft.irfft(np.fft.rfft(self.wet[:, ch]) * spec_ir, n)
            out[:, ch] += wet / (np.sqrt(ir_n) * 0.9)
        # kompresi lembut lalu batasi puncak
        peak = np.percentile(np.abs(out), 99.9) + 1e-9
        out = np.tanh(out / peak * 1.1) * 0.9
        return out.astype(np.float32)


def chord_tones(root, quality):
    q = {'maj': [0, 4, 7], 'min': [0, 3, 7], 'sus': [0, 5, 7], 'maj7': [0, 4, 7, 11], 'min7': [0, 3, 7, 10], '7': [0, 4, 7, 10], 'add9': [0, 4, 7, 14], 'pow': [0, 7, 12]}[quality]
    return [root + x for x in q]


def melody(song, scale_midis, chords, bars, rhythms, rng, start_deg=None, leap=0.18):
    """Melodi berulang ala lagu: frase 2 birama dipakai lagi dengan variasi (A A' B A'')."""
    phrases = []
    deg = start_deg if start_deg is not None else len(scale_midis) // 2
    for _ in range(4):
        notes = []
        rhythm = rhythms[rng.integers(len(rhythms))]
        pos = 0.0
        for dur in rhythm:
            step = rng.choice([-2, -1, -1, 0, 1, 1, 2]) if rng.random() > leap else rng.choice([-4, -3, 3, 4])
            deg = int(np.clip(deg + step, 2, len(scale_midis) - 3))
            notes.append((pos, dur, deg))
            pos += dur
        phrases.append(notes)
    order = [0, 1, 0, 2, 3, 1, 0, 3]
    out = []
    for i, b in enumerate(range(bars[0], bars[1], 2)):
        ph = phrases[order[i % len(order)]]
        for pos, dur, d in ph:
            # nada di ketukan kuat dipaskan ke nada akor
            bar = b + int(pos // 4)
            ch = chords[bar % len(chords)]
            m = scale_midis[d]
            if pos % 2 == 0:
                pcs = [c % 12 for c in ch]
                best = min(range(-2, 3), key=lambda k: (scale_midis[int(np.clip(d + k, 0, len(scale_midis) - 1))] % 12 not in pcs, abs(k)))
                m = scale_midis[int(np.clip(d + best, 0, len(scale_midis) - 1))]
            out.append((song.at(b, pos), dur * song.beat, m))
    return out


def scale_range(root, steps, lo=-1, hi=3):
    return [root + 12 * o + s for o in range(lo, hi) for s in steps]


# ---------- lagu per level ----------

R44 = [[1, 1, 1, 1, 2, 2], [1.5, 0.5, 1, 1, 2, 1, 1], [2, 1, 1, 0.5, 0.5, 1, 2], [1, 0.5, 0.5, 1, 1, 3, 1]]
R_BUSY = [[0.5] * 6 + [1, 2, 1, 0.5, 0.5], [0.5, 0.5, 1, 0.5, 0.5, 1, 1, 0.5, 0.5, 2], [1, 0.5, 0.5, 1, 1, 0.5, 0.5, 1, 2]]
R_SLOW = [[2, 2, 3, 1], [3, 1, 2, 2], [4, 2, 2]]


def prog(key, spec):
    return [chord_tones(key + r, q) for r, q in spec]


def sawah():
    s = Song(100, 32, seed=11)
    key = 55  # G
    ch = prog(key, [(0, 'maj'), (5, 'add9'), (9 - 12, 'min'), (2, 'sus')] * 2)
    sc = scale_range(key + 12, PENTA_MAJ, -1, 2)
    for b in range(32):
        c = ch[b % len(ch)]
        for k in range(4):
            if k % 2 == 0 or b >= 4:
                s.note('angklung', hz(c[k % 3] + 12), s.at(b, k), 0.42, 0.22, pan=-0.3 + 0.2 * k)
        for k in range(8):
            s.note('pluck', hz(c[[0, 1, 2, 1][k % 4]] + 12 + (12 if k % 4 == 2 else 0)), s.at(b, k * 0.5), 0.6, 0.12, pan=0.35)
        s.put(bass(hz(c[0] - 12), 1.8 * s.beat, 'pluck'), s.at(b, 0), 0.45, rev=0.05)
        s.put(bass(hz(c[2] - 12), 1.2 * s.beat, 'pluck'), s.at(b, 2.5), 0.32, rev=0.05)
    s.drums('d...t.t.d.p.t...', range(4, 32), 0.45)
    s.drums('..x...x...x...xx', range(8, 32), 0.6)
    for at, dur, m in melody(s, sc, ch, (4, 32), R44, s.rng):
        s.note('flute', hz(m + 12), at, dur * 0.95, 0.42, pan=0.05, rev=0.35)
    return s.render(2.0)


def apung():
    s = Song(92, 32, seed=21)
    key = 50  # D
    ch = prog(key, [(0, 'maj'), (7, 'maj'), (5, 'add9'), (0, 'maj'), (10 - 12, 'maj'), (5, 'maj'), (7, 'sus'), (7, 'maj')])
    sc = scale_range(key + 12, MIXO, -1, 2)
    for b in range(32):
        c = ch[b % len(ch)]
        # ayunan perahu: 3+3+2
        for pos in (0, 1.5, 3):
            s.note('marimba', hz(c[0] + 12), s.at(b, pos), 0.6, 0.3, pan=-0.25)
        for pos, i in ((0.75, 1), (2.25, 2), (3.5, 1)):
            s.note('marimba', hz(c[i] + 12), s.at(b, pos), 0.5, 0.22, pan=0.3)
        s.note('pad', hz(c[0]), s.at(b, 0), 4 * s.beat, 0.18, rev=0.4)
        s.note('pad', hz(c[2]), s.at(b, 0), 4 * s.beat, 0.12, rev=0.4)
        s.put(bass(hz(c[0] - 12), 1.4 * s.beat), s.at(b, 0), 0.4, rev=0.05)
        s.put(bass(hz(c[0] - 12), 1.0 * s.beat), s.at(b, 3), 0.3, rev=0.05)
    s.drums('x.x..xx.x.x..x.x', range(4, 32), 0.5)
    s.drums('d.....t.....d.t.', range(8, 32), 0.4)
    s.drums('w...............', range(0, 32, 3), 0.6, rev=0.5)
    for at, dur, m in melody(s, sc, ch, (4, 32), R44, s.rng):
        s.note('pluck', hz(m + 12), at, max(0.4, dur), 0.38, pan=0.1, rev=0.3, bright=1.3)
        s.note('pluck', hz(m + 24), at + 0.01, max(0.3, dur * 0.7), 0.1, pan=0.2, rev=0.3)
    return s.render(2.4)


def atap():
    s = Song(104, 32, seed=31)
    key = 57  # A minor dengan nuansa jazz senja
    ch = prog(key - 12, [(0, 'min7'), (5, 'min7'), (10, '7'), (3, 'maj7'), (8, 'maj7'), (2 + 12, 'min7'), (7, '7'), (7, '7')])
    sc = scale_range(key + 12, DORIAN, -1, 2)
    walk = [0, 3, 5, 7]
    for b in range(32):
        c = ch[b % len(ch)]
        for k, pos in enumerate((0, 1.5, 2.5)):
            for m in c[1:]:
                s.note('epiano', hz(m + 12), s.at(b, pos), 1.0 if k < 2 else 1.4, 0.13, pan=-0.2, rev=0.3)
        for k in range(4):
            s.put(bass(hz(c[0] + walk[k] - 12 if k else c[0] - 12), 0.9 * s.beat, 'pluck'), s.at(b, k), 0.42, rev=0.03)
    s.drums('..c...c...c...c.', range(4, 32), 0.45, rev=0.15)
    s.drums('h.hh.hh.h.hh.hhh', range(4, 32), 0.6, swing=0.18)
    s.drums('k.......k..k....', range(8, 32), 0.6)
    for at, dur, m in melody(s, sc, ch, (4, 32), R44 + R_BUSY[:1], s.rng):
        s.note('flute', hz(m + 12), at, dur * 0.9, 0.3, pan=0.15, rev=0.35, vib=0.009)
        s.note('pluck', hz(m), at, max(0.3, dur), 0.18, pan=-0.1, rev=0.3)
    return s.render(2.0)


def pabrik():
    s = Song(118, 32, seed=41)
    key = 52  # E minor
    ch = prog(key - 12, [(0, 'pow'), (0, 'pow'), (3, 'pow'), (5, 'pow'), (0, 'pow'), (0, 'pow'), (10, 'pow'), (7, 'pow')])
    sc = scale_range(key + 12, PENTA_MIN, -1, 2)
    for b in range(32):
        c = ch[b % len(ch)]
        for k in range(16):
            if k % 4 != 1:
                s.put(bass(hz(c[0]), 0.22 * s.beat * 2, 'drive'), s.at(b, k * 0.25), 0.3 if k % 4 else 0.42, rev=0.02)
        if b >= 4:
            for k in (0, 1.5, 3):
                s.note('bell', hz(c[1] + 24), s.at(b, k), 0.35, 0.12, pan=0.4, rev=0.2, bright=1.6)
    s.drums('k...k...k...k...', range(0, 32), 0.75)
    s.drums('....s.......s...', range(4, 32), 0.6)
    s.drums('hhhhhhhhhhhhhhhh', range(4, 32), 0.45)
    s.drums('..m.....m..m..m.', range(8, 32), 0.55)
    for at, dur, m in melody(s, sc, ch, (8, 32), R_BUSY, s.rng):
        s.note('bell', hz(m + 12), at, max(0.5, dur * 1.5), 0.34, pan=-0.1, rev=0.25)
        s.note('organ', hz(m), at, dur * 0.8, 0.12, pan=0.1, rev=0.2)
    return s.render(1.6)


def gua():
    s = Song(76, 24, seed=51)
    root = hz(50)  # D, tangga pelog yang misterius
    pelog = [0, 120, 270, 540, 670, 785, 950]
    sc_hz = [cents_hz(root, c + 1200 * o) for o in range(0, 3) for c in pelog]
    chords = [[0, 2, 4], [3, 5, 0], [1, 3, 5], [0, 2, 4]]
    for b in range(24):
        cc = chords[(b // 2) % 4]
        for i in cc:
            s.put(pad(sc_hz[i] / 2, 8 * s.beat), s.at(b - (b % 2), 0), 0.18 if b % 2 == 0 else 0, rev=0.6)
        if b % 4 == 0:
            s.put(gong(sc_hz[0] / 4, 6), s.at(b, 0), 0.5, rev=0.5)
        for k in range(4):
            if s.rng.random() < 0.55:
                s.put(drum('w'), s.at(b, k + s.rng.choice([0, 0.5, 0.25])), 0.5, s.rng.uniform(-0.8, 0.8), rev=0.9)
    s.drums('d.......t...d...', range(4, 24), 0.35, rev=0.4)
    rng = s.rng
    deg = 7
    for b in range(4, 24):
        for pos in ([0, 2.5] if b % 2 == 0 else [1, 3]):
            deg = int(np.clip(deg + rng.choice([-2, -1, 1, 2]), 3, 13))
            s.put(flute(sc_hz[deg], 1.6 * s.beat, vib=0.01), s.at(b, pos), 0.3, 0.1, rev=0.8)
            s.put(bell(sc_hz[deg] * 2, 1.4), s.at(b, pos + 1), 0.08, -0.4, rev=0.9)
    return s.render(3.6, rev_damp=2500)


def candi():
    s = Song(96, 32, seed=61)
    root = hz(55)  # G, pelog gamelan
    pelog = [0, 120, 270, 540, 670, 785, 950]
    deg_hz = lambda d: cents_hz(root, pelog[d % 7] + 1200 * (d // 7))  # noqa: E731
    balungan = [2, 1, 2, 4, 5, 4, 2, 1, 6, 5, 4, 2, 4, 5, 6, 7]
    for b in range(32):
        for k in range(4):
            d = balungan[(b * 4 + k) % 16]
            s.put(bell(deg_hz(d + 7), 1.2), s.at(b, k), 0.3, -0.2, rev=0.3)  # saron
            # bonang saling mengisi (kotekan): dua pola bergantian di sela ketukan
            if b >= 4:
                s.put(bell(deg_hz(d + 14), 0.5, 1.4), s.at(b, k + 0.5), 0.14, 0.45, rev=0.25)
                s.put(bell(deg_hz(d + 16), 0.45, 1.4), s.at(b, k + 0.75), 0.1, -0.45, rev=0.25)
        if b % 4 == 3:
            s.put(gong(deg_hz(0) / 2, 6), s.at(b, 3.5), 0.6, rev=0.5)
        if b % 2 == 1:
            s.put(gong(deg_hz(4) / 2, 2), s.at(b, 1.5), 0.25, 0.2, rev=0.3)  # kenong
        s.put(bass(deg_hz(balungan[(b * 4) % 16]) / 4, 2 * s.beat), s.at(b, 0), 0.3, rev=0.1)
    s.drums('d..t..d.t.p.d...', range(4, 32), 0.5, rev=0.15)
    rng = s.rng
    d = 10
    for b in range(8, 32):
        for pos, dur in ((0, 1.5), (1.5, 0.5), (2, 2)) if b % 2 == 0 else ((0, 2), (2, 1), (3, 1)):
            d = int(np.clip(d + rng.choice([-2, -1, 1, 1, 2]), 7, 16))
            s.put(flute(deg_hz(d), dur * s.beat * 0.95), s.at(b, pos), 0.3, 0.05, rev=0.45)
    return s.render(2.8)


def bromo():
    s = Song(110, 32, seed=71)
    key = 54  # F# minor, heroik
    ch = prog(key - 12, [(0, 'min'), (8, 'maj'), (3, 'maj'), (10, 'maj'), (0, 'min'), (8, 'maj'), (5, 'min'), (7, 'maj')])
    sc = scale_range(key + 12, MINOR, -1, 2)
    for b in range(32):
        c = ch[b % len(ch)]
        for m in c:
            s.note('pad', hz(m), s.at(b, 0), 4 * s.beat, 0.2, rev=0.45)
        for k in range(8):
            s.note('pluck', hz(c[k % 3] + 12), s.at(b, k * 0.5), 0.4, 0.12, pan=0.3 * (1 if k % 2 else -1), rev=0.25)
        s.put(bass(hz(c[0] - 12), 3.8 * s.beat), s.at(b, 0), 0.4, rev=0.05)
        if b % 8 == 0:
            # desau angin
            n = int(8 * 4 * s.beat * SR / 2)
            w = noise(n, 40) * np.sin(np.linspace(0, np.pi, n)) ** 2
            s.put(w * 0.9, s.at(b, 0), 0.5, -0.5, rev=0.4)
    s.drums('T......TT...T...', range(4, 32), 0.7, rev=0.35)
    s.drums('....s.......s..s', range(8, 32), 0.45)
    s.drums('h.h.h.h.h.h.h.h.', range(8, 32), 0.4)
    for at, dur, m in melody(s, sc, ch, (4, 32), R44 + R_SLOW, s.rng):
        s.note('flute', hz(m + 12), at, dur * 0.95, 0.4, pan=0, rev=0.4, vib=0.008)
    return s.render(2.6)


def malam():
    s = Song(124, 32, seed=81)
    key = 60  # C, meriah ala dangdut pasar malam
    ch = prog(key - 12, [(0, 'maj'), (0, 'maj'), (5, 'maj'), (7, '7'), (9, 'min'), (5, 'maj'), (7, '7'), (0, 'maj')])
    sc = scale_range(key, [0, 2, 3, 5, 7, 8, 11], 0, 2)  # minor harmonik ala melayu untuk melodi
    for b in range(32):
        c = ch[b % len(ch)]
        for pos in (0.5, 1.5, 2.5, 3.5):
            for m in c:
                s.note('organ', hz(m + 12), s.at(b, pos), 0.35 * s.beat, 0.08, pan=-0.3, rev=0.15)
        for pos, i in ((0, 0), (1.5, 2), (2, 0), (3, 2)):
            s.put(bass(hz(c[i] - 12), 0.7 * s.beat, 'pluck'), s.at(b, pos), 0.42, rev=0.03)
    # kendang dangdut: dung ... tak dung ... (tak-dung khas)
    s.drums('d...t.d.d..pt...', range(4, 32), 0.6, rev=0.1)
    s.drums('..x...x...x...x.', range(4, 32), 0.5)
    s.drums('....c.......c...', range(8, 32), 0.4)
    for at, dur, m in melody(s, sc, ch, (4, 32), R_BUSY + R44[:2], s.rng, leap=0.12):
        s.note('flute', hz(m + 12), at, dur * 0.9, 0.34, pan=0.1, rev=0.3, vib=0.012)
        s.note('organ', hz(m), at, dur * 0.85, 0.1, pan=0.2, rev=0.2)
    return s.render(1.8)


SONGS = {'sawah': sawah, 'apung': apung, 'atap': atap, 'pabrik': pabrik, 'gua': gua, 'candi': candi, 'bromo': bromo, 'malam': malam}
