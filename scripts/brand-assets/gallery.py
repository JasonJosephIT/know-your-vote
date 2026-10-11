"""Rebuild the self-contained review gallery: python3 scripts/brand-assets/gallery.py"""
import base64, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
A = {a["slug"]: a for a in json.loads((ROOT / "scripts/brand-assets/assets.json").read_text())["assets"]}
D, TEX = ROOT / "public/brand/site/illustrations", ROOT / "public/brand/site/textures"
kit = sorted(p.stem for p in D.glob("*.webp") if not p.stem.endswith("-sm"))
uri = lambda p, m: f"data:{m};base64," + base64.b64encode(p.read_bytes()).decode()
img = lambda k: uri(D / f"{k}-sm.webp", "image/webp")
strips = [k for k in kit if A[k]["kind"] in ("band", "scene")]
cut = [k for k in kit if k not in strips]
cards = "".join(f'<figure><div class="cut"><img src="{img(k)}" alt=""></div><figcaption><b>{k}</b>'
                f'{" · logo composited from SVG" if A[k].get("logo") else ""}<br>{A[k]["subject"].split(";")[0]}</figcaption></figure>' for k in cut)
green = "".join(f'<img src="{img(k)}" alt="">' for k in cut if k.startswith("sticker"))
wide = "".join(f'<figure class="wide"><img src="{img(k)}" alt=""><figcaption><b>{k}</b> · 21:9</figcaption></figure>' for k in strips)
tex = "".join(f'<figure><div class="tile" style="background-image:url({uri(p, "image/svg+xml" if p.suffix == ".svg" else "image/webp")});'
              f'{"color:#C1541C;" if p.name.startswith("divider") else ""}"></div><figcaption><b>{p.name}</b></figcaption></figure>'
              for p in sorted(TEX.iterdir()))
composed = "".join(f'<figure class="wide"><img src="{uri(ROOT / p, "image/png")}" alt=""><figcaption><b>{p.split("/")[-1]}</b></figcaption></figure>' for p in ("public/brand/site/og-card-walkers.png", "public/brand/email/reminder-hero-walkers.png"))
html = f'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KYV illustration kit</title>
<style>:root{{--bg:#F6F3EC;--ink:#22271F;--ink2:#585E52;--green:#2F6B4F;--border:#E4DED2;--cream:#F5EBD8}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,sans-serif}}main{{max-width:1200px;margin:0 auto;padding:28px 16px 60px}}
h1{{font:700 2rem/1.1 Georgia,serif;margin:0 0 6px}}h2{{font:700 1.3rem Georgia,serif;margin:36px 0 10px;padding-top:14px;border-top:2px solid var(--ink)}}p{{color:var(--ink2);max-width:75ch;margin:0 0 12px}}
.g{{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px}}figure{{margin:0}}.cut{{background:#fff;border:1px solid var(--border);border-radius:12px;aspect-ratio:1;display:grid;place-items:center;padding:14px}}.cut img{{max-width:100%;max-height:100%}}
figcaption{{font-size:12.5px;color:var(--ink2);margin-top:6px;line-height:1.35}}figcaption b{{color:var(--ink);font-family:ui-monospace,monospace;font-size:12px}}
.on-green{{background:var(--green);border-radius:12px;padding:18px;display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:center}}.on-green img{{height:110px}}
.wide img{{width:100%;border-radius:10px;display:block}}.tile{{height:120px;border:1px solid var(--border);border-radius:10px;background-repeat:repeat;background-color:var(--cream)}}
@media(max-width:640px){{.g[style]{{grid-template-columns:1fr!important}}}}</style>
<main><h1>KYV illustration kit</h1><p>Step 1 of the site illustration library (2026-10-11): the layout-independent pieces. Funk style, every colour snapped to design.md tokens, then the house grain (one medium-light grain, same speck size in every file). No text in any image. The KYV monogram on the badge and tote is the untouched SVG pasted in after generation, never drawn by the model.</p>
<h2>Stickers and people (transparent cut-outs)</h2><div class="g">{cards}</div>
<h2>Same stickers on KYV Green</h2><p>Checks the transparent edges against a dark field.</p><div class="on-green">{green}</div>
<h2>Wide strips</h2><div class="g" style="grid-template-columns:1fr 1fr">{wide}</div>
<h2>Share card and email hero (composed: real wordmark and text)</h2><div class="g" style="grid-template-columns:1fr 1fr">{composed}</div>
<h2>Textures and dividers (code-made)</h2><div class="g">{tex}</div></main></html>'''
(ROOT / "docs/design/brand-assets-2026-10-11/kit.html").write_text(html)
print(len(html) // 1024, "KB")
