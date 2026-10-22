var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/weather/kit/iso-kit.mjs
var iso_kit_exports = {};
__export(iso_kit_exports, {
  AZIMUTH: () => AZIMUTH,
  ELEVATION: () => ELEVATION,
  ISO_CSS: () => ISO_CSS,
  SHADES: () => SHADES,
  axisVector: () => axisVector,
  boxCorners: () => boxCorners,
  cameraOf: () => cameraOf,
  circleRing: () => circleRing,
  coil: () => coil,
  corners: () => corners,
  cylinder: () => cylinder,
  depthOf: () => depthOf,
  dotGrid: () => dotGrid,
  dotsSvg: () => dotsSvg,
  extrude: () => extrude,
  faceTextSvg: () => faceTextSvg,
  fadeLineSvg: () => fadeLineSvg,
  fadedSvg: () => fadedSvg,
  figureSvg: () => figureSvg,
  fitProjection: () => fitProjection,
  groupSvg: () => groupSvg,
  haloOf: () => haloOf,
  holdStill: () => holdStill,
  insetPlan: () => insetPlan,
  iso: () => iso,
  joinPaths: () => joinPaths,
  knurl: () => knurl,
  lineOnTop: () => lineOnTop,
  lineSvg: () => lineSvg,
  onTop: () => onTop,
  pageHtml: () => pageHtml,
  pathOf: () => pathOf,
  planOutline: () => planOutline,
  plateHtml: () => plateHtml,
  pointsAt: () => pointsAt,
  radialTicks: () => radialTicks,
  ring: () => ring,
  ringOf: () => ringOf,
  ringSeam: () => ringSeam,
  rise: () => rise,
  roundedPlan: () => roundedPlan,
  screenRise: () => screenRise,
  segment: () => segment,
  sideArc: () => sideArc,
  sideMatrix: () => sideMatrix,
  sideRing: () => sideRing,
  sideSeam: () => sideSeam,
  sideTicks: () => sideTicks,
  slabOf: () => slabOf,
  solidSvg: () => solidSvg,
  topMatrix: () => topMatrix,
  topTicks: () => topTicks,
  towardViewer: () => towardViewer,
  translateAlong: () => translateAlong,
  wireSvg: () => wireSvg
});
var AZIMUTH = 45;
var ELEVATION = 30;
var SHADES = 4;
var RADIANS = Math.PI / 180;
var UNIT = Math.sqrt(1.6);
function cameraOf({ scale, azimuth = AZIMUTH, elevation = ELEVATION }) {
  const a = azimuth * RADIANS;
  const e = elevation * RADIANS;
  return { sinA: Math.sin(a), cosA: Math.cos(a), sinE: Math.sin(e), cosE: Math.cos(e), k: scale * UNIT };
}
function iso([x, y, z], projection) {
  const { origin } = projection;
  const { sinA, cosA, sinE, cosE, k: k2 } = cameraOf(projection);
  return [origin[0] + (x * sinA - y * cosA) * k2, origin[1] + ((x * cosA + y * sinA) * sinE - z * cosE) * k2];
}
function towardViewer(projection) {
  const { sinA, cosA } = cameraOf(projection);
  return [cosA, sinA];
}
function depthOf([x, y, z], projection) {
  const { sinA, cosA, sinE, cosE } = cameraOf(projection);
  return (x * cosA + y * sinA) * cosE + z * sinE;
}
var tenth = (value) => {
  const text = (Math.round(value * 10) / 10).toFixed(1).replace(/\.0$/, "");
  return text === "-0" ? "0" : text;
};
function pathOf(points, closed = false) {
  if (!points.length)
    return "";
  return points.map(([x, y], at3) => `${at3 ? "L" : "M"}${tenth(x)} ${tenth(y)}`).join("") + (closed ? "Z" : "");
}
var joinPaths = (paths) => paths.filter(Boolean).join("");
function roundedPlan({ x, y, w, d, r }, steps = 8) {
  const radius = Math.max(0, Math.min(r, w / 2, d / 2));
  const corners2 = [
    [x + w - radius, y + radius, -90],
    [x + w - radius, y + d - radius, 0],
    [x + radius, y + d - radius, 90],
    [x + radius, y + radius, 180]
  ];
  const out = [];
  for (const [cx, cy, start] of corners2) {
    const count = radius > 0 ? steps : 0;
    for (let step = 0; step <= count; step++) {
      const angle = (start + (count ? 90 * step / count : 45)) * RADIANS;
      out.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
    }
  }
  return out;
}
function signedArea(points) {
  let area = 0;
  for (let index = 0; index < points.length; index++) {
    const [ax, ay] = points[index];
    const [bx, by] = points[(index + 1) % points.length];
    area += ax * by - bx * ay;
  }
  return area / 2;
}
var oriented = (points) => signedArea(points) < 0 ? [...points].reverse() : points;
function convexHull(points) {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length < 3)
    return sorted;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0)
      lower.pop();
    lower.push(point);
  }
  const upper = [];
  for (let index = sorted.length - 1; index >= 0; index--) {
    const point = sorted[index];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0)
      upper.pop();
    upper.push(point);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}
function runsOf(flags, want) {
  const count = flags.length;
  const runs = [];
  const start = flags.findIndex((flag, index) => flag !== flags[(index + count - 1) % count]);
  if (start < 0)
    return flags[0] === want ? [Array.from({ length: count + 1 }, (_, index) => index % count)] : [];
  let run = null;
  for (let step = 0; step < count; step++) {
    const index = (start + step) % count;
    if (flags[index] === want) {
      if (!run)
        run = [index];
      run.push((index + 1) % count);
    } else if (run) {
      runs.push(run);
      run = null;
    }
  }
  if (run)
    runs.push(run);
  return runs;
}
function extrude(ring2, z, height, projection, options = {}) {
  const convex = options.convex ?? true;
  const count = ring2.length;
  const counter = signedArea(ring2) > 0;
  const [vx, vy] = towardViewer(projection);
  const { sinA, cosA } = cameraOf(projection);
  const normals = ring2.map(([ax, ay], index) => {
    const [bx, by] = ring2[(index + 1) % count];
    const dx = bx - ax;
    const dy = by - ay;
    const length = Math.hypot(dx, dy) || 1;
    return counter ? [dy / length, -dx / length] : [-dy / length, dx / length];
  });
  const facing = normals.map(([nx, ny]) => nx * vx + ny * vy > 1e-9);
  const top = ring2.map(([x, y]) => iso([x, y, z + height], projection));
  const bottom = ring2.map(([x, y]) => iso([x, y, z], projection));
  const outline = [];
  const crease = [];
  for (const run of runsOf(facing, false))
    outline.push(pathOf(run.map((index) => top[index])));
  for (const run of runsOf(facing, true)) {
    crease.push(pathOf(run.map((index) => top[index])));
    if (height > 0)
      outline.push(pathOf(run.map((index) => bottom[index])));
  }
  if (height > 0) {
    for (let index = 0; index < count; index++) {
      if (facing[(index + count - 1) % count] !== facing[index])
        outline.push(pathOf([top[index], bottom[index]]));
    }
  }
  let fill;
  if (convex) {
    fill = pathOf(convexHull([...top, ...bottom]), true);
  } else {
    const parts = [pathOf(oriented(top), true), pathOf(oriented(bottom), true)];
    for (let index = 0; index < count; index++) {
      if (!facing[index])
        continue;
      const next = (index + 1) % count;
      parts.push(pathOf(oriented([top[index], top[next], bottom[next], bottom[index]]), true));
    }
    fill = parts.join("");
  }
  const buckets = Array.from({ length: SHADES }, () => []);
  if (height > 0) {
    const [lx, ly] = [-sinA, cosA];
    for (let index = 0; index < count; index++) {
      if (!facing[index])
        continue;
      const [nx, ny] = normals[index];
      const lit = (nx * lx + ny * ly + 1) / 2;
      const shade = Math.min(SHADES - 1, Math.max(0, Math.floor(lit * SHADES)));
      const next = (index + 1) % count;
      buckets[shade].push(pathOf(oriented([top[index], top[next], bottom[next], bottom[index]]), true));
    }
  }
  let bevel;
  if (options.bevel && options.bevel > 0) {
    const by = options.bevel;
    const inset = ring2.map(([x, y], index) => {
      const [ax, ay] = normals[(index + count - 1) % count];
      const [bx, by2] = normals[index];
      const mx = ax + bx;
      const my = ay + by2;
      const length = Math.hypot(mx, my) || 1;
      return [x - mx / length * by, y - my / length * by];
    });
    const insetTop = inset.map(([x, y]) => iso([x, y, z + height], projection));
    bevel = runsOf(facing, true).map((run) => pathOf([top[run[0]], ...run.slice(1, -1).map((index) => insetTop[index]), top[run[run.length - 1]]])).join("");
  }
  return {
    fill,
    outline: outline.join(""),
    crease: crease.join(""),
    top: pathOf(oriented(top), true),
    shades: buckets.map((paths) => paths.join("")),
    bevel
  };
}
var ringOf = (plan, steps = 8) => roundedPlan(plan, steps);
function slabOf(plan, z, height, projection, steps = 8, bevel = 0) {
  return extrude(ringOf(plan, steps), z, height, projection, { convex: true, bevel });
}
function circleRing(cx, cy, radius, steps = 40) {
  return Array.from({ length: steps }, (_, step) => {
    const angle = step / steps * Math.PI * 2;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  });
}
function cylinder(cx, cy, radius, z, height, projection, steps = 32, bevel = 0) {
  return extrude(circleRing(cx, cy, radius, steps), z, height, projection, { convex: true, bevel });
}
var insetPlan = ({ x, y, w, d, r }, by) => ({ x: x + by, y: y + by, w: w - by * 2, d: d - by * 2, r: Math.max(0, r - by) });
function onTop(points, z, projection, closed = false) {
  return pathOf(points.map(([x, y]) => iso([x, y, z], projection)), closed);
}
var planOutline = (plan, z, projection, steps = 8) => onTop(ringOf(plan, steps), z, projection, true);
var lineOnTop = (from, to, z, projection) => onTop([from, to], z, projection);
var segment = (from, to, projection) => pathOf([iso(from, projection), iso(to, projection)]);
var rise = (at3, from, to, projection) => segment([at3[0], at3[1], from], [at3[0], at3[1], to], projection);
var ring = (cx, cy, radius, z, projection, steps = 40) => onTop(circleRing(cx, cy, radius, steps), z, projection, true);
var pointsAt = (points, projection) => points.map((point) => iso(point, projection));
function dotGrid(x, y, columns, rows, gap, z, projection) {
  const dots = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++)
      dots.push(iso([x + column * gap, y + row * gap, z], projection));
  }
  return dots;
}
function corners({ x, y, w, d }, inset = 0) {
  return [
    [x + inset, y + inset],
    [x + w - inset, y + inset],
    [x + inset, y + d - inset],
    [x + w - inset, y + d - inset]
  ];
}
function boxCorners({ x, y, w, d }, z0, z1) {
  const out = [];
  for (const px of [x, x + w])
    for (const py of [y, y + d])
      for (const z of [z0, z1])
        out.push([px, py, z]);
  return out;
}
function knurl(cx, cy, radius, z0, z1, count, projection, inset = 0.4) {
  const [vx, vy] = towardViewer(projection);
  const lines = [];
  for (let index = 0; index < count; index++) {
    const angle = index / count * Math.PI * 2;
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    if (nx * vx + ny * vy < 0.15)
      continue;
    lines.push(segment([cx + radius * nx, cy + radius * ny, z0 + inset], [cx + radius * nx, cy + radius * ny, z1 - inset], projection));
  }
  return lines.join("");
}
function sideArc(cx, cy, radius, z, projection, steps = 24) {
  const [vx, vy] = towardViewer(projection);
  const facing = Math.atan2(vy, vx);
  const points = [];
  for (let step = 0; step <= steps; step++) {
    const angle = facing - Math.PI / 2 + step / steps * Math.PI;
    points.push(iso([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle), z], projection));
  }
  return pathOf(points);
}
function ringSeam(ring2, z, projection) {
  const count = ring2.length;
  const counter = signedArea(ring2) > 0;
  const [vx, vy] = towardViewer(projection);
  const facing = ring2.map(([ax, ay], index) => {
    const [bx, by] = ring2[(index + 1) % count];
    const dx = bx - ax;
    const dy = by - ay;
    const [nx, ny] = counter ? [dy, -dx] : [-dy, dx];
    return nx * vx + ny * vy > 1e-9;
  });
  return runsOf(facing, true).map((run) => pathOf(run.map((index) => iso([ring2[index][0], ring2[index][1], z], projection)))).join("");
}
var sideSeam = (plan, z, projection, steps = 8) => ringSeam(ringOf(plan, steps), z, projection);
function sideRing(center, radius, axis, projection, steps = 20) {
  const [px, py, pz] = center;
  const points = [];
  for (let step = 0; step < steps; step++) {
    const angle = step / steps * Math.PI * 2;
    const u = radius * Math.cos(angle);
    const v = radius * Math.sin(angle);
    points.push(iso(axis === "x" ? [px, py + u, pz + v] : [px + u, py, pz + v], projection));
  }
  return pathOf(points, true);
}
function coil(from, to, center, radius, turns, axis, projection, perTurn = 16) {
  const count = Math.max(1, Math.round(turns * perTurn));
  const back = [];
  const front = [];
  let run = [];
  let near = null;
  for (let index = 0; index <= count; index++) {
    const share = index / count;
    const angle = share * turns * Math.PI * 2;
    const u = radius * Math.cos(angle);
    const v = radius * Math.sin(angle);
    const along = from + (to - from) * share;
    const point = axis === "x" ? [along, center[0] + u, center[1] + v] : [center[0] + u, along, center[1] + v];
    const normal = axis === "x" ? [0, Math.cos(angle), Math.sin(angle)] : [Math.cos(angle), 0, Math.sin(angle)];
    const facing = depthOf(normal, projection) > 0;
    const flat = iso(point, projection);
    if (near === null)
      near = facing;
    if (facing !== near) {
      run.push(flat);
      (near ? front : back).push(pathOf(run));
      run = [flat];
      near = facing;
      continue;
    }
    run.push(flat);
  }
  if (run.length > 1)
    (near ? front : back).push(pathOf(run));
  return { back: back.join(""), front: front.join("") };
}
function topTicks(from, to, step, every, edge, z, lengths, projection, axis = "x") {
  const minor = [];
  const major = [];
  const first = Math.ceil(from / step) * step;
  for (let at3 = first, index = Math.round(first / step); at3 <= to + 1e-9; at3 += step, index++) {
    const big = index % every === 0;
    const length = big ? lengths[1] : lengths[0];
    const a = axis === "x" ? [at3, edge] : [edge, at3];
    const b = axis === "x" ? [at3, edge + length] : [edge + length, at3];
    (big ? major : minor).push(lineOnTop(a, b, z, projection));
  }
  return { minor: minor.join(""), major: major.join("") };
}
function sideTicks(from, to, step, every, face, top, lengths, projection, axis = "x") {
  const minor = [];
  const major = [];
  const first = Math.ceil(from / step) * step;
  for (let at3 = first, index = Math.round(first / step); at3 <= to + 1e-9; at3 += step, index++) {
    const big = index % every === 0;
    const length = big ? lengths[1] : lengths[0];
    const a = axis === "x" ? [at3, face, top] : [face, at3, top];
    const b = axis === "x" ? [at3, face, top - length] : [face, at3, top - length];
    (big ? major : minor).push(segment(a, b, projection));
  }
  return { minor: minor.join(""), major: major.join("") };
}
function radialTicks(cx, cy, radius, count, every, z, lengths, projection, from = 0, span = Math.PI * 2) {
  const minor = [];
  const major = [];
  const closed = Math.abs(span - Math.PI * 2) < 1e-9;
  const steps = closed ? count : count + 1;
  for (let index = 0; index < steps; index++) {
    const angle = from + index / count * span;
    const big = index % every === 0;
    const inner = radius - (big ? lengths[1] : lengths[0]);
    const sx = Math.sin(angle);
    const sy = -Math.cos(angle);
    (big ? major : minor).push(lineOnTop([cx + sx * inner, cy + sy * inner], [cx + sx * radius, cy + sy * radius], z, projection));
  }
  return { minor: minor.join(""), major: major.join("") };
}
var haloOf = (plan, z, height, projection) => slabOf(plan, z, height, projection).fill;
function axisVector(projection, [dx, dy, dz]) {
  const origin = iso([0, 0, 0], projection);
  const moved = iso([dx, dy, dz], projection);
  return [moved[0] - origin[0], moved[1] - origin[1]];
}
var fine = (value) => Math.round(value * 100) / 100;
function translateAlong(projection, by) {
  const [x, y] = axisVector(projection, by);
  return `translate(${fine(x)} ${fine(y)})`;
}
var thousandth = (value) => Math.round(value * 1e3) / 1e3;
function axesAt(at3, z, projection) {
  const origin = iso([at3[0], at3[1], z], projection);
  const along = (point) => {
    const [px, py] = iso(point, projection);
    return [px - origin[0], py - origin[1]];
  };
  return { origin, x: along([at3[0] + 1, at3[1], z]), y: along([at3[0], at3[1] + 1, z]), z: along([at3[0], at3[1], z + 1]) };
}
var matrixOf = (u, v, origin) => `matrix(${thousandth(u[0])} ${thousandth(u[1])} ${thousandth(v[0])} ${thousandth(v[1])} ${thousandth(origin[0])} ${thousandth(origin[1])})`;
function holdStill(element, [dx, dy]) {
  const text = dx || dy ? `translate(${-dx} ${-dy})` : "";
  element.querySelectorAll("[data-hold]").forEach((node) => text ? node.setAttribute("transform", text) : node.removeAttribute("transform"));
}
function topMatrix(at3, z, projection, along = "x") {
  const { origin, x, y } = axesAt(at3, z, projection);
  return along === "x" ? matrixOf(x, y, origin) : matrixOf([-y[0], -y[1]], x, origin);
}
function sideMatrix(at3, z, projection, face) {
  const { origin, x, y, z: up } = axesAt(at3, z, projection);
  const down = [-up[0], -up[1]];
  return face === "left" ? matrixOf(x, down, origin) : matrixOf([-y[0], -y[1]], down, origin);
}
function screenRise(height, projection) {
  const { cosE, k: k2 } = cameraOf(projection);
  return height * cosE * k2;
}
function fitProjection(points, width, height, { pad = 24, headroom = 0, azimuth = AZIMUTH, elevation = ELEVATION } = {}) {
  const unit2 = { origin: [0, 0], scale: 1, azimuth, elevation };
  const flat = points.map((point) => iso(point, unit2));
  const xs = flat.map(([x]) => x);
  const ys = flat.map(([, y]) => y);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const up = Math.min(...ys);
  const down = Math.max(...ys);
  const scale = Math.min((width - pad * 2) / (right - left), (height - pad * 2 - headroom) / (down - up));
  return {
    origin: [width / 2 - (left + right) / 2 * scale, headroom + (height - headroom) / 2 - (up + down) / 2 * scale],
    scale,
    azimuth,
    elevation
  };
}
var escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var attrs = (pairs) => Object.entries(pairs).filter(([, value]) => value !== void 0 && value !== false).map(([key, value]) => ` ${key}="${escape(String(value))}"`).join("");
function solidSvg(paths, { tone = "hi", crease = "faint", halo = false, lit = false, flat = false, className, inner = "" } = {}) {
  const parts = [];
  if (halo)
    parts.push(`<path class="iso-halo" d="${paths.fill}"/>`);
  parts.push(`<path class="iso-fill" d="${paths.fill}"/>`);
  if (!flat) {
    paths.shades.forEach((d, shade) => {
      if (d)
        parts.push(`<path class="iso-shade" data-shade="${shade}" d="${d}"/>`);
    });
    parts.push(`<path class="iso-top" d="${paths.top}"/>`);
  }
  if (crease !== "none" && paths.crease)
    parts.push(`<path class="iso-line iso-crease" data-tone="${crease}" d="${paths.crease}"/>`);
  if (crease !== "none" && paths.bevel)
    parts.push(`<path class="iso-line iso-bevel" data-tone="${crease}" d="${paths.bevel}"/>`);
  if (inner)
    parts.push(inner);
  parts.push(`<path class="iso-line iso-edge" data-tone="${tone}" d="${paths.outline}"/>`);
  return `<g${attrs({ class: className ? `iso-solid ${className}` : "iso-solid", "data-lit": lit ? "" : void 0, "data-seamless": paths.seamless ? "" : void 0 })}>${parts.join("")}</g>`;
}
function lineSvg(d, { tone = "lo", dotted = false, dashed = false, flow = false, className, free } = {}) {
  if (!d)
    return "";
  return `<path${attrs({
    class: className ? `iso-line ${className}` : "iso-line",
    "data-tone": tone,
    "data-free": free === true ? "" : free || void 0,
    "data-dotted": dotted ? "" : void 0,
    "data-dashed": dashed ? "" : void 0,
    "data-flow": flow ? "" : void 0,
    d
  })}/>`;
}
function dotsSvg(points, { size = 0.5, tone = "mid", pulse = false } = {}) {
  const dots = points.map(([x, y, alpha], index) => `<circle cx="${tenth(x)}" cy="${tenth(y)}" r="${size}"${alpha !== void 0 && alpha < 1 ? ` fill-opacity="${Math.max(0, alpha).toFixed(2)}"` : ""}${pulse ? ` data-pulse="" style="--pulse-at:${index * 137 % 1600}ms"` : ""}/>`).join("");
  return `<g class="iso-dots" data-tone="${tone}">${dots}</g>`;
}
function fadedSvg(list, style = {}) {
  const groups = /* @__PURE__ */ new Map();
  for (const entry of list) {
    const [d, alpha] = Array.isArray(entry) ? entry : [entry.d, entry.alpha];
    if (!d || !(alpha > 0.02))
      continue;
    const level = Math.min(1, Math.round(alpha * 20) / 20);
    groups.set(level, (groups.get(level) ?? "") + d);
  }
  return [...groups].map(([alpha, d]) => alpha >= 1 ? lineSvg(d, style) : `<g opacity="${alpha.toFixed(2)}">${lineSvg(d, style)}</g>`).join("");
}
function fadeLineSvg(points, { fade = [0, 0], tone = "lo", className, stops = 6 } = {}) {
  if (points.length < 2)
    return "";
  const ease = (t) => t * t * (3 - 2 * t);
  const hashOf = (text) => {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index++)
      hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
    return (hash >>> 0).toString(36);
  };
  const lengths = [0];
  for (let index = 1; index < points.length; index++)
    lengths.push(lengths[index - 1] + Math.hypot(points[index][0] - points[index - 1][0], points[index][1] - points[index - 1][1]));
  const at3 = (length) => {
    let index = 1;
    while (index < points.length - 1 && lengths[index] < length)
      index++;
    const span = lengths[index] - lengths[index - 1] || 1;
    const t = Math.max(0, Math.min(1, (length - lengths[index - 1]) / span));
    return [points[index - 1][0] + (points[index][0] - points[index - 1][0]) * t, points[index - 1][1] + (points[index][1] - points[index - 1][1]) * t];
  };
  const pieceOf = (from, to) => [at3(from), ...points.filter((_, index) => lengths[index] > from + 1e-6 && lengths[index] < to - 1e-6), at3(to)];
  const total = lengths[lengths.length - 1];
  if (total < 1e-6)
    return "";
  let [start, end] = Array.isArray(fade) ? fade : [fade, fade];
  if (start + end > total) {
    const share = total / (start + end);
    start *= share;
    end *= share;
  }
  const paint = `var(--anatomy-${tone})`;
  const ramp = (piece, rising) => {
    const d = pathOf(piece);
    const [x1, y1] = piece[0];
    const [x2, y2] = piece[piece.length - 1];
    const id = `iso-fade-${hashOf(`${d}|${tone}|${rising}`)}`;
    const marks = Array.from({ length: stops + 1 }, (_, index) => {
      const t = index / stops;
      const alpha = ease(rising ? t : 1 - t);
      return `<stop offset="${t.toFixed(3)}" stop-opacity="${alpha.toFixed(3)}" style="stop-color:${paint}"/>`;
    }).join("");
    const gradient = `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${tenth(x1)}" y1="${tenth(y1)}" x2="${tenth(x2)}" y2="${tenth(y2)}">${marks}</linearGradient>`;
    return `<defs>${gradient}</defs><path${attrs({ class: className ? `iso-line ${className}` : "iso-line", "data-tone": tone, "data-free": rising ? "start" : "end", d, style: `stroke:url(#${id})` })}/>`;
  };
  const parts = [];
  if (start > 0.05)
    parts.push(ramp(pieceOf(0, start), true));
  if (total - end - start > 0.05)
    parts.push(lineSvg(pathOf(pieceOf(start, total - end)), { tone, className }));
  if (end > 0.05)
    parts.push(ramp(pieceOf(total - end, total), false));
  return `<g class="iso-fade">${parts.join("")}</g>`;
}
function wireSvg(from, to, { via = [], tone = "lo", dotted = false, dashed = false, flow = false, ends = "both", size = 1.2 } = {}) {
  const d = pathOf([from, ...via, to]);
  const end = ([x, y]) => `<circle class="iso-wire-end" cx="${tenth(x)}" cy="${tenth(y)}" r="${size}"/>`;
  return `<g class="iso-wire" data-tone="${tone}">${lineSvg(d, { tone, dotted, dashed, flow })}${ends === "both" || ends === "from" ? end(from) : ""}${ends === "both" || ends === "to" ? end(to) : ""}</g>`;
}
function faceTextSvg(transform, text, { size = 3, tone = "mid", anchor = "start" } = {}) {
  return `<text class="iso-face-text" data-tone="${tone}" transform="${transform}" font-size="${size}" text-anchor="${anchor}">${escape(text)}</text>`;
}
function groupSvg(children, extra = {}) {
  return `<g${attrs(extra)}>${Array.isArray(children) ? children.join("") : children}</g>`;
}
function figureSvg({ width, height, label, body, standalone = false, className }) {
  const style = standalone ? `<style>${ISO_CSS}</style>` : "";
  return `<svg${attrs({
    xmlns: "http://www.w3.org/2000/svg",
    class: `iso-svg${standalone ? " iso" : ""}${className ? ` ${className}` : ""}`,
    "data-theme": standalone || void 0,
    viewBox: `0 0 ${width} ${height}`,
    role: "img",
    "aria-label": label
  })}>${style}${Array.isArray(body) ? body.join("") : body}</svg>`;
}
function swatchSvg(mark) {
  if (mark === "raised" || mark === "flat" || mark === "lit") {
    const body = mark === "flat" ? "M2 6.5 8 3.5 14 6.5 8 9.5Z" : "M2 4.5 8 1.5 14 4.5 14 6 8 9 2 6Z";
    const crease = mark === "flat" ? "" : `<path class="iso-swatch-crease" d="M2 4.5 8 7.5 14 4.5"/>`;
    return `<svg class="iso-swatch" data-mark="${mark}" viewBox="0 0 16 10" aria-hidden="true"><path d="${body}"/>${crease}</svg>`;
  }
  return `<svg class="iso-swatch" data-mark="${mark}" viewBox="0 0 16 10" aria-hidden="true"><path d="M1.5 5h13"/></svg>`;
}
function plateHtml({ fig, title, hint, readout = "", keys = [], caption, body }) {
  const corner = (name, text, extra = "") => `<span class="iso-plate-corner" data-corner="${name}"${extra}>${escape(text)}</span>`;
  const legend = keys.length || caption ? `<figcaption class="iso-legend">${keys.length ? `<span class="iso-keys">${keys.map((key) => `<span class="iso-key">${swatchSvg(key.mark)}${escape(key.label)}</span>`).join("")}</span>` : ""}${caption ? `<span class="iso-caption">${escape(caption)}</span>` : ""}</figcaption>` : "";
  return `<figure class="iso-figure"><div class="iso-plate"><div class="iso-plate-corners" aria-hidden="true">${corner("fig", fig)}${title ? corner("title", title) : ""}${hint ? corner("hint", hint) : ""}${corner("readout", readout, " data-readout")}</div>${body}</div>${legend}</figure>`;
}
function pageHtml({ title, theme = "dark", body, script = "", width = 650 }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)}</title><style>${ISO_CSS}${PAGE_CSS.replace("__WIDTH__", String(width))}</style></head><body class="iso" data-theme="${theme}"><main class="iso-page">${body}</main>${script ? `<script type="module">${script.replace(/<\/(script)/gi, "<\\/$1")}</script>` : ""}</body></html>`;
}
var PAGE_CSS = `
*{box-sizing:border-box}
html{color-scheme:dark}
body[data-theme="light"]{color-scheme:light}
body{margin:0;background:var(--anatomy-page);color:var(--anatomy-text);font:14px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
.iso-page{width:min(__WIDTH__px,100% - 32px);margin:64px auto 96px}
`;
var ISO_CSS = `
.iso{
  --anatomy-page:#0b0b0b;--anatomy-card:#131313;--anatomy-text:#a3a3a3;--anatomy-strong:#e6e6e6;--anatomy-muted:#6e6e6e;
  --anatomy-paper:#131313;--anatomy-face:#1b1b1b;--anatomy-top:#1c1c1c;
  --anatomy-shade-0:#0f0f0f;--anatomy-shade-1:#121212;--anatomy-shade-2:#151515;--anatomy-shade-3:#181818;
  --anatomy-lit-top:#262626;--anatomy-lit-shade:#1d1d1d;
  --anatomy-hi:#d4d4d4;--anatomy-mid:#6a6a6a;--anatomy-lo:#3e3e3e;--anatomy-faint:#2a2a2a;--anatomy-lit:#ffffff;
  --anatomy-halo:#050505;--anatomy-halo-opacity:.9;--anatomy-dot:#e6e6e6;
  --anatomy-red:#ff6b6b;--anatomy-green:#6be0a0;--anatomy-blue:#6b9bff;
  --anatomy-weight:.6px;--anatomy-ease:cubic-bezier(.32,.72,0,1);
  --anatomy-mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
  --anatomy-lift:inset 0 1px 0 0 #ffffff0a,inset 0 0 0 1px #ffffff06,0 0 0 1px #00000026,0 1px 1px -.5px #00000014,0 3px 3px -1.5px #00000014,0 6px 6px -3px #00000014,0 12px 12px -6px #00000014;
}
.iso[data-theme="light"]{
  --anatomy-page:#f2f2ef;--anatomy-card:#fbfbfa;--anatomy-text:#57575a;--anatomy-strong:#18181a;--anatomy-muted:#8c8c90;
  --anatomy-paper:#fbfbfa;--anatomy-face:#ffffff;--anatomy-top:#ffffff;
  --anatomy-shade-0:#dcdcd9;--anatomy-shade-1:#e5e5e2;--anatomy-shade-2:#ededea;--anatomy-shade-3:#f4f4f1;
  --anatomy-lit-top:#ffffff;--anatomy-lit-shade:#eeeeeb;
  --anatomy-hi:#26262a;--anatomy-mid:#8a8a8f;--anatomy-lo:#b4b4b8;--anatomy-faint:#d4d4d6;--anatomy-lit:#000000;
  --anatomy-halo:#8a8a80;--anatomy-halo-opacity:.32;--anatomy-dot:#3a3a3e;
  --anatomy-red:#e5484d;--anatomy-green:#30a46c;--anatomy-blue:#3e63dd;
  --anatomy-lift:inset 0 1px 0 0 #ffffff,0 0 0 1px #0000000f,0 1px 1px -.5px #0000000a,0 3px 3px -1.5px #0000000a,0 6px 6px -3px #0000000a,0 12px 12px -6px #0000000a;
}
.iso-svg{display:block;width:100%;height:auto;overflow:visible}
.iso-svg path,.iso-svg circle{vector-effect:non-scaling-stroke}
.iso-fill{fill:var(--anatomy-paper);stroke:none}
.iso-solid[data-lit]>.iso-fill{fill:var(--anatomy-face)}
.iso-shade,.iso-top{stroke:none}
.iso-shade[data-shade="0"]{fill:var(--anatomy-shade-0)}
.iso-shade[data-shade="1"]{fill:var(--anatomy-shade-1)}
.iso-shade[data-shade="2"]{fill:var(--anatomy-shade-2)}
.iso-shade[data-shade="3"]{fill:var(--anatomy-shade-3)}
.iso-top{fill:var(--anatomy-top)}
.iso-solid[data-lit]>.iso-top{fill:var(--anatomy-lit-top)}
.iso-solid[data-lit]>.iso-shade{fill:var(--anatomy-lit-shade)}
.iso-solid[data-seamless]>.iso-shade,.iso-solid[data-seamless]>.iso-top{stroke-width:.4;stroke-linejoin:round}
.iso-solid[data-seamless]>.iso-shade[data-shade="0"]{stroke:var(--anatomy-shade-0)}
.iso-solid[data-seamless]>.iso-shade[data-shade="1"]{stroke:var(--anatomy-shade-1)}
.iso-solid[data-seamless]>.iso-shade[data-shade="2"]{stroke:var(--anatomy-shade-2)}
.iso-solid[data-seamless]>.iso-shade[data-shade="3"]{stroke:var(--anatomy-shade-3)}
.iso-solid[data-seamless]>.iso-top{stroke:var(--anatomy-top)}
.iso-solid[data-seamless][data-lit]>.iso-top{stroke:var(--anatomy-lit-top)}
.iso-solid[data-seamless][data-lit]>.iso-shade{stroke:var(--anatomy-lit-shade)}
.iso-solid[data-lit]>.iso-edge{stroke:var(--anatomy-lit)}
.iso-halo{fill:var(--anatomy-halo);stroke:none;filter:blur(9px);opacity:var(--anatomy-halo-opacity);transform:translateY(3px)}
.iso-line{fill:none;stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight);stroke-linecap:round;stroke-linejoin:round}
.iso-line[data-tone="hi"]{stroke:var(--anatomy-hi)}
.iso-line[data-tone="mid"]{stroke:var(--anatomy-mid)}
.iso-line[data-tone="lo"]{stroke:var(--anatomy-lo)}
.iso-line[data-tone="faint"]{stroke:var(--anatomy-faint)}
.iso-line[data-tone="lit"]{stroke:var(--anatomy-lit)}
.iso-line[data-tone="red"]{stroke:var(--anatomy-red)}
.iso-line[data-tone="green"]{stroke:var(--anatomy-green)}
.iso-line[data-tone="blue"]{stroke:var(--anatomy-blue)}
.iso-line[data-dotted]{stroke-dasharray:.01 3.5;stroke-width:1}
.iso-line[data-dashed]{stroke-dasharray:3 3}
.iso-line[data-flow]{stroke-dasharray:2 6}
.iso-wire-end{fill:var(--anatomy-paper);stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight)}
.iso-wire[data-tone="hi"] .iso-wire-end{stroke:var(--anatomy-hi)}
.iso-wire[data-tone="mid"] .iso-wire-end{stroke:var(--anatomy-mid)}
.iso-wire[data-tone="faint"] .iso-wire-end{stroke:var(--anatomy-faint)}
.iso-wire[data-tone="lit"] .iso-wire-end{stroke:var(--anatomy-lit)}
.iso-dots circle{fill:var(--anatomy-dot);stroke:none;opacity:.32}
.iso-dots[data-tone="hi"] circle{opacity:.85}
.iso-dots[data-tone="mid"] circle{opacity:.45}
.iso-dots[data-tone="lo"] circle{opacity:.22}
.iso-dots[data-tone="faint"] circle{opacity:.12}
.iso-face-text{fill:var(--anatomy-mid);font-family:var(--anatomy-mono);letter-spacing:.04em}
.iso-face-text[data-tone="hi"]{fill:var(--anatomy-hi)}
.iso-face-text[data-tone="lo"]{fill:var(--anatomy-lo)}
.iso-face-text[data-tone="faint"]{fill:var(--anatomy-faint)}
.tb-body{fill:var(--anatomy-shade-2);stroke:none}
.tb-shine{fill:var(--anatomy-top);stroke:none}
.tb-shade{fill:var(--anatomy-shade-0);stroke:none}
.tb-ring{fill:none;stroke:var(--anatomy-lo);stroke-width:.45;stroke-linecap:butt;stroke-linejoin:round}
.tb-ring[data-tone="mid"]{stroke:var(--anatomy-mid)}
.tb-ring[data-tone="faint"]{stroke:var(--anatomy-faint)}
.tb-ring[data-tone="hi"]{stroke:var(--anatomy-hi)}
@keyframes iso-flow{to{stroke-dashoffset:-32}}
@keyframes iso-pulse{0%,100%{opacity:.18}12%{opacity:1}40%{opacity:.18}}
.iso-line[data-flow]{animation:iso-flow 1600ms linear infinite}
.iso-dots circle[data-pulse]{animation:iso-pulse 1600ms steps(1,end) infinite;animation-delay:var(--pulse-at,0ms)}
.iso-figure{margin:32px 0 36px}
.iso-plate{position:relative;padding:52px 24px;border-radius:0;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-mid);--anatomy-paper:var(--anatomy-card)}
.iso-plate-corners{position:absolute;inset:18px 20px;pointer-events:none}
.iso-plate-corner{position:absolute;color:var(--anatomy-muted);font-family:var(--anatomy-mono);font-size:10.5px;line-height:1;letter-spacing:.04em;white-space:nowrap}
.iso-plate-corner[data-corner="fig"]{top:0;left:0;color:var(--anatomy-text)}
.iso-plate-corner[data-corner="title"]{top:0;right:0;text-transform:uppercase;letter-spacing:.1em}
.iso-plate-corner[data-corner="hint"]{bottom:0;left:0;text-transform:uppercase;letter-spacing:.1em}
.iso-plate-corner[data-corner="readout"]{right:0;bottom:0;color:var(--anatomy-text);font-variant-numeric:tabular-nums}
.iso-plate .iso-svg{margin:0 auto}
.iso-legend{display:grid;gap:8px;margin-top:12px;color:var(--anatomy-muted);font-size:13px;line-height:1.55}
.iso-keys{display:flex;flex-wrap:wrap;gap:6px 18px}
.iso-key{display:inline-flex;align-items:center;gap:7px}
.iso-swatch{width:16px;height:10px;flex:none;overflow:visible}
.iso-swatch path{fill:none;stroke:var(--anatomy-hi);stroke-width:1;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}
.iso-swatch[data-mark="raised"] path,.iso-swatch[data-mark="flat"] path{stroke:var(--anatomy-mid)}
.iso-swatch[data-mark="lit"] path{stroke:var(--anatomy-lit)}
.iso-swatch[data-mark="dim"] path{stroke:var(--anatomy-lo)}
.iso-swatch[data-mark="dotted"] path{stroke-dasharray:.01 3;stroke-width:1.4}
.iso-swatch[data-mark="dashed"] path{stroke-dasharray:3 2.5}
.iso-swatch[data-mark="red"] path{stroke:var(--anatomy-red)}
.iso-swatch[data-mark="green"] path{stroke:var(--anatomy-green)}
.iso-swatch[data-mark="blue"] path{stroke:var(--anatomy-blue)}
.iso-swatch-crease{stroke:var(--anatomy-lo)!important}
@media (max-width:560px){.iso-plate{padding:48px 12px 70px}.iso-plate-corner[data-corner="hint"]{bottom:18px}}
@media (prefers-reduced-motion:reduce){.iso-line[data-flow],.iso-dots circle[data-pulse]{animation:none}}
`;

// src/weather/kit/lathe.mjs
var lathe_exports = {};
__export(lathe_exports, {
  add3: () => add3,
  angleToward: () => angleToward,
  arcOf: () => arcOf,
  arcPoints: () => arcPoints,
  bandOf: () => bandOf,
  bandOfProfile: () => bandOfProfile,
  bandsOf: () => bandsOf,
  circleOf: () => circleOf,
  cross3: () => cross3,
  curveRuns: () => curveRuns,
  cut: () => cut,
  disc: () => disc,
  dot3: () => dot3,
  dotsOf: () => dotsOf,
  facingOf: () => facingOf,
  fadeOf: () => fadeOf,
  fillet: () => fillet,
  frameAlong: () => frameAlong,
  frameOf: () => frameOf,
  hullOf: () => hullOf,
  lathe: () => lathe,
  len3: () => len3,
  lerp3: () => lerp3,
  lightOf: () => lightOf,
  mul3: () => mul3,
  outlineOf: () => outlineOf,
  pathLength: () => pathLength,
  pointAlong: () => pointAlong,
  pointOf: () => pointOf,
  prismOf: () => prismOf,
  profileCurve: () => profileCurve,
  radialOf: () => radialOf,
  resample: () => resample,
  ribsOf: () => ribsOf,
  ringBand: () => ringBand,
  rodOut: () => rodOut,
  runsOf: () => runsOf2,
  saddleOf: () => saddleOf,
  saddleStart: () => saddleStart,
  scaleOf: () => scaleOf,
  silhouetteOf: () => silhouetteOf,
  silhouettePoints: () => silhouettePoints,
  softOf: () => softOf,
  solidOf: () => solidOf,
  sphereOf: () => sphereOf,
  spiral: () => spiral,
  spokesOf: () => spokesOf,
  stadium: () => stadium,
  stepsFor: () => stepsFor,
  sub3: () => sub3,
  tangentAlong: () => tangentAlong,
  tangentOf: () => tangentOf,
  toneOf: () => toneOf,
  unit3: () => unit3,
  viewOf: () => viewOf
});
var TAU = Math.PI * 2;
var LIGHT_UP = 1.2;
var BANDS = [0, 0.2, 0.42, 0.62];
var dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
var add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
var sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
var mul3 = (a, k2) => [a[0] * k2, a[1] * k2, a[2] * k2];
var len3 = (a) => Math.hypot(a[0], a[1], a[2]);
var unit3 = (a) => {
  const length = len3(a) || 1;
  return [a[0] / length, a[1] / length, a[2] / length];
};
var cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
var lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
function viewOf(P2) {
  const { sinA, cosA, sinE, cosE } = cameraOf(P2);
  return [cosA * cosE, sinA * cosE, sinE];
}
function lightOf(P2) {
  const { sinA, cosA } = cameraOf(P2);
  return unit3([-sinA, cosA, LIGHT_UP]);
}
var scaleOf = (P2) => cameraOf(P2).k;
function bandOf(score) {
  let tone = 0;
  while (tone < BANDS.length && score >= BANDS[tone]) tone++;
  return tone;
}
var toneOf = (normal, P2) => bandOf(dot3(unit3(normal), lightOf(P2)));
function frameAlong(o, a) {
  const axis = unit3(a);
  const helper = Math.abs(axis[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
  const u = unit3(cross3(helper, axis));
  const v = cross3(axis, u);
  return { o, a: axis, u, v };
}
var frameOf = (o, a, u, v) => ({ o, a, u, v });
function pointOf(F, s, r, angle) {
  const c = Math.cos(angle);
  const n = Math.sin(angle);
  return [
    F.o[0] + F.a[0] * s + r * (c * F.u[0] + n * F.v[0]),
    F.o[1] + F.a[1] * s + r * (c * F.u[1] + n * F.v[1]),
    F.o[2] + F.a[2] * s + r * (c * F.u[2] + n * F.v[2])
  ];
}
var radialOf = (F, angle) => {
  const c = Math.cos(angle);
  const n = Math.sin(angle);
  return [c * F.u[0] + n * F.v[0], c * F.u[1] + n * F.v[1], c * F.u[2] + n * F.v[2]];
};
var tangentOf = (F, angle) => {
  const c = Math.cos(angle);
  const n = Math.sin(angle);
  return [-n * F.u[0] + c * F.v[0], -n * F.u[1] + c * F.v[1], -n * F.u[2] + c * F.v[2]];
};
var angleToward = (F, direction) => Math.atan2(dot3(direction, F.v), dot3(direction, F.u));
function hullTagged(points) {
  const sorted = [...points].sort((a, b) => a.p[0] - b.p[0] || a.p[1] - b.p[1]);
  if (sorted.length < 3) return sorted;
  const cross = (o, a, b) => (a.p[0] - o.p[0]) * (b.p[1] - o.p[1]) - (a.p[1] - o.p[1]) * (b.p[0] - o.p[0]);
  const lower = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 1e-9) lower.pop();
    lower.push(point);
  }
  const upper = [];
  for (let index = sorted.length - 1; index >= 0; index--) {
    const point = sorted[index];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 1e-9) upper.pop();
    upper.push(point);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}
var hullOf = (points) => hullTagged(points.map((p) => ({ p }))).map(({ p }) => p);
function runsOf2(flags) {
  const count = flags.length;
  const start = flags.findIndex((flag, index) => flag !== flags[(index + count - 1) % count]);
  if (start < 0) return flags[0] ? [Array.from({ length: count + 1 }, (_, index) => index % count)] : [];
  const runs = [];
  let run = null;
  for (let step = 0; step < count; step++) {
    const index = (start + step) % count;
    if (flags[index]) {
      if (!run) run = [index];
      run.push((index + 1) % count);
    } else if (run) {
      runs.push(run);
      run = null;
    }
  }
  if (run) runs.push(run);
  return runs;
}
function groupsOf(keys) {
  const count = keys.length;
  const out = [];
  const start = keys.findIndex((key, index) => key !== keys[(index + count - 1) % count]);
  if (start < 0) {
    if (keys[0] !== null) out.push({ key: keys[0], run: Array.from({ length: count + 1 }, (_, index) => index % count) });
    return out;
  }
  let current = null;
  for (let step = 0; step < count; step++) {
    const index = (start + step) % count;
    const key = keys[index];
    if (current && current.key === key) {
      current.run.push((index + 1) % count);
      continue;
    }
    if (current && current.key !== null) out.push(current);
    current = { key, run: [index, (index + 1) % count] };
  }
  if (current && current.key !== null) out.push(current);
  return out;
}
var stepsFor = (radius, least = 16, most = 112, scale = 0) => Math.max(least, Math.min(most, scale ? Math.ceil(TAU * radius * scale / 3) : Math.round(radius * 1.3 / 4) * 4));
function chains(edges) {
  const out = [];
  let current = null;
  for (const [a, b, keep] of edges) {
    if (!keep) {
      if (current) out.push(current);
      current = null;
      continue;
    }
    if (!current) current = [a];
    current.push(b);
  }
  if (current) out.push(current);
  if (out.length > 1 && edges[0][2] && edges[edges.length - 1][2]) {
    const last = out.pop();
    out[0] = [...last, ...out[0].slice(1)];
  }
  return out;
}
function labelledArcs(nr, na, view, light, gr = nr, ga = na) {
  const cuts = [];
  if (Math.abs(gr) > 1e-9) {
    const visibleCut = -(ga * view.a) / (gr * view.flat);
    if (visibleCut > -1 && visibleCut < 1) {
      const d = Math.acos(visibleCut);
      cuts.push(view.phi - d, view.phi + d);
    }
  }
  if (Math.abs(nr) > 1e-9) {
    for (const threshold of BANDS) {
      const c = (threshold - na * light.a) / (nr * light.flat);
      if (c > -1 && c < 1) {
        const d = Math.acos(c);
        cuts.push(light.phi - d, light.phi + d);
      }
    }
  }
  const wrap = (angle) => (angle % TAU + TAU) % TAU;
  const sorted = [...new Set(cuts.map((angle) => Math.round(wrap(angle) * 1e9) / 1e9))].sort((a, b) => a - b);
  const label = (angle) => {
    const facing = gr * view.flat * Math.cos(angle - view.phi) + ga * view.a;
    if (facing <= 1e-9) return -1;
    return bandOf(nr * light.flat * Math.cos(angle - light.phi) + na * light.a);
  };
  if (!sorted.length) {
    const tone = label(0);
    return tone < 0 ? [] : [{ tone, from: 0, to: TAU, full: true }];
  }
  const arcs = sorted.map((from, index) => {
    const to = index + 1 < sorted.length ? sorted[index + 1] : sorted[0] + TAU;
    return { tone: label((from + to) / 2), from, to };
  });
  const merged = [];
  for (const arc of arcs) {
    const last = merged[merged.length - 1];
    if (last && last.tone === arc.tone && Math.abs(last.to - arc.from) < 1e-9) last.to = arc.to;
    else merged.push({ ...arc });
  }
  if (merged.length > 1 && merged[0].tone === merged[merged.length - 1].tone && Math.abs(merged[merged.length - 1].to - TAU - merged[0].from) < 1e-9) {
    const last = merged.pop();
    merged[0].from = last.from - TAU;
  }
  return merged.filter((arc) => arc.tone >= 0);
}
function hermiteSlopes(run) {
  const n = run.length - 1;
  const h = Array.from({ length: n }, (_, j) => run[j + 1][0] - run[j][0]);
  const delta = h.map((value, j) => (run[j + 1][1] - run[j][1]) / value);
  const d = new Array(n + 1).fill(0);
  const end = (h0, h1, d0, d1) => {
    let value = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
    if (Math.sign(value) !== Math.sign(d0)) value = 0;
    else if (Math.sign(d0) !== Math.sign(d1) && Math.abs(value) > Math.abs(3 * d0)) value = 3 * d0;
    return value;
  };
  if (n === 1) d[0] = d[1] = delta[0];
  else {
    d[0] = end(h[0], h[1], delta[0], delta[1]);
    d[n] = end(h[n - 1], h[n - 2], delta[n - 1], delta[n - 2]);
  }
  for (let k2 = 1; k2 < n; k2++) {
    if (delta[k2 - 1] * delta[k2] <= 0) continue;
    const w1 = 2 * h[k2] + h[k2 - 1];
    const w2 = h[k2] + 2 * h[k2 - 1];
    d[k2] = (w1 + w2) / (w1 / delta[k2 - 1] + w2 / delta[k2]);
  }
  return d;
}
function curveRuns(meridian) {
  const m = meridian.length;
  const segments = new Array(m - 1).fill(null);
  let start = 0;
  while (start < m - 1) {
    let end = start + 1;
    while (end < m - 1 && meridian[end][2] && Math.abs(meridian[end + 1][0] - meridian[end][0]) > 1e-9 && Math.abs(meridian[end][0] - meridian[end - 1][0]) > 1e-9) end++;
    const run = meridian.slice(start, end + 1);
    const n = run.length - 1;
    if (n >= 2 && run.every((point, j) => j === 0 || Math.abs(point[0] - run[j - 1][0]) > 1e-9)) {
      const d = hermiteSlopes(run);
      for (let j = 0; j < n; j++) {
        const [s0, r0] = run[j];
        const [s1, r1] = run[j + 1];
        const hj = s1 - s0;
        const d0 = d[j];
        const d1 = d[j + 1];
        const radius = (s) => {
          const t = (s - s0) / hj;
          return (2 * t ** 3 - 3 * t ** 2 + 1) * r0 + (t ** 3 - 2 * t ** 2 + t) * hj * d0 + (-2 * t ** 3 + 3 * t ** 2) * r1 + (t ** 3 - t ** 2) * hj * d1;
        };
        const slope = (s) => {
          const t = (s - s0) / hj;
          return ((6 * t ** 2 - 6 * t) * r0 + (6 * t - 6 * t ** 2) * r1) / hj + (3 * t ** 2 - 4 * t + 1) * d0 + (3 * t ** 2 - 2 * t) * d1;
        };
        segments[start + j] = { radius, slope };
      }
    }
    start = end;
  }
  return segments;
}
function curved(meridian, P2, segments, { error = 0.2, depth = 6 } = {}) {
  const k2 = scaleOf(P2);
  const out = [meridian[0]];
  for (let i = 0; i < meridian.length - 1; i++) {
    const curve = segments[i];
    const [s0] = meridian[i];
    const [s1] = meridian[i + 1];
    if (curve) {
      const split = (a, b, level) => {
        const mid = (a + b) / 2;
        const chord = (curve.radius(a) + curve.radius(b)) / 2;
        if (level < depth && Math.abs(curve.radius(mid) - chord) * k2 > error) {
          split(a, mid, level + 1);
          out.push([mid, curve.radius(mid), 1]);
          split(mid, b, level + 1);
        }
      };
      split(s0, s1, 0);
    }
    out.push(meridian[i + 1]);
  }
  return out;
}
function smoothRows(meridian, F, P2, { rows = 6, slope = null, radius = null, steps = 48, error = 0.35, depth: deepest = 8, fineness = 0.1 } = {}) {
  const V = viewOf(P2);
  const L3 = lightOf(P2);
  const view = { a: dot3(F.a, V), flat: Math.hypot(dot3(F.u, V), dot3(F.v, V)), phi: Math.atan2(dot3(F.v, V), dot3(F.u, V)) };
  const light = { a: dot3(F.a, L3), flat: Math.hypot(dot3(F.u, L3), dot3(F.v, L3)), phi: Math.atan2(dot3(F.v, L3), dot3(F.u, L3)) };
  const m = meridian.length;
  const faces = [];
  for (let i = 0; i < m - 1; i++) {
    const ds = meridian[i + 1][0] - meridian[i][0];
    const dr = meridian[i + 1][1] - meridian[i][1];
    const length = Math.hypot(ds, dr) || 1;
    faces.push([ds / length, -dr / length]);
  }
  const splines = slope ? null : curveRuns(meridian);
  const vertexNormal = (k3, own) => {
    if (k3 <= 0 || k3 >= m - 1 || !meridian[k3][2]) return own;
    const a = faces[k3 - 1];
    const b = faces[k3];
    const x = a[0] + b[0];
    const y = a[1] + b[1];
    const length = Math.hypot(x, y) || 1;
    return [x / length, y / length];
  };
  const normalAt = (i, u) => {
    const [s0] = meridian[i];
    const [s1] = meridian[i + 1];
    const s = s0 + (s1 - s0) * u;
    const sign = Math.sign(s1 - s0) || 1;
    const g = slope ? slope(s) : splines[i] ? splines[i].slope(s) : null;
    if (g !== null) {
      const length2 = Math.hypot(1, g);
      return [sign / length2, -sign * g / length2];
    }
    const a = vertexNormal(i, faces[i]);
    const b = vertexNormal(i + 1, faces[i]);
    const x = a[0] + (b[0] - a[0]) * u;
    const y = a[1] + (b[1] - a[1]) * u;
    const length = Math.hypot(x, y) || 1;
    return [x / length, y / length];
  };
  const pointAt = (i, u, angle) => {
    const [s0, r0] = meridian[i];
    const [s1, r1] = meridian[i + 1];
    const s = s0 + (s1 - s0) * u;
    return iso(pointOf(F, s, radius ? radius(s) : splines && splines[i] ? splines[i].radius(s) : r0 + (r1 - r0) * u, angle), P2);
  };
  const buckets = [[], [], [], [], []];
  const fine2 = TAU / Math.max(24, Math.min(192, steps * 1.5));
  const arcPoints2 = (i, u, from, to) => {
    const count = Math.max(1, Math.ceil((to - from) / fine2));
    return Array.from({ length: count + 1 }, (_, index) => pointAt(i, u, from + (to - from) * index / count));
  };
  const centreOf = (arc, reference) => {
    let mid = (arc.from + arc.to) / 2 - reference;
    mid = (mid % TAU + TAU) % TAU;
    return mid;
  };
  const levelOf = (i, u) => {
    const [nr, na] = normalAt(i, u);
    const groups = /* @__PURE__ */ new Map();
    for (const arc of labelledArcs(nr, na, view, light, faces[i][0], faces[i][1])) {
      if (!groups.has(arc.tone)) groups.set(arc.tone, []);
      groups.get(arc.tone).push(arc);
    }
    for (const list of groups.values()) list.sort((x, y) => centreOf(x, light.phi) - centreOf(y, light.phi));
    return { i, u, groups };
  };
  const same = (x, y) => {
    if (x.groups.size !== y.groups.size) return false;
    for (const [tone, list] of x.groups) if ((y.groups.get(tone) ?? []).length !== list.length) return false;
    return true;
  };
  const align = (reference, arc) => {
    const out = { ...arc };
    const centre = (reference.from + reference.to) / 2;
    while ((out.from + out.to) / 2 - centre > Math.PI) {
      out.from -= TAU;
      out.to -= TAU;
    }
    while (centre - (out.from + out.to) / 2 > Math.PI) {
      out.from += TAU;
      out.to += TAU;
    }
    return out;
  };
  const strayOf = (i, a, mid, b) => {
    let worst = 0;
    for (const [tone, list] of mid.groups) {
      list.forEach((arc, index) => {
        const lo = align(arc, a.groups.get(tone)[index]);
        const hi = align(arc, b.groups.get(tone)[index]);
        for (const key of ["from", "to"]) {
          const p = pointAt(i, mid.u, arc[key]);
          const p0 = pointAt(i, a.u, lo[key]);
          const p1 = pointAt(i, b.u, hi[key]);
          worst = Math.max(worst, Math.hypot(p[0] - (p0[0] + p1[0]) / 2, p[1] - (p0[1] + p1[1]) / 2));
        }
      });
    }
    return worst;
  };
  const sheet = (tone, levels) => {
    levels[0].groups.get(tone).forEach((arc, index) => {
      const chain = [arc];
      for (let k3 = 1; k3 < levels.length; k3++) chain.push(align(chain[k3 - 1], levels[k3].groups.get(tone)[index]));
      const last = levels.length - 1;
      const points = [...arcPoints2(levels[0].i, levels[0].u, chain[0].from, chain[0].to)];
      for (let k3 = 1; k3 < last; k3++) points.push(pointAt(levels[k3].i, levels[k3].u, chain[k3].to));
      points.push(...arcPoints2(levels[last].i, levels[last].u, chain[last].from, chain[last].to).reverse());
      for (let k3 = last - 1; k3 >= 1; k3--) points.push(pointAt(levels[k3].i, levels[k3].u, chain[k3].from));
      buckets[tone].push(pathOf(oriented2(points), true));
    });
  };
  const overlap = (x, y) => Math.min(x.to, y.to) - Math.max(x.from, y.from);
  const strip = (tone, a, b) => {
    const below = a.groups.get(tone) ?? [];
    const above = (b.groups.get(tone) ?? []).map((arc) => ({ arc, used: false }));
    const quad = (lo, hi) => {
      const points = [...arcPoints2(a.i, a.u, lo.from, lo.to), ...arcPoints2(b.i, b.u, hi.from, hi.to).reverse()];
      buckets[tone].push(pathOf(oriented2(points), true));
    };
    for (const arc of below) {
      let best = null;
      let score = -Infinity;
      for (const entry of above) {
        if (entry.used) continue;
        const aligned = align(arc, entry.arc);
        const value = overlap(arc, aligned);
        if (value > score) score = value, best = entry;
      }
      if (best && score > -0.05) {
        best.used = true;
        quad(arc, align(arc, best.arc));
      } else {
        const centre = (arc.from + arc.to) / 2;
        quad(arc, { from: centre, to: centre });
      }
    }
    for (const entry of above) {
      if (entry.used) continue;
      const centre = (entry.arc.from + entry.arc.to) / 2;
      quad({ from: centre, to: centre }, entry.arc);
    }
  };
  const k2 = scaleOf(P2);
  let run = [];
  const flush = () => {
    const tones = [...new Set(run.flatMap((level) => [...level.groups.keys()]))].sort((x, y) => x - y);
    for (const tone of tones) {
      const countOf = (level) => (level.groups.get(tone) ?? []).length;
      let start = 0;
      for (let at3 = 1; at3 <= run.length; at3++) {
        if (at3 < run.length && countOf(run[at3 - 1]) === countOf(run[at3])) continue;
        if (at3 - 1 > start && countOf(run[start])) sheet(tone, run.slice(start, at3));
        if (at3 < run.length) strip(tone, run[at3 - 1], run[at3]);
        start = at3;
      }
    }
    run = [];
  };
  for (let i = 0; i < m - 1; i++) {
    const ds = meridian[i + 1][0] - meridian[i][0];
    if (Math.abs(ds) < 1e-9) {
      flush();
      continue;
    }
    const count = Math.max(1, rows);
    const reach = Math.hypot(ds, meridian[i + 1][1] - meridian[i][1]) * k2 / count;
    const limit = Math.max(1, Math.min(deepest, Math.ceil(Math.log2(Math.max(2, reach / fineness)))));
    const coarse = Array.from({ length: count + 1 }, (_, index) => levelOf(i, index / count));
    run.push(coarse[0]);
    const refine = (a, b, depth) => {
      const mid = levelOf(i, (a.u + b.u) / 2);
      const split = depth < limit && (!same(a, b) || !same(a, mid) || depth < 6 && strayOf(i, a, mid, b) > error);
      if (!split) {
        run.push(b);
        return;
      }
      refine(a, mid, depth + 1);
      refine(mid, b, depth + 1);
    };
    for (let index = 1; index <= count; index++) refine(coarse[index - 1], coarse[index], 0);
  }
  flush();
  return buckets;
}
function sideOf(meridian) {
  const m = meridian.length;
  let first = 0;
  let last = m - 1;
  if (meridian[0][1] <= 1e-9) first = 1;
  if (meridian[m - 1][1] <= 1e-9) last = m - 2;
  const side = meridian.slice(first, last + 1);
  for (let index = 1; index < side.length; index++) if (side[index][0] - side[index - 1][0] <= 1e-9) return null;
  return side.length >= 3 ? side : null;
}
function surfaceOf(side, F, P2, rims, { samples = 96, slope = null } = {}) {
  const V = viewOf(P2);
  const aV = dot3(F.a, V);
  const facing = Math.atan2(dot3(F.v, V), dot3(F.u, V));
  const [left, right] = silhouettePoints(side, F, P2, { samples, slope });
  if (left.length <= samples || right.length <= samples) return null;
  const s0 = side[0][0];
  const s1 = side[side.length - 1][0];
  const angleOf = (point) => angleToward(F, sub3(point, add3(F.o, mul3(F.a, dot3(sub3(point, F.o), F.a)))));
  const wrap = (angle) => (angle % TAU + TAU) % TAU;
  const arc = (s, r, from, to, through) => {
    let sweep = wrap(to - from);
    if (wrap(through - from) > sweep) sweep -= TAU;
    const count = Math.max(4, Math.ceil(Math.abs(sweep) / (TAU / 96)), Math.ceil(Math.abs(sweep) * r * scaleOf(P2) / 1.5));
    return Array.from({ length: count + 1 }, (_, index) => iso(pointOf(F, s, r, from + sweep * index / count), P2));
  };
  const r0 = side[0][1];
  const r1 = side[side.length - 1][1];
  const bottom = -aV > 0 ? facing + Math.PI : facing;
  const top = aV > 0 ? facing + Math.PI : facing;
  const L3 = left.map((point) => iso(point, P2));
  const R = right.map((point) => iso(point, P2));
  const topArc = arc(s1, r1, angleOf(left[left.length - 1]), angleOf(right[right.length - 1]), top);
  const bottomArc = arc(s0, r0, angleOf(right[0]), angleOf(left[0]), bottom);
  const keepFirst = rims === "all" || rims === "first" || rims === "ends";
  const keepLast = rims === "all" || rims === "last" || rims === "ends";
  const fill = pathOf([...L3, ...topArc, ...[...R].reverse(), ...bottomArc], true);
  const outline = [pathOf(L3), pathOf(R), keepLast ? pathOf(topArc) : "", keepFirst ? pathOf(bottomArc) : ""].join("");
  const hull = hullOf([...arc(s0, r0, 0, TAU - 1e-6, Math.PI), ...arc(s1, r1, 0, TAU - 1e-6, Math.PI), ...L3, ...R]);
  let gap = 0;
  for (const p of [...L3, ...R]) {
    let best = Infinity;
    for (let index = 0; index < hull.length; index++) {
      const a = hull[index];
      const b = hull[(index + 1) % hull.length];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
      best = Math.min(best, Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t));
    }
    gap = Math.max(gap, best);
  }
  return { fill, outline, gap };
}
var softOf = (meridian) => meridian.some((point) => Boolean(point[2]));
function lathe(meridian, F, P2, { steps = stepsFor(Math.max(...meridian.map(([, r]) => r)), 32, 160, scaleOf(P2)), fill = "auto", hole = null, bevel = 0, rims = "all", smooth: asked = "auto", waist = 0.5 } = {}) {
  const smooth2 = asked === "auto" ? softOf(meridian) : asked;
  const V = viewOf(P2);
  const L3 = lightOf(P2);
  const aV = dot3(F.a, V);
  const uV = dot3(F.u, V);
  const vV = dot3(F.v, V);
  const aL = dot3(F.a, L3);
  const uL = dot3(F.u, L3);
  const vL = dot3(F.v, L3);
  const n = steps;
  const m = meridian.length;
  const rings = meridian.map(([s, r]) => Array.from({ length: n }, (_, j) => iso(pointOf(F, s, r, j / n * TAU), P2)));
  const midC = [];
  const midS = [];
  for (let j = 0; j < n; j++) {
    const t = (j + 0.5) / n * TAU;
    midC.push(Math.cos(t));
    midS.push(Math.sin(t));
  }
  const seen = [];
  const tones = [];
  for (let i = 0; i < m - 1; i++) {
    const ds = meridian[i + 1][0] - meridian[i][0];
    const dr = meridian[i + 1][1] - meridian[i][1];
    const length = Math.hypot(ds, dr);
    const row = [];
    const toneRow = [];
    for (let j = 0; j < n; j++) {
      if (length < 1e-9) {
        row.push(false);
        toneRow.push(0);
        continue;
      }
      const facing = ds * (midC[j] * uV + midS[j] * vV) - dr * aV;
      const lit = (ds * (midC[j] * uL + midS[j] * vL) - dr * aL) / length;
      row.push(facing > 1e-6 * length);
      toneRow.push(bandOf(lit));
    }
    seen.push(row);
    tones.push(toneRow);
  }
  const buckets = [[], [], [], [], []];
  const all = [];
  const smoothed = smooth2 ? smoothRows(meridian, F, P2, { steps, ...smooth2 === true ? {} : smooth2 }) : null;
  if (smoothed) smoothed.forEach((list, tone) => list.forEach((d) => (buckets[tone].push(d), all.push(d))));
  for (let i = 0; i < m - 1; i++) {
    if (smoothed && Math.abs(meridian[i + 1][0] - meridian[i][0]) > 1e-9) continue;
    const keys = seen[i].map((visible, j) => visible ? tones[i][j] : null);
    for (const { key, run } of groupsOf(keys)) {
      const a = run.map((j) => rings[i][j]);
      const b = run.map((j) => rings[i + 1][j]).reverse();
      const d = pathOf(oriented2([...a, ...b]), true);
      buckets[key].push(d);
      all.push(d);
    }
  }
  const phi = Math.atan2(vV, uV);
  const flatV = Math.hypot(uV, vV);
  const rangeOf = (i) => {
    const ds = meridian[i + 1][0] - meridian[i][0];
    const dr = meridian[i + 1][1] - meridian[i][1];
    if (Math.hypot(ds, dr) < 1e-9) return null;
    if (Math.abs(ds) < 1e-9 || flatV < 1e-9) return -dr * aV > 1e-9 ? [-1, 1] : null;
    const c = dr * aV / (ds * flatV);
    return ds > 0 ? [Math.max(-1, c), 1] : [-1, Math.min(1, c)];
  };
  const arcsOf = (ranges) => {
    if (ranges.some((range) => !range)) return [];
    const lo = Math.max(...ranges.map(([x]) => x));
    const hi = Math.min(...ranges.map(([, x]) => x));
    if (lo >= hi - 1e-9) return [];
    const near = Math.acos(Math.min(1, hi));
    const far = Math.acos(Math.max(-1, lo));
    if (hi >= 1 && lo <= -1) return [[phi, phi + TAU]];
    if (hi >= 1) return [[phi - far, phi + far]];
    if (lo <= -1) return [[phi + near, phi + TAU - near]];
    return [[phi + near, phi + far], [phi - far, phi - near]];
  };
  const along = (s, r, [from, to]) => {
    const count = Math.max(2, Math.ceil((to - from) * Math.max(r, 1e-6) * scaleOf(P2) / 1.5));
    return Array.from({ length: count + 1 }, (_, j) => iso(pointOf(F, s, r, from + (to - from) * j / count), P2));
  };
  const creases = [];
  for (let i = 1; i < m - 1; i++) {
    if (meridian[i][2] || meridian[i][1] <= 1e-9) continue;
    for (const arc of arcsOf([rangeOf(i - 1), rangeOf(i)])) creases.push(pathOf(along(meridian[i][0], meridian[i][1], arc)));
  }
  let bevelPath = "";
  if (bevel > 0 && m > 2) {
    const ends = [];
    if (meridian[0][1] <= 1e-9) ends.push([0, 1, 1]);
    if (meridian[m - 1][1] <= 1e-9) ends.push([m - 2, m - 2, m - 3]);
    for (const [cap, rim, side] of ends) {
      const [s, r] = meridian[rim];
      for (const arc of arcsOf([rangeOf(cap), rangeOf(side)])) {
        const inset = along(s, Math.max(0, r - bevel), arc);
        const edge = along(s, r, arc);
        bevelPath += pathOf([edge[0], ...inset.slice(1, -1), edge[edge.length - 1]]);
      }
    }
  }
  const { fill: fillPath, outline } = outlineOf(meridian, F, P2, { steps: n, fill, hole, rims, smooth: smooth2, waist, all });
  return {
    fill: fillPath,
    outline,
    crease: creases.join(""),
    top: buckets[4].join(""),
    shades: buckets.slice(0, 4).map((list) => list.join("")),
    bevel: bevelPath || void 0,
    seamless: Boolean(smoothed)
  };
}
function shapeOf(meridian, P2, smooth2) {
  if (smooth2 && smooth2.radius) {
    const segments = meridian.slice(0, -1).map(([s0], index) => Math.abs(meridian[index + 1][0] - s0) > 1e-9 ? { radius: smooth2.radius, slope: smooth2.slope } : null);
    return curved(meridian, P2, segments);
  }
  const curves = smooth2 && !smooth2.slope ? curveRuns(meridian) : null;
  return curves && curves.some(Boolean) ? curved(meridian, P2, curves) : meridian;
}
function outlineOf(meridian, F, P2, { steps = stepsFor(Math.max(...meridian.map(([, r]) => r)), 32, 160, scaleOf(P2)), fill = "auto", hole = null, rims = "all", smooth: asked = "auto", waist = 0.5, all = null } = {}) {
  const smooth2 = asked === "auto" ? softOf(meridian) : asked;
  const n = steps;
  let fillPath;
  let outline;
  const shape = shapeOf(meridian, P2, smooth2);
  const side = fill === "auto" || fill === "surface" ? sideOf(shape) : null;
  const surface = side && !hole ? surfaceOf(side, F, P2, rims, { slope: smooth2 && smooth2.slope ? smooth2.slope : null }) : null;
  if (surface && (fill === "surface" || surface.gap > waist)) {
    fillPath = surface.fill;
    outline = surface.outline;
  } else if (fill === "hull" || fill === "auto" || fill === "surface") {
    const most = Math.max(...shape.map(([, r]) => r));
    const around = Math.min(320, Math.max(n, Math.ceil(TAU * most * scaleOf(P2) / 1.5)));
    const tagged = [];
    shape.forEach(([s, r], index) => {
      for (let j = 0; j < around; j++) tagged.push({ p: iso(pointOf(F, s, r, j / around * TAU), P2), ring: index });
    });
    const hull = hullTagged(tagged);
    const holePath = hole ? pathOf(Array.from({ length: around }, (_, j) => iso(pointOf(F, hole[0], hole[1], j / around * TAU), P2)), true) : "";
    fillPath = pathOf(hull.map(({ p }) => p), true) + holePath;
    if (rims === "all") {
      outline = pathOf(hull.map(({ p }) => p), true) + holePath;
    } else {
      const keepFirst = rims === "first" || rims === "ends";
      const keepLast = rims === "last" || rims === "ends";
      const edges = hull.map((a, index) => {
        const b = hull[(index + 1) % hull.length];
        const same = a.ring === b.ring;
        const keep = !same || a.ring !== 0 && a.ring !== shape.length - 1 || keepFirst && a.ring === 0 || keepLast && a.ring === shape.length - 1;
        return [a.p, b.p, keep];
      });
      outline = chains(edges).map((points) => pathOf(points)).join("") + holePath;
    }
  } else {
    fillPath = all ? all.join("") : (({ shades, top }) => [...shades, top].join(""))(lathe(meridian, F, P2, { steps: n, fill: "auto", hole, rims, smooth: smooth2, waist }));
    outline = "";
  }
  return { fill: fillPath, outline };
}
var signedArea2 = (points) => points.reduce((sum, [x, y], index) => {
  const [nx, ny] = points[(index + 1) % points.length];
  return sum + x * ny - nx * y;
}, 0);
var oriented2 = (points) => signedArea2(points) < 0 ? [...points].reverse() : points;
var saddleStart = (R, a, angle) => Math.sqrt(Math.max(0, R * R - a * a * Math.cos(angle) ** 2));
function saddleOf(F, a, start, s1, P2, { steps = stepsFor(a, 24) } = {}) {
  const V = viewOf(P2);
  const L3 = lightOf(P2);
  const n = steps;
  const angle = (j) => j / n * TAU;
  const from = typeof start === "function" ? start : (t) => saddleStart(start, a, t);
  const low = Array.from({ length: n }, (_, j) => iso(pointOf(F, from(angle(j)), a, angle(j)), P2));
  const high = Array.from({ length: n }, (_, j) => iso(pointOf(F, s1, a, angle(j)), P2));
  const seen = [];
  const tones = [];
  for (let j = 0; j < n; j++) {
    const normal = radialOf(F, angle(j + 0.5));
    seen.push(dot3(normal, V) > 1e-6);
    tones.push(bandOf(dot3(normal, L3)));
  }
  const buckets = [[], [], [], [], []];
  const fills = [];
  const keys = seen.map((visible, j) => visible ? tones[j] : null);
  for (const { key, run } of groupsOf(keys)) {
    const d = pathOf(oriented2([...run.map((j) => low[j]), ...run.map((j) => high[j]).reverse()]), true);
    buckets[key].push(d);
    fills.push(d);
  }
  const capSeen = dot3(F.a, V) > 1e-6;
  if (capSeen) {
    const d = pathOf(oriented2(high), true);
    buckets[bandOf(dot3(F.a, L3))].push(d);
    fills.push(d);
  }
  const front = runsOf2(seen);
  const back = runsOf2(seen.map((visible) => !visible));
  const edges = [];
  for (const run of front) {
    edges.push(pathOf(run.map((j) => low[j])));
    edges.push(pathOf([low[run[0]], high[run[0]]]), pathOf([low[run[run.length - 1]], high[run[run.length - 1]]]));
  }
  for (const run of capSeen ? back : front) edges.push(pathOf(run.map((j) => high[j])));
  return {
    fill: fills.join(""),
    outline: edges.join(""),
    crease: capSeen ? front.map((run) => pathOf(run.map((j) => high[j]))).join("") : "",
    top: buckets[4].join(""),
    shades: buckets.slice(0, 4).map((list) => list.join("")),
    seamless: true
  };
}
function prismOf(F, polygon, s0, s1, P2) {
  const V = viewOf(P2);
  const L3 = lightOf(P2);
  const ring2 = oriented2(polygon.map(([x, y]) => [x, y]));
  const n = ring2.length;
  const at3 = (s, [x, y]) => [F.o[0] + F.a[0] * s + F.u[0] * x + F.v[0] * y, F.o[1] + F.a[1] * s + F.u[1] * x + F.v[1] * y, F.o[2] + F.a[2] * s + F.u[2] * x + F.v[2] * y];
  const low = ring2.map((point) => iso(at3(s0, point), P2));
  const high = ring2.map((point) => iso(at3(s1, point), P2));
  const buckets = [[], [], [], [], []];
  const seen = [];
  for (let j = 0; j < n; j++) {
    const [x0, y0] = ring2[j];
    const [x1, y1] = ring2[(j + 1) % n];
    const normal = unit3(add3(mul3(F.u, y1 - y0), mul3(F.v, -(x1 - x0))));
    const visible = dot3(normal, V) > 1e-6;
    seen.push(visible);
    if (visible) buckets[bandOf(dot3(normal, L3))].push(pathOf([low[j], low[(j + 1) % n], high[(j + 1) % n], high[j]], true));
  }
  const ends = [[s0, low, mul3(F.a, -1)], [s1, high, F.a]];
  const capSeen = ends.map(([, , normal]) => dot3(normal, V) > 1e-6);
  ends.forEach(([, points, normal], index) => capSeen[index] && buckets[bandOf(dot3(normal, L3))].push(pathOf(points, true)));
  const hull = hullOf([...low, ...high]);
  const creases = [];
  for (let j = 0; j < n; j++) {
    const prev = (j - 1 + n) % n;
    const a = [ring2[j][0] - ring2[prev][0], ring2[j][1] - ring2[prev][1]];
    const b = [ring2[(j + 1) % n][0] - ring2[j][0], ring2[(j + 1) % n][1] - ring2[j][1]];
    const sharp = (a[0] * b[0] + a[1] * b[1]) / (Math.hypot(a[0], a[1]) * Math.hypot(b[0], b[1]) || 1) < Math.cos(0.35);
    if (sharp && seen[j] && seen[prev]) creases.push(pathOf([low[j], high[j]]));
    ends.forEach(([, points], index) => capSeen[index] && seen[j] && creases.push(pathOf([points[j], points[(j + 1) % n]])));
  }
  return { fill: pathOf(hull, true), outline: pathOf(hull, true), crease: creases.join(""), top: buckets[4].join(""), shades: buckets.slice(0, 4).map((list) => list.join("")) };
}
function stadium(r0, r1, offset, steps = 32) {
  const circle = (cx, r) => Array.from({ length: steps }, (_, index) => [cx + r * Math.cos(index / steps * TAU), r * Math.sin(index / steps * TAU)]);
  return hullOf([...circle(0, r0), ...circle(offset, r1)]);
}
function sphereOf(centre, r, P2, { steps = 48 } = {}) {
  const V = viewOf(P2);
  const L3 = lightOf(P2);
  const F = frameAlong(centre, V);
  const flat = (p) => iso(p, P2);
  const rim = Array.from({ length: steps }, (_, index) => pointOf(F, 0, r, index / steps * TAU));
  const outline = pathOf(rim.map(flat), true);
  const capOf = (threshold) => {
    const points = rim.filter((p) => dot3(sub3(p, centre), L3) / r >= threshold).map(flat);
    const c = dot3(L3, V);
    const LF = frameAlong(add3(centre, mul3(L3, r * threshold)), L3);
    const radius = r * Math.sqrt(Math.max(0, 1 - threshold * threshold));
    for (let index = 0; index < steps; index++) {
      const p = pointOf(LF, 0, radius, index / steps * TAU);
      if (dot3(sub3(p, centre), V) >= -1e-9) points.push(flat(p));
    }
    if (c > threshold) points.push(flat(add3(centre, mul3(V, r))));
    return points.length > 2 ? pathOf(hullOf(points), true) : "";
  };
  const shades = [outline, capOf(BANDS[1]), capOf(BANDS[2]), capOf(BANDS[3])];
  return { fill: outline, outline, crease: "", top: "", shades, seamless: true };
}
var disc = (s0, s1, r, F, P2, options = {}) => lathe(
  [
    [s0, 0],
    [s0, r],
    [s1, r],
    [s1, 0]
  ],
  F,
  P2,
  { steps: stepsFor(r, 32, 160, scaleOf(P2)), ...options }
);
var ringBand = (s0, s1, rIn, rOut, F, P2, options = {}) => lathe(
  [
    [s0, rIn],
    [s0, rOut],
    [s1, rOut],
    [s1, rIn]
  ],
  F,
  P2,
  { steps: stepsFor(rOut, 32, 160, scaleOf(P2)), hole: null, ...options }
);
function solidOf(profile, F, P2, options = {}) {
  const first = profile[0];
  const last = profile[profile.length - 1];
  const meridian = [[first[0], 0], ...profile, [last[0], 0]];
  const most = Math.max(...profile.map(([, r]) => r));
  return lathe(meridian, F, P2, { steps: stepsFor(most, 32, 160, scaleOf(P2)), ...options });
}
function bandOfProfile(profile, F, P2, options = {}) {
  const most = Math.max(...profile.map(([, r]) => r));
  return lathe(profile, F, P2, { steps: stepsFor(most, 32, 160, scaleOf(P2)), ...options });
}
function silhouettePoints(profile, F, P2, { samples = 72, slope: given = null, radius = null } = {}) {
  const V = viewOf(P2);
  const aV = dot3(F.a, V);
  const uV = dot3(F.u, V);
  const vV = dot3(F.v, V);
  const facing = Math.atan2(vV, uV);
  const flat = Math.hypot(uV, vV) || 1e-9;
  const s0 = profile[0][0];
  const s1 = profile[profile.length - 1][0];
  const radiusAt = radius ?? ((s) => {
    let index = 1;
    while (index < profile.length - 1 && profile[index][0] < s) index++;
    const [sa, ra] = profile[index - 1];
    const [sb, rb] = profile[index];
    return ra + (rb - ra) * (s - sa) / (sb - sa || 1);
  });
  const side = (sign) => {
    const points = [];
    for (let step = 0; step <= samples; step++) {
      const s = s0 + (s1 - s0) * step / samples;
      const h = (s1 - s0) / samples / 2 || 0.01;
      const slope = given ? given(s) : (radiusAt(Math.min(s1, s + h)) - radiusAt(Math.max(s0, s - h))) / (Math.min(s1, s + h) - Math.max(s0, s - h) || 1);
      const c = slope * aV / flat;
      if (Math.abs(c) > 1) continue;
      points.push(pointOf(F, s, radiusAt(s), facing + sign * Math.acos(c)));
    }
    return points;
  };
  return [side(1), side(-1)];
}
var silhouetteOf = (profile, F, P2, options = {}) => silhouettePoints(profile, F, P2, options).map((points) => pathOf(points.map((point) => iso(point, P2)))).join("");
function profileCurve(profile, { slope = null, radius = null } = {}) {
  for (let index = 1; index < profile.length; index++) if (profile[index][0] - profile[index - 1][0] <= 1e-9) throw new Error(`profileCurve: s must rise along the profile (point ${index} at s = ${profile[index][0]})`);
  const segments = curveRuns(profile);
  const s0 = profile[0][0];
  const s1 = profile[profile.length - 1][0];
  const find = (s) => {
    let lo = 0;
    let hi = profile.length - 2;
    while (lo < hi) {
      const mid = lo + hi + 1 >> 1;
      if (profile[mid][0] <= s) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };
  const linear = (index, s) => {
    const [sa, ra] = profile[index];
    const [sb, rb] = profile[index + 1];
    return [ra + (rb - ra) * (s - sa) / (sb - sa), (rb - ra) / (sb - sa)];
  };
  const radiusAt = radius ?? ((s) => {
    const at3 = Math.max(s0, Math.min(s1, s));
    const index = find(at3);
    return segments[index] ? segments[index].radius(at3) : linear(index, at3)[0];
  });
  const slopeAt = slope ?? ((s) => {
    const at3 = Math.max(s0, Math.min(s1, s));
    const index = find(at3);
    return segments[index] ? segments[index].slope(at3) : linear(index, at3)[1];
  });
  return { s0, s1, radius: radiusAt, slope: slopeAt, analytic: Boolean(slope && radius) };
}
function bandsOf(profile, cuts, F, P2, { slope = null, radius = null, steps, rows = 6, rims = "none", fill = "auto", samples = 72 } = {}) {
  const curve = profileCurve(profile, { slope, radius });
  const { s0, s1 } = curve;
  const stops = [s0, ...[...new Set(cuts)].filter((s) => s > s0 + 1e-6 && s < s1 - 1e-6).sort((a, b) => a - b), s1];
  const most = Math.max(...profile.map(([, r]) => r), ...stops.map((s) => curve.radius(s)));
  const n = steps ?? stepsFor(most, 32, 160, scaleOf(P2));
  const knot = (s, soft) => soft ? [s, curve.radius(s), 1] : [s, curve.radius(s)];
  const meridianOf = (a, b) => [knot(a), ...profile.filter(([s]) => s > a + 1e-9 && s < b - 1e-9).map(([s, , soft]) => knot(s, soft)), knot(b)];
  const shading = { slope: curve.slope, radius: curve.radius, rows };
  const bands = stops.slice(0, -1).map((a, index) => {
    const b = stops[index + 1];
    const meridian = meridianOf(a, b);
    const paths = lathe(meridian, F, P2, { steps: n, rims, fill, smooth: shading });
    const seam = index < stops.length - 2 ? arcOf(F, b, curve.radius(b), P2, { slope: curve.slope(b) }) : "";
    return { s0: a, s1: b, profile: meridian, paths: { ...paths, outline: "" }, outline: paths.outline, seam };
  });
  const sidesOf = (from = s0, to = s1, { ends = false, count = samples } = {}) => {
    const span = [Math.max(s0, from), Math.min(s1, to)];
    const dense = Array.from({ length: count + 1 }, (_, index) => knot(span[0] + (span[1] - span[0]) * index / count, true));
    const points = silhouettePoints(dense, F, P2, { samples: count, slope: curve.slope, radius: curve.radius });
    const rim = (s) => arcOf(F, s, curve.radius(s), P2, { slope: curve.slope(s) });
    const rimsAt = ends === true ? span : ends === "first" ? [span[0]] : ends === "last" ? [span[1]] : [];
    return { d: points.map((list) => pathOf(list.map((point) => iso(point, P2)))).join("") + rimsAt.map(rim).join(""), points };
  };
  return { bands, sidesOf, radius: curve.radius, slope: curve.slope, steps: n, s0, s1 };
}
function arcOf(F, s, r, P2, { slope = 0, steps = 0, least = 0.02, inward = false, from = 0, to = TAU, trim = 0.3 } = {}) {
  const V = viewOf(P2);
  const aV = dot3(F.a, V);
  const uV = dot3(F.u, V);
  const vV = dot3(F.v, V);
  const flat = Math.hypot(uV, vV);
  const phi = Math.atan2(vV, uV);
  const norm = Math.hypot(1, slope);
  const full = Math.abs(to - from - TAU) < 1e-9;
  let visible;
  if (flat < 1e-9) visible = (inward ? slope * aV / norm > least : -slope * aV / norm > least) ? [[phi, phi + TAU]] : [];
  else if (inward) {
    const c = (slope * aV - least * norm) / flat;
    visible = c <= -1 ? [] : c >= 1 ? [[phi, phi + TAU]] : [[phi + Math.acos(c), phi + TAU - Math.acos(c)]];
  } else {
    const c = (least * norm + slope * aV) / flat;
    visible = c >= 1 ? [] : c <= -1 ? [[phi, phi + TAU]] : [[phi - Math.acos(c), phi + Math.acos(c)]];
  }
  const at3 = (t) => iso(pointOf(F, s, r, t), P2);
  const speed = (t) => {
    const a = at3(t - 1e-3);
    const b = at3(t + 1e-3);
    return Math.hypot(b[0] - a[0], b[1] - a[1]) / 2e-3;
  };
  const count = (span) => Math.max(2, Math.ceil((steps || stepsFor(r, 24, 112)) * span / TAU), Math.ceil(span * r * scaleOf(P2) / 1.5));
  const out = [];
  for (const [a, b] of visible) {
    if (b - a >= TAU - 1e-9 && full) {
      const n = count(TAU);
      out.push(pathOf(Array.from({ length: n }, (_, j) => at3(from + j / n * TAU)), true));
      continue;
    }
    const pieces = full ? [[a, b, true, true]] : [];
    if (!full)
      for (let turn = -2; turn <= 2; turn++) {
        const lo = Math.max(a + turn * TAU, from);
        const hi = Math.min(b + turn * TAU, to);
        if (hi - lo > 1e-6) pieces.push([lo, hi, lo > from + 1e-9, hi < to - 1e-9]);
      }
    for (const [lo, hi, limb0, limb1] of pieces) {
      const span = hi - lo;
      const cut0 = limb0 && trim > 0 ? Math.min(span * 0.25, trim / (speed(lo) || 1)) : 0;
      const cut1 = limb1 && trim > 0 ? Math.min(span * 0.25, trim / (speed(hi) || 1)) : 0;
      const t0 = lo + cut0;
      const t1 = hi - cut1;
      const n = count(t1 - t0);
      out.push(pathOf(Array.from({ length: n + 1 }, (_, j) => at3(t0 + (t1 - t0) * j / n))));
    }
  }
  return out.join("");
}
function circleOf(F, s, r, P2, steps = 0) {
  const count = steps || stepsFor(r, 24, 112);
  return pathOf(
    Array.from({ length: count }, (_, j) => iso(pointOf(F, s, r, j / count * TAU), P2)),
    true
  );
}
function spokesOf(F, s, r0, r1, count, P2, { phase = 0, sweep = 0, from = 0, to = TAU } = {}) {
  const lines = [];
  for (let index = 0; index < count; index++) {
    const t = phase + from + index / count * (to - from);
    lines.push(pathOf([iso(pointOf(F, s, r0, t), P2), iso(pointOf(F, s, r1, t + sweep), P2)]));
  }
  return lines.join("");
}
var fadeOf = (value, [lo, hi]) => {
  const t = Math.max(0, Math.min(1, (value - lo) / (hi - lo || 1e-9)));
  return t * t * (3 - 2 * t);
};
function ribsOf(F, s0, s1, r, count, P2, { phase = 0, twist = 0, least = 0.12, r1 = r, fade = null, seams = false } = {}) {
  const V = viewOf(P2);
  const lines = [];
  const slope = (r1 - r) / (s1 - s0 || 1);
  for (let index = 0; index < count; index++) {
    const t = phase + index / count * TAU;
    const radial = radialOf(F, t + twist / 2);
    const normal = unit3([radial[0] - slope * F.a[0], radial[1] - slope * F.a[1], radial[2] - slope * F.a[2]]);
    const facing = dot3(normal, V);
    const d = pathOf([iso(pointOf(F, s0, r, t), P2), iso(pointOf(F, s1, r1, t + twist), P2)]);
    if (fade) {
      const alpha = fadeOf(facing, fade);
      if (alpha > 0.02) lines.push({ d, alpha });
      continue;
    }
    if (facing < least) continue;
    lines.push(d);
  }
  const ends = seams ? [seams === "last" ? "" : arcOf(F, s0, r, P2, { slope }), seams === "first" ? "" : arcOf(F, s1, r1, P2, { slope })].filter(Boolean) : [];
  if (fade) return [...lines, ...ends.map((d) => ({ d, alpha: 1 }))];
  return [...lines, ...ends].join("");
}
function rodOut(F, from, to, r, P2, { stroke = 0, ...options } = {}) {
  const pad = 0.35 / scaleOf(P2);
  const ring2 = (s) => Array.from({ length: 48 }, (_, index) => iso(pointOf(F, s, r + pad, index / 48 * TAU), P2));
  return {
    paths: disc(from - stroke, to, r, F, P2, options),
    clip: pathOf(hullOf([...ring2(from), ...ring2(to + stroke)]), true),
    from,
    to,
    stroke,
    reach: to + stroke
  };
}
function dotsOf(F, s, r, count, P2, { phase = 0, slope = 0, least = 0.08, all = false, fade = null } = {}) {
  const V = viewOf(P2);
  const out = [];
  for (let index = 0; index < count; index++) {
    const t = phase + index / count * TAU;
    let alpha = 1;
    if (!all) {
      const radial = radialOf(F, t);
      const normal = unit3([radial[0] - slope * F.a[0], radial[1] - slope * F.a[1], radial[2] - slope * F.a[2]]);
      const facing = dot3(normal, V);
      if (fade) alpha = fadeOf(facing, fade);
      else if (facing < least) continue;
      if (alpha <= 0.02) continue;
    }
    const [x, y] = iso(pointOf(F, s, r, t), P2);
    out.push(alpha < 1 ? [x, y, alpha] : [x, y]);
  }
  return out;
}
function facingOf(F, angle, P2, slope = 0) {
  const radial = radialOf(F, angle);
  return dot3(unit3([radial[0] - slope * F.a[0], radial[1] - slope * F.a[1], radial[2] - slope * F.a[2]]), viewOf(P2));
}
function fillet(points, radius, perArc = 7, { P: P2 = null, tube = 0, margin = 1.3 } = {}) {
  if (points.length < 3) return points.map((p) => [...p]);
  const V = P2 && tube ? viewOf(P2) : null;
  const out = [[...points[0]]];
  for (let index = 1; index < points.length - 1; index++) {
    const prev = points[index - 1];
    const here = points[index];
    const next = points[index + 1];
    const into = unit3(sub3(here, prev));
    const outOf = unit3(sub3(next, here));
    const cosTurn = Math.max(-1, Math.min(1, dot3(into, outOf)));
    const turn = Math.acos(cosTurn);
    if (turn < 1e-3) {
      out.push([...here]);
      continue;
    }
    const room = Math.min(len3(sub3(here, prev)), len3(sub3(next, here))) * 0.48;
    const facing = V ? Math.abs(dot3(unit3(cross3(into, outOf)), V)) : 1;
    const bend = V ? Math.max(radius, margin * tube / (0.7 * Math.max(0.05, facing) ** 2)) : radius;
    const cut2 = Math.min(bend * Math.tan(turn / 2), room);
    const a = sub3(here, mul3(into, cut2));
    const b = add3(here, mul3(outOf, cut2));
    const count = Math.max(2, Math.ceil(perArc * turn / (Math.PI / 2)));
    for (let step = 0; step <= count; step++) {
      const t = step / count;
      const p0 = lerp3(a, here, t);
      const p1 = lerp3(here, b, t);
      out.push(lerp3(p0, p1, t));
    }
  }
  out.push([...points[points.length - 1]]);
  return out;
}
function resample(points, spacing) {
  const lengths = [0];
  for (let index = 1; index < points.length; index++) lengths.push(lengths[index - 1] + len3(sub3(points[index], points[index - 1])));
  const total = lengths[lengths.length - 1];
  const count = Math.max(1, Math.round(total / spacing));
  const out = [];
  let segment2 = 1;
  for (let step = 0; step <= count; step++) {
    const at3 = total * step / count;
    while (segment2 < points.length - 1 && lengths[segment2] < at3) segment2++;
    const a = points[segment2 - 1];
    const b = points[segment2];
    const span = lengths[segment2] - lengths[segment2 - 1] || 1;
    out.push(lerp3(a, b, Math.min(1, Math.max(0, (at3 - lengths[segment2 - 1]) / span))));
  }
  return out;
}
function pathLength(points) {
  let total = 0;
  for (let index = 1; index < points.length; index++) total += len3(sub3(points[index], points[index - 1]));
  return total;
}
function cut(points, from, to) {
  const out = [];
  let walked = 0;
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1];
    const b = points[index];
    const length = len3(sub3(b, a));
    const start = walked;
    const end = walked + length;
    if (end >= from && start <= to) {
      const t0 = Math.max(0, (from - start) / (length || 1));
      const t1 = Math.min(1, (to - start) / (length || 1));
      if (!out.length) out.push(lerp3(a, b, t0));
      out.push(lerp3(a, b, t1));
    }
    walked = end;
  }
  return out;
}
var pointAlong = (points, at3) => {
  const piece = cut(points, at3, at3 + 0.01);
  return piece[0] ?? points[points.length - 1];
};
function tangentAlong(points, at3) {
  const total = pathLength(points);
  const a = pointAlong(points, Math.max(0, at3 - 0.6));
  const b = pointAlong(points, Math.min(total, at3 + 0.6));
  return unit3(sub3(b, a));
}
function spiral(F, s, r0, r1, a0, a1, steps = 28) {
  const out = [];
  for (let index = 0; index <= steps; index++) {
    const t = index / steps;
    out.push(pointOf(F, s, r0 + (r1 - r0) * t, a0 + (a1 - a0) * t));
  }
  return out;
}
function arcPoints(F, s, r, a0, a1, steps = 24) {
  return Array.from({ length: steps + 1 }, (_, index) => pointOf(F, s, r, a0 + (a1 - a0) * index / steps));
}

// src/weather/kit/loose.ts
var k = iso_kit_exports;
var G = lathe_exports;

// src/weather/icons/sun-parts.ts
var TAU2 = Math.PI * 2;
var RAD = Math.PI / 180;
var add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
var mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
var dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
var unit = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
var smooth = (t) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};
var f1 = (v) => (Math.round(v * 10) / 10).toString();
function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
var areaOf = (pts) => {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    s += x0 * y1 - x1 * y0;
  }
  return s / 2;
};
var orient = (pts, positive) => areaOf(pts) > 0 === positive ? pts : [...pts].reverse();
var KNOTS = [
  [-0.1, 0],
  [0.1, 1],
  [0.31, 2],
  [0.52, 3],
  [0.72, 4]
];
var TONE_VAR = ["--anatomy-shade-0", "--anatomy-shade-1", "--anatomy-shade-2", "--anatomy-shade-3", "--anatomy-top"];
function blendedFill(score, lit) {
  let u = 0;
  if (score >= KNOTS[KNOTS.length - 1][0]) u = 4;
  else if (score > KNOTS[0][0]) {
    for (let i2 = 1; i2 < KNOTS.length; i2++) {
      if (score <= KNOTS[i2][0]) {
        const [s0, u0] = KNOTS[i2 - 1];
        const [s1, u1] = KNOTS[i2];
        u = u0 + (score - s0) / (s1 - s0) * (u1 - u0);
        break;
      }
    }
  }
  const i = Math.min(3, Math.floor(u));
  const f = Math.round((u - i) * 100);
  const name = (n) => lit ? n === 4 ? "--anatomy-lit-top" : "--anatomy-lit-shade" : TONE_VAR[n];
  return f <= 0 ? `var(${name(i)})` : f >= 100 ? `var(${name(i + 1)})` : `color-mix(in srgb, var(${name(i + 1)}) ${f}%, var(${name(i)}))`;
}
function sweepSolid(P2, loops, faceNormal, opts = {}) {
  const V = G.viewOf(P2);
  const L3 = G.lightOf(P2);
  const tone = opts.tone ?? "hi";
  const fp = (p) => k.iso(p, P2);
  const buckets = [[], [], [], []];
  const sideFill = [];
  const sideEdge = [];
  const blended = [];
  const faceFill = [];
  const faceLine = [];
  for (const loop of loops) {
    const n = loop.front.length;
    const F = loop.front.map(fp);
    const B = loop.back.map(fp);
    const vis = loop.normals.map((nv) => dot(nv, V) > 1e-6);
    for (let i = 0; i < n; i++) {
      if (!vis[i]) continue;
      const j = (i + 1) % n;
      const d = k.pathOf(orient([F[i], F[j], B[j], B[i]], true), true);
      if (opts.smooth) {
        const c = blendedFill(dot(unit(loop.normals[i]), L3), Boolean(opts.lit));
        blended.push(`<path d="${d}" style="fill:${c};stroke:${c};stroke-width:.5;stroke-linejoin:round"/>`);
      } else buckets[Math.min(3, G.bandOf(dot(unit(loop.normals[i]), L3)))].push(d);
      sideFill.push(d);
    }
    for (const run of G.runsOf(vis)) {
      sideEdge.push(k.pathOf(run.map((i) => B[i])));
      if (run[0] !== run[run.length - 1]) {
        sideEdge.push(k.pathOf([F[run[0]], B[run[0]]]));
        sideEdge.push(k.pathOf([F[run[run.length - 1]], B[run[run.length - 1]]]));
      }
    }
    faceFill.push(k.pathOf(orient(F, !loop.hole), true));
    faceLine.push(k.pathOf(F, true));
  }
  const parts = [];
  if (sideFill.length) {
    parts.push(`<path class="iso-fill" d="${sideFill.join("")}"/>`);
    if (blended.length) parts.push(blended.join(""));
    buckets.forEach((list, shade) => {
      if (list.length) parts.push(`<path class="iso-shade" data-shade="${shade}" d="${list.join("")}"/>`);
    });
    parts.push(`<path class="iso-line iso-edge" data-tone="${tone}" d="${sideEdge.join("")}"/>`);
  }
  const face = Math.min(3, G.bandOf(dot(unit(faceNormal), L3)));
  parts.push(`<path class="iso-fill" d="${faceFill.join("")}"/>`);
  parts.push(opts.faceTop ? `<path class="iso-top" d="${faceFill.join("")}"/>` : `<path class="iso-shade" data-shade="${face}" d="${faceFill.join("")}"/>`);
  if (opts.inner) parts.push(opts.inner);
  parts.push(`<path class="iso-line iso-edge" data-tone="${tone}" d="${faceLine.join("")}"/>`);
  return `<g class="iso-solid" data-seamless=""${opts.lit ? ' data-lit=""' : ""}>${parts.join("")}</g>`;
}
function arcSolid(P2, F, o) {
  const V = G.viewOf(P2);
  const aV = dot(F.a, V);
  const frontS = aV > 0 ? o.s1 : o.s0;
  const backS = aV > 0 ? o.s0 : o.s1;
  const faceNormal = aV > 0 ? F.a : mul(F.a, -1);
  const span = o.a1 - o.a0;
  const full = span >= TAU2 - 1e-6;
  const n = o.steps ?? Math.max(6, Math.ceil(Math.abs(span) * o.rOut * G.scaleOf(P2) / 3));
  const ang = (i) => o.a0 + span * i / n;
  const pt = (s, r, a) => G.pointOf(F, s, r, a);
  const rad = (a) => G.radialOf(F, a);
  const tan = (a) => G.tangentOf(F, a);
  const loops = [];
  if (full) {
    const idx = Array.from({ length: n }, (_, i) => i);
    loops.push({
      front: idx.map((i) => pt(frontS, o.rOut, ang(i))),
      back: idx.map((i) => pt(backS, o.rOut, ang(i))),
      normals: idx.map((i) => rad(ang(i + 0.5)))
    });
    loops.push({
      front: idx.map((i) => pt(frontS, o.rIn, ang(i))),
      back: idx.map((i) => pt(backS, o.rIn, ang(i))),
      normals: idx.map((i) => mul(rad(ang(i + 0.5)), -1)),
      hole: true
    });
  } else {
    const outer = Array.from({ length: n + 1 }, (_, i) => i);
    const inner = [...outer].reverse();
    const verts = [...outer.map((i) => ({ i, r: o.rOut })), ...inner.map((i) => ({ i, r: o.rIn }))];
    const normals = [];
    for (let e = 0; e < verts.length; e++) {
      const cur = verts[e];
      const nxt = verts[(e + 1) % verts.length];
      if (cur.r === o.rOut && nxt.r === o.rOut) normals.push(rad(ang(cur.i + 0.5)));
      else if (cur.r === o.rIn && nxt.r === o.rIn) normals.push(mul(rad(ang(nxt.i + 0.5)), -1));
      else if (cur.r === o.rOut) normals.push(tan(ang(n)));
      else normals.push(mul(tan(ang(0)), -1));
    }
    loops.push({
      front: verts.map((v) => pt(frontS, v.r, ang(v.i))),
      back: verts.map((v) => pt(backS, v.r, ang(v.i))),
      normals
    });
  }
  return sweepSolid(P2, loops, faceNormal, { tone: o.tone, lit: o.lit, smooth: true, inner: o.inner ? o.inner(frontS) : "" });
}
function plateSolid(P2, poly, y0, y1, at3, opts = {}) {
  const n = poly.length;
  const w = (p, y) => [p[0] + at3[0], y, p[1] + at3[1]];
  const front = poly.map((p) => w(p, y1));
  const back = poly.map((p) => w(p, y0));
  const normals = poly.map((p, i) => {
    const q = poly[(i + 1) % n];
    const du = q[0] - p[0];
    const dz = q[1] - p[1];
    const l = Math.hypot(du, dz) || 1;
    return [dz / l, 0, -du / l];
  });
  return sweepSolid(P2, [{ front, back, normals }], [0, 1, 0], opts);
}
function unionOutline(discs, block, centre, count = 200) {
  const inBlock = (x, z) => {
    if (x < block.x0 || x > block.x1 || z < block.z0 || z > block.z1) return false;
    const cx = Math.min(Math.max(x, block.x0 + block.r), block.x1 - block.r);
    const cz = Math.min(Math.max(z, block.z0 + block.r), block.z1 - block.r);
    return Math.hypot(x - cx, z - cz) <= block.r;
  };
  const inside = (x, z) => inBlock(x, z) || discs.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) <= r);
  const out = [];
  for (let i = 0; i < count; i++) {
    const a = i / count * TAU2;
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    let d = 0;
    while (d < 400 && inside(centre[0] + dx * (d + 0.4), centre[1] + dz * (d + 0.4))) d += 0.4;
    let lo = d;
    let hi = d + 0.4;
    for (let b = 0; b < 8; b++) {
      const mid = (lo + hi) / 2;
      if (inside(centre[0] + dx * mid, centre[1] + dz * mid)) lo = mid;
      else hi = mid;
    }
    out.push([centre[0] + dx * lo, centre[1] + dz * lo]);
  }
  return out;
}
function inPoly(poly, x, y) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function coverage(poly, cx, cy, r) {
  let hit = 0;
  let all = 0;
  const N = 9;
  for (let i = -N; i <= N; i++) {
    for (let j = -N; j <= N; j++) {
      const x = i / N * r;
      const y = j / N * r;
      if (x * x + y * y > r * r) continue;
      all++;
      if (inPoly(poly, cx + x, cy + y)) hit++;
    }
  }
  return all ? hit / all : 0;
}
var circ = (cx, cy, r, style) => `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" style="${style}"/>`;

// src/weather/icons/sun-gate.ts
var SHAPES = {
  cloud: {
    discs: [
      [-31, 10.5, 9.7],
      [-17.6, 17.6, 13.2],
      [-0.9, 24.6, 16.7],
      [16.7, 18.5, 13.2],
      [30, 11.4, 9.7]
    ],
    block: { x0: -38.7, x1: 39.6, z0: 0, z1: 13.2, r: 6.6 },
    centre: [0, 7.9],
    hangX: 8
  },
  wisp: {
    discs: [
      [-16, 9, 10],
      [2.5, 14, 14],
      [20, 9, 10]
    ],
    block: { x0: -27.5, x1: 30, z0: 0, z1: 11, r: 5.5 },
    centre: [0, 6],
    hangX: 7.5
  }
};
var GATE_Y = 31;
var CLOUD_Y0 = 36;
var CLOUD_Y1 = 41;
var POST_X = 124;
var topZ = (poly, x) => {
  let best = -1e9;
  for (let i = 0; i < poly.length; i++) {
    const [x0, z0] = poly[i];
    const [x1, z1] = poly[(i + 1) % poly.length];
    if ((x0 - x) * (x1 - x) <= 0 && x0 !== x1) {
      const t = (x - x0) / (x1 - x0);
      best = Math.max(best, z0 + (z1 - z0) * t);
    }
  }
  return best;
};
function buildGate(P2, kind, zb, zRail) {
  const S = SHAPES[kind];
  const poly = unionOutline(S.discs, S.block, S.centre, 220);
  const S33 = (paths, style = {}) => k.solidSvg(paths, style);
  const L3 = (d, style = {}) => k.lineSvg(d, style);
  const D3 = (points, style = {}) => k.dotsSvg(points, style);
  const frame = [];
  for (const sx of [-1, 1]) {
    const px = sx * POST_X;
    const F0 = G.frameAlong([px, GATE_Y, 0], [0, 0, 1]);
    frame.push(S33(k.slabOf({ x: px - 7.5, y: GATE_Y - 7.5, w: 15, d: 15, r: 2.2 }, 0, 2.6, P2, 3, 0.4), { tone: "lo", crease: "none" }));
    const bolts = [[-4.8, -4.8], [4.8, -4.8], [-4.8, 4.8], [4.8, 4.8]].map(([dx, dy]) => [px + dx, GATE_Y + dy]);
    frame.push(D3(bolts.map(([x, y]) => k.iso([x, y, 2.6], P2)), { size: 0.45 }));
    frame.push(S33(G.disc(2.6, zRail + 2, 3.1, F0, P2, { smooth: false }), { tone: "mid", crease: "none" }));
    frame.push(S33(G.disc(86, 91, 4.3, F0, P2, { bevel: 0.4 }), { tone: "hi", crease: "lo" }));
    frame.push(L3(G.arcOf(F0, 40, 3.1, P2), { tone: "faint" }), L3(G.arcOf(F0, 140, 3.1, P2), { tone: "faint" }), L3(G.arcOf(F0, 190, 3.1, P2), { tone: "faint" }));
    frame.push(S33(k.slabOf({ x: px - 6, y: GATE_Y - 5, w: 12, d: 10, r: 1.8 }, zRail - 3.6, 7.2, P2, 3, 0.4), { tone: "hi", crease: "lo" }));
    frame.push(D3([k.iso([px, GATE_Y + 5, zRail + 0.4], P2)], { size: 0.5 }));
  }
  const RF = G.frameAlong([-POST_X, GATE_Y, zRail], [1, 0, 0]);
  frame.push(S33(G.disc(6, 2 * POST_X - 6, 1.9, RF, P2, { smooth: false }), { tone: "hi", crease: "none" }));
  for (const sx of [-1, 1]) {
    const gx = sx * (POST_X - 11);
    const F1 = G.frameAlong([gx, GATE_Y, zRail], [1, 0, 0]);
    frame.push(S33(G.disc(-1.6, 1.6, 2.9, F1, P2, { bevel: 0.3 }), { tone: "mid", crease: "lo" }));
  }
  const mv = [];
  const cloudAt = zb;
  const hx = S.hangX;
  const pads = [-hx, hx].map((x) => ({ x, top: topZ(poly, x) }));
  const padMid = (CLOUD_Y0 + CLOUD_Y1) / 2;
  const trolleyBottom = zRail - 3.6;
  for (const p of pads) {
    const rodTop = trolleyBottom;
    const rodBottom = cloudAt + p.top + 1.6;
    const F = G.frameAlong([p.x, padMid, rodBottom], [0, 0, 1]);
    mv.push(S33(G.disc(0, rodTop - rodBottom, 1.2, F, P2, { smooth: false }), { tone: "mid", crease: "none" }));
  }
  mv.push(S33(k.slabOf({ x: -hx - 5, y: GATE_Y - 4, w: 2 * hx + 10, d: CLOUD_Y1 - GATE_Y + 4, r: 2 }, trolleyBottom, 7.2, P2, 3, 0.5), { tone: "hi", crease: "lo" }));
  mv.push(D3([[-hx - 1.6, GATE_Y - 0], [hx + 1.6, GATE_Y - 0]].map(([x, y]) => k.iso([x, y + 6, trolleyBottom + 7.2], P2)), { size: 0.5 }));
  const stitched = poly.map(([x, z]) => {
    const dx = x - S.centre[0];
    const dz = z - S.centre[1];
    const l = Math.hypot(dx, dz) || 1;
    const inset = kind === "cloud" ? 3.6 : 2.4;
    return [S.centre[0] + dx * (1 - inset / l), S.centre[1] + dz * (1 - inset / l)];
  });
  const front = (pts) => pts.map(([x, z]) => k.iso([x, CLOUD_Y1, z + cloudAt], P2));
  const inner = L3(k.pathOf(front(stitched), true), { tone: "lo", dashed: true }) + pads.map((p) => D3([k.iso([p.x, CLOUD_Y1, cloudAt + p.top - 2], P2)], { size: 0.55 })).join("") + D3(
    [-0.6, -0.2, 0.2, 0.6].map((f) => k.iso([f * (S.block.x1 - S.block.x0) * 0.8, CLOUD_Y1, cloudAt + 3.6], P2)),
    { size: 0.5 }
  );
  mv.push(plateSolid(P2, poly, CLOUD_Y0, CLOUD_Y1, [0, cloudAt], { tone: "hi", inner, faceTop: true }));
  for (const p of pads) {
    mv.push(S33(k.slabOf({ x: p.x - 3, y: CLOUD_Y0, w: 6, d: CLOUD_Y1 - CLOUD_Y0, r: 1 }, cloudAt + p.top - 0.2, 1.8, P2, 2, 0), { tone: "mid", crease: "lo" }));
  }
  const screenPoly = poly.map(([x, z]) => k.iso([x, CLOUD_Y1, z + cloudAt], P2));
  const xs = poly.map((p) => p[0]);
  return { frame: frame.join(""), moving: mv.join(""), screenPoly, width: Math.max(...xs) - Math.min(...xs), zRail };
}
var gateShift = (P2, dx) => k.translateAlong(P2, [dx, 0, 0]);
function makeGate(P2, kind, o) {
  const dx0 = (CLOUD_Y1 - o.plane) * Math.cos(o.az * RAD) / Math.sin(o.az * RAD);
  const dz0 = (CLOUD_Y1 - o.plane) * Math.tan(o.el * RAD) / Math.sin(o.az * RAD);
  const g = buildGate(P2, kind, o.bottom + dz0, o.zRail);
  return {
    frame: g.frame,
    place(raw) {
      const ux = raw > 30 ? 30 + 12 * Math.tanh((raw - 30) / 12) : raw;
      const dx = ux + dx0;
      const shift = k.axisVector(P2, [dx, 0, 0]);
      return {
        svg: `<g transform="${gateShift(P2, dx)}">${g.moving}</g>`,
        poly: g.screenPoly.map(([x, y]) => [x + shift[0], y + shift[1]])
      };
    }
  };
}

// src/weather/icons/sun-rig.ts
var W = 440;
var H = 440;
var SUN_LOOP = 120;
var probe = { cover: 0 };
var AZ = 58;
var EL = 30;
var ZC = 50;
var RA = 104;
var SWING = 30 * RAD;
var ZRAIL = 222;
var C = [0, 0, ZC];
var P = k.fitProjection(
  [
    [-136, -40, -17],
    [136, 40, -17],
    [-136, 40, -17],
    [136, -40, -17],
    [0, 0, ZC + RA + 58],
    [-POST_X - 9, GATE_Y, ZRAIL + 6],
    [POST_X + 9, GATE_Y, ZRAIL + 6],
    [-RA - 12, 0, ZC],
    [RA + 12, 0, ZC]
  ],
  W,
  H,
  { pad: 30, azimuth: AZ, elevation: EL }
);
var KK = G.scaleOf(P);
var VIEW = G.viewOf(P);
var VF0 = G.frameAlong([0, 0, 0], VIEW);
var R_U = VF0.u;
var R_V = VF0.v;
var S3 = (paths, style = {}) => k.solidSvg(paths, style);
var L = (d, style = {}) => k.lineSvg(d, style);
var D = (points, style = {}) => k.dotsSvg(points, style);
var at = (p) => k.iso(p, P);
var Z = [0, 0, 1];
var AF = G.frameOf(C, [0, 1, 0], [1, 0, 0], [0, 0, 1]);
function benchArt(tb) {
  const out = [];
  const PLAN = { x: -136, y: -40, w: 272, d: 80, r: 9 };
  out.push(`<path class="iso-halo" d="${k.haloOf(PLAN, -17, 12, P)}"/>`);
  const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
  for (const [x, y] of byDepth(k.corners(PLAN, 22))) {
    out.push(S3(k.cylinder(x, y, 6.5, -17, 1.6, P, 24), { tone: "lo" }));
    out.push(S3(k.cylinder(x, y, 5, -15.4, 3.4, P, 24), { tone: "mid" }));
  }
  out.push(S3(k.slabOf(PLAN, -12, 12, P, 8, 1.4), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLAN, 5), 0, P, 8), { tone: "faint" }));
  const screws = k.corners(PLAN, 10.5);
  for (const [x, y] of screws) out.push(L(k.ring(x, y, 2.2, 0, P, 16), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  const strip = { x: -70, y: 27, w: 150, d: 7, r: 1 };
  out.push(S3(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  const DF = G.frameAlong([-100, 25, 0], Z);
  out.push(S3(G.disc(0, 4.6, 8.4, DF, P, { bevel: 0.6 }), { tone: "hi", crease: "lo" }));
  out.push(L(G.arcOf(DF, 2.3, 8.4, P), { tone: "faint" }));
  const dt = k.radialTicks(-100, 25, 7, 36, 3, 4.6, [1, 2.2], P);
  out.push(L(dt.minor, { tone: "lo" }), L(dt.major, { tone: "mid" }));
  out.push(L(k.lineOnTop([-100, 25], [-100 + 4.4, 25 - 3.8], 4.8, P), { tone: "hi", free: true }), D([at([-100, 25, 4.8])], { size: 0.8 }));
  const KF = G.frameAlong([-85, 25, 0], Z);
  out.push(S3(G.disc(0, 3, 5.4, KF, P, { bevel: 0.4 }), { tone: "mid", crease: "lo" }));
  out.push(S3(G.disc(3, 7.5, 4.2, KF, P, { bevel: 0.4 }), { tone: "hi", crease: "lo" }));
  out.push(k.fadedSvg(G.ribsOf(KF, 3, 7.5, 4.2, 20, P, { fade: [0.05, 0.5] }), { tone: "lo" }));
  out.push(L(k.lineOnTop([-85, 25], [-81.6, 25], 7.6, P), { tone: "hi", free: true }));
  out.push(S3(k.slabOf(tb, 0, 6, P, 3, 0.6), { tone: "mid", crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(tb, 2), 6, P, 3), { tone: "faint" }));
  for (const dx of [7, 17, 27]) out.push(L(k.ring(tb.x + dx, tb.y + 6.5, 2.1, 6, P, 12), { tone: "lo" }));
  out.push(D([7, 17, 27].map((dx) => at([tb.x + dx, tb.y + 6.5, 6])), { size: 0.5 }));
  out.push(S3(k.slabOf({ x: -27, y: 40, w: 54, d: 1.5, r: 0.8 }, -10, 8, P, 2), { tone: "lo", crease: "none" }));
  const rule = (x0, x1, z) => L(k.segment([x0, 41.5, z], [x1, 41.5, z], P), { tone: "lo", free: true });
  out.push(rule(-17, 17, -4.2), rule(-17, 8, -6.2), rule(-17, 12, -8.2));
  out.push(D([[-23.5, -6.2], [23.5, -6.2]].map(([x, z]) => at([x, 41.5, z])), { size: 0.5 }));
  return out.join("");
}
var RING_F = G.frameOf(C, Z, [1, 0, 0], [0, 1, 0]);

// src/weather/icons/sun-moon.ts
var M = [0, 8, 118];
var MOON_R = 38;
var OUT_IN = 66;
var OUT_OUT = 74;
var IN_IN = 51;
var IN_OUT = 57.5;
var BOARD_Y = -26;
var ROCK = 13 * RAD;
var ZRAIL_N = 212;
var S32 = (paths, style = {}) => k.solidSvg(paths, style);
var L2 = (d, style = {}) => k.lineSvg(d, style);
var D2 = (points, style = {}) => k.dotsSvg(points, style);
var at2 = (p) => k.iso(p, P);
var VIEW2 = G.viewOf(P);
var polyline = (pts) => k.pathOf(pts.map(at2));
var OF = G.frameOf(M, [0, 1, 0], [1, 0, 0], [0, 0, 1]);
var onRing = (r, a, y) => [r * Math.cos(a), y, M[2] + r * Math.sin(a)];
function makeStars() {
  const rnd = mulberry(20260);
  const stars = [];
  const moon2 = at2(M);
  let guard = 0;
  while (stars.length < 74 && guard++ < 4e3) {
    const x = (rnd() * 2 - 1) * 93;
    const z = 22 + rnd() * 160;
    const head = at2([x, BOARD_Y + 5, z]);
    if (Math.hypot(head[0] - moon2[0], head[1] - moon2[1]) < (MOON_R + 10) * KK) continue;
    if (stars.some((s) => Math.hypot(s.x - x, s.z - z) < 12)) continue;
    const roll = rnd();
    stars.push({
      x,
      z,
      len: 1.8 + rnd() * 3.4,
      cls: roll > 0.86 ? 2 : roll > 0.5 ? 1 : 0,
      rate: 1 + Math.floor(rnd() * 3),
      phase: rnd() * TAU2,
      amber: roll > 0.97
    });
  }
  const bright = stars.map((s, i) => ({ s, i })).filter(({ s }) => s.cls >= 1);
  const used = /* @__PURE__ */ new Set();
  const chains2 = [];
  for (let c = 0; c < 4; c++) {
    const start = bright.find(({ i }) => !used.has(i) && c * 7 <= i);
    if (!start) break;
    const chain = [start.i];
    used.add(start.i);
    for (let step = 0; step < 4; step++) {
      const last = stars[chain[chain.length - 1]];
      let best = -1;
      let bd = 46;
      for (const { s, i } of bright) {
        if (used.has(i)) continue;
        const d = Math.hypot(s.x - last.x, s.z - last.z);
        if (d < bd) {
          bd = d;
          best = i;
        }
      }
      if (best < 0) break;
      chain.push(best);
      used.add(best);
    }
    if (chain.length >= 3) chains2.push(chain);
  }
  return { stars, chains: chains2 };
}
var STARS = makeStars();
function board() {
  const out = [];
  out.push(S32(k.slabOf({ x: -118, y: -39, w: 236, d: 16, r: 3 }, 0, 5, P, 3, 0.5), { tone: "lo", crease: "none" }));
  const screws = [-106, 106].map((x) => [x, -23]);
  out.push(D2(screws.map(([x, y]) => at2([x, y, 5])), { size: 0.5 }));
  const plan = { x: -110, y: -34, w: 220, d: 8, r: 3 };
  const face = BOARD_Y;
  const frameLines = [
    [[-98, face, 16], [98, face, 16]],
    [[98, face, 16], [98, face, 188]],
    [[98, face, 188], [-98, face, 188]],
    [[-98, face, 188], [-98, face, 16]]
  ];
  out.push(
    S32(k.slabOf(plan, 5, 193, P, 3, 0.8), {
      tone: "mid",
      inner: L2(frameLines.map(([a, b]) => k.pathOf([at2(a), at2(b)])).join(""), { tone: "faint" })
    })
  );
  const corners2 = [[-104.5, 10], [104.5, 10], [-104.5, 193], [104.5, 193]];
  for (const [x, z] of corners2) out.push(L2(k.sideRing([x, face, z], 2, "y", P, 14), { tone: "lo" }));
  out.push(D2(corners2.map(([x, z]) => at2([x, face, z])), { size: 0.5 }));
  out.push(S32(k.slabOf({ x: -113, y: -37, w: 226, d: 12, r: 2.5 }, 198, 5, P, 3, 0.6), { tone: "hi", crease: "lo" }));
  out.push(D2([-100, -50, 0, 50, 100].map((x) => at2([x, -31, 203])), { size: 0.45 }));
  for (const sx of [-1, 1]) {
    out.push(S32(k.slabOf({ x: sx * 84 - 9, y: -25, w: 18, d: 6, r: 1.2 }, 5, 14, P, 3, 0.5), { tone: "hi", crease: "lo" }));
    out.push(D2([at2([sx * 84, -19, 15])], { size: 0.5 }));
  }
  return out.join("");
}
function pins(frame, loop, intensity, vis) {
  const shafts = [];
  const baseDots = [];
  const heads = [];
  const glows = [];
  const glints = [];
  const t = frame / loop * TAU2;
  const amp = 0.55 + 0.45 * intensity;
  for (const s of STARS.stars) {
    const tw = 0.5 + 0.5 * Math.sin(t * s.rate + s.phase);
    const dim = s.cls === 0 ? 0.62 : 1;
    const len = s.len * (0.8 + 0.4 * tw * amp);
    const b = at2([s.x, BOARD_Y, s.z]);
    const h = at2([s.x, BOARD_Y + len, s.z]);
    shafts.push(k.pathOf([b, h]));
    baseDots.push(b);
    const r = (s.cls === 2 ? 1.9 : s.cls === 1 ? 1.45 : 1.1) * (0.85 + 0.35 * tw * amp);
    const fill = s.amber ? "var(--wx-sun)" : "var(--wx-moon)";
    const alpha = dim * (0.55 + 0.45 * tw) * (0.45 + 0.55 * vis);
    heads.push(circ(h[0], h[1], r, `fill:${fill};fill-opacity:${alpha.toFixed(3)}`));
    if (s.cls === 2) {
      const g = 2.6 + 4.4 * tw * amp;
      const ga = (0.15 + 0.7 * tw * amp) * (0.4 + 0.6 * vis);
      glints.push(
        `<path d="${k.pathOf([[h[0] - g, h[1]], [h[0] + g, h[1]]]) + k.pathOf([[h[0], h[1] - g], [h[0], h[1] + g]])}" style="fill:none;stroke:var(--wx-moon);stroke-width:.6;stroke-linecap:round;stroke-opacity:${ga.toFixed(2)}"/>`
      );
    }
    if (s.cls === 2) glows.push(circ(h[0], h[1], r * 3.2, `fill:${fill};fill-opacity:${(0.2 * tw * amp * (0.4 + 0.6 * vis)).toFixed(3)}`));
  }
  const strings = STARS.chains.map(
    (chain) => k.pathOf(
      chain.map((i) => {
        const s = STARS.stars[i];
        const tw = 0.5 + 0.5 * Math.sin(t * s.rate + s.phase);
        return at2([s.x, BOARD_Y + s.len * (0.8 + 0.4 * tw * amp), s.z]);
      })
    )
  ).join("");
  return D2(baseDots, { size: 0.55 }) + L2(shafts.join(""), { tone: "mid" }) + `<path d="${strings}" style="fill:none;stroke:var(--wx-moon);stroke-width:.6;stroke-opacity:.5;stroke-linecap:round;stroke-linejoin:round"/><g style="filter:blur(1.6px)">${glows.join("")}</g>` + glints.join("") + heads.join("");
}
function stand() {
  const out = [];
  const F0 = G.frameAlong([M[0], M[1], 0], [0, 0, 1]);
  out.push(S32(G.disc(0, 3.5, 21, F0, P, { bevel: 0.6 }), { tone: "lo", crease: "none" }));
  out.push(D2(G.dotsOf(F0, 3.5, 16.5, 8, P, { all: true }), { size: 0.5 }));
  out.push(S32(G.disc(3.5, 38, 8.2, F0, P, { smooth: false }), { tone: "mid", crease: "none" }));
  for (const z of [12, 26]) {
    out.push(S32(G.disc(z, z + 4, 10.5, F0, P, { bevel: 0.5 }), { tone: "hi", crease: "lo" }));
    out.push(L2(G.arcOf(F0, z + 2, 10.5, P), { tone: "faint" }));
  }
  return out.join("");
}
function outerRing() {
  const out = [];
  const ticks = (frontS) => {
    const mi = [];
    const ma = [];
    for (let deg = 0; deg < 360; deg += 3) {
      if (deg > 246 && deg < 294) continue;
      const major = deg % 15 === 0;
      (major ? ma : mi).push([onRing(OUT_IN, deg * RAD, M[1] + frontS), onRing(OUT_IN + (major ? 4.4 : 2.4), deg * RAD, M[1] + frontS)]);
    }
    const seg = (list) => list.map(([a, b]) => k.pathOf([at2(a), at2(b)])).join("");
    const dots = [];
    for (let deg = 0; deg < 360; deg += 30) if (deg < 255 || deg > 285) dots.push(at2(onRing(OUT_OUT - 3.4, deg * RAD, M[1] + frontS)));
    return L2(seg(mi), { tone: "lo" }) + L2(seg(ma), { tone: "mid" }) + D2(dots, { size: 0.45 });
  };
  out.push(arcSolid(P, OF, { a0: 0, a1: TAU2, rIn: OUT_IN, rOut: OUT_OUT, s0: -5, s1: 5, tone: "hi", inner: ticks }));
  const blk = { x: -13, y: M[1] - 8.5, w: 26, d: 17, r: 2.5 };
  out.push(S32(k.slabOf(blk, 36, 16, P, 3, 0.6), { tone: "mid", crease: "lo", inner: L2(k.sideSeam(blk, 44, P, 3), { tone: "faint" }) }));
  out.push(D2([[-8, 50], [8, 50]].map(([x, z]) => at2([x, blk.y + blk.d, z])), { size: 0.55 }));
  for (const sx of [-1, 1]) {
    const F = G.frameAlong([sx * (IN_OUT - 1), M[1], M[2]], [sx, 0, 0]);
    out.push(S32(G.disc(0, OUT_IN - IN_OUT + 2, 2.6, F, P, { smooth: false }), { tone: "mid", crease: "none" }));
    const Fb = G.frameAlong([sx * (OUT_IN - 1), M[1], M[2]], [sx, 0, 0]);
    out.push(S32(G.disc(-1.5, 2.5, 4.6, Fb, P, { bevel: 0.4 }), { tone: "hi", crease: "lo" }));
    out.push(L2(k.sideRing([sx * (OUT_IN + 1.5), M[1], M[2]], 2.2, "x", P, 12), { tone: "faint" }));
  }
  return out.join("");
}
function makeCraters() {
  const rnd = mulberry(1969);
  const list = [
    { lon: 36, lat: 40, size: 20, maria: true },
    { lon: 70, lat: 22, size: 15, maria: true },
    { lon: 54, lat: -6, size: 17, maria: true },
    { lon: 96, lat: -2, size: 12, maria: true }
  ];
  while (list.length < 20) {
    const lon = -10 + rnd() * 140;
    const lat = -45 + rnd() * 130;
    const size = 2.6 + rnd() * 4.6;
    if (list.some((c) => Math.hypot(c.lon - lon, c.lat - lat) < c.size * 0.9 + size * 0.5)) continue;
    list.push({ lon, lat, size, maria: false });
  }
  return list;
}
var CRATERS = makeCraters();
var MOON_CSS = '<style>.wx{--mn-lit:var(--wx-moon);--mn-night:var(--anatomy-shade-1)}.wx[data-wx$="light"]{--mn-lit:var(--anatomy-top);--mn-night:color-mix(in srgb, var(--wx-moon), var(--anatomy-paper) 22%)}</style>';
var MOON_FILL = "var(--mn-lit)";
var LIGHT = Math.atan2(-0.5, 0.86);
function terminator(cx, cy, R, f) {
  const t = 1 - 2 * f;
  const rx = Math.abs(R * t);
  const sweep = t > 0 ? 0 : 1;
  const lit = rx < 0.05 ? `M0 ${-R}A${R} ${R} 0 0 1 0 ${R}Z` : `M0 ${-R}A${R} ${R} 0 0 1 0 ${R}A${f1(rx)} ${R} 0 0 ${sweep} 0 ${-R}Z`;
  const circle = `M${-R} 0A${R} ${R} 0 1 0 ${R} 0A${R} ${R} 0 1 0 ${-R} 0Z`;
  const tf = `translate(${f1(cx)} ${f1(cy)}) rotate(${f1(LIGHT / RAD)})`;
  return {
    night: `<g transform="${tf}"><path fill-rule="evenodd" d="${circle}${lit}" style="fill:var(--mn-night);fill-opacity:.86;filter:blur(.7px)"/></g>`
  };
}
function moon(frame, loop, intensity, vis) {
  const t = frame / loop * TAU2;
  const beta = ROCK * Math.sin(t + 0.7);
  const lib = 13 * RAD * Math.sin(t + 2.1);
  const a = [0, Math.cos(beta), Math.sin(beta)];
  const u = [1, 0, 0];
  const v = [0, -Math.sin(beta), Math.cos(beta)];
  const c = at2(M);
  const R = MOON_R * KK;
  const dir = [Math.cos(LIGHT), Math.sin(LIGHT)];
  const IF = G.frameOf(M, a, u, v);
  const ringInner = (s) => {
    const pts = [];
    for (let d = 0; d <= 360; d += 6) pts.push(G.pointOf(IF, s, (IN_IN + IN_OUT) / 2 + 0.6, d * RAD));
    const dots = [];
    for (let d = 0; d < 360; d += 45) dots.push(at2(G.pointOf(IF, s, IN_OUT - 1.9, d * RAD)));
    return L2(polyline(pts), { tone: "faint" }) + D2(dots, { size: 0.45 });
  };
  const ring2 = arcSolid(P, IF, { a0: 0, a1: TAU2, rIn: IN_IN, rOut: IN_OUT, s0: -3, s1: 3, tone: "hi", inner: ringInner });
  const axles = [1, -1].map((sg) => {
    const F = G.frameAlong(add(M, mul(v, sg * IN_OUT)), mul(v, -sg));
    return S32(G.disc(0, IN_OUT - MOON_R + 1.5, 2.4, F, P, { smooth: false }), { tone: "mid", crease: "none" }) + S32(G.disc(-1, 3.2, 4.4, G.frameAlong(add(M, mul(v, sg * (IN_OUT - 1.2))), mul(v, -sg)), P, { bevel: 0.3 }), { tone: "hi", crease: "lo" });
  }).join("");
  const bodyG = circ(c[0], c[1], R, `fill:${MOON_FILL}`) + `<g style="filter:blur(${f1(R * 0.1)}px)">` + circ(c[0] + dir[0] * R * 0.3, c[1] + dir[1] * R * 0.3, R * 0.42, "fill:color-mix(in srgb, var(--wx-moon) 45%, #fff);fill-opacity:.3") + `</g><g style="filter:blur(${f1(R * 0.09)}px)">` + circ(c[0], c[1], R * 0.98, "fill:var(--anatomy-halo);fill-opacity:.32") + circ(c[0], c[1], R * 0.84, `fill:${MOON_FILL}`) + `</g>`;
  const marks = [];
  for (const cr of CRATERS) {
    const lon = cr.lon * RAD + lib;
    const lat = cr.lat * RAD;
    const nl = [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
    const n = add(add(mul(u, nl[0]), mul(a, nl[1])), mul(v, nl[2]));
    const facing = n[0] * VIEW2[0] + n[1] * VIEW2[1] + n[2] * VIEW2[2];
    if (facing < 0.04) continue;
    const ang = cr.size * RAD;
    const F = G.frameAlong(add(M, mul(n, MOON_R * Math.cos(ang))), n);
    const d = G.circleOf(F, 0, MOON_R * Math.sin(ang), P, cr.maria ? 40 : 16);
    const fade = smooth(facing / 0.3);
    if (cr.maria) marks.push(`<path d="${d}" style="fill:var(--anatomy-halo);fill-opacity:${(0.24 * fade).toFixed(3)};stroke:none"/>`);
    else {
      marks.push(`<path d="${d}" style="fill:var(--anatomy-halo);fill-opacity:${(0.26 * fade).toFixed(3)};stroke:var(--anatomy-halo);stroke-width:.55;stroke-opacity:${(0.35 * fade).toFixed(3)}"/>`);
    }
  }
  const f = 0.34;
  const term = terminator(c[0], c[1], R, f);
  const rim = `<path class="iso-line iso-edge" data-tone="mid" d="M${f1(c[0] - R)} ${f1(c[1])}A${f1(R)} ${f1(R)} 0 1 0 ${f1(c[0] + R)} ${f1(c[1])}A${f1(R)} ${f1(R)} 0 1 0 ${f1(c[0] - R)} ${f1(c[1])}Z"/>`;
  const over = bodyG + marks.join("") + term.night + rim;
  const lamp = 0.35 + 0.65 * vis;
  const ga = (m) => `fill:var(--wx-moon);fill-opacity:calc(var(--wx-glow-alpha) * ${(m * lamp * (0.7 + 0.6 * intensity)).toFixed(3)})`;
  const glow = `<g style="filter:blur(${f1(R * 0.34)}px)">` + circ(c[0], c[1], R * 2.5, ga(0.35)) + circ(c[0], c[1], R * 1.9, ga(0.45)) + circ(c[0], c[1], R * 1.4, ga(0.6)) + `</g>`;
  return { under: ring2 + axles, over, glow, beta };
}
var cacheA = null;
var cacheB = null;
var gates = /* @__PURE__ */ new Map();
function createMoonIcon(o) {
  const render = ({ frame, loop, intensity }) => {
    cacheA ??= benchArt({ x: 92, y: 4, w: 34, d: 13, r: 2 }) + board();
    cacheB ??= stand() + outerRing();
    let gateFrame = "";
    let gateMoving = "";
    let cover = 0;
    if (o.gate) {
      let g = gates.get(o.gate.kind);
      if (!g) {
        g = makeGate(P, o.gate.kind, { bottom: o.gate.bottom, plane: M[1], zRail: ZRAIL_N, az: AZ, el: EL });
        gates.set(o.gate.kind, g);
      }
      const placed = g.place(o.gate.at(frame / loop * TAU2, intensity));
      const c = at2(M);
      cover = coverage(placed.poly, c[0], c[1], MOON_R * KK * 0.95);
      gateFrame = g.frame;
      gateMoving = placed.svg;
    }
    probe.cover = cover;
    const vis = 1 - cover;
    const m = moon(frame, loop, intensity, vis);
    return [MOON_CSS, cacheA, pins(frame, loop, intensity, vis), m.glow, cacheB, m.under, m.over, gateFrame, gateMoving].join("");
  };
  return { id: o.id, label: o.label, object: o.object, width: W, height: H, loop: SUN_LOOP, render };
}

// src/weather/icons/partly-cloudy-night.ts
var partlyCloudyNight = createMoonIcon({
  id: "partly-cloudy-night",
  label: "Partly cloudy night",
  object: "Moon gimbal and star board with a sliding cloud-gate shade",
  gate: {
    kind: "cloud",
    bottom: 104,
    // light: the cloud drifts well clear of the moon; heavy: it hangs in front of it
    at: (theta, intensity) => intensity * (4 + 8 * Math.sin(2 * theta + 0.4)) + (1 - intensity) * (-72 + 30 * Math.sin(theta + 0.4))
  }
});

// <stdin>
var icon = partlyCloudyNight;
export {
  icon
};
