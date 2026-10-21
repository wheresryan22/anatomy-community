import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../.skill/kit/iso-kit.mjs";
import * as G from "../../../../.skill/kit/lathe.mjs";
import * as A from "../../../../.skill/kit/audit.mjs";
import { turning } from "../../../../.skill/kit/turn-build.mjs";
import * as TA from "../../../../.skill/kit/turn-audit.mjs";
import { turnScript } from "../../../../.skill/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const theme = argv.includes("--light") ? "light" : "dark";
const verify = argv.includes("--verify");

const WIDTH = 680;
const HEIGHT = 480;
const AZIMUTH = 38;
const ELEVATION = 31;
const TAU = Math.PI * 2;

const STAND_BASE = { x: -112, y: -58, w: 224, d: 116, r: 8 };
const STAND_Z0 = -18;
const STAND_H = 8;
const FOOT_H = 5;

const MAST_XY = [-64, 0];
const MASS_XY = [-20, 0];
const STYLUS_XY = [14, 0];
const DRUM_XY = [58, 0];

export const P = k.fitProjection(
  [
    ...k.boxCorners(STAND_BASE, STAND_Z0 - FOOT_H, 0),
    [-115, -62, 68],
    [115, 62, 68],
  ],
  WIDTH,
  HEIGHT,
  { pad: 24, azimuth: AZIMUTH, elevation: ELEVATION },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const VERT = (x, y) => G.frameOf([x, y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const byDepth = (points) =>
  [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

export const R = A.recorder(P);
const put = (item) =>
  R.put({
    ...item,
    shapes: item.shapes.map((shape, index) =>
      R.solid(Object.assign(shape, { name: shape.name ?? (index ? `${item.name}#${index + 1}` : item.name) })),
    ),
  });

function buildStatics() {
  for (const [x, y] of byDepth(k.corners(STAND_BASE, 20))) {
    const zBot = STAND_Z0 - FOOT_H;
    const svg =
      S(k.cylinder(x, y, 7.2, zBot, 1.8, P, 28), { tone: "lo" }) +
      S(k.cylinder(x, y, 5.5, zBot + 1.8, FOOT_H - 1.8, P, 28), { tone: "mid" });
    put({
      name: `stand.foot.${x}.${y}`,
      layer: "back",
      at: [x, y, zBot],
      svg,
      shapes: [
        A.cylinder(x, y, 7.2, zBot, 1.8, { ground: true }),
        A.cylinder(x, y, 5.5, zBot + 1.8, FOOT_H - 1.8),
      ],
    });
  }

  const screws = k.corners(STAND_BASE, 9);
  const plinthTop = STAND_Z0 + STAND_H;
  const baseSvg =
    S(k.slabOf(STAND_BASE, STAND_Z0, STAND_H, P, 8, 1.4), {
      tone: "lo",
      inner: L(k.sideSeam(STAND_BASE, STAND_Z0 + 3, P, 8), { tone: "faint" }),
    }) +
    L(k.planOutline(k.insetPlan(STAND_BASE, 5), plinthTop, P), { tone: "faint" }) +
    L(screws.map(([x, y]) => k.ring(x, y, 2.2, plinthTop, P, 16)).join(""), { tone: "lo" }) +
    D(screws.map(([x, y]) => at([x, y, plinthTop])), { size: 0.48 });

  put({
    name: "stand.plinth",
    layer: "back",
    at: [0, 0, STAND_Z0],
    bias: 4,
    svg: baseSvg,
    shapes: [A.slab(STAND_BASE, STAND_Z0, STAND_H, { ground: true })],
  });
}

export const T = turning(P, { recorder: R });

const spin = T.group("spin", { turn: { pivot: [0, 0] } });
const subbase = T.group("subbase", {
  parent: spin,
  slide: { direction: [1, 0, 0], travel: 0.2 },
});
const bedrock = T.group("bedrock", {
  parent: spin,
  slide: { direction: [1, 0, 0], travel: 10 },
});
const pendulum = T.group("pendulum", {
  parent: bedrock,
  hinge: { point: [MAST_XY[0], MAST_XY[1], 0], axis: [0, 0, 1], range: [-5.5, 5.5] },
});
const stylus = T.group("stylus", {
  parent: bedrock,
  hinge: { point: [STYLUS_XY[0], STYLUS_XY[1], 0], axis: [0, 0, 1], range: [-12, 12] },
});
const drum = T.group("drum", {
  parent: bedrock,
  hinge: { point: [DRUM_XY[0], DRUM_XY[1], 0], axis: [0, 0, 1], range: [0, 180] },
});

const mainLayer = T.layer("main");
T.stack(["back", "main"]);

export function wavePacket(phasePct, regime = "all") {
  const p = Math.max(0, Math.min(100, phasePct)) / 100;
  let xg = 0;
  let xr = 0;
  let arrival = "Quiet Baseline";
  if (regime === "p") {
    const env = Math.sin(p * Math.PI);
    const osc = Math.sin(p * TAU * 4.5);
    xg = 2.8 * env * osc;
    xr = -0.86 * xg;
    arrival = "P-Wave (1.8 Hz Compressional)";
  } else if (regime === "s") {
    const env = Math.sin(p * Math.PI);
    const osc = Math.sin(p * TAU * 3.0);
    xg = 5.6 * env * osc;
    xr = -0.92 * xg;
    arrival = "S-Wave (0.9 Hz Shear)";
  } else if (regime === "surface") {
    const env = Math.sin(p * Math.PI);
    const osc = Math.sin(p * TAU * 2.0);
    xg = 8.8 * env * osc;
    xr = -0.95 * xg;
    arrival = "Rayleigh Surface Wave (0.4 Hz)";
  } else {
    if (p < 0.08) {
      arrival = "Pre-Event Baseline";
      xg = 0.3 * Math.sin((p / 0.08) * Math.PI) * Math.sin(p * TAU * 8);
      xr = -0.82 * xg;
    } else if (p < 0.36) {
      arrival = "Primary P-Wave Arrival (1.8 Hz)";
      const u = (p - 0.08) / 0.28;
      xg = 2.9 * Math.sin(u * Math.PI) * Math.sin(u * TAU * 3.5);
      xr = -0.88 * xg;
    } else if (p < 0.68) {
      arrival = "Secondary S-Wave Shear (0.9 Hz)";
      const u = (p - 0.36) / 0.32;
      xg = 5.8 * Math.sin(u * Math.PI) * Math.sin(u * TAU * 2.5);
      xr = -0.92 * xg;
    } else {
      arrival = "Rayleigh Surface Wave (0.4 Hz)";
      const u = (p - 0.68) / 0.32;
      xg = 8.6 * Math.sin(u * Math.PI) * Math.sin(u * TAU * 2.0);
      xr = -0.95 * xg;
    }
  }
  const bedSlide = 5 + xg * 0.52;
  const pendDeg = (xr / 8.5) * 5.2;
  const stylusDeg = -pendDeg * 2.15;
  const drumDeg = p * 180;
  return {
    phasePct,
    xg,
    xr,
    xMassAbs: xg + xr,
    bedSlide,
    pendDeg,
    stylusDeg,
    drumDeg,
    arrival,
  };
}

export const follow = (values) => {
  const spinDeg = values.spin ?? 0;
  if (
    values.bedrock !== undefined &&
    values.pendulum !== undefined &&
    values.stylus !== undefined &&
    values.drum !== undefined &&
    values.phase === undefined
  ) {
    return {
      spin: spinDeg,
      subbase: 0,
      bedrock: values.bedrock,
      pendulum: values.pendulum,
      stylus: values.stylus,
      drum: values.drum,
    };
  }
  const phase = values.phase ?? 52;
  const regime = values.regime ?? "all";
  const w = wavePacket(phase, regime);
  return {
    spin: spinDeg,
    subbase: 0,
    bedrock: values.bedrock ?? w.bedSlide,
    pendulum: values.pendulum ?? w.pendDeg,
    stylus: values.stylus ?? w.stylusDeg,
    drum: values.drum ?? w.drumDeg,
  };
};

export const poses = () => {
  const list = [];
  for (let s = 0; s < 360; s += 60) {
    for (const b of [0, 5, 10]) {
      for (const p of [-5.5, 0, 5.5]) {
        for (const st of [-12, 0, 12]) {
          for (const d of [0, 90, 180]) {
            list.push({ spin: s, subbase: 0, bedrock: b, pendulum: p, stylus: st, drum: d });
          }
        }
      }
    }
  }
  return list;
};

const ringPath = (r, steps = 64) =>
  Array.from(
    { length: steps },
    (_, j) =>
      `${j ? "L" : "M"}${(r * Math.cos((j / steps) * TAU)).toFixed(2)} ${(r * Math.sin((j / steps) * TAU)).toFixed(2)}`,
  ).join("") + "Z";

// ---------------------------------------------------------------------------
// Tier 0 (z = -10..0): subbase — Stationary seismic fault / earth datum rails
// ---------------------------------------------------------------------------
T.prism({
  name: "subbase.bed",
  group: subbase,
  layer: mainLayer,
  plan: { x: -104, y: -50, w: 208, d: 100, r: 6 },
  z: -10,
  h: 8,
  steps: 6,
  bevel: 0.6,
  tone: "lo",
  crease: "lo",
  material: "gunmetal",
});

T.prism({
  name: "subbase.rail.rear",
  group: subbase,
  layer: mainLayer,
  plan: { x: -96, y: -44, w: 192, d: 8, r: 1.5 },
  z: -2,
  h: 2,
  steps: 4,
  bevel: 0.3,
  tone: "mid",
  material: "steel",
});

const subbaseFrontRail = T.prism({
  name: "subbase.rail.front",
  group: subbase,
  layer: mainLayer,
  plan: { x: -96, y: 36, w: 192, d: 8, r: 1.5 },
  z: -2,
  h: 2,
  steps: 4,
  bevel: 0.3,
  tone: "mid",
  material: "steel",
});

const scaleTicks = [];
for (let x = -72; x <= 72; x += 6) {
  const maj = x % 18 === 0;
  scaleTicks.push(`M${x} -3.2L${x} ${(maj ? 1.8 : 0.2).toFixed(1)}`);
}
T.plane({
  part: subbaseFrontRail,
  o: [0, 40, 0],
  u: [1, 0, 0],
  v: [0, 1, 0],
  svg: `<path class="iso-line" data-tone="lo" data-free="both" d="${scaleTicks.join("")}"/>`,
  fade: [0.04, 0.3],
});

// ---------------------------------------------------------------------------
// Tier 1 (z = 0..6): bedrock — Moving concrete/cast-iron instrument pier
// ---------------------------------------------------------------------------
const bedrockPier = T.prism({
  name: "bedrock.pier",
  group: bedrock,
  layer: mainLayer,
  plan: { x: -92, y: -40, w: 174, d: 80, r: 5 },
  z: 0,
  h: 6,
  steps: 6,
  bevel: 0.6,
  tone: "mid",
  crease: "lo",
  material: "steel",
  details: {
    dots: [
      [-84, -33],
      [74, -33],
      [-84, 33],
      [74, 33],
    ].map(([x, y]) => ({ at: [6, x, y], normal: [0, 0, 1], size: 0.5, tone: "lo" })),
  },
});

T.plane({
  part: bedrockPier,
  o: [-5, 0, 6],
  u: [1, 0, 0],
  v: [0, 1, 0],
  svg: `<path class="iso-line" data-tone="faint" d="M-80 -34L80 -34L80 34L-80 34Z"/>`,
  fade: [0.04, 0.3],
});

// ---------------------------------------------------------------------------
// Tier 2 (z = 6..12): Mast base, permanent magnet yoke & poles, pedestals
// ---------------------------------------------------------------------------
T.prism({
  name: "mast.base",
  group: bedrock,
  layer: mainLayer,
  plan: { x: -76, y: -14, w: 24, d: 28, r: 2.5 },
  z: 6,
  h: 6,
  steps: 4,
  bevel: 0.5,
  tone: "lo",
  material: "gunmetal",
  details: {
    dots: [
      [-72, -10],
      [-56, -10],
      [-72, 10],
      [-56, 10],
    ].map(([x, y]) => ({ at: [12, x, y], normal: [0, 0, 1], size: 0.45, tone: "mid" })),
  },
});

T.prism({
  name: "magnet.yoke",
  group: bedrock,
  layer: mainLayer,
  plan: { x: -30, y: -22, w: 20, d: 44, r: 2.5 },
  z: 6,
  h: 3,
  steps: 4,
  bevel: 0.4,
  tone: "lo",
  material: "gunmetal",
});

T.prism({
  name: "magnet.poleRear",
  group: bedrock,
  layer: mainLayer,
  plan: { x: -28, y: -22, w: 16, d: 13, r: 1.8 },
  z: 9,
  h: 3,
  steps: 4,
  bevel: 0.35,
  tone: "mid",
  material: "steel",
});

T.prism({
  name: "magnet.poleFront",
  group: bedrock,
  layer: mainLayer,
  plan: { x: -28, y: 9, w: 16, d: 13, r: 1.8 },
  z: 9,
  h: 3,
  steps: 4,
  bevel: 0.35,
  tone: "mid",
  material: "steel",
});

T.round({
  name: "stylus.pedestal",
  group: bedrock,
  layer: mainLayer,
  F: VERT(STYLUS_XY[0], STYLUS_XY[1]),
  s0: 6,
  s1: 12,
  r: 6.5,
  tone: "lo",
  material: "gunmetal",
});

T.prism({
  name: "drum.pedestal",
  group: bedrock,
  layer: mainLayer,
  plan: { x: 42, y: -16, w: 32, d: 32, r: 3 },
  z: 6,
  h: 6,
  steps: 4,
  bevel: 0.5,
  tone: "lo",
  material: "gunmetal",
  details: {
    dots: [
      [46, -12],
      [70, -12],
      [46, 12],
      [70, 12],
    ].map(([x, y]) => ({ at: [12, x, y], normal: [0, 0, 1], size: 0.45, tone: "mid" })),
  },
});

// ---------------------------------------------------------------------------
// Tier 3 (z = 12..16): Flexural hinge collar, copper eddy-current damper, posts
// ---------------------------------------------------------------------------
T.round({
  name: "boom.hinge",
  group: pendulum,
  layer: mainLayer,
  F: VERT(MAST_XY[0], MAST_XY[1]),
  s0: 12,
  s1: 16,
  r: 7.0,
  tone: "mid",
  material: "brass",
});

T.prism({
  name: "damper.paddle",
  group: pendulum,
  layer: mainLayer,
  plan: { x: -27, y: -14, w: 14, d: 28, r: 2 },
  z: 12,
  h: 4,
  steps: 4,
  bevel: 0.4,
  tone: "hi",
  lit: true,
  material: "copper",
});

T.round({
  name: "stylus.post",
  group: bedrock,
  layer: mainLayer,
  F: VERT(STYLUS_XY[0], STYLUS_XY[1]),
  s0: 12,
  s1: 16,
  r: 4.2,
  tone: "mid",
  material: "steel",
});

T.round({
  name: "drum.shaftLower",
  group: bedrock,
  layer: mainLayer,
  F: VERT(DRUM_XY[0], DRUM_XY[1]),
  s0: 12,
  s1: 16,
  r: 10.0,
  tone: "mid",
  material: "steel",
});

// ---------------------------------------------------------------------------
// Tier 4A (z = 16..19) & Tier 4B (z = 19..22): Horizontal boom, hubs, platter
// ---------------------------------------------------------------------------
T.prism({
  name: "boom.strut",
  group: pendulum,
  layer: mainLayer,
  plan: { x: -67, y: -4.2, w: 72, d: 8.4, r: 1.8 },
  z: 16,
  h: 3,
  steps: 4,
  bevel: 0.35,
  tone: "hi",
  crease: "lo",
  material: "steel",
});

T.round({
  name: "mast.lower",
  group: bedrock,
  layer: mainLayer,
  F: VERT(MAST_XY[0], MAST_XY[1]),
  s0: 19,
  s1: 22,
  r: 5.5,
  tone: "mid",
  material: "steel",
});

T.round({
  name: "mass.base",
  group: pendulum,
  layer: mainLayer,
  F: VERT(MASS_XY[0], MASS_XY[1]),
  s0: 19,
  s1: 22,
  r: 9.5,
  tone: "mid",
  material: "brass",
});

T.round({
  name: "boom.pin",
  group: pendulum,
  layer: mainLayer,
  F: VERT(2, 0),
  s0: 19,
  s1: 22,
  r: 2.2,
  tone: "hi",
  material: "brass",
});

T.round({
  name: "stylus.hub",
  group: stylus,
  layer: mainLayer,
  F: VERT(STYLUS_XY[0], STYLUS_XY[1]),
  s0: 16,
  s1: 22,
  r: 5.0,
  tone: "hi",
  material: "brass",
});

T.round({
  name: "drum.platter",
  group: drum,
  layer: mainLayer,
  F: VERT(DRUM_XY[0], DRUM_XY[1]),
  s0: 16,
  s1: 22,
  r: 18.5,
  tone: "mid",
  crease: "lo",
  material: "gunmetal",
  details: {
    bolts: [{ s: 22, r: 17.6, count: 12, size: 0.42, tone: "lo" }],
  },
});

// ---------------------------------------------------------------------------
// Tier 5 (z = 22..48): Vertical mast column, heavy brass proof mass, drum & trace
// ---------------------------------------------------------------------------
T.round({
  name: "mast.column",
  group: bedrock,
  layer: mainLayer,
  F: VERT(MAST_XY[0], MAST_XY[1]),
  s0: 22,
  s1: 48,
  r: 5.2,
  tone: "hi",
  crease: "lo",
  material: "steel",
});

const massCylinder = T.round({
  name: "mass.cylinder",
  group: pendulum,
  layer: mainLayer,
  F: VERT(MASS_XY[0], MASS_XY[1]),
  s0: 22,
  s1: 48,
  r: 14.5,
  tone: "hi",
  crease: "lo",
  lit: true,
  material: "brass",
  details: {
    bolts: [{ s: 48, r: 10.8, count: 8, size: 0.48, tone: "mid" }],
  },
});

T.plane({
  part: massCylinder,
  o: [MASS_XY[0], MASS_XY[1], 48],
  u: [1, 0, 0],
  v: [0, 1, 0],
  svg: `<path class="iso-line" data-tone="lo" d="${ringPath(12.4, 64)}"/><path class="iso-line" data-tone="faint" d="${ringPath(8.8, 48)}"/>`,
  fade: [0.04, 0.3],
});

T.round({
  name: "stylus.riser",
  group: stylus,
  layer: mainLayer,
  F: VERT(STYLUS_XY[0], STYLUS_XY[1]),
  s0: 22,
  s1: 48,
  r: 3.6,
  tone: "hi",
  material: "chrome",
});

T.round({
  name: "drum.cylinder",
  group: drum,
  layer: mainLayer,
  F: VERT(DRUM_XY[0], DRUM_XY[1]),
  s0: 22,
  s1: 44,
  r: 17.0,
  tone: "hi",
  crease: "lo",
  material: "gold",
});

const traceBand = T.round({
  name: "trace.band",
  group: drum,
  layer: mainLayer,
  F: VERT(DRUM_XY[0], DRUM_XY[1]),
  s0: 44,
  s1: 48,
  r: 17.4,
  tone: "hi",
  crease: "lo",
  lit: true,
  material: "copper",
});

const traceWavePath = () => {
  const steps = 96;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * TAU;
    const env = Math.sin(a * 0.5);
    const wave =
      a < 1.8
        ? 0.4 * Math.sin(a * 12)
        : a < 3.8
          ? 1.1 * Math.sin(a * 9)
          : 2.1 * env * Math.sin(a * 6);
    const r = 13.8 + wave;
    pts.push(`${i ? "L" : "M"}${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join("") + "Z";
};

T.plane({
  part: traceBand,
  o: [DRUM_XY[0], DRUM_XY[1], 48],
  u: [1, 0, 0],
  v: [0, 1, 0],
  svg: `<path class="iso-line" data-tone="faint" d="${ringPath(13.8, 64)}"/><path class="iso-line" data-tone="hi" d="${traceWavePath()}"/>`,
  fade: [0.04, 0.3],
});

// ---------------------------------------------------------------------------
// Tier 6 (z = 48..53): Magnifying stylus lever arm, mass cap, stylus nib
// ---------------------------------------------------------------------------
T.round({
  name: "mast.mid",
  group: bedrock,
  layer: mainLayer,
  F: VERT(MAST_XY[0], MAST_XY[1]),
  s0: 48,
  s1: 53,
  r: 5.2,
  tone: "mid",
  material: "steel",
});

T.round({
  name: "mass.cap",
  group: pendulum,
  layer: mainLayer,
  F: VERT(MASS_XY[0], MASS_XY[1]),
  s0: 48,
  s1: 53,
  r: 7.5,
  tone: "hi",
  material: "chrome",
});

T.prism({
  name: "stylus.arm",
  group: stylus,
  layer: mainLayer,
  plan: { x: 4, y: -2.6, w: 54, d: 5.2, r: 1.2 },
  z: 48,
  h: 3.5,
  steps: 4,
  bevel: 0.3,
  tone: "hi",
  crease: "lo",
  lit: true,
  material: "chrome",
});

T.round({
  name: "stylus.nib",
  group: stylus,
  layer: mainLayer,
  F: VERT(STYLUS_XY[0], STYLUS_XY[1]),
  s0: 51.5,
  s1: 53,
  r: 4.0,
  tone: "hi",
  material: "brass",
  details: { bolts: [{ s: 53, r: 0, count: 1, size: 0.45 }] },
});

T.round({
  name: "trace.stylusTip",
  group: stylus,
  layer: mainLayer,
  F: VERT(55, 0),
  s0: 51.5,
  s1: 53,
  r: 2.2,
  tone: "hi",
  lit: true,
  material: "copper",
  details: { bolts: [{ s: 53, r: 0, count: 1, size: 0.4 }] },
});

// ---------------------------------------------------------------------------
// Tier 7 (z = 53..66): Upper suspension staywire tie-rod & mast finial
// ---------------------------------------------------------------------------
T.round({
  name: "mast.upper",
  group: bedrock,
  layer: mainLayer,
  F: VERT(MAST_XY[0], MAST_XY[1]),
  s0: 53,
  s1: 58,
  r: 5.0,
  tone: "hi",
  material: "steel",
});

T.round({
  name: "staywire.anchorMass",
  group: pendulum,
  layer: mainLayer,
  F: VERT(MASS_XY[0], MASS_XY[1]),
  s0: 53,
  s1: 58,
  r: 4.2,
  tone: "hi",
  material: "brass",
});

T.prism({
  name: "staywire.rod",
  group: pendulum,
  layer: mainLayer,
  plan: { x: -67, y: -2.2, w: 51, d: 4.4, r: 1.2 },
  z: 58,
  h: 3.5,
  steps: 4,
  bevel: 0.3,
  tone: "hi",
  crease: "lo",
  lit: true,
  material: "chrome",
});

T.round({
  name: "mast.cap",
  group: bedrock,
  layer: mainLayer,
  F: VERT(MAST_XY[0], MAST_XY[1]),
  s0: 61.5,
  s1: 66,
  r: 6.2,
  tone: "hi",
  material: "brass",
  details: { bolts: [{ s: 66, r: 3.6, count: 6, size: 0.42 }] },
});

T.round({
  name: "staywire.turnbuckle",
  group: pendulum,
  layer: mainLayer,
  F: VERT(-42, 0),
  s0: 61.5,
  s1: 64.5,
  r: 3.2,
  tone: "mid",
  material: "brass",
  details: { bolts: [{ s: 64.5, r: 0, count: 1, size: 0.42 }] },
});

T.round({
  name: "staywire.finial",
  group: pendulum,
  layer: mainLayer,
  F: VERT(MASS_XY[0], MASS_XY[1]),
  s0: 61.5,
  s1: 64.5,
  r: 3.5,
  tone: "hi",
  material: "chrome",
  details: { bolts: [{ s: 64.5, r: 0, count: 1, size: 0.42 }] },
});

buildStatics();
export const out = T.build({ statics: R.items, poses, verify });
A.settle(R, P);

const layerOf = (name) =>
  R.items
    .filter((item) => item.layer === name)
    .sort((a, b) => a.key - b.key)
    .map((item) => item.svg);

const BACK = [
  `<path class="iso-halo" d="${k.haloOf(STAND_BASE, STAND_Z0 - FOOT_H, STAND_H, P)}"/>`,
  ...layerOf("back"),
];

if (argv.includes("--audit")) {
  A.auditOrExit(R, P);
  await TA.orbitOrExit(T, R, P, {
    sweep: { at: (x) => follow({ spin: x, phase: 52 }), from: 0, to: 360, frame: 2.0 },
    random: 240,
    depthAngles: 12,
    depthEvents: 12,
    posedStep: 4,
    routeStates: 48,
    workers: argv.includes("--workers"),
    quick: argv.includes("--quick"),
    only: argv.find((a) => a.startsWith("--only="))?.slice(7).split(",") ?? null,
  });
}

const LABEL =
  "An inertial horizontal pendulum seismograph on a seismic datum subbase: a moving bedrock pier carries a vertical suspension mast, upper staywire tie-rod, flexural hinge boom, 80 kg cylindrical brass proof mass, copper eddy-current damper between permanent magnet poles, 8x magnifying mechanical stylus, and rotating clockwork seismogram drum.";
const backSvg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: BACK });
const liveSvg = out.layerSvg("main", { width: WIDTH, height: HEIGHT });

const CONTROLS_HTML = `
<div class="sp-controls" role="group" aria-label="Seismograph simulation controls">
  <div class="sp-scrub-row">
    <label class="sp-scrub-label" for="sp-scrub">Seismic Wave Progress / Ground Shear Phase</label>
    <input id="sp-scrub" data-scrub type="range" min="0" max="100" step="0.5" value="52" aria-label="Seismic Wave Progress 0 to 100 percent" />
    <span class="sp-scrub-val" data-phase-pct>52%</span>
  </div>
  <div class="sp-btn-row">
    <button type="button" id="sp-play" data-action="play" aria-pressed="true">Pause Wave</button>
    <button type="button" class="sp-regime on" data-regime="all" aria-pressed="true">Full Seismogram Packet</button>
    <button type="button" class="sp-regime" data-regime="p" aria-pressed="false">Primary P-Wave (1.8 Hz)</button>
    <button type="button" class="sp-regime" data-regime="s" aria-pressed="false">Secondary S-Wave (0.9 Hz)</button>
    <button type="button" class="sp-regime" data-regime="surface" aria-pressed="false">Rayleigh Surface Wave (0.4 Hz)</button>
    <button type="button" id="sp-orbit" data-action="orbit" aria-pressed="false">3D Orbit</button>
    <button type="button" id="sp-cut" data-action="cut" aria-pressed="false" title="Toggle cutaway of front magnet pole & upper cap (Shortcut: X)">Cutaway (X)</button>
  </div>
  <div class="sp-telemetry" aria-live="polite">
    <div class="sp-metric"><span class="sp-k">Ground x_g(t)</span><span class="sp-v" data-m-xg>+4.12 mm</span></div>
    <div class="sp-metric"><span class="sp-k">Inertial Lag x_r(t)</span><span class="sp-v" data-m-xr>-3.79 mm</span></div>
    <div class="sp-metric"><span class="sp-k">Stylus Lever V_0</span><span class="sp-v" data-m-mag>8.0×</span></div>
    <div class="sp-metric"><span class="sp-k">Damping Ratio ζ</span><span class="sp-v" data-m-zeta>0.65 Critical Eddy</span></div>
    <div class="sp-metric"><span class="sp-k">Natural Period T_0</span><span class="sp-v" data-m-period>12.0 s</span></div>
    <div class="sp-metric"><span class="sp-k">Arrival Phase</span><span class="sp-v" data-m-phase>Secondary S-Wave (0.9 Hz)</span></div>
  </div>
</div>
`;

const stage = `<div class="iso-stage iso-turn sp-stage" tabindex="0" role="slider" aria-label="Inertial pendulum seismograph: drag to orbit in 3D, use the phase slider or arrow keys to scrub the seismic wave packet" aria-valuemin="0" aria-valuemax="100" aria-valuenow="52" aria-valuetext="Secondary S-Wave Shear, ground +4.1 mm, relative lag -3.8 mm">${backSvg}${liveSvg}</div>${CONTROLS_HTML}`;

const EXTRA_CSS = `
.sp-stage { cursor: grab; touch-action: none; user-select: none; }
.sp-stage:active { cursor: grabbing; }
.sp-stage[data-cut="true"] g[data-name="magnet.poleFront"],
.sp-stage[data-cut="true"] g[data-name="mast.cap"],
.sp-stage[data-cut="true"] g[data-name="staywire.finial"] {
  opacity: 0.16;
}
.sp-controls {
  display: grid;
  gap: 8px;
  margin-top: 8px;
  margin-bottom: 22px;
  padding-top: 10px;
  border-top: 1px solid var(--anatomy-faint);
  font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: var(--anatomy-text);
}
.sp-scrub-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
}
.sp-scrub-label {
  color: var(--anatomy-muted);
  font-weight: 500;
}
.sp-scrub-val {
  min-width: 38px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--anatomy-strong);
}
.sp-controls input[type="range"] {
  width: 100%;
  accent-color: var(--anatomy-strong);
  cursor: pointer;
}
.sp-btn-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.sp-btn-row button {
  font: 11.5px/1.3 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  background: var(--anatomy-face);
  color: var(--anatomy-text);
  border: 1px solid var(--anatomy-lo);
  border-radius: 5px;
  padding: 5px 9px;
  cursor: pointer;
}
.sp-btn-row button:hover {
  border-color: var(--anatomy-mid);
  color: var(--anatomy-strong);
}
.sp-btn-row button[aria-pressed="true"],
.sp-btn-row button.on {
  background: var(--anatomy-strong);
  border-color: var(--anatomy-strong);
  color: var(--anatomy-paper);
}
.sp-telemetry {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
  gap: 6px;
}
.sp-metric {
  background: var(--anatomy-face);
  border: 1px solid var(--anatomy-faint);
  border-radius: 4px;
  padding: 5px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sp-k {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--anatomy-muted);
}
.sp-v {
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--anatomy-strong);
}
`;

const DATA = { turn: out.data };
const LIVE_SCRIPT = `
(() => {
  const DATA = ${JSON.stringify(DATA)};
  const TAU = Math.PI * 2;
  const wavePacket = ${wavePacket.toString()};
  const follow = ${follow.toString()};
  const stage = document.querySelector(".sp-stage");
  const readout = document.querySelector("[data-readout]");
  const scrub = document.querySelector("[data-scrub]");
  const phasePctEl = document.querySelector("[data-phase-pct]");
  const playBtn = document.getElementById("sp-play");
  const orbitBtn = document.getElementById("sp-orbit");
  const cutBtn = document.getElementById("sp-cut");
  const regimeBtns = [...document.querySelectorAll(".sp-regime")];
  const mXg = document.querySelector("[data-m-xg]");
  const mXr = document.querySelector("[data-m-xr]");
  const mMag = document.querySelector("[data-m-mag]");
  const mZeta = document.querySelector("[data-m-zeta]");
  const mPeriod = document.querySelector("[data-m-period]");
  const mPhase = document.querySelector("[data-m-phase]");

  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let spinAngle = 0;
  let phase = 52;
  let regime = "all";
  let playing = !still.matches;
  let orbiting = false;
  let cutaway = false;
  let last = 0;
  let own = false;

  function fmtSigned(v) {
    return (v >= 0 ? "+" : "") + v.toFixed(2) + " mm";
  }

  function updateUI() {
    const w = wavePacket(phase, regime);
    const penTipMm = w.xr * -8.0;
    const shortPhase = w.arrival.split(" (")[0];
    const text =
      shortPhase +
      " · x_g " +
      fmtSigned(w.xg) +
      " · x_r " +
      fmtSigned(w.xr);
    if (readout && readout.textContent !== text) readout.textContent = text;
    if (scrub && document.activeElement !== scrub) scrub.value = phase.toFixed(1);
    if (phasePctEl) phasePctEl.textContent = Math.round(phase) + "%";
    if (mXg) mXg.textContent = fmtSigned(w.xg);
    if (mXr) mXr.textContent = fmtSigned(w.xr);
    if (mMag) mMag.textContent = "8.0× (" + fmtSigned(penTipMm) + ")";
    if (mZeta) mZeta.textContent = "ζ = 0.65 Eddy-Current";
    if (mPeriod) mPeriod.textContent = "T₀ = 12.0 s (m = 80 kg)";
    if (mPhase) mPhase.textContent = w.arrival;
    stage.setAttribute("aria-valuenow", String(Math.round(phase)));
    stage.setAttribute("aria-valuetext", text);
  }

  const controller = TURN.mount(stage, DATA.turn, {
    group: "spin",
    follow,
    onHold: () => {
      orbiting = false;
      if (orbitBtn) orbitBtn.setAttribute("aria-pressed", "false");
    },
    onFrame: (turned) => {
      if (!own && turned.values.spin !== undefined) {
        spinAngle = turned.values.spin;
      }
      updateUI();
    },
  });

  function applyPose() {
    own = true;
    controller.set(follow({ spin: spinAngle, phase, regime }));
    own = false;
  }

  function setPlaying(next) {
    playing = next && !still.matches;
    if (playBtn) {
      playBtn.setAttribute("aria-pressed", String(playing));
      playBtn.textContent = playing ? "Pause Wave" : "Play Wave";
    }
    if (playing) {
      last = 0;
      requestAnimationFrame(tick);
    }
  }

  function setCutaway(next) {
    cutaway = next;
    stage.setAttribute("data-cut", String(cutaway));
    if (cutBtn) cutBtn.setAttribute("aria-pressed", String(cutaway));
  }

  if (scrub) {
    scrub.addEventListener("input", (e) => {
      setPlaying(false);
      phase = Number(e.target.value) || 0;
      applyPose();
    });
  }

  if (playBtn) {
    playBtn.addEventListener("click", () => setPlaying(!playing));
  }

  if (orbitBtn) {
    orbitBtn.addEventListener("click", () => {
      orbiting = !orbiting && !still.matches;
      orbitBtn.setAttribute("aria-pressed", String(orbiting));
      if (orbiting && !playing) {
        last = 0;
        requestAnimationFrame(tick);
      }
    });
  }

  if (cutBtn) {
    cutBtn.addEventListener("click", () => setCutaway(!cutaway));
  }

  for (const btn of regimeBtns) {
    btn.addEventListener("click", () => {
      regime = btn.dataset.regime || "all";
      for (const b of regimeBtns) {
        const active = b === btn;
        b.classList.toggle("on", active);
        b.setAttribute("aria-pressed", String(active));
      }
      applyPose();
    });
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "x" || e.key === "X") {
      setCutaway(!cutaway);
    }
  });

  stage.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      setPlaying(false);
      phase = (phase + 2.5) % 100;
      applyPose();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      setPlaying(false);
      phase = (phase - 2.5 + 100) % 100;
      applyPose();
    } else if (e.key === " ") {
      e.preventDefault();
      setPlaying(!playing);
    }
  });

  function tick(now) {
    if (still.matches || (!playing && !orbiting)) return;
    if (!last) last = now;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (playing) {
      const speed = regime === "p" ? 18 : regime === "s" ? 14 : regime === "surface" ? 10 : 12;
      phase = (phase + speed * dt) % 100;
    }
    if (orbiting) {
      spinAngle = (spinAngle + 28 * dt) % 360;
    }
    applyPose();
    requestAnimationFrame(tick);
  }

  applyPose();
  if (playing) requestAnimationFrame(tick);
})();
`;

const body = k.plateHtml({
  fig: "Fig 3D",
  title: "Inertial pendulum seismograph",
  hint: "Drag to orbit · Scrub wave · X cutaway",
  readout: "Secondary S-Wave · x_g +5.80 mm · x_r -5.34 mm",
  keys: [
    { mark: "lit", label: "80 kg brass inertial proof mass, copper eddy-current damper & 8× recording stylus" },
    { mark: "raised", label: "Moving bedrock pier, suspension mast, permanent magnet & rotating seismogram drum" },
  ],
  caption:
    "How a suspended heavy proof mass stays nearly stationary by inertia while the bedrock frame and recording drum oscillate beneath its magnifying stylus. At seismic frequencies ω ≫ ω₀, the 80 kg brass proof mass lags ground motion x_g(t), producing relative displacement x_r = x_mass − x_g that is damped by a copper eddy-current vane and multiplied 8× across the rotating drum.",
  body: `<style>${out.css}\n${EXTRA_CSS}</style>${stage}`,
});

const page = k.pageHtml({
  title: "Inertial pendulum seismograph",
  theme,
  body,
  script: turnScript() + (verify ? `window.__isoVerify = ${JSON.stringify(out.verify)};\n` : "") + LIVE_SCRIPT,
  width: 720,
});

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const name = `seismograph-pendulum${verify ? "-verify" : ""}${theme === "light" ? "-light" : ""}.html`;
  writeFileSync(join(HERE, name), page);
  console.log(
    `wrote ${name} · ${(page.length / 1024).toFixed(0)} KB · ${out.report.parts} parts · ${out.report.layers.map((l) => `${l.name}: ${l.planar} planes, ${l.dynamic} dynamic`).join(" · ")} · build ${out.report.seconds.toFixed(1)} s`,
  );
}
