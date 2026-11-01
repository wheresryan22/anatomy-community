// Geometry for the lift pump bench model. Pure: the build and the page both call makeParts(k, G, P, C).
// World units are millimetres of the model; z is up, the bench top is z = 0.

export const C = {
  BASE: { x: -132, y: -80, w: 256, d: 186, r: 8 },
  CIST: { x: -92, y: -62, w: 184, d: 124, r: 3 },
  TRAY: 8,
  TANK_TOP: 152,
  GROUND: 162,
  FOOT_R: 13, FOOT_TOP: 24,
  PIPE_R: 9, PIPE_BORE: 8,
  LOW_SEAT: 30,
  GLAND_TOP: 168,
  COUPLING: [192, 197, 204],
  BARREL_R: 16, BORE: 15, BARREL_TOP: 282,
  HEAD_TOP: 304, GUIDE_TOP: 308,
  SPOUT_Z: 292, SPOUT_R: 6.5, SPOUT_IN: 5, ELBOW: [56, 0, 287], ELBOW_R: 7.6, NOZZLE_END: 270,
  BUCKET_H: 14,
  POST: [-44, 0], POST_W: 12,
  PIVOT_X: -44, ARM: 46, LINK: 26, SWING: 28.6,
  CROSS_MIN: 317,
  JAR: [56, 0], JAR_R: 20, JAR_IN: 19, JAR_FOOT: 166, JAR_FLOOR: 170, JAR_TOP: 252,
  BELL: [63, -9], BELL_R: 6.5, STAND_TOP: 232, BELL_TOP: 236,
  DRAIN_OUT: 138,
};

C.LIP = C.SPOUT_Z - C.SPOUT_IN;

// The priming jug: a brass cup with a side handle. It holds enough to fill the pipe from the
// cistern's level up to the bucket, and tips about the handle's axis (x) toward +y to pour.
Object.assign(C, {
  JUG_HOME: [-100, 88], JUG_R: 20, JUG_IN: 18.5, JUG_H: 44, JUG_FLOOR: 3, JUG_FILL: 34,
  JUG_LIFT: 322, POUR_AT: [8, -10, 318], WL0: 112,
});

// Volume (mm³) a jug tipped by phi can hold before it spills over the lip.
export function jugHold(C, phi) {
  const R = C.JUG_IN, H = C.JUG_H - C.JUG_FLOOR;
  const t = Math.tan(Math.min(phi, 1.5));
  let v = 0;
  const n = 80;
  for (let i = 0; i < n; i++) {
    const rho = -R + ((i + 0.5) / n) * 2 * R;
    const L = Math.max(0, Math.min(H, H - (R - rho) * t));
    v += 2 * Math.sqrt(R * R - rho * rho) * L * ((2 * R) / n);
  }
  return v;
}

// Everything priming needs, derived once: the volume to pour, the tilt that leaves the rest, the pour pose.
export function priming(C, zbLow) {
  const AP = Math.PI * C.PIPE_BORE * C.PIPE_BORE;
  const AB = Math.PI * C.BORE * C.BORE;
  const z0 = C.COUPLING[2];
  const need = AP * (z0 - C.WL0) + AB * (zbLow - z0);
  const v0 = Math.PI * C.JUG_IN * C.JUG_IN * C.JUG_FILL;
  let lo = 0, hi = 1.5;
  for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (jugHold(C, m) > v0 - need - 300) lo = m; else hi = m; }
  const phiEnd = hi;
  const a = [0, Math.sin(phiEnd), Math.cos(phiEnd)];
  const d = [0, Math.cos(phiEnd), -Math.sin(phiEnd)];
  const lipOff = [0, C.JUG_H * a[1] + C.JUG_IN * d[1], C.JUG_H * a[2] + C.JUG_IN * d[2]];
  const pour = [C.POUR_AT[0], C.POUR_AT[1] - lipOff[1], C.POUR_AT[2] - lipOff[2]];
  return { AP, AB, need, v0, phiEnd, pour };
}

// The water level under the bucket once `poured` mm³ has run down the pipe.
export function primeLevel(C, PR, poured, zb) {
  const z0 = C.COUPLING[2];
  const pipe = PR.AP * (z0 - C.WL0);
  const level = poured <= pipe ? C.WL0 + poured / PR.AP : z0 + (poured - pipe) / PR.AB;
  return Math.min(level, zb);
}

// The jug's path: lift, carry in front of the pump, round the far side, tip, and the same way home.
export function jugPose(C, PR, t) {
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const [hx, hy] = C.JUG_HOME;
  const Z = C.JUG_LIFT;
  // round the far side of the post, under the raised handle (the sweep is held up meanwhile)
  const way = [[hx, hy, 0], [hx, hy, Z - 22], [hx, PR.pour[1], Z], [PR.pour[0], PR.pour[1], PR.pour[2]]];
  const legs = [0.8, 1.1, 1.1];
  const out = legs.reduce((s, x) => s + x, 0);
  const TILT = 1.7, HOLD = 1.1, BACK = 0.5;
  const along = (u) => {
    let left = u;
    for (let i = 0; i < legs.length; i++) {
      if (left <= legs[i] || i === legs.length - 1) {
        const e = ease(left / legs[i]);
        return way[i].map((v, j) => v + (way[i + 1][j] - v) * e);
      }
      left -= legs[i];
    }
    return way[way.length - 1];
  };
  if (t <= out) return { B: along(t), phi: 0, stage: "carry" };
  if (t <= out + TILT) return { B: way[3], phi: PR.phiEnd * ease((t - out) / TILT), stage: "pour" };
  if (t <= out + TILT + HOLD) return { B: way[3], phi: PR.phiEnd, stage: "pour" };
  if (t <= out + TILT + HOLD + BACK) return { B: way[3], phi: PR.phiEnd * (1 - ease((t - out - TILT - HOLD) / BACK)), stage: "back" };
  const r = t - (out + TILT + HOLD + BACK);
  if (r >= out) return { B: way[0], phi: 0, stage: "home" };
  return { B: along(out - r), phi: 0, stage: "back" };
}

// Lever kinematics: theta > 0 lifts the short arm, so the rod and bucket rise.
export function kinematics(C) {
  const rad = (d) => (d * Math.PI) / 180;
  const crossOf = (theta, Zp) => {
    const ex = C.PIVOT_X + C.ARM * Math.cos(theta);
    const ez = Zp + C.ARM * Math.sin(theta);
    return { E: [ex, 0, ez], C: [0, 0, ez - Math.sqrt(C.LINK * C.LINK - ex * ex)] };
  };
  const lo = -rad(C.SWING), hi = rad(C.SWING);
  const Zp = C.CROSS_MIN - crossOf(lo, 0).C[2];
  const top = crossOf(hi, Zp).C[2];
  const bottom = crossOf(lo, Zp).C[2];
  const stroke = top - bottom;
  const rod = top - 264; // bucket bottom sits at 264 at the top of the stroke
  return { Zp, lo, hi, stroke, rod, crossOf: (t) => crossOf(t, Zp) };
}

export function makeParts(k, G, P, C) {
  const K = kinematics(C);
  const cam = k.cameraOf ? k.cameraOf(P) : null;
  const a = ((P.azimuth ?? 45) * Math.PI) / 180;
  const W = [Math.sin(a), -Math.cos(a), 0]; // screen right
  const TV = [Math.cos(a), Math.sin(a), 0]; // toward the viewer
  const UP = [0, 0, 1];
  const S = (paths, style) => k.solidSvg(paths, style);
  const L = (d, style) => k.lineSvg(d, style);
  const D = (points, style) => k.dotsSvg(points, style);
  const at = (p) => k.iso(p, P);
  const n1 = (v) => (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, "");
  const cyl = (cx, cy, r, z0, z1, steps = 40, bevel = 0) => k.cylinder(cx, cy, r, z0, z1 - z0, P, steps, bevel);
  const vertical = (cx, cy) => G.frameOf([cx, cy, 0], UP, [1, 0, 0], [0, 1, 0]);
  const add = (p, q, s = 1) => [p[0] + q[0] * s, p[1] + q[1] * s, p[2] + q[2] * s];
  const rot = (v, axis, ang) => {
    const c = Math.cos(ang), s = Math.sin(ang);
    const d = G.dot3(axis, v);
    const x = G.cross3(axis, v);
    return [v[0] * c + x[0] * s + axis[0] * d * (1 - c), v[1] * c + x[1] * s + axis[1] * d * (1 - c), v[2] * c + x[2] * s + axis[2] * d * (1 - c)];
  };
  const LIFT = rot(W, TV, 0.3)[2] > 0 ? 1 : -1; // the sign that lifts a flap's free edge

  // --- glass and water ------------------------------------------------------
  const glassBack = (cx, cy, r, z0, z1) => `<path class="pm-glass" d="${cyl(cx, cy, r, z0, z1, 48).fill}"/>`;
  function glassFront(cx, cy, r, z0, z1, { bottom = true, top = true } = {}) {
    const side = (s) => k.segment([cx + W[0] * r * s, cy + W[1] * r * s, z0], [cx + W[0] * r * s, cy + W[1] * r * s, z1], P);
    const shineAt = (u, v) => [cx + (W[0] * u + TV[0] * v) * r, cy + (W[1] * u + TV[1] * v) * r];
    const [sx, sy] = shineAt(-0.62, 0.78);
    const [tx, ty] = shineAt(0.5, 0.86);
    const arcs = (bottom ? k.sideArc(cx, cy, r, z0, P, 28) : "") + (top ? k.sideArc(cx, cy, r, z1, P, 28) : "");
    return (
      L(side(-1) + side(1) + arcs, { tone: "mid" }) +
      L(k.segment([sx, sy, z0], [sx, sy, z1], P), { tone: "hi", className: "pm-shine" }) +
      L(k.segment([tx, ty, z0], [tx, ty, z1], P), { tone: "faint" })
    );
  }
  function water(cx, cy, r, z0, z1, { surface = true } = {}) {
    if (z1 - z0 < 0.05) return "";
    const body = cyl(cx, cy, r, z0, z1, 48);
    return `<path class="pm-water" d="${body.fill}"/>` + (surface ? `<path class="pm-water-top" d="${body.top}"/>` + L(k.ring(cx, cy, r, z1, P, 48), { tone: "mid", className: "pm-meniscus" }) : "");
  }

  // --- a flap valve (succur or clack) on a seat face at z ----------------------
  function flap(cx, cy, z, r, open) {
    const phi = LIFT * open * ((52 * Math.PI) / 180);
    const hinge = [cx - W[0] * r, cy - W[1] * r, z];
    const u = rot(W, TV, phi);
    const n = rot(UP, TV, phi);
    const centre = add(hinge, u, r);
    const F = G.frameAlong(centre, n);
    const t = Math.max(1.2, r * 0.16);
    const knuckle = G.disc(-r * 0.32, r * 0.32, Math.max(0.8, r * 0.13), G.frameAlong(add(hinge, n, t * 0.5), TV), P);
    return (
      S(knuckle, { tone: "mid", crease: "none" }) +
      S(G.disc(0, t, r, F, P), { tone: "mid" }) +
      S(G.disc(t, t + t * 0.9, r * 0.46, F, P), { tone: "hi" })
    );
  }
  function seatHole(cx, cy, z, r) {
    const hole = cyl(cx, cy, r, z - 0.01, z, 40);
    return `<path class="pm-void" d="${hole.top}"/>` + L(k.ring(cx, cy, r, z, P, 40), { tone: "lo" });
  }

  // --- the lower succur inside the suction pipe ---------------------------------
  function lowerPipe(open, wl) {
    const { PIPE_R: R, PIPE_BORE: B, LOW_SEAT: z } = C;
    const top = Math.min(wl, C.TANK_TOP);
    return (
      glassBack(0, 0, R, 26, top) +
      water(0, 0, B, 26, top, { surface: false }) +
      S(cyl(0, 0, B, z - 2, z, 40), { tone: "mid" }) +
      seatHole(0, 0, z, B * 0.5) +
      flap(0, 0, z, B * 0.6, open) +
      glassFront(0, 0, R, 26, top, { bottom: false, top: false })
    );
  }
  function upperPipe(wl, level = Infinity) {
    const { PIPE_R: R, PIPE_BORE: B } = C;
    if (wl >= C.TANK_TOP) return "";
    const top = Math.min(level, C.TANK_TOP);
    return glassBack(0, 0, R, wl, C.TANK_TOP) + water(0, 0, B, wl, top, { surface: level < C.TANK_TOP }) + glassFront(0, 0, R, wl, C.TANK_TOP, { bottom: false, top: false }) + L(k.sideArc(0, 0, R, wl, P, 28), { tone: "lo" });
  }
  // the glass pipe between the gland on the lid and the coupling
  function pipeAbove(level = Infinity) {
    const z0 = C.GLAND_TOP, z1 = C.COUPLING[0];
    const top = Math.min(level, z1);
    return glassBack(0, 0, C.PIPE_R, z0, z1) + (top > z0 ? water(0, 0, C.PIPE_BORE, z0, top, { surface: level < z1 }) : "") + glassFront(0, 0, C.PIPE_R, z0, z1, { top: false });
  }

  // --- the priming jug at a pose: bottom centre B, tipped by phi about x toward +y ---------
  function jug(B, phi, vol) {
    const a = [0, Math.sin(phi), Math.cos(phi)];
    const u = [1, 0, 0];
    const F = G.frameOf(B, a, u, G.cross3(a, u));
    const V = G.viewOf(P);
    const out = [];
    if (B[2] < 40) out.push(`<path class="iso-halo" d="${k.haloOf({ x: B[0] - 20, y: B[1] - 20, w: 40, d: 40, r: 20 }, 0, 2, P)}" style="opacity:${(0.55 * (1 - B[2] / 40)).toFixed(2)}"/>`);
    // side handle along -x: a bar and a turned knob
    const root = add(B, a, 30);
    const from = add(root, u, -C.JUG_R);
    out.push(S(G.disc(0, 20, 2.2, G.frameAlong(from, [-1, 0, 0]), P), { tone: "mid", crease: "none" }));
    out.push(S(G.sphereOf(add(from, u, -20 - 2.9), 3.6, P), { tone: "mid" }));
    out.push(S(G.disc(0, 2.6, C.JUG_R + 0.8, F, P), { tone: "lo" }));
    const hoops = L(G.arcOf(F, 12, C.JUG_R, P) + G.arcOf(F, 36, C.JUG_R, P), { tone: "faint" });
    out.push(S(G.disc(2.6, C.JUG_H, C.JUG_R, F, P), { tone: "mid", inner: hoops }));
    out.push(D(G.dotsOf(F, 24, C.JUG_R, 18, P, { fade: [0.04, 0.42] }), { size: 0.42, tone: "lo" }));
    if (G.dot3(a, V) > 0.02) {
      const mouth = G.circleOf(F, C.JUG_H, C.JUG_IN, P, 64);
      out.push(`<path class="pm-inside" d="${mouth}"/>`);
      const level = C.JUG_FLOOR + vol / (Math.PI * C.JUG_IN * C.JUG_IN);
      if (vol > 50) {
        if (phi < 0.02) out.push(`<clipPath id="pm-jug"><path d="${mouth}"/></clipPath><g clip-path="url(#pm-jug)"><path class="pm-water" d="${G.circleOf(F, level, C.JUG_IN, P, 64)}"/>${L(G.circleOf(F, level, C.JUG_IN, P, 64), { tone: "mid", className: "pm-meniscus" })}</g>`);
        else out.push(`<path class="pm-water" d="${mouth}"/>`);
      }
      out.push(L(mouth, { tone: "lo" }));
    }
    return out.join("");
  }
  const jugLip = (B, phi) => [B[0], B[1] + C.JUG_H * Math.sin(phi) + C.JUG_IN * Math.cos(phi), B[2] + C.JUG_H * Math.cos(phi) - C.JUG_IN * Math.sin(phi)];

  // --- the cistern's water, drawn over what stands in it ---------------------
  const POOL = k.insetPlan(C.CIST, 2.5);
  function cistern(wl) {
    const body = k.slabOf(POOL, C.TRAY, wl - C.TRAY, P, 2);
    return (
      `<path class="pm-water" d="${body.fill}"/><path class="pm-water-top" d="${body.top}"/>` +
      L(k.planOutline(POOL, wl, P, 2), { tone: "lo", className: "pm-meniscus" }) +
      L(k.sideSeam(POOL, wl, P, 2), { tone: "mid", className: "pm-meniscus" })
    );
  }

  // --- streams -----------------------------------------------------------------
  function stream(x, y, z0, z1, flow, landR = 0) {
    if (flow < 0.02 || z0 - z1 < 0.5) return "";
    const w = 0.6 + 2.6 * Math.sqrt(flow);
    const p0 = at([x, y, z0]);
    const p1 = at([x, y, z1]);
    const ripple = landR > 0 ? L(k.ring(x, y, landR * (0.6 + 0.6 * flow), z1, P, 32), { tone: "mid", className: "pm-ripple" }) : "";
    return `<path class="pm-stream" d="M${n1(p0[0])} ${n1(p0[1])}L${n1(p1[0])} ${n1(p1[1])}" style="stroke-width:${w.toFixed(2)}"/>` + ripple;
  }

  // --- the bucket, its clack and bail -----------------------------------------------
  function bucket(zb, open) {
    const R = C.BORE;
    const H = C.BUCKET_H;
    const rimIn = R - 2.4;
    const out = [];
    out.push(S(cyl(0, 0, R - 0.4, zb, zb + 2, 48), { tone: "mid" }));
    const F = vertical(0, 0);
    const stitches = D(G.dotsOf(F, zb + 6.5, R, 30, P, { fade: [0.04, 0.42] }), { size: 0.42, tone: "lo" });
    out.push(S(cyl(0, 0, R, zb + 1.2, zb + 11, 56), { tone: "hi", lit: true, inner: L(k.sideArc(0, 0, R, zb + 3.6, P, 32) + k.sideArc(0, 0, R, zb + 9.4, P, 32), { tone: "lo" }) }));
    out.push(stitches);
    out.push(S(cyl(0, 0, R - 0.4, zb + 11, zb + H, 56, 0.4), { tone: "mid" }));
    const mouth = cyl(0, 0, rimIn, zb + H - 0.01, zb + H, 48).top;
    out.push(`<clipPath id="pm-cup"><path d="${mouth}"/></clipPath>`);
    out.push(`<path class="pm-inside" d="${mouth}"/>`);
    const floor = cyl(0, 0, rimIn, zb + 3, zb + 3.01, 48).top;
    out.push(`<g clip-path="url(#pm-cup)"><path class="iso-top" d="${floor}"/>${seatHole(0, 0, zb + 3, 4.6)}${flap(0, 0, zb + 3, 6.4, open)}</g>`);
    out.push(L(k.ring(0, 0, rimIn, zb + H, P, 48), { tone: "lo" }));
    // bail: two wires from the rim to a boss on the rod's foot
    const boss = zb + H + 9;
    for (const s of [-1, 1]) {
      const from = [W[0] * (rimIn + 1.2) * s, W[1] * (rimIn + 1.2) * s, zb + H];
      const to = [W[0] * 3.2 * s, W[1] * 3.2 * s, boss + 1.5];
      const d = G.sub3(to, from);
      out.push(S(G.disc(0, G.len3(d), 0.85, G.frameAlong(from, G.unit3(d)), P), { tone: "mid", crease: "none" }));
    }
    out.push(S(cyl(0, 0, 3.4, boss, boss + 4.5, 28), { tone: "mid" }));
    return out.join("");
  }
  const rodPiece = (z0, z1, tone = "mid") => (z1 - z0 > 0.05 ? S(cyl(0, 0, 2.4, z0, z1, 24), { tone, crease: "none" }) : "");

  // --- the barrel: glass, water, upper succur, bucket, rod ---------------------------
  function barrel(state) {
    const { zb, surface, clack, succur, level = Infinity } = state;
    const [, , z0] = [0, 0, C.COUPLING[2]];
    const top = C.BARREL_TOP;
    const bucketTop = zb + C.BUCKET_H;
    const rodFoot = bucketTop + 9 + 4.5;
    const wet = Math.min(surface, top);
    const out = [glassBack(0, 0, C.BARREL_R, z0, top)];
    out.push(seatHole(0, 0, z0, C.PIPE_BORE * 0.62));
    out.push(flap(0, 0, z0, C.PIPE_BORE * 0.78, succur));
    if (level > z0) out.push(water(0, 0, C.BORE, z0, Math.min(zb, level), { surface: level < zb - 0.05 }));
    out.push(bucket(zb, clack));
    out.push(rodPiece(rodFoot, Math.max(rodFoot, Math.min(wet, top))));
    if (surface > bucketTop + 0.05) out.push(water(0, 0, C.BORE, bucketTop, wet, { surface: surface < top }));
    out.push(rodPiece(Math.max(rodFoot, wet), top));
    out.push(glassFront(0, 0, C.BARREL_R, z0, top));
    return out.join("");
  }

  // --- the jar on the lid with its bell siphon ---------------------------------------
  function jar(level, siphon) {
    const [jx, jy] = C.JAR;
    const [bx, by] = C.BELL;
    const z = C.JAR_FLOOR + level;
    const out = [];
    const bellLow = Math.min(z, C.BELL_TOP);
    const bellBody = (z0, z1) => (z1 - z0 > 0.05 ? S(cyl(bx, by, C.BELL_R, z0, z1, 40), { tone: "mid", crease: "none" }) : "");
    out.push(bellBody(C.JAR_FLOOR + 3, bellLow));
    out.push(slots(bx, by, Math.min(z, C.JAR_FLOOR + 3 + 4)));
    out.push(water(jx, jy, C.JAR_IN, C.JAR_FLOOR, z));
    out.push(bellBody(bellLow, C.BELL_TOP));
    out.push(S(G.solidOf([[0, C.BELL_R], [1.2, C.BELL_R, 1], [2.6, C.BELL_R * 0.75, 1], [3.6, 0, 1]], G.frameOf([bx, by, C.BELL_TOP], UP, [1, 0, 0], [0, 1, 0]), P), { tone: "mid" }));
    out.push(D([at([bx, by, C.BELL_TOP + 3.6])], { size: 0.5 }));
    if (siphon > 0.02) out.push(`<path class="pm-swirl" d="${cyl(bx, by, C.BELL_R + 1.6 + 1.4 * siphon, z - 0.01, z, 32).top}"/>`);
    return out.join("");
  }
  function slots(bx, by, zTop) {
    // three bell slots at the foot, seen where they face the viewer
    const F = vertical(bx, by);
    const out = [];
    for (let i = 0; i < 6; i++) {
      const t = (i / 6) * Math.PI * 2 + 0.3;
      const facing = G.facingOf(F, t, P);
      if (facing < 0.25) continue;
      const pts = [];
      const half = 0.22;
      for (const [dt, zz] of [[-half, C.JAR_FLOOR + 3], [half, C.JAR_FLOOR + 3], [half, C.JAR_FLOOR + 6.4], [-half, C.JAR_FLOOR + 6.4]]) pts.push(at(G.pointOf(F, zz, C.BELL_R, t + dt)));
      out.push(`<path class="pm-void" d="${k.pathOf(pts, true)}"/>` + L(k.pathOf(pts, true), { tone: "lo" }));
    }
    return out.join("");
  }

  // --- the sweep (lever), link and rod top ----------------------------------------------
  const PIN_Y = 7.6;
  function lever(theta) {
    const Zp = K.Zp;
    const pivot = [C.PIVOT_X, 0, Zp];
    const u = [Math.cos(theta), 0, Math.sin(theta)];
    const v = [-Math.sin(theta), 0, Math.cos(theta)];
    const local = (x, z, y = 0) => [pivot[0] + u[0] * x + v[0] * z, y, pivot[2] + u[2] * x + v[2] * z];
    const { E, C: X } = K.crossOf(theta);
    const out = [];
    // link straps: frame with a along y
    const linkF = (y) => {
      const d = G.unit3(G.sub3(E, X));
      const w = [d[2], 0, -d[0]];
      return G.frameOf([X[0], y, X[2]], [0, 1, 0], d, [-w[0], 0, -w[2]]);
    };
    const span = G.len3(G.sub3(E, X));
    const strap = (y0) => S(G.prismOf(linkF(y0), G.stadium(3.6, 3.6, span, 20), 0, 1.6, P), { tone: "mid" });
    // rod above the guide and the crosshead boss
    out.push(strap(-PIN_Y));
    out.push(rodPiece(C.GUIDE_TOP, X[2] - 3.7));
    out.push(S(G.disc(-4.2, 4.2, 4.6, G.frameOf(X, [0, 1, 0], [1, 0, 0], [0, 0, 1]), P), { tone: "mid" }));
    // forged arm: hull of the socket eye, the pivot boss and the end eye
    const circ = (cx, r) => Array.from({ length: 24 }, (_, i) => [cx + r * Math.cos((i / 24) * Math.PI * 2), r * Math.sin((i / 24) * Math.PI * 2)]);
    const armPoly = G.hullOf([...circ(-16, 5.6), ...circ(0, 7.2), ...circ(C.ARM, 5.4)]);
    const armF = G.frameOf([pivot[0], -4, pivot[2]], [0, 1, 0], u, v);
    // handle bar, cranked down 35 degrees from the socket, ending in a turned grip
    const dl = [Math.cos((215 * Math.PI) / 180), Math.sin((215 * Math.PI) / 180)];
    const barR = 3.2;
    const from = local(-16 + dl[0] * 5.2, dl[1] * 5.2);
    const to = local(-16 + dl[0] * 98, dl[1] * 98);
    const dir = G.unit3(G.sub3(to, from));
    const ballC = add(to, dir, Math.sqrt(7.4 * 7.4 - barR * barR) - 0.1);
    out.push(S(G.disc(0, G.len3(G.sub3(to, from)), barR, G.frameAlong(from, dir), P), { tone: "hi", crease: "none", inner: L(G.arcOf(G.frameAlong(from, dir), 22, barR, P), { tone: "faint" }) }));
    out.push(S(G.disc(-4, 0, barR + 0.9, G.frameAlong(to, dir), P), { tone: "mid" }));
    out.push(S(G.sphereOf(ballC, 7.4, P), { tone: "hi" }));
    out.push(S(G.prismOf(armF, armPoly, 0, 8, P), { tone: "hi" }));
    // boss rings and pins
    const pinAt = (p, r, half) => S(G.disc(-half, half, r, G.frameOf(p, [0, 1, 0], [1, 0, 0], [0, 0, 1]), P), { tone: "mid" });
    out.push(strap(PIN_Y - 1.6));
    out.push(pinAt([E[0], 0, E[2]], 1.9, PIN_Y + 0.9));
    out.push(pinAt([X[0], 0, X[2]], 1.9, PIN_Y + 0.9));
    out.push(D([at([E[0], PIN_Y + 0.9, E[2]]), at([X[0], PIN_Y + 0.9, X[2]])], { size: 0.55, tone: "hi" }));
    return out.join("");
  }

  return { K, W, TV, lowerPipe, upperPipe, pipeAbove, jug, jugLip, cistern, stream, barrel, bucket, jar, lever, glassBack, glassFront, water, cyl, flap, seatHole, vertical };
}
