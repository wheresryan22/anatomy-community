// The station stop, as a pure function of time. Units: metres and seconds,
// except the train's position, which is in world units (0.1 m).
const MODEL = {
  brake: 1.1, // service braking, m/s² (DMRC Phase IV standard-gauge spec)
  accel: 1.0, // service acceleration, m/s²
  jerk: 0.75, // comfort jerk limit, m/s³
  stop: 135, // world x of car 1's nose when berthed
  from: -152 - 30, // nose 3 m before the model's end when the clock starts
  gone: -152 - 4, // departing: car 1's nose has left the model
  dwell: 30, // design dwell, s
};

// Distance (m) and speed (m/s) still to go, tau seconds before a jerk-limited stop.
function brakeAt(tau) {
  const B = MODEL.brake;
  const T = B / MODEL.jerk;
  if (tau <= 0) return { d: 0, v: 0, a: 0 };
  if (tau <= T) return { d: (B * tau ** 3) / (6 * T), v: (B * tau * tau) / (2 * T), a: (B * tau) / T };
  const u = tau - T;
  return { d: (B * T * T) / 6 + ((B * T) / 2) * u + (B * u * u) / 2, v: (B * T) / 2 + B * u, a: B };
}

// Distance (m) and speed (m/s) t seconds after a jerk-limited start from rest.
function launchAt(t) {
  const A = MODEL.accel;
  const T = A / MODEL.jerk;
  if (t <= 0) return { s: 0, v: 0 };
  if (t <= T) return { s: (A * t ** 3) / (6 * T), v: (A * t * t) / (2 * T) };
  const u = t - T;
  return { s: (A * T * T) / 6 + ((A * T) / 2) * u + (A * u * u) / 2, v: (A * T) / 2 + A * u };
}

function solve(f, target, hi) {
  let lo = 0;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

const APPROACH = solve((tau) => brakeAt(tau).d, (MODEL.stop - MODEL.from) / 10, 60);
const DEPART = solve((t) => launchAt(t).s, (MODEL.stop - MODEL.gone) / 10, 60);

// Phases: model duration (s) and how fast the idle tour plays them.
const PHASES = [
  { name: "approach", time: APPROACH, speed: 1 },
  { name: "berthed", time: 1.2, speed: 1 },
  { name: "opening", time: 2.6, speed: 1 },
  { name: "dwell", time: MODEL.dwell, speed: 3 },
  { name: "closing", time: 3.2, speed: 1 },
  { name: "locked", time: 1.6, speed: 1 },
  { name: "depart", time: DEPART, speed: 1 },
  { name: "clear", time: 2.4, speed: 1 },
];
let at = 0;
let tourAt = 0;
for (const phase of PHASES) {
  phase.start = at;
  phase.tour = tourAt;
  at += phase.time;
  tourAt += phase.time / phase.speed;
}
const CYCLE = at;
const TOUR = tourAt;

const ease = (u) => {
  const t = Math.min(1, Math.max(0, u));
  return t * t * (3 - 2 * t);
};
// A door's travel: slow start, steady run, cushioned end.
const doorEase = (u) => {
  const t = Math.min(1, Math.max(0, u));
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

function tourToModel(T) {
  const wrapped = ((T % TOUR) + TOUR) % TOUR;
  for (let i = PHASES.length - 1; i >= 0; i--) {
    const p = PHASES[i];
    if (wrapped >= p.tour) return p.start + (wrapped - p.tour) * p.speed;
  }
  return 0;
}

function phaseAt(t) {
  for (let i = PHASES.length - 1; i >= 0; i--) if (t >= PHASES[i].start) return { phase: PHASES[i], index: i, into: t - PHASES[i].start };
  return { phase: PHASES[0], index: 0, into: 0 };
}

function modelToTour(t) {
  const { phase, into } = phaseAt(Math.min(Math.max(t, 0), CYCLE - 1e-6));
  return phase.tour + into / phase.speed;
}

// Everything the figure shows at model time t. offset (world units) is how far from the mark
// a hand-driven train berthed; the stop, doors and departure all happen from there.
function stateAt(t, offset = 0) {
  const { phase, index, into } = phaseAt(Math.min(Math.max(t, 0), CYCLE - 1e-6));
  const berth = MODEL.stop + offset;
  let nose = berth;
  let speed = 0;
  let toGo = 0;
  let doors = 0;
  let gates = 0;
  let moving = 0; // +1 arriving (+x), -1 departing (−x)
  if (phase.name === "approach") {
    const b = brakeAt(APPROACH - into);
    nose = MODEL.stop - b.d * 10;
    speed = b.v;
    toGo = b.d;
    moving = 1;
  } else if (phase.name === "opening") {
    doors = doorEase(into / 2.4);
    gates = doorEase((into - 0.2) / 2.4);
  } else if (phase.name === "dwell") {
    doors = 1;
    gates = 1;
  } else if (phase.name === "closing") {
    gates = 1 - doorEase((into - 0.2) / 2.8);
    doors = 1 - doorEase((into - 0.4) / 2.8);
  } else if (phase.name === "depart") {
    const l = launchAt(into);
    nose = berth - l.s * 10;
    speed = l.v;
    moving = -1;
  } else if (phase.name === "clear") {
    // still accelerating away, out past the model's end
    nose = berth - launchAt(DEPART + into).s * 10;
  }
  const kmh = speed * 3.6;
  let readout = "";
  if (phase.name === "approach") readout = `arriving · ${kmh.toFixed(0)} km/h · ${toGo.toFixed(1)} m to stop`;
  else if (phase.name === "berthed") readout = "berthed · doors released";
  else if (phase.name === "opening") readout = "doors opening";
  else if (phase.name === "dwell") readout = `doors open · ${Math.max(1, Math.ceil(MODEL.dwell - into))} s`;
  else if (phase.name === "closing") readout = "doors closing";
  else if (phase.name === "locked") readout = "doors locked · reversing";
  else if (phase.name === "depart") readout = `departing · ${kmh.toFixed(0)} km/h`;
  else readout = "platform clear";
  return { t, phase: phase.name, index, into, nose, dx: nose - MODEL.stop, speed, kmh, toGo, doors, gates, moving, readout };
}

// ---------- driving it yourself ----------
// The handle has seven service-brake notches. The brake follows the handle at the same comfort jerk
// limit the automatic stop uses, so a late handle is a late stop.
const DRIVE = {
  enter: 22 / 3.6, // m/s: comes into the model slower than the automatic run, to give the driver time
  notches: 7, // B1–B7, B7 = full service brake
  tolerance: 0.3, // ≈ m either side of the mark within which the screen-door gates release
  buffer: 1.54, // m past the mark where the coupler meets the buffer stop
  start: -(MODEL.stop - MODEL.from) / 10, // m: same starting point as the automatic run
};

// x: metres from the mark (negative before it), v: m/s, a: braking m/s². Returns the next state.
function driveStep(s, notch, dt) {
  const want = (notch / DRIVE.notches) * MODEL.brake;
  let { x, v, a } = s;
  const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
  const h = dt / steps;
  for (let i = 0; i < steps && v > 0; i++) {
    const most = MODEL.jerk * h;
    a += Math.max(-most, Math.min(most, want - a));
    const next = v - a * h;
    const dx = next <= 0 ? (v * v) / (2 * Math.max(a, 1e-6)) : ((v + next) / 2) * h;
    if (x + dx >= DRIVE.buffer) return { x: DRIVE.buffer, v: 0, a: 0, hit: v };
    x += dx;
    v = Math.max(0, next);
  }
  return { x, v, a, hit: 0 };
}

// Where the train comes to rest if the handle stays where it is.
function predictStop(s, notch) {
  let p = { ...s, hit: 0 };
  for (let i = 0; i < 2400 && p.v > 0; i++) p = driveStep(p, notch, 1 / 40);
  return p.v > 0 ? { x: DRIVE.buffer, hit: p.v } : p;
}

function driveReadout(s, notch) {
  const handle = notch ? `B${notch}` : "coast";
  const kmh = (s.v * 3.6).toFixed(0);
  return s.x <= 0 ? `${handle} · ${kmh} km/h · ${(-s.x).toFixed(1)} m to mark` : `${handle} · ${kmh} km/h · ${s.x.toFixed(1)} m past mark`;
}

function verdict(s) {
  const ok = !s.hit && Math.abs(s.x) <= DRIVE.tolerance;
  let text;
  if (s.hit) text = `hit the buffer stop at ${(s.hit * 3.6).toFixed(0)} km/h`;
  else if (ok) text = `${Math.abs(s.x).toFixed(2)} m ${s.x >= 0 ? "past" : "short of"} the mark · doors open`;
  else if (s.x < 0) text = `${(-s.x).toFixed(1)} m short · gates stay locked`;
  else text = `${s.x.toFixed(1)} m past · gates stay locked`;
  return { ok, text };
}

// ---------- passengers: at a terminus everyone alights, then the queues board ----------
const WALK = 13; // walking pace, world units per second (1.3 m/s)

function pathLength(path) {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
  return total;
}
function along(path, dist) {
  let left = Math.max(0, dist);
  for (let i = 1; i < path.length; i++) {
    const [ax, ay] = path[i - 1];
    const [bx, by] = path[i];
    const len = Math.hypot(bx - ax, by - ay);
    if (left <= len) return [ax + ((bx - ax) * left) / len, ay + ((by - ay) * left) / len];
    left -= len;
  }
  return path[path.length - 1];
}

// A fixed, repeatable crowd. Geometry comes from the drawing: door centres, the gate plane,
// the queue rows either side of each door, the walking lane behind them and the exit at the model's end.
function crowd({ doors, gateY, queueY, laneY, exitX }) {
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const dwell = PHASES[3].start;
  const offAt = [3, 2, 3, 3, 2];
  const onAt = [2, 3, 2, 3, 3];
  const people = [];
  const lane = () => laneY[0] + rnd() * (laneY[1] - laneY[0]);
  doors.forEach((c, d) => {
    for (let j = 0; j < offAt[d]; j++) {
      const jx = (j % 2 ? 1 : -1) * (0.6 + rnd() * 1.6);
      const y = lane();
      const path = [[c + jx, gateY + 0.5], [c + jx, y], [exitX, y]];
      people.push({ kind: "off", door: d, path, home: path[0], t0: dwell + 0.5 + j * 1.6 + rnd() * 0.5, speed: WALK * (0.95 + rnd() * 0.25), h: 15.8 + rnd() * 2 });
    }
    for (let j = 0; j < onAt[d]; j++) {
      const side = j % 2 ? 1 : -1;
      const row = Math.min(1, Math.floor(j / 2));
      const q = [c + side * (6.4 + rnd() * 0.9), queueY[row] + (rnd() - 0.5) * 0.8];
      const y = lane();
      const arrive = [[exitX, y], [q[0], y], q];
      const board = [q, [c + side * 1.6, gateY + 2.6], [c + side * 0.9, gateY - 1.2]];
      const ready = 2.4 + j * 1.3 + rnd() * 0.6; // in the queue this long into the cycle
      const tb = dwell + offAt[d] * 1.6 + 2.6 + j * 2.2 + rnd() * 0.5;
      people.push({ kind: "on", door: d, arrive, board, home: q, ready, tb, speed: WALK * (0.95 + rnd() * 0.25), h: 15.6 + rnd() * 2.2 });
    }
  });
  // one late runner for the door nearest the exit, through just before the gates close
  const c = doors[doors.length - 1];
  const y = laneY[1];
  const runner = [[exitX, y], [c - 1.2, y], [c - 1.0, gateY + 2.6], [c - 0.8, gateY - 1.2]];
  people.push({ kind: "late", door: doors.length - 1, path: runner, home: runner[0], t0: dwell + MODEL.dwell - 0.6 - pathLength(runner) / (WALK * 1.6), speed: WALK * 1.6, h: 17.2 });
  return people;
}

// Position (world x, y), opacity and walked distance of every passenger at model time t, plus the
// running count off and on. Boarders walk in for the next train while this one leaves.
function crowdAt(people, t) {
  let off = 0;
  let on = 0;
  const out = people.map((p) => {
    if (p.kind !== "on") {
      const len = pathLength(p.path);
      const walked = (t - p.t0) * p.speed;
      if (p.kind === "off" && t >= p.t0) off++;
      if (p.kind === "late" && walked >= len) on++;
      if (walked < 0 || walked >= len) return { x: p.home[0], y: p.home[1], o: 0, walked: 0 };
      const [x, y] = along(p.path, walked);
      const o = p.kind === "off" ? Math.min(1, walked / 3, (len - walked) / 8) : Math.min(1, walked / 6, (len - walked) / 3.5);
      return { x, y, o: Math.max(0, o), walked };
    }
    const inLen = pathLength(p.arrive);
    const outLen = pathLength(p.board);
    const inStart = p.ready - inLen / p.speed;
    const w = (((t - inStart) % CYCLE) + CYCLE) % CYCLE;
    const b0 = (((p.tb - inStart) % CYCLE) + CYCLE) % CYCLE;
    if (t >= p.tb + outLen / p.speed) on++;
    if (w * p.speed < inLen) {
      const walked = w * p.speed;
      const [x, y] = along(p.arrive, walked);
      return { x, y, o: Math.min(1, walked / 6), walked };
    }
    if (w < b0) return { x: p.home[0], y: p.home[1], o: 1, walked: 0 };
    const walked = (w - b0) * p.speed;
    if (walked >= outLen) return { x: p.home[0], y: p.home[1], o: 0, walked: 0 };
    const [x, y] = along(p.board, walked);
    return { x, y, o: Math.max(0, Math.min(1, (outLen - walked) / 3.5)), walked };
  });
  return { people: out, off, on };
}

export { MODEL, PHASES, CYCLE, TOUR, APPROACH, DEPART, DRIVE, WALK, brakeAt, launchAt, stateAt, tourToModel, modelToTour, phaseAt, ease, doorEase, driveStep, predictStop, driveReadout, verdict, crowd, crowdAt, pathLength };
