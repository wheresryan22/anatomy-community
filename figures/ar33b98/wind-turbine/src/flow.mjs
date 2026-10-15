// Streamlines through the rotor from the actuator-disc model, in world metres,
// and the turbine proxies that decide whether a point of air lies in front of
// or behind the turbine along the view ray. Shared by the shader set-up, the
// SVG fallback and the build.

const DEG = Math.PI / 180;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

export const FLOW = { from: -78, to: 112, step: 1.5, sheet: [0.3, 0.62, 0.92, 1.28, 1.7], tube: { at: 0.985, n: 8 }, fadeIn: 26, fadeOut: 40 };

// The disc's axial speed on its axis (a uniformly loaded actuator disc):
// u/U = 1 − a(1 + ξ/√(1 + ξ²)), ξ = x/R. Far upstream U, at the disc U(1 − a),
// far downstream U(1 − 2a).
export const axialOf = (a, x, R) => 1 - a * (1 + x / R / Math.sqrt(1 + (x / R) * (x / R)));

// s: { v (normal wind), dir (compass, wind from), a, lambda, rpm }, hub: world
// centre of the rotor, V: unit vector toward the viewer. The flow is
// axisymmetric, so any plane through the axis shows it truly; the lines are
// seeded in the plane through the axis that faces the viewer, where their
// spreading is seen at full size, plus a ring on the edge of the streamtube
// that passes the blade tips. Each point carries its travel time.
export function streamlines(s, hub, R, V) {
  const a = Math.max(0, Math.min(0.333, s.a));
  const U = Math.max(0.05, s.v);
  const w = [-Math.sin(s.dir * DEG), -Math.cos(s.dir * DEG), 0];
  let e1 = unit(cross(w, V));
  if (e1[2] < 0) e1 = mul(e1, -1);
  const e2 = unit(cross(w, e1));
  const omega = (s.rpm * 2 * Math.PI) / 60;
  const Rb0 = R * Math.sqrt(1 - a);
  const seeds = [];
  for (const f of FLOW.sheet) for (const side of [0, Math.PI]) seeds.push({ at: f, phi: side, outside: f > 1, weight: f > 1 ? 0.75 : 1 });
  for (let j = 0; j < FLOW.tube.n; j++) seeds.push({ at: FLOW.tube.at, phi: ((j + 0.5) / FLOW.tube.n) * 2 * Math.PI, outside: false, weight: 0.55, tube: true });
  const lines = [];
  for (const seed of seeds) {
    const rd = seed.at * R;
    const r0 = seed.outside ? rd : rd * Math.sqrt(1 - a);
    const lr = s.lambda * (rd / R);
    const swirl = seed.outside || lr < 0.2 ? 0 : (2 * a * (1 - a) * omega) / (lr * lr);
    const pts = [];
    const tau = [];
    let t = 0;
    let phi = seed.phi;
    let first = true;
    for (let x = FLOW.from; x <= FLOW.to + 1e-6; x += FLOW.step) {
      const q = axialOf(a, x, R);
      let r;
      if (seed.outside) {
        const rb = Rb0 / Math.sqrt(q);
        r = Math.sqrt(r0 * r0 + rb * rb - Rb0 * Rb0);
      } else r = r0 / Math.sqrt(q);
      if (!first) {
        const dt = FLOW.step / (U * axialOf(a, x - FLOW.step / 2, R));
        t += dt;
        phi -= swirl * dt * smooth01((x - FLOW.step / 2 + 0.05 * R) / (0.1 * R));
      }
      first = false;
      pts.push(add(add(hub, mul(w, x)), add(mul(e1, r * Math.cos(phi)), mul(e2, r * Math.sin(phi)))));
      tau.push(t);
    }
    lines.push({ pts, tau, outside: seed.outside, weight: seed.weight });
  }
  return lines;
}

const smooth01 = (x) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};
export const fadeAt = (i, count) => {
  const x = FLOW.from + i * FLOW.step;
  return smooth01((x - FLOW.from) / FLOW.fadeIn) * smooth01((FLOW.to - x) / FLOW.fadeOut);
};

// ------------------------------------------------------------------ turbine proxies
// The same numbers the SVG draws, simplified to shapes a ray can hit: the tower
// cone, the nacelle box, the hub ball, and each blade as its chord plane.
export function proxiesOf(GEO, sectionAt, heading, rotorDeg, pitch) {
  const g = (90 - heading) * DEG;
  const cg = Math.cos(g);
  const sg = Math.sin(g);
  const toW = ([x, y, z]) => [x * cg - y * sg, x * sg + y * cg, z];
  const dirW = ([x, y, z]) => [x * cg - y * sg, x * sg + y * cg, z];
  const hub = toW([GEO.pitchX, 0, GEO.hubZ]);
  const blades = [0, 1, 2].map((i) => {
    const phi = (rotorDeg + i * 120) * DEG;
    const d = [0, Math.sin(phi), Math.cos(phi)];
    const t = [0, Math.cos(phi), -Math.sin(phi)];
    const psi = (pitch + sectionAt(24).twist) * DEG;
    const c = add(mul(t, Math.cos(psi)), mul([1, 0, 0], Math.sin(psi)));
    return { d: dirW(d), c: dirW(c), n: dirW(unit(cross(d, c))) };
  });
  const n = GEO.nac;
  return {
    heading,
    cg,
    sg,
    hub,
    hubR: 1.6,
    nose: toW([GEO.hub.x1 + 0.7, 0, GEO.hubZ]),
    box: [n.x0, n.x1 + 0.4, -n.hw, n.hw, n.z0 - 0.3, n.z1 + 1.1],
    tower: [0.75, GEO.towerTop, GEO.towerBase, GEO.towerTopR],
    blades,
  };
}

// Chord of the blade's proxy at span r: the planform the mesh is lofted from.
export const chordAt = (sectionAt, r) => sectionAt(Math.max(1.6, Math.min(39.9, r))).chord;

// Largest view-depth at which the line p + tV meets the turbine (the surface
// nearest the viewer), or −Infinity. V is the unit vector toward the viewer.
export function nearestDepth(p, V, X, sectionAt, R) {
  let best = -Infinity;
  const hit = (q) => {
    const dpt = dot(q, V);
    if (dpt > best) best = dpt;
  };
  // tower: cone about z, tested at a few heights along the ray
  const [z0, z1, rb, rt] = X.tower;
  for (const root of coneHits(p, V, z0, z1, rb, rt)) hit(root);
  // nacelle box in the nacelle frame
  const lp = [p[0] * X.cg + p[1] * X.sg, -p[0] * X.sg + p[1] * X.cg, p[2]];
  const lv = [V[0] * X.cg + V[1] * X.sg, -V[0] * X.sg + V[1] * X.cg, V[2]];
  const [bx0, bx1, by0, by1, bz0, bz1] = X.box;
  let tn = -Infinity;
  let tf = Infinity;
  for (const [o, d, lo, hi] of [[lp[0], lv[0], bx0, bx1], [lp[1], lv[1], by0, by1], [lp[2], lv[2], bz0, bz1]]) {
    if (Math.abs(d) < 1e-9) {
      if (o < lo || o > hi) tn = Infinity;
      continue;
    }
    const ta = (lo - o) / d;
    const tb = (hi - o) / d;
    tn = Math.max(tn, Math.min(ta, tb));
    tf = Math.min(tf, Math.max(ta, tb));
  }
  if (tn <= tf && isFinite(tn)) hit(add(p, mul(V, tf)));
  // hub and nose as balls
  for (const [c, r] of [[X.hub, X.hubR], [X.nose, 1.05]]) {
    const oc = [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
    const b = dot(oc, V);
    const disc = b * b - (dot(oc, oc) - r * r);
    if (disc >= 0) hit(add(p, mul(V, -b + Math.sqrt(disc))));
  }
  // blades as chord planes through the hub
  for (const bl of X.blades) {
    const den = dot(bl.n, V);
    if (Math.abs(den) < 1e-6) continue;
    const t = dot(bl.n, [X.hub[0] - p[0], X.hub[1] - p[1], X.hub[2] - p[2]]) / den;
    const q = add(p, mul(V, t));
    const rel = [q[0] - X.hub[0], q[1] - X.hub[1], q[2] - X.hub[2]];
    const r = dot(rel, bl.d);
    if (r < 1.6 || r > R) continue;
    const c = dot(rel, bl.c);
    const ch = chordAt(sectionAt, r);
    if (c > 0.3 * ch || c < -0.7 * ch) continue;
    hit(q);
  }
  return best;
}

function coneHits(p, V, z0, z1, rb, rt) {
  // radius r(z) = rb + (rt − rb)(z − z0)/(z1 − z0); solve x² + y² = r(z)² along the ray
  const k = (rt - rb) / (z1 - z0);
  const c0 = rb - k * z0;
  const A = V[0] * V[0] + V[1] * V[1] - k * k * V[2] * V[2];
  const B = 2 * (p[0] * V[0] + p[1] * V[1] - (c0 + k * p[2]) * k * V[2]);
  const C = p[0] * p[0] + p[1] * p[1] - (c0 + k * p[2]) * (c0 + k * p[2]);
  const disc = B * B - 4 * A * C;
  if (disc < 0 || Math.abs(A) < 1e-12) return [];
  const out = [];
  for (const t of [(-B - Math.sqrt(disc)) / (2 * A), (-B + Math.sqrt(disc)) / (2 * A)]) {
    const q = add(p, mul(V, t));
    if (q[2] >= z0 && q[2] <= z1) out.push(q);
  }
  return out;
}
