import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../.skill/kit/iso-kit.mjs";
import * as G from "../../../../.skill/kit/lathe.mjs";
import * as A from "../../../../.skill/kit/audit.mjs";
import { turning } from "../../../../.skill/kit/turn-build.mjs";
import * as TA from "../../../../.skill/kit/turn-audit.mjs";
import { turnScript } from "../../../../.skill/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const theme = argv.includes("--light") ? "light" : "dark";
const verify = argv.includes("--verify");

const WIDTH = 660;
const HEIGHT = 480;
const AZIMUTH = 38;
const ELEVATION = 32;
const DEG = Math.PI / 180;

const BASE = { x: -86, y: -82, w: 172, d: 172, r: 9 };
const BASE_H = 12;
const FOOT_H = 5;

// Axial z-bands separated by 0.12 world units:
// - A.supports links across 0.12 (<= 0.15 touch threshold)
// - proveLayers & quickSeparate prove horizontal plane separation (>= 0.10 margin)
const Z_SUB0 = 0.0;
const Z_SUB1 = 8.0;

const Z_CHAS0 = 8.12;
const Z_CHAS1 = 14.0;

const Z_MOV0 = 14.12;
const Z_MOV1 = 20.88;

const Z_LINK0 = 21.0;
const Z_LINK1 = 25.88;

const Z_DIAL0 = 26.0;
const Z_DIAL1 = 29.88;

const Z_PTR0 = 30.0;
const Z_PTR1 = 33.8;

const TUBE_R_IN = 38.0;
const TUBE_R_OUT = 44.5;
const TUBE_R_MID = 41.25;

const DIAL_R_IN = 50.5;
const DIAL_R_OUT = 60.5;

const CASE_R_IN = 53.5;
const CASE_R_OUT = 60.5;

const SECTOR_PIVOT = [13.5, 9.5];
const TIP_PIN = [33.6, 24.0];
const SECTOR_TAIL_PIN = [21.5, 22.0];

export const P = k.fitProjection(
  [
    ...k.boxCorners(BASE, -BASE_H - FOOT_H, 0),
    [-64, -64, 0],
    [64, 78, Z_PTR1 + 4],
  ],
  WIDTH,
  HEIGHT,
  { pad: 24, azimuth: AZIMUTH, elevation: ELEVATION },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const VERT = (x, y) => G.frameOf([x, y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const XY_FRAME = { o: [0, 0, 0], a: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] };

const byDepth = (points) =>
  [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

const hexPoly = (cx, cy, r, rot = Math.PI / 6) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = rot + (i / 6) * Math.PI * 2;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });

const annularTrap = (r0, r1, deg0, deg1) => {
  const a0 = deg0 * DEG;
  const a1 = deg1 * DEG;
  return [
    [r0 * Math.cos(a0), r0 * Math.sin(a0)],
    [r1 * Math.cos(a0), r1 * Math.sin(a0)],
    [r1 * Math.cos(a1), r1 * Math.sin(a1)],
    [r0 * Math.cos(a1), r0 * Math.sin(a1)],
  ];
};

const ringPath = (r, steps = 64) =>
  Array.from({ length: steps }, (_, j) => {
    const a = (j / steps) * Math.PI * 2;
    return `${j ? "L" : "M"}${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
  }).join("") + "Z";

export const R = A.recorder(P);
const put = (item) =>
  R.put({
    ...item,
    shapes: item.shapes.map((shape, index) =>
      R.solid(Object.assign(shape, { name: shape.name ?? (index ? `${item.name}#${index + 1}` : item.name) })),
    ),
  });

function buildStatics() {
  for (const [x, y] of byDepth(k.corners(BASE, 20))) {
    const svg =
      S(k.cylinder(x, y, 7.2, -BASE_H - FOOT_H, 1.8, P, 28), { tone: "lo" }) +
      S(k.cylinder(x, y, 5.5, -BASE_H - FOOT_H + 1.8, FOOT_H - 1.8, P, 28), { tone: "mid" });
    put({
      name: `stand.foot.${x}.${y}`,
      layer: "back",
      at: [x, y, -BASE_H - FOOT_H],
      svg,
      shapes: [
        A.cylinder(x, y, 7.2, -BASE_H - FOOT_H, 1.8, { ground: true }),
        A.cylinder(x, y, 5.5, -BASE_H - FOOT_H + 1.8, FOOT_H - 1.8),
      ],
    });
  }

  const screws = k.corners(BASE, 9);
  const baseSvg =
    S(k.slabOf(BASE, -BASE_H, BASE_H, P, 8, 1.5), {
      tone: "lo",
      inner: L(k.sideSeam(BASE, -BASE_H + 4, P, 8), { tone: "faint" }),
    }) +
    L(k.planOutline(k.insetPlan(BASE, 5), 0, P), { tone: "faint" }) +
    L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }) +
    D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 });
  put({
    name: "stand.base",
    layer: "back",
    at: [0, 0, -BASE_H],
    bias: 4,
    svg: baseSvg,
    shapes: [A.slab(BASE, -BASE_H, BASE_H, { ground: true })],
  });
}

export const T = turning(P, { recorder: R });

// Kinematic hierarchy:
// - spin: 360° turntable orbit around (0, 0)
// - piston: fluid supply plunger sliding into the pressure inlet manifold
// - bourdonMid: middle flexure of the flattened bronze C-tube
// - bourdonTip: outer flexure + sealed tipcap at the free end of the C-tube
// - link: hinged brass connecting link pinned to tipcap
// - sector: geared brass sector pivoting about bridge.sectorPost
// - pinion: central steel pinion & pointer sweeping 270° across the dial
const spin = T.group("spin", { turn: { pivot: [0, 0] } });
const piston = T.group("piston", { parent: spin, slide: { direction: [0, -1, 0], travel: 5.0 } });

const HINGE_MID = [TUBE_R_MID * Math.cos(-162 * DEG), TUBE_R_MID * Math.sin(-162 * DEG), 0];
const HINGE_TIP = [TUBE_R_MID * Math.cos(-62 * DEG), TUBE_R_MID * Math.sin(-62 * DEG), 0];

const bourdonMid = T.group("bourdonMid", {
  parent: spin,
  hinge: { point: HINGE_MID, axis: [0, 0, 1], range: [-2.6, 0] },
});
const bourdonTip = T.group("bourdonTip", {
  parent: bourdonMid,
  hinge: { point: HINGE_TIP, axis: [0, 0, 1], range: [-3.6, 0] },
});
const link = T.group("link", {
  parent: bourdonTip,
  hinge: { point: [TIP_PIN[0], TIP_PIN[1], 0], axis: [0, 0, 1], range: [0, 6.5] },
});
const sector = T.group("sector", {
  parent: spin,
  hinge: { point: [SECTOR_PIVOT[0], SECTOR_PIVOT[1], 0], axis: [0, 0, 1], range: [-15, 0] },
});
const pinion = T.group("pinion", {
  parent: spin,
  hinge: { point: [0, 0, 0], axis: [0, 0, 1], range: [0, 270] },
});

const subbaseLayer = T.layer("subbase");
const chassisLayer = T.layer("chassis");
const movementLayer = T.layer("movement");
const linkageLayer = T.layer("linkage");
const dialLayer = T.layer("dial");
const pointerLayer = T.layer("pointer");

T.stack(["back", "subbase", "chassis", "movement", "linkage", "dial", "pointer"]);

// Maps normalized pressure u in [0..1] (0..100 psi) and turntable angle spin (deg) to all group values
export const follow = (values) => {
  const s = values.spin ?? 0;
  const u = Math.max(0, Math.min(1, values.pressure ?? 0.65));
  return {
    spin: s,
    piston: u * 4.6,
    bourdonMid: -2.4 * u,
    bourdonTip: -3.4 * u,
    link: 5.8 * u,
    sector: -14.0 * u,
    pinion: 270.0 * u,
  };
};

export const poses = () => {
  const list = [];
  for (let s = 0; s < 360; s += 30) {
    for (const u of [0, 0.25, 0.5, 0.75, 1]) {
      list.push(follow({ spin: s, pressure: u }));
    }
  }
  return list;
};

// ---------------------------------------------------------------------------
// 1. Layer "subbase" (z = 0.00 .. 8.00): Central pedestal, radial frame spokes,
//    and lower manifold support block (all grounded on stand.base at z = 0).
// ---------------------------------------------------------------------------
function buildSubbase() {
  T.round({
    name: "caseback.pedestal",
    group: spin,
    layer: subbaseLayer,
    F: VERT(0, 0),
    s0: Z_SUB0,
    s1: Z_SUB1,
    r: 18.0,
    tone: "lo",
    crease: "lo",
    material: "gunmetal",
    details: { seams: [3.5] },
  });

  // 6 radial frame spokes resting on stand.base (z = 0) supporting all pads, rims & risers
  const spokeSpans = [
    [-204, -190],
    [-154, -140],
    [-106, -92],
    [-56, -42],
    [-19, -7],
    [12, 36],
  ];
  spokeSpans.forEach(([a0, a1], idx) => {
    T.prism({
      name: `caseback.spoke.${idx}`,
      group: spin,
      layer: subbaseLayer,
      F: XY_FRAME,
      polygon: annularTrap(19.2, 59.8, a0, a1),
      s0: Z_SUB0,
      s1: Z_SUB1,
      bevel: 0.35,
      tone: "lo",
      material: "gunmetal",
    });
  });

  // Lower manifold carrier rail under the socket & piston assembly (at +y, 90°)
  T.prism({
    name: "socket.carrier",
    group: spin,
    layer: subbaseLayer,
    plan: { x: -11, y: 19.5, w: 22, d: 56, r: 2.4 },
    z: Z_SUB0,
    h: Z_SUB1 - Z_SUB0,
    steps: 4,
    bevel: 0.35,
    tone: "lo",
    material: "gunmetal",
  });
}

// ---------------------------------------------------------------------------
// 2. Layer "chassis" (z = 8.12 .. 14.00):
//    - bridge: stationary brass movement support plate
//    - socket: stationary brass manifold block, C-tube anchor boss, hex flats, inlet cylinder
//    - caseback: open rear instrument bezel ring & C-tube support pads
// ---------------------------------------------------------------------------
function buildChassis() {
  const bridgePart = T.prism({
    name: "bridge.plate",
    group: spin,
    layer: chassisLayer,
    plan: { x: -10.5, y: -10.5, w: 29.0, d: 26.5, r: 2.8 },
    z: Z_CHAS0,
    h: Z_CHAS1 - Z_CHAS0,
    steps: 4,
    bevel: 0.35,
    tone: "mid",
    material: "brass",
    details: {
      dots: [
        { at: [Z_CHAS1, -6.5, -6.5], normal: [0, 0, 1], size: 0.45, tone: "lo" },
        { at: [Z_CHAS1, 14.5, -6.5], normal: [0, 0, 1], size: 0.45, tone: "lo" },
      ],
    },
  });
  const bearingRings =
    `<path class="iso-line" data-tone="lo" d="${ringPath(5.4, 36)}"/>` +
    `<path class="iso-line" data-tone="lo" transform="translate(${SECTOR_PIVOT[0]} ${SECTOR_PIVOT[1]})" d="${ringPath(4.2, 32)}"/>`;
  T.plane({
    part: bridgePart,
    o: [0, 0, Z_CHAS1],
    u: [1, 0, 0],
    v: [0, 1, 0],
    svg: bearingRings,
    fade: [0.04, 0.35],
  });

  // Stationary brass socket manifold block & C-tube root anchor block
  const socketBlock = T.prism({
    name: "socket.block",
    group: spin,
    layer: chassisLayer,
    plan: { x: -13.0, y: 20.0, w: 26.0, d: 24.0, r: 2.2 },
    z: Z_CHAS0,
    h: Z_CHAS1 - Z_CHAS0,
    steps: 4,
    bevel: 0.4,
    tone: "mid",
    material: "brass",
    details: {
      dots: [
        { at: [Z_CHAS1, -8.5, 24.5], normal: [0, 0, 1], size: 0.48, tone: "lo" },
        { at: [Z_CHAS1, 8.5, 24.5], normal: [0, 0, 1], size: 0.48, tone: "lo" },
        { at: [Z_CHAS1, -8.5, 39.5], normal: [0, 0, 1], size: 0.48, tone: "lo" },
        { at: [Z_CHAS1, 8.5, 39.5], normal: [0, 0, 1], size: 0.48, tone: "lo" },
      ],
    },
  });
  // Cut-open internal fluid channel engraving on top of socket.block
  const channelSvg = `<path class="iso-line" data-tone="lo" d="${ringPath(3.5, 28)}"/>`;
  T.plane({
    part: socketBlock,
    o: [0, 32.0, Z_CHAS1],
    u: [1, 0, 0],
    v: [0, 1, 0],
    svg: channelSvg,
    fade: [0.04, 0.35],
  });

  // Root anchor block supporting the fixed root of the Bourdon C-tube (bottom-left)
  T.prism({
    name: "socket.root",
    group: spin,
    layer: chassisLayer,
    plan: { x: -45.5, y: 15.0, w: 29.5, d: 17.5, r: 2.2 },
    z: Z_CHAS0,
    h: Z_CHAS1 - Z_CHAS0,
    steps: 4,
    bevel: 0.35,
    tone: "mid",
    material: "brass",
  });

  // Hexagonal brass wrench flats on the pressure inlet stem
  T.prism({
    name: "socket.hex",
    group: spin,
    layer: chassisLayer,
    F: XY_FRAME,
    polygon: hexPoly(0, 52.5, 7.6, Math.PI / 6),
    s0: Z_CHAS0,
    s1: Z_CHAS1,
    bevel: 0.35,
    tone: "hi",
    crease: "lo",
    material: "brass",
  });

  // Lower pressure inlet cylinder & plunger slideway
  T.prism({
    name: "socket.stem",
    group: spin,
    layer: chassisLayer,
    plan: { x: -8.0, y: 61.5, w: 16.0, d: 15.0, r: 2.2 },
    z: Z_CHAS0,
    h: Z_CHAS1 - Z_CHAS0,
    steps: 4,
    bevel: 0.35,
    tone: "mid",
    material: "brass",
  });

  // 5 open rear bezel ring segments around the perimeter (R = 52.5..59.5)
  const rimSpans = [
    [-208, -168],
    [-160, -118],
    [-110, -68],
    [-60, -22],
    [-16, 24],
  ];
  rimSpans.forEach(([a0, a1], idx) => {
    T.prism({
      name: `caseback.rim.${idx}`,
      group: spin,
      layer: chassisLayer,
      F: XY_FRAME,
      polygon: annularTrap(CASE_R_IN, CASE_R_OUT, a0, a1),
      s0: Z_CHAS0,
      s1: Z_CHAS1,
      bevel: 0.35,
      tone: "lo",
      material: "gunmetal",
    });
  });

  // Support pads on the radial spokes directly under the flexing C-tube segments & tipcap
  const padSpans = [
    [-151, -142],
    [-103, -94],
    [-53, -44],
    [13, 35],
  ];
  padSpans.forEach(([a0, a1], idx) => {
    T.prism({
      name: `caseback.pad.${idx}`,
      group: spin,
      layer: chassisLayer,
      F: XY_FRAME,
      polygon: annularTrap(38.6, 43.8, a0, a1),
      s0: Z_CHAS0,
      s1: Z_CHAS1,
      bevel: 0.3,
      tone: "lo",
      material: "gunmetal",
    });
  });
}

// ---------------------------------------------------------------------------
// 3. Layer "movement" (z = 14.12 .. 20.88):
//    - bourdon: 5 flattened oval-section phosphor-bronze C-tube segments
//      curving 250° around (0, 0) from -215° to +35°
//    - tipcap: sealed brass end-piece at the free end of the C-tube
//    - sector: pivoted brass sector gear with geared teeth arc & tail lever
//    - pinion: central fluted steel pinion gear & hairspring
//    - piston: hydraulic pressure supply plunger in the lower inlet manifold
//    - dial.riser: 4 outer brass standoffs supporting the upper dial scale ring
// ---------------------------------------------------------------------------
function buildMovement() {
  // Bourdon C-tube segments (250° total span from -215° to +35°)
  const tubeSpans = [
    { name: "bourdon.seg.0", group: spin, a0: -215, a1: -166 },
    { name: "bourdon.seg.1", group: bourdonMid, a0: -160, a1: -114 },
    { name: "bourdon.seg.2", group: bourdonMid, a0: -108, a1: -65 },
    { name: "bourdon.seg.3", group: bourdonTip, a0: -59, a1: -14 },
    { name: "bourdon.seg.4", group: bourdonTip, a0: -8, a1: 27 },
  ];
  for (const seg of tubeSpans) {
    T.prism({
      name: seg.name,
      group: seg.group,
      layer: movementLayer,
      F: XY_FRAME,
      polygon: annularTrap(TUBE_R_IN, TUBE_R_OUT, seg.a0, seg.a1),
      s0: Z_MOV0,
      s1: Z_MOV1,
      bevel: 0.45,
      tone: "hi",
      crease: "lo",
      lit: true,
      material: "copper",
    });
  }

  // Sealed brass end-piece (tipcap) at the free end of the Bourdon C-tube (+30°..+41°)
  T.prism({
    name: "tipcap.body",
    group: bourdonTip,
    layer: movementLayer,
    F: XY_FRAME,
    polygon: annularTrap(TUBE_R_IN - 0.8, TUBE_R_OUT + 0.8, 30, 41),
    s0: Z_MOV0,
    s1: Z_MOV1,
    bevel: 0.4,
    tone: "hi",
    crease: "lo",
    material: "brass",
    details: {
      dots: [{ at: [Z_MOV1, TIP_PIN[0], TIP_PIN[1]], normal: [0, 0, 1], size: 0.52, tone: "hi" }],
    },
  });

  // Pivoted brass sector gear (hinged at SECTOR_PIVOT = [13.5, 9.5])
  T.round({
    name: "sector.hub",
    group: sector,
    layer: movementLayer,
    F: VERT(SECTOR_PIVOT[0], SECTOR_PIVOT[1]),
    s0: Z_MOV0,
    s1: Z_MOV1,
    r: 3.4,
    tone: "mid",
    material: "brass",
    details: { bolts: [{ s: Z_MOV1, r: 0, count: 1, size: 0.48 }] },
  });

  // Sector gear web & geared arc facing the central pinion at (0, 0)
  const sectorWebPoly = [
    [10.2, 6.2],
    [4.4, 8.2],
    [6.8, 2.2],
    [11.2, 5.2],
  ];
  const sectorWeb = T.prism({
    name: "sector.web",
    group: sector,
    layer: movementLayer,
    F: XY_FRAME,
    polygon: sectorWebPoly,
    s0: Z_MOV0,
    s1: Z_MOV1,
    bevel: 0.35,
    tone: "hi",
    crease: "lo",
    material: "brass",
  });
  // Etched gear-tooth Pitch-Circle witness arc on top of sector.web
  T.plane({
    part: sectorWeb,
    o: [7.6, 5.6, Z_MOV1],
    u: [1, 0, 0],
    v: [0, 1, 0],
    svg: `<path class="iso-line" data-tone="lo" data-free="both" d="M-2.2 1.8L1.8 -2.2"/>`,
    fade: [0.04, 0.35],
  });

  // Sector tail arm extending from pivot toward SECTOR_TAIL_PIN = [21.5, 22.0]
  const sectorTailPoly = [
    [15.2, 13.0],
    [17.4, 11.4],
    [23.8, 21.2],
    [20.2, 23.6],
  ];
  T.prism({
    name: "sector.tail",
    group: sector,
    layer: movementLayer,
    F: XY_FRAME,
    polygon: sectorTailPoly,
    s0: Z_MOV0,
    s1: Z_MOV1,
    bevel: 0.35,
    tone: "mid",
    material: "brass",
    details: {
      dots: [{ at: [Z_MOV1, SECTOR_TAIL_PIN[0], SECTOR_TAIL_PIN[1]], normal: [0, 0, 1], size: 0.48, tone: "hi" }],
    },
  });

  // Central fluted steel pinion gear & hairspring collet at (0, 0)
  const pinionGear = T.round({
    name: "pinion.gear",
    group: pinion,
    layer: movementLayer,
    F: VERT(0, 0),
    s0: Z_MOV0,
    s1: Z_MOV1,
    r: 4.5,
    tone: "hi",
    crease: "lo",
    material: "steel",
    details: {
      seams: [Z_MOV0 + 2.0, Z_MOV1 - 2.0],
      bolts: [{ s: Z_MOV1, r: 3.0, count: 6, size: 0.38, phase: 0.2 }],
    },
  });
  // Phosphor-bronze hairspring ring marking on top of pinion.gear
  const hairspringSvg =
    `<path class="iso-line" data-tone="lo" d="${ringPath(3.6, 36)}"/>` +
    `<path class="iso-line" data-tone="lo" d="${ringPath(2.4, 28)}"/>`;
  T.plane({
    part: pinionGear,
    o: [0, 0, Z_MOV1],
    u: [1, 0, 0],
    v: [0, 1, 0],
    svg: hairspringSvg,
    fade: [0.04, 0.35],
  });

  // Fluid pressure supply plunger assembly sliding into the inlet manifold along -y
  T.prism({
    name: "piston.block",
    group: piston,
    layer: movementLayer,
    plan: { x: -5.8, y: 66.8, w: 11.6, d: 8.4, r: 1.8 },
    z: Z_MOV0,
    h: Z_MOV1 - Z_MOV0,
    steps: 4,
    bevel: 0.35,
    tone: "hi",
    crease: "lo",
    material: "chrome",
    details: {
      dots: [{ at: [Z_MOV1, 0, 71.0], normal: [0, 0, 1], size: 0.5, tone: "hi" }],
    },
  });

  // 6 outer brass dial standoffs (lower section in movementLayer, one under each dial.arc.0..5)
  const riserDegs = [-196, -148, -100, -50, -13, 18];
  riserDegs.forEach((deg, idx) => {
    const rad = deg * DEG;
    const px = 57.2 * Math.cos(rad);
    const py = 57.2 * Math.sin(rad);
    T.round({
      name: `dial.riser.${idx}`,
      group: spin,
      layer: movementLayer,
      F: VERT(px, py),
      s0: Z_MOV0,
      s1: Z_MOV1,
      r: 2.0,
      tone: "mid",
      material: "brass",
    });
  });
}

// ---------------------------------------------------------------------------
// 4. Layer "linkage" (z = 21.00 .. 25.88):
//    - link: hinged brass connecting link joining tipcap pin to sector tail pin
//    - bridge.top: upper movement bridge plate over the sector pivot
//    - pinion.shaft: central steel pinion shaft rising toward the dial
//    - piston.knob: knurled brass actuator cap on top of the pressure plunger
//    - dial.post: upper sections of the 4 brass dial standoffs
// ---------------------------------------------------------------------------
function buildLinkage() {
  // Hinged brass connecting link: eye at tipcap pin, link bar, eye at sector tail pin
  T.round({
    name: "link.eyeTip",
    group: link,
    layer: linkageLayer,
    F: VERT(TIP_PIN[0], TIP_PIN[1]),
    s0: Z_LINK0,
    s1: Z_LINK1,
    r: 2.8,
    tone: "hi",
    material: "brass",
    details: { bolts: [{ s: Z_LINK1, r: 0, count: 1, size: 0.45 }] },
  });

  T.round({
    name: "link.eyeSector",
    group: link,
    layer: linkageLayer,
    F: VERT(SECTOR_TAIL_PIN[0], SECTOR_TAIL_PIN[1]),
    s0: Z_LINK0,
    s1: Z_LINK1,
    r: 2.8,
    tone: "hi",
    material: "brass",
    details: { bolts: [{ s: Z_LINK1, r: 0, count: 1, size: 0.45 }] },
  });

  const dx = SECTOR_TAIL_PIN[0] - TIP_PIN[0];
  const dy = SECTOR_TAIL_PIN[1] - TIP_PIN[1];
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const barA = [TIP_PIN[0] + ux * 2.9, TIP_PIN[1] + uy * 2.9];
  const barB = [SECTOR_TAIL_PIN[0] - ux * 2.9, SECTOR_TAIL_PIN[1] - uy * 2.9];
  const hw = 1.65;
  const linkBarPoly = [
    [barA[0] - nx * hw, barA[1] - ny * hw],
    [barB[0] - nx * hw, barB[1] - ny * hw],
    [barB[0] + nx * hw, barB[1] + ny * hw],
    [barA[0] + nx * hw, barA[1] + ny * hw],
  ];
  T.prism({
    name: "link.bar",
    group: link,
    layer: linkageLayer,
    F: XY_FRAME,
    polygon: linkBarPoly,
    s0: Z_LINK0,
    s1: Z_LINK1 - 0.6,
    bevel: 0.3,
    tone: "hi",
    crease: "lo",
    material: "brass",
  });

  // Upper movement bridge plate over the sector pivot
  T.prism({
    name: "bridge.top",
    group: spin,
    layer: linkageLayer,
    plan: { x: 9.2, y: -6.5, w: 8.6, d: 19.5, r: 1.8 },
    z: Z_LINK0,
    h: Z_LINK1 - Z_LINK0 - 0.8,
    steps: 4,
    bevel: 0.3,
    tone: "mid",
    material: "brass",
    details: {
      dots: [
        { at: [Z_LINK1 - 0.8, 13.5, -3.5], normal: [0, 0, 1], size: 0.45, tone: "lo" },
        { at: [Z_LINK1 - 0.8, 13.5, 9.5], normal: [0, 0, 1], size: 0.48, tone: "hi" },
      ],
    },
  });

  // Central steel pinion shaft rising through the movement
  T.round({
    name: "pinion.shaft",
    group: pinion,
    layer: linkageLayer,
    F: VERT(0, 0),
    s0: Z_LINK0,
    s1: Z_LINK1,
    r: 2.8,
    tone: "hi",
    material: "chrome",
  });

  // Knurled brass pressure cap on the hydraulic supply plunger
  T.round({
    name: "piston.cap",
    group: piston,
    layer: linkageLayer,
    F: VERT(0, 71.0),
    s0: Z_LINK0,
    s1: Z_LINK1 - 0.4,
    r: 4.8,
    tone: "hi",
    crease: "lo",
    material: "brass",
    details: {
      seams: [Z_LINK0 + 1.8],
      bolts: [{ s: Z_LINK1 - 0.4, r: 0, count: 1, size: 0.48 }],
    },
  });

  // 6 outer brass dial standoffs (upper section in linkageLayer)
  const postDegs = [-196, -148, -100, -50, -13, 18];
  postDegs.forEach((deg, idx) => {
    const rad = deg * DEG;
    const px = 57.2 * Math.cos(rad);
    const py = 57.2 * Math.sin(rad);
    T.round({
      name: `dial.post.${idx}`,
      group: spin,
      layer: linkageLayer,
      F: VERT(px, py),
      s0: Z_LINK0,
      s1: Z_LINK1,
      r: 2.0,
      tone: "mid",
      material: "brass",
    });
  });
}

// ---------------------------------------------------------------------------
// 5. Layer "dial" (z = 26.00 .. 29.88):
//    - dial.arc.0..5: Calibrated semi-open horseshoed scale ring (R = 49.0..59.5)
//      leaving the entire center (R < 49.0) open so the internal mechanism is never occluded!
//    - pinion.collet: Upper brass pointer collet on the central pinion shaft
// ---------------------------------------------------------------------------
function buildDial() {
  // 270° sweep from -225° (0 PSI) clockwise over the top (-90°) to +45° (100 PSI), split into 6 convex sectors
  const dialSectors = [
    { a0: -225, a1: -183, label: "0", tickDegs: [-225, -211.5, -198, -184.5] },
    { a0: -179, a1: -137, label: "20", tickDegs: [-171, -157.5, -144] },
    { a0: -133, a1: -91, label: "40", tickDegs: [-130.5, -117, -103.5, -92] },
    { a0: -87, a1: -45, label: "60", tickDegs: [-85, -72, -58.5, -46] },
    { a0: -41, a1: 1, label: "80", tickDegs: [-36, -22.5, -9, 0] },
    { a0: 5, a1: 45, label: "100", tickDegs: [9, 22.5, 34, 44] },
  ];

  dialSectors.forEach((sec, idx) => {
    const part = T.prism({
      name: `dial.arc.${idx}`,
      group: spin,
      layer: dialLayer,
      F: XY_FRAME,
      polygon: annularTrap(DIAL_R_IN, DIAL_R_OUT, sec.a0, sec.a1),
      s0: Z_DIAL0,
      s1: Z_DIAL0 + 2.4,
      bevel: 0.3,
      tone: "hi",
      crease: "lo",
      material: "steel",
    });

    const ticks = sec.tickDegs
      .map((deg, tIdx) => {
        const rad = deg * DEG;
        const rIn = DIAL_R_IN + 1.0;
        const rOut = tIdx === 0 || tIdx === sec.tickDegs.length - 1 ? DIAL_R_IN + 4.2 : DIAL_R_IN + 2.6;
        return `M${(rIn * Math.cos(rad)).toFixed(2)} ${(rIn * Math.sin(rad)).toFixed(2)}L${(rOut * Math.cos(rad)).toFixed(2)} ${(rOut * Math.sin(rad)).toFixed(2)}`;
      })
      .join("");
    const midRad = ((sec.a0 + sec.a1) / 2) * DEG;
    const rText = (DIAL_R_IN + DIAL_R_OUT) / 2 + 0.8;
    const tx = (rText * Math.cos(midRad)).toFixed(2);
    const ty = (rText * Math.sin(midRad)).toFixed(2);
    const rot = ((sec.a0 + sec.a1) / 2 + 90).toFixed(1);
    const markup =
      `<path class="iso-line" data-tone="mid" data-free="both" d="${ticks}"/>` +
      `<text class="iso-face-text" data-tone="mid" font-size="3.2" text-anchor="middle" transform="translate(${tx} ${ty}) rotate(${rot}) translate(0 1.1)">${sec.label}</text>`;
    T.plane({
      part,
      o: [0, 0, Z_DIAL0 + 2.4],
      u: [1, 0, 0],
      v: [0, 1, 0],
      svg: markup,
      fade: [0.04, 0.32],
    });
  });

  // Upper brass collet on the central pinion shaft
  T.round({
    name: "pinion.collet",
    group: pinion,
    layer: dialLayer,
    F: VERT(0, 0),
    s0: Z_DIAL0,
    s1: Z_DIAL1,
    r: 3.4,
    tone: "mid",
    material: "brass",
  });
}

// ---------------------------------------------------------------------------
// 6. Layer "pointer" (z = 30.00 .. 33.80):
//    - pointer.hub: central boss on the pinion shaft
//    - pointer.tail: counterweight tail arm
//    - pointer.blade: high-contrast tapered indicator needle sweeping 270°
//      At pinion = 0° (0 psi), points toward -225° (+135°); at pinion = 270° (100 psi), points toward +45°.
// ---------------------------------------------------------------------------
function buildPointer() {
  const dirRad = -225 * DEG;
  const ux = Math.cos(dirRad);
  const uy = Math.sin(dirRad);
  const nx = -uy;
  const ny = ux;

  T.round({
    name: "pointer.hub",
    group: pinion,
    layer: pointerLayer,
    F: VERT(0, 0),
    s0: Z_PTR0,
    s1: Z_PTR1,
    r: 5.0,
    tone: "mid",
    material: "gunmetal",
    details: {
      bolts: [{ s: Z_PTR1, r: 0, count: 1, size: 0.55 }],
    },
  });

  // Counterweight tail lobe extending opposite the needle (-ux, -uy) from r = 5.10 to r = 14.5
  const tailPoly = [
    [-ux * 5.1 - nx * 1.8, -uy * 5.1 - ny * 1.8],
    [-ux * 14.5 - nx * 2.8, -uy * 14.5 - ny * 2.8],
    [-ux * 14.5 + nx * 2.8, -uy * 14.5 + ny * 2.8],
    [-ux * 5.1 + nx * 1.8, -uy * 5.1 + ny * 1.8],
  ];
  T.prism({
    name: "pointer.tail",
    group: pinion,
    layer: pointerLayer,
    F: XY_FRAME,
    polygon: tailPoly,
    s0: Z_PTR0 + 0.2,
    s1: Z_PTR1 - 0.6,
    bevel: 0.3,
    tone: "mid",
    material: "brass",
  });

  // High-contrast tapered indicator needle extending along (+ux, +uy) from r = 5.10 to r = 48.0
  const bladePoly = [
    [ux * 5.1 + nx * 1.8, uy * 5.1 + ny * 1.8],
    [ux * 5.1 - nx * 1.8, uy * 5.1 - ny * 1.8],
    [ux * 48.0 - nx * 0.9, uy * 48.0 - ny * 0.9],
    [ux * 48.0 + nx * 0.9, uy * 48.0 + ny * 0.9],
  ];
  T.prism({
    name: "pointer.blade",
    group: pinion,
    layer: pointerLayer,
    F: XY_FRAME,
    polygon: bladePoly,
    s0: Z_PTR0 + 0.4,
    s1: Z_PTR1 - 0.8,
    bevel: 0.25,
    tone: "hi",
    crease: "lo",
    lit: true,
    material: "chrome",
  });
}

buildStatics();
buildSubbase();
buildChassis();
buildMovement();
buildLinkage();
buildDial();
buildPointer();

export const out = T.build({ statics: R.items, poses, verify });
A.settle(R, P);

const layerOf = (name) =>
  R.items
    .filter((item) => item.layer === name)
    .sort((a, b) => a.key - b.key)
    .map((item) => item.svg);

const BACK = [`<path class="iso-halo" d="${k.haloOf(BASE, -BASE_H - FOOT_H, BASE_H, P)}"/>`, ...layerOf("back")];

if (argv.includes("--audit")) {
  A.auditOrExit(R, P);
  await TA.orbitOrExit(T, R, P, {
    sweep: {
      at: (x) => follow({ spin: x, pressure: 0.5 - 0.5 * Math.cos((x * Math.PI) / 180) }),
      from: 0,
      to: 360,
      frame: 0.5,
    },
    workers: argv.includes("--workers"),
    quick: argv.includes("--quick"),
  });
}

const LABEL =
  "An interactive 3D Bourdon tube pressure gauge with an open horseshoed dial ring: internal fluid pressure from the lower hexagonal brass socket and plunger uncoils a flattened 250-degree phosphor-bronze C-tube, pulling a hinged brass link and geared sector arm that meshes with a central 6.5x steel pinion to sweep the indicator needle 270 degrees.";
const backSvg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: BACK });

const stage =
  `<div class="iso-stage iso-turn bpg-stage" tabindex="0" role="slider" ` +
  `aria-label="Bourdon tube pressure gauge: drag to orbit 360 degrees or adjust manifold pressure from 0 to 100 psi" ` +
  `aria-valuemin="0" aria-valuemax="100" aria-valuenow="65" aria-valuetext="65 psi (4.5 bar), pointer 175.5 degrees">` +
  `${backSvg}` +
  `${out.layerSvg("subbase", { width: WIDTH, height: HEIGHT })}` +
  `${out.layerSvg("chassis", { width: WIDTH, height: HEIGHT })}` +
  `${out.layerSvg("movement", { width: WIDTH, height: HEIGHT })}` +
  `${out.layerSvg("linkage", { width: WIDTH, height: HEIGHT })}` +
  `${out.layerSvg("dial", { width: WIDTH, height: HEIGHT })}` +
  `${out.layerSvg("pointer", { width: WIDTH, height: HEIGHT })}` +
  `</div>`;

const CONTROLS_HTML = `
<div class="bpg-ui" aria-label="Pressure gauge controls and telemetry">
  <div class="bpg-bar">
    <label class="bpg-slider-wrap">
      <span class="bpg-label">Manifold Pressure <em>P</em></span>
      <input type="range" data-scrub min="0" max="100" step="0.5" value="65" aria-label="Manifold pressure percentage" />
      <span class="bpg-val" data-val-psi>65.0 psi</span>
    </label>
    <div class="bpg-btns">
      <button type="button" class="bpg-btn" data-play aria-pressed="false">Cycle P</button>
      <button type="button" class="bpg-btn" data-orbit aria-pressed="false">Orbit 3D</button>
      <button type="button" class="bpg-btn" data-cutaway aria-pressed="false" title="Shortcut: X">Cutaway (X)</button>
    </div>
  </div>
  <div class="bpg-presets" role="group" aria-label="Bourdon tube rating presets">
    <span class="bpg-preset-lbl">Tube Rating:</span>
    <button type="button" class="bpg-chip is-active" data-rating="100" data-alloy="Phosphor Bronze">100 psi Phosphor Bronze</button>
    <button type="button" class="bpg-chip" data-rating="250" data-alloy="316 Stainless Steel">250 psi Stainless Steel</button>
    <button type="button" class="bpg-chip" data-rating="600" data-alloy="Monel 400 Alloy">600 psi Monel Alloy</button>
  </div>
  <div class="bpg-telem">
    <div class="bpg-cell"><span class="bpg-k">Pressure <em>P</em></span><span class="bpg-v" data-t-pressure>65.0 psi · 4.48 bar</span></div>
    <div class="bpg-cell"><span class="bpg-k">C-Tube Tip Δ<em>δ</em></span><span class="bpg-v" data-t-tip>2.73 mm</span></div>
    <div class="bpg-cell"><span class="bpg-k">Sector Angle Δ<em>θ</em><sub>s</sub></span><span class="bpg-v" data-t-sector>10.9° (6.5× gear)</span></div>
    <div class="bpg-cell"><span class="bpg-k">Total Amplification</span><span class="bpg-v" data-t-amp>12.5 : 1 → 175.5°</span></div>
    <div class="bpg-cell"><span class="bpg-k">Wall Stress Ratio</span><span class="bpg-v" data-t-stress>σ<sub>h</sub>/σ<sub>l</sub> = 2 : 1 (uncoiling)</span></div>
  </div>
</div>`;

const EXTRA_CSS = `
.bpg-stage { cursor: grab; touch-action: none; user-select: none; }
.bpg-stage:active { cursor: grabbing; }
.bpg-stage.is-cutaway [data-name^="caseback.rim."],
.bpg-stage.is-cutaway [data-name^="dial.arc."],
.bpg-stage.is-cutaway [data-name^="dial.post."],
.bpg-stage.is-cutaway [data-name^="dial.riser."] {
  opacity: 0.14;
  transition: opacity 0.22s ease;
}
.bpg-ui {
  margin: 10px 0 4px;
  padding: 10px 12px;
  border: 1px solid var(--anatomy-faint);
  border-radius: 6px;
  background: color-mix(in srgb, var(--anatomy-face) 45%, var(--anatomy-paper));
  font-family: var(--anatomy-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 11.5px;
  color: var(--anatomy-mid);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.bpg-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.bpg-slider-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 260px;
}
.bpg-label { color: var(--anatomy-hi); font-weight: 600; white-space: nowrap; }
.bpg-slider-wrap input[type="range"] {
  flex: 1;
  accent-color: var(--anatomy-hi);
  cursor: pointer;
}
.bpg-val {
  min-width: 68px;
  text-align: right;
  color: var(--anatomy-hi);
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
.bpg-btns, .bpg-presets {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.bpg-preset-lbl { color: var(--anatomy-lo); margin-right: 2px; }
.bpg-btn, .bpg-chip {
  font: inherit;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid var(--anatomy-lo);
  background: var(--anatomy-paper);
  color: var(--anatomy-mid);
  cursor: pointer;
}
.bpg-btn:hover, .bpg-chip:hover {
  border-color: var(--anatomy-hi);
  color: var(--anatomy-hi);
}
.bpg-btn[aria-pressed="true"], .bpg-chip.is-active {
  background: var(--anatomy-hi);
  color: var(--anatomy-paper);
  border-color: var(--anatomy-hi);
}
.bpg-telem {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
  gap: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--anatomy-faint);
}
.bpg-cell {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.bpg-k { font-size: 10px; color: var(--anatomy-lo); text-transform: uppercase; letter-spacing: 0.03em; }
.bpg-v { font-size: 11.5px; color: var(--anatomy-hi); font-variant-numeric: tabular-nums; font-weight: 600; }
`;

const DATA = { turn: out.data };
const LIVE_SCRIPT = `
(() => {
  const DATA = ${JSON.stringify(DATA)};
  const follow = ${follow.toString()};
  const stage = document.querySelector(".bpg-stage");
  const readout = document.querySelector("[data-readout]");
  const scrub = document.querySelector("[data-scrub]");
  const valPsi = document.querySelector("[data-val-psi]");
  const btnPlay = document.querySelector("[data-play]");
  const btnOrbit = document.querySelector("[data-orbit]");
  const btnCut = document.querySelector("[data-cutaway]");
  const chips = [...document.querySelectorAll("[data-rating]")];
  const tPressure = document.querySelector("[data-t-pressure]");
  const tTip = document.querySelector("[data-t-tip]");
  const tSector = document.querySelector("[data-t-sector]");
  const tAmp = document.querySelector("[data-t-amp]");
  const tStress = document.querySelector("[data-t-stress]");
  const still = matchMedia("(prefers-reduced-motion: reduce)");

  let spinAngle = 0;
  let u = 0.65; // normalized pressure 0..1
  let ratingMax = 100;
  let alloyName = "Phosphor Bronze";
  let playing = !still.matches;
  let orbiting = false;
  let cutaway = false;
  let clock = 0;
  let last = 0;
  let own = false;

  function updateReadouts() {
    const psi = u * ratingMax;
    const bar = psi * 0.0689476;
    const tipMm = u * 4.2;
    const sectorDeg = u * 41.5; // 270 / 6.5 = 41.54 deg equivalent gear arc
    const pointerDeg = u * 270.0;
    const hoopMpa = Math.round(u * (ratingMax === 100 ? 140 : ratingMax === 250 ? 260 : 420));

    if (valPsi) valPsi.textContent = psi.toFixed(1) + " psi";
    if (scrub && document.activeElement !== scrub) scrub.value = String((u * 100).toFixed(1));
    if (tPressure) tPressure.textContent = psi.toFixed(1) + " psi · " + bar.toFixed(2) + " bar";
    if (tTip) tTip.textContent = tipMm.toFixed(2) + " mm";
    if (tSector) tSector.textContent = sectorDeg.toFixed(1) + "° (6.5× gear)";
    if (tAmp) tAmp.textContent = "12.5 : 1 → " + pointerDeg.toFixed(1) + "°";
    if (tStress) tStress.textContent = "σh/σl = 2 : 1 (" + hoopMpa + " MPa)";

    const summary =
      psi.toFixed(0) + " psi (" + bar.toFixed(1) + " bar) · needle " + pointerDeg.toFixed(0) + "°";
    if (readout && readout.textContent !== summary) readout.textContent = summary;
    stage.setAttribute("aria-valuenow", String(Math.round(psi)));
    stage.setAttribute("aria-valuemax", String(ratingMax));
    stage.setAttribute("aria-valuetext", summary + " · tip Δδ " + tipMm.toFixed(2) + " mm · " + alloyName);
  }

  const controller = TURN.mount(stage, DATA.turn, {
    group: "spin",
    follow: (vals) => follow({ spin: vals.spin ?? spinAngle, pressure: u }),
    onHold: () => {
      orbiting = false;
      if (btnOrbit) btnOrbit.setAttribute("aria-pressed", "false");
    },
    onFrame: (turned) => {
      if (!own && turned.values && typeof turned.values.spin === "number") {
        spinAngle = turned.values.spin;
      }
      updateReadouts();
    },
  });

  function applyPose() {
    own = true;
    controller.set(follow({ spin: spinAngle, pressure: u }));
    own = false;
    updateReadouts();
  }

  function setPlaying(on) {
    playing = Boolean(on) && !still.matches;
    if (btnPlay) btnPlay.setAttribute("aria-pressed", String(playing));
    if (playing || orbiting) {
      last = 0;
      requestAnimationFrame(tick);
    }
  }

  function setOrbiting(on) {
    orbiting = Boolean(on) && !still.matches;
    if (btnOrbit) btnOrbit.setAttribute("aria-pressed", String(orbiting));
    if (playing || orbiting) {
      last = 0;
      requestAnimationFrame(tick);
    }
  }

  function setCutaway(on) {
    cutaway = Boolean(on);
    stage.classList.toggle("is-cutaway", cutaway);
    if (btnCut) btnCut.setAttribute("aria-pressed", String(cutaway));
  }

  if (scrub) {
    scrub.addEventListener("input", () => {
      setPlaying(false);
      u = Math.max(0, Math.min(1, Number(scrub.value) / 100));
      applyPose();
    });
  }

  if (btnPlay) {
    btnPlay.setAttribute("aria-pressed", String(playing));
    btnPlay.addEventListener("click", () => setPlaying(!playing));
  }

  if (btnOrbit) {
    btnOrbit.addEventListener("click", () => setOrbiting(!orbiting));
  }

  if (btnCut) {
    btnCut.addEventListener("click", () => setCutaway(!cutaway));
  }

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      ratingMax = Number(chip.dataset.rating) || 100;
      alloyName = chip.dataset.alloy || "Phosphor Bronze";
      updateReadouts();
    });
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "x" || e.key === "X") {
      setCutaway(!cutaway);
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      if (document.activeElement === stage) {
        e.preventDefault();
        setPlaying(false);
        u = Math.min(1, u + 0.05);
        applyPose();
      }
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      if (document.activeElement === stage) {
        e.preventDefault();
        setPlaying(false);
        u = Math.max(0, u - 0.05);
        applyPose();
      }
    }
  });

  function tick(now) {
    if (still.matches || (!playing && !orbiting)) return;
    if (!last) last = now;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock += dt;
    if (playing) {
      u = 0.5 + 0.45 * Math.sin(clock * 1.35);
    }
    if (orbiting) {
      spinAngle = (spinAngle + 28 * dt) % 360;
    }
    applyPose();
    requestAnimationFrame(tick);
  }

  applyPose();
  if (playing) requestAnimationFrame(tick);
})();
`;

const body = k.plateHtml({
  fig: "Fig 3D",
  title: "Bourdon tube pressure gauge",
  hint: "Drag to orbit 360° · press X for cutaway",
  readout: "65 psi (4.5 bar) · needle 176°",
  keys: [
    { mark: "lit", label: "Flattened 250° phosphor-bronze C-tube & tapered indicator needle" },
    { mark: "raised", label: "Hinged brass connecting link, pivoted sector gear & 6.5× central steel pinion" },
  ],
  caption:
    "How internal fluid pressure uncoils a flattened C-section bronze tube and amplifies millimetre tip travel through a sector-and-pinion gear train. Because hoop stress is twice longitudinal stress (σh/σl = 2:1), internal pressure forces the flattened oval cross-section toward a circle, straightening the 250° C-tube arc and shifting its sealed tipcap outward to drive the 270° pointer.",
  body: `<style>${out.css}\n${EXTRA_CSS}</style>${stage}${CONTROLS_HTML}`,
});

const page = k.pageHtml({
  title: "Bourdon tube pressure gauge",
  theme,
  body,
  script: turnScript() + (verify ? `window.__isoVerify = ${JSON.stringify(out.verify)};\n` : "") + LIVE_SCRIPT,
  width: 700,
});

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const name = `bourdon-pressure-gauge${verify ? "-verify" : ""}${theme === "light" ? "-light" : ""}.html`;
  writeFileSync(join(HERE, name), page);
  console.log(
    `wrote ${name} · ${(page.length / 1024).toFixed(0)} KB · ${out.report.parts} parts · ${out.report.layers
      .map((l) => `${l.name}: ${l.planar} planes, ${l.dynamic} dynamic`)
      .join(" · ")} · build ${out.report.seconds.toFixed(1)} s`,
  );
}
