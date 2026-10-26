import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../.skill/kit/iso-kit.mjs";
import { kitScript } from "../../../../.skill/scripts/inline-kit.mjs";
import { BASE, COUNT, CYCLE, FOLDS, armedAt, bobPose, lengthMetres } from "./model.mjs";
import { SHAPES, shapeRing } from "./shapes.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

const WIDTH = 700;
const HEIGHT = 760;
const AZIMUTH = 32;
const ELEVATION = 62;

const METRE = 42;
const RAIL_R = 72;
const BLOCK_W = 7.2;
const RAIL_Z = 88;
const RAIL_H = 8;
const EYE_H = 2.2;
const EYE_TOP = RAIL_Z + RAIL_H + EYE_H;
const BOB_R = 2.9;
const BOB_H = 4;
const STEM = 1.7;
const ATTACH = BOB_H / 2 + STEM;
const MAG_R = 1.25;
const MAG_H = 3.4;
const PLINTH_R = 130;
const POST_R = 118;
const POST_RAD = 4.3;

const spec0 = {
  folds: 3,
  span: 8,
  theta0: 15 * DEG,
  plane: "radial",
  metre: METRE,
  radius: RAIL_R,
  eyeZ: EYE_TOP,
};

const fit = [];
for (let step = 0; step < 24; step++) {
  const angle = (step / 24) * TAU;
  fit.push([PLINTH_R * Math.cos(angle), PLINTH_R * Math.sin(angle), -26]);
  fit.push([(POST_R + 8) * Math.cos(angle), (POST_R + 8) * Math.sin(angle), EYE_TOP + 6]);
}
const P = k.fitProjection(fit, WIDTH, HEIGHT, { pad: 36, azimuth: AZIMUTH, elevation: ELEVATION });

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);

const view = [Math.cos(AZIMUTH * DEG), Math.sin(AZIMUTH * DEG)];
const across = [-view[1], view[0]];
const acrossAng = Math.atan2(across[1], across[0]);
const PLAN_SCALE = (Math.min(WIDTH, HEIGHT) - 96) / (2 * PLINTH_R);
const PLAN_BOB = BOB_R * PLAN_SCALE * 0.72;

function planPt(x, y) {
  const along = x * view[0] + y * view[1];
  const side = x * across[0] + y * across[1];
  return [WIDTH / 2 + side * PLAN_SCALE, HEIGHT / 2 + along * PLAN_SCALE];
}

function rectRing(cx, cy, angle, length, width) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const ux = (c * length) / 2;
  const uy = (s * length) / 2;
  const vx = (-s * width) / 2;
  const vy = (c * width) / 2;
  return [
    [cx - ux - vx, cy - uy - vy],
    [cx + ux - vx, cy + uy - vy],
    [cx + ux + vx, cy + uy + vy],
    [cx - ux + vx, cy - uy + vy],
  ];
}

function bar(cx, cy, angle, length, width, z, height, tone = "mid") {
  return S(k.extrude(rectRing(cx, cy, angle, length, width), z, height, P, { convex: true, bevel: 0.45 }), { tone, crease: "lo" });
}

function radialBar(r0, r1, angle, width, z, height, tone = "mid") {
  const mid = (r0 + r1) / 2;
  return bar(Math.cos(angle) * mid, Math.sin(angle) * mid, angle, r1 - r0, width, z, height, tone);
}

const pile = [];
function add(x, y, z, svg) {
  pile.push({ depth: k.depthOf([x, y, z], P), svg });
}

const phiOf = (index) => (index / COUNT) * TAU;
const polar = (radius, angle, z = 0) => [radius * Math.cos(angle), radius * Math.sin(angle), z];

const eyes = Array.from({ length: COUNT }, (_, index) => polar(RAIL_R, phiOf(index), EYE_TOP));
const stations = [0.5, 16.5, 32.5].map((index) => (index / COUNT) * TAU);

add(0, 0, -22, `<path class="iso-halo" d="${k.haloOf({ x: -PLINTH_R, y: -PLINTH_R, w: PLINTH_R * 2, d: PLINTH_R * 2, r: PLINTH_R }, -24, 2, P)}"/>`);

for (const angle of stations) {
  const [x, y] = polar(122, angle);
  add(x, y, -20, S(k.cylinder(x, y, 10, -26, 4, P, 28), { tone: "lo" }));
  add(x, y, -16, S(k.cylinder(x, y, 6.4, -22, 8, P, 24), { tone: "mid" }));
}

add(0, 0, -7, S(k.cylinder(0, 0, PLINTH_R, -14, 14, P, 80, 1.3), { tone: "lo", crease: "faint" }));
add(0, 0, 1, S(k.cylinder(0, 0, 22, 0, 3, P, 40, 0.5), { tone: "mid" }));
add(0, 0, 40, S(k.cylinder(0, 0, 11, 3, 85, P, 40), { tone: "mid", crease: "lo" }));
add(0, 0, 96, L(k.ring(0, 0, 11, 96, P, 32), { tone: "lo" }));
add(0, 0, 96, L(k.ring(0, 0, 6.5, 96, P, 24), { tone: "faint" }));
add(0, 0, 96, D([at([0, 0, 96])], { size: 0.55, tone: "hi" }));
add(0, 0, 50, L(k.sideArc(0, 0, 11, 48, P, 20), { tone: "faint" }));
add(0, 0, 70, L(k.sideArc(0, 0, 11, 72, P, 20), { tone: "faint" }));

for (const radius of [36, 54]) add(0, 0, 0.2, L(k.ring(0, 0, radius, 0.2, P, 64), { tone: "faint" }));
add(0, 0, 0.2, L(k.ring(0, 0, 104, 0.2, P, 80), { tone: "lo" }));
add(0, 0, 0.2, L(k.ring(0, 0, 116, 0.2, P, 80), { tone: "faint" }));
add(0, 0, 0.2, L(k.ring(0, 0, PLINTH_R, 0.2, P, 96), { tone: "lo" }));

for (let step = 0; step < 12; step++) {
  const major = step % 4 === 0;
  const angle = phiOf(step * 4);
  const inner = major ? 104 : 116;
  add(0, 0, 0.3, L(k.lineOnTop(polar(inner, angle), polar(PLINTH_R, angle), 0.3, P), { tone: major ? "hi" : "lo" }));
}

for (const angle of stations) {
  add(Math.cos(angle) * 40, Math.sin(angle) * 40, 92, radialBar(11, RAIL_R - 1, angle, 3.3, RAIL_Z, RAIL_H));
  add(Math.cos(angle) * 96, Math.sin(angle) * 96, 92, radialBar(RAIL_R + 1, POST_R - POST_RAD, angle, 3.3, RAIL_Z, RAIL_H));
  const [px, py] = polar(POST_R, angle);
  add(px, py, 40, S(k.cylinder(px, py, POST_RAD, 0, RAIL_Z, P, 22), { tone: "mid", crease: "lo" }));
  add(px, py, RAIL_Z, S(k.cylinder(px, py, 6.6, RAIL_Z - 1.2, 3.2, P, 22), { tone: "mid" }));
  add(px, py, 24, L(k.sideArc(px, py, POST_RAD, 22, P, 16), { tone: "faint" }));
  add(px, py, 58, L(k.sideArc(px, py, POST_RAD, 56, P, 16), { tone: "faint" }));
  add(px, py, 2, D([at([px, py, 2])], { size: 0.4 }));
}

const chord = 2 * RAIL_R * Math.sin(Math.PI / COUNT);
const screws = [];
for (let index = 0; index < COUNT; index++) {
  const angle = phiOf(index);
  const [cx, cy] = polar(RAIL_R, angle);
  add(cx, cy, 92, bar(cx, cy, angle + Math.PI / 2, chord + 0.2, BLOCK_W, RAIL_Z, RAIL_H));
  add(cx, cy, EYE_TOP, S(k.cylinder(cx, cy, 1.15, RAIL_Z + RAIL_H, EYE_H, P, 12), { tone: "mid", crease: "none" }));
  const screwA = angle + 0.045;
  screws.push(at(polar(RAIL_R + 2.15, screwA, RAIL_Z + RAIL_H)));
}
add(0, 0, 96, D(screws, { size: 0.38 }));
add(0, 0, EYE_TOP, D(eyes.map((eye) => at(eye)), { size: 0.46, tone: "mid" }));

const label = { x: -view[0] * 78 - 20, y: -view[1] * 78 - 7, w: 40, d: 14, r: 1.5 };
add(-view[0] * 78, -view[1] * 78, 1, S(k.slabOf(label, 0, 2.2, P, 4, 0.35), { tone: "mid" }));
for (const y of [label.y + 3.2, label.y + 7, label.y + 10.8]) {
  add(-view[0] * 78, y, 2.3, L(k.lineOnTop([label.x, y], [label.x + label.w, y], 2.3, P), { tone: "lo" }));
}

const consoleR = 108;
const [kx, ky] = [view[0] * consoleR, view[1] * consoleR];
const knobSlots = [
  { id: "folds", slot: -1 },
  { id: "span", slot: 0 },
  { id: "amp", slot: 1 },
];
const KNOB_R = 5.1;
const KNOB_Z = 6;
const knobs = knobSlots.map(({ id, slot }) => {
  const wx = kx + across[0] * slot * 22 + view[0] * 1.5;
  const wy = ky + across[1] * slot * 22 + view[1] * 1.5;
  const screen = at([wx, wy, KNOB_Z + 4.4]);
  return { id, wx, wy, x: screen[0], y: screen[1], z: KNOB_Z + 4.4, r: KNOB_R };
});

const leverWorld = { x: kx + view[0] * 9, y: ky + view[1] * 9, z: KNOB_Z + 0.4 };
const leverScreen = at([leverWorld.x, leverWorld.y, leverWorld.z]);

function bobArt(lit) {
  return (
    S(k.cylinder(0, 0, BOB_R, -BOB_H / 2, BOB_H, P, 16, 0.4), { tone: "hi", lit, crease: "lo" }) +
    S(k.cylinder(0, 0, 0.55, BOB_H / 2, STEM, P, 10), { tone: "hi", lit, crease: "none" })
  );
}

function rodSvg(index, held) {
  const bottom = held.z - MAG_H / 2;
  const foot = at([held.x, held.y, 0.25]);
  const depth = k.depthOf([held.x, held.y, held.z], P);
  return `<g data-live="rod" data-i="${index}" data-depth="${depth}">
    <g class="iso-dots" data-tone="mid"><circle data-foot cx="${foot[0].toFixed(2)}" cy="${foot[1].toFixed(2)}" r="0.55"/></g>
    <path data-pole class="iso-line" data-tone="faint" d="${k.segment([held.x, held.y, 0.25], [held.x, held.y, bottom], P)}"/>
    <g data-head>${S(k.cylinder(held.x, held.y, MAG_R, bottom, MAG_H, P, 12, 0.25), { tone: "mid" })}</g>
  </g>`;
}

function pendulumSvg(index, pose) {
  const depth = k.depthOf([pose.x, pose.y, pose.z], P);
  return `<g data-live="bob" data-i="${index}" data-depth="${depth}">
    <path data-string class="iso-line" data-tone="lo" d="${k.segment(eyes[index], [pose.x, pose.y, pose.z + ATTACH], P)}"/>
    <g data-bob transform="${k.translateAlong(P, [pose.x, pose.y, pose.z])}">${bobArt(index === 0)}</g>
  </g>`;
}

const helds = Array.from({ length: COUNT }, (_, index) => armedAt(index, spec0, BOB_R, MAG_R));
const bus = k.onTop(helds.map((held) => [held.x, held.y]), 0.35, P, true);

const disc = (x, y, r, cls) => `<circle class="${cls}" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r.toFixed(2)}"/>`;
const [pcx, pcy] = planPt(0, 0);
let planMag = "";
let planSwing = "";
for (let index = 0; index < COUNT; index++) {
  const eye = planPt(eyes[index][0], eyes[index][1]);
  const bob = planPt(helds[index].pose.x, helds[index].pose.y);
  const mag = planPt(helds[index].x, helds[index].y);
  planMag += `<circle data-plan-mag data-i="${index}" class="plan-mag" cx="${mag[0].toFixed(2)}" cy="${mag[1].toFixed(2)}" r="${(MAG_R * PLAN_SCALE * 1.35).toFixed(2)}"/>`;
  planSwing += `<g data-i="${index}"><line data-string class="plan-line" x1="${eye[0].toFixed(2)}" y1="${eye[1].toFixed(2)}" x2="${bob[0].toFixed(2)}" y2="${bob[1].toFixed(2)}"/><path data-plan-bob class="plan-bob" d=""/></g>`;
}
const planPosts = stations.map((angle) => {
  const [x, y] = planPt(Math.cos(angle) * POST_R, Math.sin(angle) * POST_R);
  return disc(x, y, POST_RAD * PLAN_SCALE, "plan-post");
}).join("");
const planSvg = `<g data-plan style="display:none">
  <g data-plan-rig>
    ${disc(pcx, pcy, PLINTH_R * PLAN_SCALE, "plan-plinth")}
    ${disc(pcx, pcy, 104 * PLAN_SCALE, "plan-ring")}
    ${disc(pcx, pcy, RAIL_R * PLAN_SCALE, "plan-ring")}
    ${disc(pcx, pcy, 11 * PLAN_SCALE, "plan-hub")}
    ${planPosts}
  </g>
  <g data-plan-mags>${planMag}</g>
  <g data-plan-swing>${planSwing}</g>
</g>`;
const mix = [
  ...helds.map((held, index) => ({ depth: k.depthOf([held.x, held.y, held.z], P), svg: rodSvg(index, held) })),
  ...helds.map((held, index) => ({ depth: k.depthOf([held.pose.x, held.pose.y, held.pose.z], P), svg: pendulumSvg(index, held.pose) })),
]
  .sort((a, b) => a.depth - b.depth)
  .map((item) => item.svg)
  .join("");

function pointerPath(knob, angle) {
  return k.lineOnTop(
    [knob.wx, knob.wy],
    [knob.wx + Math.cos(angle) * (KNOB_R - 0.15), knob.wy + Math.sin(angle) * (KNOB_R - 0.15)],
    knob.z,
    P,
  );
}

const foldAngle = -2.15 + (FOLDS.indexOf(spec0.folds) / (FOLDS.length - 1)) * 4.3;
const spanAngle = -2.15 + (spec0.span / 14) * 4.3;
const ampAngle = -2.15 + ((15 - 8) / 12) * 4.3;
const knobAngles = { folds: foldAngle, span: spanAngle, amp: ampAngle };

let front = bar(kx, ky, acrossAng, 78, 20, 0, KNOB_Z, "mid");
for (const knob of knobs) {
  const angle = knobAngles[knob.id];
  const detents = knob.id === "folds"
    ? FOLDS.map((_, index) => {
        const tick = -2.15 + (index / (FOLDS.length - 1)) * 4.3;
        return at([knob.wx + Math.cos(tick) * 3.3, knob.wy + Math.sin(tick) * 3.3, knob.z]);
      })
    : [];
  front += S(k.cylinder(knob.wx, knob.wy, KNOB_R, KNOB_Z, 4.4, P, 28), { tone: "mid" });
  front += L(k.knurl(knob.wx, knob.wy, KNOB_R, KNOB_Z + 0.4, KNOB_Z + 4, 28, P, 0.25), { tone: "lo" });
  front += L(k.ring(knob.wx, knob.wy, KNOB_R - 0.15, knob.z, P, 28), { tone: "lo" });
  front += D([at([knob.wx, knob.wy, knob.z])], { size: 0.45, tone: "hi" });
  if (detents.length) front += D(detents, { size: 0.36, tone: "lo" });
  front += `<path data-pointer="${knob.id}" class="iso-line" data-tone="hi" d="${pointerPath(knob, angle)}"/>`;
}

const leverAngle = acrossAng + 0.85;
const leverTip = [leverWorld.x + Math.cos(leverAngle) * 12, leverWorld.y + Math.sin(leverAngle) * 12, leverWorld.z];
front += S(k.cylinder(leverWorld.x, leverWorld.y, 1.5, KNOB_Z, 1.6, P, 14), { tone: "mid" });
front += D([at([leverWorld.x, leverWorld.y, leverWorld.z])], { size: 0.42 });
front += `<path data-lever class="iso-line" data-tone="hi" d="${k.lineOnTop([leverWorld.x, leverWorld.y], [leverTip[0], leverTip[1]], leverWorld.z, P)}"/>`;
front += `<g data-handle transform="${k.translateAlong(P, leverTip)}">${S(k.cylinder(0, 0, 1.7, 0, 3.2, P, 14), { tone: "mid" })}<g class="iso-dots" data-tone="hi"><circle cx="0" cy="0" r="0.45"/></g></g>`;

const staticSvg = pile.sort((a, b) => a.depth - b.depth).map((item) => item.svg).join("");
const longest = lengthMetres(BASE);
const shortest = lengthMetres(BASE + spec0.span);

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "Galileo's ring, seen from above. Forty-eight pendulums of stepped lengths hang on a circular rail. Electromagnets hold them out, and when they are released the overhead pattern repeats every third of a turn.",
  body: [
    `<g data-rig>${staticSvg}</g>`,
    `<path data-bus class="iso-line" data-tone="faint" d="${bus}"/>`,
    `<g data-mix>${mix}</g>`,
    `<g data-front>${front}</g>`,
    planSvg,
  ],
});

const BOOK = JSON.parse(readFileSync(join(HERE, "palettes.json"), "utf8"));
const PALETTE_LIST = [
  { id: "white", label: "white", colors: ["#f4f4f1"], hard: true },
  { id: "ink", label: "black and white", colors: ["#141414", "#f4f4f1"], hard: true },
  ...BOOK,
];

const PRESETS = [
  { id: "ring", name: "Ring II", folds: 3, span: 8, pull: 15, rate: 1, palette: "white", plane: "radial", shape: "circle", size: 4 },
  { id: "trefoil", name: "Trefoil", folds: 3, span: 10, pull: 18, rate: 1, palette: "c176", plane: "radial", shape: "triangle", size: 4 },
  { id: "cross", name: "Cross", folds: 4, span: 6, pull: 16, rate: 1, palette: "c256", plane: "radial", shape: "cross", size: 4 },
  { id: "saw", name: "Saw", folds: 3, span: 12, pull: 11, rate: 1, palette: "ink", plane: "radial", shape: "pentagon", size: 3 },
  { id: "hex", name: "Hex", folds: 6, span: 5, pull: 14, rate: 1, palette: "c284", plane: "radial", shape: "hexagon", size: 4 },
  { id: "bloom", name: "Bloom", folds: 2, span: 10, pull: 20, rate: 1, palette: "c313", plane: "radial", shape: "star", size: 5 },
];

function shapeIcon(shape) {
  const ring = shapeRing(shape, 5.2);
  const d = ring.map(([x, y], index) => `${index ? "L" : "M"}${(8 + x).toFixed(2)} ${(8 - y).toFixed(2)}`).join("") + "Z";
  return `<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="${d}" fill="currentColor"/></svg>`;
}
function colorChip(item, on) {
  const label = (item.label || item.names.join(", ")).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return `<button type="button" data-palette="${item.id}" aria-label="${label}"${on ? " data-on" : ""}><span class="pantone">${item.colors.map((color) => `<i style="background:${color}"></i>`).join("")}</span></button>`;
}

const controls = `<style>
.ring-controls{display:flex;flex-direction:column;align-items:stretch;gap:14px;width:700px;max-width:100%;margin:18px 0 4px;color:var(--anatomy-muted);font:12px/1.4 var(--anatomy-mono, ui-monospace, monospace)}
.ring-presets{flex-wrap:wrap}
.ring-group{display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center;padding-top:10px;border-top:1px solid var(--anatomy-lo)}
.ring-group h3{flex:1 1 100%;margin:0 0 2px;font:inherit;font-size:10px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--anatomy-strong)}
.ring-controls div{display:flex;align-items:center;gap:6px}
.ring-controls button{font:inherit;color:var(--anatomy-text);background:transparent;border:0;border-bottom:1px solid transparent;padding:2px 1px;cursor:pointer}
.ring-controls button[data-on]{color:var(--anatomy-strong);border-bottom-color:var(--anatomy-mid)}
.ring-controls b{color:var(--anatomy-text);font-weight:500;min-width:2.4em;text-align:center}
.plan-plinth{fill:var(--anatomy-paper);stroke:var(--anatomy-lo);stroke-width:.8}
.plan-ring{fill:none;stroke:var(--anatomy-lo);stroke-width:.7}
.plan-hub,.plan-post{fill:var(--anatomy-face);stroke:var(--anatomy-mid);stroke-width:.7}
.plan-mag{fill:var(--anatomy-mid);stroke:none}
.plan-line{fill:none;stroke:var(--anatomy-lo);stroke-width:.7;stroke-linecap:round}
.plan-bob{fill:var(--anatomy-strong);stroke:var(--anatomy-paper);stroke-width:1;stroke-linejoin:round}
.pantone{display:inline-flex;height:12px;border:1px solid var(--anatomy-lo)}
.pantone i{display:block;width:11px;height:12px}
.ring-controls .color-row{flex:1 1 100%;align-items:flex-start;min-width:0;max-width:100%}
.ring-controls .color-scroll{display:flex;flex-wrap:wrap;align-items:flex-start;align-content:flex-start;gap:4px;flex:1;min-width:0;max-height:84px;overflow:auto;padding:2px 2px 4px;scrollbar-width:thin}
.ring-controls button[data-palette]{flex:none;padding:2px;line-height:0;border-bottom-color:transparent}
.ring-controls button[data-palette][data-on]{outline:1px solid var(--anatomy-strong);outline-offset:2px;border-bottom-color:transparent}
.ring-controls button[data-shape]{display:inline-flex;padding:1px 2px;line-height:0;border-bottom-color:transparent}
.ring-controls button[data-shape][data-on]{color:var(--anatomy-strong);outline:1px solid var(--anatomy-strong);outline-offset:2px}
.iso-svg [data-swatch] .iso-fill{fill:var(--bob)}
.iso-svg [data-swatch] .iso-shade{fill:var(--bob-dim)}
.iso-svg [data-swatch] .iso-top{fill:var(--bob-top)}
.iso-svg [data-swatch] .iso-edge{stroke:var(--bob-ink)}
.iso-svg [data-swatch] .iso-crease,.iso-svg [data-swatch] .iso-bevel{stroke:var(--bob-ink);opacity:.4}
.iso-caption a{color:inherit}
</style>
<div class="ring-controls">
  <div class="ring-presets"><span>Preset</span>${PRESETS.map((preset) => `<button type="button" data-preset="${preset.id}"${preset.id === "ring" ? " data-on" : ""}>${preset.name}</button>`).join("")}<button type="button" data-reset>Reset</button></div>
  <section class="ring-group" aria-labelledby="ctrl-show">
    <h3 id="ctrl-show">Show and View</h3>
    <div><span>Show</span><button type="button" data-layer="rig" data-on>Rig</button><button type="button" data-layer="mag" data-on>Magnets</button><button type="button" data-layer="string" data-on>Strings</button><button type="button" data-beads>Beads</button></div>
    <div><span>View</span><button type="button" data-view="bench" data-on>Bench</button><button type="button" data-view="over">Overhead</button></div>
    <div><span>Speed</span><button type="button" data-rate="-1" aria-label="Slower">−</button><b data-rate-read>1×</b><button type="button" data-rate="1" aria-label="Faster">+</button></div>
  </section>
  <section class="ring-group" aria-labelledby="ctrl-rig">
    <h3 id="ctrl-rig">Rig setup</h3>
    <div><span>Fold</span>${FOLDS.map((fold) => `<button type="button" data-set-fold="${fold}"${fold === 3 ? " data-on" : ""}>${fold}</button>`).join("")}</div>
    <div><span>Span</span><button type="button" data-span="-1" aria-label="Fewer swings between long and short">−</button><b data-span-read>8</b><button type="button" data-span="1" aria-label="More swings between long and short">+</button></div>
    <div><span>Pull</span><button type="button" data-amp="-1" aria-label="Smaller release angle">−</button><b data-amp-read>15°</b><button type="button" data-amp="1" aria-label="Larger release angle">+</button></div>
    <div><button type="button" data-plane data-on>Out</button><button type="button" data-play>Release</button></div>
    <div><button type="button" data-drift aria-label="Continuously change fold, span and pull">Drift</button></div>
  </section>
  <section class="ring-group" aria-labelledby="ctrl-beads">
    <h3 id="ctrl-beads">Beads</h3>
    <div><span>Paint</span><button type="button" data-color-mode="move" data-on>Moving</button><button type="button" data-color-mode="fixed">Fixed</button></div>
    <div><span>Shape</span>${SHAPES.map((shape, index) => `<button type="button" data-shape="${shape.id}" aria-label="${shape.label}"${index === 0 ? " data-on" : ""}>${shapeIcon(shape.id)}</button>`).join("")}</div>
    <div><span>Size</span><button type="button" data-size="-1" aria-label="Smaller beads">−</button><b data-size-read>4</b><button type="button" data-size="1" aria-label="Larger beads">+</button></div>
    <div class="color-row"><span>Color</span><div class="color-scroll" data-colors>${PALETTE_LIST.map((item, index) => colorChip(item, index === 0)).join("")}</div></div>
  </section>
</div>`;

const modelJs = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");
const shapesJs = readFileSync(join(HERE, "shapes.mjs"), "utf8").replace(/^export /gm, "");
const CONFIG = {
  width: WIDTH,
  height: HEIGHT,
  metre: METRE,
  radius: RAIL_R,
  eyeZ: EYE_TOP,
  bobR: BOB_R,
  magR: MAG_R,
  magH: MAG_H,
  attach: ATTACH,
  eyes,
  knobs,
  lever: { ...leverWorld, across: acrossAng, screen: leverScreen },
  knobR: KNOB_R,
  view,
  across,
  planScale: PLAN_SCALE,
  planBob: PLAN_BOB,
  plinth: PLINTH_R,
  postR: POST_R,
  presets: PRESETS,
  palettes: PALETTE_LIST,
};

const live = `
const P = ${JSON.stringify(P)};
const CONFIG = ${JSON.stringify(CONFIG)};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const mix = svg.querySelector("[data-mix]");
const bus = svg.querySelector("[data-bus]");
const readout = document.querySelector("[data-readout]");
const leverPath = svg.querySelector("[data-lever]");
const handle = svg.querySelector("[data-handle]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const rods = [...mix.querySelectorAll('[data-live="rod"]')];
const bobs = [...mix.querySelectorAll('[data-live="bob"]')];
for (const node of [...rods, ...bobs]) {
  node._depth = Number(node.dataset.depth);
  node._i = Number(node.dataset.i);
}
const spec = { folds: 3, span: 8, theta0: 15 * Math.PI / 180, plane: "radial", metre: CONFIG.metre, radius: CONFIG.radius, eyeZ: CONFIG.eyeZ };
const planRoot = svg.querySelector("[data-plan]");
const planRig = svg.querySelector("[data-plan-rig]");
const planMag = svg.querySelector("[data-plan-mags]");
const planBobs = [...svg.querySelectorAll("[data-plan-bob]")];
const planStrings = [...planRoot.querySelectorAll("[data-string]")];
const planMags = [...svg.querySelectorAll("[data-plan-mag]")];
const rig = svg.querySelector("[data-rig]");
const front = svg.querySelector("[data-front]");
const layers = { rig: true, mag: true, string: true };
let viewMode = "bench", palette = "white", colorMode = "move", beadSize = 4, beadShape = "circle", shownPalette = "";
const bobAt = Array(${COUNT});
for (const node of bobs) bobAt[node._i] = node;
function turnRing(ring, angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return ring.map(([x, y]) => [x * c - y * s, x * s + y * c]);
}
function beadPath(cx, cy, radius, shape, angle) {
  const ring = turnRing(shapeRing(shape, radius), angle);
  let d = "";
  for (let i = 0; i < ring.length; i++) d += (i ? "L" : "M") + (cx + ring[i][0]).toFixed(2) + " " + (cy + ring[i][1]).toFixed(2);
  return d + "Z";
}
function bobScale() { return beadSize / 4; }
function bobMarkup(shape, angle, lit) {
  const scale = bobScale();
  const ring = turnRing(shapeRing(shape, ${BOB_R} * scale), angle);
  const height = ${BOB_H} * scale;
  const body = solidSvg(extrude(ring, -height / 2, height, P, { convex: !CONCAVE.has(shape), bevel: shape === "circle" ? 0.4 * scale : 0 }), { tone: "hi", lit, crease: "lo" });
  const stem = solidSvg(cylinder(0, 0, 0.55, height / 2, ${STEM}, P, 8), { tone: "hi", lit, crease: "none" });
  return body + stem;
}
let drift = false, driftT = 0, driftStep = 0, driftKey = "";
function applyPreset(preset) {
  drift = false;
  spec.folds = preset.folds;
  spec.span = preset.span;
  spec.theta0 = preset.pull * Math.PI / 180;
  spec.plane = preset.plane;
  rate = preset.rate;
  palette = preset.palette;
  beadShape = preset.shape;
  beadSize = preset.size;
  poke();
}
function resetRing() {
  applyPreset(CONFIG.presets[0]);
  viewMode = "bench";
  layers.rig = true;
  layers.mag = true;
  layers.string = true;
  draw();
}
function presetOn(preset) {
  return spec.folds === preset.folds && spec.span === preset.span && Math.round(spec.theta0 * 180 / Math.PI) === preset.pull && Math.abs(rate - preset.rate) < 0.001 && palette === preset.palette && spec.plane === preset.plane && beadShape === preset.shape && beadSize === preset.size;
}
let sim = 0, rate = 1, held = true, playing = false, auto = !still.matches, visible = true;
let frame = 0, last = 0, orderKey = "", hover = -1, idle = 0;
const RATES = [1, 1.25, 1.5, 1.75, 2, 3, 4, 5, 6, 8, 10, 12];
function formatRate(value) {
  return String(Math.round(value * 100) / 100) + "×";
}
function stepRate(dir) {
  let index = 0;
  let best = Infinity;
  RATES.forEach((item, at) => {
    const gap = Math.abs(item - rate);
    if (gap < best) { best = gap; index = at; }
  });
  rate = RATES[Math.max(0, Math.min(RATES.length - 1, index + dir))];
}
function planOf(x, y) {
  const along = x * CONFIG.view[0] + y * CONFIG.view[1];
  const side = x * CONFIG.across[0] + y * CONFIG.across[1];
  return [CONFIG.width / 2 + side * CONFIG.planScale, CONFIG.height / 2 + along * CONFIG.planScale];
}
function hexOf(r, g, b) {
  const byte = (v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0");
  return "#" + byte(r) + byte(g) + byte(b);
}
function mixHex(a, b, t) {
  const pick = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const pa = pick(a), pb = pick(b);
  return hexOf(pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t, pa[2] + (pb[2] - pa[2]) * t);
}
function ramp(stops, t) {
  const x = Math.max(0, Math.min(0.9999, t)) * (stops.length - 1);
  const i = Math.floor(x);
  return mixHex(stops[i], stops[i + 1], x - i);
}
function tone(fill) {
  const r = parseInt(fill.slice(1, 3), 16) / 255;
  const g = parseInt(fill.slice(3, 5), 16) / 255;
  const b = parseInt(fill.slice(5, 7), 16) / 255;
  const light = 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55;
  return {
    fill,
    top: mixHex(fill, "#ffffff", 0.24),
    dim: mixHex(fill, "#000000", 0.3),
    ink: light ? mixHex(fill, "#111111", 0.72) : mixHex(fill, "#f7f7f4", 0.5),
  };
}
function colorOf(pose, index) {
  const entry = CONFIG.palettes.find((item) => item.id === palette);
  if (!entry || entry.metal) return null;
  let share;
  if (colorMode === "fixed") {
    const group = ${COUNT} / spec.folds;
    share = (index % group) / group;
  } else {
    const span = Math.sin(spec.theta0) || 1;
    share = (Math.sin(pose.theta) / span + 1) / 2;
  }
  const fill = entry.hard
    ? entry.colors[Math.min(entry.colors.length - 1, Math.floor(Math.min(0.999, share) * entry.colors.length))]
    : ramp(entry.colors, share);
  return Object.assign(tone(fill), { hard: !!entry.hard });
}
function paintBob(art, circle, pose, index) {
  const color = colorOf(pose, index);
  if (!color) {
    art.removeAttribute("data-swatch");
    circle.style.fill = "";
    circle.style.stroke = "";
    circle.style.strokeWidth = "";
    return;
  }
  art.setAttribute("data-swatch", palette);
  art.style.setProperty("--bob", color.fill);
  art.style.setProperty("--bob-dim", color.dim);
  art.style.setProperty("--bob-top", color.top);
  art.style.setProperty("--bob-ink", color.ink);
  circle.style.fill = color.fill;
  circle.style.stroke = color.ink;
  circle.style.strokeWidth = color.hard ? "2.2" : "1.25";
}
function applyLayers() {
  const bench = viewMode === "bench";
  rig.style.display = bench && layers.rig ? "" : "none";
  front.style.display = bench && layers.rig ? "" : "none";
  bus.style.display = bench && layers.mag ? "" : "none";
  for (const rod of rods) rod.style.display = bench && layers.mag ? "" : "none";
  for (const bob of bobs) {
    bob.style.display = bench ? "" : "none";
    bob.querySelector("[data-string]").style.display = layers.string ? "" : "none";
  }
  planRoot.style.display = bench ? "none" : "";
  planRig.style.display = layers.rig ? "" : "none";
  planMag.style.display = layers.mag ? "" : "none";
  for (const line of planStrings) line.style.display = layers.string ? "" : "none";
}
const clock = (t) => {
  const s = Math.floor(Math.max(0, t) % ${CYCLE});
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
};
const knobAngle = (id) => {
  if (id === "folds") return -2.15 + (FOLDS.indexOf(spec.folds) / (FOLDS.length - 1)) * 4.3;
  if (id === "span") return -2.15 + (spec.span / 14) * 4.3;
  const deg = spec.theta0 * 180 / Math.PI;
  return -2.15 + ((deg - 8) / 12) * 4.3;
};
function pointerOf(knob, angle) {
  return lineOnTop(
    [knob.wx, knob.wy],
    [knob.wx + Math.cos(angle) * (CONFIG.knobR - 0.15), knob.wy + Math.sin(angle) * (CONFIG.knobR - 0.15)],
    knob.z, P);
}
function layoutRods() {
  const feet = [];
  for (let index = 0; index < ${COUNT}; index++) {
    const heldBob = armedAt(index, spec, CONFIG.bobR * bobScale(), CONFIG.magR);
    const bottom = heldBob.z - CONFIG.magH / 2;
    const foot = iso([heldBob.x, heldBob.y, 0.25], P);
    const node = rods[index];
    node.querySelector("[data-foot]").setAttribute("cx", foot[0].toFixed(2));
    node.querySelector("[data-foot]").setAttribute("cy", foot[1].toFixed(2));
    node.querySelector("[data-pole]").setAttribute("d", pathOf([foot, iso([heldBob.x, heldBob.y, bottom], P)]));
    node.querySelector("[data-head]").innerHTML = solidSvg(cylinder(heldBob.x, heldBob.y, CONFIG.magR, bottom, CONFIG.magH, P, 12, 0.25), { tone: "mid" });
    node._depth = depthOf([heldBob.x, heldBob.y, heldBob.z], P);
    const mag = planOf(heldBob.x, heldBob.y);
    planMags[index].setAttribute("cx", mag[0].toFixed(2));
    planMags[index].setAttribute("cy", mag[1].toFixed(2));
    feet.push([heldBob.x, heldBob.y]);
  }
  bus.setAttribute("d", onTop(feet, 0.35, P, true));
  for (const knob of CONFIG.knobs) {
    svg.querySelector('[data-pointer="' + knob.id + '"]').setAttribute("d", pointerOf(knob, knobAngle(knob.id)));
  }
}
function leverTo(isHeld) {
  const angle = CONFIG.lever.across + (isHeld ? 0.85 : -0.35);
  const tip = [CONFIG.lever.x + Math.cos(angle) * 12, CONFIG.lever.y + Math.sin(angle) * 12, CONFIG.lever.z];
  leverPath.setAttribute("d", lineOnTop([CONFIG.lever.x, CONFIG.lever.y], [tip[0], tip[1]], CONFIG.lever.z, P));
  handle.setAttribute("transform", translateAlong(P, tip));
}
function sortMix() {
  const nodes = [...mix.children];
  nodes.sort((a, b) => a._depth - b._depth || a._i - b._i);
  const key = nodes.map((node) => node.dataset.live + node._i).join(",");
  if (key === orderKey) return;
  orderKey = key;
  for (const node of nodes) mix.appendChild(node);
}
function draw() {
  for (let index = 0; index < ${COUNT}; index++) {
    const pose = bobPose(index, sim, spec);
    const node = bobAt[index];
    const art = node.querySelector("[data-bob]");
    const outward = Math.atan2(pose.y, pose.x);
    art.innerHTML = bobMarkup(beadShape, outward, index === 0);
    art.setAttribute("transform", translateAlong(P, [pose.x, pose.y, pose.z]));
    const eye = iso(CONFIG.eyes[index], P);
    const tip = iso([pose.x, pose.y, pose.z + ${BOB_H} * bobScale() / 2 + ${STEM}], P);
    node.querySelector("[data-string]").setAttribute("d", pathOf([eye, tip]));
    node._depth = depthOf([pose.x, pose.y, pose.z], P);
    const at = planOf(pose.x, pose.y);
    const from = planOf(CONFIG.eyes[index][0], CONFIG.eyes[index][1]);
    const origin = planOf(0, 0);
    const radius = CONFIG.planBob * (beadSize / 4);
    planBobs[index].setAttribute("d", beadPath(at[0], at[1], radius, beadShape, Math.atan2(at[1] - origin[1], at[0] - origin[0])));
    planStrings[index].setAttribute("x2", at[0].toFixed(2));
    planStrings[index].setAttribute("y2", at[1].toFixed(2));
    planStrings[index].setAttribute("x1", from[0].toFixed(2));
    planStrings[index].setAttribute("y1", from[1].toFixed(2));
    paintBob(node.querySelector("[data-bob]"), planBobs[index], pose, index);
  }
  sortMix();
  applyLayers();
  leverTo(held);
  const group = ${COUNT} / spec.folds;
  const hi = ${BASE} + spec.span;
  const ladder = spec.span ? ${BASE} + "–" + hi : String(${BASE});
  let text = spec.folds + "×" + group + " · " + ladder + " · " + clock(sim);
  if (held) text = "held · " + text;
  if (hover >= 0) {
    const pose = bobPose(hover, sim, spec);
    text = "bob " + (hover + 1) + " · " + pose.n + " · " + pose.metres.toFixed(2) + " m";
  }
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", text);
  document.querySelectorAll("[data-set-fold]").forEach((button) => {
    if (Number(button.dataset.setFold) === spec.folds) button.setAttribute("data-on", "");
    else button.removeAttribute("data-on");
  });
  document.querySelector("[data-span-read]").textContent = String(Math.round(spec.span));
  const driftBtn = document.querySelector("[data-drift]");
  if (drift) driftBtn.setAttribute("data-on", "");
  else driftBtn.removeAttribute("data-on");
  document.querySelector("[data-amp-read]").textContent = Math.round(spec.theta0 * 180 / Math.PI) + "°";
  document.querySelector("[data-rate-read]").textContent = formatRate(rate);
  const plane = document.querySelector("[data-plane]");
  plane.textContent = spec.plane === "radial" ? "Out" : "Around";
  document.querySelector("[data-play]").textContent = held ? "Release" : playing ? "Hold" : "Play";
  document.querySelectorAll("[data-layer]").forEach((button) => {
    if (layers[button.dataset.layer]) button.setAttribute("data-on", "");
    else button.removeAttribute("data-on");
  });
  const beads = document.querySelector("[data-beads]");
  if (!layers.rig && !layers.mag && !layers.string) beads.setAttribute("data-on", "");
  else beads.removeAttribute("data-on");
  document.querySelectorAll("[data-view]").forEach((button) => {
    if (button.dataset.view === viewMode) button.setAttribute("data-on", "");
    else button.removeAttribute("data-on");
  });
  document.querySelectorAll("[data-palette]").forEach((button) => {
    if (button.dataset.palette === palette) button.setAttribute("data-on", "");
    else button.removeAttribute("data-on");
  });
  if (shownPalette !== palette) {
    shownPalette = palette;
    const scroller = document.querySelector("[data-colors]");
    const on = scroller.querySelector("[data-on]");
    if (on) scroller.scrollTop = Math.max(0, on.offsetTop - scroller.offsetTop - scroller.clientHeight / 2 + on.offsetHeight / 2);
  }
  document.querySelectorAll("[data-color-mode]").forEach((button) => {
    if (button.dataset.colorMode === colorMode) button.setAttribute("data-on", "");
    else button.removeAttribute("data-on");
  });
  document.querySelectorAll("[data-shape]").forEach((button) => {
    if (button.dataset.shape === beadShape) button.setAttribute("data-on", "");
    else button.removeAttribute("data-on");
  });
  document.querySelector("[data-size-read]").textContent = String(beadSize);
  document.querySelectorAll("[data-preset]").forEach((button) => {
    const preset = CONFIG.presets.find((item) => item.id === button.dataset.preset);
    if (preset && presetOn(preset)) button.setAttribute("data-on", "");
    else button.removeAttribute("data-on");
  });
}
function poke() {
  layoutRods();
  draw();
  if (visible && (playing || auto || drift) && !still.matches) run();
}
function run() {
  if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); }
}
const DRIFT_SPANS = [4, 6, 8, 10, 12, 14, 11, 7, 5];
const DRIFT_PULLS = [10, 13, 16, 20, 17, 14, 11];
function stepDrift(dt) {
  driftT += dt;
  const step = Math.floor(driftT / 4);
  if (step === driftStep) return;
  driftStep = step;
  spec.folds = FOLDS[step % FOLDS.length];
  spec.span = DRIFT_SPANS[step % DRIFT_SPANS.length];
  spec.theta0 = DRIFT_PULLS[step % DRIFT_PULLS.length] * Math.PI / 180;
  const key = spec.folds + ":" + spec.span + ":" + Math.round(spec.theta0 * 180 / Math.PI);
  if (key === driftKey) return;
  driftKey = key;
  layoutRods();
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
  last = now;
  if (auto && held) {
    sim = 0;
    if (now > 1100) { held = false; playing = true; auto = false; }
  } else if (playing && !held) {
    sim = (sim + dt * rate) % ${CYCLE};
  }
  if (drift) stepDrift(dt);
  draw();
  frame = visible && (playing || auto || drift) && !still.matches ? requestAnimationFrame(tick) : 0;
}
function userPause() {
  auto = false;
  playing = false;
  clearTimeout(idle);
  if (!still.matches) idle = setTimeout(() => { held = false; playing = true; poke(); }, 4800);
}
function release() { held = false; playing = true; auto = false; clearTimeout(idle); poke(); }
function arm() { held = true; playing = false; sim = 0; auto = false; userPause(); poke(); }
function togglePlay() { if (held || !playing) release(); else arm(); }
function setFolds(folds) {
  drift = false;
  if (!FOLDS.includes(folds) || folds === spec.folds) { poke(); return; }
  spec.folds = folds;
  poke();
}
function setSpan(span) { drift = false; spec.span = Math.max(0, Math.min(14, span)); poke(); }
function setAmp(deg) { drift = false; spec.theta0 = Math.max(8, Math.min(20, deg)) * Math.PI / 180; poke(); }
function setRate(dir) { stepRate(dir); poke(); }
const vb = (event) => {
  const box = svg.getBoundingClientRect();
  return [((event.clientX - box.left) / box.width) * CONFIG.width, ((event.clientY - box.top) / box.height) * CONFIG.height];
};
const hitKnob = (point) => viewMode === "bench" && layers.rig ? CONFIG.knobs.find((knob) => Math.hypot(knob.x - point[0], knob.y - point[1]) < 34) : null;
const hitLever = (point) => viewMode === "bench" && layers.rig && Math.hypot(CONFIG.lever.screen[0] - point[0], CONFIG.lever.screen[1] - point[1]) < 28;
function nearestBob(point) {
  let best = -1, dist = (viewMode === "over" ? 18 : 26) ** 2;
  for (let index = 0; index < ${COUNT}; index++) {
    const pose = bobPose(index, sim, spec);
    const screen = viewMode === "over" ? planOf(pose.x, pose.y) : iso([pose.x, pose.y, pose.z], P);
    const d = (screen[0] - point[0]) ** 2 + (screen[1] - point[1]) ** 2;
    if (d < dist) { dist = d; best = index; }
  }
  return best;
}
let drag = null;
stage.addEventListener("pointerdown", (event) => {
  const point = vb(event);
  drag = { x: event.clientX, y: event.clientY, knob: hitKnob(point), lever: hitLever(point), moved: false, scrub: false };
  stage.setPointerCapture(event.pointerId);
});
stage.addEventListener("pointermove", (event) => {
  const point = vb(event);
  const nextHover = drag ? -1 : nearestBob(point);
  if (nextHover !== hover) { hover = nextHover; draw(); }
  if (!drag) return;
  if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 5) drag.moved = true;
  if (!drag.moved) return;
  auto = false;
  clearTimeout(idle);
  if (drag.knob) {
    const id = drag.knob.id;
    const delta = event.clientX - drag.x;
    drift = false;
    if (id === "folds") {
      const index = Math.max(0, Math.min(FOLDS.length - 1, FOLDS.indexOf(spec.folds) + Math.round(delta / 36)));
      if (FOLDS[index] !== spec.folds) { spec.folds = FOLDS[index]; drag.x = event.clientX; }
    } else if (id === "span") {
      const span = Math.max(0, Math.min(14, spec.span + Math.round(delta / 28)));
      if (span !== spec.span) { spec.span = span; drag.x = event.clientX; }
    } else {
      const deg = Math.max(8, Math.min(20, spec.theta0 * 180 / Math.PI + delta / 18));
      spec.theta0 = deg * Math.PI / 180;
      drag.x = event.clientX;
    }
    poke();
  } else if (!drag.lever) {
    drag.scrub = true;
    held = false;
    playing = false;
    const box = svg.getBoundingClientRect();
    const share = Math.max(0, Math.min(0.999, (event.clientX - box.left) / box.width));
    sim = share * ${CYCLE};
    draw();
  }
});
stage.addEventListener("pointerup", () => {
  if (!drag) return;
  if (!drag.moved) { if (drag.lever) togglePlay(); else if (!drag.knob) togglePlay(); }
  else if (drag.scrub) userPause();
  drag = null;
});
stage.addEventListener("pointerleave", () => { if (hover !== -1) { hover = -1; draw(); } });
document.addEventListener("keydown", (event) => {
  const foldAt = FOLDS.indexOf(spec.folds);
  if (event.key === "ArrowRight") setFolds(FOLDS[Math.min(FOLDS.length - 1, foldAt + 1)]);
  else if (event.key === "ArrowLeft") setFolds(FOLDS[Math.max(0, foldAt - 1)]);
  else if (event.key === "ArrowUp") setSpan(spec.span + 1);
  else if (event.key === "ArrowDown") setSpan(spec.span - 1);
  else if (event.key === "[") setAmp(spec.theta0 * 180 / Math.PI - 1);
  else if (event.key === "]") setAmp(spec.theta0 * 180 / Math.PI + 1);
  else if (event.key === "r" || event.key === "R") { spec.plane = spec.plane === "radial" ? "tangent" : "radial"; poke(); }
  else if (event.key === "-" || event.key === "_") setRate(-1);
  else if (event.key === "=" || event.key === "+") setRate(1);
  else if (event.key === "Home") { sim = 0; held = true; userPause(); poke(); }
  else if (event.key === "v" || event.key === "V") viewMode = viewMode === "bench" ? "over" : "bench";
  else if (event.key === "a" || event.key === "A") layers.rig = !layers.rig;
  else if (event.key === "m" || event.key === "M") layers.mag = !layers.mag;
  else if (event.key === "s" || event.key === "S") layers.string = !layers.string;
  else if (event.key === "c" || event.key === "C") {
    const ids = CONFIG.palettes.map((item) => item.id);
    palette = ids[(ids.indexOf(palette) + 1) % ids.length];
  }
  else if (event.key === "f" || event.key === "F") colorMode = colorMode === "move" ? "fixed" : "move";
  else if (event.key === "b" || event.key === "B") { layers.rig = false; layers.mag = false; layers.string = false; }
  else if (event.key === " " || event.key === "Enter") togglePlay();
  else return;
  event.preventDefault();
  poke();
});
document.querySelectorAll("[data-set-fold]").forEach((button) => button.addEventListener("click", () => setFolds(Number(button.dataset.setFold))));
document.querySelectorAll("[data-span]").forEach((button) => button.addEventListener("click", () => setSpan(spec.span + Number(button.dataset.span))));
document.querySelectorAll("[data-amp]").forEach((button) => button.addEventListener("click", () => setAmp(spec.theta0 * 180 / Math.PI + Number(button.dataset.amp))));
document.querySelectorAll("[data-rate]").forEach((button) => button.addEventListener("click", () => setRate(Number(button.dataset.rate))));
document.querySelector("[data-plane]").addEventListener("click", () => { spec.plane = spec.plane === "radial" ? "tangent" : "radial"; poke(); });
document.querySelector("[data-play]").addEventListener("click", togglePlay);
document.querySelectorAll("[data-layer]").forEach((button) => button.addEventListener("click", () => { layers[button.dataset.layer] = !layers[button.dataset.layer]; draw(); }));
document.querySelector("[data-beads]").addEventListener("click", () => { layers.rig = false; layers.mag = false; layers.string = false; draw(); });
document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => { viewMode = button.dataset.view; draw(); }));
document.querySelectorAll("[data-palette]").forEach((button) => button.addEventListener("click", () => { palette = button.dataset.palette; draw(); }));
document.querySelectorAll("[data-color-mode]").forEach((button) => button.addEventListener("click", () => { colorMode = button.dataset.colorMode; draw(); }));
document.querySelectorAll("[data-shape]").forEach((button) => button.addEventListener("click", () => { beadShape = button.dataset.shape; draw(); }));
document.querySelectorAll("[data-size]").forEach((button) => button.addEventListener("click", () => { beadSize = Math.max(1, Math.min(8, beadSize + Number(button.dataset.size))); layoutRods(); draw(); }));
document.querySelectorAll("[data-preset]").forEach((button) => button.addEventListener("click", () => applyPreset(CONFIG.presets.find((item) => item.id === button.dataset.preset))));
document.querySelector("[data-reset]").addEventListener("click", resetRing);
document.querySelector("[data-drift]").addEventListener("click", () => {
  drift = !drift;
  if (drift) { driftT = 0; driftStep = 0; driftKey = ""; }
  poke();
});
new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) run();
}, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) { held = false; auto = false; playing = false; sim = 8.4; }
layoutRods();
draw();
run();
window.__ring = {
  set(t, extra) {
    if (extra) {
      if (extra.view) viewMode = extra.view;
      if (extra.palette) palette = extra.palette;
      if (extra.beads) { layers.rig = false; layers.mag = false; layers.string = false; }
      const { view, palette: _palette, beads, ...rest } = extra;
      Object.assign(spec, rest);
    }
    sim = t;
    held = extra && extra.held === true;
    playing = false;
    auto = false;
    drift = false;
    poke();
    return readout.textContent;
  },
  radii() {
    return Array.from({ length: 16 }, (_, index) => {
      const pose = bobPose(index, sim, spec);
      return Math.round(Math.hypot(pose.x, pose.y) * 10) / 10;
    });
  },
};
`;

const SOURCE = "https://www.youtube.com/shorts/l1rYPY-dCAk";
const SOURCE_NAME = "Science to All's Galileo's Ring II";
const figure = k.plateHtml({
  fig: "Fig 1",
  title: "Galileo's ring",
  hint: "Drag to scrub · V overhead",
  readout: "held · 3×16 · 51–59 · 0:00",
  keys: [
    { mark: "lit", label: "Longest pendulum, 51 swings in 2 min 14 s" },
    { mark: "raised", label: "The other bobs, one extra swing each step, up to 59" },
    { mark: "dim", label: "Magnet poles that hold the release" },
  ],
  caption: `Forty-eight pendulums hang in a ring, three identical sets of sixteen, after the machine in ${SOURCE_NAME}. Lengths follow the small-angle law, so in 2 min 14 s the longest, ${longest.toFixed(2)} m, swings 51 times and the shortest, ${shortest.toFixed(2)} m, swings 59. The same ladder repeats three times, and the pattern is unchanged by a third of a turn. Fold, span and pull retune that ladder. Drift steps fold, span and pull every few seconds. Beads hides the rig, the magnets and the strings. Overhead looks straight down. Moving paints each bead by how far it has swung out. Fixed gives every bead the colour of its place in the set, and that colour stays put as it swings. The colour combinations, other than white and black and white, are from Sanzo Wada, A Dictionary of Color Combinations.`,
  body: `<div class="iso-stage" tabindex="0" role="application" aria-label="Galileo's ring. Drag to scrub time. V switches to overhead. B leaves only the bobs. C cycles their colour.">${svg}</div>`,
});
const captionAt = figure.lastIndexOf("<figcaption");
const body = (figure.slice(0, captionAt) + controls + figure.slice(captionAt))
  .replace(SOURCE_NAME, `<a href="${SOURCE}">${SOURCE_NAME}</a>`);

const file = theme === "light" ? "galileo-ring-light.html" : "galileo-ring.html";
writeFileSync(join(HERE, file), k.pageHtml({
  title: "Galileo's ring",
  theme,
  width: 780,
  body,
  script: kitScript() + "\n" + modelJs + "\n" + shapesJs + "\n" + live,
}));
console.log("wrote", file);
