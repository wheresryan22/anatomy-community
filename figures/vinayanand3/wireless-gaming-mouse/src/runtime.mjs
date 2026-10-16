// Figure-side patch to the inlined turning runtime (the page carries its own copy of the kit's runtime text;
// the kit itself is untouched). The shell panels are large spheres cut into small faces, so:
//  1. each flat face of a ball is precomputed as an exact polygon (its disc clipped by the other flats),
//     instead of a fixed number of rim samples that leaves small faces with too few points;
//  2. a ball's collision cloud for depth sorting is built from those exact faces plus its curved top,
//     thinned to the extreme points along 240 directions.
// Each replaced snippet must match the kit text exactly once, or the build stops.

const PREPARE_OLD = `  run.limb = Math.max(32, Math.min(160, Math.ceil((T3_TAU * spec.r * k * unit) / 1.5)));
  run.rimCount = run.flats.map((flat) => Math.max(20, Math.min(120, Math.ceil((T3_TAU * flat.rho * k * unit) / 1.5))));
}`;
const PREPARE_NEW = `  run.limb = Math.max(32, Math.min(160, Math.ceil((T3_TAU * spec.r * k * unit) / 1.5)));
  run.rimCount = run.flats.map((flat) => Math.max(20, Math.min(120, Math.ceil((T3_TAU * flat.rho * k * unit) / 1.5))));
  run.rimW = run.flats.map((cut, ci) => {
    const count = Math.max(360, run.rimCount[ci] * 3);
    let poly = [];
    for (let j = 0; j < count; j++) {
      const a = (j / count) * T3_TAU;
      poly.push([cut.rho * Math.cos(a), cut.rho * Math.sin(a)]);
    }
    run.flats.forEach((other, oi) => {
      if (oi === ci || poly.length < 3) return;
      const au = other.n[0] * cut.u[0] + other.n[1] * cut.u[1] + other.n[2] * cut.u[2];
      const av = other.n[0] * cut.v[0] + other.n[1] * cut.v[1] + other.n[2] * cut.v[2];
      const an = other.n[0] * cut.n[0] + other.n[1] * cut.n[1] + other.n[2] * cut.n[2];
      const b = other.d - cut.d * an;
      const out = [];
      for (let i = 0; i < poly.length; i++) {
        const p = poly[i];
        const q = poly[(i + 1) % poly.length];
        const fp = au * p[0] + av * p[1] - b;
        const fq = au * q[0] + av * q[1] - b;
        if (fp <= 1e-9) out.push(p);
        if ((fp < -1e-9 && fq > 1e-9) || (fp > 1e-9 && fq < -1e-9)) {
          const t = fp / (fp - fq);
          out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
        }
      }
      poly = out;
    });
    return poly.map(([x, y]) => [(cut.n[0] * cut.d + x * cut.u[0] + y * cut.v[0]) / spec.r, (cut.n[1] * cut.d + x * cut.u[1] + y * cut.v[1]) / spec.r, (cut.n[2] * cut.d + x * cut.u[2] + y * cut.v[2]) / spec.r]);
  });
}`;

const RIMS_OLD = `  const rims = flats.map((cut, ci) => {
    const count = run.rimCount[ci];
    const t = t3Table(count);
    const list = [];
    for (let j = 0; j < count; j++) {
      const w = [(cut.n[0] * cut.d + cut.rho * (cut.u[0] * t[2 * j] + cut.v[0] * t[2 * j + 1])) / r, (cut.n[1] * cut.d + cut.rho * (cut.u[1] * t[2 * j] + cut.v[1] * t[2 * j + 1])) / r, (cut.n[2] * cut.d + cut.rho * (cut.u[2] * t[2 * j] + cut.v[2] * t[2 * j + 1])) / r];
      list.push({ w, keep: inside(w, ci), p: flat(w) });
    }
    return list;
  });`;
const RIMS_NEW = `  const rims = run.rimW.map((ws) => ws.map((w) => ({ w, keep: true, p: flat(w) })));`;

const CLOUD_OLD = `function t3Cloud(run, part) {
  const out = [];`;
const CLOUD_NEW = `function t3Cloud(run, part) {
  if (run.kind === "ball" && run.rimW) {
    const { c, r, flats } = run;
    const pts = [];
    for (const ws of run.rimW) for (const w of ws) pts.push(w);
    const N = 6000;
    const g = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (2 * (i + 0.5)) / N;
      const rad = Math.sqrt(1 - y * y);
      const w = [Math.cos(g * i) * rad, Math.sin(g * i) * rad, y];
      let ok = true;
      for (const f of flats) if (w[0] * f.n[0] + w[1] * f.n[1] + w[2] * f.n[2] > f.d / r + 1e-9) { ok = false; break; }
      if (ok) pts.push(w);
    }
    const keep = new Set();
    for (let i = 0; i < 240; i++) {
      const z = 1 - (2 * (i + 0.5)) / 240;
      const rr = Math.sqrt(1 - z * z);
      const d = [Math.cos(g * i) * rr, Math.sin(g * i) * rr, z];
      let best = -Infinity;
      let at = 0;
      for (let k = 0; k < pts.length; k++) {
        const v = pts[k][0] * d[0] + pts[k][1] * d[1] + pts[k][2] * d[2];
        if (v > best) { best = v; at = k; }
      }
      keep.add(at);
    }
    const o = [];
    for (const k of keep) o.push(c[0] + r * pts[k][0], c[1] + r * pts[k][1], c[2] + r * pts[k][2]);
    return Float64Array.from(o);
  }
  const out = [];`;

export function patchTurn(text) {
  for (const [old, neu, name] of [
    [PREPARE_OLD, PREPARE_NEW, "ball prepare"],
    [RIMS_OLD, RIMS_NEW, "ball rims"],
    [CLOUD_OLD, CLOUD_NEW, "ball cloud"],
  ]) {
    const n = text.split(old).length - 1;
    if (n !== 1) throw new Error(`runtime patch "${name}": expected the kit snippet once, found ${n}; the kit has changed`);
    text = text.replace(old, () => neu);
  }
  return text;
}
