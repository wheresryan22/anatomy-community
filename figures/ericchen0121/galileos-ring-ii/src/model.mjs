// Galileo's ring II, from the maker's account.
// Forty-eight pendulums, three identical sets of sixteen. In 134 seconds
// (2 min 14 s) the longest swings 51 times. Around each set the count
// climbs by one swing per pendulum up to the shortest, then steps back
// down, so a third of a turn repeats the ring.
// Lengths are the small-angle cut: T = 2π√(L/g), so L ∝ 1/n².

export const COUNT = 48;
export const CYCLE = 134;
export const BASE = 51;
export const G = 9.80665;
export const FOLDS = [2, 3, 4, 6, 8, 12];

export function swingCount(index, folds, span) {
  const group = COUNT / folds;
  const k = index % group;
  const rise = Math.min(k, group - k);
  const peak = Math.floor(group / 2);
  if (!peak || span <= 0) return BASE;
  return BASE + Math.round((span * rise) / peak);
}

export function lengthMetres(oscillations) {
  const period = CYCLE / oscillations;
  return G * (period / (2 * Math.PI)) ** 2;
}

export function bobPose(index, t, spec) {
  const n = swingCount(index, spec.folds, spec.span);
  const metres = lengthMetres(n);
  const L = metres * spec.metre;
  const phi = (index / COUNT) * Math.PI * 2;
  const c = Math.cos(phi);
  const s = Math.sin(phi);
  const theta = spec.theta0 * Math.cos((2 * Math.PI * n * t) / CYCLE);
  const along = Math.sin(theta);
  const x0 = spec.radius * c;
  const y0 = spec.radius * s;
  const tangent = spec.plane === "tangent";
  return {
    n,
    metres,
    L,
    phi,
    c,
    s,
    theta,
    x: tangent ? x0 - s * L * along : x0 + c * L * along,
    y: tangent ? y0 + c * L * along : y0 + s * L * along,
    z: spec.eyeZ - L * Math.cos(theta),
  };
}

// Where the electromagnet holds pendulum `index` at the release (t = 0).
export function armedAt(index, spec, bobR, magR, gap = 0.45) {
  const pose = bobPose(index, 0, spec);
  const px = spec.radius * pose.c;
  const py = spec.radius * pose.s;
  let dx = pose.x - px;
  let dy = pose.y - py;
  const len = Math.hypot(dx, dy);
  if (len < 1e-5) {
    dx = pose.c;
    dy = pose.s;
  } else {
    dx /= len;
    dy /= len;
  }
  return {
    pose,
    x: pose.x + dx * (bobR + magR + gap),
    y: pose.y + dy * (bobR + magR + gap),
    z: pose.z,
  };
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

assert(swingCount(0, 3, 8) === 51, "longest");
assert(swingCount(1, 3, 8) === 52, "first neighbour");
assert(swingCount(8, 3, 8) === 59, "shortest");
assert(swingCount(9, 3, 8) === 58, "back down");
assert(swingCount(15, 3, 8) === 52, "other neighbour");
assert(swingCount(16, 3, 8) === 51, "the ladder repeats");
assert(lengthMetres(59) < lengthMetres(51), "shorter swings faster");

{
  const spec = { folds: 3, span: 8, theta0: 0.26, plane: "radial", metre: 42, radius: 72, eyeZ: 98 };
  const turn = (2 * Math.PI) / 3;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  for (const plane of ["radial", "tangent"]) {
    spec.plane = plane;
    for (const index of [0, 3, 8, 15]) {
      const a = bobPose(index, 17, spec);
      const b = bobPose(index + COUNT / 3, 17, spec);
      const x = a.x * cos - a.y * sin;
      const y = a.x * sin + a.y * cos;
      assert(Math.abs(x - b.x) < 1e-6 && Math.abs(y - b.y) < 1e-6 && Math.abs(a.z - b.z) < 1e-6, "threefold " + plane);
    }
  }
}
