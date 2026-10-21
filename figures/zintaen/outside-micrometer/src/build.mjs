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

const O1 = [-28, 0];
const O2 = [32, 0];

const ANVIL_BASE_H = 4.0;
const ANVIL_NECK_Z1 = 6.8;
const ANVIL_TIP_Z1 = 9.0;

const BRIDGE_Z0 = 23.0;
const BRIDGE_Z1 = 27.0;
const SLEEVE_FLANGE_Z1 = 28.6;
const SLEEVE_TOP = 32.0;

const BEZEL_R = 20.5;
const BEZEL_Z1 = 29.8;

const TRAVEL_MAX = 3.2;

export const P = k.fitProjection(
  [
    ...k.boxCorners(BASE, -BASE_H - FOOT_H, 0),
    [O1[0] - 12, O1[1] - 12, 55],
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

  const anvilBaseSvg =
    S(k.cylinder(O1[0], O1[1], 10.8, 0, ANVIL_BASE_H, P, 32, 0.5), { tone: "lo" }) +
    L(k.ring(O1[0], O1[1], 8.6, ANVIL_BASE_H, P, 24), { tone: "faint" });
  put({
    name: "anvil.base",
    layer: "back",
    at: [O1[0], O1[1], ANVIL_BASE_H / 2],
    svg: anvilBaseSvg,
    shapes: [A.cylinder(O1[0], O1[1], 10.8, 0, ANVIL_BASE_H)],
  });

  const anvilNeckSvg = S(
    k.cylinder(O1[0], O1[1], 6.6, ANVIL_BASE_H, ANVIL_NECK_Z1 - ANVIL_BASE_H, P, 28, 0.35),
    { tone: "mid" },
  );
  put({
    name: "anvil.neck",
    layer: "back",
    at: [O1[0], O1[1], (ANVIL_BASE_H + ANVIL_NECK_Z1) / 2],
    svg: anvilNeckSvg,
    shapes: [A.cylinder(O1[0], O1[1], 6.6, ANVIL_BASE_H, ANVIL_NECK_Z1 - ANVIL_BASE_H)],
  });

  const anvilTipSvg =
    S(k.cylinder(O1[0], O1[1], 4.8, ANVIL_NECK_Z1, ANVIL_TIP_Z1 - ANVIL_NECK_Z1, P, 28, 0.3), { tone: "hi" }) +
    L(k.ring(O1[0], O1[1], 3.2, ANVIL_TIP_Z1, P, 20), { tone: "faint" });
  put({
    name: "anvil.tip",
    layer: "back",
    at: [O1[0], O1[1], (ANVIL_NECK_Z1 + ANVIL_TIP_Z1) / 2],
    svg: `<g data-mat="chrome">${anvilTipSvg}</g>`,
    shapes: [A.cylinder(O1[0], O1[1], 4.8, ANVIL_NECK_Z1, ANVIL_TIP_Z1 - ANVIL_NECK_Z1)],
  });

  const colBaseH = 4.5;
  const colBaseSvg =
    S(k.cylinder(O2[0], O2[1], 12.2, 0, colBaseH, P, 32, 0.6), { tone: "lo" }) +
    L(k.ring(O2[0], O2[1], 9.8, colBaseH, P, 24), { tone: "faint" });
  put({
    name: "column.base",
    layer: "back",
    at: [O2[0], O2[1], colBaseH / 2],
    svg: colBaseSvg,
    shapes: [A.cylinder(O2[0], O2[1], 12.2, 0, colBaseH)],
  });

  const colF = VERT(O2[0], O2[1]);
  const colShaftSvg =
    S(k.cylinder(O2[0], O2[1], 8.2, colBaseH, BRIDGE_Z0 - colBaseH, P, 32, 0.5), { tone: "mid" }) +
    k.fadedSvg(G.ribsOf(colF, colBaseH + 1.2, BRIDGE_Z0 - 1.2, 8.2, 28, P, { fade: [0.1, 0.5], seams: true }), {
      tone: "lo",
    });
  put({
    name: "column.shaft",
    layer: "back",
    at: [O2[0], O2[1], (colBaseH + BRIDGE_Z0) / 2],
    svg: colShaftSvg,
    shapes: [A.cylinder(O2[0], O2[1], 8.2, colBaseH, BRIDGE_Z0 - colBaseH)],
  });

  const bridgePlan = { x: -41, y: -13, w: 86, d: 26, r: 9 };
  const bridgeBolts = [
    [-34, -7],
    [-34, 7],
    [38, -7],
    [38, 7],
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
    at: [2, 0, (BRIDGE_Z0 + BRIDGE_Z1) / 2],
    svg: `<g data-mat="gunmetal">${bridgeSvg}</g>`,
    shapes: [A.slab(bridgePlan, BRIDGE_Z0, BRIDGE_Z1 - BRIDGE_Z0)],
  });

  const sleeveF = VERT(O1[0], O1[1]);
  const sleeveFlangeSvg =
    S(k.cylinder(O1[0], O1[1], 9.6, BRIDGE_Z1, SLEEVE_FLANGE_Z1 - BRIDGE_Z1, P, 32, 0.4), { tone: "mid" }) +
    k.dotsSvg(G.dotsOf(sleeveF, SLEEVE_FLANGE_Z1, 8.4, 8, P, { all: true }), { size: 0.38 });
  put({
    name: "sleeve.flange",
    layer: "mid",
    at: [O1[0], O1[1], (BRIDGE_Z1 + SLEEVE_FLANGE_Z1) / 2],
    svg: `<g data-mat="steel">${sleeveFlangeSvg}</g>`,
    shapes: [A.cylinder(O1[0], O1[1], 9.6, BRIDGE_Z1, SLEEVE_FLANGE_Z1 - BRIDGE_Z1)],
  });

  const barrelGradArcs = [30.4, 32.0, 33.6, 35.2].map((z) => G.arcOf(sleeveF, z, 7.4, P)).join("");
  const [vx, vy] = k.towardViewer(P);
  const fidX = O1[0] + 7.4 * vx;
  const fidY = O1[1] + 7.4 * vy;
  const fidLine = k.segment([fidX, fidY, 29.6], [fidX, fidY, 35.2], P);
  const sleeveBarrelSvg =
    S(k.cylinder(O1[0], O1[1], 7.4, SLEEVE_FLANGE_Z1, 35.6 - SLEEVE_FLANGE_Z1, P, 32, 0.35), {
      tone: "hi",
      crease: "lo",
      inner: L(barrelGradArcs, { tone: "lo" }) + L(fidLine, { tone: "hi", free: true }),
    });
  put({
    name: "sleeve.barrel",
    layer: "mid",
    at: [O1[0], O1[1], (SLEEVE_FLANGE_Z1 + SLEEVE_TOP) / 2],
    svg: `<g data-mat="steel">${sleeveBarrelSvg}</g>`,
    shapes: [A.cylinder(O1[0], O1[1], 7.4, SLEEVE_FLANGE_Z1, SLEEVE_TOP - SLEEVE_FLANGE_Z1)],
  });

  const dialTicks = k.radialTicks(O2[0], O2[1], BEZEL_R - 1.5, 20, 5, BEZEL_Z1, [2.2, 3.9], P);
  const dialBezelSvg =
    S(k.cylinder(O2[0], O2[1], BEZEL_R, BRIDGE_Z1, BEZEL_Z1 - BRIDGE_Z1, P, 40, 0.5), { tone: "mid" }) +
    L(k.ring(O2[0], O2[1], BEZEL_R - 1.5, BEZEL_Z1, P, 36), { tone: "lo" }) +
    L(k.ring(O2[0], O2[1], BEZEL_R - 5.4, BEZEL_Z1, P, 32), { tone: "faint" }) +
    L(dialTicks.minor, { tone: "lo" }) +
    L(dialTicks.major, { tone: "hi" });
  put({
    name: "dial.bezel",
    layer: "mid",
    at: [O2[0], O2[1], (BRIDGE_Z1 + BEZEL_Z1) / 2],
    svg: `<g data-mat="steel">${dialBezelSvg}</g>`,
    shapes: [A.cylinder(O2[0], O2[1], BEZEL_R, BRIDGE_Z1, BEZEL_Z1 - BRIDGE_Z1)],
  });
}

export const T = turning(P, { recorder: R });
const spindle = T.group("spindle", { slide: { direction: [0, 0, 1], travel: TRAVEL_MAX } });
const thimble = T.group("thimble", { parent: spindle, turn: { pivot: O1 } });
const dial = T.group("dial", { turn: { pivot: O2 } });

const spindleLayer = T.layer("spindle");
const thimbleLayer = T.layer("thimble");
T.stack(["back", "spindle", "mid", "thimble"]);

export const follow = (values) => {
  const th = values.thimble ?? 0;
  const period = 1440;
  const wrapped = ((th % period) + period) % period;
  const eff = wrapped <= 720 ? wrapped : period - wrapped;
  const u = eff / 720;
  const s = u * 3.2;
  const d = -u * 360;
  return { ...values, thimble: eff, spindle: s, dial: d };
};

export const poses = () => Array.from({ length: 1440 }, (_, deg) => follow({ thimble: deg }));

T.round({
  name: "spindle.face",
  group: spindle,
  layer: spindleLayer,
  F: VERT(O1[0], O1[1]),
  s0: ANVIL_TIP_Z1,
  s1: 11.2,
  r: 4.8,
  tone: "hi",
  crease: "lo",
  material: "chrome",
});

T.round({
  name: "spindle.collar",
  group: spindle,
  layer: spindleLayer,
  F: VERT(O1[0], O1[1]),
  s0: 11.2,
  s1: 12.8,
  r: 4.2,
  tone: "mid",
  material: "brass",
});

T.round({
  name: "spindle.rod",
  group: spindle,
  layer: spindleLayer,
  F: VERT(O1[0], O1[1]),
  s0: 12.8,
  s1: 19.4,
  r: 3.5,
  tone: "hi",
  crease: "lo",
  material: "steel",
  details: { seams: [15.0, 17.0] },
});

T.round({
  name: "thimble.skirt",
  group: thimble,
  layer: thimbleLayer,
  F: VERT(O1[0], O1[1]),
  s0: SLEEVE_TOP,
  s1: 35.4,
  r: 8.8,
  tone: "hi",
  crease: "lo",
  material: "steel",
  details: {
    seams: [32.3, 35.1],
    ribs: { s0: 32.3, s1: 35.1, count: 50, fade: [0.08, 0.52], seams: true, tone: "lo" },
  },
});

T.round({
  name: "thimble.barrel",
  group: thimble,
  layer: thimbleLayer,
  F: VERT(O1[0], O1[1]),
  s0: 35.4,
  s1: 38.8,
  r: 9.0,
  tone: "mid",
  material: "steel",
  details: { seams: [37.1] },
});

T.round({
  name: "thimble.grip",
  group: thimble,
  layer: thimbleLayer,
  F: VERT(O1[0], O1[1]),
  s0: 38.8,
  s1: 43.8,
  r: 9.6,
  tone: "hi",
  crease: "lo",
  material: "gunmetal",
  details: {
    seams: [39.2, 43.4],
    ribs: { s0: 39.2, s1: 43.4, count: 64, fade: [0.08, 0.55], seams: true, tone: "lo" },
  },
});

const tick = (angle, from, to) =>
  `M${(Math.cos(angle) * from).toFixed(3)} ${(Math.sin(angle) * from).toFixed(3)}L${(Math.cos(angle) * to).toFixed(3)} ${(Math.sin(angle) * to).toFixed(3)}`;

const thimbleCapMarkup = () => {
  const ticks = [];
  for (let i = 0; i < 50; i++) {
    const a = (i / 50) * Math.PI * 2;
    ticks.push(tick(a, 8.6 - (i % 5 === 0 ? 1.8 : 0.95), 8.6 - 0.35));
  }
  return `<path class="iso-line" data-tone="lo" d="${ticks.join("")}"/>`;
};

const thimbleCap = T.round({
  name: "thimble.cap",
  group: thimble,
  layer: thimbleLayer,
  F: VERT(O1[0], O1[1]),
  s0: 43.8,
  s1: 45.2,
  r: 8.6,
  tone: "mid",
  material: "steel",
  details: { bolts: [{ s: 45.2, r: 5.4, count: 6, size: 0.42, phase: 0.2 }] },
});
T.plane({
  part: thimbleCap,
  o: [O1[0], O1[1], 45.2],
  u: [1, 0, 0],
  v: [0, 1, 0],
  svg: thimbleCapMarkup(),
  fade: [0.04, 0.3],
});

const torqueArmPlan = { x: O1[0] - 3.6, y: -3.2, w: 12.6, d: 6.4, r: 2.2 };
T.prism({
  name: "thimble.arm",
  group: thimble,
  layer: thimbleLayer,
  plan: torqueArmPlan,
  z: 45.2,
  h: 1.6,
  steps: 4,
  bevel: 0.35,
  tone: "hi",
  crease: "lo",
  material: "brass",
  details: {
    dots: [{ at: [46.8, O1[0] + 6.2, 0], normal: [0, 0, 1], size: 0.48, tone: "mid" }],
  },
});

T.round({
  name: "thimble.ratchet",
  group: thimble,
  layer: thimbleLayer,
  F: VERT(O1[0], O1[1]),
  s0: 46.8,
  s1: 50.2,
  r: 5.6,
  tone: "hi",
  crease: "lo",
  material: "brass",
  details: {
    seams: [47.2, 49.8],
    ribs: { s0: 47.2, s1: 49.8, count: 36, fade: [0.08, 0.52], seams: true, tone: "lo" },
    bolts: [{ s: 50.2, r: 0, count: 1, size: 0.45 }],
  },
});

T.round({
  name: "dial.hub",
  group: dial,
  layer: thimbleLayer,
  F: VERT(O2[0], O2[1]),
  s0: BEZEL_Z1,
  s1: BEZEL_Z1 + 1.4,
  r: 4.4,
  tone: "mid",
  material: "brass",
});

const needlePlan = { x: O2[0] - 5.2, y: -1.6, w: 19.8, d: 3.2, r: 1.1 };
T.prism({
  name: "dial.needle",
  group: dial,
  layer: thimbleLayer,
  plan: needlePlan,
  z: BEZEL_Z1 + 1.4,
  h: 1.2,
  steps: 4,
  bevel: 0.25,
  tone: "hi",
  crease: "lo",
  material: "gold",
});

T.round({
  name: "dial.cap",
  group: dial,
  layer: thimbleLayer,
  F: VERT(O2[0], O2[1]),
  s0: BEZEL_Z1 + 2.6,
  s1: BEZEL_Z1 + 3.6,
  r: 2.5,
  tone: "hi",
  material: "chrome",
  details: { bolts: [{ s: BEZEL_Z1 + 3.6, r: 0, count: 1, size: 0.4 }] },
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
    sweep: { at: (x) => follow({ thimble: x }), from: 0, to: 1440, frame: 0.5 },
    workers: argv.includes("--workers"),
    quick: argv.includes("--quick"),
  });
}

const LABEL =
  "A precision outside micrometer: a screw-and-thimble mechanism with a coupled comparator dial where rotating the knurled thimble and brass ratchet stop translates the ground spindle axially relative to the lower carbide anvil at 0.50 mm per revolution while sweeping the comparator needle across a 0.00 to 1.00 mm scale.";
const backSvg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: BACK });
const staticSvg = (list) =>
  `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg iso-layer" viewBox="0 0 ${WIDTH} ${HEIGHT}" aria-hidden="true">${list.join("")}</svg>`;

const stage = `<div class="iso-stage iso-turn om-stage" tabindex="0" role="slider" aria-label="Outside micrometer: drag around the thimble or use arrow keys to rotate the thimble and translate the measuring spindle" aria-valuemin="0" aria-valuemax="720" aria-valuenow="0" aria-valuetext="0.00 mm gap, thimble 0 degrees">${backSvg}${out.layerSvg("spindle", { width: WIDTH, height: HEIGHT })}${staticSvg(MID)}${out.layerSvg("thimble", { width: WIDTH, height: HEIGHT })}</div>`;

const EXTRA_CSS = `
.om-stage { cursor: grab; touch-action: none; user-select: none; }
.om-stage:active { cursor: grabbing; }
`;

const DATA = { turn: out.data };
const LIVE_SCRIPT = `
(() => {
  const DATA = ${JSON.stringify(DATA)};
  const follow = ${follow.toString()};
  const stage = document.querySelector(".om-stage");
  const readout = document.querySelector("[data-readout]");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let angle = 0;
  let dir = 1;
  let touring = !still.matches;
  let idle = 0;
  let last = 0;
  let own = false;
  let dragging = false;
  let dragStartAngle = 0;
  let dragBase = 0;
  const SPEED = 48;
  const clampAngle = (v) => Math.max(0, Math.min(720, v));

  function show(thimbleDeg) {
    const posed = follow({ thimble: thimbleDeg });
    const effDeg = posed.thimble;
    const gapMm = (effDeg / 720) * 1.0;
    const div = Math.round(((effDeg % 360) / 360) * 50) % 50;
    const text = gapMm.toFixed(2) + " mm · div " + String(div).padStart(2, "0") + "/50 · turn " + effDeg.toFixed(0) + "°";
    if (readout && readout.textContent !== text) readout.textContent = text;
    stage.setAttribute("aria-valuenow", String(Math.round(effDeg)));
    stage.setAttribute("aria-valuetext", gapMm.toFixed(2) + " mm gap, thimble " + Math.round(effDeg) + " degrees");
  }

  const controller = TURN.mount(stage, DATA.turn, {
    group: "thimble",
    follow,
    onHold: () => {
      touring = false;
      clearTimeout(idle);
    },
    onFrame: (turned) => {
      const value = turned.values.thimble ?? 0;
      if (!own) {
        angle = clampAngle(value);
      }
      show(value);
    },
  });

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
    dragStartAngle = controller.angleAt(e.clientX, e.clientY, 40, "thimble");
    dragBase = angle;
    if (stage.setPointerCapture) {
      try { stage.setPointerCapture(e.pointerId); } catch {}
    }
  });
  stage.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    hold();
    const cur = controller.angleAt(e.clientX, e.clientY, 40, "thimble");
    angle = clampAngle(dragBase + (cur - dragStartAngle));
    own = true;
    controller.set({ thimble: angle });
    own = false;
  });
  const endDrag = () => { dragging = false; };
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  stage.addEventListener("keydown", (e) => {
    const stepDeg = e.shiftKey ? 36 : 7.2;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      hold();
      angle = clampAngle(Math.round((angle + stepDeg) / 7.2) * 7.2);
      own = true;
      controller.set({ thimble: angle });
      own = false;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      hold();
      angle = clampAngle(Math.round((angle - stepDeg) / 7.2) * 7.2);
      own = true;
      controller.set({ thimble: angle });
      own = false;
    }
  });

  function tick(now) {
    if (!touring) return;
    if (!last) last = now;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    angle += dir * SPEED * dt;
    if (angle >= 720) {
      angle = 720;
      dir = -1;
    } else if (angle <= 0) {
      angle = 0;
      dir = 1;
    }
    own = true;
    controller.set({ thimble: angle });
    own = false;
    requestAnimationFrame(tick);
  }

  controller.set({ thimble: 0 });
  if (touring) requestAnimationFrame(tick);
})();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Outside micrometer",
  hint: "Drag the thimble · arrow keys",
  readout: "0.00 mm · div 00/50 · turn 0°",
  keys: [
    { mark: "raised", label: "Knurled thimble, 50-division graduated thimble skirt, and brass ratchet stop" },
    { mark: "lit", label: "Translating carbide-faced spindle and coupled comparator dial" },
  ],
  caption:
    "An interactive 3D screw-and-thimble micrometer stand. Rotating the 50-division thimble advances or retracts the ground measuring spindle relative to the lower carbide anvil at 0.50 mm per revolution (0.01 mm per graduation) while driving a coupled comparator dial across a 0.00–1.00 mm span.",
  body: `<style>${out.css}\n${EXTRA_CSS}</style>${stage}`,
});

const page = k.pageHtml({
  title: "Outside micrometer",
  theme,
  body,
  script: turnScript() + (verify ? `window.__isoVerify = ${JSON.stringify(out.verify)};\n` : "") + LIVE_SCRIPT,
  width: 680,
});

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const name = `outside-micrometer${verify ? "-verify" : ""}${theme === "light" ? "-light" : ""}.html`;
  writeFileSync(join(HERE, name), page);
  console.log(
    `wrote ${name} · ${(page.length / 1024).toFixed(0)} KB · ${out.report.parts} parts · ${out.report.layers.map((l) => `${l.name}: ${l.planar} planes, ${l.dynamic} dynamic`).join(" · ")} · build ${out.report.seconds.toFixed(1)} s`,
  );
}
