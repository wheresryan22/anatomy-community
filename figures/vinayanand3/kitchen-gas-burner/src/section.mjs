// SECTION view: a side elevation of the burner rig cut on its centre plane (y = 0), seen from +y.
// Cut faces are hatched by material; gas spaces are cavities the flow shader paints over.
import pc from "./polygon-clipping.mjs";
import * as k from "../../../../.skill/kit/iso-kit.mjs";
import * as G from "../../../../.skill/kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../../../../.skill/kit/tube.mjs";
import * as D from "./parts.mjs";

const { ZT } = D;
const r1 = (v) => +v.toFixed(2);

export function buildSection(W, H) {
  // camera: pure side elevation from +y, +x to the right
  const P = k.fitProjection([[-300, 0, -22], [192, 0, -22], [-300, 0, 262], [192, 0, 262]], W, H, { pad: 14, azimuth: 90, elevation: 0 });
  const KS = G.scaleOf(P);
  const at = (x, z, y = 0) => k.iso([x, y, z], P);
  const ring = (pts) => pts.map(([x, z]) => at(x, z));
  const pathOfRings = (multi) => multi.map((poly) => poly.map((rg) => k.pathOf(ring(rg.slice(0, -1)), true)).join("")).join("");
  const rect = (x0, z0, x1, z1) => [[[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]]];
  const closed = (pts) => [[...pts, pts[0]]];
  const U = (...polys) => pc.union(...polys);
  const minus = (a, ...b) => pc.difference(a, ...b);
  const mirror = (pts) => pts.map(([x, z]) => [x, 2 * ZT - z]);
  const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);

  const cuts = []; // [material, multipolygon]
  const cavities = []; // [name, multipolygon]
  const cut = (mat, multi, name) => cuts.push({ mat, multi: pc.union(multi), name });
  const cavity = (name, multi) => cavities.push({ name, multi: pc.union(multi) });

  // ---------- tube: end plate + collar, then bell, throat, diffuser, straight run into the plenum ----------
  const X_END = D.HEAD.x - D.HEAD.rPlenum + D.HEAD.wall; // tube ends flush with the plenum's inner wall in this plane
  const outerTop = (x0, x1, n = 60) => range(x0, x1, n).map((x) => [x, ZT + D.tubeOut(x)]);
  const innerTop = (x0, x1, n = 60) => range(x0, x1, n).map((x) => [x, ZT + D.tubeIn(x)]);
  {
    const T = D.TUBE;
    const plate = closed([[T.x0, ZT + 6.5], [T.x0, ZT + T.collarR], [T.window[0], ZT + T.collarR], [T.window[0], ZT + 15], [T.plate, ZT + 15], [T.plate, ZT + 6.5]]);
    const body = closed([...[[T.window[1], ZT + T.collarR], [T.collarEnd, ZT + T.collarR]], ...outerTop(T.collarEnd + 0.01, X_END, 120), ...innerTop(X_END, T.window[1], 140)]);
    const top = U(plate, body);
    const bottom = top.map((poly) => poly.map((rg) => mirror(rg)));
    cut("alu", U(top, bottom), "tube");
    // the gas path: from the end plate to the plenum
    cavity("tube", closed([...innerTop(T.plate, X_END, 160), ...innerTop(X_END, T.plate, 160).map(([x, z]) => [x, 2 * ZT - z])]));
  }

  // ---------- burner head ----------
  const H_ = D.HEAD;
  const hx = H_.x;
  {
    const zs = range(H_.plate, D.PORTS.z0, 70);
    const zt = range(ZT + D.tubeOut(X_END), D.PORTS.z0, 60);
    const wallL = closed([...zt.map((z) => [hx - D.headOut(z), z]), ...[...zt].reverse().map((z) => [hx - D.headIn(z), z])]);
    const lowL = rect(hx - H_.rPlenum, H_.plate, hx - H_.rPlenum + H_.wall, ZT - D.tubeOut(X_END));
    const wallR = closed([...zs.map((z) => [hx + D.headOut(z), z]), ...[...zs].reverse().map((z) => [hx + D.headIn(z), z])]);
    const plate = rect(hx - H_.rPlenum, H_.bottom, hx + H_.rPlenum, H_.plate);
    const lips = U(rect(hx - H_.rCrown, D.PORTS.z1, hx - H_.rCrown + 3, H_.crown1), rect(hx + H_.rCrown - 3, D.PORTS.z1, hx + H_.rCrown, H_.crown1));
    cut("alu", U(wallL, lowL, wallR, plate, lips), "head");
    // gas path inside the head (above the plate), joined to the tube's mouth
    const zi = range(H_.plate, H_.crown1, 90);
    cavity("head", closed([...zi.map((z) => [hx + D.headIn(z), z]), ...[...zi].reverse().map((z) => [hx - D.headIn(z), z])]));
    // the cap: a rim and a shallow dome, enamelled steel
    const zc = range(D.CAP.z0, D.CAP.top, 40);
    cut("enamel", closed([...zc.map((z) => [hx + D.capR(z), z]), ...[...zc].reverse().map((z) => [hx - D.capR(z), z])]), "cap");
  }

  // ---------- cooktop sheet and drip bowl ----------
  {
    const C = D.COOKTOP, B = D.BOWL;
    const sheet = U(rect(C.x0, C.z0, hx - B.rOuter, C.z1), rect(hx + B.rOuter, C.z0, C.x1, C.z1));
    const bowl = (s) => closed([[hx + s * B.rOuter, C.z1], [hx + s * B.rInner, B.zLow + B.t], [hx + s * (B.rInner - 3), B.zLow + B.t], [hx + s * (B.rInner - 3), B.zLow], [hx + s * B.rInner, B.zLow], [hx + s * (B.rOuter + 0.6), C.z0]]);
    cut("sheet", U(sheet, bowl(-1), bowl(1)), "cooktop");
  }

  // ---------- valve, bonnet, stem, switch, nozzle and orifice hood ----------
  const V = D.VALVE;
  const plugR = (x) => V.plugR[0] + ((V.plugR[1] - V.plugR[0]) * (x - V.plug[0])) / (V.plug[1] - V.plug[0]);
  {
    const outer = closed([[V.x0, ZT - V.r + 1.5], [V.x0, ZT + V.r - 1.5], [V.x0 + 1.5, ZT + V.r], [V.x1 - 1.5, ZT + V.r], [V.x1, ZT + V.r - 1.5], [V.x1, ZT - V.r + 1.5], [V.x1 - 1.5, ZT - V.r], [V.x0 + 1.5, ZT - V.r]]);
    const plugHole = closed([[V.plug[0], ZT - V.plugR[0]], [V.plug[0], ZT + V.plugR[0]], [V.plug[1], ZT + V.plugR[1]], [V.plug[1], ZT - V.plugR[1]]]);
    const stemHole = rect(V.x0 - 1, ZT - 3.2, V.plug[0] + 0.5, ZT + 3.2);
    const outBore = rect(V.plug[1] - 0.5, ZT - 2, V.x1 + 1, ZT + 2);
    const inlet = rect(D.NECK.x - D.NECK.bore, ZT + 5, D.NECK.x + D.NECK.bore, ZT + V.r + 1);
    // the nozzle is part of the body casting
    const nozzle = minus(rect(V.x1, ZT - D.NOZZLE.r, D.NOZZLE.x1, ZT + D.NOZZLE.r), rect(V.x1 - 1, ZT - D.NOZZLE.bore, D.NOZZLE.x1 + 1, ZT + D.NOZZLE.bore));
    cut("brass", U(minus(outer, plugHole, stemHole, outBore, inlet), nozzle), "valve");
    // neck up to the manifold, and the manifold section
    const M = D.MANIFOLD;
    const neck = minus(rect(D.NECK.x - D.NECK.r, ZT + V.r - 0.4, D.NECK.x + D.NECK.r, M.z - M.r + 0.6), rect(D.NECK.x - D.NECK.bore, ZT + V.r - 1, D.NECK.x + D.NECK.bore, M.z));
    const circ = (r, n = 64) => range(0, Math.PI * 2, n).slice(0, -1).map((a) => [M.x + r * Math.cos(a), M.z + r * Math.sin(a)]);
    const pipe = minus(closed(circ(M.r)), closed(circ(M.r - M.wall)), rect(D.NECK.x - D.NECK.bore, M.z - M.r - 1, D.NECK.x + D.NECK.bore, M.z - M.r + 2));
    cut("steel", U(neck, pipe), "manifold");
    cavity("gas-manifold", U(closed(circ(M.r - M.wall)), rect(D.NECK.x - D.NECK.bore, ZT + V.r - 1, D.NECK.x + D.NECK.bore, M.z - M.r + 1.2)));
    cavity("gas-valve", U(rect(D.NECK.x - D.NECK.bore, ZT + 5, D.NECK.x + D.NECK.bore, ZT + V.r), rect(V.plug[1] - 0.5, ZT - 2, D.NOZZLE.x1, ZT + 2), rect(D.NOZZLE.x0 - 1, ZT - D.NOZZLE.bore, D.HOOD.x1, ZT + D.NOZZLE.bore)));
    // bonnet nut round the stem
    cut("brass", minus(rect(D.BONNET.x0, ZT - D.BONNET.r, D.BONNET.x1, ZT + D.BONNET.r), rect(D.BONNET.x0 - 1, ZT - 3.2, D.BONNET.x1 + 1, ZT + 3.2)), "bonnet");
    // orifice hood (spud): hex body then a cone to the tip, drilled through at 1.45 mm
    const Hd = D.HOOD;
    const hood = closed([[Hd.x0, ZT - Hd.r], [Hd.x0, ZT + Hd.r], [Hd.x1, ZT + Hd.r], [Hd.x1, ZT + Hd.tipR[0]], [Hd.tip, ZT + Hd.tipR[1]], [Hd.tip, ZT - Hd.tipR[1]], [Hd.x1, ZT - Hd.tipR[0]], [Hd.x1, ZT - Hd.r]]);
    const bore = U(rect(Hd.x0 - 1, ZT - D.NOZZLE.bore, Hd.x1 - 1.5, ZT + D.NOZZLE.bore), closed([[Hd.x1 - 1.5, ZT - D.NOZZLE.bore], [Hd.x1 - 1.5, ZT + D.NOZZLE.bore], [Hd.x1 + 0.6, ZT + Hd.orifice], [Hd.tip - 1, ZT + Hd.orifice], [Hd.tip - 1, ZT - Hd.orifice], [Hd.x1 + 0.6, ZT - Hd.orifice]]));
    cut("brass2", minus(hood, bore), "hood");
    cavity("gas-hood", bore);
    // stem, in front of the plug's drive slot and through the panel, bonnet and switch
    cut("steel", rect(D.KNOB.back - 4, ZT - D.STEM.r, V.plug[0] + 3, ZT + D.STEM.r), "stem");
    // spark switch: a plastic housing round the stem with two spade terminals below
    const Sw = D.SWITCH;
    const sw = minus(closed([[Sw.x0, ZT - Sw.r], [Sw.x0, ZT + Sw.r - 2], [Sw.x0 + 2, ZT + Sw.r], [Sw.x1, ZT + Sw.r], [Sw.x1, ZT - Sw.r]]), rect(Sw.x0 - 1, ZT - 3.3, Sw.x1 + 1, ZT + 3.3));
    cut("plastic", sw, "switch");
    cut("copper", U(rect(Sw.x0 + 2.4, ZT - Sw.r - 6, Sw.x0 + 3.4, ZT - Sw.r), rect(Sw.x1 - 3.4, ZT - Sw.r - 6, Sw.x1 - 2.4, ZT - Sw.r)), "terminals");
    // cam on the stem that closes the switch around LITE
    cut("steel", rect(Sw.x0 + 4.5, ZT - 6.6, Sw.x1 - 4.5, ZT - 3), "cam");
  }
  // control panel with the stem's hole, and its two return flanges
  {
    const Pn = D.PANEL;
    cut("sheet", U(rect(Pn.x0, Pn.z0, Pn.x1, ZT - 4), rect(Pn.x0, ZT + 4, Pn.x1, Pn.z1), rect(Pn.x0, Pn.z1 - 1.2, Pn.x1 + 14, Pn.z1), rect(Pn.x0, Pn.z0, Pn.x1 + 10, Pn.z0 + 1.2)), "panel");
  }
  // shutter sleeve (moves) and its lock screw: drawn by sleeveSvg so the page can move it
  // stands in the plane: tube cradle and head post, with the base plate under them
  {
    const Cr = D.POSTS.cradle;
    const bottom = (x) => ZT - D.tubeOut(x);
    const saddleTop = range(Cr.x - 9, Cr.x + 9, 12).map((x) => [x, bottom(x) - 0.05]);
    const saddle = closed([[Cr.x - 9, Cr.top - 4], [Cr.x + 9, Cr.top - 4], ...saddleTop.reverse()]);
    cut("steel", U(saddle, rect(Cr.x - 4, 0, Cr.x + 4, Cr.top - 4), rect(Cr.x - 10, 0, Cr.x + 10, 2.4)), "cradle");
    cut("steel", U(rect(hx - 6, 2.4, hx + 6, H_.bottom), rect(hx - 12, 0, hx + 12, 2.4), rect(hx - 10, H_.bottom - 2.4, hx + 10, H_.bottom)), "headpost");
    cut("base", rect(D.BASE.x, D.BASE.z, D.BASE.x + D.BASE.w, 0), "base");
  }

  // ---------- things behind the cut plane (y < 0), drawn as solids ----------
  const back = [];
  const S = (paths, cls, extra = {}) => k.solidSvg(paths, { tone: "hi", className: cls, ...extra });
  const L = (d, style) => k.lineSvg(d, style);
  // feet under the base, far pair visible between the near ones' shadows
  for (const x of [D.BASE.x + 22, D.BASE.x + D.BASE.w - 22]) back.push(S(k.cylinder(x, -90, 7, D.BASE.z - 6, 6, P, 24), "m-rubber"));
  // cooktop posts and the rail under the sheet's far edge
  for (const [x, y] of D.POSTS.cooktop) back.push(S(k.slabOf({ x: x - 5, y: y - 5, w: 10, d: 10, r: 1 }, 0, D.COOKTOP.z0, P, 3), "m-frame"));
  back.push(S(k.slabOf({ x: D.COOKTOP.x0, y: -103, w: D.COOKTOP.x1 - D.COOKTOP.x0, d: 8, r: 0.8 }, D.COOKTOP.z0 - 10, 10, P, 2), "m-frame"));
  // manifold post and clamp
  back.push(S(k.slabOf({ x: D.MANIFOLD.x - 5, y: -45, w: 10, d: 10, r: 1 }, 0, D.MANIFOLD.z - D.MANIFOLD.r - 3, P, 3), "m-frame"));
  back.push(S(G.disc(-2.5, 2.5, D.MANIFOLD.r + 1.6, G.frameOf([D.MANIFOLD.x, -40, D.MANIFOLD.z], [0, 1, 0], [1, 0, 0], [0, 0, 1]), P), "m-steel"));
  // spark module on the base
  {
    const Mo = D.MODULE;
    back.push(S(k.slabOf({ x: Mo.x - 6, y: Mo.y + 4, w: Mo.w + 12, d: Mo.d - 8, r: 1 }, 0, 1.4, P, 2), "m-steel"));
    back.push(S(k.slabOf({ x: Mo.x, y: Mo.y, w: Mo.w, d: Mo.d, r: 2 }, 1.4, Mo.h, P, 4, 0.5), "m-module"));
    back.push(S(k.slabOf({ x: Mo.x + Mo.w - 12, y: Mo.y + 10, w: 8, d: 12, r: 1.4 }, Mo.h + 1.4, 6, P, 3), "m-ceramic"));
    back.push(S(k.slabOf({ x: Mo.x + 6, y: Mo.y + 8, w: 14, d: 16, r: 1 }, Mo.h + 1.4, 4, P, 2), "m-plastic"));
  }
  // electrode: bracket from the plenum, ceramic insulator, kanthal wire bent to the port
  const E = D.ELECTRODE;
  const eIns = D.polar(E.angle, E.rIns, 0);
  const eTip = D.polar(E.angle, E.rTip, E.tipZ);
  {
    const ax = G.frameOf([eIns[0], eIns[1], 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    back.push(S(k.slabOf({ x: eIns[0] - 2, y: eIns[1] - 3, w: hx - H_.rPlenum - eIns[0] + 2.2, d: 6, r: 0.6 }, E.z0 - 3, 3, P, 2), "m-steel"));
    back.push(S(G.disc(E.z0, E.z0 + 6, E.insR + 1.6, ax, P), "m-steel"));
    back.push(S(G.solidOf([[E.z0 + 6, E.insR], [E.z1 - 3, E.insR], [E.z1 - 1, E.insR - 0.8, 1], [E.z1, 1.6]], ax, P), "m-ceramic", { inner: L(G.arcOf(ax, E.z0 + 12, E.insR, P) + G.arcOf(ax, E.z0 + 18, E.insR, P), { tone: "faint" }) }));
  }
  const wire = (pts, r, cls, bend = 3) => tubePieces(G.fillet(pts, bend, 8, { P, tube: r }), r, P, { maxLength: 400 }).map((p) => `<g class="${cls}">${tubeSvg(p, { tone: "hi" })}</g>`).join("");
  back.push(wire([[eIns[0], eIns[1], E.z1 - 0.5], [eIns[0], eIns[1], E.tipZ + 0.6], [eTip[0] + 0.4, eTip[1], E.tipZ]], E.wireR, "w-wire", 1.8));
  // high-tension lead: from the insulator's foot down and along the base to the module's ceramic tower
  const Mo = D.MODULE;
  back.push(wire([[eIns[0], eIns[1] - 1, E.z0 - 3.2], [eIns[0], -8, 40], [eIns[0], -8, 8], [Mo.x + Mo.w - 8, -8, 8], [Mo.x + Mo.w - 8, Mo.y + 16, Mo.h + 7.4]], 1.1, "w-ht", 6));
  // switch leads: from the two spade terminals down to the base and along to the module
  const Sw = D.SWITCH;
  back.push(wire([[Sw.x0 + 2.9, -0.6, ZT - Sw.r - 6], [Sw.x0 + 2.9, -14, 22], [Sw.x0 + 2.9, -14, 4], [Mo.x - 2, -14, 4], [Mo.x + 8, Mo.y + 14, Mo.h + 5.4]], 0.75, "w-lead", 5));
  back.push(wire([[Sw.x1 - 2.9, -0.6, ZT - Sw.r - 6], [Sw.x1 - 2.9, -18, 26], [Sw.x1 - 2.9, -18, 6.5], [Mo.x - 4, -18, 6.5], [Mo.x + 14, Mo.y + 14, Mo.h + 5.4]], 0.75, "w-lead", 5));

  // ---------- the knob, uncut, and the moving pieces (rebuilt by the page) ----------
  const knob = knobSvg(k, G, P, 0, 0);

  // ---------- cut faces and cavities as markup ----------
  const cutsSvg = cuts.map(({ mat, multi, name }) => `<path class="cut c-${mat}" data-part="${name}" fill-rule="evenodd" d="${pathOfRings(multi)}"/>`).join("");
  const edgesSvg = `<path class="cut-edge" d="${cuts.map(({ multi }) => pathOfRings(multi)).join("")}"/>`;
  const cavitySvg = cavities.map(({ name, multi }) => `<path class="cavity" data-cav="${name}" d="${pathOfRings(multi)}"/>`).join("");

  // ---------- labels on leaders, in two rows above the drawing ----------
  const LABELS = [
    ["Knob", -240, ZT + 22, 1, "end"],
    ["Spark switch", -211, ZT + D.SWITCH.r, 1],
    ["Plug valve", -186, ZT + V.r, 0, "end"],
    ["Manifold", D.MANIFOLD.x + 4, D.MANIFOLD.z + D.MANIFOLD.r, 0, "start"],
    ["Orifice", D.HOOD.tip + 0.6, ZT + D.HOOD.tipR[1], 0],
    ["Air shutter", -128, ZT + D.SLEEVE.rOut, 1],
    ["Venturi throat", -87, ZT + D.tubeOut(-87), 0],
    ["Mixing tube", -20, ZT + D.tubeOut(-20), 1],
    ["Electrode", eIns[0], E.z1, 0],
    ["Ports", hx + H_.rCrown, D.PORTS.zMid + 2, 1],
    ["Burner cap", hx + 14, D.CAP.top - 0.8, 0],
    ["Cooktop", 150, D.COOKTOP.z1, 0],
  ];
  const rowY = [at(0, 0, 0)[1] - KS * 216, at(0, 0, 0)[1] - KS * 200];
  const labels = LABELS.map(([text, x, z, row, anchor = "middle"]) => {
    const p = at(x, z);
    const ty = rowY[row];
    return `<g class="lbl" data-label="${text}"><path class="leader" d="M${r1(p[0])} ${r1(ty + 4)}V${r1(p[1] - 1.6)}"/><circle class="leader-dot" cx="${r1(p[0])}" cy="${r1(p[1])}" r="1.5"/><text x="${r1(p[0] + (anchor === "end" ? 6 : anchor === "start" ? -6 : 0))}" y="${r1(ty)}" text-anchor="${anchor}">${text}</text></g>`;
  }).join("");

  // hatch patterns, one per material
  const HATCH = { alu: [45, 3.2], brass: [-45, 2.4], brass2: [45, 2.0], steel: [45, 2.0], enamel: [-45, 3.2], sheet: [90, 2.0], plastic: [-45, 4.2], copper: [0, 1.6], base: [45, 5] };
  const defs = `<defs>${Object.entries(HATCH).map(([m, [ang, gap]]) => `<pattern id="h-${m}" patternUnits="userSpaceOnUse" width="${gap}" height="${gap}" patternTransform="rotate(${ang})"><rect class="h-bg h-${m}" width="${gap}" height="${gap}"/><line class="h-ln" x1="0" y1="0" x2="0" y2="${gap}"/></pattern>`).join("")}</defs>`;

  const flameAt = (x0, sgn) => {
    const pts = [];
    for (let i = 0; i <= 16; i++) { const t = i / 16; const a = 18 * t; const w = 2.2 + 3.2 * Math.sin(Math.PI * Math.min(1, t * 1.1)) ** 0.7; pts.push([x0 + sgn * a * 0.94, D.PORTS.zMid + a * 0.34 + 0.012 * a * a + w]); }
    for (let i = 16; i >= 0; i--) { const t = i / 16; const a = 18 * t; const w = 2.2 + 3.2 * Math.sin(Math.PI * Math.min(1, t * 1.1)) ** 0.7; pts.push([x0 + sgn * a * 0.94, D.PORTS.zMid + a * 0.34 + 0.012 * a * a - w]); }
    const cone = [[x0, D.PORTS.zMid + 1.9], [x0 + sgn * 9.6 * 0.94, D.PORTS.zMid + 9.6 * 0.34 + 1.1], [x0, D.PORTS.zMid - 1.9]];
    return `<path class="fl-out" d="${k.pathOf(ring(pts), true)}"/><path class="fl-in" d="${k.pathOf(ring(cone), true)}"/>`;
  };
  const fallback = `<g class="fl-flames">${flameAt(hx - H_.rCrown, -1)}${flameAt(hx + H_.rCrown, 1)}</g><path class="fl-spark" d="${k.pathOf(ring([[eTip[0], D.PORTS.zMid], [eTip[0] + 1.2, D.PORTS.zMid + 0.7], [eTip[0] + 2.3, D.PORTS.zMid - 0.6], [hx - H_.rCrown, D.PORTS.zMid]]))}"/>`;
  const DATA = {
    P, KS, ZT,
    tube: { plate: D.TUBE.plate, xEnd: X_END },
    ports: [at(hx - H_.rCrown, D.PORTS.zMid), at(hx + H_.rCrown, D.PORTS.zMid)],
    eTip: at(eTip[0], eTip[2]),
    crownAt: at(hx - H_.rCrown, D.PORTS.zMid),
    sleeve0: D.sleeveAt(1),
    origin: at(0, 0),
  };
  return { P, defs, fallback, back: back.join(""), cavitySvg, cutsSvg, edgesSvg, knob, labels, DATA, at };
}

// the knob seen from the side: body with knurls, skirt, and the grip fin turned to `theta` degrees
export function knobSvg(k, G, P, theta, push) {
  const D_ = { ZT: 90, KNOB: { face: -252, back: -228, r: 22, skirt: 24, fin: [-258, -252], finR: 17, finT: 5 } };
  const K = D_.KNOB, ZT = D_.ZT;
  const F = G.frameOf([-push, 0, ZT], [1, 0, 0], [0, 0, 1], [0, 1, 0]);
  const S = (paths, cls) => k.solidSvg(paths, { tone: "hi", className: cls, lit: true });
  let out = S(G.solidOf([[K.back - 4, K.skirt], [K.back, K.skirt], [K.back, K.r], [K.face + 2, K.r, 1], [K.face, K.r - 2.4, 1], [K.face, 0]], F, P), "m-knob");
  out += k.fadedSvg(G.ribsOf(F, K.face + 4, K.back, K.r, 40, P, { fade: [0.1, 0.55], seams: "first" }).filter((rib) => (rib.alpha ?? rib[1] ?? 1) >= 0.5), { tone: "lo" });
  // the fin seen side-on: its height on screen follows the knob angle
  const t = (theta * Math.PI) / 180;
  const half = Math.abs(Math.cos(t)) * K.finR + Math.abs(Math.sin(t)) * (K.finT / 2);
  const p = (x, z) => k.iso([x - push, 0, z], P);
  const pts = [p(K.fin[0], ZT - half + 2), p(K.fin[0] + 2, ZT - half), p(K.fin[1], ZT - half), p(K.fin[1], ZT + half), p(K.fin[0] + 2, ZT + half), p(K.fin[0], ZT + half - 2)];
  out += `<g class="iso-solid m-knob" data-lit><path class="iso-fill" d="${k.pathOf(pts, true)}"/><path class="iso-shade" data-shade="2" d="${k.pathOf(pts, true)}"/><path class="iso-line iso-edge" data-tone="lit" d="${k.pathOf(pts, true)}"/></g>`;
  return out;
}

// the shutter sleeve at a given opening, as cut faces (moves along x)
export function sleeveSvg(k, P, shutter) {
  const ZT = 90, S = { len: 14, rIn: 16.8, rOut: 18.4 };
  const x0 = -135 + 13 * shutter;
  const at = (x, z) => k.iso([x, 0, z], P);
  const rc = (a, b, c, d) => k.pathOf([at(a, b), at(c, b), at(c, d), at(a, d)], true);
  const d = rc(x0, ZT + S.rIn, x0 + S.len, ZT + S.rOut) + rc(x0, ZT - S.rOut, x0 + S.len, ZT - S.rIn) + rc(x0 + 5, ZT + S.rOut, x0 + 8, ZT + S.rOut + 4);
  return `<path class="cut c-zinc" d="${d}"/><path class="cut-edge" d="${d}"/>`;
}

// the plug's cross-port at a valve opening f (0 closed, 1 fully aligned), cut by the section plane
export function plugSvg(k, P, f) {
  const ZT = 90, x0 = -190, x1 = -166, r0 = 8.2, r1 = 6.6, port = -178, pr = 2.2;
  const at = (x, z) => k.iso([x, 0, z], P);
  const rx = (x) => r0 + ((r1 - r0) * (x - x0)) / (x1 - x0);
  const hw = pr * Math.sqrt(Math.max(0, Math.min(1, f)));
  const top = (x) => ZT + rx(x);
  // plug body with its axial bore (port to the outlet end) and, when open, the cross-port up to the inlet
  const body = [at(x0, ZT - r0), at(x0, ZT + r0)];
  let d;
  if (hw > 0.05) {
    const left = k.pathOf([at(x0, ZT - r0), at(x0, ZT + r0), at(port - hw, top(port - hw)), at(port - hw, ZT - 2), at(x1, ZT - 2), at(x1, ZT - r1)], true);
    const right = k.pathOf([at(port + hw, top(port + hw)), at(x1, ZT + r1), at(x1, ZT + 2), at(port + hw, ZT + 2)], true);
    d = left + right;
  } else {
    d = k.pathOf([...body, at(x1, ZT + r1), at(x1, ZT + 2), at(port - pr, ZT + 2), at(port - pr, ZT - 2), at(x1, ZT - 2), at(x1, ZT - r1)], true);
  }
  const gas = hw > 0.05 ? k.pathOf([at(port - hw, top(port - hw) + 0.4), at(port + hw, top(port + hw) + 0.4), at(port + hw, ZT + 2), at(x1, ZT + 2), at(x1, ZT - 2), at(port - hw, ZT - 2)], true) : k.pathOf([at(port - pr, ZT + 2), at(x1, ZT + 2), at(x1, ZT - 2), at(port - pr, ZT - 2)], true);
  return `<path class="cavity gas" data-cav="gas-plug" d="${gas}"/><path class="cut c-brass2" d="${d}"/><path class="cut-edge" d="${d}"/>`;
}
