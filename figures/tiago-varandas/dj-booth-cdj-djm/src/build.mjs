import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../../.skill/kit/iso-kit.mjs";
import * as G from "../../../../.skill/kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../../../../.skill/kit/tube.mjs";
import * as A from "../../../../.skill/kit/audit.mjs";
import { kitScript } from "../../../../.skill/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

// World units are millimetres. x across the booth, y toward the DJ, z up.
// CDJ-3000X: 329 × 453 mm. DJM-A9: 413 × 457 mm. Control positions follow the units' panel sections.
const W = 1200;
const H = 660;
const MARGIN = 196;
const TOP = 116;
const BAND = 120;
const AZIMUTH = 90;
const ELEVATION = 56;

const DESK = { x: -650, y: -320, w: 1300, d: 590, r: 10 };
const DESK_T = 30;
const CDJ = { w: 329, d: 453, h: 26 };
const MIX = { x: -206.5, y: -228.5, w: 413, d: 457, h: 26 };
const DECKS = [{ cx: -401, cy: 0 }, { cx: 401, cy: 0 }];

const P = k.fitProjection([...k.boxCorners(DESK, -40, 0), [0, -330, 40]], W - 2 * MARGIN, H - TOP - BAND, { pad: 8, azimuth: AZIMUTH, elevation: ELEVATION });
P.origin = [P.origin[0] + MARGIN, P.origin[1] + TOP];
const KS = G.scaleOf(P);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const f2 = (v) => Math.round(v * 100) / 100;
const path3 = (points, closed = false) => k.pathOf(points.map(at), closed);
const unit = (vector) => {
  const o = at([0, 0, 0]);
  const p = at(vector);
  return [f2(p[0] - o[0]), f2(p[1] - o[1])];
};
function planeMatrix(o, ex, ey) {
  const p0 = at(o);
  const px = at(G.add3(o, ex));
  const py = at(G.add3(o, ey));
  const v = (x) => x.toFixed(4);
  return `matrix(${v(px[0] - p0[0])} ${v(px[1] - p0[1])} ${v(py[0] - p0[0])} ${v(py[1] - p0[1])} ${p0[0].toFixed(2)} ${p0[1].toFixed(2)})`;
}

const R = A.recorder(P);
const record = R.solid;
function put(part, name, ref, svg, shapes = [], { bias = 0, attrs = "" } = {}) {
  let cls = "it";
  const rest = attrs.replace(/\s*class="([^"]*)"/, (_, c) => {
    cls += " " + c;
    return "";
  });
  return R.put({ piece: "booth", name: R.nameFor(name), at: ref, bias, svg, shapes, cls, attrs: ` data-part="${part}"${rest}` });
}
function box(part, name, [x0, y0, z0], [x1, y1, z1], style = {}, { r = 0.8, steps = 3, bevel = 0, extra = "", inner = "", bias = 0, attrs = "" } = {}) {
  const plan = { x: x0, y: y0, w: x1 - x0, d: y1 - y0, r };
  const shape = record(A.slab(plan, z0, z1 - z0, { name }, steps));
  put(part, name, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], S(k.slabOf(plan, z0, z1 - z0, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, [shape], { bias, attrs });
  return shape;
}
function cyl(part, name, cx, cy, r, z, h, style = {}, { steps = 40, bevel = 0, extra = "", inner = "", bias = 0, attrs = "" } = {}) {
  const shape = record(A.cylinder(cx, cy, r, z, h, { name }));
  put(part, name, [cx, cy, z + h / 2], S(k.cylinder(cx, cy, r, z, h, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, [shape], { bias, attrs });
  return shape;
}
function disc(part, name, F, s0, s1, r, style = {}, { extra = "", bias = 0, owner } = {}) {
  const shape = record(A.disc(F, s0, s1, r, { name, owner }));
  put(part, name, G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)), S(G.disc(s0, s1, r, F, P), { tone: "mid", ...style }) + extra, [shape], { bias });
  return shape;
}
// flat things printed or inset in a top plate: recorded as a thin bezel so they sort above the plate
function flat(part, name, plan, z, svg, { bias = 0.1, attrs = "" } = {}) {
  put(part, name, [plan.x + plan.w / 2, plan.y + plan.d / 2, z + 0.2], svg, [record(A.slab(plan, z, 0.45, { name }, 2))], { bias, attrs });
}

const CONTROLS = [];
const ctl = (spec) => CONTROLS.push(spec);
const aria = (id, role, label) => ` data-ctl="${id}" tabindex="-1" role="${role}" aria-label="${label}" class="dj-ctl"`;

function knob(part, id, cx, cy, z, r, label, spec, { tone = "hi", ring = true } = {}) {
  cyl(part, `${part}.${id}`, cx, cy, r, z, r * 0.7, { tone }, {
    steps: 36,
    bevel: 0.3,
    extra: Ln(k.knurl(cx, cy, r, z + 0.5, z + r * 0.7, 28, P, 0.3), { tone: "lo" }) + `<path class="iso-line dj-pointer" data-pointer="${id}" data-tone="lit" data-free="start" d=""/>`,
    attrs: aria(id, "slider", label),
  });
  if (ring) {
    const t = k.radialTicks(cx, cy, r + 3.6, 10, 5, z, [1.6, 3], P, -0.75 * Math.PI, 1.5 * Math.PI);
    flat(part, `${part}.${id}.scale`, { x: cx - r - 4, y: cy - r - 4, w: 2 * r + 8, d: 2 * r + 8, r: r + 4 }, z, Ln(t.minor, { tone: "lo" }) + Ln(t.major, { tone: "mid" }), { bias: 0.05 });
  }
  ctl({ id, kind: "knob", x: cx, y: cy, z: z + r * 0.7, r, label, ...spec });
}
function button(part, id, [x0, y0], [x1, y1], z, label, spec, { tone = "hi", glyph = "", h = 3, round = 1.2, role = "button" } = {}) {
  box(part, `${part}.${id}`, [x0, y0, z], [x1, y1, z + h], { tone }, { r: round, steps: 3, bevel: 0.3, extra: glyph, attrs: aria(id, role, label) });
  ctl({ id, kind: "button", label, ...spec });
}
function roundButton(part, id, cx, cy, r, z, label, spec, glyph = "") {
  cyl(part, `${part}.${id}`, cx, cy, r, z, 4, { tone: "hi" }, { steps: 40, bevel: 0.5, extra: Ln(k.ring(cx, cy, r - 3, z + 4, P, 32), { tone: "lo" }) + glyph, attrs: aria(id, "button", label) });
  ctl({ id, kind: "button", label, ...spec });
}
function fader(part, id, [cx, cy], axis, len, z, label, spec, { capW = 16, capD = 10 } = {}) {
  const alongX = axis[0] === 1;
  const slot = alongX ? { x: cx - len - 4, y: cy - 3, w: 2 * len + 8, d: 6, r: 3 } : { x: cx - 3, y: cy - len - 4, w: 6, d: 2 * len + 8, r: 3 };
  const ticks = alongX ? k.topTicks(cx - len, cx + len, len / 5, 5, cy + 3, z + 0.4, [2.4, 4.2], P, "x") : k.topTicks(cy - len, cy + len, len / 5, 5, cx + 3, z + 0.4, [2.4, 4.2], P, "y");
  flat(part, `${part}.${id}.slot`, slot, z, `<path class="dj-slot" d="${k.planOutline(slot, z + 0.4, P, 3)}"/>` + Ln(k.planOutline(slot, z + 0.4, P, 3), { tone: "lo" }) + Ln(ticks.minor, { tone: "lo" }) + Ln(ticks.major, { tone: "mid" }));
  const cap = alongX ? { x: cx - capD / 2, y: cy - capW / 2, w: capD, d: capW, r: 1.5 } : { x: cx - capW / 2, y: cy - capD / 2, w: capW, d: capD, r: 1.5 };
  const mark = alongX ? k.lineOnTop([cx, cy - capW / 2], [cx, cy + capW / 2], z + 9, P) : k.lineOnTop([cx - capW / 2, cy], [cx + capW / 2, cy], z + 9, P);
  put(part, `${part}.${id}`, [cx, cy, z + 5], `<g${aria(id, "slider", label)}><g data-move="${id}">${S(k.slabOf(cap, z, 9, P, 2, 0.5), { tone: "hi" })}${Ln(mark, { tone: "lit" })}</g></g>`, [record(A.slab(cap, z, 9, { name: `${part}.${id}` }, 2))], { bias: 2 });
  ctl({ id, kind: "fader", axis, len, label, ...spec });
}

const back = [];
// ---------- the booth table ----------
back.push(`<path class="iso-halo" d="${k.haloOf(DESK, -40, DESK_T, P)}"/>`);
back.push(S(k.slabOf(DESK, -DESK_T, DESK_T, P, 8, 1.4), { tone: "mid", inner: Ln(k.sideSeam(DESK, -DESK_T / 2, P, 8), { tone: "faint" }) }));
back.push(Ln(k.planOutline(k.insetPlan(DESK, 10), 0, P), { tone: "faint" }));
back.push(Dots(k.corners(DESK, 18).map(([x, y]) => at([x, y, 0])), { size: 0.55 }));
record(A.slab(DESK, -DESK_T, DESK_T, { name: "stand.desk", ground: true }, 8));
// the stage box at the back edge: the master out leaves the booth here for the main PA
const STAGEBOX = { x: 118.5, y: -318, w: 96, d: 34, r: 3 };
// model names as plain text, printed on a strip along the table's front edge
const strip = { x: DESK.x + 30, y: DESK.y + DESK.d - 26, w: DESK.w - 60, d: 14, r: 2 };
back.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
const nameTag = (x, text) => `<g transform="${planeMatrix([x, strip.y + 10.5, 0.62], [1, 0, 0], [0, 1, 0])}"><text class="dj-model" x="0" y="0" font-size="8.5" text-anchor="middle">${text}</text></g>`;
back.push(nameTag(DECKS[0].cx, "CDJ-3000X") + nameTag(0, "DJM-A9") + nameTag(DECKS[1].cx, "CDJ-3000X"));

// ---------- the two CDJ-3000X players ----------
const SCREEN = { w: 222, d: 125 };
const DECKINFO = [];
for (const [di, d] of DECKS.entries()) {
  const part = `cdj${di}`;
  const side = di ? "right" : "left";
  const x0 = d.cx - CDJ.w / 2;
  const y0 = d.cy - CDJ.d / 2;
  const Z = CDJ.h;
  const body = { x: x0, y: y0, w: CDJ.w, d: CDJ.d, r: 10 };
  for (const [fx, fy] of k.corners(body, 22)) cyl(part, `${part}.foot`, fx, fy, 9, 0, 4, { tone: "lo" }, { steps: 20 });
  box(part, `${part}.body`, [x0, y0, 4], [x0 + CDJ.w, y0 + CDJ.d, Z], { tone: "mid" }, { r: 10, steps: 6, bevel: 1, inner: Ln(k.sideSeam(body, 14, P, 6), { tone: "faint" }), extra: Dots(k.corners(body, 7).map(([x, y]) => at([x, y, Z])), { size: 0.5 }) + Ln(k.lineOnTop([x0, y0 + 160], [x0 + CDJ.w, y0 + 160], Z, P), { tone: "faint" }) });
  // touchscreen in its bezel at the top of the panel
  const bez = { x: d.cx - SCREEN.w / 2 - 8, y: y0 + 14, w: SCREEN.w + 16, d: SCREEN.d + 14, r: 4 };
  box(part, `${part}.bezel`, [bez.x, bez.y, Z], [bez.x + bez.w, bez.y + bez.d, Z + 2], { tone: "mid" }, { r: 4, steps: 4, bevel: 0.4 });
  const so = [d.cx - SCREEN.w / 2, y0 + 21, Z + 2.5];
  flat(part, `${part}.screen`, { x: so[0], y: so[1], w: SCREEN.w, d: SCREEN.d, r: 1 }, Z + 2, `<g class="dj-screen-g" data-screen="${di}" transform="${planeMatrix(so, [1, 0, 0], [0, 1, 0])}"><defs><clipPath id="scr${di}"><rect width="${SCREEN.w}" height="${SCREEN.d}" rx="2"/></clipPath></defs><rect class="dj-screen" width="${SCREEN.w}" height="${SCREEN.d}" rx="2"/><g clip-path="url(#scr${di})" class="dj-screen-ui"></g></g>`, { bias: 0.5, attrs: aria(`screen-${di}`, "group", `Player ${side} touchscreen: browse, load and needle search`) });
  ctl({ id: `screen-${di}`, kind: "screen", deck: di, label: "Touchscreen" });
  // keys beside the screen: BROWSE on the left; the others are drawn but not used here
  button(part, `browse-${di}`, [x0 + 9, y0 + 30], [x0 + 32, y0 + 46], Z, `Player ${side} browse: show the track library`, { deck: di, act: "browse" });
  for (let i = 1; i < 3; i++) box(part, `${part}.key`, [x0 + 9, y0 + 30 + i * 30, Z], [x0 + 32, y0 + 46 + i * 30, Z + 3], { tone: "mid" }, { r: 1.2, steps: 3 });
  for (let i = 0; i < 3; i++) box(part, `${part}.key`, [x0 + CDJ.w - 32, y0 + 30 + i * 30, Z], [x0 + CDJ.w - 9, y0 + 46 + i * 30, Z + 3], { tone: "mid" }, { r: 1.2, steps: 3 });
  // eight hot cue pads, A–H, in a row under the screen
  for (let i = 0; i < 8; i++) {
    const px = d.cx - 126 + i * 36;
    button(part, `hot-${di}-${i}`, [px - 15, y0 + 168], [px + 15, y0 + 186], Z, `Player ${side} hot cue ${"ABCDEFGH"[i]}: empty saves a cue, set jumps to it`, { deck: di, act: "hot", pad: i }, { round: 2 });
  }
  // left column: loop section, beat jump, search, then CUE and PLAY/PAUSE
  const lx = x0 + 28;
  const col = [
    ["loopin", 200, "Loop In: mark where the loop starts"],
    ["loopout", 220, "Loop Out: close the loop and start looping"],
    ["reloop", 240, "Reloop or Exit: re-enter or leave the loop"],
    ["beat4", 264, "4 Beat loop, or halve the loop while looping"],
    ["beat8", 284, "8 Beat loop, or double the loop while looping"],
  ];
  for (const [id, yy, label] of col) button(part, `${id}-${di}`, [lx - 17, y0 + yy], [lx + 17, y0 + yy + 14], Z, `Player ${side} ${label}`, { deck: di, act: id });
  const tri = (pts) => `<path class="dj-glyph" d="${path3(pts, true)}"/>`;
  button(part, `jumpb-${di}`, [lx - 17, y0 + 308], [lx - 1, y0 + 322], Z, `Player ${side} beat jump back`, { deck: di, act: "jump", dir: -1 }, { glyph: tri([[lx - 5, y0 + 311, Z + 3.05], [lx - 5, y0 + 319, Z + 3.05], [lx - 12, y0 + 315, Z + 3.05]]) });
  button(part, `jumpf-${di}`, [lx + 1, y0 + 308], [lx + 17, y0 + 322], Z, `Player ${side} beat jump forward`, { deck: di, act: "jump", dir: 1 }, { glyph: tri([[lx + 5, y0 + 311, Z + 3.05], [lx + 5, y0 + 319, Z + 3.05], [lx + 12, y0 + 315, Z + 3.05]]) });
  for (const xx of [lx - 9, lx + 9]) box(part, `${part}.search`, [xx - 7, y0 + 334, Z], [xx + 7, y0 + 346, Z + 2.4], { tone: "mid" }, { r: 1.2, steps: 3 });
  roundButton(part, `cue-${di}`, lx, y0 + 374, 17, Z, `Player ${side} cue: set the cue point, or return to it`, { deck: di, act: "cue" });
  roundButton(part, `play-${di}`, lx, y0 + 418, 17, Z, `Player ${side} play or pause: starts on the next bar`, { deck: di, act: "play" }, tri([[lx - 5, y0 + 412, Z + 4.05], [lx - 5, y0 + 424, Z + 4.05], [lx + 6, y0 + 418, Z + 4.05]]));
  // the jog wheel: 206 mm, with its centre display
  const jx = d.cx + 14;
  const jy = y0 + 318;
  cyl(part, `${part}.jogring`, jx, jy, 103, Z, 3, { tone: "lo" }, { steps: 120, bevel: 0.5 });
  const tk = k.radialTicks(jx, jy, 102, 72, 6, Z + 3, [2.4, 5], P);
  flat(part, `${part}.jogticks`, { x: jx - 103, y: jy - 103, w: 206, d: 206, r: 103 }, Z + 3, Ln(tk.minor, { tone: "lo" }) + Ln(tk.major, { tone: "mid" }), { bias: 0.05 });
  cyl(part, `${part}.platter`, jx, jy, 94, Z + 3, 4, { tone: "hi" }, { steps: 120, bevel: 0.8, extra: Ln(k.ring(jx, jy, 80, Z + 7, P, 96) + k.ring(jx, jy, 62, Z + 7, P, 96), { tone: "faint" }), attrs: aria(`jog-${di}`, "slider", `Player ${side} jog wheel: drag to nudge or scratch; paused, it moves the playhead`) });
  ctl({ id: `jog-${di}`, kind: "jog", deck: di, x: jx, y: jy, z: Z + 7, r: 94 });
  cyl(part, `${part}.jogdisplay`, jx, jy, 44, Z + 7, 1.2, { tone: "lo" }, { steps: 64, extra: `<path class="dj-jogdisp" d="${k.ring(jx, jy, 41, Z + 8.25, P, 64)}"/><path class="iso-line dj-jog-mark" data-jogmark="${di}" data-tone="lit" data-free="" d=""/>` });
  // right column: tempo range and master tempo, sync and master beside the jog, the tempo slider
  const rx = x0 + CDJ.w - 24;
  button(part, `range-${di}`, [rx - 15, y0 + 196], [rx + 15, y0 + 210], Z, `Player ${side} tempo range: ±6, ±10 or ±16 percent`, { deck: di, act: "range" });
  button(part, `mt-${di}`, [rx - 15, y0 + 216], [rx + 15, y0 + 230], Z, `Player ${side} Master Tempo: keep the key when the tempo changes`, { deck: di, act: "mt" }, { role: "switch" });
  const sx = d.cx + 104;
  button(part, `sync-${di}`, [sx - 15, y0 + 196], [sx + 15, y0 + 210], Z, `Player ${side} sync: follow the master deck's tempo and beat`, { deck: di, act: "sync" }, { role: "switch" });
  button(part, `master-${di}`, [sx - 15, y0 + 216], [sx + 15, y0 + 230], Z, `Player ${side} master: make this deck the tempo master`, { deck: di, act: "master" }, { role: "switch" });
  fader(part, `tempo-${di}`, [rx, y0 + 336], [0, 1, 0], 78, Z, `Player ${side} tempo slider`, { deck: di, min: -1, max: 1, value: 0, def: 0, invert: false, label: "TEMPO" });
  // the line output on the back face
  d.port = [d.cx + (di === 0 ? 120 : -120), y0 - 1.5, 14];
  box(part, `${part}.out`, [d.port[0] - 10, y0 - 1.5, 7], [d.port[0] + 10, y0, 21], { tone: "lo" }, { r: 0.6 });
  DECKINFO.push({ cx: d.cx, x0, y0 });
}

// ---------- the DJM-A9 ----------
{
  const part = "mixer";
  const { x: x0, y: y0, w, d: dd } = MIX;
  const Z = MIX.h;
  const body = { x: x0, y: y0, w, d: dd, r: 8 };
  for (const [fx, fy] of k.corners(body, 22)) cyl(part, "mixer.foot", fx, fy, 9, 0, 4, { tone: "lo" }, { steps: 20 });
  box(part, "mixer.body", [x0, y0, 4], [x0 + w, y0 + dd, Z], { tone: "mid" }, { r: 8, steps: 6, bevel: 1, inner: Ln(k.sideSeam(body, 14, P, 6), { tone: "faint" }), extra: Dots(k.corners(body, 6).map(([x, y]) => at([x, y, Z])), { size: 0.5 }) + Ln(k.lineOnTop([x0 + 78, y0], [x0 + 78, y0 + dd], Z, P) + k.lineOnTop([x0 + w - 98, y0], [x0 + w - 98, y0 + dd], Z, P), { tone: "faint" }) });
  // four channel strips; 2 and 3 are live
  const STRIPS = [1, 2, 3, 4].map((n, i) => ({ n, x: x0 + 104 + i * 54 }));
  const NAMES = { trim: "Trim", hi: "Hi EQ", mid: "Mid EQ", low: "Low EQ", color: "Color FX" };
  for (const s of STRIPS) {
    const live = s.n === 2 || s.n === 3;
    // input selector at the top (drawn, not used), then TRIM, HI, MID, LOW and COLOR
    cyl(part, `mixer.input${s.n}`, s.x, y0 + 28, 8, Z, 5, { tone: "mid" }, { steps: 24, extra: Ln(k.lineOnTop([s.x, y0 + 28], [s.x + 5, y0 + 24], Z + 5, P), { tone: "lo", free: "end" }) });
    for (const [key, yy, r] of [["trim", 62, 9], ["hi", 98, 9], ["mid", 130, 9], ["low", 162, 9], ["color", 202, 11]]) {
      if (live) knob(part, `${key}-${s.n}`, s.x, y0 + yy, Z, r, `Channel ${s.n} ${NAMES[key]}`, { ch: s.n, key, min: key === "color" ? -1 : 0, max: 1, value: key === "color" ? 0 : 0.5, def: key === "color" ? 0 : 0.5, label: `CH${s.n} ${NAMES[key].toUpperCase()}` });
      else cyl(part, `mixer.${key}${s.n}`, s.x, y0 + yy, r, Z, r * 0.7, { tone: "mid" }, { steps: 32, extra: Ln(k.lineOnTop([s.x, y0 + yy], [s.x, y0 + yy - r * 0.85], Z + r * 0.7, P), { tone: "lo", free: "end" }) });
    }
    // channel level meter beside the knobs
    const meter = { x: s.x + 17, y: y0 + 54, w: 7, d: 150, r: 1.5 };
    const leds = Array.from({ length: 15 }, (_, i) => `<path class="dj-led" data-led="ch${s.n}-${i}" d="${k.planOutline({ x: meter.x + 1.2, y: meter.y + meter.d - 9 - i * 9.6, w: 4.6, d: 6.4, r: 0.6 }, Z + 0.5, P, 2)}"/>`).join("");
    flat(part, `mixer.meter${s.n}`, meter, Z, `<path class="dj-slot" d="${k.planOutline(meter, Z + 0.4, P, 2)}"/>` + leds);
    // channel CUE button and the fader
    if (live) button(part, `chcue-${s.n}`, [s.x - 13, y0 + 230], [s.x + 13, y0 + 244], Z, `Channel ${s.n} cue: pre-listen to this deck alone`, { ch: s.n, act: "chcue" });
    else box(part, `mixer.cue${s.n}`, [s.x - 13, y0 + 230, Z], [s.x + 13, y0 + 244, Z + 3], { tone: "mid" }, { r: 1.2, steps: 3 });
    if (live) fader(part, `fader-${s.n}`, [s.x, y0 + 304], [0, 1, 0], 44, Z, `Channel ${s.n} fader`, { ch: s.n, min: 0, max: 1, value: 0.75, def: 0.75, invert: true, label: `CH${s.n} FADER` }, { capW: 18 });
    else {
      const slot = { x: s.x - 3, y: y0 + 256, w: 6, d: 96, r: 3 };
      flat(part, `mixer.slot${s.n}`, slot, Z, `<path class="dj-slot" d="${k.planOutline(slot, Z + 0.4, P, 3)}"/>`);
      box(part, `mixer.fader${s.n}`, [s.x - 9, y0 + 340, Z], [s.x + 9, y0 + 350, Z + 9], { tone: "mid" }, { r: 1.5, steps: 2, bevel: 0.4 });
    }
    // crossfader assign: A · THRU · B
    const sw = { x: s.x - 12, y: y0 + 372, w: 24, d: 8, r: 3 };
    flat(part, `mixer.assign${s.n}`, sw, Z, `<path class="dj-slot" d="${k.planOutline(sw, Z + 0.4, P, 3)}"/>`);
    const lever = { x: s.x - 3, y: y0 + 372.5, w: 6, d: 7, r: 1.5 };
    if (live) {
      put(part, `mixer.assignlever${s.n}`, [s.x, y0 + 376, Z + 3], `<g${aria(`assign-${s.n}`, "slider", `Channel ${s.n} crossfader assign: A, THRU or B`)}><g data-move="assign-${s.n}">${S(k.slabOf(lever, Z, 6, P, 2, 0.3), { tone: "hi" })}</g></g>`, [record(A.slab(lever, Z, 6, { name: `mixer.assignlever${s.n}` }, 2))], { bias: 2 });
      ctl({ id: `assign-${s.n}`, kind: "switch3", ch: s.n, options: ["A", "THRU", "B"], value: s.n === 2 ? 0 : 2, def: s.n === 2 ? 0 : 2, min: 0, max: 2, steps: 1, step: 9, label: `CH${s.n} ASSIGN` });
    } else box(part, `mixer.assignlever${s.n}`, [lever.x, lever.y, Z], [lever.x + lever.w, lever.y + lever.d, Z + 6], { tone: "mid" }, { r: 1.5, steps: 2 });
  }
  // crossfader along the front
  fader(part, "xfader", [x0 + w / 2 - 10, y0 + 418], [1, 0, 0], 52, Z, "Crossfader", { min: -1, max: 1, value: 0, def: 0, label: "CROSSFADER" }, { capW: 18, capD: 12 });
  // left column: mic section (drawn, not used), the six SOUND COLOR FX buttons, headphones (drawn)
  const lx = x0 + 40;
  const dummyKnob = (yy, r) => cyl(part, "mixer.dummy", lx, y0 + yy, r, Z, 5, { tone: "mid" }, { steps: 24, extra: Ln(k.lineOnTop([lx, y0 + yy], [lx, y0 + yy - r * 0.85], Z + 5, P), { tone: "lo", free: "end" }) });
  for (const [yy, r] of [[34, 8], [62, 8], [92, 7], [118, 7], [320, 8], [350, 8], [382, 7]]) dummyKnob(yy, r);
  ["SPACE", "DUB ECHO", "SWEEP", "NOISE", "CRUSH", "FILTER"].forEach((name, i) => {
    const bx = lx + (i % 2 ? 15 : -15);
    const by = y0 + 168 + Math.floor(i / 2) * 26;
    button(part, `cfx-${i}`, [bx - 13, by], [bx + 13, by + 16], Z, `Sound Color FX ${name}`, { act: "color", fx: name }, { role: "radio" });
  });
  // right column: master level and meters, booth monitor, then BEAT FX
  const rx = x0 + w - 54;
  knob(part, "master", rx - 14, y0 + 36, Z, 10, "Master level", { min: 0, max: 1, value: 0.75, def: 0.75, label: "MASTER" });
  knob(part, "booth", rx - 14, y0 + 74, Z, 9, "Booth monitor level", { min: 0, max: 1, value: 0.5, def: 0.5, label: "BOOTH" });
  for (let side = 0; side < 2; side++) {
    const meter = { x: rx + 14 + side * 10, y: y0 + 20, w: 7, d: 112, r: 1.5 };
    const leds = Array.from({ length: 12 }, (_, i) => `<path class="dj-led" data-led="m${side}-${i}" d="${k.planOutline({ x: meter.x + 1.2, y: meter.y + meter.d - 9 - i * 8.8, w: 4.6, d: 6, r: 0.6 }, Z + 0.5, P, 2)}"/>`).join("");
    flat(part, `mixer.mastermeter${side}`, meter, Z, `<path class="dj-slot" d="${k.planOutline(meter, Z + 0.4, P, 2)}"/>` + leds);
  }
  const disp = { x: rx - 38, y: y0 + 146, w: 76, d: 44, r: 2 };
  flat(part, "mixer.fxdisplay", disp, Z, `<g transform="${planeMatrix([disp.x, disp.y, Z + 0.5], [1, 0, 0], [0, 1, 0])}"><rect class="dj-screen" width="${disp.w}" height="${disp.d}" rx="2"/><text class="dj-fx-name" data-fxname x="5" y="13" font-size="9">ECHO</text><text class="dj-fx-sub" data-fxbeat x="5" y="26" font-size="8">1 BEAT</text><text class="dj-fx-sub" data-fxsrc x="${disp.w - 5}" y="26" font-size="8" text-anchor="end">MST</text><rect class="dj-fx-bar-bg" x="5" y="33" width="${disp.w - 10}" height="5"/><rect class="dj-fx-bar" data-fxdepth x="5" y="33" width="0" height="5"/></g>`);
  const tri = (pts) => `<path class="dj-glyph" d="${path3(pts, true)}"/>`;
  button(part, "fxbeat-down", [rx - 38, y0 + 198], [rx - 14, y0 + 212], Z, "Beat FX beat: shorter", { act: "fxbeat", dir: -1 }, { glyph: tri([[rx - 22, y0 + 201, Z + 3.05], [rx - 22, y0 + 209, Z + 3.05], [rx - 30, y0 + 205, Z + 3.05]]) });
  button(part, "fxbeat-up", [rx + 14, y0 + 198], [rx + 38, y0 + 212], Z, "Beat FX beat: longer", { act: "fxbeat", dir: 1 }, { glyph: tri([[rx + 22, y0 + 201, Z + 3.05], [rx + 22, y0 + 209, Z + 3.05], [rx + 30, y0 + 205, Z + 3.05]]) });
  knob(part, "fxselect", rx, y0 + 230, Z, 9, "Beat FX select", { min: 0, max: 13, value: 1, def: 1, steps: 14, label: "BEAT FX" }, { ring: false });
  ["1", "2", "3", "4", "MIC", "XF A", "XF B", "MST"].forEach((name, i) => {
    const bx = rx - 30 + (i % 4) * 20;
    const by = y0 + 252 + Math.floor(i / 4) * 16;
    button(part, `fxch-${i}`, [bx - 8, by], [bx + 8, by + 12], Z, `Beat FX channel select ${name}`, { act: "fxch", src: name }, { role: "radio", h: 2.4 });
  });
  const xpad = { x: rx - 40, y: y0 + 292, w: 80, d: 16, r: 3 };
  const zones = Array.from({ length: 7 }, (_, i) => k.lineOnTop([xpad.x + (i + 1) * 10, xpad.y], [xpad.x + (i + 1) * 10, xpad.y + xpad.d], Z + 0.9, P)).join("");
  put(part, "mixer.xpad", [xpad.x + 40, xpad.y + 8, Z + 0.5], `<g${aria("xpad", "slider", "X-PAD: slide a finger to play beat-timed effects")}>${S(k.slabOf(xpad, Z, 0.9, P, 3), { tone: "lo", crease: "none" })}${Ln(zones, { tone: "mid" })}<path class="dj-xpad-hot" data-xpad d=""/></g>`, [record(A.slab(xpad, Z, 0.9, { name: "mixer.xpad" }, 3))], { bias: 0.5 });
  ctl({ id: "xpad", kind: "xpad", x0: xpad.x, x1: xpad.x + xpad.w, y0: xpad.y, y1: xpad.y + xpad.d, z: Z + 0.9, label: "X-PAD" });
  knob(part, "depth", rx - 14, y0 + 336, Z, 10, "Beat FX level and depth", { min: 0, max: 1, value: 0.5, def: 0.5, label: "LEVEL/DEPTH" });
  roundButton(part, "fxon", rx + 20, y0 + 336, 11, Z, "Beat FX on or off", { act: "fxon" });
  for (const yy of [382, 410]) box(part, "mixer.send", [rx - 30, y0 + yy, Z], [rx + 30, y0 + yy + 14, Z + 2.4], { tone: "mid" }, { r: 1.2, steps: 3 });
  // jacks on the back face: CH2 and CH3 inputs, BOOTH out, MASTER out
  MIX.in2 = [STRIPS[1].x, y0 - 1.5, 14];
  MIX.in3 = [STRIPS[2].x, y0 - 1.5, 14];
  MIX.master = [x0 + w - 40, y0 - 1.5, 14];
  MIX.booth = [x0 + w - 80, y0 - 1.5, 14];
  for (const p of [MIX.in2, MIX.in3, MIX.master, MIX.booth]) box(part, "mixer.jack", [p[0] - 11, y0 - 1.5, 4.5], [p[0] + 11, y0, 23.5], { tone: "lo" }, { r: 0.6 });
  MIX.strips = STRIPS;
}

// ---------- the stage box, cables: each player into its channel, the master out to the stage box ----------
box("cables", "stagebox", [STAGEBOX.x, STAGEBOX.y, 0], [STAGEBOX.x + STAGEBOX.w, STAGEBOX.y + STAGEBOX.d, 32], { tone: "mid" }, { r: 3, steps: 3, bevel: 0.6, inner: Ln(k.sideSeam(STAGEBOX, 6, P, 3), { tone: "faint" }), extra: Dots(k.corners(STAGEBOX, 5).map(([x, y]) => at([x, y, 32])), { size: 0.45 }) });
record(A.slab(STAGEBOX, 0, 0.5, { name: "stand.stagebox", ground: true }, 3));
const STAGE_IN = [166.5, STAGEBOX.y + STAGEBOX.d + 1.5, 14];
box("cables", "stagebox.jack", [STAGE_IN[0] - 11, STAGEBOX.y + STAGEBOX.d, 4.5], [STAGE_IN[0] + 11, STAGE_IN[1], 23.5], { tone: "lo" }, { r: 0.6 });
box("cables", "stagebox.jack", [STAGEBOX.x + 10, STAGEBOX.y + STAGEBOX.d, 9], [STAGEBOX.x + 28, STAGE_IN[1], 23], { tone: "lo" }, { r: 0.6 });
const CABLES = {};
function cable(name, control, r, { shells = [true, true], bend = 14, touch } = {}) {
  const route = G.fillet(control, Math.max(bend, r * 2.6), 10, { P, tube: r });
  const total = G.pathLength(route);
  const SHELL = Math.max(8, r * 3);
  const gaps = [...(shells[0] ? [[0, SHELL]] : []), ...(shells[1] ? [[total - SHELL, total]] : [])];
  R.route(name, route, r, { owner: name, gaps, limp: true, touch, rims: shells.map((s) => (s ? r * 1.7 : r)), piece: "booth" });
  tubePieces(route, r, P, { maxLength: 30, spacing: 1.6, gaps }).forEach((piece, index) => put("cables", `${name}:${index}`, piece.mid, tubeSvg(piece, { tone: "mid" }), [A.tube(piece.points, piece.radii)]));
  [0, 1].forEach((i) => {
    if (!shells[i]) return;
    const end = i ? route[route.length - 1] : route[0];
    const tangent = G.tangentAlong(route, i ? total : 0);
    const F = G.frameAlong(end, tangent);
    const [s0, s1] = i ? [-SHELL, 0] : [0, SHELL];
    disc("cables", `${name}.plug${i}`, F, s0, s1, r * 1.7, { tone: "hi" }, { owner: name });
  });
  CABLES[name] = G.resample(route, 6).map((p) => at(p).map(f2));
}
const runY = MIX.y - 46;
// the player cables drop to lie flat on the table; the master cable crosses over them
const FLAT = 3.5;
cable("cable.ch2", [DECKS[0].port, [DECKS[0].port[0], -238, 14], [DECKS[0].port[0], -262, FLAT], [MIX.in2[0], -262, FLAT], [MIX.in2[0], -240, 14], MIX.in2], 3.4, { bend: 10, touch: ["stand.desk"] });
cable("cable.ch3", [DECKS[1].port, [DECKS[1].port[0], -238, 14], [DECKS[1].port[0], -262, FLAT], [MIX.in3[0], -262, FLAT], [MIX.in3[0], -240, 14], MIX.in3], 3.4, { bend: 10, touch: ["stand.desk"] });
cable("cable.master", [MIX.master, STAGE_IN], 4.4, { bend: 12 });

A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
const groups = R.items.map((item) => `<g class="${item.cls}"${item.attrs}>${item.svg}</g>`);

// ---------- anatomy callouts: side columns for the players, bands above and below for the mixer ----------
const D0 = DECKINFO[0];
const D1 = DECKINFO[1];
const M = MIX;
const sx = (n) => M.strips[n - 1].x;
const CALLOUTS = [
  { n: 1, zone: "L", name: "Touchscreen", what: "Browse, load and needle-search a track", hint: "Tap a track in the list to load it", ids: ["screen-0"], anchor: [D0.cx - 60, D0.y0 + 60, CDJ.h + 2] },
  { n: 2, zone: "L", name: "Hot cues A–H", what: "Save a cue, then jump back on the beat", hint: "While playing, tap pad A, then tap it again", ids: ["hot-0-0", "hot-0-1"], anchor: [D0.cx - 126, D0.y0 + 177, CDJ.h + 3] },
  { n: 3, zone: "L", name: "Loop section", what: "Loop In/Out, Reloop/Exit, 4 or 8 beats", hint: "Press 4 BEAT, then 4 BEAT again to halve it", ids: ["loopin-0", "loopout-0", "reloop-0", "beat4-0", "beat8-0"], anchor: [D0.x0 + 28, D0.y0 + 248, CDJ.h + 3] },
  { n: 4, zone: "L", name: "Beat jump", what: "Skip back or forward by whole beats", hint: "Press ▶ to skip ahead 16 beats", ids: ["jumpb-0", "jumpf-0"], anchor: [D0.x0 + 28, D0.y0 + 315, CDJ.h + 3] },
  { n: 5, zone: "L", name: "Cue and Play/Pause", what: "Set the cue; start or stop on the bar", hint: "Press PLAY: it starts on the next bar", ids: ["cue-0", "play-0"], anchor: [D0.x0 + 28, D0.y0 + 396, CDJ.h + 4] },
  { n: 6, zone: "L", name: "Jog wheel", what: "Nudge or scratch; its display turns with the track", hint: "Drag the platter forward to nudge", ids: ["jog-0"], anchor: [D0.cx + 14, D0.y0 + 318, CDJ.h + 8] },
  { n: 7, zone: "R", name: "Tempo slider", what: "Changes the tempo within the range shown", hint: "Turn SYNC off, then move the slider", ids: ["tempo-1"], anchor: [D1.x0 + CDJ.w - 24, D1.y0 + 336, CDJ.h] },
  { n: 8, zone: "R", name: "Tempo range · Master Tempo", what: "±6/10/16%; keeps the key when sped up", hint: "Turn Master Tempo off, then move the tempo", ids: ["range-1", "mt-1"], anchor: [D1.x0 + CDJ.w - 24, D1.y0 + 213, CDJ.h + 3] },
  { n: 9, zone: "R", name: "Sync and Master", what: "Lock this deck's tempo to the master", hint: "Press SYNC on this deck", ids: ["sync-1", "master-1"], anchor: [D1.cx + 104, D1.y0 + 213, CDJ.h + 3] },
  { n: 10, zone: "T", name: "Beat FX", what: "Pick an effect and its beat length", hint: "Turn BEAT FX to REVERB", ids: ["fxselect", "fxbeat-down", "fxbeat-up"], anchor: [M.x + M.w - 54, M.y + 168, M.h] },
  { n: 11, zone: "R", name: "FX channel select", what: "Choose which channel the effect hears", hint: "Press 2 to effect the left player only", ids: ["fxch-1", "fxch-2", "fxch-7"], anchor: [M.x + M.w - 54, M.y + 262, M.h + 2.4] },
  { n: 12, zone: "R", name: "X-PAD", what: "Slide a finger to play the effect", hint: "Slide across the X-PAD while a track plays", ids: ["xpad"], anchor: [M.x + M.w - 54, M.y + 300, M.h + 1] },
  { n: 13, zone: "B", name: "Level/Depth · On/Off", what: "Set how much effect; switch it on", hint: "Press ON, then turn LEVEL/DEPTH up", ids: ["depth", "fxon"], anchor: [M.x + M.w - 54, M.y + 336, M.h + 4] },
  { n: 14, zone: "T", name: "Trim", what: "Matches each channel's input level", hint: "Turn Trim until both meters match", ids: ["trim-2", "trim-3"], anchor: [sx(2), M.y + 62, M.h + 6] },
  { n: 15, zone: "T", name: "EQ · Hi, Mid, Low", what: "Cut or boost each frequency band", hint: "Kill the Low on channel 2, then bring in channel 3", ids: ["low-2", "low-3"], anchor: [sx(3), M.y + 130, M.h + 6] },
  { n: 16, zone: "T", name: "Master level and meters", what: "Overall volume and the real output level", hint: "Watch the meters as you push a fader", ids: ["master"], anchor: [M.x + M.w - 30, M.y + 60, M.h] },
  { n: 17, zone: "T", name: "Booth level", what: "Sets the DJ's booth monitor volume", hint: "Booth out has no monitors in this booth", ids: ["booth"], anchor: [M.x + M.w - 68, M.y + 74, M.h + 6] },
  { n: 18, zone: "T", name: "Channels 1 and 4", what: "Spare channels, unused in this booth", hint: "The players sit on channels 2 and 3", ids: [], anchor: [sx(1), M.y + 98, M.h + 6] },
  { n: 19, zone: "B", name: "Sound Color FX", what: "Six effects, one button each", hint: "Press DUB ECHO, then turn a Color knob", ids: ["cfx-0", "cfx-1", "cfx-2", "cfx-3", "cfx-4", "cfx-5"], anchor: [M.x + 40, M.y + 194, M.h + 3] },
  { n: 20, zone: "B", name: "Color FX knob", what: "Sweeps the chosen Color FX per channel", hint: "Turn channel 3's Color knob right", ids: ["color-2-knob", "color-3-knob"], anchor: [sx(2), M.y + 202, M.h + 8] },
  { n: 21, zone: "B", name: "Channel cue", what: "Pre-listen to one deck alone briefly", hint: "Press CUE on channel 3", ids: ["chcue-2", "chcue-3"], anchor: [sx(3), M.y + 237, M.h + 3] },
  { n: 22, zone: "B", name: "Channel fader and meter", what: "Sets each deck's level in the mix", hint: "Bring channel 3's fader up slowly", ids: ["fader-2", "fader-3"], anchor: [sx(2), M.y + 304, M.h + 9] },
  { n: 23, zone: "B", name: "Crossfader and assign", what: "Blends side A and side B", hint: "Slide the crossfader from A to B", ids: ["xfader", "assign-2", "assign-3"], anchor: [M.x + M.w / 2 - 10, M.y + 418, M.h + 9] },
].map((c) => ({ ...c, at: at(c.anchor).map(f2) }));
CALLOUTS.find((c) => c.n === 20).ids = ["color-2", "color-3"];

const LABEL =
  "An exploded technical drawing of a DJ booth seen from the front and above: two CDJ-3000X media players either side of a DJM-A9 four-channel mixer on a booth table. Each player shows its touchscreen, hot cue pads, loop and beat jump buttons, Cue and Play, jog wheel and tempo controls. The mixer shows four channel strips with trim, three-band EQ, Color FX knobs, cue buttons, faders and meters, the Sound Color FX buttons on the left, the master and Beat FX sections with the X-PAD on the right, and the crossfader at the front. Cables run from each player into mixer channels 2 and 3, and from the master out through a grommet in the table.";
const svg = k.figureSvg({ width: W, height: H, label: LABEL, body: [`<g class="dj-back">${back.join("")}</g>`, `<g class="dj-booth">${groups.join("")}</g>`, `<g class="dj-flow" aria-hidden="true"></g>`, `<g class="dj-callouts"></g>`] });

const DATA = { P, W, H, MARGIN, TOP, BAND, EX: unit([1, 0, 0]), EY: unit([0, 1, 0]), controls: CONTROLS, cables: CABLES, callouts: CALLOUTS, screen: SCREEN };
const CSS = readFileSync(join(HERE, "dj.css"), "utf8");
const ENGINE = readFileSync(join(HERE, "engine.js"), "utf8").replace(/^export /gm, "");
const UI = readFileSync(join(HERE, "ui.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));

const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Anatomy of a DJ booth · CDJ-3000X × DJM-A9</title>
<style>${k.ISO_CSS}${CSS}</style></head><body class="iso" data-theme="light"><main class="dj-page">
<header class="dj-head"><h1>ANATOMY OF A DJ BOOTH</h1><p>CDJ-3000X × DJM-A9</p></header>
<figure class="dj-figure"><div class="dj-stage" data-labels="full">${svg}
<div class="dj-tip" role="status" aria-live="polite"></div>
<div class="dj-start"><button type="button" class="dj-start-btn">Start the booth</button><p>Nothing plays until you press it. Then load a track on each player and press PLAY.</p></div>
</div>
<div class="dj-bar">
  <div class="dj-readout"><span data-clock>124.0 BPM · A minor</span></div>
  <div class="dj-tools">
    <button type="button" class="dj-tool" data-tool="labels" aria-pressed="true">Labels: full</button>
    <button type="button" class="dj-tool" data-tool="flow" aria-pressed="true">Signal flow: on</button>
    <button type="button" class="dj-tool dj-zoomout" data-tool="overview" hidden>Overview</button>
  </div>
</div>
<figcaption class="dj-legend">
  <span class="dj-key"><svg width="26" height="8" aria-hidden="true"><path d="M1 4H25" class="dj-key-audio"/></svg>Audio path: each player → its mixer channel (2 and 3) → master out</span>
  <span class="dj-caption">Eight original tracks are synthesized in your browser with the Web Audio API at 124 BPM in A minor, so any two blend. Everything you trigger lands on the next beat or bar. Keyboard: Tab moves through the controls in panel order, arrows adjust, Space or Enter presses; Q and P play the left and right players. Double-click a knob or fader to reset it. Control positions follow the CDJ-3000X and DJM-A9 panel layouts, drawn in this illustration's own style; model names are plain labels, not logos.</span>
</figcaption>
<ol class="dj-list"></ol>
</figure>
<p class="credit">Made by Studio Little Nice Things</p>
</main>
<script type="module">${(kitScript() + ENGINE + UI).replace(/<\/(script)/gi, "<\\/$1")}</script>
</body></html>`;
writeFileSync(join(HERE, "dj-booth.html"), page);
console.log("wrote dj-booth.html", `${(page.length / 1024).toFixed(0)} KB`, `${R.items.length} items`, `${R.solids.length} solids`, `${CONTROLS.length} controls`, `scale ${KS.toFixed(3)}`);
A.auditOrExit(R, P, {});
