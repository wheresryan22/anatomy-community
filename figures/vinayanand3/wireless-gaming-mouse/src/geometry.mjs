// Wireless gaming mouse, built part by part in real millimetres.
// Frame: x = the mouse's right (as held), y = its front (toward the buttons' tips), z = up. x × y = z.
// The top shell is an intersection of fitted spheres: every panel is one sphere cut by its neighbours'
// radical planes, the outline's flank planes and its own underside, so panels are convex and curved and
// meet exactly along crisp character lines. Everything inside is prisms and rounds.
import * as G from "../../../../.skill/kit/lathe.mjs";
import { outline, spheres, halfWidth } from "./shape.mjs";

const TAU = Math.PI * 2;
const unit = G.unit3;
const add = G.add3;
const mul = G.mul3;
const sub = G.sub3;
const dot = G.dot3;
const cross = G.cross3;
export const frame = (o, a, u) => {
  const A = unit(a);
  const U = unit(sub(u, mul(A, dot(u, A))));
  return { o, a: A, u: U, v: cross(A, U) };
};
const AX = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
const NX = [-1, 0, 0];
const NY = [0, -1, 0];
const NZ = [0, 0, -1];
const FONT = "Helvetica, Arial, sans-serif";
const MONO = "'IBM Plex Mono', Menlo, monospace";

// Heights (mm)
export const Z = {
  foot: 0, // PTFE skates 0 … 1.0
  base0: 1.0,
  base1: 3.0, // bottom housing 1 … 3
  pcb0: 4.0,
  pcb1: 5.6, // 1.6 mm FR-4 on 1 mm standoffs
  wallF: 16.7, // flank walls under the buttons (1.3 mm parting gap for click travel)
  wallR: 18.0, // flank walls under the palm
  shell: 18.0, // underside of the top shell
};
export const SEAM = -4; // button / palm parting line (y)
const GAP = 0.15; // half-gap at shell seams
const CH = 4.4; // half-width of the centre channel parts (wheel slot, DPI, bridges)
const BTN = 5.0; // inner edge of the main buttons
export const WHEEL = { y: 32, z: 26.5, r: 12.5, w: 3 };
export const SWITCH = { x: 13.5, y: 37 };
export const SENSOR = { y: 2 };
// Click: 0.1 mm pre-travel gap + 0.6 mm switch travel at the post (40.85 mm from the hinge)
export const CLICK = { gap: 0.1, travel: 0.6, arm: 37 - (-4 + 0.15) };
CLICK.deg = ((CLICK.gap + CLICK.travel) / CLICK.arm) * (180 / Math.PI);
CLICK.press = (v) => (CLICK.travel * Math.max(0, v * (CLICK.gap + CLICK.travel) - CLICK.gap)) / CLICK.travel;

const ring = (r, steps = 72, cx = 0, cy = 0) =>
  Array.from({ length: steps }, (_, j) => {
    const a = (TAU * j) / steps;
    return `${j ? "L" : "M"}${(cx + r * Math.cos(a)).toFixed(3)} ${(cy + r * Math.sin(a)).toFixed(3)}`;
  }).join("") + "Z";
const rrect = (x0, y0, x1, y1, r) =>
  `M${x0 + r} ${y0}H${x1 - r}A${r} ${r} 0 0 1 ${x1} ${y0 + r}V${y1 - r}A${r} ${r} 0 0 1 ${x1 - r} ${y1}H${x0 + r}A${r} ${r} 0 0 1 ${x0} ${y1 - r}V${y0 + r}A${r} ${r} 0 0 1 ${x0 + r} ${y0}Z`;
const text = (x, y, s, size, { tone = "hi", anchor = "middle", weight = 400, family = FONT, style = "" } = {}) =>
  `<text class="iso-face-text" data-tone="${tone}" font-size="${size}" text-anchor="${anchor}"${weight !== 400 ? ` font-weight="${weight}"` : ""} style="font-family:${family.replace(/"/g, "'")};letter-spacing:.06em;${style}" transform="translate(${x.toFixed(3)} ${y.toFixed(3)})">${s}</text>`;
const line = (d, tone = "lo") => `<path class="iso-line" data-tone="${tone}" d="${d}"/>`;
const copper = (d, w = 0.35) => `<path class="cu" d="${d}" style="fill:none;stroke:#b8773f;stroke-width:${w};stroke-linecap:round;stroke-linejoin:round;opacity:.9"/>`;
const pad = (x, y, w, h) => `<rect x="${(x - w / 2).toFixed(2)}" y="${(y - h / 2).toFixed(2)}" width="${w}" height="${h}" style="fill:#c99a55"/>`;
// Animated conceptual flows (styled by the page through CSS variables; see film.mjs FLOW_CSS)
const flow = (kind, d) => `<path class="flow flow-${kind}" fill="none" stroke="none" d="${d}"/>`;

function roundedRect(u0, v0, u1, v1, r, round = [1, 1, 1, 1], steps = 8) {
  const out = [];
  const corner = (cu, cv, a0) => {
    for (let j = 0; j <= steps; j++) {
      const a = a0 + (j / steps) * (Math.PI / 2);
      out.push([cu + r * Math.cos(a), cv + r * Math.sin(a)]);
    }
  };
  if (round[0]) corner(u0 + r, v0 + r, Math.PI);
  else out.push([u0, v0]);
  if (round[1]) corner(u1 - r, v0 + r, 1.5 * Math.PI);
  else out.push([u1, v0]);
  if (round[2]) corner(u1 - r, v1 - r, 0);
  else out.push([u1, v1]);
  if (round[3]) corner(u0 + r, v1 - r, 0.5 * Math.PI);
  else out.push([u0, v1]);
  return out;
}
const stadium = (u0, v0, u1, v1, steps = 10) => roundedRect(u0, v0, u1, v1, Math.min(u1 - u0, v1 - v0) / 2 - 1e-3, [1, 1, 1, 1], steps);

// Convex polygon clip by half-plane a·p ≤ b (Sutherland–Hodgman)
function clip(poly, a, b) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const fp = a[0] * p[0] + a[1] * p[1] - b;
    const fq = a[0] * q[0] + a[1] * q[1] - b;
    if (fp <= 0) out.push(p);
    if (fp * fq < 0) {
      const t = fp / (fp - fq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}
// Inward offset of a convex CCW polygon by d
function inset(poly, d) {
  const n = poly.length;
  const lines = [];
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    const t = [b[0] - a[0], b[1] - a[1]];
    const l = Math.hypot(t[0], t[1]);
    const nIn = [-t[1] / l, t[0] / l]; // CCW: inward normal is the left normal
    lines.push({ p: [a[0] + nIn[0] * d, a[1] + nIn[1] * d], t });
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    const L0 = lines[(i - 1 + n) % n];
    const L1 = lines[i];
    const den = L0.t[0] * L1.t[1] - L0.t[1] * L1.t[0];
    const w = [L1.p[0] - L0.p[0], L1.p[1] - L0.p[1]];
    const s = (w[0] * L1.t[1] - w[1] * L1.t[0]) / den;
    out.push([L0.p[0] + L0.t[0] * s, L0.p[1] + L0.t[1] * s]);
  }
  return out;
}

// ---------- shell solver: sphere ∩ half-spaces, with redundant planes removed ----------
const SPH = spheres();
const sph = (zone, strip) => SPH.find((s) => s.zone === zone && Math.abs(s.strip - strip) < 1e-6);
const radical = (sj, sk) => {
  const d = sub(sj.c, sk.c);
  const l = Math.hypot(...d);
  const pj = dot(sj.c, sj.c) - sj.r * sj.r;
  const pk = dot(sk.c, sk.c) - sk.r * sk.r;
  return { n: mul(d, 1 / l), D: (pj - pk) / (2 * l) };
};
const half = (n, D) => {
  const l = Math.hypot(...n);
  return { n: mul(n, 1 / l), D: D / l };
};
const OUT = outline();
const OUT_PLANES = OUT.map((a, i) => {
  const b = OUT[(i + 1) % OUT.length];
  const n = [b[1] - a[1], -(b[0] - a[0]), 0];
  const l = Math.hypot(n[0], n[1]);
  return { n: [n[0] / l, n[1] / l, 0], D: (n[0] * a[0] + n[1] * a[1]) / l };
});
const BOX = { x: [-34, 34], y: [-64, 64], z: [Z.shell - 1, 44] };
// Exact sample cloud of one panel (sphere ∩ half-spaces): points on its flat faces and its curved top,
// thinned to the extreme points along ~240 directions. Used for depth sorting (GJK) in build and runtime.
function pieceCloud(s, planes) {
  const ok = (p, skip = -1) => {
    if ((p[0] - s.c[0]) ** 2 + (p[1] - s.c[1]) ** 2 + (p[2] - s.c[2]) ** 2 > s.r * s.r + 1e-6) return false;
    for (let i = 0; i < planes.length; i++) if (i !== skip && dot(planes[i].n, p) > planes[i].D + 1e-6) return false;
    return true;
  };
  const pts = [];
  planes.forEach((pl, i) => {
    const B = G.frameAlong([0, 0, 0], pl.n);
    const o = mul(pl.n, pl.D);
    for (let a = -80; a <= 80; a += 0.5)
      for (let b = -80; b <= 80; b += 0.5) {
        const p = add(o, add(mul(B.u, a), mul(B.v, b)));
        if (Math.abs(p[0]) > 70 || Math.abs(p[1]) > 70 || p[2] < -5 || p[2] > 50) continue;
        if (ok(p, i)) pts.push(p);
      }
  });
  for (let x = -34; x <= 34; x += 0.5)
    for (let y = -64; y <= 64; y += 0.5) {
      const q = s.r * s.r - (x - s.c[0]) ** 2 - (y - s.c[1]) ** 2;
      if (q <= 0) continue;
      const p = [x, y, s.c[2] + Math.sqrt(q) - 1e-4];
      if (ok(p)) pts.push(p);
    }
  if (!pts.length) return [];
  const keep = new Set();
  const N = 240;
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const zz = 1 - (2 * (i + 0.5)) / N;
    const rr = Math.sqrt(1 - zz * zz);
    const d = [Math.cos(golden * i) * rr, Math.sin(golden * i) * rr, zz];
    let best = -Infinity;
    let at = 0;
    for (let k = 0; k < pts.length; k++) {
      const v = pts[k][0] * d[0] + pts[k][1] * d[1] + pts[k][2] * d[2];
      if (v > best) {
        best = v;
        at = k;
      }
    }
    keep.add(at);
  }
  return [...keep].map((k) => pts[k]);
}
function activeFlats(s, planes) {
  const inside = (p, skip) => {
    if ((p[0] - s.c[0]) ** 2 + (p[1] - s.c[1]) ** 2 + (p[2] - s.c[2]) ** 2 > s.r * s.r) return false;
    for (let i = 0; i < planes.length; i++) if (i !== skip && dot(planes[i].n, p) > planes[i].D + 1e-7) return false;
    return true;
  };
  const keep = [];
  const centre = [0, 0, (BOX.z[0] + BOX.z[1]) / 2];
  planes.forEach((pl, i) => {
    if (keep.some((k) => dot(k.n, pl.n) > 1 - 1e-9 && Math.abs(k.D - pl.D) < 1e-6)) return;
    const B = G.frameAlong([0, 0, 0], pl.n);
    const o = add(centre, mul(pl.n, pl.D - dot(pl.n, centre)));
    let hit = false;
    for (let a = -75; a <= 75 && !hit; a += 0.7)
      for (let b = -75; b <= 75 && !hit; b += 0.7) {
        const p = add(o, add(mul(B.u, a), mul(B.v, b)));
        if (p[0] < BOX.x[0] || p[0] > BOX.x[1] || p[1] < BOX.y[0] || p[1] > BOX.y[1] || p[2] < BOX.z[0] - 1 || p[2] > BOX.z[1]) continue;
        if (inside(p, i)) hit = true;
      }
    if (hit) keep.push(pl);
  });
  return keep;
}

export function buildObject(T, { layer }) {
  const parts = {};
  const groups = {};
  const explode = [];
  const anchors = {};
  const features = [];
  const L = layer;
  const root = T.group("root", { free: { origin: [0, -1, 20] } });
  groups.root = root;
  const dirs = {};
  const assembly = (name, dir, travel, delay = 0, parent = root) => {
    const g = T.group(name, { parent, slide: { direction: unit(dir), travel } });
    groups[name] = g;
    dirs[name] = { dir: unit(dir), parent: parent === root ? null : parent.name };
    explode.push({ name, travel, delay });
    return g;
  };
  const slide = (name, parent, dir, travel) => {
    const g = T.group(name, { parent, slide: { direction: unit(dir), travel } });
    groups[name] = g;
    dirs[name] = { dir: unit(dir), parent: parent === root ? null : parent.name, feature: true };
    return g;
  };
  const hinge = (name, parent, point, axis, range) => {
    const g = T.group(name, { parent, hinge: { point, axis, range } });
    groups[name] = g;
    return g;
  };
  const part = (p) => (parts[p.name] = p);
  const prismOn =
    (axis, u) =>
    (name, group, poly, s0, s1, o = {}) =>
      part(
        T.prism({
          name,
          group,
          layer: L,
          F: frame([0, 0, 0], axis, u),
          polygon: poly,
          s0,
          s1,
          steps: 5,
          tone: o.tone ?? "hi",
          crease: o.crease ?? "lo",
          bevel: o.bevel ?? 0,
          material: o.material,
          lit: o.lit,
          details: o.details,
        }),
      );
  const prismX = prismOn(AX.x, AX.y); // polygon in (y, z)
  const prismY = prismOn(AX.y, AX.z); // polygon in (z, x)
  const prismZ = prismOn(AX.z, AX.x); // polygon in (x, y)
  const prismF = (name, group, F, poly, s0, s1, o = {}) =>
    part(T.prism({ name, group, layer: L, F, polygon: poly, s0, s1, steps: 5, tone: o.tone ?? "hi", crease: o.crease ?? "lo", bevel: o.bevel ?? 0, material: o.material, details: o.details }));
  const round = (name, group, F, s0, s1, r, o = {}) =>
    part(T.round({ name, group, layer: L, F, s0, s1, r, ends: o.ends, tone: o.tone ?? "hi", crease: o.crease ?? "lo", material: o.material, lit: o.lit, details: o.details }));
  const plane = (p, o, u, v, svg, normal, fade = [0.04, 0.3]) => T.plane({ part: p, o, u, v, svg, normal, fade });
  const box = (name, group, [x0, x1], [y0, y1], [z0, z1], o = {}) =>
    prismZ(name, group, o.r ? roundedRect(x0, y0, x1, y1, o.r, o.round, o.steps ?? 6) : [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], z0, z1, o);
  const up = (x, y) => frame([x, y, 0], AX.z, AX.x);
  const alongX = (y, z) => frame([0, y, z], AX.x, AX.y);
  // face drawing helpers: TOP is seen from above (right = +x, down = -y)
  const TOP = { u: [1, 0, 0], v: [0, -1, 0] };
  const BOTTOM = { u: [1, 0, 0], v: [0, 1, 0] };
  const FRONT = { u: [1, 0, 0], v: [0, 0, -1] };
  const LEFT = { u: [0, -1, 0], v: [0, 0, -1] }; // seen from -x
  const RIGHT = { u: [0, 1, 0], v: [0, 0, -1] }; // seen from +x
  const onTop = (p, z, svg, at = [0, 0]) => plane(p, [at[0], at[1], z + 0.02], TOP.u, TOP.v, svg, AX.z);
  const ball = (name, group, s, planes, o = {}) => {
    const active = activeFlats(s, planes);
    const flats = active.map((pl) => ({ n: pl.n, d: pl.D - dot(pl.n, s.c) }));
    const p = part(T.ball({ name, group, layer: L, c: s.c, r: s.r, flats, tone: o.tone ?? "hi", crease: o.crease ?? "faint", material: o.material ?? "graphite" }));
    const cloud = pieceCloud(s, active);
    if (!cloud.length) throw new Error(`empty shell panel ${name}`);
    const og = group.origin ?? [0, 0, 0];
    p.samples = cloud.map((q) => sub(q, og));
    p.exactCloud = p.samples;
    return p;
  };

  // ===================== A. Exterior: top shell =====================
  const top = assembly("top", AX.z, 72, 0);
  const bottomAt = (z) => half([0, 0, -1], -z); // z ≥ value
  const xLE = (x) => half([1, 0, 0], x);
  const xGE = (x) => half([-1, 0, 0], -x);
  const yLE = (y) => half([0, 1, 0], y);
  const yGE = (y) => half([0, -1, 0], -y);

  // Palm: one smooth sphere fitted to the hump (the strip panels are kept for the buttons' sculpting)
  const palmSphere = sph("rear", 0);
  ball("shell.palm", top, palmSphere, [yLE(SEAM - GAP), bottomAt(Z.shell), ...OUT_PLANES]);
  // Honeycomb ribbing drawn on the palm's underside (the shell's real ribbing is a moulded lattice)
  {
    let d = "";
    const r = 3.2;
    for (let row = 0; row < 14; row++)
      for (let col = 0; col < 13; col++) {
        const cx = -26 + col * r * 1.5 * 1.15 + (row % 2) * 0;
        const cy = -60 + row * r * 1.732 * 0.98 + (col % 2) * r * 0.85;
        if (cy > SEAM - 2 || Math.abs(cx) > halfWidth(cy) - 3) continue;
        d += Array.from({ length: 6 }, (_, j) => {
          const a = (j / 6) * TAU;
          return `${j ? "L" : "M"}${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
        }).join("") + "Z";
      }
    plane(parts["shell.palm"], [0, 0, Z.shell - 0.02], BOTTOM.u, BOTTOM.v, line(d, "mid"), NZ, [0.02, 0.25]);
  }

  // Main buttons: front-zone strips 13.5 and 25.5 per side. The inner strip is split in three so that its
  // middle (over the wheel bracket and encoder) can be hollowed higher than the rest.
  const front = (strip) => sph("front", strip);
  const buttons = {};
  for (const side of ["L", "R"]) {
    const sg = side === "L" ? -1 : 1;
    const bg = assembly(`button.${side}`, [0.42 * sg, 0.5, 1], 30, 0.07, top);
    const hz = Z.shell;
    const hy = SEAM + GAP;
    const h = hinge(`click.${side}`, bg, [0, hy, hz], AX.x, [-3, 1]);
    buttons[side] = h;
    const inner = front(13.5 * sg);
    const outer = front(25.5 * sg);
    const keepSide = sg < 0 ? xLE(-BTN) : xGE(BTN);
    const common = [keepSide, yGE(SEAM + GAP), ...OUT_PLANES];
    ball(`button.${side}.outer`, h, outer, [radical(outer, inner), bottomAt(Z.shell), ...common]);
    const cell = radical(inner, outer);
    ball(`button.${side}.rear`, h, inner, [cell, yLE(24.8), bottomAt(Z.shell), ...common]);
    // hollow: z ≥ 32 + 0.6(|x| ... ) rising toward the channel
    const hollow = sg < 0 ? half([0.6, 0, -1], -32 - 0.6 * 9.4) : half([-0.6, 0, -1], -32 - 0.6 * 9.4);
    ball(`button.${side}.mid`, h, inner, [cell, yGE(25.0), yLE(38.8), hollow, ...common]);
    ball(`button.${side}.front`, h, inner, [cell, yGE(39.0), bottomAt(Z.shell), ...common]);
    // actuator post (plunger nub) under the mid piece, over the optical switch
    const x = SWITCH.x * sg;
    const zTop = 32 - 0.6 * (SWITCH.x + 1.5 - 9.4);
    prismZ(`button.${side}.post`, h, roundedRect(x - 1.5, SWITCH.y - 1.5, x + 1.5, SWITCH.y + 1.5, 0.6), 13.4 + CLICK.gap, zTop - 0.05, { material: "graphite", tone: "hi" });
    anchors[`button.${side}`] = [x, 24, 34];
    anchors[`post.${side}`] = [x, SWITCH.y, 18];
  }
  // Centre channel: rear bridge, DPI button, (wheel slot), front bridge — all on the centre front sphere
  const c0 = front(0);
  ball("shell.bridge.rear", top, c0, [xLE(CH), xGE(-CH), yGE(SEAM + GAP), yLE(9.2), bottomAt(24)]);
  ball("shell.bridge.front", top, c0, [xLE(CH), xGE(-CH), yGE(47.6), bottomAt(Z.shell), ...OUT_PLANES]);
  const dpiG = assembly("dpi", AX.z, 16, 0.1, top);
  {
    const s = { ...c0, r: c0.r - 0.6 };
    const p = ball("dpi.cap", dpiG, s, [xLE(CH - 1.2), xGE(-CH + 1.2), yGE(9.7), yLE(15.8), bottomAt(27)], { material: "graphite" });
    round("dpi.stem", dpiG, up(0, 12.8), 7.4, 27, 1.2, { material: "porcelain", tone: "hi" });
    void p;
  }
  anchors.shell = [0, -12, 40];
  anchors.wheelslot = [0, 32, 38];

  // ===================== A. Exterior: flank walls, RGB light guide, side buttons =====================
  const IN = inset(OUT, 1.6);
  const walls = [];
  for (let i = 0; i < OUT.length; i++) {
    const j = (i + 1) % OUT.length;
    const P0 = OUT[i];
    const P1 = OUT[j];
    const mid = [(P0[0] + P1[0]) / 2, (P0[1] + P1[1]) / 2];
    const n = OUT_PLANES[i].n;
    const zoneFront = mid[1] > SEAM;
    const rgb = mid[1] < -46;
    const zTop = zoneFront ? Z.wallF : Z.wallR;
    const tag = `${mid[0] < -0.01 ? "L" : mid[0] > 0.01 ? "R" : "C"}${String(i).padStart(2, "0")}`;
    const g = assembly(`wall.${tag}`, [n[0], n[1], 0.02], 30, 0.13);
    const quad = [P0, P1, IN[j], IN[i]];
    const w = prismZ(`wall.${tag}`, g, quad, Z.base1, rgb ? 14.6 : zTop, { material: "graphite", tone: "hi", crease: "faint" });
    if (rgb) prismZ(`rgb.${tag}`, g, quad, 14.6, zTop, { material: "rgb", tone: "hi", crease: "faint", lit: true });
    walls.push({ i, tag, P0, P1, n, mid, zoneFront, part: w, group: g });
  }
  anchors.rgb = [0, -60, 16];
  // Grip texture on the flank facets (micro-ribbing drawn on the face)
  for (const w of walls) {
    if (w.mid[1] < -44 || w.mid[1] > 50) continue;
    const t = unit([w.P1[0] - w.P0[0], w.P1[1] - w.P0[1], 0]);
    const len = Math.hypot(w.P1[0] - w.P0[0], w.P1[1] - w.P0[1]);
    const o = [w.mid[0] + w.n[0] * 0.02, w.mid[1] + w.n[1] * 0.02, (Z.base1 + Z.wallF) / 2];
    let d = "";
    for (let z = -4; z <= 5; z += 1.6) d += `M${(-len / 2).toFixed(3)} ${z.toFixed(2)}H${(len / 2).toFixed(3)}`;
    plane(w.part, o, t, [0, 0, -1], line(d, "faint"), w.n, [0.04, 0.4]);
  }
  // USB-C port opening on the two nose facets
  for (const w of walls.filter((w) => w.mid[1] > 60)) {
    const t = unit([w.P1[0] - w.P0[0], w.P1[1] - w.P0[1], 0]);
    const tip = [0, 62.5];
    const o = [tip[0] + w.n[0] * 0.02, tip[1] + w.n[1] * 0.02, 7.2];
    // distance along t from the tip vertex (the port is centred on the tip)
    const sgn = dot(t, [w.P1[0] - tip[0], w.P1[1] - tip[1], 0]) > 0 ? 1 : -1;
    const x0 = sgn > 0 ? 0 : -4.6;
    const x1 = sgn > 0 ? 4.6 : 0;
    plane(w.part, o, t, [0, 0, -1], `<path d="M${x0} -1.6H${x1}V1.6H${x0}Z" style="fill:#121416"/>`, w.n, [0.02, 0.2]);
  }
  anchors.usb = [0, 62.5, 7.2];

  // Side buttons on the left flank's straight facet (y -15 … 13)
  const facet = (() => {
    const a = OUT.find(([x, y]) => x < 0 && Math.abs(y - 13) < 1e-6);
    const b = OUT.find(([x, y]) => x < 0 && Math.abs(y + 15) < 1e-6);
    const t = unit([b[0] - a[0], b[1] - a[1], 0]);
    const n = unit([t[1], -t[0], 0]); // outward for the left flank (CCW order front → rear)
    return { a, b, t, n, len: Math.hypot(b[0] - a[0], b[1] - a[1]) };
  })();
  {
    const sideG = assembly("side.buttons", [facet.n[0], facet.n[1], 0], 44, 0.09);
    const F = frame([facet.a[0], facet.a[1], 0], facet.n, facet.t); // u along facet (rearward), v = up
    for (const [k, u0, u1] of [
      ["fwd", 1.2, 12.6],
      ["back", 15.0, 26.4],
    ]) {
      const cap = prismF(`side.${k}`, sideG, F, roundedRect(u0, 11.4, u1, 15.6, 1.6, [1, 1, 1, 1], 5), 0, 2.0, { material: "graphite", tone: "hi", bevel: 0.4 });
      let d = "";
      for (let x = u0 + 2; x <= u1 - 2; x += 1.3) d += `M${x.toFixed(2)} -3.2V-0.8`;
      // face seen from outside: right = -t, down = -z
      const o = add([facet.a[0], facet.a[1], 15.6], mul(facet.n, 2.02));
      const svg = line(d.replace(/M([\d.]+)/g, (_, x) => `M${(-Number(x)).toFixed(2)}`), "lo");
      plane(cap, o, mul(facet.t, -1), [0, 0, -1], svg, facet.n, [0.04, 0.4]);
    }
    anchors.side = add([facet.a[0], facet.a[1], 13.5], mul(facet.t, 14));
    // side-button board + two tact switches, standing parallel to the facet inside the wall
    const boardG = assembly("side.board", [-0.5, 0, 1], 34, 0.2);
    const Fi = frame([facet.a[0], facet.a[1], 0], mul(facet.n, -1), facet.t); // a inward, u rearward, v = down
    prismF("side.board", boardG, Fi, [[0.4, -15.4], [27.4, -15.4], [27.4, -5.9], [0.4, -5.9]], 3.3, 4.3, { material: "pcbdark", tone: "hi" });
    for (const [k, uc] of [
      ["fwd", 6.9],
      ["back", 20.7],
    ])
      prismF(`side.switch.${k}`, boardG, Fi, roundedRect(uc - 2.4, -15.0, uc + 2.4, -11.8, 0.5), 1.8, 3.3, { material: "graphite", tone: "hi" });
    // flex tail from the board's foot to the main board
    const fl = [
      add([facet.a[0], facet.a[1], 0], add(mul(facet.n, -3.0), mul(facet.t, 12.0))),
      add([facet.a[0], facet.a[1], 0], add(mul(facet.n, -3.0), mul(facet.t, 16.0))),
    ];
    prismZ("side.flex", boardG, [[fl[0][0], fl[0][1]], [fl[1][0], fl[1][1]], [-19, fl[1][1]], [-19, fl[0][1]]], Z.pcb1, Z.pcb1 + 0.3, { material: "brass", tone: "mid" });
  }

  // ===================== H. Base, feet, bosses, fasteners =====================
  const baseG = assembly("base", NZ, 24, 0.36);
  const AP = { x: 7.5, y0: SENSOR.y - 8, y1: SENSOR.y + 12 };
  {
    const pieces = {
      front: clip(OUT, [0, -1], -AP.y1),
      rear: clip(OUT, [0, 1], AP.y0),
      left: clip(clip(clip(OUT, [1, 0], -AP.x), [0, 1], AP.y1), [0, -1], -AP.y0),
      right: clip(clip(clip(OUT, [-1, 0], -AP.x), [0, 1], AP.y1), [0, -1], -AP.y0),
    };
    for (const [k, poly] of Object.entries(pieces)) {
      const p = prismZ(`base.${k}`, baseG, poly, Z.base0, Z.base1, { material: "graphite", tone: "hi", crease: "faint" });
      if (k === "rear") {
        // moulded markings on the underside, seen from below: right = +x, down = +y
        const svg =
          text(0, 26, "2.4 GHz · WIRELESS", 2.0, { tone: "mid", family: MONO }) +
          text(0, 29.5, "MODEL AR-01 · 5 V ⎓ 0.5 A", 1.6, { tone: "faint", family: MONO }) +
          `<path class="iso-line" data-tone="mid" d="${rrect(-7, 13, 7, 19, 3)}"/>` +
          text(0, 17.1, "ON ◦ OFF", 1.6, { tone: "mid", family: MONO });
        plane(p, [0, 0, Z.base0 - 0.02], BOTTOM.u, BOTTOM.v, svg, NZ, [0.02, 0.3]);
      }
    }
    // stiffening ribs under the board
    box("base.rib.lat", baseG, [-12, 12], [-30.6, -29.4], [Z.base1, Z.pcb0], { material: "graphite", tone: "mid" });
    box("base.rib.front", baseG, [-10, 10], [23.4, 24.6], [Z.base1, Z.pcb0], { material: "graphite", tone: "mid" });
    box("base.rib.spine.a", baseG, [-0.6, 0.6], [-42, -30.6], [Z.base1, Z.pcb0], { material: "graphite", tone: "mid" });
    box("base.rib.spine.b", baseG, [-0.6, 0.6], [-29.4, -10], [Z.base1, Z.pcb0], { material: "graphite", tone: "mid" });
    // snap hooks for the front of the walls
    for (const sg of [-1, 1]) box(`base.snap.${sg < 0 ? "L" : "R"}`, baseG, sg < 0 ? [-23.8, -21.4] : [21.4, 23.8], [38.5, 41.5], [Z.base1, 9.5], { material: "graphite", tone: "hi", r: 0.6 });
    // shell screw bosses (posts to the palm's underside) and PCB standoffs
    for (const [k, x, y] of [
      ["LF", -26, -20],
      ["RF", 26, -20],
      ["LR", -21, -44],
      ["RR", 21, -44],
    ])
      round(`base.boss.${k}`, baseG, up(x, y), Z.base1, Z.shell, 2.6, { material: "graphite", tone: "hi", details: { seams: [Z.base1 + 2] } });
    for (const [k, x, y] of [
      ["L", -14, 18],
      ["R", 14, 18],
      ["T", 0, -44.6],
    ])
      round(`base.standoff.${k}`, baseG, up(x, y), Z.base1, Z.pcb0, 2.0, { material: "graphite", tone: "mid" });
  }
  anchors.base = [0, -20, 2];
  anchors.aperture = [0, SENSOR.y + 2, Z.base0];
  const feetG = assembly("feet", NZ, 40, 0.33);
  {
    const feet = {
      front: stadium(-15, 44, 15, 51),
      rear: stadium(-14, -55, 14, -48),
      left: stadium(-27.2, -15.5, -22.6, -2.5),
      right: stadium(22.6, -15.5, 27.2, -2.5),
    };
    for (const [k, poly] of Object.entries(feet)) prismZ(`foot.${k}`, feetG, poly, Z.foot, Z.base0, { material: "ptfe", tone: "hi", bevel: 0.25 });
  }
  anchors.feet = [0, 48, 0];
  const screwG = assembly("screws", NZ, 54, 0.3);
  for (const [k, x, y] of [
    ["LF", -26, -20],
    ["RF", 26, -20],
    ["LR", -21, -44],
    ["RR", 21, -44],
  ]) {
    const s = round(`screw.${k}`, screwG, up(x, y), 0.4, Z.base0, 2.2, { material: "steel", tone: "hi" });
    plane(s, [x, y, 0.38], BOTTOM.u, BOTTOM.v, `<path d="M-1.1 0H1.1M0 -1.1V1.1" style="fill:none;stroke:#3a3f44;stroke-width:.5"/>`, NZ, [0.02, 0.2]);
  }

  // ===================== D. Optical sensor: lens in the base aperture =====================
  const lensG = assembly("lens", NZ, 12, 0.3);
  {
    const p = box("lens", lensG, [-6.8, 6.8], [AP.y0 + 0.7, AP.y1 - 0.7], [Z.base0 + 0.3, Z.pcb0 - 0.1], { material: "glass", tone: "hi", r: 1.4, bevel: 0.3 });
    round("lens.dome", lensG, up(0, SENSOR.y), Z.base0 + 0.02, Z.base0 + 0.3, 2.2, { material: "glass", tone: "hi" });
    // light pipe (front) and imaging aperture drawn on the lens top
    const svg = `<path class="iso-line" data-tone="mid" d="${ring(2.2, 40)}${rrect(-2.4, 6.9, 2.4, 9.9, 0.8)}"/>` + line("M-5.5 -4.5H5.5", "faint");
    onTop(p, Z.pcb0 - 0.1, svg, [0, SENSOR.y]);
  }
  anchors.lens = [0, SENSOR.y, Z.base0];

  // ===================== E. Main PCB and electronics =====================
  const pcbG = assembly("pcb", AX.z, 20, 0.3);
  const PCB = (() => {
    const r = [
      [6, 52],
      [13, 49],
      [18.5, 39],
      [21, 22],
      [21, -8],
      [19, -30],
      [13, -48],
      [6, -52],
    ];
    return [...r, ...r.slice().reverse().map(([x, y]) => [-x, y])];
  })();
  const board = prismZ("pcb", pcbG, PCB, Z.pcb0, Z.pcb1, { material: "pcbdark", tone: "hi", crease: "faint" });
  {
    // copper, pads, silkscreen and the sensor window on the top face (svg: x right, y = -world y)
    const Y = (y) => -y;
    let svg = "";
    svg += `<path d="${rrect(-3.8, Y(SENSOR.y + 6), 3.8, Y(SENSOR.y - 6), 1)}" style="fill:#0d1a12"/>`; // window under the sensor
    // ground pour hatching
    let hatch = "";
    for (let y = -46; y <= 46; y += 2.4) hatch += `M-18 ${Y(y)}H18`;
    svg += `<path d="${hatch}" style="fill:none;stroke:#2f6b47;stroke-width:.18;opacity:.55"/>`;
    // traces: switches → MCU, sensor → MCU, encoder, DPI, side flex, USB → PMIC
    svg += copper(`M-13.5 ${Y(32)}V${Y(24)}L-9 ${Y(19)}H6L10 ${Y(14)}V${Y(-16)}`);
    svg += copper(`M13.5 ${Y(32)}V${Y(24)}L12 ${Y(20)}V${Y(-16)}`);
    svg += copper(`M4.8 ${Y(4)}H8.5L11.5 ${Y(1)}V${Y(-16)}`);
    svg += copper(`M-5.8 ${Y(30)}L-7.5 ${Y(26)}H-10.5`, 0.25);
    svg += copper(`M0 ${Y(10.8)}V${Y(9)}H6L9.5 ${Y(5.5)}`, 0.25);
    svg += copper(`M-19 ${Y(0)}H-12L-8 ${Y(-4)}V${Y(-12)}H9L10 ${Y(-16)}`, 0.25);
    svg += copper(`M-2 ${Y(44)}V${Y(38)}L-8 ${Y(30)}V${Y(22)}L-16 ${Y(14)}V${Y(-5)}`, 0.45);
    // RF: SoC → matching network → antenna feed
    svg += copper(`M10.5 ${Y(-23)}L10 ${Y(-29)}L9.5 ${Y(-35)}L8.5 ${Y(-40)}L5 ${Y(-47)}L4 ${Y(-49)}`, 0.55);
    // battery connector → PMIC, PMIC → LDOs → loads
    svg += copper(`M-17 ${Y(-21)}V${Y(-9)}`, 0.6);
    svg += copper(`M-15 ${Y(-7)}H-13L-11 ${Y(-3)}H-6`, 0.45);
    svg += copper(`M-17 ${Y(-5)}V${Y(7.5)}`, 0.45);
    // pads and vias
    for (const [x, y] of [
      [-10, 2],
      [-10, -10],
      [16, 2],
      [16, 10],
      [-6, 42],
      [6, 42],
      [-15, -34],
      [15, -40],
      [0, -30],
      [-4, 20],
      [4, 20],
    ])
      svg += `<circle cx="${x}" cy="${Y(y)}" r=".45" style="fill:#c99a55"/>`;
    for (const [x, y] of [
      [-7, 46],
      [-7, 44.5],
      [7, 46],
      [7, 44.5],
    ])
      svg += pad(x, Y(y), 1.2, 0.8);
    svg += text(-12, Y(-36), "AR-01 REV C", 1.4, { tone: "lo", family: MONO, style: "fill:#d8e6dc" });
    svg += text(-12, Y(-38.2), "FR-4 · 4L · 1.6", 1.1, { tone: "lo", family: MONO, style: "fill:#d8e6dc" });
    svg += `<path d="${rrect(-14.5, Y(-11), 8.5, Y(-41.5), 1.5)}" style="fill:none;stroke:#d8e6dc;stroke-width:.2;stroke-dasharray:1 .8"/>`;
    svg += text(-3, Y(-44), "BATT", 1.2, { tone: "lo", family: MONO, style: "fill:#d8e6dc" });
    // conceptual flows (styled by the page): signal paths and power paths
    svg += flow("sig", `M0 ${Y(SENSOR.y)}H8.5L11.5 ${Y(-1)}V${Y(-17)}`);
    svg += flow("sig", `M-13.5 ${Y(34)}V${Y(24)}L-9 ${Y(19)}H6L10 ${Y(14)}V${Y(-17)}`);
    svg += flow("sig", `M13 ${Y(-23)}L10 ${Y(-29)}L9.5 ${Y(-35)}L8.5 ${Y(-40)}L5 ${Y(-47)}L0 ${Y(-49.3)}`);
    svg += flow("pow", `M-17 ${Y(-22)}V${Y(-7)}`);
    svg += flow("pow", `M-15 ${Y(-7)}H-13L-11 ${Y(-3)}H-4`);
    svg += flow("pow", `M-15 ${Y(-7)}H-8V${Y(-14)}H12V${Y(-17)}`);
    svg += flow("pow", `M-17 ${Y(-5)}V${Y(8.5)}`);
    svg += flow("chg", `M0 ${Y(45)}V${Y(38)}L-8 ${Y(30)}V${Y(22)}L-16 ${Y(14)}V${Y(-4)}`);
    svg += flow("chg", `M-17 ${Y(-9)}V${Y(-21)}`);
    onTop(board, Z.pcb1, svg);
  }
  anchors.pcb = [0, 0, Z.pcb1];
  const chip = (name, [x0, x1], [y0, y1], z1, o = {}) => {
    const p = box(name, o.group ?? pcbG, [x0, x1], [y0, y1], [Z.pcb1, z1], { material: o.material ?? "graphite", tone: "hi", r: o.r ?? 0.3, bevel: o.bevel ?? 0.15 });
    if (o.label) onTop(p, z1, o.label, [(x0 + x1) / 2, (y0 + y1) / 2]);
    return p;
  };
  const lbl = (s, size = 1.0, extra = "") => text(0, size * 0.36, s, size, { tone: "lo", family: MONO, style: `fill:#c9ccd0;${extra}` });
  chip("soc", [10, 16], [-23, -17], 6.5, { label: lbl("SoC", 1.3) + text(0, 1.8, "2.4G", 0.8, { family: MONO, style: "fill:#9aa0a6" }) + `<circle cx="-2.3" cy="-2.3" r=".35" style="fill:#9aa0a6"/>` });
  chip("crystal", [13, 15.4], [-27.4, -25.4], 6.4, { material: "steel", label: lbl("32M", 0.55, "fill:#3a3f44") });
  chip("flash", [12.5, 15.5], [-10.2, -7.8], 6.3, { label: lbl("NOR", 0.7) });
  chip("pmic", [-19, -15], [-9, -5], 6.4, { label: lbl("PMIC", 0.85) });
  chip("ldo.a", [-19, -17], [7.5, 9.5], 6.3, { label: lbl("1V8", 0.5) });
  chip("ldo.b", [-19, -17], [11.5, 13.5], 6.3, { label: lbl("3V3", 0.5) });
  const passives = [
    ["c1", -13.8, -7.0, "x"],
    ["c2", -13.8, -4.6, "x"],
    ["c3", -15.2, 10.5, "y"],
    ["c4", 8.6, -20.6, "y"],
    ["c5", 8.6, -18.2, "y"],
    ["r1", 11.2, -14.2, "x"],
    ["c6", 16.9, -26.4, "y"],
    ["rf.l1", 10.1, -30, "y"],
    ["rf.c1", 9.6, -35, "y"],
    ["rf.c2", 8.6, -40, "y"],
  ];
  for (const [n, x, y, o] of passives) {
    const [hx, hy] = o === "x" ? [0.8, 0.4] : [0.4, 0.8];
    box(`passive.${n}`, pcbG, [x - hx, x + hx], [y - hy, y + hy], [Z.pcb1, Z.pcb1 + 0.8], { material: n.startsWith("r") && !n.startsWith("rf") ? "graphite" : "milk", tone: "hi", r: 0.15 });
  }
  anchors.soc = [13, -20, 6.5];
  anchors.pmic = [-17, -7, 6.4];
  anchors.rf = [9.5, -35, 6];
  // USB-C receptacle (mid-mount at the board's nose)
  {
    const p = prismY("usbc", pcbG, stadium(Z.pcb1, -4.45, Z.pcb1 + 3.2, 4.45), 44, 59.6, { material: "steel", tone: "hi" });
    plane(p, [0, 59.62, Z.pcb1 + 1.6], FRONT.u, FRONT.v, `<path d="${rrect(-3.6, -0.9, 3.6, 0.9, 0.9)}" style="fill:#16181a"/><path d="M-2.6 0H2.6" style="stroke:#9aa1a8;stroke-width:.5"/>`, AX.y, [0.02, 0.2]);
  }
  // battery connector
  chip("batt.conn", [-19.5, -15], [-27, -21], 8.4, { material: "porcelain", r: 0.4, label: "" });
  // switches mounted on the board: middle click and DPI tact
  chip("mid.switch", [-2.5, 2.5], [WHEEL.y - 2.5, WHEEL.y + 2.5], 7.4, { material: "graphite", r: 0.5 });
  round("mid.switch.stem", pcbG, up(0, WHEEL.y), 7.4, 12.4, 1.0, { material: "porcelain", tone: "hi" });
  chip("dpi.switch", [-2, 2], [10.8, 14.8], 7.2, { material: "graphite", r: 0.4 });
  // board screws
  for (const [k, x, y] of [
    ["L", -14, 18],
    ["R", 14, 18],
    ["T", 0, -44.6],
  ]) {
    const s = round(`pcb.screw.${k}`, pcbG, up(x, y), Z.pcb1, Z.pcb1 + 0.8, 1.3, { material: "steel", tone: "hi" });
    onTop(s, Z.pcb1 + 0.8, `<path d="M-.7 0H.7M0 -.7V.7" style="fill:none;stroke:#3a3f44;stroke-width:.35"/>`, [x, y]);
  }
  // battery rails (part of the board's carrier)
  box("batt.rail.L", pcbG, [-11, -9], [-39, -14], [Z.pcb1, 7.0], { material: "graphite", tone: "mid", r: 0.4 });
  box("batt.rail.R", pcbG, [3, 5], [-39, -14], [Z.pcb1, 7.0], { material: "graphite", tone: "mid", r: 0.4 });

  // ===================== D. Sensor IC and illumination =====================
  const sensorG = assembly("sensor", AX.z, 12, 0.24, pcbG);
  {
    const p = chip("sensor", [-4.8, 4.8], [SENSOR.y - 5.5, SENSOR.y + 5.5], 8.8, { group: sensorG, material: "graphite", r: 0.6, bevel: 0.3 });
    let leads = "";
    for (let i = 0; i < 8; i++) leads += `M-4.8 ${(-4.2 + i * 1.2).toFixed(2)}h-.6M4.8 ${(-4.2 + i * 1.2).toFixed(2)}h.6`;
    onTop(
      p,
      8.8,
      text(0, -1.0, "OPTICAL", 1.05, { family: MONO, style: "fill:#d6d9dc" }) + text(0, 0.8, "SENSOR", 1.05, { family: MONO, style: "fill:#d6d9dc" }) + `<circle cx="-3.6" cy="-4.4" r=".4" style="fill:#9aa0a6"/>` + `<path d="${rrect(-2.2, 2.2, 2.2, 4.4, 0.4)}" style="fill:none;stroke:#9aa0a6;stroke-width:.2"/>`,
      [0, SENSOR.y],
    );
    plane(p, [0, SENSOR.y, 5.6 + 0.02], TOP.u, TOP.v, `<path d="${leads}" style="stroke:#b8bdc2;stroke-width:.35"/>`, AX.z);
    round("sensor.led", sensorG, up(0, SENSOR.y - 8.4), Z.pcb1, 7.6, 1.4, { material: "signal", tone: "hi", ends: ["flat", "flat"] });
  }
  anchors.sensor = [0, SENSOR.y, 8.8];
  anchors.led = [0, SENSOR.y - 8.4, 7.6];

  // ===================== F. Wireless: stamped inverted-F antenna at the tail =====================
  const antG = assembly("antenna", AX.z, 14, 0.22, pcbG);
  {
    const p = prismY("antenna.radiator", antG, [[Z.pcb1, -7], [10.6, -7], [10.6, 7], [Z.pcb1, 7]], -49.6, -49.0, { material: "copper", tone: "hi" });
    plane(p, [0, -49.62, 8.1], [-1, 0, 0], [0, 0, -1], `<path d="M-4 2.5V-1.5M-2 2.5V0" style="stroke:#6e3720;stroke-width:.5"/>` + text(2, 1.2, "2.4G", 1.1, { family: MONO, style: "fill:#6e3720" }), NY, [0.04, 0.3]);
    box("antenna.arm", antG, [-7, 7], [-51.2, -49.0], [10.6, 11.1], { material: "copper", tone: "hi" });
  }
  anchors.antenna = [0, -50, 10];

  // ===================== B. Click mechanisms: optical switch modules =====================
  for (const side of ["L", "R"]) {
    const sg = side === "L" ? -1 : 1;
    const x = SWITCH.x * sg;
    const y = SWITCH.y;
    const g = assembly(`switch.${side}`, [0.18 * sg, 0, 1], 36, 0.19);
    box(`switch.${side}.base`, g, [x - 3, x + 3], [y - 5, y + 5], [Z.pcb1, 8.0], { material: "graphite", tone: "hi", r: 0.5, bevel: 0.2 });
    box(`switch.${side}.wall.a`, g, [x - 3, x - 2.2], [y - 2.5, y + 2.5], [8.0, 12.0], { material: "graphite", tone: "mid" });
    box(`switch.${side}.wall.b`, g, [x + 2.2, x + 3], [y - 2.5, y + 2.5], [8.0, 12.0], { material: "graphite", tone: "mid" });
    const em = box(`switch.${side}.emitter`, g, [x - 3, x + 3], [y + 2.5, y + 5], [8.0, 12.0], { material: "graphite", tone: "hi", r: 0.4 });
    box(`switch.${side}.detector`, g, [x - 3, x + 3], [y - 5, y - 2.5], [8.0, 12.0], { material: "graphite", tone: "hi", r: 0.4 });
    onTop(em, 12.0, `<circle cx="${(1.3 * 1).toFixed(2)}" cy="0" r=".55" style="fill:#e45a52"/>`, [x, y + 3.75]);
    const lift = assembly(`switch.${side}.plunger.lift`, AX.z, 9, 0.22, g);
    const press = slide(`switch.${side}.press`, lift, NZ, CLICK.travel);
    box(`switch.${side}.plunger`, press, [x - 1.6, x + 1.6], [y - 1.9, y + 1.9], [10.6, 13.4], { material: "porcelain", tone: "hi", r: 0.4 });
    round(`switch.${side}.spring`, press, up(x, y), 9.0, 10.6, 1.0, { material: "steel", tone: "hi", details: { ribs: { s0: 9.1, s1: 10.5, count: 18, tone: "lo" } } });
    // pins drawn on the base's flanks
    anchors[`switch.${side}`] = [x, y, 11];
  }
  anchors.beam = [-SWITCH.x + 1.3, SWITCH.y, 10.2];

  // ===================== C. Scroll wheel module =====================
  const wheelG = assembly("wheel", [0, 0.25, 1], 50, 0.17);
  {
    const spin = hinge("wheel.spin", wheelG, [0, WHEEL.y, WHEEL.z], AX.x, [-3600, 3600]);
    const F = alongX(WHEEL.y, WHEEL.z);
    round("wheel.tire", spin, F, -WHEEL.w, WHEEL.w, WHEEL.r, { material: "rubber", tone: "hi", details: { ribs: { s0: -WHEEL.w + 0.4, s1: WHEEL.w - 0.4, count: 48, tone: "lo", fade: [0.06, 0.5] }, seams: [-WHEEL.w + 0.8, WHEEL.w - 0.8] } });
    for (const sg of [-1, 1]) {
      round(`wheel.hub.${sg < 0 ? "L" : "R"}`, spin, F, sg < 0 ? -3.8 : 3.0, sg < 0 ? -3.0 : 3.8, 7, { material: "gunmetal", tone: "hi", details: { bolts: [{ s: sg < 0 ? -3.8 : 3.8, r: 4.8, count: 12, size: 0.5, tone: "lit" }] } });
      round(`wheel.axle.${sg < 0 ? "L" : "R"}`, spin, F, sg < 0 ? -5.2 : 3.8, sg < 0 ? -3.8 : 5.2, 1.2, { material: "steel", tone: "hi" });
      const bracket = [
        [WHEEL.y - 4, Z.pcb1],
        [WHEEL.y + 4, Z.pcb1],
        [WHEEL.y + 4, 26.5],
        [WHEEL.y + 2.4, 28.5],
        [WHEEL.y - 2.4, 28.5],
        [WHEEL.y - 4, 26.5],
      ];
      prismX(`wheel.bracket.${sg < 0 ? "L" : "R"}`, wheelG, bracket, sg < 0 ? -6.4 : 5.2, sg < 0 ? -5.2 : 6.4, { material: "graphite", tone: "hi" });
    }
    // incremental rotary encoder on the left bracket
    const enc = round("wheel.encoder", wheelG, F, -9.4, -6.4, 3.5, { material: "gunmetal", tone: "hi", details: { seams: [-7.4] } });
    plane(enc, [-9.42, WHEEL.y, WHEEL.z], [0, -1, 0], [0, 0, -1], `<path class="iso-line" data-tone="mid" d="${ring(2.6, 30)}"/>` + Array.from({ length: 12 }, (_, j) => {
      const a = (j / 12) * TAU;
      return `<path d="M${(1.4 * Math.cos(a)).toFixed(2)} ${(1.4 * Math.sin(a)).toFixed(2)}L${(2.4 * Math.cos(a)).toFixed(2)} ${(2.4 * Math.sin(a)).toFixed(2)}" style="stroke:#b0b5ba;stroke-width:.3"/>`;
    }).join(""), NX, [0.04, 0.3]);
  }
  anchors.wheel = [0, WHEEL.y, WHEEL.z + 4];
  anchors.encoder = [-7.9, WHEEL.y, WHEEL.z];

  // ===================== G. Battery and power =====================
  const battG = assembly("battery", [-0.3, 0, 1], 40, 0.21);
  {
    const p = box("battery", battG, [-13, 7], [-41, -12], [7.0, 12.5], { material: "gold", tone: "hi", r: 1.6, bevel: 0.6 });
    onTop(
      p,
      12.5,
      `<path class="iso-line" data-tone="mid" d="${rrect(-8.4, -12, 8.4, 12, 1.2)}"/>` +
        text(0, -5.2, "Li-Po 3.7 V", 2.1, { family: MONO, style: "fill:#4b3920" }) +
        text(0, -2.2, "300 mAh · 1.11 Wh", 1.5, { family: MONO, style: "fill:#6b5430" }) +
        text(0, 6.5, "+  −", 2.4, { family: MONO, style: "fill:#4b3920" }),
      [-3, -26.5],
    );
    prismY("battery.pcm", battG, [[7.0, -12], [12.5, -12], [12.5, 6], [7.0, 6]], -42.4, -41.0, { material: "pcbdark", tone: "hi" });
    for (const [k, route, hue] of [
      ["red", [[-12.8, -42.0, 9.6], [-15.4, -41.6, 9.4], [-17.2, -35, 8.6], [-17.3, -29.8, 7.2], [-17.3, -27.8, 7.0]], "red"],
    ]) {
      T.tube({
        name: `battery.lead.${k}`,
        group: battG,
        layer: L,
        route,
        r: 0.75,
        chunk: 30,
        turn: 120,
        hue: hue ?? undefined,
        material: hue ? undefined : "rubber",
      });
    }
  }
  anchors.battery = [-3, -26, 12.5];
  anchors.charge = [0, 55, 7];

  // ===================== F. USB receiver dongle (shown separately) =====================
  const dongleG = assembly("dongle", [0.2, 0.4, 1], 0, 0);
  {
    const b = box("dongle.body", dongleG, [66, 78], [28, 35.5], [0, 6.2], { material: "graphite", tone: "hi", r: 1.6, bevel: 0.6 });
    onTop(b, 6.2, `<circle cx="0" cy="-1.4" r=".7" style="fill:#5fc8de"/>` + text(0, 1.8, "2.4G", 1.4, { family: MONO, style: "fill:#c9ccd0" }), [72, 31.75]);
    const plug = box("dongle.plug", dongleG, [66.2, 77.8], [35.5, 47.5], [0.85, 5.35], { material: "steel", tone: "hi", r: 0.5 });
    onTop(plug, 5.35, `<rect x="-3.6" y="-3.2" width="2.4" height="2" style="fill:#3a3f44"/><rect x="1.2" y="-3.2" width="2.4" height="2" style="fill:#3a3f44"/>`, [72, 41.5]);
  }
  anchors.dongle = [72, 36, 6];

  anchors.body = [0, -1, 20];
  anchors.top = [0, 10, 38];
  anchors.bottom = [0, 0, 0.5];

  for (const v of [0, 0.5, 1]) features.push({ "click.L": -CLICK.deg * v, "click.R": -CLICK.deg * v, "switch.L.press": CLICK.press(v), "switch.R.press": CLICK.press(v), "wheel.spin": v * 120 });
  return { parts, groups, explode, root, anchors, features, dirs, counts: { assemblies: 0 } };
}

export function explodeValues(explode, apart, { stretch = 0.55 } = {}) {
  const out = {};
  for (const { name, travel, delay } of explode) {
    const t = Math.max(0, Math.min(1, (apart - delay * stretch) / (1 - stretch)));
    out[name] = travel * t * t * (3 - 2 * t);
  }
  return out;
}
