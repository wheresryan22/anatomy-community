// Small geometry helpers on top of the anatomy kit.
import * as k from "../../../../.skill/kit/iso-kit.mjs";
import * as G from "../../../../.skill/kit/lathe.mjs";

const { dot3, sub3, add3, mul3, cross3, unit3, len3 } = G;

// A convex solid from any cloud of 3D points: faces found by brute force (fine for < 80 points),
// shaded by facing with the kit's light, returned as kit SolidPaths.
export function hullSolid(points, P, { crease = 0.3 } = {}) {
  const n = points.length;
  const c = mul3(points.reduce((a, p) => add3(a, p), [0, 0, 0]), 1 / n);
  const planes = [];
  const eps = 1e-6;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      for (let l = j + 1; l < n; l++) {
        let nrm = cross3(sub3(points[j], points[i]), sub3(points[l], points[i]));
        const len = len3(nrm);
        if (len < 1e-9) continue;
        nrm = mul3(nrm, 1 / len);
        if (dot3(nrm, sub3(points[i], c)) < 0) nrm = mul3(nrm, -1);
        const d = dot3(nrm, points[i]);
        let ok = true;
        for (let m = 0; m < n; m++) if (dot3(nrm, points[m]) > d + 1e-5) { ok = false; break; }
        if (!ok) continue;
        if (planes.some((p) => dot3(p.n, nrm) > 1 - 1e-7 && Math.abs(p.d - d) < 1e-5)) continue;
        planes.push({ n: nrm, d });
      }
  const faces = planes.map(({ n: nrm, d }) => {
    const on = [];
    points.forEach((p, index) => {
      if (Math.abs(dot3(nrm, p) - d) < 1e-4 && !on.some((q) => len3(sub3(points[q], p)) < 1e-6)) on.push(index);
    });
    const fc = mul3(on.reduce((a, q) => add3(a, points[q]), [0, 0, 0]), 1 / on.length);
    const u = unit3(sub3(points[on[0]], fc));
    const v = cross3(nrm, u);
    on.sort((a, b) => {
      const pa = sub3(points[a], fc);
      const pb = sub3(points[b], fc);
      return Math.atan2(dot3(pa, v), dot3(pa, u)) - Math.atan2(dot3(pb, v), dot3(pb, u));
    });
    return { n: nrm, on };
  });
  const V = G.viewOf(P);
  const L = G.lightOf(P);
  const flat = points.map((p) => k.iso(p, P));
  const buckets = [[], [], [], [], []];
  const visible = faces.map((f) => dot3(f.n, V) > eps);
  faces.forEach((f, index) => {
    if (!visible[index]) return;
    buckets[G.bandOf(dot3(f.n, L))].push(k.pathOf(f.on.map((q) => flat[q]), true));
  });
  const creases = [];
  for (let a = 0; a < faces.length; a++)
    for (let b = a + 1; b < faces.length; b++) {
      if (!visible[a] || !visible[b]) continue;
      if (dot3(faces[a].n, faces[b].n) > Math.cos(crease)) continue;
      const shared = faces[a].on.filter((q) => faces[b].on.includes(q));
      if (shared.length === 2) creases.push(k.pathOf([flat[shared[0]], flat[shared[1]]]));
    }
  const hull = G.hullOf(flat);
  return { fill: k.pathOf(hull, true), outline: k.pathOf(hull, true), crease: creases.join(""), top: buckets[4].join(""), shades: buckets.slice(0, 4).map((list) => list.join("")), faces, flat };
}

// A frame along +x whose u, v are world y, z: prisms of a (y, z) section along the track.
export const ALONG_X = { o: [0, 0, 0], a: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] };
export const prismX = (section, x0, x1, P) => G.prismOf(ALONG_X, section, x0, x1, P);
export const ALONG_Y = (x, z) => ({ o: [x, 0, z], a: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1] });

// SVG matrix mapping local (u, v) to the world plane o + u·e1 + v·e2.
export function planeMatrix(o, e1, e2, P) {
  const O = k.iso(o, P);
  const A = k.iso(add3(o, e1), P);
  const B = k.iso(add3(o, e2), P);
  const f = (x) => Math.round(x * 10000) / 10000;
  return `matrix(${f(A[0] - O[0])} ${f(A[1] - O[1])} ${f(B[0] - O[0])} ${f(B[1] - O[1])} ${f(O[0])} ${f(O[1])})`;
}

// Rounded rectangle in local (u, v) coordinates, as a closed path string.
export function rrect(u0, v0, u1, v1, r = 0, steps = 4) {
  const x = Math.min(u0, u1);
  const y = Math.min(v0, v1);
  return k.pathOf(k.roundedPlan({ x, y, w: Math.abs(u1 - u0), d: Math.abs(v1 - v0), r }, steps), true);
}

// The screen region swept by a (y, z) section at x = from, pushed toward +x: a clip that cuts any
// convex part with that section exactly at the plane x = from (its cut face faces away from us).
export function sweepClip(section, from, P, reach = 1200) {
  const pts = [];
  for (const [y, z] of section) {
    pts.push(k.iso([from, y, z], P));
    pts.push(k.iso([from + reach, y, z], P));
  }
  return k.pathOf(G.hullOf(pts), true);
}

export const sectionOfBox = (y0, y1, z0, z1) => [
  [y0, z0],
  [y1, z0],
  [y1, z1],
  [y0, z1],
];

export { G, k };
