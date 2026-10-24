// Roadster loop rig — live. One clock, one pure model; everything reads stateAt(t).
// The figure plays its loop on its own; the keyboard can pause, step, slow it, and mute.
const D = __DATA__;
const P = D.P;
const PARTS = makeParts({ iso, pathOf, solidSvg, lineSvg, dotsSvg, coil, haloOf, translateAlong, holdStill }, G, P, D.parts);

const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const $id = (id) => document.getElementById(id);
const moving = ["rf-shadow", "rf-plume", "rf-car", "rf-jets"].map($id);
const elFog = $id("rf-fog");
const readout = document.querySelector("[data-readout]");
const status = document.querySelector("[data-status]");
const still = matchMedia("(prefers-reduced-motion: reduce)");

const SLOTS = { loop: $id("slot-loop"), air: $id("slot-air"), ground: $id("slot-ground") };
const slotOf = (st) => (st.phase === PHASE.CLIMB ? "loop"
  : st.phase >= PHASE.COAST && st.phase <= PHASE.DESCEND ? "air" : "ground");

// ---- synthesized sound layer (Web Audio, opt-in) --------------------------------
const Sound = (() => {
  let ctx = null, master = null, noiseBuf = null;
  let on = false;                 // user toggle
  const N = {};                   // continuous chains
  const prev = { phase: -1, rollJet: 0, trimJet: 0 };

  function makeNoise() {
    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  const noiseSrc = () => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.start(); return s; };
  const setP = (p, v, tc) => p.setTargetAtTime(v, ctx.currentTime, tc == null ? 0.06 : tc);

  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    makeNoise();
    { // FAN: band-passed suction noise + high sawtooth whine
      const g = ctx.createGain(); g.gain.value = 0; g.connect(master);
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1100; bp.Q.value = 1.1; bp.connect(g);
      noiseSrc().connect(bp);
      const og = ctx.createGain(); og.gain.value = 0; og.connect(master);
      const osc = ctx.createOscillator(); osc.type = "sawtooth"; osc.frequency.value = 150; osc.connect(og); osc.start();
      N.fan = { g, bp, og, osc };
    }
    { // THRUSTER: low-passed roar + triangle rumble
      const g = ctx.createGain(); g.gain.value = 0; g.connect(master);
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 380; lp.Q.value = 0.7; lp.connect(g);
      noiseSrc().connect(lp);
      const og = ctx.createGain(); og.gain.value = 0; og.connect(master);
      const osc = ctx.createOscillator(); osc.type = "triangle"; osc.frequency.value = 46; osc.connect(og); osc.start();
      N.thr = { g, lp, og, osc };
    }
    { // JET: cold-gas hiss
      const g = ctx.createGain(); g.gain.value = 0; g.connect(master);
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2800; bp.Q.value = 0.9; bp.connect(g);
      noiseSrc().connect(bp);
      N.jet = { g, bp };
    }
    { // WIND: airflow over the body while airborne
      const g = ctx.createGain(); g.gain.value = 0; g.connect(master);
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 620; bp.Q.value = 0.5; bp.connect(g);
      noiseSrc().connect(bp);
      N.wind = { g, bp };
    }
    return true;
  }

  let lastTargets = null;
  function targetsFor(st, active) {
    const k = active ? 1 : 0;
    const fanOn = (st.phase === PHASE.RUN || st.phase === PHASE.CLIMB) ? st.fans : 0;
    const plume = st.plume * k;
    const jet = Math.max(st.rollJet, st.trimJet) * k;
    const airborne = (st.phase >= PHASE.COAST && st.phase <= PHASE.DESCEND) ? 1 : 0;
    return {
      fanG: fanOn * k * 0.34, fanHz: 105 + st.fans * 195, fanBp: 650 + st.fans * 1650,
      thrG: plume * 0.5, thrOscG: plume * 0.3, thrHz: 42 + plume * 24,
      jetG: jet * 0.3, windG: airborne * k * (st.v / 52) * 0.12,
    };
  }
  function update(st, active) {
    if (!ctx) return;
    const tg = targetsFor(st, active); lastTargets = tg;
    setP(N.fan.g.gain, tg.fanG);
    setP(N.fan.bp.frequency, tg.fanBp + Math.sin(st.fanSpin) * 60);
    setP(N.fan.og.gain, tg.fanG * 0.3);
    setP(N.fan.osc.frequency, tg.fanHz);
    setP(N.thr.g.gain, tg.thrG);
    setP(N.thr.lp.frequency, 240 + st.plume * active * 560);
    setP(N.thr.og.gain, tg.thrOscG);
    setP(N.thr.osc.frequency, tg.thrHz);
    setP(N.jet.g.gain, tg.jetG);
    setP(N.jet.bp.frequency, 2300 + Math.max(st.rollJet, st.trimJet) * active * 1500);
    setP(N.wind.g.gain, tg.windG);
    if (active) {
      if (st.phase === PHASE.LAND && prev.phase !== PHASE.LAND) thud();
      if (st.rollJet > 0.4 && prev.rollJet <= 0.4) burst(3100);
      if (st.trimJet > 0.4 && prev.trimJet <= 0.4) burst(3700);
    }
    prev.phase = st.phase; prev.rollJet = st.rollJet; prev.trimJet = st.trimJet;
  }

  function thud() {
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(78, t); o.frequency.exponentialRampToValueAtTime(36, t + 0.28);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.45);
    const n = ctx.createBufferSource(); n.buffer = noiseBuf;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 320;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, t); ng.gain.exponentialRampToValueAtTime(0.28, t + 0.015); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    n.connect(lp); lp.connect(ng); ng.connect(master); n.start(t); n.stop(t + 0.35);
  }
  function burst(freq) {
    const t = ctx.currentTime;
    const n = ctx.createBufferSource(); n.buffer = noiseBuf;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = freq; bp.Q.value = 1.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    n.connect(bp); bp.connect(g); g.connect(master); n.start(t); n.stop(t + 0.3);
  }

  function applyGain() { if (ctx) master.gain.setTargetAtTime(on ? 0.42 : 0, ctx.currentTime, 0.08); }
  function toggle() { if (!ensure()) return false; if (ctx.state === "suspended") ctx.resume(); on = !on; applyGain(); return on; }
  function duck(active) { if (!ctx) return; if (!active) { /* silence continuous chains */ update({ phase: -1, fans: 0, plume: 0, rollJet: 0, trimJet: 0, v: 0, fanSpin: 0 }, false); } }
  function isOn() { return on; }
  function debug() {
    return {
      on, ctx: !!ctx, state: ctx ? ctx.state : "none",
      master: master ? +master.gain.value.toFixed(3) : null,
      fan: N.fan ? +N.fan.g.gain.value.toFixed(3) : null,
      fanHz: N.fan ? Math.round(N.fan.osc.frequency.value) : null,
      thr: N.thr ? +N.thr.g.gain.value.toFixed(3) : null,
      jet: N.jet ? +N.jet.g.gain.value.toFixed(3) : null,
      wind: N.wind ? +N.wind.g.gain.value.toFixed(3) : null,
    };
  }
  return { update, toggle, duck, isOn, debug, targetsFor };
})();

// ---- state + rendering ----------------------------------------------------------
let t = still.matches ? TL.roll[0] + 0.35 : 0;
let playing = !still.matches, speed = 1, lastPhase = -1, lastSlot = "", frame = 0, last = 0, visible = false;

function render() {
  const st = stateAt(t);
  const slot = slotOf(st);
  if (slot !== lastSlot) {
    lastSlot = slot;
    for (const el of moving) SLOTS[slot].appendChild(el);
  }
  $id("rf-car").innerHTML = PARTS.car(st);
  $id("rf-shadow").innerHTML = PARTS.shadow(st);
  $id("rf-plume").innerHTML = PARTS.plumes(st);
  $id("rf-jets").innerHTML = PARTS.jets(st);
  $id("rf-fog").innerHTML = PARTS.fog(st.fog);
  const text = readoutOf(st);
  if (readout.textContent !== text) readout.textContent = text;
  if (st.phase !== lastPhase) {
    lastPhase = st.phase;
    if (status) status.textContent = PHASE_EN[st.phase];
    stage.setAttribute("aria-valuetext", text);
  }
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (playing && visible) {
    t = (t + dt * speed) % T_TOTAL;
    render();
    Sound.update(stateAt(t), true);
  }
  frame = visible && playing ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible && playing) { last = 0; frame = requestAnimationFrame(tick); } };
new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) run(); else Sound.duck(false);
}, { rootMargin: "120px 0px" }).observe(stage);

// ---- sound toggle button --------------------------------------------------------
const soundBtn = $id("rf-sound");
function paintSoundBtn() {
  if (!soundBtn) return;
  const on = Sound.isOn();
  soundBtn.textContent = on ? "🔊 Sound on" : "🔇 Sound off";
  soundBtn.setAttribute("aria-pressed", String(on));
}
if (soundBtn) soundBtn.addEventListener("click", () => { Sound.toggle(); paintSoundBtn(); });

stage.addEventListener("keydown", (event) => {
  const step = (d) => { playing = false; t = ((t + d) % T_TOTAL + T_TOTAL) % T_TOTAL; render(); Sound.duck(false); };
  if (event.key === " ") {
    event.preventDefault(); playing = !playing;
    if (playing) run(); else { render(); Sound.duck(false); }
  }
  else if (event.key === "ArrowRight") { event.preventDefault(); step(event.shiftKey ? 0.25 : 0.05); }
  else if (event.key === "ArrowLeft") { event.preventDefault(); step(event.shiftKey ? -0.25 : -0.05); }
  else if (event.key === "Home") { event.preventDefault(); step(-t); }
  else if (event.key === "End") { event.preventDefault(); playing = false; t = T_TOTAL - 0.01; render(); Sound.duck(false); }
  else if (event.key === "r" || event.key === "R") { t = 0; playing = true; render(); run(); }
  else if (event.key === "s" || event.key === "S") { speed = speed === 1 ? 0.25 : 1; }
  else if (event.key === "m" || event.key === "M") { Sound.toggle(); paintSoundBtn(); }
});
stage.addEventListener("focus", () => { if (status) status.textContent = readoutOf(stateAt(t)); });
window.__isoRig = {
  seek: (to) => { playing = false; t = ((to % T_TOTAL) + T_TOTAL) % T_TOTAL; render(); Sound.duck(false); },
  play: (on) => { playing = on; if (on) run(); else Sound.duck(false); },
  state: stateAt, T: T_TOTAL,
  marks: { ready: 0.4, run: 1.5, climb40: 2.45, climb90: 2.9, climb135: 3.3, lip: 4.19, coast: 4.5, roll: 5.05, trim: 5.65, descend: 6.5, land: 7.3, taxi: 9.0, reset: 11.0 },
  sound: { toggle: () => { const r = Sound.toggle(); paintSoundBtn(); return r; }, isOn: () => Sound.isOn(), debug: () => Sound.debug(), targets: (t, active) => Sound.targetsFor(stateAt(t), active !== false) },
};
render();
paintSoundBtn();
