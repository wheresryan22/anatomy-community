import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../.skill/kit/iso-kit.mjs";
import * as G from "../../../../.skill/kit/lathe.mjs";
import * as A from "../../../../.skill/kit/audit.mjs";
import { tubePieces, tubeSvg } from "../../../../.skill/kit/tube.mjs";
import { kitScript } from "../../../../.skill/scripts/inline-kit.mjs";
import * as M from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 680;
const HEIGHT = 470;

// ---------- world layout (units ≈ px, wall face at y = 0, z up) ----------
const BASE = { x: -148, y: -16, w: 276, d: 38, r: 6 };
const BASE_H = 9;
const FOOT_H = 5;
const BOARD = { x: -138, y: -6, w: 256, d: 6, r: 1 };
const BOARD_TOP = 178;
const W = 5.8; // field cable centreline, 5.8 off the wall on clips
const CABLE_R = 0.55;

const CAB = { x0: -126, x1: -44, d: 16, z0: 34, z1: 158, t: 2 };
const LANES = { slcB: 90.8, nac: 92.9, slcA: 95 }; // wiring channel under the main board

const DEV = {
  d1: { x: -15, z: 146 },
  d2: { x: 40, z: 146 },
  d3: { x: 95, z: 146 },
  pull: { x: 95, z0: 82, z1: 114 },
  horn: { x0: -9, x1: 13, z0: 86, z1: 114 },
  eol: { x0: 32, x1: 46, z0: 90, z1: 102 },
};
const RETURN_Z = 70;
const MOD = { x0: 42, x1: 56, z0: 62, z1: 78 };
const RISER = { x: 70, y: 14, r: 4.5, top: 174 };

const P = k.fitProjection(
  [...k.boxCorners(BASE, -BASE_H - FOOT_H, 0), ...k.boxCorners(BOARD, 0, BOARD_TOP)],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 64 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const plane = (y) => k.sideMatrix([0, y], 0, P, "left"); // local (x, -z) on the face at y
const faceCircle = (cx, y, cz, r, steps = 40) =>
  k.pathOf(Array.from({ length: steps }, (_, i) => at([cx + r * Math.cos((i / steps) * Math.PI * 2), y, cz + r * Math.sin((i / steps) * Math.PI * 2)])), true);
const faceRect = (x0, x1, z0, z1, y, r = 0.8) => k.pathOf(k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r }, 4).map(([u, z]) => at([u, y, z])), true);
const sideCircle = (x, cy, cz, r, steps = 32) =>
  k.pathOf(Array.from({ length: steps }, (_, i) => at([x, cy + r * Math.cos((i / steps) * Math.PI * 2), cz + r * Math.sin((i / steps) * Math.PI * 2)])), true);
const alongY = (x, y, z) => G.frameOf([x, y, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
const alongX = (x, y, z) => G.frameOf([x, y, z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);

// ---------- recorder: every drawn part records its true shape ----------
const R = A.recorder(P);
let seq = 0;
const back = []; // static ground layer, drawn first
function put(name, svg, shapes, { wrap, ...rest } = {}) {
  return R.put({ name: R.nameFor(name), key: seq++, svg: wrap ? wrap(svg) : svg, shapes, ...rest });
}
function boxItem(name, [x0, x1, y0, y1, z0, z1], r = 0.8, style = {}, { extra = "", inner = "", wrap, owner, bevel } = {}) {
  const plan = { x: x0, y: y0, w: x1 - x0, d: y1 - y0, r };
  const shape = R.solid(A.slab(plan, z0, z1 - z0, { name, owner }, 3));
  const paths = k.slabOf(plan, z0, z1 - z0, P, 3, bevel ?? Math.min(0.6, r));
  put(name, S(paths, { tone: "mid", ...style, inner }) + extra, [shape], { wrap });
  return shape;
}
function cylItem(name, cx, cy, r, z, h, style = {}, { extra = "", inner = "", wrap, steps = 28, bevel = 0, className } = {}) {
  const shape = R.solid(A.cylinder(cx, cy, r, z, h, { name }));
  put(name, S(k.cylinder(cx, cy, r, z, h, P, steps, bevel), { tone: "mid", ...style, inner, className }) + extra, [shape], { wrap });
  return shape;
}
function turnedItem(name, F, profile, style = {}, { extra = "", inner = "", wrap } = {}) {
  const shape = R.solid(A.solid(F, profile, { name }));
  put(name, S(G.solidOf(profile, F, P), { tone: "mid", ...style, inner }) + extra, [shape], { wrap });
  return shape;
}
const discItem = (name, F, s0, s1, r, style, options) => turnedItem(name, F, [[s0, r], [s1, r]], style, options);

const CABLES = [];
function cable(name, points, { r = CABLE_R, tone = "hi", wire, bend = 2 } = {}) {
  const route = G.fillet(points, Math.max(bend, r * 2.6), 8, { P, tube: r });
  R.route(name, route, r, { limp: true, touch: ["clip*"] });
  CABLES.push(name);
  const wrap = (svg) => `<g data-wire="${wire}">${svg}</g>`;
  tubePieces(route, r, P, { maxLength: 14, spacing: 0.8 }).forEach((piece, index) =>
    put(`${name}:${index}`, tubeSvg(piece, { tone }), [A.tube(piece.points, piece.radii)], { wrap, route: name, chunk: index }),
  );
}

// ---------- ground: plinth and backboard ----------
function base() {
  back.push(`<path class="iso-halo" d="${k.haloOf(BASE, -BASE_H - FOOT_H, BASE_H, P)}"/>`);
  for (const [x, y] of byDepth(k.corners(BASE, 16))) {
    back.push(S(k.cylinder(x, y, 6.4, -BASE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    back.push(S(k.cylinder(x, y, 5, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  back.push(S(k.slabOf(BASE, -BASE_H, BASE_H, P, 8, 1.4), { tone: "mid" }));
  R.solid(A.slab(BASE, -BASE_H, BASE_H, { name: "stand.base", ground: true }, 8));
  back.push(L(k.planOutline(k.insetPlan(BASE, 4), 0, P), { tone: "lo" }));
  const screws = k.corners(BASE, 8);
  back.push(L(screws.map(([x, y]) => k.ring(x, y, 2, 0, P, 16)).join(""), { tone: "lo" }));
  back.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  const label = { x: 2, y: 8, w: 46, d: 10, r: 1.2 };
  back.push(S(k.slabOf(label, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  R.solid(A.slab(label, 0, 0.8, { name: "stand.label", ground: true }, 3));
  back.push(L(k.planOutline(k.insetPlan(label, 1.4), 0.8, P, 3), { tone: "faint" }));
  back.push(L([34, 26, 18].map((w, i) => k.lineOnTop([label.x + 4, label.y + 3 + i * 2.2], [label.x + 4 + w, label.y + 3 + i * 2.2], 0.8, P)).join(""), { tone: "lo", free: true }));
  back.push(D([at([label.x + label.w - 3, label.y + 2.6, 0.8]), at([label.x + label.w - 3, label.y + label.d - 2.6, 0.8])], { size: 0.4 }));
  for (const x of [-118, 98]) {
    const plan = { x: x - 8, y: -14, w: 16, d: 8, r: 1 };
    back.push(S(k.slabOf(plan, 0, 10, P, 3, 0.6), { tone: "mid" }));
    R.solid(A.slab(plan, 0, 10, { name: "stand.cleat", ground: true }, 3));
  }
  back.push(S(k.slabOf(BOARD, 0, BOARD_TOP, P, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(BOARD, 10, P, 3), { tone: "faint" }) }));
  R.solid(A.slab(BOARD, 0, BOARD_TOP, { name: "stand.board", ground: true }, 3));
  const boardScrews = [[-132, 6], [-132, 172], [112, 6], [112, 172], [0, 172], [0, 6]];
  back.push(L(boardScrews.map(([x, z]) => faceCircle(x, 0, z, 1.8, 18)).join(""), { tone: "lo" }));
  back.push(D(boardScrews.map(([x, z]) => at([x, 0, z])), { size: 0.45 }));
}

// ---------- the panel cabinet ----------
const { x0: CX0, x1: CX1, d: CD, z0: CZ0, z1: CZ1, t: CT } = CAB;

function communicator() {
  boxItem("comm.box", [-66, -24, 0, 9, 8, 28], 1.2, {}, {
    inner: L(k.sideSeam({ x: -66, y: 0, w: 42, d: 9, r: 1.2 }, 24, P, 3), { tone: "faint" }),
    extra:
      L(faceRect(-62, -44, 11, 20, 9, 0.8), { tone: "faint" }) +
      L([12, 9, 11].map((w, i) => k.segment([-60, 9, 18 - i * 2.4], [-60 + w, 9, 18 - i * 2.4], P)).join(""), { tone: "lo", free: true }) +
      D([at([-63, 9, 25.5]), at([-27, 9, 25.5]), at([-63, 9, 10.5]), at([-27, 9, 10.5])], { size: 0.4, tone: "lo" }) +
      `<path class="fa-led" data-led="comm" d="${faceCircle(-34, 9, 15, 1.15, 20)}"/>`,
  });
  cylItem("comm.nipple", -54, 5, 2.4, 28, CZ0 - 28, {}, { steps: 20 });
  cylItem("comm.antenna.base", -30, 5, 2, 28, 2, { tone: "lo" }, { steps: 18 });
  cylItem("comm.antenna", -30, 5, 1.1, 30, 20, {}, { steps: 16, inner: L(k.sideArc(-30, 5, 1.1, 40, P, 10), { tone: "faint" }) });
  cylItem("comm.antenna.tip", -30, 5, 1.5, 50, 2, {}, { steps: 16 });
}

function cabinetBack() {
  communicator();
  const screws = [[CX0 + 6, CZ1 - 8], [CX1 - 6, CZ1 - 8], [CX0 + 6, CZ0 + 26], [CX1 - 6, CZ0 + 26]];
  boxItem("cab.back", [CX0, CX1, 0, 1.5, CZ0, CZ1], 0.4, { tone: "lo" }, {
    extra: L(screws.map(([x, z]) => faceCircle(x, 1.5, z, 1.6, 16)).join(""), { tone: "faint" }) + D(screws.map(([x, z]) => at([x, 1.5, z])), { size: 0.45, tone: "lo" }),
  });
  boxItem("cab.bottom", [CX0, CX1, 1.5, CD, CZ0, CZ0 + CT], 0.6);
  boxItem("cab.left", [CX0, CX0 + CT, 1.5, CD, CZ0 + CT, CZ1 - CT], 0.4);
}

const POST_Y = 6;
const POST_TOP = CZ0 + CT + 22;
function batteries() {
  [-122, -89].forEach((x, index) => {
    const z0 = CZ0 + CT;
    boxItem(`batt${index}.case`, [x, x + 30, 1.5, 15.5, z0, z0 + 18], 1, {}, {
      inner: L(k.sideSeam({ x, y: 1.5, w: 30, d: 14, r: 1 }, z0 + 15, P, 3), { tone: "faint" }),
      extra: L(faceRect(x + 4, x + 22, z0 + 4, z0 + 11, 15.5, 0.6), { tone: "faint" }) + L([14, 10, 12].map((w, i) => k.segment([x + 6, 15.5, z0 + 9 - i * 2], [x + 6 + w, 15.5, z0 + 9 - i * 2], P)).join(""), { tone: "lo", free: true }),
    });
    boxItem(`batt${index}.lid`, [x + 0.6, x + 29.4, 2.1, 14.9, z0 + 18, z0 + 19.4], 0.8, { tone: "lo" });
    for (const tx of [x + 6, x + 24]) {
      cylItem(`batt${index}.post.base`, tx, POST_Y, 1.6, z0 + 19.4, 1.2, { tone: "lo" }, { steps: 16 });
      cylItem(`batt${index}.post`, tx, POST_Y, 1.1, z0 + 20.6, 1.4, { tone: "hi" }, { steps: 16 });
    }
  });
}

function powerSupply() {
  boxItem("xfmr.core", [-122, -102, 1.5, 11, 66, 84], 0.4, {}, {
    inner: L([69, 72, 75, 78, 81].map((z) => k.sideSeam({ x: -122, y: 1.5, w: 20, d: 9.5, r: 0.4 }, z, P, 3)).join(""), { tone: "faint" }),
    extra: D([at([-120, 11, 84]), at([-104, 11, 84])], { size: 0.45 }),
  });
  boxItem("xfmr.coil", [-118, -106, 11, 13, 69, 81], 1.2, { tone: "hi" });
  boxItem("psu.board", [-98, -54, 1.5, 2.9, 64, 90], 0.4, { tone: "lo" }, { extra: D([[-95, 87], [-57, 87], [-95, 75], [-57, 75]].map(([x, z]) => at([x, 2.9, z])), { size: 0.5, tone: "mid" }) });
  boxItem("psu.ac", [-94, -82, 2.9, 8, 66, 70.5], 0.5, {}, { extra: D([-91, -88, -85].map((x) => at([x, 5.5, 70.5])), { size: 0.5, tone: "hi" }) });
  boxItem("psu.fuse", [-80, -72, 2.9, 5.6, 66.4, 69.6], 1.2, { tone: "hi" });
  boxItem("psu.batt", [-66, -55, 2.9, 8, 64.6, 69], 0.5, {}, { extra: D([-63, -57.5].map((x) => at([x, 5.5, 69])), { size: 0.5, tone: "hi" }) });
  for (const [cx, cz] of [[-88, 80], [-80, 80]]) {
    const F = alongY(cx, 2.9, cz);
    turnedItem("psu.cap", F, [[0, 3], [6.4, 3], [7, 2.4]], { tone: "hi" }, { inner: L(G.arcOf(F, 5.6, 3, P), { tone: "faint" }) });
  }
  boxItem("psu.sink", [-72, -58, 2.9, 8.9, 74, 88], 0.3, {}, { inner: L([-69, -66, -63, -60].map((x) => k.segment([x, 8.9, 74], [x, 8.9, 88], P)).join(""), { tone: "lo" }) });
}

const KEYS = [
  { act: "ack", x: -116, label: "Acknowledge" },
  { act: "silence", x: -104, label: "Alarm silence" },
  { act: "reset", x: -92, label: "System reset" },
  { act: "drill", x: -80, label: "Drill" },
];
const LEDS = [
  { id: "ac", z: 141 },
  { id: "fire", z: 137 },
  { id: "supv", z: 133 },
  { id: "trbl", z: 129 },
  { id: "sil", z: 125 },
];
const LCD = { x0: -114, x1: -72, z0: 129, z1: 141, y: 5.3 };
const LED_X = -66;
const TBS = [
  { id: "slcB", x0: -116, x1: -104 },
  { id: "nac", x0: -100, x1: -88 },
  { id: "slcA", x0: -84, x1: -72 },
  { id: "aux", x0: -68, x1: -56 },
];

function mainBoard() {
  boxItem("cpu.board", [-120, -52, 1.5, 3.1, 96, 146], 0.4, { tone: "lo" }, { extra: D([[-117, 143], [-55, 143], [-117, 106], [-55, 106]].map(([x, z]) => at([x, 3.1, z])), { size: 0.55, tone: "mid" }) });
  const lcd =
    `<path class="fa-lcd" data-part="lcd" d="${faceRect(LCD.x0, LCD.x1, LCD.z0, LCD.z1, LCD.y, 0.6)}"/>` +
    L(faceRect(LCD.x0, LCD.x1, LCD.z0, LCD.z1, LCD.y, 0.6), { tone: "lo" }) +
    `<g transform="${plane(LCD.y)}"><clipPath id="fa-lcd-clip"><rect x="${LCD.x0}" y="${-LCD.z1}" width="${LCD.x1 - LCD.x0}" height="${LCD.z1 - LCD.z0}"/></clipPath>` +
    `<g clip-path="url(#fa-lcd-clip)"><text class="fa-lcd-text" data-part="lcd1" x="${LCD.x0 + 1.4}" y="${-136.2}" font-size="3.3">SYSTEM NORMAL</text>` +
    `<text class="fa-lcd-text" data-part="lcd2" x="${LCD.x0 + 1.4}" y="${-131.1}" font-size="3.3">POLLING</text></g></g>`;
  boxItem("cpu.lcd", [-116, -70, 3.1, 5.3, 127, 143], 0.6, {}, { extra: lcd });
  for (const led of LEDS) {
    discItem(`cpu.led.${led.id}`, alongY(LED_X, 3.1, led.z), 0, 1, 1.7, {}, { extra: `<path class="fa-led" data-led="${led.id}" d="${faceCircle(LED_X, 4.1, led.z, 1.15, 20)}"/>` });
  }
  for (const key of KEYS) {
    boxItem(`cpu.key.${key.act}`, [key.x, key.x + 10, 3.1, 4.9, 114, 121], 1, { tone: "hi" }, { wrap: (svg) => `<g class="fa-key" data-act="${key.act}" role="button" aria-label="${key.label}">${svg}</g>` });
  }
  boxItem("cpu.chip", [-61, -53, 3.1, 4.3, 126, 134], 0.3, {}, { inner: L(faceCircle(-59.6, 4.3, 132.6, 0.6, 10), { tone: "lo" }) });
  boxItem("cpu.mem", [-61, -53, 3.1, 4.1, 113, 121], 0.3, {}, { extra: D(Array.from({ length: 6 }, (_, i) => at([-60 + i * 1.4, 3.1, 123.6])), { size: 0.3, tone: "lo" }) });
  for (const tb of TBS) {
    const screws = [tb.x0 + 2.2, tb.x0 + 6, tb.x0 + 9.8];
    boxItem(`cpu.tb.${tb.id}`, [tb.x0, tb.x1, 3.1, 9, 98, 103.5], 0.5, {}, {
      extra: L(screws.map((x) => k.ring(x, 6, 1.1, 103.5, P, 12)).join(""), { tone: "lo" }) + D(screws.map((x) => at([x, 6, 103.5])), { size: 0.4, tone: "hi" }),
    });
  }
}

function innerCables() {
  for (const tb of TBS.slice(0, 3)) {
    const x = tb.x0 + 6;
    const z = LANES[tb.id];
    cable(`in.${tb.id}`, [[x, W, 98], [x, W, z], [CX1 - CT, W, z]], { wire: tb.id === "nac" ? "nac" : "slc" });
  }
  // battery jumper (series, 24 V) and the two leads to the power board
  cable("batt.jumper", [[-98, POST_Y, POST_TOP], [-98, POST_Y, POST_TOP + 3], [-83, POST_Y, POST_TOP + 3], [-83, POST_Y, POST_TOP]], { r: 0.6, tone: "mid", wire: "power" });
  cable("batt.lead.neg", [[-116, POST_Y, POST_TOP], [-116, POST_Y, 63], [-63, POST_Y, 63], [-63, POST_Y, 64.6]], { r: 0.6, tone: "mid", wire: "power", bend: 1.2 });
  cable("batt.lead.pos", [[-65, POST_Y, POST_TOP], [-65, POST_Y, 60], [-57.5, POST_Y, 60], [-57.5, POST_Y, 64.6]], { r: 0.6, tone: "mid", wire: "power", bend: 1.2 });
}

function cabinetFront() {
  const holes = [LANES.slcB, LANES.nac, LANES.slcA];
  boxItem("cab.right", [CX1 - CT, CX1, 1.5, CD, CZ0 + CT, CZ1 - CT], 0.4, {}, {
    extra: L(holes.map((z) => sideCircle(CX1, W, z, 1.4, 24)).join(""), { tone: "lo" }) + L([60, 124].map((z) => sideCircle(CX1, 8, z, 2.6, 28)).join(""), { tone: "faint" }),
  });
  boxItem("cab.top", [CX0, CX1, 1.5, CD, CZ1 - CT, CZ1], 0.6, {}, { extra: L([-98, -70].map((x) => k.ring(x, 8, 2.6, CZ1, P, 24)).join(""), { tone: "faint" }) });
  for (const z of [56, 128]) cylItem("cab.hinge", CX0 - 0.6, CD + 0.4, 1.1, z, 12, {}, { steps: 14 });
  cylItem("ac.conduit.nut", -114, 8, 2.6, CZ1, 1.2, {}, { steps: 24 });
  cylItem("ac.conduit", -114, 8, 2.1, CZ1 + 1.2, 164 - CZ1 - 1.2, { crease: "none" }, { steps: 24 });
  boxItem("ac.box", [-123, -105, 0, 10, 164, 176], 0.8, {}, { extra: L(faceRect(-121.5, -106.5, 165.5, 174.5, 10, 0.6), { tone: "faint" }) + D([at([-120, 10, 172.5]), at([-108, 10, 167.5])], { size: 0.45 }) });
}

// ---------- field devices ----------
const device = (act, label) => (svg) => `<g class="fa-device" data-act="${act}" role="button" aria-label="${label}">${svg}</g>`;

const HEAD = (s, r) => {
  const pts = [[0, r + 1.6], [1.6, r + 1.6], [1.6, r], [5, r]];
  for (let i = 1; i <= 10; i++) {
    const t = i / 10;
    pts.push([5 + s * Math.sin((t * Math.PI) / 2), r * Math.cos((t * Math.PI) / 2), 1]);
  }
  return pts;
};

function detector(id, { x, z }, heat = false) {
  const wrap = device(id, heat ? "Heat detector 003" : `Smoke detector ${id === "d1" ? "001" : "002"}`);
  const r = heat ? 7.8 : 8.6;
  discItem(`${id}.box`, alongY(x, 0, z), 0, 5, 11, { tone: "lo" }, { wrap });
  const F = alongY(x, 5, z);
  discItem(`${id}.base`, F, 0, 1.6, r + 1.8, {}, { wrap });
  const head = HEAD(heat ? 2.6 : 3.6, r).map(([s, rr, sm]) => (sm ? [s + 1.6, rr, 1] : [s + 1.6, rr]));
  const vents = G.ribsOf(F, 3.6, 6.2, r, 30, P, { fade: [0.1, 0.55], seams: true });
  const ledAt = at(G.pointOf(F, heat ? 7.4 : 8.2, heat ? 4.4 : 5.4, -Math.PI / 4));
  const led = `<circle class="fa-led" data-led="${id}" cx="${ledAt[0].toFixed(1)}" cy="${ledAt[1].toFixed(1)}" r="1.05"/>`;
  turnedItem(`${id}.head`, F, head, { tone: "hi" }, { inner: k.fadedSvg(vents, { tone: "lo" }), extra: heat ? "" : led, wrap });
  if (heat) discItem(`${id}.sensor`, alongY(x, 5 + 6.6 + 2.2, z), 0, 1.8, 2.2, {}, { wrap, extra: led });
}

function pullStation() {
  const { x, z0, z1 } = DEV.pull;
  const wrap = device("pull", "Pull station 004");
  boxItem("pull.box", [x - 9, x + 9, 0, 4, z0, z1], 1, { tone: "lo" }, { wrap });
  boxItem("pull.body", [x - 8, x + 8, 4, 9, z0 + 1, z1 - 1], 1.6, { tone: "hi" }, {
    wrap,
    extra: L(faceRect(x - 6, x + 6, z0 + 4, z1 - 8, 9, 1), { tone: "faint" }) + D([at([x - 6, 9, z1 - 4]), at([x + 6, 9, z1 - 4])], { size: 0.4, tone: "lo" }) + L(faceCircle(x, 9, z0 + 6, 1.4, 16), { tone: "lo" }),
  });
  boxItem("pull.handle", [x - 5, x + 5, 9, 12, 100, 104], 1, { tone: "hi" }, { wrap: (svg) => wrap(`<g data-part="handle">${svg}</g>`) });
}

function hornStrobe() {
  const { x0, x1, z0, z1 } = DEV.horn;
  boxItem("horn.box", [x0, x1, 0, 4, z0, z1], 1, { tone: "lo" });
  const slots = [0, 1, 2, 3].map((i) => faceRect(x0 + 4, x1 - 4, z0 + 3 + i * 2.6, z0 + 4.2 + i * 2.6, 10, 0.6)).join("");
  boxItem("horn.body", [x0 + 1, x1 - 1, 4, 10, z0 + 1, z1 - 1], 0.8, { tone: "hi" }, {
    extra: `<path class="iso-line fa-horn" data-tone="lo" data-part="horn" d="${slots}"/>` + k.faceTextSvg(`${plane(10)} translate(${(x0 + x1) / 2} ${-(z0 + 13.2)})`, "FIRE", { size: 3.2, tone: "hi", anchor: "middle" }),
  });
  boxItem("horn.lens", [x0 + 4, x1 - 4, 10, 13, z1 - 9, z1 - 3], 1.4, { tone: "hi" }, { wrap: (svg) => `<g data-part="strobe">${svg}</g>` });
}

function eol() {
  const { x0, x1, z0, z1 } = DEV.eol;
  const zc = (z0 + z1) / 2;
  boxItem("eol.box", [x0, x1, 0, 8, z0, z1], 1, {}, {
    extra: D([at([x0 + 3, 8, zc]), at([x1 - 3, 8, zc])], { size: 0.6, tone: "hi" }) + L(k.segment([x0 + 3, 8, zc], [x0 + 4.5, 8.6, zc], P) + k.segment([x1 - 4.5, 8.6, zc], [x1 - 3, 8, zc], P), { tone: "mid" }),
  });
  const F = alongX(x0 + 4.5, 8.6, zc);
  const len = x1 - x0 - 9;
  const bands = [1.2, 2.2, 3.2].map((s) => G.arcOf(F, s, 0.9, P)).join("");
  turnedItem("eol.resistor", F, [[0, 0.6], [0.5, 0.9], [len - 0.5, 0.9], [len, 0.6]], { tone: "hi" }, { inner: L(bands, { tone: "lo" }) });
}

function monitorModule() {
  const { x0, x1, z0, z1 } = MOD;
  const wrap = device("flow", "Monitor module 005, waterflow");
  boxItem("mod.box", [x0, x1, 0, 4, z0, z1], 0.8, { tone: "lo" }, { wrap });
  boxItem("mod.body", [x0 + 1, x1 - 1, 4, 8, z0 + 1, z1 - 1], 1.2, { tone: "hi" }, {
    wrap,
    extra: L(faceRect(x0 + 3, x1 - 3, z0 + 3, z1 - 7, 8, 0.6), { tone: "faint" }) + D([at([x0 + 2.6, 8, z1 - 2.6]), at([x1 - 2.6, 8, z0 + 2.6])], { size: 0.4, tone: "lo" }) + `<path class="fa-led" data-led="flow" d="${faceCircle((x0 + x1) / 2, 8, z1 - 4, 1.1, 18)}"/>`,
  });
}

const SWITCH_Y = RISER.y + RISER.r - 0.3;
function riser() {
  const { x, y, r, top } = RISER;
  const wrap = device("flow", "Waterflow switch on the sprinkler riser");
  boxItem("riser.strap", [x - 1.2, x + 1.2, 0, y - r - 0.9 + 0.1, 138.6, 141.4], 0.3, {}, { wrap });
  cylItem("riser.flange", x, y, r + 3, 0, 1.6, { tone: "lo" }, {
    wrap,
    steps: 32,
    extra: D(Array.from({ length: 4 }, (_, i) => at([x + (r + 1.8) * Math.cos(Math.PI / 4 + (i * Math.PI) / 2), y + (r + 1.8) * Math.sin(Math.PI / 4 + (i * Math.PI) / 2), 1.6])), { size: 0.4, tone: "mid" }),
  });
  let z = 1.6;
  for (const j of [18, 64, 120, 138]) {
    cylItem("riser.pipe", x, y, r, z, j - z, { tone: "hi", crease: "none" }, { wrap, steps: 36, className: "fa-pipe" });
    cylItem("riser.coupling", x, y, r + 0.9, j, j === 138 ? 4 : 2.6, {}, { wrap, steps: 36 });
    z = j + (j === 138 ? 4 : 2.6);
  }
  cylItem("riser.pipe", x, y, r, z, top - z, { tone: "hi", crease: "none" }, { wrap, steps: 36, className: "fa-pipe" });
  cylItem("riser.cap", x, y, r + 0.4, top, 2.4, {}, { wrap, steps: 36, bevel: 0.4 });
  boxItem("riser.switch", [x - 5, x + 5, SWITCH_Y, SWITCH_Y + 6, 33, 44], 1, {}, {
    wrap,
    extra: L(faceRect(x - 3.6, x + 3.6, 34.6, 42.4, SWITCH_Y + 6, 0.6), { tone: "faint" }) + D([at([x - 3.6, SWITCH_Y + 6, 42.4]), at([x + 3.6, SWITCH_Y + 6, 34.6])], { size: 0.4, tone: "lo" }),
  });
}

// clips that hold the field cables off the wall
const CLIPS = [
  [-38, 130], [-27, 166], [12, 146], [62, 146], [95, 128], [84, RETURN_Z], [10, RETURN_Z], [-40, 80], [-26, LANES.nac], [24, 96],
];
function clips() {
  for (const [x, , z] of byDepth(CLIPS.map(([x, z]) => [x, 0, z]))) {
    boxItem("clip", [x - 0.9, x + 0.9, 0, W - CABLE_R - 0.05, z - 1.2, z + 1.2], 0.3);
  }
}

function fieldCables() {
  const SW = SWITCH_Y + 3;
  cable("slc.out", [[CX1, W, LANES.slcA], [-38, W, LANES.slcA], [-38, W, 166], [DEV.d1.x, W, 166], [DEV.d1.x, W, DEV.d1.z + 10.4]], { wire: "slc" });
  cable("slc.12", [[DEV.d1.x + 10.4, W, DEV.d1.z], [DEV.d2.x - 10.4, W, DEV.d2.z]], { wire: "slc" });
  cable("slc.23", [[DEV.d2.x + 10.4, W, DEV.d3.z], [DEV.d3.x - 9.6, W, DEV.d3.z]], { wire: "slc" });
  cable("slc.34", [[DEV.d3.x, W, DEV.d3.z - 9.6], [DEV.pull.x, W, DEV.pull.z1 - 1]], { wire: "slc" });
  cable("slc.45", [[DEV.pull.x, W, DEV.pull.z0 + 1], [DEV.pull.x, W, RETURN_Z], [MOD.x1 - 1, W, RETURN_Z]], { wire: "slc" });
  cable("slc.back", [[MOD.x0 + 1, W, RETURN_Z], [-40, W, RETURN_Z], [-40, W, LANES.slcB], [CX1, W, LANES.slcB]], { wire: "slc" });
  cable("nac.1", [[CX1, W, LANES.nac], [DEV.horn.x0 + 1, W, LANES.nac]], { wire: "nac" });
  cable("nac.2", [[DEV.horn.x1 - 1, W, 96], [DEV.eol.x0, W, 96]], { wire: "nac" });
  cable("flow", [[(MOD.x0 + MOD.x1) / 2, W, MOD.z0 + 1], [(MOD.x0 + MOD.x1) / 2, W, 38.5], [58, SW, 38.5], [RISER.x - 5, SW, 38.5]], { wire: "slc", tone: "mid" });
}

// ---------- assemble ----------
base();
cabinetBack();
batteries();
powerSupply();
mainBoard();
innerCables();
cabinetFront();
clips();
detector("d1", DEV.d1);
detector("d2", DEV.d2);
detector("d3", DEV.d3, true);
pullStation();
hornStrobe();
eol();
monitorModule();
fieldCables();
riser();

A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);

// overlays that carry no shape: smoke puffs and the strobe's flash, drawn on top
const smoke = `<g data-part="smoke" transform="${plane(16)}" style="opacity:0">${Array.from({ length: 7 }, (_, i) => `<circle class="fa-puff" data-puff="${i}" cx="0" cy="0" r="${3 + (i % 3)}"/>`).join("")}</g>`;
const flash = `<path class="fa-flash" data-part="flash" d="${faceRect(DEV.horn.x0 - 6, DEV.horn.x1 + 6, DEV.horn.z1 - 18, DEV.horn.z1 + 6, 13.1, 10)}"/>`;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A commercial addressable fire alarm system on a plywood backboard. The panel cabinet, door off, holds two 12 volt batteries, a transformer and power board, and the main board with its display, indicator lights, keys and field terminals. A two-wire signalling line circuit leaves the panel, loops through two smoke detectors, a heat detector, a pull station and a waterflow monitor module, and returns to the panel. A separate notification circuit feeds a horn strobe and ends on an end-of-line resistor. A communicator under the cabinet reports alarms off site.",
  body: [...back, ...R.items.map((item) => item.svg), smoke, flash],
});

const css = `<style>
.iso{--fa-amber:#e8a33a;--fa-lcd:#1c2a1f;--fa-lcd-ink:#9fe0a8}
.iso[data-theme="light"]{--fa-amber:#c27a12;--fa-lcd:#cfe3c8;--fa-lcd-ink:#1d3a22}
.fa-lcd{fill:var(--fa-lcd)}
.fa-lcd-text{fill:var(--fa-lcd-ink);font-family:var(--anatomy-mono);letter-spacing:.01em}
.fa-led{fill:var(--anatomy-shade-0);stroke:var(--anatomy-lo);stroke-width:.4px;vector-effect:non-scaling-stroke}
.fa-led[data-on="red"]{fill:var(--anatomy-red);stroke:var(--anatomy-red)}
.fa-led[data-on="green"]{fill:var(--anatomy-green);stroke:var(--anatomy-green)}
.fa-led[data-on="amber"]{fill:var(--fa-amber);stroke:var(--fa-amber)}
.fa-key,.fa-device{cursor:pointer}
.fa-key[data-down] .iso-edge{stroke:var(--anatomy-lit)}
.fa-device:hover .iso-edge{stroke:var(--anatomy-lit)}
[data-wire][data-poll] .tb-edge{stroke:var(--anatomy-lit)}
[data-wire="nac"][data-on] .tb-edge{stroke:var(--anatomy-lit);stroke-dasharray:2 3;animation:iso-flow 900ms linear infinite}
.fa-horn[data-on]{stroke:var(--anatomy-lit)}
.fa-flash{fill:var(--anatomy-lit);opacity:0;filter:blur(5px);pointer-events:none}
.iso[data-theme="light"] .fa-flash{fill:#fff6c8;mix-blend-mode:multiply}
.fa-puff{fill:var(--anatomy-mid);filter:blur(2.4px);pointer-events:none}
.iso-stage{touch-action:pan-y}
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
@media (prefers-reduced-motion:reduce){[data-wire] .tb-edge{animation:none!important}}
</style>`;

const smokeAt = [DEV.d2.x, DEV.d2.z];
const live = `
${M.SOURCE}
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const $ = (s) => svg.querySelector(s);
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const leds = {}; svg.querySelectorAll("[data-led]").forEach((el) => (leds[el.dataset.led] = el));
const lcd1 = $('[data-part="lcd1"]'), lcd2 = $('[data-part="lcd2"]');
const slcWires = [...svg.querySelectorAll('[data-wire="slc"]')], nacWires = [...svg.querySelectorAll('[data-wire="nac"]')];
const horn = $('[data-part="horn"]');
const strobe = $('[data-part="strobe"] .iso-solid'), flash = $('[data-part="flash"]');
const handle = $('[data-part="handle"]'), smokeG = $('[data-part="smoke"]');
const puffs = [...svg.querySelectorAll("[data-puff]")];
const pipes = [...svg.querySelectorAll(".fa-pipe")];
const DOWN = ${JSON.stringify(k.axisVector(P, [0, 0, -1]))};
const SMOKE_AT = ${JSON.stringify(smokeAt)};
const panel = createPanel();
let frame = 0, last = 0, visible = false, touring = !still.matches, idle = 0, step = 0, stepAt = 0, handleAt = 0, t = 0;
const TOUR = [
  { wait: 6, act: () => panel.smoke(true) },
  { until: () => panel.state.alarm, wait: 4, act: () => panel.ack() },
  { wait: 3, act: () => panel.silence() },
  { wait: 3, act: () => panel.smoke(false) },
  { until: () => panel.state.obscuration < 1, wait: 0.5, act: () => panel.reset() },
  { until: () => !panel.state.resetting && !panel.state.alarm, wait: 6, act: () => panel.pull() },
  { until: () => panel.state.alarm, wait: 4, act: () => panel.ack() },
  { wait: 4, act: () => panel.silence() },
  { wait: 3, act: () => panel.reset() },
  { until: () => !panel.state.resetting && !panel.state.alarm, wait: 5, act: () => panel.flow(true) },
  { until: () => panel.state.alarm, wait: 4, act: () => panel.ack() },
  { wait: 3, act: () => panel.flow(false) },
  { wait: 2, act: () => panel.reset() },
  { until: () => !panel.state.resetting && !panel.state.alarm, wait: 4, act: () => {} },
];
function tour(dt) {
  const s = TOUR[step];
  if (s.until && !s.until()) { stepAt = 0; return; }
  stepAt += dt;
  if (stepAt >= s.wait) { s.act(); step = (step + 1) % TOUR.length; stepAt = 0; }
}
function setLed(id, on) { const el = leds[id]; if (!el) return; if (on) { if (el.dataset.on !== on) el.dataset.on = on; } else if (el.dataset.on) delete el.dataset.on; }
function flag(el, name, on) { if (!el) return; if (on) el.setAttribute(name, ""); else el.removeAttribute(name); }
function draw() {
  const v = panel.view(t);
  for (const [id, on] of Object.entries(v.leds)) setLed(id, on);
  if (lcd1.textContent !== v.lcd[0]) lcd1.textContent = v.lcd[0];
  if (lcd2.textContent !== v.lcd[1]) lcd2.textContent = v.lcd[1];
  slcWires.forEach((el) => flag(el, "data-poll", v.poll));
  nacWires.forEach((el) => flag(el, "data-on", v.nac));
  flag(horn, "data-on", v.horn);
  pipes.forEach((el) => flag(el, "data-lit", panel.state.flowOn));
  flag(strobe, "data-lit", v.strobe);
  flash.style.opacity = v.strobe ? "0.55" : "0";
  const want = panel.state.pulled ? 1 : 0;
  handleAt = still.matches ? want : handleAt + (want - handleAt) * (1 - Math.exp(-1 / 60 / 0.12));
  handle.setAttribute("transform", "translate(" + (DOWN[0] * 5 * handleAt).toFixed(2) + " " + (DOWN[1] * 5 * handleAt).toFixed(2) + ")");
  const density = Math.max(0, Math.min(1, (panel.state.obscuration - ${M.CLEAN_AIR}) / 2.6));
  smokeG.style.opacity = density.toFixed(3);
  puffs.forEach((p, i) => {
    const phase = (t * 0.22 + i / puffs.length) % 1;
    const x = SMOKE_AT[0] - 12 + i * 4 + Math.sin(t * 0.9 + i) * 2;
    const z = SMOKE_AT[1] - 22 + phase * 30;
    p.setAttribute("cx", x.toFixed(1)); p.setAttribute("cy", (-z).toFixed(1));
    p.style.opacity = (Math.sin(phase * Math.PI) * 0.8).toFixed(2);
  });
  if (readout.textContent !== v.readout) readout.textContent = v.readout;
  stage.setAttribute("aria-valuetext", v.readout);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now; t += dt;
  if (touring) tour(dt);
  panel.step(dt);
  draw();
  frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible && !still.matches) { last = 0; frame = requestAnimationFrame(tick); } };
function act(name) {
  touring = false; clearTimeout(idle);
  idle = setTimeout(() => { if (!still.matches) { touring = true; step = 0; stepAt = 0; } }, 15000);
  if (name === "d1" || name === "d2" || name === "d3") panel.smoke(!panel.state.smokeOn);
  if (name === "pull") panel.pull();
  if (name === "flow") panel.flow(!panel.state.flowOn);
  if (name === "ack") panel.ack();
  if (name === "silence") panel.silence();
  if (name === "reset") panel.reset();
  if (name === "drill") panel.drill();
  const key = svg.querySelector('.fa-key[data-act="' + name + '"]');
  if (key) { key.setAttribute("data-down", ""); setTimeout(() => key.removeAttribute("data-down"), 180); }
  if (still.matches) { panel.settle(); draw(); }
  run();
}
stage.addEventListener("click", (e) => { const el = e.target.closest("[data-act]"); if (el) act(el.dataset.act); });
stage.addEventListener("keydown", (e) => {
  const map = { s: "d2", p: "pull", w: "flow", 1: "ack", 2: "silence", 3: "reset", 4: "drill" };
  const name = map[e.key.toLowerCase()];
  if (!name) return;
  e.preventDefault(); act(name);
});
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
draw();
`;

const body =
  css +
  k.plateHtml({
    fig: "Fig 1",
    title: "Fire alarm panel",
    hint: "Click a device or a panel key",
    readout: "Normal",
    keys: [
      { mark: "lit", label: "Signalling line circuit: lights up as the panel polls each address" },
      { mark: "raised", label: "Field devices: smoke detectors 001 and 002, heat detector 003, pull station 004, waterflow monitor 005" },
      { mark: "dashed", label: "Notification circuit: carries 24 V to the horn strobe in alarm" },
      { mark: "edge", label: "Communicator under the cabinet: reports the alarm to a monitoring centre" },
      { mark: "flat", label: "Keys, left to right: acknowledge, silence, reset, drill (or press 1–4; S smokes 002, P pulls 004, W opens the test valve)" },
    ],
    caption: M.CAPTION,
    body: `<div class="iso-stage" tabindex="0" role="application" aria-label="Fire alarm panel. S puts smoke on detector 002, P pulls the pull station, W opens the sprinkler test valve, 1 acknowledges, 2 silences, 3 resets, 4 starts a drill.">${svg}</div>`,
  });

const name = theme === "light" ? "fire-alarm-panel-light.html" : "fire-alarm-panel.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "Fire alarm panel", theme, body, script: kitScript() + live, width: 720 }));
console.log("wrote", name, `${R.items.length} items`, `${CABLES.length} cables`);

A.auditOrExit(R, P, {});
