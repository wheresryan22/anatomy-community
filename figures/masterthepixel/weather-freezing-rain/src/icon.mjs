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
  return points.map(([x, y], at2) => `${at2 ? "L" : "M"}${tenth(x)} ${tenth(y)}`).join("") + (closed ? "Z" : "");
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
var rise = (at2, from, to, projection) => segment([at2[0], at2[1], from], [at2[0], at2[1], to], projection);
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
  for (let at2 = first, index = Math.round(first / step); at2 <= to + 1e-9; at2 += step, index++) {
    const big = index % every === 0;
    const length = big ? lengths[1] : lengths[0];
    const a = axis === "x" ? [at2, edge] : [edge, at2];
    const b = axis === "x" ? [at2, edge + length] : [edge + length, at2];
    (big ? major : minor).push(lineOnTop(a, b, z, projection));
  }
  return { minor: minor.join(""), major: major.join("") };
}
function sideTicks(from, to, step, every, face, top, lengths, projection, axis = "x") {
  const minor = [];
  const major = [];
  const first = Math.ceil(from / step) * step;
  for (let at2 = first, index = Math.round(first / step); at2 <= to + 1e-9; at2 += step, index++) {
    const big = index % every === 0;
    const length = big ? lengths[1] : lengths[0];
    const a = axis === "x" ? [at2, face, top] : [face, at2, top];
    const b = axis === "x" ? [at2, face, top - length] : [face, at2, top - length];
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
function axesAt(at2, z, projection) {
  const origin = iso([at2[0], at2[1], z], projection);
  const along = (point) => {
    const [px, py] = iso(point, projection);
    return [px - origin[0], py - origin[1]];
  };
  return { origin, x: along([at2[0] + 1, at2[1], z]), y: along([at2[0], at2[1] + 1, z]), z: along([at2[0], at2[1], z + 1]) };
}
var matrixOf = (u, v, origin) => `matrix(${thousandth(u[0])} ${thousandth(u[1])} ${thousandth(v[0])} ${thousandth(v[1])} ${thousandth(origin[0])} ${thousandth(origin[1])})`;
function holdStill(element, [dx, dy]) {
  const text = dx || dy ? `translate(${-dx} ${-dy})` : "";
  element.querySelectorAll("[data-hold]").forEach((node) => text ? node.setAttribute("transform", text) : node.removeAttribute("transform"));
}
function topMatrix(at2, z, projection, along = "x") {
  const { origin, x, y } = axesAt(at2, z, projection);
  return along === "x" ? matrixOf(x, y, origin) : matrixOf([-y[0], -y[1]], x, origin);
}
function sideMatrix(at2, z, projection, face) {
  const { origin, x, y, z: up } = axesAt(at2, z, projection);
  const down = [-up[0], -up[1]];
  return face === "left" ? matrixOf(x, down, origin) : matrixOf([-y[0], -y[1]], down, origin);
}
function screenRise(height, projection) {
  const { cosE, k: k2 } = cameraOf(projection);
  return height * cosE * k2;
}
function fitProjection(points, width, height, { pad = 24, headroom = 0, azimuth = AZIMUTH, elevation = ELEVATION } = {}) {
  const unit = { origin: [0, 0], scale: 1, azimuth, elevation };
  const flat = points.map((point) => iso(point, unit));
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
  const at2 = (length) => {
    let index = 1;
    while (index < points.length - 1 && lengths[index] < length)
      index++;
    const span = lengths[index] - lengths[index - 1] || 1;
    const t = Math.max(0, Math.min(1, (length - lengths[index - 1]) / span));
    return [points[index - 1][0] + (points[index][0] - points[index - 1][0]) * t, points[index - 1][1] + (points[index][1] - points[index - 1][1]) * t];
  };
  const pieceOf = (from, to) => [at2(from), ...points.filter((_, index) => lengths[index] > from + 1e-6 && lengths[index] < to - 1e-6), at2(to)];
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
  const L2 = lightOf(P2);
  const view = { a: dot3(F.a, V), flat: Math.hypot(dot3(F.u, V), dot3(F.v, V)), phi: Math.atan2(dot3(F.v, V), dot3(F.u, V)) };
  const light = { a: dot3(F.a, L2), flat: Math.hypot(dot3(F.u, L2), dot3(F.v, L2)), phi: Math.atan2(dot3(F.v, L2), dot3(F.u, L2)) };
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
      for (let at2 = 1; at2 <= run.length; at2++) {
        if (at2 < run.length && countOf(run[at2 - 1]) === countOf(run[at2])) continue;
        if (at2 - 1 > start && countOf(run[start])) sheet(tone, run.slice(start, at2));
        if (at2 < run.length) strip(tone, run[at2 - 1], run[at2]);
        start = at2;
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
  const L2 = left.map((point) => iso(point, P2));
  const R2 = right.map((point) => iso(point, P2));
  const topArc = arc(s1, r1, angleOf(left[left.length - 1]), angleOf(right[right.length - 1]), top);
  const bottomArc = arc(s0, r0, angleOf(right[0]), angleOf(left[0]), bottom);
  const keepFirst = rims === "all" || rims === "first" || rims === "ends";
  const keepLast = rims === "all" || rims === "last" || rims === "ends";
  const fill = pathOf([...L2, ...topArc, ...[...R2].reverse(), ...bottomArc], true);
  const outline = [pathOf(L2), pathOf(R2), keepLast ? pathOf(topArc) : "", keepFirst ? pathOf(bottomArc) : ""].join("");
  const hull = hullOf([...arc(s0, r0, 0, TAU - 1e-6, Math.PI), ...arc(s1, r1, 0, TAU - 1e-6, Math.PI), ...L2, ...R2]);
  let gap = 0;
  for (const p of [...L2, ...R2]) {
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
  const smooth = asked === "auto" ? softOf(meridian) : asked;
  const V = viewOf(P2);
  const L2 = lightOf(P2);
  const aV = dot3(F.a, V);
  const uV = dot3(F.u, V);
  const vV = dot3(F.v, V);
  const aL = dot3(F.a, L2);
  const uL = dot3(F.u, L2);
  const vL = dot3(F.v, L2);
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
  const smoothed = smooth ? smoothRows(meridian, F, P2, { steps, ...smooth === true ? {} : smooth }) : null;
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
  const { fill: fillPath, outline } = outlineOf(meridian, F, P2, { steps: n, fill, hole, rims, smooth, waist, all });
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
function shapeOf(meridian, P2, smooth) {
  if (smooth && smooth.radius) {
    const segments = meridian.slice(0, -1).map(([s0], index) => Math.abs(meridian[index + 1][0] - s0) > 1e-9 ? { radius: smooth.radius, slope: smooth.slope } : null);
    return curved(meridian, P2, segments);
  }
  const curves = smooth && !smooth.slope ? curveRuns(meridian) : null;
  return curves && curves.some(Boolean) ? curved(meridian, P2, curves) : meridian;
}
function outlineOf(meridian, F, P2, { steps = stepsFor(Math.max(...meridian.map(([, r]) => r)), 32, 160, scaleOf(P2)), fill = "auto", hole = null, rims = "all", smooth: asked = "auto", waist = 0.5, all = null } = {}) {
  const smooth = asked === "auto" ? softOf(meridian) : asked;
  const n = steps;
  let fillPath;
  let outline;
  const shape = shapeOf(meridian, P2, smooth);
  const side = fill === "auto" || fill === "surface" ? sideOf(shape) : null;
  const surface = side && !hole ? surfaceOf(side, F, P2, rims, { slope: smooth && smooth.slope ? smooth.slope : null }) : null;
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
    fillPath = all ? all.join("") : (({ shades, top }) => [...shades, top].join(""))(lathe(meridian, F, P2, { steps: n, fill: "auto", hole, rims, smooth, waist }));
    outline = "";
  }
  return { fill: fillPath, outline };
}
var signedArea2 = (points) => points.reduce((sum, [x, y], index) => {
  const [nx, ny] = points[(index + 1) % points.length];
  return sum + x * ny - nx * y;
}, 0);
var oriented2 = (points) => signedArea2(points) < 0 ? [...points].reverse() : points;
var saddleStart = (R2, a, angle) => Math.sqrt(Math.max(0, R2 * R2 - a * a * Math.cos(angle) ** 2));
function saddleOf(F, a, start, s1, P2, { steps = stepsFor(a, 24) } = {}) {
  const V = viewOf(P2);
  const L2 = lightOf(P2);
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
    tones.push(bandOf(dot3(normal, L2)));
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
    buckets[bandOf(dot3(F.a, L2))].push(d);
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
  const L2 = lightOf(P2);
  const ring2 = oriented2(polygon.map(([x, y]) => [x, y]));
  const n = ring2.length;
  const at2 = (s, [x, y]) => [F.o[0] + F.a[0] * s + F.u[0] * x + F.v[0] * y, F.o[1] + F.a[1] * s + F.u[1] * x + F.v[1] * y, F.o[2] + F.a[2] * s + F.u[2] * x + F.v[2] * y];
  const low = ring2.map((point) => iso(at2(s0, point), P2));
  const high = ring2.map((point) => iso(at2(s1, point), P2));
  const buckets = [[], [], [], [], []];
  const seen = [];
  for (let j = 0; j < n; j++) {
    const [x0, y0] = ring2[j];
    const [x1, y1] = ring2[(j + 1) % n];
    const normal = unit3(add3(mul3(F.u, y1 - y0), mul3(F.v, -(x1 - x0))));
    const visible = dot3(normal, V) > 1e-6;
    seen.push(visible);
    if (visible) buckets[bandOf(dot3(normal, L2))].push(pathOf([low[j], low[(j + 1) % n], high[(j + 1) % n], high[j]], true));
  }
  const ends = [[s0, low, mul3(F.a, -1)], [s1, high, F.a]];
  const capSeen = ends.map(([, , normal]) => dot3(normal, V) > 1e-6);
  ends.forEach(([, points, normal], index) => capSeen[index] && buckets[bandOf(dot3(normal, L2))].push(pathOf(points, true)));
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
  const L2 = lightOf(P2);
  const F = frameAlong(centre, V);
  const flat = (p) => iso(p, P2);
  const rim = Array.from({ length: steps }, (_, index) => pointOf(F, 0, r, index / steps * TAU));
  const outline = pathOf(rim.map(flat), true);
  const capOf = (threshold) => {
    const points = rim.filter((p) => dot3(sub3(p, centre), L2) / r >= threshold).map(flat);
    const c = dot3(L2, V);
    const LF = frameAlong(add3(centre, mul3(L2, r * threshold)), L2);
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
    const at2 = Math.max(s0, Math.min(s1, s));
    const index = find(at2);
    return segments[index] ? segments[index].radius(at2) : linear(index, at2)[0];
  });
  const slopeAt = slope ?? ((s) => {
    const at2 = Math.max(s0, Math.min(s1, s));
    const index = find(at2);
    return segments[index] ? segments[index].slope(at2) : linear(index, at2)[1];
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
  const at2 = (t) => iso(pointOf(F, s, r, t), P2);
  const speed = (t) => {
    const a = at2(t - 1e-3);
    const b = at2(t + 1e-3);
    return Math.hypot(b[0] - a[0], b[1] - a[1]) / 2e-3;
  };
  const count = (span) => Math.max(2, Math.ceil((steps || stepsFor(r, 24, 112)) * span / TAU), Math.ceil(span * r * scaleOf(P2) / 1.5));
  const out = [];
  for (const [a, b] of visible) {
    if (b - a >= TAU - 1e-9 && full) {
      const n = count(TAU);
      out.push(pathOf(Array.from({ length: n }, (_, j) => at2(from + j / n * TAU)), true));
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
      out.push(pathOf(Array.from({ length: n + 1 }, (_, j) => at2(t0 + (t1 - t0) * j / n))));
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
    const at2 = total * step / count;
    while (segment2 < points.length - 1 && lengths[segment2] < at2) segment2++;
    const a = points[segment2 - 1];
    const b = points[segment2];
    const span = lengths[segment2] - lengths[segment2 - 1] || 1;
    out.push(lerp3(a, b, Math.min(1, Math.max(0, (at2 - lengths[segment2 - 1]) / span))));
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
var pointAlong = (points, at2) => {
  const piece = cut(points, at2, at2 + 0.01);
  return piece[0] ?? points[points.length - 1];
};
function tangentAlong(points, at2) {
  const total = pathLength(points);
  const a = pointAlong(points, Math.max(0, at2 - 0.6));
  const b = pointAlong(points, Math.min(total, at2 + 0.6));
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

// src/weather/icons/rain-geom.ts
var W = 440;
var H = 440;
var AZ = 50;
var EL = 30;
var RAD = Math.PI / 180;
var Z_BASE = 8;
var Z_TANK0 = 14;
var Z_TANK1 = 88;
var Z_CAP1 = 92;
var Z_PLATE0 = 102;
var Z_PLATE1 = 108;
var Z_LIP = 136;
var PZ = 154;
var Z_MAN = 182;
var Z_DRUM0 = 226;
var Z_DRUM1 = 250;
var R_POST = 54;
var POST_ANGLES = [110, 230, 350];
var POSTS = POST_ANGLES.map((a) => [R_POST * Math.cos(a * RAD), R_POST * Math.sin(a * RAD)]);
var SS_HALF_U = 36;
var SS_HALF_Y = 13;
var SS_WALL = 1.6;
var SS_TILT = 13 * RAD;
var SS_LIP_H = 9;
var SS_DIV_H = 19;
var NOZ_X = 16;
var NOZ_Z = 176.6;
var TANK_R = 22;
var WATER_Z0 = 17;
var WATER_Z1 = 85;
var FUN_R = 62;
var FUN_R_IN = 57;
var FUN_DEPTH = 26;
var P = k.fitProjection(
  [
    ...Array.from({ length: 12 }, (_, i) => [Math.cos(i * 30 * Math.PI / 180) * 78, Math.sin(i * 30 * Math.PI / 180) * 78, -9]),
    ...Array.from({ length: 12 }, (_, i) => [Math.cos(i * 30 * Math.PI / 180) * (FUN_R + 2), Math.sin(i * 30 * Math.PI / 180) * (FUN_R + 2), Z_DRUM1 + 3])
  ],
  W,
  H,
  { pad: 22, azimuth: AZ, elevation: EL }
);
var at = (p) => k.iso(p, P);
var S = (paths, style = {}) => k.solidSvg(paths, style);
var L = (d, style = {}) => k.lineSvg(d, style);
var D = (points, style = {}) => k.dotsSvg(points, style);
var Z = [0, 0, 1];
var upFrame = (x, y, z) => G.frameAlong([x, y, z], Z);
var faceFrame = (x, y, z) => G.frameOf([x, y, z], Z, [Math.cos(AZ * RAD), Math.sin(AZ * RAD), 0], [-Math.sin(AZ * RAD), Math.cos(AZ * RAD), 0]);
var smooth01 = (x) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};
var clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
var lerp = (a, b, t) => a + (b - a) * t;
function triRing(Rc, rc, steps = 14) {
  const pts = [];
  for (const a of POST_ANGLES) {
    const cx = Rc * Math.cos(a * RAD);
    const cy = Rc * Math.sin(a * RAD);
    for (let i = 0; i <= steps; i++) {
      const t = a * RAD + (-60 + 120 * i / steps) * RAD;
      pts.push([cx + rc * Math.cos(t), cy + rc * Math.sin(t)]);
    }
  }
  return pts;
}
function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
var funnelZ = (r) => Z_DRUM1 - 1.2 - (FUN_R_IN - Math.min(r, FUN_R_IN)) / (FUN_R_IN - 9) * FUN_DEPTH;
var BOWL_LIP = 50;
var BOWL_VOID = 43.6;
var BOWL_CONE = 42.5;
var bowlR = (s) => {
  if (s <= 3) return 5.2;
  const x = Math.min(1, (s - 3) / 23);
  return 5.2 + (BOWL_CONE - 5.2) * Math.pow(x, 1.55);
};
var bowlS = (r) => 3 + 23 * Math.pow(Math.max(0, r - 5.2) / (BOWL_CONE - 5.2), 1 / 1.55);
var STOP_X = SS_HALF_U - 4;
var STOP_RING = (BOWL_LIP + BOWL_VOID) / 2;
var STOP_Y = Math.sqrt(STOP_RING * STOP_RING - STOP_X * STOP_X);

// src/weather/icons/rain-static.ts
var depthPt = (p) => k.depthOf([p[0], p[1], 0], P);
var byDepth = (items, get) => [...items].sort((a, b) => depthPt(get(a)) - depthPt(get(b)));
var polar = (r, deg) => [r * Math.cos(deg * RAD), r * Math.sin(deg * RAD)];
var CLIP_BOWL = "rg-bowl";
var CLIP_FUN = "rg-fun";
var TAP_ANGLE = -20;
var TAP_Z = 28;
var TAP_TIP = polar(TANK_R + 12.5, TAP_ANGLE);
var VIAL = [31, 29];
var post = (i) => POSTS[i];
function base() {
  const o = [];
  const ring2 = triRing(R_POST, 20);
  const ringIn = triRing(R_POST, 15.5);
  o.push(`<path class="iso-halo" d="${k.extrude(ring2, -9, 12, P).fill}"/>`);
  for (const [x, y] of byDepth(POSTS, (p) => p)) {
    o.push(S(k.cylinder(x, y, 6.8, -9, 2.2, P, 24, 0.4), { tone: "lo" }));
    o.push(S(k.cylinder(x, y, 2.3, -6.8, 6.8, P, 16), { tone: "mid", crease: "none" }));
    o.push(S(k.cylinder(x, y, 4.7, -3.6, 3, P, 6), { tone: "mid" }));
  }
  const plate = k.extrude(ring2, 0, Z_BASE, P, { convex: true, bevel: 1.2 });
  o.push(S(plate, { tone: "mid", inner: L(k.ringSeam(ring2, 4, P), { tone: "faint" }) }));
  o.push(L(k.onTop(ringIn, Z_BASE, P, true), { tone: "faint" }));
  const mid = [polar(36, 170), polar(36, 290)];
  for (const [x, y] of mid) o.push(L(k.ring(x, y, 2.6, Z_BASE, P, 16), { tone: "lo" }));
  o.push(D(mid.map(([x, y]) => at([x, y, Z_BASE])), { size: 0.55 }));
  const collarBolts = [];
  for (const [x, y] of POSTS) {
    for (const da of [-35, 35, 90, 150, 210, 270]) {
      const a = Math.atan2(y, x) + da * RAD;
      collarBolts.push([x + 9.2 * Math.cos(a), y + 9.2 * Math.sin(a)]);
    }
  }
  o.push(D(collarBolts.map(([x, y]) => at([x, y, Z_BASE])), { size: 0.42, tone: "lo" }));
  o.push(S(k.cylinder(VIAL[0], VIAL[1], 8.2, Z_BASE, 2.6, P, 28, 0.4), { tone: "hi", crease: "lo" }));
  o.push(L(k.ring(VIAL[0], VIAL[1], 6.2, Z_BASE + 2.6, P, 28), { tone: "lo" }));
  o.push(`<path d="${k.ring(VIAL[0], VIAL[1], 5.6, Z_BASE + 2.6, P, 28)}" style="fill:var(--anatomy-shade-0);stroke:none"/>`);
  o.push(L(k.ring(VIAL[0], VIAL[1], 2.2, Z_BASE + 2.6, P, 16), { tone: "mid" }));
  o.push(L(k.lineOnTop([VIAL[0] - 5.6, VIAL[1]], [VIAL[0] + 5.6, VIAL[1]], Z_BASE + 2.6, P), { tone: "faint" }));
  o.push(L(k.lineOnTop([VIAL[0], VIAL[1] - 5.6], [VIAL[0], VIAL[1] + 5.6], Z_BASE + 2.6, P), { tone: "faint" }));
  o.push(`<ellipse cx="${at([VIAL[0] + 0.8, VIAL[1] - 0.6, Z_BASE + 2.8])[0]}" cy="${at([VIAL[0] + 0.8, VIAL[1] - 0.6, Z_BASE + 2.8])[1]}" rx="1.5" ry="1.0" style="fill:var(--wx-rain);fill-opacity:.85"/>`);
  const lab = { x: -35, y: 28.5, w: 18, d: 6.4, r: 1.2 };
  o.push(S(k.slabOf(lab, Z_BASE, 0.9, P, 3), { tone: "lo", crease: "none" }));
  o.push(L(k.planOutline(k.insetPlan(lab, 1.1), Z_BASE + 0.9, P, 3), { tone: "faint" }));
  const ly = [lab.y + 1.9, lab.y + 3.2, lab.y + 4.5];
  const lx = [[lab.x + 3, lab.x + 13], [lab.x + 3, lab.x + 10], [lab.x + 3, lab.x + 12]];
  ly.forEach((y, i) => o.push(L(k.lineOnTop([lx[i][0], y], [lx[i][1], y], Z_BASE + 0.9, P), { tone: "lo", free: true })));
  o.push(D([at([lab.x + 15.4, lab.y + 3.2, Z_BASE + 0.9])], { size: 0.5 }));
  const dish = { x: TAP_TIP[0] - 8, y: TAP_TIP[1] - 6.5, w: 16, d: 13, r: 4.5 };
  o.push(`<path d="${k.planOutline(dish, Z_BASE, P, 6)}" style="fill:var(--anatomy-shade-0);stroke:none"/>`);
  o.push(L(k.planOutline(dish, Z_BASE, P, 6), { tone: "lo" }));
  const dcx = dish.x + dish.w / 2;
  const dcy = dish.y + dish.d / 2;
  for (let i = -2; i <= 2; i++) {
    const cx = dcx + i * 2.7;
    const over = Math.max(0, Math.abs(cx - dcx) - (dish.w / 2 - dish.r));
    const half = dish.d / 2 - dish.r + Math.sqrt(dish.r * dish.r - over * over);
    o.push(L(k.lineOnTop([cx, dcy - half], [cx, dcy + half], Z_BASE, P), { tone: "faint" }));
  }
  return o.join("");
}
function postLower(i) {
  const [x, y] = post(i);
  const o = [];
  const F = upFrame(x, y, 0);
  o.push(S(k.cylinder(x, y, 5.8, Z_BASE, 4.2, P, 24, 0.5), { tone: "hi", crease: "lo" }));
  o.push(S(k.cylinder(x, y, 3.3, Z_BASE + 4.2, Z_PLATE0 - Z_BASE - 7.4, P, 20), {
    tone: "mid",
    crease: "none",
    inner: [32, 52, 72].map((z) => L(G.arcOf(F, z, 3.3, P), { tone: "faint" })).join("")
  }));
  o.push(S(k.cylinder(x, y, 4.1, 36, 2.4, P, 20, 0.3), { tone: "hi", crease: "lo" }));
  o.push(S(k.cylinder(x, y, 5.3, Z_PLATE0 - 3.2, 3.2, P, 6), { tone: "hi", crease: "lo" }));
  return o.join("");
}
function postUpper(i) {
  const [x, y] = post(i);
  const o = [];
  const F = upFrame(x, y, 0);
  o.push(S(k.cylinder(x, y, 5.3, Z_PLATE1, 3.2, P, 6), { tone: "hi", crease: "lo" }));
  o.push(S(k.cylinder(x, y, 3.3, Z_PLATE1 + 3.2, Z_DRUM0 - Z_PLATE1 - 7.4, P, 20), {
    tone: "mid",
    crease: "none",
    inner: [150, 180, 205].map((z) => L(G.arcOf(F, z, 3.3, P), { tone: "faint" })).join("")
  }));
  o.push(S(k.cylinder(x, y, 4.1, 168, 2.4, P, 20, 0.3), { tone: "hi", crease: "lo" }));
  o.push(S(k.cylinder(x, y, 5.5, Z_DRUM0 - 4.2, 4.2, P, 6), { tone: "hi", crease: "lo" }));
  return o.join("");
}
function tankBack() {
  const o = [];
  o.push(S(k.cylinder(0, 0, TANK_R + 5.5, Z_BASE, 6, P, 56, 0.8), { tone: "hi", crease: "lo", inner: L(k.sideArc(0, 0, TANK_R + 5.5, Z_BASE + 3, P, 40), { tone: "faint" }) }));
  o.push(L(k.ring(0, 0, TANK_R + 1.4, Z_BASE + 6, P, 56), { tone: "lo" }));
  const bolts = Array.from({ length: 8 }, (_, i) => polar(TANK_R + 3.5, i * 45 + 22.5));
  o.push(D(bolts.map(([x, y]) => at([x, y, Z_BASE + 6])), { size: 0.5 }));
  const inner = k.cylinder(0, 0, TANK_R - 0.8, Z_TANK0, Z_TANK1 - Z_TANK0, P, 56);
  o.push(`<path d="${inner.fill}" style="fill:var(--anatomy-shade-0);stroke:none"/>`);
  o.push(S(k.cylinder(0, 0, TANK_R - 0.8, Z_TANK0, 3, P, 56), { tone: "lo", crease: "none" }));
  return o.join("");
}
var GLASS_TICKS = (() => {
  const F = faceFrame(0, 0, 0);
  const a0 = 38 * RAD;
  const minor = [];
  const major = [];
  const n = 18;
  for (let i = 0; i <= n; i++) {
    const z = 22 + i * 3.6;
    const isMajor = i % 5 === 0;
    const len = (isMajor ? 14 : 8) * RAD;
    const d = k.segment(G.pointOf(F, z, TANK_R, a0 - len), G.pointOf(F, z, TANK_R, a0), P);
    (isMajor ? major : minor).push(d);
  }
  const p0 = G.pointOf(F, 22, TANK_R, a0);
  const p1 = G.pointOf(F, 22 + n * 3.6, TANK_R, a0);
  const strip = k.segment(p0, p1, P);
  return { minor: minor.join(""), major: major.join(""), strip };
})();
function tankFront() {
  const o = [];
  const F = faceFrame(0, 0, 0);
  const outer = k.cylinder(0, 0, TANK_R, Z_TANK0, Z_TANK1 - Z_TANK0, P, 56);
  o.push(`<path d="${outer.fill}" style="fill:var(--anatomy-hi);fill-opacity:.035;stroke:none"/>`);
  o.push(L(outer.outline, { tone: "mid" }));
  o.push(L(k.ring(0, 0, TANK_R - 1.2, Z_TANK1, P, 56), { tone: "faint" }));
  o.push(L(GLASS_TICKS.strip, { tone: "mid" }));
  o.push(L(GLASS_TICKS.minor, { tone: "lo" }));
  o.push(L(GLASS_TICKS.major, { tone: "hi" }));
  const r1a = G.pointOf(F, 26, TANK_R - 0.2, -30 * RAD);
  const r1b = G.pointOf(F, Z_TANK1 - 7, TANK_R - 0.2, -30 * RAD);
  o.push(L(k.segment(r1a, r1b, P), { tone: "lo", free: true }));
  const r2a = G.pointOf(F, 40, TANK_R - 0.2, -42 * RAD);
  const r2b = G.pointOf(F, Z_TANK1 - 16, TANK_R - 0.2, -42 * RAD);
  o.push(L(k.segment(r2a, r2b, P), { tone: "faint", free: true }));
  o.push(S(k.cylinder(0, 0, TANK_R + 1, Z_TANK1 - 1.2, 1.2, P, 56), { tone: "lo", crease: "none" }));
  o.push(S(k.cylinder(0, 0, TANK_R + 2.4, Z_TANK1, Z_CAP1 - Z_TANK1, P, 56, 0.6), { tone: "hi", crease: "lo", inner: L(k.sideArc(0, 0, TANK_R + 2.4, Z_TANK1 + 2, P, 40), { tone: "faint" }) }));
  const capDots = Array.from({ length: 6 }, (_, i) => polar(TANK_R - 4.5, i * 60 + 30));
  o.push(D(capDots.map(([x, y]) => at([x, y, Z_CAP1])), { size: 0.5 }));
  o.push(L(k.ring(0, 0, TANK_R - 1.4, Z_CAP1, P, 48), { tone: "faint" }));
  o.push(S(k.cylinder(0, 0, 7.2, Z_CAP1, 3, P, 28, 0.4), { tone: "mid" }));
  o.push(S(k.cylinder(0, 0, 7.8, Z_CAP1 + 3, 3.4, P, 6), { tone: "hi", crease: "lo" }));
  o.push(S(k.cylinder(0, 0, 4, Z_CAP1 + 6.4, Z_PLATE0 - Z_CAP1 - 6.4, P, 20), { tone: "mid", crease: "none" }));
  const dir = [Math.cos(TAP_ANGLE * RAD), Math.sin(TAP_ANGLE * RAD), 0];
  const f0 = [dir[0] * (TANK_R - 0.5), dir[1] * (TANK_R - 0.5), TAP_Z];
  const Ft = G.frameAlong(f0, dir);
  o.push(S(G.disc(0, 4.4, 4.6, Ft, P, { bevel: 0.5 }), { tone: "hi", crease: "lo" }));
  o.push(S(G.disc(4.4, 11, 2.4, Ft, P, { smooth: false }), { tone: "mid", crease: "none" }));
  o.push(S(G.disc(7.2, 10, 3.6, Ft, P, { steps: 6 }), { tone: "hi", crease: "lo" }));
  o.push(S(G.disc(11, 12.5, 3.2, Ft, P), { tone: "hi", crease: "lo" }));
  const tip = [TAP_TIP[0], TAP_TIP[1], TAP_Z];
  o.push(S(k.cylinder(tip[0], tip[1], 2.3, TAP_Z - 6, 6 + 2.2, P, 14), { tone: "mid", crease: "none" }));
  o.push(S(k.cylinder(tip[0], tip[1], 1.5, TAP_Z - 7.6, 1.8, P, 12), { tone: "hi", crease: "lo" }));
  return o.join("");
}
function tapWheel(turn) {
  const dir = [Math.cos(TAP_ANGLE * RAD), Math.sin(TAP_ANGLE * RAD), 0];
  const base2 = [dir[0] * (TANK_R - 0.5 + 12.5), dir[1] * (TANK_R - 0.5 + 12.5), TAP_Z];
  const Ft = G.frameAlong(base2, dir);
  const hub = G.pointOf(Ft, 0, 0, 0);
  const ends = [turn, turn + Math.PI].map((a) => G.pointOf(Ft, 1.4, 5.6, a));
  return S(G.disc(0.2, 2.6, 1.6, Ft, P), { tone: "hi" }) + `<path class="iso-line" data-tone="hi" style="stroke-width:1.5" d="${k.segment(ends[0], ends[1], P)}"/>` + S(G.sphereOf(G.pointOf(Ft, 1.8, 0, 0), 1.3, P, { steps: 20 }), { tone: "hi", lit: true }) + D([at(hub)], { size: 0 });
}
function arm(a, ra, b, rb) {
  const pts = [];
  for (let i = 0; i < 28; i++) {
    const t = i / 28 * Math.PI * 2;
    pts.push([a[0] + ra * Math.cos(t), a[1] + ra * Math.sin(t)]);
    pts.push([b[0] + rb * Math.cos(t), b[1] + rb * Math.sin(t)]);
  }
  return G.hullOf(pts);
}
function deck() {
  const o = [];
  const h = Z_PLATE1 - Z_PLATE0;
  for (const i of byDepth([0, 1, 2], (j) => post(j))) {
    const ring2 = arm([0, 0], 11, post(i), 8.6);
    o.push(S(k.extrude(ring2, Z_PLATE0, h, P, { convex: true, bevel: 0.7 }), { tone: "mid", inner: L(k.ringSeam(ring2, Z_PLATE0 + 3, P), { tone: "faint" }) }));
    const groove = arm([0, 0], 8, post(i), 5.4);
    o.push(L(k.onTop(groove, Z_PLATE1, P, true), { tone: "faint" }));
    const a = Math.atan2(post(i)[1], post(i)[0]);
    const ribs = [0.42, 0.62, 0.8].map((t) => [post(i)[0] * t, post(i)[1] * t]);
    o.push(D(ribs.map(([x, y]) => at([x + 0 * a, y, Z_PLATE1])), { size: 0.45 }));
  }
  o.push(S(k.cylinder(0, 0, 12, Z_PLATE0, h, P, 40, 0.7), { tone: "hi", crease: "lo", inner: L(k.sideArc(0, 0, 12, Z_PLATE0 + 3, P, 28), { tone: "faint" }) }));
  o.push(L(k.ring(0, 0, 9.2, Z_PLATE1, P, 32), { tone: "lo" }));
  const hubBolts = Array.from({ length: 6 }, (_, i) => polar(10.6, i * 60));
  o.push(D(hubBolts.map(([x, y]) => at([x, y, Z_PLATE1])), { size: 0.45 }));
  for (const [x, y] of POSTS) o.push(L(k.ring(x, y, 5.4, Z_PLATE1, P, 20), { tone: "lo" }));
  return o.join("");
}
function bowl() {
  const o = [];
  const F = upFrame(0, 0, Z_PLATE1);
  const prof = [[0, 5.2], [3, 5.2]];
  const nSamp = 16;
  for (let i = 0; i <= nSamp; i++) {
    const s = 3 + 23 * i / nSamp;
    prof.push([s, bowlR(s), 1]);
  }
  prof.push([26, BOWL_LIP], [28.2, BOWL_LIP]);
  o.push(S(G.solidOf(prof, F, P, {}), { tone: "mid", crease: "lo", inner: L(G.arcOf(F, 26.8, BOWL_LIP, P), { tone: "faint" }) }));
  o.push(L(G.arcOf(F, 22.4, bowlR(22.4), P), { tone: "faint" }));
  o.push(D(G.dotsOf(F, 28.2, (BOWL_LIP + BOWL_VOID) / 2 + 2.6, 30, P, { all: true }), { size: 0.45 }));
  o.push(D(G.dotsOf(F, 28.2, (BOWL_LIP + BOWL_VOID) / 2 - 2.6, 30, P, { all: true, phase: 0.05 }), { size: 0.38, tone: "lo" }));
  o.push(S(G.disc(1.4, 4.4, 7.4, upFrame(0, 0, Z_PLATE1), P, { steps: 6 }), { tone: "hi", crease: "lo" }));
  const rimD = G.circleOf(F, 28.2, BOWL_VOID, P, 72);
  o.push(`<clipPath id="${CLIP_BOWL}"><path d="${rimD}"/></clipPath>`);
  o.push(`<path d="${rimD}" style="fill:var(--anatomy-shade-1);stroke:none"/>`);
  o.push(`<g clip-path="url(#${CLIP_BOWL})">`);
  for (let i = 0; i < 12; i++) {
    const r = BOWL_VOID - 0.6 - i * 3.4;
    o.push(`<path d="${k.ring(0, 0, r, Z_PLATE1 + bowlS(Math.min(r, BOWL_CONE)) - 1, P, 56)}" style="fill:var(--anatomy-shade-0);fill-opacity:.14;stroke:none"/>`);
  }
  o.push(L(k.ring(0, 0, 6.2, Z_PLATE1 + 3, P, 20), { tone: "lo" }));
  o.push(`</g>`);
  o.push(L(rimD, { tone: "lo" }));
  return o.join("");
}
var STOP_ZC = PZ - 9.8;
var BRK_D = BOWL_LIP - BOWL_VOID;
var brk = (sy) => ({ x: -4.5, y: sy > 0 ? BOWL_VOID : -BOWL_LIP, w: 9, d: BRK_D, r: 1.4 });
function stopPosts(far) {
  const o = [];
  for (const sx of [-1, 1]) {
    const sy = far ? -1 : 1;
    const x = sx * STOP_X;
    const y = sy * STOP_Y;
    o.push(S(k.cylinder(x, y, 2.3, Z_LIP, STOP_ZC - 1.8 - Z_LIP, P, 12), { tone: "mid", crease: "none" }));
    o.push(S(k.cylinder(x, y, 2.9, Z_LIP, 1.2, P, 12), { tone: "hi", crease: "lo" }));
  }
  return o.join("");
}
function stopRod(sx, from, to) {
  const F = G.frameAlong([sx * STOP_X, from, STOP_ZC], [0, 1, 0]);
  return S(G.disc(0, to - from, 1.7, F, P, { smooth: false }), { tone: "hi", crease: "lo" });
}
function bracket(sy) {
  const o = [];
  const b = brk(sy);
  const zTop = PZ + 7;
  o.push(S(k.slabOf(b, Z_LIP, zTop - Z_LIP, P, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(b, Z_LIP + 9, P, 3), { tone: "faint" }) }));
  const yIn = sy > 0 ? b.y : b.y + b.d;
  const yOut = sy > 0 ? b.y + b.d : b.y;
  const dirOut = sy > 0 ? 1 : -1;
  const Fa = G.frameAlong([0, yIn, PZ], [0, dirOut, 0]);
  o.push(S(G.disc(-1.2, 0, 5.2, Fa, P), { tone: "hi", crease: "lo" }));
  const Fo = G.frameAlong([0, yOut, PZ], [0, dirOut, 0]);
  o.push(S(G.disc(0, 4.4, 2, Fo, P, { smooth: false }), { tone: "hi", crease: "lo" }));
  o.push(S(G.disc(0.6, 2.4, 3.9, Fo, P, { steps: 6 }), { tone: "hi", crease: "lo" }));
  o.push(D([[-2.4, Z_LIP + 4], [2.4, Z_LIP + 4]].map(([x, z]) => at([x, sy > 0 ? b.y + b.d : b.y, z])), { size: 0.45 }));
  return o.join("");
}
function sleeve(sy) {
  const y0 = sy > 0 ? SS_HALF_Y + SS_WALL + 1.8 : -BOWL_VOID;
  const y1 = sy > 0 ? BOWL_VOID : -(SS_HALF_Y + SS_WALL + 1.8);
  const F = G.frameAlong([0, y0, PZ], [0, 1, 0]);
  return S(G.disc(0, y1 - y0, 3.1, F, P, { smooth: false }), { tone: "hi", crease: "lo", inner: L(G.arcOf(F, (y1 - y0) / 2, 3.1, P), { tone: "faint" }) });
}
function manifold() {
  const o = [];
  const Fm = upFrame(0, 0, Z_MAN + 2.6);
  const prof = [[0, 3.4], [3.4, 3.4]];
  const top = Z_DRUM0 - (Z_MAN + 2.6);
  for (let i = 0; i <= 14; i++) {
    const s = 3.4 + (top - 3.4) * i / 14;
    const x = (s - 3.4) / (top - 3.4);
    prof.push([s, 3.4 + 31.6 * Math.pow(x, 2.2), 1]);
  }
  o.push(S(G.solidOf(prof, Fm, P, {}), { tone: "mid", crease: "lo", inner: L(G.arcOf(Fm, 10, 3.4, P), { tone: "faint" }) }));
  o.push(S(G.disc(1.2, 3.4, 4.6, Fm, P, { steps: 6 }), { tone: "hi", crease: "lo" }));
  const Fx = G.frameAlong([-(NOZ_X + 3.5), 0, Z_MAN], [1, 0, 0]);
  o.push(S(G.disc(0, 2 * (NOZ_X + 3.5), 2.6, Fx, P, { smooth: false }), { tone: "hi", crease: "lo" }));
  for (const sx of [-1, 1]) {
    const Fe = G.frameAlong([sx * (NOZ_X + 3.5), 0, Z_MAN], [sx, 0, 0]);
    o.push(S(G.disc(-0.2, 2, 3.5, Fe, P), { tone: "hi", crease: "lo" }));
    o.push(S(k.cylinder(sx * NOZ_X, 0, 2.2, NOZ_Z + 3, Z_MAN - 2.6 - NOZ_Z - 3 + 0.6, P, 14, 0.2), { tone: "mid", crease: "none" }));
    o.push(S(k.cylinder(sx * NOZ_X, 0, 1.4, NOZ_Z, 3, P, 12), { tone: "hi", crease: "lo" }));
  }
  o.push(L(G.arcOf(Fx, NOZ_X + 3.5, 2.6, P), { tone: "faint" }));
  return o.join("");
}
function drum() {
  const o = [];
  const F = upFrame(0, 0, Z_DRUM0);
  const bodyH = Z_DRUM1 - Z_DRUM0 - 2.4;
  const body = G.disc(0, bodyH, FUN_R, F, P, { bevel: 0.9 });
  const seams = [4.5, 10.5].map((s) => L(G.arcOf(F, s, FUN_R, P), { tone: "faint" })).join("");
  o.push(S(body, { tone: "hi", crease: "lo", inner: seams }));
  o.push(k.fadedSvg(G.ribsOf(F, 5, 10, FUN_R, 150, P, { fade: [0.05, 0.4] }), { tone: "lo" }));
  o.push(D(G.dotsOf(F, 14.6, FUN_R, 26, P, { fade: [0.05, 0.45] }), { size: 0.5 }));
  o.push(D(G.dotsOf(F, 2.3, FUN_R, 26, P, { fade: [0.05, 0.45] }), { size: 0.42, tone: "lo" }));
  o.push(S(G.ringBand(bodyH - 0.2, Z_DRUM1 - Z_DRUM0, FUN_R_IN, FUN_R + 0.8, F, P, { bevel: 0.5 }), { tone: "hi", crease: "lo" }));
  const Fr = upFrame(0, 0, Z_DRUM1);
  const rimD = G.circleOf(Fr, 0, FUN_R_IN, P, 96);
  const clipRect = `M0 0H${W}V${at([0, 0, Z_DRUM1])[1]}H0Z`;
  o.push(`<clipPath id="${CLIP_FUN}"><path d="${rimD}"/></clipPath>`);
  o.push(`<clipPath id="${CLIP_FUN}-catch"><path d="${rimD}"/><path d="${clipRect}"/></clipPath>`);
  o.push(`<path d="${rimD}" style="fill:var(--anatomy-shade-1);stroke:none"/>`);
  o.push(`<g clip-path="url(#${CLIP_FUN})">`);
  const steps = 14;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const r = FUN_R_IN * (1 - t * 0.84);
    o.push(`<path d="${k.ring(0, 0, r, funnelZ(r), P, 72)}" style="fill:var(--anatomy-shade-0);fill-opacity:.11;stroke:none"/>`);
  }
  for (const r of [47, 35, 23]) o.push(L(k.ring(0, 0, r, funnelZ(r), P, 72), { tone: "faint" }));
  o.push(L(k.ring(0, 0, 9.2, funnelZ(9.2), P, 28), { tone: "lo" }));
  const mesh = [];
  for (let gx = -6; gx <= 6; gx += 2.4) for (let gy = -6; gy <= 6; gy += 2.4) if (gx * gx + gy * gy <= 7.4 * 7.4) mesh.push([gx, gy]);
  o.push(D(mesh.map(([x, y]) => at([x, y, funnelZ(9.2) - 0.4])), { size: 0.4, tone: "lo" }));
  o.push(`</g>`);
  o.push(L(rimD, { tone: "lo" }));
  o.push(L(G.circleOf(Fr, 0, FUN_R + 0.8, P, 96), { tone: "mid" }));
  return o.join("");
}
var LOG = { x: 58.4, y: -21, w: 15, d: 23, r: 2 };
var LOG_Z0 = 58;
var LOG_H = 28;
var LOG_FACE_X = LOG.x + LOG.w;
var LOG_WIN = { y0: -14.5, y1: -1.5, z0: 66, z1: 77 };
var LOG_LED = [LOG_FACE_X, -18, 80.4];
var quadOnX = (x, y0, y1, z0, z1) => `M${[at([x, y0, z0]), at([x, y1, z0]), at([x, y1, z1]), at([x, y0, z1])].map((p) => `${p[0]} ${p[1]}`).join("L")}Z`;
var quadOnY = (y, x0, x1, z0, z1) => `M${[at([x0, y, z0]), at([x1, y, z0]), at([x1, y, z1]), at([x0, y, z1])].map((p) => `${p[0]} ${p[1]}`).join("L")}Z`;
function logger() {
  const o = [];
  const [px, py] = post(2);
  for (const z of [61, 82]) {
    o.push(S(k.cylinder(px, py, 4.3, z, 2.6, P, 20, 0.3), { tone: "hi", crease: "lo" }));
    o.push(S(k.slabOf({ x: px + 3.2, y: py - 2.2, w: LOG.x - px - 3.2 + 0.2, d: 4.4, r: 0.4 }, z, 2.6, P, 2), { tone: "mid", crease: "none" }));
  }
  const body = k.slabOf(LOG, LOG_Z0, LOG_H, P, 4, 0.7);
  o.push(S(body, { tone: "hi", crease: "lo", inner: L(k.sideSeam(LOG, LOG_Z0 + 5, P, 4), { tone: "faint" }) }));
  const lid = { x: LOG.x - 0.8, y: LOG.y - 0.8, w: LOG.w + 1.6, d: LOG.d + 1.6, r: 2.4 };
  o.push(S(k.slabOf(lid, LOG_Z0 + LOG_H, 3, P, 4, 0.5), { tone: "mid", crease: "lo" }));
  const lz = LOG_Z0 + LOG_H + 3;
  o.push(D(k.corners(LOG, 2.2).map(([x, y]) => at([x, y, lz])), { size: 0.5 }));
  o.push(S(k.cylinder(LOG.x + LOG.w / 2, LOG.y + LOG.d / 2, 2.4, lz, 2.4, P, 12), { tone: "hi", crease: "lo" }));
  o.push(S(k.cylinder(LOG.x + LOG.w / 2, LOG.y + LOG.d / 2, 1.5, lz + 2.4, 1.6, P, 10), { tone: "mid", crease: "none" }));
  const fx = LOG_FACE_X;
  const w = LOG_WIN;
  o.push(`<path d="${quadOnX(fx, w.y0 - 1, w.y1 + 1, w.z0 - 1, w.z1 + 1)}" style="fill:var(--anatomy-lo);fill-opacity:.35;stroke:none"/>`);
  o.push(`<path d="${quadOnX(fx, w.y0, w.y1, w.z0, w.z1)}" style="fill:var(--anatomy-shade-0);stroke:none"/>`);
  o.push(L(quadOnX(fx, w.y0 - 1, w.y1 + 1, w.z0 - 1, w.z1 + 1), { tone: "lo" }));
  o.push(L(quadOnX(fx, w.y0, w.y1, w.z0, w.z1), { tone: "faint" }));
  o.push(L(k.segment([fx, -19.5, 62.5], [fx, -3, 62.5], P), { tone: "lo", free: true }));
  o.push(L(k.segment([fx, -19.5, 60.6], [fx, -9, 60.6], P), { tone: "faint", free: true }));
  o.push(D([[-19.4, 59.5], [-2.4, 59.5]].map(([y, z]) => at([fx, y, z])), { size: 0.45 }));
  o.push(`<path d="${quadOnX(fx, -19.6, -16.4, 79, 81.8)}" style="fill:var(--anatomy-shade-0);stroke:none"/>`);
  o.push(L(quadOnX(fx, -19.6, -16.4, 79, 81.8), { tone: "lo" }));
  const fy = LOG.y + LOG.d;
  for (let i = 0; i < 4; i++) {
    const x0 = LOG.x + 3.4 + i * 2.8;
    o.push(`<path d="${quadOnY(fy, x0, x0 + 1.2, 64, 76)}" style="fill:var(--anatomy-shade-0);stroke:none"/>`);
    o.push(L(quadOnY(fy, x0, x0 + 1.2, 64, 76), { tone: "lo" }));
  }
  return o.join("");
}
var segPts = (y0, z0, w, h) => [
  [y0, z0 + h, y0 + w, z0 + h],
  // a top
  [y0 + w, z0 + h, y0 + w, z0 + h / 2],
  // b
  [y0 + w, z0 + h / 2, y0 + w, z0],
  // c
  [y0, z0, y0 + w, z0],
  // d bottom
  [y0, z0, y0, z0 + h / 2],
  // e
  [y0, z0 + h / 2, y0, z0 + h],
  // f
  [y0, z0 + h / 2, y0 + w, z0 + h / 2]
  // g
];
var DIGITS = ["abcdef", "bc", "abged", "abgcd", "fgbc", "afgcd", "afgedc", "abc", "abcdefg", "abcdfg"];
function loggerLive(count, ledOn) {
  const w = LOG_WIN;
  const o = [];
  const cw = 4.1;
  const ch = 7;
  const z0 = (w.z0 + w.z1) / 2 - ch / 2;
  const digits = [Math.floor(count / 10) % 10, count % 10];
  const mirror = 2 * w.y0 + 3.2 + 2 * cw + 2.6;
  digits.forEach((dg, i) => {
    const y0 = w.y0 + 1.6 + i * (cw + 2.6);
    const segs = segPts(y0, z0, cw, ch);
    const on = i === 0 && count < 10 ? "" : DIGITS[dg];
    let lit = "";
    let off = "";
    "abcdefg".split("").forEach((c, si) => {
      const [ya, za, yb, zb] = segs[si];
      const d = k.segment([LOG_FACE_X, mirror - ya, za], [LOG_FACE_X, mirror - yb, zb], P);
      if (on.includes(c)) lit += d;
      else off += d;
    });
    o.push(L(off, { tone: "faint" }));
    o.push(`<path class="iso-line" data-tone="hi" style="stroke-width:1.2" d="${lit}"/>`);
  });
  const led = at(LOG_LED);
  o.push(`<circle cx="${led[0]}" cy="${led[1]}" r="${ledOn ? 1.35 : 0.9}" style="fill:${ledOn ? "var(--anatomy-lit)" : "var(--anatomy-lo)"};stroke:var(--anatomy-lo);stroke-width:.4"/>`);
  return o.join("");
}
function thumbScrews() {
  const o = [];
  for (const a of [AZ + 90, AZ - 90]) {
    const dir = [Math.cos(a * RAD), Math.sin(a * RAD), 0];
    const z = Z_DRUM0 + 9;
    const F = G.frameAlong([dir[0] * (FUN_R - 0.4), dir[1] * (FUN_R - 0.4), z], dir);
    o.push(S(G.disc(0, 3, 4.6, F, P), { tone: "mid", crease: "lo" }));
    o.push(S(G.disc(3, 7, 2.2, F, P, { smooth: false }), { tone: "mid", crease: "none" }));
    o.push(S(G.disc(7, 10.4, 4.8, F, P, { bevel: 0.4 }), { tone: "hi", crease: "lo" }));
    o.push(k.fadedSvg(G.ribsOf(F, 7.4, 10, 4.8, 18, P, { fade: [0.05, 0.4] }), { tone: "lo" }));
  }
  return o.join("");
}
var cache = null;
function gaugeStatics() {
  if (cache) return cache;
  const farPost = 1;
  const nearPosts = byDepth([0, 2], (i) => post(i));
  const pre = base() + postLower(farPost) + tankBack();
  const mid = [
    tankFront(),
    ...nearPosts.map((i) => postLower(i)),
    logger(),
    deck(),
    postUpper(farPost),
    bowl(),
    stopPosts(true),
    stopRod(-1, -STOP_Y, SS_HALF_Y + SS_WALL),
    stopRod(1, -STOP_Y, SS_HALF_Y + SS_WALL),
    bracket(-1),
    sleeve(-1)
  ].join("");
  const post_ = [
    stopPosts(false),
    stopRod(-1, SS_HALF_Y + SS_WALL, STOP_Y),
    stopRod(1, SS_HALF_Y + SS_WALL, STOP_Y),
    sleeve(1),
    bracket(1),
    ...nearPosts.map((i) => postUpper(i)),
    manifold(),
    drum(),
    thumbScrews()
  ].join("");
  cache = { pre, mid, post: post_ };
  return cache;
}

// src/weather/icons/rain-timeline.ts
var FALL = 8;
var GROW = 10;
var RISE = 4;
var TIP_LAG = 5;
var DUMP = 9;
var mod = (a, n) => (a % n + n) % n;
var cyc = (t, e, loop) => mod(t - e, loop);
var sm = (x) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};
function dropsPerTip() {
  return 2;
}
var cache2 = /* @__PURE__ */ new Map();
function buildTimeline(spec) {
  const key = JSON.stringify(spec);
  const hit = cache2.get(key);
  if (hit) return hit;
  const { loop, N, D: D2, bursts, burstWidth } = spec;
  const edge = 0.035;
  const gate = (u) => {
    if (!bursts) return 1;
    let g = 0;
    for (let b = 0; b < bursts; b++) {
      const c = b / bursts + burstWidth / 2;
      const d = Math.abs(mod(u - c + 0.5, 1) - 0.5);
      g = Math.max(g, 1 - sm((d - (burstWidth / 2 - edge)) / (2 * edge)));
    }
    return g;
  };
  const M = 2400;
  const cum = new Float64Array(M + 1);
  for (let i = 0; i < M; i++) cum[i + 1] = cum[i] + (bursts ? gate((i + 0.5) / M) > 0.55 ? 1 : 0 : 1);
  const total = cum[M];
  const inv = (G2) => {
    const target = mod(G2, 1) * total;
    let lo = 0;
    let hi = M;
    while (lo < hi) {
      const mid = lo + hi >> 1;
      if (cum[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    return Math.max(0, lo - 0.5) / M * loop;
  };
  const n = N * D2;
  const phase = bursts ? 0 : 0.35 / n;
  const arrive = [];
  const side = [];
  for (let kk = 0; kk < n; kk++) {
    arrive.push(inv((kk + 0.5) / n + phase));
    side.push(Math.floor(kk / D2) % 2 === 0 ? 1 : -1);
  }
  const tips = [];
  const tipSide = [];
  for (let j = 0; j < N; j++) {
    tips.push(mod(arrive[(j + 1) * D2 - 1] + TIP_LAG, loop));
    tipSide.push(j % 2 === 0 ? 1 : -1);
  }
  const tl = { loop, N, D: D2, arrive, side, tips, tipSide, gate };
  cache2.set(key, tl);
  return tl;
}
function tipResponse(age) {
  if (age <= 0) return 0;
  const tau = 2.4;
  const w = 0.5;
  return 1 - Math.exp(-age / tau) * (Math.cos(w * age) + Math.sin(w * age) / (w * tau));
}
function stateAt(tl, t) {
  const { loop, tips, tipSide, arrive, D: D2 } = tl;
  let jStar = 0;
  let best = Infinity;
  for (let j = 0; j < tips.length; j++) {
    const a = cyc(t, tips[j], loop);
    if (a < best) {
      best = a;
      jStar = j;
    }
  }
  const sStar = tipSide[jStar];
  const phi = sStar * (1 - 2 * tipResponse(best));
  const lastTip = (s) => {
    let b = Infinity;
    for (let j = 0; j < tips.length; j++) if (tipSide[j] === s) b = Math.min(b, cyc(t, tips[j], loop));
    return b;
  };
  const fill = [0, 0];
  [1, -1].forEach((s, idx) => {
    const own = lastTip(s);
    const other = lastTip(-s);
    if (other < own) {
      let f = 0;
      for (let kk = 0; kk < arrive.length; kk++) {
        const a = cyc(t, arrive[kk], loop);
        if (a < other) f += 1 / D2 * sm(a / RISE);
      }
      fill[idx] = Math.min(1, f);
    } else {
      fill[idx] = 1 - sm((own - 1.5) / DUMP);
    }
  });
  const dq = (best - 1.5) / DUMP;
  return { phi, fill, dumpSide: sStar, dumpQ: dq > 0 && dq < 1 ? dq : 0, tipAge: best };
}

// src/weather/icons/rain-ice.ts
function iceAmt(t, loop) {
  const u = t / loop;
  return { g: smooth01((u - 0.02) / 0.82), a: 1 - smooth01((u - 0.9) / 0.08) };
}
var ICE = "var(--wx-ice)";
var f1 = (v) => (Math.round(v * 10) / 10).toString();
function iceSolid(p, a) {
  if (a < 0.02) return "";
  return `<g style="opacity:${a.toFixed(2)}"><path d="${p.fill || p.top}" style="fill:${ICE};fill-opacity:.5;stroke:none"/><path d="${p.shades[0]}${p.shades[1]}" style="fill:var(--anatomy-shade-0);fill-opacity:.25;stroke:none"/><path d="${p.shades[3]}${p.top}" style="fill:var(--anatomy-hi);fill-opacity:.3;stroke:none"/><path d="${p.outline}" style="fill:none;stroke:${ICE};stroke-width:.8;stroke-linejoin:round;stroke-opacity:.95"/></g>`;
}
function icicle(x, y, z, r, len, a) {
  if (len < 1.2 || a < 0.02) return "";
  const F = G.frameAlong([x, y, z], [0, 0, -1]);
  const prof = [[0, r], [len * 0.35, r * 0.78, 1], [len * 0.7, r * 0.4, 1], [len, 0.12]];
  return iceSolid(G.lathe(prof, F, P, { steps: 10, smooth: false }), a);
}
function crystalFlat(cx, cy, z, l, rot) {
  let d = "";
  for (let i = 0; i < 6; i++) {
    const a = rot + i * Math.PI / 3;
    const ex = cx + Math.cos(a) * l;
    const ey = cy + Math.sin(a) * l;
    d += k.segment([cx, cy, z], [ex, ey, z], P);
    for (const t of [0.45, 0.72]) {
      const bx = cx + Math.cos(a) * l * t;
      const by = cy + Math.sin(a) * l * t;
      for (const s of [-1, 1]) {
        const ba = a + s * Math.PI / 3;
        d += k.segment([bx, by, z], [bx + Math.cos(ba) * l * 0.32 * (1.1 - t * 0.5), by + Math.sin(ba) * l * 0.32 * (1.1 - t * 0.5), z], P);
      }
    }
  }
  return d;
}
function crystalGlass(z, ang, l, rot) {
  const F = G.frameOf([0, 0, 0], [0, 0, 1], [Math.cos(50 * RAD), Math.sin(50 * RAD), 0], [-Math.sin(50 * RAD), Math.cos(50 * RAD), 0]);
  const c = G.pointOf(F, z, TANK_R + 0.1, ang);
  const tan = G.tangentOf(F, ang);
  let d = "";
  const arm2 = (a, len, from) => {
    const dx = Math.cos(a) * len;
    const dz = Math.sin(a) * len;
    const e = [from[0] + tan[0] * dx, from[1] + tan[1] * dx, from[2] + dz];
    return [e, k.segment(from, e, P)];
  };
  for (let i = 0; i < 6; i++) {
    const a = rot + i * Math.PI / 3;
    const [, s] = arm2(a, l, c);
    d += s;
    for (const t of [0.45, 0.72]) {
      const [bp] = arm2(a, l * t, c);
      for (const sg of [-1, 1]) d += arm2(a + sg * Math.PI / 3, l * 0.3, bp)[1];
    }
  }
  return d;
}
var R = prng(5150);
var RIM_SPOTS = Array.from({ length: 22 }, (_, i) => ({
  ang: i / 22 * Math.PI * 2 + R() * 0.2,
  r: FUN_R_IN + 1 + R() * (FUN_R - FUN_R_IN - 2.4),
  l: 2.2 + R() * 2.6,
  rot: R() * 1.05
}));
var RIM_BEADS = Array.from({ length: 34 }, () => ({ ang: R() * Math.PI * 2, r: FUN_R_IN - 4 + R() * (FUN_R - FUN_R_IN + 3), s: 0.6 + R() * 0.7, at: R() }));
var GLASS_SPOTS = Array.from({ length: 9 }, (_, i) => ({ z: 20 + R() * 62, ang: -0.5 + i / 8 * 1.7 + R() * 0.12, l: 2.6 + R() * 2.2, rot: R() * 1.05 }));
var EDGE_ANGLES = (n, seed) => {
  const r = prng(seed);
  return Array.from({ length: n }, (_, i) => (50 - 85 + i / (n - 1) * 170 + (r() - 0.5) * 6) * RAD);
};
var DRUM_ICICLES = EDGE_ANGLES(13, 11).map((a, i) => ({ a, len: 0.45 + 0.55 * (i * 0.618 % 1), r: 1.4 + i * 0.37 % 1 * 1 }));
var LIP_ICICLES = EDGE_ANGLES(9, 23).map((a, i) => ({ a, len: 0.4 + 0.6 * (i * 0.43 % 1), r: 1.1 + i * 0.29 % 1 * 0.7 }));
var CAP_ICICLES = EDGE_ANGLES(6, 31).map((a, i) => ({ a, len: 0.4 + 0.6 * (i * 0.51 % 1), r: 0.9 + i * 0.33 % 1 * 0.6 }));
var SLEEVES_LOW = [
  [0, 16, 34],
  [0, 40, 56],
  [0, 92, 100],
  [2, 16, 34],
  [2, 40, 56],
  [2, 92, 100]
];
var SLEEVES_UP = [
  [0, 112, 134],
  [0, 160, 176],
  [0, 196, 222],
  [2, 112, 134],
  [2, 160, 178],
  [2, 198, 222]
];
function sleeves(list, a, g) {
  if (a < 0.02) return "";
  let o = "";
  for (const [pi, z0, z1] of list) {
    const [x, y] = POSTS[pi];
    o += iceSolid(k.cylinder(x, y, 3.3 + 0.9 * g, z0, z1 - z0, P, 18), a * 0.8);
    o += icicle(x, y, z0 + 0.2, 1.5, (3 + 6 * g) * (1 + (pi + z0) % 3 * 0.2), a);
  }
  return o;
}
function iceMid(t, loop, s) {
  const { g, a } = iceAmt(t, loop);
  const A = a * smooth01(g * 4);
  let o = sleeves(SLEEVES_LOW, A * (0.6 + 0.4 * s.glaze), g);
  const F = G.frameOf([0, 0, 0], [0, 0, 1], [Math.cos(50 * RAD), Math.sin(50 * RAD), 0], [-Math.sin(50 * RAD), Math.cos(50 * RAD), 0]);
  void F;
  const n = Math.round(3 + 6 * s.crystals);
  let d = "";
  for (let i = 0; i < n; i++) {
    const c = GLASS_SPOTS[i];
    d += crystalGlass(c.z, c.ang, c.l * (0.25 + 0.75 * g) * (0.6 + 0.6 * s.crystals), c.rot);
  }
  o += `<path class="iso-line" d="${d}" style="stroke:${ICE};stroke-width:.8;stroke-opacity:${(0.95 * a).toFixed(2)}"/>`;
  for (const c of CAP_ICICLES) {
    const x = (TANK_R + 2.4) * Math.cos(c.a);
    const y = (TANK_R + 2.4) * Math.sin(c.a);
    o += icicle(x, y, Z_CAP1 - 4, c.r, (2 + 9 * c.len) * g * s.icicle, a);
  }
  return o;
}
function iceTop(t, loop, s) {
  const { g, a } = iceAmt(t, loop);
  const A = a * smooth01(g * 4);
  let o = sleeves(SLEEVES_UP, A * (0.6 + 0.4 * s.glaze), g);
  for (const c of LIP_ICICLES) {
    const x = (BOWL_LIP - 0.6) * Math.cos(c.a);
    const y = (BOWL_LIP - 0.6) * Math.sin(c.a);
    o += icicle(x, y, Z_LIP - 1, c.r, (3 + 11 * c.len) * g * s.icicle, a);
  }
  for (const [x, y] of POSTS) o += icicle(x * 0.82, y * 0.82, Z_PLATE0 + 0.4, 1.3, (2 + 6 * g) * s.icicle, a);
  for (const sx of [-1, 1]) o += icicle(sx * NOZ_X, 0, NOZ_Z + 0.4, 0.9, (1.5 + 3.5 * g) * s.icicle, a);
  for (const c of DRUM_ICICLES) {
    const x = (FUN_R - 0.4) * Math.cos(c.a);
    const y = (FUN_R - 0.4) * Math.sin(c.a);
    o += icicle(x, y, Z_DRUM0 + 0.8, c.r, (4 + 20 * c.len) * g * s.icicle, a);
  }
  void Z_MAN;
  const F = upFrame(0, 0, Z_DRUM1);
  const th = 0.5 + 2.6 * g * (0.4 + 0.6 * s.glaze);
  const rIn = FUN_R_IN - 1 - 7 * g * s.glaze;
  o += iceSolid({ ...G.ringBand(0, th, rIn, FUN_R + 0.9, F, P, { steps: 96, bevel: 0.4 }), fill: "" }, a);
  const zc = Z_DRUM1 + th + 0.1;
  const nc = Math.round(6 + 16 * s.crystals);
  let d = "";
  for (let i = 0; i < nc; i++) {
    const c = RIM_SPOTS[i];
    d += crystalFlat(c.r * Math.cos(c.ang), c.r * Math.sin(c.ang), zc, c.l * (0.2 + 0.8 * g) * (0.6 + 0.7 * s.crystals), c.rot);
  }
  o += `<path class="iso-line" d="${d}" style="stroke:${ICE};stroke-width:.85;stroke-opacity:${a.toFixed(2)}"/>`;
  const nb = Math.round(34 * s.beads);
  for (let i = 0; i < nb; i++) {
    const b = RIM_BEADS[i];
    const grow = smooth01((g - b.at * 0.8) / 0.2);
    if (grow < 0.05) continue;
    const p = at([b.r * Math.cos(b.ang), b.r * Math.sin(b.ang), zc + 0.4]);
    o += `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${f1(b.s * 1.5 * grow)}" style="fill:${ICE};fill-opacity:${(0.9 * a).toFixed(2)};stroke:var(--anatomy-hi);stroke-width:.35;stroke-opacity:${(0.5 * a).toFixed(2)}"/>`;
    o += `<circle cx="${f1(p[0] - 0.35)}" cy="${f1(p[1] - 0.4)}" r="${f1(b.s * 0.45 * grow)}" style="fill:var(--anatomy-hi);fill-opacity:${(0.8 * a).toFixed(2)};stroke:none"/>`;
  }
  return o;
}
function lipIcicles(positions, t, loop, s) {
  const { g, a } = iceAmt(t, loop);
  let o = "";
  positions.forEach((p, i) => {
    o += icicle(p[0], p[1], p[2], 0.9, (2 + 5 * g * (0.7 + 0.3 * (i * 0.37 % 1))) * s.icicle, a);
  });
  return o;
}
function iceBead(x, y, r, a) {
  if (a < 0.03) return "";
  return `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" style="fill:${ICE};fill-opacity:${a.toFixed(2)};stroke:var(--anatomy-hi);stroke-width:.35;stroke-opacity:${(a * 0.6).toFixed(2)}"/><circle cx="${f1(x - r * 0.3)}" cy="${f1(y - r * 0.35)}" r="${f1(r * 0.35)}" style="fill:var(--anatomy-hi);fill-opacity:${(a * 0.85).toFixed(2)};stroke:none"/>`;
}

// src/weather/icons/rain-gauge.ts
var mod2 = (a, n) => (a % n + n) % n;
var RAIN = "var(--wx-rain)";
var fmt = (v) => (Math.round(v * 10) / 10).toString();
var pt = (p) => `${fmt(p[0])} ${fmt(p[1])}`;
function dropPath(hx, hy, r, len) {
  const l = Math.max(len, r * 1.2);
  return `M${fmt(hx)} ${fmt(hy - l)}C${fmt(hx + r * 0.15)} ${fmt(hy - l * 0.45)} ${fmt(hx + r)} ${fmt(hy - r * 1.1)} ${fmt(hx + r)} ${fmt(hy)}A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(hx - r)} ${fmt(hy)}C${fmt(hx - r)} ${fmt(hy - r * 1.1)} ${fmt(hx - r * 0.15)} ${fmt(hy - l * 0.45)} ${fmt(hx)} ${fmt(hy - l)}Z`;
}
var dropSvg = (hx, hy, r, len, a, tone = RAIN) => a > 0.02 ? `<path d="${dropPath(hx, hy, r, len)}" style="fill:${tone};fill-opacity:${a.toFixed(2)};stroke:none"/>` : "";
function ribbon(points, w0, w1) {
  const n = points.length;
  if (n < 2) return "";
  const left = [];
  const right = [];
  for (let i = 0; i < n; i++) {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const w = lerp(w0, w1, i / (n - 1)) / 2;
    left.push([points[i][0] - dy / len * w, points[i][1] + dx / len * w]);
    right.push([points[i][0] + dy / len * w, points[i][1] - dx / len * w]);
  }
  return `M${[...left, ...right.reverse()].map(pt).join("L")}Z`;
}
var water = (d, a = 0.8) => `<path d="${d}" style="fill:${RAIN};fill-opacity:${a.toFixed(2)};stroke:none"/>`;
function liquid(p, a = 1, slush = 0) {
  return `<g style="opacity:${a.toFixed(2)}"><path d="${p.fill}" style="fill:${RAIN};fill-opacity:.62;stroke:none"/>` + (slush ? `<path d="${p.fill}" style="fill:var(--wx-ice);fill-opacity:${(0.32 * slush).toFixed(2)};stroke:none"/>` : "") + `<path d="${p.shades[0]}${p.shades[1]}" style="fill:var(--anatomy-shade-0);fill-opacity:.3;stroke:none"/><path d="${p.shades[3]}${p.top}" style="fill:var(--anatomy-hi);fill-opacity:.2;stroke:none"/><path d="${p.outline}" style="fill:none;stroke:${RAIN};stroke-width:.7;stroke-linejoin:round;stroke-opacity:.9"/></g>`;
}
function clipHalf(poly, sin, cos, c) {
  const out = [];
  const h = (p) => p[0] * sin + p[1] * cos - c;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const ha = h(a);
    const hb = h(b);
    if (ha <= 0) out.push(a);
    if (ha <= 0 !== hb <= 0) {
      const t = ha / (ha - hb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}
var areaOf = (p) => {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i];
    const b = p[(i + 1) % p.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(s) / 2;
};
var U_IN = 1.5;
var U_OUT = SS_HALF_U - 1.4;
var WATER_TOP = SS_LIP_H - 1.1;
var pocketRect = (sigma) => {
  const a = sigma * U_IN;
  const b = sigma * U_OUT;
  return [[a, 0], [b, 0], [b, WATER_TOP], [a, WATER_TOP]];
};
var A_FULL = areaOf(clipHalf(pocketRect(1), Math.sin(SS_TILT), Math.cos(SS_TILT), 28 * Math.sin(SS_TILT)));
function waterPoly(sigma, phi, f) {
  if (f < 0.015) return null;
  const rect = pocketRect(sigma);
  const sn = Math.sin(phi);
  const cs = Math.cos(phi);
  const hs = rect.map((p) => p[0] * sn + p[1] * cs);
  let lo = Math.min(...hs);
  let hi = Math.max(...hs);
  const target = f * A_FULL;
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    if (areaOf(clipHalf(rect, sn, cs, mid)) < target) lo = mid;
    else hi = mid;
  }
  const poly = clipHalf(rect, sn, cs, (lo + hi) / 2);
  return poly.length >= 3 ? poly : null;
}
var seesaw = {
  floor: [[-(SS_HALF_U - 1.4), -2.4], [SS_HALF_U - 1.4, -2.4], [SS_HALF_U - 1.4, 0], [-(SS_HALF_U - 1.4), 0]],
  lip: (s) => {
    const a = s * (SS_HALF_U - 1.4);
    const b = s * SS_HALF_U;
    return [[a, -2.4], [b, -2.4], [b, SS_LIP_H], [a, SS_LIP_H]];
  },
  divider: [[-1.5, 0], [1.5, 0], [1.5, SS_DIV_H - 3], [0, SS_DIV_H], [-1.5, SS_DIV_H - 3]],
  wall: [[-SS_HALF_U, -2.4], [SS_HALF_U, -2.4], [SS_HALF_U, SS_LIP_H - 1.2], [-SS_HALF_U, SS_LIP_H - 1.2]]
};
function seesawSvg(phiN, fills, spec, t, loop) {
  const phi = phiN * SS_TILT;
  const c = Math.cos(phi);
  const s = Math.sin(phi);
  const F = G.frameOf([0, 0, PZ], [0, 1, 0], [c, 0, s], [-s, 0, c]);
  const prism = (poly, s0, s1) => G.prismOf(F, poly, s0, s1, P);
  const Y = SS_HALF_Y;
  const WL = SS_WALL;
  const o = [];
  const hubFrame = (y, dir) => G.frameOf([0, y, PZ], [0, dir, 0], [c, 0, s], [-s, 0, c]);
  o.push(S(G.disc(0, 1.8, 5.4, hubFrame(-(Y + WL), -1), P, { steps: 6 }), { tone: "hi", crease: "lo" }));
  o.push(S(prism(seesaw.wall, -(Y + WL), -Y), { tone: "mid" }));
  o.push(S(prism(seesaw.floor, -Y, Y), { tone: "hi", crease: "lo" }));
  o.push(S(prism(seesaw.lip(-1), -Y, Y), { tone: "hi", crease: "lo" }));
  const wn = waterPoly(-1, phi, fills[1]);
  if (wn) o.push(liquid(prism(wn, -Y + 0.3, Y - 0.3), 1, spec.ice ? 1 : 0));
  o.push(S(prism(seesaw.divider, -Y, Y), { tone: "hi", crease: "lo", lit: true }));
  const wp = waterPoly(1, phi, fills[0]);
  if (wp) o.push(liquid(prism(wp, -Y + 0.3, Y - 0.3), 1, spec.ice ? 1 : 0));
  o.push(S(prism(seesaw.lip(1), -Y, Y), { tone: "hi", crease: "lo" }));
  o.push(S(prism(seesaw.wall, Y, Y + WL), { tone: "mid" }));
  o.push(S(G.disc(0, 1.8, 5.4, hubFrame(Y + WL, 1), P, { steps: 6 }), { tone: "hi", crease: "lo" }));
  const to3 = (u, v, y) => [u * c - v * s, y, PZ + u * s + v * c];
  const rivets = [[-24, 2.4], [-14, 4.8], [14, 4.8], [24, 2.4], [-27, -0.6], [27, -0.6]].map(([u, v]) => at(to3(u, v, Y + WL)));
  o.push(k.dotsSvg(rivets, { size: 0.5 }));
  if (spec.ice) {
    const pos = [];
    for (const sg of [-1, 1]) for (const y of [-9, -3, 3, 9]) pos.push(to3(sg * (SS_HALF_U - 0.6), -2.3, y));
    o.push(lipIcicles(pos, t, loop, spec.ice));
  }
  return o.join("");
}
function pourSheet(side, phiN, q) {
  if (q <= 0) return "";
  const phi = phiN * SS_TILT;
  const e = Math.sin(Math.PI * Math.min(1, q * 1.05)) ** 0.8;
  const u = side * (SS_HALF_U - 0.3);
  const x0 = u * Math.cos(phi) - SS_LIP_H * Math.sin(phi);
  const z0 = PZ + u * Math.sin(phi) + SS_LIP_H * Math.cos(phi);
  const zb = Z_PLATE1 + bowlS(37) - 1;
  const drift = side * 3.2;
  const half = SS_HALF_Y - 0.8;
  const top = [at([x0, -half, z0]), at([x0, half, z0])];
  const bot = [at([x0 + drift, half, zb]), at([x0 + drift, -half, zb])];
  const th = 2.2 * e;
  const topB = [at([x0 + side * th, -half, z0 - 0.5]), at([x0 + side * th, half, z0 - 0.5])];
  let out = `<path d="M${pt(top[0])}L${pt(top[1])}L${pt(bot[0])}L${pt(bot[1])}Z" style="fill:${RAIN};fill-opacity:${(0.45 * e).toFixed(2)};stroke:none"/>`;
  void topB;
  const n = 6;
  let threads = "";
  for (let i = 0; i < n; i++) {
    const y = -half + (i + 0.5) / n * 2 * half;
    const a = at([x0, y, z0]);
    const b = at([x0 + drift, y, zb]);
    threads += `<line x1="${fmt(a[0])}" y1="${fmt(a[1])}" x2="${fmt(b[0])}" y2="${fmt(b[1])}" style="stroke:${RAIN};stroke-width:.9;stroke-opacity:${(0.8 * e).toFixed(2)};stroke-linecap:round"/>`;
  }
  out += threads;
  const age = clamp(q * 1.1);
  const rr = 3 + age * 7;
  out += `<g clip-path="url(#${CLIP_BOWL})"><path d="${k.ring(x0 + drift, 0, rr, zb, P, 24)}" style="fill:none;stroke:${RAIN};stroke-width:.9;stroke-opacity:${(0.7 * e).toFixed(2)}"/></g>`;
  return out;
}
function dripSvg(tl, t, spec, phiOf) {
  const o = [];
  const { loop, arrive, side } = tl;
  const ds = spec.dropScale;
  for (let i = 0; i < arrive.length; i++) {
    const toArr = cyc(arrive[i], t, loop);
    const sg = side[i];
    const x = sg * NOZ_X;
    const zLand = PZ + NOZ_X * Math.sin(SS_TILT) + 1.6;
    if (toArr <= FALL) {
      const tau = FALL - toArr;
      const g = 2 * (NOZ_Z - zLand) / (FALL * FALL);
      const z = NOZ_Z - 0.5 * g * tau * tau;
      const speed = g * tau;
      const hd = at([x, 0, z - 1]);
      const tail = at([x, 0, z - 1 + speed * 0.9 + 1.2]);
      if (spec.ice) o.push(iceBead(hd[0], hd[1] - 1, 1.5 * ds, 0.95));
      else o.push(dropSvg(hd[0], hd[1], 1.55 * ds, Math.max(1, Math.abs(hd[1] - tail[1])), 0.95));
    } else if (toArr <= FALL + GROW) {
      const u = (FALL + GROW - toArr) / GROW;
      const r = lerp(0.5, 1.7, smooth01(u)) * ds;
      const hd = at([x, 0, NOZ_Z - r * 0.8]);
      if (spec.ice) o.push(iceBead(hd[0], hd[1], r * 0.95, 0.95));
      else o.push(dropSvg(hd[0], hd[1], r * 1.1, r * 1.9, 0.95));
    }
    const age = cyc(t, arrive[i], loop);
    if (age < 7) {
      const ph = phiOf(arrive[i]);
      const u = sg * NOZ_X;
      const zr = PZ + u * Math.sin(ph * SS_TILT) + 1.8;
      const xr = u * Math.cos(ph * SS_TILT);
      o.push(`<path d="${k.ring(xr, 0, 1 + age * 0.55, zr, P, 14)}" style="fill:none;stroke:${RAIN};stroke-width:.8;stroke-opacity:${(0.8 * (1 - age / 7)).toFixed(2)}"/>`);
    }
  }
  return o.join("");
}
var DW0 = 0.885;
var DW1 = 0.975;
function tankLevel(tl, t, unit) {
  const { loop, tips } = tl;
  const raw = (tt) => {
    const e = cyc(tt, DW1 * loop, loop);
    let sum = 0;
    for (let j = 0; j < tips.length; j++) {
      const age = cyc(tt, tips[j] + 7, loop);
      if (age < e) sum += smooth01(age / 6);
    }
    return sum * unit;
  };
  const w0 = DW0 * loop;
  const w1 = DW1 * loop;
  if (t >= w0 && t <= w1) return raw(w0) * (1 - smooth01((t - w0) / (w1 - w0)));
  return raw(t);
}
function tipCount(tl, t) {
  const { loop, tips } = tl;
  const w0 = DW0 * loop;
  const tt = t >= w0 && t <= DW1 * loop ? w0 : t;
  const e = cyc(tt, DW1 * loop, loop);
  let count = 0;
  let led = false;
  for (let j = 0; j < tips.length; j++) {
    if (cyc(tt, tips[j] + 7, loop) < e) count++;
    if (cyc(t, tips[j] + 1, loop) < 4) led = true;
  }
  return { count, led };
}
function tankWater(level, slush) {
  const h = level * (WATER_Z1 - WATER_Z0);
  if (h < 0.4) return "";
  const cyl = k.cylinder(0, 0, TANK_R - 1.6, WATER_Z0, h, P, 56);
  const surf = k.ring(0, 0, TANK_R - 1.6, WATER_Z0 + h, P, 56);
  return liquid(cyl, 1, slush) + `<path d="${surf}" style="fill:${RAIN};fill-opacity:.55;stroke:none"/><path d="${k.ring(0, 0, TANK_R - 3.4, WATER_Z0 + h, P, 40)}" style="fill:none;stroke:var(--anatomy-hi);stroke-opacity:.35;stroke-width:.6"/>`;
}
function neckStreams(tl, t, zSurface) {
  const o = [];
  const { loop, tips } = tl;
  for (let j = 0; j < tips.length; j++) {
    const age = cyc(t, tips[j] + 6, loop);
    if (age >= 11) continue;
    const e = Math.sin(Math.PI * age / 11);
    const top = at([0, 0, Z_TANK1 - 2]);
    const bot = at([0, 0, zSurface]);
    o.push(`<path d="${ribbon([top, bot], 2.4 * e + 0.4, 1.4 * e + 0.2)}" style="fill:${RAIN};fill-opacity:${(0.8 * e).toFixed(2)};stroke:none"/>`);
    o.push(`<path d="${k.ring(0, 0, 1.2 + age * 0.9, zSurface, P, 20)}" style="fill:none;stroke:${RAIN};stroke-width:.8;stroke-opacity:${(0.7 * (1 - age / 11)).toFixed(2)}"/>`);
  }
  return o.join("");
}
function drainStream(t, loop, levelNow) {
  const w0 = DW0 * loop;
  const w1 = DW1 * loop;
  if (t < w0 || t > w1 || levelNow < 0.01) return "";
  const e = smooth01((t - w0) / 2) * smooth01((w1 - t) / 3);
  const tip = [TAP_TIP[0], TAP_TIP[1], TAP_Z - 7.6];
  const a = at(tip);
  const b = at([tip[0], tip[1], Z_BASE + 0.2]);
  let out = `<path d="${ribbon([a, b], 2.2 * e, 1.6 * e)}" style="fill:${RAIN};fill-opacity:${(0.85 * e).toFixed(2)};stroke:none"/>`;
  const age = (t - w0) % 4;
  out += `<path d="${k.ring(tip[0], tip[1], 1.6 + age * 1.1, Z_BASE + 0.2, P, 18)}" style="fill:none;stroke:${RAIN};stroke-width:.8;stroke-opacity:${(0.7 * e * (1 - age / 4)).toFixed(2)}"/>`;
  return out;
}
function wheelTurn(t, loop) {
  const start = DW0 * loop - 4;
  const span = cyc(DW1 * loop - 2, start, loop);
  const a = cyc(t, start, loop);
  const level = a < span ? smooth01(a / 6) : a < span + 6 ? 1 - smooth01((a - span) / 6) : 0;
  return Math.PI / 2 * level + 0.4;
}
var LANES = (() => {
  const r = prng(20240611);
  const lanes = [];
  for (let i = 0; i < 64; i++) {
    const slot = i * 0.618034 % 1;
    lanes.push({ x: 14 + slot * (W - 28), phase: r(), yEnd: 372 + r() * 52, lenK: 0.75 + r() * 0.5, seed: i });
  }
  return lanes;
})();
function skyStreaks(t, tl, spec, front) {
  const { loop } = tl;
  const n = Math.round(lerp(spec.skyCount[0], spec.skyCount[1], clamp(spec.eff)));
  const m = spec.skyMult;
  const T = loop / m;
  const speed = (H + 80) * m / loop;
  const o = [];
  for (let i = 0; i < n; i++) {
    const ln = LANES[i];
    const inFront = Math.abs(ln.x - W / 2) > 112;
    if (inFront !== front) continue;
    const s = (t / T + ln.phase) % 1;
    const yTop = -40;
    const yEnd = ln.yEnd;
    const head = yTop + s * (H + 80);
    const age0 = s * T;
    const len = spec.streakLen * ln.lenK;
    const g = tl.gate(mod2(t - age0, loop) / loop);
    const a = 0.9 * g;
    if (a > 0.02 && head - len < yEnd) {
      const y1 = Math.min(head, yEnd);
      const y0 = head - len;
      const segs = 3;
      for (let q = 0; q < segs; q++) {
        const ya = lerp(y0, y1, q / segs);
        const yb = lerp(y0, y1, (q + 1) / segs);
        if (yb <= -10 || ya >= yEnd) continue;
        o.push(`<line x1="${fmt(ln.x)}" y1="${fmt(ya)}" x2="${fmt(ln.x)}" y2="${fmt(yb)}" style="stroke:${RAIN};stroke-width:${spec.streakW};stroke-linecap:round;stroke-opacity:${(a * (0.25 + 0.75 * (q + 1) / segs)).toFixed(2)}"/>`);
      }
    }
    if (spec.ice && a > 0.02 && head > 0 && head < yEnd) o.push(iceBead(ln.x, head, spec.streakW * 1.5 + 0.4, 0.95 * g));
    const since = (s * (H + 80) + yTop - yEnd) / speed;
    if (head > yEnd && since < 12 && a > 0.02) {
      const rr = 2 + since * 0.9;
      o.push(`<ellipse cx="${fmt(ln.x)}" cy="${fmt(yEnd)}" rx="${fmt(rr)}" ry="${fmt(rr * 0.46)}" style="fill:none;stroke:${RAIN};stroke-width:.8;stroke-opacity:${(0.55 * a * (1 - since / 12)).toFixed(2)}"/>`);
    }
  }
  return o.join("");
}
function catchDrops(t, tl, spec) {
  const { loop } = tl;
  const n = Math.round(lerp(spec.catchCount[0], spec.catchCount[1], clamp(spec.eff)));
  const falling = [];
  const splashes = [];
  const vPx = spec.skyMult * (H + 80) / loop;
  const yTop = -30;
  for (let j = 0; j < n; j++) {
    const probe = (c2) => {
      const r = prng(j * 7919 + c2 * 104729 + 13);
      const ang = r() * Math.PI * 2;
      const rad = Math.sqrt(r()) * (FUN_R_IN - 12);
      const x = rad * Math.cos(ang);
      const y = rad * Math.sin(ang);
      return [x, y, funnelZ(rad)];
    };
    const p0 = probe(0);
    const m = Math.max(1, Math.round(vPx * loop / (at(p0)[1] - yTop)));
    const T = loop / m;
    const phase = (prng(7001 + j * 31)() * 3 + j * 0.37) % 1;
    const pos = t / T + phase;
    const c = Math.floor(pos);
    const s = pos - c;
    const cm = mod2(c, m);
    const cur = probe(cm + 1);
    const prev = probe(mod2(cm - 1, m) + 1);
    const g = tl.gate(mod2(t - s * T, loop) / loop);
    const land = at(cur);
    const yh = lerp(yTop, land[1], s);
    const len = spec.streakLen * (0.8 + 0.4 * prng(j + 5)());
    const segs = 3;
    for (let q = 0; q < segs; q++) {
      const ya = Math.max(yTop, yh - len + len * q / segs);
      const yb = yh - len + len * (q + 1) / segs;
      if (yb <= -10) continue;
      falling.push(`<line x1="${fmt(land[0])}" y1="${fmt(ya)}" x2="${fmt(land[0])}" y2="${fmt(Math.min(yb, land[1]))}" style="stroke:${RAIN};stroke-width:${spec.streakW + 0.3};stroke-linecap:round;stroke-opacity:${(g * (0.3 + 0.7 * (q + 1) / segs)).toFixed(2)}"/>`);
    }
    const age = s * T;
    if (age < 9 && g > 0.05) {
      const e = 1 - age / 9;
      splashes.push(`<path d="${k.ring(prev[0], prev[1], 1.4 + age * 0.95, prev[2] + 0.2, P, 20)}" style="fill:none;stroke:${RAIN};stroke-width:.9;stroke-opacity:${(0.85 * e * g).toFixed(2)}"/>`);
      for (let q = 0; q < 3; q++) {
        const dx = (q - 1) * 1.9 * (age * 0.5 + 0.4);
        const hz = 5.5 * age * (1 - age / 9) * (q === 1 ? 1.2 : 0.8);
        const sp = at([prev[0] + dx, prev[1], prev[2] + hz]);
        splashes.push(`<circle cx="${fmt(sp[0])}" cy="${fmt(sp[1])}" r="0.75" style="fill:${RAIN};fill-opacity:${(0.9 * e * g).toFixed(2)};stroke:none"/>`);
      }
    }
  }
  return `<g clip-path="url(#${CLIP_FUN}-catch)">${falling.join("")}</g><g clip-path="url(#${CLIP_FUN})">${splashes.join("")}</g>`;
}
function renderGauge(ctx, spec) {
  const { frame, loop } = ctx;
  const N = spec.cycles * 2;
  const D2 = dropsPerTip();
  const tl = buildTimeline({ loop, N, D: D2, bursts: spec.mode === "bursts" ? spec.bursts ?? 2 : 0, burstWidth: spec.burstWidth ?? 0.3 });
  const st = stateAt(tl, frame);
  const phiOf = (tt) => stateAt(tl, tt).phi;
  const unit = 0.08;
  const level = tankLevel(tl, frame, unit);
  const zSurf = WATER_Z0 + level * (WATER_Z1 - WATER_Z0);
  const statics = gaugeStatics();
  const out = [];
  out.push(`<g class="wx-back">${skyStreaks(frame, tl, spec, false)}</g>`);
  out.push(statics.pre);
  out.push(tankWater(level, spec.ice ? 1 : 0));
  out.push(neckStreams(tl, frame, zSurf));
  out.push(statics.mid);
  if (spec.ice) out.push(iceMid(frame, loop, spec.ice));
  const tc = tipCount(tl, frame);
  out.push(loggerLive(tc.count, tc.led));
  out.push(tapWheel(wheelTurn(frame, loop)));
  if (st.dumpSide === -1) out.push(pourSheet(-1, st.phi, st.dumpQ));
  out.push(seesawSvg(st.phi, st.fill, spec, frame, loop));
  if (st.dumpSide === 1) out.push(pourSheet(1, st.phi, st.dumpQ));
  out.push(statics.post);
  if (spec.ice) out.push(iceTop(frame, loop, spec.ice));
  out.push(dripSvg(tl, frame, spec, phiOf));
  out.push(catchDrops(frame, tl, spec));
  out.push(drainStream(frame, loop, level));
  out.push(`<g class="wx-front">${skyStreaks(frame, tl, spec, true)}</g>`);
  void water;
  void EL;
  void RAD;
  void L;
  void upFrame;
  void DUMP;
  return out.join("");
}

// src/weather/icons/freezing-rain.ts
var LOOP = 120;
function specFor(intensity) {
  const eff = Math.max(0, Math.min(1, intensity));
  return {
    eff,
    cycles: 1 + Math.round(eff * 4),
    mode: "steady",
    skyMult: eff > 0.75 ? 3 : 2,
    skyCount: [8, 24],
    streakLen: 20,
    streakW: 1.25,
    dropScale: 1,
    catchCount: [4, 12],
    ice: { glaze: 1, icicle: 1, crystals: 0.45, beads: 0.7 }
  };
}
var freezingRain = {
  id: "freezing-rain",
  label: "Freezing rain",
  object: "Tipping-bucket rain gauge glazed with ice, icicles growing from every edge",
  width: W,
  height: H,
  loop: LOOP,
  render: (ctx) => renderGauge(ctx, specFor(ctx.intensity))
};

// <stdin>
var icon = freezingRain;
export {
  icon
};
