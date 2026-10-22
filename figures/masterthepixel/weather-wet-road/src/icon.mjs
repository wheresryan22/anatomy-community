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
function solidSvg(paths, { tone = "hi", crease = "faint", halo: halo2 = false, lit = false, flat = false, className, inner = "" } = {}) {
  const parts = [];
  if (halo2)
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
function curved(meridian, P2, segments, { error = 0.2, depth: depth2 = 6 } = {}) {
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
        if (level < depth2 && Math.abs(curve.radius(mid) - chord) * k2 > error) {
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
  const V2 = viewOf(P2);
  const L2 = lightOf(P2);
  const view = { a: dot3(F.a, V2), flat: Math.hypot(dot3(F.u, V2), dot3(F.v, V2)), phi: Math.atan2(dot3(F.v, V2), dot3(F.u, V2)) };
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
    const refine = (a, b, depth2) => {
      const mid = levelOf(i, (a.u + b.u) / 2);
      const split = depth2 < limit && (!same(a, b) || !same(a, mid) || depth2 < 6 && strayOf(i, a, mid, b) > error);
      if (!split) {
        run.push(b);
        return;
      }
      refine(a, mid, depth2 + 1);
      refine(mid, b, depth2 + 1);
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
  const V2 = viewOf(P2);
  const aV = dot3(F.a, V2);
  const facing = Math.atan2(dot3(F.v, V2), dot3(F.u, V2));
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
  const V2 = viewOf(P2);
  const L2 = lightOf(P2);
  const aV = dot3(F.a, V2);
  const uV = dot3(F.u, V2);
  const vV = dot3(F.v, V2);
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
  const V2 = viewOf(P2);
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
    seen.push(dot3(normal, V2) > 1e-6);
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
  const capSeen = dot3(F.a, V2) > 1e-6;
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
  const V2 = viewOf(P2);
  const L2 = lightOf(P2);
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
    const visible = dot3(normal, V2) > 1e-6;
    seen.push(visible);
    if (visible) buckets[bandOf(dot3(normal, L2))].push(pathOf([low[j], low[(j + 1) % n], high[(j + 1) % n], high[j]], true));
  }
  const ends = [[s0, low, mul3(F.a, -1)], [s1, high, F.a]];
  const capSeen = ends.map(([, , normal]) => dot3(normal, V2) > 1e-6);
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
  const V2 = viewOf(P2);
  const L2 = lightOf(P2);
  const F = frameAlong(centre, V2);
  const flat = (p) => iso(p, P2);
  const rim = Array.from({ length: steps }, (_, index) => pointOf(F, 0, r, index / steps * TAU));
  const outline = pathOf(rim.map(flat), true);
  const capOf = (threshold) => {
    const points = rim.filter((p) => dot3(sub3(p, centre), L2) / r >= threshold).map(flat);
    const c = dot3(L2, V2);
    const LF = frameAlong(add3(centre, mul3(L2, r * threshold)), L2);
    const radius = r * Math.sqrt(Math.max(0, 1 - threshold * threshold));
    for (let index = 0; index < steps; index++) {
      const p = pointOf(LF, 0, radius, index / steps * TAU);
      if (dot3(sub3(p, centre), V2) >= -1e-9) points.push(flat(p));
    }
    if (c > threshold) points.push(flat(add3(centre, mul3(V2, r))));
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
  const V2 = viewOf(P2);
  const aV = dot3(F.a, V2);
  const uV = dot3(F.u, V2);
  const vV = dot3(F.v, V2);
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
  const V2 = viewOf(P2);
  const aV = dot3(F.a, V2);
  const uV = dot3(F.u, V2);
  const vV = dot3(F.v, V2);
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
  const V2 = viewOf(P2);
  const lines = [];
  const slope = (r1 - r) / (s1 - s0 || 1);
  for (let index = 0; index < count; index++) {
    const t = phase + index / count * TAU;
    const radial = radialOf(F, t + twist / 2);
    const normal = unit3([radial[0] - slope * F.a[0], radial[1] - slope * F.a[1], radial[2] - slope * F.a[2]]);
    const facing = dot3(normal, V2);
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
  const V2 = viewOf(P2);
  const out = [];
  for (let index = 0; index < count; index++) {
    const t = phase + index / count * TAU;
    let alpha = 1;
    if (!all) {
      const radial = radialOf(F, t);
      const normal = unit3([radial[0] - slope * F.a[0], radial[1] - slope * F.a[1], radial[2] - slope * F.a[2]]);
      const facing = dot3(normal, V2);
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
  const V2 = P2 && tube ? viewOf(P2) : null;
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
    const facing = V2 ? Math.abs(dot3(unit3(cross3(into, outOf)), V2)) : 1;
    const bend = V2 ? Math.max(radius, margin * tube / (0.7 * Math.max(0.05, facing) ** 2)) : radius;
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

// src/weather/icons/road-proj.ts
var W = 440;
var H = 440;
var RIG_EXTENT = [
  [-132, -68, -19],
  [132, -68, -19],
  [132, 68, -19],
  [-132, 68, -19],
  [-132, -68, 112],
  [132, -68, 112],
  [-96, 0, 112]
];
var P = k.fitProjection(RIG_EXTENT, W, H, { pad: 22, azimuth: 36, elevation: 30 });

// src/weather/icons/road-common.ts
var TAU2 = Math.PI * 2;
var clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
var lerp = (a, b, t) => a + (b - a) * t;
var smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
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
var S = (paths, style = {}) => k.solidSvg(paths, style);
var L = (d, style = {}) => k.lineSvg(d, style);
var D = (points, style = {}) => k.dotsSvg(points, style);
var rub = (pct) => `color-mix(in srgb,var(--anatomy-lo) ${pct}%,var(--anatomy-halo))`;
var RUBBER = `--anatomy-paper:${rub(14)};--anatomy-face:${rub(30)};--anatomy-shade-0:${rub(10)};--anatomy-shade-1:${rub(18)};--anatomy-shade-2:${rub(28)};--anatomy-shade-3:${rub(38)};--anatomy-top:${rub(55)};`;
var asph = (pct) => `color-mix(in srgb,var(--anatomy-lo) ${pct}%,var(--anatomy-halo))`;
var ASPHALT_STYLE = `--anatomy-paper:${asph(22)};--anatomy-face:${asph(34)};--anatomy-shade-0:${asph(16)};--anatomy-shade-1:${asph(24)};--anatomy-shade-2:${asph(34)};--anatomy-shade-3:${asph(44)};--anatomy-top:${asph(40)};`;
var mer = (hot, other, rest) => `color-mix(in srgb,var(--wx-hot) ${hot}%,${other} ${rest}%)`;
var MERCURY_STYLE = `--anatomy-paper:var(--wx-hot);--anatomy-face:var(--wx-hot);--anatomy-shade-0:${mer(62, "var(--anatomy-halo)", 38)};--anatomy-shade-1:${mer(78, "var(--anatomy-halo)", 22)};--anatomy-shade-2:var(--wx-hot);--anatomy-shade-3:${mer(70, "var(--wx-sun)", 30)};--anatomy-top:${mer(45, "var(--wx-sun)", 55)};`;

// src/weather/icons/road-wheel.ts
var R_C = 34;
var H_B = 2.3;
var R_T = R_C + H_B;
var PLATE_TOP = 11;
var CZ = PLATE_TOP + R_T;
var HALF_W = 16.2;
var C = [0, 0, CZ];
var AX = [0, 1, 0];
var FW = G.frameOf(C, AX, [1, 0, 0], [0, 0, 1]);
var SIDE = [
  [16.2, 20.5],
  [17.5, 21.8, 1],
  [18.8, 24, 1],
  [19.4, 27.4, 1],
  [19, 30.4, 1],
  [17.8, 32.7, 1],
  [16, 33.7, 1],
  [14.2, 34]
];
var PROFILE = [
  ...SIDE.map(([s, r, sm]) => [-s, r, sm ?? 0]).reverse(),
  ...SIDE.map(([s, r, sm]) => [s, r, sm ?? 0])
].map((p, i, a) => i === 0 || i === a.length - 1 ? [p[0], p[1]] : p[2] ? [p[0], p[1], 1] : [p[0], p[1]]);
var carcassArt = null;
function carcass() {
  if (carcassArt) return carcassArt;
  const out = [];
  out.push(S(G.solidOf(PROFILE, FW, P, { smooth: true }), { tone: "mid", crease: "none" }));
  out.push(
    `<g style="--anatomy-paper:var(--anatomy-halo);--anatomy-top:var(--anatomy-halo);--anatomy-shade-0:var(--anatomy-halo);--anatomy-shade-1:var(--anatomy-halo);--anatomy-shade-2:var(--anatomy-halo);--anatomy-shade-3:var(--anatomy-halo)">` + S(G.ringBand(-14.4, 14.4, 32.4, 34.04, FW, P), { tone: "lo", crease: "none" }) + `</g>`
  );
  out.push(L(G.circleOf(FW, 19.25, 25.6, P), { tone: "faint" }));
  out.push(L(G.circleOf(FW, 19.3, 28.6, P), { tone: "lo" }));
  out.push(L(G.circleOf(FW, 18.5, 31.2, P), { tone: "faint" }));
  const marks = [];
  for (let i = 0; i < 36; i++) {
    const a = i / 36 * TAU2;
    const r0 = 26.1;
    const r1 = i % 3 === 0 ? 28 : 27.2;
    marks.push(k.segment(G.pointOf(FW, 19.35, r0, a), G.pointOf(FW, 19.4, r1, a), P));
  }
  out.push(L(marks.join(""), { tone: "faint" }));
  carcassArt = out.join("");
  return carcassArt;
}
var N_PITCH = 22;
var PITCH = TAU2 / N_PITCH;
var ROWS = [
  { v0: -14.2, v1: -8.2, kind: "sh" },
  { v0: -6, v1: -1.2, kind: "ce" },
  { v0: 1.2, v1: 6, kind: "ce" },
  { v0: 8.2, v1: 14.2, kind: "sh" }
];
var SLANT = 0.46;
var BLOCK_LEN = 7.9;
function makeBlocks(rot) {
  const blocks = [];
  ROWS.forEach((row, ri) => {
    const sign = row.v0 < 0 ? -1 : 1;
    const off = (v) => SLANT * Math.abs(v) * sign * -1;
    const half = BLOCK_LEN / 2;
    const poly = [
      [-half + off(row.v0), row.v0],
      [half + off(row.v0), row.v0],
      [half + off(row.v1), row.v1],
      [-half + off(row.v1), row.v1]
    ];
    const sipeCount = row.kind === "sh" ? 2 : 2;
    const sipes = [];
    for (let s = 0; s < sipeCount; s++) {
      const t = -half * 0.42 + s * (half * 0.84) / (sipeCount - 1 || 1);
      const jog = 0.9 * (s % 2 ? 1 : -1);
      const vm = (row.v0 + row.v1) / 2;
      sipes.push([
        [t + off(row.v0), row.v0],
        [t + jog + off(vm), vm],
        [t + off(row.v1), row.v1]
      ]);
    }
    for (let i = 0; i < N_PITCH; i++) {
      const a = rot + i * PITCH;
      const normal = [Math.cos(a), 0, Math.sin(a)];
      const centre = [normal[0] * R_T, (row.v0 + row.v1) / 2, CZ + normal[2] * R_T];
      blocks.push({ a, row: ri, poly, sipes, centre, normal, dir: 0 });
    }
  });
  return blocks;
}
var V = G.viewOf(P);
function blockSvg(b) {
  const F = G.frameOf(C, b.normal, [-Math.sin(b.a), 0, Math.cos(b.a)], AX);
  const prism = G.prismOf(F, b.poly, R_C - 1, R_T, P);
  let sipes = "";
  const facing = b.normal[0] * V[0] + b.normal[2] * V[2];
  if (facing > 0.12) {
    const at3 = (x, y) => [
      C[0] + b.normal[0] * R_T - Math.sin(b.a) * x,
      C[1] + y,
      C[2] + b.normal[2] * R_T + Math.cos(b.a) * x
    ];
    const d = b.sipes.map((pts) => k.pathOf(pts.map(([x, y]) => k.iso(at3(x, y), P)))).join("");
    sipes = L(d, { tone: "lo" });
  }
  return S(prism, { tone: "hi", crease: "faint", inner: sipes });
}
function treadBlocks(rot) {
  const blocks = makeBlocks(rot);
  const back = [];
  const front = [];
  for (const b of blocks) {
    const facing = b.normal[0] * V[0] + b.normal[2] * V[2];
    if (facing < -0.36) continue;
    const entry = { d: k.depthOf(b.centre, P), s: "" };
    entry.s = blockSvg(b);
    (facing < 0 ? back : front).push(entry);
  }
  const sort = (a, b) => a.d - b.d;
  back.sort(sort);
  front.sort(sort);
  return { back: back.map((e) => e.s).join(""), front: front.map((e) => e.s).join("") };
}
var SPOKES = 5;
function rimFace(rot) {
  const out = [];
  const s0 = HALF_W + 0.2;
  out.push(S(G.ringBand(s0 - 0.6, s0 + 1.9, 18.7, 21.7, FW, P, { bevel: 0.4 }), { tone: "hi", crease: "lo" }));
  out.push(D(G.dotsOf(FW, s0 + 1.9, 20.2, 20, P, { all: true, phase: 0 }), { size: 0.4, tone: "mid" }));
  out.push(`<path d="${G.circleOf(FW, s0, 18.7, P)}" style="fill:color-mix(in srgb,var(--anatomy-halo) 55%,var(--anatomy-shade-0));stroke:none"/>`);
  out.push(S(G.disc(s0, s0 + 1.6, 15.6, FW, P, { bevel: 0.4 }), { tone: "mid", crease: "faint" }));
  out.push(L(G.circleOf(FW, s0 + 1.6, 11.4, P), { tone: "faint" }));
  out.push(D(G.dotsOf(FW, s0 + 1.6, 13.4, 24, P, { all: true, phase: rot * 0 }), { size: 0.4, tone: "lo" }));
  const ca = -62 * Math.PI / 180;
  const cF = G.frameOf([C[0] + Math.cos(ca) * 13.6, C[1], C[2] + Math.sin(ca) * 13.6], [Math.cos(ca), 0, Math.sin(ca)], [-Math.sin(ca), 0, Math.cos(ca)], AX);
  out.push(S(G.prismOf(cF, [[-4.2, s0 - 0.6], [4.2, s0 - 0.6], [4.2, s0 + 3.4], [-4.2, s0 + 3.4]], -2.2, 2.4, P), { tone: "hi", crease: "lo", lit: false }));
  for (let i = 0; i < SPOKES; i++) {
    const a = rot + i * TAU2 / SPOKES + 0.35;
    const pt = (rho, w) => [rho * Math.cos(a) - w * Math.sin(a), rho * Math.sin(a) + w * Math.cos(a)];
    const poly = [pt(6, -2.6), pt(18, -3.6), pt(18, 3.6), pt(6, 2.6)];
    const F = G.frameOf(C, AX, [1, 0, 0], [0, 0, 1]);
    out.push(S(G.prismOf(F, poly, s0 + 0.1, s0 + 1.5, P), { tone: "hi", crease: "faint" }));
    const p0 = pt(8.4, 0);
    const p1 = pt(17.6, 0);
    const at3 = (p) => [C[0] + p[0], C[1] + s0 + 1.5, C[2] + p[1]];
    out.push(L(k.segment(at3(p0), at3(p1), P), { tone: "lo" }));
  }
  out.push(S(G.disc(s0 + 0.1, s0 + 2.8, 8.2, FW, P, { bevel: 0.5 }), { tone: "hi", crease: "lo" }));
  out.push(L(G.arcOf(FW, s0 + 1.5, 8.2, P), { tone: "faint" }));
  for (let i = 0; i < 5; i++) {
    const a = rot + i * TAU2 / 5 + 0.35 + Math.PI / 5;
    const lug = G.frameOf([C[0] + Math.cos(a) * 5.9, C[1], C[2] + Math.sin(a) * 5.9], AX, [1, 0, 0], [0, 0, 1]);
    out.push(S(G.disc(s0 + 2.8, s0 + 3.9, 1.35, lug, P, { smooth: false }), { tone: "mid", crease: "lo" }));
  }
  out.push(S(G.disc(s0 + 2.8, s0 + 4.2, 3.3, FW, P, { bevel: 0.4 }), { tone: "hi", crease: "lo" }));
  out.push(L(G.circleOf(FW, s0 + 4.2, 1.7, P), { tone: "lo" }));
  return out.join("");
}
var lockedArt = null;
function wheelSvg(rot, cache = false) {
  if (cache && lockedArt) return lockedArt;
  const t = treadBlocks(rot);
  const body = `<g style="${RUBBER}">${t.back}${carcass()}${t.front}</g>${rimFace(rot)}`;
  if (cache) lockedArt = body;
  return body;
}

// src/weather/icons/road-rig.ts
var BED = { x: -132, y: -68, w: 264, d: 136, r: 8 };
var TRAY = { x: -96, y: -40, w: 192, d: 84, r: 5 };
var PLATE = { x: -90, y: -34, w: 180, d: 72, r: 3 };
var at = (p) => k.iso(p, P);
var halo = (plan, z, h) => `<path class="iso-halo" d="${k.haloOf(plan, z, h, P)}"/>`;
var depth = (x, y, z = 0) => k.depthOf([x, y, z], P);
var byDepth = (pts) => [...pts].sort((a, b) => depth(a[0], a[1]) - depth(b[0], b[1]));
var Y = [0, 1, 0];
var faceF = (x, y, z) => G.frameOf([x, y, z], Y, [1, 0, 0], [0, 0, 1]);
var bedArt = null;
function bed() {
  if (bedArt) return bedArt;
  const out = [];
  out.push(halo(BED, -19, 19));
  for (const [x, y] of byDepth(k.corners(BED, 24))) {
    out.push(S(k.cylinder(x, y, 7.4, -19, 1.8, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.6, -17.2, 5.4, P, 28), { tone: "mid", crease: "none" }));
  }
  out.push(S(k.slabOf(BED, -12, 12, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(BED, -6, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(BED, 5), 0, P), { tone: "faint" }));
  const sc = k.corners(BED, 11);
  for (const [x, y] of sc) out.push(L(k.ring(x, y, 2.4, 0, P, 16), { tone: "lo" }));
  out.push(D(sc.map(([x, y]) => at([x, y, 0])), { size: 0.55 }));
  const strip = { x: -82, y: 53, w: 176, d: 8, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(-78, 90, 4, 5, strip.y, 0.8, [2.2, 4.2], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  const label = { x: -124, y: 46, w: 36, d: 18, r: 2 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.8), 0.8, P), { tone: "faint" }));
  for (const [i, w] of [[0, 18], [1, 13], [2, 16]]) {
    out.push(L(k.lineOnTop([label.x + 6, label.y + 5 + i * 4], [label.x + 6 + w * 1.3, label.y + 5 + i * 4], 0.8, P), { tone: "lo", free: true }));
  }
  out.push(D([[label.x + 3.2, label.y + 3.2], [label.x + label.w - 3.2, label.y + label.d - 3.2]].map(([x, y]) => at([x, y, 0.8])), { size: 0.5 }));
  bedArt = out.join("");
  return bedArt;
}
var trayArt = null;
function tray() {
  if (trayArt) return trayArt;
  const out = [];
  out.push(halo(TRAY, 0, 7));
  out.push(S(k.slabOf(TRAY, 0, 7, P, 6, 0.8), { tone: "mid", inner: L(k.sideSeam(TRAY, 3.5, P, 6), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(TRAY, 2.6), 7, P, 6), { tone: "faint" }));
  const sc = k.corners(TRAY, 4.4);
  for (const [x, y] of sc) out.push(L(k.ring(x, y, 1.7, 7, P, 12), { tone: "lo" }));
  out.push(D(sc.map(([x, y]) => at([x, y, 7])), { size: 0.5 }));
  trayArt = out.join("");
  return trayArt;
}
var clampArt = null;
function plateClamps() {
  if (clampArt) return clampArt;
  const out = [];
  const spots = [[-62, PLATE.y - 3.4], [62, PLATE.y - 3.4], [-62, PLATE.y + PLATE.d + 0.2], [62, PLATE.y + PLATE.d + 0.2]];
  const sorted = [...spots].sort((a, b) => depth(a[0], a[1]) - depth(b[0], b[1]));
  for (const [x, y] of sorted) {
    out.push(S(k.slabOf({ x: x - 7, y, w: 14, d: 3.2, r: 0.8 }, 7, 5.6, P, 2, 0.4), { tone: "mid" }));
    out.push(D([at([x - 3, y + 1.6, 12.6]), at([x + 3, y + 1.6, 12.6])], { size: 0.5 }));
  }
  clampArt = out.join("");
  return clampArt;
}
var DIAL = { x: -110, y: -44, z: 70, r: 14 };
var DIAL_R = DIAL.r;
var frameA = null;
var frameB = null;
function instrumentPost(zoneColour) {
  if (frameA) return frameA;
  const out = [];
  const plinth = { x: -126, y: -66, w: 32, d: 20, r: 2 };
  const head = { x: -128, y: -68, w: 36, d: 24, r: 3 };
  out.push(halo(plinth, 0, 40));
  out.push(S(k.slabOf(plinth, 0, 40, P, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(plinth, 20, P, 3), { tone: "faint" }) }));
  const pm = k.sideMatrix([-110, plinth.y + plinth.d], 0, P, "left");
  let slots = "";
  for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) slots += `<rect x="${-12 + i * 5.2}" y="${-24 - j * 3.4}" width="3.4" height="1.5" rx=".7" class="iso-line" data-tone="faint"/>`;
  out.push(`<g transform="${pm}">${slots}</g>`);
  out.push(S(k.slabOf(head, 40, 58, P, 4, 0.8), { tone: "hi", crease: "lo", inner: L(k.sideSeam(head, 52, P, 4), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(head, 2), 98, P, 4), { tone: "faint" }));
  for (let i = 0; i < 5; i++) {
    out.push(L(k.planOutline({ x: -118 + i * 3.6, y: -62, w: 1.6, d: 12, r: 0.8 }, 98, P, 2), { tone: "lo" }));
  }
  out.push(S(k.cylinder(-123, -58, 2.1, 98, 2.2, P, 16), { tone: "mid", lit: true }));
  const fy = head.y + head.d;
  const hf = faceF(DIAL.x, fy, DIAL.z);
  out.push(S(G.disc(0, 3.2, DIAL.r + 2.8, hf, P, { bevel: 0.6 }), { tone: "hi", crease: "lo" }));
  out.push(L(G.arcOf(hf, 1.6, DIAL.r + 2.8, P), { tone: "faint" }));
  out.push(D(G.dotsOf(hf, 3.2, DIAL.r + 1.5, 16, P, { all: true }), { size: 0.4, tone: "mid" }));
  const m = k.sideMatrix([DIAL.x, fy + 3.2], DIAL.z, P, "left");
  const R = DIAL.r;
  const ang = (v) => (-120 + 240 * v) * Math.PI / 180;
  const pt = (v, rr) => `${(Math.sin(ang(v)) * rr).toFixed(2)} ${(-Math.cos(ang(v)) * rr).toFixed(2)}`;
  const arc = (v0, v1, rr) => `M${pt(v0, rr)}A${rr} ${rr} 0 ${(v1 - v0) * 240 > 180 ? 1 : 0} 1 ${pt(v1, rr)}`;
  let face = `<circle r="${R}" cx="0" cy="0" style="fill:var(--anatomy-paper);stroke:var(--anatomy-lo);stroke-width:.6;vector-effect:non-scaling-stroke"/>`;
  face += `<path d="${arc(0, 0.3, R - 2.6)}" style="fill:none;stroke:${zoneColour};stroke-width:2.6;opacity:.9"/>`;
  face += `<path d="${arc(0.3, 0.6, R - 2.6)}" style="fill:none;stroke:var(--anatomy-lo);stroke-width:2.6;opacity:.7"/>`;
  face += `<path d="${arc(0.6, 1, R - 2.6)}" style="fill:none;stroke:var(--anatomy-mid);stroke-width:2.6;opacity:.5"/>`;
  let minor = "";
  let major = "";
  for (let i = 0; i <= 40; i++) {
    const v = i / 40;
    const big = i % 8 === 0;
    const r0 = R - 0.9;
    const r1 = R - (big ? 5.3 : 3.4);
    const seg = `M${pt(v, r0)}L${pt(v, r1)}`;
    if (big) major += seg;
    else minor += seg;
  }
  face += `<path d="M${pt(0, R - 0.9)}A${R - 0.9} ${R - 0.9} 0 1 1 ${pt(1, R - 0.9)}" class="iso-line" data-tone="lo" style="stroke-width:.5"/>`;
  face += `<path d="${minor}" class="iso-line" data-tone="lo"/><path d="${major}" class="iso-line" data-tone="hi"/>`;
  face += `<text x="0" y="${R - 3.2}" class="iso-face-text" data-tone="mid" font-size="3.4" text-anchor="middle">&#956;</text>`;
  face += `<path d="M${-R * 0.72} ${-R * 0.38}A${R * 0.82} ${R * 0.82} 0 0 1 ${-R * 0.18} ${-R * 0.8}" class="iso-line" data-tone="faint" style="stroke-width:1.1"/>`;
  out.push(`<g transform="${m}">${face}</g>`);
  for (const kx of [-119, -101]) {
    const kf = faceF(kx, fy, 48.5);
    out.push(S(G.disc(0, 3, 3.4, kf, P, { bevel: 0.4 }), { tone: "mid", crease: "lo" }));
    out.push(D(G.dotsOf(kf, 3, 2.3, 8, P, { all: true }), { size: 0.35, tone: "lo" }));
  }
  frameA = out.join("");
  return frameA;
}
function gantry() {
  if (frameB) return frameB;
  const out = [];
  const BY = -66;
  const BD = 16;
  const x0 = -92;
  const x1 = 110;
  for (const [z, h] of [[16, 12], [94, 12]]) {
    const pl = { x: x0, y: BY, w: x1 - x0, d: BD, r: 1.5 };
    out.push(S(k.slabOf(pl, z, h, P, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(pl, z + h / 2, P, 3), { tone: "faint" }) }));
    out.push(L(k.segment([x0, BY + BD, z + h / 2 - 2.6], [x1, BY + BD, z + h / 2 - 2.6], P), { tone: "faint" }));
    out.push(L(k.segment([x0, BY + BD, z + h / 2 + 2.6], [x1, BY + BD, z + h / 2 + 2.6], P), { tone: "faint" }));
    const rail = { x: x0 + 3, y: BY + BD, w: x1 - x0 - 6, d: 2.2, r: 0.4 };
    out.push(S(k.slabOf(rail, z + h / 2 - 1.8, 3.6, P, 2, 0.3), { tone: "hi", crease: "lo" }));
    const n = 17;
    const pts = [];
    for (let i = 0; i < n; i++) pts.push(at([x0 + 8 + i * (x1 - x0 - 16) / (n - 1), BY + BD + 2.2, z + h / 2]));
    out.push(D(pts, { size: 0.42, tone: "mid" }));
  }
  const tk = k.sideTicks(-70, 100, 5, 5, BY + BD, 94, [2.2, 4.2], P, "x");
  out.push(L(tk.minor, { tone: "lo" }), L(tk.major, { tone: "mid" }));
  const rp = { x: 108, y: BY, w: 16, d: 16, r: 2 };
  out.push(halo(rp, 0, 106));
  out.push(S(k.slabOf(rp, 0, 106, P, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(rp, 53, P, 3), { tone: "faint" }) }));
  out.push(S(k.slabOf(k.insetPlan(rp, -1.6), 106, 3.2, P, 3, 0.4), { tone: "hi", crease: "lo" }));
  out.push(D([[116, BY + BD - 3], [116, BY + 3]].map(([x, y]) => at([x, y, 109.2])), { size: 0.5 }));
  out.push(S(k.slabOf({ x: 99, y: BY + BD, w: 8, d: 4, r: 0.6 }, 96, 8, P, 2, 0.3), { tone: "hi", crease: "lo" }));
  out.push(S(k.slabOf({ x: -92, y: BY + BD, w: 8, d: 4, r: 0.6 }, 96, 8, P, 2, 0.3), { tone: "hi", crease: "lo" }));
  frameB = out.join("");
  return frameB;
}
function dialNeedle(mu) {
  const fy = -44 + 3.2;
  const m = k.sideMatrix([DIAL.x, fy], DIAL.z, P, "left");
  const R = DIAL.r;
  const a = (-120 + 240 * Math.min(1, Math.max(0, mu))) * Math.PI / 180;
  const s = Math.sin(a);
  const c = -Math.cos(a);
  const tip = `${(s * (R - 1.6)).toFixed(2)} ${(c * (R - 1.6)).toFixed(2)}`;
  const tail = `${(-s * 3.4).toFixed(2)} ${(-c * 3.4).toFixed(2)}`;
  const g = `<path d="M${tail}L${tip}" class="iso-line" data-tone="lit" style="stroke-width:1.4"/><circle r="1.9" cx="0" cy="0" style="fill:var(--anatomy-paper);stroke:var(--anatomy-hi);stroke-width:.6;vector-effect:non-scaling-stroke"/><circle r=".55" cx="0" cy="0" style="fill:var(--anatomy-lit)"/>`;
  return `<g transform="${m}">${g}</g>`;
}
var CA_X = 28;
function coilZ(cx, cy, z0, z1, r, turns, perTurn = 14) {
  const count = Math.round(turns * perTurn);
  const [vx, vy] = k.towardViewer(P);
  const back = [];
  const front = [];
  let run = [];
  let near = null;
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const a = t * turns * TAU2;
    const facing = Math.cos(a) * vx + Math.sin(a) * vy > 0;
    const p = at([cx + r * Math.cos(a), cy + r * Math.sin(a), z0 + (z1 - z0) * t]);
    if (near === null) near = facing;
    if (facing !== near) {
      run.push(p);
      (near ? front : back).push(k.pathOf(run));
      run = [p];
      near = facing;
      continue;
    }
    run.push(p);
  }
  if (run.length > 1) (near ? front : back).push(k.pathOf(run));
  return { back: back.join(""), front: front.join("") };
}
var carriageFixed = null;
function carriagePlate() {
  if (carriageFixed) return carriageFixed;
  const out = [];
  const BY = -66 + 16;
  for (const zc of [22, 100]) {
    for (const bx of [-19, 19]) {
      out.push(S(k.slabOf({ x: bx - 7, y: BY + 2.2, w: 14, d: 3.4, r: 0.8 }, zc - 6, 12, P, 2, 0.4), { tone: "hi", crease: "lo" }));
    }
  }
  const plate = { x: -CA_X, y: -46.5, w: CA_X * 2, d: 4.2, r: 2 };
  out.push(S(k.slabOf(plate, 16, 90, P, 4, 0.7), { tone: "mid", inner: L(k.sideSeam(plate, 61, P, 4), { tone: "faint" }) }));
  const fy = plate.y + plate.d;
  for (const [hx, hz, hr] of [[0, 90, 5], [0, 30, 5.6]]) {
    out.push(L(k.sideRing([hx, fy, hz], hr, "x", P, 24), { tone: "lo" }));
  }
  out.push(L(k.sideRing([0, fy, 90], 2, "x", P, 14), { tone: "faint" }));
  const sx = [];
  for (const x of [-23, 23]) for (const z of [21, 36, 84, 98]) sx.push(at([x, fy, z]));
  out.push(D(sx, { size: 0.5 }));
  for (const gx of [-15, 15]) {
    out.push(S(k.slabOf({ x: gx - 3.4, y: fy, w: 6.8, d: 8, r: 1 }, 18, 6, P, 3, 0.3), { tone: "hi", crease: "lo" }));
    out.push(S(k.slabOf({ x: gx - 3.4, y: fy, w: 6.8, d: 8, r: 1 }, 92, 6, P, 3, 0.3), { tone: "hi", crease: "lo" }));
    const gf = G.frameAlong([gx, fy + 4, 24], [0, 0, 1]);
    out.push(S(G.disc(0, 68, 1.8, gf, P, { smooth: false }), { tone: "hi", crease: "none" }));
    out.push(L(G.arcOf(gf, 5, 1.8, P), { tone: "faint" }));
  }
  carriageFixed = out.join("");
  return carriageFixed;
}
var sprungBase = null;
function sprungBack() {
  if (sprungBase) return sprungBase;
  const out = [];
  const fy = -42.3;
  const blk = { x: -21, y: fy, w: 42, d: 10, r: 1.5 };
  out.push(S(k.slabOf(blk, 36, 24, P, 3, 0.6), { tone: "hi", crease: "lo", inner: L(k.sideSeam(blk, 48, P, 3), { tone: "faint" }) }));
  for (const gx of [-15, 15]) {
    const bf = G.frameAlong([gx, fy + 5, 36], [0, 0, 1]);
    out.push(S(G.disc(-2, 0, 4.6, bf, P, { smooth: false }), { tone: "mid", crease: "none" }));
    out.push(D(G.dotsOf(G.frameAlong([gx, fy + 5, 60], [0, 0, 1]), 0, 3.3, 6, P, { all: true }), { size: 0.4, tone: "mid" }));
  }
  out.push(D([[-18, fy + 10, 43], [18, fy + 10, 43], [-18, fy + 10, 53], [18, fy + 10, 53]].map((p) => at(p)), { size: 0.5 }));
  const arm = { x: -6.5, y: fy + 10, w: 13, d: 14.4, r: 1.2 };
  out.push(S(k.slabOf(arm, CZ - 5.5, 11, P, 3, 0.5), { tone: "hi", crease: "lo" }));
  out.push(L(k.segment([-6.5, fy + 10 + 14.4, CZ], [6.5, fy + 10 + 14.4, CZ], P), { tone: "faint" }));
  const hf = G.frameAlong([0, fy + 24.4, CZ], Y);
  out.push(S(G.disc(0, 7.6, 7.4, hf, P, { bevel: 0.5 }), { tone: "hi", crease: "lo" }));
  out.push(L(G.arcOf(hf, 4, 7.4, P), { tone: "faint" }));
  sprungBase = out.join("");
  return sprungBase;
}
function sprungTop(lift) {
  const out = [];
  const cx = 0;
  const cy = -27.4;
  const zA = CZ + 5.5;
  const ear = { x: -9, y: -43, w: 18, d: 24, r: 1.5 };
  out.push(S(k.slabOf(ear, 90, 5, P, 3, 0.4), { tone: "hi", crease: "lo" }));
  out.push(D([[-5.5, -40], [5.5, -40]].map(([x, y]) => at([x, y, 95])), { size: 0.5 }));
  const cap = G.frameAlong([cx, cy, 95], [0, 0, 1]);
  out.push(S(G.disc(0, 1.4, 3.4, cap, P, { smooth: false }), { tone: "mid", crease: "none" }));
  out.push(`<g transform="${k.translateAlong(P, [0, 0, lift])}">`);
  const rf = G.frameAlong([cx, cy, zA], [0, 0, 1]);
  out.push(S(G.disc(0, 6.4, 4.8, rf, P, { bevel: 0.4 }), { tone: "hi", crease: "lo" }));
  out.push(L(G.arcOf(rf, 3.2, 4.8, P), { tone: "faint" }));
  out.push(S(G.disc(6.4, 8, 2.8, rf, P, { smooth: false }), { tone: "mid", crease: "none" }));
  const spring = coilZ(cx, cy, zA + 24, 90 + 0.2, 4.6, 6);
  out.push(L(spring.back, { tone: "lo" }));
  out.push(S(G.disc(90.2 - 1.6 - zA, 90.2 - zA, 4.7, rf, P, { smooth: false }), { tone: "mid", crease: "lo" }));
  out.push(S(G.disc(8, 46, 1.5, rf, P, { smooth: false }), { tone: "hi", crease: "none" }));
  for (let i = 0; i < 3; i++) {
    const s0 = 8 + i * 5.4;
    out.push(S(G.disc(s0, s0 + 4.6, 7.4, rf, P, { bevel: 0.4 }), { tone: i === 2 ? "hi" : "mid", crease: "lo" }));
    out.push(L(G.arcOf(rf, s0 + 2.3, 7.4, P), { tone: "faint" }));
  }
  out.push(S(G.disc(24.4, 26.4, 3.6, rf, P, { smooth: false }), { tone: "mid", crease: "none" }));
  out.push(L(spring.front, { tone: "mid" }));
  out.push(`</g>`);
  return out.join("");
}
function carriage(wheelSvgStr, lift, extraAfterWheel = "") {
  const dz = k.translateAlong(P, [0, 0, lift]);
  return carriagePlate() + `<g transform="${dz}">${sprungBack()}</g>` + sprungTop(lift) + `<g transform="${dz}">${wheelSvgStr}</g>` + extraAfterWheel;
}
function rulerPointer() {
  const out = [];
  out.push(S(k.slabOf({ x: -2.6, y: 52, w: 5.2, d: 10, r: 0.8 }, 0.8, 2.6, P, 2, 0.3), { tone: "hi", lit: true }));
  return out.join("");
}
var swatchArt = null;
function treadSwatch() {
  if (swatchArt) return swatchArt;
  const out = [];
  const hold = { x: 98, y: -16, w: 32, d: 64, r: 2.4 };
  const rub2 = { x: 101, y: -13, w: 26, d: 58, r: 1.2 };
  out.push(halo(hold, 0, 2.4));
  out.push(S(k.slabOf(hold, 0, 2.4, P, 4, 0.5), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(hold, 1.2), 2.4, P, 4), { tone: "faint" }));
  const hs = [[99.8, -14.2], [128.2, -14.2], [99.8, 46.2], [128.2, 46.2]];
  out.push(D(hs.map(([x, y]) => at([x, y, 2.4])), { size: 0.5 }));
  out.push(`<g style="${RUBBER}">`);
  out.push(S(k.slabOf(rub2, 2.4, 2.2, P, 3, 0.4), { tone: "mid", crease: "faint" }));
  const xc = 114;
  const rows = [[-13, -7.2], [-5.4, -1], [1, 5.4], [7.2, 13]];
  const slant = 0.46;
  const off = (xr) => -slant * Math.abs(xr);
  const blocks = [];
  const zTop = 4.6 + 1.9;
  for (const [a, b] of rows) {
    for (let i = 0; i < 5; i++) {
      const yc = -7.2 + i * 11.6;
      const l = 8.4;
      const ring2 = [
        [xc + a, yc - l / 2 + off(a)],
        [xc + b, yc - l / 2 + off(b)],
        [xc + b, yc + l / 2 + off(b)],
        [xc + a, yc + l / 2 + off(a)]
      ];
      const ex = k.extrude(ring2, 4.6, 1.9, P, { convex: true });
      let sipes = "";
      for (const t of [-0.2, 0.22]) {
        const ym = (a + b) / 2;
        const pts = [
          [xc + a, yc + t * l + off(a)],
          [xc + ym, yc + t * l + off(ym) + (t < 0 ? 0.7 : -0.7)],
          [xc + b, yc + t * l + off(b)]
        ];
        sipes += k.pathOf(pts.map(([x, y]) => at([x, y, zTop])));
      }
      blocks.push({ d: depth(xc + (a + b) / 2, yc), svg: S(ex, { tone: "hi", crease: "faint", inner: L(sipes, { tone: "lo" }) }) });
    }
  }
  blocks.sort((p, q) => p.d - q.d);
  out.push(blocks.map((b) => b.svg).join(""));
  out.push(`</g>`);
  for (const y of [-17.4, 46.4]) {
    out.push(S(k.slabOf({ x: 107, y: y - 1.2, w: 14, d: 2.4, r: 0.6 }, 2.4, 3.4, P, 2, 0.3), { tone: "hi", crease: "lo" }));
  }
  swatchArt = out.join("");
  return swatchArt;
}

// src/weather/icons/road-plate.ts
var ASPH_TOP = PLATE_TOP - 1.7;
var ASPH_BOT = 4;
var at2 = (p) => k.iso(p, P);
var onPlate = (x, y, z = ASPH_TOP) => at2([x, y, z]);
var platePoly = (pts, z = ASPH_TOP) => k.pathOf(pts.map(([x, y]) => at2([x, y, z])), true);
var art = null;
function asphaltPlate() {
  if (art) return art;
  const out = [];
  const slab = k.slabOf(PLATE, ASPH_BOT, ASPH_TOP - ASPH_BOT, P, 5, 0.6);
  out.push(`<g style="${ASPHALT_STYLE}">${S(slab, { tone: "mid", crease: "faint", inner: L(k.sideSeam(PLATE, 6.5, P, 5), { tone: "faint" }) })}`);
  const r = prng(41);
  const dots = [];
  const chips = [];
  for (let i = 0; i < 260; i++) {
    const x = PLATE.x + 4 + r() * (PLATE.w - 8);
    const y = PLATE.y + 3 + r() * (PLATE.d - 6);
    (r() < 0.8 ? dots : chips).push(onPlate(x, y));
  }
  out.push(k.dotsSvg(dots, { size: 0.42, tone: "mid" }), k.dotsSvg(chips, { size: 0.75, tone: "lo" }));
  const paint = [];
  for (let x = -84; x < 76; x += 28) paint.push(platePoly([[x, 23], [x + 16, 23], [x + 16, 25.6], [x, 25.6]]));
  paint.push(platePoly([[-88, -28.6], [88, -28.6], [88, -26.2], [-88, -26.2]]));
  out.push(`<path d="${paint.join("")}" style="fill:var(--wx-moon);opacity:.8;stroke:none"/>`);
  const cracks = [
    [[-86, 8], [-72, 12], [-60, 9], [-48, 15]],
    [[56, -6], [68, -1], [76, 7], [88, 10]],
    [[-20, 30], [-8, 33], [4, 31]]
  ];
  for (const c of cracks) {
    out.push(L(k.pathOf(c.map(([x, y]) => at2([x, y, ASPH_TOP]))), { tone: "lo", free: true }));
  }
  out.push(L(platePoly([[40, -22], [64, -22], [64, -14], [40, -14]]), { tone: "faint" }));
  out.push(`</g>`);
  art = out.join("");
  return art;
}

// src/weather/icons/wet-road.ts
var LOOP = 120;
var X0 = -46;
var pAt = (u) => {
  if (u < 0.08) return 0;
  if (u < 0.6) return smoothstep(0.08, 0.6, u);
  if (u < 0.72) return 1;
  return 1 - smoothstep(0.72, 0.97, u);
};
function motion(u, inten) {
  const travel = 62 + 28 * inten;
  const p = pAt(u);
  const fwd = clamp((pAt(u + 4e-3) - pAt(u - 4e-3)) / 8e-3 / 3);
  const hydro = Math.pow(fwd, 1.3) * (0.15 + 0.85 * smoothstep(0.15, 0.7, inten));
  const back = clamp(-(pAt(u + 4e-3) - pAt(u - 4e-3)) / 8e-3 / 3);
  const lift = 3.2 * hydro + 1.4 * Math.pow(back, 0.5);
  const x = X0 + travel * p;
  const slip = 0.2 + 0.5 * inten;
  const rot = 0.3 - (x - X0) / R_T * (1 - slip);
  const mu = lerp(0.82, lerp(0.62, 0.22, inten), hydro);
  return { x, fwd, lift, mu, rot };
}
var puddles = [
  { cx: -64, cy: 28, rx: 16, ry: 6.4, ph: 0.4 },
  { cx: 60, cy: -23, rx: 17, ry: 6.8, ph: 1.7 },
  { cx: 70, cy: 12, rx: 12, ry: 10, ph: 2.6 },
  { cx: -72, cy: -14, rx: 12, ry: 8, ph: 4.1 }
];
var blob = (c, grow = 1) => Array.from({ length: 28 }, (_, i) => {
  const a = i / 28 * TAU2;
  const wob = 1 + 0.16 * Math.sin(3 * a + c.ph) + 0.08 * Math.sin(5 * a + c.ph * 2);
  return [c.cx + c.rx * grow * wob * Math.cos(a), c.cy + c.ry * grow * wob * Math.sin(a)];
});
var filmGeo = null;
function film(inten) {
  if (!filmGeo) {
    const slab = k.slabOf(PLATE, ASPH_TOP, PLATE_TOP - ASPH_TOP, P, 5, 0);
    filmGeo = { sides: slab.shades.join(""), top: slab.top, outline: slab.outline };
  }
  const out = [];
  out.push(`<path d="${filmGeo.top}" style="fill:var(--anatomy-halo);opacity:${(0.08 + 0.16 * inten).toFixed(2)};stroke:none"/>`);
  out.push(`<path d="${filmGeo.sides}" style="fill:var(--wx-rain);opacity:.34;stroke:none"/>`);
  out.push(`<path d="${filmGeo.top}" style="fill:var(--wx-rain);opacity:${(0.05 + 0.1 * inten).toFixed(2)};stroke:none"/>`);
  out.push(L(filmGeo.outline, { tone: "hi" }));
  const grow = 0.7 + 0.45 * inten;
  for (const c of puddles) {
    const d = k.pathOf(blob(c, grow).map(([x, y]) => k.iso([x, y, PLATE_TOP + 0.05], P)), true);
    out.push(`<path d="${d}" style="fill:var(--wx-rain);opacity:.36;stroke:none"/>`);
    out.push(`<path d="${d}" style="fill:none;stroke:var(--wx-rain);stroke-width:.8;opacity:.9;vector-effect:non-scaling-stroke"/>`);
    const g = [[c.cx - c.rx * grow * 0.5, c.cy - c.ry * grow * 0.25], [c.cx - c.rx * grow * 0.05, c.cy - c.ry * grow * 0.45]];
    out.push(L(k.pathOf(g.map(([x, y]) => k.iso([x, y, PLATE_TOP + 0.05], P))), { tone: "hi", free: true }));
  }
  return out.join("");
}
function gloss(u) {
  const out = [];
  for (let b = 0; b < 2; b++) {
    const c = -150 + (u + b / 2) % 1 * 300;
    const w = 6 + b * 3;
    const y0 = PLATE.y;
    const y1 = PLATE.y + PLATE.d;
    const sl = 0.5;
    const d = platePoly([[c - w + sl * y0, y0], [c + w + sl * y0, y0], [c + w + sl * y1, y1], [c - w + sl * y1, y1]], PLATE_TOP);
    out.push(`<path d="${d}" style="fill:var(--wx-rain);opacity:.22;stroke:none"/>`);
  }
  return `<g clip-path="url(#wr-film)">${out.join("")}</g>`;
}
var DROPS = (() => {
  const r = prng(23);
  return Array.from({ length: 12 }, (_, i) => {
    const c = puddles[i % puddles.length];
    const a = r() * TAU2;
    const rr = Math.sqrt(r());
    return {
      x: c.cx + Math.cos(a) * c.rx * 0.7 * rr,
      y: c.cy + Math.sin(a) * c.ry * 0.7 * rr,
      ph: (i * 0.137 + r() * 0.1) % 1
    };
  });
})();
function ripples(u, inten) {
  const under = [];
  const fall = [];
  const n = 6 + Math.round(6 * inten);
  for (let i = 0; i < n; i++) {
    const d = DROPS[i];
    const life = (u * 3 + d.ph) % 1;
    if (life < 0.18) {
      const f = life / 0.18;
      const z0 = PLATE_TOP + 70 * (1 - f);
      const a = k.iso([d.x + 4 * (1 - f) + 1.5, d.y, z0 + 14], P);
      const b = k.iso([d.x + 4 * (1 - f), d.y, z0], P);
      fall.push(`<path d="M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}" class="iso-line" data-free="" style="stroke:var(--wx-rain);stroke-width:1.3;opacity:.9"/>`);
    } else {
      const f = (life - 0.18) / 0.82;
      for (let ring2 = 0; ring2 < 2; ring2++) {
        const f2 = f - ring2 * 0.18;
        if (f2 <= 0) continue;
        const rad = 1 + 8.5 * f2;
        const al = (1 - f2) * 0.9;
        under.push(`<path d="${k.ring(d.x, d.y, rad, PLATE_TOP + 0.1, P, 22)}" class="iso-line" data-free="" style="stroke:var(--wx-rain);stroke-width:.8;opacity:${al.toFixed(2)}"/>`);
      }
    }
  }
  return { under: under.join(""), fall: fall.join("") };
}
var SPRAY = (() => {
  const r = prng(5);
  return Array.from({ length: 36 }, (_, i) => ({
    ph: r(),
    kind: i % 3,
    // 0 side jet, 1 bow, 2 rooster tail
    side: r() < 0.5 ? -1 : 1,
    sp: 0.6 + r() * 0.8,
    spread: (r() - 0.5) * 2,
    size: 1 + r() * 1.5
  }));
})();
function spray(u, m, inten) {
  const low = [];
  const high = [];
  const amt = 0.18 + 0.82 * m.fwd * (0.4 + 0.6 * inten);
  const count = Math.round(14 + 20 * inten);
  const G2 = 70;
  for (let i = 0; i < count; i++) {
    const s = SPRAY[i];
    const life = (u * 4 + s.ph) % 1;
    const t = life * 0.95;
    let o;
    let v;
    if (s.kind === 0) {
      o = [m.x + 4, s.side * 15, PLATE_TOP + 1];
      v = [18 * s.sp + 8, s.side * (30 + 24 * s.sp), 26 + 34 * s.sp * amt];
    } else if (s.kind === 1) {
      o = [m.x + 12, s.spread * 12, PLATE_TOP + 1];
      v = [30 + 30 * s.sp, s.spread * 20, 20 + 30 * s.sp * amt];
    } else {
      o = [m.x - 14, s.spread * 11, PLATE_TOP + 22];
      v = [-16 - 20 * s.sp * amt, s.spread * 10, 26 + 38 * s.sp * amt];
    }
    const pos = (tt) => [o[0] + v[0] * tt, o[1] + v[1] * tt, o[2] + v[2] * tt - G2 * tt * tt * 0.5 * 1];
    const head = pos(t);
    if (head[2] < PLATE_TOP) continue;
    const a = Math.sin(Math.PI * Math.min(1, life * 1.1)) * Math.min(1, amt * 1.4);
    if (a < 0.04) continue;
    const pts = [];
    for (let j = 4; j >= 0; j--) pts.push(k.iso(pos(Math.max(0, t - j * 0.04)), P));
    const col = `stroke:var(--wx-rain);stroke-width:${(s.size * 0.9).toFixed(1)}`;
    let trail = "";
    for (let j = 0; j < 4; j++) trail += `<path d="${k.pathOf([pts[j], pts[j + 1]])}" class="iso-line" data-free="" style="${col};opacity:${(a * (0.25 + j * 0.3)).toFixed(2)}"/>`;
    const [hx, hy] = pts[4];
    const drop = `<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="${(s.size * 0.9).toFixed(2)}" style="fill:var(--wx-rain);stroke:var(--anatomy-hi);stroke-width:.35;opacity:${a.toFixed(2)}"/>`;
    (s.kind === 2 ? low : high).push(trail + drop);
  }
  return { low: low.join(""), high: high.join("") };
}
function grooveFlow(u, m, inten) {
  const e = Math.min(1, 0.25 + 0.9 * m.fwd);
  const wedgeH = 0.8 + m.lift * 0.9 + 1.2 * m.fwd;
  const tip = [m.x + 12 + 24 * m.fwd * (0.5 + 0.5 * inten), 0, PLATE_TOP];
  const a = [m.x + 4, -16.5, PLATE_TOP];
  const b = [m.x + 4, 16.5, PLATE_TOP];
  const a2 = [m.x + 4, -16.5, PLATE_TOP + wedgeH + 1.6];
  const b2 = [m.x + 4, 16.5, PLATE_TOP + wedgeH + 1.6];
  const pts = [a, tip, b, b2, a2].map((p) => k.iso(p, P));
  const wedge = `<path d="${k.pathOf(k.hullOf ? k.hullOf(pts) : pts, true)}" style="fill:var(--wx-rain);fill-opacity:${(0.18 + 0.4 * e * (0.3 + 0.7 * inten)).toFixed(2)};stroke:var(--wx-rain);stroke-width:.7;vector-effect:non-scaling-stroke;stroke-opacity:.9"/>`;
  const streams = [];
  for (const v of [-10.8, -7.1, 0, 7.1, 10.8]) {
    for (let j = 0; j < 3; j++) {
      const ph = (u * 3 + j / 3 + (v + 11) * 0.05) % 1;
      const x0 = m.x + 6 + ph * 22 * (0.4 + 0.6 * e);
      const x1 = x0 + 5 * e;
      const al = Math.sin(Math.PI * ph) * e;
      const [ax, ay] = k.iso([x0, v, PLATE_TOP + 0.2], P);
      const [bx, by] = k.iso([x1, v, PLATE_TOP + 0.2], P);
      streams.push(`<path d="M${ax.toFixed(1)} ${ay.toFixed(1)}L${bx.toFixed(1)} ${by.toFixed(1)}" class="iso-line" data-free="" style="stroke:var(--wx-rain);stroke-width:1.3;opacity:${al.toFixed(2)}"/>`);
    }
  }
  return { wedge, streams: streams.join("") };
}
function render({ frame, loop, intensity }) {
  const u = frame / loop;
  const m = motion(u, intensity);
  const tx = k.translateAlong(P, [m.x, 0, 0]);
  const slab = k.slabOf(PLATE, ASPH_TOP, PLATE_TOP - ASPH_TOP, P, 5, 0);
  const rip = ripples(u, intensity);
  const sp = spray(u, m, intensity);
  const gf = grooveFlow(u, m, intensity);
  const wheel = wheelSvg(m.rot, false);
  const shadow = `<path class="iso-halo" d="${k.haloOf({ x: m.x - 16, y: -17, w: 32, d: 34, r: 8 }, PLATE_TOP, 0, P)}" style="opacity:.5"/>`;
  return bed() + instrumentPost("var(--wx-hot)") + dialNeedle(m.mu) + gantry() + tray() + treadSwatch() + asphaltPlate() + `<defs><clipPath id="wr-film"><path d="${slab.top}"/></clipPath></defs>` + film(intensity) + gloss(u) + rip.under + plateClamps() + `<g transform="${tx}">${rulerPointer()}</g>` + shadow + gf.wedge + gf.streams + sp.low + `<g transform="${tx}">${carriage(wheel, m.lift)}</g>` + sp.high + rip.fall;
}
var wetRoad = {
  id: "wet-road",
  label: "Wet road",
  object: "Skid tester over a wet plate: tread squeezing water through its grooves, hydroplane wedge, puddle ripples",
  width: W,
  height: H,
  loop: LOOP,
  render
};

// <stdin>
var icon = wetRoad;
export {
  icon
};
