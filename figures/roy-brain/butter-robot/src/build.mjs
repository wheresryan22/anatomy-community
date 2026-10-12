// Fig 1 · The butter robot. A Rick and Morty fan figure built with the anatomy kit's 3D mode.
// node build.mjs [--light]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as M from "./model.mjs";
import * as k from "../../../../.skill/kit/iso-kit.mjs";
import * as G from "../../../../.skill/kit/lathe.mjs";
import * as A from "../../../../.skill/kit/audit.mjs";
import { turning } from "../../../../.skill/kit/turn-build.mjs";
import { turnScript, glScript } from "../../../../.skill/scripts/inline-kit.mjs";
import { glCamera } from "../../../../.skill/kit/gl.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const theme = argv.includes("--light") ? "light" : "dark";

const W = 760;
const H = 560;
const AZIMUTH = 40;
const ELEVATION = 30;
const HX = M.HOME;
const X = (x) => HX + x;

const TABLE = { x: -300, y: -140, w: 630, d: 280, r: 10 };
const TABLE_H = 16;
// Fit every orbit angle: the table's corners, the robot's top at both ends of its run, and the steam's crown.
const turnAbout = ([x, y, z], deg) => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), dx = x - M.VIEW_AT[0], dy = y - M.VIEW_AT[1]; return [M.VIEW_AT[0] + dx * c - dy * s, M.VIEW_AT[1] + dx * s + dy * c, z]; };
const FIT = [];
for (let deg = 0; deg < 360; deg += 10) for (const p of [...k.boxCorners(TABLE, -TABLE_H, 0), [X(2), 0, 226], [X(2 - M.TRAVEL), 0, 226], [M.PLATE[0], 0, 120]]) FIT.push(turnAbout(p, deg));
export const P = k.fitProjection(FIT, W, H, { pad: 14, headroom: 52, azimuth: AZIMUTH, elevation: ELEVATION });
const KS = G.scaleOf(P);
export const R = A.recorder(P);
export const T = turning(P, { recorder: R });

// ---- groups, from the model ----
const GR = {};
for (const g of M.GROUPS) {
  const parent = g.parent ? GR[g.parent] : undefined;
  const spec = g.kind === "slide" ? { slide: { direction: g.direction, travel: g.travel } }
    : g.kind === "turn" ? { turn: { pivot: g.pivot } }
    : g.kind === "hinge" ? { hinge: { point: g.point, axis: g.axis, range: g.range } }
    : { free: { origin: g.origin } };
  GR[g.name] = T.group(g.name, { parent, ...spec });
}
const floor = T.layer("floor");
const bot = T.layer("bot");
T.stack(["back", "floor", "bot"]);

// ---- helpers ----
const unit = G.unit3;
const frameOf = (o, a, u) => {
  const axis = unit(a);
  const uu = unit(G.sub3(u, G.mul3(axis, G.dot3(u, axis))));
  return { o, a: axis, u: uu, v: G.cross3(axis, uu) };
};
const L = (group, layer = bot) => ({ group: group ? GR[group] : undefined, layer });
const box = (name, group, plan, z, h, o = {}) => T.prism({ name, ...L(group, o.layer), plan, z, h, steps: o.steps ?? 3, tone: o.tone ?? "mid", crease: o.crease ?? "faint", bevel: o.bevel ?? 0, material: o.material, lit: o.lit, details: o.details ?? {} });
// A prism across y, from a convex outline drawn in the x-z plane (x relative to HOME).
const ySlab = (name, group, y0, y1, pts, o = {}) => {
  const F = { o: [HX, y0, 0], a: [0, 1, 0], u: [0, 0, 1], v: [1, 0, 0] };
  const polygon = pts.map(([x, z]) => [z, x]);
  return T.prism({ name, ...L(group), F, polygon, s0: 0, s1: y1 - y0, tone: o.tone ?? "mid", crease: o.crease ?? "faint", bevel: o.bevel ?? 0, material: o.material, lit: o.lit, details: o.details ?? {} });
};
const round = (name, group, o, a, u, s0, s1, r, opt = {}) => T.round({ name, ...L(group), F: frameOf(o, a, u), s0, s1, r, ends: opt.ends, tone: opt.tone ?? "mid", crease: opt.crease ?? "faint", material: opt.material, lit: opt.lit, details: opt.details ?? {} });
const arc = (cx, cz, r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => { const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180; return [cx + r * Math.cos(a), cz + r * Math.sin(a)]; });
const stadium = (x0, x1, cz, r, n = 10) => [...arc(x1, cz, r, -90, 90, n), ...arc(x0, cz, r, 90, 270, n)];
const tab = (x0, x1, z0, cz, r, n = 10) => [[x0, z0], [x1, z0], ...arc((x0 + x1) / 2, cz, r, 0, 180, n)];
const screw = (at, normal, size = 0.5) => ({ at, normal, size, tone: "mid" });
const rect = (x0, x1, z0, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
const roundedRectPath = (x, y, w, h, r) => `M${x + r} ${y}L${x + w - r} ${y}A${r} ${r} 0 0 1 ${x + w} ${y + r}L${x + w} ${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}L${x + r} ${y + h}A${r} ${r} 0 0 1 ${x} ${y + h - r}L${x} ${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
// A soft glow drawn with its part, so whatever covers the part covers the glow. Sizes in world units.
const glow = (part, at, normal, r, cls, extra = "") => T.billboard({ part, at, normal, fade: [0.02, 0.3], svg: `<g class="${cls}"${extra}><circle class="br-glow-halo" r="${(r * 1.55 * KS).toFixed(2)}"/><circle class="br-glow-body" r="${(r * KS).toFixed(2)}"/><circle class="br-glow-core" r="${(r * 0.42 * KS).toFixed(2)}"/></g>` });

// ---- the table: its own live layer under everything, so it turns with the orbit and light can fall on it ----
function table() {
  const t = box("stand.table", "view", TABLE, -TABLE_H, TABLE_H, { layer: floor, tone: "lo", steps: 8, bevel: 1.2, details: { seams: [-5] } });
  const lines = [];
  for (let x = 40; x < TABLE.w - 4; x += 40) lines.push(`M${x} 0L${x} ${TABLE.d}`);
  for (let y = 40; y < TABLE.d - 4; y += 40) lines.push(`M0 ${y}L${TABLE.w} ${y}`);
  T.plane({ part: t, o: [TABLE.x, TABLE.y, 0], u: [1, 0, 0], v: [0, 1, 0], normal: [0, 0, 1], svg: `<path class="iso-line" data-tone="faint" d="${lines.join("")}"/>` });
}

// ---- breakfast: dish, plate, pancakes, butter ----
function breakfast() {
  const [dx] = M.DISH;
  const dish = { x: dx - 75, y: -48, w: 150, d: 96, r: 14 };
  const d = box("dish", "view", dish, 0, M.DISH_TOP, { tone: "lo", bevel: 0.8, steps: 6, details: { seams: [2.2] } });
  T.plane({ part: d, o: [dish.x, dish.y, M.DISH_TOP], u: [1, 0, 0], v: [0, 1, 0], normal: [0, 0, 1], svg: `<path class="iso-line" data-tone="faint" d="${roundedRectPath(8, 8, dish.w - 16, dish.d - 16, 8)}"/>` });
  const [px, py] = M.PLATE;
  const up = [0, 0, 1];
  round("plate", "view", [px, py, 0], up, [1, 0, 0], 0, 6, [86, 102], { tone: "lo", details: { rings: [{ at: [6, 0, 0], normal: up, r: 76, tone: "faint" }] } });
  const cakes = [[70, 0, 0], [68, 2, -3], [69, -2, 2]];
  let top = null;
  cakes.forEach(([r, ox, oy], i) => { top = round(`pancake.${i + 1}`, "view", [px + ox, py + oy, 6 + 9 * i], up, [1, 0, 0], 0, 9, r, { tone: "mid", material: "gold", details: { seams: [4.5] } }); });
  // without WebGL, a few faint wisps stand in for the steam
  const wisps = [-14, 0, 13].map((x, i) => `<path class="br-wisp" style="--i:${i}" d="M${(x * KS).toFixed(1)} 0c${(-5 * KS).toFixed(1)} ${(-12 * KS).toFixed(1)} ${(6 * KS).toFixed(1)} ${(-18 * KS).toFixed(1)} 0 ${(-34 * KS).toFixed(1)}s${(-4 * KS).toFixed(1)} ${(-20 * KS).toFixed(1)} ${(3 * KS).toFixed(1)} ${(-34 * KS).toFixed(1)}"/>`).join("");
  T.billboard({ part: top, at: [px - 2, py + 2, M.STACK_TOP], normal: up, fade: [0.02, 0.3], svg: `<g class="br-wisps">${wisps}</g>` });
  const B = M.BUTTER;
  const plan = { x: dx - B.l / 2, y: -B.w / 2, w: B.l, d: B.w, r: 2 };
  box("butter.block", "butter", plan, M.DISH_TOP, B.h, { tone: "hi", bevel: 0.6, steps: 3, details: { seams: [M.DISH_TOP + 26] } });
}

// ---- tracks: an open belt of links round a sprocket, an idler and three road wheels on a frame plate ----
export const TREADS = [];
function tracks() {
  for (const side of ["L", "R"]) {
    const s = side === "L" ? 1 : -1;
    const group = `x.track${side}`;
    const Y = (a, b) => (s > 0 ? [a, b] : [-b, -a]);
    const [b0, b1] = Y(30, 52);
    const belt = { material: "rubber", tone: "mid", details: { seams: [11] } };
    const topRun = ySlab(`track${side}.belt.top`, group, b0, b1, rect(-34, 34, 28.6, 32), belt);
    ySlab(`track${side}.belt.low`, group, b0, b1, rect(-34, 34, 0, 3.4), belt);
    for (const [cx, a0] of [[34, -90], [-34, 90]]) for (let i = 0; i < 4; i++) {
      const a = a0 + i * 45, b = a + 45;
      ySlab(`track${side}.belt.${cx > 0 ? "front" : "rear"}${i}`, group, b0, b1, [...arc(cx, 16, 16, a, b, 4), ...arc(cx, 16, 12.6, b, a, 1)], belt);
    }
    // grousers on the top run: the page slides them along as the belt runs
    const lines = Array.from({ length: 12 }, (_, i) => `<path class="iso-line" data-tone="lo" data-g="${i}" d="M${i * 6} 0L${i * 6} 22"/>`).join("");
    T.plane({ part: topRun, o: [X(-34), b0, 32], u: [1, 0, 0], v: [0, 1, 0], normal: [0, 0, 1], svg: `<g data-tread="${side}">${lines}</g>` });
    TREADS.push({ side, length: 68, pitch: 6, count: 12 });
    const [f0, f1] = Y(30, 33);
    const frame = ySlab(`track${side}.frame`, group, f0, f1, stadium(-34, 34, 16, 9, 10), { material: "steel", tone: "mid" });
    void frame;
    // wheels on their axles, each in its own spin group; their faces sit flush on the frame plate
    const inner = s > 0 ? 33 : -33;
    const ay = [0, s, 0];
    for (const w of M.WHEELS) {
      const spin = `spin${side}.${w.id}`;
      const o = [X(w.x), inner, w.z];
      const face = 16;
      if (w.id === "sprocket") {
        round(`track${side}.sprocket`, spin, o, ay, [0, 0, 1], 0, face, 11.4, { material: "gunmetal", tone: "mid", details: { ribs: { s0: 0.6, s1: face - 0.6, count: 16, fade: [0.1, 0.55], seams: true, tone: "lo" }, bolts: [{ s: face, r: 7.8, count: 8, size: 0.55, tone: "mid", fade: [0.04, 0.42] }], rings: [{ at: [face, 0, 0], normal: ay, r: 5, tone: "lo" }] } });
      } else if (w.id === "idler") {
        round(`track${side}.idler`, spin, o, ay, [0, 0, 1], 0, face, 11.4, { material: "steel", tone: "mid", details: { bolts: [{ s: face, r: 7.9, count: 8, size: 0.5, tone: "mid", fade: [0.04, 0.42] }], rings: [{ at: [face, 0, 0], normal: ay, r: 9.8, tone: "faint" }] } });
        round(`track${side}.idler.cap`, spin, G.add3(o, [0, s * face, 0]), ay, [0, 0, 1], 0, 1.4, 4.2, { material: "brass", tone: "hi", details: { dots: [{ at: [1.4, 0, 0], normal: ay, size: 0.6, tone: "mid" }] } });
      } else {
        round(`track${side}.${w.id}`, spin, o, ay, [0, 0, 1], 0, face, 6.6, { material: "rubber", tone: "mid", details: { rings: [{ at: [face, 0, 0], normal: ay, r: 5.1, tone: "lo" }] } });
        round(`track${side}.${w.id}.hub`, spin, G.add3(o, [0, s * face, 0]), ay, [0, 0, 1], 0, 1.6, 3.6, { material: "brass", tone: "hi", details: { bolts: [{ s: 1.6, r: 2.2, count: 6, size: 0.42, tone: "mid", fade: [0.04, 0.42] }], dots: [{ at: [1.6, 0, 0], normal: ay, size: 0.5, tone: "mid" }] } });
      }
    }
  }
}

// ---- chassis: a tray deck with two gear motors under a lid, the battery on the lid, the lean clevis ----
function chassis() {
  const S = { material: "steel", tone: "mid" };
  box("deck.floor", "yaw", { x: X(-40), y: -30, w: 80, d: 60, r: 3 }, 6, 2, { ...S, bevel: 0.4 });
  box("deck.wallL", "yaw", { x: X(-40), y: 27, w: 80, d: 3, r: 0.6 }, 8, 10, { ...S, details: { seams: [12.5] } });
  box("deck.wallR", "yaw", { x: X(-40), y: -30, w: 80, d: 3, r: 0.6 }, 8, 10, { ...S, details: { seams: [12.5] } });
  const nose = box("deck.wallF", "yaw", { x: X(37), y: -27, w: 3, d: 54, r: 0.4 }, 8, 10, S);
  box("deck.wallB", "yaw", { x: X(-40), y: -27, w: 3, d: 54, r: 0.4 }, 8, 10, S);
  // cooling slots on the nose, closed outlines so nothing ends on a bare face
  const slots = [-16, -8, 0, 8, 16].map((u) => roundedRectPath(u - 2, 2.6, 4, 5.4, 1.6)).join("");
  T.plane({ part: nose, o: [X(40), 0, 8], u: [0, 1, 0], v: [0, 0, 1], normal: [1, 0, 0], svg: `<path class="iso-line" data-tone="lo" d="${slots}"/>` });
  const topDots = [[-4, -26], [-4, 26], [36, -26], [36, 26]].map(([x, y]) => screw([20, X(x), y], [0, 0, 1]));
  box("deck.top", "yaw", { x: X(-8), y: -30, w: 48, d: 60, r: 1 }, 18, 2, { ...S, bevel: 0.5, details: { dots: topDots, rings: topDots.map((d) => ({ at: d.at, normal: [0, 0, 1], r: 1.2, tone: "lo" })) } });
  const lidDots = [[-36, -26], [-36, 26], [-12, -26], [-12, 26]].map(([x, y]) => screw([20, X(x), y], [0, 0, 1]));
  box("deck.lid", "x.battery", { x: X(-40), y: -30, w: 32, d: 60, r: 1 }, 18, 2, { ...S, bevel: 0.5, details: { dots: lidDots, rings: lidDots.map((d) => ({ at: d.at, normal: [0, 0, 1], r: 1.2, tone: "lo" })) } });
  // the drive: one gear motor per track, its gearbox against the side wall, a driver board between them
  for (const s of [1, -1]) {
    const id = s > 0 ? "L" : "R";
    round(`drive.motor${id}`, "yaw", [X(-22), s * 4, 13], [0, s, 0], [0, 0, 1], 0, 17, 5, { material: "gunmetal", tone: "mid", details: { ribs: { s0: 1.2, s1: 15.8, count: 28, fade: [0.1, 0.55], seams: true, tone: "lo" } } });
    const gearDots = [[-28, 24], [-16, 24]].map(([x, y]) => screw([18, X(x), s * y], [0, 0, 1], 0.45));
    box(`drive.gear${id}`, "yaw", { x: X(-31), y: s > 0 ? 21 : -27, w: 18, d: 6, r: 1 }, 8, 10, { material: "brass", tone: "mid", bevel: 0.3, details: { dots: gearDots, seams: [12] } });
  }
  box("drive.board", "yaw", { x: X(-31), y: -3, w: 18, d: 6, r: 0.4 }, 8, 1.4, { material: "gold", tone: "mid" });
  box("drive.chip", "yaw", { x: X(-25), y: -1.8, w: 6, d: 3.6, r: 0.3 }, 9.4, 1.2, { material: "rubber", tone: "mid" });
  // the battery rides on the lid, at the back: it is the counterweight that lets the mast lean
  const bat = { x: X(-38), y: -22, w: 22, d: 44, r: 2 };
  const terms = [[-32, -13], [-32, 13]].map(([x, y]) => screw([36, X(x), y], [0, 0, 1], 0.7));
  box("battery", "x.battery", bat, 20, 16, { material: "gunmetal", tone: "mid", bevel: 0.5, details: { seams: [24], dots: terms, rings: terms.map((d) => ({ at: d.at, normal: [0, 0, 1], r: 1.8, tone: "lo" })), rules: [[-26, -9, 9], [-23, -9, 4], [-20, -9, 6]].map(([x, a, b]) => ({ points: [[36, X(x), a], [36, X(x), b]], tone: "lo", free: true })) } });
  // its lead plugs into the connector behind the lean pivot: a quick-disconnect when the battery lifts off
  round("power.lead", "x.battery", [X(-16), 0, 23], [1, 0, 0], [0, 0, 1], 0, 8, 1.8, { material: "rubber", tone: "mid" });
  box("power.connector", "yaw", { x: X(-8), y: -6, w: 4, d: 12, r: 0.6 }, 20, 6, { material: "gunmetal", tone: "mid", bevel: 0.3, details: { dots: [screw([26, X(-6), -3.5], [0, 0, 1], 0.45), screw([26, X(-6), 3.5], [0, 0, 1], 0.45)] } });
  for (const s of [1, -1]) {
    const [y0, y1] = s > 0 ? [10, 14] : [-14, -10];
    ySlab(`lean.lug${s > 0 ? "L" : "R"}`, "yaw", y0, y1, tab(-5, 9, 20, 30, 7), { material: "steel", tone: "mid", details: { dots: [{ at: [s > 0 ? 4 : 0, 30, 2], normal: [0, s, 0], size: 0.6, tone: "mid" }] } });
  }
}

// ---- mast and neck (lean group), with the power conduit and its pulse ----
export const PULSES = [];
function mast() {
  round("lean.barrel", "lean", [X(2), -10, 30], [0, 1, 0], [0, 0, 1], 0, 20, 6, { material: "gunmetal", tone: "mid" });
  box("mast.foot", "lean", { x: X(-7), y: -9, w: 18, d: 18, r: 1.5 }, 36, 3, { material: "steel", tone: "mid", bevel: 0.4 });
  box("mast.column", "lean", { x: X(-5), y: -7, w: 14, d: 14, r: 1.5 }, 39, 69, { material: "steel", tone: "mid", bevel: 0.4, details: { seams: [74] } });
  box("mast.collar", "lean", { x: X(-7), y: -9, w: 18, d: 18, r: 1.5 }, 108, 4, { material: "gunmetal", tone: "mid", bevel: 0.4 });
  const conduit = round("power.conduit", "lean", [X(2), 8.6, 39], [0, 0, 1], [1, 0, 0], 0, 69, 1.6, { material: "rubber", tone: "mid" });
  for (let i = 0; i < 9; i++) {
    const z = 44 + i * 7.5;
    T.billboard({ part: conduit, at: [X(2), 10.2, z], normal: [0, 1, 0], fade: [0.02, 0.3], svg: `<circle class="br-pulse" data-pulse="${i}" r="${(1.25 * KS).toFixed(2)}"/>` });
    PULSES.push(z);
  }
  ySlab("neck", "lean", -16, 16, [[-10, 112], [14, 112], [22, 128], [-18, 128]], { material: "gunmetal", tone: "mid" });
  for (const s of [1, -1]) {
    const [y0, y1] = s > 0 ? [12, 15] : [-15, -12];
    ySlab(`neck.lug${s > 0 ? "L" : "R"}`, "lean", y0, y1, tab(-4, 8, 128, 133, 6), { material: "steel", tone: "mid" });
  }
}

// ---- the head (tilt group; the left cover rides with the left arm) ----
function head() {
  round("head.knuckle", "tilt", [X(2), -12, 133], [0, 1, 0], [0, 0, 1], 0, 24, 5, { material: "gunmetal", tone: "mid" });
  box("head.mount", "tilt", { x: X(-6), y: -10, w: 16, d: 20, r: 1 }, 138, 3, { material: "steel", tone: "mid" });
  const S = { material: "steel", tone: "hi", bevel: 0.5 };
  const cornerDots = (z0, z1, x, ys, n) => [z0, z1].flatMap((z) => ys.map((y) => screw([z, x, y], n)));
  box("head.bottom", "tilt", { x: X(-30), y: -32, w: 64, d: 64, r: 1.2 }, 141, 3, S);
  const top = box("head.top", "tilt", { x: X(-30), y: -32, w: 64, d: 64, r: 1.2 }, 202, 3, { ...S, details: { dots: [[-25, -27], [-25, 27], [29, -27], [29, 27]].map(([x, y]) => screw([205, X(x), y], [0, 0, 1])) } });
  void top;
  box("head.front", "tilt", { x: X(31), y: -32, w: 3, d: 64, r: 0.6 }, 144, 58, { ...S, details: { dots: cornerDots(148, 198, X(34), [-28, 28], [1, 0, 0]) } });
  box("head.back", "tilt", { x: X(-30), y: -32, w: 3, d: 64, r: 0.6 }, 144, 58, { ...S, details: { dots: [...cornerDots(148, 198, X(-30), [-28, 28], [-1, 0, 0]), ...grille(X(-30), 14, 180)] } });
  box("head.right", "tilt", { x: X(-27), y: -32, w: 58, d: 3, r: 0.4 }, 144, 58, { ...S, details: { dots: [[-23, 148], [-23, 198], [27, 148], [27, 198]].map(([x, z]) => screw([z, X(x), -32], [0, -1, 0])) } });
  box("head.cover", "x.armL", { x: X(-27), y: 29, w: 58, d: 3, r: 0.4 }, 144, 58, { ...S, details: { dots: [[-23, 148], [-23, 198], [27, 148], [27, 198]].map(([x, z]) => screw([z, X(x), 32], [0, 1, 0])) } });
  // the eye: rubber bezel, knurled steel barrel, a dark glass dome that glows
  const ex = [1, 0, 0];
  round("eye.bezel", "x.lens", [X(34), 0, 173], ex, [0, 0, 1], 0, 4, 21, { material: "rubber", tone: "mid", details: { rings: [{ at: [4, 0, 0], normal: ex, r: 18.6, tone: "lo" }], bolts: [{ s: 4, r: 19.8, count: 8, size: 0.45, tone: "mid" }] } });
  round("eye.barrel", "x.lens", [X(38), 0, 173], ex, [0, 0, 1], 0, 4, 16, { material: "steel", tone: "hi", details: { ribs: { s0: 0.5, s1: 3.5, count: 64, fade: [0.1, 0.55], seams: true, tone: "lo" } } });
  const c = [X(26), 0, 173];
  const n = [-1, 0, 0];
  const Fb = G.frameAlong(c, n);
  const glint = unit([0.9, 0.22, 0.38]);
  const q = G.mul3(glint, 20);
  const glass = T.ball({ name: "eye.glass", ...L("x.lens"), c, r: 20, flats: [{ n, d: -16 }], tone: "hi", material: "gunmetal", details: { dots: [{ at: [G.dot3(q, Fb.a), G.dot3(q, Fb.u), G.dot3(q, Fb.v)], normal: glint, size: 1.5, tone: "hi" }] } });
  glow(glass, [X(46), 0, 173], ex, 9, "br-eye");
  // the inside: camera module, board, two chips, the speaker it talks through
  box("head.camera", "tilt", { x: X(22), y: -14, w: 9, d: 28, r: 1 }, 159, 28, { material: "gunmetal", tone: "mid", bevel: 0.3 });
  box("head.board", "tilt", { x: X(-22), y: -3, w: 40, d: 2, r: 0.3 }, 144, 48, { material: "gold", tone: "mid" });
  box("head.chip1", "tilt", { x: X(-14), y: -1, w: 12, d: 2.4, r: 0.3 }, 168, 12, { material: "rubber", tone: "mid" });
  box("head.chip2", "tilt", { x: X(2), y: -1, w: 8, d: 2, r: 0.3 }, 152, 8, { material: "rubber", tone: "mid" });
  round("head.speaker", "tilt", [X(-27), 14, 180], ex, [0, 0, 1], 0, 6, 9, { material: "gunmetal", tone: "mid", details: { rings: [{ at: [6, 0, 0], normal: ex, r: 6, tone: "lo" }, { at: [6, 0, 0], normal: ex, r: 3, tone: "lo" }] } });
  // the status LED on the lid of the head: it flickers with its voice
  const up = [0, 0, 1];
  const led = round("led.housing", "tilt", [X(22), 0, 205], up, [1, 0, 0], 0, 1.8, 2.6, { material: "gunmetal", tone: "mid" });
  glow(led, [X(22), 0, 206.8], up, 1.7, "br-led");
  // antennas: four posts and two bent wires with crimp sleeves
  for (const [px, py] of [[-14, 20], [18, 20], [-14, -20], [18, -20]]) round(`antenna.post.${px}.${py}`, "tilt", [X(px), py, 205], up, [1, 0, 0], 0, 6, 2.4, { material: "gunmetal", tone: "mid", details: { dots: [{ at: [6, 0, 0], normal: up, size: 0.5, tone: "mid" }] } });
  const ZC = 220;
  const C = 1.6;
  for (const [py, mat, id] of [[20, "brass", "L"], [-20, "copper", "R"]]) {
    for (const px of [-14, 18]) {
      round(`antenna.${id}.leg.${px}`, "tilt", [X(px), py, 211], up, [1, 0, 0], 0, ZC - C - 211, 1.2, { material: mat, tone: "hi" });
      box(`antenna.${id}.sleeve.${px}`, "tilt", { x: X(px) - C, y: py - C, w: 2 * C, d: 2 * C, r: 0.3 }, ZC - C, 2 * C, { material: "gunmetal", tone: "mid", steps: 2 });
    }
    round(`antenna.${id}.bar`, "tilt", [X(-14 + C), py, ZC], ex, [0, 0, 1], 0, 32 - 2 * C, 1.2, { material: mat, tone: "hi" });
  }
}
function grille(x, cy, cz) {
  const out = [];
  for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) if (i * i + j * j <= 5) out.push({ at: [cz + j * 2.6, x, cy + i * 2.6], normal: [-1, 0, 0], size: 0.42, tone: "lo" });
  return out;
}

// ---- arms: shoulder pod, pitch knuckle, yoke, roll pin, upper arm, elbow, forearm, claw ----
function arms() {
  for (const side of ["L", "R"]) {
    const s = side === "L" ? 1 : -1;
    const Y = (a, b) => (s > 0 ? [a, b] : [-b, -a]);
    const ay = [0, s, 0];
    const podGroup = s > 0 ? "x.armL" : "tilt";
    const [py0] = Y(32, 37);
    box(`arm${side}.pod`, podGroup, { x: X(-8), y: py0, w: 20, d: 5, r: 1 }, 178, 20, { material: "gunmetal", tone: "mid", bevel: 0.4, details: { dots: [[-5, 181], [-5, 195], [9, 181], [9, 195]].map(([x, z]) => screw([z, X(x), s * 37], ay, 0.45)) } });
    round(`arm${side}.shoulder`, `pitch${side}`, [X(2), s * 37, 188], ay, [0, 0, 1], 0, 4, 8, { material: "gunmetal", tone: "mid" });
    const [yy0] = Y(41, 46);
    box(`arm${side}.yoke`, `pitch${side}`, { x: X(-6), y: yy0, w: 16, d: 5, r: 1 }, 176, 20, { material: "steel", tone: "mid", bevel: 0.4, details: { dots: [[-3, 192], [7, 192]].map(([x, z]) => screw([z, X(x), s * 46], ay, 0.45)) } });
    round(`arm${side}.roll`, `roll${side}`, [X(-5), s * M.ROLL_Y, 180], [1, 0, 0], [0, 0, 1], 0, 14, 4.5, { material: "gunmetal", tone: "mid", details: { dots: [{ at: [14, 0, 0], normal: [1, 0, 0], size: 0.6, tone: "mid" }] } });
    const [u0, u1] = Y(48, 53);
    ySlab(`arm${side}.upper`, `roll${side}`, u0, u1, [[-2, 175.5], [6, 175.5], ...arc(2, 132, 4, 0, -180, 10)], { material: "steel", tone: "hi" });
    const [e0] = Y(43.5, 48);
    round(`arm${side}.elbow`, `elbow${side}`, [X(2), e0, 132], [0, 1, 0], [0, 0, 1], 0, 4.5, 4.5, { material: "gunmetal", tone: "mid" });
    const [f0, f1] = Y(39, 43.5);
    ySlab(`arm${side}.forearm`, `elbow${side}`, f0, f1, stadium(88, 132, 2, 4).map(([z, x]) => [x, z]), { material: "steel", tone: "hi" });
    const [w0, w1] = Y(35, 39);
    ySlab(`arm${side}.wrist`, `elbow${side}`, w0, w1, rect(-3, 7, 76, 90), { material: "steel", tone: "mid" });
    const [p0, p1] = Y(33, 39);
    ySlab(`arm${side}.prong.top`, `elbow${side}`, p0, p1, rect(-4, 8, 90, 93), { material: "steel", tone: "mid" });
    ySlab(`arm${side}.prong.low`, `elbow${side}`, p0, p1, rect(-4, 8, 73, 76), { material: "steel", tone: "mid" });
    const [q0, q1] = Y(33, 35);
    ySlab(`arm${side}.pad`, `elbow${side}`, q0, q1, rect(-4, 8, 77, 89), { material: "rubber", tone: "mid" });
  }
}

table();
breakfast();
tracks();
chassis();
mast();
head();
arms();

// ---- reachable states: every frame of the cycle, and taking it apart at either end ----
export const FPS = 60;
export const poses = () => {
  const out = [];
  // Every pose is also seen from a different side of the table (7.3 degrees further round each time, so any 50 consecutive
  // frames cover the whole orbit). The engine decides which pairs of parts can ever meet on screen from these states alone,
  // and a pair that only overlaps at some orbit angles would otherwise get no draw-order relation at all.
  let k = 0;
  const spin = () => (k++ * 7.3) % 360;
  for (let i = 0; i <= Math.ceil(M.FETCH * FPS); i++) { const t = i / FPS; out.push(M.valuesOf(M.stateAt(t), null, spin(), t)); }
  for (const t of [0, M.FETCH]) for (let i = 0; i <= Math.ceil(M.APART_S * FPS); i++) out.push(M.valuesOf(M.stateAt(t), M.explodeAt(i / (M.APART_S * FPS)), spin(), t));
  for (let i = 0; i <= Math.ceil(M.RECOVER_S * FPS); i++) out.push(M.valuesOf(M.recoverAt(i / (M.RECOVER_S * FPS)), null, spin(), M.FETCH));
  return out;
};

const verify = false;
const out = T.build({ statics: R.items, poses, verify, strict: true });
A.settle(R, P);

// ---- the page ----
const LABEL = "The butter robot from Rick and Morty on a breakfast table you can turn: a steel cube head with a glowing camera eye, a status light and two antenna wires, a neck hinge, a mast on a lean pivot with a power conduit, two jointed arms with rubber-padded claws, and an open tank-track chassis with sprockets, road wheels, two gear motors under a lid and a battery at the back. Rick asks it to pass the butter; it fetches a 250 gram block from the dish, sets it on his pancakes, asks what its purpose is, and slumps when he tells it.";
const ring = k.roundedPlan(TABLE, 6);
const backSvg = k.figureSvg({ width: W, height: H, label: LABEL, body: [`<path class="iso-halo" data-halo d=""/>`] });
const canvas = (name) => `<canvas class="iso-layer br-gl" data-canvas="${name}" aria-hidden="true"></canvas>`;
const stage = `<div class="iso-stage iso-turn br-stage" tabindex="0" role="group" aria-label="Butter robot. Space passes the butter, A takes the robot apart, drag or the left and right arrows turn the table, up and down pick a part.">${backSvg}${out.layerSvg("floor", { width: W, height: H })}${canvas("pool")}${out.layerSvg("bot", { width: W, height: H })}${canvas("steam")}<p class="br-line" data-line aria-hidden="true"><span class="br-who" data-who></span><span class="br-text" data-text></span></p><span class="br-live" aria-live="polite" data-say></span></div>`;
export const PARTS = [
  { id: "eye", name: "Camera eye", say: "camera eye · it lights what it looks at", prefix: ["eye."] },
  { id: "head", name: "Head, antennas and LED", say: "head · board, camera, speaker, LED", prefix: ["head.", "antenna.", "led."] },
  { id: "arms", name: "Arms and claws", say: "arms · pitch, roll, elbow, pads", prefix: ["armL.", "armR."] },
  { id: "mast", name: "Neck, mast and lean pivot", say: `lean pivot · reaches ${Math.round(M.KEYS.GRIP_AT.f)}–${Math.round(M.KEYS.PLACE_AT.f)} mm`, prefix: ["neck", "mast.", "lean."] },
  { id: "power", name: "Battery and power", say: "battery · counterweight and power, up the mast", prefix: ["battery", "power.", "deck.lid"] },
  { id: "drive", name: "Motors and tracks", say: "drive · two gear motors, skid-steer tracks", prefix: ["drive.", "trackL.", "trackR.", "deck.floor", "deck.wall", "deck.top"] },
  { id: "butter", name: "The butter (its purpose)", say: `butter · ${M.BUTTER.g} g`, prefix: ["butter."] },
];
const legend = `<div class="br-parts">${PARTS.map((p, i) => `<button type="button" class="br-part" data-part="${p.id}"><span class="br-num">${String(i + 1).padStart(2, "0")}</span>${p.name}</button>`).join("")}</div>`;
const controls = `<div class="br-controls"><button type="button" class="br-btn" data-act="pass">Pass the butter</button><button type="button" class="br-btn" data-act="apart">Take apart</button></div>`;
const caption = `Rick asks it to pass the butter. It backs off, turns on its tracks, drives to the dish, leans up to ${Math.round(Math.max(M.KEYS.GRIP.lean, M.KEYS.PLACE.lean))}° on its mast pivot to reach ${Math.round(M.KEYS.GRIP_AT.f)} mm ahead, and grips the ${M.BUTTER.g} g block at ${M.GRIP_N.toFixed(1)} N: one and a half times what rubber pads at μ ${M.MU} need to hold it. The forearms keep one angle while it carries, so the butter stays level. Then it asks what its purpose is. Drag to turn the table. A fan figure of the butter robot from Rick and Morty. Made by Roy Albeck, royalbeck.design.`;
const css = out.css + "\n" + readFileSync(join(HERE, "robot.css"), "utf8");
const DATA = {
  turn: out.data, treads: TREADS, parts: PARTS, fps: FPS, pulses: PULSES.length,
  gl: {
    W, H, camera: glCamera(P), scale: KS,
    table: [TABLE.x, TABLE.y, TABLE.w, TABLE.d, TABLE.r], tableH: TABLE_H, view: M.VIEW_AT, ring,
    eye: { group: "x.lens", at: [X(46), 0, 173], dir: [1, 0, 0] },
    steam: { at: [M.PLATE[0], 0, M.STACK_TOP], r: 52 },
    head: { min: [X(-30), -38, 141], max: [X(34), 38, 226] },
    mast: { min: [X(-8), -10, 30], max: [X(12), 11, 141] },
    butter: { min: [M.DISH[0] - M.BUTTER.l / 2, -M.BUTTER.w / 2, M.DISH_TOP], max: [M.DISH[0] + M.BUTTER.l / 2, M.BUTTER.w / 2, M.DISH_TOP + M.BUTTER.h] },
  },
};
const MODEL = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");
const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));
const body = k.plateHtml({
  fig: "Fig 1",
  title: "Butter robot",
  hint: "Space passes · A takes apart · drag turns",
  readout: "home · butter on the dish",
  caption,
  body: `<style>${css}</style>${stage}${controls}`,
}).replace('<figcaption class="iso-legend">', `<figcaption class="iso-legend">${legend}`);
const page = k.pageHtml({ title: "Butter robot", theme, body, script: turnScript() + glScript() + MODEL + "\n" + LIVE, width: 860 });
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const name = `butter-robot${theme === "light" ? "-light" : ""}.html`;
  writeFileSync(join(HERE, name), page);
  console.log(`wrote ${name} · ${(page.length / 1024).toFixed(0)} KB · ${out.report.parts} parts`);
}
export { out };
