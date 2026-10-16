// Conceptual overlays drawn in screen space over the model (shared by the film and the anatomy page).
// Needs: DATA.dirs, OVERLAY (film.mjs). Call drawOverlay(svg, s, values, project, pxPerUnit, t).
const OV_NS = "http://www.w3.org/2000/svg";
function ovOffset(owner, values) {
  const out = [0, 0, 0];
  let name = owner;
  let guard = 0;
  while (name && guard++ < 12) {
    const d = DATA.dirs[name];
    if (!d) break;
    const v = values[name] ?? 0;
    out[0] += d.dir[0] * v;
    out[1] += d.dir[1] * v;
    out[2] += d.dir[2] * v;
    name = d.parent;
  }
  return out;
}
const ovAt = (p, owner, values) => {
  const o = owner ? ovOffset(owner, values) : [0, 0, 0];
  return [p[0] + o[0], p[1] + o[1], p[2] + o[2]];
};
const f2 = (v) => v.toFixed(2);
function drawOverlay(svg, s, values, project, ppu, t, opt = {}) {
  let html = "";
  const P = (p, owner) => project(ovAt(p, owner, values));
  const fs = (px) => f2(px / ppu);
  const dash = (len, gap) => `stroke-dasharray:${len} ${gap};stroke-dashoffset:${f2(-t * 40)}`;
  if (s.beam > 0.01) {
    const B = OVERLAY.beam;
    const a = P(B.from, B.owner);
    const b = P(B.to, B.owner);
    const c = P(B.stop, B.owner);
    const cut = s.click > 0.15;
    html += `<g style="opacity:${f2(s.beam)}">`;
    if (cut) {
      html += `<path class="ov-beam-cut" d="M${f2(a[0])} ${f2(a[1])}L${f2(c[0])} ${f2(c[1])}"/>`;
      html += `<path class="ov-beam" style="opacity:.25;stroke-dasharray:3 4" d="M${f2(c[0])} ${f2(c[1])}L${f2(b[0])} ${f2(b[1])}"/>`;
    } else html += `<path class="ov-beam" d="M${f2(a[0])} ${f2(a[1])}L${f2(b[0])} ${f2(b[1])}"/>`;
    html += `<circle class="ov-dot" r="${fs(2.2)}" cx="${f2(a[0])}" cy="${f2(a[1])}" style="fill:#e5484d"/><circle class="ov-dot" r="${fs(2.2)}" cx="${f2(b[0])}" cy="${f2(b[1])}"/>`;
    const tx = (a[0] + b[0]) / 2;
    const ty = Math.min(a[1], b[1]) - 26 / ppu;
    html += `<text class="ov-tag" font-size="${fs(11)}" x="${f2(tx)}" y="${f2(ty)}" text-anchor="middle">${cut ? "BEAM INTERRUPTED · CLICK REGISTERED" : "IR BEAM CLEAR · BUTTON UP"}</text>`;
    html += `</g>`;
  }
  if (s.rays > 0.01) {
    const R = OVERLAY.rays;
    const c = R.pad.c;
    const corners = [
      [c[0] - R.pad.w / 2, c[1] - R.pad.h / 2, c[2]],
      [c[0] + R.pad.w / 2, c[1] - R.pad.h / 2, c[2]],
      [c[0] + R.pad.w / 2, c[1] + R.pad.h / 2, c[2]],
      [c[0] - R.pad.w / 2, c[1] + R.pad.h / 2, c[2]],
    ].map((p) => project(p));
    let tex = "";
    for (let i = 1; i < 12; i++) {
      const u = i / 12;
      const a = project([c[0] - R.pad.w / 2 + R.pad.w * u, c[1] - R.pad.h / 2, 0]);
      const b = project([c[0] - R.pad.w / 2 + R.pad.w * ((u * 7.3) % 1), c[1] + R.pad.h / 2, 0]);
      tex += `M${f2(a[0])} ${f2(a[1])}L${f2(b[0])} ${f2(b[1])}`;
    }
    const pts = ["led", "pipe", "hit", "dome", "eye"].map((k) => P(R[k].p, R[k].owner));
    html += `<g style="opacity:${f2(s.rays)}">`;
    html += `<path class="ov-pad" d="M${corners.map((q) => `${f2(q[0])} ${f2(q[1])}`).join("L")}Z"/><path class="ov-tex" d="${tex}"/>`;
    html += `<path class="ov-ray" style="${dash(6, 5)}" d="M${f2(pts[0][0])} ${f2(pts[0][1])}L${f2(pts[1][0])} ${f2(pts[1][1])}L${f2(pts[2][0])} ${f2(pts[2][1])}"/>`;
    html += `<path class="ov-ray-in" style="${dash(6, 5)}" d="M${f2(pts[2][0])} ${f2(pts[2][1])}L${f2(pts[3][0])} ${f2(pts[3][1])}L${f2(pts[4][0])} ${f2(pts[4][1])}"/>`;
    html += `<circle r="${fs(5 + 2 * Math.sin(t * 9))}" cx="${f2(pts[2][0])}" cy="${f2(pts[2][1])}" style="fill:rgba(229,72,77,.18);stroke:#e5484d;stroke-width:1;vector-effect:non-scaling-stroke"/>`;
    const steps = ["SURFACE TEXTURE", "IMAGE CAPTURE", "DISPLACEMENT Δx Δy", "MOTION REPORT"];
    const base = project([c[0] + R.pad.w / 2 + 4, c[1], 0]);
    steps.forEach((k, i) => {
      const on = s.rays > 0.5 && ((t * 1.6) % 4) >= i ? 1 : 0.35;
      html += `<text class="ov-tag" font-size="${fs(10)}" x="${f2(base[0] + 18 / ppu)}" y="${f2(base[1] + (i * 16 - 24) / ppu)}" style="opacity:${on}">${i + 1} · ${k}</text>`;
    });
    html += `</g>`;
  }
  if (s.link > 0.01) {
    const L = OVERLAY.link;
    const a = P(L.from.p, L.from.owner);
    const b = P(L.to.p, L.to.owner);
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const lift = len * 0.28 * (ny < 0 ? 1 : -1);
    const cx = (a[0] + b[0]) / 2 + nx * lift;
    const cy = (a[1] + b[1]) / 2 + ny * lift;
    html += `<g style="opacity:${f2(s.link)}">`;
    html += `<path class="ov-link" style="stroke-dashoffset:${f2(-t * 60)}" d="M${f2(a[0])} ${f2(a[1])}Q${f2(cx)} ${f2(cy)} ${f2(b[0])} ${f2(b[1])}"/>`;
    for (const [q, k] of [
      [a, 0],
      [b, 1],
    ])
      for (let i = 1; i <= 3; i++) {
        const ph = ((t * 1.4 + i / 3 + k * 0.5) % 1) * 18 + 6;
        html += `<circle class="ov-arc" r="${fs(ph)}" cx="${f2(q[0])}" cy="${f2(q[1])}" style="opacity:${f2(1 - (ph - 6) / 18)}"/>`;
      }
    html += `<text class="ov-tag" font-size="${fs(11)}" x="${f2(cx)}" y="${f2(cy - 10 / ppu)}" text-anchor="middle">2.4 GHz LINK · POLLING 1 / 4 / 8 kHz (DESIGN OPTIONS)</text>`;
    html += `</g>`;
  }
  if (s.labels > 0.01 && opt.frame) {
    // Callout layout: two columns beside the model, each label kept on its own line (min gap),
    // elbow leaders from the part to the column, text on a paper halo so it reads over parts.
    const F = opt.frame;
    const B = opt.box ?? F;
    const size = 11;
    const gap = (opt.compact ? 20 : 25) / ppu;
    const textW = (t) => (t.length * size * 0.61 + 8) / ppu;
    const items = OVERLAY.labels.map((l) => ({ ...l, text: opt.compact ? l.text.split(" · ")[0] : l.text, at: P(l.p, l.owner) }));
    const cx = B.x + B.w / 2;
    // sides: keep the authored side unless the part has crossed far to the other half of the model
    for (const it of items) it.dir = Math.abs(it.at[0] - cx) > B.w * 0.18 ? Math.sign(it.at[0] - cx) || it.side : it.side;
    const pad = 14 / ppu;
    const top = F.y + 40 / ppu;
    const bottom = F.y + F.h - 44 / ppu;
    for (const dir of [-1, 1]) {
      const col = items.filter((it) => it.dir === dir).sort((a, b) => a.at[1] - b.at[1]);
      if (!col.length) continue;
      const widest = Math.max(...col.map((it) => textW(it.text)));
      let x = dir < 0 ? B.x - 34 / ppu : B.x + B.w + 34 / ppu;
      x = dir < 0 ? Math.max(x, F.x + pad + widest) : Math.min(x, F.x + F.w - pad - widest);
      // stack: start each label at its part's height, push down to keep the gap, then pull back up if it ran off
      let y = -Infinity;
      for (const it of col) {
        y = Math.max(it.at[1], y + gap);
        it.ly = y;
      }
      const over = col[col.length - 1].ly - bottom;
      if (over > 0) for (const it of col) it.ly -= over;
      for (let i = 1; i < col.length; i++) col[i].ly = Math.max(col[i].ly, col[i - 1].ly + gap);
      if (col[0].ly < top) {
        const d = top - col[0].ly;
        for (const it of col) it.ly += d;
      }
      for (const it of col) it.lx = x;
    }
    html += `<g style="opacity:${f2(s.labels)}">`;
    for (const it of items) {
      const [px, py] = it.at;
      const elbow = it.lx - (it.dir * 16) / ppu;
      html += `<path class="ov-lead" d="M${f2(px)} ${f2(py)}L${f2(elbow)} ${f2(it.ly)}H${f2(it.lx - (it.dir * 3) / ppu)}"/><circle class="ov-dot" r="${fs(2.2)}" cx="${f2(px)}" cy="${f2(py)}"/>`;
    }
    for (const it of items) {
      const tx = it.lx + (it.dir * 3) / ppu;
      html += `<text class="ov-label" font-size="${fs(size)}" x="${f2(tx)}" y="${f2(it.ly + (size * 0.36) / ppu)}" text-anchor="${it.dir < 0 ? "end" : "start"}">${it.text}</text>`;
    }
    html += `</g>`;
  }
  if (svg.__last !== html) {
    svg.innerHTML = html;
    svg.__last = html;
  }
}
