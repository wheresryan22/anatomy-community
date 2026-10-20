// The figure: world, parts, painter's order, controls and the live script. It writes no files;
// build.mjs (dist/ and the claude.ai artifact) and gallery.mjs (the community gallery copy) do.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k, G, hullSolid, prismX, planeMatrix, rrect, sweepClip, sectionOfBox, ALONG_Y } from "./shapes.mjs";
import { kitScript } from "../../../../.skill/scripts/inline-kit.mjs";
import * as M from "./model.js";

const HERE = dirname(fileURLToPath(import.meta.url));

const WIDTH = 640;
const HEIGHT = 498;

// ---------- world (1 unit = 0.1 m; x along track, y toward platform, z up; rail top z = 0) ----------
const X0 = -152; // model end: the train slides in and out here
const XEND = 182; // right-hand cut through the girder
const BASE = { x: -168, y: -54, w: 370, d: 140, r: 10 };
const ROAD = -90;
const BASE_H = 9;
const FOOT_H = 5;
const PIERS = [-122, 140];
const PIER_Y = 12;
const PIER_R = 8.5;
const CAP_TOP = -13.5;
const CAP = [[-30, CAP_TOP], [62, CAP_TOP], [62, -20.5], [27, -35], [-2, -35], [-30, -21.5]];
const GIRDER = { bottom: -12, floor: -4.8, top: 5.6, lip: 7.4, farOut: -26.9, farIn: -24.5, farLip: -30.6, nearIn: 19.4, nearOut: 21.8, nearLip: 23.4 };
const GAUGE = 7.175; // half of 1435 mm
const PLINTH_TOP = -1.9;

const PLAT = { x0: -132, x1: 170, edge: 17.4, back: 57, top: 10.9, under: 8.2 };
const PSD = { y: 18.9, panelY: 19.6, z0: 11.6, z1: 27.6, half: 9.5, post: 2 };
// queue boxes either side of each gate (x from the door centre), and the walking lane behind them
const QUEUE = { inner: 4.2, outer: 9.0, y0: 25.0, y1: 33.0 };
const LANE = [34.2, 36.4]; // keeps walkers clear of the benches (y ≥ 39.2), so the crowd paints before them

const MASTS = [-80, 100, 174];
const MAST_Y = -27.5;
const STAGGER = { "-80": 2, 100: -2 };
const CW = 50; // contact wire height: 5.0 m
const MW = 62.3; // messenger at supports: 1.23 m system height

// The train at rest, berthed: car 1's nose at M.MODEL.stop.
const NOSE = M.MODEL.stop; // 135
const CAR1 = { rear: NOSE - 218, cab: NOSE - 15 };
const CAR2 = { front: CAR1.rear - 7, from: X0 - 10 };
const DOORS1 = [NOSE - 38, NOSE - 90, NOSE - 142, NOSE - 194];
const DOOR2 = CAR2.front - 24;
const DOORS = [...DOORS1, DOOR2];
const CROWD = M.crowd({ doors: DOORS, gateY: PSD.y, queueY: [QUEUE.y0 + 2, QUEUE.y1 - 2], laneY: LANE, exitX: PLAT.x0 + 6 });
const SIDE = 16;
const BODY_Z = 9;
const SECTION = [[-16, BODY_Z], [16, BODY_Z], [16, 32.5], [15.6, 34.6], [14.6, 36.4], [13, 37.8], [10.8, 38.8], [8.5, 39.2], [-8.5, 39.2], [-10.8, 38.8], [-13, 37.8], [-14.6, 36.4], [-15.6, 34.6], [-16, 32.5]];
const ROOF = 39.2;
const DOOR = { half: 7.1, z0: 11, z1: 30.6, leaf: 7.4, travel: 7.6 };
const WIN = { z0: 17.6, z1: 29.6 };
const STRIPE = { z0: 13.2, z1: 15.4 };

const P = k.fitProjection(
  [
    ...k.boxCorners(BASE, ROAD - BASE_H - FOOT_H, ROAD),
    [-80, MAST_Y, 75],
    [174, MAST_Y, 77],
    [X0, -31, 7.4],
    [XEND, 23, 7.4],
    [PLAT.x1, PLAT.back, 22],
  ],
  WIDTH,
  HEIGHT,
  { pad: 16, azimuth: 58, elevation: 30 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const KS = G.scaleOf(P);
const box = (x0, x1, y0, y1, z0, z1, r = 0.3, steps = 2, bevel = 0) => k.slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r }, z0, z1 - z0, P, steps, bevel);
const depth = (p) => k.depthOf(p, P);
const sideY = (y) => planeMatrix([0, y, 0], [1, 0, 0], [0, 0, -1], P); // local (x, −z)
const frontX = (x) => planeMatrix([x, 0, 0], [0, -1, 0], [0, 0, -1], P); // local (−y, −z)
const g = (body, attrs = "") => `<g${attrs}>${body}</g>`;
const rodBetween = (a, b, r, P, opts) => {
  const dir = G.sub3(b, a);
  const len = G.len3(dir);
  return G.disc(0, len, r, G.frameAlong(a, dir), P, opts);
};

// ---------- base: a model plinth on feet, with the road it stands over ----------
function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, ROAD - BASE_H - FOOT_H, BASE_H, P)}"/>`];
  const feet = k.corners(BASE, 24).sort((a, b) => depth([a[0], a[1], 0]) - depth([b[0], b[1], 0]));
  for (const [x, y] of feet) {
    out.push(S(k.cylinder(x, y, 7.5, ROAD - BASE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.8, ROAD - BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(BASE, ROAD - BASE_H, BASE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(BASE, 5), ROAD, P), { tone: "lo" }));
  const screws = k.corners(BASE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, ROAD, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, ROAD])), { size: 0.5 }));
  // far and near footpaths with kerbs, a lane line on each carriageway, a zebra, gratings
  const far = { x: BASE.x + 6, y: -48, w: BASE.w - 12, d: 8, r: 2 };
  const near = { x: BASE.x + 6, y: 56, w: BASE.w - 12, d: 8, r: 2 };
  for (const path of [far, near]) {
    out.push(S(k.slabOf(path, ROAD, 1.4, P, 3, 0.4), { tone: "lo" }));
    const flags = [];
    for (let x = path.x + 12; x < path.x + path.w - 6; x += 12) flags.push(k.lineOnTop([x, path.y], [x, path.y + path.d], ROAD + 1.4, P));
    out.push(L(flags.join(""), { tone: "faint" }));
  }
  const zebra = { x0: -66, x1: -50 };
  const slots = [];
  for (const y of [-20.5, 40.5])
    for (let x = -150; x + 30 <= 188; x += 75) if (x + 30 < zebra.x0 - 4 || x > zebra.x1 + 4) slots.push(k.planOutline({ x, y: y - 0.7, w: 30, d: 1.4, r: 0.7 }, ROAD, P, 3));
  for (const [y0, y1] of [[-38, -3], [27, 54]]) for (let y = y0; y + 3 <= y1 + 0.01; y += 6) slots.push(k.planOutline({ x: zebra.x0, y, w: zebra.x1 - zebra.x0, d: 3, r: 0.4 }, ROAD, P, 2));
  out.push(L(slots.join(""), { tone: "faint" }));
  const gratings = [];
  for (const x of [-140, -20, 100, 172]) for (const y of [-40, 53.4]) {
    gratings.push(k.planOutline({ x, y, w: 9, d: 2.6, r: 0.4 }, ROAD, P, 2));
    for (let i = 1; i < 6; i++) gratings.push(k.planOutline({ x: x + i * 1.5 - 0.3, y: y + 0.5, w: 0.6, d: 1.6, r: 0.3 }, ROAD, P, 2));
  }
  out.push(L(gratings.join(""), { tone: "lo" }));
  // central median kerb under the piers
  const median = { x: BASE.x + 6, y: -1, w: BASE.w - 12, d: 26, r: 2 };
  out.push(S(k.slabOf(median, ROAD, 1.2, P, 3, 0.4), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(median, 2.2), ROAD + 1.2, P, 3), { tone: "faint" }));
  // scale ruler: 1 m minor, 5 m major
  const strip = { x: -108, y: 74, w: 290, d: 6, r: 1 };
  out.push(S(k.slabOf(strip, ROAD, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 3, strip.x + strip.w - 3, 10, 5, strip.y + 0.8, ROAD + 0.6, [1.8, 3.4], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 1.5, strip.y + 3, ROAD + 0.6]), at([strip.x + strip.w - 1.5, strip.y + 3, ROAD + 0.6])], { size: 0.45 }));
  // label plate with rule lines, and the one engraved label
  const label = { x: -156, y: 67, w: 40, d: 9, r: 1.2 };
  out.push(S(k.slabOf(label, ROAD, 0.8, P, 3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.4), ROAD + 0.8, P, 3), { tone: "faint" }));
  out.push(L([16, 11, 14].map((w, i) => k.lineOnTop([label.x + 17, label.y + 2.6 + i * 1.9], [label.x + 17 + w, label.y + 2.6 + i * 1.9], ROAD + 0.8, P)).join(""), { tone: "lo", free: true }));
  out.push(k.faceTextSvg(k.topMatrix([label.x + 3.2, label.y + 6.2], ROAD + 0.8, P, "x"), "1:100", { size: 3.4, tone: "mid" }));
  out.push(D([at([label.x + label.w - 3, label.y + 2.4, ROAD + 0.8]), at([label.x + label.w - 3, label.y + label.d - 2.4, ROAD + 0.8])], { size: 0.45 }));
  // the deck's shadow on the road
  out.push(`<path class="iso-halo dm-shade" d="${k.haloOf({ x: -146, y: -24, w: 322, d: 76, r: 6 }, ROAD, 0.1, P)}"/>`);
  return out.join("");
}

// ---------- an autorickshaw on the road below, for scale ----------
function auto(x, y, dir) {
  const W = (lx, ly, lz) => [x + dir * lx, y + dir * ly, ROAD + lz];
  const out = [];
  const wheel = (lx, ly) => S(G.disc(-0.6, 0.6, 2.2, G.frameAlong(W(lx, ly, 2.2), [0, 1, 0]), P), { tone: "lo" });
  const hull = (list) => S(hullSolid(list.map(([a, b, c]) => W(a, b, c)), P), { tone: "mid" });
  out.push(wheel(22, 0));
  out.push(wheel(5, -6.3 * dir));
  const tub = [];
  for (const s of [-1, 1]) tub.push([0.4, s * 6.4, 2.6], [0, s * 6.4, 8.6], [17, s * 6.4, 8.6], [17, s * 6.4, 2.6]);
  out.push(hull(tub));
  const cowl = [];
  for (const s of [-1, 1]) cowl.push([17, s * 6.4, 2.6], [17, s * 6.4, 8.6], [25.4, s * 3.0, 3.4], [24.2, s * 3.8, 9.8], [21.4, s * 5.8, 14.4], [17, s * 6.0, 14.4]);
  out.push(hull(cowl));
  for (const lx of [1.6, 12.8]) for (const s of [-1, 1]) out.push(hull([[lx - 0.35, s * 6.0 - 0.35, 8.6], [lx + 0.35, s * 6.0 - 0.35, 8.6], [lx + 0.35, s * 6.0 + 0.35, 8.6], [lx - 0.35, s * 6.0 + 0.35, 8.6], [lx - 0.35, s * 6.0 - 0.35, 14.6], [lx + 0.35, s * 6.0 - 0.35, 14.6], [lx + 0.35, s * 6.0 + 0.35, 14.6], [lx - 0.35, s * 6.0 + 0.35, 14.6]]));
  const roof = [];
  for (const s of [-1, 1]) for (const [lx, w, z] of [[0.6, 6.0, 14.4], [2.2, 6.9, 16.1], [20.2, 6.9, 16.1], [21.8, 6.0, 14.4]]) roof.push([lx, s * w, z]);
  for (const s of [-1, 1]) roof.push([4, s * 5.2, 16.9], [18.6, s * 5.2, 16.9]);
  out.push(S(hullSolid(roof.map(([a, b, c]) => W(a, b, c)), P), { tone: "mid" }));
  out.push(wheel(5, 6.3 * dir));
  return out.join("");
}

// ---------- piers: column, collar, hammerhead cap, bearings, downpipe ----------
function pier(px) {
  const out = [];
  out.push(S(k.cylinder(px, PIER_Y, 11.2, ROAD + 1.2, 1.6, P, 48, 0.6), { tone: "mid" }));
  const seams = L([-70, -52].map((z) => k.sideArc(px, PIER_Y, PIER_R, z, P, 36)).join(""), { tone: "faint" });
  out.push(S(k.cylinder(px, PIER_Y, PIER_R, ROAD + 2.8, -35 - ROAD - 2.8, P, 64), { tone: "mid", crease: "none", inner: seams }));
  out.push(S(prismX(CAP, px - 8, px + 8, P), { tone: "mid" }));
  out.push(L(k.lineOnTop([px - 8, 4], [px + 8, 4], CAP_TOP, P), { tone: "faint" }));
  for (const y of [-21, 13]) for (const dx of [-4.5, 4.5]) out.push(S(box(px + dx - 2, px + dx + 2, y, y + 6, CAP_TOP, CAP_TOP + 1.5, 0.3, 2), { tone: "lo" }));
  // rainwater downpipe from the girder soffit, clamped to the column
  const pipeX = px + 9.9;
  for (const z of [-78, -52]) out.push(S(box(px + 8.2, pipeX - 0.6, PIER_Y - 0.6, PIER_Y + 0.6, z, z + 1.3, 0.2, 2), { tone: "lo" }));
  out.push(S(k.cylinder(pipeX, PIER_Y, 0.85, ROAD + 2.8, GIRDER.bottom - 0.8 - ROAD - 2.8, P, 20), { tone: "mid", crease: "none" }));
  for (const z of [-78, -52]) out.push(S(k.cylinder(pipeX, PIER_Y, 1.25, z, 1.3, P, 20), { tone: "mid" }));
  out.push(S(k.cylinder(pipeX, PIER_Y, 1.5, GIRDER.bottom - 0.8, 0.8, P, 20), { tone: "mid" }));
  return out.join("");
}

// ---------- U-girder spans, walkway and track ----------
const SPANS = [
  [X0, PIERS[0] - 0.4],
  [PIERS[0] + 0.4, PIERS[1] - 0.4],
  [PIERS[1] + 0.4, XEND],
];
function girderBack([x0, x1]) {
  const out = [];
  out.push(S(box(x0, x1, GIRDER.farIn, GIRDER.nearIn, GIRDER.bottom, GIRDER.floor, 0, 1), { tone: "mid" }));
  out.push(S(box(x0, x1, GIRDER.farOut, GIRDER.farIn, GIRDER.bottom, GIRDER.top, 0, 1), { tone: "mid" }));
  out.push(S(box(x0, x1, GIRDER.farLip, GIRDER.farIn, GIRDER.top, GIRDER.lip, 0, 1, 0.5), { tone: "mid" }));
  // walkway / cable trough on the far side, lids every metre
  out.push(S(box(x0, x1, GIRDER.farIn, -18.6, GIRDER.floor, -1.6, 0, 1, 0.4), { tone: "lo" }));
  const lids = [];
  for (let x = Math.ceil(x0 / 10) * 10; x < x1 - 1; x += 10) if (x > x0 + 1) lids.push(k.lineOnTop([x, GIRDER.farIn], [x, -18.6], -1.6, P));
  out.push(L(lids.join(""), { tone: "faint" }));
  return out.join("");
}
function girderFront([x0, x1]) {
  const out = [];
  out.push(S(box(x0, x1, GIRDER.nearIn, GIRDER.nearOut, GIRDER.bottom, GIRDER.top, 0, 1), { tone: "mid" }));
  out.push(S(box(x0, x1, GIRDER.nearIn, GIRDER.nearLip, GIRDER.top, GIRDER.lip, 0, 1, 0.5), { tone: "mid" }));
  for (let x = x0 + 9; x < x1 - 4; x += 40) out.push(S(box(x - 1.2, x + 1.2, GIRDER.nearOut, GIRDER.nearOut + 2.2, -10.6, -9, 0.4, 2), { tone: "lo" }));
  return out.join("");
}
function track() {
  const out = [];
  const fasteners = [];
  for (const [x0, x1] of SPANS) {
    for (let x = x0 + 1.5; x < x1 - 3; x += 33) {
      const xe = Math.min(x + 30, x1 - 1.5);
      for (const s of [-1, 1]) {
        out.push(S(box(x, xe, s * GAUGE - 2.4, s * GAUGE + 2.4, GIRDER.floor, PLINTH_TOP, 0.3, 2, 0.3), { tone: "lo" }));
        for (let f = x + 2.5; f < xe - 1; f += 6) for (const side of [-1.35, 1.35]) fasteners.push(at([f, s * GAUGE + side, PLINTH_TOP]));
      }
    }
  }
  out.push(D(fasteners, { size: 0.35, tone: "mid" }));
  for (const s of [-1, 1]) {
    const y = s * GAUGE;
    out.push(S(box(X0, 156, y - s * 2.15 - 0.3, y - s * 2.15 + 0.3, PLINTH_TOP, -0.7, 0, 1), { tone: "lo", crease: "none" }));
    out.push(S(box(X0, 174, y - 0.75, y + 0.75, PLINTH_TOP, -1.45, 0, 1), { tone: "mid", crease: "none" }));
    out.push(S(box(X0, 174, y - 0.36, y + 0.36, -1.45, 0, 0, 1), { tone: "hi", crease: "none" }));
  }
  return out.join("");
}

// ---------- buffer stop at the end of the line ----------
function bufferStop() {
  const out = [];
  out.push(S(box(158, 172, -10, 10, 0, 2.6, 0.6, 2, 0.4), { tone: "mid" }));
  for (const y of [-GAUGE, GAUGE]) out.push(S(box(159, 171, y - 1.4, y + 1.4, -1.2, 0.2, 0.3, 2), { tone: "lo" }));
  out.push(S(box(163, 172, -8, 8, 2.6, 14, 0.8, 2, 0.6), { tone: "mid" }));
  out.push(L(k.sideSeam({ x: 163, y: -8, w: 9, d: 16, r: 0.8 }, 9, P, 2), { tone: "faint" }));
  const F = G.frameAlong([163, 0, 7.2], [-1, 0, 0]);
  out.push(S(G.disc(0, 5.8, 2.2, F, P), { tone: "mid" }));
  out.push(S(G.disc(5.8, 7, 4.2, F, P), { tone: "hi" }));
  out.push(D(G.dotsOf(F, 7, 3.2, 6, P, { all: true }), { size: 0.4 }));
  out.push(S(k.cylinder(167.5, 0, 1.7, 14, 2.4, P, 20, 0.4), { tone: "mid" }));
  out.push(D([at([167.5, 0, 16.4])], { size: 0.9, tone: "hi" }));
  return out.join("");
}

// ---------- overhead line: masts (behind the train) ----------
function hRing(x, y, b = 3.0, h = 3.4, tf = 0.55, tw = 0.45) {
  const hx = b / 2;
  const hy = h / 2;
  return [[x - hx, y - hy], [x + hx, y - hy], [x + hx, y - hy + tf], [x + tw / 2, y - hy + tf], [x + tw / 2, y + hy - tf], [x + hx, y + hy - tf], [x + hx, y + hy], [x - hx, y + hy], [x - hx, y + hy - tf], [x - tw / 2, y + hy - tf], [x - tw / 2, y - hy + tf], [x - hx, y - hy + tf]];
}
function mast(x, top) {
  const out = [];
  out.push(S(box(x - 3, x + 3, -30.4, -24.6, GIRDER.lip, GIRDER.lip + 0.8, 0.3, 2, 0.3), { tone: "lo" }));
  out.push(D([[-2, -1.8], [2, -1.8], [-2, 1.8], [2, 1.8]].map(([dx, dy]) => at([x + dx, MAST_Y + dy, GIRDER.lip + 0.8])), { size: 0.4 }));
  out.push(S(k.extrude(hRing(x, MAST_Y), GIRDER.lip + 0.8, top - GIRDER.lip - 0.8, P, { convex: false }), { tone: "mid" }));
  out.push(S(box(x - 1.9, x + 1.9, MAST_Y - 2.1, MAST_Y + 2.1, top, top + 0.6, 0.2, 2), { tone: "mid" }));
  // number plate and danger plate on the flange
  const plateY = MAST_Y + 1.7;
  out.push(S(box(x - 1.3, x + 1.3, plateY, plateY + 0.25, 30, 33.6, 0.2, 2), { tone: "lo" }));
  out.push(`<g transform="${sideY(plateY + 0.25)}">${L([30.9, 31.9, 32.8].map((z, i) => `M${x - 0.8} ${-z}H${x + (i === 1 ? 0.3 : 0.8)}`).join(""), { tone: "lo", free: true })}</g>`);
  out.push(S(box(x - 1.3, x + 1.3, plateY, plateY + 0.25, 24, 26.6, 0.2, 2), { tone: "lo" }));
  out.push(`<g transform="${sideY(plateY + 0.25)}">${L(k.pathOf([[x, -26.1], [x + 0.85, -24.5], [x - 0.85, -24.5]], true), { tone: "mid" })}</g>`);
  return out.join("");
}

// ---------- overhead line: cantilevers, wires (in front of everything) ----------
const contactY = (x) => {
  if (x <= -80) return 2 - ((-80 - x) / 180) * 4;
  if (x <= 100) return 2 - ((x + 80) / 180) * 4;
  return -2;
};
const messengerZ = (x) => {
  const span = (a, b) => {
    const u = (x - a) / (b - a);
    return MW - 5.4 * 4 * u * (1 - u);
  };
  if (x <= -80) return span(-260, -80);
  return span(-80, 100);
};
const ANCHOR = { x: MASTS[2], yFace: MAST_Y + 1.7 };
function insulatorAlong(a, dir, length, r, P, sheds = 4) {
  const F = G.frameAlong(a, dir);
  const parts = [S(G.disc(0, length, r * 0.5, F, P), { tone: "mid" })];
  for (let i = 0; i < sheds; i++) {
    const s = 0.8 + (i * (length - 1.6)) / Math.max(1, sheds - 1);
    parts.push(S(G.disc(s - 0.2, s + 0.2, r, F, P), { tone: "mid" }));
  }
  return parts.join("");
}
function cantilever(x) {
  const s = STAGGER[x];
  const face = MAST_Y + 1.7;
  const out = [];
  // bracket tube with its stay, messenger clamp
  out.push(insulatorAlong([x, face, 64.6], [0, 1, 0], 4.6, 1.5, P));
  out.push(S(rodBetween([x, face, 71.4], [x, -5, 64.9], 0.45, P), { tone: "mid" }));
  out.push(S(G.disc(face + 4.6, 6 - face, 0.75, G.frameAlong([x, 0, 64.6], [0, 1, 0]), P), { tone: "mid" }));
  out.push(S(box(x - 0.7, x + 0.7, s - 0.7, s + 0.7, MW + 0.3, 63.85, 0.2, 2), { tone: "mid" }));
  // register arm, drop rod and steady arm to the contact wire
  out.push(insulatorAlong([x, face, 55.4], [0, 1, 0], 4.6, 1.5, P));
  out.push(S(G.disc(face + 4.6, s - 4.4 - face, 0.6, G.frameAlong([x, 0, 55.4], [0, 1, 0]), P), { tone: "mid" }));
  out.push(S(rodBetween([x, s - 6.2, 64.0], [x, s - 6.2, 55.9], 0.32, P), { tone: "lo" }));
  out.push(S(rodBetween([x, s - 4.6, 55.4], [x, s - 0.6, CW + 0.55], 0.32, P), { tone: "mid" }));
  out.push(S(box(x - 0.7, x + 0.7, s - 0.9, s + 0.3, CW + 0.15, CW + 0.95, 0.2, 2), { tone: "mid" }));
  return out.join("");
}
function anchor() {
  const out = [];
  const x = ANCHOR.x;
  // termination yoke on the end mast: two insulators taking the wires off the mast
  for (const z of [56, 66.5]) {
    const end = [x - 0.2, ANCHOR.yFace, z];
    out.push(S(box(x - 1.2, x + 1.2, ANCHOR.yFace, ANCHOR.yFace + 1.2, z - 1.2, z + 1.2, 0.2, 2), { tone: "mid" }));
    const dir = G.unit3([-1, 0.35, 0]);
    out.push(insulatorAlong(G.add3(end, [0, 1.2, 0]), dir, 5, 1.4, P));
  }
  return out.join("");
}
function wires() {
  const out = [];
  const fade = 18 * KS;
  const run = (xs, f) => xs.map((x) => at(f(x)));
  const xsTo = (a, b, step = 4) => {
    const list = [];
    for (let x = a; x < b; x += step) list.push(x);
    list.push(b);
    return list;
  };
  // earth wire on the mast tops
  const earthEnd = [ANCHOR.x, MAST_Y, 77.6];
  const earth = (x) => [x, MAST_Y, 75.6 - 1.2 * Math.sin(Math.PI * ((((x + 80) % 180) + 180) % 180) / 180)];
  out.push(k.fadeLineSvg([...run(xsTo(X0, 100, 6), earth), at([ANCHOR.x, MAST_Y, 77.6])], { fade: [fade, 0], tone: "lo" }));
  // contact wire: straight between registrations, staggered ±200 mm
  const ins = (z) => G.add3([ANCHOR.x - 0.2, ANCHOR.yFace + 1.2, z], G.mul3(G.unit3([-1, 0.35, 0]), 5));
  const cEnd = ins(56);
  const mEnd = ins(66.5);
  const cw = [[X0, contactY(X0), CW], [-80, 2, CW], [100, -2, CW], cEnd];
  out.push(k.fadeLineSvg(cw.map(at), { fade: [fade, 0], tone: "hi" }).replace(/class="iso-line"/g, 'class="iso-line dm-cw"'));
  // messenger: catenary sag between supports, then up to the anchor
  const mw = [...xsTo(X0, 100, 4).map((x) => [x, contactY(x), messengerZ(x)]), [118, -2 - (18 / 74) * (mEnd[1] + 2), MW + 0.9], mEnd];
  out.push(k.fadeLineSvg(mw.map(at), { fade: [fade, 0], tone: "mid" }));
  // droppers, every 2.5 m
  const drops = [];
  for (const x of [-140, -110, -57.5, -35, -12.5, 10, 32.5, 55, 77.5]) {
    const y = contactY(x);
    drops.push(k.segment([x, y, messengerZ(x)], [x, y, CW], P));
  }
  out.push(L(drops.join(""), { tone: "lo" }));
  return out.join("");
}

// ---------- the train ----------
const clips = new Map();
const clipDefs = [];
function clipFor(section) {
  const key = JSON.stringify(section);
  if (!clips.has(key)) {
    const id = `dm-clip-${clips.size}`;
    clips.set(key, id);
    clipDefs.push(`<clipPath id="${id}"><path d="${sweepClip(section, X0, P)}"/></clipPath>`);
  }
  return clips.get(key);
}
const trainParts = [];
const part = (svg, section) => trainParts.push(`<g clip-path="url(#${clipFor(section)})"><g data-move>${svg}</g></g>`);
const BOGIE_SECTION = sectionOfBox(-11, 11, 0, 9.2);
const UNDER_SECTION = sectionOfBox(-13, 13, 3.4, 9.2);

function bogie(cx) {
  const out = [];
  for (const dx of [-11.5, 11.5]) out.push(S(G.disc(-0.65, 0.65, 4.3, G.frameAlong([cx + dx, GAUGE, 4.3], [0, 1, 0]), P), { tone: "mid" }));
  out.push(S(box(cx - 14, cx + 14, 8.6, 10.6, 2.4, 6.6, 0.8, 3, 0.3), { tone: "mid" }));
  for (const dx of [-11.5, 11.5]) out.push(S(G.disc(0, 1.0, 1.9, G.frameAlong([cx + dx, 10.6, 4.3], [0, 1, 0]), P), { tone: "mid" }));
  out.push(S(k.cylinder(cx, 9.6, 2.1, 6.6, BODY_Z - 6.6, P, 24), { tone: "lo" }));
  return out.join("");
}
function underframe(x0, x1) {
  const plan = { x: x0, y: -12, w: x1 - x0, d: 24, r: 0.6 };
  return S(k.slabOf(plan, 4.2, BODY_Z - 4.2, P, 2), { tone: "lo", inner: L(k.sideSeam(plan, 7.8, P, 2), { tone: "faint" }) });
}

// detail on the car side (plane y = SIDE), in local (x, −z)
function windowAt(x0, x1) {
  const d = rrect(x0, -WIN.z1, x1, -WIN.z0, 1.6);
  const sheen = k.pathOf([[x0 + 2, -WIN.z0 - 0.8], [x0 + 6.5, -WIN.z1 + 0.8], [x0 + 9, -WIN.z1 + 0.8], [x0 + 4.5, -WIN.z0 - 0.8]], true);
  return `<path class="dm-window" d="${d}"/><path class="dm-sheen" d="${sheen}"/>${L(d, { tone: "lo" })}${L(rrect(x0 - 0.9, -WIN.z1 - 0.9, x1 + 0.9, -WIN.z0 + 0.9, 2.3), { tone: "faint" })}`;
}
function stripeRuns(x0, x1, cuts) {
  const runs = [];
  let from = x0;
  for (const c of [...cuts].sort((a, b) => a - b)) {
    const a = c - DOOR.half - 1.1;
    const b = c + DOOR.half + 1.1;
    if (a > from) runs.push([from, a]);
    from = Math.max(from, b);
  }
  if (x1 > from) runs.push([from, x1]);
  return runs.map(([a, b]) => `<path class="dm-stripe" d="${rrect(a, -STRIPE.z1, b, -STRIPE.z0, 0)}"/>`).join("");
}
let leafCount = 0;
function doorway(c) {
  const out = [];
  const frame = rrect(c - DOOR.half - 1.1, -DOOR.z1 - 1.1, c + DOOR.half + 1.1, -DOOR.z0 + 0.2, 1.6);
  out.push(L(frame, { tone: "faint" }));
  out.push(`<path class="dm-void" d="${rrect(c - DOOR.half, -DOOR.z1, c + DOOR.half, -DOOR.z0, 1.2)}"/>`);
  out.push(`<path class="dm-floor" d="${rrect(c - DOOR.half, -DOOR.z0 - 1.1, c + DOOR.half, -DOOR.z0, 0)}"/>`);
  out.push(L(rrect(c - DOOR.half, -DOOR.z1, c + DOOR.half, -DOOR.z0, 1.2), { tone: "lo" }));
  // door-open lamp above the doorway
  out.push(`<path class="dm-lamp" data-lamp d="${rrect(c - 1.6, -DOOR.z1 - 2.1, c + 1.6, -DOOR.z1 - 1.5, 0.3)}"/>`);
  return out.join("");
}
function leaves(c) {
  const out = [];
  for (const dir of [-1, 1]) {
    const a = dir < 0 ? c - DOOR.leaf : c;
    const b = dir < 0 ? c : c + DOOR.leaf;
    const leaf = rrect(a, -DOOR.z1 + 0.2, b, -DOOR.z0 - 0.15, 0.9);
    const glass = rrect(a + 1.2, -DOOR.z1 + 2.4, b - 1.2, -18.4, 0.8);
    const body = [
      `<path class="dm-leaf" d="${leaf}"/>`,
      `<path class="dm-stripe" d="${rrect(a, -STRIPE.z1, b, -STRIPE.z0, 0)}"/>`,
      `<path class="dm-window" d="${glass}"/>`,
      L(glass, { tone: "lo" }),
      `<path class="iso-line" data-tone="lit" d="${leaf}"/>`,
    ].join("");
    out.push(`<g data-leaf="${leafCount++}" data-dir="${dir}">${body}</g>`);
  }
  return out.join("");
}
function sideDetails(x0, x1, windows, doors, stripeFrom, stripeTo) {
  const inner = [stripeRuns(stripeFrom, stripeTo, doors), ...windows.map(([a, b]) => windowAt(a, b)), ...doors.map(doorway)].join("");
  const plane = `<g transform="${sideY(SIDE)}">${inner}</g>`;
  const doorLeaves = `<g transform="${sideY(SIDE + 0.35)}">${doors.map(leaves).join("")}</g>`;
  return plane + doorLeaves;
}

function acUnit(x0, x1) {
  const plan = { x: x0, y: -10.5, w: x1 - x0, d: 21, r: 1.6 };
  const top = ROOF + 3.8;
  const out = [S(k.slabOf(plan, ROOF, 3.8, P, 4, 0.5), { tone: "hi", inner: L(k.sideSeam(plan, ROOF + 1.2, P, 4), { tone: "faint" }) })];
  const mid = (x0 + x1) / 2;
  out.push(L(k.lineOnTop([mid, plan.y], [mid, plan.y + plan.d], top, P), { tone: "faint" }));
  for (const cx of [mid - 7.6, mid + 7.6]) {
    out.push(L(k.ring(cx, 0, 4.4, top, P, 40), { tone: "lo" }));
    out.push(L(k.ring(cx, 0, 1.0, top, P, 16), { tone: "lo" }));
    const spokes = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      spokes.push(k.lineOnTop([cx + Math.cos(a) * 1.0, Math.sin(a) * 1.0], [cx + Math.cos(a) * 4.4, Math.sin(a) * 4.4], top, P));
    }
    out.push(L(spokes.join(""), { tone: "faint" }));
  }
  // louvres on the side
  const slots = [];
  for (let i = 0; i < 8; i++) slots.push(rrect(x0 + 3 + i * ((x1 - x0 - 6) / 8), -(ROOF + 3.0), x0 + 3 + i * ((x1 - x0 - 6) / 8) + 1.1, -(ROOF + 0.9), 0.5));
  out.push(`<g transform="${sideY(10.5)}">${L(slots.join(""), { tone: "faint" })}</g>`);
  return out.join("");
}

function pantograph() {
  const out = [];
  const z0 = ROOF;
  for (const x of [-134, -114]) for (const y of [-5, 5]) {
    out.push(S(k.cylinder(x, y, 0.8, z0, 2.2, P, 16), { tone: "mid", crease: "none" }));
    for (const z of [z0 + 0.6, z0 + 1.4]) out.push(S(k.cylinder(x, y, 1.5, z, 0.3, P, 20), { tone: "mid" }));
  }
  const frame = { x: -136.5, y: -6.5, w: 25, d: 13, r: 1 };
  out.push(S(k.slabOf(frame, z0 + 2.2, 1, P, 3, 0.4), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(frame, 2.2), z0 + 3.2, P, 3), { tone: "faint" }));
  out.push(S(box(-136, -130, -2, 2, z0 + 3.2, z0 + 5.0, 0.4, 2, 0.3), { tone: "mid" }));
  const pivot = [-133, 0, z0 + 4.2];
  const knee = [-103, 0, 46.4];
  out.push(S(rodBetween([-131, 0, z0 + 3.6], [-105.5, 0, 45.4], 0.3, P), { tone: "lo" }));
  out.push(S(rodBetween(pivot, knee, 0.8, P), { tone: "hi", lit: false }));
  out.push(S(G.sphereOf(knee, 1.1, P), { tone: "hi" }));
  for (const s of [-1, 1]) out.push(S(rodBetween([-103.4, s * 0.6, 46.6], [-120.6, s * 3.6, 48.3], 0.42, P), { tone: "hi" }));
  out.push(S(box(-122.2, -119.8, -4.2, 4.2, 48.2, 48.9, 0.2, 2), { tone: "mid" }));
  out.push(S(box(-121.6, -120.4, -7.2, 7.2, 48.9, CW - 0.1, 0.2, 2), { tone: "hi" }));
  for (const s of [-1, 1]) {
    const pts = [];
    for (const x of [-121.6, -120.4]) pts.push([x, s * 7.2, CW - 0.1], [x, s * 7.2, 48.9], [x, s * 9.7, 48.2], [x, s * 9.7, 47.3]);
    out.push(S(hullSolid(pts, P), { tone: "hi" }));
  }
  return out.join("");
}

function noseSolid() {
  const ringA = SECTION.map(([y, z]) => [CAR1.cab, y, z]);
  const ringB = [[-15.3, BODY_Z], [15.3, BODY_Z], [15.3, 23], [14.8, 30], [13, 34.4], [9.6, 36.6], [-9.6, 36.6], [-13, 34.4], [-14.8, 30], [-15.3, 23]].map(([y, z]) => [NOSE - 6, y, z]);
  const front = [[-12.4, BODY_Z], [12.4, BODY_Z], [13.4, 10.6], [13.4, 21.8], [12.4, 23.4], [-12.4, 23.4], [-13.4, 21.8], [-13.4, 10.6]].map(([y, z]) => [NOSE, y, z]);
  const screenTop = [[-10.5, 35.8], [10.5, 35.8]].map(([y, z]) => [NOSE - 6.6, y, z]);
  return { points: [...ringA, ...ringB, ...front, ...screenTop] };
}
function car1() {
  const nose = noseSolid();
  const rear = SECTION.map(([y, z]) => [CAR1.rear, y, z]);
  const solid = hullSolid([...rear, ...nose.points], P, { crease: 0.2 });
  return solid;
}
function noseDetails() {
  const out = [];
  // raked windscreen face: from the front top edge (x = NOSE, z 23.4) back to (NOSE − 6.6, z 35.8)
  const a = [NOSE, 0, 23.4];
  const b = [NOSE - 6.6, 0, 35.8];
  const up = G.unit3(G.sub3(b, a));
  const len = G.len3(G.sub3(b, a));
  const screenM = planeMatrix(a, [0, -1, 0], G.mul3(up, -1), P); // local (−y, −along)
  const ws = k.pathOf([[-11.6, -1.0], [11.6, -1.0], [9.9, -(len - 1.4)], [-9.9, -(len - 1.4)]], true);
  const board = rrect(-7.4, -(len - 1.6), 7.4, -(len - 4.4), 0.6);
  const door = rrect(-3.8, 0.4, 3.8, -(len - 4.8), 0.8);
  const led = [];
  for (let u = -6.6; u <= 6.6; u += 0.9) for (const v of [-(len - 2.5), -(len - 3.5)]) led.push([u, v]);
  out.push(`<g transform="${screenM}"><path class="dm-window" d="${ws}"/><path class="dm-sheen" d="${k.pathOf([[-9, -1.6], [-6.5, -1.6], [-3.6, -(len - 5)], [-6, -(len - 5)]], true)}"/>${L(ws, { tone: "lo" })}<path class="dm-led" d="${board}"/>${L(board, { tone: "lo" })}${led.map(([u, v]) => `<circle class="dm-led-dot" cx="${u.toFixed(2)}" cy="${v.toFixed(2)}" r="0.22"/>`).join("")}${L(door, { tone: "faint" })}</g>`);
  // lower front face (x = NOSE): emergency door, head and tail lamps, seam
  const fm = frontX(NOSE);
  const lamps = [];
  for (const s of [-1, 1]) {
    lamps.push(`<path class="dm-lens" d="${rrect(s * 7.4 - 2.2, -15.6, s * 7.4 + 2.2, -13.4, 0.9)}"/>`);
    lamps.push(L(rrect(s * 7.4 - 2.2, -15.6, s * 7.4 + 2.2, -13.4, 0.9), { tone: "mid" }));
    lamps.push(`<path class="dm-tail" d="${rrect(s * 10.9 - 1, -15.2, s * 10.9 + 1, -13.8, 0.6)}"/>`);
    lamps.push(L(rrect(s * 10.9 - 1, -15.2, s * 10.9 + 1, -13.8, 0.6), { tone: "lo" }));
  }
  out.push(`<g transform="${fm}">${L(rrect(-3.8, -23.8, 3.8, -BODY_Z - 0.6, 0.8), { tone: "faint" })}${lamps.join("")}<path class="dm-stripe" d="${rrect(-13.4, -STRIPE.z1, -4.6, -STRIPE.z0, 0)}"/><path class="dm-stripe" d="${rrect(4.6, -STRIPE.z1, 13.4, -STRIPE.z0, 0)}"/></g>`);
  return out.join("");
}
function skirtAndCoupler() {
  const out = [];
  const skirt = [];
  for (const s of [-1, 1]) skirt.push([NOSE - 8, s * 13.4, BODY_Z], [NOSE, s * 12.4, BODY_Z], [NOSE + 1, s * 10.2, 3.8], [NOSE - 7, s * 12, 3.8]);
  out.push(S(hullSolid(skirt, P), { tone: "mid" }));
  out.push(S(box(NOSE + 0.6, NOSE + 2.4, -1.3, 1.3, 5.6, 7.8, 0.3, 2), { tone: "lo" }));
  out.push(S(box(NOSE + 2.4, NOSE + 5.6, -2.6, 2.6, 4.8, 8.6, 0.6, 2, 0.3), { tone: "mid" }));
  out.push(`<g transform="${frontX(NOSE + 5.6)}">${L(rrect(-1.6, -7.6, 1.6, -5.8, 0.6), { tone: "lo" })}</g>`);
  return out.join("");
}
function gangway() {
  const x0 = CAR2.front;
  const x1 = CAR1.rear;
  const out = [S(box(x0, x1, -11.5, 11.5, 9.8, 34.4, 1.2, 2), { tone: "lo" })];
  const ribs = [];
  for (let x = x0 + 1; x < x1 - 0.5; x += 1) {
    ribs.push(k.segment([x, 11.5, 9.8], [x, 11.5, 34.4], P));
    ribs.push(k.lineOnTop([x, -11.5], [x, 11.5], 34.4, P));
  }
  out.push(L(ribs.join(""), { tone: "faint" }));
  return out.join("");
}

function roofDetails(x0, x1, hatches) {
  const seams = [-4.25, 4.25].map((y) => k.lineOnTop([x0, y], [x1, y], ROOF, P)).join("");
  const out = [L(seams, { tone: "faint" })];
  for (const [a, b] of hatches) out.push(L(k.planOutline({ x: a, y: -2.6, w: b - a, d: 5.2, r: 0.8 }, ROOF, P, 3), { tone: "lo" }));
  return out.join("");
}
function noseStripe() {
  const quad = (pts) => `<path class="dm-stripe" d="${k.pathOf(pts.map(at), true)}"/>`;
  const out = [];
  for (const [a, b] of [[[CAR1.cab, 16], [NOSE - 6, 15.3]], [[NOSE - 6, 15.3], [NOSE, 13.4]]])
    out.push(quad([[a[0], a[1], STRIPE.z0], [b[0], b[1], STRIPE.z0], [b[0], b[1], STRIPE.z1], [a[0], a[1], STRIPE.z1]]));
  return out.join("");
}
function antenna() {
  return S(box(NOSE - 26, NOSE - 22, -5.6, -2.6, ROOF, ROOF + 0.9, 0.3, 2), { tone: "mid" }) + S(k.cylinder(NOSE - 24, -4.1, 0.35, ROOF + 0.9, 3.2, P, 12), { tone: "mid", crease: "none" }) + S(k.cylinder(NOSE - 24, -4.1, 0.7, ROOF + 4.1, 0.5, P, 14), { tone: "mid" });
}

function train() {
  // car 2 (front only: the rest of the train runs on past the model's end)
  part(bogie(DOOR2 - 6), BOGIE_SECTION);
  part(S(prismX(SECTION, CAR2.from, CAR2.front, P), { tone: "hi" }), SECTION);
  part(roofDetails(CAR2.from, CAR2.front, []), SECTION);
  part(sideDetails(CAR2.from, CAR2.front, [[CAR2.from, DOOR2 - 15.4]], [DOOR2], CAR2.from, CAR2.front - 3), SECTION);
  part(`<g transform="${frontX(CAR2.front)}">${L(rrect(-14.2, -31.8, 14.2, -BODY_Z - 1.2, 2), { tone: "faint" })}</g>`, SECTION);
  part(pantograph(), sectionOfBox(-10, 10, ROOF, CW + 0.5));
  part(gangway(), sectionOfBox(-11.5, 11.5, 9.8, 34.4));
  // car 1: driving motor car with cab
  part(bogie(CAR1.rear + 30), BOGIE_SECTION);
  part(bogie(CAR1.rear + 180), BOGIE_SECTION);
  part([underframe(CAR1.rear + 46, CAR1.rear + 76), underframe(CAR1.rear + 82, CAR1.rear + 114), underframe(CAR1.rear + 120, CAR1.rear + 158)].join(""), UNDER_SECTION);
  part(skirtAndCoupler(), sectionOfBox(-13.4, 13.4, 3.8, 9.2));
  part(S(car1(), { tone: "hi" }), SECTION);
  part(roofDetails(CAR1.rear, CAR1.cab, [[CAR1.rear + 64, CAR1.rear + 74], [CAR1.rear + 128, CAR1.rear + 138]]) + noseStripe(), SECTION);
  part(antenna(), sectionOfBox(-5.6, -2.6, ROOF, ROOF + 4.6));
  const windows = [];
  for (let i = 0; i < 3; i++) windows.push([DOORS1[i + 1] + 15.4, DOORS1[i] - 15.4]);
  part(sideDetails(CAR1.rear, CAR1.cab, windows, DOORS1, CAR1.rear + 2.5, CAR1.cab), SECTION);
  part(noseDetails(), SECTION);
  part([acUnit(CAR1.rear + 22, CAR1.rear + 54), acUnit(CAR1.rear + 150, CAR1.rear + 182)].join(""), sectionOfBox(-10.5, 10.5, ROOF, ROOF + 3.8));
  return `<g data-part="train">${trainParts.join("")}</g>`;
}

// ---------- platform, screen doors ----------
function platformUnder() {
  const out = [];
  for (const px of PIERS) {
    for (const y of [25, 48]) out.push(S(k.cylinder(px, y, 2.4, CAP_TOP, -2 - CAP_TOP, P, 28), { tone: "mid", crease: "none" }));
    out.push(S(box(px - 4.5, px + 4.5, 20.5, 53.5, -2, 2.6, 0.4, 2, 0.4), { tone: "mid" }));
  }
  for (const [y0, y1] of [[21.4, 25.6], [46, 50.2]]) out.push(S(box(PLAT.x0 + 1, PLAT.x1 - 1, y0, y1, 2.6, PLAT.under, 0.3, 2, 0.3), { tone: "lo" }));
  return out.join("");
}
let gateCount = 0;
function platform() {
  const out = [];
  const slab = { x: PLAT.x0, y: PLAT.edge, w: PLAT.x1 - PLAT.x0, d: PLAT.back - PLAT.edge, r: 0.8 };
  out.push(S(k.slabOf(slab, PLAT.under, PLAT.top - PLAT.under, P, 3, 0.8), { tone: "mid", inner: L(k.sideSeam(slab, 9.7, P, 3), { tone: "faint" }) }));
  // floor: coping, tactile guide strip, tile joints
  const floorZ = PLAT.top + 0.12;
  out.push(S(box(PLAT.x0, PLAT.x1, PLAT.edge, 18.4, PLAT.top, floorZ, 0, 1), { tone: "lo", flat: true, crease: "none" }));
  const tactile = { x: PLAT.x0, y: 21.6, w: PLAT.x1 - PLAT.x0, d: 3, r: 0 };
  out.push(S(k.slabOf(tactile, PLAT.top, 0.12, P, 1), { tone: "lo", flat: true, crease: "none" }));
  const bumps = [];
  for (let x = PLAT.x0 + 0.9; x < PLAT.x1 - 0.5; x += 1.5) for (const y of [22.3, 23.1, 23.9]) bumps.push(at([x + (y === 23.1 ? 0.75 : 0), y, floorZ]));
  out.push(D(bumps, { size: 0.28, tone: "lo" }));
  const joints = [];
  for (let x = PLAT.x0 + 15; x < PLAT.x1 - 2; x += 15) joints.push(k.lineOnTop([x, 24.6], [x, 53.6], PLAT.top, P));
  for (const y of [34.6, 44.6]) joints.push(k.lineOnTop([PLAT.x0, y], [PLAT.x1, y], PLAT.top, P));
  joints.push(k.lineOnTop([PLAT.x0, 24.6], [PLAT.x1, 24.6], PLAT.top, P));
  out.push(L(joints.join(""), { tone: "faint" }));
  // painted queue lanes at every gate: board from either side, alight down the middle
  const marks = [];
  const flat = (pts) => k.pathOf(pts.map(([x, y]) => at([x, y, PLAT.top])), true);
  const chevron = (cx, y, dir) => flat([[cx, y], [cx + 1.5, y + dir * 1.5], [cx + 1.5, y + dir * 2.3], [cx, y + dir * 0.8], [cx - 1.5, y + dir * 2.3], [cx - 1.5, y + dir * 1.5]]);
  for (const c of DOORS) {
    for (const side of [-1, 1]) {
      const x0 = side < 0 ? c - QUEUE.outer : c + QUEUE.inner;
      marks.push(k.planOutline({ x: x0, y: QUEUE.y0, w: QUEUE.outer - QUEUE.inner, d: QUEUE.y1 - QUEUE.y0, r: 0.4 }, PLAT.top, P, 2));
      const cx = c + side * (QUEUE.inner + QUEUE.outer) / 2;
      marks.push(chevron(cx, QUEUE.y0 + 1.6, 1), chevron(cx, QUEUE.y0 + 4.6, 1));
    }
    marks.push(chevron(c, QUEUE.y0 + 4.2, -1), chevron(c, QUEUE.y0 + 7.2, -1));
  }
  out.push(L(marks.join(""), { tone: "lo" }));
  return out.join("");
}

// ---------- passengers: 1:100 model figures ----------
// Each is built standing where it starts and moved live by translation, so it never turns:
// queuers face the gates (shoulders along x), walkers face along the platform (shoulders along y).
function person(px, py, h, { along = "x", pack = false } = {}) {
  const z0 = PLAT.top + 0.12;
  const hip = z0 + h * 0.48;
  const shoulder = z0 + h * 0.82;
  const out = [];
  const [sx, sy] = along === "x" ? [1, 0.62] : [0.62, 1];
  const legs = along === "x" ? [[px - 0.85, py], [px + 0.85, py]] : [[px, py - 0.85], [px, py + 0.85]];
  legs.sort((a, b) => depth([a[0], a[1], 0]) - depth([b[0], b[1], 0]));
  for (const [x, y] of legs) out.push(S(k.cylinder(x, y, 0.72, z0, hip - z0 + 0.4, P, 12), { tone: "lo" }));
  const ring = (z, rx, ry) => Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    return [px + Math.cos(a) * rx * sx, py + Math.sin(a) * ry * sy, z];
  });
  const torso = [...ring(hip, 1.7, 1.7), ...ring(shoulder - 1.4, 2.25, 2.25), ...ring(shoulder, 1.75, 1.75)];
  out.push(S(hullSolid(torso, P, { crease: 0.6 }), { tone: "mid" }));
  if (pack) {
    // backpack on the side away from the way they face: +y for queuers, +x for walkers
    const [bx0, bx1, by0, by1] = along === "x" ? [px - 1.3, px + 1.3, py + 1.0, py + 2.2] : [px + 1.0, px + 2.2, py - 1.3, py + 1.3];
    out.push(S(box(bx0, bx1, by0, by1, shoulder - 4.4, shoulder - 0.6, 0.5, 2, 0.3), { tone: "lo" }));
  }
  out.push(S(k.cylinder(px, py, 0.55, shoulder, Math.max(0.4, h * 0.18 - 1.9), P, 10), { tone: "lo", crease: "none" }));
  out.push(S(G.sphereOf([px, py, z0 + h - 1.15], 1.15, P, { steps: 24 }), { tone: "mid" }));
  return out.join("");
}
function crowdLayer() {
  const order = CROWD.map((p, i) => i).sort((a, b) => depth([...CROWD[a].home, 0]) - depth([...CROWD[b].home, 0]));
  const people = order.map((i) => {
    const p = CROWD[i];
    const svg = person(p.home[0], p.home[1], p.h, { along: p.kind === "on" ? "x" : "y", pack: i % 3 === 1 });
    return `<g data-person="${i}"${p.kind === "on" ? "" : ` style="opacity:0"`}>${svg}</g>`;
  });
  return `<g data-part="crowd">${people.join("")}</g>`;
}
function screenDoors() {
  const out = [];
  const sill = { x: PLAT.x0 + 1, y: 18.4, w: PLAT.x1 - PLAT.x0 - 2, d: 1.8, r: 0.3 };
  out.push(S(k.slabOf(sill, PLAT.top, PSD.z0 - PLAT.top, P, 2, 0.3), { tone: "mid" }));
  // sliding leaves (behind the fixed glass and the posts)
  const leafPlane = sideY(PSD.y);
  const leafSvg = [];
  for (const c of DOORS)
    for (const dir of [-1, 1]) {
      const a = dir < 0 ? c - PSD.half : c;
      const b = dir < 0 ? c : c + PSD.half;
      const frame = rrect(a + 0.1, -PSD.z1 + 0.4, b - 0.1, -PSD.z0, 0.6);
      const glass = rrect(a + 0.9, -PSD.z1 + 1.2, b - 0.9, -PSD.z0 - 1.6, 0.4);
      leafSvg.push(`<g data-gate="${gateCount++}" data-dir="${dir}"><path class="dm-psd-frame" d="${frame}"/><path class="dm-glass" d="${glass}"/><path class="dm-sheen" d="${k.pathOf([[a + 2, -PSD.z0 - 2], [a + 4.4, -PSD.z1 + 1.6], [a + 5.6, -PSD.z1 + 1.6], [a + 3.2, -PSD.z0 - 2]], true)}"/>${L(glass, { tone: "faint" })}${L(frame, { tone: "mid" })}</g>`);
    }
  out.push(`<g transform="${leafPlane}">${leafSvg.join("")}</g>`);
  // fixed panels between gates, with mullions, and their top rail
  const posts = [];
  for (const c of DOORS) posts.push(c - PSD.half - PSD.post, c + PSD.half);
  posts.push(PLAT.x0 + 1.2, PLAT.x1 - 1.2 - PSD.post);
  posts.sort((a, b) => a - b);
  const runs = [];
  for (let i = 0; i < posts.length - 1; i++) {
    const a = posts[i] + PSD.post;
    const b = posts[i + 1];
    const isGate = DOORS.some((c) => Math.abs(a - (c - PSD.half)) < 0.01);
    if (!isGate && b - a > 0.5) runs.push([a, b]);
  }
  const fixed = [];
  for (const [a, b] of runs) {
    const panes = Math.max(1, Math.round((b - a) / 11));
    const glass = rrect(a + 0.4, -PSD.z1 + 0.8, b - 0.4, -PSD.z0 - 0.8, 0.3);
    fixed.push(`<path class="dm-glass" d="${glass}"/>`);
    for (let p = 0; p < panes; p++) {
      const u = a + ((b - a) * (p + 0.15)) / panes;
      fixed.push(`<path class="dm-sheen" d="${k.pathOf([[u, -PSD.z0 - 1.6], [u + 2.6, -PSD.z1 + 1.4], [u + 3.6, -PSD.z1 + 1.4], [u + 1, -PSD.z0 - 1.6]], true)}"/>`);
    }
    fixed.push(L(glass, { tone: "faint" }));
    const mull = [];
    for (let p = 1; p < panes; p++) {
      const u = a + ((b - a) * p) / panes;
      mull.push(rrect(u - 0.35, -PSD.z1 + 0.8, u + 0.35, -PSD.z0 - 0.8, 0.1));
    }
    if (mull.length) fixed.push(`<path class="dm-psd-frame" d="${mull.join("")}"/>${L(mull.join(""), { tone: "mid" })}`);
  }
  out.push(`<g transform="${sideY(PSD.panelY)}">${fixed.join("")}</g>`);
  for (const [a, b] of runs) {
    const rail = { x: a - 0.2, y: PSD.panelY - 0.5, w: b - a + 0.4, d: 1, r: 0.2 };
    out.push(S(k.slabOf(rail, PSD.z1 - 0.8, 0.9, P, 2, 0.3), { tone: "mid" }));
    out.push(S(k.slabOf({ ...rail, y: PSD.panelY - 0.6, d: 1.2 }, PSD.z0, 0.8, P, 2), { tone: "mid" }));
  }
  // posts with their door-status lamps
  const lamps = [];
  for (const x of posts) {
    const plan = { x, y: 18.4, w: PSD.post, d: 2, r: 0.4 };
    out.push(S(k.slabOf(plan, PSD.z0, PSD.z1 + 0.8 - PSD.z0, P, 2, 0.4), { tone: "mid", inner: L(k.sideSeam(plan, PSD.z1 - 3, P, 2), { tone: "faint" }) }));
    lamps.push(at([x + PSD.post / 2, 19.4, PSD.z1 + 0.8]));
  }
  out.push(`<g data-part="psd-lamps">${D(lamps, { size: 0.55, tone: "hi" })}</g>`);
  return out.join("");
}
function furniture() {
  const out = [];
  const bench = (x0) => {
    const parts = [];
    for (const x of [x0 + 2, x0 + 18]) parts.push(S(box(x, x + 1.4, 39.6, 43.6, PLAT.top, 15.2, 0.2, 2), { tone: "mid" }));
    parts.push(S(box(x0, x0 + 21.4, 39.2, 43.8, 15.2, 16.0, 0.4, 2, 0.3), { tone: "hi" }));
    const backrest = { x: x0, y: 43.2, w: 21.4, d: 0.8, r: 0.3 };
    parts.push(S(k.slabOf(backrest, 16.0, 4.4, P, 2, 0.3), { tone: "hi", inner: L([17.5, 19.0].map((z) => k.sideSeam(backrest, z, P, 2)).join(""), { tone: "faint" }) }));
    return parts.join("");
  };
  out.push(bench(-96), bench(22));
  // passenger information display on a post
  out.push(S(k.cylinder(66, 49, 0.9, PLAT.top, 25.5 - PLAT.top, P, 20), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(66, 49, 2.0, PLAT.top, 0.6, P, 24), { tone: "mid" }));
  const pid = { x: 53, y: 48, w: 26, d: 2.2, r: 0.5 };
  out.push(S(k.slabOf(pid, 25.5, 7.2, P, 2, 0.4), { tone: "mid" }));
  out.push(`<g transform="${sideY(pid.y + pid.d)}"><path class="dm-led" d="${rrect(54.4, -31.6, 77.6, -26.6, 0.4)}"/>${L(rrect(54.4, -31.6, 77.6, -26.6, 0.4), { tone: "lo" })}<text class="dm-pid" data-part="pid" x="55.6" y="-28.2" font-size="2.6">ARRIVING</text><text class="dm-pid dm-pid-dim" x="76.4" y="-28.2" font-size="2.6" text-anchor="end">8</text></g>`);
  return out.join("");
}
function railings() {
  const out = [];
  // back parapet with glass balustrade and handrail
  const wall = { x: PLAT.x0, y: 53.6, w: PLAT.x1 - PLAT.x0, d: PLAT.back - 53.6, r: 0.4 };
  out.push(S(k.slabOf(wall, PLAT.top, 3.6, P, 2, 0.5), { tone: "mid" }));
  const railZ0 = PLAT.top + 3.6;
  const railZ1 = railZ0 + 7.2;
  const postsX = [];
  for (let x = PLAT.x0 + 1.5; x <= PLAT.x1 - 1.5; x += (PLAT.x1 - PLAT.x0 - 3) / 12) postsX.push(x);
  const glass = [];
  for (let i = 0; i < postsX.length - 1; i++) glass.push(rrect(postsX[i] + 0.6, -railZ1 + 0.4, postsX[i + 1] - 0.6, -railZ0 - 0.4, 0.2));
  out.push(`<g transform="${sideY(55.3)}"><path class="dm-glass" d="${glass.join("")}"/>${L(glass.join(""), { tone: "faint" })}</g>`);
  for (const x of postsX) out.push(S(box(x - 0.45, x + 0.45, 54.85, 55.75, railZ0, railZ1, 0.2, 2), { tone: "mid" }));
  out.push(S(box(PLAT.x0 + 0.6, PLAT.x1 - 0.6, 54.6, 56.0, railZ1, railZ1 + 0.8, 0.3, 2, 0.3), { tone: "hi" }));
  // end railing at the buffer end
  const ex = PLAT.x1 - 1.6;
  const endPosts = [21, 30, 39, 48, 53];
  const endGlass = [];
  for (let i = 0; i < endPosts.length - 1; i++) endGlass.push(rrect(-(endPosts[i] + 0.6), -(PLAT.top + 10.4), -(endPosts[i + 1] - 0.6), -(PLAT.top + 0.6), 0.2));
  out.push(`<g transform="${frontX(ex)}"><path class="dm-glass" d="${endGlass.join("")}"/>${L(endGlass.join(""), { tone: "faint" })}</g>`);
  for (const y of endPosts) out.push(S(box(ex - 0.45, ex + 0.45, y - 0.45, y + 0.45, PLAT.top, PLAT.top + 10.8, 0.2, 2), { tone: "mid" }));
  out.push(S(box(ex - 0.7, ex + 0.7, 20.4, 53.6, PLAT.top + 10.8, PLAT.top + 11.6, 0.3, 2, 0.3), { tone: "hi" }));
  return out.join("");
}

// ---------- assemble ----------
const back = [base(), auto(30, -27, -1)];
for (const px of PIERS) back.push(pier(px));
back.push(auto(-104, 40, 1));
for (const span of SPANS) back.push(girderBack(span));
back.push(track());
for (const x of MASTS) back.push(mast(x, x === MASTS[2] ? 76.4 : 74));
const trainSvg = train();
const front = [];
for (const span of SPANS) front.push(girderFront(span));
front.push(bufferStop());
front.push(platformUnder());
front.push(platform());
front.push(screenDoors());
front.push(crowdLayer());
front.push(furniture());
front.push(railings());
front.push(cantilever(-80), cantilever(100), anchor(), wires());

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A 1:100 model of a terminal platform on the Delhi Metro Magenta Line: a U-girder viaduct on two hammerhead piers over a road, standard-gauge track on plinths ending at a buffer stop, 25 kV overhead catenary on masts, and a side platform with half-height glass screen doors. A driverless Hyundai Rotem train brakes in, stops with its doors in line with the screen-door gates, opens both together, then reverses out.",
  body: [`<defs>${clipDefs.join("")}</defs>`, ...back, trainSvg, ...front],
});

const DM_DARK = "--dm-window:#0a0a0a;--dm-void:#040404;--dm-floor:#202020;--dm-glass:rgba(150,170,190,.10);--dm-sheen:rgba(255,255,255,.07);--dm-line:#d4489e;--dm-led:#060606;--dm-led-on:#e9e9e9;--dm-lens:#e6e6e6;--dm-tail:#3a3a3a;--dm-lamp:#2c2c2c;--dm-lamp-on:#ffffff;--dm-leaf:#202020";
const DM_LIGHT = "--dm-window:#a9adb2;--dm-void:#6c7075;--dm-floor:#b8babd;--dm-glass:rgba(198,212,222,.42);--dm-sheen:rgba(255,255,255,.62);--dm-line:#b3237f;--dm-led:#2b2c2e;--dm-led-on:#f4f4f2;--dm-lens:#ffffff;--dm-tail:#9a9a9e;--dm-lamp:#c9c9cc;--dm-lamp-on:#18181a;--dm-leaf:#ffffff";
const DM_TOKENS = `.iso{${DM_DARK}}\n.iso[data-theme="light"]{${DM_LIGHT}}`;
const DM_CSS = `
${DM_TOKENS}
.dm-window{fill:var(--dm-window)}
.dm-void{fill:var(--dm-void)}
.dm-floor{fill:var(--dm-floor)}
.dm-leaf{fill:var(--dm-leaf)}
.dm-glass{fill:var(--dm-glass);stroke:none}
.dm-sheen{fill:var(--dm-sheen);stroke:none}
.dm-stripe{fill:var(--dm-line)}
.dm-led{fill:var(--dm-led)}
.dm-led-dot{fill:var(--dm-led-on);opacity:.55}
.dm-lens{fill:var(--dm-lens)}
.dm-tail{fill:var(--dm-tail)}
.dm-psd-frame{fill:var(--anatomy-paper)}
.dm-lamp{fill:var(--dm-lamp);transition:fill .3s var(--anatomy-ease)}
[data-doors-open] .dm-lamp{fill:var(--dm-lamp-on)}
.dm-pid{fill:var(--dm-led-on);font-family:var(--anatomy-mono);letter-spacing:.06em}
.dm-pid-dim{opacity:.6}
.iso-line.dm-cw{stroke-width:.9px}
.iso-halo.dm-shade{opacity:calc(var(--anatomy-halo-opacity)*.5);filter:blur(16px);transform:translateY(8px)}
.iso-stage{touch-action:pan-y;outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
.dm-hint-touch{display:none}
@media (hover:none){.dm-hint-fine{display:none}.dm-hint-touch{display:inline}}
.dm-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.dm-controls{display:flex;flex-wrap:wrap;align-items:flex-start;gap:14px 16px;margin-top:22px}
.dm-mode{flex:none;display:inline-flex;box-shadow:0 0 0 1px var(--anatomy-mid)}
.dm-mode button{height:26px;padding:0 11px;border:0;border-radius:0;background:var(--anatomy-card);color:var(--anatomy-muted);font:500 10.5px/1 var(--anatomy-mono);letter-spacing:.1em;text-transform:uppercase;cursor:pointer}
.dm-mode button+button{box-shadow:-1px 0 0 var(--anatomy-mid)}
.dm-mode button:hover{color:var(--anatomy-strong)}
.dm-mode button[aria-pressed="true"]{background:var(--anatomy-strong);color:var(--anatomy-card)}
.dm-mode button:focus-visible{outline:1px solid var(--anatomy-strong);outline-offset:3px}
.dm-panel{flex:1 1 100%;min-width:0;display:flex;align-items:flex-start;gap:16px}
.dm-panel[hidden]{display:none}
.dm-drive{flex-wrap:wrap;align-items:center;gap:10px 22px}
.dm-handle{flex:0 1 210px;min-width:160px;display:grid;grid-template-columns:auto 1fr;align-items:center;column-gap:10px;row-gap:3px}
.dm-handle-label{font:500 10.5px/1 var(--anatomy-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--anatomy-strong)}
.dm-brake{--fill:0%;-webkit-appearance:none;appearance:none;width:100%;height:24px;margin:0;background:transparent;cursor:pointer}
.dm-brake::-webkit-slider-runnable-track{height:4px;background:linear-gradient(to right,var(--anatomy-hi) var(--fill),var(--anatomy-faint) var(--fill))}
.dm-brake::-moz-range-track{height:4px;background:linear-gradient(to right,var(--anatomy-hi) var(--fill),var(--anatomy-faint) var(--fill))}
.dm-brake::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:12px;height:22px;margin-top:-9px;border:0;border-radius:2px;background:var(--anatomy-card);box-shadow:0 0 0 1.2px var(--anatomy-strong),inset 0 -7px 0 -5px var(--anatomy-mid)}
.dm-brake::-moz-range-thumb{width:12px;height:22px;border:1.2px solid var(--anatomy-strong);border-radius:2px;background:var(--anatomy-card)}
.dm-brake:focus-visible{outline:1px solid var(--anatomy-strong);outline-offset:4px}
.dm-notches{grid-column:2;display:flex;justify-content:space-between;padding:0 3px;color:var(--anatomy-muted);font:9.5px/1 var(--anatomy-mono)}
.dm-notches span{width:6px;text-align:center}
.dm-gauge{flex:1 1 230px;min-width:0;max-width:100%;height:auto;overflow:visible}
.dm-gauge-rule,.dm-gauge-major{fill:none;stroke:var(--anatomy-mid);stroke-width:1}
.dm-gauge-tick{fill:none;stroke:var(--anatomy-lo);stroke-width:1}
.dm-gauge-band{fill:var(--dm-line);opacity:.2;transition:opacity .2s var(--anatomy-ease)}
.dm-gauge[data-on-mark] .dm-gauge-band{opacity:.55}
.dm-gauge-buffer{fill:var(--anatomy-faint);stroke:var(--anatomy-mid);stroke-width:1}
.dm-gauge-label{fill:var(--anatomy-muted);font:8px var(--anatomy-mono);letter-spacing:.04em}
.dm-gauge-stem{fill:none;stroke:var(--anatomy-strong);stroke-width:1.2}
.dm-gauge-head{fill:var(--anatomy-strong)}
.dm-gauge-train{fill:var(--anatomy-card);stroke:var(--anatomy-strong);stroke-width:1.2}
.dm-note{flex-basis:100%;margin:0;max-width:62ch;min-height:3em;color:var(--anatomy-text);font-size:12.5px;line-height:1.5}
.dm-play{flex:none;display:inline-flex;align-items:center;gap:8px;height:26px;padding:0 12px 0 10px;border:0;border-radius:0;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-mid);color:var(--anatomy-strong);font:500 10.5px/1 var(--anatomy-mono);letter-spacing:.1em;text-transform:uppercase;cursor:pointer}
.dm-play:hover{box-shadow:0 0 0 1px var(--anatomy-hi)}
.dm-play-icon{width:9px;height:10px;flex:none;overflow:visible}
.dm-play-icon path{fill:none;stroke:currentColor;stroke-width:1.6}
.dm-play-icon [data-icon="play"]{fill:currentColor;stroke:none}
.dm-play[data-state="playing"] [data-icon="play"],.dm-play[data-state="paused"] [data-icon="pause"]{display:none}
.dm-line{position:relative;flex:1;min-width:0;display:grid;grid-template-columns:repeat(${M.PHASES.length},1fr);touch-action:pan-y;user-select:none;-webkit-user-select:none}
.dm-line[data-dragging]{cursor:grabbing}
.dm-line-track{position:absolute;left:calc(50% / ${M.PHASES.length});right:calc(50% / ${M.PHASES.length});top:12px;height:2px;background:var(--anatomy-faint);pointer-events:none}
.dm-line-run{position:absolute;top:0;bottom:0;left:0;width:0;background:var(--dm-line)}
.dm-stop{position:relative;display:grid;justify-items:center;align-content:start;gap:9px;min-width:0;padding:7px 2px 0;border:0;background:none;color:var(--anatomy-muted);font:10px/1.3 var(--anatomy-mono);letter-spacing:.08em;text-transform:uppercase;text-align:center;cursor:pointer;-webkit-tap-highlight-color:transparent}
.dm-stop-dot{width:12px;height:12px;box-sizing:border-box;border-radius:50%;background:var(--anatomy-card);box-shadow:0 0 0 1.5px var(--anatomy-lo);transition:background-color .2s var(--anatomy-ease),box-shadow .2s var(--anatomy-ease)}
.dm-stop[data-passed] .dm-stop-dot{box-shadow:0 0 0 1.5px var(--dm-line)}
.dm-stop[aria-current] .dm-stop-dot{background:var(--dm-line);box-shadow:0 0 0 1.5px var(--dm-line),0 0 0 4px var(--anatomy-card),0 0 0 5px var(--dm-line)}
.dm-stop[aria-current]{color:var(--anatomy-strong)}
.dm-stop:hover{color:var(--anatomy-text)}
.dm-stop:hover:not([aria-current]) .dm-stop-dot{box-shadow:0 0 0 1.5px var(--anatomy-hi)}
.dm-stop:hover[aria-current]{color:var(--anatomy-strong)}
.dm-play:focus-visible,.dm-stop:focus-visible{outline:1px solid var(--anatomy-strong);outline-offset:3px}
@media (max-width:560px){.dm-controls{gap:12px;margin-top:18px}.dm-panel{flex-basis:100%;gap:12px}.dm-play{padding:0 8px}.dm-play-label,.dm-stop-name{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}}
@media (prefers-reduced-motion:reduce){.dm-stop-dot{transition:none}}
`;
const css = `<style>${DM_CSS}</style>`;

const modelSource = readFileSync(join(HERE, "model.js"), "utf8").replace(/^export .*$/gm, "");
const RULER = { from: -8, to: 2, x0: 14, x1: 290 };
const gaugeX = (m) => RULER.x0 + ((Math.max(RULER.from, Math.min(RULER.to, m)) - RULER.from) / (RULER.to - RULER.from)) * (RULER.x1 - RULER.x0);
const live = `
${modelSource}
const P = ${JSON.stringify(P)};
const DOOR_TRAVEL = ${DOOR.travel}, GATE_TRAVEL = ${PSD.half - 0.2};
const MODEL_END = ${X0};
const CROWD = ${JSON.stringify(CROWD.map((p) => ({ ...p, h: undefined })))};
const RULER = ${JSON.stringify(RULER)};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const trainEl = svg.querySelector('[data-part="train"]');
const movers = [...svg.querySelectorAll("[data-move]")];
const leafEls = [...svg.querySelectorAll("[data-leaf]")].map((el) => ({ el, dir: Number(el.dataset.dir) }));
const gateEls = [...svg.querySelectorAll("[data-gate]")].map((el) => ({ el, dir: Number(el.dataset.dir) }));
const crowdEl = svg.querySelector('[data-part="crowd"]');
const personEls = CROWD.map((p, i) => crowdEl.querySelector('[data-person="' + i + '"]'));
const pid = svg.querySelector('[data-part="pid"]');
const readout = document.querySelector("[data-readout]");
const status = document.querySelector("[data-status]");
const hintEl = document.querySelector('.iso-plate-corner[data-corner="hint"]');
const still = matchMedia("(prefers-reduced-motion: reduce)");
const playBtn = document.querySelector("[data-play]");
const playLabel = playBtn.querySelector(".dm-play-label");
const line = document.querySelector("[data-line]");
const lineRun = line.querySelector("[data-run]");
const stops = [...line.querySelectorAll("[data-stop]")];
const modeBtns = [...document.querySelectorAll("[data-mode]")];
const panels = [...document.querySelectorAll("[data-panel]")];
const brake = document.querySelector("[data-brake]");
const gaugeEl = document.querySelector("[data-gauge]");
const needle = gaugeEl.querySelector("[data-needle]");
const trainMark = gaugeEl.querySelector("[data-train-mark]");
const note = document.querySelector("[data-note]");
const UX = axisVector(P, [1, 0, 0]);
const UY = axisVector(P, [0, 1, 0]);
const UZ = axisVector(P, [0, 0, 1]);
const STARTS = PHASES.map((p) => p.tour);
const PID_TEXT = { approach: "ARRIVING", berthed: "TERMINATES", opening: "TERMINATES", dwell: "TERMINATES", closing: "DOORS CLOSING", locked: "DEPARTING", depart: "DEPARTING", clear: "NEXT 4 MIN" };
const PHASE_WORDS = { approach: "Train arriving.", berthed: "Train berthed.", opening: "Doors opening.", dwell: "Doors open.", closing: "Doors closing.", locked: "Doors locked.", depart: "Train departing.", clear: "Platform clear." };
const HINT = { watch: hintEl.innerHTML, drive: "<span>Brake to stop on the mark</span>" };
let shown = { tour: still.matches ? PHASES[3].tour + 1 : 0.0001 };
let target = shown.tour;
let playing = !still.matches;
let scrubbing = false;
// held: the reader paused or picked a phase, so the idle tour waits for Play instead of resuming.
let held = still.matches;
let frame = 0, last = 0, visible = false, idle = 0, lastPhase = "", lastText = "", lastPid = "", lastOrder = "";
let mode = "watch";
// a hand-driven berth carried into the tour; cleared when the tour next wraps or is steered
let tourOffset = 0;
// stage: approach (you have the brake) → result → timeline (doors or set-back) → approach; lead-in finishes a tour cycle first.
// pt is the passengers' clock: it follows the stop when the doors open, and waits with them when they stay shut.
const drive = { stage: "idle", s: null, notch: 0, vt: 0, pt: 0, offset: 0, ok: false, result: null, wait: 0, best: null };
const move = (el, dx) => { if (Math.abs(dx) < 0.005) el.removeAttribute("transform"); else el.setAttribute("transform", "translate(" + (UX[0] * dx).toFixed(2) + " " + (UX[1] * dx).toFixed(2) + ")"); };

// Passengers move by translation from where they were drawn, with a small walking bob,
// and are re-sorted back to front whenever their order changes.
function drawCrowd(t) {
  const c = crowdAt(CROWD, t);
  const keyed = [];
  c.people.forEach((q, i) => {
    const el = personEls[i];
    if (q.o <= 0.002) { if (el.style.display !== "none") el.style.display = "none"; return; }
    el.style.display = "";
    el.style.opacity = q.o >= 0.998 ? "1" : q.o.toFixed(3);
    const home = CROWD[i].home;
    const dx = q.x - home[0];
    const dy = q.y - home[1];
    const bob = q.walked > 0 ? 0.35 * Math.abs(Math.sin((Math.PI * q.walked) / 7)) : 0;
    const sx = UX[0] * dx + UY[0] * dy + UZ[0] * bob;
    const sy = UX[1] * dx + UY[1] * dy + UZ[1] * bob;
    el.setAttribute("transform", "translate(" + sx.toFixed(2) + " " + sy.toFixed(2) + ")");
    keyed.push([depthOf([q.x, q.y, 0], P), i]);
  });
  keyed.sort((a, b) => a[0] - b[0]);
  const order = keyed.map((k) => k[1]).join(",");
  if (order !== lastOrder) { lastOrder = order; for (const [, i] of keyed) crowdEl.appendChild(personEls[i]); }
  return c;
}

function currentView() {
  if (mode === "watch") {
    const t = tourToModel(shown.tour);
    const s = stateAt(t, tourOffset);
    return { s, pt: t, readout: s.readout };
  }
  const d = drive;
  if (d.stage === "approach" || d.stage === "result") {
    const dx = d.s.x * 10;
    const s = { phase: "approach", index: 0, into: 0, dx, nose: MODEL.stop + dx, doors: 0, gates: 0 };
    const text = d.stage === "result" ? d.result.text : driveReadout(d.s, d.notch);
    return { s, pt: d.pt, readout: text, manual: true, pid: d.stage === "result" ? (d.ok ? "TERMINATES" : "DOORS LOCKED") : "ARRIVING" };
  }
  const s = stateAt(d.vt, d.offset);
  return { s, pt: d.ok ? d.vt : d.pt, readout: s.readout };
}

function draw() {
  const v = currentView();
  const s = v.s;
  const offstage = s.dx < -440;
  trainEl.style.display = offstage ? "none" : "";
  if (!offstage) for (const m of movers) move(m, s.dx);
  for (const { el, dir } of leafEls) move(el, dir * s.doors * DOOR_TRAVEL);
  for (const { el, dir } of gateEls) move(el, dir * s.gates * GATE_TRAVEL);
  svg.toggleAttribute("data-doors-open", s.doors > 0.04);
  const c = drawCrowd(v.pt);
  const text = !v.manual && s.phase === "dwell" ? v.readout + " · " + c.off + " off · " + c.on + " on" : v.readout;
  if (text !== lastText) { readout.textContent = text; lastText = text; }
  const pidText = v.pid || PID_TEXT[s.phase];
  if (pidText !== lastPid) { pid.textContent = pidText; lastPid = pidText; }
  if (mode === "watch") {
    const along = Math.min(stops.length - 1, s.index + Math.min(1, s.into / PHASES[s.index].time));
    lineRun.style.width = ((along / (stops.length - 1)) * 100).toFixed(2) + "%";
  } else drawGauge();
  if (s.phase !== lastPhase) {
    lastPhase = s.phase;
    stage.setAttribute("aria-valuetext", PHASE_WORDS[s.phase]);
    stage.setAttribute("aria-valuenow", String(s.index));
    stops.forEach((el, i) => {
      el.toggleAttribute("data-passed", i < s.index);
      if (i === s.index) el.setAttribute("aria-current", "step");
      else el.removeAttribute("aria-current");
    });
    const focus = document.activeElement;
    if (status && mode === "watch" && (focus === stage || line.contains(focus))) status.textContent = PHASE_WORDS[s.phase];
  }
}

// The stopping gauge: the needle is where the train comes to rest if the handle stays put.
const gaugeX = (m) => RULER.x0 + ((Math.max(RULER.from, Math.min(RULER.to, m)) - RULER.from) / (RULER.to - RULER.from)) * (RULER.x1 - RULER.x0);
function drawGauge() {
  const d = drive;
  let at = null;
  let now = null;
  if (d.stage === "approach") { at = predictStop(d.s, d.notch).x; now = d.s.x; }
  else if (d.stage === "result") { at = d.s.x; now = d.s.x; }
  needle.style.visibility = at === null ? "hidden" : "";
  trainMark.style.visibility = now === null || now < RULER.from ? "hidden" : "";
  if (at !== null) needle.setAttribute("transform", "translate(" + gaugeX(at).toFixed(1) + " 0)");
  if (now !== null) trainMark.setAttribute("cx", gaugeX(now).toFixed(1));
  gaugeEl.toggleAttribute("data-on-mark", at !== null && Math.abs(at) <= DRIVE.tolerance && !(d.stage === "result" && !d.ok));
}

function setNotch(n) {
  drive.notch = n;
  brake.value = String(n);
  brake.setAttribute("aria-valuetext", n ? "B" + n : "Coast");
  brake.style.setProperty("--fill", ((n / DRIVE.notches) * 100).toFixed(1) + "%");
}
function startRun() {
  const d = drive;
  d.stage = "approach";
  d.s = { x: DRIVE.start, v: DRIVE.enter, a: 0, hit: 0 };
  d.vt = 0;
  d.offset = 0;
  d.ok = false;
  d.result = null;
  setNotch(0);
  note.textContent = d.best === null
    ? "Let the train coast in at 22 km/h, then brake so the needle settles in the band. Stop within 0.3 m of the mark and the gates open."
    : "Coast in, then brake into the band. Your best stop so far: " + d.best.toFixed(2) + " m from the mark.";
}
function finish() {
  const d = drive;
  d.result = verdict(d.s);
  d.ok = d.result.ok;
  d.offset = d.s.x * 10;
  d.stage = "result";
  d.wait = 2.2;
  if (d.ok) {
    const miss = Math.abs(d.s.x);
    if (d.best === null || miss < d.best) d.best = miss;
    note.textContent = "On the mark: the gates release and open with the train doors. Best so far: " + d.best.toFixed(2) + " m.";
  } else note.textContent = d.s.hit
    ? "Still moving at the end of the line. The train sets back for another go."
    : "The doorways don't line up with the gates, so the gates stay locked. The train sets back for another go.";
  if (status) status.textContent = d.result.text + ".";
}
function stepDrive(dt) {
  const d = drive;
  if (d.stage === "approach") {
    d.s = driveStep(d.s, d.notch, dt);
    d.pt = Math.min(APPROACH - 0.001, d.pt + dt);
    if (d.s.v <= 0) finish();
  } else if (d.stage === "result") {
    d.pt = Math.min(APPROACH - 0.001, d.pt + dt);
    d.wait -= dt;
    if (d.wait <= 0) {
      d.stage = "timeline";
      d.vt = d.ok ? PHASES[1].start : PHASES[5].start;
      if (d.ok) d.pt = d.vt;
    }
  } else if (d.stage === "timeline" || d.stage === "lead-in") {
    const { phase } = phaseAt(Math.min(d.vt, CYCLE - 1e-6));
    d.vt += dt * phase.speed * (d.stage === "lead-in" ? 4 : 1);
    d.pt = d.ok ? d.vt : Math.min(APPROACH - 0.001, d.pt + dt);
    if (d.vt >= CYCLE) { if (d.ok) d.pt = d.vt - CYCLE; startRun(); }
  }
}
function enterDrive() {
  const d = drive;
  const t = tourToModel(shown.tour);
  const s = stateAt(t, tourOffset);
  d.result = null;
  if (s.phase === "approach" && s.nose > MODEL_END) {
    // take over mid-approach, at the brake the automatic stop was using
    d.s = { x: s.dx / 10, v: s.speed, a: brakeAt(APPROACH - s.into).a, hit: 0 };
    d.pt = t;
    d.ok = false;
    d.stage = "approach";
    setNotch(DRIVE.notches);
    note.textContent = "You have the train at full brake. Ease off to roll closer to the mark.";
  } else if (s.phase === "approach" || s.phase === "clear") {
    d.pt = s.phase === "clear" ? t - CYCLE : t;
    startRun();
  } else {
    d.stage = "lead-in";
    d.vt = t;
    d.offset = tourOffset;
    d.ok = true;
    note.textContent = "This train finishes its stop first. Yours is next.";
  }
}
function enterWatch() {
  const d = drive;
  let t = 0;
  let offset = 0;
  if (d.stage === "approach") {
    if (d.s.x <= DRIVE.start) t = 0;
    else if (d.s.x < 0) t = Math.max(0, APPROACH - solve((tau) => brakeAt(tau).d, -d.s.x, 60));
    else { t = APPROACH; offset = d.s.x * 10; }
  } else if (d.stage === "result") {
    t = d.ok ? APPROACH : PHASES[5].start;
    offset = d.offset;
  } else {
    t = d.vt;
    offset = d.offset;
  }
  tourOffset = offset;
  shown.tour = target = modelToTour(Math.min(t, CYCLE - 0.001));
  scrubbing = false;
  playing = !held;
  d.stage = "idle";
}
function setMode(next) {
  if (next === mode) return;
  if (next === "drive") enterDrive();
  else enterWatch();
  mode = next;
  modeBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
  panels.forEach((p) => (p.hidden = p.dataset.panel !== mode));
  hintEl.innerHTML = HINT[mode];
  lastPhase = "";
  lastText = "";
  lastPid = "";
  clearTimeout(idle);
  run();
}

function syncPlay() {
  playBtn.dataset.state = held ? "paused" : "playing";
  playLabel.textContent = held ? "Play" : "Pause";
  playBtn.setAttribute("aria-label", held ? "Play the station stop" : "Pause the station stop");
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (mode === "drive") stepDrive(dt);
  else {
    const calm = still.matches;
    if (playing && !scrubbing) { target += dt; shown.tour = target; }
    else {
      const gap = target - shown.tour;
      shown.tour = calm ? target : shown.tour + gap * (1 - Math.exp(-dt / 0.3));
      if (Math.abs(target - shown.tour) < 0.002) shown.tour = target;
    }
    if (shown.tour >= TOUR) { shown.tour -= TOUR; target -= TOUR; tourOffset = 0; }
  }
  draw();
  const busy = mode === "drive" || playing || shown.tour !== target;
  frame = visible && busy ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const rest = () => { clearTimeout(idle); if (held) return; idle = setTimeout(() => { if (!held && mode === "watch") { scrubbing = false; playing = true; target = shown.tour; run(); } }, 3600); };
const steer = (to) => { tourOffset = 0; playing = false; scrubbing = true; target = Math.max(0, Math.min(TOUR - 0.001, to)); rest(); run(); };
const hold = () => { held = true; clearTimeout(idle); syncPlay(); };
const play = () => { held = false; scrubbing = false; playing = true; target = shown.tour; clearTimeout(idle); syncPlay(); run(); };
const pause = () => { hold(); playing = false; scrubbing = true; target = shown.tour; run(); };
// Phase stops sit evenly on the line, like stations on a line map, so x maps to a phase, then to time within it.
function tourAtX(x) {
  const box = line.getBoundingClientRect();
  const pitch = box.width / stops.length;
  const along = Math.max(0, Math.min(stops.length - 1, (x - box.left - pitch / 2) / pitch));
  const i = Math.min(stops.length - 1, Math.floor(along));
  return STARTS[i] + (along - i) * (PHASES[i].time / PHASES[i].speed);
}
playBtn.addEventListener("click", () => (held ? play() : pause()));
modeBtns.forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
brake.addEventListener("input", () => setNotch(Number(brake.value)));
let drag = null, dragged = false;
line.addEventListener("pointerdown", (event) => { if (event.button !== 0) return; drag = { id: event.pointerId, x: event.clientX }; dragged = false; });
line.addEventListener("pointermove", (event) => {
  if (!drag || event.pointerId !== drag.id) return;
  if (!dragged) {
    if (Math.abs(event.clientX - drag.x) < 5) return;
    dragged = true;
    line.setPointerCapture(event.pointerId);
    line.toggleAttribute("data-dragging", true);
  }
  hold();
  steer(tourAtX(event.clientX));
});
const endDrag = (event) => { if (drag && event.pointerId === drag.id) { drag = null; line.removeAttribute("data-dragging"); } };
line.addEventListener("pointerup", endDrag);
line.addEventListener("pointercancel", endDrag);
stops.forEach((el, i) => el.addEventListener("click", (event) => {
  if (event.detail !== 0 && dragged) return;
  hold();
  steer(STARTS[i] + 0.2);
}));
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  if (mode !== "watch" || event.pointerType === "touch") return;
  const box = svg.getBoundingClientRect();
  const f = Math.min(1, Math.max(0, ((event.clientX - box.left) / box.width - 0.08) / 0.84));
  steer(f * (TOUR - 0.01));
});
stage.addEventListener("pointerdown", (event) => {
  if (mode !== "watch" || event.pointerType !== "touch") return;
  const now = shown.tour;
  const next = STARTS.find((s) => s > now + 0.25);
  hold();
  steer((next === undefined ? 0 : next) + 0.2);
});
stage.addEventListener("pointerleave", () => { if (mode === "watch") rest(); });
stage.addEventListener("keydown", (event) => {
  if (mode === "drive") {
    const step = event.key === "ArrowRight" || event.key === "ArrowUp" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowDown" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    setNotch(Math.max(0, Math.min(DRIVE.notches, drive.notch + step)));
    return;
  }
  const now = scrubbing ? target : shown.tour;
  let to = null;
  if (event.key === "ArrowRight") { const next = STARTS.find((s) => s > now + 0.25); to = (next === undefined ? 0 : next) + 0.2; }
  if (event.key === "ArrowLeft") { const prev = [...STARTS].reverse().find((s) => s < now - 0.5); to = (prev === undefined ? STARTS[STARTS.length - 1] : prev) + 0.2; }
  if (event.key === "Home") to = 0.2;
  if (event.key === "End") to = PHASES[3].tour + 0.5;
  if (event.key === " " || event.key === "Enter") { event.preventDefault(); if (held) play(); else pause(); return; }
  if (to === null) return;
  event.preventDefault();
  hold();
  steer(to);
});
stage.addEventListener("focus", () => { if (status) status.textContent = PHASE_WORDS[lastPhase] || ""; });
syncPlay();
setNotch(0);
draw();
`;

const figure =
  k.plateHtml({
    fig: "Fig 1",
    title: "Delhi Metro · Magenta Line terminus",
    hint: "HINT_SLOT",
    readout: stateAt0(),
    keys: [
      { mark: "lit", label: "Train doors: they stop in line with the gates" },
      { mark: "raised", label: "Half-height glass screen doors, 1.7 m" },
      { mark: "flat", label: "Queue lanes: board at the sides, alight down the middle" },
      { mark: "edge", label: "25 kV contact wire, 5.0 m above the rail" },
    ],
    caption:
      "A 1:100 model of an elevated terminal platform on Line 8. The driverless Hyundai Rotem train enters at 30 km/h and brakes at 1.1 m/s², easing off at 0.75 m/s³, so that its doorways halt in line with the screen-door gates. At the terminus everyone alights down the middle of each gate before the queues at the sides board, during the 30 s design dwell (played here at 3×); then the doors close and the train reverses out at 1.0 m/s². In Drive you work the seven-notch brake handle yourself: the train coasts in at 22 km/h, and only a stop within about 0.3 m of the mark lines the doorways up closely enough for the gates to release. U-girders span about 28 m between piers; the contact wire zigzags ±200 mm so it wears the pantograph strip evenly.",
    body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Delhi Metro terminus. In Watch, move the pointer across to scrub the station stop; left and right arrows step between phases; space pauses. In Drive, left and right arrows move the brake handle." aria-valuemin="0" aria-valuemax="${M.PHASES.length - 1}" aria-valuenow="0" aria-valuetext="Train arriving.">${svg}<span class="dm-sr" role="status" aria-live="polite" data-status></span></div>${controls()}`,
  });
// Watch: play/pause and the stop drawn as a Magenta Line strip, one station per phase.
// Drive: a seven-notch brake handle and a stopping gauge whose needle predicts where the train rests.
function controls() {
  const NAMES = { approach: "Arriving", berthed: "Berthed", opening: "Doors opening", dwell: "Doors open", closing: "Doors closing", locked: "Locked", depart: "Departing", clear: "Clear" };
  const stops = M.PHASES.map((p, i) => `<button type="button" class="dm-stop" data-stop="${i}"${i === 0 ? ` aria-current="step"` : ""}><span class="dm-stop-dot" aria-hidden="true"></span><span class="dm-stop-name">${NAMES[p.name]}</span></button>`).join("");
  const icon = `<svg class="dm-play-icon" viewBox="0 0 9 10" aria-hidden="true"><path data-icon="pause" d="M2 1v8M7 1v8"/><path data-icon="play" d="M1 .5 8.5 5 1 9.5Z"/></svg>`;
  const watch = `<div class="dm-panel" data-panel="watch"><button type="button" class="dm-play" data-play data-state="playing" aria-label="Pause the station stop">${icon}<span class="dm-play-label">Pause</span></button><div class="dm-line" data-line role="group" aria-label="Jump to a phase of the stop"><span class="dm-line-track" aria-hidden="true"><span class="dm-line-run" data-run></span></span>${stops}</div></div>`;
  const notches = Array.from({ length: M.DRIVE.notches + 1 }, (_, i) => `<span>${i ? i : "C"}</span>`).join("");
  const ticks = [];
  const majors = [];
  const labels = [];
  for (let m = RULER.from; m <= RULER.to; m++) {
    const x = gaugeX(m).toFixed(1);
    (m % 2 === 0 ? majors : ticks).push(`M${x} 24V${m % 2 === 0 ? 31 : 28}`);
    if (m % 2 === 0) labels.push(`<text class="dm-gauge-label" x="${x}" y="41" text-anchor="middle">${m === 0 ? "mark" : m > 0 ? "+" + m : "−" + -m}</text>`);
  }
  const band = [gaugeX(-M.DRIVE.tolerance), gaugeX(M.DRIVE.tolerance)];
  const buffer = [gaugeX(M.DRIVE.buffer), gaugeX(RULER.to)];
  const gauge = `<svg class="dm-gauge" data-gauge viewBox="0 0 304 46" role="img" aria-label="Stopping gauge, in metres from the mark: the needle shows where the train will rest if the brake stays where it is; the band is where the gates open; the block at the right is the buffer stop.">`
    + `<rect class="dm-gauge-band" x="${band[0].toFixed(1)}" y="11" width="${(band[1] - band[0]).toFixed(1)}" height="13"/>`
    + `<rect class="dm-gauge-buffer" x="${buffer[0].toFixed(1)}" y="13" width="${(buffer[1] - buffer[0]).toFixed(1)}" height="11"/>`
    + `<path class="dm-gauge-rule" d="M${gaugeX(RULER.from).toFixed(1)} 24H${gaugeX(RULER.to).toFixed(1)}"/>`
    + `<path class="dm-gauge-tick" d="${ticks.join("")}"/><path class="dm-gauge-major" d="${majors.join("")}"/>${labels.join("")}`
    + `<circle class="dm-gauge-train" data-train-mark cx="${gaugeX(RULER.from)}" cy="24" r="3"/>`
    + `<g data-needle transform="translate(${gaugeX(RULER.to)} 0)"><path class="dm-gauge-stem" d="M0 9V24"/><path class="dm-gauge-head" d="M-4 2.5H4L0 9Z"/></g></svg>`;
  const driveUi = `<div class="dm-panel dm-drive" data-panel="drive" hidden><div class="dm-handle"><label class="dm-handle-label" for="dm-brake">Brake</label><input id="dm-brake" class="dm-brake" type="range" min="0" max="${M.DRIVE.notches}" step="1" value="0" data-brake aria-valuetext="Coast"><span class="dm-notches" aria-hidden="true">${notches}</span></div>${gauge}<p class="dm-note" data-note aria-live="polite"></p></div>`;
  const modes = `<div class="dm-mode" role="group" aria-label="Mode"><button type="button" data-mode="watch" aria-pressed="true">Watch</button><button type="button" data-mode="drive" aria-pressed="false">Drive</button></div>`;
  return `<div class="dm-controls">${modes}${watch}${driveUi}</div>`;
}
function stateAt0() {
  return M.stateAt(0).readout;
}

const hint = `<span class="dm-hint-fine">Hover to scrub the stop · ← → steps</span><span class="dm-hint-touch">Tap to step through the stop</span>`;
export const plate = figure.replace("HINT_SLOT", hint);
export const script = kitScript() + live;
export const stats = { scale: KS, trainParts: trainParts.length, clips: clips.size, svgBytes: svg.length };
export { k, css, DM_CSS, DM_TOKENS, DM_LIGHT };
export function pageFor(theme) {
  return k.pageHtml({ title: "Delhi Metro · Magenta Line terminus", theme, body: css + plate, script, width: 720 });
}
