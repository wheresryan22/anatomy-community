// Geometry of the turbine's moving parts, shared by the build (Node) and the page.
// World units are metres: x east, y north, z up, the tower axis at the origin.
// Everything that yaws is built in the nacelle's own frame, where +x points
// upwind (toward the rotor). A yaw of the nacelle is the kit's drawing at a
// shifted azimuth, so one builder draws every heading: P' = yawed(P, heading).

export const GEO = {
  towerTop: 67.6,
  towerBase: 2.1,
  towerTopR: 1.35,
  yawRing: { r: 1.52, h: 0.25 },
  hubZ: 70,
  nac: { x0: -8.2, x1: 2.4, hw: 1.75, z0: 67.25, z1: 71.65, r: 0.35 },
  flange: { x0: 2.4, x1: 2.8, r: 0.98 },
  hub: { x0: 2.8, x1: 4.8, h: 1.25, corner: 0.5 },
  nose: { len: 2.2, r: 1.12 },
  bearing: { t: 0.35, r: 1.16 },
  blade: { root: 1.6, R: 40, rootR: 0.95 },
  cooler: { x: -8.0, y: -1.42, w: 1.75, d: 2.84, r: 0.25, h: 1.05 },
  mast: { x: -5.95, h: 1.9 },
  roofCut: -5.6,
};
GEO.pitchX = (GEO.hub.x0 + GEO.hub.x1) / 2;

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

// The nacelle's heading is the compass direction the rotor faces (where the
// wind comes from). Local +x maps to world (sin h, cos h).
export const yawed = (P, heading) => ({ ...P, azimuth: P.azimuth - (90 - heading) });
export const toWorld = ([x, y, z], heading) => {
  const g = (90 - heading) * DEG;
  return [x * Math.cos(g) - y * Math.sin(g), x * Math.sin(g) + y * Math.cos(g), z];
};

// Blade planform and section: chord, thickness, twist and how far the round
// root has turned into an airfoil, all along the span r (from the hub axis).
export function sectionAt(r) {
  const { root, R, rootR } = GEO.blade;
  const smooth = (a, b, x) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const into = smooth(3.0, 8.2, r);
  const maxChord = 3.2;
  const tipChord = 0.95;
  const span = R - 8.2 - 0.8;
  const outer = Math.max(0, Math.min(1, (r - 8.2) / span));
  let chord = r <= 8.2 ? 2 * rootR + (maxChord - 2 * rootR) * into : maxChord - (maxChord - tipChord) * Math.pow(outer, 0.85);
  if (r > R - 0.8) chord = tipChord * Math.sqrt(Math.max(0, 1 - Math.pow((r - (R - 0.8)) / 0.8, 2)));
  const ratio = r <= 8.2 ? 1 - (1 - 0.36) * into : 0.36 - (0.36 - 0.16) * Math.pow(outer, 0.7);
  const twist = 13 * Math.pow(Math.max(0, Math.min(1, (R - 0.8 - r) / span)), 1.5);
  return { chord: Math.max(chord, 0.02), thick: Math.max(chord * ratio, 0.01), twist, blend: into, root: r < root + 1e-6 };
}

export const SPANS = [1.6, 2.1, 2.6, 3.2, 3.9, 4.7, 5.6, 6.6, 7.6, 8.6, 10.2, 12.5, 15.5, 19, 23, 27, 31, 34.5, 37.2, 38.8, 39.5, 39.85, 39.97];
const AROUND = 20;

// One section loop: index 0 is the leading edge, then the suction side to the
// trailing edge and the pressure side back. X along the chord (leading edge
// positive, pitch axis at 30% chord), Y toward the suction side.
function loopOf(sec, count = AROUND) {
  const half = count / 2;
  const pts = [];
  for (let i = 0; i < count; i++) {
    const upper = i <= half;
    const k = upper ? i / half : (count - i) / half;
    const x = (1 - Math.cos(Math.PI * k)) / 2;
    const yt = 5 * 0.2 * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4) / 0.2;
    const camber = 0.035 * (x < 0.4 ? (2 * 0.4 * x - x * x) / 0.16 : (1 - 2 * 0.4 + 2 * 0.4 * x - x * x) / 0.36);
    const foilX = (0.3 - x) * sec.chord;
    const foilY = (camber * sec.chord + (upper ? 1 : -1) * yt * sec.thick * 0.5);
    const angle = upper ? Math.PI * k : -Math.PI * k;
    const circleX = Math.cos(angle) * GEO.blade.rootR;
    const circleY = Math.sin(angle) * GEO.blade.rootR;
    const b = sec.blend;
    pts.push([circleX + (foilX - circleX) * b, circleY + (foilY - circleY) * b]);
  }
  return pts;
}

export const LOOPS = SPANS.map((r) => ({ r, sec: sectionAt(r), pts: loopOf(sectionAt(r)), fine: loopOf(sectionAt(r), 72) }));

export function makeRig(k, G) {
  const { dot3, add3, sub3, mul3, unit3, cross3 } = G;
  const fx = (n) => (Math.round(n * 10) / 10).toFixed(1).replace(/\.0$/, "").replace(/^-0$/, "0");
  const pathOf = (pts, closed) => pts.map(([x, y], i) => `${i ? "L" : "M"}${fx(x)} ${fx(y)}`).join("") + (closed ? "Z" : "");
  const BANDS = [0, 0.2, 0.42, 0.62];
  // A projector with the camera's sines and cosines taken once, for the meshes
  // that are re-projected every frame (the same formula as k.iso).
  const projector = (P) => {
    const { sinA, cosA, sinE, cosE, k: K } = k.cameraOf(P);
    const [ox, oy] = P.origin;
    return (p) => [ox + (p[0] * sinA - p[1] * cosA) * K, oy + ((p[0] * cosA + p[1] * sinA) * sinE - p[2] * cosE) * K];
  };

  // Directions in the nacelle frame for a blade at angle phi (0 = straight up).
  // The rotor turns clockwise seen from upwind, so the motion is (−x) × d.
  const bladeAxes = (phi) => {
    const d = [0, Math.sin(phi), Math.cos(phi)];
    const t = [0, Math.cos(phi), -Math.sin(phi)];
    return { d, t };
  };
  const hubCentre = () => [GEO.pitchX, 0, GEO.hubZ];

  // A blade as a lofted mesh: sections along the span, each a loop turned by
  // pitch plus twist about the pitch axis.
  function bladeMesh(phi, pitch) {
    const { d, t } = bladeAxes(phi);
    const u = [1, 0, 0];
    const O = hubCentre();
    const verts = [];
    const norms = [];
    for (const { r, sec, pts } of LOOPS) {
      const psi = (pitch + sec.twist) * DEG;
      const c3 = add3(mul3(t, Math.cos(psi)), mul3(u, Math.sin(psi)));
      const s3 = sub3(mul3(t, Math.sin(psi)), mul3(u, Math.cos(psi)));
      const centre = add3(O, mul3(d, r));
      const n = pts.length;
      for (let i = 0; i < n; i++) {
        const [x, y] = pts[i];
        verts.push(add3(centre, add3(mul3(c3, x), mul3(s3, y))));
        const a = pts[(i - 1 + n) % n];
        const b = pts[(i + 1) % n];
        const tx = b[0] - a[0];
        const ty = b[1] - a[1];
        const l = Math.hypot(tx, ty) || 1;
        norms.push(add3(mul3(c3, ty / l), mul3(s3, -tx / l)));
      }
    }
    const tip = add3(O, mul3(d, GEO.blade.R));
    return { verts, norms, tip, d, t };
  }

  // Marching-triangles split of one triangle into the kit's tone bands, from a
  // linear score across it, so curved surfaces shade in smooth bands.
  const bandOf = (x) => (x < BANDS[0] ? 0 : x < BANDS[1] ? 1 : x < BANDS[2] ? 2 : x < BANDS[3] ? 3 : 4);
  function bandPieces(tri, scores, out) {
    const lows = [-Infinity, ...BANDS];
    const highs = [...BANDS, Infinity];
    const b0 = bandOf(scores[0]);
    const b1 = bandOf(scores[1]);
    const b2 = bandOf(scores[2]);
    if (b0 === b1 && b1 === b2) {
      out[b0].push(pathOf(tri, true));
      return;
    }
    const bmin = Math.min(b0, b1, b2);
    const bmax = Math.max(b0, b1, b2);
    for (let b = bmin; b <= bmax; b++) {
      let poly = tri.map((p, i) => [p[0], p[1], scores[i]]);
      for (const [limit, keepAbove] of [[lows[b], true], [highs[b], false]]) {
        if (!isFinite(limit) || !poly.length) continue;
        const next = [];
        for (let i = 0; i < poly.length; i++) {
          const A = poly[i];
          const B = poly[(i + 1) % poly.length];
          const ina = keepAbove ? A[2] >= limit : A[2] < limit;
          const inb = keepAbove ? B[2] >= limit : B[2] < limit;
          if (ina) next.push(A);
          if (ina !== inb) {
            const f = (limit - A[2]) / (B[2] - A[2]);
            next.push([A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, limit]);
          }
        }
        poly = next;
      }
      if (poly.length > 2) out[b].push(pathOf(poly, true));
    }
  }

  function meshPaths(verts, norms, P, rows, cols, { tipApex = null, outline = true } = {}) {
    const V = G.viewOf(P);
    const L = G.lightOf(P);
    const iso = projector(P);
    const flat = verts.map(iso);
    const score = norms.map((n) => dot3(unit3(n), L));
    const faces = [];
    const id = (j, i) => j * cols + (i % cols);
    for (let j = 0; j < rows - 1; j++)
      for (let i = 0; i < cols; i++) faces.push([id(j, i), id(j, i + 1), id(j + 1, i + 1), id(j + 1, i)]);
    if (tipApex) {
      const apex = verts.length;
      verts.push(tipApex.p);
      norms.push(tipApex.n);
      flat.push(iso(tipApex.p));
      score.push(dot3(unit3(tipApex.n), L));
      for (let i = 0; i < cols; i++) faces.push([id(rows - 1, i), id(rows - 1, i + 1), apex]);
    }
    const facing = faces.map((f) => {
      const a = verts[f[0]];
      const b = verts[f[1]];
      const c = verts[f[2]];
      const e = verts[f[f.length - 1]];
      const n = cross3(sub3(c, a), sub3(e, b));
      const avg = f.reduce((s, v) => add3(s, norms[v]), [0, 0, 0]);
      const signed = dot3(n, avg) < 0 ? mul3(n, -1) : n;
      return dot3(signed, V) > 0;
    });
    const fill = [];
    const bands = [[], [], [], [], []];
    // Runs of neighbouring quads in one strip that sit wholly in one band are
    // emitted as one polygon; quads that straddle bands are split exactly.
    const uniform = (f) => {
      const b = bandOf(score[f[0]]);
      return f.length === 4 && bandOf(score[f[1]]) === b && bandOf(score[f[2]]) === b && bandOf(score[f[3]]) === b ? b : -1;
    };
    let run = null;
    const flush = () => {
      if (!run) return;
      const top = [];
      const bottom = [];
      for (const f of run.faces) {
        if (!top.length) top.push(flat[f[0]]), bottom.push(flat[f[3]]);
        top.push(flat[f[1]]);
        bottom.push(flat[f[2]]);
      }
      bands[run.b].push(pathOf([...top, ...bottom.reverse()], true));
      run = null;
    };
    faces.forEach((f, index) => {
      if (!facing[index]) return flush();
      if (outline) fill.push(pathOf(f.map((v) => flat[v]), true));
      const b = uniform(f);
      if (b >= 0) {
        const strip = Math.floor(index / cols);
        if (run && run.b === b && run.strip === strip && run.next === index) {
          run.faces.push(f);
          run.next = index + 1;
          return;
        }
        flush();
        run = { b, strip, next: index + 1, faces: [f] };
        return;
      }
      flush();
      const tris = f.length === 4 ? [[f[0], f[1], f[2]], [f[0], f[2], f[3]]] : [f];
      for (const tri of tris) bandPieces(tri.map((v) => flat[v]), tri.map((v) => score[v]), bands);
    });
    flush();
    if (!outline) return { fill: "", bands: bands.map((list) => list.join("")), outline: "", rim: "" };
    // Contour: edges shared by a front-facing and a back-facing face.
    const edgeFaces = new Map();
    faces.forEach((f, index) => {
      for (let i = 0; i < f.length; i++) {
        const a = f[i];
        const b = f[(i + 1) % f.length];
        const key = a < b ? `${a}_${b}` : `${b}_${a}`;
        if (!edgeFaces.has(key)) edgeFaces.set(key, [a, b, []]);
        edgeFaces.get(key)[2].push(index);
      }
    });
    const segs = [];
    const open = [];
    for (const [, [a, b, list]] of edgeFaces) {
      if (list.length === 2 && facing[list[0]] !== facing[list[1]]) segs.push([a, b]);
      else if (list.length === 1 && facing[list[0]]) open.push([a, b]);
    }
    return { fill: fill.join(""), bands: bands.map((list) => list.join("")), outline: chain(segs, flat), rim: chain(open, flat) };
  }

  function chain(segs, flat) {
    const adj = new Map();
    const add = (a, b) => (adj.has(a) ? adj.get(a) : adj.set(a, []).get(a)).push(b);
    segs.forEach(([a, b]) => (add(a, b), add(b, a)));
    const used = new Set();
    const key = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);
    const out = [];
    const starts = [...adj.keys()].sort((a, b) => adj.get(a).length - adj.get(b).length);
    for (const s of starts) {
      for (const n0 of adj.get(s)) {
        if (used.has(key(s, n0))) continue;
        const line = [s, n0];
        used.add(key(s, n0));
        let prev = s;
        let cur = n0;
        for (;;) {
          const next = (adj.get(cur) ?? []).find((n) => n !== prev && !used.has(key(cur, n)));
          if (next === undefined) break;
          used.add(key(cur, next));
          line.push(next);
          prev = cur;
          cur = next;
        }
        out.push(pathOf(line.map((v) => flat[v]), line[0] === line[line.length - 1]));
      }
    }
    return out.join("");
  }

  function solidMarkup(paths, { lit = false, tone = "hi", crease = "", rim = "", seamless = true, extra = "" } = {}) {
    const shades = paths.bands.slice(0, 4).map((d, i) => (d ? `<path class="iso-shade" data-shade="${i}" d="${d}"/>` : "")).join("");
    const top = paths.bands[4] ? `<path class="iso-top" d="${paths.bands[4]}"/>` : "";
    return `<g class="iso-solid"${lit ? " data-lit" : ""}${seamless ? " data-seamless" : ""}><path class="iso-fill" d="${paths.fill}"/>${shades}${top}${crease}${rim ? `<path class="iso-line" data-tone="lo" d="${rim}"/>` : ""}${extra}<path class="iso-line iso-edge" data-tone="${tone}" d="${paths.outline}"/></g>`;
  }

  // The blade's outline: in each section, the points that reach furthest either
  // side of the blade's axis on screen (from a fine loop), joined root to tip and
  // back. Exact to the drawn surface, with no hops between mesh vertices.
  function silhouette(P, phi, pitch) {
    const { d, t } = bladeAxes(phi);
    const u = [1, 0, 0];
    const O = hubCentre();
    const iso = projector(P);
    const o = iso(O);
    const e = iso(add3(O, mul3(d, GEO.blade.R)));
    const ax = e[0] - o[0];
    const ay = e[1] - o[1];
    const len = Math.hypot(ax, ay);
    if (len < 0.3 * GEO.blade.R * G.scaleOf(P)) return null;
    const nx = -ay / len;
    const ny = ax / len;
    const left = [];
    const right = [];
    for (const { r, sec, fine } of LOOPS) {
      const psi = (pitch + sec.twist) * DEG;
      const c3 = add3(mul3(t, Math.cos(psi)), mul3(u, Math.sin(psi)));
      const s3 = sub3(mul3(t, Math.sin(psi)), mul3(u, Math.cos(psi)));
      const centre = add3(O, mul3(d, r));
      let lo = null;
      let hi = null;
      const cx = iso(centre);
      const ax3 = iso(add3(centre, c3));
      const sx3 = iso(add3(centre, s3));
      const cu = [ax3[0] - cx[0], ax3[1] - cx[1]];
      const su = [sx3[0] - cx[0], sx3[1] - cx[1]];
      for (const [x, y] of fine) {
        const p = [cx[0] + cu[0] * x + su[0] * y, cx[1] + cu[1] * x + su[1] * y];
        const q = (p[0] - o[0]) * nx + (p[1] - o[1]) * ny;
        if (!lo || q < lo[0]) lo = [q, p];
        if (!hi || q > hi[0]) hi = [q, p];
      }
      left.push(lo[1]);
      right.push(hi[1]);
    }
    const tip = iso(add3(O, mul3(d, GEO.blade.R)));
    const ring = [...left, tip, ...right.reverse()];
    return { fill: pathOf(ring, true), outline: pathOf(ring, false) };
  }

  // A blade, its pitch bearing and the lightning receptor at its tip. The
  // bearing face is the plane between them: the blade is in front when it
  // points toward the viewer.
  function bladeSvg(P, phi, pitch, { lit = true } = {}) {
    const mesh = bladeMesh(phi, pitch);
    const sil = silhouette(P, phi, pitch);
    const paths = meshPaths(mesh.verts, mesh.norms, P, LOOPS.length, AROUND, { tipApex: { p: mesh.tip, n: mesh.d }, outline: !sil });
    if (sil) {
      paths.fill = sil.fill;
      paths.outline = sil.outline;
    }
    const O = add3(hubCentre(), mul3(mesh.d, GEO.hub.h));
    const F = G.frameAlong(O, mesh.d);
    const bearing = G.disc(0, GEO.bearing.t, GEO.bearing.r, F, P);
    const V = G.viewOf(P);
    const faceOut = dot3(mesh.d, V) > 0.04;
    const bolts = faceOut ? k.dotsSvg(G.dotsOf(F, GEO.bearing.t, GEO.bearing.r - 0.11, 16, P, { all: true, fade: [0.04, 0.42], phase: pitch * DEG }), { size: 0.4, tone: "mid" }) : "";
    const seal = faceOut ? k.lineSvg(G.circleOf(F, GEO.bearing.t, GEO.blade.rootR + 0.05, P), { tone: "faint" }) : "";
    const bearingSvg = k.solidSvg(bearing, { tone: "mid", inner: k.lineSvg(G.arcOf(F, GEO.bearing.t * 0.5, GEO.bearing.r, P), { tone: "faint" }) }) + bolts + seal;
    const bladePart = solidMarkup(paths, { lit });
    return `<g class="wt-blade">${dot3(mesh.d, V) > 0 ? bearingSvg + bladePart : bladePart + bearingSvg}</g>`;
  }

  // The cast hub: a rounded triangular prism whose three flats carry the pitch
  // bearings, so each blade meets the hub flat on flat.
  function hubPolygon() {
    const { h, corner } = GEO.hub;
    const pts = [];
    for (let i = 0; i < 3; i++) {
      const a0 = (i * 120) * DEG;
      const a1 = ((i + 1) * 120) * DEG;
      const mid = (a0 + a1) / 2;
      const c = [Math.cos(mid) * 2 * (h - corner), Math.sin(mid) * 2 * (h - corner)];
      for (let j = 0; j <= 6; j++) {
        const a = a0 + ((a1 - a0) * j) / 6;
        pts.push([c[0] + corner * Math.cos(a), c[1] + corner * Math.sin(a)]);
      }
    }
    return pts;
  }
  const HUB_POLY = hubPolygon();

  function hubSvg(P, phi) {
    const { d, t } = bladeAxes(phi);
    const F = { o: [GEO.hub.x0, 0, GEO.hubZ], a: [1, 0, 0], u: d, v: t };
    const paths = G.prismOf(F, HUB_POLY, 0, GEO.hub.x1 - GEO.hub.x0, P);
    const V = G.viewOf(P);
    const front = V[0] > 0;
    const seamPts = front ? null : HUB_POLY.map(([x, y]) => k.iso(add3(add3(F.o, mul3(d, x)), mul3(t, y)), P));
    void seamPts;
    return k.solidSvg(paths, { tone: "hi" });
  }

  const NOSE = (() => {
    const { len, r } = GEO.nose;
    const radius = (s) => r * Math.pow(Math.max(0, 1 - Math.pow(Math.max(0, s) / len, 2.2)), 0.5);
    const slope = (s) => {
      const x = Math.min(Math.max(s / len, 0), 0.9999);
      const inner = 1 - Math.pow(x, 2.2);
      return (r * 0.5 * Math.pow(inner, -0.5) * -2.2 * Math.pow(x, 1.2)) / len;
    };
    const knots = Array.from({ length: 12 }, (_, i) => {
      const s = len * (1 - Math.pow(1 - i / 11, 1.6));
      return [s, radius(s), 1];
    });
    knots[0] = [0, r];
    knots[knots.length - 1] = [len, 0];
    return { radius, slope, meridian: [[0, 0], ...knots] };
  })();

  function noseSvg(P) {
    const F = G.frameOf([GEO.hub.x1, 0, GEO.hubZ], [1, 0, 0], [0, 0, 1], [0, 1, 0]);
    const paths = G.lathe(NOSE.meridian, F, P, { smooth: { slope: NOSE.slope, radius: NOSE.radius, rows: 3 }, rims: "first", steps: 48 });
    const seam = k.lineSvg(G.arcOf(F, 0.35, NOSE.radius(0.35), P, { slope: NOSE.slope(0.35) }), { tone: "faint" });
    const dots = k.dotsSvg(G.dotsOf(F, 0.18, NOSE.radius(0.18) + 0.01, 12, P, { slope: NOSE.slope(0.18), fade: [0.04, 0.42] }), { size: 0.35, tone: "mid" });
    return k.solidSvg(paths, { tone: "hi", inner: seam }) + dots;
  }

  // Nacelle exterior: canopy, bearing nose, cooler, roof mast and rails, drawn
  // back to front for the heading this P' was made for.
  function nacelleSvg(P) {
    const V = G.viewOf(P);
    const n = GEO.nac;
    const plan = { x: n.x0, y: -n.hw, w: n.x1 - n.x0, d: 2 * n.hw, r: n.r };
    const parts = [];
    const canopy = k.slabOf(plan, n.z0, n.z1 - n.z0, P, 6, 0.25);
    const seam = k.sideSeam(plan, n.z0 + 1.15, P, 6);
    const joint = k.sideSeam({ ...plan, x: n.x0 + 0.02 }, n.z1 - 0.9, P, 6);
    const hatch = k.planOutline({ x: -3.6, y: -0.9, w: 2.6, d: 1.8, r: 0.3 }, n.z1, P, 3) + k.lineOnTop([GEO.roofCut, -n.hw], [GEO.roofCut, n.hw], n.z1, P);
    const roofVent = k.planOutline({ x: 0.2, y: -0.35, w: 1.4, d: 0.7, r: 0.3 }, n.z1, P, 3);
    const back = [];
    const front = [];
    const flange = G.disc(0, GEO.flange.x1 - GEO.flange.x0, GEO.flange.r, G.frameOf([GEO.flange.x0, 0, GEO.hubZ], [1, 0, 0], [0, 0, 1], [0, 1, 0]), P);
    const flangeSvg = k.solidSvg(flange, { tone: "mid" });
    (V[0] > 0 ? front : back).push(flangeSvg);
    parts.push(...back);
    parts.push(k.solidSvg(canopy, { tone: "mid", inner: k.lineSvg(seam + joint, { tone: "faint" }) }));
    parts.push(k.lineSvg(hatch + roofVent, { tone: "lo" }));
    parts.push(...front);
    // Roof items, ordered along x by which end faces the viewer.
    const c = GEO.cooler;
    const roof = [];
    const coolerPaths = k.slabOf(c, n.z1, c.h, P, 3, 0.15);
    const fins = [];
    for (let i = 1; i < 7; i++) {
      const x = c.x + (c.w * i) / 7;
      fins.push(k.segment([x, c.y, n.z1 + 0.12], [x, c.y, n.z1 + c.h - 0.12], P), k.segment([x, c.y + c.d, n.z1 + 0.12], [x, c.y + c.d, n.z1 + c.h - 0.12], P));
    }
    const finSide = V[1] > 0 ? fins.filter((_, i) => i % 2 === 1) : fins.filter((_, i) => i % 2 === 0);
    const coolerSvg = k.solidSvg(coolerPaths, { tone: "mid", inner: k.lineSvg(finSide.join(""), { tone: "faint" }) + k.lineSvg(k.planOutline(k.insetPlan(c, 0.3), n.z1 + c.h, P, 2), { tone: "faint" }) });
    roof.push({ x: c.x + c.w / 2, svg: coolerSvg });
    const m = GEO.mast;
    const mastTop = n.z1 + m.h;
    const post = k.solidSvg(k.cylinder(m.x, 0, 0.07, n.z1, m.h, P, 10), { tone: "mid" });
    const arm = G.disc(-1.05, 1.05, 0.05, G.frameAlong([m.x, 0, mastTop - 0.05], [0, 1, 0]), P);
    const armSvg = k.solidSvg(arm, { tone: "mid" });
    const cupPost = k.solidSvg(k.cylinder(m.x, -1.0, 0.04, mastTop, 0.35, P, 8), { tone: "mid" });
    const vanePost = k.solidSvg(k.cylinder(m.x, 1.0, 0.04, mastTop, 0.3, P, 8), { tone: "mid" });
    const light = k.solidSvg(G.sphereOf([c.x + 0.5, 0, n.z1 + c.h + 0.16], 0.16, P), { tone: "mid" });
    const lightBase = k.solidSvg(k.cylinder(c.x + 0.5, 0, 0.12, n.z1 + c.h, 0.06, P, 10), { tone: "mid" });
    roof.push({ x: c.x + 0.5, svg: lightBase + light });
    roof.push({ x: m.x, svg: post + armSvg + cupPost + vanePost, mast: true });
    const rails = [];
    for (const x of [-3.6, -2.2, -0.8]) rails.push(k.solidSvg(k.cylinder(x, 1.25, 0.035, n.z1, 0.85, P, 8), { tone: "lo" }));
    const rail = G.disc(0, 2.8, 0.03, G.frameAlong([-3.6, 1.25, n.z1 + 0.85], [1, 0, 0]), P);
    roof.push({ x: -2.2, svg: rails.join("") + k.solidSvg(rail, { tone: "lo" }) });
    roof.sort((a, b) => (V[0] > 0 ? a.x - b.x : b.x - a.x));
    parts.push(...roof.map((r) => r.svg));
    return parts.join("");
  }

  // The anemometer cups and the wind vane on the roof mast turn with the wind.
  function roofInstrumentsSvg(P, cupDeg, vaneDeg) {
    const n = GEO.nac;
    const m = GEO.mast;
    const z = n.z1 + m.h + 0.35;
    const hubP = [m.x, -1.0, z];
    const cups = [];
    for (let i = 0; i < 3; i++) {
      const a = (cupDeg + i * 120) * DEG;
      const tip = [m.x + 0.32 * Math.cos(a), -1.0 + 0.32 * Math.sin(a), z];
      cups.push(k.segment(hubP, tip, P));
    }
    const cupDots = [0, 1, 2].map((i) => {
      const a = (cupDeg + i * 120) * DEG;
      return k.iso([m.x + 0.32 * Math.cos(a), -1.0 + 0.32 * Math.sin(a), z], P);
    });
    const va = vaneDeg * DEG;
    const vz = n.z1 + m.h + 0.3;
    const tail = [m.x - 0.55 * Math.cos(va), 1.0 - 0.55 * Math.sin(va), vz];
    const nose = [m.x + 0.25 * Math.cos(va), 1.0 + 0.25 * Math.sin(va), vz];
    const fin = [tail, [tail[0], tail[1], vz + 0.18], [m.x - 0.25 * Math.cos(va), 1.0 - 0.25 * Math.sin(va), vz + 0.06]];
    return `${k.lineSvg(cups.join(""), { tone: "mid" })}${k.dotsSvg(cupDots, { size: 0.55, tone: "hi" })}${k.lineSvg(k.segment(tail, nose, P), { tone: "mid" })}${k.lineSvg(pathOf(fin.map((p) => k.iso(p, P)), true), { tone: "mid" })}${k.dotsSvg([k.iso(nose, P)], { size: 0.45, tone: "mid" })}`;
  }

  // Paint order of the live parts, from separating planes:
  //   tower < nacelle (the nacelle sits on the yaw bearing, above the tower);
  //   rotor vs nacelle and tower: the plane between the rotor and the nacelle
  //   front, so the rotor is in front when its upwind face looks at the viewer;
  //   nose vs hub: the hub's front face; blade i vs hub and nose: the flat its
  //   bearing sits on (normal d_i); blade i vs blade j: the plane through the
  //   shaft that bisects them, which orders the blades by d·V.
  function orderOf(P, phi) {
    const V = G.viewOf(P);
    const rotorFront = V[0] > 0;
    const blades = [0, 1, 2].map((i) => ({ i, dv: dot3(bladeAxes(phi + (i * 120) * DEG).d, V) }));
    const behind = blades.filter((b) => b.dv <= 0).sort((a, b) => a.dv - b.dv).map((b) => `blade${b.i}`);
    const ahead = blades.filter((b) => b.dv > 0).sort((a, b) => a.dv - b.dv).map((b) => `blade${b.i}`);
    const core = rotorFront ? ["hub", "nose"] : ["nose", "hub"];
    const rotor = [...behind, ...core, ...ahead];
    return rotorFront ? ["tower", "nacelle", "instruments", ...rotor] : [...rotor, "tower", "nacelle", "instruments"];
  }

  return { silhouette, bladeAxes, bladeMesh, meshPaths, bladeSvg, hubSvg, noseSvg, nacelleSvg, roofInstrumentsSvg, orderOf, NOSE, HUB_POLY };
}
