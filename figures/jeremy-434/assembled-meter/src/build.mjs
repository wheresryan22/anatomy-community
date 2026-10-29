import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../.skill/kit/iso-kit.mjs";
import * as G from "../../../../.skill/kit/lathe.mjs";
import { kitScript } from "../../../../.skill/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 860;
const HEIGHT = 560;

// ---- Truth: the planned hardware as firmware/components/spectral wires it. ----------------
const SDA_PIN = "GPIO 8";
const SCL_PIN = "GPIO 9";
const GATE_PIN = "GPIO 4";
const I2C_KHZ = 400;
const PULLUP_OHM = 4700; // inside the 2-5 kOhm band the architecture asks for
const BULB_V = 12;
const CHANNELS = 18;

// ---- World: x right, y depth (back is +y), z up, ~1 unit per mm -------------
const TRAY = { x: -120, y: -56, w: 240, d: 116, r: 10 };
const FLOOR_H = 5;
const WALL_H = 26;
const FRONT_WALL_H = 8;
const WALL_T = 6;
const FOOT_H = 4;

const PLATE = { x: -58, y: -50, w: 116, d: 50, r: 5 };
const PLATE_Z = 58;
const PLATE_H = 4;
const TOP_Z = PLATE_Z + PLATE_H;
const LIFT_MAX = 40;
const POSTS = [
  [-52, -44],
  [52, -44],
  [-52, -6],
  [52, -6],
];
const POST_R = 3.2;

const BULB = { x: -18, y: -26 };
const SENSOR = { x: 24, y: -26 };
const DOME_R = 4.5, DOME_H = 3;
const LENS_R = 5, LENS_H = 3;
const FRUIT_R = 30;
const FRUIT = { x: 0, y: -26, z: TOP_Z + DOME_H + FRUIT_R };
const FRUIT_AWAY = [-70, 0, 30];

const PARK = { x: 92, y: -40, z: 14 };
const CRADLE_R = 7;
const STANDARD_R = 10, STANDARD_H = 3;
const WINDOW = { x: SENSOR.x, y: SENSOR.y, z: TOP_Z + LENS_H };

const ESP = { x: -100, y: 4, w: 58, d: 34, r: 2 };
const ESP_Z = 8, BOARD_H = 2;
const ESP_TOP = ESP_Z + BOARD_H;
const MT = { x: -34, y: 20, w: 26, d: 18, r: 1.5 };
const TRIAD = { x: 8, y: -40, w: 32, d: 30, r: 1.5 };
const TRIAD_Z = 10;
const MOSFET = { x: 0, y: 6, w: 10, d: 4, r: 0.6 };

const P = k.fitProjection(
  [
    ...k.boxCorners(TRAY, -FOOT_H, 0),
    ...k.boxCorners(TRAY, 0, WALL_H + FLOOR_H),
    ...k.boxCorners(PLATE, PLATE_Z, TOP_Z),
    [FRUIT.x, FRUIT.y, FRUIT.z + FRUIT_R + LIFT_MAX],
    [PARK.x + CRADLE_R, PARK.y, 0],
  ],
  WIDTH,
  HEIGHT,
  { pad: 30, azimuth: 40 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

// ---- Base: tray on feet, walls, corner screws ------------------------------
function tray() {
  const out = [];
  const feet = k.corners(TRAY, 10);
  for (const [x, y] of byDepth(feet)) {
    out.push(S(k.cylinder(x, y, 5.4, -FOOT_H, FOOT_H, P, 24, 1.2), { tone: "lo" }));
  }
  out.push(S(k.slabOf(TRAY, 0, FLOOR_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(TRAY, 5), FLOOR_H, P), { tone: "faint" }));
  const screws = k.corners(TRAY, 8);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, FLOOR_H, P, 14)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, FLOOR_H])), { size: 0.45 }));
  return out.join("");
}

function walls() {
  const out = [];
  const left = { x: TRAY.x, y: TRAY.y, w: WALL_T, d: TRAY.d, r: 0 };
  const right = { x: TRAY.x + TRAY.w - WALL_T, y: TRAY.y, w: WALL_T, d: TRAY.d, r: 0 };
  const back = { x: TRAY.x, y: TRAY.y + TRAY.d - WALL_T, w: TRAY.w, d: WALL_T, r: 0 };
  const front = { x: TRAY.x, y: TRAY.y, w: TRAY.w, d: WALL_T, r: 0 };
  out.push(S(k.slabOf(back, FLOOR_H, WALL_H, P, 4, 0.8), { tone: "mid" }));
  out.push(S(k.slabOf(left, FLOOR_H, WALL_H, P, 4, 0.8), { tone: "mid" }));
  out.push(S(k.slabOf(right, FLOOR_H, WALL_H, P, 4, 0.8), { tone: "mid" }));
  out.push(S(k.slabOf(front, FLOOR_H, FRONT_WALL_H, P, 4, 0.8), { tone: "mid" }));
  return out.join("");
}

// ---- Boards on standoffs ---------------------------------------------------
function standoffs(board, z0, z1, inset = 3) {
  return k
    .corners(board, inset)
    .map(([x, y]) => S(k.cylinder(x, y, 1.8, z0, z1 - z0, P, 12), { tone: "lo" }))
    .join("");
}

function espBoard() {
  const out = [];
  out.push(standoffs(ESP, FLOOR_H, ESP_Z));
  out.push(S(k.slabOf(ESP, ESP_Z, BOARD_H, P, 6, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: -52, y: 22, w: 10, d: 16, r: 0.8 }, ESP_TOP, 4, P, 4, 0.3), { tone: "lo" }));
  out.push(S(k.slabOf({ x: -108, y: 12, w: 9, d: 8, r: 1.5 }, ESP_Z, 3.5, P, 6, 0.6), { tone: "lo" }));
  out.push(S(k.cylinder(-86, 18, 1.6, ESP_TOP, 1.5, P, 12), { tone: "mid" }));
  out.push(S(k.cylinder(-78, 18, 1.6, ESP_TOP, 1.5, P, 12), { tone: "mid" }));
  const headerTop = Array.from({ length: 13 }, (_, index) => [-94 + index * 2, ESP.y + 2.5, ESP_TOP + 0.2]);
  const headerBottom = Array.from({ length: 13 }, (_, index) => [-94 + index * 2, ESP.y + ESP.d - 2.5, ESP_TOP + 0.2]);
  out.push(D([...headerTop, ...headerBottom].map(at), { size: 0.5, tone: "faint" }));
  return out.join("");
}

function mt3608() {
  const out = [];
  out.push(standoffs(MT, FLOOR_H, ESP_Z));
  out.push(S(k.slabOf(MT, ESP_Z, BOARD_H, P, 4, 0.3), { tone: "mid" }));
  out.push(S(k.cylinder(-16, 30, 4, ESP_TOP, 4, P, 20, 0.6), { tone: "lo" }));
  out.push(S(k.cylinder(-37, 24, 1.5, ESP_TOP, 4, P, 10), { tone: "lo" }));
  out.push(S(k.cylinder(-37, 31, 1.5, ESP_TOP, 4, P, 10), { tone: "lo" }));
  out.push(S(k.cylinder(-30, 36, 2.4, ESP_TOP, 3, P, 16, 0.4), { tone: "mid" }));
  out.push(L(k.ring(-30, 36, 1.2, ESP_TOP + 3, P, 10), { tone: "hi" }));
  return out.join("");
}

function triadBoard() {
  const out = [];
  out.push(standoffs(TRIAD, FLOOR_H, TRIAD_Z));
  out.push(S(k.slabOf(TRIAD, TRIAD_Z, 2, P, 4, 0.4), { tone: "mid" }));
  for (const x of [12, 20]) {
    out.push(S(k.slabOf({ x, y: -34, w: 6, d: 6, r: 0.6 }, TRIAD_Z + 2, 3, P, 4, 0.4), { tone: "lo" }));
  }
  out.push(S(k.slabOf({ x: 30, y: -34, w: 6, d: 6, r: 0.6 }, TRIAD_Z + 2, 3, P, 4, 0.4), { tone: "lo" }));
  out.push(S(k.slabOf({ x: 36, y: -44, w: 6, d: 4, r: 0.6 }, TRIAD_Z + 2, 3, P, 4, 0.3), { tone: "lo" }));
  out.push(D([[14, -28, TRIAD_Z + 5], [22, -28, TRIAD_Z + 5], [32, -28, TRIAD_Z + 5]].map(at), { size: 0.4, tone: "faint" }));
  return out.join("");
}

function mosfetAndPullups() {
  const out = [];
  out.push(S(k.slabOf(MOSFET, ESP_Z, 6, P, 4, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf({ x: MOSFET.x, y: MOSFET.y + MOSFET.d, w: MOSFET.w, d: 1.2, r: 0 }, ESP_Z, 6, P, 2, 0.2), { tone: "lo" }));
  out.push(L(k.ring(MOSFET.x + 5, MOSFET.y + 2, 1.2, ESP_Z + 6, P, 10), { tone: "faint" }));
  for (const [x, y] of [
    [-30, -18],
    [-30, -14],
  ]) {
    out.push(S(k.slabOf({ x, y, w: 8, d: 2.6, r: 1.1 }, ESP_Z, 2.6, P, 4, 0.3), { tone: "hi" }));
  }
  return out.join("");
}

// ---- Probe face: the plate on four posts, two windows, bulb dome and sensor lens
function posts(lift) {
  const top = PLATE_Z + lift;
  const pts = POSTS.map(([x, y]) => [x, y, 0]);
  return byDepth(pts)
    .map(([x, y]) => S(k.cylinder(x, y, POST_R, FLOOR_H, top - FLOOR_H, P, 16, 0), { tone: "mid" }))
    .join("");
}

function probeFace() {
  const out = [];
  out.push(S(k.slabOf(PLATE, PLATE_Z, PLATE_H, P, 8, 1.2), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 4), TOP_Z, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 6);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 1.8, TOP_Z, P, 12)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, TOP_Z])), { size: 0.45 }));
  out.push(L(k.ring(SENSOR.x, SENSOR.y, LENS_R + 1.6, TOP_Z, P, 20), { tone: "faint" }));
  out.push(L(k.ring(BULB.x, BULB.y, DOME_R + 1.6, TOP_Z, P, 20), { tone: "faint" }));
  out.push(S(k.cylinder(SENSOR.x, SENSOR.y, LENS_R, TOP_Z, LENS_H, P, 24, 0.5), { tone: "lo" }));
  out.push(L(k.ring(SENSOR.x, SENSOR.y, 2.4, TOP_Z + LENS_H, P, 14), { tone: "faint" }));
  return out.join("");
}

function bulb(on) {
  return S(k.cylinder(BULB.x, BULB.y, DOME_R, TOP_Z, DOME_H, P, 24, 1.2), { tone: on ? "hi" : "mid", lit: on, crease: "none" });
}

function cradle() {
  return [
    S(k.cylinder(PARK.x, PARK.y, CRADLE_R, FLOOR_H, PARK.z - FLOOR_H, P, 24, 0.6), { tone: "lo" }),
    L(k.ring(PARK.x, PARK.y, CRADLE_R - 1.4, PARK.z, P, 20), { tone: "faint" }),
  ].join("");
}

function standardPuck() {
  return [
    S(k.cylinder(0, 0, STANDARD_R, 0, STANDARD_H, P, 32, 0.5), { tone: "mid" }),
    L(k.ring(0, 0, STANDARD_R - 2.2, STANDARD_H, P, 24), { tone: "faint" }),
  ].join("");
}

// ---- Light path through the fruit: bulb window to sensor window ------------
function lightPath() {
  const points = [
    [BULB.x, BULB.y, TOP_Z + DOME_H],
    [3, -26, FRUIT.z + 14],
    [SENSOR.x, SENSOR.y, TOP_Z + LENS_H],
  ];
  return [
    L(k.pathOf(points.map(at)), { tone: "hi", flow: true }),
    D([at(points[0]), at(points[2])], { size: 0.6, tone: "hi" }),
  ].join("");
}

// ---- Wires: I2C, supply, gate and bulb drive --------------------------------
function wires() {
  return [
    k.wireSvg(at([-94, 10, ESP_TOP]), at([36, -44, TRIAD_Z + 2]), { tone: "mid", via: [at([-60, -4, ESP_TOP])] }),
    k.wireSvg(at([-92, 10, ESP_TOP]), at([36, -40, TRIAD_Z + 2]), { tone: "lo", via: [at([-60, -8, ESP_TOP])] }),
    k.wireSvg(at([-82, 10, ESP_TOP]), at([30, -36, TRIAD_Z + 2]), { tone: "mid", via: [at([-40, -14, ESP_TOP])] }),
    k.wireSvg(at([-74, 10, ESP_TOP]), at([0, 6, ESP_Z + 6]), { tone: "lo", dotted: true, via: [at([-40, 2, ESP_TOP])] }),
    k.wireSvg(at([-18, 6, ESP_TOP]), at([8, 8, ESP_Z + 3]), { tone: "mid", via: [at([-10, 10, ESP_TOP])] }),
  ].join("");
}

const svgBody = {
  tray: tray(),
  walls: walls(),
  esp: espBoard(),
  mt: mt3608(),
  triad: triadBoard(),
  mosfet: mosfetAndPullups(),
  wires: wires(),
  cradle: cradle(),
};

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "The assembled meter as it should sit on the bench: an open tray holds the ESP32-S3 board, the boost converter that makes 12 V for the halogen, the AS7265x triad board, the MOSFET and two pull-ups. A probe face on four posts carries the halogen's glass dome and the sensor lens. The fruit rests on the probe; the PTFE standard parks in its cradle and slides over the sensor for the white reference. Click to lift the probe face and see the triad board and bulb under it.",
  body: [
    svgBody.tray,
    svgBody.walls,
    svgBody.esp,
    svgBody.mt,
    svgBody.triad,
    svgBody.mosfet,
    svgBody.wires,
    svgBody.cradle,
    `<g data-part="posts">${posts(0)}</g>`,
    `<g data-part="plate" transform="${k.translateAlong(P, [0, 0, 0])}">${probeFace()}<g data-part="bulb">${bulb(true)}</g><g data-part="path"></g></g>`,
    `<g data-part="fruit" transform="${k.translateAlong(P, [0, 0, 0])}">${S(G.sphereOf([FRUIT.x, FRUIT.y, FRUIT.z], FRUIT_R, P), { tone: "hi" })}</g>`,
    `<g data-part="standard" transform="${k.translateAlong(P, [PARK.x, PARK.y, PARK.z])}">${standardPuck()}</g>`,
  ],
});

// ---------------------------------------------------------------------------
// Live behaviour
// ---------------------------------------------------------------------------
const live = `
const P = ${JSON.stringify(P)};
const PARK = ${JSON.stringify(PARK)};
const WINDOW = ${JSON.stringify(WINDOW)};
const FRUIT_AWAY = ${JSON.stringify(FRUIT_AWAY)};
const FRUIT = ${JSON.stringify(FRUIT)};
const BULB = ${JSON.stringify(BULB)};
const PLATE_Z = ${PLATE_Z}, TOP_Z = ${TOP_Z}, LIFT_MAX = ${LIFT_MAX};
const POSTS = ${JSON.stringify(POSTS)};
const POST_R = ${POST_R}, FLOOR_H = ${FLOOR_H};
const DOME_R = ${DOME_R}, DOME_H = ${DOME_H};
const PHASES = [
  { name: "sample", seconds: 4.0, bulb: true, fruit: 0, standard: 0, text: "sample · bulb on · light crosses the fruit to the sensor" },
  { name: "fruit away", seconds: 1.6, bulb: true, fruit: 1, standard: 0, text: "fruit away · bulb on · no sample in the path" },
  { name: "white", seconds: 3.0, bulb: true, fruit: 1, standard: 1, text: "white reference · PTFE over the sensor · bulb on" },
  { name: "dark", seconds: 2.4, bulb: false, fruit: 1, standard: 0, text: "dark reference · bulb off · sensor reads dark counts" },
  { name: "fruit back", seconds: 1.8, bulb: true, fruit: 0, standard: 0, text: "bulb on · fruit back on the probe" },
];

const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const postsEl = svg.querySelector('[data-part="posts"]');
const plateEl = svg.querySelector('[data-part="plate"]');
const bulbEl = svg.querySelector('[data-part="bulb"]');
const pathEl = svg.querySelector('[data-part="path"]');
const fruitEl = svg.querySelector('[data-part="fruit"]');
const standardEl = svg.querySelector('[data-part="standard"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");

const bulbPath = (on) => solidSvg(cylinder(BULB.x, BULB.y, DOME_R, TOP_Z, DOME_H, P, 24, 1.2), { tone: on ? "hi" : "mid", lit: on, crease: "none" });
const pathPath = () => {
  const points = [[BULB.x, BULB.y, TOP_Z + DOME_H], [3, -26, FRUIT.z + 14], [WINDOW.x, WINDOW.y, WINDOW.z]];
  return lineSvg(pathOf(points.map((point) => iso(point, P))), { tone: "hi", flow: true }) + dotsSvg([iso(points[0], P), iso(points[2], P)], { size: 0.6, tone: "hi" });
};
const postsPath = (lift) => POSTS.map(([x, y]) => solidSvg(cylinder(x, y, POST_R, FLOOR_H, PLATE_Z + lift - FLOOR_H, P, 16, 0), { tone: "mid" })).join("");

let phase = 0, phaseT = 0, bulbOn = true, lastBulb = null, lastLiftDrawn = null;
let fruitFraction = 0, standardFraction = 0, lift = 0, liftTarget = 0;
let visible = false, frame = 0, last = 0;

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (v) => v * v * (3 - 2 * v);
const follow = (value, target, dt, rate) => value + (target - value) * (1 - Math.exp(-dt * rate));

function describe() {
  const lifted = lift > LIFT_MAX * 0.5 ? " · probe lifted" : "";
  return PHASES[phase].text + lifted;
}

function draw() {
  const liftNow = lift;
  const fruitOffset = [FRUIT_AWAY[0] * fruitFraction, FRUIT_AWAY[1] * fruitFraction, liftNow + FRUIT_AWAY[2] * fruitFraction];
  const parkedOffset = [PARK.x, PARK.y, PARK.z];
  const windowOffset = [WINDOW.x, WINDOW.y, WINDOW.z + liftNow];
  const standardAt = parkedOffset.map((value, index) => value + (windowOffset[index] - value) * standardFraction);
  plateEl.setAttribute("transform", translateAlong(P, [0, 0, liftNow]));
  fruitEl.setAttribute("transform", translateAlong(P, fruitOffset));
  standardEl.setAttribute("transform", translateAlong(P, standardAt));
  if (lastLiftDrawn !== liftNow) {
    postsEl.innerHTML = postsPath(liftNow);
    lastLiftDrawn = liftNow;
  }
  if (lastBulb !== bulbOn) {
    bulbEl.innerHTML = bulbPath(bulbOn);
    pathEl.innerHTML = bulbOn ? pathPath() : "";
    lastBulb = bulbOn;
  }
  const text = describe();
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", text);
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (!calm) {
    phaseT += dt;
    if (phaseT >= PHASES[phase].seconds) {
      phaseT = 0;
      phase = (phase + 1) % PHASES.length;
    }
  }
  const current = PHASES[phase];
  bulbOn = current.bulb;
  fruitFraction = calm ? current.fruit : follow(fruitFraction, current.fruit, dt, 4);
  standardFraction = calm ? current.standard : follow(standardFraction, current.standard, dt, 3.5);
  lift = calm ? liftTarget : follow(lift, liftTarget, dt, 3);
  if (Math.abs(lift - liftTarget) < 0.01) lift = liftTarget;
  if (Math.abs(fruitFraction - current.fruit) < 0.002) fruitFraction = current.fruit;
  if (Math.abs(standardFraction - current.standard) < 0.002) standardFraction = current.standard;
  draw();
  frame = visible && !calm ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible && !still.matches) { last = 0; frame = requestAnimationFrame(tick); } };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); else frame = 0; }, { rootMargin: "120px 0px" }).observe(stage);

function toggleLift() {
  liftTarget = liftTarget ? 0 : LIFT_MAX;
  run();
}
stage.addEventListener("click", toggleLift);
stage.addEventListener("keydown", (event) => {
  if (event.key === " " || event.key === "Enter") { event.preventDefault(); toggleLift(); }
});
if (still.matches) { phase = 0; fruitFraction = 0; standardFraction = 0; }
draw();
run();
`;

const body = k.plateHtml({
  fig: "Fig 6",
  title: "The assembled meter",
  hint: "Click to lift the probe face",
  readout: "sample · bulb on",
  keys: [
    { mark: "lit", label: "Halogen glass dome: the only lit part, on while the bulb is driven" },
    { mark: "dotted", label: "Light path: bulb window, through the fruit, to the sensor lens" },
    { mark: "dashed", label: "Traces: 3V3 and GND to the triad, I2C SDA and SCL, gate and 12 V drive" },
  ],
  caption:
    `As planned, not yet built: an ESP32-S3 DevKitC-1 with 4 MB flash drives the AS7265x triad over I2C at ${I2C_KHZ} kHz (SDA ${SDA_PIN}, SCL ${SCL_PIN}) with ${PULLUP_OHM / 1000} kΩ pull-ups. A MOSFET on ${GATE_PIN} switches a 12 V G4 halogen that an MT3608 boost makes from the 5 V rail. The PTFE standard is the white reference and the tray is open to show the boards. The probe face holds the bulb and the sensor 24 units apart, so the light crosses the fruit before it reaches the sensor. The firmware's 5 ms LED settle is written for an LED and must be revisited for a filament.`,
  body: `<div class="iso-stage" tabindex="0" role="img" aria-label="Assembled meter, animating. Click to lift the probe face">${svg}</div>`,
});

writeFileSync(
  join(HERE, theme === "light" ? "assembly-light.html" : "assembly.html"),
  k.pageHtml({ title: "The assembled meter", theme, body, script: kitScript() + live, width: WIDTH }),
);
console.log("wrote", theme === "light" ? "assembly-light.html" : "assembly.html");
