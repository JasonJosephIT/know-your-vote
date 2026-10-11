"""Draw the code-made site textures and dividers (assets.json rows with kind 'code').

  uv run --with pillow python scripts/brand-assets/textures.py

Every colour is a design.md token. Tiles repeat seamlessly; dividers use currentColor so CSS sets the token.
"""
import math, random
from pathlib import Path
from PIL import Image

OUT = Path(__file__).resolve().parents[2] / "public/brand/site/textures"
OUT.mkdir(parents=True, exist_ok=True)
rnd = random.Random(2026)


def rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def speckle(size, base, specks, alpha_base=255):
    """Seamless grain tile: a flat base with random 1-2px specks in token colours."""
    im = Image.new("RGBA", (size, size), (*rgb(base), alpha_base) if base else (0, 0, 0, 0))
    px = im.load()
    for colour, density, alpha in specks:
        c = rgb(colour)
        for _ in range(int(size * size * density)):
            x, y = rnd.randrange(size), rnd.randrange(size)
            r = 1 if rnd.random() < 0.8 else 2
            for dx in range(r):
                for dy in range(r):
                    px[(x + dx) % size, (y + dy) % size] = (*c, alpha)
    return im


speckle(512, "#F5EBD8", [("#E4DED2", 0.06, 255), ("#CFC7B6", 0.015, 255), ("#22271F", 0.002, 255)]).save(OUT / "tex-paper-grain.webp", "WEBP", lossless=True)
speckle(512, None, [("#22271F", 0.0018, 60), ("#22271F", 0.0006, 110)]).save(OUT / "tex-riso-speckle.webp", "WEBP", lossless=True)
speckle(256, "#22271F", [("#2F6B4F", 0.03, 255), ("#585E52", 0.02, 255)]).save(OUT / "tex-masthead-ink.webp", "WEBP", lossless=True)

svgs = {
    "tex-halftone.svg": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><g fill="#22271F" fill-opacity=".14"><circle cx="4" cy="4" r="1.6"/><circle cx="12" cy="12" r="1.6"/></g></svg>',
    "tex-checker.svg": '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" fill="#6B7A3A"/><path d="M0 0h24v24H0zM24 24h24v24H24z" fill="#C1541C"/></svg>',
    "divider-zigzag.svg": '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="12" viewBox="0 0 24 12"><path d="M0 9 6 3l6 6 6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/></svg>',
    "divider-wave.svg": '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="12" viewBox="0 0 32 12"><path d="M0 6c4 0 4-4 8-4s4 4 8 4 4 4 8 4 4-4 8-4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>',
    "divider-checker.svg": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M0 0h8v8H0zM8 8h8v8H8z" fill="currentColor"/></svg>',
}
rays = []
n = 24
for i in range(0, n, 2):
    a0, a1 = math.pi * i / n, math.pi * (i + 1) / n
    rays.append(f"M600 600L{600 - 900 * math.cos(a0):.1f} {600 - 900 * math.sin(a0):.1f}L{600 - 900 * math.cos(a1):.1f} {600 - 900 * math.sin(a1):.1f}Z")
svgs["bg-sunburst.svg"] = ('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMax slice">'
                           f'<path d="{"".join(rays)}" fill="#E3A72E" fill-opacity=".22"/>'
                           '<circle cx="600" cy="600" r="150" fill="#E3A72E" fill-opacity=".35"/></svg>')
for name, body in svgs.items():
    (OUT / name).write_text(body + "\n")
print("\n".join(sorted(p.name for p in OUT.iterdir())))
