import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";

/**
 * Colour drawings of the foods that have NO honest real photo on Unsplash or
 * Pexels (founder, 2026-10-08: "draw them and make it colourful and not
 * colourless or sketchy"). Each drawing shows the EXACT amount on the food's
 * card: three akara balls, twenty groundnuts, half a cob. They are plainly
 * drawings, never passed off as photos.
 *
 * Writes public/img/food-drawings/<id>.svg. Re-runnable. To check them, render
 * a sheet (see the commit that added this file) and count every item.
 *
 *   node scripts/food-drawings.mjs
 */
const OUT = "public/img/food-drawings";
mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------- helpers --
let gid = 0;
let defs = [];
function grad(light, mid, dark) {
  const id = `g${++gid}`;
  defs.push(
    `<radialGradient id="${id}" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="${light}"/><stop offset=".55" stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/></radialGradient>`,
  );
  return `url(#${id})`;
}
function lin(c1, c2, vertical = true) {
  const id = `l${++gid}`;
  defs.push(
    `<linearGradient id="${id}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`,
  );
  return `url(#${id})`;
}
// Deterministic random, so the drawings never change between runs.
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
/** n points inside an ellipse, spread so items do not pile on each other. */
function scatter(n, cx, cy, rx, ry, minD, seed = 7) {
  const r = rng(seed);
  const pts = [];
  let tries = 0;
  while (pts.length < n && tries < 20000) {
    tries++;
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    const x = cx + Math.cos(a) * rx * d;
    const y = cy + Math.sin(a) * ry * d;
    if (pts.every((p) => Math.hypot(p.x - x, p.y - y) >= minD)) pts.push({ x, y, rot: r() * 180 - 90, k: r() });
  }
  if (pts.length < n) throw new Error(`scatter: only placed ${pts.length}/${n}`);
  return pts;
}
const shadow = (cx, cy, rx, ry, o = 0.18) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#3b2a1a" opacity="${o}" filter="url(#blur)"/>`;
function plate(cx = 120, cy = 132, rx = 100, ry = 78) {
  return (
    shadow(cx, cy + 8, rx * 0.98, ry * 0.95, 0.2) +
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${lin("#ffffff", "#e7ecf2")}"/>` +
    `<ellipse cx="${cx}" cy="${cy + 2}" rx="${rx * 0.78}" ry="${ry * 0.76}" fill="${lin("#f3f6f9", "#ffffff")}" stroke="#dfe5ec" stroke-width="1.5"/>`
  );
}
function board() {
  return (
    shadow(120, 150, 104, 60, 0.2) +
    `<rect x="18" y="70" width="204" height="130" rx="22" fill="${lin("#c98f55", "#a86d38")}"/>` +
    [92, 120, 148, 176].map((y) => `<path d="M30 ${y} Q120 ${y - 6} 210 ${y}" stroke="#b27a43" stroke-width="2" fill="none" opacity=".5"/>`).join("")
  );
}
const ball = (x, y, r, fill, extra = "") =>
  shadow(x + r * 0.15, y + r * 0.85, r * 0.95, r * 0.35) + `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${extra}/>`;
const oval = (x, y, rx, ry, rot, fill, extra = "") =>
  shadow(x + 2, y + ry * 0.8, rx * 0.95, Math.max(3, ry * 0.4)) +
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${x} ${y})" fill="${fill}" ${extra}/>`;
const rrect = (x, y, w, h, r, rot, fill, extra = "") =>
  shadow(x + w / 2 + 2, y + h, w * 0.5, Math.max(3, h * 0.18)) +
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" transform="rotate(${rot} ${x + w / 2} ${y + h / 2})" fill="${fill}" ${extra}/>`;
const specks = (cx, cy, rx, ry, n, color, seed, size = 1.4) => {
  const r = rng(seed);
  let s = "";
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r());
    s += `<circle cx="${(cx + Math.cos(a) * rx * d).toFixed(1)}" cy="${(cy + Math.sin(a) * ry * d).toFixed(1)}" r="${(size * (0.6 + r())).toFixed(1)}" fill="${color}"/>`;
  }
  return s;
};
function leaf(x, y, len, w, rot, fill, vein = "#ffffff55") {
  return (
    `<g transform="rotate(${rot} ${x} ${y})">` +
    `<path d="M${x} ${y} C${x + len * 0.3} ${y - w} ${x + len * 0.75} ${y - w} ${x + len} ${y} C${x + len * 0.75} ${y + w} ${x + len * 0.3} ${y + w} ${x} ${y}Z" fill="${fill}"/>` +
    `<path d="M${x + 2} ${y} L${x + len - 3} ${y}" stroke="${vein}" stroke-width="1.4"/>` +
    [0.3, 0.5, 0.7].map((t) => `<path d="M${x + len * t} ${y} L${x + len * (t + 0.12)} ${y - w * 0.55} M${x + len * t} ${y} L${x + len * (t + 0.12)} ${y + w * 0.55}" stroke="${vein}" stroke-width="1"/>`).join("") +
    `</g>`
  );
}
function glass(fill, { x = 120, top = 60, w = 70, h = 120 } = {}) {
  const l = x - w / 2, r = x + w / 2, b = top + h;
  return (
    shadow(x, b + 4, w * 0.55, 8, 0.22) +
    `<path d="M${l} ${top} L${l + 7} ${b} Q${x} ${b + 8} ${r - 7} ${b} L${r} ${top} Z" fill="#ffffff" opacity=".55" stroke="#c9d6e2" stroke-width="2"/>` +
    `<path d="M${l + 3} ${top + 22} L${l + 9} ${b - 2} Q${x} ${b + 5} ${r - 9} ${b - 2} L${r - 3} ${top + 22} Z" fill="${fill}"/>` +
    `<ellipse cx="${x}" cy="${top + 22}" rx="${w / 2 - 3}" ry="5" fill="#ffffff" opacity=".35"/>` +
    `<path d="M${l + 9} ${top + 8} L${l + 14} ${b - 10}" stroke="#ffffff" stroke-width="4" opacity=".55" stroke-linecap="round"/>`
  );
}
function svg(body, bg = "#FFF6E8") {
  const out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="14 34 212 212"><defs><filter id="blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>${defs.join("")}</defs><rect width="240" height="240" fill="${bg}"/>${body}</svg>`;
  defs = [];
  return out;
}

// --------------------------------------------------------------- recipes --
const fried = () => grad("#f7c873", "#d88a2c", "#9a5418");
const D = {};

D["roasted-yam"] = () =>
  board() +
  [[52, 104, -8], [128, 112, 10]]
    .map(([x, y, r]) =>
      rrect(x, y, 64, 40, 7, r, grad("#fff3cf", "#f2d58e", "#b98a3c"), `stroke="#6b3d16" stroke-width="5"`) +
      `<path d="M${x + 10} ${y + 12} l40 0 M${x + 8} ${y + 24} l44 0" stroke="#5a3210" stroke-width="3" opacity=".55" transform="rotate(${r} ${x + 32} ${y + 20})"/>`,
    )
    .join("");
D["boiled-water-yam"] = () =>
  plate() +
  [[60, 108, -10], [126, 118, 8]]
    .map(([x, y, r]) => rrect(x, y, 62, 40, 9, r, grad("#ffffff", "#efe2f2", "#c4a7cf"), `stroke="#a98bb8" stroke-width="2"`))
    .join("");
D["boiled-plantain-ripe"] = () =>
  plate() + [[84, 132, -20], [158, 126, 15]].map(([x, y, r]) => oval(x, y, 32, 21, r, grad("#ffe9a3", "#f7c247", "#d79a1c"), `stroke="#c78a1a" stroke-width="3"`)).join("");
D.dodo = () =>
  plate() + [[78, 132, -25], [122, 120, 5], [164, 136, 30]].map(([x, y, r]) => oval(x, y, 28, 17, r, grad("#ffcf6a", "#e3842a", "#8c3d0e"), `stroke="#7a3410" stroke-width="2.5"`)).join("");
D.suya = () =>
  plate() +
  `<path d="M34 176 L206 84" stroke="#c9a46b" stroke-width="5" stroke-linecap="round"/>` +
  [0, 1, 2, 3, 4, 5]
    .map((i) => {
      const x = 58 + i * 24, y = 163 - i * 12.8;
      return rrect(x - 13, y - 9, 26, 18, 6, -28, grad("#c0583a", "#8a2e18", "#4e170b")) + specks(x, y, 10, 6, 7, "#e8b04a", 10 + i, 1.2);
    })
    .join("") +
  [[70, 104], [96, 92]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="13" ry="8" fill="none" stroke="#e9d6f0" stroke-width="3"/>`).join("");
D.kilishi = () =>
  board() +
  [[40, 96, -6], [96, 120, 8], [140, 92, -12]]
    .map(([x, y, r]) =>
      `<g transform="rotate(${r} ${x + 30} ${y + 25})">${shadow(x + 32, y + 50, 30, 5)}<path d="M${x} ${y + 6} Q${x + 30} ${y - 6} ${x + 62} ${y + 4} L${x + 58} ${y + 46} Q${x + 30} ${y + 54} ${x + 4} ${y + 44} Z" fill="${grad("#c26a3f", "#8f3c1c", "#5a2310")}"/>${specks(x + 31, y + 25, 25, 16, 22, "#e8b04a", r + 50, 1.1)}</g>`,
    )
    .join("");
D.boli = () =>
  board() +
  shadow(124, 168, 78, 10) +
  `<path d="M44 150 Q60 96 130 92 Q178 90 200 120 L196 150 Q150 136 104 148 Q70 158 44 150Z" fill="${grad("#ffd36b", "#e0a43a", "#a5641f")}"/>` +
  `<ellipse cx="198" cy="135" rx="9" ry="16" fill="#fff0b8" stroke="#c88b2a" stroke-width="2"/>` +
  [70, 98, 126, 154].map((x) => `<path d="M${x} 112 l14 30" stroke="#5c3412" stroke-width="5" opacity=".55" stroke-linecap="round"/>`).join("") +
  specks(120, 120, 60, 16, 26, "#4a2a10", 33, 1.6);
D["chin-chin"] = () =>
  plate() + scatter(10, 120, 130, 62, 44, 25, 3).map((p) => rrect(p.x - 10, p.y - 9, 20, 18, 4, p.rot, fried())).join("");
D.doughnut = () =>
  plate() +
  shadow(120, 162, 64, 9) +
  `<path d="M50 140 A70 52 0 0 1 190 140 L158 140 A38 26 0 0 0 82 140 Z" fill="${grad("#f9cf86", "#dc9244", "#9a561d")}"/>` +
  `<path d="M50 140 L82 140 M158 140 L190 140" stroke="#fff3d6" stroke-width="10" stroke-linecap="round"/>` +
  specks(120, 112, 60, 24, 40, "#ffffff", 21, 1.3);
D.cake = () =>
  plate() +
  shadow(124, 160, 66, 8) +
  `<path d="M60 150 L190 118 L190 136 L60 168 Z" fill="${grad("#fff1b8", "#f3d16b", "#d6a93a")}"/>` +
  `<path d="M60 150 L190 118 L180 112 L54 144 Z" fill="#b8742c"/>` +
  `<path d="M190 118 L190 136 L180 130 L180 112 Z" fill="#9c5f22"/>` +
  specks(122, 141, 58, 6, 18, "#e9bc55", 9, 1);
D.akara = () =>
  plate() + [[88, 136], [150, 130], [118, 100]].map(([x, y], i) => ball(x, y, 27, fried()) + specks(x, y, 20, 20, 26, "#8a4a15", 40 + i, 1.5)).join("");
D["boiled-corn"] = () => cob(false);
D["roasted-corn"] = () => cob(true);
function cob(roasted) {
  let s = plate() + shadow(122, 162, 78, 10);
  s += `<path d="M50 120 Q52 100 76 98 L186 108 Q198 124 186 146 L76 154 Q52 150 50 120Z" fill="${grad("#fff1a0", "#f4cc3a", "#c89a12")}"/>`;
  for (let row = 0; row < 5; row++)
    for (let c = 0; c < 10; c++) {
      const x = 74 + c * 11, y = 108 + row * 9 + Math.sin(c) * 0.6;
      s += `<ellipse cx="${x}" cy="${y}" rx="4.6" ry="3.8" fill="${roasted && (c * 7 + row * 3) % 5 === 0 ? "#5a3a14" : "#ffe36b"}" stroke="#d8a91a" stroke-width=".8"/>`;
    }
  s += `<ellipse cx="186" cy="127" rx="8" ry="20" fill="#fff6c8" stroke="#d1a52a" stroke-width="2"/><circle cx="186" cy="127" r="4" fill="#f0d27a"/>`;
  return s;
}
D.snail = () =>
  plate() +
  [[84, 134], [150, 132], [118, 100]]
    .map(([x, y], i) =>
      `${shadow(x, y + 20, 26, 6)}<path d="M${x - 24} ${y + 10} Q${x - 26} ${y - 22} ${x} ${y - 20} Q${x + 26} ${y - 18} ${x + 22} ${y + 8} Q${x + 6} ${y + 20} ${x - 24} ${y + 10}Z" fill="${grad("#9b5a3a", "#6b3420", "#3c1a0e")}"/>` +
      `<path d="M${x - 10} ${y} q10 -14 18 0 q-6 8 -12 2" stroke="#c98a5f" stroke-width="2.5" fill="none"/>` +
      specks(x, y, 18, 10, 10, "#d8311f", 60 + i, 2),
    )
    .join("");
D["prawns-crayfish"] = () =>
  plate() +
  scatter(10, 120, 130, 66, 46, 30, 11)
    .map((p) => `<g transform="rotate(${p.rot} ${p.x} ${p.y})">${shadow(p.x, p.y + 8, 12, 3)}<path d="M${p.x - 12} ${p.y + 4} Q${p.x - 14} ${p.y - 12} ${p.x + 2} ${p.y - 12} Q${p.x + 14} ${p.y - 10} ${p.x + 12} ${p.y + 2} Q${p.x + 4} ${p.y - 2} ${p.x - 4} ${p.y + 6} Z" fill="${grad("#ffb48a", "#f2743c", "#b8401a")}"/><path d="M${p.x - 6} ${p.y - 9} q2 6 0 12 M${p.x + 1} ${p.y - 11} q2 6 0 10" stroke="#fff1e6" stroke-width="1.2" fill="none"/></g>`)
    .join("");
function leafPile(color, seed, n = 14, len = 60, w = 20) {
  const r = rng(seed);
  let s = shadow(120, 168, 80, 12);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 360 + r() * 18;
    const L = len * (0.75 + r() * 0.3);
    s += leaf(120 + Math.cos((a * Math.PI) / 180) * 6, 130 + Math.sin((a * Math.PI) / 180) * 4, L, w * (0.8 + r() * 0.4), a, grad(color[0], color[1], color[2]));
  }
  return s;
}
D.ugu = () => board() + leafPile(["#7fcf6a", "#2f8a2f", "#155a1c"], 4, 12, 66, 24);
D.waterleaf = () => board() + leafPile(["#c4f09e", "#62c24c", "#2c7a24"], 5, 12, 46, 20);
D["scent-leaf"] = () => board() + leafPile(["#9be27c", "#3f9e35", "#1d6420"], 8, 11, 48, 22);
D["bitterleaf-veg"] = () => board() + leafPile(["#6fba5c", "#25722a", "#0f4a16"], 12, 13, 70, 16);
D.soko = () => board() + leafPile(["#a6e08b", "#4fa83e", "#22672a"], 15, 13, 52, 18);
D.agbalumo = () =>
  plate() + ball(120, 124, 44, grad("#ffc178", "#f07a22", "#a8420c")) + `<path d="M120 84 l-6 -10 m6 10 l7 -10" stroke="#5a3b17" stroke-width="3"/><path d="M106 98 q14 -8 28 0" stroke="#ffe2b8" stroke-width="3" fill="none" opacity=".7"/>`;
D.groundnut = () =>
  plate() + scatter(20, 120, 130, 80, 56, 24, 21).map((p) => oval(p.x, p.y, 11, 8, p.rot, grad("#f6dcae", "#d9a866", "#a26f33"))).join("");
D["cashew-nut"] = () =>
  plate() +
  scatter(15, 120, 130, 80, 56, 29, 22)
    .map((p) => `<g transform="rotate(${p.rot} ${p.x} ${p.y}) translate(${p.x} ${p.y}) scale(1.35) translate(${-p.x} ${-p.y})">${shadow(p.x, p.y + 6, 10, 3)}<path d="M${p.x - 11} ${p.y - 4} Q${p.x - 6} ${p.y - 12} ${p.x + 2} ${p.y - 9} Q${p.x + 12} ${p.y - 4} ${p.x + 10} ${p.y + 6} Q${p.x + 4} ${p.y + 3} ${p.x - 2} ${p.y + 2} Q${p.x - 9} ${p.y + 4} ${p.x - 11} ${p.y - 4}Z" fill="${grad("#fff6df", "#f0d9a5", "#c9a464")}"/></g>`)
    .join("");
D["tiger-nut"] = () =>
  plate() + scatter(20, 120, 130, 80, 56, 24, 23).map((p, i) => oval(p.x, p.y, 10.5, 8.5, p.rot, grad("#d9a86a", "#9c6430", "#5c3412")) + `<path d="M${p.x - 6} ${p.y - 1} q6 -3 12 0 M${p.x - 5} ${p.y + 3} q5 -2 10 0" stroke="#4a2a10" stroke-width=".9" fill="none" opacity=".6"/>`).join("");
D.walnut = () =>
  plate() +
  scatter(7, 120, 128, 74, 48, 34, 24)
    .map((p) => ball(p.x, p.y, 17, grad("#e6bf8a", "#b9844a", "#7a4f22")) + `<path d="M${p.x} ${p.y - 16} Q${p.x - 4} ${p.y} ${p.x} ${p.y + 16} M${p.x - 10} ${p.y - 8} q4 6 0 12 M${p.x + 9} ${p.y - 8} q-4 6 0 12" stroke="#6d4421" stroke-width="1.6" fill="none"/>`)
    .join("");
D["mixed-nuts"] = () => {
  const pts = scatter(10, 120, 130, 76, 52, 34, 25);
  return (
    plate() +
    pts
      .map((p, i) =>
        i < 3
          ? oval(p.x, p.y, 15, 9, p.rot, grad("#d79a62", "#a8642c", "#6b3c16"))
          : i < 6
            ? `<g transform="rotate(${p.rot} ${p.x} ${p.y})">${shadow(p.x, p.y + 6, 10, 3)}<path d="M${p.x - 11} ${p.y - 4} Q${p.x - 6} ${p.y - 12} ${p.x + 2} ${p.y - 9} Q${p.x + 12} ${p.y - 4} ${p.x + 10} ${p.y + 6} Q${p.x + 4} ${p.y + 3} ${p.x - 2} ${p.y + 2} Q${p.x - 9} ${p.y + 4} ${p.x - 11} ${p.y - 4}Z" fill="${grad("#fff6df", "#f0d9a5", "#c9a464")}"/></g>`
            : i < 8
              ? ball(p.x, p.y, 13, grad("#e9c690", "#c08a4c", "#7f5524"))
              : ball(p.x, p.y, 12, grad("#d4a274", "#9a5f30", "#5e3417")),
      )
      .join("")
  );
};
function drink(fill, extra = "") {
  return glass(fill) + extra;
}
D["malt-drink"] = () =>
  shadow(78, 196, 24, 6, 0.22) +
  `<path d="M64 88 L64 66 Q64 56 72 54 L72 44 L84 44 L84 54 Q92 56 92 66 L92 88 Q96 96 96 108 L96 200 Q96 206 90 206 L66 206 Q60 206 60 200 L60 108 Q60 96 64 88Z" fill="${lin("#3a1a0c", "#1c0b04", false)}"/>` +
  `<rect x="70" y="44" width="16" height="8" rx="2" fill="#c9a43a"/><path d="M68 112 L68 194" stroke="#ffffff" stroke-width="4" opacity=".25"/>` +
  glass(grad("#7a3c18", "#4a200a", "#2a1004"), { x: 162, top: 86, w: 64, h: 106 });
D["energy-drink"] = () =>
  shadow(120, 200, 40, 7, 0.22) +
  `<rect x="82" y="42" width="76" height="156" rx="10" fill="${lin("#2bd35e", "#0b7a34", false)}"/>` +
  `<rect x="82" y="42" width="76" height="14" rx="6" fill="${lin("#e9eef2", "#9aa6b0", false)}"/><rect x="82" y="186" width="76" height="12" rx="5" fill="${lin("#e9eef2", "#9aa6b0", false)}"/>` +
  `<path d="M98 66 L98 176" stroke="#ffffff" stroke-width="6" opacity=".3" stroke-linecap="round"/><path d="M128 90 l-14 30 h14 l-10 30" stroke="#d6ff3d" stroke-width="7" fill="none" stroke-linejoin="round"/>`;
D["condensed-milk"] = () =>
  shadow(92, 192, 44, 7, 0.22) +
  `<rect x="48" y="96" width="88" height="96" rx="8" fill="${lin("#f2f5f8", "#b9c3cc", false)}"/>` +
  `<rect x="48" y="118" width="88" height="52" fill="${lin("#2f6fd0", "#1a4fa0", false)}"/><ellipse cx="92" cy="96" rx="44" ry="10" fill="#dfe6ec"/><ellipse cx="92" cy="96" rx="38" ry="7" fill="#fff8e6"/>` +
  shadow(178, 184, 34, 6) +
  `<path d="M150 170 Q178 150 214 162" stroke="#c7ced6" stroke-width="7" stroke-linecap="round" fill="none"/><ellipse cx="160" cy="166" rx="22" ry="13" fill="#c7ced6"/><ellipse cx="160" cy="164" rx="18" ry="9" fill="#fff4d9"/>`;
D.masa = () =>
  plate() + [[88, 130], [152, 128]].map(([x, y], i) => ball(x, y, 30, grad("#ffe3a1", "#f0b85a", "#b97a26")) + specks(x, y, 22, 22, 22, "#c98a35", 70 + i, 1.6)).join("");
D["kuli-kuli"] = () =>
  board() +
  [[54, 112, -6], [64, 146, 4]]
    .map(([x, y, r]) => `<g transform="rotate(${r} ${x + 60} ${y})">${shadow(x + 60, y + 12, 60, 5)}<rect x="${x}" y="${y - 9}" width="122" height="18" rx="9" fill="${grad("#c98a4a", "#8f5422", "#5a3010")}"/>${[0, 1, 2, 3, 4, 5, 6].map((k) => `<path d="M${x + 12 + k * 16} ${y - 8} l6 16" stroke="#5a3010" stroke-width="2" opacity=".6"/>`).join("")}</g>`)
    .join("");
D.ojojo = () =>
  plate() +
  [[86, 134, 0], [152, 130, 1], [118, 98, 2]]
    .map(([x, y, i]) => `${shadow(x, y + 20, 26, 6)}<path d="M${x - 26} ${y + 4} Q${x - 30} ${y - 20} ${x - 6} ${y - 22} Q${x + 18} ${y - 26} ${x + 26} ${y - 4} Q${x + 30} ${y + 18} ${x + 4} ${y + 20} Q${x - 20} ${y + 24} ${x - 26} ${y + 4}Z" fill="${grad("#e8c070", "#b8822e", "#7a4a14")}"/>${specks(x, y, 20, 14, 16, "#f6e4b0", 80 + i, 1.4)}`)
    .join("");
D["eko-agidi"] = () =>
  plate() +
  shadow(122, 168, 68, 9) +
  `<path d="M58 150 Q54 98 92 92 L156 92 Q190 98 186 150 Q122 170 58 150Z" fill="${grad("#7fcf6a", "#3d8f32", "#1f5a1e")}"/>` +
  `<path d="M86 100 L160 100 Q170 128 158 146 L88 146 Q76 128 86 100Z" fill="${grad("#ffffff", "#f4f1e4", "#d9d3b8")}"/>` +
  `<path d="M70 104 L176 104" stroke="#ffffff55" stroke-width="2"/>`;
D.periwinkle = () =>
  plate() +
  scatter(15, 120, 130, 80, 56, 27, 26)
    .map((p) => `<g transform="rotate(${p.rot} ${p.x} ${p.y})">${shadow(p.x, p.y + 9, 9, 3)}<path d="M${p.x - 8} ${p.y + 8} Q${p.x - 6} ${p.y - 4} ${p.x} ${p.y - 16} Q${p.x + 6} ${p.y - 4} ${p.x + 8} ${p.y + 8} Q${p.x} ${p.y + 12} ${p.x - 8} ${p.y + 8}Z" fill="${grad("#7d7258", "#3e3628", "#16130d")}"/><path d="M${p.x - 7} ${p.y + 3} Q${p.x} ${p.y + 6} ${p.x + 7} ${p.y + 1} M${p.x - 5} ${p.y - 3} Q${p.x} ${p.y} ${p.x + 5} ${p.y - 5} M${p.x - 3} ${p.y - 9} Q${p.x} ${p.y - 7} ${p.x + 3} ${p.y - 10}" stroke="#c9b98f" stroke-width="1.3" fill="none"/><ellipse cx="${p.x}" cy="${p.y + 8}" rx="4" ry="2.4" fill="#d8cdb0"/></g>`)
    .join("");
D.ube = () =>
  plate() +
  [[92, 128, -20], [150, 124, 15]].map(([x, y, r]) => oval(x, y, 30, 19, r, grad("#8f86d6", "#4a3c9a", "#24194f")) + `<ellipse cx="${x - 8}" cy="${y - 7}" rx="9" ry="4" fill="#ffffff" opacity=".35" transform="rotate(${r} ${x} ${y})"/>`).join("");
D.sugarcane = () =>
  board() +
  shadow(122, 150, 62, 7) +
  `<rect x="62" y="114" width="120" height="30" rx="6" fill="${lin("#fff7d4", "#e9d79a")}"/>` +
  [62, 102, 142].map((x) => `<rect x="${x}" y="112" width="8" height="34" rx="3" fill="#a3b84a"/>`).join("") +
  [74, 90, 116, 132, 156, 168].map((x) => `<path d="M${x} 118 l0 22" stroke="#d9c37a" stroke-width="1.5"/>`).join("") +
  `<rect x="174" y="112" width="12" height="34" rx="4" fill="${lin("#7b3f8a", "#4f2459")}"/>`;
D["velvet-tamarind"] = () =>
  plate() + scatter(10, 120, 130, 62, 44, 30, 27).map((p) => oval(p.x, p.y, 13, 10, p.rot, grad("#4a4440", "#1f1b19", "#060505")) + `<ellipse cx="${p.x - 4}" cy="${p.y - 4}" rx="4" ry="2" fill="#ffffff" opacity=".2"/>`).join("");
D["bitter-kola"] = () =>
  plate() + oval(120, 126, 40, 24, -12, grad("#d7a26a", "#9a5d2c", "#5b3112")) + `<path d="M88 132 Q120 112 152 120" stroke="#5b3112" stroke-width="2" fill="none" opacity=".6"/>`;
D["kola-nut"] = () =>
  plate() + `${shadow(122, 150, 40, 8)}<path d="M84 128 Q86 92 124 90 Q160 92 160 124 Q152 150 120 152 Q90 150 84 128Z" fill="${grad("#f7a6a6", "#d2495a", "#8c1d2e")}"/><path d="M96 126 Q120 110 148 120" stroke="#ffd2d6" stroke-width="2" fill="none" opacity=".7"/>`;
D.grapes = () => {
  const pts = [];
  const rows = [5, 4, 3, 2, 1];
  rows.forEach((n, ri) => {
    for (let k = 0; k < n; k++) pts.push({ x: 120 + (k - (n - 1) / 2) * 22, y: 84 + ri * 20 });
  });
  return plate() + `<path d="M120 60 L120 80" stroke="#6b8a2a" stroke-width="4" stroke-linecap="round"/>` + pts.map((p) => ball(p.x, p.y, 11, grad("#c9a0e8", "#7b3fb0", "#3e1660"))).join("");
};
D["scrambled-egg"] = () =>
  plate() +
  shadow(122, 162, 62, 9) +
  `<path d="M64 132 Q60 104 90 102 Q104 86 126 96 Q154 88 168 108 Q190 118 178 140 Q170 162 140 158 Q118 170 96 158 Q66 156 64 132Z" fill="${grad("#fff6b3", "#f7d64a", "#d7a81a")}"/>` +
  specks(122, 130, 46, 22, 10, "#e0321f", 91, 3) +
  specks(122, 130, 46, 22, 8, "#3fa03a", 92, 2.6) +
  specks(122, 130, 46, 22, 8, "#f3e6f7", 93, 2.4);
D["egg-sauce"] = () =>
  plate() +
  shadow(122, 162, 66, 9) +
  `<path d="M60 134 Q58 100 92 98 Q120 84 150 98 Q184 104 182 136 Q176 164 142 162 Q118 172 92 162 Q62 160 60 134Z" fill="${grad("#ff8a5c", "#e0451f", "#a32a10")}"/>` +
  scatter(7, 122, 130, 40, 20, 18, 94).map((p) => oval(p.x, p.y, 10, 7, p.rot, grad("#fff7b8", "#f5d544", "#d3a516"))).join("") +
  specks(122, 130, 46, 22, 8, "#3fa03a", 95, 2.4);
D["egg-roll"] = () =>
  plate() + oval(120, 128, 42, 32, -10, grad("#f9cf86", "#d98a3a", "#94501a")) + specks(120, 128, 30, 22, 30, "#a8601f", 96, 1.5);
D.sardine = () =>
  shadow(120, 178, 86, 10) +
  `<rect x="34" y="78" width="172" height="100" rx="26" fill="${lin("#e6ebef", "#a8b3bd")}"/><rect x="44" y="88" width="152" height="80" rx="20" fill="#d4a24a"/>` +
  `<rect x="120" y="88" width="76" height="80" fill="#c9cfd5"/><path d="M120 88 L120 168" stroke="#9aa5ae" stroke-width="2"/>` +
  [104, 136]
    .map((y) => `<path d="M50 ${y} Q80 ${y - 12} 116 ${y - 2} L116 ${y + 8} Q80 ${y + 14} 50 ${y + 6} Z" fill="${lin("#d6dde3", "#8e9aa4")}"/><path d="M60 ${y + 1} l50 0" stroke="#6c7680" stroke-width="1.5"/>`)
    .join("");
D["monkey-kola"] = () =>
  plate() + [[92, 128, -15], [150, 124, 10]].map(([x, y, r]) => oval(x, y, 26, 21, r, grad("#ffd27a", "#e89a2c", "#a85b0e"))).join("");
D.weetabix = () =>
  shadow(120, 186, 88, 10) +
  `<path d="M28 112 Q120 220 212 112 Z" fill="${lin("#ffffff", "#dfe7ef")}"/><ellipse cx="120" cy="112" rx="92" ry="22" fill="#f8fbff" stroke="#d6dee7" stroke-width="2"/>` +
  `<ellipse cx="120" cy="114" rx="80" ry="16" fill="#fffdf6"/>` +
  [[72, 98, -6], [130, 102, 8]]
    .map(([x, y, r]) => rrect(x, y, 52, 24, 8, r, grad("#f0c27a", "#c98a3c", "#8a5518")) + `<path d="M${x + 6} ${y + 8} l40 0 M${x + 6} ${y + 15} l40 0" stroke="#8a5518" stroke-width="1.4" transform="rotate(${r} ${x + 26} ${y + 12})"/>`)
    .join("");
D["coconut-bread"] = () =>
  plate() +
  shadow(122, 168, 58, 9) +
  `<path d="M74 168 L74 102 Q74 70 120 68 Q166 70 166 102 L166 168 Z" fill="#b8742c"/><path d="M82 162 L82 104 Q82 80 120 78 Q158 80 158 104 L158 162 Z" fill="${grad("#fffaf0", "#fbefd2", "#eedcae")}"/>` +
  specks(120, 120, 30, 34, 20, "#ffffff", 97, 1.6);
D.samosa = () =>
  plate() + shadow(122, 162, 52, 8) + `<path d="M70 156 L120 82 L172 156 Q120 166 70 156Z" fill="${grad("#f9d58e", "#dc9a3e", "#9a5a1a")}" stroke="#b8732a" stroke-width="3" stroke-linejoin="round"/>` + specks(120, 132, 30, 18, 16, "#b8732a", 98, 1.2);
D["spring-roll"] = () =>
  plate() + rrect(56, 112, 128, 34, 17, -10, grad("#f6cf86", "#d68b36", "#91501a")) + specks(120, 128, 54, 10, 26, "#a8601f", 99, 1.3);
D["fish-roll"] = () =>
  plate() + rrect(60, 110, 120, 38, 19, 8, grad("#f0c070", "#c97f2c", "#874612")) + `<ellipse cx="62" cy="122" rx="8" ry="16" fill="#f7e2b0" transform="rotate(8 120 129)"/>` + specks(120, 128, 50, 12, 18, "#9a5a1a", 100, 1.2);
D["small-chops"] = () =>
  plate() +
  ball(84, 104, 20, fried()) +
  `<path d="M140 118 L168 76 L194 118 Q168 124 140 118Z" fill="${grad("#f9d58e", "#dc9a3e", "#9a5a1a")}"/>` +
  rrect(56, 140, 70, 22, 11, -6, grad("#f6cf86", "#d68b36", "#91501a")) +
  `${shadow(162, 168, 22, 5)}<path d="M138 158 Q140 128 164 130 Q190 134 186 158 Q164 172 138 158Z" fill="${grad("#d98a4a", "#a8501e", "#6a2c0c")}"/>`;
D.kokoro = () =>
  board() + [0, 1, 2, 3].map((i) => rrect(46 + i * 6, 92 + i * 22, 140, 12, 6, -8 + i * 4, grad("#f6d48a", "#d79a3c", "#9a5c1c"))).join("");
D.robo = () => plate() + [[88, 136], [150, 132], [118, 100]].map(([x, y], i) => ball(x, y, 24, grad("#a8683a", "#6a3618", "#3a1a08")) + specks(x, y, 18, 18, 18, "#d9a46a", 110 + i, 1.3)).join("");
D["coconut-candy"] = () => plate() + rrect(84, 100, 72, 48, 12, -6, grad("#d9964e", "#a8602a", "#6a3810")) + specks(120, 124, 30, 20, 40, "#fff6e0", 120, 1.4);
D["cassava-chips"] = () =>
  plate() + scatter(15, 120, 130, 80, 56, 29, 28).map((p) => oval(p.x, p.y, 15, 11, p.rot, grad("#fffdf2", "#f2e7c6", "#d6c493"), `stroke="#cdb67a" stroke-width="1"`)).join("");
D["seasoning-cube"] = () =>
  board() + rrect(92, 100, 56, 56, 8, -8, grad("#fff2a8", "#e5b62a", "#9a7410")) + `<path d="M98 112 L144 104 M100 128 L146 120 M102 144 L148 136" stroke="#9a7410" stroke-width="2" opacity=".55"/>`;
D.pancakes = () => plate() + [[90, 132], [152, 124]].map(([x, y]) => oval(x, y, 34, 24, 0, grad("#ffe0a0", "#e8a54a", "#a8661c"), `stroke="#b8752a" stroke-width="2"`)).join("");
D.beetroot = () =>
  plate() + [[92, 130], [150, 124]].map(([x, y]) => ball(x, y, 28, grad("#e05aa0", "#a2185e", "#5a0a32")) + [20, 13, 6].map((r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#f08fc2" stroke-width="1.5" opacity=".7"/>`).join("")).join("");
D.sweetsop = () =>
  plate() +
  `${shadow(122, 160, 48, 8)}<path d="M76 128 A46 40 0 0 1 168 128 Z" fill="${grad("#b6e39a", "#6fae4a", "#3f7a28")}"/>` +
  `<path d="M84 128 A38 30 0 0 1 160 128 Z" fill="${grad("#ffffff", "#f7f3ea", "#ddd3bd")}"/>` +
  [96, 110, 124, 138, 152].map((x) => `<ellipse cx="${x}" cy="118" rx="5" ry="7" fill="#3a2a1c"/>`).join("") +
  `<path d="M76 128 L168 128" stroke="#3f7a28" stroke-width="3"/>`;
D["hog-plum"] = () => plate() + oval(120, 126, 32, 24, -10, grad("#fff2a0", "#f2c22a", "#b88a0e")) + `<path d="M120 102 l2 -12" stroke="#6b5a1a" stroke-width="3"/>`;
D.bacon = () =>
  plate() +
  [100, 150]
    .map((y, i) => `${shadow(122, y + 14, 70, 5)}<path d="M50 ${y} Q80 ${y - 14} 110 ${y} T170 ${y} T196 ${y - 6} L196 ${y + 12} Q170 ${y + 18} 140 ${y + 6} T80 ${y + 10} T50 ${y + 16} Z" fill="${lin("#d4553a", "#8a2a18", false)}"/><path d="M56 ${y + 7} Q86 ${y - 6} 116 ${y + 7} T190 ${y + 2}" stroke="#ffd9c4" stroke-width="3" fill="none" opacity=".75"/>`)
    .join("");
D["sugarcane-juice"] = () => glass(grad("#f4f7b0", "#cfe06a", "#92aa2a"));
D.baguette = () =>
  board() + `${shadow(122, 152, 52, 7)}<path d="M74 128 Q74 104 100 102 L160 102 Q172 104 172 128 Q172 150 160 152 L100 152 Q74 150 74 128Z" fill="${grad("#f7c672", "#d6892e", "#91501a")}"/><ellipse cx="166" cy="127" rx="10" ry="24" fill="#fbf0d4" stroke="#c98a3c" stroke-width="3"/>` + [96, 120, 144].map((x) => `<path d="M${x} 108 q10 18 22 0" stroke="#fff2c8" stroke-width="3" fill="none" opacity=".8"/>`).join("");
D["cow-leg"] = () => plate() + ball(120, 126, 40, grad("#fff1d6", "#e9c99a", "#b88f58")) + `<circle cx="120" cy="126" r="16" fill="#fffaf0" stroke="#d9c4a0" stroke-width="4"/><circle cx="120" cy="126" r="7" fill="#e7d6b6"/>`;
D["cow-tail"] = () => plate() + ball(120, 126, 38, grad("#b46a46", "#7a3a20", "#45190a")) + `<circle cx="120" cy="126" r="14" fill="#fff6e6" stroke="#e8cfa6" stroke-width="3"/>`;
D.celery = () =>
  board() + `${shadow(122, 150, 70, 6)}<path d="M44 140 Q120 124 196 116 L198 132 Q120 140 46 154 Z" fill="${lin("#c8ef9a", "#6fb440")}"/><path d="M50 146 Q120 132 194 124" stroke="#ffffff88" stroke-width="2" fill="none"/>` + leaf(190, 118, 30, 12, -40, grad("#a6e08b", "#4fa83e", "#22672a")) + leaf(190, 122, 26, 10, 10, grad("#a6e08b", "#4fa83e", "#22672a"));
D["chocolate-bar"] = () => plate() + [[78, 108], [128, 112]].map(([x, y]) => rrect(x, y, 42, 42, 5, 0, grad("#8a5232", "#5a2e16", "#2e1408")) + `<rect x="${x + 6}" y="${y + 6}" width="30" height="30" rx="3" fill="none" stroke="#a56a44" stroke-width="2"/>`).join("");
D["peanut-candy"] = () => plate() + rrect(76, 102, 88, 50, 8, -6, grad("#f2b45a", "#c9772a", "#874612")) + scatter(9, 120, 127, 34, 16, 13, 130).map((p) => oval(p.x, p.y, 6, 4.5, p.rot, grad("#fbe6bf", "#e2b878", "#a97a3e"))).join("");
D["baba-dudu"] = () => plate() + rrect(90, 104, 60, 42, 10, 8, grad("#7a4a2a", "#4a2410", "#220e04")) + `<path d="M98 116 q20 -10 44 0" stroke="#b07a52" stroke-width="2" fill="none" opacity=".6"/>`;
D.sausage = () => plate() + rrect(60, 112, 120, 30, 15, -6, grad("#e0905e", "#b04e26", "#6a2610")) + `<path d="M70 120 Q120 108 172 114" stroke="#ffd2b0" stroke-width="3" fill="none" opacity=".7"/>`;
D.alkaki = () =>
  plate() + `${shadow(122, 156, 46, 8)}<path d="M80 140 Q76 108 100 104 Q112 120 120 104 Q130 120 142 104 Q166 108 162 140 Q140 156 120 140 Q100 156 80 140Z" fill="${grad("#f6c86a", "#d98a26", "#94500e")}"/>` + specks(120, 126, 34, 16, 14, "#fff4cf", 140, 1.2);
D["canned-fruit"] = () =>
  shadow(120, 196, 64, 8) +
  `<rect x="58" y="88" width="124" height="108" rx="10" fill="${lin("#eef2f5", "#a9b4bd", false)}"/><ellipse cx="120" cy="88" rx="62" ry="14" fill="#d8dee3"/><ellipse cx="120" cy="88" rx="54" ry="10" fill="#fff3c4"/>` +
  scatter(7, 120, 88, 46, 8, 11, 150).map((p, i) => `<circle cx="${p.x}" cy="${p.y}" r="6" fill="${["#ffb347", "#ff6b6b", "#ffe066", "#7bd389", "#ffb347", "#ff6b6b", "#ffe066"][i]}"/>`).join("");

// ---- Fruit and whole vegetables measured as themselves (founder, 2026-10-08:
// no cups for fruit). Each draws the exact count on its card. No honest photo
// with that count was found on Pexels or Unsplash for any of these.
/** One piece of cut fruit, about 3cm on every side, drawn as a small cube. */
function cube(x, y, s, top, left, right) {
  const h = s * 0.5;
  return (
    shadow(x + 2, y + s + 2, s * 0.8, 4) +
    `<path d="M${x - s} ${y} L${x} ${y - h} L${x + s} ${y} L${x} ${y + h} Z" fill="${top}"/>` +
    `<path d="M${x - s} ${y} L${x} ${y + h} L${x} ${y + h + s} L${x - s} ${y + s} Z" fill="${left}"/>` +
    `<path d="M${x + s} ${y} L${x} ${y + h} L${x} ${y + h + s} L${x + s} ${y + s} Z" fill="${right}"/>`
  );
}
const cubes = (pts, s, c) => pts.map(([x, y]) => cube(x, y, s, c[0], c[1], c[2])).join("");
D.pawpaw = () => plate() + cubes([[92, 104], [146, 104], [92, 140], [146, 140]], 21, ["#ffb066", "#f07f22", "#c85f10"]);
D["golden-melon"] = () =>
  plate() + cubes([[78, 104], [120, 98], [162, 104], [78, 140], [120, 136], [162, 140]], 18, ["#f4f1b8", "#d9d27a", "#b8b04e"]);
D.soursop = () =>
  plate() + cubes([[92, 104], [146, 104], [92, 140], [146, 140]], 21, ["#ffffff", "#ece9e0", "#d8d3c6"]);
D["fruit-salad"] = () => {
  const c = [
    ["#ffb066", "#f07f22", "#c85f10"],
    ["#ff7b7b", "#e2463f", "#b02a24"],
    ["#fff27a", "#f2cf2a", "#c9a412"],
    ["#d6f5a0", "#a6d65c", "#78a83a"],
    ["#ffe0a8", "#f5b84a", "#cf8e22"],
  ];
  const pts = [[70, 100], [104, 96], [138, 96], [172, 100], [86, 126], [120, 122], [154, 126], [70, 152], [120, 150], [170, 152]];
  return plate() + pts.map(([x, y], i) => cube(x, y, 13, ...c[i % 5])).join("");
};
D.pomelo = () =>
  plate() +
  [[80, 128, -24], [122, 120, 0], [164, 128, 24]]
    .map(([x, y, r]) => `<g transform="rotate(${r} ${x} ${y})">${shadow(x, y + 30, 22, 5)}<path d="M${x - 20} ${y + 26} Q${x - 26} ${y - 22} ${x} ${y - 34} Q${x + 26} ${y - 22} ${x + 20} ${y + 26} Q${x} ${y + 34} ${x - 20} ${y + 26}Z" fill="${grad("#ffe1d6", "#f7a99a", "#d97b6c")}"/><path d="M${x} ${y - 30} L${x} ${y + 26}" stroke="#ffffff" stroke-width="2" opacity=".6"/></g>`)
    .join("");
D.fig = () =>
  plate() +
  [[92, 132], [150, 128]]
    .map(([x, y]) => `${shadow(x, y + 28, 26, 6)}<path d="M${x} ${y - 38} Q${x + 6} ${y - 24} ${x + 26} ${y} Q${x + 30} ${y + 28} ${x} ${y + 30} Q${x - 30} ${y + 28} ${x - 26} ${y} Q${x - 6} ${y - 24} ${x} ${y - 38}Z" fill="${grad("#a678b8", "#6a3a7e", "#3a1a48")}"/><path d="M${x} ${y - 38} l-2 -8" stroke="#5a7a2a" stroke-width="4" stroke-linecap="round"/><path d="M${x - 14} ${y - 6} q-4 14 2 28" stroke="#c9a0d8" stroke-width="2.5" fill="none" opacity=".7"/>`)
    .join("");
D["okra-veg"] = () =>
  plate() +
  [0, 1, 2, 3, 4, 5, 6, 7]
    .map((i) => {
      const x = 56 + (i % 4) * 42, y = 104 + Math.floor(i / 4) * 46;
      return `<g transform="rotate(${-62 + (i % 3) * 8} ${x} ${y})">${shadow(x + 18, y + 6, 22, 4)}<path d="M${x - 6} ${y - 6} L${x + 40} ${y} L${x - 6} ${y + 6} Q${x - 10} ${y} ${x - 6} ${y - 6}Z" fill="${lin("#9fd86a", "#3f8f2a")}"/><path d="M${x - 4} ${y} L${x + 36} ${y}" stroke="#d6f5a0" stroke-width="1.4" opacity=".8"/><rect x="${x - 12}" y="${y - 4}" width="8" height="8" rx="2" fill="#5f8f2f"/></g>`;
    })
    .join("");
D["green-beans"] = () =>
  plate() +
  Array.from({ length: 20 }, (_, i) => {
    const x = 54 + (i % 5) * 28, y = 102 + Math.floor(i / 5) * 18;
    return `<g transform="rotate(${-10 + (i % 3) * 10} ${x + 11} ${y})">${shadow(x + 11, y + 5, 11, 2)}<rect x="${x}" y="${y - 3}" width="22" height="6" rx="3" fill="${lin("#9be27c", "#3f9e35")}"/></g>`;
  }).join("");
/** A small floret: a stalk under a bunched top, like a little tree. */
function floret(x, y, top, stalk) {
  return (
    shadow(x, y + 22, 16, 4) +
    `<path d="M${x - 5} ${y + 2} L${x - 4} ${y + 20} L${x + 4} ${y + 20} L${x + 5} ${y + 2}Z" fill="${stalk}"/>` +
    [[-9, -2, 9], [0, -9, 10], [9, -2, 9], [0, 2, 9]].map(([dx, dy, r]) => `<circle cx="${x + dx}" cy="${y + dy}" r="${r}" fill="${top}"/>`).join("")
  );
}
const florets = (top, stalk) =>
  plate() + [[66, 100], [104, 96], [142, 96], [180, 100], [66, 140], [104, 136], [142, 136], [180, 140]].map(([x, y]) => floret(x, y, top, stalk)).join("");
D.broccoli = () => florets(grad("#7fcf6a", "#2f8a2f", "#155a1c"), "#9ccc6a");
D.cauliflower = () => florets(grad("#ffffff", "#f3eedc", "#d6ceb2"), "#cfe0a8");
D.mushroom = () =>
  plate() +
  [[70, 102], [112, 98], [154, 98], [190, 108], [70, 140], [112, 136], [154, 136], [96, 168], [146, 168]]
    .map(([x, y]) => `${shadow(x, y + 12, 15, 4)}<rect x="${x - 5}" y="${y}" width="10" height="11" rx="3" fill="#e9d7b8"/><path d="M${x - 16} ${y + 2} Q${x - 15} ${y - 14} ${x} ${y - 15} Q${x + 15} ${y - 14} ${x + 16} ${y + 2}Z" fill="${grad("#d8b48a", "#a8794c", "#6e4a28")}"/>`)
    .join("");
D.zucchini = () =>
  board() +
  shadow(122, 152, 56, 8) +
  `<path d="M60 128 Q60 108 80 106 L170 112 L170 146 L80 150 Q60 148 60 128Z" fill="${lin("#5f9a3a", "#2f5f1c")}"/>` +
  [118, 128, 138].map((y) => `<path d="M72 ${y} L168 ${y + 1}" stroke="#a6d65c" stroke-width="2" opacity=".5"/>`).join("") +
  `<ellipse cx="170" cy="129" rx="11" ry="17" fill="#f2f7cf" stroke="#5f9a3a" stroke-width="3"/><circle cx="170" cy="129" r="5" fill="#dfe8a8"/>` +
  `<rect x="52" y="122" width="10" height="12" rx="3" fill="#6b8a3a"/>`;
D.lettuce = () =>
  board() +
  [0, 1, 2, 3, 4, 5]
    .map((i) => {
      const x = 52 + (i % 3) * 52, y = 112 + Math.floor(i / 3) * 44;
      return `<g transform="rotate(${-20 + i * 9} ${x + 22} ${y})">${shadow(x + 22, y + 18, 26, 5)}<path d="M${x} ${y + 14} Q${x - 4} ${y - 18} ${x + 22} ${y - 22} Q${x + 48} ${y - 18} ${x + 44} ${y + 14} Q${x + 34} ${y + 6} ${x + 22} ${y + 16} Q${x + 10} ${y + 6} ${x} ${y + 14}Z" fill="${grad("#d8f7a8", "#8fd45c", "#4f9a2a")}"/><path d="M${x + 22} ${y + 14} L${x + 22} ${y - 18}" stroke="#f2ffd8" stroke-width="2"/></g>`;
    })
    .join("");

// ---- Foods eaten in pieces, shown as themselves instead of a palm, a
// matchbox or an egg (founder, 2026-10-08: "better to show the exact chicken
// and the fish than using palm"). Each draws the count on its card.
/** A chunk of cooked meat: a rounded, uneven block with a little sear. */
function chunk(x, y, w, h, rot, c, flecks) {
  return (
    `<g transform="rotate(${rot} ${x} ${y})">${shadow(x, y + h * 0.55, w * 0.55, 5)}` +
    `<path d="M${x - w / 2} ${y - h / 4} Q${x - w / 2 + 4} ${y - h / 2} ${x - w / 6} ${y - h / 2} L${x + w / 3} ${y - h / 2 + 2} Q${x + w / 2} ${y - h / 2 + 4} ${x + w / 2} ${y - h / 6} L${x + w / 2 - 2} ${y + h / 3} Q${x + w / 2 - 6} ${y + h / 2} ${x + w / 4} ${y + h / 2} L${x - w / 3} ${y + h / 2 - 2} Q${x - w / 2} ${y + h / 2 - 4} ${x - w / 2} ${y + h / 5}Z" fill="${grad(c[0], c[1], c[2])}"/>` +
    (flecks ? specks(x, y, w / 3, h / 3, 10, flecks, Math.round(x + y), 1.3) : "") +
    `</g>`
  );
}
const twoChunks = (c, flecks) => plate() + chunk(92, 128, 54, 40, -8, c, flecks) + chunk(152, 124, 50, 38, 10, c, flecks);
const BEEF = ["#a8644a", "#6e3420", "#3e180c"];
D.beef = () => twoChunks(BEEF);
D["beef-regular"] = () => twoChunks(BEEF);
D["goat-meat"] = () => twoChunks(["#b0705a", "#7a3e2a", "#45200f"]);
D["ram-meat"] = () => twoChunks(["#b4765c", "#7c432c", "#4a2412"]);
D.grasscutter = () => twoChunks(["#9c6a4c", "#6a3f26", "#3a200f"]);
D.asun = () => twoChunks(["#b5583a", "#7d2e16", "#45140a"], "#e8b04a");
D.turkey = () =>
  plate() +
  [[86, 130, -20], [154, 126, 20]]
    .map(([x, y, r]) => `<g transform="rotate(${r} ${x} ${y})">${shadow(x, y + 22, 30, 5)}<path d="M${x - 30} ${y + 4} Q${x - 30} ${y - 22} ${x} ${y - 20} Q${x + 22} ${y - 18} ${x + 22} ${y} Q${x + 20} ${y + 16} ${x} ${y + 18} Q${x - 26} ${y + 22} ${x - 30} ${y + 4}Z" fill="${grad("#e8b07a", "#b86e3a", "#7a3f18")}"/><rect x="${x + 18}" y="${y - 5}" width="18" height="10" rx="5" fill="#f3e3c8"/></g>`)
    .join("");
D.pomo = () => plate() + [[88, 130, -12], [150, 126, 14]].map(([x, y, r]) => rrect(x - 28, y - 12, 56, 24, 8, r, grad("#fbf0dc", "#e6cfa4", "#bf9c66"), `stroke="#a88552" stroke-width="2"`)).join("");
D.shaki = () =>
  plate() +
  [[90, 128, -10], [150, 126, 12]]
    .map(([x, y, r]) => rrect(x - 28, y - 18, 56, 36, 8, r, grad("#fbf4e6", "#e9dcc2", "#c2ab84")) + `<g transform="rotate(${r} ${x} ${y})">${[-12, 0, 12].map((d) => `<path d="M${x - 22} ${y + d} q11 -6 22 0 t22 0" stroke="#b39568" stroke-width="2" fill="none"/>`).join("")}</g>`)
    .join("");
D.gizzard = () => plate() + scatter(5, 120, 128, 58, 38, 34, 41).map((p) => chunk(p.x, p.y, 30, 24, p.rot, ["#a85a46", "#73301f", "#401509"])).join("");
D.kidney = () => plate() + scatter(5, 120, 128, 58, 38, 34, 43).map((p) => oval(p.x, p.y, 15, 11, p.rot, grad("#a24a40", "#6c2420", "#3a0e0c"))).join("");
D.liver = () => plate() + shadow(122, 150, 58, 8) + `<path d="M64 124 Q66 98 112 100 Q170 98 178 120 Q182 146 140 152 Q90 158 70 146 Q60 138 64 124Z" fill="${grad("#8c3a34", "#5a1c1a", "#2e0a0a")}"/><path d="M84 118 q30 -10 70 -2" stroke="#b25a52" stroke-width="3" fill="none" opacity=".6"/>`;
D["fried-chicken-fish"] = () => plate() + shadow(122, 150, 56, 8) + `<path d="M66 128 Q70 100 116 100 Q166 102 176 124 Q178 146 132 152 Q84 156 70 144 Q62 138 66 128Z" fill="${fried()}"/>` + specks(120, 126, 46, 18, 30, "#8a4a15", 61, 1.6);
D["dambu-nama"] = () =>
  plate() +
  shadow(120, 152, 62, 10) +
  Array.from({ length: 90 }, (_, i) => {
    const r = rng(70 + i);
    const t = r() * Math.PI * 2, d = Math.sqrt(r());
    const x = 120 + Math.cos(t) * 56 * d, y = 126 + Math.sin(t) * 30 * d, a = r() * Math.PI;
    return `<path d="M${(x - Math.cos(a) * 11).toFixed(1)} ${(y - Math.sin(a) * 5).toFixed(1)} L${(x + Math.cos(a) * 11).toFixed(1)} ${(y + Math.sin(a) * 5).toFixed(1)}" stroke="${i % 3 ? "#8a4a2a" : "#b56a3c"}" stroke-width="3.4" stroke-linecap="round"/>`;
  }).join("");
D.stockfish = () => plate() + shadow(122, 152, 60, 7) + `<path d="M58 128 Q90 108 150 112 L178 100 L176 152 L150 142 Q92 150 58 128Z" fill="${grad("#f1ece0", "#d8cfbb", "#a99e86")}"/>` + [80, 100, 120, 140].map((x) => `<path d="M${x} 116 l6 26" stroke="#b9ad92" stroke-width="2"/>`).join("");
D["smoked-fish"] = () => plate() + shadow(122, 152, 60, 7) + `<path d="M56 128 Q86 104 146 110 L178 98 L176 156 L146 144 Q88 152 56 128Z" fill="${grad("#d8964e", "#9a5a22", "#5a300c")}"/><circle cx="72" cy="124" r="4" fill="#2a1406"/>` + [92, 112, 132].map((x) => `<path d="M${x} 114 q6 14 0 28" stroke="#6a3a12" stroke-width="2" fill="none"/>`).join("");
const yamPieces = (c, stroke) => plate() + [[60, 108, -10], [126, 118, 8]].map(([x, y, r]) => rrect(x, y, 62, 40, 9, r, grad(...c), `stroke="${stroke}" stroke-width="2"`)).join("");
D["boiled-yam"] = () => yamPieces(["#ffffff", "#f6eedb", "#d9c7a0"], "#c9b48a");
D["fried-yam"] = () => yamPieces(["#ffd98a", "#e09a3a", "#a5601a"], "#8a4a12");
D.cocoyam = () => yamPieces(["#fdf6f8", "#ead8e2", "#bfa0b4"], "#8a6a5a");
D["sweet-potato"] = () => plate() + oval(120, 128, 46, 26, -8, grad("#ffc58a", "#f08a3a", "#b8541a"), `stroke="#7a3a4a" stroke-width="4"`);
D["boiled-plantain-unripe"] = () =>
  plate() + [[80, 130, -10], [122, 120, 4], [162, 132, 14]].map(([x, y, r]) => oval(x, y, 22, 17, r, grad("#fff6c8", "#f1dc8a", "#c9b050"), `stroke="#b59a3a" stroke-width="2.5"`)).join("");
D["puff-puff"] = () => plate() + ball(120, 124, 30, grad("#f7c873", "#d88a2c", "#9a5418")) + specks(120, 124, 22, 22, 18, "#8a4a15", 81, 1.4);
D.buns = () => plate() + ball(120, 124, 34, grad("#f2c070", "#c9782a", "#844512")) + specks(120, 124, 26, 26, 26, "#6b3510", 83, 1.8);
D.aadun = () => plate() + rrect(90, 108, 60, 32, 8, -4, grad("#ffb070", "#e06a2a", "#9a3a10")) + specks(120, 124, 24, 12, 16, "#ffe0b0", 85, 1.2);
D.donkwa = () => plate() + [[96, 126, -14], [144, 124, 12]].map(([x, y, r]) => rrect(x - 20, y - 11, 40, 22, 10, r, grad("#d9a06a", "#a8642c", "#6a3814"))).join("");

// "None at all" on the card: the app draws the red skip mark over these, the
// same way it does over the skip photos, so the list lives with the drawings.
const SKIP = ["malt-drink", "energy-drink", "condensed-milk", "sugarcane-juice", "canned-fruit"];

// A real photo always wins (lib/foodPhotos.ts): a food that has one is not
// drawn, and its old drawing is removed so nothing ships that is never shown.
let n = 0;
for (const [id, draw] of Object.entries(D)) {
  if (existsSync(`public/img/food-portions/${id}.jpg`)) {
    delete D[id];
    rmSync(`${OUT}/${id}.svg`, { force: true });
    continue;
  }
  writeFileSync(`${OUT}/${id}.svg`, svg(draw()));
  n++;
}
// The app's list of drawn foods, written here so it can never disagree with
// the files on disk.
writeFileSync(
  "lib/foodDrawings.ts",
  `// GENERATED by scripts/food-drawings.mjs. Do not edit by hand.
` +
    `/** Foods shown as a colour drawing (no honest photo exists), with the ones whose card says "None at all". */
` +
    `export const DRAWN_FOODS: readonly string[] = ${JSON.stringify(Object.keys(D).sort())};
` +
    `export const DRAWN_SKIP: readonly string[] = ${JSON.stringify(SKIP.filter((id) => D[id]))};
`,
);
console.log(`${n} drawings written`);
