import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../.skill/kit/iso-kit.mjs";
import * as G from "../../../../.skill/kit/lathe.mjs";
import * as A from "../../../../.skill/kit/audit.mjs";
import { kitScript } from "../../../../.skill/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";

// World: 2 units per mm. The pen lies along +x, tip at s = 0, cap at s = 280 (140 mm).
const W = 680;
const H = 230;
const AZIMUTH = 76;
const X0 = -140;
const AXIS_Z = 30;
const R_OUT = 10; // 10 mm barrel
const R_BORE = 8.2;
const TIP_TRAVEL = 7; // 3.5 mm of tip
const HEART_TRAVEL = 24; // 12 mm of heart
const MOVES = { lower: [-140, 0, 0], upper: [135, 0, 0], core: [0, 0, 0], stand: [0, 0, 0] };
const STAGGER = ["lower", "upper", "core", "stand"];
const SPRING = { stagger: 0.035, stiffness: 64, damping: 14.2, substeps: 4 };
const PLATE = { x: -200, y: -36, w: 400, d: 72, r: 8 };
const PLATE_H = 10;
const FOOT_H = 5;
const CRADLES = [80, 205].map((s) => X0 + s);

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [X0 - 140, 0, AXIS_Z + R_OUT], [X0 + 415, 0, AXIS_Z + R_OUT], [X0 - 140, 0, AXIS_Z - R_OUT], [X0 + 415, 0, AXIS_Z - R_OUT]],
  W,
  H,
  { pad: 14, azimuth: AZIMUTH, elevation: 26 },
);
const V = G.viewOf(P);
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);

// Pen frame: angle 0 faces the viewer, v runs across the pen on screen.
const AX = [1, 0, 0];
const uView = G.unit3([0, V[1], V[2]]);
const F = G.frameOf([X0, 0, AXIS_Z], AX, uView, G.cross3(AX, uView));
const pt = (s, r, angle = 0) => G.pointOf(F, s, r, angle);
const R = A.recorder(P, { order: STAGGER, spring: SPRING });
const put = (piece, s, svg, shapes, extra = {}) => R.put({ piece, at: [X0 + s, 0, AXIS_Z], svg, move: MOVES[piece], shapes, ...extra });

// ---------- analytic profiles ----------
const ease = (t) => 1 - (1 - t) ** 2.2;
const LOWER_END = 130;
const lowerR = (s) => {
  if (s <= 40) return 2.2 + (R_OUT - 2.2) * ease((s - 6) / 34);
  if (s <= 128.2) return R_OUT;
  return R_OUT - 0.8 * ((s - 128.2) / 1.8) ** 2;
};
const lowerSlope = (s) => {
  if (s <= 40) return ((R_OUT - 2.2) * 2.2 * (1 - (s - 6) / 34) ** 1.2) / 34;
  if (s <= 128.2) return 0;
  return (-1.6 * (s - 128.2)) / 3.24;
};
const upperR = (s) => {
  if (s < 131.8) return R_OUT - 0.8 * ((131.8 - s) / 1.8) ** 2;
  if (s <= 278.4) return R_OUT;
  return R_OUT - 1.2 * ((s - 278.4) / 1.6) ** 2;
};
const upperSlope = (s) => {
  if (s < 131.8) return (1.6 * (131.8 - s)) / 3.24;
  if (s <= 278.4) return 0;
  return (-2.4 * (s - 278.4)) / 2.56;
};
const sample = (f, s0, s1, n) => Array.from({ length: n + 1 }, (_, i) => s0 + ((s1 - s0) * i) / n).map((s) => [s, f(s)]);

// ---------- stand ----------
const back = [];
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
function stand() {
  back.push(`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`);
  for (const [x, y] of byDepth(k.corners(PLATE, 20))) {
    back.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    back.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
    R.solid(A.cylinder(x, y, 7, -PLATE_H - FOOT_H, FOOT_H, { name: `stand.foot${x}${y}` }));
  }
  back.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  R.solid(A.slab(PLATE, -PLATE_H, PLATE_H, { name: "stand.plate" }));
  back.push(Ln(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  back.push(Ln(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }), Dots(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // ruler in millimetres under the pen, zero at the tip
  const strip = { x: X0 - 4, y: 21, w: 288, d: 7, r: 1 };
  back.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(X0, X0 + 280, 4, 5, strip.y + 0.8, 0.6, [1.8, 3.6], P);
  back.push(Ln(ticks.minor, { tone: "lo" }), Ln(ticks.major, { tone: "mid" }));
  back.push(Ln(k.lineOnTop([X0, strip.y + 0.8], [X0, strip.y + 5.6], 0.6, P), { tone: "hi" }));
  back.push(Dots([at([strip.x + 1.8, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 1.8, strip.y + 3.5, 0.6])], { size: 0.45 }));
  R.solid(A.slab(strip, 0, 0.6, { name: "stand.ruler" }, 3));
  // label plate, back right
  const label = { x: 128, y: -30, w: 50, d: 14, r: 1.5 };
  back.push(S(k.slabOf(label, 0, 0.8, P, 3, 0.4), { tone: "lo", crease: "none" }));
  back.push(Ln([0, 1, 2].map((i) => k.lineOnTop([label.x + 12, label.y + 4 + i * 3], [label.x + (i === 1 ? 40 : 46), label.y + 4 + i * 3], 0.8, P)).join(""), { tone: "faint", free: true }));
  back.push(Dots([at([label.x + 4, label.y + 7, 0.8])], { size: 0.5, tone: "mid" }));
  R.solid(A.slab(label, 0, 0.8, { name: "stand.label" }, 3));
}

const PAD_R = 2.5;
const PAD_ANG = (40 * Math.PI) / 180;
const PAD_Y = (R_OUT + PAD_R) * Math.sin(PAD_ANG);
const PAD_Z = AXIS_Z - (R_OUT + PAD_R) * Math.cos(PAD_ANG);
const BLOCK_TOP = PAD_Z - PAD_R;
function cradle(cx, index) {
  const block = { x: cx - 8, y: -15, w: 16, d: 30, r: 3 };
  put("stand", cx - X0, `<path class="iso-halo" d="${k.haloOf(block, 0, 0.1, P)}" style="filter:blur(3px)"/>` + S(k.slabOf(block, 0, BLOCK_TOP, P, 6, 0.6), { tone: "mid" }) + Dots([at([cx - 4, 10, BLOCK_TOP]), at([cx + 4, 10, BLOCK_TOP])].map((p) => p), { size: 0.45, tone: "lo" }), [R.solid(A.slab(block, 0, BLOCK_TOP, { name: `stand.block${index}` }, 6))], { bias: -2 });
  for (const side of [-1, 1]) {
    const y = side * PAD_Y;
    for (const end of [-1, 1]) {
      const cheek = { x: end < 0 ? cx - 7.5 : cx + 6, y: side < 0 ? -11.8 : 4.6, w: 1.5, d: 7.2, r: 0.5 };
      put("stand", cx - X0 + end * 6.8, S(k.slabOf(cheek, BLOCK_TOP, PAD_Z - BLOCK_TOP, P, 2, 0.3), { tone: "mid" }), [R.solid(A.slab(cheek, BLOCK_TOP, PAD_Z - BLOCK_TOP, { name: `stand.cheek${index}${side}${end}` }, 2))], { bias: 0.5 });
    }
    const PF = G.frameOf([cx, y, PAD_Z], AX, [0, 0, 1], [0, 1, 0]);
    const face = Dots([G.pointOf(PF, 6, 0, 0)].map(at), { size: 0.45, tone: "hi" }) + Ln(G.circleOf(PF, 6, 1.1, P), { tone: "lo" });
    put("stand", cx - X0, S(G.disc(-6, 6, PAD_R, PF, P), { tone: "lo" }) + face, [R.solid(A.disc(PF, -6, 6, PAD_R, { name: `stand.pad${index}${side}` }))], { bias: 0.2 });
  }
}

// ---------- pen ----------
const WIN = { s0: 232, s1: 256, half: 0.62 }; // capsule window on the side facing you
function capsule(r, inset = 0) {
  const pts = [];
  const len = WIN.s1 - WIN.s0 - 2 * inset;
  const hw = (WIN.half - inset / r) * r; // arc half-width in units
  const rad = Math.min(hw, len / 2);
  const a = WIN.s0 + inset + rad;
  const b = WIN.s1 - inset - rad;
  for (let i = 0; i <= 16; i++) {
    const t = -Math.PI / 2 + (Math.PI * i) / 16;
    pts.push([b + rad * Math.cos(t), rad * Math.sin(t)]);
  }
  for (let i = 0; i <= 16; i++) {
    const t = Math.PI / 2 + (Math.PI * i) / 16;
    pts.push([a + rad * Math.cos(t), rad * Math.sin(t)]);
  }
  return pts.map(([s, w]) => at(pt(s, r, w / r)));
}
const pathOf = (pts) => "M" + pts.map((p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join("L") + "Z";

// The grip wraps the refill and its open end faces you once it slides off, so it is drawn and
// recorded as a back half (behind the refill) and a front half (in front of it).
function halfPrisms(name, s0, s1, slices, outer, inner, front) {
  const shapes = [];
  const n = 24;
  for (let i = 0; i < slices; i++) {
    const a = s0 + ((s1 - s0) * i) / slices;
    const b = s0 + ((s1 - s0) * (i + 1)) / slices;
    const ro = Math.min(outer(a), outer(b));
    const ri = Math.max(inner(a), inner(b));
    if (ro - ri < 0.3) continue;
    const arc = (r) => Array.from({ length: n + 1 }, (_, j) => (front ? -Math.PI / 2 : Math.PI / 2) + (Math.PI * j) / n).map((t) => [r * Math.cos(t), r * Math.sin(t)]);
    shapes.push(R.solid(A.prism(F, [...arc(ro), ...arc(ri).reverse()], a, b, { name: `${name}${i}`, owner: "lower.barrel" })));
  }
  return shapes;
}
const lowerBore = (s) => (s <= 6 ? 1.5 : s <= 9 ? 1.5 + ((s - 6) / 3) * 0.1 : s <= 20 ? 1.6 + ((s - 9) / 11) * 2.2 : s <= 30 ? 3.8 + ((s - 20) / 10) * 4.4 : R_BORE);
function lower() {
  const paths = G.solidOf([[6, lowerR(6)], [LOWER_END, lowerR(LOWER_END)]], F, P, { smooth: { slope: lowerSlope, radius: lowerR } });
  const boreD = G.circleOf(F, LOWER_END, R_BORE, P);
  const shapes = (front) => [
    ...halfPrisms(front ? "lower.front.nose" : "lower.back.nose", 6, 40, 12, lowerR, lowerBore, front),
    ...halfPrisms(front ? "lower.front.grip" : "lower.back.grip", 40, 128.2, 1, () => R_OUT, () => R_BORE, front),
    ...halfPrisms(front ? "lower.front.end" : "lower.back.end", 128.2, LOWER_END, 3, lowerR, () => R_BORE, front),
  ];
  put("lower", 60, S(paths, { tone: "hi" }) + `<path class="pen-bore" d="${boreD}"/>`, shapes(false), { name: "lower.back", bias: -12 });
  const seam = Ln(G.arcOf(F, 40, R_OUT, P), { tone: "faint" }) + "";
  const dot = `<circle data-part="index" class="pen-index" r="0.9" cx="${at(pt(124, 10.05, 0.55))[0].toFixed(2)}" cy="${at(pt(124, 10.05, 0.55))[1].toFixed(2)}"/>`;
  const mask = `<mask id="pen-bore" maskUnits="userSpaceOnUse" x="-2000" y="-2000" width="4000" height="4000"><rect x="-2000" y="-2000" width="4000" height="4000" fill="#fff"/><path d="${boreD}" fill="#000"/></mask>`;
  put("lower", 80, mask + `<g mask="url(#pen-bore)">${S(paths, { tone: "hi", inner: seam })}</g>` + Ln(boreD, { tone: "lo" }) + dot, shapes(true), { name: "lower.front", bias: 12 });
}

function upper() {
  const outer = sample(upperR, 130, 280, 60);
  const poly = [...outer, [280, 0], [276, 0], [276, R_BORE], [130, R_BORE]];
  const paths = G.solidOf([[130, upperR(130)], [280, upperR(280)]], F, P, { smooth: { slope: upperSlope, radius: upperR } });
  const outerWin = capsule(R_OUT);
  const innerWin = capsule(R_BORE, 0.6);
  const cap = Ln(G.circleOf(F, 280, 5.2, P), { tone: "faint" }) + Dots([at(pt(280, 0))], { size: 0.4, tone: "lo" });
  const marks = Dots([at(pt(134, R_OUT, -0.55)), at(pt(134, R_OUT, 0.55))], { size: 0.55, tone: "mid" }) + Ln(G.arcOf(F, 134, R_OUT, P, { from: -0.62 + 2 * Math.PI, to: -0.48 + 2 * Math.PI }), { tone: "lo", free: true });
  // the back wall you see through the window
  const inside = `<path class="pen-inside" d="${pathOf(outerWin)}"/>`;
  put("upper", 244, inside, [R.solid(A.prism(F, [[-R_BORE + 0.3, -6.5], [-R_BORE + 1.2, -6.5], [-R_BORE + 1.2, 6.5], [-R_BORE + 0.3, 6.5]], WIN.s0, WIN.s1, { name: "upper.inside", owner: "upper.shell" }))], { bias: -30 });
  const glare = (() => {
    const a = pt(WIN.s0 + 7, R_OUT + 0.05, 0.42);
    const b = pt(WIN.s0 + 13, R_OUT + 0.05, -0.42);
    return `<path class="pen-glare" d="M${at(a).join(" ")}L${at(b).join(" ")}"/>`;
  })();
  const shell = `<mask id="pen-win" maskUnits="userSpaceOnUse" x="-2000" y="-2000" width="4000" height="4000"><rect x="-2000" y="-2000" width="4000" height="4000" fill="#fff"/><path d="${pathOf(outerWin)}" fill="#000"/></mask><g mask="url(#pen-win)">${S(paths, { tone: "hi", inner: cap + marks })}</g>`;
  const glass = `<path class="pen-glass" d="${pathOf(outerWin)}"/>` + glare + Ln(pathOf(innerWin), { tone: "faint" }) + Ln(pathOf(outerWin), { tone: "mid" });
  put("upper", 205, shell + glass, [R.solid(A.body(F, poly, { name: "upper.shell", owner: "upper.shell" }))]);
}

function refill() {
  const shapes = [];
  const parts = [];
  const tip = G.sphereOf(pt(0.55, 0), 0.55, P);
  parts.push(S(G.solidOf([[0.6, 0.45], [7, 1.1]], F, P), { tone: "hi", lit: true }));
  parts.push(S(tip, { tone: "hi", lit: true }));
  shapes.push(R.solid(A.ball(pt(0.55, 0), 0.55, { name: "core.tipball", owner: "core.refill" })));
  shapes.push(R.solid(A.solid(F, [[0.6, 0.45], [7, 1.1]], { name: "core.point", owner: "core.refill" })));
  parts.unshift(S(G.solidOf([[7, 1.1], [20, 3.2]], F, P), { tone: "mid" }));
  shapes.push(R.solid(A.solid(F, [[7, 1.1], [20, 3.2]], { name: "core.housing", owner: "core.refill" })));
  const ink = `<g class="pen-ink">${S(G.disc(20, 150, 3.2, F, P), { tone: "mid" })}</g>`;
  const empty = S(G.disc(150, 186, 3.2, F, P), { tone: "lo", inner: Ln(G.arcOf(F, 150, 3.2, P), { tone: "mid" }) });
  const collar = S(G.disc(100, 106, R_BORE, F, P), { tone: "mid" }) + Dots([at(pt(103, R_BORE + 0.2, 0))], { size: 0.7, tone: "hi" });
  const plug = S(G.disc(186, 192, 2.8, F, P), { tone: "mid" });
  shapes.push(R.solid(A.disc(F, 20, 186, 3.2, { name: "core.tube", owner: "core.refill" })));
  shapes.push(R.solid(A.disc(F, 100, 106, R_BORE, { name: "core.collar", owner: "core.refill" })));
  shapes.push(R.solid(A.disc(F, 186, 192, 2.8, { name: "core.plug", owner: "core.refill" })));
  put("core", 96, `<g data-twist="${TIP_TRAVEL}">${ink}${empty}${plug}${collar}${parts.join("")}</g>`, shapes, { name: "core.refill" });
}

const HEART = { point: 238, lobe: 247, lobeR: 3.2, lobeW: 2.6, base: 4.3 };
function heart() {
  const shapes = [];
  const rod = S(G.disc(205, HEART.point + 2, 1.4, F, P), { tone: "mid" });
  const collar = S(G.disc(200, 205, R_BORE, F, P), { tone: "mid" }) + Dots([at(pt(202.5, R_BORE + 0.2, 0))], { size: 0.7, tone: "hi" });
  shapes.push(R.solid(A.disc(F, 200, 205, R_BORE, { name: "core.heartcollar", owner: "core.heart" })));
  shapes.push(R.solid(A.disc(F, 205, HEART.point + 2, 1.4, { name: "core.heartrod", owner: "core.heart" })));
  const coneProfile = [[HEART.point, 0.6], [HEART.lobe, HEART.base]];
  const cone = `<g class="pen-heart">${S(G.solidOf(coneProfile, F, P), { tone: "hi" })}</g>`;
  shapes.push(R.solid(A.solid(F, coneProfile, { name: "core.heartpoint", owner: "core.heart" })));
  const lobes = [-1, 1]
    .map((side) => G.pointOf(F, HEART.lobe, HEART.lobeW, side > 0 ? Math.PI / 2 : -Math.PI / 2))
    .sort((a, b) => G.dot3(a, V) - G.dot3(b, V))
    .map((c, i) => {
      shapes.push(R.solid(A.ball(c, HEART.lobeR, { name: `core.lobe${i}`, owner: "core.heart" })));
      return `<g class="pen-heart">${S(G.sphereOf(c, HEART.lobeR, P), { tone: "hi" })}</g>`;
    });
  put("core", 230, `<g data-twist="${HEART_TRAVEL}">${collar}${rod}${cone}${lobes.join("")}</g>`, shapes, { name: "core.heart" });
}

stand();
CRADLES.forEach(cradle);
refill();
heart();
lower();
upper();

A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
const V3 = (v) => {
  const o = at([0, 0, 0]);
  const p = at(v);
  return [p[0] - o[0], p[1] - o[1]];
};
const groups = R.items.map((item) => {
  const [mx, my, mz] = item.move;
  const lift = G.dot3(item.move, V);
  return `<g class="it" data-piece="${item.piece}" data-k="${item.key.toFixed(3)}" data-l="${lift.toFixed(3)}" data-m="${V3(item.move).map((n) => n.toFixed(2)).join(",")}">${item.svg}</g>`;
});

const svg = k.figureSvg({
  width: W,
  height: H,
  label:
    "A Kaco First Roller heart pen lying on two roller cradles over a millimetre ruler. Twisting the grip pushes the 0.5 mm tip out by 3.5 mm and slides a red heart 12 mm forward into the clear window. Taken apart, the grip and the cap slide off to show the gel refill and the heart on its pushrod.",
  body: [back.join(""), `<g class="pen-items">${groups.join("")}</g>`],
});

const CSS = `
.iso{--pen-bore:var(--anatomy-shade-0);--pen-inside:var(--anatomy-shade-1);--pen-glass:#9fd4ff;--pen-ink:#050506}
.iso[data-theme="light"]{--pen-bore:#b9b9b6;--pen-inside:#d9d9d6;--pen-glass:#5aa7e0;--pen-ink:#1a1a1d}
.pen-bore{fill:var(--pen-bore)}
.pen-inside{fill:var(--pen-inside)}
.pen-glass{fill:var(--pen-glass);fill-opacity:.07}
.pen-glare{stroke:#fff;stroke-opacity:.35;stroke-width:1.6;stroke-linecap:round;fill:none}
.iso[data-theme="light"] .pen-glare{stroke-opacity:.9}
.pen-index,.pen-pin{fill:var(--anatomy-dot)}
.pen-pin{fill:var(--anatomy-hi)}
.pen-ink{--anatomy-face:var(--pen-ink);--anatomy-top:#1d1d22;--anatomy-shade-0:#060607;--anatomy-shade-1:#0b0b0d;--anatomy-shade-2:#111114;--anatomy-shade-3:#18181c}
.pen-heart{--anatomy-face:#c8102e;--anatomy-paper:#c8102e;--anatomy-top:#ff5a6e;--anatomy-shade-0:#7d0a1d;--anatomy-shade-1:#9b0d24;--anatomy-shade-2:#bb1430;--anatomy-shade-3:#dc2340;--anatomy-hi:#ff8090;--anatomy-faint:#ff8090}
.iso[data-theme="light"] .pen-heart{--anatomy-hi:#7d0a1d;--anatomy-faint:#7d0a1d}
.pen-controls{display:flex;gap:10px;align-items:center;justify-content:center;margin:6px 0 2px;flex-wrap:wrap}
.pen-btn{font:inherit;font-size:12px;color:var(--anatomy-strong);background:transparent;border:1px solid var(--anatomy-faint);border-radius:999px;padding:5px 14px;cursor:pointer}
.pen-btn[aria-pressed="true"]{border-color:var(--anatomy-mid)}
.pen-parts{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:4px 18px;margin:14px 0 0;padding:0;list-style:none;font-size:12.5px;color:var(--anatomy-text)}
.pen-parts b{color:var(--anatomy-strong);font-weight:500}
.pen-parts h3{grid-column:1/-1;margin:10px 0 2px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--anatomy-muted);font-weight:500}
`;

const PARTS = [
  ["Outer shell, top to bottom", [
    ["Flat cap top", "solid end, 9 mm face, no pocket clip"],
    ["Upper barrel", "10 mm matte tube, stays still while you twist"],
    ["Clear window", "capsule cut-out, 12 × 6 mm, with a clear insert"],
    ["Twist ring", "the fine seam where the two halves turn"],
    ["Grip barrel", "smooth, clip-less, 10 mm round"],
    ["Nose cone", "tapers to a 3 mm mouth"],
  ]],
  ["Mechanism and core, outer to inner", [
    ["Refill follower", "collar and pin in a shallow groove: 3.5 mm per quarter turn"],
    ["Heart follower", "collar and pin in a steep groove: 12 mm per quarter turn"],
    ["Red heart core", "two lobes and a point on a pushrod"],
    ["Gel refill", "black quick-dry ink in a 3.2 mm tube"],
    ["0.5 mm tip", "rollerball in a needle cone, lit"],
  ]],
];
const partsHtml = `<ul class="pen-parts">${PARTS.map(([head, list]) => `<h3>${head}</h3>` + list.map(([b, t]) => `<li><b>${b}</b> · ${t}</li>`).join("")).join("")}</ul>`;

const DATA = {
  F, W, H, P, X0,
  EX: V3([1, 0, 0]),
  tip: TIP_TRAVEL,
  heart: HEART_TRAVEL,
  spring: SPRING,
  stagger: STAGGER,
};

const LIVE = `
const D = ${JSON.stringify(DATA)};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const layer = svg.querySelector(".pen-items");
const nodes = [...layer.children].map((el) => ({ el, k: +el.dataset.k, l: +el.dataset.l, m: el.dataset.m.split(",").map(Number), piece: el.dataset.piece, tw: el.querySelector("[data-twist]") }));
const index = svg.querySelector('[data-part="index"]');
const readout = document.querySelector("[data-readout]");
const btnApart = document.querySelector("[data-apart]");
const btnTwist = document.querySelector("[data-twistbtn]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const F = D.F;
const pointOf = (s, r, a) => [0, 1, 2].map((i) => F.o[i] + F.a[i] * s + r * (F.u[i] * Math.cos(a) + F.v[i] * Math.sin(a)));
const place = (el, p) => { const q = iso(p, D.P); el.setAttribute("cx", q[0].toFixed(2)); el.setAttribute("cy", q[1].toFixed(2)); };
const order = D.stagger;
const springs = Object.fromEntries(order.map((id) => [id, { x: 0, v: 0, target: 0, pending: null }]));
let ext = { x: 1, v: 0 }, extTarget = 1, apart = false, clock = 0, touring = true, idle = 0, last = 0, frame = 0, visible = false, sorted = "";
function setApart(on) {
  apart = on;
  if (on) extTarget = 1;
  const list = on ? order : [...order].reverse();
  list.forEach((id, i) => { springs[id].pending = { value: on ? 1 : 0, at: clock + i * D.spring.stagger }; });
  btnApart.setAttribute("aria-pressed", String(on));
  btnApart.textContent = on ? "Put back together" : "Take apart";
  stage.setAttribute("aria-valuetext", on ? "Taken apart: grip, cap and core" : ext.x > 0.5 ? "Tip out, heart in the window" : "Tip in, heart hidden");
  run();
}
function draw() {
  const e = ext.x;
  for (const n of nodes) {
    const a = springs[n.piece] ? springs[n.piece].x : 0;
    n.key = n.k + n.l * a;
    const tx = n.m[0] * a, ty = n.m[1] * a;
    if (a) n.el.setAttribute("transform", "translate(" + tx.toFixed(2) + " " + ty.toFixed(2) + ")"); else n.el.removeAttribute("transform");
    if (n.tw) { const d = +n.tw.dataset.twist * (1 - e); n.tw.setAttribute("transform", d ? "translate(" + (D.EX[0] * d).toFixed(2) + " " + (D.EX[1] * d).toFixed(2) + ")" : ""); }
  }
  const idx = nodes.map((n, i) => i).sort((i, j) => nodes[i].key - nodes[j].key);
  const sig = idx.join(",");
  if (sig !== sorted) { const frag = document.createDocumentFragment(); idx.forEach((i) => frag.appendChild(nodes[i].el)); layer.appendChild(frag); sorted = sig; }
  place(index, pointOf(124, 10.05, -0.55 + 1.1 * e));
  const moving = order.some((id) => springs[id].pending || Math.abs(springs[id].x - springs[id].target) > 0.002);
  const text = moving ? (apart ? "taking apart" : "closing up") : springs.lower.x > 0.5 ? "apart · grip, core, cap" : "twist " + Math.round(90 * e) + "° · tip " + (3.5 * e).toFixed(1) + " mm · heart " + (e > 0.97 ? "in window" : e < 0.03 ? "hidden" : "rising");
  if (readout.textContent !== text) readout.textContent = text;
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now; clock += dt;
  const calm = still.matches;
  if (touring && !apart) extTarget = clock % 6 < 3 ? 1 : 0;
  let busy = false;
  for (const id of order) {
    const s = springs[id];
    if (s.pending && clock >= s.pending.at) { s.target = s.pending.value; s.pending = null; }
    if (s.pending) busy = true;
    if (calm) { s.x = s.target; s.v = 0; continue; }
    for (let i = 0; i < D.spring.substeps; i++) { const h = dt / D.spring.substeps; s.v += ((s.target - s.x) * D.spring.stiffness - s.v * D.spring.damping) * h; s.x += s.v * h; }
    if (Math.abs(s.target - s.x) < 5e-4 && Math.abs(s.v) < 5e-4) { s.x = s.target; s.v = 0; } else busy = true;
  }
  if (calm) ext.x = extTarget; else {
    const w = 1 / 0.22;
    for (let i = 0; i < 4; i++) { const h = dt / 4; ext.v += (w * w * (extTarget - ext.x) - 2 * w * ext.v) * h; ext.x += ext.v * h; }
    if (Math.abs(extTarget - ext.x) < 1e-4 && Math.abs(ext.v) < 1e-4) { ext.x = extTarget; ext.v = 0; } else busy = true;
  }
  draw();
  frame = visible && (busy || touring) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = !still.matches; run(); }, 4000); run(); };
const twistTo = (v) => { extTarget = Math.max(0, Math.min(1, v)); btnTwist.textContent = extTarget > 0.5 ? "Twist to retract" : "Twist to write"; hold(); };
new IntersectionObserver((en) => { visible = en[en.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointermove", (ev) => { if (apart) return; const b = svg.getBoundingClientRect(); twistTo(((ev.clientX - b.left) / b.width - 0.3) / 0.4); });
stage.addEventListener("click", () => setApart(!apart));
btnApart.addEventListener("click", () => { setApart(!apart); hold(); });
btnTwist.addEventListener("click", () => { if (apart) setApart(false); twistTo(extTarget > 0.5 ? 0 : 1); });
stage.addEventListener("keydown", (ev) => {
  if (ev.key === "ArrowRight" || ev.key === "ArrowUp") twistTo(1);
  else if (ev.key === "ArrowLeft" || ev.key === "ArrowDown") twistTo(0);
  else if (ev.key === " " || ev.key === "Enter") setApart(!apart);
  else if (ev.key === "Escape") setApart(false);
  else return;
  ev.preventDefault();
});
draw();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Kaco First Roller · heart pen",
  hint: "Hover to twist · click to take apart",
  readout: "twist 90° · tip 3.5 mm · heart in window",
  keys: [
    { mark: "red", label: "Red heart core: slides 12 mm into the window" },
    { mark: "lit", label: "0.5 mm tip: comes out 3.5 mm on the same quarter turn" },
  ],
  caption:
    "A clip-less twist rollerball, 140 mm long and 10 mm across. A quarter turn of the grip drives two followers along helical grooves: a shallow one pushes the refill and its 0.5 mm tip out by 3.5 mm, a steep one slides the red heart 12 mm forward until it fills the clear window. Turn back and the tip hides in the nose while the heart drops back under the opaque cap. The groove leads are drawn to show the idea, not measured from a real pen.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Kaco heart pen. Arrow keys twist the pen out and in; Space takes it apart." aria-valuemin="0" aria-valuemax="1" aria-valuenow="1" aria-valuetext="Tip out, heart in the window">${svg}</div><div class="pen-controls"><button type="button" class="pen-btn" data-twistbtn>Twist to retract</button><button type="button" class="pen-btn" data-apart aria-pressed="false">Take apart</button></div>${partsHtml}`,
});

const name = THEME === "light" ? "kaco-heart-pen-light.html" : "kaco-heart-pen.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "Kaco heart pen", theme: THEME, body: `<style>${CSS}</style>${body}`, script: kitScript() + LIVE, width: 720 }));
console.log("wrote", name, R.items.length, "items");
A.auditOrExit(R, P);
