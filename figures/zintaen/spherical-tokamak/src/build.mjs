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

const WIDTH = 640;
const HEIGHT = 470;
const AZIMUTH = 38;
const ELEVATION = 30;
const DEG = Math.PI / 180;

const BASE = { x: -92, y: -74, w: 184, d: 148, r: 8 };
const BASE_H = 12;
const FOOT_H = 5;
const Z_PED = 1.2;
const Z_VESSEL_TOP = 12.0;
const Z_TORUS_TOP = 28.0;

export const P = k.fitProjection(
  [
    ...k.boxCorners(BASE, -BASE_H - FOOT_H, 0),
    [-56, -56, 0],
    [56, 56, 51],
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
const WORLD_F = { o: [0, 0, 0], a: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] };
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

function radialBoxPoly(r0, r1, hw, deg) {
  const rad = deg * DEG;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [
    [r0 * c + hw * s, r0 * s - hw * c],
    [r1 * c + hw * s, r1 * s - hw * c],
    [r1 * c - hw * s, r1 * s + hw * c],
    [r0 * c - hw * s, r0 * s + hw * c],
  ];
}

function wedgePoly(rIn, rOut, deg0, deg1, steps = 5) {
  const a0 = deg0 * DEG;
  const a1 = deg1 * DEG;
  const pts = [[rIn * Math.cos(a0), rIn * Math.sin(a0)]];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    pts.push([rOut * Math.cos(a), rOut * Math.sin(a)]);
  }
  pts.push([rIn * Math.cos(a1), rIn * Math.sin(a1)]);
  return pts;
}

function helicalStrutPoly(rIn, rOut, centerDeg, skewDeg) {
  const aIn0 = (centerDeg - skewDeg - 5.0) * DEG;
  const aIn1 = (centerDeg - skewDeg + 5.0) * DEG;
  const aOut1 = (centerDeg + skewDeg + 5.0) * DEG;
  const aOut0 = (centerDeg + skewDeg - 5.0) * DEG;
  return [
    [rIn * Math.cos(aIn0), rIn * Math.sin(aIn0)],
    [rOut * Math.cos(aOut0), rOut * Math.sin(aOut0)],
    [rOut * Math.cos(aOut1), rOut * Math.sin(aOut1)],
    [rIn * Math.cos(aIn1), rIn * Math.sin(aIn1)],
  ];
}

const ringPath = (r, steps = 72) =>
  Array.from(
    { length: steps },
    (_, j) => `${j ? "L" : "M"}${(r * Math.cos((j / steps) * Math.PI * 2)).toFixed(3)} ${(r * Math.sin((j / steps) * Math.PI * 2)).toFixed(3)}`,
  ).join("") + "Z";

const tickRay = (angle, r0, r1) =>
  `M${(Math.cos(angle) * r0).toFixed(3)} ${(Math.sin(angle) * r0).toFixed(3)}L${(Math.cos(angle) * r1).toFixed(3)} ${(Math.sin(angle) * r1).toFixed(3)}`;

function buildStatics() {
  for (const [x, y] of byDepth(k.corners(BASE, 20))) {
    const svg =
      S(k.cylinder(x, y, 7.2, -BASE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }) +
      S(k.cylinder(x, y, 5.5, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" });
    put({
      name: `stand.foot.${x}.${y}`,
      layer: "back",
      at: [x, y, -BASE_H - FOOT_H],
      svg,
      shapes: [
        A.cylinder(x, y, 7.2, -BASE_H - FOOT_H, 1.6, { ground: true }),
        A.cylinder(x, y, 5.5, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6),
      ],
    });
  }

  const screws = k.corners(BASE, 8.5);
  const baseSvg =
    S(k.slabOf(BASE, -BASE_H, BASE_H, P, 8, 1.5), {
      tone: "mid",
      inner: L(k.sideSeam(BASE, -BASE_H + 4, P, 8), { tone: "faint" }),
    }) +
    L(k.planOutline(k.insetPlan(BASE, 5), 0, P), { tone: "faint" }) +
    L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }) +
    D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 });
  put({
    name: "stand.base",
    layer: "back",
    at: [0, 0, -BASE_H],
    bias: 4,
    svg: baseSvg,
    shapes: [A.slab(BASE, -BASE_H, BASE_H, { ground: true })],
  });

  const badge = { x: -82, y: 49, w: 36, d: 14, r: 1.8 };
  const badgeLines = [24, 16]
    .map((w, i) => k.lineOnTop([badge.x + 5, badge.y + 4.5 + i * 5], [badge.x + 5 + w, badge.y + 4.5 + i * 5], Z_PED, P))
    .join("");
  const badgeSvg =
    S(k.slabOf(badge, 0, Z_PED, P, 6, 0.3), { tone: "hi", crease: "none" }) +
    L(badgeLines, { tone: "lo", free: true });
  put({
    name: "stand.badge",
    layer: "back",
    at: [badge.x + badge.w / 2, badge.y + badge.d / 2, Z_PED / 2],
    svg: `<g data-mat="brass">${badgeSvg}</g>`,
    shapes: [A.slab(badge, 0, Z_PED)],
  });

  const pedSvg =
    S(k.cylinder(0, 0, 52, 0, Z_PED, P, 48, 0.4), { tone: "lo" }) +
    L(k.ring(0, 0, 49.5, Z_PED, P, 48), { tone: "faint" });
  put({
    name: "stand.pedestal",
    layer: "back",
    at: [0, 0, Z_PED / 2],
    svg: pedSvg,
    shapes: [A.cylinder(0, 0, 52, 0, Z_PED)],
  });
}

export const T = turning(P, { recorder: R });
const rig = T.group("rig", { turn: { pivot: [0, 0] } });
const helix = T.group("helix", { turn: { pivot: [0, 0] } });
const flux = T.group("flux", { parent: rig, slide: { direction: [0, 0, 1], travel: 4.8 } });
const probe = T.group("probe", { parent: rig, slide: { direction: [-1, 0, 0], travel: 3.8 } });

const vesselLayer = T.layer("vessel");
const torusLayer = T.layer("torus");
const upperLayer = T.layer("upper");
T.stack(["back", "vessel", "torus", "upper"]);

export const follow = (values) => {
  const r = values.rig ?? 0;
  const h = values.helix ?? r * 2.0;
  const phase = (((h - r) % 360) + 360) % 360;
  const s = 0.5 - 0.5 * Math.cos(phase * DEG);
  const f = values.flux ?? s * 4.8;
  const p = values.probe ?? s * 3.8;
  return { ...values, rig: r, helix: h, flux: f, probe: p };
};

export const poses = () => {
  const list = [];
  for (let i = 0; i < 72; i++) {
    const deg = i * 5;
    list.push(follow({ rig: deg, helix: deg * 2 }));
  }
  for (const s of [0, 0.5, 1]) {
    list.push({ rig: 0, helix: s * 180, flux: s * 4.8, probe: s * 3.8 });
    list.push({ rig: 90, helix: 90 + s * 180, flux: s * 4.8, probe: s * 3.8 });
  }
  return list;
};

// --- LAYER 1: Lower Cryostat Pedestal, PF Coil, Tungsten Divertor & Rear TF Bases (z = 1.2..12.0) ---
T.round({
  name: "pedestal.ring",
  group: rig,
  layer: vesselLayer,
  F: VERT(0, 0),
  s0: Z_PED,
  s1: 4.2,
  r: 48,
  tone: "lo",
  crease: "lo",
  material: "steel",
  details: {
    seams: [2.7],
    bolts: [{ s: 4.2, r: 45.8, count: 16, size: 0.45, phase: 0.1 }],
  },
});

T.round({
  name: "pfcoils.lower",
  group: rig,
  layer: vesselLayer,
  F: VERT(0, 0),
  s0: 4.2,
  s1: 7.2,
  r: 44,
  tone: "mid",
  crease: "lo",
  material: "copper",
  details: {
    ribs: { s0: 4.6, s1: 6.8, count: 64, fade: [0.08, 0.5], seams: true, tone: "lo" },
    bolts: [{ s: 7.2, r: 41.6, count: 12, size: 0.42, phase: 0.25 }],
  },
});

const divertorFaceMarkup = () => {
  const ticks = [];
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    ticks.push(tickRay(a, 29.2, 38.0));
  }
  return `<path class="iso-line" data-tone="lo" d="${ringPath(38.0, 96)}"/><path class="iso-line" data-tone="lo" d="${ringPath(29.2, 96)}"/><path class="iso-line" data-tone="lo" data-free="both" d="${ticks.join("")}"/>`;
};

const divertorOuter = T.round({
  name: "divertor.target",
  group: rig,
  layer: vesselLayer,
  F: VERT(0, 0),
  s0: 7.2,
  s1: 9.8,
  r: 39,
  tone: "mid",
  crease: "lo",
  material: "gunmetal",
  details: { seams: [8.5] },
});
T.plane({
  part: divertorOuter,
  o: [0, 0, 9.8],
  u: [1, 0, 0],
  v: [0, 1, 0],
  svg: divertorFaceMarkup(),
  fade: [0.04, 0.3],
});

T.round({
  name: "divertor.dome",
  group: rig,
  layer: vesselLayer,
  F: VERT(0, 0),
  s0: 9.8,
  s1: Z_VESSEL_TOP,
  r: 28.0,
  tone: "hi",
  crease: "lo",
  material: "steel",
  details: { bolts: [{ s: Z_VESSEL_TOP, r: 25.5, count: 12, size: 0.4, phase: 0.15 }] },
});

const TF_REAR_ANGLES = [115, 150, 210, 245];
TF_REAR_ANGLES.forEach((deg, idx) => {
  T.prism({
    name: `tfcoils.lower.${idx}`,
    group: rig,
    layer: vesselLayer,
    F: WORLD_F,
    polygon: radialBoxPoly(30.2, 38.2, 2.3, deg),
    s0: 9.8,
    s1: Z_VESSEL_TOP,
    tone: "mid",
    crease: "lo",
    bevel: 0.3,
    material: "copper",
  });
});

T.prism({
  name: "vessel.shell.lower",
  group: rig,
  layer: vesselLayer,
  F: WORLD_F,
  polygon: radialBoxPoly(30.2, 38.2, 4.4, 180),
  s0: 9.8,
  s1: Z_VESSEL_TOP,
  tone: "lo",
  crease: "lo",
  bevel: 0.35,
  material: "steel",
});

T.prism({
  name: "nbi.mount.lower",
  group: rig,
  layer: vesselLayer,
  F: WORLD_F,
  polygon: radialBoxPoly(30.2, 38.2, 3.6, 0),
  s0: 9.8,
  s1: Z_VESSEL_TOP,
  tone: "mid",
  crease: "lo",
  bevel: 0.35,
  material: "steel",
});

// --- LAYER 2: Open Toroidal Plasma Core, Helical Magnetic Field Cage & Central Solenoid (z = 12.0..28.0) ---
T.round({
  name: "solenoid.base",
  group: helix,
  layer: torusLayer,
  F: VERT(0, 0),
  s0: Z_VESSEL_TOP,
  s1: 14.0,
  r: 33.8,
  tone: "lo",
  crease: "lo",
  material: "gunmetal",
  details: { seams: [13.0] },
});

for (let s = 0; s < 6; s++) {
  const centerDeg = s * 60;
  const deg0 = centerDeg - 19;
  const deg1 = centerDeg + 19;
  const poly = wedgePoly(14.6, 33.0, deg0, deg1, 5);
  const plasmaPart = T.prism({
    name: `plasma.sector.${s}`,
    group: helix,
    layer: torusLayer,
    F: WORLD_F,
    polygon: poly,
    s0: 14.0,
    s1: 23.6,
    tone: "hi",
    crease: "lo",
    bevel: 0.45,
    lit: true,
    material: "gold",
  });

  const aMid = centerDeg * DEG;
  const aSpan = 14 * DEG;
  const rInner = 17.5;
  const rMid = 23.8;
  const rOuter = 30.2;
  const p0 = [rInner * Math.cos(aMid - aSpan), rInner * Math.sin(aMid - aSpan)];
  const p1 = [rMid * Math.cos(aMid), rMid * Math.sin(aMid)];
  const p2 = [rOuter * Math.cos(aMid + aSpan), rOuter * Math.sin(aMid + aSpan)];
  const q0 = [rInner * Math.cos(aMid - aSpan * 0.5), rInner * Math.sin(aMid - aSpan * 0.5)];
  const q2 = [rOuter * Math.cos(aMid + aSpan * 0.5), rOuter * Math.sin(aMid + aSpan * 0.5)];
  const fieldLinesSvg =
    `<path class="iso-line" data-tone="lo" data-free="both" d="M${p0[0].toFixed(2)} ${p0[1].toFixed(2)}L${p1[0].toFixed(2)} ${p1[1].toFixed(2)}L${p2[0].toFixed(2)} ${p2[1].toFixed(2)}"/>` +
    `<path class="iso-line" data-tone="faint" data-free="both" d="M${q0[0].toFixed(2)} ${q0[1].toFixed(2)}L${q2[0].toFixed(2)} ${q2[1].toFixed(2)}"/>`;
  T.plane({
    part: plasmaPart,
    o: [0, 0, 23.6],
    u: [1, 0, 0],
    v: [0, 1, 0],
    svg: fieldLinesSvg,
    fade: [0.04, 0.3],
  });

  T.prism({
    name: `helix.tube.${s}`,
    group: helix,
    layer: torusLayer,
    F: WORLD_F,
    polygon: helicalStrutPoly(15.0, 31.8, centerDeg, 11),
    s0: 23.6,
    s1: 26.0,
    tone: "hi",
    crease: "lo",
    bevel: 0.35,
    lit: true,
    material: "chrome",
  });
}

T.round({
  name: "solenoid.collar",
  group: helix,
  layer: torusLayer,
  F: VERT(0, 0),
  s0: 23.6,
  s1: 26.0,
  r: 12.0,
  tone: "mid",
  crease: "lo",
  material: "copper",
  details: { ribs: { s0: 23.9, s1: 25.7, count: 32, fade: [0.08, 0.5], seams: true, tone: "lo" } },
});

// Narrow inner bucking neck (r = 16.2) leaves the entire outer plasma torus & helical tubes (r = 16.2..33.0) open from above!
T.round({
  name: "vessel.shroud.upper",
  group: helix,
  layer: torusLayer,
  F: VERT(0, 0),
  s0: 26.0,
  s1: Z_TORUS_TOP,
  r: 16.2,
  tone: "mid",
  crease: "lo",
  material: "steel",
  details: {
    seams: [27.0],
    bolts: [{ s: Z_TORUS_TOP, r: 14.4, count: 12, size: 0.4, phase: 0.15 }],
  },
});

// --- LAYER 3: Upper Central Solenoid, PF1 Crown Coil, Rear Cutaway TF Limbs, Flux Core & NBI Probe (z = 28.0..49.0) ---
T.round({
  name: "divertor.upper",
  group: rig,
  layer: upperLayer,
  F: VERT(0, 0),
  s0: Z_TORUS_TOP,
  s1: 31.2,
  r: 13.8,
  tone: "mid",
  crease: "lo",
  material: "copper",
  details: {
    ribs: { s0: 28.4, s1: 30.8, count: 36, fade: [0.08, 0.5], seams: true, tone: "lo" },
  },
});

T.round({
  name: "pfcoils.upper",
  group: rig,
  layer: upperLayer,
  F: VERT(0, 0),
  s0: 31.2,
  s1: 34.0,
  r: 19.5,
  tone: "mid",
  crease: "lo",
  material: "copper",
  details: {
    ribs: { s0: 31.6, s1: 33.6, count: 44, fade: [0.08, 0.5], seams: true, tone: "lo" },
    bolts: [{ s: 34.0, r: 17.5, count: 12, size: 0.42, phase: 0.1 }],
  },
});

TF_REAR_ANGLES.forEach((deg, idx) => {
  T.prism({
    name: `tfcoils.upper.${idx}`,
    group: rig,
    layer: upperLayer,
    F: WORLD_F,
    polygon: radialBoxPoly(12.2, 37.5, 2.2, deg),
    s0: 34.0,
    s1: 36.8,
    tone: "hi",
    crease: "lo",
    bevel: 0.35,
    material: "copper",
  });
});

T.prism({
  name: "vessel.shell.upper",
  group: rig,
  layer: upperLayer,
  F: WORLD_F,
  polygon: radialBoxPoly(12.2, 36.5, 4.0, 180),
  s0: 34.0,
  s1: 37.4,
  tone: "mid",
  crease: "lo",
  bevel: 0.4,
  material: "steel",
});

T.prism({
  name: "nbi.injector.duct",
  group: rig,
  layer: upperLayer,
  F: WORLD_F,
  polygon: radialBoxPoly(12.2, 34.5, 3.8, 0),
  s0: 34.0,
  s1: 37.4,
  tone: "mid",
  crease: "lo",
  bevel: 0.4,
  material: "steel",
});

T.round({
  name: "solenoid.column.upper",
  group: rig,
  layer: upperLayer,
  F: VERT(0, 0),
  s0: 34.0,
  s1: 37.4,
  r: 10.2,
  tone: "mid",
  crease: "lo",
  material: "copper",
  details: {
    ribs: { s0: 34.4, s1: 37.0, count: 28, fade: [0.08, 0.5], seams: true, tone: "lo" },
    bolts: [{ s: 37.4, r: 8.2, count: 8, size: 0.4, phase: 0.2 }],
  },
});

T.prism({
  name: "probe.actuator",
  group: probe,
  layer: upperLayer,
  plan: { x: 21.5, y: -2.4, w: 12.2, d: 4.8, r: 1.2 },
  z: 37.52,
  h: 2.6,
  steps: 4,
  bevel: 0.35,
  tone: "hi",
  crease: "lo",
  material: "brass",
});

T.prism({
  name: "probe.lance",
  group: probe,
  layer: upperLayer,
  plan: { x: 16.8, y: -1.3, w: 4.7, d: 2.6, r: 0.7 },
  z: 37.85,
  h: 1.9,
  steps: 4,
  bevel: 0.25,
  tone: "hi",
  lit: true,
  material: "chrome",
});

T.round({
  name: "fluxslug.plunger",
  group: flux,
  layer: upperLayer,
  F: VERT(0, 0),
  s0: 37.52,
  s1: 42.2,
  r: 5.8,
  tone: "hi",
  crease: "lo",
  lit: true,
  material: "chrome",
});

T.round({
  name: "fluxslug.crown",
  group: flux,
  layer: upperLayer,
  F: VERT(0, 0),
  s0: 42.2,
  s1: 44.2,
  r: 8.2,
  tone: "hi",
  crease: "lo",
  material: "brass",
  details: {
    ribs: { s0: 42.5, s1: 43.9, count: 24, fade: [0.08, 0.5], seams: true, tone: "lo" },
    bolts: [{ s: 44.2, r: 5.4, count: 6, size: 0.42, phase: 0.3 }],
  },
});

buildStatics();
export const out = T.build({ statics: R.items, poses, verify });
A.settle(R, P);

const layerOf = (name) =>
  R.items
    .filter((item) => item.layer === name)
    .sort((a, b) => a.key - b.key)
    .map((item) => item.svg);

const BACK = [`<path class="iso-halo" d="${k.haloOf(BASE, -BASE_H - FOOT_H, BASE_H, P)}"/>`, ...layerOf("back")];

if (argv.includes("--audit")) {
  A.auditOrExit(R, P);
  await TA.orbitOrExit(T, R, P, {
    sweep: { at: (x) => follow({ rig: x }), from: 0, to: 360, frame: 1.0 },
    random: 240,
    step: 0.05,
    depthAngles: 12,
    depthEvents: 12,
    posedStep: 3.0,
    workers: argv.includes("--workers"),
    quick: argv.includes("--quick"),
  });
}

const LABEL =
  "A cutaway 3D spherical tokamak magnetic fusion confinement rig on a cryostat plinth: D-shaped copper toroidal field coils, upper and lower poloidal equilibrium coils, and an inductive central solenoid with a translating flux ramp plunger twist magnetic field lines around a glowing toroidal plasma core to cancel grad-B particle drift.";
const backSvg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: BACK });

const stage = `<div class="iso-stage iso-turn tk-stage" tabindex="0" role="slider" aria-label="Tokamak magnetic fusion torus: drag to orbit or scrub the helical plasma field cage and central solenoid flux ramp" aria-valuemin="0" aria-valuemax="100" aria-valuenow="35" aria-valuetext="H-Mode · q95 2.10 · Ip 11.4 MA · α 14.8°">${backSvg}${out.layerSvg("vessel", { width: WIDTH, height: HEIGHT })}${out.layerSvg("torus", { width: WIDTH, height: HEIGHT })}${out.layerSvg("upper", { width: WIDTH, height: HEIGHT })}</div>`;

const CONTROLS_HTML = `
<div class="tk-panel" aria-label="Tokamak magnetic confinement controls and telemetry">
  <div class="tk-row tk-scrub-row">
    <label class="tk-label" for="tk-scrub">Solenoid Flux Ramp &amp; Helical Phase <span id="tk-scrub-val">35%</span></label>
    <input id="tk-scrub" data-scrub type="range" min="0" max="100" value="35" step="1" aria-label="Solenoid Flux Ramp and Helical Phase 0 to 100 percent" />
    <div class="tk-btns">
      <button type="button" id="tk-play" class="tk-btn" aria-pressed="true">Pause</button>
      <button type="button" id="tk-orbit" class="tk-btn" aria-pressed="false" title="Toggle 3D cutaway bearing">Cutaway (X)</button>
    </div>
  </div>
  <div class="tk-row tk-regimes" role="group" aria-label="Confinement Regime Presets">
    <button type="button" class="tk-chip" data-regime="0" aria-pressed="false">q = 3.2 L-Mode Edge</button>
    <button type="button" class="tk-chip" data-regime="1" aria-pressed="true">q = 2.1 H-Mode Pedestal</button>
    <button type="button" class="tk-chip" data-regime="2" aria-pressed="false">q = 1.05 Sawtooth Core Limit</button>
  </div>
  <div class="tk-telemetry" role="region" aria-label="Live fusion plasma telemetry">
    <div class="tk-metric"><span class="tk-k">Toroidal B<sub>&phi;</sub></span><span class="tk-v" id="tk-bphi">5.30 T</span></div>
    <div class="tk-metric"><span class="tk-k">Plasma I<sub>p</sub></span><span class="tk-v" id="tk-ip">11.4 MA</span></div>
    <div class="tk-metric"><span class="tk-k">Poloidal B<sub>&theta;</sub></span><span class="tk-v" id="tk-btheta">1.40 T</span></div>
    <div class="tk-metric"><span class="tk-k">Safety q<sub>95</sub></span><span class="tk-v" id="tk-q95">2.10</span></div>
    <div class="tk-metric"><span class="tk-k">Pitch &alpha;</span><span class="tk-v" id="tk-pitch">14.8&deg;</span></div>
    <div class="tk-metric"><span class="tk-k">Lawson nT&tau;<sub>E</sub></span><span class="tk-v" id="tk-lawson">4.2 &times; 10<sup>21</sup> keV&middot;s/m<sup>3</sup></span></div>
  </div>
</div>`;

const EXTRA_CSS = `
.tk-stage { cursor: grab; touch-action: none; user-select: none; }
.tk-stage:active { cursor: grabbing; }
.tk-panel {
  margin-top: 10px;
  padding: 10px 12px;
  border: 1px solid var(--anatomy-lo);
  border-radius: 6px;
  background: var(--anatomy-face);
  display: grid;
  gap: 8px;
  font: 11.5px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: var(--anatomy-text);
}
.tk-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.tk-scrub-row input[type="range"] {
  flex: 1 1 150px;
  accent-color: var(--anatomy-strong);
  cursor: pointer;
}
.tk-label {
  font-weight: 500;
  color: var(--anatomy-muted);
  min-width: 215px;
}
.tk-label span {
  color: var(--anatomy-strong);
}
.tk-btns, .tk-regimes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tk-btn, .tk-chip {
  font: 11px/1.3 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  background: var(--anatomy-paper);
  color: var(--anatomy-text);
  border: 1px solid var(--anatomy-lo);
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
}
.tk-btn:hover, .tk-chip:hover {
  border-color: var(--anatomy-mid);
  color: var(--anatomy-strong);
}
.tk-btn[aria-pressed="true"], .tk-chip[aria-pressed="true"] {
  background: var(--anatomy-strong);
  border-color: var(--anatomy-strong);
  color: var(--anatomy-paper);
}
.tk-telemetry {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px 10px;
  padding-top: 6px;
  border-top: 1px solid var(--anatomy-faint);
}
@media (max-width: 520px) {
  .tk-telemetry { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
.tk-metric {
  display: flex;
  justify-content: space-between;
  gap: 6px;
}
.tk-k { color: var(--anatomy-muted); }
.tk-v { color: var(--anatomy-strong); font-weight: 600; font-variant-numeric: tabular-nums; }
`;

const DATA = { turn: out.data };
const LIVE_SCRIPT = `
(() => {
  const DATA = ${JSON.stringify(DATA)};
  const follow = ${follow.toString()};
  const DEG = Math.PI / 180;
  const stage = document.querySelector(".tk-stage");
  const readout = document.querySelector("[data-readout]");
  const scrub = document.getElementById("tk-scrub");
  const scrubVal = document.getElementById("tk-scrub-val");
  const btnPlay = document.getElementById("tk-play");
  const btnOrbit = document.getElementById("tk-orbit");
  const regimeBtns = [...document.querySelectorAll("[data-regime]")];
  const elBphi = document.getElementById("tk-bphi");
  const elIp = document.getElementById("tk-ip");
  const elBtheta = document.getElementById("tk-btheta");
  const elQ95 = document.getElementById("tk-q95");
  const elPitch = document.getElementById("tk-pitch");
  const elLawson = document.getElementById("tk-lawson");
  const still = matchMedia("(prefers-reduced-motion: reduce)");

  const REGIMES = [
    { name: "L-Mode Edge", short: "L-Mode", qBase: 3.2, ipBase: 7.5, bphi: 5.3, lawsonBase: 1.6, probeBias: 0.6 },
    { name: "H-Mode Pedestal", short: "H-Mode", qBase: 2.1, ipBase: 11.4, bphi: 5.3, lawsonBase: 4.2, probeBias: 1.9 },
    { name: "Sawtooth Core Limit", short: "Sawtooth", qBase: 1.05, ipBase: 15.0, bphi: 5.3, lawsonBase: 5.8, probeBias: 3.4 },
  ];

  let regimeIdx = 1;
  let pct = 35;
  let rigAngle = 0;
  let cutawayAlt = false;
  let playing = !still.matches;
  let last = 0;
  let own = true;

  function computePhysics(p, rIdx) {
    const reg = REGIMES[rIdx] || REGIMES[1];
    const ramp = p / 100;
    const bphi = reg.bphi;
    const ip = reg.ipBase * (0.72 + 0.38 * ramp);
    const btheta = (ip / 11.4) * 1.40;
    const q95 = Math.max(0.95, reg.qBase * (1.15 - 0.28 * ramp));
    const pitchDeg = Math.atan2(btheta, bphi) / DEG;
    const lawson = reg.lawsonBase * (0.65 + 0.55 * Math.sin(ramp * Math.PI * 0.85));
    const fluxStroke = ramp * 4.8;
    const probeStroke = Math.min(3.8, reg.probeBias * 0.55 + ramp * 1.8);
    const helixAngle = rigAngle + ramp * 360;
    return { reg, bphi, ip, btheta, q95, pitchDeg, lawson, fluxStroke, probeStroke, helixAngle };
  }

  function updateUI(phys) {
    const pctRound = Math.round(pct);
    if (scrub && Number(scrub.value) !== pctRound) scrub.value = String(pctRound);
    if (scrubVal) scrubVal.textContent = pctRound + "%";
    if (elBphi) elBphi.textContent = phys.bphi.toFixed(2) + " T";
    if (elIp) elIp.textContent = phys.ip.toFixed(1) + " MA";
    if (elBtheta) elBtheta.textContent = phys.btheta.toFixed(2) + " T";
    if (elQ95) elQ95.textContent = phys.q95.toFixed(2);
    if (elPitch) elPitch.textContent = phys.pitchDeg.toFixed(1) + "°";
    if (elLawson) elLawson.innerHTML = phys.lawson.toFixed(1) + " &times; 10<sup>21</sup> keV&middot;s/m<sup>3</sup>";

    const text =
      phys.reg.short +
      " · q95 " +
      phys.q95.toFixed(2) +
      " · Ip " +
      phys.ip.toFixed(1) +
      " MA · α " +
      phys.pitchDeg.toFixed(1) +
      "°";
    if (readout && readout.textContent !== text) readout.textContent = text;
    stage.setAttribute("aria-valuenow", String(pctRound));
    stage.setAttribute("aria-valuetext", text);
  }

  const controller = TURN.mount(stage, DATA.turn, {
    group: "rig",
    follow,
    onHold: () => {
      playing = false;
      if (btnPlay) {
        btnPlay.setAttribute("aria-pressed", "false");
        btnPlay.textContent = "Play";
      }
    },
    onFrame: (turned) => {
      if (!own) {
        rigAngle = turned.values.rig ?? 0;
        const h = turned.values.helix ?? 0;
        const rel = (((h - rigAngle) % 360) + 360) % 360;
        pct = (rel / 360) * 100;
      }
      updateUI(computePhysics(pct, regimeIdx));
    },
  });
  own = false;

  function applyState() {
    const phys = computePhysics(pct, regimeIdx);
    own = true;
    controller.set({
      rig: rigAngle,
      helix: phys.helixAngle,
      flux: phys.fluxStroke,
      probe: phys.probeStroke,
    });
    own = false;
    updateUI(phys);
  }

  function pauseTour() {
    playing = false;
    if (btnPlay) {
      btnPlay.setAttribute("aria-pressed", "false");
      btnPlay.textContent = "Play";
    }
  }

  if (scrub) {
    scrub.addEventListener("input", () => {
      pauseTour();
      pct = Number(scrub.value);
      applyState();
    });
  }

  if (btnPlay) {
    btnPlay.setAttribute("aria-pressed", String(playing));
    btnPlay.textContent = playing ? "Pause" : "Play";
    btnPlay.addEventListener("click", () => {
      playing = !playing;
      btnPlay.setAttribute("aria-pressed", String(playing));
      btnPlay.textContent = playing ? "Pause" : "Play";
      if (playing) {
        last = 0;
        requestAnimationFrame(tick);
      }
    });
  }

  function toggleCutaway() {
    pauseTour();
    cutawayAlt = !cutawayAlt;
    rigAngle = cutawayAlt ? 45 : 0;
    if (btnOrbit) btnOrbit.setAttribute("aria-pressed", String(cutawayAlt));
    applyState();
  }

  if (btnOrbit) {
    btnOrbit.addEventListener("click", toggleCutaway);
  }

  regimeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      pauseTour();
      regimeIdx = Number(btn.dataset.regime) || 0;
      regimeBtns.forEach((b, i) => b.setAttribute("aria-pressed", String(i === regimeIdx)));
      applyState();
    });
  });

  stage.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      pauseTour();
      pct = (pct + 4) % 100;
      applyState();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      pauseTour();
      pct = (pct - 4 + 100) % 100;
      applyState();
    } else if (e.key === "x" || e.key === "X") {
      e.preventDefault();
      toggleCutaway();
    } else if (e.key === " ") {
      e.preventDefault();
      if (btnPlay) btnPlay.click();
    }
  });

  function tick(now) {
    if (!playing || still.matches) return;
    if (!last) last = now;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    pct = (pct + dt * 11.5) % 100;
    applyState();
    requestAnimationFrame(tick);
  }

  applyState();
  if (playing && !still.matches) requestAnimationFrame(tick);
})();
`;

const body = k.plateHtml({
  fig: "Fig 3D",
  title: "Tokamak magnetic fusion torus",
  hint: "Drag to orbit · scrub flux & pitch",
  readout: "H-Mode · q95 2.10 · Ip 11.4 MA · α 14.8°",
  keys: [
    { mark: "lit", label: "Glowing D-shaped toroidal fusion plasma core & helical magnetic field cage (q = r Bφ / R0 Bθ)" },
    { mark: "raised", label: "Copper D-shaped toroidal field coils, poloidal rings, inductive central solenoid & NBI diagnostic lance" },
  ],
  caption:
    "How D-shaped toroidal field coils and an inductive central solenoid twist magnetic field lines into a helical cage that cancels grad-B plasma drift. A pure toroidal field Bφ has a 1/R radial gradient that drifts ions and electrons to opposite vertical walls; ramping the central solenoid induces a toroidal plasma current Ip whose poloidal field Bθ twists the field lines into a closed helical cage of safety factor q95.",
  body: `<style>${out.css}\n${EXTRA_CSS}</style>${stage}${CONTROLS_HTML}`,
});

const page = k.pageHtml({
  title: "Tokamak magnetic fusion torus",
  theme,
  body,
  script: turnScript() + (verify ? `window.__isoVerify = ${JSON.stringify(out.verify)};\n` : "") + LIVE_SCRIPT,
  width: 680,
});

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const name = `spherical-tokamak${verify ? "-verify" : ""}${theme === "light" ? "-light" : ""}.html`;
  writeFileSync(join(HERE, name), page);
  console.log(
    `wrote ${name} · ${(page.length / 1024).toFixed(0)} KB · ${out.report.parts} parts · ${out.report.layers.map((l) => `${l.name}: ${l.planar} planes, ${l.dynamic} dynamic`).join(" · ")} · build ${out.report.seconds.toFixed(1)} s`,
  );
}
