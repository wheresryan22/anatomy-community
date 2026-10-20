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
const DEG = Math.PI / 180;

const WIDTH = 680;
const HEIGHT = 500;
const AZIMUTH = 36;
const ELEVATION = 34;

const BASE = { x: -92, y: -68, w: 184, d: 136, r: 8 };
const BASE_H = 12;
const FOOT_H = 5;

const Y_AXIS = -12;
const Z_OPT = 13.5;

const BS_POS = [0, Y_AXIS];
const M1_POS = [0, -48];
const M2_REST_X = 36;
const SCREEN_POS = [0, 36];
const SCREEN_R = 18.5;
const SCREEN_Z = 2.4;

const HALF_LAMBDA_UM = 0.3164;

export const P = k.fitProjection(
  [...k.boxCorners(BASE, -BASE_H - FOOT_H, 0), [0, 0, 28]],
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

for (const [x, y] of byDepth(k.corners(BASE, 20))) {
  const svg =
    S(k.cylinder(x, y, 7.2, -BASE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }) +
    S(k.cylinder(x, y, 5.5, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" });
  put({
    name: `bench.foot.${x}.${y}`,
    layer: "back",
    at: [x, y, -BASE_H - FOOT_H],
    svg,
    shapes: [
      A.cylinder(x, y, 7.2, -BASE_H - FOOT_H, 1.6, { ground: true }),
      A.cylinder(x, y, 5.5, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6),
    ],
  });
}

const screws = k.corners(BASE, 8);
const gridDots = [];
for (let gx = -72; gx <= 72; gx += 18) {
  for (let gy = -52; gy <= 52; gy += 18) {
    if (Math.hypot(gx - SCREEN_POS[0], gy - SCREEN_POS[1]) < SCREEN_R + 6) continue;
    if (Math.abs(gy - Y_AXIS) < 12 && gx > -84 && gx < 84) continue;
    if (Math.abs(gx) < 12 && gy < 16) continue;
    gridDots.push(at([gx, gy, 0]));
  }
}

const baseSvg =
  S(k.slabOf(BASE, -BASE_H, BASE_H, P, 8, 1.5), {
    tone: "mid",
    inner: L(k.sideSeam(BASE, -BASE_H + 4, P, 8), { tone: "faint" }),
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

const badge = { x: -80, y: 34, w: 42, d: 16, r: 1.8 };
const badgeLines = [30, 20]
  .map((w, i) => k.lineOnTop([badge.x + 5, badge.y + 5 + i * 5.5], [badge.x + 5 + w, badge.y + 5 + i * 5.5], 1.4, P))
  .join("");
put({
  name: "bench.badge",
  layer: "back",
  at: [badge.x + badge.w / 2, badge.y + badge.d / 2, 0.7],
  svg: `<g data-mat="brass">${S(k.slabOf(badge, 0, 1.4, P, 6, 0.3), { tone: "hi", crease: "none" }) + L(badgeLines, { tone: "lo", free: true })}</g>`,
  shapes: [A.slab(badge, 0, 1.4)],
});

const screenTicks = k.radialTicks(SCREEN_POS[0], SCREEN_POS[1], SCREEN_R - 2.2, SCREEN_R - 0.5, SCREEN_Z, 24, 6, P);
const screenSvg =
  S(k.cylinder(SCREEN_POS[0], SCREEN_POS[1], SCREEN_R + 2.5, 0, SCREEN_Z, P, 48, 0.5), { tone: "mid" }) +
  L(k.ring(SCREEN_POS[0], SCREEN_POS[1], SCREEN_R, SCREEN_Z, P, 48), { tone: "lo" }) +
  L(screenTicks.minor, { tone: "faint", free: true }) +
  L(screenTicks.major, { tone: "lo", free: true });

put({
  name: "screen.well",
  layer: "back",
  at: [SCREEN_POS[0], SCREEN_POS[1], SCREEN_Z / 2],
  svg: `<g data-mat="gunmetal">${screenSvg}</g>`,
  shapes: [A.cylinder(SCREEN_POS[0], SCREEN_POS[1], SCREEN_R + 2.5, 0, SCREEN_Z)],
});

const railPlan = { x: 24, y: Y_AXIS - 9, w: 34, d: 18, r: 1.8 };
const railTicks = k.topTicks(railPlan.x + 4, railPlan.x + railPlan.w - 4, 2, 5, railPlan.y + railPlan.d - 0.8, 4.5, [1.2, 2.4], P);
const railSvg =
  S(k.slabOf(railPlan, 0, 4.5, P, 6, 0.45), { tone: "lo" }) +
  L(railTicks.minor, { tone: "faint", free: true }) +
  L(railTicks.major, { tone: "mid", free: true });
put({
  name: "delay.rail",
  layer: "back",
  at: [railPlan.x + railPlan.w / 2, Y_AXIS, 2.25],
  svg: `<g data-mat="steel">${railSvg}</g>`,
  shapes: [A.slab(railPlan, 0, 4.5)],
});

const laserPed = { x: -78, y: Y_AXIS - 6.5, w: 40, d: 13, r: 1.8 };
const laserBox = { x: -80, y: Y_AXIS - 6.0, w: 44, d: 12, r: 2.2 };
const LF = G.frameAlong([-80, Y_AXIS, Z_OPT], [1, 0, 0]);
const laserSvg =
  S(k.slabOf(laserPed, 0, 7.5, P, 6, 0.4), { tone: "lo" }) +
  S(G.disc(0, 44, 6.0, LF, P, { bevel: 0.6 }), { tone: "mid", crease: "lo" }) +
  L(G.arcOf(LF, 5, 6.0, P) + G.arcOf(LF, 36, 6.0, P), { tone: "faint" }) +
  k.fadedSvg(G.ribsOf(LF, 5, 36, 6.0, 22, P, { fade: [0.08, 0.45] }), { tone: "lo" }) +
  S(G.disc(44, 46.5, 3.4, LF, P, { bevel: 0.3 }), { tone: "hi" }) +
  D([at([-74, Y_AXIS, Z_OPT + 6.0]), at([-42, Y_AXIS, Z_OPT + 6.0])], { size: 0.48, tone: "hi" });

put({
  name: "laser.head",
  layer: "front",
  at: [-58, Y_AXIS, 10],
  svg: `<g data-mat="gunmetal">${laserSvg}</g>`,
  shapes: [
    A.slab(laserPed, 0, 7.5),
    A.slab(laserBox, 7.5, 12.0),
  ],
});

const colPed = { x: -23.5, y: Y_AXIS - 4.5, w: 5, d: 9, r: 1.2 };
const CF = G.frameAlong([-22.5, Y_AXIS, Z_OPT], [1, 0, 0]);
const colSvg =
  S(k.slabOf(colPed, 0, 8.5, P, 4, 0.3), { tone: "lo" }) +
  S(G.disc(0, 3.2, 5.0, CF, P, { bevel: 0.35 }), { tone: "hi", crease: "lo" }) +
  L(G.arcOf(CF, 1.6, 3.6, P), { tone: "faint", free: true });

put({
  name: "laser.collimator",
  layer: "front",
  at: [-21, Y_AXIS, 10],
  svg: `<g data-mat="brass">${colSvg}</g>`,
  shapes: [
    A.slab(colPed, 0, 8.5),
    A.slab({ x: -22.5, y: Y_AXIS - 5.0, w: 3.2, d: 10.0, r: 1.0 }, 8.5, 10.0),
  ],
});

const anglePoly = (cx, cy, len, thick, deg) => {
  const c = Math.cos(deg * DEG);
  const s = Math.sin(deg * DEG);
  const hl = len / 2;
  const ht = thick / 2;
  return [
    [-hl, -ht],
    [hl, -ht],
    [hl, ht],
    [-hl, ht],
  ].map(([u, v]) => [cx + u * c - v * s, cy + u * s + v * c]);
};

const bsPoly = anglePoly(BS_POS[0] - 1.8, BS_POS[1], 12.0, 1.8, -45);
const cpPoly = anglePoly(BS_POS[0] + 6.2, BS_POS[1], 10.5, 1.7, -45);
const bsTableH = 5.0;
const bsOptH = 13.5;

const bsSvg =
  S(k.cylinder(BS_POS[0] + 2.0, BS_POS[1], 13.2, 0, bsTableH, P, 36, 0.5), { tone: "lo" }) +
  L(k.ring(BS_POS[0] + 2.0, BS_POS[1], 11.2, bsTableH, P, 28), { tone: "faint" }) +
  S(k.extrude(bsPoly, bsTableH, bsOptH, P, 0.3), { tone: "hi", crease: "lo", lit: true }) +
  S(k.extrude(cpPoly, bsTableH, bsOptH - 1.0, P, 0.25), { tone: "hi", crease: "lo" }) +
  D([at([BS_POS[0] - 7.5, BS_POS[1], bsTableH]), at([BS_POS[0] + 2.0, BS_POS[1] + 9.5, bsTableH])], { size: 0.42 });

put({
  name: "optics.beamsplitter",
  layer: "front",
  at: [BS_POS[0] + 2.0, BS_POS[1], 9],
  svg: `<g data-mat="steel">${bsSvg}</g>`,
  shapes: [
    A.cylinder(BS_POS[0] + 2.0, BS_POS[1], 13.2, 0, bsTableH),
    A.extruded(bsPoly, bsTableH, bsOptH),
    A.extruded(cpPoly, bsTableH, bsOptH - 1.0),
  ],
});

const m1PedR = 8.8;
const m1Cell = { x: M1_POS[0] - 7.5, y: M1_POS[1] - 3.5, w: 15, d: 7, r: 1.4 };
const M1F = G.frameAlong([M1_POS[0] - 4, M1_POS[1] - 3.5, Z_OPT], [0, -1, 0]);
const M1F2 = G.frameAlong([M1_POS[0] + 4, M1_POS[1] - 3.5, Z_OPT], [0, -1, 0]);
const m1Svg =
  S(k.cylinder(M1_POS[0], M1_POS[1], m1PedR, 0, 5.5, P, 32, 0.45), { tone: "lo" }) +
  S(k.slabOf(m1Cell, 5.5, 13.5, P, 5, 0.4), { tone: "mid", crease: "lo" }) +
  L(k.lineOnTop([m1Cell.x + 2, m1Cell.y + m1Cell.d - 0.8], [m1Cell.x + m1Cell.w - 2, m1Cell.y + m1Cell.d - 0.8], 19.0, P), { tone: "hi", free: true }) +
  S(G.disc(0, 3.2, 1.8, M1F, P, { bevel: 0.25 }), { tone: "hi" }) +
  S(G.disc(0, 3.2, 1.8, M1F2, P, { bevel: 0.25 }), { tone: "hi" }) +
  D([at([M1_POS[0] - 4.5, M1_POS[1], 19.0]), at([M1_POS[0] + 4.5, M1_POS[1], 19.0])], { size: 0.45 });

put({
  name: "mirror.fixed",
  layer: "front",
  at: [M1_POS[0], M1_POS[1], 10],
  svg: `<g data-mat="steel">${m1Svg}</g>`,
  shapes: [
    A.cylinder(M1_POS[0], M1_POS[1], m1PedR, 0, 5.5),
    A.slab(m1Cell, 5.5, 13.5),
  ],
});

const carPlan = { x: M2_REST_X, y: Y_AXIS - 7.5, w: 12, d: 15, r: 1.5 };
const carInner =
  S(k.slabOf(carPlan, 4.5, 14.5, P, 5, 0.4), { tone: "hi", crease: "lo", lit: true }) +
  L(k.lineOnTop([carPlan.x + 1.0, carPlan.y + 2], [carPlan.x + 1.0, carPlan.y + carPlan.d - 2], 19.0, P), { tone: "lit", free: true }) +
  L(k.lineOnTop([carPlan.x + 6, carPlan.y + carPlan.d - 0.8], [carPlan.x + 6, carPlan.y + carPlan.d], 4.5, P), { tone: "lit", free: true }) +
  D([at([carPlan.x + 6, Y_AXIS - 4.5, 19.0]), at([carPlan.x + 6, Y_AXIS + 4.5, 19.0])], { size: 0.45, tone: "lit" });

put({
  name: "mirror.movable",
  layer: "front",
  at: [M2_REST_X + 6, Y_AXIS, 12],
  svg: `<g data-part="carriage" data-mat="steel">${carInner}</g>`,
  shapes: [A.slab(carPlan, 4.5, 14.5)],
});

const micPed = { x: 58, y: Y_AXIS - 6, w: 20, d: 12, r: 1.6 };
const micBody = { x: 58, y: Y_AXIS - 5.2, w: 20, d: 10.4, r: 1.6 };
const MF = G.frameAlong([58, Y_AXIS, Z_OPT - 2], [1, 0, 0]);
const micStaticSvg =
  S(k.slabOf(micPed, 0, 6.5, P, 5, 0.4), { tone: "lo" }) +
  `<g data-part="spindle">${S(G.disc(-10, 0, 1.9, MF, P), { tone: "mid" })}</g>` +
  S(G.disc(0, 9.5, 4.2, MF, P, { bevel: 0.35 }), { tone: "mid", crease: "lo" }) +
  L(k.segment([58.8, Y_AXIS, Z_OPT + 2.2], [67.0, Y_AXIS, Z_OPT + 2.2], P), { tone: "lo", free: true }) +
  `<g data-part="thimble">` +
  S(G.disc(9.5, 19.5, 5.0, MF, P, { bevel: 0.45 }), { tone: "hi", crease: "lo", lit: true }) +
  L(G.arcOf(MF, 11.0, 5.0, P) + G.arcOf(MF, 18.2, 5.0, P), { tone: "faint" }) +
  k.fadedSvg(G.ribsOf(MF, 11.0, 18.2, 5.0, 24, P, { fade: [0.08, 0.48] }), { tone: "lo" }) +
  S(G.disc(19.5, 22.5, 3.0, MF, P, { bevel: 0.3 }), { tone: "mid" }) +
  `</g>`;

put({
  name: "micrometer.drive",
  layer: "front",
  at: [68, Y_AXIS, 11],
  svg: `<g data-mat="brass">${micStaticSvg}</g>`,
  shapes: [
    A.slab(micPed, 0, 6.5),
    A.slab(micBody, 6.5, 10.0),
  ],
});

const projPed = { x: -5.5, y: 6, w: 11, d: 6, r: 1.2 };
const PF = G.frameAlong([0, 6, Z_OPT], [0, 1, 0]);
const projSvg =
  S(k.slabOf(projPed, 0, 8.5, P, 4, 0.3), { tone: "lo" }) +
  S(G.disc(0, 6.0, 5.0, PF, P, { bevel: 0.35 }), { tone: "mid", crease: "lo" }) +
  D([at([0, 9, Z_OPT + 5.0])], { size: 0.55, tone: "lit" });

put({
  name: "optics.projector",
  layer: "front",
  at: [0, 9, 10],
  svg: `<g data-part="projector" data-mat="brass" data-lit="true">${projSvg}</g>`,
  shapes: [
    A.slab(projPed, 0, 8.5),
    A.slab({ x: -5.0, y: 6, w: 10.0, d: 6.0, r: 1.0 }, 8.5, 10.0),
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
  "A Michelson interferometer on a vibration-isolated optical breadboard: a helium-neon laser and collimator send a coherent 632.8 nm beam into a 45-degree 50/50 beamsplitter and compensator plate, dividing the wave between a fixed reference mirror and a micrometer-driven movable mirror before recombining both arms onto a circular Haidinger interference screen.";

const backSvg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: BACK });
const frontSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg iso-layer" viewBox="0 0 ${WIDTH} ${HEIGHT}" aria-hidden="true">${FRONT.join("")}</svg>`;

const stage = `<div class="iso-stage mi-stage" tabindex="0" role="slider" aria-label="Michelson interferometer: drag horizontally or use left and right arrow keys to turn the micrometer and shift the movable mirror; keys 1 through 4 select canonical path-difference states" aria-valuemin="-4" aria-valuemax="4" aria-valuenow="0" aria-valuetext="0.00 fringes, mirror shift 0.000 micrometers, constructive maximum">${backSvg}<canvas class="iso-layer mi-gl" aria-hidden="true"></canvas>${frontSvg}</div>`;

const EXTRA_CSS = `
${TURN.materialCss()}
.mi-stage { position: relative; cursor: ew-resize; touch-action: none; user-select: none; outline: none; }
.mi-stage:focus-visible { outline: 2px solid var(--anatomy-hi); outline-offset: 4px; border-radius: 6px; }
.mi-stage > .iso-layer { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
`;

const GL_CONFIG = {
  view: [WIDTH, HEIGHT],
  camera: glCamera(P),
  yAxis: Y_AXIS,
  zOpt: Z_OPT,
  screenPos: SCREEN_POS,
  screenR: SCREEN_R,
  screenZ: SCREEN_Z,
  m1Y: M1_POS[1] + 3.5,
  m2RestX: M2_REST_X,
  stepVec: [
    k.iso([1, 0, 0], P)[0] - k.iso([0, 0, 0], P)[0],
    k.iso([1, 0, 0], P)[1] - k.iso([0, 0, 0], P)[1],
  ],
};

const FRAGMENT = `
uniform float uFringes;
uniform float uShiftX;
uniform float uLight;

float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

void main() {
  vec2 vb = viewOf(gl_FragCoord.xy);
  vec3 sc = onFloor(vb, ${SCREEN_Z.toFixed(2)});
  vec2 ds = sc.xy - vec2(${SCREEN_POS[0].toFixed(2)}, ${SCREEN_POS[1].toFixed(2)});
  float r = length(ds);
  float R = ${SCREEN_R.toFixed(2)};

  vec3 col = vec3(0.0);
  float alpha = 0.0;

  if (r <= R) {
    float rn = r / R;
    float phase = 3.14159265 * (uFringes - 3.6 * rn * rn);
    float c = cos(phase);
    float fringe = c * c;
    float env = exp(-0.85 * rn * rn);
    float gran = 0.94 + 0.06 * noise2(ds * 3.5);
    float intensity = fringe * env * gran;

    float ret = min(abs(ds.x), abs(ds.y));
    float crossHair = 1.0 - smoothstep(0.18, 0.45, ret);
    float ringEdge = smoothstep(R - 0.6, R, r);

    vec3 bg = uLight > 0.5 ? vec3(0.16, 0.14, 0.15) : vec3(0.08, 0.06, 0.07);
    vec3 beam = uLight > 0.5 ? vec3(0.95, 0.16, 0.12) : vec3(1.0, 0.22, 0.16);
    vec3 hot = vec3(1.0, 0.72, 0.58);
    vec3 ringCol = mix(bg, beam, intensity);
    ringCol = mix(ringCol, hot, pow(intensity, 3.2) * 0.55);
    vec3 retCol = uLight > 0.5 ? vec3(0.95, 0.88, 0.72) : vec3(0.85, 0.78, 0.62);
    ringCol = mix(ringCol, retCol, crossHair * 0.38);

    float mask = 1.0 - smoothstep(R - 0.45, R + 0.15, r);
    col = ringCol * (1.0 - ringEdge * 0.25);
    alpha = mask * 0.94;
  }

  vec3 op = onFloor(vb, ${Z_OPT.toFixed(2)});
  vec2 p = op.xy;
  float y0 = ${Y_AXIS.toFixed(2)};
  float m2x = ${M2_REST_X.toFixed(2)} + uShiftX;

  float dSrc = segDist(p, vec2(-34.0, y0), vec2(0.0, y0));
  float dRef = segDist(p, vec2(0.0, y0), vec2(0.0, ${(M1_POS[1] + 3.5).toFixed(2)}));
  float dDel = segDist(p, vec2(0.0, y0), vec2(m2x, y0));
  float dOut = segDist(p, vec2(0.0, y0), vec2(0.0, 6.0));

  float c0 = cos(3.14159265 * uFringes);
  float vis = 0.22 + 0.78 * (c0 * c0);

  float gSrc = exp(-dSrc * dSrc * 0.55);
  float gRef = exp(-dRef * dRef * 0.65) * 0.85;
  float gDel = exp(-dDel * dDel * 0.65) * 0.85;
  float gOut = exp(-dOut * dOut * 0.55) * vis;

  float glow = max(max(gSrc, gRef), max(gDel, gOut));
  if (glow > 0.01 && r > R) {
    vec3 laserCol = uLight > 0.5 ? vec3(0.88, 0.12, 0.09) : vec3(1.0, 0.20, 0.14);
    float bAlpha = clamp(glow * (uLight > 0.5 ? 0.55 : 0.72), 0.0, 0.85);
    col = mix(col, laserCol, 1.0);
    alpha = max(alpha, bAlpha);
  }

  gl_FragColor = vec4(col * alpha, alpha);
}
`;

const LIVE_SCRIPT = `
(() => {
  const CFG = ${JSON.stringify(GL_CONFIG)};
  const FRAG = ${JSON.stringify(FRAGMENT)};
  const stage = document.querySelector(".mi-stage");
  const canvas = stage.querySelector(".mi-gl");
  const carriage = stage.querySelector('[data-part="carriage"]');
  const spindle = stage.querySelector('[data-part="spindle"]');
  const thimble = stage.querySelector('[data-part="thimble"]');
  const projector = stage.querySelector('[data-part="projector"]');
  const readout = document.querySelector("[data-readout]");
  const still = matchMedia("(prefers-reduced-motion: reduce)");

  const layer = glLayer({
    canvas,
    fragment: FRAG,
    view: CFG.view,
    camera: CFG.camera,
    uniforms: ["uFringes", "uShiftX", "uLight"],
  });

  let m = 0;
  let targetM = 0;
  let raf = 0;
  let dragging = false;
  let dragStartX = 0;
  let dragStartM = 0;

  function clampM(val) {
    return Math.max(-4, Math.min(4, val));
  }

  function formatSigned(val, digits) {
    const s = Math.abs(val).toFixed(digits);
    if (Math.abs(val) < 1e-4) return "+" + (0).toFixed(digits);
    return (val >= 0 ? "+" : "−") + s;
  }

  function draw() {
    const dm = clampM(m);
    const shiftUm = dm * ${HALF_LAMBDA_UM};
    const opdUm = shiftUm * 2;
    const shiftWorld = (dm / 4) * 3.2;
    const tx = (CFG.stepVec[0] * shiftWorld).toFixed(2);
    const ty = (CFG.stepVec[1] * shiftWorld).toFixed(2);
    const xform = "translate(" + tx + " " + ty + ")";
    if (carriage) carriage.setAttribute("transform", xform);
    if (spindle) spindle.setAttribute("transform", xform);
    if (thimble) thimble.setAttribute("transform", xform);
    const c0 = Math.cos(Math.PI * dm);
    const bright = c0 * c0;
    if (projector) {
      if (bright >= 0.5) projector.setAttribute("data-lit", "true");
      else projector.removeAttribute("data-lit");
    }
    const isLight = document.documentElement.getAttribute("data-theme") === "light" ||
      document.querySelector('.iso[data-theme="light"]') !== null ? 1 : 0;
    if (layer) {
      layer.draw({ uFringes: dm, uShiftX: shiftWorld, uLight: isLight }, 0);
    }
    const stateLabel = bright > 0.85 ? "max" : bright < 0.15 ? "null" : "quad";
    const fullState = bright > 0.85 ? "constructive maximum" : bright < 0.15 ? "destructive null" : "quadrature";
    const text = "Δd " + formatSigned(shiftUm, 3) + " µm · OPD " + formatSigned(opdUm, 3) + " µm · Δm " + formatSigned(dm, 2) + " (" + stateLabel + ")";
    if (readout && readout.textContent !== text) readout.textContent = text;
    stage.setAttribute("aria-valuenow", dm.toFixed(2));
    stage.setAttribute("aria-valuetext", formatSigned(dm, 2) + " fringes, mirror shift " + formatSigned(shiftUm, 3) + " micrometers, " + fullState);
  }

  function step() {
    raf = 0;
    if (still.matches) {
      m = targetM;
      draw();
      return;
    }
    const diff = targetM - m;
    if (Math.abs(diff) < 0.002) {
      m = targetM;
      draw();
      return;
    }
    m += diff * 0.22;
    draw();
    raf = requestAnimationFrame(step);
  }

  function setTarget(next) {
    targetM = clampM(next);
    if (still.matches) {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      m = targetM;
      draw();
      return;
    }
    if (!raf) raf = requestAnimationFrame(step);
  }

  stage.addEventListener("pointerdown", (e) => {
    stage.focus({ preventScroll: true });
    dragging = true;
    dragStartX = e.clientX;
    dragStartM = targetM;
    if (stage.setPointerCapture) {
      try { stage.setPointerCapture(e.pointerId); } catch {}
    }
  });

  stage.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const box = stage.getBoundingClientRect();
    const deltaFringes = ((e.clientX - dragStartX) / Math.max(180, box.width * 0.65)) * 8;
    targetM = clampM(dragStartM + deltaFringes);
    m = targetM;
    draw();
  });

  const endDrag = () => { dragging = false; };
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  stage.addEventListener("keydown", (e) => {
    const stepSize = e.shiftKey ? 1.0 : 0.25;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      setTarget(Math.round((targetM + stepSize) * 4) / 4);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      setTarget(Math.round((targetM - stepSize) * 4) / 4);
    } else if (e.key === "1") {
      e.preventDefault();
      setTarget(0);
    } else if (e.key === "2") {
      e.preventDefault();
      setTarget(0.5);
    } else if (e.key === "3") {
      e.preventDefault();
      setTarget(1.0);
    } else if (e.key === "4") {
      e.preventDefault();
      setTarget(2.5);
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
  title: "Michelson interferometer",
  hint: "Drag · arrow keys · 1–4",
  readout: "Δd +0.000 µm · OPD +0.000 µm · Δm +0.00 (max)",
  keys: [
    { mark: "lit", label: "50/50 beamsplitter, translating delay mirror M2, and micrometer thimble" },
    { mark: "raised", label: "632.8 nm He-Ne laser head, collimator, compensator plate, and fixed mirror M1" },
    { mark: "flat", label: "Circular Haidinger interference screen (one ring shift per λ/2 = 0.316 µm)" },
  ],
  caption:
    "A helium-neon laser beam (λ = 632.8 nm) is divided at a 45° half-silvered beamsplitter between a fixed reference mirror M1 and a movable delay mirror M2 on a micrometer stage, with a parallel silica compensator plate equalizing glass dispersion across both arms. Because the delay beam traverses the movable arm twice, a mirror displacement Δd produces an optical path difference OPD = 2Δd, shifting the circular Haidinger interference bullseye by Δm = 2Δd/λ fringes (one full bright-to-bright ring every 0.3164 µm).",
  body: `<style>${EXTRA_CSS}</style>${stage}`,
});

const page = k.pageHtml({
  title: "Michelson interferometer",
  theme,
  body,
  script: kitScript() + glScript() + LIVE_SCRIPT,
  width: 720,
});

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const name = `michelson-interferometer${theme === "light" ? "-light" : ""}.html`;
  writeFileSync(join(HERE, name), page);
  console.log(`wrote ${name} · ${(page.length / 1024).toFixed(0)} KB`);
}
