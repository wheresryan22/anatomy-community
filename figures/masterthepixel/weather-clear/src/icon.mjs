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
  const smooth2 = asked === "auto" ? softOf(meridian) : asked;
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
  const L2 = G.lightOf(P2);
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
        const c = blendedFill(dot(unit(loop.normals[i]), L2), Boolean(opts.lit));
        blended.push(`<path d="${d}" style="fill:${c};stroke:${c};stroke-width:.5;stroke-linejoin:round"/>`);
      } else buckets[Math.min(3, G.bandOf(dot(unit(loop.normals[i]), L2)))].push(d);
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
  const face = Math.min(3, G.bandOf(dot(unit(faceNormal), L2)));
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
function plateSolid(P2, poly, y0, y1, at2, opts = {}) {
  const n = poly.length;
  const w = (p, y) => [p[0] + at2[0], y, p[1] + at2[1]];
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
  const S32 = (paths, style = {}) => k.solidSvg(paths, style);
  const L2 = (d, style = {}) => k.lineSvg(d, style);
  const D2 = (points, style = {}) => k.dotsSvg(points, style);
  const frame = [];
  for (const sx of [-1, 1]) {
    const px = sx * POST_X;
    const F0 = G.frameAlong([px, GATE_Y, 0], [0, 0, 1]);
    frame.push(S32(k.slabOf({ x: px - 7.5, y: GATE_Y - 7.5, w: 15, d: 15, r: 2.2 }, 0, 2.6, P2, 3, 0.4), { tone: "lo", crease: "none" }));
    const bolts = [[-4.8, -4.8], [4.8, -4.8], [-4.8, 4.8], [4.8, 4.8]].map(([dx, dy]) => [px + dx, GATE_Y + dy]);
    frame.push(D2(bolts.map(([x, y]) => k.iso([x, y, 2.6], P2)), { size: 0.45 }));
    frame.push(S32(G.disc(2.6, zRail + 2, 3.1, F0, P2, { smooth: false }), { tone: "mid", crease: "none" }));
    frame.push(S32(G.disc(86, 91, 4.3, F0, P2, { bevel: 0.4 }), { tone: "hi", crease: "lo" }));
    frame.push(L2(G.arcOf(F0, 40, 3.1, P2), { tone: "faint" }), L2(G.arcOf(F0, 140, 3.1, P2), { tone: "faint" }), L2(G.arcOf(F0, 190, 3.1, P2), { tone: "faint" }));
    frame.push(S32(k.slabOf({ x: px - 6, y: GATE_Y - 5, w: 12, d: 10, r: 1.8 }, zRail - 3.6, 7.2, P2, 3, 0.4), { tone: "hi", crease: "lo" }));
    frame.push(D2([k.iso([px, GATE_Y + 5, zRail + 0.4], P2)], { size: 0.5 }));
  }
  const RF = G.frameAlong([-POST_X, GATE_Y, zRail], [1, 0, 0]);
  frame.push(S32(G.disc(6, 2 * POST_X - 6, 1.9, RF, P2, { smooth: false }), { tone: "hi", crease: "none" }));
  for (const sx of [-1, 1]) {
    const gx = sx * (POST_X - 11);
    const F1 = G.frameAlong([gx, GATE_Y, zRail], [1, 0, 0]);
    frame.push(S32(G.disc(-1.6, 1.6, 2.9, F1, P2, { bevel: 0.3 }), { tone: "mid", crease: "lo" }));
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
    mv.push(S32(G.disc(0, rodTop - rodBottom, 1.2, F, P2, { smooth: false }), { tone: "mid", crease: "none" }));
  }
  mv.push(S32(k.slabOf({ x: -hx - 5, y: GATE_Y - 4, w: 2 * hx + 10, d: CLOUD_Y1 - GATE_Y + 4, r: 2 }, trolleyBottom, 7.2, P2, 3, 0.5), { tone: "hi", crease: "lo" }));
  mv.push(D2([[-hx - 1.6, GATE_Y - 0], [hx + 1.6, GATE_Y - 0]].map(([x, y]) => k.iso([x, y + 6, trolleyBottom + 7.2], P2)), { size: 0.5 }));
  const stitched = poly.map(([x, z]) => {
    const dx = x - S.centre[0];
    const dz = z - S.centre[1];
    const l = Math.hypot(dx, dz) || 1;
    const inset = kind === "cloud" ? 3.6 : 2.4;
    return [S.centre[0] + dx * (1 - inset / l), S.centre[1] + dz * (1 - inset / l)];
  });
  const front = (pts) => pts.map(([x, z]) => k.iso([x, CLOUD_Y1, z + cloudAt], P2));
  const inner = L2(k.pathOf(front(stitched), true), { tone: "lo", dashed: true }) + pads.map((p) => D2([k.iso([p.x, CLOUD_Y1, cloudAt + p.top - 2], P2)], { size: 0.55 })).join("") + D2(
    [-0.6, -0.2, 0.2, 0.6].map((f) => k.iso([f * (S.block.x1 - S.block.x0) * 0.8, CLOUD_Y1, cloudAt + 3.6], P2)),
    { size: 0.5 }
  );
  mv.push(plateSolid(P2, poly, CLOUD_Y0, CLOUD_Y1, [0, cloudAt], { tone: "hi", inner, faceTop: true }));
  for (const p of pads) {
    mv.push(S32(k.slabOf({ x: p.x - 3, y: CLOUD_Y0, w: 6, d: CLOUD_Y1 - CLOUD_Y0, r: 1 }, cloudAt + p.top - 0.2, 1.8, P2, 2, 0), { tone: "mid", crease: "lo" }));
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
var A_IN = 98;
var A_OUT = 110;
var A_Y = 6;
var SUN_R = 24;
var BALL_R = 22;
var CARD_R = 35.2;
var CR_IN = 36.5;
var CR_OUT = 43;
var SWING = 30 * RAD;
var RAY_Y = 1.2;
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
var onArch = (r, a, y) => [r * Math.cos(a), y, ZC + r * Math.sin(a)];
var polyline = (pts) => k.pathOf(pts.map(at));
var SUN_TB = { x: 82, y: -35, w: 34, d: 13, r: 2 };
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
function arch() {
  const out = [];
  for (const sx of [-1, 1]) {
    const px = sx * RA;
    out.push(S3(k.slabOf({ x: px - 13, y: -13, w: 26, d: 26, r: 3 }, 0, 3, P, 3, 0.5), { tone: "lo", crease: "none" }));
    const bolts = [[-9, -9], [9, -9], [-9, 9], [9, 9]].map(([dx, dy]) => [px + dx, dy]);
    for (const [x, y] of bolts) out.push(L(k.ring(x, y, 1.8, 3, P, 12), { tone: "lo" }));
    out.push(D(bolts.map(([x, y]) => at([x, y, 3])), { size: 0.5 }));
    const post = { x: px - 9, y: -9, w: 18, d: 18, r: 2.5 };
    out.push(
      S3(k.slabOf(post, 3, ZC - 3, P, 3, 0.6), {
        tone: "mid",
        inner: L(k.sideSeam(post, 20, P, 3), { tone: "faint" }) + L(k.sideSeam(post, 36, P, 3), { tone: "faint" })
      })
    );
    out.push(S3(k.slabOf({ x: px - 10.5, y: -10.5, w: 21, d: 21, r: 3 }, ZC - 4, 4, P, 3, 0.5), { tone: "hi", crease: "lo" }));
  }
  const ticks = (frontS) => {
    const segs = (list) => list.map(([a, b]) => k.pathOf([at(a), at(b)])).join("");
    const mi = [];
    const ma = [];
    for (let deg = 6; deg <= 174; deg += 3) {
      const a = deg * RAD;
      const isMajor = deg % 15 === 0;
      (isMajor ? ma : mi).push([onArch(A_IN, a, frontS), onArch(A_IN + (isMajor ? 4.4 : 2.4), a, frontS)]);
    }
    const groove = [];
    for (let deg = 0; deg <= 180; deg += 3) groove.push(onArch(A_OUT - 1.8, deg * RAD, frontS));
    const dots = [];
    for (let deg = 15; deg <= 165; deg += 15) dots.push(at(onArch(A_OUT - 4.8, deg * RAD, frontS)));
    return L(segs(mi), { tone: "lo" }) + L(segs(ma), { tone: "mid" }) + L(polyline(groove), { tone: "faint" }) + D(dots, { size: 0.45 });
  };
  out.push(arcSolid(P, AF, { a0: 0, a1: Math.PI, rIn: A_IN, rOut: A_OUT, s0: -A_Y, s1: A_Y, tone: "hi", inner: ticks }));
  return out.join("");
}
function recorderBack() {
  const out = [];
  out.push(S3(k.slabOf({ x: -32, y: -17, w: 64, d: 34, r: 4 }, 0, 2.2, P, 3, 0.5), { tone: "lo", crease: "none" }));
  const sc = [[-26, -12], [26, -12], [-26, 12], [26, 12]];
  for (const [x, y] of sc) out.push(L(k.ring(x, y, 1.7, 2.2, P, 12), { tone: "lo" }));
  out.push(D(sc.map(([x, y]) => at([x, y, 2.2])), { size: 0.5 }));
  const block = { x: -21, y: -10.5, w: 42, d: 21, r: 3 };
  out.push(S3(k.slabOf(block, 2.2, ZC - CR_OUT - 2.2, P, 3, 0.5), { tone: "mid", crease: "lo" }));
  out.push(D([[-13, 3], [13, 3]].map(([x, z]) => at([x, block.y + block.d, z + 2.2])), { size: 0.6 }));
  const cradleInner = () => {
    const seam = [];
    for (let d = 180; d <= 360; d += 4) seam.push(onArch(CR_OUT - 1.8, d * RAD, 9));
    const dots = [190, 270, 350].map((d) => at(onArch((CR_IN + CR_OUT) / 2, d * RAD, 9)));
    return L(polyline(seam), { tone: "faint" }) + D(dots, { size: 0.5 });
  };
  out.push(arcSolid(P, AF, { a0: Math.PI, a1: TAU2, rIn: CR_IN, rOut: CR_OUT, s0: -9, s1: 9, tone: "mid", inner: cradleInner }));
  const cardMarks = () => {
    const mi = [];
    const ma = [];
    for (let deg = 205; deg <= 335; deg += 5) {
      const a = deg * RAD;
      const major = deg % 15 === 0;
      const y0 = 7;
      const y1 = major ? 2.4 : 4.4;
      (major ? ma : mi).push([onArch(CARD_R, a, y0), onArch(CARD_R, a, y1)]);
    }
    const seg = (list) => list.map(([a, b]) => k.pathOf([at(a), at(b)])).join("");
    return L(seg(mi), { tone: "lo" }) + L(seg(ma), { tone: "mid" });
  };
  out.push(arcSolid(P, AF, { a0: 200 * RAD, a1: 340 * RAD, rIn: CARD_R, rOut: CR_IN, s0: -7, s1: 7, tone: "hi", inner: cardMarks }));
  for (const sx of [-1, 1]) {
    const bx = sx * 40;
    out.push(S3(k.slabOf({ x: bx - 5.5, y: -6.5, w: 11, d: 13, r: 1.6 }, ZC, 6, P, 3, 0.5), { tone: "hi", crease: "lo" }));
    out.push(D([at([bx, 6.5, ZC + 3]), at([bx, 0, ZC + 6])], { size: 0.5 }));
  }
  return out.join("");
}
var RING_F = G.frameOf(C, Z, [1, 0, 0], [0, 1, 0]);
var ringHalf = (front) => arcSolid(P, RING_F, {
  a0: front ? (AZ - 90) * RAD : (AZ + 90) * RAD,
  a1: front ? (AZ + 90) * RAD : (AZ + 270) * RAD,
  rIn: 24.5,
  rOut: 29.5,
  s0: 0.6,
  s1: 5.6,
  tone: "hi",
  inner: (s) => {
    const pts = [];
    const a0 = front ? AZ - 90 : AZ + 90;
    for (let d = 0; d <= 180; d += 6) pts.push(G.pointOf(RING_F, s, 27.1, (a0 + d) * RAD));
    return L(polyline(pts), { tone: "faint" });
  }
});
function ringArms() {
  const out = [];
  for (const sx of [-1, 1]) {
    const F = G.frameAlong([sx * 29, 0, ZC + 3.1], [sx, 0, 0]);
    out.push(S3(G.disc(0, 40 - 5.5 - 29, 1.7, F, P, { smooth: false }), { tone: "mid", crease: "none" }));
  }
  for (const a of [AZ - 38, AZ + 38]) {
    const dir = [Math.cos(a * RAD), Math.sin(a * RAD), 0];
    const F = G.frameAlong([dir[0] * 29.5, dir[1] * 29.5, ZC + 3.1], dir);
    out.push(S3(G.disc(0, 3.2, 2.6, F, P, { bevel: 0.4 }), { tone: "hi", crease: "lo" }));
    out.push(L(G.arcOf(F, 1.6, 2.6, P), { tone: "faint" }));
  }
  return out.join("");
}
var sunAngle = (f, loop) => Math.PI / 2 + SWING * Math.sin(f / loop * TAU2 + 0.9);
var sunAt = (a) => [RA * Math.cos(a), 0, ZC + RA * Math.sin(a)];
var cache = null;
var gates = /* @__PURE__ */ new Map();
function sunLayers(frame, loop, intensity, cover, burn) {
  const a = sunAngle(frame, loop);
  const S = sunAt(a);
  const c = at(S);
  const g = 0.85 + 0.3 * intensity;
  const vis = 1 - cover;
  const lamp = 0.35 + 0.65 * vis;
  const R = SUN_R * KK;
  const ga = (m) => `fill:var(--wx-sun);fill-opacity:calc(var(--wx-glow-alpha) * ${(m * lamp).toFixed(3)})`;
  const glow = `<g style="filter:blur(${f1(R * 0.34)}px)">` + circ(c[0], c[1], R * 3.1 * g, ga(0.38)) + circ(c[0], c[1], R * 2.3 * g, ga(0.5)) + circ(c[0], c[1], R * 1.7 * g, ga(0.7)) + circ(c[0], c[1], R * 1.3 * g, ga(0.9)) + `</g>`;
  const rot = frame / loop * (Math.PI / 4);
  const rays = [];
  for (let i = 0; i < 16; i++) {
    const al = rot + i * TAU2 / 16;
    const long = i % 2 === 0;
    const tipR = (long ? 54 : 42) * g;
    const base = 31;
    const hw = long ? 6.2 : 5;
    const ux = Math.cos(al);
    const uz = Math.sin(al);
    const tx = -uz;
    const tz = ux;
    const pts = [
      add(add(mul(R_U, base * ux), mul(R_V, base * uz)), add(mul(R_U, tx * hw), mul(R_V, tz * hw))),
      add(mul(R_U, tipR * ux), mul(R_V, tipR * uz)),
      add(add(mul(R_U, base * ux), mul(R_V, base * uz)), add(mul(R_U, -tx * hw), mul(R_V, -tz * hw)))
    ].map((q) => add(add(S, mul(VIEW, RAY_Y)), q));
    rays.push(`<path d="${k.pathOf(pts.map(at), true)}" style="fill:var(--wx-sun);fill-opacity:${(0.55 + 0.4 * lamp).toFixed(2)};stroke:var(--wx-sun-deep);stroke-width:.7;stroke-linejoin:round"/>`);
  }
  const SF = G.frameAlong(S, VIEW);
  const ringInner = (s) => {
    const pts = [];
    for (let d2 = 0; d2 <= 360; d2 += 6) pts.push(G.pointOf(SF, s, 31.4, d2 * RAD));
    const dots = [];
    for (let d2 = 0; d2 < 360; d2 += 30) dots.push(at(G.pointOf(SF, s, 29.2, d2 * RAD)));
    return L(polyline(pts), { tone: "faint" }) + D(dots, { size: 0.5 });
  };
  const ring2 = arcSolid(P, SF, { a0: 0, a1: TAU2, rIn: 22, rOut: 33.5, s0: -3, s1: 3, tone: "hi", inner: ringInner });
  const collarInner = (s, a0, a1) => {
    const am = (a0 + a1) / 2;
    return D([at(onArch(A_OUT + 0.9, am, s)), at(onArch(A_IN - 0.9, am, s))], { size: 0.5 });
  };
  const collars = [-1, 1].map((sg) => {
    const a0 = a + (sg < 0 ? -29 : 22.5) * RAD;
    const a1 = a + (sg < 0 ? -22.5 : 29) * RAD;
    return arcSolid(P, AF, { a0, a1, rIn: A_IN - 1.8, rOut: A_OUT + 1.8, s0: -7.5, s1: 7.5, tone: "hi", inner: (s) => collarInner(s, a0, a1) });
  }).join("");
  const sphere = circ(c[0], c[1], R, "fill:var(--wx-sun-deep)") + `<g style="filter:blur(${f1(R * 0.07)}px)">` + circ(c[0] - R * 0.1, c[1] - R * 0.12, R * 0.88, "fill:var(--wx-sun)") + circ(c[0] - R * 0.2, c[1] - R * 0.25, R * 0.55, `fill:color-mix(in srgb, var(--wx-sun) 55%, #fff)`) + circ(c[0] - R * 0.3, c[1] - R * 0.36, R * 0.24, `fill:color-mix(in srgb, var(--wx-sun) 18%, #fff)`) + `</g>` + circ(c[0], c[1], R, "fill:none;stroke:var(--wx-sun-deep);stroke-width:.9");
  const d = G.unit3(G.sub3(C, S));
  const perp = [-d[2], 0, d[0]];
  const F3 = [C[0] + d[0] * CARD_R, 0, C[2] + d[2] * CARD_R];
  const p3 = (o, along, side, from = o) => [from[0] + d[0] * along + perp[0] * side, 0, from[2] + d[2] * along + perp[2] * side];
  const sA = lamp * (0.3 + 0.7 * intensity);
  const cone1 = [p3(S, 0, SUN_R * 0.75), p3(C, -BALL_R * 0.9, BALL_R * 0.95), p3(C, -BALL_R * 0.9, -BALL_R * 0.95), p3(S, 0, -SUN_R * 0.75)];
  const cone2 = [p3(C, BALL_R * 0.55, BALL_R * 0.82), F3, p3(C, BALL_R * 0.55, -BALL_R * 0.82)];
  const beamStyle = (m) => `fill:var(--wx-sun);fill-opacity:${(m * sA).toFixed(3)};stroke:none`;
  const strands = [];
  for (const o of [-0.8, -0.4, 0, 0.4, 0.8]) {
    const sw = SUN_R * 0.7 * o;
    const bw = BALL_R * 0.95 * o;
    const rim = Math.sqrt(Math.max(0, 1 - (0.95 * o) ** 2)) * BALL_R;
    const e = p3(C, -rim, bw);
    const x = p3(C, rim * 0.8, bw * 0.55);
    strands.push(polyline([p3(S, 0, sw), e]), polyline([e, x]), polyline([x, F3]));
  }
  const beam = `<path d="${k.pathOf(cone1.map(at), true)}" style="${beamStyle(0.22)}"/><path d="${k.pathOf(cone2.map(at), true)}" style="${beamStyle(0.34)}"/><path d="${strands.join("")}" style="fill:none;stroke:var(--wx-sun);stroke-width:.8;stroke-linecap:round;stroke-opacity:${(0.8 * sA).toFixed(3)}"/>`;
  const fa = a + Math.PI;
  const tracePts = (a0, a1) => {
    const pts = [];
    const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / (3 * RAD)));
    for (let i = 0; i <= n; i++) pts.push(onArch(CARD_R, a0 + (a1 - a0) * i / n, 0));
    return pts;
  };
  const lo = Math.PI + Math.PI / 2 - SWING - 3 * RAD;
  const hi = Math.PI + Math.PI / 2 + SWING + 3 * RAD;
  const fc = at(F3);
  const track = `<path d="${polyline(tracePts(lo, hi))}" style="fill:none;stroke:var(--wx-sun-deep);stroke-width:2.6;stroke-linecap:round;stroke-opacity:${burn === null ? ".5" : ".14"}"/>`;
  const scorch = burn === null ? `<path d="${polyline(tracePts(lo + 0.02, hi - 0.02))}" style="fill:none;stroke:var(--anatomy-hi);stroke-width:.7;stroke-linecap:round;stroke-opacity:.35"/>` : `<path d="${burn}" style="fill:none;stroke:var(--wx-sun-deep);stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round;stroke-opacity:.62"/>`;
  const trace = track + scorch + `<path d="${polyline(tracePts(fa - 0.5, fa + 0.5))}" style="fill:none;stroke:var(--wx-sun);stroke-width:2.8;stroke-linecap:round;stroke-opacity:${(0.8 * vis).toFixed(3)}"/>`;
  const sr = (m) => KK * m * (0.55 + 0.45 * vis);
  const spot = trace + `<g style="filter:blur(2.2px)">` + circ(fc[0], fc[1], sr(10), `fill:var(--wx-sun);fill-opacity:calc(var(--wx-glow-alpha) * ${(0.7 * vis).toFixed(3)})`) + circ(fc[0], fc[1], sr(6), `fill:var(--wx-sun);fill-opacity:${(0.6 * vis).toFixed(3)}`) + `</g>` + circ(fc[0], fc[1], sr(3.4), `fill:var(--wx-sun);fill-opacity:${(0.95 * vis).toFixed(3)}`) + circ(fc[0], fc[1], sr(1.6), `fill:color-mix(in srgb, var(--wx-sun) 12%, #fff);fill-opacity:${vis.toFixed(3)}`);
  return { glow, rays: rays.join(""), ring: ring2, collars, sphere, beam, spot, a, S };
}
function smoke(frame, loop, F, vis) {
  const out = [];
  const base = at(F);
  for (let i = 0; i < 3; i++) {
    const u = ((frame / loop * 2 + i / 3) % 1 + 1) % 1;
    const y = base[1] - 4 - u * 34 * (KK / 1.3);
    const x = base[0] + Math.sin(u * TAU2 * 1.2 + i * 2) * 4 * (0.5 + u);
    const r = (1.6 + u * 3.4) * (KK / 1.3);
    const al = Math.sin(Math.PI * u) * 0.38 * smooth((vis - 0.35) / 0.4);
    out.push(circ(x, y, r, `fill:var(--anatomy-mid);fill-opacity:${al.toFixed(3)}`));
  }
  return `<g style="filter:blur(.9px)">${out.join("")}</g>`;
}
function ball(S, vis) {
  const sph = G.sphereOf(C, BALL_R, P);
  const c = at(C);
  const R = BALL_R * KK;
  const d = G.unit3(G.sub3(C, S));
  const glint = at([C[0] + d[0] * BALL_R * 0.78, 0, C[2] + d[2] * BALL_R * 0.78]);
  return `<g style="opacity:.62">${S3(sph, { tone: "hi" })}</g>` + circ(c[0], c[1], R * 0.62, "fill:none;stroke:var(--anatomy-lo);stroke-width:.6;stroke-opacity:.55") + `<path d="M${f1(c[0] - R * 0.62)} ${f1(c[1] - R * 0.2)} A${f1(R * 0.66)} ${f1(R * 0.66)} 0 0 1 ${f1(c[0] - R * 0.14)} ${f1(c[1] - R * 0.66)}" style="fill:none;stroke:var(--anatomy-mid);stroke-width:1.2;stroke-linecap:round;stroke-opacity:.85"/>` + circ(c[0] - R * 0.55, c[1] - R * 0.42, R * 0.07, "fill:var(--anatomy-mid);fill-opacity:.9") + circ(glint[0], glint[1], R * 0.17, `fill:var(--wx-sun);fill-opacity:${(0.85 * vis).toFixed(3)};filter:blur(1px)`);
}
function createSunIcon(o) {
  const burns = /* @__PURE__ */ new Map();
  const gateFor = (g) => {
    let gate = gates.get(g.kind);
    if (!gate) {
      gate = makeGate(P, g.kind, { bottom: g.bottom, plane: 0, zRail: ZRAIL, az: AZ, el: EL });
      gates.set(g.kind, gate);
    }
    return gate;
  };
  const coverAt = (g, frame, loop, intensity) => {
    const sun = sunAt(sunAngle(frame, loop));
    const placed = gateFor(g).place(g.at(frame / loop * TAU2, intensity, sun[0]));
    const c = at(sun);
    return { placed, cover: coverage(placed.poly, c[0], c[1], SUN_R * KK * 0.92) };
  };
  const burnFor = (intensity, loop) => {
    if (!o.gate) return null;
    const key = Math.round(intensity * 20);
    let d = burns.get(key);
    if (d === void 0) {
      const q = key / 20;
      d = "";
      let run = [];
      const flush = () => {
        if (run.length > 1) d += polyline(run);
        run = [];
      };
      for (let i = 0; i < loop; i++) {
        if (coverAt(o.gate, i, loop, q).cover < 0.5) {
          const a0 = sunAngle(i, loop) + Math.PI;
          const a1 = sunAngle(i + 1, loop) + Math.PI;
          if (run.length === 0) run.push(onArch(CARD_R, a0, 0));
          for (let j = 1; j <= 3; j++) run.push(onArch(CARD_R, a0 + (a1 - a0) * j / 3, 0));
        } else flush();
      }
      flush();
      burns.set(key, d);
    }
    return d;
  };
  const render = ({ frame, loop, intensity }) => {
    cache ??= { art: benchArt(SUN_TB) + arch(), back: recorderBack(), arms: ringArms(), ringBack: ringHalf(false), ringFront: ringHalf(true) };
    let gateFrame = "";
    let gateMoving = "";
    let cover = 0;
    if (o.gate) {
      const r = coverAt(o.gate, frame, loop, intensity);
      cover = r.cover;
      gateFrame = gateFor(o.gate).frame;
      gateMoving = r.placed.svg;
    }
    probe.cover = cover;
    const s = sunLayers(frame, loop, intensity, cover, burnFor(intensity, loop));
    const F3 = [C[0] + Math.cos(s.a + Math.PI) * CARD_R, 0, C[2] + Math.sin(s.a + Math.PI) * CARD_R];
    return [
      cache.art,
      cache.back,
      s.glow,
      s.rays,
      s.ring,
      s.collars,
      s.beam,
      s.sphere,
      cache.ringBack,
      s.spot,
      smoke(frame, loop, F3, 1 - cover),
      ball(s.S, 1 - cover),
      cache.ringFront,
      cache.arms,
      gateFrame,
      gateMoving
    ].join("");
  };
  return { id: o.id, label: o.label, object: o.object, width: W, height: H, loop: SUN_LOOP, render };
}

// src/weather/icons/clear.ts
var clear = createSunIcon({
  id: "clear",
  label: "Clear",
  object: "Sunshine recorder: glass ball burning a card under a lamp on a protractor arch"
});

// <stdin>
var icon = clear;
export {
  icon
};
