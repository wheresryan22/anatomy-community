const D = __DATA__;
const P = D.P;
const root = document.querySelector(".ar");
const stage = root.querySelector(".ar-stage");
const svg = stage.querySelector("svg");
const layer = svg.querySelector(".ar-rack");
const pulseLayer = svg.querySelector(".ar-pulse");
const readout = root.querySelector("[data-readout]");
const live = root.querySelector("[data-live]");
const phaseLine = root.querySelector("[data-phase]");
const partButtons = [...root.querySelectorAll(".ar-part")];
const trayButton = root.querySelector("[data-act='tray']");
const serveButton = root.querySelector("[data-act='serve']");
const slowButton = root.querySelector("[data-act='slow']");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const gaugeEls = Object.fromEntries([...svg.querySelectorAll("[data-gauge]")].map((el) => [el.dataset.gauge, el]));

const nodes = [...layer.querySelectorAll(".it")].map((el) => ({
  el,
  piece: el.dataset.piece,
  grp: el.dataset.grp,
  key: Number(el.dataset.k),
  m: el.dataset.m.split(",").map(Number),
  shown: "",
}));
for (const node of nodes) node.lift = node.m[0] * D.V[0] + node.m[1] * D.V[1] + node.m[2] * D.V[2];
const movers = nodes.filter((node) => node.piece === "tray");
let order = nodes.map((_, index) => index);

const SPRING = D.spring;
const tray = { x: 0, v: 0, target: 0 };
const M = D.model;
const LAYERS = M.layers;
// Where each part of a layer's time goes, from the model: reading weights and KV cache, then collectives.
const PHASES = [
  { to: 0.33, name: "attention: each GPU reads its KV cache", gpu: 1, nv: 0.08 },
  { to: 0.42, name: "all-reduce across the 8-GPU tensor-parallel group", gpu: 0.3, nv: 1 },
  { to: 0.5, name: "dispatch: tokens sent to their 8 experts", gpu: 0.3, nv: 0.85 },
  { to: 0.92, name: "experts: 4 per GPU, 288 in all", gpu: 1, nv: 0.08 },
  { to: 1, name: "combine: expert outputs sent back", gpu: 0.3, nv: 0.85 },
];

let clock = 0;
let frame = 0;
let last = 0;
let visible = false;
let selected = null;
let open = false;
let serving = true;
let slow = false;
let touring = !still.matches;
let tourClock = 0;
let idleTimer = 0;
let leaveTimer = 0;
let simMs = 0; // model time, in real milliseconds of decode
let token = 0;
let announced = "";
const glow = { gpu: 0.2, nv: 0.1 };
const heat = { kw: serving ? D.cool.fullKw : D.cool.idleKw };
const pulses = [];
let nextIn = 1.2;

const fmt = (value, digits = 0) => value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

function say(text) {
  if (readout.textContent !== text) readout.textContent = text;
}
function announce(text) {
  if (announced === text) return;
  announced = text;
  live.textContent = text;
}

function setOpen(on) {
  if (open === on) return;
  open = on;
  tray.target = on ? 1 : 0;
  trayButton.setAttribute("aria-pressed", String(on));
  trayButton.textContent = on ? "Slide tray in" : "Pull tray out";
  run();
}

function select(grp) {
  if (grp === "rack" || grp === "stack") grp = null;
  if (selected === grp) return;
  selected = grp;
  for (const node of nodes) {
    const on = grp !== null && (grp === "tray" ? node.piece === "tray" : node.grp === grp);
    if (on) node.el.setAttribute("data-on", "");
    else node.el.removeAttribute("data-on");
  }
  if (grp) stage.setAttribute("data-focus", "");
  else stage.removeAttribute("data-focus");
  partButtons.forEach((button) => (button.dataset.grp === grp ? button.setAttribute("data-on", "") : button.removeAttribute("data-on")));
  if (grp === "gpu" || grp === "cpu" || grp === "tray") setOpen(true);
  if (grp) announce(D.groups[grp].say);
}

function steer(dt, calm) {
  if (calm) {
    tray.x = tray.target;
    tray.v = 0;
    return false;
  }
  for (let i = 0; i < SPRING.substeps; i++) {
    const h = dt / SPRING.substeps;
    tray.v += ((tray.target - tray.x) * SPRING.stiffness - tray.v * SPRING.damping) * h;
    tray.x += tray.v * h;
  }
  if (Math.abs(tray.target - tray.x) < 2e-4 && Math.abs(tray.v) < 2e-4) {
    tray.x = tray.target;
    tray.v = 0;
    return false;
  }
  return true;
}

let placedAt = -1;
function place() {
  if (tray.x === placedAt) return;
  placedAt = tray.x;
  const share = tray.x;
  for (const node of movers) {
    const tx = (D.EX[0] * node.m[0] + D.EY[0] * node.m[1] + D.EZ[0] * node.m[2]) * share;
    const ty = (D.EX[1] * node.m[0] + D.EY[1] * node.m[1] + D.EZ[1] * node.m[2]) * share;
    const text = share === 0 ? "" : `translate(${tx.toFixed(2)} ${ty.toFixed(2)})`;
    if (text !== node.shown) {
      node.shown = text;
      if (text) node.el.setAttribute("transform", text);
      else node.el.removeAttribute("transform");
    }
  }
  const keyOf = (node) => node.key + (node.piece === "tray" ? node.lift * share : 0);
  const next = nodes.map((_, index) => index).sort((a, b) => keyOf(nodes[a]) - keyOf(nodes[b]));
  if (next.some((index, at) => index !== order[at])) {
    const fragment = document.createDocumentFragment();
    for (const index of next) fragment.appendChild(nodes[index].el);
    layer.appendChild(fragment);
    order = next;
  }
}

// ---------------------------------------------------------------- gauges
const tempToAngle = (c) => (-135 + ((Math.min(50, Math.max(20, c)) - 20) / 30) * 270) * (Math.PI / 180);
function needle(key, c) {
  const g = D.gauges[key];
  const a = tempToAngle(c);
  const pt = (r) => {
    const s = Math.sin(a) * r;
    const q = Math.cos(a) * r;
    return iso([g.o[0] + g.u[0] * s + g.v[0] * q, g.o[1] + g.u[1] * s + g.v[1] * q, g.o[2] + g.u[2] * s + g.v[2] * q], P);
  };
  const [x0, y0] = pt(-1.1);
  const [x1, y1] = pt(g.r - 1.5);
  gaugeEls[key].innerHTML = `<path class="iso-line" data-tone="lit" data-free="" style="stroke-width:1" d="M${x0.toFixed(2)} ${y0.toFixed(2)}L${x1.toFixed(2)} ${y1.toFixed(2)}"/>`;
}
const returnC = (kw) => D.cool.supplyC + (kw * 1000) / ((D.cool.lpm / 60 / 1000) * D.cool.density * D.cool.cp);

// ---------------------------------------------------------------- pulses along the fabric
function along(points, t) {
  let total = 0;
  const lengths = [];
  for (let i = 1; i < points.length; i++) {
    const l = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    lengths.push(l);
    total += l;
  }
  let target = t * total;
  for (let i = 0; i < lengths.length; i++) {
    if (target <= lengths[i]) {
      const f = lengths[i] ? target / lengths[i] : 0;
      return [points[i][0] + (points[i + 1][0] - points[i][0]) * f, points[i][1] + (points[i + 1][1] - points[i][1]) * f];
    }
    target -= lengths[i];
  }
  return points[points.length - 1];
}
function launch(inbound) {
  const cord = D.cords[Math.floor(Math.random() * D.cords.length)];
  const path = [...D.trunk, ...cord];
  pulses.push({ path: inbound ? path : [...path].reverse(), age: 0, life: 2.4, el: null });
}
function stepPulses(dt) {
  for (const p of pulses) {
    p.age += dt;
    if (!p.el) {
      p.el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      p.el.setAttribute("r", "1.6");
      pulseLayer.appendChild(p.el);
    }
    const t = Math.min(1, p.age / p.life);
    const e = t * t * (3 - 2 * t);
    const [x, y] = along(p.path, e);
    p.el.setAttribute("cx", x.toFixed(2));
    p.el.setAttribute("cy", y.toFixed(2));
    const fade = Math.min(1, p.age / 0.15, (p.life - p.age) / 0.25);
    p.el.setAttribute("opacity", Math.max(0, fade).toFixed(3));
  }
  for (let i = pulses.length - 1; i >= 0; i--) if (pulses[i].age >= pulses[i].life) {
    pulses[i].el?.remove();
    pulses.splice(i, 1);
  }
}

// ---------------------------------------------------------------- the decode loop
function stepDecode(dt, calm) {
  const slowdown = slow ? D.slowFactor : D.fastFactor;
  let phase = null;
  let layerIndex = 0;
  if (serving && !calm) {
    const before = Math.floor(simMs / M.stepMs);
    simMs += (dt * 1000) / slowdown;
    const after = Math.floor(simMs / M.stepMs);
    if (after > before) {
      token += after - before;
      launch(false);
    }
    const inStep = (simMs % M.stepMs) / M.stepMs;
    const layerPos = inStep * LAYERS;
    layerIndex = Math.floor(layerPos);
    const f = layerPos - layerIndex;
    phase = PHASES.find((ph) => f <= ph.to) ?? PHASES[PHASES.length - 1];
    nextIn -= dt;
    if (nextIn <= 0) {
      launch(true);
      nextIn = 2.2 + Math.random() * 2.6;
    }
  }
  const target = serving ? (phase ?? { gpu: 0.7, nv: 0.5 }) : { gpu: 0.12, nv: 0.04 };
  const tau = slow ? 0.25 : 0.018;
  const k = calm ? 1 : 1 - Math.exp(-dt / tau);
  glow.gpu += (target.gpu - glow.gpu) * k;
  glow.nv += (target.nv - glow.nv) * k;
  stage.style.setProperty("--gpu", glow.gpu.toFixed(3));
  stage.style.setProperty("--nv", glow.nv.toFixed(3));
  stage.style.setProperty("--sw", (0.15 + 0.85 * glow.nv).toFixed(3));
  // heat follows the load with a few seconds of lag
  const kwTarget = serving ? D.cool.fullKw : D.cool.idleKw;
  heat.kw += (kwTarget - heat.kw) * (calm ? 1 : 1 - Math.exp(-dt / 4));
  needle("supply", D.cool.supplyC);
  needle("return", returnC(heat.kw));
  if (!calm) stepPulses(dt);
  return { phase, layerIndex };
}

function idleText(info) {
  if (selected) return D.groups[selected].short;
  if (!serving) return `idle · return ${fmt(returnC(heat.kw), 1)} °C`;
  if (still.matches) return `${fmt(M.replicaTokPerSec)} tokens/s · ${M.batch} streams`;
  return `token ${fmt(token)} · layer ${info.layerIndex + 1}/${LAYERS}`;
}

const TOUR = [
  [0, null, false],
  [2.5, "gpu", true],
  [8.5, "cpu", true],
  [13, "cool", true],
  [18, "spine", false],
  [23, "switch", false],
  [27, "fabric", false],
  [31.5, "spares", false],
  [35, null, false],
];
const TOUR_LEN = 37;
function tourAt(t) {
  let step = TOUR[0];
  for (const s of TOUR) if (t >= s[0]) step = s;
  return step;
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  clock += dt;
  const calm = still.matches;
  if (touring) {
    tourClock = (tourClock + dt) % TOUR_LEN;
    const [, grp, wantOpen] = tourAt(tourClock);
    select(grp);
    setOpen(wantOpen || grp === "gpu" || grp === "cpu");
  }
  const moving = steer(dt, calm);
  place();
  const info = stepDecode(dt, calm);
  say(idleText(info));
  phaseLine.textContent = selected ? D.groups[selected].say : serving ? (info.phase ? `${slow ? "slowed " + fmt(D.slowFactor) : "slowed " + fmt(D.fastFactor)}× · layer ${info.layerIndex + 1}: ${info.phase.name}` : `${fmt(M.replicaTokPerSec)} tokens/s across ${M.batch} streams`) : "serving paused: no tokens, GPUs idle, the return line cools";
  const busy = moving || touring || (serving && !calm) || pulses.length > 0;
  frame = visible && busy ? requestAnimationFrame(tick) : 0;
}

function run() {
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
}

new IntersectionObserver(
  (entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) run();
  },
  { rootMargin: "120px 0px" },
).observe(stage);

function quietTour() {
  touring = false;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (still.matches) return;
    touring = true;
    tourClock = 0;
    run();
  }, 9000);
}

function grpAt(event) {
  const hit = document.elementFromPoint(event.clientX, event.clientY);
  const item = hit && hit.closest ? hit.closest(".it") : null;
  return item ? { grp: item.dataset.grp, tray: item.dataset.piece === "tray" } : null;
}

stage.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  clearTimeout(leaveTimer);
  quietTour();
  const hit = grpAt(event);
  if (hit) {
    select(hit.grp);
    if (hit.tray) setOpen(true);
  }
  run();
});
stage.addEventListener("pointerleave", () => {
  leaveTimer = setTimeout(() => {
    select(null);
    run();
  }, 900);
});
stage.addEventListener("click", (event) => {
  quietTour();
  const hit = grpAt(event);
  select(hit ? hit.grp : null);
  if (hit && hit.tray) setOpen(true);
  run();
});
stage.addEventListener("keydown", (event) => {
  const keys = { o: () => setOpen(!open), " ": () => toggleServe(), s: () => toggleSlow(), Escape: () => (select(null), setOpen(false)) };
  const order = D.order;
  if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
    const at = selected ? order.indexOf(selected) : -1;
    const next = (at + (event.key === "ArrowRight" ? 1 : order.length - 1)) % order.length;
    quietTour();
    select(order[next]);
    event.preventDefault();
    run();
    return;
  }
  const fn = keys[event.key];
  if (fn) {
    quietTour();
    fn();
    event.preventDefault();
    run();
  }
});
stage.addEventListener("focus", () => announce(selected ? D.groups[selected].say : D.groups.rack.say));
partButtons.forEach((button) =>
  button.addEventListener("click", () => {
    quietTour();
    select(selected === button.dataset.grp ? null : button.dataset.grp);
    if (!["gpu", "cpu", "tray"].includes(selected)) setOpen(false);
    run();
  }),
);
function toggleServe() {
  serving = !serving;
  serveButton.setAttribute("aria-pressed", String(serving));
  serveButton.textContent = serving ? "Pause serving" : "Resume serving";
  announce(serving ? "serving" : "serving paused");
}
function toggleSlow() {
  slow = !slow;
  slowButton.setAttribute("aria-pressed", String(slow));
  announce(slow ? `slow motion, ${fmt(D.slowFactor)} times` : "normal speed");
}
trayButton.addEventListener("click", () => (quietTour(), setOpen(!open), run()));
serveButton.addEventListener("click", () => (quietTour(), toggleServe(), run()));
slowButton.addEventListener("click", () => (quietTour(), toggleSlow(), run()));

if (still.matches) {
  setOpen(true);
  tray.x = 1;
}
needle("supply", D.cool.supplyC);
needle("return", returnC(heat.kw));
place();
