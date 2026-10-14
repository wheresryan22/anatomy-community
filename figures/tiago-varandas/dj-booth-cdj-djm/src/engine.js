// The booth's sound: two players and a four-channel mixer, synthesized on the browser's Web Audio API.
// Eight original tracks in A minor at 124 BPM, so any two blend. Nothing is built until start()
// runs inside the visitor's first click or tap.

const BPM = 124;
const BARS = 48;
const STEPS = BARS * 16;
const ROOT = { Am: "A1", F: "F1", C: "C2", G: "G1", Dm: "D2", Em: "E2" };
const CHORD = {
  Am: ["A3", "C4", "E4", "G4"],
  F: ["F3", "A3", "C4", "E4"],
  C: ["G3", "C4", "E4", "B4"],
  G: ["G3", "B3", "D4", "A4"],
  Dm: ["D3", "F3", "A3", "C4"],
  Em: ["E3", "G3", "B3", "D4"],
};
// Each track: a four-bar progression, one-bar patterns per voice, its chord instrument and swing.
// Sections: intro bars 0–7 drums, main 8–23 everything, break 24–31 harmony only, main 32–43, outro 44–47 drums.
const TRACKS = [
  { title: "Night Shift", genre: "House", prog: ["Am", "F", "C", "G"], kick: "x...x...x...x...", clap: "....x.......x...", ch: "x.x.x.x.x.x.x.x.", oh: "..x...x...x...x.", perc: ".x...x.x.x...x.x", bass: "..R...R...R...O.", chords: "...x..x....x..x.", chordLen: "16n", keys: "stab", lead: "", pad: false, swing: 0 },
  { title: "Steel Grid", genre: "Techno", prog: ["Am", "Am", "Am", "Am"], kick: "x...x...x...x...", clap: "....x.......x...", ch: "xxxxxxxxxxxxxxxx", oh: "..x...x...x...x.", perc: "...x.....x....x.", bass: ".RRO.RRO.RRO.RRO", chords: "x.....x.........", chordLen: "32n", keys: "stab", lead: "aaaaaaaaaaaaaaaa", pad: false, swing: 0 },
  { title: "Mirrorball", genre: "Disco", prog: ["Am", "Dm", "G", "C"], kick: "x...x...x...x...", clap: "....x.......x...", ch: "xxxxxxxxxxxxxxxx", oh: "..x...x...x...x.", perc: "x.x.x.x.x.x.x.x.", bass: "RORORORORORORORO", chords: "", chordLen: "16n", keys: "stab", lead: "a.a.a.a.a.a.a.a.", pad: true, swing: 0 },
  { title: "Undertow", genre: "Deep", prog: ["Am", "Dm", "F", "Em"], kick: "x...x...x...x...", clap: "....x.......x...", ch: "..x...x...x...x.", oh: "..............x.", perc: ".......x.......x", bass: "R.....R...F.....", chords: "x.........x.....", chordLen: "4n", keys: "keys", lead: "", pad: true, swing: 0.12 },
  { title: "Paper Rain", genre: "Lo-fi", prog: ["Am", "Dm", "Em", "F"], kick: "x......x..x.....", clap: "........x.......", ch: "x.x.x.x.x.x.x.x.", oh: "................", perc: "....x.......x...", bass: "R......R..F.....", chords: "x.........x.....", chordLen: "2n", keys: "keys", lead: "......3..2....0.", pad: false, swing: 0.34 },
  { title: "Signal Bloom", genre: "Melodic", prog: ["Am", "F", "C", "G"], kick: "x...x...x...x...", clap: "....x.......x...", ch: "..x...x...x...x.", oh: "..x...x...x...x.", perc: "x..x..x..x..x...", bass: "R.R.R.R.R.R.R.R.", chords: "", chordLen: "16n", keys: "stab", lead: "aaaaaaaaaaaaaaaa", pad: true, swing: 0 },
  { title: "Two Step Tide", genre: "Garage", prog: ["Am", "F", "Dm", "Em"], kick: "x.........x.....", clap: "....x.......x...", ch: "x.xxx.xxx.xxx.xx", oh: "......x.......x.", perc: ".x.....x.x......", bass: "R..R...R.R..F...", chords: "..x...x...x..x..", chordLen: "16n", keys: "organ", lead: "", pad: false, swing: 0.4 },
  { title: "Chrome Pulse", genre: "Electro", prog: ["Am", "Am", "G", "F"], kick: "x.....x...x.....", clap: "....x.......x...", ch: "xxxxxxxxxxxxxxxx", oh: "..............x.", perc: "...x..x....x..x.", bass: "R.RO.R.RO.R.R.RO", chords: "x..x..x.........", chordLen: "16n", keys: "stab", lead: "", pad: false, swing: 0 },
];
const hit = (line, s) => !!line && line[s] !== undefined && line[s] !== ".";
function sectionOf(bar) {
  if (bar < 8) return { kick: bar >= 2, clap: bar >= 4, hats: true, perc: bar >= 4, bass: false, harmony: false, pad: false, lead: false, riser: false };
  if (bar < 24) return { kick: true, clap: true, hats: true, perc: true, bass: true, harmony: true, pad: true, lead: bar >= 16, riser: false };
  if (bar < 32) return { kick: false, clap: bar >= 30, hats: bar >= 28, perc: false, bass: false, harmony: true, pad: true, lead: true, riser: bar >= 28 };
  if (bar < 44) return { kick: true, clap: true, hats: true, perc: true, bass: true, harmony: true, pad: true, lead: true, riser: false };
  return { kick: true, clap: true, hats: true, perc: bar < 46, bass: false, harmony: false, pad: false, lead: false, riser: false };
}
// what the screen's waveform shows: low, mid and high energy for every 16th of a track
function waveOf(track) {
  const out = [];
  for (let step = 0; step < STEPS; step++) {
    const bar = Math.floor(step / 16);
    const s = step % 16;
    const on = sectionOf(bar);
    let low = 0.08;
    let mid = 0.06;
    let high = 0.05;
    if (on.kick && hit(track.kick, s)) low += 0.85;
    if (on.bass && hit(track.bass, s)) low += 0.35;
    if (on.clap && hit(track.clap, s)) mid += 0.55;
    if (on.harmony && hit(track.chords, s)) mid += 0.35;
    if (on.pad && track.pad) mid += 0.18;
    if (on.lead && track.lead && hit(track.lead, s)) mid += 0.18;
    if (on.hats && hit(track.ch, s)) high += 0.35;
    if (on.hats && hit(track.oh, s)) high += 0.45;
    if (on.riser) high += ((bar - 28) * 16 + s) / 64;
    out.push([Math.min(1, low), Math.min(1, mid), Math.min(1, high)]);
  }
  return out;
}

// The same booth, on the browser's own Web Audio API: every voice is built from oscillators,
// noise and filters at the moment it plays, scheduled a little ahead of the audio clock.
export function makeEngine() {
  let ctx = null;
  const listeners = {};
  const on = (name, fn) => (listeners[name] ??= []).push(fn);
  const emit = (name, ...args) => (listeners[name] ?? []).forEach((fn) => fn(...args));
  const later = (time, fn) => setTimeout(fn, Math.max(0, (time - ctx.currentTime) * 1000));
  const db = (d) => Math.pow(10, d / 20);
  const beatSec = (bpm = BPM) => 60 / bpm;
  const ramp = (param, value, t = 0.04) => param.setTargetAtTime(value, ctx.currentTime, t / 3);
  let noise = null;

  // ---------- building blocks ----------
  const gain = (v = 1) => {
    const g = ctx.createGain();
    g.gain.value = v;
    return g;
  };
  const biquad = (type, frequency, Q = 0.7, gainDb = 0) => {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = frequency;
    f.Q.value = Q;
    f.gain.value = gainDb;
    return f;
  };
  const chain = (...nodes) => {
    for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
    return nodes[nodes.length - 1];
  };
  function impulse(seconds, decay) {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
    return buffer;
  }
  function meterOf(node) {
    const a = ctx.createAnalyser();
    a.fftSize = 1024;
    node.connect(a);
    const data = new Float32Array(a.fftSize);
    let level = 0;
    return () => {
      a.getFloatTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      const rms = Math.sqrt(sum / data.length) * 1.4;
      level = rms > level ? rms : level * 0.86 + rms * 0.14;
      return level;
    };
  }

  // ---------- the state the interface reads ----------
  const mixer = { color: "FILTER", xfader: 0, master: 0.75, booth: 0.5, prelisten: null, cue: { 1: false, 2: false, 3: false, 4: false } };
  const COLOR = ["SPACE", "DUB ECHO", "SWEEP", "NOISE", "CRUSH", "FILTER"];
  const BEAT_FX = ["DELAY", "ECHO", "PING PONG", "SPIRAL", "HELIX", "REVERB", "FLANGER", "PHASER", "FILTER", "TRIPLET FILTER", "TRANS", "ROLL", "TRIPLET ROLL", "MOBIUS"];
  const BEATS = [0.125, 0.25, 0.5, 0.75, 1, 2, 4, 8];
  const INSERT = new Set(["FLANGER", "PHASER", "FILTER", "TRIPLET FILTER", "TRANS", "ROLL", "TRIPLET ROLL"]);
  const beatFx = { type: "ECHO", beat: 4, depth: 0.5, on: false, source: "MASTER", touching: false };
  const ch = {};
  const decks = [0, 1].map((index) => ({
    index,
    channel: index === 0 ? 2 : 3,
    track: null,
    pos: 0,
    clock: 0,
    playing: false,
    ops: [],
    cue: 0,
    hot: Array(8).fill(null),
    loop: { in: null, out: null, on: false },
    loopBeats: 4,
    jumpBeats: 16,
    tempo: 0,
    range: 0.1,
    mt: true,
    sync: false,
    master: index === 0,
    nudge: 0,
    next: 0,
    out: null,
  }));
  const masterDeck = () => decks.find((d) => d.master) ?? decks[0];
  const bpmOf = (d) => (d.sync && !d.master ? BPM * (1 + masterDeck().tempo) : BPM * (1 + d.tempo));
  const rateOf = (d) => (bpmOf(d) / BPM) * (1 + d.nudge);
  const pitchOf = (d) => (d.mt ? 1 + d.nudge : rateOf(d));

  let master = {};
  let fx = {};
  let shared = {};

  function build() {
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    // master: level → dry → sum → a fast compressor as the limiter
    master.in = gain(1);
    master.level = gain(db(-3));
    master.dry = gain(1);
    master.sum = gain(1);
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -4;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.12;
    const makeup = gain(db(2));
    chain(master.in, master.level, master.dry, master.sum, limiter, makeup, ctx.destination);
    const split = ctx.createChannelSplitter(2);
    makeup.connect(split);
    const l = gain(1);
    const r = gain(1);
    split.connect(l, 0);
    split.connect(r, 1);
    master.meterL = meterOf(l);
    master.meterR = meterOf(r);
    // shared returns for Space (a hall) and Dub Echo (a dark delay)
    shared.space = ctx.createConvolver();
    shared.space.buffer = impulse(4.5, 3);
    chain(shared.space, biquad("highpass", 300), master.in);
    shared.dub = ctx.createDelay(4);
    shared.dub.delayTime.value = beatSec() * 0.75;
    const dubFb = gain(0.62);
    const dubLp = biquad("lowpass", 1800);
    chain(shared.dub, dubLp, dubFb, shared.dub);
    dubLp.connect(master.in);
    // channels 2 and 3
    for (const n of [2, 3]) ch[n] = channel(n);
    // the players' line outputs, set so a full mix sits around −12 dBFS on the master
    decks.forEach((d) => {
      d.out = gain(db(-5));
      d.out.connect(ch[d.channel].input);
    });
    buildBeatFx();
  }

  function channel(number) {
    const c = { number, v: { trim: 0.5, hi: 0.5, mid: 0.5, low: 0.5, color: 0, fader: 0.75, assign: number === 2 ? "A" : "B" } };
    c.input = gain(1);
    c.trim = gain(1);
    c.low = biquad("lowshelf", 220);
    c.mid = biquad("peaking", 1000, 0.7);
    c.high = biquad("highshelf", 3000);
    // Crush: a stepped waveshaper, mixed in by the knob
    c.crushIn = gain(1);
    c.crushDry = gain(1);
    c.crushWet = gain(0);
    c.crush = ctx.createWaveShaper();
    c.crushOut = gain(1);
    // Sweep: a 16th-note gate whose depth the knob sets
    c.gate = gain(1);
    c.gateLfo = ctx.createOscillator();
    c.gateLfo.type = "square";
    c.gateDepth = gain(0);
    c.gateLfo.connect(c.gateDepth);
    c.gateDepth.connect(c.gate.gain);
    c.gateLfo.frequency.value = (BPM / 60) * 4;
    c.gateLfo.start();
    c.hp = biquad("highpass", 10, 1);
    c.lp = biquad("lowpass", 20000, 1);
    // Noise: filtered white noise blended in
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    src.start();
    c.noiseBp = biquad("bandpass", 2000, 0.8);
    c.noiseGain = gain(0);
    chain(src, c.noiseBp, c.noiseGain, c.lp);
    chain(c.input, c.trim, c.low, c.mid, c.high, c.crushIn);
    c.crushIn.connect(c.crushDry);
    chain(c.crushIn, c.crush, c.crushWet);
    c.crushDry.connect(c.crushOut);
    c.crushWet.connect(c.crushOut);
    chain(c.crushOut, c.gate, c.hp, c.lp);
    c.meter = meterOf(c.lp);
    c.spaceSend = gain(0);
    c.dubSend = gain(0);
    c.lp.connect(c.spaceSend);
    c.lp.connect(c.dubSend);
    c.spaceSend.connect(shared.space);
    c.dubSend.connect(shared.dub);
    c.fader = gain(0.6);
    c.xf = gain(1);
    c.fxDry = gain(1);
    chain(c.lp, c.fader, c.xf, c.fxDry, master.in);
    return c;
  }

  // ---------- the mixer ----------
  const eqDb = (v) => (v <= 0.02 ? -40 : v < 0.5 ? -26 * Math.pow(1 - v / 0.5, 1.4) : 6 * ((v - 0.5) / 0.5));
  function crushCurve(bits) {
    const steps = Math.pow(2, bits);
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.round(x * steps) / steps;
    }
    return curve;
  }
  function applyColor(c) {
    const x = c.v.color;
    const a = Math.abs(x);
    const type = mixer.color;
    const amount = type === "FILTER" ? a : a * 0.55;
    ramp(c.lp.frequency, x < -0.02 ? 20000 * Math.pow(160 / 20000, amount) : 20000);
    ramp(c.hp.frequency, x > 0.02 ? 20 * Math.pow(4000 / 20, amount) : 10);
    c.lp.Q.value = type === "FILTER" && x < -0.02 ? 3 : 1;
    c.hp.Q.value = type === "FILTER" && x > 0.02 ? 3 : 1;
    ramp(c.spaceSend.gain, type === "SPACE" ? a * 0.9 : 0);
    ramp(c.dubSend.gain, type === "DUB ECHO" ? a * 0.8 : 0);
    ramp(c.gateDepth.gain, type === "SWEEP" ? a * 0.5 : 0);
    ramp(c.gate.gain, type === "SWEEP" ? 1 - a * 0.5 : 1);
    c.gateLfo.frequency.value = (BPM / 60) * (x < 0 ? 4 : 8);
    ramp(c.noiseGain.gain, type === "NOISE" ? a * 0.12 : 0);
    ramp(c.noiseBp.frequency, x < 0 ? 600 + 2000 * (1 - a) : 2000 + 8000 * a);
    const wet = type === "CRUSH" ? Math.min(1, a * 1.4) : 0;
    ramp(c.crushWet.gain, wet);
    ramp(c.crushDry.gain, 1 - wet);
    if (type === "CRUSH") c.crush.curve = crushCurve(Math.max(2, Math.round(12 - a * 9)));
  }
  function xfGains() {
    const t = (mixer.xfader + 1) / 2;
    return { A: Math.cos((t * Math.PI) / 2), B: Math.sin((t * Math.PI) / 2), THRU: 1 };
  }
  function applyXf() {
    const g = xfGains();
    for (const c of Object.values(ch)) {
      let want = g[c.v.assign];
      if (mixer.prelisten !== null) want = c.number === mixer.prelisten ? 1 : 0.1 * want;
      ramp(c.xf.gain, want, 0.05);
    }
  }
  const mixerApi = {
    COLOR,
    state: mixer,
    channels: ch,
    set(n, key, value) {
      const c = ch[n];
      if (!c) return;
      c.v[key] = value;
      if (key === "trim") ramp(c.trim.gain, db(-12 + value * 21));
      if (key === "hi") ramp(c.high.gain, eqDb(value));
      if (key === "mid") ramp(c.mid.gain, eqDb(value));
      if (key === "low") ramp(c.low.gain, eqDb(value));
      if (key === "color") applyColor(c);
      if (key === "fader") ramp(c.fader.gain, Math.pow(value, 2.2) * 1.15);
      if (key === "assign") applyXf();
    },
    setColor(type) {
      mixer.color = type;
      Object.values(ch).forEach(applyColor);
    },
    setXfader(v) {
      mixer.xfader = v;
      applyXf();
    },
    setMaster(v) {
      mixer.master = v;
      ramp(master.level.gain, v <= 0.01 ? 0 : db(-30 + v * 36), 0.05);
    },
    setBooth(v) {
      mixer.booth = v;
    },
    cue(n) {
      mixer.cue[n] = !mixer.cue[n];
      if (!ch[n]) return 0;
      mixer.prelisten = n;
      applyXf();
      const ms = beatSec(bpmOf(masterDeck())) * 8 * 1000;
      clearTimeout(mixerApi._t);
      mixerApi._t = setTimeout(() => {
        mixer.prelisten = null;
        applyXf();
        emit("mixer");
      }, ms);
      return ms;
    },
  };

  // ---------- Beat FX: one unit, fed from channel 2, channel 3 or the master ----------
  function buildBeatFx() {
    fx.bus = gain(1);
    fx.gate = gain(1);
    fx.ret = gain(0);
    fx.ret.connect(master.sum);
    fx.taps = { MASTER: gain(0), 2: gain(0), 3: gain(0) };
    master.level.connect(fx.taps.MASTER);
    ch[2].xf.connect(fx.taps[2]);
    ch[3].xf.connect(fx.taps[3]);
    Object.values(fx.taps).forEach((t) => t.connect(fx.bus));
    fx.bus.connect(fx.gate);
    const delayUnit = (feedback, tone) => {
      const input = gain(1);
      const d = ctx.createDelay(8);
      const fb = gain(feedback);
      const out = gain(1);
      input.connect(d);
      if (tone) chain(d, tone, fb, d);
      else chain(d, fb, d);
      (tone ?? d).connect(out);
      return { input, out, time: (s) => ramp(d.delayTime, Math.min(s, 7.9), 0.03) };
    };
    const lfoOn = (param, centre, depth, type = "sine") => {
      const o = ctx.createOscillator();
      o.type = type;
      const g = gain(depth);
      param.value = centre;
      chain(o, g, param);
      o.start();
      return o;
    };
    const units = {};
    units.DELAY = delayUnit(0.45);
    units.ECHO = delayUnit(0.66, biquad("lowpass", 2600));
    units.SPIRAL = delayUnit(0.8, biquad("highpass", 400));
    units.HELIX = delayUnit(0.93);
    units.ROLL = delayUnit(0.97);
    units["TRIPLET ROLL"] = delayUnit(0.97);
    {
      const input = gain(1);
      const l = ctx.createDelay(4);
      const r = ctx.createDelay(4);
      const fbL = gain(0.5);
      const fbR = gain(0.5);
      const merge = ctx.createChannelMerger(2);
      input.connect(l);
      chain(l, fbL, r);
      chain(r, fbR, l);
      l.connect(merge, 0, 0);
      r.connect(merge, 0, 1);
      units["PING PONG"] = { input, out: merge, time: (s) => (ramp(l.delayTime, s, 0.03), ramp(r.delayTime, s, 0.03)) };
    }
    {
      const input = gain(1);
      const conv = ctx.createConvolver();
      conv.buffer = impulse(5, 2.6);
      input.connect(conv);
      units.REVERB = { input, out: conv, time: () => {} };
    }
    {
      const input = gain(1);
      const d = ctx.createDelay(0.05);
      const fb = gain(0.72);
      const out = gain(1);
      input.connect(d);
      chain(d, fb, d);
      d.connect(out);
      const o = lfoOn(d.delayTime, 0.004, 0.003);
      units.FLANGER = { input, out, time: (s) => (o.frequency.value = 1 / Math.max(0.05, s * 2)) };
    }
    {
      const input = gain(1);
      const stages = [0, 1, 2, 3].map(() => biquad("allpass", 800, 4));
      chain(input, ...stages);
      const os = stages.map((st) => lfoOn(st.frequency, 900, 700));
      units.PHASER = { input, out: stages[3], time: (s) => os.forEach((o) => (o.frequency.value = 1 / Math.max(0.05, s * 2))) };
    }
    for (const name of ["FILTER", "TRIPLET FILTER"]) {
      const input = gain(1);
      const f = biquad("lowpass", 2000, 4);
      input.connect(f);
      const o = lfoOn(f.frequency, 2200, 1900);
      units[name] = { input, out: f, time: (s) => (o.frequency.value = 1 / Math.max(0.05, s * 2)) };
    }
    {
      const input = gain(0.5);
      const o = lfoOn(input.gain, 0.5, 0.5, "square");
      units.TRANS = { input, out: input, time: (s) => (o.frequency.value = 1 / Math.max(0.03, s)) };
    }
    {
      const input = gain(0);
      const osc = ctx.createOscillator();
      const out = gain(0);
      const saw = ctx.createOscillator();
      saw.type = "sawtooth";
      const depth = gain(800);
      osc.frequency.value = 1000;
      chain(saw, depth, osc.frequency);
      chain(osc, out);
      osc.start();
      saw.start();
      units.MOBIUS = { input, out, mobius: out, time: (s) => (saw.frequency.value = 1 / Math.max(0.1, s * 2)) };
    }
    fx.units = units;
    Object.values(units).forEach((u) => u.out.connect(fx.ret));
    routeBeatFx();
  }
  function routeBeatFx() {
    try { fx.gate.disconnect(); } catch {}
    fx.gate.connect(fx.units[beatFx.type].input);
    applyBeatFx();
  }
  function applyBeatFx() {
    const active = beatFx.on || beatFx.touching;
    const sec = BEATS[beatFx.beat] * beatSec(bpmOf(masterDeck()));
    const type = beatFx.type;
    const time = type === "TRIPLET ROLL" || type === "TRIPLET FILTER" ? (sec * 2) / 3 : sec;
    fx.units[type].time(time);
    const insert = INSERT.has(type);
    for (const [key, tap] of Object.entries(fx.taps)) ramp(tap.gain, active && String(beatFx.source) === key ? 1 : 0, 0.03);
    ramp(fx.ret.gain, active ? (insert ? beatFx.depth : beatFx.depth * 0.85) : 0, 0.04);
    ramp(fx.units.MOBIUS.mobius.gain, active && type === "MOBIUS" ? beatFx.depth * 0.08 : 0, 0.05);
    const dry = active && insert ? 1 - beatFx.depth * 0.95 : 1;
    ramp(master.dry.gain, beatFx.source === "MASTER" ? dry : 1, 0.03);
    for (const n of [2, 3]) ramp(ch[n].fxDry.gain, String(beatFx.source) === String(n) ? dry : 1, 0.03);
    // a roll records one slice, then repeats it: the gate opens for one beat length, then closes
    const now = ctx.currentTime;
    fx.gate.gain.cancelScheduledValues(now);
    if ((type === "ROLL" || type === "TRIPLET ROLL") && active) {
      fx.gate.gain.setValueAtTime(1, now);
      fx.gate.gain.setValueAtTime(0, now + Math.min(time, 1));
    } else fx.gate.gain.setTargetAtTime(1, now, 0.01);
  }
  const beatFxApi = {
    LIST: BEAT_FX,
    BEATS,
    state: beatFx,
    select(type) {
      beatFx.type = type;
      routeBeatFx();
    },
    beat(i) {
      beatFx.beat = Math.max(0, Math.min(BEATS.length - 1, i));
      applyBeatFx();
    },
    depth(v) {
      beatFx.depth = v;
      applyBeatFx();
    },
    source(s) {
      beatFx.source = s;
      applyBeatFx();
    },
    toggle() {
      beatFx.on = !beatFx.on;
      applyBeatFx();
    },
    touch(i) {
      beatFx.touching = i !== null;
      if (i !== null) beatFx.beat = i;
      applyBeatFx();
    },
  };

  // ---------- voices: built per note ----------
  const NOTE = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };
  const freqOf = (name, shift = 0) => {
    const m = /^([A-G]#?)(-?\d)$/.exec(name);
    return 440 * Math.pow(2, (NOTE[m[1]] + (Number(m[2]) + 1) * 12 + shift - 69) / 12);
  };
  function env(g, t, attack, peak, decay, sustain, length, release) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.setTargetAtTime(peak * sustain, t + attack, decay / 3);
    g.gain.setTargetAtTime(0.0001, t + Math.max(attack, length), release / 3);
    return t + Math.max(attack, length) + release * 2;
  }
  function noiseHit(out, t, type, freq, Q, level, decay) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const f = biquad(type, freq, Q);
    const g = gain(0);
    chain(src, f, g, out);
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + decay);
    src.start(t, Math.random());
    src.stop(t + decay + 0.05);
  }
  function osc(type, f, detuneCents = 0) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = detuneCents;
    return o;
  }
  const voices = {
    kick(out, t, v) {
      const o = osc("sine", 150);
      const g = gain(0);
      chain(o, g, out);
      o.frequency.setValueAtTime(160, t);
      o.frequency.exponentialRampToValueAtTime(46, t + 0.09);
      g.gain.setValueAtTime(0.9 * v, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
      o.start(t);
      o.stop(t + 0.45);
    },
    clap(out, t, v) {
      [0, 0.011, 0.022].forEach((dt, i) => noiseHit(out, t + dt, "bandpass", 1400, 0.9, (i === 2 ? 0.35 : 0.22) * v, i === 2 ? 0.16 : 0.03));
    },
    ch: (out, t, v) => noiseHit(out, t, "highpass", 7800, 0.7, 0.12 * v, 0.045),
    oh: (out, t, v) => noiseHit(out, t, "highpass", 7800, 0.7, 0.1 * v, 0.22),
    perc: (out, t, v) => noiseHit(out, t, "bandpass", 5200, 2, 0.16 * v, 0.035),
    bass(out, t, v, f, len) {
      const g = gain(0);
      const lp = biquad("lowpass", 95, 2);
      chain(lp, g, out);
      [-6, 6].forEach((dc) => {
        const o = osc("sawtooth", f, dc);
        o.connect(lp);
        o.start(t);
        o.stop(t + len + 0.3);
      });
      lp.frequency.setValueAtTime(95 * 9, t);
      lp.frequency.setTargetAtTime(95 * 2, t, 0.06);
      env(g, t, 0.004, 0.32 * v, 0.2, 0.4, len, 0.08);
    },
    stab(out, t, v, freqs, len) {
      const lp = biquad("lowpass", 3200, 0.8);
      const g = gain(0);
      chain(lp, g, out);
      freqs.forEach((f) => [-9, 0, 9].forEach((dc) => {
        const o = osc("sawtooth", f, dc);
        o.connect(lp);
        o.start(t);
        o.stop(t + len + 0.4);
      }));
      env(g, t, 0.003, 0.05 * v, 0.22, 0.18, len, 0.12);
    },
    keys(out, t, v, freqs, len) {
      freqs.forEach((f) => {
        const car = osc("sine", f);
        const mod = osc("sine", f * 3);
        const depth = gain(f * 2);
        const g = gain(0);
        chain(mod, depth, car.frequency);
        chain(car, g, out);
        depth.gain.setValueAtTime(f * 2, t);
        depth.gain.setTargetAtTime(f * 0.3, t, 0.15);
        const end = env(g, t, 0.01, 0.07 * v, 1, 0.3, len, 0.9);
        car.start(t);
        mod.start(t);
        car.stop(end);
        mod.stop(end);
      });
    },
    organ(out, t, v, freqs, len) {
      const lp = biquad("lowpass", 2400);
      const g = gain(0);
      chain(lp, g, out);
      freqs.forEach((f) => {
        const o = osc("square", f);
        o.connect(lp);
        o.start(t);
        o.stop(t + len + 0.3);
      });
      env(g, t, 0.004, 0.035 * v, 0.12, 0.3, len, 0.08);
    },
    pad(out, t, v, freqs, len) {
      const lp = biquad("lowpass", 1900);
      const g = gain(0);
      chain(lp, g, out);
      freqs.forEach((f) => [-14, 0, 14].forEach((dc) => {
        const o = osc("sawtooth", f, dc);
        o.connect(lp);
        o.start(t);
        o.stop(t + len + 2.2);
      }));
      env(g, t, 0.5, 0.02 * v, 0.3, 0.75, len, 1);
    },
    lead(out, t, v, f, len) {
      const lp = biquad("lowpass", 3600, 1.5);
      const g = gain(0);
      const o = osc("square", f);
      chain(o, lp, g, out);
      const end = env(g, t, 0.002, 0.05 * v, 0.1, 0.15, len, 0.08);
      o.start(t);
      o.stop(end);
    },
    riser(out, t, len) {
      const src = ctx.createBufferSource();
      src.buffer = noise;
      src.loop = true;
      const bp = biquad("bandpass", 400, 2);
      const g = gain(0);
      chain(src, bp, g, out);
      bp.frequency.setValueAtTime(400, t);
      bp.frequency.exponentialRampToValueAtTime(8000, t + len);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.09, t + len * 0.97);
      g.gain.linearRampToValueAtTime(0, t + len);
      src.start(t);
      src.stop(t + len + 0.05);
    },
  };

  // ---------- the players ----------
  function play(deck, t) {
    if (deck.track === null) return;
    const track = TRACKS[deck.track];
    const step = deck.pos;
    const bar = Math.floor(step / 16);
    const s = step % 16;
    const on = sectionOf(bar);
    const out = deck.out;
    const sixteenth = beatSec(bpmOf(deck)) / 4;
    const tt = t + (track.swing && s % 2 === 1 ? sixteenth * track.swing * 0.6 : 0);
    const pitch = pitchOf(deck);
    const chordName = track.prog[bar % 4];
    const len = (n) => ({ "32n": 0.5, "16n": 1, "8n": 2, "4n": 4, "2n": 8, "1m": 16 }[n] * sixteenth);
    if (on.kick && hit(track.kick, s)) {
      voices.kick(out, tt, 0.95);
      later(tt, () => emit("kick", deck.index));
    }
    if (on.clap && hit(track.clap, s)) voices.clap(out, tt, 0.85);
    if (on.hats && hit(track.oh, s)) voices.oh(out, tt, 0.6);
    else if (on.hats && hit(track.ch, s)) voices.ch(out, tt, s % 4 === 2 ? 0.9 : 0.55);
    if (on.perc && hit(track.perc, s)) voices.perc(out, tt, 0.6);
    if (on.bass && hit(track.bass, s)) {
      const sym = track.bass[s];
      const f = freqOf(ROOT[chordName], sym === "O" ? 12 : sym === "F" ? 7 : 0) * pitch;
      voices.bass(out, tt, 0.9, f, len(track.genre === "Lo-fi" || track.genre === "Deep" ? "4n" : "16n"));
    }
    if (on.harmony && hit(track.chords, s)) voices[track.keys](out, tt, 0.75, CHORD[chordName].map((n) => freqOf(n) * pitch), len(track.chordLen));
    if (on.pad && track.pad && s === 0) voices.pad(out, tt, 0.6, CHORD[chordName].map((n) => freqOf(n) * pitch), len("1m"));
    if (on.lead && track.lead && hit(track.lead, s)) {
      const sym = track.lead[s];
      const pool = CHORD[chordName];
      const note = sym === "a" ? pool[(s + bar) % pool.length] : pool[Number(sym) % pool.length];
      voices.lead(out, tt, sym === "a" ? (s % 4 === 0 ? 0.8 : 0.5) : 0.7, freqOf(note, 12) * pitch, len(sym === "a" ? "32n" : "8n"));
    }
    if (on.riser && s === 0 && bar === 28) voices.riser(out, tt, beatSec(bpmOf(deck)) * 16);
  }
  function tick(deck, t) {
    const due = deck.ops.filter((op) => (op.at === "beat" ? deck.clock % 4 === 0 : deck.clock % 16 === 0));
    deck.ops = deck.ops.filter((op) => !due.includes(op));
    due.forEach((op) => op.fn(t));
    if (due.length) later(t, () => emit("deck", deck.index));
    deck.clock++;
    if (!deck.playing || deck.track === null) return;
    if (deck.loop.on && deck.loop.out !== null && deck.pos >= deck.loop.out) deck.pos = deck.loop.in;
    if (deck.pos >= STEPS) {
      deck.playing = false;
      later(t, () => emit("deck", deck.index));
      return;
    }
    play(deck, t);
    if (deck.pos % 4 === 0) later(t, () => emit("beat", deck.index, deck.pos));
    deck.pos++;
  }
  // a look-ahead scheduler: every 25 ms, queue every sixteenth that falls in the next 120 ms
  function schedule() {
    const horizon = ctx.currentTime + 0.12;
    for (const d of decks) {
      while (d.next < horizon) {
        tick(d, d.next);
        d.next += beatSec(bpmOf(d) * (1 + d.nudge)) / 4;
      }
    }
  }

  const beatOf = (pos) => Math.floor(pos / 4) * 4;
  const queue = (deck, at, fn) => {
    deck.ops.push({ at, fn });
    emit("deck", deck.index);
  };
  function jogGate(d, vel) {
    const g = ch[d.channel].input.gain;
    const now = ctx.currentTime;
    g.cancelScheduledValues(now);
    if (Math.abs(vel) > 0.9) {
      const s = beatSec() / 8;
      g.setValueAtTime(1, now);
      g.setValueAtTime(0.2, now + s * 0.5);
      g.setValueAtTime(1, now + s);
    } else g.setTargetAtTime(1, now, 0.02);
  }
  const deckApi = {
    TRACKS,
    STEPS,
    BARS,
    decks,
    bpmOf,
    load(i, trackIndex) {
      const d = decks[i];
      const go = () => {
        d.track = trackIndex;
        d.pos = 0;
        d.cue = 0;
        d.hot = Array(8).fill(null);
        d.loop = { in: null, out: null, on: false };
      };
      if (d.playing) queue(d, "bar", go);
      else go();
      emit("deck", i);
    },
    playPause(i) {
      const d = decks[i];
      if (d.track === null) return "empty";
      if (d.playing) queue(d, "beat", () => (d.playing = false));
      else queue(d, "bar", () => (d.playing = true));
      return d.playing ? "pause" : "play";
    },
    cue(i) {
      const d = decks[i];
      if (d.track === null) return "empty";
      if (d.playing) {
        queue(d, "beat", () => {
          d.playing = false;
          d.pos = d.cue;
        });
        return "back";
      }
      d.cue = beatOf(d.pos);
      d.pos = d.cue;
      emit("deck", i);
      return "set";
    },
    hotCue(i, pad) {
      const d = decks[i];
      if (d.track === null) return "empty";
      if (d.hot[pad] === null) {
        d.hot[pad] = d.playing ? beatOf(d.pos + 2) : beatOf(d.pos);
        emit("deck", i);
        return "saved";
      }
      const target = d.hot[pad];
      queue(d, "beat", () => {
        d.pos = target;
        d.playing = true;
      });
      return "jump";
    },
    clearHotCue(i, pad) {
      decks[i].hot[pad] = null;
      emit("deck", i);
    },
    loopIn(i) {
      const d = decks[i];
      if (d.track === null) return;
      d.loop = { in: beatOf(d.pos), out: null, on: false };
      emit("deck", i);
    },
    loopOut(i) {
      const d = decks[i];
      if (d.loop.in === null) return "noin";
      d.loop.out = Math.max(d.loop.in + 4, beatOf(d.pos + 2));
      d.loop.on = true;
      emit("deck", i);
      return "on";
    },
    reloop(i) {
      const d = decks[i];
      if (d.loop.in === null || d.loop.out === null) return "none";
      d.loop.on = !d.loop.on;
      if (d.loop.on) queue(d, "beat", () => (d.pos = d.loop.in));
      emit("deck", i);
      return d.loop.on ? "on" : "exit";
    },
    beatLoop(i, which) {
      const d = decks[i];
      if (d.track === null) return;
      if (d.loop.on) {
        const len = (d.loop.out - d.loop.in) / 4;
        const next = which === "half" ? Math.max(1, len / 2) : Math.min(8, len * 2);
        d.loop.out = d.loop.in + next * 4;
        d.loopBeats = next;
      } else {
        const len = which === "half" ? 4 : 8;
        const from = beatOf(d.pos + 2);
        d.loop = { in: from, out: from + len * 4, on: true };
        d.loopBeats = len;
      }
      emit("deck", i);
      return d.loopBeats;
    },
    beatJump(i, dir) {
      const d = decks[i];
      if (d.track === null) return;
      queue(d, "beat", () => {
        d.pos = Math.max(0, Math.min(STEPS - 4, d.pos + dir * d.jumpBeats * 4));
        if (d.loop.on) {
          d.loop.in += dir * d.jumpBeats * 4;
          d.loop.out += dir * d.jumpBeats * 4;
        }
      });
    },
    setJump(i, beats) {
      decks[i].jumpBeats = beats;
      emit("deck", i);
    },
    needle(i, fraction) {
      const d = decks[i];
      if (d.track === null) return;
      const target = beatOf(Math.floor(fraction * STEPS));
      if (d.playing) queue(d, "beat", () => (d.pos = target));
      else {
        d.pos = target;
        emit("deck", i);
      }
    },
    setTempo(i, v) {
      decks[i].tempo = v;
      emit("deck", i);
    },
    setRange(i, r) {
      decks[i].range = r;
      emit("deck", i);
    },
    setMt(i, onState) {
      decks[i].mt = onState;
      emit("deck", i);
    },
    setSync(i, onState) {
      const d = decks[i];
      d.sync = onState;
      if (onState && !d.master) {
        // line this deck's grid up with the master deck: same sixteenth, same clock phase
        const m = masterDeck();
        d.clock += (m.clock - d.clock) % 16;
        d.next = m.next;
      }
      emit("deck", i);
    },
    setMaster(i) {
      decks.forEach((d, n) => (d.master = n === i));
      decks.forEach((_, n) => emit("deck", n));
    },
    jog(i, vel, turns) {
      const d = decks[i];
      if (d.track === null) return;
      if (!d.playing) {
        d.pos = Math.max(0, Math.min(STEPS - 1, Math.round(d.pos + turns * 16)));
        emit("deck", i);
        return;
      }
      d.nudge = Math.max(-0.5, Math.min(0.5, vel * 0.08));
      jogGate(d, vel);
    },
    jogEnd(i) {
      decks[i].nudge = 0;
      ch[decks[i].channel].input.gain.setTargetAtTime(1, ctx.currentTime, 0.03);
    },
  };

  return {
    BPM,
    on,
    mixer: mixerApi,
    beatFx: beatFxApi,
    ...deckApi,
    waves: TRACKS.map(waveOf),
    async start() {
      ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: "interactive" });
      await ctx.resume();
      build();
      mixerApi.setMaster(0.75);
      for (const n of [2, 3]) {
        mixerApi.set(n, "trim", 0.5);
        mixerApi.set(n, "fader", 0.75);
        mixerApi.set(n, "assign", ch[n].v.assign);
      }
      const t0 = ctx.currentTime + 0.1;
      decks.forEach((d) => (d.next = t0));
      setInterval(schedule, 25);
      schedule();
    },
    levels() {
      return { l: master.meterL(), r: master.meterR(), ch2: ch[2].meter(), ch3: ch[3].meter() };
    },
  };
}
