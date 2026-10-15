// Dimensions of the burner rig, in mm, shared by the section view, the ortho view and the page.
// World axes: x along the burner tube (knob at −x, head at +x), y across, z up. The burner's
// centre plane is y = 0; the section view removes the y > 0 half and looks at the cut from +y.
// No imports: the build inlines this file into the page with `export ` stripped.

export const ZT = 90; // tube axis height above the base top

export const KNOB = { face: -252, back: -228, r: 22, skirt: 24, fin: [-258, -252], finR: 17, finT: 5 };
export const PANEL = { x0: -224, x1: -221, z0: 54, z1: 136, y: 46 };
export const STEM = { x0: -246, x1: -186, r: 3 };
export const SWITCH = { x0: -217, x1: -205, r: 10 };
export const BONNET = { x0: -200, x1: -192, r: 8 };
export const VALVE = { x0: -192, x1: -160, r: 12.5, plug: [-190, -166], plugR: [8.2, 6.6], port: -178, portR: 2.2 };
export const MANIFOLD = { x: -178, z: 121, r: 6.4, wall: 1.1, y0: -40, y1: 52 };
export const NECK = { x: -178, r: 4, bore: 2 };
export const NOZZLE = { x0: -160, x1: -150, r: 4.5, bore: 1.5 };
export const HOOD = { x0: -150, x1: -143, r: 6, tip: -138.4, tipR: [4, 2.2], orifice: 0.725 };

// burner tube: collar (air shutter seat) then bell, throat, diffuser and a straight run into the head plenum
export const TUBE = { x0: -140, plate: -138.5, collarEnd: -104, window: [-135, -122], end: 48.2, wall: 1.6, collarR: 16.6 };
export const SLEEVE = { len: 14, rIn: 16.8, rOut: 18.4 };
export const sleeveAt = (shutter) => TUBE.window[0] + (TUBE.window[1] - TUBE.window[0]) * shutter; // sleeve's −x end
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)));
// inner radius of the tube along x (the gas path), and its derivative
export function tubeIn(x) {
  if (x < -110) return 15;
  if (x < -92) return lerp(15, 8, ease((x + 110) / 18));
  if (x < -82) return 8;
  if (x < -10) return lerp(8, 12, (x + 82) / 72);
  return 12;
}
export function tubeOut(x) {
  if (x <= TUBE.collarEnd) return TUBE.collarR;
  return tubeIn(x) + TUBE.wall;
}

// burner head on a vertical axis at x = 60: [z, rOut, rIn] stations
export const HEAD = { x: 60, bottom: 70, plate: 73, plenumTop: 106, crown0: 122, crown1: 140, rCrown: 34, rPlenum: 18, wall: 2.5 };
export const PORTS = { n: 28, z0: 134.5, z1: 138.5, w: 1.6, zMid: 136.5 };
export const CAP = { z0: 140, z1: 143, top: 146.5, r: 36 };
const flareT = (z) => (z - HEAD.plenumTop) / (HEAD.crown0 - HEAD.plenumTop);
export function headOut(z) {
  if (z < HEAD.plenumTop) return HEAD.rPlenum;
  if (z < HEAD.crown0) return HEAD.rPlenum + (HEAD.rCrown - HEAD.rPlenum) * Math.sin((Math.PI / 2) * flareT(z));
  return HEAD.rCrown;
}
export function headIn(z) {
  if (z < HEAD.plate) return 0;
  if (z < HEAD.crown0) return headOut(z) - HEAD.wall;
  return HEAD.rCrown - 3;
}
// the cap's outer profile: a flat rim then a shallow dome
export function capR(z) {
  if (z <= CAP.z1) return CAP.r;
  const t = (z - CAP.z1) / (CAP.top - CAP.z1);
  return CAP.r * Math.sqrt(Math.max(0, 1 - t * t));
}

// cooktop sheet and drip bowl round the head
export const COOKTOP = { z0: 116, z1: 118, x0: -40, x1: 176, y0: -104, y1: 104 };
export const BOWL = { rOuter: 74, rInner: 52, zLow: 110, t: 1.2 };

// igniter electrode just behind the cut plane on the −x side of the head, its tip at the port at 180°
export const ELECTRODE = { angle: 184, rIns: 44, rTip: 37.6, z0: 94, z1: 126, insR: 3.2, wireR: 0.6, tipZ: PORTS.zMid };

// base and stands
export const BASE = { x: -290, y: -112, w: 476, d: 196, r: 8, z: -10 };
export const MODULE = { x: -74, y: -88, w: 52, d: 32, h: 24 };
export const REG = { x: -178, y: 52, z0: 30, z1: 84, r: 13 };
export const POSTS = {
  manifold: { x: -178, y: -40 },
  cradle: { x: -40, top: ZT - 15.6 },
  head: { x: 60 },
  cooktop: [[0, -98], [168, -98]],
};

export const HEAD_AXIS = [HEAD.x, 0];
export const polar = (deg, r, z) => [HEAD.x + r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180), z];
export const DETENT_MARKS = { max: 270 };
