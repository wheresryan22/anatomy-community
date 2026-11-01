
const DATA = __DATA__;
__KIT__
const PROJ = DATA.P;
const M = DATA.MODEL;
const PK = DATA.K;
const PARTS = makeParts(k, G, PROJ, C);
const PR = DATA.PR;
const PRIME_DELAY = 0.9;
const KIN = PARTS.K;
const stage = document.querySelector(".iso-stage");
const svgEl = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const live = document.querySelector(".pm-live");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const groups = {};
for (const g of svgEl.querySelectorAll("[data-dyn]")) groups[g.dataset.dyn] = g;
const put = (name, html) => { const g = groups[name]; if (g.__html !== html) { g.innerHTML = html; g.__html = html; } };

const st = { ...DATA.STATE0, jugT: -PRIME_DELAY, jugB: [...C.JUG_HOME, 0], jugPhi: 0, jugStage: "home", pourFlow: 0, rate: 0, target: DATA.STATE0.theta, vc: (DATA.STATE0.wl - C.TRAY) * M.AREA_C, vj: 0, lifted: 0, strokes: 0, flowSpout: 0, flowDrain: 0, q: 0, phase: "rest", vb: 0 };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const zbOf = (theta) => KIN.crossOf(theta).C[2] - KIN.rod;
const SPILL_MAX = M.AREA_B * (PK.stroke / 0.55);
const Q_MAX = M.CDA * Math.sqrt(2 * M.G * (C.JAR_FLOOR + M.TRIG - C.DRAIN_OUT));

function primeStep(dt, calm) {
  if (calm && !st.primed) { st.poured = PR.need; st.jugVol = PR.v0 - PR.need; st.jugT = 1e9; }
  else st.jugT += dt;
  const pose = jugPose(C, PR, Math.max(0, st.jugT));
  st.jugB = pose.B; st.jugPhi = pose.phi; st.jugStage = st.jugT < 0 ? "home" : pose.stage;
  // water leaves the jug once the tilt can no longer hold it
  const excess = st.jugVol - jugHold(C, st.jugPhi);
  const q = excess > 0 ? Math.min(excess / 0.12, 20000) : 0;
  const out = Math.min(st.jugVol, q * dt);
  st.jugVol -= out;
  if (!st.primed) st.poured += out;
  st.pourFlow = calm ? 0 : st.pourFlow + (Math.min(1, q / 20000) - st.pourFlow) * (1 - Math.exp(-dt / 0.06));
  if (st.pourFlow < 0.01 && q === 0) st.pourFlow = 0;
  if (!st.primed) {
    st.prime = primeLevel(C, PR, st.poured, st.zb);
    if (st.poured >= PR.need - 20) { st.primed = true; st.prime = st.zb; st.surface = st.zb + C.BUCKET_H; clock = 0; }
  }
}

function step(dt, calm) {
  // the sweep: a critically damped follow toward the target angle
  const w = 1 / 0.2;
  if (calm) { st.theta = st.target; st.rate = 0; }
  else {
    for (let i = 0; i < 4; i++) {
      const h = dt / 4;
      st.rate += (w * w * (st.target - st.theta) - 2 * w * st.rate) * h;
      st.theta += st.rate * h;
    }
    if (Math.abs(st.target - st.theta) < 1e-4 && Math.abs(st.rate) < 1e-4) { st.theta = st.target; st.rate = 0; }
  }
  const zb = zbOf(st.theta);
  if (!st.primed) {
    st.zb = zb; st.vb = 0; st.surface = zb + C.BUCKET_H;
    st.phase = st.poured > 0 ? "priming" : "dry";
    return;
  }
  const dz = zb - st.zb;
  st.vb = dt > 0 ? dz / dt : 0;
  st.zb = zb;
  const before = st.surface;
  // water above the bucket rides up with it; on the way down the water below passes through the clack
  if (dz > 0) st.surface += dz;
  st.surface = Math.max(st.surface, zb + C.BUCKET_H);
  let spill = 0;
  if (st.surface > C.LIP) { spill = st.surface - C.LIP; st.surface = C.LIP; }
  const rise = Math.max(0, st.surface - before);
  const out = (rise + spill) * M.AREA_B;   // mm³ drawn up out of the well this frame
  st.vc -= out;
  st.vj += spill * M.AREA_B;
  st.lifted += spill * M.AREA_B;
  // valves follow the flow through them
  const vs = 26;
  const clackWant = dz < 0 ? clamp(-st.vb / vs, 0, 1) : 0;
  const succurWant = dz > 0 ? clamp(st.vb / vs, 0, 1) : 0;
  const ease = (x, want, tau) => (calm ? want : x + (want - x) * (1 - Math.exp(-dt / tau)));
  st.clack = ease(st.clack, clackWant, 0.07);
  st.succur = ease(st.succur, succurWant, 0.07);
  if (st.clack < 0.002) st.clack = 0;
  if (st.succur < 0.002) st.succur = 0;
  // the jar's bell siphon
  let level = st.vj / M.AREA_J;
  if (!st.siphon && level >= M.TRIG) st.siphon = 1;
  st.q = 0;
  if (st.siphon) {
    const head = C.JAR_FLOOR + level - C.DRAIN_OUT;
    st.q = M.CDA * Math.sqrt(2 * M.G * Math.max(0, head));
    const back = Math.min(st.vj, st.q * dt);
    st.vj -= back;
    st.vc += back;
    level = st.vj / M.AREA_J;
    if (level <= 3.4) st.siphon = 0;
  }
  st.level = level;
  st.wl = C.TRAY + st.vc / M.AREA_C;
  st.flowSpout = ease(st.flowSpout, clamp((spill * M.AREA_B) / Math.max(dt, 1e-3) / SPILL_MAX, 0, 1), 0.06);
  st.flowDrain = ease(st.flowDrain, clamp(st.q / Q_MAX, 0, 1), 0.08);
  if (st.flowSpout < 0.01) st.flowSpout = calm ? 0 : st.flowSpout * 0.5;
  if (st.flowDrain < 0.01) st.flowDrain = 0;
  // phase from the bucket's motion
  const was = st.phase;
  st.phase = st.vb < -2 ? "down" : st.vb > 2 ? "up" : "rest";
  if (was === "up" && st.phase !== "up") st.strokes += 1;
}

const PHASE = {
  down: "downstroke · clack open",
  up: "upstroke · succurs open",
  rest: "at rest · valves shut",
  dry: "dry · fetching priming water",
  priming: "priming",
};
let lastPhase = "";
function draw() {
  put("lever", PARTS.lever(st.theta));
  put("barrel", PARTS.barrel({ zb: st.zb, surface: st.surface, clack: st.clack, succur: st.succur, level: st.primed ? Infinity : st.prime }));
  put("pipeAbove", PARTS.pipeAbove(st.primed ? Infinity : st.prime));
  const behind = st.jugB[1] < 0;
  const jugSvg = PARTS.jug(st.jugB, st.jugPhi, st.jugVol);
  put("jugBack", behind ? jugSvg : "");
  put("jugFront", behind ? "" : jugSvg);
  const lip = PARTS.jugLip(st.jugB, st.jugPhi);
  put("pour", st.pourFlow > 0.01 ? PARTS.stream(lip[0], lip[1], lip[2], C.HEAD_TOP, st.pourFlow) : "");
  put("lowerPipe", PARTS.lowerPipe(st.succur, st.wl));
  put("cistern", PARTS.cistern(st.wl));
  put("upperPipe", PARTS.upperPipe(st.wl, st.primed ? Infinity : st.prime));
  put("jar", PARTS.jar(st.level, st.siphon ? clamp(st.q / Q_MAX, 0, 1) : 0));
  put("stream", PARTS.stream(C.JAR[0], C.JAR[1], C.NOZZLE_END, C.JAR_FLOOR + st.level, st.flowSpout, 3));
  put("drain", PARTS.stream(C.BELL[0], C.BELL[1], C.DRAIN_OUT, st.wl, st.flowDrain, 3.5));
  const text = st.phase === "priming" ? `priming · ${(st.poured / 1000).toFixed(0)} of ${(PR.need / 1000).toFixed(0)} mL poured` : st.phase === "dry" ? PHASE.dry : `${PHASE[st.phase]} · ${(st.lifted / 1000).toFixed(0)} mL lifted`;
  if (readout.textContent !== text) readout.textContent = text;
  const lift = Math.round(((PK.hi - st.theta) / (PK.hi - PK.lo)) * 100);
  stage.setAttribute("aria-valuenow", String(clamp(lift, 0, 100)));
  if (st.phase !== lastPhase) {
    lastPhase = st.phase;
    const words = PHASE[st.phase].replace(" · ", ": ");
    stage.setAttribute("aria-valuetext", words.charAt(0).toUpperCase() + words.slice(1));
  }
}

// idle tour: lift the sweep, pause, pull it down, pause
let frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idleTimer = 0, seq = null;
const tourAt = (t) => { const p = t % 3.0; return p < 1.4 ? PK.lo : PK.hi; };
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  primeStep(dt, calm);
  if (touring && st.primed && st.jugStage === "home") { clock += dt; st.target = tourAt(clock); }
  if (seq && st.primed && st.jugStage === "home") { seq.t += dt; st.target = seq.t < 0.9 ? PK.lo : PK.hi; if (seq.t > 2.2) seq = null; }
  const busy = !st.primed || st.jugStage !== "home";
  if (busy) st.target = PK.lo;
  step(dt, calm);
  draw();
  const settled = st.primed && st.jugStage === "home" && st.pourFlow === 0 && !touring && !seq && st.theta === st.target && st.rate === 0 && st.flowSpout < 0.01 && st.flowDrain === 0 && !st.siphon && st.clack === 0 && st.succur === 0;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => { touring = false; clearTimeout(idleTimer); idleTimer = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 3600); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svgEl.getBoundingClientRect();
  const fy = (event.clientY - box.top) / box.height;
  const lift = clamp((0.62 - fy) / 0.34, 0, 1);
  hold();
  seq = null;
  st.target = PK.hi - lift * (PK.hi - PK.lo);
  run();
});
stage.addEventListener("keydown", (event) => {
  let to = null;
  if (event.key === "ArrowUp" || event.key === "ArrowRight") to = PK.lo;
  if (event.key === "ArrowDown" || event.key === "ArrowLeft") to = PK.hi;
  if (event.key === "Home") to = PK.hi;
  if (event.key === "End") to = PK.lo;
  if (event.key === " " || event.key === "Enter") { event.preventDefault(); hold(); seq = { t: 0 }; run(); return; }
  if (to === null) return;
  event.preventDefault();
  hold();
  seq = null;
  st.target = to;
  run();
});
stage.addEventListener("focus", () => { live.textContent = stage.getAttribute("aria-valuetext"); });
if (still.matches) touring = false;
draw();
