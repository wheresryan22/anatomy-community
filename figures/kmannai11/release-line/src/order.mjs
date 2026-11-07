// Painter's order for disjoint axis-aligned boxes seen from the +x, +y, +z octant.
// iso and depthOf come from the kit (imported in Node, global in the page).
import { iso, depthOf } from "../../../../.skill/kit/iso-kit.mjs";

export function screenBox(b, P) {
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const x of [b[0], b[1]]) for (const y of [b[2], b[3]]) for (const z of [b[4], b[5]]) {
    const [sx, sy] = iso([x, y, z], P);
    x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
  }
  return [x0, x1, y0, y1];
}
export function behind(a, b) {
  const e = 0.01;
  for (const axis of [0, 1, 2]) {
    if (a[axis * 2 + 1] <= b[axis * 2] + e) return true;
    if (b[axis * 2 + 1] <= a[axis * 2] + e) return false;
  }
  return null;
}
export function paintOrder(list, P) {
  const n = list.length, boxes = list.map((it) => screenBox(it.box, P));
  const after = list.map(() => []), need = list.map(() => 0);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const s = boxes[i], t = boxes[j];
    if (s[1] <= t[0] || t[1] <= s[0] || s[3] <= t[2] || t[3] <= s[2]) continue;
    const r = behind(list[i].box, list[j].box);
    if (r === true) { after[i].push(j); need[j]++; }
    else if (r === false) { after[j].push(i); need[i]++; }
  }
  const depth = (it) => { const b = it.box; return depthOf([(b[0] + b[1]) / 2, (b[2] + b[3]) / 2, (b[4] + b[5]) / 2], P); };
  const ready = [], out = [];
  for (let i = 0; i < n; i++) if (!need[i]) ready.push(i);
  while (ready.length) {
    ready.sort((a, b) => depth(list[b]) - depth(list[a]));
    const i = ready.pop();
    out.push(i);
    for (const j of after[i]) if (!--need[j]) ready.push(j);
  }
  for (let i = 0; i < n; i++) if (!out.includes(i)) out.push(i);
  return out;
}
