import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../.skill/kit/iso-kit.mjs";
import * as G from "../../../../.skill/kit/lathe.mjs";
import * as A from "../../../../.skill/kit/audit.mjs";
import { glCamera } from "../../../../.skill/kit/gl.mjs";
import { TURN } from "../../../../.skill/kit/turn.mjs";
import { kitScript, glScript } from "../../../../.skill/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const theme = argv.includes("--light") ? "light" : "dark";

const WIDTH = 680;
const HEIGHT = 500;
const AZIMUTH = 36;
const ELEVATION = 34;

const BASE = { x: -84, y: -56, w: 168, d: 116, r: 8 };
const BASE_H = 11;
const FOOT_H = 5;

const CRUC = [-6, 10];
const CRUC_BASE_R = 24.5;
const CRUC_WALL_R = 22.8;
const MELT_R = 19.4;
const Z_MELT = 13.5;

const COL_BASE = { x: -68, y: -2, w: 22, d: 24, r: 2.2 };
const COL_BODY = { x: -65, y: 1, w: 16, d: 18, r: 1.8 };
const ARM_PLAN = { x: -65, y: 3, w: 67, d: 14, r: 2.0 };

const RF_BASE = { x: 20, y: -44, w: 44, d: 24, r: 2.2 };
const RF_BODY = { x: 23, y: -41, w: 38, d: 18, r: 1.8 };

const DIAL_BASE = { x: 34, y: -4, w: 34, d: 38, r: 2.4 };
const DIAL_PED = { x: 37, y: 0, w: 28, d: 30, r: 1.8 };
const KNOB_POS = [51, 15];

export const P = k.fitProjection(
  [...k.boxCorners(BASE, -BASE_H - FOOT_H, 0), [-6, 10, 52]],
  WIDTH,
  HEIGHT,
  { pad: 24, azimuth: AZIMUTH, elevation: ELEVATION },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
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

for (const [x, y] of byDepth(k.corners(BASE, 18))) {
  const svg =
    S(k.cylinder(x, y, 7.0, -BASE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }) +
    S(k.cylinder(x, y, 5.4, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" });
  put({
    name: `bench.foot.${x}.${y}`,
    layer: "back",
    at: [x, y, -BASE_H - FOOT_H],
    svg,
    shapes: [
      A.cylinder(x, y, 7.0, -BASE_H - FOOT_H, 1.6, { ground: true }),
      A.cylinder(x, y, 5.4, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6),
    ],
  });
}

const screws = k.corners(BASE, 8);
const gridDots = [];
for (let gx = -66; gx <= 66; gx += 16) {
  for (let gy = -42; gy <= 42; gy += 16) {
    if (Math.hypot(gx - CRUC[0], gy - CRUC[1]) < CRUC_BASE_R + 6) continue;
    if (gx < -40 && gy > -8 && gy < 28) continue;
    if (gx > 14 && gy < -14) continue;
    if (gx > 28 && gy > -10 && gy < 40) continue;
    gridDots.push(at([gx, gy, 0]));
  }
}

const baseSvg =
  S(k.slabOf(BASE, -BASE_H, BASE_H, P, 8, 1.4), {
    tone: "mid",
    inner: L(k.sideSeam(BASE, -BASE_H + 3.8, P, 8), { tone: "faint" }),
  }) +
  L(k.planOutline(k.insetPlan(BASE, 5), 0, P), { tone: "faint" }) +
  L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }) +
  D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }) +
  D(gridDots, { size: 0.36, tone: "lo" });

put({
  name: "bench.base",
  layer: "back",
  at: [0, 0, -BASE_H],
  bias: 4,
  svg: baseSvg,
  shapes: [A.slab(BASE, -BASE_H, BASE_H, { ground: true })],
});

const badge = { x: -72, y: 34, w: 38, d: 14, r: 1.6 };
const badgeLines = [26, 18]
  .map((w, i) => k.lineOnTop([badge.x + 5, badge.y + 4.5 + i * 5.0], [badge.x + 5 + w, badge.y + 4.5 + i * 5.0], 1.4, P))
  .join("");
put({
  name: "bench.badge",
  layer: "back",
  at: [badge.x + badge.w / 2, badge.y + badge.d / 2, 0.7],
  svg: `<g data-mat="brass">${S(k.slabOf(badge, 0, 1.4, P, 6, 0.3), { tone: "hi", crease: "none" }) + L(badgeLines, { tone: "lo", free: true })}</g>`,
  shapes: [A.slab(badge, 0, 1.4)],
});

const crucTicks = k.radialTicks(CRUC[0], CRUC[1], CRUC_WALL_R - 0.8, 24, 6, Z_MELT, [1.0, 1.9], P);
const rfArcs = [5.4, 7.2, 9.0, 10.8].map((z) => k.sideArc(CRUC[0], CRUC[1], CRUC_WALL_R, z, P, 36)).join("");
const crucSvg =
  S(k.cylinder(CRUC[0], CRUC[1], CRUC_BASE_R, 0, 3.8, P, 48, 0.45), { tone: "lo" }) +
  S(k.cylinder(CRUC[0], CRUC[1], CRUC_WALL_R, 3.8, Z_MELT - 3.8, P, 48, 0.45), { tone: "mid", crease: "lo" }) +
  L(rfArcs, { tone: "lit" }) +
  L(k.ring(CRUC[0], CRUC[1], MELT_R, Z_MELT, P, 48), { tone: "lo" }) +
  L(crucTicks.minor, { tone: "faint", free: true }) +
  L(crucTicks.major, { tone: "lo", free: true });

put({
  name: "crucible.well",
  layer: "back",
  at: [CRUC[0], CRUC[1], Z_MELT / 2],
  svg: `<g data-mat="gunmetal">${crucSvg}</g>`,
  shapes: [
    A.cylinder(CRUC[0], CRUC[1], CRUC_BASE_R, 0, 3.8),
    A.cylinder(CRUC[0], CRUC[1], CRUC_WALL_R, 3.8, Z_MELT - 3.8),
  ],
});

const rfSvg =
  S(k.slabOf(RF_BASE, 0, 3.8, P, 6, 0.4), { tone: "lo" }) +
  S(k.slabOf(RF_BODY, 3.8, 10.2, P, 6, 0.45), {
    tone: "mid",
    crease: "lo",
    inner: L(k.sideSeam(RF_BODY, 8.8, P, 6), { tone: "faint" }),
  }) +
  S(k.cylinder(33, -32, 5.2, 14.0, 4.2, P, 28, 0.35), { tone: "hi", crease: "lo" }) +
  L(k.ring(33, -32, 3.2, 18.2, P, 24), { tone: "lo" }) +
  S(k.cylinder(51, -32, 5.2, 14.0, 4.2, P, 28, 0.35), { tone: "hi", crease: "lo" }) +
  L(k.ring(51, -32, 3.2, 18.2, P, 24), { tone: "lo" }) +
  D([at([27, -37, 14.0]), at([57, -27, 14.0])], { size: 0.44 });

put({
  name: "rf.supply",
  layer: "back",
  at: [42, -32, 9],
  svg: `<g data-mat="brass">${rfSvg}</g>`,
  shapes: [
    A.slab(RF_BASE, 0, 3.8),
    A.slab(RF_BODY, 3.8, 10.2),
    A.cylinder(33, -32, 5.2, 14.0, 4.2),
    A.cylinder(51, -32, 5.2, 14.0, 4.2),
  ],
});

const colSvg =
  S(k.slabOf(COL_BASE, 0, 4.5, P, 6, 0.45), { tone: "lo" }) +
  S(k.slabOf(COL_BODY, 4.5, 33.5, P, 6, 0.45), {
    tone: "mid",
    crease: "lo",
    inner: L(k.sideSeam(COL_BODY, 12.0, P, 6) + k.sideSeam(COL_BODY, 28.0, P, 6), { tone: "faint" }),
  }) +
  L(
    k.segment([COL_BODY.x + COL_BODY.w - 0.2, COL_BODY.y + 6, 6.5], [COL_BODY.x + COL_BODY.w - 0.2, COL_BODY.y + 6, 36.0], P) +
      k.segment([COL_BODY.x + COL_BODY.w - 0.2, COL_BODY.y + 12, 6.5], [COL_BODY.x + COL_BODY.w - 0.2, COL_BODY.y + 12, 36.0], P),
    { tone: "lo", free: true },
  ) +
  D([at([COL_BASE.x + 4, COL_BASE.y + 4, 4.5]), at([COL_BASE.x + 18, COL_BASE.y + 20, 4.5])], { size: 0.45 });

put({
  name: "gantry.column",
  layer: "front",
  at: [-57, 10, 20],
  svg: `<g data-mat="steel">${colSvg}</g>`,
  shapes: [
    A.slab(COL_BASE, 0, 4.5),
    A.slab(COL_BODY, 4.5, 33.5),
  ],
});

const bouleStriations = [19.0, 21.2, 23.4, 25.6].map((z) => k.sideArc(CRUC[0], CRUC[1], 7.6, z, P, 32)).join("");
const bouleSvg =
  S(k.cylinder(CRUC[0], CRUC[1], 7.6, 16.8, 10.8, P, 36, 0.45), { tone: "hi", crease: "lo", lit: true }) +
  L(bouleStriations, { tone: "lo" }) +
  L(k.ring(CRUC[0], CRUC[1], 5.6, 27.6, P, 28), { tone: "faint", free: true }) +
  S(k.cylinder(CRUC[0], CRUC[1], 5.0, 27.6, 3.0, P, 32, 0.35), { tone: "hi", crease: "lo", lit: true }) +
  S(k.cylinder(CRUC[0], CRUC[1], 2.2, 30.6, 7.4, P, 28, 0.2), { tone: "mid" });

put({
  name: "crystal.boule",
  layer: "front",
  at: [CRUC[0], CRUC[1], 26],
  svg: `<g data-part="boule" data-mat="steel" data-lit="true">${bouleSvg}</g>`,
  shapes: [
    A.cylinder(CRUC[0], CRUC[1], 7.6, 16.8, 10.8),
    A.cylinder(CRUC[0], CRUC[1], 5.0, 27.6, 3.0),
    A.cylinder(CRUC[0], CRUC[1], 2.2, 30.6, 7.4),
  ],
});

const armTicks = k.topTicks(-56, -14, 3, 4, ARM_PLAN.y + ARM_PLAN.d - 3.2, 43.0, [1.2, 2.2], P, "x");
const armSvg =
  S(k.slabOf(ARM_PLAN, 38.0, 5.0, P, 6, 0.45), {
    tone: "mid",
    crease: "lo",
    inner: L(k.sideSeam(ARM_PLAN, 40.5, P, 6), { tone: "faint" }),
  }) +
  L(armTicks.minor, { tone: "faint", free: true }) +
  L(armTicks.major, { tone: "lo", free: true }) +
  S(k.cylinder(CRUC[0], CRUC[1], 5.6, 43.0, 4.8, P, 32, 0.4), { tone: "hi", crease: "lo", lit: true }) +
  L(k.ring(CRUC[0], CRUC[1], 3.4, 47.8, P, 24), { tone: "lo" }) +
  D([at([-57, 10, 43.0]), at([CRUC[0], CRUC[1], 47.8])], { size: 0.48 });

put({
  name: "gantry.arm",
  layer: "front",
  at: [CRUC[0], CRUC[1], 43],
  bias: 6,
  svg: `<g data-part="pullhead" data-mat="steel">${armSvg}</g>`,
  shapes: [
    A.slab(ARM_PLAN, 38.0, 5.0),
    A.cylinder(CRUC[0], CRUC[1], 5.6, 43.0, 4.8),
  ],
});

const dialTicks = k.radialTicks(KNOB_POS[0], KNOB_POS[1], 11.4, 24, 6, 7.5, [1.0, 2.0], P);
const knobMarker = k.lineOnTop([KNOB_POS[0], KNOB_POS[1]], [KNOB_POS[0] + 6.2, KNOB_POS[1]], 11.8, P);
const dialSvg =
  S(k.slabOf(DIAL_BASE, 0, 4.2, P, 6, 0.4), { tone: "lo" }) +
  S(k.slabOf(DIAL_PED, 4.2, 3.3, P, 6, 0.35), { tone: "mid", crease: "lo" }) +
  L(dialTicks.minor, { tone: "faint", free: true }) +
  L(dialTicks.major, { tone: "lo", free: true }) +
  `<g data-part="knob" data-mat="brass" data-lit="true">` +
  S(k.cylinder(KNOB_POS[0], KNOB_POS[1], 8.2, 7.5, 4.3, P, 36, 0.4), { tone: "hi", crease: "lo", lit: true }) +
  L(k.ring(KNOB_POS[0], KNOB_POS[1], 6.4, 11.8, P, 28), { tone: "lo" }) +
  L(knobMarker, { tone: "lit", free: true }) +
  D([at([KNOB_POS[0], KNOB_POS[1], 11.8])], { size: 0.48, tone: "lit" }) +
  `</g>` +
  D([at([DIAL_PED.x + 4, DIAL_PED.y + 4, 7.5]), at([DIAL_PED.x + 24, DIAL_PED.y + 28, 7.5])], { size: 0.42 });

put({
  name: "dial.console",
  layer: "front",
  at: [KNOB_POS[0], KNOB_POS[1], 6],
  svg: `<g data-mat="gunmetal">${dialSvg}</g>`,
  shapes: [
    A.slab(DIAL_BASE, 0, 4.2),
    A.slab(DIAL_PED, 4.2, 3.3),
    A.cylinder(KNOB_POS[0], KNOB_POS[1], 8.2, 7.5, 4.3),
  ],
});

A.settle(R, P);

if (argv.includes("--audit")) {
  A.auditOrExit(R, P);
}

const layerOf = (name) =>
  R.items
    .filter((item) => item.layer === name)
    .sort((a, b) => a.key - b.key)
    .map((item) => item.svg);

const BACK = [`<path class="iso-halo" d="${k.haloOf(BASE, -BASE_H - FOOT_H, BASE_H, P)}"/>`, ...layerOf("back")];
const FRONT = layerOf("front");

const LABEL =
  "A Czochralski single-crystal silicon puller on an instrument plinth: an RF-heated fused-quartz crucible holds a molten silicon pool at 1420 degrees Celsius with thermal-convection cells and a bright meniscus ring, while a cantilevered seed pullhead lifts a rotating monocrystalline silicon boule coupled to a pull-rate control console.";

const backSvg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: BACK });
const frontSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg iso-layer" viewBox="0 0 ${WIDTH} ${HEIGHT}" aria-hidden="true">${FRONT.join("")}</svg>`;

const stage = `<div class="iso-stage cz-stage" tabindex="0" role="slider" aria-label="Czochralski silicon crystal puller: drag horizontally or use left and right arrow keys to adjust pull rate v and lift the silicon boule; keys 1 through 4 select canonical growth regimes" aria-valuemin="0.4" aria-valuemax="2.0" aria-valuenow="1.10" aria-valuetext="Pull rate 1.10 mm/min, boule radius 7.6 mm, balanced Voronkov regime">${backSvg}<canvas class="iso-layer cz-gl" aria-hidden="true"></canvas>${frontSvg}</div>`;

const EXTRA_CSS = `
${TURN.materialCss()}
.cz-stage { position: relative; cursor: ew-resize; touch-action: none; user-select: none; outline: none; }
.cz-stage:focus-visible { outline: 2px solid var(--anatomy-hi); outline-offset: 4px; border-radius: 6px; }
.cz-stage > .iso-layer { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
`;

const GL_CONFIG = {
  view: [WIDTH, HEIGHT],
  camera: glCamera(P),
  crucPos: CRUC,
  meltR: MELT_R,
  zMelt: Z_MELT,
  knobOrigin: k.iso([KNOB_POS[0], KNOB_POS[1], 11.8], P),
  stepZ: [
    k.iso([0, 0, 1], P)[0] - k.iso([0, 0, 0], P)[0],
    k.iso([0, 0, 1], P)[1] - k.iso([0, 0, 0], P)[1],
  ],
};

const FRAGMENT = `
uniform float uPullRate;
uniform float uPhase;
uniform float uBouleR;
uniform float uLight;

void main() {
  vec2 vb = viewOf(gl_FragCoord.xy);
  vec3 sc = onFloor(vb, ${Z_MELT.toFixed(2)});
  vec2 ds = sc.xy - vec2(${CRUC[0].toFixed(2)}, ${CRUC[1].toFixed(2)});
  float r = length(ds);
  float R = ${MELT_R.toFixed(2)};

  vec3 col = vec3(0.0);
  float alpha = 0.0;

  if (r <= R) {
    float rn = r / R;
    float ang = atan(ds.y, ds.x);
    float swirl = ang * 4.0 + uPhase * 2.4 - rn * 7.5;
    float cell = 0.5 + 0.5 * cos(swirl) * sin(rn * 9.42 - uPhase * 1.6);
    float turb = noise2(ds * 0.42 + vec2(uPhase * 0.35, -uPhase * 0.28));
    float conv = clamp(0.55 * cell + 0.45 * turb, 0.0, 1.0);

    float meniscusDist = abs(r - uBouleR);
    float meniscus = exp(-meniscusDist * meniscusDist * 1.15);
    float wallHeat = smoothstep(0.55, 0.98, rn);
    float isotherm = 1.0 - smoothstep(0.04, 0.14, abs(fract(rn * 4.5 - uPhase * 0.25) - 0.5));

    float heat = clamp(0.32 + 0.38 * wallHeat + 0.28 * conv * (0.7 + 0.3 * uPullRate) + 0.65 * meniscus, 0.0, 1.0);

    vec3 coreCol = uLight > 0.5 ? vec3(0.76, 0.20, 0.06) : vec3(0.68, 0.16, 0.05);
    vec3 midCol  = uLight > 0.5 ? vec3(0.96, 0.48, 0.10) : vec3(0.98, 0.46, 0.09);
    vec3 hotCol  = vec3(1.0, 0.88, 0.52);

    vec3 meltCol = mix(coreCol, midCol, smoothstep(0.15, 0.72, heat));
    meltCol = mix(meltCol, hotCol, clamp(pow(heat, 2.8) * 0.75 + meniscus * 0.72 + isotherm * 0.14, 0.0, 1.0));

    float rimShadow = smoothstep(R - 0.8, R, r);
    float mask = 1.0 - smoothstep(R - 0.4, R + 0.15, r);
    col = meltCol * (1.0 - rimShadow * 0.28);
    alpha = mask * 0.95;
  }

  gl_FragColor = vec4(col * alpha, alpha);
}
`;

const LIVE_SCRIPT = `
(() => {
  const CFG = ${JSON.stringify(GL_CONFIG)};
  const FRAG = ${JSON.stringify(FRAGMENT)};
  const stage = document.querySelector(".cz-stage");
  const canvas = stage.querySelector(".cz-gl");
  const boule = stage.querySelector('[data-part="boule"]');
  const pullhead = stage.querySelector('[data-part="pullhead"]');
  const knob = stage.querySelector('[data-part="knob"]');
  const readout = document.querySelector("[data-readout]");
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");

  const layer = glLayer({
    canvas,
    fragment: FRAG,
    view: CFG.view,
    camera: CFG.camera,
    uniforms: ["uPullRate", "uPhase", "uBouleR", "uLight"],
  });

  let v = 1.10;
  let targetV = 1.10;
  let phase = 0;
  let raf = 0;
  let dragging = false;
  let dragStartX = 0;
  let dragStartV = 1.10;

  const clampV = (val) => Math.max(0.40, Math.min(2.00, val));

  function draw() {
    const norm = (v - 0.40) / 1.60;
    const liftMm = (norm - 0.4375) * 4.2;
    const dx = liftMm * CFG.stepZ[0];
    const dy = liftMm * CFG.stepZ[1];
    const xform = "translate(" + dx.toFixed(2) + " " + dy.toFixed(2) + ")";
    if (boule) boule.setAttribute("transform", xform);
    if (pullhead) pullhead.setAttribute("transform", xform);

    const knobDeg = (norm - 0.4375) * 140;
    if (knob) {
      knob.setAttribute(
        "transform",
        "rotate(" + knobDeg.toFixed(2) + " " + CFG.knobOrigin[0].toFixed(2) + " " + CFG.knobOrigin[1].toFixed(2) + ")",
      );
    }

    const bouleR = 9.2 - 1.45 * v;
    const voronkov = v / 0.82;
    const isBalanced = v >= 0.85 && v <= 1.35;
    if (boule) {
      if (isBalanced) boule.setAttribute("data-lit", "true");
      else boule.removeAttribute("data-lit");
    }

    const isLight =
      document.documentElement.getAttribute("data-theme") === "light" ||
      document.querySelector('.iso[data-theme="light"]') !== null
        ? 1
        : 0;
    if (layer) {
      layer.draw({ uPullRate: v, uPhase: phase, uBouleR: bouleR, uLight: isLight }, 0);
    }

    const regime = v < 0.85 ? "interstitial-rich" : v > 1.35 ? "vacancy-rich" : "Voronkov neutral";
    const text =
      "v " +
      v.toFixed(2) +
      " mm/min · R " +
      bouleR.toFixed(1) +
      " mm · v/G " +
      voronkov.toFixed(2) +
      " (" +
      regime +
      ")";
    if (readout && readout.textContent !== text) readout.textContent = text;
    stage.setAttribute("aria-valuenow", v.toFixed(2));
    stage.setAttribute(
      "aria-valuetext",
      "Pull rate " + v.toFixed(2) + " mm/min, meniscus radius " + bouleR.toFixed(1) + " mm, " + regime,
    );
  }

  function step() {
    raf = 0;
    if (still.matches) {
      v = targetV;
      draw();
      return;
    }
    const diff = targetV - v;
    if (Math.abs(diff) < 0.002) {
      v = targetV;
      phase += (targetV - 1.10) * 0.25;
      draw();
      return;
    }
    v += diff * 0.22;
    phase += diff * 1.8;
    draw();
    raf = requestAnimationFrame(step);
  }

  function setTarget(next) {
    targetV = clampV(next);
    phase += (targetV - v) * 2.2;
    if (still.matches) {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      v = targetV;
      draw();
      return;
    }
    if (!raf) raf = requestAnimationFrame(step);
  }

  stage.addEventListener("pointerdown", (e) => {
    stage.focus({ preventScroll: true });
    dragging = true;
    dragStartX = e.clientX;
    dragStartV = targetV;
    if (stage.setPointerCapture) {
      try {
        stage.setPointerCapture(e.pointerId);
      } catch {}
    }
  });

  stage.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const box = stage.getBoundingClientRect();
    const deltaV = ((e.clientX - dragStartX) / Math.max(180, box.width * 0.65)) * 1.6;
    targetV = clampV(dragStartV + deltaV);
    phase += (targetV - v) * 3.0;
    v = targetV;
    draw();
  });

  const endDrag = () => {
    dragging = false;
  };
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  stage.addEventListener("keydown", (e) => {
    const stepSize = e.shiftKey ? 0.20 : 0.05;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      setTarget(Math.round((targetV + stepSize) * 20) / 20);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      setTarget(Math.round((targetV - stepSize) * 20) / 20);
    } else if (e.key === "1") {
      e.preventDefault();
      setTarget(0.55);
    } else if (e.key === "2") {
      e.preventDefault();
      setTarget(1.10);
    } else if (e.key === "3") {
      e.preventDefault();
      setTarget(1.50);
    } else if (e.key === "4") {
      e.preventDefault();
      setTarget(1.90);
    }
  });

  if (typeof ResizeObserver === "function") {
    new ResizeObserver(() => draw()).observe(stage);
  }
  draw();
})();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Czochralski silicon crystal puller",
  hint: "Drag · arrow keys · 1–4",
  readout: "v 1.10 mm/min · R 7.6 mm · v/G 1.34 (Voronkov neutral)",
  keys: [
    { mark: "lit", label: "Monocrystalline <100> silicon boule, seed chuck, and pull-rate rotary control knob" },
    { mark: "raised", label: "Leadscrew puller column, cantilevered pullhead carriage, and RF-heated fused-quartz crucible" },
    { mark: "flat", label: "1420 °C molten silicon convection pool and glowing solidification meniscus ring" },
  ],
  caption:
    "In the Czochralski process, electronic-grade polysilicon is melted at 1420 °C inside a rotating fused-quartz crucible heated by radio-frequency induction coils. A seed crystal oriented along the <100> crystallographic plane is dipped into the free melt surface and withdrawn upward at pull rate v while counter-rotating; surface tension supports an incandescent liquid meniscus at the solid–liquid interface where crystal radius R scales inversely with pull speed and the Voronkov ratio v/G governs point-defect incorporation.",
  body: `<style>${EXTRA_CSS}</style>${stage}`,
});

const page = k.pageHtml({
  title: "Czochralski silicon crystal puller",
  theme,
  body,
  script: kitScript() + glScript() + LIVE_SCRIPT,
  width: 720,
});

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const name = `czochralski-crystal-puller${theme === "light" ? "-light" : ""}.html`;
  writeFileSync(join(HERE, name), page);
  console.log(`wrote ${name} · ${(page.length / 1024).toFixed(0)} KB`);
}
