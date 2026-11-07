import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../.skill/kit/iso-kit.mjs";
import { kitScript } from "../../../../.skill/scripts/inline-kit.mjs";
import { paintOrder } from "./order.mjs";
import { SX, LOAD, LIVE, PARK, REST, BLOCK_TOP, cycle, valueAt } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 640;
const HEIGHT = 330;
const AZ = 58;

const PLATE = { x: -165, y: -70, w: 330, d: 142, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;
const RAIL_TO = 92;
const BED = { x: 92, y: -68, w: 46, d: 92, r: 2 };
const POST_Y = 31; // gantry posts at ±POST_Y
const BEAM_Z = 46;
const BEAM_TOP = 56;
const HOUSING_Z = 41;
const ARM = { x: 107, y: -6, w: 10, d: 36, r: 1.5 }; // live-check arm, ends on its post at y = 30
const ARM_Z = 48;
const ARM_TOP = 58;
const VAULT = { x: -99, y: 38, w: 22, d: 18, r: 2 };
const VAULT_H = 24;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [SX[0], -35, BEAM_TOP + 3], [SX[3], 35, BEAM_TOP + 3], [LIVE, 36, ARM_TOP + 2]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: AZ },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const slab = (plan, z, h, steps = 3, bevel = 0) => k.slabOf(plan, z, h, P, steps, bevel);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

// ---------- static floor layer: plate, rails, bed, ruler, label plate ----------
function floor() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -5, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));

  // ruler strip along the front edge: one major tick per 20 units of travel
  const strip = { x: -118, y: PLATE.y + PLATE.d - 15, w: 208, d: 7, r: 1 };
  out.push(S(slab(strip, 0, 0.6), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));

  // label plate, front left
  const label = { x: -156, y: 46, w: 30, d: 16, r: 1.5 };
  out.push(S(slab(label, 0, 0.8, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), { tone: "faint" }));
  [[-152, 51, 16], [-152, 54.5, 22], [-152, 58, 12]].forEach(([x, y, w]) => out.push(L(k.lineOnTop([x, y], [x + w, y], 0.8, P), { tone: "lo", free: true })));
  out.push(D([at([label.x + 2.6, label.y + 2.6, 0.8]), at([label.x + label.w - 2.6, label.y + label.d - 2.6, 0.8])], { size: 0.4 }));

  // main rails with an end stop at the loading end
  out.push(S(slab({ x: -158, y: -17, w: 5, d: 34, r: 1.2 }, 0, 7, 3, 0.5), { tone: "mid" }));
  out.push(D([at([-155.5, -12, 7]), at([-155.5, 12, 7])], { size: 0.45 }));
  for (const y of [-14, 9]) {
    out.push(S(slab({ x: -153, y, w: RAIL_TO + 153, d: 5, r: 1 }, 0, 3, 3, 0.4), { tone: "mid" }));
    out.push(D([-140, -88, -42, 2, 48, 84].map((x) => at([x, y + 2.5, 3])), { size: 0.4 }));
  }

  // transfer bed: a low plate with two cross rails, the live seat on the line and the previous release's bay behind it
  out.push(S(slab(BED, 0, 1, 3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline({ x: 96, y: PARK - 22, w: 38, d: 44, r: 2 }, 1, P), { tone: "faint" }));
  out.push(L(k.planOutline({ x: 96, y: -22, w: 38, d: 44, r: 2 }, 1, P), { tone: "faint" }));
  for (const x of [98, 121]) {
    out.push(S(slab({ x, y: -66, w: 5, d: 88, r: 1 }, 1, 2.6, 3, 0.4), { tone: "mid" }));
    out.push(D([-60, -30, 0, 16].map((y) => at([x + 2.5, y, 3.6])), { size: 0.4 }));
  }
  return out.join("");
}

// ---------- sortable items ----------
// Each item: { id, box: [x0, x1, y0, y1, z0, z1], svg }. Boxes are disjoint, so a separating axis orders any overlapping pair.
const items = [];
const put = (id, box, svg, extra = "") => items.push({ id, box, svg: `<g data-sort="${id}" ${extra}>${svg}</g>` });

function post(id, x, y, top) {
  const out = [];
  out.push(S(slab({ x: x - 6, y: y - 5, w: 12, d: 10, r: 1.5 }, 0, 3, 3, 0.4), { tone: "mid" }));
  out.push(D([at([x - 4, y - 3, 3]), at([x + 4, y + 3, 3]), at([x + 4, y - 3, 3]), at([x - 4, y + 3, 3])], { size: 0.4 }));
  const shaft = { x: x - 3.5, y: y - 3, w: 7, d: 6, r: 1 };
  out.push(S(slab(shaft, 3, top - 3, 3, 0.3), { tone: "mid", inner: L(k.sideSeam(shaft, 14, P, 3) + k.sideSeam(shaft, top - 10, P, 3), { tone: "faint" }) }));
  put(id, [x - 6, x + 6, y - 5, y + 5, 0, top], out.join(""));
}

// rod + pad hanging from a housing at z = hz; drawn at rest (pad bottom at REST), moved down by the live code
function plunger(id, x, y, hz, kind) {
  const out = [];
  const travel = REST - BLOCK_TOP;
  out.push(S(k.cylinder(x, y, 1.6, REST + 1.5, hz - REST - 1.5 + travel, P, 16), { tone: "mid", crease: "none" }));
  if (kind === "scan") {
    const head = { x: x - 6, y: y - 6, w: 12, d: 12, r: 1.5 };
    out.push(S(slab(head, REST + 0.2, 2.2, 3, 0.4), { tone: "hi" }));
    out.push(L(k.planOutline(k.insetPlan(head, 2), REST + 2.4, P, 3), { tone: "faint" }));
  } else if (kind === "probe") {
    out.push(S(k.cylinder(x, y, 3.4, REST + 0.2, 1.3, P, 24), { tone: "hi" }));
    out.push(S(k.cylinder(x, y, 2.2, REST + 1.5, 1, P, 20), { tone: "mid" }));
  } else {
    out.push(S(k.cylinder(x, y, 3.4, REST, 1.5, P, 24), { tone: "hi" }));
  }
  return `<g data-part="${id}">${out.join("")}</g>`;
}

function lamp(id, x, y, z) {
  return S(k.cylinder(x, y, 2.6, z, 1.2, P, 20), { tone: "lo" }) +
    S(k.cylinder(x, y, 1.8, z + 1.2, 1.2, P, 18), { tone: "mid" }) +
    `<g data-part="${id}" style="opacity:0">${D([at([x, y, z + 2.4])], { size: 1.3, tone: "lit" })}</g>`;
}

function gantry(i) {
  const x = SX[i];
  post(`g${i}-back`, x, -POST_Y, BEAM_Z);
  post(`g${i}-front`, x, POST_Y, BEAM_Z);
  const kind = i === 0 ? "probe" : i === 2 ? "scan" : "pad";
  const out = [plunger(`p${i}`, x, 0, HOUSING_Z, kind)];
  const housing = { x: x - 4, y: -4, w: 8, d: 8, r: 1.2 };
  out.push(S(slab(housing, HOUSING_Z, BEAM_Z - HOUSING_Z, 3), { tone: "mid", inner: L(k.sideSeam(housing, HOUSING_Z + 1.6, P, 3), { tone: "faint" }) }));
  out.push(L(k.ring(x, 0, 2.1, HOUSING_Z, P, 16), { tone: "faint" }));
  const beam = { x: x - 5, y: -POST_Y - 4, w: 10, d: POST_Y * 2 + 8, r: 1.5 };
  out.push(S(slab(beam, BEAM_Z, BEAM_TOP - BEAM_Z, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(beam, BEAM_Z + 3, P, 4), { tone: "faint" }) }));
  out.push(D([[x, -POST_Y], [x, POST_Y], [x - 2.4, -8], [x + 2.4, 8]].map(([a, b]) => at([a, b, BEAM_TOP])), { size: 0.45 }));
  out.push(L(k.planOutline({ x: x - 2.5, y: -24, w: 5, d: 10, r: 1 }, BEAM_TOP, P, 3), { tone: "faint" })); // vent slot
  out.push(lamp(`lamp${i}`, x, -POST_Y + 4, BEAM_TOP));
  if (i === 3) out.push(dialFace(x, 17, BEAM_TOP));
  put(`g${i}`, [x - 6, x + 6, -POST_Y - 4, POST_Y + 4, BLOCK_TOP, BEAM_TOP + 4], out.join(""));
}

// staging dial on the beam: its needle follows the probe's stroke
const DIAL_R = 6.5;
function dialFace(x, y, z) {
  const out = [];
  out.push(S(k.cylinder(x, y, DIAL_R, z, 3, P, 48, 0.5), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, y, DIAL_R, z + 1.6, z + 3, 48, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(x, y, DIAL_R, z + 1.6, P, 32), { tone: "faint" }));
  out.push(L(k.ring(x, y, DIAL_R - 1.1, z + 3, P, 40), { tone: "lo" }));
  const t = k.radialTicks(x, y, DIAL_R - 1.4, 20, 5, z + 3, [0.8, 1.6], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(L(k.ring(x, y, 0.8, z + 3, P, 12), { tone: "mid" }));
  out.push(`<path data-part="needle" class="iso-line" data-tone="lit" data-free="start" d="${needleAt(0, x, y, z + 3.2)}" style="stroke-width:0.9"/>`);
  return out.join("");
}
function needleAt(share, x, y, z) {
  const a = share * Math.PI * 1.6 - Math.PI * 0.8;
  return k.lineOnTop([x - Math.sin(a) * 1.4, y + Math.cos(a) * 1.4], [x + Math.sin(a) * (DIAL_R - 2), y - Math.cos(a) * (DIAL_R - 2)], z, P);
}

function vault() {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(VAULT, -2), 0, 0.1, P)}" style="filter:blur(4px)"/>`];
  out.push(S(slab(VAULT, 0, VAULT_H, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(VAULT, 4, P, 4) + k.sideSeam(VAULT, VAULT_H - 4, P, 4), { tone: "faint" }) }));
  // top: vent slots, a knurled wheel, corner screws
  [0, 1, 2].forEach((n) => out.push(L(k.planOutline({ x: VAULT.x + 3.5 + n * 3.6, y: VAULT.y + 3, w: 2, d: 8, r: 1 }, VAULT_H, P, 3), { tone: "faint" })));
  const knob = [VAULT.x + 15, VAULT.y + 11];
  out.push(S(k.cylinder(knob[0], knob[1], 3.6, VAULT_H, 2.4, P, 28), { tone: "mid" }));
  out.push(L(k.knurl(knob[0], knob[1], 3.6, VAULT_H, VAULT_H + 2.4, 26, P), { tone: "lo" }));
  out.push(L(k.lineOnTop(knob, [knob[0] + 2.8, knob[1]], VAULT_H + 2.4, P), { tone: "hi" }));
  out.push(D(k.corners(VAULT, 2.4).map(([x, y]) => at([x, y, VAULT_H])), { size: 0.4 }));
  // drawer on the face toward the backup gantry: it slides out while the dump is written
  const drawer = { x: VAULT.x + VAULT.w - 1, y: VAULT.y + 3, w: 4, d: 12, r: 0.8 };
  const d = [];
  d.push(S(slab(drawer, 7, 9, 3, 0.4), { tone: "hi" }));
  d.push(S(slab({ x: drawer.x + drawer.w, y: drawer.y + 4, w: 1.6, d: 4, r: 0.6 }, 11, 1.6, 2), { tone: "mid", crease: "none" }));
  out.push(`<g data-part="drawer">${d.join("")}</g>`);
  put("vault", [VAULT.x, VAULT.x + VAULT.w + 10.6, VAULT.y, VAULT.y + VAULT.d, 0, VAULT_H + 2.4], out.join(""));
}

function liveCheck() {
  post("lc-post", ARM.x + ARM.w / 2, 33, ARM_TOP);
  const x = ARM.x + ARM.w / 2;
  const out = [plunger("p4", x, 0, ARM_Z - 5, "pad")];
  const housing = { x: x - 4, y: -4, w: 8, d: 8, r: 1.2 };
  out.push(S(slab(housing, ARM_Z - 5, 5, 3), { tone: "mid", inner: L(k.sideSeam(housing, ARM_Z - 3.4, P, 3), { tone: "faint" }) }));
  out.push(S(slab(ARM, ARM_Z, ARM_TOP - ARM_Z, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(ARM, ARM_Z + 3, P, 4), { tone: "faint" }) }));
  out.push(D([[x, -2], [x, 24]].map(([a, b]) => at([a, b, ARM_TOP])), { size: 0.45 }));
  out.push(lamp("lamp4", x, 12, ARM_TOP));
  put("lc-arm", [ARM.x, ARM.x + ARM.w, ARM.y, ARM.y + ARM.d, BLOCK_TOP, ARM_TOP + 3], out.join(""));
}

function buffer() {
  const out = [];
  const block = { x: 139, y: -16, w: 7, d: 32, r: 1.2 };
  out.push(S(slab(block, 0, 11, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(block, 3, P, 3), { tone: "faint" }) }));
  for (const y of [-9, 9]) {
    out.push(S(slab({ x: 136, y: y - 2.6, w: 3, d: 5.2, r: 1 }, 4, 5, 2), { tone: "hi" }));
  }
  out.push(D([at([142.5, -12, 11]), at([142.5, 12, 11])], { size: 0.45 }));
  put("buffer", [136, 146, -16, 16, 0, 11], out.join(""));
}

// a carriage carrying one release block; built at the origin, moved by the live code
function carriage(id) {
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: -16, y: -18, w: 32, d: 36, r: 3 }, 3, 0.1, P)}" style="filter:blur(4px)"/>`];
  const plate = { x: -18, y: -20, w: 36, d: 40, r: 3 };
  out.push(S(slab(plate, 3, 5, 5, 0.6), { tone: "mid" }));
  out.push(L(k.lineOnTop([plate.x, -14.5], [plate.x + plate.w, -14.5], 8, P) + k.lineOnTop([plate.x, 14.5], [plate.x + plate.w, 14.5], 8, P), { tone: "faint" }));
  out.push(D([-12, -4, 4, 12].map((x) => at([x, plate.y + plate.d - 2.4, 8])), { size: 0.4, tone: "lo" }));
  for (const [x, y] of k.corners(plate, 4.5)) out.push(S(slab({ x: x - 2.4, y: y - 2.4, w: 4.8, d: 4.8, r: 1 }, 8, 1.6, 2), { tone: "mid", crease: "none" }));
  const block = { x: -10, y: -10, w: 20, d: 20, r: 1.5 };
  out.push(`<g data-part="block">${S(slab(block, 8, BLOCK_TOP - 8, 4, 0.8), { tone: "hi", crease: "lo", inner: L(k.sideSeam(block, 11, P, 4), { tone: "faint" }) })}</g>`);
  out.push(L(k.planOutline(k.insetPlan(block, 2.6), BLOCK_TOP, P, 4), { tone: "faint" }));
  // the version tag: an inlay that appears once the tag is verified
  out.push(`<g data-part="tag" style="opacity:0">${S(slab({ x: 3.5, y: 3.5, w: 4.6, d: 4.6, r: 0.8 }, BLOCK_TOP, 0.01, 2), { tone: "lo", crease: "none" })}${L(k.ring(5.8, 5.8, 0.9, BLOCK_TOP, P, 10), { tone: "mid" })}</g>`);
  // handle on the front face
  out.push(S(slab({ x: 8.6, y: 19.4, w: 2.8, d: 2.2, r: 0.6 }, 4.4, 2.4, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(10, 22.4, 2, 3.6, 4, P, 18), { tone: "mid" }));
  out.push(L(k.knurl(10, 22.4, 2, 3.6, 7.6, 14, P), { tone: "lo" }));
  put(id, [-18, 18, -20, 24.4, 3, BLOCK_TOP], out.join(""), `data-carriage="${id}"`);
}

SX.forEach((_, i) => gantry(i));
vault();
liveCheck();
buffer();
["c0", "c1", "c2"].forEach(carriage);

// ---------- ordering (shared with the page) ----------
const ORDER_SRC = readFileSync(join(HERE, "order.mjs"), "utf8").replace(/^import .*$/m, "").replace(/^export /gm, "");

// ---------- still frame (also what reduced motion and no-JS show): mid-way through staging ----------
const FIRST = { version: "1.3.0", liveVersion: "1.2.0", ok: true };
const C = cycle(FIRST);
const STILL_T = C.says.find((s) => s.text.includes("staging")).at + 0.5;
const roles = { inc: "c0", live: "c1", park: "c2" };
const pose = (role) => ({
  x: valueAt(C.tracks, `${role}.x`, STILL_T, role === "inc" ? LOAD : LIVE),
  y: valueAt(C.tracks, `${role}.y`, STILL_T, role === "park" ? PARK : 0),
});
const placed = items.map((it) => {
  const role = Object.keys(roles).find((r) => roles[r] === it.id);
  if (!role) return it;
  const { x, y } = pose(role);
  const b = it.box;
  return { ...it, box: [b[0] + x, b[1] + x, b[2] + y, b[3] + y, b[4], b[5]] };
});
const order = paintOrder(placed, P);
const body = order.map((i) => items[i].svg).join("");

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "An inspection line on a bench. A release block on a carriage rides two rails under four gantries: a probe that checks its tag, a press beside a vault whose drawer takes a backup, a flat scanner head, and a staging press with a dial. At the end a transfer bed moves the live block back into a bay and seats the new one, and a cantilever arm checks it; if the check fails the new block rolls off and the old one slides back.",
  body: [`<g data-layer="floor">${floor()}</g>`, `<g data-layer="sorted">${body}</g>`],
});

const MODEL_SRC = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");
const live = `
${MODEL_SRC}
${ORDER_SRC}
const P = ${JSON.stringify(P)};
const ITEMS = ${JSON.stringify(items.map(({ id, box }) => ({ id, box })))};
const DIAL = [${SX[3]}, 17, ${BEAM_TOP + 3.2}], DIAL_R = ${DIAL_R};
const needleAt = ${needleAt.toString().replace("k.lineOnTop", "lineOnTop")};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const layer = svg.querySelector('[data-layer="sorted"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const el = Object.fromEntries(ITEMS.map((it) => [it.id, layer.querySelector('[data-sort="' + it.id + '"]')]));
const part = (root, name) => root.querySelector('[data-part="' + name + '"]');
const plungers = [0, 1, 2, 3, 4].map((i) => part(svg, "p" + i));
const lamps = [0, 1, 2, 3, 4].map((i) => part(svg, "lamp" + i));
const drawer = part(svg, "drawer");
const needle = part(svg, "needle");
const cars = ["c0", "c1", "c2"].map((id) => ({ id, g: el[id], block: part(el[id], "block").firstElementChild, tag: part(el[id], "tag") }));

let roles = { inc: "c0", live: "c1", park: "c2" };
let release = { version: "1.3.0", liveVersion: "1.2.0", ok: true };
let count = 1, forceFail = false;
let C = cycle(release), t = 0;
let frame = 0, last = 0, visible = false, lastOrder = "";
const carOf = (id) => cars.find((c) => c.id === id);

function apply(time) {
  const v = (key, fb) => valueAt(C.tracks, key, time, fb);
  const boxes = {};
  for (const role of ["inc", "live", "park"]) {
    const id = roles[role];
    if (!id) continue;
    const c = carOf(id);
    const x = v(role + ".x", role === "inc" ? LOAD : LIVE);
    const y = v(role + ".y", role === "park" ? PARK : 0);
    const a = v(role + ".a", role === "inc" ? 0 : 1);
    c.g.setAttribute("transform", translateAlong(P, [x, y, 0]));
    c.g.style.opacity = a.toFixed(3);
    c.tag.style.opacity = role === "inc" ? v("inc.tag", 0).toFixed(3) : "1";
    if (role === "inc") c.block.setAttribute("data-lit", ""); else c.block.removeAttribute("data-lit");
    boxes[id] = [x, y];
  }
  for (const c of cars) if (!Object.values(roles).includes(c.id)) c.g.style.opacity = "0";
  plungers.forEach((p, i) => p.setAttribute("transform", translateAlong(P, [0, 0, v("p" + i, REST) - REST])));
  lamps.forEach((l, i) => (l.style.opacity = v("lamp" + i, 0).toFixed(3)));
  drawer.setAttribute("transform", translateAlong(P, [v("drawer", 0), 0, 0]));
  needle.setAttribute("d", needleAt((REST - v("p3", REST)) / (REST - BLOCK_TOP), DIAL[0], DIAL[1], DIAL[2]));
  // depth order: move the carriages' boxes, let the plunger set each gantry's lowest point
  const list = ITEMS.map((it) => {
    const b = it.box.slice();
    if (boxes[it.id]) { const [x, y] = boxes[it.id]; b[0] += x; b[1] += x; b[2] += y; b[3] += y; }
    const m = it.id.match(/^g(\\d)$/);
    if (m) b[4] = v("p" + m[1], REST);
    if (it.id === "lc-arm") b[4] = v("p4", REST);
    return { id: it.id, box: b };
  });
  const order = paintOrder(list, P);
  const key = order.join(",");
  if (key !== lastOrder) { lastOrder = key; for (const i of order) layer.appendChild(el[list[i].id]); }
  const text = sayAt(C.says, time);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", text);
}

function nextCycle() {
  const ok = release.ok;
  const free = ["c0", "c1", "c2"].find((id) => id !== roles.inc && id !== roles.live && (ok || id !== roles.park));
  if (ok) roles = { inc: roles.park && roles.park !== roles.inc ? roles.park : free, live: roles.inc, park: roles.live };
  else roles = { inc: roles.inc, live: roles.live, park: null };
  const liveVersion = ok ? release.version : release.liveVersion;
  count += 1;
  const fail = forceFail || count % 3 === 2;
  forceFail = false;
  release = { version: nextVersion(release.version, !ok), liveVersion, ok: !fail };
  C = cycle(release);
  t = 0;
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  t += dt;
  if (t >= C.length) nextCycle();
  apply(t);
  frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible && !still.matches) { last = 0; frame = requestAnimationFrame(tick); } };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
const ship = (fail) => {
  forceFail = fail;
  if (still.matches) { nextCycle(); apply(C.length - 2.3); return; }
  if (t > C.length - 2.2) nextCycle();
};
stage.addEventListener("click", (event) => ship(event.shiftKey));
stage.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); ship(false); }
  if (event.key === "f" || event.key === "F") { event.preventDefault(); ship(true); }
});
still.addEventListener("change", () => (still.matches ? apply(${STILL_T}) : run()));
t = still.matches ? ${STILL_T} : 0;
apply(t);
`;

const page = k.plateHtml({
  fig: "Fig 1",
  title: "Release line",
  hint: "Click: next release · F: make it fail",
  readout: `v${FIRST.version} · staging on a restored copy`,
  keys: [
    { mark: "lit", label: "The release on its way to live" },
    { mark: "raised", label: "Four gantries: tag and gate, backup, build and scan, staging" },
    { mark: "edge", label: "Transfer bed: live seat and the previous release's bay" },
  ],
  caption:
    "Merging the pull request is the only approval. The release that follows rides the line on its own: its tag and gate run are verified, the live database is dumped, the images are built and scanned, and a staging copy runs on restored data. Only then does the bed swap it in for the live release. If the live check fails, the old release slides straight back and the new one is held, not retried.",
  body: `<div class="iso-stage" tabindex="0" role="button" aria-label="Release line: Enter queues the next release, F queues one that fails its live check">${svg}</div>`,
});

const file = theme === "light" ? "release-line-light.html" : "release-line.html";
writeFileSync(join(HERE, file), k.pageHtml({ title: "Release line", theme, body: page, script: kitScript() + live }));
console.log("wrote", file, "items", items.length);
