import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../.skill/kit/iso-kit.mjs";
import * as G from "../../../../.skill/kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../../../../.skill/kit/tube.mjs";
import * as A from "../../../../.skill/kit/audit.mjs";
import { kitScript } from "../../../../.skill/scripts/inline-kit.mjs";
import { RACK, MODEL, derive, flowLpm, returnC, COOLANT } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";
const DER = derive();
const FLOW = flowLpm(DER.liquidKw);

// World units are centimetres. x across the rack, y front-to-back (front at +y), z up.
const W = 600;
const H = 680;
const AZIMUTH = 48;
const ELEVATION = 26;

const FLOOR = { x: -82, y: -12, w: 246, d: 198, r: 4 };
const FLOOR_T = 3;
const RX = [0, 60];
const RY = [0, 107];
const RZ = 226;
const SLIDE = 76;

const P = k.fitProjection(
  [...k.boxCorners(FLOOR, -FLOOR_T - 16, 0), [-62, 0, 228], [-58, 26, 250], [-58, 42, 250], [146, 26, 250], [46, 116, 250], [60, 116, 250]],
  W,
  H,
  { pad: 26, azimuth: AZIMUTH, elevation: ELEVATION },
);
const V = G.viewOf(P);
const KS = G.scaleOf(P);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const path3 = (points, closed = false) => k.pathOf(points.map(at), closed);
const f2 = (v) => Math.round(v * 100) / 100;

const STAGGER = ["tray"];
const SPRING = { stagger: 0.035, stiffness: 40, damping: 12.6, substeps: 4 };
const R = A.recorder(P, { order: STAGGER, spring: SPRING });
const record = R.solid;
const MOVES = { tray: [0, SLIDE, 0] };
let GROUP = "rack";
let PIECE = "rack";
function put(name, ref, svg, shapes = [], { bias = 0, grp = GROUP, piece = PIECE, ...rest } = {}) {
  const move = MOVES[piece] ?? [0, 0, 0];
  return R.put({ name, at: ref, bias, svg, shapes, piece, move, grp, ...rest });
}
function box(name, [x0, y0, z0], [x1, y1, z1], style = {}, { r = 0.3, steps = 2, bevel = 0, extra = "", inner = "", bias = 0, owner, grp, piece } = {}) {
  const plan = { x: x0, y: y0, w: x1 - x0, d: y1 - y0, r };
  const shape = record(A.slab(plan, z0, z1 - z0, { name, owner }, steps));
  put(name, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], S(k.slabOf(plan, z0, z1 - z0, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, [shape], { bias, grp, piece });
  return shape;
}
function turned(name, F, profile, style = {}, { extra = "", inner = "", bias = 0, steps, bevel = 0, owner, grp, piece } = {}) {
  const paths = G.solidOf(profile, F, P, { bevel, ...(steps ? { steps } : {}) });
  const mid = (profile[0][0] + profile[profile.length - 1][0]) / 2;
  const shape = record(A.solid(F, profile, { name, owner }));
  put(name, G.add3(F.o, G.mul3(F.a, mid)), S(paths, { tone: "mid", ...style, inner }) + extra, [shape], { bias, grp, piece });
  return shape;
}
const disc = (name, F, s0, s1, r, style = {}, options = {}) => turned(name, F, [[s0, r], [s1, r]], style, options);
function ball(name, c, r, style = {}, { bias = 0, extra = "", grp, piece, owner } = {}) {
  const shape = record(A.ball(c, r, { name, owner }));
  put(name, c, S(G.sphereOf(c, r, P, { steps: 32 }), { tone: "mid", ...style }) + extra, [shape], { bias, grp, piece });
  return shape;
}
const FY = (y) => ({ y }); // marker for front-face helpers
// Closed rectangle on a face of constant y (x, z coordinates).
const rectY = (y, x0, x1, z0, z1) => path3([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], true);
const rectX = (x, y0, y1, z0, z1) => path3([[x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1]], true);
const rectZ = (z, x0, x1, y0, y1) => path3([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], true);
const dotsY = (y, list) => list.map(([x, z]) => at([x, y, z]));

// Tubes: pipes and cables.
const ROUTES = [];
function tube(name, points, r, { tone = "mid", bend, ends = [true, true], shells = [false, false], flanges = [false, false], rings, maxLength = 18, bias = 0.05, limp = false, touch, bundle, grp, piece, free, gaps: extraGaps = [], owner } = {}) {
  const route = G.fillet(points, Math.max(bend ?? r * 2.8, r * 2.6), 10, { P, tube: r });
  const total = G.pathLength(route);
  const SHELL = Math.max(1.2, r * 2.4);
  const FL = Math.max(0.6, r * 0.8);
  const gaps = [...(shells[0] ? [[0, SHELL]] : []), ...(flanges[0] ? [[0, FL]] : []), ...extraGaps, ...(shells[1] ? [[total - SHELL, total]] : []), ...(flanges[1] ? [[total - FL, total]] : [])];
  R.route(name, route, r, { gaps, limp, touch, bundle, free, rims: [0, 1].map((i) => (shells[i] ? r * 1.8 : flanges[i] ? r * 1.9 : r)), piece: piece ?? PIECE, move: MOVES[piece ?? PIECE] ?? [0, 0, 0], owner });
  ROUTES.push(name);
  tubePieces(route, r, P, { maxLength, spacing: Math.max(0.5, Math.min(1.6, r)), gaps, ...(rings ? { rings } : {}) }).forEach((pc, index) =>
    put(`${name}:${index}`, pc.mid, tubeSvg(pc, { tone }), [A.tube(pc.points, pc.radii, { owner, limp, touch, bundle })], { bias, grp, piece, route: name, chunk: index, attrs: ` data-route="${name}"` }),
  );
  [0, 1].forEach((index) => {
    const end = index ? route[route.length - 1] : route[0];
    const tangent = G.tangentAlong(route, index ? total : 0);
    if (shells[index] || flanges[index]) {
      const len = shells[index] ? SHELL : FL;
      const rad = shells[index] ? r * 1.8 : r * 1.9;
      const F = G.frameAlong(end, tangent);
      const [s0, s1] = index ? [-len, 0] : [0, len];
      const shape = record(A.disc(F, s0, s1, rad, { name: `${name}.end${index}`, owner: name }));
      put(`${name}.end${index}`, G.add3(end, G.mul3(tangent, (s0 + s1) / 2)), S(G.disc(s0, s1, rad, F, P, { steps: 24, bevel: 0.15 }), { tone: "mid" }), [shape], { bias: bias + 0.1, grp, piece });
    } else if (ends[index]) {
      const size = Math.max(0.5, r * KS * 0.9);
      put(`${name}.dot${index}`, end, Dots([at(end)], { size, tone: "hi" }), [record(A.ball(end, size / KS, { name: `${name}.dot${index}`, owner: name }))], { bias: bias + 0.15, grp, piece });
    }
  });
  return route;
}

const back = [];
// ---------------------------------------------------------------- floor
// A section of raised floor: 60 cm tiles on pedestals, one perforated tile in front of the rack.
back.push(`<path class="iso-halo" d="${k.haloOf(FLOOR, -FLOOR_T - 16, FLOOR_T, P)}"/>`);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
for (const [x, y] of byDepth(k.corners(FLOOR, 16))) {
  back.push(S(k.cylinder(x, y, 7, -FLOOR_T - 16, 1.4, P, 28), { tone: "lo" }));
  back.push(S(k.cylinder(x, y, 2.2, -FLOOR_T - 14.6, 12.2, P, 20), { tone: "mid", crease: "none" }));
  back.push(S(k.cylinder(x, y, 5.6, -FLOOR_T - 2.4, 2.4, P, 28), { tone: "mid" }));
}
const tileSeams = [];
for (let x = FLOOR.x + 22; x < FLOOR.x + FLOOR.w; x += 60) tileSeams.push(k.lineOnTop([x, FLOOR.y], [x, FLOOR.y + FLOOR.d], 0, P));
for (let y = FLOOR.y + 12; y < FLOOR.y + FLOOR.d; y += 60) tileSeams.push(k.lineOnTop([FLOOR.x, y], [FLOOR.x + FLOOR.w, y], 0, P));
back.push(S(k.slabOf(FLOOR, -FLOOR_T, FLOOR_T, P, 6, 0.8), { tone: "mid", inner: Ln(k.sideSeam(FLOOR, -1.2, P, 6), { tone: "faint" }) }));
back.push(Ln(tileSeams.join(""), { tone: "faint" }));
// perforated tile in front of the rack (cold aisle)
const PERF = { x: 0, y: 120, w: 60, d: 60 };
back.push(Dots(k.dotGrid(PERF.x + 4, PERF.y + 4, 14, 14, 3.8, 0, P), { size: 0.42, tone: "lo" }));
record(A.slab(FLOOR, -FLOOR_T, FLOOR_T, { name: "stand.floor", ground: true }, 6));
const LABEL = { x: FLOOR.x + FLOOR.w - 44, y: FLOOR.y + FLOOR.d - 18, w: 34, d: 12, r: 1 };
back.push(S(k.slabOf(LABEL, 0, 0.5, P, 3), { tone: "lo", crease: "none" }));
back.push(Ln(k.planOutline(k.insetPlan(LABEL, 1.2), 0.5, P, 3), { tone: "faint" }));
back.push(Ln([22, 15, 18].map((w, i) => k.lineOnTop([LABEL.x + 3.4, LABEL.y + 3 + i * 3], [LABEL.x + 3.4 + w, LABEL.y + 3 + i * 3], 0.5, P)).join(""), { tone: "lo", free: true }));
back.push(Dots([at([LABEL.x + LABEL.w - 2.4, LABEL.y + 2.4, 0.5]), at([LABEL.x + LABEL.w - 2.4, LABEL.y + LABEL.d - 2.4, 0.5])], { size: 0.45 }));

// ---------------------------------------------------------------- rack frame
GROUP = "rack";
const U = 4.445;
const Z0 = 10;
const YF = 104; // tray front-plate back face
const YP = 105.4; // tray front-plate front face
const TX = [8.5, 51.5];
const TY0 = 26;
for (const [x, y] of byDepth([[4, 5], [56, 5], [4, 102], [56, 102]])) {
  const F = G.frameOf([x, y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  const shapes = [record(A.disc(F, 0, 1, 3, { name: "rack.leveler.pad" })), record(A.disc(F, 1, 2.4, 1.8, { name: "rack.leveler.nut" })), record(A.disc(F, 2.4, 3, 1, { name: "rack.leveler.stem" }))];
  put("rack.leveler", [x, y, 1.5], S(G.disc(0, 1, 3, F, P, { steps: 28 }), { tone: "lo" }) + S(G.disc(1, 2.4, 1.8, F, P, { steps: 6 }), { tone: "mid" }) + S(G.disc(2.4, 3, 1, F, P, { steps: 16 }), { tone: "mid" }), shapes);
}
box("rack.base", [0, 0, 3], [60, 107, 8], { tone: "lo" }, { r: 0.6, steps: 3, extra: Dots([[10, 107, 5.5], [30, 107, 5.5], [50, 107, 5.5], [60, 20, 5.5], [60, 54, 5.5], [60, 88, 5.5]].map(at), { size: 0.45, tone: "mid" }) });
for (const [x, y] of [[0, 0], [57, 0], [0, 104], [57, 104]]) box("rack.post", [x, y, 8], [x + 3, y + 3, RZ - 5], { tone: "mid" });
box("rack.side", [0, 3, 8], [1.2, 104, RZ - 5], { tone: "lo" });
box("rack.beam.low", [57, 3, 8], [60, 104, 11], { tone: "mid" });
box("rack.beam.high", [57, 3, RZ - 9], [60, 104, RZ - 5], { tone: "mid" });
box("rack.rear.beam", [3, 0, RZ - 9], [57, 3, RZ - 5], { tone: "mid" });
box("rack.roof.rear", [0, 0, RZ - 5], [60, 3, RZ], { tone: "mid" });
box("rack.roof", [0, 8.2, RZ - 5], [60, 107, RZ], { tone: "mid" }, { r: 0.6, steps: 3, bevel: 0.4, extra: Ln(Array.from({ length: 6 }, (_, i) => rectZ(RZ, 8 + i * 4, 10 + i * 4, 70, 96)).join(""), { tone: "faint" }) });
// EIA rails, front
for (let zr = Z0; zr + U <= 221.01; zr += U) for (const x0 of [5, 52]) box("rack.rail", [x0, 101, zr], [x0 + 3, YF, zr + U], { tone: "lo" });
for (const x0 of [5, 52]) box("rack.rail.foot", [x0, 101, 8], [x0 + 3, YF, Z0], { tone: "lo" });

// ---------------------------------------------------------------- the stack
// Bottom to top: 4 power shelves, 8 compute trays, 9 NVLink switch trays, 10 compute trays,
// 4 power shelves, 2 management switches, then vented blanks.
const STACK = [];
const order = [["power", 4], ["compute", 8], ["switch", 9], ["compute", 10], ["power", 4], ["mgmt", 2]];
let slot = 0;
for (const [kind, n] of order) for (let i = 0; i < n; i++) STACK.push({ kind, z0: Z0 + slot++ * U });
const BLANK_FROM = Z0 + slot * U;
let computeIndex = 0;
for (const s of STACK) if (s.kind === "compute") s.ct = computeIndex++;
const SEL = STACK.find((s) => s.kind === "compute" && s.ct === 15);
const SEL_INDEX = STACK.indexOf(SEL);

const LED_GPU = [];
const LED_SW = [];
function frontPlate(s, name) {
  const z0 = s.z0 + 0.05;
  const z1 = s.z0 + U - 0.05;
  const zc = (z0 + z1) / 2;
  const lines = [];
  const lo = [];
  const dots = [];
  const extra = [];
  // ears and screws
  dots.push([6.6, zc], [53.4, zc]);
  lines.push(rectY(YP, 8.5, 51.5, z0 + 0.4, z1 - 0.4));
  if (s.kind === "compute") {
    for (let i = 0; i < 8; i++) lo.push(rectY(YP, 10 + i * 1.7, 11.2 + i * 1.7, z0 + 0.7, z1 - 0.7));
    for (let i = 0; i < 4; i++) lines.push(rectY(YP, 25 + i * 4.3, 28.6 + i * 4.3, zc - 0.9, zc + 0.9));
    lines.push(rectY(YP, 42.6, 45.2, zc - 0.8, zc + 0.8), rectY(YP, 45.8, 48.4, zc - 0.8, zc + 0.8));
    const leds = [0, 1, 2, 3].map((i) => [26.8 + i * 4.3, z1 - 0.45]);
    LED_GPU.push(...leds);
    extra.push(`<g class="ar-led ar-led-gpu">${Dots(dotsY(YP, leds), { size: 0.62, tone: "hi" })}</g>`);
  } else if (s.kind === "switch") {
    for (let i = 0; i < 12; i++) lo.push(rectY(YP, 10.5 + i * 2.2, 11.9 + i * 2.2, z0 + 0.8, z1 - 0.8));
    lines.push(rectY(YP, 38, 40.4, zc - 0.7, zc + 0.7), rectY(YP, 41, 43.4, zc - 0.7, zc + 0.7));
    LED_SW.push([46, zc], [48.6, zc]);
    extra.push(`<g class="ar-led ar-led-sw">${Dots(dotsY(YP, [[46, zc], [48.6, zc]]), { size: 0.62, tone: "hi" })}</g>`);
  } else if (s.kind === "power") {
    for (let i = 0; i < 6; i++) {
      const x0 = 9 + i * 7.1;
      lines.push(rectY(YP, x0, x0 + 6.6, z0 + 0.5, z1 - 0.5));
      lo.push(rectY(YP, x0 + 0.8, x0 + 3.2, z0 + 1, z1 - 1));
      dots.push([x0 + 5.4, zc]);
    }
  } else {
    for (let c = 0; c < 12; c++) for (const dz of [-0.8, 0.8]) lo.push(rectY(YP, 12 + c * 2.1, 13.4 + c * 2.1, zc + dz - 0.5, zc + dz + 0.5));
    dots.push([44, zc + 0.6], [46, zc + 0.6], [48, zc + 0.6]);
  }
  extra.push(Ln(lines.join(""), { tone: "lo" }), Ln(lo.join(""), { tone: "faint" }), Dots(dotsY(YP, dots), { size: 0.45, tone: "mid" }));
  return extra.join("");
}

function trayBody(s, name) {
  const z0 = s.z0 + 0.05;
  const z1 = s.z0 + U - 0.05;
  const side = s.kind === "power" ? 0 : 1;
  box(`${name}.body`, [TX[0], TY0, z0], [TX[1], YF, z1], { tone: s.kind === "switch" ? "mid" : "lo" }, {
    inner: Ln(rectX(TX[1], 30, 96, z0 + 0.8, z1 - 0.8), { tone: "faint" }),
  });
}

GROUP = "stack";
for (const s of STACK) {
  if (s === SEL) continue;
  const name = `${s.kind}${s.kind === "compute" ? s.ct : ""}`;
  GROUP = s.kind === "switch" ? "switch" : s.kind === "power" ? "power" : s.kind === "mgmt" ? "fabric" : "stack";
  trayBody(s, name);
  box(`${name}.plate`, [5, YF, s.z0 + 0.05], [55, YP, s.z0 + U - 0.05], { tone: "mid" }, { extra: frontPlate(s, name) });
  for (const x of [9.2, 49.4]) box(`${name}.handle`, [x, YP, s.z0 + 1.3], [x + 1.4, YP + 1.4, s.z0 + U - 1.3], { tone: "mid" });
}
GROUP = "rack";
// vented blanking panels above the stack
for (let z = BLANK_FROM; z + U <= 221; z += U) {
  box("rack.blank", [5, YF, z + 0.05], [55, YP - 0.6, z + U - 0.05], { tone: "lo" }, {
    extra: Ln(Array.from({ length: 10 }, (_, i) => rectY(YP - 0.6, 10 + i * 4, 12.4 + i * 4, z + 1.2, z + U - 1.2)).join(""), { tone: "faint" }) + Dots(dotsY(YP - 0.6, [[6.6, z + U / 2], [53.4, z + U / 2]]), { size: 0.45 }),
  });
}

// ---------------------------------------------------------------- rear zone
// NVLink spine: three copper cable cartridges behind the trays, a 48 V busbar, two coolant manifolds.
GROUP = "spine";
const LIQUID = STACK.filter((s) => s.kind === "compute" || s.kind === "switch");
const SP_Z = [STACK.find((s) => s.kind === "compute").z0, STACK.filter((s) => s.kind === "compute").at(-1).z0 + U];
const CARTS = [[18.2, 27.2], [32.2, 41.6], [42.4, 51.4]];
const SPINE_GLOW = [];
for (const [x0, x1] of CARTS) {
  const inner = [];
  // twinax bundles run the full height, end on the top and bottom faces
  for (let i = 1; i < 7; i++) inner.push(path3([[x1, 7.4 + i * 1.37, SP_Z[0]], [x1, 7.4 + i * 1.37, SP_Z[1]]]));
  const bands = LIQUID.map((s) => k.sideSeam({ x: x0, y: 7.4, w: x1 - x0, d: 9.6, r: 0.3 }, s.z0 + U / 2, P, 2)).join("");
  box(`spine.cart`, [x0, 7.4, SP_Z[0]], [x1, 17, SP_Z[1]], { tone: "mid" }, { inner: Ln(inner.join(""), { tone: "faint" }) + Ln(bands, { tone: "lo" }) + Ln(inner.join(""), { tone: "lit", className: "ar-glow" }) });
  SPINE_GLOW.push({ x0, x1 });
  // connector blocks facing the trays
  for (const s of LIQUID) if (s !== SEL) box("spine.conn", [x0 + 1, 17, s.z0 + 0.8], [x1 - 1, TY0, s.z0 + U - 0.8], { tone: "lo" });
  if (LIQUID.includes(SEL)) box("spine.conn.open", [x0 + 1, 17, SEL.z0 + 0.8], [x1 - 1, 22, SEL.z0 + U - 0.8], { tone: "lo", }, { extra: Ln(rectY(22, x0 + 1.8, x1 - 1.8, SEL.z0 + 1.5, SEL.z0 + U - 1.5), { tone: "faint" }) });
  box("spine.cap", [x0, 7.4, SP_Z[1]], [x1, 17, SP_Z[1] + 2], { tone: "lo" });
  box("spine.foot", [x0, 7.4, SP_Z[0] - 2], [x1, 17, SP_Z[0]], { tone: "lo" });
}
GROUP = "power";
box("busbar", [28, 20, Z0], [31.4, 22, BLANK_FROM], { tone: "hi" }, { inner: Ln(STACK.map((s) => path3([[31.4, 20, s.z0 + U / 2], [31.4, 22, s.z0 + U / 2]])).join(""), { tone: "lo" }) });
for (const s of STACK) if (s !== SEL) box("busbar.clip", [27.6, 22, s.z0 + 1.2], [31.8, TY0, s.z0 + U - 1.2], { tone: "lo" });
box("busbar.foot", [26.4, 18.6, Z0 - 2], [33, 23.4, Z0], { tone: "lo" });
// coolant manifolds: rectangular stainless headers with a blind-mate quick disconnect per liquid-cooled tray
GROUP = "cool";
const MAN = { s: [9.4, 12.2], r: [14.0, 16.8], y: [4.0, 7.2] };
const QD_R = 0.62;
const QZ = { s: 1.45, r: 2.65 };
for (const [key, [x0, x1]] of [["supply", MAN.s], ["return", MAN.r]]) {
  box(`manifold.${key}`, [x0, MAN.y[0], LIQUID[0].z0 - 3], [x1, MAN.y[1], 205], { tone: "hi" }, { inner: Ln(k.sideSeam({ x: x0, y: MAN.y[0], w: x1 - x0, d: MAN.y[1] - MAN.y[0], r: 0.3 }, 200, P, 2), { tone: "faint" }) });
  const xc = (x0 + x1) / 2;
  for (const s of LIQUID) {
    const zc = s.z0 + 0.05 + (key === "supply" ? QZ.s : QZ.r);
    const F = G.frameAlong([xc, MAN.y[1], zc], [0, 1, 0]);
    disc(`qd.${key}`, F, 0, 9.4, QD_R * 0.62, { tone: "mid" });
    disc(`qd.${key}.socket`, F, 9.4, 23 - MAN.y[1], QD_R, { tone: "mid" }, { extra: s === SEL ? Ln(G.circleOf(F, 23 - MAN.y[1], QD_R * 0.5, P, 16), { tone: "lo" }) : "" });
  }
  box(`manifold.${key}.foot`, [x0 - 0.6, MAN.y[0] - 0.6, LIQUID[0].z0 - 5], [x1 + 0.6, MAN.y[1] + 0.6, LIQUID[0].z0 - 3], { tone: "lo" });
}
// brackets holding the manifolds to the rear beam
for (const z of [60, 120, 180]) box("manifold.bracket", [3, 2, z], [17.4, 4.0, z + 2], { tone: "lo" });

// quick-disconnect plugs on every liquid-cooled tray's rear face (not the pulled tray: it has its own)
GROUP = "cool";
for (const s of LIQUID) {
  if (s === SEL) continue;
  for (const [key, x] of [["supply", (MAN.s[0] + MAN.s[1]) / 2], ["return", (MAN.r[0] + MAN.r[1]) / 2]]) {
    const F = G.frameAlong([x, 23, s.z0 + 0.05 + (key === "supply" ? QZ.s : QZ.r)], [0, 1, 0]);
    disc(`plug.${key}`, F, 0, 3, QD_R * 0.8, { tone: "lo" });
  }
}

// ---------------------------------------------------------------- the pulled compute tray
// One GB300 compute tray, lid off: 4 B300 GPUs on SXM modules under cold plates, 2 Grace CPUs,
// LPDDR5X modules, 4 ConnectX-8 SuperNICs, a BlueField-3 DPU and 8 E1.S drives. It slides out on its rails.
PIECE = "tray";
GROUP = "tray";
const zt = SEL.z0 + 0.05;
const z = (dz) => zt + dz;
box("tray.pan", [TX[0], TY0, zt], [TX[1], YF, z(0.3)], { tone: "lo" }, { inner: Ln(k.sideSeam({ x: TX[0], y: TY0, w: TX[1] - TX[0], d: YF - TY0, r: 0.3 }, z(0.15), P, 2), { tone: "faint" }) });
box("tray.wall.left", [TX[0], TY0, z(0.3)], [TX[0] + 0.5, YF, z(3.6)], { tone: "lo" });
box("tray.wall.rear", [TX[0] + 0.5, TY0, z(0.3)], [TX[1] - 0.5, TY0 + 0.5, z(3.6)], { tone: "lo" });
box("tray.wall.right", [TX[1] - 0.5, TY0, z(0.3)], [TX[1], YF, z(3.6)], { tone: "lo" }, { inner: Ln(rectX(TX[1], 30, 96, z(0.9), z(3.0)), { tone: "faint" }) });
box("tray.plate", [5, YF, zt], [55, YP, SEL.z0 + U - 0.05], { tone: "mid" }, { extra: frontPlate(SEL, "tray") });
for (const x of [9.2, 49.4]) box("tray.handle", [x, YP, SEL.z0 + 1.3], [x + 1.4, YP + 1.4, SEL.z0 + U - 1.3], { tone: "mid" });
// rails on the tray's sides that ride in the rack's slides
for (const x0 of [TX[0] - 0.9, TX[1]]) box("tray.slide", [x0, TY0 + 0.5, z(1.4)], [x0 + 0.9, YF - 1, z(2.6)], { tone: "mid" });
for (const x0 of [5.6, TX[1] + 0.9]) box("rack.slide", [x0, TY0 + 2, z(1.2)], [x0 + 2.0 - (x0 > 50 ? 0.5 : 0), 101, z(2.8)], { tone: "lo" }, { piece: "rack", grp: "rack" });
// motherboards
const BOARDS = [[11.1, 30.1], [31.1, 49.6]];
for (const [x0, x1] of BOARDS) box("tray.board", [x0, 30, z(0.3)], [x1, 78, z(0.5)], { tone: "lo" }, { inner: Ln(rectZ(z(0.5), x0 + 0.6, x1 - 0.6, 30.6, 77.4), { tone: "faint" }) });
const GPU_X = [[11.5, 20.1], [21.3, 29.9], [31.5, 40.1], [40.9, 49.5]];
const GPU_Y = [32.6, 42.6];
const GPUS = [];
GPU_X.forEach(([x0, x1], i) => {
  const xc = (x0 + x1) / 2;
  GROUP = "gpu";
  box("gpu.module", [x0, GPU_Y[0], z(0.5)], [x1, GPU_Y[1], z(0.9)], { tone: "mid" }, { extra: Dots([[x0 + 0.5, GPU_Y[0] + 0.5], [x1 - 0.5, GPU_Y[0] + 0.5], [x0 + 0.5, GPU_Y[1] - 0.5], [x1 - 0.5, GPU_Y[1] - 0.5]].map(([x, y]) => at([x, y, z(0.9)])), { size: 0.4 }) });
  const fins = Array.from({ length: 9 }, (_, f) => path3([[x0 + 0.9 + f * 0.85, GPU_Y[0] + 0.5, z(3.3)], [x0 + 0.9 + f * 0.85, GPU_Y[1] - 0.5, z(3.3)]])).join("");
  box("gpu.coldplate", [x0 + 0.4, GPU_Y[0] + 0.5, z(0.9)], [x1 - 0.4, GPU_Y[1] - 0.5, z(3.3)], { tone: "hi" }, { r: 0.4, bevel: 0.3, extra: Ln(fins, { tone: "faint" }) + Dots([[x0 + 0.9, GPU_Y[0] + 1], [x1 - 0.9, GPU_Y[0] + 1], [x0 + 0.9, GPU_Y[1] - 1], [x1 - 0.9, GPU_Y[1] - 1]].map(([x, y]) => at([x, y, z(3.3)])), { size: 0.42, tone: "lo" }) });
  GPUS.push({ xc, i });
});
GROUP = "cpu";
const CPU_Y = [50, 57];
const CPUS = BOARDS.map(([x0, x1]) => (x0 + x1) / 2);
for (const xc of CPUS) {
  box("cpu.package", [xc - 3.4, CPU_Y[0], z(0.5)], [xc + 3.4, CPU_Y[1], z(0.8)], { tone: "mid" });
  box("cpu.coldplate", [xc - 2.8, CPU_Y[0] + 0.5, z(0.8)], [xc + 2.8, CPU_Y[1] - 0.5, z(3.3)], { tone: "hi" }, { r: 0.4, bevel: 0.3 });
  for (let m = 0; m < 4; m++) box("cpu.socamm", [xc - 4.6 + m * 2.4, 60, z(0.5)], [xc - 3.0 + m * 2.4, 67, z(0.85)], { tone: "lo" }, { extra: Dots([at([xc - 3.8 + m * 2.4, 66.2, z(0.85)])], { size: 0.35, tone: "mid" }) });
}
// coolant rails across the tray: supply low, return above it
GROUP = "cool";
const RAIL_Y = [45.2, 46.6];
box("tray.rail.supply", [9.6, RAIL_Y[0], z(0.9)], [49.6, RAIL_Y[1], z(2.0)], { tone: "mid" });
box("tray.rail.return", [9.6, RAIL_Y[0], z(2.1)], [49.6, RAIL_Y[1], z(3.2)], { tone: "hi" });
const HOSE_R = 0.3;
function jumper(name, from, to) {
  tube(name, [from, to], HOSE_R, { tone: "mid", flanges: [true, true], maxLength: 8, grp: "cool", piece: "tray" });
}
GPUS.forEach(({ xc }, i) => {
  jumper(`hose.gpu${i}.in`, [xc - 1.8, RAIL_Y[0], z(QZ.s)], [xc - 1.8, GPU_Y[1] - 0.5, z(QZ.s)]);
  jumper(`hose.gpu${i}.out`, [xc + 1.8, RAIL_Y[0], z(QZ.r)], [xc + 1.8, GPU_Y[1] - 0.5, z(QZ.r)]);
});
CPUS.forEach((xc, i) => {
  jumper(`hose.cpu${i}.in`, [xc - 1.2, RAIL_Y[1], z(QZ.s)], [xc - 1.2, CPU_Y[0] + 0.5, z(QZ.s)]);
  jumper(`hose.cpu${i}.out`, [xc + 1.2, RAIL_Y[1], z(QZ.r)], [xc + 1.2, CPU_Y[0] + 0.5, z(QZ.r)]);
});
// feed hoses from the rear quick disconnects up the right-hand channel to the rail ends
const QX = { s: (MAN.s[0] + MAN.s[1]) / 2, r: (MAN.r[0] + MAN.r[1]) / 2 };
for (const [key, zz] of [["supply", QZ.s], ["return", QZ.r]]) {
  const F = G.frameAlong([QX[key[0]], TY0, z(zz)], [0, -1, 0]);
  disc(`tray.qd.${key}`, F, 0, 3, QD_R * 0.8, { tone: "mid" });
  disc(`tray.qd.${key}.bulkhead`, G.frameAlong([QX[key[0]], TY0 + 0.5, z(zz)], [0, 1, 0]), 0, 0.6, QD_R * 1.1, { tone: "lo" });
}
tube("hose.feed.supply", [[QX.s, TY0 + 1.1, z(QZ.s)], [QX.s, 29, z(QZ.s)], [10.5, 31, z(QZ.s)], [10.5, RAIL_Y[0], z(QZ.s)]], 0.3, { tone: "mid", flanges: [false, true], ends: [false, false], maxLength: 6, grp: "cool", piece: "tray", bend: 1.1 });
tube("hose.feed.return", [[QX.r, TY0 + 1.1, z(QZ.r)], [QX.r, 29.5, z(QZ.r)], [10.5, 32.4, z(QZ.r)], [10.5, RAIL_Y[0], z(QZ.r)]], 0.3, { tone: "mid", flanges: [false, true], ends: [false, false], maxLength: 6, grp: "cool", piece: "tray", bend: 1.1 });
// network: 4 ConnectX-8 SuperNICs behind the OSFP cages, a BlueField-3, E1.S drives
GROUP = "fabric";
for (let i = 0; i < 4; i++) {
  const x0 = 25 + i * 4.3;
  const fins = Array.from({ length: 4 }, (_, f) => path3([[x0 + 0.6 + f * 0.8, 85, z(2.4)], [x0 + 0.6 + f * 0.8, 100, z(2.4)]])).join("");
  box("nic.card", [x0, 82, z(0.5)], [x0 + 3.6, YF, z(1.0)], { tone: "lo" });
  box("nic.sink", [x0 + 0.2, 85, z(1.0)], [x0 + 3.4, 100, z(2.4)], { tone: "mid" }, { extra: Ln(fins, { tone: "faint" }) });
}
box("dpu.card", [42.6, 80, z(0.5)], [48.4, YF, z(1.0)], { tone: "lo" });
box("dpu.sink", [43, 84, z(1.0)], [48, 98, z(2.2)], { tone: "mid" });
GROUP = "tray";
for (let i = 0; i < 8; i++) box("e1s", [10 + i * 1.7, 90, z(0.5)], [11.2 + i * 1.7, YF, z(3.4)], { tone: i % 2 ? "mid" : "lo" });
box("tray.pdb", [26, 28, z(0.5)], [33.6, 31.6, z(2.0)], { tone: "mid" });
// rear: busbar clip and three NVLink paddle connectors that blind-mate to the spine
box("tray.busclip", [27.6, 22, z(1.1)], [31.8, TY0, SEL.z0 + U - 1.3], { tone: "mid" });
GROUP = "spine";
for (const [x0, x1] of CARTS) box("tray.nvconn", [x0 + 1.4, 22, z(0.8)], [x1 - 1.4, TY0, SEL.z0 + U - 0.9], { tone: "mid" });
PIECE = "rack";

// ---------------------------------------------------------------- vertical cable manager and fiber cords
GROUP = "fabric";
const VM = { x: [55.4, 59.0], y: [YP + 1.8, YP + 7.8] };
box("vcm", [VM.x[0], VM.y[0], 0], [VM.x[1], VM.y[1], 221], { tone: "lo" }, {
  extra: Ln(STACK.filter((s) => s.kind === "compute" && s !== SEL).map((s) => rectY(VM.y[1], VM.x[0] + 0.8, VM.x[1] - 0.8, s.z0 + 1.2, s.z0 + U - 1.2)).join(""), { tone: "faint" }),
});
const CORDS = [];
for (const s of STACK) {
  if (s.kind !== "compute" || s === SEL) continue;
  const zc = s.z0 + U / 2 + 0.2;
  const from = [36, YP, zc];
  const route = [from, [36, YP + 4.4, zc], [VM.x[0], YP + 4.4, zc]];
  tube(`cord.${s.ct}`, route, 0.32, { tone: "lo", shells: [true, false], ends: [false, false], maxLength: 10, bend: 1.0, limp: true, bundle: "cords" });
  CORDS.push(s.ct);
}
const VM_TOP = [(VM.x[0] + VM.x[1]) / 2, (VM.y[0] + VM.y[1]) / 2, 221];

// ---------------------------------------------------------------- CDU beside the rack
GROUP = "cool";
const CX = [-62, -2];
const CDU_FACE = 107;
for (const [x, y] of byDepth([[CX[0] + 4, 5], [CX[1] - 4, 5], [CX[0] + 4, 102], [CX[1] - 4, 102]])) {
  const F = G.frameOf([x, y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  put("cdu.leveler", [x, y, 1.5], S(G.disc(0, 1, 3, F, P, { steps: 28 }), { tone: "lo" }) + S(G.disc(1, 3, 1.6, F, P, { steps: 6 }), { tone: "mid" }), [record(A.disc(F, 0, 1, 3, { name: "cdu.leveler.pad" })), record(A.disc(F, 1, 3, 1.6, { name: "cdu.leveler.nut" }))]);
}
const louvers = [];
for (let i = 0; i < 9; i++) louvers.push(rectY(CDU_FACE, CX[0] + 8, CX[1] - 8, 20 + i * 4.4, 22 + i * 4.4));
box("cdu.cabinet", [CX[0], 0, 3], [CX[1], CDU_FACE, RZ], { tone: "mid" }, {
  r: 0.6,
  steps: 3,
  bevel: 0.4,
  inner: Ln(k.sideSeam({ x: CX[0], y: 0, w: CX[1] - CX[0], d: CDU_FACE, r: 0.6 }, 8, P, 3) + k.sideSeam({ x: CX[0], y: 0, w: CX[1] - CX[0], d: CDU_FACE, r: 0.6 }, RZ - 5, P, 3), { tone: "faint" }),
  extra: Ln(louvers.join("") + rectY(CDU_FACE, CX[0] + 3, CX[1] - 3, 10, RZ - 8), { tone: "lo" }) + Dots(dotsY(CDU_FACE, [[CX[0] + 4.2, 40], [CX[0] + 4.2, 120], [CX[0] + 4.2, 200]]), { size: 0.5, tone: "mid" }),
});
box("cdu.handle", [CX[1] - 6.4, CDU_FACE, 110], [CX[1] - 5, CDU_FACE + 1.6, 130], { tone: "hi" });
for (const zh of [24, 116, 208]) box("cdu.hinge", [CX[0] + 1.2, CDU_FACE, zh], [CX[0] + 2.6, CDU_FACE + 1.2, zh + 6], { tone: "mid" });
box("cdu.lock", [CX[1] - 6.6, CDU_FACE, 102], [CX[1] - 4.8, CDU_FACE + 0.8, 106], { tone: "lo" }, { extra: Dots(dotsY(CDU_FACE + 0.8, [[CX[1] - 5.7, 104]]), { size: 0.45, tone: "hi" }) });
box("cdu.nameplate", [CX[0] + 9, CDU_FACE, 148], [CX[0] + 27, CDU_FACE + 0.4, 158], { tone: "lo" }, {
  extra: Ln([12, 9, 10.5].map((w, i) => path3([[CX[0] + 11, CDU_FACE + 0.4, 155.6 - i * 2.4], [CX[0] + 11 + w, CDU_FACE + 0.4, 155.6 - i * 2.4]])).join(""), { tone: "lo", free: true }) + Dots(dotsY(CDU_FACE + 0.4, [[CX[0] + 25.6, 156.6], [CX[0] + 25.6, 149.4]]), { size: 0.42 }),
});
{
  // flow indicator: a sight glass with a spinner, on the front of the secondary line
  const SF = G.frameOf([CX[1] - 17, CDU_FACE, 151], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  disc("cdu.sightglass", SF, 0, 1.4, 4, { tone: "mid" }, { extra: Ln(G.circleOf(SF, 1.4, 3.1, P, 40), { tone: "lo" }) + `<g class="ar-spin" data-spin="">${Ln(path3([G.pointOf(SF, 1.42, 2.6, 0), G.pointOf(SF, 1.42, 2.6, Math.PI)]) + path3([G.pointOf(SF, 1.42, 2.6, Math.PI / 2), G.pointOf(SF, 1.42, 2.6, -Math.PI / 2)]), { tone: "mid" })}</g>` + Dots(G.dotsOf(SF, 1.4, 3.6, 6, P, { all: true }), { size: 0.38, tone: "lo" }) });
}
// lifting eyes and a vent on the CDU roof
for (const [x, y] of [[CX[0] + 5, 6], [CX[1] - 5, 6], [CX[0] + 5, 101], [CX[1] - 5, 101]]) disc("cdu.eye", G.frameAlong([x, y, RZ], [0, 0, 1]), 0, 1.2, 1.6, { tone: "mid" }, { extra: Ln(G.circleOf(G.frameAlong([x, y, RZ], [0, 0, 1]), 1.2, 0.7, P, 16), { tone: "lo" }) });
put("cdu.vent", [CX[0] + 30, 70, RZ], Ln(Array.from({ length: 7 }, (_, i) => rectZ(RZ, CX[0] + 12 + i * 5, CX[0] + 14.4 + i * 5, 56, 92)).join(""), { tone: "faint" }), [record(A.box([CX[0] + 12, 56, RZ], [CX[0] + 46.4, 92, RZ + 0.05], { name: "cdu.vent" }))], { bias: 0.1 });
// control panel with a display and two dial gauges (supply and return temperature)
const PANEL = { x: [CX[0] + 8, CX[1] - 10], z: [168, 200] };
box("cdu.panel", [PANEL.x[0], CDU_FACE, PANEL.z[0]], [PANEL.x[1], CDU_FACE + 1.2, PANEL.z[1]], { tone: "lo" }, {
  extra: Ln(rectY(CDU_FACE + 1.2, PANEL.x[0] + 3, PANEL.x[0] + 20, PANEL.z[0] + 14, PANEL.z[1] - 4), { tone: "lo" }) + Dots(dotsY(CDU_FACE + 1.2, [[PANEL.x[0] + 4.5, PANEL.z[0] + 5], [PANEL.x[0] + 7.5, PANEL.z[0] + 5], [PANEL.x[0] + 10.5, PANEL.z[0] + 5]]), { size: 0.55, tone: "mid" }),
});
const GAUGES = [
  { key: "supply", x: PANEL.x[0] + 29, z: PANEL.z[0] + 18 },
  { key: "return", x: PANEL.x[0] + 41, z: PANEL.z[0] + 18 },
];
const GAUGE_R = 4.6;
for (const g of GAUGES) {
  const F = G.frameOf([g.x, CDU_FACE + 1.2, g.z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const face = 1.8;
  const ticks = [];
  for (let i = 0; i <= 20; i++) {
    const a = (-135 + (270 * i) / 20) * (Math.PI / 180);
    const r0 = GAUGE_R - 0.9 - (i % 5 === 0 ? 0.9 : 0.45);
    const p0 = G.add3(F.o, G.add3(G.mul3(F.a, face), G.add3(G.mul3(F.u, Math.sin(a) * r0), G.mul3(F.v, Math.cos(a) * r0))));
    const p1 = G.add3(F.o, G.add3(G.mul3(F.a, face), G.add3(G.mul3(F.u, Math.sin(a) * (GAUGE_R - 0.9)), G.mul3(F.v, Math.cos(a) * (GAUGE_R - 0.9)))));
    ticks.push({ d: path3([p0, p1]), major: i % 5 === 0 });
  }
  disc(`gauge.${g.key}`, F, 0, face, GAUGE_R, { tone: "hi" }, {
    extra:
      Ln(G.circleOf(F, face, GAUGE_R - 0.9, P, 48), { tone: "lo" }) +
      Ln(ticks.filter((t) => !t.major).map((t) => t.d).join(""), { tone: "lo" }) +
      Ln(ticks.filter((t) => t.major).map((t) => t.d).join(""), { tone: "mid" }) +
      `<g data-gauge="${g.key}"></g>` +
      Dots([at(G.add3(F.o, G.mul3(F.a, face)))], { size: 0.7, tone: "hi" }),
  });
  g.o = G.add3(F.o, G.mul3(F.a, face + 0.05));
}
// facility water: two flanged ports low on the CDU front that turn down into the raised floor
GROUP = "cool";
const FAC = [
  { name: "facility.supply", x: CX[0] + 14 },
  { name: "facility.return", x: CX[0] + 26 },
];
for (const f of FAC) {
  const port = G.frameAlong([f.x, CDU_FACE, 12], [0, 1, 0]);
  disc(`${f.name}.port`, port, 0, 1.6, 3.2, { tone: "mid" }, { extra: Dots(G.dotsOf(port, 1.6, 2.5, 6, P, { all: true }), { size: 0.4, tone: "lo" }) });
  const floorCollar = G.frameAlong([f.x, CDU_FACE + 9, 0], [0, 0, 1]);
  disc(`${f.name}.collar`, floorCollar, 0, 1.2, 3.6, { tone: "lo" });
  tube(f.name, [[f.x, CDU_FACE + 1.6, 12], [f.x, CDU_FACE + 9, 12], [f.x, CDU_FACE + 9, 1.2]], 2.0, { tone: "mid", ends: [false, false], bend: 5.6, maxLength: 12, grp: "cool" });
}

// ---------------------------------------------------------------- secondary loop overhead: rack manifolds to the CDU
const PIPE_R = 1.6;
const ROOF_HOLES = [];
for (const [key, [x0, x1], zRun, xDown] of [["supply", MAN.s, 238, -12], ["return", MAN.r, 245, -22]]) {
  const xc = (x0 + x1) / 2;
  const yc = (MAN.y[0] + MAN.y[1]) / 2;
  // round pipe leaves the top of the rectangular header through a reducer
  turned(`manifold.${key}.reducer`, G.frameAlong([xc, yc, 205], [0, 0, 1]), [[0, 1.6], [3, 1.6], [5, PIPE_R * 1.05, 1], [6, PIPE_R * 1.05]], { tone: "mid" });
  ROOF_HOLES.push([xc, yc]);
  const cduGrom = G.frameAlong([xDown, yc, RZ], [0, 0, 1]);
  disc(`cdu.grommet.${key}`, cduGrom, 0, 0.8, PIPE_R + 1.2, { tone: "lo" });
  tube(`loop.${key}`, [[xc, yc, 211], [xc, yc, zRun], [xDown, yc, zRun], [xDown, yc, RZ + 0.8]], PIPE_R, {
    tone: "hi",
    ends: [false, false],
    bend: 6,
    maxLength: 14,
    grp: "cool",
    rings: undefined,
  });
}

// ---------------------------------------------------------------- overhead ladder trays and the fiber trunk
GROUP = "fabric";
// cross run along the row (y 26..42) and a front-to-back run over the rack (x 46..60), joined in a T
const LX = { y: [26, 42], z: [246, 248.4], x: [47.4, 146] };
const LY = { x: [47.4, 61.4], y: [42, 116] };
const rail = (name, a, b) => box(name, a, b, { tone: "mid" });
rail("ladder.rail", [LX.x[0], LX.y[0], LX.z[0]], [LX.x[1], LX.y[0] + 1.2, LX.z[1] + 1.6]);
rail("ladder.rail", [LY.x[1], LX.y[1] - 1.2, LX.z[0]], [LX.x[1], LX.y[1], LX.z[1] + 1.6]);
for (let x = LX.x[0] + 3; x < LX.x[1] - 2; x += 10) box("ladder.rung", [x, LX.y[0] + 1.2, LX.z[0]], [x + 1.4, LX.y[1] - 1.2, LX.z[0] + 0.8], { tone: "lo" });
rail("ladder.rail", [LY.x[0], LY.y[0], LX.z[0]], [LY.x[0] + 1.2, LY.y[1], LX.z[1] + 1.6]);
rail("ladder.rail", [LY.x[1] - 1.2, LY.y[0], LX.z[0]], [LY.x[1], LY.y[1] - 1.2, LX.z[1] + 1.6]);
rail("ladder.rail", [LY.x[0] + 1.2, LY.y[1] - 1.2, LX.z[0]], [LY.x[1], LY.y[1], LX.z[1] + 1.6]);
for (let y = LY.y[0] + 4; y < LY.y[1] - 14; y += 10) box("ladder.rung", [LY.x[0] + 1.2, y, LX.z[0]], [LY.x[1] - 1.2, y + 1.4, LX.z[0] + 0.8], { tone: "lo" });
const stand = (x, y, z0) => box("ladder.stand", [x, y, z0], [x + 1.2, y + 1.6, LX.z[0]], { tone: "lo" });
stand(LX.x[0], LX.y[0], RZ);
for (const y of [60, 90]) { stand(LY.x[0], y, RZ); stand(59.0, y, RZ); }
// network frame at the end of the row: a two-post rack holding one Quantum-X800-class leaf switch
const NF = { x: [96, 146], y: [30, 36] };
for (const x0 of [NF.x[0], NF.x[1] - 4]) {
  const holes = [];
  for (let zh = 6; zh < 212; zh += U / 3) holes.push([x0 + 1, zh], [x0 + 3, zh]);
  box("netframe.post", [x0, NF.y[0], 2], [x0 + 4, NF.y[1], 214], { tone: "mid" }, { extra: Dots(dotsY(NF.y[1], holes), { size: 0.35, tone: "lo" }) });
}
box("netframe.base", [NF.x[0] - 2, NF.y[0] - 10, 0], [NF.x[1] + 2, NF.y[1] + 10, 2], { tone: "lo" });
box("netframe.top", [NF.x[0], NF.y[0], 214], [NF.x[1], NF.y[1], 218], { tone: "mid" });
for (const x of [100, 141]) box("ladder.stand", [x, NF.y[0], 218], [x + 1.2, NF.y[0] + 1.6, LX.z[0]], { tone: "lo" });
const LEAF = { z: [150, 150 + 4 * U], y: [8, 44] };
const leafPorts = [];
for (let c = 0; c < 18; c++) for (let r = 0; r < 4; r++) leafPorts.push(rectY(LEAF.y[1], NF.x[0] + 6 + c * 2.1, NF.x[0] + 7.6 + c * 2.1, LEAF.z[0] + 1.2 + r * 4.1, LEAF.z[0] + 3.6 + r * 4.1));
box("leaf.switch", [NF.x[0] + 4, LEAF.y[0], LEAF.z[0]], [NF.x[1] - 4, LEAF.y[1], LEAF.z[1]], { tone: "hi" }, { extra: Ln(leafPorts.join(""), { tone: "lo" }) });
for (const x0 of [NF.x[0] + 4 - 0.01, NF.x[1] - 4]) box("leaf.ear", [x0 === NF.x[1] - 4 ? x0 : NF.x[0], NF.y[1], LEAF.z[0] + 1], [x0 === NF.x[1] - 4 ? NF.x[1] : NF.x[0] + 4, NF.y[1] + 0.6, LEAF.z[1] - 1], { tone: "mid" });
// trunk: up out of the cable manager into the front run, back along it, across to the leaf
const TRUNK_R = 1.4;
const TX_DROP = 117;
const TZ = LX.z[0] + 0.8 + TRUNK_R + 0.8;
const TRUNK = tube("trunk", [VM_TOP, [VM_TOP[0], VM_TOP[1], TZ], [VM_TOP[0], (LX.y[0] + LX.y[1]) / 2, TZ], [TX_DROP, (LX.y[0] + LX.y[1]) / 2, TZ], [TX_DROP, (LX.y[0] + LX.y[1]) / 2, 238], [TX_DROP, LEAF.y[1] + 14, 238], [TX_DROP, LEAF.y[1] + 14, LEAF.z[0] + 9], [TX_DROP, LEAF.y[1], LEAF.z[0] + 9]], TRUNK_R, { tone: "mid", bend: 6, maxLength: 16, shells: [false, true], ends: [false, false], rings: { pitch: 1.1, twist: 0.8, cross: true, fade: [0.1, 0.55] }, limp: true });

// ---------------------------------------------------------------- power: overhead busway, a tap-off box, two armoured whips into the top power shelves
GROUP = "power";
const BW = { x: [-4, 64], y: [14, 20], z: [244, 249] };
const bwSeams = [10, 30, 50].map((x) => path3([[x, BW.y[1], BW.z[0]], [x, BW.y[1], BW.z[1]]])).join("");
box("busway", [BW.x[0], BW.y[0], BW.z[0]], [BW.x[1], BW.y[1], BW.z[1]], { tone: "mid" }, { r: 0.4, inner: Ln(bwSeams, { tone: "faint" }) });
for (const x of [-4, 64]) box("busway.cap", [x === -4 ? -5 : 64, BW.y[0] - 0.4, BW.z[0] - 0.4], [x === -4 ? -4 : 65, BW.y[1] + 0.4, BW.z[1] + 0.4], { tone: "lo" });
for (const x of [4, 24]) box("busway.stand", [x, BW.y[0] + 2.2, RZ], [x + 1.4, BW.y[0] + 3.8, BW.z[0]], { tone: "lo" });
const TAP = { x: [36, 50], y: [12, 22], z: [236, 244] };
box("busway.tapoff", [TAP.x[0], TAP.y[0], TAP.z[0]], [TAP.x[1], TAP.y[1], TAP.z[1]], { tone: "hi" }, { extra: Ln(rectY(TAP.y[1], TAP.x[0] + 2, TAP.x[0] + 8, TAP.z[0] + 2, TAP.z[1] - 2), { tone: "lo" }) + Dots(dotsY(TAP.y[1], [[TAP.x[1] - 2.4, TAP.z[1] - 2], [TAP.x[1] - 4.4, TAP.z[1] - 2]]), { size: 0.5, tone: "mid" }) });
const WHIP_R = 0.9;
for (const [x, slotIndex] of [[40, 32], [46, 34]]) {
  const zw = Z0 + (slotIndex + 0.5) * U;
  disc("busway.gland", G.frameAlong([x, 17, TAP.z[0]], [0, 0, -1]), 0, 1.2, WHIP_R * 1.6, { tone: "lo" });
  tube(`whip.${slotIndex}`, [[x, 17, TAP.z[0] - 1.2], [x, 17, 231], [x, 5.6, 231], [x, 5.6, zw], [x, TY0, zw]], WHIP_R, { tone: "mid", bend: 3.2, ends: [false, false], shells: [false, true], maxLength: 14, rings: { pitch: 0.9, twist: 0.7, fade: [0.1, 0.55] }, grp: "power" });
}

// network frame: rack-unit holes up the posts, a management switch above the leaf
GROUP = "fabric";
{
  const mz = [182, 182 + U];
  const mports = [];
  for (let c = 0; c < 16; c++) mports.push(rectY(NF.y[1], NF.x[0] + 7 + c * 2, NF.x[0] + 8.4 + c * 2, mz[0] + 1.4, mz[1] - 1.4));
  box("netframe.mgmt", [NF.x[0] + 4, 14, mz[0]], [NF.x[1] - 4, NF.y[1], mz[1]], { tone: "mid" }, { extra: Ln(mports.join(""), { tone: "faint" }) + Dots(dotsY(NF.y[1], [[NF.x[1] - 8, mz[0] + U / 2], [NF.x[1] - 10, mz[0] + U / 2]]), { size: 0.5, tone: "hi" }) });
}

// ---------------------------------------------------------------- spares: an open foam-lined case on the floor
GROUP = "spares";
const CASE = { x: [70, 118], y: [128, 160] };
box("case.shell", [CASE.x[0], CASE.y[0], 0], [CASE.x[1], CASE.y[1], 9], { tone: "mid" }, { r: 1.4, steps: 4, bevel: 0.4, inner: Ln(k.sideSeam({ x: CASE.x[0], y: CASE.y[0], w: CASE.x[1] - CASE.x[0], d: CASE.y[1] - CASE.y[0], r: 1.4 }, 6, P, 4), { tone: "faint" }) });
box("case.foam", [CASE.x[0] + 1.4, CASE.y[0] + 1.4, 9], [CASE.x[1] - 1.4, CASE.y[1] - 1.4, 9.4], { tone: "lo" }, { r: 0.6, steps: 3 });
for (const x of [CASE.x[0] + 10, CASE.x[1] - 10]) box("case.latch", [x - 2, CASE.y[1], 4.4], [x + 2, CASE.y[1] + 0.8, 7.4], { tone: "hi" });
// SXM module, flipped connector side up: substrate, two mezzanine connectors, the die and HBM sit underneath
const SXM = { x: [74, 92], y: [132, 152] };
box("sxm.board", [SXM.x[0], SXM.y[0], 9.4], [SXM.x[1], SXM.y[1], 10.2], { tone: "hi" }, { r: 0.4, extra: Dots([[SXM.x[0] + 1, SXM.y[0] + 1], [SXM.x[1] - 1, SXM.y[0] + 1], [SXM.x[0] + 1, SXM.y[1] - 1], [SXM.x[1] - 1, SXM.y[1] - 1]].map(([x, y]) => at([x, y, 10.2])), { size: 0.45 }) });
for (const x0 of [SXM.x[0] + 3, SXM.x[1] - 6]) {
  const pins = Array.from({ length: 12 }, (_, i) => path3([[x0, SXM.y[0] + 4 + i, 11.4], [x0 + 3, SXM.y[0] + 4 + i, 11.4]])).join("");
  box("sxm.mezz", [x0, SXM.y[0] + 3.2, 10.2], [x0 + 3, SXM.y[1] - 3.2, 11.4], { tone: "mid" }, { extra: Ln(pins, { tone: "faint" }) });
}
box("sxm.pmic", [SXM.x[0] + 7.6, SXM.y[0] + 4, 10.2], [SXM.x[1] - 7.6, SXM.y[1] - 4, 10.7], { tone: "lo" });
// OAM module beside it (OCP Accelerator Module, 102 x 165 mm), also connector side up
const OAM = { x: [96, 106.2], y: [131, 157] };
box("oam.board", [OAM.x[0], OAM.y[0], 9.4], [OAM.x[1], OAM.y[1], 10.2], { tone: "hi" }, { r: 0.4 });
for (const y0 of [OAM.y[0] + 2.2, OAM.y[1] - 6.2]) {
  const pins = Array.from({ length: 7 }, (_, i) => path3([[OAM.x[0] + 1.6 + i, y0, 11.2], [OAM.x[0] + 1.6 + i, y0 + 4, 11.2]])).join("");
  box("oam.mezz", [OAM.x[0] + 1.2, y0, 10.2], [OAM.x[1] - 1.2, y0 + 4, 11.2], { tone: "mid" }, { extra: Ln(pins, { tone: "faint" }) });
}
// a B300 package, die side up, on its own carrier: two reticle dies and 8 HBM3e stacks
const PKG = { x: [108, 116], y: [134, 146] };
box("pkg.substrate", [PKG.x[0], PKG.y[0], 9.4], [PKG.x[1], PKG.y[1], 10.0], { tone: "mid" });
box("pkg.die0", [PKG.x[0] + 2.4, PKG.y[0] + 1.4, 10.0], [PKG.x[1] - 2.4, PKG.y[0] + 5.8, 10.4], { tone: "hi" });
box("pkg.die1", [PKG.x[0] + 2.4, PKG.y[0] + 6.2, 10.0], [PKG.x[1] - 2.4, PKG.y[1] - 1.4, 10.4], { tone: "hi" });
for (let i = 0; i < 8; i++) {
  const left = i < 4;
  const x0 = left ? PKG.x[0] + 0.5 : PKG.x[1] - 2.1;
  const y0 = PKG.y[0] + 1.4 + (i % 4) * 2.4;
  box("pkg.hbm", [x0, y0, 10.0], [x0 + 1.6, y0 + 2.0, 10.5], { tone: "lo" });
}

GROUP = "rack";
A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
const groups = R.items.map((item, index) => {
  const [mx, my, mz] = item.move;
  return `<g class="it" data-piece="${item.piece}" data-grp="${item.grp}" data-k="${item.key.toFixed(2)}" data-m="${mx.toFixed(1)},${my.toFixed(1)},${mz.toFixed(1)}" data-i="${index}"${item.attrs ?? ""}>${item.svg}</g>`;
});

const f1 = (v) => Math.round(v * 10) / 10;
const scr = (p) => at(p).map(f2);
const routeOf = (name) => R.routes.find((r) => r.name === name).points;
const trunkScreen = [...routeOf("trunk")].reverse().map(scr);
const cords = STACK.filter((s) => s.kind === "compute" && s !== SEL).map((s) => {
  const pts = routeOf(`cord.${s.ct}`);
  const zc = pts[0][2];
  return [scr([VM_TOP[0], VM_TOP[1], zc]), ...[...pts].reverse().map(scr)];
});
const GROUPS = {
  rack: { n: "00", label: "The rack", short: "72 GPUs · one NVLink domain", say: `GB300 NVL72-style rack · 72 GPUs · ${f1(DER.hbmTb)} TB HBM · ~${RACK.rackKw} kW` },
  tray: { short: "compute tray · 4 GPUs, 2 CPUs", n: "01", label: "Compute tray", say: `compute tray 16 of 18, slid out on its rails · 4 GPUs, 2 Grace CPUs, 4 SuperNICs · ${fmtN(RACK.gpusPerTray * RACK.hbmGbPerGpu)} GB HBM3e · NVLink, power and coolant all blind-mate at the back` },
  gpu: { short: "4 × B300 · 288 GB HBM3e each", n: "02", label: "B300 GPUs on SXM modules", say: `4 B300 GPUs, each on an SXM module (a mezzanine board that plugs flat into the motherboard) under a copper cold plate · ${RACK.hbmGbPerGpu} GB HBM3e at ${RACK.hbmTbsPerGpu} TB/s · ~${(RACK.gpuWatts / 1000).toFixed(1)} kW each · tensor parallelism splits every layer's matrices across 8 of them` },
  cpu: { short: "2 × Grace · 480 GB LPDDR5X each", n: "03", label: "Grace CPUs and LPDDR5X", say: `2 Grace CPUs · ${RACK.coresPerCpu} Arm cores and ${RACK.lpddrGbPerCpu} GB LPDDR5X each · ${RACK.c2cGbs} GB/s NVLink-C2C lets the GPUs use that memory too: ${f1(DER.lpddrTb)} TB more for KV cache` },
  spine: { short: "NVLink spine · 130 TB/s", n: "04", label: "NVLink spine", say: `NVLink spine · ~${fmtN(RACK.spineCables)} copper twinax cables in cartridges behind the trays · ${f1(DER.nvlinkTbs)} TB/s · any GPU can read any other GPU's HBM, so ${f1(DER.hbmTb)} TB acts as one shared pool` },
  switch: { short: "18 NVLink switch chips", n: "05", label: "NVLink switch trays", say: `9 NVLink switch trays, 2 chips each · every GPU sends 1 of its ${RACK.nvlinkLinksPerGpu} links to each of the ${DER.switchChips} chips, so any GPU is one hop from any other (scale-up)` },
  cool: { short: "PG25 · 173 L/min", n: "06", label: "Liquid cooling", say: `direct-to-chip liquid cooling · cold plates on every GPU and CPU · quick disconnects on two manifolds · ${Math.round(FLOW)} L/min PG25, ${COOLANT.supplyC} °C in, ${Math.round(returnC(DER.liquidKw, FLOW))} °C out · the CDU hands the heat to facility water` },
  power: { short: "8 × 33 kW power shelves", n: "07", label: "Power shelves and busbar", say: `overhead busway → tap-off box → 2 armoured whips → 8 power shelves (${RACK.shelfKw} kW each, N+N) → a DC busbar every tray clips onto · ~${RACK.rackKw} kW at full load` },
  fabric: { short: "72 × 800 Gb/s scale-out", n: "08", label: "Scale-out fabric", say: `scale-out: each GPU has its own ${RACK.nicGbps} Gb/s ConnectX-8 · ${f1(DER.scaleOutTbps)} Tb/s of fiber to the leaf switch, then spines · InfiniBand, or Ethernet with RoCE (RDMA over Converged Ethernet) · carries requests, KV cache and other racks' traffic` },
  spares: { short: "SXM · OAM · B300 package", n: "09", label: "Spares: SXM, OAM, package", say: `spares, connector side up · SXM: NVIDIA's GPU mezzanine module · OAM: the OCP open standard (AMD, Intel) on a universal baseboard · a B300 package: 2 reticle-size dies, 8 HBM3e stacks` },
};
function fmtN(v) {
  return Math.round(v).toLocaleString("en-US");
}
const ORDER = ["tray", "gpu", "cpu", "spine", "switch", "cool", "power", "fabric", "spares"];
const EX = at([1, 0, 0]).map((v, i) => v - at([0, 0, 0])[i]);
const EY = at([0, 1, 0]).map((v, i) => v - at([0, 0, 0])[i]);
const EZ = at([0, 0, 1]).map((v, i) => v - at([0, 0, 0])[i]);
const DATA = {
  P,
  V,
  EX,
  EY,
  EZ,
  spring: SPRING,
  model: { stepMs: DER.stepMs, layers: MODEL.layers, batch: MODEL.batch, replicaTokPerSec: DER.replicaTokPerSec },
  fastFactor: 600,
  slowFactor: 60000,
  cool: { supplyC: COOLANT.supplyC, density: COOLANT.density, cp: COOLANT.cp, lpm: FLOW, fullKw: DER.liquidKw, idleKw: 25 },
  gauges: Object.fromEntries(GAUGES.map((g) => [g.key, { o: g.o, u: [1, 0, 0], v: [0, 0, 1], r: GAUGE_R }])),
  groups: GROUPS,
  order: ORDER,
  trunk: trunkScreen,
  cords,
};

const LABEL_TEXT =
  "A liquid-cooled 72-GPU rack in the style of NVIDIA's GB300 NVL72 on a raised floor, right side panel off: 18 compute trays, 9 NVLink switch trays and 8 power shelves, with the NVLink spine, a DC busbar and two coolant manifolds behind them. One compute tray slides out to show four GPUs under cold plates, two Grace CPUs, four ConnectX-8 network cards and drives. A coolant distribution unit stands to the left with supply and return gauges, pipes run over the rack between them, and a fiber trunk runs from a cable manager through overhead ladder trays to a leaf switch on a two-post frame. Spare SXM and OAM modules and a GPU package lie in an open case on the floor.";
const svg = k.figureSvg({ width: W, height: H, label: LABEL_TEXT, body: [...back, `<g class="ar-rack">${groups.join("")}</g>`, `<g class="ar-pulse"></g>`] });
const partsList = `<ul class="ar-parts">${ORDER.map((id) => `<li><button class="ar-part" type="button" data-grp="${id}"><span>${GROUPS[id].n}</span>${GROUPS[id].label}</button></li>`).join("")}</ul>`;
const controls = `<div class="ar-controls"><button class="ar-btn" type="button" data-act="tray" aria-pressed="false">Pull tray out</button><button class="ar-btn" type="button" data-act="serve" aria-pressed="true">Pause serving</button><button class="ar-btn" type="button" data-act="slow" aria-pressed="false">Slow motion</button></div><p class="ar-phase" data-phase></p>`;
const CAPTION = `One replica of an Opus-5.5-class model served from one rack. Nothing about the model is public, so its numbers are estimates: a mixture-of-experts model of about ${(MODEL.totalParams / 1e12).toFixed(0)} trillion parameters, ${(MODEL.activeParams / 1e9).toFixed(0)} billion active per token, stored in 4-bit NVFP4 as ${f1(DER.weightsTb)} TB of weights. The rack's ${f1(DER.hbmTb)} TB of HBM holds them with ${f1(DER.kvTb)} TB left for KV cache, about ${Math.round(DER.kvTokens / 1e6)} million tokens of context. Every layer is split across GPUs: attention is tensor-parallel in groups of 8, and its ${MODEL.experts} experts are spread 4 to a GPU, so each layer ends in an all-reduce and two all-to-all exchanges over NVLink. The 72 GPUs reach each other through 18 NVLink switch chips at ${RACK.nvlinkTbsPerGpu} TB/s each, which makes the rack one memory domain (scale-up). Between racks, each GPU has its own ${RACK.nicGbps} Gb/s NIC to a leaf switch (scale-out), InfiniBand or Ethernet with RoCE. Decoding ${MODEL.batch} streams at once, a step takes about ${f1(DER.stepMs)} ms, mostly reading weights and KV cache from HBM, so the replica makes about ${fmtN(Math.round(DER.replicaTokPerSec / 100) * 100)} tokens a second. About ${Math.round(RACK.liquidShare * 100)}% of its ~${RACK.rackKw} kW leaves in the liquid: ${Math.round(FLOW)} L/min of PG25 from the CDU, warmed ${COOLANT.designDeltaK} °C, which hands the heat to facility water under the floor.`;
const body =
  `<style>${readFileSync(join(HERE, "rack.css"), "utf8")}</style><div class="ar">` +
  k.plateHtml({
    fig: "Fig 1",
    title: "One model replica, one rack",
    hint: "hover or tap a part",
    readout: "",
    keys: [
      { mark: "lit", label: "The part you're pointing at, or the GPUs, NVLink spine and switch chips as each layer runs" },
      { mark: "raised", label: "Solid parts: trays, cold plates, cartridges, manifolds, the CDU" },
      { mark: "edge", label: "Pipes and cables: coolant loop, facility water, fiber cords and the trunk" },
    ],
    caption: CAPTION,
    body: `<div class="iso-stage ar-stage" tabindex="0" role="group" aria-label="AI rack. Arrow keys step through the parts; O pulls the compute tray out; space pauses serving; S toggles slow motion; Escape clears.">${svg}</div><span class="ar-sr" role="status" aria-live="polite" data-live></span>`,
  }).replace(/(<figcaption[\s\S]*<\/figcaption>)/, `${controls}${partsList}$1`) +
  `</div>`;
const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));
const page = k.pageHtml({ title: "AI rack anatomy", theme: THEME, body, script: kitScript() + LIVE, width: 680 });
const out = THEME === "light" ? "ai-rack-light.html" : "ai-rack.html";
writeFileSync(join(HERE, out), page);
console.log("wrote", out, `${(page.length / 1024).toFixed(0)} KB`, `${R.items.length} items`, `scale ${KS.toFixed(3)}`, `${ROUTES.length} routes`);
const CROWD_OK = [["trunk", "ladder.*"], ["hose.*", "tray.rail.*"], ["hose.feed.*", "tray.wall.*"], ["hose.feed.supply", "hose.feed.return"], ["hose.feed.return", "compute16.plate"], ["whip.*", "busway.*"]];
A.auditOrExit(R, P, { crowd: CROWD_OK });
