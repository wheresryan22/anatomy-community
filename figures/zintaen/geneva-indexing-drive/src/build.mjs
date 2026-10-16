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

const BASE = { x: -86, y: -66, w: 172, d: 132, r: 8 };
const BASE_H = 12;
const FOOT_H = 5;

const O1 = [-26, 0];
const O2 = [22, 0];
const O3 = [22, 41];

const PED1_H = 4.5;
const PED2_H = 13.0;

const CRANK_R = 22;
const CRANK_Z0 = PED1_H;
const CRANK_Z1 = 7.5;
const ARM_Z1 = 9.8;
const PIN_R_ORBIT = 28.5;
const PIN_Z1 = 11.6;

const WHEEL_R = 32;
const WHEEL_Z0 = PED2_H;
const WHEEL_Z1 = 16.6;
const HUB_Z1 = 19.6;

export const P = k.fitProjection(
  [...k.boxCorners(BASE, -BASE_H - FOOT_H, 0), [0, 0, 32]],
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

  const badge = { x: -74, y: 42, w: 38, d: 14, r: 1.8 };
  const badgeLines = [26, 18]
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
    S(k.cylinder(O1[0], O1[1], 11.5, 0, PED1_H, P, 32, 0.5), { tone: "lo" }) +
    L(k.ring(O1[0], O1[1], 9.2, PED1_H, P, 24), { tone: "faint" });
  put({
    name: "stand.pedestal.crank",
    layer: "back",
    at: [O1[0], O1[1], PED1_H / 2],
    svg: ped1Svg,
    shapes: [A.cylinder(O1[0], O1[1], 11.5, 0, PED1_H)],
  });

  const ped2Svg =
    S(k.cylinder(O2[0], O2[1], 11.5, 0, PED2_H, P, 32, 0.6), { tone: "lo" }) +
    L(k.ring(O2[0], O2[1], 9.2, PED2_H, P, 24), { tone: "faint" });
  put({
    name: "stand.pedestal.wheel",
    layer: "mid",
    at: [O2[0], O2[1], PED2_H / 2],
    svg: ped2Svg,
    shapes: [A.cylinder(O2[0], O2[1], 11.5, 0, PED2_H)],
  });

  const ped3Svg = S(k.cylinder(O3[0], O3[1], 4.2, 0, PED2_H, P, 24, 0.3), { tone: "lo" });
  put({
    name: "stand.pedestal.pawl",
    layer: "mid",
    at: [O3[0], O3[1], PED2_H / 2],
    svg: ped3Svg,
    shapes: [A.cylinder(O3[0], O3[1], 4.2, 0, PED2_H)],
  });

  const idxBox = { x: 58, y: -4.5, w: 12, d: 9, r: 1.6 };
  const idxSvg =
    S(k.slabOf(idxBox, 0, WHEEL_Z1, P, 6, 0.5), { tone: "mid" }) +
    L(k.lineOnTop([idxBox.x + 2, 0], [idxBox.x + idxBox.w - 2.5, 0], WHEEL_Z1, P), { tone: "hi", free: true });
  put({
    name: "stand.index",
    layer: "front",
    at: [idxBox.x + idxBox.w / 2, 0, WHEEL_Z1 / 2],
    svg: `<g data-mat="brass">${idxSvg}</g>`,
    shapes: [A.slab(idxBox, 0, WHEEL_Z1)],
  });
}

export const T = turning(P, { recorder: R });
const crank = T.group("crank", { turn: { pivot: O1 } });
const wheel = T.group("wheel", { turn: { pivot: O2 } });
const pawl = T.group("pawl", { hinge: { point: [O3[0], O3[1], 0], axis: [0, 0, 1], range: [-8, 8] } });

const crankLayer = T.layer("crank");
const turretLayer = T.layer("turret");
T.stack(["back", "crank", "mid", "turret", "front"]);

export function genevaWheelAngle(crankDeg) {
  const rev = Math.floor((crankDeg + 180) / 360);
  const delta = crankDeg - rev * 360;
  const limit = 45;
  if (delta <= -limit) return rev * 90 - 45;
  if (delta >= limit) return rev * 90 + 45;
  const rad = (delta * Math.PI) / 180;
  const s = Math.SQRT1_2;
  const stepRad = Math.atan2(s * Math.sin(rad), 1 - s * Math.cos(rad));
  return rev * 90 + (stepRad * 180) / Math.PI;
}

export function pawlAngle(crankDeg) {
  const rev = Math.floor((crankDeg + 180) / 360);
  const delta = crankDeg - rev * 360;
  if (Math.abs(delta) >= 45) return 0;
  const c = Math.cos(((delta / 45) * Math.PI) / 2);
  return -6 * c * c;
}

export const follow = (values) => {
  const c = values.crank ?? 0;
  const rev = Math.floor((c + 180) / 360);
  const delta = c - rev * 360;
  let w = rev * 90 + 45;
  let p = 0;
  if (delta <= -45) {
    w = rev * 90 - 45;
  } else if (delta < 45) {
    const rad = (delta * Math.PI) / 180;
    const s = Math.SQRT1_2;
    w = rev * 90 + (Math.atan2(s * Math.sin(rad), 1 - s * Math.cos(rad)) * 180) / Math.PI;
    const cs = Math.cos(((delta / 45) * Math.PI) / 2);
    p = -6 * cs * cs;
  }
  return { ...values, crank: c, wheel: w, pawl: p };
};

export const poses = () => Array.from({ length: 1440 }, (_, deg) => follow({ crank: deg }));

const tick = (angle, from, to) =>
  `M${(Math.cos(angle) * from).toFixed(3)} ${(Math.sin(angle) * from).toFixed(3)}L${(Math.cos(angle) * to).toFixed(3)} ${(Math.sin(angle) * to).toFixed(3)}`;
const ringPath = (r, steps) =>
  Array.from({ length: steps }, (_, j) => `${j ? "L" : "M"}${(r * Math.cos((j / steps) * Math.PI * 2)).toFixed(3)} ${(r * Math.sin((j / steps) * Math.PI * 2)).toFixed(3)}`).join("") + "Z";

const crankFaceMarkup = () => {
  const ticks = [];
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    ticks.push(tick(a, CRANK_R - (i % 3 === 0 ? 2.8 : 1.5), CRANK_R - 0.6));
  }
  return `<path class="iso-line" data-tone="lo" d="${ringPath(CRANK_R - 0.6, 120)}"/><path class="iso-line" data-tone="lo" d="${ticks.join("")}"/>`;
};

const crankDisc = T.round({
  name: "crank.disc",
  group: crank,
  layer: crankLayer,
  F: VERT(O1[0], O1[1]),
  s0: CRANK_Z0,
  s1: CRANK_Z1,
  r: CRANK_R,
  tone: "mid",
  crease: "lo",
  material: "steel",
  details: { ribs: { s0: CRANK_Z0 + 0.5, s1: CRANK_Z1 - 0.5, count: 72, fade: [0.08, 0.5], seams: true, tone: "lo" } },
});
T.plane({ part: crankDisc, o: [O1[0], O1[1], CRANK_Z1], u: [1, 0, 0], v: [0, 1, 0], svg: crankFaceMarkup(), fade: [0.04, 0.3] });

const armRect = { x: O1[0] - 6, y: -4.2, w: PIN_R_ORBIT + 6 + 3.2, d: 8.4, r: 2.2 };
T.prism({
  name: "crank.arm",
  group: crank,
  layer: crankLayer,
  plan: armRect,
  z: CRANK_Z1,
  h: ARM_Z1 - CRANK_Z1,
  steps: 4,
  bevel: 0.4,
  tone: "hi",
  crease: "lo",
  material: "steel",
});

const lobeRect = { x: O1[0] - 18.5, y: -11, w: 9.5, d: 22, r: 2.4 };
const lobeBolts = [
  [lobeRect.x + 4.75, -6],
  [lobeRect.x + 4.75, 6],
].map(([x, y]) => ({ at: [ARM_Z1, x, y], normal: [0, 0, 1], size: 0.48, tone: "mid" }));
T.prism({
  name: "crank.counterweight",
  group: crank,
  layer: crankLayer,
  plan: lobeRect,
  z: CRANK_Z1,
  h: ARM_Z1 - CRANK_Z1,
  steps: 4,
  bevel: 0.45,
  tone: "mid",
  material: "brass",
  details: {
    dots: lobeBolts,
    rings: lobeBolts.map((d) => ({ at: d.at, normal: [0, 0, 1], r: 1.1, tone: "lo" })),
  },
});

T.round({
  name: "crank.hub",
  group: crank,
  layer: crankLayer,
  F: VERT(O1[0], O1[1]),
  s0: ARM_Z1,
  s1: ARM_Z1 + 1.6,
  r: 4.8,
  tone: "hi",
  material: "chrome",
  details: { bolts: [{ s: ARM_Z1 + 1.6, r: 2.6, count: 4, size: 0.42, phase: 0.4 }] },
});

const PIN_X = O1[0] + PIN_R_ORBIT;
T.round({
  name: "crank.pin",
  group: crank,
  layer: crankLayer,
  F: VERT(PIN_X, 0),
  s0: ARM_Z1,
  s1: PIN_Z1,
  r: 2.4,
  tone: "hi",
  material: "brass",
  details: { bolts: [{ s: PIN_Z1, r: 0, count: 1, size: 0.45 }] },
});

const wheelFaceMarkup = () => {
  const ticks = [];
  const slots = [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    ticks.push(tick(a, WHEEL_R - (i % 9 === 0 ? 3.2 : 1.6), WHEEL_R - 0.8));
  }
  for (let s = 0; s < 4; s++) {
    const aSlot = ((s * 90 + 45) * Math.PI) / 180;
    slots.push(tick(aSlot, 12, WHEEL_R - 0.8));
  }
  const labels = [0, 1, 2, 3]
    .map((s) => {
      const a = (s * Math.PI) / 2;
      const r = WHEEL_R - 6.2;
      return `<text class="iso-face-text" data-tone="mid" font-size="3.6" text-anchor="middle" transform="translate(${(Math.cos(a) * r).toFixed(3)} ${(Math.sin(a) * r).toFixed(3)}) rotate(${(s * 90 + 90).toFixed(1)}) translate(0 1.2)">S${s + 1}</text>`;
    })
    .join("");
  return `<path class="iso-line" data-tone="lo" d="${ringPath(WHEEL_R - 0.8, 160)}"/><path class="iso-line" data-tone="lo" d="${ticks.join("")}"/><path class="iso-line" data-tone="mid" d="${slots.join("")}"/><path class="iso-line" data-tone="faint" d="${ringPath(12, 100)}"/>${labels}`;
};

const wheelDisc = T.round({
  name: "wheel.disc",
  group: wheel,
  layer: turretLayer,
  F: VERT(O2[0], O2[1]),
  s0: WHEEL_Z0,
  s1: WHEEL_Z1,
  r: WHEEL_R,
  tone: "hi",
  crease: "lo",
  material: "steel",
  details: { ribs: { s0: WHEEL_Z0 + 0.6, s1: WHEEL_Z1 - 0.6, count: 120, fade: [0.08, 0.5], seams: true, tone: "lo" } },
});
T.plane({ part: wheelDisc, o: [O2[0], O2[1], WHEEL_Z1], u: [1, 0, 0], v: [0, 1, 0], svg: wheelFaceMarkup(), fade: [0.04, 0.3] });

T.round({
  name: "wheel.hub",
  group: wheel,
  layer: turretLayer,
  F: VERT(O2[0], O2[1]),
  s0: WHEEL_Z1,
  s1: HUB_Z1,
  r: 8.5,
  tone: "mid",
  material: "gunmetal",
  details: { seams: [WHEEL_Z1 + 1.0], bolts: [{ s: HUB_Z1, r: 5.2, count: 6, size: 0.45, phase: 0.2 }] },
});

const PALLET_R = 19;
const PALLET_Z1 = WHEEL_Z1 + 2.0;
for (let s = 0; s < 4; s++) {
  const angle = (s * Math.PI) / 2;
  const cx = O2[0] + PALLET_R * Math.cos(angle);
  const cy = O2[1] + PALLET_R * Math.sin(angle);
  const palletRect = { x: cx - 4.2, y: cy - 4.2, w: 8.4, d: 8.4, r: 1.4 };
  T.prism({
    name: `wheel.pallet.${s}`,
    group: wheel,
    layer: turretLayer,
    plan: palletRect,
    z: WHEEL_Z1,
    h: PALLET_Z1 - WHEEL_Z1,
    steps: 3,
    bevel: 0.35,
    tone: "mid",
    material: "gold",
  });
  T.round({
    name: `wheel.workpiece.${s}`,
    group: wheel,
    layer: turretLayer,
    F: VERT(cx, cy),
    s0: PALLET_Z1,
    s1: PALLET_Z1 + 2.2,
    r: 2.7,
    tone: "hi",
    material: "chrome",
    details: { bolts: [{ s: PALLET_Z1 + 2.2, r: 0, count: 1, size: 0.42 }] },
  });
}

T.round({
  name: "pawl.post",
  layer: turretLayer,
  F: VERT(O3[0], O3[1]),
  s0: WHEEL_Z0,
  s1: WHEEL_Z0 + 1.2,
  r: 2.6,
  tone: "mid",
  material: "gunmetal",
});

const pawlPoly = [
  [O3[0] - 2.2, O3[1] + 1.8],
  [O3[0] + 2.2, O3[1] + 1.8],
  [O3[0] + 1.4, O2[1] + WHEEL_R + 0.9],
  [O3[0], O2[1] + WHEEL_R + 0.55],
  [O3[0] - 1.4, O2[1] + WHEEL_R + 0.9],
];
T.prism({
  name: "pawl.arm",
  group: pawl,
  layer: turretLayer,
  F: { o: [0, 0, 0], a: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
  polygon: pawlPoly,
  s0: WHEEL_Z0 + 1.2,
  s1: WHEEL_Z0 + 3.0,
  tone: "hi",
  crease: "lo",
  bevel: 0.3,
  material: "brass",
});
T.round({
  name: "pawl.cap",
  group: pawl,
  layer: turretLayer,
  F: VERT(O3[0], O3[1]),
  s0: WHEEL_Z0 + 3.0,
  s1: WHEEL_Z0 + 3.8,
  r: 1.3,
  tone: "mid",
  material: "chrome",
  details: { bolts: [{ s: WHEEL_Z0 + 3.8, r: 0, count: 1, size: 0.4 }] },
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
const FRONT = layerOf("front");

if (argv.includes("--audit")) {
  A.auditOrExit(R, P);
  await TA.orbitOrExit(T, R, P, {
    sweep: { at: (x) => follow({ crank: x }), from: 0, to: 1440, frame: 0.5 },
    workers: argv.includes("--workers"),
    quick: argv.includes("--quick"),
  });
}

const LABEL =
  "A four-station Geneva intermittent indexing drive on a cast plinth: a continuously rotating steel drive crank with counterweight and brass drive pin advances a four-station indexing turret by 90 degrees once per revolution and holds it stationary across the 270-degree dwell.";
const backSvg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: BACK });
const staticSvg = (list) =>
  `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg iso-layer" viewBox="0 0 ${WIDTH} ${HEIGHT}" aria-hidden="true">${list.join("")}</svg>`;
const frontSvg = staticSvg(FRONT);

const stage = `<div class="iso-stage iso-turn gd-stage" tabindex="0" role="slider" aria-label="Geneva indexing drive: drag around the crank or use arrow keys to turn the drive crank and index the 4-station turret" aria-valuemin="0" aria-valuemax="360" aria-valuenow="0" aria-valuetext="crank at 0 degrees, station 1">${backSvg}${out.layerSvg("crank", { width: WIDTH, height: HEIGHT })}${staticSvg(MID)}${out.layerSvg("turret", { width: WIDTH, height: HEIGHT })}${frontSvg}</div>`;

const EXTRA_CSS = `
.gd-stage { cursor: grab; touch-action: none; user-select: none; }
.gd-stage:active { cursor: grabbing; }
`;

const DATA = { turn: out.data };
const LIVE_SCRIPT = `
(() => {
  const DATA = ${JSON.stringify(DATA)};
  const follow = ${follow.toString()};
  const stage = document.querySelector(".gd-stage");
  const readout = document.querySelector("[data-readout]");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let angle = 0;
  let target = 0;
  let touring = !still.matches;
  let idle = 0;
  let last = 0;
  let own = false;
  const SPEED = 42;

  function stationInfo(crankDeg) {
    const pose = follow({ crank: crankDeg });
    const cNorm = (((crankDeg % 360) + 360) % 360);
    const wNorm = (((pose.wheel % 360) + 360) % 360);
    const rev = Math.floor((crankDeg + 180) / 360);
    const delta = crankDeg - rev * 360;
    const indexing = Math.abs(delta) < 45;
    const station = ((Math.round(pose.wheel / 90) % 4) + 4) % 4 + 1;
    return { cNorm, wNorm, indexing, station };
  }

  function show(crankDeg) {
    const info = stationInfo(crankDeg);
    const mode = info.indexing ? "index" : "dwell";
    const text = "S" + info.station + " (" + mode + ") · crank " + info.cNorm.toFixed(0) + "° · turret " + info.wNorm.toFixed(1) + "°";
    if (readout && readout.textContent !== text) readout.textContent = text;
    stage.setAttribute("aria-valuenow", String(Math.round(info.cNorm)));
    stage.setAttribute("aria-valuetext", "station " + info.station + " " + mode + ", crank " + Math.round(info.cNorm) + " degrees");
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

  stage.addEventListener("pointerdown", () => hold());
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
  title: "Geneva indexing drive",
  hint: "Drag the crank · arrow keys",
  readout: "S1 (index) · crank 0° · turret 0.0°",
  keys: [
    { mark: "raised", label: "Continuous drive crank with counterweight and brass drive roller pin" },
    { mark: "lit", label: "Four-station Geneva turret with work-holding pallets and detent pawl" },
  ],
  caption:
    "An interactive 3D intermittent-motion mechanism. A continuously rotating steel crank arm carries an offset brass roller pin that engages the four-station turret across a 90° arc, advancing the four fixture pallets by one quarter-turn per revolution while holding the turret locked in dwell across the remaining 270°.",
  body: `<style>${out.css}\n${EXTRA_CSS}</style>${stage}`,
});

const page = k.pageHtml({
  title: "Geneva indexing drive",
  theme,
  body,
  script: turnScript() + (verify ? `window.__isoVerify = ${JSON.stringify(out.verify)};\n` : "") + LIVE_SCRIPT,
  width: 680,
});

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const name = `geneva-indexing-drive${verify ? "-verify" : ""}${theme === "light" ? "-light" : ""}.html`;
  writeFileSync(join(HERE, name), page);
  console.log(
    `wrote ${name} · ${(page.length / 1024).toFixed(0)} KB · ${out.report.parts} parts · ${out.report.layers.map((l) => `${l.name}: ${l.planar} planes, ${l.dynamic} dynamic`).join(" · ")} · build ${out.report.seconds.toFixed(1)} s`,
  );
}
