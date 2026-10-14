"""Re-tone one person's flat skin from one illustration-skin token to another, in place (decision 4A, 2026-10-14:
the fisherman goes from skin-5 to skin-6, so the eight hero walkers span skin-1 to skin-6).

  uv run --python 3.12 --with pillow python scripts/brand-assets/retone.py walker-fisherman 5 6

Edits the master, its -sm and its rotator frame, each re-encoded at the quality it was made at. Skin is one flat
token (generate.py flatten_skin), so the skin is every large region within +-8 per channel of the old token; each
becomes the new token exactly. The 1-2px anti-aliased rim around it (skin blended with ink, beard, cap or the
transparent edge) moves by its share of skin only, fitted per pixel against its nearest non-skin neighbour, so no
old-tone halo is left. Everything else (outlines, eyes, hair, clothes, grain, alpha) is left as it was; the script
prints how many pixels changed and where, for the before-and-after diff.
"""
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ILL = ROOT / "public/brand/site/illustrations"
ROT = ROOT / "public/brand/site/rotator"
# design.md illustration-skin tokens, skin-1 (lightest) .. skin-6 (deepest); the same list as generate.py SKIN_TONES
SKIN_TONES = ["#F2D3B3", "#E3B48A", "#C98E5F", "#A86A42", "#7E4A2C", "#4F2E1D"]
TOL = 8  # per channel, around the old token: lossy WebP noise on a flat fill
RIM = 2  # px around the skin that may hold a blend of skin and its neighbour


def hexrgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def skin_regions(px, w, h, old, min_px):
    """4-connected regions of opaque pixels within TOL of the old token, at least min_px each (drops stray specks)."""
    near = lambda c: c[3] == 255 and all(abs(c[i] - old[i]) <= TOL for i in range(3))
    seen, skin = set(), set()
    for y0 in range(h):
        for x0 in range(w):
            if (x0, y0) in seen or not near(px[x0, y0]):
                continue
            comp, stack = [], [(x0, y0)]
            seen.add((x0, y0))
            while stack:
                x, y = stack.pop()
                comp.append((x, y))
                for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= n[0] < w and 0 <= n[1] < h and n not in seen and near(px[n]):
                        seen.add(n)
                        stack.append(n)
            if len(comp) >= min_px:
                skin.update(comp)
    return skin


def skin_share(c, old, others):
    """How much of pixel c is the old skin, as the best two-colour fit c = t*old + (1-t)*n over the neighbours n."""
    best_t, best_err = 0.0, 1e9
    for n in others:
        d = [old[i] - n[i] for i in range(3)]
        dd = sum(v * v for v in d)
        if dd < 900:  # a neighbour this close to skin says nothing about the blend
            continue
        t = max(0.0, min(1.0, sum((c[i] - n[i]) * d[i] for i in range(3)) / dd))
        err = sum((c[i] - (t * old[i] + (1 - t) * n[i])) ** 2 for i in range(3))
        if err < best_err:
            best_t, best_err = t, err
    if not others or best_err == 1e9:  # surrounded by skin: it is skin
        return 1.0
    return best_t if best_err <= 24 ** 2 else 0.0


def retone(im, old, new, min_px):
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    src = im.copy().load()
    skin = skin_regions(src, w, h, old, min_px)
    rim = {(x + dx, y + dy) for x, y in skin for dx in range(-RIM, RIM + 1) for dy in range(-RIM, RIM + 1)} - skin
    shift = [new[i] - old[i] for i in range(3)]
    for x, y in skin:
        px[x, y] = (*new, src[x, y][3])
    changed = len(skin)
    for x, y in rim:
        if not (0 <= x < w and 0 <= y < h) or src[x, y][3] == 0:
            continue
        others = [src[x + dx, y + dy][:3] for dx in range(-RIM, RIM + 1) for dy in range(-RIM, RIM + 1)
                  if 0 <= x + dx < w and 0 <= y + dy < h and (x + dx, y + dy) not in skin and src[x + dx, y + dy][3] > 0]
        t = skin_share(src[x, y][:3], old, others)
        if t > 0:
            c = src[x, y]
            px[x, y] = (*(max(0, min(255, round(c[i] + t * shift[i]))) for i in range(3)), c[3])
            changed += 1
    xs, ys = [p[0] for p in skin], [p[1] for p in skin]
    return im, len(skin), changed, (min(xs), min(ys), max(xs), max(ys)) if skin else None


def main():
    slug, a, b = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
    old, new = hexrgb(SKIN_TONES[a - 1]), hexrgb(SKIN_TONES[b - 1])
    for path, quality in ((ILL / f"{slug}.webp", 80), (ILL / f"{slug}-sm.webp", 78), (ROT / f"{slug}.webp", 82)):
        src = Image.open(path)
        px = list(src.convert("RGBA").get_flattened_data())
        near = lambda t: sum(1 for c in px if c[3] == 255 and all(abs(c[i] - t[i]) <= TOL for i in range(3)))
        if near(new) > 5 * near(old):  # already re-toned (what is left of the old tone is rim blends): leave it alone
            print(f"{path.relative_to(ROOT)}: already skin-{b}, left as it is")
            continue
        min_px = max(12, src.width * src.height // 18000)  # ~50 on a 775x1200 master
        out, flat, changed, box = retone(src, old, new, min_px)
        out.save(path, "WEBP", quality=quality, method=6)
        print(f"{path.relative_to(ROOT)}: {flat} skin px set to skin-{b}, {changed} px changed in all, skin bbox {box}")


if __name__ == "__main__":
    main()
