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
  return points.map(([x, y], at) => `${at ? "L" : "M"}${tenth(x)} ${tenth(y)}`).join("") + (closed ? "Z" : "");
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
var rise = (at, from, to, projection) => segment([at[0], at[1], from], [at[0], at[1], to], projection);
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
  for (let at = first, index = Math.round(first / step); at <= to + 1e-9; at += step, index++) {
    const big = index % every === 0;
    const length = big ? lengths[1] : lengths[0];
    const a = axis === "x" ? [at, edge] : [edge, at];
    const b = axis === "x" ? [at, edge + length] : [edge + length, at];
    (big ? major : minor).push(lineOnTop(a, b, z, projection));
  }
  return { minor: minor.join(""), major: major.join("") };
}
function sideTicks(from, to, step, every, face, top, lengths, projection, axis = "x") {
  const minor = [];
  const major = [];
  const first = Math.ceil(from / step) * step;
  for (let at = first, index = Math.round(first / step); at <= to + 1e-9; at += step, index++) {
    const big = index % every === 0;
    const length = big ? lengths[1] : lengths[0];
    const a = axis === "x" ? [at, face, top] : [face, at, top];
    const b = axis === "x" ? [at, face, top - length] : [face, at, top - length];
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
function axesAt(at, z, projection) {
  const origin = iso([at[0], at[1], z], projection);
  const along = (point) => {
    const [px, py] = iso(point, projection);
    return [px - origin[0], py - origin[1]];
  };
  return { origin, x: along([at[0] + 1, at[1], z]), y: along([at[0], at[1] + 1, z]), z: along([at[0], at[1], z + 1]) };
}
var matrixOf = (u, v, origin) => `matrix(${thousandth(u[0])} ${thousandth(u[1])} ${thousandth(v[0])} ${thousandth(v[1])} ${thousandth(origin[0])} ${thousandth(origin[1])})`;
function holdStill(element, [dx, dy]) {
  const text = dx || dy ? `translate(${-dx} ${-dy})` : "";
  element.querySelectorAll("[data-hold]").forEach((node) => text ? node.setAttribute("transform", text) : node.removeAttribute("transform"));
}
function topMatrix(at, z, projection, along = "x") {
  const { origin, x, y } = axesAt(at, z, projection);
  return along === "x" ? matrixOf(x, y, origin) : matrixOf([-y[0], -y[1]], x, origin);
}
function sideMatrix(at, z, projection, face) {
  const { origin, x, y, z: up2 } = axesAt(at, z, projection);
  const down = [-up2[0], -up2[1]];
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
  const up2 = Math.min(...ys);
  const down = Math.max(...ys);
  const scale = Math.min((width - pad * 2) / (right - left), (height - pad * 2 - headroom) / (down - up2));
  return {
    origin: [width / 2 - (left + right) / 2 * scale, headroom + (height - headroom) / 2 - (up2 + down) / 2 * scale],
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
  const at = (length) => {
    let index = 1;
    while (index < points.length - 1 && lengths[index] < length)
      index++;
    const span = lengths[index] - lengths[index - 1] || 1;
    const t = Math.max(0, Math.min(1, (length - lengths[index - 1]) / span));
    return [points[index - 1][0] + (points[index][0] - points[index - 1][0]) * t, points[index - 1][1] + (points[index][1] - points[index - 1][1]) * t];
  };
  const pieceOf = (from, to) => [at(from), ...points.filter((_, index) => lengths[index] > from + 1e-6 && lengths[index] < to - 1e-6), at(to)];
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
      for (let at = 1; at <= run.length; at++) {
        if (at < run.length && countOf(run[at - 1]) === countOf(run[at])) continue;
        if (at - 1 > start && countOf(run[start])) sheet(tone, run.slice(start, at));
        if (at < run.length) strip(tone, run[at - 1], run[at]);
        start = at;
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
  const R = right.map((point) => iso(point, P2));
  const topArc = arc(s1, r1, angleOf(left[left.length - 1]), angleOf(right[right.length - 1]), top);
  const bottomArc = arc(s0, r0, angleOf(right[0]), angleOf(left[0]), bottom);
  const keepFirst = rims === "all" || rims === "first" || rims === "ends";
  const keepLast = rims === "all" || rims === "last" || rims === "ends";
  const fill = pathOf([...L2, ...topArc, ...[...R].reverse(), ...bottomArc], true);
  const outline = [pathOf(L2), pathOf(R), keepLast ? pathOf(topArc) : "", keepFirst ? pathOf(bottomArc) : ""].join("");
  const hull = hullOf([...arc(s0, r0, 0, TAU - 1e-6, Math.PI), ...arc(s1, r1, 0, TAU - 1e-6, Math.PI), ...L2, ...R]);
  let gap = 0;
  for (const p of [...L2, ...R]) {
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
var saddleStart = (R, a, angle) => Math.sqrt(Math.max(0, R * R - a * a * Math.cos(angle) ** 2));
function saddleOf(F, a, start, s1, P2, { steps = stepsFor(a, 24) } = {}) {
  const V = viewOf(P2);
  const L2 = lightOf(P2);
  const n = steps;
  const angle = (j) => j / n * TAU;
  const from = typeof start === "function" ? start : (t) => saddleStart(start, a, t);
  const low2 = Array.from({ length: n }, (_, j) => iso(pointOf(F, from(angle(j)), a, angle(j)), P2));
  const high2 = Array.from({ length: n }, (_, j) => iso(pointOf(F, s1, a, angle(j)), P2));
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
    const d = pathOf(oriented2([...run.map((j) => low2[j]), ...run.map((j) => high2[j]).reverse()]), true);
    buckets[key].push(d);
    fills.push(d);
  }
  const capSeen = dot3(F.a, V) > 1e-6;
  if (capSeen) {
    const d = pathOf(oriented2(high2), true);
    buckets[bandOf(dot3(F.a, L2))].push(d);
    fills.push(d);
  }
  const front = runsOf2(seen);
  const back = runsOf2(seen.map((visible) => !visible));
  const edges = [];
  for (const run of front) {
    edges.push(pathOf(run.map((j) => low2[j])));
    edges.push(pathOf([low2[run[0]], high2[run[0]]]), pathOf([low2[run[run.length - 1]], high2[run[run.length - 1]]]));
  }
  for (const run of capSeen ? back : front) edges.push(pathOf(run.map((j) => high2[j])));
  return {
    fill: fills.join(""),
    outline: edges.join(""),
    crease: capSeen ? front.map((run) => pathOf(run.map((j) => high2[j]))).join("") : "",
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
  const at = (s, [x, y]) => [F.o[0] + F.a[0] * s + F.u[0] * x + F.v[0] * y, F.o[1] + F.a[1] * s + F.u[1] * x + F.v[1] * y, F.o[2] + F.a[2] * s + F.u[2] * x + F.v[2] * y];
  const low2 = ring2.map((point) => iso(at(s0, point), P2));
  const high2 = ring2.map((point) => iso(at(s1, point), P2));
  const buckets = [[], [], [], [], []];
  const seen = [];
  for (let j = 0; j < n; j++) {
    const [x0, y0] = ring2[j];
    const [x1, y1] = ring2[(j + 1) % n];
    const normal = unit3(add3(mul3(F.u, y1 - y0), mul3(F.v, -(x1 - x0))));
    const visible = dot3(normal, V) > 1e-6;
    seen.push(visible);
    if (visible) buckets[bandOf(dot3(normal, L2))].push(pathOf([low2[j], low2[(j + 1) % n], high2[(j + 1) % n], high2[j]], true));
  }
  const ends = [[s0, low2, mul3(F.a, -1)], [s1, high2, F.a]];
  const capSeen = ends.map(([, , normal]) => dot3(normal, V) > 1e-6);
  ends.forEach(([, points, normal], index) => capSeen[index] && buckets[bandOf(dot3(normal, L2))].push(pathOf(points, true)));
  const hull = hullOf([...low2, ...high2]);
  const creases = [];
  for (let j = 0; j < n; j++) {
    const prev = (j - 1 + n) % n;
    const a = [ring2[j][0] - ring2[prev][0], ring2[j][1] - ring2[prev][1]];
    const b = [ring2[(j + 1) % n][0] - ring2[j][0], ring2[(j + 1) % n][1] - ring2[j][1]];
    const sharp = (a[0] * b[0] + a[1] * b[1]) / (Math.hypot(a[0], a[1]) * Math.hypot(b[0], b[1]) || 1) < Math.cos(0.35);
    if (sharp && seen[j] && seen[prev]) creases.push(pathOf([low2[j], high2[j]]));
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
    const at = Math.max(s0, Math.min(s1, s));
    const index = find(at);
    return segments[index] ? segments[index].radius(at) : linear(index, at)[0];
  });
  const slopeAt = slope ?? ((s) => {
    const at = Math.max(s0, Math.min(s1, s));
    const index = find(at);
    return segments[index] ? segments[index].slope(at) : linear(index, at)[1];
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
  const at = (t) => iso(pointOf(F, s, r, t), P2);
  const speed = (t) => {
    const a = at(t - 1e-3);
    const b = at(t + 1e-3);
    return Math.hypot(b[0] - a[0], b[1] - a[1]) / 2e-3;
  };
  const count = (span) => Math.max(2, Math.ceil((steps || stepsFor(r, 24, 112)) * span / TAU), Math.ceil(span * r * scaleOf(P2) / 1.5));
  const out = [];
  for (const [a, b] of visible) {
    if (b - a >= TAU - 1e-9 && full) {
      const n = count(TAU);
      out.push(pathOf(Array.from({ length: n }, (_, j) => at(from + j / n * TAU)), true));
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
      out.push(pathOf(Array.from({ length: n + 1 }, (_, j) => at(t0 + (t1 - t0) * j / n))));
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
    const at = total * step / count;
    while (segment2 < points.length - 1 && lengths[segment2] < at) segment2++;
    const a = points[segment2 - 1];
    const b = points[segment2];
    const span = lengths[segment2] - lengths[segment2 - 1] || 1;
    out.push(lerp3(a, b, Math.min(1, Math.max(0, (at - lengths[segment2 - 1]) / span))));
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
var pointAlong = (points, at) => {
  const piece = cut(points, at, at + 0.01);
  return piece[0] ?? points[points.length - 1];
};
function tangentAlong(points, at) {
  const total = pathLength(points);
  const a = pointAlong(points, Math.max(0, at - 0.6));
  const b = pointAlong(points, Math.min(total, at + 0.6));
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

// src/weather/icons/sky-kit.ts
var TAU2 = Math.PI * 2;
var Z = [0, 0, 1];
var S = (paths, style = {}) => k.solidSvg(paths, style);
var L = (d, style = {}) => k.lineSvg(d, style);
var D = (points, style = {}) => k.dotsSvg(points, style);
var f1 = (n) => (Math.round(n * 10) / 10).toString();
var f2 = (n) => (Math.round(n * 100) / 100).toString();
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
var clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
var up = (z, x = 0, y = 0) => G.frameAlong([x, y, z], Z);
function hull2(points) {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [];
  for (const p of pts) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop();
    lo.push(p);
  }
  const hi = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop();
    hi.push(p);
  }
  return [...lo.slice(0, -1), ...hi.slice(0, -1)];
}
function frustumD(P2, x, y, z0, r0, z1, r1) {
  const pts = [];
  for (let i = 0; i < 40; i++) {
    const a = i / 40 * TAU2;
    pts.push(k.iso([x + r0 * Math.cos(a), y + r0 * Math.sin(a), z0], P2));
    pts.push(k.iso([x + r1 * Math.cos(a), y + r1 * Math.sin(a), z1], P2));
  }
  return k.pathOf(hull2(pts), true);
}
function screwsOn(P2, plan, inset, z, ringR = 2.4) {
  const pts = k.corners(plan, inset);
  const out = pts.map(([x, y]) => L(k.ring(x, y, ringR, z, P2, 16), { tone: "lo" }));
  out.push(D(pts.map(([x, y]) => k.iso([x, y, z], P2)), { size: 0.55 }));
  pts.forEach(([x, y], i) => {
    const a = 0.5 + i * 1.7;
    out.push(L(k.lineOnTop([x - Math.cos(a) * 1.4, y - Math.sin(a) * 1.4], [x + Math.cos(a) * 1.4, y + Math.sin(a) * 1.4], z, P2), { tone: "mid" }));
  });
  return out.join("");
}
function deckSvg(P2, plan, opts = {}) {
  const h = opts.h ?? 10;
  const foot = opts.foot ?? 6;
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(plan, -h - 6, h + 6, P2)}"/>`);
  const feet = k.corners(plan, 20);
  const ordered = [...feet].sort((a, b) => k.depthOf([a[0], a[1], 0], P2) - k.depthOf([b[0], b[1], 0], P2));
  for (const [x, y] of ordered) {
    out.push(S(k.cylinder(x, y, foot + 1.6, -h - 6, 1.6, P2, 24), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, foot, -h - 4.4, 4.4, P2, 24), { tone: "mid" }));
  }
  out.push(S(k.slabOf(plan, -h, h, P2, 8, 1.4), { tone: opts.tone ?? "mid" }));
  out.push(L(k.sideSeam(plan, -h * 0.5, P2, 8), { tone: "faint" }));
  out.push(L(k.planOutline(k.insetPlan(plan, 5), 0, P2), { tone: "faint" }));
  out.push(screwsOn(P2, plan, 10, 0));
  return out.join("");
}
function rulerSvg(P2, x0, x1, y, z, step = 4, every = 5) {
  const strip = { x: x0, y, w: x1 - x0, d: 7, r: 1 };
  const t = k.topTicks(x0 + 4, x1 - 4, step, every, y + 0.8, z + 0.6, [2, 3.6], P2);
  return [S(k.slabOf(strip, z, 0.6, P2, 3), { tone: "lo", crease: "none" }), L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" })].join("");
}
function labelPlateSvg(P2, plan, z) {
  const out = [];
  out.push(S(k.slabOf(plan, z, 0.8, P2, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(plan, 1.6), z + 0.8, P2, 4), { tone: "faint" }));
  const mid = plan.y + plan.d / 2;
  const lens = [0.62, 0.4, 0.52];
  [-3, 0, 3].forEach((dy, i) => {
    const len = plan.w * lens[i];
    out.push(L(k.lineOnTop([plan.x + plan.w * 0.16, mid + dy * (plan.d / 12)], [plan.x + plan.w * 0.16 + len, mid + dy * (plan.d / 12)], z + 0.8, P2), { tone: "lo", free: true }));
  });
  out.push(D(k.pointsAt([[plan.x + plan.w - 3, plan.y + 3, z + 0.8], [plan.x + plan.w - 3, plan.y + plan.d - 3, z + 0.8]], P2), { size: 0.45 }));
  return out.join("");
}
function dialPuck(P2, x, y, z, R, opts = {}) {
  const start = opts.start ?? -Math.PI * 0.75;
  const span = opts.span ?? Math.PI * 1.5;
  const ticks = opts.ticks ?? 40;
  const every = opts.every ?? 5;
  const top = z + 9;
  const out = [];
  out.push(S(k.cylinder(x, y, R + 2, z, 2.4, P2, 56, 0.4), { tone: "lo" }));
  out.push(S(k.cylinder(x, y, R, z + 2.4, 6.6, P2, 56, 0.6), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, y, R, z + 2.4, z + 5.4, 72, P2, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(x, y, R, z + 5.4, P2, 36), { tone: "faint" }));
  out.push(L(k.ring(x, y, R - 2, top, P2, 56), { tone: "lo" }));
  const minor = [];
  const major = [];
  for (let i = 0; i <= ticks; i++) {
    const a = start + i / ticks * span;
    const isMajor = i % every === 0;
    const r0 = R - 3.2;
    const r1 = r0 - (isMajor ? 3.6 : 2);
    const p0 = [x + Math.sin(a) * r0, y - Math.cos(a) * r0];
    const p1 = [x + Math.sin(a) * r1, y - Math.cos(a) * r1];
    (isMajor ? major : minor).push(k.lineOnTop(p0, p1, top, P2));
  }
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
  out.push(L(arcTop(P2, x, y, R - 4.4, top, start, start + span * (opts.redFrom ?? 0.3)), { tone: "mid" }));
  out.push(L(k.ring(x, y, 2.6, top, P2, 16), { tone: "lo" }));
  const needle = (frac) => {
    const a = start + clamp(frac, 0, 1) * span;
    const tip = [x + Math.sin(a) * (R - 5), y - Math.cos(a) * (R - 5)];
    const tail = [x - Math.sin(a) * 4.4, y + Math.cos(a) * 4.4];
    return `<path class="iso-line" data-tone="lit" data-free="" style="stroke-width:1.1px" d="${k.lineOnTop(tail, tip, top + 0.2, P2)}"/>` + D([k.iso([x, y, top + 0.3], P2)], { size: 1.5, tone: "hi" });
  };
  return { body: out.join(""), needle, top };
}
function arcTop(P2, x, y, r, z, a0, a1, steps = 24) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + (a1 - a0) * i / steps;
    pts.push([x + Math.sin(a) * r, y - Math.cos(a) * r]);
  }
  return k.onTop(pts, z, P2);
}
var DEFS = `<defs>` + [2, 3, 5, 8, 12].map((s) => `<filter id="sky-b${s}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${s}"/></filter>`).join("") + `</defs>`;
function glowSvg(cx, cy, rx, ry, strength, opts = {}) {
  const steps = opts.steps ?? 7;
  const color = opts.color ?? "var(--wx-sun)";
  const blur = opts.blur ?? 8;
  const out = [];
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    out.push(`<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rx * (1 - t))}" ry="${f1(ry * (1 - t))}"/>`);
  }
  return `<g filter="url(#sky-b${blur})" style="fill:${color};stroke:none;fill-opacity:calc(var(--wx-glow-alpha) * ${f2(strength * 2 / steps)})">${out.join("")}</g>`;
}

// src/weather/icons/overcast.ts
var W = 440;
var H = 440;
var LOOP = 120;
var DECK = { x: -102, y: -86, w: 204, d: 172, r: 10 };
var POLE_R = 5;
var LAMP_Z = 150;
var LAYERS = [
  { z: 46, h: 8, R: 86, ax: 1.06, ay: 0.95, seed: 7, amp: 13, ph: 0, pool: 0.05 },
  { z: 70, h: 8, R: 80, ax: 1.1, ay: 0.92, seed: 23, amp: -16, ph: 0.22, pool: 0.09 },
  { z: 94, h: 8, R: 74, ax: 1.08, ay: 0.94, seed: 41, amp: 12, ph: 0.5, pool: 0.15 },
  { z: 118, h: 8, R: 66, ax: 1.05, ay: 0.96, seed: 59, amp: -15, ph: 0.74, pool: 0.24 }
];
var LAMP_BULB_Z = 186;
var BULB_R = 17;
var P = k.fitProjection(
  [
    ...k.boxCorners(DECK, -16, 0),
    [0, 0, LAMP_BULB_Z + BULB_R + 8],
    [-92, 0, 50],
    [92, 0, 50],
    [0, 92, 50],
    [0, -92, 50]
  ],
  W,
  H,
  { pad: 54, azimuth: 40, elevation: 30 }
);
function cloudRadii(R, seed, n) {
  const rnd = rng(seed);
  const lobes = 6 + Math.floor(rnd() * 3);
  const circles = [{ cx: 0, cy: 0, rho: 0.74 * R }];
  for (let j = 0; j < lobes; j++) {
    const ang = (j + (rnd() - 0.5) * 0.45) / lobes * TAU2;
    const dist = (0.55 + rnd() * 0.12) * R;
    circles.push({ cx: Math.cos(ang) * dist, cy: Math.sin(ang) * dist, rho: (0.25 + rnd() * 0.15) * R });
  }
  const r = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU2;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    let best = 0;
    for (const c of circles) {
      const b = c.cx * ux + c.cy * uy;
      const disc2 = b * b - (c.cx * c.cx + c.cy * c.cy) + c.rho * c.rho;
      if (disc2 >= 0) best = Math.max(best, b + Math.sqrt(disc2));
    }
    r.push(best);
  }
  const minima = r.map((v, i) => v < r[(i + n - 1) % n] && v <= r[(i + 1) % n]);
  return { r, minima };
}
var N_RING = 132;
var SHAPES = LAYERS.map((l) => {
  const { r, minima } = cloudRadii(l.R, l.seed, N_RING);
  const base = r.map((v, i) => [Math.cos(i / N_RING * TAU2) * v * l.ax, Math.sin(i / N_RING * TAU2) * v * l.ay]);
  return { r, minima, base };
});
var rot = (p, c, s, sx = 1) => [(p[0] * c - p[1] * s) * sx, p[0] * s + p[1] * c];
function facingOf2(ring2) {
  let area = 0;
  for (let i = 0; i < ring2.length; i++) {
    const [ax, ay] = ring2[i];
    const [bx, by] = ring2[(i + 1) % ring2.length];
    area += ax * by - bx * ay;
  }
  const counter = area > 0;
  const [vx, vy] = k.towardViewer(P);
  return ring2.map(([ax, ay], i) => {
    const [bx, by] = ring2[(i + 1) % ring2.length];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const [nx, ny] = counter ? [dy / len, -dx / len] : [-dy / len, dx / len];
    return nx * vx + ny * vy > 1e-9;
  });
}
function feltSvg(ring2, minima, z, h, tone) {
  const paths = k.extrude(ring2, z, h, P, { convex: false });
  const facing = facingOf2(ring2);
  const n = ring2.length;
  const seams = [];
  for (let i = 0; i < n; i++) {
    if (minima[i] && facing[i] && facing[(i + n - 1) % n]) seams.push(k.rise([ring2[i][0], ring2[i][1]], z, z + h, P));
  }
  return `<g class="iso-solid" data-seamless=""><path class="iso-line" data-tone="${tone}" style="stroke-width:1.3px" d="${paths.fill}"/><path class="iso-fill" d="${paths.fill}"/>` + paths.shades.map((d, s) => d ? `<path class="iso-shade" data-shade="${s}" d="${d}"/>` : "").join("") + `<path class="iso-top" d="${paths.top}"/>` + L(paths.crease, { tone: "faint" }) + L(seams.join(""), { tone: "faint" }) + `</g>`;
}
var low = null;
var high = null;
var pools = null;
var SENSOR = [62, 54, 0];
var PUCK = [72, -16, 0];
var GAUGE = dialPuck(P, PUCK[0], PUCK[1], 0, 17, { start: -Math.PI * 0.72, span: Math.PI * 1.44, ticks: 36, every: 6, redFrom: 0.34 });
function lowArt() {
  const out = [];
  out.push(deckSvg(P, DECK, { h: 10, foot: 6 }));
  out.push(rulerSvg(P, -88, 6, 69, 0, 4, 5));
  out.push(labelPlateSvg(P, { x: 22, y: 66, w: 44, d: 13, r: 2 }, 0));
  out.push(S(k.cylinder(SENSOR[0], SENSOR[1], 8.5, 0, 2.6, P, 28, 0.4), { tone: "lo" }));
  out.push(S(k.cylinder(SENSOR[0], SENSOR[1], 6.6, 2.6, 2, P, 28), { tone: "mid" }));
  out.push(L(k.sideArc(SENSOR[0], SENSOR[1], 6.6, 3.6, P, 18), { tone: "faint" }));
  out.push(S(G.sphereOf([SENSOR[0], SENSOR[1], 4.6], 5.4, P), { tone: "hi" }));
  out.push(L(k.ring(SENSOR[0], SENSOR[1], 7.7, 2.6, P, 28), { tone: "lo" }));
  const toward = (from, to) => {
    const d = Math.hypot(to[0] - from[0], to[1] - from[1]);
    return [(to[0] - from[0]) / d, (to[1] - from[1]) / d];
  };
  const sdir = toward([SENSOR[0], SENSOR[1]], [PUCK[0] - 20, PUCK[1] + 8]);
  const pdir = toward([PUCK[0], PUCK[1]], [SENSOR[0] - 10, SENSOR[1] - 10]);
  const boot0 = [SENSOR[0] + sdir[0] * 6.3, SENSOR[1] + sdir[1] * 6.3, 3.6];
  const boot1 = [SENSOR[0] + sdir[0] * 11.8, SENSOR[1] + sdir[1] * 11.8, 3.6];
  out.push(S(G.disc(0, 5.5, 2.3, G.frameAlong(boot0, [sdir[0], sdir[1], 0]), P), { tone: "mid" }));
  const g0 = [PUCK[0] + pdir[0] * 16.6, PUCK[1] + pdir[1] * 16.6, 5.2];
  const g1 = [PUCK[0] + pdir[0] * 21.4, PUCK[1] + pdir[1] * 21.4, 5.2];
  out.push(S(G.disc(0, 4.8, 2.6, G.frameAlong(g0, [pdir[0], pdir[1], 0]), P), { tone: "mid" }));
  const cab = [];
  for (let i = 0; i <= 32; i++) {
    const t = i / 32;
    const ctl = [(boot1[0] + g1[0]) / 2 - 14, (boot1[1] + g1[1]) / 2 + 4];
    const x = (1 - t) * (1 - t) * boot1[0] + 2 * (1 - t) * t * ctl[0] + t * t * g1[0];
    const y = (1 - t) * (1 - t) * boot1[1] + 2 * (1 - t) * t * ctl[1] + t * t * g1[1];
    const lift = Math.pow(1 - Math.min(1, t * 5), 2) * 2.9 + Math.pow(Math.max(0, (t - 0.8) / 0.2), 2) * 4.5;
    cab.push([x, y, 0.8 + lift]);
  }
  const cabD = k.pathOf(cab.map((q) => k.iso(q, P)));
  out.push(`<path class="iso-line" data-tone="hi" style="stroke-width:2.2px;stroke-opacity:.95" d="${cabD}"/>`);
  out.push(`<path class="iso-line" style="stroke-width:1px;stroke:var(--anatomy-paper)" d="${cabD}"/>`);
  const mid = cab[16];
  out.push(S(k.slabOf({ x: mid[0] - 2.4, y: mid[1] - 3.4, w: 4.8, d: 6.8, r: 1.4 }, 0, 1.6, P, 3), { tone: "mid", crease: "none" }));
  out.push(GAUGE.body);
  out.push(L(k.ring(PUCK[0], PUCK[1], 24, 0, P, 56), { tone: "faint" }));
  const mp = [0, 1, 2, 3].map((i) => [PUCK[0] + Math.cos(i * 1.5708 + 0.785) * 22, PUCK[1] + Math.sin(i * 1.5708 + 0.785) * 22]);
  out.push(D(mp.map((p) => k.iso([p[0], p[1], 0], P)), { size: 0.5 }));
  const BOX = { x: 52, y: -74, w: 38, d: 28, r: 3 };
  out.push(S(k.slabOf(BOX, 0, 13, P, 4, 0.6), { tone: "mid" }));
  out.push(L(k.sideSeam(BOX, 6.5, P, 4), { tone: "faint" }));
  out.push(L(k.planOutline(k.insetPlan(BOX, 2.4), 13, P, 4), { tone: "faint" }));
  const KN = [BOX.x + 13, BOX.y + 14];
  out.push(S(k.cylinder(KN[0], KN[1], 10.2, 13, 0.7, P, 32), { tone: "lo", crease: "none" }));
  const dt = k.radialTicks(KN[0], KN[1], 10, 12, 3, 13.7, [2, 3.4], P, -Math.PI * 0.75, Math.PI * 1.5);
  out.push(L(dt.minor, { tone: "lo" }), L(dt.major, { tone: "mid" }));
  out.push(S(k.cylinder(KN[0], KN[1], 5.2, 13.7, 3.6, P, 28, 0.4), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(KN[0], KN[1], 5.2, 13.7, 17.3, 28, P, 0.3), { tone: "lo" }));
  out.push(L(k.lineOnTop(KN, [KN[0] + Math.sin(-1.05) * 4.6, KN[1] - Math.cos(-1.05) * 4.6], 17.3, P), { tone: "hi", free: true }));
  out.push(S(k.cylinder(BOX.x + 30, BOX.y + 7.5, 2.2, 13, 1, P, 14), { tone: "mid", lit: true }));
  [0, 1, 2].forEach((i) => out.push(L(k.planOutline({ x: BOX.x + 25, y: BOX.y + 14 + i * 3.6, w: 10, d: 1.6, r: 0.8 }, 13, P, 3), { tone: "lo" })));
  out.push(screwsOn(P, BOX, 4.2, 13, 1.7));
  const gb = [BOX.x, BOX.y + 14, 3.4];
  out.push(S(G.disc(-3.6, 0.4, 2.8, G.frameAlong(gb, [-1, 0, 0]), P), { tone: "mid" }));
  const flange = [Math.cos(-0.45) * 24, Math.sin(-0.45) * 24];
  out.push(S(G.disc(-0.6, 3.6, 2.9, G.frameAlong([flange[0], flange[1], 2.2], [Math.cos(-0.45), Math.sin(-0.45), 0]), P), { tone: "mid" }));
  const feed = [];
  const f0 = [gb[0] - 3.8, gb[1]];
  const f12 = [flange[0] + Math.cos(-0.45) * 4, flange[1] + Math.sin(-0.45) * 4];
  for (let i = 0; i <= 30; i++) {
    const t = i / 30;
    const x = (1 - t) * (1 - t) * f0[0] + 2 * (1 - t) * t * (f0[0] - 16) + t * t * f12[0];
    const y = (1 - t) * (1 - t) * f0[1] + 2 * (1 - t) * t * (f0[1] + 10) + t * t * f12[1];
    feed.push([x, y, 3.4 - 1.2 * t]);
  }
  const feedD = k.pathOf(feed.map((p) => k.iso(p, P)));
  out.push(`<path class="iso-line" data-tone="hi" style="stroke-width:2.2px;stroke-opacity:.95" d="${feedD}"/>`);
  out.push(`<path class="iso-line" style="stroke-width:1px;stroke:var(--anatomy-paper)" d="${feedD}"/>`);
  const F0 = up(0);
  out.push(S(G.disc(0, 4, 24, F0, P, { bevel: 0.8 }), { tone: "hi", crease: "lo" }));
  out.push(D(G.dotsOf(F0, 4, 19, 6, P, { all: true }), { size: 0.55 }));
  out.push(S(G.disc(4, 14, 14, F0, P, { bevel: 0.6 }), { tone: "mid", inner: L(G.arcOf(F0, 9, 14, P), { tone: "faint" }) }));
  out.push(S(G.disc(14, 46, POLE_R, F0, P, { smooth: false }), { tone: "mid", crease: "none" }));
  return out.join("");
}
function poolSvg(layer) {
  const z = layer.z + layer.h + 0.2;
  const steps = 8;
  const out = [];
  for (let i = 0; i < steps; i++) {
    const r = layer.R * 0.74 * (1 - i / steps);
    out.push(`<path d="${k.onTop(circleOf2(r), z, P, true)}"/>`);
  }
  return `<g filter="url(#sky-b3)" style="fill:var(--wx-sun);stroke:none;fill-opacity:calc(var(--wx-glow-alpha) * ${(layer.pool * 2.1 / steps).toFixed(3)})">${out.join("")}</g>`;
}
function circleOf2(r) {
  return Array.from({ length: 36 }, (_, i) => [Math.cos(i / 36 * TAU2) * r, Math.sin(i / 36 * TAU2) * r]);
}
function highArt() {
  const out = [];
  const F0 = up(0);
  out.push(S(G.disc(126, LAMP_Z, POLE_R, F0, P, { smooth: false }), { tone: "mid", crease: "none" }));
  out.push(S(G.disc(134, 141, 8, F0, P, { bevel: 0.6 }), { tone: "hi", crease: "lo" }));
  out.push(L(G.arcOf(F0, 137.5, 8, P), { tone: "faint" }));
  out.push(S(G.disc(0, 5, 1.8, G.frameAlong([8, 0, 137.5], [1, 0, 0]), P), { tone: "mid" }));
  out.push(S(G.disc(5, 8, 3.4, G.frameAlong([8, 0, 137.5], [1, 0, 0]), P), { tone: "hi" }));
  out.push(S(G.disc(LAMP_Z, LAMP_Z + 4, 11.5, F0, P, { bevel: 0.6 }), { tone: "hi", crease: "lo" }));
  out.push(S(G.disc(LAMP_Z + 4, LAMP_Z + 16, 10, F0, P, { bevel: 0.5 }), { tone: "mid", inner: L(G.arcOf(F0, LAMP_Z + 10, 10, P), { tone: "faint" }) }));
  out.push(k.fadedSvg(G.ribsOf(F0, LAMP_Z + 4.6, LAMP_Z + 15.4, 10, 22, P, { fade: [0.05, 0.5] }), { tone: "lo" }));
  out.push(S(G.disc(LAMP_Z + 16, LAMP_Z + 20, 11.5, F0, P, { bevel: 0.6 }), { tone: "hi", crease: "lo" }));
  out.push(D(G.dotsOf(F0, LAMP_Z + 20, 8.2, 6, P, { all: true }), { size: 0.45 }));
  out.push(S(G.disc(LAMP_Z + 20, LAMP_Z + 30, 6.4, F0, P, { smooth: false }), { tone: "mid", crease: "none" }));
  for (const z of [LAMP_Z + 22.5, LAMP_Z + 25, LAMP_Z + 27.5]) out.push(L(G.arcOf(F0, z, 6.4, P), { tone: "faint" }));
  return out.join("");
}
function lampArt() {
  const out = [];
  const bulbAt = [0, 0, LAMP_BULB_Z];
  const c = k.iso(bulbAt, P);
  const topZ = LAYERS[3].z + LAYERS[3].h + 0.5;
  out.push(`<path d="${frustumD(P, 0, 0, LAMP_BULB_Z - 4, 9, topZ, 50)}" filter="url(#sky-b3)" style="fill:var(--wx-sun);stroke:none;fill-opacity:calc(var(--wx-glow-alpha) * .2)"/>`);
  out.push(glowSvg(c[0], c[1], 58, 54, 0.3, { steps: 8, blur: 8 }));
  out.push(S(G.sphereOf(bulbAt, BULB_R, P), { tone: "hi", lit: true }));
  const fz = LAMP_BULB_Z - 2;
  const pts = [];
  for (let i = 0; i <= 48; i++) {
    const t = i / 48;
    pts.push([(t - 0.5) * 11, 0, fz + Math.sin(t * Math.PI * 7) * 1.8 + Math.sin(t * Math.PI) * 2.6]);
  }
  out.push(`<path class="iso-line" data-free="" style="stroke:var(--wx-sun);stroke-width:1.2px;stroke-opacity:.8" d="${k.pathOf(pts.map((p) => k.iso(p, P)))}"/>`);
  const stemF = up(LAMP_BULB_Z - 16);
  out.push(S(G.disc(0, 7, 3.2, stemF, P), { tone: "mid", crease: "lo" }));
  out.push(L(G.arcOf(stemF, 3.5, 3.2, P), { tone: "faint" }));
  out.push(L(k.segment([-5.5, 0, LAMP_BULB_Z - 9], [-5.5, 0, fz + 0.2], P), { tone: "mid" }), L(k.segment([5.5, 0, LAMP_BULB_Z - 9], [5.5, 0, fz + 0.2], P), { tone: "mid" }));
  out.push(L(k.segment([-5.5, 0, LAMP_BULB_Z - 9], [0, 0, LAMP_BULB_Z - 9.5], P), { tone: "mid" }), L(k.segment([5.5, 0, LAMP_BULB_Z - 9], [0, 0, LAMP_BULB_Z - 9.5], P), { tone: "mid" }));
  out.push(D([k.iso([-5.5, 0, fz + 0.2], P), k.iso([5.5, 0, fz + 0.2], P)], { size: 0.9, tone: "hi" }));
  return out.join("");
}
function layerSvg(i, phase, swing) {
  const l = LAYERS[i];
  const sh = SHAPES[i];
  const ang = l.amp * swing * Math.PI / 180 * Math.sin(TAU2 * (phase + l.ph));
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const ring2 = sh.base.map((p) => rot(p, c, s));
  const top = l.z + l.h;
  const out = [];
  out.push(feltSvg(ring2, sh.minima, l.z, l.h, "hi"));
  out.push(pools[i]);
  const stitch = sh.base.map((p) => rot([p[0] * 0.9, p[1] * 0.9], c, s));
  out.push(L(k.onTop(stitch, top + 0.05, P, true), { tone: "lo", dotted: true }));
  const rnd = rng(l.seed * 13 + 5);
  const fibres = [];
  for (let n = 0; n < 34; n++) {
    const a = rnd() * TAU2;
    const idx = Math.floor(a / TAU2 * N_RING) % N_RING;
    const rad = (0.22 + rnd() * 0.6) * sh.r[idx];
    const p = rot([Math.cos(a) * rad * l.ax, Math.sin(a) * rad * l.ay], c, s);
    fibres.push([p[0], p[1], top]);
  }
  out.push(D(fibres.map((p) => k.iso(p, P)), { size: 0.42, tone: "lo" }));
  for (let g = 0; g < 3; g++) {
    const a = (g + 0.35 * (i % 2)) / 3 * TAU2 + 0.5 + i;
    const idx = Math.floor(a / TAU2 * N_RING) % N_RING;
    const rad = 0.76 * sh.r[idx];
    const p = rot([Math.cos(a) * rad * l.ax, Math.sin(a) * rad * l.ay], c, s);
    out.push(S(k.cylinder(p[0], p[1], 3.5, top, 0.9, P, 16), { tone: "mid", crease: "none" }));
    out.push(L(k.ring(p[0], p[1], 1.7, top + 0.9, P, 12), { tone: "lo" }));
  }
  const F = up(top);
  out.push(S(G.disc(0, 2.4, 12.5, F, P, { bevel: 0.5 }), { tone: "hi", crease: "lo" }));
  out.push(k.fadedSvg(G.ribsOf(F, 0.4, 2, 12.5, 18, P, { phase: ang * 3, fade: [0.05, 0.5] }), { tone: "lo" }));
  out.push(D(G.dotsOf(F, 2.4, 9.6, 6, P, { phase: ang * 3, all: true }), { size: 0.4 }));
  if (i < LAYERS.length - 1) {
    out.push(S(G.disc(2.4, LAYERS[i + 1].z - top, 8, F, P, { smooth: false }), { tone: "mid", crease: "none" }));
  }
  return out.join("");
}
function render({ frame, loop, intensity }) {
  if (!low) {
    low = lowArt();
    high = highArt();
  }
  if (!pools) pools = LAYERS.map((l) => poolSvg(l));
  const phase = frame / loop;
  const swing = 0.6 + 0.8 * intensity;
  const layers = [];
  for (let i = 0; i < LAYERS.length; i++) layers.push(layerSvg(i, phase, swing));
  const lux = 0.32 - 0.24 * intensity + 0.045 * (0.6 + 0.8 * intensity) * Math.cos(TAU2 * (phase + 0.15)) + 0.02 * Math.sin(TAU2 * 2 * phase);
  return DEFS + low + layers.join("") + GAUGE.needle(lux) + high + lampArt();
}
var overcast = {
  id: "overcast",
  label: "Overcast",
  object: "Felt-baffle diffusion rig: a dim lamp shining through drifting stratus layers onto a light meter",
  width: W,
  height: H,
  loop: LOOP,
  render
};

// <stdin>
var icon = overcast;
export {
  icon
};
