const D = __DATA__;
const { P, L } = D;
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const slot = (n) => svg.querySelector(`[data-live="${n}"]`);
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const at = (p) => iso(p, P);
const f1 = (v) => v.toFixed(1);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);

// ---------- the model: every number on the page comes from here ----------
const SPEC = { dose: 9, grindRate: 1.3, puckH: 10, looseH: 18, shotMl: 40, pre: 3, brew: 9, temp: 92, sugarG: 5, augerRate: 2, milkMl: 60, milkRate: 5, steamBar: 1.2, absorb: 2 };
function plan(opt) {
  const g1 = SPEC.dose / SPEC.grindRate;               // ≈ 6.9 s grinding
  const tamp = [g1, g1 + 3], pre = [tamp[1], tamp[1] + 3], ext = [pre[1], pre[1] + 25];
  const sugar = opt.sugar ? [g1, g1 + SPEC.sugarG / SPEC.augerRate] : null;
  const milk = opt.milk ? [ext[1], ext[1] + SPEC.milkMl / SPEC.milkRate] : null;
  const eject = [ext[1] + 0.5, ext[1] + 7.5];
  const end = Math.max(eject[1], milk ? milk[1] : 0) + 0.5;
  return { grind: [0, g1], tamp, pre, ext, sugar, milk, eject, end };
}
const CH = L.chamber;
const FLOOR = CH.z0, HOME = CH.z1 - 4;
function model(t, opt, base) {
  const p = plan(opt);
  const s = { t, phase: "Ready", bar: 0, temp: SPEC.temp, ground: 0, groundsFalling: false, burr: 0, piston: HOME, flap: 0, puckZ: null, puckDrop: 0,
    water: 0, coffee: 0, milk: 0, sugar: 0, bins: base.bins, beans: base.beans, tank: base.tank, jug: base.jug, sugarLeft: base.sugarLeft, drip: base.drip,
    pump: false, heat: false, flows: {}, sugarFalling: false, milkFlow: false, coffeeFlow: false, puff: false, impeller: 0, done: t >= p.end };
  if (t < 0) return s;
  // grinding
  const gr = span(t, ...p.grind);
  s.ground = SPEC.dose * gr;
  s.beans = base.beans - SPEC.dose * gr;
  s.burr = Math.min(t, p.grind[1]) * 22.5 * Math.PI * 2 / 8;   // 1350 rpm shown at 1/8 speed
  s.groundsFalling = t > 0.4 && t < p.grind[1] + 0.4;
  if (t < p.grind[1]) s.phase = "Grinding";
  // tamping: piston from home to loose bed then compresses to puck height
  const bedTop = FLOOR + SPEC.looseH * gr;
  const tp = ease(span(t, ...p.tamp));
  s.piston = HOME + (FLOOR + SPEC.puckH - HOME) * tp;
  s.bed = Math.max(FLOOR + SPEC.puckH, Math.min(bedTop, s.piston));
  s.packed = s.piston <= bedTop + 0.01 && t >= p.tamp[0];
  if (t >= p.tamp[0] && t < p.tamp[1]) { s.phase = "Tamping"; s.tampKg = s.packed ? 20 * span(s.piston, bedTop, FLOOR + SPEC.puckH) / 1 : 0; }
  // sugar
  if (p.sugar) { const sg = span(t, ...p.sugar); s.sugar = SPEC.sugarG * sg; s.sugarLeft = base.sugarLeft - SPEC.sugarG * sg; s.sugarFalling = sg > 0 && sg < 1; s.sugarTail = t > p.sugar[1] && t < p.sugar[1] + 0.8; s.auger = (t - p.sugar[0]) * 6; }
  // pre-infusion and extraction
  if (t >= p.pre[0]) {
    s.pump = t < p.ext[1]; s.heat = s.pump;
    const preK = span(t, p.pre[0], p.pre[0] + 1.2);
    const extK = span(t, p.ext[0], p.ext[0] + 2.5);
    s.bar = t < p.ext[1] ? SPEC.pre * preK + (SPEC.brew - SPEC.pre) * extK : SPEC.brew * Math.exp(-(t - p.ext[1]) * 2.5);
    s.temp = SPEC.temp + (s.pump ? 0.6 * Math.sin(t * 1.3) : 0);
    const wet = SPEC.dose * SPEC.absorb * span(t, p.pre[0], p.ext[0] + 2);   // puck soaks 18 ml first
    const out = SPEC.shotMl * Math.max(0, span(t, p.ext[0] + 1, p.ext[1]));
    s.coffee = out; s.water = wet + out; s.tank = base.tank - s.water;
    s.coffeeFlow = t > p.ext[0] + 1 && t < p.ext[1] + 0.3;
    s.impeller = s.water * 1.6;                                        // ≈1.6 pulses per ml
    s.flows = { water: s.pump, hot: s.pump, coffee: s.coffeeFlow };
    if (t < p.ext[0]) s.phase = "Pre-infusion"; else if (t < p.ext[1]) s.phase = "Extracting";
  }
  // milk
  if (p.milk && t >= p.milk[0]) {
    const mk = span(t, ...p.milk);
    s.milk = SPEC.milkMl * mk; s.jug = base.jug - s.milk; s.milkFlow = mk > 0 && mk < 1; s.puff = s.milkFlow;
    s.heat = s.heat || s.milkFlow; s.flows.milk = s.milkFlow; s.flows.steam = s.milkFlow;
    if (s.milkFlow) { s.phase = "Frothing milk"; s.bar = SPEC.steamBar; s.temp = 65 * mk + 5 * (1 - mk); s.temp = Math.max(s.temp, 5); s.tempLabel = "milk"; }
  }
  // eject
  if (t >= p.eject[0]) {
    const e = t - p.eject[0];
    s.flap = ease(span(e, 0, 1.2)) * (1 - ease(span(e, 5.6, 6.6)));
    const push = ease(span(e, 1.2, 3));
    const ret = ease(span(e, 3.4, 5.6));
    s.piston = (FLOOR + SPEC.puckH) + (L.block.z0 - 1 - (FLOOR + SPEC.puckH)) * push;
    s.piston = s.piston + (HOME - s.piston) * ret;
    const fallT = Math.max(0, e - 3);
    s.puckZ = e < 3 ? s.piston - SPEC.puckH : Math.max(L.bin.z0 + 1 + Math.min(base.bins, 13) * 3.2, L.block.z0 - 1 - SPEC.puckH - 0.5 * 490 * fallT * fallT);   // g = 9.8 m/s² = 490 units/s²
    s.bed = null;
    if (e > 3.6) { s.puckZ = null; s.bins = base.bins + 1; }
    s.drip = base.drip + 6 * span(e, 1.2, 4); s.flows.drain = e > 1.2 && e < 4;
    if (!s.milkFlow) s.phase = e < 3.6 ? "Ejecting puck" : e < 6.6 ? "Resetting" : "Enjoy";
  }
  if (t >= p.end) s.phase = "Enjoy";
  s.end = p.end; s.plan = p;
  return s;
}

// ---------- drawing ----------
const FZ = (o) => G.frameOf(o, [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const FG = FZ([L.grinder.x, L.grinder.y, 118]);
const FC = FZ([CH.x, CH.y, 0]);
const FM = FZ([L.meter.x + L.meter.w / 2, L.meter.y + L.meter.d / 2, L.meter.z1]);
const CU = L.cup, J = L.jug, T = L.tank, SG = L.sugar, BN = L.bin, HZ = L.head;
const solid = (paths, cls, tone = "mid") => solidSvg(paths, { tone, className: cls, crease: "none" });
const beanSvg = D.beans.map(([s, x, y, rot]) => `<ellipse class="bean" data-s="${s}" cx="${x}" cy="${y}" rx="1.25" ry="0.85" transform="rotate(${rot} ${x} ${y})"/>`).join("");
slot("beans").innerHTML = beanSvg;
const beanEls = [...slot("beans").children];
const cache = {};
const dispEl = svg.querySelector("[data-live-text=display]");
function set(name, html) { if (cache[name] !== html) { cache[name] = html; slot(name).innerHTML = html; } }
function draw(s) {
  // beans: level in the hopper falls with every gram ground (≈ 2.3 g per mm of hopper height here)
  const level = 64.5 + 36 * clamp(s.beans / D.capacity, 0, 1);
  if (cache.level !== Math.round(level * 4)) { cache.level = Math.round(level * 4); beanEls.forEach((b) => b.toggleAttribute("hidden", +b.dataset.s > level)); }
  set("burr", Ln(G.ribsOf(FG, 41, 46, 9.5, 14, P, { phase: s.burr, r1: 7 }), "lo"));
  // chamber: loose grounds, puck, piston and rod, trap door
  let ch = "";
  const flapY = CH.y, flapX = CH.x - CH.r;
  const ang = s.flap * Math.PI / 2;
  if (s.bed != null && s.ground > 0.05) {
    const h = s.bed - FLOOR;
    ch += solid(G.disc(FLOOR, FLOOR + h, CH.r - 0.3, FC, P, { steps: 40 }), s.packed && h <= SPEC.puckH + 0.2 && s.t > 1 ? "puck" : "grounds");
  }
  if (s.groundsFalling) {
    let dots = "";
    for (let i = 0; i < 9; i++) { const ph = ((s.t * 1.7 + i / 9) % 1); const z = 132 - ph * (132 - (s.bed ?? FLOOR)); dots += `<circle class="bc-dot" cx="${at([CH.x - 8 + (i % 3) * 1.4, CH.y + 2 - (i % 2) * 2, z])[0].toFixed(1)}" cy="${at([CH.x - 8 + (i % 3) * 1.4, CH.y + 2 - (i % 2) * 2, z])[1].toFixed(1)}" r="0.55"/>`; }
    ch += dots;
  }
  const BZ1 = L.block.z1;
  const BZ0 = L.block.z0;
  if (s.puckZ != null && s.puckZ + SPEC.puckH > BZ0 + 0.2) ch += solid(G.disc(Math.max(s.puckZ, BZ0), s.puckZ + SPEC.puckH, CH.r - 0.3, FC, P, { steps: 40 }), "puck");
  ch += solidSvg(G.disc(s.piston, s.piston + 4, CH.r - 0.2, FC, P, { steps: 40 }), { tone: "hi", lit: true });
  ch += solidSvg(G.disc(s.piston + 4, CH.z1 + 20, 2, FC, P, { steps: 16 }), { tone: "hi", lit: true, crease: "none" });
  set("chamber", ch);
  // waste bin: stack of spent pucks, plus a falling one
  let bin = "";
  if (s.flap > 0.01) {
    const hinge = [CH.x - CH.r, CH.y - CH.r, L.block.z0];
    bin += `<path class="iso-line bc-flap" data-tone="hi" d="${pathOf([at(hinge), at([hinge[0] + 2 * CH.r * Math.cos(ang), hinge[1], hinge[2] - 2 * CH.r * Math.sin(ang)]), at([hinge[0] + 2 * CH.r * Math.cos(ang), hinge[1] + 2 * CH.r, hinge[2] - 2 * CH.r * Math.sin(ang)]), at([hinge[0], hinge[1] + 2 * CH.r, hinge[2]])], true)}"/>`;
  }
  const FB = FZ([BN.x + BN.w / 2, BN.y + BN.d / 2, 0]);
  for (let i = 0; i < Math.min(s.bins, 14); i++) { const z = BN.z0 + 1 + i * 3.2; const off = ((i * 37) % 7) - 3; bin += solid(G.disc(z, z + 3.2, CH.r - 1.5, FZ([BN.x + BN.w / 2 + off, BN.y + BN.d / 2 + (((i * 53) % 5) - 2), 0]), P, { steps: 32 }), "puck"); }
  if (s.puckZ != null && s.puckZ < L.block.z0 - 0.2) bin += solid(G.disc(s.puckZ, Math.min(s.puckZ + SPEC.puckH, L.block.z0), CH.r - 0.3, FZ([CH.x, CH.y, 0]), P, { steps: 40 }), "puck");
  set("bin", bin);
  // water tank level
  const wz = 15 + (T.z1 - 20) * clamp(s.tank / D.tankMl, 0, 1);
  set("water", solid(slabOf({ x: T.x + 0.8, y: T.y + 0.8, w: T.w - 1.6, d: T.d - 1.6, r: 2 }, 15, wz - 15, P, 3), "liq-water"));
  set("impeller", Ln(G.spokesOf(FM, 1.05, 0.8, 4, 6, P, { phase: s.impeller, sweep: 0.5 }), "mid"));
  // cup: coffee, then milk foam on top; sugar dissolves
  let cup = "";
  const FCU = FZ([CU.x, CU.y, CU.z0]);
  const mlPerUnit = 3.1;   // cup inner area ≈ π·9² units² → 1 unit of height ≈ 3.1 ml at this scale
  const hc = s.coffee / mlPerUnit, hm = s.milk / mlPerUnit;
  if (hc > 0.1) cup += solid(G.disc(1, 1 + hc, CU.r - 1.3, FCU, P, { steps: 40 }), "liq-coffee");
  if (hm > 0.1) cup += solid(G.disc(1 + hc, 1 + hc + hm, CU.r - 1.1, FCU, P, { steps: 40 }), "liq-milk");
  set("cup", cup);
  const top = CU.z0 + 1 + hc + hm;
  let st = "";
  const line = (a, b, cls, w) => `<path class="${cls}" d="${pathOf([at(a), at(b)])}" style="stroke-width:${w}"/>`;
  if (s.coffeeFlow) st += line([16, 40, L.head.z0 - 6], [16, 40, top], "stream-coffee", 1.1);
  if (s.milkFlow) st += line([30, 40, L.head.z0 - 6], [30, 40, top], "stream-milk", 1.8);
  let fun = "";
  if (s.sugarFalling || s.sugarTail) {
    const dot = (p) => { const q = at(p); return `<circle class="bc-sugar-dot" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="0.65"/>`; };
    for (let i = 0; i < 12; i++) {
      const ph = (s.t * 1.6 + i / 12) % 1;
      const jx = ((i * 7) % 5 - 2) * 0.35, jy = ((i * 3) % 5 - 2) * 0.35;
      if (s.sugarFalling) fun += dot([SG.out + jx, SG.y + jy, SG.z - 9 - ph * (SG.z - 9 - HZ.z1 - 2)]);         // spigot -> funnel
      st += dot([24 + jx * 0.6, 44 + jy * 0.6, HZ.z0 - 4 - ph * (HZ.z0 - 4 - top)]);                                // sugar nozzle -> cup
    }
    if (s.sugarFalling) for (let i = 0; i < 6; i++) fun += dot([SG.out + ((i % 3) - 1) * 1.6, SG.y + ((i * 2) % 3 - 1) * 1.6, HZ.z1 + 1.5 + (i % 2)]);
  }
  set("funnel", fun);
  if (s.puff) { for (let i = 0; i < 5; i++) { const ph = (s.t * 0.9 + i / 5) % 1; const p = at([30 + ph * 3, 40, L.head.z0 - 4 - ph * 6]); st += `<circle class="bc-puff" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${(1 + ph * 3).toFixed(1)}" fill-opacity="${(0.25 * (1 - ph)).toFixed(2)}"/>`; } }
  set("streams", st);
  // milk jug and sugar hopper levels
  const FJ = FZ([J.x, J.y, J.z0]);
  set("milk", solid(G.disc(1, 1 + (J.z1 - J.z0 - 4) * clamp(s.jug / D.jugMl, 0, 1), J.r - 1, FJ, P, { steps: 40 }), "liq-milk"));
  const FS = FZ([SG.hop, SG.y, SG.z + 5]);
  const sl = 2 + 24 * clamp(s.sugarLeft / D.sugarG, 0, 1);
  set("sugar", solid(G.solidOf([[0.5, 3.4], [6, 4.4], [16, 10.2], [sl, Math.min(11.2, 4.4 + (sl - 6) * 0.58)]].filter((q, i, a) => i === 0 || q[0] > a[i - 1][0]), FS, P, {}), "sugar"));
  // auger flights
  const FAg = G.frameOf([SG.x0, SG.y, SG.z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const len = SG.x1 - SG.x0;
  set("auger", Ln(G.ribsOf(FAg, 0, len, 3.6, 3, P, { phase: s.auger || 0, twist: len / 4, least: -1 }), "mid") + Ln(G.ribsOf(FAg, 0, len, 0.8, 1, P, {}), "mid") + Ln(G.circleOf(FAg, 0.05, 3.6, P, 32) + G.circleOf(FAg, len - 0.05, 3.6, P, 32) + G.circleOf(FAg, 0.05, 0.8, P, 12) + G.circleOf(FAg, len - 0.05, 0.8, P, 12), "lo"));
  // drip tray float shows the waste water level
  const fz = L.tray.z1 + 1.5 * clamp(s.drip / 120, 0, 1) + 0.6;
  set("drip", solidSvg(cylinder(L.tray.x + L.tray.w - 6, L.tray.y + L.tray.d - 5, 2, L.tray.z1 - 0.4, fz - L.tray.z1 + 1.4, P, 20), { tone: "hi", lit: true }));
  // flows and states
  svg.style.setProperty("--bc-rate", (0.6 / speed).toFixed(3) + "s");
  for (const [k, on] of Object.entries({ drain: s.flows.drain, water: s.flows.water, hot: s.flows.hot, coffee: s.flows.coffee, milk: s.flows.milk, steam: s.flows.steam, pump: s.pump, heat: s.heat })) svg.toggleAttribute(`data-${k}`, !!on && !still.matches || (!!on && still.matches));
  // readout
  const parts = [s.phase, `${f1(s.bar)} bar`, `${Math.round(s.temp)} °C`];
  if (s.t > 0) { if (s.water < 0.5) parts.push(`${f1(s.ground)} g ground`); else parts.push(`cup ${Math.round(s.coffee + s.milk)} ml`); parts.push(`${Math.round(Math.min(s.t, s.end))} s`); }
  if (s.tempLabel) parts[2] = `milk ${Math.round(s.temp)} °C`;
  const disp = s.t < 0 ? "READY" : ({ Grinding: "GRIND", Tamping: "TAMP", "Pre-infusion": "PRE-INF", Extracting: "BREW 9BAR", "Frothing milk": "MILK", "Ejecting puck": "EJECT", Resetting: "RINSE", Enjoy: "ENJOY", Ready: "READY" }[s.phase] || "READY");
  if (dispEl.textContent !== disp) dispEl.textContent = disp;
  const text = parts.join(" · ");
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", text);
}
function Ln(d, tone) { return d ? `<path class="iso-line" data-tone="${tone}" d="${d}"/>` : ""; }

// ---------- run ----------
D.capacity = 250; D.tankMl = 1800; D.jugMl = 500; D.sugarG = 300;
const base = { bins: 3, beans: 210, tank: 1500, jug: 420, sugarLeft: 240, drip: 30 };
const opt = { milk: false, sugar: false };
let t = -1, running = false, speed = 1, frame = 0, last = 0, visible = false, tour = true, tourWait = 1.2, current = null;
const brewBtn = document.querySelector('[data-act="brew"]');
function finish() { if (!current) return; Object.assign(base, { bins: current.bins, beans: current.beans, tank: current.tank < 300 ? 1500 : current.tank, jug: current.jug < 80 ? 420 : current.jug, sugarLeft: current.sugarLeft < 20 ? 240 : current.sugarLeft, drip: current.drip > 110 ? 20 : current.drip }); if (base.bins >= 12) base.bins = 0; if (base.beans < 30) base.beans = 210; }
function start() { if (running) return; t = 0; running = true; brewBtn.toggleAttribute("data-busy", true); kick(); }
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60; last = now;
  if (running) {
    t += dt * speed;
    current = model(t, opt, base);
    if (current.done) { draw(current); finish(); running = false; brewBtn.removeAttribute("data-busy"); tourWait = 4; }
    else draw(current);
  } else if (tour) { tourWait -= dt * speed; if (tourWait <= 0) start(); }
  frame = visible && (running || tour) ? requestAnimationFrame(tick) : 0;
}
function kick() { if (!frame && visible && !still.matches) { last = 0; frame = requestAnimationFrame(tick); } }
const user = () => { tour = false; };
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) kick(); }, { rootMargin: "120px 0px" }).observe(stage);
function setSpeed(v) { speed = v; document.querySelectorAll("[data-speed]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.speed === v))); }
function toggle(name) { opt[name] = !opt[name]; document.querySelector(`[data-act="${name}"]`).setAttribute("aria-pressed", String(opt[name])); if (!running) draw(model(-1, opt, base)); }
document.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", () => { user(); const a = b.dataset.act; if (a === "brew") start(); else toggle(a); }));
document.querySelectorAll("[data-speed]").forEach((b) => b.addEventListener("click", () => setSpeed(+b.dataset.speed)));
stage.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  if (key === " " || key === "enter") { e.preventDefault(); user(); start(); }
  else if (key === "m") { user(); toggle("milk"); }
  else if (key === "s") { user(); toggle("sugar"); }
  else if (key === "1" || key === "2" || key === "5") setSpeed(+key);
});
if (still.matches) {
  // one still pose: mid-extraction, with milk and sugar shown as options
  tour = false;
  const p = plan(opt);
  draw(model((p.ext[0] + p.ext[1]) / 2, opt, base));
} else draw(model(-1, opt, base));
