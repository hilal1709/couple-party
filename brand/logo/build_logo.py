"""Membangun kit logo Couple Party: simbol, wordmark (outline dari Dela Gothic One), lockup, ikon."""
import math
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

FONT = '../../node_modules/@fontsource/dela-gothic-one/files/dela-gothic-one-latin-400-normal.woff'
ROSE, INK, ELECTRIC, PETAL, GRASS, FERN = '#ff37a6', '#121212', '#5cf64a', '#ffcae9', '#87e752', '#43b929'

# ---- simbol ----
cx = cy = 128; R = 96; r = 60; a = math.radians(40)
pt = lambda rad, s: (cx + rad * math.cos(a), cy + s * rad * math.sin(a))
o1, o2, i1, i2 = pt(R, -1), pt(R, 1), pt(r, -1), pt(r, 1)
RING = (f"M{o1[0]:.2f} {o1[1]:.2f} A{R} {R} 0 1 0 {o2[0]:.2f} {o2[1]:.2f} "
        f"L{i2[0]:.2f} {i2[1]:.2f} A{r} {r} 0 1 1 {i1[0]:.2f} {i1[1]:.2f} Z")
P = "M110 82 L142 82 A31 31 0 0 1 142 144 L142 174 L110 174 Z M142 102 A11 11 0 0 1 142 124 Z"
P_TILT = 'rotate(-8 126 128)'

def symbol(c_ring, c_p, bg=None, scale=1.0, tile_round=0):
    g = f'<g transform="translate({128*(1-scale):.2f} {128*(1-scale):.2f}) scale({scale})">' \
        f'<path fill="{c_ring}" d="{RING}"/><path fill="{c_p}" fill-rule="evenodd" transform="{P_TILT}" d="{P}"/></g>'
    back = f'<rect width="256" height="256" rx="{tile_round}" fill="{bg}"/>' if bg else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">{back}{g}</svg>\n'

# ---- wordmark ----
font = TTFont(FONT)
gs = font.getGlyphSet(); cmap = font.getBestCmap(); upm = font['head'].unitsPerEm
hmtx = font['hmtx']

def word_path(text, size, x0, baseline, tracking=0.0):
    s = size / upm; x = x0; out = []
    for ch in text:
        if ch == ' ':
            x += size * 0.32; continue
        gname = cmap[ord(ch)]
        pen = SVGPathPen(gs)
        gs[gname].draw(TransformPen(pen, (s, 0, 0, -s, x, baseline)))
        out.append(pen.getCommands())
        x += hmtx[gname][0] * s + tracking * size
    return ' '.join(out), x - x0

def write(name, svg):
    open(name, 'w', encoding='utf8').write(svg)

for name, cr, cp in [('final-symbol', ROSE, INK), ('final-symbol-black', INK, INK), ('final-symbol-white', '#fff', '#fff')]:
    write(f'{name}.svg', symbol(cr, cp))

# lockup horizontal: simbol 256 + dua baris kata
top, w1 = word_path('COUPLE', 92, 290, 120, 0.01)
bot, w2 = word_path('PARTY', 92, 290, 222, 0.01)
W = int(290 + max(w1, w2) + 12)
def lockup(c_ring, c_p, c_word):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} 256">'
            f'<path fill="{c_ring}" d="{RING}"/><path fill="{c_p}" fill-rule="evenodd" transform="{P_TILT}" d="{P}"/>'
            f'<path fill="{c_word}" d="{top}"/><path fill="{c_word}" d="{bot}"/></svg>\n')
write('final-horizontal.svg', lockup(ROSE, INK, INK))
write('final-horizontal-black.svg', lockup(INK, INK, INK))
write('final-horizontal-white.svg', lockup('#fff', '#fff', '#fff'))

# ikon aplikasi: tile Electric Green, C rose, P tinta
write('app-icon.svg', symbol(ROSE, INK, ELECTRIC, 0.78, 56))
# adaptive icon Android: foreground (zona aman 66%) & background terpisah
write('adaptive-foreground.svg', symbol(ROSE, INK, None, 0.6))
write('adaptive-background.svg', f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" fill="{ELECTRIC}"/></svg>\n')
print('ok', W)
