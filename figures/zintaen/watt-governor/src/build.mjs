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
const GEARBOX_Z1 = 9.6;
const GUIDE_Z1 = 12.0;

const BRIDGE_Z0 = 22.0;
const BRIDGE_Z1 = 26.0;
const BEARING_Z1 = 28.4;
const NECK_Z1 = 31.0;

const BEZEL_R = 20.5;
const BEZEL_Z1 = 28.8;

const LIFT_MAX = 3.4;

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

  const govPedSvg =
    S(k.cylinder(O1[0], O1[1], 12.0, 0, PED_H, P, 32, 0.5), { tone: "lo" }) +
    L(k.ring(O1[0], O1[1], 9.6, PED_H, P, 24), { tone: "faint" });
  put({
    name: "governor.pedestal",
    layer: "back",
    at: [O1[0], O1[1], PED_H / 2],
    svg: govPedSvg,
    shapes: [A.cylinder(O1[0], O1[1], 12.0, 0, PED_H)],
  });

  const govF = VERT(O1[0], O1[1]);
  const govGearboxSvg =
    S(k.cylinder(O1[0], O1[1], 8.6, PED_H, GEARBOX_Z1 - PED_H, P, 32, 0.4), { tone: "mid" }) +
    k.dotsSvg(G.dotsOf(govF, GEARBOX_Z1, 7.2, 8, P, { all: true }), { size: 0.4 });
  put({
    name: "governor.gearbox",
    layer: "back",
    at: [O1[0], O1[1], (PED_H + GEARBOX_Z1) / 2],
    svg: `<g data-mat="gunmetal">${govGearboxSvg}</g>`,
    shapes: [A.cylinder(O1[0], O1[1], 8.6, PED_H, GEARBOX_Z1 - PED_H)],
  });

  const govGuideSvg = S(
    k.cylinder(O1[0], O1[1], 4.4, GEARBOX_Z1, GUIDE_Z1 - GEARBOX_Z1, P, 24, 0.3),
    { tone: "hi" },
  );
  put({
    name: "governor.guide",
    layer: "back",
    at: [O1[0], O1[1], (GEARBOX_Z1 + GUIDE_Z1) / 2],
    svg: `<g data-mat="steel">${govGuideSvg}</g>`,
    shapes: [A.cylinder(O1[0], O1[1], 4.4, GEARBOX_Z1, GUIDE_Z1 - GEARBOX_Z1)],
  });

  const valvePedSvg =
    S(k.cylinder(O2[0], O2[1], 12.2, 0, PED_H, P, 32, 0.6), { tone: "lo" }) +
    L(k.ring(O2[0], O2[1], 9.8, PED_H, P, 24), { tone: "faint" });
  put({
    name: "valve.pedestal",
    layer: "back",
    at: [O2[0], O2[1], PED_H / 2],
    svg: valvePedSvg,
    shapes: [A.cylinder(O2[0], O2[1], 12.2, 0, PED_H)],
  });

  const valveF = VERT(O2[0], O2[1]);
  const valveBaseSvg =
    S(k.cylinder(O2[0], O2[1], 9.2, PED_H, GUIDE_Z1 - PED_H, P, 32, 0.45), { tone: "mid" }) +
    k.dotsSvg(G.dotsOf(valveF, GUIDE_Z1, 7.8, 8, P, { all: true }), { size: 0.38 });
  put({
    name: "valve.base",
    layer: "back",
    at: [O2[0], O2[1], (PED_H + GUIDE_Z1) / 2],
    svg: `<g data-mat="gunmetal">${valveBaseSvg}</g>`,
    shapes: [A.cylinder(O2[0], O2[1], 9.2, PED_H, GUIDE_Z1 - PED_H)],
  });

  const valveArcs = [14.5, 17.5, 20.0].map((z) => G.arcOf(valveF, z, 8.2, P)).join("");
  const valveBodySvg =
    S(k.cylinder(O2[0], O2[1], 8.2, GUIDE_Z1, BRIDGE_Z0 - GUIDE_Z1, P, 32, 0.5), {
      tone: "mid",
      inner: L(valveArcs, { tone: "lo" }),
    });
  put({
    name: "valve.body",
    layer: "mid",
    at: [O2[0], O2[1], (GUIDE_Z1 + BRIDGE_Z0) / 2],
    svg: `<g data-mat="gunmetal">${valveBodySvg}</g>`,
    shapes: [A.cylinder(O2[0], O2[1], 8.2, GUIDE_Z1, BRIDGE_Z0 - GUIDE_Z1)],
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

  const bearingSvg =
    S(k.cylinder(O1[0], O1[1], 9.4, BRIDGE_Z1, BEARING_Z1 - BRIDGE_Z1, P, 32, 0.4), { tone: "mid" }) +
    k.dotsSvg(G.dotsOf(govF, BEARING_Z1, 8.0, 8, P, { all: true }), { size: 0.38 });
  put({
    name: "governor.bearing",
    layer: "mid",
    at: [O1[0], O1[1], (BRIDGE_Z1 + BEARING_Z1) / 2],
    svg: `<g data-mat="brass">${bearingSvg}</g>`,
    shapes: [A.cylinder(O1[0], O1[1], 9.4, BRIDGE_Z1, BEARING_Z1 - BRIDGE_Z1)],
  });

  const neckSvg = S(
    k.cylinder(O1[0], O1[1], 6.0, BEARING_Z1, NECK_Z1 - BEARING_Z1, P, 28, 0.35),
    { tone: "hi", crease: "lo" },
  );
  put({
    name: "governor.neck",
    layer: "mid",
    at: [O1[0], O1[1], (BEARING_Z1 + NECK_Z1) / 2],
    svg: `<g data-mat="steel">${neckSvg}</g>`,
    shapes: [A.cylinder(O1[0], O1[1], 6.0, BEARING_Z1, NECK_Z1 - BEARING_Z1)],
  });

  const dialTicks = k.radialTicks(O2[0], O2[1], BEZEL_R - 1.5, 20, 5, BEZEL_Z1, [2.2, 3.9], P);
  const dialBezelSvg =
    S(k.cylinder(O2[0], O2[1], BEZEL_R, BRIDGE_Z1, BEZEL_Z1 - BRIDGE_Z1, P, 40, 0.5), { tone: "mid" }) +
    L(k.ring(O2[0], O2[1], BEZEL_R - 1.5, BEZEL_Z1, P, 36), { tone: "lo" }) +
    L(k.ring(O2[0], O2[1], BEZEL_R - 5.4, BEZEL_Z1, P, 32), { tone: "faint" }) +
    L(dialTicks.minor, { tone: "lo" }) +
    L(dialTicks.major, { tone: "hi" });
  put({
    name: "valve.bezel",
    layer: "mid",
    at: [O2[0], O2[1], (BRIDGE_Z1 + BEZEL_Z1) / 2],
    svg: `<g data-mat="steel">${dialBezelSvg}</g>`,
    shapes: [A.cylinder(O2[0], O2[1], BEZEL_R, BRIDGE_Z1, BEZEL_Z1 - BRIDGE_Z1)],
  });
}

export const T = turning(P, { recorder: R });
const sleeve = T.group("sleeve", { slide: { direction: [0, 0, 1], travel: LIFT_MAX } });
const rotor = T.group("rotor", { turn: { pivot: O1 } });
const wingL = T.group("wingL", {
  parent: rotor,
  slide: { direction: [-0.86, 0, 0.51], travel: 4.6 },
});
const wingR = T.group("wingR", {
  parent: rotor,
  slide: { direction: [0.86, 0, 0.51], travel: 4.6 },
});
const throttle = T.group("throttle", { turn: { pivot: O2 } });

const sleeveLayer = T.layer("sleeve");
const rotorLayer = T.layer("rotor");
T.stack(["back", "sleeve", "mid", "rotor"]);

export const follow = (values) => {
  const rot = values.rotor ?? 0;
  const rpm =
    values.rpm !== undefined
      ? Math.max(80, Math.min(200, values.rpm))
      : 80 + 120 * (0.5 * (1 - Math.cos((rot * Math.PI) / 720)));
  const hRatio = (80 * 80) / (rpm * rpm);
  const u = Math.max(0, Math.min(1, (1 - hRatio) / (1 - (80 * 80) / (200 * 200))));
  const swing = u * 4.6;
  const lift = u * 3.4;
  const th = -u * 75;
  return { ...values, rotor: rot, rpm, wingL: swing, wingR: swing, sleeve: lift, throttle: th };
};

export const poses = () => Array.from({ length: 1440 }, (_, deg) => follow({ rotor: deg }));

T.round({
  name: "sleeve.bottom",
  group: sleeve,
  layer: sleeveLayer,
  F: VERT(O1[0], O1[1]),
  s0: GUIDE_Z1,
  s1: 13.8,
  r: 7.4,
  tone: "hi",
  crease: "lo",
  material: "brass",
});

T.round({
  name: "sleeve.spool",
  group: sleeve,
  layer: sleeveLayer,
  F: VERT(O1[0], O1[1]),
  s0: 13.8,
  s1: 16.6,
  r: 5.0,
  tone: "mid",
  material: "steel",
});

T.round({
  name: "sleeve.top",
  group: sleeve,
  layer: sleeveLayer,
  F: VERT(O1[0], O1[1]),
  s0: 16.6,
  s1: 18.4,
  r: 7.4,
  tone: "hi",
  crease: "lo",
  material: "brass",
});

const linkRodPlan = { x: O1[0] + 5.2, y: -1.0, w: O2[0] - 8.4 - (O1[0] + 5.2), d: 5.2, r: 1.4 };
T.prism({
  name: "sleeve.rod",
  group: sleeve,
  layer: sleeveLayer,
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
  name: "sleeve.clevis",
  group: sleeve,
  layer: sleeveLayer,
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
  name: "rotor.collar",
  group: rotor,
  layer: rotorLayer,
  F: VERT(O1[0], O1[1]),
  s0: NECK_Z1,
  s1: 33.6,
  r: 7.8,
  tone: "mid",
  material: "gunmetal",
  details: {
    seams: [31.4, 33.2],
    ribs: { s0: 31.4, s1: 33.2, count: 32, fade: [0.08, 0.52], seams: true, tone: "lo" },
  },
});

const crossbarPlan = { x: O1[0] - 16.2, y: -3.4, w: 32.4, d: 6.8, r: 2.4 };
T.prism({
  name: "rotor.crossbar",
  group: rotor,
  layer: rotorLayer,
  plan: crossbarPlan,
  z: 33.6,
  h: 2.0,
  steps: 4,
  bevel: 0.35,
  tone: "mid",
  crease: "lo",
  material: "steel",
});

for (const [idx, sign, wingGroup] of [
  [0, -1, wingL],
  [1, 1, wingR],
]) {
  const armPlan =
    sign < 0
      ? { x: O1[0] - 15.4, y: -2.2, w: 10.4, d: 4.4, r: 1.5 }
      : { x: O1[0] + 5.0, y: -2.2, w: 10.4, d: 4.4, r: 1.5 };
  T.prism({
    name: `rotor.arm.${idx}`,
    group: wingGroup,
    layer: rotorLayer,
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
    name: `rotor.weight.${idx}`,
    group: wingGroup,
    layer: rotorLayer,
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
  name: "rotor.hub",
  group: rotor,
  layer: rotorLayer,
  F: VERT(O1[0], O1[1]),
  s0: 35.6,
  s1: 40.2,
  r: 4.0,
  tone: "mid",
  material: "steel",
});

T.round({
  name: "rotor.finial",
  group: rotor,
  layer: rotorLayer,
  F: VERT(O1[0], O1[1]),
  s0: 40.2,
  s1: 41.8,
  r: 2.8,
  tone: "hi",
  material: "chrome",
  details: { bolts: [{ s: 41.8, r: 0, count: 1, size: 0.42 }] },
});

T.round({
  name: "throttle.hub",
  group: throttle,
  layer: rotorLayer,
  F: VERT(O2[0], O2[1]),
  s0: BEZEL_Z1,
  s1: BEZEL_Z1 + 1.4,
  r: 4.6,
  tone: "mid",
  material: "brass",
});

const vanePlan = { x: O2[0] - 6.0, y: -2.0, w: 20.5, d: 4.0, r: 1.5 };
T.prism({
  name: "throttle.vane",
  group: throttle,
  layer: rotorLayer,
  plan: vanePlan,
  z: BEZEL_Z1 + 1.4,
  h: 1.3,
  steps: 4,
  bevel: 0.3,
  tone: "hi",
  crease: "lo",
  material: "gold",
});

T.round({
  name: "throttle.cap",
  group: throttle,
  layer: rotorLayer,
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
    sweep: { at: (x) => follow({ rotor: x }), from: 0, to: 1440, frame: 0.5 },
    workers: argv.includes("--workers"),
    quick: argv.includes("--quick"),
  });
}

const LABEL =
  "A centrifugal flyball governor and coupled steam throttle valve on a cast plinth: as the twin brass flyweights spin faster around the vertical spindle, centrifugal force swings the flyweights outward and upward (h = g/ω²), lifting the sliding collar spool and transfer linkage rod to close the butterfly throttle vane proportionally.";
const backSvg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: BACK });
const staticSvg = (list) =>
  `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg iso-layer" viewBox="0 0 ${WIDTH} ${HEIGHT}" aria-hidden="true">${list.join("")}</svg>`;

const stage = `<div class="iso-stage iso-turn wg-stage" tabindex="0" role="slider" aria-label="Centrifugal flyball governor: drag or use arrow keys and keys 1 through 4 to adjust spindle speed in RPM, swing the flyweights outward, lift the sliding collar linkage, and modulate the throttle valve" aria-valuemin="80" aria-valuemax="200" aria-valuenow="80" aria-valuetext="80 RPM, sleeve 0.0 mm, throttle 100% open">${backSvg}${out.layerSvg("sleeve", { width: WIDTH, height: HEIGHT })}${staticSvg(MID)}${out.layerSvg("rotor", { width: WIDTH, height: HEIGHT })}</div>`;

const EXTRA_CSS = `
.wg-stage { cursor: grab; touch-action: none; user-select: none; }
.wg-stage:active { cursor: grabbing; }
`;

const DATA = { turn: out.data };
const LIVE_SCRIPT = `
(() => {
  const DATA = ${JSON.stringify(DATA)};
  const follow = ${follow.toString()};
  const stage = document.querySelector(".wg-stage");
  const readout = document.querySelector("[data-readout]");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let angle = 0;
  let rpm = 80;
  let targetRpm = still.matches ? 80 : 140;
  let touring = !still.matches;
  let idle = 0;
  let last = 0;
  let own = false;
  let dragging = false;
  let dragStartX = 0;
  let dragStartAngle = 0;
  let dragBaseAngle = 0;
  let dragBaseRpm = 80;

  const clampRpm = (v) => Math.max(80, Math.min(200, v));

  function show(curRpm) {
    const r = clampRpm(curRpm);
    const hRatio = (80 * 80) / (r * r);
    const u = Math.max(0, Math.min(1, (1 - hRatio) / (1 - (80 * 80) / (200 * 200))));
    const dispRpm = Math.round(r);
    const liftMm = u * 3.4;
    const valvePct = Math.round(100 - u * 85);
    const text = dispRpm + " RPM · lift " + liftMm.toFixed(1) + " mm · throttle " + valvePct + "%";
    if (readout && readout.textContent !== text) readout.textContent = text;
    stage.setAttribute("aria-valuenow", String(dispRpm));
    stage.setAttribute("aria-valuetext", dispRpm + " RPM, sleeve " + liftMm.toFixed(1) + " mm, throttle " + valvePct + "% open");
  }

  const controller = TURN.mount(stage, DATA.turn, {
    group: "rotor",
    follow,
    onHold: () => {
      touring = false;
      clearTimeout(idle);
    },
    onFrame: (turned) => {
      if (!own) {
        angle = turned.values.rotor ?? angle;
      }
      show(turned.values.rpm ?? rpm);
    },
  });

  function applyState() {
    own = true;
    controller.set({ rotor: angle, rpm });
    own = false;
  }

  function hold() {
    touring = false;
    clearTimeout(idle);
    idle = setTimeout(() => {
      touring = !still.matches;
      last = 0;
      requestAnimationFrame(tick);
    }, 3600);
  }

  stage.addEventListener("pointerdown", (e) => {
    hold();
    stage.focus({ preventScroll: true });
    dragging = true;
    dragStartX = e.clientX;
    dragStartAngle = controller.angleAt(e.clientX, e.clientY, 36, "rotor");
    dragBaseAngle = angle;
    dragBaseRpm = rpm;
    if (stage.setPointerCapture) {
      try { stage.setPointerCapture(e.pointerId); } catch {}
    }
  });
  stage.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    hold();
    const cur = controller.angleAt(e.clientX, e.clientY, 36, "rotor");
    const box = stage.getBoundingClientRect();
    const dRpm = ((e.clientX - dragStartX) / Math.max(160, box.width * 0.55)) * 120;
    rpm = targetRpm = clampRpm(dragBaseRpm + dRpm);
    angle = dragBaseAngle + (cur - dragStartAngle);
    applyState();
  });
  const endDrag = () => { dragging = false; };
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  stage.addEventListener("keydown", (e) => {
    const stepRpm = e.shiftKey ? 20 : 10;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      hold();
      rpm = targetRpm = clampRpm(targetRpm + stepRpm);
      angle += 24;
      applyState();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      hold();
      rpm = targetRpm = clampRpm(targetRpm - stepRpm);
      angle -= 24;
      applyState();
    } else if (e.key === "1") {
      e.preventDefault();
      hold();
      rpm = targetRpm = 80;
      angle += 18;
      applyState();
    } else if (e.key === "2") {
      e.preventDefault();
      hold();
      rpm = targetRpm = 120;
      angle += 18;
      applyState();
    } else if (e.key === "3") {
      e.preventDefault();
      hold();
      rpm = targetRpm = 160;
      angle += 18;
      applyState();
    } else if (e.key === "4") {
      e.preventDefault();
      hold();
      rpm = targetRpm = 200;
      angle += 18;
      applyState();
    }
  });

  function tick(now) {
    if (!touring) return;
    if (!last) last = now;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    rpm += (targetRpm - rpm) * Math.min(1, dt * 2.4);
    angle += rpm * 0.55 * dt;
    applyState();
    requestAnimationFrame(tick);
  }

  applyState();
  if (touring) requestAnimationFrame(tick);
})();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Centrifugal flyball governor",
  hint: "Drag · arrow keys · 1–4",
  readout: "80 RPM · lift 0.0 mm · throttle 100%",
  keys: [
    { mark: "raised", label: "Rotating spindle yoke, outward-swinging brass flyweights, and sliding collar linkage rod" },
    { mark: "lit", label: "Proportional steam throttle butterfly vane and calibration bezel" },
  ],
  caption:
    "An interactive 3D Watt centrifugal governor and proportional feedback valve. Increasing the spindle speed ω swings the twin brass flyweights outward and upward (h = g/ω²) while the spindle head remains seated on the bearing neck, pulling the sliding collar spool and horizontal transfer rod upward to close the coupled steam butterfly valve from 100% at 80 RPM down to 15% at 200 RPM.",
  body: `<style>${out.css}\n${EXTRA_CSS}</style>${stage}`,
});

const page = k.pageHtml({
  title: "Centrifugal flyball governor",
  theme,
  body,
  script: turnScript() + (verify ? `window.__isoVerify = ${JSON.stringify(out.verify)};\n` : "") + LIVE_SCRIPT,
  width: 680,
});

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const name = `watt-governor${verify ? "-verify" : ""}${theme === "light" ? "-light" : ""}.html`;
  writeFileSync(join(HERE, name), page);
  console.log(
    `wrote ${name} · ${(page.length / 1024).toFixed(0)} KB · ${out.report.parts} parts · ${out.report.layers.map((l) => `${l.name}: ${l.planar} planes, ${l.dynamic} dynamic`).join(" · ")} · build ${out.report.seconds.toFixed(1)} s`,
  );
}
