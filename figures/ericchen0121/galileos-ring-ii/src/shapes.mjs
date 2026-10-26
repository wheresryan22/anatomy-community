function regular(count, radius) {
  const ring = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    ring.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  return ring;
}

export const SHAPES = [
  { id: "circle", label: "Circle" },
  { id: "ellipse", label: "Ellipse" },
  { id: "triangle", label: "Triangle" },
  { id: "square", label: "Square" },
  { id: "diamond", label: "Diamond" },
  { id: "pentagon", label: "Pentagon" },
  { id: "hexagon", label: "Hexagon" },
  { id: "octagon", label: "Octagon" },
  { id: "star", label: "Star" },
  { id: "cross", label: "Cross" },
  { id: "capsule", label: "Capsule" },
  { id: "drop", label: "Drop" },
  { id: "heart", label: "Heart" },
  { id: "arrow", label: "Arrow" },
];

export const CONCAVE = new Set(["star", "cross", "heart", "arrow"]);

export function shapeRing(shape, radius) {
  if (shape === "circle") return regular(20, radius);
  if (shape === "ellipse") return regular(20, radius).map(([x, y]) => [x, y * 0.62]);
  if (shape === "triangle") return regular(3, radius);
  if (shape === "square") return regular(4, radius);
  if (shape === "pentagon") return regular(5, radius);
  if (shape === "hexagon") return regular(6, radius);
  if (shape === "octagon") return regular(8, radius);
  if (shape === "star") {
    const ring = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const reach = i % 2 ? radius * 0.42 : radius;
      ring.push([Math.cos(angle) * reach, Math.sin(angle) * reach]);
    }
    return ring;
  }
  if (shape === "diamond") {
    return [
      [radius, 0],
      [0, radius * 0.62],
      [-radius * 0.42, 0],
      [0, -radius * 0.62],
    ];
  }
  if (shape === "cross") {
    const arm = radius;
    const thick = radius * 0.34;
    return [
      [thick, thick],
      [arm, thick],
      [arm, -thick],
      [thick, -thick],
      [thick, -arm],
      [-thick, -arm],
      [-thick, -thick],
      [-arm, -thick],
      [-arm, thick],
      [-thick, thick],
      [-thick, arm],
      [thick, arm],
    ];
  }
  if (shape === "capsule") {
    const ring = [];
    const half = radius * 0.72;
    const rad = radius * 0.48;
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      const angle = -Math.PI / 2 + (i / steps) * Math.PI;
      ring.push([half + Math.cos(angle) * rad, Math.sin(angle) * rad]);
    }
    for (let i = 0; i < steps; i++) {
      const angle = Math.PI / 2 + (i / steps) * Math.PI;
      ring.push([-half + Math.cos(angle) * rad, Math.sin(angle) * rad]);
    }
    return ring;
  }
  if (shape === "drop") {
    const ring = [[radius, 0]];
    const steps = 16;
    const cx = -radius * 0.12;
    const rad = radius * 0.7;
    for (let i = 0; i <= steps; i++) {
      const angle = 0.85 + (i / steps) * (Math.PI * 2 - 1.7);
      ring.push([cx + Math.cos(angle) * rad, Math.sin(angle) * rad]);
    }
    return ring;
  }
  if (shape === "arrow") {
    const neck = radius * 0.2;
    const thick = radius * 0.28;
    return [
      [radius, 0],
      [neck, radius * 0.78],
      [neck, thick],
      [-radius * 0.9, thick],
      [-radius * 0.9, -thick],
      [neck, -thick],
      [neck, -radius * 0.78],
    ];
  }
  if (shape === "heart") {
    const raw = [];
    const steps = 32;
    for (let i = 0; i < steps; i++) {
      const t = -Math.PI + (i / steps) * Math.PI * 2;
      const x = 16 * Math.sin(t) ** 3;
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      raw.push([-y, x]);
    }
    let cx = 0;
    let cy = 0;
    for (const [x, y] of raw) {
      cx += x;
      cy += y;
    }
    cx /= raw.length;
    cy /= raw.length;
    const shifted = raw.map(([x, y]) => [x - cx, y - cy]);
    let max = 0;
    for (const [x, y] of shifted) max = Math.max(max, Math.hypot(x, y));
    return shifted.map(([x, y]) => [(x / max) * radius, (y / max) * radius]);
  }
  return regular(3, radius);
}
