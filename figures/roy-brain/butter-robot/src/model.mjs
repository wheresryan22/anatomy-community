// The butter robot's model: dimensions, joint chain, kinematics and the pass-butter cycle.
// Pure and self-contained: the build imports it, and the page inlines the same source.
// Units are millimetres, angles degrees. x runs along the table, y across it, z up.

export const HOME = 57;            // robot centre at rest, beside Rick's plate, heading +x
export const DISH = [-215, 0];     // butter dish centre
export const PLATE = [215, 0];     // Rick's plate centre
export const TRAVEL = 141;         // drive from the plate to the dish, along -x
export const BACKUP = 22;          // backs off before turning in place

export const BUTTER = { l: 106, w: 66, h: 36, g: 250 };   // a 250 g block, gripped across its 66 mm width
export const DISH_TOP = 6;
export const STACK_TOP = 33;       // plate 6 + three pancakes of 9
export const MU = 0.35;            // rubber pad on cold butter (assumed)
export const SAFETY = 1.5;
export const GRIP_N = (SAFETY * (BUTTER.g / 1000) * 9.81) / (2 * MU);   // 5.3 N

// Joints, in robot coordinates at rest (x relative to HOME).
export const LEAN_AT = [2, 30];    // mast pivot on the deck
export const TILT_AT = [2, 133];   // neck hinge
export const SHOULDER = [2, 188];  // pitch axis
export const ROLL_AT = [2, 180];   // roll axis (along x) at y = +-50.5
export const ROLL_Y = 50.5;
export const ELBOW = [2, 132];
export const PAD = [2, 83];        // pad centre; its contact face sits at y = +-33
export const PAD_Y = 33;
export const L1 = SHOULDER[1] - ELBOW[1];   // 56
export const L2 = ELBOW[1] - PAD[1];        // 49
export const TRACK_Y = 41;                   // track centre lines at y = +-41
export const OPEN = 6.5;                     // pad clearance when open, mm

const X = (x) => HOME + x;
export const VIEW_AT = [15, 0];   // the table's centre: the whole breakfast turns about it when you orbit
const WHEEL_SPECS = [{ id: "sprocket", x: -34, z: 16, period: 360 / 8 }, { id: "idler", x: 34, z: 16, period: 360 / 8 }, { id: "road1", x: -13.5, z: 10.0, period: 60 }, { id: "road2", x: 0, z: 10.0, period: 60 }, { id: "road3", x: 13.5, z: 10.0, period: 60 }];
// The group chain. Order matters: parents first. Values: slide mm, turn and hinge degrees.
export const GROUPS = [
  { name: "view", kind: "turn", pivot: VIEW_AT },
  { name: "drive", parent: "view", kind: "slide", direction: [-1, 0, 0], travel: TRAVEL },
  { name: "yaw", parent: "drive", kind: "turn", pivot: [HOME, 0] },
  { name: "x.trackL", parent: "yaw", kind: "slide", direction: [0, 1, 0], travel: 30 },
  { name: "x.trackR", parent: "yaw", kind: "slide", direction: [0, -1, 0], travel: 30 },
  ...["L", "R"].flatMap((side) => WHEEL_SPECS.map((w) => ({ name: `spin${side}.${w.id}`, parent: `x.track${side}`, kind: "hinge", point: [X(w.x), side === "L" ? 41 : -41, w.z], axis: [0, 1, 0], range: [0, w.period] }))),
  { name: "x.battery", parent: "yaw", kind: "slide", direction: [0, 0, 1], travel: 34 },
  { name: "lean", parent: "yaw", kind: "hinge", point: [X(LEAN_AT[0]), 0, LEAN_AT[1]], axis: [0, 1, 0], range: [-7, 58] },
  { name: "x.head", parent: "lean", kind: "slide", direction: [0, 0, 1], travel: 46 },
  { name: "tilt", parent: "x.head", kind: "hinge", point: [X(TILT_AT[0]), 0, TILT_AT[1]], axis: [0, 1, 0], range: [-12, 30] },
  { name: "x.lens", parent: "tilt", kind: "slide", direction: [1, 0, 0], travel: 26 },
  ...["L", "R"].flatMap((side) => {
    const s = side === "L" ? 1 : -1;
    return [
      { name: `x.arm${side}`, parent: "tilt", kind: "slide", direction: [0, s, 0], travel: 42 },
      { name: `pitch${side}`, parent: `x.arm${side}`, kind: "hinge", point: [X(SHOULDER[0]), s * 37, SHOULDER[1]], axis: [0, 1, 0], range: [-88, 12] },
      { name: `roll${side}`, parent: `pitch${side}`, kind: "hinge", point: [X(ROLL_AT[0]), s * ROLL_Y, ROLL_AT[1]], axis: [1, 0, 0], range: [-6, 6] },
      { name: `elbow${side}`, parent: `roll${side}`, kind: "hinge", point: [X(ELBOW[0]), s * 46, ELBOW[1]], axis: [0, 1, 0], range: [-70, 28] },
    ];
  }),
  { name: "butter", parent: "view", kind: "free", origin: [DISH[0], 0, DISH_TOP + BUTTER.h / 2] },
];

// ---- rotations, the engine's convention (row-major 3x3, right-handed) ----
const RAD = Math.PI / 180;
export function rot(axis, deg) {
  const n = Math.hypot(axis[0], axis[1], axis[2]);
  const [x, y, z] = [axis[0] / n, axis[1] / n, axis[2] / n];
  const c = Math.cos(deg * RAD), s = Math.sin(deg * RAD), C = 1 - c;
  return [c + x * x * C, x * y * C - z * s, x * z * C + y * s, y * x * C + z * s, c + y * y * C, y * z * C - x * s, z * x * C - y * s, z * y * C + x * s, c + z * z * C];
}
export const mul = (A, B) => { const o = new Array(9); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c]; return o; };
export const apply = (M, p) => [M[0] * p[0] + M[1] * p[1] + M[2] * p[2], M[3] * p[0] + M[4] * p[1] + M[5] * p[2], M[6] * p[0] + M[7] * p[1] + M[8] * p[2]];
const EYE = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const originOf = (g) => (g.kind === "turn" ? [g.pivot[0], g.pivot[1], 0] : g.kind === "hinge" ? g.point : g.kind === "free" ? g.origin : null);

// World poses of every group, as the engine composes them.
export function posesOf(values) {
  const out = {};
  for (const g of GROUPS) {
    const parent = g.parent ? out[g.parent] : null;
    const po = parent ? parent.origin : [0, 0, 0];
    const origin = originOf(g) ?? po;
    const v = values[g.name] ?? 0;
    let R = EYE;
    let t = [origin[0] - po[0], origin[1] - po[1], origin[2] - po[2]];
    if (g.kind === "turn") R = rot([0, 0, 1], v);
    else if (g.kind === "hinge") R = rot(g.axis, v);
    else if (g.kind === "slide") { t = [t[0] + g.direction[0] * v, t[1] + g.direction[1] * v, t[2] + g.direction[2] * v]; }
    else if (g.kind === "free" && v && typeof v === "object") { R = v.R; t = [t[0] + v.t[0], t[1] + v.t[1], t[2] + v.t[2]]; }
    if (!parent) { out[g.name] = { R, t, origin }; continue; }
    const tw = apply(parent.R, t);
    out[g.name] = { R: mul(parent.R, R), t: [tw[0] + parent.t[0], tw[1] + parent.t[1], tw[2] + parent.t[2]], origin };
  }
  return out;
}
export const worldOf = (poses, group, p) => { const g = poses[group]; const d = [p[0] - g.origin[0], p[1] - g.origin[1], p[2] - g.origin[2]]; const w = apply(g.R, d); return [w[0] + g.t[0], w[1] + g.t[1], w[2] + g.t[2]]; };

// ---- the arm in the sagittal plane ----
// A is the upper arm's forward swing from hanging straight down, B the forearm's, both absolute (after lean and tilt).
// Lean, tilt, pitch and elbow all turn about +y, where a positive angle swings a hanging link backwards.
const swing = (deg) => [Math.sin(deg * RAD), -Math.cos(deg * RAD)];
const around = (p, c, deg) => { const a = -deg * RAD, dx = p[0] - c[0], dz = p[1] - c[1]; return [c[0] + dx * Math.cos(a) + dz * Math.sin(a), c[1] - dx * Math.sin(a) + dz * Math.cos(a)]; };
export function shoulderAt(lean, tilt) {
  // rotation about +y by deg: x' = x cos + z sin, z' = -x sin + z cos (relative to the pivot)
  const r = (p, c, deg) => { const a = deg * RAD, dx = p[0] - c[0], dz = p[1] - c[1]; return [c[0] + dx * Math.cos(a) + dz * Math.sin(a), c[1] - dx * Math.sin(a) + dz * Math.cos(a)]; };
  const tilted = r(SHOULDER, TILT_AT, tilt);
  return r(tilted, LEAN_AT, lean);
}
void around;
export function padAt(lean, tilt, A, B) {
  const S = shoulderAt(lean, tilt);
  const u = swing(A), f = swing(B);
  return [S[0] + L1 * u[0] + L2 * f[0], S[1] + L1 * u[1] + L2 * f[1]];
}
// Upper-arm swing that puts the pad on a point, for a fixed forearm swing B (keeps the butter level).
export function reachA(lean, tilt, B, target) {
  const S = shoulderAt(lean, tilt);
  const f = swing(B);
  const u = [target[0] - S[0] - L2 * f[0], target[1] - S[1] - L2 * f[1]];
  return { A: Math.atan2(u[0], -u[1]) / RAD, miss: Math.hypot(u[0], u[1]) - L1 };
}
// Lean that makes the reach exact (|u| = L1), by bisection, upper arm swung forward of the lean.
export function solveLean(tilt, B, target, lo = 0, hi = 64) {
  const miss = (lean) => reachA(lean, tilt, B, target).miss;
  let a = lo, b = hi, fa = miss(a);
  for (let i = 0; i < 60; i++) { const m = (a + b) / 2, fm = miss(m); if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm; } else b = m; }
  const lean = (a + b) / 2;
  return { lean, A: reachA(lean, tilt, B, target).A };
}
export const toJoints = ({ lean, tilt, A, B }) => ({ pitch: -A - lean - tilt, elbow: A - B });

// ---- the cycle ----
const clamp = (x) => Math.min(1, Math.max(0, x));
export const ease = (x) => { const t = clamp(x); return t * t * (3 - 2 * t); };
const ease5 = (x) => { const t = clamp(x); return t * t * t * (t * (t * 6 - 15) + 10); };
const mix = (a, b, x) => a + (b - a) * x;

// Where the pad centre (robot sagittal frame, x forward from the robot centre) has to be.
const GRIP_AT = { f: (HOME - TRAVEL) - DISH[0], z: DISH_TOP + BUTTER.h / 2 };   // 131 ahead, 24 up
const PLACE_AT = { f: PLATE[0] - HOME, z: STACK_TOP + BUTTER.h / 2 };          // 166 ahead, 51 up
export const CARRY_B = 28;   // forearms held at a fixed swing while carrying, so the butter stays level
const GRIP = solveLean(0, CARRY_B, [GRIP_AT.f, GRIP_AT.z]);
const PLACE = solveLean(0, CARRY_B, [PLACE_AT.f, PLACE_AT.z]);
const CARRY = { lean: 10, tilt: 8, A: 28, B: CARRY_B };
const HOVER = (at) => { const s = solveLean(0, CARRY_B, [at.f, at.z + 26]); return { lean: s.lean, tilt: 0, A: s.A, B: CARRY_B }; };
export const KEYS = { GRIP, PLACE, CARRY, GRIP_AT, PLACE_AT };

// ---- the timeline: one smooth curve per value ----
// Each value has its own knots and runs on a monotone cubic (Fritsch–Carlson): it never overshoots a knot,
// holds still where two knots agree, and keeps its speed through a knot it passes, so motions overlap and flow.
const HG = HOVER(GRIP_AT);
const HP = HOVER(PLACE_AT);
const T_ = TRAVEL, B_ = BACKUP;
const KNOTS = {
  drive: [[0, 0], [2.6, 0], [3.7, B_], [5.0, B_], [7.7, T_], [10.4, T_], [11.3, T_ - B_], [12.5, T_ - B_], [15.1, 0]],
  yaw: [[0, 0], [3.4, 0], [5.4, 180], [11.0, 180], [12.8, 360]],
  lean: [[0, 0], [6.6, 0], [7.7, HG.lean], [8.8, GRIP.lean], [9.6, GRIP.lean], [10.9, CARRY.lean], [14.0, CARRY.lean], [15.1, HP.lean], [16.2, PLACE.lean], [17.0, PLACE.lean], [18.4, 0]],
  tilt: [[0, 0], [0.5, 0], [1.2, -7], [2.2, -7], [2.9, 0], [5.4, 0], [6.3, 22], [7.0, 22], [7.7, 0], [9.6, 0], [10.9, CARRY.tilt], [14.0, CARRY.tilt], [15.1, 0], [18.4, 0], [19.6, -10], [23.8, -10], [25.2, 15], [25.8, 15], [25.95, 18], [26.5, 18], [26.65, 21], [27.3, 21], [27.45, 24]],
  A: [[0, 0], [6.6, 0], [7.7, HG.A], [8.8, GRIP.A], [9.6, GRIP.A], [10.9, CARRY.A], [14.0, CARRY.A], [15.1, HP.A], [16.2, PLACE.A], [17.0, PLACE.A], [18.4, 0], [23.8, 0], [25.2, 40]],
  B: [[0, 0], [6.6, 0], [7.7, CARRY_B], [17.0, CARRY_B], [18.4, 0], [23.8, 0], [25.2, 100]],
  open: [[0, 0], [6.4, 0], [7.0, 1], [8.8, 1], [9.3, 0], [16.6, 0], [17.1, 1], [18.2, 1], [18.8, 0]],
  grip: [[0, 0], [9.1, 0], [9.5, 1], [16.3, 1], [16.6, 0]],
  carry: [[0, 0], [9.3, 0], [9.45, 1], [16.25, 1], [16.4, 0]],
  on: [[0, 0], [16.25, 0], [16.4, 1]],
  beam: [[0, 0], [5.4, 0], [6.2, 1], [9.4, 1], [10.0, 0], [14.0, 0], [14.6, 1], [16.3, 1], [16.9, 0]],
  glow: [[0, 0.55], [5.4, 0.55], [6.2, 1], [9.4, 1], [10.0, 0.55], [14.0, 0.55], [14.6, 1], [16.3, 1], [16.9, 0.55], [23.8, 0.55], [25.2, 0.72], [25.8, 0.72], [25.95, 0.5], [26.5, 0.5], [26.65, 0.32], [27.3, 0.32], [27.45, 0.16], [27.8, 0.16], [28.8, 0.05]],
};
const PHASES = [[0, "home"], [0.4, "asked"], [2.6, "backing"], [3.4, "turning"], [5.0, "driving"], [7.7, "reaching"], [9.0, "gripping"], [9.6, "lifting"], [10.4, "backing"], [11.0, "turning"], [12.6, "carrying"], [15.1, "placing"], [16.6, "releasing"], [17.2, "retracting"], [18.9, "purpose"], [21.6, "answer"], [23.8, "realising"]];
export const FETCH = 31.0;
const SLUMP = 27.8;   // the words are out; it gives up

function curve(knots) {
  const n = knots.length;
  const xs = knots.map((k) => k[0]), ys = knots.map((k) => k[1]);
  const d = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const m = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) { m[i] = 0; continue; }
    const w1 = 2 * (xs[i + 1] - xs[i]) + (xs[i] - xs[i - 1]), w2 = (xs[i + 1] - xs[i]) + 2 * (xs[i] - xs[i - 1]);
    m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
  }
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}
const CURVES = Object.fromEntries(Object.entries(KNOTS).map(([k, v]) => [k, curve(v)]));

// A damped swing from `from` to `to`, released at rest at time t0: what a limp arm or a slumping head does.
function swingTo(t, t0, from, to, period, zeta) {
  const tau = Math.max(0, t - t0), w = (2 * Math.PI) / period, wd = w * Math.sqrt(1 - zeta * zeta);
  return to + (from - to) * Math.exp(-zeta * w * tau) * (Math.cos(wd * tau) + ((zeta * w) / wd) * Math.sin(wd * tau));
}
const smooth01 = (a, b, x) => ease((x - a) / (b - a));

// Forward speed and a smoothed acceleration from the drive curve, for the sway.
const speedAt = (t) => { const h = 1 / 240; return (CURVES.drive(t + h) - CURVES.drive(t - h)) / (2 * h); };
const accelAt = (t) => { const w = 0.22; return (speedAt(t + w) - speedAt(t - w)) / (2 * w); };

export function stateAt(t) {
  t = Math.min(FETCH, Math.max(0, t));
  const o = {};
  for (const [k, f] of Object.entries(CURVES)) o[k] = f(t);
  // sway: the head nods back and the arms trail when it speeds up, and pitch forward when it brakes
  const ahead = -Math.cos(o.yaw * RAD) * accelAt(t);
  o.tilt += -0.017 * ahead;
  o.A += -0.028 * ahead * (1 - 0.8 * o.carry);
  // "oh my god": the claws shake in front of its eye, then everything goes limp
  const shake = smooth01(25.1, 25.6, t) * (1 - smooth01(27.6, 27.9, t));
  o.shake = 2.2 * shake * Math.sin(2 * Math.PI * 7.3 * t);
  if (t > SLUMP) {
    o.A = swingTo(t, SLUMP, 40, -6, 0.95, 0.22);
    o.B = swingTo(t, SLUMP + 0.06, 100, -4, 0.9, 0.24);
    o.tilt = swingTo(t, SLUMP + 0.12, 24, 28, 0.8, 0.45);
    o.lean = swingTo(t, SLUMP + 0.18, 0, -5, 1.1, 0.4);
  }
  let phase = PHASES[0][1];
  for (const [at, name] of PHASES) if (t >= at) phase = name;
  o.phase = phase;
  return o;
}

// What is said, and when (played only while it passes the butter, not while it takes it back).
export const LINES = [
  { who: "Rick", text: "Pass the butter.", from: 0.4, to: 2.9, lit: "butter" },
  { who: "Robot", text: "What is my purpose?", from: 18.9, to: 21.4, lit: "head" },
  { who: "Rick", text: "You pass butter.", from: 21.6, to: 23.7, lit: "butter" },
  { who: "Robot", text: "Oh. My. God.", words: [["Oh.", 25.8], ["My.", 26.5], ["God.", 27.3]], from: 25.7, to: Infinity, lit: "head" },
];
export function lineAt(t) {
  for (const line of LINES) {
    if (t < line.from || t > line.to) continue;
    const a = ease((t - line.from) / 0.3) * (line.to === Infinity ? 1 : ease((line.to - t) / 0.3));
    const words = line.words ? line.words.map(([w, at]) => [w, ease((t - at) / 0.18)]) : null;
    return { ...line, alpha: a, words };
  }
  return null;
}
// The status LED flickers with the robot's voice, burns steady while it works, and dies when it slumps.
export function ledAt(t) {
  let talk = 0;
  for (const line of LINES) {
    if (line.who !== "Robot" || t < line.from) continue;
    if (line.words) { for (const [, at] of line.words) talk = Math.max(talk, Math.exp(-Math.max(0, t - at) / 0.22) * smooth01(at - 0.05, at, t)); }
    else if (t < line.to) talk = Math.max(talk, 0.55 + 0.45 * Math.abs(Math.sin(2 * Math.PI * 4.1 * t) * Math.sin(2 * Math.PI * 1.7 * t + 1)));
  }
  const alive = 1 - smooth01(SLUMP, SLUMP + 0.9, t);
  return Math.min(1, (0.35 + 0.65 * talk) * alive);
}

// Belt travel and the power pulse, integrated once over the whole clip (pure lookups after that).
const LUT_HZ = 120;
const LUT = (() => {
  const n = Math.ceil(FETCH * LUT_HZ) + 1;
  const L = new Float64Array(n), R = new Float64Array(n), P = new Float64Array(n);
  let prev = stateAt(0), l = 0, r = 0, p = 0;
  for (let i = 1; i < n; i++) {
    const t = i / LUT_HZ, st = stateAt(t);
    const dd = st.drive - prev.drive, dy = (st.yaw - prev.yaw) * RAD;
    const ahead = -Math.cos(((st.yaw + prev.yaw) / 2) * RAD) * dd;     // drive moves the robot along -x
    l += ahead - TRACK_Y * dy;                                          // turning left runs the left track back
    r += ahead + TRACK_Y * dy;
    const work = Math.min(1, Math.abs(ahead) * LUT_HZ / 70 + Math.abs(dy) * LUT_HZ / 1.2 + Math.abs(st.lean - prev.lean) * LUT_HZ / 25 + ledAt(t) * 0.6);
    p += (0.25 + 1.4 * work) / LUT_HZ;
    L[i] = l; R[i] = r; P[i] = p;
    prev = st;
  }
  return { L, R, P, n };
})();
const lookup = (arr, t) => { const x = Math.min(LUT.n - 1, Math.max(0, t * LUT_HZ)), i = Math.floor(x), f = x - i; return i + 1 < LUT.n ? arr[i] * (1 - f) + arr[i + 1] * f : arr[i]; };
export const treadAt = (t) => ({ L: lookup(LUT.L, t), R: lookup(LUT.R, t) });
export const pulseAt = (t) => lookup(LUT.P, t);
export const lightsAt = (t) => { const st = stateAt(t); return { beam: st.beam, glow: st.glow, led: ledAt(t) }; };

// Roll that puts each pad face at y = PAD_Y + gap (left arm; the right arm mirrors it).
export function rollFor(values, gap) {
  const padFace = (roll) => {
    const p = posesOf({ ...values, view: 0, rollL: roll });
    return worldOf(p, "elbowL", [HOME + PAD[0], PAD_Y, PAD[1]]);
  };
  // the pad face's distance from the robot's centre line, along the robot's own y
  const yawR = rot([0, 0, 1], values.yaw ?? 0);
  const lat = (roll) => { const w = padFace(roll); const c = worldOf(posesOf({ ...values, view: 0 }), "yaw", [HOME, 0, 0]); const d = [w[0] - c[0], w[1] - c[1], 0]; const side = apply(yawR, [0, 1, 0]); return d[0] * side[0] + d[1] * side[1]; };
  let a = -6, b = 6;
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (lat(m) < PAD_Y + gap) a = m; else b = m; }
  return (a + b) / 2;
}

// Figure values -> every group value.
export function valuesOf(st, explode = null, view = 0, t = null) {
  const j = toJoints(st);
  const v = {
    view: 0, drive: st.drive, yaw: st.yaw, lean: st.lean, tilt: st.tilt,
    pitchL: j.pitch, pitchR: j.pitch, elbowL: j.elbow + (st.shake ?? 0), elbowR: j.elbow - (st.shake ?? 0) * 0.8, rollL: 0, rollR: 0,
    "x.trackL": 0, "x.trackR": 0, "x.battery": 0, "x.head": 0, "x.lens": 0, "x.armL": 0, "x.armR": 0,
  };
  const roll = rollFor(v, OPEN * st.open);
  v.rollL = roll;
  v.rollR = -roll;
  if (explode) Object.assign(v, explode);
  v.butter = butterOf(v, st);
  if (t !== null) Object.assign(v, wheelsAt(t));
  v.view = view;
  return v;
}

// The wheels turn with the belt: a feature that repeats every `period` degrees lets the angle wrap without a jump.
export const WHEELS = [
  { id: "sprocket", x: -34, z: 16, r: 11.4, period: 360 / 8 },
  { id: "idler", x: 34, z: 16, r: 11.4, period: 360 / 8 },
  { id: "road1", x: -13.5, z: 10.0, r: 6.6, period: 60 },
  { id: "road2", x: 0, z: 10.0, r: 6.6, period: 60 },
  { id: "road3", x: 13.5, z: 10.0, r: 6.6, period: 60 },
];
export function wheelsAt(t) {
  const tr = treadAt(t), out = {};
  for (const side of ["L", "R"]) for (const w of WHEELS) {
    const deg = ((tr[side] / w.r) * 180) / Math.PI;       // belt forward on top: +y rotation carries the top of a wheel forward
    out[`spin${side}.${w.id}`] = ((deg % w.period) + w.period) % w.period;
  }
  return out;
}

// The butter sits on the dish, rides between the pads while carried, and rests on the pancakes once placed.
const DISH_C = [DISH[0], 0, DISH_TOP + BUTTER.h / 2];
const STACK_C = [PLATE[0], 0, STACK_TOP + BUTTER.h / 2];
export function butterOf(v, st) {
  if (st.carry < 0.5) return st.on >= 0.5 ? { R: rot([0, 0, 1], 180), t: [STACK_C[0] - DISH_C[0], 0, STACK_C[2] - DISH_C[2]] } : null;
  const p = posesOf({ ...v, view: 0 });
  const L = worldOf(p, "elbowL", [HOME + PAD[0], PAD_Y, PAD[1]]);
  const Rr = worldOf(p, "elbowR", [HOME + PAD[0], -PAD_Y, PAD[1]]);
  const c = [(L[0] + Rr[0]) / 2, (L[1] + Rr[1]) / 2, (L[2] + Rr[2]) / 2];
  // the butter keeps the forearms' swing relative to the swing it was gripped at, and the robot's yaw
  const R = mul(rot([0, 0, 1], st.yaw - 180), rot([0, 1, 0], -(st.B - CARRY_B)));
  return { R, t: [c[0] - DISH_C[0], c[1] - DISH_C[1], c[2] - DISH_C[2]] };
}

// ---- taking it apart ----
// Outside first: the eye slides forward, the arms swing out with the side cover, the head lifts, then the battery and tracks.
export const APART = [
  { id: "eye", groups: { "x.lens": 26 } },
  { id: "arms", groups: { "x.armL": 42, "x.armR": 42 } },
  { id: "head", groups: { "x.head": 46 } },
  { id: "battery", groups: { "x.battery": 34 } },
  { id: "tracks", groups: { "x.trackL": 30, "x.trackR": 30 } },
];
export const STAGGER = 0.16;   // of the whole move, between starts
export const APART_S = 2.2;    // seconds, out or back
export function explodeAt(e) {
  const out = {};
  const n = APART.length;
  APART.forEach((a, i) => {
    const share = ease((e * (1 + (n - 1) * STAGGER) - i * STAGGER));
    for (const [g, d] of Object.entries(a.groups)) out[g] = d * share;
  });
  return out;
}

// ---- pulling itself together: taking the butter back starts from the slump with a calm blend, not the slump run backwards ----
export const RECOVER_TO = 20.6;   // arms down, head level, butter on the pancakes
export const RECOVER_S = 1.6;
export function recoverAt(u) {
  const a = stateAt(FETCH), b = stateAt(RECOVER_TO), x = ease(u), o = {};
  for (const key of Object.keys(b)) o[key] = typeof b[key] === "number" ? a[key] + (b[key] - a[key]) * x : b[key];
  o.shake = 0;
  o.phase = "recovering";
  return o;
}
