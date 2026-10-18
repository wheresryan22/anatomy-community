import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../.skill/kit/iso-kit.mjs";
import * as G from "../../../../.skill/kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../../../../.skill/kit/tube.mjs";
import * as A from "../../../../.skill/kit/audit.mjs";
import { glCamera } from "../../../../.skill/kit/gl.mjs";
import { kitScript, glScript } from "../../../../.skill/scripts/inline-kit.mjs";
import { blowdown, SUMMARY, MASS0, THRUST0, NOZZLES } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";
const DEG = Math.PI / 180;
const INIT = process.argv.includes("--en") ? "en" : "th";

const W = 680;
const H = 360;
const AZIMUTH = 36;

// Bench
const PLATE = { x: -62, y: -128, w: 124, d: 262, r: 8 };
const PLATE_H = 10;
const FOOT_H = 5;
const RAIL_X = 38;
const RAIL = { y: -96, to: 122, w: 6, h: 4 };

// Sled
const BLOCK_H = 5;
const SLED = { x: -46, y: -76, w: 92, d: 180, r: 3 };
const SLED_Z = RAIL.h + BLOCK_H;
const SLED_TOP = SLED_Z + 4;

// Tanks: two COPVs lying along +y
const TANK_R = 19;
const TANK_X = [-24, 24];
const TANK_Z = SLED_TOP + 3 + TANK_R;
const TANK_Y0 = -66;
const TANK_L = 132;
const DOME = 13;
const POLE = 5;
const DOME_FULL = DOME / Math.sqrt(1 - (POLE / TANK_R) ** 2);
const STRAPS = [30, 102];
const STRAP_W = 5;

// Manifold, valves, nozzles
const MAN = { x: -30, y: 80, w: 60, d: 24, r: 2 };
const MAN_TOP = 53;
const NOZ_X = [-19.5, -6.5, 6.5, 19.5];
const NOZ_Z = 33;
const NOZ_EXIT = MAN.y + MAN.d + 22;

// Stop and load cell
const STOP = { x: -30, y: -112, w: 60, d: 12, r: 1.5 };
const STOP_H = 46;
const CELL_Z = 25;
const CELL_R = 10;
const PLATE_FACE = SLED.y;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [0, -93, 56], [-24, 74, 70], [0, NOZ_EXIT + 95, NOZ_Z + 30], [0, NOZ_EXIT + 95, 0]],
  W,
  H,
  { pad: 16, azimuth: AZIMUTH },
);
const V = G.viewOf(P);
const KS = G.scaleOf(P);
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const Faded = (list, style) => k.fadedSvg(list, style);
const FADE = [0.04, 0.42];
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const UP = [0, 0, 1];
const ALONG = [0, 1, 0];

const R = A.recorder(P);
const { items, nameFor } = R;
const record = R.solid;
function put(ref, svg, { bias = 0, shapes = [], name, route, chunk } = {}) {
  R.put({ piece: "rig", at: ref, bias, svg, move: [0, 0, 0], shapes, name: name ?? nameFor("rig.item"), route, chunk });
}
function tubeItems(route, r, { name, tone = "hi", bias = 0, maxLength = 14, spacing, owner, touch, bundle, limp = false, gaps = [], caps = true, rims } = {}) {
  const id = nameFor(name ?? "rig.tube");
  R.route(id, route, r, { owner: owner ?? id, touch, bundle, limp, gaps, rims, piece: "rig", move: [0, 0, 0] });
  tubePieces(route, r, P, { maxLength, spacing, gaps, caps }).forEach((part, index) =>
    put(part.mid, tubeSvg(part, { tone }), { bias, name: `${id}:${index}`, route: id, chunk: index, shapes: [A.tube(part.points, part.radii)] }),
  );
  return id;
}
function boxAt(plan, z, h, style = {}, { extra = "", inner = "", bias = 0, bevel = 0.5, steps = 3, name, owner } = {}) {
  const id = nameFor(name ?? "rig.box");
  put([plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], S(k.slabOf(plan, z, h, P, steps, bevel), { tone: "hi", ...style, inner }) + extra, { bias, name: id, shapes: [record(A.slab(plan, z, h, { name: id, owner }, steps))] });
  return id;
}
function discAt(F, s0, s1, r, style = {}, { extra = "", bias = 0, name, owner, bevel = 0, inner = "" } = {}) {
  const id = nameFor(name ?? "rig.disc");
  put(G.pointOf(F, (s0 + s1) / 2, 0, 0), S(G.disc(s0, s1, r, F, P, { bevel }), { tone: "hi", ...style, inner }) + extra, { bias, name: id, shapes: [record(A.disc(F, s0, s1, r, { name: id, owner }))] });
  return id;
}
function ballAt(centre, r, { tone = "mid", bias = 0, name, owner } = {}) {
  const id = nameFor(name ?? "rig.ball");
  put(centre, S(G.sphereOf(centre, r, P, { steps: G.stepsFor(r, 32) }), { tone }), { bias, name: id, shapes: [record(A.ball(centre, r, { name: id, owner }))] });
}
function pipe(control, r, { tone = "hi", flanges = [true, true], flangeR = 1.55, bend = 2.6, name, gaps: extra = [], maxLength = 12 } = {}) {
  const line = G.fillet(control, Math.max(r * bend, 3), 12, { P, tube: r });
  const total = G.pathLength(line);
  const collars = [];
  [[0, -1], [total, 1]].forEach(([along, sign], index) => {
    if (!flanges[index]) return;
    const thick = Math.max(0.9, r * 0.55);
    const tangent = G.tangentAlong(line, along);
    collars.push({ centre: G.add3(G.pointAlong(line, along), G.mul3(tangent, (-sign * thick) / 2)), tangent, radius: r * flangeR, thick, gap: sign < 0 ? [0, thick] : [total - thick, total] });
  });
  const owner = tubeItems(line, r, { name: name ?? "rig.pipe", tone, maxLength, spacing: Math.max(0.8, Math.min(2.4, r * 0.18)), gaps: [...collars.map(({ gap }) => gap), ...extra], rims: flanges.map((on) => (on ? r * flangeR : r)) });
  for (const { centre, tangent, radius, thick } of collars) {
    const F = G.frameAlong(centre, tangent);
    const face = G.dot3(F.a, V) > 0 ? thick / 2 : -thick / 2;
    const bolts = Math.abs(G.dot3(F.a, V)) > 0.12 ? Dots(G.dotsOf(F, face, radius * 0.72, 6, P, { all: true }), { size: 0.38, tone: "mid" }) : "";
    discAt(F, -thick / 2, thick / 2, radius, { tone }, { extra: bolts, name: `${owner}.flange`, owner });
  }
  line.owner = owner;
  return line;
}
const CABLES = [];
function cable(points, { r = 0.62, bend = 3.2, name, bundle, touch, bias = 0.2 } = {}) {
  const route = G.fillet(points, bend, 12, { P, tube: r });
  CABLES.push(route);
  const id = tubeItems(route, r, { name: name ?? "rig.cable", tone: "mid", bias, maxLength: 10, spacing: 1, bundle, touch, limp: true });
  for (const end of [route[0], route[route.length - 1]]) put(end, Dots([at(end)], { size: 0.5, tone: "hi" }), { bias: bias + 0.15, name: `${id}.end`, shapes: [A.ball(end, 0.5 / KS)] });
  return route;
}

// ---------- back layer: bench plate, feet, ruler, label ----------
const back = [];
back.push(`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`);
const FEET = byDepth([...k.corners(PLATE, 16), [PLATE.x + 16, 3], [PLATE.x + PLATE.w - 16, 3]]);
for (const [x, y] of FEET) {
  back.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
  back.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
}
back.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: Ln(k.sideSeam(PLATE, -4, P, 8), { tone: "faint" }) }));
record(A.slab(PLATE, -PLATE_H, PLATE_H, { name: "stand.plate", ground: true }));
back.push(Ln(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
const SCREWS = k.corners(PLATE, 10);
back.push(Ln(SCREWS.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
back.push(Dots(SCREWS.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
const STRIP = { x: 47, y: -100, w: 8, d: 214, r: 1 };
back.push(S(k.slabOf(STRIP, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
const TICKS = k.topTicks(STRIP.y + 4, STRIP.y + STRIP.d - 4, 4, 5, STRIP.x + STRIP.w - 0.8, 0.6, [2, 3.6], P, "y");
back.push(Ln(TICKS.minor, { tone: "lo" }), Ln(TICKS.major, { tone: "mid" }));
back.push(Dots([at([STRIP.x + 4, STRIP.y + 2, 0.6]), at([STRIP.x + 4, STRIP.y + STRIP.d - 2, 0.6])], { size: 0.45 }));
const LABEL = { x: 20, y: -122, w: 30, d: 14, r: 1 };
back.push(S(k.slabOf(LABEL, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
back.push(Ln(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P, 4), { tone: "faint" }));
back.push(Ln([[0, 3.6], [1, 7], [2, 10.4]].map(([row, y]) => k.lineOnTop([LABEL.x + 5 + row * 2, LABEL.y + y], [LABEL.x + LABEL.w - 5, LABEL.y + y], 0.8, P)).join(""), { tone: "lo", free: true }));
back.push(Dots([at([LABEL.x + 2.6, LABEL.y + LABEL.d / 2, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d / 2, 0.8])], { size: 0.4 }));
for (const x of [-RAIL_X, RAIL_X]) {
  const plan = { x: x - RAIL.w / 2, y: RAIL.y, w: RAIL.w, d: RAIL.to - RAIL.y, r: 1 };
  back.push(S(k.slabOf(plan, 0, RAIL.h, P, 3, 0.4), { tone: "mid" }));
  record(A.slab(plan, 0, RAIL.h, { name: "stand.rail", ground: true }, 3));
  back.push(Dots([RAIL.y + 5, -40, 20, 80, RAIL.to - 5].map((y) => at([x, y, RAIL.h])), { size: 0.4 }));
}

// ---------- stop and load cell ----------
const STOP_FOOT = { x: STOP.x - 6, y: STOP.y - 4, w: STOP.w + 12, d: STOP.d + 8, r: 1.5 };
boxAt(STOP_FOOT, 0, 3, { tone: "mid" }, { name: "stand.stop-foot", extra: Dots(k.corners(STOP_FOOT, 2.6).map(([x, y]) => at([x, y, 3])), { size: 0.45 }) });
boxAt(STOP, 3, STOP_H - 3, { tone: "mid" }, { name: "stand.stop", bevel: 0.6, inner: Ln(k.sideSeam(STOP, 30, P, 3), { tone: "faint" }), extra: Dots([at([STOP.x + 4, STOP.y + 3, STOP_H]), at([STOP.x + STOP.w - 4, STOP.y + 3, STOP_H]), ...[10, 20, 38].flatMap((z) => [at([STOP.x + STOP.w, STOP.y + 3, z]), at([STOP.x + STOP.w, STOP.y + STOP.d - 3, z])])], { size: 0.45 }) });
for (const x of [STOP.x + 6, STOP.x + STOP.w - 9]) {
  const gusset = [[x, STOP.y], [x + 3, STOP.y], [x + 3, STOP.y - 3.6], [x, STOP.y - 3.6]];
  put([x + 1.5, STOP.y - 1.8, 14], S(k.extrude(gusset.map(([gx, gy]) => [gx, gy]), 3, 22, P), { tone: "mid" }), { name: "stand.gusset", shapes: [record(A.box([x, STOP.y - 3.6, 3], [x + 3, STOP.y, 25], { name: "stand.gusset" }))] });
}
const CELL = G.frameOf([0, STOP.y + STOP.d, CELL_Z], ALONG, [1, 0, 0], [0, 0, 1]);
discAt(CELL, 0, 3, CELL_R + 2, { tone: "mid" }, { name: "cell.flange", extra: Dots(G.dotsOf(CELL, 3, CELL_R + 0.6, 8, P, { fade: FADE }), { size: 0.4 }) });
discAt(CELL, 3, 14, CELL_R, { tone: "hi" }, { name: "cell.body", inner: Ln(G.arcOf(CELL, 8.5, CELL_R, P), { tone: "faint" }) });
discAt(CELL, 14, PLATE_FACE - STOP.y - STOP.d, 3.5, { tone: "hi", lit: true }, { name: "cell.button", bevel: 0.3 });
const DIAL_T = { x: 0, y: CELL.o[1] + 8.5, z: STOP_H + 2, r: 11, h: 6 };
const stemFrom = CELL_Z + Math.sqrt(CELL_R ** 2 - 1.6 ** 2);
discAt(G.frameAlong([DIAL_T.x, DIAL_T.y, 0], UP), stemFrom, DIAL_T.z, 1.6, { tone: "mid" }, { name: "cell.stem" });

// ---------- sled ----------
for (const x of [-RAIL_X, RAIL_X])
  for (const y of [-56, 70]) {
    const plan = { x: x - 6, y: y - 9, w: 12, d: 18, r: 1.2 };
    boxAt(plan, RAIL.h, BLOCK_H, { tone: "mid" }, { name: "sled.bearing", extra: Dots([at([plan.x + 2, plan.y + 2, SLED_Z]), at([plan.x + plan.w - 2, plan.y + plan.d - 2, SLED_Z])], { size: 0.4 }) });
  }
boxAt(SLED, SLED_Z, 4, { tone: "mid" }, {
  name: "sled.plate",
  bevel: 0.8,
  steps: 4,
  extra: Ln(k.planOutline(k.insetPlan(SLED, 4), SLED_TOP, P, 4), { tone: "faint" }) + Dots(k.corners(SLED, 3.4).map(([x, y]) => at([x, y, SLED_TOP])), { size: 0.45 }),
});
const THRUST_PLATE = { x: -16, y: SLED.y, w: 32, d: 5, r: 1 };
boxAt(THRUST_PLATE, SLED_TOP, CELL_Z + 13 - SLED_TOP, { tone: "mid" }, { name: "sled.thrust-plate", extra: Dots([at([-12, SLED.y + 2.5, CELL_Z + 13]), at([12, SLED.y + 2.5, CELL_Z + 13])], { size: 0.45 }) });
for (const x of [-13, 10]) {
  const plan = { x, y: SLED.y + 5, w: 3, d: 8, r: 0.6 };
  boxAt(plan, SLED_TOP, 10, { tone: "mid" }, { name: "sled.gusset", steps: 2, bevel: 0 });
}

// ---------- tanks ----------
const tankR = (s) => {
  if (s < DOME) return TANK_R * Math.sqrt(Math.max(0, 1 - ((DOME - s) / DOME_FULL) ** 2));
  if (s > TANK_L - DOME) return TANK_R * Math.sqrt(Math.max(0, 1 - ((s - TANK_L + DOME) / DOME_FULL) ** 2));
  return TANK_R;
};
const tankSlope = (s) => {
  if (s < DOME) {
    const u = (DOME - s) / DOME_FULL;
    return (TANK_R * u) / (DOME_FULL * Math.sqrt(1 - u * u));
  }
  if (s > TANK_L - DOME) {
    const u = (s - TANK_L + DOME) / DOME_FULL;
    return (-TANK_R * u) / (DOME_FULL * Math.sqrt(1 - u * u));
  }
  return 0;
};
const CUTS = [DOME, STRAPS[0] - STRAP_W / 2, STRAPS[0] + STRAP_W / 2, STRAPS[1] - STRAP_W / 2, STRAPS[1] + STRAP_W / 2, TANK_L - DOME];
const TANKS = [];
for (const [index, tx] of TANK_X.entries()) {
  const F = G.frameOf([tx, TANK_Y0, TANK_Z], ALONG, [1, 0, 0], [0, 0, 1]);
  const body = G.bandsOf([[0, tankR(0)], [TANK_L, tankR(TANK_L)]], CUTS, F, P, { radius: tankR, slope: tankSlope, steps: 96, rows: 8 });
  const TANK_SHAPE = A.solid(F, [[0, tankR(0)], [TANK_L, tankR(TANK_L)]], { radius: tankR, name: `tank${index}.shell` });
  TANKS.push({ F, shape: TANK_SHAPE });
  body.bands.forEach((band, b) => {
    if (b === 2 || b === 4) return;
    const wrap = band.s0 >= DOME - 0.01 && band.s1 <= TANK_L - DOME + 0.01 ? Faded(G.ribsOf(F, band.s0, band.s1, TANK_R, 44, P, { twist: 0.55, fade: [0.1, 0.55], phase: index * 0.3 }), { tone: "faint" }) : "";
    put(G.pointOf(F, (band.s0 + band.s1) / 2, 0, 0), S(band.paths, { tone: "hi", inner: wrap }), { name: `tank${index}.band${b}`, shapes: [record(A.solid(F, band.profile, { radius: tankR, name: `tank${index}.band${b}` }))] });
  });
  for (const [from, to] of [[0, CUTS[1] + 0.35], [CUTS[2] - 0.35, CUTS[3] + 0.35], [CUTS[4] - 0.35, TANK_L]]) {
    const sides = body.sidesOf(from, to, { ends: false, count: 48 });
    for (const points of sides.points) {
      const d = "M" + points.map((p) => at(p).map((v) => v.toFixed(1)).join(" ")).join("L");
      put(points[points.length >> 1], Ln(d, { tone: "hi" }), { bias: 0.2, name: `tank${index}.side`, shapes: [A.tube(points, 0.4 / KS)] });
    }
  }
  for (const s of STRAPS) {
    const id = nameFor(`tank${index}.strap`);
    put(G.pointOf(F, s, 0, 0), S(G.ringBand(s - STRAP_W / 2, s + STRAP_W / 2, TANK_R - 0.01, TANK_R + 1.2, F, P), { tone: "mid" }), { name: id, shapes: [record(A.ring(F, s - STRAP_W / 2, s + STRAP_W / 2, TANK_R - 0.01, TANK_R + 1.2, { name: id }))] });
    for (const side of [-1, 1]) {
      const cradle = { x: tx - 15, y: TANK_Y0 + s + (side < 0 ? -STRAP_W / 2 - 1 - 5 : STRAP_W / 2 + 1), w: 30, d: 5, r: 0.8 };
      boxAt(cradle, SLED_TOP, TANK_Z - TANK_R - SLED_TOP, { tone: "mid" }, { name: `tank${index}.cradle`, steps: 2, bevel: 0.3, extra: Dots([at([cradle.x + 2.2, cradle.y + 2.5, TANK_Z - TANK_R]), at([cradle.x + cradle.w - 2.2, cradle.y + 2.5, TANK_Z - TANK_R])], { size: 0.42 }) });
    }
  }
  discAt(F, -3, 0, POLE, { tone: "mid" }, { name: `tank${index}.plug`, bevel: 0.3, extra: G.dot3(F.a, V) < -0.12 ? Ln(G.circleOf(F, -3, POLE * 0.5, P, 16), { tone: "faint" }) : "" });
  discAt(F, TANK_L, TANK_L + 3, POLE, { tone: "mid" }, { name: `tank${index}.boss` });
}

// ---------- tank outlets into the manifold, a gauge tee on one, a fill tee on the other ----------
const OUT_Y = TANK_Y0 + TANK_L + 3;
const TEE_Y = (OUT_Y + MAN.y) / 2;
const TEE_R = 3.4;
const PIPE_R = 2.2;
for (const [index, tx] of TANK_X.entries()) {
  pipe([[tx, OUT_Y, TANK_Z], [tx, MAN.y, TANK_Z]], PIPE_R, { name: `tank${index}.outlet`, gaps: [[TEE_Y - OUT_Y - Math.sqrt(TEE_R ** 2 - PIPE_R ** 2), TEE_Y - OUT_Y + Math.sqrt(TEE_R ** 2 - PIPE_R ** 2)]] });
  ballAt([tx, TEE_Y, TANK_Z], TEE_R, { tone: "hi", name: `tank${index}.tee` });
}
const RISER_R = 1.3;
const GAUGE = { x: TANK_X[1], y: TEE_Y, z: 61, r: 8, h: 5 };
const riserFrom = TANK_Z + Math.sqrt(TEE_R ** 2 - RISER_R ** 2);
discAt(G.frameAlong([GAUGE.x, GAUGE.y, 0], UP), riserFrom, GAUGE.z - 2, RISER_R, { tone: "mid" }, { name: "gauge.riser" });
discAt(G.frameAlong([GAUGE.x, GAUGE.y, 0], UP), GAUGE.z - 2, GAUGE.z, 2.4, { tone: "mid" }, { name: "gauge.socket" });
const FILL = { x: TANK_X[0], y: TEE_Y };
const fillF = G.frameAlong([FILL.x, FILL.y, 0], UP);
discAt(fillF, riserFrom, TANK_Z + 9, RISER_R, { tone: "mid" }, { name: "fill.riser" });
discAt(fillF, TANK_Z + 9, TANK_Z + 13, 2.6, { tone: "mid" }, { name: "fill.check", bevel: 0.3 });
put([FILL.x, FILL.y, TANK_Z + 14.5], S(G.prismOf(fillF, Array.from({ length: 6 }, (_, i) => [2.4 * Math.cos((i * Math.PI) / 3), 2.4 * Math.sin((i * Math.PI) / 3)]), TANK_Z + 13, TANK_Z + 16, P), { tone: "hi" }), { name: "fill.cap", shapes: [record(A.prism(fillF, Array.from({ length: 6 }, (_, i) => [2.4 * Math.cos((i * Math.PI) / 3), 2.4 * Math.sin((i * Math.PI) / 3)]), TANK_Z + 13, TANK_Z + 16, { name: "fill.cap" }))] });

// ---------- manifold ----------
boxAt(MAN, SLED_TOP, MAN_TOP - SLED_TOP, { tone: "hi" }, {
  name: "man.block",
  bevel: 0.6,
  inner: Ln(k.sideSeam(MAN, MAN_TOP - 6, P, 3), { tone: "faint" }),
  extra: Dots(k.corners(MAN, 2.4).map(([x, y]) => at([x, y, MAN_TOP])), { size: 0.45 }),
});
const NAME = { x: MAN.x + MAN.w, y: MAN.y + 4, w: 0.7, d: 16, r: 0.3 };
boxAt(NAME, 33, 14, { tone: "mid" }, {
  name: "man.nameplate",
  steps: 2,
  bevel: 0,
  extra:
    Ln([[37, 0], [40.5, 3], [44, 1.5]].map(([z, cut]) => k.segment([NAME.x + NAME.w, NAME.y + 3 + cut, z], [NAME.x + NAME.w, NAME.y + NAME.d - 3, z], P)).join(""), { tone: "lo", free: true }) +
    Dots([at([NAME.x + NAME.w, NAME.y + 1.4, 35]), at([NAME.x + NAME.w, NAME.y + NAME.d - 1.4, 45])], { size: 0.38 }),
});
const STRIP_BAR = { x: -24, y: MAN.y + MAN.d - 6, w: 48, d: 4, r: 0.8 };
boxAt(STRIP_BAR, MAN_TOP, 4, { tone: "mid" }, { name: "man.terminal", steps: 2, bevel: 0.3 });
const VALVES = NOZ_X.map((x) => ({ x, y: MAN.y + 9 }));
for (const [index, { x, y }] of VALVES.entries()) {
  const F = G.frameAlong([x, y, 0], UP);
  discAt(F, MAN_TOP, MAN_TOP + 1.2, 5.6, { tone: "mid" }, { name: `valve${index}.base` });
  discAt(F, MAN_TOP + 1.2, MAN_TOP + 10, 4.6, { tone: "hi" }, { name: `valve${index}.coil`, extra: Faded(G.ribsOf(F, MAN_TOP + 3, MAN_TOP + 8.6, 4.6, 18, P, { fade: [0.1, 0.55], seams: true }), { tone: "lo" }) });
  discAt(F, MAN_TOP + 10, MAN_TOP + 11.6, 1.8, { tone: "mid" }, { name: `valve${index}.plug` });
  cable([[x, y, MAN_TOP + 11.6], [x, y, MAN_TOP + 15], [x, STRIP_BAR.y + 2, MAN_TOP + 15], [x, STRIP_BAR.y + 2, MAN_TOP + 4]], { name: `valve${index}.lead`, bundle: "leads", bend: 2.4 });
}
const CTRL = { x: MAN.x + MAN.w + 3, y: MAN.y + 4, w: 12, d: 18, r: 1 };
const CTRL_H = 16;
boxAt(CTRL, SLED_TOP, CTRL_H, { tone: "mid" }, {
  name: "ctrl.box",
  extra: Ln(k.planOutline(k.insetPlan(CTRL, 1.4), SLED_TOP + CTRL_H, P, 2), { tone: "faint" }) + Dots([at([CTRL.x + 2.2, CTRL.y + 2.2, SLED_TOP + CTRL_H]), at([CTRL.x + CTRL.w - 2.2, CTRL.y + CTRL.d - 2.2, SLED_TOP + CTRL_H])], { size: 0.4 }),
});
cable([[STRIP_BAR.x + STRIP_BAR.w, STRIP_BAR.y + 2, MAN_TOP + 2], [CTRL.x + 6, STRIP_BAR.y + 2, MAN_TOP + 2], [CTRL.x + 6, STRIP_BAR.y + 2, SLED_TOP + CTRL_H]], { name: "ctrl.lead", bend: 4 });
const LED = at([CTRL.x + 6, CTRL.y + 4, SLED_TOP + CTRL_H]);

// nozzles: flange, converging cone, bell, lip with the open exit
const BELL0 = 6;
const BELL_L = 15;
const THROAT_R = 2.2;
const EXIT_R = 5.4;
const bellR = (s) => (s <= BELL0 ? 3.6 - ((s - 2) / (BELL0 - 2)) * (3.6 - THROAT_R) : THROAT_R + (EXIT_R - THROAT_R) * (1 - (1 - (s - BELL0) / BELL_L) ** 2));
const bellSlope = (s) => (s <= BELL0 ? -(3.6 - THROAT_R) / (BELL0 - 2) : (2 * (EXIT_R - THROAT_R) * (1 - (s - BELL0) / BELL_L)) / BELL_L);
const NOZ = [];
for (const [index, x] of NOZ_X.entries()) {
  const F = G.frameOf([x, MAN.y + MAN.d, NOZ_Z], ALONG, [1, 0, 0], [0, 0, 1]);
  NOZ.push(F);
  discAt(F, 0, 2, 5.4, { tone: "mid" }, { name: `noz${index}.flange`, extra: Dots(G.dotsOf(F, 2, 4.3, 4, P, { all: true, phase: Math.PI / 4 }), { size: 0.38, tone: "mid" }) });
  const knots = [[2, 3.6], [BELL0, THROAT_R], ...Array.from({ length: 12 }, (_, i) => { const s = BELL0 + ((i + 1) / 12) * BELL_L; return [s, bellR(s), i < 11 ? 1 : 0]; })];
  const id = nameFor(`noz${index}.bell`);
  put(G.pointOf(F, 12, 0, 0), S(G.solidOf(knots, F, P, { smooth: { slope: bellSlope, radius: bellR, rows: 4 }, rims: "first" }), { tone: "hi" }), { name: id, shapes: [record(A.solid(F, knots, { radius: bellR, name: id }))] });
  const end = BELL0 + BELL_L;
  const lip = nameFor(`noz${index}.lip`);
  put(
    G.pointOf(F, end + 0.6, 0, 0),
    S(G.ringBand(end, end + 1.2, EXIT_R - 0.7, EXIT_R + 0.5, F, P), { tone: "hi" }) + `<path class="rt-void" d="${G.circleOf(F, end + 1.2, EXIT_R - 0.7, P)}"/>` + Ln(G.arcOf(F, end + 1.2, EXIT_R - 0.7, P, { inward: true, least: -1 }), { tone: "lo" }),
    { name: lip, bias: 0.1, shapes: [record(A.ring(F, end, end + 1.2, EXIT_R - 0.7, EXIT_R + 0.5, { name: lip }))] },
  );
}

// ---------- dials (face up) ----------
function dialAt({ x, y, z, r, h }, name, { max, every, label }) {
  const F = G.frameAlong([x, y, 0], UP);
  const top = z + h;
  const ticks = k.radialTicks(x, y, r - 2.6, 40, 5, top, [1.1, 2.4], P, -135 * DEG, 270 * DEG);
  const svg =
    S(k.cylinder(x, y, r, z, h, P, 64, 0.7), { tone: "hi", crease: "lo" }) +
    Ln(k.knurl(x, y, r, top - 2.6, top, 72, P, 0.3), { tone: "lo" }) +
    Ln(k.sideArc(x, y, r, top - 2.6, P, 40), { tone: "faint" }) +
    Ln(k.ring(x, y, r - 1.8, top, P, 64), { tone: "lo" }) +
    Ln(ticks.minor, { tone: "lo" }) +
    Ln(ticks.major, { tone: "mid" }) +
    Ln(k.ring(x, y, 1.3, top, P, 16), { tone: "mid" }) +
    k.faceTextSvg(k.topMatrix([x, y + r * 0.42], top, P, "x"), label, { size: 2.1, tone: "lo", anchor: "middle" });
  put([x, y, z + h / 2], svg, { bias: 0.3, name, shapes: [record(A.disc(F, z, top, r, { name }))] });
  return { x, y, top, r, max, every };
}
const THRUST_DIAL = dialAt(DIAL_T, "cell.dial", { max: 100, label: "kN" });
const TANK_DIAL = dialAt(GAUGE, "gauge.dial", { max: 400, label: "bar" });

// ---------- settle, audit, page ----------
A.settle(R, P);
items.sort((a, b) => a.key - b.key);
const needle = (dial, value, part) => {
  const angle = (-135 + (270 * Math.min(value, dial.max)) / dial.max) * DEG;
  const tip = dial.r - 3.2;
  return `<path data-part="${part}" class="iso-line" data-tone="${part === "thrust" ? "lit" : "hi"}" data-free="start" style="stroke-width:${part === "thrust" ? 1.1 : 0.9}" d="${k.lineOnTop([dial.x - Math.sin(angle) * 2.6, dial.y + Math.cos(angle) * 2.6], [dial.x + Math.sin(angle) * tip, dial.y - Math.cos(angle) * tip], dial.top + 0.2, P)}"/>`;
};
const { rows } = blowdown();
const LABEL_TEXT = "__LABEL__";
const FOG_PTS = [];
const FOG_LEN = 90;
for (let d = 0; d <= FOG_LEN; d += 6) {
  const w = 0.6 * (EXIT_R - 0.7) + 0.2 * d;
  for (let a = 0; a < 16; a++) {
    const ang = (a / 16) * Math.PI * 2;
    for (const x of [NOZ_X[0], NOZ_X[3]]) FOG_PTS.push(at([x + Math.cos(ang) * w, NOZ_EXIT + 1.2 + d, Math.max(2, NOZ_Z - d * 0.04 + Math.sin(ang) * w)]));
  }
}
const FOG = G.hullOf(FOG_PTS);
const [g0, g1] = [at([0, NOZ_EXIT + 1.2, NOZ_Z]), at([0, NOZ_EXIT + 1.2 + FOG_LEN, NOZ_Z - FOG_LEN * 0.04])];
const fogSvg =
  `<defs><linearGradient id="rt-fog-g" gradientUnits="userSpaceOnUse" x1="${g0[0].toFixed(1)}" y1="${g0[1].toFixed(1)}" x2="${g1[0].toFixed(1)}" y2="${g1[1].toFixed(1)}"><stop offset="0" stop-color="var(--rt-fog)" stop-opacity=".9"/><stop offset=".45" stop-color="var(--rt-fog)" stop-opacity=".55"/><stop offset="1" stop-color="var(--rt-fog)" stop-opacity="0"/></linearGradient><filter id="rt-fog-b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4"/></filter></defs>` +
  `<path class="rt-fog" fill="url(#rt-fog-g)" filter="url(#rt-fog-b)" d="M${FOG.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z"/>`;
const body = [...back, ...items.map((item) => item.svg), needle(TANK_DIAL, SUMMARY.bar0, "tank"), needle(THRUST_DIAL, 0, "thrust"), fogSvg, `<circle data-part="led" class="rt-led" cx="${LED[0].toFixed(1)}" cy="${LED[1].toFixed(1)}" r="0.9"/>`];
const svg = k.figureSvg({ width: W, height: H, label: LABEL_TEXT, body, className: "rt-back" });

const DATA = {
  W,
  H,
  P,
  init: INIT,
  camera: glCamera(P),
  rows,
  mass0: MASS0,
  thrust0: THRUST0 / 1000,
  dials: { thrust: THRUST_DIAL, tank: TANK_DIAL },
  nozzles: NOZ_X,
  nozY: NOZ_EXIT + 1.2,
  nozZ: NOZ_Z,
  exitR: EXIT_R - 0.7,
  benchEnd: PLATE.y + PLATE.d,
  benchTop: 0,
  benchHalf: PLATE.w / 2,
};

const bar = Math.round(SUMMARY.bar0 / 10) * 10;
const LANG = {
  th: {
    page: "เครื่องดันก๊าซเย็น Roadster",
    label: `แท่นทดสอบเครื่องดันก๊าซเย็นของชุด SpaceX สำหรับ Tesla Roadster ถังแรงดันพันคาร์บอนไฟเบอร์ 2 ใบวางบนแคร่ที่เลื่อนบนราง 2 เส้น ท่อทางออกของถังต่อเข้า manifold ที่มีวาล์วโซลินอยด์ 4 ตัวและหัวฉีดทรงระฆังขนาดเล็ก 4 หัว แคร่ดันเข้า load cell ไฮดรอลิกที่ติดอยู่กับแท่นกั้น หน้าปัดบน load cell บอกแรงขับ ส่วนหน้าปัดบนท่อทางออกของถังใบหน้าบอกแรงดันในถัง`,
    stage: "แท่นทดสอบเครื่องดัน กดค้างหรือกด Space ค้างเพื่อเปิดวาล์วทั้งสี่ ปล่อยเพื่อปิด กด R เพื่อเติมอากาศ",
    title: "เครื่องดันก๊าซเย็น Roadster · แท่นทดสอบ",
    hint: "กดค้างเพื่อยิง · R เติมอากาศ",
    keys: ["ปุ่ม load cell และเข็มแรงขับ: สิ่งที่แรงจากอากาศดันอยู่", `ถัง COPV 2 ใบ 600 ลิตร อากาศ ${MASS0} กก. ที่แรงดันราว ${bar} bar`, `หัวฉีดด้านหลัง ${NOZZLES} หัว มีวาล์วโซลินอยด์หัวละตัว`],
    caption: `Tesla ระบุว่าชุด SpaceX ของ Roadster เก็บอากาศราว 250 กก. ไว้ในถังพันคาร์บอนไฟเบอร์ 2 ใบ (รวม 600 ลิตร) แล้วปล่อยออกทางหัวฉีด 10 หัว โดย 4 หัวด้านหลังใช้ดันรถไปข้างหน้า ได้แรงขับมากกว่า 80 kN ก๊าซเย็นดันด้วยโมเมนตัมล้วน ๆ อากาศพุ่งออกจากหัวฉีดราว ${Math.round(SUMMARY.ve0)} m/s การได้ 80 kN จึงต้องปล่อยอากาศ ${Math.round(SUMMARY.flow0)} กก. ต่อวินาที ถ้าไม่มีตัวคุมแรงดัน แรงขับจะลดลงตามแรงดันในถังที่ลดลง ครึ่งหนึ่งหายไปภายใน ${SUMMARY.halfAt.toFixed(1)} วินาที และอากาศในถังจะเย็นลงขณะขยายตัว แท่นนี้สมมติการปล่อยแบบตรง ๆ ไม่มีตัวคุมแรงดัน ความเร็วไอพ่น อัตราการไหล และขนาดคอหัวฉีด (หัวละ ${SUMMARY.throatEachMm.toFixed(0)} มม.) เป็นค่าประมาณจากแบบจำลองก๊าซอุดมคติ ไม่ใช่ตัวเลขของ Tesla และเพราะ Tesla ยังไม่เปิดเผยเวลาเติมอากาศ การเติมในรูปนี้จึงเร่งให้เร็วขึ้น`,
    text: { fire: "{bar} bar · {kN} kN · ในถัง {C} °C · {t} วินาที", refill: "กำลังเติม · {bar} bar · อากาศ {kg} กก.", idle: "{bar} bar · อากาศ {kg} กก. · วาล์วปิด" },
    group: "ภาษา",
  },
  en: {
    page: "Roadster thruster",
    label: `A cold-gas thruster test bench for the Tesla Roadster's SpaceX package. Two carbon-wrapped pressure vessels lie on a sled that rides on two rails; their outlets join a valve manifold with four solenoid valves and four small bell nozzles. The sled presses against a hydraulic load cell on the bench's stop, whose dial reads the thrust; a second dial on the near outlet reads tank pressure.`,
    stage: "Thruster bench. Press and hold, or hold the space bar, to open the four valves; release to close them. Press R to refill the tanks.",
    title: "Roadster cold-gas thruster · bench",
    hint: "Hold to fire · R to refill",
    keys: ["Load-cell button and thrust needle: what the air pushes on", `Two COPVs, 600 L, ${MASS0} kg of air at about ${bar} bar`, `${NOZZLES} rear nozzles, one solenoid valve each`],
    caption: `Tesla says the Roadster's SpaceX package stores about 250 kg of air in two carbon-overwrapped tanks (600 L) and blows it through ten nozzles, four at the rear for push, for more than 80 kN. Cold gas is just momentum: the air leaves the nozzles at about ${Math.round(SUMMARY.ve0)} m/s, so 80 kN takes ${Math.round(SUMMARY.flow0)} kg of air a second. Without a regulator the push fades as the tanks empty: half of it is gone in ${SUMMARY.halfAt.toFixed(1)} s, and the air inside cools as it expands. The bench assumes that plain blowdown; exhaust speed, flow and throat size (${SUMMARY.throatEachMm.toFixed(0)} mm per nozzle) are ideal-gas estimates, not Tesla numbers. Refill time hasn't been disclosed, so the bench's refill is sped up.`,
    text: { fire: "{bar} bar · {kN} kN · {C} °C in tank · {t} s", refill: "refilling · {bar} bar · {kg} kg air", idle: "{bar} bar · {kg} kg air · valves shut" },
    group: "Language",
  },
};
const T = LANG[INIT];
DATA.lang = LANG;
const fillText = (template, values) => template.replace(/\{(\w+)\}/g, (_, key) => values[key]);
const stage = `<div class="rt-stage" tabindex="0" role="button" aria-pressed="false" aria-label="${T.stage}">${svg.replace('"__LABEL__"', JSON.stringify(T.label))}<canvas class="rt-plume" aria-hidden="true"></canvas></div>`;
const toggle = `<div class="rt-lang" role="group" aria-label="${T.group}">${["th", "en"].map((id) => `<button type="button" data-lang="${id}" aria-pressed="${id === INIT}" lang="${id}">${id === "th" ? "ไทย" : "EN"}</button>`).join("")}</div>`;
const CSS = readFileSync(join(HERE, "thruster.css"), "utf8");
const page = k.pageHtml({
  title: T.page,
  theme: THEME,
  width: 760,
  body:
    `<style>${CSS}</style>` +
    k
      .plateHtml({
        fig: "Fig 1",
        title: T.title,
        hint: T.hint,
        readout: fillText(T.text.idle, { bar: SUMMARY.bar0.toFixed(0), kg: String(MASS0) }),
        keys: [
          { mark: "lit", label: T.keys[0] },
          { mark: "raised", label: T.keys[1] },
          { mark: "edge", label: T.keys[2] },
        ],
        caption: T.caption,
        body: stage,
      })
      .replace('<figcaption class="iso-legend">', `<figcaption class="iso-legend">${toggle}`)
      .replace('<figure class="iso-figure">', `<figure class="iso-figure" lang="${INIT}">`),
  script: kitScript() + glScript() + readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA)),
});
const name = `roadster-thruster${THEME === "light" ? "-light" : ""}.html`;
writeFileSync(join(HERE, name), page.replace('<html lang="en">', `<html lang="${INIT}">`));
console.log("wrote", name, `${(page.length / 1024).toFixed(0)} KB`, `${items.length} items`);
A.auditOrExit(R, P, { crowd: [] });
