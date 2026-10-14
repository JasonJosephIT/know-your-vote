"""Code-composed brand pieces: Florida motif wallpaper, corner sunburst, halftone edge, walkers share card,
reminder-email hero and the phone walker row. Text and the wordmark are real (font + untouched SVG), never generated.

  uv run --python 3.12 --with pillow --with resvg-py python scripts/brand-assets/compose.py <Figtree.ttf>
  uv run --python 3.12 --with pillow --with resvg-py python scripts/brand-assets/compose.py row   (the walker row only)
"""
import io, math, random, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import resvg_py
from rotator import WALKERS  # the hero's order, mirrored from src/components/brand/hero-walk.ts

ROOT = Path(__file__).resolve().parents[2]
ILL = ROOT / "public/brand/site/illustrations"
TEX = ROOT / "public/brand/site/textures"
FONT = sys.argv[1]
INK, CREAM, BG, BORDER, GOLD = "#22271F", "#F5EBD8", "#F6F3EC", "#E4DED2", "#E3A72E"


def rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def font(size, weight=700):
    f = ImageFont.truetype(FONT, size)
    f.set_variation_by_axes([weight])
    return f


def wordmark(width):
    im = Image.open(io.BytesIO(bytes(resvg_py.svg_to_bytes(svg_path=str(ROOT / "public/brand/kyv-logo-official.svg"), width=width * 3)))).convert("RGBA")
    im = im.crop(im.getbbox())
    return im.resize((width, round(im.height * width / im.width)), Image.Resampling.LANCZOS)


def silhouette(slug, size, colour):
    im = Image.open(ILL / f"{slug}.webp").convert("RGBA")
    im.thumbnail((size, size), Image.Resampling.LANCZOS)
    flat = Image.new("RGBA", im.size, (*rgb(colour), 255))
    flat.putalpha(im.getchannel("A"))
    return flat


def wallpaper():
    """Seamless 1024 tile: kit motifs as one-colour silhouettes (border on background), wrapped at the edges."""
    rnd = random.Random(7)
    n, tile = 1024, Image.new("RGBA", (1024, 1024), (*rgb(BG), 255))
    motifs = ["sticker-palm", "sticker-orange", "sticker-pelican", "sticker-sun", "sticker-flamingo", "sticker-daisy"]
    step = 256
    for gy in range(4):
        for gx in range(4):
            m = silhouette(motifs[(gx + gy * 3) % len(motifs)], 120, BORDER).rotate(rnd.uniform(-18, 18), expand=True, resample=Image.Resampling.BICUBIC)
            x = gx * step + (step // 2 if gy % 2 else 0) + rnd.randint(-30, 30)
            y = gy * step + rnd.randint(-30, 30)
            for dx in (-n, 0, n):
                for dy in (-n, 0, n):
                    _wrap(tile, m, x + dx, y + dy)
    tile.convert("RGB").save(TEX / "tex-florida-wallpaper.webp", "WEBP", quality=85)


def _wrap(tile, m, x, y):
    # paste whatever part of the motif overlaps the tile; the 9 offsets make the tile wrap seamlessly
    n = tile.size[0]
    if x + m.width <= 0 or y + m.height <= 0 or x >= n or y >= n:
        return
    sx, sy = max(0, -x), max(0, -y)
    part = m.crop((sx, sy, min(m.width, n - x), min(m.height, n - y)))
    tile.alpha_composite(part, (max(0, x), max(0, y)))


def svgs():
    rays = []
    for i in range(0, 12, 2):
        a0, a1 = math.pi / 2 * i / 12, math.pi / 2 * (i + 1) / 12
        rays.append(f"M0 0L{400 * math.cos(a0):.1f} {400 * math.sin(a0):.1f}L{400 * math.cos(a1):.1f} {400 * math.sin(a1):.1f}Z")
    (TEX / "corner-sunburst.svg").write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">'
        f'<path d="{"".join(rays)}" fill="{GOLD}" fill-opacity=".28"/><circle r="56" fill="{GOLD}" fill-opacity=".4"/></svg>\n')
    dots = "".join(f'<circle cx="{x * 8 + (4 if r % 2 else 0)}" cy="{r * 6 + 3}" r="{2.6 - r * 0.45:.2f}"/>' for r in range(5) for x in range(8))
    (TEX / "edge-halftone.svg").write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32" viewBox="0 0 64 32"><g fill="{INK}" fill-opacity=".18">{dots}</g></svg>\n')


def card(size, walkers, headline, sub, out, walker_h):
    w, h = size
    im = Image.new("RGBA", size, (*rgb(CREAM), 255))
    figs = []
    for slug in walkers:
        f = Image.open(ILL / f"{slug}.webp").convert("RGBA")
        f = f.crop(f.getbbox())
        figs.append(f.resize((round(f.width * walker_h / f.height), walker_h), Image.Resampling.LANCZOS))
    line_w = sum(f.width - 12 for f in figs)
    sun_w = round(line_w * 1.5)  # the sun sits behind the line-up only, so the text keeps a clear field
    sun = Image.open(io.BytesIO(bytes(resvg_py.svg_to_bytes(svg_path=str(TEX / "bg-sunburst.svg"), width=sun_w)))).convert("RGBA")
    cx, cy = sun.width // 2, sun.height  # centre the fade on the sun's base
    fade = Image.radial_gradient("L").resize((sun.width * 2, sun.height * 2)).crop((cx - sun.width // 2, cy - sun.height, cx - sun.width // 2 + sun.width, cy))
    fade = fade.point(lambda v: max(0, 255 - int(v * 0.95)))  # radial_gradient: 0 at the centre, rising outward
    sun.putalpha(Image.composite(sun.getchannel("A"), Image.new("L", sun.size, 0), fade))
    im.alpha_composite(sun, (w - 40 - line_w // 2 - sun_w // 2, h - sun.height))
    x = w - 40
    for f in reversed(figs):  # walkers line up from the right, feet on the bottom edge
        x -= f.width - 12
        im.alpha_composite(f, (x, h - f.height - 18))
    wm = wordmark(200)
    im.alpha_composite(wm, (56, 48))
    d = ImageDraw.Draw(im)
    y = 48 + wm.height + 34
    for line in headline:
        d.text((56, y), line, font=font(56, 800), fill=INK)
        y += 64
    if sub:
        d.text((56, y + 10), sub, font=font(26, 500), fill="#585E52")
    im.convert("RGB").save(out, "PNG", optimize=True)


def row(height, gap, out):
    """All eight hero walkers, still, at one height and evenly spaced, in the hero's fixed order (design.md "Art on
    phones": the walker row on home and /about). Every figure is the same size, as in the walk, and the order is fixed
    as on the share card: all eight are on screen at once, so rotating the lead per view adds nothing."""
    figs = []
    for slug in WALKERS:  # soles are on each file's last row (measured 2026-10-14), so the row's bottom is the sole line
        im = Image.open(ILL / f"{slug}.webp").convert("RGBA")
        im = im.crop(im.getbbox())
        figs.append(im.resize((round(im.width * height / im.height), height), Image.Resampling.LANCZOS))
    canvas = Image.new("RGBA", (sum(f.width for f in figs) + gap * (len(figs) - 1), height), (0, 0, 0, 0))
    x = 0
    for f in figs:
        canvas.alpha_composite(f, (x, 0))
        x += f.width + gap
    canvas.save(out, "WEBP", quality=78, method=6)
    return canvas.size


if __name__ == "__main__":
    if sys.argv[1] == "row":  # the 2x phone file (96px for a 48px row) and the -sm file the ArtName key resolves to
        print("walker-row-xs", row(96, 4, ILL / "walker-row-xs.webp"))
        print("walker-row-sm", row(300, 12, ILL / "walker-row-sm.webp"))
        sys.exit()
    wallpaper()
    svgs()
    card((1200, 630), ["person-phone-reader", "walker-teacher", "walker-chef", "walker-prosthetic"],
         ["Florida candidates,", "in their own words."], "Every quote linked to its source. No ZIP needed.",
         ROOT / "public/brand/site/og-card-walkers.png", 270)
    card((1200, 600), ["walker-lineworker", "walker-student"],
         ["Election Day is", "Tuesday, November 3"], None, ROOT / "public/brand/email/reminder-hero-walkers.png", 380)
    print("composed")
