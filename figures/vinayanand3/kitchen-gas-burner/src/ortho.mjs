// ORTHO view: the whole burner rig in isometric, uncut, seen from the knob side (−x, +y, above).
import * as k from "../../../../.skill/kit/iso-kit.mjs";
import * as G from "../../../../.skill/kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../../../../.skill/kit/tube.mjs";
import * as D from "./parts.mjs";

const { ZT } = D;
const r1 = (v) => +v.toFixed(2);

export function buildOrtho(W, H) {
  const B = D.BASE;
  const P = k.fitProjection([...k.boxCorners(B, B.z - 8, 0), [-258, 0, ZT + 24], [60, 0, 172], ...k.boxCorners({ x: D.COOKTOP.x0, y: D.COOKTOP.y0, w: D.COOKTOP.x1 - D.COOKTOP.x0, d: D.COOKTOP.y1 - D.COOKTOP.y0, r: 0 }, D.COOKTOP.z0, D.COOKTOP.z1), [D.PANEL.x0, 0, D.PANEL.z1], [D.REG.x, D.REG.y, D.MANIFOLD.z]], W, H, { pad: 16, azimuth: 118, elevation: 30 });
  const V = G.viewOf(P);
  const at = (p) => k.iso(p, P);
  const S = (paths, cls, extra = {}) => k.solidSvg(paths, { tone: "hi", className: cls, ...extra });
  const L = (d, style) => k.lineSvg(d, style);
  const Dots = (pts, style) => k.dotsSvg(pts, style);
  const AXF = (x = 0, z = ZT) => G.frameOf([x, 0, z], [1, 0, 0], [0, 1, 0], [0, 0, 1]); // s = x, angle 0 → +y
  const UP = (x, y, z = 0) => G.frameOf([x, y, z], [0, 0, 1], [1, 0, 0], [0, 1, 0]); // s = z
  const ALONGY = (x, z) => G.frameOf([x, 0, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]); // s = y
  const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
  const back = [];
  const front = [];
  const push = (svg) => back.push(svg);
  const hx = D.HEAD.x;

  // ---------- base: plate on feet, ruler, label plate ----------
  push(`<path class="iso-halo" d="${k.haloOf(B, B.z - 8, 18, P)}"/>`);
  for (const [x, y] of byDepth(k.corners(B, 18))) {
    push(S(k.cylinder(x, y, 8, B.z - 8, 1.6, P, 28), "m-rubber"));
    push(S(k.cylinder(x, y, 6, B.z - 6.4, 6.4, P, 28), "m-rubber"));
  }
  push(S(k.slabOf(B, B.z, -B.z, P, 8, 1.2), "m-base", { inner: L(k.sideSeam(B, B.z + 3, P, 8), { tone: "faint" }) }));
  push(L(k.planOutline(k.insetPlan(B, 5), 0, P), { tone: "faint" }));
  const screws = k.corners(B, 10);
  push(L(screws.map(([x, y]) => k.ring(x, y, 2, 0, P, 16)).join(""), { tone: "lo" }) + Dots(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  {
    const strip = { x: -240, y: B.y + B.d - 13, w: 300, d: 7, r: 0.8 };
    push(S(k.slabOf(strip, 0, 0.6, P, 3), "m-brass", { crease: "none" }));
    const t = k.topTicks(strip.x + 2, strip.x + strip.w - 2, 5, 10, strip.y + 0.05, 0.6, [1.6, 3], P);
    push(L(t.minor, { tone: "lo" }) + L(t.major, { tone: "mid" }));
    const plate = { x: 120, y: B.y + B.d - 34, w: 44, d: 18, r: 1.4 };
    push(S(k.slabOf(plate, 0, 0.8, P, 3), "m-brass", { crease: "none" }));
    push(L(k.planOutline(k.insetPlan(plate, 1.6), 0.8, P, 3), { tone: "faint" }));
    push(k.faceTextSvg(k.topMatrix([plate.x + 22, plate.y + 7], 0.8, P, "x"), "NAT GAS · 4.0\" W.C.", { size: 2.4, tone: "mid", anchor: "middle" }));
    push(L(k.lineOnTop([plate.x + 8, plate.y + 11], [plate.x + 36, plate.y + 11], 0.8, P) + k.lineOnTop([plate.x + 8, plate.y + 13.4], [plate.x + 26, plate.y + 13.4], 0.8, P), { tone: "lo", free: true }));
    push(Dots([at([plate.x + 3, plate.y + 9, 0.8]), at([plate.x + plate.w - 3, plate.y + 9, 0.8])], { size: 0.45 }));
  }

  // ---------- things on the base behind the burner: spark module, posts, cables ----------
  const Mo = D.MODULE;
  push(S(k.slabOf({ x: Mo.x - 6, y: Mo.y + 4, w: Mo.w + 12, d: Mo.d - 8, r: 1 }, 0, 1.4, P, 2), "m-steel") + Dots([at([Mo.x - 3, Mo.y + Mo.d / 2, 1.4]), at([Mo.x + Mo.w + 3, Mo.y + Mo.d / 2, 1.4])], { size: 0.5 }));
  push(S(k.slabOf({ x: Mo.x, y: Mo.y, w: Mo.w, d: Mo.d, r: 2 }, 1.4, Mo.h, P, 4, 0.5), "m-module", { inner: L(k.sideSeam({ x: Mo.x, y: Mo.y, w: Mo.w, d: Mo.d, r: 2 }, 6, P, 4), { tone: "faint" }) }));
  push(L(k.planOutline({ x: Mo.x + 26, y: Mo.y + 6, w: 18, d: 20, r: 1 }, Mo.h + 1.4, P, 2), { tone: "faint" }));
  push(S(k.slabOf({ x: Mo.x + Mo.w - 12, y: Mo.y + 10, w: 8, d: 12, r: 1.4 }, Mo.h + 1.4, 6, P, 3), "m-ceramic"));
  push(S(k.slabOf({ x: Mo.x + 6, y: Mo.y + 8, w: 14, d: 16, r: 1 }, Mo.h + 1.4, 4, P, 2), "m-plastic"));
  const post = (x, y, top, w = 10) => push(S(k.slabOf({ x: x - w / 2 - 3, y: y - w / 2 - 3, w: w + 6, d: w + 6, r: 1 }, 0, 2, P, 2), "m-frame") + S(k.slabOf({ x: x - w / 2, y: y - w / 2, w, d: w, r: 1 }, 2, top - 2, P, 3, 0.3), "m-frame"));
  // far cooktop posts and rail
  for (const [x, y] of D.POSTS.cooktop) post(x, y, D.COOKTOP.z0);
  push(S(k.slabOf({ x: D.COOKTOP.x0 + 4, y: -103, w: D.COOKTOP.x1 - D.COOKTOP.x0 - 8, d: 8, r: 0.8 }, D.COOKTOP.z0 - 10, 10, P, 2), "m-frame"));
  // head post and cradle
  push(S(k.cylinder(hx, 0, 12, 0, 2.4, P, 32), "m-frame") + S(k.cylinder(hx, 0, 6, 2.4, D.HEAD.bottom - 4.8, P, 24), "m-frame") + S(k.cylinder(hx, 0, 10, D.HEAD.bottom - 2.4, 2.4, P, 32), "m-frame"));
  const Cr = D.POSTS.cradle;
  push(S(k.slabOf({ x: Cr.x - 10, y: -10, w: 20, d: 20, r: 1 }, 0, 2.4, P, 2), "m-frame") + S(k.slabOf({ x: Cr.x - 4, y: -4, w: 8, d: 8, r: 0.8 }, 2.4, Cr.top - 6.4, P, 2), "m-frame"));
  // manifold post (far) with its clamp, drawn before the manifold
  post(D.MANIFOLD.x, -40, D.MANIFOLD.z - D.MANIFOLD.r - 2.4, 9);
  // cables: high-tension lead from the electrode, and the switch pair, along the base to the module
  const E = D.ELECTRODE;
  const eIns = D.polar(E.angle, E.rIns, 0);
  const eTip = D.polar(E.angle, E.rTip, E.tipZ);
  const wire = (pts, r, cls, bend = 4) => tubePieces(G.fillet(pts, bend, 8, { P, tube: r }), r, P, { maxLength: 400 }).map((p) => `<g class="${cls}">${tubeSvg(p, { tone: "hi" })}</g>`).join("");
  push(wire([[eIns[0], eIns[1] - 1, E.z0 - 3.2], [eIns[0], -14, 40], [eIns[0], -14, 8], [Mo.x + Mo.w - 8, -14, 8], [Mo.x + Mo.w - 8, Mo.y + 16, Mo.h + 7.4]], 1.1, "w-ht", 6));
  const Sw = D.SWITCH;
  push(wire([[Sw.x0 + 2.9, -0.6, ZT - Sw.r - 6], [Sw.x0 + 2.9, -20, 22], [Sw.x0 + 2.9, -20, 4], [Mo.x - 2, -20, 4], [Mo.x + 8, Mo.y + 14, Mo.h + 5.4]], 0.75, "w-lead", 5));
  push(wire([[Sw.x1 - 2.9, -0.6, ZT - Sw.r - 6], [Sw.x1 - 2.9, -24, 26], [Sw.x1 - 2.9, -24, 6.5], [Mo.x - 4, -24, 6.5], [Mo.x + 14, Mo.y + 14, Mo.h + 5.4]], 0.75, "w-lead", 5));

  // ---------- burner head below the cooktop, electrode bracket ----------
  const HF = UP(hx, 0);
  const headProfile = (z0, z1) => {
    const n = Math.max(2, Math.round((z1 - z0) / 1.2));
    return Array.from({ length: n + 1 }, (_, i) => { const z = z0 + ((z1 - z0) * i) / n; return [z, D.headOut(z), z > D.HEAD.plenumTop && z < D.HEAD.crown0 ? 1 : 0]; });
  };
  push(S(G.solidOf([[D.HEAD.bottom, D.HEAD.rPlenum], [D.HEAD.plenumTop, D.HEAD.rPlenum]], HF, P), "m-alu", { inner: L(G.arcOf(HF, D.HEAD.plate, D.HEAD.rPlenum, P), { tone: "faint" }) }));
  push(S(k.slabOf({ x: eIns[0] - 2, y: eIns[1] - 3, w: hx - D.HEAD.rPlenum - eIns[0] + 2.2, d: 6, r: 0.6 }, E.z0 - 3, 3, P, 2), "m-steel"));
  const IF = UP(eIns[0], eIns[1]);
  push(S(G.disc(E.z0, E.z0 + 6, E.insR + 1.6, IF, P), "m-steel"));

  // ---------- the tube: collar with air windows, shutter sleeve, venturi body ----------
  const T = D.TUBE;
  const tubeProfile = Array.from({ length: 81 }, (_, i) => { const x = T.collarEnd + ((X_END() - T.collarEnd) * i) / 80; return [x, D.tubeOut(x), i > 0 && i < 80 && x < -8 ? 1 : 0]; });
  function X_END() { return D.HEAD.x - Math.sqrt(D.HEAD.rPlenum ** 2 - D.tubeOut(40) ** 2); }
  push(S(G.solidOf(tubeProfile, AXF(), P, { steps: 64 }), "m-alu", { inner: L(G.arcOf(AXF(), -60, D.tubeOut(-60), P, { slope: 4 / 72 }) + G.arcOf(AXF(), 20, D.tubeOut(20), P), { tone: "faint" }) }));
  // collar: a short cylinder, its end plate with the hood's hole, and two of its four air windows
  const CF = AXF();
  const collar = G.disc(T.x0, T.collarEnd, T.collarR, CF, P, { steps: 64 });
  const win = (centre) => {
    const a0 = centre - 0.42, a1 = centre + 0.42;
    const pts = [];
    for (let i = 0; i <= 10; i++) pts.push(G.pointOf(CF, T.window[0], T.collarR, a0 + ((a1 - a0) * i) / 10));
    for (let i = 0; i <= 10; i++) pts.push(G.pointOf(CF, T.window[1], T.collarR, a1 - ((a1 - a0) * i) / 10));
    return pts;
  };
  const facing = (a) => G.dot3(G.radialOf(CF, a), V);
  const windows = [0, Math.PI / 2, Math.PI, -Math.PI / 2].filter((a) => facing(a) > 0.25).map((a) => k.pathOf(win(a).map(at), true)).join("");
  push(S(collar, "m-alu", { inner: `<path class="window" d="${windows}"/>` + L(windows, { tone: "mid" }) }));
  push(`<path class="window" d="${k.pathOf(Array.from({ length: 40 }, (_, i) => at(G.pointOf(CF, T.x0, 6.5, (i / 40) * Math.PI * 2))), true)}"/>` + L(G.circleOf(CF, T.x0, 6.5, P, 40), { tone: "lo" }) + L(G.circleOf(CF, T.x0, 12, P, 48), { tone: "faint" }));
  // the sleeve (moves with the shutter) is drawn by the page into this slot
  push(`<g data-dyn="sleeve-o">${sleeveO({ iso: k.iso, pathOf: k.pathOf, solidSvg: k.solidSvg, lineSvg: k.lineSvg, dotsSvg: k.dotsSvg }, G, P, 1)}</g>`);
  // orifice hood: hex nut body, cone tip
  const hex = Array.from({ length: 6 }, (_, i) => [D.HOOD.r * Math.cos((i * Math.PI) / 3 + Math.PI / 6), D.HOOD.r * Math.sin((i * Math.PI) / 3 + Math.PI / 6)]);
  push(S(G.solidOf([[D.HOOD.tip, D.HOOD.tipR[1]], [D.HOOD.x1, D.HOOD.tipR[0]]], AXF(), P), "m-brass"));
  push(S(G.prismOf(AXF(), hex, D.HOOD.x0, D.HOOD.x1, P), "m-brass"));
  push(S(G.disc(D.NOZZLE.x0, D.NOZZLE.x1, D.NOZZLE.r, AXF(), P), "m-brass"));
  // valve body, neck to the manifold, bonnet nut
  const Vv = D.VALVE;
  push(S(G.solidOf([[Vv.x0, Vv.r - 1.5], [Vv.x0 + 1.5, Vv.r], [Vv.x1 - 1.5, Vv.r], [Vv.x1, Vv.r - 1.5]], AXF(), P), "m-brass", { inner: L(G.arcOf(AXF(), -176, Vv.r, P), { tone: "faint" }) }));
  push(S(G.disc(ZT + Vv.r - 1, D.MANIFOLD.z - D.MANIFOLD.r + 0.6, D.NECK.r, UP(D.NECK.x, 0), P), "m-brass"));
  push(S(G.prismOf(AXF(), hex.map(([a, b]) => [a * 1.3, b * 1.3]), D.BONNET.x0, D.BONNET.x1, P), "m-brass"));
  // manifold along y, capped at the far end, elbow down to the regulator at the near end
  const M = D.MANIFOLD;
  const MF = ALONGY(M.x, M.z);
  push(S(G.disc(M.y0 - 3, M.y0, M.r + 1, MF, P), "m-steel"));
  push(S(G.disc(-42.5, -37.5, M.r + 1.6, MF, P), "m-steel") + Dots([at([M.x - 7, -40, M.z + 3]), at([M.x + 7, -40, M.z + 3])], { size: 0.45 }));
  push(S(G.disc(M.y0, M.y1, M.r, MF, P), "m-steel", { inner: L(G.arcOf(MF, -8, M.r, P) + G.arcOf(MF, 8, M.r, P), { tone: "faint" }) }));
  // valve saddle clamp round the manifold
  push(S(G.disc(-8, 8, M.r + 1.3, MF, P), "m-brass") + Dots([at([M.x - 5, -6, M.z + M.r + 1.3]), at([M.x - 5, 6, M.z + M.r + 1.3])], { size: 0.45 }));
  push(S(G.sphereOf([M.x, M.y1, M.z], 8.2, P), "m-steel"));
  // regulator: pipe down, body, diaphragm housing and dome, vent, then the inlet from the base flange
  const R = D.REG;
  const RF = UP(R.x, R.y);
  push(S(G.disc(0, 3, 12, RF, P), "m-steel") + Dots(G.dotsOf(RF, 3, 9, 4, P, { all: true, phase: Math.PI / 4 }), { size: 0.45 }));
  push(S(G.disc(3, R.z0, 4.2, RF, P), "m-steel"));
  push(S(G.solidOf([[R.z0, 9], [R.z0 + 4, 11], [R.z0 + 18, 11], [R.z0 + 20, 9]], RF, P), "m-alu"));
  push(S(G.disc(R.z0 + 20, R.z0 + 26, R.r + 5, RF, P), "m-alu") + Dots(G.dotsOf(RF, R.z0 + 26, R.r + 3, 8, P, { all: true }), { size: 0.4 }));
  push(S(G.solidOf([[R.z0 + 26, R.r + 5], [R.z0 + 29, R.r + 3, 1], [R.z0 + 32, R.r - 1, 1], [R.z0 + 34, 5]], RF, P), "m-alu"));
  push(S(G.disc(R.z0 + 34, R.z0 + 38, 3.4, RF, P), "m-steel"));
  push(S(G.disc(R.z0 + 20, M.z - 8.2 + 0.6, 4.2, UP(R.x + 0.001, R.y), P), "m-steel"));
  // vent: a short elbow out of the dome's side
  push(S(G.disc(0, 6, 2.2, G.frameAlong([R.x - R.r - 2, R.y, R.z0 + 24], [-1, 0, 0]), P), "m-steel"));

  // ---------- cooktop with its bowl, then the head above it ----------
  const C = D.COOKTOP, Bw = D.BOWL;
  // near cooktop posts under the sheet
  for (const [x] of D.POSTS.cooktop) post(x, -D.POSTS.cooktop[0][1], C.z0);
  {
    const plan = { x: C.x0, y: C.y0, w: C.x1 - C.x0, d: C.y1 - C.y0, r: 6 };
    const paths = k.slabOf(plan, C.z0, C.z1 - C.z0, P, 6, 0.6);
    const hole = k.pathOf(Array.from({ length: 96 }, (_, i) => at([hx + Bw.rOuter * Math.cos((i / 96) * Math.PI * 2), Bw.rOuter * Math.sin((i / 96) * Math.PI * 2), C.z1])), true);
    paths.fill += hole;
    paths.top += hole;
    push(`<g class="cooktop">${S(paths, "m-sheet", { inner: L(k.planOutline(k.insetPlan(plan, 4), C.z1, P, 6), { tone: "faint" }) })}</g>`);
    push(L(G.circleOf(UP(hx, 0), C.z1, Bw.rOuter + 3, P, 96), { tone: "lo" }));
    // the bowl: an inside cone seen from above, its lip, and the hole round the head
    const BF = UP(hx, 0);
    const bowl = G.lathe([[C.z1, Bw.rOuter], [Bw.zLow + Bw.t, Bw.rInner]], BF, P, { fill: "facets", steps: 96 });
    push(`<g class="iso-solid m-chrome bowl"><path class="iso-fill" d="${k.pathOf(Array.from({ length: 96 }, (_, i) => at(G.pointOf(BF, C.z1, Bw.rOuter, (i / 96) * Math.PI * 2))), true)}${k.pathOf(Array.from({ length: 96 }, (_, i) => at(G.pointOf(BF, Bw.zLow + Bw.t, Bw.rInner, (i / 96) * Math.PI * 2))), true)}" fill-rule="evenodd"/>${bowl.shades.map((d, i) => (d ? `<path class="iso-shade" data-shade="${i}" d="${d}"/>` : "")).join("")}<path class="iso-top" d="${bowl.top}"/></g>`);
    push(L(G.circleOf(BF, Bw.zLow + Bw.t, Bw.rInner, P, 96) + G.circleOf(BF, C.z1, Bw.rOuter, P, 96), { tone: "mid" }) + L(G.circleOf(BF, (C.z1 + Bw.zLow) / 2, (Bw.rOuter + Bw.rInner) / 2, P, 96), { tone: "faint" }));
  }
  // head above the bowl: flare and crown with its ports, then the cap
  push(S(G.solidOf(headProfile(D.HEAD.plenumTop, D.HEAD.crown0), HF, P, { steps: 72 }), "m-alu"));
  const ports = [];
  for (let i = 0; i < D.PORTS.n; i++) {
    const a = (i / D.PORTS.n) * Math.PI * 2;
    const f = G.dot3([Math.cos(a), Math.sin(a), 0], V);
    if (f < 0.05) continue;
    const half = D.PORTS.w / 2 / D.HEAD.rCrown;
    const corner = (da, z) => at([hx + D.HEAD.rCrown * Math.cos(a + da), D.HEAD.rCrown * Math.sin(a + da), z]);
    ports.push({ d: k.pathOf([corner(-half, D.PORTS.z0), corner(half, D.PORTS.z0), corner(half, D.PORTS.z1), corner(-half, D.PORTS.z1)], true), alpha: Math.min(1, (f - 0.05) / 0.3) });
  }
  const portSvg = ports.map(({ d, alpha }) => `<path class="port" d="${d}" opacity="${alpha.toFixed(2)}"/>`).join("");
  const crownF = UP(hx, 0);
  push(S(G.disc(D.HEAD.crown0, D.HEAD.crown1, D.HEAD.rCrown, crownF, P, { steps: 96 }), "m-alu", { inner: portSvg + L(G.arcOf(crownF, D.PORTS.z0 - 2, D.HEAD.rCrown, P), { tone: "faint" }) }));
  // electrode above the bowl: insulator and wire (front layer, it stands in front of the flames on this side)
  const ins = S(G.solidOf([[E.z0 + 6, E.insR], [E.z1 - 3, E.insR], [E.z1 - 1, E.insR - 0.8, 1], [E.z1, 1.6]], IF, P), "m-ceramic", { inner: L(G.arcOf(IF, E.z0 + 12, E.insR, P) + G.arcOf(IF, E.z0 + 18, E.insR, P), { tone: "faint" }) });
  const wireSvg = wire([[eIns[0], eIns[1], E.z1 - 0.5], [eIns[0], eIns[1], E.tipZ + 0.6], [eTip[0] + 0.4, eTip[1], E.tipZ]], E.wireR, "w-wire", 1.8);
  push(S(G.solidOf([[D.CAP.z0, D.CAP.r], [D.CAP.z1, D.CAP.r], ...Array.from({ length: 10 }, (_, i) => { const z = D.CAP.z1 + ((D.CAP.top - D.CAP.z1) * (i + 1)) / 11; return [z, D.capR(z), 1]; })], HF, P, { steps: 96 }), "m-enamel", { inner: L(G.arcOf(HF, D.CAP.z1, D.CAP.r, P), { tone: "faint" }) }));
  // no-WebGL fallback: a flame shape at each port facing the viewer, at HI size
  {
    let fb = "";
    for (let i = 0; i < D.PORTS.n; i++) {
      const a = (i / D.PORTS.n) * Math.PI * 2;
      const f = G.dot3([Math.cos(a), Math.sin(a), 0], V);
      if (f < 0.1) continue;
      const ptAt = (t, side) => { const s = 20 * t; const w = (1.6 + 2.6 * Math.sin(Math.PI * Math.min(1, t * 1.1)) ** 0.7) * side; const r = D.HEAD.rCrown + s * 0.94; return at([hx + r * Math.cos(a) - w * Math.sin(a) * 0.5, r * Math.sin(a) + w * Math.cos(a) * 0.5, D.PORTS.zMid + s * 0.342 + 0.012 * s * s + w * 0.6]); };
      const pts = [...Array.from({ length: 13 }, (_, j) => ptAt(j / 12, 1)), ...Array.from({ length: 13 }, (_, j) => ptAt(1 - j / 12, -1))];
      fb += `<path class="fl-out" d="${k.pathOf(pts, true)}" opacity="${Math.min(1, f * 1.4).toFixed(2)}"/>`;
    }
    front.unshift(`<g class="fallback" data-fallback="ort"><g class="fl-flames">${fb}</g><path class="fl-spark" d="${k.pathOf([at(eTip), at([eTip[0] + 1.2, eTip[1], eTip[2] + 0.7]), at([eTip[0] + 2.4, eTip[1], eTip[2] - 0.6]), at(D.polar(E.angle, D.HEAD.rCrown, E.tipZ))])}"/></g>`);
  }
  front.push(ins + wireSvg);

  // ---------- control panel, its legs and markings, the knob ----------
  const Pn = D.PANEL;
  for (const y of [-Pn.y + 6, Pn.y - 6]) {
    push(S(k.slabOf({ x: Pn.x1, y: y - 6, w: 14, d: 12, r: 0.6 }, 0, 1.6, P, 2), "m-frame"));
    push(S(k.slabOf({ x: Pn.x1, y: y - 3, w: 3, d: 6, r: 0.4 }, 1.6, Pn.z0 - 1.6, P, 2), "m-frame"));
  }
  push(S(k.slabOf({ x: Pn.x0, y: -Pn.y, w: Pn.x1 - Pn.x0, d: 2 * Pn.y, r: 1.2 }, Pn.z0, Pn.z1 - Pn.z0, P, 3, 0.4), "m-panel"));
  // detent marks on the panel face, round the stem; OFF is at the top, the knob turns counter-clockwise
  const face = Pn.x0 - 0.05;
  const markAt = (deg, r) => { const a = Math.PI / 2 + (deg * Math.PI) / 180; return [face, r * Math.cos(a), ZT + r * Math.sin(a)]; };
  let marks = "";
  for (let deg = 0; deg <= D.DETENT_MARKS.max; deg += 15) marks += k.pathOf([at(markAt(deg, 28)), at(markAt(deg, deg % 45 === 0 ? 31.5 : 30))]);
  push(L(marks, { tone: "lo" }) + L(k.pathOf(Array.from({ length: 49 }, (_, i) => at(markAt((i / 48) * D.DETENT_MARKS.max, 28)))), { tone: "faint" }));
  const textOn = (deg, text) => {
    const p = markAt(deg, 37.5);
    const o = at(p), xa = at([p[0], p[1] + 1, p[2]]), za = at([p[0], p[1], p[2] + 1]);
    return `<g transform="matrix(${r1(xa[0] - o[0])} ${r1(xa[1] - o[1])} ${r1(o[0] - za[0])} ${r1(o[1] - za[1])} ${r1(o[0])} ${r1(o[1] + 1.2)})"><text class="iso-face-text" data-tone="mid" font-size="4.2" text-anchor="middle">${text}</text></g>`;
  };
  push(textOn(0, "OFF") + textOn(90, "LITE") + textOn(140, "HI") + textOn(270, "LO"));
  push(Dots([[face, -Pn.y + 5, Pn.z0 + 5], [face, Pn.y - 5, Pn.z0 + 5], [face, -Pn.y + 5, Pn.z1 - 5], [face, Pn.y - 5, Pn.z1 - 5]].map(at), { size: 0.5 }));
  // the knob (rebuilt by the page as it turns and is pushed)
  front.push(`<g data-dyn="knob-o">${knobO({ iso: k.iso, pathOf: k.pathOf, solidSvg: k.solidSvg, fadedSvg: k.fadedSvg, lineSvg: k.lineSvg, dotsSvg: k.dotsSvg }, G, P, 0, 0)}</g>`);

  const backSvg = k.figureSvg({
    width: W, height: H, className: "gb-back",
    label: "A gas range burner rig on a test base, seen from the knob side: the knob on its control panel, the brass valve hung from the manifold with the regulator at its end, the orifice hood in the air shutter, the venturi mixing tube under the cooktop, and the burner head with its ports, cap and spark electrode in the drip bowl. The spark module sits on the base behind.",
    body: back.join(""),
  });
  const frontSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg gb-front" viewBox="0 0 ${W} ${H}" aria-hidden="true">${front.join("")}</svg>`;
  const DATA = { P, eTip, crownAt: D.polar(E.angle, D.HEAD.rCrown, E.tipZ) };
  return { P, back: backSvg, front: frontSvg, DATA, dynamic: [knobO, sleeveO] };
}

// the knob in the ortho view: body, knurls, and the grip fin turned by theta (deg), pushed in by `push` mm
export function knobO(k, G, P, theta, push) {
  const ZT = 90, face = -252, back = -228, r = 22, skirt = 24;
  const F = G.frameOf([push, 0, ZT], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const S = (paths, cls) => k.solidSvg(paths, { tone: "hi", className: cls, lit: true });
  let out = S(G.disc(back - 1, back + 4.4, 3, F, P), "m-steel");
  out += S(G.solidOf([[face, r - 2.4], [face + 2, r, 1], [back - 4, r], [back - 4, skirt], [back, skirt]], F, P, { steps: 72 }), "m-knob");
  out += k.fadedSvg(G.ribsOf(F, face + 3, back - 4, r, 44, P, { fade: [0.1, 0.55], seams: "first" }), { tone: "lo" });
  // the fin across the face, turned with the knob; OFF points straight up
  const a = Math.PI / 2 + (theta * Math.PI) / 180;
  const c = Math.cos(a), s = Math.sin(a);
  const fin = [[-2.6, -16], [2.6, -16], [2.6, 15], [0, 17.6], [-2.6, 15]].map(([u, v]) => [u * -s + v * c, u * c + v * s]);
  out += S(G.prismOf(F, fin, face - 6, face, P), "m-knob");
  const tip = G.pointOf(F, face - 6, 13, a);
  out += k.dotsSvg([k.iso(tip, P)], { size: 0.9, tone: "lit" });
  return out;
}

// the shutter sleeve on the collar, at an opening between 0 (closed) and 1
export function sleeveO(k, G, P, shutter) {
  const ZT = 90, len = 14, rOut = 18.4;
  const x0 = -135 + 13 * shutter;
  const F = G.frameOf([0, 0, ZT], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  let out = k.solidSvg(G.disc(x0, x0 + len, rOut, F, P, { steps: 64 }), { tone: "hi", className: "m-zinc", inner: k.lineSvg(G.arcOf(F, x0 + 2, rOut, P) + G.arcOf(F, x0 + len - 2, rOut, P), { tone: "faint" }) });
  // lock screw on top
  const SF = G.frameOf([x0 + 6.5, 0, ZT + rOut - 0.3], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  out += k.solidSvg(G.disc(0, 3.2, 1.6, SF, P), { tone: "hi", className: "m-steel" }) + k.solidSvg(G.disc(3.2, 5, 3, SF, P), { tone: "hi", className: "m-steel" });
  return out;
}
