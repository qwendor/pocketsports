"""Pack art_src/ into art.js (window.PS_ART = {name: dataURL}). Run after regenerating any asset."""
import base64, io, os
from PIL import Image
os.chdir(os.path.dirname(os.path.abspath(__file__)))
out = {}
def put(name, im, fmt, q=82):
    b = io.BytesIO()
    if fmt == 'JPEG': im.convert('RGB').save(b, 'JPEG', quality=q, optimize=True)
    elif fmt == 'WEBP': im.save(b, 'WEBP', quality=q, method=6)
    else: im.save(b, 'PNG', optimize=True)
    out[name] = 'data:image/%s;base64,%s' % ({'JPEG': 'jpeg', 'WEBP': 'webp'}.get(fmt, 'png'), base64.b64encode(b.getvalue()).decode())
def load(f): return Image.open('art_src/' + f)
# transparent icons / logo / faces
for n in ['tennis', 'bowling', 'baseball', 'golf', 'boxing']:
    im = load('ic_%s.png' % n).convert('RGBA'); bb = im.getbbox(); im = im.crop(bb); im.thumbnail((360, 360)); put('ic_' + n, im, 'WEBP', 85)
lg = load('ps_logo.png').convert('RGBA'); lg = lg.crop(lg.getbbox()); lg.thumbnail((900, 600)); put('logo', lg, 'WEBP', 88)
fc = load('faces.png').convert('RGBA'); fc = fc.resize((768, 768)); put('faces', fc, 'WEBP', 90)
# tileable textures
for n in ['grass', 'lane', 'dirt', 'water']:
    put('tex_' + n, load('tex_%s.png' % n).resize((512, 512), Image.LANCZOS), 'JPEG', 80)
# backdrops: crop to the useful band, keep wide
def band(f, top, bottom, w=1536, h=None):
    im = load(f).convert('RGB'); W, H = im.size; im = im.crop((0, int(H * top), W, int(H * bottom)))
    if h: im = im.resize((w, h), Image.LANCZOS)
    return im
def fadeTop(im, frac):
    im = im.convert('RGBA'); W, H = im.size; a = Image.new('L', (W, H), 255); px = a.load()
    for y in range(int(H * frac)):
        v = int(255 * (y / (H * frac)) ** 1.5)
        for x in range(W): px[x, y] = v
    im.putalpha(a); return im
put('bg_crowd', fadeTop(band('bg_crowd.png', 0.30, 0.86, 1536, 480), 0.14), 'WEBP', 80)
put('bg_sky', load('bg_sky.png').convert('RGB').resize((1536, 768), Image.LANCZOS), 'JPEG', 75)
put('bg_alley', band('bg_alley.png', 0.0, 0.72, 1536, 560), 'JPEG', 78)
put('bg_arena', band('bg_arena.png', 0.0, 0.78, 1536, 560), 'JPEG', 78)
put('bg_hills', fadeTop(band('bg_hills.png', 0.05, 0.85, 1536, 560), 0.55), 'WEBP', 80)
put('bg_title', load('bg_title.jpeg').convert('RGB').resize((1536, 1024), Image.LANCZOS), 'JPEG', 78)
js = 'window.PS_ART=' + __import__('json').dumps(out) + ';\n'
open('art.js', 'w', encoding='utf-8', newline='\n').write(js)
print('art.js', round(len(js) / 1e6, 2), 'MB', {k: round(len(v) / 1e3) for k, v in out.items()})
