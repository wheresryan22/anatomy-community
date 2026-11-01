import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../.skill/kit/iso-kit.mjs";
import * as G from "../../../../.skill/kit/lathe.mjs";
import { kitScript } from "../../../../.skill/scripts/inline-kit.mjs";
import { C, kinematics, makeParts, priming, jugPose } from "./parts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const WIDTH = 600;
const HEIGHT = 640;
const K = kinematics(C);
const Zp = K.Zp;

// ---------------------------------------------------------------- the model
const AREA_B = Math.PI * C.BORE * C.BORE; // mm² of the barrel bore
const PER_STROKE = (AREA_B * K.stroke) / 1000; // mL
const POOL = k.insetPlan(C.CIST, 2.5);
const AREA_C = POOL.w * POOL.d - Math.PI * C.PIPE_R * C.PIPE_R; // cistern free surface, mm²
const AREA_J = Math.PI * (C.JAR_IN * C.JAR_IN - C.BELL_R * C.BELL_R); // jar free surface, mm²
const TRIG = C.STAND_TOP - C.JAR_FLOOR; // jar depth at which the bell siphon starts, mm
const WL0 = C.WL0;
const MODEL = { AREA_B, AREA_C, AREA_J, TRIG, WL0, PER_STROKE, CDA: 0.62 * Math.PI * 2.4 * 2.4, G: 9810 };

const P = k.fitProjection(
  [
    ...k.boxCorners(C.BASE, -17, 0),
    [C.PIVOT_X, 0, Zp + 12],
    [-178, 0, Zp + 6],
    [-112, 0, Zp - 116],
    [C.JAR[0] + C.JAR_R, 0, C.JAR_TOP],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 60 },
);
const PARTS = makeParts(k, G, P, C);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const at = (p) => k.iso(p, P);
const cyl = PARTS.cyl;
const depth = (x, y, z = 0) => k.depthOf([x, y, z], P);
const byDepth = (points) => [...points].sort((a, b) => depth(a[0], a[1]) - depth(b[0], b[1]));
const UP = [0, 0, 1];

// ---------------------------------------------------------------- the bench
function base() {
  const B = C.BASE;
  const out = [`<path class="iso-halo" d="${k.haloOf(B, -17, 12, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(B, 22))) {
    out.push(S(k.cylinder(x, y, 7, -17, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -15.4, 3.4, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(B, -12, 12, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(B, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(B, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // ruler strip along the front edge
  const strip = { x: C.CIST.x, y: B.y + B.d - 13, w: 196, d: 6, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [1.8, 3.4], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3, 0.6]), at([strip.x + strip.w - 2, strip.y + 3, 0.6])], { size: 0.4 }));
  // label plate under the handle
  const label = { x: -40, y: 67, w: 62, d: 19, r: 1.4 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 3), { tone: "mid", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.8), 0.8, P, 3), { tone: "faint" }));
  out.push(L(k.lineOnTop([label.x + 6, label.y + 6], [label.x + 50, label.y + 6], 0.8, P), { tone: "lo", free: true }));
  out.push(L(k.lineOnTop([label.x + 6, label.y + 10], [label.x + 38, label.y + 10], 0.8, P), { tone: "lo", free: true }));
  out.push(L(k.lineOnTop([label.x + 6, label.y + 14], [label.x + 44, label.y + 14], 0.8, P), { tone: "lo", free: true }));
  out.push(D([at([label.x + 3, label.y + 3, 0.8]), at([label.x + label.w - 3, label.y + label.d - 3, 0.8])], { size: 0.45 }));
  return out.join("");
}

// ---------------------------------------------------------------- the cistern (the well)
const CORNER = (sx, sy) => ({ x: sx > 0 ? C.CIST.x + C.CIST.w - 6 : C.CIST.x, y: sy > 0 ? C.CIST.y + C.CIST.d - 6 : C.CIST.y, w: 6, d: 6, r: 0.8 });
const post = (sx, sy) => S(k.slabOf(CORNER(sx, sy), C.TRAY, C.TANK_TOP - C.TRAY, P, 2, 0.4), { tone: "mid" });

function tankBack() {
  const T = C.CIST;
  const out = [`<path class="iso-halo" d="${k.haloOf(T, 0, 6, P)}" style="opacity:.55"/>`];
  out.push(S(k.slabOf(T, 0, C.TRAY, P, 3, 0.8), { tone: "lo", inner: L(k.sideSeam(T, 3, P, 3), { tone: "faint" }) }));
  out.push(post(-1, -1));
  out.push(`<path class="pm-glass" d="${k.slabOf(k.insetPlan(T, 0.6), C.TRAY, C.TANK_TOP - C.TRAY, P, 2).fill}"/>`);
  // the back seam of the panes, where the far glass meets the tray
  out.push(L(k.planOutline(k.insetPlan(T, 0.6), C.TRAY, P, 2), { tone: "faint" }));
  return out.join("");
}

// the foot of the pump: a brass strainer standing on the tray, its wall cut in three arches
function strainer() {
  const R = C.FOOT_R;
  const F = PARTS.vertical(0, 0);
  const out = [S(cyl(0, 0, R, C.TRAY, C.FOOT_TOP, 56, 0.4), { tone: "mid" })];
  const tv = Math.atan2(PARTS.TV[1], PARTS.TV[0]);
  for (const t of [tv - Math.PI / 3, tv + Math.PI / 3, tv + Math.PI]) {
    if (G.facingOf(F, t, P) < 0.2) continue;
    const pts = [];
    const half = 0.36;
    const z0 = C.TRAY, z1 = C.TRAY + 6.4, rise = 4.2;
    pts.push(G.pointOf(F, z0, R, t - half), G.pointOf(F, z0, R, t + half));
    for (let i = 0; i <= 14; i++) {
      const u = i / 14;
      const ang = t + half * Math.cos(Math.PI * u);
      pts.push(G.pointOf(F, z1 + rise * Math.sin(Math.PI * u), R, ang));
    }
    const d = k.pathOf(pts.map(at), true);
    out.push(`<path class="pm-void" d="${d}"/>` + L(d, { tone: "lo" }));
  }
  out.push(L(k.sideArc(0, 0, R, C.FOOT_TOP - 4, P, 32), { tone: "faint" }));
  // ferrule that grips the glass pipe
  out.push(S(cyl(0, 0, C.PIPE_R + 2, C.FOOT_TOP, C.FOOT_TOP + 4, 40, 0.3), { tone: "mid" }));
  out.push(D(G.dotsOf(F, C.FOOT_TOP + 2, C.PIPE_R + 2, 8, P, { fade: [0.04, 0.42] }), { size: 0.45 }));
  return out.join("");
}

// drain from the jar, under the lid
function drainPipe() {
  const [x, y] = C.BELL;
  return S(cyl(x, y, 2.6, C.DRAIN_OUT + 3, C.TANK_TOP, 24), { tone: "mid", crease: "none" }) + S(cyl(x, y, 3.6, C.DRAIN_OUT, C.DRAIN_OUT + 3, 24), { tone: "mid" });
}

function gauge() {
  // a depth scale on the inside of the front pane: ticks every 5 mm from the strip's left edge
  const y = C.CIST.y + C.CIST.d - 1.6;
  const x0 = -78, x1 = -70;
  const out = [S(k.slabOf({ x: x0, y, w: x1 - x0, d: 1, r: 0 }, C.TRAY, C.TANK_TOP - C.TRAY, P, 1), { tone: "lo", crease: "none" })];
  let minor = "", major = "";
  for (let z = C.TRAY + 5; z < C.TANK_TOP - 2; z += 5) {
    const big = (z - C.TRAY) % 25 === 0;
    const seg = k.segment([x0, y + 1, z], [x0 + (big ? 5 : 2.8), y + 1, z], P);
    if (big) major += seg; else minor += seg;
  }
  out.push(L(minor, { tone: "lo" }), L(major, { tone: "mid" }));
  return out.join("");
}

function glints() {
  const x = C.CIST.x + C.CIST.w;
  const y = C.CIST.y + C.CIST.d;
  const right = k.segment([x, -44, C.TRAY], [x, -20, C.TANK_TOP], P) + k.segment([x, -36, C.TRAY], [x, -26, C.TANK_TOP], P);
  const front = k.segment([28, y, C.TRAY], [58, y, C.TANK_TOP], P);
  return L(right + front, { tone: "faint", className: "pm-shine" });
}

function lid() {
  const plan = k.insetPlan(C.CIST, -2);
  const out = [S(k.slabOf(plan, C.TANK_TOP, C.GROUND - C.TANK_TOP, P, 3, 1.2), { tone: "mid", inner: L(k.sideSeam(plan, C.TANK_TOP + 4, P, 3), { tone: "faint" }) })];
  out.push(L(k.planOutline(k.insetPlan(plan, 5), C.GROUND, P, 3), { tone: "faint" }));
  const screws = k.corners(plan, 9);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2, C.GROUND, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, C.GROUND])), { size: 0.5 }));
  // filler plug for topping up the well
  const [fx, fy] = [-66, 36];
  out.push(S(k.cylinder(fx, fy, 7, C.GROUND, 1.2, P, 32), { tone: "lo" }));
  out.push(S(k.cylinder(fx, fy, 5.4, C.GROUND + 1.2, 3.4, P, 32), { tone: "mid" }));
  out.push(L(k.knurl(fx, fy, 5.4, C.GROUND + 1.2, C.GROUND + 4.6, 28, P), { tone: "lo" }));
  out.push(L(k.lineOnTop([fx - 3.4, fy], [fx + 3.4, fy], C.GROUND + 4.6, P), { tone: "lo" }));
  out.push(L(k.ring(fx, fy, 3.4, C.GROUND + 4.6, P, 24), { tone: "faint" }));
  return out.join("");
}

// ---------------------------------------------------------------- the standard that carries the sweep
const POSTP = { x: C.POST[0] - C.POST_W / 2, y: -C.POST_W / 2, w: C.POST_W, d: C.POST_W, r: 1.2 };
const YOKE = Zp - 14;
function standard() {
  const out = [];
  const foot = { x: C.POST[0] - 13, y: -13, w: 26, d: 26, r: 2 };
  out.push(S(k.slabOf(foot, C.GROUND, 3, P, 3, 0.5), { tone: "mid" }));
  const fs = k.corners(foot, 4);
  out.push(L(fs.map(([x, y]) => k.ring(x, y, 1.6, C.GROUND + 3, P, 14)).join(""), { tone: "lo" }));
  out.push(D(fs.map(([x, y]) => at([x, y, C.GROUND + 3])), { size: 0.45 }));
  const grain = k.segment([POSTP.x + 4, POSTP.y + POSTP.d, C.GROUND + 3], [POSTP.x + 4, POSTP.y + POSTP.d, YOKE], P) + k.segment([POSTP.x + POSTP.w, POSTP.y + 7, C.GROUND + 3], [POSTP.x + POSTP.w, POSTP.y + 7, YOKE], P);
  out.push(S(k.slabOf(POSTP, C.GROUND + 3, YOKE - C.GROUND - 3, P, 2, 0.5), { tone: "mid", inner: L(grain, { tone: "faint" }) }));
  out.push(S(k.slabOf({ x: C.POST[0] - 9, y: -9.6, w: 18, d: 19.2, r: 1.5 }, YOKE, 5, P, 3, 0.5), { tone: "mid" }));
  out.push(D([at([C.POST[0] - 6, -6.6, YOKE + 5]), at([C.POST[0] + 6, -6.6, YOKE + 5])], { size: 0.45 }));
  out.push(cheek(-9.6));
  out.push(S(G.disc(-10.6, -9.6, 3.2, G.frameOf([C.PIVOT_X, 0, Zp], [0, 1, 0], [1, 0, 0], [0, 0, 1]), P), { tone: "mid" }));
  // steady bar from the post to a lug on the pump head
  const bar = { x: POSTP.x + POSTP.w, y: -2.6, w: -18.1 - (POSTP.x + POSTP.w), d: 5.2, r: 0.6 };
  out.push(S(k.slabOf(bar, 289, 5, P, 2, 0.4), { tone: "mid" }));
  out.push(D([at([bar.x + 2.6, 0, 294]), at([bar.x + bar.w - 3, 0, 294])], { size: 0.45 }));
  return out.join("");
}
const cheek = (y) => S(k.slabOf({ x: C.POST[0] - 8, y, w: 16, d: 2, r: 0.5 }, YOKE + 5, Zp + 9 - YOKE - 5, P, 2, 0.3), { tone: "mid" });
function frontCheek() {
  return cheek(7.6) + S(G.disc(9.6, 10.8, 3.2, G.frameOf([C.PIVOT_X, 0, Zp], [0, 1, 0], [1, 0, 0], [0, 0, 1]), P), { tone: "mid" }) + D([at([C.PIVOT_X, 10.8, Zp])], { size: 0.6, tone: "hi" });
}

// ---------------------------------------------------------------- the pump tree above the ground
function tree() {
  const out = [];
  const F = PARTS.vertical(0, 0);
  // gland on the lid
  out.push(S(cyl(0, 0, 14, C.GROUND, C.GROUND + 2, 48), { tone: "lo" }));
  out.push(S(cyl(0, 0, 11.5, C.GROUND + 2, C.GLAND_TOP, 40, 0.3), { tone: "mid" }));
  out.push(D(G.dotsOf(F, C.GROUND + 2, 12.8, 6, P, { all: true, phase: 0.5 }), { size: 0.45 }));
  // glass pipe up to the coupling, full of water
  const [c0, c1, c2] = C.COUPLING;
  return out.join("");
}
function coupling() {
  const out = [];
  const F = PARTS.vertical(0, 0);
  const [c0, c1, c2] = C.COUPLING;
  // coupling: neck, flange with bolts, gasket under the barrel
  out.push(S(cyl(0, 0, 11.5, c0, c1, 40, 0.3), { tone: "mid" }));
  out.push(S(cyl(0, 0, 19.5, c1, c2, 64, 0.5), { tone: "mid", inner: L(k.sideArc(0, 0, 19.5, c1 + 2.2, P, 40), { tone: "faint" }) }));
  out.push(D(G.dotsOf(F, c2, 18, 8, P, { all: true, phase: 0.2 }), { size: 0.5 }));
  out.push(L(k.ring(0, 0, C.BARREL_R + 0.8, c2, P, 64), { tone: "lo" }));
  return out.join("");
}

function head() {
  const F = PARTS.vertical(0, 0);
  const z0 = C.BARREL_TOP;
  const prof = [[z0, 19.6], [z0 + 3, 19.6], [z0 + 3, 18.2], [z0 + 18, 18.2], [z0 + 18, 19.8], [C.HEAD_TOP, 19.8]];
  const out = [S(G.solidOf(prof, F, P), { tone: "mid" })];
  out.push(`<path class="pm-inside" d="${cyl(0, 0, 15, C.HEAD_TOP - 0.01, C.HEAD_TOP, 48).top}"/>`);
  out.push(L(k.ring(0, 0, 15, C.HEAD_TOP, P, 48), { tone: "lo" }));
  out.push(D(G.dotsOf(F, C.HEAD_TOP, 17.4, 8, P, { all: true, phase: 0.4 }), { size: 0.45 }));
  // guide bridge across the mouth, with a boss for the rod
  out.push(S(k.slabOf({ x: -3.6, y: -19, w: 7.2, d: 38, r: 1 }, C.HEAD_TOP, 3, P, 2, 0.4), { tone: "mid" }));
  out.push(S(cyl(0, 0, 5.2, C.HEAD_TOP, C.GUIDE_TOP, 32, 0.3), { tone: "mid" }));
  out.push(L(k.ring(0, 0, 3, C.GUIDE_TOP, P, 24), { tone: "lo" }));
  return out.join("");
}

function spout() {
  const out = [];
  const start = [Math.sqrt(18.2 * 18.2 - C.SPOUT_R * C.SPOUT_R), 0, C.SPOUT_Z];
  const E = C.ELBOW;
  const d = G.unit3(G.sub3(E, start));
  const len = G.len3(G.sub3(E, start)) - Math.sqrt(C.ELBOW_R ** 2 - C.SPOUT_R ** 2);
  const F = G.frameAlong(start, d);
  out.push(S(G.solidOf([[0, C.SPOUT_R + 1.4], [3, C.SPOUT_R + 1.4], [3, C.SPOUT_R], [len, C.SPOUT_R]], F, P), { tone: "mid", inner: L(G.arcOf(F, len - 6, C.SPOUT_R, P), { tone: "faint" }) }));
  const down = [0, 0, -1];
  const nozzleFrom = [E[0], E[1], E[2] - Math.sqrt(C.ELBOW_R ** 2 - C.SPOUT_R ** 2)];
  const NF = G.frameAlong(nozzleFrom, down);
  const nl = nozzleFrom[2] - C.NOZZLE_END;
  out.push(S(G.solidOf([[0, C.SPOUT_R], [nl - 4, C.SPOUT_R], [nl - 4, C.SPOUT_R + 1.1], [nl, C.SPOUT_R + 1.1]], NF, P), { tone: "mid" }));
  out.push(S(G.sphereOf(E, C.ELBOW_R, P), { tone: "mid" }));
  return out.join("");
}

// ---------------------------------------------------------------- the jar
function jarBack() {
  const [x, y] = C.JAR;
  return S(cyl(x, y, C.JAR_R + 3, C.GROUND, C.JAR_FOOT, 56, 0.4), { tone: "lo" }) + PARTS.glassBack(x, y, C.JAR_R, C.JAR_FOOT, C.JAR_TOP) + `<path class="pm-glass" d="${cyl(x, y, C.JAR_IN, C.JAR_FOOT, C.JAR_FLOOR, 48).fill}"/>` + L(k.ring(x, y, C.JAR_IN, C.JAR_FLOOR, P, 48), { tone: "faint" });
}
function jarFront() {
  const [x, y] = C.JAR;
  const out = [PARTS.glassFront(x, y, C.JAR_R, C.JAR_FOOT, C.JAR_TOP)];
  out.push(L(k.ring(x, y, C.JAR_R, C.JAR_TOP, P, 56) + k.ring(x, y, C.JAR_IN, C.JAR_TOP, P, 56), { tone: "mid" }));
  // graduations every 10 mL on a printed spine
  const F = PARTS.vertical(x, y);
  const spineAt = Math.atan2(PARTS.TV[1], PARTS.TV[0]) + 0.62;
  const zOf = (ml) => C.JAR_FLOOR + (ml * 1000) / MODEL.AREA_J;
  const sp = G.pointOf(F, zOf(5), C.JAR_R, spineAt);
  const top = zOf(70);
  let minor = "", major = "";
  for (let ml = 5; ml <= 70; ml += 5) {
    const big = ml % 10 === 0;
    const span = big ? 0.27 : 0.15;
    const pts = [];
    for (let i = 0; i <= 8; i++) pts.push(at(G.pointOf(F, zOf(ml), C.JAR_R, spineAt - (span * i) / 8)));
    const seg = k.pathOf(pts);
    if (big) major += seg; else minor += seg;
  }
  out.push(L(k.segment([sp[0], sp[1], zOf(5)], [sp[0], sp[1], top], P), { tone: "mid" }));
  out.push(L(minor, { tone: "lo" }), L(major, { tone: "mid" }));
  return out.join("");
}

// ---------------------------------------------------------------- initial state and assembly
const TH0 = K.lo; // handle up, bucket at the foot of its stroke, waiting to be primed
const ZB0 = K.crossOf(TH0).C[2] - K.rod;
const PR = priming(C, ZB0);
const STATE0 = { theta: TH0, zb: ZB0, surface: ZB0 + C.BUCKET_H, clack: 0, succur: 0, wl: WL0, level: 0, siphon: 0, spout: 0, drain: 0, prime: WL0, poured: 0, jugVol: PR.v0, primed: false };
const dyn = (name, html) => `<g data-dyn="${name}">${html}</g>`;

const body = [
  base(),
  tankBack(),
  strainer(),
  dyn("lowerPipe", PARTS.lowerPipe(0, WL0)),
  dyn("cistern", PARTS.cistern(WL0)),
  dyn("upperPipe", PARTS.upperPipe(WL0, WL0)),
  drainPipe(),
  dyn("drain", ""),
  gauge(),
  glints(),
  post(1, -1),
  post(-1, 1),
  post(1, 1),
  lid(),
  dyn("jugBack", ""),
  standard(),
  tree(),
  dyn("pipeAbove", PARTS.pipeAbove(WL0)),
  coupling(),
  dyn("barrel", PARTS.barrel({ ...STATE0, level: WL0 })),
  head(),
  dyn("pour", ""),
  jarBack(),
  dyn("jar", PARTS.jar(0, 0)),
  dyn("stream", ""),
  spout(),
  jarFront(),
  dyn("lever", PARTS.lever(TH0)),
  frontCheek(),
  dyn("jugFront", PARTS.jug([...C.JUG_HOME, 0], 0, PR.v0)),
];

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A bench model of the lift pump described in John Bate's 1634 text. A glass cistern stands for the well and its lid for the ground. A glass suction pipe rises from a brass strainer with arched openings, through a flap valve (the lower succur), up through the lid to a second flap valve (the upper succur), above which a leather-packed bucket with its own flap valve (the clack) slides in a glass barrel. A pivoted sweep drives the bucket through a link and rod. At the start a brass jug primes the pump, pouring water into the head until the pipe is full up to the bucket. Water lifted above the bucket spills from a spout into a graduated jar, which siphons back into the cistern.",
  body,
});

const CSS = `
.iso{--pm-glass:rgba(150,180,200,.05);--pm-water:rgba(120,160,190,.17);--pm-water-top:rgba(150,190,215,.12);--pm-void:#060606;--pm-inside:#0b0b0b;--pm-stream:rgba(160,195,220,.62)}
.iso[data-theme="light"]{--pm-glass:rgba(160,185,200,.10);--pm-water:rgba(80,120,150,.16);--pm-water-top:rgba(80,120,150,.10);--pm-void:#bdbdb8;--pm-inside:#d9d9d5;--pm-stream:rgba(70,110,140,.55)}
.pm-glass{fill:var(--pm-glass);stroke:none}
.pm-water{fill:var(--pm-water);stroke:none}
.pm-water-top{fill:var(--pm-water-top);stroke:none}
.pm-void{fill:var(--pm-void);stroke:none}
.pm-inside{fill:var(--pm-inside);stroke:none}
.pm-stream{fill:none;stroke:var(--pm-stream);stroke-linecap:round}
.pm-swirl{fill:none;stroke:var(--anatomy-mid);stroke-width:var(--anatomy-weight);stroke-dasharray:1.4 2.2}
.pm-shine{opacity:.55}
.iso-stage{touch-action:pan-y;cursor:ns-resize}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
`;

const latheSource = readFileSync(fileURLToPath(new URL("../../../../.skill/kit/lathe.mjs", import.meta.url)), "utf8").replace(/^import .*$/m, "").replace(/^export /gm, "");
const latheScript = `const G = (() => {${latheSource}\nreturn { viewOf, scaleOf, frameAlong, frameOf, pointOf, disc, sphereOf, prismOf, solidOf, circleOf, arcOf, dotsOf, facingOf, hullOf, stadium, dot3, add3, sub3, mul3, unit3, cross3, len3, lightOf, toneOf, radialOf };})();\n`;
const partsScript = readFileSync(join(HERE, "parts.mjs"), "utf8").replace(/^export /gm, "");
const kitNames = "haloOf, cameraOf, iso, depthOf, pathOf, cylinder, slabOf, insetPlan, planOutline, sideSeam, sideArc, ring, segment, lineOnTop, solidSvg, lineSvg, dotsSvg, knurl";
const DATA = { P, C, MODEL, STATE0, PR, K: { lo: K.lo, hi: K.hi, rod: K.rod, stroke: K.stroke } };
const live = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA)).replace("__KIT__", `const k = { ${kitNames} };`);

const plate = k.plateHtml({
  fig: "Fig 1",
  title: "Bate's pump, 1634",
  hint: "Move up and down to work the sweep",
  readout: `dry · fetching priming water`,
  keys: [
    { mark: "raised", label: "Priming jug: fills the pipe from the well's level up to the bucket before the first stroke" },
    { mark: "lit", label: "The bucket: a leathered cup on the rod, with its own flap valve, the clack, in its floor" },
    { mark: "raised", label: "The two succurs: flap valves at the foot of the pipe and two feet above the ground" },
    { mark: "edge", label: "Glass cistern: the well. Its lid is the ground" },
  ],
  caption: `First the jug pours ${(PR.need / 1000).toFixed(1)} mL into the head. Dry leather leaks, so the water runs down past the bucket and fills the pipe from the cistern's level up to the bucket, as Bate says: "filled the distance betweene the lower succur, and the bucket". Wet leather seals, and the pump can now draw. Lift the sweep and the bucket is thrust down; the water under it pushes the clack open and passes up into the bucket. Pull the sweep down and the clack shuts, so the bucket carries that water up and out of the spout, while both succurs open and the pipe refills from the well behind it. Each stroke here moves the bucket ${K.stroke.toFixed(1)} mm in a ${(C.BORE * 2).toFixed(0)} mm bore, so it delivers ${PER_STROKE.toFixed(1)} mL, which is the same volume that comes into the pump below. The bell siphon in the jar is a modern addition that returns the water to the cistern, so the model can keep pumping.`,
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Lift pump: arrow up lifts the sweep, arrow down pulls it down, space makes one full stroke" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="At rest, all valves shut">${svg}</div><span class="pm-live" aria-live="polite" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)"></span>`,
});

const name = theme === "light" ? "pump-light.html" : "pump.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "Bate's pump", theme, body: `<style>${CSS}</style>${plate}`, script: kitScript() + latheScript + partsScript + live }));
console.log("wrote", name, { Zp: Zp.toFixed(1), stroke: K.stroke.toFixed(2), rod: K.rod.toFixed(1), perStroke: PER_STROKE.toFixed(2), zbBottom: (K.crossOf(K.lo).C[2] - K.rod).toFixed(1), trig: TRIG, scale: P.scale.toFixed(3) });
