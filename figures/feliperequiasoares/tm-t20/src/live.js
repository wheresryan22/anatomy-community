// TM-T20: a tampa é refeita a cada quadro, girando na dobradiça; o resto é um render puro de t.
const { P, COVER_RING, COVER_X, HINGE, OPEN_MAX, ROLL, PANEL, BODY_TOP, TOP, STEPS, NAMES, STATUS, FEED, RECEIPT_LEN, PAPER_TOTAL, FEED_MAX } = DATA;
const END = STEPS[5];
const prism = makePrism(iso, pathOf, P);
const stage = document.querySelector(".tm-stage");
const svg = stage.querySelector("svg");
const readout = stage.closest(".iso-plate").querySelector("[data-readout]");
const status = stage.querySelector("[data-status]");
const replay = stage.querySelector('[data-part="replay"]');
const stepItems = [...document.querySelectorAll(".tm-steps li")];
const still = matchMedia("(prefers-reduced-motion: reduce)");
const E = {};
svg.querySelectorAll("[data-part]").forEach((el) => (E[el.dataset.part] = el));
const UP = axisVector(P, [0, 0, 1]);

const clamp = (v) => Math.min(1, Math.max(0, v));
const ramp = (x, a, b) => clamp((x - a) / (b - a));
const sm = (v) => v * v * (3 - 2 * v);
const up2 = (x, a, b) => sm(ramp(x, a, b));
const win = (x, a, b, c, d) => sm(ramp(x, a, b)) * (1 - sm(ramp(x, c, d)));
const easeOutBack = (v) => {
  const c = 1.4;
  return 1 + (c + 1) * Math.pow(v - 1, 3) + c * Math.pow(v - 1, 2);
};

// ---------- a tampa ----------
const rot = (deg) => {
  const t = (deg * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  return {
    p: (q) => [q[0], HINGE.y + (q[1] - HINGE.y) * c - (q[2] - HINGE.z) * s, HINGE.z + (q[1] - HINGE.y) * s + (q[2] - HINGE.z) * c],
    d: (v) => [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c],
  };
};
const solidSvg2 = (p, cls) =>
  `<g class="iso-solid ${cls}"><path class="iso-fill" d="${p.fill}"/>${p.shades.map((d, i) => (d ? `<path class="iso-shade" data-shade="${i}" d="${d}"/>` : "")).join("")}${p.top ? `<path class="iso-top" d="${p.top}"/>` : ""}${p.extra}${p.crease ? `<path class="iso-line iso-crease" data-tone="faint" d="${p.crease}"/>` : ""}<path class="iso-line iso-edge" data-tone="hi" d="${p.outline}"/></g>`;
const ringOf2 = (r, n = 20) => Array.from({ length: n }, (_, i) => [r * Math.cos((i / n) * Math.PI * 2), r * Math.sin((i / n) * Math.PI * 2)]);
let lastAngle = null;
function cover(deg) {
  const a = Math.round(deg * 20) / 20;
  if (a === lastAngle) return;
  lastAngle = a;
  const R = rot(a);
  const shell = prism(COVER_RING, [COVER_X[0], 0, 0], [0, 1, 0], [0, 0, 1], [COVER_X[1] - COVER_X[0], 0, 0], { map: R.p, mapDir: R.d, special: { 0: "tm-under" } });
  const sheen = pathOf([iso(R.p([COVER_X[0] + 10, PANEL.y0 - 22, TOP + 0.05]), P), iso(R.p([COVER_X[1] - 30, PANEL.y0 - 22, TOP + 0.05]), P)]);
  const seam = pathOf([iso(R.p([COVER_X[0], HINGE.y + 6, TOP + 0.05]), P), iso(R.p([COVER_X[1], HINGE.y + 6, TOP + 0.05]), P)]);
  const platen = prism(ringOf2(5, 20), [-42, PANEL.y0 - 7, BODY_TOP + 6.5], [0, 1, 0], [0, 0, 1], [84, 0, 0], { map: R.p, mapDir: R.d });
  const shellSvg = solidSvg2(shell, "blk gloss") + (a < 60 ? `<path class="tm-sheen" d="${sheen}"/><path class="iso-line blk-seam" data-tone="faint" d="${seam}"/>` : "");
  const html = a > 8 ? shellSvg + solidSvg2(platen, "blk") : solidSvg2(platen, "blk") + shellSvg;
  const target = a > 40 ? E["cover-back"] : E["cover-front"];
  const other = a > 40 ? E["cover-front"] : E["cover-back"];
  target.innerHTML = html;
  if (other.innerHTML) other.innerHTML = "";
}

function rollMarks(angle) {
  let d = "";
  for (let i = 0; i < 3; i++) {
    const t = angle + (i * Math.PI * 2) / 3;
    const p = (r) => iso([ROLL.x1 + 0.03, ROLL.y - r * Math.cos(t), ROLL.z + r * Math.sin(t)], P);
    const [x0, y0] = p(2);
    const [x1, y1] = p(8.4);
    d += "M" + x0.toFixed(1) + " " + y0.toFixed(1) + "L" + x1.toFixed(1) + " " + y1.toFixed(1);
  }
  return d;
}
const set = (el, key, value) => {
  if (el["_" + key] === value) return;
  el["_" + key] = value;
  if (key === "o") el.style.opacity = value;
  else el.setAttribute(key, value);
};
const led = (n, on) => E[n].toggleAttribute("data-on", !!on);

// ---------- o rolo: diminui com o papel gasto; a tampa aberta troca por um novo ----------
const CORE = 10.5;
const rings = [...svg.querySelectorAll("[data-ring]")];
let lastRoll = null;
function roll(left) {
  const r = Math.sqrt(CORE * CORE + (ROLL.r * ROLL.r - CORE * CORE) * Math.max(0, left / PAPER_TOTAL));
  const q = Math.round(r * 4) / 4;
  if (q === lastRoll) return;
  lastRoll = q;
  E.roll.innerHTML = solidSvg2(prism(ringOf2(q, 48), [ROLL.x0, ROLL.y, ROLL.z], [0, 1, 0], [0, 0, 1], [ROLL.x1 - ROLL.x0, 0, 0]), "tm-roll");
  rings.forEach((c) => (c.style.display = Number(c.dataset.ring) < q - 1.5 ? "" : "none"));
  const top = (x) => iso([x, ROLL.y + q * 0.8, ROLL.z + q * 0.55], P);
  const end = (x) => iso([x, PANEL.y0 - 2, BODY_TOP + 6], P);
  E["tail-fill"].setAttribute("d", pathOf([top(ROLL.x0), top(ROLL.x1), end(ROLL.x1), end(ROLL.x0)], true));
  E["tail-line"].setAttribute("d", pathOf([top(ROLL.x0), end(ROLL.x0), end(ROLL.x1), top(ROLL.x1)]));
}
let power = true;
let remaining = PAPER_TOTAL;
let lastF = 0;
let prevX = -1;
let refill = null;
let swapped = false;
let snapshot = false;
// FEED: papel em branco enquanto o botão está apertado; ao soltar, a guilhotina corta
const feed = { hold: false, min: 0, len: 0, cut: -1 };
const low = () => remaining < RECEIPT_LEN;

let angleNow = 0;
let printed = 0;
function render(t) {
  const x = t < 0 ? -1 : t;
  // 1. abrir: o botão afunda, a tampa sobe e passa um pouco antes de assentar
  const press = win(x, 0.3, 0.42, 0.55, 0.7);
  set(E["open-btn"], "transform", "translate(" + (-UP[0] * 1.2 * press).toFixed(2) + " " + (-UP[1] * 1.2 * press).toFixed(2) + ")");
  // 2. sem papel: com a tampa aberta, entra um rolo novo
  if (!snapshot) {
    if (prevX < 2.5 && x >= 2.5 && low()) {
      refill = { from: remaining };
      swapped = true;
    }
    if (refill) {
      if (x < 2.5) {
        remaining = refill.from;
        refill = null;
        swapped = false;
      } else {
        const k = up2(x, 2.5, 3.3);
        remaining = refill.from + (PAPER_TOTAL - refill.from) * k;
        if (k >= 1) refill = null;
      }
    }
  }
  prevX = x;
  const opening = ramp(x, 0.7, 1.9);
  const closing = up2(x, 4.6, 5.4) * up2(x, 4.6, 5.4);
  angleNow = OPEN_MAX * Math.min(1.04, easeOutBack(opening)) * (opening > 0 ? 1 : 0) * (1 - closing);
  cover(Math.max(0, angleNow));
  // 2. rolo à mostra e a ponta do papel sobre a cabeça térmica
  set(E["paper-tail"], "o", (up2(x, 2.0, 2.4) * (1 - up2(x, 4.9, 5.2))).toFixed(3));
  // 4. imprimir: o papel avança em passos, uma linha por vez
  let f = 0;
  for (let i = 0; i < FEED.length - 1; i++) {
    const a = 6.2 + i * 0.36;
    f += (FEED[i + 1] - FEED[i]) * up2(x, a, a + 0.24);
  }
  // 5. cortar: a lâmina acende e o cupom solto sobe um pouco
  if (!snapshot && f > lastF) remaining = Math.max(0, remaining - (f - lastF));
  lastF = f;
  const feedCut = feed.cut >= 0 && feed.cut < 0.25;
  const cut = (x >= 9.7 && x < 9.95) || feedCut;
  E.blade.toggleAttribute("data-cut", cut);
  set(E.blank, "o", feed.len > 0 ? (1 - up2(feed.cut, 0.35, 0.9)).toFixed(3) : "0");
  set(E.blank, "transform", "translate(0 " + (-(feed.len + 4 * up2(feed.cut, 0.25, 0.6))).toFixed(2) + ")");
  E.feed.toggleAttribute("data-down", feed.hold);
  roll(remaining);
  const freed = 4 * up2(x, 9.9, 10.3);
  set(E.receipt, "transform", "translate(0 " + (-(f + freed)).toFixed(2) + ")");
  set(E["roll-marks"], "d", rollMarks(f / 30 + (angleNow > 1 ? 0 : 0)));
  printed = Math.round(f);
  // LEDs: POWER com a chave; ERROR pisca com a tampa aberta; PAPER no fim do rolo
  led("led-power", power);
  led("led-error", power && angleNow > 4 && Math.floor(Math.max(0, x) * 3) % 2 === 0);
  led("led-paper", power && (low() || (feed.hold && remaining <= 0)) && !refill && angleNow < 4);
  writeReadout(t);
}

function stepOf(x) {
  if (x < 0) return -1;
  for (let i = 0; i < 5; i++) if (x < STEPS[i + 1]) return i;
  return 4;
}
let lastText = "";
let lastStep = -2;
function writeReadout(x) {
  const step = stepOf(x);
  const rollText = "rolo " + Math.round((100 * remaining) / PAPER_TOTAL) + "%";
  let text;
  if (!power) text = "desligada · ligue na chave lateral";
  else if (feed.hold || feed.len > 0) text = "FEED · " + Math.round(feed.len) + " mm em branco · " + rollText + (remaining <= 0 ? " · sem papel" : feed.cut >= 0 ? " · cortado" : " · avançando");
  else {
    const word = step < 0 || (step === 4 && x >= END - 0.001 && low()) ? (low() ? "papel no fim · toque para trocar o rolo" : step < 0 ? "pronta" : STATUS[4]) : step === 1 && swapped ? "rolo novo" : STATUS[step];
    text = ["etapa " + (step < 0 ? "–" : step + 1) + "/5", "tampa " + (angleNow > 4 ? "aberta " + Math.round(angleNow) + "°" : "fechada"), printed > 0 ? printed + " mm impressos" : "", rollText, word].filter(Boolean).join(" · ");
  }
  if (text !== lastText) {
    readout.textContent = text;
    lastText = text;
  }
  if (step !== lastStep) {
    lastStep = step;
    stepItems.forEach((li, i) => {
      li.toggleAttribute("data-on", i === step);
      li.toggleAttribute("data-done", step >= 0 && i < step);
    });
    if (step >= 0) status.textContent = "Etapa " + (step + 1) + " de 5: " + NAMES[step] + ".";
  }
  replay.toggleAttribute("data-show", power && x >= END - 0.001 && !playing && !feed.len);
}

// ---------- relógio e interação ----------
let t = -1;
let until = END;
let playing = false;
let visible = false;
let frame = 0;
let previous = 0;
let touring = !still.matches;
let tourTimer = 0;
function tick(now) {
  const dt = previous ? Math.min((now - previous) / 1000, 1 / 20) : 1 / 60;
  previous = now;
  feedTick(dt);
  if (playing) {
    t = Math.min(until, t + dt);
    if (t >= until) {
      playing = false;
      if (t >= END && touring) schedule(4200);
    }
  }
  render(t);
  frame = visible && (playing || (t >= 0 && t < END && angleNow > 4) || feedBusy()) ? requestAnimationFrame(tick) : 0;
}
const feedBusy = () => feed.hold || feed.len > 0;
function feedTick(dt) {
  if (feed.cut >= 0) {
    feed.cut += dt;
    if (feed.cut >= 0.9 || still.matches) {
      feed.len = 0;
      feed.cut = -1;
    }
    return;
  }
  const want = feed.hold || feed.len < feed.min;
  if (want && power && remaining > 0 && feed.len < FEED_MAX) {
    const d = Math.min(30 * dt, remaining, FEED_MAX - feed.len);
    feed.len += d;
    remaining -= d;
    if (remaining <= 0) feed.min = 0;
  } else if (!feed.hold && feed.len > 0) {
    feed.min = 0;
    feed.cut = 0;
  }
}
const atRest = () => !playing && (t < 0 || t >= END - 0.001) && angleNow < 4;
function feedStart() {
  if (!power || feed.hold || feed.cut >= 0 || !atRest()) return;
  takeOver();
  // o cupom anterior foi retirado; o papel novo sai em branco
  if (t >= 0) t = -1;
  lastF = 0;
  feed.hold = true;
  feed.min = remaining > 0 ? 6 : 0;
  render(t);
  run();
}
function feedStop() {
  if (!feed.hold) return;
  feed.hold = false;
  render(t);
  run();
}
function setPower(on) {
  power = on;
  E["switch-on"].style.display = on ? "" : "none";
  E["switch-off"].style.display = on ? "none" : "";
  E["io-on"].toggleAttribute("data-on", on);
  E["io-off"].toggleAttribute("data-on", !on);
  if (!on) {
    playing = false;
    feed.hold = false;
    feed.min = 0;
  } else if (t >= 0 && t < until) {
    if (still.matches) t = until;
    else playing = true;
  }
  status.textContent = on ? "Impressora ligada." : "Impressora desligada.";
  render(t);
  run();
}
function run() {
  if (!frame && visible) {
    previous = 0;
    frame = requestAnimationFrame(tick);
  }
}
function go(i, to = i === 4 ? END : STEPS[i + 1] - 0.001) {
  if (!power || feedBusy()) return;
  if (i === 0) swapped = false;
  t = still.matches ? to : STEPS[i];
  until = to;
  playing = !still.matches;
  render(t);
  run();
}
function start() {
  if (playing && t >= 0 && t < END) return;
  go(0, END);
}
function schedule(ms) {
  clearTimeout(tourTimer);
  tourTimer = setTimeout(() => {
    if (!touring || (playing && t < END)) return;
    start();
  }, ms);
}
function takeOver() {
  touring = false;
  clearTimeout(tourTimer);
  tourTimer = setTimeout(() => {
    if (still.matches) return;
    touring = true;
    if (!playing) start();
  }, 15000);
}
E.hit.addEventListener("click", () => {
  takeOver();
  if (!playing && power) start();
  stage.focus({ preventScroll: true });
});
E.hit.addEventListener("pointerenter", () => {
  takeOver();
  if (!playing && t < 0 && power && !feedBusy()) start();
});
E["hit-switch"].addEventListener("click", () => {
  takeOver();
  setPower(!power);
  stage.focus({ preventScroll: true });
});
E["hit-feed"].addEventListener("pointerdown", (event) => {
  event.preventDefault();
  try { E["hit-feed"].setPointerCapture(event.pointerId); } catch {}
  feedStart();
  stage.focus({ preventScroll: true });
});
["pointerup", "pointercancel", "lostpointercapture"].forEach((type) => E["hit-feed"].addEventListener(type, feedStop));
E["hit-feed"].addEventListener("contextmenu", (event) => event.preventDefault());
replay.addEventListener("click", () => {
  takeOver();
  start();
});
function onKey(event) {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const key = event.key.toLowerCase();
  if (key === "f") {
    event.preventDefault();
    if (!event.repeat) feedStart();
    return;
  }
  if (key === "l") {
    event.preventDefault();
    if (!event.repeat) {
      takeOver();
      setPower(!power);
    }
    return;
  }
  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
    if ((event.key === "Enter" || event.key === " ") && event.target === stage) {
      event.preventDefault();
      takeOver();
      start();
    }
    return;
  }
  event.preventDefault();
  takeOver();
  const cur = stepOf(t);
  if (event.key === "ArrowRight") {
    if (cur < 0) go(0);
    else if (t < END - 0.001) go(cur === 4 ? 4 : cur + 1);
  } else go(Math.max(0, cur < 0 ? 0 : cur - 1));
}
stage.addEventListener("keydown", onKey);
window.addEventListener("keyup", (event) => {
  if (event.key.toLowerCase() === "f") feedStop();
});
window.addEventListener("blur", feedStop);
["pointerenter", "focusin"].forEach((type) => stage.parentElement.addEventListener(type, () => (window.__isoActive = stage)));
window.addEventListener("keydown", (event) => {
  if (event.target === stage || !visible) return;
  if (window.__isoActive && window.__isoActive !== stage) return;
  const tag = event.target && event.target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON") return;
  onKey(event);
});
new IntersectionObserver(
  (entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) run();
  },
  { rootMargin: "120px 0px" },
).observe(stage);

window.__tm = { render: (x) => { touring = false; clearTimeout(tourTimer); snapshot = true; remaining = PAPER_TOTAL; t = x; playing = false; render(x); }, go, start, setPower, feedStart, feedStop, state: () => ({ power, remaining, feed: { ...feed }, t }) };
render(t);
if (touring) schedule(2600);
