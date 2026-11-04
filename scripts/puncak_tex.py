"""Tekstur PBR Puncak Berdua, dibuat procedural (noise + voronoi), tanpa AI generatif.

python -I scripts/puncak_tex.py  →  src/assets/puncak/tex/

Tiap bahan medan menjadi dua gambar yang bisa diulang tanpa sambungan:
  <nama>_d.webp : warna (RGB, AO sudah dipanggang); kecerahannya juga dipakai sebagai tinggi untuk height-blend
  <nama>_n.webp : normal XY (RG) + kekasaran (B)
Tanpa kanal alpha: canvas browser mengalikan warna dengan alpha (premultiply) sehingga datanya rusak.
Ditambah tekstur props: kulit kayu, daun & helai rumput (alpha), air, awan, lava.
"""
from pathlib import Path

import numpy as np
from PIL import Image

OUT = Path(__file__).resolve().parents[1] / 'src' / 'assets' / 'puncak' / 'tex'
N = 512
RNG = np.random.default_rng(20261104)


def spectral(n=N, beta=2.0, lo=1.0, seed=None, aniso=(1.0, 1.0)):
    """noise periodik 1/f^beta (otomatis bisa diulang)"""
    r = np.random.default_rng(seed) if seed is not None else RNG
    w = r.standard_normal((n, n))
    f = np.fft.fft2(w)
    fy = np.fft.fftfreq(n)[:, None] * n * aniso[1]
    fx = np.fft.fftfreq(n)[None, :] * n * aniso[0]
    k = np.sqrt(fx * fx + fy * fy)
    k[0, 0] = 1
    filt = 1 / np.maximum(k, lo) ** beta
    # buang gelombang paling panjang: pola tidak jadi satu bercak raksasa per ubin (ulangan tak kentara)
    filt *= np.clip((k - 2.0) / 3.0, 0, 1)
    filt[0, 0] = 0
    out = np.real(np.fft.ifft2(f * filt))
    out -= out.min()
    return out / (out.max() + 1e-9)


def band(n=N, lo=4, hi=64, seed=None):
    """noise pita frekuensi tertentu (butiran)"""
    r = np.random.default_rng(seed) if seed is not None else RNG
    f = np.fft.fft2(r.standard_normal((n, n)))
    fy = np.fft.fftfreq(n)[:, None] * n
    fx = np.fft.fftfreq(n)[None, :] * n
    k = np.sqrt(fx * fx + fy * fy)
    filt = ((k >= lo) & (k <= hi)).astype(float)
    out = np.real(np.fft.ifft2(f * filt))
    out -= out.min()
    return out / (out.max() + 1e-9)


def voronoi(cells=8, n=N, seed=None, jitter=1.0):
    """F1, F2, id sel; periodik"""
    r = np.random.default_rng(seed) if seed is not None else RNG
    pts = (np.arange(cells)[:, None, None] * 0 + 0.5 + (r.random((cells, cells, 2)) - 0.5) * jitter)
    ids = r.random((cells, cells))
    y, x = np.mgrid[0:n, 0:n] / n * cells
    cx = np.floor(x).astype(int)
    cy = np.floor(y).astype(int)
    f1 = np.full((n, n), 9.0)
    f2 = np.full((n, n), 9.0)
    cid = np.zeros((n, n))
    for oy in (-1, 0, 1):
        for ox in (-1, 0, 1):
            gx = (cx + ox) % cells
            gy = (cy + oy) % cells
            px = cx + ox + pts[gy, gx, 0]
            py = cy + oy + pts[gy, gx, 1]
            d = np.sqrt((x - px) ** 2 + (y - py) ** 2)
            closer = d < f1
            f2 = np.where(closer, f1, np.minimum(f2, d))
            cid = np.where(closer, ids[gy, gx], cid)
            f1 = np.where(closer, d, f1)
    return f1, f2, cid


def warp(img, amt, seed):
    """geser koordinat dengan noise (bentuk lebih alami)"""
    n = img.shape[0]
    dx = (spectral(beta=2.2, seed=seed) - 0.5) * amt * n
    dy = (spectral(beta=2.2, seed=seed + 1) - 0.5) * amt * n
    y, x = np.mgrid[0:n, 0:n]
    return img[(y + dy).astype(int) % n, (x + dx).astype(int) % n]


def ramp(t, stops):
    """t 0..1 → warna dari daftar (posisi, hex)"""
    pos = np.array([s[0] for s in stops])
    cols = np.array([[int(s[1][i:i + 2], 16) / 255 for i in (1, 3, 5)] for s in stops])
    out = np.zeros(t.shape + (3,))
    for c in range(3):
        out[..., c] = np.interp(t, pos, cols[:, c])
    return out


def normal_from(h, strength):
    gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5 * strength
    gy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5 * strength
    nz = 1 / np.sqrt(gx * gx + gy * gy + 1)
    return -gx * nz, gy * nz, nz


def ao_from(h, r=6):
    blur = h.copy()
    for s in (1, 2, 4, r):
        blur = (blur + np.roll(blur, s, 0) + np.roll(blur, -s, 0) + np.roll(blur, s, 1) + np.roll(blur, -s, 1)) / 5
    return np.clip(1 - np.maximum(0, blur - h) * 3.5, 0, 1)


def save(name, color, height, rough, strength=6.0, ao=None):
    OUT.mkdir(parents=True, exist_ok=True)
    h = (height - height.min()) / (np.ptp(height) + 1e-9)
    rough = np.broadcast_to(np.asarray(rough, dtype=float), h.shape)
    nx, ny, _ = normal_from(h, strength)
    a = ao_from(h) if ao is None else ao
    color = color * (0.55 + 0.45 * a[..., None])
    # tinggi ikut menerangi sedikit: bagian menonjol lebih terang (dibaca shader sebagai tinggi)
    color = color * (0.85 + 0.3 * h[..., None])
    d = np.clip(color, 0, 1)
    n = np.dstack([nx * 0.5 + 0.5, ny * 0.5 + 0.5, np.clip(rough, 0, 1)])
    Image.fromarray((d * 255).astype(np.uint8), 'RGB').save(OUT / f'{name}_d.webp', quality=88, method=6)
    Image.fromarray((n * 255).astype(np.uint8), 'RGB').save(OUT / f'{name}_n.webp', quality=92, method=6)
    print('tex', name)


def grass():
    clump = spectral(beta=2.4, seed=1)
    blades = band(lo=60, hi=200, seed=2)
    streak = spectral(beta=1.6, seed=3, aniso=(0.25, 1.0))
    dirt = np.clip((spectral(beta=1.8, seed=4) - 0.7) * 5, 0, 1) * 0.8
    h = blades * 0.6 + clump * 0.3 + streak * 0.25 - dirt * 0.4
    t = np.clip(clump * 0.45 + blades * 0.7 - 0.12, 0, 1)
    col = ramp(t, [(0, '#2f5e1c'), (0.45, '#4f8a2a'), (0.75, '#7db43c'), (1, '#b7d45a')])
    col = col * (1 - dirt[..., None]) + ramp(band(lo=20, hi=120, seed=5), [(0, '#5a4128'), (1, '#8a6a44')]) * dirt[..., None]
    save('rumput', col, h, 0.85 + blades * 0.1, 5)


def soil():
    f1, f2, cid = voronoi(26, seed=7, jitter=0.9)
    pebble = np.clip(1 - f1 * 2.4, 0, 1) * (cid > 0.55)
    base = spectral(beta=2.0, seed=8)
    fine = band(lo=40, hi=220, seed=9)
    crack = np.clip(1 - (f2 - f1) * 14, 0, 1) * (spectral(beta=2.2, seed=10) > 0.55)
    h = base * 0.5 + fine * 0.25 + pebble * 0.6 - crack * 0.3
    col = ramp(base * 0.7 + fine * 0.3, [(0, '#3e2a1a'), (0.5, '#6a4a2f'), (1, '#8f6c48')])
    col = col * (1 - pebble[..., None] * 0.6) + pebble[..., None] * 0.6 * ramp(cid, [(0, '#7a736a'), (1, '#a59a8a')])
    save('tanah', col, h, 0.92 - pebble * 0.15, 6)


def sand():
    y, x = np.mgrid[0:N, 0:N] / N
    wobble = spectral(beta=2.6, seed=11) * 0.5
    ripple = (np.sin((y * 6 + x * 2) * 2 * np.pi + wobble * 2 * np.pi) * 0.5 + 0.5) ** 2
    grain = band(lo=120, hi=256, seed=12)
    speck = (band(lo=160, hi=256, seed=112) > 0.78).astype(float)
    big = spectral(beta=2.6, seed=13)
    h = ripple * 0.25 + grain * 0.35 + big * 0.4
    col = ramp(big * 0.5 + grain * 0.5, [(0, '#cdb07a'), (0.5, '#e2c891'), (1, '#f1dfb0')])
    col = col * (1 - speck[..., None] * 0.25) + speck[..., None] * 0.25 * np.array([0.55, 0.5, 0.45])
    save('pasir', col, h, 0.9 + grain * 0.08, 4)


def rock():
    f1, f2, cid = voronoi(7, seed=14)
    g1, g2, _ = voronoi(17, seed=114)
    edge = warp(np.clip((f2 - f1) * 7, 0, 1) ** 0.5 * 0.7 + np.clip((g2 - g1) * 9, 0, 1) ** 0.5 * 0.3, 0.04, 140)
    cid = warp(cid, 0.04, 140)
    base = spectral(beta=1.9, seed=15)
    fine = band(lo=30, hi=200, seed=16)
    h = base * 0.55 + edge * 0.35 + fine * 0.2 + cid * 0.15
    lichen = np.clip((spectral(beta=2.3, seed=17) - 0.66) * 6, 0, 1) * (fine > 0.45)
    col = ramp(base * 0.6 + cid * 0.4, [(0, '#4c4a47'), (0.5, '#77736c'), (1, '#a39d92')])
    col *= (0.82 + edge * 0.18)[..., None]
    col = col * (1 - lichen[..., None]) + lichen[..., None] * np.array([0.62, 0.66, 0.38])
    save('batu', col, h, 0.8 + fine * 0.15, 8)


def cliff():
    """strata berlapis: pita mendatar yang dibengkokkan; dipakai triplanar di dinding"""
    y, x = np.mgrid[0:N, 0:N] / N
    w = spectral(beta=2.3, seed=18)
    layer = y * 10 + w * 1.6
    strata = np.abs(np.sin(layer * np.pi))
    tone = np.floor(layer) % 5 / 4
    f1, f2, _ = voronoi(5, seed=19, jitter=0.8)
    crack = warp(np.clip(1 - (f2 - f1) * 14, 0, 1) ** 3, 0.05, 119) * (spectral(beta=2.0, seed=219) > 0.45)
    fine = band(lo=40, hi=220, seed=20)
    h = strata * 0.45 + fine * 0.25 - crack * 0.45 + w * 0.3
    col = ramp(np.clip(tone * 0.6 + fine * 0.4, 0, 1), [(0, '#5a4a3c'), (0.4, '#7d6a58'), (0.7, '#9a8670'), (1, '#b4a28a')])
    col *= (0.75 + strata * 0.25 - crack * 0.35)[..., None]
    save('tebing', col, h, 0.85, 9)


def moss():
    clump = spectral(beta=2.2, seed=21)
    fuzz = band(lo=80, hi=256, seed=22)
    rock = spectral(beta=1.8, seed=23)
    m = np.clip((clump - 0.35) * 3, 0, 1)
    h = rock * 0.4 + m * 0.5 + fuzz * 0.2 * m
    col = ramp(rock, [(0, '#3d3c37'), (1, '#66625a')]) * (1 - m[..., None]) + ramp(clump * 0.6 + fuzz * 0.4, [(0, '#24461a'), (0.6, '#3f7a26'), (1, '#7fae3e')]) * m[..., None]
    save('lumut', col, h, 0.75 - m * 0.1 + fuzz * 0.1, 5)


def snow():
    soft = spectral(beta=2.8, seed=24)
    fine = band(lo=60, hi=256, seed=25)
    drift = spectral(beta=2.0, seed=26, aniso=(1.0, 0.4))
    h = soft * 0.6 + drift * 0.3 + fine * 0.08
    col = ramp(soft * 0.7 + drift * 0.3, [(0, '#c9d6e6'), (0.6, '#e9f0f8'), (1, '#ffffff')])
    rough = 0.55 + fine * 0.35 - (fine > 0.92) * 0.4
    save('salju', col, h, rough, 3)


def ice():
    f1, f2, _ = voronoi(5, seed=27)
    crack = warp(np.clip(1 - (f2 - f1) * 26, 0, 1), 0.06, 127) * (spectral(beta=2.0, seed=227) > 0.4)
    deep = spectral(beta=2.2, seed=28)
    fine = band(lo=50, hi=200, seed=29)
    h = deep * 0.5 - crack * 0.3 + fine * 0.05
    col = ramp(deep, [(0, '#5d93b8'), (0.6, '#9cc9e2'), (1, '#d8f0fa')])
    col = col * (1 - crack[..., None] * 0.5) + crack[..., None] * 0.5 * np.array([0.95, 0.98, 1])
    save('es', col, h, 0.12 + fine * 0.12 + crack * 0.3, 4)


def basalt():
    f1, f2, _ = voronoi(12, seed=30, jitter=0.6)
    cols = np.clip((f2 - f1) * 6, 0, 1)
    pores = (band(lo=60, hi=200, seed=31) > 0.72).astype(float)
    base = spectral(beta=2.0, seed=32)
    sulfur = np.clip((spectral(beta=2.0, seed=33) - 0.78) * 6, 0, 1) * 0.8
    h = cols * 0.5 + base * 0.4 - pores * 0.25
    col = ramp(base, [(0, '#18161a'), (0.6, '#2c2826'), (1, '#4a3f38')])
    col = col * (1 - sulfur[..., None]) + sulfur[..., None] * np.array([0.82, 0.75, 0.25])
    save('vulkanik', col, h, 0.88 - cols * 0.1, 8)


def crystal():
    f1, f2, cid = voronoi(10, seed=34, jitter=1.0)
    facet = np.clip((f2 - f1) * 3, 0, 1)
    edge = np.clip(1 - (f2 - f1) * 16, 0, 1)
    h = facet * 0.7 + cid * 0.3
    base = spectral(beta=1.9, seed=134)
    col = ramp(cid * 0.5 + base * 0.5, [(0, '#2a2240'), (0.45, '#4a3a7a'), (0.75, '#6a5ab0'), (1, '#8fb8d8')]) * (0.55 + facet * 0.45)[..., None]
    col = col + edge[..., None] * 0.18
    save('kristal', col, h, 0.08 + (1 - facet) * 0.15, 10)


def tea():
    """barisan semak teh: daun kecil rapat"""
    f1, f2, cid = voronoi(40, seed=35, jitter=1.0)
    leaf = np.clip(1 - f1 * 1.6, 0, 1)
    y, x = np.mgrid[0:N, 0:N] / N
    rows = (np.sin(y * 8 * 2 * np.pi + spectral(beta=2.4, seed=36) * 3) * 0.5 + 0.5) ** 0.6
    h = leaf * 0.5 + rows * 0.5
    col = ramp(cid * 0.5 + leaf * 0.5, [(0, '#173a12'), (0.5, '#2f6a1f'), (0.85, '#58a032'), (1, '#9fd25a')]) * (0.45 + rows * 0.55)[..., None]
    save('teh', col, h, 0.6 + (1 - leaf) * 0.3, 6)


def gravel():
    f1, f2, cid = voronoi(48, seed=37, jitter=1.0)
    stone = np.clip((f2 - f1) * 5, 0, 1) ** 0.5
    shade = np.clip(1 - f1 * 1.4, 0, 1)
    dirt = spectral(beta=1.8, seed=137)
    h = stone * 0.6 + shade * 0.3 + dirt * 0.2
    col = ramp(cid * 0.6 + dirt * 0.4, [(0, '#6a6259'), (0.4, '#857b70'), (0.8, '#9c907f'), (1, '#74624f')]) * (0.72 + stone * 0.28)[..., None]
    col = col * (0.8 + 0.2 * dirt[..., None])
    save('kerikil', col, h, 0.85, 7)


def bark():
    y, x = np.mgrid[0:N, 0:N] / N
    fib = spectral(beta=1.8, seed=38, aniso=(1.0, 0.08))
    f1, f2, _ = voronoi(8, seed=39, jitter=0.7)
    # pelat kulit kayu tinggi-sempit: voronoi direntang ke atas
    plates = warp(np.clip((f2 - f1) * 4, 0, 1)[:, (np.arange(N) * 3) % N], 0.03, 139)
    h = fib * 0.6 + plates * 0.4
    col = ramp(fib * 0.6 + plates * 0.4, [(0, '#2a1a10'), (0.5, '#5a3c24'), (1, '#8a6a4a')])
    save('kulit_kayu', col, h, 0.9, 10)


def leaves():
    """kartu dedaunan dengan alpha (dipasang menyilang di tajuk pohon)"""
    img = np.zeros((N, N, 4))
    r = np.random.default_rng(40)
    yy, xx = np.mgrid[0:N, 0:N] / N
    for _ in range(420):
        cx, cy = r.random(2) * 0.84 + 0.08
        ang = r.random() * np.pi
        L = 0.03 + r.random() * 0.035
        W = L * 0.45
        dx = xx - cx
        dy = yy - cy
        u = dx * np.cos(ang) + dy * np.sin(ang)
        v = -dx * np.sin(ang) + dy * np.cos(ang)
        m = (u / L) ** 2 + (v / W) ** 2 < 1
        # tepi kartu memudar supaya siluet tajuk bulat
        if np.hypot(cx - 0.5, cy - 0.5) > 0.46:
            continue
        shade = 0.55 + 0.45 * (1 - np.abs(v / W))
        tint = r.choice([0.0, 0.15, 0.3])
        c = np.array([0.22 + tint * 0.3, 0.48 + tint * 0.4, 0.16]) * shade[..., None]
        img[m] = np.dstack([c, np.ones((N, N))])[m]
    Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8), 'RGBA').save(OUT / 'daun.webp', quality=90, method=6)
    print('tex daun')


def blades():
    """helai rumput (alpha) untuk rumput instans"""
    img = np.zeros((256, 256, 4))
    r = np.random.default_rng(41)
    yy, xx = np.mgrid[0:256, 0:256] / 256
    for _ in range(26):
        bx = 0.08 + r.random() * 0.84
        h = 0.55 + r.random() * 0.43
        lean = (r.random() - 0.5) * 0.25
        t = np.clip((1 - yy) / h, 0, 1)
        cx = bx + lean * t ** 2
        w = 0.022 * (1 - t) + 0.002
        m = (np.abs(xx - cx) < w) & (1 - yy < h)
        # warna netral terang: warna akhir dari warna instans (hijau atau kering keemasan)
        c = np.array([0.78, 0.8, 0.72]) * (0.5 + t[..., None] * 0.6)
        img[m] = np.dstack([c, np.ones((256, 256))])[m]
    Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8), 'RGBA').save(OUT / 'helai.webp', quality=90, method=6)
    print('tex helai')


def water():
    h = spectral(beta=2.6, seed=42) * 0.6 + band(lo=8, hi=40, seed=43) * 0.4
    nx, ny, _ = normal_from(h, 10)
    n = np.dstack([nx * 0.5 + 0.5, ny * 0.5 + 0.5, h])
    Image.fromarray((n * 255).astype(np.uint8), 'RGB').save(OUT / 'air_n.webp', quality=92, method=6)
    cloud = spectral(beta=2.3, seed=44)
    cloud2 = band(lo=4, hi=32, seed=45)
    c = np.clip(cloud * 0.7 + cloud2 * 0.3, 0, 1)
    Image.fromarray((np.dstack([c, cloud, cloud2]) * 255).astype(np.uint8), 'RGB').save(OUT / 'awan.webp', quality=88, method=6)
    print('tex air & awan')


if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1:
        for f in sys.argv[1:]:
            globals()[f]()
        sys.exit(0)
    grass()
    soil()
    sand()
    rock()
    cliff()
    moss()
    snow()
    ice()
    basalt()
    crystal()
    tea()
    gravel()
    bark()
    leaves()
    blades()
    water()
