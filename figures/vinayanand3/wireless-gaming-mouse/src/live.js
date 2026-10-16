const DATA = __DATA__;
__HELPERS__;
__FILM__;
__OVERLAY__;
const $ = (id) => document.getElementById(id);
const stage = $("stage");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const START = { yaw: FIGURE.start.yaw, pitch: FIGURE.start.pitch, zoom: 1 };
// page-only channel: lift (top shell raised a modest 60 mm so it stays in frame)
const target = { ...START, apart: 0, lift: 0, ...FEATURE_DEFAULTS, rgb: 0.6 };
const drawn = { ...target };
const EASE = { yaw: 0.16, pitch: 0.16, zoom: 0.18, apart: 0.3, lift: 0.3, click: 0.06, wheel: 0.35, sideOpen: 0.3, lensDrop: 0.3, rays: 0.25, beam: 0.2, sig: 0.3, pow: 0.3, chg: 0.3, link: 0.3, labels: 0.25, rgb: 0.4, clickR: 0.06, reveal: 0.3 };
const follow = (from, to, dt, s) => (s <= 0 ? to : to + (from - to) * Math.exp(-dt / s));
const ctl = TURN.mount(stage, DATA.turn, {});
window.TURN = TURN;
const svgs = [...stage.querySelectorAll("svg")];
const live = svgs[svgs.length - 2];
const ovSvg = stage.querySelector("svg.ov");
const halo = svgs[0].querySelector(".iso-halo");
const VB = svgs[0].getAttribute("viewBox").split(" ").map(Number);
const view = { zoom: 1.3, cx: VB[2] / 2, cy: VB[3] / 2, w: VB[2] * 0.4, h: VB[3] * 0.4 };
let selected = null;
let clock = 0;
const { R: BR, D: BD, k: BK, origin: BO } = DATA.basis;
const apply = (M, p) => [M[0] * p[0] + M[1] * p[1] + M[2] * p[2], M[3] * p[0] + M[4] * p[1] + M[5] * p[2], M[6] * p[0] + M[7] * p[1] + M[8] * p[2]];
const screenOf = (w) => [BO[0] + (w[0] * BR[0] + w[1] * BR[1] + w[2] * BR[2]) * BK, BO[1] + (w[0] * BD[0] + w[1] * BD[1] + w[2] * BD[2]) * BK];
const about = (M, p) => {
  const O = DATA.origin;
  const r = apply(M, [p[0] - O[0], p[1] - O[1], p[2] - O[2]]);
  return [r[0] + O[0], r[1] + O[1], r[2] + O[2]];
};
let fitBox = null;
function frameView(dt) {
  // fit to the model's bounding box (re-measured only when it is large enough to matter), times the user's zoom
  const b = live.getBBox();
  if (!b.width) return;
  let fx = b.x + b.width / 2;
  let fy = b.y + b.height / 2;
  let fit = Math.min((VB[2] * 0.86) / b.width, (VB[3] * 0.82) / b.height);
  if (selected && drawn.zoom > 1.6) {
    const g = live.querySelector(`g[data-name="${CSS.escape(selected)}"]`);
    const sb = g && g.getBBox();
    if (sb && sb.width) {
      const k = Math.min(1, (drawn.zoom - 1.6) / 1.2);
      fx += (sb.x + sb.width / 2 - fx) * k;
      fy += (sb.y + sb.height / 2 - fy) * k;
    }
  }
  // leave side room for the label columns while leader labels are on
  fit *= 1 - (stage.clientWidth < 620 ? 0.18 : 0.36) * drawn.labels;
  const goal = { zoom: Math.min(2.4, fit) * drawn.zoom, cx: fx, cy: fy, w: b.width, h: b.height, y1: b.y + b.height };
  for (const key in goal) view[key] = dt && view[key] !== undefined ? follow(view[key], goal[key], dt, 0.22) : goal[key];
  const w = VB[2] / view.zoom;
  const h = VB[3] / view.zoom;
  const vb = `${(view.cx - w / 2).toFixed(2)} ${(view.cy - h / 2).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`;
  for (const svg of svgs) svg.setAttribute("viewBox", vb);
  halo.setAttribute("cx", view.cx.toFixed(2));
  halo.setAttribute("cy", (view.y1 + 8).toFixed(2));
  halo.setAttribute("rx", (view.w * 0.34).toFixed(2));
  halo.setAttribute("ry", (view.w * 0.034 + 2).toFixed(2));
  return w;
}
const readout = $("hud-r");
function paint(dt = 0) {
  const M = orient(drawn.yaw, drawn.pitch, 0);
  const values = featureValues(drawn, explodeValues(drawn.apart));
  if (drawn.lift > 0.001) values.top = Math.max(values.top ?? 0, 60 * drawn.lift);
  ctl.set({ root: { R: M }, ...values });
  const w = frameView(dt) ?? VB[2];
  for (const key of ["sig", "pow", "chg", "rgb"]) stage.style.setProperty("--" + key, drawn[key].toFixed(3));
  stage.style.setProperty("--flow-t", clock.toFixed(3));
  const vb = svgs[0].getAttribute("viewBox").split(" ").map(Number);
  const ovOpt = { frame: { x: vb[0], y: vb[1], w: vb[2], h: vb[3] }, compact: stage.clientWidth < 620 };
  if (drawn.labels > 0.01) { const b = live.getBBox(); if (b.width) ovOpt.box = { x: b.x, y: b.y, w: b.width, h: b.height }; }
  drawOverlay(ovSvg, drawn, values, (p) => screenOf(about(M, p)), stage.clientWidth / w, clock, ovOpt);
  const yaw = (((drawn.yaw % 360) + 360) % 360).toFixed(0);
  const text = `${drawn.apart > 0.02 ? `apart ${Math.round(drawn.apart * 100)}%` : "assembled"} · yaw ${yaw}° · pitch ${drawn.pitch.toFixed(0)}° · zoom ${drawn.zoom.toFixed(1)}×`;
  if (readout.textContent !== text) readout.textContent = text;
}
let frame = 0;
let last = 0;
let drag = null;
let anim = null;
function tick(now) {
  const dt = Math.min(0.05, last ? (now - last) / 1e3 : 0.016);
  last = now;
  clock += dt;
  if (anim) anim(dt);
  for (const key in target) drawn[key] = follow(drawn[key], target[key], dt, still.matches ? 0 : drag && (key === "yaw" || key === "pitch") ? 0.05 : EASE[key] ?? 0.25);
  paint(dt);
  const flowing = drawn.sig + drawn.pow + drawn.chg + drawn.link + drawn.rays + drawn.beam > 0.02;
  const moving = flowing || anim || drag || Object.keys(target).some((key) => Math.abs(drawn[key] - target[key]) > 0.002);
  frame = moving ? requestAnimationFrame(tick) : 0;
  if (!frame) last = 0;
}
const run = () => {
  if (!frame) frame = requestAnimationFrame(tick);
};

// ---- pointer: drag to turn, click to select, wheel / pinch to zoom
const pointers = new Map();
stage.addEventListener("pointerdown", (e) => {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  stage.setPointerCapture(e.pointerId);
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    drag = { pinch: Math.hypot(a.x - b.x, a.y - b.y), zoom: target.zoom };
  } else drag = { x: e.clientX, y: e.clientY, yaw: target.yaw, pitch: target.pitch, moved: 0, target: e.target };
  run();
});
stage.addEventListener("pointermove", (e) => {
  if (!drag || !pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (drag.pinch) {
    const [a, b] = [...pointers.values()];
    target.zoom = Math.max(0.6, Math.min(6, drag.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / drag.pinch)));
  } else {
    const w = stage.getBoundingClientRect().width;
    drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.x, e.clientY - drag.y));
    target.yaw = drag.yaw + ((e.clientX - drag.x) / w) * 300;
    target.pitch = Math.max(-80, Math.min(85, drag.pitch - ((e.clientY - drag.y) / w) * 220));
  }
  run();
});
const end = (e) => {
  pointers.delete(e.pointerId);
  if (drag && !drag.pinch && drag.moved < 4 && e.type === "pointerup") {
    const g = drag.target && drag.target.closest && drag.target.closest("g[data-name]");
    select(g ? g.dataset.name.replace(/:\d+$/, "") : null);
  }
  drag = pointers.size ? drag : null;
  run();
};
stage.addEventListener("pointerup", end);
stage.addEventListener("pointercancel", end);
stage.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    target.zoom = Math.max(0.6, Math.min(6, target.zoom * Math.exp(-e.deltaY * 0.0016)));
    run();
  },
  { passive: false },
);
stage.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  if (key === "arrowleft") target.yaw -= 15;
  else if (key === "arrowright") target.yaw += 15;
  else if (key === "arrowup") target.pitch = Math.min(85, target.pitch + 10);
  else if (key === "arrowdown") target.pitch = Math.max(-80, target.pitch - 10);
  else if (key === "+" || key === "=") target.zoom = Math.min(6, target.zoom * 1.25);
  else if (key === "-") target.zoom = Math.max(0.6, target.zoom / 1.25);
  else if (key === "a") setApart(target.apart > 0.5 ? 0 : 1);
  else if (key === "c") clickOnce();
  else if (key === "w") spin();
  else if (key === "escape") select(null);
  else return;
  e.preventDefault();
  run();
});
$("zin").onclick = () => ((target.zoom = Math.min(6, target.zoom * 1.3)), run());
$("zout").onclick = () => ((target.zoom = Math.max(0.6, target.zoom / 1.3)), run());

// ---- assembly controls
const apartIn = $("apart");
function setApart(v) {
  target.apart = v;
  apartIn.value = String(Math.round(v * 100));
  $("apart-v").textContent = `${Math.round(v * 100)}%`;
  $("b-assembled").setAttribute("aria-pressed", String(v === 0));
  $("b-exploded").setAttribute("aria-pressed", String(v === 1));
  run();
}
apartIn.addEventListener("input", () => setApart(Number(apartIn.value) / 100));
$("b-assembled").onclick = () => setApart(0);
$("b-exploded").onclick = () => setApart(1);
const toggle = (id, fn) => {
  const b = $(id);
  b.onclick = () => {
    const on = b.getAttribute("aria-pressed") !== "true";
    b.setAttribute("aria-pressed", String(on));
    fn(on);
    run();
  };
};
toggle("b-labels", (on) => (target.labels = on ? 1 : 0));
toggle("b-flank", (on) => (target.sideOpen = on ? 1 : 0));
toggle("b-lift", (on) => (target.lift = on ? 1 : 0));
toggle("b-optic", (on) => {
  target.rays = on ? 1 : 0;
  target.lensDrop = on ? 1 : 0;
  if (on && target.pitch > -10) target.pitch = -32;
});
toggle("b-link", (on) => {
  target.link = on ? 1 : 0;
  target.sig = on ? 1 : 0;
});
toggle("b-power", (on) => (target.pow = on ? 1 : 0));
toggle("b-charge", (on) => (target.chg = on ? 1 : 0));
function clickOnce() {
  let t = 0;
  target.beam = 1;
  anim = (dt) => {
    t += dt;
    const press = t < 0.12 ? t / 0.12 : t < 0.55 ? 1 : t < 0.7 ? 1 - (t - 0.55) / 0.15 : 0;
    target.click = press;
    drawn.click = press;
    if (t > 1.6) {
      anim = null;
      target.beam = $("b-flank").getAttribute("aria-pressed") === "true" ? 1 : 0;
    }
  };
  run();
}
$("b-click").onclick = clickOnce;
function spin() {
  target.wheel += 360;
  run();
}
$("b-wheel").onclick = spin;
$("b-reset").onclick = () => {
  Object.assign(target, START, { apart: 0, lift: 0, ...FEATURE_DEFAULTS, rgb: 0.6, wheel: target.wheel });
  for (const id of ["b-labels", "b-flank", "b-lift", "b-optic", "b-link", "b-power", "b-charge"]) $(id).setAttribute("aria-pressed", "false");
  setApart(0);
  highlight(null);
  select(null);
};

// ---- highlight assemblies, select parts
const partEls = () => [...live.querySelectorAll("g[data-name]")];
let hlKey = null;
function highlight(key) {
  hlKey = key;
  for (const b of document.querySelectorAll(".chip")) b.setAttribute("aria-pressed", String(b.dataset.a === key));
  applyMarks();
  run();
}
function applyMarks() {
  const dim = Boolean(hlKey || selected);
  stage.classList.toggle("dimmed", dim);
  for (const g of partEls()) {
    const base = g.dataset.name.replace(/:\d+$/, "");
    const inSel = selected && base === selected;
    const inKey = hlKey && DATA.assemblyOf[g.dataset.name] === hlKey;
    g.classList.toggle("hl", Boolean(inSel || (inKey && !selected) || (inKey && selected && inSel)));
    g.classList.toggle("sel-on", Boolean(inSel));
  }
}
for (const b of document.querySelectorAll(".chip")) b.onclick = () => highlight(hlKey === b.dataset.a ? null : b.dataset.a);
const selBox = $("sel");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
function select(name) {
  selected = name && DATA.info[name] ? name : null;
  for (const tr of document.querySelectorAll("tr[data-part]")) tr.classList.toggle("on", tr.dataset.part === selected);
  if (!selected) selBox.innerHTML = `<h2>Component</h2><p class="empty">Click any part of the mouse, or a row in the inventory below, to see what it is, what it is made of and what it does.</p>`;
  else {
    const r = DATA.info[selected];
    selBox.innerHTML = `<h2>Component · ${esc(r.assembly)}</h2><div class="name">${esc(r.label)}</div><dl><dt>Assembly</dt><dd>${esc(r.assembly)} · ${esc(r.group)}</dd><dt>Material</dt><dd>${esc(r.material)}</dd><dt>Purpose</dt><dd>${esc(r.purpose)}</dd><dt>Part</dt><dd><code>${esc(r.name)}</code></dd></dl>`;
  }
  applyMarks();
  run();
}
for (const tr of document.querySelectorAll("tr[data-part]")) {
  const pick = () => {
    select(tr.dataset.part);
    stage.scrollIntoView({ behavior: still.matches ? "auto" : "smooth", block: "center" });
  };
  tr.addEventListener("click", pick);
  tr.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), pick()));
}
window.__anatomy = { target, drawn, paint, select, highlight, setApart, set: (v) => (Object.assign(target, v), Object.assign(drawn, v), paint()) };
paint();
run();
window.ready = true;
