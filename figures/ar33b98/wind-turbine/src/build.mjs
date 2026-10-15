import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// The kit, one full path per file (the gallery repoints each to its own copy).
const KIT_ISO = new URL("../../../../.skill/kit/iso-kit.mjs", import.meta.url);
const KIT_LATHE = new URL("../../../../.skill/kit/lathe.mjs", import.meta.url);
const k = await import(KIT_ISO.href);
const G = await import(KIT_LATHE.href);
const { glCamera } = await import(new URL("../../../../.skill/kit/gl.mjs", import.meta.url).href);
const { glScript } = await import(new URL("../../../../.skill/scripts/inline-kit.mjs", import.meta.url).href);
const M = await import("./model.mjs");
const RIG = await import("./rig.mjs");
const N2 = await import("./nacelle.mjs");

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const theme = argv.includes("--light") ? "light" : "dark";
const DEG = Math.PI / 180;
const { GEO } = RIG;
const rig = RIG.makeRig(k, G);

// ---------------------------------------------------------------- Fig 1: the turbine on its site model
const W1 = 720;
const H1 = 640;
const AZ = 45;
const EL = 30;
const PLINTH = { x: -48, y: -48, w: 96, d: 96, r: 3 };
const PL_H = 3.2;
const FOOT_H = 2.2;
const START = { v: 9, dir: 75 };

const reach = GEO.pitchX + GEO.blade.R + 0.5;
const P = k.fitProjection(
  [...k.boxCorners(PLINTH, -PL_H - FOOT_H, 0), [reach, 0, GEO.hubZ], [-reach, 0, GEO.hubZ], [0, reach, GEO.hubZ], [0, -reach, GEO.hubZ], [0, 0, GEO.hubZ + GEO.blade.R + 1.5]],
  W1,
  H1,
  { pad: 26, azimuth: AZ, elevation: EL },
);
const V = G.viewOf(P);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (pts, style) => k.dotsSvg(pts, style);
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

const back = [];
back.push(`<path class="iso-halo" d="${k.haloOf(PLINTH, -PL_H - FOOT_H, PL_H, P)}"/>`);
const feet = [...k.corners(PLINTH, 9), [PLINTH.x + PLINTH.w / 2, PLINTH.y + 9], [PLINTH.x + 9, PLINTH.y + PLINTH.d / 2], [PLINTH.x + PLINTH.w / 2, PLINTH.y + PLINTH.d - 9], [PLINTH.x + PLINTH.w - 9, PLINTH.y + PLINTH.d / 2]];
for (const [x, y] of byDepth(feet)) {
  back.push(S(k.cylinder(x, y, 3.0, -PL_H - FOOT_H, 0.6, P, 28), { tone: "lo" }));
  back.push(S(k.cylinder(x, y, 2.3, -PL_H - FOOT_H + 0.6, FOOT_H - 0.6, P, 28), { tone: "mid" }));
}
back.push(S(k.slabOf(PLINTH, -PL_H, PL_H, P, 8, 0.7), { tone: "mid", inner: Ln(k.sideSeam(PLINTH, -PL_H + 1.1, P, 8), { tone: "faint" }) }));
back.push(Ln(k.planOutline(k.insetPlan(PLINTH, 2.2), 0, P), { tone: "lo" }));
const SCREWS = k.corners(PLINTH, 4.6);
back.push(Ln(SCREWS.map(([x, y]) => k.ring(x, y, 1.05, 0, P, 16)).join(""), { tone: "lo" }));
back.push(Dots(SCREWS.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));

// Scale bar along the near (+y) edge: 0 to 50 m, a tick every 2 m, a major every 10 m.
const RULER = { x: -40, y: PLINTH.y + PLINTH.d - 7.4, w: 54, d: 3, r: 0.3 };
back.push(S(k.slabOf(RULER, 0, 0.22, P, 3), { tone: "lo", crease: "none" }));
const ticks = k.topTicks(RULER.x + 2, RULER.x + 52, 2, 5, RULER.y + 0.25, 0.22, [0.9, 1.8], P);
back.push(Ln(ticks.minor, { tone: "lo" }), Ln(ticks.major, { tone: "mid" }));

// Label plate on the near (+x) side.
const LABEL = { x: PLINTH.x + PLINTH.w - 9.4, y: -26, w: 5.2, d: 15, r: 0.6 };
back.push(S(k.slabOf(LABEL, 0, 0.3, P, 4, 0.12), { tone: "lo" }));
back.push(Ln(k.planOutline(k.insetPlan(LABEL, 0.6), 0.3, P, 3), { tone: "faint" }));
for (const [x, len] of [[LABEL.x + 1.6, 11], [LABEL.x + 2.6, 8], [LABEL.x + 3.6, 9.5]]) back.push(Ln(k.lineOnTop([x, LABEL.y + 2], [x, LABEL.y + 2 + len], 0.3, P), { tone: "lo", free: true }));
back.push(Dots([at([LABEL.x + 2.6, LABEL.y + 1.0, 0.3]), at([LABEL.x + 2.6, LABEL.y + LABEL.d - 1.0, 0.3])], { size: 0.45 }));

// Compass dial in the near corner, with the wind needle (set live).
const DIAL = { x: 30, y: 31, r: 6.4 };
back.push(S(k.cylinder(DIAL.x, DIAL.y, DIAL.r, 0, 0.35, P, 64, 0.2), { tone: "mid" }));
back.push(Ln(k.ring(DIAL.x, DIAL.y, DIAL.r - 0.7, 0.35, P, 72), { tone: "lo" }));
const dialTicks = k.radialTicks(DIAL.x, DIAL.y, DIAL.r - 0.7, 36, 9, 0.35, [0.7, 1.5], P, Math.PI);
back.push(Ln(dialTicks.minor, { tone: "lo" }), Ln(dialTicks.major, { tone: "mid" }));
const north = [[DIAL.x - 0.45, DIAL.y + DIAL.r - 2.3], [DIAL.x + 0.45, DIAL.y + DIAL.r - 2.3], [DIAL.x, DIAL.y + DIAL.r - 1.2]];
back.push(Ln(k.onTop(north, 0.35, P, true), { tone: "mid" }));
back.push(`<path class="iso-line wt-needle" data-tone="hi" data-free="end" d=""/>`);
back.push(`<path class="iso-line wt-needle-tail" data-tone="mid" d=""/>`);
back.push(Ln(k.ring(DIAL.x, DIAL.y, 0.5, 0.35, P, 16), { tone: "mid" }));

// Crane hardstand and the access track off the model's edge.
const PAD = { x: -36, y: -15, w: 25, d: 17, r: 0.8 };
const TRACK = { x: PLINTH.x, y: -11.5, w: PAD.x - PLINTH.x + 0.6, d: 7, r: 0 };
back.push(S(k.slabOf(TRACK, 0, 0.14, P, 2), { tone: "lo", crease: "none" }));
back.push(S(k.slabOf(PAD, 0, 0.2, P, 4), { tone: "lo" }));
back.push(Ln(k.planOutline(k.insetPlan(PAD, 1.2), 0.2, P, 3), { tone: "faint" }));
for (const [x, y] of k.corners(k.insetPlan(PAD, 3.2), 0)) back.push(Ln(k.planOutline({ x: x - 1, y: y - 1, w: 2, d: 2, r: 0.2 }, 0.2, P, 2), { tone: "faint" }));

// Foundation: the buried slab's edge, the pedestal, anchor bolts and the base flange.
back.push(Ln(k.ring(0, 0, 8.6, 0, P, 72), { tone: "faint" }));
back.push(S(k.cylinder(0, 0, 3.05, 0, 0.5, P, 64, 0.12), { tone: "lo" }));
const bolts = Array.from({ length: 28 }, (_, i) => [2.68 * Math.cos((i / 28) * 2 * Math.PI), 2.68 * Math.sin((i / 28) * 2 * Math.PI), 0.5]);
back.push(Dots(bolts.filter(([x, y]) => k.depthOf([x, y, 0], P) > -1.6).map(at), { size: 0.4 }));

// Transformer kiosk with its cable trench to the tower.
const KIOSK = { x: 9.5, y: -15.5, w: 3.6, d: 2.8, r: 0.15 };
const TRENCH = [{ x: 2.8, y: -14.6, w: 6.7, d: 0.9, r: 0 }, { x: 2.8, y: -13.7, w: 0.9, d: 10.9, r: 0 }];
for (const t of TRENCH) back.push(S(k.slabOf(t, 0, 0.06, P, 2), { tone: "lo", crease: "none" }));
back.push(S(k.slabOf(k.insetPlan(KIOSK, -0.35), 0, 0.25, P, 3), { tone: "lo" }));
const kBody = S(k.slabOf(KIOSK, 0.25, 2.35, P, 3, 0.06), {
  tone: "mid",
  inner: Ln(k.sideSeam(KIOSK, 2.0, P, 3), { tone: "faint" }),
});
back.push(kBody);
const kx = KIOSK.x + KIOSK.w;
const doorFace = (y0, y1) => k.pathOf([[kx, y0, 0.45], [kx, y1, 0.45], [kx, y1, 1.85], [kx, y0, 1.85]].map(at), true);
back.push(Ln(doorFace(KIOSK.y + 0.25, KIOSK.y + 1.35) + doorFace(KIOSK.y + 1.45, KIOSK.y + 2.55), { tone: "lo" }));
const ky = KIOSK.y + KIOSK.d;
for (let i = 0; i < 4; i++) {
  const x0 = KIOSK.x + 0.45 + i * 0.75;
  back.push(Ln(k.pathOf([[x0, ky, 1.3], [x0 + 0.5, ky, 1.3], [x0 + 0.5, ky, 1.42], [x0, ky, 1.42]].map(at), true) + k.pathOf([[x0, ky, 1.55], [x0 + 0.5, ky, 1.55], [x0 + 0.5, ky, 1.67], [x0, ky, 1.67]].map(at), true), { tone: "lo" }));
}
back.push(S(k.slabOf(k.insetPlan(KIOSK, -0.2), 2.6, 0.18, P, 3, 0.05), { tone: "mid" }));
back.push(Dots([at([kx, KIOSK.y + 1.3, 1.15]), at([kx, KIOSK.y + 1.5, 1.15])], { size: 0.35 }));

// ---------------------------------------------------------------- the tower (live layer, static picture)
const TOWER_Z0 = 0.75;
const rTower = (z) => GEO.towerBase + ((GEO.towerTopR - GEO.towerBase) * (z - TOWER_Z0)) / (GEO.towerTop - TOWER_Z0);
const towerSlope = (GEO.towerTopR - GEO.towerBase) / (GEO.towerTop - TOWER_Z0);
const TF = G.frameOf([0, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const towerPaths = G.solidOf([[TOWER_Z0, GEO.towerBase], [GEO.towerTop, GEO.towerTopR]], TF, P);
const seams = [23.2, 45.6].map((z) => G.arcOf(TF, z, rTower(z), P, { slope: towerSlope })).join("");
// Door facing +y, 2.3 m tall, its sill 1.25 m up, drawn on the cone.
const DOOR_A = Math.PI / 2;
const doorPts = [];
const dHalf = 0.5;
for (let i = 0; i <= 8; i++) {
  const z = 1.25;
  const a = DOOR_A - dHalf / rTower(z) + ((2 * dHalf) / rTower(z)) * (i / 8);
  doorPts.push([rTower(z) * Math.cos(a), rTower(z) * Math.sin(a), z]);
}
for (let i = 0; i <= 8; i++) {
  const z = 3.55;
  const a = DOOR_A + dHalf / rTower(z) - ((2 * dHalf) / rTower(z)) * (i / 8);
  doorPts.push([rTower(z) * Math.cos(a), rTower(z) * Math.sin(a), z]);
}
const door = k.pathOf(doorPts.map(at), true);
const towerParts = [];
towerParts.push(S(k.cylinder(0, 0, 2.38, 0.5, 0.25, P, 64), { tone: "mid" }));
towerParts.push(S(towerPaths, { tone: "mid", inner: Ln(seams, { tone: "faint" }) + Ln(door, { tone: "lo" }) }));
// Steps up to the door: a landing and three treads, on the pedestal and the ground.
const STEP_W = 1.5;
const sx = -STEP_W / 2;
const yDoor = rTower(1.25) - 0.02;
towerParts.push(S(k.slabOf({ x: sx, y: yDoor, w: STEP_W, d: 3.15 - yDoor, r: 0.05 }, 0.5, 0.75, P, 2), { tone: "lo" }));
for (let i = 0; i < 3; i++) towerParts.push(S(k.slabOf({ x: sx, y: 3.15, w: STEP_W, d: 0.45 * (3 - i), r: 0.05 }, i * 0.42, 0.42, P, 2), { tone: "lo" }));
towerParts.push(S(k.cylinder(0, 0, GEO.yawRing.r, GEO.towerTop, GEO.yawRing.h, P, 48), { tone: "mid" }));
const towerSvg = towerParts.join("");

// ---------------------------------------------------------------- Fig 2: the nacelle cut open (static art from nacelle.mjs)
const FIG2 = N2.buildNacelle({ k, G, M, RIG, rig, theme, argv });
if (argv.includes("--audit")) {
  const A = await import(new URL("../../../../.skill/kit/audit.mjs", import.meta.url).href);
  A.auditOrExit(FIG2.R, FIG2.P, { argv });
}

// ---------------------------------------------------------------- page
const W1h = (svgClass, body) => `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg wt-layer ${svgClass}" viewBox="0 0 ${W1} ${H1}" aria-hidden="true">${body}</svg>`;
const LABEL1 =
  "A three-blade, upwind, horizontal-axis wind turbine on a site model: an 80 m rotor on a 70 m steel tower standing on a concrete foundation, with a transformer kiosk, a crane hardstand and an access track. The nacelle yaws to face the wind, the blades turn about their own axes to change pitch, and streamlines show the air slowing, spreading and twisting as the rotor takes energy from it.";
const backSvg = k.figureSvg({ width: W1, height: H1, label: LABEL1, body: back, className: "wt-back" });
const liveParts = ["tower", "nacelle", "instruments", "nose", "hub", "blade0", "blade1", "blade2"];
const liveSvg = W1h("wt-live", liveParts.map((name) => `<g data-part="${name}">${name === "tower" ? towerSvg : ""}</g>`).join(""));
const edgeMask = (id) => `<defs><filter id="${id}-blur" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="14"/></filter><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W1}" height="${H1}"><rect x="34" y="34" width="${W1 - 68}" height="${H1 - 68}" fill="#fff" filter="url(#${id}-blur)"/></mask></defs>`;
const fallbackSvg = (cls, id) => W1h(`wt-fallback ${cls}`, `${edgeMask(id)}<g mask="url(#${id})" data-lines></g>`);
const stage1 = `<div class="wt-stage" data-stage="1">${backSvg}<canvas class="wt-layer wt-gl wt-gl-back" aria-hidden="true"></canvas>${fallbackSvg("wt-fallback-back", "wt-fb-a")}${liveSvg}<canvas class="wt-layer wt-gl wt-gl-front" aria-hidden="true"></canvas>${fallbackSvg("wt-fallback-front", "wt-fb-b")}</div>`;

const marks = M.MARKS.map((m) => ({ key: m.key, label: m.label, v: m.v, kW: m.kW, rpm: m.rpm, pitch: m.pitch }));
const DATA = {
  W1,
  H1,
  P,
  camera: glCamera(P),
  start: START,
  dial: DIAL,
  marks,
  curve: M.curve(0.1, 30),
  ratedV: M.RATED_V,
  fig2: FIG2.data,
};

const controls = `<div class="wt-dock" role="group" aria-label="Wind and pitch controls">
<div class="wt-sliders">
<label class="wt-control"><span>Wind speed</span><output data-out="v"></output><input type="range" data-control="v" min="0" max="32" step="0.1" value="${START.v}"></label>
<label class="wt-control"><span>Wind from</span><output data-out="dir"></output><input type="range" data-control="dir" min="0" max="359" step="1" value="${START.dir}"></label>
<label class="wt-control"><span>Blade pitch</span><output data-out="pitch"></output><input type="range" data-control="pitch" min="-2" max="90" step="0.5" value="0"></label>
</div>
<div class="wt-presets">
${marks.map((m) => `<button type="button" data-preset="${m.key}" data-v="${m.v}"><b>${m.label}</b><i>${m.key === "cutout" ? "25.0" : m.v.toFixed(1)} m/s</i></button>`).join("")}
<button type="button" data-preset="storm" data-v="28"><b>Storm</b><i>28.0 m/s</i></button>
<button type="button" data-auto aria-pressed="true"><b>Auto pitch</b><i>on</i></button>
</div>
</div>`;

const chart = `<div class="wt-chart" aria-hidden="true"><svg class="wt-curve" viewBox="0 0 640 170"></svg></div>`;

const caption1 = `The rotor turns the wind's kinetic energy into torque: each blade is a wing, and the lift on its sections, seen in the air moving past them, pushes it round. Power in the wind grows with the cube of its speed (½ρAv³: ${M.fmtKW(M.windKW(10))} through this ${GEO.blade.R * 2} m disc at 10 m/s), and a rotor can take at most 16/27 of it (Betz); this one peaks at Cp ${M.OPT.cp.toFixed(2)} when its tips run ${M.OPT.lambda.toFixed(1)} times faster than the wind. Taking that energy slows the air, so the streamtube through the disc swells, and the blades' reaction leaves the wake turning slowly the other way. Below ${M.SPEC.cutIn} m/s there is too little to cover losses and the rotor idles with its blades pitched to ${M.SPEC.idlePitch}°. From cut-in the generator holds the best tip speed until the rotor reaches ${M.SPEC.rpmRated} rpm; at ${M.RATED_V.toFixed(1)} m/s output reaches ${M.SPEC.ratedKW / 1000} MW, and above that the blades pitch toward feather to spill the extra. At ${M.SPEC.cutOut} m/s the turbine shuts down: blades feather to ${M.SPEC.feather}°, the rotor coasts down, and below ${M.SPEC.brakeRpm} rpm the disc brake parks it until the wind falls under ${M.SPEC.restart} m/s. Yaw is shown ${M.SPEC.yawShown / M.SPEC.yawReal}× faster than the real ${M.SPEC.yawReal}°/s.`;

const fig1 = k.plateHtml({
  fig: "Fig 1",
  title: "Wind turbine",
  hint: "Sliders set wind and pitch",
  readout: M.readoutOf(M.initial(START)),
  keys: [
    { mark: "lit", label: "Blades: pitch turns each one about its own axis" },
    { mark: "raised", label: "Nacelle: yaws on its bearing to face the wind" },
    { mark: "dotted", label: "Streamlines: pulses move at the air's speed" },
  ],
  caption: caption1,
  body: stage1 + chart,
});

const MODULES = [
  ns("k", fileURLToPath(KIT_ISO)),
  ns("G", fileURLToPath(KIT_LATHE), "const { cameraOf, iso, pathOf } = k;"),
  glScript(),
  ns("M", join(HERE, "model.mjs")),
  ns("RIG", join(HERE, "rig.mjs")),
  ns("N2", join(HERE, "nacelle-live.mjs")),
  ns("FLOW", join(HERE, "flow.mjs")),
  ns("PARTS", join(HERE, "parts.mjs")),
].join("\n");

function ns(name, file, preamble = "") {
  const src = readFileSync(file, "utf8");
  const names = [...src.matchAll(/^export\s+(?:async\s+)?(?:function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
  const body = src.replace(/^import[^;]*;\s*$/gm, "").replace(/^export\s+/gm, "");
  return `const ${name} = (() => {\n${preamble}\n${body}\nreturn { ${names.join(", ")} };\n})();\n`;
}

const CSS = readFileSync(join(HERE, "turbine.css"), "utf8");
const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA)) + readFileSync(join(HERE, "flow-live.js"), "utf8") + readFileSync(join(HERE, "fig2-live.js"), "utf8");
const intro = `<header class="wt-head"><h1>How a wind turbine works</h1><p>A ${M.SPEC.ratedKW / 1000} MW, ${GEO.blade.R * 2} m, three-blade upwind turbine with a geared drivetrain, run by one model: set the wind's speed and direction, or take the blade pitch away from the controller, and both figures follow. The presets compare the three speeds that shape its power curve, and what happens in a storm.</p></header>`;
const body = `<div class="wt">${intro}${fig1}${FIG2.plate}${controls}<p class="wt-said" aria-live="polite"></p></div>`;
const page = k.pageHtml({ title: "How a wind turbine works", theme, body: `<style>${CSS}</style>${body}`, script: MODULES + LIVE, width: 920 });
const name = theme === "light" ? "wind-turbine-light.html" : "wind-turbine.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, `${(page.length / 1024).toFixed(0)} KB`, "scale", G.scaleOf(P).toFixed(2), "px/m");
