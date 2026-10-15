import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SKILL = "file:///C:/Users/areeb/.claude/skills/anatomy/";
const k = await import(SKILL + "kit/iso-kit.mjs");
const G = await import(SKILL + "kit/lathe.mjs");
const { glCamera } = await import(SKILL + "kit/gl.mjs");
const { tubePieces, tubeSvg } = await import(SKILL + "kit/tube.mjs");
const { kitScript, glScript } = await import(SKILL + "scripts/inline-kit.mjs");
const M = await import("./model.mjs");

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const DEG = Math.PI / 180;

const W = 880;
const H = 572;
const AZIMUTH = 55;
const ELEVATION = 40;

const WALL = 6;
const TOP = 50;
const IN = { x0: -110, x1: 180, y0: -100, y1: 100 };
const OUTER = { x: IN.x0 - WALL, y: IN.y0 - WALL, w: IN.x1 - IN.x0 + 2 * WALL, d: IN.y1 - IN.y0 + 2 * WALL, r: 1.5 };
const BASE = { x: -166, y: -124, w: 398, d: 276, r: 12 };
const BASE_Z = -6;
const BASE_H = 8;
const FOOT_H = 7;
const START = { height: 6, angle: -12, level: 30 };
const SEGMENTS = 12;
const SEG_W = (IN.y1 - IN.y0) / SEGMENTS;
const PLATE_T = 2.4;
const PLATE_TOP = 45;
const MAST_Z = 57;
const DRIVE = { x: -144, gland: -123, beamX: -140, beamZ: 50, beamH: 3.6 };
const GANTRY_X = M.GAUGES.x;
const BEAM_Z = TOP + 4.4;
const BEAM_H = 5;
const PROBE_LOW = M.bedOf(GANTRY_X) + 2.5;
const STAKE_X = 158;
const STAKES = [-78, -30, 40, 82];
const STAKE_TOP = 50;
const POINT = { x: -62, y: IN.y0 + 3.2 };
const CONSOLE = { x: -104, y: 114, w: 62, d: 30, r: 3 };
const LOGGER = { x: 96, y: 114, w: 64, d: 30, r: 3 };
const BOX_TOP = BASE_Z + 22;

const P = k.fitProjection([...k.boxCorners(BASE, BASE_Z - BASE_H - FOOT_H, 0), [IN.x0 - 40, 0, MAST_Z + 8], [0, IN.y0, TOP + 12]], W, H, { pad: 22, azimuth: AZIMUTH, elevation: ELEVATION });
const V = G.viewOf(P);
const L = G.lightOf(P);
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const slab = (plan, z, h, steps = 3, bevel = 0.4) => k.slabOf(plan, z, h, P, steps, bevel);
const depth = (p) => G.dot3(p, V);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const fixed = (n, d = 1) => Number(n.toFixed(d));

let seed = 7;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

function polySolid(faces, { inner } = {}) {
  const centre = G.mul3(faces.flat().reduce((sum, p) => G.add3(sum, p), [0, 0, 0]), 1 / faces.flat().length);
  const buckets = [[], [], [], [], []];
  const seen = [];
  for (const face of faces) {
    let n = [0, 0, 0];
    for (let i = 0; i < face.length; i++) {
      const a = face[i];
      const b = face[(i + 1) % face.length];
      n = G.add3(n, [(a[1] - b[1]) * (a[2] + b[2]), (a[2] - b[2]) * (a[0] + b[0]), (a[0] - b[0]) * (a[1] + b[1])]);
    }
    n = G.unit3(n);
    const mid = G.mul3(face.reduce((sum, p) => G.add3(sum, p), [0, 0, 0]), 1 / face.length);
    if (G.dot3(n, G.sub3(mid, centre)) < 0) n = G.mul3(n, -1);
    const visible = G.dot3(n, V) > 1e-6;
    seen.push(visible);
    if (visible) buckets[G.bandOf(G.dot3(n, L))].push(k.pathOf(face.map(at), true));
  }
  const hull = G.hullOf(faces.flat().map(at));
  const edges = new Map();
  faces.forEach((face, index) => {
    if (!seen[index]) return;
    face.forEach((a, i) => {
      const b = face[(i + 1) % face.length];
      const key = [a, b].map((p) => p.map((v) => v.toFixed(2)).join(",")).sort().join("|");
      edges.set(key, (edges.get(key) ?? 0) + 1);
      if (!edges.has(key + "#")) edges.set(key + "#", [a, b]);
    });
  });
  const crease = [];
  for (const [key, count] of edges) if (!key.endsWith("#") && count === 2) crease.push(k.pathOf(edges.get(key + "#").map(at)));
  return { fill: k.pathOf(hull, true), outline: k.pathOf(hull, true), crease: crease.join(""), top: buckets[4].join(""), shades: buckets.slice(0, 4).map((list) => list.join("")), inner };
}

function faceSvg(points, { tone = "lo", className, flat = false } = {}) {
  return S(polySolid([points]), { tone, crease: "none", flat, className });
}

const back = [];
back.push(`<path class="iso-halo" d="${k.haloOf(BASE, BASE_Z - BASE_H - FOOT_H, BASE_H, P)}"/>`);
for (const [x, y] of byDepth([...k.corners(BASE, 26), [BASE.x + BASE.w / 2, BASE.y + 26], [BASE.x + BASE.w / 2, BASE.y + BASE.d - 26], [BASE.x + 26, BASE.y + BASE.d / 2], [BASE.x + BASE.w - 26, BASE.y + BASE.d / 2]])) {
  back.push(S(k.cylinder(x, y, 10, BASE_Z - BASE_H - FOOT_H, 2, P, 28), { tone: "lo" }));
  back.push(S(k.cylinder(x, y, 8, BASE_Z - BASE_H - FOOT_H + 2, FOOT_H - 2, P, 28), { tone: "mid" }));
}
back.push(S(k.slabOf(BASE, BASE_Z - BASE_H, BASE_H, P, 8, 1.6), { tone: "mid" }));
back.push(Ln(k.planOutline(k.insetPlan(BASE, 6), BASE_Z, P), { tone: "lo" }));
const BASE_SCREWS = k.corners(BASE, 13);
back.push(Ln(BASE_SCREWS.map(([x, y]) => k.ring(x, y, 2.8, BASE_Z, P, 16)).join(""), { tone: "lo" }));
back.push(Dots(BASE_SCREWS.map(([x, y]) => at([x, y, BASE_Z])), { size: 0.55 }));
const SIDE = k.sideTicks(BASE.x + 30, BASE.x + BASE.w - 30, 10, 5, BASE.y + BASE.d, BASE_Z - 1.6, [2.4, 4.8], P, "x");
back.push(Ln(SIDE.minor, { tone: "lo" }), Ln(SIDE.major, { tone: "mid" }));

const PILLARS = [IN.y0 - 14, IN.y1 + 14];
for (const y of PILLARS.slice(0, 1)) {
  back.push(S(k.cylinder(DRIVE.beamX, y, 6, BASE_Z, 2, P, 24), { tone: "lo" }));
  back.push(S(slab({ x: DRIVE.beamX - 3.5, y: y - 3.5, w: 7, d: 7, r: 0.8 }, BASE_Z + 2, DRIVE.beamZ - BASE_Z - 2, 2), { tone: "mid" }));
}
const DRIVE_BEAM = { x: DRIVE.beamX - 4, y: IN.y0 - 18, w: 8, d: IN.y1 - IN.y0 + 36, r: 1 };
back.push(S(slab(DRIVE_BEAM, DRIVE.beamZ, DRIVE.beamH, 2, 0.5), { tone: "mid" }) + Dots([DRIVE_BEAM.y + 3, DRIVE_BEAM.y + DRIVE_BEAM.d - 3].map((y) => at([DRIVE.beamX, y, DRIVE.beamZ + DRIVE.beamH])), { size: 0.45 }));
const ACT_Z = DRIVE.beamZ + DRIVE.beamH + 2.8;
const segY = (i) => IN.y0 + SEG_W * (i + 0.5);
const actuators = [];
for (let i = 0; i < SEGMENTS; i++) {
  const y = segY(i);
  const F = G.frameAlong([DRIVE.x, y, ACT_Z], [1, 0, 0]);
  const len = DRIVE.gland - DRIVE.x;
  actuators.push(
    S(slab({ x: DRIVE.x + 4, y: y - 2.6, w: 10, d: 5.2, r: 0.6 }, DRIVE.beamZ + DRIVE.beamH, 0.8, 2), { tone: "lo" }) +
      S(G.disc(-1.6, 0, 3.4, F, P), { tone: "mid" }) +
      S(G.disc(0, len - 2, 2.8, F, P, { bevel: 0.3 }), { tone: "mid", inner: Ln(G.arcOf(F, len * 0.35, 2.8, P) + G.arcOf(F, len * 0.7, 2.8, P), { tone: "faint" }) }) +
      S(G.disc(len - 2, len, 3.2, F, P), { tone: "mid" }) +
      Dots(G.dotsOf(F, len, 3.2, 6, P, { all: true, phase: 0.5 }).map(([x, yy]) => [x, yy]).slice(0, 6), { size: 0.35 }),
  );
}
back.push(...actuators);
for (const y of PILLARS.slice(1)) {
  back.push(S(k.cylinder(DRIVE.beamX, y, 6, BASE_Z, 2, P, 24), { tone: "lo" }));
  back.push(S(slab({ x: DRIVE.beamX - 3.5, y: y - 3.5, w: 7, d: 7, r: 0.8 }, BASE_Z + 2, DRIVE.beamZ - BASE_Z - 2, 2), { tone: "mid" }));
}

back.push(S(slab(OUTER, BASE_Z, -BASE_Z, 4, 0.6), { tone: "lo" }));
const WALL_FAR = { x: OUTER.x, y: OUTER.y, w: OUTER.w, d: WALL, r: 0.8 };
const WALL_PADDLE = { x: OUTER.x, y: IN.y0, w: WALL, d: IN.y1 - IN.y0, r: 0.4 };
back.push(S(slab(WALL_FAR, 0, TOP, 3, 0.6), { tone: "mid", inner: Ln(k.sideSeam(WALL_FAR, 22, P, 3), { tone: "faint" }) }));
back.push(Dots([-90, -30, 30, 90, 150].map((x) => at([x, WALL_FAR.y + WALL / 2, TOP])), { size: 0.45 }));
back.push(S(slab(WALL_PADDLE, 0, TOP, 2, 0.6), { tone: "mid" }));

const bedPoint = (x, y) => [x, y, M.bedOf(x)];
const KNEE = M.BEACH.knee;
const TOE = M.BEACH.toe;
back.push(faceSvg([bedPoint(IN.x0, IN.y0), bedPoint(TOE, IN.y0), bedPoint(TOE, IN.y1), bedPoint(IN.x0, IN.y1)], { tone: "lo" }));
back.push(faceSvg([bedPoint(TOE, IN.y0), bedPoint(KNEE, IN.y0), bedPoint(KNEE, IN.y1), bedPoint(TOE, IN.y1)], { tone: "lo" }));
back.push(faceSvg([bedPoint(KNEE, IN.y0), bedPoint(IN.x1, IN.y0), bedPoint(IN.x1, IN.y1), bedPoint(KNEE, IN.y1)], { tone: "lo", className: "bw-sand" }));
const grid = [];
for (let x = IN.x0 + 20; x < KNEE; x += 20) grid.push(k.pathOf([bedPoint(x, IN.y0), bedPoint(x, IN.y1)].map(at)));
for (let y = IN.y0 + 20; y < IN.y1; y += 20) grid.push(k.pathOf([bedPoint(IN.x0, y), bedPoint(TOE, y), bedPoint(KNEE, y)].map(at)));
back.push(Ln(grid.join(""), { tone: "faint" }));
const sand = [];
for (let i = 0; i < 520; i++) {
  const x = KNEE + 1 + rand() * (IN.x1 - KNEE - 2);
  const y = IN.y0 + 1 + rand() * (IN.y1 - IN.y0 - 2);
  sand.push(at(bedPoint(x, y)));
}
back.push(Dots(sand, { size: 0.32, tone: "lo" }));

const STAFF = { x: POINT.x - 14, y: IN.y0, w: 9, d: 0.8, r: 0.2 };
back.push(S(slab(STAFF, 4, TOP - 6, 2, 0.2), { tone: "hi", crease: "lo" }));
const staffTicks = { minor: [], major: [] };
for (let z = 6; z <= TOP - 4; z += 1) {
  const major = z % 5 === 0;
  (major ? staffTicks.major : staffTicks.minor).push(k.pathOf([[STAFF.x, IN.y0 + 0.8, z], [STAFF.x + (major ? 4.4 : 2.4), IN.y0 + 0.8, z]].map(at)));
}
back.push(Ln(staffTicks.minor.join(""), { tone: "lo" }), Ln(staffTicks.major.join(""), { tone: "mid" }));
back.push(Dots([at([STAFF.x + 4.5, IN.y0 + 0.8, 5.5]), at([STAFF.x + 4.5, IN.y0 + 0.8, TOP - 3.5])], { size: 0.4 }));

const POINT_BRACKET = { x: POINT.x - 4, y: IN.y0 - WALL + 1, w: 8, d: WALL + 6.4, r: 0.8 };
const pointRod = `<g data-part="point-rod">` + S(k.cylinder(POINT.x, POINT.y, 0.6, START.level, 34, P, 14), { tone: "hi", crease: "none" }) + S(G.solidOf([[0, 0.6], [1.6, 0.05]], G.frameAlong([POINT.x, POINT.y, START.level + 1.6], [0, 0, -1]), P, { steps: 14 }), { tone: "hi" }) + S(k.cylinder(POINT.x, POINT.y, 2.2, START.level + 34, 3.4, P, 24), { tone: "mid" }) + Ln(k.knurl(POINT.x, POINT.y, 2.2, START.level + 34, START.level + 37.4, 20, P), { tone: "lo" }) + `</g>`;
back.push(pointRod);
back.push(S(slab(POINT_BRACKET, TOP, 3, 2, 0.3), { tone: "mid" }) + Dots([at([POINT.x - 2, POINT_BRACKET.y + 2.2, TOP + 3]), at([POINT.x + 2, POINT_BRACKET.y + 2.2, TOP + 3])], { size: 0.4 }));
back.push(S(k.cylinder(POINT.x, POINT.y, 1.8, TOP + 3, 8, P, 20), { tone: "mid" }) + Ln(k.sideArc(POINT.x, POINT.y, 1.8, TOP + 9, P, 12), { tone: "faint" }));
back.push(S(slab({ x: POINT.x + 1.6, y: POINT.y - 1, w: 3, d: 2, r: 0.3 }, TOP + 6, 2, 2), { tone: "mid" }) + S(k.cylinder(POINT.x + 5.6, POINT.y, 1.4, TOP + 5.6, 2.8, P, 14), { tone: "mid" }));

const rods = [];
const plates = [];
for (let i = 0; i < SEGMENTS; i++) {
  const y = segY(i);
  const F = G.frameAlong([DRIVE.gland, y, ACT_Z], [1, 0, 0]);
  const tip = M.PADDLE_X - PLATE_T / 2 - DRIVE.gland;
  const rod = G.rodOut(F, 0, tip, 0.9, P, { stroke: 5 });
  rods.push(`<g data-part="rod" data-i="${i}"><clipPath id="bw-rod-${i}"><path data-hold d="${rod.clip}"/></clipPath><g clip-path="url(#bw-rod-${i})">${S(rod.paths, { tone: "hi", crease: "none" })}</g></g>`);
  const plate = { x: M.PADDLE_X - PLATE_T, y: IN.y0 + SEG_W * i + 0.35, w: PLATE_T, d: SEG_W - 0.7, r: 0.3 };
  const mast = { x: M.PADDLE_X - PLATE_T / 2 - 1.3, y: y - 1.3, w: 2.6, d: 2.6, r: 0.4 };
  plates.push(
    `<g data-part="plate" data-i="${i}">` +
      S(slab(plate, 0, PLATE_TOP, 2, 0.3), { tone: "hi", crease: "lo", inner: Ln(k.sideSeam(plate, 12, P, 2) + k.sideSeam(plate, 30, P, 2), { tone: "faint" }) }) +
      S(slab(mast, PLATE_TOP, ACT_Z - PLATE_TOP + 2.2, 2, 0.2), { tone: "mid" }) +
      S(G.disc(-1.6, 1.6, 1.6, G.frameAlong([M.PADDLE_X - PLATE_T / 2, y, ACT_Z], [1, 0, 0]), P), { tone: "mid" }) +
      Dots([at([plate.x + PLATE_T, y - 4, PLATE_TOP]), at([plate.x + PLATE_T, y + 4, PLATE_TOP])].map((p) => p), { size: 0.35 }) +
      `</g>`,
  );
}
for (let i = 0; i < SEGMENTS; i++) back.push(rods[i], plates[i]);
back.push(`<g class="bw-fallback"><path data-part="fallback-water" class="bw-water-flat" d=""/><path data-part="fallback-crests" class="iso-line" data-tone="mid" d=""/></g>`);

const CREST = M.BW.crest;
const SEA = M.BW.sea;
const LEE = M.BW.lee;
const SLOPE = M.BW.slope;
const HEAD = M.BW.head;
const GLASS = M.BW.glass;
const SEA_TOE = SEA - SLOPE * CREST;
const LEE_TOE_X = (CREST + LEE / SLOPE + M.BEACH.ramp * TOE) / (M.BEACH.ramp + 1 / SLOPE);
const LEE_TOE = [LEE_TOE_X, M.bedOf(LEE_TOE_X)];
const headY = (z) => HEAD - SLOPE * (CREST - z);
const MOUND = {
  crest: [[SEA, HEAD, CREST], [LEE, HEAD, CREST], [LEE, GLASS, CREST], [SEA, GLASS, CREST]],
  sea: [[SEA, HEAD, CREST], [SEA, GLASS, CREST], [SEA_TOE, GLASS, 0], [SEA_TOE, headY(0), 0]],
  lee: [[LEE, HEAD, CREST], [LEE_TOE[0], headY(LEE_TOE[1]), LEE_TOE[1]], [LEE_TOE[0], GLASS, LEE_TOE[1]], [LEE, GLASS, CREST]],
  head: [[SEA, HEAD, CREST], [SEA_TOE, headY(0), 0], [TOE, headY(0), 0], [LEE_TOE[0], headY(LEE_TOE[1]), LEE_TOE[1]], [LEE, HEAD, CREST]],
  end: [[SEA, GLASS, CREST], [LEE, GLASS, CREST], [LEE_TOE[0], GLASS, LEE_TOE[1]], [TOE, GLASS, 0], [SEA_TOE, GLASS, 0]],
};
{
  const shrink = (pts, by) => {
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const cz = pts.reduce((s, p) => s + p[2], 0) / pts.length;
    return pts.map(([x, y, z]) => [cx + (x - cx) * by, y, cz + (z - cz) * by]);
  };
  const core = shrink(MOUND.end, 0.72).map(([x, , z]) => [x, GLASS, Math.max(z, M.bedOf(x) + 0.4)]);
  const section = [];
  for (let i = 0; i < 160; i++) {
    const x = SEA_TOE + rand() * (LEE_TOE[0] - SEA_TOE);
    const z = M.bedOf(x) + rand() * (M.moundOf(x) - M.bedOf(x));
    if (z > M.moundOf(x) - 1 || z < M.bedOf(x) + 0.6) continue;
    section.push(at([x, GLASS, z]));
  }
  const inner = Ln(k.pathOf(core.map(at), true), { tone: "faint" }) + Dots(section, { size: 0.3, tone: "lo" });
  back.push(S(polySolid([MOUND.crest, MOUND.sea, MOUND.lee, MOUND.head, MOUND.end]), { tone: "mid", inner }));
  const stones = [];
  const onFace = (face, count) => {
    for (let i = 0; i < count; i++) {
      const a = rand();
      const b = rand();
      const p = G.lerp3(G.lerp3(face[0], face[1], a), G.lerp3(face[3] ?? face[2], face[2], a), b);
      stones.push([...at(p), 0.5 + 0.5 * rand()]);
    }
  };
  onFace(MOUND.sea, 260);
  onFace(MOUND.crest, 90);
  onFace(MOUND.lee, 200);
  back.push(Dots(stones.map(([x, y, a]) => [x, y, a]), { size: 0.55, tone: "lo" }));
}

const UNIT_H = 11;
const LEG = 0.643 * UNIT_H;
const LEG_R0 = 0.239 * UNIT_H;
const LEG_R1 = 0.151 * UNIT_H;
const HUB_R = Math.hypot(0.17 * UNIT_H, LEG_R0 - ((LEG_R0 - LEG_R1) * 0.17 * UNIT_H) / LEG);
const tetrapods = [];
function frameOfNormal(n) {
  const helper = Math.abs(n[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
  const e1 = G.unit3(G.cross3(helper, n));
  const e2 = G.cross3(n, e1);
  return [e1, e2];
}
function placeTetrapod(point, normal) {
  const u1 = rand();
  const u2 = rand() * Math.PI * 2;
  const u3 = rand() * Math.PI * 2;
  const qa = Math.sqrt(1 - u1);
  const qb = Math.sqrt(u1);
  const [w, x, y, z] = [qa * Math.sin(u2), qa * Math.cos(u2), qb * Math.sin(u3), qb * Math.cos(u3)];
  const R = [
    [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
    [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
    [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],
  ];
  const dirs = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map((d) => G.unit3(R.map((row) => G.dot3(row, d))));
  const drop = Math.max(...dirs.map((d) => -G.dot3(d, normal)));
  const lift = drop * LEG + LEG_R1 * 0.7;
  const centre = G.add3(point, G.mul3(normal, lift));
  tetrapods.push({ centre, dirs });
}
const unitN = (n) => G.unit3(n);
const N_SEA = unitN([-1, 0, SLOPE]);
const N_LEE = unitN([1, 0, SLOPE]);
const N_HEAD = unitN([0, -1, SLOPE]);
const ROW = 12.4;
const ZMIN = 15;
{
  const along = [];
  for (let y = HEAD + 6; y < GLASS - 5; y += ROW) along.push(y);
  const slopeRows = [];
  for (let s = 4.5; (CREST - s / Math.hypot(1, SLOPE) * SLOPE) > ZMIN - 2; s += ROW * 0.92) slopeRows.push(s);
  slopeRows.forEach((s, row) => {
    const dz = (s * SLOPE) / Math.hypot(1, SLOPE);
    const dx = s / Math.hypot(1, SLOPE);
    for (const y0 of along) {
      const y = y0 + (row % 2 ? ROW / 2 : 0) + (rand() - 0.5) * 2;
      if (y > GLASS - 4.5) continue;
      placeTetrapod([SEA - dx + (rand() - 0.5) * 1.5, y, CREST - dz], N_SEA);
      placeTetrapod([LEE + dx + (rand() - 0.5) * 1.5, y + ROW * 0.3, CREST - dz], N_LEE);
    }
  });
  for (const [x, shift] of [[SEA + 5.2, 0], [LEE - 5.2, ROW / 2]]) {
    for (const y0 of along) {
      const y = y0 + shift + (rand() - 0.5) * 2;
      if (y > GLASS - 4.5) continue;
      placeTetrapod([x + (rand() - 0.5) * 1.4, y, CREST], [0, 0, 1]);
    }
  }
  for (let s = 3; CREST - (s * SLOPE) / Math.hypot(1, SLOPE) > ZMIN; s += ROW * 0.92) {
    const dz = (s * SLOPE) / Math.hypot(1, SLOPE);
    const z = CREST - dz;
    const yh = headY(z);
    const xa = SEA - SLOPE * (CREST - z);
    const xb = LEE + SLOPE * (CREST - z);
    const count = Math.max(2, Math.round((xb - xa) / ROW));
    for (let i = 0; i < count; i++) {
      const x = xa + ((i + 0.5) * (xb - xa)) / count;
      const n = x < SEA ? unitN([-0.6, -1, SLOPE]) : x > LEE ? unitN([0.6, -1, SLOPE]) : N_HEAD;
      placeTetrapod([x, yh + 0.6, z], n);
    }
  }
}
const tetraParts = [];
tetrapods.forEach(({ centre, dirs }, index) => {
  tetraParts.push({ key: depth(centre), svg: S(G.sphereOf(centre, HUB_R, P, { steps: 28 }), { tone: "mid", crease: "lo" }) });
  for (const d of dirs) {
    const F = G.frameAlong(centre, d);
    const paths = G.solidOf([[0.17 * UNIT_H, LEG_R0 - ((LEG_R0 - LEG_R1) * 0.17 * UNIT_H) / LEG], [LEG - 0.55, LEG_R1], [LEG, LEG_R1 - 0.55]], F, P, { steps: 22 });
    tetraParts.push({ key: depth(G.add3(centre, G.mul3(d, LEG * 0.55))) + (G.dot3(d, V) > 0 ? 0.02 : -0.02), svg: S(paths, { tone: "mid", crease: "lo" }) });
  }
});
tetraParts.sort((a, b) => a.key - b.key);
back.push(`<g class="bw-armour">${tetraParts.map((part) => part.svg).join("")}</g>`);

for (const y of STAKES) {
  const z0 = M.bedOf(STAKE_X);
  back.push(
    S(k.cylinder(STAKE_X, y, 2.2, z0, 0.8, P, 18), { tone: "mid" }) +
      S(k.cylinder(STAKE_X, y, 0.9, z0 + 0.8, STAKE_TOP - z0 - 0.8, P, 14), { tone: "hi", crease: "none", inner: Ln(Array.from({ length: Math.floor((STAKE_TOP - z0 - 2) / 2) }, (_, i) => k.sideArc(STAKE_X, y, 0.9, z0 + 2 + i * 2, P, 10)).join(""), { tone: "lo" }) }) +
      S(k.cylinder(STAKE_X, y, 1.5, STAKE_TOP, 1.2, P, 14), { tone: "mid" }),
  );
}

const probeBack = [];
for (const y of [M.GAUGES.open, M.GAUGES.lee]) {
  for (const dy of [-1.4, 1.4]) probeBack.push(S(k.cylinder(GANTRY_X, y + dy, 0.45, PROBE_LOW, BEAM_Z - 6 - PROBE_LOW, P, 10), { tone: y === M.GAUGES.lee ? "hi" : "mid", crease: "none", lit: y === M.GAUGES.lee }));
  probeBack.push(S(k.cylinder(GANTRY_X, y, 2.6, PROBE_LOW - 1.6, 1.6, P, 18), { tone: "mid" }));
}
back.push(...probeBack);

const front = [];
const WALL_END = { x: IN.x1, y: IN.y0, w: WALL, d: IN.y1 - IN.y0, r: 0.4 };
front.push(S(slab(WALL_END, 0, TOP, 2, 0.6), { tone: "mid", inner: Ln(k.sideSeam(WALL_END, 22, P, 2), { tone: "faint" }) }));
const POSTS = [-116, -58, 0, 62, 124, 180];
const SILL = { x: OUTER.x, y: IN.y1, w: OUTER.w, d: WALL, r: 0.6 };
const RAIL = { x: OUTER.x, y: IN.y1, w: OUTER.w, d: WALL, r: 0.6 };
front.push(S(slab(SILL, 0, 4.2, 2, 0.4), { tone: "mid" }));
front.push(Dots(POSTS.slice(0, -1).map((x, i) => at([(x + POSTS[i + 1] + 6) / 2, IN.y1 + WALL, 2.1])), { size: 0.42 }));
for (const x of POSTS) {
  const post = { x, y: IN.y1, w: WALL, d: WALL, r: 0.5 };
  front.push(S(slab(post, 4.2, TOP - 4.2 - 3.4, 2, 0.3), { tone: "mid" }));
}
front.push(S(slab(RAIL, TOP - 3.4, 3.4, 2, 0.4), { tone: "mid" }));
const RAIL_TICKS = k.topTicks(IN.x0 + 4, IN.x1 - 4, 4, 5, IN.y1 + WALL - 2.8, TOP, [1.4, 2.8], P, "x");
front.push(Ln(RAIL_TICKS.minor, { tone: "lo" }), Ln(RAIL_TICKS.major, { tone: "mid" }));
front.push(Ln(k.lineOnTop([OUTER.x + 0.6, IN.y1 + WALL - 2.8], [OUTER.x + OUTER.w - 0.6, IN.y1 + WALL - 2.8], TOP, P), { tone: "lo" }));

const TRACK_FAR = { x: GANTRY_X - 14, y: OUTER.y + 1.2, w: 28, d: 3.6, r: 0.6 };
const TRACK_NEAR = { x: GANTRY_X - 14, y: IN.y1 + 1.2, w: 28, d: 3.6, r: 0.6 };
const BEAM = { x: GANTRY_X - 4, y: OUTER.y - 3, w: 8, d: OUTER.d + 6, r: 1 };
const carriage = (plan) => S(slab(plan, TOP, BEAM_Z - TOP, 2, 0.4), { tone: "mid" }) + Dots([at([plan.x + 2.4, plan.y + plan.d / 2, BEAM_Z]), at([plan.x + plan.w - 2.4, plan.y + plan.d / 2, BEAM_Z])], { size: 0.4 });
front.push(carriage({ x: GANTRY_X - 9, y: OUTER.y, w: 18, d: WALL, r: 0.8 }));
const under = [];
const over = [];
for (const y of [M.GAUGES.open, M.GAUGES.lee]) {
  const lee = y === M.GAUGES.lee;
  const clamp = { x: GANTRY_X - 6.5, y: y - 4, w: 13, d: 8, r: 1 };
  under.push(S(slab({ x: GANTRY_X - 3, y: y - 3, w: 6, d: 6, r: 0.6 }, BEAM_Z - 6, 6, 2, 0.3), { tone: "mid" }));
  over.push(S(slab(clamp, BEAM_Z + BEAM_H, 4.6, 2, 0.4), { tone: lee ? "hi" : "mid", lit: lee }) + Dots([at([clamp.x + 2, y, BEAM_Z + BEAM_H + 4.6]), at([clamp.x + clamp.w - 2, y, BEAM_Z + BEAM_H + 4.6])], { size: 0.4 }));
  over.push(S(G.disc(0, 3, 1.4, G.frameAlong([GANTRY_X + 6.5, y, BEAM_Z + BEAM_H + 2.3], [1, 0, 0]), P), { tone: "mid" }));
}
front.push(...under);
front.push(S(slab(BEAM, BEAM_Z, BEAM_H, 3, 0.6), { tone: "mid" }) + Ln(k.planOutline(k.insetPlan(BEAM, 2), BEAM_Z + BEAM_H, P, 2), { tone: "faint" }));
front.push(...over);
front.push(carriage({ x: GANTRY_X - 9, y: IN.y1, w: 18, d: WALL, r: 0.8 }));

function cable(points, { r = 0.9, bend = 4, maxLength = 14 } = {}) {
  return tubePieces(G.fillet(points, bend, 8), r, P, { maxLength, spacing: 1.2 });
}
const CABLE_Y = IN.y1 + WALL + 2.2;
const loggerPlug = (dy) => [LOGGER.x + LOGGER.w / 2 + dy, LOGGER.y, BASE_Z + 12];
for (const [index, y] of [M.GAUGES.open, M.GAUGES.lee].entries()) {
  const start = [GANTRY_X + 9.5, y, BEAM_Z + BEAM_H + 2.3];
  const lane = GANTRY_X + 10.5 + index * 2.4;
  const route = [start, [lane, y, BEAM_Z + BEAM_H + 2.3], [lane, IN.y1 + 2, BEAM_Z + BEAM_H + 2.3], [lane, CABLE_Y, BEAM_Z + 2], [lane, CABLE_Y, BASE_Z + 6], [lane, LOGGER.y - 4, BASE_Z + 1.1], [loggerPlug(index ? 8 : -8)[0], LOGGER.y - 4, BASE_Z + 1.1], [loggerPlug(index ? 8 : -8)[0], LOGGER.y - 1.6, BASE_Z + 9], loggerPlug(index ? 8 : -8)];
  for (const piece of cable(route)) front.push(tubeSvg(piece, { tone: "mid" }));
}

function boxWithDials(plan, dials, label, extra = "") {
  const parts = [];
  for (const [x, y] of byDepth(k.corners(plan, 5))) parts.push(S(k.cylinder(x, y, 2.6, BASE_Z, 2, P, 16), { tone: "lo" }));
  parts.push(S(slab(plan, BASE_Z + 2, BOX_TOP - BASE_Z - 2, 5, 0.8), { tone: "mid" }));
  parts.push(Ln(k.planOutline(k.insetPlan(plan, 3), BOX_TOP, P, 4), { tone: "faint" }));
  parts.push(Dots(k.corners(plan, 5.2).map(([x, y]) => at([x, y, BOX_TOP])), { size: 0.45 }));
  if (label) parts.push(k.faceTextSvg(k.sideMatrix([plan.x + 4, plan.y + plan.d, BOX_TOP - 5], 0, P, "left"), label, { size: 3.4, tone: "lo" }));
  parts.push(extra);
  return parts.join("");
}

const KNOB_R = 6.4;
const dialFace = (cx, cy, from = -135, span = 270) => {
  const ticks = k.radialTicks(cx, cy, KNOB_R + 3, 10, 5, BOX_TOP + 0.8, [1.1, 2.3], P, from * DEG, span * DEG);
  return S(k.cylinder(cx, cy, KNOB_R + 3.6, BOX_TOP, 0.8, P, 40), { tone: "mid" }) + Ln(ticks.minor, { tone: "lo" }) + Ln(ticks.major, { tone: "mid" });
};
const knob = (cx, cy, name) =>
  dialFace(cx, cy) +
  S(k.cylinder(cx, cy, KNOB_R, BOX_TOP + 0.8, 5.4, P, 36), { tone: "hi", crease: "lo" }) +
  Ln(k.knurl(cx, cy, KNOB_R, BOX_TOP + 0.8, BOX_TOP + 6.2, 36, P), { tone: "lo" }) +
  Ln(k.ring(cx, cy, KNOB_R - 1.6, BOX_TOP + 6.2, P, 28), { tone: "faint" }) +
  `<path data-part="${name}" class="iso-line" data-tone="hi" d="" style="stroke-width:1"/>`;
const KNOBS = [
  ["knob-height", CONSOLE.x + 13, CONSOLE.y + 18],
  ["knob-angle", CONSOLE.x + 31, CONSOLE.y + 18],
  ["knob-level", CONSOLE.x + 49, CONSOLE.y + 18],
];
const consoleSvg = boxWithDials(
  CONSOLE,
  KNOBS,
  "WAVEMAKER",
  KNOBS.map(([name, x, y]) => knob(x, y, name)).join("") +
    S(k.cylinder(CONSOLE.x + 56, CONSOLE.y + 6, 2.2, BOX_TOP, 0.8, P, 16), { tone: "mid" }) +
    S(G.sphereOf([CONSOLE.x + 56, CONSOLE.y + 6, BOX_TOP + 0.8], 1.3, P, { steps: 20 }), { tone: "hi", lit: true }),
);
const METERS = [
  ["needle-open", LOGGER.x + 17, LOGGER.y + 17],
  ["needle-lee", LOGGER.x + 47, LOGGER.y + 17],
];
const meter = (name, cx, cy, lit) => {
  const R = 11.5;
  const ticks = k.radialTicks(cx, cy, R - 1.2, 20, 5, BOX_TOP + 3, [1.1, 2.4], P, -60 * DEG, 120 * DEG);
  return (
    S(k.cylinder(cx, cy, R, BOX_TOP, 3, P, 56, 0.6), { tone: "hi", crease: "lo" }) +
    Ln(k.ring(cx, cy, R - 0.8, BOX_TOP + 3, P, 56), { tone: "lo" }) +
    Ln(ticks.minor, { tone: "lo" }) +
    Ln(ticks.major, { tone: "mid" }) +
    `<path data-part="${name}" class="iso-line" data-tone="${lit ? "lit" : "hi"}" d="" style="stroke-width:1"/>` +
    Ln(k.ring(cx, cy, 1.3, BOX_TOP + 3.2, P, 14), { tone: "mid" })
  );
};
const loggerSvg = boxWithDials(
  LOGGER,
  METERS,
  "",
  METERS.map(([name, x, y], i) => meter(name, x, y, i === 1)).join(""),
);
front.push(consoleSvg, loggerSvg);

const JUNCTION = { x: DRIVE.beamX + 3.5, y: PILLARS[1] - 3, w: 3.4, d: 6, r: 0.5 };
const consoleJunction = S(slab(JUNCTION, BASE_Z + 16, 9, 2, 0.3), { tone: "mid" }) + Dots([at([JUNCTION.x + JUNCTION.w, PILLARS[1] - 1.6, BASE_Z + 23]), at([JUNCTION.x + JUNCTION.w, PILLARS[1] + 1.6, BASE_Z + 23])], { size: 0.38 });
const CONSOLE_CABLE = cable([[CONSOLE.x - 2.4, CONSOLE.y + 15, BASE_Z + 10], [CONSOLE.x - 6, CONSOLE.y + 15, BASE_Z + 10], [CONSOLE.x - 8, CONSOLE.y + 15, BASE_Z + 1.1], [JUNCTION.x + 1.7, CONSOLE.y + 15, BASE_Z + 1.1], [JUNCTION.x + 1.7, PILLARS[1], BASE_Z + 1.1], [JUNCTION.x + 1.7, PILLARS[1], BASE_Z + 16]], { r: 1 });
const consoleCable = [...CONSOLE_CABLE.map((piece) => tubeSvg(piece, { tone: "mid" })), consoleJunction, S(G.disc(0, 2.4, 2.2, G.frameAlong([CONSOLE.x, CONSOLE.y + 15, BASE_Z + 10], [-1, 0, 0]), P), { tone: "mid" })];
front.splice(0, 0, ...consoleCable);

const occluders = [
  ...STAKES.map((y) => [STAKE_X, y, 1.6, STAKE_TOP + 1.2]),
  [GANTRY_X, M.GAUGES.open, 2.0, BEAM_Z],
  [GANTRY_X, M.GAUGES.lee, 2.0, BEAM_Z],
  [POINT.x, POINT.y, 2.3, TOP + 12],
];

const DATA = {
  W,
  H,
  P,
  camera: glCamera(P),
  start: START,
  range: M.RANGE,
  inside: [IN.x0, IN.y0, IN.x1, IN.y1],
  segW: SEG_W,
  segments: SEGMENTS,
  drive: [DRIVE.gland, ACT_Z],
  occluders: occluders.flat(),
  point: [POINT.x, POINT.y],
  knobs: KNOBS.map(([, x, y]) => [x, y]),
  meters: METERS.map(([, x, y]) => [x, y]),
  boxTop: BOX_TOP,
  probeLow: PROBE_LOW,
  tetra: tetrapods.flatMap(({ centre, dirs }) => [...centre.map((v) => fixed(v, 3)), 0, ...dirs.flatMap((d) => [...d.map((v) => fixed(v, 4)), 0])]),
  leg: [0.17 * UNIT_H, LEG - LEG_R1 * 0.6, (LEG_R0 + LEG_R1) / 2 + 0.15, HUB_R],
};

const LABEL_TEXT =
  `A coastal-engineering wave basin at 1:${M.SCALE} scale, on a base plate. At the far end a segmented wavemaker of twelve piston paddles, driven by actuators on a beam behind the wall, makes waves that can be turned to arrive at an angle. The basin floor rises up a concrete ramp to a sand beach. A rubble-mound breakwater armoured with interlocking four-legged concrete tetrapods shelters the near half of the beach; the far half is open. The near side wall is glass, so the water and the breakwater are seen in section. A gantry across the basin carries two wave probes, one in the open half and one in the lee, wired to a logger with two needle meters. A wavemaker console sets wave height, direction and water level.`;

const backSvg = k.figureSvg({ width: W, height: H, label: LABEL_TEXT, body: back, className: "bw-back" });
const layerSvg = (name, body) => `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg bw-layer ${name}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${body.join("")}</svg>`;
const controls = `<div class="bw-controls">
<label class="bw-control"><span>Wave height</span><input type="range" data-control="height" min="${M.RANGE.height[0]}" max="${M.RANGE.height[1]}" step="0.1" value="${START.height}"><output data-out="height"></output></label>
<label class="bw-control"><span>Wave direction</span><input type="range" data-control="angle" min="${M.RANGE.angle[0]}" max="${M.RANGE.angle[1]}" step="1" value="${START.angle}"><output data-out="angle"></output></label>
<label class="bw-control"><span>Water level</span><input type="range" data-control="level" min="${M.RANGE.level[0]}" max="${M.RANGE.level[1]}" step="0.1" value="${START.level}"><output data-out="level"></output></label>
</div>`;
const stage = `<div class="bw-stage" role="group" aria-label="Wave basin with a tetrapod breakwater"><span class="bw-said" aria-live="polite"></span>${backSvg}<canvas class="bw-layer bw-gl" aria-hidden="true"></canvas>${layerSvg("bw-front", front)}</div>${controls}`;

const s0 = M.stateOf(START.height, START.angle, START.level);
const caption = `A detached breakwater does not stop waves; it takes their energy where they are big and lets only a little through. Waves of height H shoal as they climb the ramp (ω² = gk tanh kh) and break once H > 0.78 h, so the open shore takes them at full strength. Behind the breakwater only two things reach the beach: waves that diffract round the head into its shadow, fading with distance from the shadow line, and waves transmitted through and over the porous mound. The tetrapods' interlocking legs leave half their volume as voids, so a breaking wave loses its energy in turbulence inside the armour instead of reflecting it. Transmission follows d'Angremond et al. (1996): Kt = −0.4 Rc/H + 0.64 (B/H)^−0.31 (1 − e^−0.5ξ), so raising the water level, which cuts the freeboard Rc, lets more through, and waves arriving at an angle open the shadow toward the gap. At the starting settings the lee probe reads ${Math.round((1 - s0.lee / s0.open) * 100)}% lower than the open one. The model is 1:${M.SCALE} with Froude scaling, so 1 cm of water here is ${(M.SCALE / 100).toFixed(1)} m and the ${M.PERIOD} s waves are ${(M.PERIOD * Math.sqrt(M.SCALE)).toFixed(1)} s at full size.`;

const body = `<div class="bw">${k.plateHtml({
  fig: "Fig 4",
  title: "Tetrapod breakwater",
  hint: "Drag the sliders, or use arrow keys on them",
  readout: M.readoutOf(s0),
  keys: [
    { mark: "raised", label: "Tetrapod armour on a rubble mound: the breakwater" },
    { mark: "lit", label: "Lee probe and its meter: the sheltered shore" },
    { mark: "flat", label: "Far half of the beach: the open, unprotected shore" },
  ],
  caption,
  body: stage,
})}</div>`;

const MODEL = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");
const CSS = readFileSync(join(HERE, "breakwater.css"), "utf8");
const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));
const page = k.pageHtml({ title: "Tetrapod breakwater", theme, body: `<style>${CSS}</style>${body}`, script: kitScript() + glScript() + MODEL + LIVE, width: 920 });
const name = theme === "light" ? "basin-light.html" : "basin.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, `${(page.length / 1024).toFixed(0)} KB`, `${tetrapods.length} tetrapods`, `${back.length + front.length} items`, "lee toe", LEE_TOE.map((v) => v.toFixed(2)).join(","));
