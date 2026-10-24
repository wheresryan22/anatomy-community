// Roadster loop rig — build. Standalone page (dark, or --light).
import { writeFileSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url));
// resolve() keeps SKILL absolute whether it is the local path or the gallery's rewritten
// relative .skill link, so readFileSync below never depends on the process cwd.
const SKILL = resolve(HERE, "../../../../.skill");
const k = await import(join(SKILL, "kit/iso-kit.mjs"));
const G = await import(join(SKILL, "kit/lathe.mjs"));
const { kitScript } = await import(join(SKILL, "scripts/inline-kit.mjs"));
const { makeParts } = await import("./parts.mjs");
const M = await import("./model.mjs");
const theme = process.argv.includes("--light") ? "light" : "dark";
const WIDTH = 1000, HEIGHT = 700;

const { RIG, LIP, APEX, TL, LAND_X } = M;
const R = RIG.R, CH = R + RIG.chordOut;                     // track radius, lower-chord radius
const tp = (phi, r = R) => [-r * Math.sin(phi), r * (1 - Math.cos(phi))];   // x,z at loop angle
const upOf = (phi) => [Math.sin(phi), Math.cos(phi)];                        // track-up (toward centre), 2D (x,z)
const up3 = (phi) => [Math.sin(phi), 0, Math.cos(phi)];                     // the same as a 3D axis
const D2 = Math.PI / 180;

// ---- camera ------------------------------------------------------------------
const PLATE = { x: -60, y: -48, w: 202, d: 106, r: 8 };
const P = k.fitProjection([
  ...k.boxCorners(PLATE, -9, 0),
  [LIP.x, -8, LIP.z + 2], [LIP.x, 8, LIP.z + 2], [APEX.x, 0, APEX.z + 6], [APEX.x - 8, 0, APEX.z + 2], [APEX.x + 8, 0, APEX.z + 2],
  [-CH * Math.sin(90 * D2), -11, CH * (1 - Math.cos(90 * D2)) + 1], [-26, 11, 56], [-26, -11, 56],
  [4, 9, 1], [132, 9, 1], [LAND_X, 0, 6], [122.7, 0, 5], [APEX.x, -20, APEX.z], [-50, 51, 1],
], WIDTH, HEIGHT, { pad: 30, azimuth: 42, elevation: 26 });

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const KK = P.scale * 1.2649;

const PARTS = makeParts(k, G, P, { wheelR: RIG.wheelR, landX: LAND_X });
const st0 = M.stateAt(0.4);

const out = [];
const put = (svg) => { if (svg) out.push(svg); };
// depth-sorted buckets
const loopFar = [], loopDeck = [], loopNear = [];
const putD = (bucket, centre, svg) => bucket.push({ d: G.dot3(centre, G.viewOf(P)), svg });
const flush = (bucket) => { bucket.sort((a, b) => a.d - b.d); for (const item of bucket) out.push(item.svg); bucket.length = 0; };

// ---- 1. ground plate -----------------------------------------------------------
put(`<path class="iso-halo" d="${k.haloOf(PLATE, -9, 9, P)}"/>`);
for (const [x, y] of [[-48, -38], [-48, 38], [34, -38], [34, 38], [124, -38], [124, 38]].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))) {
  put(S(k.cylinder(x, y, 4.6, -9, 1.2, P, 24), { tone: "lo" }));
  put(S(k.cylinder(x, y, 3.4, -7.8, 2.4, P, 24), { tone: "mid" }));
}
put(S(k.slabOf(PLATE, -5.4, 5.4, P, 8, 1.2), { tone: "mid" }));
put(Ln(k.planOutline({ x: PLATE.x + 4, y: PLATE.y + 4, w: PLATE.w - 8, d: PLATE.d - 8, r: 0.5 }, 0.02, P, 8), { tone: "lo" }));
{
  const g = [];
  for (let x = -40; x <= 120; x += 20) g.push(k.lineOnTop([x, -44], [x, 54], 0.03, P));
  for (let y = -40; y <= 50; y += 20) g.push(k.lineOnTop([-56, y], [138, y], 0.03, P));
  put(Ln(g.join(""), { tone: "faint" }));
}
{
  const screws = k.corners(PLATE, 10);
  put(Ln(screws.map(([x, y]) => k.ring(x, y, 1.8, 0.04, P, 16)).join(""), { tone: "lo" }));
  put(Dots(screws.map(([x, y]) => at([x, y, 0.05])), { size: 0.45 }));
}
// ground label plate (rule lines only; the one engraved label lives on the console)
{
  const LP = { x: -50, y: 34, w: 40, d: 17, r: 1.5 };
  put(S(k.slabOf(LP, 0, 0.5, P, 3, 0.25), { tone: "mid" }));
  put(Ln(k.planOutline(k.insetPlan(LP, 1.6), 0.55, P, 3), { tone: "faint" }));
  put(k.faceTextSvg(k.topMatrix([-46, 38.5], 0.6, P), "ROADSTER LOOP RIG · No.1", { size: 3.4, tone: "hi" }));
  put(Ln(k.lineOnTop([-46, 44], [-24, 44], 0.6, P) + k.lineOnTop([-46, 47.5], [-18, 47.5], 0.6, P), { tone: "lo", free: true }));
  put(Dots([at([LP.x + 3, LP.y + 3, 0.55]), at([LP.x + LP.w - 3, LP.y + LP.d - 3, 0.55])], { size: 0.4 }));
}

// ---- 2. runways (flush inlays) ----------------------------------------------------
const runway = (x0, x1, half) => {
  put(S(k.slabOf({ x: x0, y: -half, w: x1 - x0, d: half * 2, r: 0.4 }, 0, 0.08, P, 2), { tone: "lo", flat: true, crease: "none" }));
  put(Ln(k.lineOnTop([x0, 0], [x1, 0], 0.12, P), { tone: "hi" }));
  const e = half - 0.5;
  put(Ln(k.lineOnTop([x0, e], [x1, e], 0.12, P) + k.lineOnTop([x0, -e], [x1, -e], 0.12, P), { tone: "lo" }));
};
runway(4, 132, 9);                // one strip: the car runs in, lands rolling, and taxis out
put(Ln(k.lineOnTop([0, 0], [4, 0], 0.12, P), { tone: "hi" }));   // ties the loop centre line to the runway
put(S(k.slabOf({ x: -2, y: -8, w: 6, d: 16, r: 0.4 }, 0, 0.08, P, 2), { tone: "lo", flat: true, crease: "none" }));  // apron
// witness disc where the flight template meets the runway
put(S(k.cylinder(LAND_X, 0, 1.3, 0.1, 0.25, P, 20), { tone: "mid" }));

// ---- 3. the C-arc loop ------------------------------------------------------------
{
  const SEG = 7.5 * D2, STEP = 15 * D2;
  const yBand = (side) => (side < 0 ? [-9.4, -8.2] : [8.2, 9.4]);
  // deck segments
  for (let i = 0; i < Math.round(Math.PI / SEG); i++) {
    const a0 = i * SEG, a1 = a0 + SEG, am = (a0 + a1) / 2;
    const p0 = tp(a0), p1 = tp(a1);
    const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const u = [(p1[0] - p0[0]) / L, 0, (p1[1] - p0[1]) / L];
    const F = G.frameOf([p0[0], 0, p0[1]], [0, 1, 0], u, up3(am));
    putD(loopDeck, [p0[0], 0, p0[1]], S(G.prismOf(F, [[0, -1.2], [L + 0.06, -1.2], [L + 0.06, 0], [0, 0]], -8, 8, P), { tone: "mid", crease: "none" }));
  }
  // deck line: the white centre guide
  {
    const pts = (y, r) => { const list = []; for (let a = 0; a <= Math.PI + 1e-6; a += 5 * D2) { const p = tp(a, r); list.push(at([p[0], y, p[1] + 0.06])); } return k.pathOf(list); };
    putD(loopDeck, [0, 0, R], Ln(pts(0, R), { tone: "hi" }));
  }
  // lip end plate
  {
    const F = G.frameOf([0, 0, 2 * R], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    putD(loopDeck, [0.4, 0, 2 * R], S(G.prismOf(F, [[-0.5, -1.25], [0.5, -1.25], [0.5, 0.5], [-0.5, 0.5]], -8, 8, P), { tone: "hi", crease: "lo" }));
  }
  // truss: chords, radials, diagonals, both sides
  for (const side of [-1, 1]) {
    const bucket = side < 0 ? loopFar : loopNear;
    const [y0, y1] = yBand(side);
    const ym = (y0 + y1) / 2;
    const member = (p0, p1, half, tone) => {
      const d = [p1[0] - p0[0], 0, p1[1] - p0[1]];
      const L = Math.hypot(d[0], d[2]);
      const u = [d[0] / L, 0, d[2] / L];
      const F = G.frameOf([p0[0], ym, p0[1]], [0, 1, 0], u, [-u[2], 0, u[0]]);
      putD(bucket, [p0[0] + d[0] / 2, ym, p0[1] + d[2] / 2], S(G.prismOf(F, [[-half, -half], [L + half, -half], [L + half, half], [-half, half]], y0 - ym, y1 - ym, P), { tone, crease: "none" }));
    };
    for (let i = 0; i < 12; i++) {
      const a0 = 23.5 * D2 + i * STEP, a1 = Math.min(a0 + STEP, Math.PI);
      if (a0 >= Math.PI) break;
      const c0 = tp(a0, CH), c1 = tp(a1, CH);
      member(c0, c1, 0.6, side < 0 ? "lo" : "mid");                       // lower chord
      const d0 = tp(a0, R - 1.2);
      member(d0, c0, 0.5, side < 0 ? "lo" : "mid");                        // radial web
      const d1 = tp(a1, R - 1.2);
      if (i % 2 === 0) member(d0, c1, 0.42, side < 0 ? "lo" : "mid");
      else member(c0, d1, 0.42, side < 0 ? "lo" : "mid");
      // node gusset dots
      putD(bucket, [c0[0], y1 * 0.98, c0[1]], Dots([at([c0[0], y1 + (side > 0 ? 0.08 : -0.08), c0[1]])], { size: 0.4 }));
    }
  }
  // cross braces below the deck (only the lower quadrant: the flight path owns the top)
  for (const a of [35 * D2, 65 * D2, 95 * D2]) {
    const p = tp(a, R + 2.2);
    const tan = [-Math.cos(a), 0, Math.sin(a)];
    const F = G.frameOf([p[0], 0, p[1]], [0, 1, 0], tan, up3(a));
    putD(loopFar, [p[0], 0, p[1]], S(G.prismOf(F, [[-0.6, -0.6], [0.6, -0.6], [0.6, 0.6], [-0.6, 0.6]], -8.2, 8.2, P), { tone: "lo", crease: "none" }));
  }
  // A-frame towers at 45/90/135 deg, legs out at y +-10.5 (the car passes between them)
  for (const a of [45 * D2, 90 * D2, 135 * D2]) {
    const apex = tp(a, CH);
    for (const side of [-1, 1]) {
      const bucket = side < 0 ? loopFar : loopNear;
      const yb = side * 10.6;
      for (const splay of [-3.5, 3.5]) {
        const foot = [apex[0] + splay, yb, 0];
        const top = [apex[0], side * 9.6, apex[1] - 0.6];
        const d = [top[0] - foot[0], top[1] - foot[1], top[2] - foot[2]];
        const L = G.len3(d);
        const u = G.mul3(d, 1 / L);
        let v = G.unit3(G.cross3([0, 1, 0], u));
        if (G.len3(G.cross3([0, 1, 0], u)) < 0.2) v = [1, 0, 0];
        const w = G.unit3(G.cross3(u, v));
        const F = G.frameOf(foot, u, v, w);
        putD(bucket, [(foot[0] + top[0]) / 2, yb, (foot[2] + top[2]) / 2], S(G.prismOf(F, [[-0.55, -0.55], [0.55, -0.55], [0.55, 0.55], [-0.55, 0.55]], 0, L, P), { tone: side < 0 ? "lo" : "mid", crease: "none" }));
        putD(bucket, foot, S(k.slabOf({ x: foot[0] - 1.7, y: yb - 1.3, w: 3.4, d: 2.6, r: 0.4 }, 0, 0.5, P, 2, 0.25), { tone: "lo" }));
        putD(bucket, foot, Dots([at([foot[0] - 1.1, yb, 0.55]), at([foot[0] + 1.1, yb, 0.55])], { size: 0.4 }));
      }
      // yoke onto the chord
      const yoke = G.frameOf([apex[0], side * 9.6, apex[1] - 0.9], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
      putD(side < 0 ? loopFar : loopNear, [apex[0], side * 9, apex[1]], S(G.prismOf(yoke, [[-2.6, -0.5], [2.6, -0.5], [2.6, 1.4], [-2.6, 1.4]], side < 0 ? -0.2 : -1.2, side < 0 ? 1.2 : 0.2, P), { tone: side < 0 ? "lo" : "mid", crease: "none" }));
    }
  }
}
flush(loopFar);
flush(loopDeck);
put(`<g id="slot-loop"></g>`);
// strobe ghosts (before the near truss so the lattice reads in front where they meet)
{
  const ghosts = M.ghostStates();
  ghosts.sort((a, b) => k.depthOf([a.pos[0], 0, a.pos[1]], P) - k.depthOf([b.pos[0], 0, b.pos[1]], P));
  for (const g of ghosts) put(`<g data-ghost="${g.index}">${PARTS.car(g, { ghost: true })}</g>`);
}
flush(loopNear);

// ---- 4. flight template: dotted path, apex cross, witness wand ----------------------
{
  const pts = M.templatePoints().map(([x, z]) => at([x, 0, z]));
  pts[0] = at([0.5, 0, 2 * R + 0.5]);   // the path leaves from the lip plate's top front edge
  put(Ln(k.pathOf(pts), { tone: "lo", dotted: true }));
  // apex marker: a closed ring (no floating ends) + witness wand beside the approach path
  const ax = APEX.x;
  put(Ln(k.ring(ax, 0, 1.8, APEX.z, P, 24), { tone: "mid" }));
  put(Ln(k.pathOf([at([ax, -1.8, APEX.z]), at([ax, -20, APEX.z])]), { tone: "faint", dashed: true }));
  put(S(k.cylinder(ax, -20, 2.6, 0, 1.2, P, 20), { tone: "lo" }));
  put(S(k.cylinder(ax, -20, 0.7, 1.2, APEX.z - 1.2, P, 12), { tone: "mid", crease: "none" }));
  put(S(k.slabOf({ x: ax - 0.35, y: -21.4, w: 0.7, d: 0.5, r: 0.2 }, 4, APEX.z - 1.2, P, 2), { tone: "mid" }));
  {
    let tk = "";
    for (let z = 10; z <= 60; z += 10) tk += k.pathOf([at([ax + 0.35, -21.45, z]), at([ax + (z % 50 === 0 ? 1.7 : 1.0), -21.45, z])]);
    put(Ln(tk, { tone: "lo" }));
  }
  put(S(k.slabOf({ x: ax - 1.7, y: -20.35, w: 3.4, d: 0.7, r: 0.2 }, APEX.z - 0.15, 0.35, P, 2), { tone: "hi", flat: true, crease: "none" }));
}
put(`<g id="slot-air"></g>`);

// ---- 6. ground slot + fog -------------------------------------------------------------
put(`<g id="slot-ground"><g id="rf-shadow">${PARTS.shadow(st0)}</g><g id="rf-plume"></g><g id="rf-car">${PARTS.car(st0)}</g><g id="rf-jets"></g></g>`);
put(`<g id="rf-fog"></g>`);

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "Roadster inverted loop rig: a C-shaped open steel ramp with a white guide line. Fan adhesion climbs it fast, the car leaves the crown upside down, coasts ballistically, barrel-rolls upright on cold gas mid-arc, trims attitude, then descends on four main columns while keeping forward speed, touches down rolling and taxis out of the fog.",
  body: out.join(""),
});

// ---- page -------------------------------------------------------------------------
const DATA = {
  P,
  parts: { wheelR: RIG.wheelR, landX: LAND_X },
};
const CSS = `
.rf-stage{cursor:crosshair;touch-action:pan-y}
.rf-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
.rf-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.rf-sound{position:absolute;bottom:13px;left:50%;transform:translateX(-50%);z-index:3;cursor:pointer;
 font:10.5px/1 var(--anatomy-mono);letter-spacing:.04em;color:var(--anatomy-muted);
 background:transparent;border:1px solid var(--anatomy-muted);border-radius:2px;padding:5px 9px;opacity:.85}
.rf-sound:hover{color:var(--anatomy-strong);border-color:var(--anatomy-strong);opacity:1}
.rf-sound:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:2px}
.iso{--rf-plume:#eceae4;--rf-plume-edge:#8f8f8a;--rf-plume-core:#ffffff;--rf-fog:#d9d9d2;--rf-glow:#79e6ff}
.iso[data-theme="light"]{--rf-plume:#ffffff;--rf-plume-edge:#b0b0b5;--rf-plume-core:#efefeb;--rf-fog:#ffffff;--rf-glow:#0e8fb8}
.rf-plume{fill:var(--rf-plume);stroke:var(--rf-plume-edge);stroke-width:.35}
.rf-plume-core{fill:none;stroke:var(--rf-plume-core);stroke-linecap:round}
.rf-fog{fill:var(--rf-fog);stroke:none;filter:blur(5px)}
.rf-jet{fill:var(--anatomy-blue);stroke:none}
.rf-jet-w{fill:var(--rf-plume);stroke:var(--rf-plume-edge);stroke-width:.3}
.rf-jet-core{fill:none;stroke:var(--rf-plume-core);stroke-linecap:round}
.rf-glow{fill:none;stroke:var(--rf-glow);stroke-width:.9;stroke-linecap:round;stroke-linejoin:round}
.rf-glowdot{fill:var(--rf-glow);stroke:none}
`;
const latheSource = readFileSync(join(SKILL, "kit/lathe.mjs"), "utf8")
  .replace(/^import .*$/m, "")
  .replace(/^export /gm, "");
const latheScript = `const G = (() => {${latheSource}\nreturn { viewOf, scaleOf, frameAlong, frameOf, pointOf, disc, ringBand, sphereOf, prismOf, solidOf, circleOf, arcOf, dot3, add3, sub3, mul3, unit3, cross3, len3, lerp3, lightOf, toneOf, radialOf };})();\n`;
const modelScript = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");
const partsScript = readFileSync(join(HERE, "parts.mjs"), "utf8").replace(/^export /gm, "");
const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));

const body =
  `<style>${CSS}</style>` +
  k.plateHtml({
    fig: "Fig 1",
    title: "Roadster Inverted Loop Rig",
    hint: "Auto-loops · Space play/pause · ←→ step · S slow-mo · M sound",
    readout: M.readoutOf(M.stateAt(0)),
    keys: [
      { mark: "lit", label: "Roadster: fan climb, inverted crown, mid-air barrel roll, trim, four-column descent — one model" },
      { mark: "dim", label: "Strobe ghosts: climb, wall, inverted, exit, coast, roll, trim, descent, touchdown — nine frozen moments" },
      { mark: "dotted", label: "Flight template: the true forward arc from lip to touchdown, with the apex ring and 67.5 ft witness wand" },
    ],
    caption:
      "A C-shaped open steel ramp, radius 32.2 ft, lip 64.4 ft up. The Roadster charges over the crown at 52 ft/s; twin underbody turbine fans pull it through the 90° vertical wall (G 0.9) and past the crown into an inverted run (G 0.8), and it leaves the lip upside down, nose pointing the way it will travel. From there it is one continuous forward arc — never a hover: no jets through the ballistic coast (G 0.4), then cold gas fires mid-air, a long jet from the left flank and a down-jet on the right rolling it upright in 0.55 s while it is still falling forward, and short trim puffs level the nose. Only then do the four main columns light to soften the last of the descent (G 1.4). Forward speed is kept all the way down, so it touches down rolling — not vertically — the suspension soaks it once with no bounce, and it taxis out of the fog. The readout (G, altitude, phase) and the picture come from one model.",
    body: `<div class="iso-stage rf-stage" tabindex="0" role="group" aria-label="Roadster inverted loop stunt: fan-adhesion climb, upside-down crown exit, mid-air cold-gas barrel roll, attitude trim, then a four-column powered descent that keeps forward speed to a rolling touchdown and a taxi out of the fog. Space to play or pause, arrow keys to step, S for slow motion." aria-valuetext="${M.readoutOf(M.stateAt(0))}">${svg}<span class="rf-sr" role="status" aria-live="polite" data-status></span><button class="rf-sound" id="rf-sound" type="button" aria-pressed="false" title="Toggle sound (M)">🔇 Sound off</button></div>`,
  });

const page = k.pageHtml({ title: "Roadster loop rig", theme, body, script: kitScript() + latheScript + modelScript + partsScript + LIVE, width: 1040 });
const name = theme === "light" ? "roadster-loop-light.html" : "roadster-loop.html";
writeFileSync(join(HERE, name), page);
const solids = (page.match(/iso-solid/g) || []).length;
const paths = (page.match(/<path/g) || []).length;
console.log("wrote", name, `${(page.length / 1024).toFixed(0)} KB`, `${solids} solids`, `${paths} paths`, `scale ${P.scale.toFixed(3)}`);
