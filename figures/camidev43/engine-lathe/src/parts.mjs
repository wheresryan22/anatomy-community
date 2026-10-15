// Parts that turn or change while the lathe runs. The build draws them at rest and
// the page redraws them from this same module, so both always agree.
export function makeParts(k, G, P, D) {
  const V = G.viewOf(P);
  const at = (p) => k.iso(p, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const Ln = (d, style) => k.lineSvg(d, style);
  const TAU = Math.PI * 2;
  const X = [1, 0, 0];
  const depth = (p) => G.dot3(p, V);
  const spun = (F, angle) => ({ o: F.o, a: F.a, u: G.add3(G.mul3(F.u, Math.cos(angle)), G.mul3(F.v, Math.sin(angle))), v: G.add3(G.mul3(F.v, Math.cos(angle)), G.mul3(F.u, -Math.sin(angle))) });
  const poly3 = (list, closed = true) => k.pathOf(list.map(at), closed);

  // Spindle: the frame sits on the chuck face, u points up at angle 0.
  const SPIN = G.frameOf([D.chuck.face, 0, D.zc], X, [0, 0, 1], [0, -1, 0]);

  // Three stepped jaws. A jaw on the far side of the bar is drawn before it, one on the near side after.
  function jaws(angle) {
    const back = [];
    const front = [];
    for (let index = 0; index < 3; index++) {
      const F = spun(SPIN, angle + (index * TAU) / 3);
      const steps = D.jaw.steps.map(([r0, r1, h]) => {
        const poly = [[r0, -D.jaw.half], [r1, -D.jaw.half], [r1, D.jaw.half], [r0, D.jaw.half]];
        const centre = G.pointOf(F, h / 2, (r0 + r1) / 2, 0);
        return { d: depth(centre), svg: S(G.prismOf(F, poly, 0, h, P), { tone: "mid" }) + serrations(F, r0, r1, h) };
      });
      steps.sort((a, b) => a.d - b.d);
      const facing = G.dot3(F.u, V);
      (facing < 0 ? back : front).push({ d: depth(G.pointOf(F, 6, 24, 0)), svg: steps.map((s) => s.svg).join("") });
    }
    back.sort((a, b) => a.d - b.d);
    front.sort((a, b) => a.d - b.d);
    return { back: back.map((j) => j.svg).join(""), front: front.map((j) => j.svg).join("") };
  }

  // Grip lines across the inner step's end face, running edge to edge.
  function serrations(F, r0, r1, h) {
    if (r0 > D.jaw.steps[0][0] + 0.1) return "";
    if (G.dot3(F.a, V) <= 0.05) return "";
    const lines = [];
    for (let i = 1; i < 4; i++) {
      const r = r0 + ((r1 - r0) * i) / 4;
      lines.push(k.pathOf([at(G.add3(G.pointOf(F, h, r, 0), G.mul3(F.v, -D.jaw.half))), at(G.add3(G.pointOf(F, h, r, 0), G.mul3(F.v, D.jaw.half)))]));
    }
    return Ln(lines.join(""), { tone: "lo" });
  }

  // Slots and key sockets engraved in the chuck face, which turn with it.
  function chuckFace(angle) {
    const out = [];
    for (let index = 0; index < 3; index++) {
      const F = spun(SPIN, angle + (index * TAU) / 3);
      const w = D.jaw.half + 0.9;
      const r0 = D.jaw.steps[0][0] + 0.8;
      const r1 = D.chuck.r - 2.6;
      out.push(poly3([G.add3(G.pointOf(F, 0.02, r0, 0), G.mul3(F.v, -w)), G.add3(G.pointOf(F, 0.02, r1, 0), G.mul3(F.v, -w)), G.add3(G.pointOf(F, 0.02, r1, 0), G.mul3(F.v, w)), G.add3(G.pointOf(F, 0.02, r0, 0), G.mul3(F.v, w))]));
      const K = spun(SPIN, angle + (index * TAU) / 3 + Math.PI / 3);
      const c = G.pointOf(K, 0.02, D.chuck.r - 7, 0);
      const s = 1.5;
      out.push(poly3([G.add3(c, G.add3(G.mul3(K.u, -s), G.mul3(K.v, -s))), G.add3(c, G.add3(G.mul3(K.u, s), G.mul3(K.v, -s))), G.add3(c, G.add3(G.mul3(K.u, s), G.mul3(K.v, s))), G.add3(c, G.add3(G.mul3(K.u, -s), G.mul3(K.v, s)))]));
    }
    return Ln(out.join(""), { tone: "lo" });
  }

  // A dished handwheel's moving parts: three lightening holes and the crank handle.
  function wheelTurn(W, angle) {
    const F = spun(W.F, angle);
    const holes = [];
    if (G.dot3(F.a, V) > 0.1) {
      for (let index = 0; index < 3; index++) {
        const H = spun(F, (index * TAU) / 3 + Math.PI / 3);
        const c = G.pointOf(H, W.face, W.r * 0.5, 0);
        const ring = [];
        for (let j = 0; j < 20; j++) {
          const t = (j / 20) * TAU;
          ring.push(G.add3(c, G.add3(G.mul3(H.u, Math.cos(t) * W.r * 0.16), G.mul3(H.v, Math.sin(t) * W.r * 0.16))));
        }
        holes.push(poly3(ring));
      }
    }
    const base = G.pointOf(F, W.face, W.r - 2.6, 0);
    const HF = G.frameAlong(base, F.a);
    const handle =
      S(G.disc(0, 1.2, 1.9, HF, P, { steps: 20 }), { tone: "mid" }) +
      S(G.disc(1.2, W.grip, 1.05, HF, P, { steps: 16 }), { tone: "mid", crease: "none" }) +
      S(G.solidOf([[W.grip, 1.7], [W.grip + 0.6, 2.2, 1], [W.grip + W.knob * 0.5, 2.4, 1], [W.grip + W.knob, 1.9, 1], [W.grip + W.knob + 0.7, 0]], HF, P, { steps: 24 }), { tone: "hi" });
    return (holes.length ? Ln(holes.join(""), { tone: "lo" }) : "") + handle;
  }

  // The load meter's needle, in the plane of its glass.
  function needle(load) {
    const M = D.meter;
    const a = (-0.42 + Math.min(1.1, Math.max(0, load)) * 0.84) * Math.PI;
    const F = M.F;
    const p0 = G.pointOf(F, M.face + 0.1, 1.2, a + Math.PI);
    const p1 = G.pointOf(F, M.face + 0.1, M.r - 3.4, a);
    return Ln(k.pathOf([at(p0), at(p1)]), { tone: "lit", free: true });
  }

  // The speed selector's pointer, at one of eight positions round its dial.
  function pointer(index) {
    const F = D.knob.F;
    const a = D.knob.from + (index / (D.knob.count - 1)) * (D.knob.to - D.knob.from);
    const p0 = G.pointOf(F, D.knob.top, 1.1, a);
    const p1 = G.pointOf(F, D.knob.top, D.knob.r - 0.7, a);
    return Ln(k.pathOf([at(p0), at(p1)]), { tone: "hi" });
  }

  // Half-nut lever: down is engaged on the lead screw, up is open.
  function lever(engaged) {
    const L = D.lever;
    const angle = engaged ? L.down : L.up;
    const dir = [Math.cos(angle), 0, Math.sin(angle)];
    const tip = G.add3(L.pivot, G.mul3(dir, L.length));
    const F = G.frameOf(G.add3(L.pivot, [0, L.s0, 0]), [0, 1, 0], dir, [Math.sin(angle), 0, -Math.cos(angle)]);
    const arm = S(G.prismOf(F, [[-1.2, -1.3], [L.length, -0.9], [L.length, 0.9], [-1.2, 1.3]], 0, 1.6, P), { tone: "mid" });
    const knob = S(G.sphereOf(G.add3(tip, [0, L.s0 + 0.8, 0]), 2.3, P, { steps: 28 }), { tone: "hi" });
    return arm + knob;
  }

  // A coiled steel chip: a helix round a line, drawn as a closed ribbon so it has no loose ends.
  function coil(start, dir, { length, radius, turns, phase = 0, grow = 1, width = 0.32, n = 72 }) {
    const run = G.unit3(dir);
    const side = Math.abs(run[0]) > 0.9 ? [0, 1, 0] : [1, 0, 0];
    const e1 = G.unit3(G.cross3(run, side));
    const e2 = G.cross3(run, e1);
    const left = [];
    const right = [];
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * grow;
      const turn = phase + t * turns * TAU;
      const r = radius(t);
      const c = G.add3(start, G.add3(G.mul3(run, t * length), G.add3(G.mul3(e1, Math.cos(turn) * r), G.mul3(e2, Math.sin(turn) * r))));
      const w = width + 0.12 * (1 - t);
      left.push(at(G.add3(c, G.mul3(run, -w))));
      right.push(at(G.add3(c, G.mul3(run, w))));
    }
    return k.pathOf([...left, ...right.reverse()], true);
  }

  // The live chip leaves the rake face up and toward the operator.
  // Its ribbon is as wide as the depth of cut (half-width in world units), so a deep roughing cut
  // throws a broad chip and a finishing cut a thin wire.
  function chip(phase, tip, grow = 1, half = 0.375) {
    if (grow <= 0.01) return "";
    return `<path class="lt-chip" d="${coil(G.add3(tip, [0.8, 0.6, 0.3]), [0.35, 0.55, 1], { length: 15, radius: (t) => 1.1 + 1.7 * Math.sqrt(t), turns: 2, phase, grow, width: Math.max(0.05, half - 0.06) })}"/>`;
  }

  // The cross-slide collar's zero line, which turns with the screw against the fixed index on the bracket.
  function collar(angle) {
    const C = D.collar;
    const F = spun(C.F, angle);
    return Ln(k.pathOf([at(G.pointOf(F, C.face, 2, 0)), at(G.pointOf(F, C.face, C.r, 0))]), { tone: "lit", free: "end" });
  }

  // The thread-chasing dial: its gear meshes the lead screw, so it stands still only while the half-nut is closed.
  function dial(angle) {
    const T = D.dial;
    const F = spun(T.F, angle);
    return Ln(k.pathOf([at(G.pointOf(F, T.top, 0, 0)), at(G.pointOf(F, T.top, T.r - 1.6, 0))]), { tone: "hi" });
  }

  return { SPIN, jaws, chuckFace, wheelTurn, needle, pointer, lever, chip, coil, dial, collar, spun };
}
