// Fig 2: the nacelle cut open. Static kit art in the nacelle's own frame (+x
// toward the rotor, the tower axis at the origin, the main shaft at z = 70),
// painted in an order the kit's depth solver settles from recorded shapes.
// Moving details sit in slots inside their host items; the rotor is a live
// layer in front.

import { N } from "./nacelle-live.mjs";
import { PARTS, ORDER, compOf } from "./parts.mjs";

const A = await import(new URL("../../../../.skill/kit/audit.mjs", import.meta.url).href);
const { tubePieces, tubeSvg } = await import(new URL("../../../../.skill/kit/tube.mjs", import.meta.url).href);

export function buildNacelle({ k, G, M, RIG, rig }) {
  const { GEO } = RIG;
  const W = 720;
  const H = 500;
  const n = GEO.nac;
  const SZ = N.shaftZ;
  const HZ = N.hssZ;
  const STUB = GEO.hub.h + GEO.bearing.t + N.stub.len;
  const P = k.fitProjection(
    [...k.boxCorners({ x: n.x0 - 0.2, y: -n.hw - 0.1, w: 15.6, d: 2 * n.hw + 0.2 }, 65.9, 73.7), [GEO.pitchX, STUB, SZ], [GEO.pitchX, -STUB, SZ], [GEO.pitchX, 0, SZ + STUB], [GEO.pitchX, 0, SZ - STUB], [GEO.hub.x1 + GEO.nose.len, 0, SZ]],
    W,
    H,
    { pad: 22, azimuth: 74, elevation: 31 },
  );
  const R = A.recorder(P);
  const at = (p) => k.iso(p, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const Ln = (d, style) => k.lineSvg(d, style);
  const Dots = (pts, style) => k.dotsSvg(pts, style);
  const X = [1, 0, 0];
  const Z = [0, 0, 1];
  const alongX = (x, z = SZ, y = 0) => G.frameOf([x, y, z], X, Z, [0, 1, 0]);
  const up = (x, y) => G.frameOf([x, y, 0], Z, X, [0, 1, 0]);
  const centre = (shape) => {
    const { min, max } = A.boundsOf(shape);
    return [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  };
  const put = (name, svg, shapes, { bias = 0, at: where } = {}) => {
    const recorded = shapes.map((sh) => R.solid({ ...sh, name: sh.name ?? name }));
    R.put({ name: R.nameFor(name), svg, shapes: recorded, at: where ?? centre(recorded[0]), bias });
  };
  const slot = (name) => `<g data-slot="${name}"></g>`;
  // A pipe or cable: drawn as depth-sorted chunks, recorded as a route so the
  // audit checks its clearance, its ends and its bends.
  const tube = (name, route, r, tone, maxLength = 1.6) => {
    R.route(name, route, r, { limp: true });
    tubePieces(route, r, P, { maxLength }).forEach((piece, i) => R.put({ name: `${name}:${i}`, route: name, chunk: i, svg: tubeSvg(piece, { tone }), at: piece.mid, shapes: [R.solid(A.tube(piece.points, r, { name, owner: name }))] }));
  };

  // ------------------------------------------------------------ tower top, yaw ring, canopy floor
  const rT = (z) => GEO.towerBase + ((GEO.towerTopR - GEO.towerBase) * (z - 0.75)) / (GEO.towerTop - 0.75);
  const TZ0 = 62.4;
  const towerF = up(0, 0);
  const tower = G.solidOf([[TZ0, rT(TZ0)], [GEO.towerTop - 0.2, rT(GEO.towerTop - 0.2)]], towerF, P);
  const tSlope = (GEO.towerTopR - GEO.towerBase) / (GEO.towerTop - 0.75);
  put("stand.tower", `<g class="wt-fadeout">${S(tower, { tone: "mid", inner: Ln(G.arcOf(towerF, 65.2, rT(65.2), P, { slope: tSlope }), { tone: "faint" }) })}</g>`, [A.solid(towerF, [[TZ0, rT(TZ0)], [GEO.towerTop - 0.2, rT(GEO.towerTop - 0.2)]])]);
  put("tower.flange", S(k.cylinder(0, 0, 1.5, GEO.towerTop - 0.2, 0.2, P, 64), { tone: "mid" }) + Dots(Array.from({ length: 24 }, (_, i) => at([1.43 * Math.cos((i / 24) * 6.283), 1.43 * Math.sin((i / 24) * 6.283), GEO.towerTop])).filter((_, i) => Math.cos((i / 24) * 6.283 - 0.98) > -0.1), { size: 0.45 }), [A.cylinder(0, 0, 1.5, GEO.towerTop - 0.2, 0.2)]);
  put("yaw.ring", S(k.cylinder(0, 0, N.ring.r, N.ring.z0, N.ring.z1 - N.ring.z0, P, 96), { tone: "mid", inner: slot("ring") }) + Ln(k.ring(0, 0, N.ring.r - 0.12, N.ring.z1, P, 96), { tone: "faint" }), [A.cylinder(0, 0, N.ring.r, N.ring.z0, N.ring.z1 - N.ring.z0)]);

  const FLOOR = { x: n.x0, y: -n.hw, w: n.x1 - n.x0, d: 2 * n.hw, r: n.r };
  const floorZ = 67.4;
  const grates = [];
  for (let x = -7.6; x < 1.6; x += 1.15) grates.push(k.planOutline({ x, y: 1.25, w: 1.0, d: 0.36, r: 0.04 }, floorZ, P, 2));
  put("canopy.floor", S(k.slabOf(FLOOR, n.z0, floorZ - n.z0, P, 4, 0.04), { tone: "lo" }) + Ln(grates.join(""), { tone: "faint" }), [A.slab(FLOOR, n.z0, floorZ - n.z0, {}, 4)], { bias: -40 });

  // ------------------------------------------------------------ canopy walls, cut away on the near side and the front
  const WT = 0.1;
  const farWall = { x: n.x0, y: -n.hw, w: n.x1 - n.x0, d: WT, r: 0 };
  const stiff = [];
  for (const x of [-6.8, -5.0, -3.2, -1.4, 0.4]) stiff.push(k.pathOf([at([x, -n.hw + WT, floorZ]), at([x, -n.hw + WT, n.z1])]));
  const hatchPts = [[-3.0, 68.5], [-1.9, 68.5], [-1.9, 70.6], [-3.0, 70.6]].map(([x, z]) => at([x, -n.hw + WT, z]));
  const seamZ = k.pathOf([at([n.x0 + WT, -n.hw + WT, 69.6]), at([n.x1, -n.hw + WT, 69.6])]);
  put("canopy.far", S(k.slabOf(farWall, floorZ, n.z1 - floorZ, P, 2), { tone: "lo", inner: Ln(stiff.join("") + seamZ, { tone: "faint" }) + Ln(k.pathOf(hatchPts, true), { tone: "lo" }) }), [A.slab(farWall, floorZ, n.z1 - floorZ, {}, 2)], { bias: -30 });
  const rearWall = { x: n.x0, y: -n.hw + WT, w: WT, d: 2 * n.hw - WT, r: 0 };
  const vents = [];
  for (let i = 0; i < 5; i++) {
    const y = -0.95 + i * 0.42;
    vents.push(k.pathOf([[n.x0 + WT, y, 69.3], [n.x0 + WT, y + 0.28, 69.3], [n.x0 + WT, y + 0.28, 70.6], [n.x0 + WT, y, 70.6]].map(at), true));
  }
  put("canopy.rear", S(k.slabOf(rearWall, floorZ, n.z1 - floorZ, P, 2), { tone: "lo", inner: Ln(vents.join(""), { tone: "lo" }) }), [A.slab(rearWall, floorZ, n.z1 - floorZ, {}, 2)], { bias: -30 });
  const LIP = 0.16;
  const nearLip = { x: n.x0 + WT, y: n.hw - WT, w: n.x1 - n.x0 - WT, d: WT, r: 0 };
  put("canopy.nearlip", S(k.slabOf(nearLip, floorZ, LIP, P, 2), { tone: "lo" }), [A.slab(nearLip, floorZ, LIP, {}, 2)]);
  const frontLip = { x: n.x1 - WT, y: -n.hw + WT, w: WT, d: 2 * n.hw - 2 * WT, r: 0 };
  put("canopy.frontlip", S(k.slabOf(frontLip, floorZ, LIP, P, 2), { tone: "lo" }), [A.slab(frontLip, floorZ, LIP, {}, 2)]);
  // The roof is kept over the rear, carrying the cooler and the wind sensors.
  const ROOF = { x: n.x0, y: -n.hw, w: GEO.roofCut - n.x0, d: 2 * n.hw, r: 0 };
  put("canopy.roof", S(k.slabOf(ROOF, n.z1 - 0.1, 0.1, P, 2), { tone: "lo" }), [A.slab(ROOF, n.z1 - 0.1, 0.1, {}, 2)]);
  const c = GEO.cooler;
  const fins = [];
  for (let i = 1; i < 7; i++) {
    const x = c.x + (c.w * i) / 7;
    fins.push(k.pathOf([at([x, c.y + c.d, n.z1]), at([x, c.y + c.d, n.z1 + c.h])]));
  }
  for (let i = 1; i < 6; i++) {
    const y = c.y + (c.d * i) / 6;
    fins.push(k.pathOf([at([c.x + c.w, y, n.z1]), at([c.x + c.w, y, n.z1 + c.h])]));
  }
  put("roof.cooler", S(k.slabOf(c, n.z1, c.h, P, 3, 0.04), { tone: "mid", inner: Ln(fins.join(""), { tone: "faint" }) }) + Ln(k.planOutline(k.insetPlan(c, 0.2), n.z1 + c.h, P, 2), { tone: "faint" }), [A.slab(c, n.z1, c.h, {}, 3)]);
  const lx = c.x + 0.5;
  put("roof.light", S(k.cylinder(lx, 0, 0.12, n.z1 + c.h, 0.06, P, 16), { tone: "mid" }) + S(G.sphereOf([lx, 0, n.z1 + c.h + 0.17], 0.16, P), { tone: "mid" }), [A.cylinder(lx, 0, 0.12, n.z1 + c.h, 0.06), A.ball([lx, 0, n.z1 + c.h + 0.17], 0.16)]);
  const m = GEO.mast;
  const mTop = n.z1 + m.h;
  put("roof.mast", S(k.cylinder(m.x, 0, 0.07, n.z1, m.h, P, 16), { tone: "mid" }), [A.cylinder(m.x, 0, 0.07, n.z1, m.h)]);
  const armF = G.frameAlong([m.x, -1.05, mTop - 0.05], [0, 1, 0]);
  put("roof.arm", S(G.disc(0, 2.1, 0.05, armF, P), { tone: "mid" }) + S(k.cylinder(m.x, -1.0, 0.04, mTop, 0.35, P, 10), { tone: "mid" }) + S(k.cylinder(m.x, 1.0, 0.04, mTop, 0.3, P, 10), { tone: "mid" }) + slot("instruments"), [A.disc(armF, 0, 2.1, 0.05), A.cylinder(m.x, -1.0, 0.04, mTop, 0.35), A.cylinder(m.x, 1.0, 0.04, mTop, 0.3)]);

  // ------------------------------------------------------------ bedplate, yaw drives
  const BED = { x: -1.7, y: -1.5, w: 4.0, d: 3.0, r: 0.35 };
  const bedZ0 = 67.95;
  const bedZ1 = 68.75;
  const bedBolts = [];
  for (const x of [-1.45, -0.9, 0.55, 1.95]) for (const y of [-1.3, 1.3]) bedBolts.push(at([x, y, bedZ1]));
  put("bedplate", S(k.slabOf(BED, bedZ0, bedZ1 - bedZ0, P, 6, 0.06), { tone: "mid", inner: Ln(k.sideSeam(BED, bedZ0 + 0.28, P, 6), { tone: "faint" }) }) + Dots(bedBolts, { size: 0.5 }), [A.slab(BED, bedZ0, bedZ1 - bedZ0, {}, 6)]);
  for (const deg of N.drives) {
    const [x, y] = N.driveAt(deg);
    const sign = Math.sign(y);
    const lug = { x: x - 0.34, y: sign > 0 ? BED.y + BED.d : BED.y - 0.42, w: 0.68, d: 0.42, r: 0.06 };
    put("yaw.lug", S(k.slabOf(lug, bedZ1 - 0.32, 0.32, P, 3), { tone: "mid" }), [A.slab(lug, bedZ1 - 0.32, 0.32, {}, 3)]);
    put("yaw.pinion", S(k.cylinder(x, y, N.pinion.r, N.pinion.z0, N.pinion.z1 - N.pinion.z0, P, 24), { tone: "hi", inner: slot(`pinion${deg}`) }) + S(k.cylinder(x, y, 0.07, N.pinion.z1, bedZ1 - 0.32 - N.pinion.z1, P, 12), { tone: "mid" }), [A.cylinder(x, y, N.pinion.r, N.pinion.z0, N.pinion.z1 - N.pinion.z0), A.cylinder(x, y, 0.07, N.pinion.z1, bedZ1 - 0.32 - N.pinion.z1)]);
    const g0 = bedZ1;
    const parts = [];
    parts.push(S(k.cylinder(x, y, 0.3, g0, 0.08, P, 28), { tone: "mid" }));
    parts.push(Dots([0, 1, 2, 3, 4, 5].map((i) => at([x + 0.26 * Math.cos(i * 1.047 + 0.5), y + 0.26 * Math.sin(i * 1.047 + 0.5), g0 + 0.08])), { size: 0.38 }));
    parts.push(S(k.cylinder(x, y, 0.24, g0 + 0.08, 0.62, P, 28), { tone: "hi", inner: Ln(k.sideArc(x, y, 0.24, g0 + 0.36, P, 20), { tone: "faint" }) }));
    parts.push(S(k.cylinder(x, y, 0.22, g0 + 0.7, 0.06, P, 28), { tone: "mid" }));
    const motor = k.cylinder(x, y, 0.2, g0 + 0.76, 0.5, P, 28);
    parts.push(S(motor, { tone: "hi", inner: Ln(k.knurl(x, y, 0.2, g0 + 0.8, g0 + 1.22, 28, P, 0.2), { tone: "faint" }) }));
    parts.push(S(k.cylinder(x, y, 0.205, g0 + 1.26, 0.13, P, 28), { tone: "mid" }));
    parts.push(Ln(k.ring(x, y, 0.13, g0 + 1.39, P, 20) + k.ring(x, y, 0.07, g0 + 1.39, P, 16), { tone: "lo" }));
    const box = { x: x - 0.08, y: sign > 0 ? y + 0.2 : y - 0.3, w: 0.16, d: 0.1, r: 0.02 };
    put("yaw.drive", parts.join(""), [A.cylinder(x, y, 0.3, g0, 0.08), A.cylinder(x, y, 0.24, g0 + 0.08, 0.62), A.cylinder(x, y, 0.22, g0 + 0.7, 0.06), A.cylinder(x, y, 0.2, g0 + 0.76, 0.5), A.cylinder(x, y, 0.205, g0 + 1.26, 0.13)], { at: [x, y, g0 + 0.7] });
    put("yaw.box", S(k.slabOf(box, g0 + 0.9, 0.2, P, 2), { tone: "mid" }), [A.slab(box, g0 + 0.9, 0.2, {}, 2)]);
  }

  // ------------------------------------------------------------ main bearing, main shaft, rotor lock
  const PED = { x: 0.95, y: -0.95, w: 0.9, d: 1.9, r: 0.08 };
  const hR = 0.72;
  put("bearing.pedestal", S(k.slabOf(PED, bedZ1, SZ - hR - bedZ1, P, 3, 0.04), { tone: "mid" }) + Dots([[1.08, -0.8], [1.72, -0.8], [1.08, 0.8], [1.72, 0.8]].map(([x, y]) => at([x, y, SZ - hR])), { size: 0.5 }), [A.slab(PED, bedZ1, SZ - hR - bedZ1, {}, 3)]);
  const hF = alongX(0);
  const housing = [[0.95, 0.6], [1.02, hR, 1], [1.78, hR, 1], [1.85, 0.6]];
  put("bearing.housing", S(G.solidOf([[0.95, 0.6], [1.02, hR], [1.78, hR], [1.85, 0.6]], hF, P), { tone: "hi", inner: Ln(G.arcOf(hF, 1.4, hR, P), { tone: "faint" }) }) + Dots(G.dotsOf(hF, 1.85, 0.5, 12, P, { all: true }), { size: 0.4 }), [A.solid(hF, [[0.95, 0.6], [1.02, hR], [1.78, hR], [1.85, 0.6]])]);
  void housing;
  const shaftR = 0.4;
  for (const [x0, x1] of [[0.15, 0.95], [1.85, 2.05], [2.2, 2.4]]) put("mainshaft", S(G.disc(x0, x1, shaftR, hF, P), { tone: "hi" }), [A.disc(hF, x0, x1, shaftR)]);
  put("rotorlock", S(G.disc(N.lockDisc.x0, N.lockDisc.x1, N.lockDisc.r, hF, P), { tone: "mid" }) + slot("lock"), [A.disc(hF, N.lockDisc.x0, N.lockDisc.x1, N.lockDisc.r)]);
  put("mainflange", S(G.disc(GEO.flange.x0, GEO.flange.x1, GEO.flange.r, hF, P), { tone: "mid" }), [A.disc(hF, GEO.flange.x0, GEO.flange.x1, GEO.flange.r)]);
  const PIN = { x: 1.9, y: 0.55, w: 0.3, d: 0.3, r: 0.04 };
  put("rotorlock.pin", S(k.slabOf(PIN, bedZ1, 0.35, P, 2), { tone: "mid" }), [A.slab(PIN, bedZ1, 0.35, {}, 2)]);

  // ------------------------------------------------------------ gearbox: planetary stage, two parallel stages, torque arms
  const gF = alongX(0);
  const plan = [[-1.05, 0.98], [-0.98, 1.16], [-0.02, 1.16], [0.08, 0.98], [0.15, 0.62]];
  const ribs = G.ribsOf(gF, -0.9, -0.1, 1.16, 36, P, { fade: [0.1, 0.55], seams: true });
  put("gearbox.planet", S(G.solidOf(plan, gF, P), { tone: "hi", inner: Ln(G.arcOf(gF, -0.5, 1.16, P), { tone: "faint" }) + k.fadedSvg(ribs, { tone: "faint" }) }) + Dots(G.dotsOf(gF, 0.15, 0.5, 14, P, { all: true }), { size: 0.4 }), [A.solid(gF, plan)]);
  for (const sgn of [1, -1]) {
    const arm = { x: -0.7, y: sgn > 0 ? 1.1 : -1.62, w: 0.5, d: 0.52, r: 0.06 };
    put("gearbox.arm", S(k.slabOf(arm, 69.45, 0.5, P, 3, 0.03), { tone: "mid" }), [A.slab(arm, 69.45, 0.5, {}, 3)]);
    const by = sgn > 0 ? 1.36 : -1.36;
    put("gearbox.bushing", S(k.cylinder(-0.45, by, 0.2, bedZ1, 69.45 - bedZ1, P, 24), { tone: "lo", inner: Ln(k.sideArc(-0.45, by, 0.2, 69.1, P, 20), { tone: "faint" }) }), [A.cylinder(-0.45, by, 0.2, bedZ1, 69.45 - bedZ1)]);
  }
  const PAR = { x: -2.55, y: -0.72, w: 1.5, d: 1.44, r: 0.18 };
  const parZ0 = 69.15;
  const parZ1 = 71.05;
  const cover = k.planOutline({ x: -2.3, y: -0.45, w: 0.95, d: 0.9, r: 0.08 }, parZ1, P, 2);
  const coverBolts = k.corners({ x: -2.3, y: -0.45, w: 0.95, d: 0.9 }, 0.08).map(([x, y]) => at([x, y, parZ1]));
  const glass = k.pathOf([[-2.0, 0.72, 69.6], [-1.75, 0.72, 69.6], [-1.75, 0.72, 69.75], [-2.0, 0.72, 69.75]].map(at), true);
  put("gearbox.parallel", S(k.slabOf(PAR, parZ0, parZ1 - parZ0, P, 4, 0.05), { tone: "hi", inner: Ln(k.sideSeam(PAR, 70.2, P, 4), { tone: "faint" }) + Ln(glass, { tone: "lo" }) }) + Ln(cover, { tone: "lo" }) + Dots(coverBolts, { size: 0.42 }), [A.slab(PAR, parZ0, parZ1 - parZ0, {}, 4)]);
  const FILT = { x: -1.45, y: 0.72, w: 0.3, d: 0.22, r: 0.05 };
  put("gearbox.filter", S(k.slabOf(FILT, 69.25, 0.45, P, 3), { tone: "mid" }) + S(k.cylinder(-1.3, 0.83, 0.07, 69.7, 0.12, P, 14), { tone: "mid" }), [A.slab(FILT, 69.25, 0.45, {}, 3), A.cylinder(-1.3, 0.83, 0.07, 69.7, 0.12)]);

  // ------------------------------------------------------------ high-speed shaft, disc brake, coupling
  const sF = alongX(0, HZ);
  const bx = N.brake.x;
  const bt = N.brake.t / 2;
  put("hss", S(G.disc(bx + bt, -2.55, 0.11, sF, P), { tone: "hi" }), [A.disc(sF, bx + bt, -2.55, 0.11)]);
  put("hss", S(G.disc(-3.4, bx - bt, 0.11, sF, P), { tone: "hi" }), [A.disc(sF, -3.4, bx - bt, 0.11)]);
  put("brake.disc", S(G.disc(bx - bt, bx + bt, N.brake.r, sF, P), { tone: "mid" }) + slot("brakedisc"), [A.disc(sF, bx - bt, bx + bt, N.brake.r)]);
  // Caliper: two halves either side of the disc and a bridge over its rim, on a bracket from the gearbox.
  const ca = (N.brake.at * Math.PI) / 180;
  const radial = [0, Math.cos(ca), Math.sin(ca)];
  const tang = [0, -Math.sin(ca), Math.cos(ca)];
  const cF = { o: [0, 0, HZ], a: X, u: radial, v: tang };
  const halfPoly = (r0, r1, w) => [[r0, -w], [r1, -w], [r1, w], [r0, w]];
  const gapIn = 0.06;
  const halves = [[bx - bt - gapIn - 0.11, bx - bt - gapIn], [bx + bt + gapIn, bx + bt + gapIn + 0.11]];
  for (const [s0, s1] of halves) put("brake.caliper", S(G.prismOf(cF, halfPoly(0.27, 0.5, 0.12), s0, s1, P), { tone: "hi", lit: true }), [A.prism(cF, halfPoly(0.27, 0.5, 0.12), s0, s1)]);
  put("brake.bridge", S(G.prismOf(cF, halfPoly(0.5, 0.58, 0.1), halves[0][0], halves[1][1], P), { tone: "hi", lit: true }), [A.prism(cF, halfPoly(0.5, 0.58, 0.1), halves[0][0], halves[1][1])]);
  put("brake.bracket", S(G.prismOf(cF, halfPoly(0.36, 0.5, 0.07), halves[1][1], -2.55, P), { tone: "mid" }), [A.prism(cF, halfPoly(0.36, 0.5, 0.07), halves[1][1], -2.55)]);
  for (const side of [0, 1]) {
    const s0 = side ? bx + bt : bx - bt - 0.045;
    const s1 = side ? bx + bt + 0.045 : bx - bt;
    put(`brake.pad${side}`, `<g data-slot="pad${side}">${S(G.prismOf(cF, halfPoly(0.3, 0.46, 0.09), s0, s1, P), { tone: "mid" })}</g>`, [A.prism(cF, halfPoly(0.3, 0.46, 0.09), s0, s1)]);
  }
  const cplF = alongX(0, HZ);
  put("coupling", S(G.disc(-3.5, -3.4, 0.25, cplF, P), { tone: "mid" }) + slot("coupling0"), [A.disc(cplF, -3.5, -3.4, 0.25)]);
  put("coupling.tube", S(G.disc(-3.8, -3.5, 0.13, cplF, P), { tone: "hi" }), [A.disc(cplF, -3.8, -3.5, 0.13)]);
  put("coupling", S(G.disc(-3.9, -3.8, 0.25, cplF, P), { tone: "mid" }) + slot("coupling1"), [A.disc(cplF, -3.9, -3.8, 0.25)]);
  put("gen.shaft", S(G.disc(-4.0, -3.9, 0.11, cplF, P), { tone: "hi" }), [A.disc(cplF, -4.0, -3.9, 0.11)]);

  // ------------------------------------------------------------ rear frame, generator, slip rings
  const girderZ0 = 68.4;
  const girderZ1 = 69.0;
  for (const y of [0.95, -1.25]) {
    const gd = { x: -7.9, y, w: 7.9 - 1.7, d: 0.3, r: 0 };
    put("frame.girder", S(k.slabOf(gd, girderZ0, girderZ1 - girderZ0, P, 2), { tone: "mid", inner: Ln(k.sideSeam(gd, girderZ1 - 0.08, P, 2), { tone: "faint" }) }), [A.slab(gd, girderZ0, girderZ1 - girderZ0, {}, 2)]);
  }
  for (const [x0, x1] of [[-4.75, -4.25], [-6.15, -5.65], [-7.9, -7.6], [-7.3, -7.0]]) {
    const cb = { x: x0, y: -0.95, w: x1 - x0, d: 1.9, r: 0 };
    put("frame.cross", S(k.slabOf(cb, girderZ0, girderZ1 - girderZ0, P, 2), { tone: "mid" }), [A.slab(cb, girderZ0, girderZ1 - girderZ0, {}, 2)]);
  }
  const gR = 0.75;
  const genPlan = [[-6.4, 0.58], [-6.33, 0.68], [-6.26, gR], [-4.14, gR], [-4.07, 0.68], [-4.0, 0.58]];
  const genF = alongX(0, HZ);
  const genRibs = G.ribsOf(genF, -6.15, -4.25, gR, 48, P, { fade: [0.1, 0.55], seams: true });
  put("generator", S(G.solidOf(genPlan, genF, P), { tone: "hi", inner: k.fadedSvg(genRibs, { tone: "faint" }) }) + Dots(G.dotsOf(genF, -4.0, 0.42, 8, P, { all: true }), { size: 0.4 }), [A.solid(genF, genPlan)]);
  for (const [x0, x1] of [[-4.72, -4.28], [-6.12, -5.68]]) {
    const foot = { x: x0, y: -0.55, w: x1 - x0, d: 1.1, r: 0.04 };
    put("gen.foot", S(k.slabOf(foot, girderZ1, HZ - gR - girderZ1, P, 2), { tone: "mid" }), [A.slab(foot, girderZ1, HZ - gR - girderZ1, {}, 2)]);
  }
  const TB = { x: -5.3, y: -0.3, w: 0.6, d: 0.6, r: 0.04 };
  put("gen.terminal", S(k.slabOf(TB, HZ + gR, 0.25, P, 2, 0.03), { tone: "mid" }) + Ln(k.planOutline(k.insetPlan(TB, 0.08), HZ + gR + 0.25, P, 2), { tone: "faint" }), [A.slab(TB, HZ + gR, 0.25, {}, 2)]);
  const srF = alongX(0, HZ);
  put("gen.slipring", S(G.solidOf([[-6.85, 0.36], [-6.8, 0.42], [-6.45, 0.42], [-6.4, 0.38]], srF, P), { tone: "hi", inner: Ln(G.arcOf(srF, -6.62, 0.42, P), { tone: "faint" }) }), [A.solid(srF, [[-6.85, 0.36], [-6.8, 0.42], [-6.45, 0.42], [-6.4, 0.38]])]);
  const BR = { x: -6.75, y: -0.15, w: 0.26, d: 0.3, r: 0.03 };
  put("gen.brushes", S(k.slabOf(BR, HZ + 0.42, 0.18, P, 2), { tone: "mid" }), [A.slab(BR, HZ + 0.42, 0.18, {}, 2)]);
  put("gen.encoder", S(G.disc(-6.97, -6.85, 0.12, srF, P), { tone: "mid" }), [A.disc(srF, -6.97, -6.85, 0.12)]);

  // ------------------------------------------------------------ hydraulic unit with its gauge, and the brake hose
  const HU = { x: -3.0, y: 0.85, w: 0.6, d: 0.55, r: 0.05 };
  const huTop = girderZ1 + 0.48;
  const g = N.gauge;
  const gTicks = k.radialTicks(g.x, g.y, g.r - 0.02, 28, 7, huTop + 0.06, [0.03, 0.055], P, Math.PI * 0.75, Math.PI * 1.5 * (28 / 27));
  put("hyd.unit", S(k.slabOf(HU, girderZ1, 0.48, P, 3, 0.04), { tone: "mid", inner: Ln(k.sideSeam(HU, girderZ1 + 0.16, P, 3), { tone: "faint" }) }), [A.slab(HU, girderZ1, 0.48, {}, 3)]);
  put("hyd.gauge", S(k.cylinder(g.x, g.y, g.r, huTop, 0.06, P, 40, 0.02), { tone: "hi" }) + Ln(k.ring(g.x, g.y, g.r - 0.02, huTop + 0.06, P, 48), { tone: "lo" }) + Ln(gTicks.minor, { tone: "lo" }) + Ln(gTicks.major, { tone: "mid" }) + slot("needle") + Ln(k.ring(g.x, g.y, 0.018, huTop + 0.06, P, 10), { tone: "mid" }), [A.cylinder(g.x, g.y, g.r, huTop, 0.06)]);
  const hoseStart = [-2.85, 1.25, huTop];
  const capStart = G.add3([halves[1][1] - 0.05, 0, HZ], G.mul3(radial, 0.58));
  const hoseRoute = G.fillet([hoseStart, [-2.85, 1.25, 70.45], [-2.9, 0.8, 71.05], [capStart[0], capStart[1] + 0.32, capStart[2] + 0.24], capStart], 0.25, 8);
  tube("hose", hoseRoute, 0.035, "mid");

  // ------------------------------------------------------------ cabinets, generator cables, service crane
  const cabs = [{ x: -7.88, y: -1.5, w: 0.85, d: 1.25, r: 0.04 }, { x: -7.88, y: -0.12, w: 0.85, d: 1.25, r: 0.04 }];
  const cabZ1 = 70.95;
  cabs.forEach((cab, i) => {
    const fx = cab.x + cab.w;
    const door = k.pathOf([[fx, cab.y + 0.08, 69.12], [fx, cab.y + cab.d - 0.08, 69.12], [fx, cab.y + cab.d - 0.08, cabZ1 - 0.1], [fx, cab.y + 0.08, cabZ1 - 0.1]].map(at), true);
    const louvres = [];
    for (let j = 0; j < 4; j++) {
      const zz = 69.35 + j * 0.13;
      louvres.push(k.pathOf([[fx, cab.y + 0.35, zz], [fx, cab.y + cab.d - 0.35, zz], [fx, cab.y + cab.d - 0.35, zz + 0.05], [fx, cab.y + 0.35, zz + 0.05]].map(at), true));
    }
    const screen = i === 0 ? k.pathOf([[fx, cab.y + 0.35, 70.3], [fx, cab.y + 0.85, 70.3], [fx, cab.y + 0.85, 70.62], [fx, cab.y + 0.35, 70.62]].map(at), true) : "";
    const handle = at([fx, cab.y + cab.d - 0.2, 70.0]);
    put("cabinet", S(k.slabOf(cab, girderZ1, cabZ1 - girderZ1, P, 2, 0.03), { tone: "mid", inner: Ln(door, { tone: "lo" }) + Ln(louvres.join(""), { tone: "faint" }) + Ln(screen, { tone: "mid" }) }) + Dots([handle], { size: 0.5, tone: "hi" }), [A.slab(cab, girderZ1, cabZ1 - girderZ1, {}, 2)]);
  });
  const cableZ = HZ + gR + 0.12;
  [0.0, 0.12, 0.24].forEach((y, j) => tube(`cable${j}`, G.fillet([[TB.x, y, cableZ], [-7.45 + 0.14 * j, y, cableZ], [-7.45 + 0.14 * j, y, cabZ1]], 0.32, 8), 0.045, "mid"));
  const BEAM = { x: -7.2, y: -1.22, w: 9.0, d: 0.14, r: 0 };
  put("crane.beam", S(k.slabOf(BEAM, 71.15, 0.2, P, 2), { tone: "mid", inner: Ln(k.sideSeam(BEAM, 71.33, P, 2) + k.sideSeam(BEAM, 71.17, P, 2), { tone: "faint" }) }), [A.slab(BEAM, 71.15, 0.2, {}, 2)]);
  for (const x of [-3.6, -0.6, 1.4]) {
    const br = { x: x - 0.08, y: -n.hw + WT, w: 0.16, d: BEAM.y - (-n.hw + WT), r: 0 };
    put("crane.bracket", S(k.slabOf(br, 71.17, 0.16, P, 2), { tone: "mid" }), [A.slab(br, 71.17, 0.16, {}, 2)]);
  }
  const TROL = { x: -1.95, y: -1.32, w: 0.45, d: 0.34, r: 0.04 };
  put("crane.trolley", S(k.slabOf(TROL, 70.88, 0.27, P, 2, 0.03), { tone: "mid" }), [A.slab(TROL, 70.88, 0.27, {}, 2)]);
  const chain = [[-1.72, -1.15, 70.88], [-1.72, -1.15, 70.32]];
  tube("chain", chain, 0.018, "lo");
  const hookF = G.frameAlong([-1.72, -1.15, 70.24], [0, 1, 0]);
  put("crane.hook", S(G.disc(-0.02, 0.02, 0.08, hookF, P), { tone: "mid" }), [A.disc(hookF, -0.02, 0.02, 0.08)]);

  // ------------------------------------------------------------ settle the order and emit
  A.settle(R, P);
  R.items.sort((a, b) => a.key - b.key);
  // Each item is wrapped in its component, so the page can light one up and dim the rest.
  const body = R.items.map((item) => `<g data-comp="${compOf(item.name)}">${item.svg}</g>`).join("");
  const LABEL = "The nacelle of the same turbine with its near wall, front and most of its roof cut away. From the rotor end: the hub on the main shaft, a rotor-lock disc, the main bearing on the cast bedplate, a three-stage gearbox held by two torque arms, the disc brake and its caliper on the high-speed shaft, a flexible coupling, and the doubly fed generator with its slip rings. Four yaw drives stand on the bedplate, their pinions meshing the toothed ring on top of the tower. A hydraulic unit with a pressure gauge feeds the brake; control and converter cabinets stand at the rear under the cooler and wind sensors.";
  const back = k.figureSvg({ width: W, height: H, label: LABEL, body: `<defs><linearGradient id="wt-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="0.82" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><mask id="wt-fade-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect x="0" y="${(H * 0.55).toFixed(0)}" width="${W}" height="${(H * 0.45).toFixed(0)}" fill="url(#wt-fade)"/><rect x="0" y="0" width="${W}" height="${(H * 0.55 + 1).toFixed(0)}" fill="#fff"/></mask></defs>${body}`, className: "wt-back2" });
  const live = `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg wt-layer wt-live2" viewBox="0 0 ${W} ${H}" aria-hidden="true"><g data-rotor="behind" data-comp="pitch"></g><g data-rotor="hub" data-comp="hub"></g><g data-rotor="nose" data-comp="hub">${rig.noseSvg(P)}</g><g data-rotor="ahead" data-comp="pitch"></g></svg>`;
  // The panel under the drawing: name and function (announced), and a live line
  // from the model (not announced, since it changes every frame).
  const panel = `<div class="wt-panel" data-empty><div class="wt-panel-text" aria-live="polite"><span class="wt-panel-head"><b class="wt-panel-n"></b><strong class="wt-panel-name"></strong></span><span class="wt-panel-does"></span><span class="wt-panel-hint">Select a part on the drawing, or in the list below, to see what it does.</span></div><span class="wt-panel-live"></span></div>`;
  const row = `<div class="wt-parts" role="toolbar" aria-label="Nacelle components">${ORDER.map((key, i) => `<button type="button" data-pick="${key}" aria-pressed="false"><i>${String(i + 1).padStart(2, "0")}</i>${PARTS[key].name}</button>`).join("")}</div>`;
  const stage = `<div class="wt-stage" data-stage="2">${back}${live}</div>${panel}${row}`;
  const s0 = M.initial({ v: 9, dir: 75, pitch: null });
  const caption = `The rotor's power arrives as slow, heavy torque: at rated output the main shaft turns at ${M.SPEC.rpmRated} rpm under about ${((M.SPEC.ratedKW / M.SPEC.eta / ((M.SPEC.rpmRated * 2 * Math.PI) / 60)) / 1000).toFixed(2)} MN·m. A spherical roller bearing on the cast bedplate carries the rotor's weight and thrust, and the gearbox (one planetary stage and two parallel stages, 1 : ${M.SPEC.gear}) turns that into ${M.SPEC.rpmRated * M.SPEC.gear} rpm on the high-speed shaft, so a compact doubly fed induction generator can feed the grid; its slip rings let the converter in the rear cabinet hold the frequency while the rotor's speed changes. Torque arms on rubber bushings hold the gearbox against its own reaction. The disc brake sits on the high-speed shaft, where 1/${M.SPEC.gear} of the torque is enough: in a storm the blades feather first, and once the rotor has slowed below ${M.SPEC.brakeRpm} rpm the hydraulic caliper clamps the disc and the gauge rises. Four yaw motors on the bedplate drive pinions round the toothed ring on top of the tower, turning the whole nacelle to face the wind the roof vane reports. Each blade root sits in a pitch bearing whose scale reads the angle the controller has set.`;
  const plate = k.plateHtml({
    fig: "Fig 2",
    title: "Nacelle, cut open",
    hint: "Hover or tap a part",
    readout: readoutOf(s0, M),
    keys: [
      { mark: "lit", label: "Brake caliper on the high-speed shaft" },
      { mark: "raised", label: "Drivetrain: main shaft, gearbox 1 : 100, generator" },
      { mark: "flat", label: "Yaw drives: four motors and pinions on the tower ring" },
    ],
    caption,
    body: stage,
  });
  return { plate, data: { W, H, P, items: R.items.length }, R, P };
}

export function readoutOf(s, M) {
  const torque = s.rpm > 0.1 && s.kW > 0 ? `${(s.kW / M.SPEC.eta / ((s.rpm * 2 * Math.PI) / 60) / 1000).toFixed(2)} MN·m` : "no torque";
  return `${s.rpm.toFixed(1)} → ${Math.round(s.rpm * M.SPEC.gear).toLocaleString("en-US")} rpm · ${torque} · brake ${s.brake > 0.5 ? "on" : "off"}`;
}
