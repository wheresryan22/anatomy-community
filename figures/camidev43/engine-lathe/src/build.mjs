import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../.skill/kit/iso-kit.mjs";
import * as G from "../../../../.skill/kit/lathe.mjs";
import * as A from "../../../../.skill/kit/audit.mjs";
import { kitScript } from "../../../../.skill/scripts/inline-kit.mjs";
import { makeParts } from "./parts.mjs";
import * as M from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";
const DEG = Math.PI / 180;

// World units are 2 mm. x runs along the bed from the headstock (low x) to the tailstock,
// y points at the operator, z is up. The spindle axis is 125 mm above the ways.
const W = 760;
const H = 520;
const ZC = 62.5;
const X = [1, 0, 0];
const Y = [0, 1, 0];
const Z = [0, 0, 1];

const TRAY = { x: -232, y: -72, w: 464, d: 150, r: 6 };
const TRAY_Z = [-64, -52];
const PED = [
  { x: -224, y: -56, w: 96, d: 116, r: 3 },
  { x: 132, y: -56, w: 92, d: 116, r: 3 },
];
const PED_Z = [-134, -64];
const FOOT_Z = -142;
const BED = { x: -206, y: -44, w: 412, d: 88, r: 2 };
const BED_Z = [-40, -6];
const WAYS = [
  { x: -206, y: -44, w: 412, d: 16, r: 1 },
  { x: -206, y: 28, w: 412, d: 16, r: 1 },
];
const VEE_Y = [-36, 36];
const VEE_X = [-124, 206];
const RISERS = [
  { x: -202, y: -36, w: 52, d: 72, r: 2 },
  { x: 152, y: -36, w: 50, d: 72, r: 2 },
];
const HEAD = { x: -206, y: -50, w: 82, d: 98, r: 4 };
const HEAD_Z = 110;

const CHUCK = { back: -114, body: -108, face: -86, r: 43 };
const JAW = { half: 4.6, steps: [[10, 19, 12], [19, 28, 8], [28, 37, 4]] };
const GRIP_END = -56;
const BAR_END = 66;
const STOCK_R = M.STOCK / 2 / M.UNIT;

// The carriage is built with the tool tip at XT0 and travels to XT1 (MOVE) along the bed.
const XT0 = 70;
const XT1 = GRIP_END;
const MOVE = [XT1 - XT0, 0, 0];
const PASS0 = M.planPasses(M.STOCK, M.DEPTHS[1]);
const RT0 = PASS0[0].to / 2 / M.UNIT;
const XC = XT0 + 8;
const SADDLE = { x: XC - 32, y: -48, w: 64, d: 102, r: 2 };
const SADDLE_Z = [3, 15];
const CROSS = { x: XC - 17, y: -30, w: 34, d: 74, r: 1.5 };
const CROSS_Z = [16.2, 24];
const APRON = { x: XC - 34, y: 54, w: 68, d: 6, r: 1.5 };
const APRON_Z = [-40, 9];
const POST = { x: XT0 - 1, y: 25, w: 20, d: 16, r: 1 };
const POST_Z = [35, 54.5, 62.5, 65.5];
const LEAD = { y: 50, z: -20, r: 2.8, x0: -137, x1: 189 };
const FEEDROD = { y: 50, z: -31, r: 2.3 };

const TAIL = { x: 116, w: 54 };
const QUILL_END = 92;
const CENTRE_AT = 80;

const P = k.fitProjection(
  [...k.boxCorners(TRAY, FOOT_Z, TRAY_Z[1]), ...k.boxCorners(HEAD, 0, HEAD_Z + 8), [-232, -72, 64], [232, -72, 64], [182, 0, ZC + 20], [XC, 70, 80]],
  W,
  H,
  { pad: 30, azimuth: 60, elevation: 30 },
);
const V = G.viewOf(P);
const KS = G.scaleOf(P);
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const path3 = (points, closed = false) => k.pathOf(points.map(at), closed);
const alongX = (o) => G.frameOf(o, X, Z, [0, -1, 0]);
const alongY = (o) => G.frameOf(o, Y, Z, X);

const SPRING = { stagger: 0, stiffness: 40, damping: 12.6, substeps: 4 };
const R = A.recorder(P, { order: ["carriage"], spring: SPRING });
const record = R.solid;
const MOVES = { stand: [0, 0, 0], carriage: MOVE };

function put(piece, ref, svg, { bias = 0, shapes = [], name, ride } = {}) {
  const rides = ride ?? piece;
  R.put({ piece, ride: rides, at: ref, bias, svg, move: MOVES[rides] ?? [0, 0, 0], shapes, name: R.nameFor(name ?? `${piece}.item`) });
}

function box(piece, plan, z0, z1, style = {}, { extra = "", inner = "", bias = 0, name, owner, steps = 3, bevel = 0.5, ride } = {}) {
  const id = R.nameFor(name ?? `${piece}.box`);
  const shape = record(A.slab(plan, z0, z1 - z0, { name: id, owner }, steps));
  put(piece, [plan.x + plan.w / 2, plan.y + plan.d / 2, (z0 + z1) / 2], S(k.slabOf(plan, z0, z1 - z0, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, { bias, shapes: [shape], name: id, ride });
  return shape;
}

function turned(piece, F, profile, style = {}, { extra = "", inner = "", bias = 0, name, owner, ride, bevel = 0, steps, smooth } = {}) {
  const id = R.nameFor(name ?? `${piece}.turned`);
  const paths = G.solidOf(profile, F, P, { bevel, ...(steps ? { steps } : {}), ...(smooth !== undefined ? { smooth } : {}) });
  const shape = record(A.solid(F, profile, { name: id, owner }));
  const mid = (profile[0][0] + profile[profile.length - 1][0]) / 2;
  put(piece, G.add3(F.o, G.mul3(F.a, mid)), S(paths, { tone: "mid", ...style, inner }) + extra, { bias, shapes: [shape], name: id, ride });
  return shape;
}

const disc = (piece, F, s0, s1, r, style, options) => turned(piece, F, [[s0, r], [s1, r]], style, options);

function prism(piece, F, poly, s0, s1, style = {}, { extra = "", bias = 0, name, owner, ride } = {}) {
  const id = R.nameFor(name ?? `${piece}.prism`);
  const shape = record(A.prism(F, poly, s0, s1, { name: id, owner }));
  const cx = poly.reduce((sum, p) => sum + p[0], 0) / poly.length;
  const cy = poly.reduce((sum, p) => sum + p[1], 0) / poly.length;
  put(piece, G.add3(G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)), G.add3(G.mul3(F.u, cx), G.mul3(F.v, cy))), S(G.prismOf(F, poly, s0, s1, P), { tone: "mid", ...style }) + extra, { bias, shapes: [shape], name: id, ride });
  return shape;
}

function ballAt(piece, centre, r, style = {}, { bias = 0, name, owner, ride } = {}) {
  const id = R.nameFor(name ?? `${piece}.ball`);
  const shape = record(A.ball(centre, r, { name: id, owner }));
  put(piece, centre, S(G.sphereOf(centre, r, P, { steps: 32 }), { tone: "mid", ...style }), { bias, shapes: [shape], name: id, ride });
  return shape;
}

// A closed rounded rectangle on a vertical face y = const, from (x0, z0) to (x1, z1).
function faceRect(y, x0, x1, z0, z1, r = 1.2) {
  const pts = [];
  const corner = (cx, cz, a0) => {
    for (let i = 0; i <= 4; i++) {
      const a = a0 + (i / 4) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, y, cz + Math.sin(a) * r]);
    }
  };
  corner(x1 - r, z0 + r, -Math.PI / 2);
  corner(x1 - r, z1 - r, 0);
  corner(x0 + r, z1 - r, Math.PI / 2);
  corner(x0 + r, z0 + r, Math.PI);
  return path3(pts, true);
}
// The same on a face x = const, from (y0, z0) to (y1, z1).
function faceRectX(x, y0, y1, z0, z1, r = 1.2) {
  const pts = [];
  const corner = (cy, cz, a0) => {
    for (let i = 0; i <= 4; i++) {
      const a = a0 + (i / 4) * (Math.PI / 2);
      pts.push([x, cy + Math.cos(a) * r, cz + Math.sin(a) * r]);
    }
  };
  corner(y1 - r, z0 + r, -Math.PI / 2);
  corner(y1 - r, z1 - r, 0);
  corner(y0 + r, z1 - r, Math.PI / 2);
  corner(y0 + r, z0 + r, Math.PI);
  return path3(pts, true);
}
// Rule lines on a label plate on face y, standing for printed text.
const rules = (y, x0, z, widths, gap = 2.2) => Ln(widths.map((w, i) => path3([[x0, y, z - i * gap], [x0 + w, y, z - i * gap]])).join(""), { tone: "lo", free: true });

// ---------- Data shared with the page ----------
const METER_F = G.frameOf([-150, 48, 82], Y, Z, X);
const KNOB_F = G.frameOf([-186, 48, 82], Y, Z, X);
const LEVER = { pivot: [XC + 21, 60, -20], s0: 0, length: 11, down: -62 * DEG, up: -18 * DEG };
const WHEELS = {
  apron: { F: alongY([XC - 16, 60, -14]), r: 14, face: 4.2, grip: 6.5, knob: 4.2 },
  cross: { F: alongY([XC, 63, 20]), r: 10, face: 3.4, grip: 5.6, knob: 3.6 },
  tail: { F: alongX([176, 0, ZC]), r: 17, face: 4.2, grip: 6.5, knob: 4.2 },
};
const DATA0 = {
  zc: ZC,
  chuck: CHUCK,
  jaw: JAW,
  meter: { F: METER_F, r: 11, face: 4.4 },
  knob: { F: KNOB_F, r: 7, top: 6.4, count: M.SPEEDS.length, from: -128 * DEG, to: 128 * DEG },
  lever: LEVER,
  dial: { F: G.frameOf([XC + 40, 50, -15], Z, X, Y), top: 18.6, r: 5.5 },
  collar: { F: alongY([XC, 54, 20]), face: 6, r: 6.6 },
};
const PARTS = makeParts(k, G, P, DATA0);

// ---------- Stand: pedestals, feet, chip tray, splash guard ----------
const halo = `<path class="iso-halo" d="${k.haloOf(k.insetPlan(TRAY, -6), FOOT_Z, 2, P)}"/>`;

for (const [index, plan] of PED.entries()) {
  const feet = k.corners(plan, 9);
  for (const [x, y] of feet) {
    const F = G.frameOf([x, y, FOOT_Z], Z, X, Y);
    turned("stand", F, [[0, 7], [1.6, 7], [1.6, 3], [5.2, 3], [5.2, 4.6], [8, 4.6]], { tone: "lo" }, { name: `stand.foot`, extra: "" });
  }
  const y1 = plan.y + plan.d;
  const doorX = [plan.x + 8, plan.x + plan.w - 8];
  const doorZ = [PED_Z[0] + 10, PED_Z[1] - 12];
  const vents = [];
  for (let i = 0; i < 5; i++) {
    const z = doorZ[1] - 8 - i * 4;
    vents.push(faceRect(y1, doorX[0] + 14, doorX[1] - 14, z - 1.1, z + 1.1, 1));
  }
  const hinge = [doorZ[0] + 9, doorZ[1] - 9].map((z) => at([doorX[0] + 2.5, y1, z]));
  const handleX = index ? doorX[0] + 8 : doorX[1] - 8;
  const extra =
    Ln(faceRect(y1, doorX[0], doorX[1], doorZ[0], doorZ[1], 2.4), { tone: "lo" }) +
    Ln(vents.join(""), { tone: "lo" }) +
    Ln(faceRect(y1, plan.x + 2, plan.x + plan.w - 2, PED_Z[0] + 1.5, PED_Z[0] + 6.5, 1), { tone: "faint" }) +
    Dots(hinge, { size: 0.5 });
  box("stand", plan, PED_Z[0], PED_Z[1], { tone: "mid" }, { name: `stand.pedestal`, extra, bevel: 0.8, steps: 4 });
  box("stand", { x: handleX - 1.4, y: y1, w: 2.8, d: 2.4, r: 0.8 }, doorZ[0] + 22, doorZ[0] + 36, { tone: "hi" }, { name: "stand.handle", bevel: 0.3, steps: 2 });
}

{
  const inner = k.insetPlan(TRAY, 4);
  const extra = Ln(k.planOutline(inner, TRAY_Z[1], P, 6), { tone: "lo" }) + Ln(k.planOutline(k.insetPlan(TRAY, 7), TRAY_Z[1], P, 6), { tone: "faint" });
  // Chips that have fallen into the tray, and the chuck key left beside them.
  const chips = [];
  const pile = [[-38, 66, 0.2, 1.5], [-26, 70, 1.1, 1.2], [-16, 63, 2.3, 1.4], [-4, 68, 0.7, 1.1], [8, 72, 1.9, 1.3], [-48, 72, 2.8, 1.0], [18, 65, 0.4, 1.2]];
  for (const [x, y, a, r] of pile) {
    const dir = [Math.cos(a), Math.sin(a), 0.15];
    chips.push(PARTS.coil([x, y, TRAY_Z[1] + r + 0.3], dir, { length: 7 + r * 2, radius: () => r, turns: 3, phase: a * 2, width: 0.28, n: 64 }));
  }
  box("stand", TRAY, TRAY_Z[0], TRAY_Z[1], { tone: "mid" }, { name: "stand.tray", extra: extra + chips.map((d) => `<path class="lt-chip-old" d="${d}"/>`).join(""), bevel: 1.2, steps: 6, inner: Ln(k.sideSeam(TRAY, TRAY_Z[0] + 4, P, 6), { tone: "faint" }) });
  const keyF = alongX([96, 66, TRAY_Z[1] + 1.4]);
  turned("stand", keyF, [[0, 1.4], [26.9, 1.4]], { tone: "hi", crease: "lo" }, { name: "stand.key-shaft", owner: "key" });
  prism("stand", G.frameOf([94, 66, TRAY_Z[1] + 1.4], X, Z, [0, -1, 0]), [[-1.1, -1.1], [1.1, -1.1], [1.1, 1.1], [-1.1, 1.1]], 0, 2, { tone: "mid" }, { name: "stand.key-drive", owner: "key" });
  turned("stand", alongY([124, 57, TRAY_Z[1] + 1.6]), [[0, 1.6], [18, 1.6]], { tone: "hi", crease: "lo" }, { name: "stand.key-bar", owner: "key" });
  const drain = G.frameOf([TRAY.x + TRAY.w - 16, TRAY.y + TRAY.d - 14, TRAY_Z[1]], Z, X, Y);
  turned("stand", drain, [[0, 3.4], [1.2, 3.4], [1.2, 2.2], [2.4, 2.2]], { tone: "mid" }, { name: "stand.drain", extra: Ln(G.circleOf(drain, 2.4, 1, P, 16), { tone: "lo" }) });
}

// Splash guard along the back of the tray, with a folded lip and two stays.
{
  const plan = { x: -228, y: -72, w: 456, d: 3, r: 0.6 };
  box("stand", plan, TRAY_Z[1], 54, { tone: "lo" }, { name: "stand.splash", bevel: 0.4, steps: 2, extra: Dots([-180, -60, 60, 180].map((x) => at([x, -69, 48])), { size: 0.45, tone: "lo" }) });
  box("stand", { x: -228, y: -72, w: 456, d: 7, r: 0.6 }, 54, 57, { tone: "lo" }, { name: "stand.lip", bevel: 0.3, steps: 2 });
}

// Bed risers, bed casting, ways, vee strips, rack.
for (const plan of RISERS) box("stand", plan, TRAY_Z[1], BED_Z[0], { tone: "lo" }, { name: "stand.riser", bevel: 0.5 });
{
  const ribs = [];
  for (let x = -110; x <= 190; x += 30) ribs.push(path3([[x, -28, BED_Z[1]], [x, 28, BED_Z[1]]]));
  const ends = Dots([[-200, 40], [200, 40], [-200, -40], [200, -40]].map(([x, y]) => at([x, y, BED_Z[1]])), { size: 0.45 });
  box("stand", BED, BED_Z[0], BED_Z[1], { tone: "mid" }, { name: "stand.bed", bevel: 0.8, steps: 3, extra: Ln(ribs.join(""), { tone: "lo" }) + ends, inner: Ln(k.sideSeam(BED, BED_Z[0] + 6, P, 3), { tone: "faint" }) });
}
for (const [index, plan] of WAYS.entries()) {
  box("stand", plan, BED_Z[1], 0, { tone: "mid" }, { name: "stand.way", bevel: 0.5, steps: 2 });
  const F = alongX([VEE_X[0], VEE_Y[index], 0]);
  prism("stand", F, [[0, -3], [3, 0], [0, 3]], 0, VEE_X[1] - VEE_X[0], { tone: "mid" }, { name: "stand.vee" });
}
{
  const plan = { x: -124, y: 44, w: 314, d: 2.4, r: 0.4 };
  const teeth = [];
  for (let x = plan.x + 1.2; x < plan.x + plan.w - 0.6; x += 2.36) teeth.push(path3([[x, 46.4, -14], [x, 46.4, -8]]));
  box("stand", plan, -14, -8, { tone: "mid" }, { name: "stand.rack", bevel: 0.2, steps: 1, extra: Ln(teeth.join(""), { tone: "faint" }) });
}

// Quick-change gearbox under the headstock, and the end bracket.
{
  const plan = { x: -206, y: 44, w: 66, d: 16, r: 2 };
  const face = 60;
  const chart = { x0: -196, x1: -168, z0: -16, z1: -7 };
  const extra =
    Ln(faceRect(face, chart.x0, chart.x1, chart.z0, chart.z1, 0.8), { tone: "lo" }) +
    rules(face, chart.x0 + 2.5, chart.z1 - 2.2, [20, 16, 22]) +
    Dots([at([chart.x0 + 1.2, face, chart.z1 - 1.2]), at([chart.x1 - 1.2, face, chart.z0 + 1.2])], { size: 0.4 });
  box("stand", plan, -42, -4, { tone: "mid" }, { name: "stand.gearbox", extra, bevel: 0.6, inner: Ln(k.sideSeam(plan, -10, P, 3), { tone: "faint" }) });
  for (const [x, z, r] of [[-160, -22, 4], [-182, -30, 4], [-150, -32, 3.2]]) {
    const F = alongY([x, face, z]);
    turned("stand", F, [[0, r + 1.6], [1.4, r + 1.6], [1.4, 1.2], [6, 1.2]], { tone: "mid" }, { name: "stand.selector" });
    ballAt("stand", G.pointOf(F, 6 + 1.8, 0, 0), 2.2, { tone: "hi" }, { name: "stand.selector-knob" });
  }
}
{
  const plan = { x: 192, y: 44, w: 12, d: 14, r: 1.5 };
  box("stand", plan, -40, -8, { tone: "mid" }, { name: "stand.end-bracket", bevel: 0.5, extra: Dots([at([198, 58, -12]), at([198, 58, -36])], { size: 0.45 }) });
}

// Lead screw with a moving thread, feed rod with its keyway, bearing collars.
const LEAD_F = alongX([LEAD.x0, LEAD.y, LEAD.z]);
const FEED_F = alongX([LEAD.x0, FEEDROD.y, FEEDROD.z]);
const PITCH = M.LEAD / M.UNIT;
let threadSvg;
{
  const len = LEAD.x1 - LEAD.x0;
  const clip = G.outlineOf([[0, 0], [0, LEAD.r + 0.25], [len, LEAD.r + 0.25], [len, 0]], LEAD_F, P).fill;
  const lines = [];
  const aV = G.dot3(G.mul3(Z, 1), V);
  const bV = G.dot3([0, -1, 0], V);
  // On this frame a surface point faces the viewer when cos(t)·aV + sin(t)·bV > 0.
  const phi = Math.atan2(bV, aV);
  for (let s = -PITCH; s < len + PITCH; s += PITCH) {
    const pts = [];
    for (let i = 0; i <= 18; i++) {
      const t = phi - Math.PI / 2 + (i / 18) * Math.PI;
      pts.push(G.pointOf(LEAD_F, s + (PITCH * t) / (2 * Math.PI), LEAD.r, t));
    }
    lines.push(path3(pts));
  }
  threadSvg = `<clipPath id="lt-thread"><path d="${clip}"/></clipPath><g clip-path="url(#lt-thread)"><g data-part="thread">${Ln(lines.join(""), { tone: "faint" })}</g></g>`;
  turned("stand", LEAD_F, [[0, LEAD.r], [len, LEAD.r]], { tone: "mid", crease: "none" }, { name: "stand.leadscrew", extra: threadSvg });
  const key = path3([[LEAD.x0, FEEDROD.y + 0.8, FEEDROD.z + FEEDROD.r - 0.3], [LEAD.x1, FEEDROD.y + 0.8, FEEDROD.z + FEEDROD.r - 0.3]]);
  turned("stand", FEED_F, [[0, FEEDROD.r], [len, FEEDROD.r]], { tone: "mid", crease: "none" }, { name: "stand.feedrod", extra: Ln(key, { tone: "lo" }) });
  for (const [x, s0, s1] of [[-140, 0, 3], [192, -3, 0]]) {
    for (const [y, z, r] of [[LEAD.y, LEAD.z, LEAD.r + 2], [FEEDROD.y, FEEDROD.z, FEEDROD.r + 2]]) {
      const F = alongX([x, y, z]);
      disc("stand", F, s0, s1, r, { tone: "mid" }, { name: "stand.collar" });
    }
  }
}

// ---------- Headstock ----------
{
  const front = HEAD.y + HEAD.d;
  const lidPlan = k.insetPlan(HEAD, 3);
  const plate = { x0: -176, x1: -132, z0: 12, z1: 26 };
  const extra =
    Ln(faceRect(front, plate.x0, plate.x1, plate.z0, plate.z1, 1), { tone: "lo" }) +
    rules(front, plate.x0 + 3, plate.z1 - 3.4, [30, 22, 34, 18], 2.4) +
    Dots([at([plate.x0 + 1.6, front, plate.z1 - 1.6]), at([plate.x1 - 1.6, front, plate.z1 - 1.6]), at([plate.x0 + 1.6, front, plate.z0 + 1.6]), at([plate.x1 - 1.6, front, plate.z0 + 1.6])], { size: 0.4 });
  box("stand", HEAD, 0, HEAD_Z, { tone: "mid" }, { name: "stand.headstock", extra, bevel: 1, steps: 5, inner: Ln(k.sideSeam(HEAD, 8, P, 5), { tone: "faint" }) });
  const lidTop = HEAD_Z + 5;
  const screws = k.corners(lidPlan, 5);
  box("stand", lidPlan, HEAD_Z, lidTop, { tone: "mid" }, { name: "stand.lid", bevel: 0.8, steps: 4, extra: Ln(screws.map(([x, y]) => k.ring(x, y, 1.6, lidTop, P, 14)).join(""), { tone: "lo" }) + Dots(screws.map(([x, y]) => at([x, y, lidTop])), { size: 0.45 }) });
  const filler = G.frameOf([-150, -20, lidTop], Z, X, Y);
  turned("stand", filler, [[0, 5.4], [1.4, 5.4], [1.4, 4.4], [4, 4.4]], { tone: "mid" }, { name: "stand.filler", extra: Ln(G.ribsOf(filler, 1.4, 4, 4.4, 28, P, { seams: true }), { tone: "lo" }) });
  // Oil sight glass.
  const glass = alongY([-190, front, 22]);
  turned("stand", glass, [[0, 5], [1.4, 5], [1.4, 3.6], [1.8, 3.6]], { tone: "mid" }, { name: "stand.sightglass", extra: Ln(G.circleOf(glass, 1.8, 2.4, P, 20), { tone: "lo" }) });
}
// Speed selector dial with its knob, the load meter, the reversing switch, the stop button.
{
  const F = KNOB_F;
  const ticks = G.spokesOf(F, 1.6, 9.6, 12, M.SPEEDS.length, P, { from: DATA0.knob.from, to: DATA0.knob.to + (DATA0.knob.to - DATA0.knob.from) / (M.SPEEDS.length - 1) });
  turned("stand", F, [[0, 12], [1.6, 12]], { tone: "hi" }, { name: "stand.speed-dial", extra: Ln(ticks, { tone: "mid" }) });
  turned("stand", F, [[1.6, 7], [5.6, 7], [6.4, 6.2]], { tone: "mid" }, { name: "stand.speed-knob", extra: Ln(G.ribsOf(F, 1.6, 5.6, 7, 30, P, { seams: "first" }), { tone: "lo" }) + `<g data-part="pointer">${PARTS.pointer(5)}</g>` + Dots([at(G.pointOf(F, 6.4, 0, 0))], { size: 0.55, tone: "hi" }) });
}
{
  const F = METER_F;
  const r = DATA0.meter.r;
  const ticks = G.spokesOf(F, 4.4, r - 3, r - 1.2, 11, P, { from: -0.42 * Math.PI, to: 0.42 * Math.PI + (0.84 * Math.PI) / 10 });
  turned("stand", F, [[0, r + 1.6], [2.4, r + 1.6], [2.4, r], [4.4, r]], { tone: "mid" }, { name: "stand.meter", extra: `<path class="lt-glass" d="${G.circleOf(F, 4.4, r - 1.2, P, 40)}"/>` + Ln(ticks, { tone: "mid" }) + `<g data-part="needle">${PARTS.needle(0.6)}</g>` + Dots([at(G.pointOf(F, 4.5, 0, 0))], { size: 0.7, tone: "hi" }) });
}
{
  const F = alongY([-186, 48, 46]);
  turned("stand", F, [[0, 7], [1.6, 7], [1.6, 4.4], [3.4, 4.4]], { tone: "mid" }, { name: "stand.switch" });
  prism("stand", G.frameOf(G.pointOf(F, 3.4, 0, 0), Y, Z, X), [[-1.4, -8], [1.4, -8], [1.4, 8], [-1.4, 8]], 0, 3.2, { tone: "hi" }, { name: "stand.switch-bar" });
  const E = alongY([-150, 48, 46]);
  turned("stand", E, [[0, 7.5], [2.2, 7.5], [2.2, 3], [3.6, 3], [3.6, 6.4], [5.2, 6.6, 1], [6.4, 5.6, 1], [7, 3.4, 1], [7.2, 0]], { tone: "hi" }, { name: "stand.estop" });
}

// Spindle nose, bearing cap and the three-jaw chuck.
const SPIN_F = alongX([0, 0, ZC]);
disc("stand", SPIN_F, HEAD.x + HEAD.w, HEAD.x + HEAD.w + 5, 25, { tone: "mid" }, { name: "stand.bearing-cap", extra: Dots(G.dotsOf(SPIN_F, HEAD.x + HEAD.w + 5, 21.5, 8, P, { all: true, phase: Math.PI / 8 }), { size: 0.45 }) });
disc("stand", SPIN_F, HEAD.x + HEAD.w + 5, CHUCK.back, 30, { tone: "mid" }, { name: "stand.spindle-flange" });
turned("stand", SPIN_F, [[CHUCK.back, 37], [CHUCK.body, 37], [CHUCK.body, CHUCK.r], [CHUCK.face - 2.2, CHUCK.r], [CHUCK.face, CHUCK.r - 2.2]], { tone: "mid" }, {
  name: "stand.chuck",
  inner: Ln(G.arcOf(SPIN_F, CHUCK.body + 9, CHUCK.r, P), { tone: "faint" }),
  extra: `<g data-part="chuck-face">${PARTS.chuckFace(0)}</g>` + Ln(G.circleOf(SPIN_F, CHUCK.face, 12, P, 40), { tone: "faint" }),
});
{
  const J = PARTS.jaws(0);
  const shapesFor = (side) => {
    const out = [];
    for (let index = 0; index < 3; index++) {
      const F = PARTS.spun(PARTS.SPIN, (index * Math.PI * 2) / 3);
      if ((G.dot3(F.u, V) < 0) !== (side === "back")) continue;
      for (const [r0, r1, h] of JAW.steps) out.push(record(A.prism(F, [[r0, -JAW.half], [r1, -JAW.half], [r1, JAW.half], [r0, JAW.half]], 0, h, { name: R.nameFor("stand.jaw"), owner: "chuck" })));
    }
    return out;
  };
  put("stand", [CHUCK.face + 4, 0, ZC], `<g data-part="jaws-back">${J.back}</g>`, { name: "stand.jaws-back", shapes: shapesFor("back"), bias: -0.5 });
  put("stand", [CHUCK.face + 4, 0, ZC], `<g data-part="jaws-front">${J.front}</g>`, { name: "stand.jaws-front", shapes: shapesFor("front"), bias: 0.5 });
}

// ---------- The workpiece ----------
// Three rods along one axis: the grip next to the chuck, the stock ahead of the tool and the
// turned part behind it. The stock is clipped to end at the cut front, a shoulder disc
// rides there, and the turned part is clipped to start there, so the step moves with the tool.
function rodPaths(r, from, to) {
  return S(G.solidOf([[from, r], [to, r]], SPIN_F, P), { tone: "hi", crease: "lo" });
}
function clipFill(r, from, to) {
  return G.outlineOf([[from, 0], [from, r], [to, r], [to, 0]], SPIN_F, P).fill;
}
{
  const r0 = STOCK_R;
  const r1 = RT0;
  const svg =
    `<g data-part="work">` +
    S(G.solidOf([[CHUCK.face, STOCK_R], [GRIP_END, STOCK_R]], SPIN_F, P), { tone: "hi", crease: "lo" }) +
    `<clipPath id="lt-stock-clip"><path data-part="stock-clip" d="${clipFill(r0 + 0.15, GRIP_END - 1, BAR_END + 0.4)}"/></clipPath>` +
    `<g clip-path="url(#lt-stock-clip)"><g data-part="stock">${rodPaths(r0, GRIP_END - 0.5, BAR_END)}</g></g>` +
    `<g data-part="cap">${S(G.disc(BAR_END - 0.05, BAR_END + 0.05, r0, SPIN_F, P), { tone: "hi", crease: "lo" })}</g>` +
    `<clipPath id="lt-cut-clip"><path data-part="cut-clip" d="${clipFill(r1 + 0.15, BAR_END, BAR_END + 300)}"/></clipPath>` +
    `<g clip-path="url(#lt-cut-clip)"><g data-part="cut">${rodPaths(r1, GRIP_END - 0.5, BAR_END)}</g></g>` +
    Ln(G.circleOf(SPIN_F, BAR_END + 0.06, 1.7, P, 20), { tone: "lo" }) +
    `<g data-part="fresh" opacity="0">${rodPaths(STOCK_R, CHUCK.face, BAR_END)}</g>` +
    `</g>`;
  const grip = record(A.disc(SPIN_F, CHUCK.face, GRIP_END, STOCK_R, { name: "work.grip", owner: "work" }));
  const cutShape = record(A.disc(SPIN_F, GRIP_END, BAR_END, RT0, { name: "work.bar", owner: "work" }));
  put("stand", [0, 0, ZC], svg, { name: "work", shapes: [grip, cutShape] });
}

// ---------- Tailstock ----------
{
  const base = { x: TAIL.x, y: -42, w: TAIL.w, d: 84, r: 2 };
  box("stand", base, 3, 12, { tone: "mid" }, { name: "stand.tail-base", owner: "tail", bevel: 0.6, extra: Dots(k.corners(base, 5).map(([x, y]) => at([x, y, 12])), { size: 0.45 }) });
  const body = { x: TAIL.x + 4, y: -22, w: TAIL.w - 8, d: 44, r: 3 };
  box("stand", body, 12, 47, { tone: "mid" }, { name: "stand.tail-body", owner: "tail", bevel: 0.6, steps: 4 });
  const barrelF = SPIN_F;
  turned("stand", barrelF, [[TAIL.x, 17], [TAIL.x + 2, 19], [TAIL.x + TAIL.w - 4, 19], [TAIL.x + TAIL.w - 2, 17]], { tone: "mid" }, { name: "stand.tail-barrel", owner: "tail", inner: Ln(G.arcOf(barrelF, TAIL.x + 20, 19, P), { tone: "faint" }) });
  // Quill with a scale along its top, live centre and the cone that seats in the centre hole.
  turned("stand", barrelF, [[QUILL_END, 9], [TAIL.x + 1, 9]], { tone: "hi", crease: "lo" }, { name: "stand.quill", owner: "tail" });
  turned("stand", barrelF, [[CENTRE_AT, 7], [CENTRE_AT + 1.2, 8.4], [QUILL_END, 8.4]], { tone: "mid" }, { name: "stand.live-centre", owner: "tail", inner: Ln(G.arcOf(barrelF, CENTRE_AT + 7, 8.4, P), { tone: "faint" }) });
  turned("stand", barrelF, [[BAR_END, 1.4], [CENTRE_AT, 5.6], [CENTRE_AT, 0]], { tone: "hi" }, { name: "stand.centre-cone", owner: "tail" });
  // Quill lock lever on the barrel and base clamp nut at the front.
  const lockF = G.frameOf([TAIL.x + 10, 0, ZC + 19], Z, X, Y);
  turned("stand", lockF, [[0, 3.4], [3, 3.4]], { tone: "mid" }, { name: "stand.quill-lock", owner: "tail" });
  prism("stand", G.frameOf([TAIL.x + 10, 0, ZC + 22], Z, X, Y), [[-1.2, -1.2], [1.2, -1.2], [1.2, 14], [-1.2, 14]], 0, 1.8, { tone: "mid" }, { name: "stand.quill-lever", owner: "tail" });
  ballAt("stand", [TAIL.x + 10, 16, ZC + 22.9], 2.3, { tone: "hi" }, { name: "stand.quill-knob", owner: "tail" });
  const nutF = alongY([TAIL.x + TAIL.w / 2, 42, 7.5]);
  turned("stand", nutF, [[0, 4.2], [3, 4.2], [3, 2.2], [5, 2.2]], { tone: "mid" }, { name: "stand.tail-nut", owner: "tail" });
  // Handwheel on the end.
  const T = WHEELS.tail;
  disc("stand", alongX([TAIL.x + TAIL.w - 2, 0, ZC]), 0, 6, 6, { tone: "mid" }, { name: "stand.tail-hub", owner: "tail" });
  turned("stand", T.F, [[0, 0], [0, T.r], [1.2, T.r], [T.face, T.r - 1.4], [T.face, 0]], { tone: "mid" }, { name: "stand.tail-wheel", owner: "tail", extra: `<g data-part="tail-turn">${PARTS.wheelTurn(T, 0.6)}</g>` });
}

// ---------- Carriage: saddle, apron, cross slide, compound, tool post, tool ----------
const C = "carriage";
{
  const extra = Dots([SADDLE.x + 4, SADDLE.x + SADDLE.w - 4].flatMap((x) => [-44, 50].map((y) => at([x, y, SADDLE_Z[1]]))), { size: 0.45 });
  box(C, SADDLE, SADDLE_Z[0], SADDLE_Z[1], { tone: "mid" }, { name: "carriage.saddle", bevel: 0.6, steps: 3, extra });
  const gib = { x: XC - 20, y: -30, w: 40, d: 74, r: 1 };
  box(C, gib, SADDLE_Z[1], SADDLE_Z[1] + 1.2, { tone: "lo" }, { name: "carriage.dovetail", bevel: 0.2, steps: 1 });
}
{
  const face = APRON.y + APRON.d;
  const plate = { x0: XC + 12, x1: XC + 30, z0: -36, z1: -28 };
  const extra =
    Ln(faceRect(face, plate.x0, plate.x1, plate.z0, plate.z1, 0.8), { tone: "lo" }) +
    rules(face, plate.x0 + 2, plate.z1 - 2.2, [12, 9, 13], 2) +
    Dots([[APRON.x + 3, -37], [APRON.x + APRON.w - 3, -37], [APRON.x + 3, 6], [APRON.x + APRON.w - 3, 6]].map(([x, z]) => at([x, face, z])), { size: 0.45 });
  box(C, APRON, APRON_Z[0], APRON_Z[1], { tone: "mid" }, { name: "carriage.apron", bevel: 0.6, steps: 3, extra });
  // Feed engage knob.
  const F = alongY([XC + 21, face, -4]);
  turned(C, F, [[0, 4.6], [1.2, 4.6], [1.2, 3.6], [4.6, 3.6], [5.2, 3]], { tone: "mid" }, { name: "carriage.feed-knob", extra: Ln(G.ribsOf(F, 1.2, 4.6, 3.6, 22, P, { seams: "first" }), { tone: "lo" }) });
  // Half-nut lever: a pivot boss and the moving arm.
  const L = alongY(LEVER.pivot);
  turned(C, L, [[0, 3.6], [1.2, 3.6], [1.2, 2.4], [2.4, 2.4]], { tone: "mid" }, { name: "carriage.lever-boss" });
  const armShape = record(A.prism(G.frameOf(G.add3(LEVER.pivot, [0, 2.4, 0]), Y, [Math.cos(LEVER.down), 0, Math.sin(LEVER.down)], [Math.sin(LEVER.down), 0, -Math.cos(LEVER.down)]), [[-1.2, -1.3], [LEVER.length, -0.9], [LEVER.length, 0.9], [-1.2, 1.3]], 0, 1.6, { name: "carriage.lever" }));
  put(C, G.add3(LEVER.pivot, [3, 3, -4]), `<g data-part="lever">${PARTS.lever(true).replace(/^/, "")}</g>`, { name: "carriage.lever", shapes: [armShape], bias: 0.4 });
  // Thread-chasing dial on a bracket at the apron's right end, its gear on the lead screw.
  box(C, { x: XC + 34, y: 54, w: 8, d: 4, r: 0.6 }, -6, 0, { tone: "mid" }, { name: "carriage.dial-bracket", bevel: 0.3, steps: 2 });
  const TD = DATA0.dial;
  turned(C, TD.F, [[0, 4], [15, 4], [15, 5], [17, 5]], { tone: "mid" }, { name: "carriage.dial-body", inner: Ln(G.arcOf(TD.F, 7, 4, P), { tone: "faint" }) });
  turned(C, TD.F, [[17, TD.r], [TD.top, TD.r]], { tone: "hi", crease: "lo" }, {
    name: "carriage.dial-face",
    extra: Ln(G.spokesOf(TD.F, TD.top, TD.r - 1.4, TD.r, 8, P), { tone: "mid" }) + `<g data-part="thread-dial">${PARTS.dial(0)}</g>` + Dots([at(G.pointOf(TD.F, TD.top, 0, 0))], { size: 0.55, tone: "hi" }),
  });
  // Apron handwheel on the rack pinion.
  const Wa = WHEELS.apron;
  turned(C, Wa.F, [[0, 4.5], [1.6, 4.5]], { tone: "mid" }, { name: "carriage.apron-hub" });
  turned(C, Wa.F, [[1.6, 0], [1.6, Wa.r], [2.8, Wa.r], [Wa.face, Wa.r - 1.6], [Wa.face, 0]], { tone: "mid" }, { name: "carriage.apron-wheel", extra: `<g data-part="apron-turn">${PARTS.wheelTurn(Wa, 0)}</g>` });
}
{
  // Cross slide on the saddle's dovetail, its screw bracket, dial collar and handwheel.
  box("slide", CROSS, CROSS_Z[0], CROSS_Z[1], { tone: "mid" }, { name: "slide.cross", bevel: 0.6, ride: C, extra: Dots([[CROSS.x + 3, CROSS.y + 3], [CROSS.x + CROSS.w - 3, CROSS.y + 3]].map(([x, y]) => at([x, y, CROSS_Z[1]])), { size: 0.45 }) });
  const bracket = { x: XC - 8, y: 44, w: 16, d: 10, r: 1 };
  box(C, bracket, SADDLE_Z[1], 26, { tone: "mid" }, { name: "carriage.cross-bracket", bevel: 0.4, steps: 2, extra: Ln(path3([[XC, 54, 26], [XC, 54, 23.5]]), { tone: "hi" }) });
  const Wc = WHEELS.cross;
  const collarF = alongY([XC, 54, 20]);
  const ticks = G.spokesOf(collarF, 6, 5.4, 6.6, 50, P);
  const majors = G.spokesOf(collarF, 6, 4.6, 6.6, 10, P);
  turned("slide", collarF, [[0, 6.6], [6, 6.6]], { tone: "hi", crease: "lo" }, { name: "slide.dial", ride: C, extra: Ln(ticks, { tone: "lo" }) + Ln(majors, { tone: "mid" }) + `<g data-part="cross-dial">${PARTS.collar(0)}</g>` });
  turned("slide", Wc.F, [[-3, 2.6], [0, 2.6]], { tone: "mid" }, { name: "slide.cross-hub", ride: C });
  turned("slide", Wc.F, [[0, 0], [0, Wc.r], [1, Wc.r], [Wc.face, Wc.r - 1.2], [Wc.face, 0]], { tone: "mid" }, { name: "slide.cross-wheel", ride: C, extra: `<g data-part="cross-turn">${PARTS.wheelTurn(Wc, 0)}</g>` });
}
{
  // Compound rest: a swivel base with degree ticks and the top slide with its crank.
  const swivel = G.frameOf([XC, 27, CROSS_Z[1]], Z, X, Y);
  const deg = G.spokesOf(swivel, 3, 13.8, 15, 36, P, { from: Math.PI * 0.55, to: Math.PI * 1.45 });
  turned("slide", swivel, [[0, 15], [3, 15]], { tone: "mid" }, { name: "slide.swivel", ride: C, extra: Ln(deg, { tone: "lo" }) });
  const top = { x: XC - 13, y: 10, w: 26, d: 34, r: 1.2 };
  box("slide", top, 27, 35, { tone: "mid" }, { name: "slide.compound", bevel: 0.5, steps: 2, ride: C, inner: Ln(k.sideSeam(top, 31, P, 2), { tone: "faint" }) });
  const crankF = alongY([XC, 44, 31]);
  turned("slide", crankF, [[0, 3.4], [3, 3.4], [3, 2], [6, 2]], { tone: "mid" }, { name: "slide.compound-boss", ride: C });
  prism("slide", G.frameOf(G.pointOf(crankF, 6, 0, 0), Y, Z, X), [[-1.6, -1.6], [1.6, -1.6], [1.6, 11], [-1.6, 11]], 0, 1.6, { tone: "mid" }, { name: "slide.crank-arm", ride: C });
  const knobF = alongY([XC + 9.6, 51.6, 31]);
  turned("slide", knobF, [[0, 1.6], [4.8, 1.8, 1], [5.6, 1.2, 1], [6, 0]], { tone: "hi" }, { name: "slide.crank-knob", ride: C });
}
{
  // Tool post (lower block, back wall, upper block), the tool in its slot and the insert.
  box("slide", POST, POST_Z[0], POST_Z[1], { tone: "mid" }, { name: "slide.post-low", bevel: 0.5, steps: 2, ride: C });
  box("slide", { x: XT0 + 9, y: POST.y, w: 10, d: POST.d, r: 0.8 }, POST_Z[1], POST_Z[2], { tone: "mid" }, { name: "slide.post-back", bevel: 0.3, steps: 2, ride: C });
  const screws = [[XT0 + 4, 29], [XT0 + 4, 36]];
  box("slide", POST, POST_Z[2], POST_Z[3], { tone: "mid" }, {
    name: "slide.post-top",
    bevel: 0.5,
    steps: 2,
    ride: C,
    extra: Ln(screws.map(([x, y]) => k.ring(x, y, 2.4, POST_Z[3], P, 18)).join("") + screws.map(([x, y]) => path3([[x - 0.9, y - 0.9, POST_Z[3]], [x + 0.9, y - 0.9, POST_Z[3]], [x + 0.9, y + 0.9, POST_Z[3]], [x - 0.9, y + 0.9, POST_Z[3]]], true)).join(""), { tone: "lo" }),
  });
  const bolt = G.frameOf([XT0 + 14, 33, POST_Z[3]], Z, X, Y);
  turned("slide", bolt, [[0, 3.8], [2.6, 3.8], [3.2, 3.2]], { tone: "mid" }, { name: "slide.post-bolt", ride: C, extra: Ln(path3(Array.from({ length: 6 }, (_, i) => [XT0 + 14 + 1.6 * Math.cos((i * Math.PI) / 3), 33 + 1.6 * Math.sin((i * Math.PI) / 3), POST_Z[3] + 3.2]), true), { tone: "lo" }) });
  // The tool: a square shank from the post to its head, a seat under the insert, and the insert.
  const tipY = RT0;
  const shank = { x: XT0, y: tipY + 5, w: 8, d: POST.y + POST.d - 2 - (tipY + 5), r: 0.4 };
  box("slide", shank, POST_Z[1], POST_Z[2], { tone: "hi", crease: "lo" }, { name: "slide.tool", bevel: 0.3, steps: 1, ride: C });
  const head = [[0.4, 1.2], [7.2, 1.4], [8, 5], [0.4, 5]];
  const HF = G.frameOf([XT0, tipY, 0], Z, X, Y);
  prism("slide", HF, head, POST_Z[1], ZC - 2.2, { tone: "hi", crease: "lo" }, { name: "slide.tool-head", ride: C });
  const insert = [[0, 0], [6.8, 0.7], [7.6, 5], [0.3, 5]];
  prism("slide", HF, insert, ZC - 2.2, ZC, { tone: "hi", lit: true }, { name: "slide.insert", ride: C, extra: Dots([at([XT0 + 3.8, tipY + 2.9, ZC])], { size: 0.5, tone: "lo" }) + `<g data-part="chip"></g>` });
}

// ---------- Order, page ----------
A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);

const groups = R.items.map((item, index) => {
  const m = item.move ?? [0, 0, 0];
  return `<g class="it" data-name="${item.name}" data-piece="${item.piece}" data-k="${item.key.toFixed(3)}" data-m="${m.join(",")}" data-i="${index}">${item.svg}</g>`;
});

const LABEL =
  "A bench engine lathe on two cabinet pedestals and a chip tray. On the left the headstock carries a speed selector, a spindle load meter, a reversing switch and a stop button, and turns a three-jaw chuck holding a 40 mm steel bar; on the right the tailstock's live centre supports the bar's end. Between them the carriage rides the bed's vee ways: its apron hangs in front of the lead screw, its cross slide and compound carry a tool post, and the carbide insert turns the bar to a smaller diameter as the carriage feeds toward the chuck.";
const svg = k.figureSvg({ width: W, height: H, label: LABEL, body: [halo, `<g class="lt-items">${groups.join("")}</g>`] });

const EX = k.axisVector(P, X);
const EY = k.axisVector(P, Y);
const EZ = k.axisVector(P, Z);
const DATA = {
  P,
  V,
  EX,
  EY,
  EZ,
  ...DATA0,
  wheels: WHEELS,
  model: { speeds: M.SPEEDS, depths: M.DEPTHS, stock: M.STOCK, unit: M.UNIT, crossPitch: M.CROSS_PITCH, crossDivs: M.CROSS_DIVS, rackPerTurn: M.RACK_PER_TURN, lead: M.LEAD, dialTeeth: M.DIAL_TEETH, motor: M.MOTOR_KW * M.DRIVE_EFF },
  xt0: XT0,
  xt1: XT1,
  barEnd: BAR_END,
  gripEnd: GRIP_END,
  rt0: RT0,
  pitch: PITCH,
  spinF: SPIN_F,
};

const kitPath = new URL("../../../../.skill/kit/lathe.mjs", import.meta.url);
const latheSource = readFileSync(kitPath, "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");
const latheScript = `const G = (() => {${latheSource}\nreturn { viewOf, scaleOf, frameAlong, frameOf, pointOf, disc, solidOf, outlineOf, sphereOf, prismOf, circleOf, dot3, add3, sub3, mul3, unit3, cross3, len3 };})();\n`;
const partsScript = readFileSync(join(HERE, "parts.mjs"), "utf8").replace(/^export /gm, "");
const modelScript = `const { cutting, planPasses, roughness, clock } = (() => {${readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "")}\nreturn { cutting, planPasses, roughness, clock };})();\n`;
const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));
const CSS = readFileSync(join(HERE, "lathe.css"), "utf8");

const start = M.cutting(M.STOCK, M.SPEEDS[5], PASS0[0].ap, PASS0[0].f);
const body =
  `<style>${CSS}</style>` +
  k.plateHtml({
    fig: "Fig 1",
    title: "Engine lathe, turning a bar",
    hint: "← → spindle speed · ↑ ↓ depth · space feed",
    readout: `Ø40.0 → 37.0 mm · ${M.SPEEDS[5]} rpm · vc ${start.vc.toFixed(0)} m/min · ${start.kw.toFixed(2)} kW`,
    keys: [
      { mark: "lit", label: "Carbide insert and chip: where the metal is cut" },
      { mark: "raised", label: "Workpiece: 40 mm steel bar between chuck and live centre" },
      { mark: "flat", label: "Carriage: saddle, apron, cross slide, compound, tool post" },
      { mark: "edge", label: "Live dials: speed selector, load meter, cross-slide collar, thread dial" },
    ],
    caption:
      "A 250 × 550 mm bench engine lathe turning a 40 mm bar of C45 steel to 30.5 mm with a coated carbide insert (0.8 mm nose radius, 93° approach). The half-nut closes on the 6 mm lead screw and drives the carriage toward the chuck at 0.20 mm per spindle revolution, so the bar comes out twice the depth of cut smaller. Three roughing passes at 1.5 mm leave 0.25 mm for a finishing pass at 0.08 mm/rev; between passes the cross slide backs off, the carriage returns and the collar is turned in, 0.02 mm per division. Cutting speed is vc = π·D·n; cutting power is vc·ap·f·kc with Kienzle's kc for C45 (kc1.1 = 2220 N/mm², mc = 0.14), and the meter reads it against the 1.87 kW the 2.2 kW motor delivers at the spindle; the motor carries a short overload, but past 120 % its thermal relay trips and the spindle stops until the speed or the depth comes down. Roughness is the nose radius's theoretical Ra = f²/32rε. The thread dial stands still only while the half-nut is closed. Machine time runs 18× faster than the page and the chuck turns at 1/33 of its speed.",
    body: `<div class="iso-stage lt-stage" tabindex="0" role="group" aria-label="Engine lathe. Left and right arrows change spindle speed, up and down change the roughing depth of cut, space pauses the power feed.">${svg}<span class="lt-sr" role="status" aria-live="polite" data-status></span></div>`,
  });

const page = k.pageHtml({ title: "Engine lathe", theme: THEME, body, script: kitScript() + latheScript + modelScript + partsScript + LIVE, width: 760 });
const name = THEME === "light" ? "engine-lathe-light.html" : "engine-lathe.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, `${(page.length / 1024).toFixed(0)} KB`, `${R.items.length} items`, `scale ${KS.toFixed(3)}`);

A.auditOrExit(R, P, {});
