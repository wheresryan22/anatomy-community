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
const ELEVATION = 31;

const BASE = { x: -86, y: -62, w: 172, d: 124, r: 8 };
const BASE_H = 12;
const FOOT_H = 5;

const O1 = [-32, 0];
const O2 = [38, 0];

const PED1_H = 4.5;
const CRANK_R = 13.5;
const CRANK_Z1 = 7.8;
const ARM_Z1 = 10.0;
const PIN_Z1 = 13.0;
const ECC_R = 8.0;
const STROKE = 2 * ECC_R;

const DIAL_Z0 = 19.2;
const BEZEL_R = 18.5;
const BEZEL_Z1 = 22.0;

export const P = k.fitProjection(
  [
    ...k.boxCorners(BASE, -BASE_H - FOOT_H, 0),
    [-50, -24, 24],
    [O2[0] + BEZEL_R + 4, O2[1] + BEZEL_R + 4, 26],
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

  const ped1Svg =
    S(k.cylinder(O1[0], O1[1], 11.2, 0, PED1_H, P, 32, 0.5), { tone: "lo" }) +
    L(k.ring(O1[0], O1[1], 8.8, PED1_H, P, 24), { tone: "faint" });
  put({
    name: "stand.pedestal.crank",
    layer: "back",
    at: [O1[0], O1[1], PED1_H / 2],
    svg: ped1Svg,
    shapes: [A.cylinder(O1[0], O1[1], 11.2, 0, PED1_H)],
  });

  const guideRear = { x: -49, y: -19.5, w: 34, d: 4.5, r: 1.4 };
  const guideRearBolts = [
    [-45, -17.25],
    [-19, -17.25],
  ];
  const guideRearSvg =
    S(k.slabOf(guideRear, 0, PIN_Z1, P, 4, 0.4), { tone: "lo" }) +
    D(guideRearBolts.map(([x, y]) => at([x, y, PIN_Z1])), { size: 0.42 });
  put({
    name: "stand.guide.rear",
    layer: "back",
    at: [-32, -17.25, PIN_Z1 / 2],
    svg: `<g data-mat="gunmetal">${guideRearSvg}</g>`,
    shapes: [A.slab(guideRear, 0, PIN_Z1)],
  });

  const guideFront = { x: -49, y: 15.0, w: 34, d: 4.5, r: 1.4 };
  const guideFrontBolts = [
    [-45, 17.25],
    [-19, 17.25],
  ];
  const guideFrontSvg =
    S(k.slabOf(guideFront, 0, PIN_Z1, P, 4, 0.4), { tone: "lo" }) +
    D(guideFrontBolts.map(([x, y]) => at([x, y, PIN_Z1])), { size: 0.42 });
  put({
    name: "stand.guide.front",
    layer: "mid",
    at: [-32, 17.25, PIN_Z1 / 2],
    svg: `<g data-mat="gunmetal">${guideFrontSvg}</g>`,
    shapes: [A.slab(guideFront, 0, PIN_Z1)],
  });

  const scaleBlock = { x: -12, y: -6.5, w: 22, d: 13.0, r: 2.0 };
  const scaleTicks = k.topTicks(-8, 8, 2, 4, 2.2, PIN_Z1, [1.8, 3.2], P);
  const scaleSvg =
    S(k.slabOf(scaleBlock, 0, PIN_Z1, P, 6, 0.5), { tone: "mid" }) +
    L(scaleTicks.minor, { tone: "lo", free: true }) +
    L(scaleTicks.major, { tone: "hi", free: true });
  put({
    name: "stand.pillow",
    layer: "mid",
    at: [-1, 0, PIN_Z1 / 2],
    svg: `<g data-mat="steel">${scaleSvg}</g>`,
    shapes: [A.slab(scaleBlock, 0, PIN_Z1)],
  });

  const ped2H = 4.5;
  const ped2Svg =
    S(k.cylinder(O2[0], O2[1], 11.8, 0, ped2H, P, 32, 0.5), { tone: "lo" }) +
    L(k.ring(O2[0], O2[1], 9.4, ped2H, P, 24), { tone: "faint" });
  put({
    name: "stand.pedestal.dial",
    layer: "back",
    at: [O2[0], O2[1], ped2H / 2],
    svg: ped2Svg,
    shapes: [A.cylinder(O2[0], O2[1], 11.8, 0, ped2H)],
  });

  const col2Svg = S(k.cylinder(O2[0], O2[1], 8.0, ped2H, DIAL_Z0 - ped2H, P, 28, 0.4), { tone: "mid" });
  put({
    name: "dial.column",
    layer: "top",
    at: [O2[0], O2[1], (ped2H + DIAL_Z0) / 2],
    svg: `<g data-mat="gunmetal">${col2Svg}</g>`,
    shapes: [A.cylinder(O2[0], O2[1], 8.0, ped2H, DIAL_Z0 - ped2H)],
  });

  const dialTicks = k.radialTicks(O2[0], O2[1], BEZEL_R - 1.5, 24, 6, BEZEL_Z1, [2.0, 3.6], P);
  const dialBezelSvg =
    S(k.cylinder(O2[0], O2[1], BEZEL_R, DIAL_Z0, BEZEL_Z1 - DIAL_Z0, P, 40, 0.5), { tone: "mid" }) +
    L(k.ring(O2[0], O2[1], BEZEL_R - 1.5, BEZEL_Z1, P, 36), { tone: "lo" }) +
    L(k.ring(O2[0], O2[1], BEZEL_R - 5.1, BEZEL_Z1, P, 32), { tone: "faint" }) +
    L(dialTicks.minor, { tone: "lo" }) +
    L(dialTicks.major, { tone: "hi" });
  put({
    name: "dial.bezel",
    layer: "top",
    at: [O2[0], O2[1], (DIAL_Z0 + BEZEL_Z1) / 2],
    svg: `<g data-mat="steel">${dialBezelSvg}</g>`,
    shapes: [A.cylinder(O2[0], O2[1], BEZEL_R, DIAL_Z0, BEZEL_Z1 - DIAL_Z0)],
  });
}

export const T = turning(P, { recorder: R });
const crank = T.group("crank", { turn: { pivot: O1 } });
const yoke = T.group("yoke", { slide: { direction: [1, 0, 0], travel: STROKE } });
const phase = T.group("phase", { turn: { pivot: O2 } });

const crankLayer = T.layer("crank");
const yokeLayer = T.layer("yoke");
const dialLayer = T.layer("dial");
T.stack(["back", "crank", "mid", "yoke", "top", "dial"]);

export const follow = (values) => {
  const c = values.crank ?? 0;
  const rad = (c * Math.PI) / 180;
  const s = 8.0 * (1 - Math.cos(rad));
  return { ...values, crank: c, yoke: s, phase: c };
};

export const poses = () => Array.from({ length: 1440 }, (_, deg) => follow({ crank: deg }));

T.round({
  name: "crank.disc",
  group: crank,
  layer: crankLayer,
  F: VERT(O1[0], O1[1]),
  s0: PED1_H,
  s1: CRANK_Z1,
  r: CRANK_R,
  tone: "mid",
  crease: "lo",
  material: "steel",
  details: {
    seams: [PED1_H + 0.5, CRANK_Z1 - 0.5],
    ribs: { s0: PED1_H + 0.5, s1: CRANK_Z1 - 0.5, count: 48, fade: [0.08, 0.5], seams: true, tone: "lo" },
  },
});

const crankArmPlan = { x: O1[0] - 11.0, y: -3.6, w: 14.8, d: 7.2, r: 2.2 };
T.prism({
  name: "crank.arm",
  group: crank,
  layer: crankLayer,
  plan: crankArmPlan,
  z: CRANK_Z1,
  h: ARM_Z1 - CRANK_Z1,
  steps: 4,
  bevel: 0.35,
  tone: "hi",
  crease: "lo",
  material: "steel",
});

T.round({
  name: "crank.hub",
  group: crank,
  layer: crankLayer,
  F: VERT(O1[0], O1[1]),
  s0: ARM_Z1,
  s1: ARM_Z1 + 1.5,
  r: 3.4,
  tone: "hi",
  material: "chrome",
  details: { bolts: [{ s: ARM_Z1 + 1.5, r: 0, count: 1, size: 0.42 }] },
});

const PIN_X = O1[0] - ECC_R;
T.round({
  name: "crank.pin",
  group: crank,
  layer: crankLayer,
  F: VERT(PIN_X, O1[1]),
  s0: ARM_Z1,
  s1: PIN_Z1,
  r: 2.2,
  tone: "hi",
  crease: "lo",
  material: "brass",
  details: { bolts: [{ s: PIN_Z1, r: 0, count: 1, size: 0.42 }] },
});

const cheekLeftPlan = { x: -47.5, y: -17.5, w: 4.3, d: 35.0, r: 1.3 };
T.prism({
  name: "yoke.cheek.left",
  group: yoke,
  layer: yokeLayer,
  plan: cheekLeftPlan,
  z: PIN_Z1,
  h: 3.6,
  steps: 4,
  bevel: 0.35,
  tone: "hi",
  crease: "lo",
  material: "steel",
});

const cheekRightPlan = { x: -36.8, y: -17.5, w: 4.3, d: 35.0, r: 1.3 };
T.prism({
  name: "yoke.cheek.right",
  group: yoke,
  layer: yokeLayer,
  plan: cheekRightPlan,
  z: PIN_Z1,
  h: 3.6,
  steps: 4,
  bevel: 0.35,
  tone: "hi",
  crease: "lo",
  material: "steel",
});

const capRearPlan = { x: -47.5, y: -17.5, w: 15.0, d: 5.5, r: 1.4 };
T.prism({
  name: "yoke.cap.rear",
  group: yoke,
  layer: yokeLayer,
  plan: capRearPlan,
  z: 16.6,
  h: 2.2,
  steps: 4,
  bevel: 0.3,
  tone: "mid",
  material: "brass",
  details: {
    dots: [
      { at: [18.8, -45.2, -14.75], normal: [0, 0, 1], size: 0.45, tone: "mid" },
      { at: [18.8, -34.8, -14.75], normal: [0, 0, 1], size: 0.45, tone: "mid" },
    ],
  },
});

const capFrontPlan = { x: -47.5, y: 12.0, w: 15.0, d: 5.5, r: 1.4 };
T.prism({
  name: "yoke.cap.front",
  group: yoke,
  layer: yokeLayer,
  plan: capFrontPlan,
  z: 16.6,
  h: 2.2,
  steps: 4,
  bevel: 0.3,
  tone: "mid",
  material: "brass",
  details: {
    dots: [
      { at: [18.8, -45.2, 14.75], normal: [0, 0, 1], size: 0.45, tone: "mid" },
      { at: [18.8, -34.8, 14.75], normal: [0, 0, 1], size: 0.45, tone: "mid" },
    ],
  },
});

const rodPlan = { x: -36.8, y: -3.2, w: 28.8, d: 6.4, r: 1.6 };
T.prism({
  name: "yoke.rod",
  group: yoke,
  layer: yokeLayer,
  plan: rodPlan,
  z: 16.6,
  h: 2.2,
  steps: 4,
  bevel: 0.35,
  tone: "hi",
  crease: "lo",
  material: "chrome",
  details: {
    dots: [{ at: [18.8, -10.5, 0], normal: [0, 0, 1], size: 0.48, tone: "mid" }],
  },
});

T.round({
  name: "phase.hub",
  group: phase,
  layer: dialLayer,
  F: VERT(O2[0], O2[1]),
  s0: BEZEL_Z1,
  s1: BEZEL_Z1 + 1.4,
  r: 4.4,
  tone: "mid",
  material: "brass",
});

const needlePlan = { x: O2[0] - 5.2, y: -1.6, w: 18.5, d: 3.2, r: 1.1 };
T.prism({
  name: "phase.needle",
  group: phase,
  layer: dialLayer,
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
  name: "phase.cap",
  group: phase,
  layer: dialLayer,
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
const TOP = layerOf("top");

if (argv.includes("--audit")) {
  A.auditOrExit(R, P);
  await TA.orbitOrExit(T, R, P, {
    sweep: { at: (x) => follow({ crank: x }), from: 0, to: 1440, frame: 0.5 },
    workers: argv.includes("--workers"),
    quick: argv.includes("--quick"),
  });
}

const LABEL =
  "A Scotch yoke harmonic actuator on a cast plinth: a continuously rotating eccentric crank wheel and brass roller pin engage the transverse slot of a guided steel yoke carriage, converting uniform rotation into pure sinusoidal reciprocation alongside a coupled harmonic phase dial.";
const backSvg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: BACK });
const staticSvg = (list) =>
  `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg iso-layer" viewBox="0 0 ${WIDTH} ${HEIGHT}" aria-hidden="true">${list.join("")}</svg>`;

const stage = `<div class="iso-stage iso-turn sy-stage" tabindex="0" role="slider" aria-label="Scotch yoke harmonic actuator: drag around the crank or use arrow keys to rotate the eccentric crank and reciprocate the slotted yoke" aria-valuemin="0" aria-valuemax="360" aria-valuenow="0" aria-valuetext="stroke +0.0 mm, crank 0 degrees">${backSvg}${out.layerSvg("crank", { width: WIDTH, height: HEIGHT })}${staticSvg(MID)}${out.layerSvg("yoke", { width: WIDTH, height: HEIGHT })}${staticSvg(TOP)}${out.layerSvg("dial", { width: WIDTH, height: HEIGHT })}</div>`;

const EXTRA_CSS = `
.sy-stage { cursor: grab; touch-action: none; user-select: none; }
.sy-stage:active { cursor: grabbing; }
`;

const DATA = { turn: out.data };
const LIVE_SCRIPT = `
(() => {
  const DATA = ${JSON.stringify(DATA)};
  const follow = ${follow.toString()};
  const stage = document.querySelector(".sy-stage");
  const readout = document.querySelector("[data-readout]");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let angle = 0;
  let target = 0;
  let touring = !still.matches;
  let idle = 0;
  let last = 0;
  let own = false;
  let dragging = false;
  let dragStartAngle = 0;
  let dragBase = 0;
  const SPEED = 48;

  function show(crankDeg) {
    const norm = (((crankDeg % 360) + 360) % 360);
    const rad = (norm * Math.PI) / 180;
    const xMm = 8.0 * (1 - Math.cos(rad));
    const vNorm = Math.sin(rad);
    const text = "x " + xMm.toFixed(1) + " mm · v/ωR " + (vNorm >= 0 ? "+" : "") + vNorm.toFixed(2) + " · θ " + norm.toFixed(0) + "°";
    if (readout && readout.textContent !== text) readout.textContent = text;
    stage.setAttribute("aria-valuenow", String(Math.round(norm)));
    stage.setAttribute("aria-valuetext", "stroke +" + xMm.toFixed(1) + " mm, crank " + Math.round(norm) + " degrees");
  }

  const controller = TURN.mount(stage, DATA.turn, {
    group: "crank",
    follow,
    onHold: () => {
      touring = false;
      clearTimeout(idle);
    },
    onFrame: (turned) => {
      const value = turned.values.crank ?? 0;
      if (!own) {
        angle = target = value;
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
    dragStartAngle = controller.angleAt(e.clientX, e.clientY, 12, "crank");
    dragBase = angle;
    if (stage.setPointerCapture) {
      try { stage.setPointerCapture(e.pointerId); } catch {}
    }
  });
  stage.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const cur = controller.angleAt(e.clientX, e.clientY, 12, "crank");
    angle = target = dragBase + (cur - dragStartAngle);
    own = true;
    controller.set({ crank: angle });
    own = false;
  });
  const endDrag = () => { dragging = false; };
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  stage.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      hold();
      target = angle + 15;
      angle = target;
      own = true;
      controller.set({ crank: angle });
      own = false;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      hold();
      target = angle - 15;
      angle = target;
      own = true;
      controller.set({ crank: angle });
      own = false;
    }
  });

  function tick(now) {
    if (!touring) return;
    if (!last) last = now;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    angle += SPEED * dt;
    target = angle;
    own = true;
    controller.set({ crank: angle });
    own = false;
    requestAnimationFrame(tick);
  }

  controller.set({ crank: 0 });
  if (touring) requestAnimationFrame(tick);
})();
`;

const body = k.plateHtml({
  fig: "Fig 3D",
  title: "Scotch yoke harmonic actuator",
  hint: "Drag the crank · arrow keys",
  readout: "x 0.0 mm · v/ωR +0.00 · θ 0°",
  keys: [
    { mark: "raised", label: "Eccentric drive crank wheel and orbiting brass crankpin roller" },
    { mark: "lit", label: "Slotted reciprocating yoke carriage, output plunger, and harmonic phase dial" },
  ],
  caption:
    "An interactive 3D Scotch yoke mechanism. A continuously rotating crank wheel carries an eccentric brass roller pin inside the transverse slot of a guided steel yoke carriage, converting uniform angular velocity into exact sinusoidal linear motion x(θ) = R(1 − cos θ) across a 16.0 mm stroke.",
  body: `<style>${out.css}\n${EXTRA_CSS}</style>${stage}`,
});

const page = k.pageHtml({
  title: "Scotch yoke harmonic actuator",
  theme,
  body,
  script: turnScript() + (verify ? `window.__isoVerify = ${JSON.stringify(out.verify)};\n` : "") + LIVE_SCRIPT,
  width: 680,
});

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const name = `scotch-yoke${verify ? "-verify" : ""}${theme === "light" ? "-light" : ""}.html`;
  writeFileSync(join(HERE, name), page);
  console.log(
    `wrote ${name} · ${(page.length / 1024).toFixed(0)} KB · ${out.report.parts} parts · ${out.report.layers.map((l) => `${l.name}: ${l.planar} planes, ${l.dynamic} dynamic`).join(" · ")} · build ${out.report.seconds.toFixed(1)} s`,
  );
}
