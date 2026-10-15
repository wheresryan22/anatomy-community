// Fig 2 (the nacelle cut open): the parts that move, drawn by the page each
// frame and by the build at rest. Coordinates are the nacelle's own frame
// (+x toward the rotor), which is also Fig 2's world: its camera never yaws.

export const N = {
  shaftZ: 70,
  hssZ: 70.45,
  ring: { r: 1.62, z0: 67.6, z1: 67.92, teeth: 96 },
  pinion: { r: 0.14, z0: 67.62, z1: 67.9, teeth: 8 },
  drives: [60, 120, 240, 300],
  lockDisc: { x0: 2.05, x1: 2.2, r: 1.08, holes: 8 },
  coupling: { faces: [-3.4, -3.8], r: 0.25 },
  brake: { x: -2.92, r: 0.46, t: 0.05, at: 40 },
  stub: { len: 1.7, inner: 0.8, bolts: 30 },
  gauge: { x: -2.62, y: 1.12, z: 69.54, r: 0.15 },
};
N.driveAt = (deg) => {
  const a = (deg * Math.PI) / 180;
  const rr = N.ring.r + N.pinion.r + 0.004;
  return [rr * Math.cos(a), rr * Math.sin(a)];
};

export function makeNacelleLive(k, G, RIG) {
  const { GEO } = RIG;
  const { add3, mul3, dot3 } = G;
  const DEG = Math.PI / 180;
  const fade = (x, lo, hi) => {
    const t = Math.max(0, Math.min(1, (x - lo) / (hi - lo)));
    return t * t * (3 - 2 * t);
  };
  const op = (svg, a) => (a > 0.995 ? svg : a < 0.02 ? "" : `<g opacity="${a.toFixed(2)}">${svg}</g>`);

  // A blade root, cut a short way out of its bearing: the pitch scale on the
  // bearing face, the stub with its leading-edge mark, and the cut face showing
  // the laminate wall and the root bolts.
  function stubSvg(P, phi, pitch) {
    const V = G.viewOf(P);
    const d = [0, Math.sin(phi), Math.cos(phi)];
    const t = [0, Math.cos(phi), -Math.sin(phi)];
    const O = add3([GEO.pitchX, 0, GEO.hubZ], mul3(d, GEO.hub.h));
    const F = { o: O, a: d, u: t, v: [1, 0, 0] };
    const tb = GEO.bearing.t;
    const s1 = tb + N.stub.len;
    const r = GEO.blade.rootR;
    const out = [];
    const bearing = G.disc(0, tb, GEO.bearing.r, F, P, { steps: 56 });
    out.push(k.solidSvg(bearing, { tone: "mid", inner: k.lineSvg(G.arcOf(F, tb * 0.5, GEO.bearing.r, P), { tone: "faint" }) }));
    const face = dot3(d, V);
    const show = fade(face, 0.04, 0.3);
    const twist0 = RIG.sectionAt(GEO.blade.root).twist;
    if (show > 0.02) {
      const ticks = [];
      const major = [];
      for (let b = 0; b <= 90; b += 5) {
        const a = (twist0 + b) * DEG;
        const len = b % 15 === 0 ? 0.13 : 0.07;
        const seg = k.pathOf([G.pointOf(F, tb, GEO.bearing.r - 0.02, a), G.pointOf(F, tb, GEO.bearing.r - 0.02 - len, a)].map((p) => k.iso(p, P)));
        (b % 15 === 0 ? major : ticks).push(seg);
      }
      const rim = k.pathOf(Array.from({ length: 49 }, (_, i) => k.iso(G.pointOf(F, tb, GEO.bearing.r - 0.02, (i / 48) * 2 * Math.PI), P)), true);
      out.push(op(k.lineSvg(rim, { tone: "lo" }) + k.lineSvg(ticks.join(""), { tone: "lo" }) + k.lineSvg(major.join(""), { tone: "mid" }), show));
      out.push(op(k.dotsSvg(G.dotsOf(F, tb, GEO.bearing.r - 0.27, 16, P, { all: true, phase: 0.2 }), { size: 0.45, tone: "mid" }), show));
    }
    const psi = (pitch + twist0) * DEG;
    const stub = G.disc(tb, s1, r, F, P, { steps: 56 });
    const mark = G.pointOf(F, tb + 0.02, r, psi);
    const facing = G.facingOf(F, psi, P, 0);
    const markLine = k.pathOf([G.pointOf(F, tb, r, psi), G.pointOf(F, s1, r, psi)].map((p) => k.iso(p, P)));
    void mark;
    let cut = "";
    if (face > 0) {
      const voidPath = k.pathOf(Array.from({ length: 64 }, (_, i) => k.iso(G.pointOf(F, s1, N.stub.inner, (i / 64) * 2 * Math.PI), P)), true);
      const bolts = Array.from({ length: N.stub.bolts }, (_, i) => k.iso(G.pointOf(F, s1, (r + N.stub.inner) / 2, psi + (i / N.stub.bolts) * 2 * Math.PI), P));
      cut = `<path class="wt-void" d="${voidPath}"/>${k.lineSvg(voidPath, { tone: "mid" })}${op(k.dotsSvg(bolts, { size: 0.42, tone: "hi" }), show)}`;
    }
    const pointer = show > 0.02 ? op(k.lineSvg(k.pathOf([G.pointOf(F, tb, r - 0.02, psi), G.pointOf(F, tb, GEO.bearing.r - 0.05, psi)].map((p) => k.iso(p, P))), { tone: "lit" }), show) : "";
    out.push(k.solidSvg(stub, { tone: "hi", inner: op(k.lineSvg(markLine, { tone: "mid" }), fade(facing, 0.04, 0.42)) }));
    out.push(cut, pointer);
    return out.join("");
  }

  // Rotor parts of Fig 2 in paint order: blades sorted by d·V around the hub and
  // nose (the flats and the bisecting planes of rig.orderOf).
  // Fig 2's camera looks at the rotor's upwind face (V·x > 0), so the hub is
  // always painted before the nose; the blades go behind or in front of both.
  function rotorParts(P, rig, phi, pitch) {
    const V = G.viewOf(P);
    const blades = [0, 1, 2].map((i) => {
      const a = phi + i * 120 * DEG;
      return { a, dv: Math.cos(a) * V[2] + Math.sin(a) * V[1] };
    });
    const behind = blades.filter((b) => b.dv <= 0).sort((p, q) => p.dv - q.dv);
    const ahead = blades.filter((b) => b.dv > 0).sort((p, q) => p.dv - q.dv);
    return { behind: behind.map((b) => stubSvg(P, b.a, pitch)).join(""), hub: rig.hubSvg(P, phi), ahead: ahead.map((b) => stubSvg(P, b.a, pitch)).join("") };
  }

  // The yaw ring is fixed to the tower, so in the nacelle's frame its teeth
  // move by the opposite of the nacelle's yaw.
  function ringTeethSvg(P, yawDeg) {
    const F = G.frameOf([0, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    const ribs = G.ribsOf(F, N.ring.z0, N.ring.z1, N.ring.r, N.ring.teeth, P, { phase: -yawDeg * DEG, fade: [0.08, 0.5] });
    return k.fadedSvg(ribs, { tone: "lo" });
  }

  function pinionSvg(P, deg, turnDeg) {
    const [x, y] = N.driveAt(deg);
    const F = G.frameOf([x, y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    const ribs = G.ribsOf(F, N.pinion.z0, N.pinion.z1, N.pinion.r, N.pinion.teeth * 2, P, { phase: turnDeg * DEG, fade: [0.1, 0.55] });
    return k.fadedSvg(ribs, { tone: "mid" });
  }

  // Bolt heads on the rotor-lock disc turn with the main shaft.
  function lockDotsSvg(P, phi) {
    const F = G.frameOf([N.lockDisc.x1, 0, N.shaftZ], [1, 0, 0], [0, 0, 1], [0, 1, 0]);
    const holes = G.dotsOf(F, 0, N.lockDisc.r - 0.16, N.lockDisc.holes, P, { all: true, phase: -phi });
    const flange = G.frameOf([GEO.flange.x0, 0, N.shaftZ], [1, 0, 0], [0, 0, 1], [0, 1, 0]);
    const bolts = G.dotsOf(flange, 0, GEO.flange.r - 0.1, 20, P, { phase: -phi, fade: [0.04, 0.42], slope: 0 });
    void bolts;
    return k.dotsSvg(holes, { size: 0.9, tone: "mid" });
  }

  // The coupling's bolts at 1,680 rpm are a blur; they sharpen as it stops.
  function couplingSvg(P, angle, rpm, which) {
    const out = [];
    for (const x of [N.coupling.faces[which]]) {
      const F = G.frameOf([x, 0, N.hssZ], [1, 0, 0], [0, 0, 1], [0, 1, 0]);
      const blur = fade(rpm, 40, 300);
      const dots = G.dotsOf(F, 0, N.coupling.r - 0.07, 8, P, { phase: angle, fade: [0.04, 0.42] }).map(([px, py, a = 1]) => [px, py, a * (1 - 0.85 * blur)]);
      out.push(k.dotsSvg(dots, { size: 0.55, tone: "hi" }));
      if (blur > 0.02) out.push(op(k.lineSvg(G.arcOf(F, 0, N.coupling.r - 0.07, P, { least: -1 }), { tone: "lo" }), blur));
    }
    return out.join("");
  }

  // Brake disc marks and the caliper's two pads, which close on the disc.
  function brakeSvg(P, angle, rpm, engage) {
    const F = G.frameOf([N.brake.x + N.brake.t / 2, 0, N.hssZ], [1, 0, 0], [0, 0, 1], [0, 1, 0]);
    const blur = fade(rpm, 40, 300);
    const vents = G.dotsOf(F, 0, N.brake.r - 0.09, 12, P, { phase: angle, fade: [0.04, 0.42] }).map(([px, py, a = 1]) => [px, py, a * (1 - 0.85 * blur)]);
    const ring = blur > 0.02 ? op(k.lineSvg(G.arcOf(F, 0, N.brake.r - 0.09, P, { least: -1 }), { tone: "faint" }), blur) : "";
    return k.dotsSvg(vents, { size: 0.5, tone: "mid" }) + ring;
  }

  function padOffset(engage) {
    return 0.045 * (1 - engage);
  }

  // The hydraulic gauge, face up: 0 to 200 bar over 270°.
  function needleSvg(P, bar) {
    const g = N.gauge;
    const a = (-135 + (270 * Math.min(200, Math.max(0, bar))) / 200) * DEG;
    const dir = [Math.sin(a), -Math.cos(a)];
    const tip = [g.x + dir[0] * (g.r - 0.035), g.y + dir[1] * (g.r - 0.035), g.z];
    const tail = [g.x - dir[0] * 0.03, g.y - dir[1] * 0.03, g.z];
    return k.lineSvg(k.pathOf([tail, tip].map((p) => k.iso(p, P))), { tone: "hi", free: "start" });
  }

  return { stubSvg, rotorParts, ringTeethSvg, pinionSvg, lockDotsSvg, couplingSvg, brakeSvg, padOffset, needleSvg };
}
