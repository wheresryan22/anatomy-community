// Um prisma qualquer: contorno (u, v) num plano, estendido ao longo de `depth`, sombreado como o kit.
// Usado no build (peças fixas) e na página (a tampa, que gira na dobradiça a cada quadro).
export function makePrism(iso, pathOf, P) {
  const a = ((P.azimuth ?? 45) * Math.PI) / 180;
  const e = ((P.elevation ?? 30) * Math.PI) / 180;
  const VIEW = [Math.cos(a) * Math.cos(e), Math.sin(a) * Math.cos(e), Math.sin(e)];
  const LIGHT = [-Math.sin(a), Math.cos(a)];
  const add = (p, q) => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
  const mul = (p, s) => [p[0] * s, p[1] * s, p[2] * s];
  const dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
  const nrm = (p) => mul(p, 1 / (Math.hypot(p[0], p[1], p[2]) || 1));
  function hull(points) {
    const s = [...points].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    const c = (o, p, q) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
    const lo = [];
    for (const p of s) {
      while (lo.length >= 2 && c(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop();
      lo.push(p);
    }
    const up = [];
    for (let i = s.length - 1; i >= 0; i--) {
      while (up.length >= 2 && c(up[up.length - 2], up[up.length - 1], s[i]) <= 0) up.pop();
      up.push(s[i]);
    }
    return [...lo.slice(0, -1), ...up.slice(0, -1)];
  }
  // map(p) deixa a tampa girar: cada ponto do mundo passa por ela antes de ser projetado
  return function prism(ring, o, U, V, depth, { map = (p) => p, mapDir = (d) => d, special = {} } = {}) {
    const fr = ring.map(([u, v]) => map(add(add(o, mul(U, u)), mul(V, v))));
    const dp = mapDir(depth);
    const bk = fr.map((p) => add(p, dp));
    const F = fr.map((p) => iso(p, P));
    const B = bk.map((p) => iso(p, P));
    let area = 0;
    ring.forEach(([ax, ay], i) => {
      const [bx, by] = ring[(i + 1) % ring.length];
      area += ax * by - bx * ay;
    });
    const n = ring.length;
    const sideN = ring.map(([ax, ay], i) => {
      const [bx, by] = ring[(i + 1) % n];
      const [ou, ov] = area > 0 ? [by - ay, -(bx - ax)] : [-(by - ay), bx - ax];
      return nrm(mapDir(add(mul(U, ou), mul(V, ov))));
    });
    const capF = nrm(mul(dp, -1));
    const capB = nrm(dp);
    const vis = (nn) => dot(nn, VIEW) > 1e-6;
    const tops = [];
    const shades = [[], [], [], []];
    const extra = [];
    const place = (nn, pts, i) => {
      const d = pathOf(pts, true);
      if (special[i]) return extra.push(`<path class="${special[i]}" d="${d}"/>`);
      if (nn[2] > 0.55) return tops.push(d);
      const h = Math.hypot(nn[0], nn[1]) || 1;
      const lit = ((nn[0] * LIGHT[0] + nn[1] * LIGHT[1]) / h + 1) / 2;
      shades[Math.min(3, Math.max(0, Math.floor(lit * 4)))].push(d);
    };
    const crease = [];
    const fVis = vis(capF);
    const bVis = vis(capB);
    sideN.forEach((nn, i) => {
      if (!vis(nn)) return;
      const j = (i + 1) % n;
      place(nn, [F[i], F[j], B[j], B[i]], i);
      if (fVis) crease.push(pathOf([F[i], F[j]]));
      if (bVis) crease.push(pathOf([B[i], B[j]]));
      const prev = (i + n - 1) % n;
      if (vis(sideN[prev]) && dot(sideN[prev], nn) < 0.8) crease.push(pathOf([F[i], B[i]]));
    });
    if (fVis) place(capF, F, "front");
    if (bVis) place(capB, B, "back");
    const outline = pathOf(hull([...F, ...B]), true);
    return { fill: outline, outline, crease: crease.join(""), top: tops.join(""), shades: shades.map((s) => s.join("")), extra: extra.join("") };
  };
}
