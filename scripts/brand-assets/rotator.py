"""Hero rotator assets: motion-blur frames for each walker, a transition sheet, and a working demo page.

  uv run --python 3.12 --with pillow --with numpy python scripts/brand-assets/rotator.py

The walkers cycle in the home lede over the sunburst: sharp, blur out, blur in, sharp. The blur frames are
pre-rendered (a horizontal motion streak trailing behind the step), so the site swaps images instead of
running a CSS filter on a large cut-out. Reduced-motion users get the first walker, still.
"""
import base64
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ILL = ROOT / "public/brand/site/illustrations"
OUT = ROOT / "public/brand/site/rotator"
DOC = ROOT / "docs/design/brand-assets-2026-10-11"
WALKERS = ["person-phone-reader", "walker-nurse", "walker-lineworker", "walker-fisherman",
           "walker-teacher", "walker-student", "walker-chef", "walker-prosthetic"]
H = 600  # every frame is normalised to this height, feet on the bottom edge, so swaps don't jump


def normalise(slug):
    im = Image.open(ILL / f"{slug}.webp").convert("RGBA")
    im = im.crop(im.getbbox())
    canvas = Image.new("RGBA", (int(H * 0.75), H), (0, 0, 0, 0))  # 3:4 stage, figure centred, feet on the edge
    scale = min(H / im.height, canvas.width / im.width)
    fig = im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS)
    canvas.alpha_composite(fig, ((canvas.width - fig.width) // 2, H - fig.height))
    return canvas


def motion_blur(im, length, direction):
    """Directional streak: average of shifted copies in premultiplied alpha. direction -1 trails left (moving right)."""
    a = np.asarray(im, dtype=np.float32) / 255.0
    pre = a.copy()
    pre[..., :3] *= pre[..., 3:4]
    acc = np.zeros_like(pre)
    weights = 0.0
    for i in range(length):
        wgt = 1.0 - i / length * 0.6  # the leading edge is strongest
        shift = direction * i
        sh = np.roll(pre, shift, axis=1)
        if shift > 0:
            sh[:, :shift] = 0
        elif shift < 0:
            sh[:, shift:] = 0
        acc += sh * wgt
        weights += wgt
    acc /= weights
    out = acc.copy()
    alpha = np.clip(out[..., 3:4], 1e-6, 1)
    out[..., :3] = np.where(out[..., 3:4] > 0, out[..., :3] / alpha, 0)
    return Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8), "RGBA")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    frames = {}
    for slug in WALKERS:
        sharp = normalise(slug)
        out_blur = motion_blur(sharp, 70, +1)   # leaving: streaks forward as the figure steps out to the right
        in_blur = motion_blur(sharp, 70, -1)    # arriving: streak trails behind, settling into place
        for name, im in (("", sharp), ("-blur-out", out_blur), ("-blur-in", in_blur)):
            im.save(OUT / f"{slug}{name}.webp", "WEBP", quality=82, method=6)
        frames[slug] = (sharp, out_blur, in_blur)
        print("rotator", slug)

    # Transition sheet: A sharp -> A blur out -> B blur in -> B sharp, for the first three swaps, over the sunburst
    sun = None
    try:
        import resvg_py  # optional: draws the real sunburst behind the frames
        import io
        sun = Image.open(io.BytesIO(bytes(resvg_py.svg_to_bytes(svg_path=str(ROOT / "public/brand/site/textures/bg-sunburst.svg"), width=900)))).convert("RGBA")
    except Exception:
        pass
    cell_w, cell_h = 300, 400
    seq = []
    for a, b in zip(WALKERS[:4], WALKERS[1:5]):
        seq += [frames[a][0], frames[a][1], frames[b][2]]
    seq.append(frames[WALKERS[4]][0])
    sheet = Image.new("RGBA", (cell_w * 5, cell_h * 2), (0xF6, 0xF3, 0xEC, 255))
    for i, fr in enumerate(seq[:10]):
        x, y = (i % 5) * cell_w, (i // 5) * cell_h
        if sun:
            bg = sun.resize((cell_w, cell_w // 2))
            sheet.alpha_composite(bg, (x, y + cell_h - bg.height))
        f = fr.copy()
        f.thumbnail((cell_w - 20, cell_h - 20))
        sheet.alpha_composite(f, (x + (cell_w - f.width) // 2, y + cell_h - f.height))
    sheet.convert("RGB").save(OUT / "transition-sheet.webp", "WEBP", quality=85)

    # Demo page: self-contained, the real frames inlined
    uri = lambda p: "data:image/webp;base64," + base64.b64encode(p.read_bytes()).decode()
    sun_uri = "data:image/svg+xml;base64," + base64.b64encode((ROOT / "public/brand/site/textures/bg-sunburst.svg").read_bytes()).decode()
    imgs = "".join(
        f'<figure class="w" data-i="{i}"><img class="s" src="{uri(OUT / f"{s}.webp")}" alt=""><img class="o" src="{uri(OUT / f"{s}-blur-out.webp")}" alt="">'
        f'<img class="n" src="{uri(OUT / f"{s}-blur-in.webp")}" alt=""></figure>' for i, s in enumerate(WALKERS))
    html = f'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KYV hero rotator</title>
<style>:root{{--bg:#F6F3EC;--ink:#22271F;--ink2:#585E52;--border:#E4DED2}}*{{box-sizing:border-box}}
body{{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,sans-serif}}main{{max-width:1120px;margin:0 auto;padding:32px 20px 60px}}
h1{{font:700 2.5rem/1.1 Figtree,system-ui,sans-serif;letter-spacing:-.02em;margin:0 0 14px}}.lede{{display:grid;grid-template-columns:minmax(0,58%) 1fr;gap:24px;align-items:end}}
.lede p{{color:var(--ink2);font-size:1.125rem;margin:0 0 8px}}
.stage{{position:relative;height:300px}}.stage:before{{content:"";position:absolute;inset:0;background:url({sun_uri}) center bottom/100% auto no-repeat;-webkit-mask:radial-gradient(60% 95% at 50% 100%,#000 45%,transparent 100%);mask:radial-gradient(60% 95% at 50% 100%,#000 45%,transparent 100%)}}
.w{{position:absolute;inset:0;margin:0;display:flex;justify-content:center;align-items:flex-end;pointer-events:none}}
.w img{{position:absolute;bottom:0;height:280px;opacity:0;transition:opacity 140ms linear,transform 260ms cubic-bezier(.2,0,0,1)}}
.w.on .s{{opacity:1}}.w.out .o{{opacity:1;transform:translateX(26px)}}.w.in .n{{opacity:1;transform:translateX(-18px)}}
.notes{{margin-top:36px;padding-top:16px;border-top:2px solid var(--ink);color:var(--ink2);max-width:75ch}}.notes h2{{font:700 1.2rem Georgia,serif;color:var(--ink)}}
.sheet{{width:100%;border-radius:10px;border:1px solid var(--border);margin-top:10px}}
@media(max-width:1023px){{.lede{{grid-template-columns:1fr}}.stage{{height:220px}}.w img{{height:200px}}}}
@media(prefers-reduced-motion:reduce){{.w img{{transition:none}}}}</style>
<main><h1>Florida candidates, in their own words.</h1>
<div class="lede"><p>See the races we cover and what each candidate says, quoted word for word from their own campaign sites, with a link to every source. The same questions and the same rules for every candidate.</p>
<div class="stage" aria-hidden="true">{imgs}</div></div>
<div class="notes"><h2>How it runs</h2><p>Each walker holds for 2.4 s, then swaps in three beats: the leaving figure's forward streak (140 ms, nudged right), the arriving figure's trailing streak (140 ms, settling from the left), then the sharp figure. Only the walker changes; the sunburst stays still. With reduced motion on, the first walker stays put. Eight walkers: the phone reader, a nurse, a lineworker, a boat captain, a teacher, a student, a chef and a runner with a blade prosthetic.</p>
<p>Transition sheet (first four swaps):</p><img class="sheet" src="{uri(OUT / "transition-sheet.webp")}" alt="Walker frames: sharp, streaking out, streaking in, sharp"></div></main>
<script>
const ws=[...document.querySelectorAll('.w')];let i=0;const set=(w,c)=>{{w.className='w '+c}};set(ws[0],'on');
if(!matchMedia('(prefers-reduced-motion: reduce)').matches)setInterval(()=>{{const a=ws[i],b=ws[(i+1)%ws.length];set(a,'out');
setTimeout(()=>{{set(a,'');set(b,'in')}},140);setTimeout(()=>set(b,'on'),280);i=(i+1)%ws.length}},2800);
</script></html>'''
    (DOC / "hero-rotator.html").write_text(html)
    print("demo", len(html) // 1024, "KB")


if __name__ == "__main__":
    main()
