// TLS Inspection as a bench instrument: a client terminal, a firewall inspection
// station and a server on one bench, joined by two carriage tracks (two TLS tunnels).
// Certificates are cards with an embossed seal; a certificate is trusted when its seal
// fits a socket in the receiver's trust store. node build.mjs [--dark]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../.skill/kit/iso-kit.mjs";
import { kitScript, glScript } from "../../../../.skill/scripts/inline-kit.mjs";
import { glCamera } from "../../../../.skill/kit/gl.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--dark") ? "dark" : "light"; // --light is the default

const W = 820;
const H = 520;

// ---------- world ----------
const PLATE = { x: -236, y: -86, w: 472, d: 138, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;

const RAIL_Y = [-11, 7];
const RAIL_A = [-158, -48];
const RAIL_B = [48, 158];
const DOCK = { aFw: -70, aCl: -132, bFw: 70, bSv: 132 };

const DECK = { x: -22, y: -15, w: 44, d: 30, r: 2 };
const DECK_Z = 3;
const DECK_TOP = 9;
const BODY_TOP = 19;
const LID_H = 3;
const LID_TRAVEL = 18;
const CRADLE_TOP = 12;
const CARD = { w: 14, d: 18, h: 1.2 };
const PAY = { w: 12, d: 12, h: 1 };

const TABLE = { x: -46, y: -32, w: 92, d: 62, r: 3 };
const TABLE_TOP = 12;
const MAG = { cx: -34, top: 17.1 };
const DIE = { cx: -14, top: 19 };
const TRAY = { x: -4, y: -11, w: 24, d: 22, r: 1.5 };
const TRAY_TOP = 13;
const SCAN_PARK = 25;
const BIN = { x: 29, y: -9.5, w: 15, d: 19, r: 1 };
const BIN_TOP = 19.5;
const BIN_FLOOR = 13.4;

const APPL = { x: -56, y: -82, w: 112, d: 38, r: 2 };
const APPL_Z = 2;
const APPL_TOP = 40;
const FACE_Y = APPL.y + APPL.d;
const LEDS = [9, 19, 29].map((x) => [x, 27]);

const COLUMN_X = [-104, 104];
const COLUMN_Y = -52;
const BEAM_Z = 92;
const BEAM = { x: -112, y: -58, w: 224, d: 12, r: 1.5 };
const ROD_TOP = 92;
const TRAVEL_Z = 44;

const TERM = { x: -234, y: -72, w: 76, d: 40, r: 3 };
const TERM_TOP = 70;
const TERM_FRONT = TERM.y + TERM.d;
const SCREEN = { x0: -228, x1: -164, z0: 14, z1: 64 };

const STORE = { x: -230, y: 12, w: 68, d: 24, r: 2 };
const STORE_H = 4;
const SOCKETS_CL = [
  { x: -217, kind: "circle" },
  { x: -201, kind: "triangle" },
  { x: -185, kind: "square" },
];
const LAMP = [-168, 24];

const FW_STORE = { x: -44, y: 18, w: 42, d: 10, r: 1.5 };
const FW_STORE_TOP = 13.6;
const SOCKETS_FW = [
  { x: -36, kind: "circle" },
  { x: -23, kind: "triangle" },
  { x: -10, kind: "diamond" },
];

const SERVER = { x: 166, y: -72, w: 58, d: 52, r: 2 };
const SERVER_TOP = 80;
const SERVER_FRONT = SERVER.y + SERVER.d;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [BEAM.x, BEAM.y, BEAM_Z + 14], [BEAM.x + BEAM.w, BEAM.y, BEAM_Z + 14], ...k.boxCorners(SERVER, 0, SERVER_TOP + 3), ...k.boxCorners(TERM, 0, TERM_TOP + 2)],
  W,
  H,
  { pad: 22, azimuth: 52 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const planeY = (y) => k.sideMatrix([0, y], 0, P, "left");
const plan = (cx, cy, w, d, r = 1) => ({ x: cx - w / 2, y: cy - d / 2, w, d, r });
const flat = (x0, z0, x1, z1, r, steps = 6) => k.pathOf(k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r }, steps).map(([u, z]) => [u, -z]), true);
const sideSeam = (p, z, steps = 4) => L(k.sideSeam(p, z, P, steps), { tone: "faint" });
const fmt = (n) => Number(n.toFixed(2));

// seal and socket outlines on a horizontal face
const shapeRing = (kind, cx, cy, s) => {
  if (kind === "circle") return k.circleRing(cx, cy, s * 0.55, 28);
  if (kind === "square") return [[cx - s / 2, cy - s / 2], [cx + s / 2, cy - s / 2], [cx + s / 2, cy + s / 2], [cx - s / 2, cy + s / 2]];
  if (kind === "triangle") return [[cx, cy - s * 0.58], [cx + s * 0.55, cy + s * 0.42], [cx - s * 0.55, cy + s * 0.42]];
  return [[cx, cy - s * 0.62], [cx + s * 0.62, cy], [cx, cy + s * 0.62], [cx - s * 0.62, cy]];
};

// ---------- bench ----------
function bench() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 24))) {
    out.push(S(k.cylinder(x, y, 8, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 6, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: sideSeam(PLATE, -4, 8) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(k.pointsAt(screws.map(([x, y]) => [x, y, 0]), P), { size: 0.55 }));
  // ruler strip along the front edge
  const strip = { x: -160, y: PLATE.y + PLATE.d - 14, w: 320, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.6, 0.6, [2, 3.8], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D(k.pointsAt([[strip.x + 2, strip.y + 3.5, 0.6], [strip.x + strip.w - 2, strip.y + 3.5, 0.6]], P), { size: 0.45 }));
  // label plate
  const label = { x: 174, y: 32, w: 44, d: 12, r: 1.2 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 3), { tone: "faint" }));
  out.push(L([34, 26, 18].map((w, i) => k.lineOnTop([label.x + 4, label.y + 3.6 + i * 2.8], [label.x + 4 + w, label.y + 3.6 + i * 2.8], 0.8, P)).join(""), { tone: "lo", free: true }));
  out.push(D(k.pointsAt([[label.x + label.w - 3.4, label.y + 3.4, 0.8], [label.x + label.w - 3.4, label.y + label.d - 3.4, 0.8]], P), { size: 0.45 }));
  return out.join("");
}

// ---------- hello pulses travel along the track bed ----------
const WIRE_A = [[RAIL_A[0] - 2, -2, 0.9], [RAIL_A[1] + 2, -2, 0.9]];
const WIRE_B = [[RAIL_B[0] - 2, -2, 0.9], [RAIL_B[1] + 2, -2, 0.9]].reverse();
const wirePath = (route) => k.pathOf(route.map(at));
const lengthOf = (route) => route.map(at).reduce((sum, p, i, all) => (i ? sum + Math.hypot(p[0] - all[i - 1][0], p[1] - all[i - 1][1]) : 0), 0);
function wires() {
  return [WIRE_A, WIRE_B].map((route, i) => `<path class="tls-pulse" data-part="pulse${i ? "B" : "A"}" data-free="" d="${wirePath(route)}" style="stroke-dasharray:10 ${Math.round(lengthOf(route) + 40)};stroke-dashoffset:10"/>`).join("");
}

// ---------- rails ----------
function rails() {
  const out = [];
  for (const [x0, x1] of [RAIL_A, RAIL_B]) {
    // sleepers under the rails
    for (let x = x0 + 6; x < x1 - 2; x += 19) out.push(S(k.slabOf({ x, y: -16, w: 4, d: 30, r: 0.6 }, 0, 0.8, P, 2), { tone: "lo", crease: "none" }));
    for (const y of RAIL_Y) {
      out.push(S(k.slabOf({ x: x0, y, w: x1 - x0, d: 4, r: 1 }, 0.8, 2.6, P, 3, 0.4), { tone: "mid" }));
      out.push(D(k.pointsAt([x0 + 4, x1 - 4].map((x) => [x, y + 2, 3.4]), P), { size: 0.4 }));
    }
    for (const x of [x0 - 5, x1]) {
      out.push(S(k.slabOf({ x, y: -16, w: 5, d: 30, r: 1.2 }, 0, 7, P, 3, 0.5), { tone: "mid" }));
      out.push(D(k.pointsAt([[x + 2.5, -12, 7], [x + 2.5, 11, 7]], P), { size: 0.45 }));
    }
  }
  return out.join("");
}

// ---------- carriage with a lockbox and a card cradle ----------
// side = -1: box on the -x end (carriage A, lid slides -x); side = +1: mirror (carriage B)
function carriageBody(side, key) {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(DECK, 3), DECK_Z, 0.1, P)}" style="filter:blur(4px)"/>`];
  // rail shoes
  for (const y of RAIL_Y) for (const x of [-18, 10]) out.push(S(k.slabOf({ x, y: y - 0.5, w: 8, d: 5, r: 0.8 }, 2.6, DECK_Z - 2.6, P, 2), { tone: "lo", crease: "none" }));
  out.push(S(k.slabOf(DECK, DECK_Z, DECK_TOP - DECK_Z, P, 4, 0.6), { tone: "mid", inner: sideSeam(DECK, 6, 4) }));
  out.push(D(k.pointsAt([-16, -8, 8, 16].map((x) => [x, DECK.y + DECK.d - 2.4, DECK_TOP]), P), { size: 0.4, tone: "lo" }));
  // corner bushings
  for (const [x, y] of [[-20, -14.5], [12, -14.5], [-20, 10.5], [12, 10.5]]) {
    out.push(S(k.slabOf({ x, y, w: 8, d: 4, r: 0.8 }, DECK_TOP, 2.4, P, 2, 0.3), { tone: "mid" }));
    out.push(D([at([x + 4, y + 2, DECK_TOP + 2.4])], { size: 0.4 }));
  }
  // handle on the near face
  const hx = side * -14;
  out.push(S(k.slabOf({ x: hx - 1.5, y: DECK.y + DECK.d - 0.5, w: 3, d: 3, r: 0.8 }, DECK_Z + 1, 3, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(hx, DECK.y + DECK.d + 3.4, 2.6, DECK_Z + 0.2, 5, P, 20), { tone: "mid" }));
  out.push(L(k.knurl(hx, DECK.y + DECK.d + 3.4, 2.6, DECK_Z + 0.2, DECK_Z + 5.2, 16, P), { tone: "lo" }));
  // box body
  const bx = side < 0 ? -19 : 3;
  const body = { x: bx, y: -8, w: 16, d: 16, r: 1.5 };
  out.push(S(k.slabOf(body, DECK_TOP, BODY_TOP - DECK_TOP, P, 4, 0.5), { tone: "hi", crease: "lo", inner: sideSeam(body, DECK_TOP + 3, 4) }));
  out.push(L(k.planOutline(k.insetPlan(body, 2), BODY_TOP, P, 3), { tone: "faint" }));
  // lid guide rails: telescopic slides on both sides of the body
  const g0 = side < 0 ? bx - LID_TRAVEL : bx;
  for (const y of [-9.2, 8]) {
    out.push(S(k.slabOf({ x: g0, y, w: 16 + LID_TRAVEL, d: 1.2, r: 0.4 }, BODY_TOP - 2, 2, P, 2), { tone: "mid", crease: "none" }));
  }
  const brace = side < 0 ? DECK.x - 1 : DECK.x + DECK.w - 1;
  for (const y of [-9.2, 8]) out.push(S(k.slabOf({ x: brace - 0.4, y, w: 2.8, d: 1.2, r: 0.3 }, DECK_TOP, BODY_TOP - 2 - DECK_TOP, P, 2), { tone: "lo", crease: "none" }));
  // card cradle
  const cx = side < 0 ? 10 : -10;
  const cradle = plan(cx, 0, 18, 21, 1);
  out.push(S(k.slabOf(cradle, DECK_TOP, CRADLE_TOP - DECK_TOP, P, 3, 0.4), { tone: "mid" }));
  out.push(L(k.planOutline(plan(cx, 0, CARD.w + 1.2, CARD.d + 1.2, 1.2), CRADLE_TOP, P, 3), { tone: "faint" }));
  out.push(D(k.pointsAt([[cx - 7.8, -9.6, CRADLE_TOP], [cx + 7.8, -9.6, CRADLE_TOP]], P), { size: 0.4 }));
  return out.join("");
}

function lid(side, key) {
  const bx = side < 0 ? -19 : 3;
  const p = { x: bx, y: -8, w: 16, d: 16, r: 1.5 };
  const out = [];
  out.push(S(k.slabOf(p, BODY_TOP, LID_H, P, 4, 0.5), { tone: "hi", crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(p, 1.8), BODY_TOP + LID_H, P, 3), { tone: "faint" }));
  // padlock knob and keyway
  const kx = bx + 8;
  out.push(S(k.cylinder(kx, -2, 2.6, BODY_TOP + LID_H, 1.6, P, 24), { tone: "mid" }));
  out.push(L(k.knurl(kx, -2, 2.6, BODY_TOP + LID_H, BODY_TOP + LID_H + 1.6, 18, P), { tone: "lo" }));
  out.push(L(k.lineOnTop([kx, -3.4], [kx, -0.6], BODY_TOP + LID_H + 1.6, P), { tone: "hi" }));
  out.push(k.faceTextSvg(k.topMatrix([kx, 4.6], BODY_TOP + LID_H, P, "x"), key, { size: 3.4, tone: "mid", anchor: "middle" }));
  // pull tab on the sliding end
  const tx = side < 0 ? bx - 1.6 : bx + 16;
  out.push(S(k.slabOf({ x: tx, y: -3, w: 1.6, d: 6, r: 0.5 }, BODY_TOP + 0.6, 1.8, P, 2), { tone: "mid", crease: "none" }));
  return out.join("");
}

// a certificate card built at the origin (centre 0,0; bottom z 0)
function card({ seal, sealPart = false }) {
  const out = [];
  const p = plan(0, 0, CARD.w, CARD.d, 1);
  out.push(S(k.slabOf(p, 0, CARD.h, P, 3, 0.3), { tone: "hi", crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(p, 1.2), CARD.h, P, 3), { tone: "faint" }));
  // printed fields: subject and issuer
  out.push(L([10, 7, 9].map((w, i) => k.lineOnTop([-5, -6 + i * 2], [-5 + w, -6 + i * 2], CARD.h, P)).join(""), { tone: "lo", free: true }));
  const z = CARD.h;
  const sealSvg =
    seal === "circle"
      ? S(k.cylinder(0, 4, 2.6, z, 0.7, P, 28), { tone: "hi", crease: "lo" }) + L(k.ring(0, 4, 1.5, z + 0.7, P, 20), { tone: "faint" })
      : S(k.slabOf(plan(0, 4, 4.6, 4.6, 0.4), z, 0.7, P, 2), { tone: "hi", crease: "lo" }) + L(k.planOutline(plan(0, 4, 2.6, 2.6, 0.2), z + 0.7, P, 2), { tone: "faint" });
  out.push(sealPart ? `<g data-part="seal" style="opacity:0">${sealSvg}</g>` : sealSvg);
  return out.join("");
}

function payload() {
  const out = [];
  const p = plan(0, 0, PAY.w, PAY.d, 0.8);
  out.push(S(k.slabOf(p, 0, PAY.h, P, 3, 0.3), { tone: "hi", lit: true, crease: "lo" }));
  out.push(L([8, 6, 8, 5].map((w, i) => k.lineOnTop([-4, -4 + i * 2.2], [-4 + w, -4 + i * 2.2], PAY.h, P)).join(""), { tone: "mid", free: true }));
  out.push(`<g class="tls-mal">${D([at([3.6, 3.6, PAY.h])], { size: 1.3, tone: "hi" })}</g>`);
  return out.join("");
}

// ---------- client terminal ----------
let clips = 0;
function recess({ x0, x1, z0, z1, r, depth }, y, back = "", backClass = "tls-glass") {
  const id = `tls-clip-${clips++}`;
  const ring = k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r }, 6);
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const { sinA } = k.cameraOf(P);
  const tops = [];
  const sides = [[], [], [], []];
  ring.forEach(([ax, az], index) => {
    const [bx, bz] = ring[(index + 1) % ring.length];
    const length = Math.hypot(bx - ax, bz - az) || 1;
    let [nx, nz] = [(bz - az) / length, -(bx - ax) / length];
    if (nx * (cx - (ax + bx) / 2) + nz * (cz - (az + bz) / 2) < 0) [nx, nz] = [-nx, -nz];
    if (nx <= 0 && nz <= 0) return;
    const quad = k.pathOf([at([ax, y, az]), at([bx, y, bz]), at([bx, y - depth, bz]), at([ax, y - depth, az])], true);
    if (nz >= nx) tops.push(quad);
    else sides[Math.min(3, Math.max(0, Math.floor(((nx * -sinA + 1) / 2) * 4)))].push(quad);
  });
  const shape = flat(x0, z0, x1, z1, r);
  return [
    `<clipPath id="${id}"><path transform="${planeY(y)}" d="${shape}"/></clipPath>`,
    `<g clip-path="url(#${id})">`,
    `<path class="iso-top" d="${tops.join("")}"/>`,
    ...sides.map((d, shade) => (d.length ? `<path class="iso-shade" data-shade="${shade}" d="${d.join("")}"/>` : "")),
    `<g transform="${planeY(y - depth)}"><path class="${backClass}" d="${shape}"/>${back}<path class="iso-line" data-tone="faint" d="${shape}"/></g>`,
    `</g>`,
    `<g transform="${planeY(y)}"><path class="iso-line" data-tone="lo" d="${shape}"/></g>`,
  ].join("");
}

const lockIcon = (x, z, s = 1) =>
  `<path class="tls-ink" d="M${fmt(x - 1.3 * s)} ${fmt(-z)}h${fmt(2.6 * s)}v${fmt(-2.2 * s)}h${fmt(-2.6 * s)}Z"/><path class="tls-ink-line" d="M${fmt(x - 0.8 * s)} ${fmt(-z - 2.2 * s)}v${fmt(-0.8 * s)}a${fmt(0.8 * s)} ${fmt(0.8 * s)} 0 0 1 ${fmt(1.6 * s)} 0v${fmt(0.8 * s)}"/>`;

function clientScreen() {
  const { x0, x1, z0, z1 } = SCREEN;
  const t = (x, z, text, cls = "tls-text", size = 2.9) => `<text class="${cls}" x="${fmt(x)}" y="${fmt(-z)}" font-size="${size}">${text}</text>`;
  const bar = `<path class="tls-bar" d="${flat(x0 + 2, z1 - 10.5, x1 - 2, z1 - 3, 1.4)}"/>`;
  const scan = [];
  for (let z = z0 + 1; z < z1; z += 1.6) scan.push(`M${x0} ${fmt(-z)}H${x1}`);
  const common = `<path class="tls-scan" d="${scan.join("")}"/>${bar}`;
  const L1 = z1 - 8.4;
  const A = 4.6;
  const B = 4.2;
  const C = 3.8;
  const row = (i) => L1 - 11 - i * 6.6;
  const lock = () => lockIcon(x0 + 5.6, L1 - 0.2, 1.6);
  const host = (cls = "tls-text") => t(x0 + 9.6, L1, "banco.hn", cls, A);
  const modes = {
    idle: [t(x0 + 3.6, L1, "HTTPS · banco.hn", "tls-text", A), t(x0 + 3.6, row(0), "Conectando…", "tls-text", B), t(x0 + 3.6, row(1), "TLS 1.3", "tls-dim", C)],
    ok: [lock(), host(), t(x0 + 3.6, row(0), "Certificado ✓", "tls-good", B), t(x0 + 3.6, row(1), "para: banco.hn", "tls-dim", C), t(x0 + 3.6, row(2), "emisor: FW-CA ■", "tls-dim", C), t(x0 + 3.6, row(3), "conexión segura", "tls-text", C)],
    err: [t(x0 + 3.6, L1, "⚠ banco.hn", "tls-bad", A), t(x0 + 3.6, row(0), "⚠ No es privada", "tls-bad", B), t(x0 + 3.6, row(1), "emisor: FW-CA ■", "tls-dim", C), t(x0 + 3.6, row(2), "CA desconocida", "tls-dim", C), t(x0 + 3.6, row(3), "ERR_CERT_AUTHORITY", "tls-bad", C)],
    sent: [lock(), host(), t(x0 + 3.6, row(0), "GET /saldo", "tls-text", B), t(x0 + 3.6, row(1), "cifrado con K1", "tls-dim", C), t(x0 + 3.6, row(2), "→ túnel 1", "tls-dim", C)],
    done: [lock(), host(), t(x0 + 3.6, row(0), "200 OK", "tls-good", B), t(x0 + 3.6, row(1), "Saldo: L 12,480", "tls-text", C), t(x0 + 3.6, row(2), "inspeccionado ✓", "tls-dim", C)],
    blocked: [lock(), host(), t(x0 + 3.6, row(0), "Bloqueado", "tls-bad", B), t(x0 + 3.6, row(1), "por el firewall:", "tls-dim", C), t(x0 + 3.6, row(2), "malware detectado", "tls-bad", C)],
  };
  const pages = Object.entries(modes).map(([mode, items]) => `<g class="tls-page" data-page="${mode}"${mode === "idle" ? " data-on" : ""}>${items.join("")}</g>`).join("");
  return `<g data-part="screen">${common}${pages}</g>`;
}

function terminal() {
  const out = [`<path class="iso-halo" d="${k.haloOf(TERM, 0, 8, P)}"/>`];
  out.push(S(k.slabOf(k.insetPlan(TERM, 3), 0, 4, P, 6), { tone: "lo" }));
  out.push(S(k.slabOf(TERM, 4, TERM_TOP - 4, P, 6, 1.4), { tone: "mid", inner: sideSeam(TERM, 10, 6) }));
  // top: carry handle recess and vent slots
  const handle = { x: TERM.x + 12, y: TERM.y + 6, w: 52, d: 9, r: 4.5 };
  out.push(L(k.planOutline(handle, TERM_TOP, P, 6), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(handle, 2), TERM_TOP, P, 6), { tone: "faint" }));
  out.push(L(Array.from({ length: 6 }, (_, i) => k.planOutline({ x: TERM.x + 14, y: TERM.y + 21 + i * 3, w: 48, d: 1.3, r: 0.65 }, TERM_TOP, P, 3)).join(""), { tone: "faint" }));
  // screen
  out.push(recess({ x0: SCREEN.x0 - 3, x1: SCREEN.x1 + 3, z0: SCREEN.z0 - 3, z1: SCREEN.z1 + 3, r: 3, depth: 1.2 }, TERM_FRONT, "", "tls-bezel"));
  out.push(recess({ ...SCREEN, r: 2, depth: 1.8 }, TERM_FRONT - 1.2, clientScreen(), "tls-glass"));
  // power switch and lamp
  out.push(`<g transform="${planeY(TERM_FRONT)}"><path class="iso-line" data-tone="lo" d="${flat(-174, 6, -170, 10, 1)}"/><circle class="tls-led-on" cx="-214" cy="-8.5" r="0.9"/></g>`);
  // speaker grille under the screen
  out.push(`<g transform="${planeY(TERM_FRONT)}">${Array.from({ length: 5 }, (_, i) => `<path class="iso-line" data-tone="faint" d="${flat(-207 + i * 4, 5.5, -205.6 + i * 4, 10, 0.7, 3)}"/>`).join("")}</g>`);
  return out.join("");
}

function clientStore() {
  const out = [`<path class="iso-halo" d="${k.haloOf(STORE, 0, 2, P)}" style="opacity:.2"/>`];
  out.push(S(k.slabOf(STORE, 0, STORE_H, P, 4, 0.8), { tone: "mid", inner: sideSeam(STORE, 1.4, 4) }));
  out.push(L(k.planOutline(k.insetPlan(STORE, 2.4), STORE_H, P, 3), { tone: "faint" }));
  out.push(D(k.pointsAt(k.corners(STORE, 2.6).map(([x, y]) => [x, y, STORE_H]), P), { size: 0.45 }));
  // shutter guide groove over the square socket
  out.push(L(k.planOutline({ x: -192, y: 15.5, w: 27, d: 17, r: 1 }, STORE_H, P, 3), { tone: "faint" }));
  for (const s of SOCKETS_CL) {
    const ring = shapeRing(s.kind, s.x, 22, 6.2);
    out.push(`<path class="tls-socket" d="${k.onTop(ring, STORE_H, P, true)}"/>`);
    out.push(L(k.onTop(shapeRing(s.kind, s.x, 22, 4.6), STORE_H, P, true), { tone: "faint" }));
    out.push(`<path class="tls-hl" data-part="sockCL-${s.kind}" d="${k.onTop(ring, STORE_H, P, true)}" style="opacity:0"/>`);
    out.push(D([at([s.x, 30.4, STORE_H])], { size: 0.45, tone: "lo" }));
  }
  return out.join("");
}

function shutter() {
  // a sliding cover that hides the FW-CA socket when the CA is not installed
  const p = { x: -190.5, y: 16.5, w: 11, d: 15, r: 1 };
  const out = [];
  out.push(S(k.slabOf(p, STORE_H, 1.2, P, 3, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: p.x + 3.5, y: p.y + p.d - 0.6, w: 4, d: 2, r: 0.5 }, STORE_H + 1.2, 1.4, P, 2), { tone: "mid", crease: "none" }));
  out.push(L(k.planOutline({ x: p.x + 2, y: p.y + 2.4, w: 7, d: 1.4, r: 0.7 }, STORE_H + 1.2, P, 3), { tone: "faint" }));
  return out.join("");
}

function lampBody() {
  const [x, y] = LAMP;
  return [
    S(k.cylinder(x, y, 3.4, STORE_H, 1.2, P, 24), { tone: "mid" }),
    S(k.cylinder(x, y, 2.4, STORE_H + 1.2, 2.6, P, 24), { tone: "hi", crease: "lo" }),
    `<path class="tls-lamp-g" data-part="lampG" d="${k.slabOf(plan(x, y, 4.8, 4.8, 2.4), STORE_H + 1.2, 2.6, P, 8).fill}" style="opacity:0"/>`,
    `<path class="tls-lamp-r" data-part="lampR" d="${k.slabOf(plan(x, y, 4.8, 4.8, 2.4), STORE_H + 1.2, 2.6, P, 8).fill}" style="opacity:0"/>`,
    L(k.ring(x, y, 1.4, STORE_H + 3.8, P, 16), { tone: "lo" }),
  ].join("");
}

// ---------- firewall station ----------
function column(x) {
  const out = [];
  const base = plan(x, COLUMN_Y, 24, 22, 1.5);
  out.push(S(k.slabOf(base, 0, 2.4, P, 3, 0.4), { tone: "lo" }));
  out.push(D(k.pointsAt(k.corners(base, 2.6).map(([px, py]) => [px, py, 2.4]), P), { size: 0.5 }));
  const post = plan(x, COLUMN_Y, 11, 11, 1.2);
  out.push(S(k.slabOf(post, 2.4, BEAM_Z - 2.4, P, 3, 0.4), { tone: "mid", inner: sideSeam(post, 40, 3) + sideSeam(post, 80, 3) }));
  // cable conduit clips on the near face
  for (const z of [30, 70]) out.push(S(k.slabOf(plan(x, COLUMN_Y + 6.6, 6, 2.2, 0.6), z, 3, P, 2), { tone: "mid", crease: "none" }));
  return out.join("");
}

function beam() {
  const out = [];
  out.push(S(k.slabOf(BEAM, BEAM_Z, 10, P, 3, 0.6), { tone: "mid", inner: sideSeam(BEAM, BEAM_Z + 5, 3) }));
  // linear guide rail on top
  out.push(S(k.slabOf({ x: BEAM.x + 6, y: BEAM.y + 4, w: BEAM.w - 12, d: 4, r: 0.6 }, BEAM_Z + 10, 1.4, P, 2), { tone: "lo", crease: "none" }));
  out.push(D(k.pointsAt(Array.from({ length: 12 }, (_, i) => [BEAM.x + 12 + i * 18.5, BEAM.y + 6, BEAM_Z + 11.4]), P), { size: 0.35, tone: "lo" }));
  // end plates
  for (const x of [BEAM.x - 2.4, BEAM.x + BEAM.w]) out.push(S(k.slabOf({ x, y: BEAM.y - 1, w: 2.4, d: 14, r: 0.6 }, BEAM_Z - 1, 12, P, 2), { tone: "mid" }));
  // drive motor at the +x end
  const mx = BEAM.x + BEAM.w - 12;
  out.push(S(k.slabOf(plan(mx, BEAM.y + 6, 14, 12, 1.4), BEAM_Z + 10, 9, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(mx, BEAM.y + 6, 4, BEAM_Z + 19, 2.4, P, 24), { tone: "mid" }));
  out.push(L(k.knurl(mx, BEAM.y + 6, 4, BEAM_Z + 19, BEAM_Z + 21.4, 22, P), { tone: "lo" }));
  out.push(D(k.pointsAt(k.corners(plan(mx, BEAM.y + 6, 14, 12), 1.8).map(([x, y]) => [x, y, BEAM_Z + 19]), P), { size: 0.4 }));
  // belt on the front face, running pulley to pulley
  const fy = BEAM.y + BEAM.d;
  out.push(L(k.segment([BEAM.x + 4, fy, BEAM_Z + 3], [BEAM.x + BEAM.w - 4, fy, BEAM_Z + 3], P) + k.segment([BEAM.x + 4, fy, BEAM_Z + 7], [BEAM.x + BEAM.w - 4, fy, BEAM_Z + 7], P), { tone: "lo" }));
  for (const x of [BEAM.x + 4, BEAM.x + BEAM.w - 4]) out.push(`<path class="iso-fill" d="${k.sideRing([x, fy, BEAM_Z + 5], 2, "y", P, 20)}"/>` + L(k.sideRing([x, fy, BEAM_Z + 5], 2, "y", P, 20), { tone: "mid" }));
  return out.join("");
}

function shuttle() {
  const out = [];
  const fy = BEAM.y + BEAM.d;
  const block = { x: -9, y: fy, w: 18, d: 6, r: 1 };
  out.push(S(k.slabOf(block, BEAM_Z - 3, 16, P, 3, 0.4), { tone: "mid" }));
  out.push(D(k.pointsAt([[-6, fy + 6, BEAM_Z + 2], [6, fy + 6, BEAM_Z + 2], [-6, fy + 6, BEAM_Z + 9], [6, fy + 6, BEAM_Z + 9]], P), { size: 0.45 }));
  // boom out to the pick line (y = 0)
  const boom = { x: -3, y: fy + 6, w: 6, d: -fy - 6 + 4, r: 0.8 };
  out.push(S(k.slabOf(boom, BEAM_Z + 4, 5, P, 2, 0.3), { tone: "mid" }));
  // rod housing at the boom tip
  const head = plan(0, 0, 9, 9, 1.4);
  out.push(S(k.slabOf(head, ROD_TOP, 14, P, 3, 0.4), { tone: "mid", inner: sideSeam(head, ROD_TOP + 7, 3) }));
  out.push(L(k.ring(0, 0, 2.2, ROD_TOP + 14, P, 18), { tone: "lo" }));
  out.push(D(k.pointsAt(k.corners(head, 1.4).map(([x, y]) => [x, y, ROD_TOP + 14]), P), { size: 0.4 }));
  return out.join("");
}

function cup() {
  // suction cup built with its bottom at z 0
  return [
    S(k.cylinder(0, 0, 3.6, 0, 1.4, P, 28), { tone: "lo" }),
    S(k.cylinder(0, 0, 2.6, 1.4, 1.2, P, 24), { tone: "mid" }),
    S(k.cylinder(0, 0, 2.2, 2.6, 1.6, P, 24), { tone: "mid", inner: L(k.sideArc(0, 0, 2.2, 3.4, P, 16), { tone: "faint" }) }),
  ].join("");
}

function appliance() {
  const out = [`<path class="iso-halo" d="${k.haloOf(APPL, 0, 6, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(APPL, 7))) out.push(S(k.cylinder(x, y, 3, 0, APPL_Z, P, 18), { tone: "lo" }));
  out.push(S(k.slabOf(APPL, APPL_Z, APPL_TOP - APPL_Z, P, 4, 1), { tone: "mid", inner: sideSeam(APPL, APPL_Z + 3, 4) }));
  // top: vent slots and a lid seam
  out.push(L(Array.from({ length: 8 }, (_, i) => k.planOutline({ x: -40 + i * 10, y: APPL.y + 8, w: 1.6, d: 18, r: 0.8 }, APPL_TOP, P, 3)).join(""), { tone: "faint" }));
  out.push(L(k.planOutline(k.insetPlan(APPL, 3), APPL_TOP, P, 3), { tone: "faint" }));
  out.push(D(k.pointsAt(k.corners(APPL, 1.6).map(([x, y]) => [x, y, APPL_TOP]), P), { size: 0.45 }));
  // front panel
  const face = [];
  face.push(`<path class="iso-line" data-tone="faint" d="${flat(APPL.x + 3, APPL_Z + 3, APPL.x + APPL.w - 3, APPL_TOP - 3, 1.5)}"/>`);
  // rack ears with two screws
  for (const x of [APPL.x + 6, APPL.x + APPL.w - 6]) face.push(`<circle class="tls-screw" cx="${x}" cy="${-(APPL_Z + 9)}" r="0.9"/><circle class="tls-screw" cx="${x}" cy="${-(APPL_TOP - 9)}" r="0.9"/>`);
  // ports
  for (let i = 0; i < 8; i++) {
    const x = 2 + i * 6;
    face.push(`<path class="tls-port" d="${flat(x, APPL_Z + 5, x + 4.6, APPL_Z + 9, 0.5, 2)}"/><path class="iso-line" data-tone="lo" d="${flat(x, APPL_Z + 5, x + 4.6, APPL_Z + 9, 0.5, 2)}"/>`);
    face.push(`<circle class="tls-led-on" cx="${x + 1}" cy="${-(APPL_Z + 10.4)}" r="0.45"/>`);
  }
  // usb + console
  face.push(`<path class="iso-line" data-tone="lo" d="${flat(-44, APPL_Z + 5, -38, APPL_Z + 7.6, 0.4, 2)}"/><path class="iso-line" data-tone="lo" d="${flat(-35, APPL_Z + 5, -29, APPL_Z + 7.6, 0.4, 2)}"/>`);
  // status LED bezels (the lit LEDs are in the front layer)
  for (const [x, z] of LEDS) face.push(`<circle class="tls-led-ring" cx="${x}" cy="${-z}" r="1.9"/>`);
  out.push(`<g transform="${planeY(FACE_Y)}">${face.join("")}</g>`);
  // LCD
  const lcd = [
    `<text class="tls-dim" x="-43.4" y="-31.4" font-size="3.8">HTTPS INSPECTION</text>`,
    `<text class="tls-text" data-part="fwlcd" x="-43.4" y="-22.4" font-size="4.4">en espera</text>`,
  ].join("");
  out.push(recess({ x0: -46, x1: 0, z0: 17, z1: 37, r: 1.4, depth: 1.2 }, FACE_Y, lcd, "tls-glass"));
  return out.join("");
}

function table() {
  const out = [`<path class="iso-halo" d="${k.haloOf(TABLE, 0, 6, P)}"/>`];
  out.push(S(k.slabOf(k.insetPlan(TABLE, 2), 0, 2, P, 4), { tone: "lo" }));
  out.push(S(k.slabOf(TABLE, 2, TABLE_TOP - 2, P, 4, 0.8), { tone: "mid", inner: sideSeam(TABLE, 5, 4) }));
  out.push(L(k.planOutline(k.insetPlan(TABLE, 2.4), TABLE_TOP, P, 3), { tone: "faint" }));
  out.push(D(k.pointsAt(k.corners(TABLE, 2.2).map(([x, y]) => [x, y, TABLE_TOP]), P), { size: 0.45 }));
  return out.join("");
}

function magazine() {
  const out = [];
  const base = plan(MAG.cx, 0, 18, 22, 1);
  out.push(S(k.slabOf(base, TABLE_TOP, 1.5, P, 3, 0.3), { tone: "mid" }));
  const posts = [[MAG.cx - 8.2, -10.2], [MAG.cx + 8.2, -10.2], [MAG.cx - 8.2, 10.2], [MAG.cx + 8.2, 10.2]];
  const back = posts.filter(([, y]) => y < 0);
  const front = posts.filter(([, y]) => y > 0);
  for (const [x, y] of back) out.push(S(k.cylinder(x, y, 0.9, TABLE_TOP + 1.5, 7.5, P, 14), { tone: "mid", crease: "none" }));
  for (let i = 0; i < 4; i++) out.push(S(k.slabOf(plan(MAG.cx, 0, CARD.w, CARD.d, 1), TABLE_TOP + 1.5 + i * CARD.h, CARD.h, P, 3), { tone: "hi", crease: "lo" }));
  return { back: out.join(""), front: front.map(([x, y]) => S(k.cylinder(x, y, 0.9, TABLE_TOP + 1.5, 7.5, P, 14), { tone: "mid", crease: "none" })).join("") };
}

function die() {
  const out = [];
  const block = plan(DIE.cx, 0, 16, 20, 1.5);
  const blockTop = DIE.top - 0.8;
  out.push(S(k.slabOf(block, TABLE_TOP, blockTop - TABLE_TOP, P, 3, 0.5), { tone: "mid", inner: sideSeam(block, TABLE_TOP + 2.5, 3) }));
  out.push(L(k.planOutline(k.insetPlan(block, 1.6), blockTop, P, 3), { tone: "faint" }));
  // the FW-CA private key: a raised square die the blank card is pressed onto
  out.push(S(k.slabOf(plan(DIE.cx, 4, 4.6, 4.6, 0.4), blockTop, 0.8, P, 2), { tone: "hi", lit: true }));
  out.push(D(k.pointsAt([[DIE.cx - 6, -8, blockTop], [DIE.cx + 6, -8, blockTop]], P), { size: 0.45 }));
  out.push(k.faceTextSvg(k.topMatrix([DIE.cx, -3.2], blockTop, P, "x"), "FW-CA", { size: 2.6, tone: "mid", anchor: "middle" }));
  return out.join("");
}

function tray() {
  const out = [];
  out.push(S(k.slabOf(TRAY, TABLE_TOP, TRAY_TOP - TABLE_TOP, P, 3, 0.3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(TRAY, 1.6), TRAY_TOP, P, 3), { tone: "faint" }));
  // scanner rails
  for (const y of [-17.5, 13.5]) {
    out.push(S(k.slabOf({ x: -7, y, w: 36, d: 3, r: 0.6 }, TABLE_TOP, 1.6, P, 2, 0.2), { tone: "mid" }));
    out.push(D(k.pointsAt([[-5, y + 1.5, TABLE_TOP + 1.6], [27, y + 1.5, TABLE_TOP + 1.6]], P), { size: 0.35 }));
  }
  return out.join("");
}

function scanner() {
  // built parked at SCAN_PARK
  const x = SCAN_PARK;
  const out = [];
  for (const y of [-19, 12]) {
    const block = { x: x - 3, y, w: 6, d: 7, r: 0.8 };
    out.push(S(k.slabOf(block, TABLE_TOP + 1.6, 8, P, 2, 0.3), { tone: "mid" }));
    out.push(D([at([x, y + 3.5, TABLE_TOP + 9.6])], { size: 0.4 }));
  }
  const bar = { x: x - 2.4, y: -16, w: 4.8, d: 32, r: 0.8 };
  out.push(S(k.slabOf(bar, TABLE_TOP + 7, 4, P, 2, 0.3), { tone: "mid", inner: sideSeam(bar, TABLE_TOP + 8.2, 2) }));
  // lamp window along the bar's lower edge
  out.push(`<path class="tls-scanwin" data-part="scanwin" d="${k.pathOf([at([x + 2.4, -14, TABLE_TOP + 7.3]), at([x + 2.4, 14, TABLE_TOP + 7.3]), at([x + 2.4, 14, TABLE_TOP + 8]), at([x + 2.4, -14, TABLE_TOP + 8])], true)}" style="opacity:0"/>`);
  return out.join("");
}

function binBack() {
  const out = [];
  const t = 1.2;
  out.push(S(k.slabOf(BIN, TABLE_TOP, 1.4, P, 3), { tone: "lo" }));
  out.push(S(k.slabOf({ x: BIN.x, y: BIN.y, w: BIN.w, d: t, r: 0.4 }, TABLE_TOP + 1.4, BIN_TOP - TABLE_TOP - 1.4, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf({ x: BIN.x, y: BIN.y, w: t, d: BIN.d, r: 0.4 }, TABLE_TOP + 1.4, BIN_TOP - TABLE_TOP - 1.4, P, 2), { tone: "mid", crease: "none" }));
  out.push(`<path class="tls-pit" d="${k.slabOf(k.insetPlan(BIN, t), TABLE_TOP + 1.4, 0.01, P, 2).top}"/>`);
  return out.join("");
}

function binFront() {
  const out = [];
  const t = 1.2;
  out.push(S(k.slabOf({ x: BIN.x + BIN.w - t, y: BIN.y, w: t, d: BIN.d, r: 0.4 }, TABLE_TOP + 1.4, BIN_TOP - TABLE_TOP - 1.4, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf({ x: BIN.x, y: BIN.y + BIN.d - t, w: BIN.w, d: t, r: 0.4 }, TABLE_TOP + 1.4, BIN_TOP - TABLE_TOP - 1.4, P, 2), { tone: "mid", crease: "none" }));
  // hazard stripes on the front wall
  const fy = BIN.y + BIN.d;
  out.push(L([0, 1, 2, 3].map((i) => k.segment([BIN.x + 2 + i * 3.4, fy, TABLE_TOP + 2], [BIN.x + 4.4 + i * 3.4, fy, BIN_TOP - 0.6], P)).join(""), { tone: "lo" }));
  return out.join("");
}

function fwStore() {
  const out = [];
  out.push(S(k.slabOf(FW_STORE, TABLE_TOP, FW_STORE_TOP - TABLE_TOP, P, 3, 0.3), { tone: "mid" }));
  for (const s of SOCKETS_FW) {
    const ring = shapeRing(s.kind, s.x, 23, 5.4);
    out.push(`<path class="tls-socket" d="${k.onTop(ring, FW_STORE_TOP, P, true)}"/>`);
    out.push(L(k.onTop(shapeRing(s.kind, s.x, 23, 3.8), FW_STORE_TOP, P, true), { tone: "faint" }));
    out.push(`<path class="tls-hl" data-part="sockFW-${s.kind}" d="${k.onTop(ring, FW_STORE_TOP, P, true)}" style="opacity:0"/>`);
  }
  out.push(D(k.pointsAt([[FW_STORE.x + 2, FW_STORE.y + 5, FW_STORE_TOP], [FW_STORE.x + FW_STORE.w - 2, FW_STORE.y + 5, FW_STORE_TOP]], P), { size: 0.4 }));
  return out.join("");
}

// ---------- server ----------
function server() {
  const out = [`<path class="iso-halo" d="${k.haloOf(SERVER, 0, 8, P)}"/>`];
  out.push(S(k.slabOf(k.insetPlan(SERVER, 2), 0, 3, P, 4), { tone: "lo" }));
  out.push(S(k.slabOf(SERVER, 3, SERVER_TOP - 3, P, 4, 1.2), { tone: "mid", inner: sideSeam(SERVER, 28, 4) + sideSeam(SERVER, 52, 4) }));
  out.push(L(Array.from({ length: 9 }, (_, i) => k.planOutline({ x: SERVER.x + 8 + i * 5.6, y: SERVER.y + 8, w: 1.6, d: 30, r: 0.8 }, SERVER_TOP, P, 3)).join(""), { tone: "faint" }));
  out.push(D(k.pointsAt(k.corners(SERVER, 2).map(([x, y]) => [x, y, SERVER_TOP]), P), { size: 0.45 }));
  const face = [];
  // drive bays: two rows of four
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 4; i++) {
      const x = SERVER.x + 6 + i * 13.4;
      const z = 8 + row * 10;
      face.push(`<path class="iso-line" data-tone="lo" d="${flat(x, z, x + 12, z + 8, 0.8, 3)}"/><path class="iso-line" data-tone="faint" d="${flat(x + 2, z + 3, x + 8, z + 4.6, 0.6, 2)}"/><circle class="tls-led-on" cx="${x + 10.2}" cy="${-(z + 6)}" r="0.5"/>`);
    }
  }
  // vent grille band
  for (let i = 0; i < 10; i++) face.push(`<path class="iso-line" data-tone="faint" d="${flat(SERVER.x + 8 + i * 5, 34, SERVER.x + 9.6 + i * 5, 48, 0.8, 3)}"/>`);
  face.push(`<circle class="tls-led-on" cx="${SERVER.x + 54.5}" cy="-72" r="0.9"/>`);
  out.push(`<g transform="${planeY(SERVER_FRONT)}">${face.join("")}</g>`);
  const lcd = [
    `<text class="tls-text" x="${SERVER.x + 6.4}" y="-69" font-size="4.2">banco.hn :443</text>`,
    `<text class="tls-dim" x="${SERVER.x + 6.4}" y="-62.4" font-size="3.8">cert: DigiCert ●</text>`,
    `<text class="tls-text" data-part="svlcd" x="${SERVER.x + 6.4}" y="-55.8" font-size="3.8">en espera</text>`,
  ].join("");
  out.push(recess({ x0: SERVER.x + 3.5, x1: SERVER.x + 51, z0: 51, z1: 75, r: 1.4, depth: 1.2 }, SERVER_FRONT, lcd, "tls-glass"));
  return out.join("");
}

// ---------- assembly ----------
const tr = (by) => k.translateAlong(P, by);
const mag = magazine();
const LABEL =
  "Banco de pruebas de TLS Inspection. A la izquierda, el cliente con su almacén de CAs; en el centro, la estación del firewall con un brazo pick-and-place, una matriz con la clave de su CA, una bandeja de escaneo y una papelera de cuarentena; a la derecha, el servidor. Dos carriles son los dos túneles TLS. Los certificados son tarjetas con un sello en relieve que debe encajar en un zócalo del almacén de confianza.";

const back = [
  bench(),
  rails(),
  wires(),
  terminal(),
  column(COLUMN_X[0]),
  appliance(),
  column(COLUMN_X[1]),
  server(),
  beam(),
  `<g data-part="shuttle">${shuttle()}</g>`,
  clientStore(),
  `<g data-part="shutter" transform="${tr([14, 0, 0])}">${shutter()}</g>`,
  `<g data-part="carA" transform="${tr([DOCK.aFw, 0, 0])}">${carriageBody(-1, "K1")}</g>`,
  `<g data-slot="pA"></g>`,
  `<g data-part="lidA" transform="${tr([DOCK.aFw - LID_TRAVEL, 0, 0])}">${lid(-1, "K1")}</g>`,
  `<g data-slot="fA"></g>`,
  table(),
  mag.back,
  die(),
  tray(),
  binBack(),
  fwStore(),
  `<g data-slot="T"><g data-part="forged" transform="${tr([MAG.cx, 0, MAG.top])}">${card({ seal: "square", sealPart: true })}</g><g data-part="payload" transform="${tr([DOCK.aFw - 11, 0, BODY_TOP])}" style="opacity:0">${payload()}</g></g>`,
  mag.front,
  binFront(),
  `<g data-part="carB" transform="${tr([DOCK.bSv, 0, 0])}">${carriageBody(1, "K2")}<g transform="${tr([-10, 0, CRADLE_TOP])}">${card({ seal: "circle" })}</g></g>`,
  `<g data-slot="pB"></g>`,
  `<g data-part="lidB" transform="${tr([DOCK.bSv + LID_TRAVEL, 0, 0])}">${lid(1, "K2")}</g>`,
];

// front layer: what covers the light
const ledSvg = LEDS.map(([x, z], i) => {
  const kinds = [["tls-led-amber", "ledInt"], ["tls-led-green", "ledCert"], ["tls-led-green", "ledScanG"]];
  const [cls, part] = kinds[i];
  const extra = i === 2 ? `<circle class="tls-led-red" data-part="ledScanR" cx="${x}" cy="${-z}" r="1.25" style="opacity:0"/>` : "";
  return `<circle class="tls-led-off" cx="${x}" cy="${-z}" r="1.25"/><circle class="${cls}" data-part="${part}" cx="${x}" cy="${-z}" r="1.25" style="opacity:0"/>${extra}`;
}).join("");
const front = [
  `<g transform="${planeY(FACE_Y)}">${ledSvg}</g>`,
  lampBody(),
  `<g data-part="scanner">${scanner()}</g>`,
  `<g data-part="rod"></g>`,
  `<g data-part="cup" transform="${tr([MAG.cx, 0, TRAVEL_Z])}">${cup()}</g>`,
];

const backSvg = k.figureSvg({ width: W, height: H, label: LABEL, body: back, className: "tls-back" });
const frontSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg tls-layer" viewBox="0 0 ${W} ${H}" aria-hidden="true">${front.join("")}</svg>`;

// ---------- data for the page ----------
const DATA = {
  W,
  H,
  P,
  camera: glCamera(P),
  DOCK,
  LID_TRAVEL,
  BODY_TOP,
  CRADLE_TOP,
  TRAY_TOP,
  MAG,
  DIE,
  BIN: { cx: BIN.x + BIN.w / 2, top: BIN_TOP, floor: BIN_FLOOR },
  SCAN_PARK,
  TRAVEL_Z,
  ROD_TOP,
  CARD_H: CARD.h,
  PAY_H: PAY.h,
  TRAY,
  FACE_Y,
  LEDS,
  APPL_TOP,
  LAMP,
  STORE_H,
  STORE,
  pulse: [lengthOf(WIRE_A), lengthOf(WIRE_B)],
};

const CSS = readFileSync(join(HERE, "tls.css"), "utf8");
const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));

const STEPS_HTML = `<aside class="tls-side" aria-label="Pasos de la conexión">
  <div class="tls-side-head"><span>Pasos de la conexión</span><span class="tls-side-count" data-count></span></div>
  <div class="tls-controls" role="toolbar" aria-label="Controles de la figura">
    <button type="button" data-act="prev" aria-label="Paso anterior">◀</button>
    <button type="button" data-act="play" aria-label="Reproducir o pausar">❚❚ Pausa</button>
    <button type="button" data-act="next" aria-label="Paso siguiente">▶</button>
  </div>
  <div class="tls-switches">
    <label class="tls-toggle"><input type="checkbox" data-act="trust" checked> CA del firewall instalada en el cliente <kbd>T</kbd></label>
    <label class="tls-toggle"><input type="checkbox" data-act="mal"> Contenido con malware <kbd>M</kbd></label>
  </div>
  <ol class="tls-steps" data-steps></ol>
</aside>`;

const LEGEND = `<div class="tls-legend">
  <span><svg viewBox="0 0 16 10" class="tls-ico"><circle cx="8" cy="5" r="3.6"/></svg>Sello redondo: CA pública (DigiCert) — firma el certificado real del servidor</span>
  <span><svg viewBox="0 0 16 10" class="tls-ico"><rect x="4.4" y="1.4" width="7.2" height="7.2"/></svg>Sello cuadrado: CA del firewall — firma el certificado que ve el cliente</span>
  <span><svg viewBox="0 0 16 10" class="tls-ico tls-ico-lit"><rect x="3" y="2" width="10" height="6" rx="1"/></svg>La tarjeta brillante es el contenido (la petición HTTP)</span>
  <span><svg viewBox="0 0 16 10" class="tls-ico"><path d="M1 8h14M1 3h14"/></svg>Carril izquierdo = túnel 1 (clave K1) · carril derecho = túnel 2 (clave K2)</span>
</div>`;

const stage = `<div class="tls-scroll"><div class="tls-stage" tabindex="0" role="group" aria-roledescription="figura interactiva" aria-label="TLS Inspection. Clic o flechas para avanzar paso a paso; T quita o instala la CA del firewall; M marca el contenido como malware; espacio pausa.">${backSvg}<canvas class="tls-layer tls-gl" aria-hidden="true"></canvas>${frontSvg}<span class="tls-sr" role="status" aria-live="polite" data-status></span></div></div>`;

const card_ = k.plateHtml({
  fig: "Fig 1",
  title: "TLS Inspection",
  hint: "Clic o ← → para avanzar · T · M",
  readout: "Paso 1 · ClientHello",
  keys: [],
  caption:
    "El firewall termina el TLS del cliente y abre otro hacia el servidor: hay dos túneles con dos claves. Para hacerse pasar por banco.hn necesita firmar un certificado con su propia CA, y el cliente solo lo acepta si esa CA está en su almacén de confianza. En medio, el contenido viaja en claro por un instante, que es cuando se inspecciona.",
  body: stage,
});

const page = k.pageHtml({
  title: "TLS Inspection",
  theme,
  width: 1680,
  body: `<style>${CSS}</style><div class="tls-layout"><div class="tls-main">${card_.replace("</figure>", `${LEGEND}</figure>`)}</div>${STEPS_HTML}</div>`,
  script: kitScript() + glScript() + LIVE,
}).replace('<html lang="en">', '<html lang="es">');

const name = theme === "light" ? "tls-inspection.html" : "tls-inspection-dark.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, (page.length / 1024).toFixed(0) + " KB");
