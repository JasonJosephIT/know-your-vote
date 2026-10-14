"""Generate and post-process the KYV site illustration library.

  uv run --with pillow --with numpy python scripts/brand-assets/generate.py gen [slug ...]   # call Nano Banana Pro
  uv run --with pillow --with numpy python scripts/brand-assets/generate.py post [slug ...]  # snap to tokens, export WebP
  uv run --with pillow --with numpy python scripts/brand-assets/generate.py edit <slug> "<instruction>"  # fix one detail

Raw generations go to $KYV_RAW (default /tmp/kyv-raw), finals to public/brand/site/illustrations/.
Needs OPENROUTER_API_KEY. Rules: docs/asset-generation-guide.md §2 "Site illustration library".
"""
import base64, json, os, sys, urllib.request
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
REFS = ROOT / "public/brand/site/ai/refs"
OUT = ROOT / "public/brand/site/illustrations"
RAW = Path(os.environ.get("KYV_RAW", "/tmp/kyv-raw"))
MODEL = "google/gemini-3-pro-image"

# design.md tokens. v2 = marketing palette, v1 = calm palette.
PALETTE = {
    "v2": ["#2F6B4F", "#F5EBD8", "#22271F", "#C1541C", "#7A2E1E", "#6B7A3A", "#E3A72E", "#B26836"],
    "v1": ["#2F6B4F", "#F5EBD8", "#22271F", "#B26836", "#6B7A3A", "#E3A72E", "#EFEAE0", "#5E8C6B", "#F6F3EC"],
}
BG = {"v2": "#F5EBD8", "v1": "#F6F3EC"}
STYLE_REFS = {
    "v2": ["approved-main-street-funk.png", "v2-bike-coffee.png", "v2-boombox-dancer.png"],
    "v1": ["main-street.png", "kitchen-table-research.png", "walking-reader.png"],
}
# Object stickers anchor on approved stickers: scene refs leak their subjects into isolated objects.
STICKER_REFS = ["approved-sticker-boombox.png", "approved-sticker-orange.png", "approved-sticker-palm.png"]
STYLE = {
    "v2": ("Retro 1970s screen-print illustration with 1990s funk energy. All three reference images are approved "
           "benchmarks: match their level of detail and never exceed the first one; match their character proportions. "
           "Flat muted screen-print ink, bold simple shapes, light grain and speckle inside the colour fills, slightly "
           "uneven hand-cut edges. CHARACTERS: natural, lightly stylized proportions like the benchmark (normal head "
           "size, normal limbs and hands, nothing exaggerated or rubbery); simple faces: small dark eyes, a simple "
           "smile, a hint of nose, no shading, wrinkles, eyelashes or detailed features; hair as bold shapes "
           "(afros, curls, braids, waves), and hair may be mottled or carry two or three tones; SKIN is one perfectly "
           "flat, clean colour per person: no grain, speckle, mottling, blotches or texture on skin at all. A mix of ethnicities, ages and body types as each "
           "subject says. 70s/90s clothing (checkers, plaids, big collars, wide trousers). Strict palette: deep sage "
           "green, cream, warm near-black ink, burnt orange, brick brown, olive, harvest gold, clay."),
    "v1": ("Calm flat editorial vector illustration in the style of the reference images. Clean flat colour blocks, "
           "thin even warm-black outlines, no texture or grain, generous empty space, detail kept low. CHARACTERS: "
           "natural, lightly stylized proportions (nothing exaggerated); simple faces: two small dot eyes and a small "
           "smile, no shading, wrinkles or detailed features; hair as one flat shape, sometimes two-toned; skin is one perfectly flat, clean colour with no texture. A mix "
           "of ethnicities, ages and body types as each subject says. Strict palette: sage green, deep green, cream, "
           "warm near-black, clay, harvest gold, olive, warm sand."),
}
FRAME = {
    "scene": "Full illustrated scene to the edges.",
    "band": "A very wide panoramic strip, composed to read left to right, scene to the edges.",
    "spot": "A single vignette centered on a plain flat {bg} background, generous empty margin, nothing touching the edges.",
    "sticker": "Only this one object, isolated and centered on a plain flat {bg} background, generous empty margin, nothing touching the edges, no ground shadow. No people, faces or hands unless the subject names them, and nothing taken from the reference images.",
    "ledge": "Only this one person and the thin straight horizontal ledge they use, isolated on a plain flat {bg} background, generous empty margin above and to the sides, nothing else, no ground, no shadow. The ledge is a plain straight ink line or bar running the full width of the image.",
    "person": "Only this one person, full body, isolated and centered on a plain flat {bg} background, generous empty margin, nothing touching the edges, no ground shadow, no background panel, frame or coloured rectangle behind them, no other people.",
}
RULES = ("Match the style of the reference images closely; do not copy their subjects. Absolutely no text, letters, "
         "numbers or logos anywhere: signs, screens, papers and stickers are blank. No neon, purple, pink, bright blue "
         "or bright red. No flags, campaign signs, political symbols, donkeys, elephants, eagles or seals. No real or "
         "recognizable people.")
SIZE = {"scene": 2400, "band": 2400, "spot": 1200, "sticker": 1000, "person": 1200, "ledge": 1200}


def assets(slugs):
    rows = [a for a in json.loads((ROOT / "scripts/brand-assets/assets.json").read_text())["assets"] if a["kind"] != "code"]
    return [a for a in rows if not slugs or a["slug"] in slugs]


def prompt(a):
    return " ".join([STYLE[a["style"]], "Subject: " + a["subject"] + ".", FRAME[a["kind"]].format(bg="cream" if a["style"] == "v2" else "warm off-white"), RULES])


def gen(a):
    content = [{"type": "text", "text": prompt(a)}]
    refs = a["refs"] if "refs" in a else STICKER_REFS if a["kind"] == "sticker" and a["style"] == "v2" else STYLE_REFS[a["style"]]
    for r in refs:
        b64 = base64.b64encode((REFS / r).read_bytes()).decode()
        content.append({"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}})
    body = {"model": MODEL, "modalities": ["image", "text"], "messages": [{"role": "user", "content": content}],
            "image_config": {"aspect_ratio": a["ar"], "image_size": "2K"}}
    req = urllib.request.Request("https://openrouter.ai/api/v1/chat/completions", json.dumps(body).encode(),
                                 {"Authorization": "Bearer " + os.environ["OPENROUTER_API_KEY"], "Content-Type": "application/json"})
    res = json.load(urllib.request.urlopen(req, timeout=300))
    url = res["choices"][0]["message"]["images"][0]["image_url"]["url"]
    RAW.mkdir(parents=True, exist_ok=True)
    (RAW / f"{a['slug']}.png").write_bytes(base64.b64decode(url.split(",", 1)[1]))
    (RAW / f"{a['slug']}.json").write_text(json.dumps({"model": MODEL, "prompt": prompt(a), "refs": refs,
                                                       "aspect_ratio": a["ar"], "usage": res.get("usage")}, indent=1))
    return res.get("usage", {}).get("cost")


def edit(a, instruction):
    """Edit an existing raw generation in place (keeps the character); the previous raw is kept as <slug>.prev.png."""
    src = RAW / f"{a['slug']}.png"
    b64 = base64.b64encode(src.read_bytes()).decode()
    text = (f"Edit this illustration. {instruction} Keep everything else exactly the same: same person, pose, "
            "clothing, colours, framing, background and screen-print style. " + RULES.split(". ", 1)[1])
    body = {"model": MODEL, "modalities": ["image", "text"], "image_config": {"aspect_ratio": a["ar"], "image_size": "2K"},
            "messages": [{"role": "user", "content": [{"type": "text", "text": text},
                                                      {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}}]}]}
    req = urllib.request.Request("https://openrouter.ai/api/v1/chat/completions", json.dumps(body).encode(),
                                 {"Authorization": "Bearer " + os.environ["OPENROUTER_API_KEY"], "Content-Type": "application/json"})
    res = json.load(urllib.request.urlopen(req, timeout=300))
    url = res["choices"][0]["message"]["images"][0]["image_url"]["url"]
    src.replace(RAW / f"{a['slug']}.prev.png")
    src.write_bytes(base64.b64decode(url.split(",", 1)[1]))
    meta = RAW / f"{a['slug']}.json"
    m = json.loads(meta.read_text()) if meta.exists() else {}
    m.setdefault("edits", []).append(instruction)
    meta.write_text(json.dumps(m, indent=1))
    return res.get("usage", {}).get("cost")


# The house grain (2026-10-11): one medium-light grain on every illustration, applied at the output size so the
# specks are the same size on screen in every file. Each tuple: (token colour, share of pixels, opacity).
GRAIN = [("#22271F", 0.035, 0.22), ("#22271F", 0.008, 0.40), ("#F5EBD8", 0.025, 0.30)]


def add_grain(im, seed, skin=None):
    """Clean the model's own speckle out first (mode filter on the token-snapped image), then lay the house grain."""
    import random
    from PIL import ImageFilter
    rnd = random.Random(seed)
    im = im.convert("RGBA")
    alpha = im.getchannel("A")
    im = im.convert("RGB").filter(ImageFilter.ModeFilter(3)).convert("RGBA")
    im.putalpha(alpha)
    w, h = im.size
    px = im.load()
    sk = skin.resize((w, h), Image.Resampling.NEAREST).load() if skin else None
    for colour, share, opacity in GRAIN:
        c = hexrgb(colour)
        for _ in range(int(w * h * share)):
            x, y = rnd.randrange(w), rnd.randrange(h)
            r, g, b, a = px[x, y]
            if a < 255 or (sk and sk[x, y]):
                continue
            px[x, y] = (round(r + (c[0] - r) * opacity), round(g + (c[1] - g) * opacity), round(b + (c[2] - b) * opacity), a)
    return im


def skinmask(a):
    """One edit pass that paints only the skin magenta; the diff becomes <slug>.skin.png, used by post to keep skin flat."""
    mask, cost = make_skin_mask(RAW / f"{a['slug']}.png", a["ar"])
    mask.save(RAW / f"{a['slug']}.skin.png")
    return cost


def fix_skin_file(path):
    """Brand skin on a standalone image (e.g. a style reference): mask the skin, fill each person with the nearest
    skin token, keep everything else as it was. Overwrites the file; the original stays in git history."""
    path = Path(path)
    w, h = Image.open(path).size
    ratios = {"1:1": 1, "3:4": .75, "4:3": 4 / 3, "2:3": 2 / 3, "3:2": 1.5, "4:5": .8, "5:4": 1.25, "16:9": 16 / 9, "9:16": 9 / 16, "21:9": 21 / 9}
    ar = min(ratios, key=lambda k: abs(ratios[k] - w / h))
    mask, cost = make_skin_mask(path, ar)
    src = Image.open(path)
    alpha = src.getchannel("A") if src.mode == "RGBA" else None
    im, _ = flatten_skin(src.convert("RGB"), mask, src.convert("RGB"))
    if alpha:
        im = im.convert("RGBA")
        im.putalpha(alpha)
    im.save(path)
    return cost


def make_skin_mask(src, ar):
    b64 = base64.b64encode(src.read_bytes()).decode()
    text = ("Return this exact illustration with one change: fill every area of visible human skin (faces, necks, ears, "
            "arms, hands, legs, feet), including any blush, freckles or shading on the cheeks and skin, with pure flat "
            "magenta #FF00FF. Leave eyes, eyebrows, lips, teeth, nostrils and every "
            "dark outline or line exactly as they are, on top of the magenta. Change nothing else: same composition, same "
            "positions, same colours everywhere that is not skin.")
    body = {"model": MODEL, "modalities": ["image", "text"], "image_config": {"aspect_ratio": ar, "image_size": "2K"},
            "messages": [{"role": "user", "content": [{"type": "text", "text": text},
                                                      {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}}]}]}
    req = urllib.request.Request("https://openrouter.ai/api/v1/chat/completions", json.dumps(body).encode(),
                                 {"Authorization": "Bearer " + os.environ["OPENROUTER_API_KEY"], "Content-Type": "application/json"})
    res = json.load(urllib.request.urlopen(req, timeout=300))
    url = res["choices"][0]["message"]["images"][0]["image_url"]["url"]
    import io
    edited = Image.open(io.BytesIO(base64.b64decode(url.split(",", 1)[1]))).convert("RGB")
    orig = Image.open(src).convert("RGB")
    edited = edited.resize(orig.size)
    mask = Image.new("L", orig.size, 0)
    ep, mp = edited.load(), mask.load()
    for y in range(orig.size[1]):
        for x in range(orig.size[0]):
            r, g, b = ep[x, y]
            if r > 170 and b > 170 and g < 110:
                mp[x, y] = 255
    return mask, res.get("usage", {}).get("cost")


# design.md illustration skin tokens skin-1 (lightest) .. skin-6 (deepest). Skin is always exactly one of these, flat.
SKIN_TONES = ["#F2D3B3", "#E3B48A", "#C98E5F", "#A86A42", "#7E4A2C", "#4F2E1D"]


def flatten_skin(im, mask, raw, force=None):
    """Inside the skin mask, every pixel that is not Ink becomes one flat skin token: the nearest of SKIN_TONES to the
    region's average raw colour, so each person keeps the depth the model gave them but in an exact brand tone.
    force (an asset's "skin": 1-6) pins every region to that token instead, e.g. skin-6 for walker-fisherman so the
    eight hero walkers span the range (founder decision 4A, 2026-10-14)."""
    from PIL import ImageFilter
    mask = mask.resize(im.size, Image.Resampling.NEAREST).filter(ImageFilter.MinFilter(3))  # stay off the outlines
    ink = hexrgb("#22271F")
    px, mp, rp = im.load(), mask.load(), raw.load()
    tones = [hexrgb(t) for t in SKIN_TONES]
    w, h = im.size
    seen = set()
    for y0 in range(0, h, 3):
        for x0 in range(0, w, 3):
            if mp[x0, y0] == 0 or (x0, y0) in seen:
                continue
            comp, stack = [], [(x0, y0)]
            while stack:
                x, y = stack.pop()
                if (x, y) in seen or not (0 <= x < w and 0 <= y < h) or mp[x, y] == 0:
                    continue
                seen.add((x, y))
                comp.append((x, y))
                stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
            body = [rp[x, y] for x, y in comp if px[x, y][:3] != ink]
            if not body:
                continue
            avg = [sum(c[i] for c in body) / len(body) for i in range(3)]
            tone = tones[force - 1] if force else min(tones, key=lambda t: sum((t[i] - avg[i]) ** 2 for i in range(3)))
            for x, y in comp:
                if px[x, y][:3] != ink:
                    px[x, y] = (*tone, px[x, y][3]) if len(px[x, y]) == 4 else tone
    return im, mask


def snap_lab(im, pal):
    """Nearest token by perceptual (CIELAB) distance. Plain RGB distance sent mid-dark browns (skin) to olive."""
    import numpy as np

    def lab(rgb):
        c = rgb / 255.0
        c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
        xyz = c @ np.array([[0.4124, 0.2126, 0.0193], [0.3576, 0.7152, 0.1192], [0.1805, 0.0722, 0.9505]])
        xyz /= np.array([0.95047, 1.0, 1.08883])
        f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
        return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)

    a = np.asarray(im, dtype=np.float64)
    P = np.array(pal, dtype=np.float64)
    L, PL = lab(a), lab(P)
    idx = np.argmin(((L[..., None, :] - PL[None, None, :, :]) ** 2).sum(-1), axis=-1)
    return Image.fromarray(P[idx].astype(np.uint8), "RGB")


def measure_ledge(a):
    """Find the drawn bar in the raw (rows, or columns for axis x, that are mostly dark) and save
    <slug>.ledge = {"axis": "y"|"x", "at": fraction}. Run before editing the bar out."""
    im = Image.open(RAW / f"{a['slug']}.png").convert("RGB")
    w, h = im.size
    px = im.load()
    axis = a.get("ledge_axis", "y")
    bg = px[2, 2]  # the plain background the prompt asks for

    def solid(c):  # part of a drawn bar: clearly not background
        return sum(abs(c[i] - bg[i]) for i in range(3)) > 120

    if axis == "y":
        hits = [y for y in range(h) if sum(1 for x in range(0, w, 4) if solid(px[x, y])) > 0.6 * (w / 4)]
        at = (min(hits) + max(hits)) / 2 / h
    else:
        hits = [x for x in range(w) if sum(1 for y in range(0, h, 4) if solid(px[x, y])) > 0.6 * (h / 4)]
        at = (min(hits) + max(hits)) / 2 / w
    (RAW / f"{a['slug']}.ledge").write_text(json.dumps({"axis": axis, "at": round(at, 4)}))
    return axis, at


def hexrgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def post(a):
    im = Image.open(RAW / f"{a['slug']}.png").convert("RGB")
    pal = [hexrgb(h) for h in PALETTE[a["style"]]]
    snapped = snap_lab(im, pal)  # every pixel is a token
    skin = None
    if (RAW / f"{a['slug']}.skin.png").exists():  # flat, grain-free skin (see skinmask)
        snapped, skin = flatten_skin(snapped, Image.open(RAW / f"{a['slug']}.skin.png").convert("L"), im, a.get("skin"))
    ledge = None
    if a["kind"] == "ledge" and (RAW / f"{a['slug']}.ledge").exists():
        # the bar was measured (<slug>.ledge) and then edited out of the raw
        lj = json.loads((RAW / f"{a['slug']}.ledge").read_text())
        ledge = (lj["axis"], lj["at"] * (snapped.size[1] if lj["axis"] == "y" else snapped.size[0]))
    elif a["kind"] == "ledge":  # the drawn bar is a stand-in for the real UI edge: erase it, remember where it was
        px0, (w0, h0) = snapped.load(), snapped.size
        ink = hexrgb("#22271F")
        rows = [y for y in range(h0) if sum(px0[x, y] == ink for x in range(0, w0, 4)) > 0.6 * (w0 / 4)]
        if rows:
            ledge = ("y", (min(rows) + max(rows)) / 2)
            bg = hexrgb(BG[a["style"]])
            y0, y1 = max(0, min(rows) - 3), min(h0 - 1, max(rows) + 3)
            above, below = max(0, y0 - 6), min(h0 - 1, y1 + 6)
            for x in range(w0):
                figure = px0[x, above] != bg or px0[x, below] != bg  # hands, legs, arms cross the bar here
                for y in range(y0, y1 + 1):
                    if not figure or px0[x, y] == ink:
                        px0[x, y] = bg
    if a["kind"] in ("spot", "sticker", "person", "ledge"):
        bg = hexrgb(BG[a["style"]])
        # the model's "plain background" snaps to the lightest token; key it out from the edges
        lights = {c for c in pal if sum(c) > 690} | {max(pal, key=sum)}  # cream, paper and muted all read as background
        rgba = snapped.convert("RGBA")
        w, h = rgba.size
        px = rgba.load()
        stack = [(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)]
        seen = set()
        while stack:
            x, y = stack.pop()
            if (x, y) in seen or not (0 <= x < w and 0 <= y < h):
                continue
            seen.add((x, y))
            if px[x, y][:3] in lights or px[x, y][:3] == bg:
                px[x, y] = (0, 0, 0, 0)
                stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
        bbox = rgba.getbbox()
        snapped = rgba.crop(bbox) if bbox else rgba
        if skin and bbox:
            skin = skin.crop(bbox)
        if ledge is not None and bbox:  # where the real UI edge goes, as a fraction of the final height
            meta = OUT / "ledges.json"
            data = json.loads(meta.read_text()) if meta.exists() else {}
            axis, pos = ledge
            lo, hi = (bbox[1], bbox[3]) if axis == "y" else (bbox[0], bbox[2])
            data[a["slug"]] = {"axis": axis, "at": round((pos - lo) / (hi - lo), 3)}
            meta.write_text(json.dumps(data, indent=1, sort_keys=True) + "\n")
    if a.get("crop_bottom"):  # keep only the bottom share of a band (a thin strip from a 21:9 generation)
        bw, bh = snapped.size
        snapped = snapped.crop((0, round(bh * (1 - a["crop_bottom"])), bw, bh))
        if skin:  # the skin mask must keep matching the pixels it covers
            skin = skin.resize((bw, bh), Image.Resampling.NEAREST).crop((0, round(bh * (1 - a["crop_bottom"])), bw, bh))
    if a.get("logo"):
        snapped = place_logo(snapped, a["logo"], hexrgb(BG[a["style"]]))
    long = SIZE[a["kind"]]
    snapped.thumbnail((long, long), Image.Resampling.LANCZOS)
    OUT.mkdir(parents=True, exist_ok=True)
    half = snapped.copy()
    half.thumbnail((long // 2, long // 2), Image.Resampling.LANCZOS)
    add_grain(snapped, a["slug"], skin).save(OUT / f"{a['slug']}.webp", "WEBP", quality=80, method=6)
    add_grain(half, a["slug"] + "-sm", skin).save(OUT / f"{a['slug']}-sm.webp", "WEBP", quality=78, method=6)


def place_logo(im, which, cream):
    """Paste the untouched brand SVG into the largest enclosed cream area (blank tote, badge centre).
    The generator never draws the logo; this keeps it exact (design.md: never redraw or recolour)."""
    import resvg_py
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    seen, best = set(), []
    for y0 in range(0, h, 4):
        for x0 in range(0, w, 4):
            if (x0, y0) in seen or px[x0, y0][:3] != cream or px[x0, y0][3] == 0:
                continue
            comp, stack = [], [(x0, y0)]
            while stack:
                x, y = stack.pop()
                if (x, y) in seen or not (0 <= x < w and 0 <= y < h) or px[x, y][3] == 0 or px[x, y][:3] != cream:
                    continue
                seen.add((x, y))
                comp.append((x, y))
                stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
            if len(comp) > len(best):
                best = comp
    area = set(best)
    cx, cy = sum(c[0] for c in best) // len(best), sum(c[1] for c in best) // len(best)  # centroid of the blank area
    svg = ROOT / f"public/brand/kyv-logo-{'acronym' if which == 'acronym' else 'official'}.svg"
    import io
    master = Image.open(io.BytesIO(bytes(resvg_py.svg_to_bytes(svg_path=str(svg), width=2400)))).convert("RGBA")
    master = master.crop(master.getbbox())

    def fits(lw, lh, m):  # logo box plus clearspace margin m lies wholly inside the blank area
        x0, y0, x1, y1 = cx - lw // 2 - m, cy - lh // 2 - m, cx + lw // 2 + m, cy + lh // 2 + m
        return all((x, y) in area for x in range(x0, x1 + 1, 4) for y in (y0, y1)) and \
               all((x, y) in area for y in range(y0, y1 + 1, 4) for x in (x0, x1))

    lh = int((max(c[1] for c in best) - min(c[1] for c in best)) * 0.7)
    while lh > 40:
        lw = lh * master.width // master.height
        if fits(lw, lh, lh // 8):  # clearspace ~ the height of the monogram's letter O
            break
        lh = int(lh * 0.93)
    logo = master.resize((lw, lh), Image.Resampling.LANCZOS)
    im.alpha_composite(logo, (cx - lw // 2, cy - lh // 2))
    print(f"  logo {which} {logo.size} centred at {cx},{cy}")
    return im


if __name__ == "__main__":
    if sys.argv[1] == "skinmask":  # skinmask <slug ...>
        for sl in sys.argv[2:]:
            print(f"skin {sl}  ${skinmask(assets({sl})[0]) or 0:.3f}", flush=True)
        sys.exit()
    if sys.argv[1] == "fixskin":  # fixskin <image path ...>
        for fp in sys.argv[2:]:
            print(f"fixskin {fp}  ${fix_skin_file(fp) or 0:.3f}", flush=True)
        sys.exit()
    if sys.argv[1] == "ledge":  # ledge <slug ...>: measure the bar, then edit it out of the raw
        for sl in sys.argv[2:]:
            a = assets({sl})[0]
            print("ledge", sl, measure_ledge(a), flush=True)
            edit(a, "Remove the straight bar or ledge line completely, so the background shows where it was. "
                    "The person or animal, their hands, legs and pose stay exactly where they are.")
        sys.exit()
    if sys.argv[1] == "edit":  # edit <slug> "<instruction>"
        print(f"edit {sys.argv[2]}  ${edit(assets({sys.argv[2]})[0], sys.argv[3]) or 0:.3f}")
        sys.exit()
    cmd, slugs = sys.argv[1], set(sys.argv[2:])
    total = 0
    for a in assets(slugs):
        try:
            if cmd == "gen":
                c = gen(a) or 0
                total += c
                print(f"gen  {a['slug']}  ${c:.3f}", flush=True)
            else:
                post(a)
                print(f"post {a['slug']}", flush=True)
        except Exception as e:  # keep the batch going; rerun failed slugs by name
            print(f"FAIL {a['slug']}: {e}", flush=True)
    if cmd == "gen":
        print(f"total ${total:.2f}")
