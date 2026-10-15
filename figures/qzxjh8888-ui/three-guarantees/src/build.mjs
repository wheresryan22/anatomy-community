import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../.skill/kit/iso-kit.mjs";
import { kitScript } from "../../../../.skill/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 700;
const HEIGHT = 450;

const PLATE = { x: -180, y: -100, w: 360, d: 200, r: 10 };
const PLATE_H = 15;
const FOOT_H = 6;

const RAIL_Y = [-50, 0, 50]; // Three rails: 1=model (0-5), 2=data (0-4), 3=channel (0-2)
const RAIL_FROM = 10;
const RAIL_TO = 160;
const RAIL_W = 8;
const RAIL_H = 5;

const CARRIAGE = { x: -60, y: RAIL_Y[0] - 10, w: 120, d: 100, r: 5 };
const CARRIAGE_Z = 4;
const CARRIAGE_TOP = 12;
const BLOCK_W = 15;
const STEP = 20;
const DIALS = [[120, -50], [120, -20], [120, 10]]; // Three dials for each rail
const DIAL_R = 22;
const DIAL_Z = 100;
const DIAL_H = 10;
const DIAL_TOP = DIAL_Z + DIAL_H;
const TICK_SPACING = 5; // Small tick every 5 units, major every 25
const PER_TURN = 3; // Needle per unit of fault count

// Block heights for each rail (representing levels: model=5, data=4, channel=2)
const BLOCKS = [
  [20, 15, 10, 5, 2], // Model chain: 5 levels (0-5)
  [16, 12, 8, 4],      // Data sources: 4 levels (0-4)
  [10, 2],              // Channels: 2 levels (0-2)
];
const RAIL_NAMES = ["MODEL CHAIN 模型链", "DATA SOURCES 数据源", "CHANNELS 通道"];
const LIGHT_COLORS = ["#07c160", "#ff8a00", "#1890ff"]; // Green, orange, blue

// Stops for carriage positions: along x, each position corresponds to a step in each rail
const STOPS = [];
for (let r = 0; r < BLOCKS.length; r++) {
  for (let b = 0; b < BLOCKS[r].length; b++) {
    STOPS.push(RAIL_FROM + STEP * b);
  }
}
STOPS.push(RAIL_TO - 6); // End position

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [DIALS[0][0], DIALS[0][1], DIAL_TOP], [RAIL_TO, RAIL_Y[RAIL_Y.length-1], CARRIAGE_TOP + 5]],
  WIDTH,
  HEIGHT,
  { pad: 24, azimuth: 45 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 25))) {
    out.push(S(k.cylinder(x, y, 8, -PLATE_H - FOOT_H, 2, P, 32), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 6, -PLATE_H - FOOT_H + 2, FOOT_H - 2, P, 32), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 10, 2), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 6), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 12);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.5, 0, P, 20)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.6 }));
  
  // Label plate with title
  const labelPlate = { x: -150, y: PLATE.y + PLATE.d - 25, w: 300, d: 20, r: 2 };
  out.push(S(k.slabOf(labelPlate, PLATE_H, PLATE_H + 2, P, 5, 1), { tone: "lo", crease: "none" }));
  out.push(k.faceTextSvg(k.topMatrix([labelPlate.x + 10, labelPlate.y + 8], PLATE_H + 1, P, "x"), "三确保 / THREE GUARANTEES", { size: 3, tone: "mid", anchor: "start" }));
  
  return out.join("");
}

function rails() {
  const out = [];
  // 3 parallel rails for each ensure
  for (let i = 0; i < RAIL_Y.length; i++) {
    const y = RAIL_Y[i];
    // Rail main body
    out.push(S(k.slabOf({ x: RAIL_FROM, y, w: RAIL_TO - RAIL_FROM, d: RAIL_W, r: 2 }, 0, RAIL_H, P, 4, 0.6), { tone: "mid" }));
    // End stops (left/right)
    out.push(S(k.slabOf({ x: RAIL_FROM - 4, y, w: 8, d: RAIL_W, r: 1.5 }, 0, RAIL_H + 2, P, 4, 0.6), { tone: "mid" }));
    out.push(S(k.slabOf({ x: RAIL_TO, y, w: 8, d: RAIL_W, r: 1.5 }, 0, RAIL_H + 2, P, 4, 0.6), { tone: "mid" }));
    // Add scale ticks to rail: small every 5, major every 25
    for (let x = RAIL_FROM; x <= RAIL_TO; x += TICK_SPACING) {
      const isMajor = x % 25 === 0;
      const tickHeight = isMajor ? 8 : 4;
      const tickWidth = isMajor ? 1.2 : 0.8;
      // Ticks as thin solids lying on the rail top (inward), so each tick rests on the rail
      out.push(S(k.slabOf({ x: x - tickWidth/2, y: y - RAIL_W/2, w: tickWidth, d: tickHeight, r: 0.2 }, RAIL_H, RAIL_H + 0.6, P, 3, 0.2), { tone: isMajor ? "mid" : "lo", crease: "none" }));
      out.push(S(k.slabOf({ x: x - tickWidth/2, y: y + RAIL_W/2 - tickHeight, w: tickWidth, d: tickHeight, r: 0.2 }, RAIL_H, RAIL_H + 0.6, P, 3, 0.2), { tone: isMajor ? "mid" : "lo", crease: "none" }));
    }
    // Left end bushings (2 small rings on each side)
    const bushingX = RAIL_FROM - 6;
    for (let by = y - RAIL_W/2 - 2; by <= y + RAIL_W/2 + 2; by += 6) {
      out.push(S(k.cylinder(bushingX, by, 2.5, RAIL_H, RAIL_H + 3, P, 16), { tone: "lo" }));
    }
    // Right end bushings (2 small rings)
    const rightBushingX = RAIL_TO + 6;
    for (let by = y - RAIL_W/2 - 2; by <= y + RAIL_W/2 + 2; by += 6) {
      out.push(S(k.cylinder(rightBushingX, by, 2.5, RAIL_H, RAIL_H + 3, P, 16), { tone: "lo" }));
    }
  }
  // Engraved rail labels (enhanced for readability in dark theme: larger font, brighter tone)
  RAIL_Y.forEach((y, i) => {
    // Label plate for each rail (background)
    const labelPlate = { x: -170, y: y - RAIL_W/2 - 10, w: 160, d: 16, r: 2 };
    out.push(S(k.slabOf(labelPlate, PLATE_H, PLATE_H + 2, P, 5, 1), { tone: "lo", crease: "none" }));
    // Larger font size (4 instead of original 3) and brighter tone ("hi" instead of "mid") for dark theme
    out.push(k.faceTextSvg(k.topMatrix([-165, y - RAIL_W/2 - 5], PLATE_H + 1, P, "x"), RAIL_NAMES[i], { size: 4, tone: "hi", anchor: "start" }));
  });
  return out.join("");
}

function carriage() {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(CARRIAGE, 5), CARRIAGE_Z, 0.1, P)}" style="filter:blur(4px)"/>`];
  out.push(S(k.slabOf(CARRIAGE, CARRIAGE_Z, CARRIAGE_TOP - CARRIAGE_Z, P, 6, 0.8), { tone: "mid" }));
  // Wheels/bushings on bottom
  for (const x of [-40, 0, 40]) {
    for (const y of [-35, 35]) {
      out.push(S(k.cylinder(CARRIAGE.x + x, CARRIAGE.y + y, 3.5, CARRIAGE_Z - 2, 4, P, 24), { tone: "lo" }));
    }
  }
  // Steps (blocks) for each rail's levels
  for (let r = 0; r < RAIL_Y.length; r++) {
    const railY = RAIL_Y[r];
    const blocks = BLOCKS[r];
    blocks.forEach((height, index) => {
      const stepX = RAIL_FROM + STEP * index;
      const plan = { x: stepX - BLOCK_W/2, y: railY - RAIL_W/2, w: BLOCK_W, d: RAIL_W, r: 1.5 };
      out.push(S(k.slabOf(plan, CARRIAGE_TOP, height, P, 4, 0.6), { tone: r === 2 ? "lit" : "hi", crease: "lo" }));
      out.push(L(k.planOutline(k.insetPlan(plan, 1.5), CARRIAGE_TOP + height, P, 3), { tone: "faint" }));
    });
  }
  // Handle on carriage
  const handle = [CARRIAGE.x + CARRIAGE.w - 10, CARRIAGE.y + CARRIAGE.d - 5];
  out.push(S(k.slabOf({ x: handle[0] - 2, y: handle[1] - 2, w: 4, d: 4, r: 1.5 }, CARRIAGE_Z + 2, 4, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(handle[0], handle[1], 3, CARRIAGE_Z, 6, P, 20), { tone: "mid" }));
  out.push(L(k.knurl(handle[0], handle[1], 3, CARRIAGE_Z, CARRIAGE_Z + 6, 20, P), { tone: "lo" }));
  
  // Trigger lever on carriage (right side)
  const leverBase = [CARRIAGE.x + CARRIAGE.w - 10, CARRIAGE.y];
  out.push(S(k.slabOf({ x: leverBase[0] - 2, y: leverBase[1] - 5, w: 4, d: 10, r: 1 }, CARRIAGE_TOP, CARRIAGE_TOP + 6, P, 2), { tone: "mid" }));
  const leverTip = [leverBase[0] + 10, leverBase[1] + 8];
  out.push(L(k.lineOnTop(leverBase, leverTip, CARRIAGE_TOP + 8, P), { tone: "lit", strokeWidth: 1.5 }));
  
  return out.join("");
}

function dials() {
  const out = [];
  // Three separate dials for each rail
  for (let i = 0; i < DIALS.length; i++) {
    const [x, y] = DIALS[i];
    const levels = BLOCKS[i];
    // Dial base
    out.push(S(k.cylinder(x, y, 3.5, DIAL_Z - 6, DIAL_H, P, 24), { tone: "mid" }));
    // Dial face
    out.push(S(k.cylinder(x, y, DIAL_R, DIAL_Z, DIAL_H, P, 80, 0.9), { tone: "hi", crease: "lo" }));
    // Major ticks aligned to each level
    const tickAngles = levels.map((_, idx) => -Math.PI/2 + (Math.PI / (levels.length + 1)) * (idx + 1));
    // Major ticks (larger, brighter)
    tickAngles.forEach((angle) => {
      const x1 = x + Math.cos(angle) * (DIAL_R - 5);
      const y1 = y + Math.sin(angle) * (DIAL_R - 5);
      const x2 = x + Math.cos(angle) * (DIAL_R - 10);
      const y2 = y + Math.sin(angle) * (DIAL_R - 10);
      out.push(L(k.lineOnTop([x1, y1], [x2, y2], DIAL_TOP, P), { tone: "mid", strokeWidth: 1.2 }));
    });
    // Minor ticks between major ones
    for (let j = 0; j < levels.length; j++) {
      const angle = -Math.PI/2 + (Math.PI / (levels.length + 1)) * (j + 0.5);
      const x1 = x + Math.cos(angle) * (DIAL_R - 5);
      const y1 = y + Math.sin(angle) * (DIAL_R - 5);
      const x2 = x + Math.cos(angle) * (DIAL_R - 8);
      const y2 = y + Math.sin(angle) * (DIAL_R - 8);
      out.push(L(k.lineOnTop([x1, y1], [x2, y2], DIAL_TOP, P), { tone: "lo", strokeWidth: 0.8 }));
    }
    // Center pin
    out.push(S(k.cylinder(x, y, 2, DIAL_Z, DIAL_H + 2, P, 20), { tone: "mid", lit: true }));
    // Dial label (rail name, larger brighter font for dark theme)
    const dialLabels = ["MODEL", "DATA", "CHANNEL"];
    out.push(k.faceTextSvg(k.topMatrix([x, y + DIAL_R + 8], DIAL_TOP, P, "x"), dialLabels[i], { size: 2.8, tone: "hi", anchor: "middle" }));
    // Dial readout (current level, brighter)
    out.push(k.faceTextSvg(k.topMatrix([x, y - DIAL_R - 10], DIAL_TOP, P, "x"), "0/" + levels.length, { size: 2.5, tone: "hi", anchor: "middle" }));
  }
  // Alarm lights: one per rail, with wires and connectors
  const lightSpacing = 50; // Distance between lights
  RAIL_Y.forEach((_, railIdx) => {
    const lightX = DIALS[railIdx][0] + (railIdx - 1) * lightSpacing;
    const lightY = DIALS[railIdx][1] - DIAL_R - 15;
    // LED light
    out.push(S(k.cylinder(lightX, lightY, 3, DIAL_Z, DIAL_H - 2, P, 16), { tone: "lit", color: LIGHT_COLORS[railIdx] }));
    // Light base (connector sleeve)
    out.push(S(k.cylinder(lightX, lightY - 3, 2.5, DIAL_Z, DIAL_H - 1, P, 12), { tone: "lo" }));
    // Wire from carriage trigger to light
    const leverPos = [DIALS[railIdx][0] + 8, DIALS[railIdx][1] + 8];
    out.push(L([
      k.lineOnTop(leverPos, [lightX, lightY - 5], DIAL_Z, P),
      k.lineOnTop([lightX, lightY -5], [lightX, lightY], DIAL_Z, P) // Wire terminal at light
    ].join(" "), { tone: "faint", strokeWidth: 1 }));
    // Crimp on wire (small ring)
    out.push(S(k.cylinder((leverPos[0] + lightX)/2, (leverPos[1] + lightY -5)/2, 0.8, DIAL_Z, 0.5, P, 8), { tone: "mid" }));
  });
  return out.join("");
}

const needleAt = (railIdx, level) => {
  const levels = BLOCKS[railIdx];
  const maxLevel = levels.length - 1;
  const angle = -Math.PI/2 + (Math.PI / (maxLevel + 1)) * (level + 1); // Map level 0→-π/2, max→π/2
  const [x, y] = DIALS[railIdx];
  const r = DIAL_R - 5;
  return k.lineOnTop([x, y], [x + Math.cos(angle) * r, y + Math.sin(angle) * r], DIAL_TOP + 0.5, P);
};

// Calculate current fault count: maximum level deviation (simplified)
// Get level for each rail (0 to max level index, not height)
const getRailLevels = (carriageX) => {
  const levels = [];
  for (let r = 0; r < RAIL_Y.length; r++) {
    const blocks = BLOCKS[r];
    let blockIndex = Math.floor((carriageX - RAIL_FROM) / STEP);
    blockIndex = Math.max(0, Math.min(blocks.length - 1, blockIndex));
    levels.push(blockIndex); // Return index of level, not height value
  }
  return levels;
};

const startX = RAIL_FROM + STEP * 1; // Start at model rail, first step
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "Three Guarantees: model chain, data source, and channel monitoring, with a carriage that sweeps every 2 hours to check levels.",
  body: [
    plate(),
    rails(),
    `<g data-part="carriage" transform="${k.translateAlong(P, [startX, RAIL_Y[0], 0])}">${carriage()}</g>`,
    dials(),
    `<path data-part="needle1" class="iso-line" data-tone="lit" data-free="start" d="${needleAt(0, 0)}" style="stroke-width:1.4"/>`,
    `<path data-part="needle2" class="iso-line" data-tone="lit" data-free="start" d="${needleAt(1, 0)}" style="stroke-width:1.4"/>`,
    `<path data-part="needle3" class="iso-line" data-tone="lit" data-free="start" d="${needleAt(2, 0)}" style="stroke-width:1.4"/>`,
  ],
});

const live = `
const P = ${JSON.stringify(P)};
const BLOCKS = ${JSON.stringify(BLOCKS)};
const RAIL_Y = ${JSON.stringify(RAIL_Y)};
const RAIL_FROM = ${RAIL_FROM}, RAIL_TO = ${RAIL_TO};
const DIALS = ${JSON.stringify(DIALS)};
const DIAL_R = ${DIAL_R}, DIAL_TOP = ${DIAL_TOP}, PER_TURN = ${PER_TURN}, STEP = ${STEP}, BASE = ${CARRIAGE_TOP};
const REACH = [RAIL_FROM, RAIL_TO];
const LIGHT_COLORS = ${JSON.stringify(LIGHT_COLORS)};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const carriage = svg.querySelector('[data-part="carriage"]');
const needles = [
  svg.querySelector('[data-part="needle1"]'),
  svg.querySelector('[data-part="needle2"]'),
  svg.querySelector('[data-part="needle3"]')
];
const lights = [
  svg.querySelectorAll('[data-tone="lit"]')[0],
  svg.querySelectorAll('[data-tone="lit"]')[1],
  svg.querySelectorAll('[data-tone="lit"]')[2]
];
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const stops = ${JSON.stringify(STOPS)};
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
// Get level for each rail (0 to max level index)
const getRailLevels = (cx) => {
  const levels = [];
  for (let r = 0; r < BLOCKS.length; r++) {
    const blocks = BLOCKS[r];
    let index = Math.floor((cx - RAIL_FROM) / STEP);
    index = Math.max(0, Math.min(blocks.length - 1, index));
    levels.push(index);
  }
  return levels;
};
let x = ${startX}, target = x, railLevels = [0,0,0], lightPulses = [0,0,0];
let frame = 0, last = 0, clock = 0, touring = true, visible = false, idleTimer = 0;
// Smooth pulse easing function for lights: slow sine wave for abnormal levels
const pulseEase = (time, offset) => Math.sin((time + offset) * Math.PI * 1.2) * 0.5 + 0.5; // Cycle ~1.66s
function draw() {
  carriage.setAttribute("transform", translateAlong(P, [x, 0, 0]));
  const newLevels = getRailLevels(x);
  // Update each rail's level and needle
  for (let i = 0; i < newLevels.length; i++) {
    // Smoothly transition level (for animation)
    railLevels[i] = still.matches ? newLevels[i] : railLevels[i] + (newLevels[i] - railLevels[i]) * (1 - Math.exp(-(1/0.25)));
    // Trigger pulse if this rail is at max level (abnormal state)
    if (newLevels[i] === BLOCKS[i].length - 1) {
      lightPulses[i] = Math.min(1, lightPulses[i] + (1 - lightPulses[i]) * (1 - Math.exp(-0.2)));
    } else {
      lightPulses[i] = Math.max(0, lightPulses[i] - lightPulses[i] * (1 - Math.exp(-0.1)));
    }
    // Update needle position for this rail
    const maxLevel = BLOCKS[i].length -1;
    const angle = -Math.PI/2 + (Math.PI / (maxLevel +1)) * (newLevels[i] +1);
    const [dialX, dialY] = DIALS[i];
    const r = DIAL_R -5;
    needles[i].setAttribute("d", "M" + dialX + " " + dialY + " L" + (dialX + Math.cos(angle)*r) + " " + (dialY + Math.sin(angle)*r))
    // Apply light pulse: opacity from 0.5 to 1.0 with sine wave
    if (lights[i]) {
      const pulse = pulseEase(Date.now() * 0.001, i * 0.5) * lightPulses[i];
      lights[i].setAttribute("opacity", 0.5 + 0.5 * pulse);
    }
  }
  // Update readout to show all three levels
  const text = \`2h sweep · Levels: \${railLevels.map(l => Math.round(l)).join(', ')}\`;
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(Math.max(...railLevels))));
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) { clock += dt; target = tourAt(clock); }
  x = calm ? target : x + (target - x) * (1 - Math.exp(-dt / 0.3));
  if (Math.abs(target - x) < 0.01) x = target;
  draw();
  const settled = !touring && Math.abs(target - x) < 0.01;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => { touring = false; target = clamp(next, REACH[0], REACH[1]); clearTimeout(idleTimer); idleTimer = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 4000); run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length -1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const share = clamp(((event.clientX - box.left) / box.width - 0.25) / 0.5, 0, 1);
  steer(REACH[0] + share * (REACH[1] - REACH[0]));
});
stage.addEventListener("pointerleave", () => steer(target));
stage.addEventListener("keydown", (event) => {
  const here = stops.reduce((best, stop, index) => (Math.abs(stop - target) < Math.abs(stops[best] - target) ? index : best), 0);
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = Math.max(0, here -1);
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = Math.min(stops.length -1, here +1);
  if (event.key === "Home") to =0;
  if (event.key === "End") to = stops.length -1;
  if (to === null) return;
  event.preventDefault();
  steer(stops[to]);
});
draw();
function tourAt(t) {
  const progress = (t % TOUR_INTERVAL) / TOUR_INTERVAL;
  return REACH[0] + progress * (REACH[1] - REACH[0]);
}
const TOUR_INTERVAL = 2; // Seconds for full sweep
document.addEventListener("DOMContentLoaded", () => { // Ensure k is available (kit inline script)
  if (typeof k !== 'undefined') { run(); }
});
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Three Guarantees Monitor",
  hint: "Hover to slide the carriage (touring every 2 seconds)",
  readout: "2h sweep · 3 channels · 0 faults",
  keys: [
    { mark: "lit", label: "Carriage: sweep every 2 hours, checks 3 rails" },
    { mark: "raised", label: "Rails: Model (5 levels), Data (4), Channel (2)" },
    { mark: "color", label: "Lights: WeChat (green), Bark (orange) alarms" },
  ],
  caption:
    "A mechanical monitor for three critical systems: model chain, data sources, and communication channels. A carriage sweeps the rails every 2 hours to check their health levels, with a dial showing fault count and alarm lights for critical channels.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Three Guarantees monitor: arrow keys move the carriage to check rail levels" aria-valuemin="0" aria-valuemax="5" aria-valuenow="0">${svg}</div>`,
});

writeFileSync(join(HERE, theme === "light" ? "three-guarantees-light.html" : "three-guarantees.html"), k.pageHtml({ title: "Three Guarantees Monitor", theme, body, script: kitScript() + live }));
console.log("wrote", theme === "light" ? "three-guarantees-light.html" : "three-guarantees.html");
