const D = __DATA__;
const P = D.P;
const K = { iso, pathOf, solidSvg, lineSvg, dotsSvg };
const PARTS = makeParts(K, G, P, D);
const stage = document.querySelector(".lt-stage");
const svg = stage.querySelector("svg");
const layer = svg.querySelector(".lt-items");
const $ = (sel) => svg.querySelector(sel);
const readout = document.querySelector("[data-readout]");
const status = document.querySelector("[data-status]");
const still = matchMedia("(prefers-reduced-motion: reduce)");

const el = {
  jawsBack: $('[data-part="jaws-back"]'),
  jawsFront: $('[data-part="jaws-front"]'),
  face: $('[data-part="chuck-face"]'),
  stock: $('[data-part="stock"]'),
  cut: $('[data-part="cut"]'),
  cap: $('[data-part="cap"]'),
  stockClip: $('[data-part="stock-clip"]'),
  cutClip: $('[data-part="cut-clip"]'),
  fresh: $('[data-part="fresh"]'),
  thread: $('[data-part="thread"]'),
  needle: $('[data-part="needle"]'),
  pointer: $('[data-part="pointer"]'),
  lever: $('[data-part="lever"]'),
  apron: $('[data-part="apron-turn"]'),
  dial: $('[data-part="thread-dial"]'),
  cross: $('[data-part="cross-turn"]'),
  collar: $('[data-part="cross-dial"]'),
  chip: $('[data-part="chip"]'),
};

const nodes = [...layer.querySelectorAll(":scope > .it")].map((node) => {
  const m = node.dataset.m.split(",").map(Number);
  return { node, piece: node.dataset.piece, key: Number(node.dataset.k), lift: m[0] * D.V[0] + m[1] * D.V[1] + m[2] * D.V[2], shown: "" };
});
let order = nodes.map((_, index) => index);

const M = D.model;
const U = M.unit;
const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const ease = (x) => x * x * (3 - 2 * x);
const follow = (value, target, dt, seconds) => (still.matches ? target : target + (value - target) * Math.exp(-dt / seconds));
const shift = (dx, dy) => (Math.abs(dx) < 0.005 && Math.abs(dy) < 0.005 ? "" : `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`);
// One second on the page is 18 s of machine time. The chuck is drawn turning at 1/33 of its real speed,
// slow enough to follow the jaws.
const TIME_LAPSE = 18;
const RETRACT = 2;
// The motor takes a short overload; past 120 % of its rated power the thermal relay trips.
const TRIP = 1.2;

const s = {
  speed: 5,
  depth: 1,
  pass: 1,
  cur: null,
  left: 0,
  phase: "cut",
  timer: 0,
  xt: D.xt0,
  xcut: D.barEnd,
  ys: 0,
  ysTarget: 0,
  spin: 0,
  thread: 0,
  load: 0.06,
  chip: 0,
  fresh: 0,
  engaged: true,
  tripped: false,
  spinRate: 0,
  paused: false,
  machine: 0,
};

const radius = (Dmm) => Dmm / 2 / U;
const rpm = () => M.speeds[s.speed];
const ap = () => M.depths[s.depth];
// The slide was built with the tool tip at rt0; it moves in y to put the tip on the new radius.
const depthY = () => radius(s.cur.to) - D.rt0;

function rebuildWork() {
  const F = D.spinF;
  const r0 = radius(s.cur.from);
  const r1 = radius(s.cur.to);
  const rod = (r) => solidSvg(G.solidOf([[D.gripEnd - 0.5, r], [D.barEnd, r]], F, P), { tone: "hi", crease: "lo" });
  const fill = (r, a, b) => G.outlineOf([[a, 0], [a, r], [b, r], [b, 0]], F, P).fill;
  el.stock.innerHTML = rod(r0);
  el.cut.innerHTML = rod(r1);
  el.cap.innerHTML = solidSvg(G.disc(D.barEnd - 0.05, D.barEnd + 0.05, r0, F, P), { tone: "hi", crease: "lo" });
  el.stockClip.setAttribute("d", fill(r0 + 0.15, D.gripEnd - 1, D.barEnd + 0.4));
  el.cutClip.setAttribute("d", fill(r1 + 0.15, D.barEnd, D.barEnd + 300));
}

// Plan the rest of the job from diameter D at the chosen depth, and set up its first pass.
function plan(Dmm) {
  const passes = planPasses(Dmm, ap());
  s.cur = passes[0] ?? null;
  s.left = passes.length;
  s.xcut = D.barEnd;
  s.machine = 0;
  if (s.cur) rebuildWork();
  return !!s.cur;
}

function freshBar() {
  s.pass = 1;
  plan(M.stock);
}

const untouched = () => s.xcut >= D.barEnd - 0.01;
const atDepth = () => Math.abs(s.ys - depthY()) < 0.05;
const inBar = () => s.xt < D.barEnd && s.xt > D.gripEnd - 0.5;

function go(phase) {
  s.phase = phase;
  s.timer = 0;
}

function step(dt) {
  const n = rpm();
  // With the relay tripped the spindle coasts down and the gearbox, driven from it, stops too.
  s.spinRate = follow(s.spinRate, s.tripped ? 0 : 1, dt, 0.5);
  const powerRate = ((s.cur.f * n * TIME_LAPSE) / 60 / U) * s.spinRate;
  s.timer += dt;
  // The feed gearbox keeps the lead screw turning at f·n whatever the half-nut does.
  if (!s.paused) s.thread -= powerRate * dt;
  s.spin -= TAU * 0.45 * (n / 900) * s.spinRate * dt;
if (s.phase === "cut") {
    s.engaged = true;
    s.ysTarget = depthY();
    if (!s.paused && !s.tripped && atDepth()) s.xt = Math.max(D.xt1, s.xt - powerRate * dt);
    if (s.xt <= D.xt1 + 1e-6) go("retract");
  } else if (s.phase === "retract") {
    s.engaged = false;
    s.ysTarget = depthY() + RETRACT;
    if (s.timer > 0.6) go("return");
  } else if (s.phase === "return") {
    s.xt = follow(s.xt, D.xt0, dt, 0.32);
    if (Math.abs(s.xt - D.xt0) < 0.05) {
      s.xt = D.xt0;
      const D0 = s.cur.to;
      if (plan(D0)) {
        s.pass += 1;
        go("infeed");
      } else {
        s.cur = { from: D0, to: D0, ap: 0, f: 0.2, kind: "done" };
        go("dwell");
      }
    }
  } else if (s.phase === "dwell") {
    if (s.timer > 1.4) go("swap");
  } else if (s.phase === "swap") {
    s.fresh = ease(clamp(s.timer / 1.4, 0, 1));
    if (s.timer > 1.4) {
      freshBar();
      s.fresh = 0;
      go("infeed");
    }
  } else if (s.phase === "infeed") {
    s.ysTarget = depthY();
    if (s.timer > 0.9) go("cut");
  }
  s.ys = follow(s.ys, s.ysTarget, dt, 0.16);
  const on = s.cur.kind !== "done" && !s.tripped && atDepth() && inBar() && s.xt < s.xcut + 0.01 && s.engaged && !s.paused;
  if (on) {
    s.xcut = Math.min(s.xcut, s.xt);
    s.machine += (dt * TIME_LAPSE) / 60;
  }
  const c = cutting(s.cur.from, n, s.cur.ap, s.cur.f);
  if (on && c.load > TRIP) s.tripped = true;
  s.load = follow(s.load, on ? c.load : s.tripped ? 0 : 0.06, dt, 0.3);
  s.chip = follow(s.chip, on ? 1 : 0, dt, 0.18);
}

function place() {
  const share = (s.xt - D.xt0) / (D.xt1 - D.xt0);
  const dx = s.xt - D.xt0;
  // The cross slide moves a few units at most, so it keeps its settled place above the saddle.
  const keyOf = (n) => n.key + (n.piece === "stand" ? 0 : n.lift * share);
  for (const n of nodes) {
    if (n.piece === "stand") continue;
    const ys = n.piece === "slide" ? s.ys : 0;
    const text = shift(D.EX[0] * dx + D.EY[0] * ys, D.EX[1] * dx + D.EY[1] * ys);
    if (text !== n.shown) {
      n.shown = text;
      if (text) n.node.setAttribute("transform", text);
      else n.node.removeAttribute("transform");
    }
  }
  const next = nodes.map((_, index) => index).sort((a, b) => keyOf(nodes[a]) - keyOf(nodes[b]));
  if (next.some((index, i) => index !== order[i])) {
    const fragment = document.createDocumentFragment();
    for (const index of next) fragment.appendChild(nodes[index].node);
    layer.appendChild(fragment);
    order = next;
  }
}

function draw() {
  place();
  const J = PARTS.jaws(s.spin);
  el.jawsBack.innerHTML = J.back;
  el.jawsFront.innerHTML = J.front;
  el.face.innerHTML = PARTS.chuckFace(s.spin);
  const cx = s.xcut - D.barEnd;
  const t = shift(D.EX[0] * cx, D.EX[1] * cx);
  for (const node of [el.cap, el.stockClip, el.cutClip]) t ? node.setAttribute("transform", t) : node.removeAttribute("transform");
  const tw = ((s.thread % D.pitch) + D.pitch) % D.pitch - D.pitch;
  el.thread.setAttribute("transform", shift(D.EX[0] * tw, D.EX[1] * tw));
  el.fresh.setAttribute("opacity", s.fresh.toFixed(3));
  el.needle.innerHTML = PARTS.needle(s.load);
  el.pointer.innerHTML = PARTS.pointer(s.speed);
  el.lever.innerHTML = PARTS.lever(s.engaged && !s.paused);
  el.apron.innerHTML = PARTS.wheelTurn(D.wheels.apron, (-(s.xt * U) / M.rackPerTurn) * TAU);
  // Cross-slide screw: 2.5 mm a turn, so the collar turns ap / 2.5 of a turn for each pass.
  const crossTurns = (s.ys * U) / M.crossPitch;
  el.cross.innerHTML = PARTS.wheelTurn(D.wheels.cross, crossTurns * TAU);
  el.collar.innerHTML = PARTS.collar(crossTurns * TAU);
  // The dial's gear meshes the screw, so it turns once per teeth × pitch of screw slipping past the carriage.
  el.dial.innerHTML = PARTS.dial((((s.thread - (s.xt - D.xt0)) * U) / (M.dialTeeth * M.lead)) * TAU);
  el.chip.innerHTML = s.chip > 0.02 ? PARTS.chip(s.spin * 3, [D.xt0, D.rt0, D.zc], s.chip, s.cur.ap / U / 2) : "";
  say();
}

function say() {
  const n = rpm();
  const c = cutting(s.cur.from, n, s.cur.ap, s.cur.f);
  // Machine time spent on this pass, and what is left at the power feed and speed set now.
  const remaining = ((Math.max(s.xcut, D.gripEnd) - D.gripEnd) * U) / (s.cur.f * n);
  const done = s.cur.kind === "done";
  const kw = `${c.kw.toFixed(2)} kW`;
  let text;
  if (done) text = `Ø${s.cur.to.toFixed(1)} mm finished · new bar next`;
  else if (s.tripped) text = `Relay tripped at ${kw} · ${untouched() ? "← slower or ↓ shallower" : "← slower"}`;
  else text = `Ø${s.cur.from.toFixed(1)} → ${s.cur.to.toFixed(1)} mm · ${n} rpm · vc ${c.vc.toFixed(0)} m/min · ${kw}${c.load > 1 ? " overload" : ""}`;
  if (readout.textContent !== text) readout.textContent = text;
  const detail = done
    ? ""
    : `; pass ${s.pass} of ${s.pass + s.left - 1}, ${s.cur.kind}, depth of cut ${s.cur.ap.toFixed(2)} mm, feed ${s.cur.f.toFixed(2)} mm per revolution, ${(c.load * 100).toFixed(0)} % of the motor, theoretical Ra ${roughness(s.cur.f).toFixed(2)} µm, machine time ${clock(s.machine)} with ${clock(remaining)} left`;
  stage.setAttribute("aria-valuetext", text + detail);
}

let frame = 0;
let last = 0;
let visible = false;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  step(dt);
  draw();
  frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
}
const run = () => {
  if (!frame && visible && !still.matches) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
};

function stillPose() {
  plan(M.stock);
  s.phase = "cut";
  s.xt = 8;
  s.xcut = 8;
  s.ys = s.ysTarget = depthY();
  s.engaged = true;
  s.machine = ((D.barEnd - s.xt) * U) / (s.cur.f * rpm());
  s.load = cutting(s.cur.from, rpm(), s.cur.ap, s.cur.f).load;
  s.chip = 1;
  s.spin = -0.5;
  draw();
}

new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) run();
}, { rootMargin: "120px 0px" }).observe(stage);

stage.addEventListener("keydown", (event) => {
  let handled = true;
  let depth = false;
  if (event.key === "ArrowRight") s.speed = Math.min(M.speeds.length - 1, s.speed + 1);
  else if (event.key === "ArrowLeft") s.speed = Math.max(0, s.speed - 1);
  else if (event.key === "ArrowUp") (s.depth = Math.min(M.depths.length - 1, s.depth + 1)), (depth = true);
  else if (event.key === "ArrowDown") (s.depth = Math.max(0, s.depth - 1)), (depth = true);
  else if (event.key === " ") s.paused = !s.paused;
  else handled = false;
  if (!handled) return;
  event.preventDefault();
  let note = `${rpm()} rpm`;
  if (depth) {
    // Before the tool has touched the bar this pass, the operator can simply dial in the new depth.
    if (s.cur.kind === "roughing" && untouched() && s.phase !== "swap") {
      const pass = s.pass;
      plan(s.cur.from);
      s.pass = pass;
      note = `depth of cut ${ap().toFixed(1)} mm, dialled in now`;
    } else note = `depth of cut ${ap().toFixed(1)} mm from the next roughing pass`;
  }
  // The relay can be reset once the cut asks no more than the motor's rated power.
  if (s.tripped && cutting(s.cur.from, rpm(), s.cur.ap, s.cur.f).load <= 1) {
    s.tripped = false;
    note += ", relay reset";
  }
  status.textContent = note + (s.paused ? ", feed paused" : "");
  if (still.matches) draw();
  run();
});

if (still.matches) stillPose();
else {
  freshBar();
  draw();
}
