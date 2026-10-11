"""Generate and post-process the KYV site illustration library.

  uv run --with pillow python scripts/brand-assets/generate.py gen [slug ...]   # call Nano Banana Pro
  uv run --with pillow python scripts/brand-assets/generate.py post [slug ...]  # snap to tokens, export WebP
  uv run --with pillow python scripts/brand-assets/generate.py edit <slug> "<instruction>"  # fix one detail

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
           "smile, a hint of nose, no shading, wrinkles, eyelashes or detailed features; hair as bold solid shapes "
           "(afros, curls, braids, waves); skin as flat warm tones. A mix of ethnicities, ages and body types as each "
           "subject says. 70s/90s clothing (checkers, plaids, big collars, wide trousers). Strict palette: deep sage "
           "green, cream, warm near-black ink, burnt orange, brick brown, olive, harvest gold, clay."),
    "v1": ("Calm flat editorial vector illustration in the style of the reference images. Clean flat colour blocks, "
           "thin even warm-black outlines, no texture or grain, generous empty space, detail kept low. CHARACTERS: "
           "natural, lightly stylized proportions (nothing exaggerated); simple faces: two small dot eyes and a small "
           "smile, no shading, wrinkles or detailed features; hair as one flat shape; skin as flat warm tones. A mix "
           "of ethnicities, ages and body types as each subject says. Strict palette: sage green, deep green, cream, "
           "warm near-black, clay, harvest gold, olive, warm sand."),
}
FRAME = {
    "scene": "Full illustrated scene to the edges.",
    "band": "A very wide panoramic strip, composed to read left to right, scene to the edges.",
    "spot": "A single vignette centered on a plain flat {bg} background, generous empty margin, nothing touching the edges.",
    "sticker": "Only this one object, isolated and centered on a plain flat {bg} background, generous empty margin, nothing touching the edges, no ground shadow. No people, faces or hands unless the subject names them, and nothing taken from the reference images.",
    "person": "Only this one person, full body, isolated and centered on a plain flat {bg} background, generous empty margin, nothing touching the edges, no ground shadow, no background panel, frame or coloured rectangle behind them, no other people.",
}
RULES = ("Match the style of the reference images closely; do not copy their subjects. Absolutely no text, letters, "
         "numbers or logos anywhere: signs, screens, papers and stickers are blank. No neon, purple, pink, bright blue "
         "or bright red. No flags, campaign signs, political symbols, donkeys, elephants, eagles or seals. No real or "
         "recognizable people.")
SIZE = {"scene": 2400, "band": 2400, "spot": 1200, "sticker": 1000, "person": 1200}


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


def hexrgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def post(a):
    im = Image.open(RAW / f"{a['slug']}.png").convert("RGB")
    pal = [hexrgb(h) for h in PALETTE[a["style"]]]
    p = Image.new("P", (1, 1))
    p.putpalette(sum(pal, ()) + (0, 0, 0) * (256 - len(pal)))
    snapped = im.quantize(palette=p, dither=Image.Dither.NONE).convert("RGB")  # every pixel is a token
    if a["kind"] in ("spot", "sticker", "person"):
        bg = hexrgb(BG[a["style"]])
        # the model's "plain background" snaps to the lightest token; key it out from the edges
        light = max(pal, key=sum)
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
            if px[x, y][:3] in (light, bg):
                px[x, y] = (0, 0, 0, 0)
                stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
        bbox = rgba.getbbox()
        snapped = rgba.crop(bbox) if bbox else rgba
    if a.get("logo"):
        snapped = place_logo(snapped, a["logo"], hexrgb(BG[a["style"]]))
    long = SIZE[a["kind"]]
    snapped.thumbnail((long, long), Image.Resampling.LANCZOS)
    OUT.mkdir(parents=True, exist_ok=True)
    snapped.save(OUT / f"{a['slug']}.webp", "WEBP", quality=88, method=6)
    half = snapped.copy()
    half.thumbnail((long // 2, long // 2), Image.Resampling.LANCZOS)
    half.save(OUT / f"{a['slug']}-sm.webp", "WEBP", quality=85, method=6)


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
