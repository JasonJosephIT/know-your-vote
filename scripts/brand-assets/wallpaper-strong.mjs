// Builds tex-florida-wallpaper-strong.webp: the Florida wallpaper with its
// motifs pushed K times further from the page background (founder, 2026-10-14:
// "more opaque"). The ground stays the page colour, so the tile still sits
// flush on `background`.
//   node scripts/brand-assets/wallpaper-strong.mjs
import sharp from "sharp";

const K = 2.2;
const BG = [0xf6, 0xf3, 0xec]; // --color-background
const dir = "public/brand/site/textures";
const { data, info } = await sharp(`${dir}/tex-florida-wallpaper.webp`)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
// The tile's own ground is its brightest common tone; motifs are departures.
const ground = [0, 1, 2].map((c) => {
  const hist = new Array(256).fill(0);
  for (let i = c; i < data.length; i += 3) hist[data[i]]++;
  return hist.indexOf(Math.max(...hist));
});
for (let i = 0; i < data.length; i++) {
  const c = i % 3;
  const v = BG[c] - K * (ground[c] - data[i]);
  data[i] = Math.max(0, Math.min(255, Math.round(v)));
}
await sharp(data, { raw: info }).webp({ quality: 82 }).toFile(`${dir}/tex-florida-wallpaper-strong.webp`);
console.log("ground", ground, "->", BG);
