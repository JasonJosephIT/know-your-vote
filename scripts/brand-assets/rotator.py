"""Sharp, normalised walker frames for the home hero walk; the motion is CSS (HeroRotator.module.css).

  uv run --python 3.12 --with pillow python scripts/brand-assets/rotator.py

Each walker is cropped to its figure and set on a 450x600 (3:4) transparent canvas, centred, feet on the
bottom edge, so every walker has the same size and baseline in the procession. The motion-blur frames, the
transition sheet and the demo page this script used to write were retired on 2026-10-11, when the swap
rotator became the CSS walk (docs/design/brand-assets-2026-10-11/hero-rotator.html is the archived demo).
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ILL = ROOT / "public/brand/site/illustrations"
OUT = ROOT / "public/brand/site/rotator"
WALKERS = ["person-phone-reader", "walker-nurse", "walker-lineworker", "walker-fisherman",
           "walker-teacher", "walker-student", "walker-chef", "walker-prosthetic"]
H = 600  # every frame is normalised to this height, feet on the bottom edge


def normalise(slug):
    im = Image.open(ILL / f"{slug}.webp").convert("RGBA")
    im = im.crop(im.getbbox())
    canvas = Image.new("RGBA", (int(H * 0.75), H), (0, 0, 0, 0))  # 3:4 stage, figure centred, feet on the edge
    scale = min(H / im.height, canvas.width / im.width)
    fig = im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS)
    canvas.alpha_composite(fig, ((canvas.width - fig.width) // 2, H - fig.height))
    return canvas


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for slug in WALKERS:
        normalise(slug).save(OUT / f"{slug}.webp", "WEBP", quality=82, method=6)
        print("rotator", slug)


if __name__ == "__main__":
    main()
