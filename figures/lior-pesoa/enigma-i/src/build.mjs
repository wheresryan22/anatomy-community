import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../.skill/kit/iso-kit.mjs";
import * as G from "../../../../.skill/kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../../../../.skill/kit/tube.mjs";
import { kitScript } from "../../../../.skill/scripts/inline-kit.mjs";
import { ABC, PLUGS } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 640;
const HEIGHT = 400;

// World: x across the machine (left to right), y from the back to the operator, z up. 1 unit ≈ 1 mm.
const PLATE = { x: -26, y: -22, w: 392, d: 356, r: 10 };
const PLATE_H = 10;
const FOOT_H = 5;

const CASE = { x: 0, y: 0, w: 340, d: 280, r: 5 };
const DECK = 94; // top of the metal deck
const RIM = 6; // wooden rim above the deck
const WALL = 9;
const INNER = k.insetPlan(CASE, WALL);
const FRONT = CASE.y + CASE.d;
const SIDE = CASE.x + CASE.w;

// Rotor compartment
const TROUGH = { x0: 72, x1: 262, y0: 8, y1: 94, floor: 50 };
const AXIS = { y: 51, z: 98 };
const SPIN_R = 4.2;
const ROTOR = { wheelR: 37.5, wheelW: 5, ringR: 35, ringW: 8, bodyR: 32, bodyW: 17 };
const ROTOR_W = ROTOR.wheelW + ROTOR.ringW + ROTOR.bodyW; // 30
const GAP = 4;
const UKW = { x0: 82, x1: 104, r: 42 };
const ROTOR_X = [108, 108 + ROTOR_W + GAP, 108 + 2 * (ROTOR_W + GAP)]; // left, middle, right
const ETW = { x0: ROTOR_X[2] + ROTOR_W + GAP, w: 18, r: 31 };
const LEVER_X = ETW.x0 + ETW.w + 6;

// Lamps and keys, QWERTZU layout as on the Enigma I.
const ROWS = ["QWERTZUIO", "ASDFGHJK", "PYXCVBNML"];
const PITCH = 28;
const COL0 = 170 - PITCH * 4;
const LAMP_Y = [112, 132, 152];
const KEY_Y = [186, 212, 238];
const colX = (row, col) => COL0 + col * PITCH + (row === 1 ? PITCH / 2 : 0);
const LAMPBOARD = { x: COL0 - 16, y: 100, w: PITCH * 8 + 32, d: 64, r: 3 };

// Plugboard on the front face
const SOCK_Z = [70, 47, 24];
const SOCK_PITCH = 30;
const SOCK0 = 170 - SOCK_PITCH * 4;
const sockX = (row, col) => SOCK0 + col * SOCK_PITCH + (row === 1 ? SOCK_PITCH / 2 : 0);
const PANEL = { x0: 30, x1: 310, z0: 10, z1: 84 };
const PANEL_T = 2;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), ...k.boxCorners(CASE, 0, DECK + RIM), [170, AXIS.y, AXIS.z + ROTOR.wheelR]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 57, elevation: 33 },
);
const V = G.viewOf(P);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points, z = 0) => [...points].sort((a, b) => k.depthOf([a[0], a[1], z], P) - k.depthOf([b[0], b[1], z], P));
const poly = (points) => k.pathOf(points.map(at), true);
const front = (y) => k.sideMatrix([0, y], 0, P, "left"); // local (x, -z) on the face at y
const right = (x) => k.sideMatrix([x, 0], 0, P, "right"); // local (y, -z) on the face at x... sign per kit
const top = (x, y, z) => k.topMatrix([x, y], z, P, "x");
const flatRect = (x0, z0, x1, z1, r, steps = 5) => k.pathOf(k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r }, steps).map(([u, z]) => [u, -z]), true);
const g = (attrs, inner) => `<g ${Object.entries(attrs).map(([a, v]) => `${a}="${v}"`).join(" ")}>${inner}</g>`;

// ---------------------------------------------------------------- bench plate
function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 26))) {
    out.push(S(k.cylinder(x, y, 9, -PLATE_H - FOOT_H, 1.8, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H + 1.8, FOOT_H - 1.8, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 6), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 12);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.6, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // ruler strip along the right edge, label plate front left
  const strip = { x: PLATE.x + PLATE.w - 20, y: PLATE.y + 30, w: 8, d: PLATE.d - 60, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(strip.y + 4, strip.y + strip.d - 4, 5, 5, strip.x + strip.w - 0.8, 0.6, [-2, -3.6], P, "y");
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  const label = { x: PLATE.x + 16, y: PLATE.y + PLATE.d - 22, w: 54, d: 11, r: 1.2 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 3), { tone: "faint" }));
  out.push(L([34, 26].map((w, i) => k.lineOnTop([label.x + 5, label.y + 4 + i * 3.4], [label.x + 5 + w, label.y + 4 + i * 3.4], 0.8, P)).join(""), { tone: "lo", free: true }));
  out.push(D([at([label.x + label.w - 4, label.y + 3, 0.8]), at([label.x + label.w - 4, label.y + label.d - 3, 0.8])], { size: 0.45 }));
  return out.join("");
}

// ---------------------------------------------------------------- wooden case
function caseBody() {
  const out = [`<path class="iso-halo" d="${k.haloOf(CASE, 0, 12, P)}"/>`];
  const plinth = k.sideSeam(CASE, 10, P, 5);
  const lidLine = k.sideSeam(CASE, DECK - 8, P, 5);
  out.push(S(k.slabOf(CASE, 0, DECK + RIM, P, 5, 1.2), { tone: "mid", inner: L(plinth, { tone: "lo" }) + L(lidLine, { tone: "faint" }) }));
  // corner protectors on the two visible front corners
  for (const [x, y] of [[CASE.x + CASE.w, CASE.y + CASE.d]]) {
    const cap = { x: x - 14, y: y - 14, w: 15, d: 15, r: 5 };
    out.push(S(k.slabOf(cap, -0.01, 12, P, 5), { tone: "mid" }));
    out.push(D([at([x + 0.5, y - 7, 6]), at([x - 7, y + 0.5, 6])], { size: 0.45 }));
  }
  return out.join("");
}

// Latches on the front face and a carrying handle on the right side
function caseFittings() {
  const out = [];
  for (const x of [46, 294]) {
    const plan = { x: x - 9, y: FRONT, w: 18, d: 2, r: 1 };
    out.push(S(k.slabOf(plan, DECK - 4, 9, P, 3, 0.3), { tone: "mid" }));
    out.push(S(k.slabOf({ x: x - 4, y: FRONT + 2, w: 8, d: 3, r: 1.2 }, DECK - 1, 3.4, P, 3), { tone: "hi" }));
    out.push(D([at([x - 6.5, FRONT + 2, DECK + 2.5]), at([x + 6.5, FRONT + 2, DECK + 2.5])], { size: 0.42 }));
  }
  // right side: a framed panel and a maker's plate
  const side = k.sideMatrix([SIDE, 0], 0, P, "right");
  const sideRect = (y0, z0, y1, z1, r) => flatRect(-y1, z0, -y0, z1, r);
  out.push(g({ transform: side }, L(sideRect(16, 16, CASE.d - 16, DECK - 14, 3), { tone: "faint" }) + L(sideRect(20, 20, CASE.d - 20, DECK - 18, 2), { tone: "faint" })));
  const plateY = [196, 244], plateZ = [30, 50];
  out.push(S(k.slabOf({ x: SIDE, y: plateY[0], w: 0.8, d: plateY[1] - plateY[0], r: 1 }, plateZ[0], plateZ[1] - plateZ[0], P, 3, 0.2), { tone: "mid" }));
  out.push(g({ transform: k.sideMatrix([SIDE + 0.8, 0], 0, P, "right") }, L([[204, 44, 36], [204, 39.5, 30], [204, 35, 22]].map(([y, z, w]) => `M${-y} ${-z}H${-(y + w)}`).join(""), { tone: "lo", free: true })));
  out.push(D([[plateY[0] + 3, plateZ[0] + 3], [plateY[1] - 3, plateZ[0] + 3], [plateY[0] + 3, plateZ[1] - 3], [plateY[1] - 3, plateZ[1] - 3]].map(([y, z]) => at([SIDE + 0.8, y, z])), { size: 0.42 }));
  // handle on the right side: two bosses and a bar
  const hy = [110, 170];
  for (const y of hy) out.push(S(k.slabOf({ x: SIDE, y: y - 6, w: 3, d: 12, r: 2 }, 56, 14, P, 4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: SIDE + 3, y: hy[0] - 3, w: 4, d: hy[1] - hy[0] + 6, r: 2 }, 60, 6, P, 4, 0.4), { tone: "mid" }));
  out.push(D(hy.flatMap((y) => [at([SIDE, y - 3.5, 66]), at([SIDE, y + 3.5, 66])]), { size: 0.4 }));
  return out.join("");
}

// ---------------------------------------------------------------- plugboard
const socketList = []; // { letter, x, z }
function plugboard() {
  const out = [];
  const plan = { x: PANEL.x0, y: FRONT, w: PANEL.x1 - PANEL.x0, d: PANEL_T, r: 1 };
  out.push(S(k.slabOf(plan, PANEL.z0, PANEL.z1 - PANEL.z0, P, 3, 0.4), { tone: "mid" }));
  const face = FRONT + PANEL_T;
  const holes = [];
  const rings = [];
  const letters = [];
  ROWS.forEach((row, r) => {
    [...row].forEach((letter, c) => {
      const x = sockX(r, c);
      const z = SOCK_Z[r];
      socketList.push({ letter, x, z });
      rings.push(flatRect(x - 4.6, z - 7.6, x + 4.6, z + 5.2, 2.2));
      holes.push(`<circle cx="${x}" cy="${-(z + 1.6)}" r="1.5"/><circle cx="${x}" cy="${-(z - 4.2)}" r="1.9"/>`);
      letters.push(`<text x="${x}" y="${-(z + 7.4)}">${letter}</text>`);
    });
  });
  const screws = [[PANEL.x0 + 5, PANEL.z0 + 5], [PANEL.x1 - 5, PANEL.z0 + 5], [PANEL.x0 + 5, PANEL.z1 - 5], [PANEL.x1 - 5, PANEL.z1 - 5]];
  out.push(
    g({ transform: front(face) }, [
      L(flatRect(PANEL.x0 + 3, PANEL.z0 + 3, PANEL.x1 - 3, PANEL.z1 - 3, 2), { tone: "faint" }),
      L(rings.join(""), { tone: "lo" }),
      `<g class="en-hole">${holes.join("")}</g>`,
      `<g class="en-sock-letter">${letters.join("")}</g>`,
      ...socketList.map((s, i) => `<g class="en-sock" data-sock="${s.letter}"><path class="iso-line en-hotline" d="${flatRect(s.x - 4.6, s.z - 7.6, s.x + 4.6, s.z + 5.2, 2.2)}"/></g>`),
    ].join("")),
  );
  out.push(D(screws.map(([x, z]) => at([x, face, z])), { size: 0.5 }));
  return out.join("");
}

// Plugs and their cables, drawn last: they stand proud of the front face.
function plugs() {
  const items = [];
  const face = FRONT + PANEL_T;
  const pos = Object.fromEntries(socketList.map((s) => [s.letter, s]));
  const FRONTWARD = [0, 1, 0];
  PLUGS.forEach((pair, n) => {
    const [a, b] = [...pair].map((l) => pos[l]).sort((p, q) => q.z - p.z); // upper first
    const ends = [];
    for (const s of [a, b]) {
      const body = { x: s.x - 4.2, y: face, w: 8.4, d: 9, r: 1.6 };
      const F = G.frameAlong([s.x, face + 9, s.z - 1.3], FRONTWARD);
      const solid = S(k.slabOf(body, s.z - 7.2, 11.8, P, 3, 0.4), { tone: "hi" }) + S(G.disc(0, 5, 2.9, F, P), { tone: "mid" }) + L(G.circleOf(F, 5, 1.5, P, 16), { tone: "faint" });
      items.push({ key: k.depthOf([s.x, face + 4, s.z], P), svg: `<g class="en-p" data-plug="${s.letter}">${solid}</g>` });
      ends.push([s.x, face + 14, s.z - 1.3]);
    }
    const [p0, p1] = ends;
    const low = Math.min(p0[2], p1[2]) - 13;
    const route = G.fillet([p0, [p0[0], p0[1] + 7, p0[2] - 2], [p0[0], p0[1] + 9, low], [p1[0], p1[1] + 9, low], [p1[0], p1[1] + 7, p1[2] - 2], p1], 5, 7, { P, tube: 1.6 });
    const pieces = tubePieces(route, 1.6, P, { maxLength: 400, caps: false });
    const svg = pieces.map((piece) => tubeSvg(piece, { tone: "mid" })).join("");
    const glow = `<path class="en-flow" d="${k.pathOf(route.map(at))}"/>`;
    items.push({ key: 1e6 + n, svg: `<g class="en-p en-cable" data-cable="${pair}">${svg}${glow}</g>` });
  });
  return items.sort((p, q) => p.key - q.key).map((i) => i.svg).join("");
}

// ---------------------------------------------------------------- deck
function deckBack() {
  // rim bars behind and to the left, then the deck plate
  const out = [];
  out.push(S(k.slabOf({ x: CASE.x, y: CASE.y, w: CASE.w, d: WALL, r: 2 }, DECK, RIM, P, 3, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf({ x: CASE.x, y: CASE.y, w: WALL, d: CASE.d, r: 2 }, DECK, RIM, P, 3, 0.5), { tone: "mid" }));
  return out.join("");
}

function deckFront() {
  const out = [];
  out.push(S(k.slabOf({ x: CASE.x + CASE.w - WALL, y: CASE.y, w: WALL, d: CASE.d, r: 2 }, DECK, RIM, P, 3, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf({ x: CASE.x, y: CASE.y + CASE.d - WALL, w: CASE.w, d: WALL, r: 2 }, DECK, RIM, P, 3, 0.5), { tone: "mid" }));
  return out.join("");
}

function deckPlate() {
  const out = [];
  // the plate is flush with the rim's inner edges; lines and screws on it
  out.push(L(k.planOutline(k.insetPlan(INNER, 4), DECK, P, 3), { tone: "faint" }));
  const screws = k.corners(INNER, 8);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, DECK, P, 14)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, DECK])), { size: 0.5 }));
  return out.join("");
}

// ---------------------------------------------------------------- rotor compartment
const clipId = "en-trough";
function troughClip() {
  const { x0, x1, y0, y1 } = TROUGH;
  const up = 400;
  const A = at([x0, y1, DECK]);
  const B = at([x1, y1, DECK]);
  const C = at([x1, y0, DECK]);
  const Dd = at([x0, y0, DECK]);
  // above the deck everything shows; below it only what the opening frames
  const E = [Dd[0] + (Dd[0] - A[0]) * 3, Dd[1] + (Dd[1] - A[1]) * 3];
  const d = k.pathOf([A, B, C, [C[0], C[1] - up], [E[0], C[1] - up], E], true);
  return `<clipPath id="${clipId}"><path d="${d}"/></clipPath>`;
}

function troughWell() {
  const { x0, x1, y0, y1, floor } = TROUGH;
  const out = [];
  out.push(`<path class="en-well" data-face="floor" d="${poly([[x0, y0, floor], [x1, y0, floor], [x1, y1, floor], [x0, y1, floor]])}"/>`);
  out.push(`<path class="en-well" data-face="back" d="${poly([[x0, y0, floor], [x1, y0, floor], [x1, y0, DECK], [x0, y0, DECK]])}"/>`);
  out.push(`<path class="en-well" data-face="left" d="${poly([[x0, y0, floor], [x0, y1, floor], [x0, y1, DECK], [x0, y0, DECK]])}"/>`);
  out.push(L(k.pathOf([at([x0, y1, floor]), at([x0, y0, floor]), at([x1, y0, floor])]) + k.segment([x0, y0, floor], [x0, y0, DECK], P) + k.segment([x1, y0, floor], [x1, y0, DECK], P), { tone: "faint" }));
  return `<g clip-path="url(#${clipId})">${out.join("")}</g>`;
}

// A rotor's frame: axis +x, angle 0 straight up, angle 90° toward the operator.
const frameAt = (x) => G.frameOf([x, AXIS.y, AXIS.z], [1, 0, 0], [0, 0, 1], [0, 1, 0]);

function bearing(x, w) {
  // a bearing block standing on the trough floor, holding the spindle
  const plan = { x: x - w / 2, y: AXIS.y - 9, w, d: 18, r: 1.5 };
  return S(k.slabOf(plan, TROUGH.floor, AXIS.z - TROUGH.floor, P, 3, 0.4), { tone: "lo" }) + D([at([x, AXIS.y + 9, TROUGH.floor + 8])], { size: 0.42 });
}

function rotorStack() {
  const out = [];
  out.push(bearing(TROUGH.x0 + 5, 8));
  const spindleF = frameAt(TROUGH.x0 + 1);
  out.push(S(G.disc(0, TROUGH.x1 - TROUGH.x0 - 2, SPIN_R, spindleF, P), { tone: "mid" }));
  // reflector (UKW B): a fixed drum with a clamp lug on top
  const uF = frameAt(UKW.x0);
  out.push(
    `<g class="en-p" data-stage="ukw">` +
      S(G.disc(0, UKW.x1 - UKW.x0, UKW.r, uF, P, { bevel: 0.6 }), { tone: "mid", inner: L(G.arcOf(uF, 6, UKW.r, P), { tone: "faint" }) }) +
      L(G.circleOf(uF, UKW.x1 - UKW.x0, UKW.r - 5, P), { tone: "faint" }) +
      L(G.circleOf(uF, UKW.x1 - UKW.x0, 12, P, 32), { tone: "lo" }) +
      L(G.spokesOf(uF, UKW.x1 - UKW.x0, 12, UKW.r - 5, 6, P, { phase: 0.26 }), { tone: "faint" }) +
      D(G.dotsOf(uF, UKW.x1 - UKW.x0, UKW.r - 9, 12, P, { all: true, phase: 0.13 }), { size: 0.45 }) +
      `</g>`,
  );
  ROTOR_X.forEach((x, slot) => {
    const F = frameAt(x);
    const { wheelR, wheelW, ringR, ringW, bodyR, bodyW } = ROTOR;
    const parts = [];
    parts.push(S(G.disc(0, wheelW, wheelR, F, P, { bevel: 0.4 }), { tone: "mid" }));
    parts.push(`<g data-knurl="${slot}"></g>`);
    parts.push(S(G.disc(wheelW, wheelW + ringW, ringR, F, P), { tone: "hi" }));
    parts.push(`<g class="en-ring" data-ring="${slot}"></g>`);
    parts.push(S(G.disc(wheelW + ringW, ROTOR_W, bodyR, F, P, { bevel: 0.4 }), { tone: "mid", inner: L(G.arcOf(F, wheelW + ringW + 9, bodyR, P), { tone: "faint" }) }));
    parts.push(L(G.circleOf(F, ROTOR_W, bodyR - 4, P), { tone: "faint" }));
    parts.push(L(G.circleOf(F, ROTOR_W, 9, P, 24), { tone: "lo" }));
    parts.push(D(G.dotsOf(F, ROTOR_W, bodyR - 9, 26, P, { all: true }), { size: 0.38, tone: "lo" }));
    out.push(`<g class="en-p en-rotor" data-stage="r${slot}" data-rotor="${slot}">${parts.join("")}</g>`);
  });
  // entry wheel (ETW): a fixed plate of 26 spring contacts
  const eF = frameAt(ETW.x0);
  out.push(
    `<g class="en-p" data-stage="etw">` +
      S(G.disc(0, ETW.w, ETW.r, eF, P, { bevel: 0.5 }), { tone: "mid" }) +
      L(G.circleOf(eF, ETW.w, ETW.r - 4, P), { tone: "faint" }) +
      D(G.dotsOf(eF, ETW.w, ETW.r - 8, 26, P, { all: true }), { size: 0.4, tone: "mid" }) +
      `</g>`,
  );
  // release lever: a block on the spindle end with a thumb tab
  out.push(bearing(LEVER_X + 3, 10));
  const lF = frameAt(LEVER_X - 2);
  out.push(S(G.disc(0, 6, 9, lF, P), { tone: "mid" }));
  out.push(S(k.slabOf({ x: LEVER_X - 1, y: AXIS.y - 4, w: 6, d: 8, r: 1.4 }, AXIS.z, 34, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(LEVER_X + 2, AXIS.y, 6, AXIS.z + 34, 5, P, 24, 0.4), { tone: "hi" }));
  out.push(L(k.knurl(LEVER_X + 2, AXIS.y, 6, AXIS.z + 34.4, AXIS.z + 38.6, 28, P), { tone: "lo" }));
  return `<g clip-path="url(#${clipId})">${out.join("")}</g>`;
}

// Compartments on either side of the rotors
function sideBays() {
  const out = [];
  // battery lid on the left
  const lid = { x: INNER.x + 6, y: TROUGH.y0, w: TROUGH.x0 - INNER.x - 14, d: TROUGH.y1 - TROUGH.y0, r: 2 };
  out.push(S(k.slabOf(lid, DECK, 1.6, P, 3, 0.4), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(lid, 4), DECK + 1.6, P, 3), { tone: "faint" }));
  out.push(S(k.cylinder(lid.x + lid.w / 2, lid.y + lid.d / 2, 6, DECK + 1.6, 3, P, 24, 0.3), { tone: "mid" }));
  out.push(L(k.lineOnTop([lid.x + lid.w / 2 - 6, lid.y + lid.d / 2], [lid.x + lid.w / 2 + 6, lid.y + lid.d / 2], DECK + 4.6, P), { tone: "hi" }));
  out.push(D(k.corners(lid, 3.2).map(([x, y]) => at([x, y, DECK + 1.6])), { size: 0.45 }));
  // spare bulb holder on the right: a strip with four bulbs standing in it
  const holder = { x: LEVER_X + 20, y: TROUGH.y0 + 6, w: 20, d: TROUGH.y1 - TROUGH.y0 - 12, r: 2 };
  out.push(S(k.slabOf(holder, DECK, 5, P, 3, 0.4), { tone: "lo" }));
  const bulbs = [0, 1, 2, 3].map((i) => [holder.x + holder.w / 2, holder.y + 9 + i * ((holder.d - 18) / 3)]);
  for (const [x, y] of byDepth(bulbs)) {
    const F = G.frameOf([x, y, DECK + 5], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    out.push(S(G.disc(0, 3.2, 3.6, F, P), { tone: "mid" }));
    out.push(L(G.ribsOf(F, 0.3, 3.0, 3.6, 10, P), { tone: "lo" }));
    out.push(S(G.solidOf([[3.2, 3.2], [4.6, 4.4, 1], [6.6, 4.6, 1], [8.6, 3.6, 1], [9.6, 2, 1], [10, 0, 1]], F, P), { tone: "hi" }));
  }
  return out.join("");
}

// ---------------------------------------------------------------- lampboard
const lampList = [];
function lampboard() {
  const out = [];
  out.push(S(k.slabOf(LAMPBOARD, DECK, 2.4, P, 3, 0.5), { tone: "lo" }));
  const z = DECK + 2.4;
  const lamps = [];
  ROWS.forEach((row, r) => [...row].forEach((letter, c) => lamps.push({ letter, x: colX(r, c), y: LAMP_Y[r] })));
  for (const lamp of byDepth(lamps.map((l) => [l.x, l.y, l]), z).map((p) => p[2])) {
    lampList.push(lamp.letter);
    const { x, y, letter } = lamp;
    const bezel = L(k.ring(x, y, 10.2, z, P, 40), { tone: "lo" }) + L(k.ring(x, y, 9.2, z, P, 40), { tone: "faint" });
    const glass = S(k.cylinder(x, y, 8, z, 0.7, P, 36), { tone: "mid", crease: "none" });
    const glow = `<g class="en-glow" transform="${top(x, y, z + 0.7)}"><circle r="8" fill="url(#en-lamp)"/></g>`;
    const text = `<text class="en-lamp-letter" transform="${top(x, y, z + 0.7)}" x="0" y="2.6" font-size="7.2" text-anchor="middle">${letter}</text>`;
    out.push(`<g class="en-lamp" data-lamp="${letter}">${bezel}${glass}${glow}${text}</g>`);
  }
  // two screws per short edge of the board
  out.push(D([[LAMPBOARD.x + 5, LAMPBOARD.y + 6], [LAMPBOARD.x + 5, LAMPBOARD.y + LAMPBOARD.d - 6], [LAMPBOARD.x + LAMPBOARD.w - 5, LAMPBOARD.y + 6], [LAMPBOARD.x + LAMPBOARD.w - 5, LAMPBOARD.y + LAMPBOARD.d - 6]].map(([x, y]) => at([x, y, z])), { size: 0.45 }));
  return out.join("");
}

// ---------------------------------------------------------------- keyboard
const keyList = [];
const KEY = { capZ: 104, capH: 4, capR: 9.2, travel: 5 };
function keyboard() {
  const out = [];
  const keys = [];
  ROWS.forEach((row, r) => [...row].forEach((letter, c) => keys.push({ letter, x: colX(r, c), y: KEY_Y[r] })));
  // slots in the deck
  out.push(L(keys.map(({ x, y }) => k.planOutline({ x: x - 3.6, y: y - 7, w: 7.2, d: 14, r: 3.4 }, DECK, P, 4)).join(""), { tone: "lo" }));
  for (const key of byDepth(keys.map((kk) => [kk.x, kk.y, kk]), DECK).map((p) => p[2])) {
    const { x, y, letter } = key;
    keyList.push(letter);
    const stem = S(k.cylinder(x, y, 1.9, DECK + 5, KEY.capZ - DECK - 5, P, 16), { tone: "lo" });
    const collar = S(k.cylinder(x, y, 3.2, DECK, 4.2, P, 20, 0.2), { tone: "lo" });
    const capTop = KEY.capZ + KEY.capH;
    const cap =
      S(k.cylinder(x, y, KEY.capR, KEY.capZ, KEY.capH, P, 36, 0.4), { tone: "hi", crease: "lo" }) +
      L(k.ring(x, y, KEY.capR - 1.8, capTop, P, 36), { tone: "lo" }) +
      `<text class="en-key-letter" transform="${top(x, y, capTop)}" x="0" y="2.7" font-size="7.6" text-anchor="middle">${letter}</text>`;
    out.push(`<g class="en-key" data-key="${letter}"><g data-move>${stem}</g>${collar}<g data-move class="en-p" data-stage="key">${cap}</g></g>`);
  }
  return out.join("");
}

// ---------------------------------------------------------------- figure
const defs = `<defs>
<radialGradient id="en-lamp"><stop offset="0" stop-color="var(--en-core)"/><stop offset=".55" stop-color="var(--en-amber)"/><stop offset="1" stop-color="var(--en-amber)" stop-opacity="0"/></radialGradient>
${troughClip()}
</defs>`;

const body = [defs, plate(), caseBody(), caseFittings(), plugboard(), deckBack(), deckPlate(), troughWell(), rotorStack(), sideBays(), lampboard(), keyboard(), deckFront(), plugs()];

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "An Enigma I cipher machine in its wooden case on a bench plate, with the rotor cover off: a reflector, three rotors with knurled thumbwheels and lettered rings, and the entry wheel on one spindle at the back; a lampboard of 26 lamps; a keyboard of 26 keys; and a plugboard on the front face with five plug cables.",
  body,
});

// Ring and knurl geometry, for the live code to redraw as the rotors turn.
const RING = ROTOR_X.map((x) => ({ x0: x + ROTOR.wheelW, x1: x + ROTOR.wheelW + ROTOR.ringW, wx0: x, wx1: x + ROTOR.wheelW }));

const model = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");

const live = `
${model}
const P = ${JSON.stringify(P)};
const VIEW = ${JSON.stringify(V)};
const RING = ${JSON.stringify(RING)};
const AXIS = ${JSON.stringify(AXIS)};
const RR = ${ROTOR.ringR}, WR = ${ROTOR.wheelR};
const TRAVEL = ${KEY.travel};
const START = [0, 3, 20]; // A D U: the tour shows the middle rotor's double step

const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const status = document.querySelector("[data-status]");
const pathEl = document.querySelector("[data-path]");
const tapeIn = document.querySelector("[data-tape-in]");
const tapeOut = document.querySelector("[data-tape-out]");
const still = matchMedia("(prefers-reduced-motion: reduce)");

const keyEls = Object.fromEntries([...svg.querySelectorAll("[data-key]")].map((el) => [el.dataset.key, el]));
const lampEls = Object.fromEntries([...svg.querySelectorAll("[data-lamp]")].map((el) => [el.dataset.lamp, el]));
const sockEls = Object.fromEntries([...svg.querySelectorAll("[data-sock]")].map((el) => [el.dataset.sock, el]));
const plugEls = Object.fromEntries([...svg.querySelectorAll("[data-plug]")].map((el) => [el.dataset.plug, el]));
const cableEls = [...svg.querySelectorAll("[data-cable]")];
const stageEls = { r0: svg.querySelector('[data-stage="r0"]'), r1: svg.querySelector('[data-stage="r1"]'), r2: svg.querySelector('[data-stage="r2"]'), ukw: svg.querySelector('[data-stage="ukw"]'), etw: svg.querySelector('[data-stage="etw"]') };
const knurlEls = [0, 1, 2].map((i) => svg.querySelector('[data-knurl="' + i + '"]'));
const ringEls = [0, 1, 2].map((i) => svg.querySelector('[data-ring="' + i + '"]'));
const down = axisVector(P, [0, 0, -1]);
const ex = axisVector(P, [1, 0, 0]);

let pos = [...START];
const angle = pos.map((p) => p); // in letter steps, eased
let frame = 0, previous = 0, visible = false, clock = 0;
let touring = !still.matches, idleTimer = 0;
let current = null; // { letter, out, stages, at, hold }
const keyDepth = {};
let typedIn = "", typedOut = "";

const STAGE_T = 0.17, FIRST = 0.2;
const plugOf = plugMap();
const cableOf = (letter) => cableEls.find((el) => el.dataset.cable.includes(letter));

function ringPoint(x, r, th) { return iso([x, AXIS.y + r * Math.sin(th), AXIS.z + r * Math.cos(th)], P); }
function facing(th) { return Math.sin(th) * VIEW[1] + Math.cos(th) * VIEW[2]; }
const STEP = (Math.PI * 2) / 26;

function drawRotor(slot) {
  const a = angle[slot];
  const R = RING[slot];
  // letters on the ring: letter i sits at (i - a) steps toward the operator from the top
  let letters = "";
  for (let i = 0; i < 26; i++) {
    let d = ((i - a) % 26 + 26) % 26; if (d > 13) d -= 26;
    const th = d * STEP;
    const f = facing(th);
    if (f < 0.12) continue;
    const o = ringPoint((R.x0 + R.x1) / 2, RR, th);
    const t = [0, Math.cos(th), -Math.sin(th)];
    const q = iso([(R.x0 + R.x1) / 2 + t[0], AXIS.y + RR * Math.sin(th) + t[1], AXIS.z + RR * Math.cos(th) + t[2]], P);
    const ty = [q[0] - o[0], q[1] - o[1]];
    const alpha = Math.min(1, (f - 0.12) / 0.35);
    const hit = Math.abs(d) < 0.5;
    letters += '<text transform="matrix(' + ex[0].toFixed(3) + " " + ex[1].toFixed(3) + " " + ty[0].toFixed(3) + " " + ty[1].toFixed(3) + " " + o[0].toFixed(2) + " " + o[1].toFixed(2) + ')" y="2.1" font-size="5.6" text-anchor="middle"' + (hit ? ' data-hit=""' : "") + ' opacity="' + alpha.toFixed(2) + '">' + ABC[i] + "</text>";
    // the notch: a cut in the ring's left edge at the turnover letter
    if (ABC[i] === ROTORS[slot].notch) {
      const n0 = ringPoint(R.x0, RR, th - 0.07), n1 = ringPoint(R.x0, RR, th + 0.07), n2 = ringPoint(R.x0 + 2.4, RR, th + 0.07), n3 = ringPoint(R.x0 + 2.4, RR, th - 0.07);
      letters += '<path class="en-notch" opacity="' + alpha.toFixed(2) + '" d="M' + [n0, n3, n2, n1].map((p) => p[0].toFixed(2) + " " + p[1].toFixed(2)).join("L") + 'Z"/>';
    }
  }
  ringEls[slot].innerHTML = letters;
  // knurl: 52 ribs across the thumbwheel rim, faded toward the turn
  const buckets = ["", "", "", ""];
  for (let i = 0; i < 52; i++) {
    let th = ((i / 2 - a) * STEP) % (Math.PI * 2);
    const f = facing(th);
    if (f < 0.05) continue;
    const p0 = ringPoint(R.wx0 + 0.5, WR, th), p1 = ringPoint(R.wx1 - 0.5, WR, th);
    const b = Math.min(3, Math.floor(f * 4));
    buckets[b] += "M" + p0[0].toFixed(2) + " " + p0[1].toFixed(2) + "L" + p1[0].toFixed(2) + " " + p1[1].toFixed(2);
  }
  knurlEls[slot].innerHTML = buckets.map((d, b) => d ? '<path class="iso-line" data-tone="lo" opacity="' + (0.25 + b * 0.25) + '" d="' + d + '"/>' : "").join("");
}

function windowText() { return pos.map((p) => ABC[p]).join(""); }

function press(letter) {
  if (!keyEls[letter]) return;
  const result = { letter, ...pressModel(letter, pos) };
  pos = result.pos;
  current = { ...result, at: 0, hold: touring ? 2.6 : 2.4 };
  typedIn = (typedIn + letter).slice(-24);
  typedOut = (typedOut + result.out).slice(-24);
  tapeIn.textContent = group(typedIn);
  tapeOut.textContent = group(typedOut);
  status.textContent = letter + " encrypts to " + result.out + ". Rotors now " + windowText() + ".";
  writePath(-1);
  run();
}
const pressModel = (letter, p) => press_(letter, p);
const group = (s) => s.replace(/(.{5})/g, "$1 ").trim();

const STAGE_NAMES = ["plug", "III", "II", "I", "UKW", "I", "II", "III", "plug"];
function writePath(active) {
  if (!current) { pathEl.innerHTML = '<span class="en-dim">press a key</span>'; return; }
  const parts = [current.letter].concat(current.stages.map((s) => s.letter));
  const labels = ["key"].concat(STAGE_NAMES);
  let html = "";
  parts.forEach((letter, i) => {
    const on = i - 1 === active || (active >= 9 && i === parts.length - 1) || (i === 0 && active === -1);
    html += (i ? '<span class="en-arrow">›</span>' : "") + '<span class="en-step"' + (on ? " data-on" : "") + '><b>' + letter + "</b><i>" + labels[i] + "</i></span>";
  });
  html += '<span class="en-arrow">›</span><span class="en-step"' + (active >= 9 ? " data-on" : "") + '><b>' + current.out + "</b><i>lamp</i></span>";
  pathEl.innerHTML = html;
}

let lastActive = -2;
function lightUp() {
  const on = new Set();
  let active = -2, lampOn = false, keyDown = false;
  if (current) {
    const t = current.at;
    keyDown = t < current.hold;
    if (keyDown) {
      active = t < FIRST ? -1 : Math.min(9, Math.floor((t - FIRST) / STAGE_T));
      if (active >= 0 && active <= 8) {
        const s = current.stages[active];
        if (s.part === "plug") {
          const letter = active === 0 ? current.letter : current.out;
          on.add("sock:" + letter);
          if (plugOf[ABC.indexOf(letter)] !== letter) on.add("cable:" + letter);
        } else on.add(s.part);
        if (active === 0 || active === 8) on.add("etw");
      }
      lampOn = active >= 9;
    }
  }
  for (const [name, el] of Object.entries(stageEls)) el.toggleAttribute("data-on", on.has(name));
  for (const [letter, el] of Object.entries(sockEls)) el.toggleAttribute("data-on", on.has("sock:" + letter));
  for (const el of cableEls) el.toggleAttribute("data-on", [...el.dataset.cable].some((l) => on.has("cable:" + l)));
  for (const [letter, el] of Object.entries(plugEls)) el.toggleAttribute("data-on", on.has("sock:" + letter));
  for (const [letter, el] of Object.entries(lampEls)) el.toggleAttribute("data-on", lampOn && current && current.out === letter);
  if (active !== lastActive) { lastActive = active; if (current) writePath(active); }
  const text = current ? current.letter + " → " + (lampOn || !keyDown ? current.out : "…") + " · rotors " + windowText() : "rotors " + windowText();
  if (readout.textContent !== text) readout.textContent = text;
  return keyDown;
}

const TOUR = "WETTERBERICHT";
let tourAt = 0, tourWait = 1.2;
function tourStep(dt) {
  if (current && current.at < current.hold + 0.25) return;
  tourWait -= dt;
  if (tourWait > 0) return;
  press(TOUR[tourAt]);
  tourAt++;
  if (tourAt >= TOUR.length) { tourAt = 0; tourWait = 3.2; pos = [...START]; }
  else tourWait = 0.15;
}

function tick(now) {
  const dt = previous ? Math.min((now - previous) / 1000, 1 / 30) : 1 / 60;
  previous = now;
  const calm = still.matches;
  clock += dt;
  if (touring) tourStep(dt);
  if (current) current.at += dt;
  // rotors: ease each toward its letter, always forward
  let moving = false;
  for (let s = 0; s < 3; s++) {
    let target = pos[s];
    while (target < angle[s] - 13) target += 26;
    while (target > angle[s] + 13) target -= 26;
    const next = calm ? target : angle[s] + (target - angle[s]) * (1 - Math.exp(-dt / 0.045));
    const settled = Math.abs(target - next) < 0.002;
    const value = settled ? target : next;
    if (value !== angle[s] || settled !== true) { angle[s] = ((value % 26) + 26) % 26; drawRotor(s); }
    if (!settled) moving = true;
  }
  // keys
  let keysMoving = false;
  for (const [letter, el] of Object.entries(keyEls)) {
    const want = current && current.letter === letter && current.at < current.hold ? TRAVEL : 0;
    const was = keyDepth[letter] || 0;
    if (!want && !was) continue;
    let d = calm ? want : was + (want - was) * (1 - Math.exp(-dt / (want ? 0.03 : 0.06)));
    if (Math.abs(want - d) < 0.01) d = want;
    keyDepth[letter] = d;
    const tr = "translate(" + (down[0] * d).toFixed(2) + " " + (down[1] * d).toFixed(2) + ")";
    for (const m of el.querySelectorAll("[data-move]")) m.setAttribute("transform", tr);
    el.toggleAttribute("data-down", d > TRAVEL * 0.6);
    if (d !== want) keysMoving = true;
  }
  const busy = lightUp();
  const keep = touring || moving || keysMoving || busy || (current && current.at < current.hold + 0.3);
  frame = visible && keep ? requestAnimationFrame(tick) : 0;
}
function run() { if (!frame && visible) { previous = 0; frame = requestAnimationFrame(tick); } }
function takeOver() {
  if (touring) { touring = false; pos = [...START]; typedIn = typedOut = ""; tapeIn.textContent = tapeOut.textContent = ""; current = null; }
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { if (still.matches) return; touring = true; tourAt = 0; tourWait = 1.2; pos = [...START]; typedIn = typedOut = ""; run(); }, 12000);
}
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.key === "Escape") { event.preventDefault(); takeOver(); pos = [...START]; current = null; typedIn = typedOut = ""; tapeIn.textContent = tapeOut.textContent = ""; writePath(-1); status.textContent = "Reset to " + windowText() + "."; run(); return; }
  const letter = event.key.length === 1 ? event.key.toUpperCase() : "";
  if (keyEls[letter]) { event.preventDefault(); if (event.repeat) return; takeOver(); press(letter); }
});
svg.addEventListener("click", (event) => {
  const key = event.target.closest("[data-key]");
  if (key) { takeOver(); press(key.dataset.key); stage.focus({ preventScroll: true }); return; }
  const rotor = event.target.closest("[data-rotor]");
  if (rotor) { takeOver(); const s = Number(rotor.dataset.rotor); pos[s] = (pos[s] + 1) % 26; current = null; writePath(-1); status.textContent = "Rotors set to " + windowText() + "."; stage.focus({ preventScroll: true }); run(); }
});
for (let s = 0; s < 3; s++) drawRotor(s);
writePath(-1);
lightUp();
`.replace("function press(letter, pos, pairs = PLUGS)", "function press_(letter, pos, pairs = PLUGS)");

const css = `<style>
.iso{--en-amber:#ffb238;--en-core:#fff4d6;--en-well:#0c0c0c;--en-hot:#ffb238;--en-hot-top:#4a3412;--en-hot-shade:#33240c}
.iso[data-theme="light"]{--en-amber:#f29a12;--en-core:#ffe9b0;--en-well:#d6d6d2;--en-hot:#d97a00;--en-hot-top:#ffe7b8;--en-hot-shade:#f8d48f}
.en-well{fill:var(--en-well);stroke:none}
.en-well[data-face="back"]{fill:var(--anatomy-shade-1)}
.en-well[data-face="left"]{fill:var(--anatomy-shade-0)}
.en-hole circle{fill:var(--anatomy-shade-0);stroke:var(--anatomy-lo);stroke-width:.5px;vector-effect:non-scaling-stroke}
.en-sock-letter text,.en-key-letter,.en-lamp-letter,.en-ring text{font-family:var(--anatomy-mono);font-weight:600}
.en-sock-letter text{fill:var(--anatomy-mid);font-size:4.4px;text-anchor:middle}
.en-key-letter{fill:var(--anatomy-hi)}
.en-lamp-letter{fill:var(--anatomy-lo);transition:fill .25s var(--anatomy-ease)}
.en-ring text{fill:var(--anatomy-mid)}
.en-ring text[data-hit]{fill:var(--anatomy-lit)}
.en-notch{fill:var(--anatomy-shade-0);stroke:var(--anatomy-lo);stroke-width:.4px;vector-effect:non-scaling-stroke}
.en-hotline{stroke:var(--en-hot);stroke-width:1.2px}
.en-sock{opacity:0;transition:opacity .2s var(--anatomy-ease)}
.en-sock[data-on]{opacity:1}
.en-glow{opacity:0;transition:opacity .35s var(--anatomy-ease)}
.en-lamp[data-on] .en-glow{opacity:1}
.en-lamp[data-on] .en-lamp-letter{fill:#2a1600}
.en-flow{fill:none;stroke:var(--en-hot);stroke-width:1.2px;vector-effect:non-scaling-stroke;stroke-dasharray:2 5;opacity:0;transition:opacity .2s}
.en-cable[data-on] .en-flow{opacity:1;animation:iso-flow 900ms linear infinite}
.en-p .iso-edge,.en-p .iso-top,.en-p .iso-shade{transition:stroke .2s var(--anatomy-ease),fill .2s var(--anatomy-ease)}
.en-p[data-on] .iso-solid>.iso-edge,.en-key[data-down] .en-p .iso-solid>.iso-edge{stroke:var(--en-hot);stroke-width:1.1px}
.en-p[data-on] .iso-solid>.iso-top,.en-key[data-down] .en-p .iso-solid>.iso-top{fill:var(--en-hot-top)}
.en-p[data-on] .iso-solid>.iso-shade,.en-key[data-down] .en-p .iso-solid>.iso-shade{fill:var(--en-hot-shade)}
.en-p[data-on] .iso-solid[data-seamless]>.iso-shade{stroke:var(--en-hot-shade)}
.en-p[data-on] .iso-solid[data-seamless]>.iso-top{stroke:var(--en-hot-top)}
.en-key,.en-rotor{cursor:pointer}
.en-live{display:grid;gap:6px;margin:0 0 14px;font-family:var(--anatomy-mono);font-size:11.5px;color:var(--anatomy-text)}
.en-path{display:flex;flex-wrap:wrap;align-items:flex-end;gap:2px 4px;min-height:34px}
.en-step{display:inline-grid;justify-items:center;padding:2px 3px;border-radius:3px;transition:background .2s,color .2s}
.en-step b{font-weight:600;font-size:13px;color:var(--anatomy-strong)}
.en-step i{font-style:normal;font-size:9px;color:var(--anatomy-muted);letter-spacing:.06em;text-transform:uppercase}
.en-step[data-on]{background:var(--en-hot)}
.en-step[data-on] b,.en-step[data-on] i{color:var(--anatomy-card)}
.en-arrow{color:var(--anatomy-muted);padding-bottom:12px}
.en-dim{color:var(--anatomy-muted)}
.en-tape{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;letter-spacing:.12em}
.en-tape span:nth-child(odd){color:var(--anatomy-muted);letter-spacing:.06em}
.en-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.iso-stage{touch-action:pan-y}
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
@media (prefers-reduced-motion:reduce){.en-cable[data-on] .en-flow{animation:none}}
</style>`;

const liveHtml = `<div class="en-live"><div class="en-path" data-path aria-hidden="true"></div><div class="en-tape"><span>in</span><span data-tape-in></span><span>out</span><span data-tape-out></span></div></div>`;

const page =
  css +
  k
    .plateHtml({
      fig: "Fig 1",
      title: "Enigma I",
      hint: "Type · click a rotor",
      readout: "rotors ADU",
      keys: [
        { mark: "lit", label: "The current's path (amber), lit stage by stage: plug, rotors III II I, reflector, back, plug, lamp" },
        { mark: "raised", label: "Three rotors on one spindle; the right one steps on every key" },
        { mark: "edge", label: "Five plug cables swap ten letters before and after the rotors" },
      ],
      caption:
        "An Enigma I with rotors I, II and III, reflector B and rings at A. Pressing a key first steps the right rotor; at its notch it carries the middle one, and the middle rotor also steps itself and the left one when it reaches its own notch (the double step, shown by the tour starting at ADU). Then the current runs through the plugboard, the entry wheel, rotors III, II and I, turns in the reflector, comes back through I, II and III and the plugboard, and lights a lamp. A letter never lights its own lamp, and pressing the cipher letter at the same rotor setting lights the original: the machine is its own inverse.",
      body: `<div class="iso-stage" tabindex="0" role="group" aria-label="Enigma machine. Type letters to encrypt them; click a rotor to step it; Escape resets to ADU.">${svg}<span class="en-sr" role="status" aria-live="polite" data-status></span></div>`,
    })
    .replace('<figcaption class="iso-legend">', `<figcaption class="iso-legend">${liveHtml}`);

const name = theme === "light" ? "enigma-light.html" : "enigma.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "Enigma I", theme, body: page, script: kitScript() + live, width: 720 }));
console.log("wrote", name);
