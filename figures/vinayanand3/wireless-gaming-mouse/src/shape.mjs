// Shape of the mouse: plan outline, target top surface, and the sphere set whose
// intersection approximates the top shell. Pure math, no kit imports, so it can be
// checked on its own: `node object/shape.mjs` prints the fit error.

export const L = 125; // length, mm (y: -62.5 rear … +62.5 front)
export const WMAX = 32.5; // half width at the widest point
export const YW = -20; // where the plan is widest (behind centre, like most symmetric esports shapes)
export const ZB = 14; // lateral profile base for the target surface

// Plan half-width: two superellipse quarters meeting with zero slope at YW (so the outline is convex).
export function halfWidth(y) {
  const front = y >= YW;
  const span = front ? L / 2 - YW : L / 2 + YW;
  const n = front ? 3.0 : 2.4;
  const t = Math.min(1, Math.abs(y - YW) / span);
  return WMAX * Math.pow(Math.max(0, 1 - Math.pow(t, n)), 1 / n);
}

// Centreline height c(y): monotone cubic through measured-looking points (hump 40 mm at y = -22).
const C_PTS = [
  [-62.5, 17.5],
  [-59, 25],
  [-52, 32],
  [-40, 37.6],
  [-24, 40],
  [-8, 39.4],
  [8, 37.9],
  [24, 35.6],
  [40, 32.6],
  [52, 29.4],
  [59, 26.4],
  [62.5, 23.5],
];
function monotone(pts) {
  const n = pts.length;
  const d = [];
  const m = [];
  for (let i = 0; i < n - 1; i++) d.push((pts[i + 1][1] - pts[i][1]) / (pts[i + 1][0] - pts[i][0]));
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  return (x) => {
    if (x <= pts[0][0]) return pts[0][1];
    if (x >= pts[n - 1][0]) return pts[n - 1][1];
    let i = 0;
    while (x > pts[i + 1][0]) i++;
    const h = pts[i + 1][0] - pts[i][0];
    const t = (x - pts[i][0]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * pts[i][1] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * pts[i + 1][1] + (t3 - t2) * h * m[i + 1];
  };
}
export const centre = monotone(C_PTS);

// Target top surface: an elliptical lateral profile that is still ~0.55 of the centre rise at the outline.
export function target(x, y) {
  const a = 1.2 * Math.max(halfWidth(y), 1);
  const c = centre(y);
  return ZB + (c - ZB) * Math.sqrt(Math.max(0, 1 - (x / a) ** 2));
}

// Outline polygon (CCW seen from above). Vertices are placed so the left flank has one long straight
// facet from y = -15 to 13 for the side-button module, and the nose and tail are finely divided.
export const OUTLINE_Y = [62.5, 59.5, 53, 43, 30, 13, -4, -15, -30, -44, -53, -59, -62.5];
export function outline() {
  const right = OUTLINE_Y.map((y) => [halfWidth(y), y]);
  // y = -4 sits on the chord from 13 to -15 so the side-button flank is one straight facet split at the seam
  const a = right[OUTLINE_Y.indexOf(13)];
  const b = right[OUTLINE_Y.indexOf(-15)];
  right[OUTLINE_Y.indexOf(-4)][0] = a[0] + ((b[0] - a[0]) * (13 - -4)) / (13 - -15);
  right[0][0] = 0;
  right[right.length - 1][0] = 0;
  // CCW from above (x right, y front): front tip → left flank → tail → right flank
  const left = right.map(([x, y]) => [-x, y]);
  const pts = [...left]; // front tip down the left side to the tail
  for (let i = right.length - 2; i >= 1; i--) pts.push(right[i]); // tail back up the right side
  return pts;
}

// Fit a sphere to points (algebraic least squares): x²+y²+z² = 2ax + 2by + 2cz + d
function solve(M, v) {
  const n = v.length;
  const A = M.map((row, i) => [...row, v[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k];
    }
  }
  return A.map((row, i) => row[n] / row[i]);
}
export function fitSphere(points, { fixX = null } = {}) {
  // unknowns [a, b, c, d] (or [b, c, d] with a fixed)
  const rows = [];
  const rhs = [];
  for (const [x, y, z, w = 1] of points) {
    const s = x * x + y * y + z * z;
    if (fixX === null) {
      rows.push([2 * x * w, 2 * y * w, 2 * z * w, w]);
      rhs.push(s * w);
    } else {
      rows.push([2 * y * w, 2 * z * w, w]);
      rhs.push((s - 2 * x * fixX) * w);
    }
  }
  const n = rows[0].length;
  const M = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => rows.reduce((t, r) => t + r[i] * r[j], 0)));
  const v = Array.from({ length: n }, (_, i) => rows.reduce((t, r, k) => t + r[i] * rhs[k], 0));
  const sol = solve(M, v);
  const [a, b, c, d] = fixX === null ? sol : [fixX, ...sol];
  return { c: [a, b, c], r: Math.sqrt(d + a * a + b * b + c * c) };
}

// Strips (x centres, right half) and zones (y ranges) of the sphere set.
export const STRIPS = [0, 13.5, 25.5];
export const ZONES = [
  { name: "front", y: [-8, 63] },
  { name: "rear", y: [-63, 2] },
];

export function spheres() {
  const out = [];
  for (const zone of ZONES) {
    for (const xs of STRIPS) {
      const pts = [];
      const half = xs === 0 ? 6.5 : 6;
      for (let y = zone.y[0]; y <= zone.y[1]; y += 1) {
        const w = halfWidth(y);
        for (let x = xs - half; x <= xs + half; x += 1) {
          if (Math.abs(x) > w - 0.5) continue;
          pts.push([x, y, target(x, y)]);
        }
      }
      const s = fitSphere(pts, { fixX: xs === 0 ? 0 : null });
      out.push({ zone: zone.name, strip: xs, ...s });
      if (xs !== 0) out.push({ zone: zone.name, strip: -xs, c: [-s.c[0], s.c[1], s.c[2]], r: s.r });
    }
  }
  return out;
}

export const sphereTop = (s, x, y) => {
  const q = s.r * s.r - (x - s.c[0]) ** 2 - (y - s.c[1]) ** 2;
  return q > 0 ? s.c[2] + Math.sqrt(q) : -Infinity;
};
export const SEAM_Y = -4; // button / palm parting line (refined to a tilted plane in geometry)
export const envelope = (S, x, y) => Math.min(...S.filter((s) => s.zone === (y >= SEAM_Y ? "front" : "rear")).map((s) => sphereTop(s, x, y)));

if (import.meta.url === `file://${process.argv[1]}`) {
  const S = spheres();
  for (const s of S) console.log(s.zone.padEnd(6), String(s.strip).padStart(6), s.c.map((v) => v.toFixed(2)).join(", ").padEnd(28), "r", s.r.toFixed(2));
  let worst = 0;
  let sum = 0;
  let n = 0;
  for (let y = -62; y <= 62; y += 1)
    for (let x = -32; x <= 32; x += 1) {
      if (Math.abs(x) > halfWidth(y) - 0.5) continue;
      const e = envelope(S, x, y) - target(x, y);
      worst = Math.max(worst, Math.abs(e));
      sum += e * e;
      n++;
    }
  console.log(`rms ${Math.sqrt(sum / n).toFixed(2)} mm · worst ${worst.toFixed(2)} mm`);
  for (const y of [-2, -4]) {
    const f = S.filter((s) => s.zone === "front"), r = S.filter((s) => s.zone === "rear");
    console.log("seam step at y", y, [0, 8, 16, 24, 30].map((x) => (Math.min(...f.map((s) => sphereTop(s, x, y))) - Math.min(...r.map((s) => sphereTop(s, x, y)))).toFixed(2)).join(" "));
  }
  for (const y of [55, 35, 15, 0, -20, -40, -55]) {
    const row = [];
    for (let x = 0; x <= 32; x += 4) row.push(Math.abs(x) < halfWidth(y) ? `${envelope(S, x, y).toFixed(1)}/${target(x, y).toFixed(1)}` : "   -    ");
    console.log(`y ${String(y).padStart(4)} :`, row.join("  "));
  }
}
