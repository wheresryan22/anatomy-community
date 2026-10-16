import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../.skill/kit/iso-kit.mjs";
import * as G from "../../../../.skill/kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../../../../.skill/kit/tube.mjs";
import * as A from "../../../../.skill/kit/audit.mjs";
import { kitScript } from "../../../../.skill/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";
const W = 640;
const H = 430;
const DEG = Math.PI / 180;

const PLATE = { x: -136, y: -62, w: 272, d: 124, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;

const PRESS_Y = -4;
const PRESS_Z = 22;
const MAN_X = -8;
const MAN_Y = 0;
const COL = [48, 12];
const GAUGE = [96, -26];
const GAUGE_R = 23;
const GAUGE_Z = 56;
const GAUGE_H = 10;
const GAUGE_TOP = GAUGE_Z + GAUGE_H;
const MAX_BAR = 120;
const LIFT_MAX = 9;
const RAM_STROKE = 8;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [-132, PRESS_Y, PRESS_Z + 16],
    [COL[0], COL[1], 106],
    [GAUGE[0] + GAUGE_R, GAUGE[1], GAUGE_TOP + 2],
  ],
  W,
  H,
  { pad: 26, azimuth: 44, elevation: 31 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, { tone: "mid", ...style });
const L = (d, style) => k.lineSvg(d, style);
const Dt = (pts, style) => k.dotsSvg(pts.map(at), { size: 0.45, ...style });
const R = A.recorder(P, {});

const up = (x, y, z = 0) => G.frameOf([x, y, z], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function put(name, ref, svg, shapes, extra = {}) {
  return R.put({
    name: R.nameFor(name),
    at: ref,
    svg,
    shapes: shapes.map((s) => R.solid(Object.assign(s, { name: s.name ?? name }))),
    ...extra,
  });
}

function slab(name, plan, z0, h, style = {}, o = {}) {
  const steps = o.steps ?? 4;
  const bevel = o.bevel ?? 0.5;
  const svg = S(k.slabOf(plan, z0, h, P, steps, bevel), { ...style, inner: o.inner ?? "" }) + (o.extra ?? "");
  const shape = A.slab(plan, z0, h, { name, ...o.meta }, steps);
  put(name, [plan.x + plan.w / 2, plan.y + plan.d / 2, z0 + h / 2], svg, [shape], o);
  return shape;
}

function turned(name, F, profile, style = {}, o = {}) {
  const mid = (profile[0][0] + profile[profile.length - 1][0]) / 2;
  const shape = A.solid(F, profile, { name, ...o.meta });
  const svg = S(G.solidOf(profile, F, P, o.lathe ?? {}), { ...style, inner: o.inner ?? "" }) + (o.extra ?? "");
  put(name, G.add3(F.o, G.mul3(F.a, mid)), svg, [shape], o);
  return shape;
}

function cyl(name, x, y, r, z0, z1, style = {}, o = {}) {
  return turned(name, up(x, y, 0), [[z0, r], [z1, r]], style, o);
}

const back = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
for (const [x, y] of byDepth(k.corners(PLATE, 20))) {
  back.push(S(k.cylinder(x, y, 7.2, -PLATE_H - FOOT_H, 1.8, P, 28), { tone: "lo" }));
  back.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.8, FOOT_H - 1.8, P, 28), { tone: "mid" }));
}
R.solid(A.slab(PLATE, -PLATE_H, PLATE_H, { name: "stand.plate" }, 8));
const plateScrews = k.corners(PLATE, 10);
back.push(
  S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "lo" }),
  L(k.planOutline(k.insetPlan(PLATE, 5), 0, P, 8), { tone: "faint" }),
  L(plateScrews.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }),
  Dt(plateScrews.map(([x, y]) => [x, y, 0]), { size: 0.5 }),
);

const STRIP = { x: -116, y: 44, w: 96, d: 8, r: 1.2 };
const ticks = k.topTicks(STRIP.x + 6, STRIP.x + STRIP.w - 6, 4, 4, STRIP.y + 0.8, 0.8, [2.2, 4.0], P);
slab(
  "stand.ruler",
  STRIP,
  0,
  0.8,
  { tone: "lo", crease: "none" },
  {
    steps: 3,
    bevel: 0,
    extra:
      L(ticks.minor, { tone: "lo" }) +
      L(ticks.major, { tone: "mid" }) +
      Dt(
        [
          [STRIP.x + 2.5, STRIP.y + 4, 0.8],
          [STRIP.x + STRIP.w - 2.5, STRIP.y + 4, 0.8],
        ],
        { size: 0.45 },
      ),
  },
);

const LABEL = { x: 22, y: 44, w: 88, d: 10, r: 1.4 };
slab(
  "stand.label",
  LABEL,
  0,
  0.8,
  { tone: "lo", crease: "none" },
  {
    steps: 3,
    bevel: 0,
    extra:
      L(k.planOutline(k.insetPlan(LABEL, 1.5), 0.8, P, 3), { tone: "faint" }) +
      L(
        [58, 42, 50]
          .map((w, i) => k.lineOnTop([LABEL.x + 5, LABEL.y + 2.8 + i * 2.2], [LABEL.x + 5 + w, LABEL.y + 2.8 + i * 2.2], 0.8, P))
          .join(""),
        { tone: "lo", free: true },
      ) +
      Dt(
        [
          [LABEL.x + LABEL.w - 3.5, LABEL.y + 3, 0.8],
          [LABEL.x + LABEL.w - 3.5, LABEL.y + LABEL.d - 3, 0.8],
        ],
        { size: 0.42 },
      ),
  },
);

const PRESS_BASE = { x: -108, y: PRESS_Y - 18, w: 58, d: 36, r: 3 };
const pbScrews = k.corners(PRESS_BASE, 4.5);
slab(
  "press.base",
  PRESS_BASE,
  0,
  6,
  { tone: "lo" },
  {
    steps: 4,
    bevel: 0.6,
    inner: L(k.planOutline(k.insetPlan(PRESS_BASE, 2.4), 6, P, 4), { tone: "faint" }),
    extra: Dt(pbScrews.map(([x, y]) => [x, y, 6]), { size: 0.45 }),
  },
);
slab("press.cradle.rear", { x: -98, y: PRESS_Y - 10, w: 10, d: 20, r: 1.2 }, 6, 7, { tone: "mid" }, { steps: 3, bevel: 0.4 });
slab("press.cradle.front", { x: -72, y: PRESS_Y - 10, w: 10, d: 20, r: 1.2 }, 6, 7, { tone: "mid" }, { steps: 3, bevel: 0.4 });

const PF = G.frameOf([0, PRESS_Y, PRESS_Z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
turned(
  "press.flange.rear",
  PF,
  [
    [-102, 11],
    [-98, 11],
  ],
  { tone: "mid" },
  { extra: k.dotsSvg(G.dotsOf(PF, -102, 9.2, 8, P, { fade: [0.04, 0.42] }), { size: 0.42 }) },
);
const pressBarrel = turned(
  "press.barrel",
  PF,
  [
    [-98, 9],
    [-62, 9],
  ],
  { tone: "hi", crease: "lo" },
  {
    inner: k.fadedSvg(G.ribsOf(PF, -94, -66, 9, 24, P, { fade: [0.1, 0.55], seams: true }), { tone: "lo" }),
  },
);
turned(
  "press.flange.front",
  PF,
  [
    [-62, 11],
    [-58, 11],
  ],
  { tone: "mid" },
  { extra: k.dotsSvg(G.dotsOf(PF, -58, 9.2, 8, P, { fade: [0.04, 0.42] }), { size: 0.42 }) },
);
turned(
  "press.outlet",
  PF,
  [
    [-58, 4.2],
    [-48, 4.2],
  ],
  { tone: "mid" },
  { inner: L(G.circleOf(PF, -48, 2.2, P, 20), { tone: "faint" }) },
);
turned(
  "press.gland",
  PF,
  [
    [-107, 5.6],
    [-102, 5.6],
  ],
  { tone: "mid" },
  {
    inner: k.fadedSvg(G.ribsOf(PF, -106.3, -102.7, 5.6, 18, P, { fade: [0.1, 0.55], seams: true }), { tone: "lo" }) +
      L(G.circleOf(PF, -107, 3.3, P, 24), { tone: "faint" }),
  },
);

const PF_OUT = G.frameOf([-107, PRESS_Y, PRESS_Z], [-1, 0, 0], [0, 1, 0], [0, 0, 1]);
const ramRod = G.rodOut(PF_OUT, 0, 14, 2.9, P, { stroke: RAM_STROKE });
put(
  "press.spindle",
  [-114, PRESS_Y, PRESS_Z],
  `<g data-part="ram"><clipPath id="dw-ram-clip"><path data-hold d="${ramRod.clip}"/></clipPath><g clip-path="url(#dw-ram-clip)">${S(ramRod.paths, { tone: "hi", crease: "lo" })}</g></g>`,
  [A.slide(PF_OUT, 0, 14, 2.9, { name: "press.spindle" })],
  { hit: "wheel" },
);
const wheelSvg =
  S(G.solidOf([[-128.2, 3.2], [-125.4, 3.2]], PF, P), { tone: "mid" }) +
  S(G.solidOf([[-125.4, 13.5], [-122.8, 13.5]], PF, P), {
    tone: "hi",
    crease: "lo",
    inner: k.fadedSvg(G.ribsOf(PF, -125.4, -122.8, 13.5, 36, P, { fade: [0.1, 0.55], seams: true }), { tone: "lo" }),
  }) +
  L(G.circleOf(PF, -122.8, 10.6, P, 48), { tone: "lo" }) +
  S(G.solidOf([[-122.8, 5.2], [-121, 5.2]], PF, P), { tone: "mid" }) +
  Dt([G.pointOf(PF, -121, 0, 0)], { size: 0.5, tone: "hi" });
put(
  "press.wheel",
  [-124, PRESS_Y, PRESS_Z],
  `<g data-part="ram">${wheelSvg}</g>`,
  [
    A.solid(PF, [[-128.2, 3.2], [-125.4, 3.2]], { name: "press.wheel.cap" }),
    A.solid(PF, [[-125.4, 13.5], [-122.8, 13.5]], { name: "press.wheel.rim" }),
    A.solid(PF, [[-122.8, 5.2], [-121, 5.2]], { name: "press.wheel.hub" }),
  ],
  { hit: "wheel" },
);

const HANDLE_F = G.frameOf([-125.4, PRESS_Y + 9.2, PRESS_Z], [-1, 0, 0], [0, 1, 0], [0, 0, 1]);
put(
  "press.handle",
  [-129, PRESS_Y + 9.2, PRESS_Z],
  `<g data-part="ram">${S(G.solidOf([[0, 1.8], [6.5, 1.8]], HANDLE_F, P), { tone: "hi" })}${Dt([G.pointOf(HANDLE_F, 6.5, 0, 0)], { size: 0.45 })}</g>`,
  [A.solid(HANDLE_F, [[0, 1.8], [6.5, 1.8]], { name: "press.handle" })],
  { hit: "wheel" },
);

const MAN_BASE = { x: MAN_X - 18, y: MAN_Y - 20, w: 36, d: 40, r: 2.5 };
slab("manifold.base", MAN_BASE, 0, 4, { tone: "lo" }, { steps: 4, bevel: 0.5 });
const MAN_BODY = { x: MAN_X - 16, y: MAN_Y - 18, w: 32, d: 36, r: 2 };
const manScrews = k.corners(MAN_BODY, 3.5);
const manBodyShape = slab(
  "manifold.body",
  MAN_BODY,
  4,
  24,
  { tone: "mid" },
  {
    steps: 4,
    bevel: 0.8,
    inner: L(k.sideSeam(MAN_BODY, 16, P, 4), { tone: "faint" }),
    extra:
      L(k.planOutline(k.insetPlan(MAN_BODY, 2.2), 28, P, 4), { tone: "faint" }) +
      Dt(manScrews.map(([x, y]) => [x, y, 28]), { size: 0.45 }),
  },
);

const MF_LEFT = G.frameOf([MAN_BODY.x, PRESS_Y, PRESS_Z], [-1, 0, 0], [0, 1, 0], [0, 0, 1]);
turned("manifold.port.in", MF_LEFT, [[0, 4.2], [4, 4.2]], { tone: "mid" });

const MF_FRONT = G.frameOf([MAN_X, MAN_BODY.y + MAN_BODY.d, 16], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
turned("manifold.valve.bonnet", MF_FRONT, [[0, 4.0], [4.5, 4.0]], { tone: "mid" });
turned("manifold.valve.stem", MF_FRONT, [[4.5, 1.8], [7.5, 1.8]], { tone: "mid" });
turned(
  "manifold.valve.knob",
  MF_FRONT,
  [[7.5, 5.8], [10.8, 5.8]],
  { tone: "hi", crease: "lo" },
  {
    inner: k.fadedSvg(G.ribsOf(MF_FRONT, 7.5, 10.8, 5.8, 22, P, { fade: [0.1, 0.55], seams: true }), { tone: "lo" }),
    extra: Dt([G.pointOf(MF_FRONT, 10.8, 0, 0)], { size: 0.45 }),
  },
);

const RF = up(MAN_X, MAN_Y, 0);
turned(
  "reservoir.base",
  RF,
  [[28, 10.2], [31, 10.2]],
  { tone: "mid" },
  { extra: k.dotsSvg(G.dotsOf(RF, 31, 8.6, 8, P, { all: true }), { size: 0.4 }) },
);
turned(
  "reservoir.glass",
  RF,
  [[31, 8.6], [50, 8.6]],
  { tone: "hi", crease: "lo" },
  {
    inner: L([36, 41, 46].map((z) => G.arcOf(RF, z, 8.6, P)).join(""), { tone: "faint" }),
  },
);
turned(
  "reservoir.cap",
  RF,
  [[50, 9.8], [53.5, 9.8]],
  { tone: "mid" },
  {
    inner: k.fadedSvg(G.ribsOf(RF, 50, 53.5, 9.8, 28, P, { fade: [0.1, 0.55], seams: true }), { tone: "lo" }),
  },
);
turned(
  "reservoir.breather",
  RF,
  [[53.5, 3.8], [57, 3.8]],
  { tone: "hi" },
  { extra: Dt([[MAN_X, MAN_Y, 57]], { size: 0.45 }) },
);

const COL_BASE = { x: COL[0] - 22, y: COL[1] - 22, w: 44, d: 44, r: 4 };
const cbScrews = k.corners(COL_BASE, 4.5);
slab(
  "column.base",
  COL_BASE,
  0,
  6,
  { tone: "lo" },
  {
    steps: 4,
    bevel: 0.7,
    inner: L(k.planOutline(k.insetPlan(COL_BASE, 2.5), 6, P, 4), { tone: "faint" }),
    extra: Dt(cbScrews.map(([x, y]) => [x, y, 6]), { size: 0.45 }),
  },
);
cyl(
  "column.level",
  COL_BASE.x + COL_BASE.w - 8,
  COL_BASE.y + COL_BASE.d - 8,
  3.4,
  6,
  8.2,
  { tone: "hi" },
  {
    inner: L(k.ring(COL_BASE.x + COL_BASE.w - 8, COL_BASE.y + COL_BASE.d - 8, 2.1, 8.2, P, 20), { tone: "lo" }),
    extra: Dt([[COL_BASE.x + COL_BASE.w - 8, COL_BASE.y + COL_BASE.d - 8, 8.2]], { size: 0.5, tone: "hi" }),
  },
);

const CF = up(COL[0], COL[1], 0);
turned(
  "column.flange",
  CF,
  [[6, 15.5], [10, 15.5]],
  { tone: "mid" },
  { extra: k.dotsSvg(G.dotsOf(CF, 10, 13.4, 8, P, { all: true }), { size: 0.42 }) },
);
const colLower = turned(
  "column.lower",
  CF,
  [[10, 11.2], [28, 11.2]],
  { tone: "hi", crease: "lo" },
  { inner: L(G.arcOf(CF, 19, 11.2, P), { tone: "faint" }) },
);
turned("column.band", CF, [[28, 12.8], [32, 12.8]], { tone: "mid" });
turned(
  "column.upper",
  CF,
  [[32, 11.2], [48, 11.2]],
  { tone: "hi", crease: "lo" },
  { inner: L(G.arcOf(CF, 40, 11.2, P), { tone: "faint" }) },
);
turned(
  "column.datum",
  CF,
  [[48, 13.6], [52, 13.6]],
  { tone: "mid" },
  {
    inner:
      k.fadedSvg(G.ribsOf(CF, 48.5, 51.5, 13.6, 32, P, { fade: [0.1, 0.55], seams: true }), { tone: "lo" }) +
      L(k.ring(COL[0], COL[1], 4.6, 52, P, 28), { tone: "faint" }),
  },
);

const pistRod = G.rodOut(CF, 52, 64, 4.0, P, { stroke: LIFT_MAX });
put(
  "column.piston",
  [COL[0], COL[1], 58],
  `<g data-part="piston"><clipPath id="dw-pist-clip"><path data-hold d="${pistRod.clip}"/></clipPath><g clip-path="url(#dw-pist-clip)">${S(pistRod.paths, { tone: "hi", lit: true })}</g></g>`,
  [A.slide(CF, 52, 64, 4.0, { name: "column.piston" })],
  { hit: "weights" },
);

const carrierSvg =
  S(G.solidOf([[64, 19.5], [67.2, 19.5]], CF, P), { tone: "mid", inner: L(G.arcOf(CF, 65.6, 19.5, P), { tone: "faint" }) }) +
  k.dotsSvg(G.dotsOf(CF, 67.2, 17.8, 8, P, { all: true }), { size: 0.4 });
put(
  "weights.carrier",
  [COL[0], COL[1], 65.6],
  `<g data-part="carrier">${carrierSvg}</g>`,
  [A.solid(CF, [[64, 19.5], [67.2, 19.5]], { name: "weights.carrier" })],
  { hit: "weights" },
);

const WEIGHT_SPECS = [
  { z0: 67.2, z1: 72.8, r: 17.2, bar: 25 },
  { z0: 72.8, z1: 78.4, r: 16.2, bar: 25 },
  { z0: 78.4, z1: 84.0, r: 15.2, bar: 25 },
  { z0: 84.0, z1: 89.6, r: 14.2, bar: 25 },
];
WEIGHT_SPECS.forEach((w, i) => {
  const midZ = (w.z0 + w.z1) / 2;
  const svg =
    S(G.solidOf([[w.z0, w.r], [w.z1, w.r]], CF, P), {
      tone: "hi",
      crease: "lo",
      inner: L(G.arcOf(CF, midZ, w.r, P), { tone: "faint" }) + L(k.ring(COL[0], COL[1], w.r - 2.2, w.z1, P, 48), { tone: "faint" }),
    }) + k.dotsSvg(G.dotsOf(CF, w.z1, w.r - 1.1, 6, P, { all: true }), { size: 0.38 });
  put(
    `weights.disc.${i}`,
    [COL[0], COL[1], midZ],
    `<g data-part="weight-${i}">${svg}</g>`,
    [A.solid(CF, [[w.z0, w.r], [w.z1, w.r]], { name: `weights.disc.${i}` })],
    { hit: "weights" },
  );
});

const topSpindleSvg =
  S(G.solidOf([[89.6, 3.2], [95.5, 3.2]], CF, P), { tone: "mid" }) +
  S(G.solidOf([[95.5, 4.8], [98.5, 4.8]], CF, P), {
    tone: "hi",
    inner: k.fadedSvg(G.ribsOf(CF, 95.5, 98.5, 4.8, 18, P, { fade: [0.1, 0.55], seams: true }), { tone: "lo" }),
  }) +
  Dt([[COL[0], COL[1], 98.5]], { size: 0.48, tone: "hi" });
put(
  "weights.finial",
  [COL[0], COL[1], 94],
  `<g data-part="finial">${topSpindleSvg}</g>`,
  [
    A.solid(CF, [[89.6, 3.2], [95.5, 3.2]], { name: "weights.spindle" }),
    A.solid(CF, [[95.5, 4.8], [98.5, 4.8]], { name: "weights.finial" }),
  ],
  { hit: "weights" },
);

const GAUGE_BASE = { x: GAUGE[0] - 18, y: GAUGE[1] - 18, w: 36, d: 36, r: 3 };
const gbScrews = k.corners(GAUGE_BASE, 4);
slab(
  "gauge.base",
  GAUGE_BASE,
  0,
  6,
  { tone: "lo" },
  {
    steps: 4,
    bevel: 0.6,
    inner: L(k.planOutline(k.insetPlan(GAUGE_BASE, 2.2), 6, P, 4), { tone: "faint" }),
    extra: Dt(gbScrews.map(([x, y]) => [x, y, 6]), { size: 0.45 }),
  },
);
const GAUGE_BLK = { x: GAUGE[0] - 10, y: GAUGE[1] - 10, w: 20, d: 20, r: 2 };
slab(
  "gauge.block",
  GAUGE_BLK,
  6,
  16,
  { tone: "mid" },
  {
    steps: 4,
    bevel: 0.5,
    inner: L(k.sideSeam(GAUGE_BLK, 14, P, 4), { tone: "faint" }),
  },
);

const GF = up(GAUGE[0], GAUGE[1], 0);
turned("gauge.collar", GF, [[22, 6.4], [26, 6.4]], { tone: "mid" });
turned(
  "gauge.post",
  GF,
  [[26, 4.2], [51, 4.2]],
  { tone: "mid", crease: "none" },
  { inner: L([34, 43].map((z) => G.arcOf(GF, z, 4.2, P)).join(""), { tone: "faint" }) },
);
turned(
  "gauge.union",
  GF,
  [[51, 6.0], [56, 6.0]],
  { tone: "mid" },
  { inner: k.fadedSvg(G.ribsOf(GF, 51.5, 55.5, 6.0, 18, P, { fade: [0.1, 0.55], seams: true }), { tone: "lo" }) },
);

const gTicks = k.radialTicks(GAUGE[0], GAUGE[1], GAUGE_R - 2.2, 60, 5, GAUGE_TOP, [1.4, 3.0], P);
const needleAt = (bar) => {
  const frac = Math.max(0, Math.min(1.05, bar / MAX_BAR));
  const angle = (-135 + frac * 270) * DEG;
  const [x, y] = GAUGE;
  return k.lineOnTop(
    [x - Math.sin(angle) * 3.8, y + Math.cos(angle) * 3.8],
    [x + Math.sin(angle) * (GAUGE_R - 4.5), y - Math.cos(angle) * (GAUGE_R - 4.5)],
    GAUGE_TOP + 0.2,
    P,
  );
};
turned(
  "gauge.case",
  GF,
  [[GAUGE_Z, GAUGE_R], [GAUGE_TOP, GAUGE_R]],
  { tone: "hi", crease: "lo" },
  {
    inner:
      L(k.knurl(GAUGE[0], GAUGE[1], GAUGE_R, GAUGE_TOP - 3.6, GAUGE_TOP, 84, P, 0.3), { tone: "lo" }) +
      L(k.sideArc(GAUGE[0], GAUGE[1], GAUGE_R, GAUGE_TOP - 3.6, P, 40), { tone: "faint" }),
    extra:
      L(k.ring(GAUGE[0], GAUGE[1], GAUGE_R - 2.2, GAUGE_TOP, P, 64), { tone: "lo" }) +
      L(gTicks.minor, { tone: "lo" }) +
      L(gTicks.major, { tone: "mid" }) +
      k.faceTextSvg(k.topMatrix([GAUGE[0], GAUGE[1] + 9.5], GAUGE_TOP, P, "x"), "BAR", { size: 2.5, tone: "lo", anchor: "middle" }) +
      `<path data-part="needle" class="iso-line" data-tone="lit" data-free="both" d="${needleAt(100)}" style="stroke-width:1.15"/>` +
      L(k.ring(GAUGE[0], GAUGE[1], 1.8, GAUGE_TOP, P, 18), { tone: "mid" }) +
      Dt([[GAUGE[0], GAUGE[1], GAUGE_TOP + 0.2]], { size: 0.55, tone: "hi" }),
  },
);

const ROUTE_PRESS = [
  [-48, PRESS_Y, PRESS_Z],
  [-28, PRESS_Y, PRESS_Z],
];
const UNION_F = G.frameOf([-38, PRESS_Y, PRESS_Z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
turned(
  "pipe.press.union",
  UNION_F,
  [[-2, 3.2], [2, 3.2]],
  { tone: "mid" },
  { inner: L(G.arcOf(UNION_F, 0, 3.2, P), { tone: "faint" }), meta: { owner: "pipe.press" } },
);
R.route("pipe.press", ROUTE_PRESS, 1.8, { owner: "pipe.press", gaps: [[8, 12]] });
tubePieces(ROUTE_PRESS, 1.8, P, { maxLength: 10, gaps: [[8, 12]] }).forEach((piece, i) =>
  R.put({
    name: `pipe.press:${i}`,
    at: piece.mid,
    svg: tubeSvg(piece, { tone: "hi" }),
    shapes: [A.tube(piece.points, piece.radii)],
    route: "pipe.press",
    chunk: i,
  }),
);

const MF_RIGHT_A = G.frameOf([MAN_BODY.x + MAN_BODY.w, COL[1], 15], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
turned("manifold.port.col", MF_RIGHT_A, [[0, 3.2], [3.5, 3.2]], { tone: "mid" });
const COL_PORT_F = G.frameOf([COL[0], COL[1], 15], [-1, 0, 0], [0, 1, 0], [0, 0, 1]);
turned(
  "column.port.in",
  COL_PORT_F,
  [[10.8, 3.2], [14.5, 3.2]],
  { tone: "mid" },
  { meta: { seated: true, cut: [colLower] } },
);
const ROUTE_COL = [
  [MAN_BODY.x + MAN_BODY.w + 3.5, COL[1], 15],
  [COL[0] - 14.5, COL[1], 15],
];
R.route("pipe.column", ROUTE_COL, 1.6, {});
tubePieces(ROUTE_COL, 1.6, P, { maxLength: 12 }).forEach((piece, i) =>
  R.put({
    name: `pipe.column:${i}`,
    at: piece.mid,
    svg: tubeSvg(piece, { tone: "hi" }),
    shapes: [A.tube(piece.points, piece.radii)],
    route: "pipe.column",
    chunk: i,
  }),
);

const MF_RIGHT_B = G.frameOf([MAN_BODY.x + MAN_BODY.w, -12, 15], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
turned("manifold.port.gauge", MF_RIGHT_B, [[0, 3.2], [3.5, 3.2]], { tone: "mid" });
const GAUGE_PORT_F = G.frameOf([GAUGE_BLK.x, GAUGE[1], 15], [-1, 0, 0], [0, 1, 0], [0, 0, 1]);
turned("gauge.port.in", GAUGE_PORT_F, [[0, 3.2], [3.5, 3.2]], { tone: "mid" });
const ROUTE_GAUGE = G.fillet(
  [
    [MAN_BODY.x + MAN_BODY.w + 3.5, -12, 15],
    [48, -12, 15],
    [48, GAUGE[1], 15],
    [GAUGE_BLK.x - 3.5, GAUGE[1], 15],
  ],
  5,
  12,
  { P, tube: 1.5 },
);
R.route("pipe.gauge", ROUTE_GAUGE, 1.5, {});
tubePieces(ROUTE_GAUGE, 1.5, P, {
  maxLength: 12,
  rings: { pitch: 1.8, twist: 1.4, cross: true, fade: [0.1, 0.55], tone: "lo" },
}).forEach((piece, i) =>
  R.put({
    name: `pipe.gauge:${i}`,
    at: piece.mid,
    svg: tubeSvg(piece, { tone: "hi" }),
    shapes: [A.tube(piece.points, piece.radii)],
    route: "pipe.gauge",
    chunk: i,
  }),
);

A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
const groups = R.items.map((it) => `<g${it.hit ? ` data-hit="${it.hit}"` : ""}>${it.svg}</g>`);

const svg = k.figureSvg({
  width: W,
  height: H,
  label:
    "A hydraulic deadweight pressure tester on a surface plate. On the left, a handwheel screw press drives a plunger into a ribbed hydraulic barrel; in the centre, a manifold block with an isolation valve and sight-glass oil reservoir feeds two stainless capillary lines; on the front-right, a lapped vertical piston column carries four calibrated mass discs that float on the oil film when hydraulic pressure matches their weight; on the back-right, a 0 to 120 bar reference Bourdon dial gauge reads the line pressure.",
  body: [...back, ...groups],
});

const CSS = `<style>
.dw-stage [data-hit]{cursor:pointer}
.iso-stage:focus{outline:none}.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
</style>`;

const DATA = {
  P,
  GAUGE,
  GAUGE_R,
  GAUGE_TOP,
  MAX_BAR,
  LIFT_MAX,
  RAM_STROKE,
  ramAxis: k.axisVector(P, [1, 0, 0]),
  liftAxis: k.axisVector(P, [0, 0, 1]),
};

const live = `
const D = ${JSON.stringify(DATA)};
const { P, GAUGE, GAUGE_R, GAUGE_TOP, MAX_BAR, LIFT_MAX, RAM_STROKE } = D;
const stage = document.querySelector(".dw-stage");
const readout = document.querySelector("[data-readout]");
const rams = [...stage.querySelectorAll('[data-part="ram"]')];
const piston = stage.querySelector('[data-part="piston"]');
const carriers = [...stage.querySelectorAll('[data-part="carrier"]')];
const finial = stage.querySelector('[data-part="finial"]');
const weights = [0, 1, 2, 3].map((i) => stage.querySelector('[data-part="weight-' + i + '"]'));
const needle = stage.querySelector('[data-part="needle"]');
const still = matchMedia("(prefers-reduced-motion: reduce)");
const DEG = Math.PI / 180;
const needleAt = ${needleAt.toString().replace("k.lineOnTop", "lineOnTop")};
let targetCount = 4;
let ram = 0.88;
let targetRam = 0.88;
let lift = 0.62;
let liftVel = 0;
let bar = 100;
let wLift = [0, 0, 0, 0];
let drag = null;
let touring = !still.matches;
let visible = false;
let frame = 0;
let last = 0;
let clock = 0;
let idleTimer = 0;
const TOURS = [
  [4, 0.88],
  [3, 0.72],
  [2, 0.54],
  [1, 0.34],
];
function hold() {
  touring = false;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (!still.matches) {
      touring = true;
      run();
    }
  }, 4000);
}
function step(dt) {
  if (touring && !drag) {
    clock += dt;
    const [tc, tr] = TOURS[Math.floor(clock / 3.2) % TOURS.length];
    targetCount = tc;
    targetRam = tr;
  }
  ram += (targetRam - ram) * (1 - Math.exp(-dt * 10));
  const nominal = targetCount * 25;
  const supply = ram * 125;
  const eqLift = supply <= nominal - 4 ? 0 : Math.min(1, (supply - (nominal - 4)) / 18);
  const force = (eqLift - lift) * 65 - liftVel * 12;
  liftVel += force * dt;
  lift = Math.max(0, Math.min(1, lift + liftVel * dt));
  const targetBar = lift > 0.02 && lift < 0.96 ? nominal + (lift - 0.5) * 1.6 : Math.min(120, Math.max(0, supply));
  bar += (targetBar - bar) * (1 - Math.exp(-dt * 12));
  for (let i = 0; i < 4; i++) {
    const goal = i < targetCount ? 0 : 1;
    wLift[i] += (goal - wLift[i]) * (1 - Math.exp(-dt * 10));
  }
}
function draw() {
  const dx = ram * D.RAM_STROKE * D.ramAxis[0];
  const dy = ram * D.RAM_STROKE * D.ramAxis[1];
  for (const el of rams) {
    el.setAttribute("transform", "translate(" + dx.toFixed(2) + " " + dy.toFixed(2) + ")");
    holdStill(el, [dx, dy]);
  }
  const lz = lift * D.LIFT_MAX;
  const px = lz * D.liftAxis[0];
  const py = lz * D.liftAxis[1];
  piston.setAttribute("transform", "translate(" + px.toFixed(2) + " " + py.toFixed(2) + ")");
  holdStill(piston, [px, py]);
  for (const el of carriers) el.setAttribute("transform", "translate(" + px.toFixed(2) + " " + py.toFixed(2) + ")");
  let removed = 0;
  for (let i = 0; i < 4; i++) {
    removed += wLift[i] * 5.6;
    const extra = wLift[i] * 14;
    const wx = (lz + extra) * D.liftAxis[0];
    const wy = (lz + extra) * D.liftAxis[1];
    weights[i].setAttribute("transform", "translate(" + wx.toFixed(2) + " " + wy.toFixed(2) + ")");
    const alpha = Math.max(0, 1 - wLift[i]);
    weights[i].style.opacity = (alpha * alpha).toFixed(3);
  }
  const fx = (lz - removed) * D.liftAxis[0];
  const fy = (lz - removed) * D.liftAxis[1];
  finial.setAttribute("transform", "translate(" + fx.toFixed(2) + " " + fy.toFixed(2) + ")");
  needle.setAttribute("d", needleAt(bar));
  const floating = lift > 0.05 && lift < 0.95;
  const status = floating ? "floating" : lift >= 0.95 ? "top stop" : "seated";
  const text = targetCount + " × 25 bar · " + bar.toFixed(1) + " bar · " + status;
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(bar)));
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (still.matches && !drag) {
    draw();
    frame = 0;
    return;
  }
  step(dt);
  draw();
  const busy =
    touring ||
    drag ||
    Math.abs(targetRam - ram) > 0.001 ||
    Math.abs(liftVel) > 0.002 ||
    wLift.some((v, i) => Math.abs((i < targetCount ? 0 : 1) - v) > 0.002);
  frame = visible && busy ? requestAnimationFrame(tick) : 0;
}
function run() {
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
}
new IntersectionObserver(
  (entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) run();
  },
  { rootMargin: "80px 0px" },
).observe(stage);
stage.addEventListener("pointerdown", (e) => {
  const hit = e.target.closest("[data-hit]")?.dataset.hit;
  hold();
  if (hit === "weights") {
    targetCount = (targetCount % 4) + 1;
    targetRam = Math.min(0.96, (targetCount * 25 + 6) / 125);
    run();
    return;
  }
  drag = { x: e.clientX, ram0: targetRam, span: Math.max(120, stage.getBoundingClientRect().width * 0.35) };
  stage.setPointerCapture(e.pointerId);
});
stage.addEventListener("pointermove", (e) => {
  if (!drag) return;
  targetRam = Math.max(0, Math.min(1, drag.ram0 + (e.clientX - drag.x) / drag.span));
  run();
});
stage.addEventListener("pointerup", () => {
  drag = null;
});
stage.addEventListener("pointercancel", () => {
  drag = null;
});
stage.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") targetRam = Math.min(1, targetRam + 0.06);
  else if (e.key === "ArrowLeft") targetRam = Math.max(0, targetRam - 0.06);
  else if (e.key === "ArrowUp" || e.key === " ") {
    targetCount = Math.min(4, targetCount + (e.key === " " && targetCount === 4 ? -3 : 1));
    targetRam = Math.min(0.96, (targetCount * 25 + 6) / 125);
  } else if (e.key === "ArrowDown") {
    targetCount = Math.max(1, targetCount - 1);
    targetRam = Math.min(0.96, (targetCount * 25 + 6) / 125);
  } else if (["1", "2", "3", "4"].includes(e.key)) {
    targetCount = Number(e.key);
    targetRam = Math.min(0.96, (targetCount * 25 + 6) / 125);
  } else return;
  e.preventDefault();
  hold();
  run();
});
draw();
`;

const body =
  CSS +
  k.plateHtml({
    fig: "Fig 1",
    title: "Deadweight pressure tester",
    hint: "Drag wheel · click weights · ←/→ 1–4",
    readout: "4 × 25 bar · 100.0 bar · floating",
    keys: [
      { mark: "lit", label: "Floating piston & gauge needle: balanced at P = m·g / A" },
      { mark: "raised", label: "Calibrated 25 bar mass discs & screw press ram" },
    ],
    caption:
      "A primary hydraulic pressure standard. Turning the handwheel advances the screw ram into the oil-filled barrel, building pressure through the manifold until the upward hydraulic force P·A on the lapped vertical piston equals the downward weight m·g of the stacked calibration masses. Once the stack lifts off its datum collar and floats freely on the oil film, the line pressure is fixed by mass and piston area alone, calibrating the 0–120 bar Bourdon reference gauge.",
    body: `<div class="iso-stage dw-stage" tabindex="0" role="slider" aria-label="Deadweight pressure tester. Drag the screw press handwheel or use Left and Right arrows to change ram displacement; click the weight stack or press 1 to 4 or Space to change the calibrated mass." aria-valuemin="0" aria-valuemax="120" aria-valuenow="100" aria-valuetext="4 × 25 bar · 100.0 bar · floating">${svg}</div>`,
  });

const name = THEME === "light" ? "deadweight-tester-light.html" : "deadweight-tester.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "Deadweight pressure tester", theme: THEME, body, script: kitScript() + live }));
console.log("wrote", name, R.items.length, "items");
void pressBarrel;
void manBodyShape;
A.auditOrExit(R, P);
