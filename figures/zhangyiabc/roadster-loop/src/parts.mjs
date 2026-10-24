// Live parts: a futuristic hypercar at any pitch+roll pose, its fans, thruster plumes,
// cold-gas jets, landing fog and strobe ghosts. makeParts(k, G, P, D) is shared by the
// Node build and the page. No imports.

export function makeParts(k, G, P, D) {
  const at = (p) => k.iso(p, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const Ln = (d, style) => k.lineSvg(d, style);
  const Dots = (points, style) => k.dotsSvg(points, style);
  const depth = (p) => G.dot3(p, G.viewOf(P));
  const WR = D.wheelR;
  const KKP = P.scale * 1.2649;

  // ---- pose frame: pitch about the lateral axis, then roll about the forward axis
  function frameOf(st) {
    const p = st.pitch * Math.PI / 180;
    const r = st.roll * Math.PI / 180;
    const fwd0 = [-Math.cos(p), 0, Math.sin(p)];
    const up0 = [Math.sin(p), 0, Math.cos(p)];
    const cr = Math.cos(r), sr = Math.sin(r);
    const up = [up0[0] * cr, sr, up0[2] * cr];
    const lat = [-up0[0] * sr, cr, -up0[2] * sr];
    return { R: [st.pos[0], 0, st.pos[1]], fwd: fwd0, up, lat, up0 };
  }
  const pt = (F, s, l, w) => [
    F.R[0] + F.fwd[0] * s + F.lat[0] * l + F.up[0] * w,
    F.R[1] + F.lat[1] * l + F.up[1] * w,
    F.R[2] + F.fwd[2] * s + F.lat[2] * l + F.up[2] * w,
  ];

  // angular hypercar side profile (s forward, w up from the contact point)
  const BODY = [
    [-7.0, 1.05], [-7.35, 2.5], [-7.1, 3.5], [-5.4, 3.95], [-4.0, 4.2],
    [-2.7, 3.7], [-1.3, 3.35], [0.5, 3.15], [2.3, 2.85], [4.3, 2.35],
    [6.0, 1.7], [7.1, 1.15], [7.35, 0.9], [6.9, 0.78], [-6.3, 0.78], [-6.9, 0.9],
  ];
  const rect = (a, b, c, d) => [[a, c], [b, c], [b, d], [a, d]];
  const bodyW = (s) => {                                   // profile height at a station
    for (let i = 0; i < BODY.length - 1; i++) {
      const [s0, w0] = BODY[i], [s1, w1] = BODY[i + 1];
      if (s >= s0 && s <= s1) return w0 + (w1 - w0) * (s - s0) / (s1 - s0 || 1);
    }
    return 1;
  };

  // ---- aero-covered wheel with a glowing hub ------------------------------------
  function wheel(F, sAx, side, spin) {
    const c = pt(F, sAx, side * 3.0, WR);
    const cs = Math.cos(spin), sn = Math.sin(spin);
    const latA = G.unit3(F.lat);
    const fwdS = G.add3(G.mul3(F.fwd, cs), G.mul3(F.up, sn));
    const upS = G.add3(G.mul3(F.fwd, -sn), G.mul3(F.up, cs));
    const FW = G.frameOf(c, latA, fwdS, upS);
    const face = side > 0 ? 1.25 : -1.25;
    let svg = S(G.disc(side > 0 ? -0.5 : -1.25, side > 0 ? 1.25 : 0.5, WR, FW, P, { steps: 26 }), { tone: "lo", crease: "none" });
    svg += S(G.disc(face - (side > 0 ? 0.02 : -0.02), face + (side > 0 ? 0.16 : -0.16), WR * 0.94, FW, P, { steps: 26 }), { tone: "mid", crease: "none" });   // aero cover
    svg += Ln(G.circleOf(FW, face + (side > 0 ? 0.17 : -0.17), WR * 0.62, P, 22), { tone: "lo" });
    // three glowing spin ticks on the cover
    const fo = face + (side > 0 ? 0.19 : -0.19);
    for (let i = 0; i < 3; i++) {
      const a = i * 2.094;
      svg += `<path class="rf-glow" d="${k.pathOf([at(G.pointOf(FW, fo, WR * 0.2, a)), at(G.pointOf(FW, fo, WR * 0.56, a))])}" opacity="0.9"/>`;
    }
    svg += `<circle class="rf-glowdot" cx="${at(G.pointOf(FW, fo, 0, 0))[0].toFixed(1)}" cy="${at(G.pointOf(FW, fo, 0, 0))[1].toFixed(1)}" r="${(0.7 * KKP).toFixed(2)}"/>`;
    return svg;
  }
  function ghostWheel(F, sAx, side) {
    const c = pt(F, sAx, side * 3.0, WR);
    const FW = G.frameOf(c, G.unit3(F.lat), F.fwd, F.up);
    return Ln(G.circleOf(FW, side > 0 ? 1.25 : -1.25, WR, P, 22), { tone: "faint" });
  }

  // ---- the car -------------------------------------------------------------------
  function car(st, opts = {}) {
    const ghost = opts.ghost;
    const F = frameOf(st);
    const drop = ghost ? 0 : (st.susp || 0);
    const FB = G.frameOf([F.R[0] - F.up[0] * drop, 0, F.R[2] - F.up[2] * drop], F.lat, F.fwd, F.up);
    const spin = st.wheelSpin || 0;
    const HW = 3.4;   // half body width

    if (ghost) {
      const body = G.prismOf(FB, BODY, -HW, HW, P);
      const wing = G.prismOf(FB, rect(-7.3, -4.7, 4.9, 5.35), -3.5, 3.5, P);
      let svg = Ln(body.outline, { tone: "faint" }) + Ln(wing.outline, { tone: "faint" });
      for (const sA of [-4.5, 4.5]) for (const side of [-1, 1]) svg += ghostWheel(F, sA, side);
      return `<g class="rf-ghost" opacity="0.4">${svg}</g>`;
    }

    const items = [];
    const put = (centre, svg) => items.push({ d: depth(centre), svg });

    // far wheels
    for (const sA of [-4.5, 4.5]) put(pt(F, sA, -3.0, WR), wheel(F, sA, -1, spin));
    // floor + rear diffuser fins
    put(pt(F, -5.4, 0, 0.9), S(G.prismOf(FB, rect(-6.7, -4.4, 0.3, 0.9), -3.0, 3.0, P), { tone: "lo", crease: "none" }));
    {
      let fins = "";
      for (const l of [-2.4, -1.2, 0, 1.2, 2.4]) fins += S(G.prismOf(FB, rect(-6.6, -4.6, 0.08, 0.78), l - 0.1, l + 0.1, P), { tone: "mid", crease: "none" });
      put(pt(F, -5.5, 0, 0.5), fins);
    }
    // rear wing: pylons, blade, endplates
    {
      let wing = "";
      for (const l of [-2.3, 2.3]) wing += S(G.prismOf(FB, rect(-6.4, -5.4, 3.9, 4.95), l - 0.22, l + 0.22, P), { tone: "mid", crease: "none" });
      wing += S(G.prismOf(FB, rect(-7.3, -4.7, 4.9, 5.35), -HW - 0.1, HW + 0.1, P), { tone: "hi", crease: "lo" });
      for (const l of [-HW - 0.1, HW + 0.1]) wing += S(G.prismOf(FB, rect(-7.35, -4.65, 4.7, 5.6), l - 0.09, l + 0.09, P), { tone: "mid", crease: "none" });
      put(pt(F, -6.0, 0, 5.0), wing);
    }
    // body tub (the lit subject)
    put(pt(F, 0, 0, 2.4), S(G.prismOf(FB, BODY, -HW, HW, P), { tone: "hi", lit: true, crease: "lo" }));
    // glowing shoulder accent strip on each side
    {
      const acc = (side) => {
        const pts = [];
        for (const s of [-6.2, -4.2, -2.4, -0.4, 1.8, 3.8, 5.6, 6.8]) pts.push(at(pt(F, s, side * (HW + 0.04), bodyW(s) - 0.55 - drop)));
        return `<path class="rf-glow" d="${k.pathOf(pts)}" opacity="0.95"/>`;
      };
      put(pt(F, 0, 3.4, 2.6), acc(1)); put(pt(F, 0, -3.4, 2.6), acc(-1));
    }
    // side aero blades (canard fins)
    for (const side of [-1, 1]) put(pt(F, 2.6, side * 3.6, 2.1), S(G.prismOf(FB, rect(1.4, 3.6, 1.7, 2.5), side * (HW - 0.1), side * (HW + 0.7), P), { tone: "mid", crease: "none" }));
    // canopy: dark glass bubble + bright frame
    put(pt(F, -1.0, 0, 4.0), S(G.prismOf(FB, [[-2.7, 3.3], [0.7, 3.3], [0.2, 4.55], [-2.2, 4.55]], -2.15, 2.15, P), { tone: "lo", crease: "none" }));
    put(pt(F, -1.0, 0, 4.6), Ln(k.pathOf([at(pt(F, -2.2, -2.15, 4.55 - drop)), at(pt(F, 0.2, -2.15, 4.55 - drop)), at(pt(F, 0.2, 2.15, 4.55 - drop)), at(pt(F, -2.2, 2.15, 4.55 - drop))], true), { tone: "hi" }));
    // front splitter
    put(pt(F, 6.9, 0, 0.6), S(G.prismOf(FB, rect(6.3, 7.45, 0.42, 0.72), -HW + 0.1, HW - 0.1, P), { tone: "mid", crease: "none" }));
    // glowing tail bar + front light bar
    put(pt(F, -7.0, 0, 2.9), `<path class="rf-glow" d="${k.pathOf([at(pt(F, -7.16, -2.9, 2.9 - drop)), at(pt(F, -7.16, 2.9, 2.9 - drop))])}" stroke-width="${(1.1 * KKP).toFixed(2)}" opacity="0.95"/>`);
    put(pt(F, 7.0, 0, 1.3), `<path class="rf-glow" d="${k.pathOf([at(pt(F, 7.2, -2.4, 1.35 - drop)), at(pt(F, 7.2, 2.4, 1.35 - drop))])}" stroke-width="${(0.9 * KKP).toFixed(2)}" opacity="${st.headlight > 0.4 ? 0.95 : 0.5}"/>`);
    // underbody: two glowing fan intakes + four thruster nozzles (visible upside down)
    {
      let fans = "";
      for (const s of [-1.5, -3.7]) for (const l of [-1.75, 1.75]) {
        const c = pt(F, s, l, 0.9);
        const FU = G.frameOf(c, G.unit3(F.up), F.fwd, F.lat);
        fans += S(G.disc(-0.5, 0.02, 1.5, FU, P, { steps: 26 }), { tone: "mid", crease: "none" });
        fans += Ln(G.circleOf(FU, -0.53, 1.5, P, 22), { tone: "lo" });
        const fs = st.fanSpin || 0;
        for (let i = 0; i < 5; i++) { const a = fs + i * 1.2566; fans += Ln(k.pathOf([at(G.pointOf(FU, -0.55, 0.3, a)), at(G.pointOf(FU, -0.55, 1.35, a))]), { tone: "lo" }); }
        fans += `<path class="rf-glow" d="${fanRing(FU, 1.18)}" opacity="${(0.5 + 0.5 * (st.fans || 0)).toFixed(2)}"/>`;
      }
      put(pt(F, -2.6, 0, 0.9), fans);
      let noz = "";
      for (const s of [-4.7, 4.7]) for (const l of [-2.3, 2.3]) {
        const c = pt(F, s, l, 0.9);
        const FU = G.frameOf(c, G.unit3(F.up), F.fwd, F.lat);
        noz += S(G.disc(-0.55, 0.05, 0.52, FU, P, { steps: 16 }), { tone: "mid", crease: "none" });
        noz += Ln(G.circleOf(FU, -0.57, 0.36, P, 14), { tone: "faint" });
      }
      put(pt(F, 0, 0, 0.8), noz);
    }
    // near wheels
    for (const sA of [-4.5, 4.5]) put(pt(F, sA, 3.0, WR), wheel(F, sA, 1, spin));

    items.sort((a, b) => a.d - b.d);
    return `<g class="rf-car"${st.carOpacity < 1 ? ` opacity="${st.carOpacity.toFixed(2)}"` : ""}>${items.map((i) => i.svg).join("")}</g>`;
  }
  // a glowing ring on a fan face, drawn as a closed circle path in the fan frame
  function fanRing(FU, r) {
    const pts = [];
    for (let i = 0; i <= 20; i++) pts.push(at(G.pointOf(FU, -0.56, r, i / 20 * Math.PI * 2)));
    return k.pathOf(pts, true);
  }

  // ---- thruster plumes: four columns from the nozzles to the ground -------------
  function plumes(st) {
    if (st.plume <= 0.01) return "";
    const F = frameOf(st);
    const out = [];
    for (const s of [-4.7, 4.7]) for (const l of [-2.3, 2.3]) {
      const n = pt(F, s, l, 0.35);
      const gnd = [n[0], n[1], 0.15];
      const len = n[2] - 0.15;
      if (len < 1.2) continue;
      const a = at(n), b = at(gnd);
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      const nx = -dy / L, ny = dx / L;
      const w0 = 0.44 * st.plume * KKP, w1 = (1.5 + Math.min(1.7, len / 30)) * st.plume * KKP;
      out.push(`<path class="rf-plume" d="M${(a[0] - nx * w0).toFixed(1)} ${(a[1] - ny * w0).toFixed(1)}L${(b[0] - nx * w1).toFixed(1)} ${(b[1] - ny * w1).toFixed(1)}L${(b[0] + nx * w1).toFixed(1)} ${(b[1] + ny * w1).toFixed(1)}L${(a[0] + nx * w0).toFixed(1)} ${(a[1] + ny * w0).toFixed(1)}Z" opacity="${(0.82 * st.plume).toFixed(2)}"/>`);
      out.push(`<path class="rf-plume-core" d="M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}" stroke-width="${Math.max(1, w1 * 0.7).toFixed(2)}" opacity="${(0.5 * st.plume).toFixed(2)}"/>`);
      const e = at([n[0], n[1], 0.2]);
      out.push(`<ellipse class="rf-plume" cx="${e[0].toFixed(1)}" cy="${e[1].toFixed(1)}" rx="${(w1 * 1.5).toFixed(1)}" ry="${(w1 * 0.62).toFixed(1)}" opacity="${(0.5 * st.plume).toFixed(2)}"/>`);
    }
    return out.join("");
  }

  // ---- cold-gas jets: the roll couple, then alternating trim puffs -------------
  function jets(st) {
    const F = frameOf(st);
    const out = [];
    const cone = (from, dir, len, w0, w1, cls, op) => {
      if (op < 0.03 || len < 0.4) return;
      const d = G.unit3(dir);
      const a = at(from);
      const b = at(G.add3(from, G.mul3(d, len)));
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      const nx = -dy / L, ny = dx / L;
      const p0 = w0 * KKP, p1 = w1 * KKP;
      out.push(`<path class="${cls}" d="M${(a[0] - nx * p0).toFixed(1)} ${(a[1] - ny * p0).toFixed(1)}L${(b[0] - nx * p1).toFixed(1)} ${(b[1] - ny * p1).toFixed(1)}L${(b[0] + nx * p1).toFixed(1)} ${(b[1] + ny * p1).toFixed(1)}L${(a[0] + nx * p0).toFixed(1)} ${(a[1] + ny * p0).toFixed(1)}Z" opacity="${op.toFixed(2)}"/>`);
      out.push(`<path class="rf-jet-core" d="M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}" stroke-width="${Math.max(0.9, p1 * 0.8).toFixed(2)}" opacity="${(op * 0.85).toFixed(2)}"/>`);
    };
    if (st.rollJet > 0.02) {
      const o = st.rollJet;
      cone(pt(F, -1.0, -3.5, 2.8), [0, -1, 0.08], 10 * o + 2, 0.5, 1.5, "rf-jet", 0.92 * o);
      cone(pt(F, 1.8, 3.3, 0.6), [0, 0.25, -1], 7 * o + 1.5, 0.6, 1.7, "rf-jet-w", 0.88 * o);
    }
    if (st.trimJet > 0.02) {
      const o = st.trimJet, s = st.trimOsc || 0;
      if (s >= 0) cone(pt(F, -2.0, -3.5, 2.6), [0, -1, 0.05], (5 * s + 1.5) * o, 0.4, 1.0, "rf-jet", 0.85 * o);
      else cone(pt(F, -2.0, 3.5, 2.6), [0, 1, 0.05], (5 * -s + 1.5) * o, 0.4, 1.0, "rf-jet", 0.85 * o);
      if (s >= 0) cone(pt(F, 6.0, 0, 0.5), [-0.4, 0, -1], (3.4 * s + 1.2) * o, 0.35, 0.85, "rf-jet-w", 0.8 * o);
      else cone(pt(F, -6.0, 0, 0.5), [0.4, 0, -1], (3.4 * -s + 1.2) * o, 0.35, 0.85, "rf-jet-w", 0.8 * o);
    }
    return out.join("");
  }

  // ---- landing fog ---------------------------------------------------------------
  const fract = (x) => x - Math.floor(x);
  function fog(amount) {
    if (amount <= 0.01) return "";
    const out = [];
    for (let i = 0; i < 10; i++) {
      const h1 = fract(Math.sin(i * 127.1) * 43758.55), h2 = fract(Math.sin(i * 311.7) * 28001.84), h3 = fract(Math.sin(i * 74.7) * 16532.29);
      const x = D.landX + (h1 - 0.5) * 40, y = (h2 - 0.5) * 32, z = 1 + h3 * 10;
      const grow = 0.55 + 0.8 * amount;
      const r = (5.5 + 7 * h3) * grow;
      const c = at([x, y, z]);
      const op = Math.min(0.85, amount * (0.32 + 0.4 * h2));
      out.push({ d: depth([x, y, z]), svg: `<ellipse class="rf-fog" cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" rx="${(r * KKP).toFixed(1)}" ry="${(r * KKP * 0.44).toFixed(1)}" opacity="${op.toFixed(2)}"/>` });
    }
    out.sort((a, b) => a.d - b.d);
    return out.map((o) => o.svg).join("");
  }

  // ---- shadow (only while low) ------------------------------------------------------
  function shadow(st) {
    if (st.alt > 14 || st.carOpacity < 0.05) return "";
    const op = 0.5 * (1 - st.alt / 16) * st.carOpacity;
    const plan = { x: st.pos[0] - 6.8, y: -3.5, w: 13.6, d: 7, r: 3 };
    return `<g opacity="${op.toFixed(2)}"><path class="iso-halo" d="${k.haloOf(plan, 0.12, 0.4, P)}"/></g>`;
  }

  return { car, plumes, jets, fog, shadow, frameOf, pt };
}
