import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../.skill/kit/iso-kit.mjs";
import * as G from "../../../../.skill/kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../../../../.skill/kit/tube.mjs";
import * as A from "../../../../.skill/kit/audit.mjs";
import { kitScript } from "../../../../.skill/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";
const W = 640, H = 700;

// ---------- world layout (1 unit ≈ 2 mm) ----------
export const L = {
  chassis: { x: -84, y: -62, w: 168, d: 124, r: 6 },
  tank: { x: -74, y: -52, w: 28, d: 36, r: 3, z0: 10, z1: 150 },
  pump: { y: -40, z: 22, x0: -30, x1: -6, r: 8 },
  meter: { x: 2, y: -46, w: 12, d: 12, z0: 14, z1: 30 },
  thermo: { x: 44, y: -54, w: 30, d: 24, z0: 60, z1: 100 },
  grinder: { x: -34, y: -2 },
  chamber: { x: 20, y: -5, r: 12, z0: 96, z1: 140 },
  block: { x: 6, y: -19, w: 28, d: 28, z0: 84, z1: 96 },
  bin: { x: 2, y: -23, w: 36, d: 30, z0: 10, z1: 60 },
  tray: { x: -34, y: 16, w: 78, d: 44, z0: 10, z1: 22 },
  cup: { x: 23, y: 40, r: 10, z0: 22, z1: 54 },
  head: { x: 8, y: 34, w: 32, d: 12, z0: 76, z1: 86 },
  jug: { x: 64, y: -6, r: 13, z0: 10, z1: 48 },
  sugar: { x0: -18, x1: 30, y: 40, z: 108, hop: -8, out: 24 },
};
const C = L.chassis;
const P = k.fitProjection(
  [...k.boxCorners(C, -8, 0), [C.x, C.y, 236], [C.x + C.w, C.y, 236], [C.x, C.y + C.d, 236], [-34, 22, 226], [L.jug.x + 14, L.jug.y + 14, 0]],
  W, H, { pad: 26, azimuth: 45, elevation: 30 });
const V = G.viewOf(P);
const KS = G.scaleOf(P);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (pts, style) => k.dotsSvg(pts, style);
const path3 = (pts, closed = false) => k.pathOf(pts.map(at), closed);

const R = A.recorder(P);
const record = R.solid;
function put(name, ref, svg, shapes = [], { bias = 0, ...rest } = {}) {
  return R.put({ name, at: ref, bias, svg, shapes, piece: "m", ...rest });
}
const FZ = (o) => G.frameOf(o, [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const FX = (o) => G.frameOf(o, [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const FY = (o) => G.frameOf(o, [0, 1, 0], [0, 0, 1], [1, 0, 0]);

function box(name, [x0, y0, z0], [x1, y1, z1], style = {}, { r = 0.6, steps = 2, bevel = 0, extra = "", inner = "", pre = "", bias = 0, owner, ground } = {}) {
  const plan = { x: x0, y: y0, w: x1 - x0, d: y1 - y0, r };
  const shape = record(A.slab(plan, z0, z1 - z0, { name, owner, ground }, steps));
  put(name, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], pre + S(k.slabOf(plan, z0, z1 - z0, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, [shape], { bias });
  return shape;
}
function turned(name, F, profile, style = {}, { extra = "", inner = "", pre = "", bias = 0, smooth, steps, rims, bevel = 0, owner, seated, cut } = {}) {
  const opts = { bevel, ...(smooth !== undefined ? { smooth } : {}), ...(steps ? { steps } : {}), ...(rims ? { rims } : {}) };
  const paths = G.solidOf(profile, F, P, opts);
  const mid = (profile[0][0] + profile[profile.length - 1][0]) / 2;
  const shape = record(A.solid(F, profile, { name, owner, seated, cut }));
  put(name, G.add3(F.o, G.mul3(F.a, mid)), pre + S(paths, { tone: "mid", ...style, inner }) + extra, [shape], { bias });
  return shape;
}
const disc = (name, F, s0, s1, r, style = {}, o = {}) => turned(name, F, [[s0, r], [s1, r]], style, o);
const ROUTES = {};
// a pipe or hose: filleted route, collars at both ends (gapped), recorded for the audit
function pipe(name, points, r, { tone = "mid", rings, maxLength = 14, collar = true, cls = "", limp = false } = {}) {
  const route = G.fillet(points, Math.max(3, r * 2.8), 10, { P, tube: r });
  const total = G.pathLength(route);
  const CL = Math.max(1.6, r * 1.4);
  const gaps = collar ? [[0, CL], [total - CL, total]] : [];
  R.route(name, route, r, { gaps, limp, rims: collar ? [r * 1.7, r * 1.7] : [r, r], piece: "m" });
  ROUTES[name] = route;
  let run = 0;
  tubePieces(route, r, P, { maxLength, spacing: Math.max(0.6, Math.min(1.6, r)), gaps, ...(rings ? { rings } : {}) }).forEach((piece, i) => {
    const flat = piece.points.map(at);
    const bead = cls && !limp && cls !== "glass-tube" ? `<path class="flowbead" d="${k.pathOf(flat)}" style="--o:${(-(run % 6)).toFixed(2)}px"/>` : "";
    for (let j = 1; j < flat.length; j++) run += Math.hypot(flat[j][0] - flat[j - 1][0], flat[j][1] - flat[j - 1][1]);
    put(`${name}:${i}`, piece.mid, `<g class="pipe ${cls}" data-route="${name}">${tubeSvg(piece, { tone })}${bead}</g>`, [A.tube(piece.points, piece.radii)], { bias: 0.05, route: name, chunk: i });
  });
  if (collar) [0, 1].forEach((e) => {
    const end = e ? route[route.length - 1] : route[0];
    const t = G.tangentAlong(route, e ? total : 0);
    const F = G.frameAlong(end, t);
    const [s0, s1] = e ? [-CL, 0] : [0, CL];
    const shape = record(A.disc(F, s0, s1, r * 1.7, { name: `${name}.collar${e}`, owner: name }));
    put(`${name}.collar${e}`, G.add3(end, G.mul3(t, (s0 + s1) / 2)), S(G.disc(s0, s1, r * 1.7, F, P, { steps: 24, bevel: 0.2 }), { tone: "mid" }), [shape], { bias: 0.1 });
  });
  return route;
}
const slot = (name) => `<g data-live="${name}"></g>`;

// ---------- chassis ----------
const back = [];
back.push(`<path class="iso-halo" d="${k.haloOf(C, -8, 8, P)}"/>`);
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
for (const [x, y] of byDepth(k.corners(C, 14))) {
  back.push(S(k.cylinder(x, y, 7, -8, 2, P, 28), { tone: "lo" }));
  back.push(S(k.cylinder(x, y, 5.4, -6, 6, P, 28), { tone: "mid" }));
}
back.push(S(k.slabOf(C, 0, 10, P, 8, 1.4), { tone: "mid", inner: Ln(k.sideSeam(C, 5, P), { tone: "faint" }) }));
back.push(Ln(k.planOutline(k.insetPlan(C, 4), 10, P), { tone: "lo" }));
back.push(Dots(k.corners(C, 8).map(([x, y]) => at([x, y, 10])), { size: 0.5 }));
record(A.slab(C, 0, 10, { name: "stand.chassis", ground: true }, 8));
// ruler strip along the front edge of the chassis
const STRIP = { x: C.x + 50, y: C.y + C.d - 4, w: 110, d: 3, r: 0.6 };
// back wall and left wall (the two panels that stay on)
box("wall.back", [C.x + 2, C.y + 2, 10], [C.x + C.w - 2, C.y + 6, 236], { tone: "mid" }, { r: 0.6, inner: Ln([60, 120, 180].map((z) => k.sideSeam({ x: C.x + 2, y: C.y + 2, w: C.w - 4, d: 4, r: 0.6 }, z, P, 2)).join(""), { tone: "faint" }) });
box("wall.left", [C.x + 2, C.y + 6, 10], [C.x + 6, C.y + C.d - 2, 236], { tone: "mid" }, { r: 0.6, inner: Ln([60, 120, 180].map((z) => k.sideSeam({ x: C.x + 2, y: C.y + 6, w: 4, d: C.d - 8, r: 0.6 }, z, P, 2)).join(""), { tone: "faint" }) });
// top caps on walls
box("wall.cap", [C.x, C.y, 236], [C.x + C.w, C.y + 8, 242], { tone: "mid" }, { r: 1, bevel: 0.5 });
box("wall.capL", [C.x, C.y + 8, 236], [C.x + 8, C.y + C.d, 242], { tone: "mid" }, { r: 1, bevel: 0.5 });
// control panel on the left wall top-front (display + buttons)
const PANEL = { x0: C.x + 6, y0: 20, y1: 56, z0: 196, z1: 228 };
const PX = PANEL.x0 + 3;
const faceAt = (y, z) => [PX + 0.05, y, z];
const dispPts = [faceAt(PANEL.y1 - 4, PANEL.z1 - 4), faceAt(PANEL.y0 + 4, PANEL.z1 - 4), faceAt(PANEL.y0 + 4, PANEL.z1 - 14), faceAt(PANEL.y1 - 4, PANEL.z1 - 14)];
const dispM = (() => { const o = at(faceAt(PANEL.y1 - 5.5, PANEL.z1 - 10.4)), ex = at(faceAt(PANEL.y1 - 6.5, PANEL.z1 - 10.4)), ey = at(faceAt(PANEL.y1 - 5.5, PANEL.z1 - 11.4)); return `matrix(${(ex[0] - o[0]).toFixed(4)} ${(ex[1] - o[1]).toFixed(4)} ${(ey[0] - o[0]).toFixed(4)} ${(ey[1] - o[1]).toFixed(4)} ${o[0].toFixed(2)} ${o[1].toFixed(2)})`; })();
const buttons = [PANEL.y0 + 8, PANEL.y0 + 18, PANEL.y0 + 28].map((y) => `<path class="iso-fill" d="${k.sideRing([PX, y, PANEL.z0 + 8], 2.6, "x", P, 24)}"/><path class="iso-line" data-tone="mid" d="${k.sideRing([PX, y, PANEL.z0 + 8], 2.6, "x", P, 24)}"/>`).join("");
box("panel", [PANEL.x0, PANEL.y0, PANEL.z0], [PANEL.x0 + 3, PANEL.y1, PANEL.z1], { tone: "mid" }, { r: 0.6,
  extra: Dots([[PANEL.y0 + 2, PANEL.z0 + 2], [PANEL.y1 - 2, PANEL.z0 + 2], [PANEL.y0 + 2, PANEL.z1 - 2], [PANEL.y1 - 2, PANEL.z1 - 2]].map(([y, z]) => at([PANEL.x0 + 3, y, z])), { size: 0.45 }) +
  `<path class="bc-display" d="${path3(dispPts, true)}"/><text class="bc-display-text" transform="${dispM}" font-size="3" data-live-text="display">READY</text>` + buttons });

// ---------- water: tank, pump, flow meter, thermoblock ----------
const T = L.tank;
box("tank.base", [T.x - 1, T.y - 1, 10], [T.x + T.w + 1, T.y + T.d + 1, 14], { tone: "mid" }, { r: 2, steps: 3 });
{
  const plan = { x: T.x, y: T.y, w: T.w, d: T.d, r: T.r };
  const shape = record(A.slab(plan, 14, T.z1 - 14, { name: "tank" }, 3));
  let marks = "";
  for (let z = 30; z <= 140; z += 10) marks += k.segment([T.x + T.w, T.y + T.d - 8, z], [T.x + T.w, T.y + T.d - ((z / 10) % 5 === 0 ? 3 : 5), z], P);
  put("tank", [T.x + T.w / 2, T.y + T.d / 2, 80], slot("water") + S(k.slabOf(plan, 14, T.z1 - 14, P, 3, 0.6), { tone: "mid", className: "glass" }) +
    Ln(k.segment([T.x + T.w, T.y + T.d - 8, 24], [T.x + T.w, T.y + T.d - 8, 146], P), { tone: "lo" }) + Ln(marks, { tone: "lo" }), [shape]);
}
box("tank.lid", [T.x - 1, T.y - 1, T.z1], [T.x + T.w + 1, T.y + T.d + 1, T.z1 + 4], { tone: "mid" }, { r: 3, steps: 3, bevel: 0.5 });
box("tank.grip", [T.x + 8, T.y + 12, T.z1 + 4], [T.x + T.w - 8, T.y + 24, T.z1 + 7], { tone: "mid" }, { r: 2, steps: 3 });
// outlet valve boss on the tank's +x face
const PU = L.pump;
box("tank.valve", [T.x + T.w, PU.y - 4, PU.z - 4], [T.x + T.w + 3, PU.y + 4, PU.z + 4], { tone: "mid" }, { r: 1 });
// vibration pump: turned body along x on two rubber mounts
box("pump.mount", [PU.x0 + 2, PU.y - 7, 10], [PU.x1 - 2, PU.y + 7, 13], { tone: "lo" }, { r: 1.5, steps: 3 });
for (const x of [PU.x0 + 6, PU.x1 - 6]) disc(`pump.foot${x}`, FZ([x, PU.y, 13]), 0, PU.z - PU.r - 13, 3, { tone: "lo" });
turned("pump.body", FX([PU.x0, PU.y, PU.z]), [[0, 4.5], [3, 4.5], [3, PU.r], [PU.x1 - PU.x0 - 3, PU.r], [PU.x1 - PU.x0 - 3, 4.5], [PU.x1 - PU.x0, 4.5]], { tone: "hi", lit: true, className: "pump" },
  { inner: Ln([7, 10, 13, 16].map((s) => G.arcOf(FX([PU.x0, PU.y, PU.z]), s, PU.r, P)).join(""), { tone: "faint" }) });
// flow meter: block with a round window over the impeller
const M = L.meter;
box("meter", [M.x, M.y, M.z0], [M.x + M.w, M.y + M.d, M.z1], { tone: "mid" }, { r: 1.2, steps: 3, bevel: 0.4 });
box("meter.base", [M.x - 1, M.y - 1, 10], [M.x + M.w + 1, M.y + M.d + 1, M.z0], { tone: "lo" }, { r: 1.5, steps: 3 });
disc("meter.window", FZ([M.x + M.w / 2, M.y + M.d / 2, M.z1]), 0, 1, 4.6, { tone: "hi", className: "glass" }, { extra: slot("impeller") });
// thermoblock: aluminium block with fins and a heating element
const TB = L.thermo;
box("thermo.bracket", [TB.x + 2, C.y + 6, TB.z0 - 6], [TB.x + TB.w - 2, TB.y + 6, TB.z0], { tone: "lo" }, { r: 0.6 });
{
  let fins = "";
  for (let z = TB.z0 + 6; z < TB.z1 - 3; z += 4) fins += k.sideSeam({ x: TB.x, y: TB.y, w: TB.w, d: TB.d, r: 1.5 }, z, P, 3);
  box("thermo", [TB.x, TB.y, TB.z0], [TB.x + TB.w, TB.y + TB.d, TB.z1], { tone: "mid", className: "thermo" }, { r: 1.5, steps: 3, bevel: 0.6,
    extra: Ln(fins, { tone: "lo", className: "heat" }) });
}
box("thermo.stat", [TB.x + TB.w - 10, TB.y + 4, TB.z1], [TB.x + TB.w - 3, TB.y + 11, TB.z1 + 4], { tone: "mid" }, { r: 1 });
// ---------- grinder tower and hopper ----------
const GX = L.grinder.x, GY = L.grinder.y;
box("grinder.foot", [GX - 10, GY - 10, 10], [GX + 10, GY + 10, 14], { tone: "lo" }, { r: 2, steps: 3 });
turned("grinder.column", FZ([GX, GY, 14]), [[0, 5], [96, 5]], { tone: "mid" }, { inner: Ln([30, 60].map((s) => G.arcOf(FZ([GX, GY, 14]), s, 5, P)).join(""), { tone: "faint" }) });
box("grinder.gearbox", [GX - 11, GY - 11, 110], [GX + 11, GY + 11, 118], { tone: "mid" }, { r: 2, steps: 3, bevel: 0.5 });
const FG = FZ([GX, GY, 118]);
turned("grinder.motor", FG, [[0, 9], [2, 10], [28, 10], [30, 8]], { tone: "mid" }, { inner: Ln([6, 10, 14, 18, 22].map((s) => G.arcOf(FG, s, 10, P)).join(""), { tone: "faint" }) });
turned("grinder.lower", FG, [[30, 13], [40, 13], [40, 11]], { tone: "mid" });
// burr (live) sits in the open window between lower and upper housings: 40..48
turned("grinder.burr", FG, [[40, 6], [41, 9.5], [46, 7], [48, 5]], { tone: "hi", lit: true }, { extra: slot("burr") });
turned("grinder.upper", FG, [[48, 11], [48, 13], [56, 13], [56, 7]], { tone: "mid" });
box("grinder.spout", [GX + 12.5, -9, 149], [GX + 19, 1, 158], { tone: "mid" }, { r: 0.8 });
turned("hopper.neck", FG, [[56, 7], [64, 7]], { tone: "mid" });
{
  const prof = [[64, 7], [66, 8, 1], [72, 13, 1], [82, 20, 1], [96, 23, 1], [104, 24]];
  const F = FG;
  const shape = record(A.solid(F, prof, { name: "hopper" }));
  put("hopper", G.add3(F.o, [0, 0, 84]), slot("beans") + S(G.solidOf(prof, F, P, {}), { tone: "mid", className: "glass" }), [shape]);
}
turned("hopper.lid", FG, [[104, 25], [107, 25], [108, 20], [110, 6], [112, 6]], { tone: "mid" }, { bevel: 0.3 });
// chute from grinder spout to the brew-unit doser
pipe("chute", [[GX + 19, -4, 153.5], [0, -4, 153.5], [0, -4, 134]], 3, { tone: "mid", cls: "glass-tube", collar: false, maxLength: 10 });

// ---------- brew unit ----------
const CH = L.chamber, B = L.block;
box("brew.block", [B.x, B.y, B.z0], [B.x + B.w, B.y + B.d, B.z1], { tone: "mid", className: "glass" }, { r: 1.5, steps: 3, bevel: 0.5,
  extra: Dots([[B.x + 3, B.y + B.d, B.z1 - 3], [B.x + B.w - 3, B.y + B.d, B.z1 - 3], [B.x + B.w, B.y + 3, B.z1 - 3]].map(at), { size: 0.45 }) });
{
  const F = FZ([CH.x, CH.y, CH.z0]);
  const prof = [[0, CH.r + 1.5], [CH.z1 - CH.z0, CH.r + 1.5]];
  const shape = record(A.solid(F, prof, { name: "chamber", owner: "brew" }));
  put("chamber", [CH.x, CH.y, 118], slot("chamber") + S(G.solidOf(prof, F, P, {}), { tone: "mid", className: "glass" }) +
    Ln(G.arcOf(F, 22, CH.r + 1.5, P), { tone: "faint" }), [shape]);
}
disc("chamber.cap", FZ([CH.x, CH.y, CH.z1]), 0, 6, CH.r + 3, { tone: "mid" }, { bevel: 0.4, extra: Dots(G.dotsOf(FZ([CH.x, CH.y, CH.z1]), 6, CH.r + 1, 6, P, { all: true }), { size: 0.45 }) });
disc("chamber.gland", FZ([CH.x, CH.y, CH.z1 + 6]), 0, 3, 4, { tone: "mid" });
for (const dy of [-9, -1]) disc(`drive.post${dy}`, FZ([CH.x - 6, CH.y + dy, CH.z1 + 6]), 0, 14, 1.4, { tone: "lo" });
box("drive", [CH.x - 10, CH.y - 12, CH.z1 + 20], [CH.x + 8, CH.y + 2, CH.z1 + 32], { tone: "mid" }, { r: 1.2, bevel: 0.5 });
const FDM = G.frameOf([CH.x - 10, CH.y - 5, CH.z1 + 26], [-1, 0, 0], [0, 1, 0], [0, 0, 1]);
turned("drive.motor", FDM, [[0, 5], [12, 5], [13, 3.5]], { tone: "mid" }, { inner: Ln([4, 8].map((s) => G.arcOf(FDM, s, 5, P)).join(""), { tone: "faint" }) });
// doser hopper on the chamber side, fed by the chute
box("doser", [-4, -10, 124], [8, 2, 134], { tone: "mid" }, { r: 1, owner: "brew" });
// waste bin under the brew block
const BN = L.bin;
box("bin", [BN.x, BN.y, BN.z0], [BN.x + BN.w, BN.y + BN.d, BN.z1], { tone: "mid", className: "glass" }, { r: 2, steps: 3, pre: slot("bin") });
// ---------- tray, cup, spout head ----------
const TR = L.tray;
{
  const g = { x: TR.x + 4, y: TR.y + 4, w: TR.w - 8, d: TR.d - 8, r: 1 };
  let slots = "";
  for (let x = g.x + 3; x < g.x + g.w - 1; x += 3) slots += k.lineOnTop([x, g.y], [x, g.y + g.d], TR.z1, P);
  box("tray", [TR.x, TR.y, TR.z0], [TR.x + TR.w, TR.y + TR.d, TR.z1], { tone: "mid" }, { r: 2, steps: 3, bevel: 0.6, pre: "",
    extra: slot("drip") + Ln(k.planOutline(g, TR.z1, P, 2), { tone: "lo" }) + Ln(slots, { tone: "faint" }) });
}
{
  const CU = L.cup;
  const F = FZ([CU.x, CU.y, CU.z0]);
  const prof = [[0, CU.r - 2], [1, CU.r - 1, 1], [CU.z1 - CU.z0, CU.r]];
  const shape = record(A.solid(F, prof, { name: "cup" }));
  put("cup", [CU.x, CU.y, 36], slot("cup") + S(G.solidOf(prof, F, P, {}), { tone: "mid", className: "glass" }) + Ln(G.circleOf(F, CU.z1 - CU.z0, CU.r - 0.2, P, 48), { tone: "mid" }) + slot("streams"), [shape]);
}
const HD = L.head;
box("head", [HD.x, HD.y, HD.z0], [HD.x + HD.w, HD.y + HD.d, HD.z1], { tone: "mid" }, { r: 2, steps: 3, bevel: 0.6, owner: "head" });
disc("nozzle.sugar", FZ([24, 44, HD.z0 - 4]), 0, 4, 1.8, { tone: "mid" });
disc("nozzle.coffee", FZ([16, 40, HD.z0 - 6]), 0, 6, 2.2, { tone: "mid" });
disc("nozzle.milk", FZ([30, 40, HD.z0 - 6]), 0, 6, 2.6, { tone: "mid" });
// ---------- milk ----------
const J = L.jug;
{
  const F = FZ([J.x, J.y, J.z0]);
  const prof = [[0, J.r - 1], [1, J.r, 1], [J.z1 - J.z0, J.r]];
  const shape = record(A.solid(F, prof, { name: "jug" }));
  put("jug", [J.x, J.y, 30], slot("milk") + S(G.solidOf(prof, F, P, {}), { tone: "mid", className: "glass" }), [shape]);
}
disc("jug.lid", FZ([J.x, J.y, J.z1]), 0, 3, J.r + 1, { tone: "mid" }, { bevel: 0.4 });
// ---------- sugar: hopper -> horizontal auger with motor -> outlet over a funnel on the spout head ----------
const SG = L.sugar;
const FA = FX([SG.x0, SG.y, SG.z]);
const AUG_LEN = SG.x1 - SG.x0;
box("sugar.bracket", [C.x + 6, SG.y - 3, SG.z - 9.5], [SG.x0 - 12, SG.y + 3, SG.z - 4.5], { tone: "mid" }, { r: 0.6, owner: "sugar", extra: Dots([at([C.x + 9, SG.y, SG.z - 4.5]), at([SG.x0 - 15, SG.y, SG.z - 4.5])], { size: 0.45 }) });
turned("sugar.auger", FA, [[0, 5], [AUG_LEN, 5]], { tone: "mid", className: "glass" }, { pre: slot("auger"), owner: "sugar" });
disc("sugar.cap", FA, -2, 0, 5.6, { tone: "mid" }, { owner: "sugar" });
disc("sugar.capB", FA, AUG_LEN, AUG_LEN + 2, 5.6, { tone: "mid" }, { owner: "sugar" });
turned("sugar.motor", FA, [[-13, 3], [-12, 4.5], [-2, 4.5]], { tone: "mid" }, { owner: "sugar", inner: Ln([-5, -8].map((s) => G.arcOf(FA, s, 4.5, P)).join(""), { tone: "faint" }) });
// outlet spigot under the auger's front end
disc("sugar.spigot", FZ([SG.out, SG.y, SG.z - 9]), 0, 4.2, 2.4, { tone: "mid" }, { owner: "sugar" });
{
  const F = FZ([SG.hop, SG.y, SG.z + 5]);
  const prof = [[0, 4], [6, 5, 1], [16, 11, 1], [30, 12]];
  const shape = record(A.solid(F, prof, { name: "sugar.hopper", owner: "sugar" }));
  put("sugar.hopper", [SG.hop, SG.y, SG.z + 20], slot("sugar") + S(G.solidOf(prof, F, P, {}), { tone: "mid", className: "glass" }), [shape]);
  turned("sugar.lid", F, [[30, 12.6], [32.5, 12.6], [33.5, 4], [35, 4]], { tone: "mid" }, { owner: "sugar" });
}
// mixing funnel on the spout head: sugar falls into it and leaves through the sugar nozzle
{
  const F = FZ([SG.out, SG.y, L.head.z1]);
  const prof = [[0, 2.4], [3, 2.6], [8, 5.5]];
  const shape = record(A.solid(F, prof, { name: "sugar.funnel", owner: "head" }));
  put("sugar.funnel", [SG.out, SG.y, L.head.z1 + 6], slot("funnel") + S(G.solidOf(prof, F, P, {}), { tone: "mid", className: "glass" }) + Ln(G.circleOf(F, 8, 5.3, P, 40), { tone: "mid" }), [shape]);
}
// ---------- pipes ----------
pipe("water.in", [[T.x + T.w + 3, PU.y, PU.z], [PU.x0, PU.y, PU.z]], 1.8, { cls: "water" });
pipe("water.pump", [[PU.x1, PU.y, PU.z], [M.x, PU.y, PU.z]], 1.8, { cls: "water" });
pipe("water.heat", [[M.x + M.w, PU.y, PU.z], [52, PU.y, PU.z], [52, PU.y, TB.z0]], 1.8, { cls: "water" });
pipe("water.brew", [[47, -46, TB.z1], [47, -46, 184], [31, -5, 184], [31, -5, CH.z1 + 6]], 1.8, { cls: "hot" });
pipe("drain", [[B.x, -12, 90], [-8, -12, 90], [-8, -12, 17], [-8, L.tray.y, 17]], 1.4, { cls: "drain" });
pipe("coffee", [[20, B.y + B.d, 90], [20, 24, 90], [20, 24, 81], [20, HD.y, 81]], 1.6, { cls: "coffee" });
pipe("milk", [[J.x, J.y, J.z1 + 3], [J.x, J.y, 81], [J.x, 41, 81], [HD.x + HD.w, 41, 81]], 2, { cls: "milk", rings: { pitch: 2.2, tone: "lo" } });
pipe("steam", [[60, TB.y + TB.d, 88], [60, -18, 88], [32, 22, 88], [32, 22, 81], [32, HD.y, 81]], 1.5, { cls: "steam" });

// controller board on the back wall, with its loom to the grinder and the thermostat
box("board", [-14, C.y + 6, 196], [34, C.y + 9, 226], { tone: "mid" }, { r: 0.6, extra: Dots([[-11, 199], [31, 199], [-11, 223], [31, 223]].map(([x, z]) => at([x, C.y + 9, z])), { size: 0.45 }) });
box("board.mcu", [-2, C.y + 9, 206], [10, C.y + 10.2, 218], { tone: "lo" }, { r: 0.3 });
box("board.relay", [16, C.y + 9, 204], [26, C.y + 14, 214], { tone: "mid" }, { r: 0.4 });
box("board.cap", [-10, C.y + 9, 214], [-5, C.y + 13, 220], { tone: "mid" }, { r: 0.4 });
pipe("loom.grinder", [[-8, -54.5, 196], [-8, -54.5, 114], [GX, -54.5, 114], [GX, GY - 11, 114]], 0.7, { tone: "lo", limp: true, collar: true });
pipe("loom.heater", [[TB.x + TB.w - 3, -46.5, TB.z1 + 2], [78, -46.5, TB.z1 + 2], [78, -54.5, TB.z1 + 2], [78, -54.5, 190], [30, -54.5, 190], [30, -54.5, 196]], 0.7, { tone: "lo", limp: true, collar: true });
A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
const groups = R.items.map((it) => `<g class="it" data-name="${it.name}">${it.svg}</g>`);

const svg = k.figureSvg({ width: W, height: H, label: "Bean-to-cup coffee machine with its front and right panels off.", body: [...back, `<g class="m">${groups.join("")}</g>`, slot("overlay")] });
export const BUILT = { svg, P, R, ROUTES };
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain && !process.argv.includes("--geom-only")) {
  const { page } = await import("./page.mjs");
  const html = page({ THEME, svg, P, L, ROUTES, kitScript, readFileSync, join, HERE });
  const name = THEME === "light" ? "bean-to-cup-light.html" : "bean-to-cup.html";
  writeFileSync(join(HERE, name), html);
  console.log("wrote", name, `${(html.length / 1024).toFixed(0)} KB`, `${R.items.length} items`);
}
A.auditOrExit(R, P, {});
