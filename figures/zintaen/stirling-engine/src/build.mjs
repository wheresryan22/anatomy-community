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
const HEIGHT = 480;
const AZIMUTH = 38;
const ELEVATION = 31;

const BASE = { x: -86, y: -62, w: 172, d: 124, r: 8 };
const BASE_H = 12;
const FOOT_H = 5;

const O1 = [-26, 0];
const O2 = [34, 0];

const PED_H = 4.5;
const BURNER_Z1 = 9.6;
const HOTCAP_Z1 = 12.0;

const BRIDGE_Z0 = 22.0;
const BRIDGE_Z1 = 26.0;
const COLDSINK_Z1 = 28.4;
const BORE_Z1 = 31.0;

const BEZEL_R = 20.5;
const BEZEL_Z1 = 28.8;

const DISP_TRAVEL = 3.4;

export const P = k.fitProjection(
  [
    ...k.boxCorners(BASE, -BASE_H - FOOT_H, 0),
    [O1[0] - 20, O1[1] - 20, 48],
    [O2[0] + BEZEL_R + 4, O2[1] + BEZEL_R + 4, 36],
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
  for (const [x, y] of byDepth(k.corners(BASE, 20))) {
    const svg =
      S(k.cylinder(x, y, 7, -BASE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }) +
      S(k.cylinder(x, y, 5.4, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" });
    put({
      name: `stand.foot.${x}.${y}`,
      layer: "back",
      at: [x, y, -BASE_H - FOOT_H],
      svg,
      shapes: [
        A.cylinder(x, y, 7, -BASE_H - FOOT_H, 1.6, { ground: true }),
        A.cylinder(x, y, 5.4, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6),
      ],
    });
  }

  const screws = k.corners(BASE, 8);
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

  const badge = { x: -74, y: 38, w: 42, d: 14, r: 1.8 };
  const badgeLines = [28, 20]
    .map((w, i) => k.lineOnTop([badge.x + 5, badge.y + 4.5 + i * 5], [badge.x + 5 + w, badge.y + 4.5 + i * 5], 1.4, P))
    .join("");
  const badgeSvg =
    S(k.slabOf(badge, 0, 1.4, P, 6, 0.3), { tone: "hi", crease: "none" }) +
    L(badgeLines, { tone: "lo", free: true });
  put({
    name: "stand.badge",
    layer: "back",
    at: [badge.x + badge.w / 2, badge.y + badge.d / 2, 0.7],
    svg: `<g data-mat="brass">${badgeSvg}</g>`,
    shapes: [A.slab(badge, 0, 1.4)],
  });

  const burnerPedSvg =
    S(k.cylinder(O1[0], O1[1], 12.0, 0, PED_H, P, 32, 0.5), { tone: "lo" }) +
    L(k.ring(O1[0], O1[1], 9.6, PED_H, P, 24), { tone: "faint" });
  put({
    name: "burner.pedestal",
    layer: "back",
    at: [O1[0], O1[1], PED_H / 2],
    svg: `<g data-mat="brass">${burnerPedSvg}</g>`,
    shapes: [A.cylinder(O1[0], O1[1], 12.0, 0, PED_H)],
  });

  const engF = VERT(O1[0], O1[1]);
  const burnerConeSvg =
    S(k.cylinder(O1[0], O1[1], 8.6, PED_H, BURNER_Z1 - PED_H, P, 32, 0.4), { tone: "mid" }) +
    k.dotsSvg(G.dotsOf(engF, BURNER_Z1, 7.2, 8, P, { all: true }), { size: 0.4 });
  put({
    name: "burner.cone",
    layer: "back",
    at: [O1[0], O1[1], (PED_H + BURNER_Z1) / 2],
    svg: `<g data-mat="copper">${burnerConeSvg}</g>`,
    shapes: [A.cylinder(O1[0], O1[1], 8.6, PED_H, BURNER_Z1 - PED_H)],
  });

  const hotcapSvg = S(
    k.cylinder(O1[0], O1[1], 4.4, BURNER_Z1, HOTCAP_Z1 - BURNER_Z1, P, 24, 0.3),
    { tone: "hi" },
  );
  put({
    name: "hotcap.dome",
    layer: "back",
    at: [O1[0], O1[1], (BURNER_Z1 + HOTCAP_Z1) / 2],
    svg: `<g data-mat="steel">${hotcapSvg}</g>`,
    shapes: [A.cylinder(O1[0], O1[1], 4.4, BURNER_Z1, HOTCAP_Z1 - BURNER_Z1)],
  });

  const manoPedSvg =
    S(k.cylinder(O2[0], O2[1], 12.2, 0, PED_H, P, 32, 0.6), { tone: "lo" }) +
    L(k.ring(O2[0], O2[1], 9.8, PED_H, P, 24), { tone: "faint" });
  put({
    name: "manometer.pedestal",
    layer: "back",
    at: [O2[0], O2[1], PED_H / 2],
    svg: manoPedSvg,
    shapes: [A.cylinder(O2[0], O2[1], 12.2, 0, PED_H)],
  });

  const manoF = VERT(O2[0], O2[1]);
  const manoBaseSvg =
    S(k.cylinder(O2[0], O2[1], 9.2, PED_H, HOTCAP_Z1 - PED_H, P, 32, 0.45), { tone: "mid" }) +
    k.dotsSvg(G.dotsOf(manoF, HOTCAP_Z1, 7.8, 8, P, { all: true }), { size: 0.38 });
  put({
    name: "manometer.manifold",
    layer: "back",
    at: [O2[0], O2[1], (PED_H + HOTCAP_Z1) / 2],
    svg: `<g data-mat="gunmetal">${manoBaseSvg}</g>`,
    shapes: [A.cylinder(O2[0], O2[1], 9.2, PED_H, HOTCAP_Z1 - PED_H)],
  });

  const regenArcs = [14.5, 17.5, 20.0].map((z) => G.arcOf(manoF, z, 8.2, P)).join("");
  const regenBodySvg =
    S(k.cylinder(O2[0], O2[1], 8.2, HOTCAP_Z1, BRIDGE_Z0 - HOTCAP_Z1, P, 32, 0.5), {
      tone: "mid",
      inner: L(regenArcs, { tone: "lo" }),
    });
  put({
    name: "regenerator.matrix",
    layer: "mid",
    at: [O2[0], O2[1], (HOTCAP_Z1 + BRIDGE_Z0) / 2],
    svg: `<g data-mat="copper">${regenBodySvg}</g>`,
    shapes: [A.cylinder(O2[0], O2[1], 8.2, HOTCAP_Z1, BRIDGE_Z0 - HOTCAP_Z1)],
  });

  const bridgePlan = { x: -36, y: -8.5, w: 80, d: 17, r: 6 };
  const bridgeBolts = [
    [-31, -4.8],
    [-31, 4.8],
    [39, -4.8],
    [39, 4.8],
  ];
  const bridgeSvg =
    S(k.slabOf(bridgePlan, BRIDGE_Z0, BRIDGE_Z1 - BRIDGE_Z0, P, 8, 0.8), {
      tone: "mid",
      inner: L(k.sideSeam(bridgePlan, BRIDGE_Z0 + 2.0, P, 8), { tone: "faint" }),
    }) +
    L(k.planOutline(k.insetPlan(bridgePlan, 3.2), BRIDGE_Z1, P, 8), { tone: "faint" }) +
    D(bridgeBolts.map(([x, y]) => at([x, y, BRIDGE_Z1])), { size: 0.45 });
  put({
    name: "frame.bridge",
    layer: "mid",
    at: [4, 0, (BRIDGE_Z0 + BRIDGE_Z1) / 2],
    svg: `<g data-mat="gunmetal">${bridgeSvg}</g>`,
    shapes: [A.slab(bridgePlan, BRIDGE_Z0, BRIDGE_Z1 - BRIDGE_Z0)],
  });

  const coldsinkSvg =
    S(k.cylinder(O1[0], O1[1], 9.4, BRIDGE_Z1, COLDSINK_Z1 - BRIDGE_Z1, P, 32, 0.4), { tone: "mid" }) +
    k.dotsSvg(G.dotsOf(engF, COLDSINK_Z1, 8.0, 8, P, { all: true }), { size: 0.38 });
  put({
    name: "coldsink.collar",
    layer: "mid",
    at: [O1[0], O1[1], (BRIDGE_Z1 + COLDSINK_Z1) / 2],
    svg: `<g data-mat="brass">${coldsinkSvg}</g>`,
    shapes: [A.cylinder(O1[0], O1[1], 9.4, BRIDGE_Z1, COLDSINK_Z1 - BRIDGE_Z1)],
  });

  const boreSvg = S(
    k.cylinder(O1[0], O1[1], 6.0, COLDSINK_Z1, BORE_Z1 - COLDSINK_Z1, P, 28, 0.35),
    { tone: "hi", crease: "lo" },
  );
  put({
    name: "coldsink.bore",
    layer: "mid",
    at: [O1[0], O1[1], (COLDSINK_Z1 + BORE_Z1) / 2],
    svg: `<g data-mat="steel">${boreSvg}</g>`,
    shapes: [A.cylinder(O1[0], O1[1], 6.0, COLDSINK_Z1, BORE_Z1 - COLDSINK_Z1)],
  });

  const dialTicks = k.radialTicks(O2[0], O2[1], BEZEL_R - 1.5, 20, 5, BEZEL_Z1, [2.2, 3.9], P);
  const dialBezelSvg =
    S(k.cylinder(O2[0], O2[1], BEZEL_R, BRIDGE_Z1, BEZEL_Z1 - BRIDGE_Z1, P, 40, 0.5), { tone: "mid" }) +
    L(k.ring(O2[0], O2[1], BEZEL_R - 1.5, BEZEL_Z1, P, 36), { tone: "lo" }) +
    L(k.ring(O2[0], O2[1], BEZEL_R - 5.4, BEZEL_Z1, P, 32), { tone: "faint" }) +
    L(dialTicks.minor, { tone: "lo" }) +
    L(dialTicks.major, { tone: "hi" });
  put({
    name: "manometer.bezel",
    layer: "mid",
    at: [O2[0], O2[1], (BRIDGE_Z1 + BEZEL_Z1) / 2],
    svg: `<g data-mat="steel">${dialBezelSvg}</g>`,
    shapes: [A.cylinder(O2[0], O2[1], BEZEL_R, BRIDGE_Z1, BEZEL_Z1 - BRIDGE_Z1)],
  });
}

export const T = turning(P, { recorder: R });
const displacer = T.group("displacer", { slide: { direction: [0, 0, 1], travel: DISP_TRAVEL } });
const crank = T.group("crank", { turn: { pivot: O1 } });
const pistonL = T.group("pistonL", {
  parent: crank,
  slide: { direction: [-0.86, 0, 0.51], travel: 4.6 },
});
const pistonR = T.group("pistonR", {
  parent: crank,
  slide: { direction: [0.86, 0, 0.51], travel: 4.6 },
});
const manometer = T.group("manometer", { turn: { pivot: O2 } });

const displacerLayer = T.layer("displacer");
const crankLayer = T.layer("crank");
T.stack(["back", "displacer", "mid", "crank"]);

export const follow = (values) => {
  const c = values.crank ?? 0;
  const rad = (c * Math.PI) / 180;
  const temp = values.temp !== undefined ? Math.max(600, Math.min(1100, values.temp)) : 850;
  const scale = 0.65 + 0.35 * ((temp - 600) / 500);
  const dispNorm = 0.5 * (1 + Math.sin(rad));
  const pistNorm = 0.5 * (1 - Math.cos(rad));
  const pNorm = 0.5 * (1 + Math.sin(rad + Math.PI / 4));
  const disp = dispNorm * 3.4;
  const swing = pistNorm * 4.6 * scale;
  const mano = -75 * pNorm * scale;
  return {
    ...values,
    crank: c,
    temp,
    displacer: disp,
    pistonL: swing,
    pistonR: swing,
    manometer: mano,
  };
};

export const poses = () => {
  const list = [];
  for (let deg = 0; deg < 1440; deg += 1) {
    list.push(follow({ crank: deg, temp: 1100 }));
  }
  return list;
};

T.round({
  name: "displacer.skirt",
  group: displacer,
  layer: displacerLayer,
  F: VERT(O1[0], O1[1]),
  s0: HOTCAP_Z1,
  s1: 13.8,
  r: 7.4,
  tone: "hi",
  crease: "lo",
  material: "copper",
});

T.round({
  name: "displacer.drum",
  group: displacer,
  layer: displacerLayer,
  F: VERT(O1[0], O1[1]),
  s0: 13.8,
  s1: 16.6,
  r: 5.0,
  tone: "mid",
  material: "steel",
});

T.round({
  name: "displacer.crown",
  group: displacer,
  layer: displacerLayer,
  F: VERT(O1[0], O1[1]),
  s0: 16.6,
  s1: 18.4,
  r: 7.4,
  tone: "hi",
  crease: "lo",
  material: "copper",
});

const linkRodPlan = { x: O1[0] + 5.2, y: -1.0, w: O2[0] - 8.4 - (O1[0] + 5.2), d: 5.2, r: 1.4 };
T.prism({
  name: "displacer.rod",
  group: displacer,
  layer: displacerLayer,
  plan: linkRodPlan,
  z: 13.8,
  h: 1.8,
  steps: 4,
  bevel: 0.25,
  tone: "hi",
  crease: "lo",
  material: "steel",
});

const clevisPlan = { x: O2[0] - 14.0, y: -1.4, w: 5.6, d: 6.0, r: 1.5 };
T.prism({
  name: "displacer.clevis",
  group: displacer,
  layer: displacerLayer,
  plan: clevisPlan,
  z: 15.6,
  h: 2.4,
  steps: 4,
  bevel: 0.3,
  tone: "hi",
  crease: "lo",
  material: "brass",
});

T.round({
  name: "crank.web",
  group: crank,
  layer: crankLayer,
  F: VERT(O1[0], O1[1]),
  s0: BORE_Z1,
  s1: 33.6,
  r: 7.8,
  tone: "mid",
  material: "gunmetal",
  details: {
    seams: [31.4, 33.2],
    ribs: { s0: 31.4, s1: 33.2, count: 32, fade: [0.08, 0.52], seams: true, tone: "lo" },
  },
});

const flywheelPlan = { x: O1[0] - 16.2, y: -3.4, w: 32.4, d: 6.8, r: 2.4 };
T.prism({
  name: "flywheel.rim",
  group: crank,
  layer: crankLayer,
  plan: flywheelPlan,
  z: 33.6,
  h: 2.0,
  steps: 4,
  bevel: 0.35,
  tone: "mid",
  crease: "lo",
  material: "brass",
});

for (const [idx, sign, pistGroup] of [
  [0, -1, pistonL],
  [1, 1, pistonR],
]) {
  const armPlan =
    sign < 0
      ? { x: O1[0] - 15.4, y: -2.2, w: 10.4, d: 4.4, r: 1.5 }
      : { x: O1[0] + 5.0, y: -2.2, w: 10.4, d: 4.4, r: 1.5 };
  T.prism({
    name: `conrods.arm.${idx}`,
    group: pistGroup,
    layer: crankLayer,
    plan: armPlan,
    z: 35.6,
    h: 1.8,
    steps: 4,
    bevel: 0.3,
    tone: "hi",
    crease: "lo",
    material: "steel",
  });

  const wx = O1[0] + sign * 11.2;
  T.round({
    name: `piston.cylinder.${idx}`,
    group: pistGroup,
    layer: crankLayer,
    F: VERT(wx, O1[1]),
    s0: 37.4,
    s1: 43.2,
    r: 4.6,
    tone: "hi",
    crease: "lo",
    material: "brass",
    details: {
      seams: [37.9, 42.7],
      ribs: { s0: 37.9, s1: 42.7, count: 28, fade: [0.08, 0.52], seams: true, tone: "lo" },
      bolts: [{ s: 43.2, r: 0, count: 1, size: 0.45 }],
    },
  });
}

T.round({
  name: "crank.journal",
  group: crank,
  layer: crankLayer,
  F: VERT(O1[0], O1[1]),
  s0: 35.6,
  s1: 40.2,
  r: 4.0,
  tone: "mid",
  material: "steel",
});

T.round({
  name: "crank.finial",
  group: crank,
  layer: crankLayer,
  F: VERT(O1[0], O1[1]),
  s0: 40.2,
  s1: 41.8,
  r: 2.8,
  tone: "hi",
  material: "chrome",
  details: { bolts: [{ s: 41.8, r: 0, count: 1, size: 0.42 }] },
});

T.round({
  name: "manometer.hub",
  group: manometer,
  layer: crankLayer,
  F: VERT(O2[0], O2[1]),
  s0: BEZEL_Z1,
  s1: BEZEL_Z1 + 1.4,
  r: 4.6,
  tone: "mid",
  material: "brass",
});

const needlePlan = { x: O2[0] - 6.0, y: -2.0, w: 20.5, d: 4.0, r: 1.5 };
T.prism({
  name: "manometer.needle",
  group: manometer,
  layer: crankLayer,
  plan: needlePlan,
  z: BEZEL_Z1 + 1.4,
  h: 1.3,
  steps: 4,
  bevel: 0.3,
  tone: "hi",
  crease: "lo",
  material: "gold",
});

T.round({
  name: "manometer.cap",
  group: manometer,
  layer: crankLayer,
  F: VERT(O2[0], O2[1]),
  s0: BEZEL_Z1 + 2.7,
  s1: BEZEL_Z1 + 3.7,
  r: 2.6,
  tone: "hi",
  material: "chrome",
  details: { bolts: [{ s: BEZEL_Z1 + 3.7, r: 0, count: 1, size: 0.4 }] },
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
const MID = layerOf("mid");

if (argv.includes("--audit")) {
  A.auditOrExit(R, P);
  await TA.orbitOrExit(T, R, P, {
    sweep: { at: (x) => follow({ crank: x }), from: 0, to: 1440, frame: 0.5 },
    workers: argv.includes("--workers"),
    quick: argv.includes("--quick"),
  });
}

const LABEL =
  "A Beta-type coaxial displacer Stirling heat engine on a cast plinth: a 90-degree-leading copper thermal displacer shuttles sealed working gas between a spirit-heated hot cap and a finned copper regenerator and cold sink to drive a power piston, spoked brass flywheel, and coupled pressure-volume indicator.";
const backSvg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: BACK });
const staticSvg = (list) =>
  `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg iso-layer" viewBox="0 0 ${WIDTH} ${HEIGHT}" aria-hidden="true">${list.join("")}</svg>`;

const stage = `<div class="iso-stage iso-turn se-stage" tabindex="0" role="slider" aria-label="Stirling heat engine: drag the flywheel or use arrow keys to turn the crankshaft through the 4-phase Stirling thermodynamic cycle" aria-valuemin="0" aria-valuemax="360" aria-valuenow="0" aria-valuetext="0 degrees, Isothermal Expansion, 850 K">${backSvg}${out.layerSvg("displacer", { width: WIDTH, height: HEIGHT })}${staticSvg(MID)}${out.layerSvg("crank", { width: WIDTH, height: HEIGHT })}</div>`;

const CONTROLS_HTML = `
<div class="se-controls" aria-label="Stirling engine thermodynamic controls">
  <div class="se-bar">
    <button type="button" class="se-btn" data-play aria-pressed="true">Pause</button>
    <label class="se-scrub-wrap">
      <span class="se-lbl">Crank θ</span>
      <input type="range" class="se-range" data-scrub min="0" max="360" step="1" value="0" aria-label="Crank angle degrees" />
      <span class="se-val" data-angle-val>0°</span>
    </label>
    <div class="se-presets" role="group" aria-label="Hot cap temperature presets">
      <button type="button" class="se-chip" data-temp="600">600 K Spirit</button>
      <button type="button" class="se-chip is-active" data-temp="850">850 K Solar</button>
      <button type="button" class="se-chip" data-temp="1100">1100 K Biogas</button>
    </div>
  </div>
  <div class="se-telemetry" aria-live="polite">
    <div class="se-metric"><span class="se-k">Cycle Phase</span><span class="se-v" data-m-phase>1 · Expansion</span></div>
    <div class="se-metric"><span class="se-k">Displacer Lead</span><span class="se-v" data-m-lead>+90° (+1.7 mm)</span></div>
    <div class="se-metric"><span class="se-k">Gas Pressure</span><span class="se-v" data-m-press>192 kPa</span></div>
    <div class="se-metric"><span class="se-k">Carnot Limit</span><span class="se-v" data-m-carnot>64.7% (850 K)</span></div>
    <div class="se-metric"><span class="se-k">Net Shaft Power</span><span class="se-v" data-m-power>42.4 W</span></div>
  </div>
</div>
`;

const EXTRA_CSS = `
.se-stage { cursor: grab; touch-action: none; user-select: none; }
.se-stage:active { cursor: grabbing; }
.se-controls {
  margin-top: 10px;
  padding: 10px 12px;
  border: 1px solid var(--anatomy-faint, rgba(128,128,128,0.22));
  border-radius: 8px;
  font-family: var(--anatomy-mono, monospace);
  font-size: 11px;
  color: var(--anatomy-ink, inherit);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.se-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
}
.se-btn, .se-chip {
  appearance: none;
  border: 1px solid var(--anatomy-faint, rgba(128,128,128,0.32));
  background: transparent;
  color: var(--anatomy-ink, inherit);
  font: inherit;
  padding: 3px 8px;
  border-radius: 5px;
  cursor: pointer;
  white-space: nowrap;
}
.se-chip.is-active, .se-btn[aria-pressed="true"] {
  border-color: var(--anatomy-ink, currentColor);
  font-weight: 600;
}
.se-lbl {
  white-space: nowrap;
}
.se-scrub-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1 1 160px;
}
.se-range {
  flex: 1;
  accent-color: currentColor;
  cursor: pointer;
}
.se-val {
  min-width: 32px;
  text-align: right;
  white-space: nowrap;
}
.se-presets {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.se-telemetry {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 6px 12px;
  padding-top: 6px;
  border-top: 1px solid var(--anatomy-faint, rgba(128,128,128,0.18));
}
.se-metric {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.se-k {
  font-size: 9.5px;
  color: var(--anatomy-muted, #777);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  white-space: nowrap;
}
.se-v {
  font-weight: 600;
  white-space: nowrap;
}
`;

const DATA = { turn: out.data };
const LIVE_SCRIPT = `
(() => {
  const DATA = ${JSON.stringify(DATA)};
  const follow = ${follow.toString()};
  const stage = document.querySelector(".se-stage");
  const readout = document.querySelector("[data-readout]");
  const scrub = document.querySelector("[data-scrub]");
  const angleVal = document.querySelector("[data-angle-val]");
  const playBtn = document.querySelector("[data-play]");
  const tempBtns = [...document.querySelectorAll("[data-temp]")];
  const mPhase = document.querySelector("[data-m-phase]");
  const mLead = document.querySelector("[data-m-lead]");
  const mPress = document.querySelector("[data-m-press]");
  const mCarnot = document.querySelector("[data-m-carnot]");
  const mPower = document.querySelector("[data-m-power]");
  const still = matchMedia("(prefers-reduced-motion: reduce)");

  let angle = 0;
  let temp = 850;
  let touring = !still.matches;
  let idle = 0;
  let last = 0;
  let own = false;
  let dragging = false;
  let dragStartAngle = 0;
  let dragBaseAngle = 0;

  function cyclePhaseOf(normDeg) {
    if (normDeg < 90) return ["1 · Expansion", "Isothermal Expansion"];
    if (normDeg < 180) return ["2 · Hot→Cold Regen", "Isochoric Regen (Hot→Cold)"];
    if (normDeg < 270) return ["3 · Compression", "Isothermal Compression"];
    return ["4 · Cold→Hot Regen", "Isochoric Regen (Cold→Hot)"];
  }

  function show(crankDeg, th) {
    const norm = (((crankDeg % 360) + 360) % 360);
    const rad = (norm * Math.PI) / 180;
    const pose = follow({ crank: crankDeg, temp: th });
    const [shortPhase, longPhase] = cyclePhaseOf(norm);
    const tc = 300;
    const carnot = (1 - tc / th) * 100;
    const pRatio = th / tc;
    const pMean = 101.3 * (0.55 + 0.35 * pRatio);
    const pAmp = 28.0 * (pRatio - 1);
    const pKpa = pMean + pAmp * Math.sin(rad + Math.PI / 4);
    const powerW = Math.max(8, (th - tc) * 0.077);
    const text = Math.round(norm) + "° · " + longPhase + " · " + pKpa.toFixed(0) + " kPa · η " + carnot.toFixed(1) + "%";
    if (readout && readout.textContent !== text) readout.textContent = text;
    if (scrub && document.activeElement !== scrub) scrub.value = String(Math.round(norm));
    if (angleVal) angleVal.textContent = Math.round(norm) + "°";
    if (mPhase) mPhase.textContent = shortPhase;
    if (mLead) mLead.textContent = "+90° (+" + pose.displacer.toFixed(1) + " mm)";
    if (mPress) mPress.textContent = pKpa.toFixed(0) + " kPa";
    if (mCarnot) mCarnot.textContent = carnot.toFixed(1) + "% (" + th + " K)";
    if (mPower) mPower.textContent = powerW.toFixed(1) + " W";
    if (playBtn) {
      playBtn.setAttribute("aria-pressed", String(touring));
      playBtn.textContent = touring ? "Pause" : "Play";
    }
    stage.setAttribute("aria-valuenow", String(Math.round(norm)));
    stage.setAttribute("aria-valuetext", Math.round(norm) + " degrees, " + longPhase + ", " + pKpa.toFixed(0) + " kPa");
  }

  const controller = TURN.mount(stage, DATA.turn, {
    group: "crank",
    follow,
    onHold: () => {
      touring = false;
      clearTimeout(idle);
    },
    onFrame: (turned) => {
      if (!own) {
        angle = turned.values.crank ?? angle;
      }
      show(turned.values.crank ?? angle, turned.values.temp ?? temp);
    },
  });

  function applyState() {
    own = true;
    controller.set({ crank: angle, temp });
    own = false;
  }

  function hold() {
    touring = false;
    clearTimeout(idle);
    if (playBtn) {
      playBtn.setAttribute("aria-pressed", "false");
      playBtn.textContent = "Play";
    }
    idle = setTimeout(() => {
      touring = !still.matches;
      last = 0;
      if (touring) requestAnimationFrame(tick);
    }, 3600);
  }

  if (playBtn) {
    playBtn.addEventListener("click", () => {
      clearTimeout(idle);
      touring = !touring;
      playBtn.setAttribute("aria-pressed", String(touring));
      playBtn.textContent = touring ? "Pause" : "Play";
      if (touring) {
        last = 0;
        requestAnimationFrame(tick);
      }
    });
  }

  if (scrub) {
    scrub.addEventListener("input", () => {
      hold();
      angle = Number(scrub.value) || 0;
      applyState();
    });
  }

  for (const btn of tempBtns) {
    btn.addEventListener("click", () => {
      hold();
      temp = Number(btn.getAttribute("data-temp")) || 850;
      for (const b of tempBtns) b.classList.toggle("is-active", b === btn);
      applyState();
    });
  }

  stage.addEventListener("pointerdown", (e) => {
    hold();
    stage.focus({ preventScroll: true });
    dragging = true;
    dragStartAngle = controller.angleAt(e.clientX, e.clientY, 36, "crank");
    dragBaseAngle = angle;
    if (stage.setPointerCapture) {
      try { stage.setPointerCapture(e.pointerId); } catch {}
    }
  });
  stage.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    hold();
    const cur = controller.angleAt(e.clientX, e.clientY, 36, "crank");
    angle = dragBaseAngle + (cur - dragStartAngle);
    applyState();
  });
  const endDrag = () => { dragging = false; };
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  stage.addEventListener("keydown", (e) => {
    const stepDeg = e.shiftKey ? 30 : 15;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      hold();
      angle += stepDeg;
      applyState();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      hold();
      angle -= stepDeg;
      applyState();
    } else if (e.key === " ") {
      e.preventDefault();
      if (playBtn) playBtn.click();
    } else if (e.key === "1") {
      e.preventDefault();
      if (tempBtns[0]) tempBtns[0].click();
    } else if (e.key === "2") {
      e.preventDefault();
      if (tempBtns[1]) tempBtns[1].click();
    } else if (e.key === "3") {
      e.preventDefault();
      if (tempBtns[2]) tempBtns[2].click();
    }
  });

  function tick(now) {
    if (!touring) return;
    if (!last) last = now;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const speed = 36 + (temp - 600) * 0.06;
    angle += speed * dt;
    applyState();
    requestAnimationFrame(tick);
  }

  applyState();
  if (touring) requestAnimationFrame(tick);
})();
`;

const body = k.plateHtml({
  fig: "Fig 3D",
  title: "Stirling heat engine",
  hint: "Drag flywheel · scrub θ · 1–3 T_H",
  readout: "0° · Isothermal Expansion · 184 kPa · η 64.7%",
  keys: [
    { mark: "raised", label: "90°-leading coaxial copper displacer, spirit burner hot cap, and wire-mesh regenerator" },
    { mark: "lit", label: "Power piston crosshead yokes, spoked brass flywheel, and coupled P–V manometer dial" },
  ],
  caption:
    "How a 90°-out-of-phase displacer shuttles sealed working gas between a heated hot cap and a finned cold sink to drive a power piston. As the copper displacer leads the power piston by +90° across the four-phase closed regenerative cycle, working gas expands at high pressure in the heated lower chamber and compresses at low pressure in the finned upper cold sink.",
  body: `<style>${out.css}\n${EXTRA_CSS}</style>${stage}${CONTROLS_HTML}`,
});

const page = k.pageHtml({
  title: "Stirling heat engine",
  theme,
  body,
  script: turnScript() + (verify ? `window.__isoVerify = ${JSON.stringify(out.verify)};\n` : "") + LIVE_SCRIPT,
  width: 680,
});

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const name = `stirling-engine${verify ? "-verify" : ""}${theme === "light" ? "-light" : ""}.html`;
  writeFileSync(join(HERE, name), page);
  console.log(
    `wrote ${name} · ${(page.length / 1024).toFixed(0)} KB · ${out.report.parts} parts · ${out.report.layers.map((l) => `${l.name}: ${l.planar} planes, ${l.dynamic} dynamic`).join(" · ")} · build ${out.report.seconds.toFixed(1)} s`,
  );
}
