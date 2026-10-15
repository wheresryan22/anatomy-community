const D = __DATA__;
const DEG = Math.PI / 180;
const rig = RIG.makeRig(k, G);
const root = document.querySelector(".wt");
const stage1 = root.querySelector('[data-stage="1"]');
const live1 = stage1.querySelector(".wt-live");
const parts1 = Object.fromEntries([...live1.querySelectorAll("[data-part]")].map((g) => [g.dataset.part, g]));
const readouts = [...root.querySelectorAll("[data-readout]")];
const still = matchMedia("(prefers-reduced-motion: reduce)");
const needle = stage1.querySelector(".wt-needle");
const needleTail = stage1.querySelector(".wt-needle-tail");

// ------------------------------------------------------------------ input
const input = { v: D.start.v, dir: D.start.dir, pitch: null };
const sliders = Object.fromEntries([...root.querySelectorAll("[data-control]")].map((el) => [el.dataset.control, el]));
const outs = Object.fromEntries([...root.querySelectorAll("[data-out]")].map((el) => [el.dataset.out, el]));
const autoButton = root.querySelector("[data-auto]");
let touring = !still.matches;
let tourClock = 0;
let dragging = null;

const compass = (deg) => ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round((((deg % 360) + 360) % 360) / 45) % 8];
function takeOver() {
  touring = false;
}
sliders.v.addEventListener("input", () => {
  takeOver();
  input.v = Number(sliders.v.value);
  kick();
});
sliders.dir.addEventListener("input", () => {
  takeOver();
  input.dir = Number(sliders.dir.value);
  kick();
});
sliders.pitch.addEventListener("input", () => {
  takeOver();
  input.pitch = Number(sliders.pitch.value);
  kick();
});
for (const el of Object.values(sliders)) {
  el.addEventListener("pointerdown", () => (dragging = el.dataset.control));
  el.addEventListener("pointerup", () => (dragging = null));
  el.addEventListener("blur", () => (dragging = null));
}
autoButton.addEventListener("click", () => {
  takeOver();
  input.pitch = typeof input.pitch === "number" ? null : Math.round(state.pitch * 2) / 2;
  kick();
});
for (const button of root.querySelectorAll("[data-preset]")) {
  button.addEventListener("click", () => {
    takeOver();
    input.v = Number(button.dataset.v);
    input.pitch = null;
    sliders.v.value = String(input.v);
    kick();
  });
}

// The idle tour: a breeze, cut-in, a wind shift, rated, cut-out and a storm,
// then back. It drives the same inputs the sliders do, and stops for good the
// moment the reader takes a control.
const TOUR = [
  [0, 9, 75],
  [5, 9, 75],
  [9, 3.5, 75],
  [15, 3.5, 75],
  [19, 3.5, 120],
  [24, 13.2, 120],
  [31, 13.2, 120],
  [35, 18, 95],
  [41, 25.5, 95],
  [52, 25.5, 95],
  [56, 28, 95],
  [62, 18, 75],
  [68, 9, 75],
];
const TOUR_LEN = TOUR[TOUR.length - 1][0];
function tourAt(t) {
  const x = t % TOUR_LEN;
  for (let i = 0; i < TOUR.length - 1; i++) {
    const [t0, v0, d0] = TOUR[i];
    const [t1, v1, d1] = TOUR[i + 1];
    if (x >= t0 && x <= t1) {
      const f = (x - t0) / (t1 - t0 || 1);
      const e = f * f * (3 - 2 * f);
      return { v: v0 + (v1 - v0) * e, dir: d0 + (d1 - d0) * e };
    }
  }
  return { v: TOUR[0][1], dir: TOUR[0][2] };
}

// ------------------------------------------------------------------ model
let state = M.initial(input);
let cupAngle = 0;

// ------------------------------------------------------------------ Fig 1 drawing
let builtHeading = null;
let lastOrder = "";
function drawFig1(s) {
  const P1 = RIG.yawed(D.P, s.yaw);
  if (builtHeading === null || Math.abs(s.yaw - builtHeading) > 0.004) {
    parts1.nacelle.innerHTML = rig.nacelleSvg(P1);
    parts1.nose.innerHTML = rig.noseSvg(P1);
    builtHeading = s.yaw;
  }
  const phi = s.rotor * DEG;
  parts1.hub.innerHTML = rig.hubSvg(P1, phi);
  for (let i = 0; i < 3; i++) parts1[`blade${i}`].innerHTML = rig.bladeSvg(P1, phi + i * 120 * DEG, s.pitch);
  parts1.instruments.innerHTML = rig.roofInstrumentsSvg(P1, cupAngle, -s.yawErr);
  const order = rig.orderOf(P1, phi);
  const key = order.join(",");
  if (key !== lastOrder) {
    const frag = document.createDocumentFragment();
    for (const name of order) frag.appendChild(parts1[name]);
    live1.appendChild(frag);
    lastOrder = key;
  }
  const a = s.dir * DEG;
  const dx = Math.sin(a);
  const dy = Math.cos(a);
  const c = D.dial;
  needle.setAttribute("d", k.lineOnTop([c.x, c.y], [c.x + dx * 4.9, c.y + dy * 4.9], 0.35, D.P));
  needleTail.setAttribute("d", k.lineOnTop([c.x - dx * 0.5, c.y - dy * 0.5], [c.x - dx * 1.9, c.y - dy * 1.9], 0.35, D.P));
}

// ------------------------------------------------------------------ power curve chart
const chartSvg = root.querySelector(".wt-curve");
const CH = { x0: 52, x1: 622, y0: 26, y1: 136, vmax: 30, pmax: 2200 };
const cx = (v) => CH.x0 + ((CH.x1 - CH.x0) * v) / CH.vmax;
const cy = (kW) => CH.y1 - ((CH.y1 - CH.y0) * kW) / CH.pmax;
let chartDot = null;
let chartDrop = null;
let chartRing = null;
function buildChart() {
  const out = [];
  const markX = (m) => cx(m.key === "cutout" ? 25 : m.v);
  out.push(`<rect class="wt-ch-storm" x="${cx(25).toFixed(1)}" y="${CH.y0 - 6}" width="${(cx(30) - cx(25)).toFixed(1)}" height="${CH.y1 - CH.y0 + 6}"/>`);
  for (let v = 0; v <= 30; v += 1) {
    const major = v % 5 === 0;
    out.push(`<path class="wt-ch-tick${major ? " wt-ch-major" : ""}" d="M${cx(v).toFixed(1)} ${CH.y1}V${CH.y1 + (major ? 5 : 2.5)}"/>`);
    if (major) out.push(`<text class="wt-ch-num" x="${cx(v).toFixed(1)}" y="${CH.y1 + 15}" text-anchor="middle">${v}</text>`);
  }
  for (const p of [0, 500, 1000, 1500, 2000]) {
    out.push(`<path class="wt-ch-grid" d="M${CH.x0} ${cy(p).toFixed(1)}H${CH.x1}"/>`);
    out.push(`<text class="wt-ch-num" x="${CH.x0 - 7}" y="${(cy(p) + 3).toFixed(1)}" text-anchor="end">${p ? (p / 1000).toFixed(1) : "0"}</text>`);
  }
  out.push(`<path class="wt-ch-axis" d="M${CH.x0} ${CH.y0 - 6}V${CH.y1}H${CH.x1}"/>`);
  out.push(`<text class="wt-ch-unit" x="${CH.x0 - 7}" y="${CH.y0 - 12}" text-anchor="end">MW</text>`);
  out.push(`<text class="wt-ch-unit" x="${CH.x1}" y="${CH.y1 + 30}" text-anchor="end">wind speed, m/s</text>`);
  out.push(`<text class="wt-ch-unit wt-ch-storm-label" x="${((cx(25) + cx(30)) / 2).toFixed(1)}" y="${CH.y1 - 8}" text-anchor="middle">brake</text>`);
  const pts = D.curve.map(([v, kW]) => [cx(v), cy(kW)]);
  let d = "";
  for (let i = 0; i < pts.length; i++) {
    const jump = i && D.curve[i][1] - D.curve[i - 1][1] < -500;
    d += `${i && !jump ? "L" : "M"}${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
  }
  out.push(`<path class="wt-ch-curve" d="${d}"/>`);
  out.push(`<path class="wt-ch-drop" d="M${cx(25).toFixed(1)} ${cy(2000).toFixed(1)}V${CH.y1}"/>`);
  D.marks.forEach((m, i) => {
    const x = markX(m);
    const y = cy(m.kW);
    out.push(`<path class="wt-ch-mark" d="M${x.toFixed(1)} ${CH.y0 - 6}V${CH.y1}"/>`);
    out.push(`<circle class="wt-ch-markdot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6"/>`);
    const anchor = i === 2 ? "end" : "start";
    const tx = i === 2 ? x - 6 : x + 6;
    out.push(`<text class="wt-ch-label" x="${tx.toFixed(1)}" y="${CH.y0 - 12}" text-anchor="${anchor}">${m.label} ${m.key === "cutout" ? "25.0" : m.v.toFixed(1)}</text>`);
    out.push(`<text class="wt-ch-value" x="${tx.toFixed(1)}" y="${CH.y0 - 1}" text-anchor="${anchor}">${M.fmtKW(m.kW)}${m.key === "cutout" ? " → 0" : ""}</text>`);
  });
  out.push(`<path class="wt-ch-dropline" d=""/>`);
  out.push(`<circle class="wt-ch-ring" r="5.5"/>`);
  out.push(`<circle class="wt-ch-dot" r="2.4"/>`);
  chartSvg.innerHTML = out.join("");
  chartDot = chartSvg.querySelector(".wt-ch-dot");
  chartRing = chartSvg.querySelector(".wt-ch-ring");
  chartDrop = chartSvg.querySelector(".wt-ch-dropline");
}
buildChart();
function drawChart(s) {
  const x = cx(Math.min(30, s.v));
  const y = cy(s.kW);
  for (const el of [chartDot, chartRing]) {
    el.setAttribute("cx", x.toFixed(1));
    el.setAttribute("cy", y.toFixed(1));
  }
  chartDrop.setAttribute("d", `M${x.toFixed(1)} ${y.toFixed(1)}V${CH.y1}`);
}

// ------------------------------------------------------------------ controls and readouts
// Phase changes go to a polite live region, never the per-frame numbers.
const said = root.querySelector(".wt-said");
let lastPhase = "";
function announce(s) {
  const word = M.phaseWord(s);
  if (word === lastPhase) return;
  lastPhase = word;
  const detail = { "storm · parked": "blades feathered, disc brake on", "storm · feathering": "blades feathering, rotor slowing", "overspeed trip": "safety system feathering the blades", rated: "pitching to hold 2 MW", "waiting for wind": "rotor idling", "yawing to face the wind": "too little wind across the rotor until it lines up", "making power": "tracking the best tip speed" }[word];
  if (said && !touring) said.textContent = `${word}${detail ? `: ${detail}` : ""}`;
}
function syncControls(s) {
  announce(s);
  if (touring) {
    sliders.v.value = String(Math.round(input.v * 10) / 10);
    sliders.dir.value = String(Math.round(input.dir));
  }
  const manual = typeof input.pitch === "number";
  if (!manual && dragging !== "pitch") sliders.pitch.value = String(Math.round(s.pitch * 2) / 2);
  outs.v.textContent = `${input.v.toFixed(1)} m/s`;
  outs.dir.textContent = `${String(Math.round(input.dir)).padStart(3, "0")}° ${compass(input.dir)}`;
  outs.pitch.textContent = `${manual ? "set" : "auto"} ${s.pitch.toFixed(1)}°`;
  autoButton.setAttribute("aria-pressed", manual ? "false" : "true");
  autoButton.querySelector("i").textContent = manual ? "off" : "on";
  for (const b of root.querySelectorAll("[data-preset]")) b.toggleAttribute("data-on", Math.abs(Number(b.dataset.v) - input.v) < 0.05);
  if (readouts[0]) readouts[0].textContent = M.readoutOf(s);
  if (readouts[1] && window.__fig2Readout) readouts[1].textContent = window.__fig2Readout(s);
}

// ------------------------------------------------------------------ loop
let frame = 0;
let last = 0;
let visible = false;
const stage2 = root.querySelector('[data-stage="2"]');
const onScreen = new Set();
const watch = new IntersectionObserver(
  (entries) => {
    for (const e of entries) e.isIntersecting ? onScreen.add(e.target) : onScreen.delete(e.target);
    visible = onScreen.size > 0;
    if (visible) kick();
  },
  { rootMargin: "120px 0px" },
);
for (const el of [stage1, stage2]) if (el) watch.observe(el);
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) {
    tourClock += dt;
    const t = tourAt(tourClock);
    input.v = t.v;
    input.dir = t.dir;
  }
  state = M.step(state, input, dt, calm);
  cupAngle = (cupAngle + state.v * 40 * dt) % 360;
  // Each figure is drawn only while it is on screen; the model always runs.
  if (onScreen.has(stage1) || calm) {
    drawFig1(state);
    drawChart(state);
    if (window.__flowDraw) window.__flowDraw(state, dt, now / 1000);
  }
  syncControls(state);
  if (window.__fig2Draw && (onScreen.has(stage2) || calm)) window.__fig2Draw(state, dt);
  // Under reduced motion each input gives one still frame; otherwise the
  // machine runs while it is on screen.
  frame = visible && !calm ? requestAnimationFrame(tick) : 0;
}
function kick() {
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
}
queueMicrotask(() => {
  drawFig1(state);
  drawChart(state);
  syncControls(state);
  if (window.__flowDraw) window.__flowDraw(state, 1 / 60, 0);
});
