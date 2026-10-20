
const D = __DATA__;
const PJ = D.P;
const NS = "http://www.w3.org/2000/svg";
const stage = document.querySelector(".dj-stage");
const svg = stage.querySelector("svg");
const flowLayer = svg.querySelector(".dj-flow");
const calloutLayer = svg.querySelector(".dj-callouts");
const tip = stage.querySelector(".dj-tip");
const startBox = stage.querySelector(".dj-start");
const clockEl = document.querySelector("[data-clock]");
const list = document.querySelector(".dj-list");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const narrow = matchMedia("(max-width: 720px)");
const $ = (sel, root = svg) => root.querySelector(sel);
const $$ = (sel, root = svg) => [...root.querySelectorAll(sel)];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const el = (name, attrs = {}, parent) => {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  if (parent) parent.appendChild(node);
  return node;
};

let E = null;
let started = false;
const controls = new Map(D.controls.map((c) => [c.id, { ...c }]));
const nodeOf = (id) => $(`[data-ctl="${id}"]`);
const deckState = [0, 1].map(() => ({ browse: true, sel: 0, jogAngle: 0 }));
const RANGES = [0.06, 0.1, 0.16];

// ---------- value text and what each control does ----------
function fmt(c) {
  const v = c.value;
  if (c.key === "trim") return `${(-12 + v * 21).toFixed(1)} dB`;
  if (["hi", "mid", "low"].includes(c.key)) {
    if (v <= 0.02) return "kill";
    const db = v < 0.5 ? -26 * Math.pow(1 - v / 0.5, 1.4) : 6 * ((v - 0.5) / 0.5);
    return `${db >= 0 ? "+" : ""}${db.toFixed(1)} dB`;
  }
  if (c.key === "color") return Math.abs(v) < 0.02 ? "off" : `${E ? E.mixer.state.color : ""} ${v < 0 ? "◀" : "▶"} ${Math.round(Math.abs(v) * 100)}%`;
  if (c.id.startsWith("tempo")) {
    const range = E ? E.decks[c.deck].range : 0.1;
    return `${v * range >= 0 ? "+" : ""}${(v * range * 100).toFixed(2)}%`;
  }
  if (c.id === "xfader") return Math.abs(v) < 0.03 ? "centre" : v < 0 ? `A ${Math.round(-v * 100)}%` : `B ${Math.round(v * 100)}%`;
  if (c.id === "master") return v <= 0.01 ? "off" : `${(-30 + v * 36).toFixed(1)} dB`;
  if (c.id === "fxselect") return E ? E.beatFx.LIST[Math.round(v)] : "";
  if (c.kind === "switch3") return c.options[c.value];
  return `${Math.round(v * 100)}%`;
}
function apply(c) {
  if (!E) return;
  const v = c.value;
  if (c.ch && c.key) E.mixer.set(c.ch, c.key, v);
  else if (c.id.startsWith("fader-")) E.mixer.set(c.ch, "fader", v);
  else if (c.id === "xfader") E.mixer.setXfader(v);
  else if (c.id === "master") E.mixer.setMaster(v);
  else if (c.id === "booth") E.mixer.setBooth(v);
  else if (c.id === "depth") E.beatFx.depth(v);
  else if (c.id === "fxselect") E.beatFx.select(E.beatFx.LIST[Math.round(v)]);
  else if (c.id.startsWith("tempo-")) E.setTempo(c.deck, v * E.decks[c.deck].range);
  else if (c.kind === "switch3") E.mixer.set(c.ch, "assign", c.options[c.value]);
}
const SPAN = 1.5 * Math.PI;
function drawControl(c) {
  const node = nodeOf(c.id);
  if (!node) return;
  if (c.kind === "knob") {
    const t = (c.value - c.min) / (c.max - c.min);
    const a = -0.75 * Math.PI + t * SPAN;
    const s = Math.sin(a);
    const co = Math.cos(a);
    $(`[data-pointer="${c.id}"]`).setAttribute("d", lineOnTop([c.x + s * c.r * 0.2, c.y - co * c.r * 0.2], [c.x + s * c.r * 0.92, c.y - co * c.r * 0.92], c.z + 0.05, PJ));
    node.toggleAttribute("data-moved", Math.abs(c.value - c.def) > 0.02);
  } else if (c.kind === "fader") {
    const t = (c.value - c.min) / (c.max - c.min);
    const off = (c.invert ? 1 - 2 * t : 2 * t - 1) * c.len;
    $(`[data-move="${c.id}"]`).setAttribute("transform", translateAlong(PJ, [c.axis[0] * off, c.axis[1] * off, 0]));
  } else if (c.kind === "switch3") {
    $(`[data-move="${c.id}"]`).setAttribute("transform", translateAlong(PJ, [(c.value - 1) * c.step, 0, 0]));
  }
  if (["knob", "fader", "switch3"].includes(c.kind)) {
    node.setAttribute("aria-valuetext", fmt(c));
    node.setAttribute("aria-valuenow", String(Math.round(c.value * 100) / 100));
  }
}
let tipTimer = 0;
function showTip(text, near, ms = 1400) {
  tip.textContent = text;
  tip.dataset.show = "";
  const host = stage.getBoundingClientRect();
  if (near) {
    const box = near.getBoundingClientRect();
    tip.style.left = `${clamp(box.left + box.width / 2 - host.left, 90, host.width - 90)}px`;
    tip.style.top = `${clamp(box.top - host.top - 36, 6, host.height - 40)}px`;
  } else {
    tip.style.left = "50%";
    tip.style.top = "10px";
  }
  clearTimeout(tipTimer);
  tipTimer = setTimeout(() => delete tip.dataset.show, ms);
}
function setValue(c, v, say = true) {
  c.value = c.steps ? clamp(Math.round(v), c.min, c.max) : clamp(v, c.min, c.max);
  apply(c);
  drawControl(c);
  if (say) showTip(`${c.label} · ${fmt(c)}`, nodeOf(c.id), 900);
}
function toPlane(dx, dy) {
  const [ax, ay] = D.EX;
  const [bx, by] = D.EY;
  const det = ax * by - bx * ay;
  return [(dx * by - bx * dy) / det, (ax * dy - dx * ay) / det];
}
function svgPoint(event) {
  const p = svg.createSVGPoint();
  p.x = event.clientX;
  p.y = event.clientY;
  return p.matrixTransform(svg.getScreenCTM().inverse());
}

// ---------- buttons ----------
const side = (d) => (d ? "Right" : "Left");
function press(c, node, event) {
  if (!E) return;
  const d = c.deck;
  const deck = d !== undefined ? E.decks[d] : null;
  const needTrack = () => {
    if (deck.track === null) {
      showTip(`${side(d)} player: load a track from the screen first`, nodeOf(`screen-${d}`), 1800);
      return true;
    }
    return false;
  };
  switch (c.act) {
    case "browse":
      deckState[d].browse = !deckState[d].browse;
      break;
    case "play":
      if (needTrack()) break;
      E.playPause(d);
      showTip(deck.playing ? "Pauses on the next beat" : "Starts on the next bar", node);
      break;
    case "cue": {
      if (needTrack()) break;
      const r = E.cue(d);
      showTip(r === "set" ? "Cue point set here" : "Back to the cue point on the next beat", node);
      break;
    }
    case "hot": {
      if (needTrack()) break;
      if (event && event.shiftKey) {
        E.clearHotCue(d, c.pad);
        showTip(`Hot cue ${"ABCDEFGH"[c.pad]} cleared`, node);
        break;
      }
      const r = E.hotCue(d, c.pad);
      showTip(r === "saved" ? `Hot cue ${"ABCDEFGH"[c.pad]} saved · tap again to jump` : `Jump to ${"ABCDEFGH"[c.pad]} on the next beat`, node, 1600);
      break;
    }
    case "loopin":
      if (needTrack()) break;
      E.loopIn(d);
      showTip("Loop In set · press OUT to close the loop", node, 1600);
      break;
    case "loopout": {
      if (needTrack()) break;
      const r = E.loopOut(d);
      showTip(r === "noin" ? "Press IN first" : "Looping", node);
      break;
    }
    case "reloop": {
      if (needTrack()) break;
      const r = E.reloop(d);
      showTip(r === "none" ? "No loop yet: try 4 BEAT" : r === "on" ? "Reloop" : "Loop exit", node);
      break;
    }
    case "beat4":
    case "beat8": {
      if (needTrack()) break;
      const len = E.beatLoop(d, c.act === "beat4" ? "half" : "double");
      showTip(`${len}-beat loop`, node);
      break;
    }
    case "jump":
      if (needTrack()) break;
      E.beatJump(d, c.dir);
      showTip(`Beat jump ${c.dir > 0 ? "+" : "−"}${deck.jumpBeats} beats`, node);
      break;
    case "range": {
      const next = RANGES[(RANGES.indexOf(deck.range) + 1) % RANGES.length];
      E.setRange(d, next);
      const t = controls.get(`tempo-${d}`);
      apply(t);
      drawControl(t);
      showTip(`Tempo range ±${Math.round(next * 100)}%`, node);
      break;
    }
    case "mt":
      E.setMt(d, !deck.mt);
      showTip(deck.mt ? "Master Tempo on: the key stays put" : "Master Tempo off: pitch follows tempo", node, 1800);
      break;
    case "sync":
      E.setSync(d, !deck.sync);
      showTip(deck.sync ? (deck.master ? "Sync on · this deck is the master" : "Sync on · following the master deck") : "Sync off", node, 1600);
      break;
    case "master":
      E.setMaster(d);
      showTip(`${side(d)} player is the tempo master`, node);
      break;
    case "chcue": {
      const ms = E.mixer.cue(c.ch);
      node.dataset.on = "";
      setTimeout(() => delete node.dataset.on, ms);
      showTip(`Channel ${c.ch} alone for two bars, as heard in the headphones`, node, 2200);
      break;
    }
    case "color":
      E.mixer.setColor(c.fx);
      [2, 3].forEach((n) => drawControl(controls.get(`color-${n}`)));
      showTip(`Color FX: ${c.fx} · turn a channel's Color knob`, node, 1800);
      break;
    case "fxbeat":
      E.beatFx.beat(E.beatFx.state.beat + c.dir);
      break;
    case "fxch": {
      const src = c.src === "2" ? 2 : c.src === "3" ? 3 : c.src === "MST" ? "MASTER" : c.src;
      E.beatFx.source(src);
      if (!["2", "3", "MST"].includes(c.src)) showTip(`Nothing is plugged into ${c.src} in this booth`, node, 1800);
      break;
    }
    case "fxon":
      E.beatFx.toggle();
      showTip(`Beat FX ${E.beatFx.state.on ? "on" : "off"} · ${E.beatFx.state.type}`, node);
      break;
  }
  refresh();
}

// ---------- the players' screens ----------
const screens = [0, 1].map((d) => {
  const g = $(`[data-screen="${d}"]`);
  return { g, ui: g.querySelector(".dj-screen-ui"), built: null };
});
const SW = D.screen.w;
const SH = D.screen.d;
function screenLocal(d, event) {
  const m = screens[d].g.getScreenCTM().inverse();
  const p = svg.createSVGPoint();
  p.x = event.clientX;
  p.y = event.clientY;
  return p.matrixTransform(m);
}
function buildBrowse(d) {
  const s = screens[d];
  s.ui.innerHTML = "";
  el("text", { class: "dj-scr-head", x: 6, y: 11, "font-size": 8 }, s.ui).textContent = `BROWSE · ${E.TRACKS.length} TRACKS`;
  el("text", { class: "dj-scr-dim", x: SW - 6, y: 11, "font-size": 7, "text-anchor": "end" }, s.ui).textContent = "124 BPM · A minor";
  E.TRACKS.forEach((t, i) => {
    const y = 16 + i * 13.4;
    const row = el("g", { class: "dj-row" }, s.ui);
    el("rect", { x: 3, y, width: SW - 6, height: 12.4, rx: 1.5 }, row);
    el("text", { x: 8, y: y + 9, "font-size": 7.5, class: "dj-row-n" }, row).textContent = String(i + 1).padStart(2, "0");
    el("text", { x: 24, y: y + 9, "font-size": 8, class: "dj-row-t" }, row).textContent = t.title;
    el("text", { x: SW - 8, y: y + 9, "font-size": 7, class: "dj-row-g", "text-anchor": "end" }, row).textContent = t.genre;
  });
  s.built = "browse";
}
function buildDeck(d) {
  const s = screens[d];
  s.ui.innerHTML = "";
  const p = {};
  p.title = el("text", { class: "dj-scr-head", x: 6, y: 11, "font-size": 9 }, s.ui);
  p.info = el("text", { class: "dj-scr-dim", x: SW - 6, y: 11, "font-size": 7.5, "text-anchor": "end" }, s.ui);
  el("rect", { class: "dj-wf-bg", x: 0, y: 16, width: SW, height: 62 }, s.ui);
  p.loop = el("rect", { class: "dj-wf-loop", x: 0, y: 16, width: 0, height: 62 }, s.ui);
  p.low = el("path", { class: "dj-wf-low" }, s.ui);
  p.mid = el("path", { class: "dj-wf-mid" }, s.ui);
  p.high = el("path", { class: "dj-wf-high" }, s.ui);
  p.grid = el("path", { class: "dj-wf-grid" }, s.ui);
  p.bars = el("path", { class: "dj-wf-bar" }, s.ui);
  p.cues = el("g", {}, s.ui);
  el("path", { class: "dj-wf-head", d: `M${SW / 2} 16V78` }, s.ui);
  el("rect", { class: "dj-ov-bg", x: 4, y: 84, width: SW - 8, height: 22, rx: 1 }, s.ui);
  p.ov = el("path", { class: "dj-ov" }, s.ui);
  p.ovPlayed = el("rect", { class: "dj-ov-played", x: 4, y: 84, width: 0, height: 22 }, s.ui);
  p.ovHead = el("path", { class: "dj-ov-head" }, s.ui);
  p.ovCues = el("g", {}, s.ui);
  p.status = el("text", { class: "dj-scr-dim", x: 6, y: 119, "font-size": 7.5 }, s.ui);
  p.jump = el("text", { class: "dj-scr-key", x: SW / 2, y: 119, "font-size": 7.5, "text-anchor": "middle" }, s.ui);
  p.time = el("text", { class: "dj-scr-dim", x: SW - 6, y: 119, "font-size": 7.5, "text-anchor": "end" }, s.ui);
  s.parts = p;
  s.built = "deck";
  s.track = null;
}
function drawOverview(d) {
  const s = screens[d];
  const wave = E.waves[E.decks[d].track];
  const n = wave.length / 4;
  const w = (SW - 8) / n;
  let path = "";
  for (let b = 0; b < n; b++) {
    const e = Math.max(...wave.slice(b * 4, b * 4 + 4).map((v) => v[0] * 0.7 + v[1] * 0.3 + v[2] * 0.2));
    const h = Math.max(0.6, e * 10);
    path += `M${(4 + b * w).toFixed(2)} ${(95 - h).toFixed(2)}h${w.toFixed(2)}v${(2 * h).toFixed(2)}h${(-w).toFixed(2)}Z`;
  }
  s.parts.ov.setAttribute("d", path);
  s.track = E.decks[d].track;
}
function drawScreen(d) {
  const s = screens[d];
  const deck = E.decks[d];
  const browse = deckState[d].browse || deck.track === null;
  if (browse) {
    if (s.built !== "browse") buildBrowse(d);
    [...s.ui.querySelectorAll(".dj-row")].forEach((row, i) => {
      row.toggleAttribute("data-on", i === deck.track);
      row.toggleAttribute("data-sel", i === deckState[d].sel);
    });
    return;
  }
  if (s.built !== "deck") buildDeck(d);
  if (s.track !== deck.track) drawOverview(d);
  const p = s.parts;
  const track = E.TRACKS[deck.track];
  const wave = E.waves[deck.track];
  const pos = deck.pos;
  const bpm = E.bpmOf(deck) * (1 + deck.nudge);
  p.title.textContent = `${track.title} · ${track.genre}`;
  const pct = (bpm / E.BPM - 1) * 100;
  p.info.textContent = `${bpm.toFixed(1)} BPM  ${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%  ±${Math.round(deck.range * 100)}${deck.mt ? "  MT" : ""}`;
  // scrolling waveform: two bars either side of the playhead, the beat grid over it
  const span = 64;
  const px = SW / span;
  let low = "";
  let mid = "";
  let high = "";
  for (let i = -span / 2; i < span / 2; i++) {
    const step = Math.floor(pos) + i;
    if (step < 0 || step >= wave.length) continue;
    const [l, m, h] = wave[step];
    const x = (SW / 2 + i * px).toFixed(2);
    const w = (px * 0.8).toFixed(2);
    const bar = (v, scale) => `M${x} ${(47 - v * scale).toFixed(2)}h${w}v${(2 * v * scale).toFixed(2)}h-${w}Z`;
    low += bar(l, 26);
    mid += bar(m, 17);
    high += bar(h, 9);
  }
  p.low.setAttribute("d", low);
  p.mid.setAttribute("d", mid);
  p.high.setAttribute("d", high);
  let grid = "";
  let bars = "";
  for (let i = -span / 2; i <= span / 2; i++) {
    const step = Math.floor(pos) + i;
    if (step % 4 !== 0 || step < 0) continue;
    const x = (SW / 2 + i * px).toFixed(2);
    if (step % 16 === 0) bars += `M${x} 16V78`;
    else grid += `M${x} 16V21M${x} 73V78`;
  }
  p.grid.setAttribute("d", grid);
  p.bars.setAttribute("d", bars);
  if (deck.loop.in !== null && deck.loop.out !== null) {
    const x0 = clamp(SW / 2 + (deck.loop.in - pos) * px, 0, SW);
    const x1 = clamp(SW / 2 + (deck.loop.out - pos) * px, 0, SW);
    p.loop.setAttribute("x", x0.toFixed(1));
    p.loop.setAttribute("width", Math.max(0, x1 - x0).toFixed(1));
    p.loop.toggleAttribute("data-on", deck.loop.on);
  } else p.loop.setAttribute("width", 0);
  let cues = "";
  let ovCues = "";
  deck.hot.forEach((h, i) => {
    if (h === null) return;
    const x = SW / 2 + (h - pos) * px;
    if (x > 0 && x < SW) cues += `<path class="dj-wf-cue" d="M${x.toFixed(1)} 16V78"/><text class="dj-wf-cuet" x="${(x + 1.5).toFixed(1)}" y="24" font-size="7">${"ABCDEFGH"[i]}</text>`;
    ovCues += `<path class="dj-wf-cue" d="M${(4 + (h / wave.length) * (SW - 8)).toFixed(1)} 84V106"/>`;
  });
  if (p.cues._v !== cues) p.cues.innerHTML = p.cues._v = cues;
  if (p.ovCues._v !== ovCues) p.ovCues.innerHTML = p.ovCues._v = ovCues;
  const hx = 4 + (pos / wave.length) * (SW - 8);
  p.ovPlayed.setAttribute("width", Math.max(0, hx - 4).toFixed(1));
  p.ovHead.setAttribute("d", `M${hx.toFixed(1)} 82V108`);
  p.status.textContent = `${deck.playing ? "▶" : "❚❚"} ${Math.floor(pos / 16) + 1}.${Math.floor((pos % 16) / 4) + 1}${deck.loop.on ? `  LOOP ${(deck.loop.out - deck.loop.in) / 4}` : ""}`;
  p.jump.textContent = `JUMP ${deck.jumpBeats} ›`;
  const remain = ((wave.length - pos) / 4) * (60 / bpm);
  p.time.textContent = `−${Math.floor(remain / 60)}:${String(Math.floor(remain % 60)).padStart(2, "0")}`;
}
function screenPress(d, event) {
  const deck = E.decks[d];
  const pt = screenLocal(d, event);
  const browse = deckState[d].browse || deck.track === null;
  if (browse) {
    const i = Math.floor((pt.y - 16) / 13.4);
    if (pt.y >= 16 && i >= 0 && i < E.TRACKS.length) {
      deckState[d].sel = i;
      E.load(d, i);
      deckState[d].browse = false;
      showTip(`${E.TRACKS[i].title} loaded${deck.playing ? " · takes over on the next bar" : " · press PLAY"}`, nodeOf(`play-${d}`), 2000);
    }
  } else if (pt.y >= 82 && pt.y <= 108) {
    const f = clamp((pt.x - 4) / (SW - 8), 0, 0.999);
    E.needle(d, f);
    showTip(`Needle search to bar ${Math.floor(f * E.BARS) + 1}`, nodeOf(`screen-${d}`), 1200);
  } else if (pt.y > 110 && Math.abs(pt.x - SW / 2) < 30) {
    const next = { 4: 8, 8: 16, 16: 32, 32: 4 }[deck.jumpBeats];
    E.setJump(d, next);
    showTip(`Beat jump: ${next} beats`, nodeOf(`screen-${d}`), 1200);
  } else if (pt.y < 14) deckState[d].browse = true;
  refresh();
}

// ---------- wiring every control ----------
function ready(event) {
  if (narrow.matches && zoomed === null) {
    zoomAt(event);
    return false;
  }
  return started;
}
function k_planOutline(plan, z) {
  return planOutline(plan, z, PJ, 2);
}
for (const c of controls.values()) {
  const node = nodeOf(c.id);
  if (!node) continue;
  drawControl(c);
  if (c.kind === "knob" || c.kind === "fader" || c.kind === "switch3") {
    let start = null;
    node.addEventListener("pointerdown", (event) => {
      if (!ready(event)) return;
      event.preventDefault();
      node.setPointerCapture(event.pointerId);
      const p = svgPoint(event);
      start = { x: p.x, y: p.y, value: c.value };
      node.dataset.active = "";
    });
    node.addEventListener("pointermove", (event) => {
      if (!start) return;
      const p = svgPoint(event);
      const range = c.max - c.min;
      if (c.kind === "knob") setValue(c, start.value - ((p.y - start.y) / (c.steps ? 70 : 120)) * range);
      else if (c.kind === "switch3") {
        const [a] = toPlane(p.x - start.x, p.y - start.y);
        setValue(c, clamp(Math.round(start.value + a / c.step), 0, 2));
      } else {
        const [a, b] = toPlane(p.x - start.x, p.y - start.y);
        const along = a * c.axis[0] + b * c.axis[1];
        const dt = along / (2 * c.len);
        setValue(c, start.value + (c.invert ? -dt : dt) * range);
      }
    });
    const end = () => {
      start = null;
      delete node.dataset.active;
    };
    node.addEventListener("pointerup", end);
    node.addEventListener("pointercancel", end);
    node.addEventListener("dblclick", () => started && setValue(c, c.def ?? c.value));
    node.addEventListener("keydown", (event) => {
      const step = c.kind === "switch3" || c.steps ? 1 : (c.max - c.min) / (event.shiftKey ? 10 : 50);
      let v = null;
      if (event.key === "ArrowUp" || event.key === "ArrowRight") v = c.value + step;
      if (event.key === "ArrowDown" || event.key === "ArrowLeft") v = c.value - step;
      if (event.key === "Home") v = c.min ?? 0;
      if (event.key === "End") v = c.max ?? 2;
      if (event.key === "Delete" || event.key === "Backspace") v = c.def ?? c.value;
      if (v === null || !started) return;
      event.preventDefault();
      if (c.kind === "switch3") setValue(c, clamp(Math.round(v), 0, 2));
      else setValue(c, v);
    });
  } else if (c.kind === "jog") {
    const j = { drag: false, last: 0, lastT: 0, vel: 0 };
    const angleAt = (event) => {
      const p = svgPoint(event);
      const o = iso([c.x, c.y, c.z], PJ);
      const [a, b] = toPlane(p.x - o[0], p.y - o[1]);
      return Math.atan2(a, -b);
    };
    node.addEventListener("pointerdown", (event) => {
      if (!ready(event)) return;
      event.preventDefault();
      node.setPointerCapture(event.pointerId);
      j.drag = true;
      j.last = angleAt(event);
      j.lastT = performance.now();
      j.vel = 0;
      node.dataset.active = "";
    });
    node.addEventListener("pointermove", (event) => {
      if (!j.drag || !E) return;
      const a = angleAt(event);
      let da = a - j.last;
      if (da > Math.PI) da -= Math.PI * 2;
      if (da < -Math.PI) da += Math.PI * 2;
      const now = performance.now();
      const dt = Math.max(0.008, (now - j.lastT) / 1000);
      j.vel = j.vel * 0.6 + (da / (Math.PI * 2) / dt) * 0.4;
      j.last = a;
      j.lastT = now;
      const deck = E.decks[c.deck];
      E.jog(c.deck, j.vel, da / (Math.PI * 2));
      if (deck.track === null) deckState[c.deck].jogAngle += da;
      showTip(deck.track === null ? "Load a track first" : !deck.playing ? "Moving the playhead" : Math.abs(j.vel) > 0.9 ? "Scratch" : j.vel > 0 ? "Nudge faster" : "Nudge slower", node, 600);
    });
    const end = () => {
      if (!j.drag) return;
      j.drag = false;
      delete node.dataset.active;
      if (E) E.jogEnd(c.deck);
    };
    node.addEventListener("pointerup", end);
    node.addEventListener("pointercancel", end);
    node.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key) || !started) return;
      event.preventDefault();
      const v = event.key === "ArrowRight" ? 0.4 : -0.4;
      E.jog(c.deck, v, v / 8);
      setTimeout(() => E.jogEnd(c.deck), 220);
      showTip(v > 0 ? "Nudge faster" : "Nudge slower", node, 600);
    });
  } else if (c.kind === "xpad") {
    let touching = false;
    const index = (event) => {
      const p = svgPoint(event);
      const o = iso([c.x0, (c.y0 + c.y1) / 2, c.z], PJ);
      const [a] = toPlane(p.x - o[0], p.y - o[1]);
      return clamp(Math.floor((a / (c.x1 - c.x0)) * 8), 0, 7);
    };
    const show = (i) => $("[data-xpad]").setAttribute("d", i === null ? "" : k_planOutline({ x: c.x0 + i * 10 + 0.6, y: c.y0 + 1, w: 8.8, d: c.y1 - c.y0 - 2, r: 1 }, c.z + 0.05));
    const say = () => showTip(`X-PAD · ${E.beatFx.state.type} · ${E.beatFx.BEATS[E.beatFx.state.beat]} beat`, node, 900);
    node.addEventListener("pointerdown", (event) => {
      if (!ready(event)) return;
      event.preventDefault();
      node.setPointerCapture(event.pointerId);
      touching = true;
      const i = index(event);
      E.beatFx.touch(i);
      show(i);
      say();
      refresh();
    });
    node.addEventListener("pointermove", (event) => {
      if (!touching) return;
      const i = index(event);
      if (i !== E.beatFx.state.beat) {
        E.beatFx.touch(i);
        show(i);
        say();
        refresh();
      }
    });
    const end = () => {
      if (!touching) return;
      touching = false;
      E.beatFx.touch(null);
      show(null);
      refresh();
    };
    node.addEventListener("pointerup", end);
    node.addEventListener("pointercancel", end);
    node.addEventListener("keydown", (event) => {
      if (!started) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        E.beatFx.beat(E.beatFx.state.beat + (event.key === "ArrowRight" ? 1 : -1));
        if (touching) show(E.beatFx.state.beat);
        refresh();
      }
      if ((event.key === " " || event.key === "Enter") && !touching) {
        event.preventDefault();
        touching = true;
        E.beatFx.touch(E.beatFx.state.beat);
        show(E.beatFx.state.beat);
        say();
      }
    });
    node.addEventListener("keyup", (event) => {
      if (event.key === " " || event.key === "Enter") end();
    });
  } else if (c.kind === "screen") {
    node.addEventListener("click", (event) => {
      if (!ready(event)) return;
      screenPress(c.deck, event);
    });
    node.addEventListener("keydown", (event) => {
      if (!started) return;
      const s = deckState[c.deck];
      const deck = E.decks[c.deck];
      const browse = s.browse || deck.track === null;
      if (browse && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
        event.preventDefault();
        s.sel = clamp(s.sel + (event.key === "ArrowDown" ? 1 : -1), 0, E.TRACKS.length - 1);
        showTip(`${E.TRACKS[s.sel].title} · ${E.TRACKS[s.sel].genre} · Enter loads`, node, 1400);
      } else if (browse && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        E.load(c.deck, s.sel);
        s.browse = false;
        showTip(`${E.TRACKS[s.sel].title} loaded · press PLAY`, node, 1600);
      } else if (!browse && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        event.preventDefault();
        E.needle(c.deck, clamp((deck.pos + (event.key === "ArrowRight" ? 64 : -64)) / E.STEPS, 0, 0.999));
      } else if (event.key === "b" || event.key === "B" || (!browse && event.key === "Enter")) {
        event.preventDefault();
        s.browse = !s.browse;
      }
      refresh();
    });
  } else {
    node.addEventListener("click", (event) => {
      if (!ready(event)) return;
      press(c, node, event);
    });
    node.addEventListener("keydown", (event) => {
      if (event.key !== " " && event.key !== "Enter") return;
      event.preventDefault();
      if (!started) return;
      press(c, node, event);
    });
  }
}

// lit states that follow the engine
function refresh() {
  if (!E) return;
  const lit = (id, on) => nodeOf(id)?.toggleAttribute("data-on", !!on);
  E.decks.forEach((deck, d) => {
    lit(`play-${d}`, deck.playing);
    nodeOf(`play-${d}`).toggleAttribute("data-pending", deck.ops.length > 0 && !deck.playing);
    nodeOf(`play-${d}`).setAttribute("aria-pressed", String(deck.playing));
    lit(`cue-${d}`, deck.track !== null && !deck.playing);
    deck.hot.forEach((h, i) => lit(`hot-${d}-${i}`, h !== null));
    lit(`loopin-${d}`, deck.loop.in !== null && !deck.loop.on);
    lit(`loopout-${d}`, deck.loop.on);
    lit(`reloop-${d}`, deck.loop.on);
    lit(`beat4-${d}`, deck.loop.on && deck.loopBeats <= 4);
    lit(`beat8-${d}`, deck.loop.on && deck.loopBeats >= 8);
    lit(`mt-${d}`, deck.mt);
    lit(`sync-${d}`, deck.sync);
    lit(`master-${d}`, deck.master);
    lit(`browse-${d}`, deckState[d].browse || deck.track === null);
    for (const id of [`mt-${d}`, `sync-${d}`, `master-${d}`]) nodeOf(id).setAttribute("aria-checked", String(nodeOf(id).hasAttribute("data-on")));
  });
  E.mixer.COLOR.forEach((name, i) => {
    const on = E.mixer.state.color === name;
    lit(`cfx-${i}`, on);
    nodeOf(`cfx-${i}`).setAttribute("aria-checked", String(on));
  });
  const fx = E.beatFx.state;
  ["1", "2", "3", "4", "MIC", "XF A", "XF B", "MST"].forEach((name, i) => {
    const src = name === "2" ? 2 : name === "3" ? 3 : name === "MST" ? "MASTER" : name;
    lit(`fxch-${i}`, fx.source === src);
    nodeOf(`fxch-${i}`).setAttribute("aria-checked", String(fx.source === src));
  });
  lit("fxon", fx.on || fx.touching);
  $("[data-fxname]").textContent = fx.type;
  const b = E.beatFx.BEATS[fx.beat];
  $("[data-fxbeat]").textContent = `${{ 0.125: "1/8", 0.25: "1/4", 0.5: "1/2", 0.75: "3/4" }[b] ?? b} BEAT`;
  $("[data-fxsrc]").textContent = fx.source === "MASTER" ? "MST" : typeof fx.source === "number" ? `CH ${fx.source}` : fx.source;
  $("[data-fxdepth]").setAttribute("width", (66 * fx.depth).toFixed(1));
  $("[data-fxname]").parentNode.toggleAttribute("data-on", fx.on || fx.touching);
  const sel = controls.get("fxselect");
  const want = E.beatFx.LIST.indexOf(fx.type);
  if (Math.round(sel.value) !== want) {
    sel.value = want;
    drawControl(sel);
  }
}

// ---------- start: the only thing that makes sound possible ----------
async function start() {
  if (started) return;
  startBox.dataset.busy = "";
  E = makeEngine();
  window.__booth = E;
  await E.start();
  started = true;
  for (const c of controls.values()) apply(c);
  E.on("deck", refresh);
  E.on("mixer", refresh);
  E.on("beat", (d) => beat(d));
  startBox.hidden = true;
  refresh();
  showTip("Tap a track on each screen, then press PLAY", null, 4200);
  stops[0].focus({ preventScroll: true });
  run();
}
startBox.querySelector("button").addEventListener("click", start);
document.addEventListener("keydown", (event) => {
  if (!started || event.target.closest("button") || event.altKey || event.metaKey || event.ctrlKey) return;
  if (event.target.closest('[data-ctl^="screen-"]')) return;
  if (event.key === "q" || event.key === "Q") press(controls.get("play-0"), nodeOf("play-0"), event);
  if (event.key === "p" || event.key === "P") press(controls.get("play-1"), nodeOf("play-1"), event);
});

// ---------- keyboard order: the left player, the mixer by section, the right player ----------
const deckOrder = (d) => [`screen-${d}`, `browse-${d}`, ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `hot-${d}-${i}`), `loopin-${d}`, `loopout-${d}`, `reloop-${d}`, `beat4-${d}`, `beat8-${d}`, `jumpb-${d}`, `jumpf-${d}`, `cue-${d}`, `play-${d}`, `jog-${d}`, `sync-${d}`, `master-${d}`, `range-${d}`, `mt-${d}`, `tempo-${d}`];
const ORDER = [
  ...deckOrder(0),
  ...[0, 1, 2, 3, 4, 5].map((i) => `cfx-${i}`),
  ...[2, 3].flatMap((n) => [`trim-${n}`, `hi-${n}`, `mid-${n}`, `low-${n}`, `color-${n}`, `chcue-${n}`, `fader-${n}`, `assign-${n}`]),
  "xfader",
  "master",
  "booth",
  "fxbeat-down",
  "fxbeat-up",
  "fxselect",
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `fxch-${i}`),
  "xpad",
  "depth",
  "fxon",
  ...deckOrder(1),
];
const stops = ORDER.map((id) => nodeOf(id)).filter(Boolean);
$$("[data-ctl]").forEach((n) => n.setAttribute("tabindex", "-1"));
stops[0].setAttribute("tabindex", "0");
svg.addEventListener("keydown", (event) => {
  if (event.key !== "Tab") return;
  const here = stops.indexOf(event.target.closest("[data-ctl]"));
  if (here < 0) return;
  const next = here + (event.shiftKey ? -1 : 1);
  if (next < 0 || next >= stops.length) return;
  event.preventDefault();
  stops[next].focus();
});
svg.addEventListener("focusin", (event) => {
  const node = event.target.closest("[data-ctl]");
  if (!node || !stops.includes(node)) return;
  stops.forEach((n) => n.setAttribute("tabindex", n === node ? "0" : "-1"));
  const c = controls.get(node.dataset.ctl);
  if (started && c && ["knob", "fader", "switch3"].includes(c.kind)) showTip(`${c.label} · ${fmt(c)}`, node, 1200);
  else if (started) showTip(node.getAttribute("aria-label"), node, 1600);
  highlightFor(node.dataset.ctl, true);
});
svg.addEventListener("focusout", (event) => {
  const node = event.target.closest("[data-ctl]");
  if (node) highlightFor(node.dataset.ctl, false);
});

// ---------- signal flow along the cables ----------
const flows = {};
for (const [name, pts] of Object.entries(D.cables)) {
  const lengths = [0];
  for (let i = 1; i < pts.length; i++) lengths.push(lengths[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const path = el("path", { d: `M${pts.map((p) => p.join(" ")).join("L")}`, class: "dj-flow-line" }, flowLayer);
  flows[name] = { pts, lengths, total: lengths[lengths.length - 1], path, level: 0 };
}
const pulses = [];
function pointAt(flow, s) {
  const { pts, lengths } = flow;
  let i = 1;
  while (i < lengths.length - 1 && lengths[i] < s) i++;
  const t = (s - lengths[i - 1]) / (lengths[i] - lengths[i - 1] || 1);
  return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
}
const chLevel = (n) => {
  const lv = E.levels();
  const c = E.mixer.channels[n];
  return clamp(Math.sqrt(n === 2 ? lv.ch2 : lv.ch3) * 1.6 * Math.min(1, c.fader.gain.value * 1.4 + 0.05), 0, 1);
};
function beat(d) {
  if (still.matches || flowLayer.dataset.off !== undefined) return;
  const now = performance.now();
  const beatMs = 60000 / E.bpmOf(E.decks[d]);
  const launch = (name, delay, level) => {
    if (level < 0.04) return;
    pulses.push({ flow: flows[name], start: now + delay, dur: beatMs * 0.6, level, node: el("circle", { r: 3, class: "dj-pulse" }, flowLayer) });
  };
  launch(d ? "cable.ch3" : "cable.ch2", 0, chLevel(d ? 3 : 2));
  if (d === 0 || !E.decks[0].playing) {
    const lv = E.levels();
    launch("cable.master", beatMs * 0.35, clamp(Math.sqrt(Math.max(lv.l, lv.r)) * 1.5, 0, 1));
  }
}

// ---------- callouts ----------
const callNodes = new Map();
const zone = (z) => D.callouts.filter((c) => c.zone === z);
function column(items, sideSign) {
  const edge = sideSign < 0 ? 0 : D.W;
  items.sort((a, b) => (a.at[1] - D.H / 2) / Math.abs(a.at[0] - edge) - (b.at[1] - D.H / 2) / Math.abs(b.at[0] - edge));
  const top = D.TOP + 10;
  const gap = Math.min(64, (D.H - D.BAND - top - 10) / items.length);
  items.forEach((c, i) => {
    c.lx = sideSign < 0 ? 14 : D.W - 14;
    c.ly = top + gap * i + 12;
    c.side = sideSign;
  });
}
function band(items, y0, y1) {
  items.sort((a, b) => a.at[0] - b.at[0]);
  const n = items.length;
  items.forEach((c, i) => {
    c.lx = D.MARGIN + 40 + (i * (D.W - 2 * D.MARGIN - 80)) / Math.max(1, n - 1);
    c.ly = i % 2 ? y1 : y0;
    c.side = 0;
  });
}
column(zone("L"), -1);
column(zone("R"), 1);
band(zone("T"), 34, 82);
band(zone("B"), D.H - 80, D.H - 32);
for (const c of D.callouts) {
  const g = el("g", { class: "dj-callout", "data-callout": c.n, tabindex: "0", role: "button", "aria-label": `${c.n}. ${c.name}: ${c.what}. Try this: ${c.hint}` }, calloutLayer);
  const above = c.ly < c.at[1];
  let leader;
  if (c.side === 0) leader = `M${c.at[0]} ${c.at[1]}L${c.lx} ${above ? c.ly + 14 : c.ly - 24}`;
  else {
    const elbow = c.side < 0 ? D.MARGIN - 8 : D.W - D.MARGIN + 8;
    leader = `M${c.at[0]} ${c.at[1]}L${elbow} ${c.ly}L${c.lx + (c.side < 0 ? 172 : -172)} ${c.ly}`;
  }
  el("path", { class: "dj-leader", d: leader }, g);
  el("circle", { class: "dj-anchor", cx: c.at[0], cy: c.at[1], r: 2.2 }, g);
  const badge = el("g", { class: "dj-badge-at", transform: `translate(${c.at[0] - 9} ${c.at[1] - 9})` }, g);
  el("circle", { r: 7.5, class: "dj-badge" }, badge);
  el("text", { class: "dj-badge-n", "text-anchor": "middle", y: 3.2 }, badge).textContent = c.n;
  const label = el("g", { class: "dj-label", transform: `translate(${c.lx} ${c.ly})` }, g);
  const anchor = c.side < 0 ? "start" : c.side > 0 ? "end" : "middle";
  el("text", { class: "dj-label-name", "text-anchor": anchor, y: -3 }, label).textContent = `${c.n}  ${c.name}`;
  el("text", { class: "dj-label-what", "text-anchor": anchor, y: 10 }, label).textContent = c.what;
  callNodes.set(c.n, g);
  const flash = () => {
    for (const id of c.ids) {
      const n = nodeOf(id);
      if (!n) continue;
      n.dataset.flash = "";
      setTimeout(() => delete n.dataset.flash, 1800);
    }
    showTip(`Try this: ${c.hint}`, null, 3600);
  };
  g.addEventListener("click", flash);
  g.addEventListener("keydown", (event) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      flash();
    }
  });
  const li = document.createElement("li");
  li.innerHTML = `<button type="button"><b>${c.name}</b> ${c.what}</button>`;
  li.querySelector("button").addEventListener("click", () => {
    const first = c.ids.map(nodeOf).find(Boolean);
    if (narrow.matches && first) zoomToNode(first);
    flash();
  });
  list.appendChild(li);
}
const family = (id) => id.replace(/-\d+(-\d+)?$/, "");
function highlightFor(id, on) {
  if (!id) return;
  for (const c of D.callouts) {
    const hit = c.ids.includes(id) || c.ids.some((x) => family(x) === family(id));
    if (hit) callNodes.get(c.n).toggleAttribute("data-hot", on);
  }
}
svg.addEventListener("pointerover", (event) => highlightFor(event.target.closest("[data-ctl]")?.dataset.ctl, true));
svg.addEventListener("pointerout", (event) => highlightFor(event.target.closest("[data-ctl]")?.dataset.ctl, false));

// ---------- toolbar ----------
document.querySelectorAll(".dj-tool").forEach((button) =>
  button.addEventListener("click", () => {
    const tool = button.dataset.tool;
    if (tool === "labels") {
      const full = stage.dataset.labels !== "full";
      stage.dataset.labels = full ? "full" : "play";
      button.textContent = `Labels: ${full ? "full" : "play view"}`;
      button.setAttribute("aria-pressed", String(full));
    } else if (tool === "flow") {
      const onState = flowLayer.dataset.off !== undefined;
      if (onState) delete flowLayer.dataset.off;
      else flowLayer.dataset.off = "";
      button.textContent = `Signal flow: ${onState ? "on" : "off"}`;
      button.setAttribute("aria-pressed", String(onState));
    } else if (tool === "overview") zoomTo(null);
  }),
);

// ---------- phones: the overview fits the hardware; a tap zooms into that spot ----------
const wideBox = [0, 0, D.W, D.H];
const hardwareBox = [D.MARGIN - 10, D.TOP - 10, D.W - 2 * D.MARGIN + 20, D.H - D.TOP - D.BAND + 20];
const overview = () => (narrow.matches ? hardwareBox : wideBox);
let view = [...overview()];
let zoomed = null;
let zoomAnim = 0;
svg.setAttribute("viewBox", view.join(" "));
narrow.addEventListener("change", () => zoomTo(null));
function zoomTo(box) {
  zoomed = box;
  const target = box || overview();
  const from = [...view];
  const t0 = performance.now();
  stage.toggleAttribute("data-zoomed", !!box);
  document.querySelector(".dj-zoomout").hidden = !box;
  // on a phone the drawing takes the shape of what it shows, so a whole unit fits at finger size
  svg.style.aspectRatio = narrow.matches ? `${target[2]} / ${target[3]}` : "";
  cancelAnimationFrame(zoomAnim);
  const step = (now) => {
    const t = still.matches ? 1 : Math.min(1, (now - t0) / 380);
    const e = 1 - Math.pow(1 - t, 3);
    view = from.map((v, i) => v + (target[i] - v) * e);
    svg.setAttribute("viewBox", view.map((v) => v.toFixed(1)).join(" "));
    if (t < 1) zoomAnim = requestAnimationFrame(step);
  };
  zoomAnim = requestAnimationFrame(step);
}
function boxOf(nodes, pad = 10) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const n of nodes) {
    const b = n.getBBox();
    x0 = Math.min(x0, b.x);
    y0 = Math.min(y0, b.y);
    x1 = Math.max(x1, b.x + b.width);
    y1 = Math.max(y1, b.y + b.height);
  }
  return [x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad];
}
// a whole player, or one half of the mixer: channels on the left, master and Beat FX on the right
function unitBox(x, part) {
  if (part === "cdj0" || part === "cdj1") return boxOf($$(`.it[data-part="${part}"]`));
  const mixer = boxOf($$('.it[data-part="mixer"]'));
  const half = mixer[2] * 0.56;
  return x < mixer[0] + mixer[2] / 2 ? [mixer[0], mixer[1], half, mixer[3]] : [mixer[0] + mixer[2] - half, mixer[1], half, mixer[3]];
}
function zoomAt(event) {
  const p = svgPoint(event);
  const part = event.target.closest("[data-part]")?.dataset.part;
  if (!part || part === "cables") {
    const parts = ["cdj0", "mixer", "cdj1"];
    const boxes = parts.map((n) => boxOf($$(`.it[data-part="${n}"]`), 0));
    const i = boxes.findIndex((b) => p.x >= b[0] && p.x <= b[0] + b[2]);
    return zoomTo(unitBox(p.x, parts[i < 0 ? 1 : i]));
  }
  zoomTo(unitBox(p.x, part));
}
function zoomToNode(node) {
  const b = node.getBBox();
  zoomTo(unitBox(b.x + b.width / 2, node.closest("[data-part]")?.dataset.part));
}

// ---------- the frame loop ----------
let frame = 0;
let last = 0;
let visible = true;
const ledSets = { ch2: $$('[data-led^="ch2-"]'), ch3: $$('[data-led^="ch3-"]'), m0: $$('[data-led^="m0-"]'), m1: $$('[data-led^="m1-"]') };
function light(nodes, level, perLed, count) {
  const lit = level <= 0.00005 ? 0 : clamp(Math.round(count + (20 * Math.log10(level)) / perLed), 0, count);
  nodes.forEach((n) => {
    const i = Number(n.dataset.led.split("-")[1]);
    const on = i < lit;
    if (on !== n.hasAttribute("data-on")) n.toggleAttribute("data-on", on);
    if (i >= count - 2 && !n.hasAttribute("data-peak")) n.setAttribute("data-peak", "");
  });
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (E) {
    const lv = E.levels();
    light(ledSets.ch2, lv.ch2, 2.5, 15);
    light(ledSets.ch3, lv.ch3, 2.5, 15);
    light(ledSets.m0, lv.l, 3, 12);
    light(ledSets.m1, lv.r, 3, 12);
    E.decks.forEach((deck, d) => {
      drawScreen(d);
      // the jog's centre display turns once per bar with the playhead
      const c = controls.get(`jog-${d}`);
      const a = deck.track === null ? deckState[d].jogAngle : (deck.pos / 16) * Math.PI * 2;
      $(`[data-jogmark="${d}"]`).setAttribute("d", lineOnTop([c.x + Math.sin(a) * 12, c.y - Math.cos(a) * 12], [c.x + Math.sin(a) * 39, c.y - Math.cos(a) * 39], c.z + 1.3, PJ));
    });
    const levels = { "cable.ch2": E.decks[0].playing ? chLevel(2) : 0, "cable.ch3": E.decks[1].playing ? chLevel(3) : 0, "cable.master": clamp(Math.sqrt(Math.max(lv.l, lv.r)) * 1.4, 0, 1) };
    for (const [name, f] of Object.entries(flows)) {
      f.level += (levels[name] - f.level) * (1 - Math.exp(-dt / 0.15));
      f.path.style.setProperty("--level", f.level.toFixed(3));
    }
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      const t = (now - p.start) / p.dur;
      if (t < 0) continue;
      if (t >= 1) {
        p.node.remove();
        pulses.splice(i, 1);
        continue;
      }
      const [x, y] = pointAt(p.flow, t * p.flow.total);
      p.node.setAttribute("cx", x.toFixed(1));
      p.node.setAttribute("cy", y.toFixed(1));
      p.node.setAttribute("opacity", (p.level * Math.sin(Math.PI * t) * 1.15).toFixed(2));
    }
    const say = (deck, d) => (deck.track === null ? `${d ? "R" : "L"} —` : `${d ? "R" : "L"} ${deck.playing ? "▶" : "❚❚"} ${E.TRACKS[deck.track].title} ${Math.floor(deck.pos / 16) + 1}.${Math.floor((deck.pos % 16) / 4) + 1}`);
    const text = `${E.bpmOf(E.decks.find((x) => x.master) ?? E.decks[0]).toFixed(1)} BPM · ${say(E.decks[0], 0)} · ${say(E.decks[1], 1)}`;
    if (clockEl.textContent !== text) clockEl.textContent = text;
  }
  frame = visible ? requestAnimationFrame(tick) : 0;
}
function run() {
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
}
new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) run();
}, { rootMargin: "120px 0px" }).observe(stage);
for (const c of controls.values()) drawControl(c);
[0, 1].forEach((d) => {
  el("text", { class: "dj-scr-dim", x: SW / 2, y: SH / 2 + 3, "font-size": 9, "text-anchor": "middle" }, screens[d].ui).textContent = "Press Start the booth";
  const c = controls.get(`jog-${d}`);
  $(`[data-jogmark="${d}"]`).setAttribute("d", lineOnTop([c.x, c.y - 12], [c.x, c.y - 39], c.z + 1.3, PJ));
});
